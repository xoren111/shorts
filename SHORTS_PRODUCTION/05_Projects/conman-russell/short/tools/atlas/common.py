"""Shared helpers of the Atlas bridge (tools/atlas/*.py): project.json → "atlas" block, word clock, window times, paths.

The window-time formulas here are the same as in src/ui/Atlas.tsx (AtlasWindows) — change both together:
  t0 = max(0, W(from_word) − lead)           lead default 0.1 s (the reaction lands on the word)
  t1 = min(DURATION, We(to_word) + tail)     tail default 0.3 s;  to_word "end" → DURATION (Atlas owns the finale, F5);
                                             "until": seconds overrides t1 (the legacy single card uses its "out" ?? VO_END),
                                             "from_s": seconds overrides t0
A/B (standard R2): project.json → "ab": {"enabled": true, "variants": {"B": {"atlas_hook": true, "atlas_hook_pose": "shock",
"atlas_hook_corner": "tr", "atlas_hook_h": 300, "atlas_hook_until": 1.0}}} adds one window per variant with atlas_hook:
from frame 0 to atlas_hook_until, "variant": <name>, "hook": true (hook_windows; same expansion as src/ui/Atlas.tsx).
Paths in the block: absolute or ~/…, «03_Assets/…» (→ project.library_root), anything else is relative to the project
folder (the folder with voiceover.txt, one level above short/).
Not a CLI — imported by cutout_cards.py, atlas_scene.py, atlas_webp.py and atlas_check.py.
"""
import json, os, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]            # short/
PROJECT_DIR = ROOT.parent                            # folder with voiceover.txt, vo_*.wav, gemini/ …
ATLAS_FPS = 30                                       # rig export and talking cards: 30 fps (src/lib/time.ts ATLAS_FPS)
LEAD, TAIL = 0.1, 0.3
AB_HOOK = {'h': 300, 'until': 1.0, 'corner': 'tr'}        # R2 hook defaults (src/ui/Atlas.tsx AB_HOOK)
CORNERS = ('tl', 'tr', 'bl', 'br')
CARD_DIR = 'atlas'                                   # cards → public/atlas/<pose>.png, talking cards → public/atlas/<pose>_talk/
RIG_DIR = 'atlas/rig'                                # rig sequence → public/atlas/rig/f_NNNNN.webp (global 30 fps index)


def load_project():
	return json.load(open(ROOT / 'project.json', encoding='utf-8'))


def load_words():
	return json.load(open(ROOT / 'data/words.json', encoding='utf-8'))


def clock(project=None, words=None):
	"""VO_END, DURATION exactly as src/lib/time.ts."""
	project = project or load_project()
	words = words or load_words()
	last = words[-1]
	r3 = lambda x: round(x * 1000) / 1000
	vo_end = r3(project['vo_end'] if project.get('vo_end') is not None else last['e'] + 0.15)
	dur = r3(project['duration'] if project.get('duration') is not None else last['e'] + project.get('tail_s', 0.9))
	return vo_end, dur


def ab_variants(project=None):
	"""names of the A/B variants (R2) that Root.tsx registers as Short-<name>; [] unless project.ab.enabled."""
	project = project or load_project()
	ab = project.get('ab') or {}
	return list((ab.get('variants') or {}).keys()) if ab.get('enabled') else []


def hook_windows(project=None):
	"""one window per A/B variant with atlas_hook: Atlas from frame 0 to atlas_hook_until, only in that variant."""
	project = project or load_project()
	out = []
	for v in ab_variants(project):
		c = (project['ab']['variants'] or {}).get(v) or {}
		if c.get('atlas_hook'):
			out.append({'from_word': 0, 'to_word': 0, 'from_s': 0, 'until': c.get('atlas_hook_until', AB_HOOK['until']),
				'pose': c.get('atlas_hook_pose', ''), 'corner': c.get('atlas_hook_corner', AB_HOOK['corner']),
				'h': c.get('atlas_hook_h', AB_HOOK['h']), 'variant': v, 'hook': True})
	return out


