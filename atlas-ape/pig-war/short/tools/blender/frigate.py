"""1850s Royal Navy screw frigate (HMS Satellite / Tribune type), procedural: black hull with the white gun-deck band and a
row of gun ports whose lids swing up while the guns run out, bulwark with hammock netting, three masts with tops, yards and
furled sails, bowsprit + jib-boom, a black funnel between fore- and mainmast, standing rigging, a big ensign at the stern.
Ship axes: bow = +X, port = +Y, up = Z, waterline z = 0. Unit ≈ 1 m / 3.6 (L 16 ≈ 58 m)."""
import bpy, math
import numpy as np
from mathutils import Vector
from kit import *
from yf2 import *
import pw

L, B, KEEL, DECK = 16.0, 3.7, -1.7, 1.45
BOWS, STERNS, STERNW = 0.35, 0.45, 0.78
FRIGATES = []

def _zd(x):
	return deck_z(x, L, DECK, BOWS, STERNS)

def frigate(sid, loc=(0, 0, 0), yaw=0.0, s=1.0, flag='union_jack', ports=10, smoke=True, furled=True):
	m_hull = pbr(sid + '_hull', '#1c1b1f', 'weathered_planks', 1.5, 0.25, 0.45)
	m_band = pbr(sid + '_band', '#efe9da', 'weathered_planks', 1.5, 0.2, 0.5)
	m_port = pbr(sid + '_port', '#0e0d10', rough=0.6)
	m_deck = pbr(sid + '_deck', '#c9a777', 'dark_wooden_planks', 2.0, 0.45, 0.6)
	m_mast = pbr(sid + '_mast', '#d9c49b', 'pine_bark', 2.0, 0.15, 0.55)
	m_top = pbr(sid + '_top', '#1d1c20', rough=0.5)
	m_sail = pbr(sid + '_sail', '#f2ead6', rough=0.85)
	m_gun = pbr(sid + '_gun', '#232327', rough=0.35, metal=0.7)
	m_red = pbr(sid + '_red', '#9b2b25', rough=0.6)
	R = empty(sid, loc); R.rotation_euler = (0, 0, yaw); R.scale = (s, s, s)
	me = hull_mesh2(sid + '_hullm', L, B, KEEL, DECK, BOWS, STERNS, 72, STERNW, 20)
	h = obj_from_mesh(sid + '_hullo', me, m_hull, parent=R); h.data.materials.append(m_deck)
	# white gun-deck band + gun ports with lids and guns
	z0, z1 = 0.72, 1.06
	hull_band(sid + '_band', L, B, -5.9, 5.2, z0, z1, m_band, R, STERNW, 40, 0.004)
	lids, guns = [], []
	xs = np.linspace(-5.0, 4.3, ports)
	for side in (-1, 1):
		for i, x in enumerate(xs):
			w = hull_half_width(x, L, B, STERNW)
			pc = (x, side * (w + 0.006), (z0 + z1) / 2)
			cube(f'{sid}_pt{side}{i}', m_port, pc, (0.2, 0.01, 0.14), parent=R)
			hp = empty(f'{sid}_lidp{side}{i}', (x, side * (w + 0.02), (z0 + z1) / 2 + 0.15), R)
			cube(f'{sid}_lid{side}{i}', m_hull, (0, 0, -0.15), (0.21, 0.018, 0.15), parent=hp, bev=0.01)
			lids.append((hp, side, i))
			gp = empty(f'{sid}_gunp{side}{i}', (x, side * (w - 0.45), (z0 + z1) / 2 - 0.02), R)
			g = prim('cyl', f'{sid}_gun{side}{i}', m_gun, (0, side * 0.0, 0), (0.07, 0.07, 0.42), seg=14, rot=(math.pi / 2, 0, 0), r2=0.8)
			g.parent = gp
			mz = prim('cyl', f'{sid}_mz{side}{i}', m_gun, (0, side * 0.42, 0), (0.085, 0.085, 0.03), seg=14, rot=(math.pi / 2, 0, 0)); mz.parent = gp
			guns.append((gp, side, i))
	# bulwark + hammock netting (cream canvas rolls on the rail)
	bulwark(sid + '_bulw', L, B, _zd, -6.6, 7.4, 0.42, m_hull, R, 40)
	for side in (-1, 1):
		for k in range(28):
			x = -6.3 + k * 0.48
			w = hull_half_width(x, L, B, STERNW)
			prim('cyl', f'{sid}_ham{side}{k}', m_sail, (x, side * (w - 0.06), _zd(x) + 0.47), (0.1, 0.1, 0.25), seg=10, rot=(0, math.pi / 2, 0)).parent = R
	# stern: windows + gallery
	m_win = pbr(sid + '_win', '#ffd88a', emit=('#ffcf7a', 1.2))
	for k in range(5):
		cube(f'{sid}_sw{k}', m_win, (-L / 2 * 0.985, -1.0 + k * 0.5, 1.0), (0.02, 0.14, 0.13), parent=R)
	# masts: (x, height above deck, lower-mast radius)
	masts = [(4.7, 13.0, 0.17), (0.7, 14.5, 0.19), (-4.1, 11.0, 0.15)]
	tops = []
	for j, (mx, mh, mr) in enumerate(masts):
		zb = _zd(mx)
		lower = mh * 0.45; top_ = mh * 0.33; tg = mh * 0.22
		cyl(f'{sid}_m{j}a', m_mast, (mx, 0, zb + lower / 2), mr, lower, parent=R, seg=14, r2=0.85)
		cube(f'{sid}_m{j}top', m_top, (mx + 0.2, 0, zb + lower), (0.75, 0.95, 0.05), parent=R, bev=0.02)
		cyl(f'{sid}_m{j}b', m_mast, (mx, 0, zb + lower + top_ / 2), mr * 0.62, top_, parent=R, seg=12, r2=0.8)
		cube(f'{sid}_m{j}cross', m_top, (mx, 0, zb + lower + top_), (0.25, 0.55, 0.035), parent=R)
		cyl(f'{sid}_m{j}c', m_mast, (mx, 0, zb + lower + top_ + tg / 2), mr * 0.38, tg, parent=R, seg=10, r2=0.6)
		prim('sphere', f'{sid}_m{j}truck', m_mast, (mx, 0, zb + mh + 0.05), (0.09,) * 3).parent = R
		# yards with furled sails: course, topsail, topgallant
		for k, (zz, yl) in enumerate(((zb + lower * 0.86, 3.6), (zb + lower + top_ * 0.62, 3.0), (zb + lower + top_ + tg * 0.6, 2.2))):
			ylen = yl * (0.82 if j == 2 else 1.0)
			cyl(f'{sid}_y{j}{k}', m_top, (mx + 0.1, 0, zz), 0.09, ylen * 2, parent=R, seg=10, rot=(math.pi / 2, 0, 0), r2=0.5)
			if furled:
				f = cyl(f'{sid}_fs{j}{k}', m_sail, (mx + 0.18, 0, zz + 0.1), 0.24 - 0.04 * k, ylen * 1.75, parent=R, seg=16, rot=(math.pi / 2, 0, 0), r2=0.75)
		tops.append((mx, zb + lower, zb + lower + top_, zb + mh))
		# shrouds: lower-mast top → channels on the hull side
		for side in (-1, 1):
			w = hull_half_width(mx, L, B, STERNW)
			for q in range(4):
				xq = mx - 0.55 + q * 0.32
				wire(f'{sid}_sh{j}{side}{q}', (mx, side * 0.6, zb + lower - 0.1), (xq, side * (w + 0.12), _zd(xq) + 0.15), 0.018, R, '#2a2522')
			wire(f'{sid}_tsh{j}{side}', (mx, side * 0.15, zb + lower + top_ - 0.1), (mx, side * 0.85, zb + lower + 0.03), 0.012, R, '#2a2522')
	# bowsprit + jib-boom
	bx = L / 2 * 0.97; bz = _zd(bx) + 0.25
	ang = math.radians(24)
	bs_len = 5.2
	tip = (bx + math.cos(ang) * bs_len, 0, bz + math.sin(ang) * bs_len)
	o = cyl(sid + '_bowsprit', m_mast, ((bx + tip[0]) / 2, 0, (bz + tip[2]) / 2), 0.16, bs_len, parent=R, seg=12, r2=0.45)
	o.rotation_euler = (0, math.pi / 2 - ang, 0)
	# stays: fore topmast → bowsprit, main → fore, mizzen → main
	wire(sid + '_st0', (masts[0][0], 0, tops[0][2]), tip, 0.014, R, '#2a2522')
	wire(sid + '_st0b', (masts[0][0], 0, tops[0][1]), (bx + 2.5, 0, bz + 1.1), 0.02, R, '#2a2522')
	wire(sid + '_st1', (masts[1][0], 0, tops[1][2]), (masts[0][0], 0, tops[0][1] + 0.2), 0.016, R, '#2a2522')
	wire(sid + '_st2', (masts[2][0], 0, tops[2][2]), (masts[1][0], 0, tops[1][1] + 0.2), 0.014, R, '#2a2522')
	# figurehead (gilded scroll) + red trim at the stern
	prim('sphere', sid + '_fig', pw.mat('gold', '#f0c14b', 0.3, 0.8), (bx + 0.35, 0, bz - 0.25), (0.35, 0.16, 0.3)).parent = R
	hull_band(sid + '_wale', L, B, -7.3, 6.9, z1 + 0.32, z1 + 0.38, m_red, R, STERNW, 40, 0.006)
	# funnel between fore- and mainmast (lowered telescopic stack of a screw frigate)
	fx = 2.6
	cyl(sid + '_funnel', m_top, (fx, 0, _zd(fx) + 1.3), 0.42, 2.6, parent=R, seg=24)
	cyl(sid + '_funnelr', pbr(sid + '_band2', '#b9b2a5', rough=0.4, metal=0.5), (fx, 0, _zd(fx) + 2.55), 0.44, 0.12, parent=R, seg=24)
	smoke_o = None
	if smoke:
		smoke_o, _ = plume(sid + '_smoke', R, (fx, 0, _zd(fx) + 2.7), length=9.0, width=2.6, tilt=10.0, color='#5c5960', color_end='#c9c2c6', density=1.4,
		                   speed=(0.6, 0.0, 1.2), yaw=180)
	# ensign on the stern staff, pennant at the main truck
	sx = -L / 2 * 0.99
	cyl(sid + '_staff', m_mast, (sx - 0.25, 0, _zd(sx) + 1.7), 0.06, 3.4, parent=R, seg=8)
	fl = flag_obj(sid + '_ens', flag, (sx - 0.25 - 1.9, 0, _zd(sx) + 2.3), (1.85, 0.95), R)
	pn = flag_obj(sid + '_pen', 'pennant', (masts[1][0] - 1.6, 0, tops[1][3] - 0.3), (1.6, 0.12), R)
	F = {'sid': sid, 'root': R, 'lids': lids, 'guns': guns, 'flag': fl, 'pennant': pn, 'smoke': smoke_o}
	FRIGATES.append(F)
	return F

