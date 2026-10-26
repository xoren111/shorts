import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DURATION, FPS, W} from './lib/time';
import type {SceneProps} from './engine/transitions';
import {GAP_CELL, REF, TIMER} from './data/beats';
import {INK, clamp01, easeInOut, easeOut, h1, lerp, useT} from './ui/gfx';
import {shake} from './ui/vox';
import {Bg, SKIN, SKIN_D} from './ui/draw';
import {HEAD, MONT} from './fonts';
import {PAL} from './theme';
import {BaleG, BaleWallG, BH, BW, CastleG, Farmer, FarmerG, HAY, LadderG, ladderPoint, lwFor, popOv, StrawDust, StrawDustG, Timer4Y, wallCell} from './ui/hay_a';
import type {FarmerMood, FarmerPose} from './ui/hay_a';
import {BatLawyer, Car, CourtPage, DoormatHome, Excavator, excavatorAim, FieldBg, Gavel, GiantPadlock, GiantStamp, ImpactG, lobePath, mixHex, Newt, PictureFrame, PopConfetti, ProgressBar, RainButt, Suitcase, TwoDoors, WreckingBall} from './ui/hay_b';
import type {Season} from './ui/hay_b';

// hay-castle scenes (../SCRIPT.md «Покадровый план», ../EDIT_PLAN.md). Series A look (conman-russell): flat fills, INK outlines,
// palette PAL. Everything is drawn in code from the two kits (src/ui/hay_a.tsx, src/ui/hay_b.tsx) — no Atlas, no maps, no AI
// frames, no memes. Owner rules: the word «hay» is never written (bales are pictures); 0–10 s show no text but «4 YEARS» and the
// eye icon (the timer's dial with its START label stays clipped until 10 s); text white + orange, straight, ink outline + scrim;
// one staged action per shot; nothing static > 2 s; key action inside x 48–887, y 288–1100.
//
// The field world is drawn in WALL UNITS (kit A: farmer 900 tall, bale 640 × 320, wall 3840 × 3520, origin = wall base centre)
// through a camera `Cam` (screen = X + (u − U)·S, Y + (v − V)·S). The countryside backdrop (kit B FieldBg, px) is scaled with the
// same camera around the reference framing REF (data/beats.ts), so zooms and push-ins move the whole picture.

// ======================================================================= camera + shared helpers
type Cam = {S: number; U: number; V: number; X: number; Y: number};
const camL = (a: Cam, b: Cam, k: number): Cam => ({S: lerp(a.S, b.S, k), U: lerp(a.U, b.U, k), V: lerp(a.V, b.V, k), X: lerp(a.X, b.X, k), Y: lerp(a.Y, b.Y, k)});
const P = (c: Cam, u: number, v: number): [number, number] => [c.X + (u - c.U) * c.S, c.Y + (v - c.V) * c.S];
type Ease = (x: number) => number;
/** piecewise camera path: [time, cam, ease of the segment ending at this key] */
const camPath = (t: number, keys: ([number, Cam] | [number, Cam, Ease])[], ease: Ease = easeInOut): Cam => {
	if (t <= keys[0][0]) return keys[0][1];
	for (let i = 1; i < keys.length; i++) {
		if (t <= keys[i][0]) return camL(keys[i - 1][1], keys[i][1], (keys[i][2] ?? ease)((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
	}
	return keys[keys.length - 1][1];
};
const easeIn2: Ease = (x) => clamp01(x) * clamp01(x);
/** 0→1 with an overshoot past 1 before settling */
const easeOutBack: Ease = (x) => {
	const c1 = 1.9;
	const k = clamp01(x) - 1;
	return 1 + (c1 + 1) * k * k * k + c1 * k * k;
};
/** camera kick: a quick push-in that springs back (each event gives the flat drawing a beat of real motion) */
const kick = (t: number, times: number[], amp = 0.07) =>
	times.reduce((acc, ti) => {
		const a = t - ti;
		return a < 0 || a > 0.9 ? acc : acc + amp * (1 - Math.exp(-a * 30)) * Math.exp(-a * 5.5);
	}, 0);
const kicked = (c: Cam, k: number): Cam => ({...c, S: c.S * (1 + k)});
/** reference framing (the whole wall + the road), wall base at (REF.X, REF.Y) */
const WIDE: Cam = {S: REF.S, U: 0, V: -1500, X: REF.X, Y: REF.Y - 1500 * REF.S};

/** a small bump 0→1→0 around time c (width d) */
const bump = (t: number, c: number, d = 0.2) => {
	const x = (t - c + d / 2) / d;
	return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x);
};
const clampR = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** the backdrop transform for a camera (scale ≥ 1, always covers the frame) */
const bgXf = (c: Cam) => {
	const k = Math.max(1, c.S / REF.S);
	const tx = clampR(c.X - c.U * c.S - REF.X * k, 1080 - 1080 * k, 0);
	const ty = clampR(c.Y - c.V * c.S - REF.Y * k, 1920 - 1920 * k, 0);
	return {k, tx, ty};
};

type FieldOpts = {season?: Season; from?: Season; mix?: number; horizon?: number; roadY?: number; road?: boolean};
/** countryside backdrop (sky, hills, hedge, near field, road) moved by the camera; no fence (the wall stands on the near field) */
const Field: React.FC<{c: Cam; t: number} & FieldOpts> = ({c, t, season = 'summer', from, mix, horizon = 560, roadY = 1030, road = true}) => {
	const {k, tx, ty} = bgXf(c);
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: `translate(${tx}px, ${ty}px) scale(${k})`, transformOrigin: '0 0'}}>
			<FieldBg t={t} season={season} from={from} mix={mix} horizon={horizon} roadY={roadY} fence={false} road={road} />
		</div>
	);
};
/** a backdrop point (px of the unscaled FieldBg) on screen for camera c */
const bgP = (c: Cam, x: number, y: number): [number, number] => {
	const {k, tx, ty} = bgXf(c);
	return [tx + x * k, ty + y * k];
};

/** world layer: children in wall units */
const World: React.FC<{c: Cam; children: React.ReactNode}> = ({c, children}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
		<g transform={`translate(${(c.X - c.U * c.S).toFixed(2)} ${(c.Y - c.V * c.S).toFixed(2)}) scale(${c.S.toFixed(5)})`}>{children}</g>
	</svg>
);

/**
 * the lawn in front of the house (wall units, v ≥ 0 = toward the camera): the near-field green darkens into a foreground band in
 * one gradient (no seam), rows of grass tufts and daisies grow toward the camera (perspective); path = flat stepping stones from
 * the front door (u = 0) toward the camera
 */
const LAWN = {top: '#66a446', mid: '#5b9a3e', bot: '#467f31', tuft: '#2c7a30'};
/** a grass clump: three blades fanning out of one filled base (not three parallel strokes — OCR read those, with a daisy on top,
 *  as «!!!» / «Ill» and flagged CLUTTER in tools/dupes.py) */
const TUFT = 'M-22,2 C-26,-14 -36,-30 -48,-40 C-28,-36 -16,-24 -9,-12 C-10,-30 -4,-48 4,-62 C11,-46 12,-28 10,-12 C18,-26 30,-35 46,-38 C32,-26 26,-12 24,2 Z';
const Lawn: React.FC<{lw: number; path?: boolean; u0?: number; u1?: number}> = ({lw, path = false, u0 = -5600, u1 = 6000}) => {
	const id = 'lawn' + React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const halfW = (v: number) => 190 + v * 0.1;
	const pathX = (v: number) => v * 0.05;
	const tufts: React.ReactNode[] = [];
	for (let r = 0; r < 17; r++) {
		const v = 130 + 150 * r + 18 * r * r;
		const sz = 1 + v / 1400;
		const step = 300 * sz;
		let i = 0;
		for (let u = u0 + h1(r * 3.3) * step; u < u1; u += step * (0.65 + 0.7 * h1(r * 7.1 + i * 1.3)), i++) {
			const uu = u;
			const vv = v + (h1(r * 5.3 + i * 2.7) - 0.5) * 90 * sz;
			if (path && Math.abs(uu - pathX(vv)) < halfW(vv) + 50 * sz) continue;
			const fl = h1(r * 9.7 + i * 3.1) > 0.72;
			tufts.push(
				<g key={`${r}-${i}`} transform={`translate(${uu.toFixed(0)} ${vv.toFixed(0)}) scale(${sz.toFixed(3)})`}>
					<path d={TUFT} fill={LAWN.tuft} />
					{fl ? (
						<g transform="translate(-18 -50)">
							{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-10} rx={7} ry={11} transform={`rotate(${a})`} fill="#fff" stroke={INK} strokeWidth={Math.max(2, lw * 0.25)} />)}
							<circle r={6} fill={PAL.gold} stroke={INK} strokeWidth={Math.max(2, lw * 0.25)} />
						</g>
					) : null}
				</g>,
			);
		}
	}
	const stones: React.ReactNode[] = [];
	if (path)
		for (let j = 0; j < 18; j++) {
			const v = 190 + 200 * j + 15 * j * j;
			const w = halfW(v);
			const xs = j % 2 ? [0] : [-0.5, 0.5];
			xs.forEach((f, q) => {
				const cx = pathX(v) + f * w * 1.05 + (h1(j * 4.1 + q) - 0.5) * w * 0.2;
				const r = w * (j % 2 ? 0.62 : 0.44) * (0.9 + 0.2 * h1(j * 2.3 + q));
				stones.push(
					<g key={`s${j}-${q}`}>
						<path d={lobePath(cx, v, r, j * 5 + q + 3, 7, 0.4)} fill={HAY.stoneD} stroke={INK} strokeWidth={lw * 0.8} transform="translate(0 14)" />
						<path d={lobePath(cx, v, r, j * 5 + q + 3, 7, 0.4)} fill={HAY.stone} stroke={INK} strokeWidth={lw * 0.8} />
						<path d={lobePath(cx - r * 0.2, v - r * 0.08, r * 0.45, j * 5 + q + 9, 5, 0.35)} fill={HAY.stoneL} opacity={0.8} />
					</g>,
				);
			});
		}
	return (
		<g>
			<defs>
				<linearGradient id={id} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={3600}>
					<stop offset={0} stopColor={LAWN.top} />
					<stop offset={0.45} stopColor={LAWN.mid} />
					<stop offset={1} stopColor={LAWN.bot} />
				</linearGradient>
			</defs>
			<rect x={-9000} y={0} width={18000} height={16000} fill={`url(#${id})`} />
			{stones}
			{tufts}
		</g>
	);
};

/** camera shake + handheld tremor (≤ 8 px), slightly scaled so the edges never show */
const Shk: React.FC<{t: number; hits: number[]; amp?: number; tremor?: number; sc?: number; children: React.ReactNode}> = ({t, hits, amp = 8, tremor = 1.2, sc = 1.03, children}) => {
	const s = shake(t, hits, amp, tremor);
	return <AbsoluteFill style={{transform: `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) rotate(${s.r.toFixed(3)}deg) scale(${sc})`}}>{children}</AbsoluteFill>;
};
/** CSS push-in for flat px scenes */
const Push: React.FC<{k: number; a?: number; b?: number; cx?: number; cy?: number; children: React.ReactNode}> = ({k, a = 1, b = 1.06, cx = 470, cy = 760, children}) => (
	<AbsoluteFill style={{transform: `scale(${lerp(a, b, k)})`, transformOrigin: `${cx}px ${cy}px`}}>{children}</AbsoluteFill>
);
const Flash: React.FC<{a: number; dur?: number; max?: number}> = ({a, dur = 0.12, max = 0.75}) => (a < 0 || a > dur ? null : <AbsoluteFill style={{background: '#fff', opacity: max * (1 - a / dur)}} />);

// ---------------------------------------------------------------- the castle showing through the bale wall (wall units)
// A 1.5-bale slot around GAP_CELL shows a stone parapet: merlon – crenel – merlon with an arrow slit; a cannon barrel pokes out
// of the crenel at the road (3/4 view, muzzle ring toward the viewer). The rammed bale fills only the slot's left bale, so the
// crenel, the barrel and the slit merlon stay visible after the thump. Above the tarp: an orange pennant and a merlon corner.
const [GAP_X, GAP_Y] = wallCell(GAP_CELL[0], GAP_CELL[1]);
const SLOT = {L: GAP_X - BW / 2 - 10, R: GAP_X + BW / 2 + 420 + 10, T: GAP_Y - BH / 2 - 10, B: GAP_Y + BH / 2 + 10, mTop: 96, floor: 205, slit: 318};
/** crenels (gaps between the merlons) as [left, right] in u: one left of the gap's centre (seen at frame 0), the cannon's one
 *  right of the gap cell (stays visible after the thump) */
const CRENELS: [number, number][] = [[-215, -100], [30, 200]];
/** where the barrel leaves the crenel and its direction (down-right, at the road) */
const BARREL = {x: (CRENELS[1][0] + CRENELS[1][1]) / 2, y: SLOT.T + SLOT.floor - 26, ang: 56, len: 560, r0: 76, r1: 84};
/** the pennant pole over GAP_CELL and the merlon corner peeking over the tarp */
const PENNANT = {u: GAP_X, top: -3960};
const PEEK = {L: 90, R: 300, top: -3780, step: -3650, stepR: 430};
const STONE_IN = '#17110C';

