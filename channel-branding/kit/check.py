#!/usr/bin/env python3
"""Spec + legibility checks for the channel branding.

  python3 kit/check.py avatar <avatar.png> <out_sheet.png>
  python3 kit/check.py banner <banner.png> <out_sheet.png>

avatar: must be square ≥800 px, ≤15 MB. Sheet = the circle crop as YouTube shows it at 98 / 48 / 40 / 32 / 24 px
        on white, YouTube-dark (#0F0F0F) and light-grey, each at true size AND ×4 nearest-neighbour (to judge pixels),
        plus a fake comment row and a Shorts-feed channel row.
banner: must be 2560×1440 (16:9), ≤6 MB. Safe area for text/logos = 1546×423 centred (YouTube: 1235×338 at 2048×1152).
        Sheet = full banner with the TV / desktop (2560×423) / tablet (1855×423) / safe (1546×423) frames, then the
        mobile crop (safe area at 390 px wide, like a phone) and the desktop crop (2560×423 at 1280 px).
Prints PASS/FAIL lines for the hard specs.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

FONT = os.path.join(os.path.dirname(__file__), 'fonts', 'Montserrat-VF.ttf')


def font(sz):
    try:
        f = ImageFont.truetype(FONT, sz)
        try:
            f.set_variation_by_axes([700])
        except Exception:
            pass
        return f
    except Exception:
        return ImageFont.load_default()


def circle(im, d):
    big = im.convert('RGBA').resize((d * 4, d * 4), Image.LANCZOS)
    mask = Image.new('L', (d * 4, d * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255)
    big.putalpha(mask)
    return big.resize((d, d), Image.LANCZOS)


def avatar(src, out):
    im = Image.open(src)
    w, h = im.size
    size = os.path.getsize(src)
    print(('PASS' if w == h else 'FAIL'), f'square {w}x{h}')
    print(('PASS' if w >= 800 else 'FAIL'), 'at least 800 px')
    print(('PASS' if size <= 15 * 1024 * 1024 else 'FAIL'), f'file size {size / 1e6:.2f} MB (<= 15 MB)')
    sizes = [98, 48, 40, 32, 24]
    bgs = [('white', (255, 255, 255)), ('YT dark', (15, 15, 15)), ('light grey', (242, 242, 242))]
    Z = 4
    colw = max(sizes) * Z + 40
    sheet = Image.new('RGB', (len(sizes) * colw + 40, len(bgs) * (max(sizes) * Z + 110) + 260), (200, 200, 200))
    dr = ImageDraw.Draw(sheet)
    y = 20
    for name, col in bgs:
        dr.rectangle((0, y - 10, sheet.width, y + max(sizes) * Z + 90), fill=col)
        fg = (0, 0, 0) if sum(col) > 300 else (255, 255, 255)
        dr.text((20, y), f'{name}: true size (top-left) and x{Z} zoom', fill=fg, font=font(18))
        x = 20
        for s in sizes:
            c = circle(im, s)
            sheet.paste(c, (x, y + 30), c)
            z = c.resize((s * Z, s * Z), Image.NEAREST)
            sheet.paste(z, (x, y + 40 + s), z)
            dr.text((x + s + 8, y + 30), f'{s}px', fill=fg, font=font(16))
            x += colw
        y += max(sizes) * Z + 110
    # fake comment row + Shorts feed row
    dr.rectangle((0, y - 10, sheet.width, sheet.height), fill=(255, 255, 255))
    c40 = circle(im, 40)
    sheet.paste(c40, (20, y + 10), c40)
    dr.text((72, y + 12), '@WasWäreWenn4k  vor 2 Stunden', fill=(15, 15, 15), font=font(17))
    dr.text((72, y + 34), 'Danke für die Quellen! Teil 2 kommt am Samstag.', fill=(30, 30, 30), font=font(17))
    dr.rectangle((0, y + 90, sheet.width, sheet.height), fill=(15, 15, 15))
    c32 = circle(im, 32)
    sheet.paste(c32, (20, y + 120), c32)
    dr.text((62, y + 124), '@WasWäreWenn4k', fill=(255, 255, 255), font=font(18))
    dr.rounded_rectangle((250, y + 118, 380, y + 152), 17, fill=(255, 255, 255))
    dr.text((262, y + 124), 'Abonnieren', fill=(15, 15, 15), font=font(17))
    sheet.save(out)
    print('sheet ->', out)


def banner(src, out):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    size = os.path.getsize(src)
    print(('PASS' if (w, h) == (2560, 1440) else 'FAIL'), f'dimensions {w}x{h} (2560x1440)')
    print(('PASS' if size <= 6 * 1024 * 1024 else 'FAIL'), f'file size {size / 1e6:.2f} MB (<= 6 MB)')
    W, H = 2560, 1440
    if (w, h) != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    frames = [((0, 0, W, H), (255, 255, 255), 'TV 2560x1440'),
              (((W - 2560) // 2, (H - 423) // 2, (W + 2560) // 2, (H + 423) // 2), (0, 200, 255), 'desktop max 2560x423'),
              (((W - 1855) // 2, (H - 423) // 2, (W + 1855) // 2, (H + 423) // 2), (255, 160, 0), 'tablet 1855x423'),
              (((W - 1546) // 2, (H - 423) // 2, (W + 1546) // 2, (H + 423) // 2), (255, 0, 80), 'SAFE 1546x423 (all devices)')]
    ov = im.copy()
    dr = ImageDraw.Draw(ov)
    for i, (box, col, label) in enumerate(frames):
        dr.rectangle(box, outline=col, width=6)
        dr.text((box[0] + 14, box[1] + 10 + (36 if i == 1 else 0)), label, fill=col, font=font(30))
    ovs = ov.resize((1280, 720), Image.LANCZOS)
    safe = im.crop(frames[3][0]).resize((390, int(423 * 390 / 1546)), Image.LANCZOS)
    desk = im.crop(frames[1][0]).resize((1280, int(423 * 1280 / 2560)), Image.LANCZOS)
    sheet = Image.new('RGB', (1320, 720 + 40 + 60 + safe.height + 60 + desk.height + 40), (30, 30, 30))
    d2 = ImageDraw.Draw(sheet)
    sheet.paste(ovs, (20, 20))
    y = 760
    d2.text((20, y), 'phone (safe area at 390 px wide):', fill=(255, 255, 255), font=font(22))
    sheet.paste(safe, (20, y + 34))
    y += 34 + safe.height + 26
    d2.text((20, y), 'desktop (2560x423 strip at 1280 px):', fill=(255, 255, 255), font=font(22))
    sheet.paste(desk, (20, y + 34))
    sheet.save(out)
    print('sheet ->', out)


if __name__ == '__main__':
    mode, src, out = sys.argv[1:4]
    {'avatar': avatar, 'banner': banner}[mode](src, out)
