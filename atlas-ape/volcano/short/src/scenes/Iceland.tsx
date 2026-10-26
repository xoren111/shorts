import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {GEO, type LL} from '../data/geo';
import trackA from '../data/iceland_a_track.json';
import trackC from '../data/iceland_c_track.json';
import {W} from '../lib/time';
import {Billboards, type BB} from '../three/Billboards';
import {orbit, project, type Cam, type Orbit} from '../three/cam';
import {h1, plume, waterJet, type V3} from '../three/fx';
import {LOOKS} from '../three/looks';
import {Boat, propMat} from '../three/models';
import type {Region} from '../three/region';
import {ImgSeq, Label, XF, clamp01, easeInOut, easeOut, lerp, useT} from '../ui/gfx';
import {Scene3D} from './common';

// v3 (STYLE.md): one continuous camera per scene (no internal cuts, no shake), at most one calm Label at a time,
// nothing that only repeats the voice. Icons/highlights instead of headlines.
//
// v5 (owner 18.10, violet toon look): the three shots are Blender image sequences (tools/blender/iceland_a.py,
// iceland_b.py, iceland_c.py → public/blender/iceland_{a,b,c}); every DOM overlay is placed from the screen positions the
// same Blender cameras wrote (track.json, slim copies in src/data via tools/track_slim.py). The three.js shots stay below
// as a fallback behind these switches.
const BLENDER_ICE_A = true;
const BLENDER_ICE_B = true;
const BLENDER_ICE_C = true;

const I = GEO.heimaey;
const P = (cam: Cam, p: V3) => project(cam, p, 1080, 1920);
const RIP = W(84) - 0.05; // «rips»
const MOUTH: LL = [(I.harborMouth[0][0] + I.harborMouth[1][0]) / 2, (I.harborMouth[0][1] + I.harborMouth[1][1]) / 2];
/** where the fleet sailed (the mainland lies NE of the harbour mouth) */
const MAINLAND: LL = [63.468, -20.205];

const llLerp = (a: LL, b: LL, k: number): LL => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// ---------------------------------------------------------------- smooth camera path
// Keyframed orbit, interpolated per channel with a monotone cubic Hermite (Fritsch–Butland tangents): C1-continuous
// (no speed jumps, no hard cuts) and no overshoot. Distance is interpolated in log space so zooms feel even.
type CamKey = {t: number; o: Orbit};
const chans = (o: Orbit) => [o.target[0], o.target[1], o.target[2], o.az, o.el, Math.log(o.dist), o.fov];

const tangents = (T: number[], V: number[]) => {
	const n = T.length;
	const h = T.slice(1).map((x, i) => x - T[i]);
	const d = h.map((hi, i) => (V[i + 1] - V[i]) / hi);
	const m = new Array<number>(n).fill(0);
	for (let k = 1; k < n - 1; k++) {
		if (d[k - 1] * d[k] <= 0) continue;
		m[k] = (3 * (h[k - 1] + h[k])) / ((2 * h[k] + h[k - 1]) / d[k - 1] + (h[k] + 2 * h[k - 1]) / d[k]);
	}
	// ends: one-sided three-point estimate, kept monotone (the camera is already moving when the shot dissolves in/out)
	const end = (h0: number, h1v: number, d0: number, d1: number) => {
		let e = ((2 * h0 + h1v) * d0 - h0 * d1) / (h0 + h1v);
		if (Math.sign(e) !== Math.sign(d0)) e = 0;
		else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(e) > Math.abs(3 * d0)) e = 3 * d0;
		return e;
	};
	if (n === 2) {
		m[0] = d[0];
		m[1] = d[0];
	} else {
		m[0] = end(h[0], h[1], d[0], d[1]);
		m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
	}
	return m;
};

const pathOrbit = (keys: CamKey[], t: number): Orbit => {
	const T = keys.map((k) => k.t);
	const C = keys.map((k) => chans(k.o));
	const n = keys.length;
	const tc = Math.max(T[0], Math.min(T[n - 1], t));
	let i = 0;
	while (i < n - 2 && tc > T[i + 1]) i++;
	const hh = T[i + 1] - T[i];
	const s = (tc - T[i]) / hh;
	const h00 = 2 * s * s * s - 3 * s * s + 1;
	const h10 = s * s * s - 2 * s * s + s;
	const h01 = -2 * s * s * s + 3 * s * s;
	const h11 = s * s * s - s * s;
	const v = C[0].map((_, c) => {
		const V = C.map((x) => x[c]);
		const m = tangents(T, V);
		return h00 * V[i] + h10 * hh * m[i] + h01 * V[i + 1] + h11 * hh * m[i + 1];
	});
	return {target: [v[0], v[1], v[2]], az: v[3], el: v[4], dist: Math.exp(v[5]), fov: v[6]};
};

/** 0→1 with a soft start (ease-in over the first `a` of the range), then constant speed: the shot keeps moving through
 *  its outgoing dissolve instead of braking to a stop */
const softStart = (x: number, a = 0.3) => {
	const u = clamp01(x);
	const v = 1 / (1 - a / 2); // speed of the linear part, normalised so f(1) = 1
	return u < a ? (v * u * u) / (2 * a) : v * (u - a / 2);
};

// ---------------------------------------------------------------- particles without flicker
/** glowing embers over the vent: like fx.embers but with a steady brightness (no per-frame twinkle) */
const embersCalm = (t: number, c: V3, o: {n: number; spread: number; rise: number; size: number; seed: number; life?: number}): BB[] => {
	const out: BB[] = [];
	const life = o.life ?? 2.5;
	for (let i = 0; i < o.n; i++) {
		const s = o.seed * 1000 + i;
		const ph = h1(s) * life;
		const age = (t + ph) % life;
		const k = age / life;
		const cyc = Math.floor((t + ph) / life);
		const rx = (h1(s + cyc * 7.1) - 0.5) * 2 * o.spread;
		const rz = (h1(s + 3.3 + cyc * 5.7) - 0.5) * 2 * o.spread;
		const sway = Math.sin(age * 1.5 + s) * o.spread * 0.12;
		out.push({
			x: c[0] + rx + 0.02 * age + sway,
			y: c[1] + o.rise * (k * (1.2 - 0.4 * k)) * (0.6 + 0.8 * h1(s + 9)),
			z: c[2] + rz,
			size: o.size * (0.5 + h1(s + 2) * 0.9) * (1 - 0.5 * k),
			r: 6,
			g: 2.2 - 1.6 * k,
			b: 0.4 * (1 - k),
			a: 0.8 * Math.sin(Math.PI * k),
			kind: 0,
			seed: h1(s + 4),
		});
	}
	return out;
};

/** fx.waterJet with every droplet faded in at the nozzle and out at the target (no pops when a droplet recycles) */
const jetSoft = (t: number, p0: V3, p1: V3, o: {n: number; apex: number; size: number; seed: number; on: number}): BB[] =>
	waterJet(t, p0, p1, o).map((b, i) => {
		const life = 1.2;
		const k = ((t + (i / o.n) * life) % life) / life;
		return {...b, a: b.a * clamp01(k / 0.12) * clamp01((1 - k) / 0.2)};
	});

