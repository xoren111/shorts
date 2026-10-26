"""Final sound mix → out/sound/final_mix.wav (48 kHz stereo, −14 LUFS integrated, true peak ≤ −1 dBTP)
  1. SFX stem from out/timeline.json (written by `node tools/check.mjs`): every cue at event time + `at`, gain dB,
     optional `from` / `dur` cut with short fades → out/sound/sfx.wav
  2. music.mp3 («Frame-Dragging», The Grey Room / Density & Time): −21.6 dB, fade-in 0.5 s from 0, fade-out 0.3 s on
     the word «Final», then silence; sidechain-ducked by the voice (threshold 0.02, ratio 10, attack 15 ms, release 400 ms)
     — the channel's reference settings
  3. voice (vo_silas_v4_gen1.mp3) untouched; SFX gently ducked under the voice (ratio 2.5) so words stay clear
  4. two-pass loudnorm to −14 LUFS / −1.5 dBTP (linear), verified with ebur128
  python3 tools/mix.py
"""
import json, subprocess, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
VOL = ROOT.parent
SR = 48000
OUT = ROOT / 'out/sound'
OUT.mkdir(parents=True, exist_ok=True)
tl = json.load(open(ROOT / 'out/timeline.json'))
DUR = tl['duration']
words = json.load(open(ROOT / 'data/words.json'))
FINAL = words[138]['s']


def read_wav(p):
	w = wave.open(str(p))
	n, ch, sw = w.getnframes(), w.getnchannels(), w.getsampwidth()
	assert w.getframerate() == SR and sw == 2, p
	x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
	x = x.reshape(-1, ch)
	if ch == 1:
		x = np.repeat(x, 2, axis=1)
	return x


cache = {}
buf = np.zeros((int((DUR + 1) * SR), 2), np.float32)
n_cues = 0
for e in tl['events']:
	for s in e.get('sfx', []):
		p = ROOT / 'public/sfx' / f"{s['name']}.wav"
		if p not in cache:
			cache[p] = read_wav(p)
		x = cache[p]
		a = int(round(s.get('from', 0) * SR))
		b = len(x) if 'dur' not in s else min(len(x), a + int(round(s['dur'] * SR)))
		x = x[a:b].copy()
		fi, fo = min(len(x) // 4, int(0.004 * SR) if a == 0 else int(0.03 * SR)), min(len(x) // 3, int(0.12 * SR))
		if fi > 0:
			x[:fi] *= np.linspace(0, 1, fi)[:, None]
		if 'dur' in s and fo > 0:
			x[-fo:] *= np.linspace(1, 0, fo)[:, None]
		x *= 10 ** (s['gain'] / 20)
		t0 = e['t'] + s.get('at', 0)
		i0 = int(round(t0 * SR))
		if i0 < 0:
			x = x[-i0:]
			i0 = 0
		i1 = min(len(buf), i0 + len(x))
		buf[i0:i1] += x[: i1 - i0]
		n_cues += 1
buf = buf[: int(DUR * SR)]
peak = float(np.abs(buf).max())
print(f'SFX stem: {n_cues} cues, peak {20 * np.log10(peak + 1e-9):.1f} dBFS')
if peak > 0.98:
	buf *= 0.98 / peak
pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
with wave.open(str(OUT / 'sfx.wav'), 'wb') as w:
	w.setnchannels(2)
	w.setsampwidth(2)
	w.setframerate(SR)
	w.writeframes(pcm.tobytes())

graph = (
	f"[0:a]aresample={SR},pan=stereo|c0=c0|c1=c0,apad,atrim=0:{DUR},asplit=3[vo][sc1][sc2];"
	f"[1:a]aresample={SR},atrim=0:{DUR},volume=-21.6dB,afade=t=in:st=0:d=0.5,afade=t=out:st={FINAL:.3f}:d=0.3,apad,atrim=0:{DUR}[m];"
	f"[m][sc1]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=400[md];"
	f"[2:a]aresample={SR},apad,atrim=0:{DUR}[s];"
	f"[s][sc2]sidechaincompress=threshold=0.05:ratio=2.5:attack=10:release=250[sd];"
	f"[vo][md][sd]amix=inputs=3:normalize=0:dropout_transition=0[mix]"
)
pre = OUT / 'premix.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(VOL / 'vo_silas_v4_gen1.mp3'), '-i', str(VOL / 'music.mp3'), '-i', str(OUT / 'sfx.wav'),
                '-filter_complex', graph, '-map', '[mix]', '-c:a', 'pcm_f32le', str(pre)], check=True)
# music-only stem (same processing) for QA of the «≈14 dB under the voice» rule
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(VOL / 'vo_silas_v4_gen1.mp3'), '-i', str(VOL / 'music.mp3'),
                '-filter_complex', graph.split('[2:a]')[0].rstrip(';').replace('asplit=3[vo][sc1][sc2]', 'anull[sc1]'), '-map', '[md]', '-c:a', 'pcm_s16le', str(OUT / 'music_ducked.wav')], check=True)
# peak control on the premix (explosions) so the linear loudnorm can reach −14 LUFS under the true-peak ceiling
lim = OUT / 'premix_lim.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(pre), '-af', 'alimiter=limit=0.5:attack=2:release=60:level=false', '-c:a', 'pcm_f32le', str(lim)], check=True)
pre = lim
# loudnorm pass 1
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(pre), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
js = r.stderr[r.stderr.rindex('{'): r.stderr.rindex('}') + 1]
m = json.loads(js)
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
      f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=summary")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(pre), '-af', af + f',aresample={SR}', '-c:a', 'pcm_s16le', '-ar', str(SR), str(OUT / 'final_mix.wav')], check=True)
def measure(p):
	r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
	summ = r.stderr[r.stderr.rindex('Summary:'):]
	I = float(summ.split('I:')[1].split('LUFS')[0])
	TP = float(summ.split('Peak:')[1].split('dBFS')[0])
	return I, TP, summ
I, TP, _ = measure(OUT / 'final_mix.wav')
# final trim to exactly −14 LUFS when the true-peak ceiling (−1.0 dBTP) allows it
g = min(-14.0 - I, -1.05 - TP)
if abs(g) > 0.05:
	tmp = OUT / 'final_mix_tmp.wav'
	subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'final_mix.wav'), '-af', f'volume={g:.2f}dB', '-c:a', 'pcm_s16le', str(tmp)], check=True)
	tmp.replace(OUT / 'final_mix.wav')
I, TP, summ = measure(OUT / 'final_mix.wav')
print(f'final_mix.wav → {I:.1f} LUFS integrated, true peak {TP:.1f} dBTP')
