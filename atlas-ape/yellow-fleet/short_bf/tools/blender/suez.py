"""Suez world — toon desert, the canal and the Great Bitter Lake with the 1960s cargo liners (yf.py).
--variant then     S1  «Fourteen ships entered the Suez Canal for a one-day trip.»  dawn; low camera tracks along the convoy
--variant later    S2  «They got out eight years later.»  same camera path, same ships: sand-yellow + rust, tugs on tow ropes
--variant war      S3  «Halfway through, war broke out.»  two toy jets streak over the convoy, cream smoke columns far away
--variant front    S5  «And the canal became the front line.»  from above: toy tanks + tents on both banks, a dashed line draws on the water
--variant lake     S6  «Trapped in a lake, nowhere to go.»  rising over the 14 anchored ships; masts of scuttled ships block both ends
--variant storm    S7  «Sandstorms dusted them yellow. The Yellow Fleet.»  an ochre storm wall rolls over → hero shot of the yellow fleet
--variant twosail  S12 «In the end, just two could still sail.»  tugs tow yellow ships; two German ships steam north on their own
  tools/blender/run.sh tools/blender/suez.py -- --variant then [--frames 1,60] [--scale 40] [--samples 8]"""
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

VAR = arg('variant', 'then')
yf2.FOG = 0.0   # world volumes black out the sky in EEVEE — no fog
T0, T1 = SHOT(VAR)
setup(T0, T1)
sc_ = bpy.context.scene

def ramp_world(stops):
	w = world(stops)
	return w

SKY_DAWN = [(0.0, (1.0, 0.80, 0.52)), (0.07, (1.0, 0.62, 0.50)), (0.18, (0.94, 0.45, 0.62)), (0.34, (0.55, 0.30, 0.70)), (0.6, (0.22, 0.14, 0.48))]
SKY_HAZE = [(0.0, (1.0, 0.82, 0.50)), (0.08, (0.98, 0.70, 0.45)), (0.2, (0.88, 0.55, 0.52)), (0.38, (0.58, 0.38, 0.62)), (0.62, (0.30, 0.20, 0.50))]
SKY_DAY = [(0.0, (1.0, 0.86, 0.66)), (0.1, (0.96, 0.66, 0.70)), (0.26, (0.70, 0.48, 0.82)), (0.46, (0.44, 0.34, 0.80)), (0.7, (0.24, 0.20, 0.60))]

V = 0.75                       # convoy speed (units/s) — toon pace, banks stream past
CONVOY = ['bluefunnel', 'polish', 'hapag', 'swedish', 'french', 'portline', 'bulgarian']
GAP = 23.0

def convoy(n=5, dust=0.0, first=20.0):
	ships = []
	for i in range(n):
		sh = ship(f'cv{i}', CONVOY[i % len(CONVOY)], (0, 0, 0), math.pi / 2)
		set_dust(sh['sid'], dust)
		if dust < 0.5:
			wk = wake(sh['sid'] + '_wake', 7, 10, 0.16); wk.parent = sh['root']; wk.location = (7.3 * sh['k'], 0, 0.0)
		sh['y0'] = first + GAP * i
		ships.append(sh)
	return ships

def place_convoy(ships, t, v=V, bob=True):
	for i, sh in enumerate(ships):
		y = sh['y0'] + v * t
		sh['root'].location = (0.0, y, (0.015 * math.sin(t * 1.3 + i) if bob else 0))
		sh['root'].rotation_euler = (math.radians(0.4 * math.sin(t * 0.9 + i)), 0, math.pi / 2)
		wave_flag(sh, t)

def palms(n, box, seed):
	return scatter(['tree_palmTall.glb', 'tree_palmDetailedTall.glb', 'tree_palm.glb'], n, box, 2.6, 4.0, seed=seed, ink=0.05, z=0.35)

def smoke_trail(name, n, col=(0.32, 0.29, 0.33)):
	"""pool of puffs; update with emit(points, t)"""
	ps = [puff(f'{name}{k}', (0, 0, -50), 1.0, col=col, bands=((0.55, 0.5, 0.6), (0.8, 0.76, 0.82), (1, 1, 1)), ink=0.06) for k in range(n)]
	return ps

