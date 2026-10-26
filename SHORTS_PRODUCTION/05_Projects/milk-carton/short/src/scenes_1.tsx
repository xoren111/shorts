import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {SceneProps} from './engine/transitions';
import {W, We} from './lib/time';
import {CARTON0, EYE_Y} from './data/beats';
import {INK, clamp01, easeInOut, easeOut, h1, lerp, useT} from './ui/gfx';
import {shake} from './ui/vox';
import {SKIN} from './ui/draw';
import {PAL} from './theme';
import {
	cartonEyes,
	FACE,
	GirlBust,
	girlFacePt,
	HandG,
	handGrip,
	handScale,
	lwFor,
	MILK,
	MilkCarton,
	placePt,
	rotP,
	Sparkle,
	Toddler,
	wobble,
} from './ui/milk_a';
import type {GirlExpr, HandKind} from './ui/milk_a';
import {DairyFridge, JacketChair, PaperBackdrop, VaporStream} from './ui/milk_b';
import {ManCartonGripG, PointHandG, pointHandTip, pointHandWrist} from './ui/milk_hands';

// milk-carton — PART 1 scenes (words 0–39, 0 – 12.66 s). Source of truth: ../SCRIPT.md «Покадровый план» rows 1–8, ../FACTS.md
// «Постановка в кадре» / «НЕ ГОВОРИТЬ», timings: src/data/beats.ts + src/data/events.ts (anchor words). Reference code + style: A1
// 05_Projects/hay-castle/short/src (camera / kick / bump helpers). Everything is drawn in code from kits src/ui/milk_a.tsx (people,
// hands, carton) and src/ui/milk_b.tsx (fridge, paper backdrop, jacket on a chair, mist); the few extras (comic flash bursts,
// confetti, ink impact lines, the girl's pointing arm, his hand on the carton, his low coat silhouette and «hush» profile,
// the adult hands of the Mom shot) are drawn here; the pointing hands themselves (hers, and his whole carton grip — palm, thumb,
// the fingers behind the carton, his index out of the grip) are src/ui/milk_hands.tsx (owner 26.10: the old tube fingers read as a
// wooden puppet, the kit grip's thumb as a sausage and its back fingers as slabs with a square tip).
//
// Rules kept in every shot: adults are hands / shapes only (watch cuff = stepdad, bangles = mom, empty checked jacket = dad), no
// adult face; the girl is the generic kit girl (bob, bangs, red bow clip); in 0–10 s the only text on screen is MISSING / CHILD on
// the carton (name and date are squiggles); key action inside x 48–887, y 288–1100 (the caption band y 1180–1300 is the
// subtitles'); every shot moves (camera + people + particles), kicks on the hits.
//
// | beat     | t0–t1 s      | what is on screen (events.ts)                                                                       |
// |----------|--------------|-----------------------------------------------------------------------------------------------------|
// | Hook     | 0.00–2.53    | THE STORE SET (shared with Famous / IsThatMe): blurred dairy fridge, the girl ECU, the stepdad's    |
// |          |              | watch hand swinging the carton up beside her cheek — frame 0 is mid-swing (she turns + leans in,    |
// |          |              | eyes widen). 0.45 printed eyes meet hers on EYE_Y (kick + shake, no freeze) · 1.00 her finger jabs   |
// |          |              | her cheek · 1.50 … the printed cheek (diagonal, from the lower left) · 2.0–2.4 the finger slides up  |
// |          |              | to the printed hair, camera pushes to the header (CARTON0) for the zoom-through. Her pointing hand  |
// |          |              | is milk_hands PointHandG (one silhouette: index, 3 knuckle rolls, thumb across; never upright),      |
// |          |              | grown out of her forearm; his watch in the safe zone                                                |
// | Missing  | 2.53–4.86    | macro of the header (carton ×2.4, header on CARTON0 at the cut): her fingertip lands on the M,       |
// |          |              | drags right from «word», the letters melt into squiggles (all squirm harder under «can't read»);     |
// |          |              | 4.19 «MISSING» SNAP: crisp red letters, ink impact lines, kick, her hand jerks out of frame; her     |
// |          |              | face slides in from the left edge by «read» 3.71 (head + shoulders, the torso runs out of frame) and |
// |          |              | her lips sound it out; the camera eases back and up by 3.05 s so the photo ends above the caption band|
// | ManCan   | 4.86–6.25    | low angle from her height: starts ON the watch, tilts up past the carton to his backlit coat         |
// |          |              | silhouette (no face, one hanging arm: the other one holds the carton); 5.12–5.78 the MISSING        |
// |          |              | letters light up L→R as he reads; «can.» his shadow                                                 |
// |          |              | slides over her (head + shoulders, bottom-left), her eyes go wide and worried, looking up at him    |
// | Famous   | 6.25–8.30    | whip back to the store set: the index of his watch hand leaves the grip (the other fingers hold the |
// |          |              | carton) and taps her printed right cheek on «you're» and «famous!», each tap pops a comic flash-bulb|
// |          |              | burst (+ white flash), the finger curls back into the grip on «says»; 7.43 her                      |
// |          |              | eyes go wide, the bursts hang                                                                       |
// | IsThatMe | 8.30–9.08    | HARD cut + the camera's own zoom punch on the set: she jabs her chest → the printed face on «that» → |
// |          |              | her chest on «me?», lips                                                                            |
// |          |              | move; a sparkle flicks on both red clips at once                                                    |
// | Hush     | 9.08–9.88    | the fridge door: his PROFILE shadow (brow, big nose, lips, chin; multiply) shoots the index finger up|
// |          |              | in front of its lips on «Hush» (light between finger and chin), no contact with her (bottom-left,   |
// |          |              | worried); the bursts fall as confetti at the frame sides,                                          |
// |          |              | clear of the lips and finger; the store dims a notch                                                |
// | TakeHer  | 9.88–11.28   | desaturated flashback on a paper backdrop: the empty checked jacket on a chair; on «take» the watch |
// |          |              | hand (from above) walks the toddler gently out of frame right; the jacket stays alone (push-in)     |
// | Mom      | 11.28–12.66  | wider: the toddler walks between hands held at her shoulder height, the adult forearms come in      |
// |          |              | diagonally from the upper corners — the bangle hand comes in and takes her other hand, tender, no   |
// |          |              | hurry; the bangle glints on «MOM» (12.14); the three walk ≈ 350 px toward the right edge            |

// ======================================================================= helpers (A1 style)
type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const lerpP = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const addP = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];
/** 0..1 progress of t through [a, b] */
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
/** a small bump 0→1→0 centred on c, width d */
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
const easeOutBack = (x: number) => {
	const c1 = 1.9;
	const k = clamp01(x) - 1;
	return 1 + (c1 + 1) * k * k * k + c1 * k * k;
};
const easeIn2 = (x: number) => clamp01(x) * clamp01(x);

/** 2D camera: world point F lands on screen point C, zoom S, roll R (deg) */
type Cam = {S: number; F: P2; C: P2; R?: number};
const camPt = (c: Cam, p: P2): P2 => {
	const q = rotP([(p[0] - c.F[0]) * c.S, (p[1] - c.F[1]) * c.S], c.R ?? 0);
	return [c.C[0] + q[0], c.C[1] + q[1]];
};
const CamLayer: React.FC<{cam: Cam; children: React.ReactNode; style?: React.CSSProperties}> = ({cam, children, style}) => (
	<AbsoluteFill
		style={{
			transform: `translate(${cam.C[0].toFixed(2)}px, ${cam.C[1].toFixed(2)}px) rotate(${(cam.R ?? 0).toFixed(3)}deg) scale(${cam.S.toFixed(5)}) translate(${(-cam.F[0]).toFixed(2)}px, ${(-cam.F[1]).toFixed(2)}px)`,
			transformOrigin: '0 0',
			...style,
		}}
	>
		{children}
	</AbsoluteFill>
);
/** camera shake + handheld tremor, slightly scaled so the edges never show (A1 Shk) */
const Shk: React.FC<{t: number; hits: number[]; amp?: number; tremor?: number; sc?: number; children: React.ReactNode}> = ({t, hits, amp = 8, tremor = 1, sc = 1.03, children}) => {
	const s = shake(t, hits, amp, tremor);
	return <AbsoluteFill style={{transform: `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) rotate(${s.r.toFixed(3)}deg) scale(${sc})`}}>{children}</AbsoluteFill>;
};
/** a group in its own units, anchor (0,0) at (x, y) px, s px per unit (same placement as the kits' pieces) */
const Fig: React.FC<{x: number; y: number; s: number; rot?: number; flip?: boolean; opacity?: number; children: React.ReactNode}> = ({x, y, s, rot = 0, flip, opacity, children}) => (
	<svg
		width={2000 * s}
		height={2000 * s}
		viewBox="-1000 -1000 2000 2000"
		style={{position: 'absolute', left: x - 1000 * s, top: y - 1000 * s, overflow: 'visible', pointerEvents: 'none', opacity}}
	>
		<g transform={`rotate(${rot.toFixed(2)}) scale(${flip ? -1 : 1} 1)`}>{children}</g>
	</svg>
);
/** a frame-sized svg (world px) */
const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...style}}>
		{children}
	</svg>
);
const Flash: React.FC<{a: number; dur?: number; max?: number; color?: string}> = ({a, dur = 0.12, max = 0.5, color = '#fff'}) =>
	a < 0 || a > dur ? null : <AbsoluteFill style={{background: color, opacity: max * (1 - a / dur), pointerEvents: 'none'}} />;
