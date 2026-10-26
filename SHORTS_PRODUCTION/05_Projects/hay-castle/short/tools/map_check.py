"""Render-free checks of the animated maps (tools/make_map.py → data/maps/<name>.json, drawn by src/ui/maps.tsx):
  • every map JSON the Short imports exists and comes from make_map.py (version 1, proj, period); its spec is not newer than
    the JSON (else: rebuild with --spec); > 1.5 MB = warning (bundle weight);
  • period borders (owner rule after the Poland Short, memory historical-borders): a map with MODERN political borders
    (period.borders modern / mixed — Natural Earth admin-0 regions) in a historical project = warning. project.json
    "map_period" decides when set (a year, e.g. 1941, or "modern"); without it the project counts as historical when
    ../FACTS.md, ../SCRIPT.md or ../voiceover.txt name a year before 1992, or the channel is a German-history one (de-…).
    A period map whose year differs from map_period by more than 2 years = warning (borders moved fast 1938–1945);
  • licences: every source of a used map has a licence (UNKNOWN = warning); a source that is not public domain / CC0
    (historical-basemaps = GPL-3.0, CC BY …) needs a CREDITS.md line naming it (attribution in the description);
  • R4 (maps in 0–3 s): a beat of src/data/beats.ts whose scene in src/scenes.tsx draws a map (<MapCamera> / <MapBase>) and starts
    before 3.0 s = ERROR («a map is never the main shot of 0–3 s») unless the beat carries `live: true` (the editor's statement:
    live action runs on the map — ships, people, an advancing front); `live: true` without <MovingToken> / <AdvanceArrow> /
    footage (<TrackedVideo> / <OffthreadVideo>) in that scene = warning. A map beat that opens the Short (t0 < 0.05 s, frame 0)
    = ERROR always, `live: true` or not (H1 / V4: frame 0 is a living being in action, never a map) — `live` allows a map in
    0.05–3 s only.
A map JSON imported anywhere in src/ but missing = error (Root.tsx bundles every composition, so a missing test map breaks the
Short's render too). Files named *Gallery.tsx, *Demo.tsx or *_demo.tsx are test compositions: their maps are listed as info.
  python3 tools/map_check.py          human report (✓ / ! / ✗ / ·), exit 1 on errors
  python3 tools/map_check.py --json   {"errors": [...], "warnings": [...], "ok": [...], "info": [...]} for tools/check.mjs
python3 without -I is fine (stdlib only).
"""
from __future__ import annotations

import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]            # short/
PROJECT_DIR = ROOT.parent
HOOK_S = 3.0
MODERN_UNTIL = 1992                                   # Natural Earth admin-0 ≈ borders after the breakup of the USSR / Yugoslavia
IMPORT_RE = re.compile(r"""from\s+['"]([^'"]*data/maps/[\w.-]+\.json)['"]""")
PD_RE = re.compile(r'public domain|CC0|gemeinfrei', re.I)
LIVE_RE = re.compile(r'<(MovingToken|AdvanceArrow|TrackedVideo|OffthreadVideo)\b')
MAP_RE = re.compile(r'<(MapCamera|MapBase)\b')


def is_test(p: Path) -> bool:
	return p.name.endswith('Gallery.tsx') or p.stem.endswith('Demo') or p.stem.endswith('_demo')


def strip_comments(c: str) -> str:
	return re.sub(r'^\s*//.*$', '', re.sub(r'/\*[\s\S]*?\*/', '', c), flags=re.M)


def used_maps():
	"""{map json path: [(src file, is_test)]} from the imports in src/."""
	out = {}
	for f in sorted((ROOT / 'src').rglob('*.ts*')):
		code = strip_comments(f.read_text(encoding='utf-8'))
		for m in IMPORT_RE.finditer(code):
			p = (f.parent / m.group(1)).resolve()
			out.setdefault(p, []).append((f, is_test(f)))
	return out


def project_period(project):
	"""(historical: bool | None, year: int | None, why: str)"""
	mp = project.get('map_period')
	if isinstance(mp, str) and mp.strip().lower() == 'modern':
		return False, None, 'project.json map_period = "modern"'
	if mp not in (None, ''):
		try:
			y = int(mp)
		except (TypeError, ValueError):
			return None, None, f'project.json map_period «{mp}» is neither a year nor "modern"'
		return y < MODERN_UNTIL, y, f'project.json map_period = {y}'
	years = {}
	for name in ('FACTS.md', 'SCRIPT.md', 'voiceover.txt'):
		p = PROJECT_DIR / name
		if p.exists():
			for y in re.findall(r'(?<![\d.,])(1[0-9]{3})(?![\d.,]?\d)', p.read_text(encoding='utf-8')):
				if int(y) < MODERN_UNTIL:
					years.setdefault(int(y), name)
	if years:
		ys = sorted(years)
		return True, ys[0], f'years {", ".join(map(str, ys[:5]))} in {", ".join(sorted(set(years.values())))} (set project.json "map_period" to confirm: a year or "modern")'
	if re.match(r'de[-_]', str(project.get('channel') or ''), re.I):
		return True, None, f'channel «{project.get("channel")}» (German history; set project.json "map_period")'
	return False, None, 'no year before 1992 in FACTS / SCRIPT / voiceover'