_flagm = {}
def flag_obj(name, flag, loc, size, parent):
	"""a cloth flag hanging from its luff at loc (luff = +X edge), waving by a Wave modifier driven in tick"""
	bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=16, y_segments=8, size=1.0)
	me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
	if flag == 'pennant':
		m = pw.mat('pennant', '#d42a33', 0.7)
	else:
		m = flagmat2(flag)
	o = obj_from_mesh(name, me, m, (0, 0, 0), parent)
	flag_uv(o)
	o.rotation_euler = (math.pi / 2, 0, 0)
	o.scale = (size[0], size[1], 1)
	o.location = loc
	w = o.modifiers.new('wave', 'WAVE'); w.use_x = True; w.use_y = False; w.height = 0.12; w.width = 0.9; w.speed = 0.0
	w.narrowness = 1.4; w.start_position_x = 1.0; w.falloff_radius = 0.0
	return o

def ports(F, k, stagger=0.06, dur=0.35, t=None):
	"""open lids + run out guns: k = time since the command (s); ports open one after another from bow to stern"""
	for hp, side, i in F['lids']:
		a = clamp01((k - (9 - i) * stagger) / dur)
		hp.rotation_euler = (side * math.radians(95) * ease(a), 0, 0)
	for gp, side, i in F['guns']:
		a = clamp01((k - (9 - i) * stagger - 0.15) / (dur * 1.3))
		w = gp.location
		gp['base'] = gp.get('base', abs(w.y))
		gp.location.y = side * (gp['base'] + 0.48 * easeOut(a))

def frigate_tick(t):
	for F in FRIGATES:
		for o in (F['flag'], F['pennant']):
			o.modifiers['wave'].time_offset = -t * 30
		F['root'].rotation_euler.x = math.sin(t * 0.7 + sum(map(ord, F['sid'])) % 5) * 0.008      # gentle roll at anchor
pw.UPDATERS.append(frigate_tick)
