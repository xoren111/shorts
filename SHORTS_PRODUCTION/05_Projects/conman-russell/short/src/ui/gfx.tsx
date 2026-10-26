import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ANTON, HEAD, MONT} from '../fonts';
import {FPS} from '../lib/time';
import {PAL} from '../theme';

/** channel text accent (T5): orange since 24.10 (palette «A · Экспедиция», theme.ts; was gold #FFC83A). The name GOLD stays
 * so project code, `gold_words` in project.json and color='gold' props keep working. */
export const GOLD = PAL.orange;
export const GOLD2 = '#E2560C';
export const MAGENTA = '#FF2E88';
export const TEAL = '#22E6D8';
export const INK = '#120818';
/** AI-farm-girl palette (owner 24.10: white text → yellow, accents → purple) */
export const YELLOW = '#FFD84A';
export const PURPLE = '#B266FF';
export const PURPLE_D = '#7A2BE8';
export const purpleFill: React.CSSProperties = {backgroundImage: 'linear-gradient(180deg, #EBD3FF 0%, #B57BFF 45%, #7C2BE0 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'};

export const useT = () => useCurrentFrame() / FPS;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInOut = (x: number) => {
	const t = clamp01(x);
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** 0→1 with overshoot (pop-in), d = duration s */
export const pop = (t: number, t0: number, d = 0.35) => {
	const x = (t - t0) / d;
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	return 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
};
/** visible window with fades (seconds) */
export const win = (t: number, a: number, b: number, fi = 0.12, fo = 0.12) => clamp01((t - a) / fi) * clamp01((b - t) / fo);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const stroke = (w: number, c = INK): React.CSSProperties => ({WebkitTextStroke: `${w}px ${c}`, paintOrder: 'stroke fill'});

/** accent (orange) gradient text fill */
export const goldFill: React.CSSProperties = {
	backgroundImage: `linear-gradient(180deg, #FFC48F 0%, ${GOLD} 45%, ${GOLD2} 100%)`,
	WebkitBackgroundClip: 'text',
	backgroundClip: 'text',
	color: 'transparent',
};

/** big slammed headline (crash-in scale + shadow; straight by default, T4); `glitch` adds RGB split jitter */
export const BigText: React.FC<{text: string; t0: number; t1: number; y: number; size?: number; color?: string; gold?: boolean; rot?: number; glitch?: boolean; font?: 'head' | 'anton' | 'mont'; x?: number; sub?: string}> = ({
	text,
	t0,
	t1,
	y,
	size = 170,
	color = '#fff',
	gold,
	rot = 0,
	glitch,
	font = 'head',
	x = 540,
	sub,
}) => {
	const t = useT();
	if (t < t0 - 0.01 || t > t1 + 0.2) return null;
	const k = pop(t, t0, 0.3);
	const out = clamp01((t1 + 0.18 - t) / 0.18);
	const s = lerp(2.4, 1, k) * (1 + 0.03 * Math.sin((t - t0) * 6));
	const jit = glitch ? Math.sin(t * 91) * 10 * (0.4 + 0.6 * Math.abs(Math.sin(t * 17))) : 0;
	const fam = font === 'head' ? HEAD : font === 'anton' ? ANTON : MONT;
	const base: React.CSSProperties = {
		position: 'absolute',
		left: x,
		top: y,
		transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`,
		fontFamily: fam,
		fontWeight: font === 'mont' ? 900 : 400,
		fontSize: size,
		lineHeight: 0.95,
		textAlign: 'center',
		whiteSpace: 'pre',
		letterSpacing: font === 'head' ? 1 : font === 'anton' ? 2 : -2,
		textTransform: 'uppercase',
		opacity: out * clamp01(k * 3),
	};
	return (
		<>
			{glitch ? (
				<>
					<div style={{...base, color: '#00F0FF', mixBlendMode: 'screen', marginLeft: -jit, opacity: base.opacity as number * 0.8}}>{text}</div>
					<div style={{...base, color: MAGENTA, mixBlendMode: 'screen', marginLeft: jit, opacity: base.opacity as number * 0.8}}>{text}</div>
				</>
			) : null}
			<div style={{...base, ...(gold ? goldFill : {color}), filter: `drop-shadow(0 10px 0 ${INK}) drop-shadow(0 0 30px rgba(255,120,40,0.55))`}}>
				{text}
				{sub ? <div style={{fontFamily: MONT, fontWeight: 800, fontSize: size * 0.22, letterSpacing: 1, marginTop: size * 0.08, color: '#fff', WebkitTextFillColor: '#fff'}}>{sub}</div> : null}
			</div>
		</>
	);
};

/** stamp-style date / year (gold block, slams in, small shake ring) */
export const DateStamp: React.FC<{text: string; t0: number; t1: number; x?: number; y?: number; size?: number; rot?: number; small?: string}> = ({text, t0, t1, x = 540, y = 330, size = 150, rot = 0, small}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.2) return null;
	const k = pop(t, t0, 0.28);
	const o = clamp01((t1 + 0.2 - t) / 0.2);
	const ring = clamp01((t - t0) / 0.45);
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${lerp(2.2, 1, k)})`, opacity: o * clamp01(k * 4)}}>
			<div
				style={{
					position: 'absolute',
					left: '50%',
					top: '50%',
					width: 600 * ring + 100,
					height: 600 * ring + 100,
					transform: 'translate(-50%,-50%)',
					borderRadius: '50%',
					border: `${6 * (1 - ring)}px solid rgba(255,122,31,${0.35 * (1 - ring)})`,
				}}
			/>
			<div
				style={{
					background: `linear-gradient(180deg, #FFB27A, ${GOLD} 50%, ${GOLD2})`,
					color: INK,
					fontFamily: HEAD,
					fontSize: size,
					lineHeight: 1,
					padding: `${size * 0.08}px ${size * 0.22}px ${size * 0.04}px`,
					borderRadius: size * 0.1,
					border: `${size * 0.04}px solid ${INK}`,
					boxShadow: `0 ${size * 0.07}px 0 ${INK}, 0 0 60px rgba(255,150,40,0.6)`,
					letterSpacing: 4,
					whiteSpace: 'nowrap',
					textAlign: 'center',
				}}
			>
				{text}
				{small ? <div style={{fontFamily: MONT, fontWeight: 900, fontSize: size * 0.2, letterSpacing: 2, marginTop: -size * 0.02}}>{small}</div> : null}
			</div>
		</div>
	);
};

