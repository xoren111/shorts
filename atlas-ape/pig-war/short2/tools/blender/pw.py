"""«The Pig War» kit on top of yf2 (lit stylised 3D): Kenney Mini Characters in 1859 uniforms (UV remap into
assets/pw_colormap.png, see tools/make_palette.py), period hats/beards/props bone-parented to the rig, the Berkshire pig
(+ its angel), and render glue. Shot scripts:  from pw import *  → setup2(*SHOT(k)) → build → render2(update, k)."""
import bpy, bmesh, json, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Euler
from kit import *
from yf2 import *
import kit, yf2

PAL = kit.ROOT / 'assets/pw_colormap.png'
SLOT = json.load(open(kit.ROOT / 'assets/pw_colormap.json'))
UPDATERS = []        # callables(t) run every frame after the shot's own update (pigs, wings, flags …)

def render2(update, out_rel, track=None):
	def upd(t):
		update(t)
		tick_v2(t)
		bpy.context.view_layer.update()
		for f in UPDATERS: f(t)
	return kit.render(upd, out_rel, track)

# ====================================================================================================== characters
_palmat = {}
def pal_mat(key='pw'):
	if key in _palmat: return _palmat[key]
	m = bpy.data.materials.new('pal_' + key); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = bpy.data.images.load(str(PAL), check_existing=True); ti.interpolation = 'Closest'
	link(nt, ti.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.62
	try:
		bs.inputs['Sheen Weight'].default_value = 0.25; bs.inputs['Specular IOR Level'].default_value = 0.35
	except Exception: pass
	_palmat[key] = m
	return m

# uniform schemes: part → palette slot (None = keep the Kenney colour)
SCHEMES = {
	'us': {'coat': 'us_coat', 'trouser': 'us_trouser', 'shoe': 'boot'},
	'uk': {'coat': 'uk_coat', 'trouser': 'uk_trouser', 'shoe': 'boot'},
	'farmer': {'coat': 'farmer_shirt', 'trouser': 'farmer_trouser', 'shoe': 'boot'},
	'owner': {'coat': 'tweed', 'trouser': 'tweed_trouser', 'shoe': 'boot'},
	'governor': {'coat': 'gov_coat', 'trouser': 'gov_trouser', 'shoe': 'boot'},
	'admiral': {'coat': 'admiral_coat', 'trouser': 'shirt_white', 'shoe': 'boot'},
	'kaiser': {'coat': 'kaiser_coat', 'trouser': 'gov_coat', 'shoe': 'boot'},
	'sailor': {'coat': 'shirt_white', 'trouser': 'us_coat', 'shoe': 'boot'},
}

def _vgroup_of_face(me, p, names):
	best, bw = None, -1.0
	acc = {}
	for vi in p.vertices:
		for g in me.vertices[vi].groups:
			acc[g.group] = acc.get(g.group, 0.0) + g.weight
	for gi, w in acc.items():
		if w > bw: best, bw = names[gi], w
	return best

def uniform(P, scheme):
	"""remap the body-mesh UVs part by part into our palette: torso + sleeves → coat, legs → trousers, lowest part → boots;
	hands and the head (face, hair) keep their Kenney colours (the same atlas region is copied unchanged into pw_colormap)"""
	S = SCHEMES[scheme] if isinstance(scheme, str) else scheme
	for o in P['meshes']:
		mat = pal_mat()
		o.data.materials.clear(); o.data.materials.append(mat)
		if not o.name.startswith('body'): continue
		me = o.data; names = {i: g.name for i, g in enumerate(o.vertex_groups)}
		uv = me.uv_layers.active.data
		zs = [v.co.z for v in me.vertices]
		for p in me.polygons:
			g = _vgroup_of_face(me, p, names) or ''
			c = p.center
			part = None
			if g.startswith('arm'):
				# sleeves; the hand (outer end of the T-pose arm) keeps its skin colour
				part = None if abs(c.x) > 0.27 else 'coat'
			elif g == 'torso':
				part = 'coat'
			elif g.startswith('leg'):
				part = 'shoe' if c.z < 0.045 else 'trouser'
			if part is None or S.get(part) is None: continue
			bx, by = SLOT[S[part]]
			for li in p.loop_indices:
				u, v = uv[li].uv
				px, py = u * 512.0, (1.0 - v) * 512.0
				ox, oy = px % 64.0, py % 128.0
				uv[li].uv = ((bx * 64 + ox) / 512.0, 1.0 - (by * 128 + oy) / 512.0)
	return P

def char(name, kind='male-b', scheme='us', loc=(0, 0, 0), yaw=0.0, h=0.62, action='idle', speed=1.0, offset=0.0):
	"""a Kenney character in a uniform; faces −Y at yaw 0 (yaw in radians); posed every frame by tick_v2 (its own clip clock)"""
	P = person(name, kind, loc, yaw, h, action, speed, offset)
	P['meshes'] = [o for o in P['root'].children_recursive if o.type == 'MESH']
	for pb in P['arm'].pose.bones:
		pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
	bpy.context.view_layer.update()
	uniform(P, scheme)
	PEOPLE.append(P)
	return P

def head_box(P):
	"""head mesh bounds in ARMATURE space at rest: (min Vector, max Vector)"""
	arm = P['arm']; inv = arm.matrix_world.inverted()
	hm = next(o for o in P['meshes'] if o.name.startswith('head'))
	pts = [inv @ (hm.matrix_world @ v.co) for v in hm.data.vertices]
	lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
	hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
	return lo, hi

def attach(P, obj, bone='head', arm_space=None):
	"""parent obj to a bone keeping its placement; arm_space = 4×4 placement in armature space (else its current matrix)"""
	arm = P['arm']
	bpy.context.view_layer.update()
	M_ = arm.matrix_world @ (arm_space if arm_space is not None else Matrix.Identity(4))
	obj.parent = arm; obj.parent_type = 'BONE'; obj.parent_bone = bone
	bpy.context.view_layer.update()
	obj.matrix_world = M_
	return obj

def _join(name, parts, mat=None):
	"""join helper meshes into one object (keeps per-part materials)"""
	for o in parts: o.select_set(False)
	ctx = {'object': parts[0], 'active_object': parts[0], 'selected_objects': parts, 'selected_editable_objects': parts}
	with bpy.context.temp_override(**ctx):
		bpy.ops.object.join()
	o = parts[0]; o.name = name
	return o

M_ = {}
def mat(key, hexc_, rough=0.55, metal=0.0, emit=None, sheen=0.0):
	if key not in M_:
		M_[key] = pbr('pw_' + key, hexc_, rough=rough, metal=metal, emit=emit)
		if sheen:
			try: M_[key].node_tree.nodes['Principled BSDF'].inputs['Sheen Weight'].default_value = sheen
			except Exception: pass
	return M_[key]

def _rbox(name, m, c, half, bev=0.3, sub=2, rot=(0, 0, 0)):
	"""rounded box: cube with a strong bevel + subdivision (soft toy look like the Kenney figures)"""
	o = prim('cube', name, m, c, half, rot=rot, smooth_=True)
	_apply_scale(o)
	b = o.modifiers.new('bev', 'BEVEL'); b.width = min(half) * bev; b.segments = 3; b.limit_method = 'NONE'
	if sub:
		s = o.modifiers.new('sub', 'SUBSURF'); s.levels = sub; s.render_levels = sub
	return o

def _apply_scale(o):
	o.data.transform(Matrix.Diagonal((*o.scale, 1.0))); o.scale = (1, 1, 1)

# ------------------------------------------------------------------ hats (built in armature space on top of the head box)
def hat(P, kind):
	lo, hi = head_box(P)
	cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
	top = hi.z; wx, wy = hi.x - lo.x, hi.y - lo.y
	parts = []
	k = name = P['root'].name + '_' + kind
	if kind == 'kepi':          # US 1858 forage cap: navy, crown slouching forward, black leather visor
		m1 = mat('kepi', '#2b3a78', 0.7); m2 = mat('leather', '#1a1716', 0.35)
		parts.append(_rbox(k + 'c', m1, (cx, cy - wy * 0.04, top - wy * 0.05), (wx * 0.47, wy * 0.47, wy * 0.12), 0.25, 1))
		parts.append(_rbox(k + 't', m1, (cx, cy - wy * 0.14, top + wy * 0.10), (wx * 0.44, wy * 0.40, wy * 0.09), 0.3, 1, rot=(math.radians(-10), 0, 0)))
		parts.append(_rbox(k + 'v', m2, (cx, lo.y - wy * 0.10, top - wy * 0.15), (wx * 0.40, wy * 0.16, wy * 0.015), 0.4, 1, rot=(math.radians(14), 0, 0)))
		parts.append(_rbox(k + 'b', mat('gold', '#f0c14b', 0.3, 0.8), (cx, lo.y - 0.004, top - wy * 0.02), (wx * 0.07, wy * 0.01, wy * 0.035), 0.3, 1))
	elif kind == 'shako':       # Royal Marines: tall black shako, brass plate, white ball tuft
		m1 = mat('shako', '#17161a', 0.45); m2 = mat('leather', '#1a1716', 0.35)
		parts.append(_rbox(k + 'c', m1, (cx, cy, top + wy * 0.18), (wx * 0.42, wy * 0.42, wy * 0.30), 0.12, 1))
		parts.append(_rbox(k + 'v', m2, (cx, lo.y - wy * 0.08, top - wy * 0.09), (wx * 0.38, wy * 0.15, wy * 0.015), 0.4, 1, rot=(math.radians(12), 0, 0)))
		parts.append(_rbox(k + 'p', mat('gold', '#f0c14b', 0.3, 0.8), (cx, cy - wy * 0.425, top + wy * 0.16), (wx * 0.12, wy * 0.012, wy * 0.12), 0.3, 1))
		parts.append(prim('sphere', k + 'pom', mat('white', '#f4f1ea', 0.8), (cx, cy - wy * 0.15, top + wy * 0.55), (wy * 0.09,) * 3))
	elif kind == 'bicorne':     # naval officer's cocked hat worn athwartships: a solid half-moon with gold lace + cockade
		m1 = mat('bicorne', '#121116', 0.5); g = mat('gold', '#f0c14b', 0.3, 0.8)
		bm = bmesh.new(); n = 28; R_, Rz = wx * 0.82, wy * 0.62; th = wy * 0.16
		for yy in (-th / 2, th / 2):
			ring = [bm.verts.new((-math.cos(math.pi * i / n) * R_, yy, math.sin(math.pi * i / n) * Rz)) for i in range(n + 1)]
			bm.faces.new(ring[::-1] if yy < 0 else ring)
		bm.verts.ensure_lookup_table()
		A = bm.verts[:n + 1]; B = bm.verts[n + 1:]
		for i in range(n): bm.faces.new((A[i], A[i + 1], B[i + 1], B[i]))
		bm.faces.new((A[n], A[0], B[0], B[n]))
		bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
		me = bpy.data.meshes.new(k); bm.to_mesh(me); bm.free()
		o = obj_from_mesh(k + 'h', me, m1, (cx, cy, top - wy * 0.18))
		bv = o.modifiers.new('b', 'BEVEL'); bv.width = wy * 0.03; bv.segments = 2
		parts.append(o)
		parts.append(prim('cyl', k + 'g', g, (cx, cy - th / 2 - 0.004, top + wy * 0.2), (wy * 0.09, wy * 0.09, 0.006), seg=24, rot=(math.pi / 2, 0, 0)))
		parts.append(prim('cyl', k + 'gb', m1, (cx, cy - th / 2 - 0.008, top + wy * 0.2), (wy * 0.05, wy * 0.05, 0.004), seg=24, rot=(math.pi / 2, 0, 0)))
		bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.03, major_segments=48, minor_segments=8)
		tr = bpy.context.active_object; tr.name = k + 'lace'; tr.data.materials.append(g)
		tr.scale = (R_ * 0.99, Rz * 0.99, 1.0); tr.rotation_euler = (math.pi / 2, 0, 0); tr.location = (cx, cy - th / 2 - 0.002, top - wy * 0.18)
		parts.append(tr)
	elif kind == 'tophat':
		m1 = mat('tophat', '#141317', 0.35, sheen=0.4)
		parts.append(prim('cyl', k + 'c', m1, (cx, cy, top + wy * 0.32), (wx * 0.36, wy * 0.36, wy * 0.40), seg=32))
		parts.append(prim('cyl', k + 'b', m1, (cx, cy, top - wy * 0.04), (wx * 0.58, wy * 0.58, wy * 0.02), seg=32))
		parts.append(prim('cyl', k + 'r', mat('ribbon', '#3a3640', 0.6), (cx, cy, top + wy * 0.03), (wx * 0.365, wy * 0.365, wy * 0.05), seg=32))
	elif kind == 'pickelhaube':  # Prussian spiked helmet: black leather dome, brass spike, eagle plate, visors
		m1 = mat('pickel', '#141316', 0.25, sheen=0.3); g = mat('gold', '#f0c14b', 0.3, 0.8)
		o = prim('sphere', k + 'd', m1, (cx, cy, top - wy * 0.05), (wx * 0.50, wy * 0.50, wy * 0.42), u=32, v=16)
		parts.append(o)
		parts.append(prim('cyl', k + 's', g, (cx, cy, top + wy * 0.48), (wy * 0.05, wy * 0.05, wy * 0.16), seg=16, r2=0.15))
		parts.append(prim('cyl', k + 'sb', g, (cx, cy, top + wy * 0.34), (wy * 0.09, wy * 0.09, wy * 0.04), seg=16))
		parts.append(_rbox(k + 'e', g, (cx, lo.y + wy * 0.03, top + wy * 0.1), (wx * 0.08, wy * 0.015, wy * 0.09), 0.45, 1))
		parts.append(_rbox(k + 'v', m1, (cx, lo.y - wy * 0.06, top - wy * 0.16), (wx * 0.40, wy * 0.14, wy * 0.015), 0.4, 1, rot=(math.radians(10), 0, 0)))
	elif kind == 'straw':        # farmer's wide straw hat with a band
		m1 = mat('straw', '#e2c27c', 0.85); m2 = mat('band', '#7a3a2c', 0.6)
		parts.append(prim('cyl', k + 'b', m1, (cx, cy, top - wy * 0.03), (wx * 0.95, wy * 0.95, wy * 0.025), seg=40))
		parts.append(prim('cyl', k + 'c', m1, (cx, cy, top + wy * 0.13), (wx * 0.45, wy * 0.45, wy * 0.17), seg=32, r2=0.85))
		parts.append(prim('cyl', k + 'r', m2, (cx, cy, top + wy * 0.03), (wx * 0.46, wy * 0.46, wy * 0.05), seg=32))
	elif kind == 'bowler':
		m1 = mat('bowler', '#3a2a22', 0.45, sheen=0.3)
		parts.append(prim('sphere', k + 'c', m1, (cx, cy, top + wy * 0.02), (wx * 0.44, wy * 0.44, wy * 0.36), u=32, v=16))
		parts.append(prim('cyl', k + 'b', m1, (cx, cy, top - wy * 0.03), (wx * 0.6, wy * 0.6, wy * 0.02), seg=32))
	elif kind == 'flatcap':
		m1 = mat('flatcap', '#5d6a7a', 0.9)
		parts.append(_rbox(k + 'c', m1, (cx, cy - wy * 0.06, top + wy * 0.02), (wx * 0.5, wy * 0.56, wy * 0.07), 0.35, 1, rot=(math.radians(-6), 0, 0)))
	inv = P['arm'].matrix_world.copy()
	objs = []
	for o in parts:
		ws = o.matrix_world.copy() if False else Matrix.LocRotScale(o.location, o.rotation_euler, o.scale)
		o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.scale = (1, 1, 1)
		attach(P, o, 'head', ws)
		objs.append(o)
	return objs

