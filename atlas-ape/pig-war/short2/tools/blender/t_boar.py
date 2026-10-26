import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from hist import *
import animals
setup_hist(0.0, 2.0, hdri='qwantani_late_afternoon_puresky', sky_rot=40, paint_size=6)
sun2(3.0, (1.0, 0.85, 0.7), (50, 0, 140), 2.0)
prim('plane', 'ground', pbr('soil', '#7a5a3e', 'farm_soil', 1.5, 0.7, 0.95), (0, 0, 0), (40, 40, 1), smooth_=False)
B = animals.boar_pd('boar', (0, 0, 0), math.radians(-120)); B['mode'] = 'chew'
A = animals.boar_pd('angel', (1.3, 1.4, 0.8), math.radians(-150), angel=True); A['mode'] = 'float'
UPDATERS.append(lambda t: [animals.boar_pd_tick(b, t) for b in animals.BOARS])
cam = camera(40); look(cam, (1.1, -2.7, 1.0), (0.6, 0.5, 0.6))
render2(lambda t: None, 't_boar')
