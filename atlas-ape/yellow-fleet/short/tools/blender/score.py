"""S19 «Three rounds: Rabbits two. Flies one. Australia zero. They were winning before the ship even arrived. Probably.»
A wooden outback scoreboard at violet dusk: one number tile drops in per sentence (a cartoon fly lands on the FLIES tile); then the
camera cranes up over the board: a plain full of grazing rabbits runs to a violet sea where the clipper's sails appear.
Atlas stands big in the lower-left (Remotion overlay) → the board sits upper-centre/right.
  tools/blender/run.sh tools/blender/score.py -- [--frames 1,300,600] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
from shots_t import SHOT
T0, T1 = SHOT('score')
setup(T0, T1)
world(SKY_DUSK); sun(3.6, (1.0, 0.84, 0.64), (62, 0, -30))

ground('plain', 230, cols=(C('#8aa83a'), C('#b39a58'), C('#76933a')), scale=0.07, res=120)
# sea beyond the plain + the clipper on the horizon
m = bpy.data.materials.new('sea'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
EMIT(nt, C('#4b4fb8'), node(nt, 'ShaderNodeOutputMaterial', (600, 0)))
prim('plane', 'sea', m, (0, 340, -0.05), (800, 230, 1), smooth_=False)
prim('plane', 'beach', toon_mat('beach', C('#e8c98a')), (0, 113, 0.02), (400, 4, 1), smooth_=False)
ship, _ = import_model('kenney-pirate-kit/Models/GLB format/ship-large.glb', 2.4, (26, 190, -0.6), (0, 0, 70), ink=0.12)
scatter(['tree_default.glb', 'tree_oak.glb', 'tree_detailed.glb'], 26, (-90, 40, 90, 100), 3.0, 5.5, seed=71, ink=0.05)
cloud('c1', (-30, 160, 40), 10, seed=51, ink=0.2); cloud('c2', (40, 200, 55), 12, seed=53, ink=0.24); cloud('c3', (-6, 120, 30), 6, seed=55, ink=0.13)

# ------------------------------------------------------------------ the scoreboard
font = bpy.data.fonts.load(str(ROOT / 'assets/fonts/Anton-Regular.ttf'))
def text(name, body, loc, size, mat, align='LEFT', parent=None):
	cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.font = font; cu.size = size; cu.align_x = align; cu.align_y = 'CENTER'
	cu.extrude = 0.01
	o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o)
	o.location = loc; o.rotation_euler = (math.pi / 2, 0, 0)
	if parent: o.parent = parent
	o.data.materials.append(mat)
	return o
BX, BZ = 1.3, 4.0                 # board centre (x, z)
board = empty('board', (BX, 0, BZ))
wood = toon_mat('frame', C('#9a6a42')); green = toon_mat('boardgreen', C('#1f4a35')); cream = toon_mat('cream', C('#f4ead6'), flat=True)
prim('cube', 'board_back', green, (0, 0, 0), (3.3, 0.12, 2.3), smooth_=False, ink=0.04, parent=board)
for (x, z, sx, sz) in ((0, 2.3, 3.45, 0.15), (0, -2.3, 3.45, 0.15), (-3.3, 0, 0.15, 2.45), (3.3, 0, 0.15, 2.45)):
	prim('cube', f'frame{x}{z}', wood, (x, -0.04, z), (sx, 0.16, sz), smooth_=False, ink=0.03, parent=board)
for x in (-2.4, 2.4):
	prim('cube', f'leg{x}', wood, (BX + x, 0.1, (BZ - 2.3) / 2), (0.16, 0.16, (BZ - 2.3) / 2 + 0.1), smooth_=False, ink=0.03)
# little roof
prim('cube', 'roof', toon_mat('roof', C('#c4553f')), (0, 0.05, 2.62), (3.6, 0.5, 0.12), smooth_=False, ink=0.03, parent=board)
ROWS = [('RABBITS', '2', W(105) - 0.06), ('FLIES', '1', W(107) - 0.06), ('AUSTRALIA', '0', W(109) - 0.06)]
tiles = []
for k, (name, digit, tt) in enumerate(ROWS):
	z = 0.82 - k * 1.12
	text(f'name{k}', name, (-2.95, -0.14, z), 0.74, cream, 'LEFT', board)
	prim('cube', f'slot{k}', toon_mat('slot', C('#0f2a1e'), flat=True), (2.35, -0.13, z), (0.55, 0.02, 0.48), smooth_=False, parent=board)
	tile = empty(f'tile{k}', (2.35, -0.2, z), parent=board)
	prim('cube', f'tileface{k}', toon_mat('tile', C('#fbf6ee')), (0, 0, 0), (0.5, 0.05, 0.44), smooth_=False, ink=0.02, parent=tile)
	text(f'digit{k}', digit, (0, -0.06, 0.0), 0.86, toon_mat('digit', C('#1b1020'), flat=True), 'CENTER', tile)
	tiles.append((tile, z, tt))
# the fly
fly = empty('fly')
fly.scale = (2.6, 2.6, 2.6)
prim('sphere', 'fly_body', toon_mat('flybody', C('#2a2a35')), (0, 0, 0), (0.07, 0.1, 0.06), ink=0.008, parent=fly)
prim('sphere', 'fly_head', toon_mat('flybody', C('#2a2a35')), (0, 0.1, 0.01), (0.045, 0.045, 0.045), ink=0.006, parent=fly)
for s in (-1, 1):
	prim('sphere', f'fly_eye{s}', toon_mat('flyeye', C('#c23a3a'), flat=True), (s * 0.03, 0.12, 0.03), (0.022, 0.022, 0.022), parent=fly)
wings = []
for s in (-1, 1):
	w_ = empty(f'wing{s}', (s * 0.03, 0.0, 0.05), parent=fly)
	prim('sphere', f'fly_wing{s}', toon_mat('flywing', C('#dfe8ff'), flat=True), (s * 0.08, -0.02, 0.0), (0.09, 0.04, 0.01), ink=0.004, parent=w_)
	wings.append((w_, s))

# ------------------------------------------------------------------ grazing rabbits on the plain (behind the board)
rng = np.random.default_rng(81)
pts = []
for k in range(620):
	x = rng.uniform(-45, 45) if k < 380 else rng.uniform(-80, 80); y = rng.uniform(4, 40) if k < 380 else rng.uniform(40, 108)
	if abs(x - BX) < 5 and y < 9: continue
	pts.append((x, y, 0.0, rng.uniform(0, math.tau)))
rabbit_crowd(pts, s=1.3, ink_w=0.016, lod=0.5)

cam = camera(30)
T_RISE = W(110) - 0.1
def update(t):
	# 1) in front of the board, gentle push-in; 2) crane up and over the board to the plain and the sea
	a = ease((t - T0) / (T_RISE - T0))
	p = vlerp((-0.3, -13.2, 3.3), (-0.1, -12.2, 3.4), a); q = vlerp((1.35, 0, 3.55), (1.35, 0, 3.65), a)
	r = ease((t - T_RISE) / 3.3)
	p = vlerp(p, (1.6, -15.5, 12.5), r); q = vlerp(q, (2.4, 55.0, 1.2), r)
	look(cam, p, q)
	for tile, z, tt in tiles:
		k = clamp01((t - tt) / 0.22)
		drop = (1 - k) ** 2 * 2.4
		bounce = 0.06 * math.sin(clamp01((t - tt - 0.22) / 0.25) * math.pi) if t > tt + 0.22 else 0
		tile.location = (2.35, -0.2, z + drop + bounce)
		set_visible(tile, t >= tt - 0.01)
	# fly: buzzes in from the right, lands on the FLIES tile just after it drops
	tl = W(107) + 0.25
	fz = tiles[1][1]
	if t < tl:
		k = clamp01((t - (tl - 1.1)) / 1.1)
		fly.location = (BX + lerp(6.0, 2.82, easeOut(k)), lerp(-1.6, -0.33, k), BZ + fz + 0.36 + 0.5 * math.sin(k * 9) * (1 - k))
	else:
		fly.location = (BX + 2.82, -0.33, BZ + fz + 0.36)
	fly.rotation_euler = (math.pi / 2, 0, math.radians(200))
	fl = 1.0 if t < tl + 0.15 else 0.2
	for w_, s in wings:
		w_.rotation_euler = (0, math.radians(s * 35 * math.sin(t * 90) * fl), 0)
	set_visible(fly, t >= tl - 1.1)

render(update, 'score')
