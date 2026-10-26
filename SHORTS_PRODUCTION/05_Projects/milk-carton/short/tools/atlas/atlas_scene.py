"""Atlas rig performance for this Short → data/atlas_scene.json (a ~/shorts/orangutan scene: data only, rig untouched).

Input = project.json → "atlas": {"source": "rig", "windows": [{"from_word": i, "to_word": j | "end", "pose": "shock", …}],
                                 "rig": {"scene": "atlas_<slug>", "view": "front", "lipsync": false}}
Each window fires its acting cue (emotion + rig animation, table POSES below or the window's own "emotion" / "play") on its
first word; at the window end Atlas settles back into his base mood (sarcastic smirk). Atlas is rendered over the whole VO
(one continuous performance, deterministic export), but the Short shows him only inside the windows (AtlasWindows).
lipsync: true → visemes from data/rhubarb.json (Rhubarb Lip Sync on the VO + ../voiceover.txt, made if missing) over the
whole VO — only for windows where Atlas is the one speaking.

Stage: canvas 1800×1400, rig root at (820, 1350), scale 1.5 (the scene stage is authored for 1080×1920 and scales with the
output size: fx = W/1080, fy = H/1920, k = scale·min(fx, fy)) — every gesture fits (pointer +628·1.5 right, wave −524·1.5 left,
hat ≈ 1250 px above the root). atlas_webp.py crops the frames to what is actually used.

  python3 tools/atlas/atlas_scene.py              → data/atlas_scene.json + the commands to run
  python3 tools/atlas/atlas_scene.py --install    also copy it to <rig>/scenes/<id>.json (+ VO → <rig>/assets/audio when lipsync)
Then, in the rig:  npm run export -- <id> --w 1800 --h 1400   →  python3 tools/atlas/atlas_webp.py
"""
import argparse, json, shutil, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, load_project, load_words, clock, atlas_block, resolve, rig_root, scene_id, window_times

W, H = 1800, 1400
CX, CY, K = 820, 1350, 1.5
BASE = ('sarcastic', 0.6)        # identity: calm, self-assured irony (CHARACTER_RULES)
# pose → (emotion, intensity, rig animation | None). Only base-body clips; 2.5D (look_up, glance_away) and legs-body clips
# (walk, dance_meme, sit) are left out on purpose (rig CLAUDE.md: experiments, not for scenes).
POSES = {
	'shock': ('surprised', 0.85, 'surprise_reaction'),
	'laugh': ('laughing', 0.9, 'laugh'),
	'thinking': ('thinking', 0.75, 'thinking'),
	'thumbs_up': ('happy', 0.7, 'thumbs_up'),
	'wink': ('sarcastic', 0.7, 'wink'),
	'wave': ('happy', 0.6, 'wave'),
	'facepalm': ('sad', 0.5, 'facepalm'),
	'shrug': ('confused', 0.6, 'shrug'),
	'nod': ('happy', 0.5, 'nod'),
	'no': ('skeptical', 0.6, 'shake_head'),          # approximate head shake (rig: only in-plane wobble)
	'point': ('sarcastic', 0.6, 'point'),
	'ok': ('happy', 0.6, 'ok_sign'),
	'peace': ('happy', 0.6, 'peace_sign'),
	'count': ('neutral', 0.5, 'count_three'),
	'phone': ('thinking', 0.6, 'phone_look'),
	'magnifier': ('suspicious', 0.7, 'magnifier_look'),
	'globe': ('happy', 0.6, 'show_globe'),
	'smirk': ('sarcastic', 0.6, None),
}
# Rhubarb shapes → rig visemes (same mapping as the rig's src/engine/rhubarb.ts)
MAP = {'A': 'MBP', 'B': 'E', 'C': 'E', 'D': 'AI', 'E': 'O', 'F': 'U', 'G': 'FV', 'H': 'LTH', 'X': 'rest'}


def acting(win, rig):
	"""(emotion, intensity, animation) of one window, checked against the rig's emotions/ and animations/ (read-only)."""
	pose = win.get('pose', 'smirk')
	emo, inten, anim = POSES.get(pose, (None, 0.6, None))
	if emo is None and (rig / 'emotions' / f'{pose}.json').exists():
		emo = pose                                      # a bare emotion id works as a pose
	emo = win.get('emotion', emo)
	inten = win.get('intensity', inten)
	anim = win.get('play', anim)
	if emo is None:
		raise SystemExit(f'✗ pose «{pose}» unknown: use one of {", ".join(POSES)}, a rig emotion id, or set "emotion" / "play"')
	if not (rig / 'emotions' / f'{emo}.json').exists():
		raise SystemExit(f'✗ emotion «{emo}» is not in {rig}/emotions')
	if anim and not (rig / 'animations' / f'{anim}.json').exists():
		raise SystemExit(f'✗ animation «{anim}» is not in {rig}/animations')
	return emo, inten, anim


