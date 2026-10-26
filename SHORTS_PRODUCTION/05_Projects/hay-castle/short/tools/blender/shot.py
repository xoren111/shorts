"""3D insert for a Short: a JSON spec → headless Blender scene → RGBA PNG (or WebP) sequence for src/ui/Clip3D.tsx.

  tools/blender/run.sh tools/blender/shot.py -- tools/blender/examples/coin.json        → public/3d/coin/f_0001.png … + meta.json
  tools/blender/run.sh tools/blender/shot.py -- <spec> --scale 50 --frames 1,12        → out/3d_preview/<name>/ (test frames)
  NOLOCK=1 tools/blender/run.sh tools/blender/shot.py -- <spec> --probe                 → framing report (px boxes), no render
Options: --scale <percent> · --frames a,b,c · --out <dir> · --samples <n> · --engine eevee|cycles · --name <name>
         · --save <file.blend> (inspect the built scene in the Blender UI) · --probe
Spec format (colours sRGB like CSS, angles in degrees, Z up, «front» camera = on −Y looking at +Y): tools/blender/README.md.
Guards (exit 2): nothing from 03_Assets/_quarantine (path or a quarantined file name) and no Mixkit file; no Atlas / orangutan
file, folder or object name (Atlas = the owner's 2D art only, never built or re-made in 3D — ~/shorts/orangutan CHARACTER_RULES);
size ≤ 1080 × 1920. A full render writes <out>.part/ first and swaps it in only when every frame and meta.json exist.
"""
import bpy
import bmesh
import hashlib
import json
import math
import os
import re
import shutil
import sys
import time
from pathlib import Path
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

T_START = time.time()
ROOT = Path.cwd()                                   # run.sh starts Blender in short/
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FLAGS = {'probe'}
POS, OPT = [], {}
i = 0
while i < len(argv):
	a = argv[i]
	if a.startswith('--'):
		k = a[2:]
		if k in FLAGS:
			OPT[k] = True; i += 1
		else:
			OPT[k] = argv[i + 1] if i + 1 < len(argv) else ''; i += 2
	else:
		POS.append(a); i += 1


def die(msg):
	print(f'shot.py: ERROR {msg}', flush=True)
	sys.exit(2)


def warn(msg):
	print(f'shot.py: WARNING {msg}', flush=True)


if not POS:
	die('usage: run.sh tools/blender/shot.py -- <spec.json> [--scale 50] [--frames 1,12] [--probe]')
SPEC_PATH = Path(POS[0]).resolve()
if not SPEC_PATH.exists():
	die(f'spec not found: {POS[0]}')
SPEC_TXT = SPEC_PATH.read_text()
S = json.loads(SPEC_TXT)
SPEC_DIR = SPEC_PATH.parent
PROJECT = json.loads((ROOT / 'project.json').read_text()) if (ROOT / 'project.json').exists() else {}
LIB = Path(PROJECT['library_root']) if PROJECT.get('library_root') else None

# ------------------------------------------------------------------ spec keys (typos → warning; keys starting with _ = comments)
TOP = {'name', 'fps', 'frames', 'size', 'scale', 'format', 'quality', 'engine', 'samples', 'denoise', 'raytracing', 'transparent', 'view', 'look',
	'exposure', 'loop', 'motion_blur', 'world', 'materials', 'objects', 'lights', 'camera', 'not_the_host'}
OBJ = {'type', 'name', 'location', 'rotation', 'scale', 'material', 'parent', 'smooth', 'smooth_angle', 'bevel', 'bevel_segments',
	'outline', 'outline_color', 'spin', 'keys', 'bob', 'catcher', 'holdout', 'hidden', 'license', 'credit',
	'size', 'radius', 'segments', 'rings', 'subdiv', 'depth', 'vertices', 'radius1', 'radius2', 'major', 'minor',
	'points', 'outer', 'inner', 'body', 'font', 'extrude', 'text_bevel', 'align', 'path', 'fit'}
MAT = {'shader', 'color', 'metallic', 'roughness', 'coat', 'emission', 'emission_strength', 'alpha', 'image', 'image_alpha',
	'steps', 'license', 'credit', 'ior', 'transmission'}
CAM = {'lens', 'ortho', 'target', 'target_to', 'location', 'to', 'orbit', 'fill', 'fill_at', 'roll', 'ease', 'dof', 'clip'}
LIGHT = {'type', 'location', 'rotation', 'target', 'energy', 'color', 'size', 'angle', 'cone', 'blend', 'radius'}


def check_keys(d, allowed, where):
	for k in d:
		if not k.startswith('_') and k not in allowed:
			warn(f'{where}: unknown key «{k}» (ignored)')


check_keys(S, TOP, 'spec')
NAME = OPT.get('name') or S.get('name') or SPEC_PATH.stem
if not re.fullmatch(r'[a-z0-9][a-z0-9_-]*', NAME):
	die(f'name «{NAME}»: use a-z 0-9 _ - (it is the folder public/3d/<name>)')
FPS = int(S.get('fps', 30))
NF = int(S.get('frames', 48))
W_, H_ = (int(x) for x in S.get('size', [1080, 1920]))
if W_ > 1080 or H_ > 1920 or W_ < 16 or H_ < 16:
	die(f'size {W_}×{H_}: an insert is at most 1080 × 1920 (the Short frame)')
PCT = int(OPT.get('scale', S.get('scale', 100)))
ENGINE = str(OPT.get('engine', S.get('engine', 'eevee'))).lower()
SAMPLES = int(OPT.get('samples', S.get('samples', 64 if ENGINE == 'cycles' else 32)))
LOOP = bool(S.get('loop', False))
FRAMES = [int(x) for x in str(OPT['frames']).split(',') if x.strip()] if OPT.get('frames') else None
if FRAMES and any(f < 1 or f > NF for f in FRAMES):
	die(f'--frames {OPT["frames"]}: frames are 1…{NF}')

