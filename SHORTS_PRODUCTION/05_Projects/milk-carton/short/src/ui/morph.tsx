import React, {useId} from 'react';
import {interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {getBoundingBox, getLength, getPointAtLength, getSubpaths, parsePath, reduceInstructions, reversePath, serializeInstructions} from '@remotion/paths';
import type {ReducedInstruction} from '@remotion/paths';
import {easeInOut} from '../lib/ease';
import {PAL} from '../theme';
import {SHAPES, isShapeName, type ShapeDef} from './shapes';

/**
 * Shape morphing between arbitrary SVG paths (motion kit, 24.10). Library of original shapes: src/ui/shapes.ts.
 *
 * How it morphs (prepared once per pair, cached per tab):
 *   1. every subpath = a ring; nesting gives the role (depth 0 solid, in a solid = hole, in a hole = solid …); solids are
 *      wound clockwise, holes counter-clockwise, the path is filled `nonzero` (overlapping solids add up, holes stay holes);
 *   2. rings of A and B are matched as trees: the two main solids always; then siblings (children of matched rings, other
 *      roots) only when they sit at about the same spot of their parent's box and have about the same relative size; a ring
 *      without a partner shrinks into (A) / grows out of (B) that spot, pulled inside the partner parent, subtree and all;
 *   3. both rings of a pair are resampled to the same N points along their length (@remotion/paths getLength /
 *      getPointAtLength), every sharp corner snapped onto a sample (star tips and the pin's tip stay sharp);
 *   4. B's start point is rotated to the offset with the least twist (max correlation of the centred rings);
 *   5. interpolation per ring pair (`mode="auto"`, default):
 *        polar  both rings star-shaped (a point sees the whole ring): angle + radius about the moving star centre — every
 *               in-between ring is star-shaped too, so it cannot cross itself;
 *        linear otherwise, when 16 sampled in-between rings are clean;
 *        flow   otherwise (coastlines, a «C»): a non-star ring first melts into a blob by a discrete curve-shortening flow
 *               (area kept), polar between the blobs, then the other ring re-forms — e.g. Italy → pin.
 *      `mode="linear" | "polar"` forces one. tools/morph_check.mjs checks pairs for self-crossings, leaking holes, area
 *      collapse / explosion, bulge and twist (all library pairs: 0 crossings, 0 leaks).
 *
 * <Morph shapes={['coin', 'pin', 'island']} keys={[W(3), W(7), W(12)]} morph={0.45} x={540} y={820} size={640} burst idle={1} />
 *     coin holds (floating) until 0.45 s before word 7, morphs into the pin landing ON word 7 (ring + sparks), holds, island on 12
 * <Morph from="heart" to="star" fromFrame={90} toFrame={120} spin={360} trail={2} />   one morph over frames 90–120
 * <Morph from={countryD} to="pin" progress={p} fill="none" stroke="#fff" />          raw path (fitted into the box), line art
 * <MorphMask shapes={['pin', 'circle']} keys={[t, t + 0.5]} size={[60, 2600]} show={[t - 0.2, end]}>…footage…</MorphMask>
 *     the next picture opens inside a growing pin that becomes a circle over the whole frame
 * Timing priority: progress > keys > span (seconds) > fromFrame/toFrame; nothing = the first shape, static.
 * Also: useMorph (d + phase + colour), MorphPath (bare <path> for your own svg), morphD / prepareMorph / morphRings (geometry),
 * fitPath (any path → the 200-unit box), placePath (box → frame px), mixColor (OKLCH blend).
 * No text here, so T-rules do not apply; defaults follow the drawn kit: ink outline (T3 ink), hard ink shadow, PAL colours.
 */

type P = [number, number];
export type ShapeInput = string | ShapeDef;
export type MorphMode = 'auto' | 'linear' | 'polar';
export type MorphOptions = {points?: number; mode?: MorphMode; fit?: boolean};

// ------------------------------------------------------------------------------------------------------------ geometry

const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const cross = (a: P, b: P) => a[0] * b[1] - a[1] * b[0];
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1];
const norm = (a: P) => Math.hypot(a[0], a[1]);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mixP = (a: P, b: P, k: number): P => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth01 = (x: number) => {
	const t = clamp01(x);
	return t * t * (3 - 2 * t);
};

/** signed area (y down: > 0 = clockwise on screen) */
export const ringArea = (pts: P[]) => {
	let s = 0;
	for (let i = 0; i < pts.length; i++) s += cross(pts[i], pts[(i + 1) % pts.length]);
	return s / 2;
};
const centroidOf = (pts: P[]): P => {
	let a = 0, cx = 0, cy = 0;
	for (let i = 0; i < pts.length; i++) {
		const p = pts[i], q = pts[(i + 1) % pts.length];
		const c = cross(p, q);
		a += c;
		cx += (p[0] + q[0]) * c;
		cy += (p[1] + q[1]) * c;
	}
	if (Math.abs(a) < 1e-9) {
		const n = pts.length || 1;
		return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
	}
	return [cx / (3 * a), cy / (3 * a)];
};
type Box = {x1: number; y1: number; x2: number; y2: number};
const boxOf = (pts: P[]): Box => {
	const b = {x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity};
	for (const [x, y] of pts) {
		b.x1 = Math.min(b.x1, x); b.y1 = Math.min(b.y1, y);
		b.x2 = Math.max(b.x2, x); b.y2 = Math.max(b.y2, y);
	}
	return b;
};
/** point → relative position in box A → same relative position in box B */
const mapBox = (p: P, a: Box, b: Box): P => {
	const u = (p[0] - a.x1) / Math.max(1e-6, a.x2 - a.x1), v = (p[1] - a.y1) / Math.max(1e-6, a.y2 - a.y1);
	return [b.x1 + u * (b.x2 - b.x1), b.y1 + v * (b.y2 - b.y1)];
};
export const pointInRing = (p: P, pts: P[]) => {
	let inside = false;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [xi, yi] = pts[i], [xj, yj] = pts[j];
		if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
};

/** one drawable piece of a subpath: its own tiny path (for getLength / getPointAtLength), ends and end tangents */
type Seg = {d: string; len: number; t0: P; t1: P};