const CastleSlotG: React.FC<{lw: number; o?: number}> = ({lw, o = 1}) => {
	if (o <= 0) return null;
	const {L, R, T, B, mTop, floor, slit} = SLOT;
	const mt = T + mTop;
	const fl = T + floor;
	// parapet outline: merlon – crenel – merlon – crenel – merlon
	let parapet = `M${L},${B} L${L},${mt}`;
	for (const [c0, c1] of CRENELS) parapet += ` L${c0},${mt} L${c0},${fl} L${c1},${fl} L${c1},${mt}`;
	parapet += ` L${R},${mt} L${R},${B} Z`;
	const merlons: [number, number][] = [[L, CRENELS[0][0]], [CRENELS[0][1], CRENELS[1][0]], [CRENELS[1][1], R]];
	return (
		<g opacity={o}>
			<rect x={L} y={T} width={R - L} height={B - T} rx={22} fill={STONE_IN} />
			<path d={parapet} fill={HAY.stone} />
			{/* each merlon: light left face, shaded right face, a cap stone */}
			{merlons.map(([m0, m1], i) => (
				<g key={i}>
					<rect x={m0 + 8} y={mt + 8} width={Math.min(54, (m1 - m0) * 0.3)} height={fl - mt + 40} fill={HAY.stoneL} opacity={0.8} />
					<rect x={m1 - 8 - Math.min(44, (m1 - m0) * 0.25)} y={mt + 8} width={Math.min(44, (m1 - m0) * 0.25)} height={fl - mt + 40} fill={HAY.stoneD} opacity={0.55} />
					<line x1={m0} y1={mt + 34} x2={m1} y2={mt + 34} stroke={HAY.stoneD} strokeWidth={lw * 0.6} />
				</g>
			))}
			{/* mortar joints of the wall below */}
			<g stroke={HAY.stoneD} strokeWidth={lw * 0.6} strokeLinecap="round">
				<line x1={L} y1={fl} x2={R} y2={fl} />
				<line x1={L} y1={fl + 70} x2={R} y2={fl + 70} />
				{[L + 110, -190, 60, 300].map((x) => (
					<line key={`m${x}`} x1={x} y1={fl} x2={x} y2={fl + 70} />
				))}
				{[L + 230, -60, 180, 400].map((x) => (
					<line key={`b${x}`} x1={x} y1={fl + 70} x2={x} y2={B} />
				))}
			</g>
			{/* arrow slit in the right merlon */}
			<rect x={slit - 20} y={mt + 26} width={40} height={fl - mt + 50} rx={20} fill={STONE_IN} stroke={INK} strokeWidth={lw * 0.7} />
			<path d={parapet} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			{/* the bales' shadow on the top of the opening */}
			<rect x={L} y={T} width={R - L} height={40} rx={20} fill="rgba(0,0,0,0.45)" />
			<rect x={L} y={T} width={R - L} height={B - T} rx={22} fill="none" stroke={INK} strokeWidth={lw} />
			{/* torn straw around the opening */}
			{Array.from({length: 22}, (_, i) => {
				const side = i % 4;
				const f = h1(i * 2.9);
				const x = side < 2 ? L + 24 + f * (R - L - 48) : side === 2 ? L + 4 : R - 4;
				const y = side === 0 ? T + 4 : side === 1 ? B - 4 : T + 30 + f * (B - T - 60);
				const base = side === 0 ? 90 : side === 1 ? -90 : side === 2 ? 0 : 180;
				const a = ((base + (h1(i * 3.7) - 0.5) * 60) * Math.PI) / 180;
				const len = 30 + 34 * h1(i * 1.9);
				return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * len} y2={y + Math.sin(a) * len} stroke={HAY.strawL} strokeWidth={lw * 0.7} strokeLinecap="round" />;
			})}
		</g>
	);
};

/** the cannon barrel in 3/4 view poking out of the crenel at the road: tapered iron tube, bands, swollen muzzle ring, bore */
const BarrelG: React.FC<{lw: number; poke?: number; o?: number}> = ({lw, poke = 1, o = 1}) => {
	if (o <= 0) return null;
	const a = (BARREL.ang * Math.PI) / 180;
	const d = [Math.cos(a), Math.sin(a)];
	const n = [-Math.sin(a), Math.cos(a)];
	const len = BARREL.len * poke;
	const at = (k: number, side: number, r: number): string => `${(BARREL.x + d[0] * len * k + n[0] * side * r).toFixed(1)},${(BARREL.y + d[1] * len * k + n[1] * side * r).toFixed(1)}`;
	const rAt = (k: number) => lerp(BARREL.r0, BARREL.r1, k);
	const deg = BARREL.ang;
	const band = (k: number, w: number, r: number, key: string) => {
		const cx = BARREL.x + d[0] * len * k;
		const cy = BARREL.y + d[1] * len * k;
		return <rect key={key} x={cx - w / 2} y={cy - r} width={w} height={r * 2} rx={w * 0.45} transform={`rotate(${deg} ${cx} ${cy})`} fill={HAY.iron} stroke={INK} strokeWidth={lw} />;
	};
	const mk = 1 - 70 / Math.max(120, len);
	const R1 = BARREL.r1 * 1.2;
	const fx = BARREL.x + d[0] * len;
	const fy = BARREL.y + d[1] * len;
	return (
		<g opacity={o}>
			{/* shadow of the barrel on the bales below */}
			<path d={`M${at(0.25, 1, rAt(0.25) + 30)} L${at(1, 1, R1 + 40)} L${at(1, -0.2, R1)} Z`} fill="rgba(0,0,0,0.22)" transform="translate(30 60)" />
			<polygon points={`${at(0, 1, BARREL.r0)} ${at(1, 1, BARREL.r1)} ${at(1, -1, BARREL.r1)} ${at(0, -1, BARREL.r0)}`} fill="#3A3A47" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<polyline points={`${at(0.05, -0.55, BARREL.r0)} ${at(0.92, -0.55, BARREL.r1)}`} stroke={HAY.ironL} strokeWidth={lw * 1.8} strokeLinecap="round" fill="none" />
			{band(0.3, 40, rAt(0.3) * 1.1, 'b1')}
			{band(0.62, 40, rAt(0.62) * 1.1, 'b2')}
			{/* swollen muzzle */}
			<polygon points={`${at(mk, 1, R1 * 0.92)} ${at(1, 1, R1)} ${at(1, -1, R1)} ${at(mk, -1, R1 * 0.92)}`} fill={HAY.iron} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<polyline points={`${at(mk + 0.02, -0.6, R1)} ${at(0.99, -0.6, R1)}`} stroke={HAY.ironL} strokeWidth={lw * 1.6} strokeLinecap="round" fill="none" />
			{/* the muzzle face toward the viewer: ring + dark bore */}
			<ellipse cx={fx} cy={fy} rx={R1 * 0.5} ry={R1} transform={`rotate(${deg} ${fx} ${fy})`} fill={HAY.ironL} stroke={INK} strokeWidth={lw * 1.1} />
			<ellipse cx={fx + d[0] * 4} cy={fy + d[1] * 4} rx={R1 * 0.34} ry={R1 * 0.66} transform={`rotate(${deg} ${fx + d[0] * 4} ${fy + d[1] * 4})`} fill="#06060A" stroke={INK} strokeWidth={lw * 0.8} />
			<ellipse cx={fx - n[0] * R1 * 0.18} cy={fy - n[1] * R1 * 0.18} rx={R1 * 0.14} ry={R1 * 0.3} transform={`rotate(${deg} ${fx - n[0] * R1 * 0.18} ${fy - n[1] * R1 * 0.18})`} fill="#000" />
		</g>
	);
};

/** castle cues behind the tarp (pass as BaleWallG `behind`): an orange pennant on a pole and one merlon corner poking over the
 *  tarp; off 0..1 = they whip away with the tarp */
const WallCuesG: React.FC<{t: number; lw: number; off?: number}> = ({t, lw, off = 0}) => {
	if (off >= 1) return null;
	const fx = PENNANT.u;
	const fy = PENNANT.top + 30;
	const top: string[] = [];
	const bot: string[] = [];
	for (let j = 0; j <= 10; j++) {
		const f = j / 10;
		const x = fx + 20 + f * 340;
		const w = Math.sin(t * 6 - f * 5) * 26 * f;
		top.push(`${x.toFixed(1)},${(fy + w).toFixed(1)}`);
		bot.unshift(`${x.toFixed(1)},${(fy + 190 - (j === 10 ? 95 : 0) + w).toFixed(1)}`);
	}
	const flag = [...top, `${(fx + 300).toFixed(1)},${(fy + 95 + Math.sin(t * 6 - 5) * 26).toFixed(1)}`, ...bot].join(' ');
	const tr = off > 0 ? `translate(${off * off * 3400} ${-off * 1700}) rotate(${off * 30} 1920 -3520)` : undefined;
	return (
		<g transform={tr} opacity={1 - off}>
			{/* merlon corner (stone, ink) poking over the tarp */}
			<path d={`M${PEEK.L},-3400 L${PEEK.L},${PEEK.top} L${PEEK.R},${PEEK.top} L${PEEK.R},${PEEK.step} L${PEEK.stepR},${PEEK.step} L${PEEK.stepR},-3400 Z`} fill={HAY.stone} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<rect x={PEEK.L + lw * 0.5} y={PEEK.top + lw * 0.5} width={56} height={330} fill={HAY.stoneL} opacity={0.8} />
			<line x1={PEEK.L} y1={PEEK.step} x2={PEEK.R} y2={PEEK.step} stroke={HAY.stoneD} strokeWidth={lw * 0.6} />
			<line x1={(PEEK.L + PEEK.R) / 2} y1={PEEK.top} x2={(PEEK.L + PEEK.R) / 2} y2={PEEK.step} stroke={HAY.stoneD} strokeWidth={lw * 0.6} />
			{/* pennant */}
			<line x1={fx} y1={-3380} x2={fx} y2={PENNANT.top} stroke={INK} strokeWidth={22 + lw * 2} strokeLinecap="round" />
			<line x1={fx} y1={-3380} x2={fx} y2={PENNANT.top} stroke="#6B5236" strokeWidth={22} strokeLinecap="round" />
			<circle cx={fx} cy={PENNANT.top - 14} r={28} fill={PAL.gold} stroke={INK} strokeWidth={lw * 0.8} />
			<polygon points={flag} fill={PAL.orange} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
		</g>
	);
};

/** the whole hidden-castle face of the wall: slot + barrel (+ the rammed bale already in place unless the hook rams it) */
const WallFace: React.FC<{t: number; lw: number; o?: number; poke?: number; filled?: boolean}> = ({t, lw, o = 1, poke = 1, filled = true}) =>
	o <= 0 ? null : (
		<g opacity={o}>
			<CastleSlotG lw={lw} />
			{filled ? <BaleG cx={GAP_X} cy={GAP_Y} seed={777} lw={lw} t={t} /> : null}
			<BarrelG lw={lw} poke={poke} />
		</g>
	);

/** «4 YEARS» timer stuck on the bale wall (world anchor TIMER); until 10 s only the eye + flaps show (the dial has a START label) */
const WallTimer: React.FC<{c: Cam; t: number; slam?: number; roll?: number; fill?: number; done?: number; start?: number; off?: number}> = ({c, t, slam = 1, roll = 0, fill = 0, done = 0, start = 0, off = 0}) => {
	if (slam <= 0 || off >= 1) return null;
	const [x0, y0] = P(c, TIMER.u, TIMER.v);
	const s = TIMER.k * c.S * (1 - 0.5 * off);
	const x = x0 + off * off * 900;
	const y = y0 - off * 760;
	const sc = lerp(1.8, 1, popOv(slam));
	const clip = t < 10 ? `inset(0px 0px ${Math.max(0, 1920 - (y + 196 * s * sc))}px 0px)` : undefined;
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, clipPath: clip, opacity: 1 - off}}>
			<Timer4Y x={x} y={y} s={s} t={t} slam={slam} roll={roll} fill={fill} done={done} start={start} />
		</div>
	);
};

/** the big crossed-out eye that pops on «unseen» (same badge as the timer's), (x, y) centre, r radius px */
const EyeBadge: React.FC<{x: number; y: number; r: number; t: number; o?: number; blinkFrom?: number}> = ({x, y, r, t, o = 1, blinkFrom = 0}) => {
	if (r <= 0.5) return null;
	const k = r / 112;
	// wide open while it pops (a closed crossed-out eye reads as a «no entry» sign), blinking only after blinkFrom
	const blink = t >= blinkFrom && (t - blinkFrom) % 1.3 < 0.12 ? 1 : 0;
	const look = Math.sin(t * 3.1) * 16;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o}}>
			<g transform={`translate(${x} ${y}) scale(${k})`}>
				<circle r={124} fill="rgba(15,34,56,0.55)" />
				<circle r={112} fill={PAL.parchment} stroke={INK} strokeWidth={12} />
				<g transform={`scale(1 ${1 - blink * 0.88})`}>
					<path d="M-86,0 Q0,-70 86,0 Q0,70 -86,0 Z" fill="#fff" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
					<circle cx={look} cy={0} r={32} fill={PAL.teal} stroke={INK} strokeWidth={6} />
					<circle cx={look} cy={0} r={15} fill={INK} />
					<circle cx={look - 10} cy={-10} r={6} fill="#fff" />
				</g>
				<line x1={-70} y1={-70} x2={70} y2={70} stroke={INK} strokeWidth={34} strokeLinecap="round" />
				<line x1={-70} y1={-70} x2={70} y2={70} stroke={PAL.stamp} strokeWidth={20} strokeLinecap="round" />
			</g>
		</svg>
	);
};

/** the farmer on the ladder against the wall (wall units): the ladder top leans next to the gap's left edge, so the farmer's
 *  boots stay on the top rungs while he shoves the last bale in */
const LADDER = {foot: -1400, h: 3150, lean: 9, at: 2250};
const LadderRider: React.FC<{t: number; lw: number; pose?: FarmerPose; k?: number; look?: number; mood?: FarmerMood; sway?: number; riderDx?: number; lean?: number}> = ({t, lw, pose = 'stand', k = 1, look, mood, sway = 1, riderDx = -20, lean = LADDER.lean}) => (
	<g transform={`translate(${LADDER.foot} 0)`}>
		<LadderG t={t} h={LADDER.h} lean={lean} sway={sway} riderAt={LADDER.at} riderDx={riderDx} lw={lw} rider={<FarmerG t={t} pose={pose} k={k} look={look} mood={mood} lw={lw} />} />
	</g>
);