const Vignette: React.FC<{k?: number}> = ({k = 0.5}) => (
	<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 48%, rgba(20,14,8,${k.toFixed(3)}) 100%)`, pointerEvents: 'none'}} />
);
/** outlined tubes (arm segments): ink first, then the colours → joints without seams (as the kit's) */
const Tubes: React.FC<{segs: {pts: P2[]; w: number; c: string}[]; lw: number}> = ({segs, lw}) => (
	<g strokeLinecap="round" strokeLinejoin="round" fill="none">
		{segs.map((s, i) => (
			<polyline key={`i${i}`} points={s.pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} stroke={INK} strokeWidth={s.w + lw * 2} />
		))}
		{segs.map((s, i) => (
			<polyline key={`c${i}`} points={s.pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} stroke={s.c} strokeWidth={s.w} />
		))}
	</g>
);

// ======================================================================= THE STORE SET (Hook · Famous · IsThatMe)
// World = frame px of the frame-0 framing. Layout contract (data/beats.ts): her eyes on EYE_Y at 0.45 s; the MISSING header of the
// hero carton on CARTON0. The carton scale follows from both: the header and the printed eyes sit HEADER_Y / CEY carton units
// above the carton's bottom, so CS = (EYE_Y − CARTON0.y) / (CEY − HEADER_Y) ≈ 0.885 (a big half-gallon right beside her cheek).
/** centre of the MISSING letters, carton units (notice centre −300 + letter centre −184 in notice units, kit A NoticeG) */
const HEADER_Y = -484;
const CEYE = cartonEyes('front');
const CEX = (CEYE[0][0] + CEYE[1][0]) / 2;
const CEY = (CEYE[0][1] + CEYE[1][1]) / 2;
const CS = (EYE_Y - CARTON0[1]) / (CEY - HEADER_Y);
const CX = CARTON0[0];
const CY = EYE_Y - CEY * CS;
/** the girl's bust: scale, x; y (BY) is solved below so her eyes sit on EYE_Y at the 0.45 s match */
const BS = 1.4;
const BX = 250;
/** the stepdad's hand on the carton: right edge, below the photo, forearm down out of frame. Drawn here (CartonHandG), not by kit A
 *  MilkCarton's own `hand` (same placement: kit gripXf on the right edge), so on «famous» his index can leave the grip and tap the photo
 *  in FRONT of the carton while the other fingers keep holding it (a second, bare hand from the right edge read as a tangle of
 *  fingers). The swing STARTS in kit A's carton grip (GRIP0: at 0.16, rot 4, scale 1.35): scenes_3 Loop lifts the carton with it
 *  and cross-fades into HookArt at t ≈ −0.5 … −0.26 s, so nothing differs before −0.26; then, while the carton swings in, the grip
 *  slides up the edge, the forearm tilts in under the carton and the hand reads a notch smaller (GRIP1), which keeps the gold
 *  watch — his identifier — inside the safe zone (left of x 887, above y 1100) from frame 0 on (it sat at x ≈ 860–910,
 *  y ≈ 1170–1260, in the caption band beside the Shorts button rail). The sleeve now crosses her shirt below y ≈ 1350. */
type Grip = {at: number; rot: number; hs: number};
const GRIP0: Grip = {at: 0.16, rot: 4, hs: 1.35};
const GRIP1: Grip = {at: 0.28, rot: 28, hs: 1.24};
/** the grip on the hook clock: rot follows the old settle curve (4 → 16 from −0.45 s, = the Loop's replica) plus the extra tilt,
 *  at / hs move only after −0.26 s (after the Loop cross-fade) and are nearly done on frame 0 */
const hookGrip = (t: number): Grip => {
	const late = easeInOut(seg(t, -0.26, 0.05));
	return {
		at: lerp(GRIP0.at, GRIP1.at, late),
		rot: lerp(GRIP0.rot, 16, easeOut(clamp01((t + 0.45) / 0.6))) + (GRIP1.rot - 16) * late,
		hs: lerp(GRIP0.hs, GRIP1.hs, late),
	};
};
/** his index finger out of the grip (Famous): k 0 → 1 = it swings out of the fist and over the front face; aim = carton units;
 *  touch 0..1 = hovering just off the photo (foreshortened) → pad on the photo; tap = press squash */
type IdxSt = {k: number; aim: P2; touch: number; tap: number};
/** his hand on the carton's right edge, in carton units (place it with the carton's own x / y / s / rot): milk_hands
 *  ManCartonGripG — part 'back' (before the carton) = the four fingers wrapping round the edge behind it (ManGripBackG: smooth
 *  round-tipped fingers, owner 26.10: kit A's back fingers read as angular slabs with a dark square tip), part 'front' (after the
 *  carton) = kit A's sleeve, cuff and watch, the profile palm, a short thumb with a nail and (Famous) the index out in front
 *  (ManGripPointG). The same hand in every shot (Hook, ManCan, Famous, IsThatMe): no style change at the cuts. */
const CartonHandG: React.FC<{g: Grip; part: 'back' | 'front'; t: number; glint: number; idx?: IdxSt | null; arm?: number; lw: number}> = ({g, part, t, glint, idx, arm = 1700, lw}) => (
	<ManCartonGripG part={part} at={g.at} rot={g.rot} scale={g.hs} arm={arm} t={t} glint={glint} idx={idx} lw={lw} />
);

/** kit A GirlBust ends at y 0 (bust units) in an inked horizontal edge — in every close-up of ours that edge would float in the
 *  frame like a sticker. Bust = the same GirlBust + its shirt running on EXT units below the crop (same stripes, side shading,
 *  ink sides, same breath / lean offset as the kit's torso group), so the torso always leaves the frame at the bottom edge. */
const EXT = 1100;
const TorsoExtG: React.FC<{t: number; turn?: number; lean?: number; lw: number}> = ({t, turn = 0, lean = 0, lw}) => {
	const dx = turn * 10 * clamp01(lean);
	const dy = Math.sin(t * 2.3) * 2.5;
	const y0 = -lw * 1.3;
	return (
		<g transform={`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`}>
			<rect x={-238} y={y0} width={476} height={EXT - y0} fill={MILK.shirt} />
			{Array.from({length: Math.ceil(EXT / 58)}, (_, i) => (
				<rect key={i} x={-238} y={i * 58} width={476} height={24} fill={MILK.stripe} />
			))}
			<path d={`M-214,${y0.toFixed(1)} L-215,${EXT} M214,${y0.toFixed(1)} L215,${EXT}`} stroke={MILK.shirtD} strokeWidth={lw * 1.2} fill="none" />
			<path d={`M-238,-24 L-238,${EXT} M238,-24 L238,${EXT}`} stroke={INK} strokeWidth={lw * 1.1} fill="none" />
		</g>
	);
};
type BustP = React.ComponentProps<typeof GirlBust>;
const Bust: React.FC<BustP> = (p) => {
	const s = p.s ?? 1;
	return (
		<>
			<GirlBust {...p} />
			<Fig x={p.x} y={p.y} s={s}>
				<TorsoExtG t={p.t ?? 0} turn={p.turn} lean={p.lean} lw={p.lw ?? lwFor(s)} />
			</Fig>
		</>
	);
};

// --- her head in frame 0: already turning toward the carton and leaning in at 0.0 s (G3), arrives at 0.45 s
const hTurn = (t: number) => lerp(0.04, 0.45, easeInOut(clamp01((t + 0.3) / 0.75)));
const hLean = (t: number) => easeInOut(clamp01((t + 0.25) / 0.9));
const hTilt = (t: number) => lerp(-3, 4, hLean(t)) + Math.sin(t * 1.7) * 0.8;
type FaceO = {lean: number; turn: number; tilt: number; t: number};
const faceO = (t: number): FaceO => ({lean: hLean(t), turn: hTurn(t), tilt: hTilt(t), t});
const eyeBustY = (o: FaceO) => (girlFacePt(FACE.eyes[0], o)[1] + girlFacePt(FACE.eyes[1], o)[1]) / 2;
const BY = EYE_Y - eyeBustY(faceO(0.45)) * BS;
/** frame px → her bust units */
const toBust = (p: P2): P2 => [(p[0] - BX) / BS, (p[1] - BY) / BS];

// --- the hero carton: mid-swing at 0.0 s (rotated, lower right), lands on its mark at 0.45 s, then settles and bobs (no freeze)
type CartonSt = {x: number; y: number; rot: number; spark?: number; glint?: number; grip: Grip; idx?: IdxSt | null};
const hookCarton = (t: number): CartonSt => {
	const e0 = easeInOut(clamp01((t + 0.45) / 0.9));
	const a = t - 0.45;
	const w = a > 0 ? wobble(a, 13, 4) : 0;
	// x lands sooner (0.25 s) than y / rot (0.45 s, the eye match); the start pose at t ≤ −0.45 (scenes_3 Loop hand-over) is
	// unchanged and starts from rest. After the Loop cross-fade (t > −0.26) the swing catches up (g), so on frame 0 the carton is
	// ≈ 45 px from its mark (was 107) and the watch is already above the caption band; the last stretch still lands on 0.45
	const ex0 = easeInOut(clamp01((t + 0.45) / 0.7));
	const g = 0.7 * easeInOut(seg(t, -0.26, 0.12));
	const e = e0 + (1 - e0) * g;
	const ex = ex0 + (1 - ex0) * g;
	return {
		x: lerp(CX + 115, CX, ex) + Math.sin(t * 2.1) * 2.5,
		y: lerp(CY + 215, CY, e) - w * 10 + Math.sin(t * 2.6 + 1) * 2.5,
		rot: lerp(14, 0, e) + w * 2.6 + Math.sin(t * 1.9) * 0.5,
		glint: bump(t, 0.55, 0.4),
		grip: hookGrip(t),
	};
};
/** the carton resting in his hand (Famous, IsThatMe): the same mark with a breathing bob */
const restCarton = (t: number): CartonSt => ({x: CX + Math.sin(t * 2.1) * 3, y: CY + Math.sin(t * 2.6 + 1) * 3, rot: Math.sin(t * 1.9) * 0.7, grip: GRIP1});
/** a point of the carton (carton units) on screen for a pose */
const cartonP = (c: CartonSt, p: P2): P2 => placePt(p, {x: c.x, y: c.y, s: CS, rot: c.rot});
/** points of the printed face (carton units): her printed left cheek (the side nearer her real face — she touches it from the
 *  lower left), her printed hair (the finger slides up to it before the zoom-through), his tap spot (the printed right cheek, the
 *  side his index reaches from the right edge) */
const P_CHEEK_L: P2 = [CEX - 42, CEY + 46];
const P_HAIR: P2 = [CEX - 30, CEY - 66];
const P_CHEEK_R: P2 = [CEX + 72, CEY + 44];

// --- her pointing arm (her left arm, viewer's right), drawn ABOVE the carton (GirlBust's own arm would sit under it). Not the
// kit's free two-bone IK (its 'down' elbow flipped out to the carton and the man's watch, and the wrist rose from under the torso
// through the mist): the shoulder is pinned on the torso's right shoulder seam, the ELBOW STAYS DOWN AT HER SIDE (x ≤ 262 bust
// units = the 236 torso edge + 26 ≈ 36 px out at BS 1.4; y −210…−125 = above the mist line, world y ≤ 1293) and the forearm swings up from it; both bones may foreshorten
// (the arm comes toward the camera) but never stretch. The teal short sleeve sits on the shoulder only; the forearm is drawn over
// the upper arm (folded arm = forearm in front), its round ink cap reads as the elbow.
const HB = 1.1;
type ArmSt = {aim: P2; dir: number; hk: number; tap: number};
// HER POINTING HAND: milk_hands PointHandG 'kid' (owner 26.10: the old one — a tube index with joint segments, three separate
// sticks for the curled fingers, a tube thumb — read as a wooden puppet). One silhouette: palm, a smooth index with a round tip and a
// nail, the middle, ring and little finger curled into three knuckle rolls with creases, the short thumb lying across them; child
// proportions (index ≈ 0.8 of the palm). Mirrored by the pointing direction so the fist always sits UNDER the finger (handSide);
// every point pose is ≥ 28° off upright (the printed face is touched from the lower left, the pad of the finger on the cheek).
// Units: kit A hand units (wrist (0,0), fingers up), kid scale inside PointHandG; KID_TIP = its fingertip.
const KID_TIP = pointHandTip('kid');
/** her forearm: as wide as the hand's wrist where they meet (bust units), a notch wider at the elbow */
const FORE_W1 = pointHandWrist('kid') * HB;
const FORE_W0 = 58;
/** a tapered limb (round ends) from a (width wa) to b (width wb) */
const limbPath = (a: P2, b: P2, wa: number, wb: number) => {
	const an = Math.atan2(b[1] - a[1], b[0] - a[0]);
	const n: P2 = [-Math.sin(an), Math.cos(an)];
	const ra = wa / 2;
	const rb = wb / 2;
	const f = (p: P2) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
	return `M${f(addP(a, n, ra))} L${f(addP(b, n, rb))} A${rb.toFixed(1)},${rb.toFixed(1)} 0 0 0 ${f(addP(b, n, -rb))} L${f(addP(a, n, -ra))} A${ra.toFixed(1)},${ra.toFixed(1)} 0 0 0 ${f(addP(a, n, ra))} Z`;
};
/** −1 (mirrored, pointing left) … 1 (pointing right): squashes through 0 over a few frames while the finger swings past ≈ 100°
 *  (reads as the wrist turning); every held pose is far from that zone */
const handSide = (dir: number) => lerp(-1, 1, easeInOut(clamp01((Math.cos(rad(dir)) + 0.32) / 0.26)));
/** on the kit TORSO shoulder curve (126,−304) → (236,−196) */
const SHOULDER: P2 = [194, -262];
const ELB_X: P2 = [190, 262];
const ELB_Y: P2 = [-210, -125];
const L_UP = 215;
const L_FORE = 205;
/** rest pose of the wrist (hk 0): low at her side, above the mist line (world y ≈ 1300), not under the torso */
const W_REST: P2 = [250, -120];
const clampIn = (x: number, r: P2) => Math.max(r[0], Math.min(r[1], x));
/** b moved toward a so that |a b| ≤ L */
const within = (a: P2, b: P2, L: number): P2 => {
	const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
	return d <= L ? b : [a[0] + ((b[0] - a[0]) * L) / d, a[1] + ((b[1] - a[1]) * L) / d];
};
const elbowFor = (Wp: P2): P2 => {
	let E: P2 = [clampIn(Wp[0] + 40, ELB_X), clampIn(Wp[1] + 170, ELB_Y)];
	E = within(Wp, E, L_FORE);
	E = within(SHOULDER, E, L_UP);
	return [Math.min(E[0], ELB_X[1]), E[1]];
};
const KidArmG: React.FC<ArmSt & {lw: number}> = ({aim, dir, hk, tap, lw}) => {
	const rot = dir + 90;
	const sx = handSide(dir);
	const press = clamp01(tap);
	const T2: P2 = [aim[0] + Math.cos(rad(dir)) * 16 * press, aim[1] + Math.sin(rad(dir)) * 16 * press];
	const off = rotP([KID_TIP[0] * HB * sx, KID_TIP[1] * HB], rot);
	const W1: P2 = [T2[0] - off[0], T2[1] - off[1]];
	const k = easeInOut(clamp01(hk));
	if (k <= 0.001) return null;
	const Wp = lerpP(W_REST, W1, k);
	const r = lerp(-8, rot, k);
	const E = elbowFor(Wp);
	const ua = Math.atan2(E[1] - SHOULDER[1], E[0] - SHOULDER[0]);
	const sl = Math.min(64, Math.hypot(E[0] - SHOULDER[0], E[1] - SHOULDER[1]) * 0.55);
	const sleeveEnd: P2 = [SHOULDER[0] + Math.cos(ua) * sl, SHOULDER[1] + Math.sin(ua) * sl];
	const bandA: P2 = [SHOULDER[0] + Math.cos(ua) * (sl - 16), SHOULDER[1] + Math.sin(ua) * (sl - 16)];
	const fore = limbPath(E, Wp, FORE_W0, FORE_W1);
	const hand = (layer: 'ink' | 'fill' | 'top') => (
		<g transform={`translate(${Wp[0].toFixed(1)} ${Wp[1].toFixed(1)}) rotate(${r.toFixed(2)}) scale(${(HB * sx).toFixed(4)} ${HB})`}>
			<PointHandG kind="kid" layer={layer} tap={press} lw={lw / HB} />
		</g>
	);
	return (
		<g opacity={clamp01(hk / 0.18)}>
			{/* upper arm, then the sleeve over its top, then the forearm in front */}
			<Tubes lw={lw} segs={[{pts: [SHOULDER, E], w: 58, c: SKIN}]} />
			<Tubes lw={lw} segs={[{pts: [SHOULDER, sleeveEnd], w: 100, c: MILK.shirt}]} />
			<line x1={bandA[0]} y1={bandA[1]} x2={sleeveEnd[0]} y2={sleeveEnd[1]} stroke={MILK.stripe} strokeWidth={96} strokeLinecap="butt" opacity={0.9} />
			{/* forearm + hand = one silhouette: both inks, then both skins (the hand grows out of the arm, no seam at the wrist) */}
			<path d={fore} fill={INK} stroke={INK} strokeWidth={lw * 2} strokeLinejoin="round" />
			{hand('ink')}
			<path d={fore} fill={SKIN} />
			{hand('fill')}
			{hand('top')}
		</g>
	);
};

// --- the comic flash-bulb bursts of «Hey, you're famous!» (one per tap), they hang in the air until «Hush.» knocks them down
const BURSTS = [
	{x: 448, y: 372, t: W(21) + 0.03, r: 96, seed: 1},
	{x: 862, y: 452, t: W(22) + 0.03, r: 84, seed: 2},
];
const starPath = (n: number, r0: number, r1: number, seed: number) => {
	let d = '';
	for (let i = 0; i < n * 2; i++) {
		const a = (i / (n * 2)) * Math.PI * 2 + seed;
		const r = (i % 2 ? r1 : r0) * (0.86 + 0.28 * h1(seed * 3.3 + i * 1.7));
		d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
	}
	return d + 'Z';
};
const BurstG: React.FC<{x: number; y: number; r: number; age: number; t: number; seed: number}> = ({x, y, r, age, t, seed}) => {
	if (age < 0) return null;
	const pop = easeOutBack(age / 0.18);
	const hang = age > 0.3 ? 1 + 0.05 * Math.sin(t * 6 + seed) : 1;
	const rot = seed * 23 + age * 22;
	const rays = clamp01(1 - age / 0.32);
	const dx = Math.sin(t * 1.3 + seed) * 6 * clamp01(age - 0.3);
	const dy = -10 * clamp01(age - 0.3) + Math.cos(t * 1.1 + seed) * 4 * clamp01(age - 0.3);
	return (
		<g transform={`translate(${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)})`}>
			{rays > 0
				? Array.from({length: 8}, (_, i) => {
						const a = (i / 8) * Math.PI * 2 + seed * 0.7;
						const r0 = r * (0.9 + 0.9 * (1 - rays));
						const r1 = r0 + r * 0.55 * rays;
						return (
							<line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={INK} strokeWidth={13} strokeLinecap="round" opacity={rays} />
						);
					})
				: null}
			{rays > 0
				? Array.from({length: 8}, (_, i) => {
						const a = (i / 8) * Math.PI * 2 + seed * 0.7;
						const r0 = r * (0.9 + 0.9 * (1 - rays));
						const r1 = r0 + r * 0.55 * rays;
						return <line key={`y${i}`} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke="#FFE45C" strokeWidth={6} strokeLinecap="round" opacity={rays} />;
					})
				: null}
			<g transform={`rotate(${rot.toFixed(1)}) scale(${(pop * hang).toFixed(3)})`}>
				<path d={starPath(9, r, r * 0.56, seed)} fill="#FFE45C" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<path d={starPath(9, r * 0.6, r * 0.34, seed + 1.3)} fill="#FFFDF2" />
				<circle r={r * 0.17} fill={PAL.orange} stroke={INK} strokeWidth={4} />
			</g>
		</g>
	);
};
const Bursts: React.FC<{t: number}> = ({t}) => (
	<Svg>
		{BURSTS.map((b, i) => (
			<BurstG key={i} x={b.x} y={b.y} r={b.r} age={t - b.t} t={t} seed={b.seed} />
		))}
	</Svg>
);

// --- blurred store behind the set (kit B DairyFridge, zoomed), drifting slowly for parallax
const StoreBg: React.FC<{t: number; zoom?: number; ox?: number; oy?: number; dx?: number; dy?: number; dim?: number; blur?: number; desat?: number; door?: number; mist?: number}> = ({
	t,
	zoom = 1.9,
	ox = 560,
	oy = 880,
	dx = 0,
	dy = 0,
	dim = 0.1,
	blur = 4.5,
	desat = 0,
	door = 1,
	mist = 0.8,
}) => (
	<AbsoluteFill style={{transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${zoom.toFixed(4)})`, transformOrigin: `${ox}px ${oy}px`}}>
		<DairyFridge t={t} door={door} mist={mist} dim={dim} blur={blur} desat={desat} />
	</AbsoluteFill>
);
/** cold mist rolling across the bottom of the set (in front of everything) */
const MistFront: React.FC<{t: number; k?: number; y?: number}> = ({t, k = 0.42, y = 1430}) => (
	<Svg>
		<VaporStream t={t} x0={-120} x1={1200} y={y} k={k} n={7} size={150} dur={3.2} dx={160} dy={-50} spread={220} seed={4} flat={0.45} />
	</Svg>
);

