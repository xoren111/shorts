"""SFX for «The Pig War» — edits of free-licensed REAL recordings (assets/sfx_src/<name>/, each with meta.json;
credited in CREDITS.md «Sound effects») plus a few procedural layers on the tools/sfx.py DSP core.

  python3 -I tools/sfx_pig.py              # build all 22 → public/sfx/<name>.wav, update ONLY these entries in index.json
  python3 -I tools/sfx_pig.py NAME …       # only these
  python3 -I tools/sfx_pig.py --credits    # print the «Sound effects» markdown block for CREDITS.md (no build)

Run with `python3 -I`: the sources are untrusted downloads. They are only ever DECODED (ffmpeg → float PCM), never
imported or executed; -I keeps the script/working directory off sys.path (numpy/scipy come from the user site, added
explicitly below).

Output: 48 kHz, 16-bit PCM stereo (same as the rest of public/sfx, so tools/sfx.py --stats can read them), sample peak
−3 dBFS, 20 Hz high-pass + DC removal, short raised-cosine fades. Loops (loop: true) are seamless: the overhang is
cross-faded into the head (no edge fades), so the last sample runs into the first. `transient_at` = seconds from file
start to the main hit (shot, bang, snap, top note of the gliss …) — align that point with the picture.
"""
import json
import os
import site
import subprocess
import sys
from fractions import Fraction

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
if site.getusersitepackages() not in sys.path:
	sys.path.append(site.getusersitepackages())

import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402

import sfx as S  # noqa: E402
from sfx import SR, n_, tt, lp, hp, bp, st, place, reverb, pan_mono, norm, noise, phase, dec, att  # noqa: E402

ROOT = os.path.dirname(TOOLS)
SRC = os.path.join(ROOT, 'assets', 'sfx_src')
OUT = os.path.join(ROOT, 'public', 'sfx')
CHECKS = os.path.join(SRC, '_checks')
PEAK_DB = -3.0

# Kenney packs carry no meta.json (licence: their License.txt, CC0)
KENNEY = {
	'_packs/kenney_impact': ('Impact Sounds (1.0)', 'Kenney (www.kenney.nl)', 'CC0 1.0', 'https://kenney.nl/assets/impact-sounds'),
	'_packs/kenney_rpg': ('RPG Audio', 'Kenney (www.kenney.nl)', 'CC0 1.0', 'https://kenney.nl/assets/rpg-audio'),
}


# ================================================================ I/O + helpers

