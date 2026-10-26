"""Gemini pose cards of Atlas (owner 23.10: «джемини для поз нашего орангутанга») → transparent PNGs for the ending.
White background connected to the border → alpha (same cut as ~/shorts/orangutan/experiments/pose_cards/pose_card.py),
cropped to the figure + 12 px margin.  python3 tools/cutout_cards.py
"""
import importlib.util, pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pc', pathlib.Path.home() / 'shorts/orangutan/experiments/pose_cards/pose_card.py')
pc = importlib.util.module_from_spec(spec); spec.loader.exec_module(pc)
out = ROOT / 'public/atlas'
out.mkdir(parents=True, exist_ok=True)
for name in ['atlas_clap', 'atlas_shock']:
    rgb = np.array(Image.open(ROOT.parent / 'gemini' / f'{name}.jpg').convert('RGB'))
    rgba, fg = pc.cutout(rgb)
    ys, xs = np.nonzero(rgba[..., 3] > 8)
    x0, y0, x1, y1 = max(0, xs.min() - 12), max(0, ys.min() - 12), min(rgb.shape[1], xs.max() + 13), min(rgb.shape[0], ys.max() + 13)
    Image.fromarray(rgba[y0:y1, x0:x1]).save(out / f'{name}.png')
    print(name, 'crop', x1 - x0, 'x', y1 - y0)
