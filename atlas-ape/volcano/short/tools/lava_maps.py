"""Lava arrival maps → public/terrain/<region>/lava.png (RGB 8-bit, same bbox as sat.jpg / height.bin).
Each channel is an "arrival time" field 0..0.97 (255 = no lava): the shader shows lava where arrival < progress, so
animating `progress` 0 → 1 makes the flow advance from its source along the centreline and widen behind the front.
  R = main flow, G = second flow (Etna: the diverted channel), B = eruptive fissure (Heimaey)
Geometry (data/flows.json, from published maps — see CREDITS.md):
  polygon flow : outline ring(s) [[lat, lon], …] + centreline (source → front) → order = distance along the centreline
  path flow    : centreline + width_m (± noise) → a ribbon
  python3 tools/lava_maps.py [region …]
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
N = 2048
HI = {'etna': 4096, 'heimaey': 4096, 'hawaii_vent': 4096}  # finer maps where the camera gets close


def merc(lat, lon):
	x = (lon + 180) / 360
	y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2
	return x, y


class Grid:
	def __init__(self, region):
		N = HI.get(region, 2048)
		self.m = json.load(open(ROOT / f'public/terrain/{region}/meta.json'))
		mc = self.m['mercator']
		self.x0, self.y0, self.x1, self.y1 = mc['x0'], mc['y0'], mc['x1'], mc['y1']
		aspect = self.m['height_m'] / self.m['width_m']
		self.nx = N if aspect <= 1 else round(N / aspect)
		self.ny = round(N * aspect) if aspect <= 1 else N
		self.mpp = self.m['width_m'] / (self.nx - 1)

	def px(self, lat, lon):
		x, y = merc(lat, lon)
		return (x - self.x0) / (self.x1 - self.x0) * (self.nx - 1), (y - self.y0) / (self.y1 - self.y0) * (self.ny - 1)


def fbm(shape, seed, scale):
	rng = np.random.default_rng(seed)
	out = np.zeros(shape)
	amp = 1.0
	for o in range(4):
		s = max(2, int(shape[0] / (scale / 2 ** o)))
		n = rng.random((s, s))
		n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((shape[1], shape[0]), Image.BICUBIC)) / 255.0
		out += amp * (n - 0.5)
		amp *= 0.5
	return out


def polyline_param(g, line):
	"""per pixel: distance (m) to the polyline and the along-line distance (m) of the closest point"""
	pts = np.array([g.px(a, b) for a, b in line])
	H, W = g.ny, g.nx
	yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
	best = np.full((H, W), 1e18)
	along = np.zeros((H, W))
	acc = 0.0
	for i in range(len(pts) - 1):
		a, b = pts[i], pts[i + 1]
		d = b - a
		L2 = max(1e-9, d @ d)
		u = np.clip(((xx - a[0]) * d[0] + (yy - a[1]) * d[1]) / L2, 0, 1)
		cx, cy = a[0] + u * d[0], a[1] + u * d[1]
		dist = (xx - cx) ** 2 + (yy - cy) ** 2
		m = dist < best
		best[m] = dist[m]
		along[m] = acc + u[m] * math.sqrt(L2)
		acc += math.sqrt(L2)
	return np.sqrt(best) * g.mpp, along * g.mpp, acc * g.mpp


def raster_poly(g, rings):
	img = Image.new('L', (g.nx, g.ny), 0)
	d = ImageDraw.Draw(img)
	for k, ring in enumerate(rings):
		d.polygon([g.px(a, b) for a, b in ring], fill=255 if k == 0 else 0)
	return np.asarray(img) > 127


def flow_field(g, f, seed):
	lat_k = f.get('lateral', 0.3)
	w = f.get('width_m', 300)
	mask = np.zeros((g.ny, g.nx), bool)
	if 'polygon' in f:
		for poly in f['polygon']:  # list of polygons, each = [outer, hole, hole …]
			mask |= raster_poly(g, poly)
	if 'lobes' in f:
		# every pixel belongs to its nearest lobe; arrival = lobe offset + scale × position along that lobe
		best = np.full((g.ny, g.nx), 1e18)
		a = np.ones((g.ny, g.nx))
		for lb in f['lobes']:
			dist, along, L = polyline_param(g, lb['centerline'])
			al = lb['offset'] + lb['scale'] * np.clip((along + lat_k * dist) / (L + lat_k * w), 0, 1.15)
			m = dist < best
			best[m] = dist[m]
			a[m] = al[m]
	else:
		dist, along, L = polyline_param(g, f['centerline'])
		if 'polygon' not in f or f.get('ribbon'):
			w0, w1 = f.get('width_m', 300), f.get('width_end_m', f.get('width_m', 300))
			wid = w0 + (w1 - w0) * np.clip(along / max(L, 1), 0, 1)
			noise = fbm((g.ny, g.nx), seed, 160) * 0.9
			mask |= dist < wid / 2 * (1 + noise)
		a = (along + lat_k * dist) / (L + lat_k * w)
	a = np.clip(a, 0, 1) * 0.97
	a = np.clip(a + fbm((g.ny, g.nx), seed + 7, 90) * f.get('front_wobble', 0.03), 0, 0.97)
	a[~mask] = 1.0
	return a


def fissure_field(g, f):
	dist, along, L = polyline_param(g, f['line'])
	w = f.get('width_m', 40)
	m = dist < w / 2
	a = np.where(m, np.clip(along / L, 0, 1) * 0.97, 1.0)
	return a


def build(region):
	cfg = json.load(open(ROOT / 'data/lava_cfg.json'))[region]
	g = Grid(region)
	chans = [np.ones((g.ny, g.nx)) for _ in range(3)]
	for k, f in enumerate(cfg['flows']):
		c = f['channel']
		fld = fissure_field(g, f) if f.get('kind') == 'fissure' else flow_field(g, f, 11 + k)
		chans[c] = np.minimum(chans[c], fld)
	# soften the rasterised outline (no staircase edges once the GPU interpolates the map)
	chans = [nd.gaussian_filter(c, 0.9) if (c < 0.99).any() else c for c in chans]
	img = np.stack([(np.clip(c, 0, 1) * 255).round().astype(np.uint8) for c in chans], -1)
	Image.fromarray(img, 'RGB').save(ROOT / f'public/terrain/{region}/lava.png')
	# distance to the flow margin (0 at the edge … 1 at ≥ 180 m inside): hot channel in the middle, cooler crusty levees
	union = np.zeros((g.ny, g.nx), bool)
	for c in chans[:2]:
		union |= c < 0.99
	edge = nd.distance_transform_edt(union) * g.mpp
	edge = nd.gaussian_filter(np.clip(edge / 180.0, 0, 1), 1.2)
	Image.fromarray((edge * 255).round().astype(np.uint8), 'L').save(ROOT / f'public/terrain/{region}/lava_edge.png')
	# QA overlay on the satellite
	sat = Image.open(ROOT / f'public/terrain/{region}/sat.jpg').convert('RGB').resize((g.nx, g.ny))
	s = np.asarray(sat).astype(float) * 0.6
	for c, col in zip(chans, [(255, 90, 20), (255, 20, 160), (255, 255, 80)]):
		on = c < 0.99
		for i in range(3):
			s[..., i] = np.where(on, s[..., i] * 0.3 + col[i] * (0.4 + 0.6 * (1 - c)), s[..., i])
	Image.fromarray(s.clip(0, 255).astype(np.uint8)).resize((1024, round(1024 * g.ny / g.nx))).save(ROOT / f'out/qa_lava_{region}.jpg', quality=85)
	print(region, 'lava.png', g.nx, g.ny, {f"ch{c}": int((chans[c] < 0.99).sum()) for c in range(3)})


if __name__ == '__main__':
	(ROOT / 'out').mkdir(exist_ok=True)
	for r in (sys.argv[1:] or ['hawaii', 'etna', 'heimaey']):
		build(r)
