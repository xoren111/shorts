import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {SceneProps} from './engine/transitions';
import {DURATION, W} from './lib/time';
import {CARTON0, CASE_END, DESK_PHOTO, EYE_Y, LONE_CARTON} from './data/beats';
import {HookArt} from './scenes_1';
import {INK, clamp01, easeInOut, easeOut, h1, lerp, useT} from './ui/gfx';
import {shake} from './ui/vox';
import {SKIN} from './ui/draw';
import {HEAD} from './fonts';
import {PAL} from './theme';
import {Cutout, CutoutG, DadBack, DollCase, FACE, Girl, GirlBust, Hand, KidPhotoG, MILK, MilkCarton, Neighbor, PhotoPrint, Police as Cop, cartonEyes, girlFacePt, handGrip, handTip, lwFor, rotP} from './ui/milk_a';
import type {HandGesture, HandKind, P2} from './ui/milk_a';
import {CartonG, CartonWall, DairyFridge, DairyLine, Doorframe, HouseInterior, KITCHEN, LINE, PoliceCar, TableTop, TearCalendar, VaporG, WALL, dairyLineCartons, squiggle} from './ui/milk_b';

// milk-carton — PART 3 scenes (words 84–125 + the loop, 25.04 – 37.97 s): the neighbour, the police, the dad, the catharsis, the
// punchline and the loop. Source of truth: ../SCRIPT.md «Покадровый план» rows 17–23, ../FACTS.md «Постановка в кадре»; timings
// src/data/beats.ts + src/data/events.ts. Reference: A1 hay-castle/short/src (camera kick / handheld shake, the big card, the locked
// loop). Same rules as scenes_1.tsx: drawn in code (kits src/ui/milk_a.tsx + milk_b.tsx, flat + INK + PAL), hands only, no adult
// face — the neighbour over the shoulder (back of her head), the dad from behind (checked shirt, empty hand), the stepdad = the
// watch hand —, generic girl with the red clip, generic carton with squiggle name/date, key action x 48–887 / y 288–1100, nothing
// static > 2 s. No police badges / text / plates, no logos on the desk or the dairy line, no real missing children on the wall.
// Layout contract (data/beats.ts): CASE_END = her cut-out lying in the doll case when RealName zooms through (the case opens
// there); DESK_PHOTO = the dad's fingertips at her toddler photo's lower-right corner when DadPut opens (circle; not the face); LONE_CARTON = the face slot of the one
// coloured carton at the END of NoneHome and of the same carton in the store fridge at the START of Loop (fade = locked match
// dissolve). Billions → NoneHome is seamless: both draw ONE wall with ONE camera (wallCam(t)), so the hard cut never shows. Loop ends
// on the frame-0 picture (dairy fridge ECU, the watch hand holding her carton up beside her cheek); Short.tsx dissolves FirstFrame
// over the last loop_s = 0.35 s (from 37.62 s).
//
// | beat       | t0–t1 s       | words   | what happens (event → time)                                                                     |
// |------------|---------------|---------|-------------------------------------------------------------------------------------------------|
// | RealName   | 25.04–26.75   | 84–89   | 25.04 zoom-through: the doll case opens, the neighbour's hand (lilac cardigan, her curls out of  |
// |            |               |         | focus in the corner = over the shoulder) lifts the cut-out · 25.52 tilt up to her kitchen, her   |
// |            |               |         | fingertip slides along the squiggle name line, stops on «REAL» 26.04 (pulse) · 26.30 the hand    |
// |            |               |         | pins it to her fridge, magnet pops · 26.45 her other hand snatches the wall phone off its hook   |
// | Police     | 26.75–29.27   | 90–96   | 26.75 punch out to her kitchen: red / blue light washes over the fridge + the cut-out, the phone  |
// |            |               |         | receiver dangles · car silhouettes pull up through the window on «show» 27.10 and «up.» 27.32 ·  |
// |            |               |         | 27.62 push into the window · «LOT» 27.91 cars stack row on row past the frame edge, officer      |
// |            |               |         | silhouettes pour onto the lawn. The wash is a smooth red ⇄ blue sway (no hard full-frame flashes) |
// | HandedBack | 29.27–31.42   | 97–105  | 29.27 quiet doorway: her dad from behind crouches, one EMPTY palm held out · 30.20 «dad» she     |
// |            |               |         | steps away behind the right jamb · 30.92 «know» she leans out, one eye past the jamb. Dim hall   |
// | DadPut     | 31.42–33.70   | 106–115 | 31.42 circle from his fingers on her toddler photo: sepia desk, the hand slides it across, tear-  |
// |            |               |         | off calendar sheds pages, flyers pile up (years) · 32.58 cut: the dairy line stamps that face on |
// |            |               |         | carton after carton (hits 32.72 «dad», 33.08) · 33.12 whip: one carton rides off into the store  |
// |            |               |         | fridge (33.27 «there.»), sepia → colour + the toddler print grows into her frame-0 face, mist   |
// | Billions   | 33.70–35.11   | 116–118 | 33.70 punch out: the fridge becomes an endless wall of cartons (generic drawn kids), pulling back |
// |            |               |         | and scrolling up · 33.94 BILLIONS stamps (orange), OF 34.18, CARTONS 34.40 (white)               |
// | NoneHome   | 35.11–36.93   | 119–124 | same wall + camera: the card lifts · a block of rows goes grey on «Almost» / «none» / «brought»   |
// |            |               |         | · 36.11 «kid» her carton keeps its colour (orange halo), slow push → face slot at LONE_CARTON    |
// | Loop       | 36.93–37.97   | 125     | fade = locked dissolve into the store fridge (her carton stays on LONE_CARTON) · the big watch   |
// |            |               |         | hand reaches in, takes it 37.30 (watch glint) and swings it down beside her cheek while the     |
// |            |               |         | camera drops into the frame-0 ECU; the swing settles into the frame-0 pose · 37.62 dissolve      |

// ======================================================================= helpers
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const eIO = (t: number, a: number, b: number) => easeInOut(ramp(t, a, b));
const eO = (t: number, a: number, b: number) => easeOut(ramp(t, a, b));
/** a small bump 0→1→0 around time c (width d) */
const bump = (t: number, c: number, d = 0.2) => {
	const x = (t - c + d / 2) / d;
	return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x);
};
/** camera kick: a quick push-in that springs back (A1) */
const kick = (t: number, times: number[], amp = 0.06) =>
	times.reduce((acc, ti) => {
		const a = t - ti;
		return a < 0 || a > 0.9 ? acc : acc + amp * (1 - Math.exp(-a * 30)) * Math.exp(-a * 5.5);
	}, 0);
/** 0→1 with an overshoot */
const popOv = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2));
const lerpP = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const f2 = (n: number) => n.toFixed(2);

/** handheld camera: shake on the hits + tremor, slightly scaled so the edges never show (A1) */
const Shk: React.FC<{t: number; hits: number[]; amp?: number; tremor?: number; sc?: number; children: React.ReactNode}> = ({t, hits, amp = 8, tremor = 1.2, sc = 1.03, children}) => {
	const s = shake(t, hits, amp, tremor);
	return <AbsoluteFill style={{transform: `translate(${f2(s.x)}px, ${f2(s.y)}px) rotate(${s.r.toFixed(3)}deg) scale(${sc})`}}>{children}</AbsoluteFill>;
};
/** CSS zoom: the frame point (ox, oy) stays put, everything scales by k */
const Zoom: React.FC<{k: number; ox: number; oy: number; children: React.ReactNode}> = ({k, ox, oy, children}) => (
	<AbsoluteFill style={{transform: `scale(${k.toFixed(4)})`, transformOrigin: `${ox}px ${oy}px`}}>{children}</AbsoluteFill>
);
/** a world → screen view for the full-frame kit B backdrops: world point (fx, fy) lands on screen (px, py), scale S */
type View = {S: number; fx: number; fy: number; px: number; py: number};
const viewL = (a: View, b: View, k: number): View => ({S: lerp(a.S, b.S, k), fx: lerp(a.fx, b.fx, k), fy: lerp(a.fy, b.fy, k), px: lerp(a.px, b.px, k), py: lerp(a.py, b.py, k)});
const vp = (v: View, x: number, y: number): P2 => [v.px + (x - v.fx) * v.S, v.py + (y - v.fy) * v.S];
const InView: React.FC<{v: View; blur?: number; filter?: string; children: React.ReactNode}> = ({v, blur = 0, filter, children}) => {
	const f = [filter, blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : ''].filter(Boolean).join(' ');
	return (
		<AbsoluteFill style={{filter: f || undefined}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: '0 0', transform: `translate(${(v.px - v.fx * v.S).toFixed(2)}px, ${(v.py - v.fy * v.S).toFixed(2)}px) scale(${v.S.toFixed(4)})`}}>{children}</div>
		</AbsoluteFill>
	);
};
/** a frame-sized svg layer (1080 × 1920 px) */
const Layer: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...style}}>
		{children}
	</svg>
);
/** wrist position for a kit A Hand whose palm contact point (handGrip) must sit on E (same transform as Fig: flip, rotate, scale) */
const gripWrist = (kind: HandKind, E: P2, rot: number, s: number, flip = false): P2 => {
	const g = handGrip(kind);
	const r = rotP([flip ? -g[0] : g[0], g[1]], rot);
	return [E[0] - r[0] * s, E[1] - r[1] * s];
};
/** wrist position for a kit A Hand whose index fingertip (handTip) must sit on E */
const tipWrist = (kind: HandKind, gesture: HandGesture, E: P2, rot: number, s: number, flip = false): P2 => {
	const g = handTip(kind, gesture);
	const r = rotP([flip ? -g[0] : g[0], g[1]], rot);
	return [E[0] - r[0] * s, E[1] - r[1] * s];
};
/** her printed photo as a kit B carton face (slot units 0..w × 0..h) */
const herFace = (w: number, h: number, young = true) => (
	<g transform={`translate(${w / 2} ${h / 2})`}>
		<KidPhotoG w={w} h={h} kid="her" young={young} tone="bw" lw={4} />
	</g>
);
/** her toddler print (k = 0) dissolving into her frame-0 portrait (k = 1, bangs + clip, as on kit A's MilkCarton) */
const herFaceMorph = (w: number, h: number, k: number) =>
	k <= 0.001 ? (
		herFace(w, h)
	) : k >= 0.999 ? (
		herFace(w, h, false)
	) : (
		<g>
			{herFace(w, h)}
			<g opacity={k}>{herFace(w, h, false)}</g>
		</g>
	);
