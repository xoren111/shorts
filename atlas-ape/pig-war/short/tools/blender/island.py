"""The shared San Juan Island set (south end, Cutlar's farm by Griffin Bay). One world layout for every farm/bay shot so the
geography stays consistent between cuts:
  farm  — log cabin (−2.7, 1.4) facing −Y, potato patch x −1.9…2.3, y −2.1…0.7 (fence only on its west side: «not fully fenced»)
  hill  — US camp on a rise at (−5.0, 7.0), flag + field cannon + infantry line facing the bay
  shore — y ≈ 12.5; Griffin Bay beyond with the British frigate(s); Mt Baker far NE, Olympic range far right
Usage: from island import *; S = build(opts…) → dict of handles."""
import bpy, math, random
from mathutils import Vector
from pw import *
import env, frigate as FG

HILL = (-2.3, 9.2, 3.2, 2.0)
def ground_z(x, y):
	"""approximate ground height (hill only; the small noise is ignored) for placing props"""
	hx, hy, hr, hh = HILL
	d = math.hypot(x - hx, y - hy) / hr
	return hh * math.exp(-d * d * 2.2) if d < 1.6 else 0.0
CABIN = (-4.3, 1.9)

def build(cabin=True, patch=True, hill_camp=True, ships=1, ship_loc=(6.5, 30.0), ship_yaw=math.pi, firs=True, far=True,
          grass=320, sun_rot=(58, 0, 215), soldiers=5, potatoes=26, clouds=True, smoke=False, keep_clear=(), sol_h=0.7):
	world2(); S = {'sun': sun2(4.2, rot=sun_rot, angle=2.5)}
	S['ground'] = env.meadow('meadow', (150, 150), (0, 30), hills=[HILL, (9.0, 4.0, 5.0, 0.7), (-14, 3, 7, 1.2)], shore_y=12.5)
	S['sea'] = env.sea()
	if far:
		S['baker'] = env.mountain('baker', (-40, 240, -2), 75, 52, snow=0.5, seed=2, haze=0.5)
		S['olympics'] = [env.mountain(f'oly{i}', (x, y, -2), r, h, snow=0.7, seed=i + 4, haze=0.62, sky='#d4b2d8')
		                 for i, (x, y, r, h) in enumerate(((90, 210, 60, 26), (140, 230, 70, 30), (40, 260, 55, 22)))]
		# far islands across the strait (Lopez / Shaw silhouettes): low dark-green humps
		S['isl'] = [env.mountain(f'isle{i}', (x, y, -1.2), r, h, snow=2.0, seed=i + 9, haze=0.35, sky='#9fb4b0')
		            for i, (x, y, r, h) in enumerate(((-30, 70, 22, 4.5), (25, 85, 30, 5.5), (60, 70, 18, 3.5)))]
		for o in S['isl']:
			o.active_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
	if cabin:
		S['cabin'] = env.log_cabin('cabin', (-4.3, 1.9, 0.0), math.radians(12))
		env.rail_fence('fence2', (-7.0, 3.6), (-3.2, 3.9))
	if patch:
		S['patch'], S['pots'] = env.potato_patch('patch', -1.9, 2.3, -2.1, 0.7, rows=5, potatoes=potatoes, keep_clear=keep_clear)
	if firs:
		rnd = random.Random(11); pts = []
		for _ in range(16): pts.append((rnd.uniform(-13, -6.5), rnd.uniform(-1, 9), 0))
		for _ in range(10): pts.append((rnd.uniform(-11, -1), rnd.uniform(10.0, 12.2), 0))
		for _ in range(9): pts.append((rnd.uniform(9, 16), rnd.uniform(-2, 8), 0))
		pts = [(x, y, ground_z(x, y) - 0.05) for x, y, _ in pts if math.hypot(x - HILL[0], y - HILL[1]) > 2.4]
		S['firs'] = env.firs('fir', pts, 2.2, 3.4)
		S['rocks'] = env.rocks('rock', [(x, 12.6 + random.Random(i).uniform(-0.6, 0.8), 0.0) for i, x in enumerate(range(-14, 18, 3))], (0.9, 1.8))
	if grass:
		patch_box = (-2.3, 2.7, -2.5, 1.1)
		def avoid(x, y):
			return patch_box[0] < x < patch_box[1] and patch_box[2] < y < patch_box[3] or (-5.8 < x < -2.8 and 0.6 < y < 3.3)
		S['grass'] = env.scatter_grass('tuft', (-7, 9, -4, 11), grass, avoid=avoid)
	if hill_camp:
		hx, hy = HILL[0], HILL[1]
		top = ground_z(hx, hy)
		S['usflag'], S['usflagcloth'] = env.flagpole('usflag', (hx - 0.6, hy + 0.6, top - 0.05), 'us_1859', h=3.4, size=(0.75, 0.42))
		S['cannon'] = env.field_cannon('hillcannon', (hx + 1.0, hy - 0.2, ground_z(hx + 1.0, hy - 0.2)), math.radians(-35), 0.42)
		S['us'] = []
		for k in range(soldiers):
			x = hx - 0.9 + k * 0.55; y = hy - 1.25 + k * 0.42
			P = char(f'us{k}', ['male-f', 'male-d'][k % 2], 'us', (x, y, ground_z(x, y)), math.radians(125), sol_h, 'holding-both', 1.0, k * 0.21)
			hat(P, 'kepi'); r = rifle(f'usr{k}', 1.3); carry(P, r, 'aim')
			S['us'].append(P)
	S['ships'] = []
	for i in range(ships):
		F = FG.frigate(f'frig{i}', (ship_loc[0], ship_loc[1], env.SEA), ship_yaw, 1.0, smoke=smoke)
		S['ships'].append(F)
	if clouds:
		S['clouds'] = [cloud2('cl0', (-25, 120, 30), 9, seed=1), cloud2('cl1', (35, 140, 34), 11, seed=2)]
	return S
