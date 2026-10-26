"""Iceland B — «…with the ocean.» (W(109) 56.45 → W(112)+0.45 58.28 s, dawn), approved toon look (etna_toon.py / heimaey_toon.py).
The pump ship Sandey (a sand dredger, from 1 Mar 1973 in the harbour channel — data/flows.json pumping_labels) lies in the channel
just inside the harbour mouth (src/scenes/Iceland.tsx SHIP, USGS OF 97-724 sketch) and sprays two arcs of seawater from two bow
monitors onto the glowing front of the harbour lobe (Iceland.tsx JETS targets); big cartoon steam boils up where the water lands
and the lava there turns black (a slowly growing cooled patch). Camera: low from the WSW over the harbour, looking ENE along the
channel toward the mouth — ship (left), arcs, steam, the glowing field (right), Heimaklettur / Ystiklettur, the violet dawn sky.
The lava coverage is static (full 1973 outline, prog 0.95, heat classes fixed per crust plate) — nothing appears or disappears;
only the cooled patch under the jets grows (monotone, per pixel) and the melt ripples drift downstream.
  tools/blender/run.sh tools/blender/iceland_b.py -- [--frames 1,55,110] [--scale 50] [--samples 16] [--out out/blender/iceland_b]
     [--track public/blender/iceland_b/track.json]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import math
import numpy as np
import bpy, bmesh
from mathutils import Vector
from heimaey_toon import (Scene, W, G, P, XY, Pxy, hraw, arg, node, link, put, M, MIX, RAMP, SEP, VM, EMIT, VAL, new_mat, flat_mat,
                          toon, tex, world_uv, grid_xy, seg_dist, gblur, linear_keys, fcurves_of, HARBOR_LOBE, HARBOUR_LL, MOUTH_LL, FPS)

T0 = W(109)
T1 = W(112) + 0.45
S = Scene(T0, T1, PRE=0, lens=36, out_default='out/blender/iceland_b')
sc = S.sc

# ------------------------------------------------------------------ key points (blender km)
F = P(*G['front']); SHIP = XY(*G['ship']); CR = P(*G['crater']); EL = P(*G['eldfell'])
J1 = P(63.4462, -20.2568); J2 = P(63.4458, -20.2574)     # Iceland.tsx JETS targets on the front

# ------------------------------------------------------------------ camera: from the WSW over the harbour, looking ENE along the channel
# toward the mouth: the ship in the channel (left), its two arcs of water crossing to the glowing front (centre), the steam,
# the lava field filling the right half, the bay, the islets and the violet dawn sky beyond. A slow even push-in with a
# slight turn to the right (more of the field), straight through both dissolves (no easing = no visible braking).
PRESETS = {
	'w3': ((-0.10, 1.66, 0.30), (-0.05, 1.672, 0.285), (0.42, 1.80, 0.04), (0.43, 1.79, 0.04), 28),
	'w4': ((-0.12, 1.62, 0.17), (-0.095, 1.632, 0.165), (0.38, 1.83, 0.04), (0.385, 1.825, 0.04), 36),
	'w5': ((-0.13, 1.63, 0.18), (-0.105, 1.638, 0.172), (0.41, 1.79, 0.035), (0.425, 1.775, 0.035), 36),
	'w6': ((-0.125, 1.625, 0.175), (-0.10, 1.634, 0.168), (0.392, 1.818, 0.035), (0.398, 1.808, 0.035), 36),
	'w7': ((-0.125, 1.625, 0.175), (-0.10, 1.634, 0.168), (0.388, 1.822, 0.035), (0.380, 1.830, 0.035), 36),
}
pr = PRESETS[arg('cam', 'w7')]
def V3(s_, d): return Vector(tuple(float(x) for x in s_.split(','))) if s_ else Vector(d)
C0 = V3(arg('c0'), pr[0]); C1 = V3(arg('c1'), pr[1]); L0 = V3(arg('l0'), pr[2]); L1 = V3(arg('l1'), pr[3])
S.LENS = float(arg('lens', pr[4]))
S.NEAR = 0.005                   # (as rendered; the nearest object is ≥ 0.3 km away)
def campath(t):
	k = (t - T0) / (T1 - T0)
	return C0.lerp(C1, k), L0.lerp(L1, k)
S.camera(campath)

# ------------------------------------------------------------------ data
S.make_ink()
S.build_fields()
# heat fields (1024 grid), looked up per crust plate: R = channel along the real harbour-lobe path + a smooth random warmth,
# G = the hot front at the harbour mouth and the young lava at the vent; B (per pixel) = distance to the jet impacts
X, Y = grid_xy(1002, 1024)
lobe = [(XY(*p).x, XY(*p).y) for p in HARBOR_LOBE]
d_lobe = seg_dist(X, Y, lobe)
chan = np.clip(1 - (d_lobe - 0.035) / 0.13, 0, 1)
rng = np.random.default_rng(3)
warm = gblur(rng.random(X.shape).astype(np.float32), 6.0); warm = (warm - warm.mean()) / (warm.std() + 1e-6)
basef = np.clip(0.14 + 0.09 * warm, 0.02, 0.4)
d_front = np.hypot(X - F.x, Y - F.y)
frontp = np.clip(1 - d_front / 0.26, 0, 1)
d_jet = np.minimum(np.hypot(X - J1.x, Y - J1.y), np.hypot(X - J2.x, Y - J2.y))
cratp = np.clip(1 - np.hypot(X - CR.x, Y - CR.y) / 0.2, 0, 1)
HEAT = S.heat_image('heatB', [np.maximum(0.80 * chan, basef), np.maximum(1.02 * frontp ** 0.8, 0.9 * cratp), np.clip(d_jet / 0.25, 0, 1)])

def heat_expr(nt, hc, hp, arr):
	h = M(nt, 'MAXIMUM', hc[0], hc[1])
	# water-cooled patches under the jets: black crust inside a slowly growing wobbly radius (per pixel, monotone → no flicker)
	tc = node(nt, 'ShaderNodeTexCoord')
	nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 40; nz.inputs['Detail'].default_value = 1.0
	link(nt, tc.outputs['Object'], nz.inputs['Vector'])
	cr = VAL(nt, 'cool_r', 0.0)
	dj = M(nt, 'MULTIPLY_ADD', M(nt, 'SUBTRACT', nz.outputs['Fac'], 0.5), 0.06, hp[2])
	cooled = M(nt, 'LESS_THAN', dj, cr.outputs[0])
	return M(nt, 'MULTIPLY', h, M(nt, 'SUBTRACT', 1.0, M(nt, 'MULTIPLY', cooled, 0.85)))
mat = S.terrain_material(lambda nt, uvs, geo, band: S.lava_layer(nt, uvs, geo, band, HEAT, prog=0.95, plates=float(arg('plates', 16)), heat_expr=heat_expr))
S.terrain(mat)
S.sea()
# violet dusk ramp (etna_toon colours) compressed toward the horizon: this camera sees only the lowest ~13° of the sky
S.world(sun_az=float(arg('sun_az', 112)), sun_el=float(arg('sun_el', 27)),
        sky=[(0.0, (1.0, 0.68, 0.45)), (0.03, (1.0, 0.42, 0.52)), (0.085, (0.78, 0.26, 0.62)), (0.17, (0.38, 0.16, 0.6)), (0.4, (0.13, 0.07, 0.36))])

# lava animation: ripples drift downstream (~0.6 spacing / s), cooled radius grows (0.15 → 0.36 of 0.25 km)
nt = mat.node_tree
ph = nt.nodes['phase'].outputs[0]
for t, v in ((T0, 0.0), (T1, (T1 - T0) * 0.6)):
	ph.default_value = v; ph.keyframe_insert('default_value', frame=S.fr(t))
cr_ = nt.nodes['cool_r'].outputs[0]
for t, v in ((T0, 0.13), (T1, 0.30)):
	cr_.default_value = v; cr_.keyframe_insert('default_value', frame=S.fr(t))
for fc in fcurves_of(nt):
	for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
	fc.extrapolation = 'LINEAR'

S.puffs_init()

# ------------------------------------------------------------------ the pump ship (Kenney ship-cargo-b, CC0; bulk piles removed)
SHIP_L = float(arg('ship_l', 0.095))         # km — cartoon-sized (real Sandey ≈ 50 m) so it reads in the vertical frame
roots, objs = S.kenney('kenney-watercraft-kit/Models/GLB format/ship-cargo-b.glb', drop=('cargo-a', 'cargo-b'))
ship = roots[0]
vv = np.array([v.co[:] for v in ship.data.vertices])
ymin, ymax, zmax = vv[:, 1].min(), vv[:, 1].max(), vv[:, 2].max()
# the narrow end is the bow (−Y for the Kenney hulls: x-width 1.6 vs 3.7 at +Y)
sc_k = SHIP_L / (ymax - ymin)
JM = (J1 + J2) / 2
head = math.atan2(JM.y - SHIP.y, JM.x - SHIP.x) + math.radians(float(arg('ship_rot', 35)))
ship.scale = (sc_k, sc_k, sc_k)
ship.rotation_euler = (0, 0, head + math.pi / 2)            # local −Y (bow) → heading
ship.location = (SHIP.x, SHIP.y, -0.18 * zmax * sc_k)
bpy.context.view_layer.update()
MW = ship.matrix_world.copy()
hull_of = S.hull_of
for o in objs:
	if o.type == 'MESH': hull_of(o, S.line_w((Vector(SHIP) - S.CAMC).length))
# two water cannons (monitors) on the foredeck, in front of the bridge (ship-local units)
mon_m = S.puff_mat('monitor', (0.55, 0.12, 0.10), (0.85, 0.20, 0.14), (1.0, 0.32, 0.2))
NOZ = []
for s_ in (-1, 1):
	base = MW @ Vector((s_ * 0.55, ymin + 0.95, 1.38))
	bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.30 * sc_k, depth=0.7 * sc_k, location=base + Vector((0, 0, 0.35 * sc_k)))
	c_ = bpy.context.object; c_.data.materials.append(mon_m); hull_of(c_, S.line_w((base - S.CAMC).length) * 0.8)
	NOZ.append(base + Vector((0, 0, 0.75 * sc_k)))

# ------------------------------------------------------------------ the two water cannons (fix round 18.10 night: the spray read as outlined
# soap bubbles popping in 3–4 frames). Each monitor shoots ONE continuous bright jet along the whole arc: a solid stream (white
# core, light-blue rim, thin blue outline) that flares a little and then tapers to a point just short of the lava, wrapped in
# a fine spray of small droplets WITHOUT ink outlines that peel off the jet's second half, drift outward and shrink smoothly to
# nothing by the impact (a droplet is size 0 whenever it recycles and ramps over ≥ 9 frames: nothing pops); the steam boils
# up where the water lands.
water_m, wt, wo = new_mat('water')
lwn = node(wt, 'ShaderNodeLayerWeight'); lwn.inputs['Blend'].default_value = 0.5
EMIT(wt, RAMP(wt, lwn.outputs['Facing'], [(0.0, (0.97, 1.0, 1.0)), (float(arg('rim', 0.34)), (0.50, 0.82, 1.0))]), wo)
jink_m = flat_mat('jet_ink', (0.05, 0.25, 0.58))
jink_m.use_backface_culling = True
drop_m, dt_, do_ = new_mat('drop')
dband, _ = toon(dt_, (0.52, 0.80, 1.0), (0.80, 0.94, 1.0), (0.97, 1.0, 1.0))
EMIT(dt_, dband, do_)
S_END = float(arg('stream', 0.9))              # the solid stream reaches 90 % of the arc, then only spray and steam
def arc_pt(p0, p1, apex, s):
	return p0.lerp(p1, s) + Vector((0, 0, 4 * apex * s * (1 - s)))
def stream_r(r0, u):
	"""stream radius along the stream (u 0 … 1): r0 at the nozzle, flaring to 1.7 r0, tapering smoothly to a point"""
	fl = 1 + 0.7 * smooth01(u / 0.5)
	tp = 1.0 if u < 0.5 else math.cos((u - 0.5) / 0.5 * math.pi / 2) ** 0.75
	return r0 * fl * tp
def smooth01(x):
	x = min(1.0, max(0.0, x)); return x * x * (3 - 2 * x)
def jet(name, p0, p1, apex, r0, rd, nseg=64, nsid=16, ndrop=110, seed=0):
	# --- the solid stream (+ its own thin outline, whose width shrinks with the radius toward the tip: no dark blob)
	bm = bmesh.new(); bmi = bmesh.new()
	pts = [arc_pt(p0, p1, apex, S_END * k / nseg) for k in range(nseg + 1)]
	rings, irings = [], []
	for k, p in enumerate(pts):
		tg = (pts[min(nseg, k + 1)] - pts[max(0, k - 1)]).normalized()
		a = tg.cross(Vector((0, 0, 1))).normalized(); b = a.cross(tg).normalized()
		r = max(stream_r(r0, k / nseg), 1e-5)
		w = min(S.line_w((p - S.CAMC).length) * 0.75, 0.45 * r)
		dirs = [a * math.cos(2 * math.pi * j / nsid) + b * math.sin(2 * math.pi * j / nsid) for j in range(nsid)]
		rings.append([bm.verts.new(p + d * r) for d in dirs])
		irings.append([bmi.verts.new(p + d * (r + w)) for d in dirs])
	for B_, R_ in ((bm, rings), (bmi, irings)):
		for k in range(nseg):
			for j in range(nsid):
				B_.faces.new((R_[k][j], R_[k + 1][j], R_[k + 1][(j + 1) % nsid], R_[k][(j + 1) % nsid]))
		bmesh.ops.recalc_face_normals(B_, faces=B_.faces)
	bmesh.ops.reverse_faces(bmi, faces=bmi.faces)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool)); me.materials.append(water_m)
	o = S.link_obj(bpy.data.objects.new(name, me)); o.visible_shadow = False
	mi = bpy.data.meshes.new(name + '_ink'); bmi.to_mesh(mi); bmi.free(); mi.materials.append(jink_m)
	h = S.link_obj(bpy.data.objects.new(name + '_ink', mi)); h.visible_shadow = False
	# --- the spray: ndrop droplets cycling along the arc (0.9 s per trip) from the jet's surface on its second half to the impact
	rng_ = np.random.default_rng(40 + seed)
	sm_ = S.sph.copy(); sm_.name = name + '_drop'; sm_.materials.append(drop_m)
	tg0 = (p1 - p0); tg0.z = 0; tg0.normalize(); side = Vector((-tg0.y, tg0.x, 0))
	TRIP = 0.9; s_a = 0.32
	for i in range(ndrop):
		ph = (i + rng_.random() * 0.9) / ndrop
		ang = rng_.random() * 2 * math.pi; spr = 0.35 + 0.65 * rng_.random()
		rs = 0.45 + 0.75 * rng_.random() ** 1.6
		d = S.link_obj(bpy.data.objects.new(f'{name}_d{i}', sm_)); d.visible_shadow = False
		for f in range(1, S.NF + 1):
			t = S.t_of(f)
			q = (ph + (t - T0) / TRIP) % 1.0
			s = s_a + (1 - s_a) * q
			c = arc_pt(p0, p1, apex, s)
			# leave the jet's surface, then drift outward (spray cone) and sag a little under gravity
			rad_j = stream_r(r0, min(1.0, s / S_END)) if s < S_END else 0.0
			off = rad_j + spr * 0.024 * q ** 1.2
			c = c + side * (math.cos(ang) * off) + Vector((0, 0, math.sin(ang) * off * 0.6 - 0.006 * q * q))
			env = smooth01(q / 0.16) * smooth01((1 - q) / 0.45)        # ≥ 0.14 s (9 frames) in, 0.4 s out
			rad = max(1e-5, rd * rs * env)
			d.location = c; d.scale = (rad, rad, rad)
			d.keyframe_insert('location', frame=f); d.keyframe_insert('scale', frame=f)
		linear_keys(d)
	return o
JR0, JRD = float(arg('jr0', 0.0026)), float(arg('jrd', 0.0028))
APEX = float(arg('apex', 0.05))
jet('jet1', NOZ[1], J1 + Vector((0, 0, 0.004)), APEX * 1.1, JR0, JRD, seed=1)
jet('jet2', NOZ[0], J2 + Vector((0, 0, 0.004)), APEX, JR0, JRD, seed=2)

# ------------------------------------------------------------------ steam: big cartoon cumulus where the water lands + along the hot front
steam_m = S.puff_mat('steam', (0.70, 0.70, 0.86), (0.92, 0.90, 0.95), (1.0, 0.98, 0.93), J1.z, under=(1.0, 0.62, 0.30), under_h=0.02)
STH = float(arg('steam_h', 0.17)); SR = float(arg('steam_r', 0.032))
WIND = (float(arg('wx', 0.10)), float(arg('wy', -0.28)))
S.puff_column('steamA', J1 + Vector((0, 0, 0.004)), STH, SR * 0.25, SR, 30, WIND, steam_m, rise=0.15, bend=1.25, spread=0.8)
S.puff_column('steamB', J2 + Vector((0, 0, 0.004)), STH * 0.85, SR * 0.22, SR * 0.85, 26, WIND, steam_m, rise=0.16, bend=1.25, spread=0.8)
S.puff_column('steamC', F + Vector((0.01, -0.02, 0.004)), STH * 0.6, SR * 0.2, SR * 0.6, 16, WIND, steam_m, rise=0.2, bend=1.25, spread=0.8)

# ------------------------------------------------------------------ town (real built-up area from the imagery)
S.houses()

# ------------------------------------------------------------------ flat illustrated clouds low over the sea ahead (warm, toon, static)
cloud_m = S.puff_mat('cloud', (0.72, 0.42, 0.72), (0.9, 0.58, 0.78), (1.0, 0.78, 0.8))
rngc = np.random.default_rng(5)
camdir = (L0 - C0); camdir.z = 0; camdir.normalize(); sidev = Vector((-camdir.y, camdir.x, 0))
for ci, (off, alt_, lat_) in enumerate(((10.0, 1.05, -1.9), (13.0, 1.75, 1.2), (11.5, 0.85, 2.6))):
	cc0 = C0 + camdir * off + sidev * lat_; cc0.z = alt_
	sm_ = S.sph.copy(); sm_.materials.append(cloud_m)
	for k in range(6):
		o = S.link_obj(bpy.data.objects.new(f'cloud{ci}_{k}', sm_)); o.visible_shadow = False
		r_ = 0.12 + 0.12 * rngc.random()
		o.location = cc0 + sidev * ((k - 2.5) * 0.2 + rngc.normal() * 0.05) + Vector((0, 0, rngc.random() * 0.08))
		o.scale = (r_ * 1.6, r_ * 1.6, r_ * 0.6)

# ------------------------------------------------------------------ tracks / render
if arg('track'):
	S.track({'front': F + Vector((0, 0, 0.003)), 'frontOpp': P(*G['frontOpp'], 0.003), 'ship': SHIP.to_3d() + Vector((0, 0, 0.01)),
	         'harbour': P(*HARBOUR_LL), 'jet1': J1, 'jet2': J2}, arg('track'))
	sys.exit(0)
S.render()
