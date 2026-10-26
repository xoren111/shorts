"""Etna — LOW-POLY variant of tools/blender/etna_pilot.py (owner 18.10: «direction is fine, but the mountain is too blurred; cartoonish,
no details, but COLOURFUL and NO blur»). A crisp faceted diorama:
  * real TINITALY relief (public/terrain/etna) decimated to a jittered triangle grid (--step, default 4 = ~117 m), FLAT shaded;
  * every facet coloured by zones: elevation / slope / crisp land-cover thresholds of the Sentinel-2 mosaic (the photo itself is
    never shown; it only decides green vs field vs old lava per facet);
  * the real 1992 flow (arrival map lava.png, animated prog) as a flat cartoon river: crisp orange/yellow bands, dark-red rim,
    bright front, a few dark crust plates (Voronoi polygons);
  * flank fissure: low-poly emissive blobs (particles) + light steam puffs; summit: ash column of low-poly grey sphere clusters
    (keyframed rise + growth); real OSM footprints of Zafferana Etnea as pastel toy houses with red roofs;
  * clear cartoon sky gradient, warm sun, Standard view transform, no haze, no volumes, no post glow.
  blender -b --factory-startup -P tools/blender/variants/etna_lowpoly.py -- [--frames 1,112,223] [--scale 50] [--out out/blender/var_lowpoly]
Frame 1 = t0 (s, Short timeline); camera framing/timing identical to the pilot."""
import bpy, bmesh, json, math, sys, time
from pathlib import Path
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[3]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
FRAMES = arg('frames')
SCALE = int(arg('scale', 100))
OUT = ROOT / arg('out', 'out/blender/var_lowpoly')
STEP = int(arg('step', 4))
FPS = 60
words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']
T0 = W(48)                    # 26.13 «Italy.»
T1 = W(55) + 0.4 + 0.05       # end of the shot + cross-dissolve hold
NF = int(round((T1 - T0) * FPS))
PRE = 60
fr = lambda t: 1 + PRE + (t - T0) * FPS
LASTF = NF + PRE + 2

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
def srgb(*c):                      # palette is written in sRGB (what the eye sees with the Standard view) → linear
	return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)
def hexc(h):
	return srgb(*(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)))

G = {'vent': (37.7249, 15.016), 'fissA': (37.7262, 15.0133), 'fissB': (37.7245, 15.0168), 'front': (37.7026, 15.0944),
     'town': (37.6933, 15.1065), 'mid': (37.7145, 15.0564), 'summit': None}

t_start = time.time()
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
sc.render.filter_size = 1.0            # crisp pixel filter (default 1.5 softens)
sc.render.use_motion_blur = False
sc.view_settings.view_transform = 'Standard'   # exact cartoon colours, no filmic desaturation
sc.view_settings.look = 'None'
sc.eevee.taa_render_samples = int(arg('samples', 24))
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

def boxs(a, r):
	"""separable box mean of radius r px (data smoothing BEFORE crisp thresholds; never shown as an image)"""
	if r <= 0: return a
	k = 2 * r + 1; p = np.pad(a, r, mode='edge'); c = np.cumsum(np.cumsum(p, 0), 1); c = np.pad(c, ((1, 0), (1, 0)))
	return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)
def bil(A, px, py):
	px = np.clip(px, 0, A.shape[1] - 1.001); py = np.clip(py, 0, A.shape[0] - 1.001)
	i = px.astype(int); j = py.astype(int); a = px - i; b = py - j
	return A[j, i] * (1 - a) * (1 - b) + A[j, i + 1] * a * (1 - b) + A[j + 1, i] * (1 - a) * b + A[j + 1, i + 1] * a * b

# ------------------------------------------------------------------ land-cover classes from the satellite mosaic (crisp thresholds only)
img = bpy.data.images.load(str(ROOT / 'public/terrain/etna/sat.jpg'))
sw, sh = img.size
buf = np.empty(sw * sh * 4, np.float32); img.pixels.foreach_get(buf)
sat = buf.reshape(sh, sw, 4)[::-1, :, :3]                    # top row first; byte images give the stored sRGB values 0..1
del buf
ii = np.cumsum(np.cumsum(sat, 0), 1); ii = np.pad(ii, ((1, 0), (1, 0), (0, 0)))
ex = np.round(np.linspace(0, sw, nx + 1)).astype(int); ey = np.round(np.linspace(0, sh, ny + 1)).astype(int)
area = ((ey[1:] - ey[:-1])[:, None] * (ex[1:] - ex[:-1])[None, :])[..., None]
satg = (ii[ey[1:]][:, ex[1:]] - ii[ey[:-1]][:, ex[1:]] - ii[ey[1:]][:, ex[:-1]] + ii[ey[:-1]][:, ex[:-1]]) / area   # (ny, nx, 3) box resample
del ii, sat
bpy.data.images.remove(img)
SM = int(arg('smooth', 3))
Rr, Gg, Bb = [boxs(satg[..., c], SM) for c in range(3)]
LUM = (Rr + Gg + Bb) / 3; EXG = 2 * Gg - Rr - Bb

