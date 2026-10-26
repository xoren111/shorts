"""Owner's Atlas pose cards (Gemini drawings made by the owner from ~/shorts/orangutan/pose_pack) → transparent PNGs
public/atlas/<pose>.png for AtlasWindows (src/ui/Atlas.tsx). Nothing is drawn or generated: the white background that
touches the border becomes alpha (same cut as ~/shorts/orangutan/experiments/pose_cards/pose_card.py), stray specks and a
free-tier sparkle far from the figure are dropped, the figure is cropped with a 12 px margin.

Input = project.json → "atlas": {"source": "cards", "poses": [{"id": "shock", "card": "gemini/atlas_shock.jpg"}, …]}
  card  the owner's image (path: absolute, ~/…, 03_Assets/…, or relative to the project folder)
  pick  on a sheet with several figures: which one (0-based, reading order: rows top→bottom, then left→right)
  box   [x0, y0, x1, y1] crop of the source before the cut (a sheet whose figures touch each other)
  flip  true → mirrored PNG (the rig mirrors left views the same way)
  talk  true → also lip-synced frames public/atlas/<pose>_talk/f_NNNNN.webp (rig's own eyes/mouths on the card; EXPERIMENT,
        needs data/rhubarb.json — made here with Rhubarb Lip Sync from the VO + ../voiceover.txt if missing)

  python3 tools/atlas/cutout_cards.py                 all poses → public/atlas/ + QA sheet out/atlas/cards_qa.jpg
  python3 tools/atlas/cutout_cards.py --only shock    one pose
  python3 tools/atlas/cutout_cards.py --credits       also append the missing CREDITS.md lines (owner art)
  python3 tools/atlas/cutout_cards.py --split IMG     numbered figures of a sheet → out/atlas/split_<name>.jpg (choose "pick")
Check the QA sheet: hat, both feet, eyes and hands must be whole (standard 9D п. 2). A figure touching the image border =
warning: the source itself is cut off.
"""
import argparse, subprocess, sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, PROJECT_DIR, CARD_DIR, load_project, load_words, clock, atlas_block, resolve, rig_root, window_times, add_credits

OUT_PUB = ROOT / 'public' / CARD_DIR
QA = ROOT / 'out/atlas'
MARGIN = 12
MAX_H = 1400          # cards are shown ≤ ~700 px tall: keep at most 2× for sharpness


def cutout(rgb):
	"""white background connected to the border → transparent; soft edge un-blended from white (pose_card.py, rig repo)."""
	a = rgb.astype(np.int16)
	white = (a.min(2) > 226) & ((a.max(2) - a.min(2)) < 22)
	_, lab = cv2.connectedComponents(white.astype(np.uint8), connectivity=4)
	border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
	bg = np.isin(lab, list(border)) & white
	alpha = (~bg).astype(np.float32)
	ring = cv2.dilate(bg.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~bg
	lum = a.min(2).astype(np.float32)
	alpha[ring] = np.clip((250 - lum[ring]) / 200, 0, 1)
	out = a.astype(np.float32)
	m = ring & (alpha > 0.02)
	out[m] = np.clip((out[m] - (1 - alpha[m, None]) * 255) / alpha[m, None], 0, 255)
	return np.dstack([out, alpha * 255]).astype(np.uint8)


def figures(alpha):
	"""figure masks: components of the opaque area (strands bridged by a small closing), small specks dropped.
	Returns [(bbox, mask)] in reading order (rows by top edge, then x)."""
	solid = (alpha > 128).astype(np.uint8)
	k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
	merged = cv2.morphologyEx(solid, cv2.MORPH_CLOSE, k)
	n, lab, st, _ = cv2.connectedComponentsWithStats(merged, connectivity=8)
	if n <= 1:
		return []
	big = st[1:, cv2.CC_STAT_AREA].max()
	keep = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= 0.04 * big]
	out = []
	for i in keep:
		x, y, w, h = st[i, :4]
		out.append(((int(x), int(y), int(x + w), int(y + h)), lab == i))
	rowh = max(b[3] - b[1] for b, _ in out) * 0.5
	out.sort(key=lambda o: (round(o[0][1] / rowh), o[0][0]))
	return out


