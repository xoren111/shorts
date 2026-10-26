import React, {useId} from 'react';
import {INK, clamp01, lerp} from './gfx';
import {SKIN, SKIN_D} from './draw';
import {HandG, MILK, mix} from './milk_a';

// milk-carton — the POINTING HAND (owner 26.10: «пальцы на первых кадрах отрисованы плохо»). The old pointing hands of scenes_1
// were stacked outlined tubes (a sausage index with joint segments, three separate sticks for the curled fingers, a tube thumb) and
// read as a wooden puppet. Here a hand is ONE silhouette: palm, index and the three curled fingers are separate paths, but they are
// drawn in two passes (all ink outlines first, then all skin fills), so their union shows a single smooth contour with no seam
// between the parts; only the inner details (creases between the knuckle rolls, the thumb that lies on top, the nail) carry their
// own lines. Same style as kit A: flat fills, INK contour, one darker skin tone for depth, a soft white highlight.
//
//   PointHandG   the classic cartoon pointing hand (☝), the hand's plane facing the camera: the index straight out of the palm, the
//                middle, ring and little finger curled into the palm as three rounded knuckle rolls (fingertips tucked, crease
//                lines), the thumb lying across them. kind 'kid' (her: child proportions — short, chubby fingers — her teal striped
//                sleeve) or 'man' (the stepdad: kit A's shirt cuff + gold watch + coat sleeve, re-used from milk_a HandG).
//   ManGripPointG  the stepdad's hand holding the carton's right edge in profile (kit A HandG 'grab' geometry, same palm contact
//                point HAND_GRIP) with the index out of the grip toward a target: same finger / palm vocabulary, the three other
//                fingers stay behind the carton (ManGripBackG draws them), so the grip never changes.
//   ManGripBackG  the four fingers of that grip BEHIND the carton (kit A 'grab' layout — roots, phalanx lengths, joint bends, fan —
//                but smooth round-tipped fingers with soft joints instead of the kit's straight tube slabs with a dark square tip).
//   ManCartonGripG  drop-in for kit A MilkCarton's `hand` (same at / rot / scale placement, carton units): part 'back' before the
//                carton, part 'front' after it; used by scenes_1 for every shot of his carton (Hook, ManCan, Famous, IsThatMe).
//
// Units: kit A hand units — wrist at (0, 0), fingers up (−y). 'man' = scale 1 (kit man), 'kid' = drawn at the kit's kid scale 0.6.
// PointHandG unmirrored: the index on the −x side, the curled fingers (the fist) on the +x side, so rotated by dir + 90 with the
// mirror chosen by the pointing direction the fist always sits UNDER the finger (scenes_1 handSide).

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const f1 = (n: number) => n.toFixed(1);
const pt = (p: P2) => `${f1(p[0])},${f1(p[1])}`;

// ───────────────────────────── finger outline ─────────────────────────────

export type FingerOpts = {
	/** 0..1 fingertip pressed on a surface: the tip flattens and widens, the finger shortens a little */
	tap?: number;
	/** total turn of the centre line along the finger, deg (+ = toward +n, the pad side): a finger is never a ruler */
	curl?: number;
	/** pad bulge on the +n side near the tip (fraction of the tip width) */
	pad?: number;
	/** knuckle bump on the −n side near the root (units) */
	knuckle?: number;
	/** 0..1 how far along the shank the root width has narrowed to the tip width */
	neck?: number;
	/** open = no closing segment across the root (outline of a part lying ON the palm, e.g. the thumb) */
	open?: boolean;
	/** open outline only: the side lines start this far (0..1 of the shank) from the root */
	from?: number;
	/** smooth joint bends on top of curl: at = position along the finger (0..1 of its length), deg = turn (+ = toward +n), w = how
	 *  long the bend is (0..1 of the length, default 0.2) — a knuckled finger whose segments still flow into each other */
	joints?: {at: number; deg: number; w?: number}[];
};
const smooth = (x: number) => {
	const k = clamp01(x);
	return k * k * (3 - 2 * k);
};
const hump = (x: number, c: number, d: number) => {
	const u = (x - c + d / 2) / d;
	return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
};
/** Catmull-Rom through pts as cubic segments (the path is already at pts[0]) */
const crSegs = (pts: P2[]) => {
	let d = '';
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(pts.length - 1, i + 2)];
		const c1: P2 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
		const c2: P2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
		d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
	}
	return d;
};
type FingerGeo = {L: number; r: number; fwd: number; cl: P2[]; dirs: number[]; left: P2[]; right: P2[]; endA: number};
const fingerGeo = (base: P2, ang: number, len: number, w0: number, w1: number, o: FingerOpts): FingerGeo => {
	const tap = clamp01(o.tap ?? 0);
	const curl = o.curl ?? 0;
	const L = len * (1 - 0.05 * tap);
	const r = (w1 / 2) * (1 + 0.14 * tap);
	const fwd = Math.min(r * (1.06 - 0.38 * tap), L * 0.45);
	const sc = L - fwd;
	const J = o.joints ?? [];
	const N = J.length ? 24 : 12;
	const ds = sc / N;
	const angAt = (sAt: number) => ang + (curl * sAt) / L + J.reduce((acc, j) => acc + j.deg * smooth((sAt / L - j.at) / (j.w ?? 0.2) + 0.5), 0);
	const cl: P2[] = [[base[0], base[1]]];
	const dirs: number[] = [rad(angAt(0))];
	for (let i = 1; i <= N; i++) {
		const am = rad(angAt((i - 0.5) * ds));
		const p = cl[i - 1];
		cl.push([p[0] + Math.cos(am) * ds, p[1] + Math.sin(am) * ds]);
		dirs.push(rad(angAt(i * ds)));
	}
	const neck = o.neck ?? 0.5;
	const pad = (o.pad ?? 0.05) * w1 * (1 + 1.6 * tap);
	const kn = o.knuckle ?? 0;
	const left: P2[] = [];
	const right: P2[] = [];
	cl.forEach((p, i) => {
		const x = i / N;
		const h = lerp(w0 / 2, r, smooth(x / neck));
		const a = dirs[i];
		const n: P2 = [-Math.sin(a), Math.cos(a)];
		const hl = h + pad * hump(x, 0.84, 0.4);
		const hr = h + kn * hump(x, 0.1, 0.34);
		left.push([p[0] + n[0] * hl, p[1] + n[1] * hl]);
		right.push([p[0] - n[0] * hr, p[1] - n[1] * hr]);
	});
	return {L, r, fwd, cl, dirs, left, right, endA: dirs[N]};
};
/** a smooth finger: from base (centre of its root, hidden in the palm) along angle ang (deg) for len, root width w0, tip width w1,
 *  round tip (quarter ellipses, squashed by tap). +n = the left normal of the direction (for ang −90: +x) = the pad side */
