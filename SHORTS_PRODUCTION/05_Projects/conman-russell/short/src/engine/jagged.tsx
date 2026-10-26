import React from 'react';
import {clamp01, easeInOut, h1, INK, lerp} from '../ui/gfx';

// «jagged» — an original reveal for the transition engine (src/engine/transitions.tsx). The incoming beat appears inside a
// torn, irregular shape whose teeth grow as it opens:
//   • `at` inside the frame         → a ragged star bursts from that point (a pin, a face, the hit object);
//   • `at` on or beyond a frame edge → a ragged front tears in from that edge, starting at that spot of the edge
//                                      ([540, 1920] = from the middle of the bottom edge, [0, 700] = from the left at y 700).
// No `at` = a burst from the frame centre. Every value is a pure function of p (0 → 1), so frames render the same in any
// order and in any render tab. Clip-path only: the outgoing beat stays underneath (jaggedExit pushes it in and darkens it),
// the optional <JaggedRim> draws the paper / ink edge of the cut on top.
// Rules (standard 4.3 / R1): L2+ accent for a reveal on a hard word, at most ~2 per Short, with its own SFX (swish + paper /
// impact); never into the final beat (finale + loop = fade only) and not in L1 (L1 = fade / up / circle / hard cut).

export const JAGGED_DUR = 0.4;

const FW = 1080;
const FH = 1920;

export type JaggedOpts = {
	/** teeth: around the star (burst) or along the edge (front); default 24 / one per ~110 px of the edge */
	teeth?: number;
	/** tooth depth 0.2–0.6 (default 0.42): relative valley depth of the star, tooth length / 420 px of the front */
	depth?: number;
	/** variant of the random tooth pattern (default: derived from `at`) */
	seed?: number;
	/** slow wobble of the teeth while they grow, 0–0.08 (default 0.04) */
	boil?: number;
	/** rotation of the star over the transition, degrees (default 10) */
	spin?: number;
};

type Side = 'left' | 'right' | 'top' | 'bottom';
type Pt = [number, number];

const sideOf = ([x, y]: Pt): Side | null => (x <= 0 ? 'left' : x >= FW ? 'right' : y <= 0 ? 'top' : y >= FH ? 'bottom' : null);
const seedOf = (at: Pt, o: JaggedOpts) => o.seed ?? Math.round(at[0] * 0.37 + at[1] * 0.71);
/** reveal progress: nearly linear with a soft landing → the teeth stay on screen for the whole transition */
const grow = (p: number) => 1 - Math.pow(1 - clamp01(p), 1.15);
/** zoom-in of the incoming beat settles early, so nothing moves when the clip is dropped at p = 1 */
const settle = (p: number) => 1 - Math.pow(1 - clamp01(p), 2.4);

/** transform origin of the reveal: the point itself, or the spot on the edge the front starts from */
export const jaggedOrigin = (at?: Pt): Pt => {
	const a = at ?? [FW / 2, FH / 2];
	return [Math.max(0, Math.min(FW, a[0])), Math.max(0, Math.min(FH, a[1]))];
};

/** start offsets of m irregular steps (0.5–1.5 × the mean) that fill `total`: uneven tooth widths */
const steps = (m: number, seed: number, total: number) => {
	const w = Array.from({length: m}, (_, k) => 0.5 + h1(seed + k * 1.71));
	const sum = w.reduce((a, b) => a + b, 0);
	const out: number[] = [];
	let acc = 0;
	for (const x of w) {
		out.push(acc);
		acc += (x / sum) * total;
	}
	return out;
};

const burst = (p: number, c: Pt, o: JaggedOpts): Pt[] => {
	const n = Math.max(8, Math.round(o.teeth ?? 24));
	const seed = seedOf(c, o);
	const e = grow(p);
	const B = o.boil ?? 0.04;
	const J = lerp(0.32, 0.1, e); // peak jitter: wild at the start, calmer as it opens
	const d = lerp(o.depth ?? 0.42, 0.1, e); // relative valley depth
	const far = Math.max(...[[0, 0], [FW, 0], [0, FH], [FW, FH]].map(([x, y]) => Math.hypot(x - c[0], y - c[1])));
	// the lowest valley sits at e·far·1.05/0.975 (0.975 = chord sag between vertices up to 1.5 mean steps apart) → by the last
	// frame of the transition (p ≈ 0.96, e ≈ 0.97) every corner is inside the shape and dropping the clip shows no jump
	const R = (e * far * 1.05) / ((1 - J) * (1 - B) * (1 - d) * 0.975);
	const rot = h1(seed) * Math.PI * 2 + ((o.spin ?? 10) * Math.PI * e) / 180;
	const ang = steps(2 * n, seed, Math.PI * 2);
	return ang.map((a0, k) => {
		const r0 = h1(seed + k * 7.31);
		const wob = 1 - B * (0.5 + 0.5 * Math.sin(p * Math.PI * 3 + k * 2.17 + seed));
		const base = 1 - J * h1(seed + Math.floor(k / 2) * 3.7);
		const r = R * base * wob * (k % 2 === 0 ? 1 : 1 - d * (0.45 + 0.55 * r0));
		const a = rot + a0;
		return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r] as Pt;
	});
};