/** town lights (warm points over the town area): steady, faded out near the camera instead of popping */
const townLights = (r: Region, cam: Cam): BB[] => {
	const out: BB[] = [];
	const [cx, cz] = r.geo(I.town[0], I.town[1]);
	for (let i = 0; i < 260; i++) {
		const a = h1(i * 1.3) * 6.283;
		const d = Math.sqrt(h1(i * 2.7)) * 0.75;
		const x = cx + Math.cos(a) * d * 1.1;
		const z = cz + Math.sin(a) * d * 0.7;
		const y = r.ground(x, z) + 0.006;
		if (y < 0.004) continue;
		const near = clamp01((Math.hypot(x - cam.pos[0], y - cam.pos[1], z - cam.pos[2]) - 0.5) / 0.3);
		out.push({x, y, z, size: 0.018 + h1(i * 5.1) * 0.012, r: 4.5, g: 3.0, b: 1.4, a: 0.92 * near, kind: 0});
	}
	return out;
};

// ---------------------------------------------------------------- boats leaving (Six hours — almost everyone's out)
// The fishing fleet lies moored in the harbour basin from the first frame (no boats popping in): two staggered rows along
// the north and south quays, ≥ 100 m apart, so every hull reads as a boat. They sail out one after another: along the basin,
// through the passage south of the pier, out of the harbour mouth and away to the mainland (NE).
type BoatTrack = {path: LL[]; t0: number; dur: number};
// all in open water of land.png (≥ 10 m from the coast mask; checked with the route QA script, see the report)
const MOORINGS: LL[] = [
	[63.44541, -20.27948],
	[63.44505, -20.2775],
	[63.44595, -20.2755],
	[63.44505, -20.2735],
	[63.446, -20.2712],
	[63.445, -20.2695],
	[63.4461, -20.268],
];
const PASSAGE: LL = [63.4449, -20.2652]; // water south of the pier tip
/** the sea route out: east through the channel past the new lava, round the tip of the headland (Ystiklettur's south arm)
 *  in open water, then north-east to the mainland — never over land */
const SEA_ROUTE: LL[] = [MOUTH, [63.4472, -20.25], [63.447, -20.24], [63.452, -20.233]];
const BOATS: BoatTrack[] = MOORINGS.map((moor, i) => ({
	path: catmull([moor, PASSAGE, ...SEA_ROUTE, [MAINLAND[0] + i * 0.003, MAINLAND[1] + (i - 3) * 0.006] as LL]),
	t0: W(92) - 0.6 + (6 - i) * 0.3, // the boat nearest the mouth leaves first
	dur: 6.5,
}));
/** the route the arrow draws: the same water path, from the mouth */
const ARROW_PATH: LL[] = catmull([...SEA_ROUTE, MAINLAND]);

/** uniform Catmull-Rom through lat/lon waypoints → dense polyline (smooth headings, no corners) */
function catmull(P: LL[], n = 24): LL[] {
	const Q = [P[0], ...P, P[P.length - 1]];
	const out: LL[] = [];
	for (let i = 1; i < Q.length - 2; i++) {
		const [p0, p1, p2, p3] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
		for (let k = 0; k < n; k++) {
			const t = k / n;
			const f = (c: 0 | 1) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t * t * t);
			out.push([f(0), f(1)]);
		}
	}
	out.push(P[P.length - 1]);
	return out;
}

/** point at arc-length fraction u of a lat/lon polyline (scene metric) */
const alongPath = (r: Region, path: LL[], u: number): V3 => {
	const pts = path.map((p) => r.geo(p[0], p[1]));
	const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
	const tot = seg.reduce((a, b) => a + b, 0);
	let d = clamp01(u) * tot;
	for (let i = 0; i < seg.length; i++) {
		if (d <= seg[i] || i === seg.length - 1) {
			const k = seg[i] > 0 ? Math.min(1, d / seg[i]) : 0;
			return [lerp(pts[i][0], pts[i + 1][0], k), 0.002, lerp(pts[i][1], pts[i + 1][1], k)];
		}
		d -= seg[i];
	}
	return [pts[0][0], 0.002, pts[0][1]];
};

const boatPos = (r: Region, b: BoatTrack, t: number) => {
	// smooth start (eased), then steady cruising along the whole route
	const k = softStart((t - b.t0) / b.dur, 0.2);
	const p = alongPath(r, b.path, k);
	const q = alongPath(r, b.path, Math.min(1, k + 0.01));
	const dx = q[0] - p[0];
	const dz = q[2] - p[2];
	// moored boats keep the heading of their first leg
	const yaw = Math.hypot(dx, dz) > 1e-6 ? -Math.atan2(dz, dx) : 0;
	return {pos: p, yaw, k};
};

const WAKE_N = 18;
const Boats: React.FC<{r: Region; t: number; tracks: BoatTrack[]}> = ({r, t, tracks}) => {
	const hull = useMemo(() => propMat('#3a4a6e', {sun: [0.3, 0.5, -0.6], sunCol: '#8fb6ff', amb: 0.5, rim: '#ffb070', rimI: 1.6}), []);
	const cabin = useMemo(() => propMat('#cfd6e2', {sun: [0.3, 0.5, -0.6], sunCol: '#8fb6ff', amb: 0.3, rim: '#ffd0a0', rimI: 0.5, emissive: '#ffcf80', emI: 0.18}), []);
	const lights: BB[] = [];
	const wake: BB[] = [];
	const nodes = tracks.map((b, i) => {
		const {pos, yaw} = boatPos(r, b, t);
		// one small mast light per boat (not a glowing bar)
		lights.push({x: pos[0], y: pos[1] + 0.04, z: pos[2], size: 0.016, r: 3.2, g: 2.3, b: 1.2, a: 0.85, kind: 0});
		// wake: a soft continuous streak (many small, faint, overlapping glows that widen behind the boat), not a row of beads
		const moving = clamp01((t - b.t0) / 0.8);
		for (let k = 1; k <= WAKE_N; k++) {
			const back = boatPos(r, b, t - k * 0.03).pos;
			const f = k / (WAKE_N + 1);
			wake.push({x: back[0], y: 0.001, z: back[2], size: 0.014 + f * 0.05, r: 0.62, g: 0.78, b: 0.92, a: 0.16 * (1 - f) * moving, kind: 0});
		}
		return <Boat key={i} pos={pos} yaw={yaw} scale={0.075} mat={hull} cabin={cabin} />;
	});
	return (
		<>
			{nodes}
			<Billboards max={tracks.length * (WAKE_N + 1) + 8} items={[...lights, ...wake]} renderOrder={7} />
		</>
	);
};

