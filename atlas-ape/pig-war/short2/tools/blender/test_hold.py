import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from pw import *
setup2(0.0, 2.0)
world2(); sun2(4.0, rot=(55, 0, 35))
prim('plane', 'ground', pbr('meadow', '#7fb24a', rough=0.9), (0, 0, 0), (30, 30, 1), smooth_=False)
acts = [('holding-both', 'aim', 'male-f', 'us', 'kepi'), ('holding-both-shoot', 'aim', 'male-d', 'uk', 'shako'), ('holding-right', 'shoulder', 'male-f', 'us', 'kepi'), ('idle', 'shoulder', 'male-d', 'farmer', 'straw')]
for i, (a, m, k, sch, hh) in enumerate(acts):
	P = char(f'c{i}', k, sch, ((i - 1.5) * 0.7, 0, 0), math.radians(-50), 0.62, a)
	hat(P, hh)
	r = rifle(f'r{i}'); carry(P, r, m)
cam = camera(45); look(cam, (0.9, -3.4, 0.8), (0, 0, 0.3))
render2(lambda t: None, 'test_hold')
