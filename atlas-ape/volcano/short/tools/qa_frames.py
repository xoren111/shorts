"""QA frames for review agents: out/qa/<seg>/f_<t>.jpg (540×960, every 0.5 s) + a labelled sheet per segment
+ out/qa/vo_words.txt (each VO word with its times, so reviewers can tell speech from silence).
  python3 tools/qa_frames.py [video]  (default out/FINAL/humans_vs_volcano.mp4)"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
video = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'out/FINAL/humans_vs_volcano.mp4'
SEGS = [(0, 20), (20, 40), (40, 58), (58, 76.8)]
out = ROOT / 'out/qa'
if out.exists():
	subprocess.run(['rm', '-rf', str(out)])
out.mkdir(parents=True)
tmp = out / '_all'
tmp.mkdir()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-vf', 'fps=2,scale=540:960', '-start_number', '0', str(tmp / 'f_%04d.jpg')], check=True)
frames = sorted(tmp.glob('f_*.jpg'))
f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
for si, (a, b) in enumerate(SEGS):
	d = out / f'seg{si}'
	d.mkdir()
	sel = []
	for k, p in enumerate(frames):
		t = k * 0.5 + 0.25
		if a <= t < b:
			q = d / f't_{t:05.2f}.jpg'
			p.rename(q)
			sel.append((t, q))
	cols = 8
	w, h = 270, 480
	rows = (len(sel) + cols - 1) // cols
	sheet = Image.new('RGB', (cols * (w + 4), rows * (h + 30)), (20, 20, 24))
	dr = ImageDraw.Draw(sheet)
	for k, (t, q) in enumerate(sel):
		x, y = (k % cols) * (w + 4), (k // cols) * (h + 30)
		sheet.paste(Image.open(q).resize((w, h)), (x, y + 28))
		dr.text((x + 4, y + 3), f'{t:.2f} s', fill=(255, 210, 60), font=f)
	sheet.save(d / 'sheet.jpg', quality=85)
	print(f'seg{si} {a}-{b}s: {len(sel)} frames')
subprocess.run(['rm', '-rf', str(tmp)])
words = json.load(open(ROOT / 'data/words.json'))
(out / 'vo_words.txt').write_text('\n'.join(f"{w['s']:6.2f}-{w['e']:6.2f}  {w['w']}" for w in words))
