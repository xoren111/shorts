import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, easeInOut, lerp, useT} from '../ui/gfx';
import type {BeatDef, Tr} from '../data/beats';
import {JAGGED_DUR, JaggedRim, jaggedEnter, jaggedExit} from './jagged';

// Transition engine of the channel (Pig War v3 → 222–0 → AI farm girl), extracted unchanged so every new Short shares it.
// A beat enters with its own `tr`; the outgoing beat gets the paired exit automatically. Durations (s) — standard 4.3.
// 'jagged' (engine/jagged.tsx): torn star from `at`, or a torn front from the frame edge `at` sits on; L2+ only, ≤ 2 per Short,
// never into the final beat (check.mjs).
export const DUR: Record<Tr, number> = {none: 0, zoomthru: 0.45, whipL: 0.28, whipR: 0.28, up: 0.35, circle: 0.42, diag: 0.38, punch: 0.16, fade: 0.5, jagged: JAGGED_DUR};

export type SceneProps = {t0: number; t1: number};

/** entrance style of the incoming beat (p = 0→1 over its transition) */
export const enter = (tr: Tr, p: number, at?: [number, number]): React.CSSProperties => {
	const e = easeInOut(p);
	switch (tr) {
		case 'whipL': return {transform: `translateX(${(1 - e) * 1080}px)`, filter: `blur(${(1 - e) * 26}px)`};
		case 'whipR': return {transform: `translateX(${-(1 - e) * 1080}px)`, filter: `blur(${(1 - e) * 26}px)`};
		case 'up': return {transform: `translateY(${(1 - e) * 1920}px)`};
		case 'circle': case 'zoomthru': {
			const [x, y] = at ?? [540, 960];
			return {clipPath: `circle(${e * 2300}px at ${x}px ${y}px)`, transform: tr === 'zoomthru' ? `scale(${lerp(1.35, 1, e)})` : undefined, transformOrigin: `${x}px ${y}px`};
		}
		case 'diag': {
			const x = lerp(-900, 1080, e);
			return {clipPath: `polygon(0px 0px, ${x + 900}px 0px, ${x}px 1920px, 0px 1920px)`};
		}
		case 'punch': return {transform: `scale(${lerp(1.3, 1, e)})`, opacity: clamp01(p * 2.5)};
		case 'fade': return {opacity: e};
		case 'jagged': return jaggedEnter(p, at);   // raw p: jagged.tsx eases itself
		default: return {};
	}
};

/** exit style of the outgoing beat while the next one enters with `tr` */
export const exit = (tr: Tr, p: number, at?: [number, number]): React.CSSProperties => {
	const e = easeInOut(p);
	switch (tr) {
		case 'whipL': return {transform: `translateX(${-e * 1080}px)`, filter: `blur(${e * 26}px)`};
		case 'whipR': return {transform: `translateX(${e * 1080}px)`, filter: `blur(${e * 26}px)`};
		case 'up': return {transform: `translateY(${-e * 700}px)`, filter: `brightness(${1 - e * 0.5})`};
		case 'zoomthru': {
			const [x, y] = at ?? [540, 960];
			return {transform: `scale(${1 + e * 5})`, transformOrigin: `${x}px ${y}px`, filter: `blur(${e * 10}px)`};
		}
		case 'circle': return {transform: `scale(${1 + e * 0.12})`};
		case 'punch': return {transform: `scale(${1 + e * 0.25})`};
		case 'jagged': return jaggedExit(p, at);
		default: return {};
	}
};

/** renders the beats that are on screen at t, with their entrance / exit styles */
export const Timeline: React.FC<{beats: BeatDef[]; scenes: Record<string, React.FC<SceneProps>>}> = ({beats, scenes}) => {
	const t = useT();
	return (
		<>
			{beats.map((b, i) => {
				const next = beats[i + 1];
				const dOut = next ? DUR[next.tr] : 0;
				if (t < b.t0 || t >= b.t1 + dOut) return null;
				const pin = DUR[b.tr] ? clamp01((t - b.t0) / DUR[b.tr]) : 1;
				const pout = next && dOut ? clamp01((t - next.t0) / dOut) : 0;
				const st = {...(pin < 1 ? enter(b.tr, pin, b.at) : {}), ...(pout > 0 && next ? exit(next.tr, pout, next.at) : {})};
				const El = scenes[b.scene];
				return (
					<React.Fragment key={b.k}>
						<AbsoluteFill style={{...st, overflow: 'hidden'}}>
							<El t0={b.t0} t1={b.t1} />
						</AbsoluteFill>
						{/* paper / ink edge of the torn cut, over both beats (under the subtitles: Short.tsx draws them later) */}
						{b.tr === 'jagged' && pin < 1 ? <JaggedRim p={pin} at={b.at} /> : null}
					</React.Fragment>
				);
			})}
		</>
	);
};

/** subtitle centre y of the beat on screen at t */
export const subYAt = (beats: BeatDef[], t: number, fallback = 1300) => {
	const b = [...beats].reverse().find((x) => t >= x.t0);
	return b ? b.subY : fallback;
};
