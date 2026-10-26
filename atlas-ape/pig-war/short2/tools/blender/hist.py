"""v2 «living oil painting» kit (owner 22.10: no toy figures, more historical, less cartoon).
Realistic people from MPFB/MakeHuman (CC0 assets, ~/shorts/tools/mpfb_assets, isolated Blender profile
~/shorts/tools/blender_user — run.sh sets BLENDER_USER_RESOURCES), 1859 roles with recoloured period clothes and
procedural hats/props, pose library on the MPFB «default» rig, Poly Haven CC0 models (assets/ph_models) and cloudy
HDRI skies (assets/hdri), rendered through paint.py (Kuwahara oil strokes + canvas + period grade).
Shot scripts:  from hist import *  → setup_hist(*SHOT(k)) → build → render2(update, k)."""
import bpy, bmesh, math, os, random, json
from pathlib import Path
from mathutils import Vector, Matrix, Euler, Quaternion
from kit import *
from yf2 import *
import kit, yf2, paint

ROOT = kit.ROOT
PH = ROOT / 'assets/ph_models'
HDRI = ROOT / 'assets/hdri'
UPDATERS = []

def _mpfb():
	try:
		bpy.ops.preferences.addon_enable(module='bl_ext.user_default.mpfb')
	except Exception as e:
		print('MPFB enable failed', e)
	from bl_ext.user_default.mpfb.services.humanservice import HumanService
	from bl_ext.user_default.mpfb.services.targetservice import TargetService
	from bl_ext.user_default.mpfb.services.locationservice import LocationService
	return HumanService, TargetService, LocationService

# ====================================================================================================== render setup
def setup_hist(t0, t1, samples=None, hdri='kloofendal_48d_partly_cloudy_puresky', sky_rot=150.0, sky=1.0, sun=None, paint_size=18, exposure=0.0):
	sc_ = setup2(t0, t1, samples)
	sc_.view_settings.view_transform = 'AgX'
	try: sc_.view_settings.look = 'AgX - Medium High Contrast'
	except Exception: pass
	sc_.view_settings.exposure = exposure
	world_sky(hdri, sky_rot, sky)
	S = {'sun': None}
	for k_, v_ in (('compositor_device', 'GPU'), ('compositor_precision', 'AUTO')):
		try: setattr(sc_.render, k_, v_)
		except Exception as e: print('no', k_, e)
	for k_, v_ in (('shadow_resolution_scale', 0.5), ('shadow_ray_count', 1), ('shadow_step_count', 4), ('volumetric_tile_size', '8'), ('fast_gi_resolution', '4')):
		try: setattr(sc_.eevee, k_, v_)
		except Exception as e: print('no', k_, e)
	if flag('nort'):
		sc_.eevee.use_raytracing = False
	if sun:
		S['sun'] = sun2(*sun)
	if not flag('nopaint'):
		k_ = sc_.render.resolution_percentage / 100
		paint.setup_paint(sc_, size=max(3, round(paint_size * k_)), fine=max(2, round(6 * k_)))
	return sc_

def world_sky(name, rot=0.0, strength=1.0):
	"""a real cloudy sky HDRI seen by the camera AND lighting the scene (the painting filter turns it into a painted sky)"""
	wd = bpy.data.worlds.new('sky'); bpy.context.scene.world = wd; wd.use_nodes = True
	nt = wd.node_tree; nt.nodes.clear()
	wo = node(nt, 'ShaderNodeOutputWorld', (600, 0))
	tc = node(nt, 'ShaderNodeTexCoord', (-600, 0))
	mp = node(nt, 'ShaderNodeMapping', (-400, 0)); mp.inputs['Rotation'].default_value = (0, 0, math.radians(rot))
	link(nt, tc.outputs['Generated'], mp.inputs['Vector'])
	env = node(nt, 'ShaderNodeTexEnvironment', (-200, 0)); env.image = bpy.data.images.load(str(HDRI / f'{name}_4k.hdr'), check_existing=True)
	link(nt, mp.outputs['Vector'], env.inputs['Vector'])
	bg = node(nt, 'ShaderNodeBackground', (200, 0)); bg.inputs['Strength'].default_value = strength
	link(nt, env.outputs['Color'], bg.inputs['Color']); link(nt, bg.outputs[0], wo.inputs['Surface'])
	return wd

def render2(update, out_rel, track=None):
	def upd(t):
		update(t)
		for P in HUMANS: pose_tick(P, t)
		tick_v2(t)
		bpy.context.view_layer.update()
		for f in UPDATERS: f(t)
	return kit.render(upd, out_rel, track)

