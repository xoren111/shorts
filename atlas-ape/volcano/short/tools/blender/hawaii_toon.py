"""Hawaii toon shots — shared scene builder (imported by tools/blender/hawaii_a.py and hawaii_b.py; Blender 5.2, EEVEE).
Same building blocks and look as the approved tools/blender/etna_toon.py (18.10): real relief, flat Shader-to-RGB light bands,
crisp land-cover blobs, toon lava from the real arrival map, cartoon puff clouds with inverted-hull ink, particle fountains,
violet dusk sky, Standard view transform, no blur. Hawaii specifics:
  - two real grids in the three.js frame of the hawaii_flow region (km, x east, y NORTH here, z up × EXAG 2.2): the whole
    island (public/terrain/hawaii, AWS terrarium) around the detailed flow grid (public/terrain/hawaii_flow, USGS 3DEP 1/3″);
  - one shared terrain material keyed on world position, so both grids carry the same colours (no seam): land-cover fields
    (data/blender_hawaii/zw.npy island, zf.npy flow grid, blended over 2 km inside the flow grid; tools/blender/hawaii_prep.py),
    Hilo's built-up area from OSM footprints, altitude bands;
  - cartoon ocean: deep blue, a lighter shallow band and a white surf line around the coast (signed distance coast.npy); line
    widths are in screen pixels (Camera Data · View Distance × the animated pixel size), so they stay crisp at 270 km and 20 km;
  - 1935 Mauna Loa flow from the real arrival map (public/terrain/hawaii_flow/lava.png R, plateau-free float version in
    lava.npy) + a crisp glow rim of constant pixel width (distance outside the flow), so the flow reads from 270 km;
  - Hilo = one stylised toy house per occupied 110 m cell of the real OSM footprints (© OpenStreetMap contributors, ODbL),
    exaggerated so the town reads as a town from 20–80 km.
Camera paths: tools/blender/hawaii_cam.py (port of src/scenes/Hawaii.tsx camPath)."""
import bpy, bmesh, json, math, sys, time
from pathlib import Path
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hawaii_cam as HC

ROOT = Path(__file__).resolve().parents[2]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
FPS = 60
EXAG = HC.EXAG
words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']
D = ROOT / 'data/blender_hawaii'

# ------------------------------------------------------------------ frames (flow grid = scene frame, like Scene3D region 'hawaii_flow')
MF, MW = HC.MF, json.load(open(ROOT / 'public/terrain/hawaii/meta.json'))
WK, HK = HC.WK, HC.HK
HF = HC.HF
HW = np.fromfile(ROOT / 'public/terrain/hawaii/height.bin', np.float32).reshape(MW['ny'], MW['nx'])
fx0, fy0, fx1, fy1 = MF['mercator']['x0'], MF['mercator']['y0'], MF['mercator']['x1'], MF['mercator']['y1']
wm = MW['mercator']
WX0 = ((wm['x0'] - fx0) / (fx1 - fx0) - 0.5) * WK; WX1 = ((wm['x1'] - fx0) / (fx1 - fx0) - 0.5) * WK
WYN = -((wm['y0'] - fy0) / (fy1 - fy0) - 0.5) * HK; WYS = -((wm['y1'] - fy0) / (fy1 - fy0) - 0.5) * HK   # north / south edge (blender y)

def bl(p3):
	return Vector(HC.to_bl(p3))
def P(lat, lon, agl=0.0):
	return bl(HC.at3(lat, lon, agl))
def hat_xy(x, y):
	"""ground height (blender z) at blender x, y: flow grid inside its bbox, island grid outside"""
	if abs(x) < WK / 2 and abs(y) < HK / 2:
		return HC.ground3(x, -y)
	u = (x - WX0) / (WX1 - WX0); v = (WYN - y) / (WYN - WYS)
	fx = min(MW['nx'] - 1.001, max(0, u * (MW['nx'] - 1))); fy = min(MW['ny'] - 1.001, max(0, v * (MW['ny'] - 1)))
	i, j = int(fx), int(fy); a, b = fx - i, fy - j
	h = HW[j, i] * (1 - a) * (1 - b) + HW[j, i + 1] * a * (1 - b) + HW[j + 1, i] * (1 - a) * b + HW[j + 1, i + 1] * a * b
	return max(0.0, float(h)) / 1000 * EXAG
def LL2xy(lat, lon):
	x, z = HC.geo3(lat, lon)
	return x, -z

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
def XYZ(nt, x, y, z=0.0):
	n = nt.nodes.new('ShaderNodeCombineXYZ'); put(nt, n.inputs[0], x); put(nt, n.inputs[1], y); put(nt, n.inputs[2], z); return n.outputs[0]
def VM(nt, op, a, b=None):
	n = nt.nodes.new('ShaderNodeVectorMath'); n.operation = op
	put(nt, n.inputs[0], a); put(nt, n.inputs[1], b)
	return n.outputs['Value'] if op in ('LENGTH', 'DISTANCE', 'DOT_PRODUCT') else n.outputs['Vector']
def EMIT(nt, col, out_node):
	e_ = nt.nodes.new('ShaderNodeEmission'); put(nt, e_.inputs['Color'], col); e_.inputs['Strength'].default_value = 1.0
	link(nt, e_.outputs[0], out_node.inputs['Surface'])
	return e_
def SMIN(nt, a, b): return M(nt, 'MINIMUM', a, b)
def AND(nt, *xs):
	o = xs[0]
	for x in xs[1:]: o = M(nt, 'MULTIPLY', o, x)
	return o
def SEL(nt, f, a, b):
	"""f ? b : a (f is 0/1)"""
	return MIX(nt, f, a, b)

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
def linear_keys(idblock):
	for fc in fcurves_of(idblock):
		for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

def np_image(name, a, interp_alpha=True):
	"""float32 (h, w, c≤4) north-up array → float Blender image (rows bottom-up), alpha channel-packed"""
	h_, w_ = a.shape[:2]
	if a.ndim == 2: a = a[..., None]
	c = a.shape[2]
	f = np.ones((h_, w_, 4), np.float32)
	f[..., :c] = a
	if c == 1: f[..., 1] = f[..., 2] = a[..., 0]
	img = bpy.data.images.new(name, w_, h_, alpha=True, float_buffer=True)
	img.colorspace_settings.name = 'Non-Color'
	img.alpha_mode = 'CHANNEL_PACKED'
	img.pixels.foreach_set(np.ascontiguousarray(f[::-1]).ravel())
	img.pack()
	return img

def _box(x, rad, axis):
	pad = [(rad + 1, rad) if k == axis else (0, 0) for k in range(x.ndim)]
	c = np.cumsum(np.pad(x, pad, mode='edge'), axis=axis)
	n = x.shape[axis]
	return (np.take(c, np.arange(2 * rad + 1, 2 * rad + 1 + n), axis=axis) - np.take(c, np.arange(0, n), axis=axis)) / (2 * rad + 1)
def gblur(x, s):
	"""≈ Gaussian blur (σ = s px) by three box passes, per channel"""
	if s <= 0.3: return x
	rad = max(1, int(round(s * 1.15)))
	for _ in range(3):
		x = _box(_box(x, rad, 0), rad, 1)
	return x