/** an expanding ink ring (a «hit» marker on a fingertip / a stamp) */
const Ring: React.FC<{x: number; y: number; a: number; r?: number; color?: string; dur?: number}> = ({x, y, a, r = 70, color = PAL.orange, dur = 0.45}) => {
	if (a < 0 || a > dur) return null;
	const k = a / dur;
	return (
		<g opacity={1 - k}>
			<circle cx={x} cy={y} r={r * (0.35 + 0.9 * easeOut(k))} fill="none" stroke={INK} strokeWidth={14 * (1 - k) + 3} />
			<circle cx={x} cy={y} r={r * (0.35 + 0.9 * easeOut(k))} fill="none" stroke={color} strokeWidth={8 * (1 - k) + 2} />
		</g>
	);
};

// ----------------------------------------------------------------------- the neighbour's wall phone (no digits, no text)
/** a corded wall phone drawn in screen px: base centre (bx, by) at kitchen scale S; rec = where the receiver is (its centre +
 *  rotation, screen px) or null = on the hook. The coiled cord runs from the base bottom to the receiver's lower end. */
const WallPhone: React.FC<{bx: number; by: number; S: number; t: number; rec?: {x: number; y: number; rot: number} | null}> = ({bx, by, S, t, rec = null}) => {
	const lw = 3.2 * Math.max(1, S * 0.9);
	const bw = 34 * S;
	const bh = 74 * S;
	const R = rec ?? {x: bx, y: by + 2 * S, rot: 0};
	const recPath = (s: number) =>
		`M${-9 * s},${-44 * s} Q${-20 * s},${-44 * s} ${-20 * s},${-30 * s} L${-20 * s},${-20 * s} Q${-20 * s},${-12 * s} ${-9 * s},${-12 * s} L${-6 * s},${-12 * s} L${-6 * s},${12 * s} L${-9 * s},${12 * s} Q${-20 * s},${12 * s} ${-20 * s},${20 * s} L${-20 * s},${30 * s} Q${-20 * s},${44 * s} ${-9 * s},${44 * s} L${9 * s},${44 * s} Q${16 * s},${44 * s} ${16 * s},${34 * s} L${16 * s},${-34 * s} Q${16 * s},${-44 * s} ${9 * s},${-44 * s} Z`;
	// cord: from the base's lower left to the receiver's lower end, sagging, with a coil wiggle
	const A: P2 = [bx - bw * 0.3, by + bh / 2 - 4 * S];
	const re = rotP([-2 * S, 44 * S], R.rot);
	const B: P2 = [R.x + re[0], R.y + re[1]];
	const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
	const sag = Math.max(0, 70 * S - len * 0.35);
	const C: P2 = [(A[0] + B[0]) / 2, Math.max(A[1], B[1]) + sag];
	const n = Math.max(10, Math.round(len / (6 * S)) + 12);
	let d = '';
	for (let i = 0; i <= n; i++) {
		const u = i / n;
		const x = (1 - u) * (1 - u) * A[0] + 2 * u * (1 - u) * C[0] + u * u * B[0];
		const y = (1 - u) * (1 - u) * A[1] + 2 * u * (1 - u) * C[1] + u * u * B[1];
		const w = Math.sin(u * n * 1.9 + t * 3) * 4.5 * S;
		d += `${i ? 'L' : 'M'}${(x + w).toFixed(1)},${(y + w * 0.4).toFixed(1)} `;
	}
	return (
		<g>
			<rect x={bx - bw / 2 + 3 * S} y={by - bh / 2 + 4 * S} width={bw} height={bh} rx={7 * S} fill="rgba(0,0,0,0.22)" />
			<rect x={bx - bw / 2} y={by - bh / 2} width={bw} height={bh} rx={7 * S} fill={MILK.phone} stroke={INK} strokeWidth={lw} />
			<rect x={bx - bw * 0.3} y={by - bh * 0.05} width={bw * 0.6} height={bh * 0.36} rx={3 * S} fill={MILK.phoneD} stroke={INK} strokeWidth={lw * 0.6} />
			{Array.from({length: 9}, (_, i) => (
				<circle key={i} cx={bx - bw * 0.18 + (i % 3) * bw * 0.18} cy={by + bh * 0.02 + Math.floor(i / 3) * bh * 0.1} r={1.8 * S} fill={INK} opacity={0.65} />
			))}
			<rect x={bx - bw * 0.18} y={by - bh / 2 + 6 * S} width={bw * 0.36} height={8 * S} rx={3 * S} fill={MILK.phoneD} stroke={INK} strokeWidth={lw * 0.5} />
			<path d={d} fill="none" stroke={INK} strokeWidth={lw * 2.2} strokeLinejoin="round" strokeLinecap="round" />
			<path d={d} fill="none" stroke={MILK.phone} strokeWidth={lw * 0.9} strokeLinejoin="round" strokeLinecap="round" />
			<g transform={`translate(${R.x.toFixed(1)} ${R.y.toFixed(1)}) rotate(${R.rot.toFixed(1)})`}>
				<path d={recPath(S)} fill={MILK.phone} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d={`M${-14 * S},${-36 * S} L${-14 * S},${-24 * S} M${-14 * S},${24 * S} L${-14 * S},${36 * S}`} stroke={MILK.phoneD} strokeWidth={4 * S} strokeLinecap="round" />
			</g>
		</g>
	);
};
/** kitchen geometry used by RealName + Police (kitchen px, kit B HouseInterior 'kitchen'): the phone hangs between the fridge
 *  and the window frame; the cut-out goes on the fridge door at KITCHEN.fridgeSlot */
const PHONE: P2 = [361, 596];
const PIN: P2 = [KITCHEN.fridgeSlot.x, KITCHEN.fridgeSlot.y];
/** the pinned cut-out's scale at kitchen scale 1 (≈ 112 px wide on the fridge door) */
const PIN_S = 0.3;

// ======================================================================= 17 · REAL NAME
// zoom-through lands IN the doll case (CASE_END = the cut-out on the dolls), the lid opens, her hand lifts it, the camera tilts up to
// her kitchen, a fingertip traces the squiggle name to «REAL», the cut-out goes onto her fridge (magnet), the other hand grabs the phone
const RN_T0 = W(84) - 0.06; // 25.04
const RN_GRAB = 25.27;
const RN_LIFT = 25.58;
const RN_TILT0 = 25.33;
const RN_TILT1 = 25.6;
const RN_READ = W(86) + 0.05; // fingertip starts along the name
const RN_REAL = W(88); // 26.04: stops on «REAL»
const RN_PAN = 26.1;
const RN_PIN = W(89); // 26.30 magnet
const RN_PHONE = 26.42;
const RN_PGRAB = 26.56;
const CASE_S = 1.45;
/** the closed case's anchor (bottom centre of its front): the cut-out lying on the dolls (case units 6, −150) sits on CASE_END */
const CASE_AT: P2 = [CASE_END[0] - 6 * CASE_S, CASE_END[1] + 150 * CASE_S];
const READ_AT: P2 = [432, 630];
const KV_READ: View = {S: 1.9, fx: 300, fy: 700, px: 560, py: 700};
const KV_PIN: View = {S: 2.2, fx: PIN[0], fy: PIN[1] - 40, px: 400, py: 640};
const rnKitchen = (t: number): View => {
	const v = viewL(KV_READ, KV_PIN, eIO(t, RN_PAN, RN_PIN - 0.03));
	return {...v, S: v.S * (1 + 0.035 * ramp(t, RN_PIN, 26.95) + kick(t, [RN_PIN], 0.035))};
};
type CutT = {x: number; y: number; s: number; sy: number; rot: number};
const rnCut = (t: number): CutT => {
	const c0: CutT = {x: CASE_END[0], y: CASE_END[1], s: 0.4 * CASE_S, sy: 0.66, rot: 6};
	const sway = ramp(t, RN_LIFT - 0.1, RN_LIFT + 0.1);
	const c1: CutT = {x: READ_AT[0] + Math.sin(t * 2.3) * 5 * sway, y: READ_AT[1] + Math.sin(t * 1.9 + 1) * 6 * sway, s: 1.0, sy: 1, rot: -4 + Math.sin(t * 1.7) * 1.2 * sway};
	const kl = eO(t, RN_GRAB + 0.02, RN_LIFT);
	const arc = Math.sin(Math.PI * kl) * 60;
	const lifted: CutT = {x: lerp(c0.x, c1.x, kl) - arc * 0.4, y: lerp(c0.y, c1.y, kl) - arc, s: lerp(c0.s, c1.s, kl), sy: lerp(c0.sy, c1.sy, easeOut(kl)), rot: lerp(c0.rot, c1.rot, kl)};
	const kp = eIO(t, RN_PAN + 0.02, RN_PIN - 0.01);
	if (kp <= 0) return lifted;
	const v = rnKitchen(t);
	const [px, py] = vp(v, PIN[0], PIN[1]);
	const press = 1 - 0.05 * bump(t, RN_PIN, 0.14);
	return {x: lerp(lifted.x, px, kp), y: lerp(lifted.y, py, kp), s: lerp(lifted.s, PIN_S * v.S, kp) * press, sy: 1, rot: lerp(lifted.rot, -3, kp) + Math.sin((t - RN_PIN) * 22) * Math.exp(-Math.max(0, t - RN_PIN) * 9) * 2.5 * (t > RN_PIN ? 1 : 0)};
};
/** a point of the cut-out (cut-out units) on screen */
const cutPt = (c: CutT, p: P2): P2 => {
	const r = rotP([p[0] * c.s, p[1] * c.s * c.sy], c.rot);
	return [c.x + r[0], c.y + r[1]];
};
/** a hall rug under the case (top view): warm red field, lattice, border */
const HallRug: React.FC<{t: number}> = ({t}) => (
	<Layer>
		<rect x={-40} y={-40} width={1160} height={2000} fill="#7f3d34" />
		{Array.from({length: 26}, (_, i) => (
			<line key={`a${i}`} x1={-400 + i * 120} y1={-40} x2={-400 + i * 120 + 1100} y2={2000} stroke="#97523f" strokeWidth={10} />
		))}
		{Array.from({length: 26}, (_, i) => (
			<line key={`b${i}`} x1={1480 - i * 120} y1={-40} x2={1480 - i * 120 - 1100} y2={2000} stroke="#97523f" strokeWidth={10} />
		))}
		{Array.from({length: 40}, (_, i) => (
			<circle key={`c${i}`} cx={(i % 8) * 150 + 15} cy={Math.floor(i / 8) * 400 + 100 + (i % 2) * 200} r={14} fill={PAL.gold} opacity={0.55} />
		))}
		<rect x={30} y={60} width={1020} height={1800} fill="none" stroke="#e7c27a" strokeWidth={26} opacity={0.75} />
		<rect x={70} y={100} width={940} height={1720} fill="none" stroke="#2a5d63" strokeWidth={14} opacity={0.8} />
		{/* drifting window light on the rug */}
		<polygon points={`${180 + Math.sin(t * 0.8) * 20},0 ${560 + Math.sin(t * 0.8) * 20},0 ${900 + Math.sin(t * 0.8) * 20},1920 ${520 + Math.sin(t * 0.8) * 20},1920`} fill="#fff3d0" opacity={0.08} />
	</Layer>
);

