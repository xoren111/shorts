"""paid take (tightened) → the edit's clock: every sentence starts where the same sentence starts in the owner's chosen
free-plan take (short2/data/words.json), so the rendered Blender shots keep their windows. A sentence longer than its slot is
sped up (atempo ≤ 1.08); what is still left pushes the next one later (≥ 0.18 s pause). Shorter sentences keep their natural
pace (a longer pause follows). Writes ../vo_silas_paid_fit.wav and ../short2/data/words_vo.json (word times on the new audio)."""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent; ROOT = HERE.parent
N = int(sys.argv[1]) if len(sys.argv) > 1 else 1
SR, GAP, MAXR, END = 44100, 0.18, 1.08, 43.85
old = json.load(open(ROOT / 'short2/data/words.json'))
nw = json.load(open(HERE / f'take_{N}_tight_words.json'))
ss = json.load(open(HERE / 'pick.json'))['sent_start']
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(HERE / f'take_{N}_tight.wav'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, np.float32).copy()
buf = np.zeros(int((END + 1) * SR), np.float32)
pad = int(0.03 * SR); pre = int(0.1 * SR); out_words = [None] * len(nw); prev_end = 0.0; log = []
for k, a in enumerate(ss):
	b = (ss[k + 1] if k + 1 < len(ss) else len(nw)) - 1
	o_on = old[a]['s']
	start = max(o_on, prev_end + GAP) if k else o_on
	slot_end = (old[ss[k + 1]]['s'] - GAP) if k + 1 < len(ss) else END - 0.6
	n_on, n_end = nw[a]['s'], nw[b]['e']
	dur = n_end - n_on
	r = min(MAXR, max(1.0, dur / max(0.1, slot_end - start)))
	clip = x[max(0, int(n_on * SR) - pre): int(n_end * SR) + pad].copy()
	if r > 1.001:
		ti, to = HERE / '.in.wav', HERE / '.out.wav'
		with wave.open(str(ti), 'wb') as o:
			o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((np.clip(clip, -1, 1) * 32767).astype(np.int16).tobytes())
		subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ti), '-af', f'atempo={r:.4f}', '-ar', str(SR), '-c:a', 'pcm_s16le', str(to)], check=True)
		w = wave.open(str(to)); clip = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
		ti.unlink(); to.unlink()
	f = int(0.012 * SR); clip[:f] *= np.linspace(0, 1, f); clip[-f:] *= np.linspace(1, 0, f)
	i0 = int(start * SR) - int(pre / r)
	buf[max(0, i0): i0 + len(clip)] += clip[max(0, -i0):]
	for i in range(a, b + 1):
		out_words[i] = {'w': old[i]['w'], 's': round(start + (nw[i]['s'] - n_on) / r, 3), 'e': round(start + (nw[i]['e'] - n_on) / r, 3)}
	prev_end = start + dur / r
	log.append((old[a]['w'], round(o_on, 2), round(start, 2), round(start - o_on, 2), round(r, 3)))
buf = buf[: int(END * SR)]
with wave.open(str(ROOT / 'vo_silas_paid_fit.wav'), 'wb') as o:
	o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes())
json.dump(out_words, open(ROOT / 'short2/data/words_fit.json', 'w'), indent=0)
for row in log: print('%-10s old %6.2f → %6.2f  late %+.2f  ×%.3f' % row)
print('fitted VO', round(len(buf) / SR, 2), 's, speech ends', out_words[-1]['e'])
