import React from 'react';
import {AbsoluteFill} from 'remotion';
import {W} from '../lib/time';
import {S} from '../data/shots';
import {INK, Label, XF, clamp01, easeInOut, easeOut, lerp, pop, useT} from '../ui/gfx';
import {VirusGlyph} from './Photos';

// Flat cutaway diagrams on a warm paper panel inside the channel's violet frame. Icons are drawn here (simple shapes, ink outline).
const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
	<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #fff6e4 0%, #f3e3c6 60%, #e7cfa6 100%)'}}>{children}</AbsoluteFill>
);
const sw = 5;

/** cartoon farm animals in a 200×170 box (origin = feet centre) */
export const Animal: React.FC<{kind: string; x: number; y: number; s?: number; step?: number}> = ({kind, x, y, s = 1, step = 0}) => {
	const leg = (lx: number, h: number, col: string, ph = 0) => (
		<rect x={lx - 7} y={-h} width={14} height={h} rx={6} fill={col} stroke={INK} strokeWidth={sw} transform={`rotate(${Math.sin(step * 12 + ph) * 14 * (step ? 1 : 0)} ${lx} ${-h})`} />
	);
	let g: React.ReactNode = null;
	if (kind === 'sheep') {
		g = (
			<>
				{leg(-38, 40, '#3a2e3a')}{leg(-14, 40, '#3a2e3a')}{leg(18, 40, '#3a2e3a')}{leg(42, 40, '#3a2e3a')}
				{[-50, -22, 6, 34, -36, -8, 20].map((cx, i) => <circle key={i} cx={cx} cy={i < 4 ? -72 : -98} r={30} fill="#fbf7ef" stroke={INK} strokeWidth={sw} />)}
				<ellipse cx={-6} cy={-84} rx={58} ry={34} fill="#fbf7ef" />
				<ellipse cx={66} cy={-96} rx={24} ry={30} fill="#3a2e3a" stroke={INK} strokeWidth={sw} />
				<ellipse cx={86} cy={-104} rx={14} ry={7} fill="#3a2e3a" stroke={INK} strokeWidth={4} transform="rotate(25 86 -104)" />
				<circle cx={72} cy={-104} r={5} fill="#fff" />
			</>
		);
	} else if (kind === 'horse') {
		g = (
			<>
				{leg(-46, 64, '#8a5232')}{leg(-24, 64, '#8a5232')}{leg(26, 64, '#8a5232')}{leg(48, 64, '#8a5232')}
				<path d="M -70 -110 q -26 30 -10 60" fill="none" stroke="#3b2418" strokeWidth={14} strokeLinecap="round" />
				<ellipse cx={0} cy={-96} rx={72} ry={38} fill="#a8653b" stroke={INK} strokeWidth={sw} />
				<path d="M 44 -112 L 72 -168 L 96 -160 L 74 -100 Z" fill="#a8653b" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
				<rect x={64} y={-188} width={58} height={34} rx={16} fill="#a8653b" stroke={INK} strokeWidth={sw} transform="rotate(18 93 -171)" />
				<path d="M 60 -170 q 14 30 6 62" fill="none" stroke="#3b2418" strokeWidth={10} strokeLinecap="round" />
				<circle cx={90} cy={-180} r={5} fill={INK} />
				<path d="M 76 -190 l 6 -18 l 8 16" fill="#a8653b" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
			</>
		);
	} else if (kind === 'dog') {
		g = (
			<>
				{leg(-32, 40, '#d9a35f')}{leg(-12, 40, '#d9a35f')}{leg(18, 40, '#d9a35f')}{leg(36, 40, '#d9a35f')}
				<path d="M -52 -70 q -30 -26 -22 -54" fill="none" stroke="#d9a35f" strokeWidth={14} strokeLinecap="round" />
				<path d="M -52 -70 q -30 -26 -22 -54" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" opacity={0} />
				<ellipse cx={0} cy={-64} rx={56} ry={28} fill="#e2b06b" stroke={INK} strokeWidth={sw} />
				<circle cx={54} cy={-100} r={30} fill="#e2b06b" stroke={INK} strokeWidth={sw} />
				<ellipse cx={82} cy={-92} rx={18} ry={12} fill="#f3d39f" stroke={INK} strokeWidth={4} />
				<circle cx={96} cy={-96} r={6} fill={INK} />
				<ellipse cx={40} cy={-104} rx={12} ry={26} fill="#8a5a32" stroke={INK} strokeWidth={4} transform="rotate(20 40 -104)" />
				<circle cx={62} cy={-110} r={5} fill={INK} />
			</>
		);
	} else if (kind === 'camel') {
		g = (
			<>
				{leg(-40, 76, '#d6a66a')}{leg(-20, 76, '#d6a66a')}{leg(22, 76, '#d6a66a')}{leg(42, 76, '#d6a66a')}
				<ellipse cx={0} cy={-100} rx={66} ry={32} fill="#e0b277" stroke={INK} strokeWidth={sw} />
				<ellipse cx={-8} cy={-130} rx={34} ry={30} fill="#e0b277" stroke={INK} strokeWidth={sw} />
				<path d="M 52 -108 q 34 -24 30 -76" fill="none" stroke={INK} strokeWidth={26} strokeLinecap="round" />
				<path d="M 52 -108 q 34 -24 30 -76" fill="none" stroke="#e0b277" strokeWidth={16} strokeLinecap="round" />
				<ellipse cx={96} cy={-188} rx={26} ry={15} fill="#e0b277" stroke={INK} strokeWidth={sw} />
				<circle cx={98} cy={-194} r={4.5} fill={INK} />
			</>
		);
	} else if (kind === 'goat') {
		g = (
			<>
				{leg(-32, 44, '#cfc8d4')}{leg(-12, 44, '#cfc8d4')}{leg(16, 44, '#cfc8d4')}{leg(34, 44, '#cfc8d4')}
				<ellipse cx={0} cy={-70} rx={52} ry={28} fill="#efe9f2" stroke={INK} strokeWidth={sw} />
				<path d="M 40 -84 L 56 -122 L 78 -116 L 66 -78 Z" fill="#efe9f2" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
				<ellipse cx={74} cy={-128} rx={26} ry={18} fill="#efe9f2" stroke={INK} strokeWidth={sw} transform="rotate(20 74 -128)" />
				<path d="M 70 -140 q -6 -30 -26 -34" fill="none" stroke="#7a6a5a" strokeWidth={8} strokeLinecap="round" />
				<path d="M 88 -118 l 2 24 l -12 -10 z" fill="#cfc8d4" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<circle cx={80} cy={-132} r={4.5} fill={INK} />
				<path d="M -52 -82 l -12 -14" stroke={INK} strokeWidth={6} strokeLinecap="round" />
			</>
		);
	} else if (kind === 'pig') {
		g = (
			<>
				{leg(-30, 30, '#f2a1b4')}{leg(-10, 30, '#f2a1b4')}{leg(14, 30, '#f2a1b4')}{leg(32, 30, '#f2a1b4')}
				<path d="M -58 -66 q -18 -6 -14 -20 q 4 -12 14 -2" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
				<ellipse cx={0} cy={-62} rx={58} ry={36} fill="#f7b3c3" stroke={INK} strokeWidth={sw} />
				<ellipse cx={60} cy={-66} rx={16} ry={20} fill="#f08aa0" stroke={INK} strokeWidth={sw} />
				<circle cx={56} cy={-70} r={4} fill={INK} /><circle cx={64} cy={-62} r={4} fill={INK} />
				<path d="M 26 -94 l 10 -24 l 12 22 z" fill="#f7b3c3" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<circle cx={38} cy={-80} r={5} fill={INK} />
			</>
		);
	} else if (kind === 'chicken') {
		g = (
			<>
				<path d={`M -12 0 l ${4 + Math.sin(step * 14) * 8} -34`} stroke="#ffb52e" strokeWidth={7} strokeLinecap="round" />
				<path d={`M 12 0 l ${-4 - Math.sin(step * 14) * 8} -34`} stroke="#ffb52e" strokeWidth={7} strokeLinecap="round" />
				<path d="M -46 -66 q -26 -30 -6 -56 q 16 18 22 36" fill="#fbf6ee" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
				<ellipse cx={0} cy={-60} rx={44} ry={34} fill="#fbf6ee" stroke={INK} strokeWidth={sw} />
				<circle cx={-28} cy={-108} r={24} fill="#fbf6ee" stroke={INK} strokeWidth={sw} />
				<path d="M -40 -130 q 6 -16 12 -2 q 6 -16 12 0 q 8 -10 8 6" fill="#e2342d" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<path d="M -52 -108 l -18 6 l 18 6 z" fill="#ffb52e" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<ellipse cx={-48} cy={-92} rx={6} ry={9} fill="#e2342d" stroke={INK} strokeWidth={3} />
				<circle cx={-34} cy={-112} r={4.5} fill={INK} />
				<ellipse cx={10} cy={-62} rx={22} ry={14} fill="#efe6d8" stroke={INK} strokeWidth={4} />
			</>
		);
	}
	return <g transform={`translate(${x}, ${y}) scale(${s})`}>{g}</g>;
};