# ====================================================================================================== Poly Haven models
_ph_cache = {}
def ph(name, loc=(0, 0, 0), rot_z=0.0, s=1.0, parent=None, link_copy=True):
	"""Poly Haven CC0 glTF model (assets/ph_models/<id>) → root empty; repeated calls make linked duplicates (cheap)"""
	if link_copy and name in _ph_cache:
		src = _ph_cache[name]
		root = empty(f'{name}_{len(bpy.data.objects)}', loc, parent); root.rotation_euler = (0, 0, rot_z); root.scale = (s, s, s)
		for ch in src['meshes']:
			d = ch.copy(); bpy.context.scene.collection.objects.link(d); d.parent = root
			d.matrix_parent_inverse = Matrix.Identity(4); d.matrix_basis = src['local'][ch.name]
		return root
	d = PH / name
	f = next(iter(sorted(d.glob('*.gltf'))))
	before = set(bpy.data.objects)
	bpy.ops.import_scene.gltf(filepath=str(f))
	new = [o for o in bpy.data.objects if o not in before]
	root = empty(f'{name}_0', loc, parent); root.rotation_euler = (0, 0, rot_z); root.scale = (s, s, s)
	bpy.context.view_layer.update()
	local = {}
	meshes = []
	for o in new:
		if o.type == 'MESH':
			mw = o.matrix_world.copy(); o.parent = root; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
			local[o.name] = mw; meshes.append(o)
		elif o.type != 'MESH' and o not in meshes:
			pass
	for o in new:
		if o.type != 'MESH':
			try: bpy.data.objects.remove(o)
			except Exception: pass
	_ph_cache[name] = {'meshes': meshes, 'local': local}
	return root

# ====================================================================================================== materials helpers
def tint_material(m, hexcol, amount=1.0, keep=0.35, rough=None):
	"""recolour a textured material: base colour → (texture luminance re-lit) × target colour; keeps folds/weave detail"""
	if not m or not m.use_nodes: return m
	nt = m.node_tree
	bs = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
	if bs is None: return m
	inp = bs.inputs['Base Color']
	src = inp.links[0].from_socket if inp.is_linked else None
	tgt = C(hexcol)
	if src is None:
		inp.default_value = (*tgt, 1)
	else:
		bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(src, bw.inputs[0])
		mr = nt.nodes.new('ShaderNodeMapRange'); nt.links.new(bw.outputs[0], mr.inputs['Value'])
		mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 0.6
		mr.inputs['To Min'].default_value = 1 - keep; mr.inputs['To Max'].default_value = 1 + keep * 0.5
		mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
		mx.inputs[6].default_value = (*tgt, 1); nt.links.new(mr.outputs[0], mx.inputs[7])
		if amount < 1.0:
			mm = nt.nodes.new('ShaderNodeMix'); mm.data_type = 'RGBA'; mm.inputs['Factor'].default_value = amount
			nt.links.new(src, mm.inputs[6]); nt.links.new(mx.outputs[2], mm.inputs[7]); nt.links.new(mm.outputs[2], inp)
		else:
			nt.links.new(mx.outputs[2], inp)
	if rough is not None:
		if bs.inputs['Roughness'].is_linked:
			nt.links.remove(bs.inputs['Roughness'].links[0])
		bs.inputs['Roughness'].default_value = rough
	return m

def tint_dark(m, hexcol, rough=None, lo=0.10, hi=0.32):
	"""recolour only the DARK cloth of a texture (black suit → navy / scarlet / white) and keep light parts (shirt, buttons):
	colour = target × local detail (texture luminance / its typical dark value), blended in where luminance < lo…hi"""
	if not m or not m.use_nodes: return m
	nt = m.node_tree
	bs = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
	if bs is None: return m
	inp = bs.inputs['Base Color']
	src = inp.links[0].from_socket if inp.is_linked else None
	if src is None:
		inp.default_value = (*C(hexcol), 1); return m
	bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(src, bw.inputs[0])
	det = nt.nodes.new('ShaderNodeMapRange'); nt.links.new(bw.outputs[0], det.inputs['Value'])
	det.inputs['From Min'].default_value = 0.0; det.inputs['From Max'].default_value = 0.12
	det.inputs['To Min'].default_value = 0.55; det.inputs['To Max'].default_value = 1.25
	col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'; col.blend_type = 'MULTIPLY'; col.inputs['Factor'].default_value = 1.0
	col.inputs[6].default_value = (*C(hexcol), 1); nt.links.new(det.outputs[0], col.inputs[7])
	fac = nt.nodes.new('ShaderNodeMapRange'); nt.links.new(bw.outputs[0], fac.inputs['Value'])
	fac.inputs['From Min'].default_value = lo; fac.inputs['From Max'].default_value = hi
	fac.inputs['To Min'].default_value = 1.0; fac.inputs['To Max'].default_value = 0.0
	mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.clamp_factor = True
	nt.links.new(fac.outputs[0], mx.inputs['Factor']); nt.links.new(src, mx.inputs[6]); nt.links.new(col.outputs[2], mx.inputs[7])
	nt.links.new(mx.outputs[2], inp)
	if rough is not None:
		if bs.inputs['Roughness'].is_linked: nt.links.remove(bs.inputs['Roughness'].links[0])
		bs.inputs['Roughness'].default_value = rough
	return m

