import React from 'react';
import {AbsoluteFill} from 'remotion';
import {W, We} from '../lib/time';
import {GOLD, INK, MAGENTA, TEAL, XF, clamp01, easeInOut, h1, lerp, useT} from '../ui/gfx';

// Etna 1992 as two animated cutaway diagrams (owner 18.10: «человек должен досконально понимать, что за процесс»).
// Flat 2.5D vector look in the brand colours, procedural SVG only, no text on the picture (the subtitle is the voice).
//   WallDiagram   W(55) … W(62)  «Dirt walls? The lava climbs right over.»  side section of the slope: a bulldozer piles
//                 an earth bank across it, the lava comes down from the left, ponds behind the bank and spills over the
//                 crest toward the town.
//   TunnelDiagram W(62) … W(71)  «So engineers blow up its tunnel — at the source.»  the flank seen from above with a cut
//                 window into the crust: the lava runs from the vent to the town inside a tube; charges at the tube near the
//                 vent, the blast opens it, the lava leaves at the breach into a new channel away from the town, the tube
//                 to the town drains and goes dark.
// Both gate themselves by time, fade in over XF from t0 and stay fully visible until t1 + XF. Full frame, opaque.
// Kept clear of the subtitle band (y 1350–1530): nothing that matters sits there.

type Pt = [number, number];
const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
const P2 = (p: Pt) => `${f1(p[0])},${f1(p[1])}`;
const dPath = (a: Pt[], close = true) => (a.length > 1 ? 'M' + a.map(P2).join('L') + (close ? 'Z' : '') : '');
const sstep = (a: number, b: number, x: number) => {
	const k = clamp01((x - a) / (b - a));
	return k * k * (3 - 2 * k);
};
const hsh = (a: number, b = 0, c = 0) => h1(a * 12.9898 + b * 78.233 + c * 37.719 + 0.5);
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const lerpPt = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/** monotone cubic (Fritsch–Carlson) through (xs, ys); `flat` = zero slope at both ends; linear extrapolation outside */
const monotone = (xs: number[], ys: number[], flat = false) => {
	const n = xs.length;
	const dl: number[] = [];
	for (let i = 0; i < n - 1; i++) dl.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
	const m = ys.map((_, i) => (i === 0 ? (flat ? 0 : dl[0]) : i === n - 1 ? (flat ? 0 : dl[n - 2]) : dl[i - 1] * dl[i] <= 0 ? 0 : (dl[i - 1] + dl[i]) / 2));
	for (let i = 0; i < n - 1; i++) {
		if (dl[i] === 0) {
			m[i] = 0;
			m[i + 1] = 0;
			continue;
		}
		const a = m[i] / dl[i];
		const b = m[i + 1] / dl[i];
		const s = a * a + b * b;
		if (s > 9) {
			const k = 3 / Math.sqrt(s);
			m[i] = k * a * dl[i];
			m[i + 1] = k * b * dl[i];
		}
	}
	return (x: number) => {
		if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
		if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
		let k = 0;
		while (x > xs[k + 1]) k++;
		const h = xs[k + 1] - xs[k];
		const u = (x - xs[k]) / h;
		return (2 * u ** 3 - 3 * u ** 2 + 1) * ys[k] + (u ** 3 - 2 * u ** 2 + u) * h * m[k] + (-2 * u ** 3 + 3 * u ** 2) * ys[k + 1] + (u ** 3 - u ** 2) * h * m[k + 1];
	};
};
/** time keys → value, held constant outside the keys, eased in/out at both ends */
const tkeys = (ts: number[], vs: number[]) => {
	const f = monotone(ts, vs, true);
	return (t: number) => f(Math.max(ts[0], Math.min(ts[ts.length - 1], t)));
};

/** filled bands between two sampled curves (top < bot means "present"), with sub-sample end points */
type Band = {top: Pt[]; bot: Pt[]};
const bandRuns = (xs: number[], top: number[], bot: number[], eps = 0.35): Band[] => {
	const out: Band[] = [];
	let cur: Band | null = null;
	for (let i = 0; i < xs.length; i++) {
		const th = bot[i] - top[i];
		if (th > eps) {
			if (!cur) {
				cur = {top: [], bot: []};
				if (i > 0) {
					const th0 = bot[i - 1] - top[i - 1];
					const f = clamp01((eps - th0) / (th - th0));
					const p: Pt = [lerp(xs[i - 1], xs[i], f), lerp(bot[i - 1], bot[i], f)];
					cur.top.push(p);
					cur.bot.push(p);
				}
			}
			cur.top.push([xs[i], top[i]]);
			cur.bot.push([xs[i], bot[i]]);
		} else if (cur) {
			const th0 = bot[i - 1] - top[i - 1];
			const f = clamp01((th0 - eps) / (th0 - th));
			const p: Pt = [lerp(xs[i - 1], xs[i], f), lerp(bot[i - 1], bot[i], f)];
			cur.top.push(p);
			cur.bot.push(p);
			out.push(cur);
			cur = null;
		}
	}
	if (cur) out.push(cur);
	return out;
};
const bandPoly = (b: Band) => [...b.top, ...[...b.bot].reverse()];
/** 2.5D "top face" of a band: its top line extruded along the depth vector */
const stripPoly = (line: Pt[], D: Pt) => [...line, ...[...line].reverse().map((p) => add(p, D))];
const interpAt = (xs: number[], ys: number[], x: number) => {
	const dx = xs[1] - xs[0];
	const f = (x - xs[0]) / dx;
	const i = Math.max(0, Math.min(xs.length - 2, Math.floor(f)));
	return lerp(ys[i], ys[i + 1], clamp01(f - i));
};

const Defs: React.FC<{id: string}> = ({id}) => (
	<>
		{[2, 4, 7, 12, 22, 36].map((b) => (
			<filter key={b} id={`${id}-b${b}`} filterUnits="userSpaceOnUse" x={-400} y={-400} width={1880} height={2720}>
				<feGaussianBlur stdDeviation={b} />
			</filter>
		))}
	</>
);

const vignette = (
	<div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 42%, rgba(0,0,0,0) 55%, rgba(8,2,16,0.55) 100%)', pointerEvents: 'none'}} />
);

// ================================================================================================================
// 1. WallDiagram — «Dirt walls? The lava climbs right over.»
// ================================================================================================================

const WD: Pt = [40, -62]; // depth vector of the 2.5D slab (back edge of the cut)
// slope profile (screen px): steep upper flank from the top left, a bench where the bank stands, a drop, the town
const WG = monotone(
	[-160, -60, 0, 200, 350, 420, 800, 870, 930, 1020, 1120, 1260],
	[400, 500, 560, 740, 870, 915, 993, 1050, 1080, 1105, 1122, 1135],
);
const WXS: number[] = [];
for (let x = -130; x <= 1250; x += 4) WXS.push(x);
const WGY = WXS.map(WG);

const WALL = {xc0: 472, xc1: 528, s1: 1.2, s2: 1.5, H: 175};
const WALL_BASE = WG(500);
const WALL_YC = WALL_BASE - WALL.H;
const softplus = (u: number, k = 9) => (u > 8 * k ? u : k * Math.log(1 + Math.exp(u / k)));
/** top of the earth bank (rounded shoulders), r = how far it has been pushed up (0…1) */
const wallTop = (x: number, r: number) => WALL_BASE - WALL.H * r + WALL.s1 * softplus(WALL.xc0 - x) + WALL.s2 * softplus(x - WALL.xc1);
const bisect = (f: (x: number) => number, a: number, b: number) => {
	let lo = a;
	let hi = b;
	for (let i = 0; i < 30; i++) {
		const m = (lo + hi) / 2;
		if (f(lo) * f(m) <= 0) hi = m;
		else lo = m;
	}
	return (lo + hi) / 2;
};
const toeU = (r: number) => bisect((x) => wallTop(x, r) - WG(x), 150, WALL.xc0);
const toeD = (r: number) => bisect((x) => wallTop(x, r) - WG(x), WALL.xc1, 900);
const TOE_U = toeU(1);
const TOE_UY = WG(TOE_U);
const TOE_D = toeD(1);
/** the bank's crest = its highest point (a sample of WXS): the pond never floods past it, the overflow starts there */
const XC = (() => {
	let best = WALL.xc0;
	let by = Infinity;
	for (const x of WXS) {
		if (x < WALL.xc0 - 12 || x > WALL.xc1 + 12) continue;
		const y = wallTop(x, 1);
		if (y < by) {
			by = y;
			best = x;
		}
	}
	return best;
})();

// timing (absolute s)
const WT = {
	riseA: W(55) + 0.03, // the bank pushes up on «Dirt walls?»
	riseB: We(56) + 0.1,
	over: W(59) + 0.01, // the pond reaches the crest: «climbs right over»
};
const wRise = (t: number) => lerp(0.12, 1, easeInOut((t - WT.riseA) / (WT.riseB - WT.riseA)));
const wFront1 = tkeys([28.9, 29.9, 30.55, 30.98, 31.5], [-150, 105, 280, TOE_U - 1, TOE_U + 26]);
const W_POND0 = 30.98;
const wPond = tkeys([W_POND0, 31.12, WT.over, 31.85, 33.6], [TOE_UY + 1, lerp(TOE_UY, WALL_YC, 0.42), WALL_YC, WALL_YC - 26, WALL_YC - 32]);
const wFront2 = tkeys([WT.over, WT.over + 0.28, WT.over + 0.58, 32.5, 33.45], [XC, 600, TOE_D + 4, 748, 795]);
const wTh2 = (t: number) => 34 * sstep(WT.over, WT.over + 0.5, t);
const TH1 = 44;

// static: strata of the cut face, rocks / grass on the top face, stars
const stratum = (dep: number, k: number) => WXS.map((x, i): Pt => [x, WGY[i] + dep + (dep > 0 ? 9 * Math.sin(x * 0.009 + k * 1.7) + 5 * Math.sin(x * 0.023 + k * 3.6) : 0)]);
const W_STRATA: {d: string; c: string}[] = (
	[
		[0, '#603456'],
		[22, '#4E2749'],
		[95, '#412042'],
		[210, '#36193B'],
		[370, '#2D1433'],
		[580, '#25102B'],
		[820, '#1D0C23'],
	] as [number, string][]
).map(([dep, c], k) => ({d: dPath([...stratum(dep, k), [1250, 2200], [-130, 2200]]), c}));
const W_STRATA_LINES = [22, 95, 210, 370, 580].map((dep, k) => dPath(stratum(dep, k + 1), false));
const W_PEBBLES = Array.from({length: 80}, (_, i) => {
	const x = -60 + hsh(i, 1) * 1180;
	const dep = 34 + hsh(i, 2) * 820;
	return {x, y: WG(x) + dep, rx: 3 + hsh(i, 3) * 8, ry: 2 + hsh(i, 4) * 4.5, o: 0.16 + 0.2 * hsh(i, 5)};
});
const W_STRIP = dPath(stripPoly(WXS.map((x, i): Pt => [x, WGY[i]]), WD));
const W_ROCKS = Array.from({length: 46}, (_, i) => {
	const x = -80 + hsh(i, 11) * 900;
	const z = 0.1 + hsh(i, 12) * 0.85;
	return {p: add([x, WG(x)], WD, z), r: 3 + hsh(i, 13) * 4.5};
});
const W_GRASS = Array.from({length: 40}, (_, i) => {
	const x = 790 + hsh(i, 21) * 420;
	const z = 0.08 + hsh(i, 22) * 0.86;
	return {p: add([x, WG(x)], WD, z), s: 0.8 + hsh(i, 23) * 0.7};
});
const STARS = Array.from({length: 50}, (_, i) => ({x: hsh(i, 31) * 1080, y: hsh(i, 32) * 760, r: 0.9 + hsh(i, 33) * 1.7, o: 0.25 + 0.5 * hsh(i, 34)}));

// little town on the lower slope (x, depth z, width, height)
type House = {x: number; z: number; w: number; h: number; tower?: boolean};
const W_HOUSES: House[] = [
	{x: 966, z: 0.78, w: 50, h: 40},
	{x: 894, z: 0.56, w: 64, h: 50, tower: true},
	{x: 976, z: 0.3, w: 56, h: 44},
	{x: 872, z: 0.12, w: 54, h: 42},
];
const W_TREES: {x: number; z: number; r: number}[] = [
	{x: 1028, z: 0.95, r: 16},
	{x: 938, z: 0.98, r: 14},
	{x: 1040, z: 0.5, r: 17},
	{x: 960, z: 0.08, r: 13},
	{x: 860, z: 0.62, r: 14},
];

