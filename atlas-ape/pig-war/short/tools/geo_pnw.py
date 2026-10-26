"""Salish Sea / San Juan Islands terrain + border lines for the «Pig War» map shots → data/terrain/pnw/
  height.npy  float32 metres, regular lat/lon grid (1/3000° × 1/2000° ≈ 37 m), row 0 = north, despiked (the z12 tiles have
              +2500 m spikes and pits); NOTE: at z ≥ 9 the terrarium tiles carry NO bathymetry here (water = 0 m in Canada,
              ±3 m blotches in the US NED part), so the coast is taken at h > 2.5 m with cleaning (clean_mask)
  depth.npy   float32 water depth in metres from the z8 tiles (≈400 m/px, ETOPO-style bathymetry), same grid
  sdf.npy     int16 signed distance to the coast in metres (+ land, − water), same grid (from a 2× supersampled mask)
  lines.json  49th parallel + the two 1859 claim lines (US = Boundary Pass + Haro Strait, British = Rosario Strait) as
              lat/lon polylines relaxed onto the channel centrelines of this DEM (+ min water clearance), the glow ring
              160 m off San Juan Island (san_juan_ring) and its centroid
  masks.npz   san_juan / group (islands between the claim lines) uint8, dilated 3 cells + softened
  tex.png     RGBA8 for Blender (Non-Color, channel packed): R = sdf (128 + m/8), G = water depth (sqrt, 0…400 m; z8 depth
              capped by a shelf profile from the coast), B = San Juan Island mask, A = San Juan Islands group mask
  meta.json   bbox, grid size, steps, km per degree, encodings
  debug*.png  top-down check pictures (land/water/lines; Boundary Pass and Rosario Strait close-ups)
Source: https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png (h = R*256 + G + B/256 − 32768), zoom 12
(≈25 m/px here) + zoom 8 for depth, cached in data/terrain/pnw/tiles.   python3 tools/geo_pnw.py [--force] [--lines]
"""
import io, json, math, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/terrain/pnw'
TILES = OUT / 'tiles'
UA = {'User-Agent': 'AtlasApeShort/1.0 (terrain for a YouTube short)'}
S, N, W, E = 47.95, 49.85, -123.90, -121.70     # more than the visible map (the tilted camera sees to ≈ 49.7° N at the top)
Z = 12
DLAT, DLON = 1 / 3000, 1 / 2000                  # ≈ 37 m × 37 m at 48.8° N
LAT0, LON0 = 48.60, -122.95                       # Blender origin (the San Juan Islands)
KY = 111.13                                       # km per degree latitude (here)
KX = 111.32 * math.cos(math.radians(LAT0))        # km per degree longitude at LAT0
NY = int(round((N - S) / DLAT)) + 1
NX = int(round((E - W) / DLON)) + 1


def tile_xy(lat, lon, z):
	n = 2 ** z
	return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def fetch(x, y):
	p = TILES / f'{Z}/{x}_{y}.png'
	if p.exists() and p.stat().st_size > 0:
		return p.read_bytes()
	url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png'
	for k in range(5):
		try:
			b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
			p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(b)
			return b
		except Exception as e:  # noqa
			print('retry', url, e); time.sleep(1 + k)
	raise RuntimeError(url)