# ------------------------------------------------------------------ guards: quarantine, Mixkit, Atlas
QNAMES = set()
if LIB and (LIB / '03_Assets/_quarantine').exists():
	for dp, _, fs in os.walk(LIB / '03_Assets/_quarantine'):
		QNAMES.update(f.lower() for f in fs if not f.startswith('.') and not f.upper().startswith('README'))
else:
	warn('library quarantine not found (project.json library_root) — only the _quarantine path and Mixkit names are checked')
HOST_DIRS = [Path.home() / 'shorts' / d for d in ('orangutan', 'atlas-3d', 'atlas-3d-ai', 'atlas-blender')]
HOST_RE = re.compile(r'orang[\s_-]?utan|(^|[^a-z])atlas([^a-z]|$)', re.I)
NOT_HOST = S.get('not_the_host')          # e.g. "Atlas Mountains relief" — lifts the NAME check only, never the folder check


def guard(p, kind):
	s = str(p)
	if '_quarantine' in p.parts or p.name.lower() in QNAMES:
		die(f'{kind} {s} is in 03_Assets/_quarantine (see its README) — use the replacement')
	if 'mixkit' in s.lower():
		die(f'{kind} {s}: Mixkit files are replaced and quarantined (owner decision 24.10, standard L5)')
	for d in HOST_DIRS:
		if s.startswith(str(d) + os.sep):
			die(f'{kind} {s} comes from {d}: Atlas is the owner\'s 2D art only, never a 3D model (CHARACTER_RULES; 3D attempts were dropped by the owner)')
	if kind == 'model' and HOST_RE.search(p.stem) and not NOT_HOST:
		die(f'model {p.name} looks like the host (Atlas / orangutan) — Atlas is never built in 3D; if it is something else, set "not_the_host": "<what it is>"')


def name_guard(n, where):
	if HOST_RE.search(n or '') and not NOT_HOST:
		die(f'{where} «{n}»: Atlas / orangutan is never built from 3D parts (owner rule: only the owner\'s own art); '
			'if the name means something else, set "not_the_host": "<what it is>"')


name_guard(NAME, 'shot name')
SOURCES = []


def resolve(p, kind, owner=None):
	"""spec path → absolute Path: absolute, ~, 03_Assets/… (library_root), short/-relative, or relative to the spec file"""
	q = Path(os.path.expanduser(str(p)))
	if not q.is_absolute():
		if str(p).startswith('03_Assets/') and LIB:
			q = LIB / p
		elif (ROOT / p).exists():
			q = ROOT / p
		else:
			q = SPEC_DIR / p
	q = q.resolve()
	if not q.exists():
		die(f'{kind} not found: {p}')
	guard(q, kind)
	owner = owner or {}
	lic = owner.get('license')
	if not lic and str(q).startswith(str((ROOT / 'public/fonts').resolve())):
		lic = 'SIL OFL 1.1 (template font, CREDITS.md)'
	if not lic:
		warn(f'{kind} {q.name}: no "license" in the spec — give it, and a CREDITS.md line (check3d.mjs asks for both)')
	SOURCES.append({'kind': kind, 'path': str(p), 'file': q.name, 'license': lic, 'credit': owner.get('credit')})
	return q


# ------------------------------------------------------------------ helpers
def srgb(c):
	"""'#rrggbb' or [r, g, b] (0–1, sRGB) → linear RGBA tuple for Blender"""
	if isinstance(c, str):
		h = c.lstrip('#')
		if len(h) == 3:
			h = ''.join(x * 2 for x in h)
		c = [int(h[k:k + 2], 16) / 255 for k in (0, 2, 4)]
	lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c[:3]]
	return (*lin, 1.0)


def vec3(v, default=(0, 0, 0)):
	if v is None:
		return Vector(default)
	if isinstance(v, (int, float)):
		return Vector((v, v, v))
	return Vector(v)


EASE = {
	'linear': lambda x: x,
	'in': lambda x: x ** 3,
	'out': lambda x: 1 - (1 - x) ** 3,
	'inout': lambda x: 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2,
}


def ease(name, x):
	x = max(0.0, min(1.0, x))
	if name not in EASE:
		die(f'ease «{name}»: use {", ".join(EASE)}')
	return EASE[name](x)


def prog(f):
	"""0→1 over the shot; loop shots never reach 1 (frame NF + 1 would be frame 1 again)"""
	return (f - 1) / NF if LOOP else (f - 1) / max(1, NF - 1)


def link(nt, a, b):
	nt.links.new(a, b)


def sock(coll, name, typ='RGBA'):
	"""socket by name AND type (ShaderNodeMix has float / vector / colour sockets that share the names A, B, Result)"""
	for s_ in coll:
		if s_.name == name and s_.type == typ:
			return s_
	return coll[name]


def inp(node, *names):
	for n in names:
		if n in node.inputs:
			return node.inputs[n]
	return None


# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = W_, H_
sc.render.resolution_percentage = PCT
sc.render.fps, sc.render.fps_base = FPS, 1
sc.frame_start, sc.frame_end = 1, NF
FMT = str(S.get('format', 'png')).lower()        # png (exact, ~0.6 MB per 1080² frame) or webp (lossy with alpha, ~8× smaller)
if FMT not in ('png', 'webp'):
	die(f'format «{FMT}»: png or webp')
EXT = FMT
sc.render.image_settings.file_format = FMT.upper()
sc.render.image_settings.color_mode = 'RGBA' if S.get('transparent', True) else 'RGB'
if FMT == 'png':
	sc.render.image_settings.color_depth = '8'
	sc.render.image_settings.compression = 60
