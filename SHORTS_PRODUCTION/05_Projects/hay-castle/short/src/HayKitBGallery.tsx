import React from 'react';
import {AbsoluteFill} from 'remotion';
import {PAL} from './theme';
import {INK, clamp01, easeInOut, easeOut, lerp, useT} from './ui/gfx';
import {SKIN, W} from './ui/draw';
import {MONT} from './fonts';
import {
	BatLawyer, Car, CourtPage, DoormatHome, Excavator, FieldBg, Gavel, GavelShadow, GiantPadlock, GiantStamp, Newt, PartyPopper,
	PictureFrame, PopConfetti, ProgressBar, RainButt, Season, StampPrint, Suitcase, TwoDoors, WreckingBall, popperMouth,
	wreckAngle, excavatorAim,
} from './ui/hay_b';

// hay-castle draw kit B preview (test composition, never published): one panel per component group, every piece animated.
// Contact sheet: node tools/stills.mjs --comp HayKitB --every 1 --from 0 --to 11 --out out/sheets/kitB
// The bale wall, the farmer and the house wall here are STAND-INS (kit A draws the real ones).
export const HAY_KIT_B_S = 12;

const Lbl: React.FC<{text: string; sub?: string}> = ({text, sub}) => (
	<div style={{position: 'absolute', left: 40, top: 60, padding: '10px 20px', borderRadius: 14, background: 'rgba(10,16,28,0.72)', boxShadow: `0 0 0 4px ${INK}`, fontFamily: MONT, fontWeight: 800, fontSize: 32, color: '#fff', zIndex: 50}}>
		{text}
		{sub ? <div style={{fontSize: 22, fontWeight: 600, opacity: 0.75}}>{sub}</div> : null}
	</div>
);

/** stand-in straw bale wall (kit A has the real bales) */
const Bales: React.FC<{x0: number; x1: number; top: number; bottom: number}> = ({x0, x1, top, bottom}) => {
	const BW = 170, BH = 92;
	const rows = Math.floor((bottom - top) / BH);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			{Array.from({length: rows}, (_, r) =>
				Array.from({length: Math.ceil((x1 - x0) / BW) + 1}, (_, c) => {
					const bx = x0 + c * BW - (r % 2 ? BW / 2 : 0);
					const by = bottom - (r + 1) * BH;
					const L = Math.max(x0, bx), R = Math.min(x1, bx + BW);
					if (R - L < 20) return null;
					return (
						<g key={`${r}-${c}`}>
							<rect x={L} y={by} width={R - L} height={BH} rx={12} fill="#E3C06A" stroke={INK} strokeWidth={5} />
							{[0.3, 0.55, 0.8].map((f) => <line key={f} x1={L + 12} y1={by + BH * f} x2={R - 12} y2={by + BH * f - 4} stroke="#c49a3c" strokeWidth={4} />)}
							{[0.3, 0.7].map((f) => (R - L > 80 ? <line key={`t${f}`} x1={L + (R - L) * f} y1={by + 4} x2={L + (R - L) * f} y2={by + BH - 4} stroke="#7a5320" strokeWidth={5} /> : null))}
						</g>
					);
				}),
			)}
		</svg>
	);
};

/** stand-in farmer (flat cap, rubber boots); kit A draws the real one. (x, y) = feet */
const Farmer: React.FC<{x: number; y: number; s?: number; t: number; arm?: number}> = ({x, y, s = 1, t, arm = 0}) => {
	const bob = Math.sin(t * 2.4) * 3;
	return (
		<svg width={500 * s} height={760 * s} viewBox="-250 -720 500 760" style={{position: 'absolute', left: x - 250 * s, top: y - 720 * s, overflow: 'visible'}}>
			<ellipse cx={0} cy={0} rx={130} ry={18} fill="rgba(0,0,0,0.28)" />
			<g transform={`translate(0 ${bob})`}>
				<rect x={-66} y={-120} width={58} height={122} rx={14} fill="#2f4a32" stroke={INK} strokeWidth={W} />
				<rect x={8} y={-120} width={58} height={122} rx={14} fill="#2f4a32" stroke={INK} strokeWidth={W} />
				<path d="M-60,-300 L-6,-300 L-10,-112 L-62,-112 Z M6,-300 L60,-300 L62,-112 L10,-112 Z" fill="#5a4a3a" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d="M-84,-500 Q0,-526 84,-500 L72,-290 L-72,-290 Z" fill="#8a5834" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<path d="M-70,-480 Q-104,-400 -86,-330 L-58,-330 Q-74,-400 -48,-460 Z" fill="#6e4426" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
				<g transform={`rotate(${-arm * 150} 70 -480)`}>
					<path d="M70,-480 Q104,-400 86,-330 L58,-330 Q74,-400 48,-460 Z" fill="#6e4426" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
					<circle cx={72} cy={-322} r={24} fill={SKIN} stroke={INK} strokeWidth={W} />
				</g>
				<ellipse cx={0} cy={-580} rx={66} ry={72} fill={SKIN} stroke={INK} strokeWidth={W} />
				<ellipse cx={-22} cy={-582} rx={8} ry={10} fill={INK} />
				<ellipse cx={22} cy={-582} rx={8} ry={10} fill={INK} />
				<path d="M-20,-544 Q0,-532 20,-544" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
				<path d="M-74,-616 Q-70,-672 0,-674 Q70,-672 74,-616 Q104,-610 112,-598 L-74,-604 Z" fill="#6b5a44" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
			</g>
		</svg>
	);
};

