"""S13 «Home to Hamburg. Tens of thousands cheered.» Toon Hamburg harbour: the two rust-streaked German ships glide in, dressed
overall with signal flags; red fireboats fire white water arches; behind them a crowd on the quay waves under the brick
pier hall with green copper towers; cranes on the far bank. On «cheered» Remotion dissolves into the real 24 May 1975 photo.
  tools/blender/run.sh tools/blender/hamburg.py -- [--frames 1,100] [--scale 40]"""
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

T0, T1 = SHOT('hamburg')
setup(T0, T1)
SKY_HH = [(0.0, (1.0, 0.86, 0.66)), (0.1, (0.98, 0.70, 0.66)), (0.26, (0.80, 0.52, 0.78)), (0.46, (0.50, 0.40, 0.82)), (0.7, (0.28, 0.24, 0.62))]
world(SKY_HH)
sun(3.6, (1.0, 0.9, 0.72), (50, 0, 150))
_w, _wt = yf2.water2('elbe', (400, 400), (0, 0), col='#5a9aa3', deep='#1d4f60', ripples=0.3); yf2.WATER_T.append(_wt)   # greener, darker Elbe
cloud('c1', (-30, 90, 40), 9, seed=81, ink=0.22); cloud('c2', (35, 110, 52), 11, seed=83, ink=0.25)

# ------------------------------------------------------------------ quay + pier hall (Landungsbrücken-like, simplified)
QY = 9.0
brick = pbr('brick', '#c2674a', 'brick_wall_02', 0.6, 0.55, 0.7, coords='Object'); stone = pbr('stone', '#d9cdb8', 'plank_flooring', 0.3, 0.2, 0.7); cu = pbr('copper', '#62b3a0', 'rusty_metal_02', 0.6, 0.15, 0.45, metal=0.3)
dark = toon_mat('archdark', C('#3a2238'))
prim('cube', 'quay', stone, (0, QY + 6, 0.25), (40, 6, 0.35), smooth_=False, ink=0.03)
prim('cube', 'hall', brick, (0, QY + 9.5, 1.6), (16, 1.8, 1.3), smooth_=False, ink=0.05)
for k in range(15):   # arched windows
	prim('cube', f'arch{k}', dark, (-14 + 2 * k, QY + 7.68, 1.45), (0.45, 0.04, 0.6), smooth_=False)
	prim('cyl', f'archt{k}', dark, (-14 + 2 * k, QY + 7.68, 2.05), (0.45, 0.45, 0.04), seg=16, rot=(math.pi / 2, 0, 0))
prim('cube', 'roof', toon_mat('roofb', C('#7e3f30')), (0, QY + 9.5, 3.0), (16.2, 2.0, 0.12), smooth_=False, ink=0.04)
for x, h in ((-11, 3.6), (0, 6.0), (11, 3.6)):
	prim('cube', f'tw{x}', brick, (x, QY + 9.5, 3.0 + h / 2), (1.0, 1.0, h / 2), smooth_=False, ink=0.05)
	prim('cyl', f'twd{x}', cu, (x, QY + 9.5, 3.0 + h + 0.7), (1.15, 1.15, 0.7), seg=4, r2=0.0, rot=(0, 0, math.pi / 4), ink=0.05)
	if x == 0:
		prim('cyl', 'clock', toon_mat('clockface', C('#f6efdc')), (0, QY + 8.45, 3.0 + h * 0.75), (0.55, 0.55, 0.05), seg=24, rot=(math.pi / 2, 0, 0), ink=0.03)
for k in range(5):
	prim('cube', f'pont{k}', toon_mat('pontoon', C('#e8dfcc')), (-16 + 8 * k, QY + 0.6, 0.12), (3.2, 0.9, 0.18), smooth_=False, ink=0.03)
# cranes on the far side (left)
for k, x in enumerate((-30, -24, -18)):
	cr = toon_mat('crane', C('#f2a93b'))
	prim('cube', f'cl{k}', cr, (x, 34, 3.5), (0.35, 0.35, 3.5), smooth_=False, ink=0.04)
	b_ = prim('cube', f'cb{k}', cr, (x + 2.2, 34, 7.2), (2.6, 0.18, 0.18), smooth_=False, ink=0.03); b_.rotation_euler = (0, math.radians(-14), 0)

