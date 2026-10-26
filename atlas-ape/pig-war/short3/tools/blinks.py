"""One-frame glitch finder (render races): a glitch frame differs from BOTH neighbours while the neighbours agree, in a
cluster of tiles, as an ISOLATED peak in time (motion gives smooth runs, a glitch a single spike).
  python3 tools/blinks.py [video] [t0 t1]  → prints frames + writes out/glitches.json"""
import json, subprocess, sys
import numpy as np
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
v = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'out/FINAL/the_yellow_fleet.mp4')
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 999.0
W, H, TS, FPS = 270, 480, 30, 60
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t0), '-i', v, '-t', str(t1 - t0), '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
n = len(f)
s = np.zeros(n)
for i in range(1, n - 1):
	m = np.clip(np.minimum(np.abs(f[i] - f[i - 1]), np.abs(f[i + 1] - f[i])) - np.abs(f[i + 1] - f[i - 1]), 0, None)
	tiles = m[: H // TS * TS, : W // TS * TS].reshape(H // TS, TS, W // TS, TS).mean(axis=(1, 3))
	s[i] = np.sort(tiles.ravel())[-6:].mean()  # the 6 most affected tiles
hits = []
for i in range(3, n - 3):
	ctx = np.concatenate([s[max(0, i - 8): i - 1], s[i + 2: i + 9]])
	base = np.median(ctx)
	if s[i] > 0.6 and s[i] > 4 * base and s[i] > 2.5 * max(s[i - 1], s[i + 1]):
		hits.append({'frame': int(round((t0) * FPS)) + i, 't': round(t0 + i / FPS, 3), 'score': round(float(s[i]), 2), 'base': round(float(base), 2)})
for h in hits:
	print(f"frame {h['frame']}  t={h['t']:.3f}  score {h['score']}  (local {h['base']})")
print(f'{len(hits)} glitch frames in {n}')
json.dump(hits, open(ROOT / 'out/glitches.json', 'w'), indent=1)
