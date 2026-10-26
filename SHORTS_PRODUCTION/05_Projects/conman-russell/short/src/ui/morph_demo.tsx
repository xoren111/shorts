import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useVideoConfig} from 'remotion';
import type {SceneProps} from '../engine/transitions';
import {PAL} from '../theme';
import {MONT} from '../fonts';
import {Bg} from './draw';
import {Chip, Label, useT, GOLD} from './gfx';
import {Morph, MorphMask, type MorphMode, type ShapeInput} from './morph';
import {SHAPES, type ShapeName} from './shapes';

// Test / gallery pieces for <Morph> — never part of a published Short (labels here are test captions, not edit text).
//   MorphGalleryScene   one Gallery beat (SceneProps): coin → pin → island on the beat's clock + a line-art chain
//   MorphGrid           still sheet: each row a chain, each column a progress value (0…1 over the chain) — for stills.mjs
//   MorphShowcase       8 s run of the kit: keys + holds, trail, burst, idle, spin, travel, footage in a MorphMask (A/B: plain)
//   MorphRevealDemo     4 s: three full-frame reveals through a growing, morphing shape (MorphMask, size → 2600)

/** one Gallery beat: hero chain on the beat's own clock (keys from t0), small line-art chain under it */
export const MorphGalleryScene: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const k = (s: number) => t0 + s;
	return (
		<AbsoluteFill>
			<Bg kind="navy" t={t} cy={820} />
			<Morph shapes={['coin', 'pin', 'island']} keys={[k(0.35), k(1.05), k(1.75)]} morph={0.45} x={540} y={800} size={620} trail={2} burst idle={1} show={[t0, t1]} />
			<Morph shapes={['heart', 'star', 'arrow']} keys={[k(0.5), k(1.2), k(1.9)]} morph={0.4} x={540} y={1240} size={220} fill="none" stroke="#fff" strokeWidth={9} shadow={0} squash={0} />
			<Chip text="Morph" t0={t0 + 0.05} t1={t1} x={60} y={170} color={GOLD} fg="#fff" />
		</AbsoluteFill>
	);
};

const pct = (p: number) => `${Math.round(p * 100)}%`;

export type MorphCell = {shapes: ShapeInput[]; p: number; mode?: MorphMode; label?: string};

/**
 * still test sheet on 1080 × 1920: `cells` (each a chain at progress p, own mode) in `cols` columns — or `rows` × `ps`
 * (every row a chain, every column a progress value). Label = chain + progress (+ mode when not auto).
 */
export const MorphGrid: React.FC<{cells?: MorphCell[]; cols?: number; rows?: ShapeInput[][]; ps?: number[]; mode?: MorphMode; points?: number; title?: string; outline?: boolean}> = ({
	cells: given,
	cols: givenCols,
	rows = [],
	ps = [0, 0.5, 1],
	mode = 'auto',
	points,
	title,
	outline = true,
}) => {
	const cells: MorphCell[] = given ?? rows.flatMap((chain) => ps.map((p) => ({shapes: chain, p, mode})));
	const cols = givenCols ?? (given ? 3 : ps.length);
	const nRows = Math.ceil(cells.length / cols);
	const top = title ? 110 : 30;
	const cw = 1080 / cols, ch = (1920 - top - 20) / nRows;
	const size = Math.min(cw, ch - 34) * 0.8;
	const name = (c: MorphCell) => c.label ?? c.shapes.map((s) => (typeof s === 'string' && s.length < 16 ? s : 'path')).join('→');
	return (
		<AbsoluteFill style={{background: PAL.navy}}>
			{title ? <div style={{position: 'absolute', left: 36, top: 30, fontFamily: MONT, fontWeight: 900, fontSize: 42, color: '#fff'}}>{title}</div> : null}
			{cells.map((c, k) => {
				const x0 = (k % cols) * cw, y0 = top + Math.floor(k / cols) * ch;
				return (
					<React.Fragment key={k}>
						<div style={{position: 'absolute', left: x0, top: y0, width: cw, height: ch, border: '1px solid rgba(255,255,255,0.08)'}} />
						<Morph shapes={c.shapes} progress={c.p} mode={c.mode ?? mode} points={points} x={x0 + cw / 2} y={y0 + 32 + (ch - 32) / 2} size={size} strokeWidth={outline ? 6 : 0} shadow={0} squash={0} />
						<div style={{position: 'absolute', left: x0 + 10, top: y0 + 6, width: cw - 20, fontFamily: MONT, fontWeight: 800, fontSize: 21, color: GOLD, whiteSpace: 'nowrap', overflow: 'hidden'}}>
							{name(c)} {pct(c.p)}{(c.mode ?? mode) !== 'auto' ? ` · ${c.mode ?? mode}` : ''}
						</div>
					</React.Fragment>
				);
			})}
		</AbsoluteFill>
	);
};

export const SHOWCASE_S = 8;

