import React from 'react';
import {C} from '../lib/theme';
import {blink as blinkOf, clamp, lerp, mix} from '../lib/time';

/** Country faces: two big white eyes with a dark contour, eyebrows as one line each. */
export type Mood = 'neutral' | 'confident' | 'scared' | 'shocked' | 'sly' | 'angry' | 'happy' | 'tired' | 'sad' | 'asleep' | 'confused' | 'smug' | 'defeated' | 'alert';
export type Mouth = 'none' | 'line' | 'frown' | 'smile' | 'o';

export type M = {
	/** eyelid openness: 1 normal, >1 wide, <0.15 closed */
	open: number;
	/** −1 raised … 1 lowered */
	browY: number;
	/** −1 inner ends down (angry) … 1 inner ends up (sad/scared) */
	browTilt: number;
	/** pupil size factor */
	pupil: number;
	lookX: number;
	lookY: number;
	/** when closed: 1 = ∩ happy arcs, −1 = ∪ sleepy arcs */
	arc: number;
	/** extra raise of the right brow (confused) */
	asym: number;
};

export const MOODS: Record<Mood, M> = {
	neutral: {open: 1, browY: 0, browTilt: 0, pupil: 1, lookX: 0, lookY: 0, arc: 0, asym: 0},
	confident: {open: 0.72, browY: 0.45, browTilt: -0.45, pupil: 0.95, lookX: 0.1, lookY: 0, arc: 0, asym: 0},
	alert: {open: 1.15, browY: -0.5, browTilt: -0.1, pupil: 0.7, lookX: 0, lookY: -0.2, arc: 0, asym: 0},
	scared: {open: 1.25, browY: -0.9, browTilt: 0.7, pupil: 0.5, lookX: 0, lookY: 0, arc: 0, asym: 0},
	shocked: {open: 1.4, browY: -1, browTilt: 0.1, pupil: 0.4, lookX: 0, lookY: 0, arc: 0, asym: 0},
	sly: {open: 0.42, browY: 0.15, browTilt: -0.55, pupil: 0.9, lookX: 0.45, lookY: 0.1, arc: 0, asym: 0},
	angry: {open: 0.78, browY: 0.6, browTilt: -0.95, pupil: 0.8, lookX: 0, lookY: 0, arc: 0, asym: 0},
	happy: {open: 0.06, browY: -0.4, browTilt: 0.1, pupil: 1, lookX: 0, lookY: 0, arc: 1, asym: 0},
	tired: {open: 0.38, browY: -0.1, browTilt: 0.55, pupil: 0.9, lookX: 0, lookY: 0.35, arc: 0, asym: 0},
	sad: {open: 0.7, browY: -0.3, browTilt: 0.85, pupil: 0.9, lookX: 0, lookY: 0.35, arc: 0, asym: 0},
	defeated: {open: 0.3, browY: -0.2, browTilt: 0.95, pupil: 0.8, lookX: 0, lookY: 0.5, arc: 0, asym: 0},
	asleep: {open: 0.06, browY: 0, browTilt: 0, pupil: 1, lookX: 0, lookY: 0, arc: -1, asym: 0},
	confused: {open: 1, browY: -0.4, browTilt: 0.25, pupil: 0.9, lookX: -0.3, lookY: -0.3, arc: 0, asym: 1},
	smug: {open: 0.5, browY: 0.2, browTilt: -0.3, pupil: 0.9, lookX: 0.2, lookY: 0, arc: 0, asym: 0},
};

const blendM = (a: M, b: M, p: number): M => ({
	open: lerp(a.open, b.open, p),
	browY: lerp(a.browY, b.browY, p),
	browTilt: lerp(a.browTilt, b.browTilt, p),
	pupil: lerp(a.pupil, b.pupil, p),
	lookX: lerp(a.lookX, b.lookX, p),
	lookY: lerp(a.lookY, b.lookY, p),
	arc: lerp(a.arc, b.arc, p),
	asym: lerp(a.asym, b.asym, p),
});

/** Mood at time t for time-sorted keys [[t, mood], …] with `fade` seconds of transition after each key. */
export const moodAt = (t: number, keys: [number, Mood][], fade = 0.3): M => {
	let cur: M = MOODS[keys[0][1]];
	for (let i = 0; i < keys.length; i++) {
		const [tk, m] = keys[i];
		if (t < tk) break;
		cur = i === 0 ? MOODS[m] : blendM(cur, MOODS[m], mix(0, 1, (t - tk) / fade));
	}
	return cur;
};

export type FaceProps = {
	x: number;
	y: number;
	/** eye radius in px */
	size?: number;
	mood?: Mood | M;
	t: number;
	seed?: number;
	/** colour of the eyelids (the territory's colour) */
	skin?: string;
	mouth?: Mouth;
	/** 0..1 — a sweat drop beside the right eye */
	sweat?: number;
	/** 0..1 — «!!» above the eyes */
	exclaim?: number;
	/** 0..1 — «?» above the eyes */
	question?: number;
	/** 0..1 — «♪» notes drifting up */
	notes?: number;
	opacity?: number;
	noBlink?: boolean;
};

export const faceSize = (zoom: number) => clamp(26 * Math.pow(zoom, 0.55) + 8, 20, 70);

