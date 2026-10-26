"""Cut-outs of the REAL 1930s US Army Air Corps bombers from public/photos/keystone_b6a_bombing.jpg (USAF photo, public domain):
the planes are dark against a bright overcast sky, so alpha = darkness, cleaned per bounding box → public/cutouts/*.png
  python3 tools/cutout_planes.py"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd
ROOT = Path(__file__).resolve().parents[1]
im = Image.open(ROOT / 'public/photos/keystone_b6a_bombing.jpg').convert('L')
a = np.asarray(im).astype(float)
BOXES = {  # x0, y0, x1, y1 in the 1800×1154 photo
	'plane_big': (125, 30, 665, 335),
	'plane_right': (905, 232, 1320, 435),
	'plane_small': (632, 368, 928, 512),
	'bomb_a': (462, 312, 512, 336),
	'bomb_b': (478, 362, 527, 388),
	'bomb_c': (458, 420, 506, 448),
}
for name, (x0, y0, x1, y1) in BOXES.items():
	c = a[y0:y1, x0:x1]
	sky = np.percentile(c, 90)
	alpha = np.clip((sky - 18 - c) / 55.0, 0, 1)
	# remove sky noise: keep components connected to the main dark mass (struts and wires are thin but connected)
	m = alpha > 0.25
	lab, n = nd.label(nd.binary_dilation(m, iterations=2))
	if n > 1:
		sizes = nd.sum(m, lab, range(1, n + 1))
		keep = 1 + np.argmax(sizes)
		alpha *= (lab == keep)
	alpha = nd.gaussian_filter(alpha, 0.6)
	rgb = np.stack([c, c, c], -1)
	out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
	img = Image.fromarray(out, 'RGBA')
	scale = 2 if name.startswith('plane') else 3
	img = img.resize((img.width * scale, img.height * scale), Image.LANCZOS)
	img.save(ROOT / f'public/cutouts/{name}.png')
	print(name, img.size)