type GirlSt = {lean: number; turn: number; tilt: number; wide: number; expr: GirlExpr; look: P2; talk?: number; spark?: number; blink?: boolean};
/** the whole store set in world px; cam frames it; arm = her pointing arm above the carton; front = world-px overlays on top */
const StoreSet: React.FC<{t: number; cam: Cam; g: GirlSt; c: CartonSt; arm?: ArmSt | null; front?: React.ReactNode; bgDim?: number; mist?: number}> = ({t, cam, g, c, arm, front, bgDim = 0.1, mist = 0.42}) => {
	const pk = 1 + (cam.S - 1) * 0.4;
	const drift = camPt(cam, [540, 880]);
	return (
		<AbsoluteFill>
			<StoreBg t={t} zoom={1.9 * pk} dx={(drift[0] - 540) * 0.35 - t * 9} dy={(drift[1] - 880) * 0.35} dim={bgDim} />
			<CamLayer cam={cam}>
				<Bust x={BX} y={BY} s={BS} t={t} expr={g.expr} lean={g.lean} turn={g.turn} tilt={g.tilt} wide={g.wide} look={g.look} talk={g.talk} spark={g.spark} blink={g.blink} seed={1} />
				<Fig x={c.x} y={c.y} s={CS} rot={c.rot}>
					<CartonHandG g={c.grip} part="back" t={t} glint={c.glint ?? 0} lw={lwFor(CS)} />
				</Fig>
				<MilkCarton x={c.x} y={c.y} s={CS} rot={c.rot} t={t} spark={c.spark} />
				<Fig x={c.x} y={c.y} s={CS} rot={c.rot}>
					<CartonHandG g={c.grip} part="front" t={t} glint={c.glint ?? 0} idx={c.idx} lw={lwFor(CS)} />
				</Fig>
				{arm ? (
					<Fig x={BX} y={BY} s={BS}>
						<KidArmG {...arm} lw={lwFor(BS)} />
					</Fig>
				) : null}
				{front}
			</CamLayer>
			<MistFront t={t} k={mist} />
		</AbsoluteFill>
	);
};

