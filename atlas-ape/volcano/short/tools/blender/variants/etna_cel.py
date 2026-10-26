"""Etna — variant «cel» (owner 18.10: «direction fine, but the mountain is too blurred; cartoonish, without details is OK, but
COLOURFUL and with NO blur at all»). Copy of tools/blender/etna_pilot.py with a cel-shaded (toon) look:
  - same real TINITALY relief (vertical exaggeration), same real 1992 flow (lava.png arrival map, animated prog), same OSM houses,
    same camera framing/timing;
  - NO satellite tint and NO haze: flat colour zones = altitude bands (noise-warped contour lines) + crisp blobs thresholded from
    smoothed land-cover fields derived from the Sentinel-2 mosaic (forest / old dark lava / bare ground) + steep-cliff rock + snow cap;
  - lighting = Shader-to-RGB → constant 3-band ramp (lit / mid / shadow), flat emission output, Standard view transform;
  - dark ink outlines = inverted hull (terrain silhouette and puffs), line width ∝ camera distance (≈ constant px);
  - cartoon cumulus smoke = toon-shaded sphere puffs (summit ash column + white steam over the flank fissure), rising/growing;
  - toon lava: pale-yellow front, yellow core river, orange/red seams between dark crust plates, red rim; lava fountains = emissive blobs.
  blender -b --factory-startup -P tools/blender/variants/etna_cel.py -- [--frames 1,112,223] [--scale 50] [--out out/blender/var_cel]
     [--outline hull|freestyle|none] [--lw 2.2] [--samples 32] [--debug light]"""
import bpy, bmesh, json, math, sys, time
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
FRAMES = arg('frames')
SCALE = int(arg('scale', 100))
OUT = ROOT / arg('out', 'out/blender/var_cel')
OUTLINE = arg('outline', 'hull')
LW = float(arg('lw', 2.2))            # outline width in px at 1080×1920
DEBUG = arg('debug')
FPS = 60
words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']
T0 = W(48)                    # 26.13 «Italy.»
T1 = W(55) + 0.4 + 0.05       # end of the shot + cross-dissolve hold
NF = int(round((T1 - T0) * FPS))
PRE = 180                     # pre-roll frames (the fountain needs ~2.5 s to fill its arcs before the shot starts)
fr = lambda t: 1 + PRE + (t - T0) * FPS

EXAG = 1.7
meta = json.load(open(ROOT / 'public/terrain/etna/meta.json'))
nx, ny = meta['nx'], meta['ny']
WK, HK = meta['width_m'] / 1000, meta['height_m'] / 1000
H = np.fromfile(ROOT / 'public/terrain/etna/height.bin', np.float32).reshape(ny, nx)
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
def Pxy(x, y, agl=0.0):
	return Vector((x, y, hat(x / WK + 0.5, 0.5 - y / HK) + agl))

G = {'vent': (37.7249, 15.016), 'fissA': (37.7262, 15.0133), 'fissB': (37.7245, 15.0168), 'front': (37.7026, 15.0944),
     'town': (37.6933, 15.1065), 'mid': (37.7145, 15.0564), 'summit': None}
j, i = np.unravel_index(H.argmax(), H.shape)
SUMMIT = Vector(((i / (nx - 1) - 0.5) * WK, (0.5 - j / (ny - 1)) * HK, H.max() / 1000 * EXAG))

# camera path (same as the pilot) — needed early: outline widths depend on the camera distance
town = P(*G['town']); midp = P(*G['mid']); frontp = P(*G['front'])
look0 = SUMMIT * 0.55 + midp * 0.45 + Vector((0, 0, -0.9))
look1 = midp * 0.45 + frontp * 0.55 + Vector((0, 0, -0.2))
dir0 = Vector((math.cos(math.radians(-25)), math.sin(math.radians(-25)), 0))      # camera sits ESE of the town (sea side)
c0 = town + dir0 * 3.6 + Vector((0, 0, 1.35))
c1 = town + dir0 * 2.2 + Vector((0, 0, 0.95))
CAMC = (c0 + c1) / 2
LENS = 26
PXK = 2 * (18 / LENS) / 1920          # world size of one 1920-row pixel per km of distance
def line_w(d):                         # outline half-width (km) for a point at distance d (km): ≈ LW px on screen
	return LW * PXK * d

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
sc.render.filter_size = 1.0            # default 1.5 px reconstruction filter softens edges
try:
	sc.view_settings.view_transform = 'Standard'   # flat colours stay exactly as authored (no filmic desaturation)
	sc.view_settings.look = 'None'
except Exception as e:
	print('view transform', e)
