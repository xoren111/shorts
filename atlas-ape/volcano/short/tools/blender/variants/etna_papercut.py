"""Etna — «papercut» variant (owner 18.10: «direction fine, but the mountain is too blurred; cartoonish without details is fine,
but colourful and with NO blur»). Copy of tools/blender/etna_pilot.py with the whole look rebuilt as a flat paper-cut / relief-map
illustration — no photo texture, no haze, no volumes:
  * terrain: real TINITALY relief (same mesh, same exaggeration) coloured in flat hypsometric terraces every STEP m, with a thin
    darker edge just below every contour (constant on-screen width) and a light rim above it — a stack of paper sheets;
    2-tone toon sun shading (Shader to RGB → hard threshold) with crisp cast shadows;
  * lava: real 1992 flow (arrival map lava.png, same prog animation) as flat bold bands — dark outline, red rim, orange body,
    yellow hot front, older parts crusting over cell by cell into dark plates with glowing seams; a crisp 2-ring glow halo
    around the active flow (min-dilation of the arrival map) and glow rings around the fissure;
  * eruption: particle lava fountains (yellow/orange/red blobs on ballistic arcs) + flat glow discs behind them;
    flank smoke and summit ash plume as rising toon-shaded puffs with a thin outline (no volumes);
  * Zafferana: real OSM footprints as pastel houses with terracotta roofs (toon);
  * bright sky gradient, flat sea; Standard view transform so palette colours come out exactly.
  blender -b --factory-startup -P tools/blender/variants/etna_papercut.py -- [--frames 1,112,223] [--scale 50] [--out out/blender/var_papercut]
Frame 1 = t0 (s, Short timeline). Writes PNGs."""
import bpy, bmesh, json, math, sys
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
FRAMES = arg('frames')
SCALE = int(arg('scale', 100))
OUT = ROOT / arg('out', 'out/blender/var_papercut')
FPS = 60
words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']
T0 = W(48)                    # 26.13 «Italy.»
T1 = W(55) + 0.4 + 0.05       # end of the shot + cross-dissolve hold
NF = int(round((T1 - T0) * FPS))
PRE = 60
fr = lambda t: 1 + PRE + (t - T0) * FPS

EXAG = 1.7
meta = json.load(open(ROOT / 'public/terrain/etna/meta.json'))
nx, ny = meta['nx'], meta['ny']
WK, HK = meta['width_m'] / 1000, meta['height_m'] / 1000
H = np.fromfile(ROOT / 'public/terrain/etna/height.bin', np.float32).reshape(ny, nx)
def gblur(a, sig):
	if sig <= 0: return a
	r = int(math.ceil(sig * 3)); k = np.exp(-0.5 * (np.arange(-r, r + 1) / sig) ** 2); k /= k.sum()
	p = np.pad(a, ((0, 0), (r, r)), mode='edge')
	a = sum(k[t] * p[:, t:t + a.shape[1]] for t in range(2 * r + 1))
	p = np.pad(a, ((r, r), (0, 0)), mode='edge')
	return sum(k[t] * p[t:t + a.shape[0], :] for t in range(2 * r + 1))
GSIG = float(arg('gsig', 1.5))          # px (DEM) gaussian on the displayed relief: removes 30 m DEM noise only, keeps the real shape
H = gblur(H.astype(np.float64), GSIG).astype(np.float32)
mx = meta['mercator']
def merc(lat, lon):
	x = (lon + 180) / 360
	s = math.sin(math.radians(lat))
	y = 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)
	return x, y
def uvof(lat, lon):
	x, y = merc(lat, lon)
	return (x - mx['x0']) / (mx['x1'] - mx['x0']), (y - mx['y0']) / (mx['y1'] - mx['y0'])   # v from the top (north)
def hat(u, v):
	fx = min(nx - 1.001, max(0, u * (nx - 1))); fy = min(ny - 1.001, max(0, v * (ny - 1)))
	i, j = int(fx), int(fy); a, b = fx - i, fy - j
	h = H[j, i] * (1 - a) * (1 - b) + H[j, i + 1] * a * (1 - b) + H[j + 1, i] * (1 - a) * b + H[j + 1, i + 1] * a * b
	return max(0.0, float(h)) / 1000 * EXAG
def P(lat, lon, agl=0.0):
	u, v = uvof(lat, lon)
	return Vector(((u - 0.5) * WK, (0.5 - v) * HK, hat(u, v) + agl))

G = {'vent': (37.7249, 15.016), 'fissA': (37.7262, 15.0133), 'fissB': (37.7245, 15.0168), 'front': (37.7026, 15.0944),
     'town': (37.6933, 15.1065), 'mid': (37.7145, 15.0564), 'summit': None}
j, i = np.unravel_index(H.argmax(), H.shape)
SUMMIT = Vector(((i / (nx - 1) - 0.5) * WK, (0.5 - j / (ny - 1)) * HK, H.max() / 1000 * EXAG))

