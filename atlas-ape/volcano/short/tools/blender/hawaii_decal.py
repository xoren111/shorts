"""Toon decal of the whole Big Island for the globe dive (review 18.10: «the Big Island close-up in the dive is the dark
photo/satellite texture, then it dissolves into the bright toon island — the only photo-textured 3D surface in 0–21.4 s»).
The SAME scene as tools/blender/hawaii_a.py at its first frame (8.55 s: land-cover zones, light bands, cartoon sea with the
cyan reef band and the white surf line, the young 1935 flow at prog(8.55), Hilo's toy houses), seen by an orthographic camera
straight down over the public/terrain/hawaii grid (its mercator bbox + 8 % on every side), image up = north. GlobeHop.tsx
lays it onto the globe in that box (outside it: the same deep-sea colour), so the dive's last ~1.2 s already shows the toon island
and the 8.55–8.95 s dissolve blends two matching pictures. Screen-pixel line widths (surf, reef ring, lava rim) are set to
hawaii_a's pixel size at 8.55 s (camera 270 km, fov 55 → 0.146 km/px). The young eruption cloud is in (a cream disc from
above); the fountain is not (it needs the particle pre-roll).
  tools/blender/run.sh tools/blender/hawaii_decal.py -- [--w 2880 (px across the grid)] [--margin 0.08] [--samples 16]
  → out/blender/hawaii_decal/decal.png → public/blender/hawaii_decal.jpg (+ decal.json: bbox, sea colour)"""
import sys, json, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import hawaii_toon as HT
from hawaii_toon import Vector, W, arg, argv, P, column
import hawaii_cam as HC
import bpy

T0 = 8.55
S = HT.Shot('hawaii_decal', T0, T0 + 2 / 60, HC.cam_a, PRE=0)
# pixel size of Hawaii A's opening frame (camera dist 270 km, vertical fov 55°) — at the decal camera's distance ZC
ZC = 1000.0
PX_A = 270 * 2 * math.tan(math.radians(55) / 2) / 1920
S.value('pxk', lambda t: PX_A / ZC)


def sm(x):
	x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def prog(t):                     # hawaii_a.py prog(t)
	return 0.24 + 0.58 * sm((t - 8.9) / 3.2) + 0.012 * (t - T0)
S.value('prog', lambda t: prog(T0))
S.value('cool', lambda t: 0.0)
S.value('phase', lambda t: 0.0)
S.value('ripv', lambda t: 1.0)
S.ripsp = 0.45
S.nsig, S.zsig = 6.0, 250.0      # as hawaii_a.py
S.terrain()
S.sea()
S.sky_sun(sun_az=float(arg('sun_az', 245)), sun_el=float(arg('sun_el', 34)))
S.hilo()
# the young eruption cloud at the vent exactly as in hawaii_a.py at 8.55 s (seen from above it is a small cream disc at the
# vent; the dive then already shows that the island's volcano is erupting); no fountain (it needs the particle pre-roll)
VENT = P(*HC.PTS['vent'])
ash_m = S.puff_mat('ash', (0.60, 0.53, 0.72), (0.85, 0.80, 0.88), (1.0, 0.97, 0.92), VENT.z + 1.6, under=(1.0, 0.55, 0.3), under_h=1.1,
                   light=(0.35, -0.75, 0.75))
if '--nopuffs' not in argv:
	S.puffs('ash', column(S, VENT + Vector((-0.45, -0.35, 1.5)), 7.0, 0.3, 2.0, 170, (-0.24, -0.3), rise=0.1, bend=1.6, spread=0.9), ash_m)

# orthographic camera straight down over the island grid (blender x east, y north)
sc = S.sc
cam = S.camo
cam.constraints.clear()
for ob in (cam, cam.data):
	if ob.animation_data: ob.animation_data_clear()
# + a margin of MF = 8 % of the grid on every side, so the decal itself carries the sea's coast-distance ramp past the grid
# border (the sea material continues it there); beyond the margin the sea is the constant deep blue
MF_ = float(arg('margin', 0.08))
gx0, gx1, gys, gyn = HT.WX0, HT.WX1, HT.WYS, HT.WYN
mx_, my_ = MF_ * (gx1 - gx0), MF_ * (gyn - gys)
x0, x1, ys, yn = gx0 - mx_, gx1 + mx_, gys - my_, gyn + my_
cam.location = ((x0 + x1) / 2, (ys + yn) / 2, ZC)
cam.rotation_euler = (0, 0, 0)
cd = cam.data
cd.type = 'ORTHO'
cd.sensor_fit = 'VERTICAL'
cd.ortho_scale = yn - ys
cd.clip_start, cd.clip_end = 1.0, ZC + 100
NW = int(arg('w', 2880))
sc.render.resolution_x = int(round(NW * (1 + 2 * MF_)))
sc.render.resolution_y = int(round(sc.render.resolution_x * (yn - ys) / (x1 - x0)))
print('decal', sc.render.resolution_x, sc.render.resolution_y, 'km/px %.4f' % ((x1 - x0) / sc.render.resolution_x), 'bbox', x0, x1, ys, yn)
out = HT.ROOT / arg('out', 'out/blender/hawaii_decal')
out.mkdir(parents=True, exist_ok=True)
sc.frame_set(1)
sc.render.filepath = str(out / 'decal.png')
bpy.ops.render.render(write_still=True)
json.dump({'region': 'hawaii', 'w': sc.render.resolution_x, 'h': sc.render.resolution_y, 'bbox_bl': [x0, x1, ys, yn], 'margin': MF_,
           'deep_sea_linear': [0.02, 0.17, 0.43], 't': T0, 'px_km': PX_A}, open(out / 'decal.json', 'w'), indent=1)
print('decal →', out / 'decal.png')
