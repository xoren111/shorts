import React, {useId} from 'react';
import {INK, clamp01, easeInOut, easeOut, h1, lerp} from './gfx';
import {SKIN, SKIN_D, W, popK} from './draw';
import {HEAD, MONT} from '../fonts';
import {PAL} from '../theme';

// hay-castle draw kit B (series A look, same as conman-russell/cast.tsx): flat fills, INK outline W, palette PAL.
// Figures are drawn in their own units with the anchor at (0, 0) — usually the ground under them — and placed with x, y, s.
// Everything is driven by props: progress values 0..1 (the caller eases them) or «age» values = seconds since an event
// (negative = not happened yet). No numerals anywhere, no logos, no plates, no names, the word «hay» is never written.
// Volumes (dust, smoke, splash) are layered lobed shapes with one ink rim — never plain circles (owner taste 25.10).

// ===================================================================================================== helpers
const rgbOf = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** mix two #rrggbb colours (k = 0 → a, 1 → b); returns rgb() */
export const mixHex = (a: string, b: string, k: number) => {
	const A = rgbOf(a), B = rgbOf(b), q = clamp01(k);
	return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * q)).join(',')})`;
};
/** decaying wobble after an event: a = age (s), f = angular speed, damp = decay; 0 before the event */
export const wobble = (a: number | undefined, f = 16, damp = 5) => (a === undefined || a < 0 ? 0 : Math.sin(a * f) * Math.exp(-a * damp));
const inWin = (a: number | undefined, d: number): a is number => a !== undefined && a >= 0 && a < d;
const useSid = () => 'hb' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
const rad = (d: number) => (d * Math.PI) / 180;

/** a figure drawn in its own units: viewBox vb, anchor (0, 0) placed at (x, y), scale s; flip mirrors around the anchor */
const Fig: React.FC<{x: number; y: number; s?: number; vb: [number, number, number, number]; flip?: boolean; opacity?: number; children: React.ReactNode}> = ({x, y, s = 1, vb, flip, opacity, children}) => (
	<svg
		width={vb[2] * s}
		height={vb[3] * s}
		viewBox={vb.join(' ')}
		style={{position: 'absolute', left: x + vb[0] * s, top: y + vb[1] * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined, transformOrigin: `${-vb[0] * s}px ${-vb[1] * s}px`, opacity, pointerEvents: 'none'}}
	>
		{children}
	</svg>
);
/** a frame-sized svg layer (1080 × 1920 coordinates) */
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
		{children}
	</svg>
);

/** lobed «cartoon volume» outline around (cx, cy): n lobes of radius ≈ r; sy squashes it vertically */
export const lobePath = (cx: number, cy: number, r: number, seed = 1, n = 7, sy = 1) => {
	const off = h1(seed * 3.7) * 1.3;
	const pts: [number, number][] = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2 + off;
		const rr = r * (0.78 + 0.16 * h1(seed * 11.3 + i * 5.7));
		pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy]);
	}
	let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} `;
	for (let i = 0; i < n; i++) {
		const q = pts[(i + 1) % n];
		const am = ((i + 0.5) / n) * Math.PI * 2 + off;
		const bulge = r * (1.18 + 0.22 * h1(seed * 7.1 + i * 2.3));
		d += `Q${(cx + Math.cos(am) * bulge).toFixed(1)},${(cy + Math.sin(am) * bulge * sy).toFixed(1)} ${q[0].toFixed(1)},${q[1].toFixed(1)} `;
	}
	return d + 'Z';
};
const starPath = (cx: number, cy: number, r1: number, r2: number, n = 8, rot = 0) => {
	let d = '';
	for (let i = 0; i < n * 2; i++) {
		const r = i % 2 ? r2 : r1;
		const a = rot + (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
		d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `;
	}
	return d + 'Z';
};

export type PuffTone = 'dust' | 'smoke' | 'steam' | 'straw';
const PUFF: Record<PuffTone, [string, string, string]> = {
	// shade, base, light
	dust: ['#a88d63', '#d6c29b', '#f3e8cf'],
	smoke: ['#9a93a8', '#cbc6d4', '#f1eef5'],
	steam: ['#a9bccb', '#dfe9f1', '#ffffff'],
	straw: ['#b88d33', '#e1bd66', '#f7e4a6'],
};
/** one billowing volume as an SVG group (local units): n lobed blobs that grow and drift (dx, dy over the life) for dur s;
 *  a = age (s). Layers: one ink rim, shade, base (shifted up-left), highlights — reads as a real volume, not circles. */
export const PuffG: React.FC<{x: number; y: number; a: number; dur?: number; size?: number; n?: number; dx?: number; dy?: number; seed?: number; tone?: PuffTone; flat?: number}> = ({
	x, y, a, dur = 1.2, size = 120, n = 6, dx = 0, dy = -40, seed = 1, tone = 'dust', flat = 0.7,
}) => {
	if (a < 0 || a > dur) return null;
	const u = a / dur;
	const grow = easeOut(Math.min(1, u * 2.2));
	const fade = clamp01((1 - u) / 0.45);
	const [shade, base, light] = PUFF[tone];
	const blobs = Array.from({length: n}, (_, i) => {
		const ang = h1(seed * 9.1 + i * 4.3) * Math.PI * 2;
		const dist = size * (0.2 + 0.55 * h1(seed * 2.7 + i * 7.9)) * grow;
		const r = size * (0.34 + 0.3 * h1(seed * 5.3 + i * 3.1)) * (0.35 + 0.65 * grow);
		return {cx: x + Math.cos(ang) * dist * 1.25 + dx * u, cy: y + Math.sin(ang) * dist * flat + dy * u - r * 0.2, r, s: seed * 13 + i * 17};
	});
	return (
		<g opacity={fade}>
			{blobs.map((b, i) => <path key={`o${i}`} d={lobePath(b.cx, b.cy, b.r + 7, b.s)} fill={INK} />)}
			{blobs.map((b, i) => <path key={`s${i}`} d={lobePath(b.cx, b.cy, b.r, b.s)} fill={shade} />)}
			{blobs.map((b, i) => <path key={`b${i}`} d={lobePath(b.cx - b.r * 0.1, b.cy - b.r * 0.15, b.r * 0.82, b.s)} fill={base} />)}
			{blobs.map((b, i) => <path key={`l${i}`} d={lobePath(b.cx - b.r * 0.3, b.cy - b.r * 0.36, b.r * 0.38, b.s + 5, 5)} fill={light} />)}
		</g>
	);
};
/** PuffG in frame coordinates */
export const Puff: React.FC<React.ComponentProps<typeof PuffG>> = (p) => (p.a < 0 || p.a > (p.dur ?? 1.2) ? null : <Layer><PuffG {...p} /></Layer>);

/** hot sparks (SVG group): streaks fly out along dir (deg, SVG: 0 = right, −90 = up) ± spread/2 and fall; a = age, life 0.6 s */
export const SparksG: React.FC<{x: number; y: number; a: number; dir?: number; spread?: number; n?: number; size?: number; seed?: number}> = ({x, y, a, dir = -90, spread = 120, n = 14, size = 1, seed = 1}) => {
	if (a < 0 || a > 0.6) return null;
	const o = 1 - a / 0.6;
	const pos = (v: number, ang: number, tt: number) => [x + Math.cos(ang) * v * tt, y + Math.sin(ang) * v * tt + 1100 * size * tt * tt];
	return (
		<g>
			{a < 0.14 ? <path d={starPath(x, y, 70 * size * (1 - a / 0.14 * 0.4), 24 * size, 7, a * 9)} fill="#fff6c8" stroke="#ff9a2a" strokeWidth={6} /> : null}
			{Array.from({length: n}, (_, i) => {
				const ang = rad(dir + (h1(seed + i * 3.3) - 0.5) * spread);
				const v = (520 + 760 * h1(seed * 2 + i * 7.7)) * size;
				const [px, py] = pos(v, ang, a);
				const [qx, qy] = pos(v, ang, Math.max(0, a - 0.045));
				return (
					<g key={i} opacity={o}>
						<line x1={qx} y1={qy} x2={px} y2={py} stroke="#ff8a1f" strokeWidth={11 * size} strokeLinecap="round" />
						<line x1={qx} y1={qy} x2={px} y2={py} stroke="#fff6c8" strokeWidth={5 * size} strokeLinecap="round" />
					</g>
				);
			})}
		</g>
	);
};
export const Sparks: React.FC<React.ComponentProps<typeof SparksG>> = (p) => (p.a < 0 || p.a > 0.6 ? null : <Layer><SparksG {...p} /></Layer>);

const WATER = {deep: '#2c6f9e', mid: '#58a9d8', light: '#d6f0ff'};
/** a water splash (SVG group) on a surface at (x, y): a sheet with rounded liquid fingers (ball tips) rises and falls, drops fly
 *  on arcs, a ring spreads. a = age (s), life 0.95 s. part: 'back' = ring + sheet + fingers (draw behind whatever pops out),
 *  'front' = flying drops (draw in front), 'all' = both */
export const SplashG: React.FC<{x: number; y: number; a: number; size?: number; seed?: number; part?: 'back' | 'front' | 'all'}> = ({x, y, a, size = 1, seed = 1, part = 'all'}) => {
	if (a < 0 || a > 0.95) return null;
	const rise = Math.sin(Math.PI * clamp01(a / 0.6));
	const w = 110 * size * (0.7 + 0.5 * easeOut(a / 0.4));
	const H = 150 * size * rise;
	const fade = clamp01((0.95 - a) / 0.3);
	const fingers = Array.from({length: 5}, (_, i) => {
		const u = ((i + 0.5) / 5) * 2 - 1;
		const hh = H * (0.62 + 0.38 * h1(seed * 3 + i * 1.9)) * (1 - 0.32 * Math.abs(u));
		return {px: x + u * w * 0.85, hh, lean: u * hh * 0.45, fw: 17 * size * (1 - 0.25 * Math.abs(u))};
	});
	const fp = (f: (typeof fingers)[number], g: number) =>
		`M${f.px - f.fw * g},${y} Q${f.px - f.fw * 0.55 * g + f.lean * 0.45},${y - f.hh * 0.62} ${f.px + f.lean},${y - f.hh} Q${f.px + f.fw * 0.55 * g + f.lean * 0.45},${y - f.hh * 0.62} ${f.px + f.fw * g},${y} Z`;
	const sheet = (g: number) => `M${x - w * g},${y} Q${x},${y - H * 0.55 * g} ${x + w * g},${y} Q${x},${y + 22 * size} ${x - w * g},${y} Z`;
	const ball = (f: (typeof fingers)[number]) => ({cx: f.px + f.lean * 1.15, cy: y - f.hh - f.fw * (0.9 + 1.6 * clamp01((a - 0.15) / 0.4)), r: f.fw * 0.85});
	const back = (
		<g>
			<ellipse cx={x} cy={y} rx={w * (1.1 + a)} ry={w * (1.1 + a) * 0.22} fill="none" stroke={WATER.light} strokeWidth={8 * size * (1 - a)} />
			{H > 6 ? (
				<g>
					{/* one ink rim around the whole liquid shape, then fills */}
					<path d={sheet(1)} fill={INK} stroke={INK} strokeWidth={10} strokeLinejoin="round" />
					{fingers.map((f, i) => <path key={`o${i}`} d={fp(f, 1)} fill={INK} stroke={INK} strokeWidth={10} strokeLinejoin="round" />)}
					{fingers.map((f, i) => { const b = ball(f); return <circle key={`ob${i}`} cx={b.cx} cy={b.cy} r={b.r + 4} fill={INK} />; })}
					<path d={sheet(1)} fill={WATER.mid} />
					{fingers.map((f, i) => <path key={`m${i}`} d={fp(f, 1)} fill={WATER.mid} />)}
					{fingers.map((f, i) => { const b = ball(f); return <circle key={`b${i}`} cx={b.cx} cy={b.cy} r={b.r} fill={WATER.mid} />; })}
					<path d={sheet(0.62)} fill={WATER.deep} opacity={0.55} />
					{fingers.map((f, i) => <path key={`l${i}`} d={`M${f.px - f.fw * 0.35},${y - f.hh * 0.15} Q${f.px - f.fw * 0.3 + f.lean * 0.4},${y - f.hh * 0.6} ${f.px + f.lean * 0.85},${y - f.hh * 0.9}`} stroke={WATER.light} strokeWidth={5 * size} fill="none" strokeLinecap="round" />)}
					{fingers.map((f, i) => { const b = ball(f); return <circle key={`h${i}`} cx={b.cx - b.r * 0.3} cy={b.cy - b.r * 0.3} r={b.r * 0.3} fill="#fff" />; })}
				</g>
			) : null}
		</g>
	);
	const front = (
		<g>
			{Array.from({length: 8}, (_, i) => {
				const ang = rad(-150 + (120 * i) / 7 + (h1(seed + i) - 0.5) * 14);
				const v = (620 + 380 * h1(seed * 5 + i * 2.1)) * size;
				const g = 1900 * size;
				const px = x + Math.cos(ang) * v * a * 0.75;
				const py = y + Math.sin(ang) * v * a + g * a * a * 0.5;
				if (py > y + 10) return null;
				const vy = Math.sin(ang) * v + g * a;
				const vx = Math.cos(ang) * v * 0.75;
				const rot = (Math.atan2(vy, vx) * 180) / Math.PI - 90;
				const r = (9 + 7 * h1(seed * 7 + i)) * size;
				return (
					<g key={i} transform={`translate(${px} ${py}) rotate(${rot})`}>
						<path d={`M0,${-r} Q${r * 1.1},${r * 0.3} 0,${r * 2.1} Q${-r * 1.1},${r * 0.3} 0,${-r} Z`} fill={WATER.mid} stroke={INK} strokeWidth={3} />
						<circle cx={-r * 0.3} cy={r * 0.2} r={r * 0.28} fill={WATER.light} />
					</g>
				);
			})}
		</g>
	);
	return (
		<g opacity={fade}>
			{part !== 'front' ? back : null}
			{part !== 'back' ? front : null}
		</g>
	);
};
export const Splash: React.FC<React.ComponentProps<typeof SplashG>> = (p) => (p.a < 0 || p.a > 0.95 ? null : <Layer><SplashG {...p} /></Layer>);

/** a comic impact star (SVG group) at (x, y): gold star + white core + two shock rings; a = age, life 0.25 s */
export const ImpactG: React.FC<{x: number; y: number; a: number; r?: number}> = ({x, y, a, r = 110}) => {
	if (a < 0 || a > 0.25) return null;
	const k = a / 0.25;
	return (
		<g opacity={1 - k * k}>
			{[0, 0.4].map((d) => {
				const q = clamp01(k - d);
				return q > 0 ? <circle key={d} cx={x} cy={y} r={r * (0.8 + 1.6 * q)} fill="none" stroke="#fff" strokeWidth={14 * (1 - q)} /> : null;
			})}
			<path d={starPath(x, y, r * (0.9 + 0.4 * k), r * 0.42, 9, 0.2)} fill={PAL.gold} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			<path d={starPath(x, y, r * 0.5, r * 0.24, 9, 0.2)} fill="#fffbe8" />
		</g>
	);
};

// ===================================================================================================== FIELD
export type Season = 'summer' | 'snow' | 'blossom' | 'autumn';
type SeasonPal = {skyT: string; skyB: string; sun: string; far: string; mid: string; near: string; verge: string; crown: string; crownD: string; trunk: string; road: string; fence: string; cloud: string};
export const SEASONS: Record<Season, SeasonPal> = {
	summer: {skyT: '#5fb4ea', skyB: '#fff2cf', sun: '#ffd75a', far: '#9cc77a', mid: '#7cb655', near: '#66a446', verge: '#4f8f37', crown: '#3f9a3e', crownD: '#2c7a30', trunk: '#6b4a2c', road: '#6d665e', fence: '#a0703e', cloud: '#ffffff'},
	snow: {skyT: '#8aa3bc', skyB: '#e6edf4', sun: '#f4f3ea', far: '#eef3f8', mid: '#e2eaf3', near: '#d6e1ec', verge: '#cad7e5', crown: '#eef4fa', crownD: '#a9bccf', trunk: '#4a3a30', road: '#5a6270', fence: '#7a5a40', cloud: '#e1e7ee'},
	blossom: {skyT: '#7cc6ee', skyB: '#fde6ee', sun: '#ffe58a', far: '#b3dc85', mid: '#97cd66', near: '#80bd52', verge: '#69a83f', crown: '#f6a6c4', crownD: '#d27399', trunk: '#6b4a2c', road: '#6d665e', fence: '#a0703e', cloud: '#ffffff'},
	// autumn: the sky stays light (no orange wash over the frame); only the trees (orange / gold) and the fields (golden stubble,
	// olive grass) change, and the falling leaves carry the season
	autumn: {skyT: '#6cb3e2', skyB: '#fff0d4', sun: '#ffd25a', far: '#d9c06a', mid: '#b9b452', near: '#93a845', verge: '#7a9439', crown: '#FF7A1F', crownD: '#c4561c', trunk: '#5a3a24', road: '#6d665e', fence: '#8a5a32', cloud: '#ffffff'},
};

/** a round-crowned tree (SVG group), (x, y) = foot of the trunk */
const Tree: React.FC<{x: number; y: number; s: number; crown: string; crownD: string; trunk: string; seed: number; blossom: number}> = ({x, y, s, crown, crownD, trunk, seed, blossom}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M-8,0 L-6,-56 L6,-56 L8,0 Z" fill={trunk} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
		<path d={lobePath(0, -84, 44, seed, 6)} fill={crownD} stroke={INK} strokeWidth={4} />
		<path d={lobePath(-6, -90, 36, seed + 2, 6)} fill={crown} />
		<path d={lobePath(-16, -102, 13, seed + 4, 5)} fill="#ffffff" opacity={0.28} />
		{blossom > 0.01 ? [[-20, -88], [10, -104], [18, -78], [-4, -70], [-18, -110]].map(([bx, by], i) => <circle key={i} cx={bx} cy={by} r={5} fill="#fff" opacity={blossom} />) : null}
	</g>
);

/**
 * Countryside backdrop, full frame (1080 × 1920): sky gradient + sun + drifting clouds, three rolling field bands with trees and
 * a hedge, a wooden fence, a country road across the foreground (centre dashes) and the grass verge below it.
 * season = target season; from + mix (0..1) blend from another season (fast season flips: animate mix 0→1 in ~0.12 s).
 * cam = camera parallax offset in px (far layers move less). Falling snow / petals / leaves come with the season (weather 0..1).
 * Key heights: horizon (default 600), roadY = road centre (default 1040; a car's anchor ≈ roadY + 30).
 */
export const FieldBg: React.FC<{t: number; season?: Season; from?: Season; mix?: number; cam?: number; horizon?: number; roadY?: number; fence?: boolean; road?: boolean; weather?: number}> = ({
	t, season = 'summer', from, mix = 1, cam = 0, horizon = 600, roadY = 1040, fence = true, road = true, weather = 1,
}) => {
	const f0 = from ?? season;
	const m = f0 === season ? 1 : clamp01(mix);
	const C = (k: keyof SeasonPal) => mixHex(SEASONS[f0][k], SEASONS[season][k], m);
	const wt = (s: Season) => (s === season ? m : 0) + (s === f0 && f0 !== season ? 1 - m : 0);
	const wSnow = wt('snow'), wBlos = wt('blossom'), wAut = wt('autumn'), wSum = wt('summer');
	const X0 = -60, X1 = 1140;
	const far = (wx: number) => horizon - 30 + 26 * Math.sin(wx / 210 + 0.7) + 12 * Math.sin(wx / 83 + 2.1);
	const mid = (wx: number) => horizon + 120 + 20 * Math.sin(wx / 300 + 1.3) + 8 * Math.sin(wx / 120);
	const near = (wx: number) => horizon + 250 + 12 * Math.sin(wx / 380 + 0.4);
	const band = (fn: (wx: number) => number, par: number, open = false) => {
		let d = open ? '' : `M${X0},2000 `;
		for (let sx = X0; sx <= X1; sx += 20) d += `${open && sx === X0 ? 'M' : 'L'}${sx},${fn(sx + cam * par).toFixed(1)} `;
		return open ? d : d + `L${X1},2000 Z`;
	};
	const rows = (par: number, period: number, pad = 150) => {
		const off = cam * par;
		const i0 = Math.floor((X0 + off - pad) / period), i1 = Math.ceil((X1 + off + pad) / period);
		return Array.from({length: i1 - i0 + 1}, (_, k) => i0 + k).map((i) => ({i, sx: i * period - off}));
	};
	const roadTop = roadY - 64, roadBot = roadY + 64;
	const crown = C('crown'), crownD = C('crownD'), trunk = C('trunk');
	const sunR = 80 + 8 * wAut;
	const hedge = (() => {
		const par = 0.3, off = cam * par;
		let d = '';
		const pts: [number, number][] = [];
		for (let sx = X0; sx <= X1; sx += 34) pts.push([sx, mid(sx + off)]);
		d = `M${X0},${pts[0][1] + 14} `;
		pts.forEach(([sx, sy], i) => {
			if (i === 0) return;
			const [px, py] = pts[i - 1];
			d += `L${px},${py - 6} Q${(px + sx) / 2},${(py + sy) / 2 - 34 - 10 * h1(Math.floor((sx + off) / 34))} ${sx},${sy - 6} `;
		});
		d += `L${X1},${pts[pts.length - 1][1] + 14} Z`;
		return d;
	})();
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'hidden', background: `linear-gradient(180deg, ${C('skyT')} 0%, ${C('skyB')} ${((horizon / 1920) * 100).toFixed(1)}%, ${C('skyB')} 100%)`}}>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{/* sun + clouds */}
				<g opacity={1 - 0.55 * wSnow}>
					<circle cx={820 - cam * 0.02} cy={horizon - 330 + wAut * 60} r={sunR * 1.6} fill={C('sun')} opacity={0.25} />
					<circle cx={820 - cam * 0.02} cy={horizon - 330 + wAut * 60} r={sunR} fill={C('sun')} />
				</g>
				{[0, 1, 2].map((i) => {
					const cx = (((i * 470 + t * 16 - cam * 0.05) % 1600) + 1600) % 1600 - 260;
					const cy = horizon - 430 + i * 105;
					return <path key={i} d={lobePath(cx, cy, 70 + i * 16, i + 3, 8, 0.48)} fill={C('cloud')} opacity={0.95} />;
				})}
				{/* far hills + trees */}
				<path d={band(far, 0.12)} fill={C('far')} />
				<path d={band(far, 0.12, true)} fill="none" stroke={INK} strokeWidth={4} strokeOpacity={0.55} />
				{rows(0.12, 120).map(({i, sx}) => (h1(i * 3.3) < 0.38 ? null : <Tree key={i} x={sx + h1(i * 1.7) * 50} y={far(sx + h1(i * 1.7) * 50 + cam * 0.12) + 10} s={0.62 + 0.32 * h1(i * 5.1)} crown={crown} crownD={crownD} trunk={trunk} seed={i} blossom={wBlos} />))}
				{/* mid field + hedge */}
				<path d={band(mid, 0.3)} fill={C('mid')} />
				<path d={hedge} fill={crownD} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				{[50, 95].map((o) => <path key={o} d={band((wx) => mid(wx) + o, 0.3, true)} fill="none" stroke={INK} strokeOpacity={0.12} strokeWidth={6} />)}
				{rows(0.3, 260).map(({i, sx}) => (h1(i * 7.7) < 0.55 ? null : <Tree key={`m${i}`} x={sx} y={mid(sx + cam * 0.3) + 4} s={1.05 + 0.3 * h1(i * 2.2)} crown={crown} crownD={crownD} trunk={trunk} seed={i + 40} blossom={wBlos} />))}
				{/* near field (the castle / bale wall stands here) */}
				<path d={band(near, 0.55)} fill={C('near')} stroke={INK} strokeWidth={4} strokeOpacity={0.6} />
				{rows(0.55, 76).map(({i, sx}) => {
					const yy = near(sx + cam * 0.55) + 30 + h1(i * 3.1) * (roadTop - 80 - near(sx + cam * 0.55) - 30);
					return <path key={`t${i}`} d={`M${sx - 10},${yy} L${sx - 4},${yy - 16} M${sx},${yy} L${sx + 2},${yy - 20} M${sx + 10},${yy} L${sx + 8},${yy - 14}`} stroke={crownD} strokeWidth={4} strokeLinecap="round" opacity={0.7} />;
				})}
				{/* fence */}
				{fence ? (
					<g>
						{[roadTop - 98, roadTop - 56].map((ry) => (
							<g key={ry}>
								<rect x={X0} y={ry} width={X1 - X0} height={16} fill={C('fence')} stroke={INK} strokeWidth={5} />
								<rect x={X0} y={ry - 6} width={X1 - X0} height={9} rx={4} fill="#fbfdff" opacity={wSnow} />
							</g>
						))}
						{rows(0.8, 128).map(({i, sx}) => (
							<g key={`p${i}`}>
								<path d={`M${sx - 12},${roadTop - 4} L${sx - 12},${roadTop - 118} L${sx},${roadTop - 132} L${sx + 12},${roadTop - 118} L${sx + 12},${roadTop - 4} Z`} fill={C('fence')} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
								<path d={lobePath(sx, roadTop - 132, 15, i + 9, 5, 0.6)} fill="#fbfdff" stroke={INK} strokeWidth={3} opacity={wSnow} />
							</g>
						))}
					</g>
				) : null}
				{/* road */}
				{road ? (
					<g>
						<rect x={X0} y={roadTop} width={X1 - X0} height={roadBot - roadTop} fill={C('road')} />
						<rect x={X0} y={roadBot - 20} width={X1 - X0} height={20} fill="#000" opacity={0.14} />
						<line x1={X0} y1={roadY} x2={X1} y2={roadY} stroke="#efe9d8" strokeWidth={9} strokeDasharray="70 60" strokeDashoffset={cam} strokeLinecap="round" />
						<line x1={X0} y1={roadTop} x2={X1} y2={roadTop} stroke={INK} strokeWidth={6} />
						<line x1={X0} y1={roadBot} x2={X1} y2={roadBot} stroke={INK} strokeWidth={6} />
						{wSnow > 0.01 ? rows(1, 90).map(({i, sx}) => <path key={`s${i}`} d={lobePath(sx, roadBot - 4, 30 + 14 * h1(i), i, 5, 0.42)} fill="#fbfdff" stroke={INK} strokeWidth={3} opacity={wSnow} />) : null}
						{wAut > 0.01 ? rows(1, 70).map(({i, sx}) => <path key={`l${i}`} d="M-12,0 Q0,-9 12,0 Q0,9 -12,0 Z" transform={`translate(${sx + h1(i) * 40} ${roadTop + 16 + h1(i * 3) * 100}) rotate(${h1(i * 7) * 180})`} fill={['#e0742a', '#c8502a', '#e8a33a'][i % 3 < 0 ? 0 : i % 3]} stroke={INK} strokeWidth={2} opacity={wAut} />) : null}
						{wBlos > 0.01 ? rows(1, 60).map(({i, sx}) => <ellipse key={`b${i}`} cx={sx + h1(i * 2) * 40} cy={roadTop + 14 + h1(i * 5) * 100} rx={7} ry={4} fill="#f9b8cf" opacity={wBlos} />) : null}
					</g>
				) : null}
				{/* verge below the road (foreground, moves fastest) */}
				<rect x={X0} y={roadBot + 3} width={X1 - X0} height={2000} fill={C('verge')} />
				<rect x={X0} y={roadBot + 3} width={X1 - X0} height={26} fill="#fff" opacity={0.12} />
				{rows(1.15, 92).map(({i, sx}) => {
					const yy = roadBot + 60 + h1(i * 2.3) * 420;
					const fl = h1(i * 9.1) > 0.55;
					return (
						<g key={`v${i}`} transform={`translate(${sx} ${yy})`}>
							<path d="M-16,0 L-10,-34 M-2,0 L0,-46 M10,0 L14,-30" stroke={crownD} strokeWidth={6} strokeLinecap="round" />
							{fl && wSum > 0.01 ? <g opacity={wSum}><circle cx={0} cy={-50} r={10} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={0} cy={-50} r={4} fill={PAL.gold} /></g> : null}
							{fl && wBlos > 0.01 ? <g opacity={wBlos}><circle cx={0} cy={-50} r={10} fill="#f6a6c4" stroke={INK} strokeWidth={3} /><circle cx={0} cy={-50} r={4} fill="#fff" /></g> : null}
							{wSnow > 0.01 ? <path d={lobePath(0, -6, 28, i, 5, 0.45)} fill="#fbfdff" stroke={INK} strokeWidth={3} opacity={wSnow} /> : null}
						</g>
					);
				})}
				{/* weather */}
				{wSnow * weather > 0.01
					? Array.from({length: 48}, (_, i) => {
							const fx = ((((h1(i * 3.9) * 1180 - cam * 0.6 + Math.sin(t * 1.7 + i) * 26) % 1180) + 1180) % 1180) - 50;
							const fy = ((h1(i * 7.1) * 2100 + t * (140 + 90 * h1(i))) % 2100) - 100;
							return <circle key={`f${i}`} cx={fx} cy={fy} r={4 + 6 * h1(i * 2.7)} fill="#fff" stroke="#8ea7bf" strokeWidth={2} opacity={wSnow * weather} />;
						})
					: null}
				{wBlos * weather > 0.01
					? Array.from({length: 24}, (_, i) => {
							const fx = ((((h1(i * 4.3) * 1180 - cam * 0.6 + Math.sin(t * 1.3 + i) * 50) % 1180) + 1180) % 1180) - 50;
							const fy = ((h1(i * 6.1) * 2100 + t * (90 + 60 * h1(i))) % 2100) - 100;
							return <ellipse key={`p${i}`} cx={fx} cy={fy} rx={10} ry={6} fill="#f9b8cf" stroke="#c96a90" strokeWidth={2} transform={`rotate(${t * 120 + i * 40} ${fx} ${fy})`} opacity={wBlos * weather} />;
						})
					: null}
				{wAut * weather > 0.01
					? Array.from({length: 18}, (_, i) => {
							const fx = ((((h1(i * 5.3) * 1180 - cam * 0.6 + Math.sin(t * 1.6 + i) * 60) % 1180) + 1180) % 1180) - 50;
							const fy = ((h1(i * 8.1) * 2100 + t * (120 + 70 * h1(i))) % 2100) - 100;
							return <path key={`a${i}`} d="M-16,0 Q0,-12 16,0 Q0,12 -16,0 Z M-16,0 L16,0" transform={`translate(${fx} ${fy}) rotate(${t * 200 + i * 50})`} fill={['#e0742a', '#c8502a', '#e8a33a'][i % 3]} stroke={INK} strokeWidth={3} opacity={wAut * weather} />;
						})
					: null}
			</svg>
		</div>
	);
};

// ===================================================================================================== CAR
/**
 * A plain small hatchback, side view facing right (no logo, no plates, no text). (x, y) = ground under its middle; ~620 × 300 at s 1.
 * look: driver's head turn −1..1 (0 = profile, eyes on the road; 1 = head turned to the camera/field side, eyes wide;
 * −1 = turned away, back of the head). speed: wheel turns per second ≈ (0 = parked, no bob, no exhaust). flip = drives left.
 */
export const Car: React.FC<{x: number; y: number; s?: number; t: number; look?: number; speed?: number; flip?: boolean; color?: string; exhaust?: boolean}> = ({x, y, s = 1, t, look = 0, speed = 1.6, flip, color = PAL.teal, exhaust = true}) => {
	const dark = mixHex(color, '#000000', 0.3);
	const light = mixHex(color, '#ffffff', 0.38);
	const moving = speed !== 0;
	const bob = moving ? Math.sin(t * 17) * 2.5 + Math.sin(t * 7.3) * 1.5 : 0;
	const spin = t * speed * 360;
	const k = Math.max(-1, Math.min(1, look));
	const f = Math.max(0, k);
	const away = Math.max(0, -k);
	const hx = 52, hy = -222;
	const L = (a: number, b: number) => lerp(a, b, f);
	const hair = '#3b2a20';
	const wheel = (cx: number) => (
		<g transform={`translate(${cx} -58)`}>
			<circle r={60} fill="#22222a" stroke={INK} strokeWidth={W} />
			<circle r={34} fill="#c9ccd2" stroke={INK} strokeWidth={4} />
			<g transform={`rotate(${spin})`}>
				{[0, 72, 144, 216, 288].map((a) => <path key={a} d="M0,-6 L0,-29" stroke="#6b7078" strokeWidth={9} strokeLinecap="round" transform={`rotate(${a})`} />)}
			</g>
			<circle r={9} fill="#5b6068" />
		</g>
	);
	return (
		<Fig x={x} y={y} s={s} vb={[-360, -330, 720, 360]} flip={flip}>
			<ellipse cx={0} cy={0} rx={300} ry={20} fill="rgba(0,0,0,0.28)" />
			{moving && exhaust
				? [0, 1, 2].map((i) => {
						const ph = t * 1.7 + i / 3;
						return <PuffG key={i} x={-322} y={-66} a={(ph % 1) * 0.9} dur={0.9} size={30} n={3} dx={-150} dy={-34} seed={i + Math.floor(ph) * 7} tone="smoke" />;
					})
				: null}
			<g transform={`translate(0 ${bob})`}>
				<path d="M-296,-60 L-302,-160 Q-300,-182 -276,-186 L-222,-270 Q-210,-288 -186,-288 L96,-288 Q118,-288 132,-272 L208,-190 L282,-178 Q308,-172 310,-140 L310,-66 Q310,-40 286,-40 L-276,-40 Q-296,-40 -296,-60 Z" fill={color} stroke={INK} strokeWidth={W + 1} strokeLinejoin="round" />
				<path d="M-292,-96 L306,-96 L306,-66 Q306,-44 286,-44 L-276,-44 Q-292,-44 -292,-62 Z" fill={dark} opacity={0.55} />
				<path d="M-190,-282 L96,-282" stroke={light} strokeWidth={8} strokeLinecap="round" opacity={0.8} />
				{/* glass + driver */}
				<path d="M-206,-188 L-160,-262 Q-152,-272 -140,-272 L-40,-272 L-40,-188 Z" fill="#bfe6ff" />
				<path d="M-20,-188 L-20,-272 L92,-272 Q104,-272 112,-262 L176,-188 Z" fill="#bfe6ff" />
				<g>
					<path d={`M${hx - 60},-176 Q${hx},-212 ${hx + 60},-176 Z`} fill="#e8e2d4" stroke={INK} strokeWidth={4} />
					<rect x={hx - 13} y={-198} width={26} height={22} fill={SKIN_D} />
					{f > 0.45 ? <ellipse cx={hx + 40} cy={hy + 4} rx={8} ry={13} fill={SKIN_D} stroke={INK} strokeWidth={3} /> : null}
					<ellipse cx={L(hx - 16, hx - 40)} cy={hy + 4} rx={8} ry={13} fill={SKIN_D} stroke={INK} strokeWidth={3} />
					<ellipse cx={hx + 4 * (1 - f)} cy={hy + 4} rx={38} ry={40} fill={SKIN} stroke={INK} strokeWidth={5} />
					<path
						d={`M${L(hx - 40, hx - 40)},${L(hy + 10, hy - 4)} Q${L(hx - 46, hx - 44)},${hy - 44} ${hx},${hy - 44} Q${L(hx + 36, hx + 44)},${hy - 44} ${L(hx + 40, hx + 40)},${L(hy - 18, hy - 4)} Q${L(hx + 8, hx + 20)},${L(hy - 30, hy - 28)} ${L(hx - 14, hx)},${L(hy - 20, hy - 26)} Q${L(hx - 24, hx - 20)},${L(hy - 6, hy - 28)} ${L(hx - 28, hx - 40)},${L(hy + 16, hy - 4)} Z`}
						fill={hair}
						stroke={INK}
						strokeWidth={4}
						strokeLinejoin="round"
					/>
					<g opacity={1 - away}>
						{[0, 1].map((e) => {
							const ex = e ? L(hx + 22, hx + 15) : L(hx + 22, hx - 15);
							if (e === 1 && f < 0.15) return null;
							const rx = 8 + 3 * f, ry = 10 + 4 * f;
							return (
								<g key={e}>
									<ellipse cx={ex} cy={hy - 2} rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth={3} />
									<circle cx={ex + L(3, 0)} cy={hy - 2 - 2 * f} r={5} fill={INK} />
									<path d={`M${ex - 9},${hy - 16 - 7 * f} L${ex + 9},${hy - 18 - 8 * f}`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
								</g>
							);
						})}
						<path d={`M${L(hx + 38, hx + 2)},${hy + 2} Q${L(hx + 52, hx + 10)},${hy + 12} ${L(hx + 38, hx)},${hy + 18}`} stroke={INK} strokeWidth={4} fill={SKIN} strokeLinecap="round" />
						{f > 0.6 ? <ellipse cx={hx} cy={hy + 26} rx={7} ry={9} fill="#5a1a24" stroke={INK} strokeWidth={3} /> : <path d={`M${L(hx + 18, hx - 10)},${hy + 26} L${L(hx + 34, hx + 10)},${hy + 24}`} stroke={INK} strokeWidth={4} strokeLinecap="round" />}
					</g>
					{away > 0 ? <ellipse cx={hx} cy={hy + 2} rx={39} ry={41} fill={hair} stroke={INK} strokeWidth={4} opacity={Math.min(1, away * 1.4)} /> : null}
				</g>
				<rect x={-232} y={-188} width={420} height={14} fill={color} />
				<path d="M-206,-188 L-160,-262 Q-152,-272 -140,-272 L-40,-272 L-40,-188 Z M-20,-188 L-20,-272 L92,-272 Q104,-272 112,-262 L176,-188 Z" fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<path d="M-150,-258 L-120,-258 L-170,-196 L-186,-196 Z M60,-268 L84,-268 L40,-196 L18,-196 Z" fill="#fff" opacity={0.42} />
				<line x1={-30} y1={-186} x2={-30} y2={-52} stroke={INK} strokeWidth={4} />
				<rect x={-6} y={-166} width={36} height={11} rx={5} fill={dark} stroke={INK} strokeWidth={3} />
				<path d="M178,-208 L206,-214 L212,-192 L186,-188 Z" fill={dark} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<ellipse cx={298} cy={-138} rx={11} ry={18} fill="#fff3b0" stroke={INK} strokeWidth={4} />
				<rect x={-304} y={-164} width={16} height={34} rx={5} fill="#e0303f" stroke={INK} strokeWidth={4} />
				<rect x={282} y={-84} width={36} height={32} rx={10} fill="#4a4f58" stroke={INK} strokeWidth={4} />
				<rect x={-312} y={-84} width={34} height={32} rx={10} fill="#4a4f58" stroke={INK} strokeWidth={4} />
				{[-186, 190].map((cx) => <path key={cx} d={`M${cx - 76},-40 A76,76 0 0 1 ${cx + 76},-40 Z`} fill="#18181e" stroke={INK} strokeWidth={4} />)}
			</g>
			{wheel(-186)}
			{wheel(190)}
		</Fig>
	);
};

// ===================================================================================================== WRECKING BALL + PADLOCK
/**
 * Angle (deg) of a wrecking ball that swings in from the right and clangs off something at tHit: from `from` it accelerates to
 * `hitAngle`, then bounces off in decaying hops and droops against it. Feed it to WreckingBall.angle.
 */
export const wreckAngle = (t: number, tHit: number, from = 62, hitAngle = -4, swing = 0.55) => {
	if (t < tHit - swing) return from;
	if (t < tHit) {
		const k = (t - (tHit - swing)) / swing;
		return lerp(from, hitAngle, k * k);
	}
	const a = t - tHit;
	return hitAngle + 26 * Math.abs(Math.sin(a * 5.2)) * Math.exp(-a * 1.7) + 3 * (1 - Math.exp(-a * 2));
};

/**
 * Wrecking ball on a chain. (x, y) = chain pivot (above the frame top is fine); angle in deg (0 = hanging straight down, + = ball
 * to the right); len = chain length, r = ball radius (local units). hit = age (s) since it clanged → the ball rings (vibration
 * arcs on the side away from hitSide); the impact star itself is drawn by the thing it hit (GiantPadlock.hit).
 */
export const WreckingBall: React.FC<{x: number; y: number; angle: number; len?: number; r?: number; s?: number; hit?: number; hitSide?: 'left' | 'right'}> = ({x, y, angle, len = 720, r = 110, s = 1, hit, hitSide = 'left'}) => {
	const a = rad(angle);
	const ux = Math.sin(a), uy = Math.cos(a);
	const bx = ux * len, by = uy * len;
	const n = Math.max(0, Math.floor((len - r - 24) / 30));
	const jit = inWin(hit, 0.4) ? wobble(hit, 70, 9) * 7 : 0;
	const sx = hitSide === 'left' ? -1 : 1;
	return (
		<Fig x={x} y={y} s={s} vb={[-len - r - 60, -40, 2 * (len + r + 60), len + r + 140]}>
			<line x1={0} y1={0} x2={ux * (len - r)} y2={uy * (len - r)} stroke={INK} strokeWidth={14} strokeLinecap="round" />
			{Array.from({length: n}, (_, i) => {
				const d = 14 + i * 30;
				const cx = ux * d, cy = uy * d;
				return i % 2 ? (
					<ellipse key={i} cx={cx} cy={cy} rx={11} ry={21} fill="none" stroke={INK} strokeWidth={13} transform={`rotate(${-angle} ${cx} ${cy})`} />
				) : (
					<rect key={i} x={cx - 6} y={cy - 20} width={12} height={40} rx={6} fill="#7a828c" stroke={INK} strokeWidth={4} transform={`rotate(${-angle} ${cx} ${cy})`} />
				);
			})}
			{Array.from({length: n}, (_, i) => {
				const d = 14 + i * 30;
				const cx = ux * d, cy = uy * d;
				return i % 2 ? <ellipse key={`h${i}`} cx={cx} cy={cy} rx={11} ry={21} fill="none" stroke="#a9b1bb" strokeWidth={6} transform={`rotate(${-angle} ${cx} ${cy})`} /> : null;
			})}
			<g transform={`translate(${bx + jit} ${by}) rotate(${-angle})`}>
				<path d={`M-34,${-r - 6} Q-34,${-r - 46} 0,${-r - 46} Q34,${-r - 46} 34,${-r - 6}`} fill="none" stroke={INK} strokeWidth={22} />
				<path d={`M-34,${-r - 6} Q-34,${-r - 46} 0,${-r - 46} Q34,${-r - 46} 34,${-r - 6}`} fill="none" stroke="#8a929c" strokeWidth={10} />
				<rect x={-46} y={-r - 18} width={92} height={34} rx={8} fill="#2c3138" stroke={INK} strokeWidth={5} />
				<circle cx={0} cy={0} r={r} fill="#3b4149" stroke={INK} strokeWidth={W + 3} />
				<path d={`M${-r * 0.2},${r * 0.95} A${r},${r} 0 0 0 ${r * 0.95},${-r * 0.2} A${r * 0.92},${r * 0.92} 0 0 1 ${-r * 0.2},${r * 0.95} Z`} fill="#262a30" />
				<path d={lobePath(-r * 0.38, -r * 0.4, r * 0.3, 4, 5, 0.7)} fill="#6c7580" />
				<circle cx={-r * 0.48} cy={-r * 0.5} r={r * 0.1} fill="#fff" opacity={0.7} />
			</g>
			{inWin(hit, 0.45)
				? [0, 1].map((i) => {
						const q = clamp01((hit - i * 0.12) / 0.3);
						const rr = r * (1.15 + 0.35 * q);
						return q > 0 && q < 1 ? <path key={i} d={`M${bx - sx * rr * 0.2},${by - rr} A${rr},${rr} 0 0 ${sx < 0 ? 1 : 0} ${bx - sx * rr * 0.2},${by + rr}`} fill="none" stroke="#fff" strokeWidth={10 * (1 - q)} strokeLinecap="round" /> : null;
					})
				: null}
		</Fig>
	);
};

/**
 * Giant brass padlock (body centre at (x, y), ~300 × 520 at s 1) with an optional chain run across a wall through its shackle.
 * snap = age (s) since the shackle clicks shut: < −0.3 hidden, −0.3..0 pops in open, 0..0.1 snaps shut + flash; default closed.
 * chain = 0..1 how far the chain has run out to both sides (chainW = half-length, local units). hit = age since something
 * clanged off it → wobble + shine + an impact star on hitSide (default right, where the ball comes from).
 */
export const GiantPadlock: React.FC<{x: number; y: number; s?: number; t?: number; snap?: number; chain?: number; chainW?: number; hit?: number; hitSide?: 'left' | 'right'}> = ({x, y, s = 1, t = 0, snap = 9, chain = 0, chainW = 560, hit, hitSide = 'right'}) => {
	if (snap < -0.3) return null;
	const appear = popK(snap, -0.3, 0.26);
	const shut = easeInOut(clamp01(snap / 0.09));
	const shAng = lerp(-34, 0, shut);
	const shLift = lerp(70, 0, shut);
	const rot = wobble(hit, 26, 5) * 9 + (snap >= 0 && snap < 0.4 ? wobble(snap, 40, 10) * 4 : 0);
	const cw = chainW * clamp01(chain);
	const cy = -232;
	const glint = ((t * 0.6) % 1.6) - 0.3;
	const links = Math.floor(cw / 40);
	return (
		<Fig x={x} y={y} s={s} vb={[-chainW - 60, -420, 2 * chainW + 120, 620]}>
			{/* chain across */}
			{links > 0
				? [-1, 1].map((side) =>
						Array.from({length: links}, (_, i) => {
							const lx = side * (60 + i * 40);
							return i % 2 ? (
								<rect key={`${side}${i}`} x={lx - 26} y={cy - 7} width={52} height={14} rx={7} fill="#8a929c" stroke={INK} strokeWidth={4} />
							) : (
								<ellipse key={`${side}${i}`} cx={lx} cy={cy} rx={28} ry={16} fill="none" stroke={INK} strokeWidth={14} />
							);
						}),
					)
				: null}
			{links > 0 ? [-1, 1].map((side) => Array.from({length: links}, (_, i) => (i % 2 ? null : <ellipse key={`h${side}${i}`} cx={side * (60 + i * 40)} cy={cy} rx={28} ry={16} fill="none" stroke="#b9c0c8" strokeWidth={6} />))) : null}
			<g transform={`translate(0 ${(1 - appear) * -40}) scale(${appear}) rotate(${rot} 0 ${cy})`}>
				{/* shackle */}
				<g transform={`translate(0 ${-shLift}) rotate(${shAng} -96 -100)`}>
					<path d="M-96,-90 L-96,-250 Q-96,-350 0,-350 Q96,-350 96,-250 L96,-90" fill="none" stroke={INK} strokeWidth={62} />
					<path d="M-96,-90 L-96,-250 Q-96,-350 0,-350 Q96,-350 96,-250 L96,-90" fill="none" stroke="#b9c0c8" strokeWidth={46} />
					<path d="M-104,-120 L-104,-250 Q-104,-338 -10,-342" fill="none" stroke="#eef2f6" strokeWidth={10} strokeLinecap="round" />
				</g>
				{/* body */}
				<rect x={-160} y={-120} width={320} height={260} rx={40} fill="#E8B03A" stroke={INK} strokeWidth={W + 2} />
				<rect x={-160} y={70} width={320} height={70} rx={30} fill="#B9831F" opacity={0.7} />
				<rect x={-140} y={-104} width={60} height={210} rx={24} fill="#F7D57A" opacity={0.7} />
				{glint > 0 && glint < 1 ? <path d={`M${-160 + glint * 320},-120 L${-110 + glint * 320},-120 L${-170 + glint * 320},140 L${-220 + glint * 320},140 Z`} fill="#fff" opacity={0.35} /> : null}
				{[[-120, -84], [120, -84], [-120, 104], [120, 104]].map(([rx, ry]) => <circle key={`${rx}${ry}`} cx={rx} cy={ry} r={11} fill="#B9831F" stroke={INK} strokeWidth={4} />)}
				<circle cx={0} cy={0} r={34} fill={INK} />
				<path d="M-16,10 L16,10 L24,78 L-24,78 Z" fill={INK} />
				{inWin(snap, 0.22) ? <path d={starPath(96, -110, 70 * (1 - snap / 0.22) + 20, 18, 6)} fill="#fff" stroke={PAL.gold} strokeWidth={5} /> : null}
				{inWin(hit, 0.35) ? <path d="M-150,-110 L150,-110 L150,130 L-150,130 Z" fill="#fff" opacity={0.45 * (1 - hit / 0.35)} /> : null}
			</g>
			{inWin(hit, 0.25) ? <ImpactG x={hitSide === 'right' ? 168 : -168} y={-10} a={hit} r={120} /> : null}
		</Fig>
	);
};

// ===================================================================================================== GAVEL
const WOOD = {base: '#8a4f2a', light: '#b06a3a', dark: '#5e331b', band: '#d4a23c'};
/** the gavel itself in local units (SVG group): striking face centre at (0, 0) facing down (head axis vertical, 360 tall),
 *  handle to the right ending at the grip knob (≈ 650, −180) */
export const GavelArt: React.FC = () => (
	<g>
		<path d="M110,-208 L612,-200 Q650,-198 650,-180 Q650,-162 612,-160 L110,-152 Z" fill={WOOD.light} stroke={INK} strokeWidth={W + 1} strokeLinejoin="round" />
		<path d="M120,-172 L612,-170" stroke={WOOD.dark} strokeWidth={9} opacity={0.5} strokeLinecap="round" />
		<ellipse cx={648} cy={-180} rx={34} ry={46} fill={WOOD.base} stroke={INK} strokeWidth={W + 1} />
		<rect x={-140} y={-360} width={280} height={360} rx={34} fill={WOOD.base} stroke={INK} strokeWidth={W + 2} />
		<rect x={-140} y={-360} width={280} height={360} rx={34} fill="none" />
		<rect x={40} y={-344} width={84} height={328} rx={24} fill={WOOD.dark} opacity={0.45} />
		<rect x={-112} y={-336} width={46} height={312} rx={20} fill={WOOD.light} opacity={0.8} />
		{[-326, -66].map((by) => (
			<g key={by}>
				<rect x={-148} y={by} width={296} height={38} rx={10} fill={WOOD.band} stroke={INK} strokeWidth={W} />
				<rect x={-134} y={by + 6} width={90} height={9} rx={4} fill="#fff" opacity={0.45} />
			</g>
		))}
	</g>
);
/** a giant gavel; (x, y) = striking face centre (rot 0 = face down, handle right). rot (deg) pivots it around the grip knob. */
export const Gavel: React.FC<{x: number; y: number; s?: number; rot?: number; flip?: boolean}> = ({x, y, s = 1, rot = 0, flip}) => (
	<Fig x={x} y={y} s={s} vb={[-200, -420, 900, 480]} flip={flip}>
		<g transform={`rotate(${rot} 648 -180)`}>
			<GavelArt />
		</g>
	</Fig>
);
/**
 * the growing shadow of something descending: a soft dark ellipse on the ground at (x, y); k 0..1 (size + darkness).
 * h > 0 also darkens a column of that height above the ground (multiply) — the shadow «swallows» whoever stands there.
 */
export const GavelShadow: React.FC<{x: number; y: number; k: number; w?: number; h?: number}> = ({x, y, k, w = 560, h = 0}) => {
	const rx = w * lerp(0.22, 1, clamp01(k));
	const ry = rx * 0.26;
	const d = lerp(0.2, 0.85, clamp01(k));
	return (
		<>
			{h > 0 ? <div style={{position: 'absolute', left: x - rx * 0.9, top: y - h, width: rx * 1.8, height: h + ry, borderRadius: '45% 45% 50% 50%', background: `radial-gradient(ellipse at 50% 70%, rgba(12,6,24,${0.7 * d}) 0%, rgba(12,6,24,${0.45 * d}) 55%, rgba(12,6,24,0) 100%)`, mixBlendMode: 'multiply'}} /> : null}
			<div style={{position: 'absolute', left: x - rx, top: y - ry, width: rx * 2, height: ry * 2, borderRadius: '50%', background: `radial-gradient(ellipse at 50% 50%, rgba(12,6,24,${d}) 0%, rgba(12,6,24,${d * 0.75}) 55%, rgba(12,6,24,0) 100%)`, mixBlendMode: 'multiply'}} />
		</>
	);
};

// ===================================================================================================== STAMPS
/**
 * Giant rubber stamp (red knob, wooden block, rubber pad). (x, y) = where the face lands; lift = height above it (local units);
 * wobble 0..1 = hovering sway; text: if set, a small red label on the block (e.g. 'REJECTED'), else blank. Draws its own
 * ground shadow (shrinks + fades with lift). inked = red ink on the pad.
 */
export const GiantStamp: React.FC<{x: number; y: number; s?: number; t?: number; lift?: number; wobble?: number; text?: string; inked?: boolean; shadow?: boolean}> = ({x, y, s = 1, t = 0, lift = 0, wobble: wb = 0, text, inked, shadow = true}) => {
	const sway = wb * (Math.sin(t * 6.5) * 5 + Math.sin(t * 2.3) * 2);
	const bob = wb * Math.sin(t * 4.1) * 14;
	const sk = clamp01(lift / 700);
	return (
		<Fig x={x} y={y} s={s} vb={[-300, -480, 600, 520]}>
			{shadow ? <ellipse cx={0} cy={4} rx={lerp(250, 150, sk)} ry={lerp(30, 18, sk)} fill="#000" opacity={lerp(0.4, 0.14, sk)} /> : null}
			<g transform={`translate(0 ${-lift + bob}) rotate(${sway} 0 -200)`}>
				<ellipse cx={0} cy={-400} rx={130} ry={82} fill={PAL.stamp} stroke={INK} strokeWidth={W + 1} />
				<ellipse cx={-40} cy={-428} rx={44} ry={22} fill="#fff" opacity={0.35} />
				<path d="M-50,-334 L-42,-150 L42,-150 L50,-334 Z" fill={WOOD.dark} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<rect x={-34} y={-326} width={18} height={168} rx={8} fill={WOOD.light} opacity={0.6} />
				<rect x={-250} y={-158} width={500} height={118} rx={18} fill={WOOD.light} stroke={INK} strokeWidth={W + 1} />
				<rect x={-250} y={-82} width={500} height={42} rx={14} fill={WOOD.base} opacity={0.7} />
				<rect x={-130} y={-140} width={260} height={54} rx={8} fill={PAL.parchment} stroke={INK} strokeWidth={4} />
				{text ? (
					<text x={0} y={-101} textAnchor="middle" fontFamily={HEAD} fontSize={36} fill={PAL.stamp} letterSpacing={2}>
						{text}
					</text>
				) : null}
				<rect x={-232} y={-42} width={464} height={42} rx={8} fill={inked ? '#a30e22' : '#2a1418'} stroke={INK} strokeWidth={W} />
				<rect x={-220} y={-36} width={200} height={10} rx={5} fill="#fff" opacity={inked ? 0.35 : 0.15} />
			</g>
		</Fig>
	);
};
/**
 * The red imprint of a rubber stamp, always straight: text inside a double red border with worn ink. (x, y) = centre,
 * k 0..1 = appear (slams from 1.25× to 1×), backing = translucent dark plate so it also reads on dark grounds.
 */
export const StampPrint: React.FC<{x: number; y: number; s?: number; text?: string; k?: number; color?: string; seed?: number; backing?: boolean}> = ({x, y, s = 1, text = 'REJECTED', k = 1, color = PAL.stamp, seed = 3, backing}) => {
	const id = useSid();
	if (k <= 0) return null;
	const w = 120 + text.length * 70;
	const h = 170;
	const sc = lerp(1.25, 1, easeOut(k));
	return (
		<Fig x={x} y={y} s={s * sc} vb={[-w / 2 - 20, -h / 2 - 20, w + 40, h + 40]} opacity={clamp01(k * 3)}>
			<defs>
				<mask id={id}>
					<rect x={-w / 2 - 20} y={-h / 2 - 20} width={w + 40} height={h + 40} fill="#fff" />
					{Array.from({length: 46}, (_, i) => (
						<path key={i} d={lobePath((h1(seed + i * 3.1) - 0.5) * w, (h1(seed * 2 + i * 7.3) - 0.5) * h, 2 + 7 * h1(seed + i), seed + i, 5)} fill="#000" opacity={0.5 + 0.5 * h1(i * 1.3)} />
					))}
				</mask>
			</defs>
			{backing ? <rect x={-w / 2 - 8} y={-h / 2 - 8} width={w + 16} height={h + 16} rx={22} fill="rgba(239,227,200,0.92)" stroke={INK} strokeWidth={4} /> : null}
			<g mask={`url(#${id})`}>
				<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill="none" stroke={color} strokeWidth={14} />
				<rect x={-w / 2 + 18} y={-h / 2 + 18} width={w - 36} height={h - 36} rx={10} fill="none" stroke={color} strokeWidth={6} />
				<text x={0} y={38} textAnchor="middle" fontFamily={HEAD} fontSize={108} fill={color} letterSpacing={4}>
					{text}
				</text>
			</g>
		</Fig>
	);
};

// ===================================================================================================== PAPERS
/** one line of illegible handwriting (page units): gentle irregular waves in «words» split by small gaps — no letters, no loops */
const scribblePath = (x0: number, y: number, len: number, seed: number) => {
	let d = '';
	let x = x0;
	for (let i = 0; x < x0 + len - 40; i++) {
		const wl = Math.min(x0 + len - x, 90 + 130 * h1(seed * 3.1 + i * 1.7));
		const n = Math.max(2, Math.round(wl / 46));
		d += `M${x.toFixed(1)},${y.toFixed(1)} `;
		for (let j = 1; j <= n; j++) {
			const xa = x + (wl * (j - 0.5)) / n;
			const xb = x + (wl * j) / n;
			const a = (j % 2 ? -1 : 1) * (3 + 3 * h1(seed * 5.3 + i * 4.1 + j * 2.9));
			d += `Q${xa.toFixed(1)},${(y + a).toFixed(1)} ${xb.toFixed(1)},${y.toFixed(1)} `;
		}
		x += wl + 20 + 14 * h1(seed * 7.7 + i * 9.1);
	}
	return d;
};
/** the court's seal (page units, centre 0,0, r ≈ 80): scalloped gold rosette on two orange ribbon tails, a navy disc with the
 *  scales of justice, a gavel crossed behind it */
const CourtSeal: React.FC = () => {
	const N = 18;
	let ros = '';
	for (let i = 0; i < N; i++) {
		const a0 = (i / N) * Math.PI * 2, a1 = ((i + 0.5) / N) * Math.PI * 2, a2 = ((i + 1) / N) * Math.PI * 2;
		const p = (a: number, r: number) => `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
		ros += (i ? ' ' : 'M' + p(a0, 66) + ' ') + `Q${p(a1, 84)} ${p(a2, 66)}`;
	}
	return (
		<g>
			{/* gavel behind the seal: handle bottom-right, head top-left */}
			<g transform="rotate(-38)">
				<rect x={-8} y={-10} width={128} height={20} rx={10} fill="#8B5A2B" stroke={INK} strokeWidth={5} />
				<rect x={-126} y={-30} width={70} height={60} rx={12} fill="#6B4423" stroke={INK} strokeWidth={5} />
				<rect x={-112} y={-30} width={10} height={60} fill={PAL.gold} stroke={INK} strokeWidth={3} />
				<rect x={-80} y={-30} width={10} height={60} fill={PAL.gold} stroke={INK} strokeWidth={3} />
			</g>
			<path d="M-30,44 L-56,124 L-38,112 L-24,132 L-2,56 Z" fill={PAL.orange} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			<path d="M30,44 L56,124 L38,112 L24,132 L2,56 Z" fill={PAL.orange} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			<path d={ros + ' Z'} fill={PAL.gold} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			<circle r={54} fill={PAL.navy2} stroke={INK} strokeWidth={5} />
			<circle r={46} fill="none" stroke={PAL.gold} strokeWidth={3} opacity={0.7} />
			{/* scales of justice */}
			<g stroke={PAL.gold} strokeLinecap="round" strokeLinejoin="round" fill="none">
				<path d="M0,-30 L0,26 M-15,28 L15,28" strokeWidth={6} />
				<path d="M-28,-20 L28,-20" strokeWidth={5} />
				<path d="M-28,-20 L-38,4 M-28,-20 L-18,4 M28,-20 L18,4 M28,-20 L38,4" strokeWidth={2.5} />
			</g>
			<circle cx={0} cy={-32} r={5} fill={PAL.gold} />
			<path d="M-42,4 L-14,4 Q-28,20 -42,4 Z" fill={PAL.gold} />
			<path d="M14,4 L42,4 Q28,20 14,4 Z" fill={PAL.gold} />
		</g>
	);
};
/**
 * A drawn court document page — text-free: parchment, the court's seal (gavel + scales) on top, a rule, lines of illegible
 * scribble and ONE darker key line that an orange highlighter swipes (hl 0..1, the marker pen rides the swipe), a signature
 * squiggle. (x, y) = page centre, w = page width (h = 1.32 w). No words, case number, year or names (owner: one text layer at a
 * time — the subtitle carries the words).
 */
export const CourtPage: React.FC<{x: number; y: number; w?: number; s?: number; hl?: number; rot?: number}> = ({x, y, w = 600, s = 1, hl = 0, rot = 0}) => {
	const h = w * 1.32;
	const u = w / 600;
	const k = clamp01(hl);
	const line = (top: number, len: number, seed: number) => <path key={seed} d={scribblePath(54, top, len, seed)} fill="none" stroke="rgba(40,30,20,0.42)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />;
	// the key line: darker, thicker; the band sweeps from its left end (x 40) to past its right end
	const KY = 438, KX = 46, KL = 470;
	const bandW = k * (KL + 28);
	const penX = KX - 12 + bandW;
	return (
		<div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg) scale(${s})`, background: PAL.parchment, borderRadius: 8 * u, boxShadow: `0 0 0 ${6 * u}px ${INK}, 0 ${30 * u}px ${60 * u}px rgba(0,0,0,0.45)`, overflow: 'hidden'}}>
			<div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.3), rgba(120,80,30,0.16))'}} />
			<svg width={w} height={h} viewBox={`0 0 600 ${(h / u).toFixed(1)}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<g transform="translate(300 102)">
					<CourtSeal />
				</g>
				<rect x={54} y={232} width={492} height={5} fill={INK} opacity={0.7} />
				{line(274, 470, 1)}
				{line(312, 492, 2)}
				{line(350, 430, 3)}
				{line(388, 300, 4)}
				{k > 0 ? <rect x={KX - 12} y={KY - 26} width={bandW} height={50} rx={10} fill="rgba(255,122,31,0.62)" style={{mixBlendMode: 'multiply'}} /> : null}
				<path d={scribblePath(KX + 8, KY, KL, 7)} fill="none" stroke={INK} strokeOpacity={0.85} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
				{line(490, 480, 5)}
				{line(528, 455, 6)}
				{line(566, 380, 8)}
				{line(604, 240, 9)}
				<g transform={`translate(330 ${(h / u - 110).toFixed(1)})`}>
					<path d="M6,48 Q30,8 46,40 Q58,64 74,30 Q86,6 100,40 Q110,58 130,34 Q150,16 166,44 L210,36" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
					<line x1={0} y1={62} x2={220} y2={62} stroke={INK} strokeWidth={3} opacity={0.5} />
				</g>
				{k > 0 && k < 1 ? (
					<g transform={`translate(${penX.toFixed(1)} ${KY + 18}) scale(0.78) rotate(28)`}>
						<rect x={-22} y={-150} width={44} height={120} rx={10} fill={PAL.orange} stroke={INK} strokeWidth={5} />
						<rect x={-22} y={-104} width={44} height={22} fill="#fff" opacity={0.5} />
						<path d="M-16,-30 L16,-30 L10,10 L-10,10 Z" fill="#d95e10" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
					</g>
				) : null}
			</svg>
		</div>
	);
};

/**
 * Progress bar labelled «COMPLETED» — never any digits. (x, y) ≈ centre of the panel, w = width. value 0..1;
 * strain 0..1 = the fill jitters at its edge (stalled just short of full); done 0..1 = orange glow + shine sweep on completion.
 */
export const ProgressBar: React.FC<{x: number; y: number; w?: number; s?: number; t: number; value: number; label?: string; strain?: number; done?: number}> = ({x, y, w = 760, s = 1, t, value, label = 'COMPLETED', strain = 0, done = 0}) => {
	const jit = strain * (Math.sin(t * 47) * 0.007 + Math.sin(t * 23) * 0.005);
	const v = clamp01(value + jit);
	const H = 84;
	const sweep = done > 0 ? ((t * 1.4) % 1) : -1;
	return (
		<div style={{position: 'absolute', left: x - w / 2, top: y - 106, width: w, transform: `scale(${s})`, transformOrigin: '50% 106px'}}>
			<div style={{background: 'rgba(15,34,56,0.9)', borderRadius: 28, boxShadow: `0 0 0 6px ${done > 0 ? PAL.orange : INK}, 0 0 ${50 * done}px ${PAL.orange}, 0 24px 50px rgba(0,0,0,0.45)`, padding: '16px 26px 26px'}}>
				<div style={{fontFamily: HEAD, fontSize: 62, color: '#fff', letterSpacing: 5, textAlign: 'center', WebkitTextStroke: `9px ${INK}`, paintOrder: 'stroke fill', lineHeight: 1.15}}>{label}</div>
				<div style={{position: 'relative', marginTop: 12, height: H, borderRadius: H / 2, background: '#091523', boxShadow: `inset 0 0 0 6px ${INK}`, overflow: 'hidden'}}>
					<div
						style={{
							position: 'absolute',
							left: 7,
							top: 7,
							bottom: 7,
							width: `calc(${v * 100}% - ${14 * v}px)`,
							borderRadius: H / 2,
							background: `repeating-linear-gradient(135deg, ${PAL.orange} 0 24px, #ffa257 24px 48px)`,
							backgroundPosition: `${t * 140}px 0`,
							boxShadow: `inset 0 -12px 0 rgba(0,0,0,0.18), 0 0 0 4px ${INK}`,
						}}
					/>
					<div style={{position: 'absolute', left: 20, right: 20, top: 14, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.22)'}} />
					{strain > 0 && v < 0.999 ? <div style={{position: 'absolute', left: `calc(${v * 100}% - 18px)`, top: 4, bottom: 4, width: 22, borderRadius: 11, background: 'radial-gradient(ellipse at 50% 50%, #fffbe0 0%, rgba(255,200,120,0.6) 50%, rgba(255,160,60,0) 100%)', opacity: 0.5 + 0.5 * Math.abs(Math.sin(t * 31))}} /> : null}
					{sweep >= 0 ? <div style={{position: 'absolute', top: 0, bottom: 0, left: `${sweep * 140 - 30}%`, width: '22%', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.7), rgba(255,255,255,0))', transform: 'skewX(-20deg)'}} /> : null}
				</div>
			</div>
		</div>
	);
};

