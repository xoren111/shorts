#!/usr/bin/env python3
"""Group B: labelled frame strip/grid of a local or remote video.
Usage: python3 -I B_strip.py <video|url> <out.jpg> [n=8] [t0] [t1] [h=220] [cols=n]
Draws the timestamp on each frame."""
import sys, os, subprocess, tempfile, json
from PIL import Image, ImageDraw, ImageFont
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
src, out = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
uao = ["-user_agent", UA] if src.startswith("http") else []
def _dur():
    for args in (["-show_entries", "format=duration"], ["-select_streams", "v:0", "-show_entries", "stream=duration"]):
        v = subprocess.check_output(["ffprobe", "-v", "error", *uao, *args, "-of", "csv=p=0", src]).decode().strip().split("\n")[0]
        try: return float(v)
        except ValueError: pass
    return 60.0
dur = _dur()
t0 = float(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != "-" else 0.0
t1 = float(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != "-" else dur
h = int(sys.argv[6]) if len(sys.argv) > 6 else 220
cols = int(sys.argv[7]) if len(sys.argv) > 7 else n
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)
tmp = tempfile.mkdtemp()
ims = []
for i in range(n):
    t = t0 + (t1 - t0) * (i / (n - 1) if n > 1 else 0) if n > 1 else t0
    t = min(t, dur - 0.05)
    f = os.path.join(tmp, f"{i}.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *uao, "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-vf", f"scale=-2:{h}", f],
                   stdin=subprocess.DEVNULL)
    if not os.path.exists(f):
        continue
    im = Image.open(f).convert("RGB"); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 70, 24], fill=(0, 0, 0)); d.text((4, 2), f"{t:.2f}", fill=(255, 220, 0), font=font)
    ims.append(im)
if not ims:
    sys.exit("no frames")
w = ims[0].width; rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols, h * rows), (20, 20, 20))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out, quality=85)
print(f"dur={dur:.2f} -> {out}")