# ------------------------------------------------------------------ terrain: jittered low-poly triangle grid of the real relief
rng = np.random.default_rng(11)
gx = (nx - 1) // STEP + 1; gy = (ny - 1) // STEP + 1
PX, PY = np.meshgrid(np.linspace(0, nx - 1, gx), np.linspace(0, ny - 1, gy))
cell = (nx - 1) / (gx - 1)
jx = rng.uniform(-0.36, 0.36, PX.shape) * cell; jy = rng.uniform(-0.36, 0.36, PX.shape) * cell
jx[:, [0, -1]] = 0; jy[[0, -1], :] = 0
PX = PX + jx; PY = PY + jy
Hs = boxs(H, 1)                                             # light prefilter so the decimated grid does not alias
Hm = np.clip(bil(Hs, PX, PY), 0, None)
# keep the true summit height on the vertex nearest the summit
sj, si = np.unravel_index(H.argmax(), H.shape)
kk = np.argmin((PX - si) ** 2 + (PY - sj) ** 2); Hm.ravel()[kk] = H.max()
vx = (PX / (nx - 1) - 0.5) * WK
vy = (0.5 - PY / (ny - 1)) * HK
vz = Hm / 1000 * EXAG
verts = np.stack([vx, vy, vz], -1).reshape(-1, 3).astype(np.float32)
q = np.arange(gx * gy).reshape(gy, gx)
a_, b_, c_, d_ = q[:-1, :-1].ravel(), q[1:, :-1].ravel(), q[1:, 1:].ravel(), q[:-1, 1:].ravel()   # TL BL BR TR (CCW from above)
flip = rng.random(a_.size) < 0.5
t1 = np.where(flip[:, None], np.stack([a_, b_, c_], -1), np.stack([a_, b_, d_], -1))
t2 = np.where(flip[:, None], np.stack([a_, c_, d_], -1), np.stack([b_, c_, d_], -1))
tris = np.concatenate([t1, t2]).astype(np.int32)
NFc = len(tris)
me = bpy.data.meshes.new('etna')
me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.ravel())
me.loops.add(NFc * 3); me.loops.foreach_set('vertex_index', tris.ravel())
me.polygons.add(NFc); me.polygons.foreach_set('loop_start', np.arange(0, NFc * 3, 3, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(NFc, 3, np.int32))
me.update(); me.validate()
uvl = me.uv_layers.new(name='UVMap')
uu = (PX / (nx - 1)).ravel(); vv = (1 - PY / (ny - 1)).ravel()
uvl.data.foreach_set('uv', np.stack([uu, vv], -1)[tris.ravel()].ravel().astype(np.float32))
me.polygons.foreach_set('use_smooth', np.zeros(NFc, bool))           # FLAT: every triangle is a crisp facet

# --- per-facet colour
V = verts.astype(np.float64)
p0, p1, p2 = V[tris[:, 0]], V[tris[:, 1]], V[tris[:, 2]]
nrm = np.cross(p1 - p0, p2 - p0); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
slope = np.degrees(np.arccos(np.clip(nrm[:, 2], -1, 1)))              # as seen (exaggerated relief)
cxp = PX.ravel()[tris].mean(1); cyp = PY.ravel()[tris].mean(1)
elev = V[tris, 2].mean(1) * 1000 / EXAG                               # m
emax = V[tris, 2].max(1) * 1000 / EXAG
ix = np.clip(cxp.round().astype(int), 0, nx - 1); iy = np.clip(cyp.round().astype(int), 0, ny - 1)
lum = LUM[iy, ix]; exg = EXG[iy, ix]
rnd = rng.random(NFc); rnd2 = rng.random(NFc)
PAL = {
	'sea':     hexc('#1f86c9'),
	'low':     hexc('#7cc242'),   # lowland green
	'low2':    hexc('#9fd14c'),   # lighter lowland green
	'field':   hexc('#f2cf4a'),   # yellow field patches
	'forest':  hexc('#2e8b3a'),   # forest green
	'forest2': hexc('#237a33'),
	'scrub':   hexc('#b9b04a'),   # olive scrub (transition)
	'brown':   hexc('#a86f45'),   # warm brown upper slopes
	'brown2':  hexc('#946044'),
	'cone':    hexc('#8b8580'),   # grey cone
	'cone2':   hexc('#77716d'),
	'oldlava': hexc('#4b4954'),   # dark grey old lava tongues
	'cliff':   hexc('#80594a'),   # rocky cliffs (steep faces)
	'snow':    hexc('#f6f8ff'),
}
cls = np.full(NFc, 'low', object)
veg = exg > 0.055
dark = (lum < float(arg('dark', 0.172))) & (exg < 0.035)
bright = (lum > 0.30) & (exg < 0.095)
cls[rnd < 0.4] = 'low2'
cls[(elev < 1100) & ~veg & (exg < 0.04)] = 'scrub'
cls[(elev < 1000) & bright] = 'field'
cls[(elev >= 650) & veg] = 'forest'
cls[(elev >= 650) & veg & (rnd < 0.35)] = 'forest2'
cls[(elev >= 1150) & ~veg] = 'brown'
cls[(elev >= 1750) & (exg < 0.07)] = 'brown'
cls[(cls == 'brown') & (rnd < 0.35)] = 'brown2'
cls[dark & (elev < 2550)] = 'oldlava'
cone = elev > 2450 + rnd * 120
cls[cone] = 'cone'; cls[cone & (rnd2 < 0.35)] = 'cone2'
cls[(slope > float(arg('cliff', 42))) & ~cone] = 'cliff'
cls[emax > 2900 + (rnd - 0.5) * 220] = 'snow'                         # jagged snow line
cls[elev < 1.0] = 'sea'
col = np.array([PAL[k] for k in cls], np.float32)
col *= (1 + (rnd2[:, None] - 0.5) * 0.10)                             # gentle per-facet shade jitter (gem look)
cola = np.concatenate([col, np.ones((NFc, 1), np.float32)], 1)
ca = me.color_attributes.new(name='col', type='FLOAT_COLOR', domain='CORNER')
ca.data.foreach_set('color', np.repeat(cola, 3, axis=0).ravel())
terr = bpy.data.objects.new('etna', me); sc.collection.objects.link(terr)
print('terrain', gx, 'x', gy, 'facets', NFc, {k: int((cls == k).sum()) for k in PAL}, flush=True)

bvh = BVHTree.FromPolygons([tuple(v) for v in verts], [tuple(t) for t in tris])
def surf(x, y):
	hit = bvh.ray_cast(Vector((x, y, 50.0)), Vector((0, 0, -1)))
	return hit[0].z if hit[0] is not None else 0.0
def P(lat, lon, agl=0.0):
	u, v = uvof(lat, lon)
	x, y = (u - 0.5) * WK, (0.5 - v) * HK
	return Vector((x, y, surf(x, y) + agl))
SUMMIT = Vector(((si / (nx - 1) - 0.5) * WK, (0.5 - sj / (ny - 1)) * HK, H.max() / 1000 * EXAG))

# ------------------------------------------------------------------ terrain + lava material (flat cartoon)
mat = bpy.data.materials.new('etna'); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (1800, 0))
uv = node(nt, 'ShaderNodeUVMap', (-1600, 200), uv_map='UVMap')
tc = node(nt, 'ShaderNodeTexCoord', (-1600, -200))
at = node(nt, 'ShaderNodeAttribute', (-400, 0)); at.attribute_name = 'col'
bsdf = node(nt, 'ShaderNodeBsdfPrincipled', (200, 0)); bsdf.inputs['Roughness'].default_value = 1.0
bsdf.inputs['Specular IOR Level'].default_value = 0.15
link(nt, at.outputs['Color'], bsdf.inputs['Base Color'])
# --- lava: real 1992 flow (arrival map R channel; edge distance map) → crisp bands
lav = node(nt, 'ShaderNodeTexImage', (-1300, 700)); lav.image = bpy.data.images.load(str(ROOT / 'public/terrain/etna/lava.png')); lav.image.colorspace_settings.name = 'Non-Color'; lav.interpolation = 'Linear'
link(nt, uv.outputs['UV'], lav.inputs['Vector'])
sepl = node(nt, 'ShaderNodeSeparateColor', (-1100, 700)); link(nt, lav.outputs['Color'], sepl.inputs['Color'])
edg = node(nt, 'ShaderNodeTexImage', (-1300, 1000)); edg.image = bpy.data.images.load(str(ROOT / 'public/terrain/etna/lava_edge.png')); edg.image.colorspace_settings.name = 'Non-Color'
link(nt, uv.outputs['UV'], edg.inputs['Vector'])
prog = node(nt, 'ShaderNodeValue', (-1300, 1250)); prog.label = 'prog'
lt1 = node(nt, 'ShaderNodeMath', (-900, 800), operation='LESS_THAN'); link(nt, sepl.outputs['Red'], lt1.inputs[0]); link(nt, prog.outputs[0], lt1.inputs[1])
lt2 = node(nt, 'ShaderNodeMath', (-900, 650), operation='LESS_THAN'); link(nt, sepl.outputs['Red'], lt2.inputs[0]); lt2.inputs[1].default_value = 0.995
onm = node(nt, 'ShaderNodeMath', (-700, 700), operation='MULTIPLY'); link(nt, lt1.outputs[0], onm.inputs[0]); link(nt, lt2.outputs[0], onm.inputs[1])
age = node(nt, 'ShaderNodeMath', (-900, 450), operation='SUBTRACT'); link(nt, prog.outputs[0], age.inputs[0]); link(nt, sepl.outputs['Red'], age.inputs[1])
# bands across the river (constant ramp = hard edges): dark-red rim → orange → yellow core
band = node(nt, 'ShaderNodeValToRGB', (-700, 1000)); band.color_ramp.interpolation = 'CONSTANT'; be_ = band.color_ramp.elements
be_[0].position = 0.0; be_[0].color = (*hexc('#a3170c'), 1)
be_[1].position = float(arg('core', 0.72)); be_[1].color = (*hexc('#ffc21a'), 1)
e_ = be_.new(float(arg('rim', 0.16))); e_.color = (*hexc('#ff6a00'), 1)
link(nt, edg.outputs['Color'], band.inputs['Fac'])
# bright front where the lava has just arrived
frn = node(nt, 'ShaderNodeMath', (-700, 450), operation='LESS_THAN'); link(nt, age.outputs[0], frn.inputs[0]); frn.inputs[1].default_value = 0.016
frc = node(nt, 'ShaderNodeRGB', (-700, 300)); frc.outputs[0].default_value = (*hexc('#fff07a'), 1)
mfr = node(nt, 'ShaderNodeMix', (-400, 900)); mfr.data_type = 'RGBA'
link(nt, frn.outputs[0], mfr.inputs['Factor']); link(nt, band.outputs['Color'], mfr.inputs['A']); link(nt, frc.outputs[0], mfr.inputs['B'])
emi = node(nt, 'ShaderNodeEmission', (0, 900)); link(nt, mfr.outputs['Result'], emi.inputs['Color']); emi.inputs['Strength'].default_value = 1.0
# a few crisp dark crust plates (Voronoi polygons, inset so a glowing seam stays between neighbours)
vor = node(nt, 'ShaderNodeTexVoronoi', (-900, 1500)); vor.inputs['Scale'].default_value = float(arg('plates', 5.5))
link(nt, tc.outputs['Object'], vor.inputs['Vector'])
vore = node(nt, 'ShaderNodeTexVoronoi', (-900, 1750), feature='DISTANCE_TO_EDGE'); vore.inputs['Scale'].default_value = vor.inputs['Scale'].default_value
link(nt, tc.outputs['Object'], vore.inputs['Vector'])
vsep = node(nt, 'ShaderNodeSeparateColor', (-700, 1500)); link(nt, vor.outputs['Color'], vsep.inputs['Color'])
pl1 = node(nt, 'ShaderNodeMath', (-500, 1500), operation='LESS_THAN'); link(nt, vsep.outputs['Red'], pl1.inputs[0]); pl1.inputs[1].default_value = 0.24
pl2 = node(nt, 'ShaderNodeMath', (-500, 1750), operation='GREATER_THAN'); link(nt, vore.outputs['Distance'], pl2.inputs[0]); pl2.inputs[1].default_value = 0.09
pl3 = node(nt, 'ShaderNodeMath', (-500, 1300), operation='GREATER_THAN'); link(nt, age.outputs[0], pl3.inputs[0]); pl3.inputs[1].default_value = 0.035
pl4 = node(nt, 'ShaderNodeMath', (-500, 1150), operation='GREATER_THAN'); link(nt, edg.outputs['Color'], pl4.inputs[0]); pl4.inputs[1].default_value = 0.24
pm1 = node(nt, 'ShaderNodeMath', (-300, 1600), operation='MULTIPLY'); link(nt, pl1.outputs[0], pm1.inputs[0]); link(nt, pl2.outputs[0], pm1.inputs[1])
pm2 = node(nt, 'ShaderNodeMath', (-300, 1400), operation='MULTIPLY'); link(nt, pm1.outputs[0], pm2.inputs[0]); link(nt, pl3.outputs[0], pm2.inputs[1])
pm3 = node(nt, 'ShaderNodeMath', (-300, 1200), operation='MULTIPLY'); link(nt, pm2.outputs[0], pm3.inputs[0]); link(nt, pl4.outputs[0], pm3.inputs[1])
crust = node(nt, 'ShaderNodeBsdfPrincipled', (0, 1300)); crust.inputs['Base Color'].default_value = (*hexc('#3a2620'), 1); crust.inputs['Roughness'].default_value = 0.6
mcr = node(nt, 'ShaderNodeMixShader', (300, 1100)); link(nt, pm3.outputs[0], mcr.inputs['Fac']); link(nt, emi.outputs[0], mcr.inputs[1]); link(nt, crust.outputs[0], mcr.inputs[2])
mixs = node(nt, 'ShaderNodeMixShader', (1500, 400)); link(nt, onm.outputs[0], mixs.inputs['Fac']); link(nt, bsdf.outputs[0], mixs.inputs[1]); link(nt, mcr.outputs[0], mixs.inputs[2])
link(nt, mixs.outputs[0], out.inputs['Surface'])
terr.data.materials.append(mat)
# prog over the shot: the front crawls down Valle del Bove toward the town (Etna.tsx progR range)
for t, v in ((T0, 0.42), (T1, 0.74)):
	prog.outputs[0].default_value = v; prog.outputs[0].keyframe_insert('default_value', frame=fr(t))
