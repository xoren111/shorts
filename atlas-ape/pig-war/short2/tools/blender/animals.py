"""Realistic Berkshire boar for the v2 painting look: metaball body with real proportions (≈1.3 m long, 0.75 m at the
shoulder), bristly black skin with the breed's white points (snout, face blaze, feet, tail tip), small eyes, erect ears,
curly tail; a simple armature (spine/neck/head/jaw/legs/tail) bound with automatic weights. Faces +X.
boar(name, loc, yaw, angel=False) → dict with rig, root, mode ('chew' | 'idle' | 'look' | 'float'); boar_tick(B, t) poses it."""
import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix, Euler, Quaternion
from kit import *
from yf2 import *

def _skin_mat(name='boarskin', pd=False):
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1200, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (900, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0))
	attr = node(nt, 'ShaderNodeAttribute', (-1000, 300)); attr.attribute_name = 'white'
	# bristles: fine stretched noise (along the body) for colour variation + bump; dusty soil on the legs/belly
	mp = node(nt, 'ShaderNodeMapping', (-900, 0)); mp.inputs['Scale'].default_value = (60, 260, 60); link(nt, tc.outputs['Object'], mp.inputs['Vector'])
	nz = node(nt, 'ShaderNodeTexNoise', (-700, 0)); nz.inputs['Scale'].default_value = 1.0; nz.inputs['Detail'].default_value = 4; link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
	nz2 = node(nt, 'ShaderNodeTexNoise', (-700, -250)); nz2.inputs['Scale'].default_value = 9.0; nz2.inputs['Detail'].default_value = 6; link(nt, tc.outputs['Object'], nz2.inputs['Vector'])
	black = RAMP(nt, nz.outputs['Fac'], [(0.35, C('#1c1718')), (0.65, C('#352d2e'))], interp='LINEAR')
	dirt = RAMP(nt, nz2.outputs['Fac'], [(0.45, (0, 0, 0)), (0.7, (1, 1, 1))], interp='LINEAR')
	sep = SEP(nt, tc.outputs['Object'])
	low = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 0.32, sep[2]), 3.0, clamp=True)
	dusty = MIX(nt, M(nt, 'MULTIPLY', low, 0.55), black, C('#5a4a3c'))
	white = MIX(nt, 1.0, C('#e9e2d8'), C('#c9bfb2'))
	if pd:
		# the public-domain model's own units: snout at +Y (tip ≈ 4.6), height z 0…4.6, width x ±1.65
		# mesh-local axes of the imported model: width = x, length = z (snout +), height = −y; ×100 → model units
		ox, oy, oz = M(nt, 'MULTIPLY', sep[0], 100.0), M(nt, 'MULTIPLY', sep[2], -100.0), M(nt, 'MULTIPLY', sep[1], -100.0)
		snout = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', oy, 4.3), 8.0, clamp=True)
		bx = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 0.3, M(nt, 'ABSOLUTE', ox)), 12.0, clamp=True)
		by = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', oy, 2.9), 4.0, clamp=True)
		bz = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', oz, 3.55), 6.0, clamp=True)
		blaze = M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', bx, by), bz)
		feet = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 0.45, oz), 6.0, clamp=True)
		tail = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', -4.95, oy), 6.0, clamp=True)
		wfac = M(nt, 'MAXIMUM', M(nt, 'MAXIMUM', snout, blaze), M(nt, 'MAXIMUM', feet, tail))
		pfac = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', oy, 4.52), 12.0, clamp=True)
		low = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 1.6, oz), 0.8, clamp=True)
		dusty = MIX(nt, M(nt, 'MULTIPLY', low, 0.45), black, C('#4a3c30'))
		col = MIX(nt, wfac, dusty, white)
		col = MIX(nt, pfac, col, C('#c08a84'))
	else:
		col = MIX(nt, attr.outputs['Fac'], dusty, white)
		pink = node(nt, 'ShaderNodeAttribute', (-1000, 500)); pink.attribute_name = 'pink'
		col = MIX(nt, pink.outputs['Fac'], col, C('#c98f88'))
	link(nt, col, bs.inputs['Base Color'])
	bs.inputs['Roughness'].default_value = 0.62
	try:
		bs.inputs['Sheen Weight'].default_value = 0.15; bs.inputs['Sheen Roughness'].default_value = 0.45
		bs.inputs['Sheen Tint'].default_value = (0.75, 0.72, 0.7, 1)
		bs.inputs['Subsurface Weight'].default_value = 0.05; bs.inputs['Subsurface Radius'].default_value = (0.4, 0.15, 0.1)
	except Exception: pass
	bp = node(nt, 'ShaderNodeBump', (600, -300)); bp.inputs['Strength'].default_value = 0.25; bp.inputs['Distance'].default_value = 0.004
	link(nt, nz.outputs['Fac'], bp.inputs['Height']); link(nt, bp.outputs['Normal'], bs.inputs['Normal'])
	return m

