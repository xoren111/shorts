"""Shared toon kit for the «Australia vs Rabbits» Blender shots (style of «Humans vs Volcano» v5: violet dusk sky, flat
3-band toon shading on an emission output, Standard view transform, dark ink outlines by inverted hull, cream puff clouds).
Every shot script does:  from kit import *  →  setup(...) → build the set → render(update) where update(t) poses everything
for the absolute VO time t (seconds, data/words.json). Models: CC0 Kenney/Quaternius kits (assets/cc0 of the volcano project).
"""
import bpy, bmesh, json, math, sys, time
from pathlib import Path
import numpy as np
from mathutils import Vector, Euler, Matrix

ROOT = Path(__file__).resolve().parents[2]
CC0 = Path.home() / 'shorts/atlas-ape/volcano/short/assets/cc0'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
	return argv[argv.index('--' + name) + 1] if '--' + name in argv else default
def flag(name):
	return '--' + name in argv

words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']
We = lambda i: words[i]['e']
FPS = 60
INK = (0.035, 0.02, 0.06)

def C(h):
	"""'#rrggbb' (display sRGB) → linear RGB tuple for emission colours (Standard view transform re-encodes to sRGB)"""
	h = h.lstrip('#'); v = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
	return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in v)
def clamp01(x): return max(0.0, min(1.0, x))
def lerp(a, b, k): return a + (b - a) * k
def ease(x):
	x = clamp01(x)
	return 4 * x * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
def easeOut(x): return 1 - (1 - clamp01(x)) ** 3
def easeIn(x): return clamp01(x) ** 3
def smooth(x):
	x = clamp01(x); return x * x * (3 - 2 * x)
def vlerp(a, b, k): return Vector(a).lerp(Vector(b), k)
def h1(n):
	s = math.sin(n * 127.1 + 311.7) * 43758.5453
	return s - math.floor(s)

sc = None
def setup(t0, t1, scale=None, samples=None):
	"""empty scene, EEVEE, 1080×1920 @60 fps for the shot [t0, t1] (absolute VO seconds)"""
	global sc, T0, T1, NF
	T0, T1 = t0, t1
	NF = int(round((t1 - t0) * FPS))
	bpy.ops.wm.read_factory_settings(use_empty=True)
	sc = bpy.context.scene
	sc.render.engine = 'BLENDER_EEVEE'
	sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
	sc.render.resolution_percentage = int(scale or arg('scale', 100))
	sc.render.fps = FPS
	sc.frame_start, sc.frame_end = 1, NF
	sc.render.image_settings.file_format = 'PNG'
	sc.render.image_settings.color_mode = 'RGB'
	sc.render.film_transparent = False
	sc.render.filter_size = 1.0
	sc.view_settings.view_transform = 'Standard'
	sc.view_settings.look = 'None'
	sc.eevee.taa_render_samples = int(samples or arg('samples', 24))
	try:
		sc.eevee.use_shadows = True
	except Exception:
		pass
	return sc

# ------------------------------------------------------------------ node helpers (as in volcano etna_toon.py)
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
def EMIT(nt, col, out_node):
	e_ = nt.nodes.new('ShaderNodeEmission'); put(nt, e_.inputs['Color'], col); e_.inputs['Strength'].default_value = 1.0
	link(nt, e_.outputs[0], out_node.inputs['Surface'])
	return e_

# light bands (lit / mid / shadow) — thresholds on the Shader-to-RGB luminance of a white diffuse surface
B1, B2 = float(arg('b1', 0.55)), float(arg('b2', 0.95))
SHADOW, MID, LIT = (0.52, 0.42, 0.64), (0.84, 0.76, 0.86), (1.0, 0.97, 0.92)
def toon(nt, shadow=SHADOW, mid=MID, lit=LIT):
	d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (1, 1, 1, 1)
	s2r = nt.nodes.new('ShaderNodeShaderToRGB'); link(nt, d.outputs[0], s2r.inputs[0])
	bw = nt.nodes.new('ShaderNodeRGBToBW'); link(nt, s2r.outputs['Color'], bw.inputs[0])
	return RAMP(nt, bw.outputs[0], [(0.0, shadow), (B1, mid), (B2, lit)])