for fc in fcurves_of(mat.node_tree):
	for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# ------------------------------------------------------------------ sea (flat cartoon blue)
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0.004))
sea = bpy.context.object; sm = bpy.data.materials.new('sea'); sm.use_nodes = True
sb = sm.node_tree.nodes['Principled BSDF']; sb.inputs['Base Color'].default_value = (*PAL['sea'], 1); sb.inputs['Roughness'].default_value = 0.5
sb.inputs['Specular IOR Level'].default_value = 0.2
sea.data.materials.append(sm)

# ------------------------------------------------------------------ world: clear cartoon sky gradient
wd = bpy.data.worlds.new('sky'); sc.world = wd; wd.use_nodes = True
wn_ = wd.node_tree; wn_.nodes.clear()
wo = node(wn_, 'ShaderNodeOutputWorld', (600, 0))
wtc = node(wn_, 'ShaderNodeTexCoord', (-600, 0))
wsep = node(wn_, 'ShaderNodeSeparateXYZ', (-400, 0)); link(wn_, wtc.outputs['Generated'], wsep.inputs['Vector'])
wr = node(wn_, 'ShaderNodeValToRGB', (-200, 0)); we = wr.color_ramp.elements
we[0].position = 0.0; we[0].color = (*hexc('#ffe2a8'), 1)
we[1].position = 0.55; we[1].color = (*hexc('#2f6fd6'), 1)
e = we.new(0.12); e.color = (*hexc('#8fd0f5'), 1)
link(wn_, wsep.outputs['Z'], wr.inputs['Fac'])
wbg = node(wn_, 'ShaderNodeBackground', (200, 0)); link(wn_, wr.outputs['Color'], wbg.inputs['Color']); wbg.inputs['Strength'].default_value = float(arg('sky', 1.35))
link(wn_, wbg.outputs[0], wo.inputs['Surface'])