const segmentsOf = (subpath: string): Seg[] => {
	const ins = reduceInstructions(parsePath(subpath));
	const segs: Seg[] = [];
	let start: P = [0, 0], cur: P = [0, 0];
	const line = (a: P, b: P) => {
		const v = sub(b, a);
		if (norm(v) > 1e-7) segs.push({d: `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`, len: norm(v), t0: v, t1: v});
	};
	for (const i of ins as ReducedInstruction[]) {
		if (i.type === 'M') start = cur = [i.x, i.y];
		else if (i.type === 'L') {
			line(cur, [i.x, i.y]);
			cur = [i.x, i.y];
		} else if (i.type === 'C') {
			const b: P = [i.x, i.y], c1: P = [i.cp1x, i.cp1y], c2: P = [i.cp2x, i.cp2y];
			const d = `M ${cur[0]} ${cur[1]} C ${i.cp1x} ${i.cp1y} ${i.cp2x} ${i.cp2y} ${i.x} ${i.y}`;
			const L = getLength(d);
			const pick = (...vs: P[]) => vs.find((v) => norm(v) > 1e-7) ?? [1, 0];
			if (L > 1e-7) segs.push({d, len: L, t0: pick(sub(c1, cur), sub(c2, cur), sub(b, cur)), t1: pick(sub(b, c2), sub(b, c1), sub(b, cur))});
			cur = b;
		} else if (i.type === 'Z') {
			line(cur, start);
			cur = start;
		}
	}
	line(cur, start); // an open subpath is closed (no-op when it already ends on its start)
	return segs;
};

/** N points along the closed ring, evenly by length, every corner (tangent jump > 20°) snapped onto the nearest sample */
const resample = (segs: Seg[], N: number): P[] => {
	const cum = [0];
	for (const s of segs) cum.push(cum[cum.length - 1] + s.len);
	const L = cum[cum.length - 1];
	const pos = Array.from({length: N}, (_, j) => (j * L) / N);
	const taken = new Set<number>();
	for (let k = 0; k < segs.length; k++) {
		const a = segs[(k - 1 + segs.length) % segs.length].t1, b = segs[k].t0;
		const cos = dot(a, b) / (norm(a) * norm(b));
		if (cos > Math.cos((20 * Math.PI) / 180)) continue;
		const j0 = Math.round((cum[k] / L) * N) % N;
		for (const j of [j0, (j0 + 1) % N, (j0 - 1 + N) % N]) {
			if (taken.has(j)) continue;
			taken.add(j);
			pos[j] = cum[k];
			break;
		}
	}
	pos.sort((x, y) => x - y);
	return pos.map((s) => {
		let k = 0;
		while (k < segs.length - 1 && cum[k + 1] <= s) k++;
		const p = getPointAtLength(segs[k].d, Math.max(0, Math.min(segs[k].len, s - cum[k])));
		return p ? ([p.x, p.y] as P) : ([0, 0] as P);
	});
};

type RingInfo = {segs: Seg[]; perim: number; coarse: P[]; area: number; c: P; inner: P; box: Box; parent: number; depth: number; solid: boolean; flip: boolean};
type ShapeInfo = {key: string; rings: RingInfo[]; d: string; main: number; fill: string};

const shapeCache = new Map<string, ShapeInfo>();
const ringCache = new Map<string, P[]>();
const pairCache = new Map<string, Pair>();

/** affine-normalise any path into the 200-unit box centred on 0,0 (keeps the aspect, `pad` units of margin) */
export const fitPath = (d: string, pad = 6) => {
	const bb = getBoundingBox(d);
	const s = (200 - 2 * pad) / Math.max(1e-6, bb.width, bb.height);
	const cx = (bb.x1 + bb.x2) / 2, cy = (bb.y1 + bb.y2) / 2;
	const X = (x: number) => (x - cx) * s, Y = (y: number) => (y - cy) * s;
	const out = reduceInstructions(parsePath(d)).map((i): ReducedInstruction => {
		if (i.type === 'M' || i.type === 'L') return {...i, x: X(i.x), y: Y(i.y)};
		if (i.type === 'C') return {type: 'C', cp1x: X(i.cp1x), cp1y: Y(i.cp1y), cp2x: X(i.cp2x), cp2y: Y(i.cp2y), x: X(i.x), y: Y(i.y)};
		return i;
	});
	return serializeInstructions(out);
};

const hashStr = (s: string) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return (h >>> 0).toString(36) + ':' + s.length;
};

/** library name | ShapeDef | raw path d → parsed rings with roles (cached) */
export const shapeInfo = (input: ShapeInput, fit = true): ShapeInfo => {
	const def: ShapeDef | null = typeof input === 'string' ? (isShapeName(input) ? SHAPES[input] : null) : input;
	const raw = def ? def.d : (input as string);
	const key = def ? `def:${def.id}:${hashStr(def.d)}` : `raw:${fit ? 'fit' : 'box'}:${hashStr(raw)}`;
	const hit = shapeCache.get(key);
	if (hit) return hit;
	const d0 = def || !fit ? raw : fitPath(raw);
	const subs = getSubpaths(d0);
	const rings: RingInfo[] = [];
	const subOk: string[] = [];
	for (const s of subs) {
		const segs = segmentsOf(s);
		const perim = segs.reduce((a, x) => a + x.len, 0);
		if (perim < 1e-3) continue;
		const coarse = resample(segs, 64);
		const area = ringArea(coarse);
		if (Math.abs(area) < 1e-3) continue;
		rings.push({segs, perim, coarse, area, c: centroidOf(coarse), inner: interiorPoint(coarse), box: boxOf(coarse), parent: -1, depth: 0, solid: true, flip: false});
		subOk.push(s);
	}
	if (!rings.length) throw new Error(`Morph: shape has no closed area: ${raw.slice(0, 60)}`);
	// nesting: X is inside Y when most of X's samples lie in Y and Y is larger; parent = the smallest such Y
	for (let i = 0; i < rings.length; i++) {
		let best = -1;
		for (let j = 0; j < rings.length; j++) {
			if (i === j || Math.abs(rings[j].area) <= Math.abs(rings[i].area)) continue;
			const inside = rings[i].coarse.filter((p) => pointInRing(p, rings[j].coarse)).length;
			if (inside > rings[i].coarse.length * 0.6 && (best < 0 || Math.abs(rings[j].area) < Math.abs(rings[best].area))) best = j;
		}
		rings[i].parent = best;
	}
	for (const r of rings) {
		let dpt = 0;
		for (let p = r.parent; p >= 0 && dpt < 32; p = rings[p].parent) dpt++;
		r.depth = dpt;
		r.solid = dpt % 2 === 0;
		r.flip = r.solid ? r.area < 0 : r.area > 0; // solids clockwise, holes counter-clockwise
	}
	const d = subOk.map((s, i) => (rings[i].flip ? reversePath(s) : s)).join(' ');
	let main = 0;
	rings.forEach((r, i) => {
		if (r.parent < 0 && Math.abs(r.area) > Math.abs(rings[main].area)) main = i;
	});
	if (rings[main].parent >= 0) main = rings.findIndex((r) => r.parent < 0);
	const info: ShapeInfo = {key, rings, d, main, fill: def?.fill ?? PAL.orange};
	shapeCache.set(key, info);
	return info;
};