// ---------------------------------------------------------------- flat icons / highlights (no text)
/**
 * Map label with its own anchor dot + thin leader: the dot's ring expands ONCE when the label arrives (gfx Label's own ring
 * restarts every 1.6 s, which reads as blinking), and the leader stops at the edge of the text block instead of running
 * under it. The text is the shared calm `Label`; its width is estimated at 0.66 × size per character (Montserrat 800 is
 * wider than gfx Label's 0.6 estimate), so the text really stays inside x 70–1010.
 */
const MapLabel: React.FC<{text: string; sub?: string; x: number; y: number; dx?: number; dy?: number; t0: number; t1: number; size?: number}> = ({text, sub, x, y, dx = 0, dy = -70, t0, t1, size = 54}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
	const k = easeOut((t - t0) / 0.35);
	const o = k * clamp01((t1 + 0.3 - t) / 0.3);
	const half = Math.max(text.length * size * 0.66, sub ? sub.length * size * 0.58 * 0.64 : 0) / 2;
	const lx = Math.max(70 + half, Math.min(1010 - half, x + dx));
	const ly = y + dy;
	const hh = (size * 1.05 + (sub ? size * 0.58 * 1.05 + 4 : 0)) / 2;
	const vx = lx - x;
	const vy = ly - y;
	const f = clamp01(1 - Math.min((half + 10) / Math.max(1e-6, Math.abs(vx)), (hh + 8) / Math.max(1e-6, Math.abs(vy))));
	const r = clamp01((t - t0) / 1.0);
	return (
		<>
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o, pointerEvents: 'none'}}>
				{f > 0 ? <line x1={x} y1={y} x2={x + vx * f * k} y2={y + vy * f * k} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.85} style={{filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))'}} /> : null}
				<circle cx={x} cy={y} r={9} fill="#fff" style={{filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))'}} />
				{r < 1 ? <circle cx={x} cy={y} r={9 + 18 * easeOut(r)} fill="none" stroke="#fff" strokeWidth={2} opacity={0.6 * (1 - r)} /> : null}
			</svg>
			<Label text={text} sub={sub} t0={t0} t1={t1} x={lx} y={ly} size={size} />
		</>
	);
};

/**
 * Thin dotted arrow along the fleet's water route (screen polyline, already projected): draws itself once, ends inside the
 * safe area (cut at x ≤ maxX / y ≥ minY), fades with its label. The label sits just above the arrowhead (no dot, no leader:
 * the arrow already points at what it names).
 */
const RouteArrow: React.FC<{pts: {x: number; y: number}[]; t0: number; t1: number; label: string; maxX?: number; minY?: number}> = ({pts, t0, t1, label, maxX = 990, minY = 260}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3 || pts.length < 2 || !pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) return null;
	// cut the route where it leaves the safe area
	const P: {x: number; y: number}[] = [pts[0]];
	for (let i = 1; i < pts.length; i++) {
		const a = P[P.length - 1];
		const b = pts[i];
		if (b.x <= maxX && b.y >= minY) {
			P.push(b);
			continue;
		}
		const kx = b.x > maxX ? (maxX - a.x) / (b.x - a.x) : 1;
		const ky = b.y < minY ? (minY - a.y) / (b.y - a.y) : 1;
		const k = clamp01(Math.min(kx, ky));
		P.push({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k)});
		break;
	}
	const seg = P.slice(1).map((p, i) => Math.hypot(p.x - P[i].x, p.y - P[i].y));
	const tot = seg.reduce((a, b) => a + b, 0) || 1;
	const k = easeInOut((t - t0) / 0.7);
	const o = clamp01((t - t0) / 0.25) * clamp01((t1 + 0.3 - t) / 0.3);
	// the drawn part (arc length k · tot) and its tip direction
	let d = k * tot;
	const Q = [P[0]];
	let ux = 1;
	let uy = 0;
	for (let i = 0; i < seg.length; i++) {
		const a = P[i];
		const b = P[i + 1];
		const f = seg[i] > 0 ? Math.min(1, d / seg[i]) : 0;
		if (seg[i] > 0) {
			ux = (b.x - a.x) / seg[i];
			uy = (b.y - a.y) / seg[i];
		}
		Q.push({x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f)});
		d -= seg[i];
		if (d <= 0) break;
	}
	const tip = Q[Q.length - 1];
	const hs = 15;
	const head = `M${(tip.x - ux * hs - uy * hs * 0.7).toFixed(1)} ${(tip.y - uy * hs + ux * hs * 0.7).toFixed(1)} L${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L${(tip.x - ux * hs + uy * hs * 0.7).toFixed(1)} ${(tip.y - uy * hs - ux * hs * 0.7).toFixed(1)}`;
	const end = P[P.length - 1];
	return (
		<>
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o * 0.85, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))', pointerEvents: 'none'}}>
				<polyline points={Q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 12" />
				<path d={head} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01((k - 0.2) / 0.3)} />
			</svg>
			{/* right-aligned text block ending at the arrowhead, a little above it; inside x 70–1010 */}
			<Label text={label} t0={t0 + 0.1} t1={t1} x={Math.max(70 + label.length * 50 * 0.66, Math.min(1010, end.x + 10))} y={end.y - 125} size={50} align="right" />
		</>
	);
};

/** calm soft glow lying on a world-space ellipse (projected, so it sits flat on the water), fades in, no pulse */
const SoftGlow: React.FC<{r: Region; cam: Cam; c: LL; axis: LL; ra: number; rb: number; t0: number; t1: number; color?: string; max?: number; blur?: number}> = ({
	r,
	cam,
	c,
	axis,
	ra,
	rb,
	t0,
	t1,
	color = '#8ff7ef',
	max = 0.3,
	blur = 35,
}) => {
	const t = useT();
	if (t < t0 || t > t1) return null;
	const o = easeInOut((t - t0) / 0.8) * clamp01((t1 - t) / 0.35) * max;
	const p0 = r.at(c[0], c[1]);
	const p1 = r.at(axis[0], axis[1]);
	const ux0 = p1[0] - p0[0];
	const uz0 = p1[2] - p0[2];
	const L = Math.hypot(ux0, uz0) || 1;
	const ux = ux0 / L;
	const uz = uz0 / L;
	const pts: string[] = [];
	for (let i = 0; i < 48; i++) {
		const q = (i / 48) * Math.PI * 2;
		const a = Math.cos(q) * ra;
		const b = Math.sin(q) * rb;
		const s = P(cam, [p0[0] + ux * a - uz * b, 0.002, p0[2] + uz * a + ux * b]);
		if (s.behind) return null;
		pts.push(`${s.x.toFixed(1)},${s.y.toFixed(1)}`);
	}
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o, mixBlendMode: 'screen', pointerEvents: 'none'}}>
			<defs>
				<filter id="iceGlowBlur" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation={blur} />
				</filter>
			</defs>
			<polygon points={pts.join(' ')} fill={color} filter="url(#iceGlowBlur)" />
		</svg>
	);
};