export const fingerPath = (base: P2, ang: number, len: number, w0: number, w1: number, o: FingerOpts = {}): string => {
	const g = fingerGeo(base, ang, len, w0, w1, o);
	const N = g.cl.length - 1;
	const i0 = o.open ? Math.round(clamp01(o.from ?? 0) * N) : 0;
	const a = g.endA;
	const u: P2 = [Math.cos(a), Math.sin(a)];
	const n: P2 = [-u[1], u[0]];
	const C = g.cl[N];
	const k = 0.5523;
	const Q = (s: number, q: number): P2 => [C[0] + u[0] * s + n[0] * q, C[1] + u[1] * s + n[1] * q];
	const lEnd = g.left[N];
	const rEnd = g.right[N];
	const rl = Math.hypot(lEnd[0] - C[0], lEnd[1] - C[1]);
	const rr = Math.hypot(rEnd[0] - C[0], rEnd[1] - C[1]);
	const left = g.left.slice(i0);
	const right = g.right.slice(i0).reverse();
	let d = `M${pt(left[0])}` + crSegs(left);
	d += ` C${pt(Q(g.fwd * k, rl))} ${pt(Q(g.fwd, rl * k))} ${pt(Q(g.fwd, 0))}`;
	d += ` C${pt(Q(g.fwd, -rr * k))} ${pt(Q(g.fwd * k, -rr))} ${pt(rEnd)}`;
	d += crSegs(right);
	return d + (o.open ? '' : ' Z');
};
/** a point near the tip of a finger (back = distance from the tip along the centre line, q across, + = pad side) */
const fingerPt = (base: P2, ang: number, len: number, back: number, q: number, o: FingerOpts = {}): P2 => {
	const g = fingerGeo(base, ang, len, 10, 10, o);
	const N = g.cl.length - 1;
	const sc = g.L - g.fwd;
	const s = g.L - back;
	if (s >= sc) {
		const a = g.endA;
		const C = g.cl[N];
		return [C[0] + Math.cos(a) * (s - sc) - Math.sin(a) * q, C[1] + Math.sin(a) * (s - sc) + Math.cos(a) * q];
	}
	const i = Math.max(0, Math.min(N, Math.round((s / sc) * N)));
	const a = g.dirs[i];
	return [g.cl[i][0] - Math.sin(a) * q, g.cl[i][1] + Math.cos(a) * q];
};

/** two-pass union: every part's ink (fill + 2·lw stroke) first, then every part's colour → one contour, no seams */
type Part = {d: string; c: string};
const InkPass: React.FC<{parts: Part[]; L: number}> = ({parts, L}) => (
	<g fill={INK} stroke={INK} strokeWidth={L * 2} strokeLinejoin="round" strokeLinecap="round">
		{parts.map((p, i) => (
			<path key={i} d={p.d} />
		))}
	</g>
);
const FillPass: React.FC<{parts: Part[]}> = ({parts}) => (
	<g>
		{parts.map((p, i) => (
			<path key={i} d={p.d} fill={p.c} />
		))}
	</g>
);