// ======================================================================= 1 · HOOK (frame 0 = FirstFrame)
const hookArm = (t: number): ArmSt | null => {
	if (t < 0.6) return null;
	const o = faceO(t);
	const c = hookCarton(t);
	const cheek = girlFacePt([92, 70], o);
	const face = toBust(cartonP(c, P_CHEEK_L));
	const hair = toBust(cartonP(c, P_HAIR));
	const m1 = easeInOut(seg(t, 1.12, 1.4));
	const m2 = easeInOut(seg(t, 2.02, 2.4));
	const aim = lerpP(lerpP(cheek, face, m1), hair, m2);
	// her own cheek: from the lower right (28° off upright, mirrored hand); the printed cheek: from the lower left, 34° off upright,
	// pad on the cheek; then up the photo to the printed hair (30°) as the camera pushes to the header
	const dir = lerp(lerp(-118, -56, m1), -60, m2);
	return {aim, dir, hk: clamp01((t - 0.6) / 0.32), tap: bump(t, 1.0, 0.16) + bump(t, 1.5, 0.16)};
};
const hookCam = (t: number): Cam => {
	// the end push is 0.012 (was 0.07): it zooms about the header, so a bigger push carried the watch out past x 860 (the
	// zoom-through into Missing does the real push)
	const push = 1 + 0.035 * easeInOut(seg(t, 0, 1.8)) + 0.012 * easeIn2(seg(t, 1.9, 2.55));
	// M1 (QA 26.10: motion 0–1 s was 6.85, L2 needs ≥ 20): the hook opens on a rush-in — a notch wider and tilted, the camera dives to
	// the eye match by 0.45 s (bass hit), overshoots and settles by ~1.1 s. Identical on every t ≤ 0 (FirstFrame, the Loop hand-over).
	const rush = easeOut(seg(t, 0, 0.45));
	const settle = easeInOut(seg(t, 0.45, 1.1));
	const dive = lerp(0.8, 1, rush) * (1 + 0.08 * Math.sin(Math.PI * settle));
	const S = push * dive * (1 + kick(t, [0.45], 0.09) + kick(t, [1.0, 1.5], 0.025));
	const tilt = lerp(-4.5, 0, rush) + 2 * Math.sin(Math.PI * settle);
	return {S, F: CARTON0, C: [CARTON0[0] + Math.sin(t * 1.3) * 5 + lerp(100, 0, rush) - 36 * Math.sin(Math.PI * settle), CARTON0[1] + Math.cos(t * 1.1) * 4 - 4 + lerp(-60, 0, rush)], R: Math.sin(t * 0.9) * 0.4 + tilt};
};
/** frame 0 → 2.53 s; exported for the loop author (scenes_3 Loop may reuse the set at the same framing) */
export const HookArt: React.FC<{t: number}> = ({t}) => {
	const o = faceO(t);
	const c = hookCarton(t);
	const lookUp = easeInOut(seg(t, 2.0, 2.35));
	const g: GirlSt = {
		...o,
		wide: easeOut(clamp01((t + 0.12) / 0.5)),
		expr: 'wonder',
		look: [lerp(0.55, 0.8, hLean(t)), lerp(0.05, -0.55, lookUp)],
		blink: false,
	};
	return (
		<Shk t={t} hits={[0.45]} amp={7} tremor={0.6}>
			<StoreSet t={t} cam={hookCam(t)} g={g} c={c} arm={hookArm(t)} />
			{/* bass hit at 0.45: the fridge light pulses (no freeze) */}
			<Flash a={t - 0.45} dur={0.2} max={0.34} color="#E8F6FF" />
		</Shk>
	);
};
export const Hook: React.FC<SceneProps> = () => <HookArt t={useT()} />;

