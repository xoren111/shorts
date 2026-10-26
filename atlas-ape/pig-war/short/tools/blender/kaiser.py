"""KAISER 34.50–36.74 «Then a German emperor settled it.»  a palace study: the Kaiser (spiked helmet, white mutton chops,
dark-blue tunic) bends over the map of the islands with a magnifying glass, raises the seal and slams it down on «settled»
— a red seal blooms on the map. German Empire flag, red damask wall, gilt frames, warm window light."""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from pw import *
import pw, env, frigate as FG
from shots_t import SHOT
t0, t1 = SHOT('kaiser')
setup2(t0, t1)
world2(light=0.35); sun = sun2(2.2, rot=(60, 0, 140))
# room
wall = pbr('damask', '#7d1f26', 'fabric_leather_02', 1.0, 0.25, 0.7) if (kit.ROOT / 'assets/cc0/polyhaven/fabric_leather_02').exists() else pbr('damask', '#7d1f26', rough=0.75)
floor = pbr('parquet', '#7a4f30', 'dark_wooden_planks', 1.5, 0.6, 0.4)
gold = pw.mat('gold', '#f0c14b', 0.3, 0.8)
cube('floor', floor, (0, 0, -0.02), (6, 6, 0.02))
cube('backwall', wall, (0, 1.6, 1.5), (6, 0.05, 1.5))
cube('sidewall', wall, (-2.2, 0, 1.5), (0.05, 6, 1.5))
cube('wainscot', pbr('wains', '#3b2416', 'dark_wooden_planks', 1.0, 0.5, 0.5), (0, 1.54, 0.25), (6, 0.03, 0.25), bev=0.005)
for x in (-1.1, 1.1):
	cube(f'frame{x}', gold, (x, 1.52, 1.35), (0.42, 0.02, 0.32), bev=0.01)
	cube(f'paint{x}', pbr(f'paint{x}', '#5a4a3a' if x < 0 else '#3f4a5a', rough=0.6), (x, 1.505, 1.35), (0.36, 0.01, 0.26))
# window with warm light on the right
cube('window', pbr('glass', '#ffe2a8', emit=('#ffd890', 3.0)), (1.95, 0.4, 1.3), (0.02, 0.5, 0.6))
ld = bpy.data.lights.new('winlight', 'AREA'); ld.energy = 260; ld.size = 1.2; ld.color = (1.0, 0.82, 0.6)
lo = bpy.data.objects.new('winlight', ld); bpy.context.scene.collection.objects.link(lo); lo.location = (1.6, 0.4, 1.4); lo.rotation_euler = (0, math.radians(-75), 0)
fill = bpy.data.lights.new('fill', 'AREA'); fill.energy = 90; fill.size = 2.0; fill.color = (0.85, 0.8, 1.0)
fo = bpy.data.objects.new('fill', fill); bpy.context.scene.collection.objects.link(fo); fo.location = (-0.6, -2.2, 1.6); fo.rotation_euler = (math.radians(65), 0, 0)
# German Empire flag on a stand (left)
pole, cloth = env.flagpole('deflag', (-1.35, 1.1, 0), 'german_empire', h=1.9, size=(0.5, 0.32))
# desk with the map
wood = pbr('desk', '#5a3320', 'dark_wooden_planks', 2.0, 0.4, 0.35)
cube('desktop', wood, (0, 0.1, 0.26), (0.75, 0.36, 0.03), bev=0.01)
for x in (-0.68, 0.68):
	for y in (-0.2, 0.5):
		cube(f'dleg{x}{y}', wood, (x, y, 0.12), (0.04, 0.04, 0.12))
