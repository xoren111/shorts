"""SFX library for «Humans vs Volcano» — procedural (numpy/scipy, licence-free) + optional ElevenLabs renders.

  python3 tools/sfx.py               # build every sound → public/sfx/<name>.wav, index.json, _spectra.png, stats
  python3 tools/sfx.py NAME [NAME…]  # rebuild only these (index / spectra are refreshed from the files on disk)
  python3 tools/sfx.py --stats       # stats + spectra only

Every file: 48 kHz, 16-bit PCM, stereo, sample peak −3 dBFS, DC-free (20 Hz high-pass + mean removal),
raised-cosine fade-in (0.6 ms, i.e. transient intact) and fade-out. Loops (loop: true in index.json) are seamless:
the overhang is cross-faded into the head, so the last sample continues into the first (2 ms edge fades only).

`transient_at` (index.json) = seconds from file start to the perceptual hit (impact, peak of a whoosh, the cut at the
end of a riser/whistle). Align that point with the visual event.

ElevenLabs renders (tools/sfx_eleven.py → data/sfx_el/*.mp3) are converted to <name>_el.wav next to the procedural
versions (crowd_cheer_short exists only as ElevenLabs render — a procedural crowd is not convincing).

Built on ~/shorts/autokrise-2026-v2/tools/sfx.py (DSP core, _air, stamp, tick, key, riser, glitch) and
~/shorts/oel-1941/tools/sfx.py (bubbles, trombone, record scratch, horn, plane, counter) — both left untouched.
"""
import json
import math
import os
import subprocess
import sys
import wave
import zlib

import numpy as np
from scipy import signal
from scipy.interpolate import PchipInterpolator

SR = 48000
LN1000 = 6.907755  # exp(-LN1000 * t / t60) falls 60 dB in t60 seconds
PEAK_DB = -3.0
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'sfx')
EL_CACHE = os.path.join(ROOT, 'data', 'sfx_el')

# ================================================================ DSP core


def n_(d):
	return max(1, int(round(d * SR)))


def tt(d):
	return np.arange(n_(d)) / SR


_SOS = {}


def _sos(kind, f, order):
	key = (kind, tuple(np.atleast_1d(f).tolist()), order)
	if key not in _SOS:
		wn = np.clip(np.asarray(f, float) / (SR / 2), 1e-5, 0.995)
		_SOS[key] = signal.butter(order, wn, btype=kind, output='sos')
	return _SOS[key]


def lp(x, f, order=2):
	return signal.sosfilt(_sos('lowpass', f, order), x, axis=0)


def hp(x, f, order=2):
	return signal.sosfilt(_sos('highpass', f, order), x, axis=0)


def bp(x, lo, hi, order=2):
	return signal.sosfilt(_sos('bandpass', [lo, hi], order), x, axis=0)


def reson(x, f, q):
	"""Constant resonant peak (formant) filter."""
	b, a = signal.iirpeak(min(f, SR * 0.45), q, SR)
	return signal.lfilter(b, a, x, axis=0)


