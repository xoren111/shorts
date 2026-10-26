"""Text-clutter QA on the rendered video (STYLE.md rules 2 + 3), independent of the code:
OCR (Apple Vision, tools/ocr.swift) on frames every 0.5 s → for each frame: subtitle line(s), credit lines (small text) and
overlay elements. Flags
  DUP     an overlay token (word ≥ 3 letters or number, stopwords dropped, number words → digits) that the voice says
          within ±0.6 s or that the subtitle shows;
  CLUTTER more than one overlay element on screen.
  python3 tools/dupes.py [video]   → out/qa/dupes.json + summary (exit 1 if anything is flagged)"""
import json, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = json.load(open(ROOT / 'project.json', encoding='utf-8'))
video = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'out/FINAL' / (P.get('out_name') or P['slug'] + '.mp4')
BEATS = json.load(open(ROOT / 'out/timeline.json'))['beats']
words = json.load(open(ROOT / 'data/words.json'))
W = lambda i: words[i]['s']
ocr_bin = ROOT / 'out/.ocr'
if not ocr_bin.exists() or ocr_bin.stat().st_mtime < (ROOT / 'tools/ocr.swift').stat().st_mtime:
	subprocess.run(['swiftc', '-O', str(ROOT / 'tools/ocr.swift'), '-o', str(ocr_bin)], check=True)

STEP = 0.5
tmp = Path(tempfile.mkdtemp(prefix='dupes_', dir=ROOT / 'out'))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-vf', f'fps={1 / STEP}', '-start_number', '0', str(tmp / 'f_%04d.png')], check=True)
res = subprocess.run([str(ocr_bin), str(tmp)], capture_output=True, text=True, check=True).stdout
ocr = {json.loads(l)['file']: json.loads(l)['lines'] for l in res.splitlines() if l.strip()}
subprocess.run(['rm', '-rf', str(tmp)])

STOP = set('the a an and of to on in at for its it is was are be by with from that this than then but so we our us they them their not even way all out about very only just ago into over who what when where why how a.m p.m'.split())
NUMW = {'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10', 'hundred': '100'}


def toks(s):
	out = set()
	for w in re.findall(r"[A-Za-z']+|\d[\d,.]*", s):
		w = w.lower().strip("'")
		if not w:
			continue
		if w[0].isdigit():
			w = w.replace(',', '').rstrip('.')
			out.add(w)
			continue
		if w in NUMW:
			out.add(NUMW[w])
			continue
		if len(w) >= 3 and w not in STOP:
			out.add(w[:-1] if w.endswith('s') and len(w) > 4 else w)
	return out


def sub_y(t):
	"""subtitle centre y of the beat on screen (src/data/beats.ts subY, via out/timeline.json)"""
	y = 1300
	for b in BEATS:
		if t >= b['t0']:
			y = b['subY']
	return y


report = []
for k, f in enumerate(sorted(ocr)):
	t = round(k * STEP, 2)
	lines = [l for l in ocr[f] if l['conf'] >= 0.4 and len(l['text'].strip()) >= 2]
	sy = sub_y(t)
	subs, credits, over = [], [], []
	for l in lines:
		cy = l['y'] + l['h'] / 2
		if l['h'] < 34 or re.match(r'^(REAL PHOTO|Photo|Archive|Footage|Background)\b', l['text']) or re.search(r'CC BY|public domain|Commons|NASA|Archive|\bAI\b', l['text']):
			credits.append(l)
		elif abs(cy - sy) < 70 and abs(l['x'] + l['w'] / 2 - 540) < 260:
			subs.append(l)
		else:
			over.append(l)
	# merge overlay lines into elements (stacked lines of one label / board)
	els = []
	for l in sorted(over, key=lambda l: l['y']):
		for e in els:
			if l['y'] - (e['y'] + e['h']) < 1.2 * max(l['h'], 40) and not (l['x'] > e['x'] + e['w'] + 60 or e['x'] > l['x'] + l['w'] + 60):
				x0, y0 = min(e['x'], l['x']), min(e['y'], l['y'])
				x1, y1 = max(e['x'] + e['w'], l['x'] + l['w']), max(e['y'] + e['h'], l['y'] + l['h'])
				e.update(x=x0, y=y0, w=x1 - x0, h=y1 - y0, text=e['text'] + ' / ' + l['text'])
				break
		else:
			els.append(dict(l))
	spoken = set()
	for w in words:
		if w['e'] >= t - 0.6 and w['s'] <= t + 0.6:
			spoken |= toks(w['w'])
	subtok = set().union(*[toks(l['text']) for l in subs]) if subs else set()
	flags = []
	for e in els:
		# a key figure may repeat the VOICE while its subtitle steps aside (owner 18.10); never the subtitle on screen
		d = toks(e['text']) & (subtok if not subs else (spoken | subtok))
		if d:
			flags.append(f"DUP «{e['text']}» repeats {sorted(d)}")
	if len(els) > 1:
		flags.append('CLUTTER ' + ' | '.join(f"«{e['text']}»" for e in els))
	report.append({'t': t, 'subtitle': ' '.join(l['text'] for l in subs), 'overlays': [e['text'] for e in els], 'credits': [l['text'] for l in credits], 'flags': flags})

(ROOT / 'out/qa').mkdir(parents=True, exist_ok=True)
json.dump(report, open(ROOT / 'out/qa/dupes.json', 'w'), indent=1, ensure_ascii=False)
bad = [r for r in report if r['flags']]
for r in bad:
	print(f"{r['t']:6.2f}s  sub «{r['subtitle']}»  " + '; '.join(r['flags']))
print(f'{len(bad)} of {len(report)} frames flagged → out/qa/dupes.json')
sys.exit(1 if bad else 0)
