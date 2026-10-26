"""Track one moving subject in a clip → data/tracks/<name>.json, for text / markers that stick to it (src/ui/Tracked.tsx).
  PYTORCH_ENABLE_MPS_FALLBACK=1 ~/shorts/tools/py312/bin/python tools/track.py <clip.mp4> --name keaton --point 0.74,0.52 --t 0
  … --box 0.62,0.30,0.86,0.66 --t 2.5            seed = a box instead of a point (normalised 0–1, or source pixels)
  … --point 700,380 --neg 400,500                pixels are fine too (any value > 1 → pixels); --neg = «not this» clicks
  … --from 1.0 --to 5.5 --step 2                 track a part of the clip, every 2nd frame (long clips: RAM, see below)
  … --method csrt                                OpenCV CSRT only (no SAM 2: fast, box only, drifts on a turning body)
Standard 4.6 «Трекинг»: track only archive footage where the label MUST stick and that changes the understanding — not as
decoration. The run takes ~0.5–1 s per frame on MPS (SAM 2.1 tiny); a 8 s / 24 fps clip ≈ 2–3 min.

Pipeline
  1. ffmpeg → JPEG frames of the range (exact source frame indices, long side ≤ --max-side px) in a temp dir.
  2. SAM 2.1 (hiera tiny | small, ~/shorts/tools/models/sam2, device mps|cpu) segments the subject from the seed click / box and
     propagates forward and backward from the seed frame → one mask per frame; largest blob + blobs ≥ 15 % of it.
     confidence c = mean mask probability (rescaled 0–1) × object-presence score × area-jump penalty (area vs. the median).
  3. OpenCV CSRT runs over the same frames, re-anchored on every confident SAM 2 box; it fills the frames where SAM 2 is
     unsure (c < --min-conf). If SAM 2 cannot run (import / MPS error) the whole track falls back to CSRT (method = «csrt»).
     Frames neither can hold are interpolated between good neighbours (or held at the ends) with a low c.
  4. Temporal smoothing: a 5-frame median rejects jumps, then a confidence-weighted Gaussian (σ = --smooth s for the position,
     2σ for the size: a label that «breathes» with the mask looks cheap). The raw box stays in the JSON as «r».
  5. Preview sheet out/tracks/<name>_sheet.jpg: --sheet-n frames with mask tint, raw box (grey), smoothed box (gold), centroid,
     top anchor, c and source; under it the cx / cy curves raw vs. smooth and c over time. --preview [path] also writes an mp4.

Output (all coordinates normalised to the clip: 0–1 of its width / height; t = seconds in the clip file)
  {"version": 1, "name", "clip", "w", "h", "fps", "step", "range": [t of the first, t of the last tracked frame], "method", "seed": {...}, "smooth_s",
   "min_conf", "stats": {"n", "sam2", "csrt", "interp", "hold", "mean_conf", "low_conf_s"},
   "frames": [{"f": source frame, "t", "cx", "cy" (mask centroid), "x0", "y0", "x1", "y1" (box), "tx", "ty" (top anchor:
               centre of the top 15 % of the mask — head of a standing person), "a" (area / frame), "c", "src",
               "r": [x0, y0, x1, y1] raw box, "poly": [[x, y], …] only with --poly N}]}
RAM: SAM 2 keeps every frame as a 1024² float tensor (≈ 12.6 MB) → > 300 frames prints a warning; use --from/--to or --step.
Exit: 0 ok, 1 tracking failed (no usable frame), 2 bad input.
"""
import argparse, json, math, os, shutil, subprocess, sys, tempfile, time, warnings
from pathlib import Path

os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')
os.environ.setdefault('TQDM_DISABLE', '1')       # SAM 2's per-frame progress bars; track.py prints its own every 25 frames

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MODELS = Path.home() / 'shorts/tools/models/sam2'
CFG = {'tiny': ('configs/sam2.1/sam2.1_hiera_t.yaml', 'sam2.1_hiera_tiny.pt'), 'small': ('configs/sam2.1/sam2.1_hiera_s.yaml', 'sam2.1_hiera_small.pt')}
FRAME_MB = 12.6


