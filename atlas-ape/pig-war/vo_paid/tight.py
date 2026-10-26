"""tighten a paid take exactly like the owner's chosen take (every pause → 0.22 s, 0.3–0.38 s kept after war / pig / no /
casualties) and carry the ElevenLabs character timestamps through the cuts → take_N_tight.wav + take_N_tight_words.json"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent
SR = 44100; GAP = 0.22; KEEP = {'war': 0.32, 'pig': 0.38, 'no': 0.3, 'casualties': 0.34}
text = (HERE.parent / 'voiceover.txt').read_text().strip()
spans = [(m.start(), m.end(), m.group()) for m in re.finditer(r'\S+', text)]
for n in sys.argv[1:]:
	src = HERE / f'take_{n}.mp3'; al = json.load(open(HERE / f'take_{n}.json'))
	cs, ce = al['character_start_times_seconds'], al['character_end_times_seconds']
	def core(a, b):
		idx = [i for i in range(a, b) if text[i].isalnum() or text[i] == '$']
		return idx[0], idx[-1]
	words = [[cs[core(a, b)[0]], ce[core(a, b)[1]], w] for a, b, w in spans]
	x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(src), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32).copy()
	hop = SR // 100; nf = len(x) // hop
	rms = np.sqrt(np.mean(x[:nf * hop].reshape(nf, hop) ** 2, axis=1) + 1e-12); db = 20 * np.log10(rms / rms.max())
	quiet = db < -40.0; sil = []; i = 0
	while i < nf:
		if quiet[i]:
			j = i
			while j < nf and quiet[j]: j += 1
			if i > 0 and j < nf: sil.append((i * hop / SR, j * hop / SR))
			i = j
		else: i += 1
	cuts = []
	# never cut into a word: clip every detected silence to the gaps between the ElevenLabs word spans (soft «So» etc.)
	clipped = []
	for s, e in sil:
		for ws_, we_, _w in words:
			if ws_ - 0.04 < e and we_ + 0.04 > s:          # overlap
				if ws_ - 0.04 <= s: s = max(s, we_ + 0.04)
				else: e = min(e, ws_ - 0.04)
		if e - s > 0.05: clipped.append((s, e))
	sil = clipped
	for s, e in sil:
		# which word ends right before this pause?
		prev = [w for w in words if w[1] <= s + 0.12]
		key = re.sub(r'[^a-z]', '', prev[-1][2].lower()) if prev else ''
		target = KEEP.get(key, GAP) if prev and re.search(r'[.?:]$', prev[-1][2]) or key in KEEP else GAP
		if e - s <= target + 0.02: continue
		cuts.append((s + target / 2, e - target / 2))
	XF = int(0.02 * SR); out, pos = [], 0
	for a, b in cuts:
		ia, ib = int(a * SR), int(b * SR)
		seg = x[pos:ia + XF].copy()
		if out:
			fade = np.linspace(0, 1, XF, dtype=np.float32); out[-1][-XF:] = out[-1][-XF:] * (1 - fade) + seg[:XF] * fade; seg = seg[XF:]
		out.append(seg); pos = ib
	seg = x[pos:].copy()
	if out:
		fade = np.linspace(0, 1, XF, dtype=np.float32); out[-1][-XF:] = out[-1][-XF:] * (1 - fade) + seg[:XF] * fade; seg = seg[XF:]
	out.append(seg); y = np.concatenate(out)
	def remap(t):
		d = 0.0
		for a, b in cuts:
			if t >= b: d += b - a
			elif t > a: d += t - a
		return t - d
	tw = [{'w': w, 's': round(remap(s), 3), 'e': round(remap(e), 3)} for s, e, w in words]
	subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', str(HERE / f'take_{n}_tight.wav')], input=y.tobytes(), check=True)
	json.dump(tw, open(HERE / f'take_{n}_tight_words.json', 'w'), indent=0)
	print(f'take {n}: {len(x)/SR:.2f} → {len(y)/SR:.2f} s, {len(cuts)} pauses cut, speech ends {tw[-1]["e"]:.2f}')
