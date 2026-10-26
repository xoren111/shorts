"""Shared building blocks of the Hawaii toon shots (tools/blender/hawaii_hook.py, tools/blender/hawaii_raid.py) — the approved
etna_toon.py look (flat toon bands via Shader-to-RGB, crisp land-cover zones, toon lava from the real arrival maps, cartoon puff
smoke with inverted-hull ink, particle lava fountains, violet dusk sky), adapted to Mauna Loa 1935:

  - relief = three nested real grids (hawaii ⊃ hawaii_flow ⊃ hawaii_vent, public/terrain/<r>/height.bin), EXAG 2.2 as in
    src/three/region.ts. The finer grids are resampled on lines of the coarser grid (×5, ×8), cut exactly into its hole and
    blended to its surface at the border → one watertight surface, no z-fight, no cracks;
  - world = km, x east, y north, z up, centred on the hawaii_vent grid (three.js scenes use the same centring: blender
    (x, -z, y));
  - ink outline = inverted hull made per frame by a Geometry-Nodes modifier from the real camera distance (constant ≈ LW px
    for a camera that travels from 1 km to 20 km);
  - land cover = tools/blender/hawaii_zones.py fields (vegetation / forest / young dark lava / light weathered ground);
  - lava = 1935 flow (lava.png R = arrival, lava_edge.png = distance to the margin) + the digitised centreline (ML_PATH,
    data/flows.json) → an incandescent river with chevron ripples travelling downstream, dark crust plates with glowing seams,
    red rim. Every fine feature widens or fades with the view distance (≥ 1.5 px), so nothing shimmers;
  - toon explosions (fireball puffs orange → grey smoke, debris rocks, glowing spatter, dust ring) keyed per frame.
"""
import bpy, bmesh, json, math, sys, time
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
def flag(name):
	return ('--' + name) in argv
FPS = 60
words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']
EXAG = 2.2                                    # src/three/region.ts EXAG.hawaii*
FLOWS = json.load(open(ROOT / 'data/flows.json'))['mauna_loa_1935']
ML_PATH = FLOWS['paths']['main']
LW = float(arg('lw', 2.2))                    # outline width (px at 1080×1920)

# ------------------------------------------------------------------ shot timing
class Shot:
	def __init__(self, t0, t1, pre, out):
		self.T0 = round(t0 * FPS) / FPS                    # frame-exact start (f_0001 = composition frame round(T0·60))
		self.NF = int(round((t1 - self.T0) * FPS)) + 1
		self.T1 = self.T0 + (self.NF - 1) / FPS
		self.PRE = pre
		self.OUT = ROOT / arg('out', out)
		self.FEND = self.NF + self.PRE
	def fr(self, t):
		return 1 + self.PRE + (t - self.T0) * FPS
	def t_of(self, f):
		return self.T0 + (f - 1 - self.PRE) / FPS
S = None

# ------------------------------------------------------------------ node helpers (as etna_toon.py)
def node(nt, kind, loc=(0, 0), **kw):
	n = nt.nodes.new(kind); n.location = loc
	for k, v in kw.items():
		setattr(n, k, v)
	return n
link = lambda nt, a, b: nt.links.new(a, b)
def put(nt, sock, x):
	if x is None: return
	if isinstance(x, (int, float)): sock.default_value = x
	elif isinstance(x, (tuple, list)): sock.default_value = tuple(x) if len(x) == len(sock.default_value) else (*x, 1)
	else: nt.links.new(x, sock)
def M(nt, op, a, b=None, c=None, clamp=False):
	n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
	for k, x in enumerate((a, b, c)):
		put(nt, n.inputs[k], x)
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
def SEPC(nt, c):
	n = nt.nodes.new('ShaderNodeSeparateColor'); put(nt, n.inputs['Color'], c); return n.outputs
def VM(nt, op, a, b=None):
	n = nt.nodes.new('ShaderNodeVectorMath'); n.operation = op
	put(nt, n.inputs[0], a); put(nt, n.inputs[1], b)
	return n.outputs['Value'] if op in ('LENGTH', 'DISTANCE', 'DOT_PRODUCT') else n.outputs['Vector']
def EMIT(nt, col, out_node):
	e_ = nt.nodes.new('ShaderNodeEmission'); put(nt, e_.inputs['Color'], col); e_.inputs['Strength'].default_value = 1.0
	link(nt, e_.outputs[0], out_node.inputs['Surface'])
	return e_
def ATTR(nt, name, kind='GEOMETRY'):
	a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_type = kind; a.attribute_name = name
	return a.outputs['Fac']
def SMOOTH(nt, x, a, b):          # smoothstep-ish clamp((x-a)/(b-a))
	return M(nt, 'DIVIDE', M(nt, 'SUBTRACT', x, a), b - a, clamp=True)

B1, B2 = float(arg('b1', 0.62)), float(arg('b2', 1.12))     # flat ground ≈ 0.8–1.0 → mid band; sun-facing slopes lit
TB = [float(arg('tb1', 1.22)), float(arg('tb2', 1.42))]   # terrain bands (sun only lights, no cast shadows) — set per shot
def toon(nt, shadow, mid, lit, normal=None, bands=None):
	d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (1, 1, 1, 1)
	put(nt, d.inputs['Normal'], normal)
	s2r = nt.nodes.new('ShaderNodeShaderToRGB'); link(nt, d.outputs[0], s2r.inputs[0])
	bw = nt.nodes.new('ShaderNodeRGBToBW'); link(nt, s2r.outputs['Color'], bw.inputs[0])
	if arg('debug') == 'light':
		return bw.outputs[0], bw.outputs[0]
	b1, b2 = bands if bands else (B1, B2)
	return RAMP(nt, bw.outputs[0], [(0.0, shadow), (b1, mid), (b2, lit)]), bw.outputs[0]

def fcurves_of(idblock):
	ad = getattr(idblock, 'animation_data', None)
	if not ad or not ad.action: return []
	act = ad.action
	if hasattr(act, 'fcurves'): return list(act.fcurves)
	out = []
	for layer in act.layers:
		for strip in layer.strips:
			for cb in strip.channelbags: out += list(cb.fcurves)
	return out
def interp_all(ob, kind='LINEAR'):
	for fc in fcurves_of(ob):
		for kp in fc.keyframe_points: kp.interpolation = kind

# ------------------------------------------------------------------ geography
def merc(lat, lon):
	x = (lon + 180) / 360
	s = math.sin(math.radians(lat))
	return x, 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)

class Region:
	def __init__(self, name):
		self.name = name
		self.m = json.load(open(ROOT / f'public/terrain/{name}/meta.json'))
		self.nx, self.ny = self.m['nx'], self.m['ny']
		self.H = np.clip(np.fromfile(ROOT / f'public/terrain/{name}/height.bin', np.float32).reshape(self.ny, self.nx), 0, None)
		mc = self.m['mercator']
		self.x0, self.y0, self.x1, self.y1 = mc['x0'], mc['y0'], mc['x1'], mc['y1']
	def uv(self, mx, my):
		return (mx - self.x0) / (self.x1 - self.x0), (my - self.y0) / (self.y1 - self.y0)     # v from the north edge
	def h(self, mx, my):
		"""bilinear DEM height (m, ≥ 0) at mercator coords (arrays)"""
		u, v = self.uv(np.asarray(mx, np.float64), np.asarray(my, np.float64))
		fx = np.clip(u * (self.nx - 1), 0, self.nx - 1.001); fy = np.clip(v * (self.ny - 1), 0, self.ny - 1.001)
		i = fx.astype(np.int64); j = fy.astype(np.int64); a = fx - i; b = fy - j
		H = self.H
		return H[j, i] * (1 - a) * (1 - b) + H[j, i + 1] * a * (1 - b) + H[j + 1, i] * (1 - a) * b + H[j + 1, i + 1] * a * b

def _box(x, rad, axis):
	pad = [(rad + 1, rad) if k == axis else (0, 0) for k in range(2)]
	c = np.cumsum(np.pad(x, pad, mode='edge'), axis=axis, dtype=np.float64)
	n = x.shape[axis]
	return (np.take(c, np.arange(2 * rad + 1, 2 * rad + 1 + n), axis=axis) - np.take(c, np.arange(0, n), axis=axis)) / (2 * rad + 1)
def gblur(x, s):
	rad = max(1, int(round(s * 1.15)))
	for _ in range(3):
		x = _box(_box(x, rad, 0), rad, 1)
	return x.astype(np.float32)
REG = {r: Region(r) for r in ('hawaii', 'hawaii_flow', 'hawaii_vent')}
# cartoon relief: the 1 m-lidar roughness of the aa flows (≈ 8 m grid) made the toon bands speckle → smooth it away (≈ 20 m);
# the big forms (cones, levees, the rift) stay
REG['hawaii_vent'].H = gblur(REG['hawaii_vent'].H, float(arg('vsmooth', 2.6)))
REG['hawaii_flow'].H = gblur(REG['hawaii_flow'].H, float(arg('fsmooth', 0.8)))
RV = REG['hawaii_vent']
KX = RV.m['width_m'] / 1000 / (RV.x1 - RV.x0)
KY = RV.m['height_m'] / 1000 / (RV.y1 - RV.y0)
CX, CY = (RV.x0 + RV.x1) / 2, (RV.y0 + RV.y1) / 2
def wxy(mx, my):
	return (np.asarray(mx) - CX) * KX, -(np.asarray(my) - CY) * KY
def mxy(x, y):
	return np.asarray(x) / KX + CX, CY - np.asarray(y) / KY
def best_h(x, y):
	"""height (m) of the finest grid that contains the world point(s)"""
	mx, my = mxy(x, y)
	h = REG['hawaii'].h(mx, my)
	for r in ('hawaii_flow', 'hawaii_vent'):
		R = REG[r]; u, v = R.uv(mx, my)
		ins = (u > 0.002) & (u < 0.998) & (v > 0.002) & (v < 0.998)
		h = np.where(ins, R.h(mx, my), h)
	return h
def ground(x, y):
	return float(best_h(np.array([x]), np.array([y]))[0]) / 1000 * EXAG
