import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from island2 import *
import animals
setup_hist(0.0, 0.5)
sun2(3.6, (1.0, 0.8, 0.58), (58, 0, 215), 1.5)
env.meadow('meadow', (60, 60), (0, 10), shore_y=None)
A = animals.boar_pd('angel', (0, 0, 1.5), math.radians(-40), angel=True); A['mode'] = 'float'
UPDATERS.append(lambda t: [animals.boar_pd_tick(b, t) for b in animals.BOARS])
cam = camera(35); look(cam, (1.2, -4.5, 2.4), (0, 0, 2.1))
render2(lambda t: None, 't_angel')
