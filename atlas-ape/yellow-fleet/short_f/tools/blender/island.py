"""S7b «With chicken cholera.» — inside Pasteur's team's hut-lab on Rodd Island (Sydney Harbour, 1888): a wooden bench under a
window onto the harbour; brass microscope, a round flask of glowing violet culture bubbling over a spirit lamp, a rack of test
tubes, petri dishes, shelves of jars. A big white hen (the star) stands on the bench; on «chicken» she flaps and clucks, on
«cholera» she leans to the flask and tilts her head, puzzled. A worried rabbit watches from a wire cage at the back (the target).
v5 (owner 19.10: the old outdoor hut shot was too weak) — detailed procedural models, close interior framing.
  tools/blender/run.sh tools/blender/island.py -- [--frames 1,80] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
from shots_t import SHOT
T0, T1 = SHOT('island')
setup(T0, T1)
world([(0.0, C('#f3dcc0')), (1.0, C('#e7c9a8'))], 1.0)
sun(3.4, (1.0, 0.9, 0.74), (52, 0, -30))

def planks(name, loc, size, axis, cols, scale=3.4):
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	o_ = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry')
	wv = node(nt, 'ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = axis; wv.inputs['Scale'].default_value = scale
	link(nt, g.outputs['Position'], wv.inputs['Vector'])
	seam = M(nt, 'LESS_THAN', wv.outputs['Fac'], 0.06)
	EMIT(nt, MIX(nt, 1.0, MIX(nt, seam, C(cols[0]), C(cols[1])), toon(nt), 'MULTIPLY'), o_)
	return prim('cube', name, m, loc, size, smooth_=False)

# ------------------------------------------------------------------ room: back wall with a window onto the harbour, floor, side wall
WALL = ('#e3b77e', '#b98852')
planks('backwall_l', (-1.55, 1.2, 1.5), (0.75, 0.06, 1.6), 'X', WALL)
planks('backwall_r', (1.55, 1.2, 1.5), (0.75, 0.06, 1.6), 'X', WALL)
planks('backwall_b', (0, 1.2, 0.62), (0.8, 0.06, 0.72), 'X', WALL)
planks('backwall_t', (0, 1.2, 2.85), (0.8, 0.06, 0.25), 'X', WALL)
planks('floor', (0, 0, -0.05), (3, 3, 0.05), 'X', ('#c08a55', '#94653a'))
planks('sidewall', (-2.2, 0, 1.5), (0.06, 3, 1.6), 'Y', WALL)
# window frame (white-painted) + cross bars
wf = toon_mat('winframe', C('#f7efe2'))
for (x, z, sx, sz) in ((0, 2.6, 0.84, 0.05), (0, 1.34, 0.86, 0.07), (-0.8, 1.97, 0.05, 0.66), (0.8, 1.97, 0.05, 0.66)):
	prim('cube', f'wframe{x}{z}', wf, (x, 1.15, z), (sx, 0.06, sz), smooth_=False, ink=0.012)
prim('cube', 'wbar_v', wf, (0, 1.17, 1.97), (0.025, 0.03, 0.62), smooth_=False, ink=0.008)
prim('cube', 'wbar_h', wf, (0, 1.17, 2.0), (0.78, 0.03, 0.025), smooth_=False, ink=0.008)
# the view: harbour water, far shore with trees, a lighthouse, sky (flat painted planes far behind the window)
view = bpy.data.materials.new('view'); view.use_nodes = True; nt = view.node_tree; nt.nodes.clear()
o_ = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry'); sep = SEP(nt, g.outputs['Position'])
sky = RAMP(nt, M(nt, 'DIVIDE', M(nt, 'SUBTRACT', sep['Z'], 1.6), 2.4), [(0.0, C('#ffd9a8')), (0.3, C('#f7a6b8')), (0.8, C('#b98bdc'))], interp='LINEAR')
wave = node(nt, 'ShaderNodeTexWave'); wave.inputs['Scale'].default_value = 1.2; wave.inputs['Distortion'].default_value = 4
link(nt, g.outputs['Position'], wave.inputs['Vector'])
sea = MIX(nt, M(nt, 'GREATER_THAN', wave.outputs['Fac'], 0.82), C('#3d63c9'), C('#7fa0ea'))
EMIT(nt, MIX(nt, M(nt, 'GREATER_THAN', sep['Z'], 1.62), sea, sky), o_)
prim('plane', 'viewplane', view, (0, 6.0, 2.0), (30, 30, 1), rot=(math.pi / 2, 0, 0), smooth_=False)
prim('sphere', 'farshore', toon_mat('shore', C('#6d8f45')), (0.6, 5.6, 1.45), (3.2, 0.3, 0.38), ink=0.02)
prim('sphere', 'farshore2', toon_mat('shore2', C('#577a3a')), (-1.6, 5.5, 1.45), (1.6, 0.3, 0.3), ink=0.02)
for k, x in enumerate((-0.6, -0.2, 0.9, 1.4, -1.9)):
	prim('sphere', f'ftree{k}', toon_mat('ftree', C('#3f7a3c')), (x, 5.4, 1.78 + 0.05 * (k % 2)), (0.13, 0.1, 0.16), ink=0.012)
prim('cyl', 'lighthouse', toon_mat('lh', C('#f7efe2')), (0.45, 5.3, 1.95), (0.06, 0.06, 0.25), seg=12, r2=0.75, ink=0.01)
prim('cyl', 'lhtop', toon_mat('lhtop', C('#e2342d')), (0.45, 5.3, 2.24), (0.05, 0.05, 0.05), seg=12, r2=0.2, ink=0.008)
cloud('c1', (-0.9, 5.8, 2.5), 0.28, seed=12, ink=0.01); cloud('c2', (0.9, 5.8, 2.65), 0.32, seed=14, ink=0.01)

# ------------------------------------------------------------------ shelves with jars on the wall
shelfm = toon_mat('shelf', C('#8a5a34'))
JARS = ['#9fd3c7', '#f2c14e', '#c77dff', '#e98a6b', '#a7c957', '#7fb0e6']
for side in (-1, 1):
	for j, z in enumerate((1.75, 2.3)):
		prim('cube', f'shelf{side}{j}', shelfm, (side * 1.4, 1.02, z), (0.5, 0.13, 0.025), smooth_=False, ink=0.008)
		for k in range(4):
			x = side * 1.4 - 0.36 + k * 0.24
			h = 0.07 + 0.04 * h1(k + j * 7 + side * 3)
			col = JARS[(k + j * 2 + (side > 0) * 3) % len(JARS)]
			prim('cyl', f'jar{side}{j}{k}', toon_mat('jar' + col, C(col)), (x, 1.0, z + 0.025 + h), (0.065, 0.065, h), seg=16, ink=0.008)
			prim('cyl', f'jarlid{side}{j}{k}', toon_mat('cork', C('#b07a45')), (x, 1.0, z + 0.03 + 2 * h), (0.055, 0.055, 0.015), seg=16, ink=0.005)

# ------------------------------------------------------------------ the bench
BZ = 0.9
benchm = toon_mat('bench', C('#a8703f')); benchtop = toon_mat('benchtop', C('#c98d52'))
prim('cube', 'benchtop', benchtop, (0, 0.55, BZ - 0.04), (1.9, 0.52, 0.04), smooth_=False, ink=0.012)
prim('cube', 'benchapron', benchm, (0, 0.08, BZ - 0.16), (1.85, 0.03, 0.09), smooth_=False, ink=0.01)
for x in (-1.7, 1.7):
	prim('cube', f'benchleg{x}', benchm, (x, 0.12, BZ / 2 - 0.1), (0.05, 0.05, BZ / 2 - 0.05), smooth_=False, ink=0.01)
# drawers in the apron
for k, x in enumerate((-0.9, 0.0, 0.9)):
	prim('cube', f'drawer{k}', toon_mat('drawer', C('#b98352')), (x, 0.045, BZ - 0.16), (0.36, 0.01, 0.065), smooth_=False, ink=0.006)
	prim('sphere', f'knob{k}', toon_mat('brass', C('#ffc23a')), (x, 0.03, BZ - 0.16), (0.018, 0.018, 0.018), ink=0.004)

# brass microscope (left)
brass = toon_mat('brass', C('#ffc23a')); iron = toon_mat('iron', C('#3a3048'))
mic = empty('microscope', (-0.62, 0.86, BZ))
prim('cyl', 'mic_foot', iron, (0, 0, 0.025), (0.13, 0.1, 0.025), seg=20, ink=0.006, parent=mic)
prim('cube', 'mic_pillar', brass, (0, 0.06, 0.16), (0.025, 0.025, 0.13), smooth_=False, ink=0.005, parent=mic)
bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.022, location=(0, 0, 0))
arm = bpy.context.object; arm.name = 'mic_arm'; arm.parent = mic; arm.location = (0, -0.02, 0.32); arm.rotation_euler = (0, math.pi / 2, 0)
arm.data.materials.append(brass); outline(arm, 0.02)
prim('cyl', 'mic_stage', iron, (0, -0.06, 0.2), (0.08, 0.08, 0.012), seg=20, ink=0.004, parent=mic)
prim('cyl', 'mic_tube', brass, (0, -0.1, 0.38), (0.04, 0.04, 0.13), seg=16, rot=(math.radians(-18), 0, 0), ink=0.005, parent=mic)
prim('cyl', 'mic_eye', iron, (0, -0.06, 0.52), (0.028, 0.028, 0.03), seg=12, rot=(math.radians(-18), 0, 0), ink=0.004, parent=mic)
prim('cyl', 'mic_obj', iron, (0, -0.135, 0.25), (0.022, 0.022, 0.03), seg=12, ink=0.004, parent=mic)
# glass slides + a notebook with a quill
prim('cube', 'notebook', toon_mat('paper', C('#f8f1e0')), (0.62, 0.22, BZ + 0.012), (0.17, 0.12, 0.012), rot=(0, 0, 0.25), smooth_=False, ink=0.006)
prim('cube', 'nbcover', toon_mat('nbcover', C('#7a2f2a')), (0.62, 0.22, BZ + 0.002), (0.18, 0.13, 0.004), rot=(0, 0, 0.25), smooth_=False)
for k in range(4):
	prim('cube', f'nbline{k}', toon_mat('ink_line', C('#5a5070'), flat=True), (0.61 + 0.01 * k, 0.18 + 0.035 * k, BZ + 0.025), (0.12, 0.004, 0.001), rot=(0, 0, 0.25), smooth_=False)
prim('cyl', 'quill', toon_mat('quill', C('#fbf6ee')), (0.72, 0.28, BZ + 0.06), (0.012, 0.012, 0.12), seg=8, r2=0.2, rot=(math.radians(60), 0, math.radians(30)), ink=0.004)

# the flask of violet culture on a tripod over a spirit lamp (right of centre) — liquid below a line, clear glass above
fl = empty('flask', (0.3, 0.55, BZ))
for k in range(3):
	a = k / 3 * math.tau + 0.4
	prim('cyl', f'tripod{k}', iron, (math.cos(a) * 0.11, math.sin(a) * 0.11, 0.13), (0.008, 0.008, 0.13), seg=6, rot=(math.sin(a) * 0.25, -math.cos(a) * 0.25, 0), parent=fl)
prim('cyl', 'tripodring', iron, (0, 0, 0.26), (0.13, 0.13, 0.008), seg=24, ink=0.003, parent=fl)
prim('cyl', 'lamp', toon_mat('lampglass', C('#bfe3e8')), (0, 0, 0.045), (0.06, 0.06, 0.045), seg=16, ink=0.005, parent=fl)
prim('cyl', 'wick', iron, (0, 0, 0.1), (0.012, 0.012, 0.012), seg=8, parent=fl)
flame = prim('sphere', 'flame', toon_mat('flame', C('#7fb6ff'), flat=True), (0, 0, 0.14), (0.022, 0.022, 0.05), parent=fl)
flame_in = prim('sphere', 'flame_in', toon_mat('flame_in', C('#e6f3ff'), flat=True), (0, -0.008, 0.13), (0.01, 0.01, 0.025), parent=fl)
liq = bpy.data.materials.new('culture'); liq.use_nodes = True; nt = liq.node_tree; nt.nodes.clear()
o_ = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); tc = node(nt, 'ShaderNodeTexCoord'); sep = SEP(nt, tc.outputs['Object'])
glow = MIX(nt, 1.0, C('#b06bff'), toon(nt, (0.75, 0.62, 0.95), (0.92, 0.85, 1.0), (1.0, 1.0, 1.0)), 'MULTIPLY')
glass_c = MIX(nt, 1.0, C('#eef4ff'), toon(nt, (0.72, 0.74, 0.88), (0.9, 0.92, 0.98), (1.0, 1.0, 1.0)), 'MULTIPLY')
EMIT(nt, MIX(nt, M(nt, 'GREATER_THAN', sep['Z'], 0.25), glow, glass_c), o_)
bulb = prim('sphere', 'flask_bulb', liq, (0, 0, 0.44), (0.17, 0.17, 0.17), ink=0.035, parent=fl, u=32, v=24)
prim('cyl', 'flask_neck', toon_mat('flaskglass', C('#eef4ff')), (0, 0, 0.68), (0.045, 0.045, 0.1), seg=16, ink=0.1, parent=fl)
prim('cyl', 'flask_lip', toon_mat('flaskglass', C('#eef4ff')), (0, 0, 0.78), (0.055, 0.055, 0.012), seg=16, ink=0.1, parent=fl)
prim('sphere', 'flask_hl', toon_mat('hl', (1, 1, 1), flat=True), (-0.075, -0.13, 0.5), (0.02, 0.01, 0.055), rot=(0, 0.4, 0), parent=fl)
# a germ glyph floating in the culture (front half pokes out of the liquid, glows)
germ = empty('germ', (0.0, -0.13, 0.4), parent=fl)
gm = toon_mat('germ', C('#5a12c4'), flat=True); gk = toon_mat('germknob', C('#e9c6ff'), flat=True)
prim('sphere', 'germ_core', gm, (0, 0, 0), (0.05, 0.05, 0.05), parent=germ)
for k in range(8):
	a = k / 8 * math.tau
	prim('sphere', f'germ_knob{k}', gk, (math.cos(a) * 0.068, -0.004, math.sin(a) * 0.068), (0.014, 0.014, 0.014), parent=germ)
# vapour puffs rising from the neck + bubbles in the culture
puffm = toon_mat('puff', C('#e4ccff'), bands=CREAM)
puffs = [prim('ico', f'puff{k}', puffm, (0, 0, -5), (0.04, 0.04, 0.04), ink=0.12, sub=2) for k in range(6)]
bubm = toon_mat('bubble', C('#f1e4ff'), flat=True)
bubbles = [prim('sphere', f'bub{k}', bubm, (0, 0, -5), (0.012, 0.012, 0.012), u=10, v=8) for k in range(10)]

# test-tube rack (right)
rack = empty('rack', (-0.6, 0.3, BZ))
rack.rotation_euler = (0, 0, math.radians(15))
prim('cube', 'rack_top', shelfm, (0, 0, 0.16), (0.24, 0.06, 0.012), smooth_=False, ink=0.005, parent=rack)
prim('cube', 'rack_base', shelfm, (0, 0, 0.012), (0.24, 0.06, 0.012), smooth_=False, ink=0.005, parent=rack)
for x in (-0.22, 0.22):
	prim('cube', f'rack_side{x}', shelfm, (x, 0, 0.085), (0.012, 0.05, 0.08), smooth_=False, ink=0.004, parent=rack)
TUBES = ['#c77dff', '#c77dff', '#f2c14e', '#c77dff', '#9fd3c7']
for k, col in enumerate(TUBES):
	x = -0.18 + k * 0.09
	prim('cyl', f'tube{k}', toon_mat('tubeglass', C('#eef4ff')), (x, 0, 0.2), (0.022, 0.022, 0.13), seg=12, ink=0.004, parent=rack)
	prim('cyl', f'tubeliq{k}', toon_mat('tl' + col, C(col)), (x, -0.003, 0.13), (0.02, 0.02, 0.06), seg=12, parent=rack)
# petri dishes with violet colonies
for k, (x, y) in enumerate(((0.02, 0.16), (0.2, 0.1))):
	prim('cyl', f'petri{k}', toon_mat('petri', C('#eef4ff')), (x, y, BZ + 0.012), (0.08, 0.08, 0.012), seg=24, ink=0.005)
	prim('cyl', f'agar{k}', toon_mat('agar', C('#f2e0a6')), (x, y, BZ + 0.02), (0.07, 0.07, 0.006), seg=24)
	for j in range(4):
		a = j * 1.7 + k
		prim('sphere', f'colony{k}{j}', toon_mat('colony', C('#9b4dff'), flat=True), (x + math.cos(a) * 0.035, y + math.sin(a) * 0.035, BZ + 0.027), (0.012, 0.012, 0.004))

# a worried rabbit in a wire cage at the back left (the target of all this)
prim('cube', 'cagecrate', toon_mat('crate', C('#c98a4b')), (0.56, 0.95, BZ + 0.15), (0.26, 0.19, 0.15), smooth_=False, ink=0.006)
cage = empty('cage', (0.56, 0.95, BZ + 0.3))
wire = toon_mat('cagewire', (0.80, 0.80, 0.86), bands=((0.45, 0.42, 0.55), (0.75, 0.74, 0.82), (0.95, 0.95, 1.0)))
prim('cube', 'cage_floor', shelfm, (0, 0, 0.012), (0.22, 0.16, 0.012), smooth_=False, ink=0.005, parent=cage)
for k in range(9):
	x = -0.2 + k * 0.05
	prim('cyl', f'cbar{k}', wire, (x, -0.16, 0.16), (0.004, 0.004, 0.15), seg=6, parent=cage)
for z in (0.02, 0.31):
	prim('cube', f'cbarh{z}', wire, (0, -0.16, z), (0.22, 0.006, 0.006), smooth_=False, parent=cage)
prim('cube', 'cage_roof', wire, (0, 0, 0.31), (0.22, 0.16, 0.006), smooth_=False, parent=cage)
R = rabbit_parts('caged', ink_w=0.014)
R['root'].parent = cage; R['root'].location = (0.0, 0.02, 0.024); R['root'].rotation_euler = (0, 0, math.radians(-25)); R['root'].scale = (0.62, 0.62, 0.62)

# ------------------------------------------------------------------ the hen (detailed procedural, white with cream shading)
def hen_model(name):
	root = empty(name)
	white = toon_mat('feather', C('#fbf6ee'), bands=((0.80, 0.72, 0.80), (0.95, 0.90, 0.90), (1.0, 1.0, 0.98)))
	cream = toon_mat('feather2', C('#efe3cf'), bands=((0.80, 0.72, 0.80), (0.95, 0.90, 0.90), (1.0, 1.0, 0.98)))
	red = toon_mat('comb', C('#e2342d')); yel = toon_mat('beak', C('#ffb52e')); leg = toon_mat('leg', C('#f6b23a'))
	P = {'root': root}
	body = empty(name + '_bodypiv', (0, 0, 0.32), parent=root); P['body'] = body
	prim('sphere', name + '_body', white, (0, -0.02, 0), (0.2, 0.26, 0.19), ink=0.032, parent=body, u=32, v=24)
	prim('sphere', name + '_breast', white, (0, 0.13, 0.03), (0.16, 0.13, 0.16), parent=body)
	prim('sphere', name + '_belly', cream, (0, 0.02, -0.1), (0.15, 0.17, 0.09), parent=body)
	# tail: a fan of five feathers, up and back
	for k in range(5):
		a = (k - 2) * 0.32
		f = prim('sphere', f'{name}_tail{k}', white if k % 2 == 0 else cream, (math.sin(a) * 0.05, -0.22, 0.13 + 0.015 * (2 - abs(k - 2))), (0.03, 0.025, 0.11),
		         ink=0.12, parent=body)
		f.rotation_euler = (math.radians(-22), a * 0.7, 0)
	# wings: a folded wing on each side with three layered tip feathers
	for s in (-1, 1):
		w_ = empty(f'{name}_wing{s}', (s * 0.18, -0.03, 0.04), parent=body); P[f'wing{s}'] = w_
		prim('sphere', f'{name}_wingm{s}', cream, (0, 0, 0), (0.04, 0.15, 0.1), rot=(math.radians(-12), 0, 0), ink=0.05, parent=w_)
		for j in range(3):
			prim('sphere', f'{name}_wtip{s}{j}', white, (s * 0.02, -0.09 - 0.03 * j, -0.035 + 0.025 * j), (0.02, 0.055, 0.026),
			     rot=(math.radians(-25 + 8 * j), 0, 0), ink=0.12, parent=w_)
	# neck + head
	prim('sphere', name + '_neck', white, (0, 0.16, 0.2), (0.1, 0.1, 0.14), parent=body)
	head = empty(name + '_headpiv', (0, 0.2, 0.33), parent=body); P['head'] = head
	prim('sphere', name + '_head', white, (0, 0, 0), (0.105, 0.11, 0.11), ink=0.11, parent=head, u=28, v=20)
	for k, (y, z, r) in enumerate(((-0.06, 0.1, 0.035), (-0.025, 0.125, 0.042), (0.015, 0.135, 0.046), (0.055, 0.12, 0.04), (0.085, 0.095, 0.03))):
		prim('sphere', f'{name}_comb{k}', red, (0, y, z), (0.022, r, r), ink=0.3, parent=head)
	# beak: upper + lower cone
	prim('cyl', name + '_beak', yel, (0, 0.13, 0.0), (0.035, 0.035, 0.045), seg=16, r2=0.05, rot=(math.radians(-80), 0, 0), ink=0.25, parent=head)
	prim('cyl', name + '_beakl', toon_mat('beak2', C('#f29a1f')), (0, 0.11, -0.025), (0.022, 0.022, 0.025), seg=12, r2=0.05, rot=(math.radians(-110), 0, 0), parent=head)
	for s in (-1, 1):
		prim('sphere', f'{name}_wattle{s}', red, (s * 0.015, 0.1, -0.075), (0.02, 0.022, 0.04), ink=0.3, parent=head)
		prim('sphere', f'{name}_eyew{s}', toon_mat('eyewhite', (1, 1, 1), flat=True), (s * 0.075, 0.055, 0.03), (0.028, 0.022, 0.032), parent=head)
		prim('sphere', f'{name}_eye{s}', toon_mat('eye', (0.02, 0.01, 0.03), flat=True), (s * 0.092, 0.06, 0.032), (0.014, 0.012, 0.018), parent=head)
		prim('sphere', f'{name}_hl{s}', toon_mat('eyehl', (1, 1, 1), flat=True), (s * 0.1, 0.066, 0.042), (0.005, 0.004, 0.005), parent=head)
		prim('sphere', f'{name}_lobe{s}', red, (s * 0.09, -0.01, -0.03), (0.012, 0.018, 0.022), parent=head)
	# legs with toes
	for s in (-1, 1):
		lg = empty(f'{name}_leg{s}', (s * 0.07, 0.0, 0.0), parent=root)
		prim('cyl', f'{name}_thigh{s}', white, (0, 0, 0.17), (0.055, 0.055, 0.05), seg=12, r2=0.7, ink=0.2, parent=lg)
		prim('cyl', f'{name}_shank{s}', leg, (0, 0, 0.07), (0.016, 0.016, 0.075), seg=10, ink=0.5, parent=lg)
		for j, a in enumerate((-0.45, 0.0, 0.45)):
			prim('cyl', f'{name}_toe{s}{j}', leg, (math.sin(a) * 0.04, math.cos(a) * 0.04, 0.008), (0.011, 0.011, 0.045), seg=8, r2=0.5,
			     rot=(math.radians(-90), 0, -a), ink=0.6, parent=lg)
		prim('cyl', f'{name}_toeb{s}', leg, (0, -0.03, 0.008), (0.01, 0.01, 0.025), seg=8, r2=0.5, rot=(math.radians(90), 0, 0), ink=0.6, parent=lg)
	return P
H = hen_model('hen')
H['root'].location = (-0.28, 0.42, BZ); H['root'].scale = (1.1, 1.1, 1.1)
# loose feathers that float down after the flap
featherm = toon_mat('feather', C('#fbf6ee'), bands=((0.80, 0.72, 0.80), (0.95, 0.90, 0.90), (1.0, 1.0, 0.98)))
loose = [prim('sphere', f'loose{k}', featherm, (0, 0, -5), (0.012, 0.035, 0.006), ink=0.4) for k in range(4)]

cam = camera(32)
T_WITH = W(32) - 0.05
T_HEN = W(33) - 0.05          # «chicken»: flap + cluck
T_LOOK = W(34)                # «cholera»: leans to the flask, head tilt
def update(t):
	u = ease((t - T0) / (T1 - T0))
	look(cam, vlerp((0.02, -1.95, 1.5), (0.0, -1.6, 1.42), u), vlerp((0.05, 0.6, 1.22), (0.02, 0.6, 1.2), u))
	ph = t - T0
	# flame flicker, culture bubbles + vapour
	fk = 1 + 0.12 * math.sin(t * 31) + 0.08 * math.sin(t * 17)
	flame.scale = (0.022, 0.022, 0.05 * fk); flame_in.scale = (0.01, 0.01, 0.025 * fk)
	germ.rotation_euler = (0, ph * 1.6, 0)
	gs = 1 + 0.08 * math.sin(t * 6)
	germ.scale = (gs, gs, gs)
	for k, b in enumerate(bubbles):
		q = (ph * 0.9 + k * 0.1) % 1.0
		a = k * 2.4
		b.location = (0.3 + math.cos(a) * 0.1 * (1 - q * 0.5), 0.55 - 0.16 + 0.02 * math.sin(a), BZ + 0.32 + q * 0.2)
		s_ = 0.01 + 0.006 * h1(k)
		b.scale = (s_, s_, s_) if q < 0.95 else (0, 0, 0)
	for k, p in enumerate(puffs):
		q = (ph * 0.55 + k / len(puffs)) % 1.0
		p.location = (0.3 + 0.06 * math.sin(k * 1.9 + q * 3), 0.55, BZ + 0.82 + q * 0.6)
		s_ = (0.02 + 0.035 * q) * (1 - smooth((q - 0.7) / 0.3))
		p.scale = (s_, s_, s_)
	# the hen: idle pecking look-around → flap + hop on «chicken» → leans towards the flask, puzzled tilt on «cholera»
	f = clamp01((t - T_HEN) / 0.45)
	flap = math.sin(f * math.pi * 3) * (1 - f) if 0 < f < 1 else 0.0
	hopz = 0.06 * math.sin(f * math.pi) if 0 < f < 1 else 0.0
	lk = ease((t - T_LOOK) / 0.4)
	H['root'].location = (-0.28, 0.42, BZ + hopz)
	H['root'].rotation_euler = (0, 0, math.radians(lerp(200, 238, lk)))
	H['body'].rotation_euler = (math.radians(lerp(0, 14, lk)), 0, 0)
	for s in (-1, 1):
		H[f'wing{s}'].rotation_euler = (0, math.radians(s * 70 * abs(flap)), math.radians(-s * 20 * abs(flap)))
	idle = math.radians(8 * math.sin(ph * 5)) if t < T_HEN else 0.0
	tilt = math.radians(lerp(0, 28, lk) + 6 * math.sin(max(0.0, t - T_LOOK) * 6) * (1 - clamp01((t - T_LOOK - 0.6) / 0.5)))
	H['head'].rotation_euler = (math.radians(lerp(-5, 12, lk)) + 0.5 * idle, tilt, idle + math.radians(lerp(0, -10, lk)))
	H['head'].location = (0, 0.2 + 0.05 * lk, 0.33 - 0.02 * lk)
	# loose feathers drift down after the flap
	for k, o in enumerate(loose):
		q = t - T_HEN - 0.1 - k * 0.06
		if q < 0:
			o.location = (0, 0, -5); continue
		o.location = (-0.28 + (k - 1.5) * 0.12 + 0.05 * math.sin(q * 5 + k), 0.38 - 0.05 * k, BZ + 0.75 + 0.18 * q * (1.0 - q) * 4 - 0.25 * q)
		o.rotation_euler = (math.sin(q * 6 + k) * 0.8, q * 3 + k, 0)
	# the caged rabbit: ears pressed back, small trembling (worried)
	R['root'].location = (0.0, 0.02, 0.024 + 0.003 * abs(math.sin(t * 40)))
	for s_ in (-1, 1):
		R[f'ear{s_}'].rotation_euler = (math.radians(-55), math.radians(s_ * 22), 0)
	R['head'].rotation_euler = (math.radians(-6), 0, math.radians(lerp(0, -20, lk)))

render(update, 'island')