/** ring i of shape s at N samples, wound by role, index 0 kept */
const ringPts = (s: ShapeInfo, i: number, N: number): P[] => {
	const k = `${s.key}#${i}#${N}`;
	const hit = ringCache.get(k);
	if (hit) return hit;
	let pts = resample(s.rings[i].segs, N);
	if (s.rings[i].flip) pts = [pts[0], ...pts.slice(1).reverse()];
	ringCache.set(k, pts);
	return pts;
};

/**
 * Best point to see the whole ring from: the centre of the polygon's kernel (the set of points from which every edge faces
 * inwards), or null when the ring is not star-shaped. depth(c) = min over edges of the signed distance from c to the edge
 * line is concave, so a coarse grid + pattern search finds its maximum; the ring is star-shaped about c when depth > 1 % of
 * its size. A mild pull towards the centroid keeps the centre central when the kernel is large.
 */
export const starCentre = (pts: P[]): P | null => {
	const sign = Math.sign(ringArea(pts)) || 1;
	const c0 = centroidOf(pts), b = boxOf(pts);
	const size = Math.max(b.x2 - b.x1, b.y2 - b.y1);
	const E: [P, P, number][] = [];
	for (let i = 0; i < pts.length; i++) {
		const p = pts[i], q = pts[(i + 1) % pts.length];
		const e = norm(sub(q, p));
		if (e > 1e-9) E.push([p, q, e]);
	}
	const depth = (c: P) => {
		let d = Infinity;
		for (const [p, q, e] of E) d = Math.min(d, (sign * cross(sub(p, c), sub(q, c))) / e);
		return d;
	};
	const score = (c: P) => depth(c) - 0.15 * norm(sub(c, c0));
	let best: P = c0, bestS = score(c0);
	const G = 12;
	for (let i = 0; i <= G; i++)
		for (let j = 0; j <= G; j++) {
			const c: P = [mix(b.x1, b.x2, i / G), mix(b.y1, b.y2, j / G)];
			const v = score(c);
			if (v > bestS) {
				bestS = v;
				best = c;
			}
		}
	const dirs = Array.from({length: 16}, (_, k) => [Math.cos((k * Math.PI) / 8), Math.sin((k * Math.PI) / 8)] as P);
	for (let step = size / G; step > size * 1e-4; ) {
		let moved = false;
		for (const [dx, dy] of dirs) {
			const c: P = [best[0] + dx * step, best[1] + dy * step];
			const v = score(c);
			if (v > bestS + 1e-12) {
				bestS = v;
				best = c;
				moved = true;
			}
		}
		if (!moved) step /= 2;
	}
	return depth(best) > size * 0.01 ? best : null;
};

/** a point well inside the ring: its star centre, else its centroid when inside, else the deepest grid point */
const interiorPoint = (pts: P[]): P => {
	const sc = starCentre(pts);
	if (sc) return sc;
	const c0 = centroidOf(pts);
	if (pointInRing(c0, pts)) return c0;
	const b = boxOf(pts);
	let best = c0, bestD = -Infinity;
	for (let i = 1; i < 16; i++)
		for (let j = 1; j < 16; j++) {
			const c: P = [mix(b.x1, b.x2, i / 16), mix(b.y1, b.y2, j / 16)];
			if (!pointInRing(c, pts)) continue;
			const d = Math.min(...pts.map((p) => norm(sub(p, c))));
			if (d > bestD) {
				bestD = d;
				best = c;
			}
		}
	return best;
};

/** q pulled towards the ring's interior point until it lies well inside the ring */
const pullInside = (q: P, r: RingInfo): P => {
	if (pointInRing(q, r.coarse)) return q;
	let lo = 0, hi = 1; // fraction of the way from the interior point to q
	for (let k = 0; k < 24; k++) {
		const m = (lo + hi) / 2;
		if (pointInRing(mixP(r.inner, q, m), r.coarse)) lo = m;
		else hi = m;
	}
	return mixP(r.inner, q, lo * 0.6);
};

type PolarTrack = {kind: 'polar'; ca: P; cb: P; ra: number[]; rb: number[]; ta: number[]; tb: number[]; solid: boolean};
type Track =
	| {kind: 'linear'; a: P[]; b: P[]; solid: boolean}
	| PolarTrack
	| {kind: 'flow'; sa: P[][]; sb: P[][]; mid: PolarTrack; wa: number; wb: number; solid: boolean}
	| {kind: 'vanish' | 'appear'; pts: P[]; c: P; from: P; to: P; solid: boolean};
export type Pair = {a: ShapeInfo; b: ShapeInfo; tracks: Track[]};

const unwrap = (pts: P[], c: P) => {
	const out: number[] = [];
	let prev = 0;
	pts.forEach((p, i) => {
		let a = Math.atan2(p[1] - c[1], p[0] - c[0]);
		if (i > 0) {
			while (a - prev > Math.PI) a -= 2 * Math.PI;
			while (a - prev < -Math.PI) a += 2 * Math.PI;
		}
		out.push(a);
		prev = a;
	});
	return out;
};

/** least twist: the cyclic start offset of B with the highest correlation of the centred rings */
const alignOffset = (a: P[], b: P[], ca: P, cb: P) => {
	const N = a.length;
	const A = a.map((p) => sub(p, ca)), B = b.map((p) => sub(p, cb));
	let best = 0, bestV = -Infinity;
	for (let k = 0; k < N; k++) {
		let v = 0;
		for (let i = 0; i < N; i++) v += dot(A[i], B[(i + k) % N]);
		if (v > bestV) {
			bestV = v;
			best = k;
		}
	}
	return best;
};
const rotate = (r: P[], k: number) => r.map((_, i) => r[(i + k) % r.length]);
const align = (a: P[], b: P[], ca: P, cb: P) => rotate(b, alignOffset(a, b, ca, cb));