def tvf(x, fc, q=1.0, mode='bp', block=64):
	"""Time-varying RBJ biquad (bp = 0 dB peak band-pass, lp, hp); fc (Hz) scalar or per-sample array."""
	x = np.asarray(x, float)
	n = len(x)
	fc = np.full(n, float(fc)) if np.ndim(fc) == 0 else np.asarray(fc, float)
	qa = np.full(n, float(q)) if np.ndim(q) == 0 else np.asarray(q, float)
	y = np.empty(n)
	zi = np.zeros(2)
	for i in range(0, n, block):
		j = min(i + block // 2, n - 1)
		f = min(max(fc[j], 20.0), SR * 0.45)
		w = 2 * np.pi * f / SR
		c, al = np.cos(w), np.sin(w) / (2 * max(qa[j], 0.05))
		if mode == 'bp':
			b = (al, 0.0, -al)
		elif mode == 'lp':
			b = ((1 - c) / 2, 1 - c, (1 - c) / 2)
		else:
			b = ((1 + c) / 2, -(1 + c), (1 + c) / 2)
		a0 = 1 + al
		bb = np.array(b) / a0
		aa = np.array([1.0, -2 * c / a0, (1 - al) / a0])
		y[i:i + block], zi = signal.lfilter(bb, aa, x[i:i + block], zi=zi)
	return y


def dec(d, t60):
	return np.exp(-LN1000 * tt(d) / t60)


def att(d, a):
	"""Smooth exponential onset (time constant a) — starts at exactly 0."""
	return 1 - np.exp(-tt(d) / max(a, 1e-5))


def bump(d, peak=0.5, a=2.0, b=1.5):
	"""Smooth 0 → 1 → 0 with its maximum at `peak` (fraction of d); a/b shape the rise/fall."""
	u = tt(d) / d
	up = np.clip(u / peak, 0, 1)
	dn = np.clip((1 - u) / (1 - peak), 0, 1)
	return np.where(u < peak, np.sin(np.pi / 2 * up) ** a, np.sin(np.pi / 2 * dn) ** b)


def smoothstep(t, a, b):
	u = np.clip((t - a) / max(b - a, 1e-9), 0, 1)
	return u * u * (3 - 2 * u)


def phase(f):
	return 2 * np.pi * np.cumsum(np.asarray(f, float)) / SR


def norm(x, peak=1.0):
	m = np.abs(x).max()
	return x * (peak / m) if m > 0 else x


def noise(r, d):
	return r.standard_normal(n_(d))


def st(x):
	return x if x.ndim == 2 else np.stack([x, x], 1)


def place(buf, x, t0, g=1.0):
	"""Add x into buf at t0 seconds (mono into stereo is broadcast; negative t0 crops)."""
	i = int(round(t0 * SR))
	if i < 0:
		x = x[-i:]
		i = 0
	if buf.ndim == 2 and x.ndim == 1:
		x = x[:, None]
	e = min(len(buf), i + len(x))
	if e > i:
		buf[i:e] += x[:e - i] * g
	return buf


def modes(d, table, onset=0.0003):
	"""Modal resonator bank: table = [(freq Hz, amp, t60 s)], struck at t = 0."""
	t = tt(d)
	out = np.zeros_like(t)
	for f, a, t60 in table:
		if 20 < f < SR * 0.45:
			out += a * np.sin(2 * np.pi * f * t) * np.exp(-LN1000 * t / t60)
	return out * (1 - np.exp(-t / onset)) if onset else out


def burst(r, d, lo, hi, t60, order=2):
	return bp(r.standard_normal(n_(d)), lo, hi, order) * dec(d, t60)


def rlfo(r, d, fc):
	"""Smooth random modulation 0..1 with ~fc Hz bandwidth (monotone cubic through random control points)."""
	step = 1.0 / max(fc * 2.0, 1e-3)
	k = int(math.ceil(d / step)) + 4
	tc = (np.arange(k) - 1) * step
	y = PchipInterpolator(tc, r.standard_normal(k))(tt(d))
	return (y - y.min()) / (y.max() - y.min() + 1e-12)


def grains(r, d, rate, bands=((1500, 3200), (2800, 6000), (5000, 10000)), weights=(0.8, 1.0, 0.5), glen=0.004,
           t60=0.0018, apow=3.0, nk=4):
	"""Crackle texture: Poisson impulses (rate scalar or per-sample, /s) through short band-limited noise grains."""
	n = n_(d)
	rate = np.full(n, float(rate)) if np.ndim(rate) == 0 else np.asarray(rate, float)[:n]
	if len(rate) < n:
		rate = np.pad(rate, (0, n - len(rate)))
	imp = (r.random(n) < rate / SR) * r.random(n) ** apow
	out = np.zeros(n)
	ks = []
	for (lo, hi), w in zip(bands, weights):
		for _ in range(nk):
			ks.append((bp(r.standard_normal(n_(glen)), lo, hi) * dec(glen, t60 * r.uniform(0.7, 1.4)), w))
	which = r.integers(0, len(ks), n)
	for k, (kern, w) in enumerate(ks):
		sel = imp * (which == k)
		if sel.any():
			out += w * signal.fftconvolve(sel, kern)[:n]
	return out


def grains2(r, d, rate, **kw):
	"""Two independent crackle streams → wide stereo."""
	return np.stack([grains(r, d, rate, **kw), grains(r, d, rate, **kw)], 1)


def poisson(r, d, rate):
	n = n_(d)
	rate = np.full(n, float(rate)) if np.ndim(rate) == 0 else np.asarray(rate, float)[:n]
	return np.nonzero(r.random(len(rate)) < rate / SR)[0] / SR


def pan_mono(x, p):
	a = (np.clip(p, -1, 1) + 1) * np.pi / 4
	return np.stack([x * np.cos(a), x * np.sin(a)], 1) * math.sqrt(2)


def pan_move(x, p0, p1, curve=None):
	u = np.linspace(0, 1, len(x)) if curve is None else curve
	return pan_mono(x, p0 + (p1 - p0) * u)


def dual(r, d, make, width=0.6):
	"""Stereo texture from a mono generator make(r, d): shared mid + independent sides."""
	c, a, b = make(r, d), make(r, d), make(r, d)
	w = width
	return np.stack([(1 - w) * c + w * a, (1 - w) * c + w * b], 1)


def nband(lo, hi, order=2):
	"""Generator for dual(): normalised band-limited noise."""
	def mk(r, d):
		return norm(bp(r.standard_normal(n_(d)), lo, hi, order))
	return mk


def saturate(x, drive=1.5):
	return np.tanh(drive * x) / np.tanh(drive)


def reverb_ir(r, rt=1.0, bright=6000.0, pre=0.01, er=0.35):
	"""Stereo IR: early reflections + diffuse tail with 3-band decay (lows ring longer, highs die faster)."""
	d = min(rt * 1.3 + 0.05, 6.0)
	t = tt(d)
	ir = np.zeros((len(t), 2))
	for ch in range(2):
		nz = r.standard_normal(len(t))
		a = lp(nz, 400, 2) * np.exp(-LN1000 * t / (rt * 1.15))
		b = bp(nz, 400, 2500, 1) * np.exp(-LN1000 * t / rt)
		c = hp(nz, 2500, 2) * np.exp(-LN1000 * t / (rt * 0.45))
		tail = lp(a + b + c, bright, 2) * (1 - np.exp(-t / 0.01))
		ir[:, ch] = tail / (np.sqrt((tail ** 2).sum()) + 1e-12)
		for _ in range(8):
			k = int(r.uniform(0.003, 0.04) * SR)
			ir[k, ch] += er * r.uniform(0.2, 0.6) * r.choice([-1, 1]) * math.exp(-k / SR / 0.025)
	ir /= np.sqrt((ir ** 2).sum(0).mean()) + 1e-12
	return np.concatenate([np.zeros((n_(pre), 2)), ir])


def reverb(r, x, rt=0.4, wet=0.15, bright=6000.0, pre=0.006):
	"""Dry + convolution reverb (stereo out, longer than x by the tail)."""
	x = st(np.asarray(x, float))
	ir = reverb_ir(r, rt, bright, pre)
	y = np.zeros((len(x) + len(ir) - 1, 2))
	y[:len(x)] += x
	for ch in range(2):
		y[:, ch] += wet * signal.fftconvolve(x[:, ch], ir[:, ch])
	return y


def echoes(x, taps):
	"""Discrete outdoor echoes: taps = [(delay s, gain, low-pass Hz, pan)]."""
	x = st(np.asarray(x, float))
	m = x.mean(1)
	out = np.zeros((len(x) + n_(max(tp[0] for tp in taps)) + 1, 2))
	out[:len(x)] += x
	for dl, g, fc, p in taps:
		place(out, pan_mono(lp(m, fc, 2) * g, p), dl)
	return out


def loopify(x, d, xf):
	"""x has ≥ d + xf seconds: cross-fade the overhang into the head → seamless loop of exactly d seconds."""
	x = st(np.asarray(x, float))
	n, k = n_(d), n_(xf)
	out = x[:n].copy()
	u = np.linspace(0, 1, k)[:, None]
	out[:k] = x[:k] * np.sin(np.pi / 2 * u) + x[n:n + k] * np.cos(np.pi / 2 * u)
	return out


def wrap(x, d):
	"""Circular fold: everything after d seconds is added back onto the start (reverb tails of looping ticks)."""
	x = st(np.asarray(x, float))
	n = n_(d)
	out = x[:n].copy()
	k = n
	while k < len(x):
		seg = x[k:k + n]
		out[:len(seg)] += seg
		k += n
	return out


def osc(f, harmonics, fc=None, order=4):
	"""Additive oscillator on a frequency track f; per-harmonic low-pass fc (scalar/array) = filter sweep for free."""
	f = np.asarray(f, float)
	ph = phase(f)
	out = np.zeros_like(ph)
	for k, a in harmonics:
		g = a if fc is None else a / (1 + (k * f / np.maximum(fc, 1)) ** order)
		if np.ndim(g) == 0 and g == 0:
			continue
		out += g * np.sin(k * ph) * (k * f < SR * 0.45)
	return out


def resample_var(x, rate, start=0.0):
	"""Play x back at a time-varying speed (rate array, samples per output sample; negative = backwards)."""
	pos = start + np.cumsum(np.asarray(rate, float)) - rate[0]
	return np.interp(pos, np.arange(len(x)), x, left=0.0, right=0.0)


def rock(r, lo=500, hi=3000, t60=(0.006, 0.025), d=0.06, noise_amt=0.6):
	"""Small stone / crust click: inharmonic modal ring + filtered noise tick."""
	f = r.uniform(lo, hi)
	ratios = [1.0, r.uniform(1.4, 1.62), r.uniform(2.0, 2.35), r.uniform(2.7, 3.2), r.uniform(3.5, 4.3)]
	tab = [(f * q, r.uniform(0.3, 1.0) / (1 + 0.5 * i), r.uniform(*t60) / (1 + 0.3 * i)) for i, q in enumerate(ratios)]
	x = norm(modes(d, tab))
	x += noise_amt * norm(bp(r.standard_normal(n_(d)), lo * 0.8, min(hi * 3, 16000)) * dec(d, 0.004))
	return x * att(d, 0.0002)


# ================================================================ registry

LIB = {}


def sfx(name, dur, hit=0.0, desc='', loop=False, fade_out=None, fade_in=0.0006, extra=False):
	def deco(fn):
		LIB[name] = dict(fn=fn, dur=dur, hit=hit, desc=desc, loop=loop, fade_out=fade_out, fade_in=fade_in, extra=extra)
		return fn
	return deco


# ================================================================ volcano / lava


@sfx('volcano_rumble', 8.0, 0.0, 'deep sub rumble with slow swells, a pitched groan and three distant deep thumps; '
     'phone-audible harmonics 70–280 Hz; seamless loop', loop=True)
def s_volcano_rumble(r, d):
	xf = 1.2
	D = d + xf
	sw = 0.35 + 0.65 * rlfo(r, D, 0.22) ** 1.3
	sw2 = 0.45 + 0.55 * rlfo(r, D, 0.5)
	sub = norm(lp(hp(noise(r, D), 18, 2), 52, 4)) * sw
	groan = norm(tvf(noise(r, D), 33 + 12 * rlfo(r, D, 0.15), 5.0)) * (0.25 + 0.75 * rlfo(r, D, 0.3) ** 2)
	body = dual(r, D, nband(45, 170), 0.5) * (sw * sw2)[:, None]
	growl = dual(r, D, nband(120, 480), 0.7) * (0.12 + 0.88 * rlfo(r, D, 0.35) ** 2.5)[:, None]
	low = norm(sub + 0.7 * groan)
	phone = norm(bp(saturate(1.8 * low, 2.5), 70, 280))
	x = st(low) + 0.7 * body + 0.22 * growl + 0.6 * st(phone)
	for t0 in sorted(r.uniform(0.6, D - 1.4, 3)):
		m = 1.3
		tm = tt(m)
		th = np.sin(phase(29 + 30 * np.exp(-tm / 0.15))) * dec(m, 1.0) * att(m, 0.012)
		th = norm(th) + 0.6 * norm(lp(noise(r, m), 150, 2) * dec(m, 0.7) * att(m, 0.02))
		th = th + 0.35 * norm(bp(saturate(th, 2.0), 70, 260))
		place(x, pan_mono(norm(th), r.uniform(-0.3, 0.3)), t0, 0.45)
	x = hp(x, 18, 2)
	return loopify(x, d, xf)


def _bubble(r, f0=120.0, size=1.0):
	"""Viscous bubble: resonance gliding up as it nears the surface, a formant 'blub', then the burst."""
	d = 0.35 * size + 0.1
	t = tt(d)
	f = f0 * (1 + 1.3 * (1 - np.exp(-t / (0.06 * size))))
	body = np.sin(phase(f)) * dec(d, 0.16 * size) * att(d, 0.004)
	blub = tvf(r.standard_normal(len(t)), f * 2.5, 4.0) * dec(d, 0.1 * size)
	pop = np.zeros(len(t))
	place(pop, bp(r.standard_normal(n_(0.05)), 400, 3500) * dec(0.05, 0.012) * att(0.05, 0.0005), 0.05 * size)
	return norm(body) + 0.4 * norm(blub) + 0.35 * norm(pop)


@sfx('lava_crackle', 6.0, 0.0, 'bubbling, glugging molten rock with crackling, ticking crust over a low molten roar; '
     'seamless loop', loop=True)
def s_lava_crackle(r, d):
	xf = 0.8
	D = d + xf
	n = n_(D)
	bed = dual(r, D, nband(45, 350), 0.5) * (0.6 + 0.4 * rlfo(r, D, 1.2))[:, None]
	gur = np.stack([norm(tvf(noise(r, D), 160 + 380 * rlfo(r, D, 3.0), 3.0)) * rlfo(r, D, 7) ** 2 for _ in range(2)], 1)
	bub = np.zeros((n, 2))
	k = r.uniform(0, 0.15)
	while k < D:
		place(bub, pan_mono(_bubble(r, r.uniform(70, 230), r.uniform(0.5, 1.3)), r.uniform(-0.7, 0.7)), k, r.uniform(0.3, 1.0))
		k += r.exponential(0.2) + 0.04
	crk = grains2(r, D, 25 + 280 * rlfo(r, D, 2.5) ** 3, bands=((1200, 3500), (2500, 7000), (5000, 12000)),
	              weights=(1.0, 0.8, 0.4), apow=2.5)
	ticks = np.zeros((n, 2))
	for t0 in poisson(r, D, 7.0):
		place(ticks, pan_mono(rock(r, 700, 2600, (0.004, 0.015), 0.05), r.uniform(-0.8, 0.8)), t0, r.uniform(0.2, 1.0) ** 1.5)
	hiss = dual(r, D, lambda r_, d_: norm(hp(r_.standard_normal(n_(d_)), 4000)), 0.9) * (0.4 + 0.6 * rlfo(r, D, 1.5))[:, None]
	x = 0.55 * bed + 0.4 * gur + 0.85 * norm(bub) + 0.35 * norm(crk) + 0.3 * norm(ticks) + 0.035 * hiss
	x = reverb(r, x, 0.5, 0.12, 6000)[:n]
	x = hp(x, 25, 2)
	return loopify(x, d, xf)


def _glug(r, f0, size):
	"""Thick lava 'glug': low saturated bubble whose pitch rises, a formant sweep and the burst."""
	d = 0.55 * size
	t = tt(d)
	f = f0 * (1 + 1.6 * (1 - np.exp(-t / (0.07 * size))))
	body = saturate(norm(np.sin(phase(f)) * dec(d, 0.24 * size) * att(d, 0.002)), 2.0)
	sub = np.sin(phase(f * 0.5)) * dec(d, 0.14 * size) * att(d, 0.003)
	form = tvf(r.standard_normal(len(t)), 240 + 760 * (1 - np.exp(-t / 0.05)), 3.0) * dec(d, 0.13 * size) * att(d, 0.002)
	pop = np.zeros(len(t))
	place(pop, lp(hp(r.standard_normal(n_(0.06)), 300), 2800) * dec(0.06, 0.03) * att(0.06, 0.0005), 0.04 * size)
	return norm(body) + 0.45 * norm(sub) + 0.5 * norm(form) + 0.5 * norm(pop)


@sfx('lava_glug', 1.5, 0.02, 'thick viscous lava bubble pop (at 0) + two smaller glugs (0.42, 0.78 s) and molten splats')
def s_lava_glug(r, d):
	n = n_(d)
	x = np.zeros((n, 2))
	place(x, st(_glug(r, 60, 1.6)), 0.0, 1.0)
	place(x, pan_mono(_glug(r, 95, 1.0), -0.3), 0.42, 0.55)
	place(x, pan_mono(_glug(r, 135, 0.7), 0.35), 0.78, 0.35)
	for t0 in sorted(r.uniform(0.08, 0.6, 6)):
		m = 0.08
		s = lp(hp(noise(r, m), 250), 2200) * dec(m, 0.03) * att(m, 0.0008)
		place(x, pan_mono(norm(s), r.uniform(-0.7, 0.7)), t0, r.uniform(0.08, 0.25))
	bed = dual(r, d, nband(60, 300), 0.5) * (0.4 * dec(d, 1.2))[:, None]
	x += 0.2 * bed
	return reverb(r, x, 0.6, 0.15, 5000)


# ================================================================ bombs / explosions


@sfx('bomb_whistle', 1.2, 1.2, 'falling bomb whistle 1.75 kHz → 360 Hz with crescendo and air rush; hard stop at 1.2 s '
     '(= where the explosion hits)', fade_out=0.004, fade_in=0.02)
def s_bomb_whistle(r, d):
	t = tt(d)
	u = t / d
	f = 1750 * (360 / 1750) ** (u ** 1.35) * (1 + 0.005 * np.sin(2 * np.pi * 5.2 * t) + 0.003 * (2 * rlfo(r, d, 8) - 1))
	ph = phase(f)
	tone = np.sin(ph) + 0.10 * np.sin(2 * ph + 0.5) + 0.04 * np.sin(3 * ph)
	breath = tvf(noise(r, d), f, 10.0)
	rush = norm(bp(noise(r, d), 400, 3500)) * u ** 3
	amp = att(d, 0.12) * (0.12 + 0.88 * u ** 1.8)
	x = (norm(tone) + 0.35 * norm(breath)) * amp + 0.22 * rush
	y = pan_move(x, 0.15, -0.05)
	return reverb(r, y, 0.7, 0.12, 6000)[:n_(d)]


def _debris(r, d, start, peak_t, decay_t, rate_max, heavy=1.0):
	"""Debris rain: stones (heavier first) + gravel + fine sand hiss, all scattered across the stereo field."""
	n = n_(d)
	t = tt(d)
	env = np.where(t < start, 0, np.clip((t - start) / max(peak_t - start, 1e-3), 0, 1) ** 1.5) * np.exp(-np.maximum(t - peak_t, 0) / decay_t)
	out = np.zeros((n + n_(0.2), 2))
	for t0 in poisson(r, d, rate_max * env):
		e = env[min(int(t0 * SR), n - 1)]
		if r.random() < 0.12 * heavy * math.exp(-(t0 - start) / 0.8):
			k, g = rock(r, 140, 600, (0.02, 0.06), 0.15, 0.8), 1.0
		else:
			k, g = rock(r, 600, 3500, (0.004, 0.018), 0.05, 0.9), 0.5
		place(out, pan_mono(k, r.uniform(-0.9, 0.9)), t0, g * e ** 0.5 * r.uniform(0.2, 1.0) ** 1.5)
	sand = dual(r, d, nband(1800, 9000), 0.8) * (env * (0.6 + 0.4 * rlfo(r, d, 20)))[:, None]
	return norm(out[:n]) + 0.25 * sand


def _blast(r, d, size=1.0, crack=1.0, debris=1.0, drive=2.4):
	"""Explosion core: shock + crack + pitched thump + boom + blast roar + fireball, saturated; wide roar; debris."""
	n = n_(d)
	t = tt(d)
	shock = hp(r.standard_normal(n), 400, 2) * dec(d, 0.012) * att(d, 0.0001)
	crk = bp(r.standard_normal(n), 1200, 12000) * dec(d, 0.06) * att(d, 0.0002) * (0.6 + 0.4 * rlfo(r, d, 200))
	f = 30 + 110 * np.exp(-t / 0.05) + 25 * np.exp(-t / 0.5)
	thump = np.sin(phase(f)) * dec(d, 0.9 * size) * att(d, 0.0008)
	boom = norm(lp(r.standard_normal(n), 160, 3)) * dec(d, 2.2 * size) * att(d, 0.006) * (0.65 + 0.35 * rlfo(r, d, 3))
	roar = norm(bp(r.standard_normal(n), 180, 2200)) * dec(d, 0.7 * size) * att(d, 0.001) * (0.55 + 0.45 * rlfo(r, d, 30))
	fire = norm(bp(r.standard_normal(n), 70, 600)) * bump(d, 0.1, 1.2, 1.0) ** 1.5 * (0.5 + 0.5 * rlfo(r, d, 4))
	mix = norm(thump) + 0.75 * boom + 0.55 * roar + 0.35 * fire + 0.45 * crack * norm(crk) + 0.4 * crack * norm(shock)
	core = saturate(norm(mix), drive)
	x = st(core)
	x += 0.25 * dual(r, d, nband(300, 3000), 1.0) * (dec(d, 0.5 * size) * att(d, 0.002))[:, None]
	if debris:
		x += debris * 0.35 * _debris(r, d, 0.18, 0.55, 0.7 * size, 260 * size)
	return x


@sfx('explosion_big', 3.0, 0.0, 'huge layered explosion: shock crack + pitched sub thump + boom + blast roar + fireball, '
     'stones and gravel raining down (0.2–2 s), canyon echoes, long dark tail', fade_out=0.3)
def s_explosion_big(r, d):
	x = _blast(r, d, 1.0, 1.0, 1.0)
	x = echoes(x, [(0.33, 0.22, 1500, -0.6), (0.71, 0.14, 1000, 0.5), (1.15, 0.08, 700, -0.2)])
	return reverb(r, x, 2.2, 0.3, 2600, 0.015)


@sfx('explosion_mid', 2.0, 0.0, 'mid-size explosion (bomb hitting lava): crack + boom + short debris rain + echo', fade_out=0.25)
def s_explosion_mid(r, d):
	x = _blast(r, d, 0.6, 0.8, 0.55, 2.0)
	x = echoes(x, [(0.28, 0.18, 1400, 0.5), (0.62, 0.1, 900, -0.5)])
	return reverb(r, x, 1.4, 0.26, 3000, 0.012)


@sfx('explosion_far', 2.0, 0.01, 'distant, muffled explosion: soft low thud, rolling thunder-like rumble, terrain echoes '
     '(no crack)', fade_out=0.3)
def s_explosion_far(r, d):
	n = n_(d)
	t = tt(d)
	thump = np.sin(phase(32 + 55 * np.exp(-t / 0.06))) * dec(d, 1.0) * att(d, 0.006)
	boom = norm(lp(noise(r, d), 220, 3)) * dec(d, 1.6) * att(d, 0.012) * (0.6 + 0.4 * rlfo(r, d, 4))
	roll = norm(lp(noise(r, d), 260, 3)) * bump(d, 0.22, 1.3, 1.0) * (0.3 + 0.7 * rlfo(r, d, 2.5) ** 2)
	x = saturate(norm(norm(thump) + 0.8 * boom + 0.55 * roll), 1.6)
	x = lp(lp(x, 500, 2), 1000, 1)
	y = st(x) + 0.2 * dual(r, d, lambda r_, d_: norm(lp(r_.standard_normal(n_(d_)), 400, 2)), 1.0) * (bump(d, 0.2, 1.2, 1.0))[:, None]
	y = echoes(y, [(0.27, 0.35, 450, -0.5), (0.62, 0.25, 380, 0.5), (1.05, 0.16, 300, -0.2)])
	return reverb(r, y, 2.4, 0.45, 1200, 0.02)[:n + n_(0.5)]


# ================================================================ biplanes


def _radial(r, d, fire_hz=135.0, cyl=9, wires=1.0):
	"""1930s 9-cylinder radial: firing pulses (per-cylinder unevenness → rough sub-harmonics) through an exhaust-pop
	kernel, 2-blade propeller beat (blade-pass = 2 × crank), valve clatter and bracing-wire whistle."""
	n = n_(d)
	t = tt(d)
	wob = 1 + 0.008 * (2 * rlfo(r, d, 1.2) - 1) + 0.004 * np.sin(2 * np.pi * 0.7 * t)
	rate = fire_hz * wob
	ph = np.cumsum(rate) / SR
	idx = np.nonzero(np.diff(np.floor(ph), prepend=0.0) > 0)[0]
	camp = r.uniform(0.5, 1.0, cyl)
	imp = np.zeros(n)
	imp[idx] = camp[np.arange(len(idx)) % cyl] * r.uniform(0.75, 1.0, len(idx))
	kd = 0.025
	kern = lp(r.standard_normal(n_(kd)), 3200, 2) * dec(kd, 0.007) + 0.9 * modes(kd, [(190, 1, 0.012), (430, 0.6, 0.008), (950, 0.3, 0.005)])
	exh = norm(signal.fftconvolve(imp, kern)[:n])
	crank = rate / (cyl / 2)
	pph = phase(crank * 2)
	blade = (0.5 + 0.5 * np.cos(pph)) ** 3
	prop = norm(bp(r.standard_normal(n), 150, 3500)) * (0.25 + 0.75 * blade)
	prop_tone = norm(np.sin(pph) + 0.4 * np.sin(2 * pph + 0.3) + 0.2 * np.sin(3 * pph + 1.0))
	valve = norm(hp(r.standard_normal(n), 2500)) * (0.5 + 0.5 * np.cos(phase(rate))) ** 8
	wire = norm(tvf(r.standard_normal(n), 1450 * (1 + 0.02 * rlfo(r, d, 2)), 14.0))
	x = saturate(exh * (0.8 + 0.2 * blade), 1.6) + 0.45 * prop + 0.35 * prop_tone + 0.07 * valve + 0.07 * wires * wire
	return x


def _flyby(r, src_fn, d, t_pass, v=60.0, h=32.0, y=0.0, hl=1.7, c=343.0, ground=0.5, whoosh=0.25):
	"""Place a source on a straight overhead path: propagation delay (true doppler), 1/r spreading, distance low-pass,
	ground reflection (moving comb → flanging) and azimuth pan. t_pass = time the closest approach is heard."""
	pre, post = 1.2, 0.3
	D = d + pre + post
	src = src_fn(r, D)
	ns = len(src)
	h2 = math.hypot(h - hl, y)
	hg = math.hypot(h + hl, y)
	t_pe = t_pass - h2 / c
	te = np.arange(ns) / SR - pre
	xpos = v * (te - t_pe)
	rd = np.sqrt(xpos ** 2 + h2 ** 2)
	rg = np.sqrt(xpos ** 2 + hg ** 2)
	t = tt(d)

	def path(rarr):
		tei = np.interp(t, te + rarr / c, te)
		s = np.interp((tei + pre) * SR, np.arange(ns), src)
		rr = np.interp(t, te + rarr / c, rarr)
		return s * (h2 / rr), rr, tei

	direct, rr, tei = path(rd)
	refl, _, _ = path(rg)
	x = direct + ground * refl
	x = tvf(x, 900 + 17000 * (h2 / rr) ** 1.4, 0.707, 'lp')
	xp = v * (tei - t_pe)
	az = xp / np.sqrt(xp ** 2 + h2 ** 2)
	x = x + whoosh * norm(bp(noise(r, d), 400, 4000)) * np.exp(-((t - t_pass) / 0.35) ** 2) * np.abs(x).max()
	return pan_mono(x, 0.9 * az)


@sfx('biplane_flyby', 3.5, 1.4, '1930s biplane, 9-cyl radial engine + prop beat + wire whistle; physically modelled '
     'overhead pass (doppler drop, ground-reflection flanging, left → right) closest at 1.4 s', fade_in=0.05, fade_out=0.2)
def s_biplane_flyby(r, d):
	x = _flyby(r, lambda r_, d_: _radial(r_, d_, 135.0), d, 1.4, v=68, h=20, y=3)
	return reverb(r, x, 1.4, 0.18, 4000, 0.02)


@sfx('biplanes_formation', 4.0, 1.9, 'formation of three biplanes (firing 128 / 134 / 140 Hz → audible beating), '
     'staggered overhead passes at ≈1.7 / 1.95 / 2.25 s, left → right', fade_in=0.05, fade_out=0.25)
def s_biplanes_formation(r, d):
	out = np.zeros((n_(d), 2))
	for fh, tp, v, h, y, g in [(128.0, 1.70, 64, 30, -14, 1.0), (134.0, 1.95, 66, 25, 0, 1.0), (140.0, 2.25, 63, 34, 18, 0.9)]:
		out += g * _flyby(r, lambda r_, d_, fh=fh: _radial(r_, d_, fh, wires=0.7), d, tp, v=v, h=h, y=y, ground=0.45, whoosh=0.15)
	return reverb(r, out, 1.5, 0.22, 3800, 0.02)


# ================================================================ whooshes


def _air(r, d, peak, f_lo, f_hi, q, rise, fall, doppler=0.35, turb=0.35, body=0.0, air=0.4):
	"""Pass-by engine: band-pass noise whose centre follows the loudness bump (doppler drop after the peak)."""
	t = tt(d)
	u = t / d
	e = bump(d, peak, rise, fall)
	after = np.clip((u - peak) / (1 - peak), 0, 1)
	fc = (f_lo + (f_hi - f_lo) * e ** 0.8) * (1 - doppler * after)
	tb = 1 + turb * (2 * rlfo(r, d, 28) - 1)
	main = tvf(tvf(r.standard_normal(len(t)), fc, q), fc, q * 0.7)
	hiss = tvf(r.standard_normal(len(t)), np.minimum(fc * 2.6, 9000), 1.0) * e ** 2
	out = (norm(main) * e + air * norm(hiss)) * tb
	if body:
		out += body * norm(lp(r.standard_normal(len(t)), 140, 2)) * e ** 1.3
	return out, e


def _pan_curve(e):
	c = np.cumsum(e + 0.03)
	return c / c[-1]


@sfx('whoosh_fast', 0.45, 0.2, 'fast air whoosh with doppler drop, pans left → right; peak at 0.2 s')
def s_whoosh_fast(r, d):
	x, e = _air(r, d, 0.45, 350, 2600, 1.1, 2.2, 1.5, doppler=0.35, turb=0.35, body=0.35, air=0.35)
	return reverb(r, pan_move(x, -0.7, 0.7, _pan_curve(e)), 0.35, 0.08, 8000)


@sfx('whoosh_big', 0.9, 0.45, 'big heavy whoosh: wide band sweep + low body + sub drop + flutter, pans left → right; '
     'peak at 0.45 s (camera moves, globe spins)')
def s_whoosh_big(r, d):
	t = tt(d)
	x, e = _air(r, d, 0.5, 160, 1500, 1.2, 2.4, 1.4, doppler=0.4, turb=0.4, body=0.8, air=0.35)
	flut = 1 + 0.2 * np.sin(2 * np.pi * 31 * t + r.uniform(0, 6)) * e
	x = norm(x * flut)
	sub = np.zeros_like(x)
	m = 0.45
	tm = tt(m)
	place(sub, np.sin(phase(42 + 40 * np.exp(-tm / 0.08))) * dec(m, 0.35) * att(m, 0.02), 0.4)
	x = x + 0.35 * sub
	return reverb(r, pan_move(x, -0.8, 0.8, _pan_curve(e)), 0.7, 0.15, 6000)


@sfx('whoosh_rev', 0.7, 0.7, 'reverse swell (reversed noise sweep + chord + reverb) sucking into a hard cut at 0.7 s',
     fade_in=0.04, fade_out=0.003)
def s_whoosh_rev(r, d):
	D = 1.2
	t = tt(D)
	fwd = tvf(noise(r, D), 6000 * (700 / 6000) ** np.clip(t / 0.6, 0, 1), 0.9) * dec(D, 0.5) * att(D, 0.0008)
	chord = osc(np.full(len(t), 110.0), [(k, 1.0 / k) for k in range(1, 16)], fc=1800)
	chord += 0.6 * osc(np.full(len(t), 164.8), [(k, 1.0 / k) for k in range(1, 12)], fc=1800)
	chord *= dec(D, 0.6) * att(D, 0.001)
	thud = np.sin(phase(50 + 60 * np.exp(-t / 0.03))) * dec(D, 0.3) * att(D, 0.0008)
	fwd = st(norm(fwd) + 0.3 * norm(chord) + 0.35 * norm(thud))
	fwd = reverb(r, fwd, 0.9, 0.8, 7000, 0.0)
	return fwd[:n_(d)][::-1].copy()


@sfx('crash_zoom', 0.6, 0.4, 'crash-zoom: rising swish + zoom whine into a low punchy thump at 0.40 s')
def s_crash_zoom(r, d):
	t = tt(d)
	hit = 0.40
	u = np.clip(t / hit, 0, 1)
	fc = 500 * (5500 / 500) ** (u ** 1.6)
	amp = np.where(t < hit, u ** 2.2, np.exp(-(t - hit) / 0.035))
	sw = dual(r, d, lambda r_, d_: tvf(r_.standard_normal(n_(d_)), fc, 1.2), 0.6)
	sw = norm(sw) * amp[:, None]
	whine = lp(osc(180 * (800 / 180) ** u, [(k, 1.0 / k) for k in range(1, 12)]), 2500) * np.where(t < hit, u ** 3, 0)
	m = d - hit
	tm = tt(m)
	th = np.sin(phase(42 + 120 * np.exp(-tm / 0.03))) * dec(m, 0.28) * att(m, 0.0006)
	th = saturate(norm(th) + 0.5 * norm(lp(noise(r, m), 600, 2) * dec(m, 0.04)) + 0.3 * norm(bp(noise(r, m), 1000, 7000) * dec(m, 0.01)), 1.8)
	x = 0.8 * sw + 0.12 * st(norm(whine))
	place(x, st(th), hit, 1.0)
	return reverb(r, x, 0.4, 0.1, 7000)


@sfx('swish_short', 0.25, 0.1, 'short airy swish with paper friction (panels / text sliding in)')
def s_swish_short(r, d):
	x, e = _air(r, d, 0.4, 1100, 4200, 1.0, 2.0, 1.6, doppler=0.25, turb=0.3, air=0.3)
	fr = grains(r, d, 300 * e + 20, bands=((2500, 5000), (4000, 9000)), weights=(1.0, 0.6), apow=2.5)
	x = norm(x) + 0.2 * norm(fr) * e
	return reverb(r, pan_move(x, -0.35, 0.35), 0.3, 0.07, 8000)


# ================================================================ hits / UI


@sfx('hit_impact', 0.8, 0.0, 'punchy cinematic hit: crack + pitched sub thump + body + faint low ring + room (text slams, reveals)',
     fade_out=0.12)
def s_hit_impact(r, d):
	t = tt(d)
	crack = norm(bp(noise(r, d), 900, 10000) * dec(d, 0.03)) * att(d, 0.0002)
	click = norm(hp(noise(r, d), 3000) * dec(d, 0.004))
	thump = np.sin(phase(44 + 150 * np.exp(-t / 0.028))) * dec(d, 0.36) * att(d, 0.0006)
	body = norm(lp(noise(r, d), 450, 2) * dec(d, 0.1)) * att(d, 0.001)
	mid = norm(bp(noise(r, d), 250, 2200) * dec(d, 0.08))
	ring = modes(d, [(98, 0.6, 0.7), (146.8, 0.35, 0.5), (196, 0.25, 0.4), (293.7, 0.12, 0.3)], onset=0.002)
	core = saturate(0.9 * crack + 0.5 * click + norm(thump) + 0.5 * body + 0.4 * mid + 0.2 * norm(ring), 2.4)
	x = st(core) + 0.12 * dual(r, d, nband(2000, 9000), 1.0) * dec(d, 0.15)[:, None]
	return reverb(r, x, 0.9, 0.18, 4000, 0.012)


@sfx('stamp', 0.5, 0.015, 'rubber stamp slam on paper over a wooden desk (short air, slam, desk ring, lift)', fade_out=0.08)
def s_stamp(r, d):
	pre = 0.015
	x = np.zeros(n_(d))
	ta = tt(pre)
	place(x, 0.12 * norm(tvf(noise(r, pre), 700 + 2000 * (ta / pre), 0.9) * (ta / pre) ** 3), 0.0)
	di = d - pre
	slap = norm(bp(noise(r, di), 900, 6500) * dec(di, 0.014)) * att(di, 0.0003)
	ti = tt(di)
	body = np.sin(phase(62 + 95 * np.exp(-ti / 0.025))) * dec(di, 0.14) * att(di, 0.0006)
	desk = modes(di, [(178, 1, 0.22), (305, 0.65, 0.16), (515, 0.4, 0.11), (860, 0.25, 0.07), (1420, 0.14, 0.04)])
	rub = norm(bp(noise(r, di), 300, 1300) * dec(di, 0.045))
	place(x, 0.55 * slap + saturate(norm(body), 1.6) + 0.45 * norm(desk) + 0.35 * rub, pre)
	peel = norm(bp(noise(r, 0.05), 1500, 5500)) * bump(0.05, 0.3) * (0.5 + 0.5 * rlfo(r, 0.05, 300))
	place(x, 0.05 * peel, pre + 0.17)
	return reverb(r, x, 0.38, 0.16, 5000)


@sfx('pin_drop', 0.5, 0.0, 'map pin landing: short boomy thock (wood + sub) with a tiny metallic ring', fade_out=0.1)
def s_pin_drop(r, d):
	t = tt(d)
	thock = np.sin(phase(70 + 190 * np.exp(-t / 0.015))) * dec(d, 0.25) * att(d, 0.0005)
	wood = modes(d, [(185, 1, 0.09), (330, 0.6, 0.06), (560, 0.4, 0.04), (910, 0.2, 0.025)])
	click = norm(bp(noise(r, d), 1500, 9000) * dec(d, 0.004))
	puff = norm(lp(noise(r, d), 900, 2) * dec(d, 0.03))
	sub = np.sin(2 * np.pi * 48 * t) * dec(d, 0.35) * att(d, 0.003)
	ring = modes(d, [(2637, 1, 0.35), (3951, 0.5, 0.25), (5274, 0.3, 0.18)], onset=0.002)
	core = saturate(norm(thock) + 0.5 * norm(wood) + 0.35 * click + 0.4 * puff + 0.5 * norm(sub), 1.8)
	return reverb(r, core + 0.1 * norm(ring), 0.45, 0.15, 6000)


def _crush(x, hold=6, bits=5):
	y = np.repeat(x[::hold], hold)[:len(x)]
	if len(y) < len(x):
		y = np.pad(y, (0, len(x) - len(y)))
	m = np.abs(y).max() + 1e-12
	q = 2 ** bits
	return np.round(y / m * q) / q * m


@sfx('glitch_hit', 0.6, 0.0, 'digital glitch hit: bit-crushed impact, accelerating pitched stutter, data chirps, tape-stop tail',
     fade_out=0.05)
def s_glitch_hit(r, d):
	n = n_(d)
	hd = 0.25
	th = tt(hd)
	h = np.sin(phase(50 + 140 * np.exp(-th / 0.025))) * dec(hd, 0.22) * att(hd, 0.0005)
	h = saturate(norm(h) + 0.5 * norm(bp(noise(r, hd), 800, 9000) * dec(hd, 0.02)), 2.0)
	crushed = _crush(h, 5, 4)
	x = np.zeros((n, 2))
	place(x, st(0.6 * crushed + 0.6 * h), 0.0)
	bt = tt(0.05)
	buzz = _crush(osc(np.full(len(bt), 220.0), [(k, 1.0 / k) for k in range(1, 30, 2)]), 3, 3)
	src = norm(crushed[:len(bt)] + 0.7 * norm(buzz))
	k, gap, j = 0.065, 0.055, 0
	while k < d - 0.16:
		ln = min(gap * 0.7, 0.035)
		pitch = 1 + 0.13 * j
		seg = np.interp(np.arange(0, n_(ln)) * pitch, np.arange(len(src)), src, right=0.0)
		rm = n_(0.0015)
		seg[:rm] *= np.linspace(0, 1, rm)
		seg[-rm:] *= np.linspace(1, 0, rm)
		place(x, pan_mono(seg, (-1) ** j * r.uniform(0.3, 0.75)), k, 0.85 ** j)
		k += gap
		gap = max(gap * 0.8, 0.018)
		j += 1
	for _ in range(5):
		ln = r.uniform(0.012, 0.03)
		f = r.choice([440, 880, 1320, 1760, 2640]) * r.uniform(0.98, 1.02)
		tone = _crush(np.sign(np.sin(2 * np.pi * f * tt(ln))) * 0.7, 2, 3) * np.hanning(n_(ln))
		place(x, pan_mono(tone, r.uniform(-0.8, 0.8)), r.uniform(0.05, d - 0.2), r.uniform(0.15, 0.35))
	m = 0.16
	tm = tt(m)
	stop = osc(260 * (40 / 260) ** (tm / m), [(k, 1.0 / k) for k in range(1, 20, 2)], fc=3000) * (1 - tm / m) ** 1.5
	place(x, st(_crush(stop, 4, 4)) * 0.45, d - m - 0.03)
	x = lp(hp(x, 60), 12000)
	return reverb(r, x, 0.3, 0.08, 9000)


@sfx('sparkle_ding', 1.2, 0.0, 'bright positive ding: two bell notes E6 → B6 + glittering sparkle pings + shimmer + reverb',
     fade_out=0.2)
def s_sparkle_ding(r, d):
	n = n_(d)

	def bell(f, dd, t60=0.95):
		return modes(dd, [(f, 1, t60), (f * 1.003, 0.4, t60), (f * 2.0, 0.45, t60 * 0.6), (f * 3.0, 0.22, t60 * 0.4),
		                  (f * 4.2, 0.16, t60 * 0.3), (f * 5.4, 0.1, t60 * 0.2)], onset=0.0008)
	x = np.zeros((n, 2))
	place(x, pan_mono(bell(1318.5, d), -0.15), 0.0, 0.8)
	place(x, pan_mono(bell(1975.5, d - 0.07), 0.15), 0.07, 1.0)
	place(x, st(0.3 * norm(hp(noise(r, 0.02), 3000) * dec(0.02, 0.004))), 0.0)
	for _ in range(28):
		t0 = 0.55 * r.random() ** 1.3
		f = r.uniform(3500, 11000)
		p = modes(0.15, [(f, 1, r.uniform(0.04, 0.12)), (f * 1.5, 0.3, 0.05)], onset=0.0005)
		place(x, pan_mono(p, r.uniform(-0.85, 0.85)), t0, r.uniform(0.05, 0.22))
	x += 0.05 * dual(r, d, lambda r_, d_: norm(hp(r_.standard_normal(n_(d_)), 7000)), 1.0) * bump(d, 0.2, 1.5, 1.5)[:, None]
	x += 0.12 * st(np.sin(2 * np.pi * 659.25 * tt(d)) * dec(d, 0.6) * att(d, 0.002))
	return reverb(r, x, 1.1, 0.3, 9000, 0.012)


@sfx('tynts', 0.8, 0.30, 'comedic "ba-dum-tss" button: high tom (0) + low tom (0.14) + bright light cymbal & tiny kick (0.30)',
     fade_out=0.1)
def s_tynts(r, d):
	n = n_(d)

	def tom(f0, f1, t60, wires=0.0, dd=0.35):
		tm = tt(dd)
		f = f1 + (f0 - f1) * np.exp(-tm / 0.03)
		body = np.sin(phase(f)) * dec(dd, t60) * att(dd, 0.0005)
		stick = norm(hp(noise(r, dd), 2500) * dec(dd, 0.004))
		skin = norm(bp(noise(r, dd), 300, 2500) * dec(dd, 0.04))
		x = saturate(norm(body) + 0.4 * stick + 0.3 * skin, 1.4)
		if wires:
			x += wires * norm(bp(noise(r, dd), 2000, 9000) * dec(dd, 0.12))
		return x

	def cymbal(dd=0.5):
		tc = tt(dd)
		sq = sum(np.sign(np.sin(2 * np.pi * f * 1.6 * tc + r.uniform(0, 6))) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
		metal = bp(sq, 6500, 14000)
		hiss = hp(r.standard_normal(len(tc)), 5000, 2)
		e = dec(dd, 0.42) * att(dd, 0.0004)
		return (0.8 * norm(metal) + 0.6 * norm(hiss)) * e

	x = np.zeros((n, 2))
	place(x, pan_mono(tom(240, 200, 0.16, 0.35), -0.25), 0.0, 0.85)
	place(x, pan_mono(tom(175, 140, 0.22, 0.2), 0.15), 0.14, 0.9)
	kick = np.sin(phase(55 + 90 * np.exp(-tt(0.25) / 0.02))) * dec(0.25, 0.18) * att(0.25, 0.0005)
	place(x, st(0.45 * norm(kick)), 0.30)
	place(x, pan_mono(cymbal(), 0.35), 0.30, 1.15)
	return reverb(r, x, 0.4, 0.12, 9000)


@sfx('ui_click', 0.15, 0.0, '[extra · S08 «клик-план»] crisp mechanical click', extra=True, fade_out=0.03)
def s_ui_click(r, d):
	dd = 0.09
	x = 0.6 * norm(hp(noise(r, dd), 3000) * dec(dd, 0.003))
	x += modes(dd, [(2600, 1, 0.014), (4100, 0.5, 0.009), (950, 0.45, 0.02), (6300, 0.2, 0.006)])
	place(x, 0.22 * modes(0.05, [(3300, 1, 0.01), (1500, 0.4, 0.012)]), 0.032)
	return reverb(r, x, 0.25, 0.05, 9000)


# ================================================================ counters / clocks / paper


def _tick(r, f0, vel=1.0):
	tk = modes(0.04, [(f0, 1, 0.012), (f0 * 1.7, 0.5, 0.008), (f0 * 0.42, 0.45, 0.02), (900, 0.25, 0.015)])
	tk += 0.5 * norm(hp(noise(r, 0.04), 3500) * dec(0.04, 0.0015))
	return tk * vel


@sfx('counter_tick_loop', 3.0, 0.002, 'rapid mechanical counter ticks, 20 per second, alternating pitch (rolling numbers); '
     'seamless loop', loop=True)
def s_counter_tick_loop(r, d):
	rate = 20.0
	x = np.zeros(n_(d + 0.3))
	for j in range(int(round(d * rate))):
		place(x, _tick(r, r.uniform(2900, 3400) * (0.93 if j % 2 else 1.0), r.uniform(0.7, 1.0)), 0.002 + j / rate)
	return wrap(reverb(r, lp(x, 10000), 0.2, 0.06, 8000), d)


@sfx('clock_tick_fast', 2.0, 0.002, 'fast suspense clock: tick-tock at 5 per second (10 strokes); seamless loop', loop=True)
def s_clock_tick_fast(r, d):
	rate = 5.0
	x = np.zeros(n_(d + 0.6))
	for j in range(int(round(d * rate))):
		tock = j % 2 == 1
		f = (2250 if tock else 2900) * r.uniform(0.99, 1.01)
		k = modes(0.2, [(f, 1, 0.02), (f * 1.53, 0.5, 0.014), (f * 2.62, 0.25, 0.008), (f * 0.33, 0.35, 0.035), (760, 0.3, 0.04), (420, 0.25, 0.03)])
		k += 0.45 * norm(hp(noise(r, 0.2), 2500) * dec(0.2, 0.002))
		place(x, k, 0.002 + j / rate, 0.85 if tock else 1.0)
	return wrap(reverb(r, x, 0.45, 0.14, 7000), d)


def _flip(r):
	d, land = 0.3, 0.075
	t = tt(d)
	e = bump(d, land / d * 0.9, 1.8, 2.0)
	x = 0.55 * norm(tvf(noise(r, d), 1300 + 2800 * e, 0.9) * e)
	lift = np.exp(-((t - 0.015) / 0.012) ** 2) * 1800
	settle = 300 * np.exp(-np.maximum(t - land, 0) / 0.05) * (t > land)
	x += 0.35 * norm(grains(r, d, lift + settle + 20))
	dl = d - land
	place(x, 0.75 * norm(lp(hp(noise(r, dl), 200), 3500) * dec(dl, 0.03)) * att(dl, 0.0006), land)
	place(x, 0.25 * norm(modes(dl, [(240, 1, 0.04), (420, 0.5, 0.03)])), land)
	return x


@sfx('calendar_flip', 1.2, 0.075, '6 quick calendar page flips, one every 0.16 s; each page slaps at 0.075 + k·0.16 s')
def s_calendar_flip(r, d):
	x = np.zeros((n_(d), 2))
	for k in range(6):
		place(x, pan_mono(_flip(r), r.uniform(-0.3, 0.3)), k * 0.16, r.uniform(0.75, 1.0))
	return reverb(r, x, 0.3, 0.1, 7000)


@sfx('scoreboard_flip', 0.5, 0.26, 'split-flap scoreboard: rattle of 9 plastic flaps, final heavy clack at 0.26 s', fade_out=0.06)
def s_scoreboard_flip(r, d):
	def flap(f0, heavy=0.0):
		dd = 0.08
		x = modes(dd, [(f0, 1, 0.012), (f0 * 1.52, 0.5, 0.009), (f0 * 2.3, 0.3, 0.006), (f0 * 0.5, 0.4, 0.015)])
		x += 0.6 * norm(hp(noise(r, dd), 3000) * dec(dd, 0.002))
		x += 0.4 * norm(bp(noise(r, dd), 600, 2500) * dec(dd, 0.008))
		if heavy:
			x += heavy * norm(modes(dd, [(240, 1, 0.035), (520, 0.6, 0.025), (1100, 0.4, 0.015)]))
		return x
	x = np.zeros((n_(d), 2))
	for j in range(9):
		place(x, pan_mono(flap(r.uniform(1800, 2600)), r.uniform(-0.25, 0.25)), j * 0.028, r.uniform(0.35, 0.6))
	place(x, st(flap(2100, 1.4)), 0.26, 1.0)
	return reverb(r, x, 0.3, 0.1, 8000)


@sfx('typewriter_tick', 0.15, 0.0, 'single typewriter key strike (per-letter typing)', fade_out=0.03)
def s_typewriter_tick(r, d):
	dd = 0.12
	base = r.uniform(1900, 2350)
	click = norm(hp(noise(r, dd), 2500) * dec(dd, 0.004)) * att(dd, 0.0002)
	bar = modes(dd, [(base, 1, 0.035), (base * 1.63, 0.6, 0.028), (base * 2.41, 0.45, 0.02), (base * 3.3, 0.3, 0.014)])
	body = modes(dd, [(165, 1, 0.05), (310, 0.6, 0.04), (720, 0.3, 0.03)], onset=0.0006)
	x = 0.6 * click + 0.5 * norm(bar) + 0.6 * norm(body)
	place(x, 0.22 * norm(hp(noise(r, 0.02), 3000) * dec(0.02, 0.003)) + 0.12 * norm(modes(0.02, [(base * 1.2, 1, 0.01)])), 0.035)
	return reverb(r, x, 0.3, 0.08, 7000)


# ================================================================ comedy / tension


@sfx('record_scratch', 0.6, 0.03, 'vinyl record scratch: four back-and-forth hand strokes over a music groove, stops dead')
def s_record_scratch(r, d):
	sd = 3.0
	ts = tt(sd)
	chord = sum(osc(np.full(len(ts), f), [(k, 1.0 / k) for k in range(1, 18)], fc=3500) for f in (110.0, 220.0, 261.6, 329.6))
	drums = np.zeros(len(ts))
	for k in np.arange(0, sd, 0.25):
		place(drums, lp(noise(r, 0.1), 3000) * dec(0.1, 0.05), k)
	src = norm(chord) * 0.8 + 0.5 * norm(bp(noise(r, sd), 300, 6000)) + 0.6 * norm(drums)
	t = tt(d)
	rate = np.zeros(len(t))
	for s, e, a in [(0.00, 0.13, 3.2), (0.13, 0.29, -3.0), (0.29, 0.39, 2.6), (0.39, 0.56, -2.4)]:
		u = np.clip((t - s) / (e - s), 0, 1)
		rate += np.where((t >= s) & (t < e), a * np.sin(np.pi * u) ** 0.8, 0)
	x = resample_var(src, rate, start=len(src) / 2) * np.abs(rate) ** 0.9
	fr = norm(bp(noise(r, d), 1000, 6000)) * np.abs(rate) / 3.2
	x = hp(norm(x) + 0.15 * fr, 150, 2)
	return reverb(r, pan_move(x, -0.1, 0.1), 0.3, 0.08, 8000)


@sfx('trombone_wah', 1.2, 0.0, 'sad muted trombone "wah-wah-wah-waaah" (B♭3 A3 A♭3 G3, last note wobbles and sags)', fade_out=0.12)
def s_trombone_wah(r, d):
	t = tt(d)
	notes = [(0.00, 0.25, 233.08), (0.27, 0.52, 220.0), (0.54, 0.79, 207.65), (0.81, 1.2, 196.0)]
	f = np.full(len(t), notes[0][2])
	amp = np.zeros(len(t))
	fc = np.full(len(t), 300.0)
	for i, (s, e, fr) in enumerate(notes):
		inside = (t >= s) & (t < e)
		u = np.clip((t - s) / (e - s), 0, 1)
		f = np.where(t >= s, fr, f)
		if i < 3:
			a = np.clip(u / 0.1, 0, 1) * np.clip((1 - u) / 0.18, 0, 1)
			w = 350 + 1600 * np.sin(np.pi * u) ** 1.2
		else:
			a = np.clip(u / 0.06, 0, 1) * np.clip((1 - u) / 0.45, 0, 1) ** 0.8
			w = 400 + 1400 * (0.5 + 0.5 * np.cos(2 * np.pi * 3.2 * (t - s))) * (1 - 0.5 * u)
		amp = np.where(inside, a, amp)
		fc = np.where(inside, w, fc)
	f = lp(f, 30, 1)
	s3 = notes[3][0]
	f = f * (1 + 0.025 * np.sin(2 * np.pi * 5.5 * (t - s3)) * np.clip((t - s3) / 0.15, 0, 1) * (t > s3))
	f = f * (1 - 0.045 * np.clip((t - s3 - 0.15) / 0.25, 0, 1))
	bright = fc * (0.5 + 0.7 * amp)
	x = sum(osc(f * dt, [(k, 1.0 / k) for k in range(1, 31)], fc=bright) for dt in (1.0, 1.005, 0.995))
	x = norm(x) * amp
	x = 0.7 * x + 0.5 * norm(tvf(x, fc, 2.0))
	x += 0.08 * norm(bp(noise(r, d), 500, 3000)) * amp ** 2
	return reverb(r, x, 0.6, 0.15, 6000)


@sfx('riser_short', 1.5, 1.40, 'tension riser: rising filtered noise + tonal sweep + sub swell + reverse-cymbal shimmer with '
     'accelerating tremolo; hard cut at 1.40 s, then silence', fade_out=0.005)
def s_riser_short(r, d):
	rd = 1.40
	t = tt(rd)
	u = t / rd
	fc = 250 * 28 ** (u ** 1.3)
	nz = norm(dual(r, rd, lambda r_, d_: tvf(r_.standard_normal(n_(d_)), fc, 1.4), 0.6)) * (u ** 2.2)[:, None]
	f = 160 * 2 ** (2 * u ** 1.6)
	trem = 1 - 0.35 * u * (0.5 + 0.5 * np.sin(phase(5 + 19 * u ** 2)))
	ton = sum(osc(f * dt, [(k, 1.0 / k) for k in range(1, 9)], fc=1200 + 5000 * u) for dt in (0.994, 1.0, 1.006))
	ton = norm(ton) * u ** 1.6 * trem
	sub = np.sin(phase(45 + 50 * u ** 2)) * u ** 2
	shimmer = dual(r, rd, lambda r_, d_: norm(hp(r_.standard_normal(n_(d_)), 6000)), 1.0) * (u ** 4)[:, None]
	x = nz + st(0.4 * ton + 0.35 * norm(sub)) + 0.25 * shimmer
	y = reverb(r, x, 0.9, 0.25, 8000)[:len(t)]
	y *= np.clip((rd - t) / 0.005, 0, 1)[:, None]
	out = np.zeros((n_(d), 2))
	out[:len(y)] = y
	return out


@sfx('beep_charge', 1.0, 0.0, 'three short electronic charge beeps rising C6 → E6 → G6 (0 / 0.28 / 0.56 s) over a faint '
     'capacitor-charge whine', fade_out=0.08)
def s_beep_charge(r, d):
	n = n_(d)
	x = np.zeros(n)
	for k, (t0, f, ln) in enumerate([(0.0, 1046.5, 0.1), (0.28, 1318.5, 0.1), (0.56, 1568.0, 0.18)]):
		tb = tt(ln)
		ff = f * (1 + 0.04 * np.exp(-tb / 0.006))
		tone = lp(osc(ff, [(h, 1.0 / h) for h in (1, 3, 5, 7, 9)]), 5000)
		env = att(ln, 0.002) * np.clip((ln - tb) / 0.02, 0, 1)
		place(x, norm(tone) * env, t0, 0.8 + 0.1 * k)
	t = tt(d)
	whine = np.sin(phase(2500 * 3.0 ** np.clip(t / 0.8, 0, 1))) * np.clip(t / 0.8, 0, 1) * (t < 0.8) * att(d, 0.05)
	x = x + 0.06 * whine
	return reverb(r, pan_move(x, -0.1, 0.1), 0.35, 0.12, 9000)


@sfx('fanfare_hit', 1.0, 0.0, '[extra · S14 «фанфарный хит»] triumphant brass stab C-major + timpani + crash (cut it with '
     'record_scratch)', extra=True, fade_out=0.2)
def s_fanfare_hit(r, d):
	t = tt(d)
	e = att(d, 0.008) * dec(d, 0.7)
	bright = 900 + 4500 * np.exp(-t / 0.15)
	brass = sum(osc(f * (1 - 0.02 * np.exp(-t / 0.02)), [(k, 1.0 / k) for k in range(1, 25)], fc=bright) for f in (261.6, 329.6, 392.0, 523.3))
	brass = norm(brass) * e
	timp = np.sin(phase(98 + 40 * np.exp(-t / 0.03))) * dec(d, 0.8) * att(d, 0.001)
	timp = norm(timp) + 0.4 * norm(lp(noise(r, d), 600) * dec(d, 0.06))
	crash = dual(r, d, lambda r_, d_: norm(hp(r_.standard_normal(n_(d_)), 4000)), 0.9) * (dec(d, 0.8) * att(d, 0.0005))[:, None]
	x = st(norm(brass) + 0.6 * timp) + 0.35 * crash
	return reverb(r, x, 1.2, 0.25, 7000)


@sfx('alarm_pulse', 1.2, 0.0, '[extra · E07 «тревожный тон», S31 red pulse] two dark detuned synth pulses (0, 0.5 s) '
     'with a faint high warning tone', extra=True, fade_out=0.2)
def s_alarm_pulse(r, d):
	n = n_(d)
	x = np.zeros(n)
	for t0 in (0.0, 0.5):
		m = 0.6
		tm = tt(m)
		fc = 300 + 2200 * np.exp(-tm / 0.12)
		p = sum(osc(np.full(len(tm), f * dt), [(k, 1.0 / k) for k in range(1, 30)], fc=fc) for f in (73.42, 146.83, 220.0) for dt in (0.997, 1.003))
		p = norm(p) * att(m, 0.004) * dec(m, 0.5)
		beep = np.sin(2 * np.pi * 1174.7 * tm) * (0.5 + 0.5 * np.sin(2 * np.pi * 12 * tm)) * att(m, 0.004) * dec(m, 0.35)
		place(x, p + 0.12 * beep, t0)
	return reverb(r, saturate(x, 1.3), 0.8, 0.2, 6000)


@sfx('ping_pong', 0.6, 0.0, '[extra · S15 plates flipping «пинг-понг»] two ping-pong ball bounces, left (0) then right (0.28 s)',
     extra=True, fade_out=0.08)
def s_ping_pong(r, d):
	def pock(f):
		dd = 0.12
		x = modes(dd, [(f, 1, 0.025), (f * 2.25, 0.5, 0.012), (f * 3.6, 0.3, 0.008)])
		x += 0.5 * norm(hp(noise(r, dd), 3000) * dec(dd, 0.002))
		x += 0.4 * norm(modes(dd, [(330, 1, 0.03), (610, 0.5, 0.02)]))
		return x
	x = np.zeros((n_(d), 2))
	place(x, pan_mono(pock(1180), -0.6), 0.0)
	place(x, pan_mono(pock(1240), 0.6), 0.28, 0.9)
	return reverb(r, x, 0.4, 0.12, 8000)


# ================================================================ earth / dust / fissure / fountain


@sfx('earth_rumble_dirt', 2.0, 0.05, 'earth movement / dirt wall rising: low rumble, sliding soil, gravel grit, tumbling '
     'rocks and a few heavy thuds', fade_out=0.25)
def s_earth_rumble_dirt(r, d):
	n = n_(d)
	t = tt(d)
	envl = att(d, 0.06) * np.clip((d - t) / 0.9, 0, 1) ** 1.2 * (0.75 + 0.25 * rlfo(r, d, 3))
	rum = norm(lp(noise(r, d), 110, 4))
	body = st(rum + 0.5 * norm(bp(saturate(1.6 * rum, 2.0), 70, 300))) * envl[:, None]
	slide = dual(r, d, nband(500, 4000), 0.8) * (envl * rlfo(r, d, 10) ** 1.5)[:, None]
	grit = grains2(r, d, 900 * envl + 20, bands=((300, 1200), (900, 3000), (2500, 7000)), weights=(1.0, 0.8, 0.4),
	               glen=0.008, t60=0.004, apow=2.0)
	rocks = np.zeros((n, 2))
	for t0 in poisson(r, d, 18 * envl):
		place(rocks, pan_mono(rock(r, 250, 1500, (0.01, 0.04), 0.08), r.uniform(-0.8, 0.8)), t0, r.uniform(0.3, 1.0))
	thuds = np.zeros((n, 2))
	for t0 in sorted(r.uniform(0.05, 1.1, 4)):
		m = 0.3
		th = modes(m, [(r.uniform(70, 110), 1, 0.15), (r.uniform(150, 220), 0.5, 0.08), (r.uniform(300, 500), 0.3, 0.04)], onset=0.002)
		th += 0.4 * norm(lp(noise(r, m), 500) * dec(m, 0.05))
		place(thuds, pan_mono(norm(th), r.uniform(-0.5, 0.5)), t0, r.uniform(0.4, 0.8))
	x = 0.9 * body + 0.35 * slide + 0.5 * norm(grit) + 0.45 * norm(rocks) + 0.6 * thuds
	return reverb(r, x, 0.9, 0.2, 3500)


@sfx('dust_puff', 0.8, 0.0, 'soft dust puff "pfff": falling air burst, small low whump, fine sand hiss', fade_out=0.15)
def s_dust_puff(r, d):
	t = tt(d)
	fc = 600 + 1600 * np.exp(-t / 0.08)
	puff = dual(r, d, lambda r_, d_: tvf(r_.standard_normal(n_(d_)), fc, 0.6), 0.7) * (att(d, 0.003) * dec(d, 0.4))[:, None]
	thump = np.sin(phase(55 + 60 * np.exp(-t / 0.02))) * dec(d, 0.15) * att(d, 0.001)
	whump = lp(noise(r, d), 250, 2) * att(d, 0.004) * dec(d, 0.2)
	sand = grains2(r, d, 1500 * dec(d, 0.5) + 10, bands=((3000, 7000), (5000, 12000)), weights=(1.0, 0.6))
	x = norm(puff) + st(0.4 * norm(thump) + 0.4 * norm(whump)) + 0.2 * norm(sand)
	return reverb(r, x, 0.5, 0.15, 6000)


@sfx('fissure_rip', 2.5, 0.0, 'ground tearing open: huge crack at 0, cracks running left → right, roaring gas jet '
     'swelling in (0.2–0.9 s), deep rumble with phone-audible harmonics', fade_out=0.3)
def s_fissure_rip(r, d):
	n = n_(d)
	t = tt(d)
	m = 0.9
	tm = tt(m)
	c0 = norm(hp(noise(r, m), 900) * dec(m, 0.05)) * att(m, 0.0002)
	c0 += 0.8 * norm(modes(m, [(220, 1, 0.15), (380, 0.7, 0.12), (610, 0.5, 0.09), (1040, 0.4, 0.06), (1600, 0.3, 0.04)]))
	c0 += norm(np.sin(phase(28 + 32 * np.exp(-tm / 0.08))) * dec(m, 0.8) * att(m, 0.001))
	c0 += 0.6 * norm(lp(noise(r, m), 300, 2) * dec(m, 0.5)) * att(m, 0.002)
	x = np.zeros((n, 2))
	place(x, st(saturate(norm(c0), 2.0)), 0.0, 1.0)
	crate = 60 + 700 * bump(d, 0.25, 1.2, 1.5) * (0.5 + 0.5 * rlfo(r, d, 6))
	crackle = grains(r, d, crate, bands=((200, 900), (600, 2000), (1500, 4500)), weights=(1.0, 0.8, 0.4), glen=0.012, t60=0.005, apow=2.0)
	pan_c = np.clip(-0.6 + 1.3 * t / 1.6, -0.6, 0.7)
	x += 0.3 * pan_mono(norm(crackle), pan_c)
	for t0 in sorted(r.uniform(0.12, 1.6, 9)):
		k = rock(r, 150, 900, (0.02, 0.07), 0.15, 0.8)
		mm = 0.3
		k = np.pad(k, (0, n_(mm) - len(k))) + 0.6 * norm(np.sin(phase(45 + 40 * np.exp(-tt(mm) / 0.03))) * dec(mm, 0.2) * att(mm, 0.001))
		place(x, pan_mono(norm(k), float(np.clip(-0.6 + 1.3 * t0 / 1.6, -0.6, 0.7))), t0, r.uniform(0.25, 0.5))
	genv = smoothstep(t, 0.15, 0.9) * (1 - 0.25 * t / d)
	gas = dual(r, d, nband(150, 1600), 0.7) * (0.7 + 0.3 * rlfo(r, d, 5))[:, None] + 0.4 * dual(r, d, nband(1200, 5000), 0.9) * rlfo(r, d, 8)[:, None]
	x += 0.3 * gas * genv[:, None]
	x += 0.25 * st(norm(lp(noise(r, d), 250, 2)) * bump(d, 0.14, 1.5, 1.2) ** 2)
	rum = norm(lp(noise(r, d), 70, 4)) * (0.6 + 0.4 * rlfo(r, d, 1.5))
	x += 0.42 * st(rum + 0.5 * norm(bp(saturate(1.6 * rum, 2.0), 70, 260))) * att(d, 0.02)[:, None]
	x = echoes(x, [(0.3, 0.16, 1200, 0.5), (0.68, 0.1, 800, -0.5)])
	return reverb(r, x, 1.4, 0.25, 3000)


@sfx('lava_fountain', 5.0, 0.1, 'roaring lava fountain: pulsing gas jet, deep rumble, molten splats landing, crackle and hiss',
     fade_out=0.3)
def s_lava_fountain(r, d):
	n = n_(d)
	t = tt(d)
	puls = 0.55 + 0.45 * rlfo(r, d, 2.2) ** 1.5
	jet = dual(r, d, nband(180, 2400), 0.7) * puls[:, None]
	jet_lo = st(norm(lp(noise(r, d), 350, 2)) * puls ** 0.7)
	hiss = dual(r, d, nband(2500, 9000), 0.9) * (puls ** 2)[:, None]
	rum = norm(lp(noise(r, d), 70, 4)) * (0.6 + 0.4 * rlfo(r, d, 1.0))
	rum = st(rum + 0.4 * norm(bp(saturate(1.6 * rum, 2.0), 70, 260)))
	spl = np.zeros((n, 2))
	for t0 in poisson(r, d, 22 * smoothstep(t, 0.2, 0.8)):
		m = 0.1
		s = norm(lp(hp(noise(r, m), 200), 2500) * dec(m, 0.03) * att(m, 0.0008))
		s += 0.6 * norm(modes(m, [(r.uniform(120, 300), 1, 0.03), (r.uniform(400, 700), 0.4, 0.02)]))
		place(spl, pan_mono(s, r.uniform(-0.9, 0.9)), t0, r.uniform(0.2, 1.0) ** 1.5)
	crk = grains2(r, d, 60 + 200 * rlfo(r, d, 3) ** 3, bands=((1500, 4000), (3000, 8000)), weights=(1.0, 0.6), apow=2.5)
	wh = np.zeros((n, 2))
	for t0 in sorted(r.uniform(0.3, d - 1.0, 3)):
		m = 0.6
		place(wh, st(norm(lp(noise(r, m), 300, 2)) * bump(m, 0.25, 1.5, 1.5)), t0, 0.5)
	x = 0.75 * jet + 0.5 * jet_lo + 0.12 * hiss + 0.6 * rum + 0.4 * norm(spl) + 0.2 * norm(crk) + 0.4 * wh
	x *= att(d, 0.08)[:, None]
	return reverb(r, x, 1.3, 0.2, 4500)


# ================================================================ water / steam


@sfx('water_hose', 4.0, 0.0, 'high-pressure water spray: valve burst + sputter at start, hissing jet with turbulence, '
     'droplet spatter and splats, low pressure rush', fade_out=0.3)
def s_water_hose(r, d):
	n = n_(d)
	t = tt(d)
	amp = (1 + 0.4 * np.exp(-t / 0.06)) * (1 - 0.6 * np.exp(-((t - 0.09) / 0.018) ** 2)) * (1 - 0.45 * np.exp(-((t - 0.16) / 0.015) ** 2))
	waver = 0.85 + 0.15 * rlfo(r, d, 0.9)
	turb = 1 + 0.18 * (2 * rlfo(r, d, 70) - 1)
	spray = dual(r, d, lambda r_, d_: norm(hp(lp(r_.standard_normal(n_(d_)), 11000, 2), 900, 2)), 0.8)
	shh = dual(r, d, nband(2500, 7000), 0.8)
	body = st(norm(bp(noise(r, d), 120, 700)))
	nozzle = st(norm(tvf(noise(r, d), 2900 + 200 * rlfo(r, d, 2), 9.0)))
	drops = grains2(r, d, 1200, bands=((2000, 5000), (4000, 9000)), weights=(1.0, 0.7), apow=2.0)
	spl = np.zeros((n, 2))
	for t0 in poisson(r, d, 25):
		m = 0.05
		place(spl, pan_mono(norm(bp(noise(r, m), 400, 3000) * dec(m, 0.02)), r.uniform(-0.8, 0.8)), t0, r.uniform(0.2, 1.0))
	x = (0.8 * spray + 0.45 * shh) * (waver * turb)[:, None] + 0.35 * body * waver[:, None] + 0.06 * nozzle
	x += 0.3 * norm(drops) + 0.22 * norm(spl)
	x *= (att(d, 0.004) * amp)[:, None]
	return reverb(r, x, 0.8, 0.15, 7000)


@sfx('steam_hiss_big', 4.0, 0.0, 'seawater hitting lava: steam-explosion whump + crackle burst at 0, huge layered hiss and '
     'billowing steam roar, frying sizzle, boiling pops', fade_out=0.35)
def s_steam_hiss_big(r, d):
	n = n_(d)
	t = tt(d)
	envs = att(d, 0.003) * (0.55 + 0.45 * np.exp(-t / 0.35)) * (1 - 0.35 * t / d)
	billow = 0.5 + 0.5 * rlfo(r, d, 1.5)
	whump = norm(lp(noise(r, d), 280, 3) * att(d, 0.004) * dec(d, 0.6)) + norm(np.sin(phase(38 + 60 * np.exp(-t / 0.06))) * dec(d, 0.5) * att(d, 0.001))
	whump = saturate(norm(whump), 1.8)
	turb = 1 + 0.2 * (2 * rlfo(r, d, 40) - 1)
	hiss = dual(r, d, nband(1500, 11000), 0.85) * (envs * turb)[:, None]
	hiss_mid = dual(r, d, nband(400, 2500), 0.8) * (envs * billow)[:, None]
	roar = dual(r, d, nband(100, 600), 0.6) * (billow ** 1.5 * att(d, 0.03))[:, None]
	sizzle = grains2(r, d, 3500 * envs * (0.5 + 0.5 * rlfo(r, d, 4)), bands=((2500, 6000), (5000, 11000), (8000, 15000)),
	                 weights=(1.0, 0.8, 0.4), glen=0.003, apow=2.0)
	cburst = grains2(r, d, 9000 * np.exp(-t / 0.25), bands=((1500, 4000), (3000, 8000), (6000, 12000)), apow=2.0)
	pops = np.zeros((n, 2))
	for t0 in poisson(r, d, 18):
		m = 0.05
		f0 = r.uniform(400, 1500)
		b = np.sin(phase(f0 * (1 + 0.8 * (1 - np.exp(-tt(m) / 0.01))))) * dec(m, 0.02) * att(m, 0.001)
		place(pops, pan_mono(b, r.uniform(-0.8, 0.8)), t0, r.uniform(0.2, 1.0))
	x = st(0.7 * whump) + hiss + 0.6 * hiss_mid + 0.45 * roar + 0.5 * norm(sizzle) + 0.35 * norm(cburst) + 0.18 * norm(pops)
	return reverb(r, x, 1.6, 0.22, 6000)


@sfx('sizzle_short', 1.0, 0.0, 'short sizzle: "tssst" of water on hot rock with frying crackle and a few pops', fade_out=0.15)
def s_sizzle_short(r, d):
	n = n_(d)
	t = tt(d)
	e = att(d, 0.002) * dec(d, 0.75)
	tsst = dual(r, d, nband(2000, 9000), 0.8) * (att(d, 0.002) * dec(d, 0.25))[:, None]
	sizz = grains2(r, d, 5000 * e * (0.6 + 0.4 * rlfo(r, d, 6)), bands=((2500, 6000), (5000, 11000), (8000, 15000)),
	               weights=(1.0, 0.8, 0.4), glen=0.003, apow=2.0)
	hiss = dual(r, d, lambda r_, d_: norm(hp(r_.standard_normal(n_(d_)), 3500)), 0.9) * (e ** 1.2)[:, None]
	pops = np.zeros((n, 2))
	for t0 in r.uniform(0.02, 0.6, 5):
		m = 0.04
		place(pops, pan_mono(np.sin(phase(r.uniform(600, 1500) * (1 + 0.8 * (1 - np.exp(-tt(m) / 0.008))))) * dec(m, 0.015) * att(m, 0.0008),
		                     r.uniform(-0.6, 0.6)), t0, r.uniform(0.2, 0.6))
	x = 0.6 * tsst + 0.7 * norm(sizz) + 0.35 * hiss + 0.15 * pops
	return reverb(r, x, 0.5, 0.12, 7000)


# ================================================================ boats / horns / sea / wind


def _horn(r, d, f0, formants, bright, nh=40, scoop=0.04, rough=0.0):
	t = tt(d)
	f = f0 * (1 - scoop * np.exp(-t / 0.035)) * (1 + 0.003 * np.sin(2 * np.pi * 4.8 * t)) * (1 + 0.002 * (2 * rlfo(r, d, 6) - 1))
	src = osc(f, [(k, 1.0 / k ** 0.8) for k in range(1, nh)], fc=bright)
	if rough:
		src *= 1 + rough * (2 * rlfo(r, d, 25) - 1)
	return sum(g * reson(src, ff, q) for ff, g, q in formants) + 0.25 * src


def _blast_env(d, s, e, a=0.025, rel=0.06):
	t = tt(d)
	return np.clip((t - s) / a, 0, 1) * np.clip((e - t) / rel, 0, 1)


@sfx('boat_horn', 2.0, 0.0, 'small boat air horn: two toots (0–0.55 s, 0.78–1.65 s), nasal reed tone ≈345 Hz, harbour echo',
     fade_out=0.2)
def s_boat_horn(r, d):
	fm = [(700, 1.0, 3), (1400, 0.8, 4), (2600, 0.5, 5)]
	tone = norm(_horn(r, d, 345, fm, 5000)) + 0.5 * norm(_horn(r, d, 345 * 1.007, fm, 5000))
	env = _blast_env(d, 0.0, 0.55) + _blast_env(d, 0.78, 1.65)
	x = st(norm(tone) * env + 0.04 * norm(bp(noise(r, d), 500, 3000)) * env)
	x = echoes(x, [(0.42, 0.25, 2500, 0.5), (0.9, 0.12, 1800, -0.4)])
	return reverb(r, x, 1.4, 0.2, 5000, 0.015)


@sfx('ship_horn_low', 2.5, 0.05, 'deep ship horn ≈87 Hz (two horns beating), pitch scoop on attack, natural release, harbour '
     'echoes off cliffs', fade_out=0.3)
def s_ship_horn_low(r, d):
	t = tt(d)
	fm = [(300, 1.0, 2), (650, 0.7, 3), (1200, 0.35, 4)]
	tone = norm(_horn(r, d, 87.0, fm, 1300, 50, 0.06, 0.08)) + 0.7 * norm(_horn(r, d, 87.6, fm, 1300, 50, 0.06, 0.08))
	env = np.clip(t / 0.12, 0, 1) ** 1.5 * np.where(t < 1.9, 1.0, np.exp(-(t - 1.9) / 0.12))
	x = st(norm(tone) * env + 0.05 * norm(bp(noise(r, d), 200, 1500)) * env)
	x = echoes(x, [(0.55, 0.3, 900, 0.6), (1.2, 0.18, 700, -0.5)])
	return reverb(r, x, 2.2, 0.25, 2000, 0.02)


@sfx('boats_engines', 5.0, 0.0, 'four small diesel boat engines putt-putting out of the harbour (moving away, slight doppler '
     'drop), underwater exhaust burble, bow wash', fade_in=0.25, fade_out=0.4)
def s_boats_engines(r, d):
	n = n_(d)
	t = tt(d)
	out = np.zeros((n, 2))
	for fh, pan, g, r0 in [(8.5, -0.6, 1.0, 18.0), (11.0, -0.15, 0.8, 26.0), (13.5, 0.35, 0.7, 34.0), (7.2, 0.7, 0.55, 42.0)]:
		rate = fh * (1 + 0.03 * (2 * rlfo(r, d, 0.8) - 1)) * (1 - 0.02 * t / d)
		ph = np.cumsum(rate) / SR + r.random()
		idx = np.nonzero(np.diff(np.floor(ph), prepend=np.floor(ph[0])) > 0)[0]
		imp = np.zeros(n)
		imp[idx] = r.uniform(0.7, 1.0, len(idx))
		kd = 0.09
		f1 = r.uniform(62, 90)
		kern = modes(kd, [(f1, 1, 0.06), (f1 * 2.1, 0.4, 0.04), (r.uniform(280, 380), 0.25, 0.02)], onset=0.002)
		kern += 0.5 * norm(lp(noise(r, kd), 1200) * dec(kd, 0.025))
		eng = norm(signal.fftconvolve(imp, kern)[:n])
		burble = norm(tvf(noise(r, d), r.uniform(250, 450), 3.0)) * lp(np.abs(eng), 15, 1) * 3
		rr = r0 + 2.5 * t
		x = (eng + 0.3 * burble) * (r0 / rr)
		x = tvf(x, 6000 * (r0 / rr) ** 1.2 + 400, 0.707, 'lp')
		out += g * pan_move(x, pan, pan * 1.15)
	wash = dual(r, d, nband(300, 2500), 0.8) * (0.5 + 0.5 * rlfo(r, d, 1.5))[:, None]
	x = norm(out) + 0.18 * wash
	return reverb(r, x, 1.0, 0.2, 5000)


@sfx('sea_waves', 6.0, 0.0, 'calm night sea: small waves lapping on the harbour stones, low swell, distant wash; seamless loop',
     loop=True)
def s_sea_waves(r, d):
	xf = 1.5
	D = d + xf
	n = n_(D)
	x = dual(r, D, nband(30, 150), 0.5) * (0.5 + 0.5 * rlfo(r, D, 0.3))[:, None] * 0.5
	k = r.uniform(0, 0.4)
	while k < D:
		m = r.uniform(1.2, 2.0)
		tm = tt(m)
		e = (1 - np.exp(-tm / 0.1)) * np.exp(-LN1000 * tm / (m * 0.9))
		lap = norm(bp(noise(r, m), 250, 2000)) * e + 0.35 * norm(bp(noise(r, m), 1500, 6000)) * e * np.exp(-tm / 0.5)
		slap = norm(lp(noise(r, m), 800) * dec(m, 0.04)) * att(m, 0.002)
		place(x, pan_mono(lap + 0.25 * slap, r.uniform(-0.7, 0.7)), k, r.uniform(0.4, 1.0))
		k += r.uniform(0.9, 2.2)
	x += 0.25 * dual(r, D, nband(300, 2500), 0.9) * (0.3 + 0.7 * rlfo(r, D, 0.25))[:, None]
	x = reverb(r, x, 0.8, 0.15, 5000)[:n]
	x = hp(x, 25, 2)
	return loopify(x, d, xf)


@sfx('wind_cold', 6.0, 0.0, 'Arctic wind: gusting broadband wind with pitched howl that follows the gusts, faint whistle, '
     'icy hiss and low buffeting; seamless loop', loop=True)
def s_wind_cold(r, d):
	xf = 1.5
	D = d + xf
	chans = []
	gust_c = rlfo(r, D, 0.35)
	for ch in range(2):
		gust = 0.25 + 0.75 * (0.7 * gust_c + 0.3 * rlfo(r, D, 0.5)) ** 1.2
		base = norm(lp(noise(r, D), 500, 2)) * gust
		fc = 380 + 420 * gust
		howl = norm(tvf(noise(r, D), fc, 9.0)) * gust ** 2
		howl2 = norm(tvf(noise(r, D), fc * 1.6, 12.0)) * gust ** 2.5
		whistle = norm(tvf(noise(r, D), 1900 + 600 * rlfo(r, D, 0.4), 15.0)) * gust ** 3
		hiss = norm(bp(noise(r, D), 1500, 6000)) * gust ** 1.5
		buffet = norm(lp(noise(r, D), 80, 2)) * rlfo(r, D, 3) ** 2 * gust
		chans.append(base + 0.55 * howl + 0.25 * howl2 + 0.08 * whistle + 0.18 * hiss + 0.35 * buffet)
	x = hp(np.stack(chans, 1), 25, 2)
	return loopify(x, d, xf)


# ================================================================ cartoon host


@sfx('pop_in', 0.3, 0.0, 'light cartoon pop for the host appearing: rising bubble "bloop" + tiny sparkle', fade_out=0.06)
def s_pop_in(r, d):
	t = tt(d)
	f = 260 + 900 * (1 - np.exp(-t / 0.025))
	body = np.sin(phase(f)) * dec(d, 0.09) * att(d, 0.001)
	click = lp(noise(r, d), 3000) * dec(d, 0.004)
	ping = modes(d, [(2400, 1, 0.05), (3600, 0.5, 0.04)])
	x = norm(body) + 0.3 * norm(click) + 0.15 * norm(ping)
	return reverb(r, x, 0.3, 0.08, 8000)


@sfx('pop_out', 0.3, 0.0, 'light cartoon pop for the host leaving: falling "fwup" + air puff', fade_out=0.06)
def s_pop_out(r, d):
	t = tt(d)
	f = 220 + 700 * np.exp(-t / 0.03)
	body = np.sin(phase(f)) * dec(d, 0.08) * att(d, 0.001)
	air = tvf(noise(r, d), 2500 * np.exp(-t / 0.05) + 400, 0.8) * att(d, 0.002) * dec(d, 0.07)
	x = norm(body) + 0.4 * norm(air)
	return reverb(r, x, 0.3, 0.08, 8000)


# ================================================================ ElevenLabs renders

# name → (output name, how to find the hit, description)
EL = {
	'explosion_big': ('explosion_big_el', 'onset', 'ElevenLabs: massive bomb explosion, crack + deep boom + debris'),
	'steam_hiss_big': ('steam_hiss_big_el', 'onset', 'ElevenLabs: seawater on molten lava, roaring steam hiss + sizzle'),
	'biplane_flyby': ('biplane_flyby_el', 'peak', 'ElevenLabs: 1930s radial-engine biplane flying low overhead (doppler)'),
	'bomb_whistle': ('bomb_whistle_el', 'end', 'ElevenLabs: falling aerial bomb whistle, ends abruptly (hit = end)'),
	'fissure_rip': ('fissure_rip_el', 'onset', 'ElevenLabs: ground tearing open, rock cracking, earthquake rumble; '
	                'loud part 0–1.0 s, then drops away quickly'),
	'lava_fountain': ('lava_fountain_el', 'bed', 'ElevenLabs: lava fountain — in practice a deep roaring rumble, almost all '
	                  'energy < 250 Hz (use under the procedural lava_fountain for weight)'),
	'ship_horn_low': ('ship_horn_low_el', 'onset', 'ElevenLabs: one long deep ship foghorn in a harbour'),
	'crowd_cheer_short': ('crowd_cheer_short', 'onset', 'ElevenLabs: small crowd "hooray" with a little applause '
	                      '(no procedural version — synthetic crowds are not convincing)'),
	'lava_crackle': ('lava_crackle_el', 'bed', 'ElevenLabs: close-up bubbling, glugging lava with crackling crust'),
	'boats_engines': ('boats_engines_el', 'bed', 'ElevenLabs: several small fishing-boat diesels leaving a harbour'),
}


def load_el(src):
	path = os.path.join(EL_CACHE, src + '.mp3')
	raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
	                     capture_output=True, check=True).stdout
	return np.frombuffer(raw, '<f4').reshape(-1, 2).astype(float)


def env_ms(x, ms):
	k = n_(ms / 1000)
	e = np.abs(st(x)).max(1)
	return signal.fftconvolve(e ** 2, np.ones(k) / k)[:len(e)] ** 0.5


def render_el(src):
	out, how, desc = EL[src]
	x = load_el(src)
	x = hp(x, 20, 2)
	pk = np.abs(x).max()
	e = np.abs(x).max(1)
	i0 = int(np.argmax(e > pk * 10 ** (-45 / 20)))
	x = x[max(0, i0 - n_(0.004)):]
	e = np.abs(x).max(1)
	live = np.nonzero(e > pk * 10 ** (-66 / 20))[0]
	x = x[:live[-1] + n_(0.02)]
	env = env_ms(x, 10)
	if how == 'peak':
		hit = float(np.argmax(env_ms(x, 80)) / SR)
	elif how == 'end':
		hit = float(np.nonzero(env > 0.3 * env.max())[0][-1] / SR)
		x = x[:n_(hit) + n_(0.006)]
	elif how == 'bed':
		hit = 0.0
	else:
		hit = float(np.argmax(env > 0.5 * env.max()) / SR)
	dur = len(x) / SR
	y = finalize(x, dur, fade_in=0.003, fade_out=0.006 if how == 'end' else min(0.25, 0.08 * dur))
	return out, y, round(min(hit, dur), 3), desc, dur


# ================================================================ render / write / analyse


def finalize(x, dur, loop=False, fade_in=0.0006, fade_out=None):
	x = st(np.asarray(x, float))
	if not loop:
		x = hp(x, 20, 2)
	n = n_(dur)
	if len(x) < n:
		x = np.concatenate([x, np.zeros((n - len(x), 2))])
	x = x[:n].copy()
	x -= x.mean(0)
	fi = n_(0.002 if loop else fade_in)
	fo = n_(0.002 if loop else (fade_out if fade_out is not None else min(0.25, max(0.015, 0.08 * dur))))
	x[:fi] *= (0.5 - 0.5 * np.cos(np.pi * np.arange(fi) / fi))[:, None]
	x[n - fo:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(fo) / fo))[:, None]
	pk = np.abs(x).max()
	if not np.isfinite(pk) or pk <= 0:
		raise ValueError('silent or non-finite render')
	return x * (10 ** (PEAK_DB / 20) / pk)


