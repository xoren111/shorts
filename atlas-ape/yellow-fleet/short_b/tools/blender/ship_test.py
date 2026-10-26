"""close look at the ship models (quality pass): tools/blender/run.sh tools/blender/ship_test.py -- --frames 1 --scale 50"""
import sys, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
import kit
from yf2 import *
import yf2
setup2(0.0, 1.0)
yf2.enable_v2(globals())
world2(); sun2(4.2, (1.0, 0.85, 0.65), (60, 0, -40), 2.5)
water2('w', (300, 300), (0, 0))
sh = ship2('t', arg('liv', 'hapag'), (0, 0, 0), 0.0)
set_dust2('t', float(arg('dust', '0.3')))
ship_name(sh, 'MÜNSTERLAND')
cam = camera(30)
V = arg('view', 'q')
def update(t):
	if V == 'q': look(cam, (13, -12, 4.5), (0.5, 0, 1.5))
	elif V == 'b': look(cam, (9, -4.5, 2.2), (4.0, 0, 1.4))
	else: look(cam, (-3, -7, 3.5), (-1.2, 0, 2.2))
render(update, 'ship_test')