print('view transform', sc.view_settings.view_transform, sc.view_settings.look)
sc.eevee.taa_render_samples = int(arg('samples', 32))
sc.eevee.use_shadows = True
GRAV = float(arg('grav', 0.5))
sc.gravity = (0, 0, -GRAV)            # 1 unit = 1 km; cartoon gravity (only the fountain particles use it): 0.7 km arcs in ~3 s

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
def VM(nt, op, a, b=None):
	n = nt.nodes.new('ShaderNodeVectorMath'); n.operation = op
	put(nt, n.inputs[0], a); put(nt, n.inputs[1], b)
	return n.outputs['Value'] if op in ('LENGTH', 'DISTANCE', 'DOT_PRODUCT') else n.outputs['Vector']
def EMIT(nt, col, out_node):
	e_ = nt.nodes.new('ShaderNodeEmission'); put(nt, e_.inputs['Color'], col); e_.inputs['Strength'].default_value = 1.0
	link(nt, e_.outputs[0], out_node.inputs['Surface'])
	return e_

# the 3 light bands (lit / mid / shadow) used by every toon material. Thresholds on the Shader-to-RGB luminance of a white
# diffuse surface (sun 4.0 + dusk sky): measured with --debug light (sun 32° up: cast shadow ≈ 0.37, flat ground ≈ 0.85, sun-facing slopes ≥ 1.0)
B1, B2 = float(arg('b1', 0.60)), float(arg('b2', 1.0))
def toon(nt, shadow, mid, lit, normal=None):
	d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (1, 1, 1, 1)
	put(nt, d.inputs['Normal'], normal)
	s2r = nt.nodes.new('ShaderNodeShaderToRGB'); link(nt, d.outputs[0], s2r.inputs[0])
	bw = nt.nodes.new('ShaderNodeRGBToBW'); link(nt, s2r.outputs['Color'], bw.inputs[0])
	if DEBUG == 'light':
		return bw.outputs[0], bw.outputs[0]
	return RAMP(nt, bw.outputs[0], [(0.0, shadow), (B1, mid), (B2, lit)]), bw.outputs[0]

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

# ------------------------------------------------------------------ terrain mesh (real relief)
step = 1
ys, xs = np.mgrid[0:ny:step, 0:nx:step]
gx, gy = xs.shape[1], xs.shape[0]
vx = (xs / (nx - 1) - 0.5) * WK
vy = (0.5 - ys / (ny - 1)) * HK
vz = np.clip(H[::step, ::step], 0, None) / 1000 * EXAG
verts = np.stack([vx, vy, vz], -1).reshape(-1, 3).astype(np.float32)
q = np.arange(gx * gy).reshape(gy, gx)
faces = np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], -1).reshape(-1, 4)
uu = (xs / (nx - 1)).ravel(); vv = (1 - ys / (ny - 1)).ravel()
def grid_mesh(name, vco, fcs, with_uv=True):
	me_ = bpy.data.meshes.new(name)
	me_.vertices.add(len(vco)); me_.vertices.foreach_set('co', vco.ravel())
	me_.loops.add(fcs.size); me_.loops.foreach_set('vertex_index', fcs.ravel().astype(np.int32))
	me_.polygons.add(len(fcs)); me_.polygons.foreach_set('loop_start', np.arange(0, fcs.size, 4, dtype=np.int32)); me_.polygons.foreach_set('loop_total', np.full(len(fcs), 4, np.int32))
	me_.update(); me_.validate()
	if with_uv:
		uvl_ = me_.uv_layers.new(name='UVMap')
		uvl_.data.foreach_set('uv', np.stack([uu, vv], -1)[fcs.ravel()].ravel().astype(np.float32))
	me_.polygons.foreach_set('use_smooth', np.ones(len(fcs), bool))
	return me_
me = grid_mesh('etna', verts, faces)
terr = bpy.data.objects.new('etna', me); sc.collection.objects.link(terr)

