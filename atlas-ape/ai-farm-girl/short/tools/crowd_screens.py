"""Puts her picture (flow/F1_jessica.jpg) on the big phone screens of the Flow crowd shot (Flow drew an older woman there).
Perspective warp per screen quad (TL, TR, BR, BL in px of F7_crowd.jpg), rounded-corner mask warped the same way.
Out: public/flow/F7_crowd_j.jpg. Also cuts round follower avatars from the crowd faces → public/fx/av_NN.png."""
import cv2, numpy as np
from PIL import Image, ImageDraw

crowd = cv2.imread('public/flow/F7_crowd.jpg').astype(np.float32)
src = cv2.imread('public/flow/F1_jessica.jpg')
# 1:2 crop around her (she is waving at x≈0.52 of the frame)
H, Wd = src.shape[:2]
cw = int(H * 0.5); x0 = int(Wd * 0.5 - cw / 2)
src = src[:, max(0, x0):max(0, x0) + cw].astype(np.float32)
sh, sw = src.shape[:2]
src = np.clip(src * 0.97 + 4, 0, 255)                         # a touch of screen glow

QUADS = [
	[(412, 1883), (579, 1895), (545, 2234), (384, 2215)],   # left, big
	[(965, 2070), (1120, 2040), (1169, 2324), (1013, 2351)],  # bottom right
	[(1120, 1693), (1252, 1687), (1260, 1942), (1130, 1946)],  # right, upper
]
# rounded-rect mask in source space
m = Image.new('L', (sw, sh), 0)
ImageDraw.Draw(m).rounded_rectangle([18, 18, sw - 18, sh - 18], radius=int(sw * 0.09), fill=255)
mask_src = np.array(m).astype(np.float32) / 255
out = crowd.copy()
for q in QUADS:
	P = cv2.getPerspectiveTransform(np.float32([(0, 0), (sw, 0), (sw, sh), (0, sh)]), np.float32(q))
	warped = cv2.warpPerspective(src, P, (crowd.shape[1], crowd.shape[0]), flags=cv2.INTER_AREA)
	mk = cv2.warpPerspective(mask_src, P, (crowd.shape[1], crowd.shape[0]), flags=cv2.INTER_LINEAR)
	mk = cv2.GaussianBlur(mk, (0, 0), 1.2)[..., None]
	out = out * (1 - mk) + warped * mk
cv2.imwrite('public/flow/F7_crowd_j.jpg', np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 93])

# follower avatars: faces of the crowd (cx, cy, r) in px of F7_crowd.jpg
FACES = [(385, 1690, 110), (578, 1585, 100), (765, 1705, 105), (1085, 1655, 100), (110, 1745, 100), (185, 1490, 95), (950, 1395, 95),
	(1210, 1395, 95), (1430, 1700, 100), (365, 1185, 80), (605, 1170, 75), (867, 1140, 75), (1245, 1150, 75), (1011, 1150, 75), (1459, 1160, 75)]
full = Image.open('public/flow/F7_crowd.jpg').convert('RGB')
for i, (cx, cy, r) in enumerate(FACES):
	c = full.crop((cx - r, cy - r, cx + r, cy + r)).resize((220, 220), Image.LANCZOS)
	mk = Image.new('L', (880, 880), 0); ImageDraw.Draw(mk).ellipse([0, 0, 879, 879], fill=255); mk = mk.resize((220, 220), Image.LANCZOS)
	c.putalpha(mk)
	c.save(f'public/fx/av_{i:02d}.png')
print('ok', len(FACES))
