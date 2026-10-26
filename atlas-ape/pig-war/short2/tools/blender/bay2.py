"""v2 bay shots (painting look, metres):  --variant soldiers | warships
soldiers «America sent over four hundred soldiers.»  a blue column (instanced, in step) marches towards the low camera,
          rifles at the shoulder, colour bearer in front; the camp flag on the rise behind
warships «Britain sent five warships.»  from the rocks at the water's edge: five steam frigates glide in line ahead"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
import random
from island2 import *
from shots_t import SHOT
import pw, env, frigate as FG
V = arg('variant', 'soldiers')
t0, t1 = SHOT(V)
setup_hist(t0, t1)
sun2(3.6, (1.0, 0.8, 0.58), (58, 0, 215), 1.5)
sun2(1.0, (0.85, 0.9, 1.0), (70, 0, 20), 3.0)
cam = camera(26); dof(cam, 8.0)
if V == 'soldiers':
	S = build2(patch=False, cabin=False, hill_camp=True, ships=0, soldiers=0, grass=520, grass_box=(-16, 16, -12, 26))
	def mk(kind_seed, at):
		def f():
			P = human(f'sol{kind_seed}', 'us', (0, 0, 0), 0.0, seed=kind_seed, pose='shoulder')
			P['pose'] = (lambda P_, t: walk_pose((t - t0) * 1.75, 0.9, 'shoulder'))
			rifle_for(P)
			return P
		return pw.proto(f'solp{kind_seed}', f, at=at)
	protos = [mk(k, (k * 6.0, 0, -200)) for k in range(3)]
	yaw = math.radians(-8)
	cols, ranks = 6, 8
	A0 = Vector((-1.8, 6.5, 0)); speed = 1.45
	units = []
	for r_ in range(ranks):
		for c_ in range(cols):
			off = Vector(((c_ - (cols - 1) / 2) * 0.85, r_ * 1.15, 0))
			coll, _ = protos[(r_ * 7 + c_ * 3) % 3]
			units.append((pw.inst(coll, f'u{r_}_{c_}', (0, 0, 0), yaw), off))
	Bp = human('bearer', 'us', (0, 0, 0), yaw, seed=9, pose='raise')
	Bp['pose'] = (lambda P_, t: walk_pose((t - t0) * 1.75, 0.9, 'raise'))
	pole, cloth = env.flagpole('colours', (0, 0, 0), 'us_1859', h=3.2, size=(1.2, 0.75))
	def update(t):
		u = t - t0
		base = A0 + Vector((math.sin(yaw), -math.cos(yaw), 0)) * (speed * u)
		for e, off in units:
			p = base + Vector((off.x * math.cos(yaw) - off.y * math.sin(yaw), off.x * math.sin(yaw) + off.y * math.cos(yaw), 0))
			e.location = (p.x, p.y, ground_z(p.x, p.y))
		fb = base + Vector((0.4, -1.6, 0)); Bp['root'].location = (fb.x, fb.y, ground_z(fb.x, fb.y))
		pole.location = bone_world(Bp, 'wrist.R') - Vector((0, 0, 1.0))
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((2.4, -3.2, 0.95)).lerp(Vector((2.2, -2.7, 0.95)), k), Vector((-1.4, 6.0, 1.75)).lerp(Vector((-1.4, 5.0, 1.65)), k))
		cam.data.dof.focus_distance = 5.5
	cam.data.lens = 26
else:
	S = build2(patch=False, cabin=False, hill_camp=False, ships=0, grass=0, firs=True)
	rocks = ph_part('coast_rocks_01', prefer='big', max_verts=60000)
	place(rocks, (-6.0, 53.5, -0.6), math.radians(30), 0.35)
	ships = [FG.frigate(f'w{i}', (0, 0, env.SEA), math.pi, 3.6, smoke=(i < 3)) for i in range(5)]
	lanes = [(128.0, -14.0), (152.0, 2.0), (178.0, 18.0), (207.0, 36.0), (240.0, 54.0)]
	tw = W(54) - 0.5
	def update(t):
		for i, F in enumerate(ships):
			y, xs = lanes[i]
			k = easeOut((t - (t0 - 1.0 + i * 0.28)) / 3.2)
			x = 108.0 + i * 50 - (122.0 + i * 43) * k + xs
			F['root'].location = (x, y, env.SEA)
			FG.ports(F, t - (tw + i * 0.12))
		u = (t - t0) / (t1 - t0)
		look(cam, Vector((-5.8, 51.2, 1.6)).lerp(Vector((-4.7, 51.8, 1.7)), ease(u)), Vector((18.0, 160.0, 12.0)))
		cam.data.dof.focus_distance = 90.0
	cam.data.lens = 22
render2(update, V)
