"""Hawaii3DA (wide) in the approved toon look — «1935, Hawaii. Lava is crawling toward a city.» (8.55 – 12.75 s = W(25) + XF + 0.05)
One continuous move: the whole Big Island in a cartoon ocean (the globe hop lands on exactly this camera: until 9.8 s it IS
Hawaii.tsx hawaiiACam) → push-in and tilt onto the 1935 Mauna Loa flow, which crawls from the erupting flank vent (lava
fountain + cream eruption cloud) north into the saddle and east → a lower oblique view along the flow towards Hilo, a town of
toy houses at the bay (real OSM footprints), the vent still erupting at the lower right.
Run through the GPU lock:
  tools/blender/run.sh tools/blender/hawaii_a.py -- [--frames 1,60,120] [--scale 50] [--samples 16] [--from N --to M] [--out DIR]
  tools/blender/run.sh tools/blender/hawaii_a.py -- --track          → public/blender/hawaii_a/track.json"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import hawaii_toon as HT
from hawaii_toon import Vector, W, arg, argv, P, LL2xy, hat_xy, along, ML_PATH, ease_io, column, flow_tip
import hawaii_cam as HC
import bpy

T0 = 8.55
T1 = W(25) + 0.4 + 0.05              # 12.75: the raid close-up's Layer starts at W(25) and this one holds XF under it
S = HT.Shot('hawaii_a', T0, T1, HC.cam_a, PRE=int(arg('pre', 240)))

# lava progress: the 1935 flow crawls all the time (time-lapse); the main advance runs 9.3 – 12.3 s, i.e. on «Lava is crawling
# toward a city» (the original Hawaii.tsx lavaProgA started later and hid the young flow under the cloud on «Lava»)
def sm(x):
	x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def prog(t):
	return 0.24 + 0.58 * sm((t - 8.9) / 3.2) + 0.012 * (t - T0)
S.value('prog', prog)
S.value('cool', lambda t: 0.0)
S.value('phase', lambda t: (t - T0) * 1.6)
S.value('ripv', lambda t: 1.0)

S.ripsp = 0.45                 # ripple spacing (km): ≈ 18 px at the end of this wide shot
S.nsig, S.zsig = 6.0, 250.0     # light bands from relief blurred 380 m, land cover +250 m: no 1–2 px slivers flicker in this fast wide move
S.terrain()
S.sea()
S.sky_sun(sun_az=float(arg('sun_az', 245)), sun_el=float(arg('sun_el', 34)))
S.hilo()

# ------------------------------------------------------------------ the erupting 1935 vent: fountain along a short N–S radial fissure + eruption cloud
VENT = P(*HC.PTS['vent'])
fa, fb = VENT + Vector((0.02, -0.32, 0)), VENT + Vector((-0.02, 0.32, 0))
fa.z = hat_xy(fa.x, fa.y); fb.z = hat_xy(fb.x, fb.y)
S.fountain(fa, fb, height=float(arg('fh', 1.4)), count=int(arg('fcount', 16000)), size=float(arg('blob', 0.075)), slit_w=0.035)
# (review 18.10, round 2: «a plain white ball of smoke sits over the vent with no column») a proper eruption plume ROOTED in the
# fountain: narrow at the vent (its base puffs start inside the fountain, 0.8 km up, lit orange from below by the lava), it rises
# visibly (rise 0.3 of its height over the shot), widens and bends downwind to the SSE — from the opening top view it trails
# south (down-screen), away from the young flow that runs north; in the end view (looking ENE) it leans right, away from the
# flow (left of the vent) and the route to Hilo (up-left). Framing checked render-free (puff circles vs the tracked route).
# Key light from the camera's right and above (the end view looks ENE → light from the SSE): a lit side, a mid band and a
# lavender shadow side instead of a flat white ball.
PL_B = VENT + Vector((float(arg('pbx', 0.0)), float(arg('pby', 0.0)), float(arg('pbz', 0.8))))
PL_H, PL_R0, PL_R1 = float(arg('ph', 8.0)), float(arg('pr0', 0.22)), float(arg('pr1', 1.2))
PL_W = (float(arg('pwx', 0.14)), float(arg('pwy', -0.46)))
def fire_lit_mat(name, shadow, mid, lit, z0, h, light, b=(-0.15, 0.38), strong=(1.0, 0.5, 0.16), soft=(1.0, 0.7, 0.45), up=0.35, th=(0.32, 0.64)):
	"""HT puff_mat with `light` (N·L toon bands) + a crisp under-glow: g = (1 − (z − z0)/h) + up·(−N.z) → strong orange where
	g > th[1], soft peach where g > th[0] (the lowest puffs glow from the fountain, the glow fades up the column)"""
	m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
	mo = HT.node(t, 'ShaderNodeOutputMaterial', (900, 0))
	g0 = HT.node(t, 'ShaderNodeNewGeometry')
	Lv = Vector(light).normalized()
	ndl = HT.VM(t, 'DOT_PRODUCT', g0.outputs['Normal'], tuple(Lv))
	band_ = HT.RAMP(t, HT.M(t, 'MULTIPLY_ADD', ndl, 0.5, 0.5), [(0.0, shadow), (0.5 + 0.5 * b[0], mid), (0.5 + 0.5 * b[1], lit)])
	pz = HT.SEP(t, g0.outputs['Position'])['Z']; nz = HT.SEP(t, g0.outputs['Normal'])['Z']
	g = HT.M(t, 'ADD', HT.M(t, 'SUBTRACT', 1.0, HT.M(t, 'DIVIDE', HT.M(t, 'SUBTRACT', pz, z0), h)), HT.M(t, 'MULTIPLY', nz, -up))
	c = HT.MIX(t, HT.M(t, 'GREATER_THAN', g, th[0]), band_, HT.MIX(t, 0.45, soft, band_, 'MULTIPLY'))
	c = HT.MIX(t, HT.M(t, 'GREATER_THAN', g, th[1]), c, HT.MIX(t, 0.3, strong, band_, 'MULTIPLY'))
	HT.EMIT(t, c, mo)
	return m
ash_m = fire_lit_mat('ash', (0.60, 0.53, 0.72), (0.85, 0.80, 0.88), (1.0, 0.97, 0.92), PL_B.z, float(arg('glowh', 3.0)), (0.35, -0.75, 0.75))
if '--nopuffs' not in argv:
	S.puffs('ash', column(S, PL_B, PL_H, PL_R0, PL_R1, int(arg('npuff', 90)), PL_W, rise=float(arg('prise', 0.3)), bend=1.4,
	                  spread=float(arg('pspread', 1.0))), ash_m)

HILO = HC.PTS['hilo']
CLOUD_TOP = PL_B + Vector((PL_W[0] * PL_H, PL_W[1] * PL_H, PL_H + PL_R1))
def pts(t):
	fl = flow_tip(prog(t))
	F = P(*fl, 0.03); Hh = P(*HILO, 0.03)
	path = []
	for k in range(13):
		u = k / 12
		lat = fl[0] + (HILO[0] - fl[0]) * u; lon = fl[1] + (HILO[1] - fl[1]) * u
		path.append(P(lat, lon, 0.04))
	return {'summit': P(*HC.PTS['summit'], 0.05), 'vent': P(*HC.PTS['vent'], 0.05), 'front': F, 'hilo': Hh, 'path': path,
	        'front_final': P(*HC.PTS['front'], 0.03), 'cloud_top': CLOUD_TOP}

if '--track' in argv:
	S.track(pts, HT.ROOT / arg('track_out', 'public/blender/hawaii_a/track.json'))
	sys.exit(0)
S.render()