def split_material(o, z_cut, mat_low_name, world_z=True):
	"""duplicate the object's material into a second slot used by every face below z_cut (e.g. trousers vs. coat)"""
	if not o.data.materials: return None
	m0 = o.data.materials[0]; m1 = m0.copy(); m1.name = mat_low_name
	o.data.materials.append(m1)
	mw = o.matrix_world
	for p in o.data.polygons:
		c = mw @ p.center if world_z else p.center
		if c.z < z_cut: p.material_index = 1
	return m1

# ====================================================================================================== people
D_ASSETS = Path.home() / 'shorts/tools/mpfb_assets/data'
def _a(*p): return str(D_ASSETS.joinpath(*p))
def _mhclo(kind, name):
	d = D_ASSETS / kind / name
	f = next(iter(sorted(d.glob('*.mhclo'))), None)
	return str(f) if f else None

# role → body, skin, hair, clothes (+ recolours), procedural hats
ROLES = {
	'us': dict(skin='young_caucasian_male', hair='short02', clothes=['male_elegantsuit01', 'shoes02'], cap='mindfront_patrol_cap',
	           coat='#2b3a6a', legs='#8ea6cc', cap_col='#232c52', age=0.45, dark_only=True),
	'uk': dict(skin='middleage_caucasian_male', hair='short04', clothes=['male_elegantsuit01', 'shoes02'], hat='shako',
	           coat='#b3262d', legs='#1f2338', age=0.5, dark_only=True),
	'farmer': dict(skin='toigo_light_skin_male_ginger', hair='short03', clothes=['male_casualsuit03', 'shoes03'], hat='elvs_male_trilby_hat',
	               coat=None, legs='#5a4634', hat_col='#cdb071', age=0.45),
	'owner': dict(skin='jartur69_middleage_slavic_male_with_genitals_and_beard', hair='short01', clothes=['male_casualsuit05', 'shoes02'],
	              hat='culturalibre_cl_bowler_hat', coat='#6a5136', legs='#3b332c', age=0.6, weight=0.66),
	'governor': dict(skin='middleage_caucasian_male', hair='short02', clothes=['male_elegantsuit01', 'shoes02'], hat='elvs_tophat1',
	                 coat=None, legs=None, age=0.65, weight=0.62),
	'admiral': dict(skin='old_caucasian_male', hair='short01', clothes=['male_elegantsuit01', 'shoes02'], hat='bicorne',
	                coat='#1d2650', legs='#e4e0d4', age=0.85, epaulettes=True, dark_only=True),
	'kaiser': dict(skin='jartur69_old_slavic_male_with_genitals_and_beard', hair='short01', clothes=['male_elegantsuit01', 'shoes02'], hat='pickelhaube',
	               coat='#222d4e', legs='#17171b', age=0.9, epaulettes=True, dark_only=True),
}
HUMANS = []