/**
 * 8 s run of the kit (60 fps) — what morph beats look like in motion; used for stills and the motion metric (measure.py).
 * `plain` switches the motion options off (no trail / burst / idle / spin / squash, no mask) for an A/B of what they add;
 * `clip` = a video under public/ shown inside the morphing shape in 5.6–8 s (MorphMask); without it that part is line art.
 */
export const MorphShowcase: React.FC<{plain?: boolean; clip?: string}> = ({plain, clip}) => {
	const t = useT();
	const {fps} = useVideoConfig();
	const all = Object.keys(SHAPES) as ShapeName[];
	const kit = plain ? {trail: 0, burst: false, idle: 0, squash: 0} : {trail: 2, burst: true, idle: 1, squash: 0.6};
	return (
		<AbsoluteFill style={{background: '#08060c'}}>
			<Bg kind="navy" t={t} cy={820} />
			{/* 0–3.2 s: hero chain on keys with holds; the coin travels up and grows while it becomes the pin */}
			<Morph shapes={['coin', 'pin', 'island']} keys={[0.3, 1.2, 2.4]} morph={0.5} x={540} y={[860, 760, 860]} size={[600, 660, 720]} show={[0, 3.2]} {...kit} />
			{/* 3.2–5.6 s: heart → star → arrow, one full turn per morph */}
			<Morph shapes={['heart', 'star', 'arrow']} keys={[3.45, 4.2, 4.95]} morph={0.45} spin={plain ? 0 : 360} x={540} y={820} size={640} show={[3.2, 5.6]} {...kit} trail={plain ? 0 : 3} />
			{/* 5.6–8 s: footage inside coin → pin → island (MorphMask), or every library shape as quick line art */}
			{clip && !plain ? (
				<MorphMask shapes={['coin', 'pin', 'island']} keys={[5.8, 6.6, 7.4]} morph={0.45} x={540} y={820} size={[640, 700, 760]} show={[5.6, 8]} idle={1} strokeWidth={12}>
					<Sequence from={Math.round(5.6 * fps)} layout="none">
						<OffthreadVideo src={staticFile(clip)} muted style={{position: 'absolute', left: 540 - 1280, top: 0, height: 1920, width: 2560, objectFit: 'cover'}} />
					</Sequence>
				</MorphMask>
			) : (
				<Morph shapes={all} span={[5.75, 7.9]} morph={0.16} x={540} y={820} size={560} fill="none" stroke="#fff" strokeWidth={12} shadow={0} show={[5.6, 8]} {...kit} trail={0} />
			)}
			<Label text="MORPH KIT" sub={plain ? 'plain · test, not published' : 'test · not published'} t0={0.1} t1={7.9} x={540} y={1320} size={46} />
		</AbsoluteFill>
	);
};

export const REVEAL_S = 4;

/**
 * Full-frame reveals through a morphing shape: the next picture opens inside a pin / star / coin that grows over the whole
 * frame while it turns into a circle (MorphMask, size [≈0, 2600]). One reveal changes every pixel within ~0.5 s — the
 * strongest motion the kit gives (motion 1–6, standard section 8). `clip` = a video under public/ (else drawn grounds only).
 * Every mask has a `show` window: before it a waiting shape (size 60) and its outline would already sit on the frame.
 */
export const MorphRevealDemo: React.FC<{clip?: string}> = ({clip}) => {
	const t = useT();
	const {fps} = useVideoConfig();
	const footage = (from: number, dx: number) =>
		clip ? (
			<Sequence from={Math.round(from * fps)} layout="none">
				<OffthreadVideo src={staticFile(clip)} muted style={{position: 'absolute', left: 540 - 1280 + dx, top: 0, height: 1920, width: 2560, objectFit: 'cover'}} />
			</Sequence>
		) : (
			<Bg kind="sea" t={t} />
		);
	return (
		<AbsoluteFill style={{background: '#08060c'}}>
			<Bg kind="navy" t={t} cy={820} />
			<Morph shapes={['island']} x={540} y={820} size={620} idle={1} />
			<MorphMask shapes={['pin', 'circle']} keys={[0.55, 1.1]} size={[60, 2600]} y={[820, 960]} strokeWidth={14} show={[0.35, REVEAL_S]}>
				{footage(0.4, 0)}
			</MorphMask>
			<MorphMask shapes={['star', 'circle']} keys={[1.75, 2.25]} size={[60, 2600]} y={[900, 960]} spin={120} strokeWidth={14} show={[1.55, REVEAL_S]}>
				<Bg kind="gold" t={t} cy={820} />
				<Morph shapes={['heart', 'star']} keys={[2.4, 2.9]} morph={0.4} x={540} y={820} size={620} burst idle={1} />
			</MorphMask>
			<MorphMask shapes={['coin', 'circle']} keys={[3.0, 3.5]} size={[60, 2600]} y={[820, 960]} strokeWidth={14} show={[2.8, REVEAL_S]}>
				{footage(2.9, -300)}
			</MorphMask>
		</AbsoluteFill>
	);
};