# ------------------------------------------------------------------ look parameters
STEP = float(arg('step', 150))          # m between colour terraces
TH = float(arg('th', 0.16))              # toon threshold on the sun-only diffuse (sun strength π → value = cos(incidence))
SUN_EL = float(arg('sunel', 32))        # sun elevation (deg)
SUN_AZ = float(arg('sunaz', 20))        # rotation about Z (deg) — light from the SSE like the pilot
LINE_DARK = float(arg('ldark', 3.0)) / 1387     # contour shadow line width in full-res pixels → km per km of view distance
LINE_LIGHT = float(arg('llight', 1.0)) / 1387
NSIG = float(arg('nsig', 2.0))          # px (DEM) gaussian for the shading normals: big clean light/shadow shapes
CSIG = float(arg('csig', 1.5))          # px (DEM) gaussian for the terrace/contour height: smooth paper edges, real shape
HOUSE_H = float(arg('househ', 1.6))     # house height exaggeration (footprints stay real)

def lin(h):
	h = h.lstrip('#'); c = [int(h[k:k + 2], 16) / 255 for k in (0, 2, 4)]
	return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

# hypsometric paper palette, one colour per STEP terrace (sea level → summit): bright greens → olive → sand → warm browns →
# dusty purples → dark slate summit (lava orange pops against both the greens and the purples)
KEYS = [(0, '#a6de74'), (350, '#84cf62'), (700, '#62bd59'), (1000, '#4fab57'), (1300, '#7fb84f'), (1550, '#b4c056'),
        (1750, '#d6bd62'), (1950, '#dca666'), (2200, '#c88a60'), (2500, '#a57062'), (2800, '#845d67'), (3050, '#644c66'),
        (3250, '#4c3d58'), (3400, '#5c4f68')]
def _key(hm_):
	for (h0, c0), (h1, c1) in zip(KEYS, KEYS[1:]):
		if hm_ <= h1:
			t = (hm_ - h0) / (h1 - h0); a = [int(c0[k:k + 2], 16) for k in (1, 3, 5)]; b = [int(c1[k:k + 2], 16) for k in (1, 3, 5)]
			return [a[k] + (b[k] - a[k]) * t for k in range(3)]
	return [int(KEYS[-1][1][k:k + 2], 16) for k in (1, 3, 5)]
NB = int(math.ceil(3400 / STEP))
BANDS = []
for k in range(NB):
	c = _key((k + 0.5) * STEP); f_ = 1.045 if k % 2 == 0 else 0.965
	BANDS.append('#' + ''.join(f'{max(0, min(255, int(round(x * f_)))):02x}' for x in c))

# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.resolution_percentage = SCALE
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, NF + PRE
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGB'
sc.render.film_transparent = False
sc.render.filter_size = 1.0             # crisper pixel filter than the 1.5 px default
sc.view_settings.view_transform = 'Standard'     # palette colours come out exactly (sRGB)
sc.view_settings.look = 'None'
sc.view_settings.exposure = 0; sc.view_settings.gamma = 1
sc.eevee.taa_render_samples = int(arg('samples', 24))
sc.eevee.shadow_resolution_scale = 1.0
sc.gravity = (0, 0, -float(arg('grav', 0.9)))       # km/s²: cartoon-fast ballistic arcs for the fountains (1 unit = 1 km)

def node(nt, kind, loc=(0, 0), **kw):
	n = nt.nodes.new(kind); n.location = loc
	for k, v in kw.items():
		setattr(n, k, v)
	return n
link = lambda nt, a, b: nt.links.new(a, b)
def _in(nt, sock, v):
	if v is None: return
	if isinstance(v, (int, float)): sock.default_value = v
	elif isinstance(v, tuple): sock.default_value = v
	else: nt.links.new(v, sock)
def M(nt, op, a, b=None, c=None, clamp=False):
	n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
	for k, v in enumerate((a, b, c)): _in(nt, n.inputs[k], v)
	return n.outputs[0]
def MIX(nt, fac, c1, c2, blend='MIX'):
	n = nt.nodes.new('ShaderNodeMixRGB'); n.blend_type = blend
	_in(nt, n.inputs['Fac'], fac); _in(nt, n.inputs['Color1'], c1); _in(nt, n.inputs['Color2'], c2)
	return n.outputs['Color']
def VM(nt, op, a, b=None):
	n = nt.nodes.new('ShaderNodeVectorMath'); n.operation = op
	_in(nt, n.inputs[0], a); _in(nt, n.inputs[1], b)
	return n.outputs['Value'] if op in ('LENGTH', 'DOT_PRODUCT', 'DISTANCE') else n.outputs['Vector']
def RAMP(nt, fac, stops, interp='CONSTANT'):
	r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = interp; el = r.color_ramp.elements
	el[0].position, el[0].color = stops[0]
	el[1].position, el[1].color = stops[1]
	for p_, c_ in stops[2:]:
		e = el.new(p_); e.color = c_
	_in(nt, r.inputs['Fac'], fac)
	return r.outputs['Color']
def STEPF(nt, x, edge, width=0.0):
	"""1 where x > edge (crisp; TAA anti-aliases the edge)."""
	if width <= 0: return M(nt, 'GREATER_THAN', x, edge)
	mr = nt.nodes.new('ShaderNodeMapRange'); mr.clamp = True
	_in(nt, mr.inputs['Value'], x); mr.inputs['From Min'].default_value = edge - width; mr.inputs['From Max'].default_value = edge + width
	return mr.outputs['Result']
