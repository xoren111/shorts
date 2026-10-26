"""Feed variety gate (standard 4.1 H14, 4.2 R-13, QA 9E D1–D3, step 9F): every Short comes from the same template, so the
channel feed must not look templated. Compares the opening of a rendered Short with the channel's last Shorts in the registry
SHORTS_PRODUCTION/06_Exports/_variety_registry/ (registry.json + thumbs/).

  python3 tools/variety_check.py [video] [--sheet out.jpg]      check (default video: out/FINAL/<stem>_yt.mp4, else <out_name>)
  python3 tools/variety_check.py out/FINAL/<stem>_yt.mp4 --register [--status published] [--date 2026-10-25] [--note …]
  python3 tools/variety_check.py --plan-only [--json]          only the EDIT_PLAN lines (no video; tools/check.mjs п. 11)
  python3 tools/variety_check.py --list                        the registry, newest first
  python3 tools/variety_check.py --unregister <slug>           remove an entry (and its thumbnails)
  python3 tools/variety_check.py --matrix [a.mp4 b.mp4 …]      distance table between videos (none: between registry entries)
<stem> = project.json out_name without .mp4 (new_project.sh: the slug with «-» → «_», e.g. variety_test_yt.mp4).
Registry folder: --registry, else $VARIETY_REGISTRY (tests; qa.sh and check.mjs pass the environment on), else
<library_root>/06_Exports/_variety_registry. python3 WITHOUT -I (numpy / Pillow come from the user site-packages).
Exit: 0 = pass (warnings allowed), 1 = ERROR, 2 = usage / unreadable video or registry.

What is compared
- The moments 0.0, 1.0 and 2.0 s (ffmpeg, rgb24 270×480), each with a time search: the checked Short gives every frame over
  [t, t + 0.5 s] (resampled to 30 fps, one ffmpeg call per moment), a registry entry stores one frame every 0.1 s over the
  same span («strip»); the closest pair counts. So a copy trimmed by up to 0.5 s (it starts later in the earlier Short's shot,
  shift > 0) or padded with a lead-in of up to 0.5 s (shift < 0) still meets its original. The exact pair (0 / 0) always
  counts; flat frames (black, white, one colour: grey std < FLAT_STD = 8; real frames 0 of the seeded set: 28–67) only there,
  so two fades through black do not match each other.
- The subtitle band y 1080–1450 (of 1920) is cut out before hashing: subtitle style, white + orange accent, is channel identity and
  must stay the same (R3) — it is not «sameness». Limit: the seeded ATLAS APE episodes predate R3 (old kits, subY 1330–1570),
  their subtitles sit at about y 1500–1560, below the band, and are hashed with the picture (small text: little effect on the
  verdicts, see calibration A). Shorts made from this template keep subtitles inside the band.
- Per frame: dHash 16×16 (256 bit, gradients), pHash 16×16 (256 bit, low DCT frequencies of a 64×64 grey image) and a
  4×4×4 RGB histogram (Hellinger distance). For two frames
      D         = 0.35 · dHash/256 + 0.35 · pHash/256 + 0.30 · Hellinger     (0 = same picture, ≈ 0.5 = unrelated)
      structure = (dHash/256 + pHash/256) / 2                                (colours ignored: a regrade keeps it ≈ 0)
  The checked Short's frame is also compared mirrored (a flipped copy is still a copy); the closer one counts («m»). The report
  shows the time shift of the closest pair («@+0.27» = this Short starts 0.27 s later in that shot).
- Window: the last N Shorts of the SAME channel (project.json "channel"; N = project.json "variety.window", default 5),
  ordered by date then registration; entries with the same slug (the project itself, its A/B versions) are skipped.
  Entries registered with features v1 (no strip) compare at the exact moments only — re-register them (--register).
- Text: the EDIT_PLAN header lines «Визуальная идея: …» and «Кадр 0: …» against the same lines of the window entries —
  Dice similarity of normalised word stems (lowercase, ё → е, words ≥ 3 letters, stop words out, first 5 letters);
  «Визуальная идея» also drops channel-identity words (Atlas, финал, субтитры, золото, loop …).

Verdicts (thresholds calibrated 24.10.2026 on the seeded ATLAS APE set, table below)
- ERROR    frame 0 near-identical to a window entry:     D ≤ ERR_D = 0.10  or  structure ≤ STRUCT_ERR = 0.06
- WARNING  frame 0 very similar:                          D ≤ WARN_D = 0.35
- WARNING  the 1.0 s or 2.0 s frame near-identical to the same moment of a window entry (same opening device, 4.2 R-13)
- WARNING  «Визуальная идея» or «Кадр 0» too close to a window entry: similarity ≥ TEXT_WARN = 0.35
- missing line / template placeholder: WARNING here (qa.sh), ERROR in --plan-only (check.mjs п. 11); --register refuses
- With an ERROR or a frame-0 WARNING the nearest frame 0 is printed as INFO, otherwise as OK.
- The previous Short's lines are printed next to the new ones: «not the same frame-0 type (H14: who + material, always inside
  H1), not the same main visual device as the previous Short» stays the human check of QA D2 (the tool sees near-copies and
  close wording, not a «type»).
Channel identity is exempt (standard 4.1 H14): subtitle style (band masked), colours white + orange, Atlas as reaction /
finale, loop ending, loudness.

Calibration 24.10.2026 (check mode, mirror on, time search ±0.5 s; copies = the first 3.5 s through libx264 crf 28 at 720×1280;
in brackets the exact-moment value without the time search, as in features v1):
  A. different episodes — volcano, rabbits, yellow-fleet (B+friend), pig-war (v3), football-222, ai-farm-girl, 15 pairs,
     D at 0.0 s:            rabbits yellow-f pig-war  f-222   farm
        volcano               .505    .556    .589    .478    .444
        rabbits                       .500    .588    .472    .522
        yellow-fleet                          .556    .573    .571
        pig-war                                       .596    .593
        football-222                                          .463
     min 0.444 (v1 0.467) · median 0.556 · max 0.596. All 828 cross-episode comparisons per moment (both directions, incl.
     the other cuts, the template demo and every shifted copy below as the checked Short): frame 0 min D 0.423, min structure
     0.383; 1 s / 2 s min D 0.401 / 0.380 (football-222 – ai-farm-girl); 0 ERROR / 0 WARNING.
  B. same episode, other cut: yellow-fleet v8 – friend voice 0.000 · B – B+friend 0.000 · pig-war v3 – v3 flow 0.000
     (same picture) → ERROR; yellow-fleet v8 – B (same canal + «1-DAY TRIP» title) 0.092 → ERROR, at 1 s / 2 s (v8 shows a
     map card instead) 0.163 / 0.184 → WARNING band; pig-war v1 – v2 (same staging, toy 3D vs oil paint) 0.509, v2 – v3 0.559,
     v1 – v3 0.600 → pass (a restyle is not a near-copy: text lines + QA D2).
  C. copies of the 6 episodes + the template demo → ERROR (frame 0, 7 of 7 each):
        re-encode, no shift              0.008–0.021   [0.008–0.029]
        trimmed 0.04 s (2 frames @ 60)   0.015–0.030   [0.025–0.385]
        trimmed 0.1 s                    0.008–0.017   [0.032–0.312]
        trimmed 0.25 s                   0.014–0.032   [0.036–0.362: ai-farm-girl PASS]
        trimmed 0.5 s                    0.010–0.021   [0.055–0.377]
        0.25 s black lead-in             0.013–0.047   [0.478–0.647]
        0.5 s black lead-in              0.006–0.024   [0.478–0.647]
        trimmed 0.75 s (beyond ±0.5 s)   0.032–0.213 → 3 ERROR (slow openings) / 4 WARNING (fast hooks)
     max structure of the copies 0.055. Template demo re-rendered from a fresh copy (new_project.sh → check → mix →
     render.mjs → final_pass.sh) against the 24.10 preview: 0.000 at 0 / 1 / 2 s → ERROR. Earlier (v1) harsh crf 38 at 540×960
     with +3 % brightness / +5 % contrast 0.023–0.072 (structure ≤ 0.080) → ERROR.
  D. edits of each episode's frame 0 (the edited frame alone against the original strip): brightness +15 % 0.039–0.134 and a
     warm regrade 0.059–0.165 (structure 0.008–0.037) → ERROR; mirrored 0.000–0.001 → ERROR; small Atlas window 75×90 (of
     270×480) 0.081–0.148 → 1 ERROR / 5 WARNING; title bar 0.119–0.204, shift 5 % 0.207–0.278, big card 150×180 0.199–0.302
     → WARNING; zoom 1.10 0.081–0.253 → 1 ERROR (football-222: its push-in reaches that framing at +0.4 s) / 5 WARNING;
     zoom 1.25 0.232–0.371 → 3 of 6 WARNING.
  Margins: ERR_D 0.10 is above every copy (≤ 0.047) and the same-picture-plus-title re-cut (0.092), below the same scene with
  another overlay (0.163); STRUCT_ERR 0.06 is above regrades (≤ 0.041) and copies (≤ 0.055), below the nearest non-copy
  (0.076); WARN_D 0.35 is 0.073 below the closest different episodes at frame 0 (0.423). Text: different episodes max 0.29
  («Кадр 0» volcano – rabbits, both «Atlas bottom-left») / 0.14 («Визуальная идея»); paraphrases of a registered line
  0.50–0.67; unrelated lines 0.00–0.14; «paper Vox collage + archive photos» vs football-222's idea 0.36 → TEXT_WARN 0.35.
  Recalibrate with --matrix as the registry grows (e.g. two different Vox-collage frames 0 on the same paper should stay in
  the WARNING band or pass).
"""
import argparse, datetime, json, os, re, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent          # short/
SP_GUESS = ROOT.parent.parent.parent                    # SHORTS_PRODUCTION (template and projects sit two levels below it)
DEMO_SLUG = 'template-demo'                             # the template demo is never compared or registered
TIMES = (0.0, 1.0, 2.0)
SHIFT_MAX = 0.5                                         # time search: frames over [t, t + SHIFT_MAX] on both sides
SHIFT_STEP = 0.1                                        # registry: one frame every SHIFT_STEP s over that span
STRIP_FPS = 30                                          # checked Short: every frame of that span, resampled to 30 fps
FLAT_STD = 8.0                                          # grey std (0–255) below this = flat frame (black, white, one colour)
TW, TH = 270, 480                                       # sampled frame = thumbnail size (1080×1920 / 4)
MASK_Y = (1080, 1450)                                   # subtitle band in 1920-px coordinates (R3: centre 1180–1300, ≤ 1440)
HASH_N = 16                                             # dHash / pHash: 16×16 = 256 bit
HIST_BINS = 4                                           # per RGB channel → 64 bins
W_DHASH, W_PHASH, W_HIST = 0.35, 0.35, 0.30
ERR_D, WARN_D = 0.10, 0.35                              # frame 0: ERROR / WARNING (calibration in the docstring)
STRUCT_ERR = 0.06                                       # (dHash + pHash) / 2 ≤ this = same picture, only regraded → ERROR
TEXT_WARN = 0.35
WINDOW = 5
FEATURES = {'version': 2, 'size': [TW, TH], 'mask_y': list(MASK_Y), 'dhash': HASH_N, 'phash': HASH_N, 'hist_bins': HIST_BINS,
	'shift_max': SHIFT_MAX, 'shift_step': SHIFT_STEP}
