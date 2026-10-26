"""Cut picked stock segments into 9:16 delivery clips + JSON + contact sheet.

usage: python3 -E cut.py <picks.json> [name ...]
picks.json: list of {name: "H3" | "H3_alt1", id: "H3", src: <raw path relative to short3/>, t0, t1,
            crop: [x, y, w, h] (source px, 9:16), meta: {...}}
Output (short3/assets/footage/<id>/): <name>.mp4 (1296x2304, H.264 CRF 16, no audio, source fps),
<name>.json, and sheet.jpg (main) / sheet_<suffix>.jpg (alts): 6 frames across the clip.
The dashed box on the sheet marks the central 1080x1920 safe area.
"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # short3/
OUT_W, OUT_H = 1296, 2304


def font(size):
    for f in ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate,nb_frames:format=duration", "-of", "json", path],
                         capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    return s["width"], s["height"], s["r_frame_rate"], float(d["format"]["duration"])


def sheet(clip, dest, label):
    W, H, fps, dur = probe(clip)
    cw, ch = 270, 480
    im = Image.new("RGB", (6 * cw + 7 * 6, ch + 40), (18, 18, 18))
    d = ImageDraw.Draw(im)
    d.text((8, 8), label, fill=(255, 255, 255), font=font(18))
    with tempfile.TemporaryDirectory() as td:
        for i in range(6):
            t = dur * (i + 0.5) / 6
            p = os.path.join(td, f"{i}.png")
            subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", clip, "-frames:v", "1",
                            "-vf", f"scale={cw}:{ch}", "-y", p], check=True)
            f = Image.open(p).convert("RGB")
            x = 6 + i * (cw + 6)
            im.paste(f, (x, 34))
            # central 1080x1920 safe box
            sx, sy = cw * 108 / OUT_W, ch * 192 / OUT_H
            for k in range(0, int(cw - 2 * sx), 8):
                d.line([(x + sx + k, 34 + sy), (x + sx + k + 4, 34 + sy)], fill=(255, 220, 0))
                d.line([(x + sx + k, 34 + ch - sy), (x + sx + k + 4, 34 + ch - sy)], fill=(255, 220, 0))
            for k in range(0, int(ch - 2 * sy), 8):
                d.line([(x + sx, 34 + sy + k), (x + sx, 34 + sy + k + 4)], fill=(255, 220, 0))
                d.line([(x + cw - sx, 34 + sy + k), (x + cw - sx, 34 + sy + k + 4)], fill=(255, 220, 0))
            d.rectangle([x, 34, x + 52, 34 + 20], fill=(0, 0, 0))
            d.text((x + 3, 36), f"{t:.2f}s", fill=(255, 230, 0), font=font(14))
    im.save(dest, quality=90)


def cut(p):
    src = os.path.join(ROOT, p["src"])
    W, H, fps, dur = probe(src)
    x, y, w, h = p["crop"]
    assert 0 <= x and 0 <= y and x + w <= W and y + h <= H, (p["name"], "crop outside source", W, H)
    assert abs(w / h - 9 / 16) < 0.01, (p["name"], "crop not 9:16", w / h)
    t0, t1 = p["t0"], min(p["t1"], dur)
    outdir = os.path.join(ROOT, "assets", "footage", p["id"])
    os.makedirs(outdir, exist_ok=True)
    mp4 = os.path.join(outdir, p["name"] + ".mp4")
    vf = f"crop={w}:{h}:{x}:{y},scale={OUT_W}:{OUT_H}:flags=lanczos,setsar=1"
    if p.get("eq"):
        vf += "," + p["eq"]
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{t0:.3f}", "-i", src, "-t", f"{t1 - t0:.3f}", "-map", "0:v:0",
           "-vf", vf, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
           "-profile:v", "high", "-movflags", "+faststart", "-fps_mode", "passthrough", "-y", mp4]
    subprocess.run(cmd, check=True)
    oW, oH, ofps, odur = probe(mp4)
    meta = dict(p["meta"])
    rec = {
        "shot": p["id"], "file": os.path.basename(mp4), "variant": p["name"],
        "source_page": meta.pop("page"), "direct_url": meta.pop("url"), "title": meta.pop("title"),
        "author": meta.pop("author"), "author_url": meta.pop("author_url", None),
        "licence": meta.pop("licence"), "licence_url": meta.pop("licence_url", None),
        "attribution": meta.pop("attribution", None),
        "source_file": p["src"], "source_resolution": f"{W}x{H}", "source_fps": fps,
        "segment": {"t0": round(t0, 3), "t1": round(t1, 3)},
        "crop": {"x": x, "y": y, "w": w, "h": h},
        "upscale": round(OUT_W / w, 3),
        "output": {"w": oW, "h": oH, "fps": ofps, "duration": round(odur, 3), "codec": "h264 crf16", "audio": False},
        "description": meta.pop("desc"),
    }
    rec.update(meta)
    with open(os.path.join(outdir, p["name"] + ".json"), "w", encoding="utf-8") as f:
        json.dump(rec, f, indent=2, ensure_ascii=False)
    suffix = p["name"][len(p["id"]):].lstrip("_")
    sheet(mp4, os.path.join(outdir, "sheet.jpg" if not suffix else f"sheet_{suffix}.jpg"),
          f"{p['name']}  {rec['title']}  t {t0:.2f}-{t1:.2f}  crop {x},{y} {w}x{h}  x{rec['upscale']}")
    print(f"{p['name']}: {odur:.2f}s {oW}x{oH} {ofps}  upscale x{rec['upscale']}")


def main():
    picks = json.load(open(sys.argv[1], encoding="utf-8"))
    names = set(sys.argv[2:])
    for p in picks:
        if not names or p["name"] in names:
            cut(p)


if __name__ == "__main__":
    main()
