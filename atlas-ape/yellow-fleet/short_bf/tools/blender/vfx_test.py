import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import *
import kit
from yf2 import *
import yf2
setup2(15.0, 18.0)
yf2.enable_v2(globals())
world2(); sun2(4.2, (1.0, 0.85, 0.65), (62, 0, 200), 2.5)
volume_setup(shadows=True)
desert2('d', -150, 150, -150, 150, res=1.5, canal_w=-999, bank=3.0, lake=(0, 0, 58, 112), dunes=1.3, seed=41, dress=0)
water2('w', (150, 300), (0, 0))
sh = [ship2(f's{i}', lv, (-10 + 6 * i, -20 + 2 * i, 0), math.radians(80)) for i, lv in enumerate(('hapag', 'polish', 'bluefunnel'))]
wall, _ = volume_box('storm', (40, 0, 54), (90, 380, 110), '#b98348', 2.4, scale=0.045, soft=0.12, speed=(-6, 0, 2.5), anisotropy=0.35, grounded=True, color_top='#f6d6a4', bottom_heavy=1.4)
pl, _ = smoke_plume('smoke', (-10 + 0, -20, 3.5), 10, 3.6, (0.6, -1.0), '#8a868e', 1.0)
cam = camera(30)
def update(t):
	look(cam, (-62, -62, 7), (-4, -18, 6))
	wall.location.x = 60 - 12 * (t - 15)
import os
V = os.environ.get('VV', '')
e = bpy.context.scene.eevee
if 'A' in V: e.use_volume_custom_range = True; e.volumetric_start = 1.0; e.volumetric_end = 600.0; e.volumetric_sample_distribution = 0.9
if 'B' in V:
	for m in bpy.data.materials:
		if m.name.endswith('_vol'): m.volume_intersection_method = 'ACCURATE'
if 'C' in V:
	for l in bpy.data.lights: l.volume_factor = 0.0
for nm in os.environ.get('HIDE', '').split(','):
	for o in bpy.data.objects:
		if nm and o.name.startswith(nm): o.hide_render = True
render(update, 'vfx_test')
