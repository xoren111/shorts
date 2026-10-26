"""San Juan Island 1859 set pieces: meadow ground with hills, Cutlar's potato patch, Douglas firs (Kenney nature kit, CC0),
shore rocks, the strait (water2), a distant snowy volcano (Mt Baker) + hazy ranges, a log cabin with a door, split-rail
fence, flag poles, field cannons (Kenney pirate kit, CC0), camp tents. Ground plane z = 0, sea level z = −0.25."""
import bpy, bmesh, math, random
import numpy as np
from mathutils import Vector, noise
from kit import *
from yf2 import *
import kit, pw

NK = kit.CC0 / 'kenney-nature-kit/Models/GLTF format'
PK = kit.CC0 / 'kenney-pirate-kit/Models/GLB format'
SEA = -0.25
SHORE_Y = 12.5
NK_TINT = {'leafsGreen': '#2f6b3c', 'leafsDark': '#24563a', 'grass': '#6aa84a', 'woodBark': '#6b4a35', 'woodBarkDark': '#5a3d2c',
           'dirt': '#9a6d45', 'stone': '#8f8a8e', 'woodInner': '#d9b27c', 'leafsFall': '#c98a3a', 'leafsFallDark': '#b36b2a'}

_mcache = {}
def glb(path, name, loc=(0, 0, 0), rot_z=0.0, s=1.0, tint=None, parent=None):
	"""import a Kenney model, swap its materials for lit PBR ones (tinted by material name), return a root empty"""
	before = set(bpy.data.objects)
	bpy.ops.import_scene.gltf(filepath=str(path))
	new = [o for o in bpy.data.objects if o not in before]
	root = empty(name, loc, parent); root.rotation_euler = (0, 0, rot_z); root.scale = (s, s, s)
	for o in new:
		if o.parent is None: o.parent = root
		if o.type != 'MESH': continue
		for sl in o.material_slots:
			m0 = sl.material
			if m0 is None: continue
			base = m0.name.split('.')[0]
			hexs = (tint or {}).get(base) or NK_TINT.get(base)
			if hexs is None:
				bs = next((n for n in m0.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m0.use_nodes else None
				if bs and bs.inputs['Base Color'].is_linked and bs.inputs['Base Color'].links[0].from_node.type == 'TEX_IMAGE':
					im = bs.inputs['Base Color'].links[0].from_node.image
					key = ('img', im.name)
					if key not in _mcache:
						mm = bpy.data.materials.new('k_img_' + im.name); mm.use_nodes = True; nt = mm.node_tree; nt.nodes.clear()
						out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); b2 = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, b2.outputs[0], out.inputs['Surface'])
						ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = im; ti.interpolation = 'Closest'
						link(nt, ti.outputs['Color'], b2.inputs['Base Color']); b2.inputs['Roughness'].default_value = 0.5
						_mcache[key] = mm
					sl.material = _mcache[key]; continue
				c = tuple(bs.inputs['Base Color'].default_value)[:3] if bs else (0.6, 0.6, 0.6)
				srgb = tuple((x * 12.92 if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055) for x in c)
				hexs = '#%02x%02x%02x' % tuple(int(max(0, min(1, x)) * 255) for x in srgb)
			key = (base, hexs)
			if key not in _mcache:
				tex = 'pine_bark' if 'wood' in base.lower() or 'bark' in base.lower() else None
				_mcache[key] = pbr('k_' + base + hexs, hexs, tex, 3.0, 0.25, 0.7)
			sl.material = _mcache[key]
	return root

# ------------------------------------------------------------------ ground
def meadow(name='meadow', size=(140, 140), centre=(0, 20), hills=(), shore_y=None, res=220, seed=2):
	global SHORE_Y
	if shore_y is not None: SHORE_Y = shore_y
	"""grass ground: big subdivided plane with gentle noise + hills [(x, y, r, h)], dropping under the sea beyond shore_y
	(a wobbly coast line); grass texture (leafy_grass) tinted by a large-scale noise for colour patches"""
	bm = bmesh.new()
	bmesh.ops.create_grid(bm, x_segments=res, y_segments=res, size=0.5)
	for v in bm.verts:
		x = centre[0] + v.co.x * size[0]; y = centre[1] + v.co.y * size[1]
		z = 0.12 * noise.noise(Vector((x * 0.08, y * 0.08, seed))) + 0.35 * noise.noise(Vector((x * 0.02, y * 0.02, seed + 3)))
		for hx, hy, hr, hh in hills:
			d = math.hypot(x - hx, y - hy) / hr
			if d < 1.6: z += hh * math.exp(-d * d * 2.2)
		if shore_y is not None:
			sy = shore_y + 2.5 * noise.noise(Vector((x * 0.05, 7.0, seed))) + 1.2 * noise.noise(Vector((x * 0.21, 3.0, seed)))
			if y > sy:
				z = min(z, 0.25) - (y - sy) * 0.22
		v.co = Vector((x, y, z))
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	m = grass_mat(name + '_m')
	o = obj_from_mesh(name, me, m)
	return o