# ------------------------------------------------------------------ land-cover fields (data → crisp cartoon blobs)
# The Sentinel-2 mosaic is NOT used as a texture: three land-cover probabilities are classified per pixel, smoothed (~50 m) and
# only ever thresholded at 0.5 in the shader → hard-edged, blobby colour zones that follow the real forests and old lava fields.
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
def zone_image():
	t_ = time.time()
	img = bpy.data.images.load(str(ROOT / 'public/terrain/etna/sat.jpg')); img.colorspace_settings.name = 'Non-Color'
	w_, h_ = img.size
	a = np.empty(w_ * h_ * 4, np.float32); img.pixels.foreach_get(a)
	a = a.reshape(h_, w_, 4)[::-1, :, :3]                    # north-up
	h2, w2 = h_ // 2, w_ // 2
	a = a[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2, 3).mean((1, 3))
	r, g, b = a[..., 0], a[..., 1], a[..., 2]
	lum = 0.3 * r + 0.59 * g + 0.11 * b
	gr = g - np.maximum(r, b)
	forest = np.clip((gr - 0.02) / 0.02, 0, 1) * np.clip((0.26 - lum) / 0.03, 0, 1)
	oldlava = np.clip((0.172 - lum) / 0.03, 0, 1) * np.clip((0.02 - gr) / 0.02, 0, 1)
	bare = np.clip((r - g - 0.0) / 0.02, 0, 1) * np.clip((lum - 0.17) / 0.03, 0, 1)
	f = np.stack([gblur(forest, 3.5), gblur(oldlava, 3.5), gblur(bare, 4.5), np.ones_like(lum)], -1)[::-1]
	zi = bpy.data.images.new('zones', w2, h2, alpha=True, float_buffer=True); zi.colorspace_settings.name = 'Non-Color'
	zi.pixels.foreach_set(np.ascontiguousarray(f, np.float32).ravel())
	bpy.data.images.remove(img)
	print('zones %.1fs' % (time.time() - t_), w2, h2)
	return zi
ZONES = zone_image()

# ------------------------------------------------------------------ terrain + lava material (toon)
mat = bpy.data.materials.new('etna'); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (1600, 0))
uv = node(nt, 'ShaderNodeUVMap', (-1600, 200), uv_map='UVMap')
tc = node(nt, 'ShaderNodeTexCoord', (-1600, -200))
geo = node(nt, 'ShaderNodeNewGeometry', (-1600, -500))
pos = SEP(nt, geo.outputs['Position']); nrm = SEP(nt, geo.outputs['Normal'])
zt = node(nt, 'ShaderNodeTexImage', (-1300, 300)); zt.image = ZONES; zt.interpolation = 'Cubic'
link(nt, uv.outputs['UV'], zt.inputs['Vector'])
zs = node(nt, 'ShaderNodeSeparateColor', (-1100, 300)); link(nt, zt.outputs['Color'], zs.inputs['Color'])
# altitude (real km) with a low-frequency wobble → cartoon contour bands
wob = node(nt, 'ShaderNodeTexNoise', (-1300, -100)); wob.inputs['Scale'].default_value = 0.45; wob.inputs['Detail'].default_value = 1.5
link(nt, tc.outputs['Object'], wob.inputs['Vector'])
alt = M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wob.outputs['Fac'], 0.5), 0.45, M(nt, 'DIVIDE', pos['Z'], EXAG))
PAL = {
	'farm': (0.30, 0.62, 0.10), 'green': (0.17, 0.50, 0.12), 'olive': (0.42, 0.46, 0.14), 'brown': (0.40, 0.25, 0.13),
	'cone': (0.30, 0.25, 0.27), 'ash': (0.40, 0.38, 0.42), 'snow': (0.93, 0.95, 1.0),
	'forest': (0.05, 0.30, 0.09), 'bare': (0.58, 0.44, 0.22), 'oldlava': (0.075, 0.06, 0.095), 'cliff': (0.36, 0.17, 0.12),
}
base = RAMP(nt, M(nt, 'DIVIDE', alt, 3.4), [(0.0, PAL['farm']), (0.22, PAL['green']), (0.42, PAL['olive']), (0.55, PAL['brown']),
                                           (0.68, PAL['cone']), (0.79, PAL['ash'])])