cube('deskfront', wood, (0, -0.24, 0.16), (0.72, 0.02, 0.09))
mm = bpy.data.materials.new('deskmap'); mm.use_nodes = True; nt = mm.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = bpy.data.images.load(str(kit.ROOT / 'assets/notes/deskmap.png'))
link(nt, ti.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.8
mp = prim('plane', 'map', mm, (0, 0.05, 0.295), (0.27, 0.27 * 1834 / 1480, 1), smooth_=False)
mp.rotation_euler = (0, 0, math.radians(90 + 4)); mp.data.uv_layers.new()
for p_ in mp.data.polygons:
	for li in p_.loop_indices:
		v = mp.data.vertices[mp.data.loops[li].vertex_index].co
		mp.data.uv_layers.active.data[li].uv = (v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
# candle + inkwell + quill for scale and warmth
prim('cyl', 'candle', pw.mat('wax', '#f3ead6', 0.6), (-0.55, 0.3, 0.35), (0.025, 0.025, 0.07), seg=12)
prim('sphere', 'flame', pw.mat('flame', '#ffcf7a', 0.2, emit=('#ffb347', 25.0)), (-0.55, 0.3, 0.435), (0.012, 0.012, 0.025))
prim('cyl', 'ink', pw.mat('inkwell', '#1a1c24', 0.2), (0.55, 0.3, 0.31), (0.03, 0.03, 0.025), seg=12)
# the Kaiser behind the desk
K = char('kaiser', 'male-f', 'kaiser', (0.0, 0.5, 0.0), 0.0, 0.66, 'idle')
hat(K, 'pickelhaube'); beard(K, 'chops', '#efece6')
# seal stamp (brass handle + wooden knob) and the red seal it leaves
stamp = bpy.data.objects.new('stamp', None); bpy.context.scene.collection.objects.link(stamp)
prim('cyl', 'st_base', gold, (0, 0, 0.0), (0.065, 0.065, 0.014), seg=24).parent = stamp
prim('cyl', 'st_stem', gold, (0, 0, 0.05), (0.014, 0.014, 0.045), seg=12).parent = stamp
prim('sphere', 'st_knob', pw.mat('knob', '#4a2a1a', 0.4), (0, 0, 0.11), (0.04, 0.04, 0.045)).parent = stamp
seal = prim('cyl', 'seal', pw.mat('sealred', '#c41e2a', 0.35), (0.0, 0.08, 0.298), (0.07, 0.07, 0.004), seg=32)
SEAL_AT = Vector((0.0, 0.02, 0.298))
lens = bpy.data.objects.new('magnifier', None); bpy.context.scene.collection.objects.link(lens)
bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.007, location=(0, 0, 0)); tr = bpy.context.active_object; tr.data.materials.append(gold); tr.parent = lens
gl = prim('cyl', 'glass', pbr('lensglass', '#dfe8f0', rough=0.05), (0, 0, 0), (0.058, 0.058, 0.003), seg=32); gl.parent = lens
prim('cyl', 'handle', pw.mat('knob', '#4a2a1a', 0.4), (0.0, -0.1, 0), (0.008, 0.008, 0.045), seg=8, rot=(math.pi / 2, 0, 0)).parent = lens
t_up, t_hit = W(84) - 0.55, W(84) + 0.02
cam = camera(30)
def update(t):
	set_clip(K, 'idle')
	k = ease((t - t0) / (t1 - t0))
	look(cam, Vector((0.35, -0.95, 0.95)).lerp(Vector((0.25, -0.78, 0.88)), k), Vector((0.0, 0.3, 0.42)).lerp(Vector((0.0, 0.22, 0.38)), k))
def arms_tick(t):
	# right arm: magnifier low over the map → raises the seal → slams it down on «settled»
	if t < t_up:
		d = Vector((-0.15, -0.75, -0.55))
	elif t < t_hit:
		d = Vector((-0.15, -0.75, -0.55)).lerp(Vector((-0.12, -0.45, 0.88)), easeOut((t - t_up) / 0.35))
	else:
		u = t - t_hit
		d = Vector((-0.12, -0.45, 0.88)).lerp(Vector((-0.08, -0.7, -0.7)), clamp01(u / 0.07)) if u < 0.07 else Vector((-0.08, -0.7, -0.7)) + Vector((0, 0, 0.05 * math.exp(-u * 8)))
	pb = K['arm'].pose.bones['arm-right']; pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = pw.yf2._arm_q('arm-right', d)
	pl = K['arm'].pose.bones['arm-left']; pl.rotation_mode = 'QUATERNION'; pl.rotation_quaternion = pw.yf2._arm_q('arm-left', Vector((0.25, -0.75, -0.5)))
	bpy.context.view_layer.update()
	rh, lh = hands(K)
	holding_seal = True
	if t < t_hit:
		stamp.location = rh + Vector((0, -0.02, -0.07))
	else:
		u = t - t_hit
		land = SEAL_AT + Vector((0, 0, 0.002 + 0.08 * clamp01((u - 0.35) / 0.4)))
		stamp.location = (rh + Vector((0, -0.02, -0.07))).lerp(land, 1.0 if u < 0.35 else 1 - 0.6 * clamp01((u - 0.35) / 0.4))
	lens.location = Vector((0.42, -0.05, 0.30)); lens.rotation_euler = (0, 0, math.radians(30))
	s_ = easeOut((t - t_hit) / 0.12) if t >= t_hit else 0.0
	seal.location = SEAL_AT; seal.scale = (0.07 * max(s_, 1e-3), 0.07 * max(s_, 1e-3), 0.004)
pw.UPDATERS.append(arms_tick)
render2(update, 'kaiser')