def P(lat, lon, agl=0.0):
	x, y = wxy(*merc(lat, lon)); x, y = float(x), float(y)
	return Vector((x, y, ground(x, y) + agl))
def Pxy(x, y, agl=0.0):
	return Vector((x, y, ground(x, y) + agl))

G = {'vent': (19.5795, -155.4955), 'summit': (19.4794, -155.6025), 'b0': (19.585, -155.497), 'b1': (19.5905, -155.498),
     'b2': (19.58775, -155.496), 'pond': (19.6866, -155.4666), 'front': (19.6944, -155.3492), 'hilo': (19.7251, -155.0885),
     'mk': (19.8207, -155.4681)}
PATH_W = np.array([[float(v) for v in wxy(*merc(a, b))] for a, b in ML_PATH])     # centreline in world km
PATH_L = float(np.sum(np.linalg.norm(np.diff(PATH_W, axis=0), axis=1)))

def path_fields(x, y):
	"""distance (km) to the 1935 centreline and the along-path distance (km) of the closest point"""
	best = np.full(x.shape, 1e9); along = np.zeros(x.shape); acc = 0.0
	for k in range(len(PATH_W) - 1):
		a, b = PATH_W[k], PATH_W[k + 1]; d = b - a; L2 = float(d @ d); L = math.sqrt(L2)
		t = np.clip(((x - a[0]) * d[0] + (y - a[1]) * d[1]) / L2, 0, 1)
		px = a[0] + t * d[0] - x; py = a[1] + t * d[1] - y
		dist = np.sqrt(px * px + py * py)
		m_ = dist < best
		best = np.where(m_, dist, best); along = np.where(m_, acc + t * L, along)
		acc += L
	return best, along

def on_channel(lat, lon, search_m=90):
	"""nearest point of the lava map's interior (max lava_edge) to a documented target → a blast lands ON the lava
	(cached in out/blender/hawaii_cache/targets.json; Blender's python has no PIL → pixels via bpy)"""
	cf = ROOT / 'out/blender/hawaii_cache/targets.json'
	cache = json.load(open(cf)) if cf.exists() else {}
	key = '%.5f,%.5f,%d' % (lat, lon, search_m)
	if key not in cache:
		def px(fn):
			im = bpy.data.images.load(str(ROOT / f'public/terrain/hawaii_vent/{fn}')); im.colorspace_settings.name = 'Non-Color'
			w_, h_ = im.size; a = np.empty(w_ * h_ * 4, np.float32); im.pixels.foreach_get(a)
			bpy.data.images.remove(im)
			return a.reshape(h_, w_, 4)[::-1, :, 0] * 255
		e = px('lava_edge.png'); l = px('lava.png')
		ny, nx = e.shape
		u, v = RV.uv(*merc(lat, lon)); ci, cj = u * (nx - 1), v * (ny - 1)
		mpp = RV.m['width_m'] / (nx - 1); rr = int(search_m / mpp)
		j0, j1, i0, i1 = int(cj) - rr, int(cj) + rr + 1, int(ci) - rr, int(ci) + rr + 1
		sub = e[j0:j1, i0:i1] * (l[j0:j1, i0:i1] < 200)
		jj, ii = np.mgrid[j0:j1, i0:i1]
		score = sub - 0.3 * np.hypot(jj - cj, ii - ci) * mpp / search_m * 255
		k = np.unravel_index(score.argmax(), score.shape)
		mx = RV.x0 + ii[k] / (nx - 1) * (RV.x1 - RV.x0); my = RV.y0 + jj[k] / (ny - 1) * (RV.y1 - RV.y0)
		x, y = wxy(mx, my)
		cache[key] = [float(x), float(y), float(sub[k])]
		cf.parent.mkdir(parents=True, exist_ok=True); json.dump(cache, open(cf, 'w'), indent=1)
	x, y, _ = cache[key]
	return Vector((x, y, ground(x, y)))

# ------------------------------------------------------------------ scene
def setup_scene(shot, samples=16):
	global S
	S = shot
	bpy.ops.wm.read_factory_settings(use_empty=True)
	sc = bpy.context.scene
	sc.render.engine = 'BLENDER_EEVEE'
	sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
	sc.render.resolution_percentage = int(arg('scale', 100))
	sc.render.fps = FPS
	sc.frame_start, sc.frame_end = 1, shot.FEND
	sc.render.image_settings.file_format = 'PNG'
	sc.render.image_settings.color_mode = 'RGB'
	sc.render.film_transparent = False
	sc.render.filter_size = 1.0
	try:
		sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
	except Exception as e:
		print('view transform', e)
	sc.eevee.taa_render_samples = int(arg('samples', samples))
	try: sc.eevee.use_shadows = True
	except Exception: pass
	# no screen-space «fast GI»: its horizon-scan occlusion made the toon thresholds saw-toothed where puffs overlap
	try: sc.eevee.use_fast_gi = False
	except Exception: pass
	return sc

# ------------------------------------------------------------------ camera (orbit keys → C1 Hermite, as Hawaii.tsx camPath)
class CK:
	def __init__(self, t, target, az, el, dist, fov, v=None, still=False):
		self.t, self.target, self.az, self.el, self.dist, self.fov = t, Vector(target), az, el, dist, fov
		self.v = v or {}; self.still = still

