"""Upload subtitles → out/FINAL/the_pig_war_v2.en.srt
Cues = phrases of voiceover.txt (split at . ? ! — …, max ~42 chars), timed by data/words.json (whisper + waveform)."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
words = json.load(open(ROOT / 'data/words_vo.json'))

# sentences (by punctuation / long pauses), then long ones split at the word boundary closest to the middle
sents, cur = [], []
for i, w in enumerate(words):
	cur.append(i)
	nxt = words[i + 1] if i + 1 < len(words) else None
	if re.search(r'[.?!:]$', w['w']) or w['w'].endswith('…') or nxt is None or (nxt['s'] - w['e'] > 0.45):
		sents.append(cur)
		cur = []
cues = []
for c in sents:
	text = ' '.join(words[k]['w'] for k in c)
	if len(text) <= 44:
		cues.append(c)
		continue
	best, bd = 1, 1e9
	for j in range(1, len(c)):
		left = len(' '.join(words[k]['w'] for k in c[:j]))
		d = abs(left - len(text) / 2) - (8 if re.search(r'[,—]$', words[c[j - 1]]['w']) else 0)
		if d < bd:
			best, bd = j, d
	cues += [c[:best], c[best:]]

script = (ROOT.parent / 'voiceover.txt').read_text(encoding='utf-8')
PUNCT = [(m.group(1), m.group(2), m.group(3)) for m in re.finditer(r"([A-Za-z']+)( — |… )([A-Za-z']+)", script)]

def ts(t):
	ms = int(round(t * 1000))
	return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'

out = []
for n, c in enumerate(cues, 1):
	a = words[c[0]]['s']
	b = words[c[-1]]['e'] + 0.25
	if n < len(cues):
		b = min(b, words[cues[n][0]]['s'] - 0.02)
	text = ' '.join(words[k]['w'] for k in c)
	for a_, mark, b_ in PUNCT:  # restore «—» / «…» from voiceover.txt (the aligner splits on them)
		text = re.sub(rf'\b{a_} {b_}\b', f'{a_}{mark}{b_}', text)
		if text.endswith(' ' + a_) or text == a_:
			text += mark.rstrip()
	out.append(f'{n}\n{ts(a)} --> {ts(b)}\n{text}\n')
p = ROOT / 'out/FINAL/the_pig_war_v2.en.srt'
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text('\n'.join(out), encoding='utf-8')
print(len(out), 'cues →', p)