def load(rel, ss=0.0, dur=None, speed=1.0, mono=False):
	"""Decode assets/sfx_src/<rel> from ss for dur seconds of OUTPUT (after speed change) → float (n, 2) at 48 kHz.
	speed > 1 plays faster/higher (tape-style resample), < 1 slower/lower."""
	path = os.path.join(SRC, rel)
	cmd = ['ffmpeg', '-v', 'error', '-nostdin']
	if ss:
		cmd += ['-ss', f'{ss:.4f}']
	if dur is not None:
		cmd += ['-t', f'{dur * speed + 0.1:.4f}']
	cmd += ['-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
	raw = subprocess.run(cmd, capture_output=True, check=True).stdout
	x = np.frombuffer(raw, '<f4').reshape(-1, 2).astype(float)
	if speed != 1.0:
		fr = Fraction(1 / speed).limit_denominator(400)
		x = signal.resample_poly(x, fr.numerator, fr.denominator, axis=0)
	if dur is not None:
		x = x[:n_(dur)]
		if len(x) < n_(dur):
			x = np.concatenate([x, np.zeros((n_(dur) - len(x), 2))])
	if mono:
		x = np.stack([x.mean(1)] * 2, 1)
	return x


def db(g):
	return 10 ** (g / 20)


def fade(x, fin=0.0, fout=0.0, curve='cos'):
	x = st(np.asarray(x, float)).copy()
	for k, (m, rev) in enumerate(((n_(fin) if fin else 0, False), (n_(fout) if fout else 0, True))):
		if m <= 1:
			continue
		m = min(m, len(x))
		u = np.arange(m) / m
		w = 0.5 - 0.5 * np.cos(np.pi * u) if curve == 'cos' else u
		if rev:
			x[-m:] *= w[::-1, None]
		else:
			x[:m] *= w[:, None]
	return x


def nrm(x):
	return st(x) / (np.abs(x).max() + 1e-12)


def limit(x, thr_db=-8.0, release=0.04):
	"""Peak limiter (3 ms hold ≈ look-ahead, smooth release): tames lone crunch/click spikes so the body sits higher."""
	from scipy.ndimage import minimum_filter1d
	x = st(x)
	a = np.abs(x).max(1)
	g = np.minimum(1.0, db(thr_db) * a.max() / (a + 1e-12))
	g = minimum_filter1d(g, n_(0.003))
	out = np.empty_like(g)
	c, k = 1.0, np.exp(-1 / (release * SR))
	for i, v in enumerate(g):
		c = v if v < c else v + (c - v) * k
		out[i] = c
	return x * out[:, None]


def canvas(d):
	return np.zeros((n_(d), 2))


def put(buf, x, t0, g_db=0.0):
	place(buf, st(x) * db(g_db), t0)
	return buf


def env_rms(x, win=0.005):
	m = np.sqrt((st(x) ** 2).mean(1))
	k = max(1, n_(win))
	c = np.concatenate([[0], np.cumsum(m ** 2)])
	e = np.sqrt((c[k:] - c[:-k]) / k)
	return np.concatenate([e, np.full(k - 1, e[-1] if len(e) else 0)])


def onset(x, frac=0.35, win=0.003):
	e = env_rms(x, win)
	return float(np.argmax(e > frac * e.max()) / SR)


def peak_t(x, win=0.02):
	return float(np.argmax(env_rms(x, win)) / SR)


def autopan(x, rate=0.5, depth=0.6, phase0=0.0):
	m = st(x).mean(1)
	p = depth * np.sin(2 * np.pi * rate * tt(len(m) / SR) + phase0)
	a = (p + 1) * np.pi / 4
	return np.stack([m * np.cos(a), m * np.sin(a)], 1) * np.sqrt(2)


def width(x, w=1.0):
	x = st(x)
	mid, side = x.mean(1), (x[:, 0] - x[:, 1]) / 2
	return np.stack([mid + w * side, mid - w * side], 1)


def loopify(x, d, xf):
	return S.loopify(x, d, xf)


def best_loop(x, d_lo, d_hi, probe=0.15, step=0.002):
	"""Pick a loop length in [d_lo, d_hi] whose end matches the start best (spectral-envelope similarity)."""
	m = st(x).mean(1)
	k = n_(probe)
	a = np.abs(np.fft.rfft(m[:k] * np.hanning(k)))
	best, bd = -1, d_lo
	for d in np.arange(d_lo, d_hi, step):
		s = n_(d)
		if s + k > len(m):
			break
		b = np.abs(np.fft.rfft(m[s:s + k] * np.hanning(k)))
		c = float(np.dot(np.log1p(a), np.log1p(b)) / (np.linalg.norm(np.log1p(a)) * np.linalg.norm(np.log1p(b)) + 1e-12))
		if c > best:
			best, bd = c, float(d)
	return bd


def finish(x, loop=False, fin=0.002, fout=0.05, hpf=20):
	x = st(np.asarray(x, float))
	if not loop:
		x = hp(x, hpf, 2)
	x = x - x.mean(0)
	if not loop:
		x = fade(x, fin, fout)
	pk = np.abs(x).max()
	if not np.isfinite(pk) or pk <= 0:
		raise ValueError('silent or non-finite render')
	return x * (db(PEAK_DB) / pk)


# ================================================================ registry

LIB = {}


def snd(name, desc, sources, loop=False):
	def deco(fn):
		LIB[name] = dict(fn=fn, desc=desc, sources=sources, loop=loop)
		return fn
	return deco


# ================================================================ pig

@snd('pig_grunt', 'contented pig grunts and snorts while munching (real farm pig): soft chewing, a grunt at 0.1 s, chewing, '
     'second grunt ~1.85 s; cute, not aggressive', ['pig_grunt/fs620085_wwstudioswastaken.mp3'])
def s_pig_grunt():
	x = load('pig_grunt/fs620085_wwstudioswastaken.mp3', 1.82, 2.75)
	x = hp(x, 70, 2)
	x = fade(x, 0.03, 0.25)
	return x, onset(x, 0.3)


@snd('pig_oink', 'one clear cartoon-friendly pig oink (pulsed «o» into a tonal «ink»), dry', ['pig_oink/fs442906_qubodup.mp3'])
def s_pig_oink():
	x = load('pig_oink/fs442906_qubodup.mp3', 0.0, 0.74)
	x = hp(x, 80, 2)
	x = fade(x, 0.004, 0.09)
	return x, onset(x, 0.3)


@snd('pig_chew', 'crunchy munching of a raw potato/apple: a juicy bite-crunch at 0 s, two crunchy chomps (~0.55 s, '
     '~1.0 s); a real pig chewing underneath for porky wetness',
     ['pig_chew/fs494568_775noise.mp3', 'pig_chew/fs79243_RoofDog.mp3', 'pig_chew/crunch_2_0.ogg',
      'pig_grunt/fs620085_wwstudioswastaken.mp3'])
def s_pig_chew():
	d = 1.5
	buf = canvas(d)
	bite = fade(hp(load('pig_chew/fs494568_775noise.mp3', 0.02, 0.75), 100, 2), 0.003, 0.2)  # apple bite crunch
	put(buf, nrm(bite), 0.0, 0.0)
	ch1 = fade(hp(load('pig_chew/fs79243_RoofDog.mp3', 0.95, 0.6), 100, 2), 0.01, 0.15)  # crackly grinding chew
	put(buf, nrm(ch1), 0.55, -3.0)
	ch2 = fade(load('pig_chew/crunch_2_0.ogg', 0.0, 0.5), 0.005, 0.15)  # cucumber crunch
	put(buf, nrm(ch2), 1.0, -4.0)
	pig = fade(hp(load('pig_grunt/fs620085_wwstudioswastaken.mp3', 0.15, 1.5), 120, 2), 0.05, 0.3)  # pig mouth noises
	put(buf, nrm(pig), 0.0, -13.0)
	return limit(buf, -9.0), onset(bite, 0.3)


# ================================================================ shot / farm

@snd('musket_shot', 'one black-powder musket/rifle shot outdoors (real muzzle-loader, recorded next to the gun): '
     'boomy bang at 0.03 s, natural mountain reverb/echo tail ~2 s; no modern crack', ['musket_shot/fs538795_bruno.auzet.mp3'])
def s_musket_shot():
	x = load('musket_shot/fs538795_bruno.auzet.mp3', 0.255, 2.7)
	x = fade(x, 0.002, 0.6)
	return x, onset(x, 0.5, 0.001)


@snd('birds_flutter', 'a flock of birds bursting out of a tree: close wing-claps at the start, then a whole pigeon flock '
     'flapping away', ['birds_flutter/fs616623_TRP.mp3', 'birds_flutter/fs207387_sinewave1kHz.mp3'])
def s_birds_flutter():
	d = 1.7
	buf = canvas(d)
	flock = fade(load('birds_flutter/fs616623_TRP.mp3', 0.95, 1.7), 0.06, 0.45)
	put(buf, flock, 0.0, 0.0)
	close = fade(hp(load('birds_flutter/fs207387_sinewave1kHz.mp3', 0.28, 1.1), 200, 2), 0.004, 0.45)
	put(buf, pan_mono(close.mean(1), -0.35), 0.0, -2.0)
	return buf, onset(close, 0.4)


@snd('door_bang', 'wooden door flung open and banging against the wall: hard wooden slam at 0.05 s, rattling ring-out',
     ['door_bang/fs389811_krnash.mp3'])
def s_door_bang():
	x = load('door_bang/fs389811_krnash.mp3', 0.37, 1.75)
	x = fade(x, 0.002, 0.45)
	return x, onset(x, 0.5, 0.001)


# ================================================================ angel

def _denoise(x, noise_ref, floor=0.12, over=2.0):
	"""Simple spectral subtraction with a stationary noise profile (for the PD harp recording's hiss)."""
	out = np.zeros_like(x)
	nper, hop = 2048, 512
	for ch in range(2):
		_, _, N = signal.stft(noise_ref[:, ch], SR, nperseg=nper, noverlap=nper - hop)
		prof = np.abs(N).mean(1, keepdims=True)
		_, _, Z = signal.stft(x[:, ch], SR, nperseg=nper, noverlap=nper - hop)
		mag = np.abs(Z)
		g = np.maximum(1 - over * prof / (mag + 1e-12), floor)
		g = signal.convolve2d(g, np.ones((3, 3)) / 9, mode='same')
		_, y = signal.istft(Z * g, SR, nperseg=nper, noverlap=nper - hop)
		out[:, ch] = y[:len(x)] if len(y) >= len(x) else np.pad(y, (0, len(x) - len(y)))
	return out


@snd('harp_gliss', 'upward angelic harp glissando in C major (real concert harp), bright arpeggio sparkle arriving on top '
     'at ~1.15 s, airy ring-out', ['harp_gliss/Gliss.ogg', 'harp_gliss/fs610703_oggraphics.mp3'])
def s_harp_gliss():
	d = 2.3
	buf = canvas(d)
	raw = load('harp_gliss/Gliss.ogg', 0.0, 2.2)
	raw = hp(raw, 90, 4)
	harp = _denoise(raw, raw[n_(0.1):n_(0.6)])[n_(0.82):]
	harp = fade(harp, 0.02, 0.15)
	put(buf, harp, 0.0, 0.0)
	top = load('harp_gliss/fs610703_oggraphics.mp3', 0.12, 1.9)
	top = fade(hp(top, 150, 2), 0.01, 0.6)
	put(buf, top, 0.55, 3.0)
	buf = reverb(np.random.default_rng(7), buf, 1.6, 0.22, 7000, 0.02)[:n_(d)]
	return fade(buf, 0, 0.5), 1.15


@snd('angel_choir', 'soft heavenly «aaah» choir chord, swells in at 0.05 s, holds, gentle airy release (~2.4 s)',
     ['angel_choir/fs444491_Breviceps.mp3'])
def s_angel_choir():
	x = load('angel_choir/fs444491_Breviceps.mp3', 0.0, 2.38)
	x = reverb(np.random.default_rng(3), x, 1.4, 0.12, 6000, 0.02)[:n_(2.38)]
	x = fade(x, 0.01, 0.5)
	return x, onset(x, 0.3)


# ================================================================ money / paper

@snd('banknote', 'paper banknote snapped taut: a light rustle, then a crisp papery snap at ~0.24 s',
     ['banknote/fs413748_My_Name_Here.mp3'])
def s_banknote():
	x = load('banknote/fs413748_My_Name_Here.mp3', 0.62, 0.45)
	x = hp(x, 150, 2)
	x = fade(x, 0.01, 0.12)
	return x, peak_t(x, 0.004)


@snd('paper_tear', 'a sheet of paper torn in half: one continuous rip, loudest at the end', ['paper_tear/fs181773_keweldog.mp3'])
def s_paper_tear():
	x = load('paper_tear/fs181773_keweldog.mp3', 0.38, 0.92)
	x = hp(x, 120, 2)
	x = fade(x, 0.01, 0.12)
	return x, peak_t(x, 0.02)


@snd('quill_scratch', 'quill pen scratching a quick signature on paper (short strokes and a flourish), ~1.1 s',
     ['quill_scratch/fs194905_marcoman89.mp3'])
def s_quill_scratch():
	x = load('quill_scratch/fs194905_marcoman89.mp3', 73.86, 1.12)
	x = hp(x, 300, 2)
	x = fade(x, 0.01, 0.1)
	return x, onset(x, 0.3)


# ================================================================ military

YANKEE = 'fife_drum/The_United_States_Army_Old_Guard_Fife_and_Drum_Corps_-_09_-_Reveille_VariationDrum_CallSlow_ScotchQuick_ScotchYankee_DoodleMont.ogg'


@snd('fife_drum', 'period fife & drum corps playing «Yankee Doodle» (verse lines 1–2 = 4 bars of 2/4 at ~94 bpm); '
     'seamless loop', [YANKEE], loop=True)
def s_fife_drum():
	s0, xf = 105.47, 0.06
	x = load(YANKEE, s0, 5.6)
	x = hp(x, 30, 2)
	d = best_loop(x, 5.10, 5.17, probe=0.12, step=0.001)
	return loopify(x, d, xf), 0.0


def _steps(rel, ss, dur, thr=0.3, pre=0.015, length=0.55, min_gap=0.35):
	"""Cut individual footfalls out of a marching recording."""
	x = load(rel, ss, dur)
	e = env_rms(x, 0.01)
	pk, _ = signal.find_peaks(e, height=thr * e.max(), distance=n_(min_gap))
	out = []
	for p in pk:
		a = max(0, p - n_(pre))
		seg = x[a:a + n_(length)]
		if len(seg) == n_(length):
			out.append(fade(seg, 0.004, 0.2))
	return out


@snd('marching', 'a troop marching in step on dirt/grass: crunchy multi-boot footfalls every 0.6 s (100 steps/min); '
     'seamless 3.0 s loop', ['marching/fs393018_josecruz98.mp3', '_packs/kenney_impact'], loop=True)
def s_marching():
	period, nsteps = 0.6, 5
	d = period * nsteps
	steps = _steps('marching/fs393018_josecruz98.mp3', 0.0, 7.4)
	r = np.random.default_rng(11)
	buf = canvas(d + 1.0)
	grass = [load(f'_packs/kenney_impact/Audio/footstep_grass_00{k}.ogg', 0, 0.5) for k in range(5)]
	for i in range(nsteps):
		t = 0.05 + i * period
		s = steps[(i * 2) % len(steps)]
		put(buf, pan_mono(s.mean(1), (-0.15 if i % 2 else 0.15)), t, 0.0)
		s2 = steps[(i * 2 + 3) % len(steps)]
		put(buf, pan_mono(s2.mean(1), (0.3 if i % 2 else -0.3)), t + r.uniform(0.02, 0.045), -5.0)
		for j in range(3):  # a few soft grass footfalls of the rank behind, slightly loose
			g = grass[(i + j) % 5]
			put(buf, pan_mono(lp(g.mean(1), 3500, 2), r.uniform(-0.7, 0.7)), t + r.uniform(-0.03, 0.06), -9.0 - 2 * j)
	x = S.wrap(buf, d)  # fold the tails past the loop end back onto the head → seamless
	x = lp(hp(x, 60, 2), 9000, 2)
	return x, 0.05


@snd('cannon_roll', 'heavy wooden-wheeled cannon carriage rolling: low wooden rumble, axle squeaks and creaks, rattles',
     ['cannon_roll/fs437078_craigsmith.mp3', 'cannon_roll/WWS_Woodenwagon.ogg'])
def s_cannon_roll():
	d = 1.6
	buf = canvas(d)
	cart = load('cannon_roll/fs437078_craigsmith.mp3', 5.70, d)
	put(buf, cart, 0.0, 0.0)
	wagon = lp(load('cannon_roll/WWS_Woodenwagon.ogg', 2.0, d, speed=0.8), 2500, 2)  # slowed → heavier
	put(buf, wagon, 0.0, -5.0)
	body = lp(buf, 180, 2)
	buf = buf + 0.8 * body  # weight
	return fade(buf, 0.15, 0.35), 0.0


@snd('gunports', 'five heavy wooden gun-port lids thudding open one after another along a hull (each: short hinge creak + '
     'deep wooden thunk), ~1.2 s', ['_packs/kenney_impact', '_packs/kenney_rpg', 'gunports/fs216872_CastIronCarousel.mp3'])
def s_gunports():
	d = 1.6
	buf = canvas(d)
	times = [0.06, 0.31, 0.53, 0.80, 1.03]
	creaks = [load(f'_packs/kenney_rpg/Audio/creak{k}.ogg', 0, 0.3) for k in (1, 2, 3)]
	for i, t in enumerate(times):
		sp = (0.78, 0.84, 0.74, 0.8, 0.86)[i]
		th = load(f'_packs/kenney_impact/Audio/impactWood_heavy_00{i}.ogg', 0, 0.36, speed=sp)
		layer = nrm(th) + 0.55 * nrm(load('gunports/fs216872_CastIronCarousel.mp3', 0.12, 0.36, speed=sp + 0.12))
		dist = i / 4
		layer = nrm(lp(layer, 6000 - 3000 * dist, 2))
		p = -0.5 + 0.25 * i
		put(buf, pan_mono(layer.mean(1), p), t, -1.0 * i)
		c = creaks[i % 3]
		put(buf, pan_mono(hp(c.mean(1), 300, 2), p), max(0.0, t - 0.1), -14 - 1.5 * i)
	return reverb(np.random.default_rng(5), buf, 0.5, 0.12, 5000)[:n_(d)], times[0]


# ================================================================ ships

@snd('ship_creak', 'wooden sailing ship at anchor: hull timbers creaking, rope/rigging strain, water slapping the hull; '
     'seamless 4.0 s loop', ['ship_creak/fs31574_Walter_Odington.mp3', 'ship_creak/fs480838_craigsmith.mp3',
                             'ship_creak/fs145721_Rmutt.mp3'], loop=True)
def s_ship_creak():
	d, xf = 4.0, 0.6
	L = d + xf
	buf = canvas(L)
	put(buf, load('ship_creak/fs31574_Walter_Odington.mp3', 60.3, L), 0.0, 0.0)
	put(buf, lp(load('ship_creak/fs480838_craigsmith.mp3', 4.6, L), 4000, 2), 0.0, -7.0)
	put(buf, hp(load('ship_creak/fs145721_Rmutt.mp3', 35.0, L), 250, 2), 0.0, -15.0)
	buf = hp(buf, 30, 2)
	return loopify(buf, d, xf), 0.0


@snd('sails_flap', 'canvas sail / big flag flapping and luffing in the wind: heavy cloth «whump» snaps every ~0.4 s over a '
     'softer flutter and wind bed, ~2 s', ['sails_flap/fs57280__earthbound_.mp3', 'sails_flap/fs330638_leonelmail.mp3',
                                         'sails_flap/fs554439_maryhelena.clark.mp3'])
def s_sails_flap():
	d = 2.1
	buf = canvas(d)
	big = load('sails_flap/fs57280__earthbound_.mp3', 5.0, d, speed=0.65)  # shirt snaps slowed → big canvas
	put(buf, nrm(big), 0.0, 0.0)
	put(buf, nrm(load('sails_flap/fs330638_leonelmail.mp3', 10.0, d, speed=0.84)), 0.0, -9.0)  # thick cloth flutter
	put(buf, nrm(load('sails_flap/fs554439_maryhelena.clark.mp3', 68.0, d)), 0.0, -15.0)  # real sail + wind bed
	return fade(buf, 0.03, 0.35), onset(big, 0.4)


# ================================================================ party

@snd('fireworks', 'fireworks: mortar launch thumps, a shell burst with crackle at ~0.5 s, a bigger burst at ~1.6 s, '
     'crackling tail (real display recorded at <50 m)', ['fireworks/fs14742_Mr_Sensible.mp3'])
def s_fireworks():
	x = load('fireworks/fs14742_Mr_Sensible.mp3', 1.0, 2.7)
	x = fade(x, 0.01, 0.5)
	return x, peak_t(x, 0.02)


@snd('mug_clink', 'ceramic tankards clinking (two mugs, a third right after) + three men saying «Cheers!», ~1.3 s',
     ['mug_clink/fs835819_BogumilaMerc.mp3', 'mug_clink/fs547489_sidequesting.mp3', 'mug_clink/fs433721_dazza007.mp3'])
def s_mug_clink():
	d = 1.35
	buf = canvas(d)
	c1 = fade(load('mug_clink/fs835819_BogumilaMerc.mp3', 0.47, 0.5), 0.002, 0.2)
	put(buf, pan_mono(c1.mean(1), -0.2), 0.02, 0.0)
	c2 = fade(load('mug_clink/fs547489_sidequesting.mp3', 1.38, 0.4), 0.002, 0.2)
	put(buf, pan_mono(c2.mean(1), 0.3), 0.11, -4.0)
	ch = fade(load('mug_clink/fs433721_dazza007.mp3', 0.02, 1.08), 0.01, 0.15)
	put(buf, ch, 0.24, -2.0)
	return buf, onset(c1, 0.4) + 0.02


@snd('party_laugh', 'a small group of men laughing, whooping and cheering at a party, ~2.2 s',
     ['party_laugh/fs675043_craigsmith.mp3', 'party_laugh/fs480754_craigsmith.mp3'])
def s_party_laugh():
	d = 2.2
	buf = canvas(d)
	put(buf, load('party_laugh/fs675043_craigsmith.mp3', 0.2, d), 0.0, 0.0)
	put(buf, load('party_laugh/fs480754_craigsmith.mp3', 6.1, d), 0.0, 1.0)
	return fade(buf, 0.06, 0.4), 0.0


# ================================================================ time / ambience

@snd('seasons_whoosh', 'soft magical time-lapse swirl: airy wind whoosh swelling to ~0.8 s and circling L↔R, glassy chime '
     'shimmer on top, gentle tail', ['seasons_whoosh/fs403003_martian.mp3', 'seasons_whoosh/fs867567_bassimat.mp3'])
def s_seasons_whoosh():
	d = 1.6
	t = tt(d)
	sw = np.exp(-((t - 0.8) / 0.38) ** 2)  # swell envelope
	wind = load('seasons_whoosh/fs403003_martian.mp3', 4.0, d, speed=2.2)
	wind = hp(wind, 150, 2) * sw[:, None]
	wind = autopan(wind, 0.9, 0.7)
	chimes = load('seasons_whoosh/fs867567_bassimat.mp3', 2.0, d, speed=1.25)
	chimes = hp(chimes, 2500, 2) * (np.clip((t - 0.15) / 0.6, 0, 1) * np.exp(-np.maximum(t - 0.9, 0) / 0.35))[:, None]
	buf = wind + db(-4) * width(chimes, 1.3)
	buf = reverb(np.random.default_rng(9), buf, 1.2, 0.2, 9000)[:n_(d)]
	return fade(buf, 0.03, 0.3), 0.8


@snd('wind_meadow', 'gentle summer-meadow ambience: soft breeze through the grass, small birds chirping in the distance; '
     'seamless 5.0 s loop', ['wind_meadow/park_ambience_wind.wav', 'wind_meadow/park_ambience_birds.wav',
                             'wind_meadow/fs639459_Garuda1982.mp3'], loop=True)
def s_wind_meadow():
	d, xf = 5.0, 1.0
	L = d + xf
	buf = canvas(L)
	put(buf, nrm(load('wind_meadow/park_ambience_wind.wav', 5.0, L)), 0.0, 0.0)  # soft wind, faint birds
	birds = lp(load('wind_meadow/park_ambience_birds.wav', 100.0, L), 8000, 2)
	birds = reverb(np.random.default_rng(4), birds, 0.9, 0.25, 6000)[:n_(L)]  # push them back
	put(buf, nrm(birds), 0.0, -6.0)
	put(buf, nrm(lp(load('wind_meadow/fs639459_Garuda1982.mp3', 30.0, L), 1800, 2)), 0.0, -9.0)  # grass rustle
	buf = hp(buf, 140, 4)  # no mic-wind rumble: a light breeze, not a gale
	return loopify(buf, d, xf), 0.0


# ================================================================ build / index / credits / checks

def meta_for(rel):
	if rel.startswith('_packs/'):
		key = '/'.join(rel.split('/')[:2])
		t, a, l, u = KENNEY[key]
		return [{'title': t, 'artist': a, 'licence': l, 'url': u}]
	d, f = rel.split('/', 1)
	mp = os.path.join(SRC, d, 'meta.json')
	meta = json.load(open(mp))
	hit = [m for m in meta if m['file'] == f.split('/')[-1] or f.startswith(m['file'].rsplit('.', 1)[0])]
	if not hit:
		raise SystemExit(f'no meta for {rel}')
	return hit[:1]


def source_str(sources):
	urls = []
	for rel in sources:
		for m in meta_for(rel):
			if m['url'] not in urls:
				urls.append(m['url'])
	return ' + '.join(urls)


def check_png(name):
	os.makedirs(CHECKS, exist_ok=True)
	png = os.path.join(CHECKS, name + '.png')
	subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(OUT, name + '.wav'), '-lavfi',
	                'showspectrumpic=s=1000x320:mode=combined:color=intensity:scale=log:fscale=log:legend=1', png], check=True)
	return png


