import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {MONT} from '../fonts';
import {clamp01, easeInOut, easeOut, h1, lerp, pop, useT, GOLD, INK} from './gfx';
import {PAL} from '../theme';

// Vox-style paper kit for «222–0» (owner 23.10: a MIX — real 1916 archive + our motion graphics + a few Flow key shots):
// paper ground, torn photo prints with tape, hand-drawn marker rings, film grain, camera shake, dust.

export const RED = PAL.stamp;
export const CREAM = PAL.parchment;
export const SEPIA = 'sepia(0.55) contrast(1.12) brightness(1.02)';

/** warm paper ground (public/vox/paper.jpg) with a soft vignette */
export const PaperBg: React.FC<{tone?: string; dim?: number}> = ({tone = 'rgba(120,70,20,0.18)', dim = 0.45}) => (
	<AbsoluteFill style={{background: '#d9c6a0'}}>
		<Img src={staticFile('vox/paper.jpg')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover'}} />
		<AbsoluteFill style={{background: tone, mixBlendMode: 'multiply'}} />
		<AbsoluteFill style={{background: `radial-gradient(ellipse 80% 65% at 50% 45%, rgba(0,0,0,0) 50%, rgba(40,20,5,${dim}) 100%)`}} />
	</AbsoluteFill>
);

/** jagged torn-paper outline as a CSS polygon (seeded, w × h box) */
const tornPath = (w: number, h: number, seed: number, amp = 9, step = 26) => {
	const pts: string[] = [];
	const j = (i: number) => (h1(seed * 31 + i) - 0.5) * 2 * amp;
	let i = 0;
	for (let x = 0; x <= w; x += step) pts.push(`${x}px ${Math.max(0, amp + j(i++))}px`);
	for (let y = 0; y <= h; y += step) pts.push(`${w - Math.max(0, amp + j(i++))}px ${y}px`);
	for (let x = w; x >= 0; x -= step) pts.push(`${x}px ${h - Math.max(0, amp + j(i++))}px`);
	for (let y = h; y >= 0; y -= step) pts.push(`${Math.max(0, amp + j(i++))}px ${y}px`);
	return `polygon(${pts.join(',')})`;
};

/**
 * A torn print (photo, cut-out) at centre (cx, cy), w × h, slightly rotated, with two tape strips; pops in at t0 with
 * overshoot and keeps drifting (scale + rotation) so it is never static.
 */
export const Torn: React.FC<{t0: number; cx: number; cy: number; w: number; h: number; rot?: number; seed?: number; tape?: boolean; drift?: number; children: React.ReactNode; from?: 'pop' | 'drop' | 'none'}> = ({
	t0, cx, cy, w, h, rot = -2, seed = 1, tape = true, drift = 0.04, children, from = 'pop',
}) => {
	const t = useT();
	if (t < t0) return null;
	const k = from === 'none' ? 1 : pop(t, t0, 0.42);
	const dy = from === 'drop' ? (1 - easeOut((t - t0) / 0.45)) * -500 : 0;
	const s = (from === 'pop' ? lerp(0.6, 1, k) : 1) * (1 + drift * clamp01((t - t0) / 3));
	const r = rot + (from === 'pop' ? (1 - k) * 8 : 0) + Math.sin((t - t0) * 0.9 + seed) * 0.5;
	return (
		<div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2 + dy, width: w, height: h, transform: `rotate(${r}deg) scale(${s})`, opacity: clamp01(k * 3), filter: 'drop-shadow(0 18px 22px rgba(30,15,0,0.55))'}}>
			<div style={{position: 'absolute', inset: 0, clipPath: tornPath(w, h, seed), background: CREAM, overflow: 'hidden'}}>
				<div style={{position: 'absolute', inset: 14, overflow: 'hidden'}}>{children}</div>
			</div>
			{tape ? (
				<>
					<div style={{position: 'absolute', left: -30, top: -18, width: 170, height: 54, transform: 'rotate(-28deg)', background: 'rgba(245,235,200,0.72)', boxShadow: '0 2px 6px rgba(0,0,0,0.25)'}} />
					<div style={{position: 'absolute', right: -30, top: -18, width: 170, height: 54, transform: 'rotate(26deg)', background: 'rgba(245,235,200,0.72)', boxShadow: '0 2px 6px rgba(0,0,0,0.25)'}} />
				</>
			) : null}
		</div>
	);
};

