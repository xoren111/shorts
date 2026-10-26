"""Shot windows — the Python source of truth; tools/shots_ts.py writes src/data/shots.ts from it. SHOT(key) → (t0, t1 + XF + 0.05)."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
_w = json.load(open(ROOT / 'data/words.json'))
LEAD, XF, END = 0.3, 0.4, 36.7
def at(i, lead=LEAD): return round(_w[i]['s'] - lead, 3)
S = {
	'then': (0.0, at(10)), 'later': (at(10), at(16)), 'war': (at(16), at(21)), 'sink': (at(21), at(28)),
	'front': (at(28), at(35)), 'lake': (at(35), at(42)), 'storm': (at(42), at(49)), 'friends': (at(49), at(57)),
	'football': (at(57), at(60)), 'stamps': (at(60), at(63)), 'race': (at(63), at(66, 0.25)), 'dive': (at(63), at(66, 0.25)), 'sprint': (at(63), at(66, 0.25)), 'podium': (at(66, 0.25), at(68)),
	'twosail': (at(68), at(76)), 'hamburg': (at(76), at(83)), 'hold': (at(83), END),
}
def SHOT(k, tail=XF + 0.05):
	a, b = S[k]
	return a, b + (tail if k != 'hold' else 0.0)
