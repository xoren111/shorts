"""v2 grade: Blender PNG (already painted in the compositor) → public/blender/<shot>/f_NNNN.jpg, gentle contrast only"""
import sys
from pathlib import Path
from multiprocessing import Pool
from PIL import Image, ImageEnhance
SRC, DST = Path(sys.argv[1]), Path(sys.argv[2])
DST.mkdir(parents=True, exist_ok=True)
def one(p):
	im = Image.open(p).convert('RGB')
	im = ImageEnhance.Contrast(im).enhance(1.04)
	im.save(DST / (p.stem + '.jpg'), quality=93, subsampling=0)
	return p.name
if __name__ == '__main__':
	fs = sorted(SRC.glob('f_*.png'))
	with Pool(8) as pool:
		n = len(pool.map(one, fs, chunksize=8))
	print(n, 'frames →', DST)