const HouseSide: React.FC<{base: Pt; w: number; h: number; drop: number; D: Pt; tower?: boolean}> = ({base, w, h, drop, D, tower}) => {
	const [x, y] = base;
	const dd: Pt = [D[0] * 0.24, D[1] * 0.24];
	const rh = w * 0.42;
	const apex: Pt = [x + w / 2, y - h - rh];
	const eL: Pt = [x - 4, y - h + 2];
	const eR: Pt = [x + w + 4, y - h + 2];
	const wall = '#F6E6D2';
	const side = '#D6BCA6';
	const tw = 22;
	const th = h + 54;
	return (
		<g>
			{/* plinth down to the slope */}
			<path d={dPath([[x - 2, y - 2], [x + w + 2, y - 2], add([x + w + 2, y - 2], dd), add([x + w + 2, y + drop + 4], dd), [x + w + 2, y + drop + 4], [x - 2, y + drop + 2]])} fill="#5A3A55" />
			<path d={dPath([[x + w, y - h], add([x + w, y - h], dd), add([x + w, y], dd), [x + w, y]])} fill={side} />
			<path d={dPath([eL, apex, add(apex, dd), add(eL, dd)])} fill="#FF5A9E" />
			<path d={dPath([apex, eR, add(eR, dd), add(apex, dd)])} fill="#C81E6A" />
			<rect x={x} y={y - h} width={w} height={h} fill={wall} />
			<path d={dPath([[x, y - h], apex, [x + w, y - h]])} fill={wall} />
			<path d={dPath([eL, apex, eR], false)} fill="none" stroke={MAGENTA} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
			<rect x={x + w * 0.16} y={y - h * 0.62} width={w * 0.2} height={h * 0.26} rx={2} fill={GOLD} />
			<rect x={x + w * 0.62} y={y - h * 0.62} width={w * 0.2} height={h * 0.26} rx={2} fill={GOLD} />
			<rect x={x + w * 0.4} y={y - h * 0.4} width={w * 0.2} height={h * 0.4} rx={2} fill="#4A2A48" />
			{tower ? (
				<g>
					<path d={dPath([[x - tw + 2, y - th], add([x - tw + 2, y - th], dd), add([x + 2, y - th], dd), [x + 2, y - th]])} fill="#E9D6C2" />
					<rect x={x - tw + 2} y={y - th} width={tw} height={th} fill={wall} />
					<path d={dPath([[x + 2, y - th], add([x + 2, y - th], dd), add([x + 2, y], dd), [x + 2, y]])} fill={side} />
					<ellipse cx={x - tw / 2 + 2 + dd[0] * 0.5} cy={y - th + dd[1] * 0.5} rx={tw * 0.62} ry={tw * 0.62} fill={TEAL} />
					<ellipse cx={x - tw / 2 + 2 + dd[0] * 0.5 - 3} cy={y - th + dd[1] * 0.5 - 4} rx={tw * 0.22} ry={tw * 0.18} fill="#B9FFF8" opacity={0.7} />
					<rect x={x - tw / 2 - 3} y={y - th + 18} width={10} height={14} rx={5} fill={GOLD} />
				</g>
			) : null}
		</g>
	);
};

const Tree: React.FC<{p: Pt; r: number}> = ({p, r}) => (
	<g>
		<rect x={p[0] - 2.5} y={p[1] - r * 0.9} width={5} height={r * 0.9} fill="#4A2A3A" />
		<circle cx={p[0]} cy={p[1] - r * 1.5} r={r} fill="#1E9C7E" />
		<circle cx={p[0] - r * 0.3} cy={p[1] - r * 1.75} r={r * 0.55} fill="#3CD6AE" opacity={0.85} />
	</g>
);

/** little yellow bulldozer, side view, facing left; origin = front-bottom of the tracks */
const Bulldozer: React.FC<{x: number; y: number; ang: number; o: number; t: number; s?: number}> = ({x, y, ang, o, t, s = 1}) => {
	const ink = INK;
	const wob = Math.sin(t * 40) * 0.6;
	return (
		<g transform={`translate(${f1(x)},${f1(y)}) rotate(${f1(ang)}) scale(${s})`} opacity={o}>
			{/* blade + arm */}
			<path d="M 26 -36 L 2 -30" stroke={ink} strokeWidth={7} strokeLinecap="round" />
			<path d="M -8 -62 Q 4 -60 8 -54 L 8 -4 L -10 -1 Q -16 -30 -8 -62 Z" fill="#F3A21C" stroke={ink} strokeWidth={3.5} strokeLinejoin="round" />
			{/* tracks */}
			<rect x={6} y={-26} width={112} height={26} rx={13} fill={ink} />
			{[20, 44, 68, 92, 106].map((cx) => (
				<circle key={cx} cx={cx} cy={-13} r={cx === 106 ? 6 : 8} fill="#3B2A44" stroke="#5B4864" strokeWidth={2} />
			))}
			{/* body */}
			<g transform={`translate(0 ${f1(wob)})`}>
				<rect x={26} y={-60} width={90} height={36} rx={5} fill={GOLD} stroke={ink} strokeWidth={3.5} />
				<rect x={26} y={-34} width={90} height={9} fill="#E39A17" />
				<rect x={40} y={-84} width={7} height={26} rx={2} fill={ink} />
				<path d="M 70 -60 L 74 -100 L 114 -100 L 116 -60 Z" fill={GOLD} stroke={ink} strokeWidth={3.5} strokeLinejoin="round" />
				<path d="M 79 -64 L 82 -93 L 107 -93 L 109 -64 Z" fill="#8FEFF0" />
				<path d="M 84 -90 L 92 -90 L 86 -68 L 81 -68 Z" fill="#E6FFFF" opacity={0.7} />
				<rect x={68} y={-106} width={52} height={8} rx={3} fill={ink} />
				<circle cx={45} cy={-45} r={4} fill={ink} />
			</g>
		</g>
	);
};

type Plate = {pts: Pt[]; skin?: Pt[]; c: string; o?: number};