/** polar track between two rings star-shaped about ca / cb (b already aligned): angle + radius interpolation */
const polarTrack = (a: P[], b: P[], ca: P, cb: P, solid: boolean): PolarTrack => {
	const ta = unwrap(a, ca), tb = unwrap(b, cb);
	const shift = Math.round((ta[0] - tb[0]) / (2 * Math.PI)) * 2 * Math.PI;
	return {kind: 'polar', ca, cb, ra: a.map((p) => norm(sub(p, ca))), rb: b.map((p) => norm(sub(p, cb))), ta, tb: tb.map((x) => x + shift), solid};
};

/** does the closed polygon cross itself? (O(N²), stops at the first crossing) */
export const crossesItself = (pts: P[]) => {
	const n = pts.length;
	const o = (a: P, b: P, c: P) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
	for (let i = 0; i < n; i++) {
		const a = pts[i], b = pts[(i + 1) % n];
		for (let j = i + 2; j < n; j++) {
			if (i === 0 && j === n - 1) continue;
			const c = pts[j], d = pts[(j + 1) % n];
			if (o(c, d, a) * o(c, d, b) < -1e-12 && o(a, b, c) * o(a, b, d) < -1e-12) return true;
		}
	}
	return false;
};

/**
 * Discrete curve-shortening flow: Laplacian smoothing (λ 0.5) with the area and centroid kept, snapshots every 6 steps,
 * until the ring is star-shaped. The continuous flow keeps an embedded curve embedded while it rounds off (Grayson), so the
 * snapshots lead a coastline or a «C» to a blob without knots; adjacent snapshots differ little and blend linearly.
 */
const flowToStar = (pts: P[], maxIter = 900): {snaps: P[][]; centre: P} | null => {
	const A0 = Math.abs(ringArea(pts));
	let cur = pts;
	const snaps: P[][] = [pts];
	for (let it = 1; it <= maxIter; it++) {
		const n = cur.length;
		let next: P[] = cur.map((p, i) => {
			const q = cur[(i - 1 + n) % n], r = cur[(i + 1) % n];
			return [p[0] + 0.5 * ((q[0] + r[0]) / 2 - p[0]), p[1] + 0.5 * ((q[1] + r[1]) / 2 - p[1])];
		});
		const c0 = centroidOf(cur), c1 = centroidOf(next), k = Math.sqrt(A0 / Math.max(1e-9, Math.abs(ringArea(next))));
		next = next.map((p) => [c0[0] + (p[0] - c1[0]) * k, c0[1] + (p[1] - c1[1]) * k]);
		cur = next;
		if (it % 6 === 0) {
			snaps.push(cur);
			const sc = starCentre(cur);
			if (sc) return {snaps, centre: sc};
		}
	}
	return null;
};

/**
 * One matched ring pair → a track. auto: both rings star-shaped → polar (cannot self-intersect); else linear when 16 sampled
 * in-between rings are clean; else flow (each non-star ring melts to a star-shaped blob, polar between the blobs, the other
 * ring re-forms). 'linear' / 'polar' force the mode (polar about the centroid when there is no star centre).
 */
const matchTrack = (a: P[], b: P[], solid: boolean, mode: MorphMode): Track => {
	if (mode === 'linear') return {kind: 'linear', a, b: align(a, b, centroidOf(a), centroidOf(b)), solid};
	const sa = starCentre(a), sb = starCentre(b);
	if (mode === 'polar' || (sa && sb)) {
		const ca = sa ?? centroidOf(a), cb = sb ?? centroidOf(b);
		return polarTrack(a, align(a, b, ca, cb), ca, cb, solid);
	}
	const bl = align(a, b, centroidOf(a), centroidOf(b));
	let clean = true;
	for (let s = 1; s < 16 && clean; s++) clean = !crossesItself(a.map((p, i) => mixP(p, bl[i], s / 16)));
	if (clean) return {kind: 'linear', a, b: bl, solid};
	const fa = sa ? {snaps: [a], centre: sa} : flowToStar(a);
	const fb = sb ? {snaps: [b], centre: sb} : flowToStar(b);
	if (!fa || !fb) return {kind: 'linear', a, b: bl, solid};
	const endA = fa.snaps[fa.snaps.length - 1], endB = fb.snaps[fb.snaps.length - 1];
	// all of B's snapshots rotate by the offset that aligns the two blobs
	const off = alignOffset(endA, endB, fa.centre, fb.centre);
	const sbs = fb.snaps.map((r) => rotate(r, off));
	return {kind: 'flow', sa: fa.snaps, sb: sbs, mid: polarTrack(endA, sbs[sbs.length - 1], fa.centre, fb.centre, solid), wa: fa.snaps.length > 1 ? 0.35 : 0, wb: sbs.length > 1 ? 0.35 : 0, solid};
};

/** samples for a ring pair: the main pair gets `points`, smaller rings fewer (≥ 32), by perimeter */
const samplesFor = (perim: number, mainPerim: number, points: number) => Math.max(32, Math.min(points, Math.round(points * Math.pow(perim / Math.max(1e-6, mainPerim), 0.75))));

/** position of p inside box b (0…1 per axis) */
const rel = (p: P, b: Box): P => [(p[0] - b.x1) / Math.max(1e-6, b.x2 - b.x1), (p[1] - b.y1) / Math.max(1e-6, b.y2 - b.y1)];

/**
 * Greedy matching of sibling rings (children of two matched rings, or the extra roots): a pair is allowed only when the two
 * sit at about the same spot of their parents' boxes (≤ 0.3 of the box) and have about the same relative size (≤ 4×);
 * the closest allowed pairs are taken first. Everything else vanishes / appears instead of flying across the shape
 * (a hole that travels far leaves its shape on the way).
 */
