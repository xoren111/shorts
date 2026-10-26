import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {clamp01, easeInOut, easeOut, lerp, INK, GOLD} from './gfx';
import island from '../data/island.json';

// v3 «drawn» kit (owner 22.10 night: maps only in the opening, draw the rest ourselves instead of archive photos, AI frames
// only at the key moments). Flat vector pieces with a thick ink outline — the same ink as our captions — in a bright palette:
// US navy, UK red, gold, the channel's violet. Everything here moves; nothing is a still.

export const NAVY = '#2c4fb0';
export const NAVY_D = '#16245a';
export const RED = '#e0303f';
export const RED_D = '#8a1222';
export const CREAM = '#fff4dc';
export const SKIN = '#f3c29a';
export const SKIN_D = '#d99a73';
export const W = 6;   // ink stroke width

export const sin = Math.sin;
export const pulse = (t: number, f = 1) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * f);
/** 0→1 over [a, a + d] with an overshoot (pop) */
export const popK = (t: number, a: number, d = 0.35) => {
	const x = (t - a) / d;
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	return 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);
};

const BG: Record<string, [string, string]> = {
	us: ['#3d63d1', '#101a45'],
	uk: ['#f0424f', '#5c0a16'],
	violet: ['#8a5cf0', '#24104f'],
	gold: ['#ffcf4a', '#b4560f'],
	sea: ['#43b6f0', '#0d3c7a'],
	night: ['#4a2f9a', '#0c0626'],
	de: ['#3a3a3a', '#0b0b0b'],
};

/** background: radial gradient + slowly turning sun-rays + drifting dots (the energy under every drawn scene) */
export const Bg: React.FC<{kind: keyof typeof BG | string; t: number; rays?: boolean; cx?: number; cy?: number}> = ({kind, t, rays = true, cx = 540, cy = 900}) => {
	const [a, b] = BG[kind] ?? BG.violet;
	const n = 18;
	return (
		<AbsoluteFill style={{background: `radial-gradient(circle at ${cx}px ${cy}px, ${a} 0%, ${b} 78%)`, overflow: 'hidden'}}>
			{rays ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.16}}>
					<g transform={`translate(${cx} ${cy}) rotate(${t * 9})`}>
						{Array.from({length: n}, (_, i) => {
							const a0 = (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
							const R = 2600;
							return <path key={i} d={`M0,0 L${Math.cos(a0) * R},${Math.sin(a0) * R} L${Math.cos(a1) * R},${Math.sin(a1) * R} Z`} fill="#fff" />;
						})}
					</g>
				</svg>
			) : null}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.22}}>
				{Array.from({length: 26}, (_, i) => {
					const x = ((i * 397) % 1080 + t * (14 + (i % 5) * 6)) % 1140 - 30;
					const y = ((i * 733) % 1920 - t * (20 + (i % 7) * 5) + 3840) % 1980 - 30;
					return <circle key={i} cx={x} cy={y} r={3 + (i % 4) * 2} fill="#fff" />;
				})}
			</svg>
		</AbsoluteFill>
	);
};

/** a PNG flag waving on a pole: 18 vertical strips on a travelling sine, darker in the folds; pole + gold finial */
/** height / width of each flag file (public/flags, Commons renders) — flags are always drawn in their true proportions */
const FLAG_ASPECT: Record<string, number> = {'flags/us_1859.png': 674 / 1280, 'flags/union_jack.png': 0.6, 'flags/german_empire.png': 854 / 1280};

