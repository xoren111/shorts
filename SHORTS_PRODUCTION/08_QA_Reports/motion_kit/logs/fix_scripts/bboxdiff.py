"""bbox of the pixels that differ between two still folders (same file names): python3 bboxdiff.py A B [thr]"""
import sys, os, numpy as np
from PIL import Image
a, b = sys.argv[1], sys.argv[2]
thr = int(sys.argv[3]) if len(sys.argv) > 3 else 40
for f in sorted(os.listdir(a)):
    if not f.endswith(('.png', '.jpg')) or not os.path.exists(os.path.join(b, f)):
        continue
    A = np.asarray(Image.open(os.path.join(a, f)).convert('RGB')).astype(int)
    B = np.asarray(Image.open(os.path.join(b, f)).convert('RGB')).astype(int)
    d = np.abs(A - B).max(axis=2) > thr
    ys, xs = np.nonzero(d)
    if not len(xs):
        print(f, 'no diff'); continue
    print(f'{f}: x {xs.min()}–{xs.max()}  y {ys.min()}–{ys.max()}  (w {xs.max()-xs.min()+1}, h {ys.max()-ys.min()+1}, px {len(xs)})')