def _metaball_body(name):
	mb = bpy.data.metaballs.new(name); mb.resolution = 0.018; mb.render_resolution = 0.012; mb.threshold = 0.6
	o = bpy.data.objects.new(name, mb); bpy.context.scene.collection.objects.link(o)
	def el(kind, co, r, size=None, rot=None, stiff=2.0):
		e = mb.elements.new(); e.type = kind; e.co = co; e.radius = r; e.stiffness = stiff
		if size:
			e.size_x, e.size_y, e.size_z = size
		if rot: e.rotation = Euler([math.radians(a) for a in rot]).to_quaternion()
		return e
	# body: a deep barrel close to the ground (chest, middle, ham) + a sagging belly
	el('ELLIPSOID', (0.2, 0, 0.5), 0.4, (1.0, 0.9, 1.0))
	el('ELLIPSOID', (-0.12, 0, 0.49), 0.42, (1.1, 0.93, 0.95))
	el('ELLIPSOID', (-0.44, 0, 0.5), 0.36, (0.95, 0.95, 1.02))
	el('ELLIPSOID', (-0.05, 0, 0.33), 0.3, (1.7, 0.85, 0.6))
	# thick neck flowing into a long tapering head with heavy jowls, then the snout
	el('ELLIPSOID', (0.5, 0, 0.53), 0.3, (1.0, 0.95, 1.0))
	el('ELLIPSOID', (0.7, 0, 0.52), 0.21, (1.45, 0.85, 0.9))
	el('BALL', (0.62, 0, 0.4), 0.17)
	el('CAPSULE', (0.88, 0, 0.47), 0.1, (0.12, 1, 1), rot=(0, 14, 0))
	# short sturdy legs
	for x, y in ((0.3, 0.17), (0.3, -0.17), (-0.45, 0.17), (-0.45, -0.17)):
		el('CAPSULE', (x, y, 0.17), 0.085, (0.1, 1, 1), rot=(0, 90, 0), stiff=2.5)
		el('BALL', (x + 0.02, y, 0.34), 0.15)
	return o

def _convert(o):
	for x in bpy.context.selected_objects: x.select_set(False)
	o.select_set(True); bpy.context.view_layer.objects.active = o
	with bpy.context.temp_override(active_object=o, object=o, selected_objects=[o], selected_editable_objects=[o]):
		bpy.ops.object.convert(target='MESH')
	return bpy.context.view_layer.objects.active

def _ear(name, mat_, side):
	bm = bmesh.new()
	pts = [(0, -0.06, 0), (0, 0.06, 0), (0.03, 0.0, 0.17)]
	v = [bm.verts.new(p) for p in pts]
	bm.faces.new(v)
	bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=3, use_grid_fill=True)
	for vv in bm.verts:      # cup the ear: bend the edges forward
		vv.co.x += 0.04 * (abs(vv.co.y) / 0.06) ** 2
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	o = obj_from_mesh(name, me, mat_)
	sd = o.modifiers.new('sd', 'SOLIDIFY'); sd.thickness = 0.008
	o.modifiers.new('sub', 'SUBSURF').levels = 2
	return o