// ======================================================================= 2 · MISSING (macro of the header)
// World = frame px at the cut: the carton ×2.4 with its header centre on CARTON0 (the zoom-through point), then the camera eases
// the word into the safe zone. Letter centres follow kit A NoticeG (Anton advances of M I S S I N G over 316 units).
const MS = 2.4;
const MX = CARTON0[0];
const MY = CARTON0[1] - HEADER_Y * MS;
const M_W = [1.22, 0.5, 0.96, 0.96, 0.5, 1.04, 1.0];
const MIS_C = (() => {
	const tot = M_W.reduce((a, b) => a + b, 0);
	let acc = 0;
	return M_W.map((w) => {
		const c = -158 + ((acc + w / 2) / tot) * 316;
		acc += w;
		return c;
	});
})();
const letterX = (i: number) => MX + MIS_C[i] * MS;
/** fingertip height: on the lower half of the letters (letter baseline = carton −440) */
const LETTER_Y = MY + -440 * MS - 30;
const SNAP = W(14);
/** on the «MISSING» snap her hand jerks back down and out of the frame (startled) — it no longer hangs upright beside the word */
const missBack = (t: number) => easeIn2(seg(t, SNAP + 0.02, SNAP + 0.26));
const missTip = (t: number): P2 => {
	const land = easeOut(seg(t, 2.48, 2.8));
	const drag = easeInOut(seg(t, W(10), W(13) + 0.3));
	const back = missBack(t);
	const rub = drag > 0 && drag < 1 ? Math.sin(t * 19) * 7 : 0;
	return [lerp(letterX(0) - 14, letterX(6) + 6, drag) + back * 330, LETTER_Y + (1 - land) * 460 + rub + back * 1250];
};
const missWriggle = (t: number): number[] => {
	const tip = missTip(t);
	const hard = seg(t, W(12) - 0.02, W(12) + 0.25);
	const snap = seg(t, SNAP - 0.02, SNAP + 0.04);
	return M_W.map((_, i) => {
		const passed = t > W(10) - 0.1 ? clamp01((tip[0] - letterX(i) + 46) / 90) : 0;
		const tremble = i === 0 ? 0.14 * seg(t, 2.78, 2.95) : 0;
		return Math.max(passed * 0.82, tremble, hard * (0.62 + 0.38 * passed)) * (1 - snap);
	});
};
/** after the zoom-through (header on CARTON0, ×1) the camera eases back and UP by 3.05 s: the header rises to y ≈ 430 and the whole
 *  printed photo ends above y ≈ 1150, so the caption band (y 1180–1300) lies under the photo's lower border, not across the printed
 *  mouth and chin */
const missCam = (t: number): Cam => {
	const k = easeInOut(seg(t, 2.66, 3.05));
	const pull = easeInOut(seg(t, SNAP + 0.05, 4.86));
	const S = (1 - 0.15 * k - 0.04 * pull) * (1 + kick(t, [SNAP], 0.08) + kick(t, [2.8], 0.02));
	return {S, F: CARTON0, C: [lerp(CARTON0[0], 474, k), CARTON0[1] - 130 * k - 16 * pull], R: lerp(0, -2.2, k) + Math.sin(t * 1.4) * 0.3};
};
/** ink impact lines around the word on the snap */
const ImpactLines: React.FC<{age: number}> = ({age}) => {
	if (age < 0 || age > 0.32) return null;
	const k = age / 0.32;
	const cx = MX;
	const cy = CARTON0[1];
	return (
		<Svg>
			{Array.from({length: 12}, (_, i) => {
				const a = (i / 12) * Math.PI * 2 + 0.2;
				const rx = 440 + 160 * k;
				const ry = 170 + 90 * k;
				const L = 70 * (1 - k) + 20;
				const x0 = cx + Math.cos(a) * rx;
				const y0 = cy + Math.sin(a) * ry;
				const x1 = cx + Math.cos(a) * (rx + L * 1.6);
				const y1 = cy + Math.sin(a) * (ry + L);
				return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={i % 2 ? PAL.stamp : INK} strokeWidth={14 * (1 - k) + 4} strokeLinecap="round" opacity={1 - k * 0.6} />;
			})}
		</Svg>
	);
};
export const Missing: React.FC<SceneProps> = () => {
	const t = useT();
	const cam = missCam(t);
	const tip = missTip(t);
	const drag = seg(t, W(10), W(13) + 0.3);
	const hs = 2.55;
	// her finger leans LEFT, 38° off upright, the hand mirrored (fist under the finger, thumb out) and coming up from the lower right,
	// so it trails off the right edge as it drags along the word (never an upright finger against MISSING)
	const hrot = -40 + 8 * drag - 18 * missBack(t);
	const off = rotP([-KID_TIP[0] * hs, KID_TIP[1] * hs], hrot);
	// the squirm speeds up under «can't read» (continuous phase: t' = t + 0.9 · time spent in that stretch)
	const tq = t + 0.9 * (clamp01((t - W(12)) / (W(13) + 0.3 - W(12))) * (W(13) + 0.3 - W(12)));
	// her head and shoulders slide in from the LEFT edge at their final height while she can't read (in the safe zone by «read»
	// 3.71 s; rising from the bottom put the face under the caption band at 3.75 s), the torso runs on past the frame's bottom edge;
	// her lips sound it out on «MISSING»; near eye at x ≈ 125 (≥ 70); scale 1.05 keeps the visible torso about 1.8 head-heights
	const rise = easeOut(seg(t, 3.3, 3.62));
	const IS = 1.05;
	const fx = lerp(-360, 170, rise);
	const fy = 1010 + 36 * (1 - rise) - 18 * easeOut(seg(t, SNAP, SNAP + 0.2)) + Math.sin(t * 2.3) * 4;
	const talking = t >= SNAP - 0.02 && t < We(14) + 0.12;
	return (
		<Shk t={t} hits={[SNAP]} amp={10} tremor={0.7}>
			<AbsoluteFill style={{background: '#9DB7C8'}}>
				<StoreBg t={t} zoom={1.6} blur={14} dim={0.05} dx={-t * 12} />
				<CamLayer cam={cam}>
					<MilkCarton x={MX} y={MY} s={MS} t={tq} wriggle={missWriggle(t)} />
					{missBack(t) < 1 ? (
						<Fig x={tip[0] - off[0]} y={tip[1] - off[1]} s={hs} rot={hrot} flip>
							<PointHandG kind="kid" arm={520} tap={bump(t, 2.82, 0.16)} lw={lwFor(hs)} />
						</Fig>
					) : null}
				</CamLayer>
				<ImpactLinesScreen cam={cam} age={t - SNAP} />
				{rise > 0.001 ? (
					<Bust x={fx} y={fy + 520 * IS} s={IS} t={t} expr={t < SNAP ? 'curious' : 'wonder'} turn={0.35} look={[0.62, -0.78]} wide={0.6 * seg(t, SNAP, SNAP + 0.15)} talk={talking ? 1 : 0} blink={false} seed={2} />
				) : null}
				<Flash a={t - SNAP} dur={0.14} max={0.35} />
			</AbsoluteFill>
		</Shk>
	);
};
/** the impact lines framed by the scene camera */
const ImpactLinesScreen: React.FC<{cam: Cam; age: number}> = ({cam, age}) => (
	<CamLayer cam={cam}>
		<ImpactLines age={age} />
	</CamLayer>
);

// ======================================================================= 3 · MAN CAN (low angle, tilt up from the watch)
// World = frame px of the end framing: his backlit coat silhouette (kit A ManSil 'low', no face), the carton in his watch hand in
// the foreground, her face low at the bottom-left (she is beside the camera, looking up).
/** his backlit coat from a child's height: kit A ManSil 'low' (same shape numbers, same rim) but with ONE hanging arm. Kit A hangs
 *  both arms at his sides, and with the coloured watch hand holding the carton in front he read as three-armed; here his right arm
 *  (viewer's right) is the one reaching toward the camera with the carton, so on the silhouette only its rounded shoulder shows */
