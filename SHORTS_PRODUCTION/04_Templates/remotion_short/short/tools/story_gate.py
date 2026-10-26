"""Story gates G1–G6 of the editing standard (4.0, audit 25.10): what every Short must have before it is built.

  python3 tools/story_gate.py                 render-free: data/words.json + ../EDIT_PLAN.md + project.json (+ the series card)
  python3 tools/story_gate.py --json          same, {"errors": [...], "warnings": [...], "ok": [...], "info": [...]} for check.mjs п. 15
  python3 tools/story_gate.py --video <mp4>   after the render (qa.sh): OCR of frames 0–10 s — dates and captions on screen (G1)
  STORY_ROOT=<project>/short …                run on another project (tests; check.mjs and qa.sh always pass their own root)

What the script can and cannot see — it flags, a person decides: read the VO and the frames of 0–10 s yourself as well.
  G1  0–10 s of the VO — dates, names and places at a minimum, not a ban (owner 25.10 evening: «минимально, не перебором»):
      one date alone = warning; two dates, or a date plus a name / place («1935, Hawaii», «Lyman Cutlar, June 1859») = error
      (a month next to its year counts as one date). A date: a year that is clearly a date (digits after «in / by / since /
      of …» or before punctuation, «1990s», «'59», «nineteen fifty-nine», «eighteen-oh-five», «the twenties», «two thousand and three»), a month (May / March only when
      they read as months, «Sept.»). Warning: a number that may be a year or a count («1500 soldiers», «fourteen sixty men»),
      a capitalised word that does not start a sentence, or one that starts a sentence and is not a common English word
      (/usr/share/dict/words) — one name or place may stay if it helps, more is backstory; a country / army that IS the conflict may stay
      («America and Britain almost went to war»); a checked word goes into project.json "story_allow": ["Word", …]. Meta phrases
      («not even the craziest», «let me», «before we»…) = warning. Prints the VO of 0–5 s and 5–10 s for the manual check «setup
      said by 5.0 s, the next line opens how? / what next?». German channels (de-…): German months, no capitalisation check.
  G2  twist from the header line of EDIT_PLAN «Твист: слово <i>/<N> «word»» (i = 0-based index in data/words.json) → its start /
      duration in 0.35–0.55 (> 0.55 = error, < 0.35 = warning); tail from the end of the last word to the end ≤ 1.5 s (error);
      the Short ending before the last word = error.
  G4  ATLAS APE: EDIT_PLAN «Скрин-момент: слово <i> «word» — <fact in one sentence>»: present, word exists (errors); said in the
      last 5 s = warning.
  G5  ATLAS APE: EDIT_PLAN «Серия: <id> · ролик <k>/<n> · переменная: <name> = <value>» with the series card (json block
      {"kind": "series-card"} in ~/shorts/atlas-ape/RESULTS.md, or project.json "results_md" relative to short/). Checked against
      the card: level, voice id named in project.json vo_note (and no FREE key), music file name, length band, memes. Style, ending
      and voice settings are a manual check (the card text). The Short's row in RESULTS.md (slug in the Slug column) missing = warning.
  G6  ATLAS APE: every Atlas window the render will draw (project.atlas incl. the legacy single card, and A/B hooks of project.ab)
      against the card. "none" (owner 25.10: no Atlas in the videos until the owner asks for it) → any window is an error;
      "slot" (for a future card) → each window 1–2 s at the card's corner (atlas_corner) or position (atlas_at); A/B hooks only
      when the card lists the variable atlas and the Short declares it (R2).
Owner deviations: EDIT_PLAN «Отступления от R1–R10 и G1–G7: G2 — …, решение владельца 25.10» turns that gate's threshold errors
into warnings (not structural ones: a missing line, a wrong index, an unknown series); a long tail only when the line also
names «хвост» / tail. The template demo (slug template-demo with
vo_demo.wav) is skipped.
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path(os.environ.get('STORY_ROOT') or HERE.parent)
TAIL_MAX, TW_LO, TW_HI, OPEN_S = 1.5, 0.35, 0.55, 10.0
EPS = 1e-9


def r3(x):
	return round(x * 1000) / 1000


MONTHS = 'January February March April May June July August September October November December'.split()
MONTHS_DE = 'Januar Februar März April Mai Juni Juli August September Oktober November Dezember'.split()
MON_ABBR = re.compile(r'^(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.$')
TEEN = 'eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen'
TENS_STEM = r'(?:twen|thir|for|fif|six|seven|eigh|nine)'
UNIT = r'(?:one|two|three|four|five|six|seven|eight|nine)'
SPELLED = [
	re.compile(rf"\b(?:ten|{TEEN})[\s-]+(?:oh[\s-]+{UNIT}|ten|{TEEN}|{TENS_STEM}ty(?:[\s-]+{UNIT})?|{TENS_STEM}ties)\b", re.I),  # nineteen fifty-nine, ten sixty-six
	re.compile(rf"\b(?:{TEEN})[\s-]+hundreds\b|\b(?:{TEEN})[\s-]+hundred\b(?=\s*(?:$|[.,;:!?…—]|and\b))", re.I),           # the nineteen hundreds, eighteen hundred.
	re.compile(rf"\b(?:two thousand(?:\s+and)?|twenty)[\s-]+(?:{UNIT}|ten|{TEEN}|{TENS_STEM}ty(?:-{UNIT})?)\b", re.I),       # two thousand and three, twenty twelve
	re.compile(rf"\b(?:the|roaring)\s+{TENS_STEM}ties\b", re.I),                                                           # the (roaring) twenties
]
YEAR_IN_TOK = re.compile(r"(?<![\d,£$€.])(?:['’]\d\d(?:s)?(?!\d)|(?:1[0-9]{3}|20[0-9]{2})(?:['’]?s)?(?![\d]|,\d|[a-rt-zA-RT-Z]))")
YEAR_CUE = set('in by since until till of from around circa c ad bc year years early late mid summer winter spring autumn fall '
               'before after during back born died'.split()) | {m.lower() for m in MONTHS}
META = re.compile(r"\b(?:not even the (?:craziest|weirdest|strangest)|let me|before we|in this video|here'?s (?:the|what|why|how)"
                  r"|you won'?t believe|this is the story|the story of|but first|let'?s)\b", re.I)
NOT_NAMES = {'I', "I'm", "I'd", "I'll", "I've", 'OK', 'TV'}
QUOTE = r'(?:«([^»]+)»|"([^"]+)"|“([^”]+)”|„([^“”]+)[“”])'
HOMO = str.maketrans('АВЕКМНОРСТХаеорсух', 'ABEKMHOPCTXaeopcyx')
STOP = {'the', 'and', 'but', 'for', 'with', 'from', 'this', 'that', 'his', 'her', 'they', 'then', 'was', 'were'}
try:
	DICT = {l.strip() for l in open('/usr/share/dict/words', encoding='utf-8') if l[:1].islower()}
except OSError:
	DICT = set()


def common_word(tok):
	"""a capitalised sentence-start word that is an ordinary English word (not a name or a place)."""
	if not DICT:
		return True
	c = re.sub(r"['’](s|re|ve|ll|d|t|m)$", '', tok.lower())
	parts = [p for p in re.split(r'[-–]', c) if p]

	def one(p):
		cands = {p} | {p[:-len(s)] for s in ('s', 'es', 'ed', 'd', 'ing', 'ly') if p.endswith(s) and len(p) > len(s) + 2}
		if p.endswith('ies'):
			cands.add(p[:-3] + 'y')
		return any(x in DICT for x in cands)
	return bool(parts) and all(one(p) for p in parts)


def load_json(p, default=None):
	try:
		return json.loads(Path(p).read_text(encoding='utf-8'))
	except Exception:
		return default


def read_plan():
	p = ROOT.parent / 'EDIT_PLAN.md'
	return p.read_text(encoding='utf-8') if p.exists() else ''


def plan_line(plan, label):
	for line in plan.splitlines():
		m = re.match(rf'\s*(?:[-*]\s+)?(?:\*\*)?{label}(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$', line, re.I)
		if m:
			return m.group(1).strip()
	return None


def placeholder(v):
	return v is None or not v.strip() or v.strip().startswith('<') or re.match(r'^(нет|none|—|-)\s*$', v.strip(), re.I)


def word_ref(text):
	"""«слово 97/140 «wasn't»» → (97, 140, "wasn't"); quotes «» "" “” „“; None when there is no index."""
	m = re.search(rf'слово\s+(\d+)(?:\s*/\s*(\d+))?(?:\s*{QUOTE})?', text or '', re.I)
	if not m:
		return None, None, None
	q = next((g for g in m.groups()[2:] if g), None)
	return int(m.group(1)), (int(m.group(2)) if m.group(2) else None), q