/** a nail on a finger: a lighter rounded plate near the tip on the −n side, with a white glint */
const Nail: React.FC<{base: P2; ang: number; len: number; w: number; o?: FingerOpts; skin: string; skinD: string; L: number; side?: 1 | -1; k?: number}> = ({
	base,
	ang,
	len,
	w,
	o = {},
	skin,
	skinD,
	L,
	side = -1,
	k = 1,
}) => {
	const r = (w / 2) * (1 + 0.14 * clamp01(o.tap ?? 0));
	const g0 = fingerGeo(base, ang, len, w, w, o);
	const a = (g0.endA * 180) / Math.PI;
	// side −1 = the −n (back) side: q < 0
	const c = fingerPt(base, ang, len, r * 1.0, side * r * 0.42, o);
	const gl = fingerPt(base, ang, len, r * 1.16, side * r * 0.6, o);
	return (
		<g opacity={k}>
			<ellipse cx={c[0]} cy={c[1]} rx={r * 0.6} ry={r * 0.36} fill={mix(skin, '#FFFFFF', 0.42)} stroke={skinD} strokeWidth={L * 0.55} transform={`rotate(${f1(a)} ${f1(c[0])} ${f1(c[1])})`} />
			<ellipse cx={gl[0]} cy={gl[1]} rx={r * 0.24} ry={r * 0.1} fill="#FFFFFF" opacity={0.85} transform={`rotate(${f1(a)} ${f1(gl[0])} ${f1(gl[1])})`} />
		</g>
	);
};

// ───────────────────────────── PointHandG (☝, hand plane toward the camera) ─────────────────────────────

export type PointKind = 'kid' | 'man';
type Roll = {x: number; top: number; w: number; len: number};
type Geo = {
	ks: number;
	skin: string;
	skinD: string;
	/** wrist half width */
	hw: number;
	/** knuckle line (index root) y */
	kn: number;
	/** index: centre x, width at the root, visible length above the knuckle line */
	ix: number;
	iw: number;
	il: number;
	/** curled middle, ring, little finger (seen as rolls: x centre, top of the bend, width, length down to the tucked tip) */
	rolls: Roll[];
	/** thumb: root, tip, root width, tip width */
	th: {b: P2; t: P2; w0: number; w1: number};
	/** sleeve start (kid) below the wrist */
	sleeve: number;
};
const ROOT = 34; // the index path starts this far below the knuckle line (inside the palm)
const GEO: Record<PointKind, Geo> = {
	man: {
		ks: 1,
		skin: '#EDB68E', // kit A KIND.man
		skinD: '#C98B66',
		hw: 42,
		kn: -168,
		ix: -24,
		iw: 37,
		il: 146,
		rolls: [
			{x: 9, top: -178, w: 35, len: 74},
			{x: 40, top: -170, w: 34, len: 70},
			{x: 68, top: -153, w: 31, len: 62},
		],
		th: {b: [-22, -40], t: [40, -108], w0: 58, w1: 44},
		sleeve: 9999,
	},
	kid: {
		ks: 0.6, // kit A KIND.kid
		skin: SKIN,
		skinD: SKIN_D,
		hw: 40,
		kn: -148,
		ix: -21,
		iw: 41,
		il: 118,
		rolls: [
			{x: 14, top: -159, w: 38, len: 68},
			{x: 47, top: -150, w: 36, len: 64},
			{x: 76, top: -132, w: 33, len: 56},
		],
		th: {b: [-20, -34], t: [36, -96], w0: 56, w1: 45},
		sleeve: 286,
	},
};
export const pointHandScale = (kind: PointKind = 'kid') => GEO[kind].ks;
/** wrist width (outer units, after the kind scale) — scenes match the forearm they attach to it */
export const pointHandWrist = (kind: PointKind = 'kid') => GEO[kind].hw * 2 * GEO[kind].ks;
const INDEX_O = (tap: number): FingerOpts => ({tap, pad: 0.07, knuckle: 0, neck: 0.55, curl: 0});
/** the index fingertip (outer units: after the kind scale, unmirrored, bend 0) — aim the hand with it */
export const pointHandTip = (kind: PointKind = 'kid', tap = 0): P2 => {
	const g = GEO[kind];
	const len = (g.il + ROOT) * (1 - 0.05 * clamp01(tap));
	return [g.ix * g.ks, (g.kn + ROOT - len) * g.ks];
};

