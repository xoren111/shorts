"""Linocut stamp sheet textures for the 3D stamps shot (FACTS D1: linocut, the baker's yellow ink, printed by a sailor
standing on the block). Pictorial only — no lettering. → assets/stamps/sheet.png (printed paper), block.png (inked block face,
mirrored), both 1536×1152 (4×3 stamps)."""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np, random
from pathlib import Path
OUT = Path(__file__).resolve().parents[1] / 'assets/stamps'
W, H, NX, NY = 1536, 1152, 4, 3
INK = (226, 170, 34)
PAPER = (246, 238, 214)

def motif(d, x0, y0, w, h, seed):
	r = random.Random(seed)
	# frame
	m = int(w * 0.07)
	d.rectangle((x0 + m, y0 + m, x0 + w - m, y0 + h - m), outline=INK, width=int(w * 0.045))
	# sun
	cx, cy = x0 + w * 0.79, y0 + h * 0.21
	d.ellipse((cx - w * 0.085, cy - w * 0.085, cx + w * 0.085, cy + w * 0.085), fill=INK)
	# ship: hull, superstructure, funnel, masts
	hx0, hx1, hy = x0 + w * 0.17, x0 + w * 0.83, y0 + h * 0.62
	d.polygon([(hx0, hy - h * 0.07), (hx1 + w * 0.03, hy - h * 0.09), (hx1 - w * 0.04, hy + h * 0.04), (hx0 + w * 0.04, hy + h * 0.04)], fill=INK)
	d.rectangle((x0 + w * 0.38, hy - h * 0.2, x0 + w * 0.6, hy - h * 0.07), fill=INK)
	d.rectangle((x0 + w * 0.47, hy - h * 0.3, x0 + w * 0.54, hy - h * 0.2), fill=INK)
	for mx in (0.27, 0.66):
		d.line((x0 + w * mx, hy - h * 0.07, x0 + w * mx, hy - h * 0.26), fill=INK, width=int(w * 0.02))
	# windows cut out of the superstructure (linocut negative)
	for k in range(4):
		wx = x0 + w * (0.405 + 0.048 * k)
		d.rectangle((wx, hy - h * 0.16, wx + w * 0.022, hy - h * 0.12), fill=PAPER)
	# waves: carved lines
	for j in range(3):
		yy = y0 + h * (0.74 + 0.06 * j)
		pts = [(x0 + w * (0.12 + 0.76 * i / 40), yy + h * 0.012 * np.sin(i * 0.9 + j + r.random())) for i in range(41)]
		d.line(pts, fill=INK, width=int(w * 0.022))
	# anchor corner mark
	ax, ay = x0 + w * 0.2, y0 + h * 0.26
	d.line((ax, ay - h * 0.06, ax, ay + h * 0.06), fill=INK, width=int(w * 0.018))
	d.arc((ax - w * 0.05, ay - h * 0.01, ax + w * 0.05, ay + h * 0.08), 0, 180, fill=INK, width=int(w * 0.018))
	d.line((ax - w * 0.035, ay - h * 0.035, ax + w * 0.035, ay - h * 0.035), fill=INK, width=int(w * 0.016))

def sheet(mirror=False, block=False):
	bg = (38, 32, 30) if block else PAPER
	im = Image.new('RGB', (W, H), bg)
	d = ImageDraw.Draw(im)
	sw, sh = W / NX, H / NY
	for j in range(NY):
		for i in range(NX):
			x0, y0 = i * sw, j * sh
			if not block:
				d.rectangle((x0 + 10, y0 + 10, x0 + sw - 10, y0 + sh - 10), fill=PAPER)
			motif(d, x0 + 10, y0 + 10, sw - 20, sh - 20, i * 7 + j)
	if not block:   # perforation: rows of holes between the stamps (the sewing machine)
		for i in range(1, NX):
			for y in np.arange(8, H, 22): d.ellipse((i * sw - 5, y - 5, i * sw + 5, y + 5), fill=(214, 204, 180))
		for j in range(1, NY):
			for x in np.arange(8, W, 22): d.ellipse((x - 5, j * sh - 5, x + 5, j * sh + 5), fill=(214, 204, 180))
	# hand-printed unevenness: blotchy ink density + paper grain
	rng = np.random.default_rng(3)
	a = np.asarray(im).astype(np.float32)
	noise = Image.fromarray((rng.random((H // 8, W // 8)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
	n = np.asarray(noise).astype(np.float32)[..., None] / 255.0
	ink_mask = (np.abs(a - np.array(INK, np.float32)).sum(-1, keepdims=True) < 60).astype(np.float32)
	a = a * (1 - ink_mask) + (a * (0.78 + 0.35 * n)) * ink_mask
	grain = rng.normal(0, 4, (H, W, 1))
	a = np.clip(a + grain, 0, 255).astype(np.uint8)
	im = Image.fromarray(a)
	if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT)
	return im

OUT.mkdir(parents=True, exist_ok=True)
sheet().save(OUT / 'sheet.png')
sheet(mirror=True, block=True).save(OUT / 'block.png')
print('ok', OUT)