def die(msg, code=2):
	print(f'track.py: {msg}', file=sys.stderr)
	sys.exit(code)


# ---------------------------------------------------------------- input

def probe(clip):
	"""(w, h, fps, n_frames, start_time) of the first video stream"""
	r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
	                    'stream=width,height,r_frame_rate,nb_read_packets,start_time', '-of', 'json', str(clip)], capture_output=True, text=True)
	if r.returncode:
		die(f'ffprobe failed on {clip}: {r.stderr.strip()}')
	s = json.loads(r.stdout)['streams'][0]
	num, den = (int(v) for v in s['r_frame_rate'].split('/'))
	st = float(s.get('start_time') or 0)
	return int(s['width']), int(s['height']), num / den, int(s['nb_read_packets']), st


def extract(clip, f_a, f_b, step, max_side, w, h, out_dir):
	"""JPEG frames 00000.jpg … of source frames f_a, f_a+step, … ≤ f_b (exact indices: select on n, passthrough timing)"""
	sc = min(1.0, max_side / max(w, h))
	ew, eh = (int(round(w * sc / 2)) * 2, int(round(h * sc / 2)) * 2)
	sel = f'select=between(n\\,{f_a}\\,{f_b})*not(mod(n-{f_a}\\,{step})),scale={ew}:{eh}:flags=area'
	r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(clip), '-vf', sel, '-fps_mode', 'passthrough', '-q:v', '2',
	                    '-start_number', '0', str(out_dir / '%05d.jpg')], capture_output=True, text=True)
	if r.returncode:
		die(f'ffmpeg failed: {r.stderr.strip()}')
	files = sorted(out_dir.glob('*.jpg'))
	return files, ew, eh


def parse_xy(s, n):
	try:
		v = [float(x) for x in s.split(',')]
	except ValueError:
		die(f'bad coordinates «{s}»')
	if len(v) != n:
		die(f'«{s}»: expected {n} numbers')
	return v


# ---------------------------------------------------------------- masks → measurements

def measure(mask):
	"""box / centroid / top anchor / area of a boolean mask (largest blob + blobs ≥ 15 % of it), or None"""
	m = mask.astype(np.uint8)
	if m.sum() < 12:
		return None
	n, lab, st, cen = cv2.connectedComponentsWithStats(m, connectivity=8)
	if n <= 1:
		return None
	areas = st[1:, cv2.CC_STAT_AREA]
	big = areas.max()
	keep = [i + 1 for i, a in enumerate(areas) if a >= 0.15 * big]
	km = np.isin(lab, keep)
	ys, xs = np.nonzero(km)
	x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
	band = ys < y0 + max(2, 0.15 * (y1 - y0))
	return {'x0': float(x0), 'y0': float(y0), 'x1': float(x1), 'y1': float(y1), 'cx': float(xs.mean()), 'cy': float(ys.mean()),
	        'tx': float(xs[band].mean()), 'ty': float(ys[band].mean()), 'a': float(km.sum()), 'mask': km}


def poly_of(mask, n_max):
	"""simplified outer contour (≤ n_max points) of a mask, pixel coords"""
	cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
	if not cs:
		return None
	c = max(cs, key=cv2.contourArea)
	eps = 0.004 * cv2.arcLength(c, True)
	ap = cv2.approxPolyDP(c, eps, True)
	while len(ap) > n_max:
		eps *= 1.35
		ap = cv2.approxPolyDP(c, eps, True)
	return ap.reshape(-1, 2).astype(float)


# ---------------------------------------------------------------- SAM 2

