"""v2 look for «The Yellow Fleet» (owner 21.10: «textures, people, everything looks cheap»): real light instead of flat toon.
EEVEE with ray-traced reflections/AO and soft sun shadows, AgX colour; world = channel violet/peach gradient for the camera +
a CC0 sunset HDRI for lighting; PBR materials from CC0 Poly Haven textures (painted/rusty metal, deck planks, sand, brick);
bevelled, detailed 1960s cargo liner (round bilge, sheer stripe, portholes, window rows, railings, davits, cowl vents);
reflective stylised water with animated waves; Kenney Mini Characters (CC0) with their own animations as sailors.
Shot scripts:  from kit import *; from yf2 import *  → setup2(t0, t1) → build → render(update, name)."""
import bpy, bmesh, math
from pathlib import Path
import numpy as np
from mathutils import Vector
from kit import *
import kit

CC0 = kit.ROOT / 'assets/cc0'
PH = CC0 / 'polyhaven'
CHAR = CC0 / 'kenney-mini-characters/Models/GLB format'
FLAGS = kit.ROOT / 'assets/flags'

def hexc(h):
	return (*C(h), 1.0)

# ------------------------------------------------------------------ render setup
def setup2(t0, t1, samples=None):
	sc_ = setup(t0, t1)
	sc_.eevee.taa_render_samples = int(samples or arg('samples', 32))
	for k, v in (('use_raytracing', True), ('use_shadows', True), ('use_volumetric_shadows', False)):
		try: setattr(sc_.eevee, k, v)
		except Exception: pass
	try:
		sc_.eevee.ray_tracing_options.resolution_scale = '1'
		sc_.eevee.ray_tracing_method = 'SCREEN'
	except Exception:
		pass
	try:
		sc_.eevee.fast_gi_method = 'GLOBAL_ILLUMINATION'; sc_.eevee.use_fast_gi = True
	except Exception:
		pass
	sc_.view_settings.view_transform = 'Khronos PBR Neutral'      # keeps the stylised base colours saturated (AgX greyed them)
	sc_.view_settings.look = 'None'
	sc_.view_settings.exposure = float(arg('exposure', 0.0))
	sc_.render.filter_size = 1.2
	return sc_

SKY_V2 = [(0.0, (1.0, 0.78, 0.55)), (0.08, (1.0, 0.60, 0.55)), (0.2, (0.86, 0.46, 0.70)), (0.36, (0.48, 0.32, 0.78)), (0.62, (0.20, 0.15, 0.50))]
def world2(stops=SKY_V2, hdri='belfast_sunset_puresky_2k.hdr', light=0.7, cam=1.0, rot=0.0, fog=None):
	"""camera sees the channel's violet gradient; lighting/reflections come from a real sunset HDRI"""
	wd = bpy.data.worlds.new('sky2'); bpy.context.scene.world = wd; wd.use_nodes = True
	nt = wd.node_tree; nt.nodes.clear()
	wo = node(nt, 'ShaderNodeOutputWorld', (900, 0))
	tc = node(nt, 'ShaderNodeTexCoord', (-900, 0))
	mp = node(nt, 'ShaderNodeMapping', (-700, 200)); mp.inputs['Rotation'].default_value = (0, 0, math.radians(rot))
	link(nt, tc.outputs['Generated'], mp.inputs['Vector'])
	env = node(nt, 'ShaderNodeTexEnvironment', (-500, 200)); env.image = bpy.data.images.load(str(PH / hdri), check_existing=True)
	link(nt, mp.outputs['Vector'], env.inputs['Vector'])
	bgL = node(nt, 'ShaderNodeBackground', (-200, 200)); link(nt, env.outputs['Color'], bgL.inputs['Color']); bgL.inputs['Strength'].default_value = light
	sep = node(nt, 'ShaderNodeSeparateXYZ', (-700, -200)); link(nt, tc.outputs['Generated'], sep.inputs['Vector'])
	col = RAMP(nt, sep.outputs['Z'], stops, interp='LINEAR')
	bgC = node(nt, 'ShaderNodeBackground', (-200, -200)); link(nt, col, bgC.inputs['Color']); bgC.inputs['Strength'].default_value = cam
	lp = node(nt, 'ShaderNodeLightPath', (-200, 450))
	mix = node(nt, 'ShaderNodeMixShader', (400, 0))
	link(nt, lp.outputs['Is Camera Ray'], mix.inputs['Fac']); link(nt, bgL.outputs[0], mix.inputs[1]); link(nt, bgC.outputs[0], mix.inputs[2])
	link(nt, mix.outputs[0], wo.inputs['Surface'])
	fog = FOG if fog is None else fog
	if fog:
		pv = node(nt, 'ShaderNodeVolumePrincipled', (400, -400)); pv.inputs['Density'].default_value = fog
		pv.inputs['Color'].default_value = (1.0, 0.86, 0.80, 1); pv.inputs['Anisotropy'].default_value = 0.35
		link(nt, pv.outputs[0], wo.inputs['Volume'])
		sc_ = bpy.context.scene
		for k, v in (('volumetric_start', 2.0), ('volumetric_end', 900.0), ('volumetric_tile_size', '8'), ('volumetric_samples', 48)):
			try: setattr(sc_.eevee, k, v)
			except Exception: pass
	return wd
FOG = 0.0

def sun2(energy=4.5, color=(1.0, 0.82, 0.62), rot=(62, 0, 30), angle=3.0):
	d = bpy.data.lights.new('sun', 'SUN'); d.energy = energy; d.color = color; d.angle = math.radians(angle)
	o = bpy.data.objects.new('sun', d); bpy.context.scene.collection.objects.link(o)
	o.rotation_euler = tuple(math.radians(a) for a in rot)
	return o

# ------------------------------------------------------------------ PBR materials
_imgs = {}
def img(path, non_color=False):
	k = (str(path), non_color)
	if k not in _imgs:
		im = bpy.data.images.load(str(path), check_existing=True)
		if non_color: im.colorspace_settings.name = 'Non-Color'
		_imgs[k] = im
	return _imgs[k]

def texset(nt, name, vec, scale=1.0):
	"""Poly Haven set → (diffuse colour output, roughness output, normal-map node output) with box/world mapping"""
	mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale, scale)
	nt.links.new(vec, mp.inputs['Vector'])
	outs = []
	for f, nc in (('diff', False), ('rough', True), ('nor', True)):
		ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = img(PH / name / f'{f}.jpg', nc); ti.projection = 'BOX'; ti.projection_blend = 0.25
		nt.links.new(mp.outputs['Vector'], ti.inputs['Vector']); outs.append(ti)
	nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.6
	nt.links.new(outs[2].outputs['Color'], nm.inputs['Color'])
	return outs[0].outputs['Color'], outs[1].outputs['Color'], nm.outputs['Normal']

