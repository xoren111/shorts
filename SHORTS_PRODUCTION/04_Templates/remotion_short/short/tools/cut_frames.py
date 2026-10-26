"""Frames around every shot change (10 fps, ±0.5 s) for transition QA → out/qa/cuts/<t>/f_<time>.jpg + one sheet per cut.
Template version: cuts = beat starts from out/timeline.json.
  python3 tools/cut_frames.py [video]"""
import subprocess, sys, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
P = json.load(open(ROOT / 'project.json', encoding='utf-8'))
video = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'out/FINAL' / (P.get('out_name') or P['slug'] + '.mp4')
# shot boundaries = beat starts from out/timeline.json (written by `node tools/check.mjs`)
CUTS = [b['t0'] for b in json.load(open(ROOT / 'out/timeline.json'))['beats'] if b['t0'] > 0]
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
