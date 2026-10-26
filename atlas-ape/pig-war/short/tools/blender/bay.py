"""Bay shots:  --variant soldiers | warships
soldiers 18.60–21.56 «America sent over four hundred soldiers.»  a big blue column marches up the meadow towards us in step,
          shouldered rifles, colour bearer + drummer in front, field guns hauled alongside; the US camp on the hill behind
warships 21.56–23.72 «Britain sent five warships.»  from the rocks at the water's edge: five steam frigates glide into
          Griffin Bay in line ahead, one after another, gun ports opening"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
import random
from island import *
import pw, env, frigate as FG
from shots_t import SHOT
V = arg('variant', 'soldiers')
t0, t1 = SHOT(V)
setup2(t0, t1)
cam = camera(28)
if V == 'soldiers':
	S = build(cabin=False, patch=False, hill_camp=True, ships=0, soldiers=0, grass=380, clouds=True)
	def one_soldier():
		P = char('sol', 'male-f', 'us', (0, 0, 0), 0.0, 0.66, 'walk', 1.25, 0.0)
		hat(P, 'kepi'); r = rifle('solr', 1.3); carry(P, r, 'shoulder')
		return P
	coll, P0 = proto('soldier', one_soldier)
	def one_soldier2():
		P = char('sol2', 'male-d', 'us', (0, 0, 0), 0.0, 0.66, 'walk', 1.25, 0.0)
		hat(P, 'kepi'); r = rifle('solr2', 1.3); carry(P, r, 'shoulder')
		return P
	coll2, P1 = proto('soldier2', one_soldier2, at=(5, 0, -100))
	# column: 6 abreast × 9 ranks, marching towards −Y (towards the camera), slightly diagonal
	yaw = math.radians(-12)
	fwd = Vector((math.sin(-yaw) * -1, -math.cos(yaw), 0))
	cols, ranks = 6, 9
	A0 = Vector((-0.9, 3.4, 0)); speed = 0.55
	units = []
	rnd = random.Random(2)
	for r_ in range(ranks):
		for c_ in range(cols):
			off = Vector(((c_ - (cols - 1) / 2) * 0.62, r_ * 0.75, 0))
			e = inst(coll if (r_ + c_) % 2 else coll2, f'u{r_}_{c_}', (0, 0, 0), yaw)
			units.append((e, off))
	# colour bearer + drummer in front
	B = char('bearer', 'male-d', 'us', (0, 0, 0), yaw, 0.66, 'walk', 1.25, 0.0); hat(B, 'kepi')
	pole, cloth = env.flagpole('colours', (0, 0, 0), 'us_1859', h=1.5, size=(0.5, 0.32))
	D = char('drummer', 'male-f', 'us', (0, 0, 0), yaw, 0.66, 'walk', 1.25, 0.0); hat(D, 'kepi')
	drum = prim('cyl', 'drum', pw.mat('drum', '#c8a24a', 0.5), (0, 0, 0), (0.11, 0.11, 0.09), seg=24)
	drum2 = prim('cyl', 'drumhead', pw.mat('drumred', '#b8332e', 0.5), (0, 0, 0), (0.115, 0.115, 0.02), seg=24)
	# field guns hauled alongside (right flank)
	guns = [env.field_cannon(f'fg{k}', (0, 0, 0), yaw + math.pi, 0.42) for k in range(4)]
	def place(t):
		u = t - t0
		base = A0 + Vector((math.sin(yaw), -math.cos(yaw), 0)) * (speed * u)
		for e, off in units:
			p = base + Vector((off.x * math.cos(yaw) - off.y * math.sin(yaw), off.x * math.sin(yaw) + off.y * math.cos(yaw), 0))
			e.location = (p.x, p.y, ground_z(p.x, p.y))
		fb = base + Vector((-0.55, -1.0, 0)); B['root'].location = (fb.x, fb.y, ground_z(fb.x, fb.y))
		pole.location = B['root'].location + Vector((0.12, -0.05, 0.1))
		fd = base + Vector((0.55, -1.0, 0)); D['root'].location = (fd.x, fd.y, ground_z(fd.x, fd.y))
		drum.location = D['root'].location + Vector((0, -0.12, 0.27)); drum2.location = drum.location + Vector((0, 0, 0.1))
		for k, g in enumerate(guns):
			gp = base + Vector((2.6 + 0.0 * k, 0.4 + k * 1.6, 0)); g.location = (gp.x, gp.y, ground_z(gp.x, gp.y))
	def update(t):
		place(t)
		k = ease((t - t0) / (t1 - t0))
		look(cam, Vector((1.3, -1.8, 0.88)).lerp(Vector((1.1, -1.45, 0.84)), k), Vector((-0.9, 5.5, 0.85)).lerp(Vector((-0.9, 5.0, 0.8)), k))
	cam.data.lens = 26
elif V == 'warships':
	S = build(cabin=False, patch=False, hill_camp=False, ships=0, grass=0, clouds=True, firs=True)
	ships = []
	for i in range(5):
		F = FG.frigate(f'w{i}', (0, 0, env.SEA), math.pi, 1.0, smoke=(i < 3))
		ships.append(F)
	# line ahead entering from the right (east), anchoring one after another
	lanes = [(27.0, -3.0), (33.0, 1.0), (40.0, 5.0), (48.0, 10.0), (57.0, 15.0)]      # (y distance, x stop offset)
	tw = W(54) - 0.5
	def update(t):
		for i, F in enumerate(ships):
			y, xs = lanes[i]
			k = easeOut((t - (t0 - 1.0 + i * 0.28)) / 3.2)
			x = 30.0 + i * 14 - (34.0 + i * 12) * k + xs
			F['root'].location = (x, y, env.SEA)
			FG.ports(F, t - (tw + i * 0.12))
		u = (t - t0) / (t1 - t0)
		look(cam, Vector((-1.6, 14.2, 0.42)).lerp(Vector((-1.3, 14.4, 0.45)), ease(u)), Vector((5.0, 38.0, 2.6)))
	cam.data.lens = 22
render2(update, V)