# ------------------------------------------------------------------ sun
sun_d = bpy.data.lights.new('sun', 'SUN'); sun_d.energy = float(arg('sun', 3.2)); sun_d.color = srgb(1.0, 0.95, 0.86); sun_d.angle = math.radians(1)
sun = bpy.data.objects.new('sun', sun_d); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(float(arg('sunx', 48))), 0, math.radians(20))   # warm sun from the SSE, ~42° high
fill_d = bpy.data.lights.new('fill', 'SUN'); fill_d.energy = float(arg('fill', 0.9)); fill_d.color = srgb(0.75, 0.82, 1.0); fill_d.use_shadow = False
fill = bpy.data.objects.new('fill', fill_d); sc.collection.objects.link(fill)
fill.rotation_euler = (math.radians(50), 0, math.radians(200))   # cool shadowless fill from the NNW: shadows stay coloured, never black

# ------------------------------------------------------------------ cartoon smoke: clusters of low-poly spheres (keyframed rise + growth)
def flatmat(name, c, emit=None, es=1.0, rough=1.0):
	m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
	b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Specular IOR Level'].default_value = 0.1
	if emit is not None:
		b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
	return m
def ico(name, subdiv=1):
	bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
	m = bpy.data.meshes.new(name); bm.to_mesh(m); bm.free()
	m.polygons.foreach_set('use_smooth', np.zeros(len(m.polygons), bool))
	return m
