"""HOOK (0 – 6.87 s): «The US Army once bombed a volcano. And that's not even the craziest way we fought lava.»
Mauna Loa, 1935 NE-rift vent at dusk, toon style (as tools/blender/etna_toon.py; building blocks in hawaii_lib_hookraid.py).
Review 18.10 («the volcano never reads as a mountain»): the Mauna Loa skyline holds at y ≈ 430–470 the whole shot, with the
violet sky and a bank of cream clouds above it (≈ 23 % of the frame; the DOM biplane crosses there):
  0.00 – 1.37  camera 3.6 km NE of the target, 1.1 km above the ground, fov 60, slow push: the erupting vent (fountain + a tall
               cream plume that rises past the skyline) feeds the glowing river that runs down to the right;
  1.37         the bomb (DOM sprite, track `impact`) hits the river → toon blast: yellow-orange fireball puffs, glowing
               spatter and rocks, then a dark smoke column that rises and drifts right (away from the plume);
  2.0  – 3.45  «volcano.»: crane up AND back to 9 km NE of the vent / 1.8 km above it, the aim rising with it: the skyline stays,
               the summit dome, the whole NE flank, the vent and the smoking impact open up under it (vent ≈ y 850–880);
  3.45 – 6.87  slow drift (the triptych + globe cover it from 3.52 s).
Framing checked render-free: --probe prints skyline / vent / impact / summit screen y over the shot (hawaii_probe.py).
Atlas stands bottom-centre (y ≳ 1150) → nothing happens in the lower third.
  tools/blender/run.sh tools/blender/hawaii_hook.py -- [--frames 1,83,140] [--scale 50] [--samples 16] [--from N --to M]
     [--track] [--lite] [--probe] [--out out/blender/hawaii_hook]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from hawaii_lib_hookraid import *          # noqa: F401,F403
import hawaii_lib_hookraid as L

LITE = flag('lite')
shot = Shot(0.0, 6.42 + 0.45, pre=0 if LITE else 150, out='out/blender/hawaii_hook')
sc = setup_scene(shot)
# terrain toon bands for this light (linear luminance of a white diffuse, measured with --debug light; sun only, no cast shadows)
if arg('tb1') is None: L.TB[:] = [0.69, 0.83]
T_HIT = W(4) - 0.04                       # Hawaii.tsx HOOK_DROP.ti («bombed»)

V = P(*G['vent']); B0 = P(*G['b0']); SUMMIT = P(*G['summit'])
HIT = on_channel(*G['b0'])                # the documented upper target, snapped onto the lava (± 90 m)
print('vent', V, 'hit', HIT, 'summit', SUMMIT)

# ------------------------------------------------------------------ camera
def look(t, cam, tgt, fov, v=None, still=False):
	d = cam - tgt
	dist = d.length
	el = math.degrees(math.asin(d.z / dist))
	az = math.degrees(math.atan2(d.x, -d.y))
	return CK(t, tgt, az, el, dist, fov, v=v, still=still)
def from_brg(p, brg, dist, agl=None, z=None):
	b = math.radians(brg)
	x, y = p.x + dist * math.sin(b), p.y + dist * math.cos(b)
	return Vector((x, y, (ground(x, y) + agl) if agl is not None else z))
def level_target(cam, aim, dist=2.6, pitch=0.0):
	f = Vector((aim.x - cam.x, aim.y - cam.y, 0)).normalized()
	f = Vector((f.x * math.cos(math.radians(pitch)), f.y * math.cos(math.radians(pitch)), math.sin(math.radians(pitch))))
	return cam + f * dist
mid = (V + HIT) / 2
# (review 18.10: «the volcano never reads as a mountain») the Mauna Loa skyline stays at y ≈ 440–480 all shot long, with the
# violet sky and cream clouds above it (≈ 23 % of the frame, the biplane crosses there); vent, plume and impact sit at
# y ≈ 800–950, above the subtitle (1095) and Atlas. Checked render-free with --probe (tools/blender/hawaii_probe.py).
C0 = from_brg(HIT, float(arg('brg0', 45)), float(arg('d0', 3.6)), agl=float(arg('agl0', 1.1)))
T0_ = level_target(C0, mid, 2.6, float(arg('pitch0', -9.0)))
FWD = (T0_ - C0).normalized()
C1 = C0 + FWD * 0.3 + Vector((0, 0, 0.02))          # slow push while the bomber crosses
T1_ = T0_ + FWD * 0.3 + Vector((0, 0, 0.02))
# the blast eases the camera straight back along its view (the skyline stays put; no tilt, no shake)
C2 = C1 - FWD * 0.14; T2_ = T1_ - FWD * 0.14
# «volcano.»: crane up AND back (the aim rises with it, so the skyline holds its place while the whole NE flank, the vent with
# its plume, the smoking impact and the river open up under it)
TCR = float(arg('tcr', 3.45))
CE = from_brg(V, float(arg('brgE', 42)), float(arg('dE', 9.0)), z=V.z + float(arg('altE', 1.8)))
fovE = float(arg('fovE', 56))
dep = math.atan2(-(CE.z - V.z), (Vector((CE.x - V.x, CE.y - V.y, 0))).length)
off = math.atan((960 - float(arg('yvE', 880))) / 960 * math.tan(math.radians(fovE / 2)))
fE = Vector((V.x - CE.x, V.y - CE.y, 0)).normalized()
pitchE = dep - off
TE = CE + Vector((fE.x * math.cos(pitchE), fE.y * math.cos(pitchE), math.sin(pitchE))) * (CE - V).length
CF = CE + (CE - V).normalized() * float(arg('dF', 0.6)) + Vector((0, 0, float(arg('upF', 0.12))))
TF = TE + Vector((0.3, 0.2, float(arg('tzF', 0.0))))
FOV0 = float(arg('fov0', 60))
keys = [
	look(0.0, C0, T0_, FOV0),
	look(T_HIT, C1, T1_, FOV0),
	look(float(arg('tgv', 2.0)), C2, T2_, FOV0, still=True),
	look(TCR, CE, TE, fovE),
	look(shot.T1, CF, TF, fovE),
]
# az continuity (no wrap)
for i in range(1, len(keys)):
	while keys[i].az - keys[i - 1].az > 180: keys[i].az -= 360
	while keys[i].az - keys[i - 1].az < -180: keys[i].az += 360
# the crane eases into the slow drift: its end key carries the drift's own velocity (a Catmull-Rom tangent from the 2.0 s key
# would carry the crane's speed past it and make the camera swing back)
_v = lambda k: [k.target.x, k.target.y, k.target.z, k.az, k.el, math.log(k.dist), k.fov]
keys[3].v = {c: (b - a) / (keys[4].t - keys[3].t) for c, (a, b) in enumerate(zip(_v(keys[3]), _v(keys[4])))}
for k in keys: print('key t=%.2f az %.1f el %.1f dist %.2f fov %.0f' % (k.t, k.az, k.el, k.dist, k.fov))
path = CamPath(keys, endvel=(0.7, 0.6))
if flag('probe'):
	import hawaii_probe as HP
	HP.report(path, {'vent': V, 'impact': HIT, 'summit': SUMMIT}, [0, 0.7, 1.37, 1.8, 2.2, 2.6, 3.0, 3.5, 4.25, 5.0, 6.0, 6.87])
	sys.exit(0)
cam = build_camera(sc, path)

# ------------------------------------------------------------------ world
violet_sky(sc)
sun(sc, float(arg('sunaz', 315)), float(arg('sunel', 24)))
sea(sc)
ink = ink_material()
prog_keys = [(shot.T0, 0.55), (shot.T1, 0.55 + shot.T1 * 0.006)]           # HookScene lava prog
build_terrain(sc, cam, ink, path, prog_keys, phase_speed=float(arg("phase", 0.55)), lite=LITE)

if not (LITE or flag("nofx")):
	# vent: short glowing fissure along the NE rift + lava fountain (particles) + cream fume column
	rift = Vector((math.sin(math.radians(45)), math.cos(math.radians(45)), 0))
	fa, fb = V - rift * 0.07, V + rift * 0.07
	fa.z = ground(fa.x, fa.y); fb.z = ground(fb.x, fb.y)
	glow_slit(sc, fa, fb, 0.012)
	# (review 18.10, round 2: «the eruption reads only through the cream plume; the fountain is a scatter of yellow dots») a solid
	# glowing lava-fountain body stands in the vent (crisp emission bands, dark-red outline, slow wobble/breathing), in a glowing
	# pool; the spatter particles are fewer and only spray out of its crown; the plume starts AT the crown and its lowest puffs
	# are lit orange from below
	JH = float(arg('jh', 0.28))
	glow_disc(sc, V, 0.075, (1.0, 0.42, 0.05), 0.006, seed=1, name='vent_pool')
	glow_disc(sc, V, 0.04, (1.0, 0.82, 0.3), 0.009, seed=2, name='vent_core')
	lava_jet(sc, V, JH, float(arg('jr', 0.06)), path, name='jet', seed=1)
	fountain(sc, fa, fb, float(arg('fh', 0.34)), count=int(arg('fcount', 2600)), blob=float(arg('blob', 2.4)), grav=0.25)
	PB = V + Vector((0.0, 0.0, JH * 0.8))
	fume = fire_lit_puff_mat('fume', (0.66, 0.58, 0.72), (0.88, 0.81, 0.84), (1.0, 0.96, 0.88), PB.z, float(arg('glowh', 0.4)))
	# (review 18.10) a tall cream eruption plume that rises past the skyline into the violet sky: «volcano» at a glance
	wind = (float(arg('wx', 0.26)), float(arg('wy', -0.1)))
	puff_column(sc, 'fume', PB, float(arg('plume', 1.15)), 0.04, float(arg('pr1', 0.3)), int(arg('npuff', 44)), wind, fume, ink, path,
	            rise=0.12, bend=1.8, spread=0.5)
	# far illustrated cream clouds high over and beyond the summit (static toon puffs): they sit in the sky band above the
	# skyline (≈ 5–7° above it from both the opening and the crane camera), never on the slope
	cloud_m = puff_mat('cloud', (0.80, 0.62, 0.80), (0.96, 0.84, 0.84), (1.0, 0.96, 0.86))
	vd_ = Vector((SUMMIT.x - V.x, SUMMIT.y - V.y, 0)).normalized(); side = Vector((-vd_.y, vd_.x, 0))
	CZ = float(arg('cz', 15.5))
	far_clouds(sc, SUMMIT, side, [(vd_ * 20 + side * -8, CZ - 0.6, 0, 1.3), (vd_ * 28 + side * 6, CZ + 0.5, 0, 1.6),
	                              (vd_ * 36 + side * -1, CZ + 1.6, 0, 1.9), (vd_ * 16 + side * 12, CZ - 1.0, 0, 1.1)], cloud_m)
	# the bomb blast on the river
	# (its smoke drifts west = screen-right, away from the cream plume that leans east = left)
	# (review 18.10, round 2: «the smoke column floats detached from the ground») the blast's smoke thins out as it rises and a
	# dark stem, fed at the impact until the end of the shot, roots it on the river
	R_ = float(arg('R', 0.19)); BW = (-0.08, 0.04)
	explosion(sc, 'hook', HIT, T_HIT, R_, 3, ink, path, wind=BW, thin=(1.4, 4.4, 0.35))
	smoke_stem(sc, 'hook', HIT, T_HIT, R_, ink, path, BW)

if flag('track'):
	write_track(sc, cam, {'impact': HIT, 'vent': V, 'summit': SUMMIT, 'impact_top': HIT + Vector((0, 0, 0.25)),
	                      'vent_top': V + Vector((0, 0, 0.6))})
	sys.exit(0)
render_loop(sc)