export const RealName: React.FC<SceneProps> = () => {
	const t = useT();
	const kv = rnKitchen(t);
	const tilt = eIO(t, RN_TILT0, RN_TILT1);
	const tiltBlur = 22 * bump(t, (RN_TILT0 + RN_TILT1) / 2, RN_TILT1 - RN_TILT0);
	const open = eO(t, RN_T0 + 0.02, RN_T0 + 0.24);
	const c = rnCut(t);
	const showCut = t >= RN_GRAB || open > 0.55;
	// ---- left hand: reaches into the case, holds the cut-out's left edge, presses it on the fridge, lets go
	const kHold = ramp(t, RN_GRAB - 0.02, RN_GRAB + 0.04);
	const grabE = cutPt(rnCut(RN_GRAB), [-182, 40]);
	const reachK = eO(t, RN_T0 + 0.06, RN_GRAB);
	const holdE = cutPt(c, [-182, 40]);
	const release = eIO(t, RN_PIN + 0.05, RN_PIN + 0.24);
	const E_L: P2 = t < RN_GRAB ? lerpP([-160, 1650], grabE, reachK) : [holdE[0] - 520 * release, holdE[1] + 900 * release];
	const sL = 1.45 * (t < RN_GRAB ? lerp(0.62, c.s, reachK) : c.s);
	const rotL = (t < RN_GRAB ? lerp(30, 40, reachK) : lerp(40, 74, eO(t, RN_GRAB, RN_LIFT))) + c.rot;
	const wL = gripWrist('neighbor', E_L, rotL, sL);
	const gL: HandGesture = 'grab';
	const toL: HandGesture = 'open';
	const kL = t < RN_GRAB ? 1 - kHold : release;
	// ---- right hand: fingertip along the name line → withdraws → grabs the phone receiver
	const PH = vp(kv, PHONE[0], PHONE[1]);
	const sweep = eIO(t, RN_READ, RN_REAL);
	const tipLocal: P2 = [lerp(-118, 108, sweep), 222];
	const tapR = bump(t, RN_REAL + 0.03, 0.16);
	const tip = cutPt(c, tipLocal);
	const inR = eO(t, RN_READ - 0.14, RN_READ);
	const outR = eIO(t, RN_REAL + 0.08, RN_REAL + 0.24);
	const sR = 1.45 * c.s;
	const rotR = -64 + c.rot;
	const wPoint0 = tipWrist('neighbor', 'point', tip, rotR, sR);
	const wPoint: P2 = [wPoint0[0] + (1 - inR) * 520 + outR * 560, wPoint0[1] + (1 - inR) * 160 + outR * 260];
	// phone: the receiver rests on the base until her hand (in from the lower right) closes on it, then it is yanked up to her ear
	const ph = eO(t, RN_PHONE, RN_PGRAB);
	const lift = eIO(t, RN_PGRAB + 0.02, RN_PGRAB + 0.3);
	const recRest = {x: PH[0], y: PH[1] + 2 * kv.S, rot: 0};
	const rec = t < RN_PGRAB ? null : {x: recRest.x + lift * 90, y: recRest.y - lift * 330, rot: -lift * 20};
	const recPos = rec ?? recRest;
	const sP = 0.5 * kv.S;
	const rotP0 = -38 + (rec ? rec.rot * 0.5 : 0);
	const wPhoneTarget = gripWrist('neighbor', [recPos.x + 10 * kv.S, recPos.y + 4 * kv.S], rotP0, sP, true);
	const wPhone: P2 = lerpP([wPhoneTarget[0] + 380, wPhoneTarget[1] + 460], wPhoneTarget, ph);
	const phoneHand = t >= RN_PHONE;
	const pointHand = t >= RN_READ - 0.14 && t < RN_REAL + 0.26;
	// ---- the over-the-shoulder head (back of the neighbour's head, out of focus)
	const nbX = 120 - 150 * eIO(t, RN_PAN, RN_PIN) + Math.sin(t * 1.3) * 6;
	const nbY = 2060 + 40 * tilt;
	const camK = 1 + 0.04 * ramp(t, RN_T0, RN_TILT0) + kick(t, [RN_REAL], 0.045);
	const realA = t - RN_REAL;
	return (
		<Shk t={t} hits={[RN_PIN]} amp={7} tremor={1.1}>
			<Zoom k={camK} ox={460} oy={720}>
				{/* the kitchen (above the case in this tilt): fridge on the left, the phone on the wall, window on the right */}
				<AbsoluteFill style={{transform: `translateY(${((tilt - 1) * 1600).toFixed(1)}px)`, filter: tiltBlur > 0.5 ? `blur(${tiltBlur.toFixed(1)}px)` : undefined}}>
					<InView v={kv} blur={lerp(6, 0, eIO(t, RN_PAN, RN_PIN))}>
						<HouseInterior t={t} view="kitchen" />
					</InView>
					<Layer>
						<WallPhone bx={PH[0]} by={PH[1]} S={kv.S} t={t} rec={rec} />
					</Layer>
				</AbsoluteFill>
				{/* the doll case on the hall rug (slides away as the camera tilts up) */}
				{tilt < 0.999 ? (
					<AbsoluteFill style={{transform: `translateY(${(tilt * 1600).toFixed(1)}px)`, filter: tiltBlur > 0.5 ? `blur(${tiltBlur.toFixed(1)}px)` : undefined}}>
						<HallRug t={t} />
						<DollCase x={CASE_AT[0]} y={CASE_AT[1]} s={CASE_S} t={t} open={open} cutout={-1} />
					</AbsoluteFill>
				) : null}
				{/* left hand behind the cut-out (fingers), the cut-out, then palm + thumb in front */}
				{t >= RN_T0 + 0.06 && release < 0.999 ? <Hand x={wL[0]} y={wL[1]} s={sL} rot={rotL} kind="neighbor" gesture={gL} to={toL} k={kL} arm={620} part="back" t={t} /> : null}
				{showCut ? (
					<Layer>
						<g transform={`translate(${f2(c.x)} ${f2(c.y)}) rotate(${f2(c.rot)}) scale(${c.s.toFixed(4)} ${(c.s * c.sy).toFixed(4)})`} opacity={t >= RN_GRAB ? 1 : clamp01((open - 0.55) / 0.2)}>
							<CutoutG t={t} lw={lwFor(c.s)} shadow={0.5} nameHi={t < RN_PAN + 0.1 ? sweep : 1 - ramp(t, RN_PAN, RN_PIN)} magnet={popOv(ramp(t, RN_PIN - 0.02, RN_PIN + 0.16))} />
						</g>
					</Layer>
				) : null}
				{t >= RN_T0 + 0.06 && release < 0.999 ? <Hand x={wL[0]} y={wL[1]} s={sL} rot={rotL} kind="neighbor" gesture={gL} to={toL} k={kL} arm={620} part="front" t={t} /> : null}
				{/* «REAL»: the fingertip stops, a ring pops on the end of the name */}
				<Layer>
					<Ring x={tip[0]} y={tip[1] - 26 * c.s} a={realA} r={80} dur={0.3} />
				</Layer>
				{pointHand ? <Hand x={wPoint[0]} y={wPoint[1]} s={sR} rot={rotR} kind="neighbor" gesture="point" tap={tapR} arm={700} t={t} /> : null}
				{phoneHand ? <Hand x={wPhone[0]} y={wPhone[1]} s={sP} rot={rotP0} flip kind="neighbor" gesture="open" to="grab" k={ramp(t, RN_PGRAB - 0.06, RN_PGRAB)} arm={560} t={t} /> : null}
				{/* over her shoulder: the back of the neighbour's head + cardigan, out of focus (no face) */}
				<AbsoluteFill style={{filter: 'blur(5px)', opacity: 0.96}}>
					<Neighbor x={nbX} y={nbY} s={1.25} t={t} pose="back" />
				</AbsoluteFill>
			</Zoom>
		</Shk>
	);
};

