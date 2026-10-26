"""Fetch ONE asset into this project's public/ together with its licence (standard 5 and 9D, ASSET_LIBRARY.md 0).
  python3 tools/fetch_asset.py lib <path under 03_Assets> [--as NAME]        copy from the library
  python3 tools/fetch_asset.py pixabay images|videos <id> [--as NAME]       download via ~/shorts/tools/pixabay.py
  python3 tools/fetch_asset.py freesound <id> [--as NAME]                   download via ~/shorts/tools/freesound.py
options
  --to SUBDIR        public/ subfolder instead of the default route (sfx music memes video img fx lottie fonts luts)
  --desc TEXT        description (SFX index / CREDITS)           --cat NAME    SFX category (default: library folder / misc)
  --loop / --bed     SFX index flags                             --transient S  override the computed SFX transient_at
  --from S --dur S   cut a clip (audio removed); a meme clip > 1.5 s needs it (R7)    --risk TEXT  meme risk (низкий/средний/высокий)
  --set-music        music: point project.json music / music_license at the copy
  --download         Pixabay / Freesound id that is already in 03_Assets: download anyway instead of copying the library file
  --force            overwrite a different file of the same name in public/       --dry-run   show the plan, write nothing
What it does
  1. finds the licence record for the file in 02_Research/download_logs/*.json (library file, or the helper's new log entry);
  2. refuses: 03_Assets/_quarantine and every file name found there, records in a «quarantined» log array, Mixkit (*_mixkit.*,
     any «mixkit» in path / source), FREE-key ElevenLabs (*_el.wav, crowd_cheer_short), non-commercial / restricted / ND licences,
     files without a licence record, Pixabay music, 1920s US silent films on a German channel (L6), Atlas parts (owner art only);
  3. copies byte-for-byte (sha256 stays as logged) into public/<route>/; SFX are converted to WAV 48 kHz / 16 bit, peak −3 dBFS
     (tools/mix.py reads public/sfx/<name>.wav); meme clips are cut and always lose their audio (R7);
  4. writes one line per file in CREDITS.md (source, licence, author, attribution text for CC BY) in the matching section,
     for memes in the R7 format (источник / владелец / риск) and prints the «Мем:» line for ../EDIT_PLAN.md;
  5. SFX: adds / replaces the public/sfx/index.json entry (name, file, duration, transient_at / onset_at / audible_end from the
     waveform, source, license, attribution, description, loop, bed …).
Downloads go to a new folder data/fetch/<source>_<id>/ first (the helper logs that file), then into public/.
python3 without -I (numpy from the user site-packages); the helpers themselves run with -I (stdlib only).
"""
import glob, hashlib, json, os, re, shutil, subprocess, sys, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]                      # short/
PUB = ROOT / 'public'
P = json.load(open(ROOT / 'project.json', encoding='utf-8'))
LIB = Path(P.get('library_root') or os.path.expanduser('~/shorts/SHORTS_PRODUCTION'))
ASSETS = LIB / '03_Assets'
QDIR = ASSETS / '_quarantine'
LOGS = LIB / '02_Research/download_logs'
HELPERS = Path(os.path.expanduser('~/shorts/tools'))
SR = 48000
PEAK_DB = -3.0
MEME_MAX = 1.5
# library folder → public/ subfolder (first match wins)
ROUTES = [('Sound_Effects/', 'sfx'), ('Music/', 'music'), ('Memes_Reactions/', 'memes'),
          ('Cinematic_Effects/pd_film_inserts/', 'video'), ('Cinematic_Effects/pd_gov_footage/', 'video'),
          ('Cinematic_Effects/', 'fx'), ('Overlays/', 'fx'), ('Transitions/', 'fx'), ('Graphics/', 'img'),
          ('Animations/', 'lottie'), ('Fonts/', 'fonts'), ('Templates_Presets/LUTs/', 'luts')]
# CREDITS.md section per public/ subfolder: (heading regex, heading written when missing)
SECTIONS = {'sfx': (r'^##\s.*(звук|sfx|sound)', '## Звук (`public/sfx`, пики нормализованы до −3 dBFS)'),
            'music': (r'^##\s.*(музык|music)', '## Музыка'),
            'memes': (r'^##\s.*(мем|meme)', '## Мемы (R7: ≤ 1.5 s, без звука, ≤ 2)')}
VISUAL = (r'^##\s.*(график|видео|graphic|visual)', '## Графика и видео')
# same gates as tools/check.mjs (section 8) and tools/qa.sh
FORBIDDEN = re.compile(r'(_el\.wav$|crowd_cheer_short|_quarantine|rolling_eyes|baker_1946|safety_last)', re.I)
MIXKIT = re.compile(r'mixkit', re.I)
NONCOMM = re.compile(r'(\bNC\b|-NC\b|/by-nc|non-?commercial|personal use|personal,|\brestricted\b|sampling\+)', re.I)
NODERIV = re.compile(r'(\bND\b|-ND\b|/by-nd|/by-nc-nd|no-?deriv)', re.I)
US20S = re.compile(r'pdfilm_(lloyd|crowd_gasps|keaton|train_bridge)', re.I)
MEDIA_V = ('.mp4', '.m4v', '.mov', '.webm', '.mkv', '.gif')