def human(name, role='us', loc=(0, 0, 0), yaw=0.0, seed=0, height=None, pose='stand'):
	"""a MakeHuman man for a role; faces −Y at yaw 0 (radians). Returns dict: root, rig, objs, role, pose state"""
	HS, TS, LS = _mpfb()
	R = ROLES[role]; rnd = random.Random(seed * 31 + 7)
	mac = TS.get_default_macro_info_dict()
	mac.update({'gender': 1.0, 'age': R.get('age', 0.5) + rnd.uniform(-0.05, 0.05), 'muscle': 0.55 + rnd.uniform(-0.1, 0.15),
	            'weight': R.get('weight', 0.5) + rnd.uniform(-0.08, 0.08), 'height': height if height is not None else 0.55 + rnd.uniform(-0.1, 0.1),
	            'proportions': 0.6})
	mac['race'] = {'african': 0.0, 'asian': 0.0, 'caucasian': 1.0}
	before = set(bpy.data.objects)
	h = HS.create_human(macro_detail_dict=mac)
	HS.add_builtin_rig(h, 'default')          # rig FIRST: assets added afterwards get their armature + weights
	sk = D_ASSETS / 'skins' / R['skin']
	mh = next(iter(sorted(sk.glob('*.mhmat'))), None)
	if mh: HS.set_character_skin(str(mh), h, skin_type='ENHANCED_SSS')
	for kind, nm in (('Eyes', 'high-poly'), ('Eyebrows', 'eyebrow00%d' % (1 + seed % 9)), ('Eyelashes', 'eyelashes01'), ('Hair', R['hair'])):
		sub = {'Eyes': 'eyes', 'Eyebrows': 'eyebrows', 'Eyelashes': 'eyelashes', 'Hair': 'hair'}[kind]
		f = _mhclo(sub, nm)
		if f:
			try: HS.add_mhclo_asset(f, h, asset_type=kind, subdiv_levels=0)
			except Exception as e: print('asset fail', kind, nm, e)
	for c in R['clothes'] + ([R['cap']] if 'cap' in R else []) + ([R['hat']] if R.get('hat') and _mhclo('clothes', R['hat']) else []):
		f = _mhclo('clothes', c)
		if f:
			try: HS.add_mhclo_asset(f, h, asset_type='Clothes', subdiv_levels=1)
			except Exception as e: print('clothes fail', c, e)
	new = [o for o in bpy.data.objects if o not in before]
	rig = next(o for o in new if o.type == 'ARMATURE')
	root = empty(name, loc); root.rotation_euler = (0, 0, yaw)
	rig.parent = root
	# recolour the period clothes
	for o in new:
		if o.type != 'MESH': continue
		nm = o.name.lower()
		if any(k in nm for k in ('worksuit', 'casualsuit', 'elegantsuit')):
			m0 = o.data.materials[0]; m0 = m0.copy(); o.data.materials[0] = m0
			ml = split_material(o, 0.93, o.name + '_legs')
			fn = tint_material
			if R.get('coat'): fn(m0, R['coat'], rough=0.8)
			if R.get('legs'): fn(ml, R['legs'], rough=0.85)
		elif R.get('hat_col') and R.get('hat', '') in nm:
			m0 = o.data.materials[0].copy(); o.data.materials[0] = m0; tint_material(m0, R['hat_col'], rough=0.85)
		elif 'patrol_cap' in nm:
			m0 = o.data.materials[0].copy(); o.data.materials[0] = m0; tint_material(m0, R.get('cap_col', '#232c52'), rough=0.7)
		elif 'shoes' in nm:
			m0 = o.data.materials[0].copy(); o.data.materials[0] = m0; tint_material(m0, '#1b1716', rough=0.35)
	P = {'name': name, 'root': root, 'rig': rig, 'objs': new, 'role': role, 'base': h, 'pose': pose, 'pose_t0': 0.0, 'prev': None,
	     'blend': 0.3, 'seed': seed, 'extra': {}}
	if R.get('dark_only') and R.get('coat'):
		tunic_front(P, R['coat'], buttons=True)
	if R.get('hat') in ('shako', 'bicorne', 'pickelhaube', 'straw'):
		hat_proc(P, R['hat'])
	if R.get('epaulettes'): epaulettes(P)
	HUMANS.append(P)
	return P

def bone_world(P, bone, head=True):
	pb = P['rig'].pose.bones[bone]
	return P['rig'].matrix_world @ (pb.head if head else pb.tail)

def attach_bone(P, obj, bone, world_matrix):
	"""parent obj to a pose bone keeping world_matrix (computed at the current pose)"""
	rig = P['rig']; bpy.context.view_layer.update()
	obj.parent = rig; obj.parent_type = 'BONE'; obj.parent_bone = bone
	bpy.context.view_layer.update()
	obj.matrix_world = world_matrix
	return obj

def head_frame(P):
	"""(top-of-head point, forward vector, up vector) in world space at rest"""
	bpy.context.view_layer.update()
	rig = P['rig']; hb = rig.pose.bones['head']
	m = rig.matrix_world @ hb.matrix
	top = rig.matrix_world @ hb.tail
	fwd = (m.to_quaternion() @ Vector((0, 0, -1))).normalized()
	return top, m

M_ = {}
def mat(key, hexc_, rough=0.55, metal=0.0, emit=None):
	if key not in M_: M_[key] = pbr('h_' + key, hexc_, rough=rough, metal=metal, emit=emit)
	return M_[key]

