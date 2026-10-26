import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from hist import *
setup_hist(0.0, 0.1, sky_rot=150)
sc_ = bpy.context.scene; sc_.render.resolution_x, sc_.render.resolution_y = 1920, 1080
sun2(3.6, (1.0, 0.8, 0.58), (55, 0, 215), 1.5)
import env
env.meadow('meadow', (120, 120), (0, 30), shore_y=None)
cast = [('farmer', 'point'), ('owner', 'behind'), ('us', 'stand'), ('uk', 'stand'), ('governor', 'raise'), ('admiral', 'behind'), ('kaiser', 'stand')]
for i, (r, pz) in enumerate(cast):
	P = human(r, r, ((i - 3) * 0.85, 0, 0), math.radians(-12), seed=i, pose=pz)
cam = camera(50); cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36
look(cam, (0, -7.2, 1.25), (0, 0, 1.05))
render2(lambda t: None, 't_people')
