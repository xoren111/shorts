"""v2 KAISER (painting look, metres) «Then a German emperor settled it.»  a palace study: Wilhelm I (spiked helmet, white
mutton chops, dark-blue tunic, epaulettes) stands over the map of the islands, lifts the seal and brings it down on «settled»
— a red seal blooms on the map. German Empire flag, damask wall, gilt frames, warm window light."""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from hist import *
import pw, env
from shots_t import SHOT
t0, t1 = SHOT('kaiser')
setup_hist(t0, t1, sky=0.35)
sun2(1.5, (1.0, 0.85, 0.65), (60, 0, 140), 2.0)
wall = pbr('damask', '#6e1c22', 'fabric_leather_02', 1.0, 0.25, 0.7) if (kit.ROOT / 'assets/cc0/polyhaven/fabric_leather_02').exists() else pbr('damask', '#6e1c22', rough=0.75)
floor = pbr('parquet', '#6a442a', 'dark_wooden_planks', 0.6, 0.6, 0.4)
gold = mat('gold', '#d4a640', 0.3, 0.9)
cube('floor', floor, (0, 0, -0.02), (8, 8, 0.02))
cube('backwall', wall, (0, 2.6, 2.5), (8, 0.05, 2.5))
cube('sidewall', wall, (-3.4, 0, 2.5), (0.05, 8, 2.5))
cube('wainscot', pbr('wains', '#3b2416', 'dark_wooden_planks', 0.5, 0.5, 0.5), (0, 2.53, 0.55), (8, 0.04, 0.55), bev=0.01)
for x in (-1.9, 1.9):
	cube(f'frame{x}', gold, (x, 2.5, 2.4), (0.75, 0.04, 0.55), bev=0.02)
	cube(f'paint{x}', pbr(f'paint{x}', '#5a4a3a' if x < 0 else '#3f4a5a', rough=0.6), (x, 2.47, 2.4), (0.66, 0.02, 0.46))
cube('window', pbr('glass', '#ffe2a8', emit=('#ffd890', 3.0)), (3.3, 0.7, 2.1), (0.03, 0.9, 1.1))
ld = bpy.data.lights.new('winlight', 'AREA'); ld.energy = 900; ld.size = 2.0; ld.color = (1.0, 0.82, 0.6)
lo = bpy.data.objects.new('winlight', ld); bpy.context.scene.collection.objects.link(lo); lo.location = (2.8, 0.7, 2.2); lo.rotation_euler = (0, math.radians(-75), 0)
fill = bpy.data.lights.new('fill', 'AREA'); fill.energy = 300; fill.size = 3.0; fill.color = (0.85, 0.8, 1.0)
fo = bpy.data.objects.new('fill', fill); bpy.context.scene.collection.objects.link(fo); fo.location = (-1.0, -3.6, 2.6); fo.rotation_euler = (math.radians(65), 0, 0)
pole, cloth = env.flagpole('deflag', (-2.3, 1.9, 0), 'german_empire', h=2.9, size=(0.8, 0.5))
wood = pbr('desk', '#4e2c1b', 'dark_wooden_planks', 1.0, 0.4, 0.35)
cube('desktop', wood, (0, 0.2, 0.76), (1.0, 0.55, 0.035), bev=0.01)
for x in (-0.9, 0.9):
	for y in (-0.25, 0.65): cube(f'dleg{x}{y}', wood, (x, y, 0.37), (0.05, 0.05, 0.37))
cube('deskfront', wood, (0, -0.33, 0.5), (0.96, 0.025, 0.24))
mm = bpy.data.materials.new('deskmap'); mm.use_nodes = True; nt = mm.node_tree; nt.nodes.clear()
out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = bpy.data.images.load(str(kit.ROOT / 'assets/notes/deskmap.png'))
link(nt, ti.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.8
mp = prim('plane', 'map', mm, (0, 0.3, 0.8), (0.34, 0.34 * 1834 / 1480, 1), smooth_=False)
mp.rotation_euler = (0, 0, math.radians(90 + 4)); mp.data.uv_layers.new()
for p_ in mp.data.polygons:
	for li in p_.loop_indices:
		v = mp.data.vertices[mp.data.loops[li].vertex_index].co; mp.data.uv_layers.active.data[li].uv = (v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
prim('cyl', 'candle', mat('wax', '#f3ead6', 0.6), (-0.8, 0.55, 0.88), (0.025, 0.025, 0.09), seg=12)
prim('sphere', 'flame', mat('flame', '#ffcf7a', 0.2, emit=('#ffb347', 25.0)), (-0.8, 0.55, 0.995), (0.012, 0.012, 0.025))
cd_ = bpy.data.lights.new('candle', 'POINT'); cd_.energy = 25; cd_.color = (1.0, 0.7, 0.4)
co_ = bpy.data.objects.new('candle_l', cd_); bpy.context.scene.collection.objects.link(co_); co_.location = (-0.8, 0.55, 1.05)
K_ = human('kaiser', 'kaiser', (0.0, 1.05, 0.0), 0.0, seed=8, pose='hold', height=0.6)
facial_hair(K_, 'chops', '#efece6')
stamp = bpy.data.objects.new('stamp', None); bpy.context.scene.collection.objects.link(stamp)
prim('cyl', 'st_base', gold, (0, 0, 0.0), (0.05, 0.05, 0.012), seg=24).parent = stamp
prim('cyl', 'st_stem', gold, (0, 0, 0.045), (0.012, 0.012, 0.04), seg=12).parent = stamp
prim('sphere', 'st_knob', mat('knob', '#3a2014', 0.4), (0, 0, 0.1), (0.03, 0.03, 0.035)).parent = stamp
seal = prim('cyl', 'seal', mat('sealred', '#b81a26', 0.35), (0, 0, 0), (0.06, 0.06, 0.003), seg=32)
SEAL_AT = Vector((0.0, 0.25, 0.803))
t_up, t_hit = W(84) - 0.55, W(84) + 0.02
def seal_pose(P, t):
	rest, up, hit = Vector((-0.06, -0.45, -0.42)), Vector((-0.1, -0.36, 0.06)), Vector((-0.06, -0.52, -0.64))
	if t < t_up: h = rest
	elif t < t_hit: h = rest.lerp(up, easeOut((t - t_up) / 0.35))
	else: h = up.lerp(hit, clamp01((t - t_hit) / 0.07))
	return {'ik.R': tuple(h), 'ik.L': (0.2, -0.38, -0.5), '@head': (14, 0, 0), 'pole.R': (-1, 0.5, -0.3)}
K_['pose'] = seal_pose
cam = camera(32); dof(cam, 4.0)
def update(t):
	k = ease((t - t0) / (t1 - t0))
	look(cam, Vector((0.55, -1.6, 1.65)).lerp(Vector((0.4, -1.25, 1.6)), k), Vector((0.0, 0.6, 1.15)).lerp(Vector((0.0, 0.5, 1.1)), k))
	cam.data.dof.focus_distance = 2.2
def stamp_tick(t):
	wr = bone_world(K_, 'wrist.R', False)
	stamp.location = Vector((wr.x, wr.y, max(SEAL_AT.z + 0.002, wr.z - 0.12)))
	s_ = easeOut((t - t_hit) / 0.12) if t >= t_hit else 0.0
	seal.location = Vector((stamp.location.x, stamp.location.y, SEAL_AT.z)) if t >= t_hit else (0, 0, -9)
	seal.scale = (0.06 * max(s_, 1e-3), 0.06 * max(s_, 1e-3), 0.003)
UPDATERS.append(stamp_tick)
render2(update, 'kaiser')