_mats = {}
def toon_mat(name, color, tex=None, bands=None, flat=False):
	"""base colour (RGB tuple, or an image path / bpy image in tex) × 3-band toon light → emission. flat=True: no light."""
	key = (name, color if not isinstance(color, list) else tuple(color), str(tex), flat)
	if key in _mats: return _mats[key]
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0))
	base = color
	if tex is not None:
		ti = node(nt, 'ShaderNodeTexImage', (-600, 0))
		ti.image = tex if not isinstance(tex, (str, Path)) else bpy.data.images.load(str(tex), check_existing=True)
		ti.interpolation = 'Closest'
		base = ti.outputs['Color']
	if flat:
		EMIT(nt, base, out)
	else:
		band = toon(nt, *(bands or (SHADOW, MID, LIT)))
		EMIT(nt, MIX(nt, 1.0, base, band, 'MULTIPLY'), out)
	_mats[key] = m
	return m

_ink = None
def ink_mat():
	global _ink
	if _ink: return _ink
	_ink = bpy.data.materials.new('ink'); _ink.use_nodes = True; _ink.use_backface_culling = True
	nt = _ink.node_tree; nt.nodes.clear()
	EMIT(nt, INK, node(nt, 'ShaderNodeOutputMaterial', (300, 0)))
	return _ink

def outline(o, w):
	"""inverted-hull ink outline of width w (world units) via a Solidify modifier (flipped normals). The shell faces use
	material index + n (n = number of real materials), so n ink slots are appended after the real ones."""
	if o.type != 'MESH' or w <= 0: return
	n = len([s for s in o.material_slots if s.material and s.material.name != 'ink']) or 1
	if not o.material_slots:
		o.data.materials.append(toon_mat('grey', (0.8, 0.8, 0.8)))
	for _ in range(n):
		o.data.materials.append(ink_mat())
	md = o.modifiers.new('ink', 'SOLIDIFY')
	md.thickness = w; md.offset = 1.0; md.use_flip_normals = True; md.use_rim = False
	md.material_offset = n
	md.use_even_offset = False
	return md

def obj_from_mesh(name, me, mat=None, loc=(0, 0, 0), parent=None):
	o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
	if mat is not None: o.data.materials.append(mat)
	o.location = loc
	if parent: o.parent = parent
	return o

def prim(kind, name, mat, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), smooth_=True, ink=None, parent=None, **kw):
	"""primitive mesh with toon material and optional ink outline width"""
	bm = bmesh.new()
	if kind == 'sphere':
		bmesh.ops.create_uvsphere(bm, u_segments=kw.get('u', 24), v_segments=kw.get('v', 16), radius=1.0)
	elif kind == 'ico':
		bmesh.ops.create_icosphere(bm, subdivisions=kw.get('sub', 3), radius=1.0)
	elif kind == 'cube':
		bmesh.ops.create_cube(bm, size=2.0)
	elif kind == 'cyl':
		bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=kw.get('seg', 24), radius1=1.0, radius2=kw.get('r2', 1.0), depth=2.0)
	elif kind == 'plane':
		bmesh.ops.create_grid(bm, x_segments=kw.get('xs', 1), y_segments=kw.get('ys', 1), size=1.0)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	if smooth_:
		me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	o = obj_from_mesh(name, me, mat, loc, parent)
	o.scale = scale; o.rotation_euler = rot
	if ink: outline(o, ink)
	return o

def empty(name, loc=(0, 0, 0), parent=None):
	o = bpy.data.objects.new(name, None); sc.collection.objects.link(o); o.location = loc
	if parent: o.parent = parent
	return o

# ------------------------------------------------------------------ world, sun
SKY_DUSK = [(0.0, (1.0, 0.70, 0.48)), (0.08, (1.0, 0.45, 0.55)), (0.2, (0.80, 0.30, 0.66)), (0.36, (0.40, 0.18, 0.62)), (0.62, (0.14, 0.08, 0.38))]
SKY_GOLD = [(0.0, (1.0, 0.86, 0.55)), (0.1, (1.0, 0.66, 0.50)), (0.24, (0.92, 0.48, 0.70)), (0.42, (0.56, 0.36, 0.78)), (0.66, (0.30, 0.22, 0.62))]
SKY_NIGHT = [(0.0, (0.55, 0.36, 0.70)), (0.12, (0.32, 0.20, 0.58)), (0.34, (0.16, 0.10, 0.40)), (0.62, (0.06, 0.04, 0.18))]
def world(stops=SKY_DUSK, strength=1.0):
	wd = bpy.data.worlds.new('sky'); sc.world = wd; wd.use_nodes = True
	nt = wd.node_tree; nt.nodes.clear()
	wo = node(nt, 'ShaderNodeOutputWorld', (600, 0))
	tc = node(nt, 'ShaderNodeTexCoord', (-600, 0))
	sep = node(nt, 'ShaderNodeSeparateXYZ', (-400, 0)); link(nt, tc.outputs['Generated'], sep.inputs['Vector'])
	col = RAMP(nt, sep.outputs['Z'], stops, interp='LINEAR')
	bg = node(nt, 'ShaderNodeBackground', (200, 0)); link(nt, col, bg.inputs['Color']); bg.inputs['Strength'].default_value = strength
	link(nt, bg.outputs[0], wo.inputs['Surface'])
	return wd