// ======================================================================= 1 · HOOK (frame 0: the farmer rams the last bale in)
const THUMP = 0.3;
const RAM_FROM: [number, number] = [-330, -110];
/** ram progress: frame 0 shows the bale half in front of the slot, then a hard shove thumps it in at THUMP. The loop pre-roll
 *  (t < 0) holds the frame-0 state, so the match dissolves into it (Beaten → Loop → frame 0) never double the farmer or ladder */
const ramAt = (t: number) => (t < 0 ? 0.32 : lerp(0.32, 1, Math.pow(clamp01(t / THUMP), 1.25)));
/** the ladder leans into the shove (its top travels with him, his boots stay on the rungs) */
const hookLean = (t: number) => (t <= 0 ? 5.5 : t < THUMP ? lerp(5.5, LADDER.lean, Math.pow(t / THUMP, 1.25)) : LADDER.lean);
const hookCam = (t: number): Cam => {
	// frame 0: the farmer's boots at x ≈ 85 and the cannon muzzle ends at x ≈ 815 (inside the 48–887 band, clear of the right rail)
	const B: Cam = {S: 0.365, U: -420, V: -2890, X: 490, Y: 760};
	if (t < 0) return B;
	// frame 0 → push into the shove → crash-zoom out (overshoot, settle) → snap onto the farmer + crenel + cannon on «castle» →
	// drift; the snap frames the farmer's back at x ≥ 100 and the muzzle at x ≤ 780, so his pat on the wall stays in frame
	return camPath(t, [
		[0, B],
		[THUMP, {S: 0.53, U: -560, V: -2830, X: 500, Y: 760}, (x) => clamp01(x)],
		[0.62, {S: 0.15, U: -60, V: -1800, X: 440, Y: 700}, easeOut],
		[0.8, {S: 0.205, U: -100, V: -1920, X: 440, Y: 700}],
		[0.94, {S: 0.185, U: -90, V: -1880, X: 440, Y: 700}],
		[1.24, {S: 0.31, U: -440, V: -2700, X: 450, Y: 700}, easeOut],
		[1.98, {S: 0.34, U: -420, V: -2690, X: 450, Y: 700}],
	]);
};
/** how far the push hands reach in front of the feet (FarmerG push pose, leaned 9°) */
const handReach = (k: number) => 0.988 * lerp(236, 324, clamp01(k)) + 50;
/** the hook state at time t (t < 0 = the loop pre-roll: the bale is still on its way to the gap) */
const hookState = (t: number) => {
	const ram = ramAt(t);
	const e = Math.pow(ram, 1.7);
	const left = GAP_X + RAM_FROM[0] * (1 - e) - (BW / 2) * (1.12 - 0.12 * e);
	const ta = t - THUMP;
	const sway = 1 + (ta > 0 ? 1.9 * Math.exp(-ta * 2.2) : 0);
	const kBase = ta < 0 ? ram : lerp(1, 0.72, clamp01(ta / 0.4));
	const lean = hookLean(t);
	const [lx, ly] = ladderPoint(t, LADDER.at, lean, sway);
	// boots stay on the rungs: the reach the body cannot make is covered by the arms and the ladder leaning in
	const want = (tt: number, l: number, ll: number) => clampR(tt - handReach(l) - (LADDER.foot + ll), -90, 60);
	let riderDx = want(left, kBase, lx);
	if (ta > 0) {
		const [lx0] = ladderPoint(THUMP, LADDER.at, LADDER.lean, 1);
		riderDx = lerp(want(GAP_X - BW / 2, 1, lx0), -20, easeInOut(clamp01(ta / 0.3)));
	}
	return {ram, e, gx: GAP_X, gy: GAP_Y, ta, sway, kBase, lean, riderDx, feetU: LADDER.foot + lx + riderDx, feetV: ly};
};
/** loose straw stalks bursting out of the gap toward the camera after the thump (screen space, ink-outlined) */
const StrawBurst: React.FC<{x: number; y: number; age: number; n?: number}> = ({x, y, age, n = 34}) => {
	if (age < 0 || age > 1.1) return null;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
			{Array.from({length: n}, (_, i) => {
				const ang = (h1(i * 2.3) - 0.5) * Math.PI * 1.7 - Math.PI / 2;
				const sp = 700 + 1300 * h1(i * 5.1);
				const px = x + Math.cos(ang) * sp * age;
				const py = y + Math.sin(ang) * sp * age + 900 * age * age;
				const grow = 1 + 2.2 * age * h1(i * 7.7);
				const L = (36 + 50 * h1(i * 3.9)) * grow;
				const rot = h1(i * 9.3) * 180 + age * (300 + 500 * h1(i));
				const o = clamp01((1.1 - age) / 0.35);
				return (
					<g key={i} transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${rot.toFixed(1)})`} opacity={o}>
						<line x1={-L / 2} y1={0} x2={L / 2} y2={0} stroke={INK} strokeWidth={9 * Math.sqrt(grow)} strokeLinecap="round" />
						<line x1={-L / 2} y1={0} x2={L / 2} y2={0} stroke={i % 3 ? HAY.strawL : HAY.straw} strokeWidth={4.5 * Math.sqrt(grow)} strokeLinecap="round" />
					</g>
				);
			})}
		</svg>
	);
};

/** where the hook's farmer stands on screen (for the match cut of the last shot) */
const hookFarmer = (tIn: number) => {
	const t = Math.max(0, tIn); // the pre-roll holds frame 0 (HookArt)
	const c = hookCam(t);
	const st = hookState(t);
	const [x, y] = P(c, st.feetU, st.feetV);
	return {x, y, s: c.S};
};

const HookArt: React.FC<{t: number}> = ({t: tIn}) => {
	// the loop pre-roll (t < 0) is frame 0 held: same sway, same flag, same bale (only the handheld tremor of Loop's Shk moves)
	const t = Math.max(0, tIn);
	const c = kicked(hookCam(t), kick(t, [W(6) + 0.08], 0.06));
	const lw = lwFor(c.S);
	const st = hookState(t);
	const pat = bump(t, W(6) + 0.08, 0.32);
	const poke = t < W(4) - 0.05 ? 0.85 : lerp(0.85, 1, popOv(clamp01((t - W(4) + 0.05) / 0.32)));
	const {gx, gy, e} = st;
	const puffs = [
		{c: GAP_CELL[0], r: GAP_CELL[1], age: st.ta, size: 3.0},
		{c: GAP_CELL[0] - 1, r: GAP_CELL[1], age: st.ta - 0.04, size: 2.2},
		{c: GAP_CELL[0], r: GAP_CELL[1] + 1, age: st.ta - 0.08, size: 2.4},
		{c: GAP_CELL[0] + 1, r: GAP_CELL[1] - 1, age: st.ta - 0.1, size: 1.8},
	];
	return (
		<AbsoluteFill>
			<Field c={c} t={t} />
			<World c={c}>
				<ellipse cx={0} cy={30} rx={2300} ry={160} fill="rgba(40,30,10,0.25)" />
				<BaleWallG t={t} gap={GAP_CELL} gapShow="none" tarp={1} lw={lw} behind={<WallCuesG t={t} lw={lw} />} />
				<CastleSlotG lw={lw} />
				{/* the last bale, shoved in from the ladder side (slightly bigger = in front, thumps in at THUMP) */}
				<BaleG cx={gx + RAM_FROM[0] * (1 - e)} cy={gy + RAM_FROM[1] * (1 - e)} rot={-5 * (1 - e)} sc={lerp(1.12, 1, e)} seed={777} lw={lw} t={t} />
				<BarrelG lw={lw} poke={poke} />
				{puffs.map((p, i) => {
					const [px, py] = wallCell(p.c, p.r);
					return <StrawDustG key={i} x={px} y={py + BH * 0.3} age={p.age} size={p.size} n={7} seed={i * 5 + 3} life={1.1} lw={lw} bits={10} />;
				})}
				<LadderRider t={t} lw={lw} pose="push" k={st.kBase + 0.35 * pat} sway={st.sway} riderDx={st.riderDx} lean={st.lean} />
				<StrawDustG x={gx - BW * 0.4} y={gy + BH * 0.2} age={t - W(6) - 0.14} size={1.5} n={5} seed={17} life={0.9} lw={lw} bits={6} />
			</World>
			<StrawBurst x={P(c, gx, gy)[0]} y={P(c, gx, gy)[1]} age={st.ta} />
		</AbsoluteFill>
	);
};

export const Hook: React.FC<SceneProps> = () => {
	const t = useT();
	return (
		<Shk t={t} hits={[THUMP]} amp={8} tremor={1.2}>
			<HookArt t={t} />
		</Shk>
	);
};

/** the loop: frame 0 a moment before it happens (the bale on its way to the gap), dissolving into frame 0 (Short.tsx) */
export const Loop: React.FC<SceneProps> = () => {
	const t = useT();
	const tr = t - DURATION;
	return (
		<Shk t={tr} hits={[THUMP]} amp={8} tremor={1.2}>
			<HookArt t={tr} />
		</Shk>
	);
};

/** frame 0 as a still layer for the loop dissolve (Short.tsx draws it over the last LOOP seconds) */
export const FirstFrame: React.FC = () => (
	<Shk t={0} hits={[THUMP]} amp={8} tremor={1.2}>
		<HookArt t={0} />
	</Shk>
);

// ======================================================================= 2 · NEVER (padlock + wrecking ball)
export const Never: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const tHit = W(12) + 0.02;
	const c = kicked(
		camPath(t, [
			[t0, {S: 0.19, U: 0, V: -1500, X: 440, Y: 640}],
			[W(10) - 0.05, {S: 0.2, U: -40, V: -1450, X: 440, Y: 650}],
			[W(10) + 0.3, {S: 0.245, U: 60, V: -1250, X: 440, Y: 700}, easeOut],
			[tHit, {S: 0.25, U: 120, V: -1230, X: 440, Y: 700}],
			[t1, {S: 0.2, U: 40, V: -1450, X: 440, Y: 660}, easeOut],
		]),
		kick(t, [W(10), tHit], 0.06),
	);
	const lw = lwFor(c.S);
	const [lx, ly] = P(c, 0, -1150);
	const sp = (0.82 * c.S) / 0.168;
	// the ball hangs from a pivot just right of the padlock: at tHit its left side touches the padlock's right side (contact
	// star there, ball inside x ≤ 887), it rings, hops off twice and droops back against the lock
	const HIT_ANG = (Math.asin(150 / 1075) * 180) / Math.PI;
	const ang = t < tHit - 1.0 ? 74 : t < tHit ? lerp(74, HIT_ANG, Math.pow((t - tHit + 1.0) / 1.0, 2)) : HIT_ANG + 12 * Math.abs(Math.sin((t - tHit) * 6.5)) * Math.exp(-(t - tHit) * 3.4);
	return (
		<Shk t={t} hits={[tHit]} amp={8} tremor={1.2}>
			<Field c={c} t={t} />
			<World c={c}>
				<ellipse cx={0} cy={30} rx={2300} ry={160} fill="rgba(40,30,10,0.25)" />
				<BaleWallG t={t} tarp={1} lw={lw} behind={<WallCuesG t={t} lw={lw} />} front={<LadderRider t={t} lw={lw} pose={t < tHit ? 'stand' : 'arms'} look={0.6} mood={t < tHit ? 'smile' : 'grin'} />} />
				<WallFace t={t} lw={lw} />
			</World>
			<GiantPadlock x={lx} y={ly} s={sp} t={t} snap={t - W(10)} chain={easeOut((t - W(10) + 0.05) / 0.25)} chainW={780} hit={t - tHit} />
			<WreckingBall x={lx + 120 * sp} y={ly - 1075 * sp} len={1075} s={sp} angle={ang} hit={t - tHit} />
		</Shk>
	);
};

// ======================================================================= 3 · BET (thumbs-up, eye, timer «4 YEARS» slams on «four»)
export const Bet: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const slamT = W(19) - 0.03;
	const c = kicked(
		camPath(t, [
			[t0, {S: 0.25, U: -260, V: -1800, X: 380, Y: 820}],
			[W(14) + 0.35, {S: 0.32, U: -720, V: -2150, X: 360, Y: 760}, easeOut],
			[W(17) - 0.06, {S: 0.33, U: -670, V: -2150, X: 360, Y: 760}],
			[W(17) + 0.3, {S: 0.29, U: -350, V: -2060, X: 380, Y: 820}, easeOut],
			[slamT, {S: 0.29, U: -330, V: -1990, X: 380, Y: 820}],
			[slamT + 0.3, {S: 0.25, U: -150, V: -1714, X: 380, Y: 820}, easeOut],
			[t1, {S: 0.262, U: -110, V: -1714, X: 390, Y: 825}],
		]),
		kick(t, [W(17), slamT + 0.08], 0.06),
	);
	const lw = lwFor(c.S);
	const slam = clamp01((t - slamT) / 0.28);
	const [tx, ty] = P(c, TIMER.u, TIMER.v);
	const ts = TIMER.k * c.S;
	// the eye pops on «unseen» in the sky above the tarp (clear of the slot and the cannon), then flies into the timer's badge
	// as the timer slams on «four»
	const eyeIn = popOv(clamp01((t - W(17) + 0.04) / 0.3));
	const fly = easeInOut(clamp01((t - slamT + 0.1) / 0.16));
	const ex = lerp(700, tx, fly);
	const ey = lerp(380, ty - 306 * ts, fly);
	const er = lerp(124 * eyeIn, 112 * ts, fly);
	return (
		<Shk t={t} hits={[slamT + 0.1]} amp={7} tremor={1.2}>
			<Field c={c} t={t} />
			<World c={c}>
				<BaleWallG t={t} tarp={1} lw={lw} behind={<WallCuesG t={t} lw={lw} />} front={<LadderRider t={t} lw={lw} pose="thumbs" k={easeOut((t - W(14)) / 0.3)} look={0} />} />
				<WallFace t={t} lw={lw} />
				<StrawDustG x={TIMER.u - 500} y={TIMER.v + 300} age={t - slamT - 0.1} size={2.2} n={6} seed={5} life={0.9} lw={lw} bits={8} />
				<StrawDustG x={TIMER.u + 560} y={TIMER.v + 260} age={t - slamT - 0.12} size={1.8} n={5} seed={9} life={0.85} lw={lw} bits={6} dir={0.6} />
			</World>
			<WallTimer c={c} t={t} slam={slam} roll={t > slamT + 0.3 ? 1 : 0} />
			{slam < 0.6 ? <EyeBadge x={ex} y={ey} r={er} t={t} o={1 - clamp01((slam - 0.3) / 0.3)} blinkFrom={W(19)} /> : null}
		</Shk>
	);
};

// ======================================================================= 4–5 · LOOK / GONE (the council car, the hovering stamp)
const ROAD_A = 1030;
const carRoadX = (t: number) => {
	const a = W(21);
	if (t < W(25)) return lerp(-330, 290, easeOut((t - a) / (W(25) - a)));
	if (t < W(31)) return 290 + (t - W(25)) * 80;
	return 290 + (W(31) - W(25)) * 80 + Math.pow(t - W(31), 2) * 2600;
};
/** the 0.45 s face close-up on «council,»: the farmer freezes on the ladder with a sweat drop (cut in, cut out) */
const FREEZE_IN = W(25) - 0.02;
const FREEZE_OUT = FREEZE_IN + 0.45;
/** «One look»: the whip from Bet lands (b(21) + 0.28) on a 0.37 s close-up of the driver, until the cut to the farmer's freeze */
const DRIVER_IN = W(21) - 0.06 + 0.28;

/** the bale wall as the driver sees it over his shoulder: big bales under the blue tarp, out of focus (screen px) */
const BlurWall: React.FC<{t: number; dx: number}> = ({t, dx}) => (
	<div style={{position: 'absolute', inset: 0, filter: 'blur(5px)', transform: `translateX(${dx.toFixed(1)}px)`}}>
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
			<g transform="translate(-140 150) scale(0.52)">
				{Array.from({length: 7}, (_, r) =>
					Array.from({length: 3}, (_, c) => <BaleG key={`${r}-${c}`} cx={c * 640 + (r % 2 ? 320 : 0)} cy={300 + r * 320} seed={r * 7 + c * 3 + 11} lw={12} t={t} />),
				)}
				<path d={`M-200,-80 L1900,-80 L1900,150 ${Array.from({length: 12}, (_, i) => `L${1900 - (i + 1) * 175},${150 + (i % 2 ? 40 : -10)}`).join(' ')} L-200,150 Z`} fill={HAY.tarp} stroke={INK} strokeWidth={12} strokeLinejoin="round" />
				<path d="M-200,-10 L1900,-10" stroke={HAY.tarpL} strokeWidth={22} opacity={0.6} />
				<line x1={780} y1={-80} x2={780} y2={-470} stroke={INK} strokeWidth={34} strokeLinecap="round" />
				<line x1={780} y1={-80} x2={780} y2={-470} stroke="#6B5236" strokeWidth={20} strokeLinecap="round" />
				<path d={`M800,-460 L1110,${-420 + Math.sin(t * 6) * 18} L800,-330 Z`} fill={PAL.orange} stroke={INK} strokeWidth={12} strokeLinejoin="round" />
			</g>
		</svg>
	</div>
);

/** the driver's head in 3/4 view facing right (screen px, centre hx, hy): f 0..1 = how far the face points right (0.62 = the road
 *  ahead, 0.25 = turned toward the viewer's left), up 0..1 = eyes and brows lifted, eyes 0..1 = pupils slid from the road up
 *  and to the left (they lead the head) */
const DriverHead: React.FC<{hx: number; hy: number; f: number; up: number; eyes: number}> = ({hx, hy, f, up, eyes}) => {
	const xF = hx + 72 * f;
	const sp = 46 * (1 - 0.32 * f);
	const px = lerp(15, -15, eyes);
	const py = lerp(3, -17, eyes);
	const earX = hx - lerp(150, 70, f);
	const hair = '#3b2a20';
	// hair: a fringe above the brows on the face side, down to the nape behind the ear (the side away from the face)
	const hairD = `M${hx + 180},${hy - 210} L${hx + 180},${hy - 96} Q${xF + 50},${hy - 128} ${xF - 5},${hy - 94} Q${(xF + earX) / 2},${hy - 118} ${earX + 30},${hy - 84} Q${earX + 30},${hy + 30} ${earX - 12},${hy + 78} L${hx - 180},${hy + 88} L${hx - 180},${hy - 210} Z`;
	return (
		<g>
			<defs>
				<clipPath id="drvHead">
					<ellipse cx={hx} cy={hy} rx={150} ry={170} />
				</clipPath>
			</defs>
			{/* neck */}
			<path d={`M${hx - 56},${hy + 120} L${hx - 50},${hy + 250} L${hx + 50},${hy + 250} L${hx + 56},${hy + 120} Z`} fill={SKIN_D} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
			<ellipse cx={hx} cy={hy} rx={150} ry={170} fill={SKIN} />
			<path d={hairD} fill={hair} clipPath="url(#drvHead)" />
			<ellipse cx={hx} cy={hy} rx={150} ry={170} fill="none" stroke={INK} strokeWidth={9} />
			{/* ear on the side away from the face */}
			<ellipse cx={earX} cy={hy + 12} rx={28} ry={44} fill={SKIN_D} stroke={INK} strokeWidth={7} />
			<path d={`M${earX - 8},${hy - 8} Q${earX + 8},${hy + 12} ${earX - 6},${hy + 32}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
			{/* brows lift as he looks up */}
			{[-1, 1].map((k) => (
				<path key={`b${k}`} d={`M${xF + k * sp - 26},${hy - 58 - 22 * up + (k === -1 ? -4 : 2) * up} L${xF + k * sp + 26},${hy - 62 - 22 * up + (k === -1 ? 2 : -4) * up}`} stroke={hair} strokeWidth={13} strokeLinecap="round" />
			))}
			{[-1, 1].map((k) => {
				const ex = xF + k * sp;
				const ey = hy - 8 - 6 * up;
				const rx = (k === 1 ? 23 : 27) * (1 + 0.12 * up);
				const ry = 31 + 9 * up;
				return (
					<g key={`e${k}`}>
						<ellipse cx={ex} cy={ey} rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth={6} />
						<circle cx={ex + px * (rx / 27)} cy={ey + py * (ry / 40)} r={13} fill={INK} />
						<circle cx={ex + px * (rx / 27) - 5} cy={ey + py * (ry / 40) - 5} r={4.5} fill="#fff" />
					</g>
				);
			})}
			{/* nose toward the face side, the mouth drops open as he spots it */}
			<path d={`M${xF + 6},${hy + 4} Q${xF + 62 * f + 16},${hy + 46} ${xF + 4},${hy + 58}`} fill={SKIN_D} stroke={INK} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
			{up > 0.4 ? (
				<ellipse cx={xF + 10 * f} cy={hy + 102} rx={14} ry={10 + 10 * up} fill="#5a1a24" stroke={INK} strokeWidth={5} />
			) : (
				<path d={`M${xF - 22 + 26 * f},${hy + 100} Q${xF + 26 * f},${hy + 108} ${xF + 22 + 26 * f},${hy + 98}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
			)}
			<ellipse cx={xF - 52} cy={hy + 58} rx={22} ry={12} fill="#e8866e" opacity={0.35} />
		</g>
	);
};

/** the close-up: through his open side window, the driver (eyes on the road) turns his head up and to the left, toward the
 *  bale wall towering behind him; the push-in and the road bob keep it alive */
const DriverClose: React.FC<{t: number}> = ({t}) => {
	const a = t - DRIVER_IN;
	const eyes = easeOut(clamp01((a - 0.02) / 0.13));
	const turn = easeInOut(clamp01((a - 0.06) / 0.2));
	const push = lerp(1, 1.08, clamp01(a / 0.4));
	const bob = Math.sin(t * 17) * 4 + Math.sin(t * 7.3) * 2.5;
	const tilt = lerp(3, -11, turn);
	const hx = 520;
	const hy = 640 - 16 * turn;
	const teal = PAL.teal;
	const tealD = mixHex(PAL.teal, '#000000', 0.3);
	return (
		<AbsoluteFill style={{background: 'linear-gradient(180deg, #5fb4ea 0%, #fff2cf 70%)'}}>
			<div style={{position: 'absolute', left: 0, top: 820, width: 1080, height: 1100, background: '#7cb655'}} />
			<BlurWall t={t} dx={-a * 140} />
			<AbsoluteFill style={{transform: `scale(${push}) translateY(${bob.toFixed(1)}px)`, transformOrigin: '500px 640px'}}>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					{/* the far side of the cabin: the seat back behind his shoulder */}
					<rect x={130} y={720} width={210} height={330} rx={60} fill="#3a3f4b" stroke={INK} strokeWidth={8} />
					{/* steering wheel, bottom right */}
					<circle cx={900} cy={1080} r={250} fill="none" stroke={INK} strokeWidth={58} />
					<circle cx={900} cy={1080} r={250} fill="none" stroke="#2a2a32" strokeWidth={42} />
					{/* shoulders, shirt, seat belt */}
					<path d={`M${hx - 300},1080 Q${hx - 290},840 ${hx - 70},${hy + 205} L${hx + 70},${hy + 205} Q${hx + 280},840 ${hx + 300},1080 Z`} fill="#e8e2d4" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
					<path d={`M${hx - 70},${hy + 205} L${hx - 10},${hy + 300} L${hx + 70},${hy + 205}`} fill="none" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
					<path d={`M${hx + 210},860 L${hx - 140},1080`} stroke={INK} strokeWidth={46} strokeLinecap="butt" />
					<path d={`M${hx + 210},860 L${hx - 140},1080`} stroke="#4a4f58" strokeWidth={32} strokeLinecap="butt" />
					<g transform={`rotate(${tilt.toFixed(2)} ${hx} ${hy + 190})`}>
						<DriverHead hx={hx} hy={hy} f={lerp(0.62, 0.22, turn)} up={turn} eyes={eyes} />
					</g>
					{/* the car around him: roof rail, slanted front pillar, door with the window sill and handle */}
					<path d="M-40,-200 L1120,-200 L1120,300 L-40,300 Z" fill={teal} stroke={INK} strokeWidth={10} />
					<rect x={-40} y={250} width={1160} height={22} fill="#fff" opacity={0.25} />
					<path d="M820,300 L940,300 L1120,1100 L990,1100 Z" fill={teal} stroke={INK} strokeWidth={10} strokeLinejoin="round" />
					<path d="M-40,300 L60,300 L60,1100 L-40,1100 Z" fill={teal} stroke={INK} strokeWidth={10} />
					<path d="M-40,1060 L1120,1060 L1120,1960 L-40,1960 Z" fill={teal} stroke={INK} strokeWidth={10} />
					<rect x={-40} y={1060} width={1160} height={40} fill="#22222a" stroke={INK} strokeWidth={8} />
					<rect x={-40} y={1500} width={1160} height={460} fill={tealD} opacity={0.6} />
					<rect x={600} y={1420} width={190} height={46} rx={20} fill={tealD} stroke={INK} strokeWidth={8} />
					<path d="M880,330 L920,330 L1000,700 L960,700 Z" fill="#fff" opacity={0.35} />
				</svg>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/** dotted eyeline from the driver's head to the slot with the cannon (screen px), revealed dot by dot, marching */
const EyeLine: React.FC<{from: [number, number]; to: [number, number]; k: number; o: number; t: number}> = ({from, to, k, o, t}) => {
	if (k <= 0 || o <= 0) return null;
	const n = 12;
	const cx = Math.min(from[0], to[0]) - 170;
	const cy = (from[1] + to[1]) / 2;
	const ph = (t * 2.2) % 1;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o}}>
			{Array.from({length: n}, (_, i) => {
				const u = (i + ph) / n;
				if (u > k) return null;
				const x = (1 - u) * (1 - u) * from[0] + 2 * (1 - u) * u * cx + u * u * to[0];
				const y = (1 - u) * (1 - u) * from[1] + 2 * (1 - u) * u * cy + u * u * to[1];
				return <circle key={i} cx={x} cy={y} r={12} fill="#fff" stroke={INK} strokeWidth={5} />;
			})}
		</svg>
	);
};

const RoadScene: React.FC<{t: number}> = ({t}) => {
	if (t >= DRIVER_IN && t < FREEZE_IN)
		return (
			<Shk t={t} hits={[DRIVER_IN]} amp={3} tremor={1.2}>
				<DriverClose t={t} />
			</Shk>
		);
	const wide = camL(WIDE, {S: 0.18, U: 0, V: -1550, X: 440, Y: 690}, easeInOut((t - W(21) + 0.06) / 2.6));
	const [flx, fly] = ladderPoint(t, LADDER.at, LADDER.lean, 1);
	const faceCam: Cam = {S: lerp(1.05, 1.16, clamp01((t - FREEZE_IN) / 0.45)), U: LADDER.foot + flx - 20 + 10, V: fly - 800, X: 500, Y: 700};
	const close = t >= FREEZE_IN && t < FREEZE_OUT;
	const c = close ? faceCam : wide;
	const lw = lwFor(c.S);
	const {k} = bgXf(c);
	const stare = t >= W(25) && t < W(31) + 0.1;
	// the driver's gaze stays on the wall (back of his head to the camera, −1), never on the viewer; on «gone» he looks ahead
	const look = t < DRIVER_IN ? 0 : t < W(31) ? -1 : -1 + easeInOut((t - W(31)) / 0.2);
	const [cx, cy] = bgP(c, carRoadX(t), ROAD_A + 30);
	const carS = 0.7 * k;
	const eyeK = clamp01((t - FREEZE_OUT) / 0.3);
	const eyeO = 1 - clamp01((t - W(31) - 0.02) / 0.12);
	const slot = P(c, BARREL.x, BARREL.y + 40);
	const pose: FarmerPose = t < W(25) + 0.06 ? 'stand' : t < W(31) + 0.12 ? 'freeze' : 'stand';
	// stamp: drops on «order», hovers and wobbles, lifts away on «gone»
	const dropT = W(29) - 0.12;
	const upT = W(31) + 0.08;
	const lift = t < dropT ? 3000 : t < upT ? lerp(2600, 300, popOv(clamp01((t - dropT) / 0.32))) : lerp(300, 3200, Math.pow(clamp01((t - upT) / 0.42), 2));
	const [sx, sy] = P(c, -150, -950);
	const roll = t < W(25) + 0.04 ? 1 : t < W(31) + 0.12 ? 0 : 1;
	return (
		<Shk t={t} hits={[dropT + 0.3, FREEZE_IN]} amp={4} tremor={1.2}>
			<Field c={c} t={t} roadY={ROAD_A} />
			<World c={c}>
				<ellipse cx={0} cy={30} rx={2300} ry={160} fill="rgba(40,30,10,0.25)" />
				<BaleWallG t={t} tarp={1} lw={lw} behind={<WallCuesG t={t} lw={lw} />} front={<LadderRider t={t} lw={lw} pose={pose} look={pose === 'stand' ? (t < W(25) ? -0.8 : 0.3) : undefined} mood={t > W(31) + 0.12 ? 'grin' : undefined} />} />
				<WallFace t={t} lw={lw} />
			</World>
			{close ? null : <WallTimer c={c} t={t} roll={roll} />}
			{lift < 2900 && !close ? <GiantStamp x={sx} y={sy} s={0.76 * k} t={t} lift={lift} wobble={t < upT ? 1 : 0.3} /> : null}
			{close ? null : <EyeLine from={[cx + 52 * carS, cy - 236 * carS]} to={slot} k={eyeK} o={eyeO} t={t} />}
			{close ? null : <Car x={cx} y={cy} s={carS} t={t} look={look} speed={stare ? 0.35 : t > W(31) ? 4 : 1.1} />}
		</Shk>
	);
};
export const Look: React.FC<SceneProps> = () => <RoadScene t={useT()} />;
export const Gone: React.FC<SceneProps> = () => <RoadScene t={useT()} />;

// ======================================================================= 6–8 · X-RAY (battlements, cannons, family inside)
/** «Cannons.»: the cannon rolls forward from 9.72 s and puffs at 9.87 s, inside the punch shot (9.69–10.13 s) */
const CANNON_T = W(33) - 0.03;
const XRay: React.FC<{t: number; c: Cam}> = ({t, c}) => {
	const lw = lwFor(c.S);
	const xray = easeInOut((t - W(32) + 0.04) / 0.5);
	const crenel = clamp01((t - W(32) - 0.12) / 0.5);
	const cutaway = easeInOut((t - W(34) + 0.02) / 0.32);
	const rooms = clamp01((t - W(35) + 0.06) / 0.18) + clamp01((t - W(36) + 0.02) / 0.18) + clamp01((t - W(37) + 0.02) / 0.18);
	return (
		<AbsoluteFill>
			<Bg kind="navy" t={t} />
			<World c={c}>
				<ellipse cx={0} cy={40} rx={2300} ry={170} fill="rgba(127,243,255,0.08)" stroke="#7FF3FF" strokeOpacity={0.35} strokeWidth={lw} />
				<BaleWallG
					t={t}
					tarp={1}
					xray={xray}
					lw={lw}
					behind={<CastleG t={t} crenel={crenel} flag={clamp01((t - W(32) - 0.3) / 0.4)} cannonRoll={easeOut((t - CANNON_T) / 0.18)} cannonPuff={t - CANNON_T - 0.15} cutaway={cutaway} rooms={rooms} lw={lw} />}
				/>
			</World>
		</AbsoluteFill>
	);
};
export const Battlements: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const c = camL({S: 0.205, U: 0, V: -1950, X: 450, Y: 700}, {S: 0.23, U: 0, V: -2250, X: 450, Y: 700}, easeInOut((t - t0) / (t1 - t0)));
	return (
		<Shk t={t} hits={[]} tremor={1.2}>
			<XRay t={t} c={c} />
		</Shk>
	);
};
export const Cannons: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const c = camL({S: 0.5, U: 1250, V: -2820, X: 480, Y: 700}, {S: 0.55, U: 1280, V: -2820, X: 480, Y: 700}, easeInOut((t - t0) / (t1 - t0)));
	return (
		<Shk t={t} hits={[CANNON_T + 0.15]} amp={5} tremor={1.2}>
			<XRay t={t} c={c} />
		</Shk>
	);
};
export const Family: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const c = camL({S: 0.205, U: 0, V: -1500, X: 450, Y: 760}, {S: 0.235, U: 0, V: -1350, X: 450, Y: 760}, easeInOut((t - t0) / (t1 - t0)));
	return (
		<Shk t={t} hits={[]} tremor={1.2}>
			<XRay t={t} c={c} />
		</Shk>
	);
};

// ======================================================================= 9–10 · NEVER SEES (seasons) / BALES COME DOWN
const FLIPS: [number, Season][] = [
	[W(39) - 0.02, 'snow'],
	[W(41) - 0.12, 'blossom'],
	[W(43) + 0.02, 'autumn'],
	[W(44) - 0.02, 'summer'],
];
const seasonAt = (t: number) => {
	let from: Season = 'summer';
	let season: Season = 'summer';
	let m = 1;
	for (const [ft, s] of FLIPS) {
		if (t >= ft) {
			from = season;
			season = s;
			m = clamp01((t - ft) / 0.12);
		}
	}
	return {from, season, mix: m};
};
const PASSES = [W(39) + 0.02, W(41) - 0.08, W(43) + 0.06];
// the bales start falling 0.2 s earlier than «bales» and are all down by ≈ 15.38 s: the revealed castle (both towers, the cannon)
// holds ≥ 0.3 s before the punch to «He thinks he's won»
const TOPPLE_T = W(48) - 0.18;
const TOPPLE_D = 1.0;
const WallReveal: React.FC<{t: number; c: Cam}> = ({t, c}) => {
	const lw = lwFor(c.S);
	const {k} = bgXf(c);
	const sea = seasonAt(t);
	const fill = t < W(44) - 0.04 ? lerp(0.06, 0.93, clamp01((t - W(38) + 0.06) / 1.7)) : 1;
	const done = clamp01((t - W(44) + 0.02) / 0.4);
	const tarpOff = clamp01((t - W(47) + 0.12) / 0.4);
	const topple = Math.max(0, (t - TOPPLE_T) / TOPPLE_D);
	const pass = PASSES.find((p) => Math.abs(t - p) < 0.5);
	const [cx, cy] = bgP(c, pass === undefined ? -900 : 520 + (t - pass) * 2900, ROAD_A + 30);
	return (
		<Shk t={t} hits={[W(44) - 0.02, TOPPLE_T + 0.5]} amp={5} tremor={1.2}>
			<Field c={c} t={t} season={sea.season} from={sea.from} mix={sea.mix} roadY={ROAD_A} />
			<World c={c}>
				<ellipse cx={0} cy={30} rx={2300} ry={160} fill="rgba(40,30,10,0.25)" />
				<BaleWallG
					t={t}
					tarp={1}
					tarpOff={tarpOff}
					topple={topple}
					toppleDur={TOPPLE_D}
					lw={lw}
					behind={
						<>
							<CastleG t={t} lw={lw} />
							<WallCuesG t={t} lw={lw} off={tarpOff} />
						</>
					}
				/>
				<WallFace t={t} lw={lw} o={1 - clamp01((t - TOPPLE_T) / 0.15)} />
			</World>
			<WallTimer c={c} t={t} roll={done > 0 ? 0 : 1} fill={fill} done={done} off={tarpOff} />
			{pass !== undefined ? <Car x={cx} y={cy} s={0.62 * k} t={t} look={0} speed={7} /> : null}
		</Shk>
	);
};
export const NeverSees: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return <WallReveal t={t} c={camL(WIDE, {S: 0.172, U: 0, V: -1550, X: 440, Y: 690}, easeInOut((t - t0) / (t1 - t0)))} />;
};
export const Down: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return <WallReveal t={t} c={camL({S: 0.172, U: 0, V: -1550, X: 440, Y: 690}, {S: 0.18, U: 0, V: -1700, X: 440, Y: 690}, easeInOut((t - t0) / (t1 - t0)))} />;
};

// ======================================================================= 11–12 · WON (party popper) / COURT (freeze + gavel)
const FREEZE = W(55);
const FARMER_TOWER: [number, number] = [-1300, -2600];
/** the tower top: the farmer (party hat) behind the merlons pops the popper on «won.»; on «Then» everything freezes and a gavel descends */
const TowerScene: React.FC<{t: number; c: Cam}> = ({t, c}) => {
	const lw = lwFor(c.S);
	const tf = Math.min(t, FREEZE);
	const popT = W(54) + 0.02;
	const frozen = t >= FREEZE;
	const topple = Math.max(0, (t - TOPPLE_T) / TOPPLE_D);
	const [fx, fy] = FARMER_TOWER;
	const [mx, my] = P(c, fx + 279, fy - 1087);
	const g = clamp01((t - FREEZE) / (W(59) - FREEZE));
	const eg = frozen ? easeInOut(g) : 0;
	const [hx, hy] = P(c, fx, fy - 900);
	// the gavel's shadow is cast from above onto the tower top: the merlons and the farmer darken (multiply ≈ 0.55 at full),
	// a soft dark pool without any outline grows as the gavel lowers
	const shade = 1 - 0.45 * eg;
	return (
		<AbsoluteFill>
			<Field c={c} t={tf} />
			<World c={c}>
				<defs>
					<filter id="courtShade" x="-20%" y="-20%" width="140%" height="140%">
						<feComponentTransfer>
							<feFuncR type="linear" slope={shade} />
							<feFuncG type="linear" slope={shade} />
							<feFuncB type="linear" slope={shade * 1.05} />
						</feComponentTransfer>
					</filter>
					<radialGradient id="courtPool">
						<stop offset={0} stopColor="#0c0618" stopOpacity={0.55} />
						<stop offset={0.6} stopColor="#0c0618" stopOpacity={0.4} />
						<stop offset={1} stopColor="#0c0618" stopOpacity={0} />
					</radialGradient>
				</defs>
				<g transform={`translate(${fx} ${fy})`} filter={eg > 0.01 ? 'url(#courtShade)' : undefined}>
					<FarmerG t={frozen ? FREEZE : t} pose="popper" k={easeOut((t - W(51)) / 0.35)} hat="party" popAge={tf - popT} mood={frozen ? 'shock' : 'cheer'} lw={lw} />
				</g>
				<BaleWallG t={tf} topple={topple} toppleDur={TOPPLE_D} lw={lw} behind={<CastleG t={tf} lw={lw} />} />
				{eg > 0.01 ? <ellipse cx={fx + 30} cy={fy - 160} rx={lerp(150, 430, eg)} ry={lerp(60, 230, eg)} fill="url(#courtPool)" opacity={eg} style={{mixBlendMode: 'multiply'}} /> : null}
			</World>
			<PopConfetti x={mx} y={my} t={t} t0={popT} dir={12} spread={80} n={60} power={1500} freeze={FREEZE} s={c.S / 0.3} />
			{frozen ? <Gavel x={hx} y={lerp(-280, hy - 40, 1 - Math.pow(1 - g, 2))} s={0.85 * (c.S / 0.3)} /> : null}
		</AbsoluteFill>
	);
};
const TOWER_A: Cam = {S: 0.3, U: -1180, V: -2700, X: 430, Y: 760};
const TOWER_B: Cam = {S: 0.33, U: -1220, V: -2760, X: 430, Y: 760};
const TOWER_C: Cam = {S: 0.29, U: -1220, V: -2930, X: 430, Y: 760};
export const Won: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<Shk t={t} hits={[W(54) + 0.02]} amp={4} tremor={1.2}>
			<TowerScene t={t} c={camL(TOWER_A, TOWER_B, easeInOut((t - t0) / (t1 - t0)))} />
		</Shk>
	);
};
export const Court: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<Shk t={t} hits={[]} tremor={0.6}>
			<TowerScene t={t} c={camL(TOWER_B, TOWER_C, easeInOut((t - t0) / (t1 - t0)))} />
		</Shk>
	);
};

// ======================================================================= 13 · TWIST «HIDING IT = BUILDING IT»
const CardLine: React.FC<{y: number; t: number; at: number; size: number; parts: [string, string][]}> = ({y, t, at, size, parts}) => {
	if (t < at - 0.02) return null;
	const k = popOv(clamp01((t - at + 0.02) / 0.22));
	return (
		<div style={{position: 'absolute', left: 99, width: 740, top: y, transform: `translateY(-50%) scale(${lerp(1.35, 1, k)})`, opacity: clamp01(k * 3), textAlign: 'center', whiteSpace: 'nowrap', fontFamily: HEAD, fontSize: size, lineHeight: 1, letterSpacing: 2, WebkitTextStroke: `11px ${INK}`, paintOrder: 'stroke fill', filter: `drop-shadow(0 7px 0 ${INK})`}}>
			{parts.map(([s, col], i) => (
				<span key={i} style={{color: col}}>
					{s}
				</span>
			))}
		</div>
	);
};
const StoneWall: React.FC<{y0: number; y1: number; hole: [number, number, number, number]; glow: number; ghost?: number; t?: number}> = ({y0, y1, hole, glow, ghost = 0, t = 0}) => {
	const [hx, hy, hw, hh] = hole;
	const rows = Math.ceil((y1 - y0) / 110);
	const HL = hx - hw / 2;
	const HT = hy - hh / 2;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
			<defs>
				<clipPath id="twistWall">
					<path d={`M0,${y0} L1080,${y0} L1080,${y1} L0,${y1} Z M${hx - hw / 2},${hy - hh / 2} L${hx - hw / 2},${hy + hh / 2} L${hx + hw / 2},${hy + hh / 2} L${hx + hw / 2},${hy - hh / 2} Z`} clipRule="evenodd" />
				</clipPath>
			</defs>
			{/* the recessed socket the bale clicks into: dark stone back, inner shadow on top / left, a lit lip at the bottom, and a
			    dashed bale-shaped ghost of what belongs there */}
			<rect x={HL - 6} y={HT - 6} width={hw + 12} height={hh + 12} fill="#2B2A33" />
			<rect x={HL + 18} y={HT + 30} width={hw - 36} height={hh - 52} rx={10} fill="#34333D" />
			<rect x={HL - 6} y={HT - 6} width={hw + 12} height={34} fill="#17161D" />
			<rect x={HL - 6} y={HT - 6} width={22} height={hh + 12} fill="#1F1E26" />
			<rect x={HL - 6} y={HT + hh - 14} width={hw + 12} height={20} fill="#5A5864" />
			{ghost > 0 ? <rect x={HL + 16} y={HT + 34} width={hw - 32} height={hh - 52} rx={14} fill="none" stroke="#fff" strokeOpacity={0.5 * ghost * (0.7 + 0.3 * Math.sin(t * 9))} strokeWidth={6} strokeDasharray="22 14" /> : null}
			<g clipPath="url(#twistWall)">
				<rect x={0} y={y0} width={1080} height={y1 - y0} fill={HAY.stone} />
				{Array.from({length: rows}, (_, r) =>
					Array.from({length: 7}, (_, i) => {
						const x = i * 190 - (r % 2 ? 95 : 0) - 20;
						const y = y0 + r * 110;
						return (
							<g key={`${r}-${i}`}>
								<rect x={x + 6} y={y + 6} width={178} height={98} rx={14} fill={h1(r * 7 + i) > 0.5 ? HAY.stoneL : HAY.stone} stroke={INK} strokeWidth={5} />
								<rect x={x + 16} y={y + 14} width={60} height={14} rx={7} fill="#fff" opacity={0.25} />
							</g>
						);
					}),
				)}
			</g>
			<line x1={0} y1={y0} x2={1080} y2={y0} stroke={INK} strokeWidth={8} />
			{/* mortar lip + ink edge of the socket */}
			<rect x={HL - 5} y={HT - 5} width={hw + 10} height={hh + 10} rx={6} fill="none" stroke={HAY.stoneD} strokeWidth={12} />
			<rect x={HL} y={HT} width={hw} height={hh} rx={4} fill="none" stroke={INK} strokeWidth={6} />
			{glow > 0 ? <rect x={hx - hw / 2 - 8} y={hy - hh / 2 - 8} width={hw + 16} height={hh + 16} rx={20} fill="none" stroke={PAL.orange} strokeWidth={12} opacity={glow} style={{filter: `drop-shadow(0 0 ${24 * glow}px ${PAL.orange})`}} /> : null}
		</svg>
	);
};
export const Twist: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const hit = W(62) - 0.02;
	const a = t - hit;
	const HX = 468;
	const Y0 = 610;
	const HY = 770;
	const bs = 0.62;
	const bw = BW * bs;
	const bh = BH * bs;
	// the bale hovers over the bale-shaped gap in the castle wall; on «part» the gavel slams it in like a brick (it clicks, glows)
	const hover = Math.sin(t * 5) * 7 + Math.sin(t * 13) * 2;
	const top = Y0 - bh / 2 - 28;
	const dive = easeOut(clamp01(a / 0.07));
	const baleY = a < 0 ? top + hover : lerp(top, HY, dive) - (a > 0.07 && a < 0.3 ? 12 * Math.sin(((a - 0.07) / 0.23) * Math.PI) : 0);
	const sq = a > 0.05 && a < 0.25 ? 0.13 * Math.sin(((a - 0.05) / 0.2) * Math.PI) : 0;
	const raise = a < -0.12 ? 1 : a < 0 ? 1 - Math.pow(clamp01((a + 0.12) / 0.12), 2) : a < 0.3 ? 0 : easeInOut((a - 0.3) / 0.45);
	const faceY = baleY - bh / 2 - 4 - raise * 46 + (a < -0.12 ? Math.sin(t * 7) * 8 : 0);
	const rot = 8 * raise;
	const glow = a > 0.12 ? clamp01((a - 0.12) / 0.2) * (0.75 + 0.25 * Math.sin(t * 9)) : 0;
	const k = clamp01((t - t0) / (t1 - t0));
	const shadowK = a < 0 ? clamp01((t - t0) / 0.6) : 0;
	return (
		<Shk t={t} hits={[hit]} amp={8} tremor={1.2}>
			<Push k={easeInOut(k)} a={1} b={1.05} cy={760}>
				<Bg kind="navy" t={t} />
				<StoneWall y0={Y0} y1={1920} hole={[HX, HY, bw + 8, bh + 8]} glow={glow} ghost={a < 0 ? 1 : 0} t={t} />
				<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
					{shadowK > 0 ? <ellipse cx={HX} cy={HY} rx={bw * 0.5 * (0.6 + 0.4 * shadowK)} ry={bh * 0.45} fill="#000" opacity={0.25 * shadowK} /> : null}
					<BaleG cx={HX} cy={baleY} w={BW * bs} h={BH * bs} sq={sq} t={t} seed={777} lw={5} />
					<ImpactG x={HX} y={HY - bh / 2} a={a} r={150} />
				</svg>
				<StrawDust x={HX - bw * 0.5} y={HY - bh * 0.45} age={a - 0.02} size={1.5} n={6} seed={21} life={0.95} bits={8} dir={-0.7} />
				<StrawDust x={HX + bw * 0.5} y={HY - bh * 0.45} age={a - 0.04} size={1.4} n={6} seed={23} life={0.95} bits={8} dir={0.7} tone="stone" />
				<Gavel x={HX} y={faceY} s={0.68} rot={rot} />
				{/* the card: subtitles are hidden for «hiding it was part of building it» (project.hide_subs); 740 px before the push (×1.05)
					    and the shake scale (×1.03) → ≈ 800 px centred at x 467, inside 57–877 */}
				{t >= W(59) - 0.04 ? <div style={{position: 'absolute', left: 99, top: 872, width: 740, height: 228, borderRadius: 34, background: 'rgba(8,14,26,0.8)', boxShadow: `0 0 0 6px ${INK}`, opacity: clamp01((t - W(59) + 0.04) / 0.1)}} /> : null}
				<CardLine y={932} t={t} at={W(59) - 0.02} size={88} parts={[['HIDING IT', '#fff'], [t >= W(61) - 0.04 ? ' =' : '', '#fff']]} />
				<CardLine y={1040} t={t} at={W(64) - 0.03} size={88} parts={[['BUILDING', PAL.orange], [' IT', '#fff']]} />
			</Push>
			<Flash a={a} dur={0.1} max={0.6} />
		</Shk>
	);
};

// ======================================================================= 14 · NOT FINISHED (the ruling page; rewind; the bar fills only as the last bale lands)
// staged in sequence (one action per shot): 1) the ruling page alone, centred, highlighter swipe → 2) WHIP to the field: the
// fallen bales rewind up onto the wall, the «COMPLETED» bar stalls just short of full → 3) CUT close to the right tower: the
// bales come down in a flurry, one last bale teeters on the merlons (slow motion), then drops fast — the bar fills only as it lands
const SW1 = W(69) + 0.14;
const SW2 = W(71) - 0.08;
const TIP_T = W(73) + 0.05;
const DROP_T = TIP_T + 0.28;
const LAND_T = W(74) + 0.31;
const PERCH: [number, number] = [1310, -2850 - BH / 2];
const LANDING: [number, number] = [1520, -190];
/** a horizontal whip between two layers around time `at` (0.14 s): A leaves to the left, B enters from the right, motion-blurred */
const whipK = (t: number, at: number) => easeInOut(clamp01((t - at + 0.07) / 0.14));
const WhipLayer: React.FC<{k: number; side: 'out' | 'in'; children: React.ReactNode}> = ({k, side, children}) => {
	const dx = side === 'out' ? -k * 1080 : (1 - k) * 1080;
	const blur = 4 * k * (1 - k) * 18;
	return <AbsoluteFill style={{transform: `translateX(${dx.toFixed(1)}px)`, filter: blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : undefined}}>{children}</AbsoluteFill>;
};
export const Unfinished: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const kw = whipK(t, SW1);
	// 1 · the page
	const pageK = easeInOut(clamp01((t - t0) / (SW1 - t0)));
	const hl = clamp01((t - W(67) + 0.03) / 0.45);
	// 2 · the rewind (wide)
	const cW = camL({S: 0.165, U: 0, V: -1500, X: 470, Y: 820}, {S: 0.17, U: 0, V: -1520, X: 470, Y: 820}, easeInOut((t - SW1) / (SW2 - SW1)));
	const rewind = easeInOut(clamp01((t - SW1 - 0.02) / 0.42));
	// 3 · the last bale (close on the right tower, the camera follows the drop down to the heap)
	const cT = camPath(t, [
		[SW2, {S: 0.42, U: 1290, V: -2960, X: 560, Y: 700}],
		[DROP_T - 0.02, {S: 0.45, U: 1310, V: -2980, X: 560, Y: 700}],
		[LAND_T, {S: 0.34, U: 1350, V: -900, X: 560, Y: 760}, easeIn2],
		[t1, {S: 0.35, U: 1350, V: -900, X: 560, Y: 760}],
	]);
	const flurry = Math.max(0, (t - SW2) / 0.5);
	const teeter = t < TIP_T ? Math.sin((t - SW2) * 15) * 3.5 * clamp01((t - SW2) / 0.3) : t < DROP_T ? 30 * easeInOut((t - TIP_T) / (DROP_T - TIP_T)) : 30;
	const fall = clamp01((t - DROP_T) / (LAND_T - DROP_T));
	const fe = fall * fall;
	const lastX = lerp(PERCH[0], LANDING[0], fall);
	const lastY = lerp(PERCH[1], LANDING[1], fe) - (fall > 0 ? Math.sin(fall * Math.PI) * 120 : 0);
	const lastR = fall > 0 ? lerp(30, 180, fe) : teeter;
	const la = t - LAND_T;
	const sq = la > 0 && la < 0.18 ? 0.14 * Math.sin((la / 0.18) * Math.PI) : 0;
	// pivot of the teeter = the bale's bottom-right corner on the merlons
	const lastBale = (lwT: number) =>
		fall > 0 ? (
			<BaleG cx={lastX} cy={lastY} rot={lastR} sq={sq} seed={612} lw={lwT} t={t} />
		) : (
			<g transform={`rotate(${teeter.toFixed(2)} ${PERCH[0] + BW / 2} ${PERCH[1] + BH / 2})`}>
				<BaleG cx={PERCH[0]} cy={PERCH[1]} seed={612} lw={lwT} t={t} />
			</g>
		);
	// the bar (over shots 2 and 3)
	const barT = W(70) - 0.12;
	const barIn = popOv(clamp01((t - barT) / 0.28));
	const value = t < LAND_T ? lerp(0.7, 0.955, easeOut(clamp01((t - barT) / 0.35))) : 1;
	const strain = t > barT + 0.3 && t < LAND_T ? 1 : 0;
	const done = clamp01((t - LAND_T) / 0.2);
	const lwW = lwFor(cW.S);
	const lwT = lwFor(cT.S);
	return (
		<Shk t={t} hits={[LAND_T]} amp={6} tremor={1.2}>
			{t < SW1 + 0.07 ? (
				<WhipLayer k={kw} side="out">
					<Push k={pageK} a={1} b={1.22} cx={470} cy={730}>
						<Bg kind="navy" t={t} />
						<CourtPage x={470} y={720} w={560} rot={lerp(-4, 0, easeOut(clamp01((t - t0) / (W(67) - 0.04 - t0))))} hl={hl} />
					</Push>
				</WhipLayer>
			) : null}
			{t >= SW1 - 0.07 && t < SW2 ? (
				<WhipLayer k={kw} side="in">
					<Field c={cW} t={t} roadY={1170} horizon={660} />
					<World c={cW}>
						<ellipse cx={0} cy={30} rx={2300} ry={160} fill="rgba(40,30,10,0.25)" />
						<BaleWallG t={t} topple={1} rewind={Math.max(0.0001, rewind)} toppleDur={1.0} lw={lwW} behind={<CastleG t={t} lw={lwW} />} />
					</World>
				</WhipLayer>
			) : null}
			{t >= SW2 ? (
				<AbsoluteFill>
					<Field c={cT} t={t} roadY={1170} horizon={660} />
					<World c={cT}>
						<ellipse cx={0} cy={30} rx={2300} ry={160} fill="rgba(40,30,10,0.25)" />
						<BaleWallG
							t={t}
							topple={flurry}
							toppleDur={0.5}
							lw={lwT}
							behind={
								<>
									<CastleG t={t} lw={lwT} />
									{t < DROP_T ? lastBale(lwT) : null}
								</>
							}
						/>
						{t >= DROP_T ? lastBale(lwT) : null}
						<StrawDustG x={LANDING[0]} y={LANDING[1] + BH * 0.4} age={la} size={2.6} n={7} seed={44} life={0.9} lw={lwT} bits={10} />
					</World>
				</AbsoluteFill>
			) : null}
			{barIn > 0 && t >= SW1 ? <ProgressBar x={468} y={395} w={720} s={0.86 * barIn} t={t} value={value} strain={strain} done={done} /> : null}
		</Shk>
	);
};

// ======================================================================= 15 · THE CLOCK HADN'T EVEN STARTED
/** the big dial under the timer (px): a 560 px gauge; the needle sits at the far end (four years done), trembles, then snaps back
 *  to the start, marked by a green start flag (no START label: the subtitle carries «STARTED», never the same word twice). No digits. */
const BigDial: React.FC<{x: number; y: number; R: number; t: number; f: number; snap: number}> = ({x, y, R, t, f, snap}) => {
	const th = Math.PI * (1 + f);
	const arc = (r: number, a0: number, a1: number) => `M${x + Math.cos(a0) * r},${y + Math.sin(a0) * r} A${r},${r} 0 0 1 ${x + Math.cos(a1) * r},${y + Math.sin(a1) * r}`;
	const shakeX = snap > 0 && snap < 0.5 ? Math.sin(snap * 70) * 14 * (1 - snap / 0.5) : 0;
	const tip = [x + Math.cos(th) * R * 0.86, y + Math.sin(th) * R * 0.86];
	const nb = [Math.cos(th + Math.PI / 2) * 22, Math.sin(th + Math.PI / 2) * 22];
	const ring = snap > 0 && snap < 0.45 ? snap / 0.45 : -1;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translateX(${shakeX.toFixed(1)}px)`}}>
			<path d={`M${x - R - 26},${y + 34} A${R + 26},${R + 26} 0 0 1 ${x + R + 26},${y + 34} Z`} fill={INK} opacity={0.5} transform="translate(0 16)" />
			<path d={`M${x - R - 26},${y + 34} A${R + 26},${R + 26} 0 0 1 ${x + R + 26},${y + 34} Z`} fill="#0B1B2E" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
			<path d={arc(R * 0.78, Math.PI, Math.PI * 2)} stroke="#22344B" strokeWidth={44} fill="none" />
			{f > 0.004 ? <path d={arc(R * 0.78, Math.PI, th)} stroke={PAL.orange} strokeWidth={44} fill="none" opacity={0.9} /> : null}
			{Array.from({length: 13}, (_, i) => {
				const a = Math.PI * (1 + i / 12);
				return <line key={i} x1={x + Math.cos(a) * R * 0.94} y1={y + Math.sin(a) * R * 0.94} x2={x + Math.cos(a) * R * 1.04} y2={y + Math.sin(a) * R * 1.04} stroke={i / 12 <= f + 1e-3 ? PAL.orange : '#9FB0C4'} strokeWidth={i % 3 ? 7 : 12} strokeLinecap="round" />;
			})}
			{ring >= 0 ? <circle cx={x - R * 0.78} cy={y} r={30 + ring * 90} fill="none" stroke="#fff" strokeWidth={10 * (1 - ring)} /> : null}
			<polygon points={`${x + nb[0]},${y + nb[1]} ${tip[0]},${tip[1]} ${x - nb[0]},${y - nb[1]}`} fill="#fff" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
			<circle cx={x} cy={y} r={42} fill={PAL.orange} stroke={INK} strokeWidth={9} />
			<circle cx={x - 12} cy={y - 12} r={10} fill="#fff" opacity={0.5} />
			{/* green start flag under the start end of the scale */}
			<g transform={`translate(${x - R * 0.86} ${y + 168})`}>
				<line x1={0} y1={0} x2={0} y2={-120} stroke={INK} strokeWidth={16} strokeLinecap="round" />
				<line x1={0} y1={0} x2={0} y2={-120} stroke="#d8d2c4" strokeWidth={7} strokeLinecap="round" />
				<path d={`M4,-118 Q34,${-128 + Math.sin(t * 7) * 6} 62,-116 Q86,${-106 + Math.sin(t * 7 + 1) * 6} 104,-112 L104,-62 Q86,${-56 + Math.sin(t * 7 + 1) * 6} 62,-66 Q34,${-78 + Math.sin(t * 7) * 6} 4,-68 Z`} fill="#3fae5a" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
				<path d={`M14,-104 Q34,${-112 + Math.sin(t * 7) * 6} 52,-104`} stroke="#fff" strokeWidth={6} opacity={0.45} fill="none" strokeLinecap="round" />
			</g>
		</svg>
	);
};
export const Clock: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const snapT = W(79) - 0.02;
	const st = clamp01((t - snapT) / 0.5);
	const wob = bump(t, W(78) + 0.1, 0.35);
	const k = easeInOut(clamp01((t - t0) / (t1 - t0)));
	// the needle: parked at the end, trembling harder and harder on «even …», then snaps back past START and settles on it
	const tremble = t < snapT ? Math.sin(t * 47) * 0.012 * (0.4 + 1.6 * clamp01((t - W(78)) / 0.45)) : 0;
	const back = st > 0 ? Math.max(-0.08, 1 - easeOutBack(st)) : 1;
	const f = clampR(back + tremble, -0.08, 1);
	return (
		<Shk t={t} hits={[snapT + 0.06]} amp={7} tremor={1.2}>
			<Push k={k} a={1.03} b={1.1} cx={540} cy={700}>
				<Bg kind="navy" t={t} />
				{/* the timer (its own small dial cut away: the big dial below replaces it) */}
				<div style={{position: 'absolute', inset: 0, clipPath: "path(evenodd, 'M0 0 H1080 V1920 H0 Z M336 600 H714 V796 H336 Z')"}}>
					<Timer4Y x={540 + wob * Math.sin(t * 60) * 10} y={470} s={0.66} t={t} fill={1} done={1} start={st} />
				</div>
				<BigDial x={540} y={930} R={280} t={t} f={f} snap={t - snapT} />
				<Farmer x={200} y={1058} s={0.42} t={t} pose="stand" hat="party" deflate={clamp01((t - W(77)) / 0.8)} mood={t > W(79) ? 'sad' : 'shock'} look={0.6} />
			</Push>
		</Shk>
	);
};

// ======================================================================= 16–19 · BATS / NEWTS / WILDLIFE LAW / REJECTED (the house front)
// Layout (wall units, house base centre = 0): rain-butt left of the door, the bat hangs from the ground-floor beam right of the
// door, the excavator (a little smaller than the house scale) parks at the right with its cab inside x ≤ 887. The shot opens
// tight on the farmer (arms crossed on the battlements), widens as the excavator rolls up, dives to the bat, pulls back for
// the claw, which stops ≥ 80 px short of the bat and the sign; on «Rejected» the bat flaps off up-left and the newt slides out.
const BAT: [number, number] = [300, -1144];
const BAT_K = 1.6;
const BUTT_U = -420;
const EXC_K = 1.8;
const EXC_STOP = 1600;
/** the excavator rolls in during the widening and is (almost) parked by the wide shot, its rear inside x ≤ 860 */
const EXC_U = (t: number) => lerp(2700, EXC_STOP, easeOut(clamp01((t - W(80) - 0.12) / 0.75)));
const STOP_T = W(99) - 0.02;
const STAMP_T = W(100) + 0.02;
const FLY_T = W(100) + 0.46;
const SLIDE_T = W(100) + 0.4;
const HOUSE_TIGHT: Cam = {S: 0.62, U: FARMER_TOWER[0] + 40, V: FARMER_TOWER[1] - 470, X: 480, Y: 700};
const HOUSE_WIDE: Cam = {S: 0.21, U: 290, V: -1650, X: 450, Y: 720};
const HOUSE_CLOSE: Cam = {S: 0.46, U: -60, V: -700, X: 470, Y: 700};
/** the knock framing: rain-butt (x ≥ 60) … excavator rear (x ≤ 875) */
const HOUSE_MID: Cam = {S: 0.28, U: 715, V: -700, X: 467, Y: 797};
/** «Rejected.»: a hard cut-in on the bat's sign, ≈ 655 px wide around (467, 870) (the bat's face stays below y 288, the sign
 *  above 1100), for the stamp; pulls back as the bat flaps off */
const SIGN_C: [number, number] = [BAT[0], BAT[1] + 525 * BAT_K];
const HOUSE_REJ: Cam = {S: 1.14, U: SIGN_C[0], V: SIGN_C[1], X: 467, Y: 870};
/** the claw target (wall units) creeps from beside the cab toward the bat's sign at the sign's height and stops 290 units (≈ 85 px at
 *  the knock framing) right of the sign's edge; the bat's wing tips end above the sign's corners, so the bucket never reaches it */
const knockCreep = (t: number) => easeInOut(clamp01((t - W(90) - 0.2) / (STOP_T - W(90) - 0.2)));
/** pure IK pose at time t. Camera-free: the excavator and its target go through the same camera, so the angles depend on wall
 *  units only (excavatorAim gets them with the excavator at its wall position, scale EXC_K) */
const knockAim = (t: number) => {
	const creep = knockCreep(t);
	const jolt = t > STOP_T ? Math.sin((t - STOP_T) * 32) * Math.exp(-(t - STOP_T) * 7) * 40 : 0;
	const tu = lerp(BAT[0] + 1150, BAT[0] + 180 * BAT_K + 290, creep) + jolt;
	const tv = lerp(-420, SIGN_C[1] + 10, creep);
	return excavatorAim({x: EXC_U(t), y: 30, s: EXC_K, flip: true}, {x: tu, y: tv}, lerp(25, 0, creep));
};
/** the creeping target passes over the boom pivot (≈ 29.05 s): the IK's elbow branch flips and the boom would snap ≈ 180° in one
 *  frame (raised, folded back over the cab → low, reaching). KNOCK_FLIP = the first frame on the new branch (−1: no flip) */
const KNOCK_FLIP = (() => {
	for (let f = Math.ceil((W(90) - 0.05) * FPS) + 1; f <= Math.floor(STOP_T * FPS); f++) {
		if (Math.abs(knockAim(f / FPS).boom - knockAim((f - 1) / FPS).boom) > 90) return f;
	}
	return -1;
})();
/** the swing over the flip: 0.32 s, ending 2 frames after the flip frame (the pose the snap landed on, past the degenerate pivot
 *  frame). Each angle runs a cubic Hermite from the live pose AND speed at the start (the arm is still folding in) to the landed
 *  pose at rest, so there is no hitch at either end: the boom swings up and over (≈ −176° → +21°, through −90° = straight up),
 *  the stick stays folded, the bucket keeps its absolute angle */
const SWING_D = 0.32;
const angDelta = (a: number, b: number) => ((((b - a + 180) % 360) + 360) % 360) - 180;
const hermite = (p0: number, v0: number, p1: number, s: number, d: number) => {
	const s2 = s * s, s3 = s2 * s;
	return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * d * v0 + (3 * s2 - 2 * s3) * p1;
};
const knockArm = (t: number) => {
	if (KNOCK_FLIP < 0) return knockAim(t);
	const tEnd = (KNOCK_FLIP + 2) / FPS;
	const t0 = tEnd - SWING_D;
	if (t <= t0 || t >= tEnd) return knockAim(t);
	const a = knockAim(t0);
	const a1 = knockAim(t0 - 1 / FPS);
	const b = knockAim(tEnd);
	const absOf = (q: {boom: number; stick: number; claw: number}) => q.boom + q.stick + q.claw;
	const sk = (t - t0) / SWING_D;
	// boom: plain difference (over the top, not back through the cab); stick + bucket: shortest way
	const boom = hermite(a.boom, (a.boom - a1.boom) * FPS, b.boom, sk, SWING_D);
	const stick = hermite(a.stick, angDelta(a1.stick, a.stick) * FPS, a.stick + angDelta(a.stick, b.stick), sk, SWING_D);
	const abs = hermite(absOf(a), angDelta(absOf(a1), absOf(a)) * FPS, absOf(a) + angDelta(absOf(a), absOf(b)), sk, SWING_D);
	return {boom, stick, claw: abs - boom - stick};
};
/** the castle flag (left tower) would sit clipped in the top-left corner of the knock framing (HOUSE_MID); it leaves the frame
 *  through the top on the push-in to HOUSE_CLOSE (pole and flag ≥ 170 px above the frame there) and is lowered from then on */
const FLAG_OFF_T = W(84);
const houseCam = (t: number): Cam =>
	camPath(t, [
		[W(80) - 0.06, HOUSE_TIGHT],
		[W(81) + 0.12, {...HOUSE_TIGHT, S: 0.64, U: FARMER_TOWER[0] + 60}],
		[W(82) + 0.16, HOUSE_WIDE, easeInOut],
		[W(83) - 0.22, {...HOUSE_WIDE, S: 0.215}],
		[W(83) + 0.05, HOUSE_CLOSE],
		[W(90) - 0.06, {...HOUSE_CLOSE, S: 0.49, U: -40}],
		[W(90) + 0.55, HOUSE_MID],
		[W(100) - 0.061, {...HOUSE_MID, S: 0.29}],
		[W(100) - 0.06, HOUSE_REJ, () => 1],
		[STAMP_T + 0.42, {...HOUSE_REJ, S: 1.2}],
		[STAMP_T + 0.8, {...HOUSE_MID, S: 0.285}, easeInOut],
		[W(101), {...HOUSE_MID, S: 0.29}],
	]);
const House: React.FC<{t: number}> = ({t}) => {
	const c = houseCam(t);
	const lw = lwFor(c.S);
	const [bx, by] = P(c, BAT[0], BAT[1]);
	const bs = BAT_K * c.S;
	const [rx, ry] = P(c, BUTT_U, 0);
	const [mx, my] = P(c, 0, 70);
	const [fx, fy] = P(c, 0, -1110);
	const [sx, sy] = P(c, -150, 30);
	const exU = EXC_U(t);
	const [ex, ey] = P(c, exU, 30);
	const es = EXC_K * c.S;
	// the claw creeps toward the bat's sign (knockAim) and swings smoothly over the IK flip (knockArm)
	const signY = by + 525 * bs;
	const aim = knockArm(t);
	// travel pose: boom forward-low, stick down, bucket curled just above the ground in front of the tracks
	const fold = {boom: -35, stick: 110, claw: 60};
	const un = easeInOut(clamp01((t - W(90) + 0.05) / 0.45));
	const arm = {boom: lerp(fold.boom, aim.boom, un), stick: lerp(fold.stick, aim.stick, un), claw: lerp(fold.claw, aim.claw, un)};
	const fly = clamp01((t - FLY_T) / 0.6);
	const slide = t >= SLIDE_T;
	// the stamp slams, holds 0.08 s and lifts fast, so the big REJECTED print reads for ~0.3 s before the pull-back
	const stampLift = t < STAMP_T - 0.16 ? 2400 : t < STAMP_T ? lerp(1400, 0, Math.pow(clamp01((t - STAMP_T + 0.16) / 0.16), 2)) : t < STAMP_T + 0.08 ? 0 : lerp(0, 2600, Math.pow(clamp01((t - STAMP_T - 0.08) / 0.22), 2));
	const suitDrop = clamp01((t - W(88) + 0.05) / 0.25);
	return (
		<AbsoluteFill>
			<Field c={c} t={t} road={false} roadY={1300} horizon={600} />
			<World c={c}>
				<Lawn lw={lw} path />
				<g transform={`translate(${FARMER_TOWER[0]} ${FARMER_TOWER[1]})`}>
					<FarmerG t={t} pose="arms" mood="defiant" lw={lw} />
				</g>
				<CastleG t={t} lw={lw} flag={t < FLAG_OFF_T ? 1 : 0} />
			</World>
			<RainButt x={rx} y={ry} s={2.0 * c.S} t={t} pop={t - W(85) - 0.04} carry={t < W(88) - 0.05} newt={!slide} pipe={460} />
			{t >= W(86) - 0.05 ? <DoormatHome x={mx} y={my} s={1.0 * c.S} slide={clamp01((t - W(86) + 0.03) / 0.35)} /> : null}
			{t >= W(89) - 0.05 ? <PictureFrame x={fx} y={fy} s={1.3 * c.S} swing={t - W(89) + 0.05} /> : null}
			{t >= W(88) - 0.05 ? <Suitcase x={sx} y={sy - (1 - suitDrop) * 120 * c.S * 2} s={1.2 * c.S} rot={(1 - suitDrop) * -14} /> : null}
			<Excavator x={ex} y={ey} s={es} t={t} flip {...arm} drive={t < W(81) + 0.6 ? 90 : t < STOP_T && t > W(90) ? 30 : 0} sparks={t - STOP_T} brake={t - STOP_T} />
			{slide ? <Newt x={rx - 30 * c.S - easeIn2(clamp01((t - SLIDE_T) / 0.6)) * 900} y={ry + 14} s={1.2 * c.S} t={t} flip slide carry /> : null}
			{/* the bat in front of the arm; on «Rejected» it flaps off up-left, away from the claw */}
			<BatLawyer x={bx} y={by} s={bs} t={t} drop={t - W(83) + 0.02} sign={t - W(97) - 0.04} rejected={t - STAMP_T} fly={fly} flyDir={-1} signMax={(70 - BAT[1]) / BAT_K - 620} />
			{stampLift < 2300 ? <GiantStamp x={bx} y={signY + 70 * bs} s={0.9 * bs} t={t} lift={stampLift} inked shadow={false} /> : null}
		</AbsoluteFill>
	);
};
export const Bats: React.FC<SceneProps> = () => {
	const t = useT();
	return (
		<Shk t={t} hits={[W(83) + 0.3]} amp={3} tremor={1.2}>
			<House t={t} />
		</Shk>
	);
};
export const MovedIn: React.FC<SceneProps> = () => {
	const t = useT();
	return (
		<Shk t={t} hits={[]} tremor={1.2}>
			<House t={t} />
		</Shk>
	);
};
export const Knock: React.FC<SceneProps> = () => {
	const t = useT();
	return (
		<Shk t={t} hits={[STOP_T]} amp={7} tremor={1.2}>
			<House t={t} />
		</Shk>
	);
};
export const Rejected: React.FC<SceneProps> = () => {
	const t = useT();
	return (
		<Shk t={t} hits={[STAMP_T]} amp={8} tremor={1.2}>
			<House t={t} />
			<Flash a={t - STAMP_T} dur={0.08} max={0.45} />
		</Shk>
	);
};

// ======================================================================= 20 · THE JUDGE: TEAR IT DOWN, OR FACE JAIL
/** TwoDoors (a full 1080 frame) scaled by k around (540, 1090) and shifted dx: doors at x 243 / 697, frames 79–861 */
const JUDGE = {k: 0.84, dx: -70, cx: 470};
/** soft 60 px fade at every edge of the scaled door pair, so its own backdrop melts into the margins */
const JUDGE_MASK: React.CSSProperties = {
	WebkitMaskImage: 'linear-gradient(90deg, transparent 0px, #000 60px, #000 1020px, transparent 1080px), linear-gradient(180deg, transparent 0px, #000 70px, #000 1850px, transparent 1920px)',
	WebkitMaskComposite: 'source-in',
	maskImage: 'linear-gradient(90deg, transparent 0px, #000 60px, #000 1020px, transparent 1080px), linear-gradient(180deg, transparent 0px, #000 70px, #000 1850px, transparent 1920px)',
	maskComposite: 'intersect',
	WebkitMaskSize: '1080px 1920px',
	maskSize: '1080px 1920px',
};
export const Judge: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const oL = easeOut(clamp01((t - W(103) + 0.04) / 0.35));
	const oR = easeOut(clamp01((t - W(107) + 0.04) / 0.35));
	const k = easeInOut(clamp01((t - t0) / (t1 - t0)));
	return (
		<Shk t={t} hits={[W(108)]} amp={4} tremor={1.2}>
			<Push k={k} a={1} b={1.06} cx={JUDGE.cx} cy={820}>
				{/* the door pair is scaled into x 79–861 (clear of the right UI rail); the backdrop fills the margins with the same
				    gradients, and the scaled pair fades into it at its edges (no seams) */}
				<div style={{position: 'absolute', left: 0, top: 0, width: JUDGE.cx, height: 1920, background: 'radial-gradient(ellipse at 50% 40%, #1b3756 0%, #13294A 55%, #0F2238 100%)'}} />
				<div style={{position: 'absolute', left: JUDGE.cx, top: 0, width: 1080 - JUDGE.cx, height: 1920, background: 'radial-gradient(ellipse at 50% 40%, #182233 0%, #111827 55%, #0a0f18 100%)'}} />
				<div style={{position: 'absolute', left: 0, top: 1090, width: 1080, height: 830, background: '#0b1626'}} />
				<AbsoluteFill style={{transform: `translateX(${JUDGE.dx}px) scale(${JUDGE.k})`, transformOrigin: '540px 1090px', ...JUDGE_MASK}}>
					<TwoDoors t={t} open={[oL, oR]} swing={14} clock={lerp(0.55, 0.985, clamp01((t - t0) / (W(108) + 0.2 - t0)))} pick={0} />
				</AbsoluteFill>
				{/* the farmer stands on the floor line just right of the pendulum's arc (≥ 40 px clear of the gavel head) */}
				<Farmer x={752} y={1080} s={0.44} t={t} pose="stand" look={t < W(106) ? -0.9 : 0.9} mood={t > W(107) ? 'shock' : 'sad'} />
			</Push>
		</Shk>
	);
};

// ======================================================================= 21–22 · HE TEARS IT DOWN / BEATEN BY THE BALE (→ loop)
const DEMO_T = W(110) + 0.1;
const DEMO_D = 2.2;
// «So he tears down his own castle»: the excavator stands in front of the left (flag) tower inside the frame (its bucket stays at
// x ≥ 60), its claw bites the tower top; the farmer stands aside right of the house, cap in hand, at the house's scale on its
// ground line (s 0.22, a step in front), the collapse dust rolls up behind him
const PLOT_CAM: Cam = {S: 0.15, U: 0, V: -1700, X: 545, Y: 785};
const BITE: [number, number] = [-1450, -2640];
const EX_DEMO = -1620;
const EX_DEMO_K = 3.4;
const TEARS_FARMER = {x: 826, y: 1062, s: 0.22};
const Demolition: React.FC<{t: number; c: Cam; farmerPx?: boolean; exc?: boolean}> = ({t, c, farmerPx = true, exc = true}) => {
	const lw = lwFor(c.S);
	const dm = clamp01((t - DEMO_T) / DEMO_D);
	const [ex, ey] = P(c, EX_DEMO, 20);
	const es = EX_DEMO_K * c.S;
	const chomp = dm < 0.3 ? Math.abs(Math.sin((dm / 0.3) * Math.PI * 2)) : 0;
	const retreat = easeInOut(clamp01((dm - 0.3) / 0.25));
	const [bx, by] = P(c, BITE[0] + 60 * chomp - retreat * 300, BITE[1] + 40 * chomp + retreat * 1200);
	const arm = excavatorAim({x: ex, y: ey, s: es}, {x: bx, y: by}, lerp(55, 85, chomp));
	return (
		<AbsoluteFill>
			<Field c={c} t={t} road={false} roadY={1300} horizon={600} />
			<World c={c}>
				<Lawn lw={lw} />
				<CastleG t={t} demolish={dm} demolishDur={DEMO_D} biteSide={-1} lw={lw} />
			</World>
			{exc ? <Excavator x={ex} y={ey} s={es} t={t} {...arm} drive={0} sparks={dm > 0.02 && dm < 0.3 ? ((dm * DEMO_D) % 0.33) : undefined} /> : null}
			{farmerPx ? <StrawDust x={600} y={1040} age={t - DEMO_T - 1.0} size={1.0} n={5} tone="stone" seed={41} life={1.2} dir={-0.6} /> : null}
			{farmerPx ? <Farmer x={TEARS_FARMER.x} y={TEARS_FARMER.y} s={TEARS_FARMER.s} t={t} pose="cap" k={easeOut((t - W(109)) / 0.6)} /> : null}
		</AbsoluteFill>
	);
};
export const Tears: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<Shk t={t} hits={[DEMO_T + 0.25, DEMO_T + 1.0]} amp={6} tremor={1.2}>
			<Demolition t={t} c={camL(PLOT_CAM, {...PLOT_CAM, S: 0.156}, easeInOut((t - t0) / (t1 - t0)))} />
		</Shk>
	);
};