lowland = M(nt, 'LESS_THAN', alt, 2.0)
bareF = M(nt, 'MULTIPLY', M(nt, 'GREATER_THAN', zs.outputs['Blue'], 0.5), M(nt, 'LESS_THAN', alt, 1.6))
base = MIX(nt, bareF, base, PAL['bare'])
forF = M(nt, 'MULTIPLY', M(nt, 'GREATER_THAN', zs.outputs['Red'], 0.5), lowland)
base = MIX(nt, forF, base, PAL['forest'])
olF = M(nt, 'GREATER_THAN', zs.outputs['Green'], 0.5)
base = MIX(nt, olF, base, PAL['oldlava'])
cliffF = M(nt, 'LESS_THAN', nrm['Z'], 0.56)
base = MIX(nt, cliffF, base, PAL['cliff'])
snowF = M(nt, 'MULTIPLY', M(nt, 'GREATER_THAN', alt, 2.93), M(nt, 'GREATER_THAN', nrm['Z'], 0.45))
base = MIX(nt, snowF, base, PAL['snow'])
band, lum = toon(nt, (0.40, 0.36, 0.64), (0.74, 0.70, 0.84), (1.0, 0.95, 0.86))
shaded = MIX(nt, 1.0, base, band, 'MULTIPLY')
# eruption light on the ground around the flank fissure: crisp, wobbly orange rings (no soft falloff)
ventv = P(*G['vent'])
dv = VM(nt, 'DISTANCE', geo.outputs['Position'], tuple(ventv))
wob2 = node(nt, 'ShaderNodeTexNoise', (-600, -900)); wob2.inputs['Scale'].default_value = 3.0; wob2.inputs['Detail'].default_value = 1.0
link(nt, tc.outputs['Object'], wob2.inputs['Vector'])
dvw = M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', wob2.outputs['Fac'], 0.5), 0.35, dv)
ringA = M(nt, 'LESS_THAN', dvw, 0.5)
shaded = MIX(nt, M(nt, 'MULTIPLY', ringA, 0.42), shaded, (1.0, 0.5, 0.12))
# --- lava (real 1992 flow: arrival map R channel; edge distance map) — toon classes
lav = node(nt, 'ShaderNodeTexImage', (-1300, 700)); lav.image = bpy.data.images.load(str(ROOT / 'public/terrain/etna/lava.png')); lav.image.colorspace_settings.name = 'Non-Color'; lav.interpolation = 'Cubic'
link(nt, uv.outputs['UV'], lav.inputs['Vector'])
sepl = node(nt, 'ShaderNodeSeparateColor', (-1100, 700)); link(nt, lav.outputs['Color'], sepl.inputs['Color'])
edg = node(nt, 'ShaderNodeTexImage', (-1300, 1000)); edg.image = bpy.data.images.load(str(ROOT / 'public/terrain/etna/lava_edge.png')); edg.image.colorspace_settings.name = 'Non-Color'; edg.interpolation = 'Cubic'
link(nt, uv.outputs['UV'], edg.inputs['Vector'])
edge = edg.outputs['Color']
prog = node(nt, 'ShaderNodeValue', (-1300, 1250)); prog.label = 'prog'
arr = sepl.outputs['Red']
onm = M(nt, 'MULTIPLY', M(nt, 'LESS_THAN', arr, prog.outputs[0]), M(nt, 'LESS_THAN', arr, 0.99))
age = M(nt, 'SUBTRACT', prog.outputs[0], arr)
# crust plates: Voronoi cells (≈ 70 m) on warped object coords; seams = distance to the cell edge below a width
wn = node(nt, 'ShaderNodeTexNoise', (-1300, 1500)); wn.inputs['Scale'].default_value = 6
link(nt, tc.outputs['Object'], wn.inputs['Vector'])
wmix = node(nt, 'ShaderNodeVectorMath', (-1100, 1500), operation='MULTIPLY_ADD'); link(nt, wn.outputs['Color'], wmix.inputs[0]); wmix.inputs[1].default_value = (0.06, 0.06, 0.06); link(nt, tc.outputs['Object'], wmix.inputs[2])
vor = node(nt, 'ShaderNodeTexVoronoi', (-900, 1500), feature='DISTANCE_TO_EDGE'); vor.inputs['Scale'].default_value = float(arg('plates', 8))
link(nt, wmix.outputs[0], vor.inputs['Vector'])
# heat (0 cold … 1 hottest), only ever used through thresholds: hot at the advancing front, along the channel axis and at the
# fed source by the vent. Cool = dark crust plates with thin deep-red seams; warm = red melt; hot = orange melt; in warm/hot melt
# crisp flow ripples (iso-lines of the real arrival time = arcs across the flow) travel downstream; yellow axis line; pale tip.
hfront = M(nt, 'SUBTRACT', 1.0, M(nt, 'DIVIDE', age, 0.09), clamp=True)
hcore = M(nt, 'MULTIPLY', M(nt, 'GREATER_THAN', edge, 0.6), 0.5)                 # channel interior stays warm (red melt)
heat = M(nt, 'MAXIMUM', hfront, hcore)
phase = node(nt, 'ShaderNodeValue', (-1300, 1350)); phase.label = 'phase'
arcs = M(nt, 'LESS_THAN', M(nt, 'FRACT', M(nt, 'MULTIPLY_ADD', arr, float(arg('ripples', 55)), M(nt, 'MULTIPLY', phase.outputs[0], -1.0))), 0.17)
seam = M(nt, 'LESS_THAN', vor.outputs['Distance'], 0.045)
warmZ = M(nt, 'GREATER_THAN', heat, 0.3); hotZ = M(nt, 'GREATER_THAN', heat, 0.62)
h_ = M(nt, 'MULTIPLY', seam, 0.34)
h_ = M(nt, 'ADD', M(nt, 'MULTIPLY', h_, M(nt, 'SUBTRACT', 1.0, warmZ)), M(nt, 'MULTIPLY', warmZ, M(nt, 'MULTIPLY_ADD', arcs, 0.22, 0.5)))
h_ = M(nt, 'ADD', M(nt, 'MULTIPLY', h_, M(nt, 'SUBTRACT', 1.0, hotZ)), M(nt, 'MULTIPLY', hotZ, M(nt, 'MULTIPLY_ADD', arcs, 0.15, 0.72)))
rim = M(nt, 'LESS_THAN', edge, 0.07)
h_ = M(nt, 'ADD', M(nt, 'MULTIPLY', h_, M(nt, 'SUBTRACT', 1.0, rim)), M(nt, 'MULTIPLY', rim, 0.34))
h_ = M(nt, 'MAXIMUM', h_, M(nt, 'LESS_THAN', age, 0.008))
lcol = RAMP(nt, h_, [(0.0, (0.0, 0.0, 0.0)), (0.3, (0.55, 0.025, 0.01)), (0.45, (0.88, 0.06, 0.01)), (0.65, (1.0, 0.26, 0.01)),
                     (0.82, (1.0, 0.58, 0.04)), (0.95, (1.0, 0.92, 0.45))])