const front = (p: number, at: Pt, side: Side, o: JaggedOpts): Pt[] => {
	const horiz = side === 'top' || side === 'bottom';
	const along = horiz ? FW : FH; // length of the edge
	const span = horiz ? FH : FW; // distance to the opposite edge
	const u0 = Math.max(0, Math.min(along, horiz ? at[0] : at[1]));
	const n = Math.max(4, Math.round(o.teeth ?? along / 110));
	const seed = seedOf(at, o);
	const e = grow(p);
	const B = o.boil ?? 0.04;
	const slope = 0.35; // the front leads at u0 and trails towards the corners (a wedge that tears open)
	const L = 420 * (o.depth ?? 0.42) * clamp01(e * 3); // tooth length grows in over the first third
	const f = (e / 0.97) * (span + slope * Math.max(u0, along - u0) + 16); // valley line: past the far edge from e 0.97 (p ≈ 0.95) on
	const map = ([u, v]: Pt): Pt => (side === 'bottom' ? [u, FH - v] : side === 'top' ? [u, v] : side === 'left' ? [v, u] : [FW - v, u]);
	const us = steps(2 * n, seed, along + 24);
	const pts: Pt[] = [[-40, -40]];
	for (let k = 0; k <= 2 * n; k++) {
		const r0 = h1(seed + k * 5.13);
		const u = k === 2 * n ? along + 12 : us[k] - 12;
		const wob = 1 + B * 2 * Math.sin(p * Math.PI * 3 + k * 1.93 + seed);
		const tooth = k % 2 ? L * (0.3 + 0.7 * Math.sqrt(r0)) * wob : L * 0.22 * r0;
		pts.push([u, Math.max(-40, f - slope * Math.abs(u - u0) + tooth)]);
	}
	pts.push([along + 40, -40]);
	return pts.map(map);
};

/** vertices (frame px) of the jagged shape at progress p */
export const jaggedPoints = (p: number, at?: Pt, o: JaggedOpts = {}): Pt[] => {
	const side = at ? sideOf(at) : null;
	return side && at ? front(p, at, side, o) : burst(p, jaggedOrigin(at), o);
};

/** CSS clip-path of the jagged shape at progress p */
export const jaggedClip = (p: number, at?: Pt, o: JaggedOpts = {}) =>
	`polygon(${jaggedPoints(p, at, o).map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;

const scaleIn = (p: number) => lerp(1.1, 1, settle(p));

/** entrance of the incoming beat (engine: enter(tr = 'jagged', p, at)) — p = raw 0→1 over JAGGED_DUR */
export const jaggedEnter = (p: number, at?: Pt, o: JaggedOpts = {}): React.CSSProperties => {
	const [ox, oy] = jaggedOrigin(at);
	return {clipPath: jaggedClip(p, at, o), transform: `scale(${scaleIn(p)})`, transformOrigin: `${ox}px ${oy}px`};
};

/** exit of the outgoing beat while the next one tears in (engine: exit(tr = 'jagged', p, at)) */
export const jaggedExit = (p: number, at?: Pt): React.CSSProperties => {
	const [ox, oy] = jaggedOrigin(at);
	const e = easeInOut(p);
	return {transform: `scale(${1 + e * 0.08})`, transformOrigin: `${ox}px ${oy}px`, filter: `brightness(${1 - e * 0.35})`};
};

/** optional edge of the cut, drawn over the incoming beat while it tears in: a dark ink line + a paper-white inner line.
 *  Timeline renders it next to the entering beat while p < 1 (integration note in the template README). */
export const JaggedRim: React.FC<{p: number; at?: Pt; opts?: JaggedOpts; color?: string; ink?: string; width?: number}> = ({
	p, at, opts = {}, color = '#FFF6E0', ink = INK, width = 8,
}) => {
	if (p <= 0 || p >= 1) return null;
	const pts = jaggedPoints(p, at, opts).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
	const [ox, oy] = jaggedOrigin(at);
	const fade = clamp01((1 - p) / 0.3) * clamp01(p / 0.08);
	return (
		<svg width={FW} height={FH} viewBox={`0 0 ${FW} ${FH}`}
			style={{position: 'absolute', left: 0, top: 0, opacity: fade, transform: `scale(${scaleIn(p)})`, transformOrigin: `${ox}px ${oy}px`, pointerEvents: 'none'}}>
			<polygon points={pts} fill="none" stroke={ink} strokeOpacity={0.85} strokeWidth={width * 2.4} strokeLinejoin="miter" strokeMiterlimit={6} />
			<polygon points={pts} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="miter" strokeMiterlimit={6} />
		</svg>
	);
};
