"""conman-russell VO on the PAID ElevenLabs plan (copied from atlas-ape/football-222/vo_paid) → <label>.mp3 + <label>.json (character timestamps).
usage: python3 gen.py LABEL VOICE_ID MODEL SPEED   (key from ~/shorts/atlas-ape/.env.elevenlabs_paid)"""
import base64, json, sys, urllib.request
from pathlib import Path
HERE = Path(__file__).resolve().parent
KEY = [l.split('=', 1)[1].strip() for l in open(Path.home() / 'shorts/atlas-ape/.env.elevenlabs_paid') if l.startswith('ELEVENLABS_API_KEY=')][0]
text = (HERE.parent / 'voiceover.txt').read_text().strip()
label, voice, model, speed = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
body = {'text': text, 'model_id': model,
        'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0.0, 'use_speaker_boost': True, 'speed': speed}}
req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128',
                             data=json.dumps(body).encode(), headers={'xi-api-key': KEY, 'Content-Type': 'application/json'})
try:
    d = json.load(urllib.request.urlopen(req, timeout=180))
except urllib.error.HTTPError as e:
    print('HTTP', e.code, e.read()[:400]); sys.exit(1)
(HERE / f'{label}.mp3').write_bytes(base64.b64decode(d['audio_base64']))
json.dump(d.get('alignment'), open(HERE / f'{label}.json', 'w'))
print(label, 'ok')
