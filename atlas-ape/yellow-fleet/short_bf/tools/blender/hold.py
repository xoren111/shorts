"""S14–16 finale in the hold of the Münsterland: «Part of the cargo? Kitchen clocks. Delivered only eight years late.
How many stars for this delivery?» The hatch opens above (light pours in), the camera tilts down to a dusty wooden crate,
its front drops on «Kitchen» → rows of pastel kitchen clocks, all ticking smoothly; push in on «Delivered only eight years
late»; pull back for the question (Atlas lower-left + the empty-stars card upper-centre are Remotion overlays). The last
0.7 s dissolve back to the opening frame in Remotion (loop).
  tools/blender/run.sh tools/blender/hold.py -- [--frames 1,200] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
import kit
from yf import *
from shots_t import SHOT
import yf2
from yf2 import set_clip, pbr, PEOPLE
yf2.enable_v2(globals())

T0, T1 = SHOT('hold')
setup(T0, T1)
SKY_HOLD = [(0.0, (0.30, 0.22, 0.42)), (0.4, (0.20, 0.14, 0.34)), (0.8, (0.12, 0.08, 0.24))]
world(SKY_HOLD)
sun(3.2, (1.0, 0.92, 0.74), (18, 0, 10))

steel = pbr('steel', '#4d5a74', 'rusty_painted_metal', 0.45, 0.3, 0.5, plates=True)
rib = pbr('rib', '#434e66', 'rusty_painted_metal', 0.6, 0.35, 0.45)
# hold box: floor, walls, ceiling with the hatch opening (x −2…2, y −1.5…1.5)
prim('cube', 'floor', pbr('holdfloor', '#7d6a5f', 'wood_floor_deck', 0.5, 0.5, 0.7), (0, 0, -0.1), (8, 8, 0.1), smooth_=False)
for s, (loc, sc_) in enumerate((((0, 6, 3), (8, 0.2, 3)), ((-6, 0, 3), (0.2, 8, 3)), ((6, 0, 3), (0.2, 8, 3)), ((0, -8, 3), (8, 0.2, 3)))):
	prim('cube', f'wall{s}', steel, loc, sc_, smooth_=False, ink=0.03)
for s, (loc, sc_) in enumerate((((0, 4.25, 6.1), (8, 2.75, 0.1)), ((0, -5.25, 6.1), (8, 3.75, 0.1)), ((-5.0, -0.5, 6.1), (3.0, 1.5, 0.1)), ((5.0, -0.5, 6.1), (3.0, 1.5, 0.1)))):
	prim('cube', f'ceil{s}', steel, loc, sc_, smooth_=False, ink=0.03)
# ship's frames: vertical ribs + two stringers on the hold walls
for i, x in enumerate(np.arange(-5.4, 5.5, 0.9)):
	yf2.board(f'ribb{i}', rib, (x, 5.72, 3.0), (0.05, 0.09, 3.0), bev=0.01)
for i, y in enumerate(np.arange(-7.2, 5.6, 0.9)):
	for s_ in (-1, 1): yf2.board(f'ribs{s_}{i}', rib, (s_ * 5.72, y, 3.0), (0.09, 0.05, 3.0), bev=0.01)
for z_ in (2.1, 4.2):
	yf2.board(f'strb{z_}', rib, (0, 5.66, z_), (5.8, 0.12, 0.05), bev=0.01)
hatch = prim('cube', 'hatch', toon_mat('hatchc', C('#7b6a5e')), (0, -0.5, 6.25), (2.05, 1.55, 0.08), smooth_=False, ink=0.03)
light = prim('cube', 'skyhole', pbr('skyhole', '#ffe9b8', emit=('#ffe2a8', 6.0)), (0, -0.5, 7.6), (2.2, 1.7, 0.02), smooth_=False)
# light pouring in through the hatch (area light above the opening)
_al = bpy.data.lights.new('hatchlight', 'AREA'); _al.energy = 0.0; _al.size = 3.5; _al.color = (1.0, 0.9, 0.72)
hatch_light = bpy.data.objects.new('hatchlight', _al); bpy.context.scene.collection.objects.link(hatch_light); hatch_light.location = (0, -0.5, 7.0)
cable = prim('cyl', 'cable', toon_mat('cable', C('#2a2228')), (0, -0.5, 9), (0.03, 0.03, 3), seg=6)
# dust motes in the light shaft
motes = [prim('sphere', f'mote{k}', toon_mat('mote', C('#fff2cc'), flat=True), (0, 0, -5), (0.011, 0.011, 0.011), u=6, v=4) for k in range(40)]
rng = np.random.default_rng(4); mp_ = [(rng.uniform(-1.6, 1.6), rng.uniform(-1.8, 0.8), rng.uniform(0.3, 5.5), rng.uniform(0, 6)) for _ in motes]

# ------------------------------------------------------------------ the crate (8 years of sand on the lid) and the clocks
woodH = yf2.wood_mat('crateH', '#b88653', '#8a5a34', grain='Z'); woodV = yf2.wood_mat('crateV', '#a87444', '#6e4628', grain='X')
CX, CY = 0.0, 0.0
CW, CD, CH = 2.6, 1.3, 1.9
NB = 9; BH = CH / NB                     # nine horizontal boards per wall, 12 mm gaps
def boards_wall(name, parent, centre, along, th_axis, length, inner=False):
	for i in range(NB):
		z = BH * (i + 0.5)
		half = [0, 0, BH / 2 - 0.002]; half[along] = length / 2; half[th_axis] = 0.022
		c = list(centre); c[2] = z
		yf2.board(f'{name}{i}', woodH, tuple(c), tuple(half), parent=parent)
def battens(name, parent, y, sgn):
	# perimeter frame + diagonal brace on the outside of a wall in the XZ plane (local x along the wall)
	w = 0.065
	for s_ in (-1, 1):
		yf2.board(f'{name}v{s_}', woodV, (s_ * (CW / 2 - w), y, CH / 2), (w, 0.02, CH / 2), parent=parent)
	for z_ in (w, CH - w):
		yf2.board(f'{name}h{z_:.2f}', woodH, (0, y, z_), (CW / 2 - 2 * w, 0.02, w), parent=parent)
	L = math.hypot(CW - 4 * w, CH - 4 * w); ang = math.atan2(CH - 4 * w, CW - 4 * w)
	yf2.board(f'{name}d', woodH, (0, y, CH / 2), (L / 2, 0.018, w * 0.9), parent=parent, rot=(0, -sgn * ang, 0))
crate = empty('crate', (CX, CY, 0))
boards_wall('cr_back', crate, (0, CD / 2, 0), 0, 1, CW)
for s in (-1, 1):
	boards_wall(f'cr_side{s}_', crate, (s * CW / 2, 0, 0), 1, 0, CD)
yf2.board('cr_bot', woodH, (0, 0, 0.03), (CW / 2, CD / 2, 0.03), parent=crate)
for i in range(6):
	yf2.board(f'cr_top{i}', woodH, (0, -CD / 2 - 0.03 + (i + 0.5) * (CD + 0.06) / 6, CH + 0.022), (CW / 2 + 0.05, (CD + 0.06) / 12 - 0.006, 0.022), parent=crate)
sandlid = prim('cube', 'cr_sand', yf2.sand_mat('lidsand'), (CX, CY, CH + 0.05), (CW / 2 - 0.02, CD / 2 - 0.02, 0.012), smooth_=False)
front = empty('cr_fronthinge', (CX, CY - CD / 2, 0.0))
boards_wall('cr_front', front, (0, 0, 0), 0, 1, CW)
battens('cr_fb', front, -0.045, 1)
PAST = ['#9fe3cf', '#f7b6c8', '#9cc9f2', '#fde49a', '#c9b3f0', '#ffcf9f']
hands = []
face_m = toon_mat('face', C('#fffdf6'), flat=True); tick_m = toon_mat('tick', C('#2a2228'), flat=True); sec_m = toon_mat('sec', C('#e0392d'), flat=True)
rng = np.random.default_rng(12)
for r in range(4):
	for c in range(5):
		x = CX - 1.0 + 0.5 * c; z = 0.33 + 0.44 * r; y = CY - 0.25
		col = PAST[(r * 5 + c) % len(PAST)]
		root = empty(f'clk{r}{c}', (x, y, z)); root.rotation_euler = (math.pi / 2, 0, 0)
		prim('cyl', f'clkb{r}{c}', toon_mat('clk' + col, C(col)), (0, 0, 0), (0.2, 0.2, 0.05), seg=28, ink=0.012, parent=root)
		prim('cyl', f'clkf{r}{c}', face_m, (0, 0, 0.052), (0.165, 0.165, 0.004), seg=28, parent=root)
		for k in range(12):
			a = k * math.pi / 6
			prim('cube', f'tk{r}{c}{k}', tick_m, (0.14 * math.sin(a), 0.14 * math.cos(a), 0.058), (0.006, 0.018 if k % 3 == 0 else 0.01, 0.002), smooth_=False, rot=(0, 0, -a), parent=root)
		hp = []
		for j, (Ln, w, m) in enumerate(((0.08, 0.011, tick_m), (0.125, 0.008, tick_m), (0.135, 0.004, sec_m))):
			pv = empty(f'hp{r}{c}{j}', (0, 0, 0.062 + 0.003 * j), parent=root)
			prim('cube', f'hd{r}{c}{j}', m, (0, Ln / 2, 0), (w, Ln / 2, 0.002), smooth_=False, parent=pv)
			hp.append(pv)
		hands.append((hp, rng.uniform(0, 12), rng.uniform(0, 60)))
prim('cyl', 'clkcap', toon_mat('cap', C('#2a2228')), (0, 0, -9), (0.01, 0.01, 0.01))

# eight years of dust puffs out when the crate front drops (a soft volume, not balls)
yf2.volume_setup(end=60.0, samples=96)
yf2.haze_box('holdair', (0, -1, 3.0), (11.5, 13.5, 6.0), 0.007)       # thin air: the hatch light becomes a visible shaft
DUST, _ = yf2.volume_box('cratedust', (CX, CY - CD / 2 - 0.9, 0.45), (3.4, 1.8, 1.0), '#d9b57c', 0.0, scale=2.6, thr=0.38, soft=0.3,
                         speed=(0, -0.5, 0.35), anisotropy=0.3, grounded=True, color_top='#efd9ae')
DUSTD = yf2.VOLD['cratedust'].outputs[0]
cam = camera(28)
yf2.dof(cam, 4.5)
OPEN = W(83) - 0.1          # hatch rises on «Part»
DROP = W(87) - 0.02         # crate front drops on «Kitchen»
PUSH0, PUSH1 = W(89) - 0.15, W(93) + 0.1
BACK0 = W(94) - 0.3
def update(t):
	k = ease((t - OPEN) / 0.8)
	hatch.location = (0, -0.5, 6.25 + 3.5 * k); cable.location = (0, -0.5, 9.0 + 3.5 * k)
	hatch_light.data.energy = 900 * k
	set_visible(light, True)
	for (m, (x, y, z, ph)) in zip(motes, mp_):
		m.location = (x + 0.1 * math.sin(t * 0.7 + ph), y, z + 0.15 * math.sin(t * 0.5 + ph)) if k > 0.3 else (0, 0, -5)
	d = ease((t - DROP) / 0.35)
	front.rotation_euler = (math.radians(88 * d), 0, 0)
	a = (t - DROP - 0.2) / 1.3
	DUSTD.default_value = 0.0 if a <= 0 or a >= 1 else 3.2 * math.sin(math.pi * min(1.0, a * 2.2)) ** 0.7 * (1 - a) ** 1.2
	set_visible(DUST, 0 < a < 1)
	for hp, h0, m0 in hands:
		sec = (t * 1.0 + m0) % 60
		hp[2].rotation_euler = (0, 0, -sec / 60 * 2 * math.pi)
		hp[1].rotation_euler = (0, 0, -(m0 + t / 60) / 60 * 2 * math.pi * 5)
		hp[0].rotation_euler = (0, 0, -(h0 / 12) * 2 * math.pi)
	# camera: look up at the hatch → tilt down to the crate → push in → pull back for the question
	tilt = ease((t - (OPEN + 0.55)) / 0.9)
	push = ease((t - PUSH0) / (PUSH1 - PUSH0)) - ease((t - BACK0) / 1.4)
	pos = Vector((0.4, lerp(-6.2, -5.6, tilt), lerp(1.4, 1.9, tilt))).lerp(Vector((0.1, -2.6, 1.15)), clamp01(push))
	tgt = Vector((0, -0.4, 3.4)).lerp(Vector((0, 0, 0.95)), tilt).lerp(Vector((0.0, 0, 1.0)), clamp01(push))
	look(cam, pos, tgt)
render(update, 'hold')
