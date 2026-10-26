"""order paper texture (parchment, scribbled lines, red wax seal) → assets/notes/order.png"""
from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageFilter
ROOT = Path(__file__).resolve().parents[1]
W, H = 600, 800
im = Image.new('RGB', (W, H), (238, 226, 196)); d = ImageDraw.Draw(im)
rnd = random.Random(4)
for k in range(2500):
	x, y = rnd.randrange(W), rnd.randrange(H); c = rnd.randint(-18, 6)
	d.point((x, y), fill=(238 + c, 226 + c, 196 + c))
d.rectangle((14, 14, W - 14, H - 14), outline=(150, 120, 80), width=4)
y = 110
d.line((150, 80, 450, 80), fill=(60, 40, 30), width=9)
while y < H - 200:
	x = 60
	while x < W - 70:
		ln = rnd.randint(30, 90)
		pts = [(x + i, y + 3 * __import__('math').sin(i * 0.5 + rnd.random())) for i in range(0, ln, 4)]
		d.line(pts, fill=(55, 40, 30), width=4); x += ln + rnd.randint(10, 22)
	y += 44
d.ellipse((W - 210, H - 190, W - 90, H - 70), fill=(176, 30, 36)); d.ellipse((W - 190, H - 170, W - 110, H - 90), outline=(120, 15, 20), width=5)
d.line((80, H - 110, 300, H - 125), fill=(40, 30, 25), width=5)
im = im.filter(ImageFilter.SMOOTH)
im.save(ROOT / 'assets/notes/order.png'); print('ok')