# ------------------------------------------------------------------ crowd on the quay: waving, cheering, little West German flags
crowd = []
rng = np.random.default_rng(3)
MODES = ['wave', 'wave', 'flag', 'both', 'wave', 'flag', 'jump']
for k in range(170):
	x = -17 + 34 * rng.random(); y = QY + 1.0 + 3.8 * rng.random() ** 0.9
	p = sailor(f'cw{k}', (x, y, 0.6), -math.pi / 2 + rng.normal() * 0.25, seed=100 + k, cap=('#f7f5ef', '#20283f', '#c8102e', '#ffce00')[k % 4])
	p['root'].scale = (2.3, 2.3, 2.3)
	mode = MODES[int(rng.integers(len(MODES)))]
	set_clip(p, 'jump' if mode in ('both', 'jump') else 'idle', speed=0.8 + 0.4 * rng.random(), t=-rng.random() * 3)
	if mode != 'jump': yf2.cheer(p, mode, rng.random() * 3)
	if mode == 'flag': yf2.hand_flag(p, f'cwf{k}')
	crowd.append(p)

# ------------------------------------------------------------------ the two ships, dressed overall
ships = [ship('ms', 'hapag', (0, 0, 0), 0.0), ship('nw', 'nordwind', (0, 0, 0), 0.0, L=13, B=1.8)]
yf2.ship_name(ships[0], 'MÜNSTERLAND'); yf2.ship_name(ships[1], 'NORDWIND')
SIG = ['#d62828', '#ffce00', '#1d4fbf', '#ffffff', '#2e9a62', '#111111']
for sh in ships:
	set_dust(sh['sid'], 0.3)
	k = sh['k']; dz = sh['deckz']
	pts = [Vector((7.4 * k, 0, dz(7.4 * k) + 0.1)), Vector((6.3 * k, 0, dz(6.3 * k) + 1.75 * k)), Vector((-2.6 * k, 0, sh['bridgez'] + 1.0 * k)),
	       Vector((-5.2 * k, 0, dz(-5.2 * k) + 1.15 * k)), Vector((-7.3 * k, 0, dz(-7.3 * k) + 0.1))]
	n = 0
	for a, b in zip(pts, pts[1:]):
		L = (b - a).length; m = int(L / (0.32 * k))
		for j in range(m):
			p = a.lerp(b, (j + 0.5) / m) - Vector((0, 0, 0.12 * k * math.sin(math.pi * (j + 0.5) / m)))
			prim('cube', f'{sh["sid"]}_sig{n}', toon_mat('sig' + SIG[n % 6], C(SIG[n % 6]), flat=True), p, (0.08 * k, 0.01, 0.1 * k), smooth_=False, parent=sh['root'])
			n += 1

# ------------------------------------------------------------------ fireboats holding station, their water arches cross over the fairway
yf2.volume_setup(end=300.0, samples=96)
FB = [((-6.0, -3.8), ((68, 10.5, 7.6),)), ((3.0, 7.2), ((-112, 10.5, 7.6),))]     # v8: just the two crossing arches (owner: «непонятные брызги»)
fbs = []
for j, ((x, y), aims) in enumerate(FB):
	fb = yf2.fireboat2(f'fb{j}', (x, y, 0), 0.0); fbs.append(fb)
	for a_, (yaw, reach, hgt) in enumerate(aims):
		yf2.water_jet(f'jt{j}{a_}', fb['root'], fb['monitors'][a_], yaw, reach, hgt, mist=False)

cam = camera(28)
# no DOF: the near water smeared
def update(t):
	u = t - T0
	ms, nw = ships
	ms['root'].location = (-9 + 2.0 * u, 2.0, 0); nw['root'].location = (-25 + 2.0 * u, 5.2, 0)
	for sh in ships: wave_flag(sh, t, 1.2, 10)
	for j, fb in enumerate(fbs):          # holding station: a slow bob and yaw
		fb['root'].location.z = 0.03 * math.sin(t * 1.7 + j); fb['root'].rotation_euler = (0.01 * math.sin(t * 1.3 + j), 0, 0.03 * math.sin(t * 0.6 + j))
	e = ease(u / (T1 - T0))
	look(cam, (lerp(6.5, 6.0, e), lerp(-9.5, -8.8, e), lerp(3.2, 3.0, e)), (ms['root'].location.x + 1.0, 5.0, 3.4))
render(update, 'hamburg')
