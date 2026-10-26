"""Simplified 1967 national/merchant flags drawn from their public geometric definitions (no copyrighted artwork)
→ assets/flags/<id>.png (300×200). UK merchant ships fly the Red Ensign, not the Union Jack."""
from pathlib import Path
from PIL import Image, ImageDraw
OUT = Path(__file__).resolve().parents[1] / 'assets/flags'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 300, 200

def union(d, x0, y0, w, h):
	"""Union Jack in the box (simplified proportions, fine at toon scale)"""
	d.rectangle([x0, y0, x0 + w, y0 + h], fill='#012169')
	for a, b in (((x0, y0), (x0 + w, y0 + h)), ((x0, y0 + h), (x0 + w, y0))):
		d.line([a, b], fill='white', width=int(h * 0.2)); d.line([a, b], fill='#C8102E', width=int(h * 0.07))
	cx, cy = x0 + w / 2, y0 + h / 2
	d.rectangle([cx - h * 0.17, y0, cx + h * 0.17, y0 + h], fill='white'); d.rectangle([x0, cy - h * 0.17, x0 + w, cy + h * 0.17], fill='white')
	d.rectangle([cx - h * 0.1, y0, cx + h * 0.1, y0 + h], fill='#C8102E'); d.rectangle([x0, cy - h * 0.1, x0 + w, cy + h * 0.1], fill='#C8102E')

def make(name, draw):
	im = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(im); draw(d); im.save(OUT / f'{name}.png')

make('red_ensign', lambda d: (d.rectangle([0, 0, W, H], fill='#C8102E'), union(d, 0, 0, W / 2, H / 2)))
make('west_germany', lambda d: [d.rectangle([0, k * H / 3, W, (k + 1) * H / 3], fill=c) for k, c in enumerate(('#000000', '#DD0000', '#FFCE00'))])
make('poland', lambda d: (d.rectangle([0, 0, W, H / 2], fill='white'), d.rectangle([0, H / 2, W, H], fill='#DC143C')))
make('bulgaria', lambda d: [d.rectangle([0, k * H / 3, W, (k + 1) * H / 3], fill=c) for k, c in enumerate(('#FFFFFF', '#00966E', '#D62612'))])
make('czechoslovakia', lambda d: (d.rectangle([0, 0, W, H / 2], fill='white'), d.rectangle([0, H / 2, W, H], fill='#D7141A'), d.polygon([(0, 0), (W / 2, H / 2), (0, H)], fill='#11457E')))
make('sweden', lambda d: (d.rectangle([0, 0, W, H], fill='#006AA7'), d.rectangle([W * 5 / 16, 0, W * 7 / 16, H], fill='#FECC00'), d.rectangle([0, H * 0.4, W, H * 0.6], fill='#FECC00')))
make('france', lambda d: [d.rectangle([k * W / 3, 0, (k + 1) * W / 3, H], fill=c) for k, c in enumerate(('#002654', '#FFFFFF', '#CE1126'))])
def usa(d):
	for k in range(13):
		d.rectangle([0, k * H / 13, W, (k + 1) * H / 13], fill='#B22234' if k % 2 == 0 else 'white')
	d.rectangle([0, 0, W * 0.4, H * 7 / 13], fill='#3C3B6E')
	for r in range(5):
		for c in range(6):
			x, y = 10 + c * 19, 10 + r * 20
			d.ellipse([x - 3, y - 3, x + 3, y + 3], fill='white')
make('usa', usa)
print(sorted(p.name for p in OUT.glob('*.png')))