export const WallDiagram: React.FC<{t0?: number; t1?: number}> = ({t0 = W(55), t1 = W(62)}) => {
	const t = useT();
	if (t < t0 || t >= t1 + XF) return null;
	const op = easeInOut((t - t0) / XF);
	const id = 'wd';

	// ---------------------------------------------------------------- state
	const r = wRise(t);
	const n = WXS.length;
	const wTopArr = WXS.map((x) => wallTop(x, r));
	const yT = WXS.map((_, i) => Math.min(WGY[i], wTopArr[i]));
	const tu = toeU(r);
	const td = toeD(r);

	const fx1 = wFront1(t);
	const pondOn = t >= W_POND0;
	const yP = pondOn ? wPond(t) : Infinity;
	const ovOn = t >= WT.over;
	const fx2 = ovOn ? wFront2(t) : -Infinity;
	const th2 = wTh2(t);
	const top1 = WXS.map((x, i) => (x <= fx1 ? yT[i] - TH1 * Math.sqrt(clamp01((fx1 - x) / 58)) : Infinity));
	const top = new Array<number>(n);
	const zone = new Array<number>(n);
	// how far the pond stands above the crest: the overflow sheet starts with that thickness, so the pond surface runs on
	// over the crest without a step
	const head = pondOn ? Math.max(0, interpAt(WXS, yT, XC) - yP) : 0;
	for (let i = 0; i < n; i++) {
		const x = WXS[i];
		let v = top1[i];
		let z = v < Infinity ? 1 : 0;
		if (x <= XC && yP < yT[i] && yP < v) {
			v = yP;
			z = 2;
		}
		if (ovOn && x >= XC && x <= fx2) {
			const thH = head * (1 - sstep(XC, XC + 56, x)) * Math.sqrt(clamp01((fx2 - x) / 12)) * sstep(WT.over, WT.over + 0.2, t);
			const thS = th2 * Math.sqrt(clamp01((fx2 - x) / 46));
			const v3 = yT[i] - Math.max(thH, thS);
			if (v3 < v) {
				v = v3;
				z = 3;
			}
		}
		top[i] = v === Infinity ? yT[i] : Math.min(v, yT[i]);
		zone[i] = top[i] < yT[i] - 0.35 ? z : 0;
	}
	const runs = bandRuns(WXS, top, yT);
	const lavaFront = runs.map((b) => dPath(bandPoly(b))).join(' ');
	const lavaStrip = runs.map((b) => dPath(stripPoly(b.top, WD))).join(' ');
	const topAt = (x: number) => interpAt(WXS, top, x);
	const terAt = (x: number) => interpAt(WXS, yT, x);
	const SP = (x: number, z: number): Pt => [x + WD[0] * z, topAt(x) + WD[1] * z];
	const lavaMin = runs.length ? runs[0].top[0][0] : 0;
	const lavaMax = runs.length ? runs[runs.length - 1].top[runs[runs.length - 1].top.length - 1][0] : 0;

	// zone ranges (U = flowing slope, P = pond, O = overflow) with interpolated borders
	let bUP = Infinity;
	for (let i = 1; i < n; i++)
		if (zone[i - 1] === 1 && zone[i] === 2) {
			const a = top1[i - 1] - yP;
			const b = (top1[i] === Infinity ? yT[i] : top1[i]) - yP;
			bUP = lerp(WXS[i - 1], WXS[i], clamp01(a / (a - b)));
			break;
		}
	const bPO = ovOn ? XC : Infinity;
	const zones: {a: number; b: number; v: number; pw: number; kind: number}[] = [];
	if (runs.length) {
		zones.push({a: lavaMin - 2, b: Math.min(bUP, bPO, lavaMax + 2), v: 80, pw: 46, kind: 1});
		if (bUP < Infinity) zones.push({a: bUP, b: Math.min(bPO, lavaMax + 2), v: 10, pw: 58, kind: 2});
		if (ovOn) zones.push({a: bPO, b: lavaMax + 2, v: 110, pw: 38, kind: 3});
	}
	// crust plates: a jittered lattice in (x along the slope, z depth) per zone, moving with the zone's speed; each cell is
	// shrunk toward its centre so the glowing melt shows in the seams; the front row's cells continue as the crust skin on
	// the cut face
	const plates: Plate[] = [];
	const streaks: Pt[][] = [];
	const ROWS = 3;
	for (const zn of zones) {
		if (zn.b - zn.a < 1) continue;
		const off = zn.v * t + zn.kind * 13.7;
		const pw = zn.pw;
		const k0 = Math.floor((zn.a - off) / pw) - 2;
		const k1 = Math.ceil((zn.b - off) / pw) + 1;
		const cl = (x: number) => Math.max(zn.a, Math.min(zn.b, x));
		const vx = (k: number, j: number) => k * pw + off + j * 0.37 * pw + (hsh(k, j, zn.kind * 3 + 1) - 0.5) * pw * 0.7;
		const vz = (k: number, j: number) => (j === 0 ? 0 : j === ROWS ? 1 : j / ROWS + (hsh(k, j, zn.kind * 3 + 2) - 0.5) * (0.55 / ROWS));
		const gap = zn.kind === 2 ? 1.8 : zn.kind === 3 ? 4.2 : 2.8;
		for (let j = 0; j < ROWS; j++)
			for (let k = k0; k <= k1; k++) {
				const xa0 = cl(vx(k, j));
				const xb0 = cl(vx(k + 1, j));
				const xa1 = cl(vx(k, j + 1));
				const xb1 = cl(vx(k + 1, j + 1));
				if (xb0 - xa0 < 1 && xb1 - xa1 < 1) continue;
				const za0 = vz(k, j);
				const zb0 = vz(k + 1, j);
				const za1 = vz(k, j + 1);
				const zb1 = vz(k + 1, j + 1);
				const raw: Pt[] = [SP(xa0, za0), SP((xa0 + xb0) / 2, (za0 + zb0) / 2), SP(xb0, zb0), SP(xb1, zb1), SP((xa1 + xb1) / 2, (za1 + zb1) / 2), SP(xa1, za1)];
				const cx = raw.reduce((s, p) => s + p[0], 0) / raw.length;
				const cy = raw.reduce((s, p) => s + p[1], 0) / raw.length;
				const g = gap * (0.75 + 0.5 * hsh(k, j, zn.kind + 20));
				const pts = raw.map((p): Pt => {
					const dx = cx - p[0];
					const dy = cy - p[1];
					const L = Math.hypot(dx, dy) || 1;
					const m = Math.min(g, L * 0.45) / L;
					return [p[0] + dx * m, p[1] + dy * m];
				});
				const hv = hsh(k, j + 3, zn.kind);
				const c = zn.kind === 3 ? (hv < 0.4 ? '#4E1B1C' : hv < 0.85 ? '#622422' : '#8A3424') : zn.kind === 2 ? (hv < 0.5 ? '#2A0D14' : hv < 0.92 ? '#341219' : '#5A1E1C') : hv < 0.33 ? '#2C0E14' : hv < 0.66 ? '#39131A' : hv < 0.9 ? '#45181D' : '#6A2620';
				const plate: Plate = {pts, c, o: zn.kind === 3 ? sstep(WT.over, WT.over + 0.3, t) : 1};
				if (j === 0 && xb0 - xa0 > 3) {
					const a = xa0 + g;
					const b = xb0 - g;
					const sk = (x: number) => Math.min(zn.kind === 3 ? 7 : zn.kind === 2 ? 13 : 11, 0.36 * (terAt(x) - topAt(x)));
					const xs = [a, (a + b) / 2, b];
					plate.skin = [...xs.map((x): Pt => [x, topAt(x) - 1]), ...[...xs].reverse().map((x): Pt => [x, topAt(x) + sk(x)])];
				}
				plates.push(plate);
			}
		// streaks inside the section (the lava streaming)
		const sv = zn.v * 1.5;
		const sp = 58;
		[0.46, 0.64, 0.82].forEach((fr, j) => {
			const off2 = sv * t + j * 19 + zn.kind * 7;
			const q0 = Math.floor((zn.a - off2) / sp) - 1;
			const q1 = Math.ceil((zn.b - off2) / sp) + 1;
			for (let k = q0; k <= q1; k++) {
				const xa = k * sp + off2 + hsh(k, j, 9) * 30;
				const len = zn.kind === 2 ? 10 : 10 + hsh(k, j, 8) * 26;
				const xb = xa + len;
				if (xa < zn.a || xb > zn.b) continue;
				const ff = fr + (hsh(k, j, 7) - 0.5) * 0.12;
				streaks.push([0, 0.5, 1].map((u): Pt => {
					const x = lerp(xa, xb, u);
					return [x, lerp(topAt(x), terAt(x), ff)];
				}));
			}
		});
	}
	// inner core of the section
	const core = runs
		.map((b) => {
			const tp = b.top.map((p, i): Pt => [p[0], lerp(p[1], b.bot[i][1], 0.3)]);
			const bt = b.bot.map((p, i): Pt => [p[0], lerp(b.top[i][1], p[1], 0.74)]);
			return dPath([...tp, ...bt.reverse()]);
		})
		.join(' ');
	const baseLine = runs.map((b) => dPath(b.bot, false)).join(' ');

	// bright fronts
	const fronts: {p: Pt; s: number}[] = [];
	// the hot front of the flow dims smoothly once it has reached the bank and starts to pond
	const s1 = 1 - sstep(W_POND0, W_POND0 + 0.3, t);
	if (runs.length && s1 > 0.002) fronts.push({p: [fx1 - 10, terAt(fx1 - 10) - 10], s: s1});
	if (ovOn && fx2 > XC + 8) fronts.push({p: [fx2 - 8, terAt(fx2 - 8) - 6], s: clamp01((th2 - 4) / 12)});

	// embers off the lava
	const embers: {p: Pt; r: number; o: number}[] = [];
	if (runs.length)
		for (let j = 0; j < 26; j++) {
			const T = 1.1 + hsh(j, 1) * 0.9;
			const ph = hsh(j, 2) * T;
			const age = (t + ph) % T;
			const cyc = Math.floor((t + ph) / T);
			const x = lerp(-40, 820, hsh(j, cyc, 3));
			const thick = terAt(x) - topAt(x);
			if (thick < 2) continue;
			const z = hsh(j, cyc, 4);
			const base = SP(x, z);
			const k = age / T;
			embers.push({
				p: [base[0] + 26 * k + 6 * Math.sin(age * 5 + j), base[1] - (40 + 90 * hsh(j, cyc, 5)) * k],
				r: 1.8 + 2.4 * hsh(j, cyc, 6),
				o: clamp01(age / 0.15) * (1 - sstep(0.55, 1, k)) * clamp01(thick / 8),
			});
		}

	// bulldozer: blade at the down-slope toe of the bank while it rises, pushing; then it backs off along the bench
	const back = 70 * easeInOut((t - (WT.riseB + 0.05)) / 0.8);
	const push = 8 * Math.sin(Math.PI * clamp01((t - WT.riseA) / (WT.riseB - WT.riseA)) * 3) ** 2;
	const bx = td + 6 - push + back;
	const bz = 0.3;
	const BL = 136; // bulldozer length (px) at scale 1.15
	const bAng = (Math.atan2(WG(bx + BL) - WG(bx), BL) * 180) / Math.PI;
	const bO = 1 - sstep(WT.riseB + 0.3, WT.riseB + 0.7, t);
	const bPos = add([bx, WG(bx) + 2], WD, bz);

	// dust while the bank is pushed up
	const dust: {p: Pt; r: number; o: number}[] = [];
	for (let j = 0; j < 12; j++) {
		const tb = WT.riseA - 0.1 + j * 0.085;
		const age = t - tb;
		if (age < 0 || age > 1.0) continue;
		const rr = wRise(tb);
		const onBlade = j % 3 === 0;
		const x = onBlade ? toeD(rr) + 6 : lerp(toeU(rr) + 10, toeD(rr) - 10, hsh(j, 41));
		const z = 0.15 + 0.7 * hsh(j, 42);
		const p = add([x, wallTop(x, rr)], WD, z);
		dust.push({p: [p[0] + 30 * age * (hsh(j, 43) - 0.3), p[1] - 34 * age], r: 14 + 46 * Math.sqrt(age), o: 0.5 * (1 - age)});
	}

	// wall faces (front cut + top strip by face)
	const wallBand = bandRuns(WXS, wTopArr, WGY, 0.2);
	const wallFront = wallBand.map((b) => dPath(bandPoly(b))).join(' ');
	const wLine = (a: number, b: number): Pt[] => {
		const out: Pt[] = [[a, wallTop(a, r)]];
		for (let x = Math.ceil(a / 4) * 4; x < b; x += 4) out.push([x, wallTop(x, r)]);
		out.push([b, wallTop(b, r)]);
		return out;
	};
	const wFaceU = dPath(stripPoly(wLine(tu, WALL.xc0), WD));
	const wFaceC = dPath(stripPoly(wLine(WALL.xc0, WALL.xc1), WD));
	const wFaceD = dPath(stripPoly(wLine(WALL.xc1, td), WD));

	// camera: a slow push toward the bank, drifting with the overflow toward the town
	const kc = easeInOut((t - t0) / (t1 + XF - t0));
	const zoom = lerp(1.0, 1.08, kc);
	const fx = lerp(530, 596, kc);
	const fy = lerp(880, 905, kc);
	const cam = `translate(540 990) scale(${zoom.toFixed(4)}) translate(${f1(-fx)} ${f1(-fy)})`;
	const zb = 1 + (zoom - 1) * 0.35;
	const camBg = `translate(540 950) scale(${zb.toFixed(4)}) translate(${f1(-lerp(540, fx, 0.35))} ${f1(-lerp(880, fy, 0.35))})`;

	// plume off the distant summit
	const puffs = Array.from({length: 9}, (_, j) => {
		const T = 7;
		const age = (t + j * (T / 9)) % T;
		const k = age / T;
		return {x: 455 + 170 * k + 30 * Math.sin(j * 2.1 + t * 0.5), y: 300 - 360 * k, r: 44 + 120 * k, o: 0.55 * Math.sin(Math.PI * k)};
	});

	const houses = [...W_HOUSES].sort((a, b) => b.z - a.z);
	const trees = [...W_TREES].sort((a, b) => b.z - a.z);

	return (
		<AbsoluteFill style={{opacity: op, background: '#12071F'}}>
			<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
				<defs>
					<Defs id={id} />
					<linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#0E0619" />
						<stop offset="0.3" stopColor="#22093A" />
						<stop offset="0.5" stopColor="#4A1250" />
						<stop offset="0.62" stopColor="#7E2258" />
					</linearGradient>
					<linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(1 900)">
						<stop offset="0.15" stopColor="#3E1C58" />
						<stop offset="0.9" stopColor="#25103B" />
					</linearGradient>
					<linearGradient id={`${id}-strip`} x1="-100" y1="0" x2="1180" y2="0" gradientUnits="userSpaceOnUse">
						<stop offset="0" stopColor="#8E5E88" />
						<stop offset="0.45" stopColor="#93707F" />
						<stop offset="0.68" stopColor="#6F9479" />
						<stop offset="1" stopColor="#4CAA86" />
					</linearGradient>
					<radialGradient id={`${id}-puff`}>
						<stop offset="0" stopColor="#7B5C8E" stopOpacity="0.9" />
						<stop offset="0.6" stopColor="#5A3F72" stopOpacity="0.55" />
						<stop offset="1" stopColor="#4A3060" stopOpacity="0" />
					</radialGradient>
					<radialGradient id={`${id}-hot`}>
						<stop offset="0" stopColor="#FFF6C8" stopOpacity="1" />
						<stop offset="0.35" stopColor="#FFD54A" stopOpacity="0.85" />
						<stop offset="1" stopColor="#FF6A10" stopOpacity="0" />
					</radialGradient>
					<radialGradient id={`${id}-dust`}>
						<stop offset="0" stopColor="#E2C29C" stopOpacity="0.9" />
						<stop offset="1" stopColor="#C49A78" stopOpacity="0" />
					</radialGradient>
					<clipPath id={`${id}-lf`}>
						<path d={lavaFront || 'M0 0Z'} />
					</clipPath>
					<clipPath id={`${id}-ls`}>
						<path d={lavaStrip || 'M0 0Z'} />
					</clipPath>
					<clipPath id={`${id}-wf`}>
						<path d={wallFront || 'M0 0Z'} />
					</clipPath>
				</defs>

				{/* ------------------------------------------------ background */}
				<rect x={0} y={0} width={1080} height={1920} fill={`url(#${id}-sky)`} />
				<g transform={camBg}>
					{STARS.map((s, i) => (
						<circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF3E0" opacity={s.o} />
					))}
					<ellipse cx={470} cy={430} rx={560} ry={300} fill="#FF2E88" opacity={0.17} filter={`url(#${id}-b36)`} />
					{/* the distant summit (lit left face, shaded right face) */}
					<path d="M -260 1180 Q 200 760 400 318 Q 455 292 512 316 Q 760 820 1320 1100 L 1320 1400 L -260 1400 Z" fill="#3A1A55" />
					<path d="M 455 300 Q 470 600 330 1400 L 1320 1400 L 1320 1100 Q 760 820 512 316 Q 485 302 455 300 Z" fill="#2C1346" />
					<path d="M -260 1180 Q 200 760 400 318 Q 455 292 512 316 Q 760 820 1320 1100" fill="none" stroke="#8A56A8" strokeWidth={3} opacity={0.5} />
					{/* glowing summit + a thin lava line down its flank (where our flow comes from) */}
					<ellipse cx={455} cy={306} rx={50} ry={20} fill="#FF7A1A" opacity={0.85} filter={`url(#${id}-b12)`} />
					<path d="M 436 312 Q 380 400 330 470 T 230 600" fill="none" stroke="#FF6A10" strokeWidth={16} strokeLinecap="round" opacity={0.45} filter={`url(#${id}-b7)`} />
					<path d="M 436 312 Q 380 400 330 470 T 230 600" fill="none" stroke="#FF9A2A" strokeWidth={5} strokeLinecap="round" opacity={0.95} />
					{/* a nearer ridge behind the town */}
					<path d="M 560 1300 Q 760 900 1000 800 Q 1100 760 1300 780 L 1300 1400 Z" fill="#241038" />
					<path d="M 560 1300 Q 760 900 1000 800 Q 1100 760 1300 780" fill="none" stroke="#5A2F78" strokeWidth={3} opacity={0.6} />
					{puffs.map((p, j) => (
						<circle key={j} cx={p.x} cy={p.y} r={p.r} fill={`url(#${id}-puff)`} opacity={p.o} />
					))}
				</g>

				<g transform={cam}>
					{/* ------------------------------------------------ ground: cut face (strata) */}
					{W_STRATA.map((s, i) => (
						<path key={i} d={s.d} fill={s.c} />
					))}
					{W_STRATA_LINES.map((d, i) => (
						<path key={i} d={d} fill="none" stroke="#7A4A72" strokeWidth={2} opacity={0.35} />
					))}
					{W_PEBBLES.map((p, i) => (
						<ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="#160A1C" opacity={p.o} />
					))}
					{/* ground: top face of the slab */}
					<path d={W_STRIP} fill={`url(#${id}-strip)`} />
					{W_ROCKS.map((k, i) => (
						<ellipse key={i} cx={k.p[0]} cy={k.p[1]} rx={k.r * 1.5} ry={k.r * 0.8} fill="#5E3A5E" opacity={0.55} />
					))}
					{W_GRASS.map((g, i) => (
						<path key={i} d={`M ${f1(g.p[0] - 6 * g.s)} ${f1(g.p[1])} L ${f1(g.p[0] - 2 * g.s)} ${f1(g.p[1] - 9 * g.s)} L ${f1(g.p[0] + 1 * g.s)} ${f1(g.p[1] - 2 * g.s)} L ${f1(g.p[0] + 4 * g.s)} ${f1(g.p[1] - 11 * g.s)} L ${f1(g.p[0] + 7 * g.s)} ${f1(g.p[1])} Z`} fill="#2FBF95" opacity={0.8} />
					))}
					<path d={dPath(WXS.map((x, i): Pt => [x, WGY[i]]), false)} fill="none" stroke="#D3A6C6" strokeWidth={3} opacity={0.75} />

					{/* ------------------------------------------------ the town (behind the action, on the top face) */}
					{[...trees.filter((tr) => tr.z > 0.5)].map((tr, i) => (
						<Tree key={'tb' + i} p={add([tr.x, WG(tr.x)], WD, tr.z)} r={tr.r} />
					))}
					{houses.map((h, i) => {
						const base = add([h.x, WG(h.x)], WD, h.z);
						const drop = WG(h.x + h.w) - WG(h.x);
						return <HouseSide key={i} base={base} w={h.w} h={h.h} drop={drop} D={WD} tower={h.tower} />;
					})}
					{[...trees.filter((tr) => tr.z <= 0.5)].map((tr, i) => (
						<Tree key={'tf' + i} p={add([tr.x, WG(tr.x)], WD, tr.z)} r={tr.r} />
					))}

					{/* ------------------------------------------------ the earth bank */}
					<path d={wFaceU} fill="#A9734C" />
					<path d={wFaceC} fill="#C88F5E" />
					<path d={wFaceD} fill="#8E5C3C" />
					<path d={wallFront} fill="#8A5636" />
					<g clipPath={`url(#${id}-wf)`}>
						{Array.from({length: 12}, (_, k) => (
							<rect key={k} x={380} y={WALL_BASE + 40 - k * 15} width={500} height={7} fill={k % 2 ? '#74452B' : '#9C6542'} opacity={0.9} />
						))}
						{Array.from({length: 22}, (_, k) => (
							<ellipse key={'s' + k} cx={480 + hsh(k, 51) * 280} cy={WALL_BASE + 30 - hsh(k, 52) * 170} rx={3 + hsh(k, 53) * 4} ry={2 + hsh(k, 54) * 3} fill="#5A3420" opacity={0.75} />
						))}
					</g>
					<path d={dPath(wLine(tu, td), false)} fill="none" stroke="#E5B488" strokeWidth={3} strokeLinejoin="round" opacity={0.9} />

					{/* bulldozer + dust */}
					{bO > 0.01 ? <Bulldozer x={bPos[0]} y={bPos[1]} ang={bAng} o={bO} t={t} s={1.15} /> : null}
					<g filter={`url(#${id}-b4)`}>
						{dust.map((d, i) => (
							<circle key={i} cx={d.p[0]} cy={d.p[1]} r={d.r} fill={`url(#${id}-dust)`} opacity={d.o} />
						))}
					</g>

					{/* ------------------------------------------------ lava */}
					{runs.length ? (
						<>
							<g style={{mixBlendMode: 'screen'}} opacity={0.7} filter={`url(#${id}-b22)`}>
								<path d={lavaFront} fill="#FF5A0A" />
								<path d={lavaStrip} fill="#FF7A14" />
							</g>
							{/* top face: dark crust plates on glowing melt */}
							<path d={lavaStrip} fill="#FFB536" />
							<g clipPath={`url(#${id}-ls)`}>
								{plates.map((p, i) => (
									<path key={i} d={dPath(p.pts)} fill={p.c} stroke="#C2461A" strokeWidth={2.2} strokeOpacity={0.55} strokeLinejoin="round" opacity={p.o ?? 1} />
								))}
							</g>
							{/* cut face: orange melt, yellow core, flow streaks, crust skin, chilled base */}
							<path d={lavaFront} fill="#FF6E16" />
							<g clipPath={`url(#${id}-lf)`}>
								<path d={core} fill="#FFD447" filter={`url(#${id}-b7)`} />
								<g filter={`url(#${id}-b2)`}>
									{streaks.map((s, i) => (
										<path key={i} d={dPath(s, false)} fill="none" stroke="#FFE680" strokeWidth={5} strokeLinecap="round" opacity={0.55} />
									))}
								</g>
								<path d={baseLine} fill="none" stroke="#A8230F" strokeWidth={9} />
								{plates.map((p, i) => (p.skin ? <path key={i} d={dPath(p.skin)} fill={p.c} /> : null))}
							</g>
							{fronts.map((f, i) => (
								<circle key={i} cx={f.p[0]} cy={f.p[1]} r={26} fill={`url(#${id}-hot)`} opacity={0.85 * f.s} style={{mixBlendMode: 'screen'}} />
							))}
							<g filter={`url(#${id}-b2)`}>
								{embers.map((e, i) => (
									<circle key={i} cx={e.p[0]} cy={e.p[1]} r={e.r} fill="#FFD25A" opacity={e.o} />
								))}
							</g>
						</>
					) : null}
				</g>
			</svg>
			{vignette}
		</AbsoluteFill>
	);
};

