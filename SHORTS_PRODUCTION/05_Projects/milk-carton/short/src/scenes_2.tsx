import React, {useId} from 'react';
import {AbsoluteFill} from 'remotion';
import type {SceneProps} from './engine/transitions';
import {W} from './lib/time';
import {CASE_END, KEEP_PHOTO} from './data/beats';
import {INK, clamp01, easeInOut, easeOut, h1, lerp, useT} from './ui/gfx';
import {shake} from './ui/vox';
import {HEAD} from './fonts';
import {PAL} from './theme';
import {SKIN, SKIN_D} from './ui/draw';
import {GirlFaceG, mix} from './ui/milk_a'; // NotRun: her head on our own body (kit GirlG stands 20 units in the air)
import {CASE_HANDLE, CUT, Cutout, CutoutG, DollCase, DollCaseG, Girl, Hand, HandG, MILK, MilkCartonG, NOTICE, Scissors, cartonPt, handGrip, handTip, ik, lwFor, rotP, wobble} from './ui/milk_a';
import type {HandGesture, HandKind, MilkCartonProps, P2} from './ui/milk_a';
import {AISLE, Bedroom, BELT, CheckoutBelt, CurtainWindow, DairyFridge, House, LAWN, Lawn, RoadWindow, SHACK, Shack, ShopperLegs, ShoppingCart, StoreAisle, TableTop, VaporStream, curtainEdge, popOver} from './ui/milk_b';

// milk-carton — PART 2 scenes (words 40–83, 12.66 – 25.04 s): the run, the twist, the screenshot moment, the cutout. Source of truth:
// ../SCRIPT.md «Покадровый план» rows 9–16, ../FACTS.md «Постановка в кадре»; timings src/data/beats.ts + src/data/events.ts (every
// event below is keyed to its word with W(i)). Reference: A1 hay-castle/short/src (camera, kicks, card lines).
// Rules kept here: drawn in code (flat + INK + PAL, kits src/ui/milk_a.tsx + milk_b.tsx), adults are HANDS / legs only (wristwatch +
// white cuff + navy coat = stepdad; no adult face anywhere in this part), generic girl with the red clip, generic carton (MISSING,
// squiggle name/date), key action x 48–887 / y 288–1100, motion in every shot (camera drift + kicks, idle t on every piece).
// Big text (HEAD, white + orange, INK outline) only on the two cards (Buys, KeepIt) — their words are in project.json hide_subs.
// Music: Mischief Maker is cut on «carton.» (word 54) — NotHide's tail and Buys play in near-silence, the picture keeps crawling.
//
// | beat     | t0–t1 s       | words  | VO                                  | what is on screen (event → word)                                        | tr in    |
// |----------|---------------|--------|-------------------------------------|-------------------------------------------------------------------------|----------|
// | OnTheRun | 12.66–15.02   | 40–46  | Years on the run. Barely let        | one compound move, desaturated flashback: night road lights streak past | whipL    |
// |          |               |        | outside.                            | a car window → «run.» they melt into rain on the tin roof of a shack    | scrim    |
// |          |               |        |                                     | among trees (push into its lit window) → «Barely» a little hand drags   |          |
// |          |               |        |                                     | the curtain aside to the sun → it lets go → «outside.» the curtain      |          |
// |          |               |        |                                     | slips back BY ITSELF, the sunbeam narrows to a strip (no adult hand)    |          |
// | NotRun   | 15.02–15.90   | 47–49  | He doesn't run.                     | colour snaps back (flash): low shot at the dairy fridge, his trouser    | none     |
// |          |               |        |                                     | legs + shoes planted (watch hand hanging) beside her sneakers, cart     | scrim    |
// |          |               |        |                                     | behind; «run.» shoppers' legs stream past in a blur, he stays           |          |
// | NotHide  | 15.90–17.36   | 50–54  | He doesn't hide the carton.         | his watch hand lowers the carton over the cart · «hide» lets go, it     | whipL    |
// |          |               |        |                                     | drops in like any milk (her face lands toward us) · «carton.» her small | scrim    |
// |          |               |        |                                     | hand on the rail, the cart rolls on, slows to a crawl in the dead air   |          |
// | Buys     | 17.36–18.38   | 55–57  | He BUYS it.  ← TWIST (word 56)      | «He» his hand thumps the carton onto the checkout belt, card «HE» ·     | punch    |
// |          |               |        |                                     | «BUYS» the red laser crosses HER printed face, BEEP flash, «BUYS» slams | subs     |
// |          |               |        |                                     | in orange (kick + shake) · «it.» «IT.» lands, the till drawer pops      | hidden   |
// | KeepIt   | 18.38–20.23   | 58–66  | Then he asks: "Do you want to keep  | table from above, the EMPTY carton (spout open) face up under his hand ·| up       |
// |          |               |        | it?"                                | «asks:» he slides it across to her small hands · «Do» DO YOU, «want»    | subs     |
// |          |               |        |                                     | WANT TO, «keep» KEEP IT? (KEEP orange, kick), it wobbles to a stop,     | hidden   |
// |          |               |        |                                     | her fingers hover. Ends with the photo at KEEP_PHOTO                    |          |
// | Cuts     | 20.23–21.95   | 67–72  | She cuts out her own face.          | macro: her small hand with round-tip kid scissors snips round the photo | zoomthru |
// |          |               |        |                                     | panel — one side per word «cuts» «out» «her» «own» · «face.» her        | scrim    |
// |          |               |        |                                     | fingers lift the cutout free, a hole stays in the carton                |          |
// | Tosses   | 21.95–23.67   | 73–78  | Tosses it in her Barbie case.       | the pink doll case (no logo) pops open on dolls, tiny shoes, a comb ·   | whipR    |
// |          |               |        |                                     | «it» her hand lets the cutout go, it flutters in · «case.» the lid      | scrim    |
// |          |               |        |                                     | snaps shut, the latch clicks                                            |          |
// | NextDoor | 23.67–25.04   | 79–83  | Leaves the case next door.          | wide side-on lawn: she skips to the neighbours' door with the case ·    | diag     |
// |          |               |        |                                     | «case» opens the screen door, sets it on their hall carpet · skips home |          |
// |          |               |        |                                     | · «door.» the screen door slaps shut, the camera eases in on the lone   |          |
// |          |               |        |                                     | case behind the mesh (ends at CASE_END). No signs / numbers / streets   |          |

// ======================================================================= shared helpers
type Ease = (x: number) => number;
const easeIn2: Ease = (x) => clamp01(x) * clamp01(x);
const lin: Ease = (x) => clamp01(x);
/** eased 0→1 between times a and b */
const seg = (t: number, a: number, b: number, e: Ease = easeInOut) => e(clamp01((t - a) / (b - a)));
/** a small bump 0→1→0 around time c (width d) */
const bump = (t: number, c: number, d = 0.2) => {
	const x = (t - c + d / 2) / d;
	return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x);
};
/** camera kick: a quick push-in that springs back (A1) */
const kick = (t: number, times: number[], amp = 0.05) =>
	times.reduce((acc, ti) => {
		const a = t - ti;
		return a < 0 || a > 0.9 ? acc : acc + amp * (1 - Math.exp(-a * 30)) * Math.exp(-a * 5.5);
	}, 0);
/** piecewise keys [time, value], eased per segment */
const keys = (t: number, ks: [number, number][], e: Ease = easeInOut) => {
	if (t <= ks[0][0]) return ks[0][1];
	for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], e((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0])));
	return ks[ks.length - 1][1];
};
const f1 = (n: number) => n.toFixed(1);

/** camera: scale z around (ox, oy), offset (tx, ty), decaying shake on hits + handheld tremor */
const Cam: React.FC<{t: number; z?: number; ox?: number; oy?: number; tx?: number; ty?: number; hits?: number[]; amp?: number; tremor?: number; filter?: string; children: React.ReactNode}> = ({
	t, z = 1, ox = 540, oy = 760, tx = 0, ty = 0, hits = [], amp = 8, tremor = 1, filter, children,
}) => {
	const s = shake(t, hits, amp, tremor);
	return (
		<AbsoluteFill style={{transform: `translate(${(tx + s.x).toFixed(2)}px, ${(ty + s.y).toFixed(2)}px) rotate(${s.r.toFixed(3)}deg) scale(${z.toFixed(4)})`, transformOrigin: `${ox}px ${oy}px`, filter}}>
			{children}
		</AbsoluteFill>
	);
};
const Flash: React.FC<{a: number; dur?: number; max?: number; color?: string}> = ({a, dur = 0.12, max = 0.7, color = '#fff'}) =>
	a < 0 || a > dur ? null : <AbsoluteFill style={{background: color, opacity: max * (1 - a / dur)}} />;
/** a frame-sized svg layer */
const Svg: React.FC<{children?: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...style}}>
		{children}
	</svg>
);
/** wrist position that puts point p (hand units, e.g. handGrip / handTip) of a placed hand at `target` */
const wristAt = (p: P2, target: P2, s: number, rot: number, flip = false): P2 => {
	const r = rotP([flip ? -p[0] : p[0], p[1]], rot);
	return [target[0] - r[0] * s, target[1] - r[1] * s];
};
/** the same transform kit A uses for a hand gripping a carton's side edge (MilkCartonG `hand`), in carton units */
const gripXf = (kind: HandKind, ex: number, ey: number, rot: number, hs: number, flip: boolean) => {
	const g = handGrip(kind);
	return `translate(${f1(ex)} ${f1(ey)}) rotate(${f1(rot)}) scale(${hs.toFixed(3)}) translate(${f1(flip ? g[0] : -g[0])} ${f1(-g[1])}) scale(${flip ? -1 : 1} 1)`;
};

/**
 * the hero carton (kit A MilkCartonG) placed in frame px — (x, y) = bottom centre, s px/unit, rot deg — with the stepdad's watch
 * hand gripping its right edge FROM ABOVE (fingers down, sleeve up out of frame). The hand has its own placement (hx, hy, hrot)
 * so it can stay behind and lift away after letting go (rel 0 grab → 1 open fingers).
 */
