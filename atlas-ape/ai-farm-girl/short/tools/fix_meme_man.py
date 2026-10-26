"""Meme Man cut-out, round 4: GrabCut lost the right half of his face (it blends into the pink glow) and the shirt between the
lapels, and the source frame crops the top of his dome. Now: upper head = ellipse fitted to the head's sides, lower head + neck
+ shirt = hand-traced polygons (px of the source crop), suit below the collar = the GrabCut alpha. The canvas grows TOP px and the
missing dome + background specks inside the head are inpainted (OpenCV Telea).
In: ../memes/meme_man_grabcut_v1.png (its RGB is the full original crop, 694 × 995). Out: public/memes/meme_man.png (694 × 1025)"""
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

TOP, S = 30, 4
src = np.array(Image.open('../memes/meme_man_grabcut_v1.png').convert('RGBA'))
H0, W = src.shape[:2]
H = H0 + TOP
rgb = np.zeros((H, W, 3), np.uint8)
rgb[TOP:] = src[..., :3]
rgb[:TOP] = src[0:1, :, :3]
old = np.zeros((H, W), np.float32)
old[TOP:] = src[..., 3] / 255

HEAD = [(250, -2), (200, 20), (165, 65), (150, 125), (147, 175), (155, 225), (170, 270), (182, 305), (180, 318), (240, 352), (325, 402),
	(340, 401), (365, 380), (380, 350), (387, 320), (395, 302), (420, 300), (450, 292), (470, 280), (485, 250), (492, 225), (500, 200),
	(515, 165), (517, 125), (505, 75), (480, 30), (452, -2)]
SHIRT = [(238, 345), (392, 322), (418, 420), (404, 527), (392, 527), (300, 455), (262, 395)]
CX, CY, AX, BY = 333, 140, 184, 167      # head ellipse (source px)

def draw(fn):
	m = Image.new('L', (W * S, H * S), 0)
	fn(ImageDraw.Draw(m))
	return np.array(m.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255

poly = draw(lambda d: [d.polygon([(x * S, (y + TOP) * S) for x, y in p], fill=255) for p in (HEAD, SHIRT)])
ell = draw(lambda d: d.ellipse([(CX - AX) * S, (CY - BY + TOP) * S, (CX + AX) * S, (CY + BY + TOP) * S], fill=255))
yy = np.arange(H)[:, None]
upper = yy < CY + TOP
head = np.where(upper, ell, poly)
a = np.where(yy < 318 + TOP, head, np.maximum(old, poly))
a = np.array(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255

# inpaint inside the head: the new dome rows and any blue/purple background specks (skin has R well above B)
r, b = rgb[..., 0].astype(int), rgb[..., 2].astype(int)
inner = cv2.erode((head > 0.5).astype(np.uint8), np.ones((51, 51), np.uint8)) > 0     # keep eyes/mouth: only a 25 px rim is checked
bgish = (b > r - 8) & (yy < 318 + TOP) & ~inner
fix = ((head > 0.02) & ((yy < TOP + 8) | bgish)).astype(np.uint8) * 255
fix = cv2.dilate(fix, np.ones((5, 5), np.uint8))
bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
bgr = cv2.inpaint(bgr, fix, 12, cv2.INPAINT_TELEA)
rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
# soften the seam where the inpainted dome meets the original rows
band = slice(TOP - 6, TOP + 22)
rgb[band] = cv2.GaussianBlur(rgb, (0, 0), sigmaX=1.5, sigmaY=6)[band]
# a little grain on the inpainted skin so it matches the deep-fried original
noise = np.random.default_rng(7).normal(0, 5, rgb.shape)
rgb = np.where((fix > 0)[..., None], np.clip(rgb + noise, 0, 255), rgb).astype(np.uint8)

out = np.dstack([rgb, (np.clip(a, 0, 1) * 255).astype(np.uint8)])
Image.fromarray(out).save('public/memes/meme_man.png')
print('ok', out.shape)
