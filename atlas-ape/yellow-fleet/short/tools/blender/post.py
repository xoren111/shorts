"""Blender PNG frames → glow (bloom on the bright lava/fountains) → public/blender/<shot>/f_NNNN.jpg for Remotion.
  python3 tools/blender/post.py out/blender/etna_a public/blender/etna_a"""
import sys
from pathlib import Path
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageFilter
SRC, DST = Path(sys.argv[1]), Path(sys.argv[2])
DST.mkdir(parents=True, exist_ok=True)
def one(p):
	im = Image.open(p).convert('RGB')
	a = np.asarray(im, np.float32) / 255
	# toon look (owner: «no blur at all»): glow ONLY on hot lava colours (saturated orange/yellow: red high, blue low), small
	# radius and weak — white smoke, snow and houses stay razor-sharp
	r, g, b_ = a[..., 0], a[..., 1], a[..., 2]
	hotm = np.clip((r - 0.75) / 0.2, 0, 1) * np.clip((r - b_ - 0.45) / 0.25, 0, 1) * np.clip((g - 0.15) / 0.3, 0, 1)
	br = hotm[..., None] * a
	bi = Image.fromarray((br * 255).astype(np.uint8))
	g1 = np.asarray(bi.filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
	g2 = np.asarray(bi.filter(ImageFilter.GaussianBlur(18)), np.float32) / 255
	out = 1 - (1 - a) * (1 - np.clip(0.25 * g1 + 0.2 * g2, 0, 1))   # screen blend
	Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(DST / (p.stem + '.jpg'), quality=92, subsampling=0)
	return p.name
if __name__ == '__main__':
	fs = sorted(SRC.glob('f_*.png'))
	with Pool(8) as pool:
		n = len(pool.map(one, fs, chunksize=8))
	print(n, 'frames →', DST)
