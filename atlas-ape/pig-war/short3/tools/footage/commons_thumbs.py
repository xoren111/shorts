"""Fetch Commons thumbnails (via API thumburl) for given File: titles and tile them.
Usage: python3 commons_thumbs.py <out.jpg> <width> "File:A" "File:B" ...
"""
import io, json, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageOps

UA = "AtlasApeShort/1.0 (https://www.youtube.com/@ATLASAPE-S; educational Short)"
out, w, titles = sys.argv[1], int(sys.argv[2]), sys.argv[3:]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


q = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
    "action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|size", "iiurlwidth": w,
    "titles": "|".join(titles)})
d = json.loads(get(q))
pages = {p["title"]: p for p in d["query"]["pages"].values()}
# map normalized titles
norm = {n["from"]: n["to"] for n in d["query"].get("normalized", [])}
cells = []
for i, t in enumerate(titles):
    p = pages.get(norm.get(t, t))
    if not p or "imageinfo" not in p:
        print(i + 1, "MISSING", t)
        continue
    ii = p["imageinfo"][0]
    im = Image.open(io.BytesIO(get(ii["thumburl"]))).convert("RGB")
    cells.append((f"{i+1} {ii['width']}x{ii['height']}", im))
    print(i + 1, t[:110])
    time.sleep(0.7)
CW, CH = w, int(w * 1.4)
cols = min(5, len(cells))
rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (CW + 8), rows * (CH + 30)), (30, 30, 30))
dr = ImageDraw.Draw(sheet)
try:
    f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 16)
except Exception:
    f = ImageFont.load_default()
for k, (lab, im) in enumerate(cells):
    x, y = (k % cols) * (CW + 8), (k // cols) * (CH + 30)
    t = ImageOps.contain(im, (CW, CH))
    sheet.paste(t, (x + (CW - t.width) // 2, y + 26))
    dr.text((x + 4, y + 4), lab, fill=(255, 210, 60), font=f)
sheet.save(out, quality=85)
print(out, sheet.size)