/** stand-in house wall with an eave (timber framing) */
const HouseWall: React.FC<{x0: number; eave: number; ground: number}> = ({x0, eave, ground}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
		<rect x={x0} y={eave} width={1100 - x0} height={ground - eave} fill="#efe3c8" stroke={INK} strokeWidth={6} />
		{[x0 + 90, x0 + 330, x0 + 570].map((bx) => <rect key={bx} x={bx} y={eave} width={34} height={ground - eave} fill="#4a3020" stroke={INK} strokeWidth={4} />)}
		<rect x={x0} y={eave + 260} width={1100 - x0} height={30} fill="#4a3020" stroke={INK} strokeWidth={4} />
		<path d={`M${x0 - 60},${eave + 6} L1120,${eave + 6} L1120,${eave - 70} L${x0 + 20},${eave - 70} Z`} fill="#7a3b2a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
		<rect x={x0 - 70} y={eave - 6} width={1200 - x0} height={22} rx={6} fill="#5a6270" stroke={INK} strokeWidth={5} />
	</svg>
);

const Night: React.FC = () => <AbsoluteFill style={{background: `radial-gradient(circle at 50% 40%, ${PAL.navy2} 0%, ${PAL.navy} 75%)`}} />;

// ---------------------------------------------------------------------------------------------------- panels
const P0: React.FC<{t: number}> = ({t}) => {
	const k = t / 1.5;
	return (
		<AbsoluteFill>
			<FieldBg t={t} season="summer" cam={t * 120} />
			<Car x={lerp(160, 820, k)} y={1072} s={0.62} t={t} look={easeInOut(clamp01((t - 0.5) / 0.4))} />
			<Lbl text="FieldBg (summer, cam parallax) · Car" sub="driver look 0 → 1, wheels turn, exhaust" />
		</AbsoluteFill>
	);
};

const P1: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill>
		{(['summer', 'snow', 'blossom', 'autumn'] as Season[]).map((sea, i) => (
			<div key={sea} style={{position: 'absolute', left: (i % 2) * 540, top: Math.floor(i / 2) * 960, width: 540, height: 960, overflow: 'hidden', boxShadow: `inset 0 0 0 4px ${INK}`}}>
				<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: 'scale(0.5)', transformOrigin: '0 0'}}>
					<FieldBg t={t} season={sea} cam={t * 80 + i * 300} />
					<Car x={300 + ((t * 300 + i * 200) % 600)} y={1072} s={0.6} t={t} look={i === 3 ? -1 : 0} />
				</div>
				<div style={{position: 'absolute', left: 16, bottom: 16, fontFamily: MONT, fontWeight: 800, fontSize: 30, color: '#fff', WebkitTextStroke: `6px ${INK}`, paintOrder: 'stroke fill'}}>{sea}</div>
			</div>
		))}
		<Lbl text="FieldBg seasons" sub="summer / snow / blossom / autumn (driver look −1 = away)" />
	</AbsoluteFill>
);

const FLIPS: [number, Season, Season][] = [
	[2.58, 'summer', 'snow'],
	[2.74, 'snow', 'blossom'],
	[2.88, 'blossom', 'autumn'],
	[3.2, 'autumn', 'summer'],
];
const P2: React.FC<{t: number}> = ({t}) => {
	let from: Season = 'summer', season: Season = 'summer', mix = 1;
	for (const [ft, a, b] of FLIPS) if (t >= ft) [from, season, mix] = [a, b, clamp01((t - ft) / 0.12)];
	return (
		<AbsoluteFill>
			<FieldBg t={t} season={season} from={from} mix={mix} cam={t * 400} />
			<Car x={((t - 2.5) * 1400) % 1300 - 100} y={1072} s={0.62} t={t} speed={4} look={0} />
			<Lbl text="FieldBg season flips (mix 0→1 in 0.12 s)" sub="the driver never turns" />
		</AbsoluteFill>
	);
};