// ================================================================================================================
// 2. TunnelDiagram — «So engineers blow up its tunnel — at the source.»
// ================================================================================================================
// The flank seen from above at an angle: the volcano at the top, the town at the bottom right. The lava leaves a vent at
// the volcano's foot and runs to the town inside a tube under a solid crust; a cut window along the tube shows the crust
// in section, the tube's round mouth and the lava streaming through it. Charges at the tube right by the vent, a cable
// to the engineers' plunger; on «blow UP» the tube blows open there; the lava wells out of the breach into a new channel
// that runs off to the lower left, away from the town, while the tube toward the town drains from the breach downward
// and goes dark, and the tongue at the town stops and crusts over.

const TV: Pt = [340, 452]; // vent: the tube starts here
const TA: Pt = [480, 630]; // vent → tube exit by the town
const TLEN = Math.hypot(TA[0], TA[1]);
const Td: Pt = [TA[0] / TLEN, TA[1] / TLEN];
const Tn: Pt = [Td[1], -Td[0]]; // across the tube, toward its far (upper right) side
/** point on the tube route: s along it (0 vent … 1 exit), l across (px, + = far side), v straight down (px, = depth) */
const TP = (s: number, l = 0, v = 0): Pt => [TV[0] + TA[0] * s + Tn[0] * l, TV[1] + TA[1] * s + Tn[1] * l + v];
const SW0 = 0.31; // cut window along the tube
const SW1 = 0.78;
const SB = 0.155; // the breach: charges + blast on the tube right by the vent, upstream of the window (keeps its round mouth in view)
const SLOT_W = 74; // window half width
const CRUST = 58; // crust (tube roof) thickness on screen
const LAVA_V = 86; // depth of the lava surface in the tube
const LAVA_W = 60; // half width of the lava stream
const TUBE_W = 60; // half width of the tube (hidden parts, dashed)
const ARCH: {rl: number; rv: number; v: number} = {rl: 56, rv: 40, v: CRUST + 40};

const TT = {
	charges: [W(63) + 0.05, W(63) + 0.2, W(63) + 0.35], // «engineers»: the charges go on, one by one
	wire: [W(63) + 0.25, W(64) - 0.02],
	press: W(65) - 0.18,
	blast: W(65) - 0.06, // «blow UP»
};
const BL = TT.blast;
const TAIL0 = SB; // upstream of the breach the lava keeps coming (into the breach)
const TAIL_T = [BL + 0.12, BL + 0.55, BL + 1.35, BL + 2.1];
const tTail = tkeys(TAIL_T, [TAIL0, 0.38, 0.72, 1.03]); // the tube drains from the breach downward
const tDrain = (s: number) => {
	if (s <= TAIL0) return Infinity;
	if (s >= 1.03) return Infinity;
	let lo = TAIL_T[0];
	let hi = TAIL_T[TAIL_T.length - 1];
	for (let i = 0; i < 24; i++) {
		const m = (lo + hi) / 2;
		if (tTail(m) < s) lo = m;
		else hi = m;
	}
	return (lo + hi) / 2;
};
const heatAt = (s: number, t: number) => {
	const td = tDrain(s);
	return t < td ? 1 : Math.exp(-(t - td) / 0.65);
};