const ManLowSilG: React.FC<{t: number; rim: string}> = ({t, rim}) => {
	const sway = Math.sin(t * 1.4) * 4;
	const shape = (c: string) => (
		<g fill={c}>
			<path d="M-330,-420 L-252,-1460 Q-150,-1520 -60,-1532 L60,-1532 Q150,-1520 252,-1460 L330,-420 Z" />
			<path d="M-310,-460 L-270,0 L-56,0 L-70,-460 Z M310,-460 L270,0 L56,0 L70,-460 Z" />
			<rect x={-44} y={-1600} width={88} height={90} />
			<ellipse cx={0} cy={-1660} rx={96} ry={116} />
			<polyline points="-262,-1440 -322,-1080 -330,-720" fill="none" stroke={c} strokeWidth={112} strokeLinecap="round" strokeLinejoin="round" />
			{/* the reaching arm: only the shoulder, its upper arm goes forward (toward the camera) inside the coat outline */}
			<polyline points="262,-1440 252,-1330" fill="none" stroke={c} strokeWidth={112} strokeLinecap="round" strokeLinejoin="round" />
		</g>
	);
	return (
		<g transform={`translate(0 ${sway.toFixed(2)})`}>
			<g transform="translate(-9 -6)">{shape(rim)}</g>
			<g transform="translate(9 -6)">{shape(rim)}</g>
			{shape(MILK.sil)}
			<path d="M-60,-1520 L0,-1380 L60,-1520" fill="none" stroke={rim} strokeWidth={6} opacity={0.35} />
		</g>
	);
};
const MCC = {x: 470, y: 1028, s: 0.74};
/** his grip in ManCan = kit A MilkCarton's default carton hand (at 0.16, scale 1.35) at rot −12 */
const MC_GRIP: Grip = {at: 0.16, rot: -12, hs: 1.35};
const WATCH: P2 = [624, 1084];
const mcCam = (t: number): Cam => {
	const k = easeInOut(seg(t, 4.86, 5.17));
	const S = lerp(2.3, 1.0, k) * (1 + 0.05 * seg(t, 5.17, 6.3)) * (1 + kick(t, [W(19)], 0.045));
	return {S, F: lerpP(WATCH, [540, 900], k), C: lerpP([470, 760], [540, 900 - 30 * seg(t, 5.17, 6.3)], k), R: lerp(-5, 0, k) + Math.sin(t * 1.2) * 0.3};
};
export const ManCan: React.FC<SceneProps> = () => {
	const t = useT();
	const cam = mcCam(t);
	const lit = 7 * clamp01((t - W(17)) / (W(19) - W(17)));
	const loom = easeInOut(seg(t, W(19), W(19) + 0.35));
	const shadow = easeInOut(seg(t, W(19) - 0.02, W(19) + 0.3));
	const uneasy = t > W(19) + 0.08;
	const mcRot = -3 * seg(t, W(17), W(19)) + Math.sin(t * 2.2) * 0.8;
	const mcGlint = bump(t, 4.95, 0.3);
	return (
		<Shk t={t} hits={[W(19)]} amp={6} tremor={0.8}>
			<AbsoluteFill style={{background: '#DDEFF8'}}>
				<CamLayer cam={cam}>
					{/* the fridge light behind him */}
					<StoreBg t={t} zoom={1.25} ox={540} oy={700} blur={10} dim={0} desat={0.1} mist={0.4} />
					<AbsoluteFill style={{background: 'radial-gradient(ellipse 620px 760px at 540px 640px, rgba(255,255,255,0.96) 0%, rgba(232,246,255,0.78) 34%, rgba(200,228,245,0.0) 72%)'}} />
					<Fig x={540 - 14 * loom} y={2290 + 30 * loom} s={1.1 + 0.05 * loom}>
						<ManLowSilG t={t} rim="#E4F6FF" />
					</Fig>
					{/* his hand on the carton: the same grip as the store set (CartonHandG), kit A's carton-hand placement (at 0.16, rot −12,
					    scale 1.35, arm 900) — the starting close-up on the watch shows it nearly full frame */}
					<Fig x={MCC.x} y={MCC.y} s={MCC.s} rot={mcRot}>
						<CartonHandG g={MC_GRIP} part="back" t={t} glint={mcGlint} arm={900} lw={lwFor(MCC.s)} />
					</Fig>
					<MilkCarton x={MCC.x} y={MCC.y} s={MCC.s} rot={mcRot} t={t} lit={lit} />
					<Fig x={MCC.x} y={MCC.y} s={MCC.s} rot={mcRot}>
						<CartonHandG g={MC_GRIP} part="front" t={t} glint={mcGlint} arm={900} lw={lwFor(MCC.s)} />
					</Fig>
					{/* her head AND shoulders low at the bottom-left, torso out of frame; on «can.» worried, not sleepy: wide-open eyes
					    (sad brows + wide → no heavy lids), looking up at him */}
					<Bust x={150} y={1040 + 520 * 1.1} s={1.1} t={t} expr={uneasy ? 'sad' : 'wonder'} turn={0.4} look={uneasy ? [0.45, -0.95] : [0.55, -0.85]} wide={uneasy ? lerp(0.6, 1, easeOut(seg(t, W(19) + 0.08, W(19) + 0.24))) : 0.5} blink={false} seed={3} />
					{/* his shadow slides over her on «can.» (right → left): a soft dark blob, he leans in */}
					{shadow > 0 ? (
						<div
							style={{
								position: 'absolute',
								left: lerp(560, -260, shadow),
								top: 640,
								width: 760,
								height: 860,
								background: 'radial-gradient(ellipse at 50% 50%, rgba(8,12,26,0.66) 0%, rgba(8,12,26,0.6) 38%, rgba(8,12,26,0) 70%)',
							}}
						/>
					) : null}
				</CamLayer>
			</AbsoluteFill>
		</Shk>
	);
};

// ======================================================================= 4 · FAMOUS (back on the split-match, two taps)
const TAP_T = [W(21) + 0.02, W(22) + 0.02];
const restGirl = (t: number): FaceO => ({lean: 1, turn: 0.45, tilt: 4 + Math.sin(t * 1.7) * 0.9, t});
const famCam = (t: number): Cam => {
	const S = (1.02 + 0.035 * seg(t, 6.25, 8.4)) * (1 + kick(t, TAP_T, 0.035) + kick(t, [W(23)], 0.04));
	// C.x 548 (F 560): the set sits 12 px left of the frame-0 framing so the watch stays inside the safe zone through the slow push
	return {S, F: [560, 720], C: [548 + Math.sin(t * 1.3) * 5, 720 + Math.cos(t * 1.1) * 4], R: Math.sin(t * 0.9) * 0.4};
};
/** his index leaves the grip (the other fingers keep holding the carton) and taps her printed right cheek on «you're» and
 *  «famous!», then curls back into the grip on «says» */
const famIdx = (t: number): IdxSt | null => {
	const k = easeOut(seg(t, 6.28, 6.46)) * (1 - easeInOut(seg(t, 7.78, 8.12)));
	if (k <= 0.001) return null;
	const press = TAP_T.reduce((a, tt) => a + bump(t, tt, 0.2), 0);
	// between the taps the pad hovers just off the photo; after the second tap it rests on the photo for a beat
	const rest = easeInOut(seg(t, TAP_T[1] + 0.12, TAP_T[1] + 0.3)) * (1 - easeInOut(seg(t, 7.5, 7.7)));
	return {k, aim: P_CHEEK_R, touch: Math.max(clamp01(press * 1.4), rest * 0.9), tap: press};
};
export const Famous: React.FC<SceneProps> = () => {
	const t = useT();
	// «Her eyes go wide» (plan row 4): wonder from the first tap, eyes wide by ≈ 6.7 s (no side smirk); on «he» (W 23, event
	// 'wide') a second pop: the last notch of wide + her gaze leaves the photo and goes up to him, the head tips back a little
	const wideK = easeOutBack(seg(t, TAP_T[0] + 0.02, 6.74));
	const pop = easeOutBack(seg(t, W(23) - 0.04, W(23) + 0.2));
	const rg = restGirl(t);
	const g: GirlSt = {
		...rg,
		tilt: rg.tilt - 5 * bump(t, W(23) + 0.12, 0.5),
		wide: lerp(0.2, 0.86, wideK) + 0.14 * pop,
		expr: 'wonder',
		look: t < 6.45 ? [0.7, -0.1] : t < W(23) - 0.02 ? [0.85, 0.12] : [0.8, -0.55],
		blink: t > 7.98 && t < 8.08,
	};
	return (
		<Shk t={t} hits={TAP_T} amp={5} tremor={0.6}>
			<StoreSet t={t} cam={famCam(t)} g={g} c={{...restCarton(t), idx: famIdx(t)}} front={<Bursts t={t} />} />
			<Flash a={t - TAP_T[0]} dur={0.1} max={0.32} />
			<Flash a={t - TAP_T[1]} dur={0.1} max={0.32} />
		</Shk>
	);
};