else:
	sc.render.image_settings.quality = int(S.get('quality', 90))   # 100 = lossless
sc.render.film_transparent = bool(S.get('transparent', True))
try:
	sc.view_settings.view_transform = S.get('view', 'Standard')   # Standard = colours exactly as authored (channel toon look)
	if 'look' in S:
		sc.view_settings.look = S['look']
except TypeError as e:
	die(f'view / look: {e}')
sc.view_settings.exposure = float(S.get('exposure', 0))
DEVICE = 'GPU (Metal)'
if ENGINE == 'cycles':
	sc.render.engine = 'CYCLES'
	cp = bpy.context.preferences.addons['cycles'].preferences
	cp.compute_device_type = 'METAL'
	cp.get_devices()
	metal = [d for d in cp.devices if d.type == 'METAL']
	for d in cp.devices:
		d.use = d.type == 'METAL'
	sc.cycles.device = 'GPU' if metal else 'CPU'
	DEVICE = f'Cycles {"GPU " + metal[0].name if metal else "CPU (no Metal device!)"}'
	if not metal:
		warn('Cycles: no Metal GPU found → CPU render (slow)')
	sc.cycles.samples = SAMPLES
	sc.cycles.use_denoising = bool(S.get('denoise', True))
elif ENGINE == 'eevee':
	sc.render.engine = 'BLENDER_EEVEE'
	sc.eevee.taa_render_samples = SAMPLES
	sc.eevee.use_shadows = True
	sc.eevee.use_raytracing = bool(S.get('raytracing', True))      # screen-space reflections on metal / glass
	DEVICE = f'EEVEE on {getattr(bpy.context.preferences.system, "gpu_backend", "?")}'
else:
	die(f'engine «{ENGINE}»: eevee or cycles')
if S.get('motion_blur'):
	sc.render.use_motion_blur = True
	sc.render.motion_blur_shutter = float(S['motion_blur']) if not isinstance(S['motion_blur'], bool) else 0.5
print(f'shot {NAME}: {NF} frames @ {FPS} fps, {W_}×{H_} at {PCT} %, {DEVICE}, {SAMPLES} samples, loop={LOOP}', flush=True)

# ------------------------------------------------------------------ world
def build_world(w):
	world = bpy.data.worlds.new('World')
	sc.world = world
	nt = world.node_tree
	nt.nodes.clear()
	out = nt.nodes.new('ShaderNodeOutputWorld')
	bg = nt.nodes.new('ShaderNodeBackground')
	bg.inputs['Strength'].default_value = float(w.get('strength', 1.0))
	link(nt, bg.outputs[0], out.inputs['Surface'])
	if w.get('hdri'):
		p = resolve(w['hdri'], 'hdri', w)
		tc = nt.nodes.new('ShaderNodeTexCoord')
		mp = nt.nodes.new('ShaderNodeMapping')
		mp.inputs['Rotation'].default_value[2] = math.radians(float(w.get('rotate', 0)))
		env = nt.nodes.new('ShaderNodeTexEnvironment')
		env.image = bpy.data.images.load(str(p))
		link(nt, tc.outputs['Generated'], mp.inputs['Vector'])
		link(nt, mp.outputs[0], env.inputs['Vector'])
		link(nt, env.outputs['Color'], bg.inputs['Color'])
	elif w.get('preset', 'studio') == 'studio':
		# soft studio dome: dark floor, bright horizon band (the highlight on metal), mid-grey top
		tc = nt.nodes.new('ShaderNodeTexCoord')
		sep = nt.nodes.new('ShaderNodeSeparateXYZ')
		mr = nt.nodes.new('ShaderNodeMapRange')
		mr.inputs['From Min'].default_value, mr.inputs['From Max'].default_value = -1, 1
		ramp = nt.nodes.new('ShaderNodeValToRGB')
		cr = ramp.color_ramp
		cr.elements[0].position, cr.elements[0].color = 0.0, srgb(w.get('ground', '#202024'))
		cr.elements[1].position, cr.elements[1].color = 1.0, srgb(w.get('top', '#8c8c99'))
		for pos, col in ((0.47, w.get('ground', '#202024')), (0.53, w.get('horizon', '#ffffff')), (0.66, w.get('horizon', '#ffffff'))):
			e = cr.elements.new(pos)
			e.color = srgb(col)
		link(nt, tc.outputs['Generated'], sep.inputs[0])
		link(nt, sep.outputs['Z'], mr.inputs['Value'])
		link(nt, mr.outputs[0], ramp.inputs['Fac'])
		link(nt, ramp.outputs['Color'], bg.inputs['Color'])
	else:
		bg.inputs['Color'].default_value = srgb(w.get('color', '#101014'))


W_SPEC = S.get('world', {})
check_keys(W_SPEC, {'preset', 'color', 'strength', 'hdri', 'rotate', 'ground', 'horizon', 'top', 'license', 'credit'}, 'world')
build_world(W_SPEC)

# ------------------------------------------------------------------ materials
MATS = {}
OUTLINE_MATS = {}