crust = MIX(nt, 1.0, (0.11, 0.045, 0.05), band, 'MULTIPLY')
hotF = M(nt, 'GREATER_THAN', h_, 0.2)
lava_c = MIX(nt, hotF, crust, lcol)
final = MIX(nt, onm, shaded, lava_c)
if DEBUG == 'light':
	final = M(nt, 'MULTIPLY', lum, 0.5)              # half scale so the full range survives the display clip
EMIT(nt, final, out)
terr.data.materials.append(mat)
# prog over the shot: the front crawls down Valle del Bove toward the town (Etna.tsx progR range)
for t, v in ((T0, 0.42), (T1, 0.74)):
	prog.outputs[0].default_value = v; prog.outputs[0].keyframe_insert('default_value', frame=fr(t))
for f_, v in ((fr(T0), 0.0), (fr(T1), (T1 - T0) * 1.4)):        # ripples travel ≈ 1.4 spacings per second
	phase.outputs[0].default_value = v; phase.outputs[0].keyframe_insert('default_value', frame=f_)
for fc in fcurves_of(mat.node_tree):
	for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# ------------------------------------------------------------------ ink outline material (inverted hull)
ink = bpy.data.materials.new('ink'); ink.use_nodes = True; ink.use_backface_culling = True
it_ = ink.node_tree; it_.nodes.clear()
EMIT(it_, (0.035, 0.02, 0.06), node(it_, 'ShaderNodeOutputMaterial', (300, 0)))
def hull_obj(name, mesh_, parent=None):
	o = bpy.data.objects.new(name, mesh_); sc.collection.objects.link(o)
	o.visible_shadow = False
	if parent: o.parent = parent
	return o
if OUTLINE == 'hull':
	# terrain hull: every vertex pushed out along its normal by a camera-distance-dependent width, faces reversed
	sx_ = WK / (nx - 1); sy_ = HK / (ny - 1)
	dzdx = np.gradient(vz, axis=1) / sx_; dzdy = -np.gradient(vz, axis=0) / sy_
	nn = np.stack([-dzdx, -dzdy, np.ones_like(vz)], -1); nn /= np.linalg.norm(nn, axis=-1, keepdims=True)
	P3 = np.stack([vx, vy, vz], -1)
	dist = np.linalg.norm(P3 - np.array(CAMC), axis=-1)
	tw = line_w(dist)[..., None]
	hv = (P3 + nn * tw).reshape(-1, 3).astype(np.float32)
	hm = grid_mesh('etna_ink', hv, faces[:, ::-1].copy(), with_uv=False)
	hm.materials.append(ink)
	hull_obj('etna_ink', hm)

# ------------------------------------------------------------------ sea (flat toon blue)
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0.002))
sea = bpy.context.object; sm = bpy.data.materials.new('sea'); sm.use_nodes = True; st_ = sm.node_tree; st_.nodes.clear()
EMIT(st_, (0.02, 0.22, 0.45), node(st_, 'ShaderNodeOutputMaterial', (300, 0)))
sea.data.materials.append(sm)