const palmPath = (g: Geo) => {
	const {hw, kn, ix, iw} = g;
	const il = ix - iw / 2;
	const R = g.rolls;
	const pr = R[2];
	const px = pr.x + pr.w / 2 - 1;
	const top = R[1].top + 30;
	return [
		`M${-hw},0`,
		// index side: thenar bulge, a slight waist, the index knuckle
		`C${-hw - 3},${f1(kn * 0.12)} ${-hw - 8},${f1(kn * 0.22)} ${-hw - 7},${f1(kn * 0.33)}`,
		`C${-hw - 6},${f1(kn * 0.45)} ${-hw - 3},${f1(kn * 0.55)} ${-hw - 3},${f1(kn * 0.64)}`,
		`C${-hw - 3},${f1(kn * 0.76)} ${f1(il - 2)},${kn + 44} ${f1(il + 2)},${kn + 18}`,
		// across under the index and the rolls (covered by them)
		`L${ix},${top} L${f1(px - 6)},${top}`,
		// little-finger side down to the wrist
		`L${f1(px)},${f1(pr.top + pr.len * 0.5)}`,
		`C${f1(px + 3)},${f1(pr.top + pr.len + 6)} ${hw + 11},${f1(kn * 0.32)} ${hw + 4},${f1(kn * 0.12)}`,
		`C${hw + 1},${-6} ${hw},${-3} ${hw},0`,
		// round wrist cap: the hand fits on any forearm end whatever the wrist bend
		`C${hw},${f1(hw * 0.56)} ${f1(hw * 0.56)},${hw} 0,${hw} C${f1(-hw * 0.56)},${hw} ${-hw},${f1(hw * 0.56)} ${-hw},0 Z`,
	].join(' ');
};
const forearmPath = (g: Geo, end: number) => {
	const w2 = g.hw + Math.min(10, end * 0.03);
	return `M${-g.hw},0 L${g.hw},0 L${f1(w2)},${f1(end)} L${f1(-w2)},${f1(end)} Z`;
};

export type PointHandProps = {
	kind?: PointKind;
	/** 0..1 the fingertip presses (squash) */
	tap?: number;
	/** true / −1 = mirrored (fist on −x); a number −1…1 squashes through 0 (the wrist turning) */
	mirror?: boolean | number;
	/** forearm drawn below the wrist (hand units of the kind, before its scale): 0 = only the wrist cap (the scene draws the arm).
	 *  kid: beyond 286 her teal striped sleeve; man: kit A shirt cuff + gold watch + coat sleeve */
	arm?: number;
	/** watch hands / glint (man) */
	t?: number;
	glint?: number;
	/** 'all' | the passes separately, so a scene can merge its own forearm into the silhouette: 'ink' → (its forearm ink) →
	 *  'fill' → (its forearm fill) → 'top' */
	layer?: 'all' | 'ink' | 'fill' | 'top';
	lw: number;
};