def norm(s):
	return re.sub(r'[^a-z0-9]', '', str(s or '').lower())


def channel_of(project):
	return re.sub(r'[\s_]+', '-', str(project.get('channel') or 'atlas-ape').strip().lower())


def results_path(project):
	p = Path(os.path.expanduser(project.get('results_md') or '~/shorts/atlas-ape/RESULTS.md'))
	return p if p.is_absolute() else ROOT / p


def series_card(sid, project):
	p = results_path(project)
	if not p.exists():
		return None, p, ''
	txt = p.read_text(encoding='utf-8')
	for block in re.findall(r'```json\s*\n(.*?)```', txt, re.S):
		try:
			card = json.loads(block)
		except Exception:
			continue
		if card.get('kind') == 'series-card' and str(card.get('series')).translate(HOMO).lower() == str(sid).translate(HOMO).lower():
			return card, p, txt
	return None, p, txt


def atlas_windows(project, words, dur):
	"""[(window, t0, t1)] of everything the render draws: project.atlas (also the legacy single card) + A/B hooks (R2)."""
	tools = ROOT / 'tools/atlas' if (ROOT / 'tools/atlas/common.py').exists() else HERE / 'atlas'
	sys.path.insert(0, str(tools))
	try:
		import common
		block = common.atlas_block(project)
		if not block:
			return []
		return [(w, *common.window_times(w, words, dur)) for w in block['windows']]
	finally:
		sys.path.pop(0)


