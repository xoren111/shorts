"""Joint occupation shots on the island meadow:  --variant stayed | party
stayed 29.42–33.23 «So both sides just stayed. For twelve years.»  a redcoat and a bluecoat sentry side by side between
        the British camp (left, Union Jack) and the American camp (right, Stars and Stripes); time-lapse: the sun sweeps,
        the meadow goes green → snow → green three times, and their beards grow longer and longer (year bar in Remotion)
party  33.23–34.50 «And partied together.»  one long table for both garrisons: tankards clink, a cake with both flags,
        fireworks over the camps"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
import random
from island import *
import pw, env
from shots_t import SHOT
V = arg('variant', 'stayed')
t0, t1 = SHOT(V)
setup2(t0, t1)
S = build(cabin=False, patch=False, hill_camp=False, ships=0, grass=300, clouds=True, sun_rot=(52, 0, 200))
cam = camera(28)
# the two camps either side of the meadow
for k in range(3):
	env.tent(f'uk_tent{k}', (-3.8 - k * 1.1, 4.0 + k * 0.7, 0), math.radians(20 + k * 15), 1.6, '#f1ebdc')
	env.tent(f'us_tent{k}', (3.6 + k * 1.1, 4.2 + k * 0.6, 0), math.radians(-25 - k * 12), 1.6, '#e8dfc8')
ukp, ukc = env.flagpole('ukpole', (-1.35, 2.6, 0), 'union_jack', h=2.4, size=(0.55, 0.3))
usp, usc = env.flagpole('uspole', (1.75, 2.6, 0), 'us_1859', h=2.4, size=(0.55, 0.31))

# ------------------------------------------------------------------ snow overlay for the time-lapse
SNOWN = []
def add_snow(m, amount=1.0):
	if not m or not m.use_nodes: return
	nt = m.node_tree
	bs = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
	if bs is None: return
	inp = bs.inputs['Base Color']
	src = inp.links[0].from_socket if inp.is_linked else None
	mix = nt.nodes.new('ShaderNodeMixRGB'); mix.blend_type = 'MIX'; mix.inputs['Fac'].default_value = 0.0
	if src is not None: nt.links.new(src, mix.inputs['Color1'])
	else: mix.inputs['Color1'].default_value = inp.default_value
	mix.inputs['Color2'].default_value = (0.92, 0.94, 0.98, 1)
	nt.links.new(mix.outputs['Color'], inp)
	SNOWN.append((mix, amount))

if V == 'stayed':
	for m in bpy.data.materials:
		n = m.name.lower()
		if n.startswith('meadow'): add_snow(m, 0.92)
		elif 'leafs' in n or 'grass' in n: add_snow(m, 0.55)
		elif n.startswith('k_') and ('colorred' in n or 'wood' in n): add_snow(m, 0.3)
	R = char('redcoat', 'male-f', 'uk', (-0.36, 0.2, 0), math.radians(8), 0.66, 'idle', 1.0, 0.0)
	hat(R, 'shako'); r1 = rifle('rr', 1.3); carry(R, r1, 'shoulder')
	B = char('bluecoat', 'male-d', 'us', (0.36, 0.2, 0), math.radians(-8), 0.66, 'idle', 1.0, 0.5)
	hat(B, 'kepi'); r2 = rifle('br', 1.3); carry(B, r2, 'shoulder')
	bR = beard(R, 'full', '#5a3a26'); bB = beard(B, 'full', '#b8642e')
	sun_o = S['sun']
	def update(t):
		u = clamp01((t - (W(69) - 0.1)) / (W(76) + 0.3 - (W(69) - 0.1)))      # 0 → 1 over «stayed … twelve years»
		# beards grow (from stubble to the belt)
		g = 0.12 + 4.2 * u ** 1.2
		for b in (bR, bB):
			b.scale = (1.0 + 0.08 * u, 1.0 + 0.2 * u, g)
		# seasons: three winters, smooth
		snow = 0.85 * (0.5 - 0.5 * math.cos(u * 4 * math.pi)) if u > 0 else 0.0      # two smooth winters
		for mix, a in SNOWN: mix.inputs['Fac'].default_value = snow * a
		# the sun sweeps across the sky (soft, no flicker)
		sun_o.rotation_euler = (math.radians(52), 0, math.radians(200 + 300 * u))
		sun_o.data.energy = 4.2
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((0.0, -2.9, 0.7)).lerp(Vector((0.0, -2.6, 0.68)), k), Vector((0.0, 1.5, 0.78)))
	cam.data.lens = 30
else:
	rnd = random.Random(7)
	wood = pbr('table', '#8a6040', 'weathered_planks', 2.0, 0.6, 0.6)
	tab = cube('table', wood, (0, 1.2, 0.26), (1.8, 0.3, 0.025), bev=0.01)
	for x in (-1.6, 1.6):
		for y in (0.97, 1.43):
			cube(f'leg{x}{y}', wood, (x, y, 0.13), (0.03, 0.03, 0.13))
	cake = prim('cyl', 'cake', pw.mat('cake', '#f6efe4', 0.6), (0.0, 1.2, 0.36), (0.16, 0.16, 0.08), seg=32)
	prim('cyl', 'cake2', pw.mat('cream', '#f2b8c6', 0.5), (0.0, 1.2, 0.45), (0.11, 0.11, 0.05), seg=32)
	import frigate as FG
	for k_, (fn, dx) in enumerate((('union_jack', -0.05), ('us_1859', 0.05))):
		prim('cyl', f'ck_st{k_}', pw.mat('stick', '#d8c49c', 0.7), (dx, 1.2, 0.58), (0.004, 0.004, 0.09), seg=6)
		fo = FG.flag_obj(f'ck_fl{k_}', fn, (dx + (-0.05 if dx < 0 else 0.05), 1.2, 0.63), (0.045, 0.028), None)
		if dx < 0: fo.scale.x = -fo.scale.x
		env.FLAGS_W.append(fo)
	people, mugs = [], []
	seats = [(-1.58 + i * 0.45, 1.62 + (0.06 if i % 2 else 0.0), 'uk' if i % 2 == 0 else 'us') for i in range(8)]
	for i, (x, y, side) in enumerate(seats):
		front = y < 1.2
		P = char(f'p{i}', ['male-f', 'male-d', 'male-b'][i % 3] if side == 'us' else ['male-d', 'male-f'][i % 2], side, (x, y, 0), math.radians(180) if front else 0.0, 0.62, 'idle', 1.0, i * 0.17)
		hat(P, 'kepi' if side == 'us' else 'shako')
		mug = prim('cyl', f'mug{i}', pw.mat('pewter', '#d3d6dc', 0.25, 0.9), (0, 0, 0), (0.05, 0.05, 0.065), seg=16)
		prim('cyl', f'foam{i}', pw.mat('foam', '#fff8e8', 0.8), (0, 0, 0.065), (0.052, 0.052, 0.012), seg=16).parent = mug
		people.append(P); mugs.append(mug)
	# fireworks: bursts of glowing sparks over the camps
	bursts = []
	for b in range(3):
		col = ['#ff5a5a', '#ffffff', '#5a8cff'][b]
		m = pw.mat(f'spark{b}', col, 0.3, emit=(col, 25.0))
		c = Vector((-0.5 + b * 1.6, 5.5 + b * 0.8, 2.6 + (b % 2) * 0.7)); t_b = t0 + 0.15 + b * 0.38
		sp = []
		for k in range(42):
			d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()
			o = prim('ico', f'sp{b}_{k}', m, (0, 0, -50), (0.06,) * 3, sub=1)
			sp.append((o, d))
		bursts.append((c, t_b, sp))
	def update(t):
		for i, P in enumerate(people):
			cheer_t = t0 + 0.25 + (i % 3) * 0.06
			set_clip(P, 'idle')
		for (c, t_b, sp) in bursts:
			u = t - t_b
			for o, d in sp:
				if u < 0 or u > 1.4: o.location = (0, 0, -50); continue
				o.location = c + d * (1.5 * easeOut(u / 0.9)) + Vector((0, 0, -0.4 * u * u))
				s_ = 0.07 * (1 - clamp01((u - 0.6) / 0.8)); o.scale = (s_,) * 3
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((-0.25, -1.05, 0.62)).lerp(Vector((0.05, -0.9, 0.62)), k), Vector((0.0, 1.5, 0.78)))
	def mugs_tick(t):
		# toast: right arm swings forward-up (mug raised towards the table centre), a little bob per person
		for i, P in enumerate(people):
			k = easeOut((t - (t0 + 0.2 + (i % 3) * 0.07)) / 0.35)
			bob = 0.08 * math.sin(t * 7 + i)
			sgn = -1
			d = Vector((sgn * 0.25, -0.15, -0.95)).lerp(Vector((sgn * 0.12 * (1 if i < 4 else -1) + 0.0, -0.55, 0.82 + bob)), k)
			pb = P['arm'].pose.bones['arm-right']; pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = pw.yf2._arm_q('arm-right', d)
		bpy.context.view_layer.update()
		for i, (P, mug) in enumerate(zip(people, mugs)):
			rh, _ = hands(P)
			rot = P['root'].matrix_world.to_quaternion()
			mug.location = rh + rot @ Vector((0, -0.02, 0.05))
	pw.UPDATERS.append(mugs_tick)
	cam.data.lens = 24
render2(update, V)