PUFF = ico('puff', 2)
CLUSTER = [((0, 0, 0), 1.0), ((0.62, 0.25, -0.25), 0.7), ((-0.55, -0.3, -0.2), 0.68), ((0.1, -0.5, 0.45), 0.6)]
def smoke(name, starts, n_births, t_first, period, hfun, rfun, drift, mats, seed, cluster=CLUSTER, jitter=0.35):
	"""starts(k) → base Vector; births every `period` frames from t_first; each puff = cluster of ico spheres."""
	r_ = np.random.default_rng(seed)
	objs = 0
	for k in range(n_births):
		b = t_first + k * period + r_.uniform(-0.3, 0.3) * period
		if b > LASTF: break
		base = starts(k)
		jit = Vector((r_.uniform(-1, 1), r_.uniform(-1, 1), 0)) * jitter
		spin = Vector((r_.uniform(-1, 1), r_.uniform(-1, 1), r_.uniform(-1, 1))) * 0.004
		rot0 = Vector((r_.uniform(0, 6.3), r_.uniform(0, 6.3), r_.uniform(0, 6.3)))
		mi = r_.integers(len(mats))
		keys = sorted(set([max(1, int(b))] + list(range(max(1, int(math.ceil(b))), LASTF + 1, 8)) + [LASTF]))
		for ci, (off, s) in enumerate(cluster):
			o = bpy.data.objects.new(f'{name}{k}_{ci}', PUFF); sc.collection.objects.link(o)
			o['m'] = mats[(mi + ci) % len(mats)].name
			for f in keys:
				a = f - b
				if a < 0:
					sz = 0.0; h = 0.0; r = rfun(0)
				else:
					h = hfun(a); r = rfun(a); sz = r * s
				cpos = base + Vector((drift[0] * h, drift[1] * h, h)) + jit * r + Vector(off) * r
				o.location = cpos; o.scale = (sz, sz, sz * 0.92)
				o.rotation_euler = rot0 + spin * f
				o.keyframe_insert('location', frame=f); o.keyframe_insert('scale', frame=f); o.keyframe_insert('rotation_euler', frame=f)
			objs += 1
	return objs
