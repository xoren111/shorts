"""lineup test of the Pig War cast (not a shot)"""
import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from pw import *
setup2(0.0, 0.1)
world2(); sun2(4.0, rot=(55, 0, 35))
g = prim('plane', 'ground', pbr('meadow', '#7fb24a', rough=0.9), (0, 0, 0), (30, 30, 1), smooth_=False)
cast = [('farmer', 'male-c', 'farmer', ['straw'], None, 'holding-both'), ('owner', 'male-e', 'owner', ['bowler'], ('full', '#8a4b2b'), 'idle'),
        ('us1', 'male-a', 'us', ['kepi'], None, 'holding-both'), ('uk1', 'male-f', 'uk', ['shako'], None, 'holding-both'),
        ('gov', 'male-d', 'governor', ['tophat'], None, 'idle'), ('adm', 'male-b', 'admiral', ['bicorne'], ('whiskers', '#e8e4dc'), 'idle'),
        ('kaiser', 'male-e', 'kaiser', ['pickelhaube'], ('chops', '#efece6'), 'idle')]
for i, (nm, kind, sch, hats, bd, act) in enumerate(cast):
	P = char(nm, kind, sch, ((i - 3) * 0.55, 0, 0), 0.0, 0.62, act)
	for h_ in hats: hat(P, h_)
	if bd: beard(P, bd[0], bd[1])
	if act.startswith('holding'):
		r = rifle(nm + '_rifle'); r.location = ((i - 3) * 0.55 + 0.05, -0.15, 0.3)
pg = pig('pig', (-0.6, -0.9, 0), math.radians(-30))
pa = pig('angel', (0.6, -0.9, 0.25), math.radians(210), angel=True); pa['mode'] = 'float'
cam = camera(50); look(cam, (0, -5.2, 1.2), (0, 0, 0.32))
render2(lambda t: None, 'test_lineup')
