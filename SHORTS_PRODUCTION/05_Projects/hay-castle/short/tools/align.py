"""Word timing: whisper.cpp word segments (-ml 1 -sow, DTW large.v3.turbo) + the waveform → data/words.json

Template version (SHORTS_PRODUCTION/04_Templates/remotion_short): per-project fixes come from project.json → "align"
(expand: whisper digits → script words, homophones: whisper token → script token, numwords, dtw_shift).
Adapted from ~/shorts/autokrise-2026-v2/tools/align.py for English:
  1. speech islands from a 10 ms RMS envelope (sound between pauses ≥ 110 ms) — exact in the waveform
  2. every word goes to the island that contains its DTW centre (monotonic)
  3. inside an island, boundaries by syllable share blended 50/50 with the DTW estimate
Then the words are checked against voiceover.txt (same tokens, same order) — mismatches abort.
  python3 tools/align.py  →  data/words.json
"""
import json, re, wave, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CFG = json.load(open(ROOT / 'project.json', encoding='utf-8')).get('align', {})
d = json.load(open(ROOT / 'data/whisper_words.json', encoding='utf-8'))
words = []
for seg in d['transcription']:
	txt = seg['text'].strip()
	if not txt or txt.startswith('['):
		continue
	toks = [t for t in seg['tokens'] if not t['text'].startswith('[') and t.get('t_dtw', -1) >= 0]
	dt = [t['t_dtw'] / 100 for t in toks] or [seg['offsets']['from'] / 1000]
	words.append({'w': txt, 'd0': dt[0], 'd1': dt[-1], 'f0': seg['offsets']['from'] / 1000, 'f1': seg['offsets']['to'] / 1000})

# a VO cut mid-phrase for a loop («…Because» | «This man…»): whisper may complete the phrase with a zero-length token at
# the very end of the file — drop it (project.json → align.drop_zero_tail)
if CFG.get('drop_zero_tail'):
	while len(words) > 1 and words[-1]['f1'] - words[-1]['f0'] < 0.02:
		print('dropped zero-length tail token', words[-1]['w'])
		words.pop()

# whisper writes spoken numbers as digits: expand them back into the script's words, time split evenly
EXPAND = CFG.get('expand', {})   # e.g. {'$10': ['ten', 'dollars'], '400': ['four', 'hundred']}
_ws = []
for wd in words:
	key = wd['w'].rstrip('.,?!')
	if key in EXPAND:
		parts = EXPAND[key]; n_ = len(parts)
		for j, part in enumerate(parts):
			k0, k1 = j / n_, (j + 1) / n_
			_ws.append({'w': part + (wd['w'][len(key):] if j == n_ - 1 else ''), 'd0': wd['d0'] + (wd['d1'] - wd['d0']) * k0,
				'd1': wd['d0'] + (wd['d1'] - wd['d0']) * k1, 'f0': wd['f0'] if j == 0 else wd['d0'] + (wd['d1'] - wd['d0']) * k0 - 0.3})
	else:
		_ws.append(wd)
words = _ws

w = wave.open(str(ROOT / 'data/vo16k.wav'))
sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
HOP = sr // 100
n = len(x) // HOP
rms = np.sqrt((x[:n * HOP].reshape(n, HOP) ** 2).mean(axis=1))
db = 20 * np.log10(rms + 1e-7)
db = np.convolve(db, np.ones(3) / 3, 'same')
floor = np.percentile(db, 8)
speechlvl = np.percentile(db, 70)
thr = floor + 0.30 * (speechlvl - floor)
voiced = db > thr
isl = []
k = 0
while k < n:
	if voiced[k]:
		a = k
		while k < n and voiced[k]:
			k += 1
		isl.append([a, k])
	else:
		k += 1
merged = []
for a, b in isl:
	if merged and a - merged[-1][1] < 11:
		merged[-1][1] = b
	else:
		merged.append([a, b])
islands = [(a / 100, b / 100) for a, b in merged if b - a >= 4]
print(f'{len(islands)} speech islands, threshold {thr:.1f} dB (floor {floor:.1f}, speech {speechlvl:.1f})')

NUM = {}


def syllables(word):
	s = word.lower().strip('.,?!…')
	if s in NUM:
		return NUM[s]
	s = re.sub(r'[^a-z]', '', s)
	n = len(re.findall(r'[aeiouy]+', s))
	if s.endswith('e') and not s.endswith('le') and n > 1:
		n -= 1
	return max(1.0, n)


def island_of(t):
	best, bd = None, 1e9
	for k, (a, b) in enumerate(islands):
		dd = 0 if a <= t <= b else min(abs(t - a), abs(t - b))
		if dd < bd:
			best, bd = k, dd
	return best


# DTW sits late on this take (≈ +0.3 s vs. the waveform): use the token centre shifted back
for wd in words:
	wd['isl'] = island_of((wd['d0'] + wd['d1']) / 2 - CFG.get('dtw_shift', 0.25))
for i in range(1, len(words)):
	if words[i]['isl'] < words[i - 1]['isl']:
		words[i]['isl'] = words[i - 1]['isl']
groups = {}
for i, wd in enumerate(words):
	groups.setdefault(wd['isl'], []).append(i)

