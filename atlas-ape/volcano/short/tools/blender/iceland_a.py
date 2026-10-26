"""Iceland A — Heimaey, 23 Jan 1973 (toon; NIGHT version of 19.10, owner: «the new version but in a night vibe, and the smoke must
not look like an organ»: a cartoon night — violet/indigo sky with stars and a big moon (camera-only world; the lighting the toon
bands are calibrated on is still the approved violet dusk), a dark saturated blue sea, moonlit teal-green land, warm yellow town
and boat lights, the lava/fountains as the brightest element, and a billowing cumulus eruption cloud that streams out of the
crater, widens into a lumpy head and leans with the wind).
Short timeline W(79) 40.53 → W(104)+0.45 55.16 s («But Iceland went full crazy. 1973. The ground rips open on an island of
5,300 people. Six hours — almost everyone's out. Then the lava turns toward the harbor.»).

Real data: ÍslandsDEM 2 m relief (public/terrain/heimaey, EXAG 1.35 as src/three/region.ts) + heimaey_wide (mainland on the
horizon). The island starts in its PRE-1973 state (data/blender/heimaey from tools/blender/heimaey_prep.py: no Eldfell, the new
land of the 1973 field is sea, the buried east town stands) and grows into today's relief where the real 1973 lava arrives
(lava.png R, animated prog as Iceland.tsx lavaA) — the lava builds new land into the sea; the Eldfell cone rises from the vent.
The 1.5 km fissure (lava.png B) tears open from the vent outward at «rips» with a curtain of particle fountains; the fleet (CC0
Kenney fishing boats) sails out of the harbour to the mainland at «Six hours». Camera: the first keys = Iceland.tsx KEYS_A
(GlobeHop dives onto them, the dissolve 40.53–40.93 stays seamless), then a lower oblique flight for clarity.

Everything is set per frame from Python (camera, relief, hulls, puffs, boats, shader values); only the fountain particles use
Blender's simulation, so the render loop steps through every frame.
  tools/blender/run.sh tools/blender/iceland_a.py -- [--frames 1,200,400] [--scale 50] [--samples 16] [--from N] [--to N]
     [--out out/blender/iceland_a] [--track] [--debug light]"""
import bpy, bmesh, json, math, sys, time
from pathlib import Path
import numpy as np
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
FRAMES = arg('frames')
SCALE = int(arg('scale', 100))
OUT = ROOT / arg('out', 'out/blender/iceland_a')
LW = float(arg('lw', 2.0))
DEBUG = arg('debug')
TRACK = '--track' in argv
FPS = 60
XF = 0.4
words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']
T0 = W(79)
T1 = W(104) + XF + 0.05
NF = int(math.ceil((T1 - T0) * FPS)) + 1
tof = lambda f: T0 + (f - 1) / FPS
RIP = W(84) - 0.05

def clamp01(x): return max(0.0, min(1.0, x))
def lerp(a, b, k): return a + (b - a) * k
def easeInOut(x):
	t = clamp01(x)
	return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2
def easeOut(x): return 1 - (1 - clamp01(x)) ** 3
def softStart(x, a=0.3):
	u = clamp01(x); v = 1 / (1 - a / 2)
	return v * u * u / (2 * a) if u < a else v * (u - a / 2)
def srgb(h):
	"""'#rrggbb' (display sRGB) → linear RGB for the emission shaders (Standard view transform re-encodes it exactly)"""
	c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
	return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
def smooth(x):
	x = clamp01(x); return x * x * (3 - 2 * x)

# ------------------------------------------------------------------ region (heimaey) — the same frame as src/three/region.ts
EXAG = 1.35
meta = json.load(open(ROOT / 'public/terrain/heimaey/meta.json'))
nx, ny = meta['nx'], meta['ny']
WK, HK = meta['width_m'] / 1000, meta['height_m'] / 1000
mx = meta['mercator']
def merc(lat, lon):
	x = (lon + 180) / 360
	y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2
	return x, y
def uvof(lat, lon):
	x, y = merc(lat, lon)
	return (x - mx['x0']) / (mx['x1'] - mx['x0']), (y - mx['y0']) / (mx['y1'] - mx['y0'])   # v from the top (north)
def xyof(lat, lon):
	u, v = uvof(lat, lon)
	return (u - 0.5) * WK, (0.5 - v) * HK
D = ROOT / 'data/blender/heimaey'
Hm = np.load(D / 'h_mod.npy').astype(np.float64)
Hp = np.load(D / 'h_pre.npy').astype(np.float64)
ARR = np.load(D / 'arr.npy').astype(np.float64)
CONE = np.load(D / 'cone.npy').astype(np.float64)
SEAZ = -0.012                                  # sea floor (well below the sea plane: no z-fight even from 100 km up)
SEA_Z = 0.002
infield = (np.abs(Hm - Hp) > 0.05) | (ARR < 0.995)
zmod = np.where(Hm > 0.3, Hm / 1000 * EXAG, SEAZ)
zpre = np.where(Hp > 0.3, Hp / 1000 * EXAG, SEAZ)
zmod[infield] = np.maximum(Hm[infield], -6) / 1000 * EXAG
zpre[infield] = np.maximum(Hp[infield], -6) / 1000 * EXAG
dzf = (zmod - zpre)
FI = np.nonzero(np.abs(dzf.ravel()) > 1e-7)[0]
dz_f = dzf.ravel()[FI]; zpre_f = zpre.ravel()[FI]; arr_f = ARR.ravel()[FI]; cone_f = CONE.ravel()[FI]
WFRONT = 0.012                                 # lava front ramp (arrival units ≈ 30 m)
ys_, xs_ = np.mgrid[0:ny, 0:nx]
VX = ((xs_ / (nx - 1) - 0.5) * WK).astype(np.float64)
VY = ((0.5 - ys_ / (ny - 1)) * HK).astype(np.float64)
SX = WK / (nx - 1); SY = HK / (ny - 1)

F73 = json.load(open(ROOT / 'data/flows.json'))['eldfell_1973']
CRATER_LL = F73['crater']
FIS_LL = F73['fissure']
VENT_U = 0.335
ARM = 1 - VENT_U
VENTS = [0.02, 0.12, 0.17, 0.23, 0.28, VENT_U, 0.37, 0.42, 0.47, 0.57, 0.61, 0.71, 0.77, 0.9, 0.95]

# ------------------------------------------------------------------ the story clock (ported from src/scenes/Iceland.tsx lavaA)
A_END = W(104) + XF + 0.1
def field_base(t):
	return lerp(-0.06, -0.01, easeInOut((t - W(85)) / 0.5)) + 0.51 * softStart((t - W(85) - 0.2) / (A_END - W(85) - 0.2), 0.12)
# «Then the lava turns toward the harbor» (51.76–54.27): from 51.6 the field advances faster (C1 Hermite continuation of
# field_base), so the harbour-lobe front visibly pushes ~500 m north toward the harbour channel during the phrase
# (arrival along flows.json harbor_lobe: s 1.05 km ↔ 0.31 … s 1.55 km ↔ 0.50; 0.514 = the channel's south shore) and then
# slows down just short of it
_FB_T = 51.6
_FB_D = (field_base(_FB_T + 1e-3) - field_base(_FB_T - 1e-3)) / 2e-3
_FPTS = [(_FB_T, field_base(_FB_T), _FB_D), (53.1, 0.415, 0.068), (54.5, 0.503, 0.03), (55.4, 0.516, 0.01)]
def field_of(t):
	if t <= _FB_T: return field_base(t)
	for (ta, va, ma), (tb, vb, mb) in zip(_FPTS[:-1], _FPTS[1:]):
		if t <= tb:
			h = tb - ta; s = (t - ta) / h
			return (2 * s ** 3 - 3 * s ** 2 + 1) * va + (s ** 3 - 2 * s ** 2 + s) * h * ma + (-2 * s ** 3 + 3 * s ** 2) * vb + (s ** 3 - s ** 2) * h * mb
	return _FPTS[-1][1] + _FPTS[-1][2] * (t - _FPTS[-1][0])
def lava_state(t):
	open_ = easeInOut((t - RIP + 0.05) / 0.9)
	close = easeInOut((t - W(88) - 0.1) / 1.8)
	fis = -0.06 + (0.95 + 0.06) * open_ - 0.4 * close
	coolF = lerp(0.2, 0.42, easeInOut((t - RIP - 0.25) / 1.0)) + 0.58 * easeInOut((t - W(88) - 0.1) / 1.6)
	return field_of(t), fis, coolF, open_
def blue_k(t):
	"""1 inside the GlobeHop dissolve (the globe's day-ocean blue, dim land) → 0 = the violet dusk look (Iceland.tsx blueA)"""
	return 1 - easeInOut((t - W(79) - 0.1) / 1.3)
def chan_k(t):
	"""harbour-lobe channel heat: a warm (red) river until the voice turns to it, then it swells to hot orange melt"""
	return lerp(0.5, 1.0, easeInOut((t - W(97) + 0.35) / 1.0))
def cone_grow(t):
	"""Eldfell rises from the vent: soft start once the tear reaches it, most of the growth in the first seconds"""
	x = softStart((t - W(85) - 0.1) / (W(99) - W(85) - 0.1), 0.15)
	return 1 - (1 - x) ** 2
def contract(t):
	"""the fountain curtain contracts onto the Eldfell vent once the voice moves on to the people (Iceland.tsx c)"""
	return 0.85 * easeInOut((t - W(89) - 0.1) / 2.0)
def tip_of(t):
	return clamp01((lava_state(t)[1] + 0.02) / 0.44)

def zgrid_at(t):
	prog = lava_state(t)[0]
	S = cone_f * cone_grow(t) + (1 - cone_f) * np.clip((prog - arr_f) / WFRONT, 0, 1) ** 1.0
	S = S * S * (3 - 2 * S)
	z = zpre.ravel().copy()
	z[FI] = zpre_f + dz_f * S
	return z.reshape(ny, nx)
def z_point(t, x, y):
	"""terrain height at (x, y) at time t (same rule as zgrid_at, on the 4 surrounding cells only)"""
	prog = lava_state(t)[0]; gc = cone_grow(t)
	u = x / WK + 0.5; v = 0.5 - y / HK
	fx = min(nx - 1.001, max(0, u * (nx - 1))); fy = min(ny - 1.001, max(0, v * (ny - 1)))
	i, j = int(fx), int(fy); a, b = fx - i, fy - j
	def zc(jj, ii):
		S = CONE[jj, ii] * gc + (1 - CONE[jj, ii]) * min(1.0, max(0.0, (prog - ARR[jj, ii]) / WFRONT))
		S = S * S * (3 - 2 * S)
		return zpre[jj, ii] + dzf[jj, ii] * S
	return float(zc(j, i) * (1 - a) * (1 - b) + zc(j, i + 1) * a * (1 - b) + zc(j + 1, i) * (1 - a) * b + zc(j + 1, i + 1) * a * b)
def hat_grid(Z, x, y):
	u = x / WK + 0.5; v = 0.5 - y / HK
	fx = min(nx - 1.001, max(0, u * (nx - 1))); fy = min(ny - 1.001, max(0, v * (ny - 1)))
	i, j = int(fx), int(fy); a, b = fx - i, fy - j
	return float(Z[j, i] * (1 - a) * (1 - b) + Z[j, i + 1] * a * (1 - b) + Z[j + 1, i] * (1 - a) * b + Z[j + 1, i + 1] * a * b)

# ------------------------------------------------------------------ camera (Iceland.tsx pathOrbit / KEYS_A port; three frame x east, y up, z south)
def sgn(x): return (x > 0) - (x < 0)
def tangents(T, V):
	n = len(T); h = [T[i + 1] - T[i] for i in range(n - 1)]; d = [(V[i + 1] - V[i]) / h[i] for i in range(n - 1)]
	m = [0.0] * n
	for k in range(1, n - 1):
		if d[k - 1] * d[k] <= 0: continue
		m[k] = 3 * (h[k - 1] + h[k]) / ((2 * h[k] + h[k - 1]) / d[k - 1] + (h[k] + 2 * h[k - 1]) / d[k])
	def end(h0, h1v, d0, d1):
		e = ((2 * h0 + h1v) * d0 - h0 * d1) / (h0 + h1v)
		if sgn(e) != sgn(d0): e = 0.0
		elif sgn(d0) != sgn(d1) and abs(e) > abs(3 * d0): e = 3 * d0
		return e
	if n == 2: m[0] = m[1] = d[0]
	else:
		m[0] = end(h[0], h[1], d[0], d[1]); m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3])
	return m
