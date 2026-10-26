"""v6 hybrid sound: the v4 render's own audio (out/hybrid/v4_audio.wav) up to the seam, the current mix (out/sound/final_mix.wav,
from tools/mix.py) after it, 40 ms linear crossfade at the seam (the VO and music are the same source in both, sample-aligned),
then a peak limiter and a single gain trim so the whole track sits at −14 LUFS with true peak ≤ −1 dBTP. Overwrites out/sound/final_mix.wav
(the pure v5 mix is kept as out/sound/final_mix_v5.wav).
  python3 tools/hybrid_audio.py [seam_seconds]"""
import json, subprocess, sys, shutil
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
W = json.load(open(ROOT / 'data/words.json'))
SEAM = float(sys.argv[1]) if len(sys.argv) > 1 else W[55]['s'] + 0.1
SR = 48000
snd = ROOT / 'out/sound'
shutil.copy(snd / 'final_mix.wav', snd / 'final_mix_v5.wav')
def load(p):
	raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
	return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
a = load(ROOT / 'out/hybrid/v4_audio.wav')
b = load(snd / 'final_mix_v5.wav')
n = min(len(a), len(b))
a, b = a[:n], b[:n]
s0 = int(SEAM * SR); L = int(0.04 * SR)
k = np.zeros(n, np.float32); k[s0 + L:] = 1
k[s0:s0 + L] = np.linspace(0, 1, L, dtype=np.float32)
out = a * (1 - k)[:, None] + b * k[:, None]        # linear: both sides carry the same (correlated) VO + music
tmp = snd / 'hybrid_raw.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-c:a', 'pcm_f32le', str(tmp)], input=out.astype(np.float32).tobytes(), check=True)
def measure(p):
	r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
	I = float(r.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0])
	TP = float(r.split('True peak:')[1].split('Peak:')[1].split('dBFS')[0])
	return I, TP
lim = snd / 'hybrid_lim.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', 'alimiter=limit=0.79:attack=2:release=60:level=false', '-c:a', 'pcm_f32le', str(lim)], check=True)
I, TP = measure(lim)
g = min(-14.0 - I, -1.05 - TP)
tmp = lim
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', f'volume={g:.2f}dB', '-c:a', 'pcm_s16le', '-ar', str(SR), str(snd / 'final_mix.wav')], check=True)
I2, TP2 = measure(snd / 'final_mix.wav')
print(f'hybrid audio: seam {SEAM:.2f} s, gain {g:+.2f} dB → {I2:.1f} LUFS, true peak {TP2:.1f} dBTP')
