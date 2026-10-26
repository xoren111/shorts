import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {DURATION, LOOP_T, VO_END, W, We} from './lib/time';
import {clamp01, easeInOut, lerp, pop, useT} from './ui/gfx';
import {Subtitles} from './ui/Subtitles';
import {Grain} from './ui/vox';
import * as Sc from './scenes';

// «He sold everything to meet her» (Atlas Ape #6, 24.10). Owner: various design / edit elements, Flow + Gemini where needed,
// free Commons photos, our own graphics, smooth transitions; the twist (AI) only at the radio; no mother. Clock:
// data/words.json (vo_constantino_C2_final.wav). Transition engine = Pig War v3 / 222–0. Round 2 (owner 24.10): real memes —
// Confused Travolta, Stonks, CJ «here we go again» (owner accepted the Content ID risk); kinetic quote; faster followers beat.
// Round 3 (24.10): follower toasts → the crowd shot, Stonks over the shop frame with a money rain, straight text; round 4: white +
// gold text again, yellow + purple kept only in the followers beat; Meme Man re-cut (full face), gold radio waves instead of
// white bars; round 6: from «he said» ONE map shot (heart pin on Belo Horizonte, the bus sets off again), CJ a bit slower (1.08×).

type Tr = 'none' | 'zoomthru' | 'whipL' | 'whipR' | 'up' | 'circle' | 'diag' | 'punch' | 'fade';
type Beat = {k: string; t0: number; t1: number; tr: Tr; at?: [number, number]; subY: number; el: React.FC<Sc.SceneProps>};

const DUR: Record<Tr, number> = {none: 0, zoomthru: 0.45, whipL: 0.28, whipR: 0.28, up: 0.35, circle: 0.42, diag: 0.38, punch: 0.16, fade: 0.5};

/** sentence starts sit in the 0.15 s pauses, each cut just before the first word */
const BEATS: Beat[] = [
	{k: 'sold', t0: 0.0, t1: W(6) - 0.05, tr: 'none', subY: 1450, el: Sc.Sold},
	{k: 'feed', t0: W(6) - 0.05, t1: W(28) - 0.06, tr: 'zoomthru', at: [462, 937], subY: 1330, el: Sc.Feed},   // above her name + Follow
	{k: 'followers', t0: W(28) - 0.06, t1: W(34) - 0.06, tr: 'whipL', subY: 560, el: Sc.Followers},
	{k: 'went', t0: W(34) - 0.06, t1: W(37) - 0.06, tr: 'punch', subY: 1480, el: Sc.Went},
	{k: 'route', t0: W(37) - 0.06, t1: W(43) - 0.05, tr: 'whipL', subY: 1520, el: Sc.Route},
	{k: 'strangers', t0: W(43) - 0.05, t1: W(49) - 0.06, tr: 'zoomthru', at: [593, 1101], subY: 1450, el: Sc.Strangers},
	{k: 'nobody', t0: W(49) - 0.06, t1: W(54) - 0.06, tr: 'whipL', subY: 1560, el: Sc.Nobody},
	{k: 'radio', t0: W(54) - 0.06, t1: W(68) - 0.04, tr: 'up', subY: 1460, el: Sc.Radio},
	{k: 'reveal', t0: W(68) - 0.04, t1: W(77) - 0.06, tr: 'punch', subY: 1480, el: Sc.Reveal},
	{k: 'creator', t0: W(77) - 0.06, t1: W(87) - 0.06, tr: 'whipL', subY: 1440, el: Sc.Creator},
	{k: 'end', t0: W(87) - 0.06, t1: W(91) - 0.06, tr: 'circle', at: [540, 700], subY: 1450, el: Sc.End},
	{k: 'again', t0: W(91) - 0.06, t1: VO_END, tr: 'fade', subY: 1570, el: Sc.Again},   // one calm map shot (owner round 6)
	{k: 'cj', t0: VO_END, t1: DURATION, tr: 'punch', subY: 1450, el: Sc.CJ},
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

/** Atlas at the end only (owner rule): Gemini pose card from the owner's reference sheets — thumbs up with a phone */
export const ATLAS_IN = W(97) - 0.1;
const AtlasEnd: React.FC = () => {
	const t = useT();
	if (t < ATLAS_IN || t > VO_END) return null;
	const kin = pop(t, ATLAS_IN, 0.4);
	const out = clamp01((VO_END - t) / 0.15);
	const bob = Math.sin((t - ATLAS_IN) * 5) * 6;
	const H = 470, aspect = 748 / 1155;
	return (
		<div style={{position: 'absolute', left: 175, top: 720 + bob, width: H * aspect, height: H, opacity: out,
			transform: `translate(-50%, -100%) translateY(${(1 - kin) * 520}px) rotate(${(1 - kin) * -10}deg)`, transformOrigin: '50% 100%',
			filter: 'drop-shadow(0 0 10px rgba(255,170,60,0.5)) drop-shadow(0 18px 30px rgba(10,0,30,0.6))'}}>
			<Img src={staticFile('atlas/atlas_thumbs_phone.png')} style={{width: '100%', height: '100%'}} />
		</div>
	);
};

const subY = (t: number) => {
	const b = [...BEATS].reverse().find((x) => t >= x.t0);
	return b ? b.subY : 1450;
};
/** a phrase shown big (counter, MADE BY AI) is not also in the subtitles (owner: never the same thing twice) */
const HIDE: [number, number][] = [[28, 30], [72, 76]];   // «people followed her» shows over the crowd shot
const hidden = (t: number) => HIDE.some(([a, b]) => t >= W(a) - 0.06 && t < We(b) + 0.15);

export const Short: React.FC<{noSubs?: boolean}> = ({noSubs}) => {
	const t = useT();
	const loop = easeInOut((t - LOOP_T) / (DURATION - LOOP_T));
	return (
		<AbsoluteFill style={{background: '#08060c'}}>
			<Timeline />
			<AtlasEnd />
			{noSubs ? null : <Subtitles y={subY} hidden={hidden} />}
			{/* loop: the last 0.55 s dissolve into the very first frame */}
			{t >= LOOP_T ? (
				<AbsoluteFill style={{opacity: loop}}>
					<Sc.FirstFrame />
				</AbsoluteFill>
			) : null}
			<Grain opacity={0.07} />
		</AbsoluteFill>
	);
};
