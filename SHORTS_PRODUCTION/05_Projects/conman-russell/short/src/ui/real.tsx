import React from 'react';
import {AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {FPS} from '../lib/time';
import {clamp01, easeInOut, easeOut, lerp, useT, INK} from './gfx';

// v3 building blocks: real footage (public/footage/<id>/<id>.mp4, 1296×2304 = 1.2× the frame so a push-in never upscales),
// archival photos as a print on its own blurred copy (introduced, never «sudden»), the coin table, flag badges, the halo.
// One shared grade keeps stock clips of different cameras in the bright v1 palette.

export type Grade = {sat: number; con: number; bri: number; warm: number};
export const GRADE: Grade = {sat: 1.22, con: 1.07, bri: 1.03, warm: 0.12};
const filterOf = (g: Grade) => `saturate(${g.sat}) contrast(${g.con}) brightness(${g.bri})`;

/** warm highlights + a soft vignette over a graded shot */
export const Look: React.FC<{warm?: number; vignette?: number}> = ({warm = GRADE.warm, vignette = 0.35}) => (
	<>
		<AbsoluteFill style={{background: `linear-gradient(180deg, rgba(255,190,120,${warm}) 0%, rgba(255,150,90,${warm * 0.5}) 55%, rgba(60,30,90,${warm * 0.6}) 100%)`, mixBlendMode: 'soft-light'}} />
		<AbsoluteFill style={{background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(10,4,20,${vignette}) 100%)`}} />
	</>
);

/**
 * A stock clip on the timeline. `from` = second inside the file shown at t0; `zoom` = [start, end] scale relative to the
 * whole 1296×2304 crop (1 = full crop, 1.2 = 1:1 pixels); `pan` drifts the centre (px of the 1080 frame); `freeze` holds
 * the frame at that second of the shot (s after t0) — the push-in keeps going so nothing is ever static.
 */
export const Clip: React.FC<{
	src: string;
	t0: number;
	t1: number;
	from?: number;
	rate?: number;
	zoom?: [number, number];
	pan?: [number, number, number, number];
	freeze?: number;
	grade?: Partial<Grade>;
	mono?: number;
	hold?: number;
}> = ({src, t0, t1, from = 0, rate = 1, zoom = [1.0, 1.1], pan = [0, 0, 0, 0], freeze, grade, mono = 0, hold = 0.4}) => {
	const t = useT();
	const k = easeInOut((t - t0) / (t1 + hold - t0));
	const s = lerp(zoom[0], zoom[1], k);
	const dx = lerp(pan[0], pan[2], k);
	const dy = lerp(pan[1], pan[3], k);
	const g = {...GRADE, ...grade};
	const f0 = Math.round(t0 * FPS);
	const vid = <OffthreadVideo src={staticFile(src)} startFrom={Math.round(from * FPS)} playbackRate={rate} muted style={{width: '100%', height: '100%'}} />;
	const monoK = freeze !== undefined ? mono * clamp01((t - t0 - freeze) / 0.35) : mono;
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<div style={{position: 'absolute', left: 540 - (1080 * s) / 2 + dx, top: 960 - (1920 * s) / 2 + dy, width: 1080 * s, height: 1920 * s, filter: `${filterOf(g)} grayscale(${monoK})`}}>
				<Sequence from={f0} layout="none">
					{freeze !== undefined ? (
						<FreezeAfter at={Math.round(freeze * FPS)}>{vid}</FreezeAfter>
					) : (
						vid
					)}
				</Sequence>
			</div>
			<Look warm={g.warm} />
		</AbsoluteFill>
	);
};

/** plays normally until `at` frames into the enclosing Sequence, then holds that frame */
const FreezeAfter: React.FC<{at: number; children: React.ReactNode}> = ({at, children}) => {
	const f = useCurrentFrame();
	return (
		<Freeze frame={at} active={f >= at}>
			{children}
		</Freeze>
	);
};

/**
 * A full-bleed cinematic still (owner-made Google Flow frames): slow push-in towards `focus` with the shared grade. `span` =
 * absolute [start, end] of the move, so two consecutive shots of the same still continue one seamless push.
 */
export const Still: React.FC<{src: string; t0: number; t1: number; zoom?: [number, number]; focus?: [number, number]; span?: [number, number]; grade?: Partial<Grade>; hold?: number}> = ({
	src,
	t0,
	t1,
	zoom = [1.0, 1.12],
	focus = [0.5, 0.5],
	span,
	grade,
	hold = 0.4,
}) => {
	const t = useT();
	const [a, b] = span ?? [t0, t1 + hold];
	const k = easeInOut((t - a) / (b - a));
	const s = lerp(zoom[0], zoom[1], k);
	const g = {...GRADE, ...grade};
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<Img src={staticFile(src)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${s})`, filter: filterOf(g)}} />
			<Look warm={g.warm} />
		</AbsoluteFill>
	);
};