const pairUp = (a: ShapeInfo, ka: number[], boxA: Box, areaA: number, b: ShapeInfo, kb: number[], boxB: Box, areaB: number) => {
	const cands: [number, number, number][] = [];
	for (const x of ka)
		for (const y of kb) {
			const ra = a.rings[x], rb = b.rings[y];
			if (ra.solid !== rb.solid) continue;
			const ua = rel(ra.c, boxA), ub = rel(rb.c, boxB);
			const dpos = Math.hypot(ua[0] - ub[0], ua[1] - ub[1]);
			const dsize = Math.abs(Math.log(Math.sqrt(Math.abs(ra.area) / Math.max(1e-6, areaA)) / Math.max(1e-6, Math.sqrt(Math.abs(rb.area) / Math.max(1e-6, areaB)))));
			if (dpos <= 0.3 && dsize <= Math.log(4)) cands.push([x, y, dpos + 0.25 * dsize]);
		}
	cands.sort((p, q) => p[2] - q[2]);
	const usedA = new Set<number>(), usedB = new Set<number>(), pairs: [number, number][] = [];
	for (const [x, y] of cands) {
		if (usedA.has(x) || usedB.has(y)) continue;
		usedA.add(x);
		usedB.add(y);
		pairs.push([x, y]);
	}
	return {pairs, onlyA: ka.filter((x) => !usedA.has(x)), onlyB: kb.filter((y) => !usedB.has(y))};
};

/** prepare the morph A → B (cached): tracks of matched, vanishing and appearing rings */
export const prepareMorph = (from: ShapeInput, to: ShapeInput, opts: MorphOptions = {}): Pair => {
	const {points = 160, mode = 'auto', fit = true} = opts;
	const a = shapeInfo(from, fit), b = shapeInfo(to, fit);
	const key = `${a.key}>${b.key}|${points}|${mode}`;
	const hit = pairCache.get(key);
	if (hit) return hit;
	const mainPerim = Math.max(a.rings[a.main].perim, b.rings[b.main].perim);
	const kids = (s: ShapeInfo, p: number) => s.rings.map((_, i) => i).filter((i) => s.rings[i].parent === p);
	const tracks: Track[] = [];
	// a ring without a partner shrinks to / grows from the same relative spot of the matched parent's box; its whole subtree
	// scales about the same anchor, so nested holes and solids stay nested while they go
	// (inside a parent: the spot is pulled inside the partner ring, so a hole never slips out of its shape on the way)
	const lonely = (s: ShapeInfo, i: number, own: RingInfo, other: RingInfo, nested: boolean, kind: 'vanish' | 'appear', anchor?: {c: P; from: P; to: P}) => {
		const r = s.rings[i];
		const mapped = mapBox(r.c, own.box, other.box);
		const there = nested ? pullInside(mapped, other) : mapped;
		const an = anchor ?? {c: r.c, from: kind === 'vanish' ? r.c : there, to: kind === 'vanish' ? there : r.c};
		tracks.push({kind, pts: ringPts(s, i, samplesFor(r.perim, mainPerim, points)), ...an, solid: r.solid});
		for (const k of kids(s, i)) lonely(s, k, own, other, nested, kind, an);
	};
	const walk = (ia: number, ib: number) => {
		const ra = a.rings[ia], rb = b.rings[ib];
		const N = samplesFor(Math.max(ra.perim, rb.perim), mainPerim, points);
		tracks.push(matchTrack(ringPts(a, ia, N), ringPts(b, ib, N), ra.solid, mode));
		const m = pairUp(a, kids(a, ia), ra.box, Math.abs(ra.area), b, kids(b, ib), rb.box, Math.abs(rb.area));
		for (const [x, y] of m.pairs) walk(x, y);
		for (const x of m.onlyA) lonely(a, x, ra, rb, true, 'vanish');
		for (const y of m.onlyB) lonely(b, y, rb, ra, true, 'appear');
	};
	// the two main solids always pair up; the other roots by position / size like children
	walk(a.main, b.main);
	const ma = a.rings[a.main], mb = b.rings[b.main];
	const m = pairUp(a, kids(a, -1).filter((i) => i !== a.main), ma.box, Math.abs(ma.area), b, kids(b, -1).filter((i) => i !== b.main), mb.box, Math.abs(mb.area));
	for (const [x, y] of m.pairs) walk(x, y);
	for (const x of m.onlyA) lonely(a, x, ma, mb, false, 'vanish');
	for (const y of m.onlyB) lonely(b, y, mb, ma, false, 'appear');
	const pair: Pair = {a, b, tracks};
	pairCache.set(key, pair);
	return pair;
};

const polarAt = (tr: PolarTrack, e: number): P[] => {
	const c = mixP(tr.ca, tr.cb, e);
	return tr.ra.map((r, i) => {
		const rr = mix(r, tr.rb[i], e), th = mix(tr.ta[i], tr.tb[i], e);
		return [c[0] + rr * Math.cos(th), c[1] + rr * Math.sin(th)] as P;
	});
};
/** position along a list of snapshots (0 = first, 1 = last), linear between neighbours */
const snapAt = (snaps: P[][], q: number): P[] => {
	const x = clamp01(q) * (snaps.length - 1);
	const i = Math.min(snaps.length - 2, Math.floor(x));
	if (i < 0) return snaps[0];
	return snaps[i].map((p, j) => mixP(p, snaps[i + 1][j], x - i));
};

/** the rings of the morph at eased progress e (0 = A, 1 = B), each with its role */
export const morphRings = (pair: Pair, e: number): {pts: P[]; solid: boolean}[] =>
	pair.tracks.map((tr) => {
		if (tr.kind === 'linear') return {pts: tr.a.map((p, i) => mixP(p, tr.b[i], e)), solid: tr.solid};
		if (tr.kind === 'polar') return {pts: polarAt(tr, e), solid: tr.solid};
		if (tr.kind === 'flow') {
			// melt A to its blob (wa) → polar between the blobs → re-form B from its blob (wb)
			if (e < tr.wa) return {pts: snapAt(tr.sa, e / tr.wa), solid: tr.solid};
			if (e > 1 - tr.wb) return {pts: snapAt(tr.sb, (1 - e) / tr.wb), solid: tr.solid};
			return {pts: polarAt(tr.mid, (e - tr.wa) / Math.max(1e-6, 1 - tr.wa - tr.wb)), solid: tr.solid};
		}
		// lonely rings: gone by 60 % of the morph / start growing at 40 %; below 10 % of their size they are dropped (an
		// outline around a near-zero ring would leave a speck)
		const s = tr.kind === 'vanish' ? 1 - smooth01(e / 0.6) : smooth01((e - 0.4) / 0.6);
		if (s < 0.1) return {pts: [], solid: tr.solid};
		const at = mixP(tr.from, tr.to, e);
		return {pts: tr.pts.map((p) => [at[0] + (p[0] - tr.c[0]) * s, at[1] + (p[1] - tr.c[1]) * s] as P), solid: tr.solid};
	});

