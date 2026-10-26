import React from 'react';
import {INK, clamp01, easeOut, lerp} from './gfx';
import {SKIN, SKIN_D, W} from './draw';
import {PAL} from '../theme';

// conman-russell cast: our own drawn conman (no likeness of the real Steven Russell — owner brief: no photos, film stills or
// mugshots), a Texas jail guard and the props of the four tricks. Same «Pig War v3» look as chars.tsx: flat fills, INK outline W,
// every figure drawn in its own units with (0, 0) at the feet and placed with x, y, s.

export type Outfit = 'white' | 'workman' | 'judge' | 'scrubs' | 'doctor';
export type ConPose = 'walk' | 'stand' | 'wave' | 'salute' | 'phone' | 'finger' | 'reach';

const OUT: Record<Outfit, {top: string; topD: string; leg: string; legD: string; shoe: string}> = {
	white: {top: '#F4F1EA', topD: '#D6CFC0', leg: '#EDE8DD', legD: '#CFC7B6', shoe: '#2a2a30'},
	workman: {top: '#3F6FB5', topD: '#2C5290', leg: '#8C8F96', legD: '#6E7178', shoe: '#3a2a20'},
	judge: {top: '#1E1B24', topD: '#0F0D14', leg: '#1E1B24', legD: '#0F0D14', shoe: '#111'},
	scrubs: {top: '#3BAA7E', topD: '#2C8A63', leg: '#3BAA7E', legD: '#2C8A63', shoe: '#2a2a30'},
	doctor: {top: '#FAFAF7', topD: '#DAD8D0', leg: '#3BAA7E', legD: '#2C8A63', shoe: '#2a2a30'},
};
const HAIR = '#3b2a20';
export const GREEN = OUT.scrubs.top;