/** a coir doormat with a woven «home» pictogram — a house with a heart in it, no letters (lying on the ground, seen in
 *  perspective). (x, y) = mat centre; slide 0..1 = slides in from the left */
export const DoormatHome: React.FC<{x: number; y: number; s?: number; slide?: number; from?: number}> = ({x, y, s = 1, slide = 1, from = -900}) => {
	const e = easeOut(slide);
	const dx = (1 - e) * from;
	const squash = 1 + 0.08 * Math.sin(Math.PI * clamp01((slide - 0.75) / 0.25));
	const heart = 'M0,14 C-6,8 -24,-2 -24,-14 C-24,-24 -16,-30 -8,-30 C-3,-30 0,-26 0,-22 C0,-26 3,-30 8,-30 C16,-30 24,-24 24,-14 C24,-2 6,8 0,14 Z';
	return (
		<Fig x={x + dx * s} y={y} s={s} vb={[-260, -110, 520, 210]}>
			<ellipse cx={0} cy={70} rx={250} ry={22} fill="#000" opacity={0.28} />
			<g transform={`scale(${squash} ${2 - squash})`}>
				<path d="M-200,-66 L200,-66 L238,66 L-238,66 Z" fill="#8A5A2B" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d="M-176,-48 L176,-48 L204,48 L-204,48 Z" fill="#C8914E" />
				{Array.from({length: 90}, (_, i) => {
					const u = h1(i * 2.7), v = h1(i * 5.9);
					const yy = -46 + v * 92;
					const half = lerp(176, 204, (yy + 48) / 96);
					const xx = (u - 0.5) * 2 * (half - 6);
					return <line key={i} x1={xx} y1={yy} x2={xx + 2} y2={yy + 8} stroke={i % 3 ? '#a8763d' : '#e2b375'} strokeWidth={3} strokeLinecap="round" />;
				})}
				{/* the pictogram, flattened by the mat's perspective: a dark woven house (roof, chimney, body) with a red heart in it */}
				<g transform="translate(0 2) scale(1 0.82)">
					<path d="M-96,-6 L0,-56 L96,-6 L74,-6 L74,50 L-74,50 L-74,-6 Z M42,-32 L42,-52 L60,-52 L60,-23 Z" fill="#3a2414" stroke="#3a2414" strokeWidth={8} strokeLinejoin="round" />
					<g transform="translate(0 22) scale(1.3)">
						<path d={heart} fill="#D9443A" stroke="#2a180c" strokeWidth={4} strokeLinejoin="round" />
					</g>
				</g>
			</g>
		</Fig>
	);
};