def sun(energy=4.0, color=(1.0, 0.86, 0.62), rot=(58, 0, 20)):
	d = bpy.data.lights.new('sun', 'SUN'); d.energy = energy; d.color = color; d.angle = math.radians(0.5)
	o = bpy.data.objects.new('sun', d); sc.collection.objects.link(o)
	o.rotation_euler = tuple(math.radians(a) for a in rot)
	return o

# ------------------------------------------------------------------ camera
def camera(lens=30):
	cd = bpy.data.cameras.new('cam'); cd.lens = lens; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 36
	cd.clip_start = 0.02; cd.clip_end = 2000
	cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam
	return cam
def look(cam, pos, target, roll=0.0):
	cam.location = Vector(pos)
	d = Vector(target) - Vector(pos)
	q = d.to_track_quat('-Z', 'Y')
	cam.rotation_euler = q.to_euler()
	if roll:
		cam.rotation_euler.rotate_axis('Z', math.radians(roll))

# ------------------------------------------------------------------ clouds (cream puffs)
CREAM = ((0.78, 0.62, 0.78), (0.98, 0.88, 0.86), (1.0, 0.98, 0.93))
def cloud(name, centre, size, n=7, seed=1, ink=None):
	mat = toon_mat('cloud', (1, 1, 1), bands=CREAM)
	rng = np.random.default_rng(seed)
	root = empty(name, centre)
	for k in range(n):
		a = k / max(1, n - 1)
		x = (a - 0.5) * size * 2.2 + rng.normal() * size * 0.12
		z = math.sin(a * math.pi) * size * 0.45 + rng.random() * size * 0.2
		r = size * (0.45 + 0.4 * math.sin(a * math.pi) + 0.15 * rng.random())
		prim('ico', f'{name}_{k}', mat, (x, rng.normal() * size * 0.1, z), (r, r, r * 0.92), ink=ink, parent=root)
	return root

# ------------------------------------------------------------------ rabbit (procedural, toon) — wild European rabbit colours
FUR = C('#a26f47')
FUR_DARK = C('#6a4329')
BELLY = C('#f3e3c9')
def rabbit_parts(name, fur=FUR, ink_w=0.012, parent=None, lod=1.0):
	"""a sitting rabbit ≈ 0.42 tall (body length ≈ 0.4) built from spheres; returns dict of part objects under a root empty.
	Root origin on the ground between the hind feet, facing +Y."""
	root = empty(name, parent=parent)
	mf = toon_mat('fur', fur); mb = toon_mat('belly', BELLY); md = toon_mat('fur_dark', FUR_DARK)
	me = toon_mat('eye', (0.03, 0.02, 0.04), flat=True); mw = toon_mat('eyehl', (1, 1, 1), flat=True); mn = toon_mat('nose', C('#f08aa0'))
	mi = toon_mat('earin', C('#f4a9b4'))
	P = {}
	_prim = globals()['prim']
	def prim(*a, **kw):
		if lod < 1.0 and a[0] == 'sphere':
			kw.setdefault('u', max(8, int(24 * lod))); kw.setdefault('v', max(6, int(16 * lod)))
		return _prim(*a, **kw)
	P['body'] = prim('sphere', name + '_body', mf, (0, -0.02, 0.15), (0.15, 0.2, 0.15), ink=ink_w, parent=root)
	P['chest'] = prim('sphere', name + '_chest', mb, (0, 0.09, 0.15), (0.095, 0.08, 0.11), ink=None, parent=root)
	P['head'] = empty(name + '_headpivot', (0, 0.13, 0.27), parent=root)
	prim('sphere', name + '_head', mf, (0, 0.04, 0.03), (0.1, 0.11, 0.095), ink=ink_w, parent=P['head'])
	prim('sphere', name + '_cheeks', mb, (0, 0.11, -0.005), (0.06, 0.04, 0.045), parent=P['head'])
	prim('sphere', name + '_nose', mn, (0, 0.152, 0.012), (0.014, 0.01, 0.01), parent=P['head'])
	for s in (-1, 1):
		prim('sphere', f'{name}_eye{s}', me, (s * 0.062, 0.095, 0.045), (0.022, 0.018, 0.026), smooth_=True, parent=P['head'])
		prim('sphere', f'{name}_hl{s}', mw, (s * 0.07, 0.112, 0.06), (0.007, 0.004, 0.007), parent=P['head'])
		ear = empty(f'{name}_ear{s}', (s * 0.035, 0.0, 0.07), parent=P['head'])
		ear.rotation_euler = (math.radians(-12), math.radians(s * 14), 0)
		prim('sphere', f'{name}_earo{s}', mf, (0, 0, 0.1), (0.032, 0.018, 0.105), ink=ink_w * 0.8, parent=ear)
		prim('sphere', f'{name}_eari{s}', mi, (0, 0.012, 0.1), (0.019, 0.01, 0.08), parent=ear)
		P[f'ear{s}'] = ear
		paw = prim('sphere', f'{name}_paw{s}', mf, (s * 0.06, 0.15, 0.03), (0.03, 0.05, 0.03), ink=ink_w * 0.8, parent=root)
		P[f'paw{s}'] = paw
		prim('sphere', f'{name}_hind{s}', mf, (s * 0.1, 0.0, 0.025), (0.045, 0.11, 0.035), ink=ink_w * 0.8, parent=root)
	P['tail'] = prim('sphere', name + '_tail', toon_mat('tail', (1, 1, 1), bands=CREAM), (0, -0.21, 0.13), (0.045, 0.04, 0.045), ink=ink_w * 0.8, parent=root)
	P['root'] = root
	return P