def hat_proc(P, kind):
	"""procedural period hats on the head bone (no CC0 asset exists): shako, bicorne, pickelhaube, straw hat"""
	bpy.context.view_layer.update()
	rig = P['rig']; hb = rig.pose.bones['head']
	Mh = rig.matrix_world @ hb.matrix                    # head bone frame (Y = up along the bone)
	top = rig.matrix_world @ hb.tail
	s = 0.92                                              # sizes below are metres for an average head
	CROWN = -0.055                                        # hat base sits this far below the bone tail (the crown)
	parts = []
	if kind == 'shako':      # Royal Marines 1850s: black felt shako, leather peak, brass plate, white ball tuft
		felt = mat('shakofelt', '#141317', 0.6); lea = mat('leather', '#0e0c0c', 0.25); brass = mat('brass', '#c99a3e', 0.3, 0.9)
		parts += [prim('cyl', 'sk_c', felt, (0, 0.07 * s, 0), (0.105 * s, 0.105 * s, 0.085 * s), seg=40, r2=1.12, rot=(-math.pi / 2, 0, 0)),
		          prim('cyl', 'sk_t', lea, (0, 0.157 * s, 0), (0.118 * s, 0.118 * s, 0.006 * s), seg=40, rot=(-math.pi / 2, 0, 0)),
		          prim('sphere', 'sk_b', mat('tuft', '#f2efe6', 0.9), (0, 0.18 * s, -0.04 * s), (0.028 * s,) * 3),
		          prim('cyl', 'sk_p', brass, (0, 0.06 * s, -0.103 * s), (0.03 * s, 0.03 * s, 0.003 * s), seg=24)]
		pk = prim('cube', 'sk_pk', lea, (0, -0.005 * s, -0.11 * s), (0.08 * s, 0.003 * s, 0.045 * s), rot=(math.radians(-15), 0, 0)); parts.append(pk)
	elif kind == 'bicorne':  # naval officer's cocked hat worn athwartships, gold lace + cockade
		felt = mat('bifelt', '#111015', 0.55); gold = mat('gold', '#d4a640', 0.3, 0.9)
		bm = bmesh.new(); n = 28; Rw, Rz, th = 0.2 * s, 0.11 * s, 0.035 * s
		for z in (-th / 2, th / 2):
			ring = [bm.verts.new((-math.cos(math.pi * i / n) * Rw, math.sin(math.pi * i / n) * Rz, z)) for i in range(n + 1)]
			bm.faces.new(ring if z > 0 else ring[::-1])
		bm.verts.ensure_lookup_table(); A_ = bm.verts[:n + 1]; B_ = bm.verts[n + 1:]
		for i in range(n): bm.faces.new((A_[i], A_[i + 1], B_[i + 1], B_[i]))
		bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
		me = bpy.data.meshes.new('bicorne'); bm.to_mesh(me); bm.free()
		o = obj_from_mesh('bi_h', me, felt, (0, 0.035 * s, 0)); o.modifiers.new('b', 'BEVEL').width = 0.006 * s; parts.append(o)
		parts.append(prim('cyl', 'bi_g', gold, (0, 0.09 * s, -th / 2 - 0.002), (0.022 * s, 0.022 * s, 0.002), seg=24))
	elif kind == 'pickelhaube':
		lea = mat('pickel', '#0c0b0d', 0.18); brass = mat('brass', '#c99a3e', 0.3, 0.9)
		parts += [prim('sphere', 'ph_d', lea, (0, 0.02 * s, 0), (0.105 * s, 0.11 * s, 0.115 * s), u=40, v=20),
		          prim('cyl', 'ph_s', brass, (0, 0.17 * s, 0), (0.012 * s, 0.012 * s, 0.05 * s), seg=16, r2=0.15, rot=(-math.pi / 2, 0, 0)),
		          prim('cyl', 'ph_sb', brass, (0, 0.125 * s, 0), (0.026 * s, 0.026 * s, 0.012 * s), seg=24, rot=(-math.pi / 2, 0, 0)),
		          prim('sphere', 'ph_e', brass, (0, 0.04 * s, -0.104 * s), (0.04 * s, 0.045 * s, 0.006 * s))]
		parts.append(prim('cube', 'ph_v', lea, (0, -0.035 * s, -0.11 * s), (0.08 * s, 0.003 * s, 0.04 * s), rot=(math.radians(-12), 0, 0)))
	elif kind == 'straw':
		straw = pbr('straw', '#cfae6a', 'weathered_planks', 6.0, 0.4, 0.85); band = mat('band', '#5a2a22', 0.6)
		parts += [prim('cyl', 'st_b', straw, (0, 0.035 * s, 0), (0.2 * s, 0.2 * s, 0.006 * s), seg=48, rot=(-math.pi / 2, 0, 0)),
		          prim('cyl', 'st_c', straw, (0, 0.085 * s, 0), (0.095 * s, 0.095 * s, 0.05 * s), seg=40, r2=0.9, rot=(-math.pi / 2, 0, 0)),
		          prim('cyl', 'st_r', band, (0, 0.05 * s, 0), (0.097 * s, 0.097 * s, 0.012 * s), seg=40, rot=(-math.pi / 2, 0, 0))]
	# the parts are in head-bone-local coordinates relative to the bone TAIL (top of the skull)
	for o in parts:
		local = Matrix.LocRotScale(o.location, o.rotation_euler, o.scale)
		o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.scale = (1, 1, 1)
		W_ = Mh @ Matrix.Translation(Vector((0, hb.length + CROWN, 0))) @ local
		attach_bone(P, o, 'head', W_)
	P['extra']['hat'] = parts