/** archive photo inside a Torn print: object-fit cover, slow push from zoom[0] to zoom[1] around focus */
export const ArchivePhoto: React.FC<{src: string; t0: number; t1: number; zoom?: [number, number]; focus?: [number, number]; grade?: string}> = ({src, t0, t1, zoom = [1.0, 1.1], focus = [0.5, 0.5], grade = SEPIA}) => {
	const t = useT();
	const s = lerp(zoom[0], zoom[1], easeInOut((t - t0) / Math.max(0.5, t1 - t0 + 0.5)));
	return <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${s})`, filter: grade}} />;
};

/** hand-drawn marker ring that draws itself around (cx, cy) from t0 (wobbly double stroke) */
export const MarkerRing: React.FC<{t0: number; cx: number; cy: number; rx: number; ry: number; color?: string; width?: number; t1?: number; seed?: number}> = ({t0, cx, cy, rx, ry, color = RED, width = 11, t1 = 99, seed = 3}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.25) return null;
	const k = easeOut((t - t0) / 0.45);
	const o = clamp01((t1 + 0.25 - t) / 0.25);
	const n = 48;
	const pts = Array.from({length: n + 6}, (_, i) => {
		const a = (i / n) * Math.PI * 2 * 1.08 - 0.6;
		const wob = 1 + (h1(seed + i * 0.7) - 0.5) * 0.06 + (i / n) * 0.05;
		return [cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob];
	});
	const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
	const len = 2 * Math.PI * Math.max(rx, ry) * 1.25;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o, pointerEvents: 'none'}}>
			<path d={d} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={width + 6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} transform="translate(3,5)" />
			<path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
		</svg>
	);
};

/** film grain over everything (8 noise frames cycled at 24 fps, overlay blend) */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.09}) => {
	const f = useCurrentFrame();
	const i = Math.floor(f / 2.5) % 8;
	return (
		<AbsoluteFill style={{mixBlendMode: 'overlay', opacity, pointerEvents: 'none'}}>
			<Img src={staticFile(`fx/grain_${i}.png`)} style={{width: '100%', height: '100%'}} />
		</AbsoluteFill>
	);
};

/** camera shake offset: decaying hits at the given times (amp px) plus an optional constant handheld tremor */
export const shake = (t: number, hits: number[], amp = 26, tremor = 0) => {
	let x = Math.sin(t * 13.1) * tremor + Math.sin(t * 7.3 + 1) * tremor * 0.6;
	let y = Math.cos(t * 11.7) * tremor + Math.sin(t * 5.9 + 2) * tremor * 0.6;
	let r = 0;
	for (const h of hits) {
		const a = t - h;
		if (a < 0 || a > 0.45) continue;
		const d = Math.exp(-a * 9) * amp;
		x += Math.sin(a * 70) * d;
		y += Math.cos(a * 63) * d * 0.8;
		r += Math.sin(a * 55) * d * 0.03;
	}
	return {x, y, r};
};
export const Shake: React.FC<{hits: number[]; amp?: number; tremor?: number; children: React.ReactNode}> = ({hits, amp, tremor, children}) => {
	const t = useT();
	const s = shake(t, hits, amp, tremor);
	return <AbsoluteFill style={{transform: `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg) scale(1.04)`}}>{children}</AbsoluteFill>;
};

/** dust / turf clods bursting out of (x, y) toward the camera from t0 */
export const Dust: React.FC<{t0: number; x: number; y: number; n?: number; spread?: number; dur?: number; color?: string}> = ({t0, x, y, n = 34, spread = 900, dur = 1.3, color = '120,85,50'}) => {
	const t = useT();
	const a = t - t0;
	if (a < 0 || a > dur) return null;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
			{Array.from({length: n}, (_, i) => {
				const ang = h1(i * 3.1) * Math.PI * 2;
				const sp = 0.35 + h1(i * 7.7) * 0.9;
				const k = easeOut(a / dur) * sp;
				const px = x + Math.cos(ang) * spread * k;
				const py = y + Math.sin(ang) * spread * k * 0.8 + 260 * (a / dur) ** 2;
				const r = (4 + h1(i * 5.3) * 16) * (1 + k * 2.2);
				const o = (1 - a / dur) * (0.35 + 0.5 * h1(i * 9.1));
				return <circle key={i} cx={px} cy={py} r={r} fill={`rgba(${color},${o})`} style={{filter: i % 3 === 0 ? 'blur(4px)' : undefined}} />;
			})}
		</svg>
	);
};

/** radial speed lines (hook energy), fading in/out over [t0, t1] */
export const SpeedLines: React.FC<{t0: number; t1: number; cx?: number; cy?: number; n?: number; strength?: number}> = ({t0, t1, cx = 540, cy = 800, n = 46, strength = 0.5}) => {
	const t = useT();
	if (t < t0 || t > t1) return null;
	const o = Math.min(clamp01((t - t0) / 0.1), clamp01((t1 - t) / 0.25)) * strength;
	const ph = Math.floor(t * 30);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: o, mixBlendMode: 'screen', pointerEvents: 'none'}}>
			{Array.from({length: n}, (_, i) => {
				const a = ((i + h1(i + ph) * 0.6) / n) * Math.PI * 2;
				const r0 = 520 + h1(i * 2 + ph) * 260;
				const r1 = r0 + 500 + h1(i * 5 + ph) * 700;
				return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke="#fff6e0" strokeWidth={3 + h1(i * 11 + ph) * 7} strokeLinecap="round" opacity={0.5 + 0.5 * h1(i * 13 + ph)} />;
			})}
		</svg>
	);
};

/** small white caption tag pinned under a print («Georgia Tech baseball, 1916») */
export const Caption: React.FC<{text: string; t0: number; t1: number; x: number; y: number; rot?: number}> = ({text, t0, t1, x, y, rot = -2}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.25) return null;
	const k = easeOut((t - t0) / 0.3);
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) translateY(${(1 - k) * 16}px)`, opacity: k * clamp01((t1 + 0.25 - t) / 0.25),
			background: '#fffaf0', color: INK, padding: '8px 18px 6px', fontFamily: MONT, fontWeight: 800, fontSize: 34, boxShadow: '0 6px 14px rgba(0,0,0,0.35)', whiteSpace: 'nowrap'}}>
			{text}
		</div>
	);
};

