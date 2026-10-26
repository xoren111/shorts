"""v2 look test: --variant canal (hook) / deck (friends) — one or two frames to compare with v1"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
import kit
from yf2 import *
VAR = arg('variant', 'canal')
setup2(1.0, 3.0)
if VAR == 'canal':
	world2(rot=200)
	sun2(4.5, (1.0, 0.8, 0.58), (70, 0, 165), 2.5)
	cloud2('c1', (-40, 300, 70), 12, seed=3); cloud2('c2', (60, 360, 95), 16, seed=7); cloud2('c3', (-10, 420, 120), 18, seed=9)
	desert2('desert', -70, 70, -30, 260, res=0.5, canal_w=5.5, bank=3.5, dunes=0.9, seed=5)
	wo, wt = water2('canal', (40, 400), (0, 100))
	sun_d = prim('sphere', 'sundisc', pbr('sund', '#ffe2a0', emit=('#ffd890', 6.0)), (40, 420, 22), (14, 14, 14), u=32, v=16)
	for i, (lv, y) in enumerate((('bluefunnel', 20), ('polish', 43), ('hapag', 66), ('swedish', 89), ('french', 112))):
		sh = ship2(f'cv{i}', lv, (0, y, 0), math.pi / 2, detail=1.0 if i < 2 else 0.0, rails=i < 2)
	scatter(['tree_palmTall.glb', 'tree_palmDetailedTall.glb'], 10, (-60, 40, -14, 220), 2.6, 4.0, seed=11, ink=0.0, z=0.35)
	cam = camera(30)
	def update(t):
		set_water_time(wt, t)
		look(cam, (4.2, 4.0, 5.0), (-0.8, 46, -0.6))
	render(update, 'style_' + VAR)
else:
	world2(rot=120)
	sun2(4.2, (1.0, 0.84, 0.64), (55, 0, -35), 3.0)
	wo, wt = water2('lake', (300, 300), (0, 0))
	A = ship2('uk', 'portline', (0, 1.4, 0), 0.0); B = ship2('pl', 'polish', (0, -1.4, 0), 0.0)
	for s_ in (A, B): set_dust2(s_['sid'], 0.45)
	dz = A['deckz']
	kinds = ['male-a', 'male-b', 'male-c', 'female-a', 'male-d', 'male-e', 'female-b', 'male-f', 'female-c', 'male-a', 'female-d', 'male-b']
	crew = []
	for i in range(6):
		crew.append(person(f'a{i}', kinds[i], (0.9 + 0.42 * i, 0.58, dz(1.0)), -math.pi / 2, 0.24, 'idle', 1.0, i * 0.3))
		crew.append(person(f'b{i}', kinds[6 + i], (0.95 + 0.42 * i, -0.58, dz(1.0)), math.pi / 2, 0.24, 'emote-yes' if i % 2 else 'idle', 1.0, i * 0.4))
	cam = camera(32)
	def update(t):
		set_water_time(wt, t)
		for p in crew: pose_at(p, t)
		look(cam, (-0.1, 0.0, 1.0), (3.4, 0.0, 0.42))
	render(update, 'style_' + VAR)