def tunic_front(P, coat_hex, buttons=True):
	"""1850s tunic look on the suit: a coat-coloured buttoned front over the shirt-and-tie V and a stand collar round the
	neck, brass buttons down the middle (attached to the chest bone)"""
	bpy.context.view_layer.update()
	jacket = next((o for o in P['objs'] if o.type == 'MESH' and 'suit' in o.name.lower()), None)
	if jacket is None: return
	dg = bpy.context.evaluated_depsgraph_get(); ev = jacket.evaluated_get(dg); me = ev.to_mesh()
	pts = [ev.matrix_world @ v.co for v in me.vertices]
	rootw = P['root'].matrix_world
	inv = rootw.inverted()
	loc_pts = [inv @ p for p in pts]
	nk = inv @ (P['rig'].matrix_world @ P['rig'].pose.bones['neck01'].head)
	zc = nk.z - 0.2
	chest = [p for p in loc_pts if abs(p.x) < 0.06 and zc - 0.15 < p.z < zc + 0.12]
	ev.to_mesh_clear()
	if not chest: return
	yf = min(p.y for p in chest)                     # most forward point of the jacket front (character faces −y)
	cm = pbr('tunic_' + coat_hex, coat_hex, 'weathered_planks', 8.0, 0.12, 0.85)
	brass = mat('brass', '#c99a3e', 0.3, 0.9)
	bone = 'spine01' if P['rig'].pose.bones.get('spine01') else 'spine02'
	def add(o):
		bpy.context.view_layer.update()
		W_ = rootw @ Matrix.LocRotScale(o.location, o.rotation_euler, o.scale)
		o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.scale = (1, 1, 1)
		attach_bone(P, o, bone, W_)
	if buttons:
		for k in range(6):
			add(prim('sphere', f"{P['name']}_btn{k}", brass, (0, yf - 0.004, zc + 0.12 - k * 0.055), (0.009, 0.006, 0.009)))

def epaulettes(P):
	gold = mat('gold', '#d4a640', 0.3, 0.9)
	bpy.context.view_layer.update()
	for side in ('L', 'R'):
		b = P['rig'].pose.bones[f'shoulder01.{side}']
		Wm = P['rig'].matrix_world @ b.matrix
		o = prim('cyl', f'ep_{side}', gold, (0, 0, 0), (0.045, 0.045, 0.01), seg=24)
		sc_o = Matrix.Diagonal((0.045, 0.045, 0.01, 1.0)); o.scale = (1, 1, 1)
		attach_bone(P, o, f'shoulder01.{side}', Wm @ Matrix.Translation(Vector((0, b.length * 0.8, 0.0))) @ sc_o)

# ------------------------------------------------------------------ poses (bone → XYZ Euler degrees, bone-local; tuned on renders)
# poses = bone → direction in ARMATURE space (x = the man's left, −y = forward, z = up) for limb bones (DIR),
# plus plain Euler degrees for twist-like bones (EUL). Directions are turned into bone rotations by aim_bones().
V_ = Vector
# hand targets ('ik.R' / 'ik.L') are offsets from the shoulder midpoint in the man's own frame (x = his left, −y = forward,
# z = up), metres; an optional 'pole.R'/'pole.L' says where the elbow points. Converted to bone directions by ik_dirs().
POSES = {
	'rest': {},
	'stand': {'ik.R': (-0.22, -0.03, -0.54), 'ik.L': (0.22, -0.03, -0.54)},
	'point': {'ik.R': (-0.24, -0.6, 0.1), 'ik.L': (0.23, -0.04, -0.5)},
	'aim': {'ik.R': (-0.14, -0.14, 0.03), 'ik.L': (-0.12, -0.5, 0.0), 'pole.L': (0.6, -0.2, -1.0), 'pole.R': (-1.0, 0.3, -0.6), 'rifle': 'aim'},
	'hold': {'ik.R': (-0.1, -0.36, -0.14), 'ik.L': (0.1, -0.36, -0.14)},
	'offer': {'ik.R': (-0.14, -0.5, -0.1), 'ik.L': (0.23, -0.04, -0.5)},
	'raise': {'ik.R': (-0.24, -0.12, 0.5), 'ik.L': (0.23, -0.04, -0.5), 'pole.R': (-1.0, 0.4, 0.2)},
	'cheer': {'ik.R': (-0.3, -0.12, 0.48), 'ik.L': (0.3, -0.12, 0.48), 'pole.R': (-1, 0.4, 0.2), 'pole.L': (1, 0.4, 0.2)},
	'toast': {'ik.R': (-0.16, -0.38, 0.22), 'ik.L': (0.23, -0.04, -0.5)},
	'behind': {'ik.R': (-0.07, 0.17, -0.48), 'ik.L': (0.07, 0.17, -0.48), 'pole.R': (-1, 0.6, -0.4), 'pole.L': (1, 0.6, -0.4)},
	'shoulder': {'ik.R': (-0.24, -0.1, -0.4), 'ik.L': (0.23, -0.04, -0.5), 'rifle': 'shoulder'},
	'port': {'ik.R': (-0.13, -0.3, -0.3), 'ik.L': (0.06, -0.33, 0.02), 'rifle': 'port'},
}
def ik_dirs(rig, side, off, pole=None):
	"""two-bone IK for one arm: hand to shoulder-midpoint + off → directions of upperarm01 / lowerarm01 (armature space)"""
	B = rig.data.bones
	b1, b2, w = B[f'upperarm01.{side}'], B[f'lowerarm01.{side}'], B[f'wrist.{side}']
	mid = (B['upperarm01.L'].head_local + B['upperarm01.R'].head_local) / 2
	S = b1.head_local; T = mid + Vector(off)
	l1 = (b2.head_local - S).length; l2 = (w.head_local - b2.head_local).length
	D = T - S; d = max(0.05, min(D.length, l1 + l2 - 1e-3)); Dn = D.normalized()
	a = max(-1.0, min(1.0, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))
	pv = Vector(pole if pole else ((-0.25 if side == 'R' else 0.25), 0.9, -0.6))
	pp = (pv - Dn * pv.dot(Dn))
	pp = pp.normalized() if pp.length > 1e-6 else Vector((0, 0, -1))
	E = S + Dn * (l1 * a) + pp * (l1 * math.sqrt(max(0.0, 1 - a * a)))
	T2 = S + Dn * d
	return {f'upperarm01.{side}': tuple(E - S), f'lowerarm01.{side}': tuple(T2 - E)}