# ------------------------------------------------------------------ world: vivid dusk gradient (camera) — the same colours light the scene
wd = bpy.data.worlds.new('dusk'); sc.world = wd; wd.use_nodes = True
wn_ = wd.node_tree; wn_.nodes.clear()
wo = node(wn_, 'ShaderNodeOutputWorld', (600, 0))
wtc = node(wn_, 'ShaderNodeTexCoord', (-600, 0))
wsep = node(wn_, 'ShaderNodeSeparateXYZ', (-400, 0)); link(wn_, wtc.outputs['Generated'], wsep.inputs['Vector'])
skyc = RAMP(wn_, wsep.outputs['Z'], [(0.0, (1.0, 0.50, 0.20)), (0.07, (1.0, 0.36, 0.30)), (0.18, (0.62, 0.22, 0.52)),
                                     (0.34, (0.20, 0.13, 0.48)), (0.6, (0.06, 0.06, 0.26))], interp='LINEAR')
wbg = node(wn_, 'ShaderNodeBackground', (200, 0)); link(wn_, skyc, wbg.inputs['Color']); wbg.inputs['Strength'].default_value = 1.0
link(wn_, wbg.outputs[0], wo.inputs['Surface'])

# ------------------------------------------------------------------ sun
sun_d = bpy.data.lights.new('sun', 'SUN'); sun_d.energy = float(arg('sun', 4.0)); sun_d.color = (1.0, 0.85, 0.66); sun_d.angle = math.radians(0.5)
sun = bpy.data.objects.new('sun', sun_d); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(58), 0, math.radians(20))   # sun from the SSE, 32° up (shorter cast shadows than the pilot's 20°)

# ------------------------------------------------------------------ cartoon cumulus: toon-shaded sphere puffs
def puff_mat(name, shadow, mid, lit, base_z, under=(1.0, 0.45, 0.12), under_h=0.0):
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (900, 0))
	band_, _ = toon(t, shadow, mid, lit)
	c = band_
	if under_h > 0:   # eruption under-light: the lowest puffs are lit orange from below (crisp band)
		g_ = node(t, 'ShaderNodeNewGeometry'); pz = SEP(t, g_.outputs['Position'])['Z']
		low = M(t, 'LESS_THAN', pz, base_z + under_h)
		c = MIX(t, M(t, 'MULTIPLY', low, 0.85), c, MIX(t, 0.5, under, band_, 'MULTIPLY'))
	EMIT(t, c, mo)
	return m
sph = bpy.data.meshes.new('puff'); bms = bmesh.new(); bmesh.ops.create_icosphere(bms, subdivisions=3, radius=1.0); bms.to_mesh(sph); bms.free()
sph.polygons.foreach_set('use_smooth', np.ones(len(sph.polygons), bool))
sph_ink = sph.copy(); sph_ink.name = 'puff_ink'
bmi = bmesh.new(); bmi.from_mesh(sph_ink); bmesh.ops.reverse_faces(bmi, faces=bmi.faces); bmi.to_mesh(sph_ink); bmi.free()
sph_ink.materials.clear(); sph_ink.materials.append(ink)
rngp = np.random.default_rng(11)
def puff_column(name, base, height, r0, r1, n, wind, mat_, rise=0.12, bend=1.35, spread=0.55):
	sph_m = sph.copy(); sph_m.name = name; sph_m.materials.append(mat_)
	f0, f1 = fr(T0), fr(T1)
	for k in range(n):
		s0 = -0.1 + 1.1 * (k + rngp.random()) / n
		ang = rngp.random() * 2 * math.pi; jr = rngp.random() ** 0.5
		ox, oy = math.cos(ang) * jr, math.sin(ang) * jr
		rs = 0.75 + 0.45 * rngp.random()
		o = bpy.data.objects.new(f'{name}{k}', sph_m); sc.collection.objects.link(o)
		o.visible_shadow = False             # no long thin plume shadows streaking across the slopes
		hl = None
		if OUTLINE == 'hull':
			hl = bpy.data.objects.new(f'{name}{k}_ink', sph_ink); sc.collection.objects.link(hl); hl.visible_shadow = False
		for f_, s in ((f0, s0), (f1, s0 + rise)):
			sc_ = max(0.0, s)
			rad = (r0 + (r1 - r0) * sc_ ** 0.85) * rs * (min(1.0, 0.35 + s / 0.08) if s < 0.08 else 1.0)
			rad = max(rad, 0.02)
			cpos = base + Vector((wind[0] * height * sc_ ** bend, wind[1] * height * sc_ ** bend, height * s))
			cpos += Vector((ox, oy, 0)) * rad * spread
			o.location = cpos; o.scale = (rad, rad, rad * 0.92)
			o.keyframe_insert('location', frame=f_); o.keyframe_insert('scale', frame=f_)
			if hl:
				d_ = (cpos - CAMC).length; ww = line_w(d_)
				hl.location = cpos; s_ = rad + ww; hl.scale = (s_, s_, rad * 0.92 + ww)
				hl.keyframe_insert('location', frame=f_); hl.keyframe_insert('scale', frame=f_)
		for ob in (o, hl):
			if ob is None: continue
			for fc in fcurves_of(ob):
				for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