// ---------------------------------------------------------------- ICELAND A (40.53 – 54.71, + XF dissolve tail)
// One continuous flight. GlobeHop dives the globe exactly onto this camera's opening (its own port of the first keys and
// of the look at W(79)), so the dissolve blends two matching pictures → dive down onto the moonlit island → a slow push-in
// that keeps moving through «the ground rips open» (the crack tears open from the Eldfell vent, framed so the whole
// fissure stays above the subtitle line) → drift north-west over the town (Heimaey) → the harbour as the fleet sails to
// the mainland → the lava lobe pushes toward the harbour mouth (soft highlight). North stays roughly up the whole time, so
// the geography reads like a map.
const g = (x: number, z: number, y = 0.05): V3 => [x, y, z];
export const KEYS_A: CamKey[] = [
	// the first three keys are the opening GlobeHop lands on (its port ICE_A of 18.10 13:05; the path inside the dissolve
	// 40.53–40.93 depends only on them): top-down, north up, high above the Westman Islands as the globe dive ends, then
	// the same log-distance dive continues down to the island
	{t: W(79), o: {target: g(0.25, 0.0), az: 0, el: 88, dist: 100, fov: 40}},
	{t: 41.75, o: {target: g(0.15, -0.6), az: 6, el: 76, dist: 12, fov: 40}},
	{t: 42.9, o: {target: g(0.4, -0.35), az: 16, el: 64, dist: 6.8, fov: 41}},
	// through the rip every channel is still moving (no key is an extremum here): a slow push-in + swing that only turns
	// round at 45.95 (target / azimuth), while distance and elevation keep going
	{t: W(84) - 0.1, o: {target: g(0.55, -0.04), az: 23.5, el: 58.5, dist: 5.0, fov: 42}},
	{t: 45.95, o: {target: g(0.6, 0.0), az: 27, el: 56, dist: 4.55, fov: 42}},
	{t: W(92) - 0.3, o: {target: g(0.15, -1.1), az: 14, el: 54, dist: 4.3, fov: 42}},
	{t: W(97) - 0.2, o: {target: g(0.25, -1.6), az: 11, el: 57, dist: 3.7, fov: 42}},
	// the islet NE of Heimaklettur stays right of the frame in this last stretch
	{t: W(104) + XF + 0.05, o: {target: g(0.22, -1.82), az: 13, el: 65, dist: 2.7, fov: 42}},
];
/** Iceland A camera (orbit form, region km frame) — exported so GlobeHop can land on it instead of keeping a copy */
export const iceACamOrbit = (t: number): Orbit => pathOrbit(KEYS_A, t);
const camA = (_r: Region, t: number): Cam => orbit(iceACamOrbit(t));

// lava.png (smooth maps of 18.10 14:10, see the report): R = geodesic arrival from the vent inside the real 1973 outline
// (0 at the vent … 0.84; east coast ≈ 0.25–0.37, the harbour-lobe tongue reaches the harbour channel at ≈ 0.53, the town
// lobe fills last), B = an irregular crack (wiggly centre line, varying width, en-echelon gaps) whose value is
// 0.42·u + 0.5·v (u = distance from the vent along the line / longest arm, v = lateral / local half-width): raising prog.z
// tears it open from the vent outward and widens it, lowering it narrows it back to a thin crack. Everything else is 1.0;
// the glow halo is smoothstep(prog ± 0.05, B), so prog.z ≤ −0.06 keeps it fully dark and 0.95 opens the whole crack.
const FIS_MAX = 0.95;
/** fraction of the fissure line (NE end → SW end) where the vent sits, and the crack's gaps (lava.png B channel) */
const VENT_U = 0.335;
const ARM = 1 - VENT_U; // the longer (SW) arm, in line fractions
const A_END = W(104) + XF + 0.1;

const lavaA = (t: number) => {
	// the crack: tears open from the vent in ≈ 0.9 s (tips reach the ends at prog.z ≈ 0.21 NE / 0.42 SW, then it widens),
	// stays wide and hot while the voice says «open», then narrows to a thin dull-red crack (the eruption concentrates on
	// the vent) from «island» on
	const open = easeInOut((t - RIP + 0.05) / 0.9);
	const close = easeInOut((t - W(88) - 0.1) / 1.8);
	const fis = -0.06 + (FIS_MAX + 0.06) * open - 0.4 * close;
	// temperature (cool.z): yellow-hot tear → orange → dull red
	const coolF = lerp(0.2, 0.42, easeInOut((t - RIP - 0.25) / 1.0)) + 0.58 * easeInOut((t - W(88) - 0.1) / 1.6);
	// the field: starts once the tear has reached the vent (W(85)), then one even advance (constant front speed): the east
	// sea lobe first, then the tongue turns north toward the harbour while the voice says so (prog ≈ 0.31 → 0.46 over
	// 51.8 → 54.3; it ends ≈ 150 m short of the harbour channel). Below 0 not even the glow halo shows.
	const field = lerp(-0.06, -0.01, easeInOut((t - W(85)) / 0.5)) + 0.51 * softStart((t - W(85) - 0.2) / (A_END - W(85) - 0.2), 0.12);
	return {prog: [field, 0, fis] as V3, cool: [0.35, 0, coolF] as V3, gain: 0.68, noise: 40, thick: 0};
};

/** fountain vents along the fissure (line fractions; none in the crack's gaps at 0.07 / 0.52 / 0.66 / 0.84) */
const VENTS = [0.02, 0.12, 0.17, 0.23, 0.28, VENT_U, 0.37, 0.42, 0.47, 0.57, 0.61, 0.71, 0.77, 0.9, 0.95];
/**
 * Curtain of fire as separate fountains of different heights (not an even tube): every droplet belongs to one vent on the
 * line; a vent only plays once the opening crack has reached it (tip = fraction of the longer arm, from the vent).
 */
const fountainsClumpy = (t: number, a: V3, b: V3, tip: number, o: {n: number; height: number; size: number; seed: number}): BB[] => {
	const out: BB[] = [];
	for (let i = 0; i < o.n; i++) {
		const s = o.seed * 1000 + i;
		const main = h1(s + 9) < 0.18;
		const j = main ? VENTS.indexOf(VENT_U) : Math.floor(h1(s + 10) * VENTS.length);
		const uj = VENTS[j];
		const on = clamp01((tip - Math.abs(uj - VENT_U) / ARM) / 0.06 + 1);
		if (on <= 0) continue;
		const u = uj + (h1(s + 11) - 0.5) * 0.022;
		const hv = (main ? 1.25 : 0.45 + 0.75 * h1(j * 7.3 + o.seed)) * o.height;
		const life = 0.9 + h1(s + 1) * 0.9;
		const ph = h1(s + 2) * life;
		const age = (t + ph) % life;
		const k = age / life;
		const cyc = Math.floor((t + ph) / life);
		const v = hv * (0.6 + 0.8 * h1(s + 3 + cyc));
		const dx = (h1(s + 4 + cyc) - 0.5) * hv * 0.5;
		const dz = (h1(s + 5 + cyc) - 0.5) * hv * 0.5;
		const heat = 1 - k * 0.6;
		out.push({
			x: lerp(a[0], b[0], u) + dx * k,
			y: lerp(a[1], b[1], u) + v * 4 * k * (1 - k),
			z: lerp(a[2], b[2], u) + dz * k,
			size: o.size * (0.6 + h1(s + 6) * 0.8),
			r: 7 * heat,
			g: 3.2 * heat * heat,
			b: 0.7 * heat * heat,
			a: (1 - k * 0.3) * on,
			kind: 0,
			seed: h1(s + 7),
		});
	}
	return out;
};

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, k: number) => '#' + hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], clamp01(k))).toString(16).padStart(2, '0')).join('');

