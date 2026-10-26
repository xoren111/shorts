"""Dense labelled contact sheet of a local clip for picking segments.

usage: python3 -I scan.py <video> <out.jpg> [--step 1.0] [--t0 0] [--t1 end] [--cols 6] [--w 400]
Each cell = one frame every --step seconds, labelled with its source time.
"""
import argparse, json, os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont


def font(size):
    for f in ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate:format=duration", "-of", "json", path],
                         capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s = d["streams"][0]
    return s["width"], s["height"], s["r_frame_rate"], float(d["format"]["duration"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("out")
    ap.add_argument("--step", type=float, default=1.0)
    ap.add_argument("--t0", type=float, default=0.0)
    ap.add_argument("--t1", type=float, default=None)
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--w", type=int, default=400)
    a = ap.parse_args()
    W, H, fps, dur = probe(a.video)
    t1 = min(a.t1 if a.t1 is not None else dur, dur - 0.05)
    times = []
    t = a.t0
    while t <= t1 + 1e-6:
        times.append(round(t, 3)); t += a.step
    cw = a.w; ch = int(round(cw * H / W))
    rows = (len(times) + a.cols - 1) // a.cols
    sheet = Image.new("RGB", (a.cols * cw, rows * ch + 30), (20, 20, 20))
    d = ImageDraw.Draw(sheet); f = font(max(14, cw // 18))
    d.text((6, 6), f"{os.path.basename(os.path.dirname(a.video))}  {W}x{H} {fps} {dur:.2f}s", fill=(255, 255, 255), font=font(18))
    with tempfile.TemporaryDirectory() as td:
        for i, t in enumerate(times):
            p = os.path.join(td, f"{i:04d}.jpg")
            subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", a.video, "-frames:v", "1",
                            "-vf", f"scale={cw}:{ch}", "-y", p], check=False)
            if not os.path.exists(p):
                continue
            im = Image.open(p).convert("RGB")
            x, y = (i % a.cols) * cw, 30 + (i // a.cols) * ch
            sheet.paste(im, (x, y))
            d.rectangle([x, y, x + 70, y + 24], fill=(0, 0, 0))
            d.text((x + 4, y + 2), f"{t:.1f}", fill=(255, 230, 0), font=f)
    sheet.save(a.out, quality=88)
    print(a.out, len(times), "frames")


if __name__ == "__main__":
    main()
