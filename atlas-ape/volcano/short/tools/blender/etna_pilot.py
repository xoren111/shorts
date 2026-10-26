"""Etna pilot (owner 18.10: «it must be obvious it's a giant volcano and the eruption is happening»): stylized-real 3D in Blender.
Real TINITALY relief (public/terrain/etna) with vertical exaggeration, crisp procedural materials tinted by a blurred satellite image
(no magnified photo pixels), the 1991–93 flank fissure with lava fountains, a summit ash plume, the real 1992 flow (arrival map
lava.png) advancing down Valle del Bove toward Zafferana Etnea (stylized houses), dusk sky + aerial haze.
  blender -b --factory-startup -P tools/blender/etna_pilot.py -- [--frames 1,110,220] [--scale 50] [--out out/blender/etna_a]
Frame 1 = t0 (s, Short timeline). Writes PNGs; tools/blender/post.py adds glow and converts to public/blender/<shot>/f_NNNN.jpg."""
import bpy, bmesh, json, math, sys
from pathlib import Path
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
FRAMES = arg('frames')
SCALE = int(arg('scale', 100))
OUT = ROOT / arg('out', 'out/blender/etna_a')
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
VT = [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items]
sc.view_settings.view_transform = 'Khronos PBR Neutral' if 'Khronos PBR Neutral' in VT else 'Standard'
sc.view_settings.look = 'AgX - Punchy' if 'AgX - Punchy' in [i.identifier for i in sc.view_settings.bl_rna.properties['look'].enum_items] else 'None'
sc.eevee.taa_render_samples = int(arg('samples', 24))
sc.eevee.volumetric_samples = 32
sc.eevee.volumetric_tile_size = '16'
sc.eevee.volumetric_end = 120
sc.eevee.use_volumetric_shadows = True
sc.gravity = (0, 0, -0.0098)          # 1 unit = 1 km

def node(nt, kind, loc=(0, 0), **kw):
	n = nt.nodes.new(kind); n.location = loc
	for k, v in kw.items():
		setattr(n, k, v)
	return n
link = lambda nt, a, b: nt.links.new(a, b)

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
terr = bpy.data.objects.new('etna', me); sc.collection.objects.link(terr)