// ======================================================================= 5 · IS THAT ME (punch-in: chest → the photo → chest)
const JABS = [8.33, W(26) + 0.03, W(27) + 0.04];
const CHEST: P2 = [56, -246];
export const IsThatMe: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const c = restCarton(t);
	const face = toBust(cartonP(c, P_CHEEK_L));
	const toFace = easeInOut(seg(t, JABS[1] - 0.12, JABS[1] - 0.01));
	const back = easeInOut(seg(t, JABS[2] - 0.13, JABS[2] - 0.01));
	const m = toFace * (1 - back);
	// chest jab: elbow down and out at her side, the hand comes across nearly level and points in at her chest (dir −158, mirrored
	// hand); the photo: from the lower left, 34° off upright (as in the hook)
	const arm: ArmSt = {aim: lerpP(CHEST, face, m), dir: lerp(-158, -56, m), hk: clamp01((t - 8.22) / 0.1), tap: JABS.reduce((a, j) => a + bump(t, j, 0.13), 0)};
	const spark = bump(t, W(27) + 0.12, 0.42);
	const talk = t > W(25) - 0.02 && t < W(27) + 0.33 ? 1 : 0;
	// punch-in framed lower than the set so her chest (the jab) sits above the caption band: chest ≈ y 990, photo ≈ 620. The beat
	// enters on a HARD cut (beats.ts tr 'none'; the engine's 'punch' cross-faded two near-identical framings of the set into a ghost)
	// and the zoom punch is the camera's own: ×1.24 → ×1 over 0.14 s
	const punch = 1 + 0.24 * (1 - easeOut(seg(t, t0, t0 + 0.14)));
	const S = (1.2 + 0.03 * seg(t, 8.3, 9.1)) * (1 + kick(t, JABS, 0.025)) * punch;
	const cam: Cam = {S, F: [430, 930], C: [467 + Math.sin(t * 1.3) * 4, 760], R: Math.sin(t * 0.9) * 0.4};
	const g: GirlSt = {...restGirl(t), wide: 1, expr: 'wonder', look: m > 0.5 ? [0.85, 0.15] : [0.7, -0.55], talk, spark, blink: false};
	return (
		<Shk t={t} hits={[JABS[1]]} amp={4} tremor={0.6}>
			<StoreSet t={t} cam={cam} g={g} c={{...c, spark}} arm={arm} front={<Bursts t={t} />} />
		</Shk>
	);
};

// ======================================================================= 6 · HUSH (his shadow on the fridge door, confetti falls)
/** the two bursts break into flat paper confetti that freezes, then flutters down — in two columns at the sides of the frame
 *  (x ≈ 40–250 and 810–1080), never through the shadow's lips and finger (Hush: lips ≈ (510, 585), finger x 450–510, y 570–730, fist x 365–510) */
