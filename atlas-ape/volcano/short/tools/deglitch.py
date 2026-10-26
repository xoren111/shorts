"""Single-frame dropout repair: pixels that jump away in ONE frame and come back in the next (while the two neighbours
agree) are replaced by the neighbours' mean. Normal motion is untouched (there the neighbours differ). Re-encodes once.
  python3 tools/deglitch.py <in.mp4> <out.mp4> [t0 t1]   (only frames in [t0, t1) are repaired; default: all)"""
import subprocess, sys
import numpy as np
from scipy import ndimage
src, dst = sys.argv[1], sys.argv[2]
t0 = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
t1 = float(sys.argv[4]) if len(sys.argv) > 4 else 1e9
W, H, FPS = 1080, 1920, 60
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', src,
	'-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
	'-c:a', 'copy', '-movflags', '+faststart', dst], stdin=subprocess.PIPE)
def read():
	b = dec.stdout.read(W * H * 3)
	return None if len(b) < W * H * 3 else np.frombuffer(b, np.uint8).reshape(H, W, 3)
prev = read(); cur = read(); i = 1; fixed = 0
enc.stdin.write(prev.tobytes())
while cur is not None:
	nxt = read()
	out = cur
	t = i / FPS
	if nxt is not None and t0 <= t < t1:
		p, c, n = (x.astype(np.int16).mean(2) for x in (prev, cur, nxt))
		m = (np.minimum(np.abs(c - p), np.abs(c - n)) > 14) & (np.abs(n - p) < 7)
		m = ndimage.binary_opening(m, iterations=1)          # ignore isolated noise pixels
		# only large coherent dropouts (a pier, a piece of coast); small blobs are moving particles (embers, sparks,
		# fountains) — those legitimately differ from both neighbours and must stay
		lab, k = ndimage.label(m)
		if k:
			sizes = ndimage.sum(m, lab, range(1, k + 1))
			keep = np.isin(lab, 1 + np.flatnonzero(sizes >= 250))
		else:
			keep = m
		m = keep
		if m.sum() > 0:
			m = ndimage.binary_dilation(m, iterations=3)
			blend = ((prev.astype(np.uint16) + nxt.astype(np.uint16)) // 2).astype(np.uint8)
			out = cur.copy(); out[m] = blend[m]; fixed += 1
	enc.stdin.write(out.tobytes())
	prev, cur = cur, nxt; i += 1
enc.stdin.close(); enc.wait(); dec.wait()
print(f'{i} frames, {fixed} repaired → {dst}')
