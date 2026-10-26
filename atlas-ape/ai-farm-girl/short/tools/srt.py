"""Upload subtitles → out/FINAL/sold_everything_ai.en.srt + pt-BR / es translations (same cue timing)
Cues = phrases of voiceover.txt (split at . ? ! — …, max ~42 chars), timed by data/words.json (whisper + waveform); a last cue
carries the CJ meme line (its own sound, not the VO)."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
words = json.load(open(ROOT / 'data/words.json'))

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

SPEED = float(__import__('os').environ.get('SPEED', '1'))   # matches render.mjs SPEED (picture + sound sped up together)

def ts(t):
	t = t / SPEED
	ms = int(round(t * 1000))
	return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'

# the CJ meme after the VO (beat CJ: VO_END → +1.83 s, Short.tsx)
CJ_T0, CJ_T1 = 30.55, 32.38
out = []
for n, c in enumerate(cues, 1):
	a = words[c[0]]['s']
	b = words[c[-1]]['e'] + 0.25
	b = min(b, words[cues[n][0]]['s'] - 0.02) if n < len(cues) else min(b, CJ_T0)
	text = ' '.join(words[k]['w'] for k in c)
	for a_, mark, b_ in PUNCT:  # restore «—» / «…» from voiceover.txt (the aligner splits on them)
		text = re.sub(rf'\b{a_} {b_}\b', f'{a_}{mark}{b_}', text)
		if text.endswith(' ' + a_) or text == a_:
			text += mark.rstrip()
	out.append(f'{n}\n{ts(a)} --> {ts(b)}\n{text}\n')
out.append(f'{len(out) + 1}\n{ts(CJ_T0 + 0.02)} --> {ts(CJ_T1)}\n[Ah sh*t, here we go again]\n')
p = ROOT / 'out/FINAL/sold_everything_ai.en.srt'
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text('\n'.join(out), encoding='utf-8')
print(len(out), 'cues →', p)

# translations: one line per EN cue, in order (checked by hand against voiceover.txt, 24.10)
TR = {
	'pt-BR': ['Este homem vendeu tudo o que tinha', 'para conhecer a mulher dos seus sonhos.', 'Ela era viúva e tinha uma fazenda,',
		'e prometeu um lar ao homem certo.', 'Trezentas mil pessoas a seguiam.', 'E ele foi mesmo.', 'Depois de dois dias de ônibus,',
		'ele mostrou a foto dela a desconhecidos.', 'Ninguém nunca a tinha visto.', 'Então ele pediu ajuda a uma rádio.',
		'Foi lá que ele descobriu a verdade:', 'ela nunca foi real.', 'Ela foi criada por IA.', 'O criador dela diz que ela',
		'só estava lá para vender coisas.', 'E ele?', 'De volta para casa, ele disse:', '"Vou encontrar outra.', 'No mesmo lugar.',
		'Eu vou de novo."', '[Ah, m*rda, lá vamos nós de novo]'],
	'es': ['Este hombre vendió todo lo que tenía', 'para conocer a la mujer de sus sueños.', 'Ella era viuda y tenía una granja,',
		'y le prometió un hogar al hombre indicado.', 'Trescientas mil personas la seguían.', 'Y él de verdad fue.', 'Tras dos días en autobús,',
		'les mostró su foto a desconocidos.', 'Nadie la había visto nunca.', 'Así que pidió ayuda a una radio.', 'Allí descubrió la verdad:',
		'ella nunca fue real.', 'Fue creada con IA.', 'Su creador dice que ella', 'solo estaba ahí para vender cosas.', '¿Y él?',
		'Ya en casa, dijo:', '"Encontraré otra.', 'En el mismo lugar.', 'Voy a volver."', '[Ah, m*erda, aquí vamos otra vez]'],
}
for lang, lines in TR.items():
	assert len(lines) == len(out), (lang, len(lines), len(out))
	tr = []
	for cue, line in zip(out, lines):
		n, tl = cue.split('\n')[:2]
		tr.append(f'{n}\n{tl}\n{line}\n')
	q = ROOT / f'out/FINAL/sold_everything_ai.{lang}.srt'
	q.write_text('\n'.join(tr), encoding='utf-8')
	print(len(tr), 'cues →', q)
