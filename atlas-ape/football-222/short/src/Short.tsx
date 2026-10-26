import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {DURATION, VO_END, W, We} from './lib/time';
import {clamp01, easeInOut, lerp, pop, useT} from './ui/gfx';
import {Subtitles} from './ui/Subtitles';
import {Grain} from './ui/vox';
import * as Sc from './scenes';

// «222–0» (Atlas Ape #5, 23.10). Owner: semi-real / semi-cartoon, as many viewers as possible, smooth transitions and effects,
// and a MIX of sources — not a slideshow of AI pictures: Flow key shots (6), the real 1916 archive (scoreboard, the game,
// the baseball team, Grantland Rice, Heisman) in Vox paper prints, and our own drawn graphics. Atlas (Gemini pose cards) only
// at the end. Clock: data/words.json (vo_constantino_v4_final.wav). Transition engine = Pig War v3.

type Tr = 'none' | 'zoomthru' | 'whipL' | 'whipR' | 'up' | 'circle' | 'diag' | 'punch' | 'fade';
type Beat = {k: string; t0: number; t1: number; tr: Tr; at?: [number, number]; subY: number; el: React.FC<Sc.SceneProps>};

const DUR: Record<Tr, number> = {none: 0, zoomthru: 0.45, whipL: 0.28, whipR: 0.28, up: 0.35, circle: 0.42, diag: 0.38, punch: 0.16, fade: 0.5};

/** sentence starts sit in the 0.15 s pauses, each cut just before the first word */
const BEATS: Beat[] = [
	{k: 'hook', t0: 0.0, t1: 1.2, tr: 'none', subY: 1430, el: Sc.Hook},
	{k: 'score', t0: 1.2, t1: W(9) - 0.06, tr: 'punch', subY: 1500, el: Sc.RealScoreboard},
	{k: 'bench', t0: W(9) - 0.06, t1: W(16) - 0.09, tr: 'whipL', subY: 1480, el: Sc.Bench},
	{k: 'contract', t0: W(16) - 0.09, t1: W(24) - 0.08, tr: 'up', subY: 1460, el: Sc.Contract},
	{k: 'bribe', t0: W(24) - 0.08, t1: W(36) - 0.07, tr: 'diag', subY: 1440, el: Sc.Bribe},
	{k: 'revenge', t0: W(36) - 0.07, t1: W(38) - 0.06, tr: 'zoomthru', at: [540, 470], subY: 1120, el: Sc.Revenge},
	{k: 'baseball', t0: W(38) - 0.06, t1: W(46) - 0.08, tr: 'whipR', subY: 1250, el: Sc.Baseball},
	{k: 'recruits', t0: W(46) - 0.08, t1: W(54) - 0.04, tr: 'circle', at: [540, 900], subY: 1450, el: Sc.Recruits},
	{k: 'firstdown', t0: W(54) - 0.04, t1: W(61) - 0.08, tr: 'whipL', subY: 1450, el: Sc.FirstDown},
	{k: 'reporter', t0: W(61) - 0.08, t1: W(71) - 0.11, tr: 'up', subY: 1470, el: Sc.Reporter},
	{k: 'final', t0: W(71) - 0.11, t1: W(78) - 0.07, tr: 'punch', subY: 1450, el: Sc.Final},
	{k: 'reveal', t0: W(78) - 0.07, t1: W(82) - 0.07, tr: 'circle', at: [540, 520], subY: 1450, el: Sc.Reveal},
	{k: 'trophy', t0: W(82) - 0.07, t1: DURATION, tr: 'fade', subY: 290, el: Sc.Trophy},
];

/** entrance style of the incoming beat (p = 0→1 over its transition) */
const enter = (tr: Tr, p: number, at?: [number, number]): React.CSSProperties => {
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
		default: return {};
	}
};
/** exit style of the outgoing beat while the next one enters with `tr` */
const exit = (tr: Tr, p: number, at?: [number, number]): React.CSSProperties => {
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
		default: return {};
	}
};