def hermite(keys, vals, t, endvel=(0.6, 0.6)):
	n = len(keys); T = [k.t for k in keys]
	tan = []
	for i, v in enumerate(vals):
		row = []
		for c in range(len(v)):
			f_ = keys[i].v.get(c)
			if f_ is not None: row.append(f_); continue
			if keys[i].still: row.append(0.0); continue
			if i == 0: row.append(endvel[0] * (vals[1][c] - v[c]) / (T[1] - T[0]))
			elif i == n - 1: row.append(endvel[1] * (v[c] - vals[n - 2][c]) / (T[n - 1] - T[n - 2]))
			else: row.append((vals[i + 1][c] - vals[i - 1][c]) / (T[i + 1] - T[i - 1]))
		tan.append(row)
	if t <= T[0]: return [v + tan[0][c] * (t - T[0]) for c, v in enumerate(vals[0])]
	if t >= T[-1]: return [v + tan[-1][c] * (t - T[-1]) for c, v in enumerate(vals[-1])]
	i = 0
	while t > T[i + 1]: i += 1
	h = T[i + 1] - T[i]; u = (t - T[i]) / h; u2 = u * u; u3 = u2 * u
	return [(2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * tan[i][c] + (-2 * u3 + 3 * u2) * vals[i + 1][c] + (u3 - u2) * h * tan[i + 1][c]
	        for c, p0 in enumerate(vals[i])]

class CamPath:
	"""channels 0-2 target, 3 az (deg, 0 = camera south of the target, 90 = east), 4 el, 5 ln dist, 6 fov (vertical, deg)"""
	def __init__(self, keys, endvel=(0.6, 0.6), push=None):
		self.keys, self.endvel, self.push = keys, endvel, push
		self.vals = [[k.target.x, k.target.y, k.target.z, k.az, k.el, math.log(k.dist), k.fov] for k in keys]
	def at(self, t):
		o = hermite(self.keys, self.vals, t, self.endvel)
		tg = Vector(o[:3]); az, el, d, fov = math.radians(o[3]), math.radians(o[4]), math.exp(o[5]), o[6]
		if self.push: d *= self.push(t)
		pos = tg + d * Vector((math.cos(el) * math.sin(az), -math.cos(el) * math.cos(az), math.sin(el)))
		return pos, tg, fov

def build_camera(sc, path):
	cam_d = bpy.data.cameras.new('cam'); cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 36
	cam_d.clip_start = float(arg('near', 0.05)); cam_d.clip_end = 400
	cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
	tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(tgt)
	ct = cam.constraints.new('TRACK_TO'); ct.target = tgt; ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
	for f in range(1, S.FEND + 1):
		pos, tg, fov = path.at(S.t_of(f))
		cam.location = pos; cam.keyframe_insert('location', frame=f)
		tgt.location = tg; tgt.keyframe_insert('location', frame=f)
		cam_d.lens = 18 / math.tan(math.radians(fov) / 2); cam_d.keyframe_insert('lens', frame=f)
	for ob in (cam, tgt, cam_d): interp_all(ob)
	return cam

def pxk(fov):
	"""world size (km) of one 1920-row pixel per km of distance for vertical fov (deg)"""
	return 2 * math.tan(math.radians(fov) / 2) / 1920

# ------------------------------------------------------------------ ink
def ink_material():
	ink = bpy.data.materials.new('ink'); ink.use_nodes = True; ink.use_backface_culling = True
	it_ = ink.node_tree; it_.nodes.clear()
	EMIT(it_, (0.035, 0.02, 0.06), node(it_, 'ShaderNodeOutputMaterial', (300, 0)))
	return ink

def hull_modifier(obj, cam, ink, path):
	"""inverted hull from the live camera distance: every vertex pushed out along its normal by LW px, faces flipped"""
	ng = bpy.data.node_groups.new('hull_' + obj.name, 'GeometryNodeTree')
	ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
	ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
	N = ng.nodes; L_ = ng.links.new
	gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
	oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = cam; oi.transform_space = 'RELATIVE'
	pos = N.new('GeometryNodeInputPosition'); nor = N.new('GeometryNodeInputNormal')
	d = N.new('ShaderNodeVectorMath'); d.operation = 'DISTANCE'; L_(pos.outputs[0], d.inputs[0]); L_(oi.outputs['Location'], d.inputs[1])
	pk = N.new('ShaderNodeValue'); pk.name = 'pxk'
	w = N.new('ShaderNodeMath'); w.operation = 'MULTIPLY'; L_(d.outputs['Value'], w.inputs[0]); L_(pk.outputs[0], w.inputs[1])
	off = N.new('ShaderNodeVectorMath'); off.operation = 'SCALE'; L_(nor.outputs[0], off.inputs[0]); L_(w.outputs[0], off.inputs['Scale'])
	sp = N.new('GeometryNodeSetPosition'); L_(gi.outputs['Geometry'], sp.inputs['Geometry']); L_(off.outputs[0], sp.inputs['Offset'])
	ff = N.new('GeometryNodeFlipFaces'); L_(sp.outputs[0], ff.inputs[0])
	sm = N.new('GeometryNodeSetMaterial'); L_(ff.outputs[0], sm.inputs['Geometry']); sm.inputs['Material'].default_value = ink
	j = N.new('GeometryNodeJoinGeometry'); L_(gi.outputs['Geometry'], j.inputs[0]); L_(sm.outputs[0], j.inputs[0])
	L_(j.outputs[0], go.inputs['Geometry'])
	mod = obj.modifiers.new('hull', 'NODES'); mod.node_group = ng
	for f in range(1, S.FEND + 1, 2):        # (5.x: modifier inputs are no ID props → a keyed Value node in the group)
		pk.outputs[0].default_value = LW * pxk(path.at(S.t_of(f))[2])
		pk.outputs[0].keyframe_insert('default_value', frame=f)
	interp_all(ng)
	return mod

# ------------------------------------------------------------------ terrain: three nested, aligned grids
def build_terrain(sc, cam, ink, path, prog_keys, phase_speed=1.0, glow_rings=(), lite=False):
	from mathutils import Vector
	"""prog_keys = [(t, prog)]; glow_rings = [(Vector, radius_km, strength)] crisp eruption light on the ground"""
	t_ = time.time()
	isl, flo, ven = REG['hawaii'], REG['hawaii_flow'], REG['hawaii_vent']
	s0 = int(arg('s0', 2)); k1 = int(arg('k1', 5)); k2 = int(arg('k2', 6))
	if lite: s0, k1, k2 = 4, 3, 4
	# level 0: island DEM lines (stride s0)
	mx0 = isl.x0 + np.arange(0, isl.nx, s0) / (isl.nx - 1) * (isl.x1 - isl.x0)
	my0 = isl.y0 + np.arange(0, isl.ny, s0) / (isl.ny - 1) * (isl.y1 - isl.y0)
	def sub_lines(lines, a, b, k, margin=1):
		i0 = int(np.searchsorted(lines, a)) + margin; i1 = int(np.searchsorted(lines, b)) - 1 - margin
		fine = np.concatenate([np.linspace(lines[i], lines[i + 1], k + 1)[:-1] for i in range(i0, i1)] + [lines[i1:i1 + 1]])
		return i0, i1, fine
	I0, I1, mx1 = sub_lines(mx0, flo.x0, flo.x1, k1); J0, J1, my1 = sub_lines(my0, flo.y0, flo.y1, k1)
	I0b, I1b, mx2 = sub_lines(mx1, ven.x0, ven.x1, k2); J0b, J1b, my2 = sub_lines(my1, ven.y0, ven.y1, k2)
	levels = []
	# heights per level: own DEM; near the border blended to the parent surface (exact on the shared border lines)
	def grid_h(R, MX, MY):
		return R.h(MX, MY)
	MX0, MY0 = np.meshgrid(mx0, my0); H0 = grid_h(isl, MX0, MY0)
	def parent_sample(Hp, mxp, myp, MX, MY):
		fx = np.interp(MX, mxp, np.arange(len(mxp))); fy = np.interp(MY, myp, np.arange(len(myp)))
		i = np.clip(fx.astype(np.int64), 0, len(mxp) - 2); j = np.clip(fy.astype(np.int64), 0, len(myp) - 2); a = fx - i; b = fy - j
		return Hp[j, i] * (1 - a) * (1 - b) + Hp[j, i + 1] * a * (1 - b) + Hp[j + 1, i] * (1 - a) * b + Hp[j + 1, i + 1] * a * b
	def border_w(n, m, cells_k, band_cells=2.0):
		jj, ii = np.mgrid[0:m, 0:n]
		dmin = np.minimum(np.minimum(ii, n - 1 - ii), np.minimum(jj, m - 1 - jj)) / cells_k
		return np.clip(dmin / band_cells, 0, 1)
	MX1, MY1 = np.meshgrid(mx1, my1)
	b1 = border_w(len(mx1), len(my1), k1)
	z1 = border_w(len(mx1), len(my1), k1, 7.0)        # land-cover fields cross-fade over ≈ 2 km (island → flow)
	H1 = grid_h(flo, MX1, MY1) * b1 + parent_sample(H0, mx0, my0, MX1, MY1) * (1 - b1)
	MX2, MY2 = np.meshgrid(mx2, my2)
	b2 = border_w(len(mx2), len(my2), k2, 2.0)
	z2 = border_w(len(mx2), len(my2), k2, 10.0)       # … and over ≈ 0.6 km (flow → vent)
	H2 = grid_h(ven, MX2, MY2) * b2 + parent_sample(H1, mx1, my1, MX2, MY2) * (1 - b2)
	spec = [('isl', isl, None, MX0, MY0, H0, np.ones_like(H0), np.ones_like(H0), (I0, I1, J0, J1)),
	        ('flow', flo, isl, MX1, MY1, H1, b1, z1, (I0b, I1b, J0b, J1b)),
	        ('vent', ven, flo, MX2, MY2, H2, b2, z2, None)]
	objs = []
	for name, R, Rp, MX, MY, HH, BW, ZW, hole in spec:
		gy, gx = MX.shape
		X, Y = wxy(MX, MY)
		Z = HH / 1000 * EXAG
		Z = np.where(HH < 1.0, -0.08, Z)          # sea floor well below the sea plane (it z-fought far away: striped moiré)
		verts = np.stack([X, Y, Z], -1).reshape(-1, 3).astype(np.float32)
		q = np.arange(gx * gy).reshape(gy, gx)
		F = np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], -1)      # rows run north → south: ccw seen from above (as etna_toon)
		keep = np.ones((gy - 1, gx - 1), bool)
		if hole:
			i0, i1, j0, j1 = hole
			keep[j0:j1, i0:i1] = False
		F = F[keep].reshape(-1, 4)
		# frustum culling over the whole shot: EEVEE re-uploads every mesh for each rendered frame, so the geometry that never
		# enters the (enlarged) view is dropped — the render time is mostly that upload
		vis = np.zeros(len(verts), bool)
		for f_ in list(range(1, S.FEND + 1, 6)) + [S.FEND]:
			cp, ct, fov = path.at(S.t_of(f_))
			fw = (ct - cp).normalized(); rt = fw.cross(Vector((0, 0, 1))).normalized(); upv = rt.cross(fw)
			d_ = verts - np.array(cp, np.float32)
			z_ = d_ @ np.array(fw, np.float32)
			th = math.tan(math.radians(fov) / 2) * 1.3
			ok = z_ > 0.005
			zz = np.maximum(z_, 1e-3)
			ok &= np.abs(d_ @ np.array(rt, np.float32)) < zz * th * 1080 / 1920 + 0.15
			ok &= np.abs(d_ @ np.array(upv, np.float32)) < zz * th + 0.15
			vis |= ok
		fk = vis[F].any(1)
		F = F[fk]
		used = np.unique(F)
		remap = np.full(len(verts), -1, np.int64); remap[used] = np.arange(len(used))
		F = remap[F]
		vsel = used
		verts = verts[vsel]
		print('cull', name, '%d → %d faces' % (len(fk), len(F)))
		me = bpy.data.meshes.new(name)
		me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.ravel())
		me.loops.add(F.size); me.loops.foreach_set('vertex_index', F.ravel().astype(np.int32))
		me.polygons.add(len(F)); me.polygons.foreach_set('loop_start', np.arange(0, F.size, 4, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(len(F), 4, np.int32))
		me.update(); me.validate()
		lidx = F.ravel()
		MXr, MYr = MX.ravel()[vsel], MY.ravel()[vsel]
		def uvlayer(nm, RR):
			u, v = RR.uv(MXr, MYr)
			L = me.uv_layers.new(name=nm); L.data.foreach_set('uv', np.stack([u, 1 - v], -1)[lidx].ravel().astype(np.float32))
		uvlayer('UVo', R)
		uvlayer('UVp', Rp if Rp else R)
		chan, along = path_fields(X.ravel()[vsel], Y.ravel()[vsel])
		for an, av in (('chan', chan), ('along', along), ('bw', BW.ravel()[vsel]), ('zw', ZW.ravel()[vsel])):
			a = me.attributes.new(an, 'FLOAT', 'POINT'); a.data.foreach_set('value', av.astype(np.float32))
		me.polygons.foreach_set('use_smooth', np.ones(len(F), bool))
		ob = bpy.data.objects.new('terr_' + name, me); sc.collection.objects.link(ob)
		ob.data.materials.append(terrain_material(name, R, Rp, prog_keys, phase_speed, glow_rings))
		if ink is not None and arg('outline', 'hull') == 'hull':
			hull_modifier(ob, cam, ink, path)
		objs.append(ob)
		print('terrain', name, gx, gy, len(F), 'faces')
	print('terrain %.1fs' % (time.time() - t_))
	return objs

_imgs = {}
def img(path, cs='Non-Color'):
	if path in _imgs: return _imgs[path]
	im = bpy.data.images.load(str(path)); im.colorspace_settings.name = cs
	try: im.alpha_mode = 'CHANNEL_PACKED'
	except Exception: pass
	_imgs[path] = im
	return im

# (review 18.10: hook/raid were the dullest shots, mean HSV S 0.33–0.37 vs 0.40 of the approved Etna still) warmer terracotta
# rock, deeper violet young lava, saturated ochre for the (now smaller) weathered streaks, a pinker summit
PAL = {'rock': (0.70, 0.28, 0.13), 'ochre': (0.88, 0.52, 0.16), 'dark': (0.15, 0.10, 0.25), 'veg': (0.32, 0.64, 0.12),
       'forest': (0.06, 0.34, 0.10), 'cliff': (0.45, 0.16, 0.10), 'summit': (0.62, 0.30, 0.42)}
ZA = float(arg('za', 0.62))                   # ochre (weathered ground) threshold: > 0.5 keeps only the cores of the streaks

def terrain_material(name, R, Rp, prog_keys, phase_speed, glow_rings):
	mat = bpy.data.materials.new('terr_' + name); mat.use_nodes = True
	nt = mat.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1800, 0))
	uvo = node(nt, 'ShaderNodeUVMap', uv_map='UVo'); uvp = node(nt, 'ShaderNodeUVMap', uv_map='UVp')
	geo = node(nt, 'ShaderNodeNewGeometry'); tc = node(nt, 'ShaderNodeTexCoord')
	pos = SEP(nt, geo.outputs['Position']); nrm = SEP(nt, geo.outputs['Normal'])
	camd = node(nt, 'ShaderNodeCameraData'); vd = camd.outputs['View Distance']
	bw = ATTR(nt, 'bw'); zw = ATTR(nt, 'zw'); chan = ATTR(nt, 'chan'); along = ATTR(nt, 'along')
	def tex(path, uvn):
		t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(path); t.interpolation = 'Cubic'; t.extension = 'EXTEND'
		link(nt, uvn.outputs['UV'], t.inputs['Vector'])
		return t
	def both(fn, wgt=None):  # own map blended to the parent's near the border (fields blended BEFORE thresholds)
		wgt = bw if wgt is None else wgt
		a = tex(fn(R), uvo)
		if Rp is None: return a.outputs['Color'], a.outputs['Alpha']
		b = tex(fn(Rp), uvp)
		return MIX(nt, wgt, b.outputs['Color'], a.outputs['Color']), M(nt, 'ADD', M(nt, 'MULTIPLY', b.outputs['Alpha'], M(nt, 'SUBTRACT', 1.0, wgt)), M(nt, 'MULTIPLY', a.outputs['Alpha'], wgt))
	zc, za = both(lambda r: ROOT / f'out/blender/hawaii_cache/zones_{r.name}.png', zw)
	zs = SEPC(nt, zc)
	# ------------------------------------------------ land cover (crisp zones) + steep cliffs + summit tint
	base = PAL['rock']
	altm = M(nt, 'DIVIDE', pos['Z'], EXAG)                    # real km
	wob = node(nt, 'ShaderNodeTexNoise'); wob.inputs['Scale'].default_value = 0.35; wob.inputs['Detail'].default_value = 1.5
	link(nt, tc.outputs['Object'], wob.inputs['Vector'])
	altw = M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wob.outputs['Fac'], 0.5), 0.35, altm)
	base = MIX(nt, M(nt, 'GREATER_THAN', altw, 3.75), base, PAL['summit'])
	base = MIX(nt, M(nt, 'GREATER_THAN', za, ZA), base, PAL['ochre'])
	base = MIX(nt, M(nt, 'GREATER_THAN', zs['Blue'], 0.5), base, PAL['dark'])
	vegF = M(nt, 'GREATER_THAN', zs['Red'], 0.5)
	base = MIX(nt, vegF, base, PAL['veg'])
	base = MIX(nt, M(nt, 'MULTIPLY', vegF, M(nt, 'GREATER_THAN', zs['Green'], 0.5)), base, PAL['forest'])
	base = MIX(nt, M(nt, 'LESS_THAN', nrm['Z'], 0.5), base, PAL['cliff'])
	beach = M(nt, 'LESS_THAN', pos['Z'], 0.012)
	base = MIX(nt, beach, base, (0.92, 0.78, 0.5))
	band, lum = toon(nt, (0.53, 0.41, 0.72), (0.86, 0.75, 0.88), (1.0, 0.96, 0.9), bands=TB)   # deeper violet shadow band
	shaded = MIX(nt, 1.0, base, band, 'MULTIPLY')
	# crisp eruption light on the ground (wobbly orange rings, no soft falloff)
	for (c_, rad_, st_) in glow_rings:
		dv = VM(nt, 'DISTANCE', geo.outputs['Position'], tuple(c_))
		wn2 = node(nt, 'ShaderNodeTexNoise'); wn2.inputs['Scale'].default_value = 6.0; wn2.inputs['Detail'].default_value = 1.0
		link(nt, tc.outputs['Object'], wn2.inputs['Vector'])
		dvw = M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wn2.outputs['Fac'], 0.5), rad_ * 0.6, dv)
		shaded = MIX(nt, M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', dvw, rad_), st_), shaded, (1.0, 0.5, 0.12))
		shaded = MIX(nt, M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', dvw, rad_ * 0.55), st_ * 0.7), shaded, (1.0, 0.62, 0.2))
	# ------------------------------------------------ lava (1935 flow)
	lc, _ = both(lambda r: ROOT / f'public/terrain/{r.name}/lava.png')
	arr = SEPC(nt, lc)['Red']
	ec, _ = both(lambda r: ROOT / f'public/terrain/{r.name}/lava_edge.png')
	edge = SEPC(nt, ec)['Red']
	prog = node(nt, 'ShaderNodeValue'); prog.label = 'prog'
	phase = node(nt, 'ShaderNodeValue'); phase.label = 'phase'
	onm = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', arr, prog.outputs[0]), M(nt, 'LESS_THAN', arr, 0.99))
	age = M(nt, 'SUBTRACT', prog.outputs[0], arr)
	# the river (active channel) along the digitised centreline: half-width 32 → 48 m, tapering behind the front
	wob3 = node(nt, 'ShaderNodeTexNoise'); wob3.inputs['Scale'].default_value = 2.5; wob3.inputs['Detail'].default_value = 0.5
	link(nt, tc.outputs['Object'], wob3.inputs['Vector'])
	wR = M(nt, 'ADD', M(nt, 'MULTIPLY', SMOOTH(nt, along, 0.0, 4.0), 0.016), 0.032)
	wR = M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wob3.outputs['Fac'], 0.5), 0.022, wR)
	wR = M(nt, 'MULTIPLY', wR, M(nt, 'POWER', SMOOTH(nt, age, 0.0, 0.035), 0.5))
	# never thinner than 1.6 px on screen (far views)
	minw = M(nt, 'MULTIPLY', vd, pxk(40) * 1.6 / 2)
	wR = M(nt, 'MAXIMUM', wR, M(nt, 'MULTIPLY', minw, M(nt, 'GREATER_THAN', wR, 0.004)))
	rc = M(nt, 'DIVIDE', chan, M(nt, 'MAXIMUM', wR, 1e-5))
	riv = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', rc, 1.0), onm)
	# chevron ripples (centre leads), travel downstream; fade before they get thinner than ~3 px
	sR = M(nt, 'SUBTRACT', along, M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', rc, rc), 0.06))
	arcs = M(nt, 'LESS_THAN', M(nt, 'FRACT', M(nt, 'SUBTRACT', M(nt, 'DIVIDE', sR, 0.11), phase.outputs[0])), 0.24)
	arcs = M(nt, 'MULTIPLY', arcs, M(nt, 'SUBTRACT', 1.0, SMOOTH(nt, vd, 11.0, 17.0)))       # fade (not cut) far away
	lev = M(nt, 'ADD', M(nt, 'LESS_THAN', rc, 0.36), M(nt, 'LESS_THAN', rc, 0.72))         # 0 bank … 2 axis
	lev = M(nt, 'SUBTRACT', lev, M(nt, 'MULTIPLY', arcs, M(nt, 'GREATER_THAN', lev, 0.5)))
	rcol = RAMP(nt, M(nt, 'DIVIDE', lev, 2.0), [(0.0, (0.93, 0.24, 0.02)), (0.5, (1.0, 0.52, 0.04)), (1.0, (1.0, 0.86, 0.36))], 'LINEAR')
	# crust plates with glowing seams (seam ≥ 1.5 px), hotter near the river; seams fade out far away
	wn = node(nt, 'ShaderNodeTexNoise'); wn.inputs['Scale'].default_value = 9
	link(nt, tc.outputs['Object'], wn.inputs['Vector'])
	wmix = node(nt, 'ShaderNodeVectorMath', operation='MULTIPLY_ADD'); link(nt, wn.outputs['Color'], wmix.inputs[0]); wmix.inputs[1].default_value = (0.04, 0.04, 0.04); link(nt, tc.outputs['Object'], wmix.inputs[2])
	PL = float(arg('plates', 14))
	vor = node(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE'); vor.inputs['Scale'].default_value = PL
	link(nt, wmix.outputs[0], vor.inputs['Vector'])
	sw = M(nt, 'MAXIMUM', 0.045, M(nt, 'MULTIPLY', vd, pxk(40) * 1.5 * PL))
	seam = M(nt, 'LESS_THAN', vor.outputs['Distance'], sw)
	seam = M(nt, 'MULTIPLY', seam, M(nt, 'SUBTRACT', 1.0, SMOOTH(nt, vd, 7.0, 13.0)))
	dr = M(nt, 'SUBTRACT', chan, wR)                                          # km from the river bank
	seam = M(nt, 'MULTIPLY', seam, M(nt, 'LESS_THAN', M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wn.outputs['Fac'], 0.5), 0.25, dr), 0.26))
	scol = RAMP(nt, SMOOTH(nt, dr, 0.0, 0.45), [(0.0, (1.0, 0.42, 0.03)), (0.3, (0.86, 0.12, 0.02)), (0.7, (0.55, 0.04, 0.02))])
	crust = MIX(nt, 1.0, (0.10, 0.05, 0.09), band, 'MULTIPLY')
	far_crust = MIX(nt, 1.0, (0.20, 0.06, 0.07), band, 'MULTIPLY')
	crust = MIX(nt, SMOOTH(nt, vd, 7.0, 13.0), crust, far_crust)
	lava_c = MIX(nt, seam, crust, scol)
	# red rim along the flow margin (≥ 1.8 px)
	rimw = M(nt, 'MAXIMUM', 0.06, M(nt, 'MULTIPLY', vd, pxk(40) * 1.8 / 0.18))
	rim = M(nt, 'LESS_THAN', edge, rimw)
	lava_c = MIX(nt, rim, lava_c, (0.62, 0.05, 0.02))
	lava_c = MIX(nt, riv, lava_c, rcol)
	# bright advancing front
	fr_ = M(nt, 'LESS_THAN', age, 0.006)
	lava_c = MIX(nt, fr_, lava_c, (1.0, 0.72, 0.2))
	final = MIX(nt, onm, shaded, lava_c)
	if arg('debug') == 'light':
		final = M(nt, 'MULTIPLY', lum, 0.5)
	EMIT(nt, final, out)
	for t, v in prog_keys:
		prog.outputs[0].default_value = v; prog.outputs[0].keyframe_insert('default_value', frame=S.fr(t))
	for f_, v in ((1, 0.0), (S.FEND, (S.FEND - 1) / FPS * phase_speed)):
		phase.outputs[0].default_value = v; phase.outputs[0].keyframe_insert('default_value', frame=f_)
	for fc in fcurves_of(mat.node_tree):
		for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
	return mat