def die(msg):
	sys.exit(f'✗ {msg}')


def note(msg):
	print(f'! {msg}')


def ok(msg):
	print(f'✓ {msg}')


def sha256(p):
	h = hashlib.sha256()
	with open(p, 'rb') as f:
		for b in iter(lambda: f.read(1 << 20), b''):
			h.update(b)
	return h.hexdigest()


def rel_lib(p):
	"""path relative to library_root («03_Assets/…»), or the absolute path outside it"""
	p = Path(os.path.realpath(p))
	try:
		return str(p.relative_to(os.path.realpath(LIB)))
	except ValueError:
		return str(p)


# ---------------------------------------------------------------- licence records
def load_records():
	"""every log record that names a file: (key, record, log, section); pack children inherit the pack's licence"""
	out = []
	for f in sorted(glob.glob(str(LOGS / '*.json'))):
		try:
			d = json.load(open(f, encoding='utf-8'))
		except (OSError, ValueError) as e:
			note(f'{os.path.basename(f)} unreadable: {e}')
			continue
		for section, v in (d.items() if isinstance(d, dict) else [('downloaded', d)]):
			if not isinstance(v, list):
				continue
			for r in v:
				if not isinstance(r, dict):
					continue
				k = r.get('file') or r.get('path')
				if isinstance(k, str):
					out.append((k, r, os.path.basename(f), section))
				for c in r.get('files') if isinstance(r.get('files'), list) else []:
					if isinstance(c, dict) and isinstance(c.get('path'), str):
						out.append((c['path'], {**r, **c, 'file': c['path'], 'pack': k}, os.path.basename(f), section))
	return out


RECORDS = None


def records():
	global RECORDS
	if RECORDS is None:
		RECORDS = load_records()
	return RECORDS


def same_path(key, target):
	k = Path(key) if os.path.isabs(key) else LIB / key
	return os.path.realpath(k) == os.path.realpath(target)


def find_record(target):
	"""licence record for a file (exact path, else the pack folder it sits in); refuses quarantined records"""
	rel = rel_lib(target)
	hits = [x for x in records() if same_path(x[0], target)]
	if not hits:
		hits = [x for x in records() if x[0].endswith('/') and rel.startswith(x[0])]
	if not hits and os.path.isfile(target):                       # moved / copied file (e.g. a project copied with data/fetch)
		h = sha256(target)
		hits = [x for x in records() if x[1].get('sha256') == h]
	for k, r, log, section in hits:
		if section == 'quarantined' or '_quarantine' in k:
			die(f'{rel}: listed in {log} → «{section}» ({r.get("quarantine_reason", "see 03_Assets/_quarantine/README.md")[:120]})')
	hits = [h for h in hits if (h[1].get('license_name') or h[1].get('license'))]
	if not hits:
		die(f'{rel}: no licence record in 02_Research/download_logs/*.json — not in the catalogue, not usable (standard 5)')
	pref = {'downloaded': 0, 'replacements': 0, 'generated_selfmade': 1}
	hits.sort(key=lambda h: pref.get(h[3], 2))
	return hits[0][1], hits[0][2]


def by_source_id(kind, sid):
	"""library file (existing, not quarantined) whose log record points at this Pixabay / Freesound id"""
	pat = {'freesound': rf'freesound\.org/(people/[^/]+/)?sounds/{sid}/?$',
	       'pixabay': rf'pixabay\.com/(videos/id-{sid}|[a-z]+/[\w-]*-{sid})/?$'}[kind]
	for k, r, log, section in records():
		if section == 'quarantined' or not k.startswith('03_Assets/') or '_quarantine' in k:
			continue
		if re.search(pat, r.get('source_page') or '') and (LIB / k).is_file():
			return LIB / k
	return None


def lic_name(r):
	name = (r.get('license_name') or r.get('license') or '').strip()
	url = r.get('license_url') or ''
	m = re.search(r'creativecommons\.org/licenses/([a-z-]+)/(\d\.\d)', url)
	if m and re.fullmatch(r'CC[ -]BY(-[A-Z-]+)?', name.upper()):   # helper writes «CC BY» without the version
		name = f'CC {m.group(1).upper()} {m.group(2)}'
	if 'publicdomain/zero' in url and not name:
		name = 'CC0 1.0'
	return name