ABOUT = ('Feed variety registry (SHORTS_EDITING_STANDARD 4.1 H14, 9F): one entry per delivered / published Short, written by '
	'04_Templates/remotion_short/short/tools/variety_check.py --register; edit only through that tool (--register / --unregister).')
LABELS = {'idea': r'(?:визуальная\s+идея|visual\s+idea)', 'frame0': r'(?:кадр\s*0|frame\s*0)'}
STOP = {'это', 'как', 'что', 'для', 'или', 'его', 'она', 'они', 'при', 'над', 'под', 'без', 'через', 'после', 'перед', 'между',
	'котор', 'все', 'всё', 'так', 'уже', 'еще', 'только', 'один', 'одна', 'одно', 'там', 'тут', 'где', 'когда', 'чтобы', 'потом',
	'the', 'and', 'with', 'for', 'from', 'into', 'over', 'then', 'its', 'his', 'her', 'their', 'that', 'this', 'are', 'was',
	'против', 'вместо', 'около', 'внутри', 'видно', 'показ', 'нашем', 'наша', 'наши', 'short', 'shorts'}
STOP_PREFIX = ('кадр', 'ролик', 'сцен', 'шорт')
# channel identity (standard 4.1 H14) — the same in every Short, so it must not make two «Визуальная идея» lines look alike
IDENTITY = ('atlas', 'атлас', 'финал', 'субти', 'золот', 'белый', 'белым', 'петля', 'петли', 'loop', 'громк')