# ------------------------------------------------------------------ terrain + lava material
mat = bpy.data.materials.new('etna'); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (1600, 0))
uv = node(nt, 'ShaderNodeUVMap', (-1600, 200), uv_map='UVMap')
tc = node(nt, 'ShaderNodeTexCoord', (-1600, -200))
geo = node(nt, 'ShaderNodeNewGeometry', (-1600, -500))
sat = node(nt, 'ShaderNodeTexImage', (-1300, 300)); sat.image = bpy.data.images.load(str(ROOT / 'out/blender/etna_sat_blur.jpg'))
link(nt, uv.outputs['UV'], sat.inputs['Vector'])
hsv = node(nt, 'ShaderNodeHueSaturation', (-1000, 300)); hsv.inputs['Saturation'].default_value = 1.6; hsv.inputs['Value'].default_value = 1.25
link(nt, sat.outputs['Color'], hsv.inputs['Color'])
# crisp procedural detail (any distance): two noise octaves on object coordinates (km)
n1 = node(nt, 'ShaderNodeTexNoise', (-1300, 0)); n1.inputs['Scale'].default_value = 60; n1.inputs['Detail'].default_value = 8
link(nt, tc.outputs['Object'], n1.inputs['Vector'])
n2 = node(nt, 'ShaderNodeTexNoise', (-1300, -200)); n2.inputs['Scale'].default_value = 400; n2.inputs['Detail'].default_value = 4
link(nt, tc.outputs['Object'], n2.inputs['Vector'])
mixd = node(nt, 'ShaderNodeMath', (-1000, -50), operation='MULTIPLY'); link(nt, n1.outputs['Fac'], mixd.inputs[0]); link(nt, n2.outputs['Fac'], mixd.inputs[1])
mr = node(nt, 'ShaderNodeMapRange', (-800, -50)); mr.inputs['From Min'].default_value = 0.05; mr.inputs['From Max'].default_value = 0.45; mr.inputs['To Min'].default_value = 0.7; mr.inputs['To Max'].default_value = 1.25
link(nt, mixd.outputs[0], mr.inputs['Value'])
det = node(nt, 'ShaderNodeMixRGB', (-600, 250), blend_type='MULTIPLY'); det.inputs['Fac'].default_value = 1.0
link(nt, hsv.outputs['Color'], det.inputs['Color1']); link(nt, mr.outputs['Result'], det.inputs['Color2'])
# steep slopes → dark volcanic rock; high summit → ash grey
sepn = node(nt, 'ShaderNodeSeparateXYZ', (-1300, -500)); link(nt, geo.outputs['Normal'], sepn.inputs['Vector'])
slope = node(nt, 'ShaderNodeMapRange', (-1000, -500)); slope.inputs['From Min'].default_value = 0.92; slope.inputs['From Max'].default_value = 0.7
link(nt, sepn.outputs['Z'], slope.inputs['Value'])
rockc = node(nt, 'ShaderNodeRGB', (-800, -650)); rockc.outputs[0].default_value = (0.07, 0.055, 0.05, 1)
m_rock = node(nt, 'ShaderNodeMixRGB', (-400, 150)); link(nt, slope.outputs['Result'], m_rock.inputs['Fac']); link(nt, det.outputs['Color'], m_rock.inputs['Color1']); link(nt, rockc.outputs[0], m_rock.inputs['Color2'])
sepp = node(nt, 'ShaderNodeSeparateXYZ', (-1300, -800)); link(nt, geo.outputs['Position'], sepp.inputs['Vector'])
hi = node(nt, 'ShaderNodeMapRange', (-1000, -800)); hi.inputs['From Min'].default_value = 2.7 * EXAG; hi.inputs['From Max'].default_value = 3.15 * EXAG
link(nt, sepp.outputs['Z'], hi.inputs['Value'])
ash = node(nt, 'ShaderNodeRGB', (-800, -900)); ash.outputs[0].default_value = (0.16, 0.15, 0.15, 1)
m_ash = node(nt, 'ShaderNodeMixRGB', (-200, 150)); link(nt, hi.outputs['Result'], m_ash.inputs['Fac']); link(nt, m_rock.outputs['Color'], m_ash.inputs['Color1']); link(nt, ash.outputs[0], m_ash.inputs['Color2'])
bump = node(nt, 'ShaderNodeBump', (-200, -300)); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.004
link(nt, n2.outputs['Fac'], bump.inputs['Height'])
bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (200, 200)); bsdf.inputs['Roughness'].default_value = 0.92
link(nt, m_ash.outputs['Color'], bsdf.inputs['Base Color']); link(nt, bump.outputs['Normal'], bsdf.inputs['Normal'])
# aerial perspective: far terrain melts into a warm dusk haze (distance in km)
camd = node(nt, 'ShaderNodeCameraData', (-200, -700))
hz = node(nt, 'ShaderNodeMapRange', (0, -700)); hz.inputs['From Min'].default_value = 6.0; hz.inputs['From Max'].default_value = 60.0; hz.inputs['To Max'].default_value = 0.45
link(nt, camd.outputs['View Distance'], hz.inputs['Value'])
hzc = node(nt, 'ShaderNodeEmission', (200, -800)); hzc.inputs['Color'].default_value = (0.9, 0.62, 0.6, 1); hzc.inputs['Strength'].default_value = 0.6
hmix = node(nt, 'ShaderNodeMixShader', (500, 0)); link(nt, hz.outputs['Result'], hmix.inputs['Fac']); link(nt, bsdf.outputs[0], hmix.inputs[1]); link(nt, hzc.outputs[0], hmix.inputs[2])
# --- lava (real 1992 flow: arrival map R channel; edge distance map)
lav = node(nt, 'ShaderNodeTexImage', (-1300, 700)); lav.image = bpy.data.images.load(str(ROOT / 'public/terrain/etna/lava.png')); lav.image.colorspace_settings.name = 'Non-Color'; lav.interpolation = 'Linear'
link(nt, uv.outputs['UV'], lav.inputs['Vector'])
sepl = node(nt, 'ShaderNodeSeparateColor', (-1100, 700)); link(nt, lav.outputs['Color'], sepl.inputs['Color'])
edg = node(nt, 'ShaderNodeTexImage', (-1300, 1000)); edg.image = bpy.data.images.load(str(ROOT / 'public/terrain/etna/lava_edge.png')); edg.image.colorspace_settings.name = 'Non-Color'
link(nt, uv.outputs['UV'], edg.inputs['Vector'])
prog = node(nt, 'ShaderNodeValue', (-1300, 1250)); prog.label = 'prog'
on = node(nt, 'ShaderNodeMapRange', (-900, 800)); link(nt, sepl.outputs['Red'], on.inputs['Value'])
# on = 1 where arrival < prog (soft 0.012), and arrival < 0.995
sub1 = node(nt, 'ShaderNodeMath', (-1100, 1150), operation='SUBTRACT'); link(nt, prog.outputs[0], sub1.inputs[0]); sub1.inputs[1].default_value = 0.012
add1 = node(nt, 'ShaderNodeMath', (-1100, 1050), operation='ADD'); link(nt, prog.outputs[0], add1.inputs[0]); add1.inputs[1].default_value = 0.002
link(nt, sub1.outputs[0], on.inputs['From Min']); link(nt, add1.outputs[0], on.inputs['From Max']); on.inputs['To Min'].default_value = 1; on.inputs['To Max'].default_value = 0
lt = node(nt, 'ShaderNodeMath', (-900, 600), operation='LESS_THAN'); link(nt, sepl.outputs['Red'], lt.inputs[0]); lt.inputs[1].default_value = 0.995
onm = node(nt, 'ShaderNodeMath', (-700, 700), operation='MULTIPLY'); link(nt, on.outputs['Result'], onm.inputs[0]); link(nt, lt.outputs[0], onm.inputs[1])
age = node(nt, 'ShaderNodeMath', (-900, 450), operation='SUBTRACT'); link(nt, prog.outputs[0], age.inputs[0]); link(nt, sepl.outputs['Red'], age.inputs[1])
front = node(nt, 'ShaderNodeMapRange', (-700, 450)); front.inputs['From Min'].default_value = 0.0; front.inputs['From Max'].default_value = 0.03; front.inputs['To Min'].default_value = 1; front.inputs['To Max'].default_value = 0
link(nt, age.outputs[0], front.inputs['Value'])
# crust plates and glowing seams (Voronoi distance to edge, warped)
wn = node(nt, 'ShaderNodeTexNoise', (-1300, 1500)); wn.inputs['Scale'].default_value = 8
link(nt, tc.outputs['Object'], wn.inputs['Vector'])
wmix = node(nt, 'ShaderNodeVectorMath', (-1100, 1500), operation='MULTIPLY_ADD'); link(nt, wn.outputs['Color'], wmix.inputs[0]); wmix.inputs[1].default_value = (0.05, 0.05, 0.05); link(nt, tc.outputs['Object'], wmix.inputs[2])
vor = node(nt, 'ShaderNodeTexVoronoi', (-900, 1500), feature='DISTANCE_TO_EDGE'); vor.inputs['Scale'].default_value = 34
link(nt, wmix.outputs[0], vor.inputs['Vector'])
vor2 = node(nt, 'ShaderNodeTexVoronoi', (-900, 1750), feature='DISTANCE_TO_EDGE'); vor2.inputs['Scale'].default_value = 110
link(nt, wmix.outputs[0], vor2.inputs['Vector'])
core = node(nt, 'ShaderNodeMapRange', (-900, 1000)); core.inputs['From Min'].default_value = 0.1; core.inputs['From Max'].default_value = 0.9
link(nt, edg.outputs['Color'], core.inputs['Value'])
young = node(nt, 'ShaderNodeMapRange', (-700, 300)); young.inputs['From Min'].default_value = 0.0; young.inputs['From Max'].default_value = 0.06; young.inputs['To Min'].default_value = 1; young.inputs['To Max'].default_value = 0
link(nt, age.outputs[0], young.inputs['Value'])
hot = node(nt, 'ShaderNodeMath', (-500, 1100), operation='MULTIPLY_ADD', use_clamp=True); link(nt, core.outputs['Result'], hot.inputs[0]); hot.inputs[1].default_value = 0.55; link(nt, young.outputs['Result'], hot.inputs[2])
wseam = node(nt, 'ShaderNodeMapRange', (-500, 1350)); link(nt, hot.outputs[0], wseam.inputs['Value']); wseam.inputs['To Min'].default_value = 0.025; wseam.inputs['To Max'].default_value = 0.085
seam = node(nt, 'ShaderNodeMapRange', (-300, 1500)); link(nt, vor.outputs['Distance'], seam.inputs['Value']); seam.inputs['From Min'].default_value = 0; link(nt, wseam.outputs['Result'], seam.inputs['From Max']); seam.inputs['To Min'].default_value = 1; seam.inputs['To Max'].default_value = 0
seam2 = node(nt, 'ShaderNodeMapRange', (-300, 1750)); link(nt, vor2.outputs['Distance'], seam2.inputs['Value']); seam2.inputs['From Max'].default_value = 0.05; seam2.inputs['To Min'].default_value = 1; seam2.inputs['To Max'].default_value = 0
s2h = node(nt, 'ShaderNodeMath', (-100, 1750), operation='MULTIPLY'); link(nt, seam2.outputs['Result'], s2h.inputs[0]); link(nt, hot.outputs[0], s2h.inputs[1])
seamM = node(nt, 'ShaderNodeMath', (100, 1600), operation='MAXIMUM'); link(nt, seam.outputs['Result'], seamM.inputs[0]); link(nt, s2h.outputs[0], seamM.inputs[1])
# open melt in the hottest core (river), dark rafts = plate interiors
openm = node(nt, 'ShaderNodeMapRange', (-300, 1100)); link(nt, hot.outputs[0], openm.inputs['Value']); openm.inputs['From Min'].default_value = 0.82; openm.inputs['From Max'].default_value = 1.05
raft = node(nt, 'ShaderNodeMath', (-100, 1100), operation='MULTIPLY'); link(nt, openm.outputs['Result'], raft.inputs[0]); raft.inputs[1].default_value = 0.85
heat = node(nt, 'ShaderNodeMath', (300, 1300), operation='MAXIMUM'); link(nt, seamM.outputs[0], heat.inputs[0]); link(nt, raft.outputs[0], heat.inputs[1])
heat2 = node(nt, 'ShaderNodeMath', (450, 1300), operation='MAXIMUM'); link(nt, heat.outputs[0], heat2.inputs[0]); link(nt, front.outputs['Result'], heat2.inputs[1])
ramp = node(nt, 'ShaderNodeValToRGB', (600, 1300)); el = ramp.color_ramp.elements
el[0].position = 0.0; el[0].color = (0.0, 0.0, 0.0, 1)
el[1].position = 1.0; el[1].color = (1.0, 0.75, 0.3, 1)
for pos, c in ((0.18, (0.2, 0.008, 0.0, 1)), (0.45, (0.85, 0.06, 0.0, 1)), (0.7, (1.0, 0.25, 0.01, 1)), (0.88, (1.0, 0.5, 0.06, 1))):
	e = el.new(pos); e.color = c
