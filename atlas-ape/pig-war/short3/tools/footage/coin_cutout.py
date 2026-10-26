"""Cut a round coin out of a plain (grey/white/black) background -> RGBA PNG.
Finds the coin edge along 1440 rays (first background pixel going outward), fits an ellipse
(least squares) and applies an anti-aliased elliptical mask, inset by `inset` px.
Usage: python3 coin_cutout.py <in.jpg> <out.png> [inset_px] [sat_thr]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
inset = float(sys.argv[3]) if len(sys.argv) > 3 else 1.5
thr = float(sys.argv[4]) if len(sys.argv) > 4 else 0.22
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(np.float32) / 255.0
mx, mn = a.max(axis=2), a.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1e-3)
coin = (sat > thr) & (a[..., 0] > a[..., 2] + 0.06)
coin = np.asarray(Image.fromarray((coin * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(7))) > 127
H, W = coin.shape
ys, xs = np.nonzero(coin)
cx, cy = np.median(xs), np.median(ys)
cx, cy = (np.percentile(xs, 0.1) + np.percentile(xs, 99.9)) / 2, (np.percentile(ys, 0.1) + np.percentile(ys, 99.9)) / 2
R = max(W, H)
pts = []
for t in np.linspace(0, 2 * np.pi, 1440, endpoint=False):
    rr = np.arange(R * 0.75, R * 0.2, -0.5)  # walk inward from outside
    px = np.round(cx + rr * np.cos(t)).astype(int)
    py = np.round(cy + rr * np.sin(t)).astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    if not ok.any():
        continue
    vals = np.zeros_like(rr, dtype=bool)
    vals[ok] = coin[py[ok], px[ok]]
    # first index where 8 consecutive samples are coin
    run = np.convolve(vals.astype(int), np.ones(8, int), "valid")
    hit = np.nonzero(run == 8)[0]
    if len(hit) == 0:
        continue
    k = hit[0]
    if not ok[max(0, k - 1)]:
        continue  # edge lies outside the image on this ray
    pts.append((cx + rr[k] * np.cos(t), cy + rr[k] * np.sin(t)))
pts = np.array(pts)
# robust ellipse fit (axis-aligned + rotation) via algebraic least squares, 2 passes with outlier rejection
def fit(p):
    x, y = p[:, 0], p[:, 1]
    D = np.stack([x * x, x * y, y * y, x, y, np.ones_like(x)], 1)
    _, _, V = np.linalg.svd(D, full_matrices=False)
    return V[-1]
def resid(c, p):
    x, y = p[:, 0], p[:, 1]
    return np.abs(c[0] * x * x + c[1] * x * y + c[2] * y * y + c[3] * x + c[4] * y + c[5])
c = fit(pts)
r = resid(c, pts)
pts2 = pts[r < np.percentile(r, 85)]
c = fit(pts2)
A, B, C, Dd, E, F = c
# centre and implicit function value -> signed approx distance via gradient
yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
f = A * xx * xx + B * xx * yy + C * yy * yy + Dd * xx + E * yy + F
gx = 2 * A * xx + B * yy + Dd
gy = B * xx + 2 * C * yy + E
dist = f / np.maximum(np.sqrt(gx * gx + gy * gy), 1e-9)
# sign: inside should be negative
x0 = (B * E - 2 * C * Dd) / (4 * A * C - B * B)
y0 = (B * Dd - 2 * A * E) / (4 * A * C - B * B)
if A * x0 * x0 + B * x0 * y0 + C * y0 * y0 + Dd * x0 + E * y0 + F > 0:
    dist = -dist
alpha = np.clip(-dist - inset + 0.5, 0, 1)
ys2, xs2 = np.nonzero(alpha > 0)
bx0, bx1, by0, by1 = max(0, xs2.min() - 2), min(W, xs2.max() + 3), max(0, ys2.min() - 2), min(H, ys2.max() + 3)
out = np.dstack([np.asarray(im), (alpha * 255).astype(np.uint8)])
Image.fromarray(out[by0:by1, bx0:bx1]).save(dst, optimize=True)
print(f"{src}: centre=({x0:.1f},{y0:.1f}) edge pts={len(pts)} -> {dst} {bx1-bx0}x{by1-by0}")