def build(names):
	idx_path = os.path.join(OUT, 'index.json')
	index = json.load(open(idx_path))
	pos = {e['name']: i for i, e in enumerate(index)}
	print(f"{'name':16} {'dur':>5} {'hit':>5} {'peak':>6} {'TP':>6} {'rms':>6} {'M':>6} {'crest':>5} {'centr':>6} {'seam':>7}")
	for name in names:
		spec = LIB[name]
		x, hit = spec['fn']()
		x = finish(x, loop=spec['loop'])
		S.write_wav(os.path.join(OUT, name + '.wav'), x)
		dur = len(x) / SR
		e = {'name': name, 'file': f'sfx/{name}.wav', 'duration': round(dur, 3), 'transient_at': round(min(hit, dur), 3),
		     'source': source_str(spec['sources']), 'description': spec['desc'], 'loop': bool(spec['loop'])}
		if name in pos:
			index[pos[name]] = e
		else:
			pos[name] = len(index)
			index.append(e)
		s = S.stats_of(S.read_wav(os.path.join(OUT, name + '.wav')), spec['loop'])
		seam = f"{s['seam']:.4f}" if s['seam'] is not None else '   -'
		print(f"{name:16} {s['dur']:5.2f} {e['transient_at']:5.2f} {s['peak']:6.2f} {s['tp']:6.2f} {s['rms']:6.1f} {s['M']:6.1f} "
		      f"{s['crest']:5.1f} {s['centroid']:6.0f} {seam:>7}", flush=True)
		check_png(name)
	with open(idx_path, 'w', encoding='utf-8') as f:
		json.dump(index, f, ensure_ascii=False, indent=1)