# ---------------------------------------------------------------- project / paths
def load_project():
	p = ROOT / 'project.json'
	return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}


def default_registry(project):
	"""--registry, else $VARIETY_REGISTRY (tests, other libraries; qa.sh and check.mjs pass the environment on), else
	<library_root>/06_Exports/_variety_registry."""
	env = os.environ.get('VARIETY_REGISTRY', '').strip()
	if env:
		return Path(env).expanduser()
	lib = project.get('library_root')
	base = Path(lib) if lib and Path(lib).is_dir() else SP_GUESS
	return base / '06_Exports' / '_variety_registry'


def default_video(project):
	name = project.get('out_name') or (project.get('slug', 'short') + '.mp4')
	v = os.environ.get('VARIANT', '')
	if v:
		name = name[:-4] + '_' + v + '.mp4' if name.endswith('.mp4') else name + '_' + v + '.mp4'
	yt = ROOT / 'out' / 'FINAL' / (name[:-4] + '_yt.mp4')
	return yt if yt.exists() else ROOT / 'out' / 'FINAL' / name


# ---------------------------------------------------------------- frames and features
def grab(video, t):
	"""one frame at t seconds as rgb24 TH×TW (None when the video is shorter)."""
	cmd = ['ffmpeg', '-v', 'error', '-nostdin', '-ss', '%.3f' % t, '-i', str(video), '-map', '0:v:0', '-frames:v', '1',
		'-vf', 'scale=%d:%d:flags=area,format=rgb24' % (TW, TH), '-f', 'rawvideo', '-']
	r = subprocess.run(cmd, capture_output=True)
	n = TW * TH * 3
	if r.returncode != 0 or len(r.stdout) < n:
		return None
	return np.frombuffer(r.stdout[:n], np.uint8).reshape(TH, TW, 3)


