#!/usr/bin/env python3
"""Slim a Blender track.json (tools/blender/*.py --track) into the compact copy the scene imports from src/data/.

    python3 tools/track_slim.py public/blender/iceland_a/track.json src/data/iceland_a_track.json \
        --keys crater,harbor,mouth,lava_front --window route:50.0:51.9 --window harbor_lobe:52.5:55.2

Keeps t0/fps/n and, per frame, only the listed keys (rounded to 0.1 px); a --window key is kept only on frames whose time
t = t0 + k/fps lies inside [a, b] (elsewhere it is omitted). The full track.json stays next to the frames in public/.
"""
import argparse
import json


def rnd(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return round(v, 1)
    return [rnd(x) for x in v]


ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('dst')
ap.add_argument('--keys', default='')
ap.add_argument('--window', action='append', default=[], help='key:t_from:t_to')
a = ap.parse_args()

d = json.load(open(a.src))
t0, fps, frames = d['t0'], d.get('fps', 60), d['frames']
keys = [k for k in a.keys.split(',') if k]
wins = [(k, float(x), float(y)) for k, x, y in (w.split(':') for w in a.window)]
out = []
for i, f in enumerate(frames):
    t = t0 + i / fps
    r = {k: rnd(f.get(k)) for k in keys}
    for k, x, y in wins:
        if x <= t <= y:
            r[k] = rnd(f.get(k))
    out.append(r)
json.dump({'t0': t0, 'fps': fps, 'n': len(frames), 'src': a.src, 'frames': out}, open(a.dst, 'w'), separators=(',', ':'))
print(f'{a.dst}: {len(out)} frames, keys {keys} + windows {[w[0] for w in wins]}')