# ------------------------------------------------------------------ sea, sky, sun
def sea(sc, col=(0.10, 0.13, 0.42)):
	bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, 0.004))
	o = bpy.context.object; o.name = 'sea'; m = bpy.data.materials.new('sea'); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	EMIT(t, col, node(t, 'ShaderNodeOutputMaterial', (300, 0)))
	o.data.materials.append(m)
	return o

def violet_sky(sc):
	wd = bpy.data.worlds.new('dusk'); sc.world = wd; wd.use_nodes = True
	wn_ = wd.node_tree; wn_.nodes.clear()
	wo = node(wn_, 'ShaderNodeOutputWorld', (600, 0))
	wtc = node(wn_, 'ShaderNodeTexCoord', (-600, 0))
	wsep = node(wn_, 'ShaderNodeSeparateXYZ', (-400, 0)); link(wn_, wtc.outputs['Generated'], wsep.inputs['Vector'])
	skyc = RAMP(wn_, wsep.outputs['Z'], [(0.0, (1.0, 0.68, 0.45)), (0.07, (1.0, 0.42, 0.52)), (0.18, (0.78, 0.26, 0.62)),
	                                     (0.34, (0.38, 0.16, 0.6)), (0.62, (0.13, 0.07, 0.36))], interp='LINEAR')
	# the gradient is only what the camera sees; the scene is lit by a uniform violet ambient (the gradient's bright peach
	# «ground» below the horizon lit every puff from below → a hard equator band and faceted toon terminators)
	lp = node(wn_, 'ShaderNodeLightPath', (-200, 300))
	amb = float(arg('amb', 0.42))
	col = MIX(wn_, lp.outputs['Is Camera Ray'], (0.62 * amb, 0.52 * amb, 0.78 * amb), skyc)
	wbg = node(wn_, 'ShaderNodeBackground', (200, 0)); link(wn_, col, wbg.inputs['Color']); wbg.inputs['Strength'].default_value = 1.0
	link(wn_, wbg.outputs[0], wo.inputs['Surface'])

