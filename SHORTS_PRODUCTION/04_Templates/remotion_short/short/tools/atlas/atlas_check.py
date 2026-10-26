"""Render-free checks of the Atlas windows (project.json → "atlas") against the editing standard:
  • every window: words exist, from ≤ to, corner tl | tr | bl (br = error: Shorts buttons and sound disc, standard 4.4),
    custom "at" inside the safe zone (x 48–887, y 288–1150: above the subtitle band of R3), no two windows overlap;
  • the asset of every window exists: cards → public/atlas/<pose>.png (+ <pose>_talk/ frames when talk), rig → every
    30 fps frame of the window in public/atlas/rig/; each has a CREDITS.md line; no card source from 03_Assets/_quarantine;
  • R2 / H10: Atlas in 0–3 s only in the A/B version ("variant": "B"; R2 asks for the reaction in 0–1 s → later = warning);
    A/B hook windows from project.ab (atlas_hook) are checked like the others: pose in atlas.poses, corner, asset, CREDITS;
    hook taller than 360 px or ending after 1.0 s = warning (R2: small, 0–1 s); a "variant" window while project.ab.enabled
    is not true = warning (it never renders);
  • Atlas = reaction only (E5): a window before the finale longer than 4 s = warning, shorter than 0.6 s = warning;
  • F5 (v1.6, owner 25.10): ATLAS APE Shorts go without Atlas until the owner asks for it — whether a Short may show Atlas at
    all is decided by the series card (tools/story_gate.py G6, check.mjs п. 15), not here; this file only checks the windows
    that exist.
  python3 tools/atlas/atlas_check.py           human report (✓ / ! / ✗), exit 1 on errors
  python3 tools/atlas/atlas_check.py --json    {"errors": [...], "warnings": [...], "ok": [...], "ab": {variant: [windows in 0–1 s]}}
                                               for tools/check.mjs (sections 7 and 10)
"""
import argparse, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, PROJECT_DIR, CARD_DIR, RIG_DIR, CORNERS, load_project, load_words, clock, atlas_block, ab_variants, resolve, window_times, frames_needed, credits_text

SAFE_X, SAFE_Y = (48, 887), (288, 1150)
A_B_LIMIT = 3.0        # H10: nothing of Atlas in 0–3 s outside the A/B version
REACTION_MAX = 4.0
HOOK_MAX_H, HOOK_END = 360, 1.0      # R2: the A/B hook is small and inside 0–1 s


def deviates(pattern):
	"""the EDIT_PLAN line «Отступления от R1–R10: …» names this rule (same idea as tools/check.mjs)."""
	p = PROJECT_DIR / 'EDIT_PLAN.md'
	if not p.exists():
		return False
	line = next((l for l in p.read_text(encoding='utf-8').split('\n') if re.match(r'^\s*[-*]?\s*(Отступления\s+от\s+R1|deviations?\b)', l, re.I)), '')
	txt = re.sub(r'^[^:]*:', '', line)
	if not txt.strip() or re.match(r'^\s*(<|нет(?![а-яё])|none\b|—\s*$|-\s*$)', txt, re.I):
		return False
	return bool(re.search(pattern, txt, re.I))