def eval_time(expr: str, words, consts) -> float | None:
	e = re.sub(r'\bWe\((\d+)\)', lambda m: repr(words[int(m.group(1))]['e']), expr)
	e = re.sub(r'\bW\((\d+)\)', lambda m: repr(words[int(m.group(1))]['s']), e)
	for k, v in consts.items():
		e = re.sub(rf'\b{k}\b', repr(v), e)
	if not re.fullmatch(r'[\d.\s+\-*/()e]+', e):
		return None
	try:
		return float(eval(e, {'__builtins__': {}}, {}))      # digits and operators only (checked above)
	except Exception:
		return None


def beats_with_maps(project):
	"""[(beat key, t0, scene, flagged, action)] for beats whose scene draws a map (flagged = `live: true` on the beat, action =
	a token / arrow / footage in the scene); None when beats.ts cannot be read."""
	bp, sp = ROOT / 'src/data/beats.ts', ROOT / 'src/scenes.tsx'
	if not bp.exists() or not sp.exists():
		return None
	words = json.load(open(ROOT / 'data/words.json', encoding='utf-8'))
	last = words[-1]
	r3 = lambda x: round(x * 1000) / 1000
	vo_end = r3(project.get('vo_end') or last['e'] + 0.15)
	dur = r3(project.get('duration') or last['e'] + project.get('tail_s', 0.9))
	consts = {'VO_END': vo_end, 'DURATION': dur, 'LOOP_T': r3(dur - project.get('loop_s', 0.4))}
	scenes = strip_comments(sp.read_text(encoding='utf-8'))
	blocks = {}
	starts = [(m.start(), m.group(1)) for m in re.finditer(r'export const (\w+)\s*:\s*React\.FC', scenes)]
	for i, (pos, name) in enumerate(starts):
		end = starts[i + 1][0] if i + 1 < len(starts) else len(scenes)
		blocks[name] = scenes[pos:end]
	out = []
	src = strip_comments(bp.read_text(encoding='utf-8'))
	for m in re.finditer(r"\{\s*k:\s*'[^']+'[^{}]*\}", src):
		obj = m.group(0)
		km, tm, sm = re.search(r"k:\s*'([^']+)'", obj), re.search(r'\bt0:\s*([^,}]+)', obj), re.search(r"scene:\s*'(\w+)'", obj)
		if not (km and tm and sm):
			continue
		key, scene = km.group(1), sm.group(1)
		body = blocks.get(scene, '')
		if not MAP_RE.search(body):
			continue
		t0 = eval_time(tm.group(1), words, consts)
		out.append((key, t0, scene, bool(re.search(r'\blive:\s*true\b', obj)), bool(LIVE_RE.search(body))))
	return out