def sun(sc, az_deg, el_deg, energy=4.0):
	"""az = compass direction the light COMES FROM (0 = north, 90 = east)"""
	sd = bpy.data.lights.new('sun', 'SUN'); sd.energy = float(arg('sun', energy)); sd.color = (1.0, 0.86, 0.62); sd.angle = math.radians(0.5)
	# no cast shadows: Mauna Loa's gentle slopes barely cast any, and the shadow-map sampling noise made the toon thresholds
	# speckle (per-pixel grain that would shimmer from frame to frame)
	sd.use_shadow = flag('shadows')
	o = bpy.data.objects.new('sun', sd); sc.collection.objects.link(o)
	a = math.radians(az_deg); e = math.radians(el_deg)
	d = Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))     # towards the sun
	o.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
	return o

# ------------------------------------------------------------------ toon puffs
_sph = {}
def sphere_meshes(ink):
	if 'm' in _sph: return _sph['m'], _sph['i']
	# subdivision 4: the big near puffs of the hook plume showed polygonal toon terminators with 3
	sph = bpy.data.meshes.new('puff'); bms = bmesh.new(); bmesh.ops.create_icosphere(bms, subdivisions=4, radius=1.0); bms.to_mesh(sph); bms.free()
	sph.polygons.foreach_set('use_smooth', np.ones(len(sph.polygons), bool))
	ink_m = sph.copy(); ink_m.name = 'puff_ink'
	bmi = bmesh.new(); bmi.from_mesh(ink_m); bmesh.ops.reverse_faces(bmi, faces=bmi.faces); bmi.to_mesh(ink_m); bmi.free()
	ink_m.materials.clear(); ink_m.materials.append(ink)
	_sph['m'], _sph['i'] = sph, ink_m
	return sph, ink_m

def puff_mat(name, shadow, mid, lit, base_z=None, under=(1.0, 0.45, 0.12), under_h=0.0):
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	band_, _ = toon(t, shadow, mid, lit)
	c = band_
	if under_h > 0:
		g_ = node(t, 'ShaderNodeNewGeometry'); pz = SEP(t, g_.outputs['Position'])['Z']
		low = M(t, 'LESS_THAN', pz, base_z + under_h)
		c = MIX(t, M(t, 'MULTIPLY', low, 0.85), c, MIX(t, 0.5, under, band_, 'MULTIPLY'))
	EMIT(t, c, mo)
	return m

def fire_lit_puff_mat(name, shadow, mid, lit, z0, h, strong=(1.0, 0.48, 0.12), soft=(1.0, 0.68, 0.4), up=0.35, th=(0.32, 0.64)):
	"""toon puff lit from below by a lava fountain: g = (1 − (z − z0)/h) + up·(−N.z) → crisp bands: strong orange where g > th[1],
	soft peach where g > th[0], the plain toon bands above (the undersides of the lowest puffs glow, the glow fades up the column)"""
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	band_, _ = toon(t, shadow, mid, lit)
	g_ = node(t, 'ShaderNodeNewGeometry')
	pz = SEP(t, g_.outputs['Position'])['Z']; nz = SEP(t, g_.outputs['Normal'])['Z']
	g = M(t, 'ADD', M(t, 'SUBTRACT', 1.0, M(t, 'DIVIDE', M(t, 'SUBTRACT', pz, z0), h)), M(t, 'MULTIPLY', nz, -up))
	c = MIX(t, M(t, 'GREATER_THAN', g, th[0]), band_, MIX(t, 0.45, soft, band_, 'MULTIPLY'))
	c = MIX(t, M(t, 'GREATER_THAN', g, th[1]), c, MIX(t, 0.3, strong, band_, 'MULTIPLY'))
	EMIT(t, c, mo)
	return m

def key_puff(o, hl, frame, cpos, rad, squash=0.92, path=None, thin_ink=False):
	rad = max(rad, 1e-6)
	o.location = cpos; o.scale = (rad, rad, rad * squash)
	o.keyframe_insert('location', frame=frame); o.keyframe_insert('scale', frame=frame)
	if hl is not None:
		cam_p = path.at(S.t_of(frame))
		ww = LW * pxk(cam_p[2]) * (cpos - cam_p[0]).length
		if thin_ink: ww *= min(1.0, rad / (4 * ww))      # a small (growing / thinning) puff gets a proportionally thin hull: no dark dot
		hl.location = cpos; s_ = rad + ww if rad > 1e-4 else 1e-6; hl.scale = (s_, s_, (rad * squash + ww) if rad > 1e-4 else 1e-6)
		hl.keyframe_insert('location', frame=frame); hl.keyframe_insert('scale', frame=frame)

def puff_column(sc, name, base, height, r0, r1, n, wind, mat_, ink, path, rise=0.12, bend=1.35, spread=0.55, seed=11, step=6):
	"""rising, growing cumulus column (as etna_toon.py), each puff keyed every `step` frames (ink width from the live camera)"""
	rng = np.random.default_rng(seed)
	sph, sph_ink = sphere_meshes(ink)
	sph_m = sph.copy(); sph_m.name = name; sph_m.materials.append(mat_)
	f0, f1 = 1, S.FEND
	for k in range(n):
		s0 = -0.1 + 1.1 * (k + rng.random()) / n
		ang = rng.random() * 2 * math.pi; jr = rng.random() ** 0.5
		ox, oy = math.cos(ang) * jr, math.sin(ang) * jr
		rs = 0.75 + 0.45 * rng.random()
		o = bpy.data.objects.new(f'{name}{k}', sph_m); sc.collection.objects.link(o); o.visible_shadow = False
		hl = None
		if ink is not None:
			hl = bpy.data.objects.new(f'{name}{k}_ink', sph_ink); sc.collection.objects.link(hl); hl.visible_shadow = False
		frames = list(range(f0, f1, step)) + [f1]
		for f_ in frames:
			s = s0 + rise * (f_ - f0) / (f1 - f0)
			sc_ = max(0.0, s)
			rad = (r0 + (r1 - r0) * sc_ ** 0.85) * rs * (min(1.0, 0.35 + s / 0.08) if s < 0.08 else 1.0)
			rad = max(rad, 0.004)
			cpos = base + Vector((wind[0] * height * sc_ ** bend, wind[1] * height * sc_ ** bend, height * s))
			cpos = cpos + Vector((ox, oy, 0)) * rad * spread
			key_puff(o, hl, f_, cpos, rad, path=path)
		interp_all(o)
		if hl: interp_all(hl)

# ------------------------------------------------------------------ lava fountain (particles)
def fountain(sc, a, b, height, count=4000, blob=1.0, name='fount', grav=None):
	g = grav if grav is not None else 0.5
	sc.gravity = (0, 0, -g)
	bpy.ops.mesh.primitive_plane_add(size=1, location=((a + b) / 2 + Vector((0, 0, 0.006))))
	em = bpy.context.object; em.name = name
	d = b - a; em.scale = (d.length, 0.012, 1); em.rotation_euler = (0, 0, math.atan2(d.y, d.x))
	coll = bpy.data.collections.get('blobs')
	if coll is None:
		coll = bpy.data.collections.new('blobs')
		for nm, col, rad in (('blobY', (1.0, 0.80, 0.16), 0.0075), ('blobO', (1.0, 0.36, 0.02), 0.0065), ('blobW', (1.0, 0.96, 0.62), 0.0055)):
			bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rad)
			bl = bpy.context.object; bl.name = nm
			bm_ = bpy.data.materials.new(nm); bm_.use_nodes = True; bn = bm_.node_tree; bn.nodes.clear()
			EMIT(bn, col, node(bn, 'ShaderNodeOutputMaterial', (300, 0)))
			bl.data.materials.append(bm_); bl.location = (0, 0, -50); bl.visible_shadow = False
			sc.collection.objects.unlink(bl); coll.objects.link(bl)
	ps_mod = em.modifiers.new(name, 'PARTICLE_SYSTEM'); ps = ps_mod.particle_system.settings
	VF = math.sqrt(2 * g * height)
	ps.count = count; ps.frame_start = 1; ps.frame_end = S.FEND; ps.lifetime = int(2.1 * VF / g * FPS); ps.lifetime_random = 0.15
	ps.emit_from = 'FACE'; ps.normal_factor = VF; ps.factor_random = VF * 0.25; ps.object_align_factor = (0, 0, 0)
	ps.render_type = 'COLLECTION'; ps.instance_collection = coll; ps.use_collection_pick_random = True; ps.particle_size = blob; ps.size_random = 0.6
	ps.physics_type = 'NEWTON'; ps.mass = 1.0; ps.use_rotations = False
	em.show_instancer_for_render = False
	return em

