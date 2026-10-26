"""Quarterdeck of the British flagship in Griffin Bay:  --variant governor | admiral
governor 23.72–26.06 «The governor wanted the Americans gone.»  the governor (top hat, black frock coat) jabs his order paper
          towards the US camp on the hill across the water, then pushes it at the admiral; two Royal Marines at the rail
admiral  26.06–29.42 «The admiral said no. Not over a pig.»  the admiral (bicorne, gold, white side whiskers) shakes his
          head and tears the order in two; «Not over a pig» → the angel boar drifts past over the water and nods"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island import *
import pw, env, frigate as FG
from shots_t import SHOT
V = arg('variant', 'governor')
t0, t1 = SHOT(V)
setup2(t0, t1)
S = build(cabin=True, patch=False, hill_camp=True, ships=0, soldiers=6, grass=200, clouds=True)
SHIP = Vector((6.0, 21.0, env.SEA)); YAW = math.radians(145)      # port beam (local +Y) looks straight at the US camp
F = FG.frigate('flag', SHIP, YAW, 1.0, smoke=False)
bpy.context.view_layer.update()
def L(x, y, z=None):
	"""ship-local deck point → world"""
	zz = FG._zd(x) + (z or 0.0)
	c, s_ = math.cos(YAW), math.sin(YAW)
	return Vector((SHIP.x + c * x - s_ * y, SHIP.y + s_ * x + c * y, SHIP.z + zz))
# plank deck on top of the hull's deck strip
dk = prim('cube', 'planks', pbr('planks', '#b08458', 'dark_wooden_planks', 1.2, 0.7, 0.6), (0, 0, 0), (6.6, 1.72, 0.02), smooth_=False)
dk.parent = F['root']; dk.location = (-0.6, 0, FG._zd(-0.6) + 0.0); _ = None
deck = L(-5.0, 0, 0.0).z
# deck dressing: carronades on slides, double wheel, coiled ropes
wood = pbr('deckwood', '#8a6242', 'weathered_planks', 2.0, 0.5, 0.6); iron = pbr('iron', '#252428', rough=0.35, metal=0.7)
for k, (lx, ly) in enumerate(((-3.2, 1.35), (-4.4, 1.35), (-3.2, -1.35), (-4.4, -1.35))):
	p = L(lx, ly); s_ = 1 if ly > 0 else -1
	cube(f'slide{k}', wood, (p.x, p.y, deck + 0.08), (0.18, 0.32, 0.08), bev=0.01)
	g = prim('cyl', f'carr{k}', iron, (p.x, p.y - s_ * 0.05, deck + 0.24), (0.075, 0.075, 0.3), seg=14, rot=(math.pi / 2, 0, 0), r2=0.8)
wp = L(-7.7, 0.0)
for dx in (-0.06, 0.06):
	bpy.ops.mesh.primitive_torus_add(major_radius=0.28, minor_radius=0.025, major_segments=32, minor_segments=8, location=(wp.x + dx, wp.y, deck + 0.42), rotation=(0, math.pi / 2, 0))
	bpy.context.active_object.data.materials.append(wood)
cube('wheelpost', wood, (wp.x, wp.y, deck + 0.2), (0.05, 0.08, 0.2))
for k in range(3):
	p = L(-2.2 - k * 0.5, -1.15)
	bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.03, location=(p.x, p.y, deck + 0.03))
	bpy.context.active_object.data.materials.append(pbr('rope', '#c9a86e', rough=0.9))
# Royal Marines at the port rail
mar = []
for k, ly in enumerate((0.0, 0.6)):
	p = L(-6.9 + k * 0.55, 1.35)
	M_ = char(f'marine{k}', ['male-f', 'male-d'][k], 'uk', p, YAW + math.pi, 0.62, 'idle', 1.0, k * 0.3)
	hat(M_, 'shako'); r = rifle(f'mr{k}', 1.3); carry(M_, r, 'shoulder'); mar.append(M_)
# the governor and the admiral, staged along the camera ray towards the US camp (governor shot)
HILLPT = Vector((-2.3, 9.2, 2.6))
C1 = L(-6.75, -0.6, 0.78)
fwd1 = (HILLPT - C1); fwd1.z = 0; fwd1.normalize(); right1 = Vector((fwd1.y, -fwd1.x, 0))
gp = C1 + fwd1 * 1.15 - right1 * 0.32; gp.z = deck
ap = C1 + fwd1 * 1.95 + right1 * 0.42; ap.z = deck
G = char('governor', 'male-a', 'governor', gp, 0.0, 0.62, 'idle'); hat(G, 'tophat')
A = char('admiral', 'male-f', 'admiral', ap, 0.0, 0.62, 'idle'); hat(A, 'bicorne'); beard(A, 'whiskers', '#ecebe6')
# gold epaulettes for the admiral
order = None
def paper(name):
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = bpy.data.images.load(str(kit.ROOT / 'assets/notes/order.png'), check_existing=True)
	link(nt, ti.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.85
	link(nt, ti.outputs['Color'], bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 0.2
	m.use_backface_culling = False
	halves = []
	for side in (0, 1):
		bm = bmesh.new()
		x0, x1 = (-1, 0) if side == 0 else (0, 1)
		vs = [bm.verts.new((x0, -1, 0)), bm.verts.new((x1, -1, 0)), bm.verts.new((x1, 1, 0)), bm.verts.new((x0, 1, 0))]
		bm.faces.new(vs)
		me = bpy.data.meshes.new(f'{name}{side}'); bm.to_mesh(me); bm.free()
		o = obj_from_mesh(f'{name}{side}', me, m); o.data.uv_layers.new()
		for p_ in o.data.polygons:
			for li in p_.loop_indices:
				v = o.data.vertices[o.data.loops[li].vertex_index].co
				o.data.uv_layers.active.data[li].uv = (v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
		halves.append(o)
	return halves
halves = paper('order')
cam = camera(30)
island_pt = Vector((-2.3, 9.2, 2.0))
def face(P, target, extra=0.0):
	d = Vector(target) - P['root'].location
	P['root'].rotation_euler.z = math.atan2(d.x, -d.y) + extra

if V == 'governor':
	t_jab, t_push = W(57) - 0.25, W(59) - 0.1
	def update(t):
		# governor: turns to the hill and jabs the paper at it, then faces the admiral and pushes it at him
		k = ease((t - t_push) / 0.45)
		face(G, HILLPT.lerp(A['root'].location, k), 0.0)
		face(A, G['root'].location, math.radians(35))
		set_clip(G, 'holding-right' if t >= t_jab - 0.2 else 'idle', 1.0, t=t_jab - 0.2)
		set_clip(A, 'idle')
		kk = ease((t - t0) / (t1 - t0)); look(cam, C1 + fwd1 * 0.2 * kk, C1 + fwd1 * 6.0 + Vector((0, 0, 0.05)))
	def paper_tick(t):
		rh, _ = hands(G); rot = G['root'].matrix_world.to_quaternion()
		jab = 0.06 * max(0.0, math.sin((t - t_jab) * 11)) if t_jab < t < t_jab + 0.6 else 0.0
		base = rh + rot @ Vector((0, -0.07 - jab, 0.06))
		for k_, h in enumerate(halves):
			h.location = base; h.rotation_euler = (math.radians(75), 0, G['root'].rotation_euler.z); h.scale = (0.055, 0.075, 1)
	pw.UPDATERS.append(paper_tick)
	cam.data.lens = 24
else:
	ang = pig('angel', L(-6.0, 3.5, 1.4), 0.0, angel=True, s=0.8); ang['mode'] = 'float'
	# over the governor's shoulder onto the admiral (sea + sky behind him)
	d2 = (A['root'].location - G['root'].location); d2.z = 0; d2.normalize(); right2 = Vector((d2.y, -d2.x, 0))
	C2 = G['root'].location - d2 * 1.05 + right2 * 0.5 + Vector((0, 0, 0.7))
	ang['root'].rotation_euler.z = math.atan2(-d2.y, -d2.x) + math.radians(180)
	t_no, t_tear, t_pig = W(64) - 0.35, W(64) - 0.05, W(65) - 0.3
	def update(t):
		face(G, A['root'].location, 0.0); face(A, G['root'].location, math.radians(28))
		set_clip(G, 'idle')
		set_clip(A, 'emote-no' if t_no <= t < t_no + 1.25 else ('holding-both' if t < t_tear + 0.6 else 'idle'), 1.0, t=t_no if t >= t_no else None)
		# the angel drifts in over the water behind them and nods
		k = easeOut((t - t_pig) / 0.9)
		ang['root'].location = A['root'].location + d2 * 1.6 + right2 * (0.05 + 1.6 * (1 - k)) + Vector((0, 0, 0.78 + 0.3 * (1 - k)))
		ang['root'].scale = (0.8 * k ** 0.4,) * 3
		kk = ease((t - t0) / (t1 - t0)); look(cam, C2 + d2 * 0.25 * kk, A['root'].location + Vector((0, 0, 0.5)) - right2 * 0.05)
	def paper_tick(t):
		rh, lh = hands(A); rot = A['root'].matrix_world.to_quaternion()
		base = (rh + lh) / 2 + rot @ Vector((0, -0.08, 0.04))
		u = t - t_tear
		for k_, h in enumerate(halves):
			sgn = -1 if k_ == 0 else 1
			if u < 0:
				h.location = base + rot @ Vector((sgn * 0.0, 0, 0)); h.rotation_euler = (math.radians(80), 0, A['root'].rotation_euler.z)
			else:
				h.location = base + rot @ Vector((sgn * (0.06 + 0.5 * u), -0.1 * u, 0.25 * u - 2.2 * u * u))
				h.rotation_euler = (math.radians(80) + u * 5 * sgn, u * 4 * sgn, A['root'].rotation_euler.z + u * 3 * sgn)
			h.scale = (0.055, 0.075, 1)
	pw.UPDATERS.append(paper_tick)
	cam.data.lens = 36
render2(update, V)