class Out:
	def __init__(self):
		self.E, self.W, self.OK, self.INFO = [], [], [], []

	def err(self, gate, msg, soft=True):
		"""soft = a threshold an owner deviation may override; hard = structural (missing line, wrong index …)."""
		self.E.append((gate, msg, soft))


def n_dates(found):
	"""distinct dates among the sure hits: a month next to its year («June 1859») is one date."""
	months = sum(1 for s in found if s.startswith('month '))
	years = len(found) - months
	return years + max(0, months - years)


def g1_vo(o, words, ch_de, allow):
	op = [w for w in words if w['s'] < OPEN_S]
	months = MONTHS + (MONTHS_DE if ch_de else [])
	o.INFO.append(f'G1 VO 0–5 s: «{" ".join(w["w"] for w in op if w["s"] < 5.0)}»')
	o.INFO.append(f'G1 VO 5–10 s: «{" ".join(w["w"] for w in op if w["s"] >= 5.0)}» → by eye: setup said by 5.0 s, this line '
	              'opens how? / what next? (not who? / when?)')
	strong, weak, names = [], [], []
	for i, w in enumerate(op):
		raw = w['w']
		tok = raw.strip('«»"“”‘’()[],;:!?…')
		core = re.sub(r"['’]s$", '', tok.rstrip('.'))
		if not tok or tok in allow or core in allow:
			continue
		prev = op[i - 1]['w'] if i else ''
		nxt = op[i + 1]['w'] if i + 1 < len(op) else ''
		prev_core = prev.strip('«»"“”‘’()[],;:!?…—').lower()
		sentence_start = i == 0 or bool(re.search(r'[.!?…]["»”’)]*$', prev))
		years = list(YEAR_IN_TOK.finditer(raw)) or list(re.finditer(r'(?<=c\.)(?:1[0-9]{3}|20[0-9]{2})\b', raw))
		if years:
			y = years[0].group(0)
			after = raw[years[0].end():]
			sure = (y[0] in "'’" or y.endswith('s') or prev_core in YEAR_CUE or raw.startswith('(') or 'c.' in raw or bool(re.match(r'\s*[.,;:!?…—–-]', after))
			        or not nxt or bool(re.match(r'^[.,;:!?…—–-]', nxt)) or nxt.strip('.,').title() in months)
			(strong if sure else weak).append(f'«{tok}» at {w["s"]:.1f} s')
			continue
		if core.lower() in {mo.lower() for mo in months} and core[:1].islower() and prev_core in YEAR_CUE - {'march', 'may'}:
			strong.append(f'month «{tok}» at {w["s"]:.1f} s')
			continue
		if core in months or MON_ABBR.match(tok):
			ambiguous = core in ('May', 'March', 'Mai')
			num_next = bool(re.match(r'^\d', nxt)) or nxt.lower() == 'of'
			if not ambiguous or num_next or (not sentence_start and core != 'March'):
				strong.append(f'month «{tok}» at {w["s"]:.1f} s')
			continue
		if ch_de or not core[:1].isupper() or core in NOT_NAMES or re.match(r'^\d', core):
			continue
		if not sentence_start or not common_word(core):
			names.append(f'«{tok}» at {w["s"]:.1f} s')
	text = ' '.join(w['w'] for w in op)
	for k, rx in enumerate(SPELLED):
		for m in rx.finditer(text):
			tail = text[m.end():]
			before = text[:m.start()].split()
			sure = (bool(re.match(r'\s*(?:$|[.,;:!?…—])', tail)) or (bool(before) and before[-1].lower().strip('.,') in YEAR_CUE)
			        or k == 3 or 'hundreds' in m.group(0).lower() or ' oh' in m.group(0).lower() or '-oh' in m.group(0).lower() or bool(re.search(r'ties\b', m.group(0), re.I)))
			(strong if sure else weak).append(f'«{m.group(0)}»')
	nd = n_dates(strong)
	if nd >= 2 or (nd and names):
		o.err('G1', 'G1 0–10 s of the VO pile up dates / names / places (standard 4.0 G1, H4: a minimum — one at most): '
		      + '; '.join(strong + names) + ' — keep one, move the rest after 10 s (a checked word → project.json "story_allow")')
	elif nd:
		o.W.append('G1 one date in 0–10 s of the VO: ' + '; '.join(strong) + ' — allowed if it helps the hook (owner 25.10: a minimum, '
		           'not a ban); a second date or a name / place next to it = error')
	else:
		o.OK.append('G1 0–10 s of the VO: no year or month that reads as a date')
	if weak:
		o.W.append('G1 numbers in 0–10 s that may be years: ' + '; '.join(weak) + ' — a year → after 10 s; a count may stay')
	if names:
		o.W.append('G1 proper nouns in 0–10 s of the VO: ' + '; '.join(names) + ' — one name or place may stay if it helps, more → after 10 s; '
		           'a country / army that is the conflict may stay; checked → project.json "story_allow"')
	for m in META.finditer(text):
		o.W.append(f'G1 meta phrase in 0–10 s: «{m.group(0)}» — the second line must raise the stakes, not talk about the story (H13)')