def _smooth(x):
	x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)

def lava_jet(sc, base, height, rmax, path, name='jet', seed=0, ink_col=(0.42, 0.05, 0.02), lw=1.6):
	"""(review 18.10: «the vent fountain is a scatter of yellow dots») a solid toon lava-fountain BODY standing in the vent: a lathe
	(narrow neck → rounded crown) whose surface wobbles with a slowly animated 4D noise (Geometry Nodes) and whose height
	breathes (sum of slow sines) — nothing steps from frame to frame. Emission in crisp CONSTANT bands from the view-facing
	ratio (pale-yellow core → yellow → orange → red-orange rim), cooler towards the crown, with flowing noise in the band edges;
	a thin dark-red inverted-hull outline (≈ lw px from the live camera distance) keeps it crisp against the cream plume."""
	NR, NA = 30, 28
	bm_ = bmesh.new(); rows = []
	def prof(u):
		if u <= 0.8: return 0.46 + 0.54 * u ** 0.7
		return (0.46 + 0.54 * 0.8 ** 0.7) * math.sqrt(max(0.0, 1 - ((u - 0.8) / 0.2) ** 2))
	z_lo = -0.03
	for k in range(NR):
		u = k / NR
		r_ = rmax * prof(u); z_ = z_lo + (height - z_lo) * u
		rows.append([bm_.verts.new((r_ * math.cos(2 * math.pi * j / NA), r_ * math.sin(2 * math.pi * j / NA), z_)) for j in range(NA)])
	top = bm_.verts.new((0, 0, height))
	for k in range(NR - 1):
		for j in range(NA):
			bm_.faces.new((rows[k][j], rows[k][(j + 1) % NA], rows[k + 1][(j + 1) % NA], rows[k + 1][j]))
	for j in range(NA):
		bm_.faces.new((rows[-1][j], rows[-1][(j + 1) % NA], top))
	me_ = bpy.data.meshes.new(name); bm_.to_mesh(me_); bm_.free()
	me_.polygons.foreach_set('use_smooth', np.ones(len(me_.polygons), bool))
	ob = bpy.data.objects.new(name, me_); sc.collection.objects.link(ob); ob.visible_shadow = False
	ob.location = base
	# ---- material: crisp emission bands
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	tc = node(t, 'ShaderNodeTexCoord')
	lw_ = node(t, 'ShaderNodeLayerWeight'); lw_.inputs['Blend'].default_value = 0.5
	wv = node(t, 'ShaderNodeValue'); wv.label = 'jetW'
	nz_ = node(t, 'ShaderNodeTexNoise'); nz_.noise_dimensions = '4D'; nz_.inputs['Scale'].default_value = 10.0; nz_.inputs['Detail'].default_value = 1.0
	link(t, tc.outputs['Object'], nz_.inputs['Vector']); link(t, wv.outputs[0], nz_.inputs['W'])
	u_ = M(t, 'DIVIDE', SEP(t, tc.outputs['Object'])['Z'], height)
	fac = M(t, 'SUBTRACT', 1.0, lw_.outputs['Facing'])
	fac = M(t, 'ADD', fac, M(t, 'MULTIPLY', u_, -0.32))
	fac = M(t, 'ADD', fac, M(t, 'MULTIPLY', M(t, 'SUBTRACT', nz_.outputs['Fac'], 0.5), 0.5))
	col = RAMP(t, fac, [(0.0, (0.90, 0.20, 0.02)), (0.22, (1.0, 0.42, 0.03)), (0.44, (1.0, 0.74, 0.14)), (0.66, (1.0, 0.95, 0.62))])
	EMIT(t, col, mo)
	me_.materials.append(m)
	# ---- geometry wobble (animated 4D noise, more at the crown) + per-frame height breathing
	ng = bpy.data.node_groups.new(name + '_wob', 'GeometryNodeTree')
	ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
	ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
	N = ng.nodes; L_ = ng.links.new
	gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
	pos = N.new('GeometryNodeInputPosition')
	gw = N.new('ShaderNodeValue'); gw.name = 'jetW'
	sc_ = N.new('ShaderNodeVectorMath'); sc_.operation = 'SCALE'; L_(pos.outputs[0], sc_.inputs[0]); sc_.inputs['Scale'].default_value = 7.0
	gn = N.new('ShaderNodeTexNoise'); gn.noise_dimensions = '4D'; gn.inputs['Detail'].default_value = 0.5; gn.inputs['Scale'].default_value = 1.0
	L_(sc_.outputs[0], gn.inputs['Vector']); L_(gw.outputs[0], gn.inputs['W'])
	sub = N.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; L_(gn.outputs['Color'], sub.inputs[0]); sub.inputs[1].default_value = (0.5, 0.5, 0.5)
	sz = N.new('ShaderNodeSeparateXYZ'); L_(pos.outputs[0], sz.inputs[0])
	wgt = N.new('ShaderNodeMath'); wgt.operation = 'MULTIPLY_ADD'; L_(sz.outputs['Z'], wgt.inputs[0]); wgt.inputs[1].default_value = rmax * 1.5 / height; wgt.inputs[2].default_value = rmax * 0.35
	mul = N.new('ShaderNodeVectorMath'); mul.operation = 'MULTIPLY'; L_(sub.outputs[0], mul.inputs[0]); mul.inputs[1].default_value = (1.0, 1.0, 0.35)
	off = N.new('ShaderNodeVectorMath'); off.operation = 'SCALE'; L_(mul.outputs[0], off.inputs[0]); L_(wgt.outputs[0], off.inputs['Scale'])
	sp = N.new('GeometryNodeSetPosition'); L_(gi.outputs['Geometry'], sp.inputs['Geometry']); L_(off.outputs[0], sp.inputs['Offset'])
	L_(sp.outputs[0], go.inputs['Geometry'])
	mod = ob.modifiers.new('wobble', 'NODES'); mod.node_group = ng
	rng = np.random.default_rng(seed); ph = rng.random(4) * 6.283
	for f_ in range(1, S.FEND + 1):
		tt = S.t_of(f_)
		ob.scale = (1 + 0.03 * math.sin(2 * math.pi * 1.7 * tt + ph[0]), 1 + 0.03 * math.sin(2 * math.pi * 1.5 * tt + ph[1]),
		            1 + 0.06 * math.sin(2 * math.pi * 1.25 * tt + ph[2]) + 0.035 * math.sin(2 * math.pi * 2.7 * tt + ph[3]))
		ob.keyframe_insert('scale', frame=f_)
	for f_ in (1, S.FEND):
		wv.outputs[0].default_value = gw.outputs[0].default_value = 0.9 * S.t_of(f_) + seed * 7.0
		wv.outputs[0].keyframe_insert('default_value', frame=f_); gw.outputs[0].keyframe_insert('default_value', frame=f_)
	interp_all(ob); interp_all(ng)
	for fc in fcurves_of(m.node_tree):
		for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
	# ---- dark-red outline
	ink_j = bpy.data.materials.new(name + '_ink'); ink_j.use_nodes = True; ink_j.use_backface_culling = True
	it_ = ink_j.node_tree; it_.nodes.clear()
	EMIT(it_, ink_col, node(it_, 'ShaderNodeOutputMaterial', (300, 0)))
	global LW
	lw0 = LW; LW = lw
	try: hull_modifier(ob, sc.camera, ink_j, path)
	finally: LW = lw0
	return ob

def glow_disc(sc, centre, r, col, z_off, segs=40, seed=0, name='disc'):
	"""flat glowing pool draped on the relief (as etna_toon.py disc): a wobbly crisp ring"""
	bm_ = bmesh.new(); vs_ = []
	for k in range(segs):
		a_ = 2 * math.pi * k / segs; rr = r * (1 + 0.12 * math.sin(3 * a_ + seed) + 0.06 * math.sin(7 * a_ + 1 + seed))
		x_, y_ = centre.x + math.cos(a_) * rr, centre.y + math.sin(a_) * rr
		vs_.append(bm_.verts.new((x_, y_, ground(x_, y_) + z_off)))
	bm_.faces.new(vs_)
	me_ = bpy.data.meshes.new(name); bm_.to_mesh(me_); bm_.free()
	m_ = bpy.data.materials.new(name); m_.use_nodes = True; t_ = m_.node_tree; t_.nodes.clear()
	EMIT(t_, col, node(t_, 'ShaderNodeOutputMaterial', (300, 0))); me_.materials.append(m_)
	o_ = bpy.data.objects.new(name, me_); sc.collection.objects.link(o_); o_.visible_shadow = False
	return o_

def glow_slit(sc, a, b, width, col=(1.0, 0.92, 0.45), nseg=16):
	sl = bmesh.new(); d = b - a; dn = Vector((-d.y, d.x, 0)).normalized()
	rows_ = []
	for k in range(nseg + 1):
		p_ = a + d * (k / nseg)
		rows_.append([sl.verts.new(Pxy(p_.x + dn.x * s * width, p_.y + dn.y * s * width, 0.004)) for s in (-1, 1)])
	for k in range(nseg):
		sl.faces.new((rows_[k][0], rows_[k + 1][0], rows_[k + 1][1], rows_[k][1]))
	slm = bpy.data.meshes.new('slit'); sl.to_mesh(slm); sl.free()
	m = bpy.data.materials.new('slit'); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	EMIT(t, col, node(t, 'ShaderNodeOutputMaterial', (300, 0)))
	slm.materials.append(m)
	o = bpy.data.objects.new('slit', slm); sc.collection.objects.link(o)
	return o