# ------------------------------------------------------------------ beards / whiskers (armature space, head bone)
def beard(P, style='full', col='#7a4a2c', length=1.0):
	"""style: full (bushy beard + moustache), chops (Kaiser mutton chops + moustache), whiskers (admiral side whiskers),
	stubble. length scales the beard downwards (time-lapse growth: set obj.scale.z later via grow())."""
	lo, hi = head_box(P)
	cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
	wx, wy, hz = hi.x - lo.x, hi.y - lo.y, hi.z - lo.z
	m = mat('hair_' + col, col, 0.9, sheen=0.5)
	parts = []; nm = P['root'].name + '_beard'
	front = lo.y
	chin = lo.z + hz * 0.12
	if style in ('full', 'grow'):
		# a tapered, soft beard hanging from the chin (grows downwards when the root is scaled in z) + moustache
		piv = Vector((cx, front - wy * 0.02, lo.z + hz * 0.22))
		bmb = bmesh.new()
		bmesh.ops.create_cone(bmb, cap_ends=True, cap_tris=False, segments=12, radius1=1.0, radius2=0.35, depth=1.0)
		for v in bmb.verts: v.co.z -= 0.5      # top at z = 0, tip at z = −1
		me = bpy.data.meshes.new(nm + 'b'); bmb.to_mesh(me); bmb.free()
		bo = obj_from_mesh(nm + 'b', me, m, (0, 0, 0)); bo.scale = (wx * 0.33, wy * 0.09, hz * 0.32 * length)
		bo.rotation_euler = (math.radians(6), 0, 0)
		bo.modifiers.new('sub', 'SUBSURF').levels = 2
		me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
		parts.append(bo)
		parts.append(_rbox(nm + 'm', m, (0, -wy * 0.04, hz * 0.14), (wx * 0.22, wy * 0.05, hz * 0.045), 0.45, 1))
	elif style == 'chops':      # Kaiser Wilhelm I: big white side-whiskers on the cheeks joined by a moustache, chin shaved
		piv = Vector((cx, front - wy * 0.02, lo.z + hz * 0.34))
		for s in (-1, 1):
			parts.append(_rbox(nm + 'c%d' % s, m, (s * wx * 0.34, 0.0, -hz * 0.06), (wx * 0.13, wy * 0.05, hz * 0.2), 0.45, 2))
			parts.append(_rbox(nm + 'd%d' % s, m, (s * wx * 0.17, -wy * 0.01, hz * 0.06), (wx * 0.1, wy * 0.045, hz * 0.045), 0.45, 2, rot=(0, s * math.radians(-15), 0)))
	elif style == 'whiskers':
		piv = Vector((cx, front + wy * 0.05, lo.z + hz * 0.36))
		for s in (-1, 1):
			parts.append(_rbox(nm + 'w%d' % s, m, (s * wx * 0.40, wy * 0.04, -hz * 0.06), (wx * 0.07, wy * 0.07, hz * 0.15), 0.45, 2))
	root = bpy.data.objects.new(nm, None); bpy.context.scene.collection.objects.link(root)
	root.location = piv
	for o in parts: o.parent = root
	attach(P, root, 'head', Matrix.Translation(piv))
	return root