def grab_strip(video, t):
	"""every frame over [t, t + SHIFT_MAX], resampled to STRIP_FPS, as rgb24 TH×TW (one ffmpeg call; frame i is at t + i / STRIP_FPS;
	frame 0 is the same picture as grab(video, t)). Empty when the video is shorter than t."""
	n = int(round(SHIFT_MAX * STRIP_FPS)) + 1
	cmd = ['ffmpeg', '-v', 'error', '-nostdin', '-ss', '%.3f' % t, '-i', str(video), '-map', '0:v:0', '-t', '%.4f' % ((n - 0.5) / STRIP_FPS),
		'-vf', 'fps=%d,scale=%d:%d:flags=area,format=rgb24' % (STRIP_FPS, TW, TH), '-f', 'rawvideo', '-']
	r = subprocess.run(cmd, capture_output=True)
	sz = TW * TH * 3
	k = min(n, len(r.stdout) // sz) if r.returncode == 0 else 0
	return [np.frombuffer(r.stdout[i * sz:(i + 1) * sz], np.uint8).reshape(TH, TW, 3) for i in range(k)]


def masked(rgb):
	"""the frame without the subtitle band (channel identity, standard 4.1 H14)."""
	h = rgb.shape[0]
	a, b = int(round(MASK_Y[0] / 1920 * h)), int(round(MASK_Y[1] / 1920 * h))
	return np.vstack([rgb[:a], rgb[b:]])


def _gray(rgb, size):
	return np.asarray(Image.fromarray(rgb).convert('L').resize(size, Image.Resampling.LANCZOS), dtype=np.float64)


def _bits_hex(bits):
	return '%0*x' % (bits.size // 4, int(''.join('1' if x else '0' for x in bits.ravel()), 2))


def _dct_matrix(n):
	k = np.arange(n)[:, None]
	i = np.arange(n)[None, :]
	m = np.cos(np.pi * (2 * i + 1) * k / (2 * n)) * np.sqrt(2.0 / n)
	m[0] /= np.sqrt(2.0)
	return m


_DCT = _dct_matrix(HASH_N * 4)


def dhash(rgb):
	g = _gray(rgb, (HASH_N + 1, HASH_N))
	return _bits_hex(g[:, 1:] > g[:, :-1])


def phash(rgb):
	g = _gray(rgb, (HASH_N * 4, HASH_N * 4))
	low = (_DCT @ g @ _DCT.T)[:HASH_N, :HASH_N]
	return _bits_hex(low > np.median(low))


def hist(rgb):
	q = (rgb.astype(np.uint16) * HIST_BINS // 256).reshape(-1, 3)
	idx = (q[:, 0] * HIST_BINS + q[:, 1]) * HIST_BINS + q[:, 2]
	h = np.bincount(idx, minlength=HIST_BINS ** 3).astype(np.float64)
	return [round(x, 5) for x in (h / h.sum())]


def features(rgb, mirror=False):
	"""stored features of a frame (+ 'std' of the grey picture: flat frames are left out of the time search); mirror=True adds
	those of the left-right mirrored frame under 'mirror' (only for the Short being checked — a flipped copy of an earlier
	frame 0 is still a copy)."""
	m = masked(rgb)
	f = {'dhash': dhash(m), 'phash': phash(m), 'hist': hist(m), 'std': round(float(m.mean(axis=2).std()), 1)}
	if mirror:
		f['mirror'] = features(np.ascontiguousarray(rgb[:, ::-1]))
	return f


def sample(video, mirror=False, grid=False):
	"""{t: (rgb at t or None, [(dt, features), …])} for t in TIMES. The frames cover [t, t + SHIFT_MAX]: every frame at
	STRIP_FPS for the Short being checked (grid=False, with mirror), one every SHIFT_STEP s for the registry (grid=True)."""
	step = max(1, int(round(SHIFT_STEP * STRIP_FPS))) if grid else 1
	out = {}
	for t in TIMES:
		ims = grab_strip(video, t)
		out[t] = (ims[0] if ims else None, [(round(i / STRIP_FPS, 3), features(ims[i], mirror)) for i in range(0, len(ims), step)])
	return out


def entry_window(e, t):
	"""[(dt, features)] of a registry entry around the moment t: the frame at t (dt 0) and its time strip over (t, t + SHIFT_MAX]
	(entries registered before the strip existed have only dt 0)."""
	out = [(0.0, f) for f in e.get('frames', []) if abs(f.get('t', -9) - t) < 1e-6]
	out += [(round(s['t'] - t, 3), s) for s in e.get('strip', []) if t + 1e-6 < s.get('t', -9) <= t + SHIFT_MAX + 1e-6]
	return out


def _ham(a, b):
	return bin(int(a, 16) ^ int(b, 16)).count('1') / (len(a) * 4)


def parts(fa, fb):
	"""(dHash, pHash, Hellinger) distances, each 0–1."""
	p, q = np.asarray(fa['hist']), np.asarray(fb['hist'])
	hel = float(np.sqrt(max(0.0, 1.0 - float(np.sum(np.sqrt(p * q))))))
	return _ham(fa['dhash'], fb['dhash']), _ham(fa['phash'], fb['phash']), hel


def compare(new, old):
	"""{'D', 'struct', 'parts', 'mirrored'} of the new frame (or its mirror, whichever is closer) against a registry frame."""
	best = None
	for cand, mir in ((new, False), (new.get('mirror'), True)):
		if not cand:
			continue
		ps = parts(cand, old)
		r = {'D': W_DHASH * ps[0] + W_PHASH * ps[1] + W_HIST * ps[2], 'struct': (ps[0] + ps[1]) / 2, 'parts': ps, 'mirrored': mir}
		if best is None or r['D'] < best['D']:
			best = r
	return best


def _flat(f):
	return f.get('std', 255.0) < FLAT_STD


def compare_window(new, old):
	"""closest pair between the frames of the checked Short over [t, t + SHIFT_MAX] and those of a registry entry over the same
	span (time search: a copy trimmed or padded by up to SHIFT_MAX s still meets its original). Adds 'shift' = old dt − new dt:
	> 0 — this Short starts later in the earlier Short's shot (trimmed), < 0 — it has a lead-in. The exact pair (dt 0 / 0) always
	counts; flat frames (black, white, one colour: grey std < FLAT_STD) only there. 'struct' is the lowest structure distance of
	all pairs (with its own shift 'struct_shift'), so a regrade of a shifted frame is caught too. None when a side is empty."""
	best = bs = None
	for dn, fn in new:
		for do, fo in old:
			if (dn or do) and (_flat(fn) or _flat(fo)):
				continue
			c = compare(fn, fo)
			c['shift'] = round(do - dn, 3)
			if best is None or c['D'] < best['D'] - 1e-9 or (abs(c['D'] - best['D']) <= 1e-9 and abs(c['shift']) < abs(best['shift'])):
				best = c
			if bs is None or c['struct'] < bs[0] - 1e-9:
				bs = (c['struct'], c['shift'])
	if best is None:
		return None
	best = dict(best)
	best['struct'], best['struct_shift'] = bs
	return best


def verdict(c):
	"""'ERROR' (near-identical), 'WARNING' (very similar) or '' for a frame-0 comparison."""
	if c['D'] <= ERR_D or c['struct'] <= STRUCT_ERR:
		return 'ERROR'
	return 'WARNING' if c['D'] <= WARN_D else ''


# ---------------------------------------------------------------- EDIT_PLAN text
def plan_lines(text):
	"""{'idea': str|None, 'frame0': str|None} from the EDIT_PLAN header: a line starting with the label, or a « · »-field."""
	out = {'idea': None, 'frame0': None}
	for line in text.splitlines():
		if line.lstrip().startswith('|'):
			continue                                    # table rows («кадр 0 = …» in the «Зачем» column) are not the header
		for key, lab in LABELS.items():
			if out[key] is not None:
				continue
			m = re.search(r'(?:^|·)\s*[-*]?\s*\**' + lab + r'\**\s*:\s*\**\s*(.*)', line, re.I)
			if m:
				val = re.split(r'\s+·\s+', m.group(1))[0].strip().strip('*').strip()
				out[key] = val
	return out


def is_placeholder(s):
	return s is None or not s.strip() or bool(re.search(r'<[^>]*>', s)) or re.fullmatch(r'[\s.…—–-]*', s) is not None


def stems(s, drop_identity=False):
	"""normalised word stems: lowercase, ё → е, words ≥ 3 letters, stop words out, first 5 letters (crude Russian stemming)."""
	s = (s or '').lower().replace('ё', 'е')
	out = set()
	for w in re.findall(r'[a-zа-я0-9]+', s):
		if len(w) < 3 or w in STOP or w.startswith(STOP_PREFIX):
			continue
		if drop_identity and w.startswith(IDENTITY):
			continue
		out.add(w[:5])
	return out


def text_sim(a, b, key='frame0'):
	"""Dice similarity of the stem sets; «Визуальная идея» drops channel-identity words (Atlas, финал, субтитры …), «Кадр 0»
	keeps them (Atlas in frame 0 is a frame-0 type)."""
	A, B = stems(a, key == 'idea'), stems(b, key == 'idea')
	return 0.0 if not A or not B else 2 * len(A & B) / (len(A) + len(B))


# ---------------------------------------------------------------- registry
def load_registry(reg_dir):
	f = reg_dir / 'registry.json'
	if not f.exists():
		return {'about': ABOUT, 'version': 1, 'features': dict(FEATURES), 'entries': []}
	try:
		r = json.loads(f.read_text(encoding='utf-8'))
	except (OSError, ValueError) as e:
		raise SystemExit('registry %s unreadable: %s' % (f, e))
	ft = r.get('features', {})
	# version 1 (no time strip) has the same per-frame features: its entries still compare at dt 0; --register adds the strip
	if ft.get('version') not in (1, FEATURES['version']) or any(ft.get(k) != FEATURES[k] for k in ('size', 'mask_y', 'dhash', 'phash', 'hist_bins')):
		raise SystemExit('registry %s was made with other features (%s) — re-register its entries' % (f, ft))
	return r


def save_registry(reg_dir, reg):
	reg_dir.mkdir(parents=True, exist_ok=True)
	reg['entries'].sort(key=order_key)
	reg = {'about': ABOUT, **{k: v for k, v in reg.items() if k != 'about'}}
	fd, tmp = tempfile.mkstemp(dir=str(reg_dir), suffix='.tmp')
	with os.fdopen(fd, 'w', encoding='utf-8') as fh:
		json.dump(reg, fh, ensure_ascii=False, indent=1)
		fh.write('\n')
	os.chmod(tmp, 0o644)
	os.replace(tmp, reg_dir / 'registry.json')


def order_key(e):
	return (e.get('date', ''), e.get('registered', ''))


def entry_id(slug, variant):
	return slug + ('_' + variant if variant else '')


def window_entries(reg, channel, slug, n):
	same = [e for e in reg['entries'] if e.get('channel') == channel and e.get('slug') != slug]
	return sorted(same, key=order_key)[-n:][::-1] if n > 0 else []   # newest first


# ---------------------------------------------------------------- sheet
def sheet(path, new_frames, label, entries, reg_dir):
	"""new Short (row 1, frames 0/1/2 s) above the window entries (frames 0/1/2 s from the registry thumbnails)."""
	w, h, pad = TW // 2, TH // 2, 22
	rows = [(label, [new_frames[t][0] for t in TIMES])]
	for e in entries:
		ims = []
		by_t = {round(f.get('t', -9), 2): f for f in e.get('frames', [])}
		for t in TIMES:
			fr = by_t.get(round(t, 2)) or {}
			p = reg_dir / fr.get('thumb', '')
			ims.append(np.asarray(Image.open(p).convert('RGB')) if fr.get('thumb') and p.is_file() else None)
		rows.append(('%s · %s · %s' % (e['slug'], e.get('date', '?'), e.get('status', '')), ims))
	img = Image.new('RGB', (len(TIMES) * w, len(rows) * (h + pad)), (24, 24, 24))
	d = ImageDraw.Draw(img)
	for i, (name, ims) in enumerate(rows):
		y = i * (h + pad)
		d.text((4, y + 5), name, fill=(255, 216, 74) if i == 0 else (230, 230, 230))
		for j, a in enumerate(ims[:len(TIMES)]):
			if a is not None:
				img.paste(Image.fromarray(a).resize((w, h), Image.Resampling.LANCZOS), (j * w, y + pad))
		y0 = MASK_Y[0] / 1920 * h + y + pad
		y1 = MASK_Y[1] / 1920 * h + y + pad
		d.line([(0, y0), (img.width, y0)], fill=(90, 90, 90))
		d.line([(0, y1), (img.width, y1)], fill=(90, 90, 90))
	Path(path).parent.mkdir(parents=True, exist_ok=True)
	img.save(path, quality=85)


# ---------------------------------------------------------------- modes
def read_plan(args):
	plan = Path(args.plan) if args.plan else ROOT.parent / 'EDIT_PLAN.md'
	lines = plan_lines(plan.read_text(encoding='utf-8')) if plan.exists() else {'idea': None, 'frame0': None}
	if args.idea is not None:
		lines['idea'] = args.idea
	if args.frame0 is not None:
		lines['frame0'] = args.frame0
	return plan, lines


def text_findings(lines, entries, plan, missing_is_error=False):
	"""(errors, warnings, ok) for the two EDIT_PLAN lines; a missing line is an error before the render (--plan-only, check.mjs)
	and a warning in the post-render check (qa.sh)."""
	errs, warns, oks = [], [], []
	names = {'idea': 'Визуальная идея', 'frame0': 'Кадр 0'}
	for key in ('idea', 'frame0'):
		if is_placeholder(lines[key]):
			(errs if missing_is_error else warns).append('EDIT_PLAN: line «%s: …» missing or still a template placeholder (%s) — mandatory (standard 4.1 H14, 9C)' % (names[key], plan))
	best = []
	for e in entries:
		for key in ('idea', 'frame0'):
			if is_placeholder(lines[key]) or not e.get(key):
				continue
			s = text_sim(lines[key], e[key], key)
			best.append((s, key, e))
			if s >= TEXT_WARN:
				warns.append('«%s» too close to %s (%s): similarity %.2f ≥ %.2f — «%s» vs «%s»' % (
					names[key], e['slug'], e.get('date', '?'), s, TEXT_WARN, lines[key], e[key]))
	if best:
		s, key, e = max(best, key=lambda x: x[0])
		if s < TEXT_WARN:
			oks.append('EDIT_PLAN lines differ from the last %d Shorts (closest: «%s» of %s, similarity %.2f < %.2f)' % (
				len(entries), names[key], e['slug'], s, TEXT_WARN))
	return errs, warns, oks


def previous_note(lines, entries):
	if not entries:
		return []
	e = entries[0]
	return ['previous Short on the channel: %s (%s, %s)' % (e['slug'], e.get('date', '?'), e.get('status', '')),
		'  its  «Визуальная идея: %s» / «Кадр 0: %s»' % (e.get('idea', '—'), e.get('frame0', '—')),
		'  this «Визуальная идея: %s» / «Кадр 0: %s»' % tuple('—' if is_placeholder(lines.get(k)) else lines[k] for k in ('idea', 'frame0')),
		'  → QA D2 (manual): frame-0 type (H14: who + material, always inside H1) and main visual device must differ from the previous Short']


def ctx(args, project):
	slug = args.slug or project.get('slug') or ''
	channel = args.channel or project.get('channel') or ''
	n = args.window if args.window is not None else int((project.get('variety') or {}).get('window', WINDOW))
	reg_dir = Path(args.registry) if args.registry else default_registry(project)
	return slug, channel, n, reg_dir


def cmd_plan_only(args, project):
	slug, channel, n, reg_dir = ctx(args, project)
	plan, lines = read_plan(args)
	res = {'errors': [], 'warnings': [], 'ok': [], 'info': []}
	if slug == DEMO_SLUG and not args.slug:
		res['info'].append('template demo: EDIT_PLAN lines «Визуальная идея» / «Кадр 0» not compared (slug %s)' % DEMO_SLUG)
	else:
		reg = load_registry(reg_dir)
		entries = window_entries(reg, channel, slug, n)
		e, w, o = text_findings(lines, entries, plan, missing_is_error=True)
		res['errors'] += e
		res['warnings'] += w
		res['ok'] += o
		if not entries:
			res['ok'].append('feed variety: no earlier Short of channel «%s» in %s' % (channel, reg_dir))
		res['info'] += previous_note(lines, entries)
	if args.json:
		print(json.dumps(res, ensure_ascii=False))
	else:
		for m in res['errors']:
			print('ERROR', m)
		for m in res['warnings']:
			print('WARNING', m)
		for m in res['ok'] + res['info']:
			print('OK' if m in res['ok'] else '  ', m)
	return 1 if res['errors'] else 0


def _fmt_cmp(c):
	"""'0.012', '0.012m' (mirrored), '0.031@+0.10' (time shift, s)."""
	return '%.3f%s%s' % (c['D'], 'm' if c['mirrored'] else '', '@%+.2f' % c['shift'] if c.get('shift') else '')


def _why(c):
	sh = c.get('shift') or 0.0
	return 'D %.3f, dHash %.2f, pHash %.2f, colour %.2f%s%s' % (c['D'], *c['parts'], ', mirrored' if c['mirrored'] else '',
		'' if not sh else ', time shift %+.2f s (%s)' % (sh, 'this Short starts %.2f s later in that shot' % sh if sh > 0
			else 'this Short has a %.2f s lead-in' % -sh))


def cmd_check(args, project):
	slug, channel, n, reg_dir = ctx(args, project)
	if slug == DEMO_SLUG and not args.slug:
		print('PASS variety: template demo (slug %s) is never compared or registered' % DEMO_SLUG)
		return 0
	video = Path(args.video) if args.video else default_video(project)
	if not video.exists():
		print('FAIL variety: video not found: %s' % video)
		return 2
	plan, lines = read_plan(args)
	reg = load_registry(reg_dir)
	entries = window_entries(reg, channel, slug, n)
	frames = sample(video, mirror=True)
	print('variety check: %s · slug %s · channel %s · window %d · registry %s → %s' % (video, slug, channel, n, reg_dir,
		', '.join('%s (%s)' % (e['slug'], e.get('date', '?')) for e in entries) or 'no earlier Short of this channel'))
	errors, warns, oks, info = [], [], [], []
	if frames[0.0][0] is None:
		print('FAIL variety: cannot read frame 0 of %s' % video)
		return 2
	nearest = None
	f0_flag = False
	for e in entries:
		if not e.get('strip'):
			info.append('%s has no time strip (registered with features v1): compared at the exact moments only — re-register it '
				'(--register) for the ±%.1f s search' % (e['slug'], SHIFT_MAX))
		row = []
		for t in TIMES:
			c = compare_window(frames[t][1], entry_window(e, t))
			if c is None:
				row.append('  —  ')
				continue
			v = verdict(c)
			row.append(_fmt_cmp(c))
			if t == 0.0:
				if nearest is None or c['D'] < nearest[0]['D']:
					nearest = (c, e)
				if v == 'ERROR':
					f0_flag = True
					errors.append('frame 0 near-identical to %s (%s, %s): %s; structure %.3f (ERROR: D ≤ %.2f or structure ≤ %.2f) — new '
						'frame 0 needed (standard 4.1 H14)' % (e['slug'], e.get('date', '?'), e.get('video', ''), _why(c), c['struct'], ERR_D, STRUCT_ERR))
				elif v == 'WARNING':
					f0_flag = True
					warns.append('frame 0 very similar to %s (%s): %s ≤ %.2f — change the frame-0 type or write the reason into '
						'the QA verdict (D1)' % (e['slug'], e.get('date', '?'), _why(c), WARN_D))
			elif v == 'ERROR':
				warns.append('frame at %.1f s near-identical to %s at %.1f s: %s — same opening device (4.2 R-13)' % (
					t, e['slug'], t, _why(c)))
		print('  D at %s s vs %-16s %s' % ('/'.join('%.0f' % t for t in TIMES), e['slug'], '  '.join(row)))
	e2, w2, o2 = text_findings(lines, entries, plan)
	errors += e2
	warns += w2
	oks += o2
	if nearest:
		c, e = nearest
		msg = 'frame 0: nearest %s D %.3f%s (ERROR ≤ %.2f, WARNING ≤ %.2f; time search ±%.1f s)' % (e['slug'], c['D'],
			' @%+.2f s' % c['shift'] if c.get('shift') else '', ERR_D, WARN_D, SHIFT_MAX)
		(info if f0_flag else oks).insert(0, msg)
	for m in previous_note(lines, entries):
		print(m)
	if args.sheet:
		sheet(args.sheet, frames, '%s (this Short)' % slug, entries, reg_dir)
		print('sheet → %s' % args.sheet)
	for m in errors:
		print('ERROR', m)
	for m in warns:
		print('WARNING', m)
	for m in info:
		print('INFO', m)
	for m in oks:
		print('OK', m)
	if errors:
		print('FAIL variety: %d ERROR, %d WARNING (registry %s)' % (len(errors), len(warns), reg_dir))
		return 1
	if warns:
		print('WARN variety: %d WARNING — write the reason into <slug>_QA.md (9E D1–D3)' % len(warns))
		return 0
	print('PASS variety: %s' % ('; '.join(oks) if oks else 'nothing to compare'))
	return 0


def cmd_register(args, project):
	slug, channel, n, reg_dir = ctx(args, project)
	variant = args.variant if args.variant is not None else os.environ.get('VARIANT', '')
	if not slug or not channel:
		print('register: slug and channel needed (project.json or --slug / --channel)')
		return 2
	if slug == DEMO_SLUG:
		print('register: the template demo (slug %s) is never registered' % DEMO_SLUG)
		return 2
	video = Path(args.video) if args.video else default_video(project)
	if not video.exists():
		print('register: video not found: %s' % video)
		return 2
	plan, lines = read_plan(args)
	missing = [k for k in ('idea', 'frame0') if is_placeholder(lines[k])]
	if missing:
		print('register: EDIT_PLAN %s has no %s — fill «Визуальная идея: …» / «Кадр 0: …» (or pass --idea / --frame0)' % (
			plan, ' and '.join({'idea': '«Визуальная идея»', 'frame0': '«Кадр 0»'}[k] for k in missing)))
		return 2
	frames = sample(video, grid=True)
	if frames[0.0][0] is None:
		print('register: cannot read frame 0 of %s' % video)
		return 2
	reg = load_registry(reg_dir)
	eid = entry_id(slug, variant)
	(reg_dir / 'thumbs').mkdir(parents=True, exist_ok=True)
	fr, strip = [], []
	for t in TIMES:
		rgb, grid = frames[t]
		if rgb is None:
			continue
		thumb = 'thumbs/%s_t%.1f.jpg' % (eid, t)
		Image.fromarray(rgb).save(reg_dir / thumb, quality=88)
		for dt, f in grid:
			if dt == 0:
				fr.append({'t': t, 'thumb': thumb, **f})
			else:
				strip.append({'t': round(t + dt, 3), **f})   # time strip (t, t + SHIFT_MAX]: features only, no thumbnail
	dur = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(video)],
		capture_output=True, text=True).stdout.strip()
	entry = {'id': eid, 'slug': slug, 'variant': variant or None, 'channel': channel,
		'date': args.date or datetime.date.today().isoformat(), 'status': args.status,
		'video': str(video.resolve()), 'duration': round(float(dur), 2) if re.fullmatch(r'[0-9.]+', dur or '') else None,
		'idea': lines['idea'].strip(), 'frame0': lines['frame0'].strip(), 'note': args.note or '',
		'registered': datetime.datetime.now().isoformat(timespec='seconds'), 'frames': fr, 'strip': strip}
	old = [e for e in reg['entries'] if e.get('id') == eid]
	reg['entries'] = [e for e in reg['entries'] if e.get('id') != eid] + [entry]
	reg['features'] = dict(FEATURES)
	save_registry(reg_dir, reg)
	left = [e['id'] for e in reg['entries'] if not e.get('strip')]
	if left:
		print('note: entries without a time strip (features v1, exact moments only): %s — re-register them' % ', '.join(left))
	print('%s %s (%s, %s, %s) → %s' % ('replaced' if old else 'registered', eid, channel, entry['date'], args.status, reg_dir / 'registry.json'))
	return 0


def cmd_unregister(args, project):
	_, _, _, reg_dir = ctx(args, project)
	reg = load_registry(reg_dir)
	gone = [e for e in reg['entries'] if e.get('id') == args.unregister or e.get('slug') == args.unregister]
	if not gone:
		print('unregister: no entry %s in %s' % (args.unregister, reg_dir))
		return 2
	for e in gone:
		for f in e.get('frames', []):
			p = reg_dir / f.get('thumb', '')
			if f.get('thumb') and p.is_file():
				p.unlink()
	reg['entries'] = [e for e in reg['entries'] if e not in gone]
	save_registry(reg_dir, reg)
	print('removed %s' % ', '.join(e['id'] for e in gone))
	return 0


def cmd_list(args, project):
	_, _, _, reg_dir = ctx(args, project)
	reg = load_registry(reg_dir)
	for e in sorted(reg['entries'], key=order_key, reverse=True):
		print('%-10s %-12s %-18s %-9s %s%s\n    idea: %s\n    frame 0: %s' % (e.get('date'), e.get('channel'), e['id'], e.get('status'),
			e.get('video'), '' if e.get('strip') else '  [no time strip: re-register]', e.get('idea'), e.get('frame0')))
	print('%d entries in %s' % (len(reg['entries']), reg_dir / 'registry.json'))
	return 0


def cmd_matrix(args, project):
	"""pairwise D (frame 0, and the 1 s / 2 s frames) with the time search — the calibration table. For videos, b (the later
	one) is the «checked» Short (every frame over [t, t + SHIFT_MAX], with mirror) and a the «registry» side (one frame every
	SHIFT_STEP s); for registry entries both sides are their stored frames + strips."""
	items = []
	if args.videos:
		for v in args.videos:
			dense = sample(v, mirror=True)
			step = max(1, int(round(SHIFT_STEP * STRIP_FPS)))
			items.append((Path(v).stem, {t: dense[t][1] for t in TIMES}, {t: dense[t][1][::step] for t in TIMES}))
	else:
		_, _, _, reg_dir = ctx(args, project)
		for e in sorted(load_registry(reg_dir)['entries'], key=order_key):
			w = {t: entry_window(e, t) for t in TIMES}
			items.append((e['id'], w, w))
	print('pairwise D = %.2f·dHash + %.2f·pHash + %.2f·Hellinger (subtitle band y %d–%d cut out, b mirrored when closer «m», '
		'time search ±%.1f s «@shift»); frame 0: ERROR D ≤ %.2f or structure ≤ %.2f, WARNING D ≤ %.2f' % (
		W_DHASH, W_PHASH, W_HIST, MASK_Y[0], MASK_Y[1], SHIFT_MAX, ERR_D, STRUCT_ERR, WARN_D))
	print('%-28s %-28s %12s %12s %12s   %s' % ('a', 'b', 'D 0 s', 'D 1 s', 'D 2 s', 'parts at 0 s (dHash pHash colour) struct'))
	rows = []
	for i in range(len(items)):
		for j in range(i + 1, len(items)):
			(na, _, ga), (nb, db, _) = items[i], items[j]
			cs = [compare_window(db[t], ga[t]) if db.get(t) and ga.get(t) else None for t in TIMES]
			rows.append((na, nb, cs))
	for na, nb, cs in sorted(rows, key=lambda r: (r[2][0]['D'] if r[2][0] else 9)):
		v = verdict(cs[0]) if cs[0] else ''
		print('%-28s %-28s %s   %s %s' % (na[:28], nb[:28], ' '.join('%12s' % (_fmt_cmp(c) if c else '—') for c in cs),
			'%.3f %.3f %.3f %.3f' % (*cs[0]['parts'], cs[0]['struct']) if cs[0] else '', v))
	if args.json:
		Path(args.json).write_text(json.dumps([{'a': a, 'b': b, 'times': list(TIMES), 'cmp': cs} for a, b, cs in rows], indent=1))
	return 0


def main():
	ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
	ap.add_argument('video', nargs='?', help='rendered Short (default out/FINAL/<stem>_yt.mp4, else <out_name>)')
	ap.add_argument('--register', action='store_true', help='append / replace this Short in the registry (step 9F)')
	ap.add_argument('--unregister', metavar='SLUG', help='remove an entry (id or slug) and its thumbnails')
	ap.add_argument('--list', action='store_true')
	ap.add_argument('--matrix', nargs='*', metavar='VIDEO', dest='videos', default=None, help='pairwise distance table')
	ap.add_argument('--plan-only', action='store_true', help='only the EDIT_PLAN lines (no video)')
	ap.add_argument('--json', nargs='?', const=True, default=None, help='--plan-only: JSON to stdout; --matrix: JSON file')
	ap.add_argument('--registry', help='registry folder (default $VARIETY_REGISTRY, else <library_root>/06_Exports/_variety_registry)')
	ap.add_argument('--slug'), ap.add_argument('--channel'), ap.add_argument('--variant')
	ap.add_argument('--window', type=int, help='last N Shorts of the channel (default project.variety.window or 5)')
	ap.add_argument('--plan', help='EDIT_PLAN.md (default ../EDIT_PLAN.md)')
	ap.add_argument('--idea', help='override «Визуальная идея»'), ap.add_argument('--frame0', help='override «Кадр 0»')
	ap.add_argument('--date', help='register: YYYY-MM-DD (default today)')
	ap.add_argument('--status', default='delivered', choices=['delivered', 'published'], help='register: default delivered')
	ap.add_argument('--note', help='register: free note')
	ap.add_argument('--sheet', help='check: write a comparison sheet (this Short above the window entries)')
	args = ap.parse_args()
	project = load_project()
	try:
		if args.unregister:
			return cmd_unregister(args, project)
		if args.list:
			return cmd_list(args, project)
		if args.videos is not None:
			if args.json is True:
				ap.error('--matrix --json needs a file name')
			return cmd_matrix(args, project)
		if args.plan_only:
			return cmd_plan_only(args, project)
		if args.register:
			return cmd_register(args, project)
		return cmd_check(args, project)
	except SystemExit as e:
		if isinstance(e.code, str):
			print('FAIL variety:', e.code)
			return 2
		raise


if __name__ == '__main__':
	sys.exit(main())