_rabbit_proto = None
def rabbit_proto(fur=FUR):
	"""one joined static rabbit mesh (for crowds: linked duplicates share it)"""
	global _rabbit_proto
	if _rabbit_proto: return _rabbit_proto
	P = rabbit_parts('proto', fur=fur, ink_w=0.0)
	objs = [o for o in bpy.data.objects if o.name.startswith('proto') and o.type == 'MESH']
	bpy.ops.object.select_all(action='DESELECT')
	for o in objs:
		o.select_set(True)
	bpy.context.view_layer.objects.active = objs[0]
	# apply parent transforms before joining
	for o in objs:
		mw_ = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw_
	bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
	bpy.ops.object.join()
	j = bpy.context.view_layer.objects.active
	j.name = 'rabbit_proto'
	for o in list(bpy.data.objects):
		if o.name.startswith('proto') and o.type == 'EMPTY': bpy.data.objects.remove(o)
	j.location = (0, 0, 0)
	j.hide_render = True; j.hide_viewport = True
	_rabbit_proto = j.data
	return _rabbit_proto

def rabbit_copy(name, loc=(0, 0, 0), rot_z=0.0, s=1.0, ink_w=0.012):
	o = bpy.data.objects.new(name, rabbit_proto()); sc.collection.objects.link(o)
	o.location = loc; o.rotation_euler = (0, 0, rot_z); o.scale = (s, s, s)
	if ink_w: outline(o, ink_w / s)
	return o

def hop(t, period=0.36, height=0.12):
	"""cartoon hop phase: returns (z offset, squash) at time t (s) for a hop cycle"""
	ph = (t / period) % 1.0
	z = height * math.sin(math.pi * ph)
	sq = 1.0 + 0.12 * math.cos(2 * math.pi * ph)
	return z, sq

# ------------------------------------------------------------------ imports (CC0) → toon
def import_model(rel, scale=1.0, loc=(0, 0, 0), rot=(0, 0, 0), name=None, ink=None, tint=None):
	p = CC0 / rel
	before = set(bpy.data.objects)
	if p.suffix == '.glb':
		bpy.ops.import_scene.gltf(filepath=str(p))
	elif p.suffix == '.fbx':
		bpy.ops.import_scene.fbx(filepath=str(p))
	else:
		bpy.ops.wm.obj_import(filepath=str(p))
	new = [o for o in bpy.data.objects if o not in before]
	root = empty(name or p.stem, loc)
	for o in new:
		if o.parent is None:
			o.parent = root
		if o.type == 'MESH':
			toonify(o, tint)
			if ink: outline(o, ink)
	root.scale = (scale, scale, scale); root.rotation_euler = tuple(math.radians(a) for a in rot)
	return root, new