def make_mat(name, m):
	check_keys(m, MAT, f'material {name}')
	mat = bpy.data.materials.new(name)
	nt = mat.node_tree
	nt.nodes.clear()
	out = nt.nodes.new('ShaderNodeOutputMaterial')
	shader = m.get('shader', 'pbr')
	if shader == 'toon' and ENGINE == 'cycles':
		warn(f'material {name}: toon needs EEVEE (Shader to RGB) → PBR in Cycles')
		shader = 'pbr'
	col = srgb(m.get('color', '#bbbbbb'))
	tex = None
	if m.get('image'):
		tex = nt.nodes.new('ShaderNodeTexImage')
		tex.image = bpy.data.images.load(str(resolve(m['image'], 'image', m)))
	if shader == 'pbr':
		b = nt.nodes.new('ShaderNodeBsdfPrincipled')
		b.inputs['Base Color'].default_value = col
		b.inputs['Metallic'].default_value = float(m.get('metallic', 0))
		b.inputs['Roughness'].default_value = float(m.get('roughness', 0.5))
		if 'ior' in m:
			b.inputs['IOR'].default_value = float(m['ior'])
		if 'transmission' in m:
			inp(b, 'Transmission Weight', 'Transmission').default_value = float(m['transmission'])
		if 'coat' in m:
			inp(b, 'Coat Weight', 'Coat').default_value = float(m['coat'])
		if 'emission' in m:
			inp(b, 'Emission Color', 'Emission').default_value = srgb(m['emission'])
			b.inputs['Emission Strength'].default_value = float(m.get('emission_strength', 1))
		if tex:
			link(nt, tex.outputs['Color'], b.inputs['Base Color'])
			if m.get('image_alpha'):
				link(nt, tex.outputs['Alpha'], b.inputs['Alpha'])
		b.inputs['Alpha'].default_value = float(m.get('alpha', 1))
		link(nt, b.outputs[0], out.inputs['Surface'])
	elif shader in ('toon', 'flat'):
		# toon: diffuse light → hard steps → × colour, emitted (so Standard view shows the authored colours); flat = unlit colour
		em = nt.nodes.new('ShaderNodeEmission')
		if shader == 'toon':
			d = nt.nodes.new('ShaderNodeBsdfDiffuse')
			s2r = nt.nodes.new('ShaderNodeShaderToRGB')
			ramp = nt.nodes.new('ShaderNodeValToRGB')
			cr = ramp.color_ramp
			cr.interpolation = 'CONSTANT'
			steps = m.get('steps', [[0, 0.55], [0.12, 0.8], [0.45, 1.0]])   # [light level where the step starts, brightness]
			cr.elements[0].position, cr.elements[0].color = steps[0][0], (steps[0][1],) * 3 + (1,)
			cr.elements[1].position, cr.elements[1].color = steps[-1][0], (steps[-1][1],) * 3 + (1,)
			for pos, v in steps[1:-1]:
				e = cr.elements.new(pos)
				e.color = (v, v, v, 1)
			mul = nt.nodes.new('ShaderNodeMix')
			mul.data_type, mul.blend_type = 'RGBA', 'MULTIPLY'
			mul.inputs['Factor'].default_value = 1
			link(nt, d.outputs[0], s2r.inputs[0])
			link(nt, s2r.outputs['Color'], ramp.inputs['Fac'])
			link(nt, ramp.outputs['Color'], sock(mul.inputs, 'A'))
			if tex:
				link(nt, tex.outputs['Color'], sock(mul.inputs, 'B'))
			else:
				sock(mul.inputs, 'B').default_value = col
			link(nt, sock(mul.outputs, 'Result'), em.inputs['Color'])
		elif tex:
			link(nt, tex.outputs['Color'], em.inputs['Color'])
		else:
			em.inputs['Color'].default_value = col
		em.inputs['Strength'].default_value = float(m.get('emission_strength', 1))
		link(nt, em.outputs[0], out.inputs['Surface'])
	else:
		die(f'material {name}: shader «{shader}» — pbr, toon or flat')
	if float(m.get('alpha', 1)) < 1:
		mat.surface_render_method = 'BLENDED'
	return mat


for k, m in S.get('materials', {}).items():
	if not k.startswith('_'):
		MATS[k] = make_mat(k, m)


def get_mat(m, owner):
	if m is None:
		return MATS.setdefault('_default', make_mat('_default', {'color': '#c8c8c8', 'roughness': 0.45}))
	if isinstance(m, str):
		if m not in MATS:
			die(f'{owner}: material «{m}» is not in "materials"')
		return MATS[m]
	return make_mat(f'{owner}_mat', m)


def outline_mat(color):
	if color not in OUTLINE_MATS:
		mat = bpy.data.materials.new(f'outline_{color}')
		nt = mat.node_tree
		nt.nodes.clear()
		out = nt.nodes.new('ShaderNodeOutputMaterial')
		em = nt.nodes.new('ShaderNodeEmission')
		em.inputs['Color'].default_value = srgb(color)
		link(nt, em.outputs[0], out.inputs['Surface'])
		mat.use_backface_culling = True
		OUTLINE_MATS[color] = mat
	return OUTLINE_MATS[color]


# ------------------------------------------------------------------ objects
OBJS = {}
SPECS = {}
DEFAULT_SMOOTH = {'sphere', 'ico', 'cylinder', 'cone', 'torus', 'model'}


def star_mesh(name, n, ro, ri, depth):
	bm = bmesh.new()
	m = 2 * n
	pts = [((ro if k % 2 == 0 else ri) * math.cos(math.pi / 2 + k * math.pi / n), (ro if k % 2 == 0 else ri) * math.sin(math.pi / 2 + k * math.pi / n)) for k in range(m)]
	top = [bm.verts.new((x, y, depth / 2)) for x, y in pts]
	bot = [bm.verts.new((x, y, -depth / 2)) for x, y in pts]
	ct, cb = bm.verts.new((0, 0, depth / 2)), bm.verts.new((0, 0, -depth / 2))
	for k in range(m):
		j = (k + 1) % m
		bm.faces.new((ct, top[k], top[j]))
		bm.faces.new((cb, bot[j], bot[k]))
		bm.faces.new((top[k], bot[k], bot[j], top[j]))
	bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	me = bpy.data.meshes.new(name)
	bm.to_mesh(me)
	bm.free()
	return me