def attach_near(alpha, fig_box, fig_mask, others=()):
	"""keep loose bits that belong to the figure (shock lines, a prop) = components whose box lies inside the figure box
	grown by 8 %; everything else (a sparkle in the corner, a frame line) is dropped."""
	x0, y0, x1, y1 = fig_box
	gx, gy = (x1 - x0) * 0.08, (y1 - y0) * 0.08
	solid = (alpha > 8).astype(np.uint8)
	n, lab, st, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
	keep = fig_mask.copy()
	dropped = 0
	for i in range(1, n):
		x, y, w, h, area = st[i]
		if (lab[fig_mask] == i).any():
			keep |= lab == i
		elif x >= x0 - gx and y >= y0 - gy and x + w <= x1 + gx and y + h <= y1 + gy:
			keep |= lab == i
		elif not any((lab[o] == i).any() for o in others):
			dropped += int(area)                 # not another figure of the sheet → report
	return keep, dropped


def load_rgba(path, box=None):
	im = Image.open(path)
	if box:
		im = im.crop(tuple(int(v) for v in box))
	if im.mode in ('RGBA', 'LA') and np.array(im.convert('RGBA'))[..., 3].min() < 250:
		return np.array(im.convert('RGBA')), True          # already transparent (e.g. a card cut before)
	return cutout(np.array(im.convert('RGB'))), False


def cut_pose(p, project):
	src = resolve(p['card'], project)
	if not src.exists():
		raise SystemExit(f'✗ {p["id"]}: card not found: {src}')
	if '_quarantine' in src.parts:
		raise SystemExit(f'✗ {p["id"]}: card comes from 03_Assets/_quarantine: {src}')
	rgba, had_alpha = load_rgba(src, p.get('box'))
	figs = figures(rgba[..., 3])
	if not figs:
		raise SystemExit(f'✗ {p["id"]}: no figure found in {src}')
	pick = int(p.get('pick', 0))
	if len(figs) > 1 and 'pick' not in p:
		print(f'! {p["id"]}: {len(figs)} figures in {src.name} — using the first; set "pick" (see --split)')
	if pick >= len(figs):
		raise SystemExit(f'✗ {p["id"]}: pick {pick}, but {src.name} has {len(figs)} figures')
	box, mask = figs[pick]
	keep, dropped = attach_near(rgba[..., 3], box, mask, [m for j, (_, m) in enumerate(figs) if j != pick])
	rgba = rgba.copy()
	rgba[..., 3] = np.where(keep, rgba[..., 3], 0)
	ys, xs = np.nonzero(rgba[..., 3] > 8)
	H, Wd = rgba.shape[:2]
	warns = []
	touch = [n for n, c in (('top', ys.min() <= 1), ('bottom', ys.max() >= H - 2), ('left', xs.min() <= 1), ('right', xs.max() >= Wd - 2)) if c]
	if touch and not p.get('box'):
		warns.append(f'figure touches the image border ({", ".join(touch)}): the source may be cut off — check hat / feet')
	x0, y0 = max(0, xs.min() - MARGIN), max(0, ys.min() - MARGIN)
	x1, y1 = min(Wd, xs.max() + MARGIN + 1), min(H, ys.max() + MARGIN + 1)
	crop = rgba[y0:y1, x0:x1]
	# eye whites inside the head (top 55 %): enclosed near-white blobs must survive the cut (face not punched out)
	head = crop[: int(0.55 * crop.shape[0])]
	rgb = head[..., :3].astype(np.int16)
	whiteish = (head[..., 3] > 200) & (rgb.min(2) > 205) & ((rgb.max(2) - rgb.min(2)) < 40)
	n_eye = sum(1 for s in cv2.connectedComponentsWithStats(whiteish.astype(np.uint8))[2][1:] if s[4] > 30)
	if n_eye == 0:
		warns.append('no eye whites found in the head — eyes closed in the drawing, or the face was cut: check the QA sheet')
	if dropped > 0.002 * H * Wd:
		warns.append(f'{dropped} px of loose bits far from the figure dropped (sparkle / frame / another figure)')
	im = Image.fromarray(crop)
	if im.height > MAX_H:
		im = im.resize((round(im.width * MAX_H / im.height), MAX_H), Image.LANCZOS)
	if p.get('flip'):
		im = im.transpose(Image.FLIP_LEFT_RIGHT)
	OUT_PUB.mkdir(parents=True, exist_ok=True)
	dst = OUT_PUB / f'{p["id"]}.png'
	im.save(dst, optimize=True)
	# white-background copy of the same figure for the talking-card experiment (pose_card.py reads RGB on white)
	QA.mkdir(parents=True, exist_ok=True)
	white = Image.new('RGBA', im.size, (255, 255, 255, 255))
	white.alpha_composite(im)
	pad = Image.new('RGB', (im.width + 80, im.height + 80), (255, 255, 255))
	pad.paste(white.convert('RGB'), (40, 40))
	pad.save(QA / f'{p["id"]}_white.png')
	return dict(id=p['id'], src=src, dst=dst, size=im.size, figures=len(figs), pick=pick, had_alpha=had_alpha, warns=warns)