export const PointHandG: React.FC<PointHandProps> = ({kind = 'kid', tap = 0, mirror, arm = 0, t = 0, glint = 0, layer = 'all', lw}) => {
	const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const g = GEO[kind];
	const L = lw / g.ks;
	const tp = clamp01(tap);
	const sx = typeof mirror === 'number' ? mirror : mirror ? -1 : 1;
	const iBase: P2 = [g.ix, g.kn + ROOT];
	const iAng = -90;
	const iLen = g.il + ROOT;
	const iO = INDEX_O(tp);
	const shade = [0.2, 0.3, 0.4];
	const rollD = (r: Roll) => fingerPath([r.x, r.top + r.len], -90, r.len, r.w, r.w, {neck: 0.4, pad: 0});
	const kidArm = kind === 'kid' && arm > 0;
	const armEnd = kidArm ? Math.min(arm, g.sleeve + 30) : 0;
	const parts: Part[] = [
		...(kidArm ? [{d: forearmPath(g, armEnd), c: g.skin}] : []),
		{d: palmPath(g), c: g.skin},
		...g.rolls.map((r, i) => ({d: rollD(r), c: mix(g.skin, g.skinD, shade[i])})),
		{d: fingerPath(iBase, iAng, iLen, g.iw, g.iw * 0.9, iO), c: g.skin},
	];
	// ---- details on top
	const R = g.rolls;
	const crease = (x: number, y0: number, y1: number, k = 1) => (
		<path d={`M${f1(x)},${f1(y0)} Q${f1(x + 2)},${f1((y0 + y1) / 2)} ${f1(x - 1)},${f1(y1)}`} stroke={INK} strokeWidth={L * 0.8 * k} fill="none" strokeLinecap="round" />
	);
	const valley = (a: Roll, b: Roll) => {
		const x = (a.x + a.w / 2 + b.x - b.w / 2) / 2;
		const y = Math.max(a.top, b.top) + Math.min(a.w, b.w) * 0.42;
		return {x, y};
	};
	const v0 = {x: (g.ix + g.iw / 2 + R[0].x - R[0].w / 2) / 2, y: R[0].top + R[0].w * 0.62};
	const v1 = valley(R[0], R[1]);
	const v2 = valley(R[1], R[2]);
	// thumb (on top): fill closed, outline open at the root (it grows out of the palm, no line across its base)
	const thA = (Math.atan2(g.th.t[1] - g.th.b[1], g.th.t[0] - g.th.b[0]) * 180) / Math.PI;
	const thL = Math.hypot(g.th.t[0] - g.th.b[0], g.th.t[1] - g.th.b[1]);
	const thO: FingerOpts = {pad: 0.06, neck: 0.6, curl: -8};
	const thumb = (
		<g>
			<path d={fingerPath(g.th.b, thA, thL, g.th.w0, g.th.w1, thO)} fill={g.skin} />
			<path d={fingerPath(g.th.b, thA, thL, g.th.w0, g.th.w1, {...thO, open: true, from: 0.26})} fill="none" stroke={INK} strokeWidth={L} strokeLinecap="round" strokeLinejoin="round" />
			<Nail base={g.th.b} ang={thA} len={thL} w={g.th.w1} o={thO} skin={g.skin} skinD={g.skinD} L={L} side={-1} />
		</g>
	);
	const hl = fingerPt(iBase, iAng, iLen, g.iw * 1.9, -g.iw * 0.2, iO);
	const hl2 = fingerPt(iBase, iAng, iLen, iLen * 0.62, -g.iw * 0.2, iO);
	const top = (
		<g>
			{/* creases: index | middle | ring | little — the valleys between the knuckle rolls run down into the palm */}
			{crease(v0.x, v0.y, v0.y + 14, 0.9)}
			{crease(v1.x, v1.y, v1.y + 30)}
			{crease(v2.x, v2.y, v2.y + 26)}
			{/* the tucked fingertips: short arcs where each roll meets the palm */}
			{R.map((r, i) => (
				<path
					key={i}
					d={`M${f1(r.x - r.w * 0.42)},${f1(r.top + r.len - r.w * 0.3)} Q${f1(r.x)},${f1(r.top + r.len + r.w * 0.12)} ${f1(r.x + r.w * 0.42)},${f1(r.top + r.len - r.w * 0.3)}`}
					stroke={INK}
					strokeWidth={L * 0.7}
					fill="none"
					strokeLinecap="round"
				/>
			))}
			{/* light on the top of each roll */}
			{R.map((r, i) => (
				<path
					key={`h${i}`}
					d={`M${f1(r.x - r.w * 0.22)},${f1(r.top + r.w * 0.34)} Q${f1(r.x)},${f1(r.top + r.w * 0.2)} ${f1(r.x + r.w * 0.2)},${f1(r.top + r.w * 0.34)}`}
					stroke="#FFFFFF"
					strokeWidth={r.w * 0.16}
					opacity={0.4}
					fill="none"
					strokeLinecap="round"
				/>
			))}
			{thumb}
			{/* index: soft highlight along its outer side + the nail */}
			<path d={`M${pt(hl2)} L${pt(hl)}`} stroke="#FFFFFF" strokeWidth={g.iw * 0.17} opacity={0.38} strokeLinecap="round" />
			<Nail base={iBase} ang={iAng} len={iLen} w={g.iw * 0.9} o={iO} skin={g.skin} skinD={g.skinD} L={L} side={-1} />
			{/* back of the hand: a soft light on the index side */}
			<path d={`M${f1(-g.hw + 12)},${f1(g.kn * 0.08)} Q${f1(-g.hw + 2)},${f1(g.kn * 0.3)} ${f1(-g.hw + 6)},${f1(g.kn * 0.5)}`} stroke="#FFFFFF" strokeWidth={9} opacity={0.24} fill="none" strokeLinecap="round" />
		</g>
	);
	// ---- sleeves
	const hw = g.hw;
	const slD = `M${-hw - 12},${g.sleeve} Q0,${g.sleeve - 14} ${hw + 12},${g.sleeve} L${hw + 30},${arm} L${-hw - 30},${arm} Z`;
	const kidSleeve =
		kind === 'kid' && arm > g.sleeve + 4 ? (
			<g>
				<defs>
					<clipPath id={`${id}sl`}>
						<path d={slD} />
					</clipPath>
				</defs>
				<path d={slD} fill={MILK.shirt} />
				<g clipPath={`url(#${id}sl)`}>
					{Array.from({length: Math.ceil((arm - g.sleeve) / 46)}, (_, i) => (
						<rect key={i} x={-hw - 40} y={g.sleeve + 16 + i * 46} width={hw * 2 + 80} height={20} fill={MILK.stripe} />
					))}
					<path d={`M${-hw - 40},${g.sleeve + 4} Q0,${g.sleeve - 10} ${hw + 40},${g.sleeve + 4}`} stroke={MILK.shirtD} strokeWidth={L * 1.6} fill="none" />
				</g>
				<path d={`M${-hw - 30},${arm} L${-hw - 12},${g.sleeve} Q0,${g.sleeve - 14} ${hw + 12},${g.sleeve} L${hw + 30},${arm}`} fill="none" stroke={INK} strokeWidth={L} strokeLinejoin="round" />
			</g>
		) : null;
	// man: kit A's own sleeve (forearm, shirt cuff, coat, gold watch) — HandG clipped to below the wrist; the watch is drawn again
	// over the hand's wrist cap (second clip = strap + dial + crown)
	const man = kind === 'man' && arm > 0;
	const body =
		layer === 'ink' ? (
			<InkPass parts={parts} L={L} />
		) : layer === 'fill' ? (
			<FillPass parts={parts} />
		) : layer === 'top' ? (
			<>
				{kidSleeve}
				{top}
			</>
		) : (
			<>
				{man ? <ManSleeve id={id} pass="under" arm={arm} t={t} glint={glint} lw={L} /> : null}
				<InkPass parts={parts} L={L} />
				<FillPass parts={parts} />
				{kidSleeve}
				{top}
				{man ? <ManSleeve id={id} pass="watch" arm={arm} t={t} glint={0} lw={L} /> : null}
			</>
		);
	return <g transform={`scale(${(g.ks * sx).toFixed(4)} ${g.ks})`}>{body}</g>;
};