def mosaic():
	ax0, ay0 = tile_xy(N, W, Z); ax1, ay1 = tile_xy(S, E, Z)
	x0, y0, x1, y1 = int(ax0), int(ay0), int(ax1), int(ay1)
	tiles = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
	print('tiles', len(tiles))
	def one(xy):
		a = np.asarray(Image.open(io.BytesIO(fetch(*xy))).convert('RGB')).astype(np.float32)
		return xy, a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
	H = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), np.float32)
	with ThreadPoolExecutor(8) as ex:
		for (x, y), h in ex.map(one, tiles):
			H[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = h
	return H, x0, y0


def sample(H, x0, y0, lats, lons, order=3):
	"""bicubic sample of the mercator mosaic at a lat/lon lattice (rows = lats, cols = lons)"""
	n = 2 ** Z * 256
	px = (lons + 180) / 360 * n - x0 * 256 - 0.5
	py = (1 - np.arcsinh(np.tan(np.radians(lats))) / np.pi) / 2 * n - y0 * 256 - 0.5
	out = np.empty((len(lats), len(lons)), np.float32)
	step = 512
	for r in range(0, len(lats), step):
		PY, PX = np.meshgrid(py[r:r + step], px, indexing='ij')
		out[r:r + step] = ndi.map_coordinates(H, [PY, PX], order=order, mode='nearest')
	return out


def clean_mask(h, cell_km2, T=2.5):
	"""land = h > T: at z12 the tiles carry NO bathymetry here — water is 0 m (Canada) or ±3 m blotches (US NED seams),
	so 0 m is useless; 2.5 m keeps the deltas/flats mostly. Then: 3×3 median against speckle, drop land blobs whose top is
	< 6 m (water noise) or < 0.01 km², fill every enclosed water body < 60 km² (pits, delta noise, DEM spikes)"""
	land = ndi.gaussian_filter(ndi.median_filter(h > T, size=3).astype(np.float32), 1.2) > 0.5   # rounds 1-px stair steps
	lab, n = ndi.label(land)
	idx = np.arange(1, n + 1)
	sz = ndi.sum(land, lab, idx); top = ndi.maximum(h, lab, idx)
	land &= np.isin(lab, idx[(sz * cell_km2 >= 0.01) & (top >= 6.0)])
	wl, nw = ndi.label(~land)
	wsz = ndi.sum(~land, wl, np.arange(1, nw + 1))
	land |= np.isin(wl, 1 + np.nonzero(wsz * cell_km2 < 60.0)[0])
	return land


def bathy():
	"""z8 terrarium (≈400 m/px) still has ETOPO-style bathymetry → water depth in m on the grid (land → 0)"""
	z = 8
	ax0, ay0 = tile_xy(N, W, z); ax1, ay1 = tile_xy(S, E, z)
	x0, y0, x1, y1 = int(ax0), int(ay0), int(ax1), int(ay1)
	H = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), np.float32)
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			p = TILES / f'{z}/{x}_{y}.png'
			if not p.exists():
				b = urllib.request.urlopen(urllib.request.Request(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png', headers=UA), timeout=30).read()
				p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(b)
			a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
			H[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
	n = 2 ** z * 256
	lats = N - np.arange(NY) * DLAT; lons = W + np.arange(NX) * DLON
	px = (lons + 180) / 360 * n - x0 * 256 - 0.5
	py = (1 - np.arcsinh(np.tan(np.radians(lats))) / np.pi) / 2 * n - y0 * 256 - 0.5
	PY, PX = np.meshgrid(py, px, indexing='ij')
	d = ndi.map_coordinates(-H, [PY, PX], order=1, mode='nearest')
	return np.clip(d, 0, 500).astype(np.float32)


def lat_of(r): return N - r * DLAT
def lon_of(c): return W + c * DLON
def rc(lat, lon): return (N - lat) / DLAT, (lon - W) / DLON


def build_grids():
	H, x0, y0 = mosaic()
	# despike: the z12 tiles carry single-cluster spikes up to +2500 m (e.g. on Orcas) and pits; clamp to a 7×7 median band
	med = ndi.median_filter(H, 7)
	print('spikes', int((H - med > 35).sum()), 'pits', int((med - H > 60).sum()))
	H = np.clip(H, med - 60, med + 35); del med
	lats = N - np.arange(NY) * DLAT; lons = W + np.arange(NX) * DLON
	h = np.clip(sample(H, x0, y0, lats, lons), -60, 4000)        # a few −400…−24000 m tile spikes in the water
	np.save(OUT / 'height.npy', h)
	print('height', h.shape, float(h.min()), float(h.max()))
	# coast: 2× supersampled bicubic height → land mask → cleaned → exact EDT both ways → signed distance (m)
	lats2 = N - np.arange(2 * NY - 1) * DLAT / 2; lons2 = W + np.arange(2 * NX - 1) * DLON / 2
	h2 = sample(H, x0, y0, lats2, lons2)
	del H
	land = clean_mask(h2, cell_km2=(DLAT / 2 * KY) * (DLON / 2 * KX))
	dy, dx = DLAT / 2 * KY * 1000, DLON / 2 * KX * 1000
	dl = ndi.distance_transform_edt(land, sampling=(dy, dx))
	dw = ndi.distance_transform_edt(~land, sampling=(dy, dx))
	half = 0.5 * min(dx, dy)
	sdf2 = np.where(land, dl - half, -(dw - half)).astype(np.float32)
	sdf = np.clip(sdf2[::2, ::2], -32000, 32000).astype(np.int16)
	np.save(OUT / 'sdf.npy', sdf)
	print('sdf', sdf.shape, 'land %', round(100 * float((sdf > 0).mean()), 1))
	return h, sdf


# ------------------------------------------------------------------ lines
L49 = [(49.0, -121.75), (49.0, -123.322)]                      # 49th parallel from the east edge to mid Strait of Georgia
FORK = (49.0, -123.322)
HARO = [FORK, (48.93, -123.20), (48.86, -123.07), (48.80, -123.01), (48.775, -123.06), (48.75, -123.12),
        (48.72, -123.19), (48.695, -123.255), (48.65, -123.255), (48.60, -123.245), (48.55, -123.225),
        (48.50, -123.205), (48.45, -123.19), (48.40, -123.19), (48.35, -123.20), (48.30, -123.22), (48.255, -123.24)]
ROSARIO = [FORK, (48.95, -123.20), (48.89, -123.05), (48.83, -122.93), (48.785, -122.86), (48.75, -122.80),
           (48.71, -122.755), (48.67, -122.74), (48.62, -122.745), (48.57, -122.75), (48.52, -122.755),
           (48.47, -122.75), (48.43, -122.75), (48.38, -122.77), (48.33, -122.82), (48.29, -122.90), (48.255, -122.98)]


def bil(a, r, c):
	r = np.clip(r, 0, a.shape[0] - 1.001); c = np.clip(c, 0, a.shape[1] - 1.001)
	r0, c0 = np.floor(r).astype(int), np.floor(c).astype(int); fr, fc = r - r0, c - c0
	return (a[r0, c0] * (1 - fr) * (1 - fc) + a[r0 + 1, c0] * fr * (1 - fc) + a[r0, c0 + 1] * (1 - fr) * fc + a[r0 + 1, c0 + 1] * fr * fc)


def to_km(pts):
	p = np.asarray(pts, float)
	return np.c_[(p[:, 1] - LON0) * KX, (p[:, 0] - LAT0) * KY]
def to_ll(xy):
	return np.c_[xy[:, 1] / KY + LAT0, xy[:, 0] / KX + LON0]


def resample(xy, step):
	d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(xy, axis=0), axis=1))]
	s = np.linspace(0, d[-1], max(2, int(d[-1] / step) + 1))
	return np.c_[np.interp(s, d, xy[:, 0]), np.interp(s, d, xy[:, 1])]