/**
 * WHO is who: a bold label box at (x, y) with a hand-drawn arrow to the target (tx, ty) — used instead of marker rings
 * (owner 23.10: «непонятно, что за овалы»). Pops in at t0; the arrow draws itself; the subtitle of that phrase steps aside.
 */
export const Tag: React.FC<{text: string; t0: number; t1: number; x: number; y: number; tx: number; ty: number; color?: string; size?: number; rot?: number}> = ({text, t0, t1, x, y, tx, ty, color = GOLD, size = 54, rot = -3}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.2) return null;
	const k = pop(t, t0, 0.34);
	const a = easeOut((t - t0 - 0.06) / 0.3);
	const o = clamp01((t1 + 0.2 - t) / 0.2);
	const sx = x + (tx - x) * 0.12, sy = y + size * 0.72 * Math.sign(ty - y || 1);
	const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1;
	const ex = tx - (dx / len) * 22, ey = ty - (dy / len) * 22;
	const mx = (sx + ex) / 2 - (dy / len) * len * 0.22, my = (sy + ey) / 2 + (dx / len) * len * 0.22;
	const L = len * 1.15;
	const hx = ex - mx, hy = ey - my, hl = Math.hypot(hx, hy) || 1;
	const ux = hx / hl, uy = hy / hl;
	const head = `${ex + ux * 26},${ey + uy * 26} ${ex - uy * 20},${ey + ux * 20} ${ex + uy * 20},${ey - ux * 20}`;
	return (
		<div style={{position: 'absolute', inset: 0, opacity: o, pointerEvents: 'none'}}>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<path d={`M${sx},${sy} Q${mx},${my} ${ex},${ey}`} fill="none" stroke={INK} strokeWidth={17} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - a)} />
				<path d={`M${sx},${sy} Q${mx},${my} ${ex},${ey}`} fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - a)} />
				{a > 0.92 ? <polygon points={head} fill="#fff" stroke={INK} strokeWidth={5} strokeLinejoin="round" /> : null}
			</svg>
			<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${k})`, background: color, color: INK, border: `6px solid ${INK}`, borderRadius: 14,
				padding: '8px 26px 6px', fontFamily: MONT, fontWeight: 900, fontSize: size, letterSpacing: 1, whiteSpace: 'nowrap', textTransform: 'uppercase', boxShadow: `0 9px 0 ${INK}, 0 14px 30px rgba(0,0,0,0.45)`}}>
				{text}
			</div>
		</div>
	);
};