for k, idx in groups.items():
	a, b = islands[k]
	syl = [syllables(words[i]['w']) for i in idx]
	tot = sum(syl)
	acc = 0
	for j, i in enumerate(idx):
		s_syl = a + (b - a) * acc / tot
		acc += syl[j]
		e_syl = a + (b - a) * acc / tot
		dur = e_syl - s_syl
		s_dtw = words[i]['d0'] - 0.30 - 0.25 * dur
		words[i]['s'] = 0.5 * s_syl + 0.5 * s_dtw if j > 0 else a
	for j, i in enumerate(idx):
		lo = a if j == 0 else words[idx[j - 1]]['s'] + 0.06
		hi = b - 0.06 * (len(idx) - j)
		words[i]['s'] = min(max(words[i]['s'], lo), max(lo, hi))
	for j, i in enumerate(idx):
		words[i]['e'] = words[idx[j + 1]]['s'] if j + 1 < len(idx) else b

# sentence-initial short words («They», «The», «Their», «In», «Part») sit right after a tightened 0.22 s pause: the island
# assignment can glue them to the end of the previous sentence → trust whisper's segment start for them (10 ms, accurate here)
for i in range(1, len(words)):
	wd = words[i]
	if wd['w'][:1].isupper() and wd['f0'] - wd['s'] > 0.15:
		wd['s'] = wd['f0']
		words[i - 1]['e'] = min(words[i - 1]['e'], wd['s'])
		if i + 1 < len(words):
			nx = words[i + 1]
			nx['s'] = max(nx['s'], min(nx['f0'], wd['s'] + 0.25), wd['s'] + 0.1)
			wd['e'] = nx['s']
OVERRIDE = {int(k): v for k, v in CFG.get('override', {}).items()}
for i, t_ in OVERRIDE.items():
	words[i]['s'] = t_; words[i - 1]['e'] = min(words[i - 1]['e'], t_)
	words[i]['e'] = max(words[i]['e'], t_ + 0.1); words[i + 1]['s'] = max(words[i + 1]['s'], words[i]['e'])
for i in range(1, len(words)):   # keep the chain monotonic after the shifts
	words[i]['s'] = max(words[i]['s'], words[i - 1]['s'] + 0.06)
	words[i - 1]['e'] = min(max(words[i - 1]['e'], words[i - 1]['s'] + 0.06), words[i]['s'])
words[-1]['e'] = max(words[-1]['e'], words[-1]['s'] + 0.06)
# ---- check against the clean script text ----
def norm(t):
	return re.sub(r"[^a-z0-9']", '', t.lower().replace('’', "'"))

script = (ROOT.parent / 'voiceover.txt').read_text(encoding='utf-8')
stoks = [t for t in re.split(r'\s+|—|…', script) if norm(t)]
NUMWORDS = CFG.get('numwords', {})
wt = [norm(w['w']) for w in words]
# whisper homophones on this take (the voice says the script word; verified by ear in vo_check)
HOMO = CFG.get('homophones', {})
wt = [HOMO.get(t, t) for t in wt]
st = [NUMWORDS.get(norm(t), norm(t)) for t in stoks]
st = [t.replace(',', '') for t in st]
wt = [t.replace(',', '') for t in wt]
# whisper splits hyphenated script words («maximum-security» → maximum, security): merge neighbours that spell the script token
k = 0
while k < min(len(wt), len(st)):
	if wt[k] != st[k] and k + 1 < len(wt) and wt[k] + wt[k + 1] == st[k]:
		words[k]['e'] = words[k + 1]['e']; del words[k + 1]
		wt[k] += wt.pop(k + 1)
	k += 1
# whisper mixes guard / guards / guard's: a token that differs only by an apostrophe or a final «s» keeps the script spelling
def loose(t):
	return re.sub(r"s$", '', t.replace("'", ''))
for i, (p, q) in enumerate(zip(wt, st)):
	if p != q and loose(p) == loose(q):
		print(f'loose match at {i}: whisper «{p}» = script «{q}»')
		wt[i] = q
if wt != st:
	for i, (p, q) in enumerate(zip(wt, st)):
		if p != q:
			print('MISMATCH at', i, p, q)
			break
	print(len(wt), len(st))
	sys.exit(1)
# display text = script spelling (punctuation, "two"/"zero" as in the VO text), whisper only gives the times
out = []
for wd, disp in zip(words, stoks):
	out.append({'w': disp, 's': round(wd['s'], 3), 'e': round(wd['e'], 3)})
# short words after a pause («window — and walked») land in the island before the pause; the ElevenLabs character clock
# (vo_paid/tight.py *_words.json, project.json → align.el_words) puts them after it: move such a word to the voiced run it starts
ELW = CFG.get('el_words')
if ELW:
	el = json.load(open(ROOT.parent / ELW, encoding='utf-8'))
	if len(el) != len(out):
		print('el_words: word count differs, skipped')
	else:
		for i, (w_, e_) in enumerate(zip(out, el)):
			a, b = int(w_['s'] * 100), min(int(e_['s'] * 100), n)
			if e_['s'] - w_['s'] > 0.2 and b > a and (~voiced[a:b]).mean() > 0.5:
				k = b
				while k > a and voiced[k - 1]:
					k -= 1
				ns, dur = round(k / 100, 3), w_['e'] - w_['s']
				print(f'pause fix {i} «{w_["w"]}»: {w_["s"]:.2f} → {ns:.2f}')
				w_['s'], w_['e'] = ns, round(ns + max(dur, 0.08), 3)
				j = i + 1
				while j < len(out) and out[j]['s'] < out[j - 1]['e']:
					out[j]['s'] = out[j - 1]['e']; out[j]['e'] = round(max(out[j]['e'], out[j]['s'] + 0.08), 3); j += 1
json.dump(out, open(ROOT / 'data/words.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(out), 'words → data/words.json (all match voiceover.txt)')
for i, wd in enumerate(out):
	print(f"{i:3d} {wd['s']:7.2f} {wd['e']:7.2f}  {wd['w']}")
