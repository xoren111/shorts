import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from pw import *
setup2(0.0, 0.1)
world2(); sun2(4.0, rot=(55, 0, 35))
prim('plane', 'ground', pbr('soil', '#b38a5c', rough=0.95), (0, 0, 0), (30, 30, 1), smooth_=False)
pg = pig('pig', (0, 0.1, 0), math.radians(-60)); pg['mode'] = 'chew'
pt = potato('pot'); pt.parent = pg['jaw']; pt.location = (0.11, 0, 0.0)
pa = pig('angel', (0.35, 0.6, 0.45), math.radians(-120), angel=True); pa['mode'] = 'float'
cam = camera(40); look(cam, (0.45, -1.5, 0.5), (0.15, 0.3, 0.3))
render2(lambda t: None, 'test_pig')
