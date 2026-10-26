"""Contact sheet of an RGBA 3D-insert sequence over a checkerboard and over the channel's dark violet, to judge alpha edges,
framing and the loop seam at a glance (the last tile repeats frame 1 after the last frame for loop shots).

  python3 tools/blender/sheet3d.py public/3d/coin [--every 4] [--cols 6] [--tile 300] [--out out/3d_sheets/coin.jpg]
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('dir')
ap.add_argument('--every', type=int, default=0, help='every n-th frame (default: about 12 tiles)')
ap.add_argument('--cols', type=int, default=6)
ap.add_argument('--tile', type=int, default=300)
ap.add_argument('--out')
a = ap.parse_args()
d = Path(a.dir)
frames = sorted([*d.glob('f_*.png'), *d.glob('f_*.webp')])
if not frames:
	raise SystemExit(f'no f_*.png / f_*.webp in {d}')
meta = json.loads((d / 'meta.json').read_text()) if (d / 'meta.json').exists() else {}
step = a.every or max(1, len(frames) // 12)
pick = frames[::step]
if meta.get('loop'):
	pick.append(frames[0])
im0 = Image.open(pick[0])
tw = a.tile
th = round(tw * im0.height / im0.width)
rows = (len(pick) * 2 + a.cols - 1) // a.cols


def checker(w, h, n=16):
	c = Image.new('RGB', (w, h), '#bdbdbd')
	dr = ImageDraw.Draw(c)
	for y in range(0, h, n):
		for x in range(0, w, n):
			if (x // n + y // n) % 2:
				dr.rectangle([x, y, x + n - 1, y + n - 1], fill='#8a8a8a')
	return c


sheet = Image.new('RGB', (a.cols * tw, rows * (th + 22)), '#111')
dr = ImageDraw.Draw(sheet)
k = 0
for bg in ('checker', '#1a0f2e'):
	for p in pick:
		fr = Image.open(p).convert('RGBA').resize((tw, th), Image.LANCZOS)
		base = checker(tw, th) if bg == 'checker' else Image.new('RGB', (tw, th), bg)
		base.paste(fr, (0, 0), fr)
		x, y = (k % a.cols) * tw, (k // a.cols) * (th + 22)
		sheet.paste(base, (x, y))
		dr.text((x + 6, y + th + 4), p.stem + (' = loop seam' if p == frames[0] and k % len(pick) == len(pick) - 1 and meta.get('loop') else ''), fill='#ddd')
		k += 1
out = Path(a.out) if a.out else Path('out/3d_sheets') / f'{d.name}.jpg'
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out, quality=88)
print(f'{len(pick)} frames × 2 backgrounds → {out}')