/** kit A man sleeve (forearm, shirt cuff, coat, gold watch at y 36) through a clip: 'under' = everything below the wrist cap
 *  (y ≥ 8), 'watch' = only strap + dial + crown, drawn again over the hand's wrist cap (kit A man units, scale 1) */
const ManSleeve: React.FC<{id: string; pass: 'under' | 'watch'; arm: number; t: number; glint: number; lw: number; gesture?: 'point' | 'grab'}> = ({id, pass, arm, t, glint, lw, gesture = 'point'}) => {
	const hw = GEO.man.hw;
	const L = lw;
	const cid = `${id}${pass}`;
	return (
		<g>
			<defs>
				<clipPath id={cid}>
					{pass === 'under' ? (
						<rect x={-400} y={8} width={800} height={arm + 400} />
					) : (
						<>
							<rect x={-hw - 5 - L} y={16 - L} width={hw * 2 + 10 + L * 2} height={40 + L * 2} />
							<circle cx={-4} cy={36} r={33 + L} />
							<rect x={24 - L} y={28 - L} width={15 + L * 2} height={16 + L * 2} />
						</>
					)}
				</clipPath>
			</defs>
			<g clipPath={`url(#${cid})`}>
				<HandG kind="man" gesture={gesture} part="front" arm={arm} t={t} glint={glint} lw={lw} />
			</g>
		</g>
	);
};

// ───────────────────────────── ManGripPointG (profile grip on the carton edge, index out) ─────────────────────────────

const MAN = GEO.man;
/** palm in profile (kit A man hand units: dorsal side −x, palm side +x toward the held object; HAND_GRIP (48, −104) on its palm
 *  side), round wrist cap */
const GRIP_PALM =
	'M-40,0 C-46,-52 -50,-120 -42,-164 Q-34,-186 -8,-186 Q18,-186 30,-168 Q50,-140 54,-96 Q56,-46 42,-10 L42,0 C42,24 22,42 0,42 C-22,42 -40,24 -40,0 Z';
/** the index root in the grip: the top front knuckle of the profile palm */
export const GRIP_INDEX_ROOT: P2 = [12, -158];
/** longest index of the grip hand (from GRIP_INDEX_ROOT; ≈ 0.9 of the palm, wrist → knuckle 186) */
export const GRIP_INDEX_MAX = 170;
const GRIP_CURL = 12;
export type ManGripPointProps = {
	/** where the fingertip goes (hand units, unmirrored kit frame) */
	aim: P2;
	/** 0..1 the index comes out of the fist (0 = tucked in, nothing drawn) */
	k: number;
	/** 0..1 the pad hovers a notch off the target → touches it */
	touch: number;
	/** 0..1 press squash */
	tap: number;
	arm?: number;
	t?: number;
	glint?: number;
	lw: number;
};
/** the FRONT part of the stepdad's carton grip (kit A HandG 'grab' front replaced: his sleeve, cuff and watch are kit A's), drawn in
 *  the same kit frame and the same transform as HandG; the three other fingers stay behind the carton (HandG part 'back') */