/** blue hour inside the globe dissolve (the globe is a bright day ocean; GlobeHop's dive ends on exactly this look) →
 *  a readable moonlit blue about 1 s later (relief and town read) → once the fissure opens, the eruption lights the
 *  island warm (one smooth ramp each, no flicker). The moonlit sea is a little more saturated and brighter (after the
 *  dissolve only, so GlobeHop's port is untouched). */
const blueA = (t: number) => 1 - easeInOut((t - W(79) - 0.1) / 1.3);
export const iceALook = (t: number) => {
	const b = blueA(t);
	const k = easeInOut((t - RIP) / 1.8);
	const moon = easeInOut((t - W(79) - 0.45) / 1.2) * (1 - 0.6 * k);
	return {
		expo: 1.35,
		ambI: lerp(lerp(2.0, 2.7, b), 2.0, k),
		night: lerp(lerp(0.4, 0.18, b), 0.34, k) - 0.06 * moon,
		skyCol: mixHex(mixHex('#3c64c0', '#6c9ae0', b), '#6a4a8c', k),
		groundCol: mixHex(mixHex('#121830', '#1c2440', b), '#3a140c', k),
		tint: mixHex(mixHex('#d4e2ff', '#e4ecff', b), '#ffe0d0', k),
		fogCol: mixHex(mixHex('#2a3c86', '#4f78c0', b), '#4a2a5a', k),
		fogDens: lerp(0.02, 0.006, b),
		waterCol: mixHex(LOOKS.iceNight.terrain.waterCol, '#0a6aa6', moon),
		waterDeep: mixHex(LOOKS.iceNight.terrain.waterDeep, '#0a2f78', moon),
	};
};
/** the far sea (seen from high up) takes the sky's horizon colour: the globe's ocean blue first, then the night */
export const iceASky = (t: number) => {
	const b = blueA(t);
	return {horizon: mixHex('#26306e', '#1270bc', b), glowI: lerp(0.6, 0, b)};
};

const Iceland3DA3js: React.FC = () => {
	const t = useT();
	return (
		<Scene3D
			region="heimaey"
			wide="heimaey_wide"
			look="iceNight"
			lookOverride={iceALook(t)}
			skyOverride={iceASky(t)}
			cam={camA}
			lava={(_r, t) => lavaA(t)}
			post={{bloom: 0.85, threshold: 0.9}}
			children={(r, t) => {
				const cam = camA(r, t);
				const crater = r.at(I.crater[0], I.crater[1]);
				// the fountain curtain along the fissure contracts onto the Eldfell vent once the voice moves on to the people
				const c = 0.85 * easeInOut((t - W(89) - 0.1) / 2.0);
				const a0 = r.at(I.fissure[0][0], I.fissure[0][1]);
				const b0 = r.at(I.fissure[1][0], I.fissure[1][1]);
				const a: V3 = [lerp(a0[0], crater[0], c), lerp(a0[1], crater[1], c), lerp(a0[2], crater[2], c)];
				const b: V3 = [lerp(b0[0], crater[0], c), lerp(b0[1], crater[1], c), lerp(b0[2], crater[2], c)];
				// the fountains follow the opening crack outward from the vent (its tip: fraction of the longer arm)
				const tip = clamp01((lavaA(t).prog[2] + 0.02) / 0.44);
				const fa = clamp01((t - RIP + 0.05) / 0.35) * lerp(1, 0.6, c);
				const fnt = t > RIP - 0.05 ? fountainsClumpy(t, a, b, tip, {n: 420, height: 0.19, size: 0.024, seed: 3}).map((p) => ({...p, r: p.r * 0.8, g: p.g * 0.62, b: p.b * 0.5, a: p.a * fa})) : [];
				const ash = t > RIP ? plume(t, crater, {n: 22, rise: 0.7, spread: 0.06, size: 0.15, grow: 2.0, seed: 12, color: [0.12, 0.1, 0.14], alpha: 0.45, glow: [1.6, 0.45, 0.1], wind: [0.07, 0.03], startAt: RIP}) : [];
				const emb = t > RIP ? embersCalm(t, crater, {n: 120, spread: 0.3, rise: 0.35, size: 0.01, seed: 2}).map((p) => ({...p, a: p.a * clamp01((t - RIP) / 0.6)})) : [];
				return (
					<>
						<Billboards max={320} items={townLights(r, cam)} renderOrder={6} />
						<Billboards max={420} items={[...fnt, ...emb]} />
						<Billboards max={60} blending="normal" items={ash} renderOrder={4} />
						<Boats r={r} t={t} tracks={BOATS} />
					</>
				);
			}}
			overlay={(r, cam, t) => {
				const crater = P(cam, r.at(I.crater[0], I.crater[1], 0.03));
				const town = P(cam, r.at(I.town[0], I.town[1], 0.01));
				const harbor = P(cam, r.at(...llLerp(I.harborInner, MOUTH, 0.35), 0.02));
				// the route on screen: the same water path the boats take, from the harbour mouth out round the headland
				const route = t > W(94) ? ARROW_PATH.filter((_, i) => i % 3 === 0).map((p) => P(cam, r.at(p[0], p[1], 0.0))) : [];
				return (
					<>
						{/* «1973.» — the big key figure «1973 / 23 January» comes from Short.tsx (src/data/emph.ts) */}
						{/* «The ground rips open» — the new volcano gets its name (the voice never says it); the dot appears once the
						    opening crack has reached the vent, the text sits on dark ground west of the fissure */}
						<MapLabel text="Eldfell" sub="new volcano" x={crater.x} y={crater.y} dx={-170} dy={-90} t0={W(85)} t1={W(88) - 0.35} size={54} />
						{/* «…on an island of 5,300 people» — the key figure «5,300 / people on Heimaey» comes from Short.tsx (emph.ts) */}
						{/* «Six hours»: no clock icon — the big KeyFact «6 hours» (Short.tsx) already says it (STYLE: no duplicates) */}
						{/* «almost everyone's out» — where the boats went: dotted arrow along their sea route + its name */}
						<RouteArrow pts={route} t0={W(94) + 0.15} t1={W(96) + 0.15} label="To the Mainland" />
						{/* «Then the lava turns toward the harbor» — the harbour basin softly lights up, no text */}
						<SoftGlow r={r} cam={cam} c={llLerp(I.harborInner, MOUTH, 0.28)} axis={MOUTH} ra={0.5} rb={0.11} max={0.22} t0={W(100) - 0.1} t1={W(104) + XF} />
					</>
				);
			}}
		/>
	);
};