// ======================================================================= 18 · POLICE
// her kitchen, wide: the cut-out on the fridge, the receiver dangling, red / blue light; cars pull up in the window one per beat,
// then the camera pushes into the window and on «A LOT» rows of cars and officer silhouettes keep piling up past the frame edge
const PO_T0 = W(90) - 0.06; // 26.75
const PO_SHOW = W(91) + 0.02;
const PO_UP = W(92) + 0.02;
const PO_LOT = W(94);
const PO_POL = W(96);
const PO_PUSH0 = 27.6;
const PO_PUSH1 = 27.97;
const KV_WIDE: View = {S: 1.25, fx: 470, fy: 640, px: 540, py: 700};
const KV_WIN: View = {S: 2.0, fx: KITCHEN.window.x + KITCHEN.window.w / 2, fy: KITCHEN.window.y + KITCHEN.window.h / 2, px: 470, py: 650};
const poKitchen = (t: number): View => {
	const v = viewL(KV_WIDE, KV_WIN, eIO(t, PO_PUSH0, PO_PUSH1));
	return {...v, S: v.S * (1 + 0.05 * ramp(t, PO_T0, PO_PUSH0) * (1 - ramp(t, PO_PUSH0, PO_PUSH1)) + 0.05 * ramp(t, PO_PUSH1, 29.4) + kick(t, [PO_SHOW, PO_UP, PO_POL], 0.03) + kick(t, [PO_LOT], 0.06))};
};
/** rows of the street seen through the window (window px, 420 × 440): ground y and car scale */
const ROWS = [
	{y: 336, s: 0.27},
	{y: 304, s: 0.2},
	{y: 284, s: 0.15},
	{y: 270, s: 0.11},
];
type CarDef = {stop: number; row: number; x: number};
const CARS: CarDef[] = [
	{stop: PO_SHOW, row: 0, x: 290},
	{stop: PO_UP, row: 0, x: 92},
	{stop: PO_LOT - 0.06, row: 1, x: 380},
	{stop: PO_LOT + 0.02, row: 1, x: 236},
	{stop: PO_LOT + 0.1, row: 1, x: 92},
	{stop: PO_LOT + 0.18, row: 1, x: -52},
	{stop: W(95) + 0.0, row: 2, x: 452},
	{stop: W(95) + 0.07, row: 2, x: 344},
	{stop: W(95) + 0.14, row: 2, x: 236},
	{stop: W(95) + 0.21, row: 2, x: 128},
	{stop: PO_POL, row: 2, x: 20},
	{stop: PO_POL + 0.06, row: 2, x: -88},
	{stop: PO_POL + 0.12, row: 3, x: 480},
	{stop: PO_POL + 0.17, row: 3, x: 400},
	{stop: PO_POL + 0.22, row: 3, x: 320},
	{stop: PO_POL + 0.27, row: 3, x: 240},
	{stop: PO_POL + 0.32, row: 3, x: 160},
	{stop: PO_POL + 0.37, row: 3, x: 80},
	{stop: PO_POL + 0.42, row: 3, x: 0},
	{stop: PO_POL + 0.47, row: 3, x: -80},
];
const COPS = Array.from({length: 18}, (_, i) => {
	const row = i % 3;
	return {
		t0: PO_LOT - 0.02 + i * 0.05,
		x: -20 + ((i * 97) % 460) + (h1(i * 3.3) - 0.5) * 30,
		y: 362 + row * 28 + h1(i * 1.7) * 10,
		s: 0.08 + row * 0.02,
		seed: i,
	};
}).sort((a, b) => a.y - b.y);
/** what the window shows: a dusk street (light sky, lit lawn — so the cars and the officer silhouettes read), far trees, the
 *  police cars (black-and-white, no text or plates) and the officers (silhouettes, no faces) */
const PoliceStreet: React.FC<{t: number; w: number; h: number}> = ({t, w, h}) => {
	const glow = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 1.3);
	const on = ramp(t, PO_SHOW - 0.1, PO_SHOW + 0.15);
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, overflow: 'hidden'}}>
			<svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
				<defs>
					<linearGradient id="poSky" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#24346a" />
						<stop offset="0.55" stopColor="#7a6aa6" />
						<stop offset="1" stopColor="#e7a07a" />
					</linearGradient>
				</defs>
				<rect width={w} height={262} fill="url(#poSky)" />
				{/* far trees + the neighbours' roofs, a street lamp */}
				{Array.from({length: 9}, (_, i) => (
					<circle key={i} cx={-20 + i * 58} cy={248 - (i % 3) * 10} r={34 + (i % 2) * 10} fill="#2c4a46" stroke={INK} strokeWidth={2} />
				))}
				<polygon points="40,262 40,214 92,184 144,214 144,262" fill="#3b3a5a" stroke={INK} strokeWidth={2} />
				<rect x={70} y={226} width={20} height={18} fill="#ffd27a" />
				<polygon points="300,262 300,220 352,192 404,220 404,262" fill="#3b3a5a" stroke={INK} strokeWidth={2} />
				<rect x={340} y={232} width={20} height={18} fill="#ffd27a" opacity={0.8} />
				<line x1={214} y1={262} x2={214} y2={186} stroke={INK} strokeWidth={4} />
				<circle cx={214} cy={184} r={7} fill="#fff3b0" stroke={INK} strokeWidth={2} />
				{/* street + lawn (lit by the street lamp and the headlights) */}
				<rect x={0} y={262} width={w} height={84} fill="#4a4f60" />
				<line x1={0} y1={304} x2={w} y2={304} stroke="#e8e2c8" strokeWidth={3} strokeDasharray="24 20" opacity={0.6} />
				<rect x={0} y={342} width={w} height={h - 342} fill="#5d9a50" />
				<rect x={0} y={342} width={w} height={8} fill="#3f7a3a" />
				<ellipse cx={214} cy={300} rx={170} ry={46} fill="#fff3b0" opacity={0.16} />
				{/* the light bars throw red / blue on the street and the lawn */}
				<ellipse cx={w * 0.28} cy={330} rx={250} ry={80} fill="#ff3048" opacity={0.3 * glow * on} />
				<ellipse cx={w * 0.72} cy={330} rx={250} ry={80} fill="#3a7bff" opacity={0.3 * (1 - glow) * on} />
			</svg>
			{/* cars, far rows first; each slides in from the right and dips its nose when it stops */}
			{[3, 2, 1, 0].map((r) =>
				CARS.filter((c) => c.row === r && t >= c.stop - 0.34).map((c, i) => {
					const k = eO(t, c.stop - 0.34, c.stop);
					return <PoliceCar key={`${r}-${i}`} x={c.x + (1 - k) * 640} y={ROWS[r].y} s={ROWS[r].s} t={t} speed={k < 1 ? 2.6 : 0} stop={t - c.stop} flip silhouette={r === 3} rate={1.4} />;
				}),
			)}
			{/* officers pour onto the lawn (silhouettes, no faces, no text) and walk toward the house */}
			{COPS.filter((p) => t >= p.t0).map((p) => {
				const a = t - p.t0;
				const up = eO(a, 0, 0.16);
				const walk = a * 14;
				const s = p.s * (1 + 0.04 * a);
				return <Cop key={p.seed} x={p.x + Math.sin(p.seed) * walk * 0.3} y={p.y + walk + (1 - up) * 30} s={s} t={t + p.seed * 0.37} pose="walk" seed={p.seed} tone="sil" sil="#18223f" opacity={up} />;
			})}
		</div>
	);
};
/** a soft red ⇄ blue sway over the room (screen blend), the window opening left out (the street has its own light) — police light
 *  without hard full-frame flashes (WCAG 2.3.1) */