def relax(pts, sdf, iters=400, dmax=3000.0, step=0.04, lam=0.25):
	"""active-contour centreline: points climb the (capped) water-distance field across the line, neighbours smooth"""
	D = np.clip(-sdf.astype(np.float32), 0, dmax) / 1000.0            # km of water around, capped (open water = flat)
	gy, gx = np.gradient(D)                                            # per grid cell (rows = −lat)
	xy = resample(to_km(pts), 0.4)
	for _ in range(iters):
		ll = to_ll(xy); r, c = rc(ll[:, 0], ll[:, 1])
		gkx = bil(gx, r, c) / (DLON * KX); gky = -bil(gy, r, c) / (DLAT * KY)   # d/dkm east, d/dkm north
		t = np.gradient(xy, axis=0); t /= np.linalg.norm(t, axis=1)[:, None] + 1e-9
		nrm = np.c_[-t[:, 1], t[:, 0]]
		g = (gkx * nrm[:, 0] + gky * nrm[:, 1])[:, None] * nrm
		mv = np.clip(g * step * 20, -step, step)
		mv[0] = mv[-1] = 0
		xy = xy + mv
		sm = xy.copy(); sm[1:-1] = xy[1:-1] + lam * (0.5 * (xy[:-2] + xy[2:]) - xy[1:-1])
		xy = resample(sm, 0.4)
	return xy


def clearance(xy, sdf):
	f = resample(xy, 0.05); ll = to_ll(f); r, c = rc(ll[:, 0], ll[:, 1])
	d = -bil(sdf.astype(np.float32), r, c)
	k = int(np.argmin(d))
	return float(d.min()), tuple(np.round(ll[k], 4))