// ---------------------------------------------------------------- ICELAND B (56.45 – 57.83): fighting it with the ocean
// pump ship Sandey in the harbour channel (one ship, two monitors) + intake pumps at Skans (positions from USGS OF 97-724
// sketch maps)
const SHIP: LL = [63.44688, -20.25948];
const JETS: {from: LL; to: LL}[] = [
	{from: [63.4469, -20.2592], to: [63.4462, -20.2568]},
	{from: [63.44684, -20.25975], to: [63.4458, -20.2574]},
	{from: [63.4444, -20.2621], to: [63.4452, -20.2584]},
];

/** the field months later (B, C): the whole real 1973 outline, incl. the east part of the town it buried */
const FIELD_FULL = 0.95;

const Iceland3DB3js: React.FC = () => {
	const hull = useMemo(() => propMat('#26304a', {sun: [0.85, 0.2, 0.1], sunCol: '#ffb38a', amb: 0.35, rim: '#ffd0a0', rimI: 1.2}), []);
	const cabin = useMemo(() => propMat('#d8d2c4', {sun: [0.85, 0.2, 0.1], sunCol: '#ffb38a', amb: 0.28}), []);
	return (
		<Scene3D
			region="heimaey"
			wide="heimaey_wide"
			look="iceDawn"
			cam={(r, t) => {
				const tgt = r.at(I.front[0], I.front[1]);
				// one slow even drift through the whole layer (incl. both dissolves), no shake
				const k = clamp01((t - W(109)) / (W(112) + XF - W(109)));
				// (QA 18.10: higher than before, so the bottom of the frame is water + lava front, not magnified quays)
				return orbit({target: tgt, az: lerp(300, 286, k), el: lerp(24, 27, k), dist: Math.exp(lerp(Math.log(1.4), Math.log(1.15), k)), fov: 44});
			}}
			// the town lobe (arrival 0.85–0.95) is the youngest part: a little crust everywhere keeps it from flaring white
			lava={{prog: [FIELD_FULL, 0, FIS_MAX], cool: [0.3, 0, 0.9], gain: 1.0, noise: 70, thick: 0}}
			post={{bloom: 1.1, threshold: 0.85}}
			children={(r, t) => {
				const jets: BB[] = [];
				const steam: BB[] = [];
				JETS.forEach((j, i) => {
					const p0 = r.at(j.from[0], j.from[1], 0.012);
					const p1 = r.at(j.to[0], j.to[1], 0.01);
					jets.push(...jetSoft(t, [p0[0], 0.01, p0[2]], p1, {n: 70, apex: 0.06, size: 0.012, seed: 50 + i, on: 1}));
					steam.push(...plume(t, p1, {n: 16, rise: 0.25, spread: 0.04, size: 0.09, grow: 2.6, seed: 60 + i, color: [0.92, 0.9, 0.95], alpha: 0.6, glow: [1.6, 0.5, 0.15], life: 2.2, wind: [0.03, -0.02]}));
				});
				const s = r.at(SHIP[0], SHIP[1]);
				return (
					<>
						<Boat pos={[s[0], 0.002, s[2]]} yaw={-0.4} scale={0.065} mat={hull} cabin={cabin} />
						<Billboards max={260} items={jets} renderOrder={6} />
						<Billboards max={80} blending="normal" items={steam} renderOrder={5} />
					</>
				);
			}}
		/>
	);
};

// ---------------------------------------------------------------- ICELAND C (61.91 – 65.91): stopped ~100 m short; the harbour stays open
const Iceland3DC3js: React.FC = () => {
	const hull = useMemo(() => propMat('#26304a', {sun: [0.85, 0.2, 0.1], sunCol: '#ffb38a', amb: 0.35, rim: '#ffd0a0', rimI: 1.2}), []);
	const cabin = useMemo(() => propMat('#f0eadc', {sun: [0.85, 0.2, 0.1], sunCol: '#ffb38a', amb: 0.4}), []);
	// boats sail in through the gap that stayed open; they enter from beyond the frame edge (never pop in)
	// inbound boats follow the outbound sea route in reverse (open water round the headland), not a straight line through the rock
	const inbound = useMemo(() => [0, 1, 2].map((i) => ({from: [63.452 + i * 0.0008, -20.233 + i * 0.0015] as LL, via: [[63.447, -20.24], [63.4472, -20.25], MOUTH] as LL[], to: [63.4462, -20.2625] as LL, t0: W(123) - 0.4 + i * 0.5, dur: 4.2})), []);
	const cam = (r: Region, t: number): Cam => {
		const m = r.at(...MOUTH);
		// one even descending swing onto the harbour mouth: soft start, then constant speed through the outgoing dissolve.
		// Aimed a little north-east of the mouth, so the town's bright roofs and the field's south-west border stay below
		// the frame.
		const k = softStart((t - W(119)) / (W(129) + XF - W(119)), 0.3);
		return orbit({target: [m[0] + 0.08, m[1], m[2] - 0.05], az: lerp(356, 344, k), el: lerp(80, 68, k), dist: Math.exp(lerp(Math.log(2.3), Math.log(1.4), k)), fov: 40});
	};
	return (
		<Scene3D
			region="heimaey"
			wide="heimaey_wide"
			look="iceDawn"
			lookOverride={{satGain: 1.15}}
			cam={cam}
			// the front finishes cooling once, smoothly (monotone ramp, no oscillation); a faint warm glow stays in its cracks
			lava={(_r, t) => ({prog: [FIELD_FULL, 0, FIS_MAX], cool: [lerp(0.6, 0.86, easeInOut((t - W(119)) / 1.8)), 0, 0.97], gain: 1.0, noise: 70, thick: 0})}
			post={{bloom: 0.95, threshold: 0.9}}
			children={(r, t) => (
				<>
					<BoatsIn r={r} t={t} tracks={inbound} hull={hull} cabin={cabin} />
					<Billboards max={60} blending="normal" items={plume(t, r.at(I.front[0], I.front[1]), {n: 20, rise: 0.12, spread: 0.06, size: 0.08, grow: 2, seed: 70, color: [0.9, 0.88, 0.95], alpha: 0.35})} renderOrder={4} />
				</>
			)}
			overlay={(r, c, t) => {
				const f = P(c, r.at(I.front[0], I.front[1]));
				const o = P(c, r.at(I.frontOpp[0], I.frontOpp[1]));
				// «about 100 meters» — the gap is measured by a clean ruler; the voice gives the number
				return <Ruler a={f} b={o} k={easeOut((t - W(123) + 0.15) / 0.7)} />;
			}}
		/>
	);
};

