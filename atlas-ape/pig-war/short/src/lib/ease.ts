import {Easing, interpolate} from 'remotion';

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
	const x = clamp01(t);
	return x * x * (3 - 2 * x);
};
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const easeOutBack = Easing.bezier(0.34, 1.4, 0.64, 1);

/** 0→1 progress between frames a and b with an easing (clamped). */
export const prog = (f: number, a: number, b: number, ease: (t: number) => number = easeInOut) =>
	interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/** fade in over [a, a+d] and out over [b-d, b] */
export const inOut = (f: number, a: number, b: number, d = 8) =>
	Math.min(prog(f, a, a + d, easeOut), 1 - prog(f, b - d, b, easeIn));

/** damped spring-like overshoot 0→1 (deterministic, no physics state) */
export const springy = (t: number, damping = 6, freq = 2.2) => {
	if (t <= 0) return 0;
	return 1 - Math.exp(-damping * t) * Math.cos(freq * Math.PI * t);
};

/** deterministic hash noise */
export const hash = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};
export const rand = (seed: number) => {
	let a = seed >>> 0 || 1;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};
