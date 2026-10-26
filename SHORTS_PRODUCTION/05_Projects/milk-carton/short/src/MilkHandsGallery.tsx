import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FPS} from './lib/time';
import {INK, clamp01} from './ui/gfx';
import {lwFor, MilkCarton} from './ui/milk_a';
import {ManCartonGripG, pointHandTip, PointHandG, pointHandWrist} from './ui/milk_hands';
import type {PointKind} from './ui/milk_hands';

// milk-carton pointing-hand preview (test composition, never published): src/ui/milk_hands.tsx.
//   node tools/stills.mjs --comp MilkHands --t 0.2,1.0,1.6 --out out/stills/milkhands --cols 3 --scale 1
//   row 1  her hand (kid) at −40° / upright / +34° / pressing — the red dot = pointHandTip (aim point)
//   row 2  his hand (man) with kit A's cuff + gold watch, same turns, mirrored
//   row 3  her hand merged into a bent forearm (layer passes, as scenes_1 KidArmG) · her hand + striped sleeve (Missing macro)
//   row 4  his carton grip (ManCartonGripG = ManGripBackG behind the carton + ManGripPointG in front): Hook/Famous grip with the
//          index unfurling / hovering / tapping (t 0.05 = tucked, as in the Hook) · the ManCan grip
export const MILK_HANDS_S = 2;

type P2 = [number, number];
const Fig: React.FC<{x: number; y: number; s: number; rot?: number; flip?: boolean; children: React.ReactNode}> = ({x, y, s, rot = 0, flip, children}) => (
	<svg width={2000 * s} height={2000 * s} viewBox="-1000 -1000 2000 2000" style={{position: 'absolute', left: x - 1000 * s, top: y - 1000 * s, overflow: 'visible'}}>
		<g transform={`rotate(${rot.toFixed(2)}) scale(${flip ? -1 : 1} 1)`}>{children}</g>
	</svg>
);
const Tag: React.FC<{text: string; x: number; y: number}> = ({text, x, y}) => (
	<div style={{position: 'absolute', left: x, top: y, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 26, color: INK, opacity: 0.7}}>{text}</div>
);
const bump = (x: number, c: number, d: number) => {
	const u = (x - c + d / 2) / d;
	return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
};
const rotP = (p: P2, d: number): P2 => {
	const a = (d * Math.PI) / 180;
	return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
};

/** a pointing hand whose fingertip lands on (x, y), finger direction dir (deg, −90 = up); red dot = the aim point */
const Aimed: React.FC<{kind: PointKind; x: number; y: number; dir: number; s: number; tap?: number; arm?: number; t: number}> = ({kind, x, y, dir, s, tap = 0, arm = 0, t}) => {
	const rot = dir + 90;
	const flip = Math.cos((dir * Math.PI) / 180) < 0;
	const tip = pointHandTip(kind, tap);
	const off = rotP([tip[0] * s * (flip ? -1 : 1), tip[1] * s], rot);
	return (
		<>
			<Fig x={x - off[0]} y={y - off[1]} s={s} rot={rot} flip={flip}>
				<PointHandG kind={kind} tap={tap} arm={arm} t={t} lw={lwFor(s)} />
			</Fig>
			<div style={{position: 'absolute', left: x - 6, top: y - 6, width: 12, height: 12, borderRadius: 6, background: '#E3263A', opacity: 0.8}} />
		</>
	);
};

/** her hand on a bent forearm, drawn exactly like scenes_1 KidArmG (forearm ink → hand ink → forearm fill → hand fill → hand top) */
const KidOnForearm: React.FC<{x: number; y: number; s: number; bend: number; t: number}> = ({x, y, s, bend, t}) => {
	const lw = lwFor(s);
	const E: P2 = [-120, 210];
	const Wp: P2 = [0, 0];
	const fw = pointHandWrist('kid');
	const r = -20 + bend;
	const tube = (c: string, w: number) => <polyline points={`${E[0]},${E[1]} ${Wp[0]},${Wp[1]}`} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />;
	const hand = (layer: 'ink' | 'fill' | 'top') => (
		<g transform={`rotate(${r})`}>
			<PointHandG kind="kid" layer={layer} tap={bump(t, 1.2, 0.3)} lw={lw} />
		</g>
	);
	return (
		<Fig x={x} y={y} s={s}>
			{tube(INK, fw + 6 + lw * 2)}
			{hand('ink')}
			{tube('#f3c29a', fw + 6)}
			{hand('fill')}
			{hand('top')}
		</Fig>
	);
};

