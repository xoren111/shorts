"""Heimaey toon toolkit — the approved etna_toon.py look (owner 18.10: stylized cartoon 3D, crisp and colourful, NO blur, violet dusk
sky) on the real Heimaey data. Shared by tools/blender/iceland_b.py (pump ship spraying the front) and iceland_c.py (the front
stopped short of the harbour mouth). Not a shot by itself: the shot scripts import it (sys.path) and compose a scene.

Building blocks (same recipes as etna_toon.py):
  - real relief: public/terrain/heimaey/height.bin (ÍslandsDEM 2 m resampled, EXAG 1.35 = src/three/region.ts) as one grid mesh;
    the coast comes from the 2 m land mask (land.png): vertices next to land are lifted ≥ 1.5 m, all others sink under the sea
    plane, and the shader paints sea wherever the mask says sea (except steep sea cliffs) → a crisp mask-defined coastline,
    identical colours on terrain and sea plane (no z-fight, no blinking pier);
  - toon light: Shader-to-RGB → constant 3-band ramp, flat emission, Standard view transform, inverted-hull ink outlines;
  - flat colour zones: altitude bands (noise-warped), steep cliffs, town ground thresholded from a smoothed land-cover field
    derived from the Sentinel-2 mosaic (never used as a texture);
  - toon sea: deep / mid / shallow / foam bands = thresholds of the blurred land mask (distance-to-coast bands);
  - toon lava: real 1973 outline + arrival map (lava.png R, extended to today's 2 m coast where the field was the shore), a rim on
    lava/land borders only, Voronoi crust plates, heat classes per plate (fields looked up at the plate's feature point) driven by
    per-shot fields (channel along the real harbour-lobe path, front, vent) + per-pixel water-cooled patches;
  - cartoon puff smoke (toon spheres + inverted-hull ink), particle lava fountains, violet sky ramp, CC0 Kenney boats,
    merged-mesh houses on the real built-up area (from the imagery), --track screen positions.
Coordinates: x east, y north, z up, km, grid centred on the region (three.js (x, y, z) = blender (x, z, -y))."""
import bpy, bmesh, json, math, sys, time
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
FPS = 60
words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']

# ------------------------------------------------------------------ region data
EXAG = 1.35                                   # src/three/region.ts EXAG.heimaey
TD = ROOT / 'public/terrain/heimaey'
meta = json.load(open(TD / 'meta.json'))
nx, ny = meta['nx'], meta['ny']
WK, HK = meta['width_m'] / 1000, meta['height_m'] / 1000
H = np.fromfile(TD / 'height.bin', np.float32).reshape(ny, nx)
mx = meta['mercator']
def merc(lat, lon):
	x = (lon + 180) / 360
	s = math.sin(math.radians(lat))
	return x, 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)
def uvof(lat, lon):
	x, y = merc(lat, lon)
	return (x - mx['x0']) / (mx['x1'] - mx['x0']), (y - mx['y0']) / (mx['y1'] - mx['y0'])   # v from the top (north)
def XY(lat, lon):
	u, v = uvof(lat, lon)
	return Vector(((u - 0.5) * WK, (0.5 - v) * HK, 0.0))
def hraw(x, y):
	"""terrain height (km, exaggerated, may be < 0 under the sea) at blender x/y"""
	u, v = x / WK + 0.5, 0.5 - y / HK
	fx = min(nx - 1.001, max(0, u * (nx - 1))); fy = min(ny - 1.001, max(0, v * (ny - 1)))
	i, j = int(fx), int(fy); a, b = fx - i, fy - j
	h = H[j, i] * (1 - a) * (1 - b) + H[j, i + 1] * a * (1 - b) + H[j + 1, i] * (1 - a) * b + H[j + 1, i + 1] * a * b
	return float(h) / 1000 * EXAG
def Pxy(x, y, agl=0.0):
	return Vector((x, y, max(0.0, hraw(x, y)) + agl))
def P(lat, lon, agl=0.0):
	p = XY(lat, lon)
	return Pxy(p.x, p.y, agl)

# src/data/geo.ts (GEO.heimaey) + data/flows.json (eldfell_1973)
G = {
	'town': (63.4401, -20.2786), 'crater': (63.4323, -20.2496), 'eldfell': (63.4323, -20.2473),
	'front': (63.4464, -20.2565), 'frontOpp': (63.44743, -20.25894), 'harborInner': (63.4454, -20.272),
	'heimaklettur': (63.45, -20.2612), 'skans': (63.4438, -20.2614), 'ystiklettur': (63.4536, -20.2475),
	'bwN': (63.4455, -20.2654), 'bwS': (63.4453, -20.2615), 'ship': (63.44688, -20.25948),
}
MOUTH_LL = ((63.44638 + 63.44743) / 2, (-20.25651 + -20.25894) / 2)
HARBOUR_LL = (63.4454 + (MOUTH_LL[0] - 63.4454) * 0.35, -20.272 + (MOUTH_LL[1] + 20.272) * 0.35)   # Iceland.tsx llLerp(harborInner, MOUTH, .35)
FLOWS = json.load(open(ROOT / 'data/flows.json'))['eldfell_1973']
HARBOR_LOBE = [tuple(p) for p in FLOWS['paths']['harbor_lobe']]

# ------------------------------------------------------------------ node helpers (etna_toon.py)
def node(nt, kind, loc=(0, 0), **kw):
	n = nt.nodes.new(kind); n.location = loc
	for k, v in kw.items():
		setattr(n, k, v)
	return n
link = lambda nt, a, b: nt.links.new(a, b)
def put(nt, sock, x):
	if x is None: return
	if isinstance(x, (int, float)): sock.default_value = x
	elif isinstance(x, (tuple, list, Vector)):
		x = tuple(x)
		sock.default_value = x if len(x) == len(sock.default_value) else (*x, 1)
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
def VM(nt, op, a, b=None, c=None):
	n = nt.nodes.new('ShaderNodeVectorMath'); n.operation = op
	put(nt, n.inputs[0], a); put(nt, n.inputs[1], b)
	if c is not None: put(nt, n.inputs[2], c)
	return n.outputs['Value'] if op in ('LENGTH', 'DISTANCE', 'DOT_PRODUCT') else n.outputs['Vector']