DUSTN = {}
def pbr(name, base='#ffffff', tex=None, scale=1.0, tex_amt=0.35, rough=0.55, metal=0.0, dust_id=None, rust=False, coords='Object',
        normal=0.6, spec=0.5, emit=None, plates=False):
	"""Principled material: flat livery colour × a desaturated grime layer from a Poly Haven texture (tex_amt), texture roughness
	and normal; optional per-ship DUST value (sand tint) and rust streaks (rusty_metal_02) that grow with it"""
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1200, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (900, 0))
	link(nt, bs.outputs[0], out.inputs['Surface'])
	tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0)); vec = tc.outputs[coords]
	col = hexc(base) if isinstance(base, str) else (*base, 1)
	colo = None
	if tex:
		d_, r_, n_ = texset(nt, tex, vec, scale)
		bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(d_, bw.inputs[0])
		grime = MIX(nt, 1.0, (1, 1, 1), M(nt, 'MULTIPLY', bw.outputs[0], 2.0), 'MIX')
		colo = MIX(nt, tex_amt, col, MIX(nt, 1.0, col, grime, 'MULTIPLY'))
		rr = M(nt, 'MULTIPLY_ADD', r_, 0.5, rough * 0.5)
		put(nt, bs.inputs['Roughness'], rr)
		nm = n_.node; nm.inputs['Strength'].default_value = normal
		nt.links.new(n_, bs.inputs['Normal'])
	else:
		colo = MIX(nt, 0.0, col, col)
		bs.inputs['Roughness'].default_value = rough
	if dust_id is not None:
		v = node(nt, 'ShaderNodeValue', (-1200, 400)); v.label = 'DUST'; v.outputs[0].default_value = 0.0
		DUSTN.setdefault(dust_id, []).append(v)
		colo = MIX(nt, M(nt, 'MULTIPLY', v.outputs[0], 0.78), colo, C('#d6ad5c'))
		if rust:
			d2, _, _ = texset(nt, 'rusty_metal_02', vec, scale * 1.3)
			mp = node(nt, 'ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.4, 2.4, 0.3); link(nt, vec, mp.inputs['Vector'])
			nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 3.0
			link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
			st = M(nt, 'GREATER_THAN', nz.outputs['Fac'], 0.56)
			colo = MIX(nt, M(nt, 'MULTIPLY', st, v.outputs[0]), colo, d2)
	put(nt, bs.inputs['Base Color'], colo)
	if plates:     # welded hull plates: horizontal strakes + vertical butts, as a small bump on top of the texture normal
		wz = node(nt, 'ShaderNodeTexWave'); wz.wave_type = 'BANDS'; wz.bands_direction = 'Z'; wz.inputs['Scale'].default_value = 3.2
		wz.wave_profile = 'SAW'; link(nt, vec, wz.inputs['Vector'])
		wx = node(nt, 'ShaderNodeTexWave'); wx.wave_type = 'BANDS'; wx.bands_direction = 'X'; wx.inputs['Scale'].default_value = 1.1
		wx.wave_profile = 'SAW'; link(nt, vec, wx.inputs['Vector'])
		seam = M(nt, 'MAXIMUM', M(nt, 'GREATER_THAN', wz.outputs['Fac'], 0.96), M(nt, 'GREATER_THAN', wx.outputs['Fac'], 0.985))
		bp = node(nt, 'ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35; bp.inputs['Distance'].default_value = 0.01
		link(nt, seam, bp.inputs['Height'])
		if bs.inputs['Normal'].is_linked: link(nt, bs.inputs['Normal'].links[0].from_socket, bp.inputs['Normal'])
		link(nt, bp.outputs['Normal'], bs.inputs['Normal'])
	bs.inputs['Metallic'].default_value = metal
	try: bs.inputs['Specular IOR Level'].default_value = spec
	except Exception: pass
	if emit:
		bs.inputs['Emission Color'].default_value = hexc(emit[0]); bs.inputs['Emission Strength'].default_value = emit[1]
	return m

def set_dust2(sid, d):
	for v in DUSTN.get(sid, []): v.outputs[0].default_value = d

def bevel(o, w=0.03, seg=2):
	b = o.modifiers.new('bev', 'BEVEL'); b.width = w; b.segments = seg; b.limit_method = 'ANGLE'; b.harden_normals = False
	return b

def cube(name, mat, loc, half, parent=None, bev=0.0, rot=(0, 0, 0)):
	o = prim('cube', name, mat, loc, half, rot=rot, smooth_=False, parent=parent)
	if bev: bevel(o, bev)
	return o

def cyl(name, mat, loc, r, h, parent=None, seg=16, rot=(0, 0, 0), r2=None):
	kw = {'seg': seg}
	if r2 is not None: kw['r2'] = r2
	return prim('cyl', name, mat, loc, (r, r if not isinstance(r, tuple) else r[1], h / 2) if not isinstance(r, tuple) else (r[0], r[1], h / 2), rot=rot, parent=parent, **kw)

# ------------------------------------------------------------------ the detailed 1960s cargo liner
_wire_m = {}
def wire(name, p0, p1, r=0.006, parent=None, col='#2b2a30'):
	"""thin cable between two points (parent-local)"""
	if col not in _wire_m: _wire_m[col] = pbr('wire' + col, col, rough=0.45, metal=0.6)
	p0, p1 = Vector(p0), Vector(p1); d = p1 - p0
	o = prim('cyl', name, _wire_m[col], (p0 + p1) / 2, (r, r, d.length / 2), seg=6, parent=parent)
	o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
	return o

def hull_half_width(x, L, B, stern_w=0.62):
	u = x / (L / 2)
	if u > 0.3: return B / 2 * max(0.012, 1 - ((u - 0.3) / 0.7) ** 1.7)
	if u < -0.65: return B / 2 * (stern_w + (1 - stern_w) * math.sqrt(max(0, 1 - ((-u - 0.65) / 0.35) ** 2)))
	return B / 2

def bulwark(name, L, B, dz, x0, x1, h, mat, parent, n=18, bow=True):
	"""solid bulwark along both hull edges from x0 to x1 (joined at the stem when bow=True)"""
	bm = bmesh.new()
	xs = list(np.linspace(x0, x1, n))
	side = []
	for s_ in (-1, 1):
		row = []
		for x in xs:
			w = hull_half_width(x, L, B) - 0.004
			row.append((bm.verts.new((x, s_ * w, dz(x) - 0.01)), bm.verts.new((x, s_ * w, dz(x) + h))))
		side.append(row)
	for row in side:
		for (a0, a1), (b0, b1) in zip(row, row[1:]):
			bm.faces.new((a0, b0, b1, a1))
	if bow:
		(a0, a1), (b0, b1) = side[0][-1], side[1][-1]
		bm.faces.new((a0, b0, b1, a1))
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	o = obj_from_mesh(name, me, mat, parent=parent)
	sd = o.modifiers.new('sd', 'SOLIDIFY'); sd.thickness = 0.012; sd.offset = 0
	return o

def ship_extras(sh, B, small, m_hull, m_sup, m_win, m_mast, m_white, tiers, fx, fz, fh):
	"""quality pass: forecastle + poop bulwarks, a proper wheelhouse with a window band and visor, radar mast, foremast
	yard, stays/shrouds, topping lifts + cargo runners on the derricks, radio aerial, anchors in their hawse pipes"""
	root, sid, L, k, dz, sx, bz = sh['root'], sh['sid'], sh['L'], sh['k'], sh['deckz'], sh['supx'], sh['bridgez']
	bulwark(f'{sid}_fcbw', L, B, dz, L * 0.3, L / 2 - 0.02 * k, 0.13 * k, m_hull, root)
	bulwark(f'{sid}_pobw', L, B, dz, -L / 2 + 0.05 * k, -L * 0.36, 0.11 * k, m_hull, root, n=10, bow=False)
	# wheelhouse on the top tier: continuous window band with mullions, overhanging visor, wings already exist
	lx, by, hz = tiers[-1]; lx *= k; by *= k * B / 2.0
	cx = sx - 0.15 * (len(tiers) - 1) * k
	wx = cx + lx / 2 - 0.42 * k
	cube(f'{sid}_wh', m_sup, (wx, 0, bz + 0.15 * k), (0.4 * k, by * 0.46, 0.15 * k), parent=root, bev=0.012 * k)
	cube(f'{sid}_whband', m_win, (wx + 0.401 * k, 0, bz + 0.17 * k), (0.004, by * 0.44, 0.065 * k), parent=root)
	for s_ in (-1, 1):
		cube(f'{sid}_whsb{s_}', m_win, (wx + 0.05 * k, s_ * (by * 0.46 + 0.003), bz + 0.17 * k), (0.3 * k, 0.004, 0.065 * k), parent=root)
	nm = max(3, int(by * 0.88 / (0.11 * k)))
	for j in range(nm + 1):
		y = -by * 0.44 + j * by * 0.88 / nm
		cube(f'{sid}_whm{j}', m_sup, (wx + 0.405 * k, y, bz + 0.17 * k), (0.004, 0.006 * k, 0.066 * k), parent=root)
	cube(f'{sid}_visor', m_sup, (wx + 0.42 * k, 0, bz + 0.3 * k), (0.06 * k, by * 0.5, 0.012 * k), parent=root)
	# radar mast + scanner on the wheelhouse roof
	rmx = wx - 0.15 * k; rtop = bz + 0.3 * k + 0.75 * k
	cyl(f'{sid}_rmast', m_mast, (rmx, 0, bz + 0.3 * k + 0.375 * k), 0.022 * k, 0.75 * k, parent=root, seg=10)
	cube(f'{sid}_radar', m_white, (rmx, 0, rtop - 0.18 * k), (0.03 * k, 0.22 * k, 0.018 * k), parent=root)
	cube(f'{sid}_ryard', m_mast, (rmx, 0, rtop - 0.06 * k), (0.012 * k, 0.3 * k, 0.01 * k), parent=root)
	# foremast yard + masthead light, forestay to the stem, shrouds to the bulwark
	mx = 6.3 * k
	if not small:
		mtop = dz(mx) + 1.7 * k
		cube(f'{sid}_fyard', m_mast, (mx, 0, mtop - 0.3 * k), (0.012 * k, 0.38 * k, 0.012 * k), parent=root)
		stem = Vector((L / 2 - 0.05 * k, 0, dz(L / 2) + 0.12 * k))
		wire(f'{sid}_fstay', (mx, 0, mtop - 0.02 * k), stem, 0.005 * k, root)
		for s_ in (-1, 1):
			wire(f'{sid}_shr{s_}', (mx, 0, mtop - 0.3 * k), (mx - 0.55 * k, s_ * (hull_half_width(mx - 0.55 * k, L, B) - 0.02), dz(mx - 0.55 * k) + 0.02), 0.004 * k, root)
		# radio aerial: foremast top → radar mast top
		wire(f'{sid}_aer', (mx, 0, mtop - 0.05 * k), (rmx, 0, rtop - 0.02 * k), 0.003 * k, root)
		# derricks: topping lifts and cargo runners with hooks
		for kx in (4.3 * k, -5.2 * k):
			sg = 1 if kx > 0 else -1
			for s_ in (-1, 1):
				y = s_ * 0.55 * k
				tip = Vector((kx + sg * 0.99 * k, y, dz(kx) + 0.944 * k))
				wire(f'{sid}_tl{kx:.1f}{s_}', (kx, y, dz(kx) + 1.08 * k), tip, 0.004 * k, root)
				hook = Vector((tip.x, y * 0.4, dz(tip.x) + 0.45 * k))
				wire(f'{sid}_cr{kx:.1f}{s_}', tip, hook, 0.003 * k, root)
				prim('sphere', f'{sid}_hk{kx:.1f}{s_}', m_mast, hook, (0.02 * k, 0.02 * k, 0.03 * k), u=8, v=6, parent=root)
		# funnel guys
		for s_ in (-1, 1):
			for dx in (-0.3, 0.3):
				wire(f'{sid}_fg{s_}{dx}', (fx, s_ * 0.2 * k, fz + fh * 0.85), (fx + dx * k, s_ * 0.85 * k * B / 2, fz + 0.02), 0.0025 * k, root)
	# anchors in their hawse pipes (both bows)
	ax = L / 2 - 0.9 * k
	for s_ in (-1, 1):
		w = hull_half_width(ax, L, B)
		o = prim('cyl', f'{sid}_hawse{s_}', pbr('hawse', '#16151a', rough=0.6), (ax, s_ * (w + 0.002), dz(ax) - 0.1 * k), (0.045 * k, 0.045 * k, 0.01), seg=14, rot=(math.pi / 2, 0, 0), parent=root)
		cube(f'{sid}_anchor{s_}', pbr('anchor', '#2c2a2e', rough=0.5, metal=0.6), (ax - 0.02 * k, s_ * (w + 0.012), dz(ax) - 0.2 * k), (0.035 * k, 0.008, 0.08 * k), parent=root, bev=0.006)

def ship_name(sh, text, size=0.11):
	"""white bow lettering on both sides (a real name from FACTS.md only)"""
	root, L, k, dz = sh['root'], sh['L'], sh['k'], sh['deckz']
	m = pbr('namepaint', '#f4f1ea', rough=0.5)
	x = L * 0.155                      # where the side is still straight (the bow starts curving at 0.15 L)
	B = sh['B']
	for s_ in (-1, 1):
		cu = bpy.data.curves.new(f"{sh['sid']}_name{s_}", 'FONT'); cu.body = text; cu.size = size * k; cu.extrude = 0.002
		cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
		o = bpy.data.objects.new(f"{sh['sid']}_name{s_}", cu); bpy.context.scene.collection.objects.link(o); o.parent = root
		w = hull_half_width(x, L, B)
		o.location = (x, s_ * (w + 0.004), dz(x) - 0.12 * k)
		o.rotation_euler = (math.pi / 2, 0, 0 if s_ < 0 else math.pi)
		cu.materials.append(m)

LIV = {
	'bluefunnel': dict(hull='#22202a', sup='#efe9dc', fun='#3f7fc4', top='#151219', band=None, flag='red_ensign'),
	'portline': dict(hull='#22202a', sup='#efe9dc', fun='#cf3b2e', top='#151219', band=None, flag='red_ensign'),
	'bluestar': dict(hull='#2c2b34', sup='#efe9dc', fun='#d2402f', top='#151219', band='#ffffff', flag='red_ensign'),
	'hapag': dict(hull='#22202a', sup='#f3eee4', fun='#e9a43a', top='#151219', band='#ffffff', flag='west_germany'),
	'nordwind': dict(hull='#2b2b33', sup='#f3eee4', fun='#f3eee4', top='#151219', band='#2f5fb0', flag='west_germany'),
	'swedish': dict(hull='#5c6977', sup='#f3eee4', fun='#f2c331', top='#151219', band='#2f6fb5', flag='sweden'),
	'polish': dict(hull='#22202a', sup='#efe9dc', fun='#151219', top='#151219', band='#d63a3a', flag='poland'),
	'bulgarian': dict(hull='#4f5866', sup='#efe9dc', fun='#efe9dc', top='#151219', band='#2e9a62', flag='bulgaria'),
	'czech': dict(hull='#e6e1d5', sup='#efe9dc', fun='#2d5ea8', top='#151219', band='#ffffff', flag='czechoslovakia'),
	'french': dict(hull='#efe9de', sup='#efe9de', fun='#151219', top='#151219', band=None, flag='france'),
	'american': dict(hull='#7a8490', sup='#e7e3d9', fun='#151219', top='#151219', band='#ffffff', flag='usa'),
}

def hull_mesh2(name, L=15.0, B=2.0, keel=-0.8, deck=0.45, bow_sheer=0.3, stern_sheer=0.12, n=64, stern_w=0.62, ring=16):
	"""smooth hull loft: round bilge (half-ellipse section), sheer, raked stem, cruiser stern; deck strip = material 1"""
	bm = bmesh.new(); rings = []
	for i in range(n + 1):
		u = -1 + 2 * i / n; x = u * L / 2
		if u > 0.3: w = B / 2 * max(0.012, 1 - ((u - 0.3) / 0.7) ** 1.7)
		elif u < -0.65: w = B / 2 * (stern_w + (1 - stern_w) * math.sqrt(max(0, 1 - ((-u - 0.65) / 0.35) ** 2)))
		else: w = B / 2
		zd = deck + bow_sheer * max(0, (u - 0.35) / 0.65) ** 2 + stern_sheer * max(0, (-u - 0.55) / 0.45) ** 2
		zb = keel
		if u > 0.8: zb = keel + (u - 0.8) / 0.2 * (zd - 0.02 - keel)
		elif u < -0.88: zb = keel + (-u - 0.88) / 0.12 * (-0.25 * (deck - keel) / 1.25 - keel)
		D = zd - zb; zs = zd - 0.55 * D            # vertical side down to zs, then a round bilge to the flat keel
		pts = []
		half = ring // 2
		for k in range(half):                       # port: deck edge → side → bilge → keel centre
			a = k / (half - 1)
			if a < 0.4:
				pts.append((-w, zd - (zd - zs) * a / 0.4))
			else:
				th = (a - 0.4) / 0.6 * math.pi / 2
				pts.append((-w * math.cos(th) if th < math.pi / 2 - 1e-6 else -0.02 * w, zs - (zs - zb) * math.sin(th)))
		pts = pts + [(-y, z) for (y, z) in reversed(pts)]
		rings.append([bm.verts.new((x, y, z)) for (y, z) in pts])
	N = len(rings[0])
	for i in range(n):
		a, b = rings[i], rings[i + 1]
		for k in range(N):
			k2 = (k + 1) % N
			f = bm.faces.new((a[k], b[k], b[k2], a[k2])); f.material_index = 1 if k == N - 1 else 0
	bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
	bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	return me

def deck_z(x, L, deck, bow_sheer, stern_sheer):
	u = x / (L / 2)
	return deck + bow_sheer * max(0, (u - 0.35) / 0.65) ** 2 + stern_sheer * max(0, (-u - 0.55) / 0.45) ** 2

def rail_mesh(name, path, h=0.09, post=0.22, r=0.006):
	"""railing along a polyline (top + mid rail + posts) as ONE mesh"""
	bm = bmesh.new()
	def tube(p0, p1, rr):
		d = p1 - p0; L = d.length
		if L < 1e-5: return
		res = bmesh.ops.create_cone(bm, cap_ends=False, segments=6, radius1=rr, radius2=rr, depth=L)
		q = d.to_track_quat('Z', 'Y').to_matrix().to_4x4(); q.translation = (p0 + p1) / 2
		bmesh.ops.transform(bm, matrix=q, verts=res['verts'])
	for a, b in zip(path, path[1:]):
		a, b = Vector(a), Vector(b)
		for zz in (h, h * 0.5): tube(a + Vector((0, 0, zz)), b + Vector((0, 0, zz)), r)
		m = max(1, int((b - a).length / post))
		for j in range(m):
			p = a.lerp(b, j / m); tube(p, p + Vector((0, 0, h)), r * 0.9)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	return me

def ship2(sid, liv='bluefunnel', loc=(0, 0, 0), yaw=0.0, L=15.0, B=2.0, small=False, rails=True, detail=1.0):
	lv = LIV[liv]; k = L / 15.0
	root = empty(sid, loc); root.rotation_euler = (0, 0, yaw)
	keel, deck, bs_, ss_ = -0.8 * k, 0.45 * k, 0.3 * k, 0.12 * k
	dz = lambda x: deck_z(x, L, deck, bs_, ss_)
	m_hull = pbr(f'{sid}_hull', lv['hull'], 'rusty_painted_metal', 0.6, 0.35, 0.45, dust_id=sid, rust=True, plates=True)
	m_boot = pbr(f'{sid}_boot', '#b3302a', 'rusty_painted_metal', 0.6, 0.3, 0.5, dust_id=sid, rust=True)
	m_deck = pbr(f'{sid}_deck', '#b98d5e', 'wood_floor_deck', 0.9, 0.85, 0.6, dust_id=sid)
	m_sup = pbr(f'{sid}_sup', lv['sup'], 'painted_metal_shutter', 0.4, 0.08, 0.45, dust_id=sid, rust=True)
	m_win = pbr(f'{sid}_win', '#1d2433', rough=0.12, spec=0.8, emit=('#ffcf8a', 0.0))
	m_fun = pbr(f'{sid}_fun', lv['fun'], 'painted_metal_shutter', 0.5, 0.18, 0.45, dust_id=sid)
	m_top = pbr(f'{sid}_top', lv['top'], rough=0.6, dust_id=sid)
	m_mast = pbr(f'{sid}_mast', '#d8c3a0', rough=0.6, dust_id=sid)
	m_white = pbr(f'{sid}_white', '#f2efe8', rough=0.5, dust_id=sid)
	m_hatch = pbr(f'{sid}_hatch', '#5d5a63', 'painted_metal_shutter', 0.7, 0.3, 0.55, dust_id=sid, rust=True)
	# hull (round bilge) + boot-topping as a separate thin skin at the waterline + white sheer stripe
	h = obj_from_mesh(sid + '_hull', hull_mesh2(sid + '_hm', L, B, keel, deck, bs_, ss_), m_hull, parent=root)
	h.data.materials.append(m_deck)
	boot = obj_from_mesh(sid + '_boot', hull_mesh2(sid + '_bm', L * 1.002, B * 1.012, keel, 0.07 * k, 0.0, 0.0, n=48), m_boot, parent=root)
	# portholes along the upper hull (both sides)
	if detail > 0.5:
		bm_ = bmesh.new()
		for s in (-1, 1):
			for x in np.arange(-L * 0.38, L * 0.32, 0.55 * k):
				res = bmesh.ops.create_circle(bm_, cap_ends=True, segments=10, radius=0.045 * k)
				mtx = Vector((x, s * (B / 2 + 0.004), dz(x) - 0.22 * k))
				rot = (math.pi / 2 if s > 0 else -math.pi / 2)
				import mathutils
				T = mathutils.Matrix.Translation(mtx) @ mathutils.Matrix.Rotation(rot, 4, 'X')
				bmesh.ops.transform(bm_, matrix=T, verts=res['verts'])
		me = bpy.data.meshes.new(sid + '_ph'); bm_.to_mesh(me); bm_.free()
		obj_from_mesh(sid + '_portholes', me, m_win, parent=root)
	# superstructure tiers (bevelled) with real window rows
	sx = -1.4 * k
	tiers = [(3.2, 1.75, 0.36), (2.5, 1.55, 0.32), (1.55, 1.35, 0.3)] if not small else [(2.6, 1.6, 0.34), (1.6, 1.3, 0.3)]
	z = dz(sx)
	for i, (lx, by, hz) in enumerate(tiers):
		lx *= k; by *= k * B / 2.0; hz *= k
		cx = sx - 0.15 * i * k
		cube(f'{sid}_sup{i}', m_sup, (cx, 0, z + hz / 2), (lx / 2, by / 2, hz / 2), parent=root, bev=0.02 * k)
		nwin = int(lx / (0.16 * k))
		for s in (-1, 1):
			for j in range(nwin):
				wx = cx - lx / 2 + (j + 0.5) * lx / nwin
				cube(f'{sid}_w{i}{s}{j}', m_win, (wx, s * (by / 2 + 0.003), z + hz * 0.58), (0.045 * k, 0.006, 0.055 * k), parent=root)
		front = cx + lx / 2 + 0.003
		for j in range(int(by / (0.16 * k))):
			wy = -by / 2 + (j + 0.5) * by / int(by / (0.16 * k))
			cube(f'{sid}_wf{i}{j}', m_win, (front, wy, z + hz * 0.58), (0.006, 0.045 * k, 0.055 * k), parent=root)
		if rails:
			p = [(cx - lx / 2, -by / 2, z + hz), (cx + lx / 2, -by / 2, z + hz), (cx + lx / 2, by / 2, z + hz), (cx - lx / 2, by / 2, z + hz)]
			obj_from_mesh(f'{sid}_r{i}', rail_mesh(f'{sid}_rm{i}', p, 0.08 * k, 0.2 * k, 0.006 * k), m_white, parent=root)
		z += hz
	bz = z
	cube(f'{sid}_wings', m_sup, (sx + 0.35 * k, 0, bz - 0.1 * k), (0.2 * k, B * 0.56, 0.035 * k), parent=root, bev=0.01)
	# funnel: elliptic, raked, with top + band + a small smoke pipe
	fx = sx - 1.25 * k; fz = bz - 0.05 * k; fh = (0.95 if not small else 0.75) * k
	for nm, mat, zc, hh, rr in (('fun', m_fun, fz + fh / 2, fh, 1.0), ('ftop', m_top, fz + fh + 0.04 * k, 0.16 * k, 1.01)):
		o = prim('cyl', f'{sid}_{nm}', mat, (fx - (0.06 * k if nm == 'ftop' else 0), 0, zc), (0.42 * k * rr, 0.32 * k * rr, hh / 2), seg=28, parent=root)
		o.rotation_euler = (0, math.radians(-8), 0)
		if nm == 'fun': bevel(o, 0.015 * k)
	if lv['band']:
		mb = pbr(f'{sid}_band', lv['band'], rough=0.5, dust_id=sid)
		o = prim('cyl', f'{sid}_fband', mb, (fx - 0.025 * k, 0, fz + fh * 0.62), (0.426 * k, 0.326 * k, 0.07 * k), seg=28, parent=root); o.rotation_euler = (0, math.radians(-8), 0)
	smoke = empty(f'{sid}_smoke', (fx - 0.12 * k, 0, fz + fh + 0.25 * k), parent=root)
	# cowl ventilators
	for vx in (sx + 1.8 * k, sx - 2.4 * k):
		for s in (-1, 1):
			cyl(f'{sid}_vent{vx:.1f}{s}', m_white, (vx, s * 0.55 * k, dz(vx) + 0.18 * k), 0.05 * k, 0.36 * k, parent=root, seg=12)
			o = prim('sphere', f'{sid}_cowl{vx:.1f}{s}', m_white, (vx + 0.03 * k, s * 0.55 * k, dz(vx) + 0.38 * k), (0.08 * k, 0.07 * k, 0.07 * k), u=12, v=8, parent=root)
	# hatches + coamings, kingposts, derricks
	for hx in ((5.3, 3.2, -4.3, -6.0) if not small else (3.0, -3.6)):
		hx *= k
		cube(f'{sid}_hatch{hx:.1f}', m_hatch, (hx, 0, dz(hx) + 0.07 * k), (0.62 * k, 0.56 * k * B / 2, 0.08 * k), parent=root, bev=0.012)
		for j in range(4):
			cube(f'{sid}_hb{hx:.1f}{j}', m_hatch, (hx - 0.45 * k + 0.3 * j * k, 0, dz(hx) + 0.155 * k), (0.012, 0.56 * k * B / 2, 0.008), parent=root)
	for kx in ((4.3, -5.2) if not small else (2.0,)):
		kx *= k
		for s in (-1, 1):
			cyl(f'{sid}_kp{kx:.1f}{s}', m_mast, (kx, s * 0.55 * k, dz(kx) + 0.55 * k), 0.045 * k, 1.1 * k, parent=root, seg=10)
			bo = cyl(f'{sid}_boom{kx:.1f}{s}', m_mast, (kx + 0.5 * k * (1 if kx > 0 else -1), s * 0.55 * k, dz(kx) + 0.6 * k), 0.022 * k, 1.2 * k, parent=root, seg=8)
			bo.rotation_euler = (0, math.radians(55 if kx > 0 else -55), 0)
		cube(f'{sid}_kpx{kx:.1f}', m_mast, (kx, 0, dz(kx) + 1.08 * k), (0.045 * k, 0.6 * k, 0.035 * k), parent=root, bev=0.01)
	mx = 6.3 * k
	cyl(f'{sid}_foremast', m_mast, (mx, 0, dz(mx) + 0.85 * k), 0.04 * k, 1.7 * k, parent=root, seg=10)
	cyl(f'{sid}_nest', m_mast, (mx, 0, dz(mx) + 1.2 * k), 0.1 * k, 0.1 * k, parent=root, seg=14)
	# lifeboats in davits
	for s in (-1, 1):
		prim('sphere', f'{sid}_lb{s}', pbr(f'{sid}_lbm', '#f4efe5', rough=0.4, dust_id=sid), (sx - 0.4 * k, s * (0.8 * k * B / 2 + 0.12 * k), dz(sx) + 0.66 * k), (0.42 * k, 0.12 * k, 0.09 * k), u=24, v=12, parent=root)
		for dx in (-0.25, 0.25):
			o = cyl(f'{sid}_dav{s}{dx}', m_white, (sx - 0.4 * k + dx * k, s * (0.8 * k * B / 2 + 0.08 * k), dz(sx) + 0.62 * k), 0.012 * k, 0.3 * k, parent=root, seg=6)
	# deck railings (fore and aft well decks)
	if rails:
		e = 0.03
		pf = [(x, -(B / 2 - e), dz(x)) for x in np.linspace(sx + 1.7 * k, L * 0.45, 8)]
		ps = [(x, (B / 2 - e), dz(x)) for x in np.linspace(sx + 1.7 * k, L * 0.45, 8)]
		pa = [(x, -(B / 2 - e), dz(x)) for x in np.linspace(-L * 0.46, sx - 1.7 * k, 6)]
		pb = [(x, (B / 2 - e), dz(x)) for x in np.linspace(-L * 0.46, sx - 1.7 * k, 6)]
		for j, p in enumerate((pf, ps, pa, pb)):
			obj_from_mesh(f'{sid}_dr{j}', rail_mesh(f'{sid}_drm{j}', p, 0.1 * k, 0.24 * k, 0.007 * k), m_white, parent=root)
	# stern ensign
	ex = -L / 2 + 0.25 * k
	cyl(f'{sid}_staff', m_mast, (ex, 0, dz(ex) + 0.35 * k), 0.018 * k, 0.7 * k, parent=root, seg=8)
	fp = empty(f'{sid}_flagpivot', (ex - 0.02 * k, 0, dz(ex) + 0.62 * k), parent=root)
	fg = prim('plane', f'{sid}_flag', flagmat2(lv['flag']), (-0.3 * k, 0, 0), (0.3 * k, 0.2 * k, 1), rot=(math.pi / 2, 0, 0), smooth_=False, parent=fp, xs=8, ys=4)
	flag_uv(fg); flag_wave_mod(fg)
	sh = dict(root=root, flag=fp, flagobj=fg, smoke=smoke, sid=sid, L=L, B=B, k=k, deckz=dz, supx=sx, bridgez=bz)
	if detail > 0.5:
		ship_extras(sh, B, small, m_hull, m_sup, m_win, m_mast, m_white, tiers, fx, fz, fh)
	return sh

_fm = {}
def flagmat2(name):
	if name in _fm: return _fm[name]
	m = bpy.data.materials.new('flag2_' + name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = img(FLAGS / f'{name}.png'); link(nt, ti.outputs['Color'], bs.inputs['Base Color'])
	bs.inputs['Roughness'].default_value = 0.8
	link(nt, ti.outputs['Color'], bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 0.35
	try:
		bs.inputs['Subsurface Weight'].default_value = 0.0; bs.inputs['Sheen Weight'].default_value = 0.3
	except Exception: pass
	m.use_backface_culling = False
	_fm[name] = m
	return m

def flag_uv(o):
	if not o.data.uv_layers: o.data.uv_layers.new()
	uv = o.data.uv_layers.active.data
	for p in o.data.polygons:
		for li in p.loop_indices:
			v = o.data.vertices[o.data.loops[li].vertex_index].co
			uv[li].uv = (0.5 - v.x * 0.5, v.y * 0.5 + 0.5)

def flag_wave_mod(o):
	"""cloth-like ripple: Wave modifier along the flag (time driven by flag_wave2)"""
	w = o.modifiers.new('wave', 'WAVE'); w.use_x = True; w.use_y = False; w.height = 0.08; w.width = 0.6; w.speed = 0.0
	w.narrowness = 1.2; w.start_position_x = 1.0; w.falloff_radius = 0.0
	return w

def flag_wave2(sh, t, amp=1.0):
	o = sh['flagobj']; w = o.modifiers['wave']; w.time_offset = -t * 30
	sh['flag'].rotation_euler = (0, 0, math.radians(6 * amp * math.sin(t * 3.1 + hash(sh['sid']) % 7)))

# ------------------------------------------------------------------ water, sand
def water2(name, size=(800, 800), loc=(0, 0), col='#20b2c4', deep='#0d6488', z=0.0, scale=1.0, ripples=0.12):
	"""stylised but real water: teal base, glossy, animated wave normals (WAVES value node = time), ray-traced reflections"""
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1000, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (700, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	g = node(nt, 'ShaderNodeNewGeometry', (-900, 0)); tval = node(nt, 'ShaderNodeValue', (-900, 300)); tval.label = 'TIME'
	cm = node(nt, 'ShaderNodeCombineXYZ', (-700, 300)); link(nt, tval.outputs[0], cm.inputs['Z'])
	add = node(nt, 'ShaderNodeVectorMath', (-500, 100)); add.operation = 'ADD'; link(nt, g.outputs['Position'], add.inputs[0]); link(nt, cm.outputs[0], add.inputs[1])
	mp = node(nt, 'ShaderNodeMapping', (-350, 100)); mp.inputs['Scale'].default_value = (scale, scale * 1.6, 0.5); link(nt, add.outputs[0], mp.inputs['Vector'])
	nz = node(nt, 'ShaderNodeTexNoise', (-150, 100)); nz.noise_dimensions = '4D' if False else '3D'; nz.inputs['Scale'].default_value = 1.2; nz.inputs['Detail'].default_value = 6; nz.inputs['Roughness'].default_value = 0.55
	link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
	wv = node(nt, 'ShaderNodeTexWave', (-150, -150)); wv.inputs['Scale'].default_value = 0.35; wv.inputs['Distortion'].default_value = 4; link(nt, mp.outputs['Vector'], wv.inputs['Vector'])
	# fine wind ripples on top of the swell (no blotchy look at grazing angles)
	mp2 = node(nt, 'ShaderNodeMapping', (-350, -350)); mp2.inputs['Scale'].default_value = (3.2, 4.0, 1.6); link(nt, add.outputs[0], mp2.inputs['Vector'])
	n3 = node(nt, 'ShaderNodeTexNoise', (-150, -350)); n3.inputs['Scale'].default_value = 1.0; n3.inputs['Detail'].default_value = 4; link(nt, mp2.outputs['Vector'], n3.inputs['Vector'])
	h = M(nt, 'ADD', M(nt, 'ADD', nz.outputs['Fac'], M(nt, 'MULTIPLY', wv.outputs['Fac'], 0.4)), M(nt, 'MULTIPLY', n3.outputs['Fac'], ripples))
	bp = node(nt, 'ShaderNodeBump', (300, -100)); bp.inputs['Strength'].default_value = 0.35; bp.inputs['Distance'].default_value = 0.15
	link(nt, h, bp.inputs['Height']); link(nt, bp.outputs['Normal'], bs.inputs['Normal'])
	# colour: brighter teal crests, deep teal troughs
	cr = RAMP(nt, nz.outputs['Fac'], [(0.35, C(deep)), (0.75, C(col))], interp='LINEAR')
	link(nt, cr, bs.inputs['Base Color'])
	bs.inputs['Roughness'].default_value = 0.1
	try: bs.inputs['Specular IOR Level'].default_value = 0.35
	except Exception: pass
	o = prim('plane', name, m, (loc[0], loc[1], z), (size[0] / 2, size[1] / 2, 1), smooth_=False)
	return o, tval

def set_water_time(tval, t):
	tval.outputs[0].default_value = t * 0.35

def sand_mat(name='sand2'):
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1200, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (900, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	g = node(nt, 'ShaderNodeNewGeometry', (-1200, 0))
	d_, r_, n_ = texset(nt, 'coast_sand_01', g.outputs['Position'], 0.35)
	n_.node.inputs['Strength'].default_value = 0.8
	nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.02; nz.inputs['Detail'].default_value = 3; link(nt, g.outputs['Position'], nz.inputs['Vector'])
	tint = RAMP(nt, nz.outputs['Fac'], [(0.3, C('#e2b371')), (0.7, C('#f3d39a'))], interp='LINEAR')
	bw = nt.nodes.new('ShaderNodeRGBToBW'); link(nt, d_, bw.inputs[0])
	col = MIX(nt, 1.0, tint, MIX(nt, 0.55, (1, 1, 1), M(nt, 'MULTIPLY', bw.outputs[0], 2.1)), 'MULTIPLY')
	put(nt, bs.inputs['Base Color'], col)
	link(nt, n_, bs.inputs['Normal']); bs.inputs['Roughness'].default_value = 0.85
	# wind ripples (thin bands) as extra bump
	wv = node(nt, 'ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 1.6; wv.inputs['Distortion'].default_value = 2.5; link(nt, g.outputs['Position'], wv.inputs['Vector'])
	bp = node(nt, 'ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.25; link(nt, wv.outputs['Fac'], bp.inputs['Height'])
	link(nt, n_, bp.inputs['Normal']); link(nt, bp.outputs['Normal'], bs.inputs['Normal'])
	return m

def desert2(name, x0, x1, y0, y1, res=1.0, canal_w=5.5, bank=3.5, lake=None, dunes=1.0, seed=3, dress=120):
	import yf
	o = getattr(yf, '_v1_desert', yf.desert)(name, x0, x1, y0, y1, res, canal_w, bank, lake, dunes, seed)
	o.data.materials.clear(); o.data.materials.append(sand_mat(name + '_m'))
	if dress: desert_dressing(o, x0, x1, y0, y1, canal_w, bank, lake, dress, seed)
	return o

ROCKS = ['rock_smallA.glb', 'rock_smallB.glb', 'rock_smallC.glb', 'rock_smallE.glb', 'rock_smallFlatA.glb', 'rock_largeA.glb', 'rock_largeC.glb']
BUSHES = ['plant_bushSmall.glb', 'plant_bush.glb', 'plant_flatShort.glb', 'grass.glb']
def desert_dressing(ground, x0, x1, y0, y1, canal_w, bank, lake, n, seed):
	"""sandstone rocks and dry desert bushes on the banks (never in the water), dropped onto the ground surface"""
	import kit as K
	rng = np.random.default_rng(seed + 100)
	bpy.context.view_layer.update()
	dg = bpy.context.evaluated_depsgraph_get()
	placed = 0; tries = 0
	while placed < n and tries < n * 30:
		tries += 1
		x = rng.uniform(max(x0, -45), min(x1, 45)); y = rng.uniform(y0, y1)
		d = abs(x) - canal_w
		if lake:
			cx, cy, rx, ry = lake
			e = math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2); d = min(d, (e - 1) * min(rx, ry))
		if d < bank + 0.8 or d > 40: continue
		hit, loc, *_ = bpy.context.scene.ray_cast(dg, Vector((x, y, 50)), Vector((0, 0, -1)))
		if not hit: continue
		bush = rng.random() < 0.45
		m = (BUSHES if bush else ROCKS)[int(rng.integers(len(BUSHES if bush else ROCKS)))]
		s_ = rng.uniform(0.6, 1.4) * (1.0 if bush else 1.6) * (1 + d / 40)
		K.import_model(K.NK + m, s_, (x, y, loc.z - 0.05), (0, 0, rng.uniform(0, 360)), ink=0.0)
		placed += 1

# ------------------------------------------------------------------ Kenney mini characters (CC0) as sailors
FPS_CH = 30.0
def person(name, kind='male-a', loc=(0, 0, 0), yaw=0.0, h=0.2, action='idle', speed=1.0, offset=0.0):
	"""import a Kenney Mini Character, scale it to height h (units), set its looping action. Returns dict with root + arm."""
	before = set(bpy.data.objects); acts_before = set(bpy.data.actions)
	bpy.ops.import_scene.gltf(filepath=str(CHAR / f'character-{kind}.glb'))
	new = [o for o in bpy.data.objects if o not in before]
	arm = next(o for o in new if o.type == 'ARMATURE')
	for o in list(new):
		if o.type == 'MESH' and o.name.startswith('Icosphere'):     # helper sphere in the pack: not part of the body
			bpy.data.objects.remove(o); new.remove(o)
	root = empty(name, loc); root.rotation_euler = (0, 0, yaw)
	for o in new:
		if o.parent is None: o.parent = root
	s = h / 0.62                                                   # Kenney mini character ≈ 0.62 tall (head top)
	root.scale = (s, s, s)
	P = {'root': root, 'arm': arm, 'acts': {a.name.split('.')[0]: a for a in bpy.data.actions if a not in acts_before}, 'speed': speed, 'offset': offset}
	set_action(P, action)
	return P

def set_action(P, action, speed=None, offset=None):
	"""choose the looping clip; it is evaluated by hand in pose_at (each character keeps its own clock, the scene frame
	never drives it — so no action is assigned to the armature)"""
	P['action'] = P['acts'].get(action) or P['acts'].get('idle')
	if P['arm'].animation_data: P['arm'].animation_data.action = None
	P['cur'] = action
	if speed is not None: P['speed'] = speed
	if offset is not None: P['offset'] = offset

def pose_at(P, t, once=False):
	"""pose the armature with the current clip at time t (s); loops unless once=True (then holds the last frame)"""
	a = P['action']
	f0, f1 = a.frame_range
	n = max(1.0, f1 - f0)
	x = (t + P['offset']) * FPS_CH * P['speed']
	fr = f0 + (min(x, n) if once else x % n)
	for fc in _fcurves(a):
		path = fc.data_path
		head, prop = path.rsplit('.', 1) if '.' in path else ('', path)
		try:
			tgt = P['arm'].path_resolve(head) if head else P['arm']
			getattr(tgt, prop)[fc.array_index] = fc.evaluate(fr)
		except Exception:
			pass
	if P.get('cur') == 'sprint':      # Kenney's sprint hops ~30 % of body height: damp the root bounce to a real run
		rb = P['arm'].pose.bones.get('root')
		if rb: rb.location = rb.location * 0.35

def _fcurves(a):
	try:
		return list(a.fcurves)
	except Exception:
		out = []
		for layer in a.layers:
			for st in layer.strips:
				for cb in st.channelbags:
					out += list(cb.fcurves)
		return out


def cloud2(name, centre, size, n=8, seed=1):
	"""volumetric cumulus: flat base, billowing self-shadowed top (replaces the v2 sphere clusters that read as cotton)"""
	if not VOL_ON: volume_setup()
	size *= 1.7
	o, tv = volume_box(name, centre, (size * 3.6, size * 2.2, size * 1.3), '#ddd0dc', 1.1, scale=2.4 / size, thr=0.42, soft=0.16,
	                   speed=(1.5, 0.0, 0.0), anisotropy=0.45, grounded=True, color_top='#fff8f0', top_var=0.9, mottle=0.3)
	o.location.z += size * 0.65
	VOLT[-1][1] = seed * 7.3      # per-cloud noise offset: no two clouds alike
	return o


# ====================================================================================================== v2 compatibility layer
# The v1 shot scripts (suez/decks/hamburg/hold) keep their staging; enable_v2(globals()) swaps every look function for the
# v2 one: lit PBR instead of flat toon, no ink hulls, detailed ships, real water/sand, soft clouds, Kenney people.
PEOPLE = []          # every person: posed automatically each frame with its current clip
WATER_T = []         # water time values: advanced automatically each frame

def toon_mat_v2(name, color, tex=None, bands=None, flat=False):
	col = color if isinstance(color, (tuple, list)) else (0.8, 0.8, 0.8)
	srgb = tuple((c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055) for c in col[:3])
	hexs = '#%02x%02x%02x' % tuple(int(max(0, min(1, c)) * 255) for c in srgb)
	key = ('v2', name, hexs, str(tex), flat)
	if key in _mats_v2: return _mats_v2[key]
	if tex is not None:
		m = bpy.data.materials.new('v2tex_' + name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
		out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (300, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
		ti = node(nt, 'ShaderNodeTexImage', (0, 0)); ti.image = tex if not isinstance(tex, (str, Path)) else bpy.data.images.load(str(tex), check_existing=True)
		link(nt, ti.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.7
		link(nt, ti.outputs['Color'], bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 0.35   # flags stay readable against the sun
		m.use_backface_culling = False
	elif flat:
		m = pbr('v2flat_' + name, hexs, rough=0.6, emit=(hexs, 1.2))
	else:
		m = pbr('v2_' + name, hexs, rough=0.55)
	_mats_v2[key] = m
	return m
_mats_v2 = {}

def puff_v2(name, loc, r, col=(1, 1, 1), parent=None, ink=0.0, bands=None):
	srgb = tuple((c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055) for c in col[:3])
	if bands:   # v1 passed a tint by its lit band → use the lit band as the base colour
		srgb = tuple((c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055) for c in bands[1])
	hexs = '#%02x%02x%02x' % tuple(int(max(0, min(1, c)) * 255) for c in srgb)
	key = ('puff', hexs)
	if key not in _mats_v2:
		_mats_v2[key] = pbr('puff_' + hexs, hexs, rough=0.95, spec=0.05, emit=(hexs, 0.25))
	return prim('ico', name, _mats_v2[key], loc, (r, r, r), sub=3, parent=parent)

def cloud_v2(name, centre, size, n=7, seed=1, ink=None):
	return cloud2(name, centre, size, n + 1, seed)

def world_v2(stops=None, strength=1.0):
	return world2()

def sun_v2(energy=4.0, color=(1.0, 0.86, 0.62), rot=(58, 0, 20)):
	return sun2(energy * 1.1, color, rot, 2.5)

def ship_v2(sid, liv='bluefunnel', loc=(0, 0, 0), yaw=0.0, L=15.0, B=2.0, small=False, ink=0.03):
	return ship2(sid, liv, loc, yaw, L, B, small)

def wave_flag_v2(sh, t, speed=1.0, amp=8.0):
	if 'flagobj' in sh: flag_wave2(sh, t * speed, amp / 8.0)
	else: sh['flag'].rotation_euler = (0, 0, math.radians(amp * math.sin(t * 5.3 * speed + hash(sh['sid']) % 7)))

def water_v2(name, size=(800, 800), loc=(0, 0, 0), col=None, col2=None, z=0.0, scale=0.6, thr=None):
	o, tv = water2(name, size, (loc[0], loc[1]), z=z)
	WATER_T.append(tv)
	return o, tv

def desert_v2(name, x0, x1, y0, y1, res=1.0, canal_w=8.0, bank=3.0, lake=None, dunes=0.5, seed=3):
	return desert2(name, x0, x1, y0, y1, res, canal_w, bank, lake, dunes, seed)

def sun_disc_v2(loc, r, col='#ffe6a8'):
	return prim('sphere', 'sundisc', pbr('sundisc', col, emit=(col, 5.0)), loc, (r, r, r), u=32, v=16)

KINDS = ['male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f']
def sailor_v2(name, loc=(0, 0, 0), yaw=0.0, shirt=None, skin=None, cap=None, s=1.0, seed=0, ink=0.0):
	"""v1 sailor API → a Kenney character (faces +X at yaw 0 like v1). Returns v1-style keys; the arm/leg keys are inert
	empties (v1 limb posing is replaced by clips: set_clip(P, 'jump'|'walk'|…))"""
	outer = empty(name, loc); outer.rotation_euler = (0, 0, yaw); outer.scale = (s, s, s)
	P = person(name + '_k', KINDS[seed % len(KINDS)], (0, 0, 0), math.pi / 2, 0.22, 'idle', 1.0, (seed * 0.37) % 1.0)
	P['root'].parent = outer
	P['outer'] = outer
	PEOPLE.append(P)
	D = {'root': outer, 'P': P}
	for k in ('armL', 'armR', 'legL', 'legR', 'head'):
		D[k] = empty(f'{name}_{k}', parent=outer)
	return D

def set_clip(D, clip, speed=None, t=None):
	P = D['P'] if 'P' in D else D
	if P.get('cur') != clip:
		set_action(P, clip, speed, offset=(-t if t is not None else None))

def dof(cam, fstop=5.6):
	cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = fstop
	return cam

def tick_v2(t):
	for tv in WATER_T: set_water_time(tv, t)
	for tv, off in VOLT: tv.outputs[0].default_value = t + off
	for P in PEOPLE: pose_at(P, t, once=P.get('cur') in ('attack-kick-right', 'pick-up', 'interact-right'))
	for P, mode, ph in CHEER: pose_cheer(P, t, mode, ph)

def enable_v2(ns):
	"""swap the v1 look functions in kit, yf and the calling shot script for the v2 ones"""
	import kit as K, yf as Y
	rep = {'toon_mat': toon_mat_v2, 'outline': (lambda o, w: None), 'cloud': cloud_v2, 'world': world_v2, 'sun': sun_v2,
	       'puff': puff_v2, 'ship': ship_v2, 'set_dust': set_dust2, 'wave_flag': wave_flag_v2, 'water': water_v2,
	       'desert': desert_v2, 'sun_disc': sun_disc_v2, 'sailor': sailor_v2}
	if not hasattr(Y, '_v1_desert'): Y._v1_desert = Y.desert
	for mod in (K, Y):
		for k, v in rep.items():
			if hasattr(mod, k): setattr(mod, k, v)
	Y.hull_mat = lambda sid, hexcol: pbr(f'{sid}_hull', hexcol, 'rusty_painted_metal', 0.6, 0.35, 0.45, dust_id=sid, rust=True)
	Y.smat = lambda sid, name, hexcol, dust_to=None, streaks=False, flat=False: pbr(f'{sid}_{name}', hexcol if isinstance(hexcol, str) else '#888888', rough=0.5, dust_id=sid, rust=streaks)
	Y.set_dust = set_dust2
	for k, v in rep.items(): ns[k] = v
	# the render loop advances water + people before each frame
	orig = K.render
	def render_v2(update, out_rel, track=None):
		def upd(t):
			update(t); tick_v2(t)
		return orig(upd, out_rel, track)
	K.render = render_v2; ns['render'] = render_v2
	ns['setup'] = setup2
	_look = K.look
	def look_v2(cam, pos, target, roll=0.0):
		_look(cam, pos, target, roll)
		if cam.data.dof.use_dof: cam.data.dof.focus_distance = (Vector(target) - Vector(pos)).length
	K.look = look_v2; ns['look'] = look_v2
	# sandy, sun-bleached tints for the Kenney nature pieces
	K.KENNEY_TINT.update({'stone': C('#c39466'), 'dirt': C('#b5773f'), 'leafsGreen': C('#8f8f4a'), 'leafsDark': C('#6f7a3c'), 'grass': C('#a29a52')})


# ====================================================================================================== volumetric VFX (v3)
VOLT = []   # [TIME value node, offset] of volumes, advanced in tick_v2
VOL_ON = False
VOLD = {}   # name → DENS value node (animate density: VOLD[name].outputs[0].default_value = …)

def volume_setup(end=700.0, tile='4', samples=64, shadows=True):
	global VOL_ON
	VOL_ON = True
	sc_ = bpy.context.scene
	for k, v in (('use_volume_custom_range', True), ('volumetric_sample_distribution', 0.85), ('volumetric_start', 0.5), ('volumetric_end', end), ('volumetric_tile_size', tile), ('volumetric_samples', samples),
	             ('use_volumetric_shadows', shadows), ('volumetric_shadow_samples', 16), ('volumetric_light_clamp', 0.0)):
		try: setattr(sc_.eevee, k, v)
		except Exception: pass

def volume_box(name, loc, size, color='#e2b878', density=0.6, scale=0.08, thr=0.42, soft=0.25, rise=0.0, speed=(0.0, 0.0, 0.0),
               emission=None, anisotropy=0.25, bottom_heavy=0.0, parent=None, grounded=False, color_top=None, top_var=0.0, mottle=0.0):
	"""a box of billowing volume: 3D noise (4D-animated) → density, faded at the box edges (Generated coords); TIME value
	animates the billows; `speed` scrolls the noise (world units/s) so the cloud seems to roll"""
	me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
	o = obj_from_mesh(name, me, None, loc, parent); o.scale = size
	o.visible_shadow = False     # the bounding cube would otherwise cast a hard sun shadow across its own volume
	m = bpy.data.materials.new(name + '_vol'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1200, 0)); pv = node(nt, 'ShaderNodeVolumePrincipled', (900, 0))
	link(nt, pv.outputs[0], out.inputs['Volume'])
	pv.inputs['Color'].default_value = hexc(color); pv.inputs['Anisotropy'].default_value = anisotropy
	if emission:
		pv.inputs['Emission Color'].default_value = hexc(emission[0]); pv.inputs['Emission Strength'].default_value = emission[1]
	tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0))
	tv = node(nt, 'ShaderNodeValue', (-1200, 300)); tv.label = 'TIME'
	# object-space position scaled to world units, scrolled by speed·t
	g = node(nt, 'ShaderNodeNewGeometry', (-1200, -200))
	sp = node(nt, 'ShaderNodeCombineXYZ', (-1000, 300))
	for i, c in enumerate('XYZ'):
		put(nt, sp.inputs[c], M(nt, 'MULTIPLY', tv.outputs[0], -speed[i]))
	pos = node(nt, 'ShaderNodeVectorMath', (-800, 0)); pos.operation = 'ADD'; link(nt, g.outputs['Position'], pos.inputs[0]); link(nt, sp.outputs[0], pos.inputs[1])
	nz = node(nt, 'ShaderNodeTexNoise', (-600, 0)); nz.noise_dimensions = '4D'; nz.inputs['Scale'].default_value = scale
	nz.inputs['Detail'].default_value = 8.0; nz.inputs['Roughness'].default_value = 0.6; nz.inputs['Distortion'].default_value = 0.4
	link(nt, pos.outputs[0], nz.inputs['Vector']); link(nt, M(nt, 'MULTIPLY', tv.outputs[0], 0.15), nz.inputs['W'])
	n2 = node(nt, 'ShaderNodeTexNoise', (-600, -300)); n2.noise_dimensions = '4D'; n2.inputs['Scale'].default_value = scale * 4.0; n2.inputs['Detail'].default_value = 4.0
	link(nt, pos.outputs[0], n2.inputs['Vector']); link(nt, M(nt, 'MULTIPLY', tv.outputs[0], 0.3), n2.inputs['W'])
	nn = M(nt, 'ADD', M(nt, 'MULTIPLY', nz.outputs['Fac'], 0.8), M(nt, 'MULTIPLY', n2.outputs['Fac'], 0.2))
	core = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nn, thr), 1.0 / max(0.05, soft), clamp=True)
	# edge fade: Generated coords 0..1 → distance from the box centre
	sep = SEP(nt, tc.outputs['Generated'])
	fade = None
	for i in range(3):
		if i == 2 and grounded:     # sits on the ground: fade only towards the top (top height wobbles by a big noise)
			zt = sep[2]
			if top_var:
				nb = node(nt, 'ShaderNodeTexNoise', (-600, -600)); nb.inputs['Scale'].default_value = scale * 0.35; nb.inputs['Detail'].default_value = 2.0
				link(nt, pos.outputs[0], nb.inputs['Vector'])
				zt = M(nt, 'ADD', zt, M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nb.outputs['Fac'], 0.5), top_var))
			e = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 1.0, zt), 1.6, clamp=True)
		else:
			e = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 0.5, M(nt, 'ABSOLUTE', M(nt, 'SUBTRACT', sep[i], 0.5))), 2.6, clamp=True)
		fade = e if fade is None else M(nt, 'MULTIPLY', fade, e)
	colr = RAMP(nt, sep[2], [(0.0, C(color)), (1.0, C(color_top or color))], interp='LINEAR')
	if mottle:   # darker albedo in the thin crevices, brighter in the dense lobes → structure inside a big face
		colr = MIX(nt, 1.0, colr, M(nt, 'ADD', 1.0 - mottle, M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nn, 0.3), mottle * 2.5), clamp=False), 'MULTIPLY')
	if color_top or mottle:
		link(nt, colr, pv.inputs['Color'])
	if bottom_heavy:
		fade = M(nt, 'MULTIPLY', fade, M(nt, 'POWER', M(nt, 'SUBTRACT', 1.0, sep[2]), bottom_heavy))
	# billowy silhouette: the noise pushes the iso-surface of the shape field in and out (cauliflower edges, no box lines)
	shape = M(nt, 'SUBTRACT', M(nt, 'ADD', M(nt, 'MULTIPLY', nn, 1.25), M(nt, 'MULTIPLY', fade, 1.0)), 1.12)
	bill = M(nt, 'MULTIPLY', shape, 1.0 / max(0.04, soft), clamp=True)
	dv = node(nt, 'ShaderNodeValue', (600, -300)); dv.label = 'DENS'; dv.outputs[0].default_value = density
	put(nt, pv.inputs['Density'], M(nt, 'MULTIPLY', bill, dv.outputs[0]))
	o.data.materials.append(m)
	VOLT.append([tv, 0.0]); VOLD[name] = dv
	return o, tv

