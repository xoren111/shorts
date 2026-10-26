import React from 'react';
import {AbsoluteFill} from 'remotion';
import {W, We} from '../lib/time';
import {S} from '../data/shots';
import {INK, XF, clamp01, easeInOut, easeOut, lerp, pop, useT} from '../ui/gfx';

// Flat cutaway diagrams on a warm paper panel (channel style from «Rabbits»). Everything drawn here; no text.
const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
	<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #fff6e4 0%, #f3e3c6 60%, #e7cfa6 100%)'}}>{children}</AbsoluteFill>
);
const sw = 6;

/** side view of a 1960s cargo liner, bow → +x, waterline at y = 0; length ≈ 2·L */
const ShipSide: React.FC<{x: number; y: number; L?: number; hull?: string; fun?: string; rot?: number; sink?: number}> = ({x, y, L = 150, hull = '#1d1b24', fun = '#cf3b2e', rot = 0, sink = 0}) => {
	const h = L * 0.22;
	return (
		<g transform={`translate(${x} ${y + sink}) rotate(${rot})`}>
			<path d={`M ${-L} ${-h * 0.75} L ${L * 0.82} ${-h} L ${L} ${-h * 1.05} L ${L * 0.86} ${h * 0.55} L ${-L * 0.9} ${h * 0.55} Q ${-L * 1.02} ${h * 0.2} ${-L} ${-h * 0.75} Z`} fill={hull} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
			<rect x={-L * 0.92} y={h * 0.18} width={L * 1.78} height={h * 0.2} fill="#b8322a" />
			<rect x={-L * 0.5} y={-h * 1.75} width={L * 0.55} height={h} rx={6} fill="#f2ece0" stroke={INK} strokeWidth={sw} />
			<rect x={-L * 0.42} y={-h * 2.35} width={L * 0.36} height={h * 0.62} rx={6} fill="#f2ece0" stroke={INK} strokeWidth={sw} />
			<rect x={-L * 0.46} y={-h * 1.35} width={L * 0.47} height={h * 0.16} fill="#2a2440" />
			<path d={`M ${-L * 0.68} ${-h * 1.6} L ${-L * 0.52} ${-h * 1.6} L ${-L * 0.55} ${-h * 3.0} L ${-L * 0.7} ${-h * 3.0} Z`} fill={fun} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
			<path d={`M ${-L * 0.55} ${-h * 2.7} L ${-L * 0.55} ${-h * 3.0} L ${-L * 0.7} ${-h * 3.0} L ${-L * 0.69} ${-h * 2.7} Z`} fill="#15121a" />
			{[0.45, -0.85].map((m) => (
				<line key={m} x1={L * m} y1={-h * 0.9} x2={L * m} y2={-h * 3.2} stroke={INK} strokeWidth={sw - 1} strokeLinecap="round" />
			))}
		</g>
	);
};

const Bubbles: React.FC<{x: number; y: number; t: number; t0: number}> = ({x, y, t, t0}) => {
	const a = t - t0;
	if (a < 0 || a > 1.6) return null;
	return (
		<g>
			{Array.from({length: 9}, (_, i) => {
				const ph = (a * 1.4 + i / 9) % 1;
				const r = 8 + 10 * ((i * 37) % 5) / 5;
				return <circle key={i} cx={x + Math.sin(i * 2.1 + a * 5) * 40 + (i - 4) * 12} cy={y - ph * 330} r={r * (1 - ph * 0.4)} fill="rgba(255,255,255,0.75)" stroke="#2a8db0" strokeWidth={3} opacity={1 - ph} />;
			})}
		</g>
	);
};