# ------------------------------------------------------------------ props
def rifle(name, s=1.0):
	"""muzzle-loading rifle-musket (Springfield 1855 type): walnut stock, browned steel barrel, ramrod; points along +Y"""
	wood = mat('walnut', '#7a4a2a', 0.45); steel = mat('gunsteel', '#3b3d42', 0.3, 0.9); brass = mat('gold', '#f0c14b', 0.3, 0.8)
	root = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(root)
	L = 0.62 * s
	parts = [
		_rbox(name + '_stock', wood, (0, -L * 0.10, 0), (0.016 * s, L * 0.36, 0.020 * s), 0.3, 1),
		_rbox(name + '_butt', wood, (0, -L * 0.42, -0.012 * s), (0.018 * s, L * 0.08, 0.034 * s), 0.3, 1),
		prim('cyl', name + '_barrel', steel, (0, L * 0.25, 0.018 * s), (0.008 * s, 0.008 * s, L * 0.42), seg=10, rot=(math.pi / 2, 0, 0)),
		prim('cyl', name + '_band1', brass, (0, L * 0.30, 0.012 * s), (0.013 * s, 0.013 * s, 0.006 * s), seg=10, rot=(math.pi / 2, 0, 0)),
		prim('cyl', name + '_band2', brass, (0, L * 0.12, 0.012 * s), (0.013 * s, 0.013 * s, 0.006 * s), seg=10, rot=(math.pi / 2, 0, 0)),
		_rbox(name + '_lock', steel, (0.012 * s, -L * 0.13, 0.008 * s), (0.004 * s, L * 0.04, 0.010 * s), 0.3, 0),
	]
	for o in parts: o.parent = root
	root['muzzle'] = (0, L * 0.67, 0.018 * s)
	return root