const HeldCarton: React.FC<{
	t: number; x: number; y: number; s: number; rot?: number; c?: Partial<MilkCartonProps>;
	hand?: {x: number; y: number; rot: number; rel: number; at?: number; arm?: number} | null;
}> = ({t, x, y, s, rot = 0, c = {}, hand}) => {
	const lw = lwFor(s);
	const hs = 1.35;
	const at = hand?.at ?? 0.62;
	// grip on the right edge, arm going up: rot 180 − 12 (fingers down-left), palm toward the carton
	const hx = gripXf('man', 196, -at * 640, 168, hs, false);
	const hp = hand ? {kind: 'man' as HandKind, gesture: 'grab' as HandGesture, to: 'open' as HandGesture, k: hand.rel, arm: hand.arm ?? 1500, t, lw: lw / hs, glint: 0} : null;
	const handG = (part: 'back' | 'front') =>
		hand && hp ? (
			<g transform={`translate(${f1(hand.x)} ${f1(hand.y)}) rotate(${f1(hand.rot)}) scale(${s.toFixed(4)})`}>
				<g transform={hx}>
					<HandG {...hp} part={part} />
				</g>
			</g>
		) : null;
	return (
		<Svg>
			{handG('back')}
			<g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s.toFixed(4)})`}>
				<MilkCartonG t={t} lw={lw} {...c} />
			</g>
			{handG('front')}
		</Svg>
	);
};

/** one line of a big card: parts pop in one by one at their own times (space is reserved, so nothing shifts); a part may carry a
 *  hit [text, colour, at, hitAt, hitColour]: at hitAt it switches to hitColour with a short scale kick (the word lands on the VO).
 *  pop = start scale of the pop-in. Cards live OUTSIDE the scene camera (their own mild kick), so their screen box is what is
 *  written here: big text B zone y 300–900, width ≤ 690 at x 540 or ≤ 840 at x ≈ 468 (standard 4.4). */
type CardPart = [string, string, number, number?, string?];
const CardLine: React.FC<{y: number; t: number; size: number; parts: CardPart[]; x?: number; pop?: number}> = ({y, t, size, parts, x = 540, pop = 1.5}) => {
	if (t < parts[0][2] - 0.03) return null;
	return (
		<div
			style={{
				position: 'absolute', left: x - 500, width: 1000, top: y, transform: 'translateY(-50%)', textAlign: 'center', whiteSpace: 'nowrap',
				fontFamily: HEAD, fontSize: size, lineHeight: 1, letterSpacing: 2, WebkitTextStroke: `${Math.round(size * 0.1)}px ${INK}`, paintOrder: 'stroke fill', filter: `drop-shadow(0 7px 0 ${INK})`,
			}}
		>
			{parts.map(([s, col, at, hitAt, hitCol], i) => {
				const k = popOver(clamp01((t - at + 0.03) / 0.2));
				const ha = hitAt === undefined ? -1 : t - hitAt + 0.02;
				const hk = ha < 0 ? 0 : 0.32 * (1 - Math.exp(-ha * 40)) * Math.exp(-ha * 9);
				const c = ha >= 0 && hitCol ? hitCol : col;
				return (
					<span key={i} style={{color: c, display: 'inline-block', opacity: clamp01(k * 3), transform: `scale(${(lerp(pop, 1, k) * (1 + hk)).toFixed(3)})`, transformOrigin: '50% 60%', whiteSpace: 'pre'}}>
						{s}
					</span>
				);
			})}
		</div>
	);
};
/** dark rounded plate behind a card block (ink rim), fades in at `at`; glow 0..1 = an orange rim flash (on the hit word) */
const Plate: React.FC<{x0: number; y0: number; x1: number; y1: number; t: number; at: number; glow?: number}> = ({x0, y0, x1, y1, t, at, glow = 0}) =>
	t < at - 0.03 ? null : (
		<div
			style={{
				position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, borderRadius: 34, background: 'rgba(8,14,26,0.74)',
				boxShadow: `0 0 0 6px ${INK}${glow > 0.01 ? `, 0 0 0 ${(6 + 6 * glow).toFixed(1)}px rgba(255,122,31,${(0.9 * glow).toFixed(3)}), 0 0 ${(40 * glow).toFixed(1)}px rgba(255,122,31,${(0.8 * glow).toFixed(3)})` : ''}`,
				opacity: clamp01((t - at + 0.03) / 0.1),
			}}
		/>
	);
/** film grain over a flashback (the same specks as kit B PaperBackdrop: re-seeded 12× a second) + a warm vignette */
const FlashbackGrain: React.FC<{t: number; k?: number; vig?: number}> = ({t, k = 1, vig = 0.5}) => {
	const f = Math.floor(t * 12);
	return (
		<>
			<Svg>
				{Array.from({length: 150}, (_, i) => (
					<circle key={i} cx={f1(h1(i * 3.1 + f * 0.37) * 1080)} cy={f1(h1(i * 7.3 + f * 0.71) * 1920)} r={(1 + 2.2 * h1(i * 1.3 + f)).toFixed(2)} fill={h1(i + f * 0.13) > 0.5 ? '#4a3a2a' : '#fff6e6'} opacity={0.32 * k} />
				))}
				{/* a couple of film scratches that jump frame to frame */}
				{[0, 1].map((j) => (h1(f * 1.7 + j * 5.3) > 0.55 ? <line key={j} x1={f1(h1(f * 2.3 + j) * 1080)} y1={0} x2={f1(h1(f * 2.3 + j) * 1080 + 14)} y2={1920} stroke="#fff6e6" strokeWidth={2} opacity={0.18 * k} /> : null))}
			</Svg>
			<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 48%, rgba(20,14,8,${vig.toFixed(3)}) 100%)`, pointerEvents: 'none'}} />
		</>
	);
};
/** the part-1 flashback grade (scenes_1 FLASHBACK): desaturated + sepia */
const FLASHBACK_FILTER = 'saturate(0.42) sepia(0.3) contrast(0.96)';

/**
 * the girl from behind at a window, backlit: one dark shape (bob, tee, shorts, legs), only the red clip keeps its colour; a warm
 * rim on her head and shoulders while the sun is in (lit 0..1). (x, y) = between her feet, H = height px. Her right arm goes from
 * hanging (reach 0) to gripping `grip` (reach 1); rel 0 → 1 opens the fist.
 */
const SIL = '#1A1D2B';
const GirlBackSil: React.FC<{x: number; y: number; H: number; t: number; reach: number; grip: P2; rel: number; lit: number}> = ({x, y, H, t, reach, grip, rel, lit}) => {
	const u = H / 640;
	const br = Math.sin(t * 2.2) * 2;
	const P = (gx: number, gy: number): P2 => [x + gx * u, y + (gy + (gy < -200 ? br : 0)) * u];
	const shR = P(56, -392);
	const shL = P(-56, -392);
	const rest = P(84, -232);
	const Wr: P2 = [lerp(rest[0], grip[0], reach), lerp(rest[1], grip[1], reach)];
	const ak = lerp(1, 1.36, reach); // a cartoon stretch only while she reaches
	const El = ik(shR, Wr, 86 * u * ak, 80 * u * ak, 'down');
	const fd = Math.atan2(Wr[1] - El[1], Wr[0] - El[0]);
	const fist: P2 = [Wr[0] + Math.cos(fd) * 20 * u, Wr[1] + Math.sin(fd) * 20 * u];
	const head = P(Math.sin(t * 1.1) * 2, -512);
	const pl = (a: P2[]) => a.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ');
	const tube = (a: P2[], w: number, c = SIL) => <polyline points={pl(a)} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
	const hair = (dx: number, dy: number, c: string) => (
		<path
			transform={`translate(${f1(head[0] + dx)} ${f1(head[1] + dy)}) scale(${u.toFixed(4)})`}
			d="M-96,-6 C-100,-80 -56,-112 0,-112 C56,-112 100,-80 96,-6 C94,30 98,58 106,74 L56,70 L0,76 L-56,70 L-106,74 C-98,58 -94,30 -96,-6 Z"
			fill={c}
		/>
	);
	const body = (c: string) => (
		<g fill={c}>
			<polygon points={pl([P(-46, -418), P(46, -418), P(74, -392), P(66, -250), P(-66, -250), P(-74, -392)])} />
			<polygon points={pl([P(-60, -262), P(60, -262), P(82, -182), P(-82, -182)])} />
		</g>
	);
	return (
		<Svg>
			{/* warm rim where the sun catches her (drawn first, offset toward the window) */}
			{lit > 0.02 ? (
				<g opacity={0.9 * lit}>
					{hair(-5 * u, -6 * u, '#FFD49A')}
					{tube([shL, shR], 40 * u, '#FFD49A')}
				</g>
			) : null}
			{tube([P(-24, -196), P(-30, -110), P(-28, -14)], 34 * u)}
			{tube([P(24, -196), P(30, -110), P(28, -14)], 34 * u)}
			<ellipse cx={P(-34, 0)[0]} cy={P(-34, -6)[1]} rx={30 * u} ry={14 * u} fill={SIL} />
			<ellipse cx={P(34, 0)[0]} cy={P(34, -6)[1]} rx={30 * u} ry={14 * u} fill={SIL} />
			{body(SIL)}
			{tube([shL, P(-74, -312), P(-82, -238)], 28 * u)}
			<circle cx={P(-84, -224)[0]} cy={P(-84, -224)[1]} r={20 * u} fill={SIL} />
			{tube([P(0, -430), P(0, -470)], 34 * u)}
			{hair(0, 0, SIL)}
			{tube([shR, El, Wr], 27 * u)}
			<circle cx={fist[0]} cy={fist[1]} r={lerp(21, 17, rel) * u} fill={SIL} />
			{rel > 0.05
				? [-1, 0, 1].map((k) => <line key={k} x1={f1(fist[0])} y1={f1(fist[1])} x2={f1(fist[0] + Math.cos(fd + k * 0.35) * 40 * u * rel)} y2={f1(fist[1] + Math.sin(fd + k * 0.35) * 40 * u * rel)} stroke={SIL} strokeWidth={10 * u} strokeLinecap="round" />)
				: null}
			{/* the red bow clip — our mark, the only colour on her */}
			<g transform={`translate(${f1(head[0] - 62 * u)} ${f1(head[1] - 70 * u)}) rotate(-24) scale(${(u * 0.62).toFixed(4)})`}>
				<path d="M0,0 L-54,-30 L-58,30 Z M0,0 L54,-30 L58,30 Z" fill={MILK.clip} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
				<circle r={16} fill={MILK.clipD} stroke={INK} strokeWidth={8} />
			</g>
		</Svg>
	);
};

// ======================================================================= 9 · ON THE RUN (12.66 – 15.02)
// one compound move, desaturated like the part-1 flashback: car window at night → rain on a tin roof (push into the shack's lit
// window) → inside, a little hand drags the curtain aside to the sun → it lets go → the curtain slips back by itself
export const OnTheRun: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const tRain = W(43); // «run.»  13.33 streaks melt into rain on the tin roof
	const tCur = W(44); // «Barely» 13.84 the little hand pulls the curtain aside
	const tFall = W(46); // «outside.» 14.38 the curtain falls shut by itself
	const aB = seg(t, tRain - 0.16, tRain + 0.04); // road → shack
	const aC = seg(t, tCur - 0.2, tCur - 0.06); // shack window → inside
	// per-layer push: A drifts in on the glass, B pushes into the shack's lit window, C settles from 1.3 and keeps creeping
	const zA = lerp(1.03, 1.2, seg(t, t0, tRain + 0.04, lin)) + 0.25 * seg(t, tRain - 0.16, tRain + 0.04, easeIn2);
	const zB = lerp(1.08, 2.1, seg(t, tRain - 0.16, tCur - 0.06, easeIn2));
	const zC = lerp(1.34, 1.04, seg(t, tCur - 0.2, tCur + 0.3, easeOut)) + 0.04 * seg(t, tCur + 0.3, t1 + 0.3, lin);
	// curtain: nearly shut (a strip of sun) → dragged open on «Barely» → let go → falls shut on «outside.» with a little bounce
	const pull = seg(t, tCur - 0.02, tCur + 0.3, easeOut);
	const fallK = seg(t, tFall, tFall + 0.3, easeIn2);
	const ba = t - tFall - 0.3;
	const settle = ba > 0 ? 0.06 * Math.exp(-ba * 7) * Math.abs(Math.sin(ba * 14)) : 0;
	const open = Math.max(0, lerp(0.1, 0.46, pull) * (1 - fallK)) + settle;
	// she stands at the window, backlit (a silhouette, only the red clip keeps its colour): her arm comes up and grips the free edge
	// on «Barely», drags it aside, lets go and drops BEFORE the curtain falls back by itself on «outside.»
	const reach = seg(t, tCur - 0.2, tCur - 0.02, easeOut) * (1 - seg(t, tFall - 0.16, tFall + 0.06, easeInOut));
	const rel = seg(t, tFall - 0.2, tFall - 0.1);
	const ex = curtainEdge(t < tFall - 0.16 ? open : 0.46).x;
	const grip: P2 = [ex + 12, 1062 + Math.sin(t * 9) * 3 * (1 - rel)];
	const lit = clamp01(open / 0.46);
	return (
		<>
		<Cam t={t} z={1.03 + kick(t, [tRain, tCur, tFall], 0.025)} oy={720} hits={[tCur, tFall]} amp={4} tremor={1.1} filter={FLASHBACK_FILTER}>
			{aB < 1 ? (
				<AbsoluteFill style={{transform: `scale(${zA.toFixed(4)})`, transformOrigin: '540px 710px', opacity: 1 - aB}}>
					<RoadWindow t={t} speed={1.15} rain={seg(t, t0 + 0.2, tRain - 0.05)} />
				</AbsoluteFill>
			) : null}
			{aB > 0 && aC < 1 ? (
				<AbsoluteFill style={{transform: `scale(${zB.toFixed(4)})`, transformOrigin: `${SHACK.window.x + SHACK.window.w / 2}px ${SHACK.window.y + SHACK.window.h / 2}px`, opacity: aB * (1 - aC)}}>
					<Shack t={t} night={1} rain={1} ocean={false} palm={false} />
				</AbsoluteFill>
			) : null}
			{aC > 0 ? (
				<AbsoluteFill style={{transform: `scale(${zC.toFixed(4)})`, transformOrigin: '540px 700px', opacity: aC}}>
					<CurtainWindow t={t} open={open} sway={1 - 0.6 * pull * (1 - fallK)} />
					<GirlBackSil x={470} y={1500} H={720} t={t} reach={reach} grip={grip} rel={rel} lit={lit} />
				</AbsoluteFill>
			) : null}
		</Cam>
		{/* same flashback look as TakeHer / Mom (sepia, grain, vignette) → NotRun's colour snap reads as «back in the store» */}
		<FlashbackGrain t={t} k={1} vig={0.5} />
		</>
	);
};

