"""Fetch a handful of ElevenLabs Sound-Effects renders (optional layer on top of the procedural library).

  python3 tools/sfx_eleven.py [name ...]      # default: every name in PROMPTS that is not cached yet

Raw mp3 → data/sfx_el/<name>.mp3 (cache, never re-requested).  tools/sfx.py converts them to
public/sfx/<name>_el.wav (48 kHz / 16 bit / stereo / −3 dBFS) and lists them in index.json with source "elevenlabs".

The key is read from ~/shorts/orangutan/.env (ELEVENLABS_API_KEY) and is never printed or written anywhere.
On 401 / 402 / 403 / 429 the script stops immediately (free account limits) — the procedural versions stay in use.
"""
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'data', 'sfx_el')
ENV = os.path.expanduser('~/shorts/orangutan/.env')
URL = 'https://api.elevenlabs.io/v1/sound-generation'

# name → (prompt, duration s, prompt_influence)
PROMPTS = {
	'explosion_big': ('Massive cinematic bomb explosion: sharp crack, huge deep boom, then rocks and debris raining down. '
	                  'Powerful low end, no music.', 3.0, 0.6),
	'steam_hiss_big': ('Enormous violent hiss of cold seawater hitting molten lava: roaring steam blast with layered crackling sizzle. '
	                   'No music.', 4.0, 0.6),
	'biplane_flyby': ('Vintage 1930s biplane with a radial piston engine and propeller flies fast low overhead, '
	                  'loud doppler pass-by, then fades away. No music.', 3.5, 0.55),
	'bomb_whistle': ('Single falling aerial bomb whistle, long descending pitch, ending abruptly. No explosion, no music.', 1.5, 0.6),
	'fissure_rip': ('Ground tearing open in a volcanic fissure eruption: rock cracking and splitting, deep earthquake rumble, '
	                'roaring gas jet. No music.', 2.5, 0.6),
	'lava_fountain': ('Roaring volcanic lava fountain: powerful jet of gas, spattering molten rock, deep rumble. No music.', 5.0, 0.55),
	'ship_horn_low': ('One long deep foghorn blast of a big ship in a harbor at night. No music.', 2.5, 0.6),
	'crowd_cheer_short': ('Small crowd of people shouting a short happy "hooray" cheer with a little applause. No music.', 1.5, 0.5),
	'lava_crackle': ('Close-up of bubbling, glugging molten lava with crackling cooling rock crust. No music.', 5.0, 0.55),
	'boats_engines': ('Several small fishing boat diesel engines puttering and leaving a harbor at night, water lapping. No music.', 5.0, 0.5),
}

STOP_CODES = {401, 402, 403, 429}


def key():
	if os.environ.get('ELEVENLABS_API_KEY'):
		return os.environ['ELEVENLABS_API_KEY'].strip()
	with open(ENV, encoding='utf-8') as f:
		for line in f:
			line = line.strip()
			if line.startswith('ELEVENLABS_API_KEY'):
				return line.split('=', 1)[1].strip().strip('"').strip("'")
	raise SystemExit('ELEVENLABS_API_KEY not found')


def fetch(name, k):
	text, dur, infl = PROMPTS[name]
	body = json.dumps({'text': text, 'duration_seconds': dur, 'prompt_influence': infl}).encode()
	req = urllib.request.Request(URL, data=body, method='POST',
	                             headers={'xi-api-key': k, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
	try:
		with urllib.request.urlopen(req, timeout=120) as r:
			data = r.read()
	except urllib.error.HTTPError as e:
		msg = e.read()[:300].decode('utf-8', 'replace')
		return e.code, msg
	except urllib.error.URLError as e:
		return -1, str(e.reason)
	if len(data) < 2000:
		return -2, f'suspiciously small response ({len(data)} bytes)'
	with open(os.path.join(CACHE, name + '.mp3'), 'wb') as f:
		f.write(data)
	return 200, f'{len(data)} bytes'


def main(names):
	os.makedirs(CACHE, exist_ok=True)
	names = names or [n for n in PROMPTS if not os.path.exists(os.path.join(CACHE, n + '.mp3'))]
	k = key()
	for n in names:
		if n not in PROMPTS:
			print(f'{n}: no prompt defined')
			continue
		code, msg = fetch(n, k)
		print(f'{n}: HTTP {code} {msg}')
		if code in STOP_CODES or code < 0:
			print('stopping — staying procedural for the rest')
			return 1
	return 0


if __name__ == '__main__':
	sys.exit(main(sys.argv[1:]))