def atlas_block(project=None):
	"""the "atlas" block in the canonical form {source, poses, windows, rig}; a legacy single card
	{"card", "in_word", "out", "x", "top", "h"} becomes one card window; the A/B hook windows are appended.
	None = no Atlas in this Short."""
	project = project or load_project()
	a = project.get('atlas')
	hooks = hook_windows(project)
	if not a:
		return {'source': 'cards', 'poses': [], 'windows': hooks, 'rig': {}} if hooks else None
	if 'card' in a and 'windows' not in a:
		pid = Path(a['card']).stem
		return {'source': 'cards', 'legacy': True, 'poses': [{'id': pid, 'png': a['card']}], 'rig': {},
			'windows': [{'from_word': a.get('in_word', 0), 'to_word': 'end', 'pose': pid, 'at': [a.get('x', 175), a.get('top', 720)],
				'h': a.get('h', 470), 'lead': 0.1, 'until': a.get('out') if a.get('out') is not None else clock(project)[0]}] + hooks}
	a = dict(a)
	a.setdefault('source', 'cards')
	a.setdefault('poses', [])
	a['windows'] = list(a.get('windows') or []) + hooks
	a.setdefault('rig', {})
	return a


def resolve(p, project=None):
	"""a path from project.json → absolute Path (see module docstring)."""
	project = project or load_project()
	p = os.path.expanduser(str(p))
	if os.path.isabs(p):
		return Path(p)
	if p.startswith('03_Assets/'):
		return Path(project.get('library_root', '')) / p
	return (PROJECT_DIR / p).resolve()


def rig_root(block=None):
	"""the Atlas rig (read-only here): env ATLAS_RIG, atlas.rig.path, or ~/shorts/orangutan."""
	r = os.environ.get('ATLAS_RIG') or ((block or {}).get('rig') or {}).get('path') or '~/shorts/orangutan'
	return Path(os.path.expanduser(r))


def scene_id(project=None, block=None):
	project = project or load_project()
	sid = ((block or {}).get('rig') or {}).get('scene') or 'atlas_' + project.get('slug', 'short')
	return re.sub(r'[^a-z0-9_]', '_', sid.lower())


def window_times(win, words, dur):
	"""(t0, t1) in seconds of one window, same formula as AtlasWindows in src/ui/Atlas.tsx."""
	a = int(win['from_word'])
	t0 = max(0.0, float(win['from_s'])) if win.get('from_s') is not None else max(0.0, words[a]['s'] - win.get('lead', LEAD))
	if win.get('until') is not None:
		t1 = min(dur, float(win['until']))          # seconds override (legacy single card: "out")
	elif win.get('to_word', 'end') == 'end':
		t1 = dur
	else:
		t1 = min(dur, words[int(win['to_word'])]['e'] + win.get('tail', TAIL))
	return round(t0, 3), round(t1, 3)


def frame_range(t0, t1, margin=0.2, n_max=None):
	"""first and last 30 fps frame index (inclusive) covering [t0 − margin, t1 + margin]; AtlasWindows reads floor(t·30)
	inside the window, at most frame n_max − 1 (the rig exports round(duration·30) frames: pass n_max = that count)."""
	i0 = max(0, int((t0 - margin) * ATLAS_FPS))
	i1 = int((t1 + margin) * ATLAS_FPS)
	if n_max is not None:
		i1 = min(i1, n_max - 1)
	return i0, i1


def frames_needed(t0, t1, dur):
	"""the frame indexes AtlasWindows will request for a window [t0, t1) (same clamp as src/ui/Atlas.tsx)."""
	return range(int(t0 * ATLAS_FPS), min(int(t1 * ATLAS_FPS), round(dur * ATLAS_FPS) - 1) + 1)


def credits_text():
	p = ROOT / 'CREDITS.md'
	return p.read_text(encoding='utf-8') if p.exists() else ''


def add_credits(lines, header='## Atlas (арт владельца)'):
	"""add CREDITS.md lines whose file is not mentioned yet, at the end of the Atlas section (created at the end if missing)."""
	p = ROOT / 'CREDITS.md'
	txt = credits_text()
	new = [l for l in lines if l.split('`')[1] not in txt]
	if not new:
		return 0
	rows = txt.rstrip('\n').split('\n') if txt.strip() else ['# CREDITS']
	if header not in rows:
		rows += ['', header]
		at = len(rows)
	else:
		at = rows.index(header) + 1
		while at < len(rows) and not rows[at].startswith('## '):
			at += 1
		while at > 0 and not rows[at - 1].strip():
			at -= 1
	rows[at:at] = new
	p.write_text('\n'.join(rows) + '\n', encoding='utf-8')
	return len(new)