export const Face: React.FC<FaceProps> = ({x, y, size = 40, mood = 'neutral', t, seed = 0, skin = C.neutral, mouth = 'none', sweat = 0, exclaim = 0, question = 0, notes = 0, opacity = 1, noBlink = false}) => {
	const m: M = typeof mood === 'string' ? MOODS[mood] : mood;
	const r = size;
	const bl = noBlink || m.open < 0.3 ? 1 : blinkOf(t, seed + 1);
	const open = clamp(m.open * bl, 0.05, 1.45);
	const closed = open < 0.15;
	const blinkOnly = closed && m.open >= 0.3;
	const sw = 0.13 * r;
	const eye = (side: -1 | 1) => {
		const ex = side * 1.15 * r;
		const ry = r * 1.05 * open;
		const px = ex + clamp(m.lookX, -1, 1) * 0.34 * r;
		const py = clamp(m.lookY, -1, 1) * 0.3 * r * Math.min(1, open);
		const pr = 0.4 * r * m.pupil;
		// eyebrow
		const base = -1.5 * r + m.browY * 0.3 * r + (side === 1 ? -m.asym * 0.35 * r : 0);
		const inner = base - m.browTilt * 0.42 * r;
		const outer = base + m.browTilt * 0.18 * r;
		const bx0 = side * 0.3 * r;
		const bx1 = side * 1.95 * r;
		return (
			<g key={side}>
				{closed ? (
					<path
						d={blinkOnly ? `M${ex - r},0 L${ex + r},0` : m.arc >= 0 ? `M${ex - r},${0.15 * r} Q${ex},${-0.9 * r} ${ex + r},${0.15 * r}` : `M${ex - r},${-0.2 * r} Q${ex},${0.75 * r} ${ex + r},${-0.2 * r}`}
						fill="none"
						stroke={C.ink}
						strokeWidth={sw * 1.15}
						strokeLinecap="round"
					/>
				) : (
					<g>
						<ellipse cx={ex} cy={0} rx={r} ry={ry} fill={C.white} stroke={C.ink} strokeWidth={sw} />
						<ellipse cx={px} cy={py} rx={pr} ry={pr * Math.min(1, open * 1.1)} fill={C.ink} />
						<circle cx={px - pr * 0.3} cy={py - pr * 0.3 * Math.min(1, open)} r={pr * 0.22} fill={C.white} />
						{open < 0.75 && <path d={`M${ex - r},${-ry} h${2 * r} v${ry * (1 - open / 0.75) * 0.9} h${-2 * r} z`} fill={skin} stroke={C.ink} strokeWidth={sw * 0.9} />}
					</g>
				)}
				<path d={`M${bx0},${inner} L${bx1},${outer}`} fill="none" stroke={C.ink} strokeWidth={sw * 1.25} strokeLinecap="round" />
			</g>
		);
	};
	const mouthY = 1.95 * r;
	return (
		<g transform={`translate(${x} ${y})`} opacity={opacity}>
			{eye(-1)}
			{eye(1)}
			{mouth === 'line' && <path d={`M${-0.7 * r},${mouthY} L${0.7 * r},${mouthY}`} stroke={C.ink} strokeWidth={sw} strokeLinecap="round" />}
			{mouth === 'frown' && <path d={`M${-0.7 * r},${mouthY + 0.2 * r} Q0,${mouthY - 0.5 * r} ${0.7 * r},${mouthY + 0.2 * r}`} fill="none" stroke={C.ink} strokeWidth={sw} strokeLinecap="round" />}
			{mouth === 'smile' && <path d={`M${-0.7 * r},${mouthY - 0.2 * r} Q0,${mouthY + 0.5 * r} ${0.7 * r},${mouthY - 0.2 * r}`} fill="none" stroke={C.ink} strokeWidth={sw} strokeLinecap="round" />}
			{mouth === 'o' && <circle cx={0} cy={mouthY} r={0.3 * r} fill={C.ink} />}
			{sweat > 0 && (
				<g transform={`translate(${2.5 * r} ${-1.1 * r + sweat * 0.9 * r})`} opacity={Math.min(1, sweat * 4) * (1 - Math.max(0, sweat - 0.85) / 0.15)}>
					<path d={`M0,${-0.55 * r} C${0.3 * r},${-0.1 * r} ${0.42 * r},${0.1 * r} ${0.42 * r},${0.3 * r} A${0.42 * r},${0.42 * r} 0 1 1 ${-0.42 * r},${0.3 * r} C${-0.42 * r},${0.1 * r} ${-0.3 * r},${-0.1 * r} 0,${-0.55 * r} Z`} fill="#CFE8F5" stroke={C.ink} strokeWidth={sw * 0.8} />
					<circle cx={-0.12 * r} cy={0.2 * r} r={0.09 * r} fill={C.white} />
				</g>
			)}
			{exclaim > 0 && (
				<text x={0} y={-2.6 * r} fontFamily="Montserrat, 'Arial Black', sans-serif" fontWeight={900} fontSize={3.4 * r * Math.min(1, exclaim)} fill={C.alarm} stroke={C.ink} strokeWidth={sw * 1.1} paintOrder="stroke" textAnchor="middle" transform={`rotate(${-8 + 6 * Math.sin(t * 20)})`}>
					!!
				</text>
			)}
			{question > 0 && (
				<text x={2.4 * r} y={-3.0 * r} fontFamily="Montserrat, 'Arial Black', sans-serif" fontWeight={900} fontSize={4.6 * r * Math.min(1, question)} fill={C.gold} stroke={C.ink} strokeWidth={sw * 1.3} paintOrder="stroke" textAnchor="middle" transform={`rotate(12 ${2.4 * r} ${-3.0 * r})`}>
					?
				</text>
			)}
			{notes > 0 &&
				[0, 1].map((i) => {
					const u = ((t * 0.6 + i * 0.5) % 1);
					return (
						<text key={i} x={2.2 * r + i * 0.9 * r + Math.sin(u * 6) * 0.3 * r} y={-1.2 * r - u * 2.2 * r} fontSize={1.5 * r} fill={C.ink} opacity={notes * (1 - u) * Math.min(1, u * 5)} fontFamily="Montserrat, Arial, sans-serif" fontWeight={700}>
							♪
						</text>
					);
				})}
		</g>
	);
};