const PoliceWash: React.FC<{t: number; k: number; cx: number; cy: number; hole: [number, number, number, number]}> = ({t, k, cx, cy, hole}) => {
	if (k <= 0.01) return null;
	const ph = Math.sin(t * 2 * Math.PI * 1.3);
	const red = 0.5 + 0.5 * ph;
	const [x0, y0, x1, y1] = hole.map((v) => v.toFixed(1));
	const clip = `path(evenodd, 'M-200 -200 H1280 V2120 H-200 Z M${x0} ${y0} H${x1} V${y1} H${x0} Z')`;
	return (
		<AbsoluteFill style={{pointerEvents: 'none', clipPath: clip}}>
			<AbsoluteFill style={{background: PAL.navy, opacity: 0.22 * k, mixBlendMode: 'multiply'}} />
			<AbsoluteFill style={{mixBlendMode: 'screen', opacity: k * (0.25 + 0.55 * red), background: `radial-gradient(900px 1100px at ${cx - 330}px ${cy}px, rgba(255,40,60,0.85) 0%, rgba(255,40,60,0.32) 42%, rgba(255,40,60,0) 74%)`}} />
			<AbsoluteFill style={{mixBlendMode: 'screen', opacity: k * (0.25 + 0.55 * (1 - red)), background: `radial-gradient(900px 1100px at ${cx + 330}px ${cy}px, rgba(40,110,255,0.85) 0%, rgba(40,110,255,0.32) 42%, rgba(40,110,255,0) 74%)`}} />
		</AbsoluteFill>
	);
};
export const Police: React.FC<SceneProps> = () => {
	const t = useT();
	const kv = poKitchen(t);
	const PH = vp(kv, PHONE[0], PHONE[1]);
	const pin = vp(kv, PIN[0], PIN[1]);
	// the receiver she dropped dangles on its cord and swings
	const sw = 16 * Math.sin((t - PO_T0) * 3.3 + 0.6) * Math.exp(-(t - PO_T0) * 0.35);
	const hang = rotP([0, 118 * kv.S], sw);
	const rec = {x: PH[0] - 6 * kv.S + hang[0], y: PH[1] + 30 * kv.S + hang[1], rot: sw + 180};
	const wash = eO(t, PO_T0, PO_T0 + 0.18);
	const Wn = KITCHEN.window;
	const w0 = vp(kv, Wn.x, Wn.y);
	const w1 = vp(kv, Wn.x + Wn.w, Wn.y + Wn.h);
	const push = eIO(t, PO_PUSH0, PO_PUSH1);
	return (
		<Shk t={t} hits={[PO_LOT]} amp={7} tremor={1.2}>
			<InView v={kv}>
				<HouseInterior t={t} view="kitchen" night={0.55} lamp={0.4} outside={<PoliceStreet t={t} w={Wn.w} h={Wn.h} />} />
			</InView>
			<Cutout x={pin[0]} y={pin[1]} s={PIN_S * kv.S} rot={-3 + Math.sin(t * 1.6) * 0.6} t={t} magnet={1} shadow={0.5} />
			<Layer>
				<WallPhone bx={PH[0]} by={PH[1]} S={kv.S} t={t} rec={rec} />
			</Layer>
			<PoliceWash t={t} k={wash} cx={lerp(360, (w0[0] + w1[0]) / 2, push)} cy={lerp(760, (w0[1] + w1[1]) / 2, push)} hole={[w0[0], w0[1], w1[0], w1[1]]} />
		</Shk>
	);
};

// ======================================================================= 19 · HANDED BACK
// a quiet hall: her dad SQUARE from behind in the middle of the frame (checked shirt, back of the head — no face), down on one knee,
// BOTH arms slowly opening toward her, palms up; she stands in the far doorway, on «dad» steps away behind the right jamb, on «know»
// leans out with one eye — and he leans in. His head stays below her feet (both read in full); his arms + hands stay ABOVE the
// subtitle band (y < 1180), the band sits on his back, darkened by the hall shadow.
const HB_T0 = W(97) - 0.06; // 29.27
const HB_HIDE = W(102); // 30.198
const HB_PEEK = W(105); // 30.916
const DOOR3 = {x0: 330, x1: 670, top: 200, floor: 915};
const G_S = 0.7;
const G_K = G_S / 0.86; // her offsets were laid out at 0.86
const G_FEET = DOOR3.floor - 26 * G_K;
const G_X = 540;
const DAD = {x: 500, y: 1562, s: 0.85};
export const HandedBack: React.FC<SceneProps> = ({t1}) => {
	const t = useT();
	// he has just gone down on one knee (settles), his arms open slowly; they sink a little when she hides, he leans in on the peek
	const crouch = lerp(0.9, 1, eIO(t, HB_T0, HB_T0 + 0.4));
	const reach = eIO(t, HB_T0 + 0.04, HB_T0 + 0.8) - 0.24 * eIO(t, HB_HIDE + 0.12, HB_HIDE + 0.55) + 0.24 * eIO(t, HB_PEEK - 0.1, HB_PEEK + 0.35);
	const lean = 0.35 * eIO(t, HB_T0 + 0.3, HB_T0 + 0.9) - 0.35 * eIO(t, HB_HIDE + 0.1, HB_HIDE + 0.5) + eIO(t, HB_PEEK - 0.05, HB_PEEK + 0.45);
	const tilt = -5 * eIO(t, HB_HIDE + 0.15, HB_HIDE + 0.55) + 5 * eIO(t, HB_PEEK - 0.1, HB_PEEK + 0.3);
	// her: stands in the doorway (hands together), leans back a little as he reaches → turns and steps away right → hidden →
	// leans out from behind the right jamb, one eye
	const stepK = eIO(t, HB_HIDE, HB_HIDE + 0.36);
	const peekK = eO(t, HB_PEEK - 0.22, HB_PEEK + 0.04);
	let girl: React.ReactNode = null;
	let fingers = 0;
	if (t < HB_HIDE) {
		const back = eIO(t, HB_T0 + 0.3, HB_T0 + 0.75);
		girl = <Girl x={G_X} y={G_FEET} s={G_S} t={t} pose="hold" flip clipSide={-1} rot={2.5 * back + Math.sin(t * 2.1) * 0.6} expr="curious" look={[-0.75, 0.45]} wide={0.3 * back} />;
	} else if (t < HB_HIDE + 0.4) {
		girl = <Girl x={lerp(G_X, DOOR3.x1 + 200 * G_K, stepK)} y={G_FEET} s={G_S} t={t} pose="walk" speed={1.4} expr="sad" look={[0.6, 0.2]} />;
	} else if (t >= HB_PEEK - 0.22) {
		const gl = -15.5 * peekK + Math.sin(t * 2.4) * 0.8 * peekK;
		girl = <Girl x={DOOR3.x1 + 118 * G_K} y={G_FEET} s={G_S} t={t} pose="stand" flip clipSide={-1} rot={gl} expr="sad" look={[-0.9, 0.35]} turn={0.15} />;
		fingers = eO(t, HB_PEEK - 0.08, HB_PEEK + 0.12);
	}
	const camK = 1 + 0.05 * ramp(t, HB_T0, t1 + 0.42) + kick(t, [HB_PEEK], 0.02);
	return (
		<Shk t={t} hits={[]} tremor={0.9}>
			<Zoom k={camK} ox={500} oy={1100}>
				<Doorframe t={t} x0={DOOR3.x0} x1={DOOR3.x1} top={DOOR3.top} floor={DOOR3.floor} behind={girl}>
					{/* four small fingertips curl round the jamb as she peeks */}
					{fingers > 0.02 ? (
						<Layer>
							{[0, 1, 2, 3].map((i) => {
								const y = G_FEET - 318 * G_K + i * 15 * G_K + Math.sin(t * 3 + i) * 1.2;
								const len = (i === 3 ? 11 : 16) * G_K * fingers;
								return (
									<g key={i}>
										<line x1={DOOR3.x1 + 4} y1={y} x2={DOOR3.x1 + 4 - len} y2={y + 1} stroke={INK} strokeWidth={15 * G_K} strokeLinecap="round" />
										<line x1={DOOR3.x1 + 4} y1={y} x2={DOOR3.x1 + 4 - len} y2={y + 1} stroke={SKIN} strokeWidth={9 * G_K} strokeLinecap="round" />
									</g>
								);
							})}
						</Layer>
					) : null}
					{/* the hall in shadow (the light is in the room beyond) */}
					<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(10,8,16,0) 0%, rgba(10,8,16,0) 52%, rgba(10,8,16,0.46) 62%, rgba(10,8,16,0.66) 100%)'}} />
					<DadBack x={DAD.x} y={DAD.y} s={DAD.s} t={t} crouch={crouch} reach={reach} lean={lean} tilt={tilt} />
					<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(10,8,16,0) 0%, rgba(10,8,16,0) 61.5%, rgba(10,8,16,0.34) 70%, rgba(10,8,16,0.42) 100%)'}} />
				</Doorframe>
			</Zoom>
		</Shk>
	);
};