g = lambda x, z, y=0.05: (x, y, z)
KEYS = [
	# = Iceland.tsx KEYS_A[0..2] (GlobeHop lands on these; the path inside the dissolve 40.53–40.93 depends only on them)
	(W(79), dict(target=g(0.25, 0.0), az=0, el=88, dist=100, fov=40)),
	(41.75, dict(target=g(0.15, -0.6), az=6, el=76, dist=12, fov=40)),
	(42.9, dict(target=g(0.4, -0.35), az=16, el=64, dist=6.8, fov=41)),
	# then one continuous descending flight from the south (fix round 18.10 evening: clarity + the approved violet-sky look):
	# the fissure tears open diagonally across the frame (44.4–45.3) while the camera sinks and widens (Etna-like wide lens);
	# by «5,300 people» the town (left), Eldfell + the cloud (right), the harbour, the strait, the mainland coast and the
	# violet dusk sky stack up the frame; the fleet sails out of the harbour toward that coast; then a slow push-in onto the
	# harbour lobe, whose glowing tongue advances up the frame toward the harbour mouth
	(W(84) - 0.1, dict(target=g(0.5, -0.35), az=10, el=47, dist=4.9, fov=47)),
	# (night fix round 19.10: the camera sinks ~3° lower and pitches up 0.5–2° (`tilt`), so the night sky with the moon fills the top
	# ~22 % of the frame from ~48 s (horizon y ≈ 400–440) while the crater, the harbour and the fleet keep their screen places)
	(45.95, dict(target=g(0.3, -0.9), az=4, el=33, dist=5.0, fov=55, tilt=0.5)),
	(47.6, dict(target=g(0.3, -1.5), az=0, el=22.5, dist=5.4, fov=62, tilt=0.8)),
	(49.6, dict(target=g(0.45, -2.0), az=-3, el=20, dist=5.6, fov=64, tilt=1.4)),
	(51.6, dict(target=g(0.6, -2.0), az=-5, el=20.5, dist=5.0, fov=64, tilt=1.6)),
	# (fix round 18.10 night: the old push-in to 3.6 km lost the cloud off the right edge, the basin off the left edge and left
	# the top 45 % empty; now a gentler push to 4.4 km keeps the whole harbour basin, the cone with its cloud above the strait,
	# the fanning fleet and the night sky in frame)
	(W(104) + XF + 0.05, dict(target=g(0.45, -1.75), az=-5, el=23, dist=4.4, fov=62, tilt=2.2)),
]
if arg('keys'):
	KEYS = KEYS[:3] + [(k[0], dict(target=g(k[1], k[2]), az=k[3], el=k[4], dist=k[5], fov=k[6], tilt=(k[7] if len(k) > 7 else 0.0))) for k in json.loads(arg('keys'))]
# 8th channel `tilt` (deg, default 0): the view is pitched UP by it about the camera's right axis after aiming at the target
# (night fix round 19.10: the night sky with its moon and stars must fill the top of the frame, while the island keeps its place)
def chans(o): return [o['target'][0], o['target'][1], o['target'][2], o['az'], o['el'], math.log(o['dist']), o['fov'], o.get('tilt', 0.0)]
_KT = [k[0] for k in KEYS]; _KC = [chans(k[1]) for k in KEYS]
_KM = [tangents(_KT, [c[ch] for c in _KC]) for ch in range(8)]
def path_orbit(t):
	T = _KT; n = len(T)
	tc = max(T[0], min(T[n - 1], t))
	i = 0
	while i < n - 2 and tc > T[i + 1]: i += 1
	hh = T[i + 1] - T[i]; s = (tc - T[i]) / hh
	h00 = 2 * s ** 3 - 3 * s ** 2 + 1; h10 = s ** 3 - 2 * s ** 2 + s; h01 = -2 * s ** 3 + 3 * s ** 2; h11 = s ** 3 - s ** 2
	v = [h00 * _KC[i][c] + h10 * hh * _KM[c][i] + h01 * _KC[i + 1][c] + h11 * hh * _KM[c][i + 1] for c in range(8)]
	return dict(target=(v[0], v[1], v[2]), az=v[3], el=v[4], dist=math.exp(v[5]), fov=v[6], tilt=v[7])
def cam_at(t):
	o = path_orbit(t)
	az, el = math.radians(o['az']), math.radians(o['el'])
	tx, ty, tz = o['target']
	p3 = (tx + o['dist'] * math.cos(el) * math.sin(az), ty + o['dist'] * math.sin(el), tz + o['dist'] * math.cos(el) * math.cos(az))
	B = lambda p: Vector((p[0], -p[2], p[1]))                 # three (x, y, z_south) → blender (x, y_north, z_up)
	pos, tgt = B(p3), B(o['target'])
	f = (tgt - pos).normalized(); r = f.cross(Vector((0, 0, 1))).normalized(); u = r.cross(f)
	if abs(o['tilt']) > 1e-6:
		ct, st = math.cos(math.radians(o['tilt'])), math.sin(math.radians(o['tilt']))
		f, u = (f * ct + u * st).normalized(), (u * ct - f * st).normalized()
	return pos, f, r, u, o['fov']
def project(cam, p):
	pos, f, r, u, fov = cam
	d = Vector(p) - pos
	zc = d.dot(f)
	th = math.tan(math.radians(fov) / 2)
	return ((d.dot(r) / (zc * th * 1080 / 1920) + 1) / 2 * 1080, (1 - d.dot(u) / (zc * th)) / 2 * 1920, zc > 0)

# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.resolution_percentage = SCALE
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, NF
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGB'
sc.render.film_transparent = False
sc.render.filter_size = 1.0
try:
	sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
except Exception as e:
	print('view transform', e)
sc.eevee.taa_render_samples = int(arg('samples', 16))
sc.eevee.use_shadows = True
GRAV = 0.5
sc.gravity = (0, 0, -GRAV)

def node(nt, kind, loc=(0, 0), **kw):
	n = nt.nodes.new(kind); n.location = loc
	for k, v in kw.items(): setattr(n, k, v)
	return n
link = lambda nt, a, b: nt.links.new(a, b)
def put(nt, sock, x):
	if x is None: return
	if isinstance(x, (int, float)): sock.default_value = x
	elif isinstance(x, (tuple, list)): sock.default_value = tuple(x) if len(x) == len(sock.default_value) else (*x, 1)
	else: nt.links.new(x, sock)
def M(nt, op, a, b=None, c=None, clamp=False):
	n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
	for k, x in enumerate((a, b, c)): put(nt, n.inputs[k], x)
	return n.outputs[0]
def MIX(nt, fac, c1, c2, blend='MIX'):
	n = nt.nodes.new('ShaderNodeMixRGB'); n.blend_type = blend
	put(nt, n.inputs['Fac'], fac); put(nt, n.inputs['Color1'], c1); put(nt, n.inputs['Color2'], c2)
	return n.outputs['Color']
def RAMP(nt, fac, stops, interp='CONSTANT'):
	n = nt.nodes.new('ShaderNodeValToRGB'); r = n.color_ramp; r.interpolation = interp
	el = r.elements
	el[0].position, el[0].color = stops[0][0], (*stops[0][1], 1)
	el[1].position, el[1].color = stops[-1][0], (*stops[-1][1], 1)
	for p_, c_ in stops[1:-1]:
		e_ = el.new(p_); e_.color = (*c_, 1)
	put(nt, n.inputs['Fac'], fac)
	return n.outputs['Color']
def SEP(nt, v):
	n = nt.nodes.new('ShaderNodeSeparateXYZ'); put(nt, n.inputs[0], v); return n.outputs
def COMB(nt, x, y, z):
	n = nt.nodes.new('ShaderNodeCombineXYZ'); put(nt, n.inputs[0], x); put(nt, n.inputs[1], y); put(nt, n.inputs[2], z); return n.outputs[0]
def VM(nt, op, a, b=None, scale=None):
	n = nt.nodes.new('ShaderNodeVectorMath'); n.operation = op
	put(nt, n.inputs[0], a); put(nt, n.inputs[1], b)
	if scale is not None: put(nt, n.inputs['Scale'], scale)
	return n.outputs['Value'] if op in ('LENGTH', 'DISTANCE', 'DOT_PRODUCT') else n.outputs['Vector']
def EMIT(nt, col, out_node):
	e_ = nt.nodes.new('ShaderNodeEmission'); put(nt, e_.inputs['Color'], col); e_.inputs['Strength'].default_value = 1.0
	link(nt, e_.outputs[0], out_node.inputs['Surface'])
	return e_
def VAL(nt, label, v=0.0):
	n = nt.nodes.new('ShaderNodeValue'); n.label = label; n.outputs[0].default_value = v
	return n
def IMG(nt, path, uvsock, interp='Linear', ext='EXTEND'):
	n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(str(path), check_existing=True)
	n.image.colorspace_settings.name = 'Non-Color'; n.interpolation = interp; n.extension = ext
	link(nt, uvsock, n.inputs['Vector'])
	return n
# per-frame shader values: name → list of sockets
LIVE = {}
def live(name, sock):
	LIVE.setdefault(name, []).append(sock)
def set_live(name, v):
	for s_ in LIVE.get(name, []):
		s_.default_value = v

# toon bands: thresholds on the Shader-to-RGB luminance of a white diffuse surface under the moon (calibrated with --debug light)
B1, B2 = float(arg('b1', 0.60)), float(arg('b2', 1.0))           # (etna_toon / heimaey_toon: sun 4.0 + dusk sky)
# NIGHT look (owner 19.10: «the new version but in a night vibe»; the eruption began at night): moonlit light bands (shadow / mid /
# lit, linear) — violet shadows, a cool lilac middle band, near-white lit faces. Flat ground falls in the MIDDLE band under this key
# light (measured on the decal), so the colours below (PAL, wide ramp) are set as the display colour they get on FLAT ground
# (nlit = h / middle band): the land stays bright and colourful (not a dull dark map), slopes toward the light are ~45 % brighter;
# the lighting itself (the dusk world + key light the bands are calibrated on) is unchanged — the night sky is camera-only
NIGHT_BAND = (srgb('#7a72c8'), srgb('#c2c8f4'), srgb('#e6ecff'))
def nlit(h):
	"""base colour (linear) that shows the display colour `h` on flat ground (h / middle band)"""
	c = srgb(h)
	return tuple(x / y for x, y in zip(c, NIGHT_BAND[1]))
def toon(nt, shadow, mid, lit, normal=None):
	d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (1, 1, 1, 1)
	put(nt, d.inputs['Normal'], normal)
	s2r = nt.nodes.new('ShaderNodeShaderToRGB'); link(nt, d.outputs[0], s2r.inputs[0])
	bw = nt.nodes.new('ShaderNodeRGBToBW'); link(nt, s2r.outputs['Color'], bw.inputs[0])
	if DEBUG == 'light':
		return bw.outputs[0], bw.outputs[0]
	return RAMP(nt, bw.outputs[0], [(0.0, shadow), (B1, mid), (B2, lit)]), bw.outputs[0]
def toon_d(nt, normal=None):
	"""the moonlit night bands (the land is in its night colours from frame 1 on; only the sea turns from the globe's ocean blue
	into the night sea with `bluek`, so the GlobeHop dissolve onto the toon decal of frame 1 stays seamless)"""
	return toon(nt, *NIGHT_BAND, normal=normal)

# camera-dependent pixel size in the shaders: metres per pixel = |p − cam| (km) · PXM
def px_metres(nt, posv):
	camv = COMB(nt, 0, 0, 0)
	cn = camv.node
	live('camx', cn.inputs[0]); live('camy', cn.inputs[1]); live('camz', cn.inputs[2])
	pxm = VAL(nt, 'pxm', 1.0); live('pxm', pxm.outputs[0])
	return M(nt, 'MULTIPLY', VM(nt, 'DISTANCE', posv, camv), pxm.outputs[0])

# the toon sea of shots B/C (heimaey_toon Scene.SEA, linear): deep / mid / shallow / foam (fix round 18.10 night: the violet-blue
# #3456ae sea read as a dark navy map next to B/C's #2f8ec6)
# night: a dark but saturated blue sea, cyan-blue shallows, moonlit pale-blue surf (fix round 19.10)
SEA_DEEP, SEA_MID, SEA_SHAL, SEA_FOAM = srgb('#123a9a'), srgb('#1a4cb2'), srgb('#2a72c6'), srgb('#9cc6ff')
# the globe dive ends on its bright day ocean (GlobeHop ICELAND, ≈ #0e64ad with a faintly lighter coast): the sea starts in
# exactly that blue and turns into the dusk sea with blue_k (no brightness drop through the dissolve)
SEA0_DEEP, SEA0_MID, SEA0_FOAM = srgb('#0e64ad'), srgb('#1470b6'), srgb('#3c88c8')
def sea_bands(nt, coast_m, pxm_):
	"""crisp shallow-water bands along the coast (B/C colours), never thinner than ~2.5 / 6 / 14 px (no shimmer from far away)"""
	wf = M(nt, 'MAXIMUM', 6.0, M(nt, 'MULTIPLY', pxm_, 2.6))
	ws = M(nt, 'MAXIMUM', 26.0, M(nt, 'MULTIPLY', pxm_, 6.0))
	wm = M(nt, 'MAXIMUM', 85.0, M(nt, 'MULTIPLY', pxm_, 14.0))
	bk = VAL(nt, 'bluek', 1.0); live('bluek', bk.outputs[0])
	deep = MIX(nt, bk.outputs[0], SEA_DEEP, SEA0_DEEP); mid = MIX(nt, bk.outputs[0], SEA_MID, SEA0_MID)
	shal = MIX(nt, bk.outputs[0], SEA_SHAL, SEA0_MID); foam = MIX(nt, bk.outputs[0], SEA_FOAM, SEA0_FOAM)
	c = MIX(nt, M(nt, 'LESS_THAN', coast_m, wm), deep, mid)
	c = MIX(nt, M(nt, 'LESS_THAN', coast_m, ws), c, shal)
	return MIX(nt, M(nt, 'LESS_THAN', coast_m, wf), c, foam)

