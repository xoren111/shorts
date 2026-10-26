import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {WV as Wd} from './lib/time';                     // the voice clock: every in-sentence cue lands on the heard word
import {ImgSeq, clamp01, easeInOut, easeOut, lerp, INK, useT} from './ui/gfx';
import {Bg, Bust, Cannon, Coin, Confetti, Document, Flag, Island, Mug, Burst, NAVY, RED, Sea, Seal, Ship, Soldier, popK} from './ui/draw';
import {Badge, Birds, Cabin, Cloud, Farmer, Fir, Flash, Owner, Patch, Pig, Sentry, Smoke} from './ui/chars';

// v3 scenes, one per beat (SHOTS.md times). Each gets its window [t0, t1] and reads absolute time; all motion is timed to
// VO words (W(i) = start of word i). Maps only in the hook; everything else is drawn (src/ui/draw.tsx, src/ui/chars.tsx).

export type SceneProps = {t0: number; t1: number};

/** red marker ring drawn around a point (hand-drawn wobble) */
export const Marker: React.FC<{x: number; y: number; rx: number; ry: number; t: number; t0: number; color?: string}> = ({x, y, rx, ry, t, t0, color = '#ff2b3a'}) => {
	const a = t - t0;
	if (a < 0) return null;
	const k = easeOut(a / 0.35);
	let d = '';
	for (let i = 0; i <= 60; i++) {
		const u = (i / 60) * Math.PI * 2 * 1.12 - 0.4;
		const w = 1 + 0.04 * Math.sin(u * 3);
		d += `${i ? 'L' : 'M'}${x + Math.cos(u) * rx * w},${y + Math.sin(u) * ry * w} `;
	}
	const len = Math.PI * (rx + ry) * 1.15;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			<path d={d} fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} opacity={0.5} />
			<path d={d} fill="none" stroke={color} strokeWidth={13} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
		</svg>
	);
};