type InTrack = {from: LL; via?: LL[]; to: LL; t0: number; dur: number};
const BoatsIn: React.FC<{r: Region; t: number; tracks: InTrack[]; hull: ReturnType<typeof propMat>; cabin: ReturnType<typeof propMat>}> = ({r, t, tracks, hull, cabin}) => (
	<>
		{tracks.map((b, i) => {
			if (t < b.t0) return null;
			const k = clamp01((t - b.t0) / b.dur);
			const e = k < 0.75 ? k : lerp(0.75, 1, easeOut((k - 0.75) / 0.25) * 0.85 + ((k - 0.75) / 0.25) * 0.15); // slows down entering the harbour
			const pts: LL[] = [b.from, ...(b.via ?? []), b.to];
			const seg = pts.slice(1).map((q, j) => Math.hypot(q[0] - pts[j][0], (q[1] - pts[j][1]) * 0.45));
			const tot = seg.reduce((a, c) => a + c, 0);
			let d = e * tot;
			let j = 0;
			while (j < seg.length - 1 && d > seg[j]) d -= seg[j++];
			const pa = llLerp(pts[j], pts[j + 1], seg[j] > 0 ? Math.min(1, d / seg[j]) : 1);
			const p = r.at(pa[0], pa[1]);
			const q = r.at(pts[j + 1][0], pts[j + 1][1]);
			const yaw = -Math.atan2(q[2] - p[2], q[0] - p[0]);
			return <Boat key={i} pos={[p[0], 0.002, p[2]]} yaw={yaw} scale={0.04} mat={hull} cabin={cabin} />;
		})}
	</>
);

/** clean measuring line between the lava front and the opposite shore: draws itself, ticks perpendicular, no number */
const Ruler: React.FC<{a: {x: number; y: number}; b: {x: number; y: number}; k: number; fade?: number}> = ({a, b, k, fade = 1}) => {
	if (k <= 0 || fade <= 0) return null;
	const x = lerp(a.x, b.x, k);
	const y = lerp(a.y, b.y, k);
	const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
	const nx = -(b.y - a.y) / L;
	const ny = (b.x - a.x) / L;
	const tick = 26;
	const endO = clamp01((k - 0.85) / 0.15);
	const col = '#FFD54A';
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: clamp01(k / 0.15) * clamp01(fade), filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.65))'}}>
			<line x1={a.x} y1={a.y} x2={x} y2={y} stroke={col} strokeWidth={6} strokeLinecap="round" />
			<line x1={a.x - nx * tick} y1={a.y - ny * tick} x2={a.x + nx * tick} y2={a.y + ny * tick} stroke={col} strokeWidth={6} strokeLinecap="round" />
			<line x1={b.x - nx * tick} y1={b.y - ny * tick} x2={b.x + nx * tick} y2={b.y + ny * tick} stroke={col} strokeWidth={6} strokeLinecap="round" opacity={endO} />
		</svg>
	);
};

// ================================================================ v5: Blender toon shots + tracked DOM overlays
type Pt = [number, number] | null;
type XY = {x: number; y: number};
type Track<F> = {t0: number; fps: number; n: number; frames: F[]};
/** the frame an ImgSeq shows at time t (the very formula ImgSeq uses), so overlays move in lockstep with the picture */
const seqK = (tr: {t0: number; fps: number; n: number}, t: number) => Math.max(0, Math.min(tr.n - 1, Math.floor((t - tr.t0) * tr.fps + 1e-6)));
/** track point → screen point; null (behind the camera) / missing → NaN, which every overlay here treats as «not shown» */
const xy = (p: Pt | undefined): XY => (p ? {x: p[0], y: p[1]} : {x: NaN, y: NaN});
const ok = (p: XY) => Number.isFinite(p.x) && Number.isFinite(p.y);
const mix = (a: XY, b: XY, k: number): XY => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k)});

const TRACK_A = trackA as unknown as Track<{crater: Pt; harbor: Pt; mouth: Pt; lava_front: Pt; route?: Pt[]; harbor_lobe?: Pt[]}>;
const TRACK_C = trackC as unknown as Track<{front: Pt; frontOpp: Pt}>;
/** the tracked lava front steps by up to ~6 px between some frames (it follows the arrival map's pixels): a centred Gaussian
 *  over ±24 frames (σ = 8) makes it glide; the camera's own motion is smooth, so the centred average adds no lag */
const FRONT_A: XY[] = (() => {
	const F = TRACK_A.frames.map((f) => xy(f.lava_front));
	const S = 8;
	return F.map((_, i) => {
		let sx = 0;
		let sy = 0;
		let sw = 0;
		for (let j = -3 * S; j <= 3 * S; j++) {
			const p = F[Math.max(0, Math.min(F.length - 1, i + j))];
			if (!ok(p)) continue;
			const w = Math.exp(-(j * j) / (2 * S * S));
			sx += w * p.x;
			sy += w * p.y;
			sw += w;
		}
		return sw > 0 ? {x: sx / sw, y: sy / sw} : {x: NaN, y: NaN};
	});
})();
/** iceland_b has no overlays: only its timing (t0 = W(109) of the render, last frame 58.267 s) */
const SEQ_B = {dir: 'blender/iceland_b', t0: 56.45, n: 110, fps: 60};

/**
 * «Then the lava turns toward the harbor»: one crisp warm arrow, no text. It starts just ahead of the moving front of the
 * harbour lobe, runs north to where that lobe really stopped (flows.json front_stop, on the channel's south shore) and turns
 * west into the harbour. Every point is tracked from the render; the tail fades into the front (no dots appearing or
 * vanishing as the front moves), it draws itself once and then simply follows the front.
 */
const LavaArrow: React.FC<{front: XY; stop: XY; mouth: XY; harbor: XY; t0: number; t1: number}> = ({front, stop, mouth, harbor, t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.35 || ![front, stop, mouth, harbor].every(ok)) return null;
	// (fix round: the front now advances almost to the channel, so the arrow runs on through the mouth into the basin itself)
	const c = mix(stop, mouth, 0.6);
	const end = harbor;
	const N = 36;
	const P: XY[] = [];
	for (let i = 0; i <= N; i++) {
		const s = lerp(0.07, 1, i / N);
		const u = 1 - s;
		P.push({x: u * u * front.x + 2 * u * s * c.x + s * s * end.x, y: u * u * front.y + 2 * u * s * c.y + s * s * end.y});
	}
	const seg = P.slice(1).map((p, i) => Math.hypot(p.x - P[i].x, p.y - P[i].y));
	const tot = seg.reduce((a, b) => a + b, 0) || 1;
	const k = easeInOut((t - t0) / 0.8);
	const o = clamp01((t - t0) / 0.25) * clamp01((t1 + 0.35 - t) / 0.35);
	let d = k * tot;
	const Q = [P[0]];
	let ux = 1;
	let uy = 0;
	for (let i = 0; i < seg.length && d > 0; i++) {
		const f = seg[i] > 0 ? Math.min(1, d / seg[i]) : 0;
		if (seg[i] > 0) {
			ux = (P[i + 1].x - P[i].x) / seg[i];
			uy = (P[i + 1].y - P[i].y) / seg[i];
		}
		Q.push(mix(P[i], P[i + 1], f));
		d -= seg[i];
	}
	const tip = Q[Q.length - 1];
	const hs = 28;
	const head = `M${(tip.x - ux * hs - uy * hs * 0.75).toFixed(1)} ${(tip.y - uy * hs + ux * hs * 0.75).toFixed(1)} L${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L${(tip.x - ux * hs + uy * hs * 0.75).toFixed(1)} ${(tip.y - uy * hs - ux * hs * 0.75).toFixed(1)}`;
	// tail fade: transparent at the front → full 70 px along the arrow (user space, interpolated by arc length every frame,
	// so the fade end glides with the front instead of stepping between samples)
	let fadeTo = P[N];
	for (let i = 0, acc = 0; i < seg.length; acc += seg[i], i++) {
		if (acc + seg[i] >= 70) {
			fadeTo = mix(P[i], P[i + 1], seg[i] > 0 ? (70 - acc) / seg[i] : 0);
			break;
		}
	}
	const col = '#FFD54A';
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))', pointerEvents: 'none'}}>
			<defs>
				<linearGradient id="iceLavaArrowTail" gradientUnits="userSpaceOnUse" x1={P[0].x} y1={P[0].y} x2={fadeTo.x} y2={fadeTo.y}>
					<stop offset={0} stopColor={col} stopOpacity={0} />
					<stop offset={1} stopColor={col} stopOpacity={1} />
				</linearGradient>
			</defs>
			<polyline points={Q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke="url(#iceLavaArrowTail)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
			<path d={head} fill="none" stroke={col} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01((k - 0.2) / 0.3)} />
		</svg>
	);
};