def smoke_plume(name, base, height=4.0, width=1.2, lean=(0.0, -1.0), color='#6a6670', density=1.2, parent=None):
	"""rising funnel smoke: a tall soft volume leaning with the wind, densest at the stack"""
	o, tv = volume_box(name, (0, 0, 0), (width, width, height), color, density, scale=0.55, thr=0.35, soft=0.18, speed=(0.0, 0.0, 2.0),
	                   anisotropy=0.2, bottom_heavy=0.8)
	o.location = Vector(base) + Vector((lean[0] * height * 0.25, lean[1] * height * 0.25, height / 2))
	o.rotation_euler = (math.atan2(-lean[1], 3.0) * 0.6, math.atan2(lean[0], 3.0) * 0.6, 0)
	if parent: o.parent = parent
	return o, tv

def plume(name, parent=None, at=(0, 0, 0), length=9.0, width=2.4, tilt=12.0, color='#4f4b52', color_end='#bdb4b4', density=3.0,
          speed=(0.0, 0.0, 1.4), r0=0.12, soft=0.18, yaw=0.0):
	"""smoke trail as a cone of billowing volume: starts thin at `at` (a stack top, a jet tail) and runs backwards along
	local −X, widening, rising by `tilt` degrees and thinning out. The noise lives in world space and scrolls by `speed`,
	so smoke stays in the air while its source moves on. Returns (obj, DENS socket); set obj.scale.x to grow a trail"""
	if not VOL_ON: volume_setup()
	me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
	bmesh.ops.translate(bm, verts=bm.verts, vec=(-0.5, 0, 0)); bm.to_mesh(me); bm.free()   # origin on the +X face = the source
	o = obj_from_mesh(name, me, None, at, parent); o.scale = (length, width, width); o.visible_shadow = False
	o.rotation_euler = (0, math.radians(tilt), math.radians(yaw))
	m = bpy.data.materials.new(name + '_vol'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1200, 0)); pv = node(nt, 'ShaderNodeVolumePrincipled', (900, 0))
	link(nt, pv.outputs[0], out.inputs['Volume']); pv.inputs['Anisotropy'].default_value = 0.3
	tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0)); g = node(nt, 'ShaderNodeNewGeometry', (-1200, -200))
	tv = node(nt, 'ShaderNodeValue', (-1200, 300)); tv.label = 'TIME'
	sp = node(nt, 'ShaderNodeCombineXYZ', (-1000, 300))
	for i, c in enumerate('XYZ'):
		put(nt, sp.inputs[c], M(nt, 'MULTIPLY', tv.outputs[0], -speed[i]))
	pos = node(nt, 'ShaderNodeVectorMath', (-800, 0)); pos.operation = 'ADD'; link(nt, g.outputs['Position'], pos.inputs[0]); link(nt, sp.outputs[0], pos.inputs[1])
	nz = node(nt, 'ShaderNodeTexNoise', (-600, 0)); nz.noise_dimensions = '4D'; nz.inputs['Scale'].default_value = 1.3 / width
	nz.inputs['Detail'].default_value = 6.0; nz.inputs['Roughness'].default_value = 0.6; nz.inputs['Distortion'].default_value = 0.3
	link(nt, pos.outputs[0], nz.inputs['Vector']); link(nt, M(nt, 'MULTIPLY', tv.outputs[0], 0.35), nz.inputs['W'])
	n2 = node(nt, 'ShaderNodeTexNoise', (-600, -300)); n2.noise_dimensions = '4D'; n2.inputs['Scale'].default_value = 4.0 / width; n2.inputs['Detail'].default_value = 4.0
	link(nt, pos.outputs[0], n2.inputs['Vector']); link(nt, M(nt, 'MULTIPLY', tv.outputs[0], 0.6), n2.inputs['W'])
	nn = M(nt, 'ADD', M(nt, 'MULTIPLY', nz.outputs['Fac'], 0.7), M(nt, 'MULTIPLY', n2.outputs['Fac'], 0.3))
	sep = SEP(nt, tc.outputs['Generated'])
	age = M(nt, 'SUBTRACT', 1.0, sep[0])                     # 0 at the source, 1 at the tail
	r = M(nt, 'ADD', r0, M(nt, 'MULTIPLY', M(nt, 'POWER', age, 0.7), 0.5 - r0))
	cyz = node(nt, 'ShaderNodeCombineXYZ'); put(nt, cyz.inputs['X'], M(nt, 'SUBTRACT', sep[1], 0.5)); put(nt, cyz.inputs['Y'], M(nt, 'SUBTRACT', sep[2], 0.5))
	ln = node(nt, 'ShaderNodeVectorMath'); ln.operation = 'LENGTH'; link(nt, cyz.outputs[0], ln.inputs[0])
	shape = M(nt, 'ADD', M(nt, 'SUBTRACT', 1.0, M(nt, 'DIVIDE', ln.outputs['Value'], r)), M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nn, 0.5), 2.4))
	bill = M(nt, 'MULTIPLY', shape, 1.0 / soft, clamp=True)
	thin = M(nt, 'MULTIPLY', M(nt, 'POWER', M(nt, 'SUBTRACT', 1.0, age), 1.3), M(nt, 'MULTIPLY', age, 40.0, clamp=True))
	dv = node(nt, 'ShaderNodeValue', (600, -300)); dv.label = 'DENS'; dv.outputs[0].default_value = density
	put(nt, pv.inputs['Density'], M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', bill, thin), dv.outputs[0]))
	colr = RAMP(nt, age, [(0.0, C(color)), (1.0, C(color_end))], interp='LINEAR')
	colr = MIX(nt, 1.0, colr, M(nt, 'ADD', 0.6, M(nt, 'MULTIPLY', nn, 0.8)), 'MULTIPLY')     # lobes brighter than crevices
	link(nt, colr, pv.inputs['Color'])
	o.data.materials.append(m)
	VOLT.append([tv, 0.0]); VOLD[name] = dv
	return o, dv.outputs[0]

def _lathe(name, prof, seg=20, sy=1.0, sz=1.0):
	"""mesh of revolution around +X from a (x, r) profile (nose first); sy/sz squash the section"""
	bm = bmesh.new(); rings = []
	for x, r in prof:
		if r <= 1e-4:
			rings.append([bm.verts.new((x, 0, 0))]); continue
		rings.append([bm.verts.new((x, r * sy * math.cos(2 * math.pi * i / seg), r * sz * math.sin(2 * math.pi * i / seg))) for i in range(seg)])
	for a, b in zip(rings, rings[1:]):
		if len(a) == 1: [bm.faces.new((a[0], b[i], b[(i + 1) % seg])) for i in range(seg)]
		elif len(b) == 1: [bm.faces.new((a[i], b[0], a[(i + 1) % seg])) for i in range(seg)]
		else: [bm.faces.new((a[i], b[i], b[(i + 1) % seg], a[(i + 1) % seg])) for i in range(seg)]
	if len(rings[-1]) > 1: bm.faces.new(list(reversed(rings[-1])))
	bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	for p_ in me.polygons: p_.use_smooth = True
	return me

def _slab(name, pts, th, z=0.0, axis='z'):
	"""thin extruded polygon (wing, fin): pts in the XY plane (axis 'z') or XZ plane (axis 'y'), thickness th"""
	bm = bmesh.new()
	if axis == 'z': vs = [bm.verts.new((x, y, z)) for x, y in pts]
	else: vs = [bm.verts.new((x, z, y)) for x, y in pts]
	f = bm.faces.new(vs)
	ex = bmesh.ops.extrude_face_region(bm, geom=[f])
	d = (0, 0, th) if axis == 'z' else (0, th, 0)
	bmesh.ops.translate(bm, verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)], vec=d)
	bmesh.ops.translate(bm, verts=bm.verts, vec=tuple(-c / 2 for c in d))
	bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	return me

