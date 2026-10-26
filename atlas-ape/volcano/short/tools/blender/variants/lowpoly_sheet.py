"""Side-by-side contact sheet of rendered frames: python3 tools/blender/variants/sheet.py <dir> [out.jpg] [height]"""
import sys
from pathlib import Path
from PIL import Image
d = Path(sys.argv[1]); out = Path(sys.argv[2]) if len(sys.argv) > 2 else d / 'sheet.jpg'; h = int(sys.argv[3]) if len(sys.argv) > 3 else 960
fs = sorted(d.glob('f_*.png'))
ims = [Image.open(f).convert('RGB') for f in fs]
ims = [im.resize((round(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
gap = 8
sheet = Image.new('RGB', (sum(i.width for i in ims) + gap * (len(ims) - 1), h), (20, 20, 20))
x = 0
for im in ims:
	sheet.paste(im, (x, 0)); x += im.width + gap
sheet.save(out, quality=92)
print(out, sheet.size)
