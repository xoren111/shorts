"""Where the A/B hook (standard R2: Atlas in 0–1 s, small, over empty space — not over the subject of frame 0) can sit.
Ranks the Atlas corners tl / tr / bl on stills of the version WITHOUT Atlas by how busy each box is.
  node tools/stills.mjs --comp Short --t 0,0.5,0.95 --scale 0.5 --out out/stills/ab_A
  python3 tools/ab_corner.py out/stills/ab_A [--h 300] [--aspect 0.7] [--sheet out/stills/ab_corners.jpg]
Input: one still or a folder of stills (any scale — boxes are frame px of 1080 × 1920, scaled to the still). Each box is the
hook window of src/ui/Atlas.tsx (AtlasWindowView): left x 58 (tl, bl) or right edge x 877 (tr), top y 300 (tl, tr) or bottom
y 1140 (bl), height h (default project.ab hook h, else 300), width h × aspect (≈ 0.7 for a full-body card).
Score = texture + subject, the max over the stills (lower = emptier):
  texture  mean gradient magnitude + 0.5 × std of the luminance inside the box (0–255 scale);
  subject  % of the box in RARE colours of the frame (6-level colour bins holding < 2 % of the frame): a stamp, a face, a
           title — the subject usually stands out from the background in colour.
It measures pixels, not meaning: look at the --sheet before you set ab.variants.<hook variant>.atlas_hook_corner.
"""
import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SAFE_L, SAFE_R, SAFE_T, SAFE_B, MARGIN = 48, 887, 300, 1140, 10       # src/ui/Atlas.tsx SAFE + MARGIN


def boxes(h, aspect):
	w = round(h * aspect)
	l, r = SAFE_L + MARGIN, SAFE_R - MARGIN
	return {'tl': (l, SAFE_T, l + w, SAFE_T + h), 'tr': (r - w, SAFE_T, r, SAFE_T + h), 'bl': (l, SAFE_B - h, l + w, SAFE_B)}


def rare_mask(img):
	"""pixels of the still whose 6-level colour bin holds < 2 % of the frame (the subject, rarely the background)"""
	q = (np.asarray(img, dtype=np.uint16) * 6 // 256).reshape(-1, 3)
	key = q[:, 0] * 36 + q[:, 1] * 6 + q[:, 2]
	freq = np.bincount(key, minlength=216) / key.size
	return (freq[key] < 0.02).reshape(img.height, img.width)


def busy(img, box, rare):
	"""(texture, subject %) of one box"""
	sx, sy = img.width / 1080, img.height / 1920
	x0, y0, x1, y1 = [round(v * s) for v, s in zip(box, (sx, sy, sx, sy))]
	g = np.asarray(img.convert('L').crop((x0, y0, x1, y1)), dtype=np.float32)
	gx, gy = np.diff(g, axis=1)[:-1, :], np.diff(g, axis=0)[:, :-1]
	return float(np.hypot(gx, gy).mean() + 0.5 * g.std()), float(rare[y0:y1, x0:x1].mean() * 100)


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument('stills', help='a still (jpg / png) or a folder of stills')
	ap.add_argument('--h', type=int, default=None, help='hook height in frame px (default: project.ab hook h, else 300)')
	ap.add_argument('--aspect', type=float, default=0.7, help='card width / height (default 0.7)')
	ap.add_argument('--sheet', default=None, help='write the middle still with the three boxes and their scores')
	a = ap.parse_args()
	h = a.h
	if h is None:
		ab = json.load(open(ROOT / 'project.json', encoding='utf-8')).get('ab') or {}
		h = next((v.get('atlas_hook_h', 300) for v in (ab.get('variants') or {}).values() if v.get('atlas_hook')), 300)
	src = Path(a.stills)
	files = sorted(p for p in src.iterdir() if p.suffix.lower() in ('.jpg', '.jpeg', '.png')) if src.is_dir() else [src]
	if not files:
		raise SystemExit(f'no stills in {src}')
	bx = boxes(h, a.aspect)
	imgs = [Image.open(f).convert('RGB') for f in files]
	rares = [rare_mask(im) for im in imgs]
	parts = {c: [busy(im, b, r) for im, r in zip(imgs, rares)] for c, b in bx.items()}
	score = {c: max(t + s for t, s in v) for c, v in parts.items()}
	print(f'A/B hook box h {h} × {round(h * a.aspect)} px, {len(files)} still(s) — score = texture + subject %, max over stills (lower = emptier):')
	for c in sorted(score, key=score.get, reverse=True):
		print(f'  {c}  {score[c]:6.1f}   (texture ≤ {max(t for t, _ in parts[c]):5.1f}, subject ≤ {max(s for _, s in parts[c]):5.1f} %)')
	best = min(score, key=score.get)
	print(f'calmest corner: {best} → project.ab.variants.<hook variant>.atlas_hook_corner = "{best}" (check the picture: texture ≠ subject)')
	if a.sheet:
		im = imgs[len(imgs) // 2].copy()                 # the middle still (mid hook)
		d = ImageDraw.Draw(im)
		sx, sy = im.width / 1080, im.height / 1920
		for c, b in bx.items():
			r = [round(v * s) for v, s in zip(b, (sx, sy, sx, sy))]
			d.rectangle(r, outline=(80, 255, 120) if c == best else (255, 80, 80), width=max(2, round(4 * sx)))
			d.text((r[0] + 6, r[1] + 6), f'{c} {score[c]:.1f}', fill=(255, 255, 255))
		Path(a.sheet).parent.mkdir(parents=True, exist_ok=True)
		im.save(a.sheet, quality=90)
		print(f'→ {a.sheet}')


if __name__ == '__main__':
	main()
