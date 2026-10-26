"""v2 quarterdeck of the British flagship (painting look, metres):  --variant governor | admiral
governor «The governor wanted the Americans gone.»  over his shoulder: he jabs the order at the US camp across the water,
          then turns and pushes it at the admiral; Royal Marines at the rail
admiral  «The admiral said no. Not over a pig.»  the admiral (bicorne, epaulettes, white side whiskers) shakes his head and
          tears the order in two; the angel boar drifts in over the water behind him"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island2 import *
from shots_t import SHOT
import pw, env, frigate as FG, animals
V = arg('variant', 'governor')
t0, t1 = SHOT(V)
setup_hist(t0, t1)
sun2(3.6, (1.0, 0.8, 0.58), (58, 0, 215), 1.5)
sun2(1.0, (0.85, 0.9, 1.0), (70, 0, 20), 3.0)
S = build2(patch=False, cabin=True, hill_camp=True, ships=0, soldiers=5, grass=150, grass_box=(-20, 10, 8, 30))
K = 3.6
SHIP = Vector((22.0, 76.0, env.SEA)); YAW = math.radians(145)
F = FG.frigate('flag', SHIP, YAW, K, smoke=False)
bpy.context.view_layer.update()
def L(x, y, z=0.0):
	zz = FG._zd(x) + z
	c, s_ = math.cos(YAW), math.sin(YAW)
	return Vector((SHIP.x + K * (c * x - s_ * y), SHIP.y + K * (s_ * x + c * y), SHIP.z + K * zz))
deck = L(-5.0, 0).z
def deck_z(pw_):
	c, s_ = math.cos(-YAW), math.sin(-YAW); d = Vector(pw_) - SHIP
	lx = (c * d.x - s_ * d.y) / K
	return SHIP.z + K * FG._zd(lx) + 0.07
dk = prim('cube', 'planks', pbr('planks', '#a88356', 'dark_wooden_planks', 0.6, 0.7, 0.6), (0, 0, 0), (6.6, 1.72, 0.02), smooth_=False)
dk.parent = F['root']; dk.location = (-0.6, 0, FG._zd(-0.6))
wood = pbr('deckwood', '#8a6242', 'weathered_planks', 1.0, 0.5, 0.6); iron = pbr('iron', '#252428', rough=0.35, metal=0.7)
for k_, (lx, ly) in enumerate(((-3.2, 1.35), (-4.4, 1.35), (-3.2, -1.35), (-4.4, -1.35))):
	p = L(lx, ly); sgn = 1 if ly > 0 else -1
	cube(f'slide{k_}', wood, (p.x, p.y, deck + 0.25), (0.6, 1.0, 0.25), bev=0.03)
	prim('cyl', f'carr{k_}', iron, (p.x, p.y, deck + 0.75), (0.24, 0.24, 1.0), seg=16, rot=(math.pi / 2, 0, YAW), r2=0.8)
mar = []
for k_ in range(2):
	p = L(-6.9 + k_ * 0.45, 1.3)
	M_ = human(f'marine{k_}', 'uk', Vector((p.x, p.y, deck_z(p))), YAW + math.pi, seed=k_, pose='shoulder'); rifle_for(M_); mar.append(M_)
HILLPT = Vector((HILL[0], HILL[1], ground_z(HILL[0], HILL[1]) + 2.0))
C1 = L(-6.7, -0.55, 0.0); C1.z = deck + 1.65
fwd1 = (HILLPT - C1); fwd1.z = 0; fwd1.normalize(); right1 = Vector((fwd1.y, -fwd1.x, 0))
gp = C1 + fwd1 * 1.3 - right1 * 0.45; gp.z = deck_z(gp)
ap = C1 + fwd1 * 2.6 + right1 * 0.55; ap.z = deck_z(ap)
G = human('governor', 'governor', gp, 0.0, seed=2, pose='stand')
A = human('admiral', 'admiral', ap, 0.0, seed=7, pose='behind'); facial_hair(A, 'whiskers', '#e7e4dc')
order = []
m = bpy.data.materials.new('order'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = bpy.data.images.load(str(kit.ROOT / 'assets/notes/order.png'))
link(nt, ti.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.85
link(nt, ti.outputs['Color'], bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 0.15; m.use_backface_culling = False
for side in (0, 1):
	bm = bmesh.new(); x0, x1 = (-1, 0) if side == 0 else (0, 1)
	vs = [bm.verts.new((x0, -1, 0)), bm.verts.new((x1, -1, 0)), bm.verts.new((x1, 1, 0)), bm.verts.new((x0, 1, 0))]; bm.faces.new(vs)
	me = bpy.data.meshes.new(f'ord{side}'); bm.to_mesh(me); bm.free()
	o = obj_from_mesh(f'ord{side}', me, m); o.data.uv_layers.new()
	for p_ in o.data.polygons:
		for li in p_.loop_indices:
			v = o.data.vertices[o.data.loops[li].vertex_index].co; o.data.uv_layers.active.data[li].uv = (v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
	order.append(o)
def face(P, target, extra=0.0):
	d = Vector(target) - P['root'].location
	P['root'].rotation_euler.z = math.atan2(d.x, -d.y) + extra
cam = camera(30); dof(cam, 5.6)
if V == 'governor':
	t_jab, t_push = W(57) - 0.25, W(59) - 0.1
	def update(t):
		k = ease((t - t_push) / 0.45)
		face(G, HILLPT.lerp(A['root'].location, k)); face(A, G['root'].location, math.radians(30))
		set_pose(G, 'point' if t_jab - 0.2 <= t < t_push else ('offer' if t >= t_push else 'stand'), t, 0.3)
		kk = ease((t - t0) / (t1 - t0))
		look(cam, C1 + fwd1 * 0.3 * kk - right1 * 0.15, C1 + fwd1 * 8.0 + Vector((0, 0, -0.5)))
		cam.data.dof.focus_distance = 2.4
	def paper_tick(t):
		wr = bone_world(G, 'wrist.R', False); q = G['root'].matrix_world.to_quaternion()
		jab = 0.08 * max(0.0, math.sin((t - t_jab) * 11)) if t_jab < t < t_jab + 0.6 else 0.0
		base = wr + q @ Vector((0, -0.09 - jab, 0.02))
		vis = 1.0 if t >= t_jab - 0.25 else 1e-3
		for h in order:
			h.location = base; h.rotation_euler = (math.radians(75), 0, G['root'].rotation_euler.z); h.scale = (0.1 * vis, 0.135 * vis, 1)
	UPDATERS.append(paper_tick)
	cam.data.lens = 26
else:
	ang = animals.boar_pd('angel', L(-6.0, 3.5, 1.4), 0.0, angel=True); ang['mode'] = 'float'
	UPDATERS.append(lambda t: [animals.boar_pd_tick(b, t) for b in animals.BOARS])
	d2 = (A['root'].location - G['root'].location); d2.z = 0; d2.normalize(); right2 = Vector((d2.y, -d2.x, 0))
	C2 = G['root'].location - d2 * 1.35 + right2 * 0.65 + Vector((0, 0, 1.7))
	t_no, t_tear, t_pig = W(64) - 0.35, W(64) - 0.05, W(65) - 0.3
	def shake(P, t):
		d = dict(POSES['hold']); d['@head'] = (0, 0, 24 * math.sin((t - t_no) * 14) * math.exp(-max(0.0, t - t_no - 0.6) * 4))
		return d
	def update(t):
		face(G, A['root'].location); face(A, G['root'].location, math.radians(25))
		set_pose(G, 'stand')
		set_pose(A, shake if t_no <= t < t_tear + 0.5 else ('hold' if t < t_tear + 0.5 else 'behind'), t, 0.3)
		k = easeOut((t - t_pig) / 0.9)
		ang['root'].location = A['root'].location + d2 * 3.2 - right2 * (1.3 + 4.0 * (1 - k)) + Vector((0, 0, 2.0 + 0.6 * (1 - k)))
		ang['root'].rotation_euler.z = math.atan2(right2.y, right2.x)
		ang['root'].scale = (max(1e-3, k ** 0.4),) * 3
		kk = ease((t - t0) / (t1 - t0))
		look(cam, C2 + d2 * 0.35 * kk, A['root'].location + Vector((0, 0, 1.45)) - right2 * 0.1)
		cam.data.dof.focus_distance = (A['root'].location + Vector((0, 0, 1.45)) - C2).length
	def paper_tick(t):
		rh = bone_world(A, 'wrist.R', False); lh = bone_world(A, 'wrist.L', False); q = A['root'].matrix_world.to_quaternion()
		base = (rh + lh) / 2 + q @ Vector((0, -0.08, 0.05)); u = t - t_tear
		for k_, h in enumerate(order):
			sgn = -1 if k_ == 0 else 1
			if u < 0:
				h.location = base; h.rotation_euler = (math.radians(80), 0, A['root'].rotation_euler.z)
			else:
				h.location = base + q @ Vector((sgn * (0.06 + 0.9 * u), -0.15 * u, 0.4 * u - 4.0 * u * u))
				h.rotation_euler = (math.radians(80) + u * 5 * sgn, u * 4 * sgn, A['root'].rotation_euler.z + u * 3 * sgn)
			h.scale = (0.1, 0.135, 1)
	UPDATERS.append(paper_tick)
	cam.data.lens = 34
render2(update, V)
