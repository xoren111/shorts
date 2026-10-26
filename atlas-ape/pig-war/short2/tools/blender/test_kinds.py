"""all 12 Kenney kinds: original look (top row) and in uniform (bottom row), front view"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from pw import *
setup2(0.0, 0.1); sc_ = bpy.context.scene; sc_.render.resolution_x, sc_.render.resolution_y = 1920, 1080
world2(); sun2(4.0, rot=(55, 0, 25))
prim('plane', 'ground', pbr('meadow', '#7fb24a', rough=0.9), (0, 0, 0), (30, 30, 1), smooth_=False)
for i, kind in enumerate(KINDS[:6]):
	P = person('o' + kind, kind, ((i - 2.5) * 0.75, 1.2, 0), 0.0, 0.62, 'idle'); PEOPLE.append(P)
	P = char(kind, kind, 'us', ((i - 2.5) * 0.75, 0, 0), 0.0, 0.62, 'holding-both')
cam = camera(50); cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36
look(cam, (0, -5.5, 1.6), (0, 0.6, 0.3))
render2(lambda t: None, 'test_kinds')