# eruption light (crisp wobbly rings around the active part of the fissure) — shared by terrain and sea
FA = Vector((*xyof(*FIS_LL[0]), 0)); FB = Vector((*xyof(*FIS_LL[1]), 0))
CRX = Vector((*xyof(*CRATER_LL), 0))
BOWL = CRX + Vector((-0.031, 0.061, 0))      # floor of today's Eldfell crater (DEM minimum next to the flows.json crater point)
def seg_dist(nt, posv):
	p = SEP(nt, posv); pxy = COMB(nt, p['X'], p['Y'], 0)
	a = COMB(nt, 0, 0, 0); b = COMB(nt, 0, 0, 0)
	live('sa_x', a.node.inputs[0]); live('sa_y', a.node.inputs[1]); live('sb_x', b.node.inputs[0]); live('sb_y', b.node.inputs[1])
	ab = VM(nt, 'SUBTRACT', b, a); ap = VM(nt, 'SUBTRACT', pxy, a)
	k = M(nt, 'DIVIDE', VM(nt, 'DOT_PRODUCT', ap, ab), M(nt, 'ADD', VM(nt, 'DOT_PRODUCT', ab, ab), 1e-6), clamp=True)
	cl = VM(nt, 'ADD', a, VM(nt, 'SCALE', ab, scale=k))
	return VM(nt, 'DISTANCE', pxy, cl)
def wobble(nt, tc, scale, amp, d):
	n = node(nt, 'ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 1.0
	link(nt, tc, n.inputs['Vector'])
	return M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', n.outputs['Fac'], 0.5), amp, d)

# ------------------------------------------------------------------ meshes
def grid_mesh(name, vco, fcs, uvs=None):
	me_ = bpy.data.meshes.new(name)
	me_.vertices.add(len(vco)); me_.vertices.foreach_set('co', vco.ravel())
	me_.loops.add(fcs.size); me_.loops.foreach_set('vertex_index', fcs.ravel().astype(np.int32))
	me_.polygons.add(len(fcs)); me_.polygons.foreach_set('loop_start', np.arange(0, fcs.size, 4, dtype=np.int32)); me_.polygons.foreach_set('loop_total', np.full(len(fcs), 4, np.int32))
	me_.update(); me_.validate()
	if uvs is not None:
		uvl_ = me_.uv_layers.new(name='UVMap')
		uvl_.data.foreach_set('uv', uvs[fcs.ravel()].ravel().astype(np.float32))
	me_.polygons.foreach_set('use_smooth', np.ones(len(fcs), bool))
	return me_
def grid_faces(gx, gy):
	q = np.arange(gx * gy).reshape(gy, gx)
	return np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], -1).reshape(-1, 4)
FACES = grid_faces(nx, ny)
UVS = np.stack([(xs_ / (nx - 1)).ravel(), (1 - ys_ / (ny - 1)).ravel()], -1)
Z0 = zgrid_at(T0)
me = grid_mesh('heimaey', np.stack([VX, VY, Z0], -1).reshape(-1, 3).astype(np.float32), FACES, UVS)
a_ = me.attributes.new('cone', 'FLOAT', 'POINT'); a_.data.foreach_set('value', CONE.ravel().astype(np.float32))
terr = bpy.data.objects.new('heimaey', me); sc.collection.objects.link(terr)

# heimaey_wide (mainland, other islands) in the heimaey frame (linear in Web-Mercator, like the three.js wide grid)
mw = json.load(open(ROOT / 'public/terrain/heimaey_wide/meta.json'))
nxw, nyw = mw['nx'], mw['ny']; mww = mw['mercator']
Hw = np.fromfile(ROOT / 'public/terrain/heimaey_wide/height.bin', np.float32).reshape(nyw, nxw).astype(np.float64)
ysw, xsw = np.mgrid[0:nyw, 0:nxw]
MXw = mww['x0'] + xsw / (nxw - 1) * (mww['x1'] - mww['x0']); MYw = mww['y0'] + ysw / (nyw - 1) * (mww['y1'] - mww['y0'])
WX = ((MXw - mx['x0']) / (mx['x1'] - mx['x0']) - 0.5) * WK
WY = -((MYw - mx['y0']) / (mx['y1'] - mx['y0']) - 0.5) * HK
WZ = np.where(Hw > 1.0, Hw / 1000 * EXAG, SEAZ)
# lift every vertex within ~1.5 cells of the smooth 4× land mask just above the sea plane, so the mesh covers all of that land
# and the shader draws the coastline from the mask (not from the 100 m grid)
_wl = bpy.data.images.load(str(D / 'wide_land.png'), check_existing=True); _wl.colorspace_settings.name = 'Non-Color'
_lf = np.empty(_wl.size[0] * _wl.size[1] * _wl.channels, np.float32); _wl.pixels.foreach_get(_lf)
_lf = _lf.reshape(_wl.size[1], _wl.size[0], _wl.channels)[::-1, :, 0]          # north-up
_lc = np.zeros((nyw, nxw), bool)
_jj = np.clip(np.round(np.arange(nyw) * (_lf.shape[0] - 1) / (nyw - 1)).astype(int), 0, _lf.shape[0] - 1)
_ii = np.clip(np.round(np.arange(nxw) * (_lf.shape[1] - 1) / (nxw - 1)).astype(int), 0, _lf.shape[1] - 1)
for _dj in range(-6, 7, 2):
	for _di in range(-6, 7, 2):
		_lc |= _lf[np.clip(_jj + _dj, 0, _lf.shape[0] - 1)][:, np.clip(_ii + _di, 0, _lf.shape[1] - 1)] > 0.2
# (and the mesh is land ONLY there: e.g. the 70 m DEM's Stórhöfði south of the heimaey box, which heimaey_prep drops from the
# mask, sinks — no flat-topped islet cut by the box edge)
WZ = np.where(_lc, np.maximum(WZ, SEA_Z + 0.0008), SEAZ)
inner = (np.abs(WX) < WK / 2 - 0.05) & (np.abs(WY) < HK / 2 - 0.05)
WZ[inner] = -0.04
FACESW = grid_faces(nxw, nyw)
UVSW = np.stack([(xsw / (nxw - 1)).ravel(), (1 - ysw / (nyw - 1)).ravel()], -1)
mew = grid_mesh('wide', np.stack([WX, WY, WZ], -1).reshape(-1, 3).astype(np.float32), FACESW, UVSW)
wide = bpy.data.objects.new('wide', mew); sc.collection.objects.link(wide)

# ------------------------------------------------------------------ heimaey terrain + lava material (toon, night)
mat = bpy.data.materials.new('heimaey'); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (1800, 0))
uv = node(nt, 'ShaderNodeUVMap', (-1800, 200), uv_map='UVMap')
tc = node(nt, 'ShaderNodeTexCoord', (-1800, -200))
geo = node(nt, 'ShaderNodeNewGeometry', (-1800, -500))
pos = SEP(nt, geo.outputs['Position']); nrm = SEP(nt, geo.outputs['Normal'])
zs = node(nt, 'ShaderNodeSeparateColor'); link(nt, IMG(nt, D / 'zones.png', uv.outputs['UV']).outputs['Color'], zs.inputs['Color'])
landp = IMG(nt, D / 'land_pre.png', uv.outputs['UV']).outputs['Color']
coastm = M(nt, 'MULTIPLY', IMG(nt, D / 'coast.png', uv.outputs['UV']).outputs['Color'], 6553.5)
pxm_t = px_metres(nt, geo.outputs['Position'])
cone_at = node(nt, 'ShaderNodeAttribute', attribute_name='cone').outputs['Fac']
alt_m = M(nt, 'DIVIDE', M(nt, 'MULTIPLY', pos['Z'], 1000.0), EXAG)
PAL = {
	# ≈ heimaey_toon Scene.PAL (shots B/C, linear): saturated yellow-greens, terracotta cliffs, a warm cream town ground (a touch
	# warmer than B/C's, which turns lilac-grey under the bands at this distance) (fix round 18.10 night: A's cooler greens + lilac
	# town ground under the violet bands were dull next to B/C); the old red cinder patches
	# (Helgafell etc.) are a muted brown so they never read as lava on the pre-1973 island
	# night (19.10): moonlit teal-greens, lilac town ground, violet-brown cliffs (display colours on a lit face)
	'grass': nlit('#2e9476'), 'grass2': nlit('#3ea27c'), 'high': nlit('#27846e'), 'bare': nlit('#529672'),
	'built': nlit('#8682b0'), 'cinder': nlit('#664870'), 'cliff': nlit('#86669a'), 'cliff2': nlit('#584680'),
	'cone': nlit('#a04c4e'),
}
pat = node(nt, 'ShaderNodeTexNoise'); pat.inputs['Scale'].default_value = 3.2; pat.inputs['Detail'].default_value = 1.2
link(nt, tc.outputs['Object'], pat.inputs['Vector'])
base = MIX(nt, M(nt, 'GREATER_THAN', pat.outputs['Fac'], 0.56), PAL['grass'], PAL['grass2'])
base = MIX(nt, M(nt, 'GREATER_THAN', alt_m, 125.0), base, PAL['high'])
base = MIX(nt, M(nt, 'LESS_THAN', zs.outputs['Red'], 0.42), base, PAL['bare'])
base = MIX(nt, M(nt, 'GREATER_THAN', zs.outputs['Green'], 0.5), base, PAL['built'])
base = MIX(nt, M(nt, 'GREATER_THAN', zs.outputs['Blue'], 0.5), base, PAL['cinder'])
base = MIX(nt, M(nt, 'LESS_THAN', nrm['Z'], 0.62), base, PAL['cliff'])
base = MIX(nt, M(nt, 'LESS_THAN', nrm['Z'], 0.36), base, PAL['cliff2'])
# the growing Eldfell: cinder spreads from the vent outward as the cone rises (no colour pop at its foot)
gcone = VAL(nt, 'gcone'); live('gcone', gcone.outputs[0])
crd0 = VM(nt, 'DISTANCE', COMB(nt, pos['X'], pos['Y'], 0), (CRX.x, CRX.y, 0))
# (radius 0 at gcone 0: no cinder disc on the vent before the cone exists; the wobble is scaled with the radius)
coneR = M(nt, 'MULTIPLY', gcone.outputs[0], 0.32)
coneF = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wobble(nt, tc.outputs['Object'], 9.0, 0.05, crd0), crd0), M(nt, 'MINIMUM', M(nt, 'MULTIPLY', gcone.outputs[0], 6.0), 1.0), crd0), coneR),
          M(nt, 'GREATER_THAN', cone_at, 0.02))