def jet2(name, col='#aeb4ba', s=1.0):
	"""1960s delta-wing fighter (MiG-21-like silhouette), natural-metal finish; nose +X, length ≈ 2 units × s"""
	root = empty(name); root.scale = (s, s, s)
	m = pbr(name + '_skin', col, 'painted_metal_shutter', 1.2, 0.12, 0.32, metal=0.75, spec=0.6)
	dark = pbr(name + '_dark', '#2b2d31', rough=0.45, metal=0.5)
	glass = pbr(name + '_glass', '#2a4b63', rough=0.05, spec=0.9)
	prof = [(1.0, 0.0), (0.96, 0.03), (0.86, 0.065), (0.7, 0.095), (0.5, 0.115), (0.2, 0.122), (-0.4, 0.122), (-0.7, 0.11), (-0.88, 0.095), (-0.92, 0.09)]
	obj_from_mesh(name + '_fus', _lathe(name + '_fm', prof, 24, 1.0, 1.08), m, parent=root)
	obj_from_mesh(name + '_cone', _lathe(name + '_cm', [(1.06, 0.0), (1.0, 0.025), (0.95, 0.03)], 16), dark, parent=root)
	obj_from_mesh(name + '_noz', _lathe(name + '_nm', [(-0.9, 0.085), (-0.99, 0.08), (-0.99, 0.0)], 20), dark, parent=root)
	obj_from_mesh(name + '_can', _lathe(name + '_ca', [(0.66, 0.0), (0.6, 0.035), (0.48, 0.06), (0.32, 0.055), (0.22, 0.03), (0.18, 0.0)], 16, 0.9, 1.0),
	              glass, (0, 0, 0.095), root)
	obj_from_mesh(name + '_spine', _lathe(name + '_sp', [(0.22, 0.0), (0.15, 0.035), (-0.5, 0.035), (-0.7, 0.0)], 12), m, (0, 0, 0.1), root)
	w = obj_from_mesh(name + '_wing', _slab(name + '_wm', [(0.22, 0.1), (-0.66, 0.66), (-0.74, 0.66), (-0.62, 0.1)] + [(-0.62, -0.1), (-0.74, -0.66), (-0.66, -0.66), (0.22, -0.1)], 0.022, -0.02), m, parent=root)
	f = obj_from_mesh(name + '_fin', _slab(name + '_fn', [(-0.4, 0.1), (-0.82, 0.5), (-0.92, 0.5), (-0.9, 0.1)], 0.02, axis='y'), m, parent=root)
	obj_from_mesh(name + '_stab', _slab(name + '_st', [(-0.68, 0.08), (-0.86, 0.3), (-0.92, 0.3), (-0.9, 0.08)] + [(-0.9, -0.08), (-0.92, -0.3), (-0.86, -0.3), (-0.68, -0.08)], 0.016, 0.0), m, parent=root)
	for o in (w, f): bevel(o, 0.006, 1)
	return root

