"""Hawaii land-cover fields for the toon shots (hawaii_hook.py / hawaii_raid.py): the satellite mosaics are NOT used as
textures, they are classified per pixel into four smooth probability fields that the toon shader only ever thresholds at 0.5
(crisp, blobby colour zones that follow the real lava flows and vegetation):
  R = vegetation (green), G = forest (dark green), B = young/dark lava, A = light weathered ground (ochre)
Clouds in the EOX island mosaic are masked and filled from the surroundings (normalised convolution). Thresholds of the
coarser grids are matched to the finer grid on their overlap, so the zones line up across the nested grids.
  python3 tools/blender/hawaii_zones.py   → out/blender/hawaii_cache/zones_<region>.png (+ preview jpg)"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out/blender/hawaii_cache'
OUT.mkdir(parents=True, exist_ok=True)
REG = ['hawaii_vent', 'hawaii_flow', 'hawaii']
N = {'hawaii_vent': 2048, 'hawaii_flow': 2048, 'hawaii': 1800}
BLUR_M = {'hawaii_vent': 22, 'hawaii_flow': 140, 'hawaii': 220}     # smoothing (m) → blob scale of the zones


def merc(lat, lon):
	import math
	x = (lon + 180) / 360
	y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2
	return x, y


def load(r):
	m = json.load(open(ROOT / f'public/terrain/{r}/meta.json'))
	s = Image.open(ROOT / f'public/terrain/{r}/sat.jpg').convert('RGB')
	w, h = s.size
	k = N[r] / max(w, h)
	s = s.resize((round(w * k), round(h * k)), Image.LANCZOS)
	a = np.asarray(s, np.float32) / 255
	H = np.fromfile(ROOT / f'public/terrain/{r}/height.bin', np.float32).reshape(m['ny'], m['nx'])
	Hs = np.asarray(Image.fromarray(H).resize((a.shape[1], a.shape[0]), Image.BILINEAR))
	return m, a, Hs


def window(m_outer, m_inner, shape):
	"""pixel window (j0, j1, i0, i1) of the inner region's bbox in the outer image"""
	mo, mi = m_outer['mercator'], m_inner['mercator']
	i0 = (mi['x0'] - mo['x0']) / (mo['x1'] - mo['x0']) * shape[1]; i1 = (mi['x1'] - mo['x0']) / (mo['x1'] - mo['x0']) * shape[1]
	j0 = (mi['y0'] - mo['y0']) / (mo['y1'] - mo['y0']) * shape[0]; j1 = (mi['y1'] - mo['y0']) / (mo['y1'] - mo['y0']) * shape[0]
	return int(j0), int(j1), int(i0), int(i1)


def fields(a, H, thr):
	R, G, B = a[..., 0], a[..., 1], a[..., 2]
	lum = 0.3 * R + 0.59 * G + 0.11 * B
	gr = G - np.maximum(R, B)
	rg = R - G
	sat = a.max(2) - a.min(2)
	cloud = (lum > thr['cloud']) & (sat < 0.09)
	land = H > 2
	valid = (~cloud) & land
	veg = np.clip((gr - thr['veg']) / 0.012, 0, 1)
	forest = veg * np.clip((thr['forest'] - lum) / 0.02, 0, 1)
	dark = np.clip((thr['dark'] - lum) / 0.012, 0, 1) * (1 - veg)
	if thr.get('rel'):   # coarse mosaics: young flows = locally dark streaks (lum / local mean), whatever the mosaic's brightness
		lm = nd.gaussian_filter(np.where(valid, lum, np.nan_to_num(lum)), thr['rel'][1])
		dark = np.maximum(dark, np.clip((thr['rel'][0] - lum / (lm + 1e-3)) / 0.04, 0, 1) * (1 - veg) * (lum < 0.3))
	ochre = np.clip((lum - thr['ochre']) / 0.015, 0, 1) * np.clip((rg - 0.01) / 0.015, 0, 1) * (1 - veg)
	return np.stack([veg, forest, dark, ochre], -1), valid, lum, gr, rg