base = MIX(nt, coneF, base, PAL['cone'])
band, lum = toon_d(nt)
shaded = MIX(nt, 1.0, base, band, 'MULTIPLY')
# sea on the flat cells the 2 m coast mask calls water (crisp coastline finer than the 7.8 m grid)
seaF = M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', landp, 0.5), M(nt, 'GREATER_THAN', nrm['Z'], 0.8)), M(nt, 'LESS_THAN', pos['Z'], 0.008))
shaded = MIX(nt, seaF, shaded, sea_bands(nt, coastm, pxm_t))
# (fix round 18.10 night: the semi-transparent «eruption light» rings round the fissure read as muddy brown/peach discs — removed;
# the toon look stays crisp: the glow comes only from the lava, the fountains and post.py's bloom on hot colours)
# --- lava field (real 1973 arrival map R; distance-to-margin map) — toon classes as etna_toon
lavt = IMG(nt, ROOT / 'public/terrain/heimaey/lava.png', uv.outputs['UV'])
sepl = node(nt, 'ShaderNodeSeparateColor'); link(nt, lavt.outputs['Color'], sepl.inputs['Color'])
arrt = IMG(nt, D / 'arr_eff.png', uv.outputs['UV'])
edge = IMG(nt, ROOT / 'public/terrain/heimaey/lava_edge.png', uv.outputs['UV']).outputs['Color']
prog = VAL(nt, 'prog'); live('prog', prog.outputs[0])
phase = VAL(nt, 'phase'); live('phase', phase.outputs[0])
arr = M(nt, 'MULTIPLY', arrt.outputs['Color'], 1.0)
onm = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', arr, prog.outputs[0]), M(nt, 'LESS_THAN', arr, 0.99))
age = M(nt, 'SUBTRACT', prog.outputs[0], arr)
wn = node(nt, 'ShaderNodeTexNoise'); wn.inputs['Scale'].default_value = 18
link(nt, tc.outputs['Object'], wn.inputs['Vector'])
wmix = node(nt, 'ShaderNodeVectorMath', operation='MULTIPLY_ADD'); link(nt, wn.outputs['Color'], wmix.inputs[0]); wmix.inputs[1].default_value = (0.02, 0.02, 0.02); link(nt, tc.outputs['Object'], wmix.inputs[2])
vor = node(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE'); vor.inputs['Scale'].default_value = float(arg('plates', 18))
link(nt, wmix.outputs[0], vor.inputs['Vector'])
hfront = M(nt, 'SUBTRACT', 1.0, M(nt, 'DIVIDE', age, 0.08), clamp=True)
# the harbour lobe is fed by a glowing channel along its real path (flows.json harbor_lobe, like iceland_b's `chan`): a warm
# red river that swells to a hot orange tongue when the voice turns to it (live chank); it only shows where the lava has
# arrived, so the bright tongue visibly advances north with the front (smooth field + fixed thresholds: no flicker)
def _seg_dist_np(X, Y, pts):
	d = np.full(X.shape, 1e9)
	for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
		dx, dy = bx - ax, by - ay
		k = np.clip(((X - ax) * dx + (Y - ay) * dy) / max(1e-12, dx * dx + dy * dy), 0, 1)
		d = np.minimum(d, np.hypot(X - ax - k * dx, Y - ay - k * dy))
	return d
_lobe_xy = [xyof(*p) for p in F73['paths']['harbor_lobe']]
# peaked at the centre line (never flat), so when chank swells the hot class widens outward from the axis frame by frame
# instead of a flat core flipping colour in one frame
CHAN = np.clip(1 - _seg_dist_np(VX, VY, _lobe_xy) / 0.17, 0, 1) ** 0.6
_ci = np.ones((ny, nx, 4), np.float32); _ci[..., :3] = CHAN[..., None]
chan_img = bpy.data.images.new('chanA', nx, ny, alpha=True, float_buffer=True); chan_img.colorspace_settings.name = 'Non-Color'
chan_img.pixels.foreach_set(np.ascontiguousarray(_ci[::-1]).ravel())
chant = node(nt, 'ShaderNodeTexImage'); chant.image = chan_img; chant.interpolation = 'Linear'; chant.extension = 'EXTEND'
link(nt, uv.outputs['UV'], chant.inputs['Vector'])
chank = VAL(nt, 'chank', 0.5); live('chank', chank.outputs[0])
hcore = M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', chant.outputs['Color'], 0.92), chank.outputs[0])
heat = M(nt, 'MAXIMUM', hfront, hcore)
seam = M(nt, 'LESS_THAN', vor.outputs['Distance'], 0.085)
# (fix round 18.10 night: the moving 1–2 px ripple arcs on the hot melt shimmered) the warm/hot melt now shows its crust-plate
# seams instead: static, wide (≥ 4 px at this distance) bright seams that move only with the advancing field
arcs = M(nt, 'LESS_THAN', vor.outputs['Distance'], float(arg('hseam', 0.17)))
warmZ = M(nt, 'GREATER_THAN', heat, 0.3); hotZ = M(nt, 'GREATER_THAN', heat, 0.62)
young = M(nt, 'LESS_THAN', wobble(nt, tc.outputs['Object'], 7.0, 0.09, age), 0.2)                                   # young crust: bright seams; old crust: dull seams
h_ = M(nt, 'MULTIPLY', seam, M(nt, 'MULTIPLY_ADD', young, 0.12, 0.24))
h_ = M(nt, 'ADD', M(nt, 'MULTIPLY', h_, M(nt, 'SUBTRACT', 1.0, warmZ)), M(nt, 'MULTIPLY', warmZ, M(nt, 'MULTIPLY_ADD', arcs, 0.22, 0.5)))
h_ = M(nt, 'ADD', M(nt, 'MULTIPLY', h_, M(nt, 'SUBTRACT', 1.0, hotZ)), M(nt, 'MULTIPLY', hotZ, M(nt, 'MULTIPLY_ADD', arcs, 0.15, 0.72)))
h_ = M(nt, 'MAXIMUM', h_, M(nt, 'LESS_THAN', age, 0.008))
lcol = RAMP(nt, h_, [(0.0, (0.0, 0.0, 0.0)), (0.2, srgb('#7a1a14')), (0.3, (0.55, 0.025, 0.01)), (0.45, (0.88, 0.06, 0.01)), (0.65, (1.0, 0.26, 0.01)),
                     (0.82, (1.0, 0.58, 0.04)), (0.95, (1.0, 0.92, 0.45))])
crust = MIX(nt, 1.0, (0.12, 0.055, 0.085), band, 'MULTIPLY')                    # = heimaey_toon lava crust (B/C)
lava_c = MIX(nt, M(nt, 'GREATER_THAN', h_, 0.15), crust, lcol)
# on the growing cone the surface is cinder with a glowing crater top, not flowing lava
crd = VM(nt, 'DISTANCE', COMB(nt, pos['X'], pos['Y'], 0), (BOWL.x, BOWL.y, 0))
crat = M(nt, 'LESS_THAN', wobble(nt, tc.outputs['Object'], 14.0, 0.012, crd), M(nt, 'MULTIPLY_ADD', gcone.outputs[0], 0.03, 0.035))
lava_c = MIX(nt, M(nt, 'MULTIPLY', coneF, M(nt, 'GREATER_THAN', cone_at, 0.45)), lava_c, shaded)
final = MIX(nt, onm, shaded, lava_c)
final = MIX(nt, M(nt, 'MULTIPLY', crat, M(nt, 'GREATER_THAN', gcone.outputs[0], 0.02)), final, (1.0, 0.78, 0.22))
# --- the fissure (lava.png B: tears open from the vent, widens, narrows back); colour by its temperature
fis = VAL(nt, 'fis', -0.1); live('fis', fis.outputs[0])
coolv = VAL(nt, 'cool', 0.2); live('cool', coolv.outputs[0])
crk = sepl.outputs['Blue']
crack_on = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', crk, fis.outputs[0]), M(nt, 'SUBTRACT', 1.0, M(nt, 'MULTIPLY', coneF, M(nt, 'GREATER_THAN', cone_at, 0.25))))   # buried under the new cone
crack_core = M(nt, 'LESS_THAN', crk, M(nt, 'SUBTRACT', fis.outputs[0], 0.07))
# LINEAR: `cool` is one uniform animated value — with CONSTANT stops every stop was a one-frame colour jump of the whole
# crack (review 18.10: pops at 45.20 / 46.26 / 46.58 / 46.78 s); now the crack stays one flat toon colour per frame but warms
# and cools smoothly over time
ccol = RAMP(nt, coolv.outputs[0], [(0.0, (1.0, 0.95, 0.55)), (0.32, (1.0, 0.80, 0.25)), (0.5, (1.0, 0.5, 0.05)), (0.75, (0.92, 0.22, 0.02)),
                                   (0.9, (0.66, 0.08, 0.02))], interp='LINEAR')
crcol = MIX(nt, crack_core, (0.85, 0.12, 0.02), ccol)
final = MIX(nt, crack_on, final, crcol)
if DEBUG == 'light':
	final = M(nt, 'MULTIPLY', lum, 0.5)
EMIT(nt, final, out)
terr.data.materials.append(mat)

# ------------------------------------------------------------------ wide (mainland) material
wm = bpy.data.materials.new('wide'); wm.use_nodes = True
wt = wm.node_tree; wt.nodes.clear()
wout = node(wt, 'ShaderNodeOutputMaterial', (900, 0))
wuv = node(wt, 'ShaderNodeUVMap', uv_map='UVMap'); wgeo = node(wt, 'ShaderNodeNewGeometry'); wtc = node(wt, 'ShaderNodeTexCoord')
wpos = SEP(wt, wgeo.outputs['Position']); wnrm = SEP(wt, wgeo.outputs['Normal'])
wz = node(wt, 'ShaderNodeSeparateColor'); link(wt, IMG(wt, D / 'wide_zones.png', wuv.outputs['UV']).outputs['Color'], wz.inputs['Color'])
walt = M(wt, 'DIVIDE', M(wt, 'MULTIPLY', wpos['Z'], 1000.0), EXAG)
wwob = wobble(wt, wtc.outputs['Object'], 0.35, 160.0, walt)
WRAMP = [(0.0, '#42a07a'), (0.06, '#348e6c'), (0.22, '#2a806a'), (0.38, '#8682c8'), (0.6, '#a29edc')]   # (also tools/blender/backdrop_decal.py)
wbase = RAMP(wt, M(wt, 'DIVIDE', wwob, 1600.0), [(p_, nlit(h_)) for p_, h_ in WRAMP])
wbase = MIX(wt, M(wt, 'MULTIPLY', M(wt, 'GREATER_THAN', wz.outputs['Green'], 0.5), M(wt, 'LESS_THAN', walt, 200.0)), wbase, nlit('#6866a4'))   # black-sand plains
wbase = MIX(wt, M(wt, 'LESS_THAN', wnrm['Z'], 0.7), wbase, nlit('#86669a'))
wbase = MIX(wt, M(wt, 'GREATER_THAN', wz.outputs['Blue'], 0.45), wbase, nlit('#e6ecff'))                                       # glaciers (moonlit)
wband, _ = toon_d(wt)
wfinal = MIX(wt, 1.0, wbase, wband, 'MULTIPLY')
# smooth coastline (fix round 18.10 night: stair-stepped 100 m coasts in the dive): the mesh is lifted just above the sea on a
# strip round every coast (see WZ below) and the sea is painted on it wherever the smooth 4× mask (heimaey_prep wide_land.png)
# says water — in exactly the sea shader's colours (same coast distance, same bands)
wlandm = IMG(wt, D / 'wide_land.png', wuv.outputs['UV']).outputs['Color']
wcoast = M(wt, 'MULTIPLY', IMG(wt, D / 'wide_coast.png', wuv.outputs['UV']).outputs['Color'], 65535.0)
wsea = sea_bands(wt, wcoast, px_metres(wt, wgeo.outputs['Position']))
wfinal = MIX(wt, M(wt, 'LESS_THAN', wlandm, 0.5), wfinal, wsea)
EMIT(wt, wfinal, wout)
wide.data.materials.append(wm)

# ------------------------------------------------------------------ ink outline (inverted hull), rebuilt per frame (camera-distance width)
ink = bpy.data.materials.new('ink'); ink.use_nodes = True; ink.use_backface_culling = True
it_ = ink.node_tree; it_.nodes.clear()
EMIT(it_, srgb('#120c2a'), node(it_, 'ShaderNodeOutputMaterial', (300, 0)))
def normals_grid(Z, sx, sy):
	dzdx = np.gradient(Z, axis=1) / sx; dzdy = -np.gradient(Z, axis=0) / sy
	n_ = np.stack([-dzdx, -dzdy, np.ones_like(Z)], -1)
	return n_ / np.linalg.norm(n_, axis=-1, keepdims=True)
hull_me = grid_mesh('heimaey_ink', np.stack([VX, VY, Z0], -1).reshape(-1, 3).astype(np.float32), FACES[:, ::-1].copy()); hull_me.materials.append(ink)
hull = bpy.data.objects.new('heimaey_ink', hull_me); sc.collection.objects.link(hull); hull.visible_shadow = False
hullw_me = grid_mesh('wide_ink', np.stack([WX, WY, WZ], -1).reshape(-1, 3).astype(np.float32), FACESW[:, ::-1].copy()); hullw_me.materials.append(ink)
hullw = bpy.data.objects.new('wide_ink', hullw_me); sc.collection.objects.link(hullw); hullw.visible_shadow = False
NW_ = normals_grid(WZ, (WX[0, -1] - WX[0, 0]) / (nxw - 1), (WY[0, 0] - WY[-1, 0]) / (nyw - 1))
PW3 = np.stack([WX, WY, WZ], -1)

# ------------------------------------------------------------------ sea (flat toon blue, coast bands, eruption glow, boiling water at the lava)
bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, SEA_Z))
sea = bpy.context.object; sea.name = 'sea'
sm = bpy.data.materials.new('sea'); sm.use_nodes = True; st_ = sm.node_tree; st_.nodes.clear()
so = node(st_, 'ShaderNodeOutputMaterial', (900, 0))
sgeo = node(st_, 'ShaderNodeNewGeometry'); stc = node(st_, 'ShaderNodeTexCoord')
sp = SEP(st_, sgeo.outputs['Position'])
suv = COMB(st_, M(st_, 'MULTIPLY_ADD', sp['X'], 1 / WK, 0.5), M(st_, 'MULTIPLY_ADD', sp['Y'], 1 / HK, 0.5), 0)
# heimaey_wide uv from the heimaey frame (linear)
ax_ = (mx['x1'] - mx['x0']) / WK / (mww['x1'] - mww['x0']); bx_ = (mx['x0'] + 0.5 * (mx['x1'] - mx['x0']) - mww['x0']) / (mww['x1'] - mww['x0'])
ay_ = (mx['y1'] - mx['y0']) / HK / (mww['y1'] - mww['y0']); by_ = (mx['y0'] + 0.5 * (mx['y1'] - mx['y0']) - mww['y0']) / (mww['y1'] - mww['y0'])
wuvs = COMB(st_, M(st_, 'MULTIPLY_ADD', sp['X'], ax_, bx_), M(st_, 'SUBTRACT', 1.0, M(st_, 'MULTIPLY_ADD', sp['Y'], -ay_, by_)), 0)
c_in = M(st_, 'MULTIPLY', IMG(st_, D / 'coast.png', suv).outputs['Color'], 6553.5)
c_wd = M(st_, 'MULTIPLY', IMG(st_, D / 'wide_coast.png', wuvs).outputs['Color'], 65535.0)
inb = M(st_, 'MULTIPLY', M(st_, 'MULTIPLY', M(st_, 'GREATER_THAN', sp['X'], -WK / 2), M(st_, 'LESS_THAN', sp['X'], WK / 2)),
        M(st_, 'MULTIPLY', M(st_, 'GREATER_THAN', sp['Y'], -HK / 2), M(st_, 'LESS_THAN', sp['Y'], HK / 2)))
coast_s = M(st_, 'ADD', M(st_, 'MULTIPLY', inb, c_in), M(st_, 'MULTIPLY', M(st_, 'SUBTRACT', 1.0, inb), c_wd))
pxm_s = px_metres(st_, sgeo.outputs['Position'])
# outside heimaey_wide the wide coast map would EXTEND its edge rows (the north edge is inland Iceland → «coast» → foam):
# open sea there; north of the grid (only ever seen as a thin strip on the horizon above the far highlands) far-land violet
wsu = SEP(st_, wuvs)
inw = M(st_, 'MULTIPLY', M(st_, 'MULTIPLY', M(st_, 'GREATER_THAN', wsu['X'], 0.0), M(st_, 'LESS_THAN', wsu['X'], 1.0)),
        M(st_, 'MULTIPLY', M(st_, 'GREATER_THAN', wsu['Y'], 0.0), M(st_, 'LESS_THAN', wsu['Y'], 1.0)))
