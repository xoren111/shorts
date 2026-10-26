"""sheet_any.py out.jpg n file1 [file2 …] — n evenly spaced frames per clip (one row each), labelled with clip + time"""
import subprocess, sys, json
from PIL import Image, ImageDraw
out, n, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
rows = []
for f in files:
	try:
		d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip())
	except ValueError:
		d = 10.0
	ims = []
	for i in range(n):
		t = d * (i + 0.5) / n
		raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', f, '-frames:v', '1', '-vf', 'scale=-2:220', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
		if not raw: continue
		import io
		im = Image.open(io.BytesIO(raw)).convert('RGB')
		ImageDraw.Draw(im).text((4, 4), f'{f.split("/")[-2][:14]} {t:.1f}', fill=(255, 255, 0))
		ims.append(im)
	if ims:
		r = Image.new('RGB', (sum(i.size[0] + 4 for i in ims), 224))
		x = 0
		for im in ims: r.paste(im, (x, 0)); x += im.size[0] + 4
		rows.append(r)
W = max(r.size[0] for r in rows); s = Image.new('RGB', (W, 224 * len(rows)))
for k, r in enumerate(rows): s.paste(r, (0, 224 * k))
s.thumbnail((2400, 4000)); s.save(out, quality=85); print(out, s.size)
