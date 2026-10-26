"""Atlas rig export (RGBA PNG frames f_NNNNN.png, 30 fps, from ~/shorts/orangutan `npm run export`) → public/atlas/rig/
f_NNNNN.webp (lossy + alpha, q 90) for AtlasWindows (src/ui/Atlas.tsx). The frame number stays the global 30 fps index
(t·30), so the Short reads the frame for any time directly.

By default only the frames inside the rig windows of project.json → "atlas" (± 0.2 s) are written — the Short never shows
Atlas elsewhere — and every frame is cropped to one box: the union of Atlas's opaque pixels over those frames + 16 px
(all frames share the box, so the figure does not jump; AtlasWindows sizes the box by its height).

  python3 tools/atlas/atlas_webp.py                    frames from <rig>/out/<scene id>/frames (atlas_scene.py)
  python3 tools/atlas/atlas_webp.py DIR                frames from another export folder
  python3 tools/atlas/atlas_webp.py --all --no-crop    every frame, full canvas (e.g. for AtlasLayer)
  options: --dst atlas/rig  --credits (append the CREDITS.md line)
"""
import argparse, os, sys
from multiprocessing import Pool
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, RIG_DIR, load_project, load_words, clock, atlas_block, rig_root, scene_id, window_times, frame_range, add_credits

PAD = 16
_job = {}


def _init(crop, dst):
	_job.update(crop=crop, dst=dst)          # spawned workers (macOS) do not inherit globals


def _bbox(p):
	a = np.array(Image.open(p))[..., 3]
	ys, xs = np.nonzero(a > 8)
	return None if not len(xs) else (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)


def _one(p):
	im = Image.open(p)
	if _job['crop']:
		im = im.crop(_job['crop'])
	out = _job['dst'] / (p.stem + '.webp')
	im.save(out, 'WEBP', quality=90, alpha_quality=100, method=4)
	return out.stat().st_size


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument('src', nargs='?', help='folder with f_NNNNN.png (default: <rig>/out/<scene id>/frames)')
	ap.add_argument('--dst', default=None, help='folder under public/ (default: atlas.rig.dir or atlas/rig)')
	ap.add_argument('--all', action='store_true', help='every frame, not only the windows')
	ap.add_argument('--no-crop', action='store_true', help='keep the full export canvas')
	ap.add_argument('--credits', action='store_true', help='append the CREDITS.md line')
	a = ap.parse_args()
	project = load_project()
	block = atlas_block(project) or {'windows': [], 'rig': {}, 'source': 'rig'}
	rig = rig_root(block)
	sid = scene_id(project, block)
	src = Path(os.path.expanduser(a.src)) if a.src else rig / 'out' / sid / 'frames'
	frames = sorted(src.glob('f_*.png'))
	if not frames:
		raise SystemExit(f'✗ no f_*.png in {src} — export first: (cd {rig} && npm run export -- {sid} --w 1800 --h 1400)')
	n = int(frames[-1].stem[2:]) + 1
	rel = a.dst or (block.get('rig') or {}).get('dir') or RIG_DIR
	dst = ROOT / 'public' / rel
	if a.all:
		pick = frames
	else:
		words = load_words()
		_, dur = clock(project, words)
		wins = [w for w in block['windows'] if w.get('source', block['source']) == 'rig']
		if not wins:
			raise SystemExit('✗ no rig windows in project.json → "atlas" (source "rig"); use --all to convert everything')
		want = set()
		for w in wins:
			i0, i1 = frame_range(*window_times(w, words, dur), n_max=n)
			want.update(range(i0, i1 + 1))
		pick = [f for f in frames if int(f.stem[2:]) in want]
		missing = sorted(want - {int(f.stem[2:]) for f in frames})
		if missing:
			print(f'! {len(missing)} window frames are not in the export (first {missing[0]}): is the scene as long as the Short?')
	crop = None
	if not a.no_crop:
		with Pool(8) as pool:
			boxes = [b for b in pool.map(_bbox, pick, chunksize=16) if b]
		W, H = Image.open(pick[0]).size
		crop = (int(max(0, min(b[0] for b in boxes) - PAD)), int(max(0, min(b[1] for b in boxes) - PAD)),
			int(min(W, max(b[2] for b in boxes) + PAD)), int(min(H, max(b[3] for b in boxes) + PAD)))
	dst.mkdir(parents=True, exist_ok=True)
	for old in dst.glob('f_*.webp'):
		old.unlink()
	with Pool(8, initializer=_init, initargs=(crop, dst)) as pool:
		sizes = pool.map(_one, pick, chunksize=16)
	size = Image.open(dst / (pick[0].stem + '.webp')).size
	print(f'{len(pick)} of {len(frames)} frames → public/{rel}/  {size[0]}×{size[1]}' + (f' (crop {crop})' if crop else '') + f', {sum(sizes) / 1e6:.1f} MB')
	line = (f'- `{rel}/` (f_NNNNN.webp) — Atlas: риг `~/shorts/orangutan` (только оригинальные части владельца), сцена `{sid}` '
		f'(tools/atlas/atlas_scene.py), экспорт рига — своё (арт владельца канала)')
	if a.credits:
		print(f'CREDITS.md: {add_credits([line])} line(s) added')
	else:
		print('CREDITS.md line (or rerun with --credits):\n  ' + line)


if __name__ == '__main__':
	main()