def gates():
	o = Out()
	project = load_json(ROOT / 'project.json', {}) or {}
	words = [dict(w, w=str(w.get('w') or '').strip()) for w in (load_json(ROOT / 'data/words.json', []) or [])]
	words = [w for w in words if w['w']]
	plan = read_plan()
	if project.get('slug') == 'template-demo' and project.get('vo') == 'vo_demo.wav':
		o.OK.append('story gates: template demo — skipped')
		return o, plan
	if not words:
		o.err('G0', 'data/words.json missing or empty — tools/align.py first', soft=False)
		return o, plan
	last = words[-1]
	dur = r3(project['duration'] if project.get('duration') is not None else last['e'] + (project.get('tail_s') or 0))
	if dur <= 0:
		o.err('G0', f'project.json duration {dur} — the length must be positive', soft=False)
		return o, plan
	ch = channel_of(project)
	ch_de = ch.startswith('de-')
	atlas_ape = not ch_de and ch in ('atlas-ape', 'atlasape')
	plan_ch = plan_line(plan, 'Канал')
	if plan_ch and not placeholder(plan_ch):
		pc = re.sub(r'[\s_]+', '-', plan_ch.split()[0].lower())
		if pc.startswith('de-') != ch_de or (not pc.startswith('de-') and pc.startswith('atlas') != atlas_ape):
			o.err('G0', f'channel: EDIT_PLAN «Канал: {plan_ch[:30]}» ≠ project.json "{project.get("channel")}" — make them the same', soft=False)
	allow = set(project.get('story_allow') or [])

	# ---- G1
	g1_vo(o, words, ch_de, allow)

	# ---- G2: twist window and tail
	hdr = next((l for l in plan.splitlines() if re.match(r'\s*(?:[-*]\s+)?(?:\*\*)?Уровень', l) and 'Твист' in l), None)
	m_tw = re.search(r'Твист(?:\*\*)?\s*:\s*(?:\*\*)?([^·\n]*)', hdr or plan)
	ti, tn, tword = word_ref(m_tw.group(1) if m_tw else '')
	if ti is None:
		o.err('G2', 'G2 the EDIT_PLAN header has no «Твист: слово <i>/<N> «word»» (i = 0-based index in data/words.json) — the twist window cannot be checked', soft=False)
	elif ti >= len(words):
		o.err('G2', f'G2 twist word {ti} does not exist (data/words.json has {len(words)} words, indexes 0–{len(words) - 1})', soft=False)
	elif tword and norm(tword) != norm(words[ti]['w']):
		near = [k for k in range(max(0, ti - 3), min(len(words), ti + 4)) if norm(words[k]['w']) == norm(tword)]
		o.err('G2', f'G2 twist word {ti} is «{words[ti]["w"]}», EDIT_PLAN says «{tword}»'
		      + (f' — it is word {near[0]} (indexes start at 0)' if near else ' — fix the index'), soft=False)
	else:
		if not tword:
			o.W.append(f'G2 the twist line names no word in quotes («…» / "…" / “…”) — index {ti} = «{words[ti]["w"]}» is not verified')
		if tn is not None and tn != len(words):
			o.W.append(f'G2 «/{tn}» in the twist line, data/words.json has {len(words)} words')
		r_t, r_w = words[ti]['s'] / dur, ti / len(words)
		msg = (f'G2 twist «{words[ti]["w"]}» at {words[ti]["s"]:.2f} s = {r_t:.1%} of {dur:.2f} s (word {ti}/{len(words)} = {r_w:.0%}); '
		       f'window {TW_LO:.0%}–{TW_HI:.0%}')
		if r_t > TW_HI + EPS:
			o.err('G2', msg + ' — too late: most viewers leave before it (standard 4.0 G2, R12)')
		elif r_t < TW_LO - EPS:
			o.W.append(msg + ' — early: check line 1 does not spoil it (H2)')
		else:
			o.OK.append(msg)
	tail = r3(dur - last['e'])
	if tail < -EPS:
		o.err('G2', f'G2 the Short ends {-tail:.2f} s before the last word «{last["w"]}» ends (project.json duration)', soft=False)
	elif tail > TAIL_MAX + EPS:
		o.err('G2:tail', f'G2 tail {tail:.2f} s from the last word «{last["w"]}» to the end > {TAIL_MAX} s (F1) — cut the outro, loop into frame 0')
	else:
		o.OK.append(f'G2 tail {tail:.2f} s ≤ {TAIL_MAX} s')
	o.INFO.append(f'G2 length {dur:.1f} s (series band in the card; standard R10 30–45 s, cap 59 s)')

	if not atlas_ape:
		o.OK.append(f'G4–G6 skipped: channel «{ch}» is not ATLAS APE')
		return o, plan

	# ---- G4: screenshot moment
	sm = plan_line(plan, r'Скрин[-\s]?момент')
	if placeholder(sm):
		o.err('G4', 'G4 EDIT_PLAN has no «Скрин-момент: слово <i> «word» — <fact more absurd than lines 1–2, retold in one sentence>» (standard 4.0 G4)', soft=False)
	else:
		si, _, sword = word_ref(sm)
		if si is None or si >= len(words):
			o.err('G4', f'G4 «Скрин-момент» needs «слово <i> «word»» with a 0-based index in data/words.json: «{sm[:80]}»', soft=False)
		elif sword and norm(sword) != norm(words[si]['w']):
			o.err('G4', f'G4 screenshot word {si} is «{words[si]["w"]}», EDIT_PLAN says «{sword}»', soft=False)
		elif words[si]['s'] > dur - 5:
			o.W.append(f'G4 screenshot moment at {words[si]["s"]:.1f} s sits in the last 5 s — put it in the body or on the twist (only-in-the-finale is what got 0 shares)')
		else:
			o.OK.append(f'G4 screenshot moment at {words[si]["s"]:.1f} s: {sm.split("—", 1)[-1].strip()[:90]}')

	# ---- G5: frozen series
	se = plan_line(plan, 'Серия')
	if placeholder(se):
		o.err('G5', 'G5 EDIT_PLAN has no «Серия: <id> · ролик <k>/<n> · переменная: <name> = <value>» (standard 4.0 G5, ~/shorts/atlas-ape/RESULTS.md)', soft=False)
		return o, plan
	m = re.match(r'\s*([A-Za-zА-Яа-я0-9_-]+)', se)
	sid = (m.group(1) if m else '').translate(HOMO)
	card, rp, rtxt = series_card(sid, project)
	if not card:
		o.err('G5', f'G5 no series card «{sid}» (```json {{"kind": "series-card", "series": "{sid}", …}}```) in {rp}', soft=False)
		return o, plan
	allowed = card.get('variables') or []
	mv = re.search(r'переменная\s*:\s*([\w-]+)\s*(=\s*\S)?', se, re.I)
	var = mv.group(1) if mv else None
	mk = re.search(r'ролик\s+(\d+)\s*/\s*(\d+)', se, re.I)
	if not mk:
		o.err('G5', 'G5 «Серия» has no «ролик <k>/<n>»', soft=False)
	elif not (1 <= int(mk.group(1)) <= int(mk.group(2)) <= int(card.get('size') or 99)):
		o.err('G5', f'G5 «ролик {mk.group(1)}/{mk.group(2)}»: k must be 1…n and n ≤ the card size {card.get("size")}', soft=False)
	if not var:
		o.err('G5', f'G5 «Серия» names no variable («переменная: <name> = <value>»); allowed: {", ".join(allowed)}', soft=False)
	elif var not in allowed:
		o.err('G5', f'G5 variable «{var}» is not in the series card ({", ".join(allowed)}) — one declared variable per Short', soft=False)
	elif not mv.group(2):
		o.err('G5', f'G5 variable «{var}» has no value («переменная: {var} = <value>»)', soft=False)
	else:
		o.OK.append(f'G5 series {sid}, {mk.group(0) if mk else ""}, variable «{var}»')
	d5 = []
	level = project.get('level') or 'L2'
	if card.get('level') and level != card['level'] and var != 'level':
		d5.append(f'level {level} ≠ {card["level"]}')
	vo_note = project.get('vo_note') or ''
	if card.get('voice_id') and card['voice_id'] not in vo_note and var != 'voice':
		d5.append(f'voice: project.json vo_note does not name {card["voice_id"]}')
	if re.search(r'\bFREE\b', vo_note):
		o.err('G7', 'G7 project.json vo_note says FREE — ATLAS APE voices come from the PAID key only (A7)', soft=False)
	if card.get('music') and Path(project.get('music') or '').name != card['music'] and var != 'music':
		d5.append(f'music {Path(project.get("music") or "").name or "none"} ≠ {card["music"]}')
	lo, hi = (card.get('length_s') or [0, 59])
	if not (lo - EPS <= dur <= hi + EPS) and var != 'length':
		d5.append(f'length {dur:.1f} s outside {lo}–{hi} s')
	memes_dir = ROOT / 'public/memes'
	if card.get('memes') == 'none' and memes_dir.exists() and any(p for p in memes_dir.iterdir() if not p.name.startswith('.')):
		d5.append('memes: the card says none, public/memes/ is not empty')
	if d5:
		o.err('G5', f'G5 differs from the frozen series card {sid} ({rp}): ' + '; '.join(d5) + ' — keep the card or declare that one thing as the variable')
	else:
		o.OK.append(f'G5 level, voice id, music, length, memes match series card {sid} (style, ending, voice settings: by eye)')
	if project.get('slug') and not re.search(rf'^\|[^|\n]*\|\s*{re.escape(project["slug"])}\s*\|', rtxt, re.M):
		o.W.append(f'G5 {rp.name} has no row for {project["slug"]} yet — add it before upload (9F: date, variable = value, topic)')

	# ---- G6: Atlas by the card
	try:
		wins = atlas_windows(project, words, dur)
	except Exception as e:
		o.err('G6', f'G6 Atlas windows could not be read ({type(e).__name__}: {e})', soft=False)
		return o, plan
	mode, d6 = card.get('atlas', 'none'), []
	atlas_test = var == 'atlas' and 'atlas' in allowed
	for w, t0, t1 in wins:
		name = w.get('pose') or w.get('card') or '?'
		if w.get('hook'):
			if not atlas_test:
				d6.append(f'A/B hook window ({w.get("variant")}, {name}) — Atlas in frame 0 only as the declared variable atlas (R2)')
			continue
		if mode == 'none':
			d6.append(f'window {name} {t0:.1f}–{t1:.1f} s — the card says no Atlas in the video (owner 25.10: none until the owner asks)')
		elif mode == 'slot':
			at_ok = (w.get('corner') == card.get('atlas_corner')) if card.get('atlas_corner') else (list(w.get('at') or []) == list(card.get('atlas_at') or []))
			if not at_ok or not (1.0 - EPS <= t1 - t0 <= 2.0 + EPS):
				d6.append(f'window {name}: {w.get("corner") or w.get("at")} / {t1 - t0:.1f} s, the card says {card.get("atlas_corner") or card.get("atlas_at")} and 1–2 s')
	if d6 and not atlas_test:
		o.err('G6', 'G6 Atlas differs from the series card: ' + '; '.join(d6))
	elif d6:
		o.W.append('G6 Atlas differs from the card, declared as the variable atlas: ' + '; '.join(d6))
	else:
		o.OK.append(f'G6 Atlas matches the series card ({mode}, {len(wins)} window(s))')
	return o, plan