const fmt = (n: number) => String(Math.round(n * 100) / 100);
export const ringsToD = (rings: {pts: P[]}[]) =>
	rings
		.filter((r) => r.pts.length > 2)
		.map((r) => 'M' + r.pts.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join('L') + 'Z')
		.join(' ');

/** path d of the morph from → to at eased progress e; the exact source paths at 0 and 1 (box units, fill-rule nonzero) */
export const morphD = (from: ShapeInput, to: ShapeInput, e: number, opts: MorphOptions = {}) => {
	if (e <= 0) return shapeInfo(from, opts.fit ?? true).d;
	if (e >= 1) return shapeInfo(to, opts.fit ?? true).d;
	return ringsToD(morphRings(prepareMorph(from, to, opts), e));
};

// --------------------------------------------------------------------------------------------------------------- colour

const parseColor = (c: string): [number, number, number, number] | null => {
	const h = c.trim().toLowerCase();
	let m = h.match(/^#([0-9a-f]{3,8})$/);
	if (m) {
		const x = m[1];
		const v = x.length <= 4 ? x.split('').map((ch) => parseInt(ch + ch, 16)) : (x.match(/../g) ?? []).map((q) => parseInt(q, 16));
		return [v[0], v[1], v[2], v.length > 3 ? v[3] / 255 : 1];
	}
	m = h.match(/^rgba?\(([^)]+)\)$/);
	if (m) {
		const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
		return [v[0], v[1], v[2], v[3] ?? 1];
	}
	return null;
};
const toLin = (u: number) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));
const toSrgb = (u: number) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);
const oklch = ([r8, g8, b8]: number[]) => {
	const [r, g, b] = [r8, g8, b8].map((v) => toLin(v / 255));
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return [L, Math.hypot(A, B), Math.atan2(B, A)];
};
const fromOklch = (L: number, C: number, H: number) => {
	const A = C * Math.cos(H), B = C * Math.sin(H);
	const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
	const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
	const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
	const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
	return [r, g, b].map((v) => Math.round(255 * Math.max(0, Math.min(1, toSrgb(Math.max(0, Math.min(1, v)))))));
};

/**
 * colour a → b at k in OKLCH (lightness, chroma and hue along the short way): orange → teal goes through yellow-green, not
 * through RGB mud. Unparseable colours (named, gradients) fall back to remotion's interpolateColors.
 */
export const mixColor = (a: string, b: string, k: number) => {
	if (k <= 0) return a;
	if (k >= 1) return b;
	const ca = parseColor(a), cb = parseColor(b);
	if (!ca || !cb) return interpolateColors(k, [0, 1], [a, b]);
	const [L1, C1, H1] = oklch(ca), [L2, C2, H2] = oklch(cb);
	// a grey end has no hue: take the other end's
	const h1 = C1 < 0.02 ? H2 : H1, h2 = C2 < 0.02 ? H1 : H2;
	let dh = h2 - h1;
	while (dh > Math.PI) dh -= 2 * Math.PI;
	while (dh < -Math.PI) dh += 2 * Math.PI;
	const [r, g, bl] = fromOklch(mix(L1, L2, k), mix(C1, C2, k), h1 + dh * k);
	const al = mix(ca[3], cb[3], k);
	return al >= 0.999 ? `rgb(${r}, ${g}, ${bl})` : `rgba(${r}, ${g}, ${bl}, ${Math.round(al * 1000) / 1000})`;
};

// -------------------------------------------------------------------------------------------------------------- timing

export type MorphTiming = {
	/** manual 0→1 over the whole chain (wins over everything) */
	progress?: number;
	/** seconds at which shape i is fully formed (one per shape), e.g. word starts W(i) */
	keys?: number[];
	/** seconds [start, end]: the chain spread evenly */
	span?: [number, number];
	/** composition frames: the chain spread evenly between them */
	fromFrame?: number;
	toFrame?: number;
	/** seconds each morph takes, ending on its key (the shape holds in between); default: the whole gap between keys */
	morph?: number;
	/** easing of every morph (default lib/ease easeInOut) */
	ease?: (x: number) => number;
};
/** i = segment (shape i → i+1), u raw / e eased progress in it, since = seconds since the latest landing (key ≥ 1) or null */
export type MorphPhase = {i: number; u: number; e: number; since: number | null; moving: boolean};

/** where the chain is at time t (s): segment i (shape i → i+1), raw u, eased e, seconds since the last landing */
export const morphPhase = (t: number, n: number, tm: MorphTiming, fps: number): MorphPhase => {
	const ease = tm.ease ?? easeInOut;
	if (n < 2) return {i: 0, u: 0, e: 0, since: null, moving: false};
	if (tm.progress !== undefined) {
		const q = clamp01(tm.progress) * (n - 1);
		const i = Math.min(n - 2, Math.floor(q));
		const u = q - i;
		return {i, u, e: ease(u), since: null, moving: u > 0 && u < 1};
	}
	let keys = tm.keys;
	if (!keys && tm.span) keys = Array.from({length: n}, (_, k) => mix(tm.span![0], tm.span![1], k / (n - 1)));
	if (!keys && tm.fromFrame !== undefined && tm.toFrame !== undefined) keys = Array.from({length: n}, (_, k) => mix(tm.fromFrame!, tm.toFrame!, k / (n - 1)) / fps);
	if (!keys) return {i: 0, u: 0, e: 0, since: null, moving: false};
	if (keys.length !== n) throw new Error(`Morph: ${keys.length} keys for ${n} shapes`);
	if (t < keys[0]) return {i: 0, u: 0, e: 0, since: null, moving: false};
	if (t >= keys[n - 1]) return {i: n - 2, u: 1, e: 1, since: t - keys[n - 1], moving: false};
	let i = 0;
	while (i < n - 2 && t >= keys[i + 1]) i++;
	const gap = keys[i + 1] - keys[i];
	const m = Math.min(tm.morph ?? gap, gap);
	const u = m > 0 ? clamp01((t - (keys[i + 1] - m)) / m) : 1;
	return {i, u, e: ease(u), since: i > 0 ? t - keys[i] : null, moving: u > 0 && u < 1};
};

// ----------------------------------------------------------------------------------------------------------- component

type PerShape<T> = T | T[];
const at = <T,>(v: PerShape<T> | undefined, k: number, dflt: T): T => (Array.isArray(v) ? (v[Math.min(k, v.length - 1)] ?? dflt) : (v ?? dflt));