// ------------------------------------------------------------------------------------------------ HOOK: the map (maps only here)
export const MapHook: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	// no push that would crop the shores: only a 3 % breath, so both flags stay in frame
	const s = lerp(1.0, 1.03, easeInOut((t - t0) / (t1 + 0.5 - t0)));
	const us = easeOut((t - (Wd(0) - 0.05)) / 0.35);
	const uk = easeOut((t - (Wd(2) - 0.1)) / 0.35);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#0b2a55'}}>
			<div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: '540px 760px'}}>
				<ImgSeq dir="maps/map" t0={t0} n={194} fps={62} />
				{/* whose land is whose: British = Vancouver Island (left) + the mainland north of the 49th-parallel line; US = the mainland
				    east of the islands + the Olympic Peninsula (bottom); the islands in between stay neutral (that is the dispute) */}
				<AbsoluteFill style={{opacity: uk * 0.34, background: 'radial-gradient(ellipse 320px 640px at -40px 1170px, #e0303f 0%, #e0303f 62%, rgba(224,48,63,0) 100%)'}} />
				<AbsoluteFill style={{opacity: uk * 0.3, background: '#e0303f', clipPath: 'polygon(0px 0px, 1080px 0px, 1080px 452px, 89px 600px, 0px 600px)'}} />
				<AbsoluteFill style={{opacity: us * 0.45, background: 'radial-gradient(ellipse 330px 470px at 1130px 800px, #2c4fb0 0%, #2c4fb0 62%, rgba(44,79,176,0) 100%), radial-gradient(ellipse 560px 260px at 560px 2010px, #2c4fb0 0%, #2c4fb0 60%, rgba(44,79,176,0) 100%)'}} />
			</div>
			{/* what the lines are: first the land border (white dashes), then the two claimed water borders (owner 23.10) */}
			<LinePill x={640} y={398} k={clamp01((t - 0.3) / 0.25) * clamp01((1.7 - t) / 0.2)} color="#ffffff" text="Border, 1846" dark />
			<LinePill x={250} y={1000} k={clamp01((t - 1.6) / 0.25)} color="#2c4fb0" text="US claim" />
			<LinePill x={835} y={1090} k={clamp01((t - 1.75) / 0.25)} color="#e0303f" text="UK claim" />
			<TerritoryTag x={800} y={800} k={us} color="#2c4fb0" big="USA" small="Washington Territory" flag="flags/us_1859.png" />
			<TerritoryTag x={250} y={1330} k={uk} color="#e0303f" big="BRITISH" small="Vancouver Island" flag="flags/union_jack.png" />
		</AbsoluteFill>
	);
};
/** a small pill naming a line on the hook map */
const LinePill: React.FC<{x: number; y: number; k: number; color: string; text: string; dark?: boolean}> = ({x, y, k, color, text, dark}) =>
	k <= 0 ? null : (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${lerp(0.7, 1, easeOut(k))})`, opacity: k, background: color, color: dark ? INK : '#fff', border: `5px solid ${INK}`, borderRadius: 40, padding: '4px 20px 6px', fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 32, whiteSpace: 'nowrap', boxShadow: '0 6px 0 rgba(0,0,0,0.3)'}}>{text}</div>
	);

/** a territory pin: coloured pill with the flag (true proportions), a big word and a small place name */
const TerritoryTag: React.FC<{x: number; y: number; k: number; color: string; big: string; small: string; flag: string}> = ({x, y, k, color, big, small, flag}) => (
	<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${popK(k, 0, 1)})`, pointerEvents: 'none'}}>
		<div style={{display: 'flex', alignItems: 'center', gap: 16, background: color, border: `6px solid ${INK}`, borderRadius: 22, padding: '10px 24px 12px 16px', boxShadow: '0 10px 0 rgba(0,0,0,0.3)'}}>
			<Img src={staticFile(flag)} style={{width: 96, height: flag.includes('us_1859') ? 96 * 0.527 : 96 * 0.6, border: `4px solid ${INK}`, borderRadius: 4}} />
			<div style={{textAlign: 'left'}}>
				<div style={{fontFamily: "'Anton', sans-serif", fontSize: 60, color: '#fff', letterSpacing: 2, lineHeight: 1.0}}>{big}</div>
				<div style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 24, color: '#fff', opacity: 0.92, whiteSpace: 'nowrap'}}>{small}</div>
			</div>
		</div>
	</div>
);
/** the San Juan point of the hook map at time t (for the zoom-through into the pig) */
export const HOOK_PT: [number, number] = [455, 1060];

// ------------------------------------------------------------------------------------------------ the pig (punchline)
/** sky over the island farm: gradient + a few drifting clouds */
const FarmSky: React.FC<{t: number; top?: string; bot?: string}> = ({t, top = '#7cc7ff', bot = '#d9f1ff'}) => (
	<AbsoluteFill style={{background: `linear-gradient(180deg, ${top} 0%, ${bot} 60%)`}}>
		<Cloud x={((200 + t * 20) % 1300) - 110} y={260} w={300} t={t} />
		<Cloud x={((760 + t * 14) % 1300) - 110} y={420} w={220} t={t + 2} />
	</AbsoluteFill>
);