// ===================================================================================================== PARTY + LUGGAGE
const CONF = [PAL.orange, PAL.gold, PAL.teal, '#ffffff', '#E85D75', '#7FB8E6'];
/**
 * Party popper. (x, y) = the held bottom tip; rot (deg) tilts the mouth (0 = straight up). pop = age (s) since it popped:
 * burst star, recoil and curly streamers. Pair it with PopConfetti from the mouth (popperMouth gives the point).
 */
export const PartyPopper: React.FC<{x: number; y: number; s?: number; rot?: number; pop?: number; t?: number}> = ({x, y, s = 1, rot = 20, pop, t = 0}) => {
	const id = useSid();
	const popped = pop !== undefined && pop >= 0;
	const recoil = popped ? 26 * Math.exp(-pop * 9) : 0;
	const r = rot + (popped ? wobble(pop, 24, 5) * 9 : Math.sin(t * 3) * 2);
	const cone = 'M0,0 L-82,-232 Q0,-256 82,-232 Z';
	return (
		<Fig x={x} y={y} s={s} vb={[-320, -560, 640, 700]}>
			<g transform={`rotate(${r}) translate(0 ${recoil})`}>
				<path d={popped ? 'M0,0 L8,120' : 'M0,0 Q22,30 4,54 Q-16,78 8,100'} stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
				<path d={popped ? 'M0,0 L8,120' : 'M0,0 Q22,30 4,54 Q-16,78 8,100'} stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" />
				<defs>
					<clipPath id={id}>
						<path d={cone} />
					</clipPath>
				</defs>
				<path d={cone} fill={PAL.gold} />
				<g clipPath={`url(#${id})`}>
					{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M-140,${-10 - i * 54} L140,${-62 - i * 54}`} stroke={PAL.orange} strokeWidth={22} />)}
					<path d="M-90,-250 L-30,-250 L-6,0 L-20,0 Z" fill="#fff" opacity={0.3} />
				</g>
				<path d={cone} fill="none" stroke={INK} strokeWidth={W + 1} strokeLinejoin="round" />
				<ellipse cx={0} cy={-240} rx={82} ry={18} fill="#2a1e2e" stroke={INK} strokeWidth={W} />
				{popped
					? [-34, -14, 6, 24, 40].map((ang, i) => {
							const L = 300 * easeOut(pop / 0.3);
							const droop = 120 * clamp01((pop - 0.2) / 1.2);
							const a = rad(ang - 90);
							const ex = Math.cos(a) * L, ey = -240 + Math.sin(a) * L + droop;
							const mx = Math.cos(a) * L * 0.5 + Math.sin(i * 2 + pop * 8) * 30, my = -240 + Math.sin(a) * L * 0.5 + droop * 0.4;
							return (
								<g key={i}>
									<path d={`M0,-240 Q${mx + 40},${my} ${mx},${my} T${ex},${ey}`} fill="none" stroke={INK} strokeWidth={15} strokeLinecap="round" />
									<path d={`M0,-240 Q${mx + 40},${my} ${mx},${my} T${ex},${ey}`} fill="none" stroke={CONF[i % CONF.length]} strokeWidth={8} strokeLinecap="round" />
								</g>
							);
						})
					: null}
				{popped && pop < 0.2 ? <path d={starPath(0, -270, 120 * (1 - pop / 0.2 * 0.5), 40, 8)} fill="#fff6c8" stroke={PAL.gold} strokeWidth={6} /> : null}
			</g>
		</Fig>
	);
};
/** world point of the popper's mouth for PopConfetti (same x, y, s, rot as the PartyPopper) */
export const popperMouth = (x: number, y: number, s = 1, rot = 20) => ({x: x + Math.sin(rad(rot)) * 245 * s, y: y - Math.cos(rad(rot)) * 245 * s});

/**
 * Confetti burst in frame coordinates from (x, y) at time t0: pieces fly along dir (deg, 0 = up, + = clockwise) ± spread/2
 * with drag and gravity, tumbling. freeze = absolute time when every piece stops in mid-air (keeps a faint tremble).
 */
export const PopConfetti: React.FC<{x: number; y: number; t: number; t0: number; dir?: number; spread?: number; n?: number; power?: number; freeze?: number; s?: number; seed?: number}> = ({
	x, y, t, t0, dir = 15, spread = 70, n = 70, power = 1700, freeze, s = 1, seed = 1,
}) => {
	if (t < t0) return null;
	const frozen = freeze !== undefined && t > freeze;
	const a = frozen ? Math.max(0, (freeze as number) - t0) : t - t0;
	const c = 2.6, g = 1000;
	const ec = 1 - Math.exp(-c * a);
	return (
		<Layer>
			{Array.from({length: n}, (_, i) => {
				const ang = rad(dir + (h1(seed + i * 2.3) - 0.5) * spread);
				const v = power * s * (0.45 + 0.8 * h1(seed * 3 + i * 3.7));
				const vx = Math.sin(ang) * v, vy = -Math.cos(ang) * v;
				const tr = frozen ? Math.sin(t * 40 + i) * 1.2 : 0;
				const px = x + (vx * ec) / c + Math.sin(a * 6 + i) * 22 * clamp01(a * 2) + tr;
				const py = y + (vy * ec) / c + (g / c) * a - (g / (c * c)) * ec + tr;
				const rot = i * 37 + a * (220 + 300 * h1(i * 1.9)) * (i % 2 ? 1 : -1);
				const flipY = Math.cos(a * 9 + i);
				const col = CONF[i % CONF.length];
				const kind = i % 5;
				return (
					<g key={i} transform={`translate(${px} ${py}) rotate(${rot}) scale(${s})`}>
						{kind === 0 ? (
							<path d="M0,-22 Q12,-11 0,0 Q-12,11 0,22" fill="none" stroke={col} strokeWidth={7} strokeLinecap="round" />
						) : kind === 1 ? (
							<circle r={8} fill={col} stroke={INK} strokeWidth={2.5} />
						) : (
							<rect x={-8} y={-14 * Math.abs(flipY) - 1} width={16} height={28 * Math.abs(flipY) + 2} fill={col} stroke={INK} strokeWidth={2.5} />
						)}
					</g>
				);
			})}
		</Layer>
	);
};

/** tiny suitcase (SVG group) in local units, (0, 0) = bottom centre, handle top at y ≈ −130 */
export const SuitcaseArt: React.FC = () => (
	<g>
		<path d="M-26,-100 L-26,-122 Q-26,-132 -14,-132 L14,-132 Q26,-132 26,-122 L26,-100" fill="none" stroke={INK} strokeWidth={14} />
		<path d="M-26,-100 L-26,-122 Q-26,-132 -14,-132 L14,-132 Q26,-132 26,-122 L26,-100" fill="none" stroke="#6e3a1c" strokeWidth={7} />
		<rect x={-72} y={-102} width={144} height={102} rx={16} fill="#B5642E" stroke={INK} strokeWidth={W} />
		<rect x={-72} y={-30} width={144} height={30} rx={12} fill="#8a4a20" opacity={0.6} />
		{[-40, 40].map((sx) => <rect key={sx} x={sx - 9} y={-102} width={18} height={102} fill="#E2B06A" stroke={INK} strokeWidth={4} />)}
		{[-40, 40].map((sx) => <rect key={`c${sx}`} x={sx - 13} y={-74} width={26} height={16} rx={4} fill={PAL.gold} stroke={INK} strokeWidth={3} />)}
		<circle cx={6} cy={-46} r={16} fill={PAL.teal} stroke={INK} strokeWidth={3} />
		<path d={starPath(6, -46, 9, 4, 5)} fill="#fff" />
	</g>
);
/** tiny suitcase, (x, y) = bottom centre (≈ 150 × 135 at s 1) */
export const Suitcase: React.FC<{x: number; y: number; s?: number; rot?: number}> = ({x, y, s = 1, rot = 0}) => (
	<Fig x={x} y={y} s={s} vb={[-90, -150, 180, 170]}>
		<ellipse cx={0} cy={2} rx={80} ry={10} fill="#000" opacity={0.25} />
		<g transform={`rotate(${rot} 0 0)`}>
			<SuitcaseArt />
		</g>
	</Fig>
);
/** tiny framed picture hanging from a nail at (x, y): gold frame, a moonlit-hills miniature. swing = age (s) since it was hung */
export const PictureFrame: React.FC<{x: number; y: number; s?: number; rot?: number; swing?: number}> = ({x, y, s = 1, rot = 0, swing}) => {
	const r = rot + wobble(swing, 7, 2.2) * 12;
	return (
		<Fig x={x} y={y} s={s} vb={[-110, -20, 220, 270]}>
			<g transform={`rotate(${r})`}>
				<path d="M0,0 L-52,58 M0,0 L52,58" stroke={INK} strokeWidth={4} />
				<rect x={-72} y={52} width={144} height={172} rx={8} fill="#D9A22E" stroke={INK} strokeWidth={W} />
				<rect x={-54} y={70} width={108} height={136} fill={PAL.navy2} stroke={INK} strokeWidth={4} />
				<circle cx={18} cy={108} r={20} fill={PAL.gold} />
				<path d="M-54,180 Q-20,150 10,172 Q34,156 54,168 L54,206 L-54,206 Z" fill="#2f6b4a" />
				<path d="M-22,120 Q-16,112 -10,120 Q-4,112 2,120" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
				<rect x={-66} y={58} width={132} height={8} rx={4} fill="#fff" opacity={0.35} />
			</g>
			<circle cx={0} cy={0} r={7} fill="#9aa3ad" stroke={INK} strokeWidth={3} />
		</Fig>
	);
};

// ===================================================================================================== BAT LAWYER
/** the bat wig's cap (upside down on the crown): a curly scalloped edge around the bottom of the head */
const WIG_CAP = (() => {
	const n = 9;
	const pt = (i: number, r: number) => {
		const a = Math.PI - (i / n) * Math.PI;
		return [Math.cos(a) * 80 * r, 276 + Math.sin(a) * 78 * r];
	};
	let d = `M-80,276 `;
	for (let i = 0; i < n; i++) {
		const [cx, cy] = pt(i + 0.5, 1.2);
		const [qx, qy] = pt(i + 1, 1);
		d += `Q${cx.toFixed(1)},${cy.toFixed(1)} ${qx.toFixed(1)},${qy.toFixed(1)} `;
	}
	return d + 'Q56,296 0,296 Q-56,296 -80,276 Z';
})();
const BAT = {fur: '#5d4b78', belly: '#8a76a6', wing: '#2c2340', ear: '#e9a3b6', wig: '#F2EEE6', wigD: '#cfc6b6'};
/**
 * A cute bat hanging upside down from an eave, wearing a tiny barrister wig and white bands; its folded wings read as a gown.
 * (x, y) = where its feet grip (≈ 220 × 420 at s 1 hanging downward; with the sign ≈ 360 × 620; the sign's centre is at
 * local (0, 525), its left edge at x − 180·s). Blinks on its own (~1 s) and the wig wobbles.
 * drop = age (s) since it dropped from the eave (spring + pendulum sway; < 0 hidden); sign = age since it flipped up the
 * «WILDLIFE / LAW» sign held below its ears; rejected = age since a red REJECTED print hit that sign; fly 0..1 = it flaps off
 * (turns upright, wings spread, the sign falls straight down); flyDir = 1 flies off up-right, −1 up-left; wobble = wig wobble amount.
 * signMax = the farthest the dropped sign falls (local units), e.g. down to the doormat line, so it lands instead of sinking.
 */
export const BatLawyer: React.FC<{x: number; y: number; s?: number; t: number; drop?: number; sign?: number; signText?: [string, string]; rejected?: number; fly?: number; flyDir?: number; wobble?: number; seed?: number; perch?: boolean; signMax?: number}> = ({
	x, y, s = 1, t, drop, sign, signText = ['WILDLIFE', 'LAW'], rejected, fly = 0, flyDir = 1, wobble: wwig = 1, seed = 0, perch, signMax = Infinity,
}) => {
	if (drop !== undefined && drop < 0) return null;
	const da = drop ?? 9;
	const dropY = (1 - popK(da, 0, 0.32)) * -300;
	const sway = wobble(da, 7.5, 2.2) * 16 + Math.sin(t * 2.1 + seed) * 2.5;
	const blink = ((t * 0.92 + seed * 0.37) % 1) < 0.09 || (da > 0.32 && da < 0.42);
	const wigRot = wwig * (Math.sin(t * 9 + seed) * 5 + wobble(da - 0.3, 20, 4) * 14);
	const breathe = 1 + Math.sin(t * 3.4 + seed) * 0.025;
	const holding = sign !== undefined && sign >= 0 && fly <= 0;
	const fk = clamp01(fly);
	const turn = 180 * easeInOut(clamp01(fk * 2.2));
	const flap = Math.sin(t * 28) * 46;
	const sa = sign ?? -1;
	const flipT = clamp01(sa / 0.32);
	const theta = Math.PI * (1 - easeOut(flipT));
	const sy = Math.cos(theta) * (1 + 0.08 * wobble(sa - 0.32, 22, 6));
	const signFall = fk > 0 ? Math.min(signMax, fk * fk * 1400) : 0;
	const board = (
		<g transform={`translate(0 ${430 + signFall}) scale(1 ${Math.abs(sy) < 0.02 ? 0.02 : Math.abs(sy)}) translate(0 -430)`} opacity={1 - clamp01((fk - 0.6) / 0.4)}>
			{sy >= 0 ? (
				<g>
					<rect x={-180} y={430} width={360} height={190} rx={14} fill={PAL.parchment} stroke={INK} strokeWidth={W + 1} />
					<rect x={-168} y={442} width={336} height={166} rx={8} fill="none" stroke={PAL.orange} strokeWidth={6} />
					<g opacity={rejected !== undefined && rejected >= 0 ? lerp(1, 0.22, clamp01(rejected / 0.1)) : 1}>
						<text x={0} y={510} textAnchor="middle" fontFamily={HEAD} fontSize={62} fill={INK} letterSpacing={2}>{signText[0]}</text>
						<text x={0} y={586} textAnchor="middle" fontFamily={HEAD} fontSize={70} fill={INK} letterSpacing={8}>{signText[1]}</text>
					</g>
					{rejected !== undefined && rejected >= 0 ? (
						<g transform={`translate(0 526) scale(${0.58 * lerp(1.3, 1, easeOut(rejected / 0.12))})`} opacity={clamp01(rejected / 0.05)}>
							<rect x={-300} y={-84} width={600} height={168} rx={18} fill="none" stroke={PAL.stamp} strokeWidth={16} />
							<rect x={-280} y={-64} width={560} height={128} rx={10} fill="none" stroke={PAL.stamp} strokeWidth={6} />
							<text x={0} y={38} textAnchor="middle" fontFamily={HEAD} fontSize={108} fill={PAL.stamp} letterSpacing={4}>REJECTED</text>
						</g>
					) : null}
				</g>
			) : (
				<g>
					<rect x={-180} y={430} width={360} height={190} rx={14} fill={WOOD.light} stroke={INK} strokeWidth={W + 1} />
					{[480, 530, 580].map((ly) => <line key={ly} x1={-170} y1={ly} x2={170} y2={ly} stroke={WOOD.dark} strokeWidth={5} opacity={0.6} />)}
				</g>
			)}
		</g>
	);
	return (
		<Fig x={x} y={y} s={s} vb={[-320, -60, 640, 760]}>
			{perch ? <rect x={-150} y={-22} width={300} height={26} rx={8} fill={WOOD.dark} stroke={INK} strokeWidth={W} /> : null}
			{sign !== undefined && sign >= 0 ? board : null}
			<g transform={`translate(${flyDir * fk * 520} ${dropY - fk * 640}) rotate(${sway} 0 0) rotate(${turn} 0 200)`}>
				{/* feet + legs */}
				<path d="M-14,4 Q-22,-14 -8,-14 L-4,6 M14,4 Q22,-14 8,-14 L4,6" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
				<path d="M-10,4 L-20,44 M10,4 L20,44" stroke={INK} strokeWidth={9} strokeLinecap="round" />
				{/* spread wings when flying */}
				{fk > 0
					? [-1, 1].map((k) => (
							<path
								key={k}
								d={`M${k * 50},110 L${k * 160},${120 - flap} L${k * 300},${170 - flap * 1.3} Q${k * 270},${110 - flap} ${k * 236},${86 - flap * 0.8} Q${k * 206},${50 - flap * 0.5} ${k * 166},${54 - flap * 0.4} Q${k * 140},${20} ${k * 100},${40} Q${k * 76},${30} ${k * 44},${66} Z`}
								fill={BAT.wing}
								stroke={INK}
								strokeWidth={W}
								strokeLinejoin="round"
							/>
						))
					: null}
				{/* wings opened to hold the sign */}
				{holding
					? [-1, 1].map((k) => (
							<g key={`h${k}`}>
								<path d={`M${k * 52},70 Q${k * 172},160 ${k * 168},438 L${k * 120},442 Q${k * 112},270 ${k * 56},176 Z`} fill={BAT.wing} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
								<path d={`M${k * 60},90 Q${k * 152},180 ${k * 150},430`} fill="none" stroke="#4a3d62" strokeWidth={6} />
							</g>
						))
					: null}
				{/* body */}
				<g transform={`translate(0 120) scale(${breathe} ${2 - breathe}) translate(0 -120)`}>
					<ellipse cx={0} cy={120} rx={64} ry={88} fill={BAT.fur} stroke={INK} strokeWidth={W} />
					<ellipse cx={0} cy={128} rx={38} ry={60} fill={BAT.belly} />
					{[0, 1, 2].map((i) => <path key={i} d={`M${-16 + i * 16},${86 + (i % 2) * 20} l6,10 l6,-10`} stroke="#6b5a86" strokeWidth={4} fill="none" />)}
				</g>
				{/* folded wings = the gown */}
				{!holding && fk <= 0
					? [-1, 1].map((k) => (
							<g key={`f${k}`}>
								<path d={`M${k * 46},34 Q${k * 104},96 ${k * 90},176 Q${k * 78},220 ${k * 32},206 Q${k * 60},140 ${k * 40},60 Z`} fill={BAT.wing} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
								<path d={`M${k * 56},70 Q${k * 82},120 ${k * 66},190`} fill="none" stroke="#4a3d62" strokeWidth={5} />
							</g>
						))
					: null}
				{/* head */}
				<circle cx={0} cy={252} r={72} fill={BAT.fur} stroke={INK} strokeWidth={W + 1} />
				{/* barrister wig, upside down: ribbed cap on the crown (bottom) + columns of rolled curls framing the face */}
				<g transform={`rotate(${wigRot} 0 252)`}>
					{[-1, 1].map((k) =>
						[0, 1, 2, 3].map((j) => (
							<g key={`${k}${j}`}>
								<rect x={k * 82 - 25} y={322 - j * 30} width={50} height={30} rx={15} fill={BAT.wig} stroke={INK} strokeWidth={4} />
								<path d={`M${k * 82 + k * 6},${337 - j * 30} m-6,0 a6,6 0 1 1 6,6`} fill="none" stroke={BAT.wigD} strokeWidth={4} />
							</g>
						)),
					)}
					<path d={WIG_CAP} fill={BAT.wig} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
					{[[-40, 312], [0, 318], [40, 312], [-22, 338], [22, 338]].map(([cx, cy]) => <path key={`${cx}${cy}`} d={`M${cx - 9},${cy} a9,9 0 1 1 9,9 a5,5 0 1 1 -5,-5`} fill="none" stroke={BAT.wigD} strokeWidth={4} strokeLinecap="round" />)}
				</g>
				{/* ears poke out through the wig cap, pointing down */}
				{[-1, 1].map((k) => (
					<g key={`e${k}`}>
						<path d={`M${k * 50},330 L${k * 66},420 Q${k * 32},396 ${k * 12},350 Z`} fill={BAT.fur} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<path d={`M${k * 44},344 L${k * 56},398 Q${k * 36},384 ${k * 22},356 Z`} fill={BAT.ear} />
					</g>
				))}
				{/* face (upside down: mouth above the eyes) */}
				{[-1, 1].map((k) =>
					blink ? (
						<path key={`y${k}`} d={`M${k * 28 - 15},258 Q${k * 28},250 ${k * 28 + 15},258`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
					) : (
						<g key={`y${k}`}>
							<ellipse cx={k * 28} cy={258} rx={19} ry={22} fill="#fff" stroke={INK} strokeWidth={4} />
							<circle cx={k * 28 + 2} cy={262} r={11} fill={INK} />
							<circle cx={k * 28 - 3} cy={255} r={4} fill="#fff" />
						</g>
					),
				)}
				{[-1, 1].map((k) => <ellipse key={`c${k}`} cx={k * 50} cy={226} rx={13} ry={8} fill="#f08aa6" opacity={0.6} />)}
				<path d="M-8,226 L8,226 L0,236 Z" fill="#2a2038" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
				<path d="M-18,206 Q-9,216 0,206 Q9,216 18,206" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
				<path d="M-11,207 L-7,196 L-4,208 M11,207 L7,196 L4,208" fill="#fff" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
				{/* thumbs gripping the sign */}
				{holding ? [-1, 1].map((k) => <path key={`th${k}`} d={`M${k * 160},426 q${k * 14},-6 ${k * 10},16`} stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" />) : null}
			</g>
		</Fig>
	);
};

// ===================================================================================================== NEWT + RAIN-BUTT
const NEWT = {back: '#4d4a2a', backD: '#34321c', belly: '#FF8A1F', spot: '#1d1a10', speck: '#ddd8c0'};
/**
 * a great-crested newt in local units (SVG group), side view facing right, (0, 0) = ground under its belly; ~420 long.
 * carry = holds a tiny suitcase by its handle (it stands on the ground in front); walk = leg cycle speed; slide = belly-slide
 * pose (legs tucked back, speed lines).
 */
export const NewtArt: React.FC<{t: number; blink?: boolean; carry?: boolean; walk?: number; slide?: boolean; seed?: number}> = ({t, blink, carry, walk = 0, slide, seed = 0}) => {
	const wag = Math.sin(t * 4.6 + seed) * 16;
	const ph = t * walk * 6;
	const leg = (bx: number, k: number) => {
		const sw = slide ? -26 : Math.sin(ph + k) * 14 * (walk ? 1 : 0);
		const fx = bx + sw + (slide ? -30 : 0);
		const fy = slide ? -8 : 0;
		return (
			<g key={`${bx}${k}`}>
				<path d={`M${bx - 10},-36 Q${bx + sw * 0.5 - 16},-14 ${fx},${fy} L${fx + 16},${fy} Q${bx + sw * 0.5 + 8},-18 ${bx + 14},-36 Z`} fill={NEWT.back} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<path d={`M${fx - 8},${fy} l-10,4 M${fx + 2},${fy + 2} l0,8 M${fx + 12},${fy} l10,4`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
			</g>
		);
	};
	const blinkNow = blink ?? ((t * 0.8 + seed * 0.41) % 1) < 0.08;
	return (
		<g>
			{slide ? [0, 1, 2].map((i) => <line key={i} x1={-330 - i * 30} y1={-30 - i * 22} x2={-250 - i * 30} y2={-30 - i * 22} stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={0.8} />) : null}
			{/* tail */}
			<path d={`M-70,-70 Q-170,${-78 + wag * 0.4} -300,${-50 + wag} Q-180,${-22 + wag * 0.4} -70,-24 Z`} fill={NEWT.back} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			<path d={`M-80,-28 Q-180,${-28 + wag * 0.4} -290,${-50 + wag}`} fill="none" stroke={NEWT.belly} strokeWidth={8} strokeLinecap="round" />
			{leg(-56, 0)}
			{leg(64, Math.PI)}
			{/* crest along the back */}
			<path d="M-96,-74 L-84,-98 L-70,-82 L-54,-106 L-38,-86 L-20,-110 L-2,-88 L16,-108 L32,-86 L48,-102 L62,-84 L70,-80 Z" fill={NEWT.backD} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
			{/* body */}
			<ellipse cx={0} cy={-52} rx={104} ry={38} fill={NEWT.back} />
			<path d="M-96,-36 Q0,-6 100,-38 Q96,-20 60,-16 Q0,-8 -60,-16 Q-92,-22 -96,-36 Z" fill={NEWT.belly} />
			{[[-50, -22], [-14, -16], [24, -18], [60, -24]].map(([sx, sy]) => <circle key={`${sx}`} cx={sx} cy={sy} r={5} fill={NEWT.spot} />)}
			{[[-60, -60], [-30, -70], [6, -58], [40, -68], [-80, -50], [70, -56]].map(([sx, sy]) => <circle key={`w${sx}`} cx={sx} cy={sy} r={3.5} fill={NEWT.speck} />)}
			<ellipse cx={0} cy={-52} rx={104} ry={38} fill="none" stroke={INK} strokeWidth={W} />
			{!slide ? leg(-36, 1.5) : null}
			{!slide && !carry ? leg(84, 4.5) : null}
			{/* head */}
			<ellipse cx={120} cy={-60} rx={56} ry={38} fill={NEWT.back} stroke={INK} strokeWidth={W} />
			<path d="M80,-34 Q120,-22 166,-46 Q150,-30 120,-26 Q96,-26 80,-34 Z" fill={NEWT.belly} />
			<path d="M108,-48 Q138,-36 168,-56" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
			<circle cx={166} cy={-70} r={3} fill={INK} />
			{[[106, -92, 16], [134, -94, 20]].map(([ex, ey, er], i) =>
				blinkNow ? (
					<g key={i}>
						<circle cx={ex} cy={ey} r={er} fill={NEWT.back} stroke={INK} strokeWidth={4} />
						<path d={`M${ex - er * 0.7},${ey} Q${ex},${ey + 6} ${ex + er * 0.7},${ey}`} stroke={INK} strokeWidth={4} fill="none" />
					</g>
				) : (
					<g key={i}>
						<circle cx={ex} cy={ey} r={er} fill="#fff" stroke={INK} strokeWidth={4} />
						<circle cx={ex + er * 0.25} cy={ey + 2} r={er * 0.55} fill="#e8b33a" />
						<circle cx={ex + er * 0.3} cy={ey + 2} r={er * 0.3} fill={INK} />
						<circle cx={ex - er * 0.15} cy={ey - er * 0.3} r={er * 0.18} fill="#fff" />
					</g>
				),
			)}
			{carry ? (
				<g>
					<g transform="translate(206 0) scale(0.62)">
						<SuitcaseArt />
					</g>
					<path d="M86,-40 Q150,-60 200,-76" stroke={INK} strokeWidth={22} fill="none" strokeLinecap="round" />
					<path d="M86,-40 Q150,-60 200,-76" stroke={NEWT.back} strokeWidth={12} fill="none" strokeLinecap="round" />
					<circle cx={204} cy={-78} r={12} fill={NEWT.back} stroke={INK} strokeWidth={4} />
				</g>
			) : null}
		</g>
	);
};
/** the newt on its own, (x, y) = ground under its belly (≈ 420 long at s 1). rot tilts it (deg) around that point. */
export const Newt: React.FC<{x: number; y: number; s?: number; t: number; rot?: number; flip?: boolean; carry?: boolean; walk?: number; slide?: boolean; blink?: boolean; seed?: number}> = ({x, y, s = 1, t, rot = 0, flip, ...rest}) => (
	<Fig x={x} y={y} s={s} vb={[-380, -200, 600, 240]} flip={flip}>
		<ellipse cx={0} cy={2} rx={130} ry={12} fill="#000" opacity={0.22} />
		<g transform={`rotate(${rot})`}>
			<NewtArt t={t} {...rest} />
		</g>
	</Fig>
);

/**
 * A wooden rain-butt (water barrel) with a downpipe; the newt pops out of the water with a splash.
 * (x, y) = ground under the barrel (≈ 300 × 380 at s 1, plus the pipe). pop = age (s) since the newt pops (< 0: calm water,
 * newt hidden; the splash plays from 0); carry = the newt pops up holding its tiny suitcase. pipe = downpipe length above.
 */
export const RainButt: React.FC<{x: number; y: number; s?: number; t: number; pop?: number; carry?: boolean; pipe?: number; newt?: boolean; flip?: boolean}> = ({x, y, s = 1, t, pop, carry, pipe = 420, newt = true, flip}) => {
	const top = -372;
	const wl = top + 10;
	const rise = pop === undefined || pop < 0 ? 0 : popK(pop, 0, 0.34);
	const bob = Math.sin(t * 3.1) * 4;
	const staves = [-110, -66, -22, 22, 66, 110];
	return (
		<Fig x={x} y={y} s={s} vb={[-260, top - pipe - 40, 520, -top + pipe + 80]} flip={flip}>
			<ellipse cx={0} cy={4} rx={160} ry={20} fill="#000" opacity={0.28} />
			{/* downpipe into the barrel */}
			<path d={`M86,${top - pipe} L86,${top - 70} Q86,${top - 30} 50,${top - 26}`} fill="none" stroke={INK} strokeWidth={46} strokeLinejoin="round" />
			<path d={`M86,${top - pipe} L86,${top - 70} Q86,${top - 30} 50,${top - 26}`} fill="none" stroke="#7d8794" strokeWidth={32} strokeLinejoin="round" />
			<path d={`M78,${top - pipe} L78,${top - 80}`} stroke="#b3bcc7" strokeWidth={8} />
			{/* back of the rim + water */}
			<ellipse cx={0} cy={top} rx={132} ry={32} fill="#6e4a28" stroke={INK} strokeWidth={W} />
			<ellipse cx={0} cy={wl} rx={116} ry={24} fill={WATER.deep} />
			{[0, 1].map((i) => {
				const q = ((t * 0.7 + i * 0.5) % 1);
				return <ellipse key={i} cx={-10} cy={wl} rx={20 + q * 80} ry={(20 + q * 80) * 0.22} fill="none" stroke={WATER.light} strokeWidth={4} opacity={(1 - q) * 0.8} />;
			})}
			{/* the newt, clipped at the waterline */}
			{pop !== undefined ? <SplashG x={-10} y={wl} a={pop} size={0.95} seed={4} part="back" /> : null}
			{newt && rise > 0 ? (
				<svg x={-260} y={top - pipe - 40} width={520} height={wl - (top - pipe - 40)} viewBox={`-260 ${top - pipe - 40} 520 ${wl - (top - pipe - 40)}`} overflow="hidden">
					<g transform={`translate(${-24} ${wl + lerp(150, -40, rise) + bob * rise}) rotate(-74)`}>
						<NewtArt t={t} carry={carry} />
					</g>
				</svg>
			) : null}
			{newt && rise > 0 ? <ellipse cx={-20} cy={wl} rx={58} ry={14} fill="none" stroke={WATER.light} strokeWidth={6} /> : null}
			{pop !== undefined ? <SplashG x={-10} y={wl} a={pop} size={0.95} seed={4} part="front" /> : null}
			{/* barrel front */}
			<path d={`M-132,${top} Q-150,${top / 2} -124,-20 Q0,6 124,-20 Q150,${top / 2} 132,${top} Q0,${top + 64} -132,${top} Z`} fill={WOOD.light} stroke={INK} strokeWidth={W + 1} strokeLinejoin="round" />
			{staves.map((sx) => <path key={sx} d={`M${sx},${top + 30 - Math.abs(sx) * 0.12} Q${sx * 1.12},${top / 2} ${sx},${-16 + Math.abs(sx) * 0.06}`} fill="none" stroke={WOOD.dark} strokeWidth={4} opacity={0.65} />)}
			<path d={`M-100,${top + 40} Q-112,${top / 2} -96,-40`} stroke="#fff" strokeWidth={14} opacity={0.18} fill="none" strokeLinecap="round" />
			{[top + 56, top / 2, -54].map((hy, i) => {
				const hw = i === 1 ? 146 : 136;
				return <path key={hy} d={`M${-hw},${hy - 4} Q0,${hy + 32} ${hw},${hy - 4} L${hw},${hy + 16} Q0,${hy + 52} ${-hw},${hy + 16} Z`} fill="#3d4148" stroke={INK} strokeWidth={4} strokeLinejoin="round" />;
			})}
			<path d={`M-132,${top} Q0,${top + 64} 132,${top}`} fill="none" stroke={INK} strokeWidth={W + 1} />
		</Fig>
	);
};

// ===================================================================================================== EXCAVATOR
const EXC = {p0: [70, -250] as [number, number], L1: 430, L2: 330, yellow: '#F2B632', yellowD: '#C98E1A'};
/** joint positions (local units) of the excavator arm: boom pivot p0, stick pivot p1, bucket pivot p2, teeth tip */
export const excavatorJoints = (boom: number, stick: number, claw: number) => {
	const [px, py] = EXC.p0;
	const b = rad(boom), st = rad(boom + stick), cl = rad(boom + stick + claw);
	const p1: [number, number] = [px + Math.cos(b) * EXC.L1, py + Math.sin(b) * EXC.L1];
	const p2: [number, number] = [p1[0] + Math.cos(st) * EXC.L2, p1[1] + Math.sin(st) * EXC.L2];
	const tip: [number, number] = [p2[0] + Math.cos(cl) * 214 - Math.sin(cl) * 8, p2[1] + Math.sin(cl) * 214 + Math.cos(cl) * 8];
	return {p0: [px, py] as [number, number], p1, p2, tip};
};
/** frame position of the excavator's claw tip for the same x, y, s, angles and flip */
export const excavatorTip = (o: {x: number; y: number; s?: number; boom?: number; stick?: number; claw?: number; flip?: boolean}) => {
	const {tip} = excavatorJoints(o.boom ?? -35, o.stick ?? 70, o.claw ?? 40);
	const s = o.s ?? 1;
	return {x: o.x + (o.flip ? -1 : 1) * tip[0] * s, y: o.y + tip[1] * s};
};
/**
 * Arm angles {boom, stick, claw} that put the claw tip on a frame point (elbow up) for an Excavator at {x, y, s, flip};
 * clawAbs = absolute bucket angle (deg; 0 = teeth pointing forward, 60 = pointing down). Out-of-reach targets are clamped.
 * Animate the TARGET (e.g. creep it toward a sign) and recompute every frame.
 */
export const excavatorAim = (o: {x: number; y: number; s?: number; flip?: boolean}, target: {x: number; y: number}, clawAbs = 0) => {
	const s = o.s ?? 1;
	const lx = ((target.x - o.x) / s) * (o.flip ? -1 : 1);
	const ly = (target.y - o.y) / s;
	const c = rad(clawAbs);
	const p2x = lx - (Math.cos(c) * 214 - Math.sin(c) * 8);
	const p2y = ly - (Math.sin(c) * 214 + Math.cos(c) * 8);
	const [px, py] = EXC.p0;
	const dx = p2x - px, dy = p2y - py;
	const D = Math.max(Math.abs(EXC.L1 - EXC.L2) + 1, Math.min(EXC.L1 + EXC.L2 - 1, Math.hypot(dx, dy)));
	const alpha = Math.acos((EXC.L1 ** 2 + D ** 2 - EXC.L2 ** 2) / (2 * EXC.L1 * D));
	const b = Math.atan2(dy, dx) - alpha;
	const p1x = px + Math.cos(b) * EXC.L1, p1y = py + Math.sin(b) * EXC.L1;
	const st = Math.atan2(p2y - p1y, p2x - p1x);
	const deg = (r: number) => (r * 180) / Math.PI;
	const norm = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
	return {boom: deg(b), stick: norm(deg(st - b)), claw: norm(clawAbs - deg(st))};
};
/**
 * Yellow tracked excavator, side view facing right (flip = facing left); (x, y) = ground under the tracks (≈ 580 wide body,
 * arm reaches ≈ 800 more at s 1). Arm angles in deg (SVG: + = clockwise/down): boom from horizontal (−35 = raised),
 * stick relative to boom, claw (bucket with teeth) relative to stick. drive = track speed px/s (wheels + treads roll).
 * sparks = age (s) of a screech at the claw tip; brake = age of a hard stop (track sparks + dust, the cab pitches forward).
 */
export const Excavator: React.FC<{x: number; y: number; s?: number; t: number; boom?: number; stick?: number; claw?: number; drive?: number; flip?: boolean; sparks?: number; brake?: number; smoke?: boolean}> = ({
	x, y, s = 1, t, boom = -35, stick = 70, claw = 40, drive = 0, flip, sparks, brake, smoke = true,
}) => {
	const {p0, p1, p2, tip} = excavatorJoints(boom, stick, claw);
	const roll = t * drive;
	const pitch = wobble(brake, 16, 4) * 4;
	const hum = Math.sin(t * 40) * 1.2;
	const Y = EXC.yellow, YD = EXC.yellowD;
	const at = (p: [number, number], ang: number, dx: number, dy: number): [number, number] => [p[0] + Math.cos(rad(ang)) * dx - Math.sin(rad(ang)) * dy, p[1] + Math.sin(rad(ang)) * dx + Math.cos(rad(ang)) * dy];
	const cyl = (a: [number, number], b: [number, number], key: string) => {
		const m: [number, number] = [lerp(a[0], b[0], 0.55), lerp(a[1], b[1], 0.55)];
		return (
			<g key={key}>
				<line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={20} strokeLinecap="round" />
				<line x1={m[0]} y1={m[1]} x2={b[0]} y2={b[1]} stroke="#dfe4ea" strokeWidth={10} strokeLinecap="round" />
				<line x1={a[0]} y1={a[1]} x2={m[0]} y2={m[1]} stroke={INK} strokeWidth={34} strokeLinecap="round" />
				<line x1={a[0]} y1={a[1]} x2={m[0]} y2={m[1]} stroke="#5a5f68" strokeWidth={22} strokeLinecap="round" />
			</g>
		);
	};
	const bAng = boom, sAng = boom + stick, cAng = boom + stick + claw;
	return (
		<Fig x={x} y={y} s={s} vb={[-360, -760, 1500, 820]} flip={flip}>
			<ellipse cx={0} cy={2} rx={300} ry={22} fill="#000" opacity={0.3} />
			{inWin(brake, 1.0) ? <PuffG x={250} y={-30} a={brake} dur={1.0} size={90} n={5} dx={150} dy={-50} seed={3} tone="dust" /> : null}
			{/* tracks */}
			<rect x={-280} y={-122} width={560} height={122} rx={61} fill="#2a2a30" stroke={INK} strokeWidth={W + 1} />
			<rect x={-272} y={-114} width={544} height={106} rx={53} fill="none" stroke="#4d4d56" strokeWidth={10} strokeDasharray="16 20" strokeDashoffset={-roll} />
			<rect x={-238} y={-98} width={476} height={74} rx={37} fill="#56565f" stroke={INK} strokeWidth={4} />
			{[-180, -90, 0, 90, 180].map((wx) => (
				<g key={wx} transform={`translate(${wx} -61) rotate(${(roll / 24) * 57.3})`}>
					<circle r={25} fill="#9aa0a8" stroke={INK} strokeWidth={4} />
					{[0, 120, 240].map((a) => <circle key={a} cx={Math.cos(rad(a)) * 12} cy={Math.sin(rad(a)) * 12} r={4} fill="#5a5f68" />)}
				</g>
			))}
			<g transform={`translate(0 ${hum}) rotate(${pitch} 0 -122)`}>
				<rect x={-180} y={-156} width={360} height={38} rx={8} fill="#3a3a42" stroke={INK} strokeWidth={4} />
				{/* exhaust */}
				<rect x={-226} y={-372} width={24} height={86} rx={6} fill="#3a3a42" stroke={INK} strokeWidth={4} />
				{smoke ? [0, 1].map((i) => {
					const ph = t * 1.2 + i / 2;
					return <PuffG key={i} x={-214} y={-388} a={(ph % 1) * 1.1} dur={1.1} size={34} n={3} dx={-60} dy={-120} seed={i + Math.floor(ph) * 5} tone="smoke" />;
				}) : null}
				{/* house: counterweight, engine, cab */}
				<rect x={-306} y={-288} width={200} height={140} rx={44} fill={YD} stroke={INK} strokeWidth={W} />
				{[-280, -230, -180].map((sx) => <path key={sx} d={`M${sx},-170 L${sx + 30},-170 L${sx + 54},-210 L${sx + 24},-210 Z`} fill={INK} opacity={0.8} />)}
				<rect x={-266} y={-312} width={240} height={164} rx={18} fill={Y} stroke={INK} strokeWidth={W} />
				<rect x={-250} y={-300} width={208} height={20} rx={8} fill="#fff" opacity={0.3} />
				<path d="M-60,-150 L-60,-444 Q-60,-472 -32,-472 L60,-472 Q88,-472 98,-444 L122,-300 L122,-150 Z" fill={Y} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d="M-38,-300 L-38,-446 L58,-446 Q72,-446 78,-428 L100,-300 Z" fill="#bfe6ff" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<path d="M-20,-440 L4,-440 L-14,-310 L-32,-310 Z" fill="#fff" opacity={0.45} />
				<rect x={-60} y={-176} width={182} height={26} fill={YD} />
				{/* boom cylinder, boom, stick, claw */}
				{cyl([30, -168], at(p0, bAng, EXC.L1 * 0.48, 34), 'c1')}
				<g transform={`translate(${p0[0]} ${p0[1]}) rotate(${bAng})`}>
					<path d={`M-30,-40 Q${EXC.L1 * 0.5},-74 ${EXC.L1 + 10},-26 L${EXC.L1 + 10},26 Q${EXC.L1 * 0.5},22 -30,40 Z`} fill={Y} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<path d={`M0,-30 Q${EXC.L1 * 0.5},-58 ${EXC.L1 - 10},-18`} fill="none" stroke="#fff" strokeWidth={8} opacity={0.3} strokeLinecap="round" />
					<circle cx={0} cy={0} r={20} fill="#5a5f68" stroke={INK} strokeWidth={4} />
				</g>
				{cyl(at(p0, bAng, EXC.L1 * 0.62, -46), at(p1, sAng, -40, -34), 'c2')}
				<g transform={`translate(${p1[0]} ${p1[1]}) rotate(${sAng})`}>
					<path d={`M-60,-30 L${EXC.L2 + 6},-20 L${EXC.L2 + 6},20 L-30,30 Z`} fill={Y} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<circle cx={0} cy={0} r={18} fill="#5a5f68" stroke={INK} strokeWidth={4} />
				</g>
				{cyl(at(p1, sAng, EXC.L2 * 0.35, -30), at(p2, cAng, 36, -40), 'c3')}
				<g transform={`translate(${p2[0]} ${p2[1]}) rotate(${cAng})`}>
					{[-30, -8, 14, 36].map((ty) => <path key={ty} d={`M168,${ty - 12} L218,${ty + 2} L168,${ty + 14} Z`} fill="#c9ccd2" stroke={INK} strokeWidth={4} strokeLinejoin="round" />)}
					<path d="M-14,-40 C50,-70 140,-66 176,-38 L180,52 C120,76 40,66 -14,34 Z" fill={Y} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<path d="M30,-30 C80,-50 130,-46 160,-28" fill="none" stroke="#fff" strokeWidth={7} opacity={0.3} strokeLinecap="round" />
					<path d="M176,-38 L180,52" stroke={INK} strokeWidth={10} />
					<circle cx={0} cy={0} r={16} fill="#5a5f68" stroke={INK} strokeWidth={4} />
				</g>
				<circle cx={p1[0]} cy={p1[1]} r={8} fill={INK} />
			</g>
			{inWin(sparks, 0.6) ? <SparksG x={tip[0]} y={tip[1]} a={sparks} dir={-60} spread={150} n={16} size={1.1} seed={7} /> : null}
			{inWin(brake, 0.6) ? <SparksG x={270} y={-8} a={brake} dir={-150} spread={70} n={12} size={0.9} seed={11} /> : null}
		</Fig>
	);
};

// ===================================================================================================== TWO DOORS
/** one doorway (w × h, bottom centre at x, y) with a leaf hinged on the side «hinge» that swings toward the camera (open 0..1) */
const Doorway: React.FC<{x: number; y: number; w: number; h: number; open: number; hinge: 'left' | 'right'; inside: React.ReactNode; light: string}> = ({x, y, w, h, open, hinge, inside, light}) => {
	const k = easeOut(open);
	const dw = lerp(w, w * 0.16, k);
	const L = hinge === 'left';
	const x0 = L ? 0 : w;
	const x1 = L ? dw : w - dw;
	return (
		<div style={{position: 'absolute', left: x - w / 2, top: y - h, width: w, height: h}}>
			<div style={{position: 'absolute', left: -30, top: -30, width: w + 60, height: h + 30, background: WOOD.base, boxShadow: `0 0 0 6px ${INK}`, borderRadius: '14px 14px 0 0'}} />
			<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#0b0f16', boxShadow: `inset 0 0 0 8px ${INK}`}}>
				{inside}
				<div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 70%, ${light} 0%, rgba(0,0,0,0) 70%)`, opacity: k}} />
			</div>
			<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<path d={`M${x0},0 L${x1},${-k * 44} L${x1},${h + k * 44} L${x0},${h} Z`} fill="#E3D2AC" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
				{[[0.1, 0.42], [0.52, 0.9]].map(([a, b], i) => {
					const fx = (f: number) => lerp(x0, x1, f);
					const sk = (f: number) => f * k * 30;
					return <path key={i} d={`M${fx(0.18)},${h * a - sk(0.18)} L${fx(0.82)},${h * a - sk(0.82)} L${fx(0.82)},${h * b + sk(0.82)} L${fx(0.18)},${h * b + sk(0.18)} Z`} fill="#cdb98f" stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
				})}
				<circle cx={lerp(x0, x1, 0.86)} cy={h * 0.5} r={Math.max(4, 14 * (1 - k * 0.7))} fill={PAL.gold} stroke={INK} strokeWidth={4} />
			</svg>
		</div>
	);
};
/** the cell behind the right door: bars, a high barred window, a bunk */
const CellInside: React.FC<{w: number; h: number; t: number}> = ({w, h, t}) => (
	<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0}}>
		<rect x={0} y={0} width={w} height={h} fill="#2a3342" />
		{Array.from({length: 12}, (_, r) => <line key={r} x1={0} y1={r * 48} x2={w} y2={r * 48} stroke="#222a37" strokeWidth={5} />)}
		<rect x={w * 0.3} y={h * 0.1} width={w * 0.4} height={h * 0.16} fill="#9fc2e8" stroke={INK} strokeWidth={5} />
		<circle cx={w * 0.58} cy={h * 0.15} r={14} fill="#f4f1dd" />
		{[0.38, 0.5, 0.62].map((f) => <rect key={f} x={w * f - 5} y={h * 0.1} width={10} height={h * 0.16} fill="#5d6874" stroke={INK} strokeWidth={3} />)}
		<rect x={0} y={h * 0.78} width={w} height={h * 0.22} fill="#1c2430" />
		<rect x={w * 0.08} y={h * 0.66} width={w * 0.56} height={h * 0.07} rx={6} fill="#6b7686" stroke={INK} strokeWidth={4} />
		<path d={`M${w * 0.5},${h * 0.1} L${w * 0.2},${h * 0.85} L${w * 0.75},${h * 0.85} L${w * 0.68},${h * 0.1} Z`} fill="#bcd6ff" opacity={0.12 + 0.04 * Math.sin(t * 2)} />
		{Array.from({length: 6}, (_, i) => <rect key={i} x={((i + 0.5) * w) / 6 - 9} y={0} width={18} height={h} fill="#8d97a3" stroke={INK} strokeWidth={4} />)}
		{[0.22, 0.6].map((f) => <rect key={f} x={0} y={h * f} width={w} height={16} fill="#8d97a3" stroke={INK} strokeWidth={4} />)}
	</svg>
);
/** daylight behind the left door: sky, field, an excavator waiting with its arm up */
const YardInside: React.FC<{w: number; h: number; t: number}> = ({w, h, t}) => (
	<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #7cc4f2 0%, #fff2cf 62%)', overflow: 'hidden'}}>
		<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0}}>
			<circle cx={w * 0.78} cy={h * 0.14} r={34} fill="#ffd75a" />
			<path d={`M0,${h * 0.62} Q${w * 0.5},${h * 0.56} ${w},${h * 0.62} L${w},${h} L0,${h} Z`} fill="#7cb655" stroke={INK} strokeWidth={4} />
		</svg>
		<Excavator x={w * 0.42} y={h * 0.86} s={0.36} t={t} boom={-48 + Math.sin(t * 2.2) * 6} stick={70} claw={50 + Math.sin(t * 2.2 + 1) * 10} smoke />
	</div>
);
/**
 * Split frame «two doors» (full 1080 × 1920): left door opens on a yard with an excavator, right door on a barred cell; a red
 * alarm-style deadline clock WITHOUT digits above (clock 0..1 = red sweep), and a giant gavel swinging between the doors like a
 * pendulum (swing = amplitude deg, period s). open = both doors or [left, right] 0..1. pick −1 / 1 dims the other side.
 * children render in front of the doors, behind the pendulum (e.g. the farmer).
 */
