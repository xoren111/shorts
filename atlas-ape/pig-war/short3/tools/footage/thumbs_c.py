"""Make small preview copies: python3 thumbs_c.py <outdir> <maxpx> <img> [<img> ...]"""
import os, sys
from PIL import Image

out, mx = sys.argv[1], int(sys.argv[2])
os.makedirs(out, exist_ok=True)
for f in sys.argv[3:]:
    im = Image.open(f)
    print(os.path.basename(f), im.size, im.mode)
    im = im.convert("RGB")
    im.thumbnail((mx, mx))
    im.save(os.path.join(out, "prev_" + os.path.splitext(os.path.basename(f))[0] + ".jpg"), quality=85)
