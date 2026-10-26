"""Side-by-side sheet of rendered frames: python3 tools/blender/variants/cel_sheet.py <dir> [out.jpg] [frames...]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
d = Path(sys.argv[1]); out = Path(sys.argv[2]) if len(sys.argv) > 2 else d / 'sheet.jpg'
names = sys.argv[3:] or ['f_0001.png', 'f_0112.png', 'f_0223.png']
ims = [Image.open(d / n).convert('RGB') for n in names]
w, h = ims[0].size; gap = 8
sheet = Image.new('RGB', (w * len(ims) + gap * (len(ims) - 1), h), (20, 18, 28))
for k, im in enumerate(ims):
	sheet.paste(im, (k * (w + gap), 0))
sheet.save(out, quality=93, subsampling=0)
print(out, sheet.size)
