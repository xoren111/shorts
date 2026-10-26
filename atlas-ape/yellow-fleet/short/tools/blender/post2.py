"""v2 grade: Blender PNG → slight saturation/contrast lift + glow on very bright parts → public/blender/<shot>/f_NNNN.jpg"""
import sys
from pathlib import Path
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
SRC, DST = Path(sys.argv[1]), Path(sys.argv[2])
DST.mkdir(parents=True, exist_ok=True)
def one(p):
	im = Image.open(p).convert('RGB')
	im = ImageEnhance.Color(im).enhance(1.18); im = ImageEnhance.Contrast(im).enhance(1.05)
	a = np.asarray(im, np.float32) / 255
	lum = a.max(axis=2)
	hot = np.clip((lum - 0.88) / 0.12, 0, 1)[..., None] * a
	g = np.asarray(Image.fromarray((hot * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), np.float32) / 255
	out = 1 - (1 - a) * (1 - 0.35 * g)
	Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(DST / (p.stem + '.jpg'), quality=93, subsampling=0)
	return p.name
if __name__ == '__main__':
	fs = sorted(SRC.glob('f_*.png'))
	with Pool(8) as pool:
		n = len(pool.map(one, fs, chunksize=8))
	print(n, 'frames →', DST)