// ======================================================================= 10 · NOT RUN (15.02 – 15.90)
// colour snaps back: the store from a child's height, a little wider (owner fix 26.10: «the girl floats, unclear shot»). The
// stepdad — navy coat cropped at the chest (never a face), charcoal trousers, brown shoes, BOTH hands in his coat pockets, white
// cuff + gold watch at the right one (screen right) — and the whole girl (red clip, looking up at him, her fist on the cart's red
// grip, the other hand hanging) stand on ONE floor: soles on the same line, soft contact shadows, the true child-to-adult scale
// (her head at his coat pocket). The fridges are set back (smaller cartons, soft). On «run.» shoppers hurry past BEHIND them
// (side view, cropped at the chest like him, soft motion blur) — he doesn't move. All hands here are drawn locally (no kit HandG).
// Depth: an object at depth r (1 = the pair) stands on y = nrY(r) and is NR.k·r px per metre.
const NR = {fy: 1088, yh: 560, k: 740, mx: 232, gx: 594, gs: 1.48, cx: 1150, cs: 0.92} as const;
const nrY = (r: number) => NR.yh + (NR.fy - NR.yh) * r;
const NR_FRIDGE = 0.72; // the dairy fridges
const NR_PASS = 0.9; // the shoppers' lane, just behind the pair
const NR_CART = 0.97; // the cart, just behind her
/** limb direction for an angle from straight DOWN (deg, + toward +x) */
const nrDir = (a: number): P2 => [Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];
const nrAng = (a: P2, b: P2) => (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
const nrAdd = (a: P2, d: P2, k: number): P2 => [a[0] + d[0] * k, a[1] + d[1] * k];
const nrD = (pts: P2[]) => 'M' + pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' L');
/** inked tubes: all ink first, then all fills, so the joints merge */
const NrTubes: React.FC<{segs: {pts: P2[]; w: number; c: string}[]; lw: number}> = ({segs, lw}) => (
	<g fill="none" strokeLinecap="round" strokeLinejoin="round">
		{segs.map((s, i) => <path key={`o${i}`} d={nrD(s.pts)} stroke={INK} strokeWidth={s.w + 2 * lw} />)}
		{segs.map((s, i) => <path key={`f${i}`} d={nrD(s.pts)} stroke={s.c} strokeWidth={s.w} />)}
	</g>
);

/** back wall, three dairy fridges set back at NR_FRIDGE (kit B, soft), the polished floor in perspective, cold mist at their base */
const NRStore: React.FC<{t: number}> = ({t}) => {
	const ff = nrY(NR_FRIDGE);
	const sf = 0.467; // fridge units → px: a carton ≈ 0.25 m at that depth
	const top = ff - 1720 * sf;
	const span = NR.fy - NR.yh;
	const colX = (X: number, y: number) => 540 + (X - 540) * ((y - NR.yh) / span);
	return (
		<>
			<AbsoluteFill style={{background: '#253041'}} />
			{[-14, 472, 958].map((L, i) => (
				<div key={i} style={{position: 'absolute', left: L, top, width: 1080, height: 1920, transform: `scale(${sf})`, transformOrigin: '0 0'}}>
					<DairyFridge t={t + i * 0.7} mist={0} blur={9} dim={0.08} />
				</div>
			))}
			<Svg>
				<defs>
					<linearGradient id="nrFloor" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#C2CCD4" />
						<stop offset="0.35" stopColor="#D9E0E5" />
						<stop offset="1" stopColor="#E9EDF0" />
					</linearGradient>
				</defs>
				<rect x={-80} y={ff} width={1240} height={1920 - ff + 120} fill="url(#nrFloor)" />
				{/* the fridges' glow on the polished floor */}
				<rect x={-80} y={ff} width={1240} height={46} fill="#F4FBFF" opacity={0.55} />
				{[0.8, 0.9, 1.03, 1.2, 1.42, 1.72, 2.12, 2.65].map((r, i) => (
					<line key={`r${i}`} x1={-80} y1={nrY(r)} x2={1160} y2={nrY(r)} stroke="#AEB8C1" strokeWidth={1.6 + r * 1.2} />
				))}
				{Array.from({length: 13}, (_, i) => {
					const X = 540 + (i - 6) * 300 + 150;
					return <line key={`c${i}`} x1={colX(X, ff)} y1={ff} x2={colX(X, 2040)} y2={2040} stroke="#AEB8C1" strokeWidth={2.5} />;
				})}
				<line x1={-80} y1={ff} x2={1160} y2={ff} stroke={INK} strokeWidth={5} />
				<VaporStream t={t} x0={-80} x1={1160} y={ff + 14} n={6} size={64} dur={2.6} dx={60} dy={26} spread={90} k={0.55} seed={4} />
			</Svg>
		</>
	);
};

type NRLook = {coat: string; legs: string; shoe: string; basket?: boolean};
/** a shopper hurrying past in side view, cropped at the chest by the frame top (no neck / head is ever drawn); (x, y) = floor
 *  under the hips (px), k px per metre, dir = walking direction, d = metres walked (→ stride). Drawn in cm. */
const NRPasserG: React.FC<{x: number; y: number; k: number; dir: 1 | -1; d: number; look: NRLook}> = ({x, y, k, dir, d, look}) => {
	const sc = k / 100;
	const lw = 5.5 / sc;
	const ph = (d / 1.35) * Math.PI * 2;
	const hipY = -97 + 9 * (1 - Math.abs(Math.cos(ph)));
	const legC = (far: boolean) => (far ? mix(look.legs, '#000000', 0.25) : look.legs);
	const leg = (o: number, far: boolean) => {
		const p = ph + o;
		const a = 26 * Math.sin(p);
		const b = 48 * Math.pow(Math.max(0, Math.cos(p)), 1.5); // the knee folds while the leg swings forward
		const H: P2 = [0, hipY];
		const K = nrAdd(H, nrDir(a), 47);
		const A = nrAdd(K, nrDir(a - b), 45);
		return (
			<g key={far ? 'lf' : 'ln'}>
				<NrTubes lw={lw} segs={[{pts: [H, K, A], w: 15, c: legC(far)}]} />
				<g transform={`translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(-(a - b) * 0.35)})`}>
					<path d="M-7,-5 L8,-7 Q21,-6 24,1 L24,5 L-8,5 Q-10,0 -7,-5 Z" fill={far ? mix(look.shoe, '#000000', 0.2) : look.shoe} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M-8,3 L24,3" stroke={mix(look.shoe, '#000000', 0.45)} strokeWidth={lw * 1.1} />
				</g>
			</g>
		);
	};
	const arm = (o: number, far: boolean) => {
		const c = look.basket && !far ? -4 * Math.sin(ph) : -22 * Math.sin(ph + o);
		const S: P2 = [3, -150];
		const E = nrAdd(S, nrDir(c), 31);
		const Wr = nrAdd(E, nrDir(c + (look.basket && !far ? 4 : 16)), 27);
		const sleeve = far ? mix(look.coat, '#000000', 0.25) : look.coat;
		const ha = nrAng(E, Wr);
		return (
			<g key={far ? 'af' : 'an'}>
				<NrTubes lw={lw} segs={[{pts: [S, E, Wr], w: 12, c: sleeve}]} />
				{look.basket && !far ? (
					<g transform={`translate(${f1(Wr[0])} ${f1(Wr[1] + 6)})`}>
						<path d="M-15,4 Q0,-12 15,4" stroke={INK} strokeWidth={4 + lw * 2} fill="none" strokeLinecap="round" />
						<path d="M-15,4 Q0,-12 15,4" stroke="#B9222F" strokeWidth={4} fill="none" strokeLinecap="round" />
						<path d="M-24,4 L24,4 L19,30 L-19,30 Z" fill="#D8343F" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
						{[-12, 0, 12].map((u) => <rect key={u} x={u - 3.5} y={10} width={7} height={13} rx={2} fill="#9E1C27" />)}
					</g>
				) : null}
				<g transform={`translate(${f1(Wr[0])} ${f1(Wr[1])}) rotate(${f1(-ha)})`}>
					<ellipse cx={0} cy={7} rx={5.5} ry={9} fill={SKIN} stroke={INK} strokeWidth={lw} />
				</g>
			</g>
		);
	};
	return (
		<g transform={`translate(${f1(x)} ${f1(y)}) scale(${(sc * dir).toFixed(3)} ${sc.toFixed(3)})`}>
			<ellipse cx={4} cy={1} rx={30} ry={3} fill="rgba(0,0,0,0.16)" />
			{arm(Math.PI, true)}
			{leg(0, true)}
			<g transform={`rotate(5 0 ${f1(hipY)})`}>
				<path d={`M-15,${f1(hipY + 26)} L-13,-260 L14,-260 L17,${f1(hipY + 26)} Q1,${f1(hipY + 30)} -15,${f1(hipY + 26)} Z`} fill={look.coat} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d={`M10,${f1(hipY + 24)} L9,-200`} stroke={mix(look.coat, '#000000', 0.25)} strokeWidth={lw} />
			</g>
			{leg(Math.PI, false)}
			{arm(0, false)}
		</g>
	);
};

/** the stepdad from a child's height, drawn in cm, (x, y) = floor between his feet: navy coat cropped at the chest by the frame
 *  top (no face), both hands in the coat pockets (white cuffs; the gold watch on the screen-right wrist), charcoal trousers,
 *  brown shoes planted. Only the coat breathes. */