link(nt, heat2.outputs[0], ramp.inputs['Fac'])
emi = node(nt, 'ShaderNodeEmission', (900, 1300)); link(nt, ramp.outputs['Color'], emi.inputs['Color'])
estr = node(nt, 'ShaderNodeMath', (750, 1100), operation='MULTIPLY'); link(nt, heat2.outputs[0], estr.inputs[0]); estr.inputs[1].default_value = 2.4
link(nt, estr.outputs[0], emi.inputs['Strength'])
crust = node(nt, 'ShaderNodeBsdfPrincipled', (900, 1000)); crust.inputs['Base Color'].default_value = (0.03, 0.027, 0.026, 1); crust.inputs['Roughness'].default_value = 0.35
cb = node(nt, 'ShaderNodeBump', (700, 900)); cb.inputs['Strength'].default_value = 0.6; cb.inputs['Distance'].default_value = 0.003; link(nt, vor.outputs['Distance'], cb.inputs['Height']); link(nt, cb.outputs['Normal'], crust.inputs['Normal'])
addl = node(nt, 'ShaderNodeAddShader', (1100, 1100)); link(nt, crust.outputs[0], addl.inputs[0]); link(nt, emi.outputs[0], addl.inputs[1])
mixs = node(nt, 'ShaderNodeMixShader', (1350, 400)); link(nt, onm.outputs[0], mixs.inputs['Fac']); link(nt, hmix.outputs[0], mixs.inputs[1]); link(nt, addl.outputs[0], mixs.inputs[2])
link(nt, mixs.outputs[0], out.inputs['Surface'])
terr.data.materials.append(mat)
# prog over the shot: the front crawls down Valle del Bove toward the town (Etna.tsx progR range)
for t, v in ((T0, 0.42), (T1, 0.74)):
	prog.outputs[0].default_value = v; prog.outputs[0].keyframe_insert('default_value', frame=fr(t))