def gate(r, *names):
	"""licence and name gates; returns (licence, attribution text or None)"""
	lic = lic_name(r)
	words = ' '.join(str(r.get(k) or '') for k in ('license_name', 'license', 'license_url'))
	src = ' '.join(str(r.get(k)) for k in ('source_name', 'source_page', 'download_url', 'file') if r.get(k))
	qnames = quarantine_names()
	for n in [x for x in names if x]:
		b = os.path.basename(str(n))
		if FORBIDDEN.search(str(n)) or b.lower() in qnames:
			die(f'{b}: FREE-key ElevenLabs / quarantined file (03_Assets/_quarantine/README.md, standard 5)')
		if MIXKIT.search(str(n)):
			die(f'{b}: Mixkit — library Mixkit files are replaced and quarantined (owner decision 24.10, L5)')
	if MIXKIT.search(src):
		die(f'source is Mixkit ({src[:80]}) — not used (L5)')
	if r.get('commercial_ok') is False or re.match(r'\s*no\b', str(r.get('commercial_ok') or ''), re.I) or NONCOMM.search(words):
		die(f'licence «{lic}» is not for a monetised channel (non-commercial / restricted, standard 5)')
	if NODERIV.search(words):
		die(f'licence «{lic}» forbids adaptations (ND) — an edit is an adaptation (standard 5: NC/ND forbidden)')
	if re.search(r'BY-SA|ShareAlike', words, re.I):
		note(f'{lic}: ShareAlike — an adapted copy must itself stay BY-SA; prefer CC0 / CC BY (cf. rolling_eyes in _quarantine)')
	need = bool(r.get('attribution_required')) or bool(re.match(r'CC BY', lic))
	text = (r.get('attribution_text') or '').strip() if need else None
	if text and 'freesound' in str(r.get('source_name') or '').lower() and r.get('source_page') and r['source_page'] not in text:
		text = f"{text} — {r['source_page']}"                      # CC BY 4.0: link the material itself, not only the licence
	if need and not text:
		who = r.get('author') or r.get('artist') or r.get('source_name') or '?'
		text = f"«{r.get('title') or Path(r.get('file', '')).stem}» by {who} — {r.get('source_page', '')} — {lic} ({r.get('license_url', '')})"
	return lic, (re.sub(r'\s*\n\s*', ' · ', text) if text else None)


QNAMES = None


def quarantine_names():
	global QNAMES
	if QNAMES is None:
		QNAMES = set()
		for dp, _, fs in os.walk(QDIR):
			QNAMES.update(f.lower() for f in fs if not f.startswith('.') and not f.upper().startswith('README'))
	return QNAMES


def show_notes(r):
	for k in ('usage_restrictions', 'youtube_risk', 'content_id_risk', 'content_id_note', 'limitations', 'note'):
		v = r.get(k)
		if v:
			note(f'{k}: {str(v)[:220]}')
	mq = str(r.get('match_quality') or '')
	if mq.lower().startswith('partial'):
		note(f'match_quality: {mq[:200]}')


# ---------------------------------------------------------------- audio
def probe(p):
	j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,channels,sample_rate,codec_name,bits_per_raw_sample,sample_fmt',
	                               '-of', 'json', str(p)], capture_output=True, text=True, check=True).stdout)
	a = next((s for s in j.get('streams', []) if s.get('codec_type') == 'audio'), None)
	return float(j.get('format', {}).get('duration') or 0), a, [s.get('codec_type') for s in j.get('streams', [])]


def fps_of(p):
	r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=avg_frame_rate', '-of', 'csv=p=0', str(p)],
	                   capture_output=True, text=True).stdout.strip()
	try:
		n, d = (r.split('/') + ['1'])[:2]
		return float(n) / float(d) if float(d) else 0.0
	except ValueError:
		return 0.0