const CONF = Array.from({length: 16}, (_, i) => {
	const b = i % 2;
	return {
		x: (b ? 910 : 140) + (h1(i * 3.1) - 0.5) * 170,
		y: (b ? 360 : 300) + (h1(i * 5.7) - 0.5) * 170,
		vx: (b ? 1 : -1) * h1(i * 7.3) * 110,
		spin: (h1(i * 2.9) - 0.5) * 900,
		size: 26 + 26 * h1(i * 4.4),
		shape: Math.floor(h1(i * 8.8) * 3),
		color: ['#FFE45C', '#FFFDF2', PAL.orange, '#FFE45C'][i % 4],
		delay: h1(i * 6.1) * 0.12,
	};
});
const Confetti: React.FC<{t: number; t0: number}> = ({t, t0}) => {
	const a0 = t - t0 - 0.1;
	return (
		<Svg>
			{CONF.map((p, i) => {
				const a = Math.max(0, a0 - p.delay);
				const x = p.x + p.vx * a + Math.sin(a * 5 + i) * 30 * Math.min(1, a * 2);
				const y = p.y + 900 * a * a + 60 * a;
				const flip = Math.cos(a * 9 + i);
				const rot = i * 37 + p.spin * a;
				const s = p.size;
				const d = p.shape === 0 ? starPath(5, s, s * 0.45, i) : p.shape === 1 ? `M${-s},${-s * 0.5} L${s},${-s * 0.5} L${s},${s * 0.5} L${-s},${s * 0.5} Z` : `M0,${-s} L${s},${s * 0.8} L${-s},${s * 0.8} Z`;
				return (
					<g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1 ${flip.toFixed(3)})`}>
						<path d={d} fill={p.color} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
					</g>
				);
			})}
		</Svg>
	);
};
// his shadow on the fridge door, drawn here (kit A ManSil 'hush' has a round head without a profile, the raised finger sat beside
// it and read as «scratching his head / on the phone»): a man's PROFILE facing left toward her — brow, a big clear nose, upper and
// lower lip, chin notch, chin — no eye, no features inside the shape. The «shh» finger is its own upright bar standing IN FRONT of
// the lips: its back edge touches the lips, its front edge stands well clear of the lip line, its tip stops just under the nose
// (a notch of light between them), and below the lips there is a clear gap of light between the finger and the chin; the fist sits
// under the chin, in front of the neck (light between fist and jaw), the forearm runs down into the body. Without that gap the
// earlier finger merged with the chin and read as «hand at the chin, thinking». Units: origin = neck base, head ≈ 505 tall, faces −x.
const HUSH_PROFILE =
	'M150,0 C140,-60 128,-120 150,-180 C192,-262 192,-382 122,-450 C60,-504 -62,-508 -122,-452 C-150,-424 -160,-384 -162,-340 ' +
	'C-163,-322 -168,-312 -177,-303 C-171,-296 -167,-292 -166,-286 L-238,-238 C-249,-231 -248,-219 -236,-216 L-186,-208 ' +
	'C-197,-205 -205,-197 -203,-189 C-201,-185 -194,-183 -189,-182 C-198,-178 -201,-168 -195,-162 C-188,-157 -180,-153 -176,-148 ' +
	'C-182,-138 -184,-122 -179,-110 C-170,-96 -150,-90 -120,-86 C-90,-82 -70,-70 -62,-46 L-56,0 Z';
const HUSH_BODY = 'M-330,1500 L-318,160 C-300,52 -220,-6 -64,-14 L150,-14 C330,-4 420,60 432,170 L452,1500 Z';
const HushShadowG: React.FC<{k: number; t: number; fill: string; soft: number}> = ({k, t, fill, soft}) => {
	const e = easeOutBack(k);
	const dx = -30 * (1 - e);
	const dy = 460 * (1 - e);
	return (
		<g filter={`url(#hush-soft)`}>
			<defs>
				<filter id="hush-soft" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation={soft} />
				</filter>
			</defs>
			<g transform={`translate(0 ${(Math.sin(t * 1.8) * 4).toFixed(2)})`} fill={fill}>
				<path d={HUSH_BODY} />
				<path d={HUSH_PROFILE} />
				<g transform={`translate(${dx.toFixed(1)} ${dy.toFixed(1)})`}>
					{/* forearm from the fist down into the body, the fist under the chin in front of the neck */}
					<polyline points="-246,-60 -186,300 -140,760" fill="none" stroke={fill} strokeWidth={112} strokeLinecap="round" strokeLinejoin="round" />
					<rect x={-300} y={-142} width={100} height={116} rx={46} />
					{/* the index finger: upright, x −242 … −200 (lips at −203 … −195, chin at −184), tip at y −198 (nose underside −216) */}
					<rect x={-242} y={-198} width={42} height={110} rx={21} />
				</g>
			</g>
		</g>
	);
};
/** the shadow's lips / finger in frame px (Hush placement) — the confetti and the girl keep out of this box */
const HUSH_AT = {x: 800, y: 860, s: 1.45};
export const Hush: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	// the hand shoots up to the lips on «Hush» (9.14 s) and lands with a small overshoot by 9.26
	const hush = seg(t, 9.08, 9.26);
	const dim = lerp(0.06, 0.3, easeOut(seg(t, 9.1, 9.32)));
	const loom = seg(t, 9.08, 9.95);
	const cam: Cam = {S: (1 + 0.05 * loom) * (1 + kick(t, [W(28) + 0.04], 0.03)), F: [540, 820], C: [540 + Math.sin(t * 1.2) * 4, 820], R: 0};
	return (
		<AbsoluteFill style={{background: '#18212c'}}>
			<CamLayer cam={cam}>
				<StoreBg t={t} zoom={1.22} ox={540} oy={760} blur={4.5} dim={dim} desat={0.25 * seg(t, 9.1, 9.32)} door={1} mist={0.55} />
				<AbsoluteFill style={{mixBlendMode: 'multiply'}}>
					<Fig x={HUSH_AT.x - 10 * loom} y={HUSH_AT.y} s={HUSH_AT.s + 0.04 * loom}>
						<HushShadowG k={hush} t={t} fill="#0B111F" soft={2.6} />
					</Fig>
				</AbsoluteFill>
				{/* she is small at the bottom-left, in front of the door, no contact; head + shoulders, the torso runs out of frame */}
				<Bust x={175} y={1110 + 520 * 0.95} s={0.95} t={t} expr="sad" turn={0.42} look={[0.6, -0.8]} wide={0.7} blink={false} seed={4} />
			</CamLayer>
			<Confetti t={t} t0={t0} />
			<MistFront t={t} k={0.35} y={1520} />
		</AbsoluteFill>
	);
};

// ======================================================================= 7–8 · FLASHBACK (paper backdrop, desaturated)
const FLASHBACK: React.CSSProperties = {filter: 'saturate(0.42) sepia(0.3) contrast(0.96)'};
const FLOOR = 1166;
const Floor: React.FC = () => (
	<AbsoluteFill style={{top: FLOOR, height: 1920 - FLOOR, background: 'linear-gradient(180deg, rgba(60,45,30,0.22) 0%, rgba(60,45,30,0.06) 40%, rgba(60,45,30,0) 100%)'}} />
);

// --- 7 · TAKE HER: the empty checked jacket stays; the watch hand walks the toddler out of frame (a symbol, FACTS)
export const TakeHer: React.FC<SceneProps> = () => {
	const t = useT();
	const u = seg(t, W(31) - 0.02, W(31) + 1.0);
	const x = 640 + 760 * Math.pow(u, 1.45);
	const walk = clamp01((t - W(31) + 0.06) / 0.16);
	const S = (1 + 0.09 * easeInOut(seg(t, 9.88, 11.5))) * (1 + kick(t, [W(31)], 0.015));
	const cam: Cam = {S, F: [330, 800], C: [330, 800], R: 0};
	return (
		<AbsoluteFill style={FLASHBACK}>
			<PaperBackdrop t={t} tone="grey" />
			<CamLayer cam={cam}>
				<Floor />
				<JacketChair x={300} y={FLOOR} s={0.84} t={t} sway={lerp(1, 0.25, seg(t, 10.6, 11.2))} />
				<Toddler x={x} y={FLOOR} s={1.45} t={t} walk={walk} armR={1} adultR="man" adultArm={2600} expr="curious" look={t < W(31) ? [-0.75, -0.25] : [0.5, -0.2]} />
			</CamLayer>
			<Vignette k={0.5 + 0.22 * bump(t, W(31) + 0.08, 0.45)} />
		</AbsoluteFill>
	);
};

// --- 8 · MOM: wider; the bangle hand comes in and takes her other hand (tender, no hurry), glints on «MOM»; the three walk off
// toward the right edge. Her arms are raised only to about shoulder height (≈ 23° above level, kit A ToddlerG arm raise 0.62; kit
// A's full raise 1 put both hands straight up), and both adult forearms come in DIAGONALLY from the upper corners (48° off upright;
// kit A's adult hands hang straight down from the top edge) — two long vertical arms holding her raised hands read as a marionette
// being lifted. The adult hands are drawn here (kit A ToddlerG adultL / adultR off): the same grip maths as the kit, our angle.
const vdir = (a: number): P2 => [Math.sin(rad(a)), Math.cos(rad(a))];
const limbA = (a: P2, b: P2) => deg(Math.atan2(b[0] - a[0], b[1] - a[1]));
const AH = 0.48;
const MOM_ARM_K = 0.62;
const ADULT_ANG = 48;
/** her hand (palm contact) for side sd in toddler units, incl. the walk bob — kit A ToddlerG arm maths, kept in sync by hand */
const todHand = (sd: -1 | 1, k: number, t: number, walk: number, speed: number): P2 => {
	const ph = t * 7 * speed;
	const w = clamp01(walk);
	const lA = 16 * Math.sin(ph) * w;
	const bob = -Math.abs(Math.cos(ph)) * 8 * w + Math.sin(t * 2) * 1.5;
	const S: P2 = [sd * 50, -240];
	const a = sd * (lerp(14, 158, easeInOut(k)) + Math.sin(t * 3 + sd) * 3 * (1 - k)) + (k < 0.2 ? -lA * 0.6 : 0);
	const E = addP(S, vdir(a), 52);
	const Wr = addP(E, vdir(a + sd * 8), 50);
	const H = addP(Wr, vdir(limbA(E, Wr)), 26);
	return [H[0], H[1] + bob];
};
/** an adult hand holding her hand on side sd (−1 = mom on her left, mirrored; +1 = the stepdad's watch hand), forearm up and out
 *  toward the upper corner; slide 0..1 = still coming in along the forearm */
const AdultHandG: React.FC<{kind: HandKind; sd: -1 | 1; at: P2; slide: number; grasp: number; glint: number; part: 'back' | 'front'; t: number; lw: number}> = ({
	kind,
	sd,
	at,
	slide,
	grasp,
	glint,
	part,
	t,
	lw,
}) => {
	const rot = 180 + sd * ADULT_ANG;
	const up: P2 = [-Math.sin(rad(rot)), Math.cos(rad(rot))];
	const d = 560 * slide;
	return (
		<g transform={gripXf(kind, at[0] + sd * 10 + up[0] * d, at[1] - 4 + up[1] * d, rot, AH, sd < 0)}>
			<HandG kind={kind} gesture="open" to="hold" k={grasp} arm={3200} t={t} glint={glint} part={part} lw={lw / AH / handScale(kind)} />
		</g>
	);
};
const gripXf = (kind: HandKind, ex: number, ey: number, rot: number, hs: number, flip: boolean) => {
	const g = handGrip(kind);
	return `translate(${ex.toFixed(1)} ${ey.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${hs}) translate(${flip ? g[0] : -g[0]} ${-g[1]}) scale(${flip ? -1 : 1} 1)`;
};
/** a hand-unit point through gripXf */
const gripMap = (kind: HandKind, ex: number, ey: number, rot: number, hs: number, flip: boolean, p: P2): P2 => {
	const g = handGrip(kind);
	const q: P2 = [((flip ? -p[0] : p[0]) + (flip ? g[0] : -g[0])) * hs, (p[1] - g[1]) * hs];
	const r = rotP(q, rot);
	return [ex + r[0], ey + r[1]];
};
export const Mom: React.FC<SceneProps> = () => {
	const t = useT();
	const s = 1.3;
	// the three walk on toward the right edge (≈ 350 px by the cut, speeding up a little): the toddler starts left of centre and
	// ends well right of it; the man's hand ahead of her reaches the edge of the safe zone at the cut
	const tx = 330 + 290 * seg(t, 11.28, 12.66) + 120 * easeIn2(seg(t, 11.9, 12.94));
	const speed = 0.85;
	const slide = 1 - easeOut(seg(t, 11.3, 11.6));
	const grasp = easeInOut(seg(t, 11.52, 11.66));
	const armL = MOM_ARM_K * easeInOut(seg(t, 11.3, 11.5));
	const glintK = bump(t, W(39) + 0.16, 0.5);
	const lwT = lwFor(s);
	const hL = todHand(-1, armL, t, 1, speed);
	const hR = todHand(1, MOM_ARM_K, t, 1, speed);
	const rotL = 180 - ADULT_ANG;
	const bangle = gripMap('mom', hL[0] - 10, hL[1] - 4, rotL, AH, true, [40 * handScale('mom'), 62 * handScale('mom')]);
	const bp: P2 = [tx + bangle[0] * s, FLOOR + bangle[1] * s];
	const cam: Cam = {S: (1 + 0.03 * seg(t, 11.28, 12.95)) * (1 + kick(t, [W(39) + 0.04], 0.02)), F: [470, 780], C: [470, 780], R: 0};
	const adults = (part: 'back' | 'front') => (
		<Fig x={tx} y={FLOOR} s={s}>
			<AdultHandG kind="mom" sd={-1} at={hL} slide={slide} grasp={grasp} glint={glintK} part={part} t={t} lw={lwT} />
			<AdultHandG kind="man" sd={1} at={hR} slide={0} grasp={1} glint={0} part={part} t={t} lw={lwT} />
		</Fig>
	);
	return (
		<AbsoluteFill style={FLASHBACK}>
			<PaperBackdrop t={t} tone="grey" />
			<CamLayer cam={cam}>
				<Floor />
				<JacketChair x={40 - 50 * (t - 11.28)} y={FLOOR} s={0.7} t={t} sway={0.25} />
				{adults('back')}
				<Toddler x={tx} y={FLOOR} s={s} t={t} walk={1} speed={speed} armL={armL} armR={MOM_ARM_K} expr="smile" look={t < 11.62 ? [-0.6, -0.6] : [0.3, -0.2]} />
				{adults('front')}
				{/* the bangle glint on «MOM»: a warm bloom + a big 4-point sparkle on the bangles */}
				{glintK > 0.01 ? (
					<Svg>
						<defs>
							<radialGradient id="mom-bloom">
								<stop offset="0" stopColor="#FFF1B8" stopOpacity={0.85} />
								<stop offset="1" stopColor="#FFF1B8" stopOpacity={0} />
							</radialGradient>
						</defs>
						<circle cx={bp[0]} cy={bp[1]} r={150 * glintK} fill="url(#mom-bloom)" />
						<Sparkle x={bp[0] + 10} y={bp[1] - 8} r={70} k={glintK} rot={t * 120} lw={5} />
					</Svg>
				) : null}
			</CamLayer>
			<Vignette k={0.48} />
		</AbsoluteFill>
	);
};
