"""v2 farm shots (painting look, real metres):  --variant caught | shot | british | price
caught  «A farmer caught it eating his potatoes.»   the cabin door bangs open, the farmer strides out towards the boar
shot    «So he shot it.»   side view: he aims → BANG (flash + powder smoke), birds burst up, the angel rises from the smoke
british «Problem: the farmer was American. The pig was British.»   Stars and Stripes runs up by the cabin → pan to the angel
         boar over the patch with a Union Jack
price   «He offered ten dollars. The owner wanted a hundred.»   farmer holds out a note, the HBC man shakes his head, then
         holds up his own; the angel hovers between them"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
import random
from island2 import *
from shots_t import SHOT
import pw, env, frigate as FG, animals
V = arg('variant', 'caught')
t0, t1 = SHOT(V)
setup_hist(t0, t1)
sun2(3.6, (1.0, 0.8, 0.58), (58, 0, 215), 1.5)
sun2(1.0, (0.85, 0.9, 1.0), (70, 0, 20), 3.0)
PIG = Vector((-4.4, -0.9, 0.0))
S = build2(hill_camp=False, ships=1, soldiers=0, keep_clear=[(PIG.x, PIG.y, 1.4), (-6.3, -2.4, 2.4)], grass=380)
cab = S['cabin']; CR = cab['root']; bpy.context.view_layer.update()
def cab_w(x, y, z=0.0): return CR.matrix_world @ Vector((x, y, z))
UPDATERS.append(lambda t: [animals.boar_pd_tick(b, t) for b in animals.BOARS])
cam = camera(28); dof(cam, 8.0)

def face_yaw(src, dst):
	d = Vector(dst) - Vector(src)
	return math.atan2(d.x, -d.y)

def walker(phase_speed=1.8, stride=1.15, base='stand'):
	return lambda P, t: walk_pose((t - P.get('walk_t0', 0.0)) * phase_speed, stride, base)

if V == 'caught':
	B = animals.boar_pd('boar', PIG, math.radians(-160)); B['mode'] = 'chew'; pot = animals.mouth_potato(B)
	door_out = cab_w(0.25, -1.4); start = cab_w(0.25, -0.5); stop = Vector((-6.9, -0.1, 0.0))
	F = human('farmer', 'farmer', start, face_yaw(start, door_out), seed=3, pose='stand')
	t_door = W(11) - 0.35; t_walk = t_door + 0.15; t_stop = W(14) + 0.15
	def update(t):
		u = t - t_door
		a = 0.0 if u < 0 else (-105 * easeOut(u / 0.16) if u < 0.16 else -105 + 12 * math.sin((u - 0.16) * 14) * math.exp(-(u - 0.16) * 7))
		cab['hinge'].rotation_euler = (0, 0, math.radians(a))
		if t < t_walk:
			F['root'].location = start; set_pose(F, 'stand')
		elif t < t_stop:
			k = (t - t_walk) / (t_stop - t_walk)
			p = start.lerp(door_out, min(1, k * 2.4)) if k < 0.4 else door_out.lerp(stop, (k - 0.4) / 0.6)
			F['root'].location = p
			tgt = door_out if k < 0.4 else stop
			F['root'].rotation_euler.z = face_yaw(p, tgt) if (tgt - p).length > 0.05 else face_yaw(p, PIG)
			if F['pose'] == 'stand': F['walk_t0'] = t_walk
			set_pose(F, walker(1.9, 1.2), t, 0.15)
		else:
			F['root'].location = stop; F['root'].rotation_euler.z = face_yaw(stop, PIG); set_pose(F, 'point', t, 0.3)
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((-2.6, -5.2, 1.05)).lerp(Vector((-3.0, -4.6, 1.05)), k), Vector((-7.6, 2.4, 1.6)).lerp(Vector((-7.4, 1.6, 1.4)), k))
		cam.data.dof.focus_distance = 6.5
	cam.data.lens = 28

elif V == 'shot':
	B = animals.boar_pd('boar', PIG, math.radians(-160)); B['mode'] = 'chew'; pot = animals.mouth_potato(B)
	A = animals.boar_pd('angel', PIG + Vector((0, 0, -2.0)), math.radians(-70), angel=True); A['mode'] = 'float'
	stop = Vector((-6.9, -0.1, 0.0))
	F = human('farmer', 'farmer', stop, face_yaw(stop, PIG), seed=3, pose='aim')
	r = rifle_for(F)
	t_bang = W(19) + 0.02
	ld = bpy.data.lights.new('flash', 'POINT'); ld.energy = 0.0; ld.color = (1.0, 0.75, 0.4); ld.shadow_soft_size = 0.3
	fl = bpy.data.objects.new('flash', ld); bpy.context.scene.collection.objects.link(fl)
	flash = prim('ico', 'muzzleflash', pw.mat('muzzle', '#ffcf6a', 0.3, emit=('#ffb347', 40.0)), (0, 0, -50), (0.1,) * 3, sub=2)
	volume_setup(end=120.0, samples=64)
	smoke, _ = volume_box('powder', (0, 0, -50), (1.0, 1.0, 1.0), '#e9e4df', 0.0, scale=1.1, thr=0.36, soft=0.3, speed=(0.15, 0.0, 0.3), anisotropy=0.35,
	                      color_top='#f7f3ee', mottle=0.45)
	rnd = random.Random(3); birds = []
	bm_ = pw.mat('bird', '#2a2830', 0.6)
	for k in range(11):
		b = empty(f'bird{k}', (0, 0, 0))
		for sgn in (-1, 1):
			w_ = prim('cube', f'bw{k}{sgn}', bm_, (sgn * 0.16, 0, 0), (0.16, 0.06, 0.01)); w_.parent = b; w_['sgn'] = sgn
		prim('sphere', f'bb{k}', bm_, (0, 0, 0), (0.06, 0.1, 0.045)).parent = b
		b['v'] = (rnd.uniform(-4, 4), rnd.uniform(1, 5), rnd.uniform(4, 7)); b['ph'] = rnd.uniform(0, 6); b.scale = (0, 0, 0); birds.append(b)
	def update(t):
		u = t - t_bang
		bpy.context.view_layer.update()
		muzzle = r.matrix_world @ Vector(r['muzzle']); fwd = (r.matrix_world.to_quaternion() @ Vector((0, 1, 0))).normalized()
		on = 0 <= u < 0.05
		flash.location = muzzle + fwd * 0.12 if on else (0, 0, -50); flash.scale = (0.12, 0.2, 0.12) if on else (0.01,) * 3
		fl.location = muzzle + fwd * 0.2; fl.data.energy = 4000.0 * max(0.0, 1 - u / 0.07) if u >= 0 else 0.0
		if u >= 0:
			g = easeOut(u / 0.5)
			c = muzzle + fwd * (0.4 + 1.6 * easeOut(u / 0.7)) + Vector((0, 0, 0.15 + 0.35 * u))
			smoke.location = c; sz = 0.4 + 2.2 * g; smoke.scale = (sz * 1.5, sz * 1.2, sz * 1.0)
			VOLD['powder'].outputs[0].default_value = 1.6 * (1 - 0.65 * clamp01((u - 0.45) / 0.6))
		else:
			smoke.location = (0, 0, -50); VOLD['powder'].outputs[0].default_value = 0.0
		F['root'].location = stop - Vector((0.12, -0.05, 0)) * (math.exp(-u * 12) if u >= 0 else 0)
		B['root'].scale = (0.0,) * 3 if u > 0.22 else (1.0,) * 3
		if u > 0.35:
			k = easeOut((u - 0.35) / 0.9)
			A['root'].location = PIG + Vector((0, 0, 0.3 + 1.9 * k)); A['root'].scale = (max(1e-3, k ** 0.5),) * 3
		else:
			A['root'].scale = (1e-3,) * 3
		for b in birds:
			if u < 0.05: b.scale = (0, 0, 0); continue
			v = Vector(b['v']); w = u - 0.05
			b.location = Vector((-3.0, 6.0, 4.0)) + v * w + Vector((0, 0, -0.6 * w * w)); b.scale = (1,) * 3
			b.rotation_euler = (0, 0, -math.atan2(v.x, v.y))
			for ch in b.children:
				if 'sgn' in ch: ch.rotation_euler = (0, ch['sgn'] * math.sin(t * 38 + b['ph']) * 0.9, 0)
		k = ease((t - t0) / (t1 - t0))
		kick = 0.0 if u < 0 else 0.05 * math.exp(-u * 10) * math.sin(u * 60)
		look(cam, Vector((-5.5, -5.6, 1.45)).lerp(Vector((-5.5, -5.1, 1.42)), k) + Vector((0, 0, kick)), Vector((-5.7, -0.5, 1.15)))
		cam.data.dof.focus_distance = 5.0
	cam.data.lens = 24

elif V == 'british':
	A = animals.boar_pd('angel', PIG + Vector((0, 0, 2.3)), math.radians(-40), angel=True); A['mode'] = 'float'
	stop = Vector((-6.9, -0.1, 0.0))
	F = human('farmer', 'farmer', stop, math.radians(20), seed=3, pose='stand')
	pole_at = cab_w(1.35, -1.1)
	pole, cloth = env.flagpole('cabflag', (pole_at.x, pole_at.y, 0.0), 'us_1859', h=7.5, size=(1.6, 0.9))
	base_z = cloth.location.z
	stick = prim('cyl', 'ujstick', pw.mat('stick', '#d8c49c', 0.7), (0, 0, 0), (0.015, 0.015, 0.35), seg=8)
	uj = FG.flag_obj('ujflag', 'union_jack', (0, 0, 0), (0.45, 0.28), None); env.FLAGS_W.append(uj)
	def uj_tick(t):
		snout = A['S_'].matrix_world @ Vector((0, -5.45, 2.35))
		yaw = A['root'].rotation_euler.z
		side = Vector((-math.sin(yaw), math.cos(yaw), 0))
		stick.location = snout + Vector((0, 0, 0.32)); stick.rotation_euler = (0, 0, 0)
		uj.location = snout + Vector((0, 0, 0.5)) + side * 0.46; uj.rotation_euler = (math.pi / 2, 0, yaw + math.pi / 2)
	UPDATERS.append(uj_tick)
	t_us, t_uk = W(25) - 0.35, W(29) - 0.3
	def update(t):
		k = easeOut((t - t_us) / 0.55)
		cloth.location.z = base_z - 5.5 * (1 - k); cloth.scale = (1.6, 0.9 * (0.3 + 0.7 * k), 1)
		F['root'].rotation_euler.z = math.radians(20) + math.radians(-60) * ease((t - (W(26) - 0.2)) / 0.5)
		set_pose(F, 'raise' if W(25) - 0.2 < t < W(26) + 0.2 else 'stand', t, 0.3)
		s_ = clamp01((t - t_uk) / 0.3)
		stick.scale = (0.015, 0.015, 0.35 * max(1e-3, s_)); uj.scale = (0.45 * max(1e-3, s_), 0.28 * max(1e-3, s_), 1)
		kp = ease((t - (W(26) - 0.35)) / 0.75)
		pos = Vector((-5.4, -4.9, 1.6)).lerp(Vector((-3.6, -6.2, 2.5)), kp)
		tgt = Vector((-7.2, 0.6, 2.2)).lerp(PIG + Vector((0, 0, 2.7)), kp)
		look(cam, pos, tgt); cam.data.lens = 30; cam.data.dof.focus_distance = (tgt - pos).length
elif V == 'price':
	A = animals.boar_pd('angel', Vector((-6.3, -1.4, 2.65)), math.radians(-90), angel=True, s=0.7); A['mode'] = 'float'
	pf, po = Vector((-5.25, -2.4, 0.0)), Vector((-7.35, -2.4, 0.0))
	F = human('farmer', 'farmer', pf, face_yaw(pf, po) + math.radians(35), seed=3, pose='stand')
	O = human('owner', 'owner', po, face_yaw(po, pf) - math.radians(35), seed=5, pose='behind')
	n10 = pw.note('note10', '10', 0.34); n100 = pw.note('note100', '100', 0.34)
	t10, tno, t100 = W(31) - 0.15, W(35) - 0.1, W(37) - 0.2
	def shake(P, t):
		d = dict(POSES['behind']); d['@head'] = (0, 0, 22 * math.sin((t - tno) * 14))
		return d
	def update(t):
		set_pose(F, 'offer' if t >= t10 else 'stand', t, 0.35)
		if t < tno: set_pose(O, 'behind')
		elif t < t100: set_pose(O, shake, t, 0.2)
		else: set_pose(O, 'raise', t, 0.3)
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((-6.3, -6.4, 1.6)).lerp(Vector((-6.3, -5.9, 1.6)), k), Vector((-6.3, -2.0, 1.55)))
		cam.data.dof.focus_distance = 4.0
		A['root'].rotation_euler.z = math.radians(-90) + math.radians(55) * (1 if t < tno else -1) * ease(abs(t - (t10 if t < tno else tno)) / 0.4)
	def notes_tick(t):
		for P, n, ta in ((F, n10, t10 + 0.3), (O, n100, t100 + 0.3)):
			k = clamp01((t - ta) / 0.25)
			wr = bone_world(P, 'wrist.R', False); fwd = P['root'].matrix_world.to_quaternion() @ Vector((0, -1, 0))
			n.location = wr + fwd * 0.12 + Vector((0, 0, 0.06)); n.rotation_euler = (math.radians(80), 0, P['root'].rotation_euler.z)
			n.scale = (0.17 * max(k, 1e-3), 0.073 * max(k, 1e-3), 1)
	UPDATERS.append(notes_tick)
	cam.data.lens = 32
render2(update, V)