def EMIT(nt, col, out_node):
	e_ = nt.nodes.new('ShaderNodeEmission'); put(nt, e_.inputs['Color'], col); e_.inputs['Strength'].default_value = 1.0
	link(nt, e_.outputs[0], out_node.inputs['Surface'])
	return e_
def VAL(nt, label, v=0.0):
	n = nt.nodes.new('ShaderNodeValue'); n.label = label; n.name = label; n.outputs[0].default_value = v
	return n
def new_mat(name):
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	return m, t, node(t, 'ShaderNodeOutputMaterial', (1600, 0))
def flat_mat(name, col):
	m, t, o = new_mat(name); EMIT(t, col, o); return m

# the 3 light bands (lit / mid / shadow) used by every toon material (thresholds measured in etna_toon.py --debug light)
B1, B2 = float(arg('b1', 0.60)), float(arg('b2', 1.0))
def toon(nt, shadow, mid, lit, normal=None):
	d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (1, 1, 1, 1)
	put(nt, d.inputs['Normal'], normal)
	s2r = nt.nodes.new('ShaderNodeShaderToRGB'); link(nt, d.outputs[0], s2r.inputs[0])
	bw = nt.nodes.new('ShaderNodeRGBToBW'); link(nt, s2r.outputs['Color'], bw.inputs[0])
	return RAMP(nt, bw.outputs[0], [(0.0, shadow), (B1, mid), (B2, lit)]), bw.outputs[0]
BAND = ((0.50, 0.40, 0.60), (0.82, 0.74, 0.82), (1.0, 0.96, 0.9))         # terrain bands (etna_toon)

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

def world_uv(nt):
	"""texture coordinate of the region grid from the world position (x/WK + .5, y/HK + .5) — terrain and sea share it"""
	g = nt.nodes.new('ShaderNodeNewGeometry')
	return VM(nt, 'MULTIPLY_ADD', g.outputs['Position'], (1 / WK, 1 / HK, 0.0), (0.5, 0.5, 0.0)), g

def float_image(name, arr):
	"""north-up H×W×C (C ≤ 4) float array → Blender float image (Non-Color, rows bottom-up)"""
	h_, w_ = arr.shape[:2]
	a = np.ones((h_, w_, 4), np.float32)
	a[..., :arr.shape[2]] = arr
	im = bpy.data.images.new(name, w_, h_, alpha=True, float_buffer=True); im.colorspace_settings.name = 'Non-Color'
	im.pixels.foreach_set(np.ascontiguousarray(a[::-1], np.float32).ravel())
	return im
def tex(nt, img, uvsock, interp='Linear'):
	t_ = nt.nodes.new('ShaderNodeTexImage'); t_.image = img; t_.interpolation = interp; t_.extension = 'EXTEND'
	link(nt, uvsock, t_.inputs['Vector'])
	s_ = nt.nodes.new('ShaderNodeSeparateColor'); link(nt, t_.outputs['Color'], s_.inputs['Color'])
	return s_.outputs, t_
def load_png(name):
	im = bpy.data.images.load(str(TD / name)); im.colorspace_settings.name = 'Non-Color'
	return im
def img_array(im):
	a = np.empty(im.size[0] * im.size[1] * im.channels, np.float32); im.pixels.foreach_get(a)
	return a.reshape(im.size[1], im.size[0], im.channels)[::-1]          # north-up

# box blur (cumsum) ×3 ≈ gaussian — no scipy in Blender's python
def box(x, rad, axis):
	pad = [(rad + 1, rad) if k == axis else (0, 0) for k in range(2)]
	c = np.cumsum(np.pad(x, pad, mode='edge'), axis=axis)
	n = x.shape[axis]
	return (np.take(c, np.arange(2 * rad + 1, 2 * rad + 1 + n), axis=axis) - np.take(c, np.arange(0, n), axis=axis)) / (2 * rad + 1)
def gblur(x, s):
	rad = max(1, int(round(s * 1.15)))
	for _ in range(3):
		x = box(box(x, rad, 0), rad, 1)
	return x
def down2(a):
	h2, w2 = a.shape[0] // 2, a.shape[1] // 2
	return a[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2, *a.shape[2:]).mean((1, 3))
def grid_xy(h_, w_):
	"""blender x/y (km) of the pixel centres of a north-up h×w image covering the region"""
	xs = ((np.arange(w_) + 0.5) / w_ - 0.5) * WK
	ys = (0.5 - (np.arange(h_) + 0.5) / h_) * HK
	return np.meshgrid(xs, ys)
def seg_dist(X, Y, pts):
	"""distance (km) of every grid point to a polyline of blender (x, y)"""
	d = np.full(X.shape, 1e9, np.float32)
	for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
		dx, dy = bx - ax, by - ay
		t_ = np.clip(((X - ax) * dx + (Y - ay) * dy) / max(1e-12, dx * dx + dy * dy), 0, 1)
		d = np.minimum(d, np.hypot(X - ax - t_ * dx, Y - ay - t_ * dy))
	return d