/** rubber stamp («HEAVILY DISPUTED») */
export const Stamp: React.FC<{text: string; t0: number; t1: number; x?: number; y?: number; color?: string; size?: number; rot?: number}> = ({text, t0, t1, x = 540, y = 760, color = PAL.stamp, size = 92, rot = 0}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.15) return null;
	const k = clamp01((t - t0) / 0.12);
	const s = k < 1 ? lerp(2.6, 0.92, k * k) : 0.92 + 0.08 * easeOut((t - t0 - 0.12) / 0.2);
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`,
				opacity: clamp01(k * 3) * clamp01((t1 + 0.15 - t) / 0.15),
				border: `10px solid ${color}`,
				borderRadius: 18,
				padding: '10px 28px 4px',
				color,
				fontFamily: HEAD,
				fontSize: size,
				letterSpacing: 3,
				whiteSpace: 'nowrap',
				background: 'rgba(20,0,10,0.35)',
				boxShadow: `0 0 40px ${color}66, inset 0 0 30px ${color}44`,
				textShadow: `0 0 18px ${color}88`,
			}}
		>
			{text}
		</div>
	);
};

/** small rounded chip with a dot (place / date context), e.g. top-left */
export const Chip: React.FC<{text: string; t0: number; t1: number; x?: number; y?: number; color?: string; fg?: string}> = ({text, t0, t1, x = 60, y = 190, color = PAL.orange, fg = INK}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.2) return null;
	const k = easeOut((t - t0) / 0.3);
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				transform: `translateX(${(1 - k) * -60}px)`,
				opacity: k * clamp01((t1 + 0.2 - t) / 0.2),
				display: 'flex',
				alignItems: 'center',
				gap: 16,
				padding: '12px 26px 12px 18px',
				borderRadius: 999,
				background: 'rgba(12,6,30,0.72)',
				border: `3px solid ${color}`,
				boxShadow: `0 0 24px ${color}66`,
				fontFamily: MONT,
				fontWeight: 900,
				fontSize: 40,
				color: fg,
				letterSpacing: 2,
				textTransform: 'uppercase',
			}}
		>
			<div style={{width: 20, height: 20, borderRadius: 10, background: color, boxShadow: `0 0 16px ${color}`, opacity: 0.6 + 0.4 * Math.sin(t * 8)}} />
			{text}
		</div>
	);
};

/** map pin label at a screen point (projected from 3D); drops in at t0 */
export const Pin: React.FC<{text: string; x: number; y: number; t0: number; t1: number; color?: string; size?: number; side?: 'up' | 'down'; sub?: string}> = ({text, x, y, t0, t1, color = GOLD, size = 46, side = 'up', sub}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.2 || !Number.isFinite(x)) return null;
	const k = pop(t, t0, 0.4);
	const o = clamp01((t1 + 0.2 - t) / 0.2);
	const stem = 120 * k;
	const pulse = ((t - t0) * 1.4) % 1;
	// keep the label inside the frame (the stem still points at the true spot)
	const shift = Math.max(0, 230 - x) - Math.max(0, x - 850);
	return (
		<div style={{position: 'absolute', left: x, top: y, opacity: o}}>
			<div style={{position: 'absolute', left: -60 * pulse - 8, top: -60 * pulse - 8, width: 120 * pulse + 16, height: 120 * pulse + 16, borderRadius: '50%', border: `4px solid ${color}`, opacity: 1 - pulse}} />
			<div style={{position: 'absolute', left: -11, top: -11, width: 22, height: 22, borderRadius: 11, background: color, border: `4px solid ${INK}`, boxShadow: `0 0 20px ${color}`}} />
			<div style={{position: 'absolute', left: -2.5, top: side === 'up' ? -stem : 0, width: 5, height: stem, background: '#fff', boxShadow: `0 0 8px ${INK}`}} />
			<div
				style={{
					position: 'absolute',
					left: shift,
					top: side === 'up' ? -stem : stem,
					transform: `translate(-50%, ${side === 'up' ? '-100%' : '0'}) scale(${k})`,
					transformOrigin: side === 'up' ? '50% 100%' : '50% 0%',
					padding: '10px 24px 8px',
					background: '#fff',
					color: INK,
					borderRadius: 14,
					border: `4px solid ${INK}`,
					boxShadow: `0 8px 0 ${INK}, 0 0 30px ${color}88`,
					fontFamily: MONT,
					fontWeight: 900,
					fontSize: size,
					whiteSpace: 'nowrap',
					letterSpacing: 1,
					textTransform: 'uppercase',
					textAlign: 'center',
				}}
			>
				{text}
				{sub ? <div style={{fontSize: size * 0.5, fontWeight: 800, color: '#7a2a55', marginTop: -2}}>{sub}</div> : null}
			</div>
		</div>
	);
};

const fmt = (v: number, dec: number, sep: boolean) => {
	const s = v.toFixed(dec);
	if (!sep) return s;
	const [a, b] = s.split('.');
	return a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : '');
};

/** rolling number counter (eases to `to` over `dur` s) with a unit line */
export const Counter: React.FC<{from?: number; to: number; dec?: number; sep?: boolean; t0: number; t1: number; dur?: number; x?: number; y?: number; size?: number; unit?: string; prefix?: string; note?: string; color?: 'gold' | 'teal'}> = ({
	from = 0,
	to,
	dec = 0,
	sep = true,
	t0,
	t1,
	dur = 1.0,
	x = 540,
	y = 520,
	size = 210,
	unit,
	prefix = '',
	note,
	color = 'gold',
}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.2) return null;
	const k = easeOut((t - t0) / dur);
	const v = lerp(from, to, k);
	const p = pop(t, t0, 0.3);
	const o = clamp01((t1 + 0.2 - t) / 0.2);
	const landed = t - t0 > dur ? pop(t, t0 + dur, 0.25) : 0;
	const fill: React.CSSProperties =
		color === 'gold'
			? goldFill
			: {backgroundImage: `linear-gradient(180deg, #E8FFFF 0%, ${TEAL} 50%, #0FA3C8 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'};
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${lerp(0.4, 1, p) * (1 + 0.06 * Math.sin(Math.PI * landed))})`, opacity: o * clamp01(p * 3), textAlign: 'center'}}>
			<div style={{fontFamily: HEAD, fontSize: size, lineHeight: 0.95, whiteSpace: 'nowrap', ...fill, filter: `drop-shadow(0 9px 0 ${INK}) drop-shadow(0 0 34px ${color === 'gold' ? 'rgba(255,140,30,0.6)' : 'rgba(30,220,230,0.55)'})`}}>
				{prefix}
				{fmt(v, dec, sep)}
			</div>
			{unit ? (
				<div style={{fontFamily: MONT, fontWeight: 900, fontSize: size * 0.27, color: '#fff', ...stroke(10), letterSpacing: 3, textTransform: 'uppercase', marginTop: 4, whiteSpace: 'nowrap'}}>{unit}</div>
			) : null}
			{note ? <div style={{fontFamily: MONT, fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.9, marginTop: 8, ...stroke(7), whiteSpace: 'nowrap'}}>{note}</div> : null}
		</div>
	);
};

/** full-frame photo with Ken Burns (scale/pan), colour grade, vignette and a credit line */
export const PhotoKB: React.FC<{src: string; t0: number; t1: number; from?: [number, number, number]; to?: [number, number, number]; credit?: string; grade?: string; fit?: 'cover' | 'contain'; tint?: string; duo?: boolean | 'cool'; pos?: string}> = ({
	src,
	t0,
	t1,
	from = [1.15, 0, 0],
	to = [1.3, 0, -40],
	credit,
	grade = 'contrast(1.12) saturate(1.15)',
	tint = 'rgba(40,10,80,0.25)',
	duo,
	pos = '50% 50%',
}) => {
	const t = useT();
	if (t < t0 || t > t1) return null;
	const k = clamp01((t - t0) / Math.max(0.1, t1 - t0));
	const s = lerp(from[0], to[0], k);
	const x = lerp(from[1], to[1], k);
	const y = lerp(from[2], to[2], k);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<Img src={staticFile(src)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: `blur(28px) brightness(0.55) ${grade}`, transform: 'scale(1.2)'}} />
			<Img src={staticFile(src)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, filter: duo ? `grayscale(1) ${grade}` : grade, transform: `translate(${x}px, ${y}px) scale(${s})`}} />
			{duo ? <Duotone cool={duo === 'cool'} /> : <AbsoluteFill style={{background: tint, mixBlendMode: 'multiply'}} />}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(5,0,20,0.75) 100%)'}} />
			{credit ? (
				<div style={{position: 'absolute', left: 32, maxWidth: 900, top: 1582, padding: '5px 12px', borderRadius: 10, background: 'rgba(8,3,20,0.55)', fontFamily: MONT, fontWeight: 700, fontSize: 22, lineHeight: 1.15, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.3}}>{credit}</div>
			) : null}
		</AbsoluteFill>
	);
};

/** additive light leak blob sweeping across the frame */
export const LightLeak: React.FC<{t0: number; dur?: number; color?: string; from?: [number, number]; to?: [number, number]; size?: number; strength?: number}> = ({t0, dur = 0.8, color = '255,120,40', from = [-200, 300], to = [1300, 900], size = 900, strength = 0.75}) => {
	const t = useT();
	const k = (t - t0) / dur;
	if (k < 0 || k > 1) return null;
	const a = Math.sin(Math.PI * k) * strength;
	const x = lerp(from[0], to[0], k);
	const y = lerp(from[1], to[1], k);
	return (
		<AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
			<div style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle, rgba(${color},${a}) 0%, rgba(${color},${a * 0.4}) 35%, rgba(${color},0) 70%)`}} />
		</AbsoluteFill>
	);
};