def qa_sheet(results):
	"""each card over a checkerboard and over the channel's dark purple, with its id: hat, feet, eyes, hands whole?"""
	th = 520
	tiles = []
	for r in results:
		im = Image.open(r['dst']).convert('RGBA')
		s = th / im.height
		im = im.resize((max(1, round(im.width * s)), th), Image.LANCZOS)
		for bg in ('check', 'dark'):
			t = Image.new('RGBA', (im.width + 20, th + 50), (24, 16, 40, 255))
			if bg == 'check':
				d = ImageDraw.Draw(t)
				for yy in range(40, t.height, 20):
					for xx in range(0, t.width, 20):
						d.rectangle([xx, yy, xx + 19, yy + 19], fill=(200, 200, 200, 255) if (xx // 20 + yy // 20) % 2 else (150, 150, 150, 255))
			t.alpha_composite(im, (10, 40))
			ImageDraw.Draw(t).text((10, 10), f'{r["id"]} {r["size"][0]}x{r["size"][1]}', fill=(255, 220, 80, 255), font=_font(22))
			tiles.append(t)
	W = sum(t.width for t in tiles) + 10 * (len(tiles) + 1)
	sheet = Image.new('RGB', (W, th + 70), (40, 40, 48))
	x = 10
	for t in tiles:
		sheet.paste(t.convert('RGB'), (x, 10))
		x += t.width + 10
	QA.mkdir(parents=True, exist_ok=True)
	sheet.save(QA / 'cards_qa.jpg', quality=90)
	return QA / 'cards_qa.jpg'


def _font(size):
	for f in ('/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc'):
		try:
			return ImageFont.truetype(f, size)
		except OSError:
			pass
	return ImageFont.load_default()


def split_preview(path):
	rgba, _ = load_rgba(Path(path).expanduser())
	figs = figures(rgba[..., 3])
	im = Image.fromarray(rgba).convert('RGBA')
	bg = Image.new('RGBA', im.size, (120, 120, 130, 255))
	bg.alpha_composite(im)
	d = ImageDraw.Draw(bg)
	for i, (b, _) in enumerate(figs):
		d.rectangle(b, outline=(255, 40, 40, 255), width=4)
		d.text((b[0] + 8, b[1] + 6), f'pick {i}', fill=(255, 255, 0, 255), font=_font(36))
	QA.mkdir(parents=True, exist_ok=True)
	dst = QA / f'split_{Path(path).stem}.jpg'
	bg.convert('RGB').save(dst, quality=88)
	print(f'{len(figs)} figures →', dst)


def ensure_rhubarb(project):
	"""data/rhubarb.json from the project VO + dialog text (Rhubarb Lip Sync, ~/shorts/tools/rhubarb)."""
	rj = ROOT / 'data/rhubarb.json'
	if rj.exists():
		return rj
	rh = Path.home() / 'shorts/tools/rhubarb/rhubarb'
	vo = resolve(project['vo'], project)
	wav = ROOT / 'data/vo_rhubarb.wav'
	subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(vo), '-ac', '1', '-ar', '44100', str(wav)], check=True)
	cmd = [str(rh), '-f', 'json', '-o', str(rj), '--extendedShapes', 'GHX']
	if (PROJECT_DIR / 'voiceover.txt').exists():
		cmd += ['-d', str(PROJECT_DIR / 'voiceover.txt')]
	subprocess.run(cmd + [str(wav)], check=True, capture_output=True)
	wav.unlink()
	print('rhubarb →', rj)
	return rj