def run_sam2(frames_dir, n, seed_k, pts, labels, box, model, device):
	"""per-frame (mask bool HxW, prob mean, presence) from SAM 2.1 video propagation, forward + backward from seed_k"""
	import torch
	from sam2.build_sam import build_sam2_video_predictor
	warnings.filterwarnings('ignore', message='.*cannot import name ._C.*')       # CUDA post-processing only (fill holes); results unaffected
	cfg, ck = CFG[model]
	ckpt = MODELS / ck
	if not ckpt.exists():
		raise RuntimeError(f'checkpoint missing: {ckpt}')
	dev = device
	if dev == 'mps' and not torch.backends.mps.is_available():
		dev = 'cpu'
	pred = build_sam2_video_predictor(cfg, str(ckpt), device=dev)
	out = [None] * n
	with torch.inference_mode():
		state = pred.init_state(video_path=str(frames_dir), offload_video_to_cpu=True, offload_state_to_cpu=False)
		kw = {}
		if pts:
			kw['points'] = np.array(pts, dtype=np.float32)
			kw['labels'] = np.array(labels, dtype=np.int32)
		if box is not None:
			kw['box'] = np.array(box, dtype=np.float32)
		pred.add_new_points_or_box(state, frame_idx=seed_k, obj_id=1, **kw)

		def presence(k):
			try:
				od = state['output_dict_per_obj'][0]
				o = od['cond_frame_outputs'].get(k) or od['non_cond_frame_outputs'].get(k)
				return float(torch.sigmoid(o['object_score_logits'].float()).flatten()[0].cpu())
			except Exception:
				return 1.0

		t0 = time.time()
		done = 0
		for reverse in (False, True):
			if reverse and seed_k == 0:
				continue
			for k, _ids, logits in pred.propagate_in_video(state, start_frame_idx=seed_k, reverse=reverse):
				lg = logits[0, 0].float().cpu().numpy()
				m = lg > 0
				pm = float(1 / (1 + np.exp(-lg[m])).mean()) if m.any() else 0.0
				out[k] = (m, pm, presence(k))
				done += 1
				if done % 25 == 0:
					print(f'  sam2 {done}/{n} frames ({(time.time() - t0) / done:.2f} s/frame)', flush=True)
		pred.reset_state(state)
	return out, dev


# ---------------------------------------------------------------- CSRT

def make_csrt():
	if hasattr(cv2, 'TrackerCSRT_create'):
		return cv2.TrackerCSRT_create()
	return cv2.legacy.TrackerCSRT_create()


def iou(a, b):
	ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
	iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
	inter = ix * iy
	u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
	return inter / u if u > 0 else 0.0


def run_csrt(imgs, seed_k, seed_box, anchors):
	"""per-frame box (x0, y0, x1, y1) or None; anchors[k] = confident SAM 2 box to re-anchor on (or None)"""
	n = len(imgs)
	out = [None] * n
	for order in (range(seed_k, n), range(seed_k, -1, -1)):
		tr = None
		for k in order:
			img = imgs[k]
			if tr is None:
				b = anchors[k] or seed_box
				tr = make_csrt()
				tr.init(img, tuple(int(round(v)) for v in (b[0], b[1], b[2] - b[0], b[3] - b[1])))
				out[k] = tuple(b)
				continue
			ok, r = tr.update(img)
			box = (r[0], r[1], r[0] + r[2], r[1] + r[3]) if ok and r[2] > 2 and r[3] > 2 else None
			a = anchors[k]
			if a is not None and (box is None or iou(box, a) < 0.7 or k % 8 == 0):
				tr = make_csrt()
				tr.init(img, tuple(int(round(v)) for v in (a[0], a[1], a[2] - a[0], a[3] - a[1])))
				box = tuple(a)
			out[k] = box
	return out


# ---------------------------------------------------------------- smoothing

def median_reject(v, win=5, thr=0.06):
	"""replace jumps (|v − median of the window| > thr) by the median; returns (v, rejected flags)"""
	n = len(v)
	v2, bad = v.copy(), np.zeros(n, dtype=bool)
	h = win // 2
	for i in range(n):
		a, b = max(0, i - h), min(n, i + h + 1)
		med = float(np.median(v[a:b]))
		if abs(v[i] - med) > thr:
			v2[i] = med
			bad[i] = True
	return v2, bad