/** white/colour flash on cuts and impacts */
export const Flash: React.FC<{t0: number; dur?: number; color?: string; max?: number}> = ({t0, dur = 0.25, color = '#fff', max = 0.9}) => {
	const t = useT();
	const k = (t - t0) / dur;
	if (k < 0 || k > 1) return null;
	return <AbsoluteFill style={{background: color, opacity: max * Math.pow(1 - k, 2), mixBlendMode: 'screen'}} />;
};

/** soft dark gradient for readability at the top / bottom */
export const ReadabilityGrad: React.FC<{top?: number; bottom?: number}> = ({top = 0.45, bottom = 0.5}) => (
	<AbsoluteFill
		style={{
			background: `linear-gradient(180deg, rgba(6,2,20,${top}) 0%, rgba(6,2,20,0) 22%, rgba(6,2,20,0) 50%, rgba(6,2,20,${bottom * 0.6}) 64%, rgba(6,2,20,${bottom}) 100%)`,
			pointerEvents: 'none',
		}}
	/>
);

export const interp = (t: number, ts: number[], vs: number[]) => interpolate(t, ts, vs, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const h1 = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** duotone grade for black-and-white archive photos: shadows → indigo, highlights → warm peach (palette of the film) */
export const Duotone: React.FC<{cool?: boolean}> = ({cool}) => (
	<>
		<AbsoluteFill style={{background: cool ? 'linear-gradient(170deg, #c8f6ff 0%, #8fe3f0 55%, #ffb38a 100%)' : 'linear-gradient(170deg, #ffc58a 0%, #ff9f7a 55%, #ff7aa8 100%)', mixBlendMode: 'multiply'}} />
		<AbsoluteFill style={{background: cool ? 'linear-gradient(170deg, #0b1d5e 0%, #12104a 100%)' : 'linear-gradient(170deg, #1d1a6e 0%, #2a0f55 100%)', mixBlendMode: 'screen'}} />
	</>
);

/** low-resolution archive photo shown at (near) native sharpness: a bordered card over a blurred, darkened copy of itself */
export const PhotoCard: React.FC<{src: string; t0: number; t1: number; aspect: number; cx?: number; cy?: number; w?: number; duo?: boolean | 'cool'; credit?: string; pos?: string; rot?: number; zoom?: [number, number]}> = ({
	src,
	t0,
	t1,
	aspect,
	cx = 540,
	cy = 860,
	w = 960,
	duo,
	credit,
	pos = '50% 50%',
	rot = -2,
	zoom = [1.0, 1.08],
}) => {
	const t = useT();
	if (t < t0 || t > t1) return null;
	const k = clamp01((t - t0) / Math.max(0.1, t1 - t0));
	const p = pop(t, t0, 0.35);
	const h = w / aspect;
	const g = duo ? 'grayscale(1) contrast(1.35)' : 'contrast(1.12) saturate(1.2)';
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#05020f'}}>
			<Img src={staticFile(src)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: `blur(36px) brightness(0.45) ${g}`, transform: 'scale(1.25)'}} />
			{duo ? <Duotone cool={duo === 'cool'} /> : null}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 35%, rgba(5,0,20,0.8) 100%)'}} />
			<div
				style={{
					position: 'absolute',
					left: cx - w / 2,
					top: cy - h / 2,
					width: w,
					height: h,
					transform: `rotate(${rot}deg) scale(${lerp(0.85, 1, p)})`,
					opacity: clamp01(p * 3),
					borderRadius: 22,
					overflow: 'hidden',
					border: '9px solid #fff',
					boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
				}}
			>
				<Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, filter: g, transform: `scale(${lerp(zoom[0], zoom[1], k)})`}} />
				{duo ? <Duotone cool={duo === 'cool'} /> : null}
			</div>
			{credit ? (
				<div style={{position: 'absolute', left: 32, maxWidth: 900, top: 1582, padding: '5px 12px', borderRadius: 10, background: 'rgba(8,3,20,0.55)', fontFamily: MONT, fontWeight: 700, fontSize: 22, lineHeight: 1.15, color: 'rgba(255,255,255,0.9)'}}>{credit}</div>
			) : null}
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
// v3 style (owner notes 18.10, reference: GeoGlobeTales Shorts): calm, horizontal labels ON the picture, one at a time,
// never repeating what the subtitle says; smooth cross-dissolves between shots. See STYLE.md.

