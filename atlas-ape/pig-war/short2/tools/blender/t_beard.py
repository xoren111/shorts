import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island2 import *
setup_hist(0.0, 0.1)
sun2(3.6, (1.0, 0.8, 0.58), (58, 0, 215), 1.5)
env.meadow('meadow', (60, 60), (0, 10), shore_y=None)
for i, (r, st, c, g) in enumerate((('uk', 'full', '#4a3020', 1.0), ('us', 'full', '#a0562c', 2.5), ('kaiser', 'chops', '#efece6', 1.0), ('admiral', 'whiskers', '#e5e2da', 1.0))):
	P = human(f'p{i}', r, ((i - 1.5) * 0.7, 0, 0), 0.0, seed=i, pose='stand')
	fh = facial_hair(P, st, c); fh.scale.z = g; fh.scale.y = g
cam = camera(45); look(cam, (0, -4.2, 1.5), (0, 0, 1.45))
render2(lambda t: None, 't_beard')