export const PigPunch: React.FC<SceneProps & {ringAt?: number}> = ({t0, ringAt}) => {
	const t = useT();
	const k = popK(t, t0 + 0.05, 0.4);
	return (
		<AbsoluteFill>
			<FarmSky t={t} />
			<Fir x={120} y={1120} s={1.3} t={t} />
			<Fir x={960} y={1100} s={1.4} t={t} />
			<Patch y={1080} t={t} />
			<div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(0.8, 1, k)})`, transformOrigin: '540px 1500px'}}>
				<Pig x={560} y={1540} s={1.25} t={t} mood="chew" potato={false} look={0.3} />
			</div>
			<Marker x={350} y={1215} rx={290} ry={255} t={t} t0={ringAt ?? Wd(9) - 0.05} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ the farmer catches it / shoots it
export const FarmerCatch: React.FC<SceneProps> = () => {
	const t = useT();
	const door = easeOut((t - (Wd(10) - 0.05)) / 0.15);
	const out = easeOut((t - (Wd(11) - 0.1)) / 0.45);
	const caught = t > Wd(12) - 0.05;
	return (
		<AbsoluteFill>
			<FarmSky t={t} />
			<Fir x={110} y={1080} s={1.2} t={t} />
			<Fir x={330} y={1020} s={1.0} t={t} />
			<Fir x={1010} y={1060} s={1.3} t={t} />
			<Cabin x={700} y={1110} s={1.15} door={door} />
			<Patch y={1080} t={t} />
			<Farmer x={lerp(700, 640, out)} y={lerp(1110, 1240, out)} s={lerp(0.55, 0.95, out)} t={t} pose={out > 0.3 ? 'point' : 'stand'} shout={out > 0.3 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 8)) : 0} flip />
			<Pig x={330} y={1620} s={0.95} t={t} mood={caught ? 'shock' : 'chew'} look={caught ? 1 : 0.2} flip />
		</AbsoluteFill>
	);
};

export const ShotScene: React.FC<SceneProps> = () => {
	const t = useT();
	const bang = Wd(19) + 0.02;
	const a = t - bang;
	const shake = a > 0 ? Math.sin(a * 60) * 12 * Math.exp(-a * 7) : 0;
	return (
		<AbsoluteFill style={{transform: `translate(${shake}px, ${shake * 0.5}px)`}}>
			<FarmSky t={t} />
			<Fir x={540} y={1060} s={1.4} t={t} />
			<Fir x={880} y={1040} s={1.2} t={t} />
			<Patch y={1040} t={t} />
			<Pig x={840} y={1500} s={0.85} t={t} mood={a > -0.3 ? 'shock' : 'chew'} potato={false} look={-1} />
			<Farmer x={290} y={1610} s={1.0} t={t} pose="aim" recoil={a > 0 ? Math.exp(-a * 8) : 0} flip />
			<Flash x={625} y={1150} a={a} />
			<Smoke x={630} y={1190} a={a} dir={1} size={1.5} />
			<Smoke x={760} y={1330} a={a - 0.08} dir={1} size={1.25} />
			<Birds x={600} y={760} a={a - 0.05} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ who is who
export const UsCard: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const k = popK(t, t0 + 0.35, 0.45);                          // pops as the smoke of the shot clears
	const big = easeOut((t - (Wd(25) - 0.25)) / 0.3);
	return (
		<AbsoluteFill>
			<Bg kind="us" t={t} cy={900} />
			<Flag src="flags/us_1859.png" t={t} x={170} y={lerp(330, 300, big)} w={lerp(640, 740, big)} pole={160} rise={easeOut((t - t0 - 0.25) / 0.4)} />
			<Badge who="farmer" x={540} y={1080} d={560} s={k} rot={-3} t={t} />
		</AbsoluteFill>
	);
};

export const VsSplit: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const slide = easeInOut((t - t0) / 0.45);                    // the red half slides in from the right
	const pig = popK(t, Wd(27) - 0.15, 0.4);
	const uk = easeOut((t - (Wd(29) - 0.3)) / 0.35);
	const vs = popK(t, t0 + 0.35, 0.35);
	// strict mirror: left half = US (flag over the farmer), right half = UK (flag over the pig); same sizes, same heights,
	// centres at x 270 / 810 (badges kept inside x ≤ 970, above the Shorts button column)
	const FY = 450, BY = 820, FW = 320, D = 360;
	return (
		<AbsoluteFill>
			<Bg kind="us" t={t} cx={270} cy={800} />
			<div style={{position: 'absolute', inset: 0, clipPath: `polygon(${lerp(1080, 540, slide)}px 0px, 1080px 0px, 1080px 1920px, ${lerp(1080, 540, slide)}px 1920px)`}}>
				<Bg kind="uk" t={t} cx={810} cy={800} />
			</div>
			<div style={{position: 'absolute', left: 534, top: 0, width: 12, height: 1920, background: INK, transform: `translateX(${lerp(546, 0, slide)}px)`}} />
			<Flag src="flags/us_1859.png" t={t} x={270 - FW / 2} y={FY - (FW * 674) / 1280 / 2} w={FW} />
			<Badge who="farmer" x={270} y={BY} d={D} rot={-3} t={t} />
			<Flag src="flags/union_jack.png" t={t + 1} x={810 - FW / 2} y={FY - (FW * 0.6) / 2} w={FW} rise={uk} />
			<Badge who="pig" x={810} y={BY} d={D} rot={3} s={pig} t={t} />
			<div style={{position: 'absolute', left: 540, top: BY, transform: `translate(-50%, -50%) scale(${vs})`, fontFamily: "'Anton', sans-serif", fontSize: 170, color: '#fff6d8', WebkitTextStroke: `14px ${INK}`, paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(0,0,0,0.35)'}}>VS</div>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ the price
export const CoinScene: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const fall = clamp01((t - t0 - 0.05) / 0.55);
	const y = lerp(-300, 1080, easeOut(fall));
	const bounce = fall >= 1 ? Math.abs(Math.sin((t - t0 - 0.6) * 9)) * 30 * Math.exp(-(t - t0 - 0.6) * 5) : 0;
	return (
		<AbsoluteFill>
			<Bg kind="gold" t={t} cy={1080} />
			<Coin x={540} y={y - bounce} r={300} turn={lerp(3, 0, easeOut(fall)) + Math.sin(t * 2) * 0.04} shine={pulse(t * 0.7)} />
		</AbsoluteFill>
	);
};
const pulse = (t: number) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2);

const PILE = [
	[700, 1330, 0], [590, 1290, 20], [810, 1280, -30], [640, 1410, 8], [780, 1420, 35], [540, 1390, 50], [860, 1370, -45], [710, 1210, 70], [720, 1470, 15], [610, 1180, -60],
] as const;
export const OwnerScene: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const k = popK(t, t0 + 0.05, 0.4);
	const rain = Wd(37) - 0.05;
	return (
		<AbsoluteFill>
			<Bg kind="uk" t={t} cy={600} />
			<div style={{position: 'absolute', inset: 0, transform: `translateY(${lerp(-900, 0, k)}px)`}}><Owner x={380} y={1180} s={0.95} t={t} rage={easeOut((t - t0 - 0.3) / 0.4)} /></div>
			{PILE.map(([x, y, r], i) => {
				const ti = i === 0 ? t0 + 0.1 : rain + i * 0.06;
				const a = clamp01((t - ti) / 0.3);
				if (t < ti) return null;
				return <Coin key={i} x={x} y={lerp(-200, y, easeOut(a))} r={110} turn={lerp(2, 0, easeOut(a))} rot={r} />;
			})}
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ the island (claimed / won)
export const IslandClaim: React.FC<SceneProps & {won?: boolean}> = ({t0, won}) => {
	const t = useT();
	const drop = popK(t, t0 + 0.05, 0.45);
	const uk = won ? 1 - easeInOut((t - (Wd(88) - 0.1)) / 0.4) : easeOut((t - (Wd(40) - 0.1)) / 0.3);
	const us = won ? 1 : easeOut((t - (Wd(41) - 0.1)) / 0.3);
	const tint = won ? 1 : easeOut((t - Wd(42)) / 0.3);
	const crack = won ? 0 : easeOut((t - Wd(42)) / 0.35);
	const toUs = won ? easeInOut((t - (Wd(88) - 0.1)) / 0.5) : 0;
	const usBig = won ? popK(t, Wd(90) - 0.1, 0.4) : 0;
	return (
		<AbsoluteFill>
			<Bg kind="sea" t={t} cy={980} />
			<Sea t={t} y={1500} />
			<div style={{position: 'absolute', inset: 0, transform: `scale(${drop})`, transformOrigin: '540px 1000px'}}>
				<Island x={540} y={1000} w={700} t={t} tint={tint} tintL={toUs > 0 ? mix(RED, NAVY, toUs) : RED} tintR={NAVY} crack={crack} />
				{/* flags planted well inside their halves (owner 23.10: the Union Jack stuck out over the coast) */}
				<Flag src="flags/union_jack.png" t={t} x={300} y={860} w={180} pole={110} rise={uk} />
				<Flag src="flags/us_1859.png" t={t + 0.7} x={585} y={860} w={180} pole={110} rise={won ? 1 - usBig : us} />
				{won ? <Flag src="flags/us_1859.png" t={t} x={470} y={640} w={360} pole={260} rise={usBig} /> : null}
			</div>
		</AbsoluteFill>
	);
};
const mix = (a: string, b: string, k: number) => {
	const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
	const [x, y] = [p(a), p(b)];
	return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp01(k)))).join(',')})`;
};