const NRManG: React.FC<{t: number; x: number; y: number; glint: number}> = ({t, x, y, glint}) => {
	const sc = NR.k / 100;
	const lw = 6 / sc;
	const sw = Math.sin(t * 1.6) * 0.45;
	const hem = -70;
	const shoe = (cx: number, s: 1 | -1) => (
		<g transform={`translate(${cx} 0) scale(${s} 1)`}>
			<path d="M-7,-9.5 L6,-10.5 Q17,-9.5 20,-4 Q21.5,0 18,0 L-8,0 Q-10,-5 -7,-9.5 Z" fill="#5A3A22" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d="M2,-8.5 Q10,-7.5 15.5,-3.8" stroke="#7E5435" strokeWidth={lw * 1.1} fill="none" strokeLinecap="round" />
			<path d="M-8,-1.2 L19,-1.2" stroke="#2E1C10" strokeWidth={lw * 1.3} strokeLinecap="round" />
		</g>
	);
	const leg = (cx: number, c: string) => (
		<g>
			<path d={`M${cx - 9},-92 L${cx + 9},-92 L${cx + 7.2},-8 Q${cx},-6 ${cx - 7.2},-8 Z`} fill={c} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d={`M${cx + 1.2},-84 L${cx + 0.8},-11`} stroke="#4A5266" strokeWidth={lw * 0.9} strokeLinecap="round" />
		</g>
	);
	// an arm bent into its pocket: the sleeve hangs at the side of the coat (shoulder above the frame) to the elbow, the forearm
	// comes in to the slanted pocket welt; sleeve → white cuff → (watch) → under the welt: the hand is inside
	const arm = (s: 1 | -1, watch: boolean) => {
		const S: P2 = [25.5 * s, -232];
		const E: P2 = [33.5 * s, -112];
		const Wr: P2 = [18.5 * s, -86.5];
		const L = Math.hypot(Wr[0] - E[0], Wr[1] - E[1]);
		const u: P2 = [(Wr[0] - E[0]) / L, (Wr[1] - E[1]) / L];
		const n: P2 = [u[1], -u[0]];
		const sleeveEnd = nrAdd(Wr, u, -11);
		const ang = nrAng(E, Wr);
		const wp = nrAdd(Wr, u, -2);
		const C = nrAdd(Wr, u, 2.6);
		const q = (a: number, b: number) => nrAdd(nrAdd(C, n, a), u, b);
		const welt = [q(-7.8, -2.6), q(7.8, -2.6), q(7.8, 2.6), q(-7.8, 2.6)];
		const bulge = nrAdd(Wr, u, 9);
		return (
			<g>
				{/* the hand inside the pocket: a soft bulge under the welt */}
				<ellipse cx={bulge[0]} cy={bulge[1]} rx={6.2} ry={4.6} fill={MILK.coatL} opacity={0.32} transform={`rotate(${f1(-ang)} ${f1(bulge[0])} ${f1(bulge[1])})`} />
				<NrTubes lw={lw} segs={[{pts: [sleeveEnd, Wr], w: 8, c: MILK.cuff}]} />
				<NrTubes lw={lw} segs={[{pts: [S, E, sleeveEnd], w: 12.5, c: MILK.coat}]} />
				<path d={nrD([nrAdd(E, u, 2), nrAdd(sleeveEnd, u, -2)])} stroke={MILK.coatL} strokeWidth={lw * 0.9} strokeLinecap="round" transform={`translate(${-2.6 * s} -1)`} opacity={0.6} />
				<path d={nrD([[S[0] - 2.8 * s, -232], [E[0] - 2.4 * s, E[1] - 4]])} stroke={MILK.coatL} strokeWidth={lw * 0.9} strokeLinecap="round" opacity={0.45} />
				{watch ? (
					<g transform={`translate(${f1(wp[0])} ${f1(wp[1])}) rotate(${f1(-ang)})`}>
						<rect x={-4.3} y={-1.6} width={8.6} height={3.2} rx={1} fill={MILK.strap} stroke={INK} strokeWidth={lw * 0.7} />
						<circle r={2.6} fill={MILK.watch} stroke={INK} strokeWidth={lw * 0.8} />
						<circle r={1.75} fill={MILK.dial} />
						<line x1={0} y1={0} x2={0} y2={-1.4} stroke={INK} strokeWidth={0.45} strokeLinecap="round" transform={`rotate(${f1(40 + t * 24)})`} />
						<line x1={0} y1={0} x2={0} y2={-0.9} stroke={INK} strokeWidth={0.6} strokeLinecap="round" transform={`rotate(${f1(-70 + t * 4)})`} />
						<circle r={0.35} fill={INK} />
						{glint > 0.01 ? (
							<path d="M0,-6 L1,-1 L6,0 L1,1 L0,6 L-1,1 L-6,0 L-1,-1 Z" fill="#fff" stroke={INK} strokeWidth={0.4} transform={`translate(2.6 -2.6) scale(${f1(glint * 1.1 + 0.001)}) rotate(${f1(t * 90)})`} />
						) : null}
					</g>
				) : null}
				{/* the pocket welt over the wrist — the hand is inside */}
				<path d={nrD(welt) + ' Z'} fill={MILK.coatD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			</g>
		);
	};
	return (
		<g transform={`translate(${f1(x)} ${f1(y)}) scale(${sc.toFixed(3)})`}>
			<ellipse cx={0} cy={0.6} rx={33} ry={3.2} fill="rgba(20,28,40,0.28)" filter="url(#nrSoft)" />
			<ellipse cx={-17} cy={0.2} rx={13} ry={1.6} fill="rgba(20,28,40,0.35)" filter="url(#nrSoft)" />
			<ellipse cx={17} cy={0.2} rx={13} ry={1.6} fill="rgba(20,28,40,0.35)" filter="url(#nrSoft)" />
			{leg(-10.5, '#2B303D')}
			{leg(10.5, '#353B4A')}
			{shoe(-10.5, -1)}
			{shoe(10.5, 1)}
			<g transform={`translate(${f1(sw)} 0)`}>
				<path d={`M-25.5,${hem} L-25,-232 L25,-232 L25.5,${hem} Q13,${hem + 2.2} 1.5,${hem} Q-12,${hem + 2.2} -25.5,${hem} Z`} fill={MILK.coat} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d={`M1.5,${hem + 0.5} L2.2,-232`} stroke={MILK.coatD} strokeWidth={lw * 1.1} />
				<path d={`M-24.6,${hem - 4} L24.6,${hem - 4}`} stroke={MILK.coatD} strokeWidth={lw * 0.8} opacity={0.6} />
				{[-100, -124, -148].map((yy) => (
					<circle key={yy} cx={4.6} cy={yy} r={1.5} fill={MILK.coatL} stroke={INK} strokeWidth={lw * 0.7} />
				))}
				{arm(-1, false)}
				{arm(1, true)}
			</g>
		</g>
	);
};

// her two hands (girl units, wrist (0, 0), the hand toward +y): one outline with the forearm (no seam at the wrist), simple
// cartoon fingers — a relaxed hanging hand (thumb in front on the +x side, fingers loosely curled) and a fist round a bar
// (knuckles at the far end, the thumb wrapped over the bar on the +x side)
const NR_HANG =
	'M-12,-6 C-13.5,8 -14.2,18 -14,27 C-14.6,33 -14.2,40 -11,41.5 C-8.6,42.5 -7.6,39 -7.6,36.5 C-7.8,42 -7.2,47 -4.4,47.6 ' +
	'C-1.6,48.2 -1.3,43 -1.3,39.5 C-1.2,45 -0.6,50.2 2.3,50.2 C5.2,50.2 5.6,45 5.4,40 C5.8,44.5 6.6,47.8 9,47.6 ' +
	'C12,47.4 12.4,42 12.2,37 C12.6,28 13.6,12 12,-6 Z';
const NrHangDetail: React.FC<{lw: number}> = ({lw}) => (
	<g fill="none" strokeLinecap="round">
		{/* finger splits, then the thumb lying in front along the inner edge */}
		<path d="M-7.6,36.5 L-7.4,30.5 M-1.3,39.5 L-1.2,31 M5.4,40 L5.2,31.5" stroke={INK} strokeWidth={lw * 0.7} />
		<path d="M9.2,9.5 C14.5,10.5 17.4,17 17.6,24 C17.8,30 16.2,34.6 13.2,34.6 C10.4,34.6 9.8,31 10.1,27 C10.4,21.5 9.4,16.5 7.2,13.4 Z" fill={SKIN} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
	</g>
);
const NR_FIST =
	'M-14,-6 C-16,8 -16.5,20 -15.5,29 Q-15.2,36.8 -10.2,37.4 Q-7.6,41 -5,37.9 Q-2.5,41.2 0,37.9 Q2.5,41.2 5,37.9 Q7.6,41 10.2,37.4 ' +
	'Q15,36.8 15.5,29 C16.5,20 16,8 14,-6 Z';
const NrFistDetail: React.FC<{lw: number}> = ({lw}) => (
	<g fill="none" strokeLinecap="round">
		{/* the knuckle line and the finger splits, then the thumb wrapped over the bar */}
		<path d="M-12.5,27.5 Q0,30.5 12.5,27.5" stroke={SKIN_D} strokeWidth={lw * 0.9} />
		<path d="M-5,37.9 L-5.2,32 M0,37.9 L0,32.6 M5,37.9 L5.2,32" stroke={INK} strokeWidth={lw * 0.7} />
		<path d="M13,10 C20,12 23,19 21,25 C19.5,29 15,28.5 14.5,25 C14.5,21 13,17 10,15 Z" fill={SKIN} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
	</g>
);
/** an arm of tubes + a hand as ONE inked silhouette: ink of tubes and hand, then their fills, then the hand's details */
const NrArmG: React.FC<{segs: {pts: P2[]; w: number; c: string}[]; lw: number; at: P2; rot: number; hs?: number; sil: string; detail: React.ReactNode}> = ({segs, lw, at, rot, hs = 1, sil, detail}) => {
	const xf = `translate(${f1(at[0])} ${f1(at[1])}) rotate(${f1(rot)}) scale(${hs})`;
	return (
		<g strokeLinecap="round" strokeLinejoin="round">
			{segs.map((s, i) => <path key={`o${i}`} d={nrD(s.pts)} stroke={INK} strokeWidth={s.w + 2 * lw} fill="none" />)}
			<path d={sil} transform={xf} fill={INK} stroke={INK} strokeWidth={(2 * lw) / hs} />
			{segs.map((s, i) => <path key={`f${i}`} d={nrD(s.pts)} stroke={s.c} strokeWidth={s.w} fill="none" />)}
			<path d={sil} transform={xf} fill={SKIN} />
			<g transform={xf}>{detail}</g>
		</g>
	);
};

/** the girl, whole (kit A GirlG body numbers moved down 20 so her SOLES sit on y 0 — the kit figure stands 20 units in the air),
 *  with her own hands: the screen-right fist on `grip` (frame px, the cart's red grip), the other hanging. (x, y) = floor px. */
const NRGirlG: React.FC<{t: number; x: number; y: number; s: number; grip: P2; look: P2; turn: number}> = ({t, x, y, s, grip, look, turn}) => {
	const cid = 'nrg' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const lw = 3.7;
	const bob = Math.sin(t * 2.2) * 1.6;
	const sh = (p: P2): P2 => [p[0], p[1] + bob];
	// legs: straight, a hair apart; shoes splay out (left one mirrored)
	const leg = (hx: number, a: number, back: boolean) => {
		const H: P2 = [hx, -176];
		const K = nrAdd(H, nrDir(a), 84);
		const A = nrAdd(K, nrDir(a), 80);
		// the round caps of the leg / sock tubes reach w/2 + lw below their end point, the sole ends at A + 12: so both tubes stop
		// 10–12 units above A (caps end at ≈ A + 9.7, inside the shoe) — no white «wheel» under the sneaker
		const legEnd = nrAdd(A, nrDir(a), -10);
		const sockTop = nrAdd(A, nrDir(a), -24);
		const sockEnd = nrAdd(A, nrDir(a), -12);
		return (
			<g key={back ? 'b' : 'f'}>
				<NrTubes lw={lw} segs={[{pts: [H, K, legEnd], w: 32, c: back ? mix(SKIN, SKIN_D, 0.3) : SKIN}]} />
				<NrTubes lw={lw} segs={[{pts: [sockTop, sockEnd], w: 36, c: MILK.sock}]} />
				<g transform={`translate(${f1(A[0])} ${f1(A[1])}) scale(${back ? -1 : 1} 1)`}>
					<path d="M-24,-14 L18,-18 Q50,-16 56,2 L56,12 L-26,12 Q-32,-2 -24,-14 Z" fill={MILK.shoe} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M-26,6 L56,6" stroke={MILK.shoeD} strokeWidth={lw * 1.2} />
					<path d="M30,-12 Q46,-10 54,0" stroke={MILK.clip} strokeWidth={lw} fill="none" strokeLinecap="round" />
					<circle cx={6} cy={-10} r={4} fill={MILK.clip} />
				</g>
			</g>
		);
	};
	// arms: left (screen-left, toward him) hangs; right reaches out to the grip (IK, the elbow below)
	const SL = sh([-60, -372]);
	const SR = sh([58, -374]);
	const EL = nrAdd(SL, nrDir(-13 + Math.sin(t * 2.2) * 0.8), 84);
	const WL = nrAdd(EL, nrDir(-7 + Math.sin(t * 2.2 - 0.5) * 1.2), 76);
	const G: P2 = [(grip[0] - x) / s, (grip[1] - y) / s];
	const FIST = 22; // wrist → fist centre (girl units)
	let WR: P2 = nrAdd(G, nrDir(nrAng(SR, G)), -FIST);
	let ER = ik(SR, WR, 84, 76, 'down');
	for (let i = 0; i < 2; i++) {
		WR = nrAdd(G, nrDir(nrAng(ER, WR)), -FIST);
		ER = ik(SR, WR, 84, 76, 'down');
	}
	const armSegs = (S: P2, E: P2, Wr: P2) => {
		const sl: P2 = [lerp(S[0], E[0], 0.42), lerp(S[1], E[1], 0.42)];
		return [
			{pts: [S, sl], w: 42, c: MILK.shirt},
			{pts: [sl, E], w: 27, c: SKIN},
			{pts: [E, Wr], w: 25, c: SKIN},
		];
	};
	const shirt = 'M-44,-396 L44,-396 Q70,-390 76,-368 L68,-230 L-68,-230 L-76,-368 Q-70,-390 -44,-396 Z';
	return (
		<g transform={`translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(3)})`}>
			<ellipse cx={4} cy={2} rx={96} ry={11} fill="rgba(20,28,40,0.26)" filter="url(#nrSoftK)" />
			<ellipse cx={-48} cy={1} rx={34} ry={5} fill="rgba(20,28,40,0.32)" filter="url(#nrSoftK)" />
			<ellipse cx={52} cy={1} rx={34} ry={5} fill="rgba(20,28,40,0.32)" filter="url(#nrSoftK)" />
			{leg(-24, -3, true)}
			{leg(24, 3, false)}
			<g transform={`translate(0 ${f1(bob)})`}>
				<path d="M-60,-242 L60,-242 L84,-160 L-84,-160 Z" fill={MILK.denim} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d="M-58,-230 L58,-230" stroke={MILK.denimD} strokeWidth={lw} />
				<path d="M20,-216 L44,-216 L46,-192 Q32,-186 20,-192 Z" fill={MILK.denimD} stroke={INK} strokeWidth={lw * 0.6} />
				<defs>
					<clipPath id={cid}>
						<path d={shirt} />
					</clipPath>
				</defs>
				<path d={shirt} fill={MILK.shirt} />
				<g clipPath={`url(#${cid})`}>
					{[0, 1, 2, 3].map((i) => (
						<rect key={i} x={-90} y={-372 + i * 38} width={180} height={15} fill={MILK.stripe} />
					))}
				</g>
				<path d={shirt} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<rect x={-14} y={-424} width={28} height={34} fill={SKIN} stroke={INK} strokeWidth={lw} />
				<path d="M-26,-396 Q0,-378 26,-396" stroke={MILK.shirtD} strokeWidth={lw * 1.6} fill="none" strokeLinecap="round" />
				<g transform={`translate(0 -488) rotate(${f1(-3 + Math.sin(t * 1.7) * 1.2)}) scale(0.5)`}>
					<GirlFaceG t={t} expr="wonder" look={look} turn={turn} lw={lw / 0.5} />
				</g>
			</g>
			{/* the hanging arm (toward him) and the reaching arm, her fist round the cart's push bar just under the red grip */}
			<NrArmG lw={lw} segs={armSegs(SL, EL, WL)} at={WL} rot={-nrAng(EL, WL)} hs={1.22} sil={NR_HANG} detail={<NrHangDetail lw={lw / 1.22} />} />
			<NrArmG lw={lw} segs={armSegs(SR, ER, WR)} at={WR} rot={-nrAng(ER, WR)} hs={1.12} sil={NR_FIST} detail={<NrFistDetail lw={lw / 1.12} />} />
		</g>
	);
};

export const NotRun: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const tRun = W(49); // «run.» 15.32 shoppers hurry past behind them
	const snap = seg(t, t0, t0 + 0.14, easeOut);
	const z = lerp(1.03, 1.075, seg(t, t0, t1 + 0.3, lin)) + kick(t, [tRun], 0.02);
	const kp = NR.k * NR_PASS;
	const yp = nrY(NR_PASS);
	// shopper B (maroon coat) comes in from the right just before «run.»; shopper A (mustard coat) from the left on «run.»
	// B's stride phase is offset (+0.45 m) so that while his coat crosses the frame edge both arms hang inside the coat outline —
	// the first frames of him show a body, not a lone blurred hand ahead of it (the near arm swings forward only once the coat is in)
	const aT = tRun - 0.04;
	const bT = t0 + 0.16;
	const bPh = 0.45;
	const ax = -260 + 1400 * (t - aT);
	const bx = 1330 - 1450 * (t - bT);
	// the cart's red grip (kit B: ball at (−318, −648), push bar down to (−252, −562), cart units); her fist closes on the bar
	// just under the ball, so the red ball still shows above her thumb
	const ball: P2 = [NR.cx - 318 * NR.cs, nrY(NR_CART) - 648 * NR.cs];
	const bar = Math.hypot(66, 86);
	const grip: P2 = [ball[0] + (66 / bar) * 38, ball[1] + (86 / bar) * 38];
	return (
		<>
			<Cam t={t} z={z} ox={560} oy={700} hits={[tRun]} amp={3} tremor={0.9} filter={`saturate(${lerp(0.42, 1, snap).toFixed(3)}) sepia(${lerp(0.3, 0, snap).toFixed(3)})`}>
				<NRStore t={t} />
				<Svg>
					<defs>
						<filter id="nrMB" x="-60%" y="-10%" width="220%" height="120%">
							<feGaussianBlur stdDeviation="10 1.2" />
						</filter>
					</defs>
					<g filter="url(#nrMB)">
						{bx > -300 && bx < 1400 ? <NRPasserG x={bx} y={yp} k={kp} dir={-1} d={(1330 - bx) / kp + bPh} look={{coat: '#8E3B4A', legs: '#6B6F78', shoe: '#2A2526'}} /> : null}
						{ax > -300 && ax < 1400 ? <NRPasserG x={ax} y={yp} k={kp} dir={1} d={(ax + 260) / kp} look={{coat: '#C8963E', legs: '#3E5F99', shoe: '#EDEAE4'}} /> : null}
					</g>
				</Svg>
				<ShoppingCart x={NR.cx} y={nrY(NR_CART)} s={NR.cs} t={t} rattle={0} />
				<Svg>
					<defs>
						<filter id="nrSoft" x="-50%" y="-300%" width="200%" height="700%">
							<feGaussianBlur stdDeviation="0.9" />
						</filter>
						<filter id="nrSoftK" x="-50%" y="-300%" width="200%" height="700%">
							<feGaussianBlur stdDeviation="4.5" />
						</filter>
					</defs>
					<NRManG t={t} x={NR.mx} y={NR.fy} glint={bump(t, t0 + 0.34, 0.32)} />
					<NRGirlG t={t} x={NR.gx} y={NR.fy} s={NR.gs} grip={grip} look={[-0.72, -0.78]} turn={-0.32} />
				</Svg>
			</Cam>
			<Flash a={t - t0} dur={0.1} max={0.55} />
		</>
	);
};