coast_s = M(st_, 'ADD', M(st_, 'MULTIPLY', coast_s, inw), M(st_, 'MULTIPLY', M(st_, 'SUBTRACT', 1.0, inw), 1e5))
scol = sea_bands(st_, coast_s, pxm_s)
scol = MIX(st_, M(st_, 'MULTIPLY', M(st_, 'SUBTRACT', 1.0, inw), M(st_, 'GREATER_THAN', wsu['Y'], 1.0)), scol, srgb('#7a74bc'))
# boiling, steaming water right in front of the lava where it pushes into the sea (arrival just beyond the front)
sl_ = node(st_, 'ShaderNodeSeparateColor'); link(st_, IMG(st_, D / 'arr_eff.png', suv).outputs['Color'], sl_.inputs['Color'])
sprog = VAL(st_, 'prog'); live('prog', sprog.outputs[0])
sarr = wobble(st_, stc.outputs['Object'], 22.0, 0.004, sl_.outputs['Red'])
boil = M(st_, 'MULTIPLY', M(st_, 'MULTIPLY', M(st_, 'GREATER_THAN', sarr, M(st_, 'SUBTRACT', sprog.outputs[0], 0.01)),
                                            M(st_, 'LESS_THAN', sarr, M(st_, 'ADD', sprog.outputs[0], 0.016))), M(st_, 'MULTIPLY', inb, M(st_, 'LESS_THAN', sl_.outputs['Red'], 0.99)))
scol = MIX(st_, boil, scol, srgb('#b4b8ec'))
EMIT(st_, scol, so)
sea.data.materials.append(sm)

# ------------------------------------------------------------------ world. LIGHTING (every non-camera ray) = the approved violet dusk ramp
# (etna_toon colours) the toon bands are calibrated on — unchanged. SEEN by the camera (night fix round 19.10): a cartoon night sky —
# violet glow on the horizon → indigo, crisp round stars (static in world space, ≥ 2 px radius: no twinkle) and a big pale moon
# with a crisp halo in the upper left of the low southern view (camera tilt keys: sky = top ~22 % of the frame from ~48 s)
wd = bpy.data.worlds.new('night'); sc.world = wd; wd.use_nodes = True
wn_ = wd.node_tree; wn_.nodes.clear()
wo = node(wn_, 'ShaderNodeOutputWorld', (900, 0))
wtc2 = node(wn_, 'ShaderNodeTexCoord')
dirv = VM(wn_, 'NORMALIZE', wtc2.outputs['Generated'])
wsep = SEP(wn_, dirv)
skyc = RAMP(wn_, wsep['Z'], [(0.0, (1.0, 0.68, 0.45)), (0.025, (1.0, 0.42, 0.52)), (0.075, (0.78, 0.26, 0.62)), (0.15, (0.38, 0.16, 0.6)),
                             (0.38, (0.13, 0.07, 0.36))], interp='LINEAR')
# the visible night sky (display colours by sin(elevation))
nsky = RAMP(wn_, wsep['Z'], [(0.0, srgb('#8a62c4')), (0.03, srgb('#6a4ab8')), (0.085, srgb('#46309e')), (0.16, srgb('#2c1e82')),
                             (0.3, srgb('#1c1464'))], interp='LINEAR')
# stars: 2D Voronoi on (azimuth, elevation) — the distance is a true angle, so every star is a round dot of a fixed angular size
az_ = M(wn_, 'ARCTAN2', wsep['X'], wsep['Y'])
el_ = M(wn_, 'ARCSINE', wsep['Z'])
STAR_S = float(arg('stars', 36.0))
svor = node(wn_, 'ShaderNodeTexVoronoi', voronoi_dimensions='2D', feature='F1'); svor.inputs['Scale'].default_value = 1.0
svor.inputs['Randomness'].default_value = 0.85
link(wn_, VM(wn_, 'SCALE', COMB(wn_, az_, el_, 0), scale=STAR_S), svor.inputs['Vector'])
srnd = SEP(wn_, svor.outputs['Color'])
# radius (scaled units): 0.0013–0.0024 rad ≈ 2.2–4 px at fov 64; ~55 % of the cells hold a star; none near the horizon glow
srad = M(wn_, 'MULTIPLY_ADD', srnd['Y'], 0.0011 * STAR_S, 0.0013 * STAR_S)
star = M(wn_, 'MULTIPLY', M(wn_, 'LESS_THAN', svor.outputs['Distance'], srad), M(wn_, 'LESS_THAN', srnd['X'], 0.55))
star = M(wn_, 'MULTIPLY', star, M(wn_, 'GREATER_THAN', wsep['Z'], M(wn_, 'MULTIPLY_ADD', srnd['Z'], 0.04, 0.035)))
starc = MIX(wn_, M(wn_, 'GREATER_THAN', srnd['Z'], 0.7), srgb('#fff6dc'), srgb('#dce8ff'))
vis = MIX(wn_, star, nsky, starc)
# the moon (cartoon size: radius ~2.2°) + two crisp halo rings of lighter sky; a few soft-yellow «maria» circles
MB, ME, MR = math.radians(float(arg('moonb', -9.5))), math.radians(float(arg('moone', 6.6))), math.radians(float(arg('moonr', 2.1)))
MDIR = Vector((math.sin(MB) * math.cos(ME), math.cos(MB) * math.cos(ME), math.sin(ME)))
MT1 = Vector((math.cos(MB), -math.sin(MB), 0)); MT2 = MDIR.cross(MT1).normalized()
mdot = VM(wn_, 'DOT_PRODUCT', dirv, tuple(MDIR))
vis = MIX(wn_, M(wn_, 'GREATER_THAN', mdot, math.cos(MR * 2.35)), vis, MIX(wn_, 0.5, nsky, srgb('#5a46b4')))
vis = MIX(wn_, M(wn_, 'GREATER_THAN', mdot, math.cos(MR * 1.6)), vis, MIX(wn_, 0.55, nsky, srgb('#7a64cc')))
vis = MIX(wn_, M(wn_, 'GREATER_THAN', mdot, math.cos(MR)), vis, srgb('#fff2c8'))
mu = M(wn_, 'DIVIDE', VM(wn_, 'DOT_PRODUCT', dirv, tuple(MT1)), MR); mv = M(wn_, 'DIVIDE', VM(wn_, 'DOT_PRODUCT', dirv, tuple(MT2)), MR)
for cu, cv, cr in ((-0.32, 0.22, 0.24), (0.28, -0.12, 0.3), (0.02, 0.5, 0.13), (-0.18, -0.45, 0.15)):
	dm = M(wn_, 'SQRT', M(wn_, 'ADD', M(wn_, 'POWER', M(wn_, 'SUBTRACT', mu, cu), 2.0), M(wn_, 'POWER', M(wn_, 'SUBTRACT', mv, cv), 2.0)))
	vis = MIX(wn_, M(wn_, 'MULTIPLY', M(wn_, 'LESS_THAN', dm, cr), M(wn_, 'GREATER_THAN', mdot, math.cos(MR))), vis, srgb('#eadcaa'))
lpth = node(wn_, 'ShaderNodeLightPath')
wcol = MIX(wn_, lpth.outputs['Is Camera Ray'], skyc, vis)
wbg = node(wn_, 'ShaderNodeBackground'); link(wn_, wcol, wbg.inputs['Color']); wbg.inputs['Strength'].default_value = 1.0
link(wn_, wbg.outputs[0], wo.inputs['Surface'])

# ------------------------------------------------------------------ key light (dusk sun from the west-south-west, 34° up; etna_toon colour)
sun_d = bpy.data.lights.new('moon', 'SUN'); sun_d.energy = float(arg('sun', 4.0)); sun_d.color = (1.0, 0.86, 0.62); sun_d.angle = math.radians(0.5)
sun = bpy.data.objects.new('moon', sun_d); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(56), 0, math.radians(-70))

# ------------------------------------------------------------------ cartoon puffs (toon spheres + ink hulls), placed per frame
def puff_mat(name, shadow, mid, lit, base_z, under=(1.0, 0.45, 0.12), under_h=0.0, under_k=0.85):
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	band_, _ = toon(t, shadow, mid, lit)
	c = band_
	if under_h > 0:
		g_ = node(t, 'ShaderNodeNewGeometry'); pz = SEP(t, g_.outputs['Position'])['Z']
		bz = VAL(t, 'base_z', base_z); live(name + '_z', bz.outputs[0])
		low = M(t, 'LESS_THAN', pz, M(t, 'ADD', bz.outputs[0], under_h))
		c = MIX(t, M(t, 'MULTIPLY', low, under_k), c, MIX(t, 0.4, under, band_, 'MULTIPLY'))
	EMIT(t, c, mo)
	return m
sph = bpy.data.meshes.new('puff'); bms = bmesh.new(); bmesh.ops.create_icosphere(bms, subdivisions=3, radius=1.0); bms.to_mesh(sph); bms.free()
sph.polygons.foreach_set('use_smooth', np.ones(len(sph.polygons), bool))
sph_ink = sph.copy(); sph_ink.name = 'puff_ink'
bmi = bmesh.new(); bmi.from_mesh(sph_ink); bmesh.ops.reverse_faces(bmi, faces=bmi.faces); bmi.to_mesh(sph_ink); bmi.free()
sph_ink.materials.clear(); sph_ink.materials.append(ink)
# night eruption cloud material (fix round 19.10, owner: «the smoke must not look like an organ»): moonlit toon bands (violet shadow,
# lilac middle, pale moonlit top), a darker grey-violet underside, and the lowest part of the plume lit orange → red by the
# fountains and the lava below it (crisp, slightly wobbly height bands above the vent — the light gets weaker with height)
KN = float(arg('kn', 1.3))
def cloud_mat(name):
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	g_ = node(t, 'ShaderNodeNewGeometry'); gp = SEP(t, g_.outputs['Position'])
	# shading normal = the puff's own normal bent toward the plume's: + KN × the unit direction from the plume axis to the puff
	# centre (per object, in Object Info Color as (d + 1) / 2): the light bands follow the whole billowing plume (lit west side,
	# violet east side, darker bottom of the leaning part) instead of a crescent on every puff (stripes)
	oi = node(t, 'ShaderNodeObjectInfo')
	dvec = VM(t, 'SUBTRACT', VM(t, 'SCALE', oi.outputs['Color'], scale=2.0), (1.0, 1.0, 1.0))
	n2 = VM(t, 'NORMALIZE', VM(t, 'ADD', VM(t, 'SCALE', dvec, scale=KN), g_.outputs['Normal']))
	gn = SEP(t, n2)
	band_, _ = toon(t, srgb('#5c5088'), srgb('#9c94c8'), srgb('#e2def6'), normal=n2)
	bz = VAL(t, 'cloud_z', 0.1); live('cloud_z', bz.outputs[0])
	bs = VAL(t, 'cloud_s', 1.0); live('cloud_s', bs.outputs[0])
	# height above the vent in units of the cloud's size (the bands grow with the cloud), with a little wobble (no ruler-straight lines)
	zz = M(t, 'DIVIDE', M(t, 'SUBTRACT', gp['Z'], bz.outputs[0]), bs.outputs[0])
	zz = wobble(t, g_.outputs['Position'], 7.0, 0.07, zz)
	under = M(t, 'LESS_THAN', gn['Z'], -0.3)
	c = MIX(t, under, band_, srgb('#4e4276'))                                                          # darker grey-violet underside
	c = MIX(t, M(t, 'MULTIPLY', under, M(t, 'LESS_THAN', zz, 0.42)), c, srgb('#b8485a'))                  # undersides near the fire: red
	c = MIX(t, M(t, 'LESS_THAN', zz, 0.24), c, srgb('#f0683a'))                                         # orange-red
	c = MIX(t, M(t, 'LESS_THAN', zz, 0.09), c, srgb('#ffaa48'))                                         # hot yellow-orange right above the vent
	EMIT(t, c, mo)
	return m
ash_m = cloud_mat('ash')
steam_m = puff_mat('steam', srgb('#7a76a6'), srgb('#aaa6cc'), srgb('#d8d4ec'), 0.0, under=srgb('#ffc090'), under_h=0.03, under_k=0.5)
PUFFS = []   # (obj, ink, params)
def make_puff(name, mat_):
	sm_ = sph.copy(); sm_.name = name; sm_.materials.append(mat_)
	o = bpy.data.objects.new(name, sm_); sc.collection.objects.link(o); o.visible_shadow = False
	hl = bpy.data.objects.new(name + '_ink', sph_ink); sc.collection.objects.link(hl); hl.visible_shadow = False
	return o, hl
