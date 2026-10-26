"""Outback fence line (Western Australia, red dirt, saltbush).
--variant pegs (S12 «Before it was finished, rabbits were on the safe side.»): a short, just-started stretch of netting ends; a
  line of survey pegs with a taut string carries the planned route on to the horizon; the camera tracks along the pegs and finds a
  rabbit already sitting on the far («safe», west) side, calmly chewing. Both sides look the same (no grass split — that came later).
--variant scratch (S13 «Some scratched to get back out.»): a cut-away of the ground under the finished fence (owner 19.10: the rabbit
  must dig a hole, go into it and come out on the other side). The fence runs away from the camera into the outback; the front face
  is a soil cross-section. Left = the «safe» side: a rabbit digs, dives in, the tunnel opens up in the section under the buried
  netting, and he pops out on the right on «out.», where his gang is waiting.
The fence line runs along +X; east (where the rabbits came from) = −Y (camera side), the protected west side = +Y.
  tools/blender/run.sh tools/blender/fence.py -- --variant pegs|scratch [--frames 1,80] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
from shots_t import SHOT
VAR = arg('variant', 'pegs')
T0, T1 = SHOT(VAR)
setup(T0, T1)
world(SKY_GOLD); sun(4.4, (1.0, 0.9, 0.7), (52, 0, 150))
if VAR == 'pegs':
	ground('dirt', 300, cols=(C('#c8693a'), C('#a9502a'), C('#d9a35a')), scale=0.12)
SALT = {'grass': C('#8e9f6a'), 'leafsGreen': C('#7f9a63')}
def bushes(n, box, seed, avoid=None, smin=1.6, smax=3.2):
	rng = np.random.default_rng(seed)
	k = 0
	while k < n:
		x, y = rng.uniform(box[0], box[2]), rng.uniform(box[1], box[3])
		if avoid and avoid(x, y): continue
		m_ = ['plant_bush.glb', 'plant_bushLarge.glb', 'plant_bushSmall.glb', 'grass_large.glb'][rng.integers(4)]
		import_model(NK + m_, rng.uniform(smin, smax), (x, y, 0), (0, 0, rng.uniform(0, 360)), ink=0.015, tint=SALT)
		k += 1
	rng2 = np.random.default_rng(seed + 1)
	for j in range(n // 3):
		x, y = rng2.uniform(box[0], box[2]), rng2.uniform(box[1], box[3])
		if avoid and avoid(x, y): continue
		import_model(NK + ['rock_smallA.glb', 'rock_smallC.glb', 'rock_smallFlatA.glb'][j % 3], rng2.uniform(0.8, 1.6), (x, y, 0), (0, 0, rng2.uniform(0, 360)), ink=0.012,
		             tint={'dirt': C('#9b4a2a'), 'grass': C('#8e9f6a'), 'stone': C('#a7614a')})
cloud('c1', (-20, 90, 28), 7, seed=31, ink=0.15); cloud('c2', (30, 110, 34), 8, seed=33, ink=0.16)

def chewing_rabbit(name, loc, yaw, s=1.0):
	P = rabbit_parts(name, ink_w=0.012)
	P['root'].location = loc; P['root'].rotation_euler = (0, 0, yaw); P['root'].scale = (s, s, s)
	return P

if VAR == 'pegs':
	NET_END = -2.0
	netting('net', (-60, 0, 0), (NET_END, 0, 0), h=1.0, post_gap=3.2)
	# survey pegs (white/red tops) every 3 m + taut string at 0.45 m
	peg_m = toon_mat('peg', C('#e8dcc4')); top_m = toon_mat('pegtop', C('#e2342d'))
	xs = np.arange(NET_END + 3.0, 140, 3.0)
	for k, x in enumerate(xs):
		prim('cube', f'peg{k}', peg_m, (x, 0, 0.3), (0.035, 0.035, 0.3), smooth_=False, ink=0.01)
		prim('cube', f'pegt{k}', top_m, (x, 0, 0.62), (0.04, 0.04, 0.05), smooth_=False, ink=0.008)
	prim('cyl', 'string', toon_mat('string', C('#f6f0e4'), flat=True), ((NET_END + 140) / 2, 0, 0.45), (0.006, 0.006, (140 - NET_END) / 2), seg=6, rot=(0, math.pi / 2, 0))
	bushes(150, (-30, -25, 60, 45), 41, avoid=lambda x, y: abs(y) < 1.2 or (abs(x - 11) < 2.0 and abs(y - 3.2) < 2.0))
	R = chewing_rabbit('hero', (11.0, 3.2, 0), math.radians(-150), 1.15)
	import_model(NK + 'plant_bushSmall.glb', 0.9, (11.35, 3.75, 0), (0, 0, 30), ink=0.012, tint=SALT)
	cam = camera(30)
	def update(t):
		u = ease((t - T0) / (T1 - T0))
		# along the last posts → over the end of the netting → along the pegs → settles on the rabbit across the string
		look(cam, vlerp((-9.0, -3.6, 1.45), (9.4, -1.0, 0.85), u), vlerp((0.0, 1.0, 0.6), (11.0, 3.1, 0.32), u))
		ph = (t - T0)
		R['head'].rotation_euler = (math.radians(6 + 5 * math.sin(ph * 14)), 0, math.radians(8 * math.sin(ph * 1.7)))
		for s_ in (-1, 1):
			R[f'ear{s_}'].rotation_euler = (math.radians(-12 + 6 * math.sin(ph * 3 + s_)), math.radians(s_ * 14), 0)
	render(update, 'pegs')
else:
	# ---------------- cut-away: the ground ends at y = 0 in a soil cross-section; the fence runs from the cut to the horizon along +Y
	gnd = ground('dirt', 300, cols=(C('#c8693a'), C('#a9502a'), C('#d9a35a')), scale=0.12)
	gnd.location.y = 150
	netting('net', (0, 0.12, 0), (0, 60, 0), h=1.0, post_gap=3.2)
	bushes(110, (-25, 1.5, 25, 45), 51, avoid=lambda x, y: abs(x) < 1.0 or (abs(x) < 3.2 and y < 4.0))
	sm = bpy.data.materials.new('soil'); sm.use_nodes = True; nt = sm.node_tree; nt.nodes.clear()
	o_ = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry'); sep = SEP(nt, g.outputs['Position'])
	nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.5; nz.inputs['Detail'].default_value = 1.0
	link(nt, g.outputs['Position'], nz.inputs['Vector'])
	fac = M(nt, 'DIVIDE', M(nt, 'ADD', M(nt, 'ADD', sep['Z'], 3.0), M(nt, 'MULTIPLY', nz.outputs['Fac'], 0.12)), 3.0)
	EMIT(nt, RAMP(nt, fac, [(0.0, C('#6e301b')), (0.5, C('#83391f')), (0.78, C('#9a4526')), (0.94, C('#b4552c'))]), o_)
	prim('plane', 'section', sm, (0, 0, -3.0), (10, 3.0, 1), rot=(math.pi / 2, 0, 0), smooth_=False)
	prim('cube', 'cutedge', toon_mat('inkedge', INK, flat=True), (0, -0.004, 0.0), (10, 0.006, 0.012), smooth_=False)
	# pebbles in the section (flat ovals on the face), away from the tunnel
	rngp = np.random.default_rng(3)
	pm = [toon_mat('pebble1', C('#c9875a'), flat=True), toon_mat('pebble2', C('#5c2816'), flat=True)]
	for k in range(46):
		x, z = rngp.uniform(-2.2, 2.2), rngp.uniform(-2.6, -0.12)
		if -1.05 < x < 1.05 and -1.05 < z < 0.1: continue
		r = rngp.uniform(0.025, 0.07)
		prim('cyl', f'pebble{k}', pm[k % 2], (x, -0.003, z), (r * 1.4, r, 0.002), seg=14, rot=(math.pi / 2, rngp.uniform(0, 3), 0))
	# the fence in section: the first post and the netting buried below the surface
	prim('cube', 'post_sec', toon_mat('postsec', C('#6b4126'), flat=True), (0, -0.005, -0.25), (0.06, 0.002, 0.25), smooth_=False)
	wire_m = toon_mat('wiresec', C('#d9d6e6'), flat=True)
	prim('cube', 'wire_sec', wire_m, (0.085, -0.005, -0.2), (0.008, 0.002, 0.2), smooth_=False)
	for k in range(5):
		prim('cyl', f'wire_dot{k}', wire_m, (0.085, -0.006, -0.04 - k * 0.08), (0.018, 0.018, 0.002), seg=10, rot=(math.pi / 2, 0, 0))
	# the tunnel path (x, z on the face): entry left of the fence → under the buried netting → exit on the right
	ctrl = [(-0.66, -0.24), (-0.6, -0.45), (-0.42, -0.65), (-0.12, -0.76), (0.25, -0.76), (0.55, -0.62), (0.75, -0.42), (0.82, -0.24)]
	def catmull(pts, n):
		out = []
		P_ = [pts[0]] + pts + [pts[-1]]
		for i in range(1, len(P_) - 2):
			for j in range(n):
				u_ = j / n; p0, p1, p2, p3 = P_[i - 1], P_[i], P_[i + 1], P_[i + 2]
				out.append(tuple(0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * u_ + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u_ * u_ +
				                       (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u_ ** 3) for c in (0, 1)))
		out.append(pts[-1])
		return out
	path = catmull(ctrl, 12)
	seg_len = [math.dist(path[i], path[i + 1]) for i in range(len(path) - 1)]
	L_ = sum(seg_len); cum = [0.0]
	for d in seg_len: cum.append(cum[-1] + d / L_)
	def at_s(s_):
		s_ = clamp01(s_)
		for i in range(len(path) - 1):
			if cum[i + 1] >= s_:
				k = (s_ - cum[i]) / max(1e-6, cum[i + 1] - cum[i])
				x = lerp(path[i][0], path[i + 1][0], k); z = lerp(path[i][1], path[i + 1][1], k)
				ang = math.atan2(path[i + 1][1] - path[i][1], path[i + 1][0] - path[i][0])
				return x, z, ang
		return path[-1][0], path[-1][1], math.pi / 2
	rim_m = toon_mat('tunnelrim', C('#2e140c'), flat=True); in_m = toon_mat('tunnelin', C('#4f2416'), flat=True)
	discs = []
	NDISC = 64
	for k in range(NDISC):
		s_ = k / (NDISC - 1); x, z, _ = at_s(s_)
		a_ = prim('cyl', f'trim{k}', rim_m, (x, -0.007, z), (0.25, 0.25, 0.002), seg=24, rot=(math.pi / 2, 0, 0))
		b_ = prim('cyl', f'tin{k}', in_m, (x, -0.011, z), (0.205, 0.205, 0.002), seg=24, rot=(math.pi / 2, 0, 0))
		discs.append((s_, a_, b_))
	# holes on the surface + the dirt heap behind the digger
	hole_m = toon_mat('hole', C('#3a1a12'), flat=True)
	hole_in = prim('cyl', 'hole_in', hole_m, (-0.66, 0.25, 0.006), (0.2, 0.16, 0.004), seg=24)
	hole_out = prim('cyl', 'hole_out', hole_m, (0.84, 0.25, 0.006), (0.2, 0.16, 0.004), seg=24)
	heap = prim('sphere', 'dig_heap', toon_mat('heap', C('#b4552c')), (-1.2, 0.5, 0.0), (0.22, 0.18, 0.08), ink=0.01)
	heap2 = prim('sphere', 'out_heap', toon_mat('heap', C('#b4552c')), (1.08, 0.5, 0.0), (0.18, 0.15, 0.06), ink=0.01)
	clod_m = toon_mat('clod', C('#9a4524'))
	rngc = np.random.default_rng(7)
	clods = []
	for k in range(26):
		o = prim('sphere', f'clod{k}', clod_m, (0, 0, -5), (0.028, 0.028, 0.025), ink=0.004, u=8, v=6)
		clods.append((o, rngc.uniform(0, 0.45), rngc.uniform(0.5, 1.2), rngc.uniform(-0.25, 0.35), rngc.uniform(1.6, 2.4)))
	burst = []
	for k in range(12):
		o = prim('sphere', f'burst{k}', clod_m, (0, 0, -5), (0.03, 0.03, 0.026), ink=0.004, u=8, v=6)
		a_ = (k / 12) * math.pi
		burst.append((o, math.cos(a_) * rngc.uniform(0.6, 1.1), rngc.uniform(-0.2, 0.4), math.sin(a_) * rngc.uniform(1.6, 2.4)))
	# the hero (digs on the left, facing the fence) and his gang waiting on the right
	R = chewing_rabbit('hero', (-0.86, 0.25, 0), math.radians(-90), 1.25)
	friends = []
	for k, (x, y, yaw) in enumerate(((1.3, 0.8, 100), (1.5, 1.45, 80), (1.08, 1.9, 110))):
		friends.append(chewing_rabbit(f'friend{k}', (x, y, 0), math.radians(yaw), 1.15))
	cam = camera(30)
	T_DIVE = W(69) - 0.1           # «to»
	T_IN = T_DIVE + 0.22
	T_OUT = W(72) + 0.02           # «out.»
	def pose_ears(P_, a, spread=14):
		for s_ in (-1, 1):
			P_[f'ear{s_}'].rotation_euler = (math.radians(a), math.radians(s_ * spread), 0)
	def update(t):
		u = ease((t - T0) / (T1 - T0))
		look(cam, vlerp((0.2, -3.75, 0.74), (0.26, -3.5, 0.7), u), vlerp((0.14, 0.0, -0.38), (0.2, 0.0, -0.38), u))
		ph = t - T0
		root = R['root']
		# reveal the tunnel up to the digger's nose
		if t < T_IN: reveal = -1.0
		elif t < T_OUT: reveal = (t - T_IN) / (T_OUT - T_IN) + 0.04
		else: reveal = 2.0
		for s_, a_, b_ in discs:
			vis = s_ <= reveal
			a_.hide_render = not vis; b_.hide_render = not vis
		dk = clamp01((t - T0 - 0.1) / (T_DIVE - T0 - 0.1))
		hole_in.scale = (0.08 + 0.14 * dk, 0.06 + 0.11 * dk, 0.004)
		heap.scale = (0.12 + 0.15 * dk, 0.1 + 0.12 * dk, 0.04 + 0.06 * dk)
		ok_ = t >= T_OUT
		hole_out.hide_render = not ok_; heap2.hide_render = not ok_
		root.scale = (1.25, 1.25, 1.25)
		if t < T_DIVE:
			# digging at the hole in front of him: hunched, paws pulling alternately, dirt thrown back over his shoulders
			root.location = (-0.86, 0.25, 0.012 * abs(math.sin(ph * 16)))
			root.rotation_euler = (math.radians(-16 * clamp01(ph / 0.3)), 0, math.radians(-90))
			for s_ in (-1, 1):
				a_ = math.sin(ph * 16 + (0 if s_ > 0 else math.pi))
				R[f'paw{s_}'].location = (s_ * 0.06, 0.2 + 0.06 * a_, 0.03 + 0.05 * max(0.0, a_))
			R['head'].rotation_euler = (math.radians(14 + 3 * math.sin(ph * 8)), 0, 0)
			pose_ears(R, -6 + 10 * math.sin(ph * 6))
		elif t < T_IN:
			# the dive: nose down into the hole
			k = ease((t - T_DIVE) / (T_IN - T_DIVE))
			x0, z0, a0 = at_s(0.0)
			root.location = (lerp(-0.86, x0, k), lerp(0.25, -0.2, k), lerp(0.0, z0 - 0.17, k))
			root.rotation_euler = (lerp(math.radians(-16), a0, k), 0, math.radians(-90))
			for s_ in (-1, 1): R[f'paw{s_}'].location = (s_ * 0.06, 0.2, 0.03)
			pose_ears(R, lerp(-6, -80, k), 8)
		elif t < T_OUT:
			# through the tunnel, under the buried netting
			k = (t - T_IN) / (T_OUT - T_IN)
			x, z, a = at_s(k)
			root.location = (x, -0.2, z - 0.17 * math.cos(a) + 0.02 * math.sin(ph * 30))
			root.rotation_euler = (a, 0, math.radians(-90))
			for s_ in (-1, 1):
				a_ = math.sin(ph * 26 + (0 if s_ > 0 else math.pi))
				R[f'paw{s_}'].location = (s_ * 0.06, 0.2 + 0.05 * a_, 0.03)
			pose_ears(R, -80, 8)
		else:
			# pops out on the right on «out.», lands, shakes the dirt off and hops to his gang
			q = t - T_OUT
			x1, z1, _ = at_s(1.0)
			if q < 0.28:
				k = q / 0.28
				root.location = (lerp(x1, 1.0, k), lerp(-0.2, 0.3, k), lerp(z1 - 0.1, 0.0, k) + 0.4 * math.sin(k * math.pi))
				root.rotation_euler = (lerp(math.radians(70), 0, ease(k)), 0, math.radians(-90))
				pose_ears(R, lerp(-80, 10, k))
			else:
				q2 = q - 0.28
				shake = math.radians(18 * math.sin(q2 * 40) * math.exp(-q2 * 6)) if q2 < 0.45 else 0.0
				hx = 0.0
				if q2 > 0.45:
					hz, sq = hop(q2 - 0.45, 0.32, 0.12)
					hx = min(0.2, (q2 - 0.45) * 0.4)
				else:
					hz, sq = 0.0, 1.0
				root.location = (1.0 + hx, 0.3 + hx * 0.4, hz)
				root.rotation_euler = (0, shake, math.radians(-90 + 15))
				root.scale = (1.25, 1.25, 1.25 * sq)
				pose_ears(R, 10 + 6 * math.sin(q2 * 9))
			R['head'].rotation_euler = (0, 0, 0)
		# burst of dirt out of the exit hole
		for o, vx, vy, vz in burst:
			q = t - T_OUT
			if q < 0 or q > 0.7:
				o.location = (0, 0, -5); continue
			o.location = (0.84 + vx * q, 0.25 + vy * q, 0.05 + vz * q - 5.0 * q * q)
			if o.location.z < 0: o.location.z = -5
		# digging clods: fly back over the digger (to the left)
		for o, off, vx, vy, vz in clods:
			q = (ph + off) % 0.5
			if t > T_DIVE + 0.1 or ph + off < 0.15:
				o.location = (0, 0, -5); continue
			o.location = (-0.7 - vx * q, 0.25 + vy * q, 0.05 + vz * q - 4.5 * q * q)
			if o.location.z < 0: o.location.z = -5
		# the gang: watching; ears shoot up and a little hop when he pops out
		cheer = clamp01((t - T_OUT - 0.1) / 0.2)
		for k, F in enumerate(friends):
			F['head'].rotation_euler = (math.radians(4 * math.sin(ph * 2 + k)), 0, math.radians(6 * math.sin(ph * 1.3 + k * 2)))
			pose_ears(F, -12 + 22 * cheer + 5 * math.sin(ph * 4 + k), 14 - 6 * cheer)
			hz = 0.1 * max(0.0, math.sin((t - T_OUT - 0.15 - 0.08 * k) * 9)) if 0 < t - T_OUT - 0.15 - 0.08 * k < 0.7 else 0.0
			F['root'].location.z = hz
	render(update, 'scratch')
