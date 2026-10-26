"""Pig War VO on the PAID ElevenLabs plan (Starter): Silas – Weathered Villain, Eleven v4, stability 0.5, similarity 0.75,
speed 1.0 (= the owner's chosen UI settings) → take_N.mp3 + take_N.json (character timestamps). Key from ../../.env.elevenlabs_paid."""
import base64, json, sys, urllib.request
from pathlib import Path
HERE = Path(__file__).resolve().parent
KEY = [l.split('=', 1)[1].strip() for l in open(HERE.parents[1] / '.env.elevenlabs_paid') if l.startswith('ELEVENLABS_API_KEY=')][0]
text = (HERE.parent / 'voiceover.txt').read_text().strip()
VOICE = 'WzVKtqQpTUUQ2JNx8YxI'
n = int(sys.argv[1]) if len(sys.argv) > 1 else 4
for k in range(1, n + 1):
	body = {'text': text, 'model_id': 'eleven_v4', 'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0.0, 'use_speaker_boost': True, 'speed': 1.0}}
	req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128',
	                             data=json.dumps(body).encode(), headers={'xi-api-key': KEY, 'Content-Type': 'application/json'})
	try:
		d = json.load(urllib.request.urlopen(req, timeout=120))
	except urllib.error.HTTPError as e:
		print('HTTP', e.code, e.read()[:400]); break
	(HERE / f'take_{k}.mp3').write_bytes(base64.b64decode(d['audio_base64']))
	json.dump(d.get('alignment'), open(HERE / f'take_{k}.json', 'w'))
	print('take', k, 'ok')