def trail(name, width=1.0, color='#f6f3ef', alpha=0.85, yaw=0.0):
	"""smoke / vapour trail as a soft tube (fake volume: opacity falls off towards the silhouette) — for thin trails where
	EEVEE's froxel volumes band. Source at the origin, runs along local −X; set obj.scale.x to its length"""
	prof = [(0.0, 0.0)] + [(-a, 0.12 + 0.88 * a ** 0.6) for a in np.linspace(0.02, 1.0, 24)] + [(-1.0, 0.0)]
	me = _lathe(name + '_m', prof, 20)
	o = obj_from_mesh(name, me, None, (0, 0, -50)); o.scale = (1.0, width / 2, width / 2); o.rotation_euler = (0, 0, math.radians(yaw))
	o.visible_shadow = False
	m = bpy.data.materials.new(name + '_mat'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	try: m.surface_render_method = 'BLENDED'
	except Exception: pass
	out = node(nt, 'ShaderNodeOutputMaterial', (900, 0))
	pb = node(nt, 'ShaderNodeBsdfPrincipled', (500, 0)); pb.inputs['Base Color'].default_value = hexc(color); pb.inputs['Roughness'].default_value = 1.0
	try: pb.inputs['Specular IOR Level'].default_value = 0.0
	except Exception: pass
	pb.inputs['Emission Color'].default_value = hexc(color); pb.inputs['Emission Strength'].default_value = 0.25
	lw = node(nt, 'ShaderNodeLayerWeight', (-300, 200)); lw.inputs['Blend'].default_value = 0.5
	tc = node(nt, 'ShaderNodeTexCoord', (-600, 0)); sep = SEP(nt, tc.outputs['Generated'])
	g = node(nt, 'ShaderNodeNewGeometry', (-600, -200))
	nz = node(nt, 'ShaderNodeTexNoise', (-300, -200)); nz.inputs['Scale'].default_value = 0.9 / max(0.2, width); nz.inputs['Detail'].default_value = 5.0
	link(nt, g.outputs['Position'], nz.inputs['Vector'])
	edge = M(nt, 'POWER', M(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']), 2.2)             # opaque in the middle, soft rim
	age = M(nt, 'SUBTRACT', 1.0, sep[0])
	life = M(nt, 'MULTIPLY', M(nt, 'POWER', M(nt, 'SUBTRACT', 1.0, age), 0.8), M(nt, 'MULTIPLY', age, 30.0, clamp=True))
	mott = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nz.outputs['Fac'], 0.25), 1.6, clamp=True)
	put(nt, pb.inputs['Alpha'], M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', edge, life), mott), alpha, clamp=True))
	link(nt, pb.outputs[0], out.inputs['Surface'])
	o.data.materials.append(m)
	return o

# ====================================================================================================== fireboat + water jets (v3)
def fireboat2(sid, loc=(0, 0, 0), yaw=0.0, L=5.6, B=1.7):
	"""1970s harbour fireboat: red round-bilge hull, white superstructure + wheelhouse, monitor platform with two water
	cannons, mast with radar. Returns dict(root, monitors=[local nozzle positions], sid)"""
	k = L / 5.6
	root = empty(sid, loc); root.rotation_euler = (0, 0, yaw)
	keel, deck, bs_, ss_ = -0.42 * k, 0.32 * k, 0.32 * k, 0.05 * k
	dz = lambda x: deck_z(x, L, deck, bs_, ss_)
	m_hull = pbr(f'{sid}_hull', '#b8231d', 'painted_metal_shutter', 0.7, 0.25, 0.42, plates=True)
	m_boot = pbr(f'{sid}_boot', '#1c1b20', 'rusty_painted_metal', 0.7, 0.3, 0.5)
	m_deck = pbr(f'{sid}_deck', '#7d7a74', 'painted_metal_shutter', 1.2, 0.4, 0.7)
	m_sup = pbr(f'{sid}_sup', '#f3f0ea', 'painted_metal_shutter', 0.5, 0.06, 0.42)
	m_red = pbr(f'{sid}_red', '#c42a22', rough=0.4)
	m_win = pbr(f'{sid}_win', '#1b2433', rough=0.08, spec=0.9)
	m_met = pbr(f'{sid}_met', '#c9ccd0', rough=0.3, metal=0.9)
	h = obj_from_mesh(sid + '_hull', hull_mesh2(sid + '_hm', L, B, keel, deck, bs_, ss_, n=40, stern_w=0.78), m_hull, parent=root)
	h.data.materials.append(m_deck)
	obj_from_mesh(sid + '_bootm', hull_mesh2(sid + '_bm', L * 1.004, B * 1.015, keel, 0.06 * k, 0.0, 0.0, n=32, stern_w=0.78), m_boot, parent=root)
	# white sheer stripe
	cube(f'{sid}_stripe', m_sup, (0.0, 0, deck - 0.02 * k), (L * 0.38, B / 2 + 0.006, 0.025 * k), parent=root)
	z = dz(-0.3 * k)
	cube(f'{sid}_cabin', m_sup, (-0.35 * k, 0, z + 0.27 * k), (1.15 * k, 0.62 * k, 0.27 * k), parent=root, bev=0.03 * k)
	for s in (-1, 1):
		for j in range(6):
			cube(f'{sid}_cw{s}{j}', m_win, (-1.25 * k + j * 0.36 * k, s * 0.625 * k, z + 0.33 * k), (0.11 * k, 0.005, 0.07 * k), parent=root)
	zw = z + 0.54 * k
	cube(f'{sid}_wh', m_sup, (0.15 * k, 0, zw + 0.24 * k), (0.55 * k, 0.55 * k, 0.24 * k), parent=root, bev=0.03 * k)
	cube(f'{sid}_whf', m_win, (0.705 * k, 0, zw + 0.3 * k), (0.005, 0.48 * k, 0.11 * k), parent=root)
	for s in (-1, 1):
		cube(f'{sid}_whs{s}', m_win, (0.25 * k, s * 0.555 * k, zw + 0.3 * k), (0.32 * k, 0.005, 0.11 * k), parent=root)
	cube(f'{sid}_whr', m_red, (0.15 * k, 0, zw + 0.5 * k), (0.6 * k, 0.6 * k, 0.025 * k), parent=root, bev=0.01 * k)
	# monitor platform (aft of the wheelhouse) with railing + two water cannons
	zp = zw + 0.53 * k
	cube(f'{sid}_plat', m_red, (-0.75 * k, 0, zp), (0.5 * k, 0.5 * k, 0.03 * k), parent=root)
	cyl(f'{sid}_platpost', m_met, (-0.75 * k, 0, zw + 0.25 * k), 0.08 * k, 0.5 * k, parent=root)
	p = [(-1.25 * k, -0.5 * k, zp), (-0.25 * k, -0.5 * k, zp), (-0.25 * k, 0.5 * k, zp), (-1.25 * k, 0.5 * k, zp), (-1.25 * k, -0.5 * k, zp)]
	obj_from_mesh(f'{sid}_pr', rail_mesh(f'{sid}_prm', p, 0.1 * k, 0.2 * k, 0.007 * k), m_met, parent=root)
	mons = []
	for j, (mx, my) in enumerate(((-0.55 * k, 0.25 * k), (-0.95 * k, -0.25 * k))):
		cyl(f'{sid}_mb{j}', m_red, (mx, my, zp + 0.08 * k), 0.07 * k, 0.16 * k, parent=root)
		mons.append(Vector((mx, my, zp + 0.2 * k)))
	# mast + radar + blue light
	cyl(f'{sid}_mast', m_met, (0.1 * k, 0, zw + 0.9 * k), 0.025 * k, 0.8 * k, parent=root)
	cube(f'{sid}_radar', m_sup, (0.1 * k, 0, zw + 1.05 * k), (0.04 * k, 0.3 * k, 0.02 * k), parent=root)
	prim('sphere', f'{sid}_blue', pbr(f'{sid}_bl', '#3d7bff', emit=('#5a8cff', 2.0)), (0.1 * k, 0, zw + 1.33 * k), (0.05 * k,) * 3, u=10, v=8, parent=root)
	# bow fender + deck rail
	pr = [(x, s * (B / 2 - 0.05), dz(x)) for s in (-1,) for x in np.linspace(-L * 0.45, L * 0.42, 8)]
	obj_from_mesh(f'{sid}_dr', rail_mesh(f'{sid}_drm', [Vector(q) for q in pr], 0.12 * k, 0.4 * k, 0.007 * k), m_met, parent=root)
	pr = [(x, (B / 2 - 0.05), dz(x)) for x in np.linspace(-L * 0.45, L * 0.42, 8)]
	obj_from_mesh(f'{sid}_dr2', rail_mesh(f'{sid}_drm2', [Vector(q) for q in pr], 0.12 * k, 0.4 * k, 0.007 * k), m_met, parent=root)
	return dict(root=root, monitors=mons, sid=sid, k=k)

def _jet_tube(name, pts, r0, r1, seg=14):
	"""tube mesh along a polyline; UV u = position along (0..1), v = around"""
	bm = bmesh.new(); uv = bm.loops.layers.uv.new('UVMap'); rings = []
	n = len(pts)
	for i, p in enumerate(pts):
		t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
		a = t.cross(Vector((0, 0, 1)))
		if a.length < 1e-4: a = Vector((1, 0, 0))
		a.normalize(); b = a.cross(t).normalized()
		s = i / (n - 1); r = r0 + (r1 - r0) * s ** 1.3
		rings.append([bm.verts.new(p + (a * math.cos(2 * math.pi * j / seg) + b * math.sin(2 * math.pi * j / seg)) * r) for j in range(seg)])
	for i in range(n - 1):
		for j in range(seg):
			f = bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][(j + 1) % seg], rings[i][(j + 1) % seg]))
			for lp, (uu, vv) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
				lp[uv].uv = (uu / (n - 1), vv / seg)
	bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	for p_ in me.polygons: p_.use_smooth = True
	return me