# materials on the shared puff mesh are assigned per object (link='OBJECT')
PUFF.materials.append(None)
def set_obj_mats():
	for o in sc.objects:
		if 'm' in o.keys():
			o.material_slots[0].link = 'OBJECT'; o.material_slots[0].material = bpy.data.materials[o['m']]
ASH = [flatmat('ash1', hexc('#8e93a3')), flatmat('ash2', hexc('#757a8c')), flatmat('ash3', hexc('#a9aebb')), flatmat('ash4', hexc('#62677a'))]
STEAM = [flatmat('st1', hexc('#f2efe9')), flatmat('st2', hexc('#dcd8d2')), flatmat('st3', hexc('#c9c4c0'))]
crater = Vector((SUMMIT.x, SUMMIT.y, SUMMIT.z - 0.12))
n_ash = smoke('ash', lambda k: crater, 800, 1 - 1300, 6,
              hfun=lambda a: 0.22 * (math.sqrt(a + 60) - math.sqrt(60)), rfun=lambda a: 0.17 + 0.024 * math.sqrt(a), drift=(0.42, 0.12), mats=ASH, seed=5)
fa, fb = P(*G['fissA']), P(*G['fissB'])
r_f = np.random.default_rng(9)
n_st = smoke('steam', lambda k: fa.lerp(fb, float(r_f.random())) + Vector((0.12, 0.03, float(arg('steamz', 0.7)))), 800, 1 - 700, 5,
             hfun=lambda a: 0.075 * (math.sqrt(a + 30) - math.sqrt(30)), rfun=lambda a: 0.03 + 0.011 * math.sqrt(a), drift=(0.3, 0.1), mats=STEAM, seed=6,
             cluster=CLUSTER[:3], jitter=0.5)