for fc in fcurves_of(mat.node_tree):
	for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# ------------------------------------------------------------------ sea
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0.002))
sea = bpy.context.object; sm = bpy.data.materials.new('sea'); sm.use_nodes = True
sb = sm.node_tree.nodes['Principled BSDF']; sb.inputs['Base Color'].default_value = (0.01, 0.05, 0.09, 1); sb.inputs['Roughness'].default_value = 0.12
sea.data.materials.append(sm)

# ------------------------------------------------------------------ world: dusk gradient sky + aerial haze
wd = bpy.data.worlds.new('dusk'); sc.world = wd; wd.use_nodes = True
wn_ = wd.node_tree; wn_.nodes.clear()
wo = node(wn_, 'ShaderNodeOutputWorld', (600, 0))
wtc = node(wn_, 'ShaderNodeTexCoord', (-600, 0))
wsep = node(wn_, 'ShaderNodeSeparateXYZ', (-400, 0)); link(wn_, wtc.outputs['Generated'], wsep.inputs['Vector'])
wr = node(wn_, 'ShaderNodeValToRGB', (-200, 0)); we = wr.color_ramp.elements
we[0].position = 0.0; we[0].color = (1.0, 0.62, 0.36, 1)
we[1].position = 0.5; we[1].color = (0.07, 0.06, 0.24, 1)
e = we.new(0.14); e.color = (0.85, 0.3, 0.48, 1)
link(wn_, wsep.outputs['Z'], wr.inputs['Fac'])
wbg = node(wn_, 'ShaderNodeBackground', (200, 0)); link(wn_, wr.outputs['Color'], wbg.inputs['Color']); wbg.inputs['Strength'].default_value = 0.8
link(wn_, wbg.outputs[0], wo.inputs['Surface'])