def _water_mat(name, kind='core', flow=6.0):
	"""fake-volume water: soft silhouette (facing), streaks flowing along the jet (UV u), breaking up towards the end;
	'spray' = sparse stretched droplets around the core"""
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	try: m.surface_render_method = 'BLENDED'
	except Exception: pass
	out = node(nt, 'ShaderNodeOutputMaterial', (900, 0))
	pb = node(nt, 'ShaderNodeBsdfPrincipled', (500, 0)); pb.inputs['Base Color'].default_value = hexc('#eef7fb')
	pb.inputs['Roughness'].default_value = 0.25
	pb.inputs['Emission Color'].default_value = hexc('#e8f4ff'); pb.inputs['Emission Strength'].default_value = 0.35
	tv = node(nt, 'ShaderNodeValue', (-1200, 300)); tv.label = 'TIME'
	uvn = node(nt, 'ShaderNodeUVMap', (-1200, 0)); sep = SEP(nt, uvn.outputs['UV'])
	u, v = sep[0], sep[1]
	ang = M(nt, 'MULTIPLY', v, 2 * math.pi)
	cv = node(nt, 'ShaderNodeCombineXYZ')
	along = 26.0 if kind == 'core' else 70.0
	around = 1.2 if kind == 'core' else 6.0
	put(nt, cv.inputs['X'], M(nt, 'SUBTRACT', M(nt, 'MULTIPLY', u, along), M(nt, 'MULTIPLY', tv.outputs[0], flow)))
	put(nt, cv.inputs['Y'], M(nt, 'MULTIPLY', M(nt, 'SINE', ang), around)); put(nt, cv.inputs['Z'], M(nt, 'MULTIPLY', M(nt, 'COSINE', ang), around))
	nz = node(nt, 'ShaderNodeTexNoise', (-300, -200)); nz.inputs['Scale'].default_value = 1.0 if kind == 'core' else 2.2
	nz.inputs['Detail'].default_value = 6.0 if kind == 'core' else 2.0; link(nt, cv.outputs[0], nz.inputs['Vector'])
	lw = node(nt, 'ShaderNodeLayerWeight', (-300, 200)); lw.inputs['Blend'].default_value = 0.5
	edge = M(nt, 'POWER', M(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']), 1.4 if kind == 'core' else 0.6)
	if kind == 'core':
		thr = M(nt, 'ADD', 0.28, M(nt, 'MULTIPLY', M(nt, 'POWER', u, 1.5), 0.3))           # breaks up towards the end
		brk = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nz.outputs['Fac'], thr), 5.0, clamp=True)
		op = M(nt, 'SUBTRACT', 1.0, M(nt, 'MULTIPLY', u, 0.45))
		start = M(nt, 'MULTIPLY', u, 60.0, clamp=True)
	else:
		brk = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', nz.outputs['Fac'], 0.6), 9.0, clamp=True)
		op = M(nt, 'MULTIPLY', M(nt, 'POWER', u, 0.8), 0.5)          # a light droplet veil, the stream itself stays the read
		start = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', u, 0.08), 6.0, clamp=True)
	end = M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', 1.0, u), 12.0, clamp=True)
	a = M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', M(nt, 'MULTIPLY', edge, brk), M(nt, 'MULTIPLY', op, start)), end, clamp=True)
	put(nt, pb.inputs['Alpha'], a)
	link(nt, pb.outputs[0], out.inputs['Surface'])
	VOLT.append([tv, 0.0])
	return m

