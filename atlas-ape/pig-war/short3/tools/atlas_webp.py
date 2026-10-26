"""Atlas RGBA frames (rig export) → public/atlas/f_NNNNN.webp (lossy + alpha, q 90) for the Remotion composite.
  python3 tools/atlas_webp.py [~/shorts/orangutan/out/volcano_short/frames]"""
import sys, os
from pathlib import Path
from multiprocessing import Pool
from PIL import Image
SRC = Path(sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/shorts/orangutan/out/volcano_short/frames'))
DST = Path(__file__).resolve().parents[1] / 'public/atlas'
DST.mkdir(parents=True, exist_ok=True)
def one(p):
	out = DST / (p.stem + '.webp')
	Image.open(p).save(out, 'WEBP', quality=90, alpha_quality=100, method=4)
	return out.stat().st_size
if __name__ == '__main__':
	fs = sorted(SRC.glob('f_*.png'))
	with Pool(8) as pool:
		sizes = pool.map(one, fs, chunksize=16)
	print(len(fs), 'frames,', round(sum(sizes) / 1e6, 1), 'MB')