def lit_factor(nt, normal=None):
	"""Sun-only diffuse → hard 2-tone threshold (includes crisp cast shadows)."""
	d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (1, 1, 1, 1)
	if normal is not None: nt.links.new(normal, d.inputs['Normal'])
	s2r = nt.nodes.new('ShaderNodeShaderToRGB'); nt.links.new(d.outputs[0], s2r.inputs[0])
	bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(s2r.outputs['Color'], bw.inputs[0])
	return STEPF(nt, bw.outputs[0], TH)
def emit_out(nt, col, strength=1.0):
	o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission')
	_in(nt, e.inputs['Color'], col); e.inputs['Strength'].default_value = strength
	nt.links.new(e.outputs[0], o.inputs['Surface'])
def toon_mat(name, lit_col, shade_col, warm=None, cull=False):
	"""Flat 2-tone material: lit colour where the sun hits, shade colour in shadow. lit/shade: linear RGBA or a callable(nt)→socket."""
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	lc = lit_col(nt) if callable(lit_col) else lit_col
	scol = shade_col(nt, lc) if callable(shade_col) else shade_col
	lf = lit_factor(nt)
	col = MIX(nt, lf, scol, lc)
	if warm is not None: col = warm(nt, col)
	emit_out(nt, col)
	m.use_backface_culling = cull
	return m
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

