import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {W, WV, WVe} from './lib/time';
import {END} from './data/shots';
import {AtlasLayer, type AtlasWin} from './ui/Atlas';
import {Label, KeyFact, clamp01, easeInOut, lerp, pop, useT, GOLD, INK} from './ui/gfx';
import {Subtitles} from './ui/Subtitles';
import {ANTON, MONT} from './fonts';
import * as Sc from './scenes';
import {Badge} from './ui/chars';
import * as Fl from './flow';

// «The Pig War» v3 (owner 22.10 night): as dynamic as possible with striking transitions; maps only in the opening seconds;
// everything else drawn by us (src/ui/draw.tsx, src/ui/chars.tsx) — no AI frames (owner 23.10: the whole Short is ours).
// Same VO clock (data/words.json), subtitles, music + SFX, Atlas only in the ending, poll on the question.

type Tr = 'none' | 'zoomthru' | 'whipL' | 'whipR' | 'up' | 'circle' | 'diag' | 'punch' | 'fade';
type Beat = {k: string; t0: number; t1: number; tr: Tr; at?: [number, number]; subY: number; el: React.FC<Sc.SceneProps>};

const DUR: Record<Tr, number> = {none: 0, zoomthru: 0.5, whipL: 0.28, whipR: 0.28, up: 0.35, circle: 0.45, diag: 0.4, punch: 0.2, fade: 0.6};

/** «Not over a pig.» — the pig again, closer (the same drawn pig as the hook) */
const PigAgain: React.FC<Sc.SceneProps> = (p) => (
	<AbsoluteFill style={{transform: 'scale(1.3)', transformOrigin: '430px 1010px'}}>
		<Sc.PigPunch {...p} ringAt={W(68) - 0.05} />
	</AbsoluteFill>
);
const Won: React.FC<Sc.SceneProps> = (p) => <Sc.IslandClaim {...p} won />;

/** the shot: at the bang the frame fills with gun smoke and the next beat is cut in behind it (owner 23.10: never show the pig hit) */
const BANG = WV(19) + 0.02;                                 // «shot» on the voice clock
const SMOKE_CUT = BANG + 0.2;
/** full-screen powder-smoke wipe: puffs burst out of the muzzle and cover the frame by +0.2 s, then roll outwards and clear by +0.8 s */
const SmokeWipe: React.FC<{x: number; y: number}> = ({x, y}) => {
	const t = useT();
	const a = t - BANG;
	if (a < 0 || a > 0.85) return null;
	const grow = easeInOut(clamp01(a / 0.2));
	const clear = easeInOut(clamp01((a - 0.3) / 0.55));
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			{Array.from({length: 26}, (_, i) => {
				const ang = (i / 26) * Math.PI * 2 + i * 0.37;
				const d0 = 80 + (i % 5) * 120;
				const dist = lerp(0, d0 + 600, grow) + clear * 900;
				const cx = x + Math.cos(ang) * dist * 0.9, cy = y + Math.sin(ang) * dist * 1.3;
				const r = lerp(40, 380 + (i % 4) * 90, grow) * (1 - clear * 0.4);
				const o = 1 - clear;
				return (
					<g key={i} opacity={o}>
						<circle cx={cx} cy={cy} r={r + 8} fill={INK} opacity={0.85} />
						<circle cx={cx} cy={cy} r={r} fill={i % 2 ? '#f3f0f6' : '#e2dde8'} />
					</g>
				);
			})}
			<rect x={0} y={0} width={1080} height={1920} fill="#efeaf2" opacity={clamp01(grow * 1.4 - 0.2) * (1 - clear)} />
		</svg>
	);
};

