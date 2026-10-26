"""Terrain + satellite for the three 3D regions → public/terrain/<region>/
  height.bin  float32 little-endian, NX×NY metres (row 0 = north), Web-Mercator grid aligned with the texture
  sat.jpg     EOX Sentinel-2 cloudless 2016 (CC BY 4.0) mosaic, same bbox
  meta.json   bbox, size, metres per grid cell, min/max height
Sources: AWS Terrain Tiles (terrarium PNG, s3.amazonaws.com/elevation-tiles-prod, public dataset, h = R*256+G+B/256-32768)
         EOX WMTS s2cloudless_3857 (tiles.maps.eox.at, «Sentinel-2 cloudless 2016 by EOX», CC BY 4.0)
  python3 tools/terrain.py [region ...]
"""
import io, json, math, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/tiles'
UA = {'User-Agent': 'AtlasApeShort/1.0 (terrain for a YouTube short)'}

REGIONS = {
	# name: (lat_s, lat_n, lon_w, lon_e, dem_zoom, sat_zoom, grid_long_side)
	'hawaii': (18.88, 20.30, -156.10, -154.78, 11, 12, 1024),
	'etna': (37.60, 37.83, 14.88, 15.22, 13, 14, 1024),
	'heimaey': (63.395, 63.465, -20.345, -20.185, 14, 15, 1024),
	# nested Hawaii levels: the 1935 flow strip incl. Hilo, and 8 km around the vent (hook / bombers close-ups)
	'hawaii_flow': (19.47, 19.80, -155.66, -155.03, 12, 13, 1024),
	'hawaii_vent': (19.555, 19.625, -155.535, -155.46, 14, 15, 1024),
	# coarse surroundings drawn under/around the detailed grids (no lava)
	'etna_wide': (37.05, 38.30, 14.20, 15.75, 10, 11, 768),
	'heimaey_wide': (63.20, 63.85, -20.95, -19.40, 11, 12, 768),
}


def tile_xy(lat, lon, z):
	n = 2 ** z
	x = (lon + 180) / 360 * n
	y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
	return x, y


def fetch(url, path):
	if path.exists() and path.stat().st_size > 0:
		return path.read_bytes()
	for k in range(4):
		try:
			b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
			path.parent.mkdir(parents=True, exist_ok=True)
			path.write_bytes(b)
			return b
		except Exception as e:  # noqa
			print('retry', url, e)
			time.sleep(1 + k)
	raise RuntimeError(url)


def mosaic(kind, z, x0, x1, y0, y1):
	"""stitch integer tile range [x0..x1]×[y0..y1] → array"""
	def one(xy):
		x, y = xy
		if kind == 'dem':
			url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
			p = CACHE / f'dem/{z}/{x}_{y}.png'
		else:
			url = f'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'
			p = CACHE / f'sat/{z}/{x}_{y}.jpg'
		return xy, Image.open(io.BytesIO(fetch(url, p))).convert('RGB')
	tiles = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
	with ThreadPoolExecutor(8) as ex:
		res = dict(ex.map(one, tiles))
	W, H = (x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256
	out = Image.new('RGB', (W, H))
	for (x, y), im in res.items():
		out.paste(im, ((x - x0) * 256, (y - y0) * 256))
	return out


def crop_bbox(img, z, x0, y0, s, n, w, e):
	fx0, fy0 = tile_xy(n, w, z)
	fx1, fy1 = tile_xy(s, e, z)
	box = ((fx0 - x0) * 256, (fy0 - y0) * 256, (fx1 - x0) * 256, (fy1 - y0) * 256)
	return box


def build(name):
	s, n, w, e, zd, zs, N = REGIONS[name]
	out = ROOT / 'public/terrain' / name
	out.mkdir(parents=True, exist_ok=True)
	# ---- DEM ----
	ax0, ay0 = tile_xy(n, w, zd)
	ax1, ay1 = tile_xy(s, e, zd)
	x0, y0, x1, y1 = int(ax0), int(ay0), int(ax1), int(ay1)
	dem_img = mosaic('dem', zd, x0, x1, y0, y1)
	a = np.asarray(dem_img).astype(np.float64)
	h = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
	box = crop_bbox(None, zd, x0, y0, s, n, w, e)
	# resample DEM crop to the grid (long side N) with bilinear sampling in mercator space
	bw, bh = box[2] - box[0], box[3] - box[1]
	if bw >= bh:
		NX, NY = N, max(2, round(N * bh / bw))
	else:
		NX, NY = max(2, round(N * bw / bh)), N
	from scipy.ndimage import map_coordinates
	gx = np.linspace(box[0], box[2], NX)
	gy = np.linspace(box[1], box[3], NY)
	GX, GY = np.meshgrid(gx, gy)
	hz = map_coordinates(h, [GY - 0.5, GX - 0.5], order=1, mode='nearest').astype(np.float32)
	hz.astype('<f4').tofile(out / 'height.bin')
	# metres: mercator scale at the centre latitude
	latc = (s + n) / 2
	R = 6378137.0
	mpp_tile = 2 * math.pi * R * math.cos(math.radians(latc)) / (256 * 2 ** zd)  # m per DEM-tile pixel (ground)
	width_m = bw * mpp_tile
	height_m = bh * mpp_tile
	# ---- satellite ----
	sx0, sy0 = tile_xy(n, w, zs)
	sx1, sy1 = tile_xy(s, e, zs)
	tx0, ty0, tx1, ty1 = int(sx0), int(sy0), int(sx1), int(sy1)
	sat = mosaic('sat', zs, tx0, tx1, ty0, ty1)
	sbox = crop_bbox(None, zs, tx0, ty0, s, n, w, e)
	sat = sat.crop(tuple(round(v) for v in sbox))
	if max(sat.size) > 4096:
		k = 4096 / max(sat.size)
		sat = sat.resize((round(sat.size[0] * k), round(sat.size[1] * k)), Image.LANCZOS)
	sat.save(out / 'sat.jpg', quality=90)
	meta = {
		'region': name, 'bbox': {'s': s, 'n': n, 'w': w, 'e': e}, 'nx': NX, 'ny': NY,
		'width_m': round(width_m, 1), 'height_m': round(height_m, 1),
		'h_min': float(hz.min()), 'h_max': float(hz.max()), 'dem_zoom': zd, 'sat_zoom': zs, 'sat_size': sat.size,
		'mercator': {'x0': sx0 / 2 ** zs, 'y0': sy0 / 2 ** zs, 'x1': sx1 / 2 ** zs, 'y1': sy1 / 2 ** zs},
		'credits': ['Elevation: AWS Terrain Tiles (Mapzen terrarium; SRTM, GMTED, ETOPO1, ArcticDEM et al.)',
		            'Imagery: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016), CC BY 4.0'],
	}
	(out / 'meta.json').write_text(json.dumps(meta, indent=1))
	print(name, NX, NY, f'{width_m/1000:.1f}×{height_m/1000:.1f} km', f'h {hz.min():.0f}…{hz.max():.0f} m', 'sat', sat.size)


if __name__ == '__main__':
	for r in (sys.argv[1:] or REGIONS):
		build(r)