ash_m = puff_mat('ash', (0.20, 0.17, 0.26), (0.40, 0.36, 0.44), (0.66, 0.60, 0.60), SUMMIT.z)
steam_m = puff_mat('steam', (0.50, 0.46, 0.66), (0.78, 0.75, 0.86), (1.0, 0.96, 0.9), ventv.z, under=(1.0, 0.45, 0.08), under_h=0.55)
puff_column('ash', SUMMIT + Vector((0, 0, -0.12)), 5.5, 0.28, 1.25, 58, (0.45, 0.12), ash_m, rise=0.1)
puff_column('steam', ventv + Vector((0.22, 0.07, float(arg('fh', 0.75)) * 0.8)), 1.6, 0.14, 0.42, 26, (0.30, 0.10), steam_m, rise=0.16)

# ------------------------------------------------------------------ lava fountains along the fissure (particles) + glowing fissure slit
fa, fb = P(*G['fissA']), P(*G['fissB'])
bpy.ops.mesh.primitive_plane_add(size=1, location=((fa + fb) / 2 + Vector((0, 0, 0.015))))
em = bpy.context.object; em.name = 'fissure'
d = fb - fa; em.scale = (d.length, 0.06, 1); em.rotation_euler = (0, 0, math.atan2(d.y, d.x))
em.hide_render = False                   # (the pilot hid the emitter for render, which also hid its particles)
blobs = bpy.data.collections.new('blobs')
for nm, col, rad in (('blobY', (1.0, 0.80, 0.16), 0.042), ('blobO', (1.0, 0.36, 0.02), 0.036), ('blobW', (1.0, 0.96, 0.62), 0.03)):
	bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rad)
	blob = bpy.context.object; blob.name = nm
	bm_ = bpy.data.materials.new(nm); bm_.use_nodes = True; bn = bm_.node_tree; bn.nodes.clear()
	EMIT(bn, col, node(bn, 'ShaderNodeOutputMaterial', (300, 0)))
	blob.data.materials.append(bm_)
	blob.location = (0, 0, -50); blob.visible_shadow = False
	sc.collection.objects.unlink(blob); blobs.objects.link(blob)
ps_mod = em.modifiers.new('fount', 'PARTICLE_SYSTEM'); ps = ps_mod.particle_system.settings
FH = float(arg('fh', 0.75))            # cartoon fountain height (km) — exaggerated so it reads at 12 km
VF = math.sqrt(2 * GRAV * FH)
ps.count = int(arg('fcount', 12000)); ps.frame_start = 1; ps.frame_end = NF + PRE; ps.lifetime = int(2.1 * VF / GRAV * FPS); ps.lifetime_random = 0.15
ps.emit_from = 'FACE'; ps.normal_factor = VF; ps.factor_random = VF * 0.24; ps.object_align_factor = (0, 0, 0)
ps.render_type = 'COLLECTION'; ps.instance_collection = blobs; ps.use_collection_pick_random = True; ps.particle_size = 1.0; ps.size_random = 0.6
ps.physics_type = 'NEWTON'; ps.mass = 1.0; ps.use_rotations = False
em.show_instancer_for_render = False
# glowing slit draped on the relief between the fissure ends
sl = bmesh.new(); nseg = 24; dn = Vector((-d.y, d.x, 0)).normalized()
rows_ = []
for k in range(nseg + 1):
	p_ = fa + d * (k / nseg)
	rows_.append([sl.verts.new(Pxy(p_.x + dn.x * s * 0.022, p_.y + dn.y * s * 0.022, 0.006)) for s in (-1, 1)])
for k in range(nseg):
	sl.faces.new((rows_[k][0], rows_[k + 1][0], rows_[k + 1][1], rows_[k][1]))
slm = bpy.data.meshes.new('slit'); sl.to_mesh(slm); sl.free()
slmat = bpy.data.materials.new('slit'); slmat.use_nodes = True; snt = slmat.node_tree; snt.nodes.clear()
EMIT(snt, (1.0, 0.92, 0.45), node(snt, 'ShaderNodeOutputMaterial', (300, 0)))
slm.materials.append(slmat)
slo = bpy.data.objects.new('slit', slm); sc.collection.objects.link(slo)