# ------------------------------------------------------------------ sun
sun_d = bpy.data.lights.new('sun', 'SUN'); sun_d.energy = 6.5; sun_d.color = (1.0, 0.78, 0.55); sun_d.angle = math.radians(2)
sun = bpy.data.objects.new('sun', sun_d); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(70), 0, math.radians(20))   # low sun from the SSE: side light on the slopes the camera sees

# ------------------------------------------------------------------ summit ash plume (volume) + vent glow
def plume(base, height, radius, dens, color, name='plume', wind=(0.35, 0.1)):
	bpy.ops.mesh.primitive_cube_add(size=1.0, location=(base.x + wind[0] * height * 0.5, base.y + wind[1] * height * 0.5, base.z + height / 2))
	o = bpy.context.object; o.name = name; o.scale = (radius * 2 + abs(wind[0]) * height, radius * 2 + abs(wind[1]) * height, height)
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = node(t, 'ShaderNodeOutputMaterial', (1000, 0))
	ttc = node(t, 'ShaderNodeTexCoord', (-1000, 0))
	# object coords of a unit cube scaled by the object: -0.5..0.5 in each axis → rebuild km offsets from the plume axis
	sp = node(t, 'ShaderNodeSeparateXYZ', (-800, -200)); link(t, ttc.outputs['Object'], sp.inputs['Vector'])
	hz_ = node(t, 'ShaderNodeMath', (-600, -400), operation='ADD'); link(t, sp.outputs['Z'], hz_.inputs[0]); hz_.inputs[1].default_value = 0.5   # 0 bottom … 1 top
	sx = o.scale.x; sy = o.scale.y
	# axis offset at this height (wind shear), in object units
	axx = node(t, 'ShaderNodeMath', (-600, -100), operation='MULTIPLY_ADD'); link(t, hz_.outputs[0], axx.inputs[0]); axx.inputs[1].default_value = wind[0] * height / sx; axx.inputs[2].default_value = -wind[0] * height / sx * 0.5
	axy = node(t, 'ShaderNodeMath', (-600, -250), operation='MULTIPLY_ADD'); link(t, hz_.outputs[0], axy.inputs[0]); axy.inputs[1].default_value = wind[1] * height / sy; axy.inputs[2].default_value = -wind[1] * height / sy * 0.5
	dx_ = node(t, 'ShaderNodeMath', (-400, -100), operation='SUBTRACT'); link(t, sp.outputs['X'], dx_.inputs[0]); link(t, axx.outputs[0], dx_.inputs[1])
	dy_ = node(t, 'ShaderNodeMath', (-400, -250), operation='SUBTRACT'); link(t, sp.outputs['Y'], dy_.inputs[0]); link(t, axy.outputs[0], dy_.inputs[1])
	kx = node(t, 'ShaderNodeMath', (-250, -100), operation='MULTIPLY'); link(t, dx_.outputs[0], kx.inputs[0]); kx.inputs[1].default_value = sx
	ky = node(t, 'ShaderNodeMath', (-250, -250), operation='MULTIPLY'); link(t, dy_.outputs[0], ky.inputs[0]); ky.inputs[1].default_value = sy
	cxy = node(t, 'ShaderNodeCombineXYZ', (-100, -150)); link(t, kx.outputs[0], cxy.inputs['X']); link(t, ky.outputs[0], cxy.inputs['Y'])
	rr = node(t, 'ShaderNodeVectorMath', (50, -150), operation='LENGTH'); link(t, cxy.outputs[0], rr.inputs[0])
	# radius grows with height (a column that spreads), soft edge
	rl = node(t, 'ShaderNodeMath', (50, -350), operation='MULTIPLY_ADD'); link(t, hz_.outputs[0], rl.inputs[0]); rl.inputs[1].default_value = radius * 0.75; rl.inputs[2].default_value = radius * 0.25
	rq = node(t, 'ShaderNodeMath', (200, -250), operation='DIVIDE'); link(t, rr.outputs['Value'], rq.inputs[0]); link(t, rl.outputs[0], rq.inputs[1])
	rf = node(t, 'ShaderNodeMapRange', (350, -250)); rf.inputs['From Min'].default_value = 1.0; rf.inputs['From Max'].default_value = 0.35; link(t, rq.outputs[0], rf.inputs['Value'])
	tn = node(t, 'ShaderNodeTexNoise', (-400, 200)); tn.inputs['Scale'].default_value = 2.2; tn.inputs['Detail'].default_value = 8; tn.noise_dimensions = '4D'
	vm = node(t, 'ShaderNodeVectorMath', (-600, 200), operation='MULTIPLY'); link(t, ttc.outputs['Object'], vm.inputs[0]); vm.inputs[1].default_value = (sx, sy, height)
	link(t, vm.outputs[0], tn.inputs['Vector'])
	wv = tn.inputs['W']; wv.default_value = 0; wv.keyframe_insert('default_value', frame=1 + PRE); wv.default_value = (T1 - T0) * 0.45; wv.keyframe_insert('default_value', frame=NF + PRE)
	d1 = node(t, 'ShaderNodeMapRange', (-200, 200)); d1.inputs['From Min'].default_value = 0.38; d1.inputs['From Max'].default_value = 0.68; link(t, tn.outputs['Fac'], d1.inputs['Value'])
	top = node(t, 'ShaderNodeMapRange', (200, -500)); top.inputs['From Min'].default_value = 1.0; top.inputs['From Max'].default_value = 0.6; link(t, hz_.outputs[0], top.inputs['Value'])
	bot = node(t, 'ShaderNodeMapRange', (200, -650)); bot.inputs['From Min'].default_value = 0.0; bot.inputs['From Max'].default_value = 0.05; link(t, hz_.outputs[0], bot.inputs['Value'])
	m1 = node(t, 'ShaderNodeMath', (500, 0), operation='MULTIPLY'); link(t, d1.outputs['Result'], m1.inputs[0]); link(t, rf.outputs['Result'], m1.inputs[1])
	m2 = node(t, 'ShaderNodeMath', (620, 0), operation='MULTIPLY'); link(t, m1.outputs[0], m2.inputs[0]); link(t, top.outputs['Result'], m2.inputs[1])
	m2b = node(t, 'ShaderNodeMath', (700, -100), operation='MULTIPLY'); link(t, m2.outputs[0], m2b.inputs[0]); link(t, bot.outputs['Result'], m2b.inputs[1])
	m3 = node(t, 'ShaderNodeMath', (780, 0), operation='MULTIPLY'); link(t, m2b.outputs[0], m3.inputs[0]); m3.inputs[1].default_value = dens
	pv = node(t, 'ShaderNodeVolumePrincipled', (900, 0)); pv.inputs['Color'].default_value = color; pv.inputs['Anisotropy'].default_value = 0.3
	link(t, m3.outputs[0], pv.inputs['Density'])
	link(t, pv.outputs[0], mo.inputs['Volume'])
	o.data.materials.append(m)
	return o
