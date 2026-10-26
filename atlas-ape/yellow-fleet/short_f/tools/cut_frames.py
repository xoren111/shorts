"""Frames around every shot change (10 fps, ±0.5 s) for transition QA → out/qa/cuts/<t>/f_<time>.jpg + one sheet per cut.
  python3 tools/cut_frames.py [video]"""
import subprocess, sys, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
video = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'out/FINAL/humans_vs_volcano.mp4'
W = json.load(open(ROOT / 'data/words.json'))
w = lambda i: W[i]['s']
# shot boundaries from src/Short.tsx T (+ insert windows): hook→globe, globe→3D, 3D→inserts …
CUTS = [6.42, 8.55, w(25), w(28), w(32), w(39), w(47) - 0.7, w(48), w(71), w(76) - 0.02, w(79), w(104), w(109), w(112), w(114), w(119), w(129), w(138) - 0.3]
out = ROOT / 'out/qa/cuts'
subprocess.run(['rm', '-rf', str(out)]); out.mkdir(parents=True)
f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 20)
for c in CUTS:
	d = out / f'{c:05.2f}'; d.mkdir()
	subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, c - 0.5):.3f}', '-i', str(video), '-t', '1.1', '-vf', 'fps=10,scale=360:640', str(d / 'f_%02d.jpg')], check=True)
	fs = sorted(d.glob('f_*.jpg'))
	sheet = Image.new('RGB', (len(fs) * 364, 670), (20, 20, 24)); dr = ImageDraw.Draw(sheet)
	for k, p in enumerate(fs):
		sheet.paste(Image.open(p), (k * 364, 28)); dr.text((k * 364 + 4, 4), f'{c - 0.5 + k * 0.1:.2f}s', fill=(255, 210, 60), font=f)
	sheet.save(d / 'sheet.jpg', quality=85)
print(f'{len(CUTS)} cuts → {out}')