def import_model(o, name):
	p = resolve(o.get('path', ''), 'model', o)
	ext = p.suffix.lower()
	before = set(bpy.data.objects)
	if ext in ('.glb', '.gltf'):
		bpy.ops.import_scene.gltf(filepath=str(p))
	elif ext == '.obj':
		bpy.ops.wm.obj_import(filepath=str(p))
	elif ext == '.fbx':
		bpy.ops.import_scene.fbx(filepath=str(p))
	elif ext == '.stl':
		bpy.ops.wm.stl_import(filepath=str(p))
	elif ext == '.ply':
		bpy.ops.wm.ply_import(filepath=str(p))
	else:
		die(f'model {p.name}: .glb .gltf .obj .fbx .stl .ply')
	new = [ob for ob in bpy.data.objects if ob not in before]
	for ob in new:
		name_guard(ob.name, f'object inside {p.name}')
	bpy.context.view_layer.update()
	root = bpy.data.objects.new(name, None)
	sc.collection.objects.link(root)
	tops = [ob for ob in new if ob.parent is None]
	if o.get('fit'):
		# centre the model on its bounding box and scale its largest side to «fit» units
		cs = [ob.matrix_world @ Vector(c) for ob in new if ob.type == 'MESH' for c in ob.bound_box]
		if cs:
			lo = Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs)))
			hi = Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))
			s = float(o['fit']) / max(1e-6, max(hi - lo))
			fix = Matrix.Scale(s, 4) @ Matrix.Translation(-(lo + hi) / 2)
			for ob in tops:
				ob.matrix_world = fix @ ob.matrix_world
	for ob in tops:
		ob.parent = root
		ob.matrix_parent_inverse = Matrix.Identity(4)
	if o.get('material'):
		mat = get_mat(o['material'], name)
		for ob in new:
			if ob.type == 'MESH':
				ob.data.materials.clear()
				ob.data.materials.append(mat)
	return root, [ob for ob in new if ob.type in ('MESH', 'CURVE', 'FONT')]


RENDERABLE = []        # (object, spec) pairs that count for the camera «fill» and the probe
for idx, o in enumerate(S.get('objects', [])):
	t = o.get('type')
	name = o.get('name') or f'{t}_{idx}'
	check_keys(o, OBJ, f'object {name}')
	name_guard(name, 'object name')
	if name in OBJS:
		die(f'object name «{name}» used twice')
	parts = None
	if t == 'cube':
		bpy.ops.mesh.primitive_cube_add(size=float(o.get('size', 2)))
	elif t == 'sphere':
		bpy.ops.mesh.primitive_uv_sphere_add(radius=float(o.get('radius', 1)), segments=int(o.get('segments', 96)), ring_count=int(o.get('rings', 48)))
	elif t == 'ico':
		bpy.ops.mesh.primitive_ico_sphere_add(radius=float(o.get('radius', 1)), subdivisions=int(o.get('subdiv', 4)))
	elif t == 'cylinder':
		bpy.ops.mesh.primitive_cylinder_add(radius=float(o.get('radius', 1)), depth=float(o.get('depth', 2)), vertices=int(o.get('vertices', 128)))
	elif t == 'cone':
		bpy.ops.mesh.primitive_cone_add(radius1=float(o.get('radius1', 1)), radius2=float(o.get('radius2', 0)), depth=float(o.get('depth', 2)), vertices=int(o.get('vertices', 128)))
	elif t == 'torus':
		bpy.ops.mesh.primitive_torus_add(major_radius=float(o.get('major', 1)), minor_radius=float(o.get('minor', 0.25)), major_segments=int(o.get('segments', 128)), minor_segments=int(o.get('rings', 24)))
	elif t == 'plane':
		bpy.ops.mesh.primitive_plane_add(size=float(o.get('size', 2)))
	elif t == 'star':
		me = star_mesh(name, int(o.get('points', 5)), float(o.get('outer', 1)), float(o.get('inner', 0.42)), float(o.get('depth', 0.1)))
		ob = bpy.data.objects.new(name, me)
		sc.collection.objects.link(ob)
		bpy.context.view_layer.objects.active = ob
	elif t == 'text':
		cu = bpy.data.curves.new(name, 'FONT')
		cu.body = str(o.get('body', 'TEXT'))
		font = o.get('font', 'public/fonts/Anton-Regular.ttf' if (ROOT / 'public/fonts/Anton-Regular.ttf').exists() else None)
		if font:
			cu.font = bpy.data.fonts.load(str(resolve(font, 'font', o)))
		cu.size = float(o.get('size', 1))
		cu.extrude = float(o.get('extrude', 0.05))        # thickness = 2 × extrude (both sides of the letter plane)
		cu.bevel_depth = float(o.get('text_bevel', 0))
		cu.align_x = {'left': 'LEFT', 'center': 'CENTER', 'right': 'RIGHT'}[o.get('align', 'center')]
		cu.align_y = 'CENTER'
		ob = bpy.data.objects.new(name, cu)
		sc.collection.objects.link(ob)
		bpy.context.view_layer.objects.active = ob
	elif t == 'model':
		ob, parts = import_model(o, name)
	elif t == 'empty':
		ob = bpy.data.objects.new(name, None)
		sc.collection.objects.link(ob)
	else:
		die(f'object {name}: type «{t}» — cube sphere ico cylinder cone torus plane star text model empty')
	if t not in ('star', 'text', 'model', 'empty'):
		ob = bpy.context.active_object
		ob.name = name
		ob.data.name = name
	ob.location = vec3(o.get('location'))
	ob.rotation_euler = [math.radians(x) for x in o.get('rotation', [0, 0, 0])]
	ob.scale = vec3(o.get('scale'), (1, 1, 1))
	if t not in ('model', 'empty'):
		ob.data.materials.append(get_mat(o.get('material'), name))
	if ob.type == 'MESH' and o.get('smooth', t in DEFAULT_SMOOTH):
		ob.data.shade_smooth()
		ob.data.set_sharp_from_angle(angle=math.radians(float(o.get('smooth_angle', 35))))
	if o.get('bevel') and ob.type in ('MESH', 'FONT'):
		if ob.type == 'FONT':
			ob.data.bevel_depth = float(o['bevel'])
		else:
			bv = ob.modifiers.new('Bevel', 'BEVEL')
			bv.width = float(o['bevel'])
			bv.segments = int(o.get('bevel_segments', 3))
			bv.limit_method = 'ANGLE'
	if o.get('outline'):
		# inverted hull: a shell pushed outward with flipped normals and back-face culling = a drawn contour line
		# (width in world units: divided by the object's own world scale, so a «fit» model gets the same line as a primitive)
		targets = parts if parts else [ob]
		om = outline_mat(o.get('outline_color', '#120818'))
		bpy.context.view_layer.update()
		for tob in targets:
			if tob.type not in ('MESH', 'FONT', 'CURVE'):
				continue
			tob.data.materials.append(om)
			if tob.type == 'MESH':
				# low-poly downloads have split vertices per face: weld them first, or the shell breaks into loose shards
				wd = tob.modifiers.new('OutlineWeld', 'WELD')
				wd.merge_threshold = 1e-4 * max(1e-6, max(tob.dimensions) / max(1e-6, max(abs(x) for x in tob.matrix_world.to_scale())))
			ws = sum(abs(x) for x in tob.matrix_world.to_scale()) / 3
			so = tob.modifiers.new('Outline', 'SOLIDIFY')
			so.thickness = float(o['outline']) / max(1e-6, ws)
			so.use_quality_normals = True
			so.offset = 1
			so.use_flip_normals = True
			so.use_rim = False
			so.material_offset = len(tob.data.materials) - 1
	if o.get('catcher'):
		if ENGINE == 'cycles':
			ob.is_shadow_catcher = True
		else:
			warn(f'{name}: shadow catcher works only with "engine": "cycles" — hidden in EEVEE')
			ob.hide_render = True
	if o.get('holdout'):
		ob.is_holdout = True
	if o.get('hidden'):
		ob.hide_render = True
	OBJS[name] = ob
	SPECS[name] = o
	if not o.get('hidden') and not o.get('catcher'):          # helpers and the shadow floor do not count for «fill» / probe
		for r in (parts if parts else [ob]):
			if r.type in ('MESH', 'FONT', 'CURVE'):
				RENDERABLE.append(r)

