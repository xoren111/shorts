"""Hawaii toon shots — data prep (system python3: numpy + scipy + PIL; Blender's python has no scipy).
Everything is derived from the project's real data and written as float32 .npy (north-up rows) into data/blender_hawaii/:
  zw.npy    (h, w, 4) land-cover fields of the whole island from public/terrain/hawaii/sat.jpg (EOX S2):
            R forest, G young (dark) lava, B bare/cinder (brown), A dry grass / pasture — classified per pixel, clouds
            in-painted from their neighbourhood, smoothed (~100 m). Only ever thresholded at 0.5 in the shader → crisp blobs.
  zf.npy    the same fields from public/terrain/hawaii_flow/sat.jpg (NAIP 0.6 m mosaic, 32 m px) for the flow grid.
  urban.npy (flow grid frame) built-up fraction from the OSM building footprints of Hilo (data/osm_hilo, ODbL), smoothed.
  coast.npy (wide grid frame, 2× its DEM) signed distance to the coastline in km (+ sea, − land), from the same heights the
            Blender meshes use (wide DEM, flow DEM inside its bbox).
  lava.npy  (flow grid frame, 2048 px) R arrival (float, plateau-free: the 8-bit arrival map smoothed inside the flow),
            G edge distance (lava_edge.png), B distance outside the flow (km), A arrival of the nearest flow pixel (halo).
  python3 tools/blender/hawaii_prep.py"""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/blender_hawaii'
OUT.mkdir(parents=True, exist_ok=True)
Image.MAX_IMAGE_PIXELS = None


def meta(r):
	return json.load(open(ROOT / f'public/terrain/{r}/meta.json'))


def heights(r):
	m = meta(r)
	return np.fromfile(ROOT / f'public/terrain/{r}/height.bin', np.float32).reshape(m['ny'], m['nx'])


def merc(lat, lon):
	x = (lon + 180) / 360
	y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2
	return x, y


def sat_rgb(r, w_out):
	im = Image.open(ROOT / f'public/terrain/{r}/sat.jpg').convert('RGB')
	h_out = round(im.size[1] * w_out / im.size[0])
	im = im.resize((w_out, h_out), Image.BOX)
	return np.asarray(im, np.float32) / 255


def classify(a, m_per_px, cloud=True, land=None):
	r, g, b = a[..., 0], a[..., 1], a[..., 2]
	lum = 0.3 * r + 0.59 * g + 0.11 * b
	mx = a.max(-1); mn = a.min(-1)
	sat = (mx - mn) / np.maximum(mx, 1e-3)
	gr = g - np.maximum(r, b)
	# thresholds measured on known spots (windward forest gr ≈ 0.05–0.12, saddle pasture gr ≈ −0.02–0.03, Mauna Kea cinder
	# gr ≈ −0.11, young Mauna Loa lava lum ≈ 0.08–0.17)
	forest = np.clip((gr - 0.03) / 0.02, 0, 1)
	young = np.clip((0.2 - lum) / 0.04, 0, 1) * np.clip((0.03 - gr) / 0.02, 0, 1)
	bare = np.clip((-0.05 - gr) / 0.02, 0, 1) * np.clip((lum - 0.18) / 0.04, 0, 1)
	grass = np.clip((0.03 - gr) / 0.02, 0, 1) * np.clip((gr + 0.05) / 0.02, 0, 1) * np.clip((lum - 0.22) / 0.04, 0, 1)
	f = np.stack([forest, young, bare, grass], -1)
	valid = np.ones_like(lum)
	if cloud:
		cl = (lum > 0.42) & (sat < 0.22)
		cl = nd.binary_dilation(cl, iterations=2)
		valid = (~cl).astype(np.float32)
	if land is not None:
		valid = valid * land          # the sea never leaks into the land through the cloud in-painting
	# in-paint invalid pixels (clouds) with a normalised convolution, then smooth everything (~100 m)
	sig_fill = 1200 / m_per_px
	num = np.stack([nd.gaussian_filter(f[..., k] * valid, sig_fill) for k in range(4)], -1)
	den = nd.gaussian_filter(valid, sig_fill)[..., None]
	fill = num / np.maximum(den, 1e-4)
	f = f * valid[..., None] + fill * (1 - valid[..., None])
	s = 100 / m_per_px
	return np.stack([nd.gaussian_filter(f[..., k], s) for k in range(4)], -1).astype(np.float32)


# ------------------------------------------------------------------ land cover
mw, mf = meta('hawaii'), meta('hawaii_flow')
def land_of(r, shape):
	Hh = heights(r)
	yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.float64)
	h = nd.map_coordinates(Hh, [yy / (shape[0] - 1) * (Hh.shape[0] - 1), xx / (shape[1] - 1) * (Hh.shape[1] - 1)], order=1)
	return (h > 1.0).astype(np.float32)
a = sat_rgb('hawaii', 1794)
zw = classify(a, mw['width_m'] / 1794, land=land_of('hawaii', a.shape[:2]))
np.save(OUT / 'zw.npy', zw)
a = sat_rgb('hawaii_flow', 2048)
zf = classify(a, mf['width_m'] / 2048, cloud=True, land=land_of('hawaii_flow', a.shape[:2]))
np.save(OUT / 'zf.npy', zf)
print('zones', zw.shape, zf.shape)

# ------------------------------------------------------------------ Hilo built-up fraction (OSM footprints) on the flow grid frame
FW, FH = 2048, round(2048 * zf.shape[0] / zf.shape[1])
SS = 4
img = Image.new('L', (FW * SS, FH * SS), 0); dr = ImageDraw.Draw(img)
mc = mf['mercator']
def fpx(lat, lon):
	x, y = merc(lat, lon)
	return (x - mc['x0']) / (mc['x1'] - mc['x0']) * (FW * SS - 1), (y - mc['y0']) / (mc['y1'] - mc['y0']) * (FH * SS - 1)