# ------------------------------------------------------------------ scene
class Scene:
	def __init__(self, T0, T1, PRE=0, lens=30.0, out_default='out/blender/test'):
		self.T0, self.T1, self.PRE = T0, T1, PRE
		self.NF = int(round((T1 - T0) * FPS))
		self.FRAMES = arg('frames')
		self.SCALE = int(arg('scale', 100))
		self.OUT = ROOT / arg('out', out_default)
		self.LW = float(arg('lw', 2.2))
		self.LENS = lens
		self.NEAR = 0.01
		bpy.ops.wm.read_factory_settings(use_empty=True)
		sc = self.sc = bpy.context.scene
		sc.render.engine = 'BLENDER_EEVEE'
		sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
		sc.render.resolution_percentage = self.SCALE
		sc.render.fps = FPS
		sc.frame_start, sc.frame_end = 1, self.NF + PRE
		sc.render.image_settings.file_format = 'PNG'
		sc.render.image_settings.color_mode = 'RGB'
		sc.render.film_transparent = False
		sc.render.filter_size = 1.0
		try:
			sc.view_settings.view_transform = 'Standard'
			sc.view_settings.look = 'None'
		except Exception as e:
			print('view transform', e)
		sc.eevee.taa_render_samples = int(arg('samples', 16))
		sc.eevee.use_shadows = True
		self.GRAV = float(arg('grav', 0.5))
		sc.gravity = (0, 0, -self.GRAV)
		self.CAMC = Vector((0, 0, 1))

	def fr(self, t):
		return 1 + self.PRE + (t - self.T0) * FPS
	def t_of(self, f):
		return self.T0 + (f - 1 - self.PRE) / FPS
	def pxk(self):
		return 2 * (18 / self.LENS) / 1920       # world size of one 1920-row pixel per km of distance
	def line_w(self, d, lw=None):
		return (self.LW if lw is None else lw) * self.pxk() * d
	def link_obj(self, o):
		self.sc.collection.objects.link(o); return o

	# -------------------------------------------------------------- camera: per-frame keys from a python path cam(t) → (pos, target)
	def camera(self, path):
		sc = self.sc
		cd = bpy.data.cameras.new('cam'); cd.lens = self.LENS; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 36
		cd.clip_end = 400; cd.clip_start = float(arg('near', self.NEAR))       # near plane as far as the shot allows (depth precision)
		cam = self.cam = self.link_obj(bpy.data.objects.new('cam', cd)); sc.camera = cam
		tgt = self.tgt = self.link_obj(bpy.data.objects.new('tgt', None))
		ct = cam.constraints.new('TRACK_TO'); ct.target = tgt; ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
		self.campath = path
		ps = []
		for f in range(1, self.NF + self.PRE + 1):
			p_, l_ = path(max(self.T0, self.t_of(f)))
			cam.location = p_; cam.keyframe_insert('location', frame=f)
			tgt.location = l_; tgt.keyframe_insert('location', frame=f)
			ps.append(Vector(p_))
		linear_keys(cam); linear_keys(tgt)
		self.CAMC = sum(ps, Vector()) / len(ps)
		return cam

	# -------------------------------------------------------------- world: violet dusk ramp (etna_toon, owner-approved) + sun
	def world(self, sun_az=110, sun_el=28, sun_energy=None, sky=None):
		sc = self.sc
		wd = bpy.data.worlds.new('dusk'); sc.world = wd; wd.use_nodes = True
		wn_ = wd.node_tree; wn_.nodes.clear()
		wo = node(wn_, 'ShaderNodeOutputWorld', (600, 0))
		wtc = node(wn_, 'ShaderNodeTexCoord', (-600, 0))
		wsep = node(wn_, 'ShaderNodeSeparateXYZ', (-400, 0)); link(wn_, wtc.outputs['Generated'], wsep.inputs['Vector'])
		skyc = RAMP(wn_, wsep.outputs['Z'], sky or [(0.0, (1.0, 0.68, 0.45)), (0.07, (1.0, 0.42, 0.52)), (0.18, (0.78, 0.26, 0.62)),
		                                         (0.34, (0.38, 0.16, 0.6)), (0.62, (0.13, 0.07, 0.36))], interp='LINEAR')
		wbg = node(wn_, 'ShaderNodeBackground', (200, 0)); link(wn_, skyc, wbg.inputs['Color']); wbg.inputs['Strength'].default_value = 1.0
		link(wn_, wbg.outputs[0], wo.inputs['Surface'])
		sd = bpy.data.lights.new('sun', 'SUN'); sd.energy = float(arg('sun', sun_energy or 4.0)); sd.color = (1.0, 0.86, 0.62); sd.angle = math.radians(0.5)
		sun = self.link_obj(bpy.data.objects.new('sun', sd))
		# euler (90° − el, 0, 180° − az): the light comes FROM compass azimuth az (etna_toon's (58°, 0, 20°) = from 160°, 32° up)
		az = math.radians(sun_az)
		sun.rotation_euler = (math.radians(90 - sun_el), 0, math.atan2(math.sin(az), -math.cos(az)))
		self.sun = sun

	# -------------------------------------------------------------- data fields (numpy → float images)
	def build_fields(self):
		t_ = time.time()
		land_im = load_png('land.png')
		land4 = img_array(land_im)[..., 0]                    # 4096 × 4006, north-up, 2 m
		self.land4 = land4
		l2 = down2(land4)                                      # 4 m
		cB = gblur(l2, 11.0)
		self.coast_mid = cB
		self.COAST = float_image('coast', np.stack([gblur(l2, 0.7), gblur(l2, 4.0), cB], -1))
		# land cover from the Sentinel-2 mosaic (classified, smoothed, only ever thresholded): town ground
		sat = bpy.data.images.load(str(TD / 'sat.jpg')); sat.colorspace_settings.name = 'Non-Color'
		a = img_array(sat)[..., :3]
		a = down2(a)
		r, g, b = a[..., 0], a[..., 1], a[..., 2]
		lum = 0.3 * r + 0.59 * g + 0.11 * b
		gr = g - np.maximum(r, b)
		urban = np.clip((0.03 - gr) / 0.03, 0, 1) * np.clip((lum - 0.16) / 0.05, 0, 1)
		X, Y = grid_xy(*urban.shape)
		townbox = ((Y > 0.75) & (Y < 2.0) & (X > -1.9) & (X < 0.32)).astype(np.float32)
		urb = gblur(urban, 3.0) * townbox
		self.urban_field = (urb, X, Y)
		grass = gblur(np.clip((gr - 0.0) / 0.03, 0, 1), 3.0)
		self.ZONES = float_image('zones', np.stack([urb, grass, np.zeros_like(urb)], -1))
		bpy.data.images.remove(sat)
		lava_im = load_png('lava.png')
		self.lava_arr = img_array(lava_im)[..., 0]               # 4096 × 4006 arrival (1 = never)
		# the 1973 outline vs today's 2 m coast: a thin strip of «land» (green) is left between the outline and the sea along the
		# new coast — in 1973 the lava itself was the shore, so lava within ~25 m of both the field and the sea fills to the coast
		# (arrival extended smoothly from the neighbours). The rim (dark ink on cold lava, red on hot) only marks lava/LAND borders.
		a2 = down2(self.lava_arr); lv = (a2 < 0.99).astype(np.float32)
		ld = (l2 > 0.5).astype(np.float32)
		near_sea = gblur(1 - ld, 6.0) > 0.01
		near_lava = gblur(lv, 6.0) > 0.01
		fill = (ld > 0.5) & (lv < 0.5) & near_sea & near_lava
		ext = gblur(a2 * lv, 6.0) / np.maximum(gblur(lv, 6.0), 1e-4)
		arr2 = np.where(fill, np.minimum(ext, 0.94), a2)
		lv2 = (arr2 < 0.99).astype(np.float32)
		rimf = gblur(ld * (1 - lv2), 1.0)
		self.LAVA = float_image('lava2', np.stack([arr2, rimf, np.zeros_like(arr2)], -1))
		self.EDGE = None
		bpy.data.images.remove(lava_im)
		print('fields %.1fs' % (time.time() - t_))

	def heat_image(self, name, chans):
		"""per-shot heat fields on a 1024 grid: chans = list of 2-D arrays (≤ 4) built with grid_xy"""
		return float_image(name, np.stack(chans, -1).astype(np.float32))

	# -------------------------------------------------------------- terrain mesh (real relief, mask-defined coast)
	def terrain(self, mat, hull=True):
		xs = (np.arange(nx) / (nx - 1) - 0.5) * WK
		ys = (0.5 - np.arange(ny) / (ny - 1)) * HK
		vx, vy = np.meshgrid(xs, ys)
		Hs = H.copy()
		for _ in range(int(arg('hsmooth', 1))):            # separable [1 2 1]/4 binomial passes
			Hs[:, 1:-1] = 0.25 * Hs[:, :-2] + 0.5 * Hs[:, 1:-1] + 0.25 * Hs[:, 2:]
			Hs[1:-1, :] = 0.25 * Hs[:-2, :] + 0.5 * Hs[1:-1, :] + 0.25 * Hs[2:, :]
		vz = Hs / 1000 * EXAG
		# land within ±3 px (6 m) of a vertex → lift it to ≥ 1.5 m; no land around → sink it under the sea plane
		L = self.land4
		dil = L.copy()
		for k in range(1, 4):
			dil = np.maximum(dil, np.maximum(np.roll(L, k, 0), np.roll(L, -k, 0)))
		dil2 = dil.copy()
		for k in range(1, 4):
			dil2 = np.maximum(dil2, np.maximum(np.roll(dil, k, 1), np.roll(dil, -k, 1)))
		jj = np.clip((np.arange(ny) / (ny - 1) * (L.shape[0] - 1)).round().astype(int), 0, L.shape[0] - 1)
		ii = np.clip((np.arange(nx) / (nx - 1) * (L.shape[1] - 1)).round().astype(int), 0, L.shape[1] - 1)
		lv = dil2[jj][:, ii] > 0.5
		vz = np.where(lv, np.maximum(vz, 0.0015), np.clip(np.minimum(vz, -0.004), -0.03, None)).astype(np.float32)
		self.vz = vz
		verts = np.stack([vx, vy, vz], -1).reshape(-1, 3).astype(np.float32)
		q = np.arange(nx * ny).reshape(ny, nx)
		faces = np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], -1).reshape(-1, 4)
		def grid_mesh(name, vco, fcs):
			me_ = bpy.data.meshes.new(name)
			me_.vertices.add(len(vco)); me_.vertices.foreach_set('co', vco.ravel())
			me_.loops.add(fcs.size); me_.loops.foreach_set('vertex_index', fcs.ravel().astype(np.int32))
			me_.polygons.add(len(fcs)); me_.polygons.foreach_set('loop_start', np.arange(0, fcs.size, 4, dtype=np.int32)); me_.polygons.foreach_set('loop_total', np.full(len(fcs), 4, np.int32))
			me_.update(); me_.validate()
			me_.polygons.foreach_set('use_smooth', np.ones(len(fcs), bool))
			return me_
		me = grid_mesh('heimaey', verts, faces); me.materials.append(mat)
		self.terr = self.link_obj(bpy.data.objects.new('heimaey', me))
		if hull:
			sx_ = WK / (nx - 1); sy_ = HK / (ny - 1)
			dzdx = np.gradient(vz, axis=1) / sx_; dzdy = -np.gradient(vz, axis=0) / sy_
			nn = np.stack([-dzdx, -dzdy, np.ones_like(vz)], -1); nn /= np.linalg.norm(nn, axis=-1, keepdims=True)
			P3 = np.stack([vx, vy, vz], -1)
			dist = np.linalg.norm(P3 - np.array(self.CAMC), axis=-1)
			hv = (P3 + nn * self.line_w(dist)[..., None]).reshape(-1, 3).astype(np.float32)
			hm = grid_mesh('heimaey_ink', hv, faces[:, ::-1].copy()); hm.materials.append(self.ink)
			o = self.link_obj(bpy.data.objects.new('heimaey_ink', hm)); o.visible_shadow = False

	# -------------------------------------------------------------- materials
	def make_ink(self):
		self.ink = bpy.data.materials.new('ink'); self.ink.use_nodes = True; self.ink.use_backface_culling = True
		it_ = self.ink.node_tree; it_.nodes.clear()
		EMIT(it_, (0.035, 0.02, 0.06), node(it_, 'ShaderNodeOutputMaterial', (300, 0)))

	SEA = {'deep': (0.03, 0.27, 0.56), 'mid': (0.05, 0.42, 0.70), 'shallow': (0.22, 0.68, 0.78), 'foam': (0.90, 0.97, 1.0)}
	def sea_colour(self, nt, uvs):
		c, _ = tex(nt, self.COAST, uvs)
		col = MIX(nt, M(nt, 'GREATER_THAN', c[2], 0.10), self.SEA['deep'], self.SEA['mid'])
		col = MIX(nt, M(nt, 'GREATER_THAN', c[1], 0.14), col, self.SEA['shallow'])
		col = MIX(nt, M(nt, 'GREATER_THAN', c[0], 0.16), col, self.SEA['foam'])
		return col, c

	def sea(self):
		m, nt, o = new_mat('sea')
		uvs, _ = world_uv(nt)
		col, _ = self.sea_colour(nt, uvs)
		EMIT(nt, col, o)
		bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -0.0008))
		s = bpy.context.object; s.name = 'sea'; s.data.materials.append(m)
		return s

	PAL = {
		'low': (0.40, 0.70, 0.16), 'green': (0.27, 0.60, 0.13), 'high': (0.19, 0.51, 0.14), 'top': (0.15, 0.44, 0.16),
		'cliff': (0.55, 0.32, 0.17), 'cliff2': (0.38, 0.20, 0.14), 'town': (0.80, 0.76, 0.68), 'quay': (0.62, 0.62, 0.66),
		'cinder': (0.45, 0.17, 0.12), 'cinder2': (0.30, 0.11, 0.10),
	}
	def terrain_material(self, lava_fn=None):
		"""land toon colours + mask-defined coast + optional lava layer: lava_fn(nt, uvs, geo, band) → (onmask, colour)"""
		m, nt, out = new_mat('heimaey')
		uvs, geo = world_uv(nt)
		pos = SEP(nt, geo.outputs['Position']); nrm = SEP(nt, geo.outputs['Normal'])
		tc = node(nt, 'ShaderNodeTexCoord')
		zs, _ = tex(nt, self.ZONES, uvs)
		wob = node(nt, 'ShaderNodeTexNoise'); wob.inputs['Scale'].default_value = 2.2; wob.inputs['Detail'].default_value = 1.5
		link(nt, tc.outputs['Object'], wob.inputs['Vector'])
		alt = M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wob.outputs['Fac'], 0.5), 0.07, M(nt, 'DIVIDE', pos['Z'], EXAG))   # real km
		P_ = self.PAL
		base = RAMP(nt, alt, [(0.0, P_['low']), (0.03, P_['green']), (0.10, P_['high']), (0.19, P_['top'])])
		townF = M(nt, 'MULTIPLY', M(nt, 'GREATER_THAN', zs[0], 0.45), M(nt, 'LESS_THAN', alt, 0.07))
		base = MIX(nt, townF, base, P_['town'])
		cliffF = M(nt, 'LESS_THAN', nrm['Z'], 0.62)
		base = MIX(nt, cliffF, base, P_['cliff'])
		base = MIX(nt, M(nt, 'LESS_THAN', nrm['Z'], 0.36), base, P_['cliff2'])
		band, lum = toon(nt, *BAND)
		self.tband = band
		shaded = MIX(nt, 1.0, base, band, 'MULTIPLY')
		if lava_fn:
			onm, lcol = lava_fn(nt, uvs, geo, band)
			shaded = MIX(nt, onm, shaded, lcol)
		sea_c, c = self.sea_colour(nt, uvs)
		# sea where the mask says sea — except on steep sea cliffs (they run down into the sea plane, which cuts them)
		seaF = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', c[0], 0.5), M(nt, 'GREATER_THAN', nrm['Z'], 0.62))
		final = MIX(nt, seaF, shaded, sea_c)
		EMIT(nt, final, out)
		return m

	# -------------------------------------------------------------- toon lava (real arrival map; heat classes from shot fields)
	def lava_layer(self, nt, uvs, geo, band, heat_img, prog=0.95, plates=15.0, heat_expr=None, seam_col=(0.50, 0.045, 0.03)):
		"""heat_expr(nt, hc, hp, arr) → heat socket (0 cold … 1 hottest) from the shot's heat image channels per plate (hc) and per pixel (hp); returns (on, colour)"""
		l, _ = tex(nt, self.LAVA, uvs)
		coast, _ = tex(nt, self.COAST, uvs)
		hs, _ = tex(nt, heat_img, uvs)
		arr = l[0]; rimf = l[1]
		on = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', arr, prog), M(nt, 'GREATER_THAN', coast[0], 0.5))
		tc = node(nt, 'ShaderNodeTexCoord')
		wn = node(nt, 'ShaderNodeTexNoise'); wn.inputs['Scale'].default_value = 9
		link(nt, tc.outputs['Object'], wn.inputs['Vector'])
		wmix = node(nt, 'ShaderNodeVectorMath', operation='MULTIPLY_ADD'); link(nt, wn.outputs['Color'], wmix.inputs[0]); wmix.inputs[1].default_value = (0.03, 0.03, 0.03); link(nt, tc.outputs['Object'], wmix.inputs[2])
		vor = node(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE'); vor.inputs['Scale'].default_value = plates
		link(nt, wmix.outputs[0], vor.inputs['Vector'])
		# one heat class per crust plate: the shot's heat fields are looked up at the plate's own feature point (F1 cell
		# position), so class borders run along the seams instead of drawing circles across the plates
		vf1 = node(nt, 'ShaderNodeTexVoronoi', feature='F1'); vf1.inputs['Scale'].default_value = plates
		link(nt, wmix.outputs[0], vf1.inputs['Vector'])
		uvc = VM(nt, 'MULTIPLY_ADD', vf1.outputs['Position'], (1 / WK, 1 / HK, 0.0), (0.5, 0.5, 0.0))
		hc, _ = tex(nt, heat_img, uvc)
		heat = heat_expr(nt, hc, hs, arr)
		dE = vor.outputs['Distance']
		# classes: cold crust plates + thin red seams / warm red melt seams / hot orange melt with dark rafts + yellow seams / pale tip
		warm = M(nt, 'GREATER_THAN', heat, 0.30); hot = M(nt, 'GREATER_THAN', heat, 0.62); tip = M(nt, 'GREATER_THAN', heat, 0.88)
		seamW = M(nt, 'ADD', 0.016, M(nt, 'MULTIPLY', M(nt, 'MINIMUM', heat, 1.0), 0.11))      # seams widen with heat
		seam = M(nt, 'LESS_THAN', dE, seamW)
		seam2 = M(nt, 'LESS_THAN', dE, M(nt, 'MULTIPLY', seamW, 0.45))
		ph = self.lava_phase = VAL(nt, 'phase', 0.0)
		arcs = M(nt, 'LESS_THAN', M(nt, 'FRACT', M(nt, 'MULTIPLY_ADD', arr, float(arg('ripples', 34)), M(nt, 'MULTIPLY', ph.outputs[0], -1.0))), 0.2)
		crust = MIX(nt, 1.0, (0.12, 0.055, 0.085), band, 'MULTIPLY')
		crust_w = MIX(nt, 1.0, (0.24, 0.06, 0.06), band, 'MULTIPLY')
		c = MIX(nt, seam, crust, seam_col)                                                    # cold
		cw = MIX(nt, seam, crust_w, MIX(nt, seam2, (0.95, 0.22, 0.02), (1.0, 0.45, 0.04)))     # warm
		melt = MIX(nt, arcs, (1.0, 0.42, 0.03), (1.0, 0.62, 0.08))
		raft = M(nt, 'GREATER_THAN', dE, M(nt, 'ADD', 0.16, M(nt, 'MULTIPLY', heat, 0.12)))   # dark rafts shrink as heat rises
		chot = MIX(nt, raft, MIX(nt, seam2, melt, (1.0, 0.84, 0.28)), MIX(nt, 1.0, (0.28, 0.07, 0.05), band, 'MULTIPLY'))
		col = MIX(nt, warm, c, cw)
		col = MIX(nt, hot, col, chot)
		col = MIX(nt, tip, col, MIX(nt, M(nt, 'GREATER_THAN', dE, 0.06), (1.0, 0.80, 0.25), (1.0, 0.94, 0.62)))
		# margin: dark ink outline on cold ground, glowing red rim on hot lava
		rim = M(nt, 'GREATER_THAN', rimf, float(arg('rim', 0.12)))
		col = MIX(nt, rim, col, MIX(nt, hot, (0.10, 0.04, 0.07), (0.85, 0.12, 0.02)))
		self.lava_heat = heat
		return on, col

	# -------------------------------------------------------------- puffs (etna_toon puff_column)
	def puffs_init(self):
		sph = bpy.data.meshes.new('puff'); bms = bmesh.new(); bmesh.ops.create_icosphere(bms, subdivisions=3, radius=1.0); bms.to_mesh(sph); bms.free()
		sph.polygons.foreach_set('use_smooth', np.ones(len(sph.polygons), bool))
		self.sph = sph
		ink = sph.copy(); ink.name = 'puff_ink'
		bmi = bmesh.new(); bmi.from_mesh(ink); bmesh.ops.reverse_faces(bmi, faces=bmi.faces); bmi.to_mesh(ink); bmi.free()
		ink.materials.clear(); ink.materials.append(self.ink)
		self.sph_ink = ink
		self.rngp = np.random.default_rng(11)
	def puff_mat(self, name, shadow, mid, lit, base_z=0.0, under=(1.0, 0.45, 0.12), under_h=0.0):
		m, t, mo = new_mat(name)
		band_, _ = toon(t, shadow, mid, lit)
		c = band_
		if under_h > 0:
			g_ = node(t, 'ShaderNodeNewGeometry'); pz = SEP(t, g_.outputs['Position'])['Z']
			low = M(t, 'LESS_THAN', pz, base_z + under_h)
			c = MIX(t, M(t, 'MULTIPLY', low, 0.85), c, MIX(t, 0.5, under, band_, 'MULTIPLY'))
		EMIT(t, c, mo)
		return m
	def puff_column(self, name, base, height, r0, r1, n, wind, mat_, rise=0.12, bend=1.35, spread=0.55, flat=0.92, t0=None, t1=None, grow_in=0.08, ink=True):
		sph_m = self.sph.copy(); sph_m.name = name; sph_m.materials.append(mat_)
		f0, f1 = self.fr(self.T0 if t0 is None else t0), self.fr(self.T1 if t1 is None else t1)
		rng = self.rngp
		for k in range(n):
			s0 = -0.1 + 1.1 * (k + rng.random()) / n
			ang = rng.random() * 2 * math.pi; jr = rng.random() ** 0.5
			ox, oy = math.cos(ang) * jr, math.sin(ang) * jr
			rs = 0.75 + 0.45 * rng.random()
			o = self.link_obj(bpy.data.objects.new(f'{name}{k}', sph_m)); o.visible_shadow = False
			hl = self.link_obj(bpy.data.objects.new(f'{name}{k}_ink', self.sph_ink)) if ink else None
			if hl: hl.visible_shadow = False
			for f_, s in ((f0, s0), (f1, s0 + rise)):
				sc_ = max(0.0, s)
				rad = (r0 + (r1 - r0) * sc_ ** 0.85) * rs * (min(1.0, 0.35 + s / grow_in) if s < grow_in else 1.0)
				rad = max(rad, r0 * 0.3)
				cpos = base + Vector((wind[0] * height * sc_ ** bend, wind[1] * height * sc_ ** bend, height * s))
				cpos += Vector((ox, oy, 0)) * rad * spread
				o.location = cpos; o.scale = (rad, rad, rad * flat)
				o.keyframe_insert('location', frame=f_); o.keyframe_insert('scale', frame=f_)
				if hl:
					ww = self.line_w((cpos - self.CAMC).length)
					hl.location = cpos; s_ = rad + ww; hl.scale = (s_, s_, rad * flat + ww)
					hl.keyframe_insert('location', frame=f_); hl.keyframe_insert('scale', frame=f_)
			for ob in (o, hl):
				if ob is not None:
					linear_keys(ob)
					for fc in fcurves_of(ob): fc.extrapolation = 'LINEAR'

	# -------------------------------------------------------------- imported CC0 models (Kenney): colormap × toon band
	def kenney(self, path, drop=(), hue=0.5):
		before = set(bpy.data.objects)
		bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/cc0' / path))
		new = [o for o in bpy.data.objects if o not in before]
		for o in list(new):
			if o.name.split('.')[0] in drop:
				bpy.data.objects.remove(o); new.remove(o)
		for o in new:
			if o.type != 'MESH': continue
			for i_, sl_ in enumerate(o.data.materials):
				if sl_ is None: continue
				key = 'toon_' + sl_.name + ('' if hue == 0.5 else '_h%.2f' % hue)
				if key not in bpy.data.materials:
					img = next((n.image for n in sl_.node_tree.nodes if n.type == 'TEX_IMAGE'), None)
					m, t, mo = new_mat(key)
					band_, _ = toon(t, (0.45, 0.40, 0.62), (0.80, 0.76, 0.86), (1.0, 0.97, 0.92))
					if img is not None:
						ti = node(t, 'ShaderNodeTexImage'); ti.image = img; ti.interpolation = 'Closest'
						uvn = node(t, 'ShaderNodeUVMap'); link(t, uvn.outputs['UV'], ti.inputs['Vector'])
						col = ti.outputs['Color']
						if hue != 0.5:
							hs_ = node(t, 'ShaderNodeHueSaturation'); hs_.inputs['Hue'].default_value = hue
							link(t, col, hs_.inputs['Color']); col = hs_.outputs['Color']
					else:
						col = tuple(sl_.diffuse_color[:3])
					EMIT(t, MIX(t, 1.0, col, band_, 'MULTIPLY'), mo)
				o.data.materials[i_] = bpy.data.materials[key]
		roots = [o for o in new if o.parent is None]
		return roots, new

	def hull_of(self, o, w):
		"""inverted-hull ink for a prop: mesh copy merged by distance, pushed along smooth normals by w (km), faces reversed,
		parented to o (so it follows every move)"""
		m2 = o.data.copy(); bm = bmesh.new(); bm.from_mesh(m2)
		bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
		bm.normal_update()
		sx = o.matrix_world.to_scale()[0]
		for v in bm.verts: v.co += v.normal * (w / sx)
		bmesh.ops.reverse_faces(bm, faces=bm.faces)
		bm.to_mesh(m2); bm.free()
		m2.materials.clear(); m2.materials.append(self.ink)
		h = bpy.data.objects.new(o.name + '_ink', m2); self.link_obj(h); h.parent = o; h.visible_shadow = False
		return h

	def boats(self, path, n, length, drop=(), hue=0.5):
		"""n instances of a Kenney hull (bow = local −Y), scaled to `length` km; returns [(object, scale, ymin, zmax)]"""
		roots, objs = self.kenney(path, drop=drop, hue=hue)
		src = roots[0]
		vv = np.array([v.co[:] for v in src.data.vertices])
		ymin, ymax, zmax = vv[:, 1].min(), vv[:, 1].max(), vv[:, 2].max()
		k = length / (ymax - ymin)
		out = []
		for i in range(n):
			o = src if i == 0 else self.link_obj(src.copy())
			o.scale = (k, k, k)
			out.append(o)
		return out, k, ymin, zmax

	def hull_copy(self, objs, lw=None, dist=None):
		"""inverted-hull ink for small props: solidify modifier (flipped normals, ink material) of width ∝ camera distance"""
		for o in objs:
			if o.type != 'MESH': continue
			d_ = dist if dist is not None else (o.matrix_world.translation - self.CAMC).length
			o.data.materials.append(self.ink)
			mod = o.modifiers.new('ink', 'SOLIDIFY')
			mod.thickness = -self.line_w(d_, lw) / max(1e-6, o.matrix_world.to_scale()[0])
			mod.use_flip_normals = True; mod.material_offset = len(o.data.materials) - 1; mod.offset = 1.0
			mod.use_rim = False

	# -------------------------------------------------------------- town: one merged mesh of toon houses on the real built-up area
	def houses(self, spacing=0.024, exclude=None, max_n=6000, seed=7, near=None):
		urb, X, Y = self.urban_field
		rng = np.random.default_rng(seed)
		la = self.lava_arr
		L = self.land4
		def at(a, x, y):
			u = x / WK + 0.5; v = 0.5 - y / HK
			return a[min(a.shape[0] - 1, max(0, int(v * (a.shape[0] - 1)))), min(a.shape[1] - 1, max(0, int(u * (a.shape[1] - 1))))]
		gx = np.arange(-1.9, 0.33, spacing); gy = np.arange(0.75, 2.0, spacing)
		bm = bmesh.new()
		cl = bm.loops.layers.color.new('col')
		walls = [(0.97, 0.95, 0.90), (0.98, 0.92, 0.76), (0.86, 0.90, 0.96), (0.98, 0.84, 0.78), (0.90, 0.96, 0.88), (0.95, 0.95, 0.95)]
		roofs = [(0.82, 0.16, 0.10), (0.84, 0.18, 0.12), (0.16, 0.46, 0.30), (0.18, 0.36, 0.70), (0.30, 0.30, 0.36), (0.86, 0.36, 0.10), (0.70, 0.12, 0.16)]
		n = 0
		for x0 in gx:
			for y0 in gy:
				x = x0 + (rng.random() - 0.5) * spacing * 0.5; y = y0 + (rng.random() - 0.5) * spacing * 0.5
				uv_ = at(urb, x, y)
				if uv_ < 0.42 or rng.random() > 0.55 + 0.6 * (uv_ - 0.42): continue
				if at(la, x, y) < 0.99 or at(L, x, y) < 0.5: continue
				# not on the water's edge, not on steep ground
				if min(at(L, x + dx, y + dy) for dx, dy in ((0.012, 0), (-0.012, 0), (0, 0.012), (0, -0.012))) < 0.5: continue
				z = hraw(x, y)
				if z < 0.002 or z > 0.12: continue
				gzx = (hraw(x + 0.008, y) - hraw(x - 0.008, y)) / 0.016; gzy = (hraw(x, y + 0.008) - hraw(x, y - 0.008)) / 0.016
				if math.hypot(gzx, gzy) > 0.45: continue
				if exclude and exclude(x, y): continue
				big = at(self.coast_mid, x, y) < 0.985 and z < 0.03
				w_ = (0.010 + 0.006 * rng.random()) * (1.8 if big else 1.0); d_ = (0.008 + 0.004 * rng.random()) * (1.6 if big else 1.0)
				h_ = 0.006 + 0.004 * rng.random()
				ang = math.radians(-12 + (rng.random() - 0.5) * 16)
				wc = walls[int(rng.random() * len(walls))]; rc = roofs[int(rng.random() * len(roofs))]
				ca, sa = math.cos(ang), math.sin(ang)
				def V(px, py, pz):
					return bm.verts.new((x + px * ca - py * sa, y + px * sa + py * ca, z - 0.002 + pz))
				hw, hd = w_ / 2, d_ / 2
				b0 = [V(-hw, -hd, 0), V(hw, -hd, 0), V(hw, hd, 0), V(-hw, hd, 0)]
				t0 = [V(-hw, -hd, h_), V(hw, -hd, h_), V(hw, hd, h_), V(-hw, hd, h_)]
				rh = h_ + 0.45 * d_ if not big else h_ + 0.08 * d_
				ridge = [V(-hw * 1.04, 0, rh), V(hw * 1.04, 0, rh)]
				e0 = [V(-hw * 1.04, -hd * 1.08, h_), V(hw * 1.04, -hd * 1.08, h_), V(hw * 1.04, hd * 1.08, h_), V(-hw * 1.04, hd * 1.08, h_)]
				fw = [bm.faces.new((b0[i], b0[(i + 1) % 4], t0[(i + 1) % 4], t0[i])) for i in range(4)]
				fr_ = [bm.faces.new((e0[0], e0[1], ridge[1], ridge[0])), bm.faces.new((e0[2], e0[3], ridge[0], ridge[1])),
				       bm.faces.new((t0[0], ridge[0], t0[3])), bm.faces.new((t0[1], t0[2], ridge[1]))]
				for f_ in fw:
					for lp in f_.loops: lp[cl] = (*wc, 1)
				for k, f_ in enumerate(fr_):
					cc = rc if k < 2 else wc
					for lp in f_.loops: lp[cl] = (*cc, 1)
				n += 1
				if n >= max_n: break
			if n >= max_n: break
		bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
		me = bpy.data.meshes.new('houses'); bm.to_mesh(me); bm.free()
		m, t, mo = new_mat('house')
		at_ = node(t, 'ShaderNodeVertexColor'); at_.layer_name = 'col'
		band_, _ = toon(t, (0.42, 0.38, 0.62), (0.78, 0.74, 0.84), (1.0, 0.96, 0.88))
		EMIT(t, MIX(t, 1.0, at_.outputs['Color'], band_, 'MULTIPLY'), mo)
		me.materials.append(m)
		o = self.link_obj(bpy.data.objects.new('houses', me))
		print('houses', n)
		return o

	# -------------------------------------------------------------- particle lava fountain (etna_toon)
	def fountain(self, center, radius, height, count, blob_r, name='fount', lifetime_k=2.1):
		bpy.ops.mesh.primitive_circle_add(vertices=24, radius=radius, fill_type='NGON', location=center)
		em = bpy.context.object; em.name = name
		if 'blobs' not in bpy.data.collections:
			blobs = bpy.data.collections.new('blobs')
			for nm, col, rr in (('blobY', (1.0, 0.80, 0.16), 1.0), ('blobO', (1.0, 0.36, 0.02), 0.85), ('blobW', (1.0, 0.96, 0.62), 0.7)):
				bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rr)
				blob = bpy.context.object; blob.name = nm
				blob.data.materials.append(flat_mat(nm, col))
				blob.location = (0, 0, -50); blob.visible_shadow = False
				self.sc.collection.objects.unlink(blob); blobs.objects.link(blob)
		ps_mod = em.modifiers.new(name, 'PARTICLE_SYSTEM'); ps = ps_mod.particle_system.settings
		VF = math.sqrt(2 * self.GRAV * height)
		ps.count = count; ps.frame_start = 1; ps.frame_end = self.NF + self.PRE; ps.lifetime = int(lifetime_k * VF / self.GRAV * FPS); ps.lifetime_random = 0.15
		ps.emit_from = 'FACE'; ps.normal_factor = VF; ps.factor_random = VF * 0.28
		ps.render_type = 'COLLECTION'; ps.instance_collection = bpy.data.collections['blobs']; ps.use_collection_pick_random = True
		ps.particle_size = blob_r; ps.size_random = 0.6
		ps.physics_type = 'NEWTON'; ps.mass = 1.0; ps.use_rotations = False
		em.show_instancer_for_render = False
		return em

	# -------------------------------------------------------------- track + render loop
	def track(self, pts, out_path):
		from bpy_extras.object_utils import world_to_camera_view
		sc = self.sc
		tr = []
		for f in range(1 + self.PRE, self.NF + self.PRE + 1):
			sc.frame_set(f)
			row = {}
			for k_, p_ in pts.items():
				p_ = p_(self.t_of(f)) if callable(p_) else p_
				c_ = world_to_camera_view(sc, self.cam, p_)
				row[k_] = [round(c_.x * 1080, 1), round((1 - c_.y) * 1920, 1)]
			tr.append(row)
		out_path = Path(out_path); out_path.parent.mkdir(parents=True, exist_ok=True)
		json.dump({'t0': self.T0, 'fps': FPS, 'n': len(tr), 'frames': tr}, open(out_path, 'w'))
		print('track', len(tr), '→', out_path)

	def render(self):
		sc = self.sc
		self.OUT.mkdir(parents=True, exist_ok=True)
		FROM = int(arg('from', 1))
		want = [int(x) + self.PRE for x in self.FRAMES.split(',')] if self.FRAMES else list(range(FROM + self.PRE, self.NF + self.PRE + 1))
		suffix = arg('suffix', '')
		start = 1 if self.PRE > 0 else min(want)       # step through every frame when particles need their pre-roll
		for f in range(start, max(want) + 1):
			sc.frame_set(f)
			if f in want:
				t_ = time.time()
				sc.render.filepath = str(self.OUT / f'f_{f - self.PRE:04d}{suffix}.png')
				bpy.ops.render.render(write_still=True)
				print('rendered', f - self.PRE, '%.1fs' % (time.time() - t_), flush=True)
		print('done', self.NF, 'frames; T0', self.T0, 'T1', self.T1)