def water_jet(name, parent, origin, yaw_deg, reach=10.0, height=6.0, r0=0.05, r1=0.55, mist=True):
	"""steady fireboat water arch from `origin` (parent-local) along local heading yaw_deg; lands on the water (z=0 of the
	parent's frame). Core stream + droplet spray sheath + a mist cloud where it falls"""
	d = Vector((math.cos(math.radians(yaw_deg)), math.sin(math.radians(yaw_deg)), 0))
	o = Vector(origin)
	pts = [o + d * reach * s + Vector((0, 0, 4 * height * s * (1 - s) - o.z * s * s)) for s in np.linspace(0, 1, 64)]
	core = obj_from_mesh(name + '_core', _jet_tube(name + '_cm', pts, r0, r1), _water_mat(name + '_cmat', 'core'), parent=parent)
	spray = obj_from_mesh(name + '_spray', _jet_tube(name + '_sm', pts, r0 * 3, r1 * 2.6), _water_mat(name + '_smat', 'spray', 9.0), parent=parent)
	for ob in (core, spray): ob.visible_shadow = False
	res = [core, spray]
	if mist:
		end = pts[-1]
		mo, _ = volume_box(name + '_mist', (end.x, end.y, 1.0), (3.2, 3.2, 2.6), '#f4f8fb', 0.5, scale=0.9, thr=0.38, soft=0.3,
		                   speed=(0, 0, 1.2), anisotropy=0.5, grounded=True, parent=parent)
		mo.location = (end.x, end.y, 1.3)
		res.append(mo)
	return res