// ======================================================================= 11 · NOT HIDE (15.90 – 17.36)
// mid shot from her height in the aisle: his watch hand lowers the carton over the cart and on «hide» just lets go — it drops in like
// any milk (her face happens to land toward us; never shown off). On «carton.» her small hand is on the rail and the cart rolls on;
// the music is gone, so the cart, the aisle and the floor mist slow to a crawl (never a full freeze).
export const NotHide: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const tHide = W(52); // 16.20 he lets go
	const tCart = W(54); // 16.58 the cart rolls on
	const tCut = 17.09; // music out (end of «carton.»): everything slows to a crawl
	const ts = t < tCut ? t : tCut + (t - tCut) * 0.22;
	const cy = 1080;
	const cs = 1.05;
	// the cart rolls on DOWN the aisle toward the checkouts: progress p (eases into a crawl after the music cut) moves it a little
	// right and AWAY from us (scaled about the aisle's vanishing point), while the shelves dolly past a bit faster
	const p = keys(t, [[tCart, 0], [tCart + 0.2, 0.14], [tCut, 0.77], [tCut + 0.35, 0.94], [t1 + 0.4, 1]], lin);
	const cx = 470 + 70 * p;
	const deep = 1 - 0.2 * p;
	const speed = t < tCart ? 0 : t < tCut ? 1 : Math.max(0.15, 1 - (t - tCut) * 2.6);
	// carton: comes down with the hand (above the rim), released on «hide», drops onto the basket floor and settles
	const S = 0.42;
	const holdY = 470;
	const floorY = cy - 290 * cs - 8;
	const a = t - tHide;
	const fallY = a <= 0 ? keys(t, [[t0, 160], [t0 + 0.24, holdY - 10], [tHide, holdY]], easeOut) : Math.min(floorY, holdY + 0.5 * 12000 * a * a);
	const land = tHide + Math.sqrt((2 * (floorY - holdY)) / 12000);
	const la = t - land;
	const squash = la >= 0 ? 0.55 * Math.exp(-la * 9) * Math.abs(Math.cos(la * 22)) : 0;
	const tilt = a <= 0 ? Math.sin(t * 5) * 1.5 : la < 0 ? a * 30 : 7 + wobble(la, 20, 7) * 6;
	const ox = (a <= 0 ? cx + 30 : lerp(cx + 30, cx + 10, clamp01(a / 0.2))) + (t > tCart ? 0 : 0);
	// his hand: rides with the carton, opens on «hide», then lifts away fast
	const rel = seg(t, tHide, tHide + 0.07);
	const up = seg(t, tHide + 0.05, tHide + 0.42, easeIn2) * 900;
	const hand = t < tHide + 0.45 ? {x: a <= 0 ? ox : cx + 30, y: (a <= 0 ? fallY : holdY) - up, rot: 0, rel} : null;
	// her small hand: comes up from below and grips the rail by the handle just before the cart rolls on
	const herK = seg(t, tCart - 0.2, tCart - 0.02, easeOut);
	const rail: P2 = [cx - 236 * cs + 14, cy - 560 * cs + 8];
	// her arm comes in from the left edge (she walks just outside the frame), the angle follows the hand
	const KS = 0.7;
	const SHk: P2 = [-220, 650];
	const kg: P2 = [lerp(-60, rail[0], herK), lerp(700, rail[1], herK) + Math.sin(ts * 7) * 2];
	let kr = 70;
	for (let k = 0; k < 3; k++) {
		const w = wristAt(handGrip('kid'), kg, KS, kr);
		kr = (Math.atan2(-(SHk[0] - w[0]), SHk[1] - w[1]) * 180) / Math.PI;
	}
	const kw = wristAt(handGrip('kid'), kg, KS, kr);
	const kArm = Math.hypot(SHk[0] - kw[0], SHk[1] - kw[1]) / (KS * 0.6) + 150;
	const z = 1.05 + 0.03 * seg(t, t0, t1, lin) + kick(t, [tHide, land, tCart], 0.022);
	return (
		<Cam t={t} z={z} oy={700} hits={[land]} amp={5} tremor={t < tCut ? 1 : 0.4}>
			<StoreAisle t={ts} cam={ts * 140 + 300 * p} blur={2.5} />
			<AbsoluteFill style={{transform: `scale(${deep.toFixed(4)})`, transformOrigin: `${AISLE.vx}px ${AISLE.vy}px`}}>
				<ShoppingCart
					x={cx}
					y={cy}
					s={cs}
					t={ts}
					roll={220 * p}
					rattle={speed * 0.8 + (la >= 0 && la < 0.3 ? 1 - la / 0.3 : 0)}
					contents={<HeldCarton t={t} x={ox} y={fallY} s={S} rot={tilt} c={{squash, spark: bump(t, land + 0.2, 0.3) * 0.6}} hand={hand} />}
					// the near wires fade over the carton (MISSING + her face stay readable through the mesh)
					fade={{x: (ox - cx) / cs, y: -415, rx: 135, ry: 165, k: seg(t, tHide, land, lin)}}
				/>
				{herK > 0 ? <Hand kind="kid" gesture="grab" x={kw[0]} y={kw[1]} s={KS} rot={kr} arm={kArm} t={t} /> : null}
			</AbsoluteFill>
			<Svg>
				<VaporStream t={ts} x0={-120} x1={1200} y={1170} n={5} size={78} dur={2.8} dx={160} dy={30} spread={140} k={0.42} seed={9} />
			</Svg>
		</Cam>
	);
};

