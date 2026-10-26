"""contact sheet: python3 tools/sheet.py out.jpg <cols> <img> <label> [<img> <label> ...]"""
import sys
from PIL import Image, ImageDraw, ImageFont

out, cols, rest = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
pairs = list(zip(rest[::2], rest[1::2]))
ims = [Image.open(p) for p, _ in pairs]
w, h = ims[0].size
lab = 28
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 6), rows * (h + lab + 6)), (40, 40, 40))
d = ImageDraw.Draw(sheet)
try:
	f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 20)
except Exception:
	f = ImageFont.load_default()
for k, (im, (_, label)) in enumerate(zip(ims, pairs)):
	x, y = (k % cols) * (w + 6), (k // cols) * (h + lab + 6)
	sheet.paste(im.resize((w, h)), (x, y + lab))
	d.text((x + 6, y + 3), label, fill=(255, 210, 60), font=f)
# keep sheets readable: max 2400 px wide
if sheet.width > 2400:
	sheet = sheet.resize((2400, round(sheet.height * 2400 / sheet.width)))
sheet.save(out, quality=82)
print('sheet →', out)