export const ManGripPointG: React.FC<ManGripPointProps> = ({aim, k, touch, tap, arm = 1700, t = 0, glint = 0, lw}) => {
	const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const L = lw;
	const ik = clamp01(k);
	const tp = clamp01(tap);
	const b = GRIP_INDEX_ROOT;
	const D = Math.hypot(aim[0] - b[0], aim[1] - b[1]);
	// chord of a finger curled by GRIP_CURL leaves the root GRIP_CURL / 2 above its first direction
	const aAim = (Math.atan2(aim[1] - b[1], aim[0] - b[0]) * 180) / Math.PI - GRIP_CURL * 0.5;
	const th = clamp01(touch);
	// hovering = lifted toward the camera: a notch shorter and raised; out of / back into the fist: it unfurls from a short stub at
	// the knuckle (curled toward the carton, never upright beside the carton edge)
	const e = 1 - Math.pow(1 - ik, 3);
	const lenAim = Math.min(GRIP_INDEX_MAX, D * 1.01) * lerp(0.9, 1, th);
	const aHover = aAim - 6 * (1 - th);
	const ang = lerp(aHover + 50, aHover, e);
	const back = 20;
	const len = lerp(40, lenAim, e) + back;
	const iBase: P2 = [b[0] - Math.cos(rad(ang)) * back, b[1] - Math.sin(rad(ang)) * back];
	const out = ik > 0.01;
	const iO: FingerOpts = {tap: tp, pad: 0.08, knuckle: 6, neck: 0.5, curl: lerp(40, GRIP_CURL, e)};
	const parts: Part[] = [{d: GRIP_PALM, c: MAN.skin}, ...(out ? [{d: fingerPath(iBase, ang, len, 44, 36, iO), c: MAN.skin}] : [])];
	// thumb along the palm side, pressing the carton's front face under the index (kit A thumb line (30,−66) → (79,−156), shorter)
	const tb: P2 = [20, -44];
	const tt: P2 = [64, -114];
	const tA = (Math.atan2(tt[1] - tb[1], tt[0] - tb[0]) * 180) / Math.PI;
	const tL = Math.hypot(tt[0] - tb[0], tt[1] - tb[1]);
	const tO: FingerOpts = {pad: 0.05, neck: 0.6, curl: 10};
	return (
		<g>
			<ManSleeve id={id} pass="under" arm={arm} t={t} glint={glint} lw={L} gesture="grab" />
			<InkPass parts={parts} L={L} />
			<FillPass parts={parts} />
			{/* knuckle line of the fist on the back of the hand + soft light */}
			<path d="M-34,-148 Q-16,-160 4,-158" stroke={INK} strokeWidth={L * 0.7} fill="none" strokeLinecap="round" opacity={0.85} />
			<path d="M-30,-40 Q-38,-100 -30,-140" stroke="#FFFFFF" strokeWidth={10} opacity={0.26} fill="none" strokeLinecap="round" />
			{/* thumb */}
			<path d={fingerPath(tb, tA, tL, 52, 42, tO)} fill={MAN.skin} />
			<path d={fingerPath(tb, tA, tL, 52, 42, {...tO, open: true, from: 0.15})} fill="none" stroke={INK} strokeWidth={L} strokeLinecap="round" strokeLinejoin="round" />
			<Nail base={tb} ang={tA} len={tL} w={42} o={tO} skin={MAN.skin} skinD={MAN.skinD} L={L} side={-1} />
			{out ? (
				<g>
					<path
						d={`M${pt(fingerPt(iBase, ang, len, len * 0.6, -9, iO))} L${pt(fingerPt(iBase, ang, len, 36, -9, iO))}`}
						stroke="#FFFFFF"
						strokeWidth={6}
						opacity={0.36 * e}
						strokeLinecap="round"
					/>
					<Nail base={iBase} ang={ang} len={len} w={36} o={iO} skin={MAN.skin} skinD={MAN.skinD} L={L} side={-1} k={clamp01((e - 0.35) / 0.3)} />
				</g>
			) : null}
			<ManSleeve id={id} pass="watch" arm={arm} t={t} glint={0} lw={L} gesture="grab" />
		</g>
	);
};

// ───────────────────────────── ManGripBackG (the fingers behind the carton) ─────────────────────────────

/** the four fingers of his grip that wrap around the carton's edge BEHIND it (kit A HandG 'grab' part 'back' replaced, owner
 *  26.10: those were stacked straight tubes — angular slabs with a dark square fingertip on top). Same layout as the kit's grab
 *  (its finger roots, lengths, joint bends and fan, so the grip reads the same in every pose), but each finger is ONE smooth
 *  tapering shape (fingerPath with soft joint bends, knuckle bump, round tip) and the farther fingers are only a notch warmer —
 *  no dark block. Drawn back to front (little → index), each with its own INK contour, so they read as fingers side by side;
 *  a skin filler under the top finger closes the gap between the curled fingers, the palm and the carton edge when the hand is
 *  tilted away from it (GRIP1). k = the index leaves the grip (ManGripPointG draws it out in front): here it curls into the fist. */
