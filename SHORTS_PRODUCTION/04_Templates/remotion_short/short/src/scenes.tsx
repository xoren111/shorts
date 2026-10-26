import React from 'react';
import {AbsoluteFill} from 'remotion';
import {W} from './lib/time';
import type {SceneProps} from './engine/transitions';
import {clamp01, easeInOut, lerp, KeyFact, Stamp, useT, GOLD} from './ui/gfx';
import {Dust, MarkerRing, PaperBg, Shake, SpeedLines, Torn} from './ui/vox';
import {Bg, Burst, Confetti, Document, Sea, Seal, Ship} from './ui/draw';

// DEMO scenes of the template (no external pictures: drawn primitives from pig-war/short3 draw.tsx + the Vox paper kit
// from football-222 vox.tsx + gfx.tsx). Replace them with the scenes of the new Short; keep exporting SCENES + FirstFrame.
// Rules: one visual event per phrase, nothing static > the level limit, text never repeats the voice (or its subtitle hides),
// Atlas only as a reaction (owner's art only), max 4–6 AI frames.

export const Hook: React.FC<SceneProps> = ({t1}) => {
	const t = useT();
	return (
		<Shake hits={[0.02, W(3)]} amp={16}>
			<Bg kind="navy" t={t} />
			<SpeedLines t0={0} t1={1.2} cy={860} strength={0.55} />
			<Burst x={540} y={860} a={t - 0.02} color={GOLD} r={260} />
			<Burst x={540} y={860} a={t - W(3)} color="#fff" r={200} />
			<Stamp text="NEW" t0={W(3)} t1={t1} y={860} />
		</Shake>
	);
};

export const Collage: React.FC<SceneProps> = ({t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<PaperBg />
			<Torn t0={W(9)} cx={540} cy={820} w={760} h={560} rot={-3} seed={4}>
				<Document x={366} y={266} w={640} h={460} t={t} />
			</Torn>
			<MarkerRing t0={W(13)} t1={t1} cx={540} cy={880} rx={250} ry={150} />
			<Dust t0={W(14)} x={540} y={900} />
		</AbsoluteFill>
	);
};

export const SealScene: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const drop = easeInOut((t - W(16)) / 0.35);
	return (
		<AbsoluteFill>
			<Bg kind="navy" t={t} cy={800} />
			{t >= W(16) - 0.05 ? <Document x={540} y={lerp(-400, 820, drop)} w={620} h={760} rot={lerp(-12, -2, drop)} t={t} /> : null}
			<Seal x={600} y={980} r={110} t={t} t0={W(18)} />
			<div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.15 * clamp01((t - t0) / 1)})`}} />
		</AbsoluteFill>
	);
};

export const Moves: React.FC<SceneProps> = ({t1}) => {
	const t = useT();
	const k = easeInOut((t - W(22)) / 1.2);
	return (
		<AbsoluteFill>
			<Bg kind="chart" t={t} cy={500} />
			<Sea t={t} y={1180} />
			{t >= W(22) - 0.05 ? <Ship x={lerp(-260, 560, k)} y={1210} s={0.9} t={t} /> : null}
			<KeyFact value="3" t0={W(21)} t1={t1} y={430} size={220} />
		</AbsoluteFill>
	);
};

export const Twist: React.FC<SceneProps> = () => {
	const t = useT();
	return (
		<Shake hits={[W(23)]} amp={14}>
			<Bg kind="parchment" t={t} />
			<Burst x={540} y={820} a={t - W(23)} color="#fff" r={320} />
			<Burst x={360} y={620} a={t - W(23) - 0.12} color="#e0303f" r={180} />
			<Burst x={760} y={1020} a={t - W(23) - 0.2} color="#2c4fb0" r={200} />
			<Confetti t={t} t0={W(23) + 0.25} />
		</Shake>
	);
};

export const End: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const k = easeInOut((t - t0) / Math.max(1, t1 - t0));
	return (
		<AbsoluteFill style={{transform: `scale(${lerp(1, 1.1, k)})`}}>
			<PaperBg />
			<Torn t0={t0} cx={540} cy={860} w={780} h={600} rot={2} seed={9} from="none" drift={0.06}>
				<AbsoluteFill style={{background: '#43b6f0'}}>
					<Sea t={t} y={360} />
					<Ship x={lerp(250, 470, k)} y={380} s={0.55} t={t} />
				</AbsoluteFill>
			</Torn>
			<MarkerRing t0={W(28)} t1={t1} cx={560} cy={830} rx={230} ry={140} />
		</AbsoluteFill>
	);
};

/** frame 0 as a still layer for the loop dissolve (Short.tsx draws it over the last LOOP seconds) */
export const FirstFrame: React.FC = () => (
	<AbsoluteFill>
		<Bg kind="navy" t={0} />
	</AbsoluteFill>
);

export const SCENES: Record<string, React.FC<SceneProps>> = {Hook, Collage, SealScene, Moves, Twist, End};
