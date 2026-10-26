"""Contact sheet of public/photos/*.jpg -> public/photos/contact.jpg (python -I tools/contact_sheet.py)."""
import glob, json, os
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "photos")
CELL_W, CELL_H, LABEL_H, COLS, PAD = 420, 300, 46, 5, 12


def font(size):
    for f in ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc",
              "/Library/Fonts/Arial.ttf"]:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def main():
    lic = {}
    cp = os.path.join(ROOT, "credits.jsonl")
    if os.path.exists(cp):
        for line in open(cp, encoding="utf-8"):
            r = json.loads(line)
            lic[r["file"]] = r["license"].split(" (")[0]
    files = sorted(f for f in glob.glob(os.path.join(ROOT, "*.jpg")) if os.path.basename(f) != "contact.jpg")
    rows = (len(files) + COLS - 1) // COLS
    W = COLS * (CELL_W + PAD) + PAD
    H = rows * (CELL_H + LABEL_H + PAD) + PAD + 50
    sheet = Image.new("RGB", (W, H), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    f1, f2, ft = font(17), font(14), font(24)
    d.text((PAD, 12), f"Humans vs Volcano - archive photos ({len(files)})", fill=(240, 240, 240), font=ft)
    for i, f in enumerate(files):
        x = PAD + (i % COLS) * (CELL_W + PAD)
        y = 50 + PAD + (i // COLS) * (CELL_H + LABEL_H + PAD)
        with Image.open(f) as im:
            w, h = im.size
            t = ImageOps.contain(im.convert("RGB"), (CELL_W, CELL_H))
        sheet.paste(t, (x + (CELL_W - t.width) // 2, y + (CELL_H - t.height) // 2))
        name = os.path.basename(f)
        d.text((x, y + CELL_H + 4), name, fill=(255, 220, 120), font=f1)
        d.text((x, y + CELL_H + 25), f"{w}x{h}  {lic.get(name, '?')}", fill=(190, 190, 190), font=f2)
    out = os.path.join(ROOT, "contact.jpg")
    sheet.save(out, quality=88)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