/** cross-dissolve length between shots (s): the incoming shot fades in on top while the outgoing one keeps running */
export const XF = 0.4;

/** a shot on the timeline: mounted in [t0, t1 + hold) and faded in over `fadeIn` s on top of the previous shot */
export const Layer: React.FC<{t0: number; t1: number; fadeIn?: number; hold?: number; children: React.ReactNode}> = ({t0, t1, fadeIn = XF, hold = XF, children}) => {
	const t = useT();
	if (t < t0 || t >= t1 + hold) return null;
	const o = fadeIn > 0 ? easeInOut((t - t0) / fadeIn) : 1;
	return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

const LABEL_SHADOW = `-2px -2px 0 ${INK}, 2px -2px 0 ${INK}, -2px 2px 0 ${INK}, 2px 2px 0 ${INK}, 0 4px 0 ${INK}, 0 4px 14px rgba(0,0,0,0.7), 0 0 28px rgba(0,0,0,0.45)`;   // ink outline: readable on bright skies

/**
 * Calm label in the reference style: horizontal, white Montserrat with a soft shadow, Title Case (not shouted), optional
 * gold accent part and a small second line. With `anchor`, a dot marks the spot and a thin leader joins it to the text.
 * Fades/rises in over 0.35 s, fades out over 0.3 s. Keeps itself inside the 1080-wide frame.
 */
export const Label: React.FC<{
	text: string;
	t0: number;
	t1: number;
	x: number;
	y: number;
	/** gold part drawn after `text` (e.g. a number) */
	accent?: string;
	sub?: string;
	size?: number;
	/** draw a dot at (x, y) and put the text at (x + dx, y + dy) */
	anchor?: boolean;
	dx?: number;
	dy?: number;
	align?: 'center' | 'left' | 'right';
	color?: string;
}> = ({text, t0, t1, x, y, accent, sub, size = 54, anchor, dx = 0, dy = -70, align = 'center', color = '#fff'}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
	const k = easeOut((t - t0) / 0.35);
	const o = k * clamp01((t1 + 0.3 - t) / 0.3);
	const lx = anchor ? x + dx : x;
	const ly = anchor ? y + dy : y;
	const estW = (text.length + (accent ? accent.length + 1 : 0)) * size * 0.66;
	const half = align === 'center' ? estW / 2 : 0;
	const cx = align === 'center' ? Math.max(70 + half, Math.min(1010 - half, lx)) : lx;
	const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: o, pointerEvents: 'none'}}>
			{anchor ? (
				<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
					<line x1={x} y1={y} x2={lerp(x, cx, k)} y2={lerp(y, ly + size * 0.55, k)} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.85} style={{filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))'}} />
					<circle cx={x} cy={y} r={9} fill="#fff" style={{filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))'}} />
					{t - t0 < 1.2 ? <circle cx={x} cy={y} r={9 + 16 * easeOut((t - t0) / 1.2)} fill="none" stroke="#fff" strokeWidth={2} opacity={0.6 * (1 - (t - t0) / 1.2)} /> : null}
				</svg>
			) : null}
			<div
				style={{
					position: 'absolute',
					left: cx,
					top: ly,
					transform: `translate(${tx}, -50%) translateY(${(1 - k) * 14}px)`,
					fontFamily: MONT,
					fontWeight: 800,
					fontSize: size,
					lineHeight: 1.05,
					color,
					textShadow: LABEL_SHADOW,
					whiteSpace: 'nowrap',
					textAlign: align,
					letterSpacing: 0.3,
				}}
			>
				{text}
				{accent ? <span style={{color: '#FFD54A'}}> {accent}</span> : null}
				{sub ? <div style={{fontSize: size * 0.58, fontWeight: 700, opacity: 0.88, marginTop: 4}}>{sub}</div> : null}
			</div>
		</div>
	);
};