/** S4 «Egypt sank ships to block the canal.» — side cutaway: two blockships tilt and sink at both ends, the convoy stuck between */
export const SinkScene: React.FC = () => {
	const t = useT();
	const [t0] = S.sink;
	const WL = 860; const BED = 1250;
	const s1 = easeInOut(clamp01((t - (W(22) - 0.05)) / 0.9));
	const s2 = easeInOut(clamp01((t - (W(25) - 0.15)) / 0.9));
	const conv = easeOut(clamp01((t - t0) / 1.6));
	const stop = clamp01((t - (W(25) + 0.4)) / 0.3);
	return (
		<Paper>
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<g transform="translate(540 940) scale(1.12) translate(-540 -1000)">
				{/* sand banks + sky band */}
				<rect x={0} y={0} width={1080} height={WL} fill="#f6e2b8" />
				<path d={`M0 ${WL} L1080 ${WL} L1080 1920 L0 1920 Z`} fill="#e6c58a" />
				{/* water body */}
				<path d={`M40 ${WL} L1040 ${WL} L1010 ${BED} Q540 ${BED + 60} 70 ${BED} Z`} fill="#4fb8cc" stroke={INK} strokeWidth={sw} />
				<path d={`M40 ${WL} L1040 ${WL}`} stroke="#bff0f4" strokeWidth={10} />
				{/* the convoy in the middle (small, fresh paint) */}
				{[0, 1, 2].map((i) => (
					<ShipSide key={i} x={lerp(300, 395, conv) + i * 145 + (stop > 0 && stop < 1 ? Math.sin(t * 40) * 3 : 0)} y={WL + 4} L={55} fun={['#3f7fc4', '#e8a43c', '#d63a3a'][i]} hull={['#1d1b24', '#2a2a31', '#1d1b24'][i]} />
				))}
				{/* blockships: north (right) and south (left) */}
				<g opacity={1}>
					<ShipSide x={880} y={WL + 8} L={100} hull="#6b4a35" fun="#5a3a2a" rot={lerp(0, 18, s1)} sink={lerp(0, BED - WL - 70, s1)} />
					<Bubbles x={880} y={BED - 80} t={t} t0={W(22) + 0.2} />
					<ShipSide x={200} y={WL + 8} L={100} hull="#6b4a35" fun="#5a3a2a" rot={lerp(0, -16, s2)} sink={lerp(0, BED - WL - 70, s2)} />
					<Bubbles x={200} y={BED - 80} t={t} t0={W(25) + 0.05} />
				</g>
				{/* red barrier marks once both are down (no text) */}
				{[[880, s1], [200, s2]].map(([x, k]) => (k as number) >= 1 ? (
					<g key={x as number} transform={`translate(${x} ${WL - 120}) scale(${pop(t, (x === 880 ? W(22) + 0.9 : W(25) + 0.75), 0.3)})`}>
						<circle r={54} fill="#fff" stroke="#e0392d" strokeWidth={12} />
						<line x1={-36} y1={36} x2={36} y2={-36} stroke="#e0392d" strokeWidth={12} strokeLinecap="round" />
					</g>
				) : null)}
				</g>
			</svg>
		</Paper>
	);
};

/** S9b «Their own stamps.» — a sewing machine needle punches the perforation between home-made stamps sliding under it,
 * then one stamp flies onto an envelope */
export const StampsScene: React.FC = () => {
	const t = useT();
	const [t0] = S.stamps;
	const a = t - t0;
	const slide = easeInOut(clamp01(a / 0.95));
	const needle = Math.abs(Math.sin(a * Math.PI * 9)) * 46;
	const NX = 727;                       // needle x
	const fly = easeInOut(clamp01((a - 0.95) / 0.35));
	const land = pop(t, t0 + 1.3, 0.25);
	return (
		<Paper>
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				{/* sewing machine (needle at x = 727) */}
				<g transform="translate(560 420)">
					<path d="M -260 230 L -260 -40 Q -260 -120 -180 -120 L 140 -120 Q 210 -120 210 -50 L 210 40 L 120 40 L 120 -30 L -170 -30 L -170 230 Z" fill="#2b2a33" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
					<path d="M -240 -100 L 180 -100" stroke="#ffc83a" strokeWidth={8} strokeLinecap="round" />
					<rect x={150} y={40 + needle * 0.4} width={34} height={60} rx={6} fill="#c9ced8" stroke={INK} strokeWidth={5} />
					<line x1={167} y1={100 + needle * 0.4} x2={167} y2={150 + needle} stroke={INK} strokeWidth={6} strokeLinecap="round" />
					<circle cx={-220} cy={-60} r={52} fill="#c9ced8" stroke={INK} strokeWidth={sw} />
					<g transform={`rotate(${a * 900} -220 -60)`}><line x1={-220} y1={-60} x2={-220} y2={-100} stroke={INK} strokeWidth={6} /></g>
					<rect x={-330} y={230} width={640} height={36} rx={10} fill="#8a5a3c" stroke={INK} strokeWidth={sw} />
				</g>
				{/* the stamp sheet slides under the needle; every edge that has passed it is perforated */}
				{[0, 1, 2, 3].map((i) => {
					const x = lerp(780, 330, slide) + i * 160;
					if (i === 0 && fly > 0) return null;
					return (
						<g key={i} transform={`translate(${x} 560) scale(0.85)`}>
							<Stamp perf={false} />
							{x + 68 < NX ? Array.from({length: 9}, (_, k) => <circle key={k} cx={88} cy={-90 + k * 22.5} r={5.5} fill="#f3e3c6" stroke={INK} strokeWidth={1.5} />) : null}
						</g>
					);
				})}
				{/* envelope + the flying stamp */}
				<g transform="translate(540 1220)">
					<rect x={-330} y={-190} width={660} height={380} rx={18} fill="#fffaf0" stroke={INK} strokeWidth={sw} />
					<path d="M -330 -190 L 0 40 L 330 -190" fill="none" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
				</g>
				{fly > 0 ? (
					<g transform={`translate(${lerp(330, 750, fly)} ${lerp(560, 1130, fly) - Math.sin(Math.PI * fly) * 160}) rotate(${lerp(0, 8, fly)}) scale(${lerp(0.85, 0.75, fly) * (1 + 0.15 * (1 - land) * (fly >= 1 ? 1 : 0))})`}>
						<Stamp />
					</g>
				) : null}
			</svg>
		</Paper>
	);
};