def boar(name, loc=(0, 0, 0), yaw=0.0, s=1.0, angel=False):
	body = _metaball_body(name + '_mb')
	body = _convert(body); body.name = name + '_body'
	me = body.data
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	# white points + pink snout as vertex attributes (from position): snout tip, face blaze, feet, tail tip
	wa = me.attributes.new('white', 'FLOAT', 'POINT'); pa = me.attributes.new('pink', 'FLOAT', 'POINT')
	for i, v in enumerate(me.vertices):
		x, y, z = v.co
		w = 0.0
		if x > 0.9: w = max(w, min(1, (x - 0.9) / 0.04))                                     # snout rim
		if x > 0.6 and abs(y) < 0.035 + 0.02 * (0.8 - x) and z > 0.6: w = max(w, 1.0)             # face blaze
		if z < 0.12: w = max(w, min(1, (0.12 - z) / 0.04))                                      # white feet
		wa.data[i].value = w
		pa.data[i].value = 1.0 if x > 0.97 else 0.0
	sk = _skin_mat(name + '_skin'); body.data.materials.append(sk)
	R = empty(name, (0, 0, 0))
	# armature
	ad = bpy.data.armatures.new(name + '_arm'); rig = bpy.data.objects.new(name + '_rig', ad); bpy.context.scene.collection.objects.link(rig)
	bpy.context.view_layer.objects.active = rig
	with bpy.context.temp_override(active_object=rig, object=rig):
		bpy.ops.object.mode_set(mode='EDIT')
		eb = ad.edit_bones
		def bone(n, h, t, parent=None):
			b = eb.new(n); b.head = h; b.tail = t
			if parent: b.parent = eb[parent]
			return b
		bone('spine', (-0.5, 0, 0.55), (0.3, 0, 0.56))
		bone('neck', (0.3, 0, 0.56), (0.55, 0, 0.6), 'spine')
		bone('head', (0.55, 0, 0.6), (0.95, 0, 0.5), 'neck')
		bone('jaw', (0.6, 0, 0.42), (0.88, 0, 0.4), 'head')
		bone('tail', (-0.62, 0, 0.62), (-0.75, 0, 0.6), 'spine')
		for nm, (x, y) in (('legFL', (0.3, 0.17)), ('legFR', (0.3, -0.17)), ('legBL', (-0.45, 0.17)), ('legBR', (-0.45, -0.17))):
			bone(nm, (x, y, 0.4), (x, y, 0.03), 'spine')
		bpy.ops.object.mode_set(mode='OBJECT')
	# bind with automatic weights
	for x in bpy.context.selected_objects: x.select_set(False)
	body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
	with bpy.context.temp_override(active_object=rig, object=rig, selected_objects=[body, rig], selected_editable_objects=[body, rig]):
		bpy.ops.object.parent_set(type='ARMATURE_AUTO')
	rig.parent = R
	# details parented to bones
	def to_bone(o, b):
		bpy.context.view_layer.update()
		mw = o.matrix_world.copy(); o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = b
		bpy.context.view_layer.update(); o.matrix_world = mw
	dark = pbr(name + '_dark', '#0b0a0a', rough=0.15)
	snoutm = pbr(name + '_snout', '#c49a92', rough=0.4)
	disc = prim('cyl', name + '_disc', snoutm, (1.0, 0, 0.475), (0.085, 0.09, 0.014), seg=40, rot=(0, math.radians(76), 0))
	disc.modifiers.new('b', 'BEVEL').width = 0.006
	for sy in (-1, 1):
		prim('sphere', f'{name}_nos{sy}', dark, (1.012, sy * 0.03, 0.475), (0.008, 0.013, 0.02)).parent = None
		to_bone(bpy.data.objects[f'{name}_nos{sy}'], 'head')
		e = prim('sphere', f'{name}_eye{sy}', dark, (0.76, sy * 0.13, 0.6), (0.02, 0.012, 0.016)); to_bone(e, 'head')
		ear = _ear(f'{name}_ear{sy}', sk, sy)
		ear.location = (0.6, sy * 0.14, 0.7); ear.rotation_euler = (sy * math.radians(-22), math.radians(-30), 0); to_bone(ear, 'head')
	to_bone(disc, 'head')
	cu = bpy.data.curves.new(name + '_tailc', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.012; cu.bevel_resolution = 3
	sp = cu.splines.new('NURBS'); pts = []
	for k in range(14):
		a = k / 13 * 2.4 * math.pi
		pts.append((-0.7 - 0.012 * k - 0.025 * math.sin(a), 0.03 * math.cos(a) - 0.03, 0.62 + 0.03 * math.sin(a) - 0.004 * k))
	sp.points.add(len(pts) - 1)
	for p_, c_ in zip(sp.points, pts): p_.co = (*c_, 1)
	sp.use_endpoint_u = True; sp.order_u = 4
	to_ = bpy.data.objects.new(name + '_tail', cu); bpy.context.scene.collection.objects.link(to_); to_.data.materials.append(sk); to_bone(to_, 'tail')
	B = {'root': R, 'rig': rig, 'body': body, 'mode': 'idle', 'look': 0.0, 't0': 0.0, 'name': name}
	if angel:
		halo = pbr(name + '_halo', '#ffe7a8', rough=0.2, emit=('#ffd77a', 5.0))
		bpy.ops.mesh.primitive_torus_add(major_radius=0.13, minor_radius=0.014, major_segments=64, minor_segments=12, location=(0.62, 0, 0.95))
		h = bpy.context.active_object; h.name = name + '_halo'; h.data.materials.append(halo); h.rotation_euler = (0, math.radians(-10), 0); to_bone(h, 'head')
		wing = pbr(name + '_wing', '#f6f1e8', rough=0.75, emit=('#fff3dc', 0.3))
		B['wings'] = []
		for sy in (-1, 1):
			wp = empty(f'{name}_wing{sy}', (0.15, sy * 0.25, 0.82))
			for j, (ln, ang) in enumerate(((0.55, 12), (0.48, 28), (0.4, 44), (0.32, 60), (0.24, 76))):
				f = prim('sphere', f'{name}_f{sy}{j}', wing, (0, 0, 0), (ln / 2, 0.012, 0.055), u=24, v=12)
				a = math.radians(ang); f.location = (-math.cos(a) * ln * 0.45, sy * 0.01, math.sin(a) * ln * 0.45); f.rotation_euler = (0, -a, 0); f.parent = wp
			to_bone(wp, 'spine'); B['wings'].append(wp)
	R.location = loc; R.rotation_euler = (0, 0, yaw); R.scale = (s, s, s)
	BOARS.append(B)
	return B

BOARS = []
def boar_tick(B, t):
	rig = B['rig']; pbs = rig.pose.bones
	for pb in pbs: pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, 0)
	m = B['mode']; tl = t - B.get('t0', 0.0); up = B.get('look', 0.0)
	br = math.sin(t * 2.6) * 0.012
	pbs['spine'].scale = (1.0, 1.0 + br, 1.0 + br)
	pbs['tail'].rotation_euler = (math.sin(t * 5.0) * 0.4, 0, math.sin(t * 3.1) * 0.3)
	if m == 'chew':
		c = math.sin(tl * 2 * math.pi * 2.2)
		pbs['neck'].rotation_euler = (math.radians(-14 + 3 * c) * (1 - up) + math.radians(14) * up, 0, 0)
		pbs['head'].rotation_euler = (math.radians(-10) * (1 - up) + math.radians(10) * up, 0, math.sin(tl * 1.2) * 0.06 * (1 - up))
		pbs['jaw'].rotation_euler = (math.radians(-5 - 7 * c) * (1 - up), 0, 0)
	elif m == 'float':
		pbs['neck'].rotation_euler = (math.radians(6) + math.sin(t * 1.4) * 0.05, 0, 0)
		for k, nm in enumerate(('legFL', 'legFR', 'legBL', 'legBR')):
			pbs[nm].rotation_euler = (math.radians(15) * math.sin(t * 2.2 + k) + math.radians(10), 0, 0)
		for k, w in enumerate(B.get('wings', [])):
			w.rotation_euler = ((1 if k else -1) * (math.radians(20) + math.sin(t * 7.0) * math.radians(25)), 0, 0)
	else:
		pbs['neck'].rotation_euler = (math.radians(-4) * (1 - up) + math.radians(14) * up, 0, 0)
		pbs['head'].rotation_euler = (math.radians(8) * up, 0, math.sin(t * 0.8) * 0.08)