def expand_pose(rig, P_):
	"""ik.R / ik.L entries → bone directions (others pass through)"""
	out = {k: v for k, v in P_.items() if not (k.startswith('ik.') or k.startswith('pole.') or k == 'rifle')}
	for side in ('R', 'L'):
		if f'ik.{side}' in P_:
			out.update(ik_dirs(rig, side, P_[f'ik.{side}'], P_.get(f'pole.{side}')))
	return out
LEG_BONES = ('upperleg01.L', 'upperleg01.R', 'lowerleg01.L', 'lowerleg01.R')
def walk_pose(phase, stride=1.0, base='stand'):
	"""procedural walk cycle (phase in cycles): thighs swing, knees bend on the back swing, arms counter-swing"""
	a = math.sin(2 * math.pi * phase); b = -a
	P_ = dict(POSES[base])
	for side, sw in (('L', a), ('R', b)):
		th = math.radians(26 * sw * stride)
		P_[f'upperleg01.{side}'] = (0.0, -math.sin(th), -math.cos(th))
		kn = math.radians(max(0.0, math.sin(2 * math.pi * phase + (0 if side == 'L' else math.pi) + 1.2)) * 50 * stride)
		P_[f'lowerleg01.{side}'] = (0.0, -math.sin(th) + math.sin(kn) * 0.9, -math.cos(th))
		if base == 'stand':
			sx = 0.23 if side == 'L' else -0.23
			P_[f'ik.{side}'] = (sx, 0.16 * sw * stride, -0.5)
	return P_

ARM_ORDER = ['upperleg01.L', 'upperleg01.R', 'lowerleg01.L', 'lowerleg01.R', 'upperarm01.L', 'upperarm01.R', 'lowerarm01.L', 'lowerarm01.R', 'wrist.L', 'wrist.R']
def aim_bones(rig, dirs):
	"""rotate each listed bone so its Y axis points along dirs[bone] (armature space), parents first. Pose matrices are
	computed by hand down the chain (all other bones are at rest after pose_tick's reset) — no depsgraph update per bone."""
	memo = {}
	rot = {}
	def pmat(pb):
		if pb.name in memo: return memo[pb.name]
		B = pb.bone.matrix_local
		if pb.parent:
			M_ = pmat(pb.parent) @ (pb.parent.bone.matrix_local.inverted() @ B)
		else:
			M_ = B.copy()
		if pb.name in rot: M_ = M_ @ rot[pb.name].to_matrix().to_4x4()
		memo[pb.name] = M_
		return M_
	order = [b for b in ARM_ORDER if b in dirs] + [b for b in dirs if b not in ARM_ORDER]
	for bname in order:
		pb = rig.pose.bones.get(bname)
		if pb is None: continue
		d = Vector(dirs[bname]).normalized()
		B = pb.bone.matrix_local
		Pm = (pmat(pb.parent) @ (pb.parent.bone.matrix_local.inverted() @ B)) if pb.parent else B
		M3 = Pm.to_3x3().normalized()
		y0 = M3 @ Vector((0, 1, 0))
		Q = y0.rotation_difference(d)
		Rb = (M3.inverted() @ Q.to_matrix() @ M3).to_quaternion()
		rot[bname] = Rb
		pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = Rb

def set_pose(P, name, t0=None, blend=0.3):
	if P['pose'] != name:
		P['prev'] = P['pose']; P['pose'] = name; P['pose_t0'] = t0 if t0 is not None else 0.0; P['blend'] = blend