const Timeline: React.FC = () => {
	const t = useT();
	return (
		<>
			{BEATS.map((b, i) => {
				const next = BEATS[i + 1];
				const dOut = next ? DUR[next.tr] : 0;
				if (t < b.t0 || t >= b.t1 + dOut) return null;
				const pin = DUR[b.tr] ? clamp01((t - b.t0) / DUR[b.tr]) : 1;
				const pout = next && dOut ? clamp01((t - next.t0) / dOut) : 0;
				const st = {...(pin < 1 ? enter(b.tr, pin, b.at) : {}), ...(pout > 0 && next ? exit(next.tr, pout, next.at) : {})};
				const El = b.el;
				return (
					<AbsoluteFill key={b.k} style={{...st, overflow: 'hidden'}}>
						<El t0={b.t0} t1={b.t1} />
					</AbsoluteFill>
				);
			})}
		</>
	);
};

/** Atlas at the end only (owner rule): Gemini pose cards made from the owner's reference sheets (tools/cutout_cards.py) —
 * shocked on «Heisman Trophy», then a slow clap (three squashes, one per clap SFX) */
export const ATLAS_IN = W(83) - 0.06;
export const CLAPS = [W(86) - 0.08, W(86) + 0.3, W(87) + 0.28];
const AtlasEnd: React.FC = () => {
	const t = useT();
	if (t < ATLAS_IN || t > VO_END + 0.4) return null;
	const kin = pop(t, ATLAS_IN, 0.4);
	const out = clamp01((VO_END + 0.4 - t) / 0.35);
	const clap = t >= CLAPS[0] - 0.04;
	const sq = CLAPS.reduce((m, c) => {
		const a = t - c;
		return a >= 0 && a < 0.2 ? Math.max(m, Math.sin((Math.PI * a) / 0.2)) : m;
	}, 0);
	const swap = clap ? pop(t, CLAPS[0] - 0.04, 0.25) : 1;
	const jit = clap ? 0 : Math.sin(t * 60) * 3;
	const H = 600;
	const src = clap ? 'atlas/atlas_clap.png' : 'atlas/atlas_shock.png';
	const aspect = clap ? 748 / 1155 : 788 / 1104;
	return (
		<div style={{position: 'absolute', left: 250 + jit, top: 1575, width: H * aspect, height: H, opacity: out,
			transform: `translate(-50%, -100%) translateY(${(1 - kin) * 520}px) scale(${lerp(0.92, 1, swap)}) scaleY(${1 - 0.05 * sq}) scaleX(${1 + 0.035 * sq})`, transformOrigin: '50% 100%',
			filter: 'drop-shadow(0 0 10px rgba(255,170,60,0.5)) drop-shadow(0 18px 30px rgba(10,0,30,0.6))'}}>
			<Img src={staticFile(src)} style={{width: '100%', height: '100%'}} />
		</div>
	);
};

const subY = (t: number) => {
	const b = [...BEATS].reverse().find((x) => t >= x.t0);
	return b ? b.subY : 1450;
};
/** a phrase shown as a big number / word is not also in the subtitles (owner: never the same thing twice) */
const HIDE: [number, number][] = [[4, 8], [22, 23], [30, 32], [37, 37], [43, 45], [49, 53], [69, 70], [73, 77], [80, 81]];
const hidden = (t: number) => HIDE.some(([a, b]) => t >= W(a) - 0.06 && t < We(b) + 0.15);

export const Short: React.FC<{noSubs?: boolean}> = ({noSubs}) => {
	const t = useT();
	const loop = easeInOut((t - VO_END) / (DURATION - VO_END));
	return (
		<AbsoluteFill style={{background: '#0b0604'}}>
			<Timeline />
			<AtlasEnd />
			{noSubs ? null : <Subtitles y={subY} hidden={hidden} />}
			{/* loop: the last 0.55 s dissolve into the very first frame */}
			{t >= VO_END ? (
				<AbsoluteFill style={{opacity: loop}}>
					<AbsoluteFill style={{overflow: 'hidden'}}>
						<Img src={staticFile('flow/A1_runner.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', transformOrigin: '42% 32%', transform: 'scale(1.03)', filter: 'saturate(1.15) contrast(1.08)'}} />
					</AbsoluteFill>
				</AbsoluteFill>
			) : null}
			<Grain opacity={0.1} />
		</AbsoluteFill>
	);
};