export const MilkHandsGallery: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	const tap = bump(t, 1.0, 0.4);
	// row 4: his grip on a carton (milk_hands ManCartonGripG, the drop-in for kit A's carton hand): left = the Hook / Famous grip
	// (GRIP1: at 0.28, rot 28, scale 1.24) with the index coming out and tapping the printed right cheek; right = the ManCan grip
	// (kit default at 0.16, rot −12, scale 1.35), index tucked
	const k = clamp01((t - 0.1) / 0.5);
	const touch = clamp01((t - 0.7) / 0.2);
	const CHEEK: P2 = [72, -214];
	const grips = [
		{x: 250, y: 1880, s: 0.85, at: 0.28, rot: 28, hs: 1.24, idx: k > 0 ? {k, aim: CHEEK, touch: Math.max(touch, tap), tap} : null},
		{x: 690, y: 1880, s: 0.85, at: 0.16, rot: -12, hs: 1.35, idx: null},
	];
	return (
		<AbsoluteFill style={{background: '#E9F1F4'}}>
			{/* row 1 · her hand */}
			<Tag text="KID · −40° / UP / +34° / TAP" x={30} y={20} />
			<Aimed kind="kid" x={170} y={110} dir={-130} s={1.75} t={t} />
			<Aimed kind="kid" x={430} y={90} dir={-90} s={1.75} t={t} />
			<Aimed kind="kid" x={690} y={110} dir={-56} s={1.75} t={t} />
			<Aimed kind="kid" x={930} y={110} dir={-60} s={1.75} tap={1} t={t} />
			{/* row 2 · his hand */}
			<Tag text="MAN · cuff + watch (kit A)" x={30} y={500} />
			<Aimed kind="man" x={200} y={600} dir={-125} s={1.05} arm={260} t={t} />
			<Aimed kind="man" x={540} y={580} dir={-90} s={1.05} arm={260} tap={tap} t={t} />
			<Aimed kind="man" x={860} y={610} dir={-50} s={1.05} arm={260} t={t} />
			{/* row 3 · her hand merged into a forearm, and with her sleeve */}
			<Tag text="KID on a bent forearm (layers) · KID + sleeve (macro)" x={30} y={1010} />
			<KidOnForearm x={250} y={1300} s={1.6} bend={0} t={t} />
			<KidOnForearm x={520} y={1300} s={1.6} bend={36} t={t} />
			<Fig x={860} y={1290} s={0.95} rot={-40} flip>
				<PointHandG kind="kid" arm={520} tap={tap} lw={lwFor(0.95)} />
			</Fig>
			{/* row 4 · his grip on the carton (back fingers behind the carton, palm + thumb + watch in front) */}
			<div style={{position: 'absolute', left: 0, top: 1460, width: 1080, height: 460, overflow: 'hidden', background: '#DCE7EC'}}>
				<div style={{position: 'absolute', left: 0, top: -1460, width: 1080, height: 1920}}>
					{grips.map((g, i) => (
						<React.Fragment key={i}>
							<Fig x={g.x} y={g.y} s={g.s}>
								<ManCartonGripG part="back" at={g.at} rot={g.rot} scale={g.hs} t={t} idx={g.idx} lw={lwFor(g.s)} />
							</Fig>
							<MilkCarton x={g.x} y={g.y} s={g.s} t={t} />
							<Fig x={g.x} y={g.y} s={g.s}>
								<ManCartonGripG part="front" at={g.at} rot={g.rot} scale={g.hs} t={t} idx={g.idx} lw={lwFor(g.s)} />
							</Fig>
						</React.Fragment>
					))}
					<div style={{position: 'absolute', left: 250 + 72 * 0.85 - 6, top: 1880 - 214 * 0.85 - 6, width: 12, height: 12, borderRadius: 6, background: '#E3263A', opacity: 0.8}} />
				</div>
			</div>
			<Tag text="MAN carton grip · Hook/Famous (index out) · ManCan" x={30} y={1470} />
		</AbsoluteFill>
	);
};