// ======================================================================= 20 · DAD PUT IT THERE
// sepia, earlier: his checked-sleeve hand slides her toddler photo across a plain desk (a tear-off calendar sheds pages, flyers with
// her face pile up = years) → the dairy line stamps that face onto carton after carton → one carton rides off into the store fridge
const DP_T0 = W(106) - 0.06; // 31.42
const DP_LINE = W(111) - 0.04; // 32.58
const DP_PERIOD = 0.36;
const DP_HIT0 = W(112); // first stamp on «dad»
const DP_LINE_OFF = DP_HIT0 - 0.66 * DP_PERIOD;
const DP_WHIP = 33.12;
const DP_LAND = 33.44;
const SEPIA = 'sepia(0.82) saturate(0.85) contrast(1.03)';
/** the photo's centre at t0 relative to DESK_PHOTO (the circle centre lands on his fingers by the photo's lower-right corner) */
const DP_PH0: P2 = [-60, -160];
/** her carton (kit B), parked in the store fridge where Billions picks it up: anchor (bottom centre) + scale */
const HERO_PARK: P2 = [540, 1020];
const HERO_PARK_S = WALL.cs * 0.95;
/** the store fridge view in DadPut: shelf slot (1, 2) lands on HERO_PARK */
const DP_FRIDGE: View = {S: HERO_PARK_S / 0.78, fx: 540, fy: 948, px: HERO_PARK[0], py: HERO_PARK[1]};
/** the line carton that rides off (the one just right of the press when the whip starts) */
const DP_HERO_K = (() => {
	const cs = dairyLineCartons(DP_WHIP - DP_LINE_OFF, DP_PERIOD);
	let best = cs[0];
	for (const c of cs) if (c.printed && Math.abs(c.x - (LINE.press + LINE.gap * 0.85)) < Math.abs(best.x - (LINE.press + LINE.gap * 0.85))) best = c;
	return best.k;
})();
const heroOnLine = (t: number): P2 => {
	const c = dairyLineCartons(t - DP_LINE_OFF, DP_PERIOD).find((q) => q.k === DP_HERO_K);
	return c ? [c.x, c.y] : [LINE.press + LINE.gap, LINE.y];
};
/** a missing-child flyer (no words: red band, her toddler photo, squiggle lines), centre (0,0), 220 × 300 */
const FlyerG: React.FC<{seed: number}> = ({seed}) => (
	<g>
		<rect x={-104} y={-142} width={220} height={300} rx={4} fill="rgba(0,0,0,0.25)" />
		<rect x={-110} y={-150} width={220} height={300} rx={4} fill="#fffaf0" stroke={INK} strokeWidth={5} />
		<rect x={-110} y={-150} width={220} height={46} fill={PAL.stamp} stroke={INK} strokeWidth={4} />
		<g transform="translate(0 -14)">
			<rect x={-62} y={-72} width={124} height={144} fill="#d9d9d9" stroke={INK} strokeWidth={4} />
			<KidPhotoG w={124} h={144} kid="her" young tone="bw" lw={4} />
		</g>
		{[84, 108, 128].map((y, j) => (
			<path key={j} d={squiggle(-70 + j * 10, 70 - j * 14, y, seed * 7 + j * 3 + 1, 4)} stroke="#4a4a4a" strokeWidth={4} fill="none" strokeLinecap="round" />
		))}
	</g>
);
export const DadPut: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	// ---- desk (31.42 – 32.58)
	if (t < DP_LINE) {
		const slide = eIO(t, t0 + 0.06, t0 + 0.56);
		// the circle opens on DESK_PHOTO: at t0 that point is his fingertips on the photo's lower-right corner (not her face — a lone
		// small face in the circle read as a second child next to the girl peeking in HandedBack's doorway), then he slides the
		// photo up-right across the desk to (570, 470)
		const photo: P2 = [lerp(DESK_PHOTO[0] + DP_PH0[0], 570, slide), lerp(DESK_PHOTO[1] + DP_PH0[1], 470, slide)];
		const photoRot = lerp(4, -3, slide) + Math.sin(Math.max(0, t - t0 - 0.56) * 18) * Math.exp(-Math.max(0, t - t0 - 0.56) * 7) * 2 * (t > t0 + 0.56 ? 1 : 0);
		const letGo = eIO(t, t0 + 0.6, t0 + 0.98);
		const handS = 1.3;
		// his fingertips push on the photo's lower border (her face stays visible), then the hand slides back down
		const wrist: P2 = [photo[0] + 36 + letGo * 60, photo[1] + 548 + letGo * 560];
		const nFly = 3 + Math.floor((t - t0) * 4.2);
		const flyAge = ((t - t0) * 4.2) % 1 / 4.2;
		const camK = lerp(1.07, 1.0, eO(t, t0, DP_LINE));
		return (
			<AbsoluteFill style={{filter: SEPIA}}>
				<Shk t={t} hits={[]} tremor={0.8}>
					<AbsoluteFill style={{transform: `scale(${camK.toFixed(4)}) rotate(${lerp(1.6, 0, eO(t, t0, DP_LINE)).toFixed(3)}deg)`, transformOrigin: '540px 720px'}}>
						<TableTop t={t} variant="desk" light={0.9} />
						{/* years: a desk calendar sheds its pages, flyers with her face keep landing on a pile */}
						<TearCalendar x={235} y={150} s={0.48} pages={(t - t0) * 4.6} />
						<Layer>
							{Array.from({length: nFly}, (_, i) => {
								const last = i === nFly - 1;
								const k = last ? eO(flyAge, 0, 0.16) : 1;
								const rot = (h1(i * 2.7) - 0.5) * 24;
								return (
									<g key={i} transform={`translate(${(830 + (h1(i * 1.3) - 0.5) * 40).toFixed(1)} ${(1010 - i * 4 - (1 - k) * 140).toFixed(1)}) rotate(${(rot + (1 - k) * 20).toFixed(1)}) scale(${(0.62 * lerp(1.25, 1, k)).toFixed(3)})`} opacity={k}>
										<FlyerG seed={i} />
									</g>
								);
							})}
						</Layer>
						<PhotoPrint x={photo[0]} y={photo[1]} s={1} w={290} young tone="sepia" rot={photoRot} t={t} />
						<Hand x={wrist[0]} y={wrist[1]} s={handS} rot={-4 + letGo * 8} kind="dad" gesture="open" to="rest" k={letGo} arm={900} t={t} />
					</AbsoluteFill>
				</Shk>
			</AbsoluteFill>
		);
	}
	// ---- the dairy line (32.58 – 33.12) and the ride into the store fridge (33.12 – 33.70)
	const lt = t - DP_LINE_OFF;
	const whip = eIO(t, DP_WHIP, DP_WHIP + 0.2);
	const wBlur = 4 * whip * (1 - whip) * 24;
	const riding = t >= DP_WHIP - 0.12;
	const hits = [DP_HIT0, DP_HIT0 + DP_PERIOD, DP_HIT0 + 2 * DP_PERIOD];
	const lineK = 1.22 + 0.07 * ramp(t, DP_LINE, DP_WHIP) + kick(t, hits.filter((h) => h < DP_WHIP), 0.035);
	// her carton: on the line (skipped by DairyLine while it rides) → arc into the fridge gap, sepia → colour, squash + mist
	const fv: View = {...DP_FRIDGE, px: DP_FRIDGE.px + (1 - whip) * 1080};
	const slot = vp(fv, 540, 948);
	const onLine = heroOnLine(t);
	const lineScreen: P2 = [540 + (onLine[0] - 540) * lineK - whip * 1080, 900 + (onLine[1] - 900) * lineK];
	const ride = eIO(t, DP_WHIP - 0.04, DP_LAND);
	const hero: P2 = [lerp(lineScreen[0], slot[0], ride), lerp(lineScreen[1], slot[1], ride) - Math.sin(Math.PI * ride) * 180];
	const heroS = lerp(LINE.s * lineK, HERO_PARK_S, ride) * (1 - 0.07 * bump(t, DP_LAND + 0.04, 0.16));
	const heroRot = Math.sin(Math.PI * ride) * -14;
	const sep = 1 - ramp(t, DP_WHIP + 0.14, DP_LAND);
	// with the sepia → colour the printed toddler grows into the frame-0 face (bangs + clip), so the carton the wall keeps and the
	// one the watch hand lifts in Loop show the SAME face
	const grow = eIO(t, DP_WHIP + 0.08, DP_LAND);
	const fk = 1 + 0.05 * ramp(t, DP_LAND, 33.9);
	return (
		<AbsoluteFill>
			{whip < 0.999 ? (
				<AbsoluteFill style={{transform: `translateX(${(-whip * 1080).toFixed(1)}px)`, filter: wBlur > 0.5 ? `blur(${wBlur.toFixed(1)}px)` : undefined}}>
					<Zoom k={lineK} ox={540} oy={900}>
						<DairyLine t={lt} period={DP_PERIOD} faces={(i, w, h) => herFace(w, h)} header="missing" sepia={0.85} skip={riding ? [DP_HERO_K] : []} />
					</Zoom>
				</AbsoluteFill>
			) : null}
			{whip > 0.001 ? (
				<AbsoluteFill style={{filter: wBlur > 0.5 ? `blur(${wBlur.toFixed(1)}px)` : undefined}}>
					<Zoom k={fk} ox={540} oy={860}>
						<InView v={fv}>
							{/* blank face windows = the same store fridge as frame 0 and Loop */}
							<DairyFridge t={t} door={1} mist={1} gaps={[[1, 2]]} />
						</InView>
					</Zoom>
				</AbsoluteFill>
			) : null}
			{riding ? (
				<Zoom k={t >= DP_LAND ? fk : 1} ox={540} oy={860}>
					<Layer style={{filter: sep > 0.01 ? `sepia(${(0.85 * sep).toFixed(3)})` : undefined}}>
						<CartonG x={hero[0]} y={hero[1]} s={heroS} rot={heroRot} side={0} hue={0} header="missing" face={herFaceMorph(BC_SLOT.w, BC_SLOT.h, grow)} seed={DP_HERO_K + 100} lw={6} />
						<VaporG x={slot[0] - 70} y={slot[1] - 20} a={t - DP_LAND} dur={0.9} size={70} dx={-60} dy={30} seed={3} />
						<VaporG x={slot[0] + 70} y={slot[1] - 20} a={t - DP_LAND - 0.03} dur={0.9} size={64} dx={60} dy={30} seed={7} />
					</Layer>
				</Zoom>
			) : null}
		</AbsoluteFill>
	);
};
const BC_SLOT = {w: 104, h: 120};