def grass_mat(name):
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1200, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (900, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0)); g = node(nt, 'ShaderNodeNewGeometry', (-1200, -200))
	d_, r_, n_ = texset(nt, 'leafy_grass', g.outputs['Position'], 0.6)
	nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.05; nz.inputs['Detail'].default_value = 3; link(nt, g.outputs['Position'], nz.inputs['Vector'])
	tint = RAMP(nt, nz.outputs['Fac'], [(0.3, C('#2f7a24')), (0.55, C('#4a952f')), (0.75, C('#6fa338'))], interp='LINEAR')
	bw = node(nt, 'ShaderNodeRGBToBW'); link(nt, d_, bw.inputs[0])
	col = MIX(nt, 1.0, tint, M(nt, 'MULTIPLY_ADD', bw.outputs[0], 1.1, 0.5), 'MULTIPLY')
	# rocky/sandy shore and anything below z 0.1 → sand
	sep = SEP(nt, g.outputs['Position'])
	shore = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', M(nt, 'ADD', sep[1], M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nz.outputs['Fac'], 0.5), 3.0)), SHORE_Y - 1.2), 0.8, clamp=True)
	col = MIX(nt, shore, col, C('#cdb48a'))
	link(nt, col, bs.inputs['Base Color'])
	put(nt, bs.inputs['Roughness'], M(nt, 'MULTIPLY_ADD', r_, 0.3, 0.65))
	n_.node.inputs['Strength'].default_value = 0.8; link(nt, n_, bs.inputs['Normal'])
	try: bs.inputs['Specular IOR Level'].default_value = 0.25
	except Exception: pass
	return m

def soil_mat(name='soil'):
	m = pbr(name, '#a8805a', 'farm_soil', 1.5, 0.75, 0.95, normal=1.2, spec=0.2)
	return m

def potato_patch(name, x0, x1, y0, y1, rows=5, plants=True, potatoes=28, seed=4, z=0.0, keep_clear=()):
	"""hilled soil bed (rows along X, one displaced grid), bushy potato plants on the ridges, loose potatoes in the furrows.
	keep_clear = [(x, y, r)] where no plant may grow (the pig, the camera path)"""
	rnd = random.Random(seed)
	sm = soil_mat()
	nx, ny = 160, 90; dy = (y1 - y0) / rows
	bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=0.5)
	for v in bm.verts:
		x = (x0 + x1) / 2 + v.co.x * (x1 - x0 + 0.5); y = (y0 + y1) / 2 + v.co.y * (y1 - y0 + 0.5)
		ridge = 0.5 + 0.5 * math.cos(2 * math.pi * ((y - y0) / dy - 0.5))
		edge = min(1.0, max(0.0, min(x - x0 + 0.25, x1 + 0.25 - x, y - y0 + 0.25, y1 + 0.25 - y) / 0.3))
		zz = (0.02 + 0.075 * ridge ** 1.3 + 0.012 * noise.noise(Vector((x * 9, y * 9, seed)))) * edge - 0.02 * (1 - edge)
		v.co = Vector((x, y, z + zz))
	me = bpy.data.meshes.new(name + '_bed'); bm.to_mesh(me); bm.free()
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	bed = obj_from_mesh(name + '_bed', me, sm)
	objs = [bed]
	if plants:
		protos = ['plant_bushSmall', 'plant_bush', 'plant_bushDetailed']
		for r in range(rows):
			yc = y0 + dy * (r + 0.5)
			n = int((x1 - x0) / 0.34)
			for k in range(n):
				x = x0 + (k + 0.5) * (x1 - x0) / n + rnd.uniform(-0.06, 0.06)
				y = yc + rnd.uniform(-0.04, 0.04)
				if any(math.hypot(x - cx, y - cy) < cr for cx, cy, cr in keep_clear): continue
				p = glb(NK / f'{rnd.choice(protos)}.glb', f'{name}_pl{r}_{k}', (x, y, z + 0.08), rnd.uniform(0, 6.28), rnd.uniform(0.32, 0.45),
				        tint={'leafsGreen': '#3f8a3a', 'leafsDark': '#2f7232', 'grass': '#4d9a3a', 'woodBark': '#5a4a32'})
				objs.append(p)
	pots = []
	for k in range(potatoes):
		r = rnd.randrange(rows); yy = y0 + dy * r + rnd.uniform(-0.05, 0.05); xx = rnd.uniform(x0, x1)
		sz = rnd.uniform(0.75, 1.1); rot = (rnd.uniform(0, 3), rnd.uniform(0, 3), rnd.uniform(0, 3))
		if any(math.hypot(xx - cx, yy - cy) < cr for cx, cy, cr in keep_clear): continue
		pt = pw.potato(f'{name}_pot{k}', sz)
		pt.location = (xx, yy, z + 0.035); pt.rotation_euler = rot
		pots.append(pt)
	return objs, pots

