"""Refine an approximate print box on a scanned mount card by snapping each edge to the strongest
brightness step within +-R px. Usage: python -I refine_edges.py image.jpg left top right bottom [R]"""
import sys
from PIL import Image

def refine(path, box, R=80):
    im = Image.open(path).convert("L")
    W, H = im.size
    px = im.load()
    l, t, r, b = box

    def col_mean(x, y0, y1):
        return sum(px[x, y] for y in range(y0, y1, 3)) / len(range(y0, y1, 3))

    def row_mean(y, x0, x1):
        return sum(px[x, y] for x in range(x0, x1, 3)) / len(range(x0, x1, 3))

    ym0, ym1 = t + (b - t) // 4, b - (b - t) // 4
    xm0, xm1 = l + (r - l) // 4, r - (r - l) // 4

    def snap(fn, c, lo, hi, a0, a1):
        best, bx = -1, c
        for x in range(max(lo, c - R), min(hi, c + R)):
            g = abs(fn(x + 2, a0, a1) - fn(x - 2, a0, a1))
            if g > best:
                best, bx = g, x
        return bx

    nl = snap(col_mean, l, 3, W - 3, ym0, ym1)
    nr = snap(col_mean, r, 3, W - 3, ym0, ym1)
    nt = snap(row_mean, t, 3, H - 3, xm0, xm1)
    nb = snap(row_mean, b, 3, H - 3, xm0, xm1)
    return nl, nt, nr, nb

if __name__ == "__main__":
    a = sys.argv[1:]
    R = int(a[5]) if len(a) > 5 else 80
    print(*refine(a[0], tuple(map(int, a[1:5])), R))
