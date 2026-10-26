"""A few ElevenLabs sound effects for the AI-farm-girl Short (paid key, ../../.env.elevenlabs_paid; never printed).
python3 tools/sfx_el.py → data/sfx_el/<name>.mp3 (cache) → public/sfx/<name>.wav (48 kHz, 16 bit, stereo, peak −3 dBFS)
"""
import json, os, pathlib, subprocess, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV = ROOT.parent.parent / '.env.elevenlabs_paid'
KEY = next(l.split('=', 1)[1].strip().strip('"') for l in ENV.read_text().splitlines() if l.startswith('ELEVENLABS_API_KEY='))
PROMPTS = {
	'cow_moo': ('A single friendly cow moo in a sunny pasture, close. No music.', 1.6, 0.6),
	'city_street': ('Busy Brazilian city street ambience by day: traffic, a motorbike passing, people chatting, distant horn. No music.', 3.0, 0.5),
	'radio_static': ('Old radio tuning: crackling static sweeping between stations, then a clean tone. No music, no voices.', 1.4, 0.6),
	'heartbeat': ('Two slow heavy heartbeats, deep and tense, cinematic. No music.', 1.6, 0.6),
	'meme_boom': ('One deep cinematic boom with sub bass, a dramatic meme hit, short reverb tail. No music.', 1.2, 0.65),
	'cash_register': ('Old cash register ka-ching: drawer opens, bell rings once. No music.', 1.0, 0.7),
	'projector': ('Old 16mm film projector rattling and clicking, steady, close. No music.', 1.6, 0.6),
	'phone_buzz': ('A smartphone vibrating twice on a wooden table. No music.', 1.0, 0.65),
}
(ROOT / 'data/sfx_el').mkdir(parents=True, exist_ok=True)
idx_p = ROOT / 'public/sfx/index.json'
idx = json.loads(idx_p.read_text())
for name, (prompt, dur, infl) in PROMPTS.items():
	mp3 = ROOT / 'data/sfx_el' / f'{name}.mp3'
	if not mp3.exists():
		req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation', method='POST',
			data=json.dumps({'text': prompt, 'duration_seconds': dur, 'prompt_influence': infl}).encode(),
			headers={'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
		mp3.write_bytes(urllib.request.urlopen(req, timeout=120).read())
	wav = ROOT / 'public/sfx' / f'{name}.wav'
	subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ar', '48000', '-ac', '2', '-af', 'loudnorm=I=-20:TP=-3,alimiter=limit=0.7', '-c:a', 'pcm_s16le', str(wav)], check=True)
	if not any(e['name'] == name for e in idx):
		idx.append({'name': name, 'source': 'elevenlabs', 'prompt': prompt})
	print(name, 'ok')
idx_p.write_text(json.dumps(idx, indent=1))