# ------------------------------------------------------------------ terrain mesh (real relief, unchanged geometry)
step = 1
ys, xs = np.mgrid[0:ny:step, 0:nx:step]
gx, gy = xs.shape[1], xs.shape[0]
vx = (xs / (nx - 1) - 0.5) * WK
vy = (0.5 - ys / (ny - 1)) * HK
Hc = np.clip(H[::step, ::step], 0, None)
vz = Hc / 1000 * EXAG
verts = np.stack([vx, vy, vz], -1).reshape(-1, 3).astype(np.float32)
q = np.arange(gx * gy).reshape(gy, gx)
faces = np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], -1).reshape(-1, 4)
me = bpy.data.meshes.new('etna')
me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.ravel())
me.loops.add(faces.size); me.loops.foreach_set('vertex_index', faces.ravel().astype(np.int32))
me.polygons.add(len(faces)); me.polygons.foreach_set('loop_start', np.arange(0, faces.size, 4, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(len(faces), 4, np.int32))
me.update(); me.validate()
uvl = me.uv_layers.new(name='UVMap')
uu = (xs / (nx - 1)).ravel(); vv = (1 - ys / (ny - 1)).ravel()
luv = np.stack([uu, vv], -1)[faces.ravel()]
uvl.data.foreach_set('uv', luv.ravel().astype(np.float32))
me.polygons.foreach_set('use_smooth', np.ones(len(faces), bool))
# simplified shading normals: normals of a gently smoothed copy of the relief → big, clean paper-like light/shadow shapes
Hs = gblur(vz.astype(np.float64), NSIG)
dxm = WK / (nx - 1); dym = HK / (ny - 1)
gzx = np.gradient(Hs, axis=1) / dxm; gzy = -np.gradient(Hs, axis=0) / dym       # +y is north = up the rows
nrm = np.stack([-gzx, -gzy, np.ones_like(Hs)], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
at = me.attributes.new('snrm', 'FLOAT_VECTOR', 'POINT'); at.data.foreach_set('vector', nrm.reshape(-1).astype(np.float32))
Hz = gblur(vz.astype(np.float64), CSIG)
at2 = me.attributes.new('sz', 'FLOAT', 'POINT'); at2.data.foreach_set('value', Hz.reshape(-1).astype(np.float32))
terr = bpy.data.objects.new('etna', me); sc.collection.objects.link(terr)

# ------------------------------------------------------------------ glow halo map around the flow (crisp rings, data-derived)
lav_img = bpy.data.images.load(str(ROOT / 'public/terrain/etna/lava.png')); lav_img.colorspace_settings.name = 'Non-Color'
LW, LH = lav_img.size
lava_px = np.asarray(lav_img.pixels[:], np.float32).reshape(LH, LW, 4)[::-1, :, 0]      # PNG orientation (row 0 = north)
ins = lava_px < 0.995
rr_, cc_ = np.nonzero(ins); PAD = 40
y0, y1 = max(0, rr_.min() - PAD), min(LH, rr_.max() + PAD + 1); x0, x1 = max(0, cc_.min() - PAD), min(LW, cc_.max() + PAD + 1)
A_ = np.where(ins, lava_px, 1.0)[y0:y1, x0:x1]
def dil(a, cross):
	p = np.pad(a, 1, mode='edge')
	o = np.minimum.reduce([p[1:-1, 1:-1], p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]])
	if not cross: o = np.minimum.reduce([o, p[:-2, :-2], p[:-2, 2:], p[2:, :-2], p[2:, 2:]])
	return o
R1, R2 = int(arg('halo1', 6)), int(arg('halo2', 15))     # px of 7.3 m
rings = {}
for k in range(1, R2 + 1):
	A_ = dil(A_, k % 2 == 0)
	if k in (R1, R2): rings[k] = A_.copy()
ch, cw = A_.shape
hpx = np.ones((ch, cw, 4), np.float32); hpx[..., 0] = rings[R1]; hpx[..., 1] = rings[R2]
halo_img = bpy.data.images.new('lava_halo', cw, ch, alpha=True, float_buffer=True); halo_img.colorspace_settings.name = 'Non-Color'
halo_img.pixels.foreach_set(hpx[::-1].ravel())

# ------------------------------------------------------------------ terrain + lava material (flat paper terraces)
mat = bpy.data.materials.new('etna'); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
uv = node(nt, 'ShaderNodeUVMap', uv_map='UVMap')
geo = node(nt, 'ShaderNodeNewGeometry')
tc = node(nt, 'ShaderNodeTexCoord')
camd = node(nt, 'ShaderNodeCameraData')
szat = node(nt, 'ShaderNodeAttribute'); szat.attribute_name = 'sz'; szat.attribute_type = 'GEOMETRY'
hm = M(nt, 'MULTIPLY', szat.outputs['Fac'], 1000 / EXAG)              # real elevation (gently smoothed), m
xb = M(nt, 'DIVIDE', hm, STEP)
band = M(nt, 'FLOOR', xb)
fb_ = M(nt, 'FRACT', xb)
bcol = RAMP(nt, M(nt, 'DIVIDE', M(nt, 'ADD', band, 0.5), NB), [(k / NB, lin(c)) for k, c in enumerate(BANDS)])
# contour edges with a constant on-screen width: horizontal distance to the contour = Δz / |∇z|
sn = node(nt, 'ShaderNodeAttribute'); sn.attribute_name = 'snrm'; sn.attribute_type = 'GEOMETRY'
snn = VM(nt, 'NORMALIZE', sn.outputs['Vector'])
sepn = node(nt, 'ShaderNodeSeparateXYZ'); link(nt, snn, sepn.inputs['Vector'])
nz = sepn.outputs['Z']
grad = M(nt, 'DIVIDE', M(nt, 'SQRT', M(nt, 'MAXIMUM', M(nt, 'SUBTRACT', 1.0, M(nt, 'MULTIPLY', nz, nz)), 1e-6)), M(nt, 'MAXIMUM', nz, 0.05))
K = STEP * EXAG / 1000
vd = camd.outputs['View Distance']
dark = M(nt, 'LESS_THAN', M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 1.0, fb_), K), M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', vd, LINE_DARK), grad))
light = M(nt, 'LESS_THAN', M(nt, 'MULTIPLY', fb_, K), M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', vd, LINE_LIGHT), grad))
# sun: 2 tones (simplified normals), shadow side cool purple
lf = lit_factor(nt, snn)
shade = MIX(nt, 1.0, bcol, lin('#a49ad6'), 'MULTIPLY')
col = MIX(nt, lf, shade, bcol)
col = MIX(nt, M(nt, 'MULTIPLY', light, 0.3), col, (1, 1, 1, 1))                       # light rim on the upper sheet
col = MIX(nt, M(nt, 'MULTIPLY', dark, 0.8), col, MIX(nt, 1.0, col, lin('#5a4c80'), 'MULTIPLY'))   # drop line under the edge
# glow rings around the fissure (distance to the fissure segment, XY)
fa, fb = P(*G['fissA']), P(*G['fissB'])
pxy = VM(nt, 'MULTIPLY', geo.outputs['Position'], (1.0, 1.0, 0.0))
ab = Vector((fb.x - fa.x, fb.y - fa.y, 0))
tpar = M(nt, 'DIVIDE', VM(nt, 'DOT_PRODUCT', VM(nt, 'SUBTRACT', pxy, (fa.x, fa.y, 0.0)), tuple(ab)), ab.length_squared, clamp=True)
cn = node(nt, 'ShaderNodeCombineXYZ'); link(nt, M(nt, 'MULTIPLY_ADD', tpar, ab.x, fa.x), cn.inputs['X']); link(nt, M(nt, 'MULTIPLY_ADD', tpar, ab.y, fa.y), cn.inputs['Y'])
dfis = VM(nt, 'DISTANCE', pxy, cn.outputs['Vector'])
GLOW = lin('#ffb24a')
col = MIX(nt, M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', dfis, 0.95), 0.22), col, GLOW)
col = MIX(nt, M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', dfis, 0.55), 0.38), col, GLOW)
col = MIX(nt, M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', dfis, 0.28), 0.55), col, lin('#ffd060'))
# --- lava (real 1992 flow: arrival map R channel; edge distance map)
prog_n = node(nt, 'ShaderNodeValue'); prog_n.label = 'prog'; prog = prog_n.outputs[0]
lav = node(nt, 'ShaderNodeTexImage'); lav.image = lav_img; lav.interpolation = 'Linear'; link(nt, uv.outputs['UV'], lav.inputs['Vector'])
sepl = node(nt, 'ShaderNodeSeparateColor'); link(nt, lav.outputs['Color'], sepl.inputs['Color'])
arr = sepl.outputs['Red']
edg = node(nt, 'ShaderNodeTexImage'); edg.image = bpy.data.images.load(str(ROOT / 'public/terrain/etna/lava_edge.png')); edg.image.colorspace_settings.name = 'Non-Color'
link(nt, uv.outputs['UV'], edg.inputs['Vector'])
edge = edg.outputs['Color']
on = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', arr, prog), M(nt, 'LESS_THAN', arr, 0.995))
age = M(nt, 'SUBTRACT', prog, arr)
# halo rings (outside the flow): some flow pixel within R px has already arrived
hmap = node(nt, 'ShaderNodeMapping'); hmap.vector_type = 'POINT'
hmap.inputs['Scale'].default_value = (LW / cw, LH / ch, 1); hmap.inputs['Location'].default_value = (-x0 / cw, -(LH - y1) / ch, 0)
link(nt, uv.outputs['UV'], hmap.inputs['Vector'])
hal = node(nt, 'ShaderNodeTexImage'); hal.image = halo_img; hal.interpolation = 'Linear'; hal.extension = 'EXTEND'; link(nt, hmap.outputs['Vector'], hal.inputs['Vector'])
seph = node(nt, 'ShaderNodeSeparateColor'); link(nt, hal.outputs['Color'], seph.inputs['Color'])
col = MIX(nt, M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', seph.outputs['Green'], prog), 0.3), col, lin('#ffb347'))
col = MIX(nt, M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', seph.outputs['Red'], prog), 0.6), col, lin('#ff9a3a'))
# flat molten bands by distance from the flow edge: dark outline | red rim | orange body
molten = RAMP(nt, edge, [(0.0, lin('#4a140c')), (0.07, lin('#e2361c')), (0.32, lin('#ff7f16'))])
# older parts crust over cell by cell: dark plates with glowing seams (coverage grows with age)
wn = node(nt, 'ShaderNodeTexNoise'); wn.inputs['Scale'].default_value = 3.0; link(nt, tc.outputs['Object'], wn.inputs['Vector'])
wmix = nt.nodes.new('ShaderNodeVectorMath'); wmix.operation = 'MULTIPLY_ADD'
link(nt, wn.outputs['Color'], wmix.inputs[0]); wmix.inputs[1].default_value = (0.08, 0.08, 0.0); link(nt, tc.outputs['Object'], wmix.inputs[2])
v1 = node(nt, 'ShaderNodeTexVoronoi', feature='F1'); v1.inputs['Scale'].default_value = 7.0; link(nt, wmix.outputs[0], v1.inputs['Vector'])
v2 = node(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE'); v2.inputs['Scale'].default_value = 7.0; link(nt, wmix.outputs[0], v2.inputs['Vector'])
cellr = node(nt, 'ShaderNodeSeparateColor'); link(nt, v1.outputs['Color'], cellr.inputs['Color'])
cover = node(nt, 'ShaderNodeMapRange'); cover.clamp = True; link(nt, age, cover.inputs['Value'])
cover.inputs['From Min'].default_value = 0.06; cover.inputs['From Max'].default_value = 0.35; cover.inputs['To Min'].default_value = 0.0; cover.inputs['To Max'].default_value = 0.42
marg = node(nt, 'ShaderNodeMapRange'); marg.clamp = True; link(nt, edge, marg.inputs['Value'])
marg.inputs['From Min'].default_value = 0.5; marg.inputs['From Max'].default_value = 0.95; marg.inputs['To Min'].default_value = 0.35; marg.inputs['To Max'].default_value = 0.0
ventz = node(nt, 'ShaderNodeMapRange'); ventz.clamp = True; link(nt, arr, ventz.inputs['Value'])
ventz.inputs['From Min'].default_value = 0.04; ventz.inputs['From Max'].default_value = 0.16; ventz.inputs['To Min'].default_value = 0.25; ventz.inputs['To Max'].default_value = 1.0
cov2 = M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', M(nt, 'ADD', cover.outputs['Result'], marg.outputs['Result']), M(nt, 'GREATER_THAN', age, 0.06)), ventz.outputs['Result'])
plate = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', cellr.outputs['Red'], cov2), M(nt, 'GREATER_THAN', v2.outputs['Distance'], 0.09))
plate = M(nt, 'MULTIPLY', plate, M(nt, 'GREATER_THAN', edge, 0.07))
lcol = MIX(nt, plate, molten, lin('#4b2232'))
# hot zones: fresh lava (age < 0.06) yellow core, the advancing front pale yellow
young = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', age, 0.07), M(nt, 'GREATER_THAN', edge, 0.32))
lcol = MIX(nt, young, lcol, lin('#ffc93a'))
frontm = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', age, 0.018), M(nt, 'GREATER_THAN', edge, 0.07))
lcol = MIX(nt, frontm, lcol, lin('#fff09a'))
col = MIX(nt, on, col, lcol)
emit_out(nt, col)
terr.data.materials.append(mat)
# prog over the shot: the front crawls down Valle del Bove toward the town (Etna.tsx progR range)
for t, v in ((T0, 0.42), (T1, 0.74)):
	prog_n.outputs[0].default_value = v; prog_n.outputs[0].keyframe_insert('default_value', frame=fr(t))
for fc in fcurves_of(mat.node_tree):
	for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# ------------------------------------------------------------------ sea (flat)
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0.002))
sea = bpy.context.object; sm = bpy.data.materials.new('sea'); sm.use_nodes = True; sm.node_tree.nodes.clear()
emit_out(sm.node_tree, lin('#3aa0d8'))
sea.data.materials.append(sm)

# ------------------------------------------------------------------ world: bright sky gradient (camera rays only; no ambient, so toon shading = sun only)
wd = bpy.data.worlds.new('sky'); sc.world = wd; wd.use_nodes = True
wn_ = wd.node_tree; wn_.nodes.clear()
wo = node(wn_, 'ShaderNodeOutputWorld')
wtc = node(wn_, 'ShaderNodeTexCoord')
wsep = node(wn_, 'ShaderNodeSeparateXYZ'); link(wn_, wtc.outputs['Generated'], wsep.inputs['Vector'])
skyc = RAMP(wn_, wsep.outputs['Z'], [(0.0, lin('#ffd9a0')), (0.06, lin('#ffe9bf')), (0.2, lin('#a6dcf0')), (0.42, lin('#4f95e0')), (0.7, lin('#2f6fd0'))], 'LINEAR')
wbg = node(wn_, 'ShaderNodeBackground'); link(wn_, skyc, wbg.inputs['Color']); wbg.inputs['Strength'].default_value = 1.0
lp = node(wn_, 'ShaderNodeLightPath')
wbk = node(wn_, 'ShaderNodeBackground'); wbk.inputs['Color'].default_value = (0, 0, 0, 1)
wmx = node(wn_, 'ShaderNodeMixShader'); link(wn_, lp.outputs['Is Camera Ray'], wmx.inputs['Fac']); link(wn_, wbk.outputs[0], wmx.inputs[1]); link(wn_, wbg.outputs[0], wmx.inputs[2])
link(wn_, wmx.outputs[0], wo.inputs['Surface'])

# ------------------------------------------------------------------ sun (strength π → shader-to-RGB value of white diffuse = cos(incidence))
sun_d = bpy.data.lights.new('sun', 'SUN'); sun_d.energy = math.pi; sun_d.color = (1, 1, 1); sun_d.angle = math.radians(0.4)
sun_d.use_shadow_jitter = False; sun_d.shadow_filter_radius = 0.3
sun = bpy.data.objects.new('sun', sun_d); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(90 - SUN_EL), 0, math.radians(SUN_AZ))

# ------------------------------------------------------------------ puffs: toon-shaded spheres with a thin inverted-hull outline
pm = bpy.data.meshes.new('puff'); bmp = bmesh.new()
bmesh.ops.create_icosphere(bmp, subdivisions=3, radius=1.0)
n0 = len(bmp.faces)
hull = bmesh.ops.create_icosphere(bmp, subdivisions=3, radius=1.06)
hull_faces = [f for f in bmp.faces][n0:]
bmesh.ops.reverse_faces(bmp, faces=hull_faces)
for f in hull_faces: f.material_index = 1
for f in bmp.faces: f.smooth = True
bmp.to_mesh(pm); bmp.free()
def puff_set(name, lit, shade, line, warm_z=None, warm_col=None):
	def warm(nt_, c_):
		if warm_z is None: return c_
		oi = nt_.nodes.new('ShaderNodeObjectInfo'); sz = nt_.nodes.new('ShaderNodeSeparateXYZ'); nt_.links.new(oi.outputs['Location'], sz.inputs['Vector'])
		w_ = M(nt_, 'LESS_THAN', sz.outputs['Z'], warm_z)
		return MIX(nt_, M(nt_, 'MULTIPLY', w_, 0.55), c_, warm_col)
	mb = toon_mat(name, lin(lit), lin(shade), warm=warm)
	ml = bpy.data.materials.new(name + '_line'); ml.use_nodes = True; ml.node_tree.nodes.clear(); emit_out(ml.node_tree, lin(line))
	ml.use_backface_culling = True; ml.use_backface_culling_shadow = True
	me_ = pm.copy(); me_.name = name; me_.materials.append(mb); me_.materials.append(ml)
	return me_
f_a, f_b = 1, NF + PRE
def column(mesh, base, height, radius, n, wind, rise, seed, r0=0.3, grow=0.7):
	rg = np.random.default_rng(seed)
	for k in range(n):
		s0 = -rise + (1 + rise) * (k + rg.random() * 0.8) / n
		ang = rg.random() * math.tau; lat = rg.random() ** 0.7; sz = 0.55 + 0.45 * rg.random(); zj = (rg.random() - 0.5) * 0.4
		o = bpy.data.objects.new(f'{mesh.name}{k}', mesh); sc.collection.objects.link(o)
		for f in list(range(f_a, f_b, 12)) + [f_b]:
			s = s0 + rise * (f - f_a) / (f_b - f_a)
			sc_ = max(0.0, min(1.0, s / 0.05)) if s < 0.05 else 1.0
			sv = max(s, 0.0)
			R = radius * (r0 + grow * sv)
			lean = sv ** 1.25
			c = base + Vector((wind[0] * height * lean + math.cos(ang) * R * 0.75 * lat, wind[1] * height * lean + math.sin(ang) * R * 0.75 * lat, height * sv + zj * R))
			o.location = c; o.keyframe_insert('location', frame=f)
			r_ = R * sz * sc_ * (1 + 0.12 * (f - f_a) / (f_b - f_a))
			o.scale = (r_, r_, r_); o.keyframe_insert('scale', frame=f)
		for fc in fcurves_of(o):
			for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
# summit ash plume (big leaning column) and the flank eruption smoke (darker, under-lit by the lava)
ash_m = puff_set('ash', '#f4f1f6', '#aa9fc2', '#7c6f98')
column(ash_m, SUMMIT + Vector((0, 0, -0.1)), 5.5, 1.15, int(arg('npuff', 80)), (0.45, 0.12), 0.08, 3)
vent = P(*G['vent'])
smk_m = puff_set('smoke', '#c9bfc4', '#7d6d86', '#4e4058', warm_z=vent.z + 0.55, warm_col=lin('#ffad5a'))
column(smk_m, (fa + fb) / 2 + Vector((0.25, 0.05, 0.55)), 1.8, 0.4, 34, (0.4, 0.1), 0.12, 5, r0=0.5, grow=0.9)

# ------------------------------------------------------------------ lava fountains along the fissure (particles on ballistic arcs)
bpy.ops.mesh.primitive_plane_add(size=1, location=((fa + fb) / 2 + Vector((0, 0, 0.015))))
em = bpy.context.object; em.name = 'fissure'
d = fb - fa; em.scale = (d.length, 0.03, 1); em.rotation_euler = (0, 0, math.atan2(d.y, d.x))
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=float(arg('blob', 0.055)))
blob = bpy.context.object; blob.name = 'blob'
bm_ = bpy.data.materials.new('blob'); bm_.use_nodes = True; bn = bm_.node_tree; bn.nodes.clear()
oi = bn.nodes.new('ShaderNodeObjectInfo')
emit_out(bn, RAMP(bn, oi.outputs['Random'], [(0.0, lin('#fff3a0')), (0.3, lin('#ffd23a')), (0.62, lin('#ff8a1c')), (0.88, lin('#f0441c'))]))
blob.data.materials.append(bm_)
blob.location = (0, 0, -50); blob.visible_shadow = False        # glowing blobs cast no shadow
ps_mod = em.modifiers.new('fount', 'PARTICLE_SYSTEM'); ps = ps_mod.particle_system.settings
ps.count = int(arg('nblob', 6000)); ps.frame_start = 1; ps.frame_end = NF + PRE; ps.timestep = 1 / FPS
VUP = float(arg('vup', 1.0))
ps.lifetime = int(2.15 * VUP / abs(sc.gravity[2]) * FPS); ps.lifetime_random = 0.25
ps.emit_from = 'FACE'; ps.normal_factor = VUP; ps.factor_random = VUP * float(arg('spread', 0.9)); ps.object_align_factor = (0, 0, 0)
ps.render_type = 'OBJECT'; ps.instance_object = blob; ps.particle_size = 1.0; ps.size_random = 0.55
ps.physics_type = 'NEWTON'; ps.mass = 1.0; ps.use_rotations = False
em.show_instancer_for_render = False      # (hide_render on the emitter would also hide its particles)
# flat glow discs behind the fountains (always face the camera; crisp concentric rings, see-through)
disc_objs = []
if '--nodisc' not in argv:
	for rad, alpha, hx in ((0.6, 0.26, '#ffc84f'),):
		bpy.ops.mesh.primitive_circle_add(vertices=96, radius=rad, fill_type='NGON', location=(fa + fb) / 2 + Vector((0, 0, 0.38)))
		dsc = bpy.context.object; dsc.name = 'glowdisc'
		dm = bpy.data.materials.new('glowdisc'); dm.use_nodes = True; t_ = dm.node_tree; t_.nodes.clear()
		o_ = t_.nodes.new('ShaderNodeOutputMaterial'); e_ = t_.nodes.new('ShaderNodeEmission'); e_.inputs['Color'].default_value = lin(hx)
		tr_ = t_.nodes.new('ShaderNodeBsdfTransparent'); mx_ = t_.nodes.new('ShaderNodeMixShader'); mx_.inputs['Fac'].default_value = alpha
		link(t_, tr_.outputs[0], mx_.inputs[1]); link(t_, e_.outputs[0], mx_.inputs[2]); link(t_, mx_.outputs[0], o_.inputs['Surface'])
		dm.surface_render_method = 'BLENDED'; dm.use_transparent_shadow = True
		dsc.data.materials.append(dm); dsc.visible_shadow = False
		disc_objs.append(dsc)

# ------------------------------------------------------------------ Zafferana: pastel houses, terracotta roofs (toon), real OSM footprints
rng = np.random.default_rng(7)
house = bpy.data.meshes.new('house'); bmh = bmesh.new()
bmesh.ops.create_cube(bmh, size=1.0)
for v in bmh.verts: v.co.z += 0.5
bmh.to_mesh(house); bmh.free()
roof = bpy.data.meshes.new('roof'); bmr = bmesh.new()
pts = [(-0.55, -0.55, 1.0), (0.55, -0.55, 1.0), (0.55, 0.55, 1.0), (-0.55, 0.55, 1.0), (0, -0.55, 1.45), (0, 0.55, 1.45)]
vs = [bmr.verts.new(p) for p in pts]
for f in ((0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4)): bmr.faces.new([vs[i] for i in f])
bmr.to_mesh(roof); bmr.free()
def rand_ramp(cols):
	def f(nt_):
		oi_ = nt_.nodes.new('ShaderNodeObjectInfo')
		return RAMP(nt_, oi_.outputs['Random'], [(k / len(cols), lin(c)) for k, c in enumerate(cols)])
	return f
mul = lambda tint: (lambda nt_, c_: MIX(nt_, 1.0, c_, lin(tint), 'MULTIPLY'))
wall_m = toon_mat('wall', rand_ramp(['#fbf3e4', '#f7dfbf', '#f9cdbd', '#fff0b8', '#dff0f5', '#f3e6f7']), mul('#b4a6dc'))
roof_m = toon_mat('roof', rand_ramp(['#e0552c', '#d24a2a', '#ec6a36', '#c9402c']), mul('#a890d0'))
house.materials.append(wall_m); roof.materials.append(roof_m)
osm = json.load(open(ROOT / 'data/osm_zafferana/buildings.json'))['elements']
placed = 0
for el_ in osm:
	g_ = el_.get('geometry') or []
	if len(g_) < 3: continue
	lat = sum(p_['lat'] for p_ in g_) / len(g_); lon = sum(p_['lon'] for p_ in g_) / len(g_)
	u, v = uvof(lat, lon)
	if not (0 < u < 1 and 0 < v < 1): continue
	if lava_px[int(v * (lava_px.shape[0] - 1)), int(u * (lava_px.shape[1] - 1))] < 0.99: continue
	z = hat(u, v)
	if z < 0.02: continue
	xs_ = [(p_['lon'] - lon) * 111.32 * math.cos(math.radians(lat)) for p_ in g_]; ys_ = [(p_['lat'] - lat) * 110.57 for p_ in g_]
	ed = max(range(len(g_) - 1), key=lambda k: (xs_[k + 1] - xs_[k]) ** 2 + (ys_[k + 1] - ys_[k]) ** 2)
	ang = math.atan2(ys_[ed + 1] - ys_[ed], xs_[ed + 1] - xs_[ed])
	ca, sa = math.cos(-ang), math.sin(-ang)
	rx = [x * ca - y * sa for x, y in zip(xs_, ys_)]; ry = [x * sa + y * ca for x, y in zip(xs_, ys_)]
	w_ = max(0.006, min(0.05, max(rx) - min(rx))); d_ = max(0.006, min(0.05, max(ry) - min(ry)))
	hgt = (0.007 + 0.006 * rng.random()) * HOUSE_H
	for mesh_, nm in ((house, 'h'), (roof, 'r')):
		o = bpy.data.objects.new(nm, mesh_); o.location = ((u - 0.5) * WK, (0.5 - v) * HK, z - 0.002)
		o.scale = (w_, d_, hgt); o.rotation_euler = (0, 0, ang)
		sc.collection.objects.link(o)
	placed += 1
print('houses', placed)

# ------------------------------------------------------------------ camera: unchanged framing/timing from the pilot
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 26; cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 36; cam_d.clip_end = 300; cam_d.clip_start = 0.01
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(tgt)
ct = cam.constraints.new('TRACK_TO'); ct.target = tgt; ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
town = P(*G['town']); midp = P(*G['mid']); frontp = P(*G['front'])
look0 = SUMMIT * 0.55 + midp * 0.45 + Vector((0, 0, -0.9))
look1 = midp * 0.45 + frontp * 0.55 + Vector((0, 0, -0.2))
dir0 = Vector((math.cos(math.radians(-25)), math.sin(math.radians(-25)), 0))      # camera sits ESE of the town (sea side)
c0 = town + dir0 * 3.6 + Vector((0, 0, 1.35))
c1 = town + dir0 * 2.2 + Vector((0, 0, 0.95))
for t, cpos, lk in ((T0, c0, look0), (T1, c1, look1)):
	cam.location = cpos; cam.keyframe_insert('location', frame=fr(t)); tgt.location = lk; tgt.keyframe_insert('location', frame=fr(t))
for ob in (cam, tgt):
	for fc in fcurves_of(ob):
		for kp in fc.keyframe_points: kp.interpolation = 'SINE'; kp.easing = 'EASE_IN_OUT'
for dsc in disc_objs:
	c_ = dsc.constraints.new('TRACK_TO'); c_.target = cam; c_.track_axis = 'TRACK_Z'; c_.up_axis = 'UP_Y'

# ------------------------------------------------------------------ screen tracks of key points (for DOM labels in Remotion)
if '--track' in argv:
	from bpy_extras.object_utils import world_to_camera_view
	pts = {'town': P(*G['town'], 0.02), 'vent': P(*G['vent'], 0.05), 'front': P(*G['front'], 0.02), 'summit': SUMMIT}
	tr = []
	for f in range(1 + PRE, NF + PRE + 1):
		sc.frame_set(f)
		row = {}
		for k_, p_ in pts.items():
			c_ = world_to_camera_view(sc, cam, p_)
			row[k_] = [round(c_.x * 1080, 1), round((1 - c_.y) * 1920, 1)]
		tr.append(row)
	OUT.mkdir(parents=True, exist_ok=True)
	json.dump({'t0': T0, 'fps': FPS, 'frames': tr}, open(OUT / 'track.json', 'w'))
	print('track', len(tr)); sys.exit(0)

# ------------------------------------------------------------------ render
import time
OUT.mkdir(parents=True, exist_ok=True)
FROM = int(arg('from', 1))
want = [int(x) + PRE for x in FRAMES.split(',')] if FRAMES else list(range(FROM + PRE, NF + PRE + 1))
for f in range(1, max(want) + 1):
	sc.frame_set(f)                       # step through every frame so the particle simulation is consistent
	if f in want:
		sc.render.filepath = str(OUT / f'f_{f - PRE:04d}.png')
		t_ = time.time()
		bpy.ops.render.render(write_still=True)
		print('rendered', f - PRE, f'{time.time() - t_:.1f}s', flush=True)
print('done', NF, 'frames total; T0', T0, 'T1', T1)