// ------------------------------------------------------------------------------------------------ escalation
export const Troops: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const out = easeInOut((t - (Wd(48) - 0.25)) / 0.45);           // «four hundred»: the column gives way to the whole army
	const rows = [
		{y: 760, s: 0.42, n: 16}, {y: 850, s: 0.52, n: 14}, {y: 955, s: 0.64, n: 12}, {y: 1075, s: 0.78, n: 10}, {y: 1215, s: 0.95, n: 8},
	];
	return (
		<AbsoluteFill>
			<Bg kind="us" t={t} cy={1000} />
			{/* the army: rows in perspective (small at the back), popping in from the front row back; flag bearer in the middle */}
			{rows.map((row, r) =>
				Array.from({length: row.n}, (_, c) => {
					const k = popK(t, Wd(48) - 0.15 + (rows.length - r) * 0.05 + Math.abs(c - row.n / 2) * 0.012, 0.3);
					if (k <= 0) return null;
					const span = 880 - (rows.length - 1 - r) * 60;
					const x = 540 - span / 2 + (c + 0.5) * (span / row.n);
					return <div key={`${r}-${c}`} style={{position: 'absolute', left: 0, top: 0, transform: `translate(${x}px, ${row.y}px) scale(${k})`}}><Soldier side="us" x={0} y={0} s={row.s} step={(t + c * 0.11 + r * 0.07) * 1.6} /></div>;
				}),
			)}
			{out > 0 ? <Flag src="flags/us_1859.png" t={t} x={470} y={lerp(700, 560, out)} w={150} pole={110} rise={out} /> : null}
			{/* 14 cannons wheeled up in front */}
			{Array.from({length: 14}, (_, i) => {
				const k = popK(t, Wd(49) + 0.04 * i, 0.3);
				return k > 0 ? <div key={i} style={{position: 'absolute', left: 0, top: 0, transform: `translate(${130 + i * 63}px, ${1370}px) scale(${k})`}}><Cannon x={0} y={0} s={0.42} /></div> : null;
			})}
			{/* the column we open on: marches in, then clears away for the army */}
			<div style={{position: 'absolute', inset: 0, transform: `translateY(${out * 900}px)`, opacity: 1 - out}}>
				<Flag src="flags/us_1859.png" t={t} x={140} y={300} w={400} pole={0} rise={easeOut((t - t0) / 0.4)} />
				{Array.from({length: 7}, (_, i) => {
					const x = -300 + i * 230 + (t - t0) * 220;
					return <Soldier key={i} side="us" x={x} y={1260 + (i % 2) * 40} s={2.3} step={(t - t0) * 1.7 + i * 0.5} />;
				})}
			</div>
		</AbsoluteFill>
	);
};

