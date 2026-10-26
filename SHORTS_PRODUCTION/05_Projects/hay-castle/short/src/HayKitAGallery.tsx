import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {PAL} from './theme';
import {FPS} from './lib/time';
import {INK, clamp01} from './ui/gfx';
import {Bale, BaleWall, BH, BW, Cannon, CannonMuzzle, Castle, CastleG, Farmer, FarmerG, FarmerPose, Ladder, LadderG, ladderPoint, StrawDust, Timer4Y, wallCell} from './ui/hay_a';

// hay-castle draw kit A preview (test composition, never published): one panel per component and pose.
// Contact sheet: node tools/stills.mjs --comp HayKitA --every 1 --from 0 --to 11 --out out/sheets/kitA
//   0–2 s  farmer poses           2–4 s  bale, dust tones, cannon, muzzle, ladder riders
//   4–5 s  frame 0: ram the bale  5–6 s  wall build + tarp       6–8 s  x-ray → castle cutaway, rooms light up
//   8–9 s  timer states           9–10 s topple                  10–11 s rewind     11–12 s demolition
export const HAY_KIT_A_S = 12;

const Tag: React.FC<{text: string; x?: number; y?: number; size?: number; center?: boolean}> = ({text, x = 40, y = 40, size = 34, center}) => (
	<div
		style={{
			position: 'absolute',
			left: x,
			top: y,
			transform: center ? 'translateX(-50%)' : undefined,
			fontFamily: 'Montserrat',
			fontWeight: 800,
			fontSize: size,
			color: '#fff',
			letterSpacing: 1,
			whiteSpace: 'nowrap',
			textShadow: `0 3px 0 ${INK}, 0 0 8px ${INK}`,
		}}
	>
		{text}
	</div>
);

