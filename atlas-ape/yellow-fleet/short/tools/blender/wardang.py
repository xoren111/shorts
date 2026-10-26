"""S14 «Round three: a rabbit virus, locked on an island.» — toon Wardang Island (Spencer Gulf, SA, 1995) in a blue sea: red-sand
plateau with saltbush, a beach and shallows, a jetty with a boat. High wide shot first («Round three:»), then the camera swoops
down to the quarantine compound: a wire pen with rabbits, prefab lab huts; on «virus» a big violet virus pops up over a pedestal in
the pen, on «locked» the gate swings shut and a golden padlock drops onto it; on «on an island» the camera pulls back up to the
whole island with sea all round. Replaces the real 2019 aerial photo (owner 19.10: «too long, unclear, why»).
  tools/blender/run.sh tools/blender/wardang.py -- [--frames 1,80] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
from shots_t import SHOT
T0, T1 = SHOT('wardang')
setup(T0, T1)
world(SKY_GOLD); sun(4.2, (1.0, 0.9, 0.72), (50, 0, 30))

# ------------------------------------------------------------------ sea + distant mainland (Yorke Peninsula) on the horizon
m = bpy.data.materials.new('sea'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry')
wave = node(nt, 'ShaderNodeTexWave'); wave.inputs['Scale'].default_value = 0.09; wave.inputs['Distortion'].default_value = 9
wave.inputs['Detail'].default_value = 1.0
link(nt, g.outputs['Position'], wave.inputs['Vector'])
EMIT(nt, MIX(nt, M(nt, 'GREATER_THAN', wave.outputs['Fac'], 0.9), C('#3d63c9'), C('#5f86e0')), out)
prim('plane', 'sea', m, (0, 0, -0.15), (900, 900, 1), smooth_=False)
prim('sphere', 'mainland', toon_mat('mainland', C('#c27a46')), (40, 260, -8), (400, 30, 12), ink=0.0)

# ------------------------------------------------------------------ the island: shallows ring, beach, red plateau (extruded blobs)
def blob(name, R, z0, z1, mat, k=1.0, ink=None, n=120):
	bm = bmesh.new()
	vs = []
	for i in range(n):
		a = i / n * math.tau
		r = R * k * (1 + 0.16 * math.sin(2 * a + 0.7) + 0.09 * math.sin(3 * a + 2.1) + 0.05 * math.sin(5 * a + 0.4) + 0.025 * math.sin(9 * a + 1.0))
		vs.append(bm.verts.new((r * math.cos(a) * 0.58, r * math.sin(a), z0)))
	f = bm.faces.new(vs)
	if z1 > z0:
		ext = bmesh.ops.extrude_face_region(bm, geom=[f])
		for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]:
			v.co.z = z1
		bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	o = obj_from_mesh(name, me, mat)
	if ink: outline(o, ink)
	return o
R_ISL = 20.0
blob('shallows', R_ISL, -0.03, -0.03, toon_mat('shallows', C('#5fd0c8'), flat=True), k=1.2)
blob('beach', R_ISL, -0.6, 0.12, toon_mat('beach', C('#ecd29a')), k=1.07, ink=0.08)
gm_ = ground('isl_mat', 2, cols=(C('#c8693a'), C('#a9502a'), C('#d9a35a')), scale=0.12)
isl_mat = gm_.data.materials[0]; bpy.data.objects.remove(gm_)
blob('plateau', R_ISL, -0.6, 0.3, isl_mat, k=1.0, ink=0.08)
SALT = {'grass': C('#8e9f6a'), 'leafsGreen': C('#7f9a63')}
rng = np.random.default_rng(5)
kk = 0
while kk < 70:
	a = rng.uniform(0, math.tau); r = rng.uniform(0, 0.88) ** 0.5 * R_ISL * 0.9
	x, y = r * math.cos(a) * 0.55, r * math.sin(a)
	if -9.0 < x < 8.0 and -14.0 < y < 4.5: continue
	m_ = ['plant_bush.glb', 'plant_bushLarge.glb', 'plant_bushSmall.glb'][rng.integers(3)]
	import_model(NK + m_, rng.uniform(2.0, 3.6), (x, y, 0.3), (0, 0, rng.uniform(0, 360)), ink=0.012, tint=SALT)
	kk += 1
# jetty + boat on the south shore
prim('cube', 'jetty', toon_mat('plank', C('#9a6a42')), (13.5, 5.0, 0.25), (3.2, 0.6, 0.08), smooth_=False, ink=0.04)
for k in range(4):
	prim('cyl', f'pile{k}', toon_mat('pile', C('#6b4126')), (12.0 + (k // 2) * 2.8, 4.5 + (k % 2) * 1.0, -0.2), (0.08, 0.08, 0.45), seg=8, ink=0.03)
import_model('kenney-watercraft-kit/Models/FBX format/boat-fishing-small.fbx', 1.4, (16.8, 3.4, 0.0), (0, 0, -10), ink=0.05)

# ------------------------------------------------------------------ the quarantine compound (centre ≈ (0, -2))
Z = 0.3
PX0, PX1, PY0, PY1 = -3.2, 3.2, -4.2, 0.2
GATE = 0.7
netting('pen_fl', (PX0, PY0, Z), (-GATE, PY0, Z), h=0.85, post_gap=1.6, cell=0.15)
netting('pen_fr', (GATE, PY0, Z), (PX1, PY0, Z), h=0.85, post_gap=1.6, cell=0.15)
netting('pen_r', (PX1, PY0, Z), (PX1, PY1, Z), h=0.85, post_gap=1.6, cell=0.15)
netting('pen_b', (PX1, PY1, Z), (PX0, PY1, Z), h=0.85, post_gap=1.6, cell=0.15)
netting('pen_l', (PX0, PY1, Z), (PX0, PY0, Z), h=0.85, post_gap=1.6, cell=0.15)
gate, _, _ = netting('gate', (0, 0, 0), (2 * GATE, 0, 0), h=0.85, post_gap=2 * GATE, cell=0.15)
gate.location = (-GATE, PY0, Z)
prim('cube', 'pen_floor', toon_mat('penfloor', C('#d79a5c')), (0, (PY0 + PY1) / 2, Z + 0.005), (PX1 - 0.05, (PY1 - PY0) / 2 - 0.05, 0.004), smooth_=False)
# rabbits in the pen
pts = []
for k in range(14):
	while True:
		x, y = rng.uniform(PX0 + 0.4, PX1 - 0.4), rng.uniform(PY0 + 0.4, PY1 - 0.4)
		if math.hypot(x, y + 2.0) > 1.1: break
	pts.append((x, y, Z, rng.uniform(0, math.tau)))
rabbit_crowd(pts, s=1.5, ink_w=0.014, lod=0.6)
# pedestal + the virus (big, violet, glowing; pops on «virus»)
prim('cyl', 'pedestal', toon_mat('pedestal', C('#f4f1ea')), (0, -2.0, Z + 0.3), (0.35, 0.35, 0.3), seg=24, ink=0.025)
prim('cyl', 'pedtop', toon_mat('pedtop', C('#c9b8ff'), flat=True), (0, -2.0, Z + 0.61), (0.3, 0.3, 0.01), seg=24)
virus = empty('virus', (0, -2.0, Z + 1.75))
vcore = toon_mat('vcore', C('#9B4DFF'), bands=((0.62, 0.5, 0.86), (0.9, 0.84, 1.0), (1.0, 1.0, 1.0)))
vknob = toon_mat('vknob', C('#E9C6FF'), flat=True); vstem = toon_mat('vstem', C('#C77DFF'), flat=True)
prim('sphere', 'v_core', vcore, (0, 0, 0), (0.75, 0.75, 0.75), ink=0.04, parent=virus, u=32, v=24)
prim('sphere', 'v_hl', toon_mat('vhl', C('#D9B3FF'), flat=True), (-0.28, -0.6, 0.3), (0.16, 0.06, 0.13), parent=virus)
NK_ = 18
for k in range(NK_):
	yv = 1 - 2 * (k + 0.5) / NK_; rr = math.sqrt(1 - yv * yv); ph_ = k * 2.39996
	d = Vector((math.cos(ph_) * rr, math.sin(ph_) * rr, yv))
	st = prim('cyl', f'v_stem{k}', vstem, d * 0.86, (0.05, 0.05, 0.16), seg=8, parent=virus)
	st.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
	prim('sphere', f'v_knob{k}', vknob, d * 1.05, (0.13, 0.13, 0.13), ink=0.12, parent=virus, u=12, v=8)
# prefab lab huts + water tank
hutw = toon_mat('hutw', C('#f4f1ea')); hutb = toon_mat('hutb', C('#3d63c9')); dark = toon_mat('dark', C('#2a1820'), flat=True)
for k, (x, y, rz) in enumerate(((-6.2, -1.6, 90), (-6.0, 2.0, 90), (5.6, 2.4, 0))):
	h_ = empty(f'hut{k}', (x, y, Z)); h_.rotation_euler = (0, 0, math.radians(rz))
	prim('cube', f'hut{k}_b', hutw, (0, 0, 0.55), (1.6, 0.8, 0.55), smooth_=False, ink=0.03, parent=h_)
	prim('cube', f'hut{k}_r', hutb, (0, 0, 1.13), (1.66, 0.86, 0.05), smooth_=False, ink=0.03, parent=h_)
	prim('cube', f'hut{k}_s', hutb, (0, -0.81, 0.15), (1.6, 0.01, 0.06), smooth_=False, parent=h_)
	prim('cube', f'hut{k}_d', dark, (0.9, -0.81, 0.45), (0.22, 0.01, 0.42), smooth_=False, parent=h_)
	for wx in (-0.9, -0.3):
		prim('cube', f'hut{k}_w{wx}', toon_mat('glassw', C('#9fd3e6'), flat=True), (wx, -0.81, 0.68), (0.2, 0.01, 0.16), smooth_=False, parent=h_)
prim('cyl', 'tank', toon_mat('tank', C('#c9ced6')), (5.2, -1.4, Z + 0.8), (0.6, 0.6, 0.8), seg=24, ink=0.03)
prim('cyl', 'tanktop', toon_mat('tank', C('#c9ced6')), (5.2, -1.4, Z + 1.65), (0.62, 0.62, 0.06), seg=24, r2=0.3, ink=0.02)
# warning sign by the gate: the violet virus emblem on a white board (no text)
sign = empty('sign', (-1.7, PY0 - 0.35, Z))
prim('cyl', 'sign_post', toon_mat('post', (0.50, 0.31, 0.17)), (0, 0, 0.45), (0.04, 0.04, 0.45), seg=8, ink=0.012, parent=sign)
prim('cube', 'sign_board', toon_mat('signw', C('#fbf6ee')), (0, -0.03, 0.95), (0.36, 0.02, 0.3), smooth_=False, ink=0.02, parent=sign)
prim('cube', 'sign_border', toon_mat('signr', C('#e2342d'), flat=True), (0, -0.045, 0.95), (0.33, 0.004, 0.27), smooth_=False, parent=sign)
prim('cube', 'sign_inner', toon_mat('signw', C('#fbf6ee')), (0, -0.05, 0.95), (0.29, 0.004, 0.23), smooth_=False, parent=sign)
prim('cyl', 'sign_glyph', toon_mat('vcoreflat', C('#9B4DFF'), flat=True), (0, -0.055, 0.95), (0.13, 0.13, 0.004), seg=24, rot=(math.pi / 2, 0, 0), parent=sign)
for k in range(8):
	a = k / 8 * math.tau
	prim('cyl', f'sign_k{k}', toon_mat('vcoreflat', C('#9B4DFF'), flat=True), (math.cos(a) * 0.17, -0.056, 0.95 + math.sin(a) * 0.17), (0.035, 0.035, 0.004), seg=12, rot=(math.pi / 2, 0, 0), parent=sign)
# the padlock (drops onto the gate's latch on «locked»)
lock = empty('lock')
goldm = toon_mat('gold', C('#FFC83A'))
lb = prim('cube', 'lock_body', goldm, (0, 0, 0), (0.26, 0.1, 0.22), smooth_=True, ink=0.06, parent=lock)
bv = lb.modifiers.new('bevel', 'BEVEL'); bv.width = 0.25; bv.segments = 4
lb.modifiers.move(len(lb.modifiers) - 1, 0)
bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.045, location=(0, 0, 0))
sh = bpy.context.object; sh.name = 'lock_shackle'; sh.parent = lock; sh.location = (0, 0, 0.22); sh.rotation_euler = (math.pi / 2, 0, 0)
sh.data.materials.append(toon_mat('steel', C('#d9d6e6'))); outline(sh, 0.025)
prim('cyl', 'lock_hole', dark, (0, -0.105, -0.02), (0.045, 0.045, 0.01), seg=16, rot=(math.pi / 2, 0, 0), parent=lock)
prim('cube', 'lock_slot', dark, (0, -0.105, -0.09), (0.02, 0.01, 0.06), smooth_=False, parent=lock)
LOCK_AT = Vector((GATE, PY0 - 0.12, Z + 0.55))

cam = camera(30)
T_SWOOP = W(75) - 0.25        # «a»
T_VIRUS = W(77) - 0.12        # «virus»
T_LOCK = W(78) + 0.02         # «locked»
T_BACK = W(80) - 0.1          # «an island»
def seg(t, a, b):
	return ease((t - a) / (b - a))
def update(t):
	# camera: high wide → swoop to the pen → hold → pull back to the whole island
	P0, P1 = (0, -27, 60), (0, -25, 55)
	P2, P3 = (2.2, -11.5, 6.4), (1.9, -10.6, 6.0)
	P4 = (0, -24, 54)
	A0, A2 = (0, -1.5, 0), (0, -2.4, 1.0)
	if t < T_SWOOP:
		pos = vlerp(P0, P1, clamp01((t - T0) / (T_SWOOP - T0))); tgt = Vector(A0)
	elif t < T_LOCK + 0.35:
		k = seg(t, T_SWOOP, T_VIRUS + 0.45)
		pos = vlerp(P1, P2, k).lerp(Vector(P3), clamp01((t - T_VIRUS - 0.45) / (T_LOCK + 0.35 - T_VIRUS - 0.45))); tgt = vlerp(A0, A2, k)
	else:
		k = seg(t, max(T_LOCK + 0.35, T_BACK - 0.2), T1 - 0.1)
		pos = vlerp(P3, P4, k); tgt = vlerp(A2, A0, k)
	look(cam, pos, tgt)
	# the virus pops on «virus», then floats and turns
	vk = clamp01((t - T_VIRUS) / 0.3)
	s_ = 0.0 if t < T_VIRUS else (1 + 0.35 * math.sin(vk * math.pi)) if vk < 1 else 1.0
	virus.scale = (s_, s_, s_)
	virus.location = (0, -2.0, Z + 1.75 + 0.08 * math.sin(t * 3))
	virus.rotation_euler = (0.3, 0, (t - T0) * 0.9)
	# the gate swings shut, the padlock drops onto the latch
	gk = ease((t - T_LOCK) / 0.22)
	gate.rotation_euler = (0, 0, math.radians(lerp(-95, 0, gk)))
	lk = clamp01((t - T_LOCK - 0.12) / 0.2)
	if t < T_LOCK + 0.12:
		lock.location = (0, 0, -20)
	else:
		bounce = 0.06 * math.sin(clamp01((t - T_LOCK - 0.32) / 0.25) * math.pi) if t > T_LOCK + 0.32 else 0.0
		lock.location = LOCK_AT + Vector((0, 0, (1 - easeIn(lk)) * 1.6 + bounce))
		sq = 1 - 0.18 * math.sin(clamp01((t - T_LOCK - 0.32) / 0.18) * math.pi) if t > T_LOCK + 0.32 else 1.0
		lock.scale = (1.0 / sq ** 0.5 * 1.6, 1.6, sq * 1.6)

render(update, 'wardang')
