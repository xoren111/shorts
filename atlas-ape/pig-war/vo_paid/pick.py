"""compare the paid takes with the owner's chosen (free-plan) take, sentence by sentence (ElevenLabs character timestamps
vs. the old word times in short2/data/words.json) → which take keeps the edit's rhythm best"""
import json, re
from pathlib import Path
HERE = Path(__file__).resolve().parent
text = (HERE.parent / 'voiceover.txt').read_text().strip()
old = json.load(open(HERE.parent / 'short2/data/words.json'))
# word spans in the text (same tokenisation as align.py: whitespace)
spans, i = [], 0
for m in re.finditer(r'\S+', text): spans.append((m.start(), m.end(), m.group()))
assert len(spans) == len(old), (len(spans), len(old))
sent_start = [0] + [k + 1 for k, (_, _, w) in enumerate(spans[:-1]) if re.search(r'[.?]$', w)]
def words_from(al):
	cs, ce = al['character_start_times_seconds'], al['character_end_times_seconds']
	return [(cs[a], ce[b - 1]) for a, b, _ in spans]
res = {}
for f in sorted(HERE.glob('take_*.json')):
	al = json.load(open(f)); ws = words_from(al)
	devs, rows = [], []
	for k, a in enumerate(sent_start):
		b = (sent_start[k + 1] if k + 1 < len(sent_start) else len(spans)) - 1
		nd = ws[b][1] - ws[a][0]; od = old[b]['e'] - old[a]['s']
		devs.append(nd / od); rows.append((spans[a][2], round(od, 2), round(nd, 2), round(nd / od, 3)))
	import math
	score = sum(abs(math.log(r)) for r in devs) / len(devs)
	worst = max(devs)
	res[f.stem] = (round(score, 4), round(worst, 3), round(ws[-1][1], 2))
	print(f.stem, 'mean|log ratio|', round(score, 4), 'max ratio', round(worst, 3), 'speech end', round(ws[-1][1], 2))
	for r in rows: print('   ', r)
json.dump({'sent_start': sent_start, 'res': res}, open(HERE / 'pick.json', 'w'), indent=1)