export const Warships: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const ports = clamp01((t - (Wd(54) - 0.1)) / 0.3);
	const ships = [
		{x: 200, y: 1010, s: 0.55, d: 0.0},
		{x: 520, y: 990, s: 0.52, d: 0.12},
		{x: 830, y: 1020, s: 0.56, d: 0.24},
		{x: 290, y: 1300, s: 0.8, d: 0.36},
		{x: 720, y: 1320, s: 0.82, d: 0.48},
	];
	return (
		<AbsoluteFill>
			<Bg kind="uk" t={t} cy={700} />
			<Sea t={t} y={990} color="#2a6fc0" />
			{ships.map((sh, i) => {
				const a = easeOut((t - t0 - sh.d) / 0.6);
				return <Ship key={i} x={lerp(1500, sh.x, a)} y={sh.y} s={sh.s} t={t} ports={ports} seed={i * 1.3} />;
			})}
			<Flag src="flags/union_jack.png" t={t} x={360} y={360} w={360} pole={0} rise={easeOut((t - t0) / 0.4)} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ governor / admiral
export const Governor: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const k = popK(t, t0 + 0.05, 0.45);
	const point = easeOut((t - (Wd(57) - 0.1)) / 0.3);
	const gone = popK(t, Wd(60) - 0.05, 0.3);
	const fly = clamp01((t - Wd(60) - 0.2) / 0.5);
	return (
		<AbsoluteFill>
			<Bg kind="violet" t={t} cx={300} cy={1100} />
			<div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${lerp(-200, 0, k)}px, 0)`}}>
				<Bust who="governor" x={330} y={1380} s={0.95} t={t} point={point} />
			</div>
			<div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${fly * 700}px, ${-fly * 300}px) rotate(${fly * 40}deg)`, transformOrigin: '760px 900px'}}>
				<Flag src="flags/us_1859.png" t={t} x={640} y={580} w={240} pole={120} />
				<Soldier side="us" x={690} y={1060} s={1.3} step={t} />
				<Soldier side="us" x={830} y={1080} s={1.3} step={t + 0.3} />
			</div>
			{gone > 0 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - fly}}>
					<g transform={`translate(760 880) scale(${gone})`}>
						<path d="M-120,-120 L120,120 M120,-120 L-120,120" stroke={INK} strokeWidth={60} strokeLinecap="round" />
						<path d="M-120,-120 L120,120 M120,-120 L-120,120" stroke="#ff2b3a" strokeWidth={38} strokeLinecap="round" />
					</g>
				</svg>
			) : null}
		</AbsoluteFill>
	);
};

