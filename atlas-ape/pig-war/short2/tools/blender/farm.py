"""Farm shots on the shared island set:  --variant caught | shot | british | price
caught  4.56–6.92  «A farmer caught it eating his potatoes.»   cabin door bangs open, the farmer storms out to the fence,
                    the boar keeps munching in the foreground
shot    6.92–8.28  «So he shot it.»   over the farmer's shoulder: aim → BANG (flash + a real powder-smoke volume), birds burst
                    out of a fir; the smoke rolls over the boar and its angel rises out of it (nothing graphic)
british 8.28–12.42 «Problem: the farmer was American. The pig was British.»  the Stars and Stripes runs up the pole by the
                    farmer, then pan up to the angel boar hovering over the patch with a Union Jack in its mouth
price  12.42–15.81 «He offered ten dollars. The owner wanted a hundred.»  across the split-rail fence: the farmer holds out
                    a $10 note, the owner (Hudson's Bay Co. man) shakes his head and slaps up a $100 note; the angel referees"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
import random
import pw, env
from island import *
from shots_t import SHOT
V = arg('variant', 'caught')
t0, t1 = SHOT(V)
setup2(t0, t1)
S = build(ships=0, hill_camp=False, far=True, keep_clear=[(-1.25, -0.55, 0.6), (-1.6, -0.6, 0.5)], grass=260, clouds=True)
cab = S['cabin']
CR = cab['root']; bpy.context.view_layer.update()
def cab_w(x, y, z=0.0): return CR.matrix_world @ Vector((x, y, z))
PIG_AT = Vector((-1.25, -0.55, 0.07))
FENCE_X = -2.2
cam = camera(30)

def look_at_yaw(src, dst):
	"""yaw for a Kenney character (faces −Y at yaw 0) to face from src to dst"""
	d = Vector(dst) - Vector(src)
	return math.atan2(d.x, -d.y)

def bang_light(at):
	ld = bpy.data.lights.new('flash', 'POINT'); ld.energy = 0.0; ld.color = (1.0, 0.75, 0.4); ld.shadow_soft_size = 0.2
	o = bpy.data.objects.new('flash', ld); bpy.context.scene.collection.objects.link(o); o.location = at
	return o

if V == 'caught':
	pg = pig('pig', PIG_AT, math.radians(-128)); pg['mode'] = 'chew'
	pot = potato('potmouth', 1.0); pot.parent = pg['jaw']; pot.location = (0.095, 0, -0.005)
	door_out = cab_w(0.25, -1.25); start = cab_w(0.25, -0.55); stop = Vector((-2.75, -0.15, 0.0))
	F = char('farmer', 'male-d', 'farmer', start, look_at_yaw(start, door_out), 0.62, 'idle')
	hat(F, 'straw'); r = rifle('frifle', 1.25); carry(F, r, 'shoulder')
	t_door = W(11) - 0.35; t_walk = t_door + 0.12; t_stop = W(14) + 0.1
	def update(t):
		# door bangs open (fast swing + rebound off the wall)
		u = t - t_door
		a = 0.0 if u < 0 else (-105 * easeOut(u / 0.16) if u < 0.16 else -105 + 12 * math.sin((u - 0.16) * 14) * math.exp(-(u - 0.16) * 7))
		cab['hinge'].rotation_euler = (0, 0, math.radians(a))
		# the farmer storms out to the fence, then stands glaring at the boar
		if t < t_walk:
			F['root'].location = start; set_clip(F, 'idle')
		elif t < t_stop:
			k = ease((t - t_walk) / (t_stop - t_walk))
			p = start.lerp(door_out, min(1, k * 2.2)) if k < 0.45 else door_out.lerp(stop, (k - 0.45) / 0.55)
			F['root'].location = p
			tgt = door_out if k < 0.45 else stop
			F['root'].rotation_euler.z = look_at_yaw(p, tgt) if (tgt - p).length > 0.05 else look_at_yaw(p, PIG_AT)
			set_clip(F, 'sprint', 1.15)
		else:
			F['root'].location = stop; F['root'].rotation_euler.z = look_at_yaw(stop, PIG_AT); set_clip(F, 'idle', 1.0)
		# camera: low behind the munching boar, slow push towards the cabin
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((-0.35, -2.75, 0.62)).lerp(Vector((-0.55, -2.45, 0.6)), k), Vector((-3.1, 0.55, 0.62)).lerp(Vector((-2.9, 0.3, 0.55)), k))
	cam.data.lens = 26

elif V == 'shot':
	pg = pig('pig', PIG_AT, math.radians(160)); pg['mode'] = 'chew'
	pot = potato('potmouth', 1.0); pot.parent = pg['jaw']; pot.location = (0.095, 0, -0.005)
	ang = pig('angel', PIG_AT + Vector((0, 0, -0.6)), math.radians(-70), angel=True); ang['mode'] = 'float'
	stop = Vector((-2.75, -0.15, 0.0))
	F = char('farmer', 'male-d', 'farmer', stop, look_at_yaw(stop, PIG_AT), 0.62, 'holding-both-shoot')
	hat(F, 'straw'); r = rifle('frifle', 1.45); carry(F, r, 'aim', pitch=-15.0)
	t_bang = W(19) + 0.02
	fl = bang_light((0, 0, 0))
	flash_m = pw.mat('muzzle', '#ffcf6a', 0.3, emit=('#ffb347', 30.0))
	flash = prim('ico', 'muzzleflash', flash_m, (0, 0, -9), (0.05, 0.05, 0.05), sub=2)
	volume_setup(end=60.0, samples=64)
	smoke, _ = volume_box('powder', (0, 0, -9), (1.0, 1.0, 1.0), '#f1ece8', 0.0, scale=2.2, thr=0.3, soft=0.16, speed=(0.1, 0.0, 0.35), anisotropy=0.3, color_top='#ffffff', mottle=0.25)
	smoke.visible_shadow = False
	# birds: little dark V-shapes that burst out of the fir behind the boar
	rnd = random.Random(3); birds = []
	bm_ = pw.mat('bird', '#2a2830', 0.6)
	for k in range(9):
		b = empty(f'bird{k}', (0, 0, 0))
		for sgn in (-1, 1):
			wgt = prim('cube', f'bw{k}{sgn}', bm_, (sgn * 0.11, 0, 0), (0.11, 0.04, 0.008)); wgt.parent = b
			wgt['sgn'] = sgn
		prim('sphere', f'bb{k}', bm_, (0, 0, 0), (0.04, 0.07, 0.03)).parent = b
		b['v'] = (rnd.uniform(-1.6, 1.6), rnd.uniform(0.4, 2.0), rnd.uniform(1.6, 2.6)); b['ph'] = rnd.uniform(0, 6)
		b.scale = (0, 0, 0); birds.append(b)
	def update(t):
		u = t - t_bang
		bpy.context.view_layer.update()
		muzzle = r.matrix_world @ Vector(r['muzzle'])
		fwd = (r.matrix_world.to_quaternion() @ Vector((0, 1, 0))).normalized()
		# flash: 3 frames
		on = 0 <= u < 0.05
		flash.location = muzzle + fwd * 0.05 if on else (0, 0, -9); flash.scale = (0.045, 0.07, 0.045) if on else (0.01,) * 3
		fl.location = muzzle + fwd * 0.1; fl.data.energy = 90.0 * max(0.0, 1 - u / 0.07) if u >= 0 else 0.0
		# powder smoke: a big billowing puff that rolls forward over the boar and thins
		if u >= 0:
			g = easeOut(u / 0.5)
			c = muzzle + fwd * (0.2 + 1.05 * easeOut(u / 0.7)) + Vector((0, 0, 0.08 + 0.18 * u))
			smoke.location = c; sz = 0.18 + 1.05 * g; smoke.scale = (sz * 1.25, sz * 1.15, sz * 1.05)
			VOLD['powder'].outputs[0].default_value = 7.0 * (1 - 0.6 * clamp01((u - 0.55) / 0.6))
		else:
			smoke.location = (0, 0, -9); VOLD['powder'].outputs[0].default_value = 0.0
		# recoil
		F['root'].location = stop - Vector((0.05, -0.02, 0)) * (math.exp(-u * 12) * (1 if u >= 0 else 0))
		# the boar vanishes inside the smoke; its angel rises out of it
		hide = u > 0.22
		pg['root'].scale = (0.0,) * 3 if hide else (1.0,) * 3
		if u > 0.35:
			k = easeOut((u - 0.35) / 0.9)
			ang['root'].location = PIG_AT + Vector((0, 0, 0.1 + 0.75 * k))
			ang['root'].scale = (k ** 0.5,) * 3
		else:
			ang['root'].scale = (0.0,) * 3
		# birds
		for b in birds:
			if u < 0.05: b.scale = (0, 0, 0); continue
			v = Vector(b['v']); w = u - 0.05
			b.location = Vector((0.9, 3.2, 1.6)) + Vector((v.x, v.y * 0.6, v.z)) * w + Vector((0, 0, -0.3 * w * w))
			b.scale = (1.0,) * 3
			b.rotation_euler = (0, 0, math.atan2(v.x, v.y) * -1)
			for ch in b.children:
				if 'sgn' in ch: ch.rotation_euler = (0, ch['sgn'] * math.sin(t * 38 + b['ph']) * 0.9, 0)
		# camera behind the farmer's right shoulder, slight push in; a small kick on the bang
		k = ease((t - t0) / (t1 - t0))
		kick = 0.0 if u < 0 else 0.02 * math.exp(-u * 10) * math.sin(u * 60)
		look(cam, Vector((-2.05, -3.35, 0.78)).lerp(Vector((-2.0, -3.1, 0.76)), k) + Vector((0, 0, kick)), Vector((-1.95, -0.38, 0.55)))
	cam.data.lens = 22

elif V == 'british':
	ang = pig('angel', PIG_AT + Vector((0, 0, 0.9)), math.radians(-80), angel=True); ang['mode'] = 'float'
	stop = Vector((-2.75, -0.15, 0.0))
	F = char('farmer', 'male-d', 'farmer', stop, math.radians(20), 0.62, 'idle')
	hat(F, 'straw'); r = rifle('frifle', 1.25); carry(F, r, 'shoulder')
	pole_at = cab_w(1.35, -1.0)
	pole, cloth = env.flagpole('cabflag', (pole_at.x, pole_at.y, 0.0), 'us_1859', h=2.6, size=(0.55, 0.32))
	base_z = cloth.location.z
	# Union Jack on a stick in the angel's mouth
	stick = prim('cyl', 'ujstick', pw.mat('stick', '#d8c49c', 0.7), (0.1, 0.12, 0.08), (0.008, 0.008, 0.2), seg=8); stick.parent = ang['jaw']
	stick.rotation_euler = (math.radians(-60), 0, 0)
	import frigate as FG
	uj = FG.flag_obj('ujflag', 'union_jack', (0.0, 0, 0), (0.17, 0.11), ang['jaw'])
	uj.location = (0.1, 0.36, 0.2); uj.rotation_euler = (math.pi / 2, 0, math.radians(90))
	env.FLAGS_W.append(uj)
	t_us, t_uk = W(25) - 0.35, W(29) - 0.3
	def update(t):
		# Stars and Stripes runs up the pole on «American»
		k = easeOut((t - t_us) / 0.55)
		cloth.location.z = base_z - 1.9 * (1 - k)
		cloth.scale = (0.55, 0.32 * (0.3 + 0.7 * k), 1)
		F['root'].rotation_euler.z = math.radians(20) + math.radians(-60) * ease((t - (W(26) - 0.2)) / 0.5)
		set_clip(F, 'idle')
		# Union Jack pops out of the angel's mouth on «British»
		s_ = pop_k(t, t_uk, 0.35)
		stick.scale = (0.008, 0.008, 0.2 * max(s_, 1e-3)); uj.scale = (0.17 * max(s_, 1e-3), 0.11 * max(s_, 1e-3), 1)
		# camera: farmer + flag, then pan up/right to the angel
		kp = ease((t - (W(26) - 0.35)) / 0.75)
		pos = Vector((-1.35, -2.45, 0.75)).lerp(Vector((-0.75, -2.35, 0.95)), kp)
		tgt = Vector((-2.55, 0.0, 0.85)).lerp(PIG_AT + Vector((0, 0, 1.0)), kp)
		look(cam, pos, tgt); cam.data.lens = 30 + 8 * kp

elif V == 'price':
	ang = pig('angel', Vector((FENCE_X, -0.45, 1.05)), math.radians(-90), angel=True, s=0.7); ang['mode'] = 'float'
	pf, po = Vector((FENCE_X + 0.4, -0.75, 0.0)), Vector((FENCE_X - 0.4, -0.75, 0.0))
	F = char('farmer', 'male-d', 'farmer', pf, look_at_yaw(pf, po) + math.radians(40), 0.62, 'idle')
	hat(F, 'straw')
	O = char('owner', 'male-b', 'owner', po, look_at_yaw(po, pf) - math.radians(40), 0.62, 'idle')
	hat(O, 'bowler')
	n10 = note('note10', '10', 0.3); n100 = note('note100', '100', 0.3)
	t10, tno, t100 = W(31) - 0.15, W(35) - 0.1, W(37) - 0.2
	def hold_note(P, n, k):
		rh, _ = hands(P)
		rot = P['root'].matrix_world.to_quaternion()
		n.location = rh + rot @ Vector((0, -0.06, 0.07))
		n.rotation_mode = 'XYZ'; n.rotation_euler = (math.radians(80), 0, math.radians(8 if P is F else -8))
		n.scale = (0.15 * max(k, 1e-3), 0.0645 * max(k, 1e-3), 1)
	def update(t):
		# farmer offers $10
		set_clip(F, 'holding-right' if t >= t10 else 'idle', 1.0, t=t10)
		set_clip(O, 'emote-no' if tno <= t < t100 else ('holding-right' if t >= t100 else 'idle'), 1.0, t=tno if t < t100 else t100)
		look(cam, Vector((FENCE_X - 0.05, -2.75, 0.62)).lerp(Vector((FENCE_X - 0.05, -2.5, 0.6)), ease((t - t0) / (t1 - t0))), Vector((FENCE_X, -0.6, 0.62)))
		# the angel looks from one to the other
		ang['root'].rotation_euler.z = math.radians(-90) + math.radians(55) * (1 if t < tno else -1) * ease(abs((t - (t10 if t < tno else tno))) / 0.4)
	def notes_tick(t):
		hold_note(F, n10, pop_k(t, t10 + 0.25, 0.3))
		hold_note(O, n100, pop_k(t, t100 + 0.25, 0.3))
	pw.UPDATERS.append(notes_tick)
	cam.data.lens = 30

def pop_k(t, a, d):
	x = (t - a) / d
	if x <= 0: return 0.0
	if x >= 1: return 1.0
	return 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2

render2(update, V)
