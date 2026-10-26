"""v2 island set in REAL metres (people 1.8 m): Cutlar's potato patch, the US camp on a rise, Griffin Bay with the British
frigate, Douglas firs (Poly Haven), grass clumps, the far mountains. Shared by every outdoor v2 shot.
  patch  x −6…6, y −4…3 (rows along X)        cabin (−11, 5)        hill (−16, 34, r 13, h 6)
  shore  y ≈ 52, bay beyond                     frigate ≈ (40, 120)   Mt Baker far NE
"""
import bpy, math, random
from mathutils import Vector, Matrix
from hist import *
import env, frigate as FG, animals

HILL = (-7.5, 19.0, 9.0, 3.8)
SHORE = 52.0
def ground_z(x, y):
	hx, hy, hr, hh = HILL
	d = math.hypot(x - hx, y - hy) / hr
	return hh * math.exp(-d * d * 2.2) if d < 1.6 else 0.0

_parts = {}
def ph_part(name, idx=None, prefer='small', max_verts=40000):
	"""one sub-mesh of a Poly Haven pack (they often hold several variants/LODs side by side), recentred on its base"""
	key = (name, idx, prefer)
	if key in _parts: return _parts[key]
	d = PH / name; f = next(iter(sorted(d.glob('*.gltf'))))
	before = set(bpy.data.objects)
	bpy.ops.import_scene.gltf(filepath=str(f))
	new = [o for o in bpy.data.objects if o not in before]
	meshes = sorted([o for o in new if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
	bpy.context.view_layer.update()
	if idx is None: pick = meshes[0] if prefer == 'small' else meshes[-1]
	else: pick = meshes[idx % len(meshes)]
	for o in new:
		if o is not pick:
			try: bpy.data.objects.remove(o)
			except Exception: pass
	mw = pick.matrix_world.copy(); pick.parent = None; pick.matrix_world = mw
	bpy.context.view_layer.update()
	pts = [pick.matrix_world @ Vector(c) for c in pick.bound_box]
	cx = sum(p.x for p in pts) / 8; cy = sum(p.y for p in pts) / 8; z0 = min(p.z for p in pts)
	pick.data.transform(Matrix.Translation(-Vector((0, 0, 0))))
	# bake the world transform into the mesh, recentre on the base centre
	pick.data.transform(pick.matrix_world); pick.matrix_world = Matrix.Identity(4)
	pick.data.transform(Matrix.Translation(Vector((-cx, -cy, -z0))))
	n = len(pick.data.vertices)
	if n > max_verts:
		dm = pick.modifiers.new('dec', 'DECIMATE'); dm.ratio = max_verts / n; dm.use_collapse_triangulate = False
		dg = bpy.context.evaluated_depsgraph_get(); ev = pick.evaluated_get(dg)
		newme = bpy.data.meshes.new_from_object(ev); pick.modifiers.remove(dm)
		old = pick.data; pick.data = newme; bpy.data.meshes.remove(old)
		print('decimated', name, n, '→', len(newme.vertices))
	pick.location = (0, 0, -1000); pick.name = f'{name}_proto{idx}'
	_parts[key] = pick
	return pick

def place(proto, loc, rot_z=0.0, s=1.0, name=None):
	o = proto.copy(); bpy.context.scene.collection.objects.link(o)
	o.location = loc; o.rotation_euler = (0, 0, rot_z); o.scale = (s, s, s)
	if name: o.name = name
	return o

def build2(patch=True, hill_camp=True, ships=1, ship_loc=(34.0, 92.0), ship_yaw=math.radians(-6), soldiers=5, firs=True, far=True,
           grass=500, grass_box=(-14, 14, -10, 12), keep_clear=(), cabin=True):
	S = {}
	S['ground'] = env.meadow('meadow', (420, 420), (0, 80), hills=[HILL, (30.0, 15.0, 15.0, 2.5), (-45, 10, 20, 4.0)], shore_y=SHORE, res=260)
	env.SHORE_Y = SHORE
	S['sea'] = env.sea('sea', (2400, 2400), (0, 900))
	if far:
		S['baker'] = env.mountain('baker', (-120, 720, -2), 230, 150, snow=0.5, seed=2, haze=0.45)
		S['oly'] = [env.mountain(f'oly{i}', (x, y, -2), r, h, snow=0.72, seed=i + 4, haze=0.55)
		            for i, (x, y, r, h) in enumerate(((280, 630, 180, 75), (430, 700, 210, 90), (120, 780, 160, 65)))]
		S['isl'] = [env.mountain(f'isle{i}', (x, y, -1.5), r, h, snow=2.0, seed=i + 9, haze=0.3, sky='#9fb4b0')
		            for i, (x, y, r, h) in enumerate(((-90, 210, 70, 14), (80, 250, 90, 17), (180, 210, 55, 11)))]
	if cabin:
		S['cabin'] = env.log_cabin('cabin', (-10.2, 4.8, 0.0), math.radians(10))
		S['cabin']['root'].scale = (2.9, 2.9, 2.9)
	if patch:
		S['patch'], S['pots'] = potato_patch2('patch', -6.0, 6.0, -4.0, 3.0, rows=6, keep_clear=keep_clear)
	if firs and not flag('nofirs'):
		fir = ph_part('fir_sapling_medium', prefer='small')
		rnd = random.Random(11); pts = []
		for _ in range(22): pts.append((rnd.uniform(-60, -20), rnd.uniform(5, 48)))
		for _ in range(14): pts.append((rnd.uniform(-30, -2), rnd.uniform(34, 48)))
		for _ in range(12): pts.append((rnd.uniform(48, 80), rnd.uniform(-5, 40)))
		S['firs'] = [place(fir, (x, y, ground_z(x, y) - 0.1), rnd.uniform(0, 6.28), rnd.uniform(1.4, 2.4))
		             for x, y in pts if math.hypot(x - HILL[0], y - HILL[1]) > 9]
	if grass and not flag('nograss'):
		protos = [ph_part('grass_medium_02', i) for i in range(3)] + [ph_part('celandine_01', 0), ph_part('fern_02', 0)]
		rnd = random.Random(5); S['grass'] = []
		x0, x1, y0, y1 = grass_box
		for i in range(grass):
			x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
			if -6.4 < x < 6.4 and -4.4 < y < 3.4: continue
			if any(math.hypot(x - cx, y - cy) < cr for cx, cy, cr in keep_clear): continue
			pr = protos[0 if i % 7 else 3] if i % 11 else protos[4]
			pr = protos[rnd.randrange(3)] if pr is protos[0] else pr
			S['grass'].append(place(pr, (x, y, ground_z(x, y) - 0.02), rnd.uniform(0, 6.28), rnd.uniform(0.8, 1.4)))
	if hill_camp:
		hx, hy = HILL[0], HILL[1]; top = ground_z(hx, hy)
		S['usflag'], S['usflagcloth'] = env.flagpole('usflag', (hx + 1.0, hy + 1.5, top - 0.1), 'us_1859', h=8.0, size=(2.0, 1.1))
		can = ph_part('cannon_01', prefer='big')
		S['cannon'] = place(can, (hx + 4.0, hy - 2.0, ground_z(hx + 4.0, hy - 2.0)), math.radians(-60), 1.0)
		S['us'] = []
		for k in range(soldiers):
			x = hx - 2.5 + k * 1.6; y = hy - 4.2 + k * 0.9
			P = human(f'us{k}', 'us', (x, y, ground_z(x, y)), math.radians(125), seed=k, pose='aim')
			rifle_for(P)
			S['us'].append(P)
	S['ships'] = []
	for i in range(ships):
		F = FG.frigate(f'frig{i}', (ship_loc[0], ship_loc[1], env.SEA), ship_yaw, 3.6, smoke=True)
		S['ships'].append(F)
	S['clouds'] = []
	return S

def potato_patch2(name, x0, x1, y0, y1, rows=6, keep_clear=(), potatoes=40, seed=4):
	"""metric hilled bed (rows along X) with low leafy plants (Poly Haven shrub, CC0) and loose potatoes in the furrows"""
	rnd = random.Random(seed)
	sm = env.soil_mat()
	import bmesh as _bm
	import numpy as _np
	from mathutils import noise
	nx, ny = 220, 140; dy = (y1 - y0) / rows
	bm = _bm.new(); _bm.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=0.5)
	for v in bm.verts:
		x = (x0 + x1) / 2 + v.co.x * (x1 - x0 + 1.2); y = (y0 + y1) / 2 + v.co.y * (y1 - y0 + 1.2)
		ridge = 0.5 + 0.5 * math.cos(2 * math.pi * ((y - y0) / dy - 0.5))
		edge = min(1.0, max(0.0, min(x - x0 + 0.6, x1 + 0.6 - x, y - y0 + 0.6, y1 + 0.6 - y) / 0.7))
		zz = (0.05 + 0.2 * ridge ** 1.3 + 0.03 * noise.noise(Vector((x * 3, y * 3, seed)))) * edge - 0.05 * (1 - edge)
		v.co = Vector((x, y, zz))
	me = bpy.data.meshes.new(name + '_bed'); bm.to_mesh(me); bm.free()
	me.polygons.foreach_set('use_smooth', _np.ones(len(me.polygons), bool))
	bed = obj_from_mesh(name + '_bed', me, sm)
	objs = [bed]
	plant = ph_part('shrub_04', 0, max_verts=6000)
	for r in range(rows):
		yc = y0 + dy * (r + 0.5)
		n = int((x1 - x0) / 0.85)
		for k in range(n):
			x = x0 + (k + 0.5) * (x1 - x0) / n + rnd.uniform(-0.12, 0.12); y = yc + rnd.uniform(-0.1, 0.1)
			if any(math.hypot(x - cx, y - cy) < cr for cx, cy, cr in keep_clear): continue
			objs.append(place(plant, (x, y, 0.2), rnd.uniform(0, 6.28), rnd.uniform(1.3, 1.8)))
	pots = []
	import pw
	for k in range(potatoes):
		r = rnd.randrange(rows); yy = y0 + dy * r + rnd.uniform(-0.1, 0.1); xx = rnd.uniform(x0, x1)
		if any(math.hypot(xx - cx, yy - cy) < cr for cx, cy, cr in keep_clear): continue
		pt = pw.potato(f'{name}_pot{k}', rnd.uniform(1.1, 1.45)); pt.location = (xx, yy, 0.06)
		pt.rotation_euler = (rnd.uniform(0, 3), rnd.uniform(0, 3), rnd.uniform(0, 3)); pots.append(pt)
	return objs, pots

def rifle_real(name, L=1.4):
	"""M1855 rifle-musket at real size (1.4 m): slim walnut stock with a proper butt, browned barrel, brass bands; along +Y"""
	import pw
	wood = pw.mat('walnut', '#6e4426', 0.45); steel = pw.mat('gunsteel', '#3b3d42', 0.3, 0.9); brass = pw.mat('gold', '#c99a3e', 0.3, 0.9)
	root = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(root)
	parts = [prim('cube', name + '_stock', wood, (0, 0.35, -0.012), (0.018, 0.5, 0.018)),
	         prim('cube', name + '_wrist', wood, (0, -0.2, -0.03), (0.017, 0.08, 0.026), rot=(math.radians(-12), 0, 0)),
	         prim('cube', name + '_butt', wood, (0, -0.36, -0.055), (0.02, 0.09, 0.055), rot=(math.radians(-6), 0, 0)),
	         prim('cyl', name + '_barrel', steel, (0, 0.55, 0.012), (0.009, 0.009, 0.52), seg=12, rot=(math.pi / 2, 0, 0)),
	         prim('cyl', name + '_band1', brass, (0, 0.62, 0.0), (0.016, 0.016, 0.008), seg=12, rot=(math.pi / 2, 0, 0)),
	         prim('cyl', name + '_band2', brass, (0, 0.35, 0.0), (0.016, 0.016, 0.008), seg=12, rot=(math.pi / 2, 0, 0)),
	         prim('cube', name + '_lock', steel, (0.019, -0.08, 0.0), (0.003, 0.05, 0.014))]
	for o in parts:
		o.data.transform(Matrix.LocRotScale(o.location, o.rotation_euler, o.scale)); o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.scale = (1, 1, 1)
		o.parent = root
	root['muzzle'] = (0, 1.07, 0.012)
	return root

RIFLES = []
def rifle_for(P, length=1.4):
	"""M1855-style rifle-musket held across both hands every frame (butt at the right hand, barrel through the left)"""
	import pw
	r = rifle_real(P['name'] + '_rifle', length)
	RIFLES.append((P, r))
	return r

def _rifle_tick(t):
	for P, r in RIFLES:
		rh = bone_world(P, 'wrist.R'); lh = bone_world(P, 'wrist.L')
		q = P['root'].matrix_world.to_quaternion()
		mode = P.get('rifle_mode', 'aim')
		if mode == 'shoulder':
			sh = bone_world(P, 'shoulder01.R', False) + q @ Vector((0.0, 0.06, 0.12))
			d = (sh - rh).normalized(); base = rh + d * 0.47          # the hand cups the butt, barrel up past the shoulder
		elif mode == 'port':
			d = (lh - rh).normalized(); base = rh + d * 0.22
		else:
			d = (lh - rh).normalized(); base = rh + d * 0.2           # right hand at the wrist of the stock, butt in the shoulder
		r.rotation_mode = 'QUATERNION'; r.rotation_quaternion = d.to_track_quat('Y', 'Z')
		r.location = base
UPDATERS.append(_rifle_tick)