/**
 * Archival still: a cream-bordered print over its own blurred, darkened copy; slow push-in and a slight turn so the shot
 * breathes. `focus` = [x, y] of the face in the image (0..1) to keep it in the upper-middle; `tone` sepia for B/W plates.
 */
export const Photo: React.FC<{src: string; t0: number; t1: number; aspect: number; focus?: [number, number]; width?: number; tone?: number; rot?: [number, number]; y?: number; hold?: number}> = ({
	src,
	t0,
	t1,
	aspect,
	focus = [0.5, 0.4],
	width = 860,
	tone = 0.35,
	rot = [-2.2, -0.8],
	y = 820,
	hold = 0.4,
}) => {
	const t = useT();
	const k = easeInOut((t - t0) / (t1 + hold - t0));
	const s = lerp(1.0, 1.09, k);
	const h = width / aspect;
	const pad = 22;
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#140c08'}}>
			<Img src={staticFile(src)} style={{position: 'absolute', left: -200, top: -200, width: 1480, height: 2320, objectFit: 'cover', objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, filter: `blur(38px) brightness(0.42) saturate(0.75) sepia(${tone})`, transform: `scale(${lerp(1.15, 1.05, k)})`}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 65% at 50% 45%, rgba(0,0,0,0) 40%, rgba(8,4,12,0.55) 100%)'}} />
			<div
				style={{
					position: 'absolute',
					left: 540,
					top: y,
					width: width + pad * 2,
					height: h + pad * 2,
					transform: `translate(-50%, -50%) scale(${s}) rotate(${lerp(rot[0], rot[1], k)}deg)`,
					background: '#f3ead6',
					padding: pad,
					boxSizing: 'border-box',
					boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 6px 14px rgba(0,0,0,0.45)',
				}}
			>
				<Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, filter: `sepia(${tone}) contrast(1.06) brightness(1.02)`}} />
				<div style={{position: 'absolute', inset: pad, background: 'linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,250,235,0.16) 50%, rgba(255,255,255,0) 65%)', backgroundSize: '300% 100%', backgroundPosition: `${lerp(100, 0, k)}% 0`}} />
			</div>
		</AbsoluteFill>
	);
};

/** a small flag «pinned» by the subject: pops in, waves gently; no words (the voice says it) */
export const FlagBadge: React.FC<{src: string; t0: number; t1: number; x: number; y: number; w?: number; rot?: number}> = ({src, t0, t1, x, y, w = 250, rot = -6}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const k = easeOut((t - t0) / 0.3);
	const o = k * clamp01((t1 + 0.3 - t) / 0.3);
	const wave = Math.sin((t - t0) * 5) * 2.5;
	return (
		<div style={{position: 'absolute', left: x, top: y, width: w, transform: `translate(-50%, -50%) rotate(${rot + wave * 0.3}deg) scale(${lerp(0.6, 1, k)})`, opacity: o}}>
			<Img src={staticFile(src)} style={{width: '100%', display: 'block', border: '8px solid #fffaf0', borderRadius: 10, boxShadow: `0 0 0 4px ${INK}, 0 14px 30px rgba(0,0,0,0.55)`, transform: `skewY(${wave * 0.4}deg)`}} />
		</div>
	);
};

