"""Tile Pexels video poster frames for quick triage.
Usage: python3 posters_c.py <out.jpg> <id>[:slug] [<id>[:slug] ...]
slug (optional) = poster file stem if not 'pexels-photo' (e.g. boat-sailing).
"""
import io, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageOps

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
out, items = sys.argv[1], sys.argv[2:]
cells = []
for it in items:
    vid, _, stem = it.partition(":")
    stem = stem or "pexels-photo"
    url = f"https://images.pexels.com/videos/{vid}/{stem}-{vid}.jpeg?cs=tinysrgb&dpr=1&w=500"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
    except Exception as e:
        im = Image.new("RGB", (300, 300), (80, 0, 0))
        print(vid, "ERR", e)
    cells.append((vid, im))
CW, CH = 300, 300
cols = min(6, len(cells))
rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (CW + 6), rows * (CH + 30)), (30, 30, 30))
d = ImageDraw.Draw(sheet)
try:
    f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 18)
except Exception:
    f = ImageFont.load_default()
for k, (vid, im) in enumerate(cells):
    x, y = (k % cols) * (CW + 6), (k // cols) * (CH + 30)
    t = ImageOps.contain(im, (CW, CH))
    sheet.paste(t, (x + (CW - t.width) // 2, y + 26))
    d.text((x + 4, y + 3), f"{vid} {im.width}x{im.height}", fill=(255, 210, 60), font=f)
sheet.save(out, quality=85)
print(out, sheet.size)
