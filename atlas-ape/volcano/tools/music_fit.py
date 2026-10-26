#!/usr/bin/env python3
"""Pick music for a Short by measurement (I can't listen): tempo, energy curve, and the window of each track that best
follows the story's intensity curve (hook → Hawaii → Italy → Iceland climax → quiet joke ending).
Also writes preview mixes (voice + music, ducked under the voice) so the owner can listen in context.
Run: python3 tools/music_fit.py
"""
import json, pathlib, subprocess
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAND = ROOT / 'music_candidates'
VO = ROOT / 'vo_silas_v4_gen1.mp3'
SR, HOP = 22050, 0.5                                     # analysis rate, curve step (s)
# story sections (Silas take, whisper word times): hook 0, Hawaii 6.96, Italy 24.64, Iceland 39.30,
# climax «ocean» 56.5 / «billion» 59.3, final joke 68.94, end 75.8
SECTIONS = [(0.0, 0.70), (1.0, 0.60), (6.96, 0.45), (24.64, 0.58), (39.30, 0.72), (56.5, 1.0), (66.0, 1.0),
            (68.94, 0.15), (76.8, 0.15)]


def load(p):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.int16).astype(np.float32) / 32768


def target(n):
    t = np.arange(n) * HOP; xs, ys = zip(*SECTIONS)
    return np.interp(t, xs, ys)


def energy(x):
    w = int(SR * HOP); n = len(x) // w
    rms = np.sqrt(np.mean(x[: n * w].reshape(n, w) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    k = 4; db = np.convolve(np.pad(db, (k, k), mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), 'valid')   # ~4.5 s smoothing
    lo, hi = np.percentile(db, 5), np.percentile(db, 98)
    return np.clip((db - lo) / (hi - lo + 1e-9), 0, 1), db


def tempo(x):
    n_fft, hop = 2048, 512
    frames = np.lib.stride_tricks.sliding_window_view(x, n_fft)[::hop] * np.hanning(n_fft)
    mag = np.abs(np.fft.rfft(frames, axis=1))
    flux = np.maximum(0, np.diff(np.log1p(mag), axis=0)).sum(1); flux -= flux.mean()
    ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    fps = SR / hop; bpms = np.arange(60, 181)
    lags = fps * 60 / bpms
    score = np.interp(lags, np.arange(len(ac)), ac) * np.exp(-0.5 * (np.log2(bpms / 115) / 0.9) ** 2)   # mild prior ~115
    return int(bpms[np.argmax(score)])


def main():
    vo = load(VO); L = int(np.ceil((len(vo) / SR + 1.0) / HOP)); tgt = target(L)
    rows = []
    for p in sorted(CAND.glob('*.mp3')):
        x = load(p); e, db = energy(x); dur = len(x) / SR
        best = (-2, 0)
        for off in range(0, max(1, len(e) - L + 1)):
            seg = e[off: off + L]
            if len(seg) < L: break
            c = np.corrcoef(seg[: int(68.9 / HOP)], tgt[: int(68.9 / HOP)])[0, 1]   # the joke ending is a hard cut anyway
            if c > best[0]: best = (float(c), off)
        c, off = best; seg = e[off: off + L]
        ice = seg[int(39.3 / HOP): int(68.9 / HOP)].mean(); pre = seg[int(7 / HOP): int(39.3 / HOP)].mean()
        peak_t = off * HOP + int(np.argmax(seg[: int(69 / HOP)])) * HOP
        rows.append(dict(track=p.stem, dur=round(dur, 1), bpm=tempo(x), offset=off * HOP, fit=round(c, 3),
                         iceland_lift=round(float(ice - pre), 2), peak_in_track=round(peak_t, 1),
                         peak_in_video=round(peak_t - off * HOP, 1), file=p.name))
    rows.sort(key=lambda r: -(r['fit'] + 0.5 * r['iceland_lift']))
    (ROOT / 'music_candidates' / 'analysis.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False))
    for r in rows:
        print(f"{r['track'][:42]:42s} {r['dur']:6.1f}s {r['bpm']:4d} BPM  start@{r['offset']:5.1f}s  fit {r['fit']:+.2f}  "
              f"Iceland lift {r['iceland_lift']:+.2f}  peak at video {r['peak_in_video']:5.1f}s")
    # preview mixes: music window ducked under the voice (sidechain), music cut at the final joke with a 0.3 s fade
    out = ROOT / 'music_candidates' / 'previews'; out.mkdir(exist_ok=True)
    for r in rows:
        dst = out / f"preview - {r['track']}.mp3"
        fc = (f"[1:a]atrim=start={r['offset']}:duration=69.2,asetpts=PTS-STARTPTS,afade=t=out:st=68.9:d=0.3,"
              f"volume=-6dB,aresample=48000,aformat=channel_layouts=stereo[m];"
              f"[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[v][sc];"
              f"[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];"
              f"[v][md]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5[o]")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(VO), '-i', str(CAND / r['file']), '-filter_complex', fc,
                        '-map', '[o]', '-b:a', '192k', str(dst)], check=True)
    print('previews →', out)


if __name__ == '__main__':
    main()