# ------------------------------------------------------------------ toon explosion
def fire_material():
	"""fireball / smoke puffs: colour from the object's `heat` (1 white-hot … 0 grey smoke); toon shading = the same ramp shifted
	cooler on the mid / shadow side and on the rim, so every puff of the cluster reads on its own"""
	if 'fire' in bpy.data.materials: return bpy.data.materials['fire']
	m = bpy.data.materials.new('fire'); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	heat = ATTR(t, 'heat', 'OBJECT')
	# linear values (Standard view → sRGB): dark smoke 0.09 ≈ 0.33 on screen
	stops = [(0.0, (0.27, 0.23, 0.26)), (0.06, (0.16, 0.13, 0.15)), (0.14, (0.09, 0.07, 0.085)), (0.26, (0.42, 0.07, 0.03)),
	         (0.42, (0.93, 0.30, 0.04)), (0.60, (1.0, 0.52, 0.06)), (0.80, (1.0, 0.74, 0.16)), (1.0, (1.0, 0.90, 0.46))]
	d = t.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (1, 1, 1, 1)
	s2r = t.nodes.new('ShaderNodeShaderToRGB'); link(t, d.outputs[0], s2r.inputs[0])
	bw_ = t.nodes.new('ShaderNodeRGBToBW'); link(t, s2r.outputs['Color'], bw_.inputs[0])
	shift = SEPC(t, RAMP(t, bw_.outputs[0], [(0.0, (0.24, 0, 0)), (B1, (0.11, 0, 0)), (B2, (0.0, 0, 0))]))['Red']
	lw_ = node(t, 'ShaderNodeLayerWeight'); lw_.inputs['Blend'].default_value = 0.5
	rim = M(t, 'MULTIPLY', M(t, 'GREATER_THAN', lw_.outputs['Facing'], 0.66), 0.1)
	glowF = SMOOTH(t, heat, 0.24, 0.36)                 # fire: cooler colour on the shadow side; smoke: plain toon bands
	h2 = M(t, 'SUBTRACT', heat, M(t, 'MULTIPLY', M(t, 'ADD', shift, rim), glowF), clamp=True)
	col = RAMP(t, h2, stops, 'LINEAR')
	band_ = RAMP(t, bw_.outputs[0], [(0.0, (0.62, 0.56, 0.70)), (B1, (0.84, 0.80, 0.88)), (B2, (1.0, 0.98, 0.95))])
	rimband = MIX(t, M(t, 'MULTIPLY', rim, 8.0), band_, MIX(t, 1.0, band_, (0.85, 0.82, 0.9), 'MULTIPLY'))
	EMIT(t, MIX(t, 1.0, col, MIX(t, glowF, rimband, (1, 1, 1)), 'MULTIPLY'), mo)
	return m

def rock_material():
	if 'rock' in bpy.data.materials: return bpy.data.materials['rock']
	m = bpy.data.materials.new('rock'); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	heat = ATTR(t, 'heat', 'OBJECT')
	band_, _ = toon(t, (0.10, 0.07, 0.12), (0.2, 0.13, 0.17), (0.32, 0.2, 0.22))
	hot = RAMP(t, heat, [(0.0, (0.3, 0.05, 0.03)), (0.5, (1.0, 0.36, 0.03)), (1.0, (1.0, 0.82, 0.3))], 'LINEAR')
	EMIT(t, MIX(t, SMOOTH(t, heat, 0.05, 0.35), band_, hot), mo)
	return m

def explosion(sc, name, at, t_hit, R, seed, ink, path, wind=(0.12, 0.04), n_fire=24, n_smoke=16, n_rock=24, n_spat=40, dust=False, hot=1.0, thin=None):
	"""cartoon bomb blast at `at` (world, on the ground) at shot time t_hit, fireball radius ≈ R km; `thin` = (a0, a1, keep): the
	fireball/smoke puffs shrink smoothly to `keep` of their size between ages a0 and a1 s (the cloud thins out as it rises)"""
	rng = np.random.default_rng(seed)
	sph, sph_ink = sphere_meshes(ink)
	fm = fire_material(); rm = rock_material()
	f_hit = S.fr(t_hit)
	fs = list(range(max(1, math.floor(f_hit)), S.FEND + 1))
	ev = []
	def newobj(nm, mesh, mat=None, with_ink=True):
		me_ = mesh
		if mat is not None:
			me_ = mesh.copy(); me_.materials.clear(); me_.materials.append(mat)
		o = bpy.data.objects.new(nm, me_); sc.collection.objects.link(o); o.visible_shadow = False
		o['heat'] = 1.0
		hl = None
		if with_ink and ink is not None:
			hl = bpy.data.objects.new(nm + '_ink', sph_ink); sc.collection.objects.link(hl); hl.visible_shadow = False
		return o, hl
	fire_mesh = sph.copy(); fire_mesh.name = name + '_fire'; fire_mesh.materials.append(fm)
	up = Vector((0, 0, 1)); wv = Vector((wind[0], wind[1], 0))
	# ---- fireball puffs: burst out (ease-out ≈ 0.08 s) on a bumpy shell, cool white-hot → orange → red → dark smoke → grey,
	# rise and drift; smoke puffs join behind/above from 0.1 s and build the column
	HEAT = [(0.0, 1.0), (0.1, 0.84), (0.35, 0.62), (0.7, 0.43), (1.1, 0.26), (1.6, 0.15), (2.4, 0.095), (3.5, 0.06), (6.0, 0.03), (9.0, 0.0)]
	def heat_at(a):
		for (a0, h0), (a1, h1) in zip(HEAT, HEAT[1:]):
			if a <= a1: return h0 + (h1 - h0) * (a - a0) / (a1 - a0)
		return 0.0
	cdir = Vector((0, 0, 1))
	for k in range(n_fire + n_smoke):
		smoke = k >= n_fire
		ph = rng.random() * 2 * math.pi; cz = 0.15 + 0.85 * rng.random()
		dirv = Vector((math.cos(ph) * math.sqrt(1 - cz * cz), math.sin(ph) * math.sqrt(1 - cz * cz), cz))
		core = (k % 5 == 0) and not smoke
		dfin = R * ((0.1 + 0.2 * rng.random()) if core else (0.55 + 0.4 * rng.random())) * (0.7 if smoke else 1.0)
		rfin = R * ((0.45 + 0.15 * rng.random()) if core else (0.26 + 0.2 * rng.random())) * (1.25 if smoke else 1.0)
		delay = (0.1 + 0.6 * rng.random()) if smoke else rng.random() * 0.04
		tsc = ((1.25 + 0.15 * rng.random()) if core else (0.78 + 0.18 * cz + 0.08 * rng.random())) * hot   # the core cools last
		hof = (rng.random() - 0.5) * 0.06
		risev = R * (1.1 + 0.8 * rng.random()) * (1.3 if smoke else 1.0)
		o = bpy.data.objects.new(f'{name}_f{k}', fire_mesh); sc.collection.objects.link(o); o.visible_shadow = False
		hl = None
		if ink is not None:
			hl = bpy.data.objects.new(f'{name}_f{k}_ink', sph_ink); sc.collection.objects.link(hl); hl.visible_shadow = False
		for f in fs:
			age = (f - f_hit) / FPS - delay
			if age <= 0:
				o['heat'] = 1.0; o.keyframe_insert('["heat"]', frame=f)
				key_puff(o, hl, f, at, 0.0, path=path); continue
			e = 1 - math.exp(-age / (0.08 if not smoke else 0.25))
			grow = 1 + 0.6 * min(age, 3.5) ** 0.8
			rad = rfin * (0.12 + 0.88 * e) * grow
			if thin: rad *= 1 - (1 - thin[2]) * _smooth((age - thin[0]) / (thin[1] - thin[0]))
			rise = risev * max(0.0, age - 0.12) ** 1.05
			cpos = at + dirv * dfin * e * (1 + 0.25 * min(age, 2.0)) + up * (rise + rad * 0.3 + (R * 0.35 if smoke else 0)) + wv * R * 6 * max(0.0, age - 0.3) ** 1.2
			heat = min(1.0, max(0.0, heat_at(age / tsc) + hof * min(1.0, 4 * heat_at(age / tsc)))) if not smoke else max(0.05, 0.15 - age * 0.045)
			o['heat'] = heat; o.keyframe_insert('["heat"]', frame=f)
			key_puff(o, hl, f, cpos, rad, squash=0.95, path=path)
		interp_all(o)
		if hl: interp_all(hl)
	# ---- dust ring at the base: puffs run outwards and shrink away (smoothly, no pop)
	if dust:
		dm = puff_mat(name + '_dust', (0.34, 0.20, 0.20), (0.52, 0.32, 0.26), (0.70, 0.46, 0.34))
		dmesh = sph.copy(); dmesh.materials.append(dm)
		for k in range(9):
			ph = 2 * math.pi * (k + 0.3 * rng.random()) / 9
			dv = Vector((math.cos(ph), math.sin(ph), 0))
			o = bpy.data.objects.new(f'{name}_d{k}', dmesh); sc.collection.objects.link(o); o.visible_shadow = False
			hl = None
			if ink is not None:
				hl = bpy.data.objects.new(f'{name}_d{k}_ink', sph_ink); sc.collection.objects.link(hl); hl.visible_shadow = False
			for f in fs:
				age = (f - f_hit) / FPS - 0.03
				if age <= 0:
					key_puff(o, hl, f, at, 0.0, path=path); continue
				e = 1 - math.exp(-age / 0.16)
				p_ = at + dv * R * 1.5 * e
				p_.z = ground(p_.x, p_.y) + R * 0.12
				rad = R * (0.36 + 0.2 * ((k * 7) % 5) / 4) * (0.3 + 0.7 * e) * max(0.0, 1 - max(0.0, age - 0.25) / 0.7) ** 0.7
				key_puff(o, hl, f, p_, rad, squash=0.42, path=path)
			interp_all(o)
			if hl: interp_all(hl)
	# ---- ballistic debris: dark rocks (ink) and glowing spatter (cool down where they land)
	rock_mesh = bpy.data.meshes.new(name + '_rock'); bmr = bmesh.new(); bmesh.ops.create_icosphere(bmr, subdivisions=1, radius=1.0)
	for v in bmr.verts: v.co *= 0.75 + 0.5 * rng.random()
	bmr.to_mesh(rock_mesh); bmr.free(); rock_mesh.materials.append(rm)
	spat_mesh = bpy.data.meshes.new(name + '_spat'); bms = bmesh.new(); bmesh.ops.create_icosphere(bms, subdivisions=2, radius=1.0); bms.to_mesh(spat_mesh); bms.free()
	spat_mesh.materials.append(rm); spat_mesh.polygons.foreach_set('use_smooth', np.ones(len(spat_mesh.polygons), bool))
	gD = 9.0 * R                                # cartoon gravity: arcs ≈ 1.2–2.2 R high in ≈ 1.2 s
	for k in range(n_rock + n_spat):
		spat = k >= n_rock
		ph = rng.random() * 2 * math.pi; tilt = math.radians(10 + 50 * rng.random())
		sp = R * (3.0 + 3.5 * rng.random())
		v0 = Vector((math.cos(ph) * math.sin(tilt), math.sin(ph) * math.sin(tilt), math.cos(tilt))) * sp
		size = R * ((0.045 + 0.05 * rng.random()) if not spat else (0.04 + 0.04 * rng.random()))
		o = bpy.data.objects.new(f'{name}_r{k}', spat_mesh if spat else rock_mesh); sc.collection.objects.link(o); o.visible_shadow = False
		o['heat'] = 1.0 if spat else 0.0
		landed = None
		spin = Vector(rng.normal(size=3)) * 8
		for f in fs:
			age = (f - f_hit) / FPS
			if age <= 0:
				o.location = at; o.scale = (1e-6, 1e-6, 1e-6); o.keyframe_insert('location', frame=f); o.keyframe_insert('scale', frame=f)
				o['heat'] = 1.0 if spat else 0.0; o.keyframe_insert('["heat"]', frame=f); continue
			if landed is None:
				p_ = at + v0 * age + Vector((0, 0, -0.5 * gD * age * age))
				if age > 0.2 and p_.z < ground(p_.x, p_.y):
					p_.z = ground(p_.x, p_.y) + size * 0.3; landed = (p_.copy(), age)
			else:
				p_ = landed[0]
			o.location = p_; s_ = max(1e-6, size * min(1.0, age / 0.04)); o.scale = (s_, s_, s_ * (0.85 if not spat else (1.0 if landed is None else 0.45)))
			o.rotation_euler = tuple(spin * min(age, landed[1] if landed else age))
			o.keyframe_insert('location', frame=f); o.keyframe_insert('scale', frame=f); o.keyframe_insert('rotation_euler', frame=f)
			h_ = (max(0.0, 1 - max(0.0, age - (landed[1] if landed else 9)) / 1.2) if spat else 0.0)
			o['heat'] = h_ if spat else 0.0; o.keyframe_insert('["heat"]', frame=f)
		interp_all(o)
	return ev

