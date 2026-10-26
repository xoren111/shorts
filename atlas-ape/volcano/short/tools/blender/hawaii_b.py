"""Hawaii3DB in the approved toon look — «Six days later, the lava stops. Victory?» (W(32) = 17.07 – W(39) + 0.45 = 21.33 s)
A slow glide down the 1935 flow to its front above Hilo (the town of toy houses at the bay, top of the frame — the flow
stopped 28 km short of it): the front creeps its last kilometres and halts (≈ 18.8 s, on «stops»), the flow ripples slow
down and freeze, the glowing melt crusts over in patches (dark plates with red seams that fade), the glow rim shrinks, and
cartoon steam puffs rise from the hot lobe just behind the stalled tip and drift to the south (screen right), away from the
date label (DOM: dot on the tip, leader and text up-left of it).
  tools/blender/run.sh tools/blender/hawaii_b.py -- [--frames 1,120,250] [--scale 50] [--samples 16] [--from N --to M]
  tools/blender/run.sh tools/blender/hawaii_b.py -- --track          → public/blender/hawaii_b/track.json"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import hawaii_toon as HT
from hawaii_toon import Vector, W, arg, argv, P, hat_xy, along, ML_PATH, ease_io, column, flow_tip
import hawaii_cam as HC

T0 = W(32)                    # 17.07 «Six»
T1 = W(39) + 0.4 + 0.05       # 21.33: the dispute photo's Layer starts at W(39), this one holds XF under it
S = HT.Shot('hawaii_b', T0, T1, HC.cam_b, PRE=int(arg('pre', 30)))

T_STOP = T0 + 1.75            # the front halts ≈ 18.8 s («stops» 18.93)
def prog(t):
	return 0.87 + 0.13 * ease_io((t - T0) / (T_STOP - T0))
def cool(t):                  # crusting over from W(36) − 0.1 for 3.0 s, gentle smoothstep (spatially staggered in the shader)
	x = max(0.0, min(1.0, (t - W(36) + 0.1) / 3.0))
	return x * x * (3 - 2 * x)
def speed(t):                 # ripple speed: full while flowing, eased to 0 at the halt
	return 1.6 * (1 - ease_io((t - (T_STOP - 0.9)) / 0.9))
PH = {}
def phase(t):
	n = int(max(0, (t - T0)) * 240)
	k = round(t, 4)
	if k not in PH:
		PH[k] = sum(speed(T0 + (i + 0.5) / 240) for i in range(n)) / 240
	return PH[k]
S.value('prog', prog)
S.value('cool', cool)
S.value('phase', phase)
S.value('ripv', lambda t: 1.0)

S.nsig, S.zsig = 3.0, 80.0      # relief for the light bands blurred ~190 m, land cover +80 m (no flickering slivers)
S.terrain()
S.sea()
S.sky_sun(sun_az=float(arg('sun_az', 245)), sun_el=float(arg('sun_el', 34)))
S.hilo()
F0 = P(*HC.PTS['front'])
if '--notrees' not in argv:
	S.trees((F0.x + 4.0, F0.y), float(arg('tr', 12.0)), int(arg('trees', 7000)))

# ------------------------------------------------------------------ steam where the front stalls (white toon puffs, grow in, drift south)
# (review 18.10, round 2: «the steam covers the '2 Jan 1936' anchor dot/leader») the label's dot sits ON the stopped tip (track
# `front`) and its leader runs up-left; the steam now rises from the hot lobe just BEHIND the tip (0.975 / 0.95 / 0.925 of the
# centreline, the first two sources on its south side) and the wind carries it south (screen right), so the tip, the dot, its
# one-shot ring and the leader stay clear (render-free check: puff circles ≥ 39 px from the dot and the leader, ≥ 85 px from
# the text, 18.2–20.8 s)
steam_m = S.puff_mat('steam', (0.56, 0.52, 0.70), (0.82, 0.80, 0.90), (1.0, 0.98, 0.94))
FRONT = HC.PTS['front']
SW = (float(arg('swx', 0.2)), float(arg('swy', -0.7)))
srcs = [(0.975, 0.0, 30, (0.06, -0.2)), (0.95, 0.2, 22, (0.05, -0.15)), (0.925, 0.45, 16, (0.0, 0.0))]
items = []
for k, (al, dl, n, off) in enumerate(srcs):
	items += HT.rising(P(*along(ML_PATH, al), 0.02) + Vector((off[0], off[1], 0)), n, W(36) - 0.3 + dl, 0.085, float(arg('sv', 0.42)),
	                   float(arg('sh', 1.6)), 0.13, float(arg('sr', 0.36)), SW, seed=40 + k)
if '--nopuffs' not in argv:
	S.puffs('steam', items, steam_m, lw=2.0)

HILO = HC.PTS['hilo']
def pts(t):
	F = P(*FRONT, 0.03)
	path = []
	for k in range(13):
		u = k / 12
		path.append(P(FRONT[0] + (HILO[0] - FRONT[0]) * u, FRONT[1] + (HILO[1] - FRONT[1]) * u, 0.04))
	fl = flow_tip(prog(t))
	return {'front': F, 'front_live': P(*fl, 0.03), 'hilo': P(*HILO, 0.03), 'path': path}

if '--track' in argv:
	S.track(pts, HT.ROOT / arg('track_out', 'public/blender/hawaii_b/track.json'))
	sys.exit(0)
S.render()
