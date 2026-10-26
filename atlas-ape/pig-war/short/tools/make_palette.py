"""Kenney Mini Characters colormap + our 1859 uniform colours → assets/pw_colormap.png (+ assets/pw_colormap.json).
The original atlas is 512×512: 64×128 colour blocks (left 32 px flat, right 32 px darkening downwards); the top rows are
unused (black). New colours go into those free blocks with the same structure, so remapped UVs keep their shading offsets."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
src = ROOT / 'assets/cc0/kenney-mini-characters/Models/GLB format/Textures/colormap.png'
cm = np.asarray(Image.open(src).convert('RGB')).astype(float)
COLS = {
	'us_coat': '#2f428c', 'us_trouser': '#8fb2e0', 'uk_coat': '#d42a33', 'uk_trouser': '#20243f', 'gold': '#f2c34e',
	'farmer_shirt': '#c95a38', 'farmer_trouser': '#6a5038', 'tweed': '#8a6844', 'tweed_trouser': '#4c423a',
	'gov_coat': '#26252d', 'gov_trouser': '#70727b', 'admiral_coat': '#1c2858', 'kaiser_coat': '#2a3656', 'boot': '#2a2523',
	'shirt_white': '#f4f1ea',
}
free = [(bx, 0) for bx in range(8)] + [(bx, 1) for bx in range(1, 8)]
assert len(COLS) <= len(free)
# darkening profile of the right half: measured on the blue block (x 320–383, y 128·2…) → ratio per row
ref = cm[256:384, 368, :].mean(axis=1); prof = ref / ref[0]
out = cm.copy(); slots = {}
for (name, hx), (bx, by) in zip(COLS.items(), free):
	c = np.array([int(hx[i:i + 2], 16) for i in (1, 3, 5)], float)
	x0, y0 = bx * 64, by * 128
	out[y0:y0 + 128, x0:x0 + 32] = c
	out[y0:y0 + 128, x0 + 32:x0 + 64] = (c[None, :] * prof[:, None])[:, None, :]
	slots[name] = [bx, by]
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(ROOT / 'assets/pw_colormap.png')
json.dump(slots, open(ROOT / 'assets/pw_colormap.json', 'w'), indent=1)
print('palette →', ROOT / 'assets/pw_colormap.png', slots)
