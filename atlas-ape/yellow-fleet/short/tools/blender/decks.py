"""Life on the trapped ships (all toy sailors, yf.sailor).
--variant friends  S8  «Their countries were rivals. The sailors became friends.» British + Polish ships side by side: wary
                       stares → a plank swings across, two sailors shake hands in the middle, everyone waves
--variant football S9  «Football on deck.» four sailors in a netted pen on the foredeck; the ball hits the net and bounces back
--variant race     S10a «Their own Olympics.» lifeboat rowing race between the moored ships, crews cheer from the rails
--variant podium   S10b «Poland won.» podium on deck: Poland 1st, West Germany 2nd, Britain 3rd; the winner raises his arms
  tools/blender/run.sh tools/blender/decks.py -- --variant friends [--frames 1,60] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
import kit
from yf import *
import yf
from shots_t import SHOT
import yf2
from yf2 import set_clip, pbr, PEOPLE
yf2.enable_v2(globals())

VAR = arg('variant', 'friends')
T0, T1 = SHOT(VAR)
setup(T0, T1)
SKY_WARM = [(0.0, (1.0, 0.84, 0.6)), (0.1, (1.0, 0.66, 0.55)), (0.24, (0.9, 0.48, 0.68)), (0.42, (0.54, 0.34, 0.76)), (0.68, (0.26, 0.18, 0.56))]
world(SKY_WARM)
sun(3.6, (1.0, 0.88, 0.68), (52, 0, -35))
water('lake', (600, 600), (0, 0), col='#2b9db8', col2='#7fd8e0', scale=0.35)
cloud('c1', (40, 120, 30), 9, seed=61, ink=0.2); cloud('c2', (60, -60, 26), 8, seed=63, ink=0.2)
desert('shore', -260, 260, -260, 260, res=4.0, canal_w=-999, bank=1.0, lake=(0, 0, 150, 150), dunes=1.5, seed=65)

def flagpole(name, flag, loc, size=0.34, h=0.75):
	root = empty(name, loc)
	prim('cyl', name + '_pole', toon_mat('pole', C('#efe6d2')), (0, 0, h / 2), (0.012, 0.012, h / 2), seg=8, ink=0.006, parent=root)
	piv = empty(name + '_piv', (0, 0, h - size * 0.33), parent=root)
	fg = prim('plane', name + '_flag', flag_mat(flag), (-size / 2, 0, 0), (size / 2, size / 3, 1), rot=(math.pi / 2, 0, 0), smooth_=False, parent=piv)
	fg.data.uv_layers.new(); yf._flip_flag_uv(fg)
	return piv

def stand(p, t, ph=0.0):
	set_clip(p, 'idle')

def walk(p, t, ph=0.0, amp=28):
	set_clip(p, 'walk')

def cross_arms(p):
	set_clip(p, 'emote-no')

def cheer(p):
	set_clip(p, 'jump')

def mk(name, loc, yaw, seed, **kw):
	p = sailor(name, loc, yaw, seed=seed, **kw); p['z0'] = loc[2]; return p

# ====================================================================================================== friends
if VAR == 'friends':
	A = ship('uk', 'portline', (0, 1.4, 0), 0.0); B = ship('pl', 'polish', (0, -1.4, 0), 0.0)
	for s_ in (A, B): set_dust(s_['sid'], 0.55)
	dz = A['deckz']
	fA = flagpole('fA', 'red_ensign', (3.7, 0.62, dz(3.7)), 0.62, 1.0); fB = flagpole('fB', 'poland', (3.7, -0.62, dz(3.7)), 0.62, 1.0)
	fA.parent.rotation_euler = (0, 0, math.radians(-25)); fB.parent.rotation_euler = (0, 0, math.radians(25))
	crewA = [mk(f'a{i}', (0.9 + 0.42 * i, 0.55, dz(1.0)), -math.pi / 2, 10 + i) for i in range(6)]
	crewB = [mk(f'b{i}', (0.95 + 0.42 * i, -0.55, dz(1.0)), math.pi / 2, 30 + i, cap='#20283f') for i in range(6)]
	for p in crewA + crewB: p['root'].scale = (1.35, 1.35, 1.35)
	# plank hinged on ship A's rail, swings down across the gap
	hinge = empty('hinge', (2.2, 0.48, dz(2.2) + 0.01))
	prim('cube', 'plank', toon_mat('plank', C('#c79a64')), (0, -0.5, 0), (0.09, 0.5, 0.012), smooth_=False, ink=0.006, parent=hinge)
	H0 = W(53) + 0.05                      # «The sailors became friends»: plank swings on «The», walk, handshake on «friends»
	cam = camera(32)
	yf2.dof(cam, 6.0)
	def update(t):
		for i, p in enumerate(crewA + crewB):
			if t < W(50) - 0.1: stand(p, t, i)
		wave_flag({'flag': fA, 'sid': 'fA'}, t, 1.0, 10); wave_flag({'flag': fB, 'sid': 'fB'}, t, 1.0, 10)
		rivals = W(50) - 0.1 <= t < H0
		for p in crewA + crewB:
			if rivals: cross_arms(p)
		# plank: up (vertical) → down across the gap
		k = ease((t - H0) / 0.45)
		hinge.rotation_euler = (math.radians(lerp(-90, 0, k)), 0, 0)
		# the two walkers
		a, b = crewA[3], crewB[3]
		w = clamp01((t - H0 - 0.45) / 0.55)
		a['root'].location = (2.2, lerp(0.55, 0.07, w), dz(2.2) + 0.012 * (w > 0)); b['root'].location = (2.2, lerp(-0.55, -0.07, w), dz(2.2) + 0.012 * (w > 0))
		if 0 < w < 1:
			walk(a, t); walk(b, t, 1.0)
		if w >= 1:
			set_clip(a, 'interact-right', t=t); set_clip(b, 'interact-right', t=t)
		if t > W(56) - 0.05:                 # everyone waves on «friends»
			for i, p in enumerate(crewA + crewB):
				if p in (a, b): continue
				set_clip(p, 'idle')
				if not p.get('cheer'): yf2.cheer(p, ('wave', 'both', 'wave')[i % 3], 0.37 * i); p['cheer'] = True
		u = (t - T0) / (T1 - T0)
		look(cam, (lerp(-0.4, 0.2, u), lerp(0.05, 0.0, u), lerp(1.05, 0.95, u)), (3.4, 0.0, 0.42))
	render(update, VAR)

# ====================================================================================================== football
elif VAR == 'football':
	# v8: seen from behind the goal, a little above the net — the striker runs AT us, shoots, the ball comes into the net
	# towards the camera, the keeper dives the wrong way, the striker celebrates facing us. Players big (S 1.9) and apart.
	A = ship('uk', 'portline', (0, 0, 0), 0.0); set_dust('uk', 0.45)
	for o in list(bpy.data.objects):          # clear the aft deck (hatches, derricks + their wires) → a flat wooden pitch
		if any(o.name.startswith(f'uk_{k}') for k in ('hatch-4.3', 'hatch-6.0', 'hb-4.3', 'hb-6.0', 'kp-5.2', 'boom-5.2', 'kpx-5.2', 'tl-5.2', 'cr-5.2', 'hk-5.2')):
			bpy.data.objects.remove(o)
	dz = A['deckz']; zz = dz(-5.2)
	S = 1.9
	GX, GW, GH, GD = -6.45, 0.78, 0.27, -0.2        # goal line, width, height, net depth (aft)
	white = pbr('goalw', '#f4f2ee', rough=0.4)
	for s_ in (-1, 1):
		yf2.cyl(f'gpost{s_}', white, (GX, s_ * GW / 2, zz + GH / 2), 0.011, GH, seg=10)
		yf2.cyl(f'gback{s_}', white, (GX + GD, s_ * GW / 2, zz + GH * 0.4), 0.007, GH * 0.8, seg=8)
	yf2.cyl('gbar', white, (GX, 0, zz + GH), 0.011, GW + 0.022, seg=10, rot=(math.pi / 2, 0, 0))
	netm = pbr('netm', '#f7f7f4', rough=0.6)
	def net_panel(name, corners, nu, nv):
		c0, c1, c2, c3 = [Vector(c) for c in corners]
		bm = bmesh.new(); vs = []
		for j in range(nv + 1):
			for i in range(nu + 1):
				vs.append(bm.verts.new(c0.lerp(c1, i / nu).lerp(c3.lerp(c2, i / nu), j / nv)))
		for j in range(nv):
			for i in range(nu):
				k_ = j * (nu + 1) + i
				bm.faces.new((vs[k_], vs[k_ + 1], vs[k_ + nu + 2], vs[k_ + nu + 1]))
		me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
		o = obj_from_mesh(name, me, netm); wf = o.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.003; wf.use_replace = True
		return o
	back = net_panel('netback', ((GX + GD, -GW / 2, zz), (GX + GD, GW / 2, zz), (GX + GD, GW / 2, zz + GH * 0.8), (GX + GD, -GW / 2, zz + GH * 0.8)), 26, 9)
	net_panel('nettop', ((GX, -GW / 2, zz + GH), (GX, GW / 2, zz + GH), (GX + GD, GW / 2, zz + GH * 0.8), (GX + GD, -GW / 2, zz + GH * 0.8)), 26, 6)
	for s_ in (-1, 1):
		net_panel(f'netside{s_}', ((GX, s_ * GW / 2, zz), (GX + GD, s_ * GW / 2, zz), (GX + GD, s_ * GW / 2, zz + GH * 0.8), (GX, s_ * GW / 2, zz + GH)), 6, 9)
	back_rest = [v.co.copy() for v in back.data.vertices]
	chalk = pbr('chalk', '#f1ede4', rough=0.9)
	for (cx_, cy_, hx, hy) in ((GX + 0.36, 0.0, 0.005, 0.5), (GX + 0.18, -0.5, 0.18, 0.005), (GX + 0.18, 0.5, 0.18, 0.005)):
		yf2.board(f'chalk{cx_:.2f}{cy_:.2f}', chalk, (cx_, cy_, zz + 0.0015), (hx, hy, 0.0015), bev=0)
	striker = mk('st', (-3.7, -0.05, zz), math.pi, 1)
	mate = mk('mt', (-3.9, 0.55, zz), math.pi, 4)
	defn = mk('df', (-3.45, -0.55, zz), math.pi, 2)
	keeper = mk('gk', (GX + 0.14, 0.0, zz), 0.0, 3)
	for p in (striker, mate, defn, keeper): p['root'].scale = (S, S, S)
	spect = []
	for i, (x, y) in enumerate(((-5.6, -0.84), (-4.9, -0.86), (-4.2, -0.85), (-5.3, 0.86), (-4.55, 0.85))):
		p = mk(f'sr{i}', (x, y, zz), (math.pi / 2 if y < 0 else -math.pi / 2), 20 + i); p['root'].scale = (S * 0.9,) * 3; spect.append(p)
	for p in spect + [keeper]: set_clip(p, 'idle')
	R = 0.034
	ball = prim('sphere', 'ball', pbr('ballw', '#fafafa', rough=0.35), (0, 0, 0), (R, R, R), u=24, v=16)
	for k_ in range(6):
		a_ = k_ * math.pi / 3
		prim('sphere', f'bp{k_}', pbr('ballb', '#1b1b1f', rough=0.4), (0.88 * R * math.cos(a_), 0.88 * R * math.sin(a_), 0.33 * R * (1 if k_ % 2 else -1)), (0.33 * R,) * 3, u=10, v=6, parent=ball)
	KICK = W(57) + 0.2
	KC = 0.175
	GOAL = KICK + 0.3
	HIT = Vector((GX + GD + 0.04, 0.26, zz + 0.17))
	XK = -4.95
	def striker_x(t):
		if t < KICK: return lerp(-3.7, XK, clamp01((t - T0) / (KICK - T0)))
		return XK - 0.1 * easeOut(clamp01((t - KICK) / 0.3)) - 0.25 * easeOut(clamp01((t - GOAL - 0.1) / 0.5))
	def ball_pos(t):
		if t < KICK:
			x = striker_x(t) - 0.27 - 0.04 * math.sin(t * 11.0)
			return Vector((x, -0.0 + 0.012 * math.sin(t * 7), zz + R))
		k_ = (t - KICK) / (GOAL - KICK)
		a_ = Vector((XK - 0.24, 0.0, zz + R))
		if k_ < 1:
			return a_.lerp(HIT, k_) + Vector((0, 0, 0.06 * math.sin(math.pi * k_)))
		k2 = clamp01((t - GOAL) / 0.35)
		return HIT.lerp(Vector((HIT.x + 0.05, HIT.y - 0.03, zz + R)), easeOut(k2)) + Vector((0, 0, 0.03 * math.sin(math.pi * k2) * (1 - k2)))
	cam = camera(32)
	yf2.dof(cam, 8.0)
	prev = [None]
	def update(t):
		# striker: dribbles at the camera → kick → runs on a step, jumps with both arms up, facing us
		striker['root'].location = (striker_x(t), -0.05 + 0.03 * clamp01((t - KICK) / 0.3), zz)
		if t < KICK - KC: set_clip(striker, 'sprint', speed=1.0)
		elif t < KICK + 0.42: set_clip(striker, 'attack-kick-right', t=KICK - KC)
		else:
			set_clip(striker, 'jump', t=KICK + 0.42)
			if not striker.get('cheer'): yf2.cheer(striker, 'both', 0.0); striker['cheer'] = True
		# defender chases on the far side and gives up (head shake); team-mate runs in on the other side, celebrates
		defn['root'].location = (lerp(-3.45, -4.55, easeOut(clamp01((t - T0) / (KICK + 0.25 - T0)))), -0.55, zz)
		set_clip(defn, 'sprint' if t < KICK + 0.25 else 'emote-no', t=(None if t < KICK + 0.25 else KICK + 0.25))
		mate['root'].location = (lerp(-3.9, -4.85, easeOut(clamp01((t - T0) / (GOAL + 0.35 - T0)))), 0.55, zz)
		if t < GOAL + 0.15: set_clip(mate, 'sprint')
		else:
			set_clip(mate, 'jump', t=GOAL + 0.15)
			if not mate.get('cheer'): yf2.cheer(mate, 'wave', 0.4); mate['cheer'] = True
		# keeper: ready, then a full-length dive to his right (−y) — the ball goes the other way
		d = easeOut(clamp01((t - (KICK + 0.06)) / 0.28))
		keeper['root'].location = (GX + 0.14, -0.3 * d, zz + 0.09 * math.sin(math.pi * min(1.0, d * 1.15)))
		keeper['root'].rotation_euler = (math.radians(-78 * d), 0, 0)
		if d > 0 and not keeper.get('cheer'): yf2.cheer(keeper, 'both', 0.0); keeper['cheer'] = True
		b = ball_pos(t); ball.location = b
		if prev[0] is not None:
			mv = b - prev[0]
			ball.rotation_euler.y += mv.x / R; ball.rotation_euler.x -= mv.y / R
		prev[0] = b.copy()
		g = math.exp(-max(0.0, t - GOAL) * 6.0) * (1 if t >= GOAL else 0) * math.sin(min(math.pi / 2, (t - GOAL) * 16 + 0.3) if t >= GOAL else 0)
		for v, r in zip(back.data.vertices, back_rest):
			dd = (Vector((r.y, r.z)) - Vector((HIT.y, HIT.z))).length
			v.co.x = r.x - 0.09 * g * math.exp(-(dd / 0.1) ** 2)       # the net bulges towards the camera
		back.data.update()
		if t > GOAL:
			for i, p in enumerate(spect):
				set_clip(p, 'jump', t=GOAL + 0.05 * i)
				if not p.get('cheer'): yf2.cheer(p, 'both' if i % 2 else 'wave', 0.3 * i); p['cheer'] = True
		# camera: behind the goal, above the net, a slow push in
		u = clamp01((t - T0) / (T1 - T0))
		look(cam, (lerp(-7.75, -7.55, ease(u)), lerp(0.42, 0.36, u), zz + lerp(1.5, 1.4, u)), (lerp(-5.05, -5.35, ease(u)), 0.04, zz + 0.02))
	render(update, VAR)

# ====================================================================================================== stamps
elif VAR == 'stamps':
	# FACTS D1: linocut, the baker's yellow ink, a sailor standing barefoot on the block. He stomps on the block, hops
	# off, the block flips over (yellow-inked relief up) and the camera pushes in on the fresh sheet of yellow stamps.
	A = ship('pl', 'polish', (0, 0, 0), 0.0); set_dust('pl', 0.35)
	for o in list(bpy.data.objects):
		if any(o.name.startswith(f'pl_{k}') for k in ('hatch-4.3', 'hatch-6.0', 'hb-4.3', 'hb-6.0', 'kp-5.2', 'boom-5.2', 'kpx-5.2', 'tl-5.2', 'cr-5.2', 'hk-5.2')):
			bpy.data.objects.remove(o)
	dz = A['deckz']; zz = dz(-5.2)
	SX, SY = -5.1, 0.0
	PW, PH = 0.56, 0.42
	def tex_mat(name, path, rough=0.85):
		m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
		bs = nt.nodes.get('Principled BSDF'); ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = bpy.data.images.load(str(path), check_existing=True)
		nt.links.new(ti.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = rough
		return m
	TEX = kit.ROOT / 'assets/stamps'
	def plane_uv(o):
		if not o.data.uv_layers: o.data.uv_layers.new()
		uv = o.data.uv_layers.active.data
		for p_ in o.data.polygons:
			for li in p_.loop_indices:
				v = o.data.vertices[o.data.loops[li].vertex_index].co
				uv[li].uv = (v.y * 0.5 + 0.5, 0.5 - v.x * 0.5)      # image up = away from the camera (−x)
	paper = prim('plane', 'sheet', tex_mat('sheetm', TEX / 'sheet.png'), (SX, SY, zz + 0.002), (PH / 2, PW / 2, 1), smooth_=False)
	plane_uv(paper)
	# the lino block: wooden back, inked lino face underneath
	blk = empty('blk', (SX, SY, zz + 0.004))
	wood = yf2.wood_mat('blockwood', '#a9784a', '#6e4628', grain='X')
	yf2.board('blk_wood', wood, (0, 0, 0.034), (PH / 2 + 0.01, PW / 2 + 0.01, 0.03), parent=blk, bev=0.006)
	face = prim('plane', 'blk_face', tex_mat('blockm', TEX / 'block.png', 0.5), (0, 0, 0.0035), (PH / 2, PW / 2, 1), smooth_=False, parent=blk, rot=(math.pi, 0, 0))
	plane_uv(face)
	# the baker's yellow ink: a tin + a roller next to the sheet
	yf2.cyl('inktin', pbr('tin', '#b9bcc2', rough=0.3, metal=0.9), (SX + 0.45, SY + 0.32, zz + 0.05), 0.07, 0.1, seg=24)
	yf2.cyl('inkin', pbr('ink', '#e2aa22', rough=0.25), (SX + 0.45, SY + 0.32, zz + 0.101), 0.064, 0.004, seg=24)
	S = 1.6
	pr = mk('pr', (SX, SY, zz + 0.064), -math.pi / 2, 5); pr['root'].scale = (S, S, S)
	watch = [mk('w0', (SX + 0.7, SY + 0.55, zz), -2.4, 6), mk('w1', (SX + 0.95, SY - 0.4, zz), 2.8, 7)]
	for p in watch: p['root'].scale = (S, S, S); set_clip(p, 'idle')
	STOMP = W(60) - 0.1        # stomps (jumps up and down on the block) from «Their»
	HOP = W(61) + 0.04         # hops off on «own»
	FLIP0, FLIP1 = W(62) - 0.12, W(62) + 0.22    # the block turns over, the print is revealed on «stamps»
	cam = camera(32)
	yf2.dof(cam, 5.6)
	def update(t):
		# printer: a little jump that lands hard on the block → stands → hops off to the side
		if t < STOMP - 0.25:
			set_clip(pr, 'idle'); pr['root'].location = (SX, SY, zz + 0.064)
		elif t < HOP:
			set_clip(pr, 'jump', t=STOMP - 0.25)
			pr['root'].location = (SX, SY, zz + 0.064)
		else:
			k = easeOut(clamp01((t - HOP) / 0.35))
			set_clip(pr, 'jump', t=HOP - 0.1)
			pr['root'].location = (SX + 0.05 * k, SY + 0.5 * k, zz + 0.064 * (1 - k) + 0.12 * math.sin(math.pi * k))
		if t > FLIP1 + 0.1 and not pr.get('cheer'): set_clip(pr, 'idle'); yf2.cheer(pr, 'both', 0.0); pr['cheer'] = True
		# the block: lifted, turned over in the air, laid inked-side up beside the sheet
		f = smooth(clamp01((t - FLIP0) / (FLIP1 - FLIP0)))
		blk.location = (SX - 0.04 * f, SY - 0.64 * f, zz + 0.004 + 0.24 * math.sin(math.pi * f) + 0.064 * f)
		blk.rotation_euler = (-math.pi * f, 0, 0.08 * f)
		u = clamp01((t - T0) / (T1 - T0))
		e = ease(clamp01((t - (FLIP0 - 0.1)) / 0.7))
		look(cam, (lerp(SX + 0.62, SX + 0.26, e), lerp(SY - 0.72, SY - 0.2, e), zz + lerp(0.66, 0.6, e)), (lerp(SX - 0.02, SX - 0.03, e), lerp(SY + 0.05, SY + 0.0, e), zz + lerp(0.2, 0.0, e)))
	render(update, VAR)

# ====================================================================================================== olympics insets (720×480)
elif VAR in ('dive', 'sprint'):
	# picture-in-picture cards over the rowing race: more Bitter Lake Olympics events (FACTS C6: diving, sprint …)
	sc_ = bpy.context.scene; sc_.render.resolution_x, sc_.render.resolution_y = 720, 480
	for o in list(bpy.data.objects):          # no sky clouds in the small cards (backlit volumes read as smoke)
		if o.name in ('c1', 'c2'): bpy.data.objects.remove(o)
	if VAR == 'dive':
		A = ship('dv', 'bluestar', (0, 0, 0), 0.0); set_dust('dv', 0.45)
		dz = A['deckz']; zd = dz(0.0)
		plank = yf2.board('plank', yf2.wood_mat('plankw', '#d9ae78', '#8e6438', grain='Y'), (0.0, -1.3, zd + 0.08), (0.1, 0.42, 0.025), bev=0.005)
		for s_ in (-1, 1): yf2.cyl(f'plk{s_}', pbr('plkpost', '#d8c3a0', rough=0.6), (s_ * 0.07, -0.9, zd + 0.04), 0.012, 0.08)
		S = 1.9
		diver = mk('dv0', (0.0, -0.95, zd + 0.1), -math.pi / 2, 9); diver['root'].scale = (S, S, S)
		crowd = []
		for i, x in enumerate((-1.6, -1.2, -0.8, 0.6, 1.0, 1.4, 1.8)):
			p = mk(f'dc{i}', (x, -0.82, zd), -math.pi / 2, 30 + i); p['root'].scale = (S, S, S); set_clip(p, 'idle'); crowd.append(p)
		# splash: radial mini water arches + a mist puff + a foam ring, all born at the entry point
		SP0 = Vector((0.0, -2.15, 0.0))
		spl = empty('splash', SP0)
		for k in range(12):
			a = k * 30 + 10
			yf2.water_jet(f'sj{k}', spl, (0, 0, 0.0), a, reach=0.34 + 0.1 * (k % 3), height=0.5 + 0.18 * (k % 2), r0=0.016, r1=0.1, mist=False)
		yf2.water_jet('sjc', spl, (0, 0, 0.0), 0, reach=0.06, height=0.85, r0=0.03, r1=0.12, mist=False)
		mist, _ = yf2.volume_box('splmist', (SP0.x, SP0.y, 0.25), (0.8, 0.8, 0.6), '#f4f8fb', 0.0, scale=4.0, thr=0.36, soft=0.3, speed=(0, 0, 0.8), anisotropy=0.5, grounded=True)
		MD = yf2.VOLD['splmist'].outputs[0]
		RUN0, JUMP, ENTRY = T0 + 0.05, T0 + 0.42, T0 + 0.9         # run → leap → head-first into the lake (the card is up by then)
		cam = camera(30)
		def update(t):
			# run along the plank → leap up and out → head-first fall → gone under the splash
			if t < JUMP:
				k = clamp01((t - RUN0) / (JUMP - RUN0))
				diver['root'].location = (0.0, lerp(-0.95, -1.6, k), zd + 0.1); set_clip(diver, 'sprint' if t > RUN0 else 'idle')
				diver['root'].rotation_euler = (0, 0, -math.pi / 2)
			else:
				k = clamp01((t - JUMP) / (ENTRY - JUMP))
				y = lerp(-1.6, -2.15, k); z = (zd + 0.1) * (1 - k) + 0.62 * math.sin(math.pi * k)
				diver['root'].location = (0.0, y, z if k < 1 else -0.5)
				diver['root'].rotation_euler = (0, math.radians(165 * smooth(k)), -math.pi / 2)    # pitch forward: head first
				set_clip(diver, 'jump', t=JUMP)
			g = clamp01((t - ENTRY) / 0.5)
			alive = 0 < g < 1
			spl.scale = (1, 1, 0.001 + math.sin(math.pi * g) * 1.0) if alive else (0.001, 0.001, 0.001)
			set_visible(spl, alive)
			for c_ in spl.children: set_visible(c_, alive)
			MD.default_value = 1.0 * math.sin(math.pi * clamp01((t - ENTRY) / 0.8)) if t > ENTRY else 0.0
			for i, p in enumerate(crowd):
				if t > ENTRY and not p.get('cheer'): set_clip(p, 'jump', t=ENTRY + 0.04 * i); yf2.cheer(p, 'both' if i % 2 else 'wave', 0.2 * i); p['cheer'] = True
			look(cam, (1.05, -3.25, 0.72), (0.0, -1.9, 0.68))
		render(update, VAR)
	else:
		A = ship('sp', 'hapag', (0, 0, 0), 0.0); set_dust('sp', 0.4)
		for o in list(bpy.data.objects):
			if any(o.name.startswith(f'sp_{k}') for k in ('hatch-4.3', 'hatch-6.0', 'hb-4.3', 'hb-6.0', 'kp-5.2', 'boom-5.2', 'kpx-5.2', 'tl-5.2', 'cr-5.2', 'hk-5.2')):
				bpy.data.objects.remove(o)
		dz = A['deckz']; zz = dz(-5.2)
		S = 1.5
		FX = -6.3                          # finish line
		lanes = (-0.45, -0.05, 0.35)
		speeds = (1.0, 0.93, 0.88)
		runners = [mk(f'rn{i}', (-3.6, y, zz), math.pi, 40 + i) for i, y in enumerate(lanes)]
		holders = [mk('h0', (FX, -0.78, zz), math.pi / 2, 50), mk('h1', (FX, 0.74, zz), -math.pi / 2, 51)]
		for p in runners + holders: p['root'].scale = (S, S, S)
		for p in holders: set_clip(p, 'idle')
		tape_m = pbr('tape', '#e23b2e', rough=0.5)
		th = zz + 0.2
		halves = []
		for j, (y0, y1) in enumerate(((-0.74, -0.05), (0.7, -0.05))):
			pv = empty(f'tp{j}', (FX, y0, th))
			o = prim('cube', f'tape{j}', tape_m, (0, (y1 - y0) / 2, 0), (0.004, abs(y1 - y0) / 2, 0.012), smooth_=False, parent=pv)
			halves.append((pv, 1 if j == 0 else -1))
		R0 = T0 + 0.1
		cam = camera(28)
		yf2.dof(cam, 6.0)
		def xr(i, t):
			return lerp(-3.6, FX - 0.5, clamp01((t - R0) * speeds[i] / 1.2))
		def update(t):
			for i, p in enumerate(runners):
				x = xr(i, t); p['root'].location = (x, lanes[i], zz)
				if x > FX - 0.45: set_clip(p, 'sprint', speed=1.15)
				else:
					set_clip(p, 'jump' if i == 0 else 'idle', t=t)
					if i == 0 and not p.get('cheer'): yf2.cheer(p, 'both', 0.0); p['cheer'] = True
			# the winner (lane 0) breaks the tape: the halves swing away to their holders
			brk = xr(0, t) < FX
			if brk and not tbreak[0]: tbreak[0] = t
			for pv, sg in halves:
				pv.rotation_euler = (0, 0, sg * math.radians(75) * (smooth(clamp01((t - tbreak[0]) / 0.35)) if tbreak[0] else 0.0))
			for p in holders:
				if brk and not p.get('cheer'): set_clip(p, 'jump', t=t); p['cheer'] = True
			look(cam, (FX - 0.85, 0.42, zz + 0.36), (lerp(-4.8, -5.7, clamp01((t - T0) / 1.6)), -0.05, zz + 0.18))
		tbreak = [0.0]
		render(update, VAR)

# ====================================================================================================== race
elif VAR == 'race':
	S1 = ship('s1', 'bluestar', (-1.0, 3.3, 0), 0.0); S2 = ship('s2', 'hapag', (-1.0, -3.3, 0), math.pi)
	for s_ in (S1, S2): set_dust(s_['sid'], 0.6)
	crowd = []
	for j, (s_, side) in enumerate(((S1, -1), (S2, 1))):
		dz = s_['deckz']
		for i in range(10):
			x = -3.5 + 0.75 * i
			X = s_['root'].location.x + (x if side < 0 else -x); Y = s_['root'].location.y + side * 0.86
			crowd.append(mk(f'c{j}_{i}', (X, Y, dz(x)), side * math.pi / 2, 50 + 10 * j + i))
	boats = [rowboat(f'rb{i}', (0, 0, 0), 0.0, n=4, stripe=c, seed=i) for i, c in enumerate(('#d63a3a', '#2f6fb5', '#f2c331'))]
	for i, b in enumerate(boats):
		b['root'].scale = (2.0, 2.0, 2.0)
		st = bpy.data.objects.get(f'rb{i}_stripe')            # straight box stripe stuck out at the bow → a band on the hull
		if st:
			mat = st.data.materials[0]; bpy.data.objects.remove(st)
			yf2.hull_band(f'rb{i}_band', 1.3, 0.36, -0.62, 0.64, 0.035, 0.058, mat, b['root'], stern_w=0.5)
		for r in b['rowers']: set_clip(r, 'sit')
	buoy = prim('sphere', 'buoy', toon_mat('buoy', C('#ff9a1f')), (6.0, 1.9, 0.05), (0.22, 0.22, 0.2), u=16, v=10, ink=0.02)
	prim('cyl', 'buoyflag', toon_mat('pole', C('#efe6d2')), (6.0, 1.9, 0.4), (0.01, 0.01, 0.3), seg=6)
	flag_b = prim('plane', 'bflag', toon_mat('bfl', C('#22e6d8'), flat=True), (5.88, 1.9, 0.62), (0.12, 0.08, 1), rot=(math.pi / 2, 0, 0), smooth_=False)
	cam = camera(30)
	yf2.dof(cam, 6.0)
	def update(t):
		u = t - T0
		for i, b in enumerate(boats):
			sp = (2.6, 2.75, 2.45)[i]
			b['root'].location = (-3.4 + sp * u * 1.05, -1.05 + 1.05 * i, 0.0); row(b, t + 0.2 * i, 2.4)
		for i, p in enumerate(crowd):
			if i % 4 == 0:
				set_clip(p, 'jump')
			elif not p.get('cheer'):
				set_clip(p, 'idle'); yf2.cheer(p, ('wave', 'both', 'wave')[i % 3], 0.29 * i); p['cheer'] = True
		e = ease(u / (T1 - T0))
		lead = max(b['root'].location.x for b in boats)
		look(cam, (lerp(4.6, 4.2, e), lerp(-1.75, -1.65, e), lerp(0.62, 0.55, e)), (lead - 1.6, -0.25, 0.3))
	render(update, VAR)

# ====================================================================================================== podium
elif VAR == 'podium':
	# v8 (owner: zoom out, make it cooler): wide low angle — podium 2·1·3 with painted numbers on the hatch cover, three
	# flags behind (Poland highest), the winner lifts a cup, medals, confetti, the crew cheering on both sides.
	A = ship('a', 'polish', (0, 0, 0), 0.0); set_dust('a', 0.4)
	for o in list(bpy.data.objects):        # clear the derrick posts/wires around the stage
		if any(o.name.startswith(f'a_{k}') for k in ('kp4.3', 'boom4.3', 'kpx4.3', 'tl4.3', 'cr4.3', 'hk4.3', 'aer')): bpy.data.objects.remove(o)
	dz = A['deckz']; z0 = dz(3.2) + 0.15
	S = 1.6
	paint = pbr('podium', '#f4efe4', 'painted_metal_shutter', 0.8, 0.1, 0.5)
	BL = [((3.0, 0.0), 0.24, '#ffc83a', '1'), ((3.0, -0.4), 0.16, '#c9ced8', '2'), ((3.0, 0.4), 0.1, '#d08a4a', '3')]
	numm = pbr('podnum', '#2b2236', rough=0.5)
	for i, ((x, y), h, band, num) in enumerate(BL):
		yf2.board(f'blk{i}', paint, (x, y, z0 + h / 2), (0.17, 0.195, h / 2), bev=0.008)
		yf2.board(f'blkb{i}', pbr('podband' + str(i), band, rough=0.35, metal=0.4), (x + 0.171, y, z0 + h - 0.02), (0.002, 0.195, 0.016), bev=0)
		cu = bpy.data.curves.new(f'num{i}', 'FONT'); cu.body = num; cu.size = 0.13; cu.extrude = 0.004; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
		o = bpy.data.objects.new(f'num{i}', cu); bpy.context.scene.collection.objects.link(o); cu.materials.append(numm)
		o.location = (x + 0.172, y, z0 + h * 0.45); o.rotation_euler = (math.pi / 2, 0, math.pi / 2)
	# three flagpoles behind, Poland highest
	pole_m = pbr('fpole', '#e9e4d8', rough=0.4, metal=0.3)
	flags = []
	for i, (y, h, fl) in enumerate(((0.0, 1.25, 'poland'), (-0.42, 1.05, 'west_germany'), (0.42, 0.95, 'red_ensign'))):
		yf2.cyl(f'fp{i}', pole_m, (2.62, y, z0 + h / 2), 0.012, h, seg=10)
		piv = empty(f'fpv{i}', (2.62, y, z0 + h - 0.1))
		fg = prim('plane', f'pflag{i}', yf2.flagmat2(fl), (0.0, -0.2, 0), (0.2, 0.13, 1), rot=(math.pi / 2, 0, -math.pi / 2), smooth_=False, parent=piv, xs=10, ys=5)
		yf2.flag_uv(fg); yf2.flag_wave_mod(fg)
		flags.append({'flag': piv, 'flagobj': fg, 'sid': f'pf{i}'})
	win = [mk('w0', (3.0, 0.0, z0 + 0.24), 0.0, 7), mk('w1', (3.0, -0.4, z0 + 0.16), 0.0, 8), mk('w2', (3.0, 0.4, z0 + 0.1), 0.0, 9)]
	for p in win: p['root'].scale = (S, S, S); set_clip(p, 'idle')
	for i, p in enumerate(win):
		col = ('#ffc83a', '#d7dbe2', '#cd7f32')[i]
		md = yf2.cyl(f'medal{i}', pbr('medal' + str(i), col, rough=0.25, metal=0.9), (0.045, 0, 0.12), 0.016, 0.004, seg=20, rot=(0, math.pi / 2, 0), parent=p['root'])
	# the cup (gold), lifted on «won»
	gold = pbr('cupgold', '#f2c443', rough=0.22, metal=1.0)
	cup = empty('cup', (3.0, 0.0, -5))
	obj_from_mesh('cupm', yf2._lathe('cupl', [(0.0, 0.0), (0.0, 0.035), (0.004, 0.035), (0.012, 0.012), (0.04, 0.012), (0.09, 0.032), (0.14, 0.045), (0.145, 0.0)], 24), gold, parent=cup).rotation_euler = (0, -math.pi / 2, 0)
	for s_ in (-1, 1):
		h_ = prim('ico', f'cuph{s_}', gold, (0, s_ * 0.05, 0.11), (0.012, 0.02, 0.03), sub=2, parent=cup)
	crowd = []
	for i, (x, y) in enumerate(((2.75, -0.95), (3.15, -0.92), (3.55, -0.9), (2.8, 0.95), (3.2, 0.93), (3.6, 0.9), (3.9, -0.7), (3.95, 0.68))):
		p = mk(f'cr{i}', (x, y, dz(x)), (math.pi / 2 if y < 0 else -math.pi / 2) * 0.6, 70 + i); p['root'].scale = (S, S, S); crowd.append(p)
	conf = [prim('cube', f'cf{k}', toon_mat('cf%d' % (k % 4), C(('#ff2e88', '#22e6d8', '#ffc83a', '#ffffff')[k % 4]), flat=True), (0, 0, -9), (0.014, 0.007, 0.001), smooth_=False) for k in range(90)]
	rng = np.random.default_rng(9); cp = [(rng.uniform(-0.9, 0.9), rng.uniform(-0.6, 0.6), rng.uniform(0, 6), rng.uniform(0.0, 0.5)) for _ in conf]
	WON = W(67) - 0.15
	cam = camera(26)
	yf2.dof(cam, 8.0)
	def update(t):
		for f_ in flags: wave_flag(f_, t, 1.2, 12)
		w0 = win[0]
		if t > WON:     # arms straight up with the cup between the hands, a little bounce
			if not w0.get('cheer'): yf2.cheer(w0, 'up', 0.0); w0['cheer'] = True
			k = easeOut(clamp01((t - WON) / 0.3))
			b_ = 0.025 * abs(math.sin((t - WON) * 9))
			w0['root'].location.z = z0 + 0.24 + b_
			cup.location = (3.03, 0.0, z0 + 0.24 + b_ + lerp(0.3, 0.43, k))
		for i, p in enumerate(win[1:]):
			if t > WON + 0.1 and not p.get('cheer'): yf2.cheer(p, 'wave', 0.3 * i); p['cheer'] = True
		for i, p in enumerate(crowd):
			if not p.get('cheer'):
				set_clip(p, 'jump' if i % 3 == 0 else 'idle', t=T0 + 0.07 * i)
				yf2.cheer(p, ('both', 'wave', 'wave')[i % 3], 0.27 * i); p['cheer'] = True
		for k_, (c_, (x, y, ph, dl)) in enumerate(zip(conf, cp)):
			a_ = t - WON - dl
			if a_ < 0: c_.location = (0, 0, -9); continue
			c_.location = (3.0 + x * 0.5, y, z0 + 1.0 - 0.4 * a_ + 0.03 * math.sin(a_ * 6 + ph)); c_.rotation_euler = (a_ * 5 + ph, a_ * 3, ph)
		u = clamp01((t - T0) / (T1 - T0))
		e = ease(u)
		look(cam, (lerp(4.75, 4.45, e), lerp(-0.62, -0.42, e), z0 + lerp(0.2, 0.26, e)), (3.0, lerp(0.02, 0.0, e), z0 + 0.42))
	render(update, VAR)