KENNEY_TINT = {'leafsGreen': C('#5f9a4c'), 'leafsDark': C('#3f7a3c'), 'grass': C('#7fa743'), 'woodBark': C('#8a5a3c'),
               'dirt': C('#b8713e'), 'stone': C('#9a8f9e'), 'woodInner': C('#d9b27c'), 'leafsFall': C('#d98a3a')}
def toonify(o, tint=None):
	"""replace imported PBR materials by toon ones (keeps the base colour or the palette texture)"""
	for slot in o.material_slots:
		m = slot.material
		if m is None or m.name == 'ink': continue
		col, tex = (0.8, 0.8, 0.8), None
		if m.use_nodes:
			bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
			if bsdf:
				inp = bsdf.inputs['Base Color']
				if inp.is_linked and inp.links[0].from_node.type == 'TEX_IMAGE':
					tex = inp.links[0].from_node.image
				else:
					col = tuple(inp.default_value)[:3]
		base_name = m.name.split('.')[0]
		if tint and base_name in tint:
			col, tex = tint[base_name], None
		elif base_name in KENNEY_TINT and tex is None:
			col = KENNEY_TINT[base_name]
		slot.material = toon_mat('t_' + m.name, col, tex=tex)

# ------------------------------------------------------------------ render loop / screen tracks
def fr(t):
	return 1 + int(round((t - T0) * FPS))

def render(update, out_rel, track=None):
	"""update(t) poses the scene for absolute time t. Renders frames f_0001…f_NNNN (or --frames 1,60,…) to out/blender/<shot>.
	With --track, writes screen positions of `track` (dict name → callable returning world Vector) per frame."""
	out = ROOT / 'out/blender' / out_rel
	out.mkdir(parents=True, exist_ok=True)
	frames = [int(x) for x in arg('frames').split(',')] if arg('frames') else list(range(1, NF + 1))
	if flag('track') and track:
		from bpy_extras.object_utils import world_to_camera_view
		rows = []
		for f in range(1, NF + 1):
			t = T0 + (f - 1) / FPS
			update(t); bpy.context.view_layer.update()
			row = {}
			for k, fn in track.items():
				c = world_to_camera_view(sc, sc.camera, fn())
				row[k] = [round(c.x * 1080, 1), round((1 - c.y) * 1920, 1)]
			rows.append(row)
		json.dump({'t0': T0, 'fps': FPS, 'frames': rows}, open(out / 'track.json', 'w'))
		print('track', len(rows)); return
	for f in frames:
		if not flag('rerender') and (out / f'f_{f:04d}.png').exists() and (out / f'f_{f:04d}.png').stat().st_size > 0:
			continue                                   # resumable: frames already on disk are kept (pass --rerender to redo)
		t = T0 + (f - 1) / FPS
		update(t)
		sc.frame_set(f)
		t_ = time.time()
		sc.render.filepath = str(out / f'f_{f:04d}.png')
		bpy.ops.render.render(write_still=True)
		print('rendered', f, '%.1fs' % (time.time() - t_), flush=True)
	print('done', len(frames), 'frames; T0', T0, 'T1', T1, 'NF', NF)