// ======================================================================= 12 · TWIST «He BUYS it.» (17.36 – 18.38)
// readable with the sound off: «He» his watch hand thumps the carton (face up) onto the checkout belt — card HE; «BUYS» the red
// scanner laser crosses HER printed face, BEEP flash, BUYS slams in orange (kick + shake); «it.» IT. lands and the till pops open.
// The carton rides the belt so the laser crosses the photo exactly on «BUYS» (laser x = 300 → 780 over 17.41 → 17.71, i.e. 0.3 s,
// her face at x 540 on 17.556); the red light stays on her face 0.2 s after the BEEP.
// The counter sits DY lower inside the camera; a full-bleed store-ceiling fill under it covers the strip the shift + shake would
// otherwise open at the top (it showed the composition's black on the hit).
const BUYS_SW = 0.3;
export const Buys: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const tHe = W(55); // 17.42
	const tBuys = W(56); // 17.556 MAIN HIT
	const tIt = W(57); // 17.748 till
	const sw0 = tBuys - BUYS_SW / 2;
	const sweep = (t - sw0) / BUYS_SW;
	const S = 0.47;
	const DY = 70; // the whole counter sits 70 px lower, the card takes the top
	const iy = BELT.itemY;
	const xHit = BELT.scan0 + (BELT.scan1 - BELT.scan0) * ((tBuys - sw0) / BUYS_SW); // where the laser is on «BUYS» (540)
	const x = xHit + (t - tBuys) * 100;
	const thump = tHe - 0.01;
	const yb = t < thump ? keys(t, [[t0, iy - 330], [thump, iy]], easeIn2) : iy;
	const la = t - thump;
	const squash = la >= 0 ? 0.6 * Math.exp(-la * 10) * Math.abs(Math.cos(la * 24)) : 0;
	const rel = seg(t, thump + 0.02, thump + 0.08);
	const up = seg(t, thump + 0.04, thump + 0.2, easeIn2) * 900;
	const hand = t < thump + 0.22 ? {x: t < thump ? x : xHit + (thump - tBuys) * 100, y: yb - up, rot: 0, rel} : null;
	const photo = cartonPt([0, NOTICE.photo.cy]);
	// red light on her printed face: rises as the laser line reaches it, holds 0.2 s after the BEEP, fades
	const glow = t < tBuys ? seg(t, tBuys - 0.08, tBuys, easeOut) : 1 - seg(t, tBuys + 0.2, tBuys + 0.38, easeInOut);
	const z = 1.04 + 0.02 * seg(t, t0, t1, lin) + kick(t, [thump], 0.03) + kick(t, [tBuys], 0.09) + kick(t, [tIt], 0.03);
	return (
		<>
			<Cam t={t} z={z} oy={620} hits={[thump, tBuys]} amp={9} tremor={0.8}>
				{/* store ceiling, full bleed (oversized against shake / rotation) under the shifted counter */}
				<div style={{position: 'absolute', left: -240, top: -320, width: 1560, height: 1400, background: '#cfd7de'}} />
				<Svg>
					{[120, 540, 960].map((lx) => <ellipse key={lx} cx={lx} cy={-10} rx={150} ry={30} fill="#ffffff" opacity={0.55} style={{filter: 'blur(9px)'}} />)}
				</Svg>
				<AbsoluteFill style={{transform: `translateY(${DY}px)`}}>
					{/* the till drawer sits left of the scanner (x ≈ 486–774 → ≈ 470–810 on screen at the peak zoom) so its pop on «it.»
					    reads whole, clear of the right-edge UI column */}
					<CheckoutBelt t={t} speed={100} sweep={sweep} beep={t - tBuys} till={t - tIt} tillX={-300}>
						<HeldCarton t={t} x={x} y={yb} s={S} rot={Math.sin(t * 3) * 0.6} c={{squash, spark: glow}} hand={hand} />
						{/* the laser lights her printed face red as it crosses */}
						{glow > 0 ? (
							<Svg>
								<ellipse cx={x} cy={yb + photo[1] * S} rx={90} ry={110} fill="#FF2A2A" opacity={0.42 * glow} style={{mixBlendMode: 'screen'}} />
							</Svg>
						) : null}
					</CheckoutBelt>
				</AbsoluteFill>
			</Cam>
			{/* the card, outside the scene camera (its own small kick + shake on «BUYS»): centre x 468, text y ≈ 310–575, width ≈ 660
			    → inside the big-text zone (y 300–900, x ≤ 887) even at the peak of the kick; the scanner tower stays clear on the right */}
			<Cam t={t} z={1 + kick(t, [tBuys], 0.035) + kick(t, [tIt], 0.012)} ox={468} oy={460} hits={[tBuys]} amp={4} tremor={0}>
				<Plate x0={100} y0={294} x1={836} y1={630} t={t} at={tHe} />
				<CardLine x={468} y={368} t={t} size={112} parts={[['HE', '#fff', tHe]]} />
				<CardLine x={468} y={526} t={t} size={140} pop={1.3} parts={[['BUYS', PAL.orange, tBuys], [' IT.', '#fff', tIt]]} />
			</Cam>
			<Flash a={t - tBuys} dur={0.09} max={0.5} />
		</>
	);
};

// ======================================================================= 13 · KEEP IT (SCREENSHOT MOMENT, 18.38 – 20.23)
// the kitchen table from above: the EMPTY carton (spout open) lies face up under his watch hand on his side; on «asks:» he slides
// it across to her small hands; the question lands with the voice around the carton — DO YOU / WANT TO above, KEEP IT? below (KEEP
// orange, kick on «keep»); the carton wobbles to a stop, her fingers hover. Ends with the photo panel at KEEP_PHOTO (zoom-through).
export const KeepIt: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const tAsk = W(60); // «asks:» 18.68 the slide starts
	const tDo = W(61); // 18.93
	const tKeep = W(65); // 19.55 KEEP
	const S = 0.5;
	const ph = cartonPt([0, NOTICE.photo.cy]); // photo centre, carton units
	const slide = seg(t, tAsk, tKeep - 0.05, easeOut);
	const stopA = t - (tKeep - 0.05);
	const rotC = lerp(-16, -3, slide) + (stopA > 0 ? wobble(stopA, 17, 4.5) * 5 : 0);
	// photo position on screen: from his side (right) to KEEP_PHOTO
	const px = lerp(850, KEEP_PHOTO[0], slide) + (stopA > 0 ? wobble(stopA + 0.05, 17, 4.5) * 6 : 0);
	const py = lerp(640, KEEP_PHOTO[1], slide);
	const r = rotP([ph[0] * S, ph[1] * S], rotC);
	const ax = px - r[0];
	const ay = py - r[1];
	// his fingertips push the carton's right edge a little above mid-height; while it slides his arm swings from straight right
	// (−90°) to coming in from the lower right (−56°), so at the end the watch sits at x ≈ 820, y ≈ 760 — inside the safe zone and
	// clear of the KEEP IT? card. On «keep» his fingers ease off back along the arm (open → rest), then two taps.
	const edge = rotP([205 * S, -372 * S], rotC);
	const ex = ax + edge[0];
	const ey = ay + edge[1];
	const lift = seg(t, tKeep - 0.1, tKeep + 0.25, easeOut);
	const hs = 0.7;
	const hrot = lerp(-90, -56, seg(t, tAsk, tKeep - 0.05, easeInOut)) + Math.sin(t * 3) * 1.5;
	const back = rotP([0, 1], hrot); // unit vector from the fingertips toward the wrist
	const tip = handTip('man', 'open');
	const hw = wristAt(tip, [ex - 30 + back[0] * 26 * lift, ey + Math.sin(t * 2.4) * 3 + back[1] * 26 * lift], hs, hrot);
	const tap = bump(t, tKeep + 0.55, 0.12) + bump(t, tKeep + 0.85, 0.12);
	// her small hands come in from the left and hover by the carton, fingers twitching (never touching yet) — both above the card
	const herK = seg(t, t0 + 0.12, tKeep - 0.1, easeOut);
	const hov = (i: number) => Math.sin(t * 5.3 + i * 2) * 6;
	const kL = wristAt(handTip('kid', 'open'), [lerp(-80, 350, herK) + hov(0) * 0.6, 578 + hov(1)], 0.78, 92);
	const kR = wristAt(handTip('kid', 'open'), [lerp(-120, 356, herK) + hov(2) * 0.6, 724 + hov(3)], 0.78, 86, true);
	const twitch = (i: number) => clamp01(0.3 + 0.35 * Math.sin(t * 8.5 + i * 1.7));
	const z = 1.03 + 0.04 * seg(t, t0, t1 + 0.4, lin) + kick(t, [tKeep], 0.06) + kick(t, [tAsk], 0.015);
	// the whole question lands on «Do» (one quick cascade) and HOLDS ≈ 1.2 s for the screenshot; «keep» = KEEP turns orange + kick
	const tQ = tDo - 0.02;
	return (
		<>
		<Cam t={t} z={z} ox={KEEP_PHOTO[0]} oy={KEEP_PHOTO[1]} hits={[tKeep]} amp={4} tremor={0.7}>
			<TableTop t={t * 2} />
			{/* the carton's soft contact shadow (no milk ring: the carton slid in by hand, it never stood there) */}
			<Svg>
				<ellipse cx={ax + 8} cy={ay + 8} rx={110} ry={20} fill="rgba(40,20,10,0.25)" transform={`rotate(${f1(rotC)} ${f1(ax)} ${f1(ay)})`} />
			</Svg>
			<HeldCarton t={t} x={ax} y={ay} s={S} rot={rotC} c={{open: 1}} />
			<Hand kind="man" gesture="open" to="rest" k={lift * 0.6} x={hw[0]} y={hw[1]} s={hs} rot={hrot} arm={1600} t={t} tap={tap} glint={bump(t, tKeep + 0.1, 0.35)} />
			{herK > 0 ? (
				<>
					<Hand kind="kid" gesture="open" to="rest" k={twitch(0)} x={kL[0]} y={kL[1]} s={0.78} rot={92} arm={1800} t={t} />
					<Hand kind="kid" gesture="open" to="rest" k={twitch(1)} x={kR[0]} y={kR[1]} s={0.78} rot={86} flip arm={1800} t={t} />
				</>
			) : null}
		</Cam>
		{/* the question card, outside the scene camera (own small shake on «keep»): DO YOU / WANT TO above the carton (text y ≈ 310–
		    485, x 300–780), KEEP IT? over the squiggle strip under her photo (text y ≈ 795–885, centre x 480, width ≈ 580) — all
		    inside the big-text zone y 300–900; the photo and MISSING CHILD stay clear */}
		<Cam t={t} z={1 + kick(t, [tKeep], 0.012)} ox={480} oy={600} hits={[tKeep]} amp={3} tremor={0}>
			<Plate x0={236} y0={298} x1={844} y1={494} t={t} at={tQ} />
			<CardLine y={354} t={t} size={86} parts={[['DO YOU', '#fff', tQ]]} />
			<CardLine y={444} t={t} size={86} parts={[['WANT TO', '#fff', tQ + 0.05]]} />
			<Plate x0={150} y0={782} x1={806} y1={914} t={t} at={tQ + 0.1} glow={bump(t, tKeep + 0.12, 0.36)} />
			<CardLine x={478} y={850} t={t} size={110} parts={[['KEEP', '#fff', tQ + 0.1, tKeep, PAL.orange], [' IT?', '#fff', tQ + 0.13]]} />
		</Cam>
		</>
	);
};