plume(SUMMIT + Vector((0, 0, -0.15)), 5.5, 1.3, 9.0, (0.62, 0.58, 0.6, 1), name='ash', wind=(0.45, 0.12))
vent = P(*G['vent'])
plume(vent, 1.6, 0.4, 7.0, (0.9, 0.85, 0.85, 1), name='ventsteam', wind=(0.3, 0.1))
vl = bpy.data.lights.new('ventglow', 'POINT'); vl.energy = 2.5e5 / 1000; vl.color = (1.0, 0.4, 0.1); vl.shadow_soft_size = 0.2
vo = bpy.data.objects.new('ventglow', vl); vo.location = vent + Vector((0, 0, 0.15)); sc.collection.objects.link(vo)

# ------------------------------------------------------------------ lava fountains along the fissure (particles)
fa, fb = P(*G['fissA']), P(*G['fissB'])
bpy.ops.mesh.primitive_plane_add(size=1, location=((fa + fb) / 2 + Vector((0, 0, 0.015))))
em = bpy.context.object; em.name = 'fissure'
d = fb - fa; em.scale = (d.length, 0.03, 1); em.rotation_euler = (0, 0, math.atan2(d.y, d.x))
em.hide_render = True
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.014)
blob = bpy.context.object; blob.name = 'blob'
bm_ = bpy.data.materials.new('blob'); bm_.use_nodes = True; bn = bm_.node_tree; bn.nodes.clear()
bo = node(bn, 'ShaderNodeOutputMaterial', (300, 0)); be = node(bn, 'ShaderNodeEmission', (0, 0)); be.inputs['Color'].default_value = (1.0, 0.45, 0.08, 1); be.inputs['Strength'].default_value = 12
link(bn, be.outputs[0], bo.inputs['Surface']); blob.data.materials.append(bm_)
blob.location = (0, 0, -50)
ps_mod = em.modifiers.new('fount', 'PARTICLE_SYSTEM'); ps = ps_mod.particle_system.settings
ps.count = 3200; ps.frame_start = 1; ps.frame_end = NF + PRE; ps.lifetime = 80; ps.lifetime_random = 0.5
ps.emit_from = 'FACE'; ps.normal_factor = 0.075; ps.factor_random = 0.03; ps.object_align_factor = (0, 0, 0)
ps.render_type = 'OBJECT'; ps.instance_object = blob; ps.particle_size = 1.0; ps.size_random = 0.6
ps.physics_type = 'NEWTON'; ps.mass = 1.0; ps.use_rotations = False
em.show_instancer_for_render = False

