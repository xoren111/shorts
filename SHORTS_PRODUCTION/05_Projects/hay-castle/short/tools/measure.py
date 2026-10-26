#!/usr/bin/env python3
"""Moment metrics for a vertical Short: motion per second, hard cuts, words/s.

motion  = mean |frame_t - frame_t-1| of grayscale 135x240 frames at 30 fps (0..255), per second
cuts    = ffmpeg scene score > 0.30 (hard cuts), reported per 10 s
words/s = whisper-cli word count / speech span (first word -> last word)
usage: python3 -I measure.py VIDEO [--whisper MODEL] > out.json
"""
import json, subprocess, sys, os, re, tempfile
import numpy as np

W, H, FPS = 135, 240, 30


def frames(path):
    cmd = ['ffmpeg', '-loglevel', 'error', '-i', path, '-vf',
           f'fps={FPS},scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,format=gray',
           '-f', 'rawvideo', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)


def cuts(path):
    cmd = ['ffmpeg', '-loglevel', 'info', '-i', path, '-vf', "select='gt(scene,0.30)',showinfo", '-an', '-f', 'null', '-']
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    return [float(m) for m in re.findall(r'pts_time:([0-9.]+)', err)]


def words(path, model):
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, 'a.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-ar', '16000', '-ac', '1', wav], check=True)
        subprocess.run(['whisper-cli', '-m', model, '-f', wav, '-ml', '1', '-oj', '-of', os.path.join(td, 'w'), '-np'],
                       capture_output=True, check=True)
        j = json.load(open(os.path.join(td, 'w.json')))
    # with -ml 1 whisper emits sub-word tokens; a token starting with a space opens a new word
    ws = []
    for seg in j['transcription']:
        raw = seg['text']
        t = raw.strip()
        if not re.search(r'[A-Za-z0-9]', t):
            continue
        a, b = seg['offsets']['from'] / 1000, seg['offsets']['to'] / 1000
        if ws and not raw.startswith(' '):
            ws[-1] = (ws[-1][0], b, ws[-1][2] + t)
        else:
            ws.append((a, b, t))
    return ws


def main():
    path = sys.argv[1]
    model = sys.argv[sys.argv.index('--whisper') + 1] if '--whisper' in sys.argv else None
    f = frames(path)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    dur = len(f) / FPS
    per_sec = [round(float(d[max(0, i * FPS - 1):(i + 1) * FPS - 1].mean()), 2) for i in range(int(dur))]
    c = cuts(path)
    out = {'file': os.path.basename(path), 'duration': round(dur, 2), 'motion_0_1': per_sec[0] if per_sec else None,
           'motion_0_3': round(float(np.mean(per_sec[:3])), 2), 'motion_mean': round(float(d.mean()), 2),
           'motion_per_sec': per_sec, 'cuts': [round(x, 2) for x in c],
           'cuts_per_10s': round(len(c) / dur * 10, 2), 'first_cut': round(c[0], 2) if c else None}
    if model:
        ws = words(path, model)
        if ws:
            span = ws[-1][1] - ws[0][0]
            out.update({'speech_start': ws[0][0], 'n_words': len(ws), 'words_per_s': round(len(ws) / span, 2),
                        'first_3s_text': ' '.join(w[2] for w in ws if w[0] < 3.0),
                        'transcript': ' '.join(w[2] for w in ws)})
    print(json.dumps(out, ensure_ascii=False))


main()
