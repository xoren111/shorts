"""Every pause → 0.22 s (crossfaded, never inside a word), a slightly longer beat after the punchlines; carries the ElevenLabs
character timestamps through the cuts → <label>_tight.wav + <label>_tight_words.json. Same method as pig-war/vo_paid/tight.py; KEEP = pause after that word (twist / final beats), not capped.
usage: python3 tight.py LABEL [LABEL ...]"""
import json, os, re, subprocess, sys
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent
SR = 44100; GAP = float(os.environ.get('GAP', '0.22')); SUF = '_tight' if GAP == 0.22 else f'_tight{int(round(GAP*100))}'
KEEP = {'door': 0.24, 'dead': 0.42, 'wasnt': 0.24, 'loved': 0.36}   # hook beat, before «He wasn't.», after it, before the final line
text = (HERE.parent / 'voiceover.txt').read_text().strip()
spans = [(m.start(), m.end(), m.group()) for m in re.finditer(r'\S+', text) if any(c.isalnum() for c in m.group())]   # «—» is not a word
for label in sys.argv[1:]:
    al = json.load(open(HERE / f'{label}.json'))
    cs, ce = al['character_start_times_seconds'], al['character_end_times_seconds']
    def core(a, b):
        idx = [i for i in range(a, b) if text[i].isalnum()]
        return idx[0], idx[-1]
    words = [[cs[core(a, b)[0]], ce[core(a, b)[1]], w] for a, b, w in spans]
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(HERE / f'{label}.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                                     capture_output=True, check=True).stdout, np.float32).copy()
    hop = SR // 100; nf = len(x) // hop
    rms = np.sqrt(np.mean(x[:nf * hop].reshape(nf, hop) ** 2, axis=1) + 1e-12); db = 20 * np.log10(rms / rms.max())
    quiet = db < -40.0; sil = []; i = 0
    while i < nf:
        if quiet[i]:
            j = i
            while j < nf and quiet[j]: j += 1
            if i > 0 and j < nf: sil.append((i * hop / SR, j * hop / SR))
            i = j
        else: i += 1
    clipped = []
    for s, e in sil:
        for ws_, we_, _w in words:
            if ws_ - 0.04 < e and we_ + 0.04 > s:
                if ws_ - 0.04 <= s: s = max(s, we_ + 0.04)
                else: e = min(e, ws_ - 0.04)
        if e - s > 0.05: clipped.append((s, e))
    cuts = []
    for s, e in clipped:
        prev = [w for w in words if w[1] <= s + 0.12]
        key = re.sub(r'[^a-z]', '', prev[-1][2].lower()) if prev else ''
        target = KEEP.get(key, GAP)
        if e - s <= target + 0.02: continue
        cuts.append((s + target / 2, e - target / 2))
    XF = int(0.02 * SR); out, pos = [], 0
    for a, b in cuts:
        ia, ib = int(a * SR), int(b * SR); seg = x[pos:ia + XF].copy()
        if out:
            f = np.linspace(0, 1, XF, dtype=np.float32); out[-1][-XF:] = out[-1][-XF:] * (1 - f) + seg[:XF] * f; seg = seg[XF:]
        out.append(seg); pos = ib
    seg = x[pos:].copy()
    if out:
        f = np.linspace(0, 1, XF, dtype=np.float32); out[-1][-XF:] = out[-1][-XF:] * (1 - f) + seg[:XF] * f; seg = seg[XF:]
    out.append(seg); y = np.concatenate(out)
    def remap(t):
        d = 0.0
        for a, b in cuts:
            if t >= b: d += b - a
            elif t > a: d += t - a
        return t - d
    tw = [{'w': w, 's': round(remap(s), 3), 'e': round(remap(e), 3)} for s, e, w in words]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', str(HERE / f'{label}{SUF}.wav')], input=y.tobytes(), check=True)
    json.dump(tw, open(HERE / f'{label}{SUF}_words.json', 'w'), indent=0)
    print(f'{label}: {len(x)/SR:.2f} → {len(y)/SR:.2f} s, {len(cuts)} pauses cut, first word {tw[0]["s"]:.2f}, speech ends {tw[-1]["e"]:.2f}')