def visemes(project):
	rj = ROOT / 'data/rhubarb.json'
	if not rj.exists():
		from cutout_cards import ensure_rhubarb
		ensure_rhubarb(project)
	cues = json.load(open(rj))['mouthCues']
	vis = []
	for c in cues:
		v = MAP.get(c['value'], 'rest')
		if not vis or vis[-1]['v'] != v:
			vis.append({'t': round(c['start'], 3), 'v': v})
	if vis and vis[-1]['v'] != 'rest':
		vis.append({'t': round(cues[-1]['end'], 3), 'v': 'rest'})
	return vis


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument('--install', action='store_true', help='copy the scene (and VO for lipsync) into the rig repo')
	a = ap.parse_args()
	project = load_project()
	block = atlas_block(project)
	wins = [w for w in block['windows'] if w.get('source', block['source']) == 'rig'] if block else []
	if not wins:
		raise SystemExit('project.json → "atlas" has no rig windows ("source": "rig" for the block or a window; README, «Atlas»)')
	rig = rig_root(block)
	if not (rig / 'scenes').is_dir():
		raise SystemExit(f'✗ rig not found: {rig}')
	words = load_words()
	_, dur = clock(project, words)
	cfg = block.get('rig') or {}
	sid = scene_id(project, block)
	fx, fy = W / 1080, H / 1920
	stage = {'x': round(CX / fx, 3), 'y': round(CY / fy, 3), 'scale': round(K / min(fx, fy), 4)}
	tl = [
		{'t': 0, 'do': 'view', 'id': cfg.get('view', 'front'), 'blink': False},
		{'t': 0, 'do': 'lookAt', 'target': 'camera'},
		{'t': 0, 'do': 'emotion', 'id': BASE[0], 'intensity': BASE[1], 'transition': 0},
	]
	audio = None
	if cfg.get('lipsync'):
		audio = f'{sid}.wav'
		tl.append({'t': 0, 'do': 'say', 'visemes': visemes(project), 'duration': dur, 'audio': audio})
	rows = []
	for k, win in enumerate(sorted(wins, key=lambda w: int(w['from_word']))):
		t0, t1 = window_times(win, words, dur)
		emo, inten, anim = acting(win, rig)
		cue = round(t0 + 0.05, 3)
		tl.append({'t': cue, 'do': 'emotion', 'id': emo, 'intensity': inten, 'transition': 0.12})
		settle = t1 if t1 < dur - 0.05 else None
		if anim:
			tl.append({'t': cue, 'do': 'play', 'id': anim})
			# a reaction is short (CHARACTER_RULES: peak ≤ 0.6 s, then back to calm irony): settle when the clip ends
			a_dur = json.load(open(rig / 'animations' / f'{anim}.json')).get('duration', 0)
			if a_dur and cue + a_dur < (settle or dur) - 0.3:
				settle = cue + a_dur
		if settle is not None:
			tl.append({'t': round(settle, 3), 'do': 'emotion', 'id': BASE[0], 'intensity': BASE[1], 'transition': 0.25})
		rows.append(f'  window {k}: {t0:6.2f}–{t1:6.2f} s  «{words[int(win["from_word"])]["w"]}…»  {win.get("pose")}: {emo} {inten}' + (f' + {anim}' if anim else ''))
	scene = {
		'id': sid,
		'description': (f'Atlas for the Short «{project.get("slug")}» (SHORTS_PRODUCTION template): one performance over the whole VO '
			f'({dur} s), acting cues on the words of the Atlas windows in project.json, shown only inside those windows. '
			f'Generated by short/tools/atlas/atlas_scene.py — data only.'),
		'duration': dur, 'fps': 30, 'stage': stage,
		'timeline': sorted(tl, key=lambda s: s['t']),
	}
	out = ROOT / 'data/atlas_scene.json'
	out.write_text(json.dumps(scene, indent=1), encoding='utf-8')
	print(f'scene {sid} → {out}  ({len(wins)} rig windows, stage {stage}, lipsync {"on" if audio else "off"})')
	print('\n'.join(rows))
	if a.install:
		shutil.copy(out, rig / 'scenes' / f'{sid}.json')
		print('installed →', rig / 'scenes' / f'{sid}.json')
		if audio:
			subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(resolve(project['vo'], project)), '-ar', '48000', '-ac', '1',
				str(rig / 'assets/audio' / audio)], check=True)
			print('VO →', rig / 'assets/audio' / audio)
	else:
		print(f'next: python3 tools/atlas/atlas_scene.py --install   (copies the scene into {rig}/scenes)')
	print(f'then: (cd {rig} && npm run export -- {sid} --w {W} --h {H})  →  python3 tools/atlas/atlas_webp.py')


if __name__ == '__main__':
	main()