export const TwoDoors: React.FC<{t: number; open?: number | [number, number]; clock?: number; swing?: number; period?: number; pick?: number; children?: React.ReactNode}> = ({t, open = 1, clock = 0.7, swing = 26, period = 1.3, pick = 0, children}) => {
	const [oL, oR] = typeof open === 'number' ? [open, open] : open;
	const DW = 330, DH = 560, DY = 1090;
	const ang = swing * Math.sin((t / period) * Math.PI * 2);
	const tick = Math.floor(t * 2);
	const tickShake = wobble(t * 2 - tick, 30, 9) * 3;
	const cx = 540, cyc = 330, R = 112;
	const sweep = clamp01(clock) * 360;
	const wedge = (() => {
		if (sweep <= 0.5) return '';
		const a1 = rad(sweep - 90);
		const large = sweep > 180 ? 1 : 0;
		return `M${cx},${cyc} L${cx},${cyc - R * 0.82} A${R * 0.82},${R * 0.82} 0 ${large} 1 ${cx + Math.cos(a1) * R * 0.82},${cyc + Math.sin(a1) * R * 0.82} Z`;
	})();
	const hand = rad(sweep - 90);
	const sec = rad(tick * 30 - 90);
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: 540, height: 1920, background: 'radial-gradient(ellipse at 50% 45%, #2f5277 0%, #16304D 60%, #0F2238 100%)'}} />
			<div style={{position: 'absolute', left: 540, top: 0, width: 540, height: 1920, background: 'radial-gradient(ellipse at 50% 45%, #1d2738 0%, #111827 60%, #0a0f18 100%)'}} />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{Array.from({length: 22}, (_, r) => <line key={r} x1={0} y1={r * 90} x2={1080} y2={r * 90} stroke="#000" strokeOpacity={0.12} strokeWidth={4} />)}
				<rect x={0} y={DY} width={1080} height={1920 - DY} fill="#0b1626" />
				{Array.from({length: 9}, (_, i) => <line key={i} x1={540 + (i - 4) * 150} y1={DY} x2={540 + (i - 4) * 420} y2={1920} stroke="#000" strokeOpacity={0.3} strokeWidth={5} />)}
				<line x1={0} y1={DY} x2={1080} y2={DY} stroke={INK} strokeWidth={8} />
			</svg>
			{[
				[270, oL, '255,231,176', 0.3],
				[810, oR, '159,194,255', 0.2],
			].map(([lx, o, c, a]) => (
				<div key={lx as number} style={{position: 'absolute', left: (lx as number) - DW, top: DY, width: DW * 2, height: 520, clipPath: `polygon(${DW / 2}px 0, ${DW * 1.5}px 0, 100% 100%, 0 100%)`, background: `linear-gradient(180deg, rgba(${c},${(a as number) * easeOut(o as number)}) 0%, rgba(${c},0) 100%)`}} />
			))}
			<Doorway x={270} y={DY} w={DW} h={DH} open={oL} hinge="left" light="rgba(255,236,190,0.25)" inside={<YardInside w={DW} h={DH} t={t} />} />
			<Doorway x={810} y={DY} w={DW} h={DH} open={oR} hinge="right" light="rgba(160,190,255,0.12)" inside={<CellInside w={DW} h={DH} t={t} />} />
			{children}
			{pick !== 0 ? <div style={{position: 'absolute', left: pick < 0 ? 540 : 0, top: 0, width: 540, height: 1920, background: 'rgba(5,8,14,0.55)'}} /> : null}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				{/* pendulum gavel */}
				<g transform={`translate(540 468) rotate(${ang})`}>
					<g transform="scale(0.5) translate(180 648) rotate(-90)">
						<GavelArt />
					</g>
				</g>
				<rect x={500} y={440} width={80} height={34} rx={10} fill="#3d4148" stroke={INK} strokeWidth={5} />
				<circle cx={540} cy={468} r={14} fill={PAL.gold} stroke={INK} strokeWidth={5} />
				{/* deadline clock, no digits */}
				<g transform={`rotate(${tickShake} ${cx} ${cyc})`}>
					{[-1, 1].map((k) => (
						<g key={k}>
							<path d={`M${cx + k * 70},${cyc + 96} L${cx + k * 92},${cyc + 130}`} stroke={INK} strokeWidth={14} strokeLinecap="round" />
							<path d={`M${cx + k * 52},${cyc - 112} A46,46 0 0 1 ${cx + k * 128},${cyc - 50} Z`} fill={PAL.gold} stroke={INK} strokeWidth={W} strokeLinejoin="round" transform={`rotate(${k * -8 + (clock > 0.97 ? Math.sin(t * 60) * 10 : 0)} ${cx + k * 90} ${cyc - 80})`} />
						</g>
					))}
					<path d={`M${cx - 22},${cyc - 128} L${cx + 22},${cyc - 128}`} stroke={INK} strokeWidth={10} strokeLinecap="round" />
					<circle cx={cx} cy={cyc} r={R + 14} fill={PAL.stamp} stroke={INK} strokeWidth={W + 2} />
					<circle cx={cx} cy={cyc} r={R - 6} fill={PAL.parchment} stroke={INK} strokeWidth={W} />
					{wedge ? <path d={wedge} fill={PAL.stamp} opacity={0.42} /> : null}
					{Array.from({length: 12}, (_, i) => {
						const a = rad(i * 30 - 90);
						const r0 = i % 3 === 0 ? R - 40 : R - 28;
						return <line key={i} x1={cx + Math.cos(a) * r0} y1={cyc + Math.sin(a) * r0} x2={cx + Math.cos(a) * (R - 14)} y2={cyc + Math.sin(a) * (R - 14)} stroke={INK} strokeWidth={i % 3 === 0 ? 9 : 5} strokeLinecap="round" />;
					})}
					<line x1={cx} y1={cyc} x2={cx + Math.cos(hand) * (R - 30)} y2={cyc + Math.sin(hand) * (R - 30)} stroke={INK} strokeWidth={12} strokeLinecap="round" />
					<line x1={cx} y1={cyc} x2={cx + Math.cos(sec) * (R - 22)} y2={cyc + Math.sin(sec) * (R - 22)} stroke={PAL.stamp} strokeWidth={5} strokeLinecap="round" />
					<circle cx={cx} cy={cyc} r={12} fill={INK} />
					<ellipse cx={cx - 48} cy={cyc - 52} rx={30} ry={14} fill="#fff" opacity={0.35} transform={`rotate(-35 ${cx - 48} ${cyc - 52})`} />
				</g>
			</svg>
		</div>
	);
};