def render(name, seed=0):
	spec = LIB[name]
	r = np.random.default_rng([zlib.crc32(name.encode()), seed])
	res = spec['fn'](r, spec['dur'])
	x = res[0] if isinstance(res, tuple) else res
	return finalize(x, spec['dur'], spec['loop'], spec['fade_in'], spec['fade_out'])


def write_wav(path, x):
	data = np.round(np.clip(x, -1, 32767 / 32768) * 32768).astype('<i2')
	with wave.open(path, 'wb') as w:
		w.setnchannels(2)
		w.setsampwidth(2)
		w.setframerate(SR)
		w.writeframes(data.tobytes())


def read_wav(path):
	with wave.open(path, 'rb') as w:
		n, ch = w.getnframes(), w.getnchannels()
		x = np.frombuffer(w.readframes(n), '<i2').astype(float).reshape(-1, ch) / 32768
	return st(x) if ch == 2 else np.stack([x[:, 0]] * 2, 1)


_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def momentary_max(x):
	k = signal.lfilter(*_K2, signal.lfilter(*_K1, x, axis=0), axis=0)
	ms = (k ** 2).sum(1)
	w = n_(0.4)
	if len(ms) < w:
		ms = np.pad(ms, (0, w - len(ms)))
	c = np.concatenate([[0], np.cumsum(ms)])
	return -0.691 + 10 * math.log10(((c[w:] - c[:-w]) / w).max() + 1e-20)


