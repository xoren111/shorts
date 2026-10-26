// Deterministic particle generators → Billboard sprites. Everything is a pure function of time (seconds) and a seed.
import type {BB} from './Billboards';

export type V3 = [number, number, number];

export const h1 = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** rising, flickering embers around a source (scale = km) */
export const embers = (t: number, c: V3, o: {n: number; spread: number; rise: number; size: number; seed: number; life?: number; hot?: number; wind?: [number, number]}): BB[] => {
	const out: BB[] = [];
	const life = o.life ?? 2.5;
	const [wx, wz] = o.wind ?? [0.02, 0];
	for (let i = 0; i < o.n; i++) {
		const s = o.seed * 1000 + i;
		const ph = h1(s) * life;
		const age = (t + ph) % life;
		const k = age / life;
		const cyc = Math.floor((t + ph) / life);
		const rx = (h1(s + cyc * 7.1) - 0.5) * 2 * o.spread;
		const rz = (h1(s + 3.3 + cyc * 5.7) - 0.5) * 2 * o.spread;
		const sway = Math.sin(age * 3 + s) * o.spread * 0.15;
		const fl = 0.8 + 0.2 * Math.sin(t * 5.5 + s * 3.1); // gentle shimmer (a fast 3.7 Hz twinkle read as flicker)
		const fade = Math.sin(Math.PI * k);
		const hot = o.hot ?? 1;
		out.push({
			x: c[0] + rx + wx * age + sway,
			y: c[1] + o.rise * (k * (1.2 - 0.4 * k)) * (0.6 + 0.8 * h1(s + 9)),
			z: c[2] + rz + wz * age,
			size: o.size * (0.5 + h1(s + 2) * 0.9) * (1 - 0.5 * k),
			r: 6 * hot,
			g: (2.2 - 1.6 * k) * hot,
			b: 0.4 * hot * (1 - k),
			a: fade * fl,
			kind: 0,
			seed: h1(s + 4),
		});
	}
	return out;
};

/** smoke / steam column: puffs rising from c, growing, drifting with the wind */
export const plume = (
	t: number,
	c: V3,
	o: {n: number; rise: number; spread: number; size: number; grow: number; seed: number; life?: number; color: [number, number, number]; alpha: number; glow?: [number, number, number]; wind?: [number, number]; startAt?: number},
): BB[] => {
	const out: BB[] = [];
	const life = o.life ?? 4;
	const [wx, wz] = o.wind ?? [0.05, 0];
	const t0 = o.startAt ?? -999;
	for (let i = 0; i < o.n; i++) {
		const s = o.seed * 1000 + i;
		const ph = (i / o.n) * life;
		const age = (t + ph) % life;
		const born = t - age;
		if (born < t0) continue;
		const k = age / life;
		const cyc = Math.floor((t + ph) / life);
		const rx = (h1(s + cyc * 3.1) - 0.5) * 2 * o.spread;
		const rz = (h1(s + 1.7 + cyc * 2.3) - 0.5) * 2 * o.spread;
		const fade = clamp01(k * 6) * (1 - k) * (1 - k);
		out.push({
			x: c[0] + rx * (1 + k) + wx * age,
			y: c[1] + o.rise * Math.sqrt(k) * (0.7 + 0.6 * h1(s + 5)),
			z: c[2] + rz * (1 + k) + wz * age,
			size: o.size * (0.6 + 0.6 * h1(s + 8)) * (1 + o.grow * k),
			r: o.color[0],
			g: o.color[1],
			b: o.color[2],
			a: o.alpha * fade,
			rot: h1(s + 6) * 6.28 + age * 0.2 * (h1(s) - 0.5),
			kind: 1,
			seed: h1(s + 11),
			gr: (o.glow?.[0] ?? 0) * (1 - k),
			gg: (o.glow?.[1] ?? 0) * (1 - k),
			gb: (o.glow?.[2] ?? 0) * (1 - k),
		});
	}
	return out;
};