const P3: React.FC<{t: number}> = ({t}) => {
	const hitT = 3.9;
	const ang = wreckAngle(t, hitT, 40, -1.6);
	return (
		<AbsoluteFill>
			<FieldBg t={t} season="summer" />
			<Bales x0={140} x1={940} top={420} bottom={1000} />
			<GiantPadlock x={540} y={760} s={0.8} t={t} snap={t - 3.66} chain={easeOut((t - 3.55) / 0.22)} chainW={560} hit={t - hitT} />
			<WreckingBall x={780} y={-100} len={1075} s={0.8} angle={ang} hit={t - hitT} />
			<Lbl text="WreckingBall + GiantPadlock" sub="lock snaps, chain runs out, ball clangs and droops" />
		</AbsoluteFill>
	);
};

const P4: React.FC<{t: number}> = ({t}) => {
	const popT = 4.58;
	const g = clamp01((t - 4.6) / 0.8);
	const gy = lerp(260, 640, Math.pow(g, 1.6));
	const pm = popperMouth(642, 640, 0.55, 28);
	return (
		<AbsoluteFill>
			<Night />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<rect x={0} y={1060} width={1080} height={860} fill="#6d6458" stroke={INK} strokeWidth={6} />
				{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={i * 190 - 20} y={970} width={120} height={92} fill="#8a8072" stroke={INK} strokeWidth={6} />)}
			</svg>
			<Farmer x={540} y={1060} s={0.85} t={t} arm={0.62} />
			<PartyPopper x={642} y={640} s={0.55} rot={28} pop={t - popT} t={t} />
			<PopConfetti x={pm.x} y={pm.y} t={t} t0={popT} dir={20} spread={80} n={70} freeze={4.86} s={0.9} />
			<GavelShadow x={560} y={1066} k={g} w={520} h={560} />
			<Gavel x={540} y={gy} s={0.9} />
			<Lbl text="PartyPopper + PopConfetti (freeze) · Gavel + GavelShadow" sub="farmer and battlement = stand-ins" />
		</AbsoluteFill>
	);
};

const P5: React.FC<{t: number}> = ({t}) => {
	const v = t < 6.25 ? lerp(0.5, 0.965, easeOut((t - 5.5) / 0.4)) : lerp(0.965, 1, easeOut((t - 6.25) / 0.12));
	return (
		<AbsoluteFill>
			<Night />
			<CourtPage x={540} y={560} w={560} hl={clamp01((t - 5.55) / 0.8)} />
			<ProgressBar x={540} y={1050} w={760} t={t} value={v} strain={t < 6.25 ? clamp01((t - 5.85) / 0.1) : 0} done={t >= 6.37 ? 1 : 0} />
			<Lbl text="CourtPage (highlighter) · ProgressBar" sub="no digits, no case number, no names" />
		</AbsoluteFill>
	);
};

const P6: React.FC<{t: number}> = ({t}) => {
	const slam = 6.8;
	const lift = t < slam ? lerp(420, 0, easeInOut(clamp01((t - 6.6) / 0.2))) : t < slam + 0.06 ? 0 : lerp(0, 300, easeOut((t - slam - 0.06) / 0.3));
	return (
		<AbsoluteFill>
			<FieldBg t={t} season="summer" horizon={420} roadY={1700} />
			<Bales x0={160} x1={920} top={380} bottom={660} />
			<GiantStamp x={540} y={660} s={0.5} t={t} lift={300} wobble={1} />
			<div style={{position: 'absolute', left: 170, top: 880, width: 740, height: 230, background: PAL.parchment, borderRadius: 12, boxShadow: `0 0 0 6px ${INK}, 0 20px 40px rgba(0,0,0,0.35)`}} />
			<StampPrint x={540} y={995} s={0.8} k={t >= slam ? clamp01((t - slam) / 0.08) : 0} />
			<GiantStamp x={540} y={1050} s={0.62} t={t} lift={lift} text="REJECTED" inked shadow={false} />
			<Lbl text="GiantStamp: blank hover (top) · REJECTED slam" sub="StampPrint = the red imprint, always straight" />
		</AbsoluteFill>
	);
};

