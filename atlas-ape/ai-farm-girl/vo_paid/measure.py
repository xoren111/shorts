"""Words per second + transcript check with whisper large-v3-turbo (same metric as the 23.10 moment analysis: whisper word
segments / clip duration). usage: python3 measure.py FILE.wav [...]"""
import json, os, re, subprocess, sys, difflib
from pathlib import Path
HERE = Path(__file__).resolve().parent
ref = re.findall(r"[a-z0-9']+", (HERE.parent / 'voiceover.txt').read_text().lower())
for f in sys.argv[1:]:
    p = Path(f); wav = HERE / (p.stem + '_16k.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-ar', '16000', '-ac', '1', str(wav)], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(wav)], capture_output=True, text=True).stdout)
    subprocess.run(['whisper-cli', '-m', os.path.expanduser('~/.cache/whisper/ggml-large-v3-turbo.bin'), '-f', str(wav), '-ml', '1', '-sow', '-oj',
                    '-of', str(HERE / (p.stem + '_whisper')), '-l', 'en', '-np'], capture_output=True)
    segs = [s for s in json.load(open(HERE / (p.stem + '_whisper.json')))['transcription'] if s['text'].strip()]
    hyp = re.findall(r"[a-z0-9']+", ' '.join(s['text'] for s in segs).lower().replace('-', ' '))
    refn = re.findall(r"[a-z0-9']+", ' '.join(ref).replace('-', ' '))
    sm = difflib.SequenceMatcher(None, refn, hyp); match = sum(b.size for b in sm.get_matching_blocks())
    print(f"{p.name}: {dur:.2f} s, whisper words {len(segs)}, words/s {len(segs)/dur:.2f}, text words {len(refn)} → {len(refn)/dur:.2f}/s, transcript match {match}/{len(refn)}")
    os.remove(wav)