for name, o in SPECS.items():
	if o.get('parent'):
		if o['parent'] not in OBJS:
			die(f'{name}: parent «{o["parent"]}» does not exist (parents are object names)')
		OBJS[name].parent = OBJS[o['parent']]
		OBJS[name].matrix_parent_inverse = Matrix.Identity(4)   # location / rotation are in the parent's space


# ------------------------------------------------------------------ animation (every frame keyed: exact easing, loop-safe)
def track(keys, prop, f):
	pts = [(k['f'], k[prop], k.get('ease', 'inout')) for k in keys if prop in k]
	if not pts:
		return None
	pts.sort(key=lambda p: p[0])
	if f <= pts[0][0]:
		return Vector(pts[0][1]) if isinstance(pts[0][1], list) else pts[0][1]
	for (fa, va, _), (fb, vb, eb) in zip(pts, pts[1:]):
		if fa <= f <= fb:
			u = ease(eb, (f - fa) / max(1e-6, fb - fa))
			if isinstance(va, list):
				return Vector(va).lerp(Vector(vb), u)
			return va + (vb - va) * u
	return Vector(pts[-1][1]) if isinstance(pts[-1][1], list) else pts[-1][1]


AX = {'x': 0, 'y': 1, 'z': 2}
for name, o in SPECS.items():
	keys, spins, bob = o.get('keys', []), o.get('spin', []), o.get('bob')
	if isinstance(spins, dict):
		spins = [spins]
	if not keys and not spins and not bob:
		continue
	for k in keys:
		if 'f' not in k:
			die(f'{name}: every key needs "f" (frame 1…{NF})')
	ob = OBJS[name]
	base_loc, base_rot, base_scale = Vector(ob.location), Vector(ob.rotation_euler), Vector(ob.scale)
	for f in range(1, NF + 1):
		loc = track(keys, 'location', f)
		rot = track(keys, 'rotation', f)
		scl = track(keys, 'scale', f)
		loc = Vector(loc) if loc is not None else Vector(base_loc)
		rot = Vector([math.radians(x) for x in rot]) if rot is not None else Vector(base_rot)
		scl = (Vector((scl,) * 3) if isinstance(scl, (int, float)) else Vector(scl)) if scl is not None else Vector(base_scale)
		for sp in spins:
			f0, f1 = sp.get('f0', 1), sp.get('f1', NF + (1 if LOOP else 0))
			u = (f - f0) / max(1e-6, f1 - f0) if not LOOP or 'f0' in sp or 'f1' in sp else prog(f)
			rot[AX[sp.get('axis', 'z')]] += math.radians(float(sp.get('start', 0)) + 360 * float(sp.get('turns', 1)) * ease(sp.get('ease', 'linear'), u))
		if bob:
			amp, turns = float(bob.get('amp', 0.05)), float(bob.get('turns', 1))
			loc[AX[bob.get('axis', 'z')]] += amp * math.sin(2 * math.pi * turns * prog(f))
		ob.location, ob.rotation_euler, ob.scale = loc, rot, scl
		ob.keyframe_insert('location', frame=f)
		ob.keyframe_insert('rotation_euler', frame=f)
		ob.keyframe_insert('scale', frame=f)