export type MorphProps = MorphTiming &
	MorphOptions & {
		/** chain of shapes (library name, ShapeDef or raw path d); or use from / to */
		shapes?: ShapeInput[];
		from?: ShapeInput;
		to?: ShapeInput;
		/** centre (px) and box size (px) — a number, or one per shape (they travel with the morph) */
		x?: PerShape<number>;
		y?: PerShape<number>;
		size?: PerShape<number>;
		/** fill: one colour, one per shape, or 'none' (line art); default = each library shape's colour; blends in OKLCH */
		fill?: PerShape<string>;
		/** soft top-light gradient on the fill (default on) */
		shine?: boolean;
		/** outline colour / width in px (default ink, 10 px; the fill covers its inner half) */
		stroke?: string;
		strokeWidth?: number;
		/** hard ink drop shadow, px (0 = off) */
		shadow?: number;
		/** static rotation (deg) and extra spin per morph (deg, e.g. 360) */
		angle?: number;
		spin?: number;
		/** 0–1: bulge during the morph + wobble on landing (needs keys / span / frames) */
		squash?: number;
		/** ghost copies behind the moving shape (0–4), only outside its silhouette — more pixels change while it morphs */
		trail?: number;
		/** ring + sparks on every landing and on the pop-in (true = in the fill colour, or a colour) */
		burst?: boolean | string;
		/** 0–1: float / breathe / sway all the time, so a held shape is never a still (standard: nothing static > 2 s) */
		idle?: number;
		/** seconds [in, out]: pop in at `in`, fade out by `out` (default: always visible) */
		show?: [number, number];
		opacity?: number;
		style?: React.CSSProperties;
	};

const popIn = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2));
const shade = (c: string, k: number) => interpolateColors(Math.abs(k), [0, 1], [c, k > 0 ? '#ffffff' : '#000000']); // light / shade of the fill
const easeOut3 = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const BURST_S = 0.42;

/** hook form: path d (box units) + phase + colour for custom drawing (maps, masks, clip paths) */
export const useMorph = (p: Pick<MorphProps, 'shapes' | 'from' | 'to' | 'fill'> & MorphTiming & MorphOptions) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const list = p.shapes ?? [p.from ?? 'circle', p.to ?? p.from ?? 'circle'];
	const ph = morphPhase(frame / fps, list.length, p, fps);
	const opts = {points: p.points, mode: p.mode, fit: p.fit};
	const A = list[ph.i], B = list[Math.min(list.length - 1, ph.i + 1)];
	const d = list.length < 2 ? shapeInfo(A, p.fit ?? true).d : morphD(A, B, ph.e, opts);
	const fa = at(p.fill, ph.i, shapeInfo(A, p.fit ?? true).fill), fb = at(p.fill, ph.i + 1, shapeInfo(B, p.fit ?? true).fill);
	const fill = fa === 'none' || fb === 'none' ? 'none' : mixColor(fa, fb, ph.e);
	return {d, phase: ph, fill, list, A, B, opts, t: frame / fps};
};

/** where and how big the shape is at this frame (shared by Morph and MorphMask, so a mask's outline sits exactly on it) */
const morphPose = (p: MorphProps, phase: MorphPhase, t: number) => {
	const pos = (v: PerShape<number> | undefined, dflt: number) => mix(at(v, phase.i, dflt), at(v, phase.i + 1, dflt), phase.e);
	const {angle = 0, spin = 0, squash = 0.6, idle = 0} = p;
	let vis = 1, pop = 1;
	if (p.show) {
		if (t < p.show[0] - 0.01 || t > p.show[1] + 0.01) return null;
		pop = popIn((t - p.show[0]) / 0.32);
		vis = clamp01((t - p.show[0]) / 0.08) * clamp01((p.show[1] - t) / 0.15);
	}
	// bulge in the middle of a morph, damped wobble after a landing, idle float / breathe / sway
	const bulge = squash * 0.07 * Math.sin(Math.PI * phase.e) * (phase.moving ? 1 : 0);
	const wob = phase.since !== null && phase.since < 0.5 ? squash * 0.1 * Math.exp(-8 * phase.since) * Math.sin(phase.since * 26) : 0;
	const breathe = idle * 0.03 * Math.sin(2 * Math.PI * 1.1 * t + 0.4);
	const size = Math.max(1, pos(p.size, 600)); // size 0 = «not there yet» (reveals start from a point)
	return {
		x: pos(p.x, 540),
		y: pos(p.y, 860) + idle * size * 0.017 * Math.sin(2 * Math.PI * 0.8 * t),
		size,
		sc: pop * (1 + bulge + wob + breathe),
		rot: angle + spin * (phase.i + phase.e) + idle * 3 * Math.sin(2 * Math.PI * 0.55 * t + 1.3),
		vis: vis * (p.opacity ?? 1),
		pop,
	};
};

/** seconds since the latest landing or pop-in (for burst), null when none is recent */
const burstAge = (p: MorphProps, phase: MorphPhase, t: number) => {
	const ages = [phase.since, p.show ? t - p.show[0] : null].filter((a): a is number => a !== null && a >= 0 && a < BURST_S);
	return ages.length ? Math.min(...ages) : null;
};