def envelope(x):
	"""10 ms RMS envelope, 5 ms hop → (dB array, time of frame i)"""
	m2 = (x.astype(np.float64) ** 2).mean(1)
	hop, win = int(0.005 * SR), int(0.010 * SR)
	n = max(1, (len(m2) - win) // hop + 1)
	c = np.concatenate([[0.0], np.cumsum(m2)])
	i = np.arange(n) * hop
	env = np.sqrt(np.maximum((c[np.minimum(i + win, len(m2))] - c[i]) / win, 0) + 1e-20)
	return 20 * np.log10(env + 1e-12), (lambda k: (k * hop + win / 2) / SR)


def transient(x):
	"""perceptual hit (the sync point): the loudest moment of the 10 ms RMS envelope (whoosh middle, riser top / cut), moved to
	its −6 dB attack edge when that edge lies ≤ 80 ms before the peak (impacts, pops). A series of equal hits (≥ 3 regions within
	3 dB of the peak, each closed by a dip below −9 dB: heartbeat, typing, ticking) uses the first hit instead.
	onset = first frame ≥ peak −30 dB, audible_end = last frame ≥ peak −40 dB. Returns (hit, onset, end, regions)."""
	db, t = envelope(x)
	top = float(db.max())
	sm = np.convolve(db, np.ones(6) / 6, mode='same')             # 30 ms smoothing for the region count only
	regions, inside = [], False
	for i, v in enumerate(sm):
		if not inside and v >= top - 3:
			regions.append(i)
			inside = True
		elif inside and v < top - 9:
			inside = False
	k = int(np.argmax(db))
	if len(regions) >= 3:
		a = regions[0]
		b = next((i for i in range(a, len(sm)) if sm[i] < top - 9), len(sm))
		k = a + int(np.argmax(db[a:b]))
	j = k
	while j > 0 and db[j - 1] > db[k] - 6 and k - j < 16:
		j -= 1
	hit = t(j) if (k - j < 16 and j > 0) else t(k)
	loud = np.nonzero(db >= top - 30)[0]
	aud = np.nonzero(db >= top - 40)[0]
	return round(hit, 2), round(t(int(loud[0])), 2), round(t(int(aud[-1])), 2), max(1, len(regions))


def to_wav(src, dst=None):
	"""any audio → WAV 48 kHz 16 bit (mono stays mono, > 2 channels → stereo), sample peak −3 dBFS; returns (samples, info).
	dst None = analyse only (dry run)"""
	_, a, _ = probe(src)
	if not a:
		die(f'{src}: no audio stream')
	ch = 1 if int(a.get('channels') or 2) == 1 else 2
	raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(src), '-map', '0:a:0', '-f', 'f32le', '-ac', str(ch), '-ar', str(SR), '-'],
	                     capture_output=True, check=True).stdout
	x = np.frombuffer(raw, np.float32).reshape(-1, ch).astype(np.float64)
	peak = float(np.abs(x).max()) if len(x) else 0.0
	if peak < 1e-6:
		die(f'{src}: silent file')
	x *= 10 ** (PEAK_DB / 20) / peak
	if dst is not None:
		with wave.open(str(dst), 'wb') as w:
			w.setnchannels(ch)
			w.setsampwidth(2)
			w.setframerate(SR)
			w.writeframes(np.clip(np.round(x * 32767), -32768, 32767).astype('<i2').tobytes())
	fmt = f"{a.get('codec_name')} {a.get('sample_rate')} Hz {a.get('bits_per_raw_sample') or a.get('sample_fmt')} {a.get('channels')}ch"
	return x, f'{fmt} → WAV 48 kHz 16 bit {ch}ch, peak normalised from {round(20 * np.log10(peak), 1) + 0.0:+.1f} to {PEAK_DB:.0f} dBFS (template rule)'


# ---------------------------------------------------------------- public/ + CREDITS + index
def safe_name(s):
	n = re.sub(r'[^a-z0-9_]+', '_', s.lower()).strip('_')
	if not n:
		die(f'bad name «{s}»')
	return n


def place(src, dst, force, dry):
	"""byte-for-byte copy; same file already there = no-op"""
	if dst.exists():
		if sha256(dst) == sha256(src):
			ok(f'public/{dst.relative_to(PUB)} already present (same sha256)')
			return
		if not force:
			die(f'public/{dst.relative_to(PUB)} exists with other content — pick another --as NAME or pass --force')
	if not dry:
		dst.parent.mkdir(parents=True, exist_ok=True)
		shutil.copy2(src, dst)
	ok(f'{"would copy" if dry else "copied"} → public/{dst.relative_to(PUB)}')


def clean(v, n=160):
	"""one-line value for a CREDITS / EDIT_PLAN field: no separators, no URLs (risk notes), short"""
	v = re.sub(r'\s+', ' ', str(v or '')).replace('·', ',').replace('|', '/').strip()
	return v[:n].rstrip(' ,;') + ('…' if len(v) > n else '')


def credits_line(sub, rel_pub, r, lic, attr, origin, extra=''):
	title = r.get('title') or (r.get('work') or {}).get('film') or (r.get('tags') or '').split(',')[0] or Path(rel_pub).stem
	who = r.get('author') or r.get('artist') or ''
	src = r.get('source_page') or r.get('download_url') or r.get('source_name') or ''
	what = f'«{clean(title, 90)}»' + (f' — {clean(who, 60)}' if who else '')
	att = f'атрибуция (в описание ролика, YOUTUBE.md): {attr}' if attr else 'атрибуция не нужна'
	return f'- `{rel_pub}` — {what} — {clean(r.get("source_name"), 60)} {src} — {lic} — {att} — {origin}{extra}'


def meme_fields(r, risk_arg):
	src = r.get('source_page') or r.get('download_url') or r.get('source_name') or '?'
	w = r.get('work') or {}
	owner = r.get('author') or (f"{w.get('film')} ({w.get('year')}), public domain" if w.get('film') else '') or r.get('source_name') or '?'
	txt = ' '.join(str(r.get(k) or '') for k in ('youtube_risk', 'content_id_risk'))
	lvl = risk_arg or ('высокий' if re.search(r'\bhigh\b', txt, re.I) else 'средний' if re.search(r'medium', txt, re.I)
	                   else 'низкий')
	extra = re.sub(r'https?://\S+|youtube\.com|youtu\.be', '', clean(txt, 110))
	return clean(src, 200), clean(owner, 80), lvl + (f' ({extra})' if extra and not risk_arg else '')