def ocr_opening(video):
	"""G1 on screen: OCR frames 0–10 s every 0.5 s. One date on screen = warning, two or more = error (a minimum, not a ban); a 4-digit number that may be a count, and capitalised
	words that are not spoken in 0–10 s = warnings (captions to check by eye)."""
	o = Out()
	project = load_json(ROOT / 'project.json', {}) or {}
	ch_de = channel_of(project).startswith('de-')
	months = MONTHS + (MONTHS_DE if ch_de else [])
	ocr_bin = HERE.parent / 'out/.ocr'
	ocr_bin.parent.mkdir(exist_ok=True)
	if not ocr_bin.exists() or ocr_bin.stat().st_mtime < (HERE / 'ocr.swift').stat().st_mtime:
		subprocess.run(['swiftc', '-O', str(HERE / 'ocr.swift'), '-o', str(ocr_bin)], check=True)
	words = load_json(ROOT / 'data/words.json', []) or []
	spoken = set()
	for w in words:
		if (w.get('s') if w.get('s') is not None else 99) < OPEN_S + 1:
			t = str(w.get('w') or '')
			spoken |= {norm(t)} | {norm(p) for p in re.split(r'[-–—]', t)}
	with tempfile.TemporaryDirectory() as td:
		subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', video, '-t', str(OPEN_S), '-vf', 'fps=2', f'{td}/f_%03d.jpg'], check=True)
		out = subprocess.run([str(ocr_bin), td], capture_output=True, text=True, check=True).stdout
	dates, maybe, caps = {}, {}, {}
	for line in out.splitlines():
		if not line.strip():
			continue
		j = json.loads(line)
		t = (int(re.search(r'(\d+)', j['file']).group(1)) - 1) / 2
		for l in j['lines']:
			if l['conf'] < 0.4:
				continue
			txt = l['text']
			has_month = [mo for mo in months if re.search(rf'\b{mo}\b', txt, re.I) and norm(mo) not in spoken]
			for mo in has_month:
				dates.setdefault(mo.title(), t)
			for m in YEAR_IN_TOK.finditer(txt):
				y = m.group(0)
				rest = (txt[:m.start()] + txt[m.end():]).strip(' .,·:;—–-')
				prev = txt[:m.start()].split()[-1].lower().strip('.,') if txt[:m.start()].split() else ''
				sure = (bool(has_month) or y[0] in "'’" or y.endswith('s') or not rest or prev in YEAR_CUE
				        or bool(re.match(r'\s*[·,.:;—–-]', txt[m.end():])))
				(dates if sure else maybe).setdefault(y, t)
			for tok in re.findall(r"[A-Z][A-Za-z'’-]+", txt):
				if (norm(tok) not in spoken and tok not in NOT_NAMES and len(tok) > 2 and tok.lower() not in STOP
				        and tok.title() not in months and not all(norm(p) in spoken for p in re.split(r'[-–]', tok))):
					caps.setdefault(tok, t)
	listed = ', '.join(f'«{k}» at {v:.1f} s' for k, v in dates.items())
	nd = n_dates([k if re.match(r"^['’\d]", k) else 'month ' + k for k in dates])
	if nd >= 2:
		o.err('G1', f'G1 on screen in 0–10 s: {listed} — more than one date in the opening (4.0 G1: a minimum, one at most)')
	elif nd:
		o.W.append(f'G1 one date on screen in 0–10 s: {listed} — allowed if it helps; a second one = error')
	else:
		o.OK.append('G1 on screen 0–10 s: no date')
	if maybe:
		o.W.append('G1 numbers on screen in 0–10 s that may be years: ' + ', '.join(f'«{k}» {v:.1f} s' for k, v in maybe.items()))
	if caps:
		items = list(caps.items())
		o.W.append('G1 on screen in 0–10 s, not spoken: ' + ', '.join(f'«{k}» {v:.1f} s' for k, v in items[:20])
		           + (f' … and {len(items) - 20} more' if len(items) > 20 else '') + ' — a name / place caption moves after 10 s')
	return o