def gauss_w(v, c, sigma):
	"""confidence-weighted Gaussian smoothing (zero phase), sigma in samples"""
	if sigma <= 0.01:
		return v.copy()
	n = len(v)
	r = int(math.ceil(3 * sigma))
	k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
	w = np.maximum(c, 0.05)
	num = np.convolve(np.pad(v * w, r, mode='edge'), k, mode='valid')
	den = np.convolve(np.pad(w, r, mode='edge'), k, mode='valid')
	return (num / den)[:n]


# ---------------------------------------------------------------- preview

def font(sz):
	for p in ('/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc'):
		try:
			return ImageFont.truetype(p, sz)
		except Exception:
			pass
	return ImageFont.load_default()


def draw_frame(img_bgr, fr, mask, ew, eh, seed=None):
	"""PIL image of one frame with mask tint, raw box, smoothed box, centroid, top anchor"""
	im = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)).convert('RGB')
	if mask is not None:
		tint = Image.new('RGB', im.size, (255, 122, 31))
		im = Image.composite(Image.blend(im, tint, 0.45), im, Image.fromarray((mask * 255).astype(np.uint8)))
	d = ImageDraw.Draw(im)
	sx, sy = ew, eh
	r = fr['r']
	d.rectangle([r[0] * sx, r[1] * sy, r[2] * sx, r[3] * sy], outline=(170, 170, 170), width=1)
	d.rectangle([fr['x0'] * sx, fr['y0'] * sy, fr['x1'] * sx, fr['y1'] * sy], outline=(255, 200, 58), width=3)
	for (x, y, col) in ((fr['cx'], fr['cy'], (255, 255, 255)), (fr['tx'], fr['ty'], (42, 230, 216))):
		d.ellipse([x * sx - 5, y * sy - 5, x * sx + 5, y * sy + 5], fill=col, outline=(18, 8, 24), width=2)
	if seed:
		for (x, y) in seed:
			d.line([x * sx - 9, y * sy, x * sx + 9, y * sy], fill=(255, 46, 136), width=3)
			d.line([x * sx, y * sy - 9, x * sx, y * sy + 9], fill=(255, 46, 136), width=3)
	return im


def plot_strip(frames, width, height=220):
	"""cx / cy raw (thin) vs smooth (thick) and c over time"""
	im = Image.new('RGB', (width, height), (24, 22, 30))
	d = ImageDraw.Draw(im)
	n = len(frames)
	if n < 2:
		return im
	X = lambda i: 10 + (width - 20) * i / (n - 1)
	Y = lambda v: height - 12 - (height - 34) * v
	for v in (0.25, 0.5, 0.75):
		d.line([10, Y(v), width - 10, Y(v)], fill=(50, 48, 60))
	srcc = {'sam2': (60, 60, 70), 'csrt': (120, 70, 20), 'interp': (120, 20, 40), 'hold': (120, 20, 40)}
	mixed = any(f['src'] == 'sam2' for f in frames)        # CSRT-only tracks: nothing to shade
	for i, f in enumerate(frames):
		if mixed and f['src'] != 'sam2':
			d.rectangle([X(i) - 2, 22, X(i) + 2, height - 12], fill=srcc.get(f['src'], (90, 20, 20)))
	for key, raw_i, col in (('cx', 0, (255, 200, 58)), ('cy', 1, (42, 230, 216))):
		raw = [((f['r'][raw_i] + f['r'][raw_i + 2]) / 2) for f in frames]
		d.line([(X(i), Y(v)) for i, v in enumerate(raw)], fill=tuple(int(c * 0.6) for c in col), width=1)
		d.line([(X(i), Y((f['x0'] + f['x1']) / 2 if key == 'cx' else (f['y0'] + f['y1']) / 2)) for i, f in enumerate(frames)], fill=col, width=3)
	d.line([(X(i), Y(f['c'])) for i, f in enumerate(frames)], fill=(255, 255, 255), width=2)
	d.text((12, 3), 'box centre x (gold) / y (teal): thin = raw, thick = smooth · white = confidence · shaded = csrt (brown) / interp (red)', fill=(220, 220, 220), font=font(15))
	return im