# ------------------------------------------------------------------ camera
C = S.get('camera', {})
check_keys(C, CAM, 'camera')
cd = bpy.data.cameras.new('Cam')
cd.lens = float(C.get('lens', 50))           # mm on a 36 mm sensor that spans the LONG side of the frame
cd.sensor_fit = 'AUTO'
cd.clip_start, cd.clip_end = (C.get('clip') or [0.01, 1000])
if C.get('ortho'):
	cd.type = 'ORTHO'
	cd.ortho_scale = float(C['ortho'])
cam = bpy.data.objects.new('Cam', cd)
sc.collection.objects.link(cam)
sc.camera = cam
cam.rotation_mode = 'QUATERNION'


def cam_path(f, k_dist=1.0):
	"""camera location and target at frame f; k_dist scales every distance to the target (camera «fill»)"""
	u = ease(C.get('ease', 'inout'), prog(f))
	tgt = vec3(C.get('target'))
	if C.get('target_to'):
		tgt = tgt.lerp(vec3(C['target_to']), u)
	if C.get('orbit'):
		ob_ = C['orbit']
		r = ob_.get('radius', 6)
		r = r[0] + (r[1] - r[0]) * u if isinstance(r, list) else r
		uo = ease(ob_.get('ease', C.get('ease', 'inout')), prog(f))     # "linear" for a seamless 360° loop orbit
		az = math.radians(ob_.get('from', 0) + (ob_.get('to', ob_.get('from', 0)) - ob_.get('from', 0)) * uo)
		el = ob_.get('elev', 10)
		el = math.radians(el[0] + (el[1] - el[0]) * u if isinstance(el, list) else el)
		off = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * r
	else:
		a = vec3(C.get('location'), (0, -6, 0.8))
		b = vec3(C['to']) if C.get('to') else a
		off = a.lerp(b, u) - tgt
	return tgt + off * k_dist, tgt


def scene_radius(center):
	bpy.context.view_layer.update()
	dg = bpy.context.evaluated_depsgraph_get()
	r = 0.0
	for ob in RENDERABLE:
		ev = ob.evaluated_get(dg)
		mw = ev.matrix_world
		try:
			me = ev.to_mesh()                     # exact vertices (bounding-box corners overshoot round things by ~40 %)
			pts = [mw @ v.co for v in me.vertices]
			ev.to_mesh_clear()
		except RuntimeError:
			pts = []
		for p in pts or [mw @ Vector(c) for c in ev.bound_box]:
			r = max(r, (p - center).length)
	return r


K_DIST = 1.0
if C.get('fill'):
	# scale the camera distance so the scene's bounding sphere (at frame fill_at) fills «fill» of the frame's short side
	fa = int(C.get('fill_at', NF))                # measured at the rest pose (last frame: after pop-ins / fly-ins)
	sc.frame_set(fa)
	loc1, tgt1 = cam_path(fa)
	R = scene_radius(tgt1)
	fill = float(C['fill'])
	short_over_long = min(W_, H_) / max(W_, H_)
	if cd.type == 'ORTHO':
		cd.ortho_scale = 2 * R / fill / short_over_long
	elif R > 0:
		tan_s = 18 / cd.lens * short_over_long
		need = R * math.sqrt(1 + 1 / (fill * tan_s) ** 2)
		K_DIST = need / max(1e-6, (loc1 - tgt1).length)
		print(f'camera fill {fill}: scene radius {R:.3f} → distance {need:.3f} (× {K_DIST:.3f})')
if C.get('dof'):
	dof = C['dof']
	cd.dof.use_dof = True
	cd.dof.aperture_fstop = float(dof.get('fstop', 2.8))
	fo = dof.get('focus')
	if isinstance(fo, str):
		cd.dof.focus_object = OBJS[fo]
	elif fo is not None:
		cd.dof.focus_distance = float(fo)
prev_q = None
for f in range(1, NF + 1):
	loc, tgt = cam_path(f, K_DIST)
	q = (tgt - loc).to_track_quat('-Z', 'Y')
	roll = C.get('roll', 0)
	roll = roll[0] + (roll[1] - roll[0]) * ease(C.get('ease', 'inout'), prog(f)) if isinstance(roll, list) else roll
	if roll:
		q = q @ Matrix.Rotation(math.radians(roll), 4, 'Z').to_quaternion()
	if prev_q is not None and prev_q.dot(q) < 0:
		q.negate()                                # keep the quaternion on one hemisphere (no flips under motion blur)
	prev_q = q.copy()
	cam.location, cam.rotation_quaternion = loc, q
	cam.keyframe_insert('location', frame=f)
	cam.keyframe_insert('rotation_quaternion', frame=f)

# ------------------------------------------------------------------ lights
sc.frame_set(1)
R_SCENE = scene_radius(vec3(C.get('target'))) or 1.0
LIGHTS = S.get('lights', 'studio')
if LIGHTS == 'studio':
	# key / rim / fill around the scene, sized to its bounding radius (works for a 1-unit coin and a 40-unit model alike)
	k = R_SCENE
	LIGHTS = [
		{'type': 'area', 'location': [-3 * k, -4 * k, 4 * k], 'energy': 900 * k * k, 'size': 3 * k},
		{'type': 'area', 'location': [4 * k, 4 * k, 2.5 * k], 'energy': 700 * k * k, 'size': 2 * k},
		{'type': 'area', 'location': [5 * k, -3 * k, -1 * k], 'energy': 160 * k * k, 'size': 4 * k},
	]