# ====================================================================================================== cheering crowd (v3)
CHEER = []     # (person, mode, phase): arms posed over the clip every frame by tick_v2
from mathutils import Euler as _Euler

def cheer(P, mode='wave', phase=0.0):
	"""mode: 'wave' (right arm up, waving), 'both' (both arms up in a V, pumping), 'flag' (right arm up, flag swinging)"""
	P = P['P'] if 'P' in P else P
	CHEER.append((P, mode, phase))

# Kenney mini-character arms (measured 21.10): at the identity pose the arm mesh sticks out sideways (T-pose); in bone-local
# space (Y = up, Z = forward) the right hand lies along D0['arm-right']. A pose is set by rotating D0 onto a target direction
# given in the character's own frame (x = its left, −y = forward, z = up) → bone-local (x, z, −y).
D0 = {'arm-right': Vector((-0.979, 0.138, 0.153)).normalized(), 'arm-left': Vector((0.979, 0.138, 0.153)).normalized()}
HAND_R = 0.29                     # shoulder → hand, armature units

def _arm_q(side, d_char):
	d = Vector(d_char).normalized()
	return D0[side].rotation_difference(Vector((d.x, d.z, -d.y)))

def pose_cheer(P, t, mode, ph):
	arm = P['arm']
	w = math.sin((t + ph) * (8.5 if mode != 'both' else 6.0))
	for side, sg in (('arm-right', -1), ('arm-left', 1)):
		if mode in ('wave', 'flag') and side == 'arm-left': continue
		if mode == 'up': d = (sg * 0.22, -0.05, 0.97)
		elif mode == 'both': d = (sg * (0.62 + 0.12 * w), -0.12, 0.78)
		else: d = (sg * (0.42 + (0.22 if mode == 'wave' else 0.3) * w), -0.12, 0.9)     # waving overhead
		pb = arm.pose.bones[side]; pb.rotation_mode = 'QUATERNION'
		pb.rotation_quaternion = _arm_q(side, d)

def hand_flag(P, name, flag='west_germany', side='arm-right'):
	"""small flag on a stick in the character's hand (bone-parented; positioned along the measured arm direction D0)"""
	P = P['P'] if 'P' in P else P
	arm = P['arm']
	d0 = D0[side]; hand = d0 * HAND_R - Vector((0, 0.15, 0))       # relative to the bone tail
	st = prim('cyl', name + '_stick', pbr('flagstick', '#d8c49c', rough=0.7), (0, 0, 0), (0.007, 0.007, 0.13), seg=6)
	st.parent = arm; st.parent_type = 'BONE'; st.parent_bone = side
	st.location = hand + d0 * 0.11; st.rotation_euler = d0.to_track_quat('Z', 'Y').to_euler()
	bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=6, y_segments=3, size=1.0)
	me = bpy.data.meshes.new(name + '_fm'); bm.to_mesh(me); bm.free()
	fg = obj_from_mesh(name + '_flag', me, flagmat2(flag)); flag_uv(fg)
	fg.parent = arm; fg.parent_type = 'BONE'; fg.parent_bone = side
	tip = hand + d0 * 0.2
	fg.location = tip + Vector((0, 0, 0.0)) - d0 * 0.03 + Vector((0, 0, 0.0)); fg.scale = (0.085, 0.055, 1)
	fg.rotation_euler = d0.to_track_quat('Y', 'Z').to_euler()
	wv = fg.modifiers.new('wave', 'WAVE'); wv.use_x = True; wv.use_y = False; wv.height = 0.25; wv.width = 1.2; wv.speed = 0.25; wv.narrowness = 1.0
	return fg

# ====================================================================================================== wooden boards (v3)
def wood_mat(name, base='#b5824f', dark='#6e4628', grain='Z', dusty=0.25):
	"""procedural sawn-pine boards: growth bands (Wave) across `grain` axis + fine streaks along the board, per-board tint
	(Object Info random), a little sandy dust. Use on meshes with real dimensions (board()), not on scaled cubes"""
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (1200, 0)); bs = node(nt, 'ShaderNodeBsdfPrincipled', (900, 0)); link(nt, bs.outputs[0], out.inputs['Surface'])
	tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0)); oi = node(nt, 'ShaderNodeObjectInfo', (-1200, -300))
	off = node(nt, 'ShaderNodeCombineXYZ'); put(nt, off.inputs['X'], M(nt, 'MULTIPLY', oi.outputs['Random'], 13.0)); put(nt, off.inputs['Y'], M(nt, 'MULTIPLY', oi.outputs['Random'], 7.0))
	pos = node(nt, 'ShaderNodeVectorMath'); pos.operation = 'ADD'; link(nt, tc.outputs['Object'], pos.inputs[0]); link(nt, off.outputs[0], pos.inputs[1])
	wv = node(nt, 'ShaderNodeTexWave', (-600, 200)); wv.wave_type = 'BANDS'; wv.bands_direction = grain
	wv.inputs['Scale'].default_value = 3.0; wv.inputs['Distortion'].default_value = 2.0; wv.inputs['Detail'].default_value = 2.0; wv.inputs['Detail Scale'].default_value = 1.0
	link(nt, pos.outputs[0], wv.inputs['Vector'])
	mp = node(nt, 'ShaderNodeMapping', (-800, -100)); ax = {'X': (14, 0.4, 0.4), 'Y': (0.4, 14, 0.4), 'Z': (0.4, 0.4, 14)}[grain]
	mp.inputs['Scale'].default_value = tuple(a * 3 for a in ax); link(nt, pos.outputs[0], mp.inputs['Vector'])
	st = node(nt, 'ShaderNodeTexNoise', (-600, -100)); st.inputs['Scale'].default_value = 2.0; st.inputs['Detail'].default_value = 6.0; link(nt, mp.outputs['Vector'], st.inputs['Vector'])
	g = M(nt, 'ADD', M(nt, 'MULTIPLY', wv.outputs['Fac'], 0.35), M(nt, 'MULTIPLY', st.outputs['Fac'], 0.65))
	col = RAMP(nt, g, [(0.2, C(dark)), (0.5, C(base)), (0.85, tuple(min(1, c * 1.12) for c in C(base)))], interp='LINEAR')
	tint = M(nt, 'ADD', 0.82, M(nt, 'MULTIPLY', oi.outputs['Random'], 0.32))
	col = MIX(nt, 1.0, col, tint, 'MULTIPLY')
	if dusty:
		dn = node(nt, 'ShaderNodeTexNoise', (-600, -400)); dn.inputs['Scale'].default_value = 3.0; dn.inputs['Detail'].default_value = 8.0
		link(nt, pos.outputs[0], dn.inputs['Vector'])
		col = MIX(nt, M(nt, 'MULTIPLY', M(nt, 'SUBTRACT', dn.outputs['Fac'], 0.45), dusty * 2.0, clamp=True), col, (0.8, 0.68, 0.5))
	link(nt, col, bs.inputs['Base Color'])
	bs.inputs['Roughness'].default_value = 0.78
	bp = node(nt, 'ShaderNodeBump', (600, -300)); bp.inputs['Strength'].default_value = 0.25; bp.inputs['Distance'].default_value = 0.004
	link(nt, g, bp.inputs['Height']); link(nt, bp.outputs['Normal'], bs.inputs['Normal'])
	return m

def board(name, mat, c, half, parent=None, bev=0.005, rot=(0, 0, 0)):
	"""box with its real dimensions baked into the mesh (textures in Object coords stay in true scale) + bevel"""
	bm = bmesh.new(); bmesh.ops.create_cube(bm, size=2.0)
	for v in bm.verts: v.co = Vector((v.co.x * half[0], v.co.y * half[1], v.co.z * half[2]))
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	o = obj_from_mesh(name, me, mat, c, parent); o.rotation_euler = rot
	if bev: bevel(o, bev, 2)
	return o

def haze_box(name, loc, size, density=0.03, color='#fff4e0', anisotropy=0.6):
	"""uniform thin air (light shafts from area/spot lights)"""
	if not VOL_ON: volume_setup()
	me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
	o = obj_from_mesh(name, me, None, loc); o.scale = size; o.visible_shadow = False
	m = bpy.data.materials.new(name + '_vol'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); pv = node(nt, 'ShaderNodeVolumePrincipled', (300, 0)); link(nt, pv.outputs[0], out.inputs['Volume'])
	pv.inputs['Color'].default_value = hexc(color); pv.inputs['Density'].default_value = density; pv.inputs['Anisotropy'].default_value = anisotropy
	o.data.materials.append(m)
	return o

def hull_band(name, L, B, x0, x1, z0, z1, mat, parent, stern_w=0.62, n=24, off=0.002):
	"""painted band that follows the hull side (both sides, closed round the stem) — replaces straight stripe boxes"""
	bm = bmesh.new(); xs = list(np.linspace(x0, x1, n)); rows = []
	for s_ in (-1, 1):
		row = []
		for x in xs:
			w = hull_half_width(x, L, B, stern_w) + off
			row.append((bm.verts.new((x, s_ * w, z0)), bm.verts.new((x, s_ * w, z1))))
		rows.append(row)
	for row in rows:
		for (a0, a1), (b0, b1) in zip(row, row[1:]): bm.faces.new((a0, b0, b1, a1))
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	return obj_from_mesh(name, me, mat, parent=parent)