def smooth_normals(me_, z, sx, sy, sigma):
	"""shading normals from the relief blurred by σ grid cells: the toon light bands follow the big landforms only, so no
	1–2 px slivers of the mid band on tiny gullies crawl and flicker while the camera moves"""
	zb = gblur(z.astype(np.float64), sigma)
	dzdx = np.gradient(zb, axis=1) / sx; dzdy = -np.gradient(zb, axis=0) / sy
	n = np.stack([-dzdx, -dzdy, np.ones_like(zb)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
	me_.normals_split_custom_set_from_vertices(n.reshape(-1, 3).astype(np.float32))

# the 3 light bands (lit / mid / shadow) of every toon material (etna_toon.py thresholds)
B1, B2 = float(arg('b1', 0.60)), float(arg('b2', 1.0))
def toon(nt, shadow, mid, lit, normal=None):
	d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (1, 1, 1, 1)
	put(nt, d.inputs['Normal'], normal)
	s2r = nt.nodes.new('ShaderNodeShaderToRGB'); link(nt, d.outputs[0], s2r.inputs[0])
	bw = nt.nodes.new('ShaderNodeRGBToBW'); link(nt, s2r.outputs['Color'], bw.inputs[0])
	return RAMP(nt, bw.outputs[0], [(0.0, shadow), (B1, mid), (B2, lit)]), bw.outputs[0]


class Shot:
	"""one toon shot: T0/T1 (Short timeline s), PRE pre-roll frames, camera function cam(t) → (pos3, tgt3, fov) in three.js axes"""

	def __init__(self, name, T0, T1, cam, PRE=150):
		self.name, self.T0, self.T1, self.cam, self.PRE = name, T0, T1, cam, PRE
		if arg('dbgcam'):              # --dbgcam lat,lon,az,el,dist,fov : a fixed debug camera
			la, lo, az_, el_, di_, fv_ = [float(x) for x in arg('dbgcam').split(',')]
			o_ = HC.key_vals({'ll': (la, lo), 'az': az_, 'el': el_, 'dist': di_, 'fov': fv_})
			self.cam = lambda t, o_=o_: HC.orbit3(o_)
		self.NF = int(round((T1 - T0) * FPS))
		self.SCALE = int(arg('scale', 100))
		self.OUT = ROOT / arg('out', f'out/blender/{name}')
		self.values = {}      # name → value node outputs keyed per frame (shared by every material that asks for it)
		self.anim = {}        # name → f(t)
		self.setup()

	def fr(self, t):
		return 1 + self.PRE + (t - self.T0) * FPS
	def tof(self, f):
		return self.T0 + (f - 1 - self.PRE) / FPS

	# -------------------------------------------------------------- scene
	def setup(self):
		bpy.ops.wm.read_factory_settings(use_empty=True)
		sc = self.sc = bpy.context.scene
		sc.render.engine = 'BLENDER_EEVEE'
		sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
		sc.render.resolution_percentage = self.SCALE
		sc.render.fps = FPS
		sc.frame_start, sc.frame_end = 1, self.NF + self.PRE
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
		self.GRAV = float(arg('grav', 0.5))
		sc.gravity = (0, 0, -self.GRAV)
		# camera (keyed every frame from the exact path; lens from the vertical fov)
		cam_d = bpy.data.cameras.new('cam'); cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 36; cam_d.clip_end = 3000; cam_d.clip_start = float(arg('near', 2.0))
		self.camo = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(self.camo); sc.camera = self.camo
		self.tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(self.tgt)
		ct = self.camo.constraints.new('TRACK_TO'); ct.target = self.tgt; ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
		for f in range(1, self.NF + self.PRE + 1):
			t = max(self.T0, self.tof(f))
			pos, tg, fov = self.cam(t)
			self.camo.location = bl(pos); self.camo.keyframe_insert('location', frame=f)
			self.tgt.location = bl(tg); self.tgt.keyframe_insert('location', frame=f)
			cam_d.lens = 18 / math.tan(math.radians(fov) / 2); cam_d.keyframe_insert('lens', frame=f)
		for ob in (self.camo, self.tgt, cam_d): linear_keys(ob)
		# per-pixel screen scale: pixel size (km) = View Distance × pxk(t), pxk = 2 tan(fov/2) / 1920
		self.value('pxk', lambda t: 2 * math.tan(math.radians(self.cam(t)[2]) / 2) / 1920)

	def camdist(self, t, p):
		pos, _, _ = self.cam(t)
		return (bl(pos) - Vector(p)).length

	def value(self, name, f):
		self.anim[name] = f

	def val(self, nt, name):
		"""a Value node in this node tree whose value follows self.anim[name](t), keyed every frame"""
		n = nt.nodes.new('ShaderNodeValue'); n.label = name
		for fr_ in range(1, self.NF + self.PRE + 1):
			n.outputs[0].default_value = self.anim[name](max(self.T0, self.tof(fr_)))
			n.outputs[0].keyframe_insert('default_value', frame=fr_)
		return n.outputs[0]

	def finish_keys(self, nt_owner):
		linear_keys(nt_owner)

	# -------------------------------------------------------------- terrain: island grid + flow grid, one material
	def terrain(self, lava=True, pal=None):
		sc = self.sc
		def grid_mesh(name, vco, fcs):
			me_ = bpy.data.meshes.new(name)
			me_.vertices.add(len(vco)); me_.vertices.foreach_set('co', vco.ravel())
			me_.loops.add(fcs.size); me_.loops.foreach_set('vertex_index', fcs.ravel().astype(np.int32))
			me_.polygons.add(len(fcs)); me_.polygons.foreach_set('loop_start', np.arange(0, fcs.size, 4, dtype=np.int32)); me_.polygons.foreach_set('loop_total', np.full(len(fcs), 4, np.int32))
			me_.update(); me_.validate()
			me_.polygons.foreach_set('use_smooth', np.ones(len(fcs), bool))
			return me_
		# flow grid
		ny, nx = HF.shape
		ys, xs = np.mgrid[0:ny, 0:nx]
		vx = (xs / (nx - 1) - 0.5) * WK; vy = (0.5 - ys / (ny - 1)) * HK
		# the sea floor sits 30 m (scene units) under the sea plane: coplanar sea and terrain z-fought in the far views
		vz = np.where(HF > 0, HF / 1000 * EXAG, -0.03)
		q = np.arange(nx * ny).reshape(ny, nx)
		faces = np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], -1).reshape(-1, 4)
		fmesh = grid_mesh('flow', np.stack([vx, vy, vz], -1).reshape(-1, 3).astype(np.float32), faces)
		NS = float(arg('nsig', getattr(self, 'nsig', 2.0)))          # normal blur, flow-grid cells (64 m)
		smooth_normals(fmesh, np.clip(HF, 0, None) / 1000 * EXAG, WK / (nx - 1), HK / (ny - 1), NS)
		self.flow_obj = bpy.data.objects.new('flow', fmesh); sc.collection.objects.link(self.flow_obj)
		# island grid in the flow frame (three.js TerrainMesh `frame`: same km axes, same exaggeration, sunk 6 m)
		ny2, nx2 = HW.shape
		ys2, xs2 = np.mgrid[0:ny2, 0:nx2]
		mxs = wm['x0'] + xs2 / (nx2 - 1) * (wm['x1'] - wm['x0']); mys = wm['y0'] + ys2 / (ny2 - 1) * (wm['y1'] - wm['y0'])
		wx = ((mxs - fx0) / (fx1 - fx0) - 0.5) * WK; wy = -((mys - fy0) / (fy1 - fy0) - 0.5) * HK
		hz = np.clip(HW, 0, None)
		hz[0, :] = hz[-1, :] = 0; hz[:, 0] = hz[:, -1] = 0
		wz = np.where(hz > 0, hz / 1000 * EXAG - 0.006, -0.036)
		q2 = np.arange(nx2 * ny2).reshape(ny2, nx2)
		f2 = np.stack([q2[:-1, :-1], q2[1:, :-1], q2[1:, 1:], q2[:-1, 1:]], -1).reshape(-1, 4)
		cx = wx.ravel()[f2]; cy = wy.ravel()[f2]; ch = hz.ravel()[f2]
		cell = (WX1 - WX0) / (nx2 - 1)
		inside = (np.abs(cx) < WK / 2 - cell).all(1) & (np.abs(cy) < HK / 2 - cell).all(1)
		wet = (ch <= 0).all(1)
		f2 = f2[~inside & ~wet]
		wmesh = grid_mesh('island', np.stack([wx, wy, wz], -1).reshape(-1, 3).astype(np.float32), f2)
		cellk = (WX1 - WX0) / (nx2 - 1)
		smooth_normals(wmesh, hz / 1000 * EXAG, cellk, (WYN - WYS) / (ny2 - 1), NS * (WK / (nx - 1)) / cellk)
		self.isl_obj = bpy.data.objects.new('island', wmesh); sc.collection.objects.link(self.isl_obj)
		print('terrain', len(faces), 'flow faces', len(f2), 'island faces')
		mat = self.terrain_material(lava, pal or {})
		fmesh.materials.append(mat); wmesh.materials.append(mat)

	def terrain_material(self, lava, pal):
		mat = bpy.data.materials.new('terr'); mat.use_nodes = True
		nt = mat.node_tree; nt.nodes.clear()
		out = node(nt, 'ShaderNodeOutputMaterial', (2000, 0))
		geo = node(nt, 'ShaderNodeNewGeometry', (-1800, -500))
		tc = node(nt, 'ShaderNodeTexCoord', (-1800, -200))
		camd = node(nt, 'ShaderNodeCameraData', (-1800, -800))
		pos = SEP(nt, geo.outputs['Position']); nrm = SEP(nt, geo.outputs['Normal'])
		px = M(nt, 'MULTIPLY', camd.outputs['View Distance'], self.val(nt, 'pxk'))      # km per screen pixel here
		self.px_terr = px
		uF = M(nt, 'ADD', M(nt, 'DIVIDE', pos['X'], WK), 0.5); vF = M(nt, 'ADD', M(nt, 'DIVIDE', pos['Y'], HK), 0.5)
		uvF = XYZ(nt, uF, vF)
		uW = M(nt, 'DIVIDE', M(nt, 'SUBTRACT', pos['X'], WX0), WX1 - WX0); vW = M(nt, 'DIVIDE', M(nt, 'SUBTRACT', pos['Y'], WYS), WYN - WYS)
		uvW = XYZ(nt, uW, vW)
		def tex(img, uvv, interp='Cubic'):
			t_ = node(nt, 'ShaderNodeTexImage'); t_.image = img; t_.interpolation = interp; t_.extension = 'EXTEND'
			link(nt, uvv, t_.inputs['Vector'])
			s_ = node(nt, 'ShaderNodeSeparateColor'); link(nt, t_.outputs['Color'], s_.inputs['Color'])
			return s_.outputs['Red'], s_.outputs['Green'], s_.outputs['Blue'], t_.outputs['Alpha']
		inF = AND(nt, M(nt, 'GREATER_THAN', uF, 0.0), M(nt, 'LESS_THAN', uF, 1.0), M(nt, 'GREATER_THAN', vF, 0.0), M(nt, 'LESS_THAN', vF, 1.0))
		# blend weight island → flow grid fields over the outer 2 km of the flow grid
		ex = SMIN(nt, SMIN(nt, M(nt, 'MULTIPLY', uF, WK), M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 1.0, uF), WK)),
		          SMIN(nt, M(nt, 'MULTIPLY', vF, HK), M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 1.0, vF), HK)))
		wF = M(nt, 'DIVIDE', ex, 2.0, clamp=True)
		# extra land-cover smoothing per shot (σ in metres on top of the 100 m of hawaii_prep.py): blobs stay ≥ ~2 px on screen
		zsig = float(arg('zsig', getattr(self, 'zsig', 0.0)))
		zwa = np.load(D / 'zw.npy'); zfa = np.load(D / 'zf.npy')
		if zsig > 0:
			zwa = gblur(zwa, zsig / (MW['width_m'] / zwa.shape[1])).astype(np.float32)
			zfa = gblur(zfa, zsig / (MF['width_m'] / zfa.shape[1])).astype(np.float32)
		zw = tex(np_image('zw', zwa), uvW); zf = tex(np_image('zf', zfa), uvF)
		z = [M(nt, 'ADD', a_, M(nt, 'MULTIPLY', wF, M(nt, 'SUBTRACT', b_, a_))) for a_, b_ in zip(zw, zf)]
		urb = tex(np_image('urban', np.load(D / 'urban.npy')), uvF)[0]
		# altitude (real km) with a low-frequency wobble → cartoon contour bands
		wob = node(nt, 'ShaderNodeTexNoise'); wob.inputs['Scale'].default_value = 0.12; wob.inputs['Detail'].default_value = 1.5
		link(nt, tc.outputs['Object'], wob.inputs['Vector'])
		alt = M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wob.outputs['Fac'], 0.5), 0.5, M(nt, 'DIVIDE', pos['Z'], EXAG))
		PAL = {'low': (0.32, 0.66, 0.12), 'green': (0.22, 0.56, 0.13), 'olive': (0.55, 0.62, 0.19), 'tan': (0.66, 0.48, 0.25),
		       'brown': (0.50, 0.30, 0.16), 'rust': (0.42, 0.22, 0.17), 'ash': (0.46, 0.40, 0.48),
		       'forest': (0.05, 0.36, 0.12), 'grass': (0.62, 0.78, 0.22), 'bare': (0.68, 0.36, 0.17), 'young': (0.30, 0.22, 0.33),
		       'town': (0.90, 0.84, 0.72), 'cliff': (0.40, 0.20, 0.14)}
		PAL.update(pal)
		base = RAMP(nt, M(nt, 'DIVIDE', alt, 4.2), [(0.0, PAL['low']), (0.15, PAL['green']), (0.37, PAL['olive']), (0.55, PAL['tan']),
		                                           (0.69, PAL['brown']), (0.84, PAL['rust']), (0.93, PAL['ash'])])
		base = SEL(nt, M(nt, 'GREATER_THAN', z[3], 0.5), base, PAL['grass'])
		base = SEL(nt, M(nt, 'GREATER_THAN', z[2], 0.5), base, PAL['bare'])
		base = SEL(nt, AND(nt, M(nt, 'GREATER_THAN', z[0], 0.5), M(nt, 'LESS_THAN', alt, 2.4)), base, PAL['forest'])
		base = SEL(nt, M(nt, 'GREATER_THAN', z[1], 0.5), base, PAL['young'])
		base = SEL(nt, AND(nt, M(nt, 'GREATER_THAN', urb, 0.5), inF), base, PAL['town'])
		base = SEL(nt, M(nt, 'LESS_THAN', nrm['Z'], 0.5), base, PAL['cliff'])
		band, lum = toon(nt, (0.50, 0.40, 0.62), (0.82, 0.74, 0.84), (1.0, 0.96, 0.9))
		shaded = MIX(nt, 1.0, base, band, 'MULTIPLY')
		self.tn = dict(nt=nt, pos=pos, px=px, uvF=uvF, inF=inF, tc=tc, band=band, tex=tex, geo=geo)
		if lava:
			shaded = self.lava_layer(shaded)
		EMIT(nt, shaded, out)
		linear_keys(nt)
		self.terr_mat = mat
		return mat

	# -------------------------------------------------------------- toon lava (1935 flow, R channel of the arrival map)
	def lava_layer(self, shaded):
		T = self.tn; nt = T['nt']; px = T['px']
		L = np.load(D / 'lava.npy')
		arr, edge, dout, anear = T['tex'](np_image('lava', L), T['uvF'])
		prog = self.val(nt, 'prog'); cool = self.val(nt, 'cool'); phase = self.val(nt, 'phase'); ripv = self.val(nt, 'ripv')
		onm = AND(nt, M(nt, 'LESS_THAN', arr, prog), M(nt, 'LESS_THAN', arr, 0.99), T['inF'])
		age = M(nt, 'SUBTRACT', prog, arr)
		# spatially varying cooling: the crust grows from the margins inwards (edge distance) with an organic noise wobble, so
		# «the lava stops» sweeps over the flow as slowly moving edges (≤ ~2 px per frame) — never a patch switching colour at once
		cn = node(nt, 'ShaderNodeTexNoise'); cn.inputs['Scale'].default_value = 2.2; cn.inputs['Detail'].default_value = 1.0
		link(nt, T['tc'].outputs['Object'], cn.inputs['Vector'])
		c_n = M(nt, 'SUBTRACT', M(nt, 'MULTIPLY', cool, 1.9), M(nt, 'ADD', M(nt, 'MULTIPLY', edge, 0.55), M(nt, 'MULTIPLY', cn.outputs['Fac'], 0.45)), clamp=True)
		# heat: the advancing front is hottest, the channel interior stays hot (orange), margins red
		hfront = M(nt, 'SUBTRACT', 1.0, M(nt, 'DIVIDE', age, float(arg('agew', 0.05))), clamp=True)
		hcore = M(nt, 'MULTIPLY', M(nt, 'GREATER_THAN', edge, 0.45), float(arg('hcore', 0.66)))
		heat = M(nt, 'MULTIPLY', M(nt, 'MAXIMUM', hfront, M(nt, 'ADD', hcore, 0.34)), M(nt, 'SUBTRACT', 1.0, c_n))
		# crust plates (Voronoi on warped coords, ≈ 250 m) — seams = edge distance below a width; plates show only where cooler
		wn = node(nt, 'ShaderNodeTexNoise'); wn.inputs['Scale'].default_value = 3
		link(nt, T['tc'].outputs['Object'], wn.inputs['Vector'])
		wmix = nt.nodes.new('ShaderNodeVectorMath'); wmix.operation = 'MULTIPLY_ADD'; link(nt, wn.outputs['Color'], wmix.inputs[0]); wmix.inputs[1].default_value = (0.12, 0.12, 0.12); link(nt, T['tc'].outputs['Object'], wmix.inputs[2])
		vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = float(arg('plates', 4.5))
		link(nt, wmix.outputs[0], vor.inputs['Vector'])
		# seam width ≥ 2.2 px (in Voronoi units: km × scale) and only while the plates are big enough on screen
		seamw = M(nt, 'MAXIMUM', 0.06, M(nt, 'MULTIPLY', px, 2.2 * float(arg('plates', 4.5))))
		seam = M(nt, 'LESS_THAN', vor.outputs['Distance'], M(nt, 'MULTIPLY', seamw, M(nt, 'SUBTRACT', 1.0, M(nt, 'MULTIPLY', c_n, 0.55))))
		platesOK = M(nt, 'LESS_THAN', px, 0.012)
		seam = M(nt, 'MULTIPLY', seam, platesOK)
		# flow ripples: clean arcs across the channel = iso-lines of the distance travelled from the vent through the flow
		# (lava2.npy, geodesic), bowed downstream in the middle of the channel, travelling with `phase`; their duty shrinks to 0
		# before the spacing gets under ~5 px, so they never turn into shimmering hairlines
		geo_km = T['tex'](np_image('lava2', np.load(D / 'lava2.npy')), T['uvF'])[0]
		RSP = float(arg('ripsp', getattr(self, 'ripsp', 0.24)))
		rr = M(nt, 'FRACT', M(nt, 'SUBTRACT', M(nt, 'DIVIDE', M(nt, 'SUBTRACT', geo_km, M(nt, 'MULTIPLY', edge, 0.13)), RSP), phase))
		duty = M(nt, 'MULTIPLY', 0.22, M(nt, 'DIVIDE', M(nt, 'SUBTRACT', M(nt, 'DIVIDE', RSP, px), 5.0), 5.0, clamp=True))
		arcs = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', rr, duty), ripv)
		warmZ = M(nt, 'GREATER_THAN', heat, 0.3); hotZ = M(nt, 'GREATER_THAN', heat, 0.62)
		h_ = M(nt, 'MULTIPLY', seam, 0.34)
		h_ = M(nt, 'ADD', M(nt, 'MULTIPLY', h_, M(nt, 'SUBTRACT', 1.0, warmZ)), M(nt, 'MULTIPLY', warmZ, M(nt, 'MULTIPLY_ADD', arcs, 0.2, 0.5)))
		h_ = M(nt, 'ADD', M(nt, 'MULTIPLY', h_, M(nt, 'SUBTRACT', 1.0, hotZ)), M(nt, 'MULTIPLY', hotZ, M(nt, 'MULTIPLY_ADD', arcs, 0.14, 0.72)))
		# red rim along the margin (≥ 1.5 px), gone once that part has crusted over
		rimw = M(nt, 'MAXIMUM', 0.07, M(nt, 'DIVIDE', M(nt, 'MULTIPLY', px, 1.5), 0.18))
		rim = AND(nt, M(nt, 'LESS_THAN', edge, rimw), M(nt, 'LESS_THAN', c_n, 0.5))
		h_ = M(nt, 'ADD', M(nt, 'MULTIPLY', h_, M(nt, 'SUBTRACT', 1.0, rim)), M(nt, 'MULTIPLY', rim, 0.46))
		# pale-yellow tip at the advancing front (≥ 3 px long)
		tipw = M(nt, 'MAXIMUM', 0.004, M(nt, 'DIVIDE', M(nt, 'MULTIPLY', px, 3.0), 27.0))
		tip = AND(nt, M(nt, 'LESS_THAN', age, tipw), M(nt, 'LESS_THAN', c_n, 0.35))
		h_ = M(nt, 'MAXIMUM', h_, tip)
		lcol = RAMP(nt, h_, [(0.0, (0.0, 0.0, 0.0)), (0.3, (0.55, 0.03, 0.02)), (0.45, (0.92, 0.10, 0.02)), (0.65, (1.0, 0.36, 0.02)),
		                     (0.82, (1.0, 0.66, 0.08)), (0.95, (1.0, 0.94, 0.52))])
		crust = MIX(nt, 1.0, (0.17, 0.08, 0.11), T['band'], 'MULTIPLY')
		lava_c = SEL(nt, M(nt, 'GREATER_THAN', h_, 0.2), crust, lcol)
		# glow rim OUTSIDE the flow (constant ≈ 2.4 px) + a wider band of lava-lit ground (≈ 6 px, at least 150 m)
		live = AND(nt, M(nt, 'LESS_THAN', anear, prog), M(nt, 'LESS_THAN', anear, 0.99), T['inF'], M(nt, 'SUBTRACT', 1.0, onm))
		glow = M(nt, 'SUBTRACT', 1.0, M(nt, 'MULTIPLY', cool, 1.25), clamp=True)
		halo = AND(nt, live, M(nt, 'LESS_THAN', dout, M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', px, float(arg('halo', 2.4))), glow)))
		lit = AND(nt, live, M(nt, 'LESS_THAN', dout, M(nt, 'MULTIPLY', M(nt, 'MAXIMUM', M(nt, 'MULTIPLY', px, 6.5), 0.15), glow)))
		shaded = MIX(nt, M(nt, 'MULTIPLY', lit, 0.45), shaded, (1.0, 0.5, 0.14))
		shaded = SEL(nt, halo, shaded, (1.0, 0.36, 0.05))
		return SEL(nt, onm, shaded, lava_c)

	# -------------------------------------------------------------- cartoon ocean
	def sea(self):
		bpy.ops.mesh.primitive_plane_add(size=3000, location=(0, 0, 0.002))
		so = bpy.context.object; so.name = 'sea'
		m = bpy.data.materials.new('sea'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
		out = node(nt, 'ShaderNodeOutputMaterial', (900, 0))
		geo = node(nt, 'ShaderNodeNewGeometry'); camd = node(nt, 'ShaderNodeCameraData')
		pos = SEP(nt, geo.outputs['Position'])
		px = M(nt, 'MULTIPLY', camd.outputs['View Distance'], self.val(nt, 'pxk'))
		uW = M(nt, 'DIVIDE', M(nt, 'SUBTRACT', pos['X'], WX0), WX1 - WX0); vW = M(nt, 'DIVIDE', M(nt, 'SUBTRACT', pos['Y'], WYS), WYN - WYS)
		t_ = node(nt, 'ShaderNodeTexImage'); t_.image = np_image('coast', np.load(D / 'coast.npy')); t_.interpolation = 'Cubic'; t_.extension = 'EXTEND'
		link(nt, XYZ(nt, uW, vW), t_.inputs['Vector'])
		dco = node(nt, 'ShaderNodeSeparateColor'); link(nt, t_.outputs['Color'], dco.inputs['Color'])
		# outside the island grid the texture is clamped (EXTEND): add the distance to the grid, or the clamped border values
		# would streak to infinity from wherever the coast comes close to the border
		ddx = M(nt, 'MAXIMUM', M(nt, 'MAXIMUM', M(nt, 'SUBTRACT', WX0, pos['X']), M(nt, 'SUBTRACT', pos['X'], WX1)), 0.0)
		ddy = M(nt, 'MAXIMUM', M(nt, 'MAXIMUM', M(nt, 'SUBTRACT', WYS, pos['Y']), M(nt, 'SUBTRACT', pos['Y'], WYN)), 0.0)
		d = M(nt, 'ADD', dco.outputs['Red'], VM(nt, 'LENGTH', XYZ(nt, ddx, ddy)))
		col = RAMP(nt, M(nt, 'DIVIDE', d, 10.0), [(0.0, (0.10, 0.62, 0.76)), (0.14, (0.05, 0.40, 0.66)), (0.42, (0.02, 0.17, 0.43))])
		ring = AND(nt, M(nt, 'GREATER_THAN', d, M(nt, 'ADD', 1.4, M(nt, 'MULTIPLY', px, 0.0))), M(nt, 'LESS_THAN', d, M(nt, 'ADD', 1.4, M(nt, 'MAXIMUM', M(nt, 'MULTIPLY', px, 2.0), 0.05))))
		col = MIX(nt, M(nt, 'MULTIPLY', ring, 0.55), col, (0.75, 0.92, 1.0))
		# the far sea mirrors the violet dusk sky (crisp bands by the view angle, offshore only): ties the grade to the sky
		if arg('dusk', '1') == '1':
			inc = SEP(nt, geo.outputs['Incoming'])['Z']
			off = M(nt, 'GREATER_THAN', d, 3.0)
			col = MIX(nt, AND(nt, off, M(nt, 'LESS_THAN', inc, float(arg('dusk1', 0.24)))), col, (0.10, 0.13, 0.46))
			col = MIX(nt, AND(nt, off, M(nt, 'LESS_THAN', inc, float(arg('dusk2', 0.17)))), col, (0.26, 0.15, 0.50))
		surf = M(nt, 'LESS_THAN', d, M(nt, 'MAXIMUM', M(nt, 'MULTIPLY', px, 3.2), 0.06))
		col = SEL(nt, surf, col, (0.96, 0.98, 1.0))
		if arg('debug') == 'sea':
			col = M(nt, 'DIVIDE', d, 30.0)
		EMIT(nt, col, out)
		linear_keys(nt)
		so.data.materials.append(m)

	# -------------------------------------------------------------- violet dusk sky + sun (etna_toon colours)
	def sky_sun(self, sun_az=250, sun_el=34, energy=4.0):
		wd = bpy.data.worlds.new('dusk'); self.sc.world = wd; wd.use_nodes = True
		wn_ = wd.node_tree; wn_.nodes.clear()
		wo = node(wn_, 'ShaderNodeOutputWorld', (600, 0))
		wtc = node(wn_, 'ShaderNodeTexCoord', (-600, 0))
		wsep = node(wn_, 'ShaderNodeSeparateXYZ', (-400, 0)); link(wn_, wtc.outputs['Generated'], wsep.inputs['Vector'])
		skyc = RAMP(wn_, wsep.outputs['Z'], [(0.0, (1.0, 0.68, 0.45)), (0.07, (1.0, 0.42, 0.52)), (0.18, (0.78, 0.26, 0.62)),
		                                     (0.34, (0.38, 0.16, 0.6)), (0.62, (0.13, 0.07, 0.36))], interp='LINEAR')
		wbg = node(wn_, 'ShaderNodeBackground', (200, 0)); link(wn_, skyc, wbg.inputs['Color']); wbg.inputs['Strength'].default_value = 1.0
		link(wn_, wbg.outputs[0], wo.inputs['Surface'])
		sun_d = bpy.data.lights.new('sun', 'SUN'); sun_d.energy = float(arg('sun', energy)); sun_d.color = (1.0, 0.86, 0.62); sun_d.angle = math.radians(0.5)
		# --noshadow: no cast shadows (virtual shadow-map detail changes with the camera and flipped the toon bands frame to frame)
		if '--noshadow' in argv: sun_d.use_shadow = False
		sun = bpy.data.objects.new('sun', sun_d); self.sc.collection.objects.link(sun)
		a, e = math.radians(sun_az), math.radians(sun_el)
		Ls = Vector((math.cos(e) * math.sin(a), math.cos(e) * math.cos(a), math.sin(e)))     # towards the sun (compass az)
		sun.rotation_mode = 'QUATERNION'; sun.rotation_quaternion = (-Ls).to_track_quat('-Z', 'Y')

	# -------------------------------------------------------------- ink + toon puffs
	def ink_mat(self):
		if hasattr(self, '_ink'): return self._ink
		ink = bpy.data.materials.new('ink'); ink.use_nodes = True; ink.use_backface_culling = True
		it_ = ink.node_tree; it_.nodes.clear()
		EMIT(it_, (0.035, 0.02, 0.06), node(it_, 'ShaderNodeOutputMaterial', (300, 0)))
		self._ink = ink
		return ink

	def puff_mat(self, name, shadow, mid, lit, base_z=0.0, under=(1.0, 0.45, 0.12), under_h=0.0, light=None, b=(-0.15, 0.38)):
		"""toon puff; with `light` (world vector towards a virtual key light) the 3 bands come from N·L instead of the scene
		sun, so the cloud always shows a lit side and a lavender shadow side to this shot's camera"""
		m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
		mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
		if light is None:
			band_, _ = toon(t, shadow, mid, lit)
		else:
			g0 = node(t, 'ShaderNodeNewGeometry')
			Lv = Vector(light).normalized()
			ndl = VM(t, 'DOT_PRODUCT', g0.outputs['Normal'], tuple(Lv))
			band_ = RAMP(t, M(t, 'MULTIPLY_ADD', ndl, 0.5, 0.5), [(0.0, shadow), (0.5 + 0.5 * b[0], mid), (0.5 + 0.5 * b[1], lit)])
		c = band_
		if under_h > 0:
			g_ = node(t, 'ShaderNodeNewGeometry'); pz = SEP(t, g_.outputs['Position'])['Z']
			low = M(t, 'LESS_THAN', pz, base_z + under_h)
			c = MIX(t, M(t, 'MULTIPLY', low, 0.85), c, MIX(t, 0.5, under, band_, 'MULTIPLY'))
		EMIT(t, c, mo)
		return m

	def sphere_meshes(self):
		if hasattr(self, '_sph'): return self._sph
		sph = bpy.data.meshes.new('puff'); bms = bmesh.new(); bmesh.ops.create_icosphere(bms, subdivisions=3, radius=1.0); bms.to_mesh(sph); bms.free()
		sph.polygons.foreach_set('use_smooth', np.ones(len(sph.polygons), bool))
		sph_ink = sph.copy(); sph_ink.name = 'puff_ink'
		bmi = bmesh.new(); bmi.from_mesh(sph_ink); bmesh.ops.reverse_faces(bmi, faces=bmi.faces); bmi.to_mesh(sph_ink); bmi.free()
		sph_ink.materials.clear(); sph_ink.materials.append(self.ink_mat())
		self._sph = (sph, sph_ink)
		return self._sph

	def puffs(self, name, items, mat_, lw=2.2, step=6):
		"""items: list of f(t) → (centre Vector, radius km, squash) or None (hidden). Each puff + its ink hull are keyed every
		`step` frames (linear); the hull is thicker by ≈ lw px at the puff's current camera distance."""
		sph, sph_ink = self.sphere_meshes()
		sm = sph.copy(); sm.name = name; sm.materials.append(mat_)
		frames = list(range(1, self.NF + self.PRE + 1, step))
		if frames[-1] != self.NF + self.PRE: frames.append(self.NF + self.PRE)
		for k, fn in enumerate(items):
			o = bpy.data.objects.new(f'{name}{k}', sm); self.sc.collection.objects.link(o); o.visible_shadow = False
			hl = bpy.data.objects.new(f'{name}{k}_ink', sph_ink); self.sc.collection.objects.link(hl); hl.visible_shadow = False
			for f_ in frames:
				t = max(self.T0, self.tof(f_))
				r = fn(t)
				if r is None:
					c, rad, sq = Vector((0, 0, -50)), 0.0001, 1.0
				else:
					c, rad, sq = r
				pxk = 2 * math.tan(math.radians(self.cam(t)[2]) / 2) / 1920
				ww = lw * pxk * self.camdist(t, c)
				ww *= min(1.0, rad / (4 * ww))          # a tiny (growing) puff gets a proportionally thin hull: no dark dot
				o.location = c; o.scale = (rad, rad, rad * sq)
				hl.location = c; hl.scale = (rad + ww, rad + ww, rad * sq + ww)
				for ob in (o, hl):
					ob.keyframe_insert('location', frame=f_); ob.keyframe_insert('scale', frame=f_)
			linear_keys(o); linear_keys(hl)

	# -------------------------------------------------------------- particle lava fountain + glowing slit along a short fissure
	def fountain(self, a, b, height, count, size, slit_w):
		sc = self.sc
		bpy.ops.mesh.primitive_plane_add(size=1, location=((a + b) / 2 + Vector((0, 0, 0.01))))
		em = bpy.context.object; em.name = 'fissure'
		d = b - a; em.scale = (d.length, slit_w * 0.6, 1); em.rotation_euler = (0, 0, math.atan2(d.y, d.x))
		blobs = bpy.data.collections.new('blobs')
		for nm, col, rad in (('blobY', (1.0, 0.80, 0.16), 1.0), ('blobO', (1.0, 0.36, 0.02), 0.85), ('blobW', (1.0, 0.96, 0.62), 0.7)):
			bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rad * size)
			blob = bpy.context.object; blob.name = nm
			bm_ = bpy.data.materials.new(nm); bm_.use_nodes = True; bn = bm_.node_tree; bn.nodes.clear()
			EMIT(bn, col, node(bn, 'ShaderNodeOutputMaterial', (300, 0)))
			blob.data.materials.append(bm_)
			blob.location = (0, 0, -50); blob.visible_shadow = False
			sc.collection.objects.unlink(blob); blobs.objects.link(blob)
		ps_mod = em.modifiers.new('fount', 'PARTICLE_SYSTEM'); ps = ps_mod.particle_system.settings
		VF = math.sqrt(2 * self.GRAV * height)
		ps.count = count; ps.frame_start = 1; ps.frame_end = self.NF + self.PRE; ps.lifetime = int(2.1 * VF / self.GRAV * FPS); ps.lifetime_random = 0.15
		ps.emit_from = 'FACE'; ps.normal_factor = VF; ps.factor_random = VF * 0.24
		ps.render_type = 'COLLECTION'; ps.instance_collection = blobs; ps.use_collection_pick_random = True; ps.particle_size = 1.0; ps.size_random = 0.6
		ps.physics_type = 'NEWTON'; ps.mass = 1.0; ps.use_rotations = False
		em.show_instancer_for_render = False
		sl = bmesh.new(); nseg = 24; dn = Vector((-d.y, d.x, 0)).normalized()
		rows_ = []
		for k in range(nseg + 1):
			p_ = a + d * (k / nseg)
			rows_.append([sl.verts.new(Vector((p_.x + dn.x * s * slit_w, p_.y + dn.y * s * slit_w, hat_xy(p_.x + dn.x * s * slit_w, p_.y + dn.y * s * slit_w) + 0.006))) for s in (-1, 1)])
		for k in range(nseg):
			sl.faces.new((rows_[k][0], rows_[k + 1][0], rows_[k + 1][1], rows_[k][1]))
		slm = bpy.data.meshes.new('slit'); sl.to_mesh(slm); sl.free()
		slmat = bpy.data.materials.new('slit'); slmat.use_nodes = True; snt = slmat.node_tree; snt.nodes.clear()
		EMIT(snt, (1.0, 0.92, 0.45), node(snt, 'ShaderNodeOutputMaterial', (300, 0)))
		slm.materials.append(slmat)
		sc.collection.objects.link(bpy.data.objects.new('slit', slm))

	# -------------------------------------------------------------- Hilo: toy houses from the real OSM footprints
	def hilo(self, cell=0.16, size=(0.09, 0.13), height=(0.05, 0.075)):
		sc = self.sc
		rng = np.random.default_rng(7)
		house = bpy.data.meshes.new('house'); bmh = bmesh.new()
		bmesh.ops.create_cube(bmh, size=1.0)
		for v in bmh.verts: v.co.z += 0.5
		bmh.to_mesh(house); bmh.free()
		roof = bpy.data.meshes.new('roof'); bmr = bmesh.new()
		pts = [(-0.56, -0.56, 1.0), (0.56, -0.56, 1.0), (0.56, 0.56, 1.0), (-0.56, 0.56, 1.0), (0, -0.56, 1.5), (0, 0.56, 1.5)]
		vs = [bmr.verts.new(p) for p in pts]
		for f in ((0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4)): bmr.faces.new([vs[i] for i in f])
		bmesh.ops.recalc_face_normals(bmr, faces=bmr.faces)
		bmr.to_mesh(roof); bmr.free()
		def house_mat(name, stops):
			m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
			mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
			oi = node(t, 'ShaderNodeObjectInfo')
			col = RAMP(t, oi.outputs['Random'], stops)
			band_, _ = toon(t, (0.42, 0.38, 0.62), (0.78, 0.74, 0.84), (1.0, 0.96, 0.88))
			c_ = MIX(t, 1.0, col, band_, 'MULTIPLY')
			# far away (a house < ~2.5 px) the toy houses melt into the flat town-ground colour: no sub-pixel twinkle
			camd_ = node(t, 'ShaderNodeCameraData')
			pxh = M(t, 'MULTIPLY', camd_.outputs['View Distance'], self.val(t, 'pxk'))
			far = M(t, 'DIVIDE', M(t, 'SUBTRACT', pxh, 0.045), 0.04, clamp=True)
			c_ = MIX(t, far, c_, (0.90 * 0.82, 0.84 * 0.74, 0.72 * 0.84))
			EMIT(t, c_, mo)
			linear_keys(t)
			return m
		# plantation-town palette: white / cream / pastel walls, red, teal-green and grey corrugated roofs
		wall_m = house_mat('wall', [(0.0, (0.97, 0.95, 0.88)), (0.3, (0.98, 0.88, 0.55)), (0.5, (0.72, 0.86, 0.95)), (0.66, (0.98, 0.74, 0.66)),
		                            (0.82, (0.95, 0.94, 0.90))])
		roof_m = house_mat('roof', [(0.0, (0.82, 0.18, 0.08)), (0.4, (0.10, 0.52, 0.48)), (0.62, (0.86, 0.30, 0.10)), (0.8, (0.40, 0.42, 0.50))])
		house.materials.append(wall_m); roof.materials.append(roof_m)
		osm = json.load(open(ROOT / 'data/osm_hilo/buildings.json'))['elements']
		cells = {}
		for el_ in osm:
			g_ = el_.get('geometry') or []
			if len(g_) < 3: continue
			lat = sum(p_['lat'] for p_ in g_) / len(g_); lon = sum(p_['lon'] for p_ in g_) / len(g_)
			x, y = LL2xy(lat, lon)
			xs_ = [(p_['lon'] - lon) * 111.32 * math.cos(math.radians(lat)) for p_ in g_]; ys_ = [(p_['lat'] - lat) * 110.57 for p_ in g_]
			ar = 0.5 * abs(sum(xs_[k] * ys_[k + 1] - xs_[k + 1] * ys_[k] for k in range(len(g_) - 1)))
			ed = max(range(len(g_) - 1), key=lambda k: (xs_[k + 1] - xs_[k]) ** 2 + (ys_[k + 1] - ys_[k]) ** 2)
			ang = math.atan2(ys_[ed + 1] - ys_[ed], xs_[ed + 1] - xs_[ed])
			key = (int(math.floor(x / cell)), int(math.floor(y / cell)))
			c_ = cells.setdefault(key, [0.0, 0.0, 0.0, 0, 0.0, 0.0])
			c_[0] += x * ar; c_[1] += y * ar; c_[2] += ar; c_[3] += 1
			if ar > c_[5]: c_[4], c_[5] = ang, ar
		placed = 0
		self.houses = []
		for key, (sx, sy, sa, n, ang, amax) in cells.items():
			if n < 3 and sa < 0.0006: continue
			x, y = sx / sa, sy / sa
			x += (rng.random() - 0.5) * cell * 0.3; y += (rng.random() - 0.5) * cell * 0.3
			z = hat_xy(x, y)
			if z < 0.004: continue
			big = min(1.0, sa / 0.008)
			w_ = size[0] + (size[1] - size[0]) * max(rng.random(), big)
			d_ = w_ * (0.7 + 0.25 * rng.random())
			hgt = height[0] + (height[1] - height[0]) * rng.random()
			for mesh_, nm in ((house, 'h'), (roof, 'r')):
				o = bpy.data.objects.new(nm, mesh_); o.location = (x, y, z - 0.004)
				o.scale = (w_, d_, hgt); o.rotation_euler = (0, 0, ang)
				sc.collection.objects.link(o)
			self.houses.append((x, y, z))
			placed += 1
		print('houses', placed, 'cells', len(cells))

	# -------------------------------------------------------------- cartoon trees (Kenney Nature Kit, CC0) on the real forest zones
	def trees(self, centre, radius, n, size=(0.055, 0.085), files=('tree_default.glb', 'tree_oak.glb', 'tree_fat.glb', 'tree_detailed.glb'), seed=21):
		"""up to n toy trees inside `radius` km of `centre` (blender xy) where the flow-grid land-cover says forest (zf R > 0.5,
		below 2.4 km), never on the 1935 flow (≥ 120 m from it); exaggerated (size = crown height, km) so they read from 20 km"""
		sc = self.sc
		# crowns in the forest zone's own greens (lit tops a little lighter), so the toy forest blends into the flat forest
		leaf_m = self.puff_mat('leaf', (0.025, 0.20, 0.08), (0.045, 0.33, 0.11), (0.12, 0.50, 0.15))
		bark_m = self.puff_mat('bark', (0.22, 0.12, 0.06), (0.36, 0.2, 0.1), (0.5, 0.3, 0.16))
		meshes = []
		for tf in files:
			before = set(bpy.data.objects)
			bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/cc0/kenney-nature-kit/Models/GLTF format' / tf))
			new = [o for o in bpy.data.objects if o not in before]
			for o in new:
				if o.type == 'MESH':
					me_ = o.data
					for i_, sl_ in enumerate(me_.materials):
						col_ = sl_.diffuse_color if sl_ else (0, 1, 0, 1)
						me_.materials[i_] = leaf_m if col_[1] > col_[0] else bark_m
					hz = max(v.co.z for v in me_.vertices) if len(me_.vertices) else 1.0
					hy = max(v.co.y for v in me_.vertices) if len(me_.vertices) else 1.0
					meshes.append((me_, hy))           # Kenney glTF meshes are Y-up (the object carries the +90° X turn)
				for c_ in list(o.users_collection): c_.objects.unlink(o)
		zf = np.load(D / 'zf.npy'); L = np.load(D / 'lava.npy')
		rng = np.random.default_rng(seed)
		placed = 0
		for k in range(n * 12):
			if placed >= n: break
			a_ = rng.random() * 2 * math.pi; r_ = radius * math.sqrt(rng.random())
			x, y = centre[0] + math.cos(a_) * r_, centre[1] + math.sin(a_) * r_
			u, v = x / WK + 0.5, 0.5 - y / HK
			if not (0.02 < u < 0.98 and 0.02 < v < 0.98): continue
			zz = zf[int(v * (zf.shape[0] - 1)), int(u * (zf.shape[1] - 1))]
			ll = L[int(v * (L.shape[0] - 1)), int(u * (L.shape[1] - 1))]
			if zz[0] < 0.5 or ll[0] < 0.99 or ll[2] < 0.12: continue
			z = hat_xy(x, y)
			if z / EXAG > 2.4 or z < 0.01: continue
			me_, hh = meshes[int(rng.random() * len(meshes))]
			dcam = self.camdist(0.5 * (self.T0 + self.T1), Vector((x, y, z)))
			pxk_ = 2 * math.tan(math.radians(self.cam(0.5 * (self.T0 + self.T1))[2]) / 2) / 1920
			k_ = max(1.0, (9.5 * pxk_ * dcam) / size[0])          # far crowns grow so they stay ≥ ~9 px on screen
			s_ = (size[0] + (size[1] - size[0]) * rng.random()) * k_ / hh
			o = bpy.data.objects.new('tree', me_); sc.collection.objects.link(o)
			o.location = (x, y, z - 0.004); o.scale = (s_, s_, s_ * 1.1); o.rotation_euler = (math.pi / 2, 0, rng.random() * 6.28)
			placed += 1
		print('trees', placed)

	# -------------------------------------------------------------- tracks + render
	def track(self, pts_fn, path):
		"""pts_fn(t) → {name: blender Vector or [Vector, …]}; writes per-frame screen px (1080×1920) to `path`"""
		from bpy_extras.object_utils import world_to_camera_view
		sc = self.sc
		tr = []
		for f in range(1 + self.PRE, self.NF + self.PRE + 1):
			sc.frame_set(f)
			t = self.tof(f)
			row = {}
			for k_, p_ in pts_fn(t).items():
				pl = p_ if isinstance(p_, list) else [p_]
				sp = []
				for q in pl:
					c_ = world_to_camera_view(sc, self.camo, q)
					sp.append([round(c_.x * 1080, 1), round((1 - c_.y) * 1920, 1)] if c_.z > 0 else None)
				row[k_] = sp if isinstance(p_, list) else sp[0]
			tr.append(row)
		path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
		json.dump({'t0': self.T0, 'fps': FPS, 'n': len(tr), 'frames': tr}, open(path, 'w'))
		print('track', len(tr), '→', path)

	def render(self):
		self.OUT.mkdir(parents=True, exist_ok=True)
		FRAMES = arg('frames'); FROM = int(arg('from', 1)); TO = int(arg('to', self.NF))
		want = [int(x) + self.PRE for x in FRAMES.split(',')] if FRAMES else list(range(FROM + self.PRE, TO + self.PRE + 1))
		suffix = arg('suffix', '')
		sc = self.sc
		for f in range(1, max(want) + 1):
			sc.frame_set(f)                   # every frame, so the particle simulation is consistent
			if f in want:
				t_ = time.time()
				sc.render.filepath = str(self.OUT / f'f_{f - self.PRE:04d}{suffix}.png')
				bpy.ops.render.render(write_still=True)
				print('rendered', f - self.PRE, '%.1fs' % (time.time() - t_), flush=True)
		print('done', self.NF, 'frames total; T0', self.T0, 'T1', self.T1)


# ------------------------------------------------------------------ shared helpers for the shot scripts
def ease_io(x):
	"""src/ui/gfx.tsx easeInOut (cubic)"""
	t = max(0.0, min(1.0, x))
	return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2

ML_PATH = json.load(open(ROOT / 'data/flows.json'))['mauna_loa_1935']['paths']['main']
def along(pts, k):
	"""src/data/geo.ts along(): point at fraction k of the polyline (by length, lon scaled by cos lat)"""
	seg = []
	for i in range(len(pts) - 1):
		seg.append(math.hypot(pts[i + 1][0] - pts[i][0], (pts[i + 1][1] - pts[i][1]) * math.cos(math.radians(pts[i][0]))))
	x = max(0.0, min(1.0, k)) * sum(seg)
	for i, s_ in enumerate(seg):
		if x <= s_ or i == len(seg) - 1:
			u = min(1.0, x / s_) if s_ > 0 else 0
			return (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u)
		x -= s_
	return tuple(pts[-1])

def column(shot, base, height, r0, r1, n, wind, rise=0.12, bend=1.35, spread=0.55, seed=11, grow_in=None):
	"""etna_toon puff_column as per-puff functions of t: puff k sits at column fraction s(t) = s0 + rise·(t−T0)/(T1−T0);
	`grow_in` = (t_start, dur): every puff grows from nothing over dur s after t_start + its own delay (steam that starts)"""
	rng = np.random.default_rng(seed)
	items = []
	span = shot.T1 - shot.T0
	for k in range(n):
		s0 = -0.1 + 1.1 * (k + rng.random()) / n
		ang = rng.random() * 2 * math.pi; jr = rng.random() ** 0.5
		ox, oy = math.cos(ang) * jr, math.sin(ang) * jr
		rs = 0.75 + 0.45 * rng.random()
		dl = rng.random()
		def fn(t, s0=s0, ox=ox, oy=oy, rs=rs, dl=dl):
			s = s0 + rise * (t - shot.T0) / span
			sc_ = max(0.0, s)
			rad = (r0 + (r1 - r0) * sc_ ** 0.85) * rs * (min(1.0, 0.35 + s / 0.08) if s < 0.08 else 1.0)
			if grow_in is not None:
				g = (t - grow_in[0] - dl * grow_in[1] * 0.6) / grow_in[1]
				if g <= 0: return None
				rad *= ease_io(g) * (1 if s >= 0 else 0)
			rad = max(rad, 0.002)
			c = base + Vector((wind[0] * height * sc_ ** bend, wind[1] * height * sc_ ** bend, height * s))
			c += Vector((ox, oy, 0)) * rad * spread
			return c, rad, 0.92
		items.append(fn)
	return items

def rising(base, n, t_start, dt, v, height, r0, r1, wind, seed=3, spread=0.8):
	"""steam that STARTS: puff k is born at the base at t_start + k·dt (± jitter), grows in over 0.5 s and rises at v
	column-heights per second (slowing as it climbs), drifting with the wind — the column builds up over time"""
	rng = np.random.default_rng(seed)
	items = []
	for k in range(n):
		tb = t_start + (k + 0.6 * rng.random()) * dt
		ang = rng.random() * 2 * math.pi; jr = rng.random() ** 0.5
		ox, oy = math.cos(ang) * jr, math.sin(ang) * jr
		rs = 0.75 + 0.45 * rng.random()
		def fn(t, tb=tb, ox=ox, oy=oy, rs=rs):
			a = t - tb
			if a <= 0: return None
			s = 1 - math.exp(-a * v)              # climbs fast at first, then lingers
			rad = (r0 + (r1 - r0) * s ** 0.8) * rs * ease_io(a / 0.5)
			if rad < 0.002: return None
			c = base + Vector((wind[0] * height * s ** 1.3, wind[1] * height * s ** 1.3, height * s))
			c += Vector((ox, oy, 0)) * rad * spread
			return c, rad, 0.9
		items.append(fn)
	return items

_TIP = {}
def flow_tip(p):
	"""lat/lon of the VISIBLE front of the 1935 flow at progress p: the farthest point along the centreline (data/flows.json)
	reached by flow pixels whose arrival < p (lava.npy) — the arrival map widens the pond, so along(p/0.97) runs ahead of
	the lava by up to 6 km in the middle of the shot"""
	if 'S' not in _TIP:
		L = np.load(D / 'lava.npy'); arr = L[..., 0]; edge = L[..., 1]
		h, w = arr.shape
		jj, ii = np.nonzero((arr < 0.99) & (edge > 0.25))
		x = (ii / (w - 1) - 0.5) * WK; z = (jj / (h - 1) - 0.5) * HK
		P3 = np.array([HC.geo3(a, b) for a, b in ML_PATH])
		best = np.full(len(x), 1e9); sv = np.zeros(len(x)); acc = 0.0; segs = []
		for k in range(len(P3) - 1):
			a, b = P3[k], P3[k + 1]; d = b - a; L2 = d @ d
			u = np.clip(((x - a[0]) * d[0] + (z - a[1]) * d[1]) / L2, 0, 1)
			dist = np.hypot(x - a[0] - u * d[0], z - a[1] - u * d[1])
			m = dist < best; best[m] = dist[m]; sv[m] = acc + u[m] * math.sqrt(L2)
			acc += math.sqrt(L2)
		_TIP['S'] = (arr[jj, ii], sv / acc)
	a_, s_ = _TIP['S']
	m = a_ < p
	if m.sum() < 5: return along(ML_PATH, 0.0)
	return along(ML_PATH, float(np.percentile(s_[m], 99.7)))