def build_lines(sdf):
	out = {'note': 'lat/lon polylines; haro/rosario relaxed onto channel centrelines of the DEM (tools/geo_pnw.py)'}
	l49 = resample(to_km(L49), 0.4)
	out['l49'] = to_ll(l49).round(5).tolist()
	for name, pts in (('haro', HARO), ('rosario', ROSARIO)):
		xy = relax(pts, sdf)
		sm = xy.copy()                                              # round the turning points (σ ≈ 1.6 km along the line)
		for k in range(2):
			sm[1:-1] = ndi.gaussian_filter1d(sm, 4.0, axis=0, mode='nearest')[1:-1]
		if clearance(sm, sdf)[0] > 450: xy = sm
		cl, at = clearance(xy, sdf)
		print(f'{name}: {len(xy)} pts, length {np.linalg.norm(np.diff(xy, axis=0), axis=1).sum():.1f} km, min water clearance {cl:.0f} m at {at}')
		out[name] = to_ll(xy).round(5).tolist()
		out[name + '_clearance_m'] = round(cl)
	json.dump(out, open(OUT / 'lines.json', 'w'))
	return out


def masks(sdf, lines):
	from skimage.draw import polygon as poly_fill
	land = sdf > 0
	lab, n = ndi.label(land)
	r, c = rc(48.53, -123.08)
	sj = lab == lab[int(r), int(c)]
	lens = np.array(lines['haro'] + lines['rosario'][::-1])
	lr, lc = rc(lens[:, 0], lens[:, 1])
	inside = np.zeros(land.shape, bool)
	pr, pc = poly_fill(lr, lc, land.shape); inside[pr, pc] = True
	cnt = ndi.sum(land, lab, np.arange(1, n + 1)); cin = ndi.sum(inside & land, lab, np.arange(1, n + 1))
	border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
	keep = [k + 1 for k in range(n) if cnt[k] > 0 and cin[k] / cnt[k] > 0.9 and (k + 1) not in border]
	grp = np.isin(lab, keep)
	print('San Juan Island cells', int(sj.sum()), '≈ km²', round(float(sj.sum()) * DLAT * KY * DLON * KX, 1),
	      '| group islands', len(keep), '≈ km²', round(float(grp.sum()) * DLAT * KY * DLON * KX, 1))
	# glow ring around San Juan Island: 160 m offshore iso-line of the distance to that island only
	rr, cc = np.nonzero(sj); ra, rb, ca, cb = rr.min() - 40, rr.max() + 40, cc.min() - 40, cc.max() + 40
	dsj = ndi.distance_transform_edt(~sj[ra:rb, ca:cb], sampling=(DLAT * KY * 1000, DLON * KX * 1000))
	from skimage.measure import find_contours
	cs = max(find_contours(dsj, 160.0), key=len)
	ring = np.c_[N - (cs[:, 0] + ra) * DLAT, W + (cs[:, 1] + ca) * DLON]
	ring = to_ll(resample(to_km(ring), 0.15))
	lines['san_juan_ring'] = ring.round(5).tolist()
	lines['san_juan_centroid'] = [round(N - rr.mean() * DLAT, 5), round(W + cc.mean() * DLON, 5)]
	json.dump(lines, open(OUT / 'lines.json', 'w'))
	def soft(m):
		m = ndi.binary_dilation(m, iterations=3)
		return np.clip(ndi.gaussian_filter(m.astype(np.float32), 1.0) * 255, 0, 255).astype(np.uint8)
	return soft(sj), soft(grp)