const Shield: React.FC<{x: number; y: number; k: number; missing?: boolean}> = ({x, y, k, missing}) => {
	if (k <= 0) return null;
	return (
		<g transform={`translate(${x}, ${y}) scale(${k})`}>
			<path d="M 0 -46 L 38 -32 L 34 12 Q 26 40 0 52 Q -26 40 -34 12 L -38 -32 Z" fill={missing ? 'rgba(255,255,255,0.4)' : '#7B4DFF'} stroke={INK} strokeWidth={5} strokeLinejoin="round" strokeDasharray={missing ? '10 8' : undefined} />
			{missing ? <text x={0} y={18} fontSize={52} fontFamily="Anton" fill={INK} textAnchor="middle">?</text> : <path d="M -15 2 L -3 15 L 18 -12" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
		</g>
	);
};

/** S8 «The rules protected sheep, horses, dogs. They forgot birds.» — animals pop on their words (+ camel, goat, pig in the pause
 * after «dogs»), each gets a violet shield badge centred above its head (v5: badges sat on the animals' corners and read as falling
 * off); then the protected six step back up (smaller) and the chicken struts in to centre stage under a dashed «?» badge. */
export const ShieldsScene: React.FC = () => {
	const t = useT();
	const [t0, t1] = S.shields;
	const R1 = 560, R2 = 1000;
	const pos: [string, number, number, number][] = [
		['sheep', 190, R1, W(38) - 0.05], ['horse', 540, R1, W(39) - 0.05], ['dog', 885, R1, W(40) - 0.05],
		['camel', 190, R2, We39() + 0.12], ['goat', 540, R2, We39() + 0.27], ['pig', 885, R2, We39() + 0.42],
	];
	// «They forgot birds.»: the protected six step back (smaller, higher) and the chicken struts in to centre stage
	const ck = clamp01((t - (W(41) - 0.45)) / 0.9);
	const cx = lerp(1300, 540, easeOut(ck));
	const walking = ck < 1;
	const bob = walking ? Math.abs(Math.sin(t * 11)) * 10 : 0;
	const back = easeInOut(clamp01((t - (W(41) - 0.5)) / 0.5));
	return (
		<Paper>
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<g transform={`translate(540 ${lerp(700, 446, back)}) scale(${lerp(1, 0.58, back)}) translate(-540 -700)`} opacity={lerp(1, 0.85, back)}>
				{pos.map(([kind, x, y, ta], i) => {
					const k = easeOut((t - t0 - 0.25 - i * 0.09) / 0.35);
					const on = clamp01((t - ta - 0.18) / 0.25);
					return k > 0 ? <ellipse key={'slot' + kind} cx={x} cy={y - 80} rx={130 * k} ry={105 * k} fill={on > 0 ? `rgba(123,77,255,${0.1 * on})` : 'rgba(255,255,255,0.35)'} stroke={on > 0.5 ? '#7B4DFF' : '#b08a5a'} strokeWidth={5} strokeDasharray="16 12" /> : null;
				})}
				{pos.map(([kind, x, y, ta]) => {
					const k = pop(t, ta, 0.32);
					if (k <= 0) return null;
					return (
						<g key={kind}>
							<ellipse cx={x} cy={y + 8} rx={135 * k} ry={18 * k} fill="rgba(80,40,30,0.15)" />
							<Animal kind={kind} x={x - 14} y={y} s={1.45 * k} />
							<Shield x={x} y={y - 330} k={1.0 * pop(t, ta + 0.18, 0.3)} />
						</g>
					);
				})}
				</g>
				{ck > 0 ? (
					<g>
						<ellipse cx={cx} cy={1200} rx={170} ry={24} fill="rgba(80,40,30,0.18)" />
						<Animal kind="chicken" x={cx} y={1200 - bob} s={2.6} step={walking ? t : 0} />
						<Shield x={cx - 40} y={725} k={pop(t, W(42) - 0.05, 0.32) * 1.6} missing />
					</g>
				) : null}
			</svg>
		</Paper>
	);
};
const We39 = () => W(40) + 0.58;

/** S10a «It didn't catch on.» — two rabbit icons; the germ on the first; a dotted arrow towards the second fizzles out halfway */
const RabbitIcon: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
	<g transform={`translate(${x}, ${y}) scale(${s})`}>
		<ellipse cx={-30} cy={-150} rx={18} ry={52} fill="#a26f47" stroke={INK} strokeWidth={6} transform="rotate(-10 -30 -150)" />
		<ellipse cx={30} cy={-150} rx={18} ry={52} fill="#a26f47" stroke={INK} strokeWidth={6} transform="rotate(10 30 -150)" />
		<ellipse cx={-30} cy={-150} rx={8} ry={34} fill="#f4a9b4" transform="rotate(-10 -30 -150)" />
		<ellipse cx={30} cy={-150} rx={8} ry={34} fill="#f4a9b4" transform="rotate(10 30 -150)" />
		<ellipse cx={0} cy={-30} rx={78} ry={62} fill="#a26f47" stroke={INK} strokeWidth={6} />
		<circle cx={0} cy={-92} r={52} fill="#a26f47" stroke={INK} strokeWidth={6} />
		<ellipse cx={0} cy={-70} rx={28} ry={18} fill="#f3e3c9" />
		<circle cx={-20} cy={-100} r={7} fill={INK} /><circle cx={20} cy={-100} r={7} fill={INK} />
		<circle cx={-17} cy={-103} r={2.5} fill="#fff" /><circle cx={23} cy={-103} r={2.5} fill="#fff" />
		<ellipse cx={0} cy={-80} rx={7} ry={5} fill="#f08aa0" />
	</g>
);
export const FizzleScene: React.FC = () => {
	const t = useT();
	const [t0] = S.fizzle;
	const a = clamp01((t - t0 - 0.35) / 0.75);
	const reach = lerp(0, 0.5, easeOut(a));
	const puff = clamp01((t - t0 - 1.1) / 0.35);
	const x0 = 290, x1 = 790, y = 1000;
	const ax = lerp(x0 + 120, x1 - 120, reach * (1 - 0.15 * puff));
	return (
		<Paper>
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<RabbitIcon x={x0} y={1180} s={1.6} />
				<RabbitIcon x={x1} y={1180} s={1.6} />
				<VirusGlyph x={x0 + 80} y={y - 210} r={46} />
				<path d={`M ${x0 + 120} ${y - 190} Q ${(x0 + x1) / 2} ${y - 420} ${x1 - 120} ${y - 190}`} fill="none" stroke="#7B4DFF" strokeWidth={9} strokeDasharray="6 22" strokeLinecap="round" opacity={0.25} />
				<path d={`M ${x0 + 120} ${y - 190} Q ${(x0 + x1) / 2} ${y - 420} ${x1 - 120} ${y - 190}`} fill="none" stroke="#7B4DFF" strokeWidth={9} strokeDasharray={`6 22`} strokeLinecap="round" pathLength={1000} style={{strokeDasharray: `${reach * 1000} 1000`}} opacity={1 - puff} />
				{puff > 0 ? (
					<g transform={`translate(${ax}, ${y - 340}) scale(${0.9 + puff * 0.9})`} opacity={1 - puff * 0.8}>
						{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={Math.cos(i * 1.3) * 28} cy={Math.sin(i * 1.3) * 18} r={22} fill="#e9dcff" stroke={INK} strokeWidth={4} />)}
					</g>
				) : null}
			</svg>
		</Paper>
	);
};

