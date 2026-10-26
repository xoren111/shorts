"""Heimaey: the terrarium DEM has a blocky coastline (coarse bathymetry mosaic). Rebuild the coast from the EOX satellite:
land = not (dark + blue) pixels, morphologically cleaned; land heights = DEM (inpainted where DEM ≤ 0), smoothed seam;
sea = gentle depth from the distance to the coast. Writes public/terrain/heimaey/height.bin (+ land.png for QA).
  python3 tools/coast_fix.py heimaey"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
r = sys.argv[1] if len(sys.argv) > 1 else 'heimaey'
d = ROOT / 'public/terrain' / r
m = json.load(open(d / 'meta.json'))
NX, NY = m['nx'], m['ny']
raw = d / 'height_raw.bin'
if not raw.exists():
	(d / 'height.bin').rename(raw)
h = np.fromfile(raw, '<f4').reshape(NY, NX).astype(np.float64)
sat = Image.open(d / 'sat.jpg').convert('RGB').resize((NX, NY), Image.BILINEAR)
s = np.asarray(sat).astype(float)
R, G, B = s[..., 0], s[..., 1], s[..., 2]
sea = (R < 19) & (B > R * 2.2)
sea = nd.binary_opening(sea, iterations=2)
land = ~sea
land = nd.binary_opening(land, iterations=2)
lab, n = nd.label(land)
sizes = nd.sum(land, lab, range(1, n + 1))
keep = np.isin(lab, 1 + np.where(sizes > 40)[0])
land = nd.binary_fill_holes(keep)
# land heights: DEM where positive, else nearest positive DEM value; then a floor so the coast stands above the water
pos = h > 0.5
idx = nd.distance_transform_edt(~pos, return_distances=False, return_indices=True)
hl = h[idx[0], idx[1]]
hl = nd.gaussian_filter(hl, 1.2)
din = nd.distance_transform_edt(land) * (m['width_m'] / NX)     # m inside the land
dout = nd.distance_transform_edt(~land) * (m['width_m'] / NX)   # m out to sea
coast = np.clip(din / 40.0, 0, 1)                                 # 40 m ramp from the shoreline
hland = 1.5 + np.maximum(hl, 0) * (0.35 + 0.65 * coast)
hsea = -np.minimum(2 + dout * 0.08, 60)
out = np.where(land, hland, hsea).astype(np.float32)
out.astype('<f4').tofile(d / 'height.bin')
Image.fromarray((land * 255).astype(np.uint8)).save(d / 'land.png')
m['h_min'], m['h_max'] = float(out.min()), float(out.max()); m['coast_fix'] = 'land mask from EOX imagery (tools/coast_fix.py)'
(d / 'meta.json').write_text(json.dumps(m, indent=1))
print(r, 'land cells', int(land.sum()), 'h', out.min(), out.max())