# ------------------------------------------------------------------ outback helpers
NK = 'kenney-nature-kit/Models/GLTF format/'
def ground(name, size=200, cols=((0.80, 0.42, 0.22), (0.70, 0.33, 0.18), (0.62, 0.52, 0.26)), scale=0.08, z=0.0, hill=None, res=160):
	"""flat toon ground with crisp colour blobs (noise thresholds, world coords); hill=(cx, cy, r, h) raises a smooth mound"""
	me = bpy.data.meshes.new(name); bm = bmesh.new()
	bmesh.ops.create_grid(bm, x_segments=res, y_segments=res, size=size / 2)
	if hill:
		cx, cy, r, h = hill
		for v in bm.verts:
			d = math.hypot(v.co.x - cx, v.co.y - cy) / r
			if d < 1: v.co.z = h * (math.cos(d * math.pi) + 1) / 2
	bm.to_mesh(me); bm.free()
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry')
	nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 2.0
	link(nt, g.outputs['Position'], nz.inputs['Vector'])
	nz2 = node(nt, 'ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = scale * 3.1; nz2.inputs['Detail'].default_value = 1.0
	link(nt, g.outputs['Position'], nz2.inputs['Vector'])
	a = M(nt, 'GREATER_THAN', nz.outputs['Fac'], 0.55); b = M(nt, 'GREATER_THAN', nz2.outputs['Fac'], 0.62)
	base = MIX(nt, a, cols[0], cols[1]); base = MIX(nt, b, base, cols[2])
	EMIT(nt, MIX(nt, 1.0, base, toon(nt), 'MULTIPLY'), out)
	o = obj_from_mesh(name, me, m, (0, 0, z))
	return o

def scatter(models, n, box, smin=0.8, smax=1.4, seed=1, ink=0.01, avoid=None, z=0.0):
	"""n random CC0 nature models in box=(x0, y0, x1, y1); avoid(x, y) → True skips a spot"""
	rng = np.random.default_rng(seed); placed = []
	tries = 0
	while len(placed) < n and tries < n * 20:
		tries += 1
		x = rng.uniform(box[0], box[2]); y = rng.uniform(box[1], box[3])
		if avoid and avoid(x, y): continue
		m_ = models[rng.integers(len(models))]
		r, _ = import_model(NK + m_, rng.uniform(smin, smax), (x, y, z), (0, 0, rng.uniform(0, 360)), ink=ink)
		placed.append(r)
	return placed

def netting(name, p0, p1, h=1.0, post_gap=3.0, cell=0.09, buried=0.0):
	"""rabbit-proof fence: wooden posts + wire netting (real wire geometry by a Wireframe modifier) from p0 to p1 on z=0"""
	p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
	root = empty(name, p0)
	root.rotation_euler = (0, 0, math.atan2(d.y, d.x))
	wood = toon_mat('post', (0.50, 0.31, 0.17)); wire = toon_mat('wire', (0.80, 0.80, 0.86), bands=((0.45, 0.42, 0.55), (0.75, 0.74, 0.82), (0.95, 0.95, 1.0)))
	npost = max(2, int(L / post_gap) + 1)
	posts = []
	for k in range(npost):
		x = L * k / (npost - 1)
		posts.append(prim('cyl', f'{name}_post{k}', wood, (x, 0, h * 0.55), (0.06, 0.06, h * 0.55), seg=8, ink=0.012, parent=root))
	nx, nz = max(1, int(L / cell)), max(1, int(h / cell))
	bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=nx, y_segments=nz, size=0.5)
	for v in bm.verts:
		v.co = Vector(((v.co.x + 0.5) * L, 0.0, (v.co.y + 0.5) * h - buried))
	me = bpy.data.meshes.new(name + '_net'); bm.to_mesh(me); bm.free()
	net = obj_from_mesh(name + '_net', me, wire, parent=root)
	wf = net.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.008; wf.use_replace = True
	prim('cyl', f'{name}_topwire', wire, (L / 2, 0, h), (0.008, 0.008, L / 2), seg=6, rot=(0, math.pi / 2, 0), parent=root)
	return root, posts, net

def rabbit_crowd(points, s=1.0, ink_w=0.012, lod=0.5, seed=0):
	"""many static sitting rabbits as collection instances of one low-poly outlined proto. points: [(x, y, z, yaw), …]"""
	coll = bpy.data.collections.new('crowd_proto')
	P = rabbit_parts('crowdproto', ink_w=0.0, lod=lod)
	objs = [o for o in bpy.data.objects if o.name.startswith('crowdproto') and o.type == 'MESH']
	bpy.ops.object.select_all(action='DESELECT')
	for o in objs:
		mw_ = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw_; o.select_set(True)
	bpy.context.view_layer.objects.active = objs[0]
	bpy.ops.object.join()
	j = bpy.context.view_layer.objects.active; j.name = 'crowd_rabbit'
	for o in list(bpy.data.objects):
		if o.name.startswith('crowdproto') and o.type == 'EMPTY': bpy.data.objects.remove(o)
	if ink_w: outline(j, ink_w)
	for c in list(j.users_collection): c.objects.unlink(j)
	coll.objects.link(j)
	out = []
	for k, (x, y, z, yaw) in enumerate(points):
		e = bpy.data.objects.new(f'crowd{k}', None); e.instance_type = 'COLLECTION'; e.instance_collection = coll
		bpy.context.scene.collection.objects.link(e)
		e.location = (x, y, z); e.rotation_euler = (0, 0, yaw); e.scale = (s, s, s)
		out.append(e)
	return out

def set_visible(o, vis):
	"""hide_render for an object and all its descendants (an Empty's own flag does not hide its children)"""
	o.hide_render = not vis
	for c in o.children_recursive:
		c.hide_render = not vis