rngp = np.random.default_rng(11)
# Billowing cartoon eruption cloud (night fix round 19.10; the old one was a straight column of equal stacked puffs = organ pipes):
# - a plume that comes OUT of the Eldfell crater (base on the crater floor, narrow, glowing orange from below) and widens steadily
#   with height (radius 50 m → ~340 m) — no separate mushroom head; its top is a lumpy cauliflower cap;
# - its axis bends with the wind toward the west (screen left, above the strait), more and more as it grows;
# - the body is a conveyor of irregular puffs (random sizes 45–90 % of the local radius, random offsets round the axis): they are
#   born at zero size inside the crater, stream up, slow down near the top and melt into the cap (shrinking to zero inside it),
#   so the smoke visibly rises and billows; the cap churns slowly (puffs breathe ±5 %, roll round the axis) — nothing pops;
# - everything scales with cloud_scale(t) (a small cumulus at «rips» → the full ~1.6 km cloud by «lava turns»), kept below the
#   KeyFacts at the top while they are up (y > ~490 until 49.8 s) and inside the frame to the end.
CL_H = float(arg('colh', 1.3))                    # axis height (km at scale 1)
CL_LEAN = (float(arg('leanx', -0.75)), float(arg('leany', 0.12)))   # top of the axis relative to the vent (km east, north)
SMAX = 0.94                                        # the conveyor melts into the cap here (axis fraction)
VUP = float(arg('vup', 0.085))                     # conveyor parameter speed (1/s): bottom → top in ~12 s, fast low, slow high
VFRONT = 0.6                                       # how fast the young plume climbs (axis fraction / s) after «rips»
def rcol(s): return 0.05 + 0.29 * max(0.0, s) ** 1.15
def lean_k(t): return lerp(0.5, 1.0, easeInOut((t - RIP - 0.5) / (W(101) - RIP)))
def axis_at(s, t):
	k = lean_k(t) * max(0.0, s) ** 1.8
	return Vector((CL_LEAN[0] * k, CL_LEAN[1] * k, CL_H * s))
T_PLUME = RIP + 0.1
def conv_s(u):
	"""conveyor parameter u ∈ [0, 1) → axis fraction: fast out of the crater, slowing down into the cap"""
	return SMAX * (1 - (1 - u) ** 1.6)
NCV = int(arg('ncv', 85))
for k in range(NCV):
	o, hl = make_puff(f'cv{k}', ash_m)
	PUFFS.append((o, hl, dict(kind='cv', s0=(k + rngp.random()) / NCV, ang=rngp.random() * 2 * math.pi, rho=0.15 + 0.42 * rngp.random(),
	                          rs=0.55 + 0.4 * rngp.random() ** 1.3, spin=(0.2 + 0.25 * rngp.random()) * (1 if rngp.random() < 0.5 else -1),
	                          ph=rngp.random() * 6.28)))
# a small static core along the axis (no see-through gaps whatever the conveyor does; mostly hidden inside it)
s_ = 0.03
while s_ < 0.9:
	o, hl = make_puff(f'core{len(PUFFS)}', ash_m)
	PUFFS.append((o, hl, dict(kind='core', s=s_, rs=0.5 + 0.08 * rngp.random(), ph=rngp.random() * 6.28)))
	s_ += 0.5 * rcol(s_) / CL_H + 0.006
# the cap: a cluster of big irregular puffs round the axis top + a crown of smaller ones (cauliflower top)
def rand_dir(zmin):
	while True:
		d_ = Vector((rngp.normal(), rngp.normal(), rngp.normal()))
		if d_.length > 1e-3:
			d_.normalize()
			if d_.z >= zmin: return d_
R1 = rcol(1.0)
HEAD = []
for k in range(int(arg('ncap', 14))):
	d_ = rand_dir(-0.6)
	HEAD.append(dict(s=0.95, off=(d_.x * R1 * 0.62, d_.y * R1 * 0.62, d_.z * R1 * 0.38), rr=0.42 + 0.34 * rngp.random() ** 1.4, lvl=0))
for k in range(int(arg('ncrown', 12))):
	d_ = rand_dir(0.25)
	HEAD.append(dict(s=0.95, off=(d_.x * R1 * 0.8, d_.y * R1 * 0.8, d_.z * R1 * 0.72 + 0.1 * R1), rr=0.2 + 0.2 * rngp.random(), lvl=1))
T_HEAD = T_PLUME + 0.8 / VFRONT                       # the young plume reaches the cap
for k, hp in enumerate(HEAD):
	o, hl = make_puff(f'head{k}', ash_m)
	tb = T_HEAD + 0.45 * hp['lvl'] + 0.35 * (hp['off'][2] / R1 + 0.6) + 0.6 * rngp.random()
	PUFFS.append((o, hl, dict(kind='head', tb=tb, ph=rngp.random() * 6.28, roll=(0.06 + 0.05 * rngp.random()) * (1 if k % 2 else -1), **hp)))
print('cloud puffs', len(PUFFS))
def cloud_scale(t):
	return lerp(0.36, 1.0, easeInOut((t - RIP - 0.3) / (W(101) + 0.6 - RIP)))
# steam where the lava pushes into the sea: puffs born on the moving front inside the old sea (arrival ≈ prog at birth)
sea_cells = np.nonzero(((zpre < 0) & infield & (ARR < 0.98)).ravel())[0]
NST = 0
for k in range(NST):
	o, hl = make_puff(f'steam{k}', steam_m)
	PUFFS.append((o, hl, dict(kind='steam', tb=None, k=k)))
def front_point(prog, rng_):
	"""a random old-sea cell on the lava front (arrival within ±0.006 of prog)"""
	a = ARR.ravel()[sea_cells]
	cand = sea_cells[np.abs(a - prog) < 0.006]
	if len(cand) == 0: return None
	c_ = cand[int(rng_.random() * len(cand))]
	return VX.ravel()[c_], VY.ravel()[c_]
# steam births: from the first sea contact to the end of the shot
_ts = np.linspace(T0, T1, 2000)
_pr = np.array([lava_state(t)[0] for t in _ts])
a_sea = ARR.ravel()[sea_cells]
t_sea = float(_ts[np.argmax(_pr > a_sea.min() + 0.004)]) if (_pr > a_sea.min() + 0.004).any() else T1
rngs = np.random.default_rng(5)
for o, hl, P_ in PUFFS:
	if P_['kind'] != 'steam': continue
	tb = t_sea + (P_['k'] + rngs.random() * 0.6) * (T1 + 0.5 - t_sea) / NST * 1.6 - 1.2 * rngs.random()
	tb = max(t_sea, tb)
	pt = front_point(lava_state(tb + 0.15)[0], rngs)
	P_.update(tb=tb, life=2.2 + rngs.random(), pt=pt, rs=0.016 + 0.014 * rngs.random(), rise=0.05 + 0.04 * rngs.random())
print('steam from %.2f s' % t_sea)

# ------------------------------------------------------------------ lava fountains: one particle emitter per vent along the fissure
blobs = bpy.data.collections.new('blobs')
for nm, col, rad in (('blobY', (1.0, 0.80, 0.16), 0.0105), ('blobO', (1.0, 0.36, 0.02), 0.009), ('blobW', (1.0, 0.96, 0.62), 0.0075)):
	bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rad)
	blob = bpy.context.object; blob.name = nm
	bm_ = bpy.data.materials.new(nm); bm_.use_nodes = True; bn = bm_.node_tree; bn.nodes.clear()
	EMIT(bn, col, node(bn, 'ShaderNodeOutputMaterial', (300, 0)))
	blob.data.materials.append(bm_)
	blob.location = (0, 0, -50); blob.visible_shadow = False
	sc.collection.objects.unlink(blob); blobs.objects.link(blob)
def h1(x):
	s = math.sin(x * 127.1 + 311.7) * 43758.5453
	return s - math.floor(s)
fdir = (FB - FA); fdir_n = fdir.normalized()
_tt = np.linspace(T0, T1, 4000)
_tip = np.array([tip_of(t) for t in _tt]); _con = np.array([contract(t) for t in _tt])
EMITTERS = []
for j, uj in enumerate(VENTS):
	main = abs(uj - VENT_U) < 1e-6
	need = abs(uj - VENT_U) / ARM
	ok_ = (_tip > need + 1e-3) & (_tt > RIP - 0.1)
	ton = float(_tt[np.argmax(ok_)]) if ok_.any() else None
	if ton is None: continue
	side_len = VENT_U if uj < VENT_U else ARM
	off = (_con > 0) & (abs(uj - VENT_U) > (1 - _con) * side_len)
	toff = float(_tt[np.argmax(off)]) if (off.any() and not main) else T1 + 1
	hv = (1.25 if main else 0.45 + 0.75 * h1(j * 7.3 + 3)) * float(arg('fh', 0.19))
	VF = math.sqrt(2 * GRAV * hv)
	p0 = BOWL.copy() if main else FA + fdir * uj
	bpy.ops.mesh.primitive_plane_add(size=1, location=(p0.x, p0.y, 0))
	em = bpy.context.object; em.name = f'vent{j}'
	em.scale = (0.045 if main else 0.03, 0.014, 1); em.rotation_euler = (0, 0, math.atan2(fdir.y, fdir.x))
	ps_mod = em.modifiers.new('fount', 'PARTICLE_SYSTEM'); ps = ps_mod.particle_system.settings
	f_on = 1 + (ton - T0) * FPS; f_off = min(NF, 1 + (toff - T0) * FPS)
	rate = (520 if main else 170) * float(arg('frate', 1.0))
	ps.count = max(10, int(rate * (f_off - f_on) / FPS)); ps.frame_start = f_on; ps.frame_end = f_off
	ps.lifetime = int(2.1 * VF / GRAV * FPS); ps.lifetime_random = 0.15
	ps.emit_from = 'FACE'; ps.normal_factor = VF; ps.factor_random = VF * 0.28
	ps.render_type = 'COLLECTION'; ps.instance_collection = blobs; ps.use_collection_pick_random = True
	ps.particle_size = 1.3 if main else 1.0; ps.size_random = 0.6
	ps.physics_type = 'NEWTON'; ps.mass = 1.0; ps.use_rotations = False
	ps_mod.particle_system.seed = j * 13 + 1
	em.show_instancer_for_render = False
	EMITTERS.append((em, p0, main))
	for f_ in list(range(1, NF + 1, 6)) + [NF]:                 # ride on the (growing) ground — animated, so the particle cache stays valid
		em.location = (p0.x, p0.y, z_point(tof(f_), p0.x, p0.y) + 0.002); em.keyframe_insert('location', index=2, frame=f_)
	print('vent %d u=%.2f on %.2f off %.2f h %.0f m n %d' % (j, uj, ton, toff, hv * 1000, ps.count))

# ------------------------------------------------------------------ the town: one stylized house per roof of the mosaic (+ the old east town)
houses = json.load(open(D / 'houses.json'))
CAMDIR_XY = Vector((0.36, -0.93, 0))          # towards the camera (SSE): window lights sit on that side
hv_, hf_, hcol_ = [], [], []
rv_, rf_, rcol_ = [], [], []
lv_, lf_ = [], []
ico = bmesh.new(); bmesh.ops.create_icosphere(ico, subdivisions=1, radius=1.0)
ico_v = np.array([v.co[:] for v in ico.verts]); ico_f = [[v.index for v in f_.verts] for f_ in ico.faces]; ico.free()
rngh = np.random.default_rng(9)
nh = 0
for h in houses:
	u_, v_ = h['u'], h['v']
	fx, fy = u_ * (nx - 1), v_ * (ny - 1)
	if ARR[int(round(fy)), int(round(fx))] < 0.6: continue          # would be overrun by the lava in this shot
	z = hat_grid(zpre, h['x'], h['y'])
	if z < 0.003 or z > 0.09 * EXAG: continue
	jj_, ii_ = int(round(fy)), int(round(fx))
	slope = math.hypot((zpre[jj_, min(nx - 1, ii_ + 1)] - zpre[jj_, max(0, ii_ - 1)]) / (2 * SX), (zpre[min(ny - 1, jj_ + 1), ii_] - zpre[max(0, jj_ - 1), ii_]) / (2 * SY))
	if slope > 0.42: continue                                      # bright rocks on the cliffs are not houses
	L, Wd, a = h['l'], h['w'], h['a']
	hh = (0.0065 + 0.0035 * h['h']) * (1.25 if h['big'] else 1.0)
	ca, sa = math.cos(a), math.sin(a)
	def P_(dx, dy, dzz):
		return (h['x'] + dx * ca - dy * sa, h['y'] + dx * sa + dy * ca, z - 0.003 + dzz)
	b0 = len(hv_)
	for dzz in (0, hh + 0.003):
		for dx, dy in ((-L / 2, -Wd / 2), (L / 2, -Wd / 2), (L / 2, Wd / 2), (-L / 2, Wd / 2)):
			hv_.append(P_(dx, dy, dzz))
	for f_ in ((0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)) + (((4, 5, 6, 7),) if h['big'] else ()):
		hf_.append([b0 + i for i in f_])
	hcol_ += [rngh.random()] * 8
	if not h['big']:
		r0 = len(rv_); top = hh + 0.003; ridge = top + 0.0035
		e = 0.0012
		for dx, dy, dzz in ((-L / 2 - e, -Wd / 2 - e, top), (L / 2 + e, -Wd / 2 - e, top), (L / 2 + e, Wd / 2 + e, top), (-L / 2 - e, Wd / 2 + e, top),
		                    (-L / 2 - e, 0, ridge), (L / 2 + e, 0, ridge)):
			rv_.append(P_(dx, dy, dzz))
		for f_ in ((0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5)):
			rf_.append([r0 + i for i in f_])
		rcol_ += [h['c'] / 6 + 0.08] * 6
	if h['lit'] or rngh.random() < 0.5:
		l0 = len(lv_)
		off = CAMDIR_XY * (min(L, Wd) / 2 + 0.0008)
		c_ = Vector((h['x'] + off.x, h['y'] + off.y, z - 0.003 + hh * 0.75))
		r_ = float(arg('litr', 0.0085)) + 0.003 * rngh.random()        # night: 2.5–3.5 px warm dots at 5 km
		for v in ico_v: lv_.append((c_.x + v[0] * r_, c_.y + v[1] * r_, c_.z + v[2] * r_))
		for f_ in ico_f: lf_.append([l0 + i for i in f_])
	nh += 1
