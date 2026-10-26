"""Extra procedural SFX for «The Yellow Fleet» on top of the volcano/rabbits library (tools/sfx.py DSP core, licence-free).
  python3 tools/sfx_yf.py            # build all → public/sfx/<name>.wav (+ index.json)
  python3 tools/sfx_yf.py NAME …     # only these"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx as S
from sfx import (np, n_, tt, lp, hp, bp, reson, tvf, dec, att, bump, phase, norm, noise, st, place, modes, burst, rlfo, grains,
                 pan_mono, pan_move, reverb, sfx, SR, _flyby)

NEW = []
def reg(name, dur, hit=0.0, desc='', **kw):
	NEW.append(name)
	return sfx(name, dur, hit, desc, **kw)


@reg('seagulls', 3.0, 0.0, 'two or three gulls far off: descending «kee-ow» calls with harsh overtones', fade_out=0.4)
def s_seagulls(r, d):
	x = np.zeros((n_(d), 2))
	for t0, f0, p in ((0.15, 2300, -0.5), (0.9, 2050, 0.4), (1.55, 2450, -0.2), (2.25, 2150, 0.6)):
		dd = 0.42
		t = tt(dd); f = f0 * (1.0 + 0.25 * np.exp(-t / 0.05)) * (1 - 0.35 * t / dd)
		src = np.sin(phase(f)) + 0.5 * np.sign(np.sin(phase(f * 0.5))) * 0.3
		y = reson(src, f0 * 1.1, 3) + 0.4 * reson(src, f0 * 2.1, 5)
		y = norm(y) * bump(dd, 0.2, 1.4, 1.6)
		place(x, pan_mono(y, p), t0, r.uniform(0.5, 0.9))
	return reverb(r, x, 1.2, 0.35, 5000, 0.03)


@reg('diesel_hum', 4.0, 0.0, 'big ship diesel: slow low thump ~5 Hz on a 55 Hz hum, a little exhaust hiss; loopable', loop=True)
def s_diesel_hum(r, d):
	t = tt(d)
	beat = 0.5 + 0.5 * np.sin(2 * np.pi * 4.8 * t) ** 8
	hum = 0.7 * np.sin(phase(55 + 0 * t)) + 0.35 * np.sin(phase(110 + 0 * t)) + 0.2 * np.sin(phase(165 + 0 * t))
	x = hum * (0.55 + 0.45 * beat) + 0.25 * norm(lp(noise(r, d), 400)) * beat + 0.06 * norm(bp(noise(r, d), 1500, 5000))
	return st(norm(x))


@reg('jet_flyby', 3.0, 1.2, 'fighter jet pass: turbine whine + roar with doppler drop, right → left, closest at 1.2 s', fade_in=0.05, fade_out=0.3)
def s_jet_flyby(r, d):
	def src(r_, d_):
		t = tt(d_)
		roar = norm(bp(noise(r_, d_), 120, 3500)) + 0.5 * norm(bp(noise(r_, d_), 2000, 9000))
		whine = 0.3 * np.sin(phase(2200 + 30 * np.sin(2 * np.pi * 3 * t)))
		return norm(roar + whine)
	x = _flyby(r, src, d, 1.2, v=180, h=60, y=10, ground=0.4, whoosh=0.35)
	x = x[:, ::-1] if x.ndim == 2 else x
	return reverb(r, x, 1.6, 0.2, 5000, 0.02)


@reg('metal_groan', 1.8, 0.1, 'ship hull groaning as it tilts: slow pitched creak with resonances, deep', fade_out=0.4)
def s_metal_groan(r, d):
	t = tt(d)
	f = 95 + 40 * np.sin(np.pi * t / d) + 8 * np.sin(2 * np.pi * 7 * t)
	src = np.sign(np.sin(phase(f))) * (0.6 + 0.4 * rlfo(r, d, 12))
	y = reson(src, 240, 6) + 0.7 * reson(src, 610, 9) + 0.4 * reson(src, 1350, 12)
	y = norm(y) * bump(d, 0.4, 1.2, 1.4)
	return reverb(r, st(y), 1.4, 0.3, 3000, 0.02)


@reg('bubbles_sink', 2.0, 0.0, 'big gurgling bubbles rising as something sinks, then a deep bottom thud at 1.5 s', fade_out=0.2)
def s_bubbles_sink(r, d):
	x = np.zeros(n_(d)); t = 0.0
	while t < 1.4:
		dd = r.uniform(0.04, 0.12); f0 = r.uniform(180, 600)
		tb = tt(dd); y = np.sin(phase(f0 * (1 + 1.8 * tb / dd))) * dec(dd, dd * 0.6) * att(dd, 0.004)
		place(x, y, t, r.uniform(0.3, 0.9)); t += r.exponential(0.045)
	thud = norm(lp(noise(r, 0.5), 140)) * dec(0.5, 0.25) + 0.8 * np.sin(phase(48 + 0 * tt(0.5))) * dec(0.5, 0.3)
	place(x, norm(thud), 1.5, 1.0)
	return reverb(r, st(x), 0.8, 0.25, 2500)


@reg('tank_tracks', 2.5, 0.0, 'toy-ish tank: clanking tracks (~9/s) over a low engine growl', fade_out=0.3)
def s_tank_tracks(r, d):
	t = tt(d)
	eng = norm(lp(noise(r, d), 220)) * 0.6 + 0.4 * np.sin(phase(70 + 5 * np.sin(2 * np.pi * 0.7 * t)))
	x = norm(eng) * 0.6
	k = 0.0
	while k < d - 0.05:
		cl = modes(0.06, [(1800, 1, 0.02), (2700, 0.6, 0.015), (900, 0.5, 0.03)])
		place(x, norm(cl), k, r.uniform(0.35, 0.6)); k += 1 / 9 + r.uniform(-0.01, 0.01)
	return reverb(r, st(x), 0.5, 0.15, 5000)


@reg('sandstorm', 4.0, 0.0, 'sandstorm: rising wind howl with gusts and a hiss of blowing sand, falls away at the end', fade_out=0.6)
def s_sandstorm(r, d):
	t = tt(d)
	env = np.clip(np.sin(np.pi * t / d) * 1.3, 0, 1)
	howl = tvf(noise(r, d), 300 + 500 * (0.5 + 0.5 * rlfo(r, d, 0.8)), 6, 'bp')
	hiss = norm(hp(noise(r, d), 3500)) * (0.4 + 0.6 * rlfo(r, d, 3))
	gr = grains(r, d, 400 * env + 20)
	x = norm(howl) * 0.9 + 0.5 * hiss + 0.4 * norm(gr)
	return st(norm(x * env))


@reg('plank_creak', 1.0, 0.0, 'wooden plank swinging down: long creak then a hollow thunk at 0.45 s', fade_out=0.15)
def s_plank_creak(r, d):
	x = np.zeros(n_(d))
	dd = 0.42; t = tt(dd); f = 320 + 160 * t / dd
	src = np.sign(np.sin(phase(f))) * (0.5 + 0.5 * rlfo(r, dd, 30))
	place(x, norm(reson(src, 900, 8) + 0.6 * reson(src, 1900, 10)) * bump(dd, 0.5, 1, 1), 0.0, 0.7)
	th = modes(0.35, [(180, 1, 0.12), (420, 0.6, 0.08), (760, 0.3, 0.05)]) + 0.4 * norm(lp(noise(r, 0.35), 900)) * dec(0.35, 0.05)
	place(x, norm(th), 0.45, 1.0)
	return reverb(r, st(x), 0.5, 0.15, 5000)


@reg('crowd_hey', 1.4, 0.05, 'a dozen sailors shout a cheerful «hey!» together, then laugh', fade_out=0.4)
def s_crowd_hey(r, d):
	x = np.zeros((n_(d), 2))
	for k in range(12):
		dd = 0.35; t = tt(dd); f0 = r.uniform(110, 190)
		f = f0 * (1.25 - 0.3 * t / dd)
		src = np.sign(np.sin(phase(f))) * 0.6 + 0.4 * np.sin(phase(2 * f))
		y = reson(src, 700 + r.uniform(-80, 80), 5) + 0.8 * reson(src, 1250 + r.uniform(-120, 120), 6) + 0.3 * reson(src, 2600, 8)
		y += 0.25 * norm(bp(noise(r, dd), 2500, 6000)) * dec(dd, 0.05)
		place(x, pan_mono(norm(y) * bump(dd, 0.15, 1.5, 1.3), r.uniform(-0.7, 0.7)), r.uniform(0.0, 0.06), r.uniform(0.5, 0.9))
	for k in range(14):
		dd = 0.12; t = tt(dd); f0 = r.uniform(160, 260)
		y = norm(reson(np.sign(np.sin(phase(f0 + 0 * t))), 800, 4)) * bump(dd, 0.3, 1, 1)
		place(x, pan_mono(y, r.uniform(-0.6, 0.6)), 0.5 + r.uniform(0, 0.8), r.uniform(0.15, 0.35))
	return reverb(r, x, 0.8, 0.25, 6000)


@reg('ball_kick', 0.6, 0.02, 'leather ball kicked, then it smacks into a rope net and rustles', fade_out=0.1)
def s_ball_kick(r, d):
	x = np.zeros(n_(d))
	k = modes(0.12, [(150, 1, 0.05), (330, 0.6, 0.03)]) + 0.6 * norm(bp(noise(r, 0.12), 300, 2500)) * dec(0.12, 0.02)
	place(x, norm(k), 0.02, 1.0)
	net = norm(bp(noise(r, 0.25), 1500, 6000)) * bump(0.25, 0.2, 1, 1.5)
	place(x, net, 0.32, 0.6)
	return reverb(r, st(x), 0.4, 0.12, 7000)


@reg('sewing_machine', 1.2, 0.0, 'old treadle sewing machine: fast needle clatter ~14/s with a whirr', fade_out=0.15)
def s_sewing_machine(r, d):
	x = 0.3 * norm(bp(noise(r, d), 600, 2400)) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * tt(d)))
	k = 0.0
	while k < d - 0.03:
		cl = modes(0.03, [(3300, 1, 0.008), (5200, 0.5, 0.006), (1700, 0.4, 0.01)])
		place(x, norm(cl), k, 0.7); k += 1 / 14
	return reverb(r, st(norm(x)), 0.3, 0.1, 8000)


@reg('oar_splashes', 2.0, 0.0, 'rowing: oars dip and pull in rhythm (~2.4/s), several boats, water splashes', fade_out=0.3)
def s_oar_splashes(r, d):
	x = np.zeros((n_(d), 2))
	for b, p in ((0, -0.5), (1, 0.0), (2, 0.5)):
		k = 0.05 * b
		while k < d - 0.2:
			dd = 0.22
			sp = norm(bp(noise(r, dd), 400, 5000)) * bump(dd, 0.15, 1, 1.4) + 0.4 * norm(grains(r, dd, 300))
			place(x, pan_mono(sp, p), k, r.uniform(0.4, 0.8)); k += 1 / 2.4 + r.uniform(-0.02, 0.02)
	return reverb(r, x, 0.5, 0.2, 6000)


@reg('start_whistle', 0.7, 0.0, 'referee whistle: one sharp pea-whistle blast with trill', fade_out=0.1)
def s_start_whistle(r, d):
	t = tt(0.55); f = 2900 + 120 * np.sin(2 * np.pi * 32 * t)
	y = np.sin(phase(f)) * (0.8 + 0.2 * np.sin(2 * np.pi * 32 * t)) + 0.15 * norm(bp(noise(r, 0.55), 2500, 5000))
	y = y * att(0.55, 0.01) * np.clip((0.55 - t) / 0.06, 0, 1)
	x = np.zeros(n_(d)); place(x, norm(y), 0.0, 1.0)
	return reverb(r, st(x), 0.6, 0.2, 7000)


@reg('helicopter_pass', 2.5, 1.1, 'big helicopter passing: rotor thump ~5/s + turbine, doppler', fade_in=0.05, fade_out=0.3)
def s_helicopter_pass(r, d):
	def src(r_, d_):
		t = tt(d_)
		thump = (0.5 + 0.5 * np.sin(2 * np.pi * 5.2 * t)) ** 6
		return norm(norm(lp(noise(r_, d_), 300)) * thump + 0.3 * norm(bp(noise(r_, d_), 2500, 7000)) + 0.2 * np.sin(phase(1700 + 0 * t)))
	return reverb(r, _flyby(r, src, d, 1.1, v=45, h=40, y=5, ground=0.4, whoosh=0.1), 1.2, 0.2, 4000, 0.02)


@reg('crowd_roar', 3.2, 0.2, 'big harbour crowd cheering and whistling, swelling', fade_out=0.6)
def s_crowd_roar(r, d):
	t = tt(d)
	env = np.clip(t / 0.4, 0, 1) * (0.8 + 0.2 * np.sin(np.pi * t / d))
	base = tvf(noise(r, d), 700 + 300 * rlfo(r, d, 2), 2.0, 'bp') + 0.6 * norm(bp(noise(r, d), 1500, 4500))
	x = np.zeros((n_(d), 2)); x[:, 0] = norm(base) * env; x[:, 1] = norm(tvf(noise(r, d), 750, 2.0, 'bp') + 0.6 * bp(noise(r, d), 1500, 4500)) * env
	for k in range(9):    # whistles
		dd = 0.5; tw = tt(dd); f = r.uniform(1800, 2600) * (1 + 0.25 * np.sin(np.pi * tw / dd))
		place(x, pan_mono(np.sin(phase(f)) * bump(dd, 0.4, 1, 1), r.uniform(-0.8, 0.8)), r.uniform(0.2, d - 0.6), 0.25)
	return reverb(r, x, 1.2, 0.3, 5000)


@reg('clocks_ticking', 3.0, 0.0, 'a crate of kitchen clocks ticking slightly out of sync, bright little ticks', fade_out=0.3)
def s_clocks_ticking(r, d):
	x = np.zeros((n_(d), 2))
	for c in range(9):
		off = r.uniform(0, 1.0); p = r.uniform(-0.7, 0.7); f0 = r.uniform(3200, 5200)
		k = off
		while k < d - 0.03:
			tk = modes(0.03, [(f0, 1, 0.006), (f0 * 1.7, 0.5, 0.004), (f0 * 0.6, 0.3, 0.008)])
			place(x, pan_mono(norm(tk), p), k, r.uniform(0.25, 0.45)); k += 1.0 * r.uniform(0.98, 1.02) / 2 * 2 * 0.5 + 0.5
	return reverb(r, x, 0.4, 0.2, 9000)


@reg('ship_bell', 2.2, 0.0, 'ship\'s bell: one strong ring, bronze partials, long decay', fade_out=0.4)
def s_ship_bell(r, d):
	f0 = 620.0
	x = modes(d, [(f0, 1.0, 1.8), (f0 * 2.0, 0.6, 1.2), (f0 * 2.4, 0.45, 1.0), (f0 * 3.0, 0.3, 0.7), (f0 * 4.2, 0.2, 0.5), (f0 * 0.5, 0.35, 1.6)])
	x += 0.2 * norm(hp(noise(r, d), 3000)) * dec(d, 0.01)
	return reverb(r, st(norm(x)), 1.0, 0.2, 6000)


@reg('notify_ding', 0.8, 0.0, 'soft app notification «ding»: two sine tones, gentle', fade_out=0.2)
def s_notify_ding(r, d):
	x = np.zeros(n_(d))
	for t0, f in ((0.0, 1318.5), (0.09, 1760.0)):
		dd = 0.6; y = (np.sin(phase(f + 0 * tt(dd))) + 0.3 * np.sin(phase(2 * f + 0 * tt(dd)))) * dec(dd, 0.35) * att(dd, 0.004)
		place(x, norm(y), t0, 0.8)
	return reverb(r, st(x), 0.6, 0.2, 9000)


@reg('hatch_open', 1.4, 0.0, 'heavy steel hatch cover lifted by a crane: winch whine, chain rattle, metallic scrape', fade_out=0.3)
def s_hatch_open(r, d):
	t = tt(d)
	whine = 0.4 * np.sin(phase(420 + 180 * t / d)) + 0.2 * np.sin(phase(840 + 360 * t / d))
	chain = norm(grains(r, d, 60, bands=((2000, 5000), (3500, 8000), (1000, 3000)), weights=(1, 0.7, 0.5)))
	scrape = norm(tvf(noise(r, d), 1200 + 800 * t / d, 8, 'bp')) * bump(d, 0.3, 1, 2)
	x = norm(whine) * 0.5 + 0.5 * chain + 0.6 * scrape
	return reverb(r, st(norm(x)), 1.0, 0.3, 4000)


@reg('crate_drop', 0.8, 0.03, 'wooden crate front falls flat: creak then a big hollow wooden slap with dust', fade_out=0.15)
def s_crate_drop(r, d):
	x = np.zeros(n_(d))
	slap = modes(0.5, [(140, 1, 0.12), (290, 0.7, 0.08), (520, 0.4, 0.05), (900, 0.25, 0.03)]) + 0.6 * norm(bp(noise(r, 0.5), 200, 3000)) * dec(0.5, 0.04)
	place(x, norm(slap), 0.28, 1.0)
	place(x, 0.4 * norm(reson(np.sign(np.sin(phase(380 + 0 * tt(0.25)))), 1100, 7)) * bump(0.25, 0.5, 1, 1), 0.0, 0.5)
	return reverb(r, st(x), 0.6, 0.2, 5000)


if __name__ == '__main__':
	names = [a for a in sys.argv[1:] if not a.startswith('-')] or NEW
	S.EL.clear()
	S.build(names)
