"""S3 «Turns out, rabbits can multiply.» — a lesson in the ship's hold: a clever rabbit in glasses at a blackboard teaches the others
to multiply. Coloured chalk on the board: carrot × 2 = two carrots (owner, 19.10); on «multiply» the answer appears and the class
itself multiplies (extra students pop in). Light hold colours so the brown rabbits read. Students sit with their backs to us; a round porthole shows the sea, a lantern sways (owner's idea, 19.10, replaces the
«playing cards» joke).
  tools/blender/run.sh tools/blender/lesson.py -- [--frames 1,80] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
from shots_t import SHOT
T0, T1 = SHOT('lesson')
setup(T0, T1)
world([(0.0, C('#d9c7e8')), (1.0, C('#b6a3cf'))], 1.0)
sun(3.2, (1.0, 0.86, 0.66), (55, 0, -25))

# ------------------------------------------------------------------ the hold: plank floor, back wall, side wall, ceiling beams
def planks(name, loc, size, axis, cols=('#9a6a42', '#5e3a22'), scale=3.2):
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	o_ = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry')
	wv = node(nt, 'ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = axis; wv.inputs['Scale'].default_value = scale
	link(nt, g.outputs['Position'], wv.inputs['Vector'])
	seam = M(nt, 'LESS_THAN', wv.outputs['Fac'], 0.07)
	EMIT(nt, MIX(nt, 1.0, MIX(nt, seam, C(cols[0]), C(cols[1])), toon(nt), 'MULTIPLY'), o_)
	return prim('cube', name, m, loc, size, smooth_=False)
planks('floor', (0.5, 1.0, -0.05), (4.5, 3.5, 0.05), 'X', ('#ead6ab', '#c6a77c'))
planks('backwall', (0.5, 3.4, 1.6), (4.5, 0.08, 1.7), 'Z', ('#a6d3d6', '#7fb0b5'))
planks('leftwall', (-2.7, 1.0, 1.6), (0.08, 3.5, 1.7), 'Z', ('#95c4c9', '#6f9fa5'))
planks('ceiling', (0.5, 1.0, 3.3), (4.5, 3.5, 0.05), 'X', ('#d9b98a', '#b08c60'))
for k, x in enumerate((-1.6, 0.5, 2.6)):
	prim('cube', f'beam{k}', toon_mat('beam', C('#c99460')), (x, 1.0, 3.1), (0.12, 3.5, 0.12), smooth_=False, ink=0.02)
# porthole with the sea
prim('cyl', 'port_ring', toon_mat('brass', C('#ffc23a')), (-1.4, 3.3, 2.0), (0.42, 0.42, 0.06), seg=32, rot=(math.pi / 2, 0, 0), ink=0.02)
sea_m = bpy.data.materials.new('portsea'); sea_m.use_nodes = True; nt = sea_m.node_tree; nt.nodes.clear()
o_ = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry'); sep = SEP(nt, g.outputs['Position'])
EMIT(nt, MIX(nt, M(nt, 'GREATER_THAN', sep['Z'], 2.0), C('#3d63c9'), C('#f2a0c0')), o_)
prim('cyl', 'port_glass', sea_m, (-1.4, 3.27, 2.0), (0.34, 0.34, 0.06), seg=32, rot=(math.pi / 2, 0, 0))
# swaying lantern
lan = empty('lantern_pivot', (1.9, 1.6, 3.0))
prim('cyl', 'lan_chain', toon_mat('iron', C('#3a3048')), (0, 0, -0.25), (0.012, 0.012, 0.25), seg=6, parent=lan)
prim('cyl', 'lan_body', toon_mat('langlow', C('#ffe08a'), flat=True), (0, 0, -0.62), (0.11, 0.11, 0.14), seg=12, ink=0.012, parent=lan)
prim('cyl', 'lan_cap', toon_mat('iron', C('#3a3048')), (0, 0, -0.45), (0.13, 0.13, 0.04), seg=12, r2=0.4, ink=0.01, parent=lan)
# crates and barrels along the walls
import_model('kenney-pirate-kit/Models/GLB format/barrel.glb', 0.55, (-2.2, 2.6, 0), ink=0.012)
import_model('kenney-pirate-kit/Models/GLB format/barrel.glb', 0.5, (-2.25, 1.9, 0), (0, 0, 30), ink=0.012)
import_model('kenney-pirate-kit/Models/GLB format/crate.glb', 0.7, (2.9, 2.7, 0), (0, 0, 10), ink=0.012)

# ------------------------------------------------------------------ blackboard with chalk
BX, BY, BZ = 0.75, 3.28, 1.45
bwood = toon_mat('bframe', C('#7a4a2e')); bgreen = toon_mat('board', C('#1f4a35'), flat=True); chalk = toon_mat('chalk', C('#f4f1e6'), flat=True)
prim('cube', 'board', bgreen, (BX, BY, BZ), (1.25, 0.03, 0.62), smooth_=False, ink=0.02)
for (x, z, sx, sz) in ((0, 0.64, 1.31, 0.05), (0, -0.64, 1.31, 0.05), (-1.28, 0, 0.05, 0.66), (1.28, 0, 0.05, 0.66)):
	prim('cube', f'bframe{x}{z}', bwood, (BX + x, BY - 0.03, BZ + z), (sx, 0.05, sz), smooth_=False, ink=0.012)
prim('cube', 'chalktray', bwood, (BX, BY - 0.09, BZ - 0.68), (1.1, 0.06, 0.02), smooth_=False, ink=0.008)
font = bpy.data.fonts.load(str(ROOT / 'assets/fonts/Anton-Regular.ttf'))
def chalk_text(name, body, x, z, size):
	cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.font = font; cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
	o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o)
	o.location = (BX + x, BY - 0.04, BZ + z); o.rotation_euler = (math.pi / 2, 0, 0); o.data.materials.append(chalk)
	return o
def bunny_doodle(name, x, z, s):
	"""chalk rabbit head: round face + two long ears (flat white shapes on the board)"""
	root = empty(name, (BX + x, BY - 0.035, BZ + z))
	prim('cyl', name + '_f', chalk, (0, 0, 0), (0.1 * s, 0.1 * s, 0.004), seg=24, rot=(math.pi / 2, 0, 0), parent=root)
	for e in (-1, 1):
		ear = prim('cyl', f'{name}_e{e}', chalk, (e * 0.045 * s, 0, 0.14 * s), (0.032 * s, 0.032 * s, 0.004), seg=16, rot=(math.pi / 2, 0, 0), parent=root)
		ear.scale = (0.032 * s, 0.1 * s, 0.004)
		ear.rotation_euler = (math.pi / 2, 0, 0); ear.rotation_euler.rotate_axis('Y', e * 0.2)
	for e in (-1, 1):
		prim('cyl', f'{name}_eye{e}', bgreen, (e * 0.035 * s, -0.002, 0.02 * s), (0.015 * s, 0.015 * s, 0.003), seg=10, rot=(math.pi / 2, 0, 0), parent=root)
	return root
orange = toon_mat('chalk_orange', C('#ff9a3c'), flat=True); leafm = toon_mat('chalk_green', C('#7fd36a'), flat=True)
def carrot(name, x, z, s=1.0):
	"""coloured-chalk carrot on the board: orange tapered body pointing down + three green leaves"""
	root = empty(name, (BX + x, BY - 0.036, BZ + z))
	bm = bmesh.new()
	for v in ((-0.075 * s, 0, 0.1 * s), (0.075 * s, 0, 0.1 * s), (0.0, 0, -0.2 * s)):
		bm.verts.new(v)
	bm.faces.new(bm.verts)
	me = bpy.data.meshes.new(name + '_body'); bm.to_mesh(me); bm.free()
	obj_from_mesh(name + '_body', me, orange, parent=root)
	for k, (lx, rot) in enumerate(((-0.035, 0.45), (0.0, 0.0), (0.035, -0.45))):
		lf = prim('cyl', f'{name}_leaf{k}', leafm, (lx * s, -0.001, 0.16 * s), (0.02 * s, 0.065 * s, 0.003), seg=12, parent=root)
		lf.rotation_euler = (math.pi / 2, 0, 0); lf.rotation_euler.rotate_axis('Y', rot)
	for k in range(2):
		ln = prim('cube', f'{name}_line{k}', toon_mat('chalk_dark', C('#c86a1e'), flat=True), (0, -0.002, (0.02 - k * 0.08) * s), (0.03 * s, 0.002, 0.004 * s), smooth_=False, parent=root)
	return root
carrot('cA', -0.95, 0.12, 1.5)
chalk_text('times2', '× 2', -0.48, 0.1, 0.5)
chalk_text('equals', '=', -0.03, 0.1, 0.5)
answer = [carrot('ans0', 0.38, 0.12, 1.5), carrot('ans1', 0.78, 0.12, 1.5)]

# ------------------------------------------------------------------ the teacher (glasses + pointer) and the class
T = rabbit_parts('teacher', ink_w=0.012)
T['root'].location = (-0.5, 2.72, 0.42); T['root'].scale = (1.75, 1.75, 1.75)
import_model('kenney-pirate-kit/Models/GLB format/crate.glb', 0.55, (-0.5, 2.72, 0.0), (0, 0, 15), ink=0.012)
glass = toon_mat('glasses', C('#1b1020'), flat=True)
for e in (-1, 1):
	bpy.ops.mesh.primitive_torus_add(major_radius=0.034, minor_radius=0.006, location=(0, 0, 0))
	r_ = bpy.context.object; r_.parent = T['head']; r_.location = (e * 0.062, 0.128, 0.048); r_.rotation_euler = (math.pi / 2, 0, 0)
	r_.data.materials.append(glass)
prim('cyl', 'bridge', glass, (0, 0.13, 0.055), (0.005, 0.005, 0.022), seg=6, rot=(0, math.pi / 2, 0), parent=T['head'])
pointer = prim('cyl', 'pointer', toon_mat('pointer', C('#c98a4b')), (0, 0, 0.28), (0.012, 0.012, 0.3), seg=8, ink=0.006, parent=T['paw1'])
pointer.rotation_euler = (math.radians(-35), 0, 0)
students = []
for k, (x, y) in enumerate(((-0.15, 1.55), (0.6, 1.45), (1.35, 1.6), (0.25, 0.95))):
	P = rabbit_parts(f'st{k}', ink_w=0.012)
	P['root'].location = (x, y, 0); P['root'].rotation_euler = (0, 0, math.radians(8 * (k % 2 * 2 - 1)))
	students.append(P)
# …and while the teacher explains multiplication, the class itself multiplies: extra students pop in on «multiply»
extra = []
for k, (x, y) in enumerate(((0.95, 1.05), (-0.55, 1.1), (1.75, 1.15), (0.2, 1.95), (1.0, 2.0), (-0.45, 0.6))):
	P = rabbit_parts(f'nx{k}', ink_w=0.012)
	P['root'].location = (x, y, 0); P['root'].rotation_euler = (0, 0, math.radians(10 * (k % 2 * 2 - 1)))
	extra.append(P)

cam = camera(30)
T_MULT = W(16) - 0.05
def update(t):
	u = ease((t - T0) / (T1 - T0))
	look(cam, vlerp((0.45, -2.3, 1.75), (0.5, -1.85, 1.7), u), vlerp((0.45, 3.0, 1.2), (0.5, 3.0, 1.25), u))
	lan.rotation_euler = (0, math.radians(6 * math.sin(t * 2.2)), 0)
	# teacher: turned half to the board, pointer taps the board on «Turns out» and sweeps to the answer on «multiply»
	T['root'].rotation_euler = (0, 0, math.radians(200 if t < T_MULT else 215))
	tap = math.sin(max(0.0, t - T0) * 9) * 0.04 if t < T_MULT else 0.0
	T['paw1'].location = (0.06, 0.2, 0.2 + tap); T['paw1'].rotation_euler = (math.radians(-70), 0, math.radians(30))
	T['head'].rotation_euler = (math.radians(4 * math.sin(t * 3)), 0, math.radians(-25 if t < T_MULT else 10))
	# the answer: two carrots pop in on «multiply»
	for k, h in enumerate(answer):
		ts = T_MULT + k * 0.12
		vis = t >= ts
		set_visible(h, vis)
		kk = clamp01((t - ts) / 0.12)
		sc_ = 1 + 0.4 * math.sin(kk * math.pi) if kk < 1 else 1.0
		h.scale = (sc_, sc_, sc_)
	# students: ears perk up as the answer appears; one raises a paw
	for k, P in enumerate(students):
		perk = clamp01((t - T_MULT - 0.1 * k) / 0.25)
		for s_ in (-1, 1):
			P[f'ear{s_}'].rotation_euler = (math.radians(-12 + 10 * perk + 3 * math.sin(t * 4 + k)), math.radians(s_ * (14 - 6 * perk)), 0)
		P['head'].rotation_euler = (0, 0, math.radians(5 * math.sin(t * 1.5 + k)))
	for k, P in enumerate(extra):
		ts = T_MULT + 0.25 + k * 0.09
		set_visible(P['root'], t >= ts)
		kk = clamp01((t - ts) / 0.2)
		sc_ = (1 + 0.35 * math.sin(kk * math.pi)) if kk < 1 else 1.0
		P['root'].scale = (sc_, sc_, sc_)
	S2 = students[1]
	up = clamp01((t - T_MULT - 0.3) / 0.25)
	S2['paw1'].location = (0.06, 0.15 + 0.02 * up, 0.03 + 0.36 * up)

render(update, 'lesson')