def stats_of(x, loop=False):
	db = lambda v: 20 * math.log10(max(v, 1e-12))
	pk = np.abs(x).max()
	tp = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max()
	rms = math.sqrt((x ** 2).mean())
	mono = x.mean(1)
	X = np.abs(np.fft.rfft(mono))
	fr = np.fft.rfftfreq(len(mono), 1 / SR)
	d1 = np.abs(np.diff(x, axis=0)).max(1)
	return {
		'dur': len(x) / SR, 'peak': db(pk), 'tp': db(tp), 'rms': db(rms), 'M': momentary_max(x), 'crest': db(pk) - db(rms),
		'centroid': float((X * fr).sum() / (X.sum() + 1e-12)), 'dc': float(np.abs(x.mean(0)).max()),
		'edge0': float(np.abs(x[0]).max()), 'edge1': float(np.abs(x[-1]).max()),
		'seam': float(np.abs(x[-1] - x[0]).max()) if loop else None,
		'corr': float(np.corrcoef(x[:, 0], x[:, 1])[0, 1]) if x[:, 0].std() > 0 and x[:, 1].std() > 0 else 1.0,
		'jump': float(d1.max()),
	}


def _cmap(v):
	stops = np.array([[8, 10, 30], [60, 20, 100], [170, 40, 110], [240, 110, 50], [252, 230, 150]], float)
	p = np.clip(v, 0, 1) * (len(stops) - 1)
	i = np.minimum(p.astype(int), len(stops) - 2)
	f = (p - i)[..., None]
	return (stops[i] * (1 - f) + stops[i + 1] * f).astype(np.uint8)