// ======================================================================= 14 · CUTS (20.23 – 21.95)
// macro (zoom-through from KEEP_PHOTO): her small hand with round-tip kid scissors goes round the photo panel counter-clockwise, one
// side per word — «cuts» right side, «out» top, «her» left, «own» bottom — her hand always outside the panel; on «face.» her fingers
// lift the cutout free and a hole stays in the carton (scissors never in an adult hand: FACTS).
const CS = 1.25; // carton scale in the macro
const C_ANCHOR: P2 = [KEEP_PHOTO[0], KEEP_PHOTO[1] - cartonPt([0, NOTICE.photo.cy])[1] * CS];
const N_C: P2 = [C_ANCHOR[0], C_ANCHOR[1] + cartonPt([0, 0])[1] * CS]; // notice centre px
const HWc = ((CUT.w + 14) / 2) * CS;
const HHc = ((CUT.h + 14) / 2) * CS;
/** the cut path, counter-clockwise from the bottom-right corner: u 0..4 (one side per unit) → px */
const cutP = (u: number): P2 => {
	const R = N_C[0] + HWc;
	const L = N_C[0] - HWc;
	const T = N_C[1] - HHc;
	const B = N_C[1] + HHc;
	const i = Math.max(0, Math.min(3, Math.floor(u)));
	const f = clamp01(u - i);
	if (i === 0) return [R, lerp(B, T, f)];
	if (i === 1) return [lerp(R, L, f), T];
	if (i === 2) return [L, lerp(T, B, f)];
	return [lerp(L, R, f), B];
};
export const Cuts: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const snips = [W(68), W(69), W(70), W(71)]; // 20.42 20.64 20.85 21.10
	const tFace = W(72); // 21.445 the cutout lifts free
	const u = keys(t, [[t0 - 0.02, 0], [snips[0], 1], [snips[1], 2], [snips[2], 3], [snips[3], 4]], (x) => easeInOut(x) * 0.7 + x * 0.3);
	const i = Math.max(0, Math.min(3, Math.floor(u)));
	const fr = u - i;
	const turn = i === 0 ? 0 : -90 * (i - 1 + easeInOut(clamp01(fr / 0.18)));
	const dist = Math.min(...snips.map((s) => Math.abs(t - s)));
	const openSc = t < snips[3] + 0.05 ? 0.1 + 0.9 * clamp01(dist / 0.09) : 0.55;
	// scissors pivot sits behind the cut front (the blades bite at ≈ 70 units ahead of the pivot)
	const P = cutP(u);
	const sS = 0.95;
	const away = seg(t, snips[3] + 0.06, snips[3] + 0.36, easeIn2);
	const dir = rotP([0, -1], turn);
	const piv: P2 = [P[0] - dir[0] * 70 * sS + away * 520, P[1] - dir[1] * 70 * sS + away * 640];
	// the slit grows behind the scissors: the corners passed so far + the cut front
	const pts: P2[] = [cutP(0)];
	for (let c = 1; c <= 4 && u > c - 1; c++) pts.push(cutP(Math.min(u, c)));
	const rest: P2[] = [cutP(u)];
	for (let c = Math.floor(u) + 1; c <= 4; c++) rest.push(cutP(c));
	const lifted = t >= tFace;
	const liftK = seg(t, tFace, tFace + 0.38, easeOut);
	// her other hand pinches the top-left corner of the panel just before «face.» and lifts it
	const pinchK = seg(t, tFace - 0.3, tFace - 0.04, easeOut);
	const drift = Math.max(0, t - tFace - 0.38);
	const cutX = N_C[0] + lerp(0, -112, liftK) - drift * 22;
	const cutY = N_C[1] + lerp(0, -84, liftK) - drift * 34 + Math.sin(t * 6) * 3 * liftK;
	const cutRot = lerp(0, -13, liftK) - drift * 6;
	const cutS = CS * lerp(1, 1.1, liftK);
	const corner = rotP([(-CUT.w / 2 + 34) * cutS, (-CUT.h / 2 + 30) * cutS], cutRot);
	const pinchAt: P2 = [cutX + corner[0], cutY + corner[1]];
	const kp = wristAt(handTip('kid', 'pinch'), [pinchAt[0] - (1 - pinchK) * 420, pinchAt[1] - (1 - pinchK) * 160], 1.15, 128, true);
	const jig = t > snips[3] && !lifted ? Math.sin(t * 40) * 1.2 * (1 - clamp01((t - snips[3]) / 0.3)) : 0;
	// her forearm never ends inside the shot: it runs ≈ 1800 px to the nearest frame edge — right while she cuts the right side,
	// up-right on the top, left on the left side, straight down on the bottom (and it follows the +25° of the exit). The wrist bend
	// vs the natural pose stays 30–60°, always the same way round
	const sRot = turn + away * 25;
	const armFrame = keys(-turn, [[0, 20], [90, -60], [180, -160], [270, -270]], lin) + away * 25;
	const z = 1.0 + 0.07 * seg(t, t0, t1 + 0.3, lin) + kick(t, snips, 0.014) + kick(t, [tFace], 0.035);
	return (
		<Cam t={t} z={z} ox={540} oy={700} hits={[tFace]} amp={3} tremor={0.8}>
			<TableTop t={t * 2} blur={5} dim={0.08} />
			<Svg>
				<g transform={`translate(${f1(C_ANCHOR[0] + jig)} ${f1(C_ANCHOR[1])}) scale(${CS})`}>
					<MilkCartonG t={t} open={1} hole={lifted ? 1 : 0} lw={lwFor(CS)} />
				</g>
				{!lifted ? (
					<g>
						<polyline points={rest.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')} fill="none" stroke={INK} strokeWidth={4} strokeDasharray="18 12" opacity={0.55} />
						<polyline points={pts.map((p) => `${f1(p[0] + 4)},${f1(p[1] + 4)}`).join(' ')} fill="none" stroke="#FFFFFF" strokeWidth={5} opacity={0.9} strokeLinejoin="round" />
						<polyline points={pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')} fill="none" stroke={INK} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
					</g>
				) : null}
			</Svg>
			{lifted ? <Cutout x={cutX} y={cutY} s={cutS} rot={cutRot} t={t} curl={0.4 * liftK} shadow={0.3 + 0.5 * liftK} /> : null}
			{away < 1 ? <Scissors x={piv[0]} y={piv[1]} s={sS} rot={sRot} open={openSc} hand armAng={armFrame - sRot} arm={1900} /> : null}
			{pinchK > 0 ? <Hand kind="kid" gesture="pinch" x={kp[0]} y={kp[1]} s={1.15} rot={128} flip arm={1800} t={t} /> : null}
		</Cam>
	);
};

// ======================================================================= 15 · TOSSES (21.95 – 23.67)
// her bedroom rug: the pink doll case (no logo, never the word) pops open on two faceless dolls, tiny shoes and a comb; on «it» her
// small hand lets the cutout go above it and it flutters in; on «case.» the lid snaps shut and the latch clicks.
export const Tosses: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const tIt = W(74); // 22.31 the cutout is let go
	const tShut = W(78); // 23.18 lid snaps
	const DS = 1.22;
	const DX = 540;
	const DY = 1080;
	const openK = t < tShut - 0.12 ? popOver(clamp01((t - (t0 + 0.08)) / 0.24)) : 1 - easeIn2((t - (tShut - 0.12)) / 0.12);
	const latch = t < tShut ? seg(t, t0 + 0.02, t0 + 0.09, lin) : 1 - seg(t, tShut + 0.02, tShut + 0.1, lin);
	const cut = t < tIt ? -1 : seg(t, tIt, tIt + 0.66, lin);
	// her hand above the case: comes down holding the cutout (pinch), lets go on «it», lifts out
	const start: P2 = [DX + 60 * DS, DY - 700 * DS];
	const down = seg(t, t0 + 0.05, tIt - 0.06, easeOut);
	const rel = seg(t, tIt - 0.02, tIt + 0.06);
	const up = seg(t, tIt + 0.08, tIt + 0.45, easeIn2);
	const hr = 196 + Math.sin(t * 6) * 3;
	const hp = wristAt(handTip('kid', 'pinch'), [start[0] + 10, start[1] - (1 - down) * 260 - up * 520], 1.1, hr);
	const z = 1.03 + 0.05 * seg(t, t0, t1 + 0.4, lin) + kick(t, [t0 + 0.12], 0.02) + kick(t, [tShut], 0.05);
	return (
		<Cam t={t} z={z} oy={800} hits={[tShut]} amp={6} tremor={0.8}>
			<AbsoluteFill style={{background: '#C9A27B'}} />
			<AbsoluteFill style={{transform: 'translate(-420px, -1500px) scale(1.55)', transformOrigin: '0 0'}}>
				<Bedroom t={t} blur={4} />
			</AbsoluteFill>
			<DollCase x={DX} y={DY} s={DS} t={t} open={openK} latch={latch} cutout={cut} snap={t - tShut} />
			{/* while still in her fingers the cutout is drawn here (the case draws it once it falls) */}
			{t < tIt ? (
				<Svg>
					<g transform={`translate(${f1(start[0])} ${f1(start[1] - (1 - down) * 260)}) rotate(-12) scale(${(0.4 * DS).toFixed(3)})`}>
						<CutoutG t={t} lw={6 / (0.4 * DS)} shadow={0.4} />
					</g>
				</Svg>
			) : null}
			{up < 1 ? <Hand kind="kid" gesture="pinch" to="drop" k={rel} x={hp[0]} y={hp[1]} s={1.1} rot={hr} arm={1800} t={t} /> : null}
		</Cam>
	);
};
// ======================================================================= 16 · NEXT DOOR (23.67 – 25.04)
// side-on lawn (no signs, numbers, streets), a closer tracking shot (she is ≈ 315 px tall): from the beat's first frame she skips
// right from beside her own house swinging the case — the camera pans with her, a little behind, so she visibly crosses the
// frame — to the neighbours' door; she opens the screen door and sets the case on their hall carpet («case» … «next»), skips home
// empty-handed (out of frame left); on «door.» the screen door slaps shut and the camera eases in on the lone case behind the mesh
// — it ends at CASE_END (zoom-through into RealName).
// The kit's House paints its screen door opaque, so the doorway (hall, carpet, the case, a see-through screen door with the same
// geometry and swing) is redrawn here over the neighbours' door. Our house stands closer than in kit B's LAWN layout (OUR_X) so the
// skip between the doors fits the line.
const NB = {x: LAWN.nbDoor, y: LAWN.ground, s: LAWN.s};
const GS = 0.3; // girl scale (px / unit)
const GY = LAWN.ground + 34; // her feet: on the lawn just in front of the houses
const CASE_S = 0.4 * GS; // the carried case: 0.4 girl units per case unit
const CARPET_Y = NB.y - 66 * NB.s; // case bottom on the hall carpet
const CASE_C: P2 = [NB.x, CARPET_Y - 151 * CASE_S]; // case centre once it is set down
const OUR_X = 330; // our door in this shot
const G_LW = 11; // her ink (girl units): ≈ 5.5 px on screen at the tracking zoom, like the houses
const G_EYES = {eyeLw: 9, iris: 0.52} as const; // small-scale eyes: thin ink, white ring, small brown iris (never «sunglasses»)
const CASE_LW = 22; // the set-down case's ink (case units), close to the carried one (G_LW / 0.4)
const NB_THEME = {trim: '#fffaf0', door: '#3f6b5a'};
const Doorway: React.FC<{t: number; screen: number; slap?: number; caseIn: boolean}> = ({t, screen, slap, caseIn}) => {
	const sid = 'nd' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const th = ((clamp01(screen) * 78 + wobble(slap ?? -1, 34, 7) * 6) * Math.PI) / 180;
	const hx = -82;
	const fxs = hx + 164 * Math.cos(th);
	const p = Math.sin(th) * 0.22;
	const A: P2 = [hx, -362];
	const B: P2 = [fxs, -362 - p * 150];
	const C: P2 = [fxs, -38 + p * 150];
	const D: P2 = [hx, -38];
	const Q = (u: number, v: number): P2 => [lerp(lerp(A[0], B[0], u), lerp(D[0], C[0], u), v), lerp(lerp(A[1], B[1], u), lerp(D[1], C[1], u), v)];
	const poly = (a: P2[]) => a.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ');
	const pathD = (a: P2[]) => 'M' + a.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' L') + ' Z';
	const ln = (a: P2, b: P2) => ({x1: a[0], y1: a[1], x2: b[0], y2: b[1]});
	const ci = 1 / NB.s; // px → house units
	return (
		<Svg>
			<defs>
				<pattern id={`${sid}c`} width={40} height={24} patternUnits="userSpaceOnUse">
					<rect width={40} height={24} fill="#b54a3a" />
					<path d="M0,12 L20,0 L40,12 L20,24 Z" fill="#e0742a" opacity={0.8} />
				</pattern>
			</defs>
			<g transform={`translate(${NB.x} ${NB.y}) scale(${NB.s})`}>
				{/* the doorway, the warm hall, the open inner door, the patterned carpet */}
				<rect x={-94} y={-374} width={188} height={340} fill={NB_THEME.trim} stroke={INK} strokeWidth={6} />
				<rect x={-80} y={-360} width={160} height={322} fill="#2a2226" />
				<rect x={-80} y={-360} width={160} height={220} fill="#e8d4a8" opacity={0.85} />
				<rect x={-46} y={-330} width={60} height={70} rx={6} fill="#c9a77a" stroke={INK} strokeWidth={3} opacity={0.7} />
				<polygon points={poly([[-80, -38], [80, -38], [62, -140], [-62, -140]])} fill={`url(#${sid}c)`} stroke={INK} strokeWidth={3} />
				{Array.from({length: 9}, (_, i) => <line key={i} x1={-72 + i * 18} y1={-40} x2={-72 + i * 18} y2={-26} stroke="#fff4dc" strokeWidth={4} />)}
				<polygon points={poly([[50, -346], [80, -360], [80, -38], [50, -56]])} fill={NB_THEME.door} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				{caseIn ? (
					<g transform={`translate(0 ${f1((CARPET_Y - NB.y) * ci)}) scale(${(CASE_S * ci).toFixed(4)})`}>
						<ellipse cx={0} cy={4} rx={230} ry={26} fill="rgba(0,0,0,0.25)" />
						<DollCaseG view="carry" t={t} lw={CASE_LW} />
					</g>
				) : null}
				{/* the screen door: frame + bar + handle, and a mesh you can see through */}
				<polygon points={poly([Q(0.1, 0.04), Q(0.9, 0.04), Q(0.9, 0.96), Q(0.1, 0.96)])} fill="rgba(40,50,60,0.22)" />
				{Array.from({length: 9}, (_, i) => <line key={`v${i}`} {...ln(Q(0.1 + (i + 1) * 0.08, 0.04), Q(0.1 + (i + 1) * 0.08, 0.96))} stroke="#9aa3ad" strokeWidth={1.6} opacity={0.55} />)}
				{Array.from({length: 15}, (_, i) => <line key={`h${i}`} {...ln(Q(0.1, 0.04 + (i + 1) * 0.0575), Q(0.9, 0.04 + (i + 1) * 0.0575))} stroke="#9aa3ad" strokeWidth={1.6} opacity={0.55} />)}
				<path
					d={`${pathD([A, B, C, D])} ${pathD([Q(0.1, 0.04), Q(0.1, 0.96), Q(0.9, 0.96), Q(0.9, 0.04)])}`}
					fill={NB_THEME.trim}
					fillRule="evenodd"
					stroke={INK}
					strokeWidth={5}
					strokeLinejoin="round"
				/>
				<polygon points={poly([Q(0.04, 0.5), Q(0.96, 0.5), Q(0.96, 0.55), Q(0.04, 0.55)])} fill={NB_THEME.trim} stroke={INK} strokeWidth={3} />
				<line {...ln(Q(0.86, 0.46), Q(0.86, 0.6))} stroke={INK} strokeWidth={9} strokeLinecap="round" />
			</g>
		</Svg>
	);
};
export const NextDoor: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const tSet = W(81); // «case» 24.12 the case is set on the carpet
	const tDoor = W(83); // «door.» 24.56 the screen door slaps shut
	// her path (un-zoomed frame px): from beside our door skip right with the case → stop at their door → set it down → turn → skip
	// home (out of frame left)
	const START = OUR_X + 100;
	const STOP = NB.x - 108;
	// the diag wipe uncovers her side of the frame at ≈ 23.8 s: she skips on the spot until then, so the whole run to the door
	// (x ≈ 260 → 590 on screen, 23.77 → 24.20) happens in view
	const tGo = t0 + 0.1;
	const arrive = tSet + 0.08;
	const leaveT = tSet + 0.28;
	const gx = t < arrive ? lerp(START, STOP, seg(t, tGo, arrive, (x) => x * 0.6 + easeOut(x) * 0.4)) : t < leaveT ? STOP : lerp(STOP, OUR_X - 40, seg(t, leaveT, leaveT + 0.62, lin));
	const pose = t < arrive || t > leaveT + 0.02 ? 'skip' : 'stand';
	const flip = t > leaveT;
	// the case: carried → swung onto the carpet on «case» → stays there
	const hand: P2 = [STOP + 92 * GS, GY - 207 * GS];
	const putK = seg(t, arrive + 0.02, tSet + 0.22, easeInOut);
	const handle: P2 = [lerp(hand[0], CASE_C[0], putK), lerp(hand[1], CARPET_Y - 372 * CASE_S, putK) - Math.sin(putK * Math.PI) * 34];
	const carrying = t < arrive + 0.02;
	const moving = !carrying && putK < 1;
	// the neighbours' screen door: pulled open as she arrives, let go after she leaves, slaps shut on «door.»
	const screen = t < tDoor ? keys(t, [[arrive - 0.14, 0], [arrive + 0.02, 0.82], [leaveT + 0.12, 0.82], [tDoor, 0]], easeInOut) : 0;
	// camera: base point (cx, CY) at frame centre, zoom zt ≈ 1.7 → she is ≈ 325 px tall, feet at y ≈ 1060, above the caption band;
	// it drifts right much slower than she skips (she crosses the frame x ≈ 250 → 580 with the case), holds on the neighbours' door
	// (x ≈ 760); on «door.» it eases in on the case to CASE_END. cx ≤ 700 keeps the lawn's right edge (x 1080) out of the frame.
	const zt = 1.68 + 0.05 * seg(t, t0, tDoor, lin);
	const cx = lerp(600, 690, seg(t, t0 - 0.06, arrive + 0.1, easeInOut));
	const CY = 1153;
	const F = CASE_C;
	const S0: P2 = [540 + (F[0] - cx) * zt, 960 + (F[1] - CY) * zt]; // where the case spot is under the tracking camera
	const e = seg(t, tDoor - 0.06, t1 + 0.02, easeInOut);
	const z = lerp(zt, 3.1, e) + 0.12 * seg(t, t1, t1 + 0.5, lin);
	const Sx = lerp(S0[0], CASE_END[0], e);
	const Sy = lerp(S0[1], CASE_END[1], e);
	const sh = shake(t, [tDoor], 4, 0.8);
	return (
		<AbsoluteFill style={{transform: `translate(${(Sx - F[0] * z + sh.x).toFixed(2)}px, ${(Sy - F[1] * z + sh.y).toFixed(2)}px) scale(${z.toFixed(4)})`, transformOrigin: '0 0'}}>
			{/* sky + grass beyond the lawn's 1080 px (shake / zoom margins) */}
			<div style={{position: 'absolute', left: -800, top: -400, width: 2680, height: 1470, background: 'linear-gradient(180deg, #6cb8ea 27.2%, #fff1d2 86%)'}} />
			<div style={{position: 'absolute', left: -800, top: 1070, width: 2680, height: 1400, background: '#62a446'}} />
			<Lawn t={t} houses={false} />
			<House x={OUR_X} y={LAWN.ground} s={LAWN.s} t={t} look="ours" left={520} right={300} door={0} />
			<House x={NB.x} y={NB.y} s={NB.s} t={t} look="neighbor" left={300} right={560} door={0} />
			<Doorway t={t} screen={screen} slap={t - tDoor} caseIn={!carrying && !moving} />
			<Girl x={gx} y={GY} s={GS} t={t} pose={pose} flip={flip} carry={carrying ? 'case' : null} expr="smile" speed={1.15} lw={G_LW} {...G_EYES} />
			{moving ? (
				<Svg>
					<g transform={`translate(${f1(handle[0])} ${f1(handle[1])}) rotate(${f1(lerp(-10, 0, putK))}) scale(${CASE_S}) translate(${-CASE_HANDLE[0]} ${-CASE_HANDLE[1]})`}>
						<DollCaseG view="carry" t={t} lw={CASE_LW} />
					</g>
				</Svg>
			) : null}
		</AbsoluteFill>
	);
};