// the new channel off the breach, to the lower left (away from the town)
const catmull = (ps: Pt[], per = 10): Pt[] => {
	const out: Pt[] = [];
	for (let i = 0; i < ps.length - 1; i++) {
		const p0 = ps[Math.max(0, i - 1)];
		const p1 = ps[i];
		const p2 = ps[i + 1];
		const p3 = ps[Math.min(ps.length - 1, i + 2)];
		for (let k = 0; k < per; k++) {
			const u = k / per;
			const u2 = u * u;
			const u3 = u2 * u;
			out.push([
				0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
				0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
			]);
		}
	}
	out.push(ps[ps.length - 1]);
	return out;
};
type Curve = {p: Pt[]; u: number[]; nrm: Pt[]; len: number};
const mkCurve = (ps: Pt[]): Curve => {
	const p = catmull(ps, 16);
	const u = [0];
	for (let i = 1; i < p.length; i++) u.push(u[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
	const nrm = p.map((_, i): Pt => {
		const a = p[Math.max(0, i - 1)];
		const b = p[Math.min(p.length - 1, i + 1)];
		const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
		return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
	});
	return {p, u, nrm, len: u[u.length - 1]};
};
const onCurve = (c: Curve, uu: number, l = 0): Pt => {
	const x = Math.max(0, Math.min(c.len, uu));
	let i = 0;
	while (i < c.u.length - 2 && c.u[i + 1] < x) i++;
	const f = clamp01((x - c.u[i]) / (c.u[i + 1] - c.u[i] || 1));
	const p = lerpPt(c.p[i], c.p[i + 1], f);
	const nm = lerpPt(c.nrm[i], c.nrm[i + 1], f);
	return [p[0] + nm[0] * l, p[1] + nm[1] * l];
};
const CRATER: Pt = TP(SB, 0, 22);
const CRS = 0.76; // crater size
const NEW = mkCurve([[CRATER[0] - 56 * CRS, CRATER[1] + 40 * CRS], [334, 772], [272, 922], [200, 1070], [140, 1236]]);
const tNew = tkeys([BL + 0.22, BL + 0.6, BL + 1.4, BL + 2.4, BL + 3.4], [0, 80, 270, 460, 590]);
const NEW_W = 34;

// static decoration
const T_ROCKS = Array.from({length: 90}, (_, i) => ({x: 30 + hsh(i, 61) * 1020, y: 470 + hsh(i, 62) * 900, r: 2.5 + hsh(i, 63) * 5, o: 0.25 + 0.3 * hsh(i, 64)}));
const T_LOBES = Array.from({length: 9}, (_, i) => ({x: 80 + hsh(i, 71) * 920, y: 560 + hsh(i, 72) * 760, rx: 90 + hsh(i, 73) * 140, ry: 40 + hsh(i, 74) * 60, a: -30 + hsh(i, 75) * 60}));
const T_STARS = Array.from({length: 40}, (_, i) => ({x: hsh(i, 81) * 1080, y: hsh(i, 82) * 400, r: 0.9 + hsh(i, 83) * 1.6, o: 0.25 + 0.5 * hsh(i, 84)}));
type THouse = {x: number; y: number; w: number; h: number; church?: boolean};
const T_HOUSES: THouse[] = [
	{x: 940, y: 1236, w: 72, h: 40, church: true},
	{x: 858, y: 1268, w: 62, h: 36},
	{x: 966, y: 1320, w: 60, h: 34},
	{x: 870, y: 1334, w: 56, h: 32},
];
const T_TREES: {x: number; y: number; r: number}[] = [
	{x: 826, y: 1318, r: 14},
	{x: 1032, y: 1216, r: 16},
	{x: 1040, y: 1290, r: 15},
	{x: 942, y: 1300, r: 13},
	{x: 1010, y: 1180, r: 12},
];

const THouseTop: React.FC<{h: THouse}> = ({h}) => {
	const {x, y, w} = h;
	const hh = h.h;
	const rf = w * 0.32; // front roof slope seen from above
	const rb = w * 0.2;
	const top = y - hh;
	return (
		<g>
			<ellipse cx={x + w / 2} cy={y + 2} rx={w * 0.62} ry={7} fill="#140818" opacity={0.45} />
			<rect x={x} y={top} width={w} height={hh} fill="#F6E6D2" />
			<path d={dPath([[x - 4, top + 2], [x + w + 4, top + 2], [x + w + 1, top - rf], [x - 1, top - rf]])} fill="#FF4D94" />
			<path d={dPath([[x - 1, top - rf], [x + w + 1, top - rf], [x + w - 2, top - rf - rb], [x + 2, top - rf - rb]])} fill="#C81E6A" />
			<path d={`M ${f1(x - 1)} ${f1(top - rf)} L ${f1(x + w + 1)} ${f1(top - rf)}`} stroke="#FFB3D1" strokeWidth={2} />
			<rect x={x + w * 0.14} y={top + hh * 0.28} width={w * 0.18} height={hh * 0.32} rx={2} fill={GOLD} />
			<rect x={x + w * 0.68} y={top + hh * 0.28} width={w * 0.18} height={hh * 0.32} rx={2} fill={GOLD} />
			<rect x={x + w * 0.42} y={top + hh * 0.42} width={w * 0.16} height={hh * 0.58} rx={2} fill="#4A2A48" />
			{h.church ? (
				<g>
					<rect x={x + w - 6} y={top - 62} width={24} height={62 + hh} fill="#F6E6D2" />
					<rect x={x + w - 6} y={top - 62} width={24} height={8} fill="#D6BCA6" />
					<circle cx={x + w + 6} cy={top - 66} r={15} fill={TEAL} />
					<circle cx={x + w + 1} cy={top - 71} r={5} fill="#B9FFF8" opacity={0.7} />
					<rect x={x + w + 1} y={top - 44} width={10} height={14} rx={5} fill={GOLD} />
				</g>
			) : null}
		</g>
	);
};

/** cable-and-plunger detonator with an engineer (hard hat) behind it; origin = centre of the box's front edge */
const Detonator: React.FC<{x: number; y: number; press: number}> = ({x, y, press}) => {
	const rod = 30 - 15 * press;
	return (
		<g transform={`translate(${f1(x)} ${f1(y)})`}>
			<ellipse cx={14} cy={8} rx={46} ry={11} fill="#140818" opacity={0.45} />
			{/* engineer behind the box */}
			<g transform="translate(26 -10)">
				<rect x={-8} y={-30} width={7} height={30} rx={3} fill="#2A1A3A" />
				<rect x={2} y={-30} width={7} height={30} rx={3} fill="#2A1A3A" />
				<rect x={-12} y={-62} width={25} height={36} rx={8} fill={MAGENTA} stroke={INK} strokeWidth={3} />
				<rect x={-12} y={-46} width={25} height={5} fill="#FFE36A" />
				<path d={`M -8 -54 L -30 ${f1(-30 - rod + 2)}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
				<circle cx={0} cy={-73} r={10} fill="#F2C29A" stroke={INK} strokeWidth={3} />
				<path d="M -12 -76 Q 0 -94 12 -76 Z" fill={GOLD} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
				<rect x={-15} y={-78} width={30} height={5} rx={2} fill={GOLD} stroke={INK} strokeWidth={2.5} />
			</g>
			{/* box */}
			<path d="M -20 -16 L 20 -16 L 20 0 L -20 0 Z" fill="#FFE07A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
			<path d="M -20 0 L 20 0 L 20 16 L -20 16 Z" fill={GOLD} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
			<rect x={-2.5} y={-8 - rod} width={5} height={rod} fill={INK} />
			<rect x={-16} y={-14 - rod} width={32} height={7} rx={3} fill={INK} />
		</g>
	);
};

export const TunnelDiagram: React.FC<{t0?: number; t1?: number}> = ({t0 = W(62), t1 = W(71)}) => {
	const t = useT();
	if (t < t0 || t >= t1 + XF) return null;
	const op = easeInOut((t - t0) / XF);
	const id = 'td';
	const age = t - BL; // time since the blast
	const blown = age >= 0;

	// ------------------------------------------------------------------ tube lava state
	const tail = blown ? tTail(t) : -1; // upstream end of the lava still in the tube
	const sLava0 = Math.max(SW0, tail);
	const lavaInWindow = sLava0 < SW1 + 0.06;
	const heatStops = Array.from({length: 52}, (_, i) => {
		const s = i * 0.022;
		return {s, h: blown ? heatAt(s, t) : 1};
	});
	const hA = heatStops[0].s;
	const hB = heatStops[heatStops.length - 1].s;
	const gA = TP(hA, 0, LAVA_V);
	const gB = TP(hB, 0, LAVA_V);

	const slot: Pt[] = [TP(SW0, SLOT_W), TP(SW1, SLOT_W), TP(SW1, -SLOT_W), TP(SW0, -SLOT_W)];
	const slotD = dPath(slot);

	// lava band in the tube (with a rounded upstream end once it drains)
	const band: Pt[] = [];
	if (lavaInWindow) {
		const sEnd = SW1 + 0.08;
		const N = 14;
		for (let i = 0; i <= N; i++) band.push(TP(lerp(sLava0, sEnd, i / N), LAVA_W, LAVA_V));
		for (let i = N; i >= 0; i--) band.push(TP(lerp(sLava0, sEnd, i / N), -LAVA_W, LAVA_V));
		if (blown && tail > SW0) {
			// the rounded end grows from flat as the tail leaves the end face (never reaches back over it)
			const capR = Math.min(26 / TLEN, tail - SW0);
			for (let k = 1; k < 12; k++) {
				const a = -Math.PI / 2 + (Math.PI * k) / 12;
				band.push(TP(sLava0 - capR * Math.cos(a), LAVA_W * Math.sin(a), LAVA_V));
			}
		}
	}
	// streaming streaks + crust flakes on the tube lava
	const streaks: {a: Pt; b: Pt; w: number; o: number}[] = [];
	const flakes: {o: number; pts: Pt[]}[] = [];
	if (lavaInWindow) {
		const lanes = [-40, -26, -12, 2, 16, 30];
		lanes.forEach((l, j) => {
			const v = 230 * (0.85 + 0.25 * hsh(j, 91));
			const sp = 74;
			const off = v * t + j * 23;
			const u0 = sLava0 * TLEN;
			const u1 = (SW1 + 0.08) * TLEN;
			const k0 = Math.floor((u0 - off) / sp) - 1;
			const k1 = Math.ceil((u1 - off) / sp) + 1;
			for (let k = k0; k <= k1; k++) {
				const ua = k * sp + off + hsh(k, j, 92) * 30;
				const len = 14 + hsh(k, j, 93) * 34;
				const fo = clamp01((ua - u0) / 24) * clamp01((u1 - ua - len) / 24);   // fade at the lava's ends (no pop)
				if (fo <= 0) continue;
				const ll = l + (hsh(k, j, 94) - 0.5) * 8;
				streaks.push({a: TP(ua / TLEN, ll, LAVA_V), b: TP((ua + len) / TLEN, ll, LAVA_V), w: 3 + 3 * hsh(k, j, 95), o: (0.45 + 0.4 * hsh(k, j, 96)) * fo});
			}
		});
		[44, 20, -10].forEach((l, j) => {
			const v = 205 + 20 * j;
			const sp = 70 + 22 * j;
			const off = v * t + j * 37;
			const u0 = sLava0 * TLEN;
			const u1 = (SW1 + 0.08) * TLEN;
			const k0 = Math.floor((u0 - off) / sp) - 1;
			const k1 = Math.ceil((u1 - off) / sp) + 1;
			for (let k = k0; k <= k1; k++) {
				if (hsh(k, j, 100) < 0.5) continue;
				const ua = k * sp + off + hsh(k, j, 101) * 20;
				const len = 22 + hsh(k, j, 97) * 22;
				const fo = clamp01((ua - u0) / 24) * clamp01((u1 - ua - len) / 24);
				if (fo <= 0) continue;
				const wl = 3.5 + 3.5 * hsh(k, j, 98);
				const ll = l + (hsh(k, j, 99) - 0.5) * 14;
				const s0 = ua / TLEN;
				const s1 = (ua + len) / TLEN;
				const sm = (s0 + s1) / 2;
				flakes.push({o: fo, pts: [TP(s0, ll + wl * 0.6, LAVA_V), TP(sm, ll + wl, LAVA_V), TP(s1, ll + wl * 0.5, LAVA_V), TP(s1 + 0.006, ll - wl * 0.4, LAVA_V), TP(sm, ll - wl, LAVA_V), TP(s0 - 0.004, ll - wl * 0.7, LAVA_V)]});
			}
		});
	}

	// the end face of the window (crust cut through, the tube's round mouth) at its upstream end
	const ell = (k: number, dl = 0): Pt[] =>
		Array.from({length: 33}, (_, i) => {
			const a = (i / 32) * Math.PI * 2;
			return TP(SW0, (ARCH.rl + dl) * Math.cos(a) * k, ARCH.v + (ARCH.rv + dl) * Math.sin(a) * k);
		});
	const capQuad: Pt[] = [TP(SW0, -SLOT_W, 0), TP(SW0, SLOT_W, 0), TP(SW0, SLOT_W, 150), TP(SW0, -SLOT_W, 150)];
	const archD = dPath(ell(1));
	const capD = dPath(capQuad) + ' ' + archD;

	// ------------------------------------------------------------------ blast, crater, new channel
	const crK = sstep(0.04, 0.32, age); // crater shows up under the fireball
	const craterPts: Pt[] = Array.from({length: 18}, (_, i) => {
		const a = (i / 18) * Math.PI * 2;
		const rr = 0.86 + 0.26 * hsh(i, 101);
		return [CRATER[0] + Math.cos(a) * 96 * CRS * rr, CRATER[1] + Math.sin(a) * 68 * CRS * rr];
	});
	const poolPts = craterPts.map((p): Pt => lerpPt(CRATER, p, 0.72));
	const uN = blown ? tNew(t) : 0;
	const chan = (() => {
		if (uN < 2) return null;
		const N = Math.max(4, Math.ceil(uN / 8));
		const L: Pt[] = [];
		const R: Pt[] = [];
		const C: Pt[] = [];
		for (let i = 0; i <= N; i++) {
			const u = (uN * i) / N;
			const nose = Math.sqrt(clamp01((uN - u) / 34));
			const st = 0.75 + 0.25 * clamp01(u / 40);
			const hw = NEW_W * nose * st;
			L.push(onCurve(NEW, u, hw));
			R.push(onCurve(NEW, u, -hw));
			C.push(onCurve(NEW, u, 0));
		}
		return {outline: [...L, ...[...R].reverse()], C, L, R};
	})();
	const chanPlates: Pt[][] = [];
	const chanStreaks: Pt[][] = [];
	if (chan) {
		// crusted levees along both banks (inner edge wavy, drifting slowly with the flow)
		[1, -1].forEach((side) => {
			const N = Math.max(4, Math.ceil(uN / 8));
			const outer: Pt[] = [];
			const inner: Pt[] = [];
			for (let i = 0; i <= N; i++) {
				const u = (uN * i) / N;
				const nose = Math.sqrt(clamp01((uN - u) / 34));
				const hw = NEW_W * nose * (0.75 + 0.25 * clamp01(u / 40));
				const w = 0.58 + 0.08 * Math.sin((u - 60 * t) * 0.09 + side) + 0.05 * Math.sin((u - 60 * t) * 0.23 + 2 * side);
				outer.push(onCurve(NEW, u, side * hw * 1.05));
				inner.push(onCurve(NEW, u, side * hw * w));
			}
			chanPlates.push([...outer, ...inner.reverse()]);
		});
		// rafts of crust riding down the middle
		{
			const v = 125;
			const sp = 58;
			const off = v * t;
			const k0 = Math.floor((0 - off) / sp) - 1;
			const k1 = Math.ceil((uN - off) / sp) + 1;
			for (let k = k0; k <= k1; k++) {
				if (hsh(k, 115) < 0.35) continue;
				const ua = k * sp + off + hsh(k, 116) * 20;
				const len = 12 + 12 * hsh(k, 117);
				if (ua < 6 || ua + len > uN - 26) continue;
				const l = (hsh(k, 118) - 0.5) * NEW_W * 0.6;
				const w = 4 + 4 * hsh(k, 119);
				chanPlates.push([onCurve(NEW, ua, l + w * 0.5), onCurve(NEW, ua + len * 0.5, l + w), onCurve(NEW, ua + len, l + w * 0.3), onCurve(NEW, ua + len, l - w * 0.6), onCurve(NEW, ua + len * 0.4, l - w), onCurve(NEW, ua, l - w * 0.4)]);
			}
		}
		const sv = 170;
		const sp2 = 44;
		[-8, 6].forEach((l, j) => {
			const off = sv * t + j * 21;
			const k0 = Math.floor((0 - off) / sp2) - 1;
			const k1 = Math.ceil((uN - off) / sp2) + 1;
			for (let k = k0; k <= k1; k++) {
				const ua = k * sp2 + off + hsh(k, j, 112) * 14;
				const len = 12 + hsh(k, j, 113) * 20;
				if (ua < 0 || ua + len > uN - 20) continue;
				chanStreaks.push([onCurve(NEW, ua, l), onCurve(NEW, ua + len / 2, l), onCurve(NEW, ua + len, l)]);
			}
		});
	}
	const chanFront = chan ? onCurve(NEW, Math.max(0, uN - 10), 0) : null;

	// fireball + smoke + debris
	// smoke and fire drift up and to the right on a breeze, away from the vent (which sits up-left of the breach); the
	// smoke is gone before «at the source», so the vent → breach link stays in view
	const E0 = TP(SB, 0, 12);
	const fire: {p: Pt; r: number; o: number}[] = [];
	const smoke: {p: Pt; r: number; o: number}[] = [];
	if (blown && age < 1.6) {
		for (let i = 0; i < 18; i++) {
			const dly = 0.012 * i;
			const a = age - dly;
			if (a <= 0) continue;
			const ang = -Math.PI / 2 + (hsh(i, 121) - 0.32) * 2.1;
			const dist = (14 + 74 * hsh(i, 122)) * easeInOut(clamp01(a / 0.5));
			const rise = (70 + 60 * hsh(i, 124)) * Math.pow(a, 0.75);
			const wind = (125 * a * a) / (a + 0.25);
			const p: Pt = [E0[0] + Math.cos(ang) * dist + wind, E0[1] + Math.sin(ang) * dist * 0.75 - rise];
			const r = (22 + 38 * hsh(i, 123)) * (0.35 + 0.65 * (1 - Math.pow(1 - clamp01(a / 0.35), 3))) * (1 + 0.4 * a);
			if (i < 12) fire.push({p: [p[0] - 0.6 * wind, p[1]], r: r * 1.1, o: 1 - sstep(0.1, 0.6, a)});
			smoke.push({p: [p[0], p[1] - 8], r: r * 1.15, o: sstep(0.06, 0.35, a) * (1 - sstep(0.65, 1.25, a)) * 0.72});
		}
	}
	const flash = blown ? 0.75 * Math.pow(1 - clamp01(age / 0.2), 2) : 0;
	const debris: {p: Pt; a: number; s: number; o: number; hot: boolean}[] = [];
	if (blown && age < 1.4) {
		for (let i = 0; i < 18; i++) {
			const ang = -Math.PI / 2 + (hsh(i, 131) - 0.5) * 2.6;
			const spd = 330 + 380 * hsh(i, 132);
			const g = 1250;
			const x = E0[0] + Math.cos(ang) * spd * age;
			const y = E0[1] + Math.sin(ang) * spd * age + 0.5 * g * age * age;
			const life = 0.75 + 0.5 * hsh(i, 133);
			if (age > life) continue;
			debris.push({p: [x, y], a: age * (300 + 500 * hsh(i, 134)), s: 4 + 6 * hsh(i, 135), o: 1 - sstep(life - 0.25, life, age), hot: i % 3 === 0});
		}
	}
	const ring = blown && age < 0.7 ? age / 0.7 : -1;

	// charges, cable, plunger
	const charges = [-32, 0, 32].map((l, i) => ({l, p: TP(SB, l, 4), k: easeInOut((t - TT.charges[i]) / 0.35)}));
	const wireK = clamp01((t - TT.wire[0]) / (TT.wire[1] - TT.wire[0]));
	const DET: Pt = [784, 540];
	const wireStart = TP(SB, 36, -2);
	const wireD = `M ${P2(wireStart)} C ${P2([wireStart[0] + 90, wireStart[1] - 70])} ${P2([DET[0] - 140, DET[1] + 40])} ${P2([DET[0] - 20, DET[1] + 4])}`;
	const wireO = blown ? 1 - sstep(0.0, 0.5, age) : 1;
	const press = sstep(TT.press, TT.blast - 0.02, t);
	const blink = (i: number) => 0.55 + 0.45 * Math.sin(t * 9 + i * 1.3);

	// tongue at the town: creeps on until the supply is cut, then crusts over
	const tdExit = tDrain(1.0);
	const lobeCool = sstep(tdExit - 0.1, tdExit + 1.2, t);
	const sF = tkeys([t0 - 0.5, BL + 0.3, BL + 1.8], [1.045, 1.07, 1.08])(t);
	const lobe: Pt[] = (() => {
		const c0 = 0.955;
		const len = (sF - c0) * TLEN + 30;
		const cc = TP(c0 + (len * 0.42) / TLEN, 0, 0);
		const pts: Pt[] = [];
		for (let i = 0; i < 48; i++) {
			const th = (i / 48) * Math.PI * 2;
			const c = Math.cos(th);
			const sn = Math.sin(th);
			const ra = c > 0 ? len * 0.58 : len * 0.42;
			const rc = c > 0 ? 58 : lerp(58, 30, Math.pow(-c, 0.7));
			let r = 1 / Math.sqrt((c / ra) ** 2 + (sn / rc) ** 2);
			r *= 1 + 0.08 * Math.sin(5 * th + 0.6) * Math.max(0, c);
			pts.push([cc[0] + (Td[0] * c + Tn[0] * sn) * r, cc[1] + (Td[1] * c + Tn[1] * sn) * r]);
		}
		return pts;
	})();
	const lobeD = dPath(lobe);
	// crust plates on the tongue: a jittered grid fixed on the ground (the advancing front uncovers more of it), the melt
	// glowing in the seams until the supply is cut and it crusts over
	const lobePlates: Pt[][] = (() => {
		const out: Pt[][] = [];
		const G = 26;
		const vtx = (i: number, j: number): Pt => {
			const a = i * G + (hsh(i, j, 173) - 0.5) * G * 0.6;
			const b = j * G + (j % 2) * G * 0.5 + (hsh(i, j, 174) - 0.5) * G * 0.6;
			return TP(0.955 + a / TLEN, b, 0);
		};
		const iMax = Math.ceil(((sF - 0.955) * TLEN + 40) / G);
		for (let i = 0; i <= iMax; i++)
			for (let j = -4; j <= 3; j++) {
				const raw = [vtx(i, j), vtx(i + 1, j), vtx(i + 1, j + 1), vtx(i, j + 1)];
				const cx = raw.reduce((q, p) => q + p[0], 0) / 4;
				const cy = raw.reduce((q, p) => q + p[1], 0) / 4;
				out.push(raw.map((p): Pt => {
					const L = Math.hypot(cx - p[0], cy - p[1]) || 1;
					const m = Math.min(3, L * 0.4) / L;
					return [p[0] + (cx - p[0]) * m, p[1] + (cy - p[1]) * m];
				}));
			}
		return out;
	})();

	// embers
	const embers: {p: Pt; r: number; o: number}[] = [];
	for (let j = 0; j < 22; j++) {
		const T = 1.0 + hsh(j, 141) * 0.8;
		const ph = hsh(j, 142) * T;
		const a = (t + ph) % T;
		const cyc = Math.floor((t + ph) / T);
		const which = hsh(j, cyc, 143);
		let base: Pt;
		let hot = 1;
		if (which < 0.45) {
			const s = lerp(SW0 + 0.05, SW1, hsh(j, cyc, 144));
			base = TP(s, (hsh(j, cyc, 145) - 0.5) * 60, 10);
			hot = blown ? heatAt(s, t) : 1;
		} else if (which < 0.7) {
			base = [CRATER[0] + (hsh(j, cyc, 146) - 0.5) * 90 * CRS, CRATER[1] + (hsh(j, cyc, 147) - 0.5) * 50 * CRS];
			hot = crK;
		} else {
			const u = hsh(j, cyc, 148) * Math.max(1, uN - 20);
			base = onCurve(NEW, u, (hsh(j, cyc, 149) - 0.5) * 30);
			hot = uN > 20 ? 1 : 0;
		}
		if (hot < 0.05) continue;
		const k = a / T;
		embers.push({p: [base[0] + 18 * k + 5 * Math.sin(a * 6 + j), base[1] - (50 + 80 * hsh(j, cyc, 150)) * k], r: 1.8 + 2.2 * hsh(j, cyc, 151), o: hot * clamp01(a / 0.12) * (1 - sstep(0.5, 1, k))});
	}

	// plume off the summit
	const puffs = Array.from({length: 9}, (_, j) => {
		const T = 7;
		const a = (t + j * (T / 9)) % T;
		const k = a / T;
		return {x: 382 + 150 * k + 26 * Math.sin(j * 2.1 + t * 0.5), y: 196 - 300 * k, r: 40 + 110 * k, o: 0.55 * Math.sin(Math.PI * k)};
	});
	// a wisp of smoke keeps rising from the breach after the blast
	const wisps = blown
		? Array.from({length: 6}, (_, j) => {
				const T = 2.2;
				const a = age - j * (T / 6);
				if (a < 0.4) return null;
				const aa = (a - 0.4) % T;
				const k = aa / T;
				return {p: [CRATER[0] + 18 + 125 * k + 8 * Math.sin(j + t), CRATER[1] - 28 - 210 * k] as Pt, r: 16 + 40 * k, o: 0.26 * Math.sin(Math.PI * k) * sstep(0.4, 1.2, age)};
			}).filter((x): x is {p: Pt; r: number; o: number} => !!x)
		: [];

	// camera: a slow push in, settling a little toward the breach and the new channel
	const kc = easeInOut((t - t0) / (t1 + XF - t0));
	const zoom = lerp(1.0, 1.035, kc);
	const fx = lerp(560, 540, kc);
	const fy = lerp(860, 850, kc);
	const cam = `translate(560 830) scale(${zoom.toFixed(4)}) translate(${f1(-fx)} ${f1(-fy)})`;

	const exitHeat = blown ? heatAt(0.87, t) : 1;
	const mouthHeat = blown ? heatAt(SW0 + 0.01, t) : 1;
	const skylight = TP(0.87, 0, 0);

	return (
		<AbsoluteFill style={{opacity: op, background: '#140820'}}>
			<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
				<defs>
					<Defs id={id} />
					<linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#0E0619" />
						<stop offset="0.12" stopColor="#25093E" />
						<stop offset="0.24" stopColor="#6A1C5C" />
					</linearGradient>
					<linearGradient id={`${id}-ground`} x1="0" y1="420" x2="0" y2="1920" gradientUnits="userSpaceOnUse">
						<stop offset="0" stopColor="#6A4278" />
						<stop offset="0.25" stopColor="#523260" />
						<stop offset="0.6" stopColor="#3C2249" />
						<stop offset="1" stopColor="#25122F" />
					</linearGradient>
					<radialGradient id={`${id}-puff`}>
						<stop offset="0" stopColor="#7B5C8E" stopOpacity="0.9" />
						<stop offset="0.6" stopColor="#5A3F72" stopOpacity="0.55" />
						<stop offset="1" stopColor="#4A3060" stopOpacity="0" />
					</radialGradient>
					<radialGradient id={`${id}-smoke`}>
						<stop offset="0" stopColor="#5E4A6A" stopOpacity="0.95" />
						<stop offset="0.65" stopColor="#47364F" stopOpacity="0.75" />
						<stop offset="1" stopColor="#3A2A44" stopOpacity="0" />
					</radialGradient>
					<radialGradient id={`${id}-fire`}>
						<stop offset="0" stopColor="#FFFBE6" />
						<stop offset="0.3" stopColor="#FFE170" />
						<stop offset="0.65" stopColor="#FF8A1E" stopOpacity="0.9" />
						<stop offset="1" stopColor="#E0301A" stopOpacity="0" />
					</radialGradient>
					<radialGradient id={`${id}-hot`}>
						<stop offset="0" stopColor="#FFF6C8" stopOpacity="1" />
						<stop offset="0.35" stopColor="#FFD54A" stopOpacity="0.85" />
						<stop offset="1" stopColor="#FF6A10" stopOpacity="0" />
					</radialGradient>
					<radialGradient id={`${id}-pool`}>
						<stop offset="0" stopColor="#FFF2B0" />
						<stop offset="0.45" stopColor="#FFC23A" />
						<stop offset="1" stopColor="#FF6A16" />
					</radialGradient>
					<radialGradient id={`${id}-cone`} cx="0.35" cy="0.3" r="0.9">
						<stop offset="0" stopColor="#5A2C78" />
						<stop offset="1" stopColor="#2E1546" />
					</radialGradient>
					{/* across the tube: the stream is hottest in the middle */}
					<linearGradient id={`${id}-lavaX`} gradientUnits="userSpaceOnUse" x1={TP(0.5, LAVA_W, LAVA_V)[0]} y1={TP(0.5, LAVA_W, LAVA_V)[1]} x2={TP(0.5, -LAVA_W, LAVA_V)[0]} y2={TP(0.5, -LAVA_W, LAVA_V)[1]}>
						<stop offset="0" stopColor="#FF6A16" />
						<stop offset="0.25" stopColor="#FFB93A" />
						<stop offset="0.55" stopColor="#FFE27A" />
						<stop offset="1" stopColor="#FFB13A" />
					</linearGradient>
					<linearGradient id={`${id}-wallX`} gradientUnits="userSpaceOnUse" x1={TP(0.5, SLOT_W, CRUST)[0]} y1={TP(0.5, SLOT_W, CRUST)[1]} x2={TP(0.5, LAVA_W, LAVA_V)[0]} y2={TP(0.5, LAVA_W, LAVA_V)[1]}>
						<stop offset="0" stopColor="#3A0E1A" />
						<stop offset="1" stopColor="#B8361A" />
					</linearGradient>
					{/* along the tube: how hot each part still is (drains from the breach downward after the blast) */}
					<linearGradient id={`${id}-heat`} gradientUnits="userSpaceOnUse" x1={gA[0]} y1={gA[1]} x2={gB[0]} y2={gB[1]}>
						{heatStops.map((h, i) => (
							<stop key={i} offset={(h.s - hA) / (hB - hA)} stopColor="#fff" stopOpacity={h.h} />
						))}
					</linearGradient>
					<mask id={`${id}-heatM`} maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
						<rect x={0} y={0} width={1080} height={1920} fill={`url(#${id}-heat)`} />
					</mask>
					{/* the same at ground level (v = 0): the glow and the flow seen through the roof */}
					<linearGradient id={`${id}-heatS`} gradientUnits="userSpaceOnUse" x1={TP(hA)[0]} y1={TP(hA)[1]} x2={TP(hB)[0]} y2={TP(hB)[1]}>
						{heatStops.map((h, i) => (
							<stop key={i} offset={(h.s - hA) / (hB - hA)} stopColor="#fff" stopOpacity={h.h} />
						))}
					</linearGradient>
					<mask id={`${id}-heatMS`} maskUnits="userSpaceOnUse" x={0} y={0} width={1080} height={1920}>
						<rect x={0} y={0} width={1080} height={1920} fill={`url(#${id}-heatS)`} />
					</mask>
					<clipPath id={`${id}-slot`}>
						<path d={slotD} />
					</clipPath>
					<clipPath id={`${id}-arch`}>
						<path d={archD} />
					</clipPath>
					<clipPath id={`${id}-chan`}>
						<path d={chan ? dPath(chan.outline) : 'M0 0Z'} />
					</clipPath>
					<clipPath id={`${id}-lobe`}>
						<path d={lobeD} />
					</clipPath>
					<clipPath id={`${id}-pool`}>
						<path d={dPath(poolPts)} />
					</clipPath>
				</defs>

				<rect x={0} y={0} width={1080} height={1920} fill={`url(#${id}-sky)`} />
				<g transform={cam}>
					{T_STARS.map((s, i) => (
						<circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF3E0" opacity={s.o} />
					))}
					<ellipse cx={420} cy={360} rx={520} ry={180} fill="#FF2E88" opacity={0.18} filter={`url(#${id}-b36)`} />
					{/* distant ridges on the horizon */}
					<path d="M -60 450 Q 120 380 260 420 L 260 520 L -60 520 Z" fill="#3A1C52" />
					<path d="M 600 430 Q 800 360 1140 410 L 1140 520 L 600 520 Z" fill="#3A1C52" />
					{/* the ground (the volcano's flank, seen from above) */}
					<path d="M -60 440 Q 540 400 1140 436 L 1140 2000 L -60 2000 Z" fill={`url(#${id}-ground)`} />
					{T_LOBES.map((l, i) => (
						<ellipse key={i} cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} transform={`rotate(${f1(l.a)} ${f1(l.x)} ${f1(l.y)})`} fill="#2C1838" opacity={0.28} />
					))}
					<clipPath id={`${id}-gclip`}>
						<path d="M -60 440 Q 540 400 1140 436 L 1140 2000 L -60 2000 Z" />
					</clipPath>
					<g clipPath={`url(#${id}-gclip)`}>
						{[0, 1, 2, 3, 4, 5].map((k) => (
							<ellipse key={k} cx={380} cy={330} rx={300 + 150 * k} ry={(300 + 150 * k) * 0.52} fill="none" stroke="#9A78AE" strokeWidth={2} opacity={0.16} />
						))}
					</g>
					{T_ROCKS.map((k, i) => (
						<ellipse key={i} cx={k.x} cy={k.y} rx={k.r * 1.4} ry={k.r * 0.8} fill="#2A1634" opacity={k.o} />
					))}
					<ellipse cx={950} cy={1250} rx={190} ry={120} fill="#2E9A7E" opacity={0.35} filter={`url(#${id}-b12)`} />

					{/* the volcano */}
					<path d="M 70 486 Q 250 330 340 214 Q 382 186 424 212 Q 520 330 690 486 Q 380 520 70 486 Z" fill={`url(#${id}-cone)`} />
					<path d="M 382 196 Q 420 330 470 500 Q 600 494 690 486 Q 520 330 424 212 Q 404 196 382 196 Z" fill="#2A1242" opacity={0.75} />
					<path d="M 70 486 Q 250 330 340 214 Q 382 186 424 212 Q 520 330 690 486" fill="none" stroke="#9A62C0" strokeWidth={3} opacity={0.45} />
					<ellipse cx={382} cy={206} rx={40} ry={13} fill="#FF7A1A" opacity={0.9} filter={`url(#${id}-b7)`} />
					<ellipse cx={382} cy={206} rx={26} ry={7} fill="#FFD25A" />
					{puffs.map((p, j) => (
						<circle key={j} cx={p.x} cy={p.y} r={p.r} fill={`url(#${id}-puff)`} opacity={p.o} />
					))}

					{/* the vent at the volcano's foot (the source) */}
					<ellipse cx={TV[0]} cy={TV[1] + 4} rx={58} ry={24} fill="#FF6A10" opacity={0.6} filter={`url(#${id}-b12)`} />
					<path d={`M ${TV[0] - 48} ${TV[1] + 10} Q ${TV[0] - 30} ${TV[1] - 22} ${TV[0]} ${TV[1] - 24} Q ${TV[0] + 30} ${TV[1] - 22} ${TV[0] + 48} ${TV[1] + 10} Z`} fill="#3E1F52" />
					<ellipse cx={TV[0]} cy={TV[1] - 18} rx={20} ry={7} fill="#FFD25A" />

					{/* the hidden parts of the tube (under the solid crust): x-ray outline + the lava's glow through the roof, with
					    pulses running along it (the lava flows from the vent toward the town, later from the vent into the breach) */}
					<g mask={`url(#${id}-heatMS)`}>
						<g filter={`url(#${id}-b7)`} opacity={0.55}>
							<path d={dPath([TP(0.03, 40), TP(SW0, 40), TP(SW0, -40), TP(0.03, -40)])} fill="#FF7A1A" />
							<path d={dPath([TP(SW1, 40), TP(1.0, 40), TP(1.0, -40), TP(SW1, -40)])} fill="#FF7A1A" />
						</g>
						<path d={`M ${P2(TP(0.04, 0))} L ${P2(TP(SW0, 0))} M ${P2(TP(SW1, 0))} L ${P2(TP(0.99, 0))}`} stroke="#FFC860" strokeWidth={16} opacity={0.35} strokeLinecap="round" filter={`url(#${id}-b4)`} />
						<g filter={`url(#${id}-b2)`}>
							<path d={`M ${P2(TP(0.035, 0))} L ${P2(TP(SW0 - 0.01, 0))}`} stroke="#FFE68A" strokeWidth={7} strokeDasharray="16 30" strokeDashoffset={f1(-140 * t)} strokeLinecap="round" opacity={0.7} />
							<path d={`M ${P2(TP(SW1 + 0.01, 0))} L ${P2(TP(0.975, 0))}`} stroke="#FFE68A" strokeWidth={7} strokeDasharray="16 30" strokeDashoffset={f1(-140 * t)} strokeLinecap="round" opacity={0.7} />
						</g>
					</g>
					<path
						d={`M ${P2(TP(0.05, TUBE_W))} L ${P2(TP(SW0, TUBE_W))} M ${P2(TP(0.05, -TUBE_W))} L ${P2(TP(SW0, -TUBE_W))} M ${P2(TP(SW1, TUBE_W))} L ${P2(TP(0.985, TUBE_W))} M ${P2(TP(SW1, -TUBE_W))} L ${P2(TP(0.985, -TUBE_W))}`}
						stroke="#F2D6F0"
						strokeWidth={3}
						strokeDasharray="12 10"
						strokeLinecap="round"
						opacity={0.6}
					/>

					{/* ---------------------------------------------- the window into the tube */}
					<g mask={`url(#${id}-heatM)`} style={{mixBlendMode: 'screen'}}>
						<path d={slotD} fill="#FF5A0A" opacity={0.75} filter={`url(#${id}-b22)`} />
					</g>
					<g clipPath={`url(#${id}-slot)`}>
						<path d={slotD} fill="#16050C" />
						<path d={dPath([TP(SW0, SLOT_W, CRUST), TP(SW1, SLOT_W, CRUST), TP(SW1, -SLOT_W, 300), TP(SW0, -SLOT_W, 300)])} fill="#2A0A14" />
						<g mask={`url(#${id}-heatM)`}>
							<path d={dPath([TP(SW0, SLOT_W, CRUST), TP(SW1, SLOT_W, CRUST), TP(SW1, -SLOT_W, 300), TP(SW0, -SLOT_W, 300)])} fill={`url(#${id}-wallX)`} />
						</g>
						{/* far wall of the cut: the crust in section */}
						<path d={dPath([TP(SW0, SLOT_W, 0), TP(SW1, SLOT_W, 0), TP(SW1, SLOT_W, CRUST), TP(SW0, SLOT_W, CRUST)])} fill="#4A2A50" />
						<path d={dPath([TP(SW0, SLOT_W, 0), TP(SW1, SLOT_W, 0), TP(SW1, SLOT_W, 9), TP(SW0, SLOT_W, 9)])} fill="#8E6A9C" />
						<path d={dPath([TP(SW0, SLOT_W, 18), TP(SW1, SLOT_W, 18), TP(SW1, SLOT_W, 27), TP(SW0, SLOT_W, 27)])} fill="#5C3862" />
						<g mask={`url(#${id}-heatM)`}>
							<path d={`M ${P2(TP(SW0, SLOT_W, CRUST - 2))} L ${P2(TP(SW1, SLOT_W, CRUST - 2))}`} stroke="#FF7A2A" strokeWidth={4} opacity={0.8} />
						</g>
						{/* end face with the tube's round mouth */}
						<path d={capD} fill="#4A2A50" fillRule="evenodd" />
						<path d={dPath([TP(SW0, -SLOT_W, 0), TP(SW0, SLOT_W, 0), TP(SW0, SLOT_W, 9), TP(SW0, -SLOT_W, 9)])} fill="#8E6A9C" />
						<path d={dPath([TP(SW0, -SLOT_W, 18), TP(SW0, SLOT_W, 18), TP(SW0, SLOT_W, 27), TP(SW0, -SLOT_W, 27)])} fill="#5C3862" />
						<g clipPath={`url(#${id}-arch)`}>
							<path d={archD} fill="#1A060E" />
							<path d={dPath([TP(SW0, -90, LAVA_V + 14), TP(SW0, 90, LAVA_V + 14), TP(SW0, 90, LAVA_V + 80), TP(SW0, -90, LAVA_V + 80)])} fill="#4A1418" />
							<g opacity={mouthHeat}>
								<ellipse cx={TP(SW0, 0, ARCH.v + 10)[0]} cy={TP(SW0, 0, ARCH.v + 10)[1]} rx={50} ry={30} fill="#FF6A16" opacity={0.55} filter={`url(#${id}-b7)`} />
								<path d={dPath([TP(SW0, -90, LAVA_V), TP(SW0, 90, LAVA_V), TP(SW0, 90, LAVA_V + 80), TP(SW0, -90, LAVA_V + 80)])} fill={`url(#${id}-lavaX)`} />
							</g>
						</g>
						<path d={archD} fill="none" stroke="#C2461A" strokeWidth={3} opacity={0.8} />
						{/* drained floor keeps a dull glow for a moment */}
						<path d={dPath([TP(SW0, LAVA_W, LAVA_V), TP(SW1 + 0.08, LAVA_W, LAVA_V), TP(SW1 + 0.08, -LAVA_W, LAVA_V), TP(SW0, -LAVA_W, LAVA_V)])} fill="#24090F" />
						<g mask={`url(#${id}-heatM)`}>
							<path d={dPath([TP(SW0, LAVA_W, LAVA_V), TP(SW1 + 0.08, LAVA_W, LAVA_V), TP(SW1 + 0.08, -LAVA_W, LAVA_V), TP(SW0, -LAVA_W, LAVA_V)])} fill="#8A2414" />
						</g>
						{/* the lava stream */}
						{band.length ? (
							<>
								<path d={dPath(band)} fill={`url(#${id}-lavaX)`} />
								<g filter={`url(#${id}-b2)`}>
									{streaks.map((s, i) => (
										<path key={i} d={`M ${P2(s.a)} L ${P2(s.b)}`} stroke="#FFF7C8" strokeWidth={s.w} strokeLinecap="round" opacity={s.o} />
									))}
								</g>
								{flakes.map((f, i) => (
									<path key={i} d={dPath(f.pts)} fill="#5A1C1C" stroke="#D2501C" strokeWidth={1.5} strokeOpacity={0.6} opacity={f.o} />
								))}
								<path d={dPath(band.slice(0, 15), false)} fill="none" stroke="#8A2010" strokeWidth={4} opacity={0.7} />
							</>
						) : null}
					</g>
					{/* cut edges */}
					<path d={`M ${P2(TP(SW0, -SLOT_W))} L ${P2(TP(SW0, SLOT_W))} L ${P2(TP(SW1, SLOT_W))} M ${P2(TP(SW0, -SLOT_W))} L ${P2(TP(SW1, -SLOT_W))} L ${P2(TP(SW1, SLOT_W))}`} fill="none" stroke="#E2C2E6" strokeWidth={3} strokeLinejoin="round" opacity={0.85} />

					{/* skylight between the window and the exit: lava glimpsed through a hole in the roof */}
					<ellipse cx={skylight[0]} cy={skylight[1] + 4} rx={44} ry={26} fill="#FF6A10" opacity={0.5 * exitHeat} filter={`url(#${id}-b12)`} />
					<ellipse cx={skylight[0]} cy={skylight[1]} rx={19} ry={11} fill="#1A060E" stroke="#2A1634" strokeWidth={4} />
					<ellipse cx={skylight[0] + 1} cy={skylight[1] + 3} rx={13} ry={6} fill="#FFC23A" opacity={exitHeat} />

					{/* tongue of lava at the tube's exit, heading for the town */}
					<g>
						<path d={lobeD} transform="translate(0 9)" fill="#8A2414" />
							<path d={lobeD} transform="translate(0 9)" fill="#2A1218" opacity={lobeCool} />
						<path d={lobeD} fill="#FF7A1C" opacity={1 - lobeCool} filter={`url(#${id}-b12)`} style={{mixBlendMode: 'screen'}} />
						<path d={lobeD} fill={`url(#${id}-lavaX)`} />
						<path d={lobeD} fill="#3A1A20" opacity={lobeCool} />
						<g clipPath={`url(#${id}-lobe)`}>
							{lobePlates.map((p, i) => (
								<path key={i} d={dPath(p)} fill={hsh(i, 175) < 0.5 ? '#3A1418' : '#4A1A1C'} stroke="#D2501C" strokeWidth={2} strokeOpacity={0.55 * (1 - lobeCool)} strokeLinejoin="round" />
							))}
						</g>
						<path d={lobeD} fill="none" stroke="#3A0E14" strokeWidth={3} opacity={0.9} />
						<circle cx={TP(sF, 0, 0)[0]} cy={TP(sF, 0, 0)[1]} r={34} fill={`url(#${id}-hot)`} opacity={0.75 * (1 - lobeCool)} style={{mixBlendMode: 'screen'}} />
					</g>

					{/* the town */}
					{T_TREES.filter((tr) => tr.y < 1230).map((tr, i) => (
						<Tree key={'a' + i} p={[tr.x, tr.y]} r={tr.r} />
					))}
					{[...T_HOUSES].sort((a, b) => a.y - b.y).map((h, i) => (
						<THouseTop key={i} h={h} />
					))}
					{T_TREES.filter((tr) => tr.y >= 1230).map((tr, i) => (
						<Tree key={'b' + i} p={[tr.x, tr.y]} r={tr.r} />
					))}

					{/* ---------------------------------------------- new channel (after the blast) */}
					{chan ? (
						<g>
							<path d={dPath(chan.outline)} transform="translate(0 9)" fill="#7A2014" />
							<path d={dPath(chan.outline)} fill="#FF6A10" opacity={0.7} filter={`url(#${id}-b22)`} style={{mixBlendMode: 'screen'}} />
							<path d={dPath(chan.outline)} fill="#FF8A22" />
							<g clipPath={`url(#${id}-chan)`}>
								<path d={dPath(chan.C, false)} fill="none" stroke="#FFE27A" strokeWidth={NEW_W * 0.9} strokeLinecap="round" filter={`url(#${id}-b4)`} />
								<g filter={`url(#${id}-b2)`}>
									{chanStreaks.map((s, i) => (
										<path key={i} d={dPath(s, false)} fill="none" stroke="#FFF7C8" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
									))}
								</g>
								{chanPlates.map((p, i) => (
									<path key={i} d={dPath(p)} fill={i < 2 ? '#3A1218' : '#4E1A1C'} stroke="#D2501C" strokeWidth={2} strokeOpacity={0.6} strokeLinejoin="round" />
								))}
							</g>
							<path d={dPath(chan.outline)} fill="none" stroke="#2A0E16" strokeWidth={3} strokeLinejoin="round" />
							{chanFront ? <circle cx={chanFront[0]} cy={chanFront[1]} r={30} fill={`url(#${id}-hot)`} opacity={0.85} style={{mixBlendMode: 'screen'}} /> : null}
						</g>
					) : null}

					{/* ---------------------------------------------- the breach */}
					{crK > 0 ? (
						<g opacity={crK}>
							<ellipse cx={CRATER[0]} cy={CRATER[1]} rx={130 * CRS} ry={90 * CRS} fill="#FF6A10" opacity={0.6} filter={`url(#${id}-b22)`} style={{mixBlendMode: 'screen'}} />
							<path d={dPath(craterPts)} fill="#2A1420" />
							<path d={dPath(poolPts)} fill={`url(#${id}-pool)`} />
							<g clipPath={`url(#${id}-pool)`}>
								{Array.from({length: 3}, (_, i) => {
									const a = i * 2.1 + t * 0.5;
									const rr = (24 + 26 * hsh(i, 161)) * CRS;
									const c: Pt = [CRATER[0] + Math.cos(a) * rr * 1.25, CRATER[1] + Math.sin(a) * rr * 0.75];
									const sz = 6 + 5 * hsh(i, 163);
									return (
										<path
											key={i}
											d={`M ${-sz} ${-sz * 0.4} L ${-sz * 0.2} ${-sz * 0.7} L ${sz} ${-sz * 0.3} L ${sz * 0.6} ${sz * 0.5} L ${-sz * 0.6} ${sz * 0.6} Z`}
											transform={`translate(${f1(c[0])} ${f1(c[1])}) rotate(${f1((a * 180) / Math.PI)})`}
											fill="#42161A"
											stroke="#C2461A"
											strokeWidth={2}
											strokeOpacity={0.6}
										/>
									);
								})}
							</g>
							<path d={dPath(craterPts.map((p, i): Pt => lerpPt(CRATER, p, 0.8 + 0.04 * hsh(i, 164))))} fill="none" stroke="#6A4462" strokeWidth={5} strokeLinejoin="round" />
							{craterPts.map((p, i) => {
								const c = lerpPt(CRATER, p, 0.94);
								const sz = (8 + 9 * hsh(i, 162)) * 0.85;
								const rot = hsh(i, 165) * 360;
								return (
									<path
										key={i}
										d={`M ${f1(-sz)} ${f1(-sz * 0.3)} L ${f1(-sz * 0.3)} ${f1(-sz * 0.8)} L ${f1(sz * 0.7)} ${f1(-sz * 0.5)} L ${f1(sz)} ${f1(sz * 0.3)} L ${f1(-sz * 0.2)} ${f1(sz * 0.7)} Z`}
										transform={`translate(${f1(c[0])} ${f1(c[1])}) rotate(${f1(rot)})`}
										fill={i % 2 ? '#3E2236' : '#4E2C46'}
										stroke="#7A5272"
										strokeWidth={1.5}
									/>
								);
							})}
						</g>
					) : null}

					{/* charges, cable, plunger (before the blast) */}
					{!blown || age < 0.6 ? (
						<g opacity={wireO}>
							<path d={wireD} fill="none" stroke="#FFE07A" strokeWidth={3.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - wireK} />
							{charges.map((c, i) => (
								<path key={i} d={`M ${P2(c.p)} L ${P2(wireStart)}`} stroke="#FFE07A" strokeWidth={2.5} opacity={c.k * (blown ? 0 : 1)} />
							))}
						</g>
					) : null}
					{!blown
						? charges.map((c, i) => {
								if (c.k <= 0) return null;
								const sc = lerp(0.92, 1, c.k);
								const q = (a: number, b: number): Pt => TP(SB, c.l + a * sc * 1.25, 4 + b * sc * 1.25);
								return (
									<g key={i} opacity={c.k}>
										<path d={dPath([q(-12, -8), q(12, -8), q(12, 8), q(-12, 8)])} fill="#FF2E50" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
										<path d={dPath([q(-12, -1), q(12, -1), q(12, 2), q(-12, 2)])} fill="#8A0E28" />
										<circle cx={q(7, -4)[0]} cy={q(7, -4)[1]} r={3.2} fill="#FFF0F0" opacity={blink(i)} />
										<circle cx={q(7, -4)[0]} cy={q(7, -4)[1]} r={10} fill="#FF2E50" opacity={0.5 * blink(i)} filter={`url(#${id}-b4)`} />
									</g>
								);
							})
						: null}
					<g opacity={clamp01((t - TT.wire[0] + 0.2) / 0.3)}>
						<g transform={`translate(${DET[0]} ${DET[1]}) scale(1.3) translate(${-DET[0]} ${-DET[1]})`}>
							<Detonator x={DET[0]} y={DET[1]} press={press} />
						</g>
					</g>

					{/* ---------------------------------------------- blast */}
					{blown && age < 4 ? (
						<g>
							{ring >= 0 ? <ellipse cx={E0[0]} cy={E0[1] + 10} rx={40 + 220 * easeInOut(ring)} ry={(40 + 220 * easeInOut(ring)) * 0.55} fill="none" stroke="#E8C8A0" strokeWidth={10 * (1 - ring) + 1} opacity={0.4 * (1 - ring)} /> : null}
							<g filter={`url(#${id}-b4)`}>
								{smoke.map((s, i) => (
									<circle key={i} cx={s.p[0]} cy={s.p[1]} r={s.r} fill={`url(#${id}-smoke)`} opacity={s.o} />
								))}
							</g>
							<g filter={`url(#${id}-b4)`} style={{mixBlendMode: 'screen'}}>
								{fire.map((s, i) => (
									<circle key={i} cx={s.p[0]} cy={s.p[1]} r={s.r} fill={`url(#${id}-fire)`} opacity={s.o} />
								))}
							</g>
							{debris.map((d, i) => (
								<path
									key={i}
									d={`M ${-d.s} ${-d.s * 0.6} L ${d.s * 0.8} ${-d.s} L ${d.s} ${d.s * 0.5} L ${-d.s * 0.4} ${d.s}Z`}
									transform={`translate(${f1(d.p[0])} ${f1(d.p[1])}) rotate(${f1(d.a)})`}
									fill={d.hot ? '#FFB13A' : '#3A2030'}
									stroke={d.hot ? '#FF6A10' : '#6A4A60'}
									strokeWidth={1.5}
									opacity={d.o}
								/>
							))}
							{flash > 0.01 ? <circle cx={E0[0]} cy={E0[1]} r={150} fill={`url(#${id}-hot)`} opacity={flash} style={{mixBlendMode: 'screen'}} /> : null}
						</g>
					) : null}
					<g filter={`url(#${id}-b7)`}>
						{wisps.map((w, i) => (
							<circle key={i} cx={w.p[0]} cy={w.p[1]} r={w.r} fill={`url(#${id}-smoke)`} opacity={w.o} />
						))}
					</g>
					<g filter={`url(#${id}-b2)`}>
						{embers.map((e, i) => (
							<circle key={i} cx={e.p[0]} cy={e.p[1]} r={e.r} fill="#FFD25A" opacity={e.o} />
						))}
					</g>
				</g>
			</svg>
			{vignette}
		</AbsoluteFill>
	);
};

/** dev preview: both diagrams on the Short's timeline (register as «EtnaDiagramsTest» in Root.tsx) */
export const EtnaDiagramsTest: React.FC = () => (
	<AbsoluteFill style={{background: '#000'}}>
		<WallDiagram />
		<TunnelDiagram />
	</AbsoluteFill>
);