set_obj_mats()
print('smoke objects', n_ash, n_st, flush=True)
vent = P(*G['vent'])
vl = bpy.data.lights.new('ventglow', 'POINT'); vl.energy = float(arg('ventw', 80)); vl.color = (1.0, 0.45, 0.12); vl.shadow_soft_size = 0.05
vl.use_shadow = False
vo = bpy.data.objects.new('ventglow', vl); vo.location = vent + Vector((0, 0, 0.25)); sc.collection.objects.link(vo)

# ------------------------------------------------------------------ lava fountains along the fissure: bright low-poly blobs (particles)
bpy.ops.mesh.primitive_plane_add(size=1, location=((fa + fb) / 2 + Vector((0, 0, 0.015))))
em = bpy.context.object; em.name = 'fissure'
d = fb - fa; em.scale = (d.length, 0.03, 1); em.rotation_euler = (0, 0, math.atan2(d.y, d.x))
# (the emitter must stay renderable, otherwise its particles vanish too; show_instancer_for_render hides the plane itself)
blobs = bpy.data.collections.new('blobs'); sc.collection.children.link(blobs)   # prototypes at the origin; collection excluded below
for nm, c, s in (('blobY', '#fff6a8', 1.0), ('blobO', '#ff8c00', 1.2), ('blobR', '#ff3a00', 0.9), ('blobY2', '#ffd21f', 1.1)):
	bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=float(arg('blobr', 0.05)) * s)
	mb = bpy.data.meshes.new(nm); bm.to_mesh(mb); bm.free()
	ob = bpy.data.objects.new(nm, mb); blobs.objects.link(ob)
	m = bpy.data.materials.new(nm); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	o_ = node(t, 'ShaderNodeOutputMaterial', (300, 0)); e2 = node(t, 'ShaderNodeEmission', (0, 0)); e2.inputs['Color'].default_value = (*hexc(c), 1); e2.inputs['Strength'].default_value = 1.0
	link(t, e2.outputs[0], o_.inputs['Surface']); mb.materials.append(m)
ps_mod = em.modifiers.new('fount', 'PARTICLE_SYSTEM'); ps = ps_mod.particle_system.settings
# cartoon ballistics: particle time runs 0.04 s/frame, so gravity is scaled up to get ~0.6 km arcs that rise and fall in ~70 frames
ps.count = int(arg('blobs', 6000)); ps.frame_start = 1; ps.frame_end = NF + PRE; ps.lifetime = 72; ps.lifetime_random = 0.15
ps.emit_from = 'FACE'; ps.normal_factor = float(arg('fv', 0.8)); ps.factor_random = float(arg('fr', 0.75)); ps.effector_weights.gravity = float(arg('fg', 55)); ps.object_align_factor = (0, 0, 0)
ps.render_type = 'COLLECTION'; ps.instance_collection = blobs; ps.use_collection_pick_random = True
ps.particle_size = 1.0; ps.size_random = 0.5
ps.physics_type = 'NEWTON'; ps.mass = 1.0; ps.use_rotations = True; ps.rotation_mode = 'NONE'; ps.angular_velocity_mode = 'RAND'; ps.angular_velocity_factor = 2.0
em.show_instancer_for_render = False
bpy.context.view_layer.layer_collection.children['blobs'].exclude = True   # instanced only (prototypes never render at the origin)

# ------------------------------------------------------------------ Zafferana: pastel toy houses with red roofs (real OSM footprints)
rng_h = np.random.default_rng(7)
house = bpy.data.meshes.new('house'); bmh = bmesh.new()
bmesh.ops.create_cube(bmh, size=1.0)
for v in bmh.verts: v.co.z += 0.5
bmh.to_mesh(house); bmh.free()
roof = bpy.data.meshes.new('roof'); bmr = bmesh.new()
pts = [(-0.58, -0.58, 1.0), (0.58, -0.58, 1.0), (0.58, 0.58, 1.0), (-0.58, 0.58, 1.0), (0, -0.58, 1.55), (0, 0.58, 1.55)]
vs = [bmr.verts.new(p) for p in pts]
for f in ((0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4), (0, 3, 2, 1)): bmr.faces.new([vs[i] for i in f])
bmesh.ops.recalc_face_normals(bmr, faces=bmr.faces)
bmr.to_mesh(roof); bmr.free()
def objcol_mat(name, cols):
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree
	b = t.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.9; b.inputs['Specular IOR Level'].default_value = 0.1
	oi = node(t, 'ShaderNodeObjectInfo', (-600, 0))
	rp = node(t, 'ShaderNodeValToRGB', (-350, 0)); rp.color_ramp.interpolation = 'CONSTANT'; els = rp.color_ramp.elements
	els[0].position = 0.0; els[0].color = (*hexc(cols[0]), 1); els[1].position = 1.0 / len(cols) * (len(cols) - 1); els[1].color = (*hexc(cols[-1]), 1)
	for k, c in enumerate(cols[1:-1], 1):
		ee = els.new(k / len(cols)); ee.color = (*hexc(c), 1)
	link(t, oi.outputs['Random'], rp.inputs['Fac']); link(t, rp.outputs['Color'], b.inputs['Base Color'])
	return m