# ------------------------------------------------------------------ Zafferana: toon houses (pastel walls, terracotta roofs)
rng = np.random.default_rng(7)
house = bpy.data.meshes.new('house'); bmh = bmesh.new()
bmesh.ops.create_cube(bmh, size=1.0)
for v in bmh.verts: v.co.z += 0.5
bmh.to_mesh(house); bmh.free()
roof = bpy.data.meshes.new('roof'); bmr = bmesh.new()
pts = [(-0.55, -0.55, 1.0), (0.55, -0.55, 1.0), (0.55, 0.55, 1.0), (-0.55, 0.55, 1.0), (0, -0.55, 1.45), (0, 0.55, 1.45)]
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
	EMIT(t, MIX(t, 1.0, col, band_, 'MULTIPLY'), mo)
	return m
wall_m = house_mat('wall', [(0.0, (0.95, 0.82, 0.58)), (0.25, (0.98, 0.88, 0.42)), (0.45, (0.96, 0.62, 0.46)), (0.62, (0.95, 0.94, 0.88)),
                            (0.8, (0.92, 0.58, 0.62))])
roof_m = house_mat('roof', [(0.0, (0.80, 0.20, 0.07)), (0.5, (0.88, 0.32, 0.10)), (0.8, (0.70, 0.16, 0.08))])
house.materials.append(wall_m); roof.materials.append(roof_m)
lava_px = np.asarray(bpy.data.images[lav.image.name].pixels[:]).reshape(lav.image.size[1], lav.image.size[0], 4)[::-1, :, 0]
# real Zafferana layout: OpenStreetMap building footprints (© OpenStreetMap contributors, ODbL) → one stylized house each
osm = json.load(open(ROOT / 'data/osm_zafferana/buildings.json'))['elements']
placed = 0
HSC = float(arg('house_h', 1.3))
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
	hgt = (0.007 + 0.006 * rng.random()) * HSC
	for mesh_, nm in ((house, 'h'), (roof, 'r')):
		o = bpy.data.objects.new(nm, mesh_); o.location = ((u - 0.5) * WK, (0.5 - v) * HK, z - 0.002)
		o.scale = (w_, d_, hgt); o.rotation_euler = (0, 0, ang)
		sc.collection.objects.link(o)
	placed += 1
print('houses', placed)

# ------------------------------------------------------------------ camera: from the Ionian side, the whole cone with the flank eruption and the flow
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = LENS; cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 36; cam_d.clip_end = 300; cam_d.clip_start = 0.01
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(tgt)
ct = cam.constraints.new('TRACK_TO'); ct.target = tgt; ct.track_axis = 'TRACK_NEGATIVE_Z'; ct.up_axis = 'UP_Y'
for t, cpos, lk in ((T0, c0, look0), (T1, c1, look1)):
	cam.location = cpos; cam.keyframe_insert('location', frame=fr(t)); tgt.location = lk; tgt.keyframe_insert('location', frame=fr(t))
for ob in (cam, tgt):
	for fc in fcurves_of(ob):
		for kp in fc.keyframe_points: kp.interpolation = 'SINE'; kp.easing = 'EASE_IN_OUT'

# ------------------------------------------------------------------ optional Freestyle ink (instead of the hull)
if OUTLINE == 'freestyle':
	sc.render.use_freestyle = True
	sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = LW * SCALE / 100
	fs = sc.view_layers[0].freestyle_settings
	ls = fs.linesets[0]
	ls.select_by_visibility = True; ls.select_by_edge_types = True
	ls.select_silhouette = True; ls.select_border = False; ls.select_crease = False; ls.select_external_contour = True
	ls.linestyle.color = (0.035, 0.02, 0.06)

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
OUT.mkdir(parents=True, exist_ok=True)
FROM = int(arg('from', 1))
want = [int(x) + PRE for x in FRAMES.split(',')] if FRAMES else list(range(FROM + PRE, NF + PRE + 1))
suffix = arg('suffix', '')
for f in range(1, max(want) + 1):
	sc.frame_set(f)                       # step through every frame so the particle simulation is consistent
	if f in want:
		t_ = time.time()
		sc.render.filepath = str(OUT / f'f_{f - PRE:04d}{suffix}.png')
		bpy.ops.render.render(write_still=True)
		print('rendered', f, '%.1fs' % (time.time() - t_), flush=True)
print('done', NF, 'frames total; T0', T0, 'T1', T1)
