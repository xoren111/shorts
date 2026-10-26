"""Shorten long pauses in a voice-over take without touching the words.

usage: python3 tools/tighten.py IN.mp3 OUT.wav [--gap 0.22] [--keep "later:0.45,clocks:0.40,late:0.40"] [--words vo_check/genN.json]
Every silence longer than --gap is cut down to --gap (the cut is crossfaded, 20 ms). With --words (whisper -ojf JSON),
the pause right AFTER a listed word keeps the given length instead (punchline beats).
"""
import argparse, json, re, subprocess, sys
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--gap', type=float, default=0.22)
ap.add_argument('--keep', default='')
ap.add_argument('--words', default='')
ap.add_argument('--thr_db', type=float, default=-40.0)
a = ap.parse_args()
SR = 44100
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, np.float32).copy()

# 10 ms RMS envelope, relative threshold
hop = SR // 100
n = len(x) // hop
rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
db = 20 * np.log10(rms / rms.max())
quiet = db < a.thr_db
sil = []  # (start_s, end_s)
i = 0
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]: j += 1
        if i > 0 and j < n: sil.append((i * hop / SR, j * hop / SR))
        i = j
    else:
        i += 1

keep = {}
if a.keep and a.words:
    want = dict((k, float(v)) for k, v in (p.split(':') for p in a.keep.split(',')))
    d = json.load(open(a.words)); ws = []
    for seg in d['transcription']:
        for t in seg.get('tokens', []):
            if t['text'].startswith('[_'): continue
            if t['text'].startswith(' ') or not ws: ws.append([t['text'].strip(), t['offsets']['from'] / 1000])
    # whisper word ENDS swallow the pause, so match by the START of the next word: the pause after word i is the
    # silence that ends closest to the start of word i+1
    for (w, _), (_, nxt) in zip(ws, ws[1:]):
        k = re.sub(r'[^a-z]', '', w.lower())
        if k in want and sil:
            best = min(sil, key=lambda q: abs(q[1] - nxt))
            if abs(best[1] - nxt) < 0.5: keep[best] = want[k]

XF = int(0.02 * SR)
out, pos, removed, cuts = [], 0, 0.0, 0
for s, e in sil:
    target = keep.get((s, e), a.gap)
    if e - s <= target + 0.02: continue
    # keep the first and last part of the pause (breath tails), drop the middle
    cut_a = s + target / 2; cut_b = e - target / 2
    ia, ib = int(cut_a * SR), int(cut_b * SR)
    seg = x[pos:ia + XF].copy()
    if out:  # crossfade with the previous tail
        prev = out[-1]
        fade = np.linspace(0, 1, XF, dtype=np.float32)
        prev[-XF:] = prev[-XF:] * (1 - fade) + seg[:XF] * fade
        seg = seg[XF:]
    out.append(seg); pos = ib; removed += cut_b - cut_a; cuts += 1
seg = x[pos:].copy()
if out:
    prev = out[-1]; fade = np.linspace(0, 1, XF, dtype=np.float32)
    prev[-XF:] = prev[-XF:] * (1 - fade) + seg[:XF] * fade; seg = seg[XF:]
out.append(seg)
y = np.concatenate(out)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', a.dst],
               input=y.astype(np.float32).tobytes(), check=True)
print(f'{a.src}: {len(x)/SR:.2f} s → {len(y)/SR:.2f} s ({cuts} pauses shortened, −{removed:.2f} s, kept long: {len(keep)})')