# ====================================================================================================== v2b: public-domain pig model
PD_GLB = Path(__file__).resolve().parents[2] / 'assets/pig_pd/pig.glb' if False else None
def boar_pd(name, loc=(0, 0, 0), yaw=0.0, s=1.0, angel=False, length=1.3):
	"""«Pig» by Poly Pizza (TNvG3QUFlp, public domain) — smoothed (subdivision), re-skinned as a black Berkshire with the
	white points, its own armature (Torso/Back/Head/legs) kept for posing. Faces +X at yaw 0, length ≈ `length` m."""
	import kit as _k
	f = _k.ROOT / 'assets/pig_pd/pig.glb'
	before = set(bpy.data.objects)
	bpy.ops.import_scene.gltf(filepath=str(f))
	new = [o for o in bpy.data.objects if o not in before]
	rig = next(o for o in new if o.type == 'ARMATURE')
	body = next(o for o in new if o.type == 'MESH' and o.name.startswith('Pig'))
	bpy.context.view_layer.update(); M_body0 = body.matrix_world.copy()
	for o in new:
		if o not in (rig, body):
			try: bpy.data.objects.remove(o)
			except Exception: pass
	R = empty(name, (0, 0, 0))
	sc_ = length / 9.78
	bpy.context.view_layer.update()
	M_rig = rig.matrix_world.copy(); M_body = body.matrix_world.copy()
	S_ = empty(name + '_xf', (0, 0, 0), R); S_.rotation_euler = (0, 0, 0); S_.scale = (sc_, sc_, sc_)
	rig.parent = S_; rig.matrix_parent_inverse = Matrix.Identity(4); rig.matrix_basis = M_rig
	body.parent = S_; body.matrix_parent_inverse = Matrix.Identity(4); body.matrix_basis = M_body
	if not any(md.type == 'ARMATURE' for md in body.modifiers):
		am = body.modifiers.new('arm', 'ARMATURE'); am.object = rig
	else:
		for md in body.modifiers:
			if md.type == 'ARMATURE': md.object = rig
	body.name = name + '_body'
	me = body.data
	bm_ = bmesh.new(); bm_.from_mesh(me)
	bmesh.ops.remove_doubles(bm_, verts=bm_.verts, dist=max(me.vertices[0].co.length, 1.0) * 1e-4 + 1e-5)
	bm_.to_mesh(me); bm_.free()
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	sub = body.modifiers.new('sub', 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
	# move the subdivision before the armature deform so the cage deforms smoothly
	while body.modifiers.find('sub') > 0:
		with bpy.context.temp_override(object=body, active_object=body):
			bpy.ops.object.modifier_move_up(modifier='sub')
	# white points / pink snout from model-space position (model: snout at +Y, height z 0…4.6)
	wa = me.attributes.new('white', 'FLOAT', 'POINT'); pa = me.attributes.new('pink', 'FLOAT', 'POINT')
	Mb = M_body0
	for i, v in enumerate(me.vertices):
		x, y, z = Mb @ v.co
		w = 0.0
		if y > 4.35: w = 1.0                                                     # snout disc rim
		if y > 3.0 and abs(x) < 0.28 and z > 3.7: w = max(w, 1.0)                # face blaze
		if z < 0.55: w = max(w, min(1.0, (0.55 - z) / 0.2))                      # white feet
		if y < -4.9: w = max(w, 1.0)                                             # tail tip
		wa.data[i].value = w
		pa.data[i].value = 1.0 if y > 4.5 else 0.0
	body.data.materials.clear(); body.data.materials.append(_skin_mat(name + '_skin', pd=True))
	B = {'root': R, 'rig': rig, 'body': body, 'mode': 'idle', 'look': 0.0, 't0': 0.0, 'name': name, 'pd': True, 'S_': S_}
	# eyes: find the head surface in model units (front-top of the head ≈ y 3.7, z 3.9, x ±0.95) → small glossy spheres
	bpy.context.view_layer.update()
	hb = rig.pose.bones.get('Head')
	eye_m = pbr(name + '_eye', '#0a0807', rough=0.08)
	for sx in (-1, 1):
		p_model = Vector((sx * 0.92, -4.0, 3.9))
		pw_ = S_.matrix_world @ (M_body0 @ (M_body0.inverted() @ p_model)) if False else S_.matrix_world @ p_model
		e = prim('sphere', f'{name}_eye{sx}', eye_m, pw_, (0.022, 0.022, 0.016))
		if hb:
			mw = Matrix.LocRotScale(Vector(pw_), None, Vector((0.022, 0.022, 0.016)))
			e.parent = rig; e.parent_type = 'BONE'; e.parent_bone = 'Head'
			bpy.context.view_layer.update(); e.matrix_world = mw
	if angel:
		bpy.context.view_layer.update()
		def to_bone(o, b):
			bpy.context.view_layer.update()
			mw = o.matrix_world.copy(); o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = b
			bpy.context.view_layer.update(); o.matrix_world = mw
		# positions in the model's own units (snout +Y ≈ 4.6, crown z ≈ 4.6, back z ≈ 4.2), converted by the wrapper
		Wm = S_.matrix_world; Rq = Wm.to_quaternion()
		head_top = Wm @ Vector((0, -3.0, 6.0)); shoulder = Wm @ Vector((0, -0.9, 4.45))
		halo = pbr(name + '_halo', '#ffe7a8', rough=0.2, emit=('#ffd77a', 5.0))
		bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.02, major_segments=64, minor_segments=12, location=head_top)
		h = bpy.context.active_object; h.name = name + '_halo'; h.data.materials.append(halo)
		to_bone(h, 'Head' if rig.pose.bones.get('Head') else rig.pose.bones[0].name)
		wing = pbr(name + '_wing', '#f6f1e8', rough=0.75, emit=('#fff3dc', 0.3))
		B['wings'] = []
		fwd = (Rq @ Vector((0, -1, 0))).normalized(); side = (Rq @ Vector((1, 0, 0))).normalized(); up = Vector((0, 0, 1))
		back = -fwd
		for sy in (-1, 1):
			wp = empty(f'{name}_wing{sy}', (0, 0, 0))
			X = back; Z = up; Y = Z.cross(X)
			wp.matrix_world = Matrix((( X.x, Y.x, Z.x, 0), (X.y, Y.y, Z.y, 0), (X.z, Y.z, Z.z, 0), (0, 0, 0, 1)))
			wp.location = shoulder + side * (0.2 * sy)
			for j, (ln, ang) in enumerate(((0.62, 18), (0.55, 34), (0.47, 50), (0.38, 66), (0.28, 82))):
				a = math.radians(ang)
				d = Vector((math.cos(a), 0, math.sin(a))); zf = Vector((0, sy, 0)); yf = zf.cross(d)
				Mf = Matrix(((d.x, yf.x, zf.x, 0), (d.y, yf.y, zf.y, 0), (d.z, yf.z, zf.z, 0), (0, 0, 0, 1)))
				fo = prim('sphere', f'{name}_f{sy}{j}', wing, (0, 0, 0), (1, 1, 1), u=24, v=12)
				fo.parent = wp
				fo.matrix_basis = Matrix.Translation(d * ln * 0.48) @ Mf @ Matrix.Diagonal((ln / 2, 0.07, 0.014, 1))
			to_bone(wp, 'Torso' if rig.pose.bones.get('Torso') else rig.pose.bones[0].name); B['wings'].append(wp)
		B['wing_base'] = [w.matrix_basis.copy() for w in B['wings']]
	R.location = loc; R.rotation_euler = (0, 0, yaw); R.scale = (s, s, s)
	BOARS.append(B)
	return B

