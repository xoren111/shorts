"""1850s-style banknote textures (our own drawing, no real note copied) → assets/notes/note_<v>.png"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
F = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
for v, word, paper, ink in (('10', 'TEN DOLLARS', (226, 236, 205), (34, 84, 52)), ('100', 'ONE HUNDRED DOLLARS', (238, 228, 200), (110, 46, 30))):
	W, H = 1024, 440
	im = Image.new('RGB', (W, H), paper); d = ImageDraw.Draw(im)
	for k, w in ((10, 8), (26, 3), (36, 2)):
		d.rectangle((k, k, W - k, H - k), outline=ink, width=w)
	for x in range(60, W - 60, 22):
		d.arc((x, 44, x + 22, 66), 0, 180, fill=ink, width=2); d.arc((x, H - 66, x + 22, H - 44), 180, 360, fill=ink, width=2)
	big = ImageFont.truetype(F, 210 if len(v) < 3 else 180); mid = ImageFont.truetype(F, 54); sm = ImageFont.truetype(F, 30)
	for cx in (150, W - 150):
		d.ellipse((cx - 95, H / 2 - 95, cx + 95, H / 2 + 95), outline=ink, width=6)
		f2 = ImageFont.truetype(F, 90 if len(v) < 3 else 66)
		d.text((cx, H / 2), v, font=f2, fill=ink, anchor='mm')
	d.text((W / 2, H / 2 - 20), '$' + v, font=big, fill=ink, anchor='mm')
	d.text((W / 2, H - 92), word, font=mid, fill=ink, anchor='mm')
	d.text((W / 2, 92), 'WASHINGTON TERRITORY · 1859', font=sm, fill=ink, anchor='mm')
	im.save(ROOT / f'assets/notes/note_{v}.png')
print('ok')
