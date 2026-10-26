"""parchment map of the San Juan Islands for the Kaiser's desk, drawn from the real DEM coast (data/terrain/pnw, made by
tools/geo_pnw.py) with the 49th parallel and both claim lines → assets/notes/deskmap.png"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = Path(__file__).resolve().parents[1]
D = ROOT / 'data/terrain/pnw'
meta = json.load(open(D / 'meta.json')); lines = json.load(open(D / 'lines.json'))
h = np.load(D / 'height.npy')
S, N, Wl, E = 48.25, 49.08, -123.55, -122.55
W, H = 1400, int(1400 * (N - S) * 111.13 / ((E - Wl) * 73.6))
def ij(lat, lon):
	return int((meta['N'] - lat) / meta['dlat']), int((lon - meta['W']) / meta['dlon'])
i0, j0 = ij(N, Wl); i1, j1 = ij(S, E)
land = (h[i0:i1, j0:j1] > 1.5).astype(np.uint8) * 255
im = Image.fromarray(land).filter(ImageFilter.MedianFilter(9)).filter(ImageFilter.MedianFilter(9)).resize((W, H), Image.LANCZOS)
a = np.asarray(im.filter(ImageFilter.GaussianBlur(0.8))) > 128
col = np.zeros((H, W, 3), np.uint8); col[:] = (170, 200, 206); col[a] = (204, 190, 140)
edge = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES)) > 0
col[edge] = (110, 90, 60)
paper = Image.fromarray(col); d = ImageDraw.Draw(paper)
def px(lat, lon): return ((lon - Wl) / (E - Wl) * W, (N - lat) / (N - S) * H)
def dashed(pts, fill, width, on=26, off=18):
	P = [px(*p) for p in pts]; acc = 0.0; draw = True
	for (x0, y0), (x1, y1) in zip(P, P[1:]):
		seg = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
		if draw: d.line((x0, y0, x1, y1), fill=fill, width=width)
		acc += seg
		if acc > (on if draw else off): acc = 0.0; draw = not draw
dashed(lines['l49'], (40, 30, 25), 7)
dashed(lines['haro'], (40, 80, 190), 11)
dashed(lines['rosario'], (190, 40, 40), 11)
paper = paper.resize((W, H)).filter(ImageFilter.SMOOTH)
frame = Image.new('RGB', (W + 80, H + 80), (232, 216, 178)); frame.paste(paper, (40, 40))
ImageDraw.Draw(frame).rectangle((22, 22, W + 58, H + 58), outline=(120, 90, 50), width=8)
frame.save(ROOT / 'assets/notes/deskmap.png'); print('ok', frame.size)