def credits():
	"""Markdown for CREDITS.md: every source used (with the sounds it feeds) + every other file downloaded for evaluation."""
	used = {}
	for name, spec in LIB.items():
		for rel in spec['sources']:
			for m in meta_for(rel):
				u = used.setdefault(m['url'], dict(m, uses=[]))
				if name not in u['uses']:
					u['uses'].append(name)
	print('## Sound effects\n')
	print('public/sfx: pig_grunt … wind_meadow (22 files) are edits/layers made with tools/sfx_pig.py from these free-licensed '
	      'recordings (originals + meta.json in assets/sfx_src/). freesound.org files were taken as the public HQ preview '
	      '(no account), CC0 only.\n')
	for u, m in used.items():
		title = m['title'].replace('File:', '')
		print(f"- «{title}» — {m.get('artist') or '?'} — {m['licence']} — {u} (used in: {', '.join(m['uses'])})")
	extra = []
	for d in sorted(os.listdir(SRC)):
		mp = os.path.join(SRC, d, 'meta.json')
		if not os.path.isfile(mp):
			continue
		for m in json.load(open(mp)):
			if m['url'] not in used and m['url'] not in [e['url'] for e in extra]:
				extra.append(m)
	extra.append({'title': 'Casino Audio', 'artist': 'Kenney (www.kenney.nl)', 'licence': 'CC0 1.0', 'url': 'https://kenney.nl/assets/casino-audio'})
	print('\nAlso downloaded for evaluation, NOT used in any rendered file:\n')
	for m in extra:
		title = m['title'].replace('File:', '')
		print(f"- «{title}» — {m.get('artist') or '?'} — {m['licence']} — {m['url']}")


def main(argv):
	if '--credits' in argv:
		credits()
		return
	names = [a for a in argv if not a.startswith('-')] or list(LIB)
	bad = [n for n in names if n not in LIB]
	if bad:
		raise SystemExit(f'unknown: {bad}')
	build(names)


if __name__ == '__main__':
	main(sys.argv[1:])