export const Admiral: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const k = popK(t, t0 + 0.05, 0.45);
	const shake = clamp01((t - (Wd(64) - 0.1)) / 0.1) * clamp01((Wd(64) + 0.7 - t) / 0.2);
	return (
		<AbsoluteFill>
			<Bg kind="us" t={t} cy={1100} />
			<Sea t={t} y={1660} />
			<div style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${lerp(500, 0, k)}px)`}}>
				<Bust who="admiral" x={540} y={1430} s={1.0} t={t} shake={shake} frown={1} />
			</div>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ twelve years
const mixHex = (a: string, b: string, k: number) => {
	const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
	const [x, y] = [p(a), p(b)];
	return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp01(k)))).join(',')})`;
};
const Tent: React.FC<{x: number; y: number; s: number; color: string; flag?: 'us' | 'uk'}> = ({x, y, s, color, flag}) => (
	<svg width={240 * s} height={300 * s} viewBox="-120 -260 240 300" style={{position: 'absolute', left: x - 120 * s, top: y - 260 * s, overflow: 'visible'}}>
		<path d="M-110,0 L0,-170 L110,0 Z" fill={color} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
		<path d="M-20,0 L0,-120 L20,0 Z" fill="#7a6a52" stroke={INK} strokeWidth={4} />
		{flag ? (
			<g>
				<line x1={0} y1={-170} x2={0} y2={-250} stroke={INK} strokeWidth={6} />
				<rect x={0} y={-250} width={70} height={42} fill={flag === 'uk' ? RED : NAVY} stroke={INK} strokeWidth={4} />
				{flag === 'uk' ? <path d="M0,-250 L70,-208 M70,-250 L0,-208" stroke="#fff" strokeWidth={6} /> : <rect x={0} y={-250} width={30} height={22} fill="#fff" opacity={0.85} />}
			</g>
		) : null}
	</svg>
);