const BEATS: Beat[] = [
	{k: 'map', t0: 0.0, t1: 2.98, tr: 'none', subY: 1450, el: Sc.MapHook},
	{k: 'pig', t0: 2.98, t1: 4.7, tr: 'zoomthru', at: Sc.HOOK_PT, subY: 1460, el: Sc.PigPunch},
	{k: 'farmer', t0: 4.7, t1: 7.07, tr: 'whipL', subY: 300, el: Sc.FarmerCatch},
	{k: 'shot', t0: 7.07, t1: SMOKE_CUT, tr: 'punch', subY: 300, el: Sc.ShotScene},
	{k: 'us', t0: SMOKE_CUT, t1: 10.61, tr: 'none', subY: 1450, el: Sc.UsCard},
	{k: 'vs', t0: 10.61, t1: 12.52, tr: 'whipL', subY: 1460, el: Sc.VsSplit},
	{k: 'coin', t0: 12.52, t1: 13.94, tr: 'circle', at: [540, 960], subY: 1450, el: Sc.CoinScene},
	{k: 'owner', t0: 13.94, t1: 15.81, tr: 'up', subY: 1460, el: Sc.OwnerScene},
	{k: 'claim', t0: 15.81, t1: 18.6, tr: 'punch', subY: 1450, el: Sc.IslandClaim},
	{k: 'troops', t0: 18.6, t1: 21.56, tr: 'whipL', subY: 1480, el: Sc.Troops},
	{k: 'ships', t0: 21.56, t1: 23.72, tr: 'whipL', subY: 1470, el: Sc.Warships},
	{k: 'governor', t0: 23.72, t1: 26.06, tr: 'diag', subY: 1470, el: Sc.Governor},
	{k: 'admiral', t0: 26.06, t1: 27.89, tr: 'whipR', subY: 1470, el: Sc.Admiral},
	{k: 'pig2', t0: 27.89, t1: 29.42, tr: 'circle', at: [540, 900], subY: 1460, el: PigAgain},
	{k: 'sentries', t0: 29.42, t1: 33.23, tr: 'whipL', subY: 300, el: Sc.Sentries},
	{k: 'party', t0: 33.23, t1: 34.5, tr: 'punch', subY: 1460, el: Sc.Party},
	{k: 'kaiser', t0: 34.5, t1: 35.97, tr: 'up', subY: 1470, el: Sc.Kaiser},
	{k: 'seal', t0: 35.97, t1: 36.74, tr: 'none', subY: 1470, el: Sc.SealScene},
	{k: 'won', t0: 36.74, t1: 38.54, tr: 'circle', at: [700, 1300], subY: 1450, el: Won},
	{k: 'angel', t0: 38.54, t1: END, tr: 'fade', subY: 1080, el: Sc.Angel},
];

/** «ShortFlow»: the same edit with the owner's Flow frames at the key moments (pig, farmer, shot, owner, pig again, sentries, angel) */
const FLOW_BEATS: Beat[] = BEATS.flatMap((b): Beat[] => {
	switch (b.k) {
		case 'pig': return [{...b, el: Fl.FlowPig}];
		case 'farmer': return [{...b, el: Fl.FlowFarmer, subY: 300}];
		case 'shot': return [{...b, el: Fl.FlowShot, subY: 300}];
		case 'owner': return [{...b, el: Fl.FlowOwner, subY: 1215}];
		case 'pig2': return [{...b, el: Fl.FlowPig2}];
		case 'sentries': return [{...b, t1: 31.36, el: Fl.FlowYoung}, {k: 'old', t0: 31.36, t1: b.t1, tr: 'fade', subY: 300, el: Fl.FlowOld}];
		case 'angel': return [{...b, el: Fl.FlowAngel, subY: 1110}];
		default: return [b];
	}
});

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

