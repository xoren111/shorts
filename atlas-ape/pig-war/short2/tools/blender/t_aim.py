import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island2 import *
setup_hist(0.0, 0.1)
sc_ = bpy.context.scene; sc_.render.resolution_x, sc_.render.resolution_y = 1920, 1080
sun2(3.6, (1.0, 0.8, 0.58), (58, 0, 215), 1.5)
env.meadow('meadow', (60, 60), (0, 10), shore_y=None)
for i, pz in enumerate(['aim', 'offer', 'point', 'shoulder', 'hold']):
	P = human(f'p{i}', 'us' if i % 2 else 'farmer', ((i - 2) * 1.3, 0, 0), math.radians(-90), seed=i, pose=pz)
	if pz in ('aim', 'shoulder', 'hold'): rifle_for(P)
cam = camera(40); cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36
look(cam, (0, -6.5, 1.4), (0, 0, 1.1))
render2(lambda t: None, 't_aim')