# ======================================================================================================== canal variants
if VAR in ('then', 'later', 'war'):        # (the old canal 'twosail' branch below is unused since v8)
	if VAR in ('then', 'later'):
		ramp_world(SKY_DAWN)        # 'later' starts as the same dawn and ages with the ships
		sun(3.4, (1.0, 0.86, 0.66), (70, 0, 150))
		desert('desert', -70, 70, -30, 260, res=0.7, canal_w=5.5, bank=3.5, dunes=0.9, seed=5)
		water('canal', (40, 400), (0, 100), col='#2b9db8', col2='#7fd8e0', z=0.0, scale=0.12)
		sun_disc((40, 420, 22), 14, '#ffe2a0' if VAR == 'then' else '#ffd58a')
		cloud('c1', (-40, 300, 70), 12, seed=3, ink=0.25); cloud('c2', (60, 360, 95), 16, seed=7, ink=0.3); cloud('c3', (-10, 420, 120), 18, seed=9, ink=0.3)
		palms(10, (-60, 40, -16, 220), 11)
		ships = convoy(5, dust=0.0)
		tugs = []
		if False:     # v8: no tugs — 'later' is the same convoy ageing on screen while the 1967→1975 bar fills
			for i, sh in enumerate(ships):
				tg = tug(f'tug{i}', (0, 0, 0), math.pi / 2); tg['root'].scale = (1.35, 1.35, 1.35)
				tg['rope'] = prim('cyl', f'rope{i}', toon_mat('rope', C('#e7d6b0')), (0, 0, 0), (0.025, 0.025, 1), seg=6)
				tugs.append(tg)
		cam = camera(30)
		AGE0 = W(13) - 0.2          # ageing runs with the YearsBar fill (Remotion: W(13) − 0.05 … + 0.85)
		def update(t):
			place_convoy(ships, t)
			if VAR == 'later':
				k = smooth(clamp01((t - AGE0) / 0.95))
				for sh in ships: set_dust(sh['sid'], k)
				ramp = next(n for n in bpy.context.scene.world.node_tree.nodes if n.type == 'VALTORGB')
				for el, (_, c0), (_, c1) in zip(ramp.color_ramp.elements, SKY_DAWN, SKY_HAZE):
					el.color = (*[lerp(a_, b_, k) for a_, b_ in zip(c0, c1)], 1)
			for i, tg in enumerate(tugs):
				sh = ships[i]; y = sh['root'].location.y + 7.5 + 5.5
				tg['root'].location = (1.9 + 0.2 * math.sin(t + i), y, 0.0)
				a = Vector((0, sh['root'].location.y + 7.4, 0.75)); b = Vector((tg['root'].location.x, y - 2.0, 0.55))
				d = b - a; tg['rope'].location = (a + b) / 2; tg['rope'].scale = (0.025, 0.025, d.length / 2)
				tg['rope'].rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
			yc = V * t
			look(cam, (4.2 - 0.25 * t, yc + 4.0, 5.2 - 0.25 * t), (-0.8, yc + 46, -0.6))
		render(update, VAR)

	elif VAR == 'war':
		ramp_world(SKY_DAY)
		sun(3.8, (1.0, 0.9, 0.72), (55, 0, -60))
		desert('desert', -90, 90, -20, 260, res=0.8, canal_w=5.5, bank=3.5, dunes=1.0, seed=8)
		water('canal', (40, 400), (0, 100), col='#2b9db8', col2='#7fd8e0', scale=0.12)
		cloud('c1', (150, 260, 95), 14, seed=13, ink=0.28); cloud('c2', (200, 120, 110), 12, seed=15, ink=0.25)
		ships = convoy(4, dust=0.0, first=-6.0)
		# far smoke columns on the eastern horizon (Sinai) — they rise on «war broke out»
		yf2.volume_setup(end=450.0, samples=96)
		cols = []
		for k, (x, y, t_) in enumerate(((80, 150, W(18) + 0.05), (86, 205, W(19) + 0.05), (70, 112, W(20) + 0.1))):
			o, _ = yf2.plume(f'sm{k}', None, (x, y, 0), length=62, width=30, tilt=78, yaw=200, color='#4a4342', color_end='#d2c6bd',
			                 density=1.6, speed=(1.5, -1.0, 6.0), r0=0.12, soft=0.14)
			cols.append((o, x, y, t_))
		jets = [yf2.jet2('jet0', s=2.4), yf2.jet2('jet1', s=2.4)]
		trails = [yf2.trail(f'tr{j}', 1.3, yaw=math.degrees(math.atan2(0.54, -0.84))) for j in range(2)]
		cam = camera(28)
		JT = [(W(16) + 0.15, 0.0), (W(16) + 0.45, 6.0)]
		def jet_pos(j, t):
			t0, off = JT[j]
			k = (t - t0) / 1.3                     # crosses the frame right → left, perpendicular to the view
			c = Vector((-1.0, 22.0 + off * 0.6, 9.0 + off * 0.3)); d = Vector((0.84, -0.54, 0))
			return c + d * (30 - 60 * k), k
		def update(t):
			place_convoy(ships, t)
			for j, jt in enumerate(jets):
				p, k = jet_pos(j, t)
				jt.location = p; jt.rotation_euler = (math.radians(-38), math.radians(-6), math.atan2(-0.54, 0.84) + math.pi)
				set_visible(jt, -0.1 < k < 1.3)
				tr = trails[j]
				if k < -0.05 or k > 1.7:
					tr.location = (0, 0, -50); continue
				tr.location = p + Vector((0.84, -0.54, 0)) * 2.2           # behind the jet's tail
				tr.scale.x = max(0.5, min(48.0, 60 * (k + 0.05)))            # the trail grows as the jet flies on
			for o, x, y, t_ in cols:
				a = clamp01((t - t_) / 1.1)                # the column billows up from the ground
				g = 0.12 + 0.88 * easeOut(a)
				o.scale = (62 * g, 30 * (0.4 + 0.6 * g), 30 * (0.4 + 0.6 * g))
				set_visible(o, a > 0)
			yc = V * t
			look(cam, (-11.5, 3 + yc * 0.6, 3.0), (3, 27 + yc * 0.6, 3.6))
		render(update, VAR)

	elif VAR == 'twosail':
		ramp_world(SKY_HAZE)
		sun(3.6, (1.0, 0.88, 0.66), (60, 0, 160))
		desert('desert', -90, 90, -40, 300, res=0.8, canal_w=5.5, bank=3.5, dunes=0.9, seed=21)
		water('canal', (40, 420), (0, 120), col='#2b9db8', col2='#7fd8e0', scale=0.12)
		sun_disc((-60, 520, 40), 16, '#ffd98f')
		cloud('c1', (-50, 330, 85), 14, seed=23, ink=0.28); cloud('c2', (70, 380, 100), 16, seed=25, ink=0.3)
		# two German ships steaming on their own (smoke + wake), behind them yellow ships on tow
		me = ship('munster', 'hapag', (0, 0, 0), math.pi / 2); nw = ship('nordwind', 'nordwind', (0, 0, 0), math.pi / 2, L=13, B=1.8)
		yf2.ship_name(me, 'MÜNSTERLAND'); yf2.ship_name(nw, 'NORDWIND')
		for s_ in (me, nw):
			set_dust(s_['sid'], 1.0)
			wk = wake(s_['sid'] + '_wake', 9, 11); wk.parent = s_['root']; wk.location = (7.2 * s_['k'], 0, 0.0)
		towed = []
		for i, lv in enumerate(('bluefunnel', 'polish', 'swedish')):
			sh = ship(f'tw{i}', lv, (0, 0, 0), math.pi / 2); set_dust(sh['sid'], 1.0)
			tg = tug(f'tg{i}', (0, 0, 0), math.pi / 2)
			tg['rope'] = prim('cyl', f'rope{i}', toon_mat('rope', C('#e7d6b0')), (0, 0, 0), (0.025, 0.025, 1), seg=6)
			towed.append((sh, tg))
		yf2.volume_setup(end=500.0, samples=96)
		for s_ in (me, nw):     # funnel smoke: a volumetric trail drifting back over the stern
			yf2.plume(s_['sid'] + '_plume', s_['root'], tuple(s_['smoke'].location), length=11 * s_['k'], width=2.6 * s_['k'], tilt=14)
		cam = camera(30)
		def update(t):
			u = t - T0
			ym = 31 + 2.4 * u; yn = 18 + 2.4 * u
			me['root'].location = (1.5, ym, 0); nw['root'].location = (-1.6, yn, 0)
			for s_ in (me, nw): wave_flag(s_, t, 1.4, 12)
			for i, (sh, tg) in enumerate(towed):
				ys = -14 - 24 * i + 0.6 * u
				sh['root'].location = (0.2 * (i % 2 * 2 - 1), ys, 0); wave_flag(sh, t, 0.6, 6)
				yt = ys + 7.5 + 4.2
				tg['root'].location = (0, yt, 0)
				a = Vector((sh['root'].location.x, ys + 7.4, 0.7)); b = Vector((0, yt - 1.5, 0.45)); d = b - a
				tg['rope'].location = (a + b) / 2; tg['rope'].scale = (0.025, 0.025, d.length / 2)
				tg['rope'].rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
			e = ease(u / (T1 - T0))
			look(cam, (lerp(-12, -8.5, e), lerp(-58, yn - 15, e), lerp(8, 5.2, e)), (lerp(0, 0.4, e), lerp(-22, ym + 9, e), lerp(0.5, 1.6, e)))
		render(update, VAR)