const Timeline: React.FC<{beats: Beat[]}> = ({beats: BEATS}) => {
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

const BIG = {x: 290, y: 1990, s: 0.7};
export const ATLAS: AtlasWin[] = [{t0: 38.54 + 0.3, t1: 43.15 + 0.6, ...BIG, tout: 0.5}];   // gone before the loop frame

const subYOf = (beats: Beat[]) => (t: number) => {
	const b = [...beats].reverse().find((x) => t >= x.t0);
	return b ? b.subY : 1500;
};
// the big numbers replace their phrase in the subtitles (never the same thing twice)
const keySpoken = (t: number) => (t >= WV(32) - 0.06 && t < WVe(33) + 0.15) || (t >= WV(37) - 0.06 && t < WVe(38) + 0.2) || (t >= WV(48) - 0.08 && t < WVe(50) + 0.15);
const LOOP_T = 43.15;

/** «For twelve years.» — a calm bar that fills 1860 → 1872 */
const YearsBar: React.FC<{t0: number; t1: number; y?: number}> = ({t0, t1, y = 330}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const o = clamp01((t - t0) / 0.25) * clamp01((t1 + 0.3 - t) / 0.3);
	const fill = easeInOut((t - t0 - 0.1) / (t1 - t0 - 0.5));
	const Wb = 640, x0 = 540 - Wb / 2;
	const year = Math.round(1860 + 12 * fill);
	return (
		<svg width={1080} height={220} style={{position: 'absolute', left: 0, top: y - 60, opacity: o, overflow: 'visible'}}>
			<rect x={x0} y={48} width={Wb} height={26} rx={13} fill="rgba(20,8,40,0.55)" stroke="#fff8ea" strokeWidth={4} />
			<rect x={x0 + 4} y={52} width={Math.max(0, (Wb - 8) * fill)} height={18} rx={9} fill={GOLD} />
			{Array.from({length: 13}, (_, i) => (
				<line key={i} x1={x0 + (Wb * i) / 12} y1={i % 12 === 0 ? 30 : 38} x2={x0 + (Wb * i) / 12} y2={44} stroke="#fff8ea" strokeWidth={4} opacity={fill * 12 >= i - 0.01 ? 1 : 0.35} />
			))}
			<text x={x0} y={112} fontFamily={MONT} fontWeight={800} fontSize={34} fill="#fff" textAnchor="middle" style={{paintOrder: 'stroke', stroke: INK, strokeWidth: 6}}>1860</text>
			<text x={x0 + Wb} y={112} fontFamily={MONT} fontWeight={800} fontSize={34} fill={year >= 1872 ? '#FFD54A' : '#fff'} textAnchor="middle" style={{paintOrder: 'stroke', stroke: INK, strokeWidth: 6}}>1872</text>
		</svg>
	);
};

/** «Team farmer, or team pig?» — two round portraits with a VS between; no words (the voice asks) */
const PollCard: React.FC<{t0: number; t1: number}> = ({t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1) return null;
	const k = pop(t, t0, 0.4);
	const o = clamp01((t1 - t) / 0.3);
	const side = (who: 'farmer' | 'pig', x: number, d: number) => {
		const ki = pop(t, t0 + d, 0.35);
		const bob = Math.sin((t - t0) * 3 + x) * 4;
		return <Badge who={who} x={x} y={150 + bob} d={240} s={ki} t={t} />;
	};
	return (
		<div style={{position: 'absolute', left: 540, top: 250, width: 760, height: 300, transform: `translate(-50%, -50%) scale(${k * 0.82})`, opacity: o}}>
			{side('farmer', 170, 0.08)}
			{side('pig', 590, 0.2)}
			<div style={{position: 'absolute', left: 380, top: 150, transform: 'translate(-50%, -50%)', fontFamily: ANTON, fontSize: 110, color: '#fffaf0', WebkitTextStroke: `10px ${INK}`, paintOrder: 'stroke fill', letterSpacing: 2}}>VS</div>
		</div>
	);
};

export const Short: React.FC<{noSubs?: boolean; flow?: boolean}> = ({noSubs, flow = false}) => {
	const t = useT();
	const beats = flow ? FLOW_BEATS : BEATS;
	return (
		<Fl.FlowCtx.Provider value={flow}>
		<AbsoluteFill style={{background: '#0b0420'}}>
			<Timeline beats={beats} />
			<SmokeWipe x={flow ? 560 : 625} y={flow ? 870 : 1150} />
			{/* loop: the last 0.7 s dissolve into the very first frame (the map) */}
			{t >= LOOP_T ? (
				<AbsoluteFill style={{opacity: easeInOut((t - LOOP_T) / (END - LOOP_T))}}>
					<Img src={staticFile('maps/map/f_0001.jpg')} style={{width: '100%', height: '100%'}} />
				</AbsoluteFill>
			) : null}
			{/* one calm label at a time — only what the voice does not say */}
			<Label text="Lyman Cutlar," accent="June 1859" t0={WV(11) + 0.2} t1={7.0} x={540} y={430} size={50} />
			<KeyFact value="$10" t0={WV(32) - 0.06} t1={13.84} x={540} y={420} size={190} />
			<KeyFact value="$100" t0={WV(37) - 0.06} t1={15.76} x={540} y={300} size={190} />
			<Label text="San Juan Island" t0={WV(43) - 0.1} t1={18.55} x={540} y={300} size={54} />
			<KeyFact value="400+" unit="soldiers" sub="and 14 cannons" t0={WV(48) - 0.08} t1={21.5} x={540} y={330} size={170} />
			<Label text="70 guns ·" accent="2,140 men" t0={WV(53) - 0.1} t1={23.67} x={540} y={300} size={54} />
			<Label text="Governor" accent="James Douglas" t0={23.72 + 0.35} t1={26.0} x={540} y={250} size={52} />
			<Label text="Rear Admiral" accent="Robert Baynes" t0={26.06 + 0.35} t1={27.84} x={540} y={250} size={52} />
			<YearsBar t0={WV(74) - 0.3} t1={33.18} y={470} />
			<Label text="Kaiser" accent="Wilhelm I" t0={34.5 + 0.35} t1={35.92} x={540} y={250} size={56} />
			<Label text="San Juan Island →" accent="USA, 1872" t0={WV(88) - 0.1} t1={38.5} x={540} y={300} size={50} />
			<PollCard t0={WV(95) - 0.12} t1={LOOP_T + 0.45} />
			<AtlasLayer wins={ATLAS} />
			{noSubs ? null : <Subtitles y={subYOf(beats)} hidden={keySpoken} />}
		</AbsoluteFill>
		</Fl.FlowCtx.Provider>
	);
};