/** the conman's head: dark side-parted hair, raised brow, sly half-smile; grin 0..1 widens it, wink 0..1 closes the right eye */
export const ConHead: React.FC<{cx?: number; cy?: number; r?: number; grin?: number; wink?: number; wig?: boolean; mask?: number; look?: number; hair?: string}> = ({cx = 0, cy = 0, r = 1, grin = 0.3, wink = 0, wig, mask = 0, look = 0, hair = HAIR}) => (
	<g transform={`translate(${cx} ${cy}) scale(${r})`}>
		<rect x={-26} y={56} width={52} height={44} fill={SKIN_D} stroke={INK} strokeWidth={W} />
		{wig ? (
			<g>
				{[-1, 1].map((k) =>
					[0, 1, 2].map((j) => <circle key={`${k}${j}`} cx={k * (78 + j * 6)} cy={-10 + j * 40} r={30} fill="#F2EEE6" stroke={INK} strokeWidth={5} />),
				)}
			</g>
		) : null}
		<ellipse cx={0} cy={0} rx={72} ry={84} fill={SKIN} stroke={INK} strokeWidth={W + 1} />
		<ellipse cx={-72} cy={6} rx={12} ry={20} fill={SKIN_D} stroke={INK} strokeWidth={4} />
		<ellipse cx={72} cy={6} rx={12} ry={20} fill={SKIN_D} stroke={INK} strokeWidth={4} />
		{wig ? (
			<path d="M-80,-30 Q-86,-112 0,-118 Q86,-112 80,-30 Q60,-70 0,-74 Q-60,-70 -80,-30 Z" fill="#F2EEE6" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
		) : (
			<path d="M-74,-14 Q-84,-96 -6,-104 Q74,-108 76,-20 Q58,-62 18,-66 Q-20,-48 -54,-58 Q-70,-40 -74,-14 Z" fill={hair} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
		)}
		{/* brows: left level, right raised (the sly look) */}
		<path d="M-50,-30 L-16,-26" stroke={INK} strokeWidth={10} strokeLinecap="round" />
		<path d="M16,-34 Q34,-46 52,-38" stroke={INK} strokeWidth={10} strokeLinecap="round" fill="none" />
		<ellipse cx={-30 + look * 6} cy={-4} rx={9} ry={11} fill={INK} />
		{wink > 0.5 ? <path d="M18,-4 Q32,4 46,-4" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" /> : <ellipse cx={32 + look * 6} cy={-4} rx={9} ry={11 * (1 - wink)} fill={INK} />}
		<path d="M-6,4 Q-14,30 4,34" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
		{mask > 0 ? (
			<g opacity={mask}>
				<path d="M-62,18 Q0,8 62,18 L56,64 Q0,84 -56,64 Z" fill="#9fd8c6" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<path d="M-62,24 L-72,8 M62,24 L72,8" stroke={INK} strokeWidth={4} />
			</g>
		) : (
			<path d={`M-26,${50 - grin * 4} Q${4},${62 + grin * 16} ${34 + grin * 6},${40 - grin * 6}`} stroke={INK} strokeWidth={7} fill={grin > 0.6 ? '#fff' : 'none'} strokeLinecap="round" />
		)}
	</g>
);

/** the conman, full figure. walk: leg swing + bob (pockets = hands in pockets) */
export const Con: React.FC<{x: number; y: number; s?: number; t: number; outfit?: Outfit; pose?: ConPose; pockets?: boolean; grin?: number; wink?: number; flip?: boolean; speed?: number; look?: number; mask?: number; hair?: string}> = ({
	x, y, s = 1, t, outfit = 'white', pose = 'stand', pockets, grin = 0.3, wink = 0, flip, speed = 1, look = 0, mask = 0, hair,
}) => {
	const o = OUT[outfit];
	const walking = pose === 'walk';
	const ph = t * 5.2 * speed;
	const sw = walking ? Math.sin(ph) * 16 : 0;
	const bob = walking ? Math.abs(Math.cos(ph)) * -10 : Math.sin(t * 2.2) * 2;
	const wave = Math.sin(t * 12) * 14;
	const robe = outfit === 'judge';
	const coat = outfit === 'doctor';
	const arm = (side: -1 | 1, kind: 'down' | 'pocket' | 'up' | 'phone' | 'finger' | 'salute' | 'reach') => {
		const sx = side * 92;
		const fill = robe ? o.top : coat ? o.top : side < 0 ? o.topD : o.top;
		if (kind === 'pocket') return <path d={`M${sx},-610 Q${sx + side * 34},-500 ${side * 70},-400 L${side * 40},-402 Q${sx - side * 4},-500 ${sx - side * 24},-590 Z`} fill={fill} stroke={INK} strokeWidth={W} strokeLinejoin="round" />;
		if (kind === 'up') return (
			<g>
				<path d={`M${sx},-610 L${sx + side * 70},${-800 + wave * 0.3} L${sx + side * 38},${-812 + wave * 0.3} L${sx - side * 22},-580 Z`} fill={fill} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<g transform={`rotate(${wave} ${sx + side * 56} ${-830})`}><circle cx={sx + side * 56} cy={-836} r={30} fill={SKIN} stroke={INK} strokeWidth={W} /></g>
			</g>
		);
		if (kind === 'salute') return (
			<g>
				<path d={`M${sx},-610 L${sx + side * 30},-700 L${side * 52},-790 L${side * 30},-800 L${sx - side * 22},-680 L${sx - side * 22},-580 Z`} fill={fill} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d={`M${side * 30},-808 L${side * 92},-822`} stroke={INK} strokeWidth={28} strokeLinecap="round" />
				<path d={`M${side * 30},-808 L${side * 92},-822`} stroke={SKIN} strokeWidth={17} strokeLinecap="round" />
			</g>
		);
		if (kind === 'phone') return (
			<g>
				<path d={`M${sx},-610 L${sx + side * 20},-690 L${side * 70},-760 L${side * 46},-778 L${sx - side * 20},-680 L${sx - side * 22},-580 Z`} fill={fill} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<rect x={side * 40 - 22} y={-830} width={44} height={120} rx={18} fill="#22222a" stroke={INK} strokeWidth={5} transform={`rotate(${side * -20} ${side * 40} -770)`} />
				<circle cx={side * 60} cy={-770} r={28} fill={SKIN} stroke={INK} strokeWidth={W} />
			</g>
		);
		if (kind === 'reach') return (
			<g>
				<path d={`M${sx + side * 14},-628 L${side * 196},-842 L${side * 150},-880 L${sx - side * 46},-596 Z`} fill={fill} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<circle cx={side * 176} cy={-866} r={32} fill={SKIN} stroke={INK} strokeWidth={W} />
			</g>
		);
		if (kind === 'finger') return (
			<g>
				<path d={`M${sx},-610 L${sx + side * 120},-560 L${sx + side * 120},-520 L${sx - side * 10},-560 Z`} fill={fill} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<circle cx={sx + side * 140} cy={-540} r={28} fill={SKIN} stroke={INK} strokeWidth={W} />
				<path d={`M${sx + side * 150},-552 L${sx + side * 200},-560`} stroke={INK} strokeWidth={20} strokeLinecap="round" />
				<path d={`M${sx + side * 150},-552 L${sx + side * 200},-560`} stroke={SKIN} strokeWidth={10} strokeLinecap="round" />
			</g>
		);
		const a = walking ? -sw * side * 0.8 : 0;
		return (
			<g transform={`rotate(${a} ${sx} -610)`}>
				<path d={`M${sx},-610 Q${sx + side * 30},-500 ${sx + side * 14},-380 L${sx - side * 18},-382 Q${sx - side * 4},-500 ${sx - side * 24},-590 Z`} fill={fill} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<circle cx={sx} cy={-372} r={28} fill={SKIN} stroke={INK} strokeWidth={W} />
			</g>
		);
	};
	type ArmKind = 'down' | 'pocket' | 'up' | 'phone' | 'finger' | 'salute' | 'reach';
	const lk: ArmKind = pockets ? 'pocket' : pose === 'phone' ? 'down' : pose === 'finger' ? 'finger' : 'down';
	const rk: ArmKind = pockets ? 'pocket' : pose === 'wave' ? 'up' : pose === 'salute' ? 'salute' : pose === 'phone' ? 'phone' : pose === 'finger' ? 'finger' : pose === 'reach' ? 'reach' : 'down';
	return (
		<svg width={760 * s} height={1000 * s} viewBox="-380 -920 760 1000" style={{position: 'absolute', left: x - 380 * s, top: y - 920 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
			<ellipse cx={0} cy={0} rx={150} ry={22} fill="rgba(0,0,0,0.28)" />
			<g transform={`translate(0 ${bob})`}>
				{/* legs */}
				{[-1, 1].map((k) => (
					<g key={k} transform={`rotate(${sw * k} ${k * 40} -330)`}>
						<rect x={k * 40 - 34} y={-342} width={68} height={322} rx={22} fill={k < 0 ? o.legD : o.leg} stroke={INK} strokeWidth={W} />
						<path d={`M${k * 40 - 38},-26 L${k * 40 + 48},-26 Q${k * 40 + 64},4 ${k * 40 + 40},6 L${k * 40 - 38},6 Z`} fill={o.shoe} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					</g>
				))}
				<g transform="translate(0 50)">
				{arm(-1, lk)}
				{/* torso */}
				{robe ? (
					<path d="M-110,-640 Q0,-672 110,-640 L150,-200 L-150,-200 Z" fill={o.top} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				) : (
					<path d="M-104,-640 Q0,-672 104,-640 L88,-372 L-88,-372 Z" fill={o.top} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				)}
				{outfit === 'white' ? <path d="M-34,-650 L0,-600 L34,-650" stroke={o.topD} strokeWidth={10} fill="none" /> : null}
				{outfit === 'scrubs' || outfit === 'doctor' ? <path d="M-40,-652 L0,-590 L40,-652" stroke={OUT.scrubs.topD} strokeWidth={12} fill="none" /> : null}
				{outfit === 'scrubs' ? <rect x={30} y={-590} width={46} height={40} rx={6} fill={OUT.scrubs.topD} stroke={INK} strokeWidth={4} /> : null}
				{coat ? (
					<g>
						<path d="M-104,-640 L-30,-650 L-20,-372 L-88,-372 Z M104,-640 L30,-650 L20,-372 L88,-372 Z" fill="#fff" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<path d="M-40,-640 Q-60,-520 -10,-500 Q40,-520 30,-600" stroke="#555" strokeWidth={9} fill="none" />
						<circle cx={-6} cy={-498} r={16} fill="#9aa3ad" stroke={INK} strokeWidth={4} />
					</g>
				) : null}
				{outfit === 'workman' ? <rect x={-88} y={-392} width={176} height={26} fill="#2a2a2a" stroke={INK} strokeWidth={4} /> : null}
				{robe ? <path d="M-30,-650 L0,-610 L30,-650" fill="#fff" stroke={INK} strokeWidth={4} /> : null}
				{arm(1, rk)}
				<ConHead cy={-760} grin={grin} wink={wink} wig={robe} mask={mask} look={look} hair={hair} />
				</g>
			</g>
		</svg>
	);
};

/** a Texas jail guard: grey-blue shirt, navy cap with a gold badge, moustache, keys. pose door = left arm out to the door edge */
export const Guard: React.FC<{x: number; y: number; s?: number; t: number; pose?: 'door' | 'bow' | 'stand' | 'look' | 'nod'; bow?: number; flip?: boolean; smile?: number; squint?: number; bust?: boolean; asleep?: boolean; startle?: number}> = ({x, y, s = 1, t, pose = 'stand', bow = 0, flip, smile = 0.5, squint = 0, bust, asleep, startle = 0}) => {
	const shirt = '#6E7F8D';
	const shirtD = '#55636F';
	const trou = '#1F2C3A';
	const nod = pose === 'nod' ? Math.max(0, Math.sin(t * 9)) * 10 : 0;
	const b = pose === 'bow' ? bow : 0;
	return (
		<svg width={760 * s} height={1000 * s} viewBox="-380 -920 760 1000" style={{position: 'absolute', left: x - 380 * s, top: y - 920 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
			{bust ? null : <ellipse cx={0} cy={0} rx={160} ry={22} fill="rgba(0,0,0,0.28)" />}
			{bust ? null : (
				<g>
					<rect x={-80} y={-342} width={72} height={322} rx={22} fill={trou} stroke={INK} strokeWidth={W} />
					<rect x={8} y={-342} width={72} height={322} rx={22} fill={trou} stroke={INK} strokeWidth={W} />
					<rect x={-86} y={-30} width={84} height={34} rx={12} fill="#111" stroke={INK} strokeWidth={W} />
					<rect x={4} y={-30} width={84} height={34} rx={12} fill="#111" stroke={INK} strokeWidth={W} />
				</g>
			)}
			<g transform={`translate(0 50) rotate(${b * 22} 0 -380)`}>
				<path d="M-118,-640 Q0,-676 118,-640 L100,-372 L-100,-372 Z" fill={shirt} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<rect x={-104} y={-404} width={208} height={34} fill="#2a2016" stroke={INK} strokeWidth={4} />
				<circle cx={-60} cy={-386} r={10} fill={PAL.gold} />
				{/* keys */}
				<g transform={`rotate(${Math.sin(t * 3) * 8} 70 -380)`}>
					<circle cx={70} cy={-356} r={16} fill="none" stroke="#c9ccd2" strokeWidth={6} />
					<path d="M64,-340 L60,-300 M76,-340 L84,-306" stroke="#c9ccd2" strokeWidth={8} strokeLinecap="round" />
				</g>
				{/* star badge on the chest */}
				<path d="M-58,-590 l10,22 24,2 -18,16 6,24 -22,-12 -22,12 6,-24 -18,-16 24,-2 Z" fill={PAL.gold} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<path d="M0,-650 L0,-380" stroke={shirtD} strokeWidth={6} />
				{/* arms */}
				{pose === 'door' ? (
					<g>
						<path d="M-110,-620 L-300,-560 L-296,-520 L-100,-560 Z" fill={shirtD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={-312} cy={-540} r={30} fill={SKIN_D} stroke={INK} strokeWidth={W} />
					</g>
				) : (
					<g transform={`rotate(${pose === 'bow' ? -30 * b : 0} -110 -620)`}>
						<path d="M-110,-620 Q-140,-500 -120,-390 L-88,-392 Q-104,-500 -84,-590 Z" fill={shirtD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
						<circle cx={-104} cy={-380} r={28} fill={SKIN_D} stroke={INK} strokeWidth={W} />
					</g>
				)}
				<g transform={`rotate(${pose === 'bow' ? 40 * b : 0} 110 -620)`}>
					<path d="M110,-620 Q140,-500 120,-390 L88,-392 Q104,-500 84,-590 Z" fill={shirtD} stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<circle cx={104} cy={-380} r={28} fill={SKIN_D} stroke={INK} strokeWidth={W} />
				</g>
				{/* head */}
				<g transform={`translate(0 ${-768 + nod})`}>
					<rect x={-28} y={56} width={56} height={46} fill={SKIN_D} stroke={INK} strokeWidth={W} />
					<ellipse cx={0} cy={0} rx={78} ry={86} fill={SKIN_D} stroke={INK} strokeWidth={W + 1} />
					{asleep ? (
						<g>
							<path d="M-46,-8 Q-31,4 -16,-8 M16,-8 Q31,4 46,-8" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
						</g>
					) : squint > 0.5 ? (
						<g>
							<path d="M-46,-6 L-16,-6 M16,-6 L46,-6" stroke={INK} strokeWidth={8} strokeLinecap="round" />
						</g>
					) : (
						<g>
							<ellipse cx={-30} cy={-6} rx={9} ry={11} fill={INK} />
							<ellipse cx={30} cy={-6} rx={9} ry={11} fill={INK} />
						</g>
					)}
					<path d={`M-48,${-30 - startle * 16} L-14,${-24 - startle * 20} M14,${-24 - startle * 20} L48,${-30 - startle * 16}`} stroke={INK} strokeWidth={10} strokeLinecap="round" />
					{asleep ? [0, 1, 2].map((i) => {
						const a = (t * 0.8 + i / 3) % 1;
						return <text key={i} x={70 + a * 90} y={-60 - a * 160} fontFamily="Alfa Slab One" fontSize={34 + a * 26} fill="#fff" stroke={INK} strokeWidth={5} paintOrder="stroke" opacity={1 - a}>z</text>;
					}) : null}
					<ellipse cx={0} cy={20} rx={16} ry={18} fill="#c98a63" stroke={INK} strokeWidth={4} />
					<path d="M-46,44 Q-24,30 0,40 Q24,30 46,44 Q24,56 0,48 Q-24,56 -46,44 Z" fill="#4a2e1c" stroke={INK} strokeWidth={4} />
					<path d={`M-22,64 Q0,${66 + smile * 14} 22,64`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
					{/* peaked cap */}
					<path d="M-84,-46 Q-80,-120 0,-124 Q80,-120 84,-46 Z" fill="#1F2C3A" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<path d="M-90,-46 L96,-46 Q110,-30 70,-24 L-90,-30 Z" fill="#111821" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<path d="M0,-104 l7,14 16,1 -12,10 4,16 -15,-9 -15,9 4,-16 -12,-10 16,-1 Z" fill={PAL.gold} stroke={INK} strokeWidth={3} />
				</g>
			</g>
		</svg>
	);
};

/** a steel prison door seen from the front, hinged on its left edge; open 0..1 swings it toward the camera */
export const SteelDoor: React.FC<{x: number; y: number; w: number; h: number; open: number; inside?: React.ReactNode; light?: number}> = ({x, y, w, h, open, inside, light = 0}) => {
	const k = easeOut(open);
	const dw = lerp(w, w * 0.18, k);
	return (
		<div style={{position: 'absolute', left: x - w / 2, top: y - h, width: w, height: h}}>
			{/* doorway: what is behind the door */}
			<div style={{position: 'absolute', inset: 0, background: '#0b0f16', overflow: 'hidden', boxShadow: `inset 0 0 0 10px ${INK}`}}>
				{inside}
				<div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 60%, rgba(255,240,200,${0.55 * light}) 0%, rgba(0,0,0,0) 70%)`}} />
			</div>
			{/* the leaf, shrinking toward the hinge = swinging out */}
			<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<path d={`M0,0 L${dw},${-k * 40} L${dw},${h + k * 40} L0,${h} Z`} fill="#5d6b78" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
				<path d={`M${dw * 0.18},${h * 0.12 - k * 8} L${dw * 0.82},${h * 0.1 - k * 30} L${dw * 0.82},${h * 0.36 - k * 22} L${dw * 0.18},${h * 0.36 - k * 6} Z`} fill="#0b0f16" stroke={INK} strokeWidth={6} />
				{[0.3, 0.5, 0.7].map((f) => (
					<line key={f} x1={dw * f} y1={h * 0.11 - k * 20 * f} x2={dw * f} y2={h * 0.36 - k * 14 * f} stroke="#9aa3ad" strokeWidth={8} />
				))}
				{[0.06, 0.94].map((fy) => [0.1, 0.5, 0.9].map((fx) => <circle key={`${fy}${fx}`} cx={dw * fx} cy={h * fy + (fx - 0.5) * 0} r={7} fill="#3c4650" />))}
				<rect x={dw * 0.78} y={h * 0.52} width={Math.max(6, dw * 0.1)} height={h * 0.08} rx={6} fill="#c9ccd2" stroke={INK} strokeWidth={4} />
			</svg>
		</div>
	);
};

/** a cinder-block prison wall (flat drawn), slowly lit; tone = 'navy' | 'cell' */
export const BlockWall: React.FC<{t: number; tone?: 'navy' | 'cell' | 'warm'; light?: [number, number]}> = ({tone = 'navy', light = [540, 600]}) => {
	const base = tone === 'cell' ? '#5b6470' : tone === 'warm' ? '#7a6a58' : '#33475f';
	const line = tone === 'cell' ? '#454d58' : tone === 'warm' ? '#5e5143' : '#26364a';
	const rows = 22;
	return (
		<div style={{position: 'absolute', inset: 0, background: base, overflow: 'hidden'}}>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{Array.from({length: rows}, (_, r) => (
					<g key={r}>
						<line x1={0} y1={r * 92} x2={1080} y2={r * 92} stroke={line} strokeWidth={6} />
						{Array.from({length: 6}, (_, c) => {
							const xx = c * 216 + (r % 2 ? 108 : 0);
							return <line key={c} x1={xx} y1={r * 92} x2={xx} y2={r * 92 + 92} stroke={line} strokeWidth={6} />;
						})}
					</g>
				))}
			</svg>
			<div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${light[0]}px ${light[1]}px, rgba(255,235,190,0.28) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)`}} />
		</div>
	);
};

/** tally marks scratched into a wall: n full marks, the newest one (index n−1) scratched in over [t0, t0+0.25] and glowing orange */
export const Tally: React.FC<{t: number; n: number; t0: number; x: number; y: number; h?: number; gap?: number; glow?: boolean; stagger?: number}> = ({t, n, t0, x, y, h = 300, gap = 64, glow = true, stagger = 0}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
		{Array.from({length: n}, (_, i) => {
			const start = stagger ? t0 + i * stagger : i === n - 1 ? t0 : -1;
			const k = start < 0 ? 1 : clamp01((t - start) / 0.2);
			if (k <= 0) return null;
			const x0 = x + i * gap;
			const newest = stagger ? true : i === n - 1;
			const g = newest && glow ? clamp01(1 - (t - start - 0.2) / 1.2) : 0;
			const yTop = y - h / 2 + Math.sin(i * 7.1) * 10;
			const yEnd = yTop + h * k;
			return (
				<g key={i}>
					{g > 0 ? <line x1={x0} y1={yTop} x2={x0 + 6} y2={yEnd} stroke={PAL.orange} strokeWidth={34} strokeLinecap="round" opacity={0.45 * g} style={{filter: 'blur(10px)'}} /> : null}
					<line x1={x0} y1={yTop} x2={x0 + 6} y2={yEnd} stroke="#1a2230" strokeWidth={20} strokeLinecap="round" />
					<line x1={x0 - 2} y1={yTop} x2={x0 + 4} y2={yEnd} stroke={g > 0 ? PAL.orange : '#e8e2d4'} strokeWidth={10} strokeLinecap="round" />
				</g>
			);
		})}
	</svg>
);

/** police walkie-talkie (black, antenna, red LED) at (x, y) = centre, rot degrees */
export const Radio: React.FC<{x: number; y: number; s?: number; rot?: number; led?: number}> = ({x, y, s = 1, rot = 0, led = 0}) => (
	<svg width={300 * s} height={500 * s} viewBox="-150 -300 300 500" style={{position: 'absolute', left: x - 150 * s, top: y - 300 * s, overflow: 'visible', transform: `rotate(${rot}deg)`}}>
		<rect x={30} y={-280} width={22} height={160} rx={10} fill="#22222a" stroke={INK} strokeWidth={5} />
		<rect x={-70} y={-150} width={140} height={300} rx={26} fill="#2b2b33" stroke={INK} strokeWidth={W} />
		<rect x={-48} y={-110} width={96} height={70} rx={10} fill="#8fd18f" stroke={INK} strokeWidth={4} />
		{[0, 1, 2, 3].map((i) => <line key={i} x1={-44} y1={-10 + i * 26} x2={44} y2={-10 + i * 26} stroke="#16161c" strokeWidth={10} strokeLinecap="round" />)}
		<circle cx={40} cy={-132} r={10} fill={led > 0.5 ? '#ff3b3b' : '#5a1a1a'} style={led > 0.5 ? {filter: 'drop-shadow(0 0 10px #ff3b3b)'} : undefined} />
	</svg>
);

/** concentric rings on glass from a tap at (x, y), t = seconds since the tap */
export const Ripple: React.FC<{x: number; y: number; a: number}> = ({x, y, a}) => {
	if (a < 0 || a > 0.6) return null;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
			{[0, 0.12, 0.24].map((d) => {
				const k = clamp01((a - d) / 0.4);
				return k > 0 && k < 1 ? <ellipse key={d} cx={x} cy={y} rx={30 + k * 170} ry={20 + k * 110} fill="none" stroke="#fff" strokeWidth={8 * (1 - k)} opacity={1 - k} /> : null;
			})}
		</svg>
	);
};

/** a green felt-tip marker, cap off; rot degrees */
export const Marker: React.FC<{x: number; y: number; s?: number; rot?: number; cap?: boolean}> = ({x, y, s = 1, rot = 0, cap}) => (
	<svg width={120 * s} height={460 * s} viewBox="-60 -230 120 460" style={{position: 'absolute', left: x - 60 * s, top: y - 230 * s, overflow: 'visible', transform: `rotate(${rot}deg)`}}>
		<path d="M-14,200 L14,200 L8,226 L-8,226 Z" fill={GREEN} stroke={INK} strokeWidth={4} />
		<rect x={-34} y={-200} width={68} height={400} rx={14} fill="#f3f3f0" stroke={INK} strokeWidth={W} />
		<rect x={-34} y={-60} width={68} height={70} fill={GREEN} stroke={INK} strokeWidth={4} />
		{cap ? <rect x={-38} y={120} width={76} height={110} rx={14} fill={GREEN} stroke={INK} strokeWidth={W} /> : null}
	</svg>
);

/** a living town seen through an open door, drawn into a w × h box: sky, sun, skyline with lit windows, drifting clouds,
 *  birds, a road with a car driving past (owner 25.10: «живой город» behind the front door, not an empty light) */
export const Town: React.FC<{t: number; w: number; h: number}> = ({t, w, h}) => {
	const road = h * 0.8;
	const B = [[0, 0.42, 0.2], [0.16, 0.3, 0.17], [0.3, 0.5, 0.22], [0.5, 0.36, 0.16], [0.64, 0.56, 0.2], [0.82, 0.4, 0.2]];
	const car = ((t * 0.55) % 1.4) - 0.2;
	return (
		<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0}}>
			<defs>
				<linearGradient id="townsky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#7cc4f2" />
					<stop offset="1" stopColor="#fff2cf" />
				</linearGradient>
			</defs>
			<rect x={0} y={0} width={w} height={h} fill="url(#townsky)" />
			<circle cx={w * 0.78} cy={h * 0.14} r={w * 0.11} fill="#ffd75a" />
			{[0, 1].map((i) => {
				const cx = ((t * 18 + i * w * 0.6) % (w + 240)) - 120;
				return <g key={i} transform={`translate(${cx} ${h * (0.1 + i * 0.12)})`} opacity={0.95}><ellipse cx={0} cy={0} rx={70} ry={26} fill="#fff" /><ellipse cx={-36} cy={10} rx={46} ry={20} fill="#fff" /><ellipse cx={40} cy={8} rx={50} ry={22} fill="#fff" /></g>;
			})}
			{[0, 1, 2].map((i) => {
				const bx = ((t * 60 + i * 50) % (w + 100)) - 50;
				const by = h * 0.24 + Math.sin(t * 3 + i) * 10 + i * 18;
				const f = Math.sin(t * 14 + i) * 7;
				return <path key={i} d={`M${bx - 14},${by - f} Q${bx - 6},${by - 6} ${bx},${by} Q${bx + 6},${by - 6} ${bx + 14},${by - f}`} stroke="#2a3240" strokeWidth={4} fill="none" strokeLinecap="round" />;
			})}
			{B.map(([bx, bh, bw], i) => (
				<g key={i}>
					<rect x={bx * w} y={road - bh * h} width={bw * w} height={bh * h} fill={['#c97b52', '#8fa3b8', '#d9b26f', '#6f8fae', '#b9634a', '#a3b48c'][i]} stroke={INK} strokeWidth={4} />
					{Array.from({length: Math.floor((bh * h) / 46)}, (_, r) =>
						Array.from({length: Math.max(1, Math.floor((bw * w) / 34))}, (_, c) => (
							<rect key={`${r}${c}`} x={bx * w + 8 + c * 34} y={road - bh * h + 12 + r * 46} width={18} height={24} fill={(r * 7 + c * 3 + i) % 5 ? '#fff6d8' : '#3a4250'} opacity={0.9} />
						)),
					)}
				</g>
			))}
			<rect x={0} y={road} width={w} height={h - road} fill="#4a4f58" />
			<line x1={0} y1={road + (h - road) * 0.5} x2={w} y2={road + (h - road) * 0.5} stroke="#f4f1ea" strokeWidth={6} strokeDasharray="28 22" strokeDashoffset={-t * 80} />
			<g transform={`translate(${car * w} ${road + (h - road) * 0.3})`}>
				<rect x={-70} y={-34} width={140} height={44} rx={14} fill="#e0303f" stroke={INK} strokeWidth={4} />
				<rect x={-40} y={-62} width={80} height={34} rx={10} fill="#e0303f" stroke={INK} strokeWidth={4} />
				<rect x={-32} y={-56} width={64} height={22} rx={6} fill="#bfe6ff" />
				<circle cx={-40} cy={12} r={14} fill="#222" stroke={INK} strokeWidth={4} />
				<circle cx={40} cy={12} r={14} fill="#222" stroke={INK} strokeWidth={4} />
			</g>
		</svg>
	);
};

/** small chalk doodles that label the tally marks (what each escape was): radio, phone, marker, heart line, or «?» */
export const Doodle: React.FC<{kind: 'radio' | 'phone' | 'marker' | 'heart' | 'q'; x: number; y: number; s?: number; o?: number; color?: string}> = ({kind, x, y, s = 1, o = 1, color = '#efe9dc'}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: o, overflow: 'visible'}}>
		<g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
			{kind === 'radio' ? <g><rect x={-22} y={-30} width={44} height={70} rx={8} /><line x1={10} y1={-30} x2={10} y2={-62} /><line x1={-12} y1={4} x2={12} y2={4} /><line x1={-12} y1={20} x2={12} y2={20} /></g> : null}
			{kind === 'phone' ? <g><path d="M-36,-14 Q0,-44 36,-14 L28,0 Q0,-18 -28,0 Z" /><rect x={-20} y={4} width={40} height={30} rx={6} /></g> : null}
			{kind === 'marker' ? <g transform="rotate(35)"><rect x={-12} y={-44} width={24} height={70} rx={6} /><path d="M-8,26 L0,46 L8,26" /></g> : null}
			{kind === 'heart' ? <path d="M-44,0 L-22,0 L-12,-28 L2,30 L14,-12 L22,0 L44,0" /> : null}
			{kind === 'q' ? <g><path d="M-18,-22 Q-18,-44 2,-44 Q22,-44 22,-24 Q22,-8 2,0 L2,14" /><circle cx={2} cy={34} r={3} fill={color} /></g> : null}
		</g>
	</svg>
);