def mouth_potato(B):
	"""a potato held in the boar's mouth (parented to the Head bone); returns it (detach it to drop it)"""
	import pw
	rig = B['rig']; bpy.context.view_layer.update()
	pt = pw.potato(B['name'] + '_mouthpot', 1.35)
	pos = B['S_'].matrix_world @ Vector((0, -5.45, 2.35))
	mw = Matrix.LocRotScale(pos, Euler((0.3, 0.2, 1.2)), Vector(pt.scale))
	pt.parent = rig; pt.parent_type = 'BONE'; pt.parent_bone = 'Head'
	bpy.context.view_layer.update(); pt.matrix_world = mw
	return pt

def boar_pd_tick(B, t):
	rig = B['rig']; pbs = rig.pose.bones
	for pb in pbs: pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, 0)
	m = B['mode']; tl = t - B.get('t0', 0.0); up = B.get('look', 0.0)
	hd = pbs.get('Head')
	if hd is None: return
	if m == 'chew':
		c = math.sin(tl * 2 * math.pi * 2.2)
		hd.rotation_euler = (math.radians(18 - 5 * c) * (1 - up) + math.radians(-14) * up, math.sin(tl * 1.2) * 0.08 * (1 - up), 0)
	elif m == 'float':
		hd.rotation_euler = (math.radians(-6) + math.sin(t * 1.4) * 0.05, 0, 0)
		for k, w in enumerate(B.get('wings', [])):
			ang = (1 if k else -1) * (math.radians(15) + math.sin(t * 7.0) * math.radians(22))
			w.matrix_basis = B['wing_base'][k] @ Matrix.Rotation(-ang, 4, 'X')
	else:
		hd.rotation_euler = (math.radians(6) * (1 - up) + math.radians(-14) * up, math.sin(t * 0.8) * 0.08, 0)