def main():
	OUT.mkdir(parents=True, exist_ok=True)
	if '--force' in sys.argv or not (OUT / 'sdf.npy').exists():
		h, sdf = build_grids()
	else:
		h, sdf = np.load(OUT / 'height.npy'), np.load(OUT / 'sdf.npy')
	lines = build_lines(sdf)
	sj, grp = masks(sdf, lines)
	np.savez_compressed(OUT / 'masks.npz', san_juan=sj, group=grp)
	if not (OUT / 'depth.npy').exists() or '--force' in sys.argv:
		np.save(OUT / 'depth.npy', bathy())
	dz8 = ndi.gaussian_filter(np.load(OUT / 'depth.npy'), 10.0)          # z8 is 400 m/px: blur its bilinear diamonds
	shelf = 3 + 0.12 * np.clip(-sdf.astype(np.float32), 0, None)          # ≥ 3 m at the coast, +12 m per 100 m offshore
	depth = ndi.gaussian_filter(np.where(sdf > 0, 0, np.minimum(np.maximum(dz8, 4), shelf)), 2.0)
	R = np.clip(128 + sdf.astype(np.float32) / 8, 0, 255)
	G = np.clip(np.sqrt(depth / 400) * 255, 0, 255)
	rgba = np.dstack([R, G, sj, grp]).round().astype(np.uint8)
	Image.fromarray(rgba, 'RGBA').save(OUT / 'tex.png', optimize=False, compress_level=3)
	meta = dict(S=S, N=N, W=W, E=E, zoom=Z, nx=NX, ny=NY, dlat=DLAT, dlon=DLON, lat0=LAT0, lon0=LON0, km_per_deg_lat=KY,
	            km_per_deg_lon=KX, hmin=float(h.min()), hmax=float(h.max()),
	            tex='R = 128 + sdf_m/8 (land > 128), G = 255*sqrt(depth_m/400), B = San Juan Island, A = San Juan Islands group',
	            source='AWS Terrain Tiles terrarium z12 (Mapzen/Tilezen joerd; SRTM, USGS 3DEP/NED, GMTED2010, ETOPO1, CDEM)')
	meta['bathymetry'] = 'terrarium z8 (≈400 m/px; z ≥ 9 tiles have 0 m water here), capped by a shelf profile from the coast'
	json.dump(meta, open(OUT / 'meta.json', 'w'), indent=1)
	debug(h, sdf, lines, sj, grp)
	debug(h, sdf, lines, sj, grp, crop=(48.62, 48.84, -123.30, -122.90), name='debug_boundary_pass.png')
	debug(h, sdf, lines, sj, grp, crop=(48.40, 48.80, -122.95, -122.62), name='debug_rosario.png')


def debug(h, sdf, lines, sj, grp, crop=(48.15, 49.15, -123.55, -122.40), name='debug.png'):
	r0, c0 = (int(v) for v in rc(crop[1], crop[2])); r1, c1 = (int(v) for v in rc(crop[0], crop[3]))
	s = sdf[r0:r1, c0:c1]; hh = h[r0:r1, c0:c1]
	img = np.zeros(s.shape + (3,), np.float32)
	dep = np.clip(-hh / 300, 0, 1)[..., None]
	img[:] = (1 - dep) * np.array([0.45, 0.85, 0.85]) + dep * np.array([0.05, 0.25, 0.55])
	landc = np.array([0.45, 0.7, 0.35]) * (0.6 + 0.4 * np.clip(hh / 600, 0, 1))[..., None]
	img = np.where((s > 0)[..., None], landc, img)
	img = np.where(((s <= 0) & (s > -80))[..., None], 1.0, img)
	img = np.where(((s > 0) & (sj[r0:r1, c0:c1] > 128))[..., None], np.array([0.9, 0.5, 0.2]), img)
	img = np.where(((s > 0) & (grp[r0:r1, c0:c1] > 128) & (sj[r0:r1, c0:c1] <= 128))[..., None], np.array([0.8, 0.75, 0.3]), img)
	im = Image.fromarray((img * 255).astype(np.uint8))
	d = ImageDraw.Draw(im)
	for key, col in (('l49', (255, 255, 230)), ('haro', (40, 90, 255)), ('rosario', (230, 30, 30))):
		ll = np.array(lines[key]); r, c = rc(ll[:, 0], ll[:, 1])
		d.line(list(zip(c - c0, r - r0)), fill=col, width=3)
	ll = np.array(lines.get('san_juan_ring', [[0, 0]])); r, c = rc(ll[:, 0], ll[:, 1])
	d.line(list(zip(c - c0, r - r0)), fill=(255, 0, 255), width=2)
	im.save(OUT / name)
	print('debug', im.size)


if __name__ == '__main__':
	if '--lines' in sys.argv:
		h, sdf = np.load(OUT / 'height.npy'), np.load(OUT / 'sdf.npy')
		lines = build_lines(sdf); sj, grp = masks(sdf, lines); debug(h, sdf, lines, sj, grp)
		debug(h, sdf, lines, sj, grp, crop=(48.62, 48.84, -123.30, -122.90), name='debug_boundary_pass.png')
		debug(h, sdf, lines, sj, grp, crop=(48.40, 48.80, -122.95, -122.62), name='debug_rosario.png')
	else:
		main()
