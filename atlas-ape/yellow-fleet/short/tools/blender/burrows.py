"""S5 «Australia fought back.» — dusk hillside riddled with burrows; rabbit heads pop up in a rolling wave while the camera pulls
back; a little boxing bell on a fence post rings on «fought» (the round motif).
  tools/blender/run.sh tools/blender/burrows.py -- [--frames 1,80] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
import kit
from shots_t import SHOT
T0, T1 = SHOT('burrows')
setup(T0, T1)

world(SKY_DUSK)
sun(3.8, (1.0, 0.84, 0.64), (60, 0, -30))
HILL = (0.0, 9.0, 16.0, 2.6)
def surf(x, y):
	cx, cy, r, h = HILL
	d = math.hypot(x - cx, y - cy) / r
	return h * (math.cos(d * math.pi) + 1) / 2 if d < 1 else 0.0
ground('grass', 260, cols=(C('#8db040'), C('#76993a'), C('#b7a95a')), scale=0.16, hill=HILL, res=220)

hole_m = toon_mat('hole', C('#2a1418'), flat=True)
rim_m = toon_mat('rim', C('#a8703f'))
rng = np.random.default_rng(7)
holes = []
for k in range(95):
	for _ in range(60):
		x = rng.uniform(-8, 8); y = rng.uniform(0.5, 17)
		if all(math.hypot(x - hx, y - hy) > 1.45 for hx, hy, _, _ in holes): break
	z = surf(x, y)
	# dirt rim + dark hole (flattened discs lying on the slope)
	prim('cyl', f'rim{k}', rim_m, (x, y, z + 0.015), (0.58, 0.48, 0.035), seg=20, ink=0.012)
	prim('cyl', f'hole{k}', hole_m, (x, y, z + 0.06), (0.38, 0.3, 0.012), seg=20)
	d = math.hypot(x + 2, y - 2)          # wave starts near the camera, rolls up the hill
	holes.append((x, y, z, d))
rabbits = []
for k, (x, y, z, d) in enumerate(holes):
	o = rabbit_copy(f'rb{k}', (x, y, z - 1.0), 0.0, 1.45, ink_w=0.014)
	o.rotation_euler = (0, 0, math.atan2(x - 0.8, -5.0 - y) + rng.normal() * 0.3)
	rabbits.append((o, x, y, z, d, rng.random()))

# trees on the skyline + bushes
scatter(['tree_default.glb', 'tree_oak.glb', 'tree_detailed.glb'], 14, (-30, 24, 30, 40), 3.0, 5.0, seed=3, ink=0.04)
scatter(['plant_bush.glb', 'plant_bushLarge.glb', 'grass_large.glb'], 40, (-14, -4, 14, 22), 0.9, 1.6, seed=5, ink=0.012,
        avoid=lambda x, y: any(math.hypot(x - hx, y - hy) < 1.0 for hx, hy, _, _ in holes))
cloud('c1', (-18, 70, 22), 6, seed=2, ink=0.13); cloud('c2', (20, 80, 30), 7, seed=4, ink=0.14)

# boxing bell on a fence post (right foreground)
post = prim('cyl', 'bellpost', toon_mat('post', C('#8a5a3c')), (2.6, 0.6, 1.1), (0.08, 0.08, 1.1), seg=10, ink=0.014)
prim('cube', 'bracket', toon_mat('post', C('#8a5a3c')), (2.38, 0.6, 2.1), (0.24, 0.045, 0.045), smooth_=False, ink=0.012)
bell = empty('bell', (2.18, 0.6, 2.06))
brass = toon_mat('brass', C('#ffc23a'), bands=((0.62, 0.38, 0.30), (0.92, 0.70, 0.40), (1.0, 0.98, 0.80)))
prim('sphere', 'bellcup', brass, (0, 0, -0.2), (0.24, 0.24, 0.21), ink=0.016, parent=bell)
prim('cyl', 'bellrim', brass, (0, 0, -0.29), (0.26, 0.26, 0.03), seg=24, ink=0.012, parent=bell)
prim('sphere', 'clapper', toon_mat('iron', C('#3a3048')), (0, 0, -0.38), (0.06, 0.06, 0.06), parent=bell)

cam = camera(28)
T_RING = W(23) - 0.05
def update(t):
	u = ease((t - T0) / (T1 - T0))
	look(cam, vlerp((0.6, -2.4, 3.4), (0.9, -7.5, 6.2), u), vlerp((0.0, 5.0, 0.9), (0.0, 7.5, 1.2), u))
	for o, x, y, z, d, ph in rabbits:
		ts = T0 + 0.05 + d * 0.085 + ph * 0.12           # wave front ≈ 12 m/s up the hill
		k = clamp01((t - ts) / 0.3)
		pop_ = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2 if k < 1 else 1.0
		o.location.z = z - 1.0 + 0.94 * pop_
		o.hide_render = t < ts - 0.02
	# bell rings: swing ±18° decaying
	a = 0.0
	if t > T_RING:
		a = 18 * math.sin((t - T_RING) * 30) * math.exp(-(t - T_RING) * 3.0)
	bell.rotation_euler = (0, math.radians(a), 0)

render(update, 'burrows')