def run():
	errors, warns, oks, info = [], [], [], []
	project = json.load(open(ROOT / 'project.json', encoding='utf-8'))
	credits = (ROOT / 'CREDITS.md').read_text(encoding='utf-8') if (ROOT / 'CREDITS.md').exists() else ''
	maps = used_maps()
	hist, pyear, why = project_period(project)
	if hist is None:
		warns.append(why)
	n_short = 0
	for path, users in maps.items():
		rel = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path
		who = ', '.join(sorted({f.name for f, _ in users}))
		test_only = all(t for _, t in users)
		if not path.exists():
			errors.append(f'{rel}: imported by {who} but missing — python3 tools/make_map.py … (Root.tsx bundles every composition: a missing map breaks every render)')
			continue
		try:
			m = json.load(open(path, encoding='utf-8'))
		except Exception as e:
			errors.append(f'{rel}: not JSON ({e})')
			continue
		if m.get('version') != 1 or 'proj' not in m or 'period' not in m:
			errors.append(f'{rel}: not a tools/make_map.py map (version 1 with proj / period)')
			continue
		per = m['period']
		kind = per.get('borders')
		if test_only:
			info.append(f'{rel}: test map of {who} (borders {kind}{", " + str(per.get("year")) if per.get("year") is not None else ""}) — not checked as part of the Short')
			continue
		n_short += 1
		spec = path.with_name(path.stem + '.spec.json')
		if spec.exists() and spec.stat().st_mtime > path.stat().st_mtime + 1:
			warns.append(f'{rel}: {spec.name} is newer than the map — rebuild: python3 tools/make_map.py --spec {spec.relative_to(ROOT)}')
		size = path.stat().st_size / 1024
		if size > 1536:
			warns.append(f'{rel}: {size:.0f} KB in the bundle — raise --eps, lower --zoom-max / --pad or --select fewer regions')
		# period borders
		if kind in ('modern', 'mixed') and per.get('political'):
			if hist:
				warns.append(f'{rel}: MODERN political borders (Natural Earth admin-0, {kind}) in a historical project ({why}) — WW2 / pre-1992 maps need '
				             f'period borders: make_map.py --geojson <period borders> (or --borders none for land and coast only); owner rule, memory historical-borders')
			else:
				oks.append(f'{rel}: modern borders, project is modern ({why})')
		elif kind == 'historical':
			my = per.get('year')
			if pyear is not None and my is not None and abs(int(my) - int(pyear)) > 2:
				warns.append(f'{rel}: period borders of {my}, project period {pyear} ({why}) — borders moved fast 1938–1945: use the matching year')
			elif not hist:
				info.append(f'{rel}: period borders ({my}) in a project without map_period — fine if the story is about {my}')
			else:
				oks.append(f'{rel}: period borders {my}' + (f' for a {pyear} story' if pyear else ''))
		else:
			oks.append(f'{rel}: physical map (no political borders) — fine for any period')
		# licences
		for s in m.get('sources', []):
			lic = s.get('license') or 'UNKNOWN'
			if lic == 'UNKNOWN':
				warns.append(f'{rel}: source «{s.get("source")}» ({s.get("what")}) has no licence — rebuild with --license "…" after its --geojson')
			elif not PD_RE.search(lic):
				keys = re.findall(r'[A-Za-z][\w-]{4,}', s.get('source') or '')[:2]
				if not any(k.lower() in credits.lower() for k in keys):
					warns.append(f'{rel}: source «{s.get("source")}» is {lic} — CREDITS.md needs a line naming it (and the description its attribution)')
				else:
					oks.append(f'{rel}: {lic} source credited ({keys[0] if keys else s.get("source")})')
	if not maps or not n_short:
		oks.append('no maps in this Short' + (' (only test compositions import maps)' if maps else ' (src/ imports no data/maps/*.json)'))
	elif n_short:
		oks.append(f'{n_short} map(s) used by the Short' + (f'; project period: {why}' if hist else ''))
	# R4
	bm = beats_with_maps(project)
	if bm is None:
		info.append('R4: src/data/beats.ts or src/scenes.tsx not found — map timing not checked')
	else:
		for key, t0, scene, flagged, action in bm:
			if t0 is None:
				warns.append(f'R4: beat {key} ({scene}) draws a map, its t0 could not be evaluated — check 0–3 s by hand')
				continue
			if t0 >= HOOK_S:
				oks.append(f'R4: map beat {key} ({scene}) starts at {t0:.2f} s')
				continue
			if t0 < 0.05:
				errors.append(f'R4/H1: beat {key} ({scene}) opens the Short on a map ({t0:.2f} s) — frame 0 is a living being in action (H1, V4), never a map, '
				              f'even with live action on it and `live: true`; open on footage / a character and bring the map in after frame 0 (with live: true before 3 s)')
				continue
			if not flagged:
				errors.append(f'R4: beat {key} ({scene}) puts a map on screen at {t0:.2f} s — a map is never the main shot of 0–3 s; move it after 3 s, '
				              f'or (hook only) put live action on it (MovingToken / AdvanceArrow / footage) and mark the beat `live: true` in src/data/beats.ts')
				continue
			if not action:
				warns.append(f'R4: beat {key} ({scene}) is marked live: true, but the scene has no MovingToken / AdvanceArrow / TrackedVideo / OffthreadVideo — the live action on the map is not visible in code')
			else:
				oks.append(f'R4: map beat {key} ({scene}) at {t0:.2f} s is marked live: true (live action on the map in the hook)')
	return errors, warns, oks, info


def main(argv):
	errors, warns, oks, info = run()
	if '--json' in argv:
		print(json.dumps({'errors': errors, 'warnings': warns, 'ok': oks, 'info': info}, ensure_ascii=False))
		return 0
	for m in errors:
		print('✗', m)
	for m in warns:
		print('!', m)
	for m in oks:
		print('✓', m)
	for m in info:
		print('·', m)
	return 1 if errors else 0


if __name__ == '__main__':
	sys.exit(main(sys.argv[1:]))
