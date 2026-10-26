"""Friend's voice-over (data/friend/friend_take.mp3, 21 phrases of ../voiceover.txt, ~0.5 s pauses) → data/vo_f.wav on the
v8 clock: every phrase starts where the same phrase starts in the v8 Silas take (waveform onsets), so the 13 Blender shots
keep their windows. A phrase longer than its v8 slot is sped up (atempo ≤ 1.08); what is still left pushes the next
phrase later (≥ 0.15 s pause), and the following phrases catch up on their own spare time.
Also writes data/vo16k.wav (whisper) and data/vo44k.wav (Rhubarb).
  python3 tools/fit_friend.py"""
import json, subprocess, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
V8_VO = ROOT.parent / 'vo_silas_v4_gen2_tight40_x112.wav'
TAKE = ROOT / 'data/friend/friend_take.mp3'
SR = 44100
GAP, MAXR, END = 0.15, 1.08, 36.7
# first word of each phrase (index in the v8 words.json) — one whisper segment of the friend's take each
P = [0, 10, 16, 21, 28, 35, 42, 46, 49, 53, 57, 60, 63, 66, 68, 76, 79, 83, 87, 89, 94]
# phrase starts in the friend's take (whisper segments; «In the end» = 28.28, whisper said 27.72)
F0 = [0.0, 4.0, 5.94, 8.3, 10.82, 13.3, 16.08, 18.02, 19.46, 21.16, 23.12, 24.44, 25.68, 27.08, 28.28, 31.12, 32.4, 34.5, 35.58, 36.7, 38.58]


def load(p):
	f = ROOT / 'out/.tmp_load.wav'
	subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-ar', str(SR), '-ac', '1', '-c:a', 'pcm_s16le', str(f)], check=True)
	w = wave.open(str(f))
	x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
	f.unlink()
	return x


def islands(x, thr_db=-42, minpause=0.11):
	hop = SR // 100
	n = len(x) // hop
	db = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
	on, isl, i = db > thr_db, [], 0
	while i < n:
		if on[i]:
			j = i
			while j < n and on[j]:
				j += 1
			if isl and i / 100 - isl[-1][1] < minpause:
				isl[-1][1] = j / 100
			else:
				isl.append([i / 100, j / 100])
			i = j
		else:
			i += 1
	return [r for r in isl if r[1] - r[0] >= 0.04]


def snap(t, isl, tol=0.7):
	r = min(isl, key=lambda r: abs(r[0] - t))
	return r[0] if abs(r[0] - t) < tol else t


def phrases(isl, starts, total):
	out = []
	for k, a in enumerate(starts):
		on = snap(a, isl)
		nxt = snap(starts[k + 1], isl) if k + 1 < len(starts) else total
		end = max(r[1] for r in isl if r[0] >= on - 0.01 and r[1] <= nxt + 0.01)
		out.append((on, end))
	return out


x8, xf = load(V8_VO), load(TAKE)
w8 = json.load(open(ROOT.parent / 'short/data/words.json'))
S8 = phrases(islands(x8), [w8[i]['s'] for i in P], len(x8) / SR)
FR = phrases(islands(xf), F0, len(xf) / SR)

buf = np.zeros(int((END + 1) * SR), np.float32)
pad = int(0.012 * SR)                      # keep 12 ms around each phrase (soft consonant edges), with 8 ms fades
log, prev_end = [], 0.0
for k, ((s_on, _), (f_on, f_end)) in enumerate(zip(S8, FR)):
	start = max(s_on, prev_end + GAP if k else s_on)
	slot_end = (S8[k + 1][0] - GAP) if k + 1 < len(S8) else END - 0.5
	dur = f_end - f_on
	r = min(MAXR, max(1.0, dur / max(0.1, slot_end - start)))
	clip = xf[max(0, int(f_on * SR) - pad): int(f_end * SR) + pad].copy()
	if r > 1.001:
		tmp_in, tmp_out = ROOT / 'out/.ph_in.wav', ROOT / 'out/.ph_out.wav'
		with wave.open(str(tmp_in), 'wb') as o:
			o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR)
			o.writeframes((np.clip(clip, -1, 1) * 32767).astype(np.int16).tobytes())
		subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp_in), '-af', f'atempo={r:.4f}', '-ar', str(SR), '-c:a', 'pcm_s16le', str(tmp_out)], check=True)
		w = wave.open(str(tmp_out))
		clip = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
		tmp_in.unlink(); tmp_out.unlink()
	f = int(0.008 * SR)
	clip[:f] *= np.linspace(0, 1, f)
	clip[-f:] *= np.linspace(1, 0, f)
	i0 = int(start * SR) - int(pad / r)
	buf[i0: i0 + len(clip)] += clip
	prev_end = start + dur / r
	log.append({'k': k + 1, 'word': w8[P[k]]['w'], 'v8_on': round(s_on, 3), 'start': round(start, 3), 'late': round(start - s_on, 3),
	            'dur': round(dur / r, 3), 'tempo': round(r, 3)})
buf = buf[: int(END * SR)]
with wave.open(str(ROOT / 'data/vo_f.wav'), 'wb') as o:
	o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR)
	o.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'data/vo_f.wav'), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', str(ROOT / 'data/vo16k.wav')], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'data/vo_f.wav'), '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', str(ROOT / 'data/vo44k.wav')], check=True)
json.dump(log, open(ROOT / 'data/friend/fit_log.json', 'w'), indent=1)
for e in log:
	print(f"{e['k']:2d} {e['word']:10s} v8 {e['v8_on']:6.2f} → {e['start']:6.2f} (late {e['late']:+.2f})  {e['dur']:.2f} s  tempo ×{e['tempo']}")
print(f'vo_f.wav {len(buf) / SR:.2f} s; last phrase ends {prev_end:.2f} s')