/** morph between shapes; see the file header for timing and the geometry */
export const Morph: React.FC<MorphProps> = (p) => {
	const {d, phase, fill, A, B, opts, t} = useMorph(p);
	const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const pose = morphPose(p, phase, t);
	if (!pose) return null;
	const {x, y, size, sc, rot, vis, pop} = pose;
	const {stroke = PAL.ink, strokeWidth = 10, shadow = 10, angle = 0, spin = 0, trail = 0, shine = true} = p;
	const unit = 200 / size; // px → box units
	const pad = 0.35; // the svg is larger than the box: bulge, outline and shadow never clip
	const W = size * (1 + 2 * pad);
	const idleRot = rot - angle - spin * (phase.i + phase.e);
	const ghosts = phase.moving && trail > 0 ? Array.from({length: Math.min(4, Math.round(trail))}, (_, g) => g + 1) : [];
	const paint = fill === 'none' ? 'none' : shine ? `url(#mg${uid})` : fill;
	const age = p.burst ? burstAge(p, phase, t) : null;
	const bColor = typeof p.burst === 'string' ? p.burst : fill === 'none' ? (p.stroke ?? '#fff') : fill;
	return (
		<svg
			width={W}
			height={W}
			viewBox={`${-100 * (1 + 2 * pad)} ${-100 * (1 + 2 * pad)} ${200 * (1 + 2 * pad)} ${200 * (1 + 2 * pad)}`}
			style={{position: 'absolute', left: x - W / 2, top: y - W / 2, overflow: 'visible', opacity: vis, ...p.style}}
		>
			<defs>
				{shine && fill !== 'none' ? (
					<linearGradient id={`mg${uid}`} x1="0" y1="0" x2="0.35" y2="1">
						<stop offset="0%" stopColor={shade(fill, 0.32)} />
						<stop offset="55%" stopColor={fill} />
						<stop offset="100%" stopColor={shade(fill, -0.22)} />
					</linearGradient>
				) : null}
				{ghosts.length ? (
					// ghosts only OUTSIDE the current silhouette (holes ignored): no old shape shows through the pin's eye
					<mask id={`mk${uid}`} maskUnits="userSpaceOnUse" x={-400} y={-400} width={800} height={800}>
						<rect x={-400} y={-400} width={800} height={800} fill="#fff" />
						<path d={ringsToD(morphRings(prepareMorph(A, B, opts), phase.e).filter((r) => r.solid))} transform={`rotate(${rot}) scale(${sc})`} fill="#000" />
					</mask>
				) : null}
			</defs>
			{age !== null ? <Burst age={age} color={bColor} unit={unit} pop={pop} /> : null}
			{ghosts.length ? (
				<g mask={`url(#mk${uid})`}>
					{ghosts.map((g) => {
						const e = Math.max(0, phase.e - g * 0.13);
						return (
							<path
								key={g}
								d={morphD(A, B, e, opts)}
								transform={`rotate(${angle + spin * (phase.i + e) + idleRot}) scale(${sc})`}
								fill={fill === 'none' ? 'none' : fill}
								stroke={fill === 'none' ? (p.stroke ?? '#fff') : 'none'}
								strokeWidth={strokeWidth * unit}
								opacity={0.36 / g}
							/>
						);
					})}
				</g>
			) : null}
			<g transform={`rotate(${rot}) scale(${sc})`} style={shadow ? {filter: `drop-shadow(0 ${shadow}px 0 ${PAL.ink})`} : undefined}>
				<path d={d} fill={paint} fillRule="nonzero" stroke={strokeWidth > 0 ? stroke : 'none'} strokeWidth={strokeWidth * unit} strokeLinejoin="round" paintOrder="stroke" />
			</g>
		</svg>
	);
};

/** landing burst (box units): a thin ring racing out + 12 sparks, 0.42 s, ink-edged like the rest of the drawn kit */
const Burst: React.FC<{age: number; color: string; unit: number; pop: number}> = ({age, color, unit, pop}) => {
	const x = clamp01(age / BURST_S), k = easeOut3(x);
	const r = (70 + 92 * k) * pop;
	return (
		<g opacity={1 - x * x}>
			<circle r={r} fill="none" stroke={PAL.ink} strokeWidth={(16 * (1 - x) + 4) * unit} />
			<circle r={r} fill="none" stroke={color} strokeWidth={14 * (1 - x) * unit} />
			{Array.from({length: 12}, (_, i) => {
				const a = ((i * 30 + (i % 2) * 12) * Math.PI) / 180;
				const r1 = (84 + 70 * k) * pop, r2 = r1 + (12 + 30 * (1 - x)) * (i % 2 ? 0.7 : 1);
				return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke={color} strokeWidth={10 * (1 - x) * unit + 1} strokeLinecap="round" />;
			})}
		</g>
	);
};

/** box-unit path → frame px path (centre x, y, box size, rotation deg) — for CSS clip-path: path(), which takes px only */
export const placePath = (d: string, x: number, y: number, size: number, rotDeg = 0) => {
	const s = size / 200, c = Math.cos((rotDeg * Math.PI) / 180), n = Math.sin((rotDeg * Math.PI) / 180);
	const T = (px: number, py: number): [number, number] => [Math.round((x + (px * c - py * n) * s) * 10) / 10, Math.round((y + (px * n + py * c) * s) * 10) / 10];
	return reduceInstructions(parsePath(d))
		.map((i) => {
			if (i.type === 'Z') return 'Z';
			if (i.type === 'C') {
				const [a, b] = T(i.cp1x, i.cp1y), [cc, dd] = T(i.cp2x, i.cp2y), [e, f] = T(i.x, i.y);
				return `C${a} ${b} ${cc} ${dd} ${e} ${f}`;
			}
			const [e, f] = T(i.x, i.y);
			return `${i.type}${e} ${f}`;
		})
		.join('');
};

/**
 * Anything clipped to the morphing shape — an archive photo inside the coin that becomes the pin that becomes the island, or a
 * reveal (size: [200, 2600] grows the shape over the frame). Children are laid out full frame (1080 × 1920). Same timing and
 * pose props as <Morph> (x / y / size / spin / squash / idle / show); `strokeWidth` > 0 adds the outline on top.
 */
export const MorphMask: React.FC<Omit<MorphProps, 'fill' | 'shine' | 'trail' | 'burst'> & {children: React.ReactNode}> = ({children, ...p}) => {
	const {d, phase, t} = useMorph(p);
	const pose = morphPose(p, phase, t);
	if (!pose) return null;
	const clip = `path('${placePath(d, pose.x, pose.y, pose.size * pose.sc, pose.rot)}')`;
	return (
		<>
			<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, clipPath: clip, WebkitClipPath: clip, opacity: pose.vis}}>{children}</div>
			{(p.strokeWidth ?? 10) > 0 ? <Morph {...p} fill="none" stroke={p.stroke ?? PAL.ink} shadow={0} trail={0} burst={false} /> : null}
		</>
	);
};

/** just the morphing <path> (box units) for use inside your own <svg> / <g transform> — maps, masks, clip paths */
type PathRest = Omit<React.SVGProps<SVGPathElement>, 'd' | 'fill' | 'from' | 'to' | 'points' | 'mode' | 'ref'>;
export const MorphPath: React.FC<Pick<MorphProps, 'shapes' | 'from' | 'to' | 'fill'> & MorphTiming & MorphOptions & PathRest> = ({shapes, from, to, fill, progress, keys, span, fromFrame, toFrame, morph, ease, points, mode, fit, ...rest}) => {
	const m = useMorph({shapes, from, to, fill, progress, keys, span, fromFrame, toFrame, morph, ease, points, mode, fit});
	return <path d={m.d} fill={m.fill} fillRule="nonzero" {...rest} />;
};