# ======================================================================================================== front (canal + lake from above)
elif VAR == 'front':
	ramp_world(SKY_DAY)
	sun(3.8, (1.0, 0.9, 0.72), (52, 0, -40))
	LAKE = (0, 175, 48, 80)
	desert('desert', -160, 160, -80, 420, res=1.0, canal_w=5.5, bank=3.5, lake=LAKE, dunes=1.0, seed=31)
	water('water', (320, 500), (0, 170), col='#2b9db8', col2='#7fd8e0', scale=0.1)
	cloud('c1', (-60, 330, 70), 14, seed=33, ink=0.3); cloud('c2', (70, 380, 90), 16, seed=35, ink=0.3)
	tanks = []
	for side, col in ((1, '#6f7d3c'), (-1, '#c9a066')):
		for k in range(16):
			y = -30 + k * 9.5 + (2.5 if side < 0 else 0)
			tk = tank(f'tk{side}_{k}', (side * 13.0, y, 0.35), math.pi if side > 0 else 0.0, col=col, s=3.6, ink=0.05)
			tanks.append((tk, side))
			tent(f'tn{side}_{k}', (side * (21 + 3 * (k % 2)), y + 3, 0.35), 0.3 * k, col='#b8a46a' if side > 0 else '#d9c08a', s=4.5, ink=0.05)
	# ships far away in the lake (small, anchored)
	for i in range(8):
		sh = ship(f'lk{i}', CONVOY[i % len(CONVOY)], (-18 + 12 * (i % 4), 150 + 22 * (i // 4), 0), math.radians(70 + 15 * i))
	# the dashed front line on the water
	dashes = [prim('cube', f'dash{k}', toon_mat('dash', C('#fff4dc'), flat=True), (0, -20 + k * 5.0, 0.03), (0.35, 1.5, 0.02), smooth_=False) for k in range(36)]
	cam = camera(32)
	def update(t):
		u = t - T0
		k_line = (t - (W(33) - 0.25)) / 0.75
		for k, d in enumerate(dashes):
			set_visible(d, k / len(dashes) < k_line)
		for tk, side in tanks:
			tk['tur'].rotation_euler = (0, 0, math.radians(8 * math.sin(u * 1.5 + tk['root'].location.y)))
		look(cam, (0, -40 + 3.2 * u, 24 - 0.5 * u), (0, 30 + 3.2 * u, 0))
	render(update, VAR)

# ======================================================================================================== the lake (anchored fleet)
elif VAR in ('lake', 'storm', 'twosail'):
	LAKE = (0, 0, 58, 112)
	ramp_world(SKY_DAY if VAR == 'lake' else SKY_HAZE)
	TS = VAR == 'twosail'
	sun(3.6, (1.0, 0.9, 0.72), (55, 0, 200))
	desert('desert', -150, 150, -200, 200, res=1.0, canal_w=8, bank=5.0, lake=LAKE, dunes=1.3, seed=41)
	water('water', (150, 300), (0, 0), col='#2b9db8', col2='#7fd8e0', scale=0.1)
	cloud('c1', (-80, 230, 90), 18, seed=43, ink=0.35); cloud('c2', (90, 260, 110), 20, seed=45, ink=0.35)
	# 14 ships rafted in groups of 3–4 (as they were moored), each group side by side
	GROUPS = [((-22, -50), 80, ('bluefunnel', 'portline', 'bluestar', 'swedish')), ((18, -8), 100, ('hapag', 'nordwind', 'polish', 'polish')),
	          ((-16, 36), 72, ('french', 'bulgarian', 'swedish')), ((20, 74), 95, ('american', 'czech', 'bluefunnel'))]
	fleet = []
	for g, ((cx, cy), yaw, livs) in enumerate(GROUPS):
		a = math.radians(yaw)
		nrm = Vector((-math.sin(a), math.cos(a), 0))
		for i, lv in enumerate(livs):
			off = (i - (len(livs) - 1) / 2) * 2.35
			small = lv == 'czech'
			sh = ship(f'g{g}_{i}', lv, (cx + nrm.x * off, cy + nrm.y * off, 0), a, L=11 if small else 15, B=1.6 if small else 2.0, small=small)
			sh['gx'] = cx; fleet.append(sh)
	# scuttled ships blocking both canal ends: masts, funnel tops, a tilted bow
	for k, y in enumerate((-125, 125)):
		mr = toon_mat('wreck', C('#3b3238'))
		for j, (x, h) in enumerate(((-2, 4.0), (1.5, 3.2), (3, 2.0))):
			prim('cyl', f'wmast{k}{j}', mr, (x, y + j * 2, h / 2), (0.08, 0.08, h / 2), seg=8, ink=0.04, rot=(0.15 * (j - 1), 0.1, 0))
		prim('cyl', f'wfun{k}', toon_mat('wfun', C('#6b3b2e')), (0, y + 3, 0.5), (0.6, 0.45, 0.6), seg=16, ink=0.05, rot=(0.25, 0, 0))
		prim('cube', f'wbow{k}', mr, (-1, y - 3, 0.4), (1.0, 2.5, 0.5), smooth_=False, ink=0.05, rot=(0.5, 0.0, 0.3))
	cam = camera(30)
	if VAR == 'twosail':
		# v8 (owner: «непонятно, не затягивающие»): from the air over the anchored yellow fleet, the two German ships fire up
		# (funnel smoke), back out of their raft and steam away north on their own; the other twelve stay.
		yf2.volume_setup(end=500.0, samples=96)
		for sh in fleet: set_dust(sh['sid'], 1.0)
		go = [sh for sh in fleet if sh['sid'] in ('g1_0', 'g1_1')]          # hapag (Münsterland) + nordwind in group 2
		yf2.ship_name(go[0], 'MÜNSTERLAND'); yf2.ship_name(go[1], 'NORDWIND')
		plumes = []
		for j, s_ in enumerate(go):
			o, dn = yf2.plume(s_['sid'] + '_plume', s_['root'], tuple(s_['smoke'].location), length=12 * s_['k'], width=3.0 * s_['k'], tilt=12)
			plumes.append(dn)
			wk = wake(s_['sid'] + '_wake', 9, 11); wk.parent = s_['root']; wk.location = (7.2 * s_['k'], 0, 0.0); s_['wake'] = wk
			s_['p0'] = s_['root'].location.copy(); s_['yaw0'] = s_['root'].rotation_euler.z
		G0 = T0 + 0.25
		M0 = (go[0]['root'].location + go[1]['root'].location) / 2
		def update(t):
			u = t - T0
			for sh in fleet: wave_flag(sh, t, 0.8, 7)
			for j, s_ in enumerate(go):
				a = s_['yaw0']; fwd = Vector((math.cos(a), math.sin(a), 0)); side = Vector((-math.sin(a), math.cos(a), 0))
				k1 = smooth(clamp01((t - G0 - 0.25 * j) / 0.9))            # sidestep out of the raft (away from the others)
				d2 = max(0.0, t - G0 - 0.5 - 0.3 * j); dist = 1.6 * d2 * d2 + 2.2 * d2   # then ahead, accelerating
				p = s_['p0'] - side * ((5.0, 2.4)[j] * k1) + fwd * dist
				s_['root'].location = (p.x, p.y, 0.02 * math.sin(t * 1.3 + j))
				s_['root'].rotation_euler.z = a - math.radians(6) * k1 * (1 - clamp01(d2 / 1.2))
				plumes[j].default_value = 3.0 * smooth(clamp01((t - T0) / 0.5))
				set_visible(s_['wake'], d2 > 0.05)
			m = (go[0]['root'].location + go[1]['root'].location) / 2 - M0
			e = ease(clamp01(u / (T1 - T0)))
			# low from the east (north = frame right): the two cross the frame and leave the raft behind; the camera
			# follows them at 60 % so the stuck ships slide out of frame left
			look(cam, (M0.x + 21 + 0.6 * m.x, M0.y - 11 + 0.6 * m.y + lerp(0, 2, e), lerp(4.6, 4.2, e)), (M0.x - 1 + 0.75 * m.x, M0.y + 1 + 0.75 * m.y, 2.6))
		render(update, VAR)
	elif VAR == 'lake':
		def update(t):
			u = (t - T0) / (T1 - T0)
			e = ease(u)
			for sh in fleet:
				wave_flag(sh, t, 0.8, 7); set_dust(sh['sid'], 0.15)
			look(cam, (lerp(-38, -22, e), lerp(-70, -165, e), lerp(4.5, 85, e)), (lerp(-22, 0, e), lerp(-50, -5, e), lerp(0.6, 0, e)))
		render(update, VAR)
	else:
		# storm: a towering, billowing dust wall (volume) rolls west over the fleet, swallows it, then settles → the yellow fleet
		sun_o = next(o for o in bpy.data.objects if o.type == 'LIGHT')
		sun_o.rotation_euler = (math.radians(68), 0, math.radians(float(arg('sunz', '180'))))   # low sun from the left: billows model
		yf2.volume_setup(end=float(arg('vend', '420')), samples=int(arg('vs', '128')), shadows=True)
		WALL, _ = yf2.volume_box('storm', (0, 0, 55), (100, 440, 110), arg('wc', '#c98a52'), 2.2, scale=0.04, soft=0.12, speed=(-8, 0, 3.0),
		                         anisotropy=0.35, grounded=True, color_top='#f2cf98', bottom_heavy=1.2, top_var=0.7, mottle=float(arg('mot', '0.5')))
		DENS = yf2.VOLD['storm'].outputs[0]
		W0 = T0; W1 = W(45)                    # the front crosses the lake during «Sandstorms dusted them yellow.»
		C0 = W(45) + 0.1; C1 = W(47)           # … and settles before «Yellow Fleet»
		def wall_x(t):   # x of the wall's west face
			return lerp(120, -40, easeOut(clamp01((t - W0) / (W1 - W0)))) - 30 * max(0.0, t - W1)   # then blows on past the camera
		sky_stops = SKY_HAZE
		def update(t):
			xw = wall_x(t)
			WALL.location.x = xw + 50
			DENS.default_value = 2.2 * (1 - smooth(clamp01((t - C0) / (C1 - C0))))
			set_visible(WALL, DENS.default_value > 0.01)
			for sh in fleet:
				# dust reaches a ship when the wall front has passed it
				d = clamp01((sh['root'].location.x - (xw - 10)) / 40)
				set_dust(sh['sid'], 0.15 + 0.85 * smooth(d)); wave_flag(sh, t, 1.6, 14)
			# sky: hazier while the wall passes
			wd = bpy.context.scene.world.node_tree
			ramp = next(n for n in wd.nodes if n.type == 'VALTORGB')
			k = clamp01(1 - abs((t - (W0 + W1) / 2) / ((W1 - W0) / 1.4)))
			for el, (_, c0) in zip(ramp.color_ramp.elements, sky_stops):
				el.color = (*[lerp(c, o, 0.55 * k) for c, o in zip(c0, (0.85, 0.62, 0.34))], 1)
			# camera: low beside group 2, then cranes up to the hero wide on «The Yellow Fleet»
			e = ease((t - (W(46) - 0.6)) / 1.6)
			look(cam, (lerp(-62, -58, e), lerp(-62, -78, e), lerp(6, 24, e)), (lerp(-4, 0, e), lerp(-20, 4, e), lerp(2, 0, e)))
		render(update, VAR)