def write_credits(sub, rel_pub, line, dry):
	path = ROOT / 'CREDITS.md'
	lines = path.read_text(encoding='utf-8').split('\n') if path.exists() else ['# CREDITS', '']
	tag = f'- `{rel_pub}`'
	both = (f'`{rel_pub}`', f'`{Path(rel_pub).name}`')
	own = next((i for i, l in enumerate(lines) if l.startswith(tag) and not re.match(r'- `[^`]+`\s*,', l)), None)
	shared = None if own is not None else next((l for l in lines if any(b in l for b in both)), None)
	if own is not None:                                            # our own one-file line: refresh it
		lines[own] = line
	elif shared:                                                   # credited on a shared line (several files, template style)
		ok(f'CREDITS.md already credits {rel_pub} on a shared line — left as is: {shared[:110]}')
		return
	else:
		rx, head = SECTIONS.get(sub, VISUAL)
		h = next((i for i, l in enumerate(lines) if re.search(rx, l, re.I)), None)
		if h is None:
			while lines and not lines[-1].strip():
				lines.pop()
			lines += ['', head, line, '']
		else:
			end = next((i for i in range(h + 1, len(lines)) if lines[i].startswith('## ')), len(lines))
			k = end
			while k > h + 1 and not lines[k - 1].strip():
				k -= 1
			lines.insert(k, line)
	if not dry:
		path.write_text('\n'.join(lines), encoding='utf-8')
	ok(f'{"would write" if dry else "CREDITS.md"}: {line[:150]}{"…" if len(line) > 150 else ""}')