/**
 * Key number of a moment (owner 18.10: an important figure may be shown big — but then the subtitle of that phrase steps
 * aside, so it is never on screen twice). Horizontal gold (or teal) number + a small unit line, soft glow, gentle scale-in;
 * the final value only (no rolling counter).
 */
export const KeyFact: React.FC<{value: string; unit?: string; sub?: string; t0: number; t1: number; x?: number; y?: number; size?: number; color?: 'gold' | 'teal' | 'purple'; align?: 'center' | 'left'}> = ({
	value,
	unit,
	sub,
	t0,
	t1,
	x = 540,
	y = 470,
	size = 160,
	color = 'gold',
	align = 'center',
}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const k = easeOut((t - t0) / 0.35);
	const o = k * clamp01((t1 + 0.3 - t) / 0.3);
	const fill: React.CSSProperties =
		color === 'gold'
			? goldFill
			: color === 'purple'
				? purpleFill
				: {backgroundImage: `linear-gradient(180deg, #E8FFFF 0%, ${TEAL} 50%, #0FA3C8 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'};
	const subCol = color === 'purple' ? YELLOW : '#fff';
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(${align === 'center' ? '-50%' : '0'}, -50%) scale(${lerp(0.9, 1, k)})`, transformOrigin: align === 'center' ? '50% 50%' : '0% 50%', opacity: o, textAlign: align, pointerEvents: 'none'}}>
			{/* soft dark scrim + a solid ink outline under the gradient: readable on a bright sunset sky (owner 21.10) */}
			<div style={{position: 'absolute', left: '50%', top: size * 0.47, width: '150%', height: size * 1.5, transform: 'translate(-50%, -50%)', background: 'radial-gradient(closest-side, rgba(18,8,24,0.55), rgba(18,8,24,0.28) 60%, rgba(18,8,24,0) 100%)', filter: 'blur(6px)'}} />
			<div style={{position: 'relative', display: 'grid'}}>
				<div style={{gridArea: '1 / 1', fontFamily: HEAD, fontSize: size, lineHeight: 0.95, whiteSpace: 'nowrap', letterSpacing: 1, color: INK, WebkitTextStroke: `${Math.round(size * 0.075)}px ${INK}`, filter: `drop-shadow(0 6px 0 ${INK})`}}>{value}</div>
				<div style={{gridArea: '1 / 1', fontFamily: HEAD, fontSize: size, lineHeight: 0.95, whiteSpace: 'nowrap', letterSpacing: 1, ...fill, filter: `drop-shadow(0 0 22px ${color === 'gold' ? 'rgba(255,140,30,0.35)' : color === 'purple' ? 'rgba(178,102,255,0.45)' : 'rgba(30,220,230,0.35)'})`}}>{value}</div>
			</div>
			{unit ? <div style={{fontFamily: MONT, fontWeight: 800, fontSize: Math.round(size * 0.28), color: subCol, textShadow: '0 3px 10px rgba(0,0,0,0.75), 0 0 3px rgba(0,0,0,0.9)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 6, whiteSpace: 'nowrap'}}>{unit}</div> : null}
			{sub ? <div style={{fontFamily: MONT, fontWeight: 700, fontSize: Math.round(size * 0.22), color: subCol, textShadow: '0 3px 10px rgba(0,0,0,0.75), 0 0 3px rgba(0,0,0,0.9)', letterSpacing: 0.5, marginTop: 6, whiteSpace: 'nowrap'}}>{sub}</div> : null}
		</div>
	);
};

/** a pre-rendered image sequence (e.g. a Blender shot in public/blender/<shot>/f_0001.jpg …) on the Short timeline */
export const ImgSeq: React.FC<{dir: string; t0: number; n: number; fps?: number; ext?: string}> = ({dir, t0, n, fps = 60, ext = 'jpg'}) => {
	const t = useT();
	const k = Math.max(0, Math.min(n - 1, Math.floor((t - t0) * fps + 1e-6)));
	return <Img src={staticFile(`${dir}/f_${String(k + 1).padStart(4, '0')}.${ext}`)} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover'}} />;
};
