import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
from yf2 import *
from mathutils import Euler
setup2(1.0, 1.1)
world2(); sun2(4.0, (1, 0.9, 0.8), (50, 0, 30))
prim('plane', 'floor', pbr('fl', '#c9a27a'), (0, 0, 0), (8, 8, 1))
acts = ['idle', 'emote-yes', 'interact-right', 'holding-both', 'jump', 'attack-kick-right', 'sprint', 'pick-up', 'emote-no', 'sit']
ps = []
for i, a in enumerate(acts):
	p = person(f'p{i}', 'male-a', ((i % 5) * 0.6 - 1.2, (i // 5) * 1.2, 0), math.pi, 0.45, a)
	pose_at(p, 0.25)
	ps.append(p)
cam = camera(40)
def update(t): look(cam, (0, -5.5, 1.6), (0, 0.6, 0.3))
render(update, 'char_test')
