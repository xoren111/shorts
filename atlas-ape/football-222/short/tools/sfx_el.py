"""A few ElevenLabs sound effects for «222–0» (paid key, ../../.env.elevenlabs_paid; never printed).
python3 tools/sfx_el.py → data/sfx_el/<name>.mp3 (cache) → public/sfx/<name>.wav (48 kHz, 16 bit, stereo, peak −3 dBFS)
"""
import json, os, pathlib, subprocess, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV = ROOT.parent.parent / '.env.elevenlabs_paid'
KEY = next(l.split('=', 1)[1].strip().strip('"') for l in ENV.read_text().splitlines() if l.startswith('ELEVENLABS_API_KEY='))
PROMPTS = {
	'clap_single': ('One single slow loud hand clap in a quiet room, close microphone. Only one clap, no crowd, no music.', 0.6, 0.7),
	'crowd_1916': ('Old-time college football stadium crowd roaring and cheering after a touchdown, wooden bleachers, '
	               'men shouting, no music, no announcer.', 4.0, 0.5),
	'brass_sting': ('Short 1910s marching band brass fanfare hit: trumpets and trombones, one bold triumphant chord with a drum hit.', 1.5, 0.6),
	'crowd_ooh': ('Large stadium crowd saying a surprised "ooooh" together. No music.', 2.0, 0.55),
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