# ------------------------------------------------------------------ Zafferana: stylized houses (cream walls, terracotta roofs, warm windows)
rng = np.random.default_rng(7)
house = bpy.data.meshes.new('house'); bmh = bmesh.new()
bmesh.ops.create_cube(bmh, size=1.0)
for v in bmh.verts: v.co.z += 0.5
roof_top = [v for v in bmh.verts if v.co.z > 0.9]
bmh.to_mesh(house); bmh.free()
roof = bpy.data.meshes.new('roof'); bmr = bmesh.new()
pts = [(-0.55, -0.55, 1.0), (0.55, -0.55, 1.0), (0.55, 0.55, 1.0), (-0.55, 0.55, 1.0), (0, -0.55, 1.45), (0, 0.55, 1.45)]
vs = [bmr.verts.new(p) for p in pts]
for f in ((0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4)): bmr.faces.new([vs[i] for i in f])
bmr.to_mesh(roof); bmr.free()
wall_m = bpy.data.materials.new('wall'); wall_m.use_nodes = True; wb = wall_m.node_tree.nodes['Principled BSDF']; wb.inputs['Base Color'].default_value = (0.74, 0.64, 0.52, 1)
wb.inputs['Emission Color'].default_value = (1.0, 0.65, 0.3, 1); wb.inputs['Emission Strength'].default_value = 0.12
roof_m = bpy.data.materials.new('roof'); roof_m.use_nodes = True; rb = roof_m.node_tree.nodes['Principled BSDF']; rb.inputs['Base Color'].default_value = (0.62, 0.2, 0.1, 1)
house.materials.append(wall_m); roof.materials.append(roof_m)
lava_px = np.asarray(bpy.data.images[lav.image.name].pixels[:]).reshape(lav.image.size[1], lav.image.size[0], 4)[::-1, :, 0]
# real Zafferana layout: OpenStreetMap building footprints (© OpenStreetMap contributors, ODbL) → one stylized house each
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
	# footprint size and orientation from the polygon's longest edge
	xs_ = [(p_['lon'] - lon) * 111.32 * math.cos(math.radians(lat)) for p_ in g_]; ys_ = [(p_['lat'] - lat) * 110.57 for p_ in g_]
	ed = max(range(len(g_) - 1), key=lambda k: (xs_[k + 1] - xs_[k]) ** 2 + (ys_[k + 1] - ys_[k]) ** 2)
	ang = math.atan2(ys_[ed + 1] - ys_[ed], xs_[ed + 1] - xs_[ed])
	ca, sa = math.cos(-ang), math.sin(-ang)
	rx = [x * ca - y * sa for x, y in zip(xs_, ys_)]; ry = [x * sa + y * ca for x, y in zip(xs_, ys_)]
	w_ = max(0.006, min(0.05, max(rx) - min(rx))); d_ = max(0.006, min(0.05, max(ry) - min(ry)))
	hgt = 0.007 + 0.006 * rng.random()
	for mesh_, nm in ((house, 'h'), (roof, 'r')):
		o = bpy.data.objects.new(nm, mesh_); o.location = ((u - 0.5) * WK, (0.5 - v) * HK, z - 0.002)
		o.scale = (w_, d_, hgt); o.rotation_euler = (0, 0, ang)
		sc.collection.objects.link(o)
	placed += 1
print('houses', placed)

# ------------------------------------------------------------------ camera: from the Ionian side, the whole cone with the flank eruption and the flow
# heading for the town; one slow push-in (ends closer to the front and the town)
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
last = 0
for f in range(1, max(want) + 1):
	sc.frame_set(f)                       # step through every frame so the particle simulation is consistent
	if f in want:
		sc.render.filepath = str(OUT / f'f_{f - PRE:04d}.png')
		bpy.ops.render.render(write_still=True)
		print('rendered', f, flush=True)
print('done', NF, 'frames total; T0', T0, 'T1', T1)
