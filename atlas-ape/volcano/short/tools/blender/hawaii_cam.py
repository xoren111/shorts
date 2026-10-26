"""Camera paths of the Hawaii toon shots — pure python (imported by the Blender scripts AND runnable with system python3 to
preview screen positions). Port of src/scenes/Hawaii.tsx camPath(): cubic Hermite through keys (target xyz on the ground of
the hawaii_flow grid, az, el, ln dist, fov), Catmull-Rom tangents unless fixed, linear drift outside. three.js frame:
x east, y up, z SOUTH (km, grid centred on hawaii_flow, heights × EXAG 2.2); orbit(): pos = target + dist·(cos el sin az,
sin el, cos el cos az). Blender = (x, −z, y).
  python3 tools/blender/hawaii_cam.py a|b   → prints the screen positions of the key points every 0.25 s"""
import json, math, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
EXAG = 2.2
MF = json.load(open(ROOT / 'public/terrain/hawaii_flow/meta.json'))
NX, NY = MF['nx'], MF['ny']
WK, HK = MF['width_m'] / 1000, MF['height_m'] / 1000
HF = np.fromfile(ROOT / 'public/terrain/hawaii_flow/height.bin', np.float32).reshape(NY, NX)
MC = MF['mercator']


def merc(lat, lon):
	return (lon + 180) / 360, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2


def geo3(lat, lon):
	"""three.js scene x, z (km) of a lat/lon in the hawaii_flow frame"""
	mx, my = merc(lat, lon)
	return ((mx - MC['x0']) / (MC['x1'] - MC['x0']) - 0.5) * WK, ((my - MC['y0']) / (MC['y1'] - MC['y0']) - 0.5) * HK


def ground3(x, z):
	u, v = x / WK + 0.5, z / HK + 0.5
	fx = max(0, min(NX - 1.001, u * (NX - 1))); fy = max(0, min(NY - 1.001, v * (NY - 1)))
	i, j = int(fx), int(fy); a, b = fx - i, fy - j
	h = lambda ii, jj: max(0.0, float(HF[jj, ii]))
	hh = h(i, j) * (1 - a) * (1 - b) + h(i + 1, j) * a * (1 - b) + h(i, j + 1) * (1 - a) * b + h(i + 1, j + 1) * a * b
	return hh / 1000 * EXAG


def at3(lat, lon, agl=0.0):
	x, z = geo3(lat, lon)
	return np.array([x, ground3(x, z) + agl, z])


def key_vals(k):
	p = at3(k['ll'][0], k['ll'][1], k.get('agl', 0.0))
	if k.get('sea'): p[1] = k.get('agl', 0.0)
	return np.array([p[0], p[1], p[2], k['az'], k['el'], math.log(k['dist']), k['fov']])


def hermite(keys, t, end_vel=(0.6, 0.6)):
	"""Hawaii.tsx hermite(): per-key tangents; k['v'] may fix az/el/d (deg/s, d ln dist/s) and scale the target tangent (tg);
	k['tan'] (7 values) fixes every channel (used to continue a path C1 from a sampled tangent)"""
	n = len(keys); T = [k['t'] for k in keys]
	vals = [key_vals(k) for k in keys]
	tans = []
	for i, k in enumerate(keys):
		tn = np.zeros(7)
		for c in range(7):
			v = k.get('v', {})
			fixed = {3: v.get('az'), 4: v.get('el'), 5: v.get('d')}.get(c)
			if 'tan' in k: tn[c] = k['tan'][c]; continue
			if fixed is not None: tn[c] = fixed; continue
			if k.get('still'): tn[c] = 0; continue
			if i == 0: tn[c] = end_vel[0] * (vals[1][c] - vals[0][c]) / (T[1] - T[0])
			elif i == n - 1: tn[c] = end_vel[1] * (vals[i][c] - vals[i - 1][c]) / (T[i] - T[i - 1])
			else:
				sc = v.get('tg', 1.0) if c <= 2 else 1.0
				tn[c] = sc * (vals[i + 1][c] - vals[i - 1][c]) / (T[i + 1] - T[i - 1])
		tans.append(tn)
	if t <= T[0]: return vals[0] + tans[0] * (t - T[0]), tans[0]
	if t >= T[-1]: return vals[-1] + tans[-1] * (t - T[-1]), tans[-1]
	i = 0
	while t > T[i + 1]: i += 1
	h = T[i + 1] - T[i]; u = (t - T[i]) / h; u2 = u * u; u3 = u2 * u
	o = (2 * u3 - 3 * u2 + 1) * vals[i] + (u3 - 2 * u2 + u) * h * tans[i] + (-2 * u3 + 3 * u2) * vals[i + 1] + (u3 - u2) * h * tans[i + 1]
	do = ((6 * u2 - 6 * u) * vals[i] + (3 * u2 - 4 * u + 1) * h * tans[i] + (-6 * u2 + 6 * u) * vals[i + 1] + (3 * u2 - 2 * u) * h * tans[i + 1]) / h
	return o, do