wall_m = objcol_mat('wall', ['#fff4dc', '#ffe39a', '#ffd0b0', '#f4f7ff', '#ffeec7', '#ffc9c9'])
roof_m = objcol_mat('roof', ['#d9452b', '#c23a22', '#e8602f', '#b8331f'])
house.materials.append(wall_m); roof.materials.append(roof_m)
lav_img = bpy.data.images[lav.image.name]
lbuf = np.empty(lav_img.size[0] * lav_img.size[1] * 4, np.float32); lav_img.pixels.foreach_get(lbuf)
lava_px = lbuf.reshape(lav_img.size[1], lav_img.size[0], 4)[::-1, :, 0]; del lbuf
osm = json.load(open(ROOT / 'data/osm_zafferana/buildings.json'))['elements']
HS = float(arg('house', 1.35))     # toy exaggeration of footprint size
placed = 0
for el_ in osm:
	g_ = el_.get('geometry') or []
	if len(g_) < 3: continue
	lat = sum(p_['lat'] for p_ in g_) / len(g_); lon = sum(p_['lon'] for p_ in g_) / len(g_)
	u, v = uvof(lat, lon)
	if not (0 < u < 1 and 0 < v < 1): continue
	if lava_px[int(v * (lava_px.shape[0] - 1)), int(u * (lava_px.shape[1] - 1))] < 0.99: continue
	x, y = (u - 0.5) * WK, (0.5 - v) * HK
	z = surf(x, y)
	if z < 0.02: continue
	xs_ = [(p_['lon'] - lon) * 111.32 * math.cos(math.radians(lat)) for p_ in g_]; ys_ = [(p_['lat'] - lat) * 110.57 for p_ in g_]
	ed = max(range(len(g_) - 1), key=lambda k: (xs_[k + 1] - xs_[k]) ** 2 + (ys_[k + 1] - ys_[k]) ** 2)
	ang = math.atan2(ys_[ed + 1] - ys_[ed], xs_[ed + 1] - xs_[ed])
	ca_, sa_ = math.cos(-ang), math.sin(-ang)
	rx = [x_ * ca_ - y_ * sa_ for x_, y_ in zip(xs_, ys_)]; ry = [x_ * sa_ + y_ * ca_ for x_, y_ in zip(xs_, ys_)]
	w_ = max(0.008, min(0.05, max(rx) - min(rx))) * HS; d_ = max(0.008, min(0.05, max(ry) - min(ry))) * HS
	hgt = (0.008 + 0.006 * rng_h.random()) * HS
	for mesh_, nm in ((house, 'h'), (roof, 'r')):
		o = bpy.data.objects.new(nm, mesh_); o.location = (x, y, z - 0.006)
		o.scale = (w_, d_, hgt + (0.006 if nm == 'h' else 0)); o.rotation_euler = (0, 0, ang)
		if nm == 'r': o.location.z += 0.006
		sc.collection.objects.link(o)
	placed += 1
print('houses', placed, flush=True)

# ------------------------------------------------------------------ camera: identical framing/timing to the pilot
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 26; cam_d.sensor_fit = 'VERTICAL'; cam_d.sensor_height = 36; cam_d.clip_end = 300; cam_d.clip_start = 0.01
cam_d.dof.use_dof = False
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
print('scene built in %.1f s' % (time.time() - t_start), flush=True)
if '--blend' in argv:
	bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'scene.blend'))
OUT.mkdir(parents=True, exist_ok=True)
FROM = int(arg('from', 1))
want = [int(x) + PRE for x in FRAMES.split(',')] if FRAMES else list(range(FROM + PRE, NF + PRE + 1))
for f in range(1, max(want) + 1):
	sc.frame_set(f)                       # step through every frame so the particle simulation is consistent
	if f in want:
		t_ = time.time()
		sc.render.filepath = str(OUT / f'f_{f - PRE:04d}.png')
		bpy.ops.render.render(write_still=True)
		print('rendered', f, 'in %.1f s' % (time.time() - t_), flush=True)
print('done', NF, 'frames total; T0', T0, 'T1', T1)
