"""Structural frame-by-frame comparison of two renders (A/B versions, a re-render, a fix):
a frame DIFFERS when more than --share % of its pixels are off by more than --thr levels (any RGB channel). Renders are not
bit-exact — two renders of the same composition differ by noise (mean ~1–2 levels, < 0.03 % of pixels above 24) — so md5 or exact
equality are the wrong test; this is the one the template README and VERIFY.md use.
  python3 tools/vdiff.py a.mp4 b.mp4 [--thr 24] [--share 0.1] [--json out/qa/vdiff.json]
Compares frame k with frame k (rgb24 at the files' own size, the first video stream). Prints the frame count of each file, the
ranges of differing frames (frames and seconds), the largest share / mean difference, and «identical frames» (exact) for
reference. Exit 0 always; 2 = usage or the sizes differ."""
import argparse, json, subprocess, sys
import numpy as np


def probe(f):
	r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
		'stream=width,height,r_frame_rate,nb_read_packets', '-of', 'json', f], capture_output=True, text=True, check=True)
	s = json.loads(r.stdout)['streams'][0]
	a, b = s['r_frame_rate'].split('/')
	return int(s['width']), int(s['height']), float(a) / float(b), int(s['nb_read_packets'])


def frames(f, w, h):
	p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', f, '-map', '0:v:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
	n = w * h * 3
	while True:
		buf = p.stdout.read(n)
		if len(buf) < n:
			break
		yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
	p.stdout.close()
	p.wait()


def ranges(ks):
	out = []
	for k in ks:
		if out and k == out[-1][1] + 1:
			out[-1][1] = k
		else:
			out.append([k, k])
	return out


ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('a')
ap.add_argument('b')
ap.add_argument('--thr', type=int, default=24, help='level difference that counts as «off» (default 24)')
ap.add_argument('--share', type=float, default=0.1, help='%% of pixels off above which a frame differs (default 0.1)')
ap.add_argument('--json', help='write per-frame numbers here')
args = ap.parse_args()
wa, ha, fps, na = probe(args.a)
wb, hb, _, nb = probe(args.b)
if (wa, ha) != (wb, hb):
	print(f'sizes differ: {wa}×{ha} vs {wb}×{hb}')
	sys.exit(2)
rows, diff, same = [], [], 0
for k, (x, y) in enumerate(zip(frames(args.a, wa, ha), frames(args.b, wb, hb))):
	d = np.abs(x.astype(np.int16) - y.astype(np.int16)).max(axis=2)
	share = float((d > args.thr).mean() * 100)
	mean = float(d.mean())
	same += int(not d.any())
	rows.append({'frame': k, 't': round(k / fps, 3), 'share_off': round(share, 4), 'mean': round(mean, 3)})
	if share > args.share:
		diff.append(k)
n = len(rows)
print(f'{args.a}: {na} frames · {args.b}: {nb} frames · compared {n} at {wa}×{ha}, {fps:g} fps' + ('' if na == nb else '  ! frame counts differ'))
if diff:
	rs = ', '.join(f'{a}–{b} ({a / fps:.2f}–{(b + 1) / fps:.2f} s)' if a != b else f'{a} ({a / fps:.2f} s)' for a, b in ranges(diff))
	print(f'differing frames (> {args.share:g} % of pixels off by > {args.thr}): {len(diff)} — {rs}')
else:
	print(f'no differing frame (none has > {args.share:g} % of pixels off by > {args.thr})')
rest = [r for r in rows if r['frame'] not in set(diff)]
if rows:
	print(f'max share off {max(r["share_off"] for r in rows):.4f} % · max mean diff {max(r["mean"] for r in rows):.3f} levels'
		+ (f' · outside the differing frames: max share {max(r["share_off"] for r in rest):.4f} %, max mean {max(r["mean"] for r in rest):.3f}' if rest and diff else '')
		+ f' · exactly identical frames {same} / {n}')
if args.json:
	json.dump({'a': args.a, 'b': args.b, 'thr': args.thr, 'share': args.share, 'frames_a': na, 'frames_b': nb, 'differing': diff, 'rows': rows}, open(args.json, 'w'), indent=1)