def smoke_stem(sc, name, at, t_hit, R, ink, path, wind, dt=0.08, t_first=0.12, seed=7, step=2, r_base=0.3, r_top=0.56,
               fade=(1.8, 4.0), supply=(0.8, 4.3, 0.5)):
	"""(review 18.10: «the bomb's smoke column floats detached from the ground») a dark smoke column ROOTED at the impact: a puff
	is born on the ground every `dt` s from t_hit + t_first to the end of the shot, grows in from nothing (0.35 s), rises and
	drifts with the SAME law as the blast's smoke puffs (explosion(): rise ≈ 1.5 R·a^1.05, drift wind·6R·(a − 0.3)^1.2), so the
	stem runs continuously from the ground up into the fireball's smoke; it widens as it climbs and thins out: every puff
	shrinks to nothing between ages fade[0] and fade[1], and the supply weakens (puffs born later are smaller, down to
	supply[2] between t_hit + supply[0] and t_hit + supply[1]). The base is lit by the burning lava (heat → dark red), cooling
	to smoke grey within ~0.4 s. Keyed every `step` frames (linear); ink hull thinned on small puffs (no dark dots)."""
	rng = np.random.default_rng(seed)
	sph, sph_ink = sphere_meshes(ink)
	fm = fire_material()
	mesh = sph.copy(); mesh.name = name + '_stem'; mesh.materials.clear(); mesh.materials.append(fm)
	up = Vector((0, 0, 1)); wv = Vector((wind[0], wind[1], 0))
	f_hit = S.fr(t_hit)
	fs = list(range(max(1, math.floor(f_hit)), S.FEND + 1, step))
	if fs[-1] != S.FEND: fs.append(S.FEND)
	tb = t_hit + t_first; k = 0
	while tb < S.T1 - 0.1:
		tb_k = tb + (rng.random() - 0.5) * dt * 0.5
		ang = rng.random() * 2 * math.pi; jr = rng.random() ** 0.5
		ox, oy = math.cos(ang) * jr, math.sin(ang) * jr
		rs = 0.7 + 0.6 * rng.random()
		vs = R * (1.25 + 0.5 * rng.random())
		sup = 1 - (1 - supply[2]) * _smooth((tb_k - t_hit - supply[0]) / (supply[1] - supply[0]))
		fire_k = 0.22 * math.exp(-(tb_k - t_hit) / 1.2) + 0.1
		o = bpy.data.objects.new(f'{name}_s{k}', mesh); sc.collection.objects.link(o); o.visible_shadow = False
		o['heat'] = 0.1
		hl = None
		if ink is not None:
			hl = bpy.data.objects.new(f'{name}_s{k}_ink', sph_ink); sc.collection.objects.link(hl); hl.visible_shadow = False
		for f in fs:
			a = S.t_of(f) - tb_k
			if a <= 0:
				o['heat'] = 0.1; o.keyframe_insert('["heat"]', frame=f)
				key_puff(o, hl, f, Vector(at), 0.0, path=path, thin_ink=True); continue
			g = _smooth(a / 0.35) * (1 - _smooth((a - fade[0]) / (fade[1] - fade[0])))
			rad = R * (r_base + (r_top - r_base) * min(1.0, a / 2.5)) * rs * sup * g
			cpos = Vector(at) + up * (vs * a ** 1.05 + rad * 0.6) + wv * R * 6 * max(0.0, a - 0.3) ** 1.2 + Vector((ox, oy, 0)) * rad * 0.75
			o['heat'] = 0.06 + fire_k * math.exp(-a / 0.4); o.keyframe_insert('["heat"]', frame=f)
			key_puff(o, hl, f, cpos, rad, squash=0.95, path=path, thin_ink=True)
		interp_all(o)
		if hl: interp_all(hl)
		tb += dt; k += 1
	print('smoke stem', name, k, 'puffs')

# ------------------------------------------------------------------ flat illustrated clouds (static, far)
def far_clouds(sc, centre, side, groups, mat_):
	sph = bpy.data.meshes.new('cloudsph'); bms = bmesh.new(); bmesh.ops.create_icosphere(bms, subdivisions=3, radius=1.0); bms.to_mesh(sph); bms.free()
	sph.polygons.foreach_set('use_smooth', np.ones(len(sph.polygons), bool))
	rng = np.random.default_rng(5)
	sm_ = sph.copy(); sm_.materials.clear(); sm_.materials.append(mat_)
	for ci, (off, alt_, lat_, size) in enumerate(groups):
		cc0 = centre + off; cc0.z = alt_
		for k in range(9):
			o = bpy.data.objects.new(f'cloud{ci}_{k}', sm_); sc.collection.objects.link(o); o.visible_shadow = False
			r_ = (0.9 + 0.9 * rng.random()) * size
			o.location = cc0 + side * ((k - 4) * 1.1 * size + rng.normal() * 0.3 * size) + Vector((0, 0, rng.random() * 0.6 * size))
			o.scale = (r_ * 1.6, r_ * 1.6, r_ * 0.75)

# ------------------------------------------------------------------ tracks + render loop
def write_track(sc, cam, pts):
	from bpy_extras.object_utils import world_to_camera_view
	tr = []
	for f in range(1 + S.PRE, S.FEND + 1):
		sc.frame_set(f)
		row = {}
		for k_, p_ in pts.items():
			p = p_(f) if callable(p_) else p_
			c_ = world_to_camera_view(sc, cam, p)
			row[k_] = [round(c_.x * 1080, 1), round((1 - c_.y) * 1920, 1)]
		tr.append(row)
	S.OUT.mkdir(parents=True, exist_ok=True)
	json.dump({'t0': S.T0, 'fps': FPS, 'n': len(tr), 'frames': tr}, open(S.OUT / 'track.json', 'w'))
	print('track', len(tr), '→', S.OUT / 'track.json')

def render_loop(sc):
	S.OUT.mkdir(parents=True, exist_ok=True)
	FRAMES = arg('frames')
	FROM = int(arg('from', 1)); TO = int(arg('to', S.NF))
	want = [int(x) + S.PRE for x in FRAMES.split(',')] if FRAMES else list(range(FROM + S.PRE, TO + S.PRE + 1))
	suffix = arg('suffix', '')
	for f in range(1, max(want) + 1):
		sc.frame_set(f)                       # every frame, so the particle simulation is consistent
		if f in want:
			t_ = time.time()
			sc.render.filepath = str(S.OUT / f'f_{f - S.PRE:04d}{suffix}.png')
			bpy.ops.render.render(write_still=True)
			print('rendered', f - S.PRE, 't=%.3f' % S.t_of(f), '%.1fs' % (time.time() - t_), flush=True)
	print('done', S.NF, 'frames; T0', S.T0, 'T1', S.T1)