def orbit3(o):
	az, el = math.radians(o[3]), math.radians(o[4]); d = math.exp(o[5])
	tg = o[:3]
	pos = tg + d * np.array([math.cos(el) * math.sin(az), math.sin(el), math.cos(el) * math.cos(az)])
	return pos, tg, o[6]


def to_bl(p):
	return (float(p[0]), float(-p[2]), float(p[1]))


def project3(pos, tg, fov, p, w=1080, h=1920):
	"""three.js PerspectiveCamera.lookAt(target) with up (0,1,0) → screen px"""
	f = tg - pos; f = f / np.linalg.norm(f)
	r = np.cross(f, [0, 1, 0]); r = r / np.linalg.norm(r)
	u = np.cross(r, f)
	d = p - pos
	zc = d @ f
	if zc <= 1e-6: return float('nan'), float('nan')
	th = math.tan(math.radians(fov) / 2)
	x = (d @ r) / zc / (th * w / h); y = (d @ u) / zc / th
	return (x + 1) / 2 * w, (1 - y) / 2 * h


# ---------------------------------------------------------------- the original Hawaii3DA keys (Hawaii.tsx A_KEYS, endVel 0.7)
A_ORIG = [
	{'t': 8.55, 'll': (19.575, -155.53), 'az': -25, 'el': 80, 'dist': 270, 'fov': 55},
	{'t': 9.8, 'll': (19.6, -155.45), 'az': -42, 'el': 70, 'dist': 128, 'fov': 50},
	{'t': 11.25, 'll': (19.69, -155.36), 'az': -72, 'el': 42, 'dist': 60, 'fov': 40, 'v': {'az': -3.2, 'el': -1.6, 'd': -0.07, 'tg': 0.15}},
	{'t': 12.7, 'll': (19.693, -155.348), 'az': -76.5, 'el': 39.6, 'dist': 53.5, 'fov': 40},
]
A_END = (0.7, 0.7)
# the toon shot keeps the original path EXACTLY until 9.8 s (the globe hop dissolves onto it at 8.55–8.95 s; GlobeHop samples
# Hawaii.tsx hawaiiACam), then continues C1 from the original tangent at 9.8 into its own, lower oblique view
_v98, TAN98 = hermite(A_ORIG, 9.8, A_END)


def a_keys():
	k1 = dict(A_ORIG[1]); k1['tan'] = list(TAN98)
	return [A_ORIG[0], k1,
	        {'t': 11.3, 'll': (19.618, -155.43), 'az': -64, 'el': 41, 'dist': 66, 'fov': 49, 'v': {'az': -3.0, 'el': -6.0, 'd': -0.13, 'tg': 0.4}},
	        {'t': 12.75, 'll': (19.62, -155.41), 'az': -70, 'el': 32, 'dist': 54, 'fov': 48}]


def cam_a(t):
	if t <= 9.8:
		o, _ = hermite(A_ORIG, t, A_END)
	else:
		ks = a_keys()[1:]
		o, _ = hermite(ks, t, (1.0, 0.7))
	return orbit3(o)


# ---------------------------------------------------------------- Hawaii3DB (17.07 – 21.33): down the flow to its stalled front, Hilo beyond
B_KEYS = [
	{'t': 17.07, 'll': (19.688, -155.375), 'az': -70, 'el': 36, 'dist': 26, 'fov': 42},
	{'t': 19.0, 'll': (19.694, -155.352), 'az': -74, 'el': 31, 'dist': 19.5, 'fov': 42},
	{'t': 21.33, 'll': (19.697, -155.345), 'az': -78, 'el': 29, 'dist': 18.0, 'fov': 42},
]


def cam_b(t):
	o, _ = hermite(B_KEYS, t, (0.7, 0.7))
	return orbit3(o)


PTS = {'summit': (19.4794, -155.6025), 'vent': (19.5795, -155.4955), 'front': (19.6944, -155.3492), 'hilo': (19.712, -155.078),
       'hilobay': (19.726, -155.0787), 'kea': (19.8207, -155.4681), 'pond': (19.6866, -155.4666)}

if __name__ == '__main__':
	shot = sys.argv[1] if len(sys.argv) > 1 else 'a'
	cam, t0, t1 = (cam_a, 8.55, 12.75) if shot == 'a' else (cam_b, 17.07, 21.33)
	t = t0
	while t <= t1 + 1e-6:
		pos, tg, fov = cam(t)
		row = ' '.join(f'{k}=({x:5.0f},{y:5.0f})' for k, ll in PTS.items() for x, y in [project3(pos, tg, fov, at3(*ll))])
		d = np.linalg.norm(pos - tg)
		hor = math.degrees(math.asin((pos[1] - tg[1]) / d))
		print(f't={t:5.2f} d={d:6.1f} el={hor:4.1f} fov={fov:4.1f} {row}')
		t += 0.25
