"""S1 / S2 — the ship. --variant eng (default): English quay at violet dusk, 13 rabbits hop up the gangplank into a crate on deck
(«Thirteen rabbits got on a ship, family records say.»). --variant mel: same set in warm Melbourne light, the crate slides down
the gangplank on a rope and its lid lifts a crack on a packed crowd of ears («Twenty-four got off.»). No rabbit runs loose.
  tools/blender/run.sh tools/blender/dock.py -- [--variant mel] [--frames 1,60] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
import kit

VAR = arg('variant', 'eng')
XF = 0.4
if VAR == 'eng':
	setup(0.0, W(9) - 0.3 + XF + 0.05)
else:
	setup(W(9) - 0.3, W(12) - 0.25 + XF + 0.05)
T0, T1 = kit.T0, kit.T1

# ------------------------------------------------------------------ sky, light
if VAR == 'eng':
	world(SKY_DUSK)
	sun(3.6, (1.0, 0.84, 0.64), (62, 0, -38))
else:
	world(SKY_GOLD)
	sun(4.4, (1.0, 0.92, 0.72), (50, 0, 30))

# ------------------------------------------------------------------ sea (flat toon, slow wave bands)
m = bpy.data.materials.new('sea'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (600, 0))
tc = node(nt, 'ShaderNodeTexCoord'); wave = node(nt, 'ShaderNodeTexWave', (-300, 0)); wave.inputs['Scale'].default_value = 0.35
wave.inputs['Distortion'].default_value = 6; link(nt, tc.outputs['Object'], wave.inputs['Vector'])
SEA = (0.20, 0.27, 0.66) if VAR == 'eng' else (0.22, 0.42, 0.78)
SEA2 = (0.30, 0.40, 0.80) if VAR == 'eng' else (0.40, 0.62, 0.92)
bandv = M(nt, 'GREATER_THAN', wave.outputs['Fac'], 0.82)
EMIT(nt, MIX(nt, bandv, SEA, SEA2), out)
sea = prim('plane', 'sea', m, (0, 0, 0.35), (400, 400, 1), smooth_=False)

# ------------------------------------------------------------------ quay: Kenney dock platforms in a row + a stone edge
for k in range(-6, 7):
	import_model('kenney-pirate-kit/Models/GLB format/structure-platform-dock.glb', 1.0, (k * 2.5, -1.75, 0), ink=0.015)
# the rest of the quay: one flat plank floor (toon wood with plank seams)
mq = bpy.data.materials.new('quay'); mq.use_nodes = True; tq = mq.node_tree; tq.nodes.clear()
oq = node(tq, 'ShaderNodeOutputMaterial', (600, 0)); tcq = node(tq, 'ShaderNodeNewGeometry')
wq = node(tq, 'ShaderNodeTexWave', (-300, 0)); wq.wave_type = 'BANDS'; wq.bands_direction = 'X'; wq.inputs['Scale'].default_value = 2.6
link(tq, tcq.outputs['Position'], wq.inputs['Vector'])
seamq = M(tq, 'LESS_THAN', wq.outputs['Fac'], 0.06)
EMIT(tq, MIX(tq, 1.0, MIX(tq, seamq, (0.55, 0.30, 0.21), (0.30, 0.15, 0.10)), toon(tq), 'MULTIPLY'), oq)
prim('cube', 'quayfloor', mq, (0, -12.0, 0.65), (20, 9.0, 0.65), smooth_=False)
# barrels + a coil of crates for dressing
for x, y in ((-2.6, -2.2), (-2.0, -2.7), (3.9, -3.4), (4.5, -3.0)):
	import_model('kenney-pirate-kit/Models/GLB format/barrel.glb', 0.5, (x, y, 1.31), ink=0.012)
import_model('kenney-pirate-kit/Models/GLB format/crate.glb', 0.8, (2.9, -3.9, 1.31), (0, 0, 20), ink=0.012)

# ------------------------------------------------------------------ the ship (Kenney merchant ship, long axis along X)
ship, _ = import_model('kenney-pirate-kit/Models/GLB format/ship-large.glb', 1.0, (1.6, 3.25, 0.0), (0, 0, 90), ink=0.03)
DECK = 2.12
# gangplank: from the quay edge up over the rail onto the deck
GP0 = Vector((0.0, -0.55, 1.31)); GP1 = Vector((0.0, 1.55, DECK + 0.12))
mid = (GP0 + GP1) / 2; dv = GP1 - GP0
plank = prim('cube', 'gangplank', toon_mat('wood', (0.62, 0.40, 0.22)), mid, (0.36, dv.length / 2, 0.035), smooth_=False, ink=0.015)
plank.rotation_euler = (math.atan2(dv.z, dv.y), 0, 0)
for s in (-1, 1):   # rope rails
	r = prim('cyl', f'rail{s}', toon_mat('rope', (0.85, 0.72, 0.48)), mid + Vector((s * 0.36, 0, 0.45)), (0.018, 0.018, dv.length / 2), ink=0.008)
	r.rotation_euler = (math.atan2(dv.z, dv.y) - math.pi / 2, 0, 0)

# ------------------------------------------------------------------ crate (own: open box + hinged lid, plank lines)
def crate(name, loc, hinge_far=False):
	mw = bpy.data.materials.new('crate'); mw.use_nodes = True; t = mw.node_tree; t.nodes.clear()
	o_ = node(t, 'ShaderNodeOutputMaterial', (600, 0)); tc_ = node(t, 'ShaderNodeTexCoord')
	wv = node(t, 'ShaderNodeTexWave', (-300, 0)); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 2.2
	link(t, tc_.outputs['Object'], wv.inputs['Vector'])
	line = M(t, 'LESS_THAN', wv.outputs['Fac'], 0.1)
	base = MIX(t, line, (0.74, 0.50, 0.27), (0.42, 0.25, 0.13))
	EMIT(t, MIX(t, 1.0, base, toon(t), 'MULTIPLY'), o_)
	root = empty(name, loc)
	L, Wd, H, th = 1.1, 0.8, 0.62, 0.05
	prim('cube', name + '_bot', mw, (0, 0, th / 2), (L / 2, Wd / 2, th / 2), smooth_=False, ink=0.012, parent=root)
	for s in (-1, 1):
		prim('cube', f'{name}_sx{s}', mw, (s * (L / 2 - th / 2), 0, H / 2), (th / 2, Wd / 2, H / 2), smooth_=False, ink=0.012, parent=root)
		prim('cube', f'{name}_sy{s}', mw, (0, s * (Wd / 2 - th / 2), H / 2), (L / 2, th / 2, H / 2), smooth_=False, ink=0.012, parent=root)
	sgn = 1 if hinge_far else -1
	hinge = empty(name + '_hinge', (0, sgn * Wd / 2, H), parent=root)
	prim('cube', name + '_lid', mw, (0, -sgn * Wd / 2, th / 2), (L / 2 + 0.02, Wd / 2 + 0.02, th / 2), smooth_=False, ink=0.012, parent=hinge)
	return root, hinge

if VAR == 'eng':
	CR = Vector((0.0, 2.35, DECK))
	crate_root, lid = crate('crate', CR)
	lid.rotation_euler = (math.radians(-118), 0, 0)      # lid swung open towards the gangplank
	crate_root.rotation_euler = (0, 0, 0)
else:
	CR0 = Vector((0.0, 2.35, DECK))
	crate_root, lid = crate('crate', CR0)        # same crate, same spot as in England; the lid flips open towards the gangplank

# ------------------------------------------------------------------ background: town silhouette + clouds
if VAR == 'eng':
	for k, (x, y, rot) in enumerate(((-16, 26, 10), (-9, 30, -6), (12, 32, 4), (19, 27, -12), (-22, 34, 0))):
		import_model('kenney-fantasy-town-kit/Models/GLB format/' + ('wall-window-round.glb' if k % 2 else 'wall-door.glb'), 3.0, (x, y, 0.3), (0, 0, rot), ink=0.05)
	cloud('cl1', (-14, 60, 26), 5.0, seed=3, ink=0.12); cloud('cl2', (16, 70, 32), 6.5, seed=5, ink=0.14); cloud('cl3', (34, 80, 20), 4.5, seed=8, ink=0.11)
else:
	for k, (x, y) in enumerate(((-15, 28), (-8, 34), (14, 30), (22, 36))):
		import_model('kenney-nature-kit/Models/GLTF format/tree_palmTall.glb', 4.0, (x, y, 0.3), (0, 0, k * 40), ink=0.05)
	cloud('cl1', (-12, 70, 30), 6.0, seed=13, ink=0.13); cloud('cl2', (20, 80, 38), 7.5, seed=17, ink=0.15)

# ------------------------------------------------------------------ rabbits
NR = 13
path = [Vector((6.5, -2.05, 1.31)), Vector((0.9, -1.75, 1.31)), Vector((0.0, -0.9, 1.31)), GP0, GP1, Vector((0, 2.0, DECK)), Vector((0, 2.3, DECK + 0.55))]
seg = [(path[i + 1] - path[i]).length for i in range(len(path) - 1)]
LTOT = sum(seg)
def at(sv):
	sv = max(0.0, min(LTOT - 1e-4, sv))
	for i, L in enumerate(seg):
		if sv <= L:
			p = path[i].lerp(path[i + 1], sv / L)
			return p, (path[i + 1] - path[i]).normalized()
		sv -= L
	return path[-1], (path[-1] - path[-2]).normalized()

rabbits = []
if VAR == 'eng':
	for k in range(NR):
		P = rabbit_parts(f'r{k}', ink_w=0.012)
		rabbits.append(P)
SP = 1.6            # m/s along the path
GAP = 0.52
def pose_rabbit(P, sv, t, k):
	p, d = at(sv)
	yaw = math.atan2(-d.x, d.y)
	pitch = math.asin(max(-1, min(1, d.z)))
	z, sq = hop(t + k * 0.11, 0.30, 0.13)
	root = P['root']
	if sv >= LTOT - 0.05:       # dropped into the crate
		root.hide_render = True; return
	root.hide_render = False
	drop = 0.0
	if sv > LTOT - 0.75:        # last hop arcs over the crate wall and drops in
		u = (sv - (LTOT - 0.75)) / 0.7
		drop = -0.95 * max(0, u - 0.45) / 0.55
	root.location = p + Vector((0, 0, z + drop))
	root.rotation_euler = (pitch * 0.8, 0, yaw)
	root.scale = (1 / math.sqrt(sq), 1 / math.sqrt(sq), sq)
	for s in (-1, 1):
		P[f'ear{s}'].rotation_euler = (math.radians(-12 - 18 * (sq - 1) * 6), math.radians(s * 14), 0)

# Melbourne: 24 rabbits stream out of the crate, down the gangplank and along the quay (mirror of the English shot)
NOUT = 24
stream = []
if VAR == 'mel':
	pdown = [Vector((0, 2.3, DECK + 0.55)), Vector((0, 2.0, DECK)), GP1, GP0, Vector((0.0, -0.9, 1.31)), Vector((0.9, -1.75, 1.31)), Vector((6.5, -2.05, 1.31)), Vector((12.0, -2.2, 1.31))]
	segd = [(pdown[i + 1] - pdown[i]).length for i in range(len(pdown) - 1)]
	def atd(sv):
		sv = max(0.0, sv)
		for i, L in enumerate(segd):
			if sv <= L:
				return pdown[i].lerp(pdown[i + 1], sv / L), (pdown[i + 1] - pdown[i]).normalized()
			sv -= L
		return pdown[-1], (pdown[-1] - pdown[-2]).normalized()
	for k in range(NOUT):
		stream.append(rabbit_parts(f'm{k}', ink_w=0.012))
cam = camera(24)
CAM_A = ((-1.6, -3.6, 2.6), (0.4, 1.0, 1.40))
CAM_B = ((-1.35, -3.3, 2.62), (0.35, 1.1, 1.48))

def update(t):
	if VAR == 'eng':
		for k, P in enumerate(rabbits):
			# rabbit 0 reaches the crate at t ≈ 1.0 s; the line keeps GAP between rabbits (the last ones are still hopping at the cut)
			sv = LTOT - SP * (1.0 - t) - k * GAP
			pose_rabbit(P, sv, t, k)
		# camera: slow push-in and rise along the queue towards the gangplank
		u = ease((t - T0) / (T1 - T0))
		if arg('cam'):
			c = [float(x) for x in arg('cam').split(',')]; cam.data.lens = c[6] if len(c) > 6 else cam.data.lens
			look(cam, c[0:3], c[3:6])
		else:
			look(cam, vlerp(CAM_A[0], CAM_B[0], u), vlerp(CAM_A[1], CAM_B[1], u))
	else:
		# the lid flips open, then the rabbits pour out one every 0.085 s and hop down to the quay
		lk = easeOut((t - (T0 + 0.1)) / 0.3)
		lid.rotation_euler = (math.radians(-118 * lk), 0, 0)
		for k, P in enumerate(stream):
			tk = T0 + 0.28 + k * 0.078
			lane = 0.15 if k % 2 else -0.15
			root = P['root']
			if t < tk:
				root.hide_render = True
				for c in root.children_recursive: c.hide_render = True
				continue
			for c in root.children_recursive: c.hide_render = False
			root.hide_render = False
			sv = (t - tk) * 2.6
			p, d = atd(sv)
			side = Vector((d.y, -d.x, 0)).normalized() if abs(d.x) + abs(d.y) > 1e-3 else Vector((1, 0, 0))
			p = p + side * lane * clamp01((sv - 0.5) / 0.4)
			z, sq = hop(t + k * 0.13, 0.28, 0.13)
			pop_up = 0.35 * math.sin(math.pi * clamp01(sv / 0.6)) if sv < 0.6 else 0.0      # the jump out of the crate
			root.location = p + Vector((0, 0, z + pop_up))
			root.rotation_euler = (-math.asin(max(-1, min(1, d.z))) * 0.8 * -1, 0, math.atan2(-d.x, d.y))
			root.scale = (1 / math.sqrt(sq), 1 / math.sqrt(sq), sq)
			for s_ in (-1, 1):
				P[f'ear{s_}'].rotation_euler = (math.radians(-12 - 18 * (sq - 1) * 6), math.radians(s_ * 14), 0)
		v = ease((t - T0) / (T1 - T0))
		if arg('cam'):
			c = [float(x) for x in arg('cam').split(',')]; look(cam, c[0:3], c[3:6])
		else:
			look(cam, vlerp(CAM_B[0], (-1.15, -3.05, 2.64), v), vlerp(CAM_B[1], (0.3, 1.0, 1.5), v))

render(update, f'dock_{VAR}', track={'crate': lambda: crate_root.matrix_world.translation.copy(), 'ship': lambda: ship.matrix_world.translation + Vector((0, 0, 8))})
