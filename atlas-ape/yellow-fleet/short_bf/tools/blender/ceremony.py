"""S16 «Next year: an official release ceremony.» — a little stage with bunting on Western Australian wheat farmland (grain silos on
the horizon), a closed crate on the stage, a red ribbon across the front; giant ceremonial scissors enter and snip the ribbon on
«ceremony»; the halves drop. No animals visible. Slow push-in for the whole shot.
  tools/blender/run.sh tools/blender/ceremony.py -- [--frames 1,80] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
from shots_t import SHOT
T0, T1 = SHOT('ceremony')
setup(T0, T1)
world(SKY_GOLD); sun(4.2, (1.0, 0.9, 0.7), (55, 0, 20))

# wheat farmland: golden stripes
m = bpy.data.materials.new('wheat'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry')
wv = node(nt, 'ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Y'; wv.inputs['Scale'].default_value = 0.35
link(nt, g.outputs['Position'], wv.inputs['Vector'])
stripe = M(nt, 'GREATER_THAN', wv.outputs['Fac'], 0.55)
EMIT(nt, MIX(nt, 1.0, MIX(nt, stripe, C('#e9b94c'), C('#d39a35')), toon(nt), 'MULTIPLY'), out)
prim('plane', 'field', m, (0, 0, 0), (300, 300, 1), smooth_=False)
prim('plane', 'lawn', toon_mat('lawn', C('#8aa83a')), (0, -1.0, 0.01), (5.0, 3.6, 1), smooth_=False)
# silos on the horizon
for k, x in enumerate((-22, -18.5, 26)):
	prim('cyl', f'silo{k}', toon_mat('silo', C('#d8dbe2')), (x, 70, 7), (2.4, 2.4, 7), seg=24, ink=0.08)
	prim('cyl', f'silotop{k}', toon_mat('silo', C('#d8dbe2')), (x, 70, 15.2), (2.4, 2.4, 1.2), seg=24, r2=0.15, ink=0.08)
scatter(['tree_default.glb', 'tree_oak.glb'], 10, (-60, 50, 60, 64), 4.0, 6.5, seed=61, ink=0.07)
cloud('c1', (-20, 90, 30), 7, seed=41, ink=0.15); cloud('c2', (22, 100, 36), 8, seed=43, ink=0.16)

# stage
stage_m = toon_mat('stage', C('#9a6a42')); skirt_m = toon_mat('skirt', C('#2f5a9e'))
prim('cube', 'stage', stage_m, (0, 1.2, 0.35), (2.6, 1.4, 0.35), smooth_=False, ink=0.03)
prim('cube', 'skirt', skirt_m, (0, -0.21, 0.33), (2.62, 0.02, 0.3), smooth_=False, ink=0.02)
for x in (-2.4, 2.4):
	prim('cyl', f'pole{x}', toon_mat('pole', C('#f4efe6')), (x, 2.4, 1.9), (0.05, 0.05, 1.9), seg=10, ink=0.015)
# bunting: triangles along a sagging string between the poles
cols = [C('#e2342d'), C('#f6f0e4'), C('#2f5a9e'), C('#ffc62e')]
for k in range(17):
	u = k / 16; x = lerp(-2.35, 2.35, u); z = 3.55 - 0.45 * math.sin(u * math.pi)
	bm = bmesh.new()
	for v in ((-0.12, 0, 0), (0.12, 0, 0), (0, 0, -0.3)):
		bm.verts.new(v)
	bm.faces.new(bm.verts)
	me = bpy.data.meshes.new(f'flag{k}'); bm.to_mesh(me); bm.free()
	obj_from_mesh(f'flag{k}', me, toon_mat(f'flagc{k % 4}', cols[k % 4], flat=True), (x, 2.38, z))
# the official crate: marked with the same violet virus emblem as the Wardang pens (visual link to the virus), hinged lid
cr = toon_mat('crate', C('#c98a4b')); rib = toon_mat('ribbon', C('#e2342d'))
VIOLET = toon_mat('virus', C('#9B4DFF'), flat=True); VIOLET2 = toon_mat('virus2', C('#D9B3FF'), flat=True)
prim('cube', 'crate', cr, (0, 1.3, 1.02), (0.62, 0.46, 0.32), smooth_=False, ink=0.02)
crate_lid = empty('crate_lidh', (0, 1.76, 1.34))
prim('cube', 'crate_lid', cr, (0, -0.46, 0.035), (0.64, 0.47, 0.035), smooth_=False, ink=0.015, parent=crate_lid)
def glyph(name, loc, r, parent=None, rot=(math.pi / 2, 0, 0)):
	"""flat violet virus emblem (disc + 10 spikes with knobs), facing −Y by default"""
	g = empty(name, loc, parent=parent); g.rotation_euler = rot
	prim('cyl', name + '_core', VIOLET, (0, 0, 0), (r * 0.85, r * 0.85, 0.01), seg=32, ink=r * 0.08, parent=g)
	prim('cyl', name + '_hl', VIOLET2, (-r * 0.25, r * 0.25, 0.012), (r * 0.22, r * 0.22, 0.005), seg=16, parent=g)
	for k in range(10):
		a = k / 10 * math.tau
		sp = prim('cube', f'{name}_sp{k}', VIOLET, (math.cos(a) * r * 1.05, math.sin(a) * r * 1.05, 0), (r * 0.25, r * 0.06, 0.008), smooth_=False, parent=g)
		sp.rotation_euler = (0, 0, a)
		prim('cyl', f'{name}_kn{k}', VIOLET2, (math.cos(a) * r * 1.33, math.sin(a) * r * 1.33, 0), (r * 0.13, r * 0.13, 0.01), seg=12, ink=r * 0.05, parent=g)
	return g
glyph('emblem', (0, 1.3 - 0.47, 1.02), 0.2)
# lectern with a microphone (stage left) + a red carpet: «official»
wood = toon_mat('lectern', C('#7a4a2e'))
lec = empty('lectern', (-1.75, 1.15, 0.7))
prim('cube', 'lec_body', wood, (0, 0, 0.5), (0.3, 0.22, 0.5), smooth_=False, ink=0.015, parent=lec)
top = prim('cube', 'lec_top', wood, (0, -0.05, 1.04), (0.36, 0.28, 0.04), smooth_=False, ink=0.012, parent=lec); top.rotation_euler = (math.radians(-18), 0, 0)
glyph('lec_emblem', (0, -0.225, 0.55), 0.12, parent=lec)
prim('cyl', 'mic_stand', toon_mat('mic', C('#2b2b38')), (0.12, -0.1, 1.25), (0.012, 0.012, 0.22), seg=8, parent=lec).rotation_euler = (math.radians(-25), 0, 0)
prim('sphere', 'mic_head', toon_mat('mic', C('#2b2b38')), (0.12, -0.2, 1.46), (0.05, 0.05, 0.06), ink=0.008, parent=lec)
# released viruses: glyph «bubbles» that float up out of the crate after the snip
bubbles = []
rngb = np.random.default_rng(3)
for k in range(7):
	b = glyph(f'bub{k}', (0, 1.3, 1.0), rngb.uniform(0.09, 0.15))
	bubbles.append((b, rngb.uniform(-1.2, 1.2), rngb.uniform(1.6, 2.6), rngb.uniform(0, 0.35), rngb.uniform(0, math.tau)))
# the ribbon across the front between two stands — two halves hinged at the stands
for s in (-1, 1):
	prim('cyl', f'stand{s}', toon_mat('stand', C('#ffc62e')), (s * 2.0, -0.9, 0.55), (0.04, 0.04, 0.55), seg=10, ink=0.012)
halves = []
for s in (-1, 1):
	hinge = empty(f'rib_h{s}', (s * 2.0, -0.9, 1.0))
	prim('cube', f'rib{s}', rib, (-s * 1.0, 0, 0), (1.0, 0.012, 0.06), smooth_=False, ink=0.008, parent=hinge)
	halves.append((hinge, s))
prim('sphere', 'ribbow', rib, (0, -0.92, 1.0), (0.14, 0.05, 0.1), ink=0.01)
ribbow = bpy.data.objects['ribbow']
# giant scissors: two blades + ring handles, pivot at the screw
steel = toon_mat('steel', C('#c9ccd8'), bands=((0.45, 0.42, 0.55), (0.78, 0.78, 0.86), (1.0, 1.0, 1.0)))
gold = toon_mat('handle', C('#ffc62e'))
sc_root = empty('scissors', (3.5, -1.2, 1.0))
blades = []
for s in (-1, 1):
	b = empty(f'blade{s}', parent=sc_root)
	prim('cube', f'bl{s}', steel, (-0.55, 0, 0), (0.55, 0.02, 0.05), smooth_=False, ink=0.01, parent=b)
	bpy.ops.mesh.primitive_torus_add(major_radius=0.13, minor_radius=0.03, location=(0, 0, 0))
	r_ = bpy.context.object; r_.parent = b; r_.location = (0.26, 0, 0); r_.rotation_euler = (math.pi / 2, 0, 0)
	r_.data.materials.append(gold); outline(r_, 0.01)
	blades.append((b, s))
prim('cyl', 'screw', gold, (0, 0, 0), (0.035, 0.035, 0.04), seg=12, rot=(math.pi / 2, 0, 0), parent=sc_root)

cam = camera(30)
T_SNIP = W(93) - 0.02
def update(t):
	u = ease((t - T0) / (T1 - T0))
	look(cam, vlerp((0.3, -8.2, 2.7), (0.2, -5.9, 2.15), u), vlerp((0.0, 0.6, 0.95), (0.0, 0.0, 0.92), u))
	# scissors glide in from the right, open, snip at T_SNIP
	k = easeOut((t - (T0 + 0.35)) / 0.9)
	sc_root.location = (lerp(3.5, 0.55, k), -0.93, 1.0)
	open_ = 26 * smooth((t - (T0 + 0.6)) / 0.3) * (1 - smooth((t - (T_SNIP - 0.08)) / 0.08))
	for b, s in blades:
		b.rotation_euler = (0, math.radians(s * open_ / 2), 0)
	cut = easeIn((t - T_SNIP) / 0.45)
	for h, s in halves:
		h.rotation_euler = (0, math.radians(s * 80 * cut), 0)
	ribbow.hide_render = t > T_SNIP
	if t > T_SNIP:
		sc_root.location.z = 1.0 + 0.6 * easeOut((t - T_SNIP - 0.15) / 0.6)
	# the crate lid flips open and the viruses float out
	lk = easeOut((t - (T_SNIP + 0.12)) / 0.3)
	crate_lid.rotation_euler = (math.radians(-110 * lk), 0, 0)
	for b, dx, up, dl, ph in bubbles:
		q = clamp01((t - (T_SNIP + 0.2 + dl)) / 1.6)
		set_visible(b, q > 0)
		b.location = (dx * q, 1.3 - 0.4 * q, 1.05 + up * easeOut(q))
		b.rotation_euler = (math.pi / 2, 0, ph + q * 1.5)

render(update, 'ceremony')