def smooth(f, valid, sig):
	w = valid.astype(np.float32)
	out = np.empty_like(f)
	ws = nd.gaussian_filter(w, sig) + 1e-4
	for c in range(f.shape[-1]):
		out[..., c] = nd.gaussian_filter(f[..., c] * w, sig) / ws
	# far from any valid pixel (big cloud banks): fall back to a wider fill
	wide = nd.gaussian_filter(w, sig * 6) + 1e-4
	far = ws < 0.15
	if far.any():
		for c in range(f.shape[-1]):
			fw = nd.gaussian_filter(f[..., c] * w, sig * 6) / wide
			out[..., c] = np.where(far, fw, out[..., c])
	return out


if __name__ == '__main__':
	data = {r: load(r) for r in REG}
	# vent: thresholds by hand (NAIP 0.6 m): dark ≈ 45 % of the area = the young flows (1935, 1942, 1984 …)
	m, a, H = data['hawaii_vent']
	lum = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
	thr = {'hawaii_vent': {'cloud': 2, 'veg': 0.02, 'forest': 0.2, 'dark': float(np.percentile(lum, 45)), 'ochre': float(np.percentile(lum, 82))}}
	fr_dark = 0.45; fr_ochre = 0.18
	# coarser grids: match the fraction of dark / ochre on the overlap with the finer grid
	for r, inner in (('hawaii_flow', 'hawaii_vent'), ('hawaii', 'hawaii_flow')):
		m, a, H = data[r]
		lum = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
		j0, j1, i0, i1 = window(m, data[inner][0], lum.shape)
		sub = lum[j0:j1, i0:i1]
		if inner == 'hawaii_vent':
			d_ = float(np.percentile(sub, fr_dark * 100)); o_ = float(np.percentile(sub, 100 - fr_ochre * 100))
		else:
			fi, _, li, _, _ = fields(data[inner][1], data[inner][2], thr[inner])
			fd = float((fi[..., 2] > 0.5).mean()); fo = float((fi[..., 3] > 0.5).mean())
			valid = sub < 0.42
			d_ = float(np.percentile(sub[valid], fd * 100)); o_ = float(np.percentile(sub[valid], 100 - fo * 100))
		mpp_ = m['width_m'] / lum.shape[1]
		thr[r] = {'cloud': 0.40, 'veg': 0.012, 'forest': 0.2 if r == 'hawaii_flow' else 0.22, 'dark': d_, 'ochre': o_, 'rel': [0.8, 1500 / mpp_]}
	print(json.dumps(thr, indent=1))
	for r in REG:
		m, a, H = data[r]
		f, valid, *_ = fields(a, H, thr[r])
		mpp = m['width_m'] / a.shape[1]
		sig = BLUR_M[r] / mpp
		fs = smooth(f, valid, max(1.0, sig))
		img = (np.clip(fs, 0, 1) * 255 + 0.5).astype(np.uint8)
		Image.fromarray(img).save(OUT / f'zones_{r}.png')
		# preview: palette as the shader will draw it
		pal = np.zeros(a.shape, np.float32) + np.array([0.45, 0.24, 0.14])
		pal[fs[..., 3] > 0.5] = [0.70, 0.50, 0.26]
		pal[fs[..., 2] > 0.5] = [0.13, 0.09, 0.16]
		pal[fs[..., 0] > 0.5] = [0.32, 0.64, 0.12]
		pal[(fs[..., 0] > 0.5) & (fs[..., 1] > 0.5)] = [0.06, 0.34, 0.1]
		pal[H <= 2] = [0.1, 0.18, 0.42]
		Image.fromarray((pal * 255).astype(np.uint8)).save(OUT / f'zones_{r}_preview.jpg', quality=88)
		print(r, img.shape, 'blur px %.1f' % sig, 'veg %.2f dark %.2f ochre %.2f' % tuple((fs[..., c] > 0.5).mean() for c in (0, 2, 3)))
	json.dump(thr, open(OUT / 'zones_thr.json', 'w'), indent=1)