/** S18 «And it worked.» — one bar with a rabbit on top shrinks to about two-fifths (≈ 60 % fewer nationwide); the rabbit leaps up in
 * fright as the bar drops away under it, hangs for a beat and lands on the new, lower top with a squash and a puff of dust (owner 19.10). */
export const BarScene: React.FC = () => {
	const t = useT();
	const [t0, t1] = S.bar;
	const TJ = t0 + 0.3;
	const k = easeInOut((t - TJ) / 0.8);
	const B = 1330, H0 = 700, H1 = 700 * 0.4;
	const h = lerp(H0, H1, k);
	// ballistic leap: from the old top (y0) up ~60 px (clear of the label) and down onto the new top (y1) in 0.9 s
	const y0 = B - H0 - 6, y1 = B - H1 - 6, TA = 0.9, G = 2172, VY = 510;
	const tau = t - TJ;
	let ry = B - h - 6, sx = 1, sy = 1, rot = 0;
	if (tau > 0 && tau < TA) {
		ry = Math.min(y1, y0 - (VY * tau - 0.5 * G * tau * tau));
		sx = 0.92; sy = 1.1;
		rot = Math.sin((tau / TA) * Math.PI) * -10;
	} else if (tau >= TA) {
		ry = y1;
		const q = clamp01((tau - TA) / 0.28);
		sy = 1 - 0.2 * Math.sin(q * Math.PI); sx = 1 + 0.16 * Math.sin(q * Math.PI);
	}
	const dust = clamp01((tau - TA) / 0.45);
	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #4a3aa6 0%, #2c1f78 45%, #140a3c 100%)'}}>
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<rect x={380} y={B - H0} width={320} height={H0} rx={18} fill="none" stroke="#fff3d6" strokeWidth={5} strokeDasharray="14 12" opacity={0.6} />
				<rect x={380} y={B - h} width={320} height={h} rx={18} fill="#fff3d6" stroke={INK} strokeWidth={7} />
				{dust > 0 && dust < 1 ? [-1, 1].map((d) => (
					<g key={d} opacity={1 - dust}>
						{[0, 1, 2].map((j) => <circle key={j} cx={540 + d * (70 + 90 * dust + j * 26)} cy={y1 - 8 - j * 10 - 20 * dust} r={14 + 10 * dust - j * 3} fill="#fff3d6" stroke={INK} strokeWidth={4} />)}
					</g>
				)) : null}
				<g transform={`translate(540 ${ry}) rotate(${rot}) scale(${sx} ${sy}) translate(-540 ${-ry})`}>
					<RabbitIcon x={540} y={ry} s={0.8} />
				</g>
			</svg>
			<Label text="≈ 60 % fewer" accent="nationwide" t0={t0 + 0.35} t1={t1 + 0.1} x={540} y={300} size={56} />
		</AbsoluteFill>
	);
};