for n, L in enumerate(LIGHTS):
	check_keys(L, LIGHT, f'light {n}')
	kind = L.get('type', 'area').upper()
	ld = bpy.data.lights.new(f'L{n}', type=kind)
	ld.energy = float(L.get('energy', 3 if kind == 'SUN' else 500))
	ld.color = srgb(L.get('color', '#ffffff'))[:3]
	if kind == 'AREA':
		ld.shape = 'DISK'
		ld.size = float(L.get('size', 2))
	elif kind == 'SUN':
		ld.angle = math.radians(float(L.get('angle', 3)))
	else:
		ld.shadow_soft_size = float(L.get('radius', 0.25))
		if kind == 'SPOT':
			ld.spot_size = math.radians(float(L.get('cone', 45)))
			ld.spot_blend = float(L.get('blend', 0.3))
	lo = bpy.data.objects.new(f'L{n}', ld)
	sc.collection.objects.link(lo)
	lo.location = vec3(L.get('location'), (0, -4, 4))
	if 'rotation' in L:
		lo.rotation_euler = [math.radians(x) for x in L['rotation']]
	else:
		lo.rotation_euler = (vec3(L.get('target')) - lo.location).to_track_quat('-Z', 'Y').to_euler()


# ------------------------------------------------------------------ probe: where every object lands on screen
def probe():
	sc.render.resolution_percentage = 100
	for f in sorted({1, (NF + 1) // 2, NF}):
		sc.frame_set(f)
		dg = bpy.context.evaluated_depsgraph_get()
		print(f'— frame {f}: camera {tuple(round(x, 2) for x in cam.matrix_world.translation)}')
		allx, ally = [], []
		for ob in RENDERABLE:
			ev = ob.evaluated_get(dg)
			ps = [world_to_camera_view(sc, cam, ev.matrix_world @ Vector(c)) for c in ev.bound_box]
			xs, ys = [p.x * W_ for p in ps], [(1 - p.y) * H_ for p in ps]
			allx += xs; ally += ys
			flag = '' if min(xs) >= 0 and max(xs) <= W_ and min(ys) >= 0 and max(ys) <= H_ and min(p.z for p in ps) > 0 else '  ← leaves the frame'
			print(f'   {ob.name:<20} x {min(xs):7.0f} … {max(xs):7.0f}   y {min(ys):7.0f} … {max(ys):7.0f}{flag}')
		if allx:
			print(f'   {"(all)":<20} x {min(allx):7.0f} … {max(allx):7.0f}   y {min(ally):7.0f} … {max(ally):7.0f}   of {W_}×{H_}')


if OPT.get('save'):
	bpy.ops.wm.save_as_mainfile(filepath=str(Path(OPT['save']).resolve()))
	print('saved', OPT['save'])
if OPT.get('probe'):
	probe()
	sys.exit(0)

# ------------------------------------------------------------------ render
DONE = [0]


def on_post(scene, *_):
	DONE[0] += 1
	print(f'  frame {scene.frame_current}/{NF}  {time.time() - T_START:.1f} s', flush=True)


bpy.app.handlers.render_post.append(on_post)
if FRAMES:
	OUT = Path(OPT['out']).resolve() if OPT.get('out') else ROOT / 'out/3d_preview' / NAME
	OUT.mkdir(parents=True, exist_ok=True)
	for f in FRAMES:
		sc.frame_set(f)
		sc.render.filepath = str(OUT / f'f_{f:04d}.{EXT}')
		bpy.ops.render.render(write_still=True)
	print(f'shot {NAME}: {len(FRAMES)} test frame(s) → {OUT}  ({time.time() - T_START:.1f} s)')
	sys.exit(0)

OUT = Path(OPT['out']).resolve() if OPT.get('out') else ROOT / 'public/3d' / NAME
PART = OUT.with_name(OUT.name + '.part')
shutil.rmtree(PART, ignore_errors=True)
PART.mkdir(parents=True)
sc.render.filepath = str(PART / 'f_')          # Blender appends the 4-digit frame: f_0001.png … (the ImgSeq naming)
sc.render.use_file_extension = True
bpy.ops.render.render(animation=True)
files = sorted(PART.glob(f'f_*.{EXT}'))
if len(files) != NF:
	die(f'{len(files)} of {NF} frames rendered — {PART} kept for inspection, {OUT} unchanged')
meta = {
	'name': NAME, 'fps': FPS, 'frames': NF, 'loop': LOOP, 'ext': EXT,
	'size': [W_, H_],                                              # logical size in the 1080 × 1920 Short frame
	'width': round(W_ * PCT / 100), 'height': round(H_ * PCT / 100),   # pixels of the PNGs
	'engine': ENGINE, 'samples': SAMPLES, 'device': DEVICE, 'transparent': bool(S.get('transparent', True)),
	'spec': os.path.relpath(SPEC_PATH, ROOT) if str(SPEC_PATH).startswith(str(ROOT) + os.sep) else str(SPEC_PATH), 'spec_sha1': hashlib.sha1(SPEC_TXT.encode()).hexdigest(),
	'sources': SOURCES, 'blender': bpy.app.version_string,
	'rendered': time.strftime('%Y-%m-%d %H:%M:%S'), 'seconds': round(time.time() - T_START, 1),
	'spec_data': S,
}
(PART / 'meta.json').write_text(json.dumps(meta, indent=1, ensure_ascii=False))
if OUT.exists():
	shutil.rmtree(OUT)
PART.rename(OUT)
SHOWN = os.path.relpath(OUT, ROOT) if str(OUT).startswith(str(ROOT) + os.sep) else str(OUT)
print(f'shot {NAME}: {NF} frames → {SHOWN}  ({meta["seconds"]} s, {DEVICE})')
print(f'  in a scene: <Clip3D name="{NAME}" t0={{W(…)}} …/>   CREDITS.md: `3d/{NAME}` — own Blender render ({meta["spec"]})'
	+ (' + ' + ', '.join(f'{s["file"]} ({s["license"]})' for s in SOURCES) if SOURCES else ''))
sys.exit(0)