def run():
	errors, warns, oks = [], [], []
	project = load_project()
	block = atlas_block(project)
	variants = ab_variants(project)
	ab = {v: [] for v in variants}          # per A/B variant: the Atlas windows on screen in 0–1 s (check.mjs section 10)
	if not block:
		oks.append('no Atlas in this Short (project.atlas = null; ATLAS APE: no Atlas until the owner asks, F5 / G6)')
		return errors, warns, oks, ab
	words = load_words()
	_, dur = clock(project, words)
	credits = credits_text()
	poses = {p['id']: p for p in block['poses']}
	if block['source'] not in ('cards', 'rig'):
		errors.append(f'atlas.source «{block["source"]}»: cards | rig')
	rig_dir = (block.get('rig') or {}).get('dir') or RIG_DIR
	spans, finale = [], False
	for k, w in enumerate(block['windows']):
		hook = bool(w.get('hook'))
		name = f'A/B hook of variant {w["variant"]} («{w.get("pose")}», project.ab)' if hook else f'atlas window {k} («{w.get("pose")}»)'
		if hook and not w.get('pose'):
			errors.append(f'{name}: ab.variants.{w["variant"]}.atlas_hook_pose missing — a pose id from atlas.poses (owner card) or a rig pose'); continue
		if w.get('variant') and w['variant'] not in variants:
			warns.append(f'{name}: "variant": "{w["variant"]}" but project.ab.enabled is not true or has no variant {w["variant"]} — this window never renders')
		try:
			a = int(w['from_word'])
			b = len(words) - 1 if w.get('to_word', 'end') == 'end' else int(w['to_word'])
		except (KeyError, ValueError, TypeError):
			errors.append(f'{name}: from_word / to_word must be word indexes (to_word may be "end")'); continue
		if not (0 <= a < len(words)) or not (0 <= b < len(words)) or b < a:
			errors.append(f'{name}: words {a}–{b} out of range 0–{len(words) - 1} or reversed'); continue
		t0, t1 = window_times(w, words, dur)
		finale |= b == len(words) - 1 and not hook
		spans.append((t0, t1, k))
		if t0 < 1.0:
			for v in variants:
				if not w.get('variant') or w['variant'] == v:
					ab[v].append({'pose': w.get('pose'), 'corner': w.get('corner', 'tl') if 'at' not in w else f'at {w["at"]}', 'h': w.get('h', 460),
						't0': t0, 't1': t1, 'hook': hook, 'source': w.get('source', block['source'])})
		if hook and w.get('h', 460) > HOOK_MAX_H:
			warns.append(f'{name}: h {w["h"]} px — the R2 hook is a small reaction over empty space (≤ {HOOK_MAX_H} px), not over the subject of frame 0')
		if hook and t1 > HOOK_END + 1e-6:
			warns.append(f'{name}: on screen until {t1:.2f} s — R2 tests Atlas in 0–{HOOK_END:.0f} s (atlas_hook_until ≤ {HOOK_END})')
		corner = w.get('corner', 'tl')
		if 'at' in w:
			x, y = w['at']
			if not (SAFE_X[0] <= x <= SAFE_X[1]) or not (SAFE_Y[0] <= y <= SAFE_Y[1]):
				errors.append(f'{name}: at {w["at"]} (bottom centre of Atlas) outside the safe zone x {SAFE_X}, y {SAFE_Y} (standard 4.4, R3)')
		elif corner not in CORNERS:
			errors.append(f'{name}: corner «{corner}» — tl | tr | bl')
		elif corner == 'br':
			errors.append(f'{name}: corner br — bottom right is under the Shorts buttons and sound disc (standard 4.4): use tl, tr or bl')
		h = w.get('h', 460)
		if not (200 <= h <= 860):
			warns.append(f'{name}: h {h} px — Atlas is a small reaction (200–860 px tall), not over the story')
		# A/B (R2) and H10
		if t0 < A_B_LIMIT and not w.get('variant'):
			errors.append(f'{name}: starts at {t0:.2f} s — Atlas in 0–3 s only in the A/B version (R2, H10): set "variant": "B"')
		elif w.get('variant') and t0 > 1.0:
			warns.append(f'{name}: variant {w["variant"]} starts at {t0:.2f} s — R2 tests the reaction in 0–1 s')
		# reaction only
		if b != len(words) - 1 and t1 - t0 > REACTION_MAX:
			warns.append(f'{name}: {t1 - t0:.1f} s on screen before the finale — Atlas is a reaction (E5), keep it ≤ {REACTION_MAX:.0f} s')
		if t1 - t0 < 0.6:
			warns.append(f'{name}: only {t1 - t0:.2f} s — too short to read (≥ 0.6 s)')
		# asset
		src = w.get('source', block['source'])
		pose = w.get('pose')
		if src == 'cards':
			p = poses.get(pose)
			if not p:
				errors.append(f'{name}: pose «{pose}» not in atlas.poses' + (' — add {"id": "%s", "card": <owner card>} to project.atlas.poses, then tools/atlas/cutout_cards.py' % pose if hook else '')); continue
			png = p.get('png') or f'{CARD_DIR}/{pose}.png'
			if p.get('talk'):
				d = ROOT / 'public' / CARD_DIR / f'{pose}_talk'
				miss = [i for i in frames_needed(t0, t1, dur) if not (d / f'f_{i:05d}.webp').exists()]
				if miss:
					errors.append(f'{name}: {len(miss)} talking frames missing in public/{CARD_DIR}/{pose}_talk/ (first f_{miss[0]:05d}) — python3 tools/atlas/cutout_cards.py --only {pose}')
				if f'{CARD_DIR}/{pose}_talk' not in credits:
					errors.append(f'{name}: no CREDITS.md line for {CARD_DIR}/{pose}_talk/ (owner art)')
			elif not (ROOT / 'public' / png).exists():
				errors.append(f'{name}: missing public/{png} — python3 tools/atlas/cutout_cards.py --only {pose}')
			if Path(png).name not in credits:
				errors.append(f'{name}: no CREDITS.md line for {png} (owner art only, standard 5)')
			if p.get('card') and '_quarantine' in resolve(p['card'], project).parts:
				errors.append(f'{name}: card source is in 03_Assets/_quarantine')
		elif src == 'rig':
			d = ROOT / 'public' / rig_dir
			miss = [i for i in frames_needed(t0, t1, dur) if not (d / f'f_{i:05d}.webp').exists()]
			if miss:
				errors.append(f'{name}: {len(miss)} rig frames missing in public/{rig_dir}/ (first f_{miss[0]:05d}) — atlas_scene.py → rig export → atlas_webp.py')
			if rig_dir.rstrip('/') not in credits:
				errors.append(f'{name}: no CREDITS.md line for {rig_dir}/ (rig = owner art)')
		else:
			errors.append(f'{name}: source «{src}»: cards | rig')
	# overlaps (one Atlas at a time; A and B windows may overlap each other only across variants)
	spans.sort()
	for (a0, a1, i), (b0, b1, j) in zip(spans, spans[1:]):
		vi, vj = block['windows'][i].get('variant'), block['windows'][j].get('variant')
		if b0 < a1 and (vi == vj or not vi or not vj):
			errors.append(f'atlas windows {i} and {j} overlap ({a0:.2f}–{a1:.2f} s / {b0:.2f}–{b1:.2f} s)')
	if not errors:
		used = sorted({w.get('source', block['source']) for w in block['windows']})
		oks.append(f'{len(block["windows"])} Atlas windows ({" + ".join(used)}): ' + ', '.join(f'{s[0]:.2f}–{s[1]:.2f} s' for s in spans))
	return errors, warns, oks, ab


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument('--json', action='store_true')
	a = ap.parse_args()
	errors, warns, oks, ab = run()
	if a.json:
		print(json.dumps({'errors': errors, 'warnings': warns, 'ok': oks, 'ab': ab}, ensure_ascii=False))
	else:
		for m in oks:
			print('✓', m)
		for m in warns:
			print('!', m)
		for m in errors:
			print('✗', m)
	sys.exit(1 if errors and not a.json else 0)


if __name__ == '__main__':
	main()
