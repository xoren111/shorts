"""Iceland C — «The lava stops about 100 meters from closing the harbor.» (W(119) 61.91 → W(129)+0.45 66.36 s, dawn), approved toon
look (etna_toon.py / heimaey_toon.py). A high view from the east over the outer bay into the harbour mouth: the cooled, stopped
front of the harbour lobe (dark crust, a few dull-red seams, thin steam wisps where the seawater cooled it) ends short of
Heimaklettur's shore; fishing boats sail in from the sea through the gap that stayed open, past the lava, into the harbour basin
with the town behind. The ~100 m ruler between I.front and I.frontOpp and the KeyFact «~100 m» are DOM (Remotion) — this script
writes their screen positions (--track).
The lava is completely static (full 1973 outline, fixed heat classes): nothing appears, disappears or changes colour.
  tools/blender/run.sh tools/blender/iceland_c.py -- [--frames 1,134,267] [--scale 50] [--samples 16] [--out out/blender/iceland_c]
     [--track public/blender/iceland_c/track.json]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import math
import numpy as np
import bpy, bmesh
from mathutils import Vector
from heimaey_toon import (Scene, W, G, P, XY, Pxy, hraw, arg, node, link, M, MIX, EMIT, VAL, new_mat, flat_mat, grid_xy, seg_dist,
                          gblur, linear_keys, fcurves_of, HARBOR_LOBE, HARBOUR_LL, MOUTH_LL, FPS)

T0 = W(119)
T1 = W(129) + 0.45
S = Scene(T0, T1, PRE=0, lens=30, out_default='out/blender/iceland_c')
sc = S.sc

F = P(*G['front']); FO = P(*G['frontOpp']); MOUTH = P(*MOUTH_LL)

# ------------------------------------------------------------------ camera: high from the east over the outer bay, one even descending
# push-in onto the harbour mouth (the gap sits at y ≈ 1000–1150, above the subtitle band and below the KeyFact at y 790)
def V3(s_, d): return Vector(tuple(float(x) for x in s_.split(','))) if s_ else Vector(d)
C0 = V3(arg('c0'), (1.25, 1.66, 0.92)); C1 = V3(arg('c1'), (0.92, 1.70, 0.66))
L0 = V3(arg('l0'), (0.26, 1.84, 0.0)); L1 = V3(arg('l1'), (0.29, 1.85, 0.0))
S.LENS = float(arg('lens', 30))
S.NEAR = 0.1                     # the camera stays ≥ 0.6 km from everything: a far near plane keeps the wakes from z-fighting the sea
def campath(t):
	k = (t - T0) / (T1 - T0)
	k = k * k * (3 - 2 * k) * 0.35 + k * 0.65            # mostly constant speed, a little ease at both ends (inserts on both sides)
	# distance in log space so the push-in feels even
	c = L0.lerp(L1, k) + (C0 - L0).normalized().lerp((C1 - L1).normalized(), k).normalized() * math.exp(
		math.log((C0 - L0).length) * (1 - k) + math.log((C1 - L1).length) * k)
	return c, L0.lerp(L1, k)
S.camera(campath)

# ------------------------------------------------------------------ data + lava (static, cooled)
S.make_ink()
S.build_fields()
X, Y = grid_xy(1002, 1024)
lobe = [(XY(*p).x, XY(*p).y) for p in HARBOR_LOBE]
chan = np.clip(1 - (seg_dist(X, Y, lobe) - 0.03) / 0.10, 0, 1)
rng = np.random.default_rng(3)
warm = gblur(rng.random(X.shape).astype(np.float32), 6.0); warm = (warm - warm.mean()) / (warm.std() + 1e-6)
basef = np.clip(0.12 + 0.08 * warm, 0.02, 0.28)
d_front = np.hypot(X - F.x, Y - F.y)
# the channel interior still glows dull red far up the field; the stopped front itself is cold
heatc = np.maximum(basef, 0.48 * chan * np.clip((d_front - 0.25) / 0.35, 0, 1))
HEAT = S.heat_image('heatC', [heatc, np.zeros_like(heatc), np.ones_like(heatc)])
mat = S.terrain_material(lambda nt, uvs, geo, band: S.lava_layer(nt, uvs, geo, band, HEAT, prog=0.95, plates=float(arg('plates', 16)),
                                                                   heat_expr=lambda nt, hc, hp, arr: hc[0], seam_col=(0.36, 0.05, 0.05)))
S.terrain(mat)
S.sea()
S.world(sun_az=float(arg('sun_az', 125)), sun_el=float(arg('sun_el', 26)))

# (review 18.10: the two opaque steam-wisp stacks on the cooled front read as snowmen and pulled the eye off the gap — removed;
# the stopped front is simply cold, dark crust)
S.puffs_init()

# ------------------------------------------------------------------ town
S.houses()

# ------------------------------------------------------------------ boats: Kenney fishing boats (CC0), cartoon-sized (≈ 40 m) so they read
BOAT_L = float(arg('boat_l', 0.055))
NB_IN, NB_MOOR = 3, 5
boats, kb, ymin_b, zmax_b = S.boats('kenney-watercraft-kit/Models/GLB format/boat-fishing-small.glb', NB_IN + NB_MOOR, BOAT_L, hue=float(arg('boat_hue', 0.93)))
for o in boats:
	S.hull_of(o, S.line_w((Vector((0.4, 1.85, 0)) - S.CAMC).length) * 0.8)
Z_BOAT = -0.16 * zmax_b * kb
wake_m = flat_mat('wake', (0.93, 0.98, 1.0))
def wake_mesh():
	"""flat white V wake + centre trail behind the stern (boat-local units, bow = −Y), tapering to points"""
	bm = bmesh.new()
	yst = -ymin_b                                  # stern (+Y) ≈ |ymin| for these symmetric hulls
	Lw = 2.4 * (2 * yst)
	zl = 0.16 * zmax_b + 0.0004 / kb              # world z ≈ +0.4 m, 1.2 m above the sea plane (no z-fight)
	for side in (-1, 1):
		a = Vector((side * 0.55, yst * 0.85, zl)); spread = math.tan(math.radians(17))
		pts = [a, Vector((a.x + side * spread * Lw, a.y + Lw, zl))]
		w0 = 0.32
		dirv = (pts[1] - pts[0]).normalized(); nrm = Vector((-dirv.y, dirv.x, 0))
		v0 = bm.verts.new(a + nrm * w0); v1 = bm.verts.new(a - nrm * w0); v2 = bm.verts.new(pts[1])
		bm.faces.new((v0, v1, v2))
	c0 = Vector((0, yst * 0.9, zl))
	v0 = bm.verts.new(c0 + Vector((0.45, 0, 0))); v1 = bm.verts.new(c0 - Vector((0.45, 0, 0))); v2 = bm.verts.new(c0 + Vector((0, Lw * 0.7, 0)))
	bm.faces.new((v0, v1, v2))
	bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	for f_ in bm.faces:
		if f_.normal.z < 0: f_.normal_flip()
	me = bpy.data.meshes.new('wake'); bm.to_mesh(me); bm.free(); me.materials.append(wake_m)
	return me
WAKE = wake_mesh()

def catmull(pts, n=24):
	Q = [pts[0], *pts, pts[-1]]
	out = []
	for i in range(1, len(Q) - 2):
		p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
		for k in range(n):
			t = k / n
			out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
	out.append(pts[-1])
	return out
# inbound route: from the outer bay west through the mouth into the harbour basin. Fix round 18.10 night: the boats used to hug
# the new lava's north shore and boat 2 ran right next to the ruler's lava-end tick while the ruler was up (63.05–64.65 s). Now
# the approach lane runs through the middle of the bay (≥ 100 m off the lava shore, clear of the rock off Ystiklettur at
# x 0.85 / y ≥ 2.0) and turns into the gap from the north-east, through the gap's middle (MOUTH = midpoint of front/frontOpp)
ROUTE = [Vector((p[0], p[1], 0.0)) for p in ((1.40, 1.988), (1.10, 1.975), (0.90, 1.965), (0.70, 1.955), (0.55, 1.935), (0.45, 1.905),
                                            (MOUTH.x, MOUTH.y), (0.22, 1.835), (0.1245, 1.8015), (-0.05, 1.775), (-0.25, 1.75))]
DENSE = catmull(ROUTE)
segL = [(DENSE[i + 1] - DENSE[i]).length for i in range(len(DENSE) - 1)]
cum = np.concatenate([[0], np.cumsum(segL)])
s_mouth = cum[int(np.argmin([(p - MOUTH).length for p in DENSE]))]
def at_s(s):
	s = min(max(s, 0), cum[-1] - 1e-6)
	i = int(np.searchsorted(cum, s, side='right') - 1)
	k = (s - cum[i]) / max(1e-9, segL[i])
	p = DENSE[i].lerp(DENSE[i + 1], k)
	d = DENSE[i + 1] - DENSE[i]
	return p, math.atan2(d.y, d.x)
# (distance before the mouth at T0 in km — negative = already inside —, speed km/s, lateral offset km (+ = north, fades out
# 0.25 km before the mouth)): one boat already inside; boat 2 is ≥ 0.12 km (≈ 190 px) out in the bay while the ruler is up and
# crosses the gap at ≈ 65.9 s («…the harbor.», after the ruler has faded at 64.65 s); boat 3 follows from beyond the frame edge
RULER_ON, RULER_OFF = W(123) - 0.15, 64.65                    # Iceland.tsx Ruler k > 0 … RULER_OUT + 0.35
INB = [(-0.11, 0.030, 0.0), (0.38, 0.095, 0.0), (0.68, 0.088, -0.03)]
TRK = {}
for bi, (s0, v, lat0) in enumerate(INB):
	o = boats[bi]
	w_ = S.link_obj(bpy.data.objects.new(f'wake{bi}', WAKE)); w_.parent = o; w_.visible_shadow = False
	prev = None
	for f in range(1, S.NF + 1):
		t = S.t_of(f)
		s = s_mouth - s0 + v * (t - T0)
		# glide in: slow down smoothly in the basin (never stop abruptly)
		if s > s_mouth + 0.12:
			s = s_mouth + 0.12 + 0.06 * math.tanh((s - s_mouth - 0.12) / 0.06)
		p, hd = at_s(s)
		if lat0:
			q_, _ = at_s(s + 0.01); tg_ = (q_ - p).normalized(); nrm_ = Vector((-tg_.y, tg_.x, 0))
			p = p + nrm_ * (lat0 * min(1.0, max(0.0, (s_mouth - 0.25 - s) / 0.2)))
		if bi == 1 and RULER_ON <= t <= RULER_OFF:
			dmin = min((p.xy - F.xy).length, (p.xy - FO.xy).length)
			assert s_mouth - s > 0.115 and dmin > 0.1, ('boat 2 too close to the ruler', t, s_mouth - s, dmin)
		yaw = hd + math.pi / 2                          # local −Y (bow) → travel direction
		if prev is not None:
			while yaw - prev > math.pi: yaw -= 2 * math.pi
			while yaw - prev < -math.pi: yaw += 2 * math.pi
		prev = yaw
		o.location = (p.x, p.y, Z_BOAT); o.rotation_euler = (0, 0, yaw)
		o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f)
	linear_keys(o)
	TRK[f'boat{bi + 1}'] = o
# moored fleet in the basin (Iceland.tsx MOORINGS), bows to the west
MOORINGS = [(63.44541, -20.27948), (63.44505, -20.2775), (63.44595, -20.2755), (63.44505, -20.2735), (63.446, -20.2712)]
for j, ll in enumerate(MOORINGS):
	o = boats[NB_IN + j]; p = XY(*ll)
	o.location = (p.x, p.y, Z_BOAT); o.rotation_euler = (0, 0, math.radians(180 + 90 + (8 if j % 2 else -6)))

# ------------------------------------------------------------------ tracks / render
if arg('track'):
	pts = {'front': F + Vector((0, 0, 0.003)), 'frontOpp': FO + Vector((0, 0, 0.003)), 'harbour': P(*HARBOUR_LL), 'mouth': MOUTH}
	for k_, o in TRK.items():
		pts[k_] = (lambda ob: (lambda t: ob.matrix_world.translation + Vector((0, 0, 0.008))))(o)
	pts['ship'] = pts['boat2']
	S.track(pts, arg('track'))
	sys.exit(0)
S.render()