def talk_frames(p, project, block):
	"""EXPERIMENT (rig repo): the rig's own eye and mouth sprites registered on the card, lip-synced, 30 fps frames
	public/atlas/<pose>_talk/f_NNNNN.webp for the time span of every window that uses this pose."""
	words = load_words()
	_, dur = clock(project, words)
	spans = [window_times(w, words, dur) for w in block['windows'] if w.get('pose') == p['id']]
	if not spans:
		print(f'! {p["id"]}: talk = true, but no window uses this pose')
		return
	t0, t1 = max(0.0, min(s[0] for s in spans) - 0.04), max(s[1] for s in spans) + 0.04   # pose_card.py rounds t·30: cover floor(t·30)
	rj = ensure_rhubarb(project)
	tool = rig_root(block) / 'experiments/pose_cards/pose_card.py'
	dst = OUT_PUB / f'{p["id"]}_talk'
	work = QA / f'{p["id"]}_talk_work'
	subprocess.run([sys.executable, str(tool), str(QA / f'{p["id"]}_white.png'), str(work), '--rgba', str(dst), '--rhubarb', str(rj),
		'--t0', str(t0), '--t1', str(t1), '--height', str(int(p.get('talk_height', 900)))], check=True)
	print(f'  talk frames {t0:.2f}–{t1:.2f} s →', dst, '| registration check:', work / 'compare_face.jpg')


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument('--only', help='comma-separated pose ids')
	ap.add_argument('--credits', action='store_true', help='append missing CREDITS.md lines')
	ap.add_argument('--split', help='preview the figures of a sheet image')
	a = ap.parse_args()
	if a.split:
		return split_preview(a.split)
	project = load_project()
	block = atlas_block(project)
	if not block or not block['poses']:
		raise SystemExit('project.json → "atlas" has no poses (see README, «Atlas»)')
	if block['source'] != 'cards':
		print('! atlas.source is "rig": the cards are cut anyway (use them via "source": "cards" or a window with its own "source": "cards")')
	only = set(a.only.split(',')) if a.only else None
	res, lines = [], []
	for p in block['poses']:
		if only and p['id'] not in only:
			continue
		if 'card' not in p:
			print(f'· {p["id"]}: no "card" source (already a PNG: {p.get("png")}) — skipped')
			continue
		r = cut_pose(p, project)
		res.append(r)
		print(f'✓ {r["id"]}: {r["src"].name}' + (f' (pick {r["pick"]} of {r["figures"]})' if r['figures'] > 1 else '') + f' → public/{CARD_DIR}/{r["dst"].name} {r["size"][0]}×{r["size"][1]}')
		for w in r['warns']:
			print('  !', w)
		try:
			rel = r['src'].relative_to(PROJECT_DIR)
		except ValueError:
			rel = str(r['src']).replace(str(Path.home()), '~')
		lines.append(f'- `{CARD_DIR}/{r["dst"].name}` — Atlas, поза «{r["id"]}»: карточка владельца (Gemini по pose_pack владельца), вырезано '
			f'tools/atlas/cutout_cards.py из `{rel}` — своё (арт владельца канала)')
		if p.get('talk'):
			talk_frames(p, project, block)
			lines.append(f'- `{CARD_DIR}/{p["id"]}_talk/` — Atlas «{p["id"]}» с липсинком: та же карточка + глаза и рты рига `~/shorts/orangutan` '
				f'(pose_card.py) — своё (арт владельца канала)')
	if res:
		print('QA sheet →', qa_sheet(res), '(hat, feet, eyes, hands whole?)')
	if a.credits:
		print(f'CREDITS.md: {add_credits(lines)} line(s) added')
	else:
		print('CREDITS.md lines (or rerun with --credits):')
		for l in lines:
			print('  ' + l)


if __name__ == '__main__':
	main()
