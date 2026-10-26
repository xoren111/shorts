"""Episode kit for «The Yellow Fleet» on top of kit.py (toon bands, ink hulls, violet skies).
One parametric 1960s cargo liner (loft hull with sheer, raked stem, cruiser stern; midship superstructure, funnel, kingposts,
derricks, hatches, lifeboats, ensign) in 8 liveries; every ship material carries a DUST value (0 = fresh 1967 paint,
1 = yellow sand + rust streaks) that shot scripts animate per frame. Plus: tug, lifeboat with rowers, toy sailors with
arms, toy tanks/tents/jets, desert with a canal and the Great Bitter Lake, toon water.
Scale: 1 unit = 10 m (a 150 m ship is 15 long). Waterline z = 0. Canal along +Y (north)."""
import bpy, bmesh, math
from pathlib import Path
import numpy as np
from mathutils import Vector
from kit import *
import kit

FLAGS = kit.ROOT / 'assets/flags'
DUST = C('#d8b05c')
DUST_DARK = C('#b38a45')
RUST = C('#9a4e2a')

# ------------------------------------------------------------------ liveries (hull, upper hull band, superstructure, funnel, funnel top, funnel band, flag)
LIV = {
	'bluefunnel': dict(hull='#1d1b24', sup='#f2ece0', fun='#3f7fc4', top='#15121a', band=None, flag='red_ensign'),
	'portline': dict(hull='#1d1b24', sup='#f2ece0', fun='#cf3b2e', top='#15121a', band=None, flag='red_ensign'),
	'bluestar': dict(hull='#2b2a33', sup='#f2ece0', fun='#d2402f', top='#15121a', band='#ffffff', flag='red_ensign'),
	'hapag': dict(hull='#1d1b24', sup='#f5f0e6', fun='#e8a43c', top='#15121a', band='#ffffff', flag='west_germany'),
	'nordwind': dict(hull='#2a2a31', sup='#f5f0e6', fun='#f5f0e6', top='#15121a', band='#2f5fb0', flag='west_germany'),
	'swedish': dict(hull='#5d6a78', sup='#f5f0e6', fun='#f2c331', top='#15121a', band='#2f6fb5', flag='sweden'),
	'polish': dict(hull='#1d1b24', sup='#f2ece0', fun='#15121a', top='#15121a', band='#d63a3a', flag='poland'),
	'bulgarian': dict(hull='#4f5866', sup='#f2ece0', fun='#f2ece0', top='#15121a', band='#2e9a62', flag='bulgaria'),
	'czech': dict(hull='#e9e4d8', sup='#f2ece0', fun='#2d5ea8', top='#15121a', band='#ffffff', flag='czechoslovakia'),
	'french': dict(hull='#f0ebe1', sup='#f0ebe1', fun='#15121a', top='#15121a', band=None, flag='france'),
	'american': dict(hull='#7b8590', sup='#e9e6dc', fun='#15121a', top='#15121a', band='#ffffff', flag='usa'),
}
BOOT = '#b8322a'      # red antifouling band at the waterline
DECKC = '#c79a64'     # wooden/rust-brown deck