def write_index(entry, dry):
	path = PUB / 'sfx/index.json'
	idx = json.load(open(path, encoding='utf-8')) if path.exists() else []
	same = [i for i, e in enumerate(idx) if e.get('name') == entry['name']]
	if same:
		old = idx[same[0]]
		mine = any(old.get(k) and old.get(k) == entry.get(k) for k in ('library_file', 'source_page', 'original_file'))
		if not mine:
			die(f'SFX name «{entry["name"]}» is taken by another sound in public/sfx/index.json — pass --as NAME')
		idx[same[0]] = entry
	else:
		idx.append(entry)
	if not dry:
		json.dump(idx, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
		open(path, 'a', encoding='utf-8').write('\n')
	ok(f'{"would write" if dry else "public/sfx/index.json"}: {entry["name"]} — {entry["duration"]} s, transient_at {entry["transient_at"]}, '
	   f'onset {entry["onset_at"]}, audible_end {entry["audible_end"]}, {entry["license"]}')


def lib_sfx_meta(src):
	"""entry of 03_Assets/Sound_Effects/index.json for this file (description, category, loop, bed, title)"""
	p = ASSETS / 'Sound_Effects/index.json'
	if not p.exists():
		return {}
	rel = os.path.relpath(os.path.realpath(src), os.path.realpath(ASSETS / 'Sound_Effects'))
	return next((e for e in json.load(open(p, encoding='utf-8')) if e.get('file') == rel), {})


# ---------------------------------------------------------------- one asset
def install(src, r, origin_note, a, lib_rel=None):
	"""route + gates + copy / convert + CREDITS (+ index) for a local file with its licence record r"""
	dry = a['dry']
	sub = a['to'] or next((d for pre, d in ROUTES if (lib_rel or '').startswith('03_Assets/' + pre)), None) or a['default_to']
	if not sub:
		die(f'{lib_rel or src}: no public/ route for this library folder — pass --to SUBDIR')
	sub = sub.strip('/')
	if not re.fullmatch(r'[\w-]+(/[\w-]+)*', sub):
		die(f'--to {sub}: a public/ subfolder name (letters, digits, _ -), no .. or absolute paths')
	if sub.split('/')[0] == 'atlas':
		die('public/atlas is for the owner\'s Atlas art only (rig ~/shorts/orangutan / owner pose cards), not for fetched assets')
	ext = src.suffix.lower()
	stem = a['as'] or src.stem
	lic, attr = gate(r, src.name, lib_rel, a['as'], r.get('source_name'))
	if sub == 'music' and re.search(r'pixabay', ' '.join(str(r.get(k) or '') for k in ('source_name', 'source_page')), re.I):
		die('Pixabay music is not used (standard 5: «Pixabay и Mixkit не брать»)')
	if re.match(r'de', P.get('channel') or '', re.I):
		w = r.get('work') or {}
		year = int((re.search(r'\d{4}', str(w.get('year') or '')) or [0])[0] or 0)
		if US20S.search(src.name) or (str(w.get('country', '')).upper() in ('USA', 'US') and 1920 <= year <= 1929):
			die(f'{src.name}: 1920s US silent film on a German channel — needs a separate owner decision (L6)')
	show_notes(r)
	origin = origin_note
	if sub == 'sfx':
		name = safe_name(stem)
		dst = PUB / 'sfx' / f'{name}.wav'
		if dst.exists() and not a['force']:
			idx = json.load(open(PUB / 'sfx/index.json', encoding='utf-8')) if (PUB / 'sfx/index.json').exists() else []
			old = next((e for e in idx if e.get('name') == name), {})
			if not any(old.get(k) and old.get(k) in (lib_rel, r.get('source_page')) for k in ('library_file', 'source_page')):
				die(f'public/sfx/{name}.wav exists (another sound) — pass --as NAME or --force')
		tmp = None if dry else dst.with_suffix('.tmp.wav')
		if tmp is not None:
			dst.parent.mkdir(parents=True, exist_ok=True)
		try:
			x, proc = to_wav(src, tmp)
			hit, onset, end, multi = transient(x)
		except BaseException:
			if tmp is not None and tmp.exists():
				tmp.unlink()
			raise
		meta = lib_sfx_meta(src) if lib_rel else {}
		if a['transient'] is not None:
			hit = round(float(a['transient']), 2)
		elif multi > 2:
			note(f'{multi} equally loud hits (series / bed): transient_at = the first one ({hit} s) — check by ear, override with --transient')
		if a['transient'] is None and meta.get('transient_at') is not None and abs(meta['transient_at'] - hit) > 0.1:
			note(f'library index says transient_at {meta["transient_at"]} s, waveform gives {hit} s — keeping the waveform value (override: --transient)')
		if tmp is not None:
			os.replace(tmp, dst)
		dur = round(len(x) / SR, 3)
		title = meta.get('source_title') or r.get('title') or re.sub(r'^sfx_|_freesound_\d+$', '', src.stem).replace('_', ' ')
		entry = {'name': name, 'file': f'sfx/{name}.wav', 'category': a['cat'] or meta.get('category') or r.get('category') or 'misc',
		         'duration': dur, 'transient_at': hit, 'onset_at': onset, 'audible_end': end,
		         'source': meta.get('source') or re.sub(r'\s*\(.*\)$', '', r.get('source_name') or '?'),
		         'source_title': title, 'source_page': r.get('source_page'), 'author': r.get('author') or meta.get('author'),
		         'license': lic, 'attribution_required': bool(attr), 'attribution': attr,
		         'description': a['desc'] or meta.get('description') or r.get('use_cases') or title,
		         'loop': bool(a['loop'] or meta.get('loop')), 'bed': bool(a['bed'] or meta.get('bed') or entry_is_bed(meta, r)),
		         **({'library_file': lib_rel} if lib_rel else {'original_file': os.path.relpath(src, ROOT)}),
		         'processing': proc}
		write_index(entry, dry)
		write_credits('sfx', f'sfx/{name}.wav', credits_line('sfx', f'sfx/{name}.wav', {**r, 'title': title}, lic, attr, origin, f' ({proc})'), dry)
		return
	cut = a['from'] is not None or a['dur'] is not None
	is_meme = sub.split('/')[0] == 'memes'
	if is_meme and ext in ('.wav', '.mp3', '.ogg', '.oga', '.m4a', '.aac', '.flac', '.opus', '.aif', '.aiff'):
		die('memes run without their original sound (R7 п. 2): no audio files in public/memes — put our SFX on top')
	if ext in MEDIA_V and cut and ext in ('.gif', '.mkv'):
		ext = '.mp4'                                               # a cut is re-encoded to H.264 MP4
	name = re.sub(r'[^\w.-]+', '_', stem) + ext
	dst = PUB / sub / name
	extra = ''
	if ext in MEDIA_V and (cut or is_meme):
		dur, _, kinds = probe(src)
		f0 = float(a['from'] or 0)
		d = float(a['dur']) if a['dur'] is not None else max(0.0, dur - f0)
		if is_meme and d > MEME_MAX + 1e-6:
			die(f'meme clip {src.name} is {d:.2f} s from {f0:.2f} s — pick the moment: --from S --dur ≤ {MEME_MAX} (R7 п. 1)')
		if not cut and 'audio' not in kinds:
			place(src, dst, a['force'], dry)                        # already short and silent: byte-for-byte
		else:
			if dst.exists() and not a['force'] and not dry:
				die(f'public/{sub}/{name} exists — pass --force to re-cut or --as NAME')
			if not dry:
				dst.parent.mkdir(parents=True, exist_ok=True)
				if not cut:
					enc = ['-c:v', 'copy']
				elif ext == '.webm':
					enc = ['-c:v', 'libvpx-vp9', '-crf', '20', '-b:v', '0']
				else:
					enc = ['-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p']
				mov = ['-movflags', '+faststart'] if ext in ('.mp4', '.m4v', '.mov') else []
				fps = fps_of(src)                                  # whole frames, so the cut never runs past --dur (R7 ≤ 1.5 s)
				span = ['-frames:v', str(max(1, int(d * fps + 1e-6)))] if fps else ['-t', f'{d:.3f}']
				subprocess.run(['ffmpeg', '-v', 'error', '-y', *(['-ss', f'{f0:.3f}'] if cut else []), '-i', str(src),
				                *(span if cut else []), '-map', '0:v:0', '-an', *enc, *mov, str(dst)], check=True)
			ok(f'{"would cut" if dry else "cut"} → public/{sub}/{name} ({f0:.2f}–{f0 + d:.2f} s, audio removed)')
			extra = f' (вырезано {f0:.2f}–{f0 + d:.2f} s из оригинала, звук удалён)'
	else:
		if cut:
			note('--from / --dur apply to video clips only — ignored')
		place(src, dst, a['force'], dry)
	rel_pub = f'{sub}/{name}'
	if is_meme:
		s, owner, risk = meme_fields(r, a['risk'])
		# folder + sha256 only: a media path outside memes/ on a meme line trips check.mjs («a meme outside public/memes/»)
		origin = re.sub(r'`([^`]*/)?[^`/]+\.(?:png|jpe?g|webp|gif|mp4|m4v|webm|mov|mkv)`',
		                lambda m: f'`{(m.group(1) or "./").rstrip("/")}`', origin) + f', sha256 {sha256(src)[:12]}…'
		d_on = float(a['dur']) if a['dur'] is not None else (probe(src)[0] if ext in MEDIA_V else 1.0)
		d_on = min(d_on, MEME_MAX)
		line = f'- `{rel_pub}` · источник: {s} · владелец: {owner} · риск: {risk} · лицензия: {lic} · ' + \
		       (f'атрибуция: {attr}' if attr else 'атрибуция не нужна') + f' · {origin}{extra}'
		write_credits('memes', rel_pub, line, dry)
		print(f'→ ../EDIT_PLAN.md (R7, one line per meme):\n  Мем: {rel_pub} · источник: {s} · владелец: {owner} · риск: {risk.split(" (")[0]} · длит.: {d_on:.1f} s · слово: <w>')
	else:
		write_credits(sub, rel_pub, credits_line(sub, rel_pub, r, lic, attr, origin, extra), dry)
	if sub == 'fonts':
		lic_txt = next((p for p in src.parent.glob('OFL*.txt')), None) or next((p for p in src.parent.glob('LICENSE*')), None)
		if lic_txt:
			place(lic_txt, PUB / 'fonts' / f'OFL_{src.parent.name}.txt', True, dry)
	if sub == 'music':
		if P.get('allow_over_60'):
			note('allow_over_60 is set: a Short > 59 s takes only YouTube Audio Library music (R10 / L4) — this track is not')
		if a['set_music']:
			P['music'], P['music_license'] = f'{ROOT.name}/public/{rel_pub}', lic + (' — credit in the description' if attr else '')
			if not dry:
				json.dump(P, open(ROOT / 'project.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
				open(ROOT / 'project.json', 'a', encoding='utf-8').write('\n')
			ok(f'project.json music = {P["music"]} ({P["music_license"]})')
		else:
			print(f'→ to use it: project.json "music": "{ROOT.name}/public/{rel_pub}", "music_license": "{lic}" (or rerun with --set-music)')
	if attr:
		print(f'→ CC BY: put this credit into the video description (YOUTUBE.md) before publishing:\n  {attr}')


def entry_is_bed(meta, r):
	return (meta.get('category') or r.get('category') or '').endswith('ambience')


# ---------------------------------------------------------------- sources
def from_lib(path, a):
	p = Path(path)
	src = p if p.is_absolute() else (LIB / p if str(p).startswith('03_Assets/') else ASSETS / p)
	src = Path(os.path.realpath(src))
	rel = rel_lib(src)
	if not rel.startswith('03_Assets/'):
		die(f'{path}: not under {ASSETS}')
	if rel.startswith('03_Assets/_quarantine') or src.name.lower() in quarantine_names() and not src.name.upper().startswith('README'):
		die(f'{rel}: in 03_Assets/_quarantine — not usable (see its README.md)')
	if rel.startswith(('03_Assets/Licenses/',)) or src.suffix.lower() in ('.md', '.txt'):
		die(f'{rel}: documentation / licence text, not an asset')
	if not src.is_file():
		die(f'{rel}: no such file')
	r, log = find_record(src)
	ok(f'{rel}: licence record in {log}')
	install(src, r, f'из библиотеки `{rel}`', a, lib_rel=rel)


def helper(cmd, stage, a):
	"""run a download helper into a new empty staging folder; returns the downloaded file"""
	got = [p for p in stage.glob('*') if p.is_file()] if stage.exists() else []
	if got and not a['download']:
		ok(f'already downloaded: {os.path.relpath(got[0], ROOT)} (no new request)')
		return got[0]
	if a['dry']:
		print('would run:', ' '.join(cmd))
		return None
	if stage.exists() and any(stage.iterdir()):
		die(f'{stage} is not empty — remove it to download again')
	stage.mkdir(parents=True, exist_ok=True)
	res = subprocess.run(cmd, capture_output=True, text=True)
	if res.returncode:
		die(f'{Path(cmd[2]).name} failed: {(res.stderr or res.stdout).strip()[-400:]}')
	global RECORDS
	RECORDS = None                                                 # the helper appended its log entry: reload the logs
	out = Path(res.stdout.strip().split('\n')[-1].strip())
	if not out.is_file():
		die(f'helper printed no file: {res.stdout.strip()[-200:]}')
	return out


def from_freesound(sid, a):
	if not re.fullmatch(r'\d+', sid):
		die(f'freesound id must be a number, got {sid}')
	lib = None if a['download'] else by_source_id('freesound', sid)
	if lib:
		ok(f'Freesound {sid} is already in the library → {rel_lib(lib)} (no download; --download to fetch it anyway)')
		return from_lib(str(lib), a)
	stage = ROOT / 'data/fetch' / f'freesound_{sid}'
	f = helper(['/usr/bin/python3', '-I', str(HELPERS / 'freesound.py'), 'get', sid, '--dest', str(stage)], stage, a)
	if f is None:
		return
	r, log = find_record(f)
	ok(f'{os.path.relpath(f, ROOT)} — licence record in {log}')
	m = re.match(r'\s*"([^"]+)" by ', r.get('attribution_text') or '')
	if m and not r.get('title'):
		r = {**r, 'title': re.sub(r'\.(wav|flac|aiff?|mp3|ogg)$', '', m.group(1), flags=re.I)}
	install(f, r, f'Freesound API, загружено {r.get("date", "")} (оригинал `{os.path.relpath(f, ROOT)}`)', {**a, 'default_to': 'sfx'})


def from_pixabay(kind, pid, a):
	if kind not in ('images', 'videos') or not re.fullmatch(r'\d+', pid):
		die('usage: fetch_asset.py pixabay images|videos <id>')
	lib = None if a['download'] else by_source_id('pixabay', pid)
	if lib:
		ok(f'Pixabay {pid} is already in the library → {rel_lib(lib)} (no download; --download to fetch it anyway)')
		return from_lib(str(lib), a)
	stage = ROOT / 'data/fetch' / f'pixabay_{kind}_{pid}'
	cmd = ['/usr/bin/python3', '-I', str(HELPERS / 'pixabay.py'), 'get', kind, pid, '--dest', str(stage)]
	if kind == 'videos':
		cmd += ['--quality', a['quality'] or 'large']
	f = helper(cmd, stage, a)
	if f is None:
		return
	r, log = find_record(f)
	ok(f'{os.path.relpath(f, ROOT)} — licence record in {log}')
	if re.search(r'\b(man|woman|men|women|person|people|girl|boy|child|face)\b', r.get('tags') or '', re.I):
		note('people in stock media are models: never present them as real figures of the story or in an offensive context (Pixabay licence)')
	install(f, r, f'Pixabay API, загружено {r.get("date", "")} (оригинал `{os.path.relpath(f, ROOT)}`)',
	        {**a, 'default_to': 'img' if kind == 'images' else 'video'})


def main(argv):
	flags = {'--loop': 'loop', '--bed': 'bed', '--set-music': 'set_music', '--download': 'download', '--force': 'force', '--dry-run': 'dry'}
	vals = {'--as': 'as', '--to': 'to', '--desc': 'desc', '--cat': 'cat', '--transient': 'transient', '--from': 'from', '--dur': 'dur',
	        '--risk': 'risk', '--quality': 'quality'}
	a = {**{v: False for v in flags.values()}, **{v: None for v in vals.values()}, 'default_to': None}
	pos, i = [], 0
	while i < len(argv):
		x = argv[i]
		if x in flags:
			a[flags[x]] = True
		elif x in vals:
			if i + 1 >= len(argv):
				die(f'{x} needs a value')
			a[vals[x]] = argv[i + 1]
			i += 1
		elif x.startswith('--'):
			die(f'unknown option {x}')
		else:
			pos.append(x)
		i += 1
	for k in ('transient', 'from', 'dur'):
		if a[k] is not None:
			try:
				float(a[k])
			except ValueError:
				die(f'--{k} needs seconds, got {a[k]}')
	if a['dur'] is not None and float(a['dur']) <= 0:
		die('--dur must be > 0')
	if pos[:1] == ['lib'] and len(pos) == 2:
		from_lib(pos[1], a)
	elif pos[:1] == ['freesound'] and len(pos) == 2:
		from_freesound(pos[1], a)
	elif pos[:1] == ['pixabay'] and len(pos) == 3:
		from_pixabay(pos[1], pos[2], a)
	else:
		print(__doc__)
		sys.exit(2)


if __name__ == '__main__':
	main(sys.argv[1:])