def owner_deviations(o, plan):
	"""EDIT_PLAN «Отступления от R1–R10 и G1–G7: G2 — …, решение владельца 25.10» → that gate's soft errors become warnings."""
	line = next((l for l in plan.splitlines() if re.match(r'\s*(?:[-*]\s+)?(?:\*\*)?(Отступления\s+от\s+[RG]1|deviations?\b)', l, re.I)), '')
	text = re.sub(r'^[^:]*:', '', line)
	if not text.strip() or re.match(r'\s*(<|нет(?![а-яё])|none\b|—\s*$|-\s*$)', text, re.I):
		return
	gs = set(re.findall(r'\b[GgГ]([1-7])\b', text))
	if not gs:
		return
	if not re.search(r'решени\w*\s+владельца\s+\d{1,2}\.\d{1,2}', text, re.I):
		o.W.append(f'owner deviation for G{", G".join(sorted(gs))} ignored: the line needs «решение владельца <дд.мм>»')
		return
	keep = []
	tail_named = bool(re.search(r'хвост|tail', text, re.I))
	for gate, msg, soft in o.E:
		g = gate.split(':')[0][1:]
		if soft and g in gs and (not gate.endswith(':tail') or tail_named):
			o.W.append(msg + ' — owner deviation in EDIT_PLAN')
		else:
			keep.append((gate, msg, soft))
	o.E = keep


if __name__ == '__main__':
	args = sys.argv[1:]
	if '--video' in args:
		o = ocr_opening(args[args.index('--video') + 1])
		owner_deviations(o, read_plan())
	else:
		o, plan = gates()
		owner_deviations(o, plan)
	E = [m for _, m, _ in o.E]
	if '--json' in args:
		print(json.dumps({'errors': E, 'warnings': o.W, 'ok': o.OK, 'info': o.INFO}, ensure_ascii=False))
	else:
		for m in o.INFO: print('·', m)
		for m in o.OK: print('✓', m)
		for m in o.W: print('!', m)
		for m in E: print('✗', m)
		print(f'\n{len(E)} problem(s), {len(o.W)} warning(s)' if E else f'\nstory gates passed ({len(o.W)} warning(s))')
	sys.exit(1 if E else 0)