/** hand-drawn gold halo: draws itself on, bobs a little, soft glow (the «one casualty» wink) */
export const Halo: React.FC<{t0: number; t1: number; x: number; y: number; rx?: number; ry?: number; rot?: number}> = ({t0, t1, x, y, rx = 150, ry = 42, rot = -6}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const draw = easeOut((t - t0) / 0.7);
	const o = clamp01((t1 + 0.3 - t) / 0.3);
	const bob = Math.sin((t - t0) * 2.4) * 8;
	// two slightly different loops = a hand-drawn stroke
	const loop = (a: number, b: number, j: number) => {
		const pts: string[] = [];
		for (let i = 0; i <= 64; i++) {
			const u = (i / 64) * Math.PI * 2 * 1.08;
			const wob = 1 + 0.03 * Math.sin(u * 3 + j) + 0.02 * Math.sin(u * 7 + j * 2);
			pts.push(`${(Math.cos(u) * a * wob).toFixed(1)},${(Math.sin(u) * b * wob).toFixed(1)}`);
		}
		return 'M' + pts.join(' L');
	};
	const len = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2) * 1.1;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o, overflow: 'visible'}}>
			<g transform={`translate(${x}, ${y + bob}) rotate(${rot})`} style={{filter: 'drop-shadow(0 0 14px rgba(255,200,60,0.85)) drop-shadow(0 0 4px rgba(255,170,30,0.9))'}}>
				<path d={loop(rx, ry, 0)} fill="none" stroke="#FFD54A" strokeWidth={13} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
				<path d={loop(rx * 0.97, ry * 1.05, 1.7)} fill="none" stroke="#FFF2B0" strokeWidth={5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - clamp01(draw * 1.1 - 0.1))} opacity={0.9} />
			</g>
		</svg>
	);
};

/** «$10» → «$100»: real coin photos (public/coins) land on a dark wood table; n coins scatter into a pile */
export const CoinTable: React.FC<{t0: number; t1: number; coins: {t: number; x: number; y: number; r: number; s: number}[]; img: string; bg?: string; hold?: number}> = ({t0, t1, coins, img, bg, hold = 0.4}) => {
	const t = useT();
	const k = easeInOut((t - t0) / (t1 + hold - t0));
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: 'radial-gradient(ellipse 70% 55% at 50% 52%, #6a4026 0%, #3a2214 55%, #170c06 100%)'}}>
			{bg ? <Img src={staticFile(bg)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${lerp(1.04, 1.12, k)})`, filter: 'brightness(0.8) saturate(1.1)'}} /> : null}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 45% at 50% 55%, rgba(255,200,120,0.25), rgba(0,0,0,0) 60%), radial-gradient(ellipse 85% 70% at 50% 50%, rgba(0,0,0,0) 50%, rgba(8,3,0,0.65) 100%)'}} />
			<div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1.0, 1.08, k)})`}}>
				{coins.map((c, i) => {
					if (t < c.t) return null;
					const d = clamp01((t - c.t) / 0.28);
					const fall = 1 - easeOut(d);
					const bounce = d >= 1 ? Math.max(0, Math.sin(((t - c.t - 0.28) / 0.18) * Math.PI)) * 6 * Math.exp(-(t - c.t - 0.28) * 8) : 0;
					const sz = 330 * c.s * (1 + fall * 0.5);
					return (
						<div key={i} style={{position: 'absolute', left: c.x, top: c.y - bounce, width: sz, height: sz, transform: `translate(-50%, -50%) rotate(${c.r + fall * 40}deg)`, opacity: clamp01(d * 3), filter: `drop-shadow(${8 + fall * 30}px ${14 + fall * 50}px ${10 + fall * 20}px rgba(0,0,0,${0.55 - fall * 0.3}))`}}>
							<Img src={staticFile(img)} style={{width: '100%', height: '100%'}} />
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