for el in json.load(open(ROOT / 'data/osm_hilo/buildings.json'))['elements']:
	g = el.get('geometry') or []
	if len(g) < 3: continue
	dr.polygon([fpx(p['lat'], p['lon']) for p in g], fill=255)
cov = np.asarray(img.resize((FW, FH), Image.BOX), np.float32) / 255
mpp = mf['width_m'] / FW
urban = nd.gaussian_filter(cov, 90 / mpp)
urban = urban / max(1e-6, np.percentile(urban[urban > 0.01], 60))   # 1 ≈ typical town density
np.save(OUT / 'urban.npy', np.clip(urban, 0, 4).astype(np.float32))
print('urban', urban.shape, float(urban.max()))

# ------------------------------------------------------------------ coast: signed distance (km), wide frame at 2× DEM resolution
Hw = heights('hawaii'); Hf = heights('hawaii_flow')
CW, CH = mw['nx'] * 2, mw['ny'] * 2
yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float64)
u = xx / (CW - 1); v = yy / (CH - 1)
hw = nd.map_coordinates(Hw, [v * (mw['ny'] - 1), u * (mw['nx'] - 1)], order=1)
# the same pixels in the flow grid
mx_ = mw['mercator']['x0'] + u * (mw['mercator']['x1'] - mw['mercator']['x0'])
my_ = mw['mercator']['y0'] + v * (mw['mercator']['y1'] - mw['mercator']['y0'])
uf = (mx_ - mc['x0']) / (mc['x1'] - mc['x0']); vf = (my_ - mc['y0']) / (mc['y1'] - mc['y0'])
inf = (uf > 0) & (uf < 1) & (vf > 0) & (vf < 1)
hf = nd.map_coordinates(Hf, [np.clip(vf, 0, 1) * (mf['ny'] - 1), np.clip(uf, 0, 1) * (mf['nx'] - 1)], order=1)
hh = np.where(inf, hf, hw)
land = hh > 1.0
kmpp = mw['width_m'] / 1000 / (CW - 1)
dsea = nd.distance_transform_edt(~land) * kmpp
dland = nd.distance_transform_edt(land) * kmpp
coast = np.where(land, -dland, dsea).astype(np.float32)
coast = nd.gaussian_filter(coast, 0.8)
np.save(OUT / 'coast.npy', coast.astype(np.float32))
print('coast', coast.shape, kmpp)

# ------------------------------------------------------------------ lava fields (flow grid frame, the lava.png resolution)
L = np.asarray(Image.open(ROOT / 'public/terrain/hawaii_flow/lava.png').convert('RGB'), np.float32)[..., 0] / 255
E = np.asarray(Image.open(ROOT / 'public/terrain/hawaii_flow/lava_edge.png').convert('L'), np.float32) / 255
mask = L < 0.995
lmpp = mf['width_m'] / (L.shape[1] - 1)
# plateau-free arrival: normalised Gaussian inside the flow (σ ≈ 2.5 px), so the front advances smoothly, never in 100 m steps
s = 2.5
num = nd.gaussian_filter(np.where(mask, L, 0), s); den = nd.gaussian_filter(mask.astype(np.float32), s)
arr = np.where(mask, num / np.maximum(den, 1e-4), 1.0)
dist_out, (iy, ix) = nd.distance_transform_edt(~mask, return_indices=True)
anear = np.where(mask, arr, arr[iy, ix])
dout = (dist_out * lmpp / 1000).astype(np.float32)
lava = np.stack([arr, E, dout, anear], -1).astype(np.float32)
np.save(OUT / 'lava.npy', lava)
print('lava', lava.shape, 'mpp', lmpp)

# quick look: flat colour map of the classes
def look(z, name):
	c = np.zeros(z.shape[:2] + (3,), np.float32) + (0.55, 0.62, 0.2)
	for k, col in ((3, (0.75, 0.7, 0.3)), (2, (0.6, 0.35, 0.18)), (0, (0.05, 0.3, 0.09)), (1, (0.12, 0.09, 0.14))):
		c[z[..., k] > 0.5] = col
	Image.fromarray((c * 255).astype(np.uint8)).save(OUT / f'look_{name}.png')
look(zw, 'zw'); look(zf, 'zf')

# ------------------------------------------------------------------ ripple field: geodesic distance (km) from the source inside the flow
# The 8-bit arrival map carries organic noise (lava_maps.py wobble), so its iso-lines are hair-thin squiggles (median spacing
# 27 m at 85 ripples/unit) that would shimmer. Flow ripples use this smooth field instead: distance travelled from the vent
# through the flow (skimage MCP), smoothed — its iso-lines are clean arcs across the channel at any spacing.
from skimage.graph import MCP_Geometric
cost = np.where(mask, 1.0, 1e6)
seeds = np.argwhere(arr <= arr[mask].min() + 0.004)
geo_px, _ = MCP_Geometric(cost).find_costs([tuple(s) for s in seeds])
geo = np.where(mask & (geo_px < 1e5), geo_px * lmpp / 1000, np.nan)
far = np.nanmax(geo)
geo = np.where(np.isnan(geo), far, geo)
s = 3.0
num = nd.gaussian_filter(np.where(mask, geo, 0), s); den = nd.gaussian_filter(mask.astype(np.float32), s)
geo_s = np.where(mask, num / np.maximum(den, 1e-4), far).astype(np.float32)
lava2 = np.stack([geo_s, E, np.zeros_like(E), np.ones_like(E)], -1).astype(np.float32)
np.save(OUT / 'lava2.npy', lava2)
print('ripple field', float(geo_s[mask].min()), float(geo_s[mask].max()), 'km')
