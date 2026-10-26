"""Shot windows — the Python mirror of src/data/shots.ts (keep in sync). SHOT(key) → (t0, t1 + XF + 0.05) for a Blender render."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
_w = json.load(open(ROOT / 'data/words.json'))
LEAD, XF = 0.3, 0.4
def at(i, lead=LEAD): return _w[i]['s'] - lead
S = {
	'dockEng': (0, at(9)), 'dockMel': (at(9), at(12, 0.25)), 'lesson': (at(12, 0.25), at(17)), 'spread': (at(17), at(22)),
	'burrows': (at(22), at(25)), 'trophy': (at(25), at(29)), 'pasteur': (at(29), at(32, 0.25)), 'island': (at(32, 0.25), at(35)),
	'shields': (at(35), at(44, 0.25)), 'fizzle': (at(44, 0.25), at(48)), 'nobody': (at(48), at(50)), 'fence1926': (at(50), at(54)),
	'wamap': (at(54), at(57)), 'pegs': (at(57), at(67)), 'scratch': (at(67), at(73)), 'wardang': (at(73), at(82)),
	'samap': (at(82), at(88)), 'ceremony': (at(88), at(94)), 'wadots': (at(94), at(99)), 'bar': (at(99), at(102)), 'score': (at(102), 62.0),
}
def SHOT(k, tail=XF + 0.05):
	a, b = S[k]
	return a, b + (tail if k != 'score' else 0.0)
