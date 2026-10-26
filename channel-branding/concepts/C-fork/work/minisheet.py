#!/usr/bin/env python3
"""Compare avatar variants: each row = one variant: full 800 (as 260), circle crops at 98/40/32 on white and dark (true size + x3)."""
import sys
from PIL import Image, ImageDraw

out, files = sys.argv[1], sys.argv[2:]


def circle(im, d):
    big = im.convert('RGBA').resize((d * 4, d * 4), Image.LANCZOS)
    m = Image.new('L', (d * 4, d * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255)
    big.putalpha(m)
    return big.resize((d, d), Image.LANCZOS)


RH = 320
sheet = Image.new('RGB', (1500, RH * len(files)), (200, 200, 200))
for i, f in enumerate(files):
    im = Image.open(f)
    y = i * RH
    c = circle(im, 260)
    sheet.paste(c, (10, y + 30), c)
    x = 290
    for bgc in [(255, 255, 255), (15, 15, 15)]:
        ImageDraw.Draw(sheet).rectangle((x - 10, y, x + 590, y + RH - 4), fill=bgc)
        xx = x
        for s in [98, 40, 32]:
            c = circle(im, s)
            sheet.paste(c, (xx, y + 10), c)
            z = c.resize((s * 3 if s < 98 else s * 2, s * 3 if s < 98 else s * 2), Image.NEAREST)
            sheet.paste(z, (xx, y + 20 + s), z)
            xx += max(s * 3 if s < 98 else s * 2, s) + 12
        x += 600
sheet.save(out)
print('mini ->', out)