def write_sheet(path, imgs, frames, masks, ew, eh, n_show, seed_k, seed_pts, name, meta):
	idx = sorted(set([int(round(i)) for i in np.linspace(0, len(frames) - 1, n_show)] + [seed_k]))
	cols = 4
	tw = 420
	th = int(round(tw * eh / ew))
	rows = (len(idx) + cols - 1) // cols
	lab = 26
	sheet = Image.new('RGB', (cols * (tw + 6), rows * (th + lab + 6) + 230 + 40), (40, 40, 40))
	d = ImageDraw.Draw(sheet)
	f18 = font(18)
	d.text((8, 8), f'{name} · {meta}', fill=(255, 210, 60), font=font(20))
	for j, k in enumerate(idx):
		fr = frames[k]
		im = draw_frame(imgs[k], fr, masks[k], ew, eh, seed_pts if k == seed_k else None).resize((tw, th))
		x, y = (j % cols) * (tw + 6), 40 + (j // cols) * (th + lab + 6)
		sheet.paste(im, (x, y + lab))
		col = (255, 210, 60) if fr['src'] == 'sam2' else (255, 120, 60)
		d.text((x + 4, y + 3), f"f{fr['f']} t{fr['t']:.2f} c{fr['c']:.2f} {fr['src']}{' SEED' if k == seed_k else ''}", fill=col, font=f18)
	strip = plot_strip(frames, sheet.width - 12)
	sheet.paste(strip, (6, sheet.height - 236))
	path.parent.mkdir(parents=True, exist_ok=True)
	sheet.save(path, quality=85)


def write_preview(path, imgs, frames, masks, ew, eh, fps):
	path.parent.mkdir(parents=True, exist_ok=True)
	p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{ew}x{eh}', '-r', f'{fps}', '-i', '-',
	                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', str(path)], stdin=subprocess.PIPE)
	for k, fr in enumerate(frames):
		p.stdin.write(np.asarray(draw_frame(imgs[k], fr, masks[k], ew, eh)).tobytes())
	p.stdin.close()
	p.wait()


# ---------------------------------------------------------------- main

def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument('clip', help='video file (mp4 / mov / webm)')
	ap.add_argument('--name', help='track name → data/tracks/<name>.json (default: clip stem)')
	ap.add_argument('--point', action='append', default=[], help='positive click X,Y on the subject (repeatable); 0–1 or pixels')
	ap.add_argument('--neg', action='append', default=[], help='negative click X,Y («not this»), SAM 2 only (repeatable)')
	ap.add_argument('--box', help='seed box X0,Y0,X1,Y1 around the subject; 0–1 or pixels')
	ap.add_argument('--t', type=float, default=None, help='seed time in the clip (s); default = start of the range')
	ap.add_argument('--frame', type=int, default=None, help='seed source frame index instead of --t')
	ap.add_argument('--from', dest='t_from', type=float, default=0.0, help='range start in the clip (s), default 0')
	ap.add_argument('--to', dest='t_to', type=float, default=None, help='range end in the clip (s), default = clip end')
	ap.add_argument('--step', type=int, default=1, help='track every Nth source frame (Tracked.tsx interpolates), default 1')
	ap.add_argument('--method', choices=['auto', 'sam2', 'csrt'], default='auto', help='auto = SAM 2 + CSRT gap filling, CSRT if SAM 2 fails')
	ap.add_argument('--model', choices=list(CFG), default='tiny', help='SAM 2.1 size (default tiny)')
	ap.add_argument('--device', choices=['mps', 'cpu'], default='mps')
	ap.add_argument('--max-side', type=int, default=640, help='long side of the frames given to the trackers (px), default 640')
	ap.add_argument('--seed-size', type=float, default=0.3, help='CSRT-only point seed: box side as a fraction of the clip height')
	ap.add_argument('--smooth', type=float, default=0.08, help='Gaussian sigma of the position in seconds (size: 2×), default 0.08')
	ap.add_argument('--min-conf', type=float, default=0.35, help='below this a SAM 2 frame is «unsure» → CSRT / interpolation')
	ap.add_argument('--poly', type=int, default=0, help='also store the simplified mask outline with ≤ N points (0 = off)')
	ap.add_argument('--out', help='output JSON (default data/tracks/<name>.json in short/)')
	ap.add_argument('--sheet', help='preview sheet (default out/tracks/<name>_sheet.jpg); «0» = none')
	ap.add_argument('--sheet-n', type=int, default=12, help='frames on the sheet (default 12)')
	ap.add_argument('--preview', nargs='?', const='', default=None, help='also write an mp4 with the overlays on every frame (default path out/tracks/<name>_preview.mp4)')
	a = ap.parse_args()

	clip = Path(a.clip).expanduser().resolve()
	if not clip.exists():
		die(f'no such clip: {clip}')
	if not a.point and not a.box:
		die('give a seed: --point X,Y (repeatable) or --box X0,Y0,X1,Y1')
	if a.step < 1:
		die('--step must be ≥ 1')
	name = a.name or clip.stem
	w, h, fps, nf, st = probe(clip)
	f_a = max(0, int(round((a.t_from - st) * fps)))
	f_b = nf - 1 if a.t_to is None else min(nf - 1, int(round((a.t_to - st) * fps)) - 1)
	if f_b <= f_a:
		die(f'empty range: frames {f_a}–{f_b}')
	seed_f = a.frame if a.frame is not None else (f_a if a.t is None else int(round((a.t - st) * fps)))
	if not f_a <= seed_f <= f_b:
		die(f'seed frame {seed_f} outside the range {f_a}–{f_b}')
	seed_k = (seed_f - f_a) // a.step
	n_est = (f_b - f_a) // a.step + 1
	if n_est > 300 and a.method != 'csrt':
		print(f'WARNING: {n_est} frames ≈ {n_est * FRAME_MB / 1024:.1f} GB RAM for SAM 2 — consider --from/--to or --step 2', flush=True)

	def to_norm(vals):
		return [v / (w if i % 2 == 0 else h) for i, v in enumerate(vals)] if max(vals) > 1.0 else vals

	pts_n = [to_norm(parse_xy(p, 2)) for p in a.point]
	neg_n = [to_norm(parse_xy(p, 2)) for p in a.neg]
	box_n = to_norm(parse_xy(a.box, 4)) if a.box else None

	tmp = Path(tempfile.mkdtemp(prefix=f'track_{name}_'))
	try:
		t_start = time.time()
		files, ew, eh = extract(clip, f_a, f_b, a.step, a.max_side, w, h, tmp)
		n = len(files)
		if n == 0:
			die('ffmpeg wrote no frames')
		seed_k = min(seed_k, n - 1)
		imgs = [cv2.imread(str(p)) for p in files]
		print(f'{clip.name}: {w}×{h} @ {fps:.3f} fps, frames {f_a}–{f_b} step {a.step} → {n} frames at {ew}×{eh}; seed frame {seed_f} (#{seed_k})', flush=True)

		px = lambda p: [p[0] * ew, p[1] * eh]
		pts = [px(p) for p in pts_n] + [px(p) for p in neg_n]
		labels = [1] * len(pts_n) + [0] * len(neg_n)
		box_px = [box_n[0] * ew, box_n[1] * eh, box_n[2] * ew, box_n[3] * eh] if box_n else None

		sam = [None] * n
		method = 'csrt'
		if a.method in ('auto', 'sam2'):
			try:
				sam, dev = run_sam2(tmp, n, seed_k, pts, labels, box_px, a.model, a.device)
				method = f'sam2.1_hiera_{a.model}@{dev}+csrt'
			except Exception as e:
				if a.method == 'sam2':
					die(f'SAM 2 failed: {e}', 1)
				print(f'WARNING: SAM 2 failed ({type(e).__name__}: {e}) → CSRT only', flush=True)

		meas = [None] * n
		conf = np.zeros(n)
		for k in range(n):
			if sam[k] is None:
				continue
			m, pm, pres = sam[k]
			mm = measure(m)
			if mm is None:
				continue
			meas[k] = mm
			conf[k] = max(0.0, (pm - 0.5) * 2) * min(1.0, pres * 1.05)
		areas = np.array([mm['a'] for mm in meas if mm is not None])
		if len(areas):
			med = float(np.median(areas))
			for k in range(n):
				if meas[k] is not None:
					conf[k] *= float(np.clip(1.25 - abs(math.log(meas[k]['a'] / med)) / math.log(4), 0, 1))

		# CSRT: seed box = SAM 2 box on the seed frame, else the given box, else a square around the first click
		if meas[seed_k] is not None:
			sb = (meas[seed_k]['x0'], meas[seed_k]['y0'], meas[seed_k]['x1'], meas[seed_k]['y1'])
		elif box_px:
			sb = tuple(box_px)
		else:
			s = a.seed_size * eh
			cx, cy = pts[0]
			sb = (max(0, cx - s / 2), max(0, cy - s / 2), min(ew - 1, cx + s / 2), min(eh - 1, cy + s / 2))
		anchors = [(meas[k]['x0'], meas[k]['y0'], meas[k]['x1'], meas[k]['y1']) if meas[k] is not None and conf[k] >= a.min_conf else None for k in range(n)]
		csrt = run_csrt(imgs, seed_k, sb, anchors)

		# per-frame raw record (pixels of the extracted frames)
		raw = [None] * n
		src = [''] * n
		for k in range(n):
			if meas[k] is not None and conf[k] >= a.min_conf:
				raw[k] = {kk: meas[k][kk] for kk in ('x0', 'y0', 'x1', 'y1', 'cx', 'cy', 'tx', 'ty', 'a')}
				src[k] = 'sam2'
			elif csrt[k] is not None:
				x0, y0, x1, y1 = csrt[k]
				raw[k] = {'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'cx': (x0 + x1) / 2, 'cy': (y0 + y1) / 2, 'tx': (x0 + x1) / 2, 'ty': y0 + 0.07 * (y1 - y0), 'a': (x1 - x0) * (y1 - y0) * 0.5}
				src[k] = 'csrt'
				conf[k] = max(conf[k], 0.45 if method != 'csrt' else 0.6)
		good = [k for k in range(n) if raw[k] is not None]
		if not good:
			die('no frame could be tracked (check the seed on the sheet of the first frames)', 1)
		for k in range(n):
			if raw[k] is not None:
				continue
			prv = max([g for g in good if g < k], default=None)
			nxt = min([g for g in good if g > k], default=None)
			if prv is not None and nxt is not None:
				u = (k - prv) / (nxt - prv)
				raw[k] = {kk: raw[prv][kk] * (1 - u) + raw[nxt][kk] * u for kk in raw[prv]}
				src[k], conf[k] = 'interp', 0.2
			else:
				g = prv if prv is not None else nxt
				raw[k] = dict(raw[g])
				src[k], conf[k] = 'hold', max(0.0, 0.3 - 0.05 * abs(k - g))

		# normalise, reject jumps, smooth
		keys = ('x0', 'y0', 'x1', 'y1', 'cx', 'cy', 'tx', 'ty')
		arr = {kk: np.array([raw[k][kk] / (ew if kk in ('x0', 'x1', 'cx', 'tx') else eh) for k in range(n)]) for kk in keys}
		bx, by = (arr['x0'] + arr['x1']) / 2, (arr['y0'] + arr['y1']) / 2
		bw, bh = arr['x1'] - arr['x0'], arr['y1'] - arr['y0']
		sig = a.smooth * fps / a.step
		chans, bad = {}, np.zeros(n, dtype=bool)
		for kk, v, thr, sg in (('bx', bx, 0.06, sig), ('by', by, 0.06, sig), ('cx', arr['cx'], 0.06, sig), ('cy', arr['cy'], 0.06, sig),
		                        ('tx', arr['tx'], 0.08, sig), ('ty', arr['ty'], 0.08, sig), ('bw', bw, 0.08, 2 * sig), ('bh', bh, 0.08, 2 * sig)):
			v2, b = median_reject(v, 5, thr)
			chans[kk] = (v2, sg)
			bad |= b
		c = np.where(bad, conf * 0.5, conf)          # a rejected jump halves c once (not once per channel)
		for kk, (v2, sg) in chans.items():
			chans[kk] = gauss_w(v2, c, sg)
		frames = []
		r4 = lambda x: round(float(x), 4)
		for k in range(n):
			f = f_a + k * a.step
			x0, x1 = chans['bx'][k] - chans['bw'][k] / 2, chans['bx'][k] + chans['bw'][k] / 2
			y0, y1 = chans['by'][k] - chans['bh'][k] / 2, chans['by'][k] + chans['bh'][k] / 2
			fr = {'f': f, 't': round(st + f / fps, 4), 'cx': r4(chans['cx'][k]), 'cy': r4(chans['cy'][k]), 'x0': r4(x0), 'y0': r4(y0), 'x1': r4(x1), 'y1': r4(y1),
			      'tx': r4(chans['tx'][k]), 'ty': r4(chans['ty'][k]), 'a': round(raw[k]['a'] / (ew * eh), 5), 'c': round(float(c[k]), 3), 'src': src[k],
			      'r': [r4(arr['x0'][k]), r4(arr['y0'][k]), r4(arr['x1'][k]), r4(arr['y1'][k])]}
			if a.poly and meas[k] is not None and src[k] == 'sam2':
				pl = poly_of(meas[k]['mask'], a.poly)
				if pl is not None:
					fr['poly'] = [[r4(p[0] / ew), r4(p[1] / eh)] for p in pl]
			frames.append(fr)

		cnt = {s: src.count(s) for s in ('sam2', 'csrt', 'interp', 'hold')}
		low = sum(1 for x in c if x < a.min_conf) * a.step / fps
		data = {'version': 1, 'name': name, 'clip': clip.name, 'w': w, 'h': h, 'fps': round(fps, 5), 'step': a.step,
		        'range': [frames[0]['t'], frames[-1]['t']], 'method': method,
		        'seed': {'f': seed_f, 't': round(st + seed_f / fps, 4), 'points': [[r4(x) for x in p] for p in pts_n], 'neg': [[r4(x) for x in p] for p in neg_n], 'box': [r4(x) for x in box_n] if box_n else None},
		        'smooth_s': a.smooth, 'min_conf': a.min_conf,
		        'stats': {'n': n, **cnt, 'mean_conf': round(float(np.mean(c)), 3), 'low_conf_s': round(low, 2)},
		        'frames': frames}
		out = Path(a.out).expanduser() if a.out else ROOT / 'data/tracks' / f'{name}.json'
		if not out.is_absolute():
			out = (Path.cwd() / out).resolve()
		out.parent.mkdir(parents=True, exist_ok=True)
		out.write_text(json.dumps(data, separators=(',', ':')) + '\n')
		print(f'✓ {n} frames → {out}  ({method}; sam2 {cnt["sam2"]}, csrt {cnt["csrt"]}, interp {cnt["interp"]}, hold {cnt["hold"]}; '
		      f'mean c {np.mean(c):.2f}, unsure {low:.2f} s; {time.time() - t_start:.0f} s)')

		masks = [meas[k]['mask'] if meas[k] is not None else None for k in range(n)]
		if a.sheet != '0':
			sp = Path(a.sheet).expanduser() if a.sheet else ROOT / 'out/tracks' / f'{name}_sheet.jpg'
			meta = f'{clip.name} · {method} · mean c {np.mean(c):.2f} · seed f{seed_f}'
			write_sheet(sp, imgs, frames, masks, ew, eh, a.sheet_n, seed_k, [p for p in pts_n] or ([[(box_n[0] + box_n[2]) / 2, (box_n[1] + box_n[3]) / 2]] if box_n else []), name, meta)
			print(f'sheet → {sp}')
		if a.preview is not None:
			pp = Path(a.preview).expanduser() if a.preview else ROOT / 'out/tracks' / f'{name}_preview.mp4'
			write_preview(pp, imgs, frames, masks, ew, eh, fps / a.step)
			print(f'preview → {pp}')
	finally:
		shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
	main()