def _apply(rig, pose, k=1.0, base=None):
	for bname, e in pose.items():
		pb = rig.pose.bones.get(bname)
		if not pb: continue
		pb.rotation_mode = 'XYZ'
		v = Vector(tuple(math.radians(a) for a in e))
		if base is not None and bname in base:
			v0 = Vector(tuple(math.radians(a) for a in base[bname])); v = v0.lerp(v, k)
		else:
			v = v * k
		pb.rotation_euler = Euler(v, 'XYZ')

def _pose_dict(P, which, t):
	v = P[which]
	if callable(v): return v(P, t)
	return POSES.get(v, {})

def pose_tick(P, t):
	rig = P['rig']
	for pb in rig.pose.bones:
		pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0)
	raw = _pose_dict(P, 'pose', t)
	P['rifle_mode'] = raw.get('rifle', P.get('rifle_mode', 'aim'))
	cur = expand_pose(rig, raw)
	if P['prev'] is not None and t - P['pose_t0'] < P['blend']:
		prev = expand_pose(rig, _pose_dict(P, 'prev', t))
		k = ease((t - P['pose_t0']) / P['blend'])
		rest = {'upperarm01.L': (0.42, 0.0, -0.9), 'upperarm01.R': (-0.42, 0.0, -0.9)}
		keys = set(prev) | set(cur)
		cur = {b: tuple(Vector(prev.get(b, cur.get(b))).normalized().lerp(Vector(cur.get(b, prev.get(b))).normalized(), k)) for b in keys}
	aim_bones(rig, {b: v for b, v in cur.items() if not b.startswith('@')})
	for b, e in cur.items():
		if b.startswith('@'):
			pb = rig.pose.bones.get(b[1:])
			if pb:
				pb.rotation_mode = 'XYZ'; pb.rotation_euler = Euler(tuple(math.radians(a) for a in e), 'XYZ')
	# breathing + idle sway so nobody freezes like a statue
	ph = P['seed'] * 1.7
	sp = rig.pose.bones.get('spine03')
	if sp: sp.rotation_mode = 'XYZ'; sp.rotation_euler.x += math.radians(1.2) * math.sin(t * 1.6 + ph)
	nk = rig.pose.bones.get('neck02')
	if nk and not any(k == '@head' for k in cur): nk.rotation_mode = 'XYZ'; nk.rotation_euler.y += math.radians(2.5) * math.sin(t * 0.7 + ph)


# ------------------------------------------------------------------ facial hair for MakeHuman heads (head bone)
def facial_hair(P, style='full', col='#5a3a26', length=1.0):
	"""style: full (beard + moustache, grows down when its root is scaled in z), chops (white mutton chops + moustache, Kaiser),
	whiskers (side whiskers). Returns the root empty (scale .z to grow)."""
	bpy.context.view_layer.update()
	rig = P['rig']; hb = rig.pose.bones['head']
	Mh = rig.matrix_world @ hb.matrix
	m = pbr('hair_' + col, col, rough=0.85)
	try: m.node_tree.nodes['Principled BSDF'].inputs['Sheen Weight'].default_value = 0.5
	except Exception: pass
	nm = P['name'] + '_fh'
	root = bpy.data.objects.new(nm, None); bpy.context.scene.collection.objects.link(root)
	# head-bone local frame: Y up along the neck→crown, −Z forward (face); chin ≈ (0, 0.0, −0.085)
	parts = []
	def blob(n, loc, size, rot=(0, 0, 0)):
		o = prim('sphere', n, m, loc, size, rot=rot, u=24, v=14)
		d = o.modifiers.new('d', 'DISPLACE'); tx = bpy.data.textures.new(n + 'tx', 'CLOUDS'); tx.noise_scale = 0.02; d.texture = tx; d.strength = 0.006
		parts.append(o); return o
	if style == 'full':
		blob(nm + 'b', (0, -0.1, 0.07), (0.048, 0.06, 0.03), rot=(math.radians(-15), 0, 0))
		blob(nm + 'j', (0, -0.07, 0.05), (0.064, 0.035, 0.04))
		blob(nm + 'm', (0, -0.018, 0.1), (0.032, 0.008, 0.011))
		piv = (0, -0.035, 0.07)
	elif style == 'chops':
		for sx in (-1, 1):
			blob(f'{nm}c{sx}', (sx * 0.064, -0.02, 0.035), (0.022, 0.05, 0.045))
			blob(f'{nm}d{sx}', (sx * 0.03, -0.01, 0.105), (0.032, 0.01, 0.013), rot=(0, 0, sx * math.radians(12)))
		piv = (0, -0.03, 0.06)
	else:
		for sx in (-1, 1): blob(f'{nm}w{sx}', (sx * 0.066, -0.01, 0.03), (0.016, 0.04, 0.03))
		piv = (0, -0.03, 0.05)
	root.location = piv
	for o in parts:
		o.location = Vector(o.location) - Vector(piv); o.parent = root
	W_ = Mh @ Matrix.Translation(Vector(piv))
	root.location = (0, 0, 0)
	attach_bone(P, root, 'head', W_)
	return root