/** explosion at time t (s since detonation): flash, fireball, sparks, debris (normal-blended parts returned separately) */
export const explosion = (t: number, c: V3, scale: number, seed: number): {add: BB[]; norm: BB[]} => {
	const add: BB[] = [];
	const norm: BB[] = [];
	if (t < 0 || t > 6) return {add, norm};
	// flash (short, not frame-filling)
	const fl = Math.exp(-t * 11);
	add.push({x: c[0], y: c[1] + scale * 0.3, z: c[2], size: scale * 4.5 * (0.6 + t * 2), r: 9, g: 6, b: 3, a: fl, kind: 0});
	// fireball: textured, turbulent puffs glowing from inside (yellow core → orange → dark red as they cool)
	for (let i = 0; i < 30; i++) {
		const s = seed * 100 + i;
		const dir = [h1(s) - 0.5, 0.3 + h1(s + 1) * 0.9, h1(s + 2) - 0.5];
		const sp = scale * (0.9 + h1(s + 3) * 1.5);
		const k = 1 - Math.exp(-t * 3.6);
		const heat = Math.exp(-t * (1.1 + h1(s + 4) * 0.9));
		add.push({
			x: c[0] + dir[0] * sp * k,
			y: c[1] + dir[1] * sp * k + scale * 0.7 * t,
			z: c[2] + dir[2] * sp * k,
			size: scale * (0.7 + h1(s + 5) * 0.8) * (0.55 + k * 1.4),
			r: 1.4 * heat,
			g: 0.35 * heat,
			b: 0.05 * heat,
			a: Math.min(1, heat * 1.8),
			rot: h1(s + 7) * 6.28 + t * (h1(s + 8) - 0.5),
			kind: 1,
			seed: h1(s + 6),
			gr: 5.5 * heat * heat,
			gg: 2.4 * heat * heat * heat,
			gb: 0.5 * heat * heat * heat,
		});
	}
	// sparks
	for (let i = 0; i < 70; i++) {
		const s = seed * 300 + i;
		const th = h1(s) * 6.283;
		const up = 0.4 + h1(s + 1) * 1.4;
		const v = scale * (3 + h1(s + 2) * 5);
		const tt = Math.min(t, 2.2);
		const x = c[0] + Math.cos(th) * v * tt * 0.6;
		const z = c[2] + Math.sin(th) * v * tt * 0.6;
		const y = c[1] + up * v * tt - 4.9 * scale * 1.8 * tt * tt;
		const life = clamp01(1 - t / (1.2 + h1(s + 3) * 1.4));
		if (life <= 0) continue;
		add.push({x, y: Math.max(c[1] - scale * 0.2, y), z, size: scale * 0.14, r: 8, g: 4.5, b: 1.2, a: life, kind: 0});
	}
	// smoke (dark, rising, lit from below early)
	for (let i = 0; i < 22; i++) {
		const s = seed * 500 + i;
		const k = 1 - Math.exp(-t * 1.1);
		const dir = [h1(s) - 0.5, 0.2 + h1(s + 1), h1(s + 2) - 0.5];
		const ap = clamp01(t * 4 - 0.3 - h1(s + 3) * 0.4) * clamp01(1.4 - t / 4.5);
		norm.push({
			x: c[0] + dir[0] * scale * 3 * k,
			y: c[1] + dir[1] * scale * 3.2 * k + scale * 0.9 * t,
			z: c[2] + dir[2] * scale * 3 * k,
			size: scale * (1.6 + h1(s + 4) * 1.2) * (0.6 + k * 1.4),
			r: 0.06,
			g: 0.045,
			b: 0.05,
			a: 0.9 * ap,
			rot: h1(s + 5) * 6.28,
			kind: 1,
			seed: h1(s + 6),
			gr: 3.5 * Math.exp(-t * 1.2),
			gg: 0.9 * Math.exp(-t * 1.5),
			gb: 0.15 * Math.exp(-t * 2),
		});
	}
	// debris rocks
	for (let i = 0; i < 40; i++) {
		const s = seed * 700 + i;
		const th = h1(s) * 6.283;
		const v = scale * (2 + h1(s + 2) * 4);
		const up = 0.8 + h1(s + 1) * 1.6;
		const tt = Math.min(t, 3);
		const y = c[1] + up * v * tt - 4.9 * scale * 2.2 * tt * tt;
		if (y < c[1] - scale * 0.5) continue;
		norm.push({
			x: c[0] + Math.cos(th) * v * tt * 0.5,
			y,
			z: c[2] + Math.sin(th) * v * tt * 0.5,
			size: scale * (0.08 + h1(s + 3) * 0.16),
			r: 0.03,
			g: 0.025,
			b: 0.025,
			a: 1,
			rot: t * 5 * (h1(s + 4) - 0.5),
			kind: 2,
			seed: h1(s + 5),
			gr: 2.5 * Math.exp(-t * 1.5),
			gg: 0.6 * Math.exp(-t * 1.5),
			gb: 0,
		});
	}
	return {add, norm};
};

/** lava fountains along a fissure segment a→b (only the opened part [0, open]) */
export const fountains = (t: number, a: V3, b: V3, open: number, o: {n: number; height: number; size: number; seed: number}): BB[] => {
	const out: BB[] = [];
	for (let i = 0; i < o.n; i++) {
		const s = o.seed * 1000 + i;
		const u = h1(s) * open;
		const life = 0.9 + h1(s + 1) * 0.9;
		const ph = h1(s + 2) * life;
		const age = (t + ph) % life;
		const k = age / life;
		const cyc = Math.floor((t + ph) / life);
		const v = o.height * (0.6 + 0.8 * h1(s + 3 + cyc));
		const dx = (h1(s + 4 + cyc) - 0.5) * o.height * 0.5;
		const dz = (h1(s + 5 + cyc) - 0.5) * o.height * 0.5;
		const base = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
		const y = base[1] + v * 4 * k * (1 - k);
		const heat = 1 - k * 0.6;
		out.push({
			x: base[0] + dx * k,
			y,
			z: base[2] + dz * k,
			size: o.size * (0.6 + h1(s + 6) * 0.8),
			r: 7 * heat,
			g: 3.2 * heat * heat,
			b: 0.7 * heat * heat,
			a: 1 - k * 0.3,
			kind: 0,
			seed: h1(s + 7),
		});
	}
	return out;
};

/** water jet: droplets on a ballistic arc from p0 to p1 (apex height above the higher end) */
export const waterJet = (t: number, p0: V3, p1: V3, o: {n: number; apex: number; size: number; seed: number; on: number}): BB[] => {
	const out: BB[] = [];
	if (o.on <= 0) return out;
	for (let i = 0; i < o.n; i++) {
		const s = o.seed * 1000 + i;
		const life = 1.2;
		const ph = (i / o.n) * life;
		const k = ((t + ph) % life) / life;
		const spread = (h1(s + Math.floor((t + ph) / life)) - 0.5) * 0.06;
		const x = p0[0] + (p1[0] - p0[0]) * k + spread * (p1[2] - p0[2]);
		const z = p0[2] + (p1[2] - p0[2]) * k - spread * (p1[0] - p0[0]);
		const y = p0[1] + (p1[1] - p0[1]) * k + o.apex * 4 * k * (1 - k);
		out.push({x, y, z, size: o.size * (0.7 + 0.6 * h1(s + 2)) * (1 + k), r: 0.75, g: 0.92, b: 1.1, a: 0.55 * o.on * (1 - k * 0.5), kind: 0, seed: h1(s + 3)});
	}
	return out;
};