def note(name, value='10', w=0.16, col='#cfe3c4'):
	"""an 1850s-style banknote (paper card with a big number), image texture made on the fly"""
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = bpy.data.images.load(str(kit.ROOT / f'assets/notes/note_{value}.png'), check_existing=True)
	link(nt, ti.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.8
	link(nt, ti.outputs['Color'], bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 0.25
	m.use_backface_culling = False
	o = prim('plane', name, m, (0, 0, 0), (w / 2, w * 0.43 / 2, 1), smooth_=False)
	o.data.uv_layers.new()
	for p in o.data.polygons:
		for li in p.loop_indices:
			v = o.data.vertices[o.data.loops[li].vertex_index].co
			o.data.uv_layers.active.data[li].uv = (v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
	return o

# ====================================================================================================== the Berkshire pig
def _blob(name, m, c, half, sq=0.18, sub=3, rot=(0, 0, 0)):
	"""soft rounded blob (subdivided cube, a little boxy like the Kenney figures)"""
	o = prim('cube', name, m, c, half, rot=rot, smooth_=True); _apply_scale(o)
	if sq:
		b = o.modifiers.new('bev', 'BEVEL'); b.width = min(half) * sq; b.segments = 2; b.limit_method = 'NONE'
	s_ = o.modifiers.new('sub', 'SUBSURF'); s_.levels = sub; s_.render_levels = sub
	return o

def potato(name, s=1.0, bite=False):
	m = mat('potato', '#b98a55', 0.8)
	o = prim('ico', name, m, (0, 0, 0), (0.05 * s, 0.034 * s, 0.032 * s), sub=3)
	d = o.modifiers.new('d', 'DISPLACE'); tx = bpy.data.textures.new(name + '_tx', 'CLOUDS'); tx.noise_scale = 0.6; d.texture = tx; d.strength = 0.012 * s
	return o

PIGS = []
def pig(name, loc=(0, 0, 0), yaw=0.0, s=1.0, angel=False):
	"""toy-like Berkshire boar in the Kenney style: black with the white points (face blaze, snout rim, feet, tail tip), pink
	snout disc, big friendly eyes, erect ears, curly tail. Big head (cute proportions). Faces +X at yaw 0.
	Returns pivots: root, body, neck (head pivot), jaw, legs[4], tail, ears[2], eyes[2] (+ halo, wings if angel)."""
	blk = mat('pigblack', '#1d191b', 0.62, sheen=0.25); wht = mat('pigwhite', '#f6f1ea', 0.6, sheen=0.3)
	pnk = mat('pigpink', '#f4a9ad', 0.45); dark = mat('pighoof', '#4a3a33', 0.45); eyew = mat('eyewhite', '#fbfbf8', 0.2)
	pup = mat('pupil', '#121014', 0.15); inner = mat('pigear', '#e58f97', 0.6)
	R = empty(name, loc); R.rotation_euler = (0, 0, yaw); R.scale = (s, s, s)
	body = empty(name + '_body', (0, 0, 0.2), R)
	_blob(name + '_torso', blk, (-0.03, 0, 0), (0.30, 0.19, 0.17), 0).parent = body
	neck = empty(name + '_neck', (0.17, 0, 0.05), body)
	_blob(name + '_head', blk, (0.08, 0, 0.03), (0.16, 0.165, 0.155), 0).parent = neck
	_blob(name + '_blaze', wht, (0.19, 0, 0.1), (0.035, 0.034, 0.07), 0).parent = neck
	sn = prim('cyl', name + '_snout', pnk, (0.255, 0, -0.01), (0.07, 0.078, 0.045), seg=32, rot=(0, math.pi / 2, 0)); sn.parent = neck
	bv = sn.modifiers.new('b', 'BEVEL'); bv.width = 0.25; bv.segments = 4
	rim = prim('cyl', name + '_snoutw', wht, (0.228, 0, -0.01), (0.078, 0.086, 0.03), seg=32, rot=(0, math.pi / 2, 0)); rim.parent = neck
	rim.modifiers.new('b', 'BEVEL').width = 0.3
	for sy in (-1, 1):
		prim('sphere', name + f'_nos{sy}', dark, (0.298, sy * 0.026, -0.006), (0.008, 0.013, 0.019)).parent = neck
	jaw = empty(name + '_jaw', (0.17, 0, -0.07), neck)
	_blob(name + '_jawm', blk, (0.0, 0, 0.012), (0.07, 0.085, 0.035), 0).parent = jaw
	eyes = []
	for sy in (-1, 1):
		e = empty(name + f'_eye{sy}', (0.215, sy * 0.068, 0.075), neck)
		prim('sphere', name + f'_ew{sy}', eyew, (0, 0, 0), (0.016, 0.032, 0.036)).parent = e
		prim('sphere', name + f'_ep{sy}', pup, (0.013, 0, 0.0), (0.009, 0.021, 0.025)).parent = e
		prim('sphere', name + f'_eh{sy}', mat('glint', '#ffffff', 0.1, emit=('#ffffff', 3.0)), (0.021, -0.006 * sy, 0.011), (0.003, 0.006, 0.007)).parent = e
		eyes.append(e)
	ears = []
	for sy in (-1, 1):
		ep = empty(name + f'_earp{sy}', (0.07, sy * 0.095, 0.135), neck)
		bm = bmesh.new()
		v = [bm.verts.new(p) for p in ((-0.045, -0.04, 0), (0.035, -0.04, 0), (0.035, 0.04, 0), (-0.045, 0.04, 0), (0.025, 0.0, 0.12))]
		bm.faces.new(v[:4][::-1]); [bm.faces.new((v[i], v[(i + 1) % 4], v[4])) for i in range(4)]
		me = bpy.data.meshes.new(name + f'_ear{sy}'); bm.to_mesh(me); bm.free()
		eo = obj_from_mesh(name + f'_ear{sy}', me, blk); eo.parent = ep; eo.scale = (0.55, 1.0, 1.0)
		eo.modifiers.new('sub', 'SUBSURF').levels = 2
		ip = prim('sphere', name + f'_eari{sy}', inner, (0.022, 0, 0.04), (0.006, 0.022, 0.04)); ip.parent = ep
		ears.append(ep)
	legs = []
	for i, (lx, ly) in enumerate(((0.13, 0.085), (0.13, -0.085), (-0.17, 0.085), (-0.17, -0.085))):
		hp = empty(name + f'_hip{i}', (lx, ly, -0.08), body)
		_blob(name + f'_leg{i}', blk, (0, 0, -0.03), (0.058, 0.058, 0.075), 0).parent = hp
		_blob(name + f'_sock{i}', wht, (0, 0, -0.095), (0.06, 0.06, 0.04), 0).parent = hp
		_blob(name + f'_hoof{i}', dark, (0.008, 0, -0.122), (0.058, 0.058, 0.016), 0).parent = hp
		legs.append(hp)
	tp = empty(name + '_tailp', (-0.275, 0, 0.07), body)
	cu = bpy.data.curves.new(name + '_tailc', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.012; cu.bevel_resolution = 3
	sp = cu.splines.new('NURBS'); pts = []
	for k in range(13):
		a = k / 12 * 2.3 * math.pi
		pts.append((-0.012 * k - 0.02 * math.sin(a), 0.028 * math.cos(a) - 0.028, 0.028 * math.sin(a) + 0.004 * k))
	sp.points.add(len(pts) - 1)
	for p_, c_ in zip(sp.points, pts): p_.co = (*c_, 1)
	sp.use_endpoint_u = True; sp.order_u = 4
	to = bpy.data.objects.new(name + '_tail', cu); bpy.context.scene.collection.objects.link(to); to.parent = tp; to.data.materials.append(blk)
	prim('sphere', name + '_tailtip', wht, pts[-1], (0.016,) * 3).parent = tp
	D = {'root': R, 'body': body, 'neck': neck, 'jaw': jaw, 'legs': legs, 'tail': tp, 'ears': ears, 'eyes': eyes, 'name': name,
	     'mode': 'idle', 't0': 0.0, 'look': 0.0}
	if angel:
		halo_m = mat('halo', '#ffe08a', 0.2, emit=('#ffd56a', 6.0))
		bpy.ops.mesh.primitive_torus_add(major_radius=0.09, minor_radius=0.012, major_segments=48, minor_segments=12)
		h = bpy.context.active_object; h.name = name + '_halo'; h.data.materials.append(halo_m)
		h.parent = neck; h.location = (0.08, 0, 0.24); h.rotation_euler = (0, math.radians(-12), 0)
		D['halo'] = h
		wm = mat('wing', '#fbf8f2', 0.7, emit=('#fff6e6', 0.6), sheen=0.6)
		wings = []
		for sy in (-1, 1):
			wp = empty(name + f'_wing{sy}', (0.0, sy * 0.15, 0.14), body)
			for j, (ln, ang) in enumerate(((0.34, 16), (0.30, 34), (0.25, 52), (0.19, 70), (0.13, 88))):
				f = prim('sphere', name + f'_f{sy}{j}', wm, (0, 0, 0), (ln / 2, 0.014, 0.045), u=24, v=12)
				a = math.radians(ang)
				f.location = (-math.cos(a) * ln * 0.45, sy * 0.01, math.sin(a) * ln * 0.45)
				f.rotation_euler = (0, -a, 0); f.parent = wp
			wings.append(wp)
		D['wings'] = wings
	PIGS.append(D)
	return D

def pig_pose(D, t):
	"""procedural acting by D['mode']: idle (breath, ear flicks), chew (head bob + jaw), look (head up to camera),
	walk (trot cycle), float (angel: hover bob, wing flaps, legs dangle)"""
	m = D['mode']; tl = t - D.get('t0', 0.0)
	br = math.sin(t * 3.0) * 0.012
	D['body'].scale = (1.0, 1.0 + br, 1.0 + br)
	ear = math.sin(t * 1.7) ** 8 * 0.35
	for k, e in enumerate(D['ears']):
		e.rotation_euler.x = (1 if k else -1) * (math.radians(18) + ear * (1 if k else 0.6))
	D['tail'].rotation_euler = (math.sin(t * 6.0) * 0.35, 0, 0)
	nk = D['neck']; jw = D['jaw']
	head_up = D.get('look', 0.0)
	if m == 'chew':
		c = math.sin(tl * 2 * math.pi * 2.4)
		nk.rotation_euler = (0, math.radians(18 - 4 * c) * (1 - head_up) + math.radians(-16) * head_up, math.sin(tl * 1.3) * 0.08 * (1 - head_up))
		jw.rotation_euler = (0, math.radians(10 + 9 * c) * (1 - head_up), 0)
	elif m == 'walk':
		ph = tl * 2 * math.pi * 2.6
		for k, lg in enumerate(D['legs']):
			lg.rotation_euler = (0, math.sin(ph + (math.pi if k in (1, 2) else 0)) * 0.55, 0)
		D['body'].location.z = 0.21 + abs(math.sin(ph)) * 0.012
		nk.rotation_euler = (0, math.sin(ph * 2) * 0.05, 0)
	elif m == 'float':
		D['body'].location.z = 0.21 + math.sin(t * 2.2) * 0.025
		for k, lg in enumerate(D['legs']):
			lg.rotation_euler = (0, math.sin(t * 2.6 + k) * 0.18 + 0.15, 0)
		for k, w in enumerate(D.get('wings', [])):
			w.rotation_euler = ((1 if k else -1) * (math.radians(25) + math.sin(t * 9.0) * math.radians(28)), 0, 0)
		nk.rotation_euler = (0, math.radians(-8) + math.sin(t * 1.6) * 0.06, math.sin(t * 1.1) * 0.12)
	else:
		nk.rotation_euler = (0, math.radians(6) * (1 - head_up) + math.radians(-16) * head_up, math.sin(t * 0.9) * 0.06)
		jw.rotation_euler = (0, 0, 0)

def _pigs_tick(t):
	for D in PIGS: pig_pose(D, t)
UPDATERS.append(_pigs_tick)


# ------------------------------------------------------------------ rifles held in both hands (follows any clip)
CARRY = []
def hands(P):
	"""world positions of the right and left hand (after the clip pose is evaluated)"""
	arm = P['arm']; out = []
	for side in ('arm-right', 'arm-left'):
		pb = arm.pose.bones[side]
		out.append(arm.matrix_world @ (pb.matrix @ (D0[side] * HAND_R)))
	return out

def carry(P, R, mode='aim', back=0.30, pitch=None):
	"""rifle R (points along +Y) follows the hands every frame. mode: 'aim' (level, forward, from the hands' midpoint),
	'port' (diagonal across the chest), 'shoulder' (upright at the right hand, slung on the shoulder)"""
	CARRY.append({'P': P, 'R': R, 'mode': mode, 'back': back, 'pitch': pitch})

def _carry_tick(t):
	for c in CARRY:
		P, R = c['P'], c['R']
		rh, lh = hands(P)
		s_ = P['root'].matrix_world.to_scale()[0]
		rot = P['root'].matrix_world.to_quaternion()
		fwd = rot @ Vector((0, -1, 0)); up = rot @ Vector((0, 0, 1)); left = rot @ Vector((1, 0, 0))
		if c['mode'] == 'shoulder':
			d = (up * 0.94 - fwd * 0.12 + left * 0.0).normalized(); base = rh; back = 0.05
		elif c['mode'] == 'port':
			d = (fwd * 0.55 + up * 0.75 + left * 0.35).normalized(); base = (rh + lh) / 2; back = c['back'] * 0.8
		else:
			pt = math.radians(c['pitch'] if c['pitch'] is not None else -3.0)
			d = (fwd * math.cos(pt) + up * math.sin(pt)).normalized(); base = (rh + lh) / 2; back = c['back']
		R.rotation_mode = 'QUATERNION'; R.rotation_quaternion = d.to_track_quat('Y', 'Z')
		R.location = base - d * back * s_
		R.scale = (s_, s_, s_)
UPDATERS.append(_carry_tick)

# ------------------------------------------------------------------ crowds: one posed proto, many collection instances (in step)
def proto(name, build_fn, at=(0, 0, -100)):
	"""objects made by build_fn() go into their own collection, parked underground at `at` (still evaluated → poses and
	rifle carry update every frame); instances of the collection show it anywhere via instance_offset"""
	before = set(bpy.data.objects)
	res = build_fn()
	new = [o for o in bpy.data.objects if o not in before]
	coll = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(coll)
	for o in new:
		for c in list(o.users_collection): c.objects.unlink(o)
		coll.objects.link(o)
	roots = [o for o in new if o.parent is None]
	for o in roots: o.location = Vector(o.location) + Vector(at)
	coll.instance_offset = at
	return coll, res

def inst(coll, name, loc, yaw=0.0, s=1.0):
	e = bpy.data.objects.new(name, None); e.instance_type = 'COLLECTION'; e.instance_collection = coll
	bpy.context.scene.collection.objects.link(e); e.location = loc; e.rotation_euler = (0, 0, yaw); e.scale = (s, s, s)
	return e