/** «So both sides just stayed. For twelve years.» — one scene: two bored sentries at a fence post; on «For» the seasons turn
 *  to autumn, leaves fall, the beards grow to the ground, cobwebs appear (the year bar runs on top) */
export const Sentries: React.FC<SceneProps> = () => {
	const t = useT();
	const yrs = easeInOut((t - (Wd(74) - 0.2)) / 1.9);
	const skyTop = mixHex('#86ccff', '#f0a35a', yrs);
	const skyBot = mixHex('#e0f4ff', '#ffe0b0', yrs);
	const grass = mixHex('#5cc45a', '#c9922f', yrs);
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBot} 65%)`}} />
			{[0, 1, 2].map((k) => <Tent key={`l${k}`} x={90 + k * 130} y={1030 - k * 10} s={0.8 - k * 0.1} color="#f4f1ea" flag={k === 0 ? 'uk' : undefined} />)}
			{[0, 1, 2].map((k) => <Tent key={`r${k}`} x={990 - k * 130} y={1030 - k * 10} s={0.8 - k * 0.1} color="#efe1c2" flag={k === 0 ? 'us' : undefined} />)}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<path d="M0,1040 Q540,980 1080,1040 L1080,1920 L0,1920 Z" fill={grass} stroke={INK} strokeWidth={6} />
				<rect x={512} y={980} width={56} height={720} rx={10} fill="#8a5a2b" stroke={INK} strokeWidth={6} />
				{yrs > 0.3 ? <path d="M568,1060 Q650,1100 700,1060 M568,1100 Q640,1140 700,1100 M600,1060 L620,1120" stroke="#fff" strokeWidth={3} fill="none" opacity={yrs} /> : null}
			</svg>
			<Sentry side="uk" x={330} y={1740} s={1.05} t={t} beard={yrs} age={yrs} />
			<Sentry side="us" x={760} y={1740} s={1.05} t={t} beard={yrs} age={yrs} flip />
			{yrs > 0.2
				? Array.from({length: 18}, (_, i) => {
						const lx = ((i * 173) % 1080) + Math.sin(t * 2 + i) * 40;
						const ly = ((t - Wd(74)) * (240 + (i % 4) * 60) + i * 140) % 1700;
						return <div key={i} style={{position: 'absolute', left: lx, top: ly, width: 34, height: 22, borderRadius: '50% 0', background: i % 2 ? '#e0662a' : '#f0b030', border: `3px solid ${INK}`, transform: `rotate(${t * 200 + i * 30}deg)`, opacity: yrs}} />;
					})
				: null}
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ party
export const Party: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const clink = Wd(78) - 0.05;
	const a = easeOut((t - t0) / (clink - t0));
	const hit = t > clink ? Math.exp(-(t - clink) * 6) : 0;
	return (
		<AbsoluteFill>
			<Bg kind="night" t={t} cy={800} />
			<Burst x={250} y={420} a={t - t0 - 0.05} color="#ff4b5c" />
			<Burst x={820} y={330} a={t - t0 - 0.25} color="#6fa8ff" />
			<Burst x={560} y={600} a={t - t0 - 0.45} color="#ffd54a" r={220} />
			<Burst x={300} y={760} a={t - t0 - 0.75} color="#fff" r={140} />
			<Mug x={lerp(-200, 420, a) - hit * 20} y={1120} s={1.4} rot={lerp(-40, -14, a) - hit * 8} color={NAVY} />
			<Mug x={lerp(1280, 660, a) + hit * 20} y={1120} s={1.4} rot={lerp(40, 14, a) + hit * 8} color={RED} />
			{t > clink ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<g transform={`translate(540 930) scale(${1 + (1 - hit) * 0.6})`} opacity={hit}>
						{Array.from({length: 10}, (_, i) => {
							const ang = (i / 10) * Math.PI * 2;
							return <line key={i} x1={Math.cos(ang) * 60} y1={Math.sin(ang) * 60} x2={Math.cos(ang) * 140} y2={Math.sin(ang) * 140} stroke="#fff6c8" strokeWidth={14} strokeLinecap="round" />;
						})}
					</g>
				</svg>
			) : null}
			<Confetti t={t} t0={clink} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ the Kaiser and his seal
export const Kaiser: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const k = easeOut((t - t0) / 0.5);
	return (
		<AbsoluteFill>
			<Bg kind="de" t={t} cy={1000} />
			<Flag src="flags/german_empire.png" t={t} x={240} y={360} w={600} pole={0} rise={easeOut((t - t0 - 0.1) / 0.4)} />
			<div style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${lerp(800, 0, k)}px)`}}>
				<Bust who="kaiser" x={540} y={1500} s={1.0} t={t} frown={0.4} />
			</div>
		</AbsoluteFill>
	);
};