const P7: React.FC<{t: number}> = ({t}) => (
	<AbsoluteFill>
		<FieldBg t={t} season="summer" roadY={1600} horizon={560} fence={false} />
		<HouseWall x0={150} eave={430} ground={1080} />
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			<rect x={0} y={1080} width={1080} height={840} fill="#6d665e" />
			<line x1={0} y1={1080} x2={1080} y2={1080} stroke={INK} strokeWidth={6} />
		</svg>
		<PictureFrame x={870} y={540} s={0.7} swing={t - 7.95} />
		<BatLawyer x={640} y={440} s={0.62} t={t} drop={t - 7.58} />
		<RainButt x={330} y={1084} s={0.78} t={t} pop={t - 7.72} pipe={540} />
		<Suitcase x={470} y={1090} s={0.55} rot={-6} />
		<DoormatHome x={720} y={1060} s={0.72} slide={clamp01((t - 7.8) / 0.32)} />
		<Lbl text="BatLawyer · RainButt + Newt · DoormatHome" sub="PictureFrame + Suitcase (house wall = stand-in)" />
	</AbsoluteFill>
);

const P8: React.FC<{t: number}> = ({t}) => {
	const stop = 8.95;
	const k = easeOut(clamp01((t - 8.45) / (stop - 8.45)));
	const jolt = t > stop ? Math.sin((t - stop) * 30) * Math.exp(-(t - stop) * 6) * 18 : 0;
	const ex = {x: 190, y: 1085, s: 0.62};
	const bat = {x: 800, y: 440, s: 0.62};
	const signLeft = bat.x - 180 * bat.s, signMid = bat.y + 525 * bat.s;
	// the claw creeps along a path to «inches short» of the sign, then jolts
	const arm = excavatorAim(ex, {x: lerp(470, signLeft - 34, k) + jolt, y: lerp(1010, signMid, k)}, lerp(50, -6, k));
	return (
		<AbsoluteFill>
			<FieldBg t={t} season="summer" roadY={1600} horizon={560} fence={false} />
			<HouseWall x0={760} eave={430} ground={1080} />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<rect x={0} y={1080} width={1080} height={840} fill="#6d665e" />
				<line x1={0} y1={1080} x2={1080} y2={1080} stroke={INK} strokeWidth={6} />
			</svg>
			<BatLawyer {...bat} t={t} sign={t - 8.62} />
			<Excavator {...ex} t={t} {...arm} drive={t < stop ? 60 : 0} sparks={t - stop} brake={t - stop} />
			<Lbl text="Excavator (boom / stick / claw) · bat flips sign" sub="claw screeches to a stop: sparks + brake" />
		</AbsoluteFill>
	);
};

const P9: React.FC<{t: number}> = ({t}) => {
	const o = easeOut(clamp01((t - 9.55) / 0.35));
	return (
		<AbsoluteFill>
			<TwoDoors t={t} open={[o, clamp01((t - 9.62) / 0.35)]} clock={0.45 + (t - 9.5) * 0.35}>
				<Farmer x={540} y={1180} s={0.6} t={t} />
			</TwoDoors>
			<Lbl text="TwoDoors" sub="excavator | cell bars · clock without digits · gavel pendulum" />
		</AbsoluteFill>
	);
};

const P10: React.FC<{t: number}> = ({t}) => {
	const fly = clamp01((t - 10.8) / 0.7);
	return (
		<AbsoluteFill>
			<FieldBg t={t} season="summer" roadY={1600} horizon={560} fence={false} />
			<HouseWall x0={150} eave={430} ground={1080} />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<rect x={0} y={1080} width={1080} height={840} fill="#6d665e" />
				<line x1={0} y1={1080} x2={1080} y2={1080} stroke={INK} strokeWidth={6} />
			</svg>
			<RainButt x={860} y={1084} s={0.7} t={t} pop={9} newt={false} pipe={520} flip />
			<BatLawyer x={560} y={440} s={0.62} t={t} sign={9} rejected={t - 10.56} fly={fly} />
			<Newt x={lerp(720, -160, easeInOut(clamp01((t - 10.7) / 0.9)))} y={1086} s={0.6} t={t} flip slide={t > 10.7} carry />
			<Lbl text="REJECTED: bat flaps off, newt slides away" sub="BatLawyer rejected + fly · Newt slide + carry" />
		</AbsoluteFill>
	);
};

export const HayKitBGallery: React.FC = () => {
	const t = useT();
	const P = t < 1.5 ? P0 : t < 2.5 ? P1 : t < 3.5 ? P2 : t < 4.5 ? P3 : t < 5.5 ? P4 : t < 6.5 ? P5 : t < 7.5 ? P6 : t < 8.5 ? P7 : t < 9.5 ? P8 : t < 10.5 ? P9 : P10;
	return (
		<AbsoluteFill style={{background: PAL.navy, overflow: 'hidden'}}>
			<P t={t} />
		</AbsoluteFill>
	);
};