def firs(name, pts, smin=1.6, smax=2.6, seed=3):
	"""Douglas firs: tall Kenney pines, deep blue-green"""
	rnd = random.Random(seed); out = []
	kinds = ['tree_pineTallA_detailed', 'tree_pineTallB_detailed', 'tree_pineTallC_detailed', 'tree_pineTallD_detailed']
	for i, (x, y, z) in enumerate(pts):
		out.append(glb(NK / f'{rnd.choice(kinds)}.glb', f'{name}{i}', (x, y, z), rnd.uniform(0, 6.28), rnd.uniform(smin, smax)))
	return out

def rocks(name, pts, s=(0.6, 1.4), seed=5):
	rnd = random.Random(seed); out = []
	kinds = ['rock_largeA', 'rock_largeB', 'rock_largeC', 'rock_largeD', 'rock_tallA', 'rock_smallC']
	for i, (x, y, z) in enumerate(pts):
		out.append(glb(NK / f'{rnd.choice(kinds)}.glb', f'{name}{i}', (x, y, z), rnd.uniform(0, 6.28), rnd.uniform(*s),
		               tint={'stone': '#8f8c92', 'dirt': '#7d7a80', 'rock': '#8f8c92', 'colormap': '#8f8c92'}))
	return out

def scatter_grass(name, box, n, seed=6, z=0.0, kinds=('grass', 'grass_large', 'flower_yellowA', 'flower_purpleA', 'grass_leafs'), s=(0.5, 0.9), avoid=None):
	"""tufts + flowers (the San Juan prairie had camas: purple) — instanced by linked duplicates for speed"""
	rnd = random.Random(seed); protos = {}
	for k in kinds:
		protos[k] = glb(NK / f'{k}.glb', f'{name}_{k}', (0, 0, -50), 0, 1.0,
		                tint={'grass': '#5fa03e', 'leafsGreen': '#4f9638', 'colorYellow': '#ffd34a', 'colorPurple': '#8f63d8', 'colorRed': '#e04848'})
	out = []
	x0, x1, y0, y1 = box
	for i in range(n):
		x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
		if avoid and avoid(x, y): continue
		k = rnd.choice(kinds)
		src = protos[k]
		root = empty(f'{name}{i}', (x, y, z), None); root.rotation_euler = (0, 0, rnd.uniform(0, 6.28)); sc_ = rnd.uniform(*s); root.scale = (sc_,) * 3
		for ch in src.children:
			d = ch.copy(); bpy.context.scene.collection.objects.link(d); d.parent = root; d.location = ch.location
		out.append(root)
	return out

def sea(name='sea', size=(900, 900), loc=(0, 300)):
	o, tv = water2(name, size, loc, col='#3a9cc0', deep='#17648e', z=SEA, scale=0.8)
	WATER_T.append(tv)
	return o