def mesh_from(name, V, Fc, attr=None):
	me_ = bpy.data.meshes.new(name); me_.from_pydata([tuple(v) for v in V], [], Fc); me_.update()
	if attr is not None:
		at = me_.attributes.new('hc', 'FLOAT', 'POINT'); at.data.foreach_set('value', np.asarray(attr, np.float32))
	o = bpy.data.objects.new(name, me_); sc.collection.objects.link(o)
	return o
def house_mat(name, stops, emit_lit=None):
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	at = node(t, 'ShaderNodeAttribute', attribute_name='hc')
	col = RAMP(t, at.outputs['Fac'], stops)
	band_, _ = toon_d(t)
	EMIT(t, MIX(t, 1.0, col, band_, 'MULTIPLY'), mo)
	return m
walls = mesh_from('walls', hv_, hf_, hcol_)
walls.data.materials.append(house_mat('wall', [(0.0, srgb('#e8e2d8')), (0.3, srgb('#efdca0')), (0.5, srgb('#c4d4ea')),
                                               (0.7, srgb('#f4ece0')), (0.85, srgb('#d4e2c0'))]))
roofs = mesh_from('roofs', rv_, rf_, rcol_)
roofs.data.materials.append(house_mat('roof', [(0.0, srgb('#d04030')), (1 / 6, srgb('#3a8a6a')), (2 / 6, srgb('#4a6ab0')),
                                               (3 / 6, srgb('#d85038')), (4 / 6, srgb('#5a5a6e')), (5 / 6, srgb('#b8503a'))]))
lights = mesh_from('lights', lv_, lf_)
lm = bpy.data.materials.new('lights'); lm.use_nodes = True; ln_ = lm.node_tree; ln_.nodes.clear()
EMIT(ln_, srgb('#ffd060'), node(ln_, 'ShaderNodeOutputMaterial', (300, 0)))
lights.data.materials.append(lm); lights.visible_shadow = False
for o in (walls, roofs):
	o.data.polygons.foreach_set('use_smooth', np.zeros(len(o.data.polygons), bool))
print('houses', nh, 'lit', len(lf_) // max(1, len(ico_f)))

# ------------------------------------------------------------------ the fleet (Kenney watercraft fishing boat, CC0): colours from its palette, toon
BOAT_GLB = ROOT / 'assets/cc0/kenney-watercraft-kit/Models/GLB format/boat-fishing-small.glb'
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(BOAT_GLB))
bobj = [o for o in bpy.data.objects if o not in before and o.type == 'MESH'][0]
bme = bobj.data
pal_img = bme.materials[0].node_tree.nodes['Image Texture'].image if 'Image Texture' in bme.materials[0].node_tree.nodes else \
	[n for n in bme.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE'][0].image
pw, ph = pal_img.size
pal = np.asarray(pal_img.pixels[:], np.float32).reshape(ph, pw, 4)
uvd = bme.uv_layers.active.data
fcol = []
for p_ in bme.polygons:
	us = [uvd[li].uv for li in p_.loop_indices]
	uu_ = sum(u[0] for u in us) / len(us); vv_ = sum(u[1] for u in us) / len(us)
	c_ = pal[min(ph - 1, max(0, int(vv_ * ph))), min(pw - 1, max(0, int((uu_ % 1) * pw)))][:3]
	fcol.append(c_)
fcol = np.array(fcol)
# recolour the Kenney palette (white hull, light-blue cabin) for the dusk sea: the white hull faces become a bright warm hull
# colour (per boat: red / orange / yellow, from Object Info random), the blue cabin faces white, the deck warm grey
ca_ = bme.color_attributes.new('pc', 'FLOAT_COLOR', 'CORNER')
hm_ = bme.attributes.new('hullm', 'FLOAT', 'CORNER')
cc_ = np.zeros((len(bme.loops), 4), np.float32); hh_ = np.zeros(len(bme.loops), np.float32)
for p_, c_ in zip(bme.polygons, fcol):
	blue = c_[2] - c_[0] > 0.25
	grey = abs(c_[0] - c_[2]) < 0.15 and c_[0] < 0.6
	hull_f = (not blue) and (not grey) and p_.center.z < 1.32
	col_ = (0.96, 0.94, 0.90) if blue else ((0.55, 0.50, 0.46) if grey else tuple(c_))
	for li in p_.loop_indices:
		cc_[li] = (*col_, 1); hh_[li] = 1.0 if hull_f else 0.0
ca_.data.foreach_set('color', cc_.ravel()); hm_.data.foreach_set('value', hh_)
bmat = bpy.data.materials.new('boat'); bmat.use_nodes = True; bt = bmat.node_tree; bt.nodes.clear()
bo_ = node(bt, 'ShaderNodeOutputMaterial', (900, 0))
bat = node(bt, 'ShaderNodeAttribute', attribute_name='pc')
bhm = node(bt, 'ShaderNodeAttribute', attribute_name='hullm')
boi = node(bt, 'ShaderNodeObjectInfo')
hullc = RAMP(bt, boi.outputs['Random'], [(0.0, srgb('#f0402a')), (0.4, srgb('#ff7a1e')), (0.75, srgb('#ffc21e'))])
bcol = MIX(bt, M(bt, 'GREATER_THAN', bhm.outputs['Fac'], 0.5), MIX(bt, 1.0, bat.outputs['Color'], (1.05, 1.05, 1.05), 'MULTIPLY'), hullc)
bband, _ = toon_d(bt)
EMIT(bt, MIX(bt, 1.0, bcol, bband, 'MULTIPLY'), bo_)
bme.materials.clear(); bme.materials.append(bmat)
bpy.data.objects.remove(bobj)
for c_ in list(bpy.data.collections):
	if c_.name not in ('blobs',) and not c_.objects and c_.users == 0: bpy.data.collections.remove(c_)
BOAT_L = float(arg('boatl', 0.12))           # cartoon size (km): ~6× a real Heimaey trawler so every hull reads as a boat
bsc = BOAT_L / 3.87
I = {'harborInner': (63.4454, -20.272), 'town': (63.4401, -20.2786)}
MOUTH = ((63.44638 + 63.44743) / 2, (-20.25651 + -20.25894) / 2)
MAINLAND = (63.468, -20.205)                   # (Iceland.tsx MAINLAND: a point on the way, NE of the mouth)
COAST = (63.533, -20.20)                       # the mainland coast the fleet heads for (Landeyjar sands, ~10 km N; in frame on the horizon)
MOORINGS = [(63.44541, -20.27948), (63.44505, -20.2775), (63.44595, -20.2755), (63.44505, -20.2735), (63.446, -20.2712), (63.445, -20.2695), (63.4461, -20.268),
            # (fix round 18.10 night) two more boats in the outer harbour east of the pier (water ≥ 70 m from land_pre's shore)
            (63.4459, -20.2632), (63.4451, -20.2628)]
# the north row stays moored (fix round 18.10 night: once the fleet had left the basin no longer read as a harbour)
STAY = (2, 4, 6)
PASSAGE = (63.4449, -20.2652)
SEA_ROUTE = [MOUTH, (63.4472, -20.25), (63.447, -20.24), (63.452, -20.233)]
def catmull(Pts, n=24):
	Q = [Pts[0], *Pts, Pts[-1]]
	out_ = []
	for i in range(1, len(Q) - 2):
		p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
		for k in range(n):
			t = k / n
			f = lambda c: 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t ** 3)
			out_.append((f(0), f(1)))
	out_.append(Pts[-1])
	return out_
class Path_:
	def __init__(self, ll):
		self.pts = np.array([xyof(*p) for p in ll])
		seg = np.hypot(*(self.pts[1:] - self.pts[:-1]).T)
		self.cum = np.concatenate([[0], np.cumsum(seg)]); self.tot = self.cum[-1]
	def at(self, u):
		d = clamp01(u) * self.tot
		i = min(len(self.cum) - 2, int(np.searchsorted(self.cum, d, 'right') - 1))
		k = (d - self.cum[i]) / max(1e-9, self.cum[i + 1] - self.cum[i])
		return self.pts[i] * (1 - k) + self.pts[i + 1] * k
BOATS = []
# departure order: nearest to the mouth first (the two outer-harbour boats, then the south row east → west)
LEAVE = [8, 7, 5, 3, 1, 0]
# after rounding Ystiklettur every boat drifts sideways onto its own lane (km to the right of the route, + = out to the open sea
# east; the cloud head stands left of the route; lanes checked against land_pre + wide_land) and the trailing ones run a little
# faster, so the single file opens into a
# broad fleet abreast heading for the mainland
FAN = {8: (-0.12, 1.0), 7: (0.10, 1.05), 5: (-0.02, 1.08), 3: (0.24, 1.12), 1: (0.06, 1.16), 0: (0.32, 1.2)}
_R1 = np.array(xyof(*SEA_ROUTE[2]))                    # the route's turn round Ystiklettur's south arm
for i, moor in enumerate(MOORINGS):
	# out of the basin, through the mouth, round Ystiklettur, then north toward the mainland coast; the route is long (≈ 12 km)
	# and the boats cover the first ~4 km in the shot (cruise ≈ 0.55 km/s, cartoon-fast)
	if i in STAY:
		pth = Path_([moor, PASSAGE])
		BOATS.append(dict(path=pth, t0=1e9, dur=1.0, ease=0.2, stay=True)); continue
	j = LEAVE.index(i)
	pth = Path_(catmull([moor, PASSAGE, *SEA_ROUTE, (63.47, -20.222), COAST]) if i < 7 else catmull([moor, *SEA_ROUTE, (63.47, -20.222), COAST]))
	dur_ = pth.tot / 0.55
	s1 = float(pth.cum[int(np.argmin(np.hypot(*(pth.pts - _R1).T)))])
	BOATS.append(dict(path=pth, t0=W(92) - 0.6 + j * 0.3, dur=dur_ * (1 + 0.6 / dur_), ease=1.2 / (dur_ + 0.6), s1=s1, fan=FAN[i]))   # 1.2 s smooth start
def _boat_xy(b, t):
	"""position on the path at time t, with the fan: past the turn the boat speeds up by its factor and slides onto its lane
	(both C1-smooth ramps over ~0.6 / 1.4 km)"""
	if b.get('stay'):
		return b['path'].pts[0].copy()
	k = softStart((t - b['t0']) / b['dur'], b.get('ease', 0.2))
	d = k * b['path'].tot
	off, fac = b['fan']
	x = d - b['s1']
	if x > 0:
		w = 0.6
		d = d + (fac - 1) * (x * x / (2 * w) if x < w else x - w / 2)
	p = b['path'].at(d / b['path'].tot)
	q = b['path'].at(min(1.0, d / b['path'].tot + 0.004))
	tg = q - p; tg = tg / max(1e-9, np.hypot(*tg))
	ramp = smooth((d - b['s1']) / 1.4)
	return p + np.array([tg[1], -tg[0]]) * off * ramp
def boat_state(b, t):
	p = _boat_xy(b, t)
	if b.get('stay'):
		d0 = b['path'].pts[1] - b['path'].pts[0]
		return p, math.atan2(d0[1], d0[0]), 0.0
	q = _boat_xy(b, t + 0.05)
	d = q - p
	if np.hypot(*d) < 1e-7:
		d = b['path'].pts[1] - b['path'].pts[0]
	k = softStart((t - b['t0']) / b['dur'], b.get('ease', 0.2))
	return p, math.atan2(d[1], d[0]), k
mast_m = bpy.data.materials.new('mast'); mast_m.use_nodes = True; mn_ = mast_m.node_tree; mn_.nodes.clear()
EMIT(mn_, srgb('#ffe070'), node(mn_, 'ShaderNodeOutputMaterial', (300, 0)))
wake_m = bpy.data.materials.new('wake'); wake_m.use_nodes = True; wk_ = wake_m.node_tree; wk_.nodes.clear()
EMIT(wk_, srgb('#c4d8ff'), node(wk_, 'ShaderNodeOutputMaterial', (300, 0)))
NWK = 26
BOAT_OBJS = []
for i, b in enumerate(BOATS):
	o = bpy.data.objects.new(f'boat{i}', bme); sc.collection.objects.link(o); o.scale = (bsc, bsc, bsc)
	bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.012)
	lt = bpy.context.object; lt.name = f'mast{i}'; lt.data.materials.append(mast_m); lt.visible_shadow = False
	wme = bpy.data.meshes.new(f'wake{i}')
	V0 = [(0, 0, SEA_Z + 0.0005)] * (NWK * 4)
	Fw = []
	for arm in range(2):
		for k in range(NWK - 1):
			a0 = arm * NWK * 2 + k * 2
			Fw.append([a0, a0 + 1, a0 + 3, a0 + 2])
	wme.from_pydata(V0, [], Fw); wme.materials.append(wake_m)
	wo_ = bpy.data.objects.new(f'wake{i}', wme); sc.collection.objects.link(wo_); wo_.visible_shadow = False
	BOAT_OBJS.append((o, lt, wo_))
# the bow of the Kenney model points along −Y (checked in the test renders); yaw 0 = east
BOW = float(arg('bow', -1))

# ------------------------------------------------------------------ camera object
cam_d = bpy.data.cameras.new('cam'); cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 36; cam_d.clip_end = 500; cam_d.clip_start = 0.01
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam

