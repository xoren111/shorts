"""RAID (W(25) = 12.30 – W(28) + 0.45 = 14.95 s): «The plan? Bombers.» — close variant of Hawaii3DA, toon style
(tools/blender/etna_toon.py look; building blocks in hawaii_lib_hookraid.py).
The 1935 lava channel just below the NE-rift vent of Mauna Loa, seen from the WSW (az −73 as the three.js raid camera and the
Hawaii A wide shot it dissolves from): the vent with its fountain and fume plume on the right, the glowing river flowing from
it to the left; slow push-in. Three documented/derived targets on the channel (the DOM reticles sit on the tracks `hit0..2`),
hit left → right in Hawaii.tsx RAID_DROPS order at 13.85 / 14.00 / 14.15 s: three toon blasts (fireball → smoke column),
spatter and rocks; a soft camera give (no shake).
  tools/blender/run.sh tools/blender/hawaii_raid.py -- [--frames 1,90,120] [--scale 50] [--samples 16] [--track]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from hawaii_lib_hookraid import *          # noqa: F401,F403
import hawaii_lib_hookraid as L

LITE = flag('lite')
shot = Shot(W(25), W(28) + 0.45, pre=0 if LITE else 150, out='out/blender/hawaii_raid')
sc = setup_scene(shot)
# terrain toon bands for this light (linear luminance of a white diffuse, measured with --debug light; sun only, no cast shadows)
if arg('tb1') is None: L.TB[:] = [0.63, 0.77]
# Hawaii.tsx RAID_DROPS: ti = W(28) − 0.65 / − 0.5 / − 0.35 on bombs[1] (left), bombs[2] (middle), bombs[0] (right)
DROPS = [(W(28) - 0.65, 'b1'), (W(28) - 0.5, 'b2'), (W(28) - 0.35, 'b0')]
HITS = [on_channel(*G[k]) for _, k in DROPS]
V = P(*G['vent'])
print('hits', HITS, 'vent', V)

# ------------------------------------------------------------------ camera: WSW of the channel, slow push-in + soft give
tg0 = (HITS[0] + HITS[1] + HITS[2]) / 3 * 0.62 + V * 0.38
tg1 = tg0 + (V - tg0) * 0.06
AZ0, AZ1 = float(arg('az0', -76)), float(arg('az1', -71))
keys = [CK(shot.T0, tg0, AZ0, float(arg('el0', 30)), float(arg('d0', 5.0)), 40),
        CK(shot.T1, tg1, AZ1, float(arg('el1', 27)), float(arg('d1', 4.4)), 40)]
def give(t):
	import math as m_
	x = min(1.0, max(0.0, (t - DROPS[0][0]) / 1.1))
	return 1 + 0.03 * (x * x * (3 - 2 * x))
path = CamPath(keys, endvel=(0.8, 0.8), push=give)
cam = build_camera(sc, path)

# ------------------------------------------------------------------ world
violet_sky(sc)
sun(sc, float(arg('sunaz', 300)), float(arg('sunel', 24)))
sea(sc)
ink = ink_material()
prog_keys = [(shot.T0, 0.82), (shot.T1, 0.82 + (shot.T1 - shot.T0) * 0.02)]           # Hawaii.tsx lavaProgA
build_terrain(sc, cam, ink, path, prog_keys, phase_speed=float(arg('phase', 0.55)), lite=LITE)

if not (LITE or flag('nofx')):
	rift = Vector((math.sin(math.radians(45)), math.cos(math.radians(45)), 0))
	fa, fb = V - rift * 0.07, V + rift * 0.07
	fa.z = ground(fa.x, fa.y); fb.z = ground(fb.x, fb.y)
	glow_slit(sc, fa, fb, 0.014)
	fountain(sc, fa, fb, float(arg('fh', 0.2)), count=int(arg('fcount', 6000)), blob=float(arg('blob', 2.2)), grav=0.25)
	fume = puff_mat('fume', (0.66, 0.58, 0.72), (0.88, 0.81, 0.84), (1.0, 0.96, 0.88), V.z, under=(1.0, 0.5, 0.15), under_h=0.07)
	puff_column(sc, 'fume', V + Vector((0.05, -0.02, 0.12)), float(arg('plume', 0.55)), 0.03, float(arg('pr1', 0.2)), 30,
	            (float(arg('wx', 0.9)), float(arg('wy', -0.3))), fume, ink, path, rise=0.12, bend=2.0, spread=0.5)
	R = float(arg('R', 0.13))
	for i, ((ti, _), h) in enumerate(zip(DROPS, HITS)):
		explosion(sc, f'raid{i}', h, ti, R * (1.05, 0.85, 1.0)[i], 11 + i, ink, path, wind=(0.10, -0.03),
		          n_fire=20, n_smoke=12, n_rock=16, n_spat=30)

if flag('track'):
	pts = {f'hit{i}': h for i, h in enumerate(HITS)}
	pts.update({'vent': V, 'fire_top': (HITS[0] + HITS[2]) / 2 + Vector((0, 0, 0.45)), 'summit': P(*G['summit'])})
	write_track(sc, cam, pts)
	sys.exit(0)
render_loop(sc)