// ======================================================================= 21–22 · BILLIONS / NONE HOME (one wall, one camera)
// The wall (kit B CartonWall) is ONE continuous shot across both beats: her carton (cell HERO = the one DadPut parked in the fridge)
// starts at HERO_PARK, the camera pulls back while the wall scrolls up (Billions, BILLIONS OF CARTONS stamps), then rows go grey and
// the camera pushes in until her carton's face slot sits on LONE_CARTON (NoneHome); it stays there under Loop's fade.
const BI_T0 = W(116) - 0.06; // 33.70
const BI_STAMP = W(116) + 0.18; // 33.94
const NH_T0 = W(119) - 0.06; // 35.11
const NH_KID = W(123); // 36.11
const LOOP_T0 = W(125) - 0.06; // 36.93
const HERO: [number, number] = [0, 1];
const WALL_V = 200;
/** wall zoom: pull back (Billions) → slow push toward her carton (NoneHome) */
const wallS = (t: number) =>
	t < 34.5 ? lerp(0.95, 0.42, easeOut(ramp(t, BI_T0, 34.5))) : t < NH_T0 ? lerp(0.42, 0.37, ramp(t, 34.5, NH_T0)) : t < LOOP_T0 ? lerp(0.37, 0.64, eIO(t, NH_T0 + 0.08, LOOP_T0)) : lerp(0.64, 0.67, ramp(t, LOOP_T0, LOOP_T0 + 0.5));
const WALL_CX = 540;
const WALL_CY = 860;
/** anchor → face-slot centre of a wall carton at wall zoom s */
const slotDy = (s: number) => 152 * WALL.cs * s;
const SC0 = HERO[1] * WALL.ch - (HERO_PARK[1] - WALL_CY) / 0.95;
const freeY = (t: number) => SC0 + WALL_V * (t - BI_T0);
const heroSlotY = (t: number, sy: number) => WALL_CY + (HERO[1] * WALL.ch - sy) * wallS(t) - slotDy(wallS(t));
/** NoneHome: her face slot glides to LONE_CARTON, critically damped from the scroll's speed at the cut (no jolt, no reversal) */
const NH_GLIDE = (() => {
	const y0 = heroSlotY(NH_T0, freeY(NH_T0));
	const e = 0.005;
	const v = (y0 - heroSlotY(NH_T0 - e, freeY(NH_T0 - e))) / e;
	const w = 3;
	const A = y0 - LONE_CARTON[1];
	return {A, B: v + w * A, w};
})();
const wallScroll = (t: number): [number, number] => {
	if (t < NH_T0) return [0, freeY(t)];
	const s = wallS(t);
	const tau = t - NH_T0;
	const yc = LONE_CARTON[1] + (NH_GLIDE.A + NH_GLIDE.B * tau) * Math.exp(-NH_GLIDE.w * tau) * (1 - eIO(t, 36.45, LOOP_T0));
	return [(HERO[0] * WALL.cw * s - (LONE_CARTON[0] - WALL_CX)) / s, HERO[1] * WALL.ch - (yc + slotDy(s) - WALL_CY) / s];
};
/** rows go grey in three blocks, one per word («Almost», «none», «brought»), each with a soft lights-off dip */
const DIM_STEPS = [W(119), W(120), W(121)];
const wallGrey = (t: number) => DIM_STEPS.reduce((g, ts, i) => g + (1 / 3) * eO(t, ts - 0.02, ts + 0.16) * (i === 2 ? 1.06 : 1), 0);
const WallShot: React.FC<{t: number}> = ({t}) => {
	const s = wallS(t);
	const sc = wallScroll(t);
	const grey = wallGrey(t);
	const glow = eO(t, NH_KID - 0.06, NH_KID + 0.3) * (0.82 + 0.18 * Math.sin(t * 5));
	const cell = {x: WALL_CX + (HERO[0] * WALL.cw - sc[0]) * s, y: WALL_CY + (HERO[1] * WALL.ch - sc[1]) * s, s: WALL.cs * s};
	const seed = HERO[0] * 31 + HERO[1] * 17 + 5;
	const hue = Math.floor(h1(HERO[0] * 3.7 + HERO[1] * 1.3) * 4);
	const dip = DIM_STEPS.reduce((a, ts) => a + 0.12 * bump(t, ts + 0.05, 0.22), 0);
	const keepK = kick(t, [NH_KID], 0.05);
	return (
		<AbsoluteFill style={{filter: `brightness(${(1 - 0.18 * grey - dip).toFixed(3)})`}}>
			<CartonWall t={t} s={s} scroll={sc} cx={WALL_CX} cy={WALL_CY} grey={grey} keep={HERO} keepGlow={glow} />
			{/* her carton drawn again on top with her face (the wall's own cell shows a generic kid): the frame-0 portrait (bangs, clip)
			    under MISSING — what DadPut's carton grew into and what the watch hand lifts in Loop */}
			<Layer>
				<g transform={`translate(${f2(cell.x)} ${f2(cell.y - slotDy(s))}) scale(${(1 + keepK).toFixed(4)}) translate(0 ${f2(slotDy(s))})`}>
					<CartonG x={0} y={0} s={cell.s} side={0} hue={hue} header="missing" face={herFace(BC_SLOT.w, BC_SLOT.h, false)} glow={glow} seed={seed} lw={6} />
				</g>
			</Layer>
		</AbsoluteFill>
	);
};
/** one word of the big card: lands with an overshoot (stamp), straight, white or orange, ink outline */
const CardWord: React.FC<{t: number; at: number; text: string; color: string; size: number; x: number; y: number; from?: number}> = ({t, at, text, color, size, x, y, from = 1.7}) => {
	if (t < at - 0.02) return null;
	const k = popOv(clamp01((t - at + 0.02) / 0.2));
	return (
		<div style={{position: 'absolute', left: x - 420, width: 840, top: y, transform: `translateY(-50%) scale(${lerp(from, 1, k).toFixed(4)})`, opacity: clamp01(k * 3), textAlign: 'center', whiteSpace: 'nowrap', fontFamily: HEAD, fontSize: size, lineHeight: 1, letterSpacing: 1, color, WebkitTextStroke: `12px ${INK}`, paintOrder: 'stroke fill', filter: `drop-shadow(0 8px 0 ${INK})`}}>
			{text}
		</div>
	);
};
/** a line of words that land one by one (space reserved, so nothing shifts), white, ink outline */
const CardLine: React.FC<{t: number; x: number; y: number; size: number; words: [string, number][]}> = ({t, x, y, size, words}) => (
	<div style={{position: 'absolute', left: x - 420, width: 840, top: y, transform: 'translateY(-50%)', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: HEAD, fontSize: size, lineHeight: 1, letterSpacing: 1, color: '#fff'}}>
		{words.map(([w, at], i) => {
			const k = popOv(clamp01((t - at + 0.02) / 0.2));
			return (
				<span key={i} style={{display: 'inline-block', marginLeft: i ? size * 0.32 : 0, opacity: t < at - 0.02 ? 0 : clamp01(k * 3), transform: `scale(${lerp(1.5, 1, k).toFixed(4)})`, WebkitTextStroke: `12px ${INK}`, paintOrder: 'stroke fill', filter: `drop-shadow(0 8px 0 ${INK})`}}>
					{w}
				</span>
			);
		})}
	</div>
);
const BigCard: React.FC<{t: number}> = ({t}) => {
	const lift = eIO(t, NH_T0 - 0.02, NH_T0 + 0.24);
	if (lift >= 0.999 || t < BI_STAMP - 0.04) return null;
	const panelK = eO(t, BI_STAMP - 0.04, BI_STAMP + 0.08);
	const cx = 466;
	return (
		<AbsoluteFill style={{transform: `translateY(${(-lift * 420).toFixed(1)}px) scale(${lerp(1, 0.92, lift).toFixed(3)})`, opacity: 1 - lift, transformOrigin: `${cx}px 640px`}}>
			<div style={{position: 'absolute', left: cx - 400, top: 452, width: 800, height: 352, borderRadius: 40, background: 'rgba(8,14,26,0.82)', boxShadow: `0 0 0 7px ${INK}, 0 18px 40px rgba(0,0,0,0.45)`, opacity: panelK, transform: `scale(${lerp(0.85, 1, panelK).toFixed(3)})`}} />
			<CardWord t={t} at={BI_STAMP} text="BILLIONS" color={PAL.orange} size={146} x={cx} y={586} from={1.9} />
			<CardLine t={t} y={722} x={cx} size={86} words={[['OF', W(117) - 0.02], ['CARTONS', W(118) - 0.02]]} />
		</AbsoluteFill>
	);
};
export const Billions: React.FC<SceneProps> = () => {
	const t = useT();
	return (
		<Shk t={t} hits={[BI_STAMP]} amp={10} tremor={1.0}>
			<Zoom k={1 + kick(t, [BI_STAMP], 0.05)} ox={466} oy={640}>
				<WallShot t={t} />
			</Zoom>
			<BigCard t={t} />
		</Shk>
	);
};
export const NoneHome: React.FC<SceneProps> = () => {
	const t = useT();
	return (
		<Shk t={t} hits={[]} tremor={1.0}>
			<WallShot t={t} />
			<BigCard t={t} />
		</Shk>
	);
};

// ======================================================================= 23 · LOOP «Except…»
// the fade lands on the store fridge (blank face slots, like frame 0's) with her carton standing exactly where the wall's coloured
// carton was (face slot on LONE_CARTON, same size, the same frame-0 face); the watch hand (drawn big, LP_HS, so the hand and the
// gold watch read on the wide shot) reaches in, takes it and lifts it down to where frame 0's swing STARTS while the camera drops into
// the frame-0 framing and her face rises in; then the scene hands over to the Hook's own set (scenes_1 HookArt) on the pre-roll clock
// hookPre(t − DURATION): the swing reaches the frame-0 pose BEFORE Short.tsx dissolves FirstFrame over the last loop_s, so the
// dissolve runs over matching pictures (no double carton / watch) and the last frame is frame 0 (A1 approach).
const LP_GRAB = 37.3;
const LP_HAND = 37.52; // = DURATION − 0.45: the Hook's carton swing starts from rest here (hookCarton, tr ≤ −0.45)
const LP_X0 = 37.47;
const LP_X1 = 37.56;
/** the watch hand's size in carton units on the wide shot (kit A default 1.35 = frame 0): bigger so the hand + watch read; it eases
 *  back to 1.35 while the carton is lifted into the frame-0 framing */