# ------------------------------------------------------------------ dusty toon material
DUSTNODES = {}        # ship id → [Value nodes]
def smat(sid, name, hexcol, dust_to=DUST, streaks=False, flat=False):
	"""toon material whose base colour mixes towards sand (and rust streaks on hulls) by a per-ship DUST value node"""
	m = bpy.data.materials.new(f'{sid}_{name}'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (800, 0))
	val = node(nt, 'ShaderNodeValue', (-800, 300)); val.label = 'DUST'; val.outputs[0].default_value = 0.0
	DUSTNODES.setdefault(sid, []).append(val)
	base = C(hexcol) if isinstance(hexcol, str) else hexcol
	col = MIX(nt, M(nt, 'MULTIPLY', val.outputs[0], 0.88), base, dust_to)
	if streaks:
		tc = node(nt, 'ShaderNodeTexCoord')
		mp = node(nt, 'ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.2, 2.2, 0.25)
		link(nt, tc.outputs['Object'], mp.inputs['Vector'])
		nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 1.5
		link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
		st = M(nt, 'GREATER_THAN', nz.outputs['Fac'], 0.6)
		col = MIX(nt, M(nt, 'MULTIPLY', st, val.outputs[0]), col, RUST)
	if flat:
		EMIT(nt, col, out)
	else:
		EMIT(nt, MIX(nt, 1.0, col, toon(nt), 'MULTIPLY'), out)
	return m

def hull_mat(sid, hexcol):
	"""hull colour above the boot-topping band (object Z < 0.06 → red), dust + rust streaks"""
	m = bpy.data.materials.new(f'{sid}_hull'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (900, 0))
	val = node(nt, 'ShaderNodeValue', (-800, 300)); val.label = 'DUST'; val.outputs[0].default_value = 0.0
	DUSTNODES.setdefault(sid, []).append(val)
	tc = node(nt, 'ShaderNodeTexCoord'); sz = SEP(nt, tc.outputs['Object'])
	boot = M(nt, 'LESS_THAN', sz[2], 0.07)
	base = MIX(nt, boot, C(hexcol), C(BOOT))
	col = MIX(nt, M(nt, 'MULTIPLY', val.outputs[0], 0.6), base, DUST_DARK)
	mp = node(nt, 'ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.6, 2.6, 0.22)
	link(nt, tc.outputs['Object'], mp.inputs['Vector'])
	nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.2; nz.inputs['Detail'].default_value = 1.2
	link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
	st = M(nt, 'GREATER_THAN', nz.outputs['Fac'], 0.58)
	col = MIX(nt, M(nt, 'MULTIPLY', st, val.outputs[0]), col, RUST)
	EMIT(nt, MIX(nt, 1.0, col, toon(nt), 'MULTIPLY'), out)
	return m

def set_dust(sid, d):
	for v in DUSTNODES.get(sid, []):
		v.outputs[0].default_value = d

def flag_mat(name):
	return toon_mat('flag_' + name, (1, 1, 1), tex=FLAGS / f'{name}.png', bands=((0.75, 0.72, 0.8), (0.92, 0.9, 0.94), (1, 1, 1)))

# ------------------------------------------------------------------ hull loft
def hull_mesh(name, L=15.0, B=2.0, keel=-0.8, deck=0.45, bow_sheer=0.3, stern_sheer=0.12, n=48, stern_w=0.62):
	bm = bmesh.new()
	rings = []
	for i in range(n + 1):
		u = -1 + 2 * i / n
		x = u * L / 2
		if u > 0.3:
			w = B / 2 * max(0.015, 1 - ((u - 0.3) / 0.7) ** 1.7)
		elif u < -0.65:
			w = B / 2 * (stern_w + (1 - stern_w) * math.sqrt(max(0, 1 - ((-u - 0.65) / 0.35) ** 2)))
		else:
			w = B / 2
		zd = deck + bow_sheer * max(0, (u - 0.35) / 0.65) ** 2 + stern_sheer * max(0, (-u - 0.55) / 0.45) ** 2
		zb = keel
		if u > 0.8:
			zb = keel + (u - 0.8) / 0.2 * (zd - 0.02 - keel)        # raked stem up to the deck edge
		elif u < -0.88:
			zb = keel + (-u - 0.88) / 0.12 * (-0.25 - keel)           # cruiser stern rises
		D = deck - keel; bil = 0.13 * D; side = -0.16 * D        # bilge/side heights scale with the hull depth (small boats!)
		pts = [(-w, zd), (-w, side), (-0.93 * w, zb + bil), (-0.55 * w, zb), (0.55 * w, zb), (0.93 * w, zb + bil), (w, side), (w, zd)]
		ring = [bm.verts.new((x, y, min(max(z, zb), zd) if k not in (0, 7) else z)) for k, (y, z) in enumerate(pts)]
		rings.append(ring)
	for i in range(n):
		a, b = rings[i], rings[i + 1]
		for k in range(8):
			k2 = (k + 1) % 8
			f = bm.faces.new((a[k], b[k], b[k2], a[k2]))
			f.material_index = 1 if k == 7 else 0        # edge 7 → 0 is the deck strip
	f = bm.faces.new(list(reversed(rings[0]))); f.material_index = 0  # transom
	f = bm.faces.new(rings[-1]); f.material_index = 0
	bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	return me

def deck_z(x, L=15.0, deck=0.45, bow_sheer=0.3, stern_sheer=0.12):
	u = x / (L / 2)
	return deck + bow_sheer * max(0, (u - 0.35) / 0.65) ** 2 + stern_sheer * max(0, (-u - 0.55) / 0.45) ** 2

# ------------------------------------------------------------------ the cargo liner
def ship(sid, liv='bluefunnel', loc=(0, 0, 0), yaw=0.0, L=15.0, B=2.0, small=False, ink=0.03):
	"""returns dict(root, flag, funnel_top, smoke_anchor) — root origin at the waterline amidships, bow towards +X before yaw"""
	lv = LIV[liv]
	root = empty(sid, loc); root.rotation_euler = (0, 0, yaw)
	k = L / 15.0
	mh = hull_mat(sid, lv['hull']); md = smat(sid, 'deck', DECKC)
	me = hull_mesh(sid + '_hullm', L=L, B=B, keel=-0.8 * k, deck=0.45 * k, bow_sheer=0.3 * k, stern_sheer=0.12 * k)
	h = obj_from_mesh(sid + '_hull', me, mh, parent=root); h.data.materials.append(md)
	outline(h, ink)
	ms = smat(sid, 'sup', lv['sup']); mw = smat(sid, 'win', '#2a2440', dust_to=DUST_DARK)
	mf = smat(sid, 'fun', lv['fun']); mt = smat(sid, 'top', lv['top'], dust_to=DUST_DARK)
	mm = smat(sid, 'mast', '#d9b98a'); mhatch = smat(sid, 'hatch', '#6d5a4f', dust_to=DUST)
	dz = lambda x: deck_z(x, L, 0.45 * k, 0.3 * k, 0.12 * k)
	# superstructure: 3 tiers + bridge with wings, window strips
	sx = -1.4 * k
	tiers = [(3.2, 1.75, 0.34), (2.5, 1.55, 0.3), (1.5, 1.35, 0.28)] if not small else [(2.6, 1.6, 0.34), (1.6, 1.3, 0.3)]
	z = dz(sx)
	for i, (lx, by, hz) in enumerate(tiers):
		lx *= k; by *= k * B / 2.0; hz *= k
		prim('cube', f'{sid}_sup{i}', ms, (sx - 0.15 * i * k, 0, z + hz / 2), (lx / 2, by / 2, hz / 2), smooth_=False, ink=ink * 0.7, parent=root)
		prim('cube', f'{sid}_win{i}', mw, (sx - 0.15 * i * k + 0.02, 0, z + hz * 0.58), (lx / 2 + 0.012, by / 2 + 0.012, hz * 0.12), smooth_=False, parent=root)
		z += hz
	bz = z
	prim('cube', f'{sid}_wings', ms, (sx + 0.35 * k, 0, bz - 0.1 * k), (0.22 * k, B * 0.56, 0.05 * k), smooth_=False, ink=ink * 0.6, parent=root)
	# funnel (elliptic, raked) with top + band
	fx = sx - 1.25 * k
	fz = bz - 0.05 * k
	fh = (0.95 if not small else 0.75) * k
	fun = prim('cyl', f'{sid}_fun', mf, (fx, 0, fz + fh / 2), (0.42 * k, 0.32 * k, fh / 2), seg=20, ink=ink * 0.7, parent=root)
	fun.rotation_euler = (0, math.radians(-8), 0)
	top = prim('cyl', f'{sid}_funtop', mt, (fx - 0.06 * k, 0, fz + fh + 0.06 * k), (0.43 * k, 0.33 * k, 0.12 * k), seg=20, ink=ink * 0.5, parent=root)
	top.rotation_euler = (0, math.radians(-8), 0)
	if lv['band']:
		mb = smat(sid, 'band', lv['band'])
		b_ = prim('cyl', f'{sid}_funband', mb, (fx - 0.025 * k, 0, fz + fh * 0.62), (0.425 * k, 0.325 * k, 0.07 * k), seg=20, parent=root)
		b_.rotation_euler = (0, math.radians(-8), 0)
	smoke = empty(f'{sid}_smoke', (fx - 0.1 * k, 0, fz + fh + 0.2 * k), parent=root)
	# hatches + kingposts + derricks
	for hx in ((5.3, 3.2, -4.3, -6.0) if not small else (3.0, -3.6)):
		hx *= k
		prim('cube', f'{sid}_hatch{hx:.1f}', mhatch, (hx, 0, dz(hx) + 0.06 * k), (0.6 * k, 0.55 * k * B / 2, 0.07 * k), smooth_=False, ink=ink * 0.5, parent=root)
	for kx in ((4.3, -5.2) if not small else (2.0,)):
		kx *= k
		for s in (-1, 1):
			prim('cyl', f'{sid}_kp{kx:.1f}{s}', mm, (kx, s * 0.55 * k, dz(kx) + 0.55 * k), (0.05 * k, 0.05 * k, 0.55 * k), seg=8, ink=ink * 0.4, parent=root)
			bo = prim('cyl', f'{sid}_boom{kx:.1f}{s}', mm, (kx + 0.5 * k * (1 if kx > 0 else -1), s * 0.55 * k, dz(kx) + 0.6 * k), (0.025 * k, 0.025 * k, 0.6 * k), seg=6, parent=root)
			bo.rotation_euler = (0, math.radians(55 if kx > 0 else -55), 0)
		prim('cube', f'{sid}_kpx{kx:.1f}', mm, (kx, 0, dz(kx) + 1.08 * k), (0.05 * k, 0.6 * k, 0.04 * k), smooth_=False, parent=root)
	# foremast
	mx = 6.3 * k
	prim('cyl', f'{sid}_foremast', mm, (mx, 0, dz(mx) + 0.85 * k), (0.045 * k, 0.045 * k, 0.85 * k), seg=8, ink=ink * 0.4, parent=root)
	prim('cyl', f'{sid}_nest', mm, (mx, 0, dz(mx) + 1.2 * k), (0.11 * k, 0.11 * k, 0.05 * k), seg=10, parent=root)
	# lifeboats
	ml = smat(sid, 'lifeboat', '#f6f1e6')
	for s in (-1, 1):
		lb = prim('sphere', f'{sid}_lb{s}', ml, (sx - 0.4 * k, s * (0.8 * k * B / 2 + 0.1 * k), dz(sx) + 0.62 * k), (0.42 * k, 0.12 * k, 0.09 * k), ink=ink * 0.4, parent=root)
	# stern ensign on a staff
	ex = -L / 2 + 0.25 * k
	prim('cyl', f'{sid}_staff', mm, (ex, 0, dz(ex) + 0.35 * k), (0.02 * k, 0.02 * k, 0.35 * k), seg=6, parent=root)
	fp = empty(f'{sid}_flagpivot', (ex - 0.02 * k, 0, dz(ex) + 0.62 * k), parent=root)
	fg = prim('plane', f'{sid}_flag', flag_mat(lv['flag']), (-0.3 * k, 0, 0), (0.3 * k, 0.2 * k, 1), rot=(math.pi / 2, 0, 0), smooth_=False, parent=fp)
	fg.data.uv_layers.new() if not fg.data.uv_layers else None
	_flip_flag_uv(fg)
	return dict(root=root, flag=fp, smoke=smoke, sid=sid, L=L, k=k, deckz=dz, supx=sx, bridgez=bz)

def _flip_flag_uv(o):
	"""grid plane UVs → map the flag image so the hoist (canton) is at the staff (local +X end)"""
	uv = o.data.uv_layers.active.data
	for p in o.data.polygons:
		for li in p.loop_indices:
			v = o.data.vertices[o.data.loops[li].vertex_index].co
			uv[li].uv = (0.5 - v.x * 0.5, v.y * 0.5 + 0.5)

def wave_flag(sh, t, speed=1.0, amp=8.0):
	sh['flag'].rotation_euler = (0, 0, math.radians(amp * math.sin(t * 5.3 * speed + hash(sh['sid']) % 7)))

# ------------------------------------------------------------------ tug, lifeboat, sailors
def tug(name, loc=(0, 0, 0), yaw=0.0, ink=0.02):
	root = empty(name, loc); root.rotation_euler = (0, 0, yaw)
	mh = hull_mat(name, '#2a2730'); md = smat(name, 'deck', '#c4553c')
	me = hull_mesh(name + '_hm', L=3.2, B=1.0, keel=-0.35, deck=0.3, bow_sheer=0.2, stern_sheer=0.02, n=24, stern_w=0.8)
	h = obj_from_mesh(name + '_hull', me, mh, parent=root); h.data.materials.append(md); outline(h, ink)
	ms = smat(name, 'sup', '#f4ede0'); mf = smat(name, 'fun', '#d7402f'); mt = smat(name, 'top', '#15121a')
	prim('cube', name + '_sup', ms, (0.2, 0, 0.55), (0.6, 0.36, 0.25), smooth_=False, ink=ink * 0.7, parent=root)
	prim('cube', name + '_bridge', ms, (0.35, 0, 0.88), (0.35, 0.32, 0.12), smooth_=False, ink=ink * 0.6, parent=root)
	prim('cube', name + '_win', smat(name, 'win', '#2a2440'), (0.37, 0, 0.9), (0.36, 0.33, 0.04), smooth_=False, parent=root)
	prim('cyl', name + '_fun', mf, (-0.35, 0, 0.95), (0.17, 0.15, 0.3), seg=14, ink=ink * 0.6, parent=root)
	prim('cyl', name + '_ftop', mt, (-0.35, 0, 1.27), (0.175, 0.155, 0.05), seg=14, parent=root)
	sm = empty(name + '_smoke', (-0.35, 0, 1.4), parent=root)
	return dict(root=root, smoke=sm, sid=name)

SKIN = ['#e9b48c', '#c98d64', '#8d5a3c', '#f1c7a2', '#b97b55']
SHIRT = ['#f4f1ea', '#2f4f8f', '#d9d4c6', '#3d6fb6', '#e8e2d2']
def sailor(name, loc=(0, 0, 0), yaw=0.0, shirt=None, skin=None, cap='#f7f5ef', s=1.0, seed=0, ink=0.006):
	"""toy sailor ≈ 0.19 tall (s=1); returns dict(root, armL, armR, legL, legR, head) — arms are pivots at the shoulders"""
	rng = np.random.default_rng(seed)
	shirt = shirt or SHIRT[int(rng.integers(len(SHIRT)))]; skin = skin or SKIN[int(rng.integers(len(SKIN)))]
	root = empty(name, loc); root.rotation_euler = (0, 0, yaw); root.scale = (s, s, s)
	msh = toon_mat('shirt' + shirt, C(shirt)); msk = toon_mat('skin' + skin, C(skin)); mpt = toon_mat('pants', C('#2b2e48'))
	P = {'root': root}
	for side in (-1, 1):
		lg = empty(f'{name}_leg{side}', (0, side * 0.018, 0.085), parent=root)
		prim('cyl', f'{name}_legm{side}', mpt, (0, 0, -0.042), (0.014, 0.014, 0.043), seg=8, ink=ink, parent=lg)
		P['legL' if side < 0 else 'legR'] = lg
	prim('cyl', name + '_body', msh, (0, 0, 0.115), (0.032, 0.026, 0.04), seg=12, ink=ink, parent=root)
	hd = empty(name + '_head', (0, 0, 0.17), parent=root)
	prim('sphere', name + '_headm', msk, (0, 0, 0), (0.024, 0.024, 0.026), u=14, v=10, ink=ink, parent=hd)
	prim('cyl', name + '_cap', toon_mat('cap' + cap, C(cap)), (0, 0, 0.022), (0.025, 0.025, 0.008), seg=12, ink=ink * 0.8, parent=hd)
	P['head'] = hd
	for side in (-1, 1):   # tiny dot eyes looking +X so the toy reads as a face
		prim('sphere', f'{name}_eye{side}', toon_mat('eyedot', C('#140c18'), flat=True), (0.021, side * 0.009, 0.004), (0.004, 0.004, 0.005), u=6, v=4, parent=hd)
	for side in (-1, 1):
		ar = empty(f'{name}_arm{side}', (0, side * 0.036, 0.148), parent=root)
		prim('cyl', f'{name}_armm{side}', msh, (0, 0, -0.03), (0.009, 0.009, 0.032), seg=8, ink=ink * 0.8, parent=ar)
		prim('sphere', f'{name}_hand{side}', msk, (0, 0, -0.064), (0.01, 0.01, 0.01), u=8, v=6, parent=ar)
		P['armL' if side < 0 else 'armR'] = ar
	return P

def wave_arm(arm, t, side, phase=0.0, up=150, amp=25, speed=7.0):
	"""raise an arm sideways (side −1 = left arm at −Y, +1 = right arm at +Y) and wave"""
	arm.rotation_euler = (math.radians(side * (up + amp * math.sin(t * speed + phase))), 0, 0)

def rowboat(name, loc=(0, 0, 0), yaw=0.0, n=4, hull='#f2efe6', stripe='#e0592b', seed=0):
	root = empty(name, loc); root.rotation_euler = (0, 0, yaw)
	me = hull_mesh(name + '_hm', L=1.3, B=0.36, keel=-0.08, deck=0.07, bow_sheer=0.05, stern_sheer=0.03, n=16, stern_w=0.5)
	h = obj_from_mesh(name + '_hull', me, toon_mat('rb' + hull, C(hull)), parent=root); h.data.materials.append(toon_mat('rbin', C('#b78655'))); outline(h, 0.008)
	prim('cube', name + '_stripe', toon_mat('rbs' + stripe, C(stripe)), (0, 0, 0.045), (0.5, 0.185, 0.012), smooth_=False, parent=root)
	rowers, oars = [], []
	for i in range(n):
		x = 0.38 - i * 0.24
		r = sailor(f'{name}_r{i}', (x, 0, 0.0), math.pi, s=0.85, seed=seed * 10 + i)
		r['root'].parent = root
		rowers.append(r)
		for side in (-1, 1):
			op = empty(f'{name}_op{i}{side}', (x - 0.03, side * 0.17, 0.08), parent=root)
			prim('cyl', f'{name}_oar{i}{side}', toon_mat('oar', C('#d8b07a')), (0, side * 0.22, -0.03), (0.006, 0.006, 0.24), seg=6, rot=(math.radians(side * 80), 0, 0), parent=op)
			oars.append((op, side, i))
	return dict(root=root, rowers=rowers, oars=oars)

def row(boat, t, rate=2.2):
	for op, side, i in boat['oars']:
		ph = t * rate * 2 * math.pi
		op.rotation_euler = (math.radians(-side * 12 * math.cos(ph)), 0, math.radians(28 * math.sin(ph)))
	for r in boat['rowers']:
		ph = t * rate * 2 * math.pi
		r['root'].rotation_euler = (0, math.radians(-18 * math.sin(ph)), math.pi)

# ------------------------------------------------------------------ toy military (never firing)
def tank(name, loc=(0, 0, 0), yaw=0.0, col='#6f7d3c', ink=0.02, s=1.0):
	root = empty(name, loc); root.rotation_euler = (0, 0, yaw); root.scale = (s, s, s)
	mb = toon_mat('tank' + col, C(col)); mt = toon_mat('track', C('#3a3530'))
	prim('cube', name + '_hull', mb, (0, 0, 0.16), (0.42, 0.24, 0.08), smooth_=False, ink=ink, parent=root)
	for sd in (-1, 1):
		prim('cube', f'{name}_trk{sd}', mt, (0, sd * 0.24, 0.08), (0.46, 0.07, 0.08), smooth_=False, ink=ink, parent=root)
	tur = empty(name + '_tur', (-0.04, 0, 0.27), parent=root)
	prim('sphere', name + '_turm', mb, (0, 0, 0), (0.2, 0.16, 0.08), u=16, v=10, ink=ink, parent=tur)
	prim('cyl', name + '_gun', mb, (0.34, 0, 0.02), (0.025, 0.025, 0.24), seg=8, rot=(0, math.pi / 2, 0), ink=ink * 0.7, parent=tur)
	return dict(root=root, tur=tur)

def tent(name, loc=(0, 0, 0), yaw=0.0, col='#b9a46b', ink=0.02, s=1.0):
	bm = bmesh.new()
	vs = [bm.verts.new(v) for v in ((-0.3, -0.25, 0), (0.3, -0.25, 0), (0.3, 0.25, 0), (-0.3, 0.25, 0), (-0.3, 0, 0.32), (0.3, 0, 0.32))]
	for f in ((0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
		bm.faces.new([vs[i] for i in f])
	bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	o = obj_from_mesh(name, me, toon_mat('tent' + col, C(col)), loc); o.rotation_euler = (0, 0, yaw); o.scale = (s, s, s)
	outline(o, ink)
	return o

def jet(name, col='#8d968f', ink=0.03, s=1.0):
	"""toy delta-wing jet, nose +X"""
	root = empty(name); root.scale = (s, s, s)
	mb = toon_mat('jet' + col, C(col)); mc = toon_mat('canopy', C('#4fc3e8'))
	prim('sphere', name + '_fus', mb, (0, 0, 0), (1.0, 0.16, 0.16), u=20, v=12, ink=ink, parent=root)
	prim('sphere', name + '_can', mc, (0.45, 0, 0.12), (0.22, 0.09, 0.08), u=14, v=8, ink=ink * 0.6, parent=root)
	bm = bmesh.new()
	vs = [bm.verts.new(v) for v in ((0.25, 0, 0), (-0.75, 0.85, 0), (-0.75, -0.85, 0))]
	bm.faces.new(vs); me = bpy.data.meshes.new(name + '_wm'); bm.to_mesh(me); bm.free()
	w = obj_from_mesh(name + '_wing', me, mb, (0, 0, -0.02), parent=root)
	sd = w.modifiers.new('sd', 'SOLIDIFY'); sd.thickness = 0.05; outline(w, ink)
	bm = bmesh.new()
	vs = [bm.verts.new(v) for v in ((-0.4, 0, 0.05), (-0.95, 0, 0.05), (-0.95, 0, 0.5))]
	bm.faces.new(vs); me = bpy.data.meshes.new(name + '_fm'); bm.to_mesh(me); bm.free()
	f = obj_from_mesh(name + '_fin', me, mb, parent=root)
	sd = f.modifiers.new('sd', 'SOLIDIFY'); sd.thickness = 0.05; outline(f, ink)
	return root

# ------------------------------------------------------------------ desert, canal, lake, water
SAND = (C('#f0cf8e'), C('#e2b46f'), C('#f6dda8'))
def desert(name, x0, x1, y0, y1, res=1.0, canal_w=8.0, bank=3.0, lake=None, dunes=0.5, seed=3):
	"""grid ground: canal along Y (|x| < canal_w water at z −0.6, embankments rise to +0.35 over `bank`), optional lake
	ellipse lake=(cx, cy, rx, ry); low dunes beyond. Returns the ground object."""
	nx, ny = int((x1 - x0) / res), int((y1 - y0) / res)
	me = bpy.data.meshes.new(name); bm = bmesh.new()
	bmesh.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=0.5)
	rng = np.random.default_rng(seed)
	ph = rng.uniform(0, 10, 6)
	for v in bm.verts:
		x = x0 + (v.co.x + 0.5) * (x1 - x0); y = y0 + (v.co.y + 0.5) * (y1 - y0)
		d = abs(x) - canal_w
		if lake:
			cx, cy, rx, ry = lake
			e = math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
			th = math.atan2((y - cy) / ry, (x - cx) / rx)
			e /= 1 + 0.13 * math.sin(3 * th + 1.1) + 0.07 * math.sin(5 * th + 0.4)    # irregular shore
			d = min(d, (e - 1) * min(rx, ry))
		if d < 0:
			z = -0.6
		elif d < bank:
			z = -0.6 + 0.95 * smooth(d / bank)
		else:
			far = d - bank
			z = 0.35 + dunes * (0.5 + 0.5 * math.sin(x * 0.045 + ph[0]) * math.sin(y * 0.03 + ph[1])) * min(1, far / 25) \
				+ dunes * 0.4 * (0.5 + 0.5 * math.sin(x * 0.11 + y * 0.07 + ph[2])) * min(1, far / 40)
		v.co = Vector((x, y, z))
	bm.to_mesh(me); bm.free()
	me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); g = node(nt, 'ShaderNodeNewGeometry')
	nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.05; nz.inputs['Detail'].default_value = 2.0
	link(nt, g.outputs['Position'], nz.inputs['Vector'])
	nz2 = node(nt, 'ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 0.17; nz2.inputs['Detail'].default_value = 1.0
	link(nt, g.outputs['Position'], nz2.inputs['Vector'])
	a = M(nt, 'GREATER_THAN', nz.outputs['Fac'], 0.56); b = M(nt, 'GREATER_THAN', nz2.outputs['Fac'], 0.63)
	base = MIX(nt, a, SAND[0], SAND[1]); base = MIX(nt, b, base, SAND[2])
	# wet dark band on the embankment near the waterline
	EMIT(nt, MIX(nt, 1.0, base, toon(nt), 'MULTIPLY'), out)
	return obj_from_mesh(name, me, m)

def water(name, size=(800, 800), loc=(0, 0, 0), col='#2aa3b8', col2='#6fd3dc', z=0.0, scale=0.6, thr=0.93):
	m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
	out = node(nt, 'ShaderNodeOutputMaterial', (600, 0))
	g = node(nt, 'ShaderNodeNewGeometry'); wv = node(nt, 'ShaderNodeTexWave', (-300, 0)); wv.inputs['Scale'].default_value = scale
	wv.inputs['Distortion'].default_value = 3.5; wv.inputs['Detail'].default_value = 1.0
	link(nt, g.outputs['Position'], wv.inputs['Vector'])
	band = M(nt, 'GREATER_THAN', wv.outputs['Fac'], thr)
	EMIT(nt, MIX(nt, band, C(col), C(col2)), out)
	o = prim('plane', name, m, (loc[0], loc[1], z), (size[0] / 2, size[1] / 2, 1), smooth_=False)
	return o, wv

def wake(name, length=7.0, spread=12.0, w=0.22):
	"""two thin white lines diverging from the bow backwards (parent to the ship root, place at the bow)"""
	bm = bmesh.new()
	for sgn in (-1, 1):
		a = math.radians(spread) * sgn
		d = Vector((-math.cos(a), math.sin(a), 0)); nrm = Vector((-d.y, d.x, 0)) * (w / 2)
		p0 = Vector((0, 0, 0.03)); p1 = p0 + d * length
		vs = [bm.verts.new(p0 - nrm * 0.3), bm.verts.new(p0 + nrm * 0.3), bm.verts.new(p1 + nrm), bm.verts.new(p1 - nrm)]
		bm.faces.new(vs)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	return obj_from_mesh(name, me, toon_mat('wake', C('#e9fbff'), flat=True))

PUFF = ((0.80, 0.70, 0.82), (0.97, 0.92, 0.88), (1.0, 0.99, 0.95))
def puff(name, loc, r, col=(1, 1, 1), parent=None, ink=0.0, bands=PUFF):
	return prim('ico', name, toon_mat('puff%s' % (col,), col, bands=bands), loc, (r, r, r), sub=2, ink=ink, parent=parent)

def sun_disc(loc, r, col='#ffe6a8'):
	return prim('sphere', 'sundisc', toon_mat('sundisc', C(col), flat=True), loc, (r, r, r), u=32, v=16)