/** Iceland A (40.53 – 55.16), NIGHT version (owner 19.10; the eruption began at night): the globe dive lands on Heimaey (same
 *  opening camera as iceACamOrbit, and the toon sea starts in the globe's ocean blue before it darkens into the night sea, so
 *  GlobeHop's dissolve stays seamless) → the fissure rips open → a low flight from the south under the starry violet night sky
 *  with the moon (upper left): Eldfell + the billowing eruption cloud leaning west over the strait, the lit town, the harbour,
 *  the mainland on the horizon → the fleet (mast lights) sails out to the mainland → the glowing harbour-lobe tongue pushes
 *  toward the harbour mouth */
const IcelandABlender: React.FC = () => {
	const t = useT();
	const f = TRACK_A.frames[seqK(TRACK_A, t)];
	const crater = xy(f.crater);
	const harbor = xy(f.harbor);
	const lobe = f.harbor_lobe ?? [];
	// the route on screen: the fleet's water path from the harbour mouth (Iceland.tsx ARROW_PATH, projected by Blender)
	const route = t > W(94) ? (f.route ?? []).filter((p): p is [number, number] => p !== null).map(([x, y]) => ({x, y})) : [];
	return (
		<AbsoluteFill>
			<ImgSeq dir="blender/iceland_a" t0={TRACK_A.t0} n={TRACK_A.n} fps={TRACK_A.fps} />
			{/* «1973.», «5,300», «Six hours»: the big key figures come from Short.tsx (src/data/emph.ts); from ~46.5 s they sit on the
			    night sky / mainland strip at the top of the low southern view (iceland_a.py camera: horizon y ≈ 400–440 from 48 s, the
			    moon at the upper left, x < 250; the eruption cloud stays below y ≈ 690 while they are up — track.json `cloud`) */}
			{/* the new volcano gets its name (the voice never says it). Fix round 18.10 night: at «rips open» it was squeezed between
			    the KeyFacts «1973» and «5,300» (up 0.75 s, read as a blink); now in the first text-free window once the cone and its
			    cloud stand tall — «Then the lava…», after «To the Mainland» has faded (51.46 s; the lava arrow, no text, joins it at
			    52.72 s): fully up 51.91–53.17 s (1.26 s), gone by 53.47 s. Text right of the vent on the dark east lobe, clear of the column and the
			    fleet (iceland_a.py track) */}
			<MapLabel text="Eldfell" sub="new volcano" x={crater.x} y={crater.y} dx={175} dy={-15} t0={W(97) - 0.2} t1={W(101) + 0.1} size={54} />
			{/* «Six hours»: no clock icon here — the big KeyFact «6 HOURS» (Short.tsx) already says it (review 18.10: no duplicates) */}
			{/* «almost everyone's out» — where the boats went: dotted arrow along their sea route, round the headland and north to
			    the mainland coast on the horizon (its head stays in frame; cut only at the top safe line), + its name */}
			<RouteArrow pts={route} t0={W(94) + 0.15} t1={W(96) - 0.05} label="To the Mainland" maxX={1040} minY={300} />
			{/* «Then the lava turns toward the harbor» — the moving front of the harbour lobe, and where it is heading */}
			<LavaArrow front={FRONT_A[seqK(TRACK_A, t)]} stop={xy(lobe[lobe.length - 1])} mouth={xy(f.mouth)} harbor={harbor} t0={W(100) - 0.1} t1={W(104)} />
		</AbsoluteFill>
	);
};

/** Iceland B (56.45 – 58.27): the pump ship's two water cannons on the glowing front, steam, the lava turning black */
const IcelandBBlender: React.FC = () => (
	<AbsoluteFill>
		<ImgSeq dir={SEQ_B.dir} t0={SEQ_B.t0} n={SEQ_B.n} fps={SEQ_B.fps} />
	</AbsoluteFill>
);

/** the ruler leaves together with the KeyFact «~100 m» (its subtitle group ends 64.13 → KeyFact t1 63.98 + 0.3 fade) */
const RULER_OUT = 64.3;
/** Iceland C (61.91 – 66.34): the cooled field, the channel still open, boats sailing in; the ~100 m gap gets a ruler */
const IcelandCBlender: React.FC = () => {
	const t = useT();
	const f = TRACK_C.frames[seqK(TRACK_C, t)];
	const a = xy(f.front);
	const b = xy(f.frontOpp);
	return (
		<AbsoluteFill>
			<ImgSeq dir="blender/iceland_c" t0={TRACK_C.t0} n={TRACK_C.n} fps={TRACK_C.fps} />
			{/* «about 100 meters» — the gap is measured by a clean ruler; the voice gives the number (KeyFact «~100 m» in Short.tsx,
			    placed in the open sea right of the ruler, src/data/emph.ts). The ruler fades out with the KeyFact (gone by 64.65 s),
			    before the inbound boat sails through the gap (≈ 65.2–66.3 s, iceland_c.py INB) — never a «rope» tied to a hull */}
			{ok(a) && ok(b) ? <Ruler a={a} b={b} k={easeOut((t - W(123) + 0.15) / 0.7)} fade={1 - easeInOut((t - RULER_OUT) / 0.35)} /> : null}
		</AbsoluteFill>
	);
};

export const Iceland3DA: React.FC = () => (BLENDER_ICE_A ? <IcelandABlender /> : <Iceland3DA3js />);
export const Iceland3DB: React.FC = () => (BLENDER_ICE_B ? <IcelandBBlender /> : <Iceland3DB3js />);
export const Iceland3DC: React.FC = () => (BLENDER_ICE_C ? <IcelandCBlender /> : <Iceland3DC3js />);