const LP_HS = 2.1;
/** the Hook's pre-roll clock for the hand-over: from rest (tr = −0.45, hookCarton's swing start) the swing runs on and settles into
 *  the frame-0 pose by tr = −0.13 (tm = −0.45·(1 − u)^4, u over LP_PRE s): wherever Short.tsx's FirstFrame dissolve (the last loop_s =
 *  0.35 s) has ≥ 15 % weight the two pictures differ by ≤ 2 px, so there is no double carton / watch; peak speed ≈ 900 px/s (the
 *  Hook's own swing passes frame 0 at ≈ 770 px/s) */
const LP_PRE = 0.32;
const hookPre = (tr: number) => (tr <= -0.45 ? tr : -0.45 * Math.pow(1 - clamp01((tr + 0.45) / LP_PRE), 4));
// frame-0 set geometry, the same maths as scenes_1 «THE STORE SET» (kept in sync by hand: BX 250, BS 1.4, faceO, hookCarton start)
const H_CEYE = cartonEyes('front');
const H_CEY = (H_CEYE[0][1] + H_CEYE[1][1]) / 2;
const H_CS = (EYE_Y - CARTON0[1]) / (H_CEY - -484);
const H_CX = CARTON0[0];
const H_CY = EYE_Y - H_CEY * H_CS;
const H_BS = 1.4;
const H_BX = 250;
const hTurn = (t: number) => lerp(0.04, 0.45, easeInOut(clamp01((t + 0.3) / 0.75)));
const hLean = (t: number) => easeInOut(clamp01((t + 0.25) / 0.9));
const hTilt = (t: number) => lerp(-3, 4, hLean(t)) + Math.sin(t * 1.7) * 0.8;
const faceO = (t: number) => ({lean: hLean(t), turn: hTurn(t), tilt: hTilt(t), t});
const H_BY = (() => {
	const o = faceO(0.45);
	return EYE_Y - ((girlFacePt(FACE.eyes[0], o)[1] + girlFacePt(FACE.eyes[1], o)[1]) / 2) * H_BS;
})();
/** the Hook's carton on its own clock tm ≤ 0.45 (scenes_1 hookCarton before the landing wobble, kept in sync by hand): the swing
 *  from rest (tm ≤ −0.45) to its mark, and his grip angle (GRIP_ROT0 4 → GRIP_ROT 18) settling ahead of the swing */
const hookPose = (tm: number) => {
	const e = easeInOut(clamp01((tm + 0.45) / 0.9));
	return {
		x: lerp(H_CX + 115, H_CX, e) + Math.sin(tm * 2.1) * 2.5,
		y: lerp(H_CY + 215, H_CY, e) + Math.sin(tm * 2.6 + 1) * 2.5,
		rot: lerp(14, 0, e) + Math.sin(tm * 1.9) * 0.5,
		grip: lerp(4, 18, easeOut(clamp01((tm + 0.45) / 0.6))),
	};
};
const MAN_GRIP = {kind: 'man' as HandKind, side: 1 as const, at: 0.16, rot: 4};
/** her shirt running on below kit A GirlBust's crop edge (bust units, y 0 → EXT) — the same extension scenes_1 draws under every
 *  frame-0 bust (its Bust / TorsoExtG, kept in sync by hand), so her torso leaves the frame at the bottom here too and matches
 *  HookArt through the hand-over cross-fade (without it the kit bust ends in a floating inked edge) */
const TORSO_EXT = 1100;
const TorsoExt: React.FC<{x: number; y: number; s: number; t: number; turn: number; lean: number}> = ({x, y, s, t, turn, lean}) => {
	const lw = lwFor(s);
	const dx = turn * 10 * clamp01(lean);
	const dy = Math.sin(t * 2.3) * 2.5;
	const y0 = -lw * 1.3;
	return (
		<Layer>
			<g transform={`translate(${f2(x)} ${f2(y)}) scale(${s.toFixed(4)}) translate(${f2(dx)} ${f2(dy)})`}>
				<rect x={-238} y={y0} width={476} height={TORSO_EXT - y0} fill={MILK.shirt} />
				{Array.from({length: Math.ceil(TORSO_EXT / 58)}, (_, i) => (
					<rect key={i} x={-238} y={i * 58} width={476} height={24} fill={MILK.stripe} />
				))}
				<path d={`M-214,${y0.toFixed(1)} L-215,${TORSO_EXT} M214,${y0.toFixed(1)} L215,${TORSO_EXT}`} stroke={MILK.shirtD} strokeWidth={lw * 1.2} fill="none" />
				<path d={`M-238,-24 L-238,${TORSO_EXT} M238,-24 L238,${TORSO_EXT}`} stroke={INK} strokeWidth={lw * 1.1} fill="none" />
			</g>
		</Layer>
	);
};
/** kit A carton height (808 units) matched to the wall carton (366 units × WALL.cs × s) */
const heroA = (sWall: number) => (366 * WALL.cs * sWall) / 808;
/** kit A photo centre above the carton's bottom (units) */
const A_PHOTO = 248;
export const Loop: React.FC<SceneProps> = () => {
	const t = useT();
	const tr = t - DURATION;
	const sW = wallS(Math.min(t, LOOP_T0 + 0.5));
	const sA0 = heroA(sW);
	const park: P2 = [LONE_CARTON[0], LONE_CARTON[1] + A_PHOTO * sA0];
	// the fridge: shelf under her carton → the frame-0 store background (zoom 1.9 at (560, 880), blur 4.5, dim 0.1)
	const fz0: View = {S: (WALL.cs * sW) / 0.78, fx: 540, fy: 948, px: park[0], py: park[1]};
	const fz1: View = {S: 1.9, fx: 560, fy: 880, px: 563, py: 880};
	const drop = eIO(t, LP_GRAB - 0.04, LP_HAND);
	const fv = viewL(fz0, fz1, drop);
	// her carton: parked on the shelf → lifted by the watch hand to the Hook's swing start
	// (on the same pre-roll clock as the HookArt hand-over below, so the 37.47–37.56 cross-fade runs over one pose: no double sleeve)
	const hs0 = hookPose(hookPre(tr));
	const lift = eIO(t, LP_GRAB, LP_HAND);
	const cx = lerp(park[0], hs0.x, lift) + Math.sin(Math.PI * lift) * 70;
	const cy = lerp(park[1], hs0.y, lift) - Math.sin(Math.PI * lift) * 90;
	const cs = lerp(sA0, H_CS, easeOut(lift));
	const crot = lerp(0, hs0.rot, lift);
	// the watch hand: in from the lower right, palm onto the carton's right edge (kit A grip: at 0.16, rot 4), drawn big (LP_HS) on
	// the wide shot; the watch glints as it closes on the carton; after the grab kit A's own carton hand takes over at the same size
	const reach = eO(t, 37.0, LP_GRAB);
	const hsc = LP_HS * sA0;
	const wristAt = gripWrist('man', [park[0] + 196 * sA0, park[1] - 0.16 * 640 * sA0], MAN_GRIP.rot, hsc, true);
	const wrist: P2 = [wristAt[0] + (1 - reach) * 560, wristAt[1] + (1 - reach) * 300];
	const glint = bump(t, LP_GRAB - 0.02, 0.34);
	const handS = lerp(LP_HS, 1.35, eIO(t, LP_GRAB, LP_HAND));
	// her face rises into the frame-0 spot as the camera drops
	const rise = eO(t, LP_GRAB + 0.07, LP_HAND);
	const o = faceO(tr);
	const hook = ramp(t, LP_X0, LP_X1);
	return (
		<AbsoluteFill>
			{hook < 1 ? (
				<Shk t={t} hits={[]} tremor={0.8}>
					<InView v={fv} blur={4.5 * drop}>
						<DairyFridge t={tr} door={1} mist={0.8} dim={0.1 * drop} gaps={[[1, 2]]} />
					</InView>
					{rise > 0.001 ? (
							<>
								<GirlBust x={H_BX} y={H_BY + (1 - rise) * 1000} s={H_BS} t={tr} expr="wonder" lean={o.lean} turn={o.turn} tilt={o.tilt} wide={0} look={[lerp(0.55, 0.8, o.lean), 0.05]} blink={false} seed={1} />
								<TorsoExt x={H_BX} y={H_BY + (1 - rise) * 1000} s={H_BS} t={tr} turn={o.turn} lean={o.lean} />
							</>
						) : null}
					{t < LP_GRAB ? (
						<>
							<MilkCarton x={park[0]} y={park[1]} s={sA0} t={t} />
							{reach > 0.01 ? <Hand x={wrist[0]} y={wrist[1]} s={hsc} rot={MAN_GRIP.rot} flip kind="man" gesture="open" to="grab" k={ramp(t, LP_GRAB - 0.08, LP_GRAB)} arm={900} t={t} glint={glint} /> : null}
						</>
					) : (
						<MilkCarton x={cx} y={cy} s={cs} rot={crot} t={t} hand={{...MAN_GRIP, rot: lerp(MAN_GRIP.rot, hs0.grip, lift), scale: handS, glint}} />
					)}
				</Shk>
			) : null}
			{hook > 0 ? (
				<AbsoluteFill style={{opacity: hook}}>
					<HookArt t={hookPre(tr)} />
				</AbsoluteFill>
			) : null}
		</AbsoluteFill>
	);
};
