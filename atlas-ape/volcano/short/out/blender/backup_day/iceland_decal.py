"""Toon decal of the Westman Islands + the south coast for the globe dive onto Iceland A (as tools/blender/hawaii_decal.py for
Hawaii A). The SAME scene as tools/blender/iceland_a.py at its FIRST frame (40.53 s = W(79): blue_k = 1, i.e. the globe-blue
sea #0e64ad with its lighter coast bands, the dim-band land, the PRE-1973 Heimaey outline from heimaey_prep — no Eldfell, no
new lava land, the buried east town still standing), seen by an orthographic camera straight down over the heimaey_wide grid
(its exact mercator bbox; image up = north). GlobeHop.tsx lays it onto the globe in that box (feathered over its outer edge into
the toon backdrop of tools/blender/backdrop_decal.py), so the dive's last ~0.5 s already shows Iceland A's own picture and the
40.53–40.93 s dissolve blends two matching pictures.

iceland_a.py is NOT modified: its source up to the render loop is executed here (scene, materials, per-frame `update`), then
`update(1)` sets frame 1 (camera-dependent line widths and bands stay those of Iceland A's opening camera, dist 100 km, fov 40 →
0.038 km/px) and the camera is swapped for the ortho one.
  tools/blender/run.sh tools/blender/iceland_decal.py -- [--px 0.019 (km per decal pixel)] [--samples 16]
  → out/blender/iceland_decal/decal.png (+ decal.json: bbox); then python3 tools/blender/backdrop_decal.py iceland
  (writes public/blender/iceland_decal.jpg and the wide toon backdrop public/blender/iceland_backdrop.jpg)
Re-render after any change to iceland_a.py's opening look (frame 1) or heimaey_prep.py, then re-run backdrop_decal.py iceland."""
import sys, json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / 'iceland_a.py'
code = SRC.read_text()
CUT = '# ------------------------------------------------------------------ render\n'
assert CUT in code, 'iceland_a.py render marker moved — update iceland_decal.py'
G = {'__name__': '__iceland_a_scene__', '__file__': str(SRC)}
# keep iceland_a's own option parsing away from --track (never set here)
exec(compile(code[:code.index(CUT)], str(SRC), 'exec'), G)

import bpy
from mathutils import Matrix

argv, arg, ROOT = G['argv'], G['arg'], G['ROOT']
sc, cam, cam_d = G['sc'], G['cam'], G['cam_d']
G['update'](1, True)
sc.frame_set(1)

# the heimaey_wide grid's exact box in the heimaey (Blender) frame — linear in Web-Mercator like the scene and the globe shader
mx, WK, HK = G['mx'], G['WK'], G['HK']
mw = json.load(open(ROOT / 'public/terrain/heimaey_wide/meta.json'))['mercator']
bx = lambda X: ((X - mx['x0']) / (mx['x1'] - mx['x0']) - 0.5) * WK
by = lambda Y: -((Y - mx['y0']) / (mx['y1'] - mx['y0']) - 0.5) * HK
x0, x1, ys, yn = bx(mw['x0']), bx(mw['x1']), by(mw['y1']), by(mw['y0'])
ZC = 60.0
cam.matrix_world = Matrix.Translation(((x0 + x1) / 2, (ys + yn) / 2, ZC))
cam_d.type = 'ORTHO'
cam_d.sensor_fit = 'VERTICAL'
cam_d.ortho_scale = yn - ys
cam_d.clip_start, cam_d.clip_end = 1.0, ZC + 20
PX = float(arg('px', 0.019))
sc.render.resolution_percentage = 100
sc.render.resolution_x = int(round((x1 - x0) / PX))
sc.render.resolution_y = int(round(sc.render.resolution_x * (yn - ys) / (x1 - x0)))
print('decal', sc.render.resolution_x, sc.render.resolution_y, 'km/px %.4f' % ((x1 - x0) / sc.render.resolution_x), 'bbox', x0, x1, ys, yn)
out = ROOT / arg('dout', 'out/blender/iceland_decal')
out.mkdir(parents=True, exist_ok=True)
sc.render.filepath = str(out / 'decal.png')
bpy.ops.render.render(write_still=True)
json.dump({'region': 'heimaey_wide', 'w': sc.render.resolution_x, 'h': sc.render.resolution_y, 'bbox_bl': [x0, x1, ys, yn],
           'mercator': mw, 'margin': 0.0, 't': G['T0'], 'px_km': (x1 - x0) / sc.render.resolution_x}, open(out / 'decal.json', 'w'), indent=1)
print('decal →', out / 'decal.png')