/** `rise` 0→1: with a pole the cloth is hoisted up the pole (proportions never change); without a pole it scales in uniformly */
export const Flag: React.FC<{src: string; t: number; x: number; y: number; w: number; amp?: number; pole?: number; rise?: number}> = ({src, t, x, y, w, amp = 1, pole = 0, rise = 1}) => {
	const N = 18;
	const sw = w / N;
	const h = w * (FLAG_ASPECT[src] ?? 0.6);
	const r = clamp01(rise);
	const hoist = pole ? (1 - r) * (pole + h * 0.6) : 0;
	return (
		<div style={{position: 'absolute', left: x, top: y, width: w + 40, height: h + pole + 40, transform: pole ? undefined : `scale(${r})`, transformOrigin: '0% 50%', opacity: pole ? clamp01(r * 4) : 1}}>
			{pole ? (
				<>
					<div style={{position: 'absolute', left: -9, top: -8, width: 18, height: h + pole + 8, background: '#8a5a2b', border: `5px solid ${INK}`, borderRadius: 9}} />
					<div style={{position: 'absolute', left: -17, top: -34, width: 34, height: 34, borderRadius: 17, background: GOLD, border: `5px solid ${INK}`}} />
				</>
			) : null}
			{Array.from({length: N}, (_, i) => {
				const k = i / (N - 1);
				const ph = t * 6 - i * 0.55;
				const dy = Math.sin(ph) * 16 * amp * k;
				const shade = 0.5 + 0.5 * Math.cos(ph);
				return (
					<div key={i} style={{position: 'absolute', left: i * sw, top: dy + hoist, width: sw + 1, height: h, overflow: 'hidden'}}>
						<Img src={staticFile(src)} style={{position: 'absolute', left: -i * sw, top: 0, width: w, height: h}} />
						<div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.22 * (1 - shade) * k})`}} />
						<div style={{position: 'absolute', inset: 0, background: `rgba(255,255,255,${0.14 * shade * k})`}} />
					</div>
				);
			})}
			<div style={{position: 'absolute', left: 0, top: hoist, width: 5, height: h, background: INK}} />
		</div>
	);
};

/** the $10 gold «eagle», drawn: reeded rim, 13 stars, «10 DOLLARS»; spins (flip) with `turn` (0 = face, 1 = one full flip) */
export const Coin: React.FC<{x: number; y: number; r: number; turn?: number; rot?: number; shine?: number}> = ({x, y, r, turn = 0, rot = 0, shine = 0}) => {
	const c = Math.cos(turn * Math.PI * 2);
	const sx = Math.max(0.06, Math.abs(c));
	return (
		<svg width={r * 2 + 40} height={r * 2 + 40} viewBox={`${-r - 20} ${-r - 20} ${r * 2 + 40} ${r * 2 + 40}`} style={{position: 'absolute', left: x - r - 20, top: y - r - 20, overflow: 'visible', transform: `rotate(${rot}deg) scaleX(${sx})`}}>
			<defs>
				<radialGradient id="cg" cx="38%" cy="32%" r="75%">
					<stop offset="0%" stopColor="#fff3a6" />
					<stop offset="45%" stopColor="#f6c13a" />
					<stop offset="100%" stopColor="#b76d0c" />
				</radialGradient>
			</defs>
			<circle r={r} fill="url(#cg)" stroke={INK} strokeWidth={W} />
			{Array.from({length: 72}, (_, i) => {
				const a = (i / 72) * Math.PI * 2;
				return <line key={i} x1={Math.cos(a) * r * 0.9} y1={Math.sin(a) * r * 0.9} x2={Math.cos(a) * r * 0.97} y2={Math.sin(a) * r * 0.97} stroke="#8f520a" strokeWidth={2.5} />;
			})}
			<circle r={r * 0.86} fill="none" stroke="#9c5d0d" strokeWidth={4} />
			{Array.from({length: 13}, (_, i) => {
				const a = (-200 + (i / 12) * 220) * (Math.PI / 180);
				const sx_ = Math.cos(a) * r * 0.72, sy_ = Math.sin(a) * r * 0.72;
				return <text key={i} x={sx_} y={sy_ + r * 0.05} fontSize={r * 0.16} textAnchor="middle" fill="#9c5d0d" fontFamily="serif">★</text>;
			})}
			<text y={r * 0.2} fontSize={r * 0.78} textAnchor="middle" fill="#8f4f06" fontFamily="'Anton', sans-serif" style={{paintOrder: 'stroke', stroke: '#ffe58a', strokeWidth: 3}}>
				10
			</text>
			<text y={r * 0.5} fontSize={r * 0.15} textAnchor="middle" fill="#8f4f06" fontFamily="'Montserrat', sans-serif" fontWeight={800} letterSpacing={3}>
				DOLLARS
			</text>
			<ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.35} ry={r * 0.12} fill="#fff" opacity={0.25 + 0.4 * shine} transform="rotate(-30)" />
		</svg>
	);
};

/** a little soldier (side 'us' = kepi, navy coat, sky-blue trousers; 'uk' = shako, scarlet coat, white cross-belts) */
export const Soldier: React.FC<{side: 'us' | 'uk'; x: number; y: number; s?: number; step?: number; flip?: boolean}> = ({side, x, y, s = 1, step = 0, flip}) => {
	const us = side === 'us';
	const coat = us ? NAVY : RED;
	const trou = us ? '#8fb3e6' : '#2a2a3a';
	const swing = Math.sin(step * Math.PI * 2) * 14;
	const bob = Math.abs(Math.sin(step * Math.PI * 2)) * -4;
	return (
		<svg width={120 * s} height={240 * s} viewBox="-60 -150 120 240" style={{position: 'absolute', left: x - 60 * s, top: y - 150 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
			<g transform={`translate(0 ${bob})`}>
				<line x1={-6} y1={30} x2={-6 + swing} y2={78} stroke={trou} strokeWidth={14} strokeLinecap="round" />
				<line x1={8} y1={30} x2={8 - swing} y2={78} stroke={trou} strokeWidth={14} strokeLinecap="round" />
				<path d="M-24,-34 Q0,-44 24,-34 L22,36 L-22,36 Z" fill={coat} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				{us ? <line x1={-22} y1={8} x2={22} y2={8} stroke="#1b1b1b" strokeWidth={6} /> : <path d="M-20,-30 L20,30 M20,-30 L-20,30" stroke="#fff" strokeWidth={6} />}
				<line x1={26} y1={-70} x2={20} y2={40} stroke="#6b3e1c" strokeWidth={7} strokeLinecap="round" />
				<line x1={26} y1={-70} x2={27} y2={-92} stroke="#b9c1c9" strokeWidth={3} />
				<circle cx={0} cy={-56} r={20} fill={SKIN} stroke={INK} strokeWidth={W} />
				<circle cx={7} cy={-58} r={3} fill={INK} />
				{us ? (
					<path d="M-20,-66 L-17,-88 Q0,-96 17,-88 L20,-66 Z M14,-66 L34,-62" fill={NAVY_D} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				) : (
					<g>
						<rect x={-19} y={-112} width={38} height={46} rx={4} fill="#1d1d24" stroke={INK} strokeWidth={W} />
						<circle cx={0} cy={-92} r={7} fill={GOLD} />
						<rect x={-6} y={-122} width={12} height={10} fill="#fff" stroke={INK} strokeWidth={3} />
					</g>
				)}
			</g>
		</svg>
	);
};

/** a field cannon on its carriage */
export const Cannon: React.FC<{x: number; y: number; s?: number; recoil?: number}> = ({x, y, s = 1, recoil = 0}) => (
	<svg width={220 * s} height={140 * s} viewBox="-110 -80 220 140" style={{position: 'absolute', left: x - 110 * s, top: y - 80 * s, overflow: 'visible'}}>
		<g transform={`translate(${-recoil * 18} 0)`}>
			<rect x={-70} y={-40} width={150} height={30} rx={14} fill="#3a3530" stroke={INK} strokeWidth={W} transform="rotate(-12)" />
			<path d="M-60,-10 L20,-10 L-20,30 Z" fill="#7a4a24" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			<circle cx={-10} cy={20} r={34} fill="#7a4a24" stroke={INK} strokeWidth={W} />
			{Array.from({length: 6}, (_, i) => {
				const a = (i / 6) * Math.PI;
				return <line key={i} x1={-10 + Math.cos(a) * 30} y1={20 + Math.sin(a) * 30} x2={-10 - Math.cos(a) * 30} y2={20 - Math.sin(a) * 30} stroke={INK} strokeWidth={4} />;
			})}
			<circle cx={-10} cy={20} r={7} fill={INK} />
		</g>
	</svg>
);

/** a Royal Navy steam-and-sail warship (black hull, white gun-port stripe, three masts, funnel, Union Jack); bobs on its own */
export const Ship: React.FC<{x: number; y: number; s?: number; t: number; ports?: number; seed?: number}> = ({x, y, s = 1, t, ports = 1, seed = 0}) => {
	const bob = Math.sin(t * 2.2 + seed) * 6;
	const roll = Math.sin(t * 1.7 + seed) * 1.6;
	return (
		<svg width={640 * s} height={560 * s} viewBox="-320 -460 640 560" style={{position: 'absolute', left: x - 320 * s, top: y - 460 * s, overflow: 'visible'}}>
			<g transform={`translate(0 ${bob}) rotate(${roll})`}>
				{[-150, 0, 140].map((mx, i) => (
					<g key={i}>
						<line x1={mx} y1={0} x2={mx} y2={-400 + i * 30} stroke="#5a3a1e" strokeWidth={9} />
						{[0, 1, 2].map((k) => {
							const yy = -330 + i * 30 + k * 95, ww = 120 - k * 18;
							return <path key={k} d={`M${mx - ww / 2},${yy} Q${mx},${yy - 14 + Math.sin(t * 3 + i + k) * 6} ${mx + ww / 2},${yy} L${mx + ww / 2 - 8},${yy + 78} Q${mx},${yy + 92 + Math.sin(t * 3 + i + k) * 6} ${mx - ww / 2 + 8},${yy + 78} Z`} fill={CREAM} stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
						})}
					</g>
				))}
				<rect x={52} y={-120} width={30} height={90} fill="#262626" stroke={INK} strokeWidth={5} />
				{[0, 1, 2].map((k) => {
					const p = ((t * 0.6 + k / 3 + seed * 0.1) % 1);
					return <circle key={k} cx={67 - p * 120} cy={-130 - p * 160} r={18 + p * 40} fill="#e8e3ee" opacity={0.75 * (1 - p)} stroke={INK} strokeWidth={3} />;
				})}
				<path d="M-280,-10 L290,-10 L250,70 L-240,70 Z" fill="#1c1c22" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<rect x={-262} y={8} width={530} height={22} fill="#f2efe6" stroke={INK} strokeWidth={4} />
				{Array.from({length: 11}, (_, i) => (
					<g key={i}>
						<rect x={-240 + i * 47} y={11} width={22} height={16} fill="#111" />
						{ports > 0 ? <rect x={-236 + i * 47} y={17} width={26 * ports} height={6} fill="#4a4a4a" /> : null}
					</g>
				))}
				<path d="M-280,-10 L-320,-40 L-280,-24 Z" fill="#1c1c22" stroke={INK} strokeWidth={4} />
			</g>
		</svg>
	);
};

/** wavy sea band (layers drift sideways) from y to the bottom */
export const Sea: React.FC<{t: number; y: number; color?: string}> = ({t, y, color = '#1f7fd0'}) => (
	<svg width={1080} height={1920 - y + 40} style={{position: 'absolute', left: 0, top: y - 40}}>
		{[0, 1, 2].map((k) => {
			const yy = 40 + k * 70, ph = t * (1.2 + k * 0.4) + k;
			let d = `M0,${yy}`;
			for (let x = 0; x <= 1080; x += 30) d += ` L${x},${yy + Math.sin(x / 70 + ph) * 12}`;
			d += ` L1080,2000 L0,2000 Z`;
			return <path key={k} d={d} fill={k === 0 ? color : k === 1 ? '#1868b2' : '#0f4f8e'} stroke={INK} strokeWidth={k === 0 ? 5 : 0} />;
		})}
	</svg>
);

/** San Juan Island, traced from the DEM (data/island.json): green fill, beach rim, drop shadow; `split` 0..1 tints it US/UK */
export const Island: React.FC<{x: number; y: number; w: number; t: number; tintL?: string; tintR?: string; tint?: number; crack?: number}> = ({x, y, w, t, tintL = RED, tintR = NAVY, tint = 0, crack = 0}) => {
	const iw = island.w, ih = island.h;
	const h = (w * ih) / iw;
	return (
		<svg width={w} height={h} viewBox={`0 0 ${iw} ${ih}`} style={{position: 'absolute', left: x - w / 2, top: y - h / 2, overflow: 'visible'}}>
			<defs>
				<clipPath id="isl">
					<path d={island.path} />
				</clipPath>
			</defs>
			<path d={island.path} fill="#0b3a6e" opacity={0.35} transform="translate(14 22)" />
			<path d={island.path} fill="#f1dd9a" stroke={INK} strokeWidth={14} strokeLinejoin="round" />
			<path d={island.path} fill="#5cc45a" transform={`translate(${iw * 0.03} ${ih * 0.03}) scale(0.94)`} />
			<g clipPath="url(#isl)">
				{Array.from({length: 14}, (_, i) => (
					<circle key={i} cx={iw * (0.2 + ((i * 37) % 60) / 100)} cy={ih * (0.15 + ((i * 53) % 70) / 100)} r={22 + (i % 3) * 8} fill="#2f8f3e" opacity={0.7 * (1 - tint)} />
				))}
				{/* the claim: each half fills with its country's colour (flat, with a soft diagonal sheen), a white dashed line between */}
				<rect x={0} y={0} width={iw * 0.5 + 2} height={ih} fill={tintL} opacity={0.9 * tint} />
				<rect x={iw * 0.5} y={0} width={iw * 0.5} height={ih} fill={tintR} opacity={0.9 * tint} />
				{Array.from({length: 16}, (_, i) => <rect key={i} x={-ih + i * 120} y={0} width={34} height={ih * 2} fill="#fff" opacity={0.08 * tint} transform={`rotate(30 ${iw / 2} ${ih / 2})`} />)}
				{crack > 0 ? (
					<g opacity={crack}>
						<path d={`M${iw * 0.5},-20 Q${iw * 0.47},${ih * 0.5} ${iw * 0.5},${ih + 20}`} stroke={INK} strokeWidth={22} fill="none" />
						<path d={`M${iw * 0.5},-20 Q${iw * 0.47},${ih * 0.5} ${iw * 0.5},${ih + 20}`} stroke="#fff" strokeWidth={12} fill="none" strokeDasharray="42 26" strokeDashoffset={-t * 60} />
					</g>
				) : null}
			</g>
			<path d={island.path} fill="none" stroke="#fff" strokeWidth={5} opacity={0.5 + 0.3 * Math.sin(t * 3)} transform={`translate(${iw * 0.03} ${ih * 0.03}) scale(0.94)`} />
		</svg>
	);
};

/** an AI frame (owner's Google Flow) set into the drawn world as a card: thick white border + ink outline + shadow */
export const Card: React.FC<{src: string; x: number; y: number; w: number; h: number; rot?: number; s?: number; focus?: [number, number]; zoom?: number; round?: boolean}> = ({src, x, y, w, h, rot = 0, s = 1, focus = [0.5, 0.4], zoom = 1, round}) => (
	<div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg) scale(${s})`, borderRadius: round ? w : 34, overflow: 'hidden', border: '12px solid #fffaf0', boxShadow: `0 0 0 6px ${INK}, 0 24px 50px rgba(0,0,0,0.5)`, background: '#222'}}>
		<Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${zoom})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`}} />
	</div>
);

/** a flat caricature bust: governor (top hat, grey sideburns), admiral (bicorne, epaulettes, white whiskers), kaiser (Pickelhaube, white chops) */
export const Bust: React.FC<{who: 'governor' | 'admiral' | 'kaiser'; x: number; y: number; s?: number; t: number; shake?: number; point?: number; frown?: number}> = ({who, x, y, s = 1, t, shake = 0, point = 0, frown = 1}) => {
	const coat = who === 'governor' ? '#23232b' : NAVY_D;
	const hair = who === 'governor' ? '#b9b6b0' : '#f4f2ee';
	const turn = Math.sin(t * 14) * 9 * shake;
	const breathe = Math.sin(t * 2.4) * 4;
	return (
		<svg width={760 * s} height={900 * s} viewBox="-380 -560 760 900" style={{position: 'absolute', left: x - 380 * s, top: y - 560 * s, overflow: 'visible'}}>
			<g transform={`translate(0 ${breathe})`}>
				<path d="M-270,340 Q-260,40 -120,10 L120,10 Q260,40 270,340 Z" fill={coat} stroke={INK} strokeWidth={W + 2} strokeLinejoin="round" />
				{who === 'governor' ? <path d="M-50,10 L0,90 L50,10 Z" fill="#fff" stroke={INK} strokeWidth={W} /> : <path d="M-70,10 L0,70 L70,10 Z" fill={GOLD} stroke={INK} strokeWidth={W} />}
				{who !== 'governor' ? (
					<>
						<path d="M-250,60 Q-200,20 -140,40 L-150,90 Q-210,90 -250,60 Z" fill={GOLD} stroke={INK} strokeWidth={W} />
						<path d="M250,60 Q200,20 140,40 L150,90 Q210,90 250,60 Z" fill={GOLD} stroke={INK} strokeWidth={W} />
						{[0, 1, 2].map((k) => <circle key={k} cx={0} cy={130 + k * 60} r={12} fill={GOLD} stroke={INK} strokeWidth={4} />)}
					</>
				) : null}
				{point > 0 ? (
					<g transform={`rotate(${lerp(40, -8, point)} 200 80)`}>
						<path d="M150,60 L430,40 L430,90 L170,120 Z" fill={coat} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={445} cy={62} r={30} fill={SKIN} stroke={INK} strokeWidth={W} />
						<path d="M465,52 L520,46" stroke={INK} strokeWidth={22} strokeLinecap="round" />
						<path d="M465,52 L520,46" stroke={SKIN} strokeWidth={12} strokeLinecap="round" />
					</g>
				) : null}
				{who === 'admiral' && point === 0 ? (
					<g>
						<path d="M-200,170 Q0,110 200,170 L190,230 Q0,180 -190,230 Z" fill={coat} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={-190} cy={200} r={30} fill={SKIN} stroke={INK} strokeWidth={W} />
						<circle cx={190} cy={200} r={30} fill={SKIN} stroke={INK} strokeWidth={W} />
					</g>
				) : null}
				<g transform={`rotate(${turn} 0 -150)`}>
					<rect x={-38} y={-40} width={76} height={60} fill={SKIN_D} stroke={INK} strokeWidth={W} />
					<ellipse cx={0} cy={-190} rx={150} ry={175} fill={SKIN} stroke={INK} strokeWidth={W + 2} />
					<path d="M-150,-210 Q-190,-90 -120,-40 Q-100,-120 -110,-200 Z" fill={hair} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<path d="M150,-210 Q190,-90 120,-40 Q100,-120 110,-200 Z" fill={hair} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					{who === 'kaiser' ? <path d="M-110,-90 Q-60,-50 0,-80 Q60,-50 110,-90 Q90,-40 0,-55 Q-90,-40 -110,-90 Z" fill={hair} stroke={INK} strokeWidth={W} strokeLinejoin="round" /> : null}
					<path d={`M-95,${-250 + frown * 6} L-35,${-232 - frown * 10}`} stroke={INK} strokeWidth={16} strokeLinecap="round" />
					<path d={`M95,${-250 + frown * 6} L35,${-232 - frown * 10}`} stroke={INK} strokeWidth={16} strokeLinecap="round" />
					<ellipse cx={-62} cy={-200} rx={14} ry={18} fill={INK} />
					<ellipse cx={62} cy={-200} rx={14} ry={18} fill={INK} />
					<ellipse cx={0} cy={-150} rx={26} ry={34} fill={SKIN_D} stroke={INK} strokeWidth={W - 1} />
					<path d={`M-45,-85 Q0,${-85 - 22 * frown + 22 * (1 - frown)} 45,-85`} stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" />
					{who === 'governor' ? (
						<g>
							<rect x={-130} y={-450} width={260} height={210} rx={10} fill="#18181d" stroke={INK} strokeWidth={W} />
							<rect x={-130} y={-290} width={260} height={30} fill="#6a1a1a" />
							<ellipse cx={0} cy={-245} rx={200} ry={30} fill="#18181d" stroke={INK} strokeWidth={W} />
						</g>
					) : who === 'admiral' ? (
						<g>
							<path d="M-260,-270 Q0,-470 260,-270 Q0,-310 -260,-270 Z" fill="#141418" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
							<path d="M-240,-282 Q0,-300 240,-282" stroke={GOLD} strokeWidth={10} fill="none" />
							<circle cx={0} cy={-330} r={22} fill={GOLD} stroke={INK} strokeWidth={4} />
						</g>
					) : (
						<g>
							<path d="M-150,-250 Q-150,-400 0,-410 Q150,-400 150,-250 Z" fill="#141418" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
							<rect x={-20} y={-520} width={40} height={116} rx={14} fill={GOLD} stroke={INK} strokeWidth={W} />
							<path d="M0,-560 L22,-516 L-22,-516 Z" fill={GOLD} stroke={INK} strokeWidth={4} />
							<path d="M-70,-350 Q0,-400 70,-350 L50,-290 Q0,-270 -50,-290 Z" fill={GOLD} stroke={INK} strokeWidth={W} />
							<path d="M-170,-250 L170,-250" stroke={INK} strokeWidth={16} strokeLinecap="round" />
						</g>
					)}
				</g>
			</g>
		</svg>
	);
};

/** a tin mug with a ribbon in the drinker's colour */
export const Mug: React.FC<{x: number; y: number; s?: number; rot?: number; color: string}> = ({x, y, s = 1, rot = 0, color}) => (
	<svg width={260 * s} height={300 * s} viewBox="-130 -150 260 300" style={{position: 'absolute', left: x - 130 * s, top: y - 150 * s, overflow: 'visible', transform: `rotate(${rot}deg)`}}>
		<path d="M50,-60 Q120,-60 120,0 Q120,60 50,60" stroke={INK} strokeWidth={26} fill="none" />
		<path d="M50,-60 Q120,-60 120,0 Q120,60 50,60" stroke="#c9ced6" strokeWidth={14} fill="none" />
		<path d="M-80,-110 L80,-110 L66,120 Q0,138 -66,120 Z" fill="#c9ced6" stroke={INK} strokeWidth={W + 2} strokeLinejoin="round" />
		<path d="M-62,-80 L-52,100" stroke="#fff" strokeWidth={10} opacity={0.6} strokeLinecap="round" />
		<rect x={-78} y={-20} width={150} height={40} fill={color} stroke={INK} strokeWidth={W} />
		<ellipse cx={0} cy={-110} rx={80} ry={22} fill="#fff7e0" stroke={INK} strokeWidth={W} />
		<ellipse cx={0} cy={-118} rx={70} ry={14} fill="#fff" />
	</svg>
);

/** a firework burst at (x, y), age a (s) */
export const Burst: React.FC<{x: number; y: number; a: number; color: string; r?: number}> = ({x, y, a, color, r = 170}) => {
	if (a < 0 || a > 1.2) return null;
	const k = easeOut(a / 0.8);
	const o = clamp01((1.2 - a) / 0.5);
	return (
		<svg width={r * 3} height={r * 3} viewBox={`${-r * 1.5} ${-r * 1.5} ${r * 3} ${r * 3}`} style={{position: 'absolute', left: x - r * 1.5, top: y - r * 1.5, opacity: o}}>
			{Array.from({length: 16}, (_, i) => {
				const ang = (i / 16) * Math.PI * 2;
				const r0 = r * k * 0.55, r1 = r * k;
				return <line key={i} x1={Math.cos(ang) * r0} y1={Math.sin(ang) * r0 + a * 30} x2={Math.cos(ang) * r1} y2={Math.sin(ang) * r1 + a * 40} stroke={color} strokeWidth={10} strokeLinecap="round" />;
			})}
		</svg>
	);
};

/** confetti rain (both flags' colours) */
export const Confetti: React.FC<{t: number; t0: number; n?: number}> = ({t, t0, n = 60}) => {
	const a = t - t0;
	if (a < 0) return null;
	const cols = [RED, NAVY, '#fff', GOLD];
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			{Array.from({length: n}, (_, i) => {
				const x = (i * 211) % 1080 + Math.sin(a * 3 + i) * 30;
				const y = -60 + ((i * 97) % 500) * -1 + a * (520 + (i % 5) * 90);
				return <rect key={i} x={x} y={y} width={18} height={30} fill={cols[i % 4]} stroke={INK} strokeWidth={3} transform={`rotate(${a * 300 + i * 40} ${x + 9} ${y + 15})`} />;
			})}
		</svg>
	);
};

/** red wax seal (wavy edge, crowned W), slams down at t0: drops from scale 3, impact rings */
export const Seal: React.FC<{x: number; y: number; r: number; t: number; t0: number}> = ({x, y, r, t, t0}) => {
	const a = t - t0;
	if (a < -0.25) return null;
	const k = clamp01((a + 0.25) / 0.25);
	const s = lerp(3.2, 1, easeInOut(k));
	const ring = a > 0 ? easeOut(a / 0.5) : 0;
	let d = '';
	for (let i = 0; i <= 48; i++) {
		const ang = (i / 48) * Math.PI * 2;
		const rr = r * (1 + 0.05 * Math.sin(ang * 9));
		d += `${i ? 'L' : 'M'}${Math.cos(ang) * rr},${Math.sin(ang) * rr} `;
	}
	return (
		<svg width={r * 6} height={r * 6} viewBox={`${-r * 3} ${-r * 3} ${r * 6} ${r * 6}`} style={{position: 'absolute', left: x - r * 3, top: y - r * 3, overflow: 'visible'}}>
			{a > 0 && a < 0.6 ? <circle r={r * (1 + ring * 1.6)} fill="none" stroke="#fff" strokeWidth={10 * (1 - ring)} opacity={1 - ring} /> : null}
			<g transform={`scale(${s})`} opacity={k}>
				<path d={d + 'Z'} fill="#c4142a" stroke={INK} strokeWidth={W} />
				<circle r={r * 0.72} fill="#a30e22" stroke="#7a0717" strokeWidth={4} />
				<path d={`M${-r * 0.36},${-r * 0.18} L${-r * 0.2},${r * 0.3} L0,${-r * 0.05} L${r * 0.2},${r * 0.3} L${r * 0.36},${-r * 0.18}`} stroke="#f0b6be" strokeWidth={r * 0.09} fill="none" strokeLinejoin="round" />
				<path d={`M${-r * 0.24},${-r * 0.34} L${-r * 0.12},${-r * 0.5} L0,${-r * 0.36} L${r * 0.12},${-r * 0.5} L${r * 0.24},${-r * 0.34} Z`} fill="#f0b6be" />
				<ellipse cx={-r * 0.3} cy={-r * 0.35} rx={r * 0.2} ry={r * 0.08} fill="#fff" opacity={0.35} transform="rotate(-30)" />
			</g>
		</svg>
	);
};

/** a paper document with lines and the island sketch (the arbitration award) */
export const Document: React.FC<{x: number; y: number; w: number; h: number; rot?: number; t: number}> = ({x, y, w, h, rot = 0, t}) => (
	<div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg)`, background: CREAM, border: `6px solid ${INK}`, borderRadius: 14, boxShadow: '0 30px 60px rgba(0,0,0,0.45)'}}>
		<svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
			{Array.from({length: 9}, (_, i) => (
				<line key={i} x1={w * 0.1} y1={h * (0.1 + i * 0.045)} x2={w * (i % 3 === 2 ? 0.6 : 0.9)} y2={h * (0.1 + i * 0.045)} stroke="#b9a47a" strokeWidth={8} strokeLinecap="round" />
			))}
		</svg>
		<div style={{position: 'absolute', left: 0, top: h * 0.12, width: w, height: h}}>
			<Island x={w / 2} y={h * 0.55} w={w * 0.55} t={t} tint={0} />
		</div>
	</div>
);