const LONE_U = 250;
/** frame 0's bale relative to the farmer's boots, its tilt / scale, and his push pose: the end of Beaten matches it exactly */
const F0 = (() => {
	const st = hookState(0);
	return {du: GAP_X + RAM_FROM[0] * (1 - st.e) - st.feetU, dv: GAP_Y + RAM_FROM[1] * (1 - st.e) - st.feetV, rot: -5 * (1 - st.e), sc: lerp(1.12, 1, st.e), k: st.kBase};
})();
const SIT_T = W(118) + 0.05;
const LIFT_T = W(121) + 0.04;
export const Beaten: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const hf = hookFarmer(W(123) + 0.04 - DURATION);
	const END: Cam = {S: hf.s, U: LONE_U, V: 0, X: hf.x, Y: hf.y};
	const c = camPath(t, [
		[t0, {S: 0.29, U: LONE_U, V: -700, X: 520, Y: 860}],
		[SIT_T + 0.1, {S: 0.31, U: LONE_U, V: -700, X: 500, Y: 860}],
		[LIFT_T - 0.05, {S: 0.33, U: LONE_U, V: -700, X: 470, Y: 860}],
		[W(123) + 0.04, END],
	]);
	const lw = lwFor(c.S);
	// the lone bale rolls in from the left and stops at his boots; he plops down on it, then lifts it and turns to the ladder
	const roll = easeOut(clamp01((t - t0 - 0.05) / 0.62));
	const baleU = lerp(-2400, LONE_U, roll);
	const hop = Math.abs(Math.sin(roll * Math.PI * 3)) * (1 - roll) * 220;
	const lift = easeInOut(clamp01((t - LIFT_T) / 0.3));
	const sitting = t >= SIT_T && t < LIFT_T;
	const pose: FarmerPose = t < SIT_T ? 'cap' : sitting ? 'sit' : 'push';
	const baleCx = lerp(baleU, LONE_U + F0.du, lift);
	const baleCy = lerp(-BH / 2 - hop, F0.dv, lift);
	const baleRot = (1 - roll) * -540 * (1 - lift);
	return (
		<Shk t={t} hits={[SIT_T]} amp={3} tremor={1.2}>
			<Demolition t={t} c={c} farmerPx={false} exc={false} />
			<World c={c}>
				<StrawDustG x={LONE_U - 540} y={-20} age={t - SIT_T} size={0.9} n={3} seed={33} life={0.8} lw={lw} bits={3} dir={-0.8} />
				<StrawDustG x={LONE_U + 540} y={-20} age={t - SIT_T - 0.02} size={0.9} n={3} seed={37} life={0.8} lw={lw} bits={3} dir={0.8} />
				{t < LIFT_T ? <BaleG cx={baleCx} cy={baleCy} rot={baleRot} sc={lerp(1, 1.12, lift)} seed={777} t={t} lw={lw} /> : null}
				<g transform={`translate(${LONE_U} 0)`}>
					<FarmerG t={t} pose={pose} k={pose === 'push' ? lerp(0.12, F0.k, lift) : 1} mood={pose === 'push' ? undefined : 'sad'} lw={lw} />
				</g>
				{t >= LIFT_T ? <BaleG cx={baleCx} cy={baleCy} rot={F0.rot * lift} sc={lerp(1, F0.sc, lift)} seed={777} t={t} lw={lw} /> : null}
				<StrawDustG x={baleU + 300} y={-20} age={t - t0 - 0.67} size={1.3} n={5} seed={35} life={0.8} lw={lw} bits={6} />
			</World>
		</Shk>
	);
};

export const SCENES: Record<string, React.FC<SceneProps>> = {
	Hook, Never, Bet, Look, Gone, Battlements, Cannons, Family, NeverSees, Down, Won, Court, Twist, Unfinished, Clock, Bats, MovedIn, Knock, Rejected, Judge, Tears, Beaten, Loop,
};