// kit A FING (roots, phalanx lengths, width, fan angle) and the 'grab' curls; joint bends 70° / 95° / 70° × curl
const BACK_F: {b: P2; L: [number, number, number]; w: number; a: number; c: number}[] = [
	{b: [6, -170], L: [70, 46, 36], w: 38, a: 4, c: 0.55},
	{b: [-4, -176], L: [76, 50, 38], w: 37, a: -3, c: 0.6},
	{b: [-14, -170], L: [70, 46, 35], w: 35, a: -9, c: 0.63},
	{b: [-22, -156], L: [56, 38, 30], w: 31, a: -16, c: 0.66},
];
const BACK_SHADE = [0, 0.12, 0.2, 0.28];
const backFinger = (i: number, out: number) => {
	const f = BACK_F[i];
	const c = i === 0 ? lerp(f.c, 1, out) : f.c;
	const sl = i === 0 ? lerp(1, 0.32, out) : 1;
	const L0 = f.L[0] * sl;
	const L1 = f.L[1] * sl;
	const len = L0 + L1 + f.L[2] * sl;
	const w = f.w * 1.04;
	// the root bend is folded into the start direction (the root sits under the palm)
	const a = -90 + f.a * 1.09 + c * 70 * 0.85;
	const o: FingerOpts = {pad: 0.05, knuckle: 4, neck: 0.5, joints: [{at: L0 / len, deg: c * 95, w: 0.22}, {at: (L0 + L1) / len, deg: c * 48, w: 0.24}, {at: 0, deg: c * 70 * 0.15, w: 0.1}]};
	return {b: f.b, a, len, w0: w * 1.06, w1: w * 0.92, o, show: len > 30};
};
export const ManGripBackG: React.FC<{
	/** 0..1 the index leaves the grip (ManGripPointG draws it out in front): here it curls into the fist */
	k?: number;
	lw: number;
}> = ({k = 0, lw}) => {
	const L = lw;
	const out = smooth(clamp01(k / 0.4));
	const geo = BACK_F.map((_, i) => backFinger(i, out));
	const top = geo[0].show && out < 0.5 ? 0 : 1;
	const g0 = geo[top];
	const cl = fingerGeo(g0.b, g0.a, g0.len, g0.w0, g0.w1, g0.o).cl;
	const filler = `M${cl.map(pt).join(' L')} L70,-80 L20,-96 Z`;
	const fingers = [3, 2, 1, 0].map((i) => {
		const g = geo[i];
		if (!g.show) return null;
		const col = mix(MAN.skin, MAN.skinD, BACK_SHADE[i]);
		// a soft light along the back of the first segment
		const h0 = fingerPt(g.b, g.a, g.len, g.len * 0.86, -g.w0 * 0.24, g.o);
		const h1 = fingerPt(g.b, g.a, g.len, g.len * 0.62, -g.w0 * 0.26, g.o);
		return (
			<g key={i}>
				<path d={fingerPath(g.b, g.a, g.len, g.w0, g.w1, g.o)} fill={col} stroke={INK} strokeWidth={L} strokeLinejoin="round" strokeLinecap="round" />
				<path d={`M${pt(h0)} L${pt(h1)}`} stroke="#FFFFFF" strokeWidth={8} opacity={0.24} strokeLinecap="round" />
			</g>
		);
	});
	return (
		<g>
			<path d={filler} fill={mix(MAN.skin, MAN.skinD, 0.16)} />
			{fingers}
		</g>
	);
};

// ───────────────────────────── ManCartonGripG (drop-in for kit A MilkCarton `hand`) ─────────────────────────────

/** his hand holding a kit A MilkCarton (front view) by its right edge, in CARTON units — the same placement as the kit's own
 *  `hand={{kind: 'man', side: 1, at, rot, scale}}` (palm contact HAND_GRIP on the edge x 196, y −at·640, mirrored hand), drawn in
 *  two parts around the carton with the carton's own x / y / s / rot: part 'back' (ManGripBackG) BEFORE the carton, part 'front'
 *  (ManGripPointG: kit A's sleeve, cuff and watch, profile palm, short thumb with a nail, the index out when idx is given) after it.
 *  lw = the carton's line width (lwFor(s)). */
export type GripIndex = {k: number; aim: P2; touch: number; tap: number};
export const ManCartonGripG: React.FC<{
	part: 'back' | 'front';
	at?: number;
	rot?: number;
	scale?: number;
	arm?: number;
	t?: number;
	glint?: number;
	/** his index out of the grip; aim in carton units */
	idx?: GripIndex | null;
	lw: number;
}> = ({part, at = 0.16, rot = 4, scale = 1.35, arm = 1700, t = 0, glint = 0, idx, lw}) => {
	const ex = 196;
	const ey = -at * 640;
	const gp: P2 = [48, -104]; // kit A HAND_GRIP (man, scale 1)
	const L = lw / scale;
	const ik = idx ? clamp01(idx.k) : 0;
	// carton units → hand units (inverse of the transform below)
	const inv = (P: P2): P2 => {
		const a = rad(-rot);
		const x = (P[0] - ex) / scale;
		const y = (P[1] - ey) / scale;
		const q: P2 = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
		return [gp[0] - q[0], q[1] + gp[1]];
	};
	const xf = `translate(${f1(ex)} ${f1(ey)}) rotate(${rot.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${gp[0]} ${-gp[1]}) scale(-1 1)`;
	return (
		<g transform={xf}>
			{part === 'back' ? (
				<ManGripBackG k={ik} lw={L} />
			) : (
				<ManGripPointG aim={idx ? inv(idx.aim) : [0, 0]} k={ik} touch={idx ? idx.touch : 0} tap={idx ? idx.tap : 0} arm={arm} t={t} glint={glint} lw={L} />
			)}
		</g>
	);
};
