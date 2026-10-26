"""v2 joint occupation (painting look, metres):  --variant stayed | party
stayed «So both sides just stayed. For twelve years.»  a redcoat and a bluecoat sentry side by side, the British camp (left,
        Union Jack) and the American camp (right, Stars and Stripes); time-lapse: seasons cycle green → snow twice, the
        sun sweeps, their beards grow down to their chests (the 1860 → 1872 bar is in Remotion)
party  «And partied together.»  one long table, redcoats and bluecoats alternating, tankards raised, a cake with both flags,
        fireworks over the camps"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
import random
from island2 import *
from shots_t import SHOT
import pw, env, frigate as FG
V = arg('variant', 'stayed')
t0, t1 = SHOT(V)
setup_hist(t0, t1)
SUN = sun2(3.6, (1.0, 0.8, 0.58), (58, 0, 215), 1.5)
sun2(1.0, (0.85, 0.9, 1.0), (70, 0, 20), 3.0)
S = build2(patch=False, cabin=False, hill_camp=False, ships=1, ship_loc=(40.0, 140.0), soldiers=0, grass=420, grass_box=(-14, 14, -8, 14))
for k in range(3):
	env.tent(f'uk_tent{k}', (-6.5 - k * 3.0, 9.0 + k * 1.8, 0), math.radians(20 + k * 15), 4.4, '#f1ebdc')
	env.tent(f'us_tent{k}', (6.5 + k * 3.0, 9.5 + k * 1.6, 0), math.radians(-25 - k * 12), 4.4, '#e8dfc8')
ukp, ukc = env.flagpole('ukpole', (-3.4, 6.5, 0), 'union_jack', h=6.5, size=(1.5, 0.8))
usp, usc = env.flagpole('uspole', (3.6, 6.5, 0), 'us_1859', h=6.5, size=(1.5, 0.84))
cam = camera(30); dof(cam, 5.6)
if V == 'stayed':
	SNOW = []
	def add_snow(m, amount):
		if not m or not m.use_nodes: return
		nt = m.node_tree; bs = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
		if bs is None: return
		inp = bs.inputs['Base Color']; src = inp.links[0].from_socket if inp.is_linked else None
		mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['Factor'].default_value = 0.0
		if src is not None: nt.links.new(src, mx.inputs[6])
		else: mx.inputs[6].default_value = inp.default_value
		mx.inputs[7].default_value = (0.9, 0.92, 0.97, 1); nt.links.new(mx.outputs[2], inp); SNOW.append((mx, amount))
	for m in list(bpy.data.materials):
		n = m.name.lower()
		if n.startswith('meadow'): add_snow(m, 0.95)
		elif any(k in n for k in ('grass', 'fir', 'leaf', 'needle', 'shrub', 'celandine', 'fern')): add_snow(m, 0.6)
	R = human('redcoat', 'uk', (-0.55, 0.0, 0), math.radians(6), seed=4, pose='shoulder'); rifle_for(R)
	Bc = human('bluecoat', 'us', (0.55, 0.0, 0), math.radians(-6), seed=6, pose='shoulder'); rifle_for(Bc)
	bR = facial_hair(R, 'full', '#4a2e1e'); bB = facial_hair(Bc, 'full', '#a2582c')
	def update(t):
		u = clamp01((t - (W(69) - 0.1)) / (W(76) + 0.3 - (W(69) - 0.1)))
		g = 0.15 + 3.4 * u ** 1.2
		for b in (bR, bB): b.scale = (1.0 + 0.15 * u, max(0.05, g), 1.0 + 0.25 * u)
		snow = 0.85 * (0.5 - 0.5 * math.cos(u * 4 * math.pi)) if u > 0 else 0.0
		for mx, a in SNOW: mx.inputs['Factor'].default_value = snow * a
		SUN.rotation_euler = (math.radians(55), 0, math.radians(215 + 300 * u))
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((0.0, -4.4, 1.62)).lerp(Vector((0.0, -3.6, 1.6)), k), Vector((0.0, 2.0, 1.5)))
		cam.data.dof.focus_distance = 4.0
	cam.data.lens = 30
else:
	wood = pbr('table', '#7a5536', 'weathered_planks', 1.0, 0.6, 0.6)
	cube('table', wood, (0, 1.2, 0.76), (2.6, 0.45, 0.03), bev=0.01)
	for x in (-2.4, 2.4):
		for y in (0.85, 1.55): cube(f'leg{x}{y}', wood, (x, y, 0.37), (0.05, 0.05, 0.37))
	cloth = cube('cloth', pw.mat('cloth', '#efe8da', 0.9), (0, 1.2, 0.795), (2.62, 0.47, 0.006))
	cake = prim('cyl', 'cake', pw.mat('cake', '#f2e8d8', 0.6), (0.0, 1.2, 0.92), (0.22, 0.22, 0.12), seg=40)
	prim('cyl', 'cake2', pw.mat('cream', '#f2c6cf', 0.5), (0.0, 1.2, 1.08), (0.15, 0.15, 0.05), seg=40)
	for k_, (fn, dx) in enumerate((('union_jack', -0.07), ('us_1859', 0.07))):
		prim('cyl', f'ck_st{k_}', pw.mat('stick', '#d8c49c', 0.7), (dx, 1.2, 1.22), (0.005, 0.005, 0.12), seg=6)
		fo = FG.flag_obj(f'ck_fl{k_}', fn, (dx + (-0.07 if dx < 0 else 0.07), 1.2, 1.3), (0.065, 0.04), None)
		if dx < 0: fo.scale.x = -fo.scale.x
		env.FLAGS_W.append(fo)
	people, mugs = [], []
	for i in range(8):
		x = -2.25 + i * 0.64; side = 'uk' if i % 2 == 0 else 'us'
		P = human(f'p{i}', side, (x, 1.75 + (0.08 if i % 2 else 0.0), 0), 0.0, seed=i + 11, pose='stand')
		mug = prim('cyl', f'mug{i}', pw.mat('pewter', '#c9ccd2', 0.25, 0.9), (0, 0, 0), (0.045, 0.045, 0.07), seg=16)
		prim('cyl', f'foam{i}', pw.mat('foam', '#fff8e8', 0.8), (0, 0, 0.07), (0.047, 0.047, 0.012), seg=16).parent = mug
		people.append(P); mugs.append(mug)
	rnd = random.Random(7); bursts = []
	for b in range(3):
		col = ['#ff5a5a', '#ffffff', '#5a8cff'][b]
		m = pw.mat(f'spark{b}', col, 0.3, emit=(col, 30.0))
		c = Vector((-5.0 + b * 5.0, 22.0 + b * 3.0, 9.0 + (b % 2) * 2.5)); t_b = t0 + 0.15 + b * 0.38
		sp = []
		for k in range(46):
			d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()
			sp.append((prim('ico', f'sp{b}_{k}', m, (0, 0, -50), (0.12,) * 3, sub=1), d))
		bursts.append((c, t_b, sp))
	def toast(i):
		def f(P, t):
			bob = 0.04 * math.sin(t * 7 + i)
			return {'ik.R': (-0.14, -0.32, 0.28 + bob), 'ik.L': (0.23, -0.04, -0.5), 'pole.R': (-1, 0.3, -0.2)}
		return f
	def update(t):
		for i, P in enumerate(people):
			set_pose(P, toast(i) if t >= t0 + 0.15 + (i % 3) * 0.07 else 'stand', t, 0.3)
		for (c, t_b, sp) in bursts:
			u = t - t_b
			for o, d in sp:
				if u < 0 or u > 1.4: o.location = (0, 0, -50); continue
				o.location = c + d * (4.0 * easeOut(u / 0.9)) + Vector((0, 0, -1.0 * u * u))
				s_ = 0.15 * (1 - clamp01((u - 0.6) / 0.8)); o.scale = (max(1e-3, s_),) * 3
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((-0.6, -2.6, 1.55)).lerp(Vector((0.1, -2.3, 1.55)), k), Vector((0.0, 2.0, 1.45)))
		cam.data.dof.focus_distance = 3.6
	def mugs_tick(t):
		for P, mug in zip(people, mugs):
			wr = bone_world(P, 'wrist.R', False); q = P['root'].matrix_world.to_quaternion()
			mug.location = wr + q @ Vector((0, -0.04, 0.02))
	UPDATERS.append(mugs_tick)
	cam.data.lens = 26
render2(update, V)