def sheet(items, path, cols=5):
	from PIL import Image, ImageDraw
	pw, ph, sh, wh = 380, 214, 140, 40
	rows = math.ceil(len(items) / cols)
	img = Image.new('RGB', (cols * pw, rows * ph), (18, 18, 22))
	dr = ImageDraw.Draw(img)
	fmin, fmax = 30.0, 20000.0
	for k, it in enumerate(items):
		ox, oy = (k % cols) * pw + 6, (k // cols) * ph + 4
		m = it['x'].mean(1)
		f, _, S = signal.spectrogram(m, SR, nperseg=1024, noverlap=1024 - 192, window='hann', mode='magnitude')
		S = 20 * np.log10(S + 1e-9)
		S = np.clip((S - (S.max() - 75)) / 75, 0, 1)
		W = pw - 12
		ys = np.exp(np.linspace(math.log(fmax), math.log(fmin), sh))
		rs = np.array([np.interp(ys, f, S[:, j]) for j in range(S.shape[1])]).T
		xs = np.linspace(0, rs.shape[1] - 1, W)
		spec = np.array([np.interp(xs, np.arange(rs.shape[1]), rs[i]) for i in range(sh)])
		img.paste(Image.fromarray(_cmap(spec)), (ox, oy + 20))
		for fg in (100, 1000, 10000):
			yy = oy + 20 + int((math.log(fmax) - math.log(fg)) / (math.log(fmax) - math.log(fmin)) * sh)
			dr.line([(ox, yy), (ox + 5, yy)], fill=(200, 200, 200))
			dr.text((ox + 7, yy - 6), f'{fg // 1000}k' if fg >= 1000 else str(fg), fill=(170, 170, 170))
		y0 = oy + 20 + sh + 3
		env = np.abs(it['x']).max(1) / 10 ** (PEAK_DB / 20)
		for i, b in enumerate(np.array_split(env, W)):
			hh = int(float(b.max() if len(b) else 0) * (wh / 2 - 1))
			dr.line([(ox + i, y0 + wh // 2 - hh), (ox + i, y0 + wh // 2 + hh)], fill=(120, 200, 230))
		hx = ox + int(min(it['hit'] / it['dur'], 0.999) * W)
		dr.line([(hx, oy + 20), (hx, oy + 20 + sh)], fill=(255, 60, 60))
		dr.polygon([(hx - 3, y0 - 3), (hx + 3, y0 - 3), (hx, y0 + 2)], fill=(255, 60, 60))
		src = 'EL' if it['source'] == 'elevenlabs' else ''
		dr.text((ox, oy + 3), f"{it['name']} {src}  {it['dur']:.2f}s  rms {it['st']['rms']:.0f}  M {it['st']['M']:.0f}",
		        fill=(255, 220, 120) if src else (235, 235, 235))
	img.save(path)


def build(names=None):
	os.makedirs(OUT, exist_ok=True)
	idx_path = os.path.join(OUT, 'index.json')
	old = {e['name']: e for e in json.load(open(idx_path))} if os.path.exists(idx_path) else {}
	entries = dict(old)
	todo = [n for n in LIB if names is None or n in names]
	for name in todo:
		spec = LIB[name]
		x = render(name)
		write_wav(os.path.join(OUT, name + '.wav'), x)
		e = {'name': name, 'file': f'sfx/{name}.wav', 'duration': round(len(x) / SR, 3), 'transient_at': spec['hit'],
		     'source': 'procedural', 'description': spec['desc']}
		if spec['loop']:
			e['loop'] = True
		entries[name] = e
		print(f'  rendered {name}', flush=True)
	for src in EL:
		out = EL[src][0]
		if names is not None and src not in names and out not in names:
			continue
		if not os.path.exists(os.path.join(EL_CACHE, src + '.mp3')):
			continue
		out, y, hit, desc, dur = render_el(src)
		write_wav(os.path.join(OUT, out + '.wav'), y)
		entries[out] = {'name': out, 'file': f'sfx/{out}.wav', 'duration': round(len(y) / SR, 3), 'transient_at': hit,
		                'source': 'elevenlabs', 'description': desc}
		if out != src:
			entries[out]['variant_of'] = src
		print(f'  converted {out}', flush=True)
	order = list(LIB) + [EL[s][0] for s in EL]
	ordered = [entries[k] for k in order if k in entries]
	with open(idx_path, 'w', encoding='utf-8') as f:
		json.dump(ordered, f, ensure_ascii=False, indent=1)
	report(ordered)


def report(entries):
	items = []
	print(f"\n{'name':22} {'src':4} {'dur':>5} {'hit':>5} {'peak':>6} {'TP':>6} {'rms':>6} {'M':>6} {'crest':>5} "
	      f"{'centr':>6} {'corr':>5} {'dc':>7} {'edge0':>7} {'edge1':>7} {'seam':>7}")
	for e in entries:
		x = read_wav(os.path.join(OUT, e['name'] + '.wav'))
		s = stats_of(x, e.get('loop', False))
		items.append({'name': e['name'], 'x': x, 'dur': s['dur'], 'hit': e['transient_at'], 'source': e['source'], 'st': s})
		seam = f"{s['seam']:.4f}" if s['seam'] is not None else '   -'
		print(f"{e['name']:22} {'EL' if e['source'] == 'elevenlabs' else 'proc':4} {s['dur']:5.2f} {e['transient_at']:5.2f} "
		      f"{s['peak']:6.2f} {s['tp']:6.2f} {s['rms']:6.1f} {s['M']:6.1f} {s['crest']:5.1f} {s['centroid']:6.0f} "
		      f"{s['corr']:+.2f} {s['dc']:.5f} {s['edge0']:.5f} {s['edge1']:.5f} {seam:>7}")
	sheet(items, os.path.join(OUT, '_spectra.png'))
	print(f'\n{len(items)} files · spectra → public/sfx/_spectra.png')


def main(argv):
	if '--stats' in argv:
		report(json.load(open(os.path.join(OUT, 'index.json'))))
		return
	names = [a for a in argv if not a.startswith('-')]
	bad = [n for n in names if n not in LIB and n not in EL and n not in {v[0] for v in EL.values()}]
	if bad:
		raise SystemExit(f'unknown: {bad}')
	build(names or None)


if __name__ == '__main__':
	main(sys.argv[1:])