/** our own stamp design (no real GBLA artwork): yellow, an anchor over waves, perforated edge */
const Stamp: React.FC<{perf?: boolean}> = ({perf = true}) => (
	<g>
		<rect x={-75} y={-95} width={150} height={190} fill="#ffd54a" stroke={INK} strokeWidth={5} />
		{perf ? Array.from({length: 7}, (_, i) => <circle key={'t' + i} cx={-63 + i * 21} cy={-95} r={6} fill="#fffaf0" />) : null}
		{perf ? Array.from({length: 7}, (_, i) => <circle key={'b' + i} cx={-63 + i * 21} cy={95} r={6} fill="#fffaf0" />) : null}
		<rect x={-58} y={-78} width={116} height={156} fill="none" stroke="#8a5a1c" strokeWidth={4} />
		<g transform="translate(0 -12)" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round">
			<circle cx={0} cy={-38} r={10} />
			<line x1={0} y1={-28} x2={0} y2={34} />
			<line x1={-22} y1={-14} x2={22} y2={-14} />
			<path d="M -32 14 Q -30 40 0 40 Q 30 40 32 14" />
		</g>
		<path d="M -55 60 Q -38 50 -20 60 T 15 60 T 52 60" stroke="#2a8db0" strokeWidth={5} fill="none" />
	</g>
);

/** finale overlay: an app-style delivery-rating card with a crate icon and five EMPTY stars (the viewer rates in the comments) */
export const StarsCard: React.FC<{t0: number; t1: number}> = ({t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1) return null;
	const k = pop(t, t0, 0.4);
	const o = clamp01((t1 - t) / 0.3);
	return (
		<div style={{position: 'absolute', left: 540, top: 430, transform: `translate(-50%, -50%) scale(${k})`, opacity: o}}>
			<svg width={700} height={250} style={{overflow: 'visible', filter: 'drop-shadow(0 18px 40px rgba(10,0,30,0.55))'}}>
				<rect x={0} y={0} width={700} height={250} rx={44} fill="#fffaf0" stroke={INK} strokeWidth={7} />
				<g transform="translate(120 125)">
					<rect x={-62} y={-50} width={124} height={100} rx={10} fill="#c58b4d" stroke={INK} strokeWidth={6} />
					<line x1={-62} y1={-15} x2={62} y2={-15} stroke="#7a4a26" strokeWidth={6} />
					<line x1={-62} y1={18} x2={62} y2={18} stroke="#7a4a26" strokeWidth={6} />
					<circle cx={30} cy={-62} r={26} fill="#9fe3cf" stroke={INK} strokeWidth={5} />
					<line x1={30} y1={-62} x2={30} y2={-78} stroke={INK} strokeWidth={4} strokeLinecap="round" />
					<line x1={30} y1={-62} x2={42} y2={-58} stroke={INK} strokeWidth={4} strokeLinecap="round" />
				</g>
				{Array.from({length: 5}, (_, i) => {
					const ki = pop(t, t0 + 0.15 + i * 0.07, 0.3);
					const cx = 250 + i * 98;
					const pts = Array.from({length: 10}, (_, j) => {
						const r = j % 2 ? 18 : 42;
						const a = -Math.PI / 2 + (j * Math.PI) / 5;
						return `${cx + r * Math.cos(a)},${125 + r * Math.sin(a)}`;
					}).join(' ');
					return <polygon key={i} points={pts} fill="none" stroke="#e0a21f" strokeWidth={7} strokeLinejoin="round" transform={`translate(${cx} 125) scale(${ki}) translate(${-cx} -125)`} />;
				})}
			</svg>
		</div>
	);
};
