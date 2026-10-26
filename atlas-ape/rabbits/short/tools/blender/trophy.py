"""S6 «Round one: a prize.» — a gold trophy and a fat money bag rise on a pedestal into a spotlight in a dusk paddock.
--variant nobody → S10b «Nobody won.»: the same prize still untouched at night, a tumbleweed rolls past.
  tools/blender/run.sh tools/blender/trophy.py -- [--variant nobody] [--frames 1,80] [--scale 40]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
from shots_t import SHOT
VAR = arg('variant', 'prize')
T0, T1 = SHOT('trophy' if VAR == 'prize' else 'nobody')
setup(T0, T1)

if VAR == 'prize':
	world(SKY_DUSK); sun(3.6, (1.0, 0.84, 0.64), (62, 0, -25))
else:
	world(SKY_NIGHT); sun(2.6, (0.75, 0.70, 1.0), (55, 0, 40))
ground('paddock', 200, cols=(C('#86a23e'), C('#6f8a33'), C('#b39a58')), scale=0.15)
for k in range(-8, 9):
	import_model(NK + 'fence_simple.glb', 2.2, (k * 2.2, 9.0, 0), (0, 0, 0), ink=0.02)
scatter(['tree_default.glb', 'tree_oak.glb', 'tree_detailed.glb'], 9, (-26, 16, 26, 34), 3.2, 5.0, seed=11, ink=0.04)
cloud('c1', (-16, 60, 22), 6, seed=6, ink=0.13); cloud('c2', (18, 70, 28), 7, seed=9, ink=0.14)

# pedestal
cream = toon_mat('pedestal', C('#f4e6cf')); goldm = toon_mat('gold', C('#ffc62e'), bands=((0.70, 0.40, 0.25), (0.95, 0.72, 0.42), (1.0, 1.0, 0.85)))
ped = empty('ped', (0, 0, 0))
prim('cyl', 'ped_base', cream, (0, 0, 0.12), (1.05, 1.05, 0.12), seg=40, ink=0.02, parent=ped)
prim('cyl', 'ped_col', cream, (0, 0, 0.62), (0.85, 0.85, 0.42), seg=40, ink=0.02, parent=ped)
prim('cyl', 'ped_trim', goldm, (0, 0, 1.06), (0.92, 0.92, 0.04), seg=40, ink=0.012, parent=ped)
# trophy (cup on a stem, two handles)
tro = empty('trophy', (-0.28, 0.05, 1.1), parent=ped)
prim('cyl', 'tro_foot', goldm, (0, 0, 0.06), (0.26, 0.26, 0.06), seg=32, ink=0.012, parent=tro)
prim('cyl', 'tro_stem', goldm, (0, 0, 0.3), (0.06, 0.06, 0.2), seg=16, ink=0.01, parent=tro)
prim('cyl', 'tro_cup', goldm, (0, 0, 0.78), (0.36, 0.36, 0.3), seg=40, r2=1.0, ink=0.014, parent=tro)
prim('sphere', 'tro_bowl', goldm, (0, 0, 0.5), (0.36, 0.36, 0.22), ink=0.014, parent=tro)
for s in (-1, 1):
	bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.035, location=(0, 0, 0))
	h = bpy.context.object; h.name = f'tro_handle{s}'; h.parent = tro; h.location = (s * 0.38, 0, 0.78); h.rotation_euler = (math.pi / 2, 0, 0)
	h.data.materials.append(goldm); outline(h, 0.01)
# money bag with a £ sign
bagm = toon_mat('bag', C('#c9a46b'))
bag = empty('bag', (0.5, -0.15, 1.1), parent=ped)
prim('sphere', 'bag_body', bagm, (0, 0, 0.34), (0.33, 0.3, 0.36), ink=0.014, parent=bag)
prim('cyl', 'bag_neck', bagm, (0, 0, 0.72), (0.1, 0.1, 0.08), seg=16, ink=0.01, parent=bag)
prim('cyl', 'bag_tie', toon_mat('tie', C('#8a2b2b')), (0, 0, 0.67), (0.12, 0.12, 0.025), seg=16, ink=0.008, parent=bag)
prim('sphere', 'bag_top', bagm, (0, 0, 0.83), (0.15, 0.13, 0.08), ink=0.01, parent=bag)
font = bpy.data.fonts.load(str(ROOT / 'assets/fonts/Anton-Regular.ttf'))
cu = bpy.data.curves.new('pound', 'FONT'); cu.body = '£'; cu.font = font; cu.size = 0.42; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = 0.01
pt = bpy.data.objects.new("pound", cu); bpy.context.scene.collection.objects.link(pt); pt.parent = bag
pt.location = (0, -0.31, 0.34); pt.rotation_euler = (math.pi / 2, 0, 0)
pt.data.materials.append(toon_mat('pound_ink', C('#2f5a2a'), flat=True))

# spotlight cone (translucent) + light pool
sl = bpy.data.materials.new('spot'); sl.use_nodes = True; nt = sl.node_tree; nt.nodes.clear()
o_ = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); em = node(nt, 'ShaderNodeEmission'); em.inputs['Color'].default_value = (*C('#fff2b8'), 1)
tr = node(nt, 'ShaderNodeBsdfTransparent'); mx = node(nt, 'ShaderNodeMixShader'); mx.inputs['Fac'].default_value = 0.16
link(nt, tr.outputs[0], mx.inputs[1]); link(nt, em.outputs[0], mx.inputs[2]); link(nt, mx.outputs[0], o_.inputs['Surface'])
try:
	sl.surface_render_method = 'BLENDED'
except Exception:
	sl.blend_method = 'BLEND'
spot = prim('cyl', 'spotcone', sl, (0, 0, 4.5), (1.25, 1.25, 4.5), seg=48, r2=0.12, smooth_=True)
pool = prim('cyl', 'pool', toon_mat('pool', C('#e9e17a'), flat=True), (0, 0, 0.01), (1.9, 1.9, 0.005), seg=48)

# tumbleweed (nobody)
if VAR == 'nobody':
	bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.45, location=(-6, -1.0, 0.45))
	tw = bpy.context.object; tw.name = 'tumbleweed'
	tw.data.materials.append(toon_mat('twig', C('#a8784a')))
	wf = tw.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.035
	bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.3, location=(0, 0, 0))
	tw2 = bpy.context.object; tw2.parent = tw; tw2.rotation_euler = (0.5, 0.7, 0.2)
	tw2.data.materials.append(toon_mat('twig', C('#a8784a'))); tw2.modifiers.new('wf', 'WIREFRAME').thickness = 0.03

cam = camera(30)
def update(t):
	u = ease((t - T0) / (T1 - T0))
	if VAR == 'prize':
		k = easeOut((t - T0 - 0.05) / 0.85)
		ped.location.z = -1.3 * (1 - k)
		on = smooth((t - T0 - 0.35) / 0.4)
		spot.scale = (1.25 * on + 1e-3, 1.25 * on + 1e-3, 4.5); pool.scale = (1.9 * on + 1e-3, 1.9 * on + 1e-3, 0.005)
		tro.rotation_euler = (0, 0, math.radians(-12 + 24 * u))
		look(cam, vlerp((0.4, -6.6, 2.0), (0.3, -5.4, 2.05), u), vlerp((0.0, 0.0, 1.05), (0.0, 0.0, 1.25), u))
	else:
		look(cam, vlerp((0.6, -6.0, 1.9), (0.4, -5.6, 1.95), u), (0.0, 0.0, 1.15))
		x = lerp(-6.0, 6.5, (t - T0) / (T1 - T0))
		tw.location = (x, -1.6, 0.45 + 0.35 * abs(math.sin((t - T0) * 5.0)))
		tw.rotation_euler = (0, x / 0.45, 0)

render(update, 'trophy' if VAR == 'prize' else 'nobody')
