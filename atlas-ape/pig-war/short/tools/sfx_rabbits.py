"""Extra procedural SFX for «Australia vs Rabbits» on top of the volcano library (tools/sfx.py DSP core, licence-free).
  python3 tools/sfx_rabbits.py            # build all rabbit sounds → public/sfx/<name>.wav (+ index.json)
  python3 tools/sfx_rabbits.py NAME …     # only these"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx as S
from sfx import (np, n_, tt, lp, hp, bp, reson, tvf, dec, att, bump, phase, norm, noise, st, place, modes, burst, rlfo, grains,
                 pan_mono, pan_move, reverb, sfx, SR, LN1000)

NEW = []
def reg(name, dur, hit=0.0, desc='', **kw):
	NEW.append(name)
	return sfx(name, dur, hit, desc, **kw)


@reg('boxing_bell', 1.8, 0.0, 'boxing ring bell: two quick strikes «ding-ding», inharmonic bell partials, long ring', fade_out=0.3)
def s_boxing_bell(r, d):
	def strike(dd, f0=1180.0):
		x = modes(dd, [(f0, 1.0, 1.6), (f0 * 2.76, 0.55, 1.0), (f0 * 5.40, 0.3, 0.6), (f0 * 8.93, 0.15, 0.35), (f0 * 0.56, 0.35, 1.2)])
		x += 0.25 * norm(hp(noise(r, dd), 3000) * dec(dd, 0.004))
		return x
	x = np.zeros(n_(d))
	place(x, strike(d), 0.0, 1.0)
	place(x, strike(d - 0.17, 1186.0), 0.17, 0.85)
	return reverb(r, st(x), 0.6, 0.12, 7000)


@reg('chicken_cluck', 1.0, 0.02, 'three short «bok» clucks and a rising «bagawk»', fade_out=0.08)
def s_chicken_cluck(r, d):
	def bok(dd, f0, f1, bright=1.0):
		t = tt(dd)
		f = np.linspace(f0, f1, len(t))
		src = np.sign(np.sin(phase(f))) * 0.5 + 0.5 * np.sin(phase(f * 2))
		y = reson(src, 900, 4) + bright * reson(src, 2300, 6) + 0.6 * reson(src, 3400, 8)
		y += 0.15 * hp(noise(r, dd), 2500)
		return norm(y) * bump(dd, 0.15, 1.2, 1.8)
	x = np.zeros(n_(d))
	for k, t0 in enumerate((0.0, 0.16, 0.30)):
		place(x, bok(0.09, 560 - 30 * k, 470 - 20 * k), t0, 0.8)
	place(x, bok(0.28, 520, 760, 1.3), 0.5, 1.0)
	return reverb(r, st(x), 0.25, 0.08, 6000)


@reg('scissors_snip', 0.5, 0.06, 'big scissors: open scrape, then a crisp metallic snip at 0.06 s', fade_out=0.1)
def s_scissors_snip(r, d):
	x = np.zeros(n_(d))
	place(x, 0.4 * norm(bp(noise(r, 0.06), 2500, 7000) * bump(0.06, 0.8, 1.0, 1.0)), 0.0)
	click = modes(0.25, [(3100, 1, 0.05), (4700, 0.7, 0.04), (6900, 0.5, 0.03), (2200, 0.4, 0.06)])
	click += 0.6 * norm(hp(noise(r, 0.25), 4000) * dec(0.25, 0.006))
	place(x, norm(click), 0.06, 1.0)
	return reverb(r, st(x), 0.3, 0.1, 9000)


@reg('applause_polite', 2.4, 0.1, 'small polite applause (about 15 people), swells and fades', fade_out=0.6)
def s_applause_polite(r, d):
	x = np.zeros((n_(d), 2))
	env = bump(d, 0.25, 1.0, 1.4)
	t = 0.0
	while t < d - 0.05:
		g = env[min(n_(d) - 1, int(t * SR))]
		c = burst(r, 0.05, r.uniform(700, 1200), r.uniform(2500, 4200), r.uniform(0.02, 0.04))
		place(x, pan_mono(c, r.uniform(-0.7, 0.7)), t, g * r.uniform(0.4, 1.0))
		t += r.exponential(1 / 55)
	return reverb(r, x, 0.5, 0.15, 6000)


@reg('fly_buzz', 1.6, 0.0, 'cartoon fly buzzing past left → right, wing whine with vibrato', fade_out=0.15)
def s_fly_buzz(r, d):
	t = tt(d)
	f = 205 + 25 * np.sin(2 * np.pi * 7 * t) + 40 * (rlfo(r, d, 3) - 0.5)
	src = np.zeros_like(t)
	for h, a in ((1, 1), (2, 0.6), (3, 0.45), (4, 0.3), (5, 0.2), (7, 0.1)):
		src += a * np.sin(phase(f * h))
	src *= 0.7 + 0.3 * np.sin(2 * np.pi * 31 * t)
	x = bp(src, 300, 4000) * bump(d, 0.5, 1.0, 1.0)
	return pan_move(norm(x), -0.8, 0.8)


@reg('wire_scratch', 2.0, 0.0, 'paws scratching at wire netting: fast metallic scrapes ~15/s with faint wire ring', fade_out=0.2)
def s_wire_scratch(r, d):
	x = np.zeros(n_(d))
	t = 0.0
	k = 0
	while t < d - 0.08:
		dd = 0.05
		s_ = bp(noise(r, dd), 1800, 6500) * bump(dd, 0.3, 1, 1.5)
		ring = modes(0.12, [(3300 + 200 * (k % 2), 0.3, 0.05), (5200, 0.2, 0.04)])
		place(x, 0.8 * norm(s_), t, r.uniform(0.6, 1.0))
		place(x, 0.25 * ring, t, 1.0)
		t += 1 / 15 + r.uniform(-0.008, 0.008)
		k += 1
	return st(x)


@reg('hop_thumps', 3.6, 0.0, 'many soft little rabbit hops on wooden boards (rapid, random, light)', fade_out=0.4)
def s_hop_thumps(r, d):
	x = np.zeros((n_(d), 2))
	t = 0.0
	while t < d - 0.1:
		dd = 0.09
		th = 0.8 * np.sin(2 * np.pi * r.uniform(85, 120) * tt(dd)) * dec(dd, 0.05) + 0.3 * lp(noise(r, dd), 900) * dec(dd, 0.02)
		th += 0.15 * modes(dd, [(r.uniform(300, 420), 1, 0.03)])
		place(x, pan_mono(norm(th), r.uniform(-0.5, 0.5)), t, r.uniform(0.35, 0.8))
		t += r.uniform(0.06, 0.13)
	return x


@reg('dock_ambience', 4.0, 0.0, 'harbour: two gull calls, gentle water lapping and a slow rope/hull creak', fade_out=0.6)
def s_dock_ambience(r, d):
	x = np.zeros((n_(d), 2))
	water = lp(noise(r, d), 700) * (0.5 + 0.5 * rlfo(r, d, 1.2))
	place(x, st(0.35 * norm(water)), 0)
	def gull(dd, f0):
		t = tt(dd)
		f = f0 * (1 + 0.5 * np.exp(-t / 0.05)) * (1 - 0.25 * t / dd)
		y = np.sin(phase(f)) + 0.5 * np.sin(phase(2 * f)) + 0.3 * np.sin(phase(3 * f))
		return reson(y, 1800, 2) * bump(dd, 0.2, 1, 1.5)
	place(x, pan_mono(norm(gull(0.45, 1150)), -0.5), 0.3, 0.55)
	place(x, pan_mono(norm(gull(0.35, 1300)), 0.6), 1.6, 0.4)
	dd = 1.1
	t = tt(dd)
	creak = np.sign(np.sin(phase(110 + 30 * t / dd + 15 * rlfo(r, dd, 8)))) * (0.4 + 0.6 * rlfo(r, dd, 20))
	place(x, st(0.3 * norm(bp(creak, 300, 2200) * bump(dd, 0.5, 1, 1))), 2.4)
	return x


@reg('crate_thud', 0.5, 0.0, 'wooden crate set down on boards: hollow thud', fade_out=0.1)
def s_crate_thud(r, d):
	x = modes(d, [(170, 1, 0.14), (390, 0.6, 0.1), (710, 0.35, 0.07), (1250, 0.2, 0.04)])
	x += 0.4 * norm(lp(noise(r, d), 1500) * dec(d, 0.03))
	return reverb(r, st(norm(x)), 0.25, 0.08, 5000)


@reg('lid_creak', 0.6, 0.0, 'wooden lid creaking open a crack', fade_out=0.1)
def s_lid_creak(r, d):
	t = tt(d)
	f = 180 + 260 * t / d + 40 * rlfo(r, d, 6)
	src = np.sign(np.sin(phase(f))) * (0.3 + 0.7 * rlfo(r, d, 30))
	return st(norm(bp(src, 400, 3000)) * bump(d, 0.4, 1, 1.2))


@reg('coins_jingle', 0.8, 0.02, 'coins clinking in a bag', fade_out=0.15)
def s_coins_jingle(r, d):
	x = np.zeros((n_(d), 2))
	t = 0.02
	while t < d - 0.2:
		f0 = r.uniform(3500, 7000)
		c = modes(0.25, [(f0, 1, 0.12), (f0 * 1.52, 0.6, 0.08), (f0 * 2.31, 0.3, 0.05)])
		place(x, pan_mono(c, r.uniform(-0.4, 0.4)), t, r.uniform(0.3, 1.0))
		t += r.exponential(0.05)
	return reverb(r, x, 0.3, 0.1, 9000)


@reg('deflate_horn', 1.0, 0.0, 'party horn deflating: buzzy pitch fall', fade_out=0.1)
def s_deflate_horn(r, d):
	t = tt(d)
	f = 520 * np.exp(-1.4 * t / d) + 12 * np.sin(2 * np.pi * 11 * t)
	src = np.zeros_like(t)
	for h, a in ((1, 1), (2, 0.7), (3, 0.5), (4, 0.35), (5, 0.25)):
		src += a * np.sin(phase(f * h))
	y = reson(src, 1100, 3) + 0.4 * src
	return st(norm(y) * bump(d, 0.08, 1, 1.6))


@reg('tumbleweed', 2.2, 0.0, 'dry tumbleweed rustling past on a lonely wind', fade_out=0.4)
def s_tumbleweed(r, d):
	wind = bp(noise(r, d), 250, 1400) * (0.4 + 0.6 * rlfo(r, d, 1.5))
	rust = grains(r, d, 160 + 120 * np.sin(np.pi * tt(d) / d))
	x = 0.5 * norm(wind) + 0.7 * norm(rust) * bump(d, 0.5, 1, 1)
	return pan_move(norm(x), -0.6, 0.7)


@reg('ear_pops', 0.9, 0.0, 'a quick ripple of tiny cartoon «boing» pops (ears springing up)', fade_out=0.1)
def s_ear_pops(r, d):
	x = np.zeros((n_(d), 2))
	for k in range(9):
		dd = 0.13
		t = tt(dd)
		f = r.uniform(500, 700) * (1 + 1.2 * t / dd)
		y = np.sin(phase(f)) * dec(dd, 0.09) * att(dd, 0.002)
		place(x, pan_mono(y, r.uniform(-0.6, 0.6)), k * 0.07 + r.uniform(0, 0.02), r.uniform(0.4, 0.8))
	return x


@reg('sniff', 0.35, 0.0, 'two quick little sniffs', fade_out=0.05)
def s_sniff(r, d):
	x = np.zeros(n_(d))
	for t0 in (0.0, 0.14):
		place(x, hp(noise(r, 0.09), 1800) * bump(0.09, 0.4, 1, 1.5), t0, 0.8)
	return st(x)


@reg('flask_bubble', 1.2, 0.0, 'glass flask bubbling softly', fade_out=0.2)
def s_flask_bubble(r, d):
	x = np.zeros(n_(d))
	t = 0.0
	while t < d - 0.1:
		dd = 0.08
		f0 = r.uniform(600, 1300)
		tb = tt(dd)
		y = np.sin(phase(f0 * (1 + 2.5 * tb / dd))) * dec(dd, 0.05) * att(dd, 0.003)
		place(x, y, t, r.uniform(0.3, 0.8))
		t += r.exponential(0.07)
	return reverb(r, st(x), 0.25, 0.15, 7000)


@reg('dig_scratch', 2.2, 0.0, 'small paws digging fast in dry dirt: gritty scrapes ~16/s and trickling soil', fade_out=0.25)
def s_dig_scratch(r, d):
	x = np.zeros(n_(d))
	t = 0.0
	while t < d - 0.08:
		dd = 0.055
		place(x, 0.9 * norm(bp(noise(r, dd), 500, 3200) * bump(dd, 0.25, 1, 1.6)), t, r.uniform(0.5, 1.0))
		t += 1 / 16 + r.uniform(-0.01, 0.01)
	x += 0.25 * norm(grains(r, d, 90 + 40 * np.sin(np.pi * tt(d) / d)))
	return st(x)


if __name__ == '__main__':
	names = [a for a in sys.argv[1:] if not a.startswith('-')] or NEW
	S.EL.clear()
	S.build(names)