export const SealScene: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const hitT = Wd(84) + 0.02;
	const shake = t > hitT ? Math.sin((t - hitT) * 70) * 10 * Math.exp(-(t - hitT) * 9) : 0;
	return (
		<AbsoluteFill>
			<Bg kind="de" t={t} cy={1000} rays={false} />
			<div style={{position: 'absolute', inset: 0, transform: `translate(${shake}px, ${shake * 0.6}px)`}}>
				<Document x={540} y={960} w={780} h={1000} rot={-3} t={t} />
				<Seal x={700} y={1300} r={130} t={t} t0={hitT} />
			</div>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------ finale
/** «Total casualties: one pig.» — the drawn pig as an angel (halo, flapping wings) on a cloud over the island; winks on «pig» */
export const Angel: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const k = easeOut((t - t0) / 0.8);
	const wink = clamp01((t - (Wd(94) + 0.05)) / 0.12) * clamp01((Wd(94) + 0.6 - t) / 0.12);
	const float = Math.sin(t * 1.8) * 14;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #8f6ff0 0%, #f2a3d6 55%, #ffd9ec 100%)'}} />
			<Island x={720} y={1640} w={520} t={t} />
			<Cloud x={240} y={560} w={260} t={t} />
			<Cloud x={900} y={430} w={220} t={t + 1} />
			<div style={{position: 'absolute', inset: 0, transform: `translateY(${lerp(400, 0, k) + float}px)`}}>
				<Cloud x={560} y={900} w={720} t={t} />
				<Pig x={610} y={870} s={1.02} t={t} mood="happy" potato={false} halo wings wink={wink} look={0} />
			</div>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{Array.from({length: 14}, (_, i) => {
					const x = 120 + ((i * 263) % 840), y = 380 + ((i * 419) % 700);
					const tw = pulse(t * 0.8 + i * 0.37);
					return (
						<g key={i} transform={`translate(${x} ${y}) scale(${0.4 + tw * 0.8}) rotate(${t * 40 + i * 20})`} opacity={0.5 + 0.5 * tw}>
							<path d="M0,-26 L6,-6 L26,0 L6,6 L0,26 L-6,6 L-26,0 L-6,-6 Z" fill="#fff8d8" stroke={INK} strokeWidth={3} />
						</g>
					);
				})}
			</svg>
		</AbsoluteFill>
	);
};
