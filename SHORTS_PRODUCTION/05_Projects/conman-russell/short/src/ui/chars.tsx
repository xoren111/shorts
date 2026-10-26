import React from 'react';
import {Img, staticFile} from 'remotion';
import {useFlow} from '../lib/flowctx';
import {INK, GOLD, lerp, clamp01, easeOut} from './gfx';
import {NAVY, NAVY_D, RED, SKIN, SKIN_D, W} from './draw';

// v3 drawn cast (owner 23.10: draw the key moments ourselves too — the whole Short is ours, one style, no licence questions).
// Each character is drawn in its own units with (0, 0) at the feet (or the neck for heads) and placed with x, y, s.

const PIG = '#2b2731';
const PIG_HI = '#4b4555';
const PINK = '#f6a6b6';
const PINK_D = '#d97a8e';

/** the Berkshire boar: black, white blaze + snout + feet + tail tip. mood: chew | shock | happy; facing left (flip → right) */
export const Pig: React.FC<{x: number; y: number; s?: number; t: number; mood?: 'chew' | 'shock' | 'happy'; potato?: boolean; flip?: boolean; look?: number; wink?: number; halo?: boolean; wings?: boolean}> = ({x, y, s = 1, t, mood = 'chew', potato = true, flip, look = 0, wink = 0, halo, wings}) => {
	const chew = mood === 'chew' ? Math.sin(t * 17) * 7 : 0;
	const shock = mood === 'shock';
	const blink = (t * 0.7) % 3 < 0.09 && !shock ? 0.1 : 1;
	const ear = Math.sin(t * 3.1) * 5;
	const tail = Math.sin(t * 9) * 12;
	const eyeR = shock ? 34 : 26;
	const pup = shock ? 8 : 13;
	const flap = Math.sin(t * 9) * 22;
	return (
		<svg width={760 * s} height={760 * s} viewBox="-380 -640 760 760" style={{position: 'absolute', left: x - 380 * s, top: y - 640 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
			<ellipse cx={20} cy={0} rx={270} ry={30} fill="rgba(0,0,0,0.25)" />
			{wings ? (
				<g>
					{[-1, 1].map((k) => (
						<g key={k} transform={`translate(${60 + k * 60} -330) rotate(${k * (-25 - flap)}) scale(${k * 1.5} 1.5)`}>
							{[0, 1, 2, 3].map((j) => (
								<path key={j} d={`M0,0 Q${120 + j * 20},${-90 - j * 25} ${190 - j * 25},${-20 - j * 45} Q${120},${-10 - j * 12} 0,0 Z`} fill="#fff" stroke={INK} strokeWidth={W - 1} strokeLinejoin="round" />
							))}
						</g>
					))}
				</g>
			) : null}
			{/* back legs + tail */}
			{[110, 205].map((lx, i) => (
				<g key={i}>
					<rect x={lx - 30} y={-100} width={60} height={98} rx={24} fill={PIG} stroke={INK} strokeWidth={W} />
					<rect x={lx - 30} y={-46} width={60} height={44} rx={18} fill="#fff" stroke={INK} strokeWidth={W} />
				</g>
			))}
			<path d={`M285,-250 q45,-25 30,${-40 + tail * 0.3} q-20,-25 -35,${-5 + tail * 0.2} q-10,25 20,${20 + tail * 0.2}`} fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" />
			<path d={`M285,-250 q45,-25 30,${-40 + tail * 0.3} q-20,-25 -35,${-5 + tail * 0.2} q-10,25 20,${20 + tail * 0.2}`} fill="none" stroke={PIG} strokeWidth={8} strokeLinecap="round" />
			<circle cx={302 + tail * 0.2} cy={-297} r={9} fill="#fff" stroke={INK} strokeWidth={4} />
			{/* body */}
			<ellipse cx={50} cy={-205} rx={260} ry={165} fill={PIG} stroke={INK} strokeWidth={W + 2} />
			<ellipse cx={80} cy={-290} rx={170} ry={60} fill={PIG_HI} opacity={0.7} />
			{/* front legs */}
			{[-170, -70].map((lx, i) => (
				<g key={i}>
					<rect x={lx - 32} y={-104} width={64} height={102} rx={24} fill={PIG} stroke={INK} strokeWidth={W} />
					<rect x={lx - 32} y={-50} width={64} height={48} rx={18} fill="#fff" stroke={INK} strokeWidth={W} />
					<rect x={lx - 32} y={-14} width={64} height={14} rx={6} fill="#6b6570" />
				</g>
			))}
			{/* head: wide and round, floppy ears, a big pink snout disc — Berkshire: black with white snout, feet and tail tip */}
			<g transform={`translate(-175 -255) rotate(${shock ? -6 : Math.sin(t * 2) * 3})`}>
				{halo ? <ellipse cx={0} cy={-200 + Math.sin(t * 2.4) * 8} rx={110} ry={26} fill="none" stroke={GOLD} strokeWidth={16} style={{filter: 'drop-shadow(0 0 14px #ffd75a)'}} /> : null}
				<ellipse cx={0} cy={0} rx={150} ry={128} fill={PIG} stroke={INK} strokeWidth={W + 2} />
				<ellipse cx={-30} cy={-70} rx={80} ry={34} fill={PIG_HI} opacity={0.6} />
				{/* floppy ears hang forward over the brow */}
				<g transform={`rotate(${-18 + ear} -95 -95)`}>
					<path d="M-60,-112 Q-150,-140 -178,-62 Q-150,-40 -95,-30 Z" fill={PIG} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<path d="M-74,-100 Q-140,-118 -160,-66 Q-136,-52 -98,-44 Z" fill={PINK_D} opacity={0.8} />
				</g>
				<g transform={`rotate(${18 - ear} 95 -95)`}>
					<path d="M60,-112 Q150,-140 178,-62 Q150,-40 95,-30 Z" fill={PIG} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<path d="M74,-100 Q140,-118 160,-66 Q136,-52 98,-44 Z" fill={PINK_D} opacity={0.8} />
				</g>
				{/* eyes + brows */}
				{[-58, 58].map((ex, i) => (
					<g key={i} transform={`translate(${ex} -22)`}>
						<ellipse cx={0} cy={0} rx={eyeR * 0.85} ry={eyeR * 0.85 * (i === 1 && wink > 0 ? 1 - wink : blink)} fill="#fff" stroke={INK} strokeWidth={5} />
						{(i === 1 && wink > 0.5) || blink < 1 ? null : <circle cx={look * 8} cy={2} r={pup * 0.9} fill={INK} />}
						{(i === 1 && wink > 0.5) || blink < 1 ? null : <circle cx={look * 8 - 4} cy={-3} r={pup * 0.32} fill="#fff" />}
						<path d={shock ? 'M-26,-42 Q0,-60 26,-42' : i ? 'M-22,-34 Q2,-44 24,-30' : 'M-24,-30 Q-2,-44 22,-34'} stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" />
					</g>
				))}
				<ellipse cx={-102} cy={36} rx={24} ry={14} fill={PINK} opacity={0.6} />
				<ellipse cx={102} cy={36} rx={24} ry={14} fill={PINK} opacity={0.6} />
				{/* the snout disc (chews) */}
				<g transform={`translate(0 ${chew * 0.4})`}>
					<ellipse cx={0} cy={58} rx={92} ry={64} fill="#fbe3e8" stroke={INK} strokeWidth={W + 1} />
					<ellipse cx={0} cy={60} rx={74} ry={50} fill={PINK} />
					<ellipse cx={-28} cy={60} rx={14} ry={22} fill={PINK_D} stroke={INK} strokeWidth={4} />
					<ellipse cx={28} cy={60} rx={14} ry={22} fill={PINK_D} stroke={INK} strokeWidth={4} />
					<ellipse cx={-30} cy={30} rx={26} ry={9} fill="#fff" opacity={0.7} />
				</g>
				<g transform={`translate(0 ${chew})`}>
					{shock ? (
						<ellipse cx={0} cy={140} rx={30} ry={22} fill="#5a1a24" stroke={INK} strokeWidth={5} />
					) : (
						<path d="M-58,128 Q0,162 58,128" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
					)}
					{potato ? (
						<g transform={`translate(${shock ? 0 : 8} ${shock ? 150 : 146}) rotate(${-12 + chew})`}>
							<ellipse cx={0} cy={0} rx={70} ry={46} fill="#c98a4a" stroke={INK} strokeWidth={W} />
							{[[-28, -10], [14, 8], [34, -16], [-6, 18]].map(([px, py], i) => <circle key={i} cx={px} cy={py} r={5} fill="#7a4e24" />)}
							<ellipse cx={-20} cy={-18} rx={22} ry={8} fill="#e8b57a" opacity={0.8} />
						</g>
					) : null}
				</g>
			</g>
		</svg>
	);
};

/** just the pig's face, for badges / the poll (centre = face centre) */
export const PigHead: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
	<div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${x}px, ${y}px)`}}>
		<Pig x={170 * s} y={240 * s} s={s} t={t} mood="happy" potato={false} />
	</div>
);

/** the farmer (Lyman Cutlar): wide-brim felt hat, short dark beard, brown wool shirt, suspenders. pose: point | aim | proud | stand */
export const Farmer: React.FC<{x: number; y: number; s?: number; t: number; pose?: 'point' | 'aim' | 'proud' | 'stand'; shout?: number; flip?: boolean; recoil?: number}> = ({x, y, s = 1, t, pose = 'stand', shout = 0, flip, recoil = 0}) => {
	const shirt = '#8a5834';
	const shirtD = '#5e3a20';
	const trou = '#4a4038';
	const bob = Math.sin(t * 2.4) * 3;
	const jab = pose === 'point' ? Math.sin(t * 9) * 6 * shout : 0;
	return (
		<svg width={700 * s} height={880 * s} viewBox="-350 -800 700 880" style={{position: 'absolute', left: x - 350 * s, top: y - 800 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
			<ellipse cx={0} cy={0} rx={150} ry={22} fill="rgba(0,0,0,0.25)" />
			<g transform={`translate(${-recoil * 14} ${bob})`}>
				<rect x={-70} y={-40} width={62} height={44} rx={16} fill="#2b1d14" stroke={INK} strokeWidth={W} />
				<rect x={8} y={-40} width={62} height={44} rx={16} fill="#2b1d14" stroke={INK} strokeWidth={W} />
				<path d="M-62,-260 L-8,-260 L-14,-36 L-62,-36 Z M8,-260 L62,-260 L62,-36 L14,-36 Z" fill={trou} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d="M-88,-470 Q0,-500 88,-470 L76,-250 L-76,-250 Z" fill={shirt} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d="M-44,-478 L-34,-252 M44,-478 L34,-252" stroke="#2a1a10" strokeWidth={12} />
				<rect x={-78} y={-272} width={156} height={22} fill="#3a2a1e" stroke={INK} strokeWidth={4} />
				{/* arms */}
				{pose === 'point' ? (
					<g>
						<path d={`M-70,-450 L${-250 - jab},${-470 + jab * 0.5} L${-252 - jab},-420 L-66,-400 Z`} fill={shirt} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={-270 - jab} cy={-446} r={30} fill={SKIN} stroke={INK} strokeWidth={W} />
						<path d={`M${-290 - jab},-452 L${-335 - jab},-458`} stroke={INK} strokeWidth={22} strokeLinecap="round" />
						<path d={`M${-290 - jab},-452 L${-335 - jab},-458`} stroke={SKIN} strokeWidth={12} strokeLinecap="round" />
						<path d="M70,-450 Q120,-360 96,-300 L66,-300 Q86,-360 50,-420 Z" fill={shirtD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={84} cy={-292} r={26} fill={SKIN} stroke={INK} strokeWidth={W} />
					</g>
				) : pose === 'aim' ? (
					<g>
						<path d="M-330,-470 L60,-440 L66,-410 L-330,-446 Z" fill="#7a4a24" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<path d="M-330,-470 L-110,-455" stroke="#9aa3ad" strokeWidth={12} />
						<path d="M-40,-470 L-180,-458 L-176,-424 L-36,-420 Z" fill={shirt} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={-185} cy={-442} r={26} fill={SKIN} stroke={INK} strokeWidth={W} />
						<path d="M70,-460 L20,-430 L40,-404 L86,-420 Z" fill={shirtD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={22} cy={-424} r={24} fill={SKIN} stroke={INK} strokeWidth={W} />
					</g>
				) : pose === 'proud' ? (
					<g>
						<path d="M92,-640 L40,-200" stroke="#7a4a24" strokeWidth={22} strokeLinecap="round" />
						<path d="M92,-640 L100,-700" stroke="#9aa3ad" strokeWidth={10} strokeLinecap="round" />
						<path d="M70,-460 Q110,-520 90,-560 L70,-556 Q86,-516 50,-430 Z" fill={shirt} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={84} cy={-566} r={26} fill={SKIN} stroke={INK} strokeWidth={W} />
						<path d="M-70,-450 Q-110,-360 -90,-300 L-60,-300 Q-80,-360 -50,-420 Z" fill={shirtD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={-76} cy={-292} r={26} fill={SKIN} stroke={INK} strokeWidth={W} />
					</g>
				) : (
					<g>
						<path d="M-70,-450 Q-110,-360 -90,-300 L-60,-300 Q-80,-360 -50,-420 Z" fill={shirtD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<path d="M70,-450 Q110,-360 90,-300 L60,-300 Q80,-360 50,-420 Z" fill={shirtD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					</g>
				)}
				<FarmerFace cx={0} cy={-560} shout={shout} aim={pose === 'aim'} />
			</g>
		</svg>
	);
};

/** the farmer's head (hat + face + beard) drawn into an <svg> at (cx, cy) */
export const FarmerFace: React.FC<{cx: number; cy: number; shout?: number; aim?: boolean; r?: number}> = ({cx, cy, shout = 0, aim, r = 1}) => (
	<g transform={`translate(${cx} ${cy}) scale(${r})`}>
		<rect x={-24} y={50} width={48} height={40} fill={SKIN_D} stroke={INK} strokeWidth={W} />
		<ellipse cx={0} cy={0} rx={80} ry={92} fill={SKIN} stroke={INK} strokeWidth={W + 1} />
		<path d="M-80,10 Q-84,96 0,108 Q84,96 80,10 Q60,52 0,56 Q-60,52 -80,10 Z" fill="#4a2e1c" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
		<path d={`M-50,${-28} L-14,${-18 - (shout ? 8 : 0)}`} stroke={INK} strokeWidth={11} strokeLinecap="round" />
		<path d={`M50,${-28} L14,${-18 - (shout ? 8 : 0)}`} stroke={INK} strokeWidth={11} strokeLinecap="round" />
		{aim ? <path d="M-46,-4 L-14,-4" stroke={INK} strokeWidth={8} strokeLinecap="round" /> : <ellipse cx={-30} cy={-2} rx={9} ry={12} fill={INK} />}
		<ellipse cx={30} cy={-2} rx={9} ry={12} fill={INK} />
		<ellipse cx={0} cy={26} rx={16} ry={20} fill={SKIN_D} stroke={INK} strokeWidth={4} />
		{shout > 0.3 ? <ellipse cx={0} cy={66} rx={26} ry={20 * shout} fill="#5a1a24" stroke={INK} strokeWidth={5} /> : <path d="M-22,62 Q0,72 22,62" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />}
		<ellipse cx={0} cy={-62} rx={150} ry={26} fill="#3d2c22" stroke={INK} strokeWidth={W} />
		<path d="M-70,-66 Q-70,-150 0,-152 Q70,-150 70,-66 Z" fill="#4d3829" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
		<rect x={-70} y={-92} width={140} height={20} fill="#2a1c14" />
	</g>
);

/** a round badge with the farmer's face / the pig's face (drawn; replaces the photo avatars) */
export const Badge: React.FC<{who: 'farmer' | 'pig'; x: number; y: number; d: number; s?: number; rot?: number; t: number; bg?: string}> = (p) => {
	const flow = useFlow();
	const {who, x, y, d, s = 1, rot = 0} = p;
	if (flow)
		return (
			<div style={{position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d, overflow: 'hidden', border: '12px solid #fffaf0', boxShadow: `0 0 0 6px ${INK}, 0 20px 40px rgba(0,0,0,0.45)`, transform: `rotate(${rot}deg) scale(${s})`, background: '#222'}}>
				<Img src={staticFile(`poll/${who}.jpg`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			</div>
		);
	return <DrawnBadge {...p} />;
};
const DrawnBadge: React.FC<{who: 'farmer' | 'pig'; x: number; y: number; d: number; s?: number; rot?: number; t: number; bg?: string}> = ({who, x, y, d, s = 1, rot = 0, t, bg}) => (
	<div style={{position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d, overflow: 'hidden', border: '12px solid #fffaf0', boxShadow: `0 0 0 6px ${INK}, 0 20px 40px rgba(0,0,0,0.45)`, transform: `rotate(${rot}deg) scale(${s})`, background: bg ?? (who === 'farmer' ? '#9fd0ff' : '#ffd6a0')}}>
		<svg width={d} height={d} viewBox="-200 -200 400 400" style={{position: 'absolute', inset: 0}}>
			{who === 'farmer' ? <FarmerFace cx={0} cy={40} r={1.35} /> : null}
		</svg>
		{who === 'pig' ? (
			<div style={{position: 'absolute', left: 0, top: 0, width: d, height: d}}>
				<Pig x={d * 0.94} y={d * 1.14} s={d / 400} t={t} mood="happy" potato={false} />
			</div>
		) : null}
	</div>
);

/** a sentry for the «twelve years» gag: redcoat (shako) or bluecoat (kepi), leaning on his musket; beard 0..1 grows to the ground */
export const Sentry: React.FC<{side: 'us' | 'uk'; x: number; y: number; s?: number; t: number; beard?: number; age?: number; flip?: boolean}> = ({side, x, y, s = 1, t, beard = 0, age = 0, flip}) => {
	const us = side === 'us';
	const coat = us ? NAVY : RED;
	const coatD = us ? NAVY_D : '#9c1726';
	const trou = us ? '#8fb3e6' : '#2a2a3a';
	const hair = age > 0.3 ? '#efece6' : us ? '#5a3a22' : '#8a5a2a';
	const sway = Math.sin(t * 1.3 + (us ? 1 : 0)) * 2;
	const bl = 600 * beard;
	const wave = (i: number) => Math.sin(t * 2 + i) * 10 * beard;
	return (
		<svg width={600 * s} height={1000 * s} viewBox="-300 -900 600 1000" style={{position: 'absolute', left: x - 300 * s, top: y - 900 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
			<ellipse cx={0} cy={0} rx={150} ry={22} fill="rgba(0,0,0,0.25)" />
			<g transform={`rotate(${sway} 0 0) ${age > 0 ? `translate(0 ${age * 20})` : ''}`}>
				<path d="M130,-640 L120,0" stroke="#6b3e1c" strokeWidth={22} strokeLinecap="round" />
				<path d="M130,-640 L132,-720" stroke="#b9c1c9" strokeWidth={8} />
				<rect x={-70} y={-40} width={60} height={44} rx={16} fill="#151515" stroke={INK} strokeWidth={W} />
				<rect x={10} y={-40} width={60} height={44} rx={16} fill="#151515" stroke={INK} strokeWidth={W} />
				<path d="M-62,-280 L-6,-280 L-12,-36 L-62,-36 Z M6,-280 L62,-280 L62,-36 L12,-36 Z" fill={trou} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d="M-92,-520 Q0,-548 92,-520 L84,-270 L-84,-270 Z" fill={coat} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				{us ? (
					<g>
						<line x1={-84} y1={-300} x2={84} y2={-300} stroke="#1b1b1b" strokeWidth={14} />
						{[0, 1, 2, 3].map((k) => <circle key={k} cx={0} cy={-500 + k * 55} r={7} fill={GOLD} stroke={INK} strokeWidth={2} />)}
					</g>
				) : (
					<path d="M-80,-510 L80,-290 M80,-510 L-80,-290" stroke="#fff" strokeWidth={18} />
				)}
				{/* arms resting on the musket */}
				<path d="M60,-500 Q130,-470 128,-560 L110,-566 Q104,-500 50,-470 Z" fill={coatD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<circle cx={122} cy={-578} r={24} fill={SKIN} stroke={INK} strokeWidth={W} />
				<path d="M-60,-500 Q40,-480 112,-590 L104,-604 Q30,-506 -50,-466 Z" fill={coatD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				{/* head */}
				<g transform="translate(0 -630)">
					<rect x={-22} y={48} width={44} height={40} fill={SKIN_D} stroke={INK} strokeWidth={W} />
					<ellipse cx={0} cy={0} rx={74} ry={86} fill={age > 0.3 ? '#f0c4a2' : SKIN} stroke={INK} strokeWidth={W + 1} />
					<path d="M-74,-6 Q-90,40 -66,70 L-56,10 Z M74,-6 Q90,40 66,70 L56,10 Z" fill={hair} stroke={INK} strokeWidth={4} />
					{/* sleepy eyes: half lids */}
					{[-28, 28].map((ex, i) => (
						<g key={i}>
							<ellipse cx={ex} cy={0} rx={14} ry={12} fill="#fff" stroke={INK} strokeWidth={4} />
							<circle cx={ex + 2} cy={4} r={6} fill={INK} />
							<path d={`M${ex - 16},-2 Q${ex},-16 ${ex + 16},-2 Z`} fill={age > 0.3 ? '#f0c4a2' : SKIN} stroke={INK} strokeWidth={4} />
						</g>
					))}
					<path d={`M-44,-28 L-12,-24 M44,-28 L12,-24`} stroke={age > 0.3 ? '#cfcac2' : INK} strokeWidth={9} strokeLinecap="round" />
					<ellipse cx={0} cy={22} rx={13} ry={17} fill={SKIN_D} stroke={INK} strokeWidth={4} />
					<path d="M-20,52 L20,52" stroke={INK} strokeWidth={7} strokeLinecap="round" />
					{age > 0 ? <path d="M-50,-50 Q-30,-56 -10,-50 M10,-50 Q30,-56 50,-50" stroke="#c98a6a" strokeWidth={3} fill="none" opacity={age} /> : null}
					{/* the beard grows down to (and along) the ground */}
					{beard > 0.02 ? (
						<path
							d={`M-56,36 Q-70,${80 + bl * 0.3} ${-40 + wave(1)},${60 + bl} Q0,${90 + bl + wave(2)} ${40 + wave(3)},${60 + bl} Q70,${80 + bl * 0.3} 56,36 Q30,64 0,66 Q-30,64 -56,36 Z`}
							fill="#f4f2ee"
							stroke={INK}
							strokeWidth={W}
							strokeLinejoin="round"
						/>
					) : null}
					{beard > 0.02 ? <path d="M-30,62 Q-34,64 -30,70 M30,62 Q34,64 30,70" stroke="#d8d4cc" strokeWidth={4} /> : null}
					{us ? (
						<path d="M-70,-50 L-64,-118 Q0,-136 64,-118 L70,-50 Z M58,-52 L104,-44" fill={NAVY_D} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					) : (
						<g>
							<rect x={-62} y={-190} width={124} height={130} rx={10} fill="#1d1d24" stroke={INK} strokeWidth={W} />
							<circle cx={0} cy={-120} r={22} fill={GOLD} stroke={INK} strokeWidth={4} />
							<ellipse cx={0} cy={-200} rx={22} ry={16} fill="#fff" stroke={INK} strokeWidth={4} />
							<rect x={-66} y={-68} width={132} height={16} fill="#111" />
						</g>
					)}
				</g>
			</g>
		</svg>
	);
};

/** a puffy cartoon cloud */
export const Cloud: React.FC<{x: number; y: number; w: number; t: number}> = ({x, y, w, t}) => {
	const puffs = [[-0.38, 0.05, 0.24], [-0.16, -0.12, 0.3], [0.12, -0.16, 0.32], [0.36, 0.0, 0.25], [0.0, 0.08, 0.34], [-0.28, 0.16, 0.2], [0.28, 0.16, 0.22]];
	const h = w * 0.55;
	return (
		<svg width={w * 1.2} height={h * 1.4} viewBox={`${-w * 0.6} ${-h * 0.7} ${w * 1.2} ${h * 1.4}`} style={{position: 'absolute', left: x - w * 0.6, top: y - h * 0.7, overflow: 'visible'}}>
			{puffs.map(([px, py, r], i) => <circle key={`o${i}`} cx={px * w} cy={py * w + Math.sin(t * 1.5 + i) * 4} r={r * w} fill={INK} />)}
			{puffs.map(([px, py, r], i) => <circle key={`f${i}`} cx={px * w} cy={py * w + Math.sin(t * 1.5 + i) * 4} r={r * w - 7} fill="#fff" />)}
			{puffs.map(([px, py, r], i) => <circle key={`s${i}`} cx={px * w + r * w * 0.2} cy={py * w + r * w * 0.35 + Math.sin(t * 1.5 + i) * 4} r={r * w * 0.55} fill="#e9defc" opacity={0.8} />)}
		</svg>
	);
};

/** log cabin with a door that swings open (door 0 → 1) */
export const Cabin: React.FC<{x: number; y: number; s?: number; door?: number}> = ({x, y, s = 1, door = 0}) => (
	<svg width={520 * s} height={460 * s} viewBox="-260 -420 520 460" style={{position: 'absolute', left: x - 260 * s, top: y - 420 * s, overflow: 'visible'}}>
		<path d="M-250,-230 L0,-410 L250,-230 Z" fill="#5a3a26" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
		<rect x={150} y={-400} width={50} height={110} fill="#7a7068" stroke={INK} strokeWidth={W} />
		{Array.from({length: 6}, (_, i) => (
			<rect key={i} x={-220} y={-230 + i * 40} width={440} height={40} rx={20} fill={i % 2 ? '#9a6a40' : '#8a5c36'} stroke={INK} strokeWidth={4} />
		))}
		<rect x={-50} y={-160} width={100} height={170} fill="#1a120c" stroke={INK} strokeWidth={W} />
		<rect x={-50} y={-160} width={100 * (1 - door * 0.85)} height={170} fill="#6a4426" stroke={INK} strokeWidth={W} />
		<rect x={110} y={-170} width={70} height={60} fill="#ffe7a8" stroke={INK} strokeWidth={W} />
	</svg>
);

/** a Douglas fir */
export const Fir: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
	<svg width={260 * s} height={600 * s} viewBox="-130 -580 260 600" style={{position: 'absolute', left: x - 130 * s, top: y - 580 * s, overflow: 'visible'}}>
		<rect x={-14} y={-60} width={28} height={70} fill="#5a3a20" stroke={INK} strokeWidth={4} />
		<g transform={`rotate(${Math.sin(t * 1.1 + x) * 1.2} 0 0)`}>
			{[0, 1, 2, 3].map((k) => (
				<path key={k} d={`M0,${-560 + k * 120} L${70 + k * 25},${-400 + k * 120} L${-70 - k * 25},${-400 + k * 120} Z`} fill={k % 2 ? '#2f7a3e' : '#256b35'} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			))}
		</g>
	</svg>
);

/** potato patch: soil band, rows of plants, a few potatoes */
export const Patch: React.FC<{y: number; t: number}> = ({y, t}) => (
	<svg width={1080} height={1920 - y + 20} style={{position: 'absolute', left: 0, top: y}}>
		<rect x={0} y={0} width={1080} height={1920 - y + 20} fill="#7a4a2a" />
		{Array.from({length: 4}, (_, r) => <rect key={r} x={0} y={30 + r * 120} width={1080} height={46} fill="#5e371e" />)}
		{Array.from({length: 18}, (_, i) => {
			const px = (i % 6) * 190 + (Math.floor(i / 6) % 2) * 95 + 40, py = 40 + Math.floor(i / 6) * 150;
			return (
				<g key={i} transform={`translate(${px} ${py}) rotate(${Math.sin(t * 2 + i) * 3})`}>
					{[-30, 0, 30].map((a, k) => <ellipse key={k} cx={Math.sin((a * Math.PI) / 180) * 30} cy={-28} rx={20} ry={34} fill={k === 1 ? '#3f9a3e' : '#2f8034'} stroke={INK} strokeWidth={4} transform={`rotate(${a} 0 0)`} />)}
				</g>
			);
		})}
		{[[150, 260], [420, 330], [760, 280], [930, 420], [300, 470]].map(([px, py], i) => <ellipse key={i} cx={px} cy={py} rx={34} ry={24} fill="#c98a4a" stroke={INK} strokeWidth={5} />)}
	</svg>
);

/** gun smoke: a growing cloud of puffs from (x, y) drifting towards dir; a = age (s) */
export const Smoke: React.FC<{x: number; y: number; a: number; dir?: number; size?: number}> = ({x, y, a, dir = 1, size = 1}) => {
	if (a < 0) return null;
	const k = easeOut(a / 0.5);
	const fade = clamp01((3 - a) / 1.2);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: fade}}>
			{Array.from({length: 14}, (_, i) => {
				const u = i / 13;
				const cx = x + dir * u * 520 * k * size + Math.sin(i * 2.1) * 40 * k;
				const cy = y - Math.sin(u * Math.PI) * 90 * k + Math.cos(i * 1.7) * 50 * k - a * 20;
				const r = (60 + u * 110 + (i % 3) * 20) * k * size;
				return (
					<g key={i}>
						<circle cx={cx} cy={cy} r={r + 6} fill={INK} opacity={0.9} />
						<circle cx={cx} cy={cy} r={r} fill={i % 2 ? '#f4f1f7' : '#e4dfe9'} />
					</g>
				);
			})}
		</svg>
	);
};

/** muzzle flash star at (x, y), age a */
export const Flash: React.FC<{x: number; y: number; a: number}> = ({x, y, a}) => {
	if (a < 0 || a > 0.18) return null;
	const k = 1 - a / 0.18;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			<g transform={`translate(${x} ${y}) scale(${0.6 + k})`}>
				<path d="M0,-90 L22,-24 L90,-30 L34,10 L60,80 L0,36 L-60,80 L-34,10 L-90,-30 L-22,-24 Z" fill="#ffd54a" stroke={INK} strokeWidth={6} />
				<circle r={30} fill="#fff6c8" />
			</g>
		</svg>
	);
};

/** a flock of birds scattering from (x, y) */
export const Birds: React.FC<{x: number; y: number; a: number}> = ({x, y, a}) => {
	if (a < 0 || a > 2) return null;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			{Array.from({length: 8}, (_, i) => {
				const ang = -Math.PI / 2 + (i - 3.5) * 0.28;
				const d = a * (380 + i * 30);
				const bx = x + Math.cos(ang) * d, by = y + Math.sin(ang) * d;
				const f = Math.sin(a * 22 + i) * 14;
				return <path key={i} d={`M${bx - 24},${by + f} Q${bx - 10},${by - 10} ${bx},${by} Q${bx + 10},${by - 10} ${bx + 24},${by + f}`} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />;
			})}
		</svg>
	);
};

/** the owner (Charles Griffin, Hudson's Bay Co.): portly, bowler, ginger mutton chops, red angry face, waistcoat — jabs a finger */
export const Owner: React.FC<{x: number; y: number; s?: number; t: number; rage?: number}> = ({x, y, s = 1, t, rage = 1}) => {
	const jab = Math.sin(t * 10) * 8 * rage;
	const face = `rgb(${Math.round(lerp(243, 236, rage))},${Math.round(lerp(194, 120, rage))},${Math.round(lerp(154, 110, rage))})`;
	return (
		<svg width={760 * s} height={980 * s} viewBox="-380 -900 760 980" style={{position: 'absolute', left: x - 380 * s, top: y - 900 * s, overflow: 'visible'}}>
			<ellipse cx={0} cy={0} rx={190} ry={24} fill="rgba(0,0,0,0.25)" />
			<rect x={-90} y={-60} width={70} height={60} rx={18} fill="#1a1a1a" stroke={INK} strokeWidth={W} />
			<rect x={20} y={-60} width={70} height={60} rx={18} fill="#1a1a1a" stroke={INK} strokeWidth={W} />
			<path d="M-84,-300 L-16,-300 L-22,-54 L-84,-54 Z M16,-300 L84,-300 L84,-54 L22,-54 Z" fill="#3b3b46" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			<path d="M-150,-560 Q0,-600 150,-560 Q190,-420 130,-290 L-130,-290 Q-190,-420 -150,-560 Z" fill="#23232b" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			<path d="M-70,-560 Q0,-420 -10,-300 L10,-300 Q0,-420 70,-560 Z" fill="#2f6b3a" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			{[0, 1, 2].map((k) => <circle key={k} cx={0} cy={-500 + k * 60} r={8} fill={GOLD} stroke={INK} strokeWidth={2} />)}
			<path d="M-40,-570 L0,-520 L40,-570 Z" fill="#fff" stroke={INK} strokeWidth={4} />
			<path d={`M130,-540 L${330 + jab},${-600 + jab * 0.4} L${340 + jab},-550 L150,-480 Z`} fill="#23232b" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			<circle cx={350 + jab} cy={-584} r={30} fill={face} stroke={INK} strokeWidth={W} />
			<path d={`M${368 + jab},-596 L${408 + jab},-618`} stroke={INK} strokeWidth={22} strokeLinecap="round" />
			<path d={`M${368 + jab},-596 L${408 + jab},-618`} stroke={face} strokeWidth={12} strokeLinecap="round" />
			<path d="M-140,-540 Q-200,-430 -160,-330 L-130,-340 Q-160,-430 -110,-510 Z" fill="#23232b" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			<g transform={`translate(0 -690) rotate(${Math.sin(t * 12) * 3 * rage})`}>
				<ellipse cx={0} cy={0} rx={110} ry={115} fill={face} stroke={INK} strokeWidth={W + 1} />
				<path d="M-110,-10 Q-140,80 -70,110 Q-60,40 -84,-30 Z M110,-10 Q140,80 70,110 Q60,40 84,-30 Z" fill="#d0682a" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d="M-70,-44 L-20,-26 M70,-44 L20,-26" stroke={INK} strokeWidth={14} strokeLinecap="round" />
				<ellipse cx={-40} cy={-6} rx={11} ry={13} fill={INK} />
				<ellipse cx={40} cy={-6} rx={11} ry={13} fill={INK} />
				<ellipse cx={0} cy={28} rx={22} ry={26} fill="#e06a6a" stroke={INK} strokeWidth={5} />
				<ellipse cx={0} cy={76} rx={40} ry={22 + 8 * Math.abs(Math.sin(t * 10))} fill="#5a1a24" stroke={INK} strokeWidth={5} />
				<ellipse cx={0} cy={-88} rx={150} ry={26} fill="#3a2a1e" stroke={INK} strokeWidth={W} />
				<path d="M-90,-92 Q-96,-196 0,-200 Q96,-196 90,-92 Z" fill="#4a3424" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<rect x={-90} y={-118} width={180} height={20} fill="#26180f" />
				{rage > 0.5 ? [-1, 1].map((k) => <path key={k} d={`M${k * 130},-60 q${k * 30},-30 ${k * 10},-70 q${k * 30},-20 ${k * 20},-60`} stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.5 + 0.5 * Math.sin(t * 8)} />) : null}
			</g>
		</svg>
	);
};