# ------------------------------------------------------------------ eruption cloud placement (shared by the render and the track)
def cloud_base(Z):
	"""plume base: the Eldfell crater floor (rises with the cone)"""
	return Vector((BOWL.x, BOWL.y, hat_grid(Z, BOWL.x, BOWL.y) + 0.005))
def cloud_puff(P_, t, base, cs):
	"""(centre, radius) of one cloud puff at time t, or None while it is not born / has melted away"""
	kind = P_['kind']
	front = (t - T_PLUME) * VFRONT                   # how high the young plume has climbed (axis fraction)
	if front <= 0: return None
	breathe = 1 + 0.05 * math.sin(0.8 * t + P_['ph'])
	if kind == 'cv':
		u = (P_['s0'] + VUP * (t - T0)) % 1.0
		sv = conv_s(u)
		env = smooth(sv / 0.07) * smooth((1 - u) / 0.12) * smooth((front - sv) / 0.08)
		if env <= 1e-3: return None
		r0 = rcol(sv)
		ang = P_['ang'] + P_['spin'] * (t - T0)
		dr = Vector((math.cos(ang), math.sin(ang), 0))
		c = base + axis_at(sv, t) * cs + dr * (P_['rho'] * r0 * cs)
		return c, r0 * P_['rs'] * cs * env * breathe, dr
	if kind == 'core':
		env = smooth((front - P_['s']) / 0.08)
		if env <= 1e-3: return None
		return base + axis_at(P_['s'], t) * cs, rcol(P_['s']) * P_['rs'] * cs * env * breathe, Vector((0, 0, 0))
	a = t - P_['tb']
	if a <= 0: return None
	grow = smooth(a / 0.6)
	ox, oy, oz = P_['off']
	ra = P_['roll'] * (t - T0)
	ox, oy = ox * math.cos(ra) - oy * math.sin(ra), ox * math.sin(ra) + oy * math.cos(ra)
	env = smooth((front - P_['s']) / 0.08)
	c = base + (axis_at(P_['s'], t) + Vector((ox, oy, oz))) * cs
	c.z += 0.008 * a * cs                             # the cap keeps rising a little
	dv = Vector((ox, oy, oz)); dv = dv.normalized() if dv.length > 1e-6 else Vector((0, 0, 0))
	return c, R1 * P_['rr'] * cs * grow * breathe * env, dv

# ------------------------------------------------------------------ per-frame state
_last_full = [None]
def update(f, full=True):
	t = tof(f)
	C = cam_at(t)
	pos_, fv, rv, uvv, fov = C
	rot = Matrix((rv, uvv, -fv)).transposed()
	cam.matrix_world = Matrix.Translation(pos_) @ rot.to_4x4()
	cam_d.lens = 18 / math.tan(math.radians(fov) / 2)
	camdist = path_orbit(t)['dist']
	cam_d.clip_start = max(0.01, camdist * 0.02)
	pxk = 2 * math.tan(math.radians(fov) / 2) / 1920
	prog_, fis_, cool_, open_ = lava_state(t)
	gc = cone_grow(t)
	Z = zgrid_at(t)
	# fountain emitters ride on the (growing) ground
	if not full: return
	set_live('camx', pos_.x); set_live('camy', pos_.y); set_live('camz', pos_.z); set_live('pxm', pxk * 1000)
	set_live('prog', prog_); set_live('phase', (t - T0) * 1.3); set_live('fis', fis_); set_live('cool', cool_); set_live('gcone', gc)
	set_live('bluek', blue_k(t)); set_live('chank', chan_k(t))
	# relief + hulls
	me.vertices.foreach_set('co', np.stack([VX, VY, Z], -1).astype(np.float32).ravel()); me.update()
	N_ = normals_grid(Z, SX, SY)
	P3 = np.stack([VX, VY, Z], -1)
	cp = np.array(pos_[:])
	wv = LW * pxk * np.linalg.norm(P3 - cp, axis=-1)[..., None]
	hull_me.vertices.foreach_set('co', (P3 + N_ * wv).astype(np.float32).ravel()); hull_me.update()
	ww = LW * pxk * np.linalg.norm(PW3 - cp, axis=-1)[..., None]
	hullw_me.vertices.foreach_set('co', (PW3 + NW_ * ww).astype(np.float32).ravel()); hullw_me.update()
	# eruption cloud
	base = cloud_base(Z)
	cs = cloud_scale(t)
	set_live('cloud_z', base.z); set_live('cloud_s', cs); set_live('steam_z', SEA_Z)
	for o, hl, P_ in PUFFS:
		if P_['kind'] in ('cv', 'core', 'head'):
			q = cloud_puff(P_, t, base, cs)
			if q is None:
				o.hide_render = hl.hide_render = True; continue
			cpos, rad = q[0], q[1]
			o.color = (0.5 + 0.5 * q[2].x, 0.5 + 0.5 * q[2].y, 0.5 + 0.5 * q[2].z, 1.0)
		else:
			if P_['pt'] is None or t < P_['tb'] or t > P_['tb'] + P_['life']:
				o.hide_render = hl.hide_render = True; continue
			a = (t - P_['tb']) / P_['life']
			rad = P_['rs'] * math.sin(math.pi * min(1, a)) ** 0.7
			cpos = Vector((P_['pt'][0] + 0.05 * a, P_['pt'][1] - 0.02 * a, SEA_Z + rad * 0.5 + P_['rise'] * a))
			if rad < 0.002:
				o.hide_render = hl.hide_render = True; continue
		o.hide_render = hl.hide_render = False
		o.location = cpos; o.scale = (rad, rad, rad * 0.9)
		ww_ = LW * pxk * (cpos - pos_).length
		ww_ *= smooth(rad / (3 * ww_ + 1e-9))                # a newborn puff gets its outline as it grows (no dark dot first)
		hl.location = cpos; hl.scale = (rad + ww_, rad + ww_, rad * 0.9 + ww_)
	# boats, mast lights, wakes
	for (o, lt, wo_), b in zip(BOAT_OBJS, BOATS):
		p, yaw, k = boat_state(b, t)
		o.location = (p[0], p[1], SEA_Z - 0.006)
		o.rotation_euler = (0, 0, yaw - BOW * math.pi / 2)
		lt.location = (p[0], p[1], SEA_Z - 0.006 + 2.4 * bsc)
		vs = []
		wpx = max(0.0035, 1.4 * pxk * (Vector((p[0], p[1], 0)) - pos_).length)
		for arm in (-1, 1):
			for kk in range(NWK):
				tb_ = t - kk * 0.009
				q, yq, _ = boat_state(b, tb_)
				back = kk / (NWK - 1)
				spread = 0.006 + 0.05 * back * clamp01((t - b['t0']) / 1.0)
				nrm_ = (-math.sin(yq), math.cos(yq))
				cx = q[0] + nrm_[0] * arm * spread; cy = q[1] + nrm_[1] * arm * spread
				wd_ = wpx * (1.5 - 1.1 * back)
				vs.append((cx - nrm_[0] * wd_ / 2, cy - nrm_[1] * wd_ / 2, SEA_Z + 0.0006))
				vs.append((cx + nrm_[0] * wd_ / 2, cy + nrm_[1] * wd_ / 2, SEA_Z + 0.0006))
		wo_.data.vertices.foreach_set('co', np.array(vs, np.float32).ravel()); wo_.data.update()

# ------------------------------------------------------------------ screen tracks of key points (for the DOM overlays in Remotion)
def ll_lerp(a, b, k): return (lerp(a[0], b[0], k), lerp(a[1], b[1], k))
if TRACK:
	ARROW = catmull([*SEA_ROUTE, (63.47, -20.222), COAST])[::3]      # the fleet's water path from the mouth to the mainland coast
	harb_ll = ll_lerp(I['harborInner'], MOUTH, 0.35)
	H_LOBE = F73['paths']['harbor_lobe']
	hl_pts = Path_(catmull(H_LOBE, 40))
	hl_arr = np.maximum.accumulate(np.array([ARR[int(round((0.5 - y / HK) * (ny - 1))), int(round((x / WK + 0.5) * (nx - 1)))] for x, y in hl_pts.pts]))
	LOBE_PTS = [xyof(*p) for p in H_LOBE]
	tr = []
	for f in range(1, NF + 1):
		t = tof(f)
		C = cam_at(t)
		Z = zgrid_at(t)
		def S(x, y, agl=0.0, zz=None):
			z_ = hat_grid(Z, x, y) + agl if zz is None else zz
			sx_, sy_, ok = project(C, (x, y, max(z_, SEA_Z)))
			return [round(sx_, 1), round(sy_, 1)] if ok else None
		prog_ = lava_state(t)[0]
		# harbour-lobe front: where the (monotone) arrival along its path equals prog, interpolated between the path samples
		# (no more 6 px steps from one sample to the next)
		kf = int(np.searchsorted(hl_arr, prog_, 'right')) - 1
		if kf < 0: fx_, fy_ = hl_pts.pts[0]
		elif kf >= len(hl_arr) - 1: fx_, fy_ = hl_pts.pts[-1]
		else:
			da = hl_arr[kf + 1] - hl_arr[kf]; kk_ = (prog_ - hl_arr[kf]) / da if da > 1e-9 else 0.0
			fx_, fy_ = hl_pts.pts[kf] * (1 - kk_) + hl_pts.pts[kf + 1] * kk_
		row = {
			'crater': S(CRX.x, CRX.y, 0.01), 'town': S(*xyof(*I['town']), 0.01), 'harbor': S(*xyof(*harb_ll), 0.0, SEA_Z),
			'mouth': S(*xyof(*MOUTH), 0.0, SEA_Z), 'mainland': S(*xyof(*MAINLAND), 0.0, SEA_Z), 'coast': S(*xyof(*COAST), 0.0, SEA_Z),
			'fissure_ne': S(*FA.xy, 0.005), 'fissure_sw': S(*FB.xy, 0.005), 'lava_front': S(fx_, fy_, 0.01),
			'route': [S(*xyof(*p), 0.0, SEA_Z) for p in ARROW],
			'boats': [S(*boat_state(b, t)[0], 0.0, SEA_Z + 0.01) for b in BOATS],
			'town_east': S(*xyof(63.4405, -20.268), 0.01),
			'harbor_lobe': [S(x_, y_, 0.01) for x_, y_ in LOBE_PTS],
		}
		# QA: screen bbox of the eruption cloud (every puff's centre ± its projected radius)
		base_ = cloud_base(Z); cs_ = cloud_scale(t); bb = None
		for _o, _h, P_ in PUFFS:
			if P_['kind'] not in ('cv', 'core', 'head'): continue
			q = cloud_puff(P_, t, base_, cs_)
			if q is None: continue
			sx_, sy_, okp = project(C, q[0])
			if not okp: continue
			rp = q[1] / max(1e-6, (Vector(q[0]) - C[0]).dot(C[1])) / math.tan(math.radians(C[4]) / 2) * 960
			b_ = (sx_ - rp, sy_ - rp, sx_ + rp, sy_ + rp)
			bb = b_ if bb is None else (min(bb[0], b_[0]), min(bb[1], b_[1]), max(bb[2], b_[2]), max(bb[3], b_[3]))
		row['cloud'] = [round(v, 1) for v in bb] if bb else None
		tr.append(row)
	OUTP = ROOT / arg('trackout', 'public/blender/iceland_a')
	OUTP.mkdir(parents=True, exist_ok=True)
	json.dump({'t0': T0, 'fps': FPS, 'frames_total': NF, 'size': [1080, 1920],
	           'note': 'frame k (1-based) shows t = t0 + (k-1)/fps; null = behind the camera',
	           'keys': {'crater': 'Eldfell vent (rises with the cone)', 'town': 'Heimaey town centre', 'harbor': 'harbour basin (Iceland.tsx harbor)',
	                    'mouth': 'harbour mouth', 'mainland': 'fleet destination (Iceland.tsx MAINLAND)', 'fissure_ne': 'fissure NE end',
	                    'fissure_sw': 'fissure SW end', 'lava_front': 'harbour-lobe lava front (moves)', 'route': 'the fleet water path (every 3rd point, harbour mouth → mainland coast)', 'coast': 'mainland coast the fleet heads for',
	                    'boats': 'the 7 boats (Iceland.tsx MOORINGS order)', 'town_east': 'east part of the town (stays in frame; the centre leaves it on the left after ~48 s)',
	                    'harbor_lobe': 'flows.json harbor_lobe path (vent → front_stop), for a crisp DOM arrow «toward the harbour»',
	                    'cloud': 'QA: screen bbox [x0, y0, x1, y1] of the eruption cloud (null before it exists)'},
	           'frames': tr}, open(OUTP / 'track.json', 'w'))
	print('track', len(tr), '→', OUTP / 'track.json'); sys.exit(0)

# ------------------------------------------------------------------ render
OUT.mkdir(parents=True, exist_ok=True)
FROM = int(arg('from', 1)); TO = int(arg('to', NF))
want = [int(x) for x in FRAMES.split(',')] if FRAMES else list(range(FROM, TO + 1))
suffix = arg('suffix', '')
t_all = time.time()
for f in range(1, max(want) + 1):
	full = f in want
	update(f, full)
	sc.frame_set(f)                           # every frame: the fountain particle simulation stays consistent
	if full:
		t_ = time.time()
		sc.render.filepath = str(OUT / f'f_{f:04d}{suffix}.png')
		bpy.ops.render.render(write_still=True)
		print('rendered', f, '%.2f' % tof(f), '%.1fs' % (time.time() - t_), flush=True)
print('done', NF, 'frames total; T0', T0, 'T1', T1, '%.0fs' % (time.time() - t_all))