def mountain(name, loc, r, h, snow=0.55, seed=1, haze=0.45, sky='#c9a8d8'):
	"""distant volcano / range: noisy cone, rock → snow by height, mixed towards the sky colour (aerial perspective)"""
	bm = bmesh.new(); n = 64; rings = 24
	top = bm.verts.new((0, 0, h))
	prev = None; ringsv = []
	for j in range(1, rings + 1):
		rr = r * j / rings; ring = []
		for i in range(n):
			a = 2 * math.pi * i / n
			x, y = math.cos(a) * rr, math.sin(a) * rr
			zz = h * (1 - (j / rings) ** 0.75) + h * 0.06 * noise.noise(Vector((x * 3 / r, y * 3 / r, seed))) * (j / rings)
			ring.append(bm.verts.new((x, y, max(0.0, zz))))
		ringsv.append(ring)
	for i in range(n): bm.faces.new((top, ringsv[0][i], ringsv[0][(i + 1) % n]))
	for j in range(rings - 1):
		a_, b_ = ringsv[j], ringsv[j + 1]
		for i in range(n): bm.faces.new((a_[i], b_[i], b_[(i + 1) % n], a_[(i + 1) % n]))
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	m = bpy.data.materials.new(name + '_m'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (900, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (600, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	tc = node(nt, 'ShaderNodeTexCoord'); sep = SEP(nt, tc.outputs['Object'])
	nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6.0; link(nt, tc.outputs['Object'], nz.inputs['Vector'])
	k = M(nt, 'ADD', M(nt, 'DIVIDE', sep[2], h), M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nz.outputs['Fac'], 0.5), 0.25))
	col = RAMP(nt, k, [(0.0, C('#5a6b5a')), (snow - 0.04, C('#7d7f8c')), (snow, C('#f4f4fa')), (1.0, C('#ffffff'))], interp='LINEAR')
	col = MIX(nt, haze, col, C(sky))
	link(nt, col, bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.8
	o = obj_from_mesh(name, me, m, loc)
	return o

# ------------------------------------------------------------------ buildings / props
def log_cabin(name, loc=(0, 0, 0), yaw=0.0, w=2.2, d=1.7, h=1.25, door_side='front'):
	"""settler's log cabin: stacked round logs with crossed corners, plank door (hinge pivot returned), window with shutters,
	shingle roof, stone chimney. Front = −Y."""
	R = empty(name, loc); R.rotation_euler = (0, 0, yaw)
	lm = pbr(name + '_log', '#8a6240', 'pine_bark', 2.5, 0.55, 0.7)
	cutm = pbr(name + '_cut', '#d6b07c', rough=0.8)
	r = 0.085; n = int(h / (2 * r * 0.92))
	for k in range(n):
		z = r + k * 2 * r * 0.92
		for side in (-1, 1):
			if not (side == -1 and k < int(0.85 / (2 * r * 0.92)) and False):
				o = cyl(f'{name}_lx{k}{side}', lm, (0, side * d / 2, z), r, w + 0.3, parent=R, seg=12, rot=(0, math.pi / 2, 0))
			o2 = cyl(f'{name}_ly{k}{side}', lm, (side * w / 2, 0, z + r * 0.9), r, d + 0.3, parent=R, seg=12, rot=(math.pi / 2, 0, 0))
	# door opening: dark recess + plank door on a hinge pivot (left edge)
	dw, dh = 0.46, 0.82
	cube(name + '_dark', pbr(name + '_in', '#1b1310', rough=0.9), (0.25, -d / 2 - 0.02, dh / 2 + 0.02), (dw / 2, 0.06, dh / 2), parent=R)
	hinge = empty(name + '_hinge', (0.25 - dw / 2, -d / 2 - 0.1, 0.02), R)
	dm = pbr(name + '_door', '#9a6e45', 'weathered_planks', 2.0, 0.6, 0.7)
	cube(name + '_doorp', dm, (dw / 2, 0, dh / 2), (dw / 2, 0.025, dh / 2), parent=hinge, bev=0.01)
	for zz in (0.18, 0.62):
		cube(f'{name}_dbr{zz}', pbr(name + '_iron', '#2b2a2c', rough=0.4, metal=0.8), (dw / 2, -0.03, zz), (dw / 2 * 0.95, 0.01, 0.025), parent=hinge)
	# window
	cube(name + '_win', pbr(name + '_glass', '#2a3442', rough=0.1), (-0.55, -d / 2 - 0.03, 0.72), (0.2, 0.03, 0.17), parent=R)
	cube(name + '_winf', cutm, (-0.55, -d / 2 - 0.05, 0.72), (0.23, 0.02, 0.025), parent=R)
	# roof (two shingle slabs) + gables
	rm = pbr(name + '_roof', '#7a5a3e', 'roof_planks', 2.0, 0.6, 0.75)
	rise = 0.55; zt = n * 2 * r * 0.92 + 0.05
	for side in (-1, 1):
		ang = math.atan2(rise, d / 2 + 0.25)
		ln = math.hypot(rise, d / 2 + 0.25)
		o = cube(f'{name}_roof{side}', rm, (0, side * (d / 4 + 0.12), zt + rise / 2), (w / 2 + 0.35, ln / 2 + 0.04, 0.04), parent=R, bev=0.01)
		o.rotation_euler = (side * -ang, 0, 0)
	bm = bmesh.new()
	for sx in (-1, 1):
		vs = [bm.verts.new((sx * w / 2, -d / 2 - 0.1, zt)), bm.verts.new((sx * w / 2, d / 2 + 0.1, zt)), bm.verts.new((sx * w / 2, 0, zt + rise))]
		bm.faces.new(vs)
	me = bpy.data.meshes.new(name + '_gab'); bm.to_mesh(me); bm.free()
	g = obj_from_mesh(name + '_gab', me, lm, parent=R); g.modifiers.new('s', 'SOLIDIFY').thickness = 0.12
	# stone chimney on the right gable
	sm = pbr(name + '_stone', '#9c948c', 'seaside_rock', 1.5, 0.6, 0.85)
	cube(name + '_chim', sm, (w / 2 + 0.18, 0.25, (zt + rise + 0.4) / 2), (0.18, 0.2, (zt + rise + 0.4) / 2), parent=R, bev=0.02)
	return {'root': R, 'hinge': hinge, 'chimney_top': Vector((w / 2 + 0.18, 0.25, zt + rise + 0.45)), 'front_y': -d / 2}

def rail_fence(name, p0, p1, h=0.55, seg=1.6, mat_=None):
	"""split-rail fence along p0→p1: posts + 3 rails"""
	m = mat_ or pbr(name + '_w', '#8d6a49', 'pine_bark', 2.5, 0.5, 0.75)
	p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; n = max(1, int(d.length / seg))
	R = empty(name)
	yaw = math.atan2(d.y, d.x)
	for k in range(n + 1):
		p = p0 + d * (k / n)
		cyl(f'{name}_post{k}', m, (p.x, p.y, h / 2), 0.04, h, parent=R, seg=8)
	for j, z in enumerate((h * 0.35, h * 0.65, h * 0.92)):
		for k in range(n):
			a = p0 + d * (k / n); b = p0 + d * ((k + 1) / n); c = (a + b) / 2
			o = cyl(f'{name}_rail{j}{k}', m, (c.x, c.y, z), 0.028, (b - a).length + 0.1, parent=R, seg=8, rot=(0, math.pi / 2, yaw))
			o.rotation_euler = (0, math.pi / 2, 0); o.rotation_euler.rotate_axis('Z', 0)
			o.rotation_mode = 'XYZ'; o.rotation_euler = (math.pi / 2, 0, yaw + math.pi / 2)
	return R

def flagpole(name, loc, flag, h=3.2, size=(0.62, 0.38), parent=None):
	import frigate
	R = empty(name, loc, parent)
	cyl(name + '_pole', pbr('pole', '#e9e4d8', rough=0.4), (0, 0, h / 2), 0.03, h, parent=R, seg=10)
	prim('sphere', name + '_ball', pw.mat('gold', '#f0c14b', 0.3, 0.8), (0, 0, h + 0.03), (0.05,) * 3).parent = R
	fl = frigate.flag_obj(name + '_cloth', flag, (-size[0] - 0.03, 0, h - size[1] - 0.05), size, R)
	FLAGS_W.append(fl)
	return R, fl
FLAGS_W = []

def field_cannon(name, loc, yaw=0.0, s=1.0):
	"""Kenney pirate-kit cannon on a carriage, re-tinted bronze barrel + olive carriage (US 12-pdr howitzer look)"""
	return glb(PK / 'cannon-mobile.glb', name, loc, yaw, s, tint={'metal': '#3b3a3c', 'wood': '#5d6b3a', 'woodDark': '#4a5530', 'iron': '#2a2a2c'})

def tent(name, loc, yaw=0.0, s=1.0, col='#e9e1cf'):
	return glb(NK / 'tent_detailedOpen.glb', name, loc, yaw, s, tint={'colorRed': col, 'wood': '#8a6a48'})

def _flags_tick(t):
	for i, fl in enumerate(FLAGS_W):
		fl.modifiers['wave'].time_offset = -t * 30 - i * 7
pw.UPDATERS.append(_flags_tick)