const Navy: React.FC = () => <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${PAL.navy2} 0%, ${PAL.navy} 75%)`}} />;
const Outdoor: React.FC<{ground?: number}> = ({ground = 1180}) => (
	<>
		<AbsoluteFill style={{background: 'linear-gradient(180deg, #16304D 0%, #2F5E86 50%, #9CC3CF 100%)'}} />
		<div style={{position: 'absolute', left: 0, top: ground, width: 1080, height: 1920 - ground, background: 'linear-gradient(180deg, #74913F 0%, #4C6A2B 100%)', borderTop: `6px solid ${INK}`}} />
	</>
);

const POSES: [FarmerPose, string][] = [
	['push', 'push'],
	['thumbs', 'thumbs'],
	['popper', 'popper'],
	['arms', 'arms'],
	['cap', 'cap'],
	['sit', 'sit'],
	['freeze', 'freeze'],
	['walk', 'walk'],
	['stand', 'party hat'],
];

const Poses: React.FC<{t: number}> = ({t}) => {
	const lt = t;
	return (
		<>
			<Navy />
			<Tag text="kit A · Farmer poses" />
			{POSES.map(([pose, name], i) => {
				const cx = 190 + (i % 3) * 350;
				const fy = 640 + Math.floor(i / 3) * 520;
				const s = 0.42;
				const k = pose === 'push' || pose === 'cap' ? 0.5 + 0.5 * Math.sin(t * 4) : pose === 'thumbs' || pose === 'popper' ? clamp01(lt * 3) : 1;
				return (
					<React.Fragment key={name}>
						{pose === 'sit' ? <Bale x={cx} y={fy - 6} s={s} t={t} seed={4} /> : null}
						<Farmer
							x={pose === 'walk' ? cx - 80 + ((lt * 80) % 160) : cx}
							y={fy}
							s={s}
							t={t}
							pose={pose}
							k={k}
							popAge={lt - 0.35}
							hat={name === 'party hat' ? 'party' : undefined}
							deflate={name === 'party hat' ? clamp01((lt - 0.5) / 0.8) : 0}
							look={pose === 'freeze' ? Math.sin(t * 2) : undefined}
						/>
						<Tag text={name} x={cx} y={fy + 20} size={30} center />
					</React.Fragment>
				);
			})}
		</>
	);
};

const Props: React.FC<{t: number}> = ({t}) => {
	const lt = t - 2;
	const q = lt % 1;
	const fall = Math.min(1, q / 0.3);
	const la = q - 0.3;
	return (
		<>
			<Navy />
			<Tag text="kit A · Bale, StrawDust, Cannon, Muzzle, Ladder" size={30} />
			<Bale x={300} y={640 - (1 - fall * fall) * 300} s={0.6} t={t} seed={9} sq={la > 0 && la < 0.16 ? 0.14 * Math.sin((la / 0.16) * Math.PI) : 0} />
			<StrawDust x={300} y={640} age={la} size={1.6} n={7} seed={3} />
			{(['straw', 'stone', 'smoke'] as const).map((tone, i) => (
				<React.Fragment key={tone}>
					<StrawDust x={780} y={300 + i * 230} age={((lt + i * 0.3) % 1.3) + 0.05} size={1.1} tone={tone} n={6} seed={i * 7 + 2} life={1.3} />
					<Tag text={tone} x={930} y={300 + i * 230 - 20} size={26} />
				</React.Fragment>
			))}
			<Cannon x={330} y={1060} s={0.55} roll={clamp01(lt / 1.1)} puffAge={lt - 1.05} />
			<Tag text="cannon roll + puff" x={330} y={1090} size={26} center />
			<CannonMuzzle x={820} y={960} s={0.75} poke={0.55 + 0.45 * Math.sin(t * 3)} />
			<Tag text="muzzle" x={820} y={1090} size={26} center />
			<Ladder x={300} y={1840} s={0.2} t={t} h={3000} lean={8} riderAt={1800} rider={<FarmerG t={t} pose="push" k={0.5 + 0.5 * Math.sin(t * 5)} lw={14} />} lw={14} />
			<Ladder x={760} y={1840} s={0.2} t={t} h={3000} lean={-6} sway={2.2} riderAt={1500} rider={<FarmerG t={t} pose="freeze" lw={14} />} lw={14} />
			<Tag text="ladder sways with rider" x={540} y={1850} size={26} center />
		</>
	);
};

const GAP: [number, number] = [2, 9];

/** frame 0: the farmer on the swaying ladder shoves the last bale into the gap; muzzle + battlement show through it */
const FrameZero: React.FC<{t: number}> = ({t}) => {
	const ram = clamp01((t - 3.92) / 0.45);
	const [gx, gy] = wallCell(GAP[0], GAP[1]);
	const from: [number, number] = [-360, -10];
	const e = Math.pow(ram, 1.7);
	const left = gx + from[0] * (1 - e) - (BW / 2) * (1.12 - 0.12 * e);
	const hand = 236 + 88 * ram;
	const footX = -1200;
	const at = 2460;
	const [lx] = ladderPoint(t, at, 9);
	const riderDx = left - hand - (footX + lx);
	return (
		<>
			<Outdoor ground={1180} />
			<Tag text="kit A · frame 0: gap + muzzle + tarp + ram" size={30} />
			<BaleWall
				x={500}
				y={1200}
				s={0.2}
				t={t}
				gap={GAP}
				ram={ram}
				ramFrom={from}
				tarp={1}
				puffs={[{c: GAP[0], r: GAP[1], age: t - 4.2, size: 2.6}]}
				front={
					<g transform={`translate(${footX} 0)`}>
						<LadderG t={t} h={3150} lean={9} riderAt={at} riderDx={riderDx} lw={16} rider={<FarmerG t={t} pose="push" k={ram} lw={16} />} />
					</g>
				}
			/>
			<Tag text={`ram ${ram.toFixed(2)}`} x={40} y={1260} size={28} />
			<Tag text={`gap [${GAP.join(', ')}] · BW ${BW} × BH ${BH}`} x={40} y={1310} size={24} />
			<Tag text={`gap centre ${gx}, ${gy}`} x={40} y={1350} size={24} />
		</>
	);
};

const Build: React.FC<{t: number}> = ({t}) => {
	const build = Math.max(0, (t - 4.6) / 1.0);
	return (
		<>
			<Outdoor ground={1180} />
			<Tag text="kit A · build + tarp unroll" size={30} />
			<BaleWall x={500} y={1200} s={0.2} t={t} build={build} buildDur={1.0} tarp={clamp01((t - 5.55) / 0.35)} />
			<Farmer x={880} y={1260} s={0.24} t={t} pose="thumbs" k={1} flip />
			<Tag text={`build ${build.toFixed(2)}`} x={40} y={1260} size={28} />
		</>
	);
};

const XRay: React.FC<{t: number}> = ({t}) => {
	const xray = clamp01((t - 5.6) / 0.9);
	const rooms = clamp01((t - 6.2) / 0.75) * 3;
	return (
		<>
			<Outdoor ground={1180} />
			<Tag text="kit A · x-ray → castle cutaway" size={30} />
			<BaleWall
				x={500}
				y={1200}
				s={0.2}
				t={t}
				tarp={1}
				xray={xray}
				behind={<CastleG t={t} crenel={clamp01((t - 5.9) / 0.45)} cutaway={1} rooms={rooms} cannonRoll={clamp01((t - 6.45) / 0.4)} cannonPuff={t - 6.85} lw={16} />}
			/>
			<Tag text={`xray ${xray.toFixed(2)} · rooms ${rooms.toFixed(1)}`} x={40} y={1260} size={28} />
		</>
	);
};

const Timers: React.FC<{t: number}> = ({t}) => (
	<>
		<Navy />
		<Tag text="kit A · Timer4Y states" size={30} />
		<Timer4Y x={270} y={520} s={0.46} t={t} slam={clamp01((t - 7.85) / 0.3)} roll={1} fill={((t - 7.5) * 0.4) % 1} />
		<Tag text="slam + roll" x={270} y={760} size={26} center />
		<Timer4Y x={810} y={520} s={0.46} t={t} fill={0.62} />
		<Tag text="fill (eye blinks)" x={810} y={760} size={26} center />
		<Timer4Y x={270} y={1180} s={0.46} t={t} fill={1} done={clamp01((t - 7.8) / 0.5)} />
		<Tag text="done" x={270} y={1420} size={26} center />
		<Timer4Y x={810} y={1180} s={0.46} t={t} fill={1} done={1} start={clamp01((t - 7.9) / 0.4)} />
		<Tag text="start (needle snaps back)" x={810} y={1420} size={26} center />
	</>
);

const Topple: React.FC<{t: number}> = ({t}) => {
	const topple = Math.max(0, (t - 8.6) / 1.0);
	return (
		<>
			<Outdoor ground={1180} />
			<Tag text="kit A · tarp whip + domino topple" size={30} />
			<BaleWall x={500} y={1200} s={0.2} t={t} tarp={1} tarpOff={clamp01((t - 8.25) / 0.4)} topple={topple} toppleDur={1.0} behind={<CastleG t={t} lw={16} />} />
			<Tag text={`topple ${topple.toFixed(2)}`} x={40} y={1500} size={28} />
		</>
	);
};

const Rewind: React.FC<{t: number}> = ({t}) => {
	const rewind = clamp01((t - 9.6) / 1.0);
	return (
		<>
			<Outdoor ground={1180} />
			<Tag text="kit A · rewind (bales fly back)" size={30} />
			<BaleWall x={500} y={1200} s={0.2} t={t} rewind={rewind} behind={<CastleG t={t} lw={16} />} />
			<Tag text={`rewind ${rewind.toFixed(2)}`} x={40} y={1500} size={28} />
		</>
	);
};

const Demolish: React.FC<{t: number}> = ({t}) => {
	const dm = clamp01((t - 10.7) / 1.3);
	return (
		<>
			<Outdoor ground={1180} />
			<Tag text="kit A · demolition" size={30} />
			<Castle x={480} y={1180} s={0.235} t={t} demolish={dm} demolishDur={1.3} />
			{[0.5, 0.68, 0.97].map((d0, i) => (
				<React.Fragment key={d0}>
					<Castle x={190 + i * 340} y={1760} s={0.085} t={t} demolish={Math.min(1, d0 + (t - 11) * 0.12)} demolishDur={1.3} />
					<Tag text={`${Math.round(Math.min(1, d0 + (t - 11) * 0.12) * 100)}%`} x={190 + i * 340} y={1790} size={24} center />
				</React.Fragment>
			))}
			<Tag text={`demolish ${dm.toFixed(2)}`} x={40} y={1260} size={28} />
		</>
	);
};

export const HayKitAGallery: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	return (
		<AbsoluteFill style={{background: PAL.navy, overflow: 'hidden'}}>
			{t < 2 ? <Poses t={t} /> : t < 4 ? <Props t={t} /> : t < 5 ? <FrameZero t={t} /> : t < 6 ? <Build t={t} /> : t < 8 ? <XRay t={t} /> : t < 9 ? <Timers t={t} /> : t < 10 ? <Topple t={t} /> : t < 11 ? <Rewind t={t} /> : <Demolish t={t} />}
		</AbsoluteFill>
	);
};
