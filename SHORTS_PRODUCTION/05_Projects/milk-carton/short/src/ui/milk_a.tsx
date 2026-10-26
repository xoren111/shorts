import React, {useId} from 'react';
import {INK, clamp01, easeInOut, easeOut, h1, lerp} from './gfx';
import {SKIN, SKIN_D} from './draw';
import {ANTON} from '../fonts';
import {PAL} from '../theme';

/*
 * milk-carton draw kit A — people, hands and the hero props (series A look, same as hay-castle/hay_a.tsx: flat fills, INK
 * outlines, palette PAL + MILK below, everything drawn in code). Gallery: src/MilkKitAGallery.tsx (composition MilkKitA,
 * 14 screens × 1 s; stills: node tools/stills.mjs --comp MilkKitA --t 0.5,1.5,…,13.5 --out out/stills/kitA).
 *
 * RULES BAKED IN: no adult face ever except the neighbour and the generic police (stepdad = white cuff + GOLD WATCH, mom = bare
 * arm + GOLD BANGLES + pink nails, dad = red/navy CHECKED sleeve / back view / empty jacket); the girl is generic (bob, messy
 * bangs, RED BOW CLIP, teal striped tee) and the carton photo is her MIRROR copy; generic kids never get her bob or clip; no
 * brands, logos, digits or numerals (the watch dial has ticks only); the only real words are MISSING and CHILD on the carton
 * notice — name and date are illegible squiggles.
 *
 * TWO FORMS OF EVERY PIECE: `XxxG` = an SVG <g> in its own units (compose inside your own <svg>/<g>), `Xxx` = the same piece
 * absolutely placed in frame px. Placement props (FigProps): x, y = the piece's anchor in px, s = px per unit, rot (deg,
 * around the anchor), flip (mirror around the anchor), tone ('bw' | 'sepia' | 'sil' | 'dim'; sil = silhouette colour),
 * opacity. Ink stays ≈ LW = 5 px on screen (lwFor(s)); pass lw only to override. Motion comes in through props: t (scene
 * seconds → blinks, breathing, watch hands, wriggle, sways), progress values 0..1 that the scene eases (k, open, handK …),
 * ages (s since an event; < 0 = not yet). <Toned tone k> wraps any of your own groups in the same colour filters.
 *
 * ── PIECES (anchor · size · props) ───────────────────────────────────────────────────────────────────────────────────────
 * GirlFaceG     head only, (0,0) = head centre, face 300 × 320, hair to y −218. FACE.eyes / .cheek / .mouth / .clip = landmarks.
 *               expr wonder | shock | curious | sad | smile | blank; look [x,y] −1..1; turn −1..1 (features slide, far eye
 *               narrows); wide 0..1 (eyes widen, brows up — frame-0 reaction); talk 0..1 (lips sound out letters); blink
 *               (default automatic, seed shifts it); spark 0..1 (glint on the clip). Generic kids: hair short | pigtails |
 *               curly | tuft, hairC, skin, clip false (kidLook(n) gives a whole look).
 * GirlBust(G)   close-up head + shoulders, (0,0) = bottom centre of the crop; head centre (0,−520), shoulders ±238, ≈ 740 tall;
 *               ECU at the fridge s ≈ 1.5–2.2. + lean 0..1 (head slides toward `turn` and grows), tilt (deg);
 *               hand cheek | chest | point | lips | hold | trace (her raised hand; side −1 = her right hand on the viewer's
 *               left, +1 = the other), handK 0..1 (comes up from below the crop), aim (bust units: fingertip for point /
 *               trace, palm contact for hold), tap 0..1 (jab), item (drawn between the holding hand's fingers and thumb —
 *               e.g. a MilkCartonG at her cheek). girlFacePt(p, {lean, tilt, turn, t}) maps face units → bust units.
 * Girl(G)       full body ~7 y, (0,0) = between the feet, GIRL_H = 640 (adult world 900). Faces +x (flip = left).
 *               pose stand | walk | skip | run | toss | hold | point; k = toss progress; speed; carry 'case' (swung in the
 *               front hand, hugged when running); item (hold: drawn at the chest, girl units, chest ≈ 0,−330).
 * GirlPeek(G)   her face half out from behind a door jamb, (0,0) = jamb edge at eye level; jamb x 0..180, wall beyond (wall
 *               colour or null); peek 0 (hidden) .. 1 (one eye out); four fingertips curl round the jamb. flip = other side.
 * Toddler(G)    ~3 y (tuft + red clip), (0,0) = feet, ≈ 430 tall, faces +x. walk 0..1, armL / armR 0..1 (raised),
 *               adultL / adultR = 'mom' | 'man' | … → that adult's hand + sleeve comes down from above and holds hers
 *               (adultArm = sleeve length). tone 'sepia' / 'sil' for the flashback.
 * Hand(G)       one hand + forearm/sleeve, (0,0) = WRIST, fingers point UP, palm faces +x (thumb toward us), sleeve runs
 *               down (+y) for `arm` units. Man hand ≈ 330 long; kind man (cuff + gold watch) | mom (bangles, pink nails) |
 *               dad (checked cuff) | kid | toddler | neighbor (cardigan) | cop (navy) scales it (mom 0.84, kid 0.6,
 *               toddler 0.42). gesture open | drop | point | grab | fist | pinch | rest | offer | hold; to + k blends two
 *               gestures (grab → drop = release); curl / spread override; tap 0..1; glint 0..1 (watch / bangle sparkle);
 *               sleeve false = bare forearm. rot 90 → fingers right; rot 180 → fingers down; flip → palm faces −x;
 *               palm-up offer = rot −90 or flip + rot 90. handTip(kind, gesture) = index fingertip, handGrip(kind) = palm
 *               contact point (hand units); placePt(p, {x, y, s, rot, flip}) → frame px. children = a held object drawn
 *               BETWEEN the fingers (behind) and palm + thumb (front), in hand units — or render part 'back' / 'front'.
 *               NB 'rest' fits a shoulder, but SCRIPT/STATUS: his hand on her shoulder in the store is outdated staging.
 * MilkCarton(G) gable-top carton, no brand, (0,0) = bottom centre of the front face; body 400 × 640, roof to −770, fin to −808
 *               (view 'three4': front face −200..130, side face to x 320, fin to −846). Props: all Notice props (wriggle,
 *               lit, nameHi, kid, expr, spark) + open 0..1 (pour spout), tilt (deg around the body centre), squash 0..1,
 *               cut 0..1 (dashed cut line grows around the notice), hole 0..1 (notice gone, same wobbly edge as Cutout),
 *               dim 0..1 (greys out — wall of cartons), hand {kind, side ±1, at 0..1 (grip height, default 0.16 keeps
 *               his thumb under the photo), rot, gesture, scale (1.35), arm, glint} = a hand holding it by the side edge,
 *               fingers behind, thumb on the front. CARTON.notice = notice centre; cartonPt(p, view) maps notice units →
 *               carton units; cartonEyes(view) = the printed eye centres (line them up with her eyes in frame 0).
 * Notice(G)     the MISSING panel alone (NOTICE: 360 × 500, centre 0,0): MISSING (Anton, PAL.stamp red), CHILD, her photo,
 *               squiggle name + date. wriggle 0..1 or one value per letter of MISSING (letters wobble and melt into
 *               scribbles — her fingertip drag), lit 0..7 (letters light up left → right, orange glow — he reads it),
 *               nameHi 0..1 (marker along the name line), spark 0..1 (glint on the printed clip).
 * Cutout(G)     the cut-out notice with a wobbly kid-scissors edge (CUT 372 × 514, centre 0,0; cutEdge() = the outline):
 *               curl 0..1 (corner lifts), back (grey cardboard side), magnet 0..1 (round fridge magnet pops on), shadow.
 * KidPhotoG     a printed portrait w × h, centre (0,0): kid 'her' (mirrored, static — prints never blink) or a number n
 *               (generic drawn kid), young (her toddler version), tone bw | sepia | color, halftone, spark.
 *               photoEyes(w, h) = her printed eye centres. PhotoPrint(G): a loose print with a white border, w × 1.2 w
 *               (here `tone` is the photo's own tone).
 * Scissors(G)   round-tip kid scissors (yellow handles), (0,0) = pivot, blades up (≈ 200), rings down (≈ 150);
 *               open 0..1; hand = her small hand (fingers through the big ring, thumb in the small one, forearm to the
 *               lower right). Never in an adult's hand (FACTS: she cuts).
 * DollCase(G)   pink doll case, no logo / word. view 'open3q' (lying, seen from front-above): (0,0) = bottom centre of the front
 *               face, 460 wide, closed ≈ 330 tall, open ≈ 560; open 0..1 (lid hinged at the back), latch 0 hooked .. 1
 *               flipped down (default follows open), snap = age since the lid shut (squash + click lines), cutout 0..1
 *               (the cut-out flutters in and lands on the dolls; −1 = none), dolls (two faceless dolls, tiny shoes, comb).
 *               view 'carry' (upright): body 424 × 302 + handle to y −372 (CASE_HANDLE = grip point; rotate around it).
 * Neighbor(G)   the neighbour (adult woman — face allowed: glasses, grey curls, lilac cardigan), bust, (0,0) = bottom
 *               centre, head centre (0,−585), ≈ 800 tall. pose hold | read (k: her fingertip slides along the name line,
 *               or aim) | gasp (k: hand to her chest) | phone (corded receiver at her ear) | back (over the shoulder, no
 *               face); item = what she holds (her units, centred on the hold point; e.g. CutoutG scaled 0.42), itemW = its
 *               half width (where her hands grip).
 * Police(G)     generic officer (cap, star + shield shapes, no text / numbers), (0,0) = feet, 900 tall; pose stand | walk |
 *               radio (k: hand to the shoulder radio); seed varies skin, height, moustache; tone 'sil' for silhouettes.
 * ManSil(G)     the stepdad as a shape only: view 'hush' = profile shadow raising a finger to the lips (hush 0..1, soft =
 *               edge blur; use opacity for a shadow on the fridge door), (0,0) = bottom centre, ≈ 1160 tall; view 'low' =
 *               his coat from a child's height, backlit rim (rim colour), ≈ 1760 tall; hand = the coloured watch hand
 *               hanging from his right sleeve (continuity with the close-ups).
 * DadBack(G)    her dad square from behind (no face: back of the head, both ears), checked shirt, jeans, boots; symmetric,
 *               faces into the frame; (0,0) = floor under his hips, 900 standing; crouch 0..1 (down on one knee), reach 0..1
 *               (BOTH arms open, palms up — nothing in them), lean 0..1 (leans in toward her), tilt (deg, head).
 * JacketChair(G) the dad's sign in the flashback: an empty checked jacket on a wooden chair, (0,0) = floor, ≈ 960 tall,
 *               t + sway = a barely moving hem.
 * Sparkle       4-point glint; wobble(age) / blinkAt(t) / ik(S, W, L1, L2) / mix(a, b, k) helpers.
 *
 * ── QUICK RECIPES (see MilkKitAGallery screens 2, 4, 6, 10) ─────────────────────────────────────────────────────────────
 *   frame 0:   <GirlBust x={380} y={1560} s={1.5} t={t} expr="wonder" wide={k} turn={0.45} lean={k} look={[0.7, 0]}
 *                hand="cheek" handK={…} tap={…}/>  +  <MilkCarton s={0.62} rot={swing} t={t} hand={{kind: 'man', side: 1}}/>
 *              placed so cartonEyes('front') (× s) sits on girlFacePt(FACE.eyes[i], {lean, turn, t}) height.
 *   tap photo: <Hand kind="man" gesture="point" tap={…}/> — fingertip = placePt(handTip('man', 'point'), {x, y, s, rot}).
 *   drop:      <Hand kind="man" gesture="grab" to="drop" k={release}/>; offer: gesture="offer" flip rot={90}.
 *   flashback: <Toddler t={t} walk={1} armL={1} armR={1} adultL="mom" adultR="man" tone="sepia"/>, <JacketChair tone="sepia"/>.
 *   cutting:   <MilkCarton cut={snips}/> + <Scissors open={…} hand/>, then hole={1} + <Cutout/> lifting off the hole.
 *   case:      <DollCase open={…} cutout={…} snap={t − tShut} latch={…}/>; carried: <Girl pose="skip" carry="case"/>.
 */

// ───────────────────────────── shared ─────────────────────────────

/** ink line on screen, px */
export const LW = 5;
/** ink width in units for a piece drawn at scale s (≈ LW px on screen) */
export const lwFor = (s: number) => Math.max(3.5, Math.min(16, LW / Math.max(0.01, s)));

export type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const f1 = (n: number) => n.toFixed(1);
const pl = (pts: P2[]) => pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
const pathOf = (pts: P2[], close = true) => 'M' + pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' L') + (close ? 'Z' : '');
const clampR = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const rotP = (p: P2, d: number, o: P2 = [0, 0]): P2 => {
	const a = rad(d);
	const c = Math.cos(a);
	const s = Math.sin(a);
	const dx = p[0] - o[0];
	const dy = p[1] - o[1];
	return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c];
};
/** limb direction for an angle measured from straight DOWN, + toward +x */
const vdir = (a: number): P2 => [Math.sin(rad(a)), Math.cos(rad(a))];
const addP = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const lerpP = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const useSid = (p: string) => p + useId().replace(/[^a-zA-Z0-9_-]/g, '');
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
/** colour mix of two #rrggbb */
export const mix = (a: string, b: string, k: number) => {
	const A = hex(a);
	const B = hex(b);
	const m = A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(k)));
	return `rgb(${m[0]},${m[1]},${m[2]})`;
};
/** decaying wobble after an event (age in s; 0 before it) */
export const wobble = (age: number, f = 18, damp = 6) => (age < 0 ? 0 : Math.sin(age * f) * Math.exp(-age * damp));
/** eyes closed for ≈ 0.11 s every 3.3 s, phase by seed */
export const blinkAt = (t: number, seed = 0) => (t + seed * 1.37 + 10) % 3.3 < 0.11;
/** two-bone IK: the elbow between shoulder S and wrist W (bend ±1 picks the side; 'down' = the lower solution) */
export const ik = (S: P2, W: P2, L1: number, L2: number, bend: 1 | -1 | 'down' = 'down'): P2 => {
	const dx = W[0] - S[0];
	const dy = W[1] - S[1];
	const d = Math.max(1e-3, Math.min(L1 + L2 - 0.5, Math.hypot(dx, dy)));
	const a = Math.acos(clampR((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
	const base = Math.atan2(dy, dx);
	const e = (sg: number): P2 => [S[0] + Math.cos(base + sg * a) * L1, S[1] + Math.sin(base + sg * a) * L1];
	if (bend !== 'down') return e(bend);
	const p = e(1);
	const q = e(-1);
	return p[1] >= q[1] ? p : q;
};
/** limb angle (from straight down, + toward +x) of the segment a → b */
const limbA = (a: P2, b: P2) => deg(Math.atan2(b[0] - a[0], b[1] - a[1]));

/** outlined tubes (arms, legs, fingers): every segment's ink first, then the colours → joints without seams */
const Tubes: React.FC<{segs: {pts: P2[]; w: number; c: string}[]; lw: number; cap?: 'round' | 'butt'}> = ({segs, lw, cap = 'round'}) => (
	<g strokeLinecap={cap} strokeLinejoin="round" fill="none">
		{segs.map((s, i) => (
			<polyline key={`i${i}`} points={pl(s.pts)} stroke={INK} strokeWidth={s.w + lw * 2} />
		))}
		{segs.map((s, i) => (
			<polyline key={`c${i}`} points={pl(s.pts)} stroke={s.c} strokeWidth={s.w} />
		))}
	</g>
);

/** scalloped outline (curly hair, clouds): n lobes around an ellipse */
const cloudPath = (cx: number, cy: number, rx: number, ry: number, n: number, bump: number, seed = 1) => {
	let d = '';
	for (let i = 0; i < n; i++) {
		const a0 = (i / n) * Math.PI * 2;
		const a1 = ((i + 1) / n) * Math.PI * 2;
		const am = (a0 + a1) / 2;
		const j = 1 + 0.25 * (h1(seed + i * 3.1) - 0.5);
		const p0: P2 = [cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry];
		const p1: P2 = [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry];
		const c: P2 = [cx + Math.cos(am) * rx * (1 + bump * j), cy + Math.sin(am) * ry * (1 + bump * j)];
		d += (i === 0 ? `M${f1(p0[0])},${f1(p0[1])}` : '') + `Q${f1(c[0])},${f1(c[1])} ${f1(p1[0])},${f1(p1[1])}`;
	}
	return d + 'Z';
};
const star4 = (r: number) => `M0,${-r} L${r * 0.2},${-r * 0.2} L${r},0 L${r * 0.2},${r * 0.2} L0,${r} L${-r * 0.2},${r * 0.2} L${-r},0 L${-r * 0.2},${-r * 0.2} Z`;
const heartPath = (r: number) => `M0,${r * 0.9} C${-r * 1.4},${-r * 0.1} ${-r * 0.7},${-r * 1.2} 0,${-r * 0.4} C${r * 0.7},${-r * 1.2} ${r * 1.4},${-r * 0.1} 0,${r * 0.9} Z`;
const ringPath = (cx: number, cy: number, r: number, ri: number) =>
	`M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z M${cx - ri},${cy} a${ri},${ri} 0 1 0 ${2 * ri},0 a${ri},${ri} 0 1 0 ${-2 * ri},0 Z`;

/** a 4-point glint; k 0..1 = size */
export const Sparkle: React.FC<{x: number; y: number; r: number; k?: number; rot?: number; color?: string; lw?: number}> = ({x, y, r, k = 1, rot = 0, color = '#fff', lw = 3}) =>
	k <= 0.01 ? null : (
		<g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${clamp01(k).toFixed(3)})`}>
			<path d={star4(r)} fill={color} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d={star4(r * 0.5)} fill="#fff" transform="rotate(45)" opacity={0.8} />
		</g>
	);

// palette of the kit (series A: flat, warm; accent stays PAL.orange, MISSING red = PAL.stamp)
export const MILK = {
	hair: '#7B4A2A',
	hairD: '#56301A',
	hairL: '#A86E44',
	clip: '#E3263A',
	clipD: '#9E1424',
	clipL: '#FF9A9A',
	shirt: '#2A9D8F',
	shirtD: '#1E776C',
	stripe: '#EAF6F1',
	denim: '#4A72B8',
	denimD: '#2F5291',
	sock: '#F7F3EA',
	shoe: '#F4F1EA',
	shoeD: '#C9C1B2',
	cheek: '#F2877A',
	mouth: '#7A1F2E',
	tongue: '#E8697A',
	iris: '#6B4426',
	irisL: '#9A6A3E',
	skinDD: '#B87655',
	carton: '#FBF8F0',
	cartonD: '#E4DED0',
	cartonS: '#D5CDBB',
	cartonIn: '#7D7566',
	band: '#2F80D2',
	bandD: '#1D5EA6',
	bandL: '#9CCBF5',
	coat: '#27354D',
	coatD: '#18233A',
	coatL: '#4A5D7E',
	cuff: '#F4F1EA',
	cuffD: '#CFC8B8',
	watch: '#E2B23C',
	watchD: '#A8801F',
	strap: '#5A3A20',
	dial: '#FFFDF5',
	bangle: '#FFC83A',
	bangleD: '#D99A12',
	blouse: '#B88BD0',
	blouseD: '#8F66A8',
	nail: '#E8558A',
	check: '#B8323C',
	checkD: '#1F2A44',
	cardigan: '#9C86C8',
	cardiganD: '#76619F',
	nHair: '#A79C93',
	nHairD: '#7D7269',
	nHairL: '#CBC2B8',
	police: '#22345A',
	policeD: '#16223D',
	policeL: '#3A5283',
	gold: '#FFC83A',
	pink: '#F48FB6',
	pinkD: '#D9659A',
	pinkL: '#FFC4DC',
	pinkIn: '#FFE4EF',
	pinkDD: '#B04878',
	doll: '#C7A5E8',
	dollD: '#9C78C8',
	dollHair: '#FFD66B',
	steel: '#C9D0D8',
	steelL: '#F1F4F7',
	steelD: '#8D96A3',
	scissor: '#FFC83A',
	scissorD: '#D99A12',
	wood: '#A8743F',
	woodD: '#7A5130',
	woodL: '#C48E55',
	jamb: '#EFE7D6',
	jambD: '#CDBFA4',
	wall: '#B9C7B0',
	romper: '#F4C95D',
	romperD: '#D9A834',
	dadHair: '#3B2A20',
	jeans: '#3E5F99',
	jeansD: '#2C4677',
	boot: '#6B4426',
	phone: '#E9DFC7',
	phoneD: '#BFB396',
	sil: '#141C30',
} as const;

// ───────────────────────────── tone filters + placement ─────────────────────────────

export type Tone = 'color' | 'bw' | 'sepia' | 'sil' | 'dim';
const ToneFilter: React.FC<{id: string; tone: Tone; sil?: string; k?: number}> = ({id, tone, sil = MILK.sil, k = 1}) => {
	const box = {x: '-25%', y: '-25%', width: '150%', height: '150%'};
	if (tone === 'sil')
		return (
			<filter id={id} {...box} colorInterpolationFilters="sRGB">
				<feFlood floodColor={sil} result="f" />
				<feComposite in="f" in2="SourceAlpha" operator="in" />
			</filter>
		);
	if (tone === 'sepia')
		return (
			<filter id={id} {...box} colorInterpolationFilters="sRGB">
				<feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0" />
			</filter>
		);
	if (tone === 'bw')
		return (
			<filter id={id} {...box} colorInterpolationFilters="sRGB">
				<feColorMatrix type="saturate" values="0" />
				<feComponentTransfer>
					<feFuncR type="linear" slope={1.22} intercept={-0.09} />
					<feFuncG type="linear" slope={1.22} intercept={-0.09} />
					<feFuncB type="linear" slope={1.22} intercept={-0.09} />
				</feComponentTransfer>
			</filter>
		);
	const sat = 1 - 0.85 * clamp01(k);
	const b = 1 - 0.5 * clamp01(k);
	return (
		<filter id={id} {...box} colorInterpolationFilters="sRGB">
			<feColorMatrix type="saturate" values={sat.toFixed(3)} />
			<feComponentTransfer>
				<feFuncR type="linear" slope={b} />
				<feFuncG type="linear" slope={b} />
				<feFuncB type="linear" slope={b * 1.04} />
			</feComponentTransfer>
		</filter>
	);
};

/** wraps children in a colour filter (bw / sepia / silhouette / dim with strength k) */
export const Toned: React.FC<{tone?: Tone; sil?: string; k?: number; children: React.ReactNode}> = ({tone, sil, k, children}) => {
	const id = useSid('tn');
	if (!tone || tone === 'color' || (tone === 'dim' && (k ?? 1) <= 0.001)) return <>{children}</>;
	return (
		<g>
			<defs>
				<ToneFilter id={id} tone={tone} sil={sil} k={k} />
			</defs>
			<g filter={`url(#${id})`}>{children}</g>
		</g>
	);
};

export type FigProps = {x: number; y: number; s?: number; rot?: number; flip?: boolean; tone?: Tone; sil?: string; opacity?: number};
/** a piece in its own units, anchor (0,0) placed at (x, y) px, s px per unit */
const Fig: React.FC<FigProps & {children: React.ReactNode}> = ({x, y, s = 1, rot = 0, flip, tone, sil, opacity, children}) => (
	<svg
		width={2000 * s}
		height={2000 * s}
		viewBox="-1000 -1000 2000 2000"
		style={{position: 'absolute', left: x - 1000 * s, top: y - 1000 * s, overflow: 'visible', pointerEvents: 'none', opacity}}
	>
		<Toned tone={tone} sil={sil}>
			<g transform={`rotate(${f1(rot)}) scale(${flip ? -1 : 1} 1)`}>{children}</g>
		</Toned>
	</svg>
);
/** a point in a placed piece's units → frame px (same transform as the placed component) */
export const placePt = (p: P2, pl0: {x: number; y: number; s?: number; rot?: number; flip?: boolean}): P2 => {
	const q: P2 = [pl0.flip ? -p[0] : p[0], p[1]];
	const r = rotP(q, pl0.rot ?? 0);
	const s = pl0.s ?? 1;
	return [pl0.x + r[0] * s, pl0.y + r[1] * s];
};

// ───────────────────────────── Hand ─────────────────────────────

export type HandKind = 'man' | 'mom' | 'dad' | 'kid' | 'toddler' | 'neighbor' | 'cop';
export type HandGesture = 'open' | 'drop' | 'point' | 'grab' | 'fist' | 'pinch' | 'rest' | 'offer' | 'hold';

// finger curls [thumb, index, middle, ring, pinky] (0 straight .. 1 fist) + spread 0..1
const GEST: Record<HandGesture, {c: number[]; sp: number}> = {
	open: {c: [0.05, 0.06, 0.06, 0.08, 0.1], sp: 0.3},
	drop: {c: [-0.15, 0, 0.02, 0.04, 0.06], sp: 1},
	point: {c: [0.3, 0, 1, 1, 1], sp: 0},
	grab: {c: [0.1, 0.55, 0.6, 0.63, 0.66], sp: 0.05},
	fist: {c: [0.85, 1, 1, 1, 1], sp: 0},
	pinch: {c: [0, 0.75, 0.86, 0.9, 0.93], sp: 0},
	rest: {c: [0.1, 0.3, 0.34, 0.38, 0.42], sp: 0.12},
	offer: {c: [0, 0.14, 0.14, 0.16, 0.18], sp: 0.05},
	hold: {c: [0.3, 0.8, 0.84, 0.86, 0.88], sp: 0},
};
// profile hand (thumb side toward us), canonical man size; fingers bend toward +x (the palm side)
const FING = [
	{b: [6, -170] as P2, L: [70, 46, 36], w: 38, a: 4},
	{b: [-4, -176] as P2, L: [76, 50, 38], w: 37, a: -3},
	{b: [-14, -170] as P2, L: [70, 46, 35], w: 35, a: -9},
	{b: [-22, -156] as P2, L: [56, 38, 30], w: 31, a: -16},
];
const BEND = [70, 95, 70];
const PALM = 'M-38,4 C-46,-50 -50,-118 -42,-166 Q-30,-182 -6,-180 L24,-176 Q48,-150 52,-96 Q54,-40 40,4 Z';
const KIND: Record<HandKind, {ks: number; skin: string; skinD: string; fw: number; fm: number; fl: number}> = {
	man: {ks: 1, skin: '#EDB68E', skinD: '#C98B66', fw: 84, fm: 1.04, fl: 1},
	dad: {ks: 1.04, skin: '#F0BF97', skinD: '#CF9672', fw: 86, fm: 1.04, fl: 1},
	cop: {ks: 1, skin: '#E8B48C', skinD: '#C48A64', fw: 84, fm: 1, fl: 1},
	mom: {ks: 0.84, skin: SKIN, skinD: SKIN_D, fw: 70, fm: 0.92, fl: 1.04},
	neighbor: {ks: 0.86, skin: '#F2C9A7', skinD: '#D6A27F', fw: 72, fm: 0.95, fl: 1},
	kid: {ks: 0.6, skin: SKIN, skinD: SKIN_D, fw: 74, fm: 1.1, fl: 0.92},
	toddler: {ks: 0.42, skin: '#F6CBA5', skinD: '#DDA27C', fw: 88, fm: 1.3, fl: 0.8},
};
export const HAND_GRIP: P2 = [48, -104];
export const handScale = (kind: HandKind = 'man') => KIND[kind].ks;
const fingerPts = (i: number, c: number, sp: number, fl = 1): P2[] => {
	const f = FING[i];
	let a = -90 + f.a * (1 + 1.8 * sp);
	let p: P2 = [f.b[0], f.b[1]];
	const pts: P2[] = [p];
	for (let j = 0; j < 3; j++) {
		a += c * BEND[j];
		p = [p[0] + Math.cos(rad(a)) * f.L[j] * fl, p[1] + Math.sin(rad(a)) * f.L[j] * fl];
		pts.push(p);
	}
	return pts;
};
const thumbPts = (c: number, fl = 1): P2[] => {
	const b: P2 = [30, -66];
	const a1 = -50 - 50 * c;
	const a2 = a1 - 10 - 40 * c;
	const p1: P2 = [b[0] + Math.cos(rad(a1)) * 58 * fl, b[1] + Math.sin(rad(a1)) * 58 * fl];
	const p2: P2 = [p1[0] + Math.cos(rad(a2)) * 46 * fl, p1[1] + Math.sin(rad(a2)) * 46 * fl];
	return [b, p1, p2];
};
const handPose = (g: HandGesture, to?: HandGesture, k = 0, curl?: number[], spread?: number) => {
	const A = GEST[g];
	const B = to ? GEST[to] : A;
	const kk = clamp01(k);
	return {c: curl ?? A.c.map((v, i) => lerp(v, B.c[i], kk)), sp: spread ?? lerp(A.sp, B.sp, kk)};
};
/** index fingertip of a hand (hand units, before rot / flip) */
export const handTip = (kind: HandKind = 'man', gesture: HandGesture = 'point'): P2 => {
	const K = KIND[kind];
	const {c, sp} = handPose(gesture);
	const e = fingerPts(0, c[1], sp, K.fl)[3];
	return [e[0] * K.ks, e[1] * K.ks];
};
/** palm contact point (where a held object's edge sits), hand units */
export const handGrip = (kind: HandKind = 'man'): P2 => [HAND_GRIP[0] * KIND[kind].ks, HAND_GRIP[1] * KIND[kind].ks];

/** the gold wristwatch (stepdad's identifier): strap across the wrist, dial without numerals, sweeping hands */
const Watch: React.FC<{y: number; hw: number; L: number; t: number; glint: number}> = ({y, hw, L, t, glint}) => (
	<g>
		<rect x={-hw - 5} y={y - 20} width={hw * 2 + 10} height={40} rx={10} fill={MILK.strap} stroke={INK} strokeWidth={L} />
		<line x1={-hw + 4} y1={y - 8} x2={hw - 4} y2={y - 8} stroke="#7A5434" strokeWidth={4} strokeLinecap="round" />
		<g transform={`translate(-4 ${y})`}>
			<circle r={33} fill={MILK.watch} stroke={INK} strokeWidth={L} />
			<circle r={24} fill={MILK.dial} stroke={MILK.watchD} strokeWidth={3} />
			{[0, 90, 180, 270].map((a) => (
				<line key={a} x1={0} y1={-20} x2={0} y2={-14} stroke={INK} strokeWidth={3.5} transform={`rotate(${a})`} />
			))}
			<line x1={0} y1={0} x2={0} y2={-11} stroke={INK} strokeWidth={4.5} strokeLinecap="round" transform={`rotate(${f1(-60 + t * 4)})`} />
			<line x1={0} y1={0} x2={0} y2={-18} stroke={INK} strokeWidth={3.2} strokeLinecap="round" transform={`rotate(${f1(50 + t * 24)})`} />
			<line x1={0} y1={4} x2={0} y2={-20} stroke={PAL.stamp} strokeWidth={2} transform={`rotate(${f1(t * 110)})`} />
			<circle r={3.4} fill={INK} />
			<path d="M-22,-12 A25,25 0 0 1 2,-26" stroke="#fff" strokeWidth={4} fill="none" opacity={0.75} strokeLinecap="round" />
			<rect x={30} y={-6} width={9} height={12} rx={3} fill={MILK.watchD} stroke={INK} strokeWidth={L * 0.6} />
		</g>
		<Sparkle x={hw - 2} y={y - 26} r={30} k={glint} rot={t * 90} lw={L * 0.6} />
	</g>
);

/** forearm + kind-specific cuff / sleeve, wrist at (0,0), running down to `arm` (canonical units) */
const Sleeve: React.FC<{kind: HandKind; arm: number; L: number; t: number; glint: number; ck: string; skin: string; sleeve: boolean}> = ({kind, arm, L, t, glint, ck, skin, sleeve}) => {
	const fw = KIND[kind].fw;
	const hw = fw / 2;
	const fore = (end: number) => <Tubes lw={L} segs={[{pts: [[0, -40], [0, Math.max(-20, Math.min(arm, end))]], w: fw, c: skin}]} />;
	if (!sleeve) return fore(arm);
	const flare = (y0: number, c: string, extra = 26, ex2 = 36, stroke = true) =>
		arm > y0 + 6 ? <path d={pathOf([[-hw - extra, y0], [hw + extra, y0], [hw + ex2, arm], [-hw - ex2, arm]])} fill={c} stroke={stroke ? INK : 'none'} strokeWidth={L} strokeLinejoin="round" /> : null;
	switch (kind) {
		case 'man': {
			const cs = 72;
			return (
				<g>
					{flare(cs + 50, MILK.coat)}
					{arm > cs + 80 ? <line x1={-hw - 27} y1={cs + 76} x2={hw + 27} y2={cs + 76} stroke={MILK.coatD} strokeWidth={L * 1.4} /> : null}
					{arm > cs + 150
						? [cs + 106, cs + 136].map((yy) => <circle key={yy} cx={-hw - 14} cy={yy} r={7} fill={MILK.coatL} stroke={INK} strokeWidth={L * 0.5} />)
						: null}
					{fore(cs + 10)}
					{arm > cs ? (
						<g>
							<rect x={-hw - 14} y={cs} width={fw + 28} height={Math.min(66, arm - cs)} rx={12} fill={MILK.cuff} stroke={INK} strokeWidth={L} />
							<line x1={-hw - 8} y1={cs + 12} x2={hw + 8} y2={cs + 12} stroke={MILK.cuffD} strokeWidth={L * 0.8} />
							<circle cx={hw - 2} cy={cs + 38} r={7} fill={MILK.cuffD} stroke={INK} strokeWidth={L * 0.4} />
						</g>
					) : null}
					<Watch y={36} hw={hw} L={L} t={t} glint={glint} />
				</g>
			);
		}
		case 'mom':
			return (
				<g>
					{arm > 306 ? <path d={`M${-hw - 8},300 Q0,286 ${hw + 8},300 L${hw + 40},${arm} L${-hw - 40},${arm} Z`} fill={MILK.blouse} stroke={INK} strokeWidth={L} strokeLinejoin="round" /> : null}
					{arm > 360 ? [-18, 6, 28].map((dx) => <path key={dx} d={`M${dx},308 Q${dx + 6},334 ${dx - 2},360`} stroke={MILK.blouseD} strokeWidth={L * 0.8} fill="none" strokeLinecap="round" />) : null}
					{fore(306)}
					{[
						[30, 40, MILK.bangle],
						[76, 30, MILK.bangleD],
						[112, 22, MILK.bangle],
					].map(([y, h, c]) => (
						<g key={y as number}>
							<rect x={-hw - 16} y={y as number} width={fw + 32} height={h as number} rx={(h as number) / 2} fill={c as string} stroke={INK} strokeWidth={L} />
							<line x1={-hw - 4} y1={(y as number) + (h as number) * 0.32} x2={hw - 6} y2={(y as number) + (h as number) * 0.32} stroke="#FFF1B8" strokeWidth={6} strokeLinecap="round" opacity={0.9} />
						</g>
					))}
					<Sparkle x={hw + 10} y={36} r={40} k={glint} rot={t * 120} lw={L * 0.6} />
				</g>
			);
		case 'dad':
			return (
				<g>
					{arm > 96 ? <path d={pathOf([[-hw - 16, 92], [hw + 16, 92], [hw + 26, arm], [-hw - 26, arm]])} fill={`url(#${ck})`} stroke={INK} strokeWidth={L} strokeLinejoin="round" /> : null}
					{fore(50)}
					{arm > 40 ? (
						<g>
							<rect x={-hw - 12} y={40} width={fw + 24} height={Math.min(58, arm - 40)} rx={10} fill={`url(#${ck})`} stroke={INK} strokeWidth={L} />
							<rect x={-hw - 12} y={40} width={fw + 24} height={Math.min(58, arm - 40)} rx={10} fill={MILK.checkD} opacity={0.18} />
							<circle cx={hw - 6} cy={68} r={7} fill="#EDE6D6" stroke={INK} strokeWidth={L * 0.5} />
						</g>
					) : null}
				</g>
			);
		case 'neighbor':
			return (
				<g>
					{flare(100, MILK.cardigan, 14, 30)}
					{fore(60)}
					{arm > 50 ? (
						<g>
							<rect x={-hw - 12} y={50} width={fw + 24} height={Math.min(56, arm - 50)} rx={10} fill={MILK.cardigan} stroke={INK} strokeWidth={L} />
							{[-0.6, -0.3, 0, 0.3, 0.6].map((f) => (
								<line key={f} x1={f * (hw + 8)} y1={56} x2={f * (hw + 8)} y2={50 + Math.min(52, arm - 50)} stroke={MILK.cardiganD} strokeWidth={L * 0.7} />
							))}
						</g>
					) : null}
				</g>
			);
		case 'kid':
			return (
				<g>
					{fore(300)}
					{arm > 290 ? <path d={pathOf([[-hw - 12, 286], [hw + 12, 286], [hw + 30, arm], [-hw - 30, arm]])} fill={MILK.shirt} stroke={INK} strokeWidth={L} strokeLinejoin="round" /> : null}
					{arm > 330 ? <rect x={-hw - 16} y={306} width={fw + 32} height={22} fill={MILK.stripe} /> : null}
				</g>
			);
		case 'toddler':
			return (
				<g>
					{fore(160)}
					{arm > 150 ? <path d={`M${-hw - 6},150 Q0,140 ${hw + 6},150 L${hw + 40},${arm} L${-hw - 40},${arm} Z`} fill={MILK.romper} stroke={INK} strokeWidth={L} strokeLinejoin="round" /> : null}
				</g>
			);
		case 'cop':
			return (
				<g>
					{flare(34, MILK.police, 12, 22)}
					{fore(44)}
					{arm > 50 ? <line x1={-hw - 12} y1={52} x2={hw + 12} y2={52} stroke={MILK.policeD} strokeWidth={L * 1.4} /> : null}
				</g>
			);
	}
};

export type HandProps = {
	kind?: HandKind;
	gesture?: HandGesture;
	/** blend toward this gesture by k (e.g. grab → drop) */
	to?: HandGesture;
	k?: number;
	/** override curls [thumb, index, middle, ring, pinky] */
	curl?: number[];
	spread?: number;
	/** sleeve length behind the wrist (canonical units; ×kind scale) */
	arm?: number;
	/** false = bare forearm only */
	sleeve?: boolean;
	/** watch hands, glints */
	t?: number;
	/** 0..1 sparkle on the watch / bangle */
	glint?: number;
	/** index fingertip press (0..1): the finger squashes a little */
	tap?: number;
	part?: 'all' | 'back' | 'front';
	skin?: string;
	lw?: number;
	children?: React.ReactNode;
};

/** one hand + forearm/sleeve; wrist at (0,0), fingers up, palm toward +x */
export const HandG: React.FC<HandProps> = ({kind = 'man', gesture = 'open', to, k = 0, curl, spread, arm = 700, sleeve = true, t = 0, glint = 0, tap = 0, part = 'all', skin, lw = 8, children}) => {
	const id = useSid('hd');
	const K = KIND[kind];
	const {c, sp} = handPose(gesture, to, k, curl, spread);
	const L = lw / K.ks;
	const sk = skin ?? K.skin;
	const fingers = FING.map((_, i) => fingerPts(i, c[i + 1], sp, K.fl * (i === 0 ? 1 - 0.06 * clamp01(tap) : 1)));
	const th = thumbPts(c[0], K.fl);
	const holding = children != null || part !== 'all';
	const shade = [0, 0.3, 0.5, 0.68];
	const finger = (i: number) => <Tubes key={i} lw={L} segs={[{pts: fingers[i], w: FING[i].w * K.fm * (i === 0 ? 1 + 0.08 * clamp01(tap) : 1), c: i === 0 ? sk : mix(sk, K.skinD, shade[i])}]} />;
	// nail on the index tip (dorsal side)
	const ip = fingers[0];
	const ia = Math.atan2(ip[3][1] - ip[2][1], ip[3][0] - ip[2][0]);
	const nailC: P2 = [ip[3][0] - Math.cos(ia) * 12 + Math.cos(ia - Math.PI / 2) * 9, ip[3][1] - Math.sin(ia) * 12 + Math.sin(ia - Math.PI / 2) * 9];
	const nail = (
		<ellipse
			cx={nailC[0]}
			cy={nailC[1]}
			rx={9 * K.fm}
			ry={13 * K.fm}
			transform={`rotate(${f1(deg(ia) + 90)} ${f1(nailC[0])} ${f1(nailC[1])})`}
			fill={kind === 'mom' ? MILK.nail : 'rgba(255,255,255,0.45)'}
			stroke={kind === 'mom' ? INK : 'none'}
			strokeWidth={L * 0.5}
		/>
	);
	const back = (
		<g transform={`scale(${K.ks})`}>
			{(holding ? [3, 2, 1, 0] : [3, 2, 1]).map(finger)}
		</g>
	);
	const front = (
		<g transform={`scale(${K.ks})`}>
			<Sleeve kind={kind} arm={arm} L={L} t={t} glint={glint} ck={`${id}ck`} skin={sk} sleeve={sleeve} />
			<path d={PALM} fill={sk} stroke={INK} strokeWidth={L} strokeLinejoin="round" />
			<path d="M30,-28 Q38,-86 28,-140" stroke="rgba(255,255,255,0.3)" strokeWidth={10} fill="none" strokeLinecap="round" />
			{!holding ? finger(0) : null}
			{!holding && c[1] < 0.6 ? nail : null}
			<Tubes lw={L} segs={[{pts: th, w: 40 * K.fm, c: sk}]} />
		</g>
	);
	return (
		<g>
			{kind === 'dad' ? (
				<defs>
					<CheckPattern id={`${id}ck`} size={44} />
				</defs>
			) : null}
			{part !== 'front' ? back : null}
			{part === 'all' ? children : null}
			{part !== 'back' ? front : null}
		</g>
	);
};

/** red / navy buffalo check (dad's shirt and jacket) */
const CheckPattern: React.FC<{id: string; size?: number; rot?: number}> = ({id, size = 56, rot = 0}) => (
	<pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`rotate(${rot})`}>
		<rect width={size} height={size} fill={MILK.check} />
		<rect width={size / 2} height={size} fill={MILK.checkD} opacity={0.5} />
		<rect width={size} height={size / 2} fill={MILK.checkD} opacity={0.5} />
		<line x1={size * 0.75} y1={0} x2={size * 0.75} y2={size} stroke="#E8A0A0" strokeWidth={size * 0.04} opacity={0.5} />
	</pattern>
);

/** a hand placed in px: (x, y) = wrist */
export const Hand: React.FC<HandProps & FigProps> = ({x, y, s = 0.5, rot = 0, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<HandG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

/** transform that puts a hand's palm contact point at (ex, ey), rotated rot, scaled hs; flip = palm faces −x */
const gripXf = (kind: HandKind, ex: number, ey: number, rot: number, hs: number, flip: boolean) => {
	const g = handGrip(kind);
	return `translate(${f1(ex)} ${f1(ey)}) rotate(${f1(rot)}) scale(${hs.toFixed(3)}) translate(${f1(flip ? g[0] : -g[0])} ${f1(-g[1])}) scale(${flip ? -1 : 1} 1)`;
};

// ───────────────────────────── Girl: face ─────────────────────────────

export type GirlExpr = 'wonder' | 'shock' | 'curious' | 'sad' | 'smile' | 'blank';
export type HairStyle = 'bob' | 'short' | 'pigtails' | 'curly' | 'tuft';
type Mouth = 'smile' | 'o' | 'shock' | 'side' | 'frown' | 'flat';
const EX: Record<GirlExpr, {brow: number; inner: number; lid: number; eye: number; pupil: number; mouth: Mouth; asym?: boolean}> = {
	wonder: {brow: 0.75, inner: 0.15, lid: 0, eye: 1.1, pupil: 1.15, mouth: 'o'},
	shock: {brow: 1, inner: 0, lid: 0, eye: 1.22, pupil: 0.62, mouth: 'shock'},
	curious: {brow: 0.35, inner: 0, lid: 0.12, eye: 1.0, pupil: 1.0, mouth: 'side', asym: true},
	sad: {brow: 0.15, inner: 1, lid: 0.4, eye: 0.96, pupil: 1.0, mouth: 'frown'},
	smile: {brow: 0.25, inner: 0, lid: 0.12, eye: 1.0, pupil: 1.0, mouth: 'smile'},
	blank: {brow: 0, inner: 0, lid: 0.32, eye: 0.95, pupil: 0.85, mouth: 'flat'},
};
export const HAIR_HER = [MILK.hair, MILK.hairD, MILK.hairL] as const;
/** face landmarks (face units, head centre = 0,0) */
export const FACE = {rx: 150, ry: 160, eyes: [[-56, -2], [56, -2]] as P2[], cheek: [-90, 54] as P2, mouth: [0, 96] as P2, clip: [112, -126] as P2};

export type FaceProps = {
	t?: number;
	expr?: GirlExpr;
	/** gaze −1..1 (x, y) */
	look?: P2;
	/** head turn −1 (to the left) .. 1 (to the right): features slide, far eye narrows */
	turn?: number;
	/** 0..1 eyes widen + brows up (frame-0 reaction) */
	wide?: number;
	/** 0..1 lips try to sound out letters (cycling mouth shapes) */
	talk?: number;
	/** force blink on / off (default: automatic) */
	blink?: boolean;
	seed?: number;
	/** red bow clip (default on for bob / tuft) */
	clip?: boolean;
	/** which side of the head the clip sits on, head units: 1 (default, +x) or −1 (mirrored). A Girl drawn with `flip` and
	 *  clipSide −1 keeps the clip on the viewer's right, as in frame 0 (the clip is our sign — it never jumps sides) */
	clipSide?: 1 | -1;
	/** 0..1 glint on the clip */
	spark?: number;
	hair?: HairStyle;
	hairC?: readonly [string, string, string];
	freckles?: boolean;
	/** eye ink width (face units; default = lw) — thinner at small scales so the whites still read */
	eyeLw?: number;
	/** iris radius as a share of the eye (default 0.74); ≈ 0.5 at small scales = white ring + small pupil */
	iris?: number;
	young?: boolean;
	skin?: string;
	lw?: number;
};

const Eye: React.FC<{id: string; cx: number; cy: number; rx: number; ry: number; lid: number; look: P2; pupil: number; blink: boolean; lw: number; outer: -1 | 1; skin: string; iris?: number}> = ({id, cx, cy, rx, ry, lid, look, pupil, blink, lw, outer, skin, iris = 0.74}) => {
	const lash = (
		<g stroke={INK} strokeWidth={lw * 0.95} strokeLinecap="round">
			<line x1={cx + outer * rx * 0.8} y1={cy - ry * 0.55} x2={cx + outer * (rx + 12)} y2={cy - ry * 0.86} />
			<line x1={cx + outer * rx * 0.97} y1={cy - ry * 0.2} x2={cx + outer * (rx + 16)} y2={cy - ry * 0.38} />
		</g>
	);
	if (blink)
		return (
			<g>
				<path d={`M${f1(cx - rx)},${f1(cy + 2)} Q${f1(cx)},${f1(cy + ry * 0.5)} ${f1(cx + rx)},${f1(cy + 2)}`} stroke={INK} strokeWidth={lw * 1.5} fill="none" strokeLinecap="round" />
				{lash}
			</g>
		);
	const ir = Math.min(rx, ry) * iris;
	const ix = cx + look[0] * rx * 0.3;
	const iy = cy + look[1] * ry * 0.26 + ry * 0.06;
	const ly = cy - ry + 2 * ry * clamp01(lid);
	const hasLid = lid > 0.03;
	return (
		<g>
			<clipPath id={id}>
				<ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
			</clipPath>
			<ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" />
			<g clipPath={`url(#${id})`}>
				<circle cx={ix} cy={iy} r={ir} fill={MILK.iris} />
				<circle cx={ix} cy={iy + ir * 0.3} r={ir * 0.7} fill={MILK.irisL} opacity={0.45} />
				<circle cx={ix} cy={iy} r={ir * 0.5 * pupil} fill={INK} />
				<circle cx={ix - ir * 0.36} cy={iy - ir * 0.4} r={ir * 0.3} fill="#fff" />
				<circle cx={ix + ir * 0.34} cy={iy + ir * 0.3} r={ir * 0.13} fill="#fff" />
				{hasLid ? (
					<path
						d={`M${f1(cx - rx - 8)},${f1(cy - ry - 8)} L${f1(cx + rx + 8)},${f1(cy - ry - 8)} L${f1(cx + rx + 8)},${f1(ly)} Q${f1(cx)},${f1(ly + ry * 0.28)} ${f1(cx - rx - 8)},${f1(ly)} Z`}
						fill={skin}
						stroke={INK}
						strokeWidth={lw * 1.7}
					/>
				) : null}
			</g>
			<ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth={lw} />
			{!hasLid ? <path d={`M${f1(cx - rx)},${f1(cy)} A${f1(rx)},${f1(ry)} 0 0 1 ${f1(cx + rx)},${f1(cy)}`} stroke={INK} strokeWidth={lw * 1.9} fill="none" strokeLinecap="round" /> : null}
			{lash}
		</g>
	);
};

const BOB_BACK = 'M-178,30 C-202,-100 -142,-216 0,-218 C142,-216 202,-100 178,30 L184,130 L160,114 L148,142 L124,118 L108,138 L-108,138 L-124,118 L-148,142 L-160,114 L-184,130 Z';
const LOCK_L = 'M-152,-74 C-172,-10 -170,64 -164,128 L-144,110 L-132,136 L-114,106 C-122,50 -126,-14 -112,-80 Z';
const BANGS =
	'M-164,-34 C-180,-142 -102,-208 0,-208 C102,-208 180,-142 164,-34 L148,-76 L130,-50 L114,-98 L92,-68 L72,-110 L48,-76 L24,-114 L2,-82 L-22,-116 L-46,-80 L-68,-112 L-90,-72 L-112,-102 L-130,-58 L-148,-84 Z';
const SHORT_FRONT = 'M-158,-22 C-174,-142 -102,-212 0,-212 C102,-212 174,-142 158,-22 L146,-70 L116,-92 L84,-84 L50,-102 L16,-90 L-20,-104 L-56,-90 L-92,-102 L-124,-84 L-148,-66 Z';
const PIG_FRONT = 'M-160,-28 C-174,-142 -102,-212 0,-212 C102,-212 174,-142 160,-28 L142,-78 Q76,-118 8,-150 L-8,-150 Q-76,-118 -142,-78 Z';
const TUFT_FRONT = 'M-150,-50 C-162,-146 -92,-204 0,-204 C92,-204 162,-146 150,-50 L132,-96 Q66,-136 0,-126 Q-66,-136 -132,-96 Z';
const FACE_PATH = 'M0,-158 C92,-158 150,-98 150,-6 C150,86 96,160 0,162 C-96,160 -150,86 -150,-6 C-150,-98 -92,-158 0,-158 Z';

/** the red bow clip, centre (0,0), ≈ 124 × 70 */
const Bow: React.FC<{lw: number}> = ({lw}) => (
	<g>
		<path d="M0,0 C-18,-36 -64,-36 -62,0 C-64,36 -18,36 0,0 Z" fill={MILK.clip} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
		<path d="M0,0 C18,-36 64,-36 62,0 C64,36 18,36 0,0 Z" fill={MILK.clip} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
		<path d="M-16,-6 L-46,-16 M-16,6 L-46,16 M16,-6 L46,-16 M16,6 L46,16" stroke={MILK.clipD} strokeWidth={lw * 0.9} strokeLinecap="round" />
		<rect x={-15} y={-17} width={30} height={34} rx={10} fill={MILK.clip} stroke={INK} strokeWidth={lw} />
		<circle cx={-38} cy={-13} r={7} fill={MILK.clipL} />
	</g>
);

/** the girl's head (or a generic kid's: hair / hairC / clip off), centre (0,0), canonical size */
export const GirlFaceG: React.FC<FaceProps> = (p) => {
	const id = useSid('gf');
	const t = p.t ?? 0;
	const E = EX[p.expr ?? 'smile'];
	const wide = clamp01(p.wide ?? 0);
	const turn = clampR(p.turn ?? 0, -1, 1);
	const fx = turn * 40;
	const lw = p.lw ?? 6;
	const fl = Math.max(lw, 7);
	const skin = p.skin ?? SKIN;
	const hc = p.hairC ?? HAIR_HER;
	const style = p.hair ?? 'bob';
	const look = p.look ?? [turn * 0.6, 0];
	const young = !!p.young;
	const blink = p.blink ?? blinkAt(t, p.seed ?? 0);
	const eyeK = E.eye + 0.22 * wide;
	const er = young ? 1.12 : 1;
	const clipOn = p.clip ?? (style === 'bob' || style === 'tuft');
	const freckles = p.freckles ?? style === 'bob';
	const eyeY = young ? 8 : -2;
	const eyes = ([-1, 1] as const).map((s) => {
		const far = turn * s > 0;
		const sq = far ? 1 - 0.3 * Math.abs(turn) : 1;
		return (
			<Eye
				key={s}
				id={`${id}e${s}`}
				cx={s * 56 * (young ? 0.94 : 1) + fx * (far ? 1.15 : 0.9)}
				cy={eyeY}
				rx={30 * eyeK * sq * er}
				ry={36 * eyeK * er}
				lid={E.lid * (1 - wide)}
				look={look}
				pupil={E.pupil * (1 + 0.15 * wide)}
				blink={blink && E.mouth !== 'shock'}
				lw={p.eyeLw ?? lw}
				outer={s}
				skin={skin}
				iris={p.iris}
			/>
		);
	});
	const brows = ([-1, 1] as const).map((s) => {
		const asym = E.asym ? (s > 0 ? -16 : 4) : 0;
		const by = -70 - (E.brow + wide * 0.45) * 18 + asym + (young ? 6 : 0);
		const bx = s * 58 + fx;
		const inX = bx - s * 26;
		const outX = bx + s * 26;
		const inY = by - E.inner * 16;
		const outY = by + E.inner * 5;
		return <path key={s} d={`M${f1(inX)},${f1(inY)} Q${f1(bx)},${f1(by - 9)} ${f1(outX)},${f1(outY)}`} stroke={hc[1]} strokeWidth={young ? 9 : 12} fill="none" strokeLinecap="round" />;
	});
	const mx = fx * 1.1;
	const my = young ? 92 : 96;
	const mouth = () => {
		const tk = clamp01(p.talk ?? 0);
		if (tk > 0.5) {
			const shapes = ['m', 'o', 'i', 's', 'm', 'e'] as const;
			const sh = shapes[(Math.floor(t * 8) + (p.seed ?? 0)) % shapes.length];
			if (sh === 'm') return <path d={`M${f1(mx - 16)},${my + 2} Q${f1(mx)},${my + 8} ${f1(mx + 16)},${my + 2}`} stroke={INK} strokeWidth={fl * 1.1} fill="none" strokeLinecap="round" />;
			const [rx, ry] = sh === 'o' ? [12, 15] : sh === 'i' ? [22, 8] : sh === 's' ? [18, 9] : [20, 12];
			return (
				<g>
					<ellipse cx={mx} cy={my + 4} rx={rx} ry={ry} fill={MILK.mouth} stroke={INK} strokeWidth={lw} />
					{sh === 's' ? <rect x={mx - 12} y={my - 2} width={24} height={6} rx={2} fill="#fff" /> : null}
				</g>
			);
		}
		switch (E.mouth) {
			case 'o':
				return (
					<g>
						<ellipse cx={mx} cy={my + 4} rx={14 * (1 + wide * 0.25)} ry={18 * (1 + wide * 0.3)} fill={MILK.mouth} stroke={INK} strokeWidth={lw} />
						<ellipse cx={mx} cy={my + 14} rx={8} ry={5} fill={MILK.tongue} />
					</g>
				);
			case 'shock':
				return (
					<g>
						<ellipse cx={mx} cy={my + 12} rx={26} ry={36} fill={MILK.mouth} stroke={INK} strokeWidth={lw} />
						<ellipse cx={mx} cy={my + 32} rx={16} ry={10} fill={MILK.tongue} />
						<path d={`M${mx - 20},${my - 8} Q${mx},${my - 2} ${mx + 20},${my - 8}`} stroke="#fff" strokeWidth={7} fill="none" strokeLinecap="round" />
					</g>
				);
			case 'side':
				return <path d={`M${f1(mx - 22)},${my + 4} Q${f1(mx)},${my + 4} ${f1(mx + 22)},${my - 8}`} stroke={INK} strokeWidth={fl} fill="none" strokeLinecap="round" />;
			case 'frown':
				return <path d={`M${f1(mx - 26)},${my + 10} Q${f1(mx)},${my - 10} ${f1(mx + 26)},${my + 10}`} stroke={INK} strokeWidth={fl} fill="none" strokeLinecap="round" />;
			case 'flat':
				return <path d={`M${f1(mx - 18)},${my + 2} L${f1(mx + 18)},${my}`} stroke={INK} strokeWidth={fl} fill="none" strokeLinecap="round" />;
			default:
				return (
					<g>
						<path d={`M${f1(mx - 30)},${my - 6} Q${f1(mx)},${my + 20} ${f1(mx + 30)},${my - 6}`} stroke={INK} strokeWidth={fl} fill="none" strokeLinecap="round" />
						<path d={`M${f1(mx - 33)},${my - 9} l6,5 M${f1(mx + 33)},${my - 9} l-6,5`} stroke={INK} strokeWidth={fl * 0.7} strokeLinecap="round" />
					</g>
				);
		}
	};
	const hx = fx * 0.3;
	const backHair = () => {
		if (style === 'bob') return <path d={BOB_BACK} transform={`translate(${f1(-fx * 0.25)} 0)`} fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />;
		if (style === 'curly') return <path d={cloudPath(-fx * 0.2, -46, 192, 186, 12, 0.3, (p.seed ?? 1) + 2)} fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />;
		if (style === 'pigtails')
			return (
				<g>
					{([-1, 1] as const).map((s) => (
						<g key={s}>
							<ellipse cx={s * 198} cy={46} rx={46} ry={88} transform={`rotate(${s * -18} ${s * 198} 46)`} fill={hc[0]} stroke={INK} strokeWidth={lw} />
							<path d={`M${s * 186},${0} Q${s * 210},${60} ${s * 196},${110}`} stroke={hc[1]} strokeWidth={lw} fill="none" />
							<circle cx={s * 170} cy={-34} r={18} fill={s < 0 ? PAL.teal : PAL.orange} stroke={INK} strokeWidth={lw} />
						</g>
					))}
				</g>
			);
		return null;
	};
	const ears = style !== 'bob' ? ([-1, 1] as const).map((s) => (
		<g key={s}>
			<ellipse cx={s * 146 + fx * 0.15} cy={16} rx={22} ry={31} fill={skin} stroke={INK} strokeWidth={lw} />
			<path d={`M${s * 148 + fx * 0.15},4 q${s * 8},12 0,24`} stroke={SKIN_D} strokeWidth={lw} fill="none" strokeLinecap="round" />
		</g>
	)) : null;
	const frontHair = () => {
		if (style === 'bob')
			return (
				<g transform={`translate(${f1(hx)} 0)`}>
					<path d={LOCK_L} fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d={LOCK_L} transform="scale(-1 1)" fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d={BANGS} fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M-104,-166 Q-30,-196 52,-184" stroke={hc[2]} strokeWidth={13} fill="none" strokeLinecap="round" opacity={0.75} />
					<path d="M-62,-192 Q-52,-146 -50,-104 M30,-198 Q26,-150 22,-118 M102,-178 Q106,-132 94,-92 M-130,-130 Q-118,-100 -112,-80" stroke={hc[1]} strokeWidth={lw * 0.9} fill="none" strokeLinecap="round" />
					<path d="M-26,-206 Q-16,-238 10,-234 M40,-204 Q58,-230 74,-222" stroke={hc[0]} strokeWidth={lw * 1.4} fill="none" strokeLinecap="round" />
					<path d="M-26,-206 Q-16,-238 10,-234 M40,-204 Q58,-230 74,-222" stroke={INK} strokeWidth={lw * 0.5} fill="none" strokeLinecap="round" opacity={0.6} />
				</g>
			);
		if (style === 'short') return <path d={SHORT_FRONT} transform={`translate(${f1(hx)} 0)`} fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />;
		if (style === 'pigtails')
			return (
				<g transform={`translate(${f1(hx)} 0)`}>
					<path d={PIG_FRONT} fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M0,-210 L0,-150" stroke={hc[1]} strokeWidth={lw} />
				</g>
			);
		if (style === 'curly') return <path d={cloudPath(hx, -150, 150, 62, 9, 0.42, (p.seed ?? 1) + 5)} fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />;
		return (
			<g transform={`translate(${f1(hx)} 0)`}>
				<path d={TUFT_FRONT} fill={hc[0]} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d="M-6,-200 C-34,-252 34,-268 24,-224" stroke={INK} strokeWidth={lw * 3.4} fill="none" strokeLinecap="round" />
				<path d="M-6,-200 C-34,-252 34,-268 24,-224" stroke={hc[0]} strokeWidth={lw * 1.6} fill="none" strokeLinecap="round" />
			</g>
		);
	};
	const cSide = p.clipSide ?? 1;
	const clipPos: P2 = style === 'tuft' ? [cSide * 84 + hx, -150] : [cSide * 112 + hx, -126];
	return (
		<g>
			{backHair()}
			{ears}
			<path d={FACE_PATH} fill={skin} stroke={INK} strokeWidth={lw * 1.1} />
			{([-1, 1] as const).map((s) => (
				<ellipse key={s} cx={s * 86 + fx * 0.8} cy={56} rx={24} ry={14} fill={MILK.cheek} opacity={0.45} />
			))}
			{freckles
				? ([-1, 1] as const).map((s) =>
						[
							[34, 26],
							[48, 36],
							[30, 42],
						].map(([dx, dy], i) => <circle key={`${s}${i}`} cx={s * dx + fx * 1.1} cy={dy} r={3.8} fill={MILK.skinDD} opacity={0.55} />),
					)
				: null}
			{eyes}
			<path d={`M${f1(fx * 1.25 - 9)},${young ? 50 : 42} Q${f1(fx * 1.25)},${young ? 58 : 52} ${f1(fx * 1.25 + 9)},${young ? 50 : 42}`} stroke={MILK.skinDD} strokeWidth={fl * 0.8} fill="none" strokeLinecap="round" />
			{mouth()}
			{frontHair()}
			{brows}
			{clipOn ? (
				<g transform={`translate(${f1(clipPos[0])} ${f1(clipPos[1])}) scale(${cSide} 1) rotate(28) scale(${style === 'tuft' ? 0.7 : 0.95})`}>
					<Bow lw={lw} />
				</g>
			) : null}
			<Sparkle x={clipPos[0] - cSide * 34} y={clipPos[1] - 40} r={44} k={p.spark ?? 0} rot={t * 90} lw={lw * 0.6} />
		</g>
	);
};

// ───────────────────────────── Girl: bust (close-up) ─────────────────────────────

export type GirlHand = 'none' | 'cheek' | 'chest' | 'point' | 'lips' | 'hold' | 'trace';
export type GirlBustProps = FaceProps & {
	/** 0..1 leans in toward `turn` (head slides + grows) */
	lean?: number;
	/** head tilt, deg */
	tilt?: number;
	/** which gesture the raised hand makes: poke own cheek / chest, point or trace at `aim`, finger on lips, hold `item` at aim */
	hand?: GirlHand;
	/** 0..1 hand comes up from below the crop */
	handK?: number;
	/** her right hand (−1, viewer's left, default) or left hand (+1) */
	side?: -1 | 1;
	/** target in bust units (point / trace: fingertip; hold: palm contact on the item's edge) */
	aim?: P2;
	/** 0..1 jab: the fingertip presses in */
	tap?: number;
	/** drawn between the holding hand's fingers and its thumb (bust units) */
	item?: React.ReactNode;
	shirt?: readonly [string, string, string];
};
const headXf = (o: {lean?: number; tilt?: number; turn?: number; t?: number}) => {
	const lean = clamp01(o.lean ?? 0);
	const bob = Math.sin((o.t ?? 0) * 2.3) * 3;
	return {x: (o.turn ?? 0) * 28 * lean, y: -520 + 14 * lean + bob, r: o.tilt ?? 0, s: 1 + 0.08 * lean};
};
/** a face point (face units) → bust units for the same lean / tilt / turn / t */
export const girlFacePt = (p: P2, o: {lean?: number; tilt?: number; turn?: number; t?: number} = {}): P2 => {
	const h = headXf(o);
	const q = rotP([p[0] * h.s, p[1] * h.s], h.r);
	return [h.x + q[0], h.y + q[1]];
};
const TORSO = 'M-238,0 L-236,-196 C-232,-256 -196,-290 -126,-304 L-52,-318 L52,-318 L126,-304 C196,-290 232,-256 236,-196 L238,0 Z';
const HB = 1.25;

export const GirlBustG: React.FC<GirlBustProps> = (p) => {
	const id = useSid('gb');
	const t = p.t ?? 0;
	const lw = p.lw ?? 6;
	const sh = p.shirt ?? ([MILK.shirt, MILK.shirtD, MILK.stripe] as const);
	const skin = p.skin ?? SKIN;
	const h = headXf(p);
	const side = p.side ?? -1;
	const hand = p.hand ?? 'none';
	const hk = easeInOut(clamp01(p.handK ?? (hand === 'none' ? 0 : 1)));
	const breath = Math.sin(t * 2.3) * 2.5;
	// raised arm
	let armEl: React.ReactNode = null;
	let itemBack: React.ReactNode = null;
	if (hand !== 'none' && hk > 0.001) {
		const S: P2 = [side * 176, -268];
		let T: P2 = [side * 150, -420];
		let dir = -90;
		let g: HandGesture = 'point';
		const xo = {lean: p.lean, tilt: p.tilt, turn: p.turn, t};
		if (hand === 'cheek') {
			T = girlFacePt([side * 92, 52], xo);
			dir = side < 0 ? -55 : -125;
		} else if (hand === 'chest') {
			T = [side * 46, -205];
			dir = side < 0 ? -40 : -140;
		} else if (hand === 'lips') {
			T = girlFacePt([side * 4, 92], xo);
			dir = side < 0 ? -74 : -106;
		} else if (hand === 'point' || hand === 'trace') {
			T = p.aim ?? [side * -260, -600];
			dir = deg(Math.atan2(T[1] - S[1], T[0] - S[0]));
		} else if (hand === 'hold') {
			T = p.aim ?? [side * 150, -430];
			dir = -90 - side * 12;
			g = 'grab';
		}
		const flip = side > 0;
		const rot = dir + 90;
		const press = clamp01(p.tap ?? 0);
		const T2: P2 = [T[0] + Math.cos(rad(dir)) * 16 * press, T[1] + Math.sin(rad(dir)) * 16 * press];
		const tipL = g === 'grab' ? handGrip('kid') : handTip('kid', 'point');
		const off = rotP([(flip ? -tipL[0] : tipL[0]) * HB, tipL[1] * HB], rot);
		const W1: P2 = [T2[0] - off[0], T2[1] - off[1]];
		const W0: P2 = [side * 200, 150];
		const W = lerpP(W0, W1, hk);
		const r = lerp(-side * 8, rot, hk);
		const E = ik(S, W, 215, 205, 'down');
		const hp = {kind: 'kid' as const, gesture: 'rest' as const, to: g, k: hk, arm: 30, lw: lw / HB, tap: press};
		const xf = `translate(${f1(W[0])} ${f1(W[1])}) rotate(${f1(r)}) scale(${flip ? -HB : HB} ${HB})`;
		const sleeveEnd = lerpP(S, E, 0.42);
		armEl = (
			<g>
				<Tubes
					lw={lw}
					segs={[
						{pts: [S, sleeveEnd], w: 96, c: sh[0]},
						{pts: [sleeveEnd, E], w: 64, c: skin},
						{pts: [E, W], w: 58, c: skin},
					]}
				/>
				<g transform={xf}>
					<HandG {...hp} part={g === 'grab' && p.item ? 'back' : 'all'} />
				</g>
				{g === 'grab' && p.item ? (
					<>
						{p.item}
						<g transform={xf}>
							<HandG {...hp} part="front" />
						</g>
					</>
				) : null}
			</g>
		);
		itemBack = null;
	}
	return (
		<g>
			<defs>
				<clipPath id={`${id}t`}>
					<path d={TORSO} />
				</clipPath>
			</defs>
			<g transform={`translate(${f1((p.turn ?? 0) * 10 * clamp01(p.lean ?? 0))} ${f1(breath)})`}>
				<path d={TORSO} fill={sh[0]} />
				<g clipPath={`url(#${id}t)`}>
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<rect key={i} x={-260} y={-290 + i * 58} width={520} height={24} fill={sh[2]} />
					))}
					<path d="M-238,-196 Q-200,-120 -214,0 M238,-196 Q200,-120 214,0" stroke={sh[1]} strokeWidth={lw * 1.2} fill="none" />
				</g>
				<path d={TORSO} fill="none" stroke={INK} strokeWidth={lw * 1.1} strokeLinejoin="round" />
				<path d="M-46,-376 L-48,-300 Q0,-272 48,-300 L46,-376 Z" fill={skin} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d="M-62,-318 Q0,-262 62,-318" stroke={sh[1]} strokeWidth={16} fill="none" strokeLinecap="round" />
				<path d="M-62,-318 Q0,-262 62,-318" stroke={INK} strokeWidth={lw} fill="none" strokeLinecap="round" transform="translate(0 9)" />
			</g>
			{itemBack}
			<g transform={`translate(${f1(h.x)} ${f1(h.y)}) rotate(${f1(h.r)}) scale(${h.s.toFixed(3)})`}>
				<ellipse cx={0} cy={150} rx={56} ry={18} fill={SKIN_D} opacity={0.7} />
				<GirlFaceG {...p} lw={lw} />
			</g>
			{armEl}
		</g>
	);
};

/** the close-up girl placed in px: (x, y) = bottom centre of the crop */
export const GirlBust: React.FC<GirlBustProps & FigProps> = ({x, y, s = 1, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<GirlBustG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── Girl: full body ─────────────────────────────

export type GirlPose = 'stand' | 'walk' | 'skip' | 'run' | 'toss' | 'hold' | 'point';
export type GirlProps = FaceProps & {
	t: number;
	pose?: GirlPose;
	/** toss: 0..1 throw progress */
	k?: number;
	speed?: number;
	/** the pink case: swung in the front hand (skip / walk / stand) or hugged (run) */
	carry?: 'case' | null;
	/** hold: drawn between the hands at the chest (girl units, chest at 0,−330) */
	item?: React.ReactNode;
};
export const GIRL_H = 640;
const FS = 0.5;
const HF = 0.42;

export const GirlG: React.FC<GirlProps> = (p) => {
	const id = useSid('gg');
	const {t} = p;
	const pose = p.pose ?? 'stand';
	const lw = p.lw ?? 8;
	const speed = p.speed ?? 1;
	const k = clamp01(p.k ?? 0);
	const skin = p.skin ?? SKIN;
	const rate = pose === 'run' ? 9.5 : pose === 'skip' ? 9 : 6.4;
	const ph = t * rate * speed;
	const s = Math.sin(ph);
	let bob = Math.sin(t * 2.2) * 2;
	let lean = 0;
	type Limb = {a: number; b: number};
	let legL: Limb = {a: -3, b: 0};
	let legR: Limb = {a: 3, b: 0};
	let armL: Limb = {a: -8, b: -4};
	let armR: Limb = {a: 8, b: 4};
	let tgtL: P2 | null = null;
	let tgtR: P2 | null = null;
	let gL: HandGesture = 'rest';
	let gR: HandGesture = p.carry === 'case' && pose !== 'run' ? 'grab' : 'rest';
	let gRto: HandGesture | undefined;
	let gRk = 0;
	if (pose === 'walk') {
		legL = {a: 20 * s, b: Math.min(0, 20 * s) * 0.8};
		legR = {a: -20 * s, b: Math.min(0, -20 * s) * 0.8};
		armL = {a: -18 * s - 6, b: 12};
		armR = {a: 18 * s + 6, b: 12};
		bob = -Math.abs(Math.cos(ph)) * 10;
	} else if (pose === 'skip') {
		const up = (v: number) => Math.max(0, v);
		legL = {a: 52 * up(s) - 10 * up(-s), b: -96 * up(s)};
		legR = {a: 52 * up(-s) - 10 * up(s), b: -96 * up(-s)};
		armL = {a: -36 * s - 10, b: 18};
		armR = {a: 30 * s + 14, b: 10};
		bob = -Math.abs(s) * 46;
		lean = 4;
	} else if (pose === 'run') {
		legL = {a: 38 * s, b: Math.min(0, 38 * s) * 1.4 - 12};
		legR = {a: -38 * s, b: Math.min(0, -38 * s) * 1.4 - 12};
		bob = -Math.abs(Math.cos(ph)) * 16;
		lean = 9;
		tgtL = [-2, -296];
		tgtR = [40, -318];
		gL = 'grab';
		gR = 'grab';
	} else if (pose === 'toss') {
		const e = easeOut(k);
		armR = {a: lerp(-48, 74, e), b: lerp(30, 6, e)};
		gR = 'pinch';
		gRto = 'drop';
		gRk = clamp01((k - 0.55) / 0.2);
		lean = lerp(-2, 8, e);
	} else if (pose === 'hold') {
		tgtL = [-50, -330];
		tgtR = [50, -330];
		gL = 'grab';
		gR = 'grab';
	} else if (pose === 'point') {
		armR = {a: 92 + Math.sin(t * 3) * 3, b: 0};
		gR = 'point';
	}
	const SL: P2 = [-58, -394];
	const SR: P2 = [58, -394];
	const arm = (S: P2, l: Limb, tgt: P2 | null, left: boolean) => {
		let E: P2;
		let W: P2;
		if (tgt) {
			E = ik(S, tgt, 84, 76, left ? 1 : -1);
			W = tgt;
		} else {
			E = addP(S, vdir(l.a), 84);
			W = addP(E, vdir(l.a + l.b), 76);
		}
		const a2 = limbA(E, W);
		return {S, E, W, a2, sl: lerpP(S, E, 0.42)};
	};
	const aL = arm(SL, armL, tgtL, true);
	const aR = arm(SR, armR, tgtR, false);
	const armTubes = (a: ReturnType<typeof arm>) => (
		<Tubes
			lw={lw}
			segs={[
				{pts: [a.S, a.sl], w: 42, c: MILK.shirt},
				{pts: [a.sl, a.E], w: 27, c: skin},
				{pts: [a.E, a.W], w: 25, c: skin},
			]}
		/>
	);
	const handAt = (a: ReturnType<typeof arm>, left: boolean, g: HandGesture, to?: HandGesture, kk = 0) => (
		<g transform={`translate(${f1(a.W[0])} ${f1(a.W[1])}) rotate(${f1(180 - a.a2)}) scale(${left ? -HF : HF} ${HF})`}>
			<HandG kind="kid" gesture={g} to={to} k={kk} arm={20} lw={(lw * 0.55) / HF} />
		</g>
	);
	const hipL: P2 = [-24, -196];
	const hipR: P2 = [24, -196];
	const leg = (H: P2, l: Limb, back: boolean) => {
		const K = addP(H, vdir(l.a), 84);
		const A = addP(K, vdir(l.a + l.b), 80);
		const shin = l.a + l.b;
		const sockTop = addP(A, vdir(shin), -24);
		return (
			<g key={back ? 'b' : 'f'}>
				<Tubes lw={lw} segs={[{pts: [H, K, A], w: 32, c: back ? mix(skin, SKIN_D, 0.3) : skin}]} />
				<Tubes lw={lw} segs={[{pts: [sockTop, A], w: 36, c: MILK.sock}]} />
				<g transform={`translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(-shin * 0.5)})`}>
					<path d="M-24,-14 L18,-18 Q50,-16 56,2 L56,12 L-26,12 Q-32,-2 -24,-14 Z" fill={MILK.shoe} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M-26,6 L56,6" stroke={MILK.shoeD} strokeWidth={lw * 1.2} />
					<path d="M30,-12 Q46,-10 54,0" stroke={MILK.clip} strokeWidth={lw} fill="none" strokeLinecap="round" />
					<circle cx={6} cy={-10} r={4} fill={MILK.clip} />
				</g>
			</g>
		);
	};
	const shirt = 'M-44,-416 L44,-416 Q70,-410 76,-388 L68,-250 L-68,-250 L-76,-388 Q-70,-410 -44,-416 Z';
	const caseHand = p.carry === 'case' && pose !== 'run';
	const swing = caseHand ? -(armR.a + armR.b) * 0.55 + Math.sin(t * rate * speed - 0.9) * 8 : 0;
	const grip = addP(aR.W, vdir(aR.a2), 30);
	return (
		<g transform={`translate(0 ${f1(bob)})`}>
			<ellipse cx={0} cy={-bob} rx={90 * (1 + bob / 200)} ry={14} fill="rgba(0,0,0,0.22)" />
			<g transform={`rotate(${f1(lean)} 0 -196)`}>
				{/* back arm */}
				{armTubes(aL)}
				{handAt(aL, true, gL)}
				{leg(hipL, legL, true)}
				{leg(hipR, legR, false)}
				<path d="M-60,-262 L60,-262 L84,-180 L-84,-180 Z" fill={MILK.denim} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d="M-58,-250 L58,-250" stroke={MILK.denimD} strokeWidth={lw} />
				<path d="M20,-236 L44,-236 L46,-212 Q32,-206 20,-212 Z" fill={MILK.denimD} stroke={INK} strokeWidth={lw * 0.6} />
				<defs>
					<clipPath id={`${id}s`}>
						<path d={shirt} />
					</clipPath>
				</defs>
				<path d={shirt} fill={MILK.shirt} />
				<g clipPath={`url(#${id}s)`}>
					{[0, 1, 2, 3].map((i) => (
						<rect key={i} x={-90} y={-392 + i * 38} width={180} height={15} fill={MILK.stripe} />
					))}
				</g>
				<path d={shirt} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<rect x={-14} y={-444} width={28} height={34} fill={skin} stroke={INK} strokeWidth={lw} />
				<path d="M-26,-416 Q0,-398 26,-416" stroke={MILK.shirtD} strokeWidth={lw * 1.6} fill="none" strokeLinecap="round" />
				{p.item && pose === 'hold' ? p.item : null}
				{pose === 'run' && p.carry === 'case' ? (
					<g transform="translate(14 -246) rotate(-8) scale(0.36)">
						<DollCaseG view="carry" lw={lw / 0.36} />
					</g>
				) : null}
				<g transform={`translate(0 -508) rotate(${f1(lean * 0.4)}) scale(${FS})`}>
					<GirlFaceG turn={p.turn ?? 0.35} {...p} lw={lw / FS} />
				</g>
				{/* front arm */}
				{armTubes(aR)}
				{caseHand ? (
					<g transform={`translate(${f1(grip[0])} ${f1(grip[1])}) rotate(${f1(swing)}) scale(0.4) translate(${-CASE_HANDLE[0]} ${-CASE_HANDLE[1]})`}>
						<DollCaseG view="carry" lw={lw / 0.4} />
					</g>
				) : null}
				{handAt(aR, false, gR, gRto, gRk)}
			</g>
		</g>
	);
};

/** the full-body girl placed in px: (x, y) = between her feet; s = 0.5 → 320 px tall */
export const Girl: React.FC<GirlProps & FigProps> = ({x, y, s = 0.5, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<GirlG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── Girl: peeking past the door jamb ─────────────────────────────

export type GirlPeekProps = FaceProps & {
	/** 0 = hidden behind the jamb, 1 = one eye + half the face out */
	peek?: number;
	/** wall colour right of the jamb (null = no wall) */
	wall?: string | null;
};
/** (0,0) = jamb edge at her eye level; the jamb covers x 0..180, wall beyond */
export const GirlPeekG: React.FC<GirlPeekProps> = (p) => {
	const t = p.t ?? 0;
	const lw = p.lw ?? 6;
	const pk = clamp01(p.peek ?? 1);
	const fx = lerp(260, 34, easeInOut(pk)) + Math.sin(t * 2.1) * 6;
	const fingersOut = clamp01((pk - 0.15) / 0.4);
	return (
		<g>
			<g transform={`translate(${f1(fx)} ${f1(522 + 2)}) rotate(${f1(-7 * pk)} 0 -520)`}>
				<GirlBustG t={t} expr={p.expr ?? 'curious'} look={p.look ?? [-0.85, 0.05]} turn={p.turn ?? -0.35} {...p} lw={lw} />
			</g>
			{p.wall !== null ? <rect x={180} y={-1500} width={1500} height={3000} fill={p.wall ?? MILK.wall} /> : null}
			<rect x={0} y={-1500} width={180} height={3000} fill={MILK.jamb} stroke={INK} strokeWidth={lw} />
			<line x1={28} y1={-1500} x2={28} y2={1500} stroke={MILK.jambD} strokeWidth={lw * 1.6} />
			<line x1={148} y1={-1500} x2={148} y2={1500} stroke={MILK.jambD} strokeWidth={lw} />
			<line x1={180} y1={-1500} x2={180} y2={1500} stroke={INK} strokeWidth={lw} />
			{[0, 1, 2, 3].map((i) => {
				const y0 = 214 + i * 34 + Math.sin(t * 3 + i) * 2;
				const len = (i === 3 ? 22 : 34) * fingersOut;
				return len > 1 ? <Tubes key={i} lw={lw} segs={[{pts: [[-4, y0], [len, y0 + 3]], w: 28, c: SKIN}]} /> : null;
			})}
		</g>
	);
};
export const GirlPeek: React.FC<GirlPeekProps & FigProps> = ({x, y, s = 1, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<GirlPeekG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── Toddler (flashback) ─────────────────────────────

export type ToddlerProps = {
	t: number;
	/** 0 = stands, 1 = toddles */
	walk?: number;
	/** 0..1 arms raised (to hold an adult's hand) */
	armL?: number;
	armR?: number;
	/** an adult hand holding hers from above (faceless: only the hand + sleeve); null = none */
	adultL?: HandKind | null;
	adultR?: HandKind | null;
	/** how far the adult sleeve runs up (canonical hand units) */
	adultArm?: number;
	expr?: GirlExpr;
	look?: P2;
	speed?: number;
	lw?: number;
};
const TH = 0.4;
const AH = 0.48;
/** (0,0) = feet, ≈ 430 tall, faces +x */
export const ToddlerG: React.FC<ToddlerProps> = ({t, walk = 0, armL = 0, armR = 0, adultL = null, adultR = null, adultArm = 2400, expr = 'smile', look, speed = 1, lw = 8}) => {
	const ph = t * 7 * speed;
	const w = clamp01(walk);
	const s = Math.sin(ph);
	const bob = -Math.abs(Math.cos(ph)) * 8 * w + Math.sin(t * 2) * 1.5;
	const lA = 16 * s * w;
	const legs = ([-1, 1] as const).map((sd) => {
		const H: P2 = [sd * 22, -142];
		const a = sd * lA;
		const A = addP(H, vdir(a), 120);
		return (
			<g key={sd}>
				<Tubes lw={lw} segs={[{pts: [H, A], w: 36, c: sd < 0 ? mix('#F6CBA5', '#DDA27C', 0.3) : '#F6CBA5'}]} />
				<g transform={`translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(-a * 0.5)})`}>
					<path d="M-20,-12 L14,-14 Q38,-10 40,6 L40,12 L-22,12 Q-26,-2 -20,-12 Z" fill={MILK.denimD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				</g>
			</g>
		);
	});
	const arms = ([-1, 1] as const).map((sd) => {
		const k = sd < 0 ? clamp01(armL) : clamp01(armR);
		const S: P2 = [sd * 50, -240];
		const a = sd * (lerp(14, 158, easeInOut(k)) + Math.sin(t * 3 + sd) * 3 * (1 - k)) + (k < 0.2 ? -lA * 0.6 : 0);
		const E = addP(S, vdir(a), 52);
		const W = addP(E, vdir(a + sd * 8), 50);
		const a2 = limbA(E, W);
		const Hc = addP(W, vdir(a2), 26);
		return {sd, S, E, W, a2, Hc, k};
	});
	const adult = (sd: -1 | 1, part: 'back' | 'front') => {
		const kind = sd < 0 ? adultL : adultR;
		const a = arms.find((x) => x.sd === sd)!;
		if (!kind || a.k < 0.6) return null;
		const flip = sd < 0;
		const xf = gripXf(kind, a.Hc[0] + sd * 10, a.Hc[1] - 4, 180 + sd * 16, AH, flip);
		return (
			<g key={`${sd}${part}`} transform={xf}>
				<HandG kind={kind} gesture="hold" arm={adultArm} t={t} lw={lw / AH / KIND[kind].ks} part={part} />
			</g>
		);
	};
	return (
		<g>
			<ellipse cx={0} cy={0} rx={70} ry={11} fill="rgba(0,0,0,0.2)" />
			{adult(-1, 'back')}
			{adult(1, 'back')}
			<g transform={`translate(0 ${f1(bob)})`}>
				{legs}
				{arms
					.filter((a) => a.sd < 0)
					.map((a) => (
						<g key="al">
							<Tubes lw={lw} segs={[{pts: [a.S, a.E, a.W], w: 26, c: '#F6CBA5'}]} />
							<g transform={`translate(${f1(a.W[0])} ${f1(a.W[1])}) rotate(${f1(180 - a.a2)}) scale(${-TH} ${TH})`}>
								<HandG kind="toddler" gesture={a.k > 0.6 ? 'grab' : 'rest'} arm={10} lw={(lw * 0.6) / TH} />
							</g>
						</g>
					))}
				<path d="M-40,-262 L40,-262 Q58,-250 62,-230 L74,-128 L-74,-128 L-62,-230 Q-58,-250 -40,-262 Z" fill={MILK.romper} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<ellipse cx={-46} cy={-236} rx={20} ry={17} fill={MILK.romper} stroke={INK} strokeWidth={lw} />
				<path d="M-60,-150 L60,-150" stroke={MILK.romperD} strokeWidth={lw} />
				{([-1, 1] as const).map((sd) => (
					<path key={sd} d={`M0,-262 Q${sd * 30},-232 ${sd * 42},-258`} fill="#FFFDF5" stroke={INK} strokeWidth={lw * 0.8} />
				))}
				<g transform="translate(4 -334) scale(0.44)">
					<GirlFaceG t={t} expr={expr} turn={0.45} look={look} young hair="tuft" lw={lw / 0.44} seed={3} />
				</g>
				{arms
					.filter((a) => a.sd > 0)
					.map((a) => (
						<g key="ar">
							<Tubes lw={lw} segs={[{pts: [a.S, a.E, a.W], w: 26, c: '#F6CBA5'}]} />
							<ellipse cx={a.S[0] - 4} cy={a.S[1] + 4} rx={20} ry={17} fill={MILK.romper} stroke={INK} strokeWidth={lw} />
							<g transform={`translate(${f1(a.W[0])} ${f1(a.W[1])}) rotate(${f1(180 - a.a2)}) scale(${TH} ${TH})`}>
								<HandG kind="toddler" gesture={a.k > 0.6 ? 'grab' : 'rest'} arm={10} lw={(lw * 0.6) / TH} />
							</g>
						</g>
					))}
			</g>
			{adult(-1, 'front')}
			{adult(1, 'front')}
		</g>
	);
};
export const Toddler: React.FC<ToddlerProps & FigProps> = ({x, y, s = 0.6, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<ToddlerG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── photos (her mirror copy, generic kids) ─────────────────────────────

export type KidId = 'her' | number;
// generic kids never get her bob + bangs or her toddler tuft (only she has them)
const KID_STYLES: HairStyle[] = ['short', 'pigtails', 'curly', 'short', 'pigtails', 'curly', 'short'];
const KID_HAIRS: (readonly [string, string, string])[] = [
	['#2E2421', '#17110F', '#4D3B35'],
	['#E5B65A', '#B9862E', '#F5D58E'],
	['#C1532B', '#8E3517', '#E07B4E'],
	['#9A6A3E', '#6E4724', '#BF8C5C'],
	['#5A3A24', '#3A2414', '#7E5636'],
];
const KID_SHIRTS: (readonly [string, string, string])[] = [
	['#E46A4F', '#B9482F', '#F7C9B9'],
	['#4A72B8', '#2F5291', '#C9D8F2'],
	['#FFC83A', '#C98E12', '#FFF0C2'],
	['#7AB85A', '#4F8A36', '#D8EECB'],
	['#B88BD0', '#8F66A8', '#EBDDF3'],
];
const KID_SKINS = [SKIN, '#E9B48C', '#C98E68', '#8D5A3B', '#F6D2B4'];
const KID_EXPR: GirlExpr[] = ['smile', 'blank', 'smile', 'curious', 'smile'];
/** look of generic kid n (never a real child): hair style / colours / shirt / skin */
export const kidLook = (n: number) => ({
	hair: KID_STYLES[Math.abs(n) % KID_STYLES.length],
	hairC: KID_HAIRS[Math.abs(n * 7 + 3) % KID_HAIRS.length],
	shirt: KID_SHIRTS[Math.abs(n * 5 + 1) % KID_SHIRTS.length],
	skin: KID_SKINS[Math.abs(n * 3 + 2) % KID_SKINS.length],
	expr: KID_EXPR[Math.abs(n) % KID_EXPR.length],
	freckles: h1(n * 3.3) > 0.65,
	clip: false,
	mirror: h1(n * 1.7) > 0.5,
});

export type KidPhotoProps = {
	w: number;
	h: number;
	kid?: KidId;
	/** the toddler version of her (rounder, tuft) */
	young?: boolean;
	expr?: GirlExpr;
	tone?: 'bw' | 'sepia' | 'color';
	/** 0..1 glint on the printed clip */
	spark?: number;
	halftone?: boolean;
	t?: number;
	lw?: number;
};
const PHOTO_K = (w: number) => w / 470;
const photoAnchorY = (w: number, h: number) => -h * 0.04 + 520 * PHOTO_K(w);
/** printed eye centres of KidPhotoG(w, h) for 'her' (photo units) */
export const photoEyes = (w: number, h: number): [P2, P2] => {
	const k = PHOTO_K(w);
	const ay = photoAnchorY(w, h);
	return [
		[56 * k, ay + (-520 - 2) * k],
		[-56 * k, ay + (-520 - 2) * k],
	];
};
/** a printed portrait, centre (0,0): she is drawn MIRRORED (same clip + bangs), static (prints don't blink) */
export const KidPhotoG: React.FC<KidPhotoProps> = ({w, h, kid = 'her', young, expr, tone = 'bw', spark = 0, halftone = true, t = 0, lw = 6}) => {
	const id = useSid('kp');
	const k = PHOTO_K(w);
	const v = typeof kid === 'number' ? kidLook(kid) : null;
	const mirror = v ? v.mirror : true;
	const sp = Math.max(4.5, w / 32);
	const face: FaceProps = v
		? {hair: v.hair, hairC: v.hairC, skin: v.skin, expr: expr ?? v.expr, freckles: v.freckles, clip: false, seed: typeof kid === 'number' ? kid : 0}
		: young
			? {hair: 'tuft', young: true, expr: expr ?? 'smile'}
			: {expr: expr ?? 'smile'};
	return (
		<g>
			<defs>
				<clipPath id={`${id}c`}>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} />
				</clipPath>
				<linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#D7DCE3" />
					<stop offset="1" stopColor="#9EA7B4" />
				</linearGradient>
				<pattern id={`${id}h`} width={sp} height={sp} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<circle cx={sp / 2} cy={sp / 2} r={sp * 0.3} fill={INK} />
				</pattern>
				{tone !== 'color' ? <ToneFilter id={`${id}f`} tone={tone} /> : null}
			</defs>
			<g clipPath={`url(#${id}c)`}>
				<g filter={tone !== 'color' ? `url(#${id}f)` : undefined}>
					<rect x={-w / 2} y={-h / 2} width={w} height={h} fill={`url(#${id}g)`} />
					<g transform={`translate(0 ${f1(photoAnchorY(w, h))}) scale(${f1(mirror ? -k : k)} ${k.toFixed(4)})`}>
						<GirlBustG t={0} blink={false} {...face} shirt={v ? v.shirt : undefined} skin={v ? v.skin : undefined} spark={spark} lw={lw / k} />
					</g>
				</g>
				{halftone ? <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={`url(#${id}h)`} opacity={0.26} /> : null}
				<rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={w * 0.05} />
			</g>
			<rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke={INK} strokeWidth={lw * 0.8} />
			{spark > 0 ? <Sparkle x={(mirror ? -1 : 1) * 80 * k} y={photoAnchorY(w, h) - 680 * k} r={30 * Math.max(0.6, w / 210)} k={spark} rot={t * 90} lw={lw * 0.5} /> : null}
		</g>
	);
};

export type PhotoPrintProps = Omit<KidPhotoProps, 'h'> & {w?: number};
/** a loose photo print with a white border, centre (0,0), w wide × 1.2 w tall */
export const PhotoPrintG: React.FC<PhotoPrintProps> = ({w = 300, lw = 6, tone = 'sepia', ...p}) => {
	const H = w * 1.2;
	const m = w * 0.07;
	return (
		<g>
			<rect x={-w / 2 + 10} y={-H / 2 + 14} width={w} height={H} rx={6} fill="rgba(0,0,0,0.25)" />
			<rect x={-w / 2} y={-H / 2} width={w} height={H} rx={6} fill={tone === 'sepia' ? '#F4EAD5' : '#FBFAF6'} stroke={INK} strokeWidth={lw} />
			<g transform={`translate(0 ${f1(-H / 2 + m + (w - 2 * m) * 0.58)})`}>
				<KidPhotoG w={w - 2 * m} h={(w - 2 * m) * 1.16} tone={tone} lw={lw} halftone={false} {...p} />
			</g>
		</g>
	);
};
/** placed photo print; `tone` here is the photo's own tone (bw / sepia / color) */
export const PhotoPrint: React.FC<PhotoPrintProps & Omit<FigProps, 'tone'>> = ({x, y, s = 1, rot, flip, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} sil={sil} opacity={opacity}>
		<PhotoPrintG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── the MISSING notice ─────────────────────────────

export const NOTICE = {w: 360, h: 500, photo: {cx: 0, cy: 52, w: 228, h: 230}, name: 198, date: 230};
// rough Anton advances of M I S S I N G (only to place the scribbles over the letters)
const M_W = [1.22, 0.5, 0.96, 0.96, 0.5, 1.04, 1.0];
const MIS_LEN = 316;
const misCenters = (() => {
	const tot = M_W.reduce((a, b) => a + b, 0);
	let acc = 0;
	return M_W.map((w) => {
		const c = -MIS_LEN / 2 + ((acc + w / 2) / tot) * MIS_LEN;
		acc += w;
		return {c, w: (w / tot) * MIS_LEN};
	});
})();
/** loopy scribble (illegible handwriting / a melted letter), centred, width w, height hgt */
const scribble = (w: number, hgt: number, seed: number, tt = 0, loopW = 34) => {
	const n = Math.max(14, Math.round(w / 5));
	const loops = Math.max(1.3, w / loopW);
	let d = '';
	for (let j = 0; j <= n; j++) {
		const u = j / n;
		const th = u * loops * Math.PI * 2 + seed;
		const amp = 0.72 + 0.28 * Math.sin(seed * 3 + u * 7 + tt * 6);
		const x = -w / 2 + u * w - Math.sin(th) * Math.min(14, w * 0.12);
		const y = Math.cos(th) * hgt * 0.42 * amp + Math.sin(u * 11 + seed) * hgt * 0.08;
		d += (j ? ' L' : 'M') + f1(x) + ',' + f1(y);
	}
	return d;
};
/** a wavy pen stroke without loops or upstrokes, centred, width w, height hgt — the name and date lines under the photo: the loopy
 *  scribble's closed ovals and vertical strokes OCR'd as digits there («40T», «500», also on the macro of the header), a plain
 *  uneven wave reads as no character at all */
const waveStroke = (w: number, hgt: number, seed: number, waveW = 30) => {
	const n = Math.max(14, Math.round(w / 4));
	const waves = Math.max(1.2, w / waveW);
	let d = '';
	for (let j = 0; j <= n; j++) {
		const u = j / n;
		const amp = 0.7 + 0.3 * Math.sin(seed * 2.3 + u * 5.1);
		const x = -w / 2 + u * w;
		// uneven spacing (phase wobble) and a slow drift: no two humps alike, so nothing reads as m / n / w / u
		const y = Math.sin(u * waves * Math.PI * 2 + seed + 0.9 * Math.sin(u * 3.7 + seed * 1.3)) * hgt * 0.3 * amp + Math.sin(u * 4.3 + seed * 1.7) * hgt * 0.12;
		d += (j ? ' L' : 'M') + f1(x) + ',' + f1(y);
	}
	return d;
};
/** a scribble line split into «words» with gaps (wave = waveStroke instead of the loopy scribble) */
const scribbleLine = (x0: number, x1: number, y: number, hgt: number, seed: number, words: number, loopW: number, wave = false) => {
	const W = x1 - x0;
	const gaps = words - 1;
	const gap = 16;
	const ws = Array.from({length: words}, (_, i) => 0.6 + 0.8 * h1(seed * 5.1 + i * 2.3));
	const tot = ws.reduce((a, b) => a + b, 0);
	let x = x0;
	return ws.map((wv, i) => {
		const ww = ((W - gaps * gap) * wv) / tot;
		const cx = x + ww / 2;
		x += ww + gap;
		return {cx, y, d: wave ? waveStroke(ww, hgt, seed + i * 1.9, loopW) : scribble(ww, hgt, seed + i * 1.9, 0, loopW)};
	});
};

export type NoticeProps = {
	t?: number;
	/** 0..1 for all of MISSING (and CHILD), or one value per letter M-I-S-S-I-N-G: letters wobble and melt into scribbles */
	wriggle?: number | number[];
	/** 0..7: letters light up left → right (orange glow), fractional = fading in */
	lit?: number;
	/** 0..1 marker sweep along the name line */
	nameHi?: number;
	kid?: KidId;
	expr?: GirlExpr;
	spark?: number;
	lw?: number;
};
/** the MISSING CHILD panel, centre (0,0), 360 × 500 */
export const NoticeG: React.FC<NoticeProps> = ({t = 0, wriggle = 0, lit = 0, nameHi = 0, kid = 'her', expr, spark = 0, lw = 6}) => {
	const id = useSid('nt');
	const W = NOTICE.w;
	const H = NOTICE.h;
	const wr = M_W.map((_, i) => clamp01(Array.isArray(wriggle) ? (wriggle[i] ?? 0) : wriggle));
	const wAvg = wr.reduce((a, b) => a + b, 0) / wr.length;
	const offs = wr.map((v, i) => v * 18 * Math.sin(t * 13 + i * 1.9));
	const rots = wr.map((v, i) => v * 24 * Math.sin(t * 10 + i * 2.6));
	const dys = offs.map((o, i) => (i === 0 ? o : o - offs[i - 1]));
	const baseY = -H / 2 + 110;
	const letters = 'MISSING'.split('');
	const name = scribbleLine(-112, 112, NOTICE.name, 16, 4.1, 2, 50, true);
	const date = scribbleLine(-74, 74, NOTICE.date, 14, 9.7, 3, 30, true);
	return (
		<g>
			<defs>
				<filter id={`${id}b`} x="-30%" y="-60%" width="160%" height="220%">
					<feGaussianBlur stdDeviation={6} />
				</filter>
			</defs>
			<rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#FFFDF7" />
			<rect x={-W / 2 + 10} y={-H / 2 + 10} width={W - 20} height={H - 20} rx={6} fill="none" stroke={PAL.stamp} strokeWidth={6} />
			{lit > 0.01 ? (
				<text x={0} y={baseY} textAnchor="middle" fontFamily={ANTON} fontSize={120} textLength={MIS_LEN} lengthAdjust="spacingAndGlyphs" fill="none" stroke={PAL.orange} strokeWidth={22} strokeLinejoin="round" filter={`url(#${id}b)`}>
					{letters.map((ch, i) => (
						<tspan key={i} dy={dys[i]} rotate={rots[i]} strokeOpacity={clamp01(lit - i)}>
							{ch}
						</tspan>
					))}
				</text>
			) : null}
			<text x={0} y={baseY} textAnchor="middle" fontFamily={ANTON} fontSize={120} textLength={MIS_LEN} lengthAdjust="spacingAndGlyphs" fill={PAL.stamp}>
				{letters.map((ch, i) => (
					<tspan key={i} dy={dys[i]} rotate={rots[i]} fillOpacity={1 - 0.92 * wr[i]} fill={clamp01(lit - i) > 0.5 ? '#FF2A3D' : PAL.stamp}>
						{ch}
					</tspan>
				))}
			</text>
			{misCenters.map((m, i) =>
				wr[i] > 0.02 ? (
					<path
						key={i}
						d={scribble(m.w * 0.95, 78, i * 2.7 + 1, t)}
						transform={`translate(${f1(m.c)} ${f1(baseY - 44 + offs[i])}) rotate(${f1(rots[i])})`}
						stroke={PAL.stamp}
						strokeWidth={10}
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
						opacity={wr[i]}
					/>
				) : null,
			)}
			<text x={0} y={baseY + 54} textAnchor="middle" fontFamily={ANTON} fontSize={46} textLength={128} lengthAdjust="spacingAndGlyphs" fill={INK} fillOpacity={1 - 0.92 * wAvg}>
				CHILD
			</text>
			{wAvg > 0.02 ? <path d={scribble(130, 36, 7.3, t)} transform={`translate(0 ${baseY + 38})`} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" opacity={wAvg} /> : null}
			<g transform={`translate(${NOTICE.photo.cx} ${NOTICE.photo.cy})`}>
				<KidPhotoG w={NOTICE.photo.w} h={NOTICE.photo.h} kid={kid} expr={expr} spark={spark} t={t} lw={lw} />
			</g>
			{nameHi > 0.01 ? <rect x={-122} y={NOTICE.name - 18} width={244 * clamp01(nameHi)} height={36} rx={8} fill={PAL.orange} opacity={0.38} /> : null}
			{name.map((s, i) => (
				<path key={`n${i}`} d={s.d} transform={`translate(${f1(s.cx)} ${s.y})`} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			))}
			{date.map((s, i) => (
				<path key={`d${i}`} d={s.d} transform={`translate(${f1(s.cx)} ${s.y})`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
			))}
		</g>
	);
};
export const Notice: React.FC<NoticeProps & FigProps> = ({x, y, s = 1, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<NoticeG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── cut edge + Cutout ─────────────────────────────

export const CUT = {w: 372, h: 514};
/** the wobbly kid-scissors outline around the notice (notice units); MilkCarton's hole uses the same seed → they match */
export const cutEdge = (seed = 3, w = CUT.w, h = CUT.h, step = 30, jit = 7): P2[] => {
	const pts: P2[] = [];
	const side = (a: P2, b: P2, si: number) => {
		const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
		const nx = -(b[1] - a[1]);
		const ny = b[0] - a[0];
		const L = Math.hypot(nx, ny);
		for (let i = 0; i < n; i++) {
			const u = i / n;
			const j = (Math.sin(u * Math.PI * 2 * 1.3 + seed + si * 2.1) * 0.65 + (h1(seed * 7.3 + si * 13.1 + i * 1.7) - 0.5) * 0.7) * jit * (i === 0 ? 0.3 : 1);
			pts.push([lerp(a[0], b[0], u) + (nx / L) * j, lerp(a[1], b[1], u) + (ny / L) * j]);
		}
	};
	const A: P2 = [-w / 2, -h / 2];
	const B: P2 = [w / 2, -h / 2];
	const C: P2 = [w / 2, h / 2];
	const D: P2 = [-w / 2, h / 2];
	side(A, B, 0);
	side(B, C, 1);
	side(C, D, 2);
	side(D, A, 3);
	return pts;
};
/** points along the rectangular cut path (for the dashed line that grows with each snip), 0..1 of the perimeter from top-left */
const cutLinePts = (k: number, w = CUT.w + 14, h = CUT.h + 14): P2[] => {
	const P = 2 * (w + h);
	let left = clamp01(k) * P;
	const corners: P2[] = [
		[-w / 2, -h / 2],
		[w / 2, -h / 2],
		[w / 2, h / 2],
		[-w / 2, h / 2],
		[-w / 2, -h / 2],
	];
	const out: P2[] = [corners[0]];
	for (let i = 0; i < 4 && left > 0; i++) {
		const a = corners[i];
		const b = corners[i + 1];
		const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
		const u = Math.min(1, left / L);
		out.push(lerpP(a, b, u));
		left -= L;
	}
	return out;
};

export type CutoutProps = NoticeProps & {
	/** 0..1 bottom-right corner curls up */
	curl?: number;
	/** show the grey cardboard back instead of the print */
	back?: boolean;
	/** 0..1 a round fridge magnet pops on at the top */
	magnet?: number;
	/** drop shadow strength 0..1 */
	shadow?: number;
	seed?: number;
};
/** the cut-out notice, centre (0,0), ≈ 380 × 520 with a wobbly edge */
export const CutoutG: React.FC<CutoutProps> = ({curl = 0, back = false, magnet = 0, shadow = 0.6, seed = 3, lw = 6, ...n}) => {
	const id = useSid('co');
	const edge = cutEdge(seed);
	const d = pathOf(edge);
	const f = 110 * clamp01(curl);
	const R = CUT.w / 2;
	const B = CUT.h / 2;
	const A: P2 = [R + 4, B - f];
	const C: P2 = [R - f, B + 4];
	const clipPoly: P2[] = [[-3000, -3000], [A[0] + 2000, A[1] - 2000], [C[0] - 2000, C[1] + 2000], [-3000, 3000]];
	const mg = popK01(magnet);
	return (
		<g>
			<defs>
				<clipPath id={`${id}e`}>
					<path d={d} />
				</clipPath>
				<clipPath id={`${id}f`}>
					<path d={pathOf(clipPoly)} />
				</clipPath>
			</defs>
			{shadow > 0 ? <path d={d} transform="translate(12 16)" fill="rgba(0,0,0,0.3)" opacity={shadow} clipPath={f > 1 ? `url(#${id}f)` : undefined} /> : null}
			<g clipPath={f > 1 ? `url(#${id}f)` : undefined}>
				<path d={d} fill={back ? MILK.cartonD : '#FFFDF7'} />
				<g clipPath={`url(#${id}e)`}>
					{back ? (
						<g>
							{Array.from({length: 9}, (_, i) => (
								<line key={i} x1={-200} y1={-240 + i * 60} x2={200} y2={-230 + i * 60} stroke={MILK.cartonS} strokeWidth={6} opacity={0.6} />
							))}
							<rect x={-200} y={-280} width={400} height={50} fill={MILK.bandL} opacity={0.5} />
						</g>
					) : (
						<NoticeG lw={lw} {...n} />
					)}
				</g>
				<path d={d} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			</g>
			{f > 1 ? (
				<g>
					<path d={pathOf([A, C, [R - f * 0.9, B - f * 0.9]])} fill={back ? '#FFFDF7' : MILK.cartonD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d={`M${f1(A[0])},${f1(A[1])} L${f1(C[0])},${f1(C[1])}`} stroke={INK} strokeWidth={lw} />
				</g>
			) : null}
			{mg > 0.01 ? (
				// straddles the top edge above the header (half on the paper, half on the fridge): the MISSING letters stay clear
				<g transform={`translate(0 ${-B - 8}) scale(${mg.toFixed(3)})`}>
					<circle r={38} cx={4} cy={6} fill="rgba(0,0,0,0.3)" />
					<circle r={38} fill={PAL.stamp} stroke={INK} strokeWidth={lw} />
					<circle r={26} fill="#E5404F" />
					<ellipse cx={-12} cy={-14} rx={10} ry={7} fill="#fff" opacity={0.7} transform="rotate(-30 -12 -14)" />
				</g>
			) : null}
		</g>
	);
};
const popK01 = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2));
export const Cutout: React.FC<CutoutProps & FigProps> = ({x, y, s = 1, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<CutoutG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── MilkCarton ─────────────────────────────

export type CartonView = 'front' | 'three4';
export type CartonHand = {
	kind?: HandKind;
	/** +1 = hand on the right edge (palm facing left), −1 = left edge */
	side?: -1 | 1;
	/** grip height, 0 (bottom) .. 1 (top of the body); default 0.16 keeps his thumb below the printed photo */
	at?: number;
	/** arm angle, deg (0 = fingers up, arm straight down) */
	rot?: number;
	gesture?: HandGesture;
	/** hand size in carton units (1.35 ≈ a big man's hand on a half-gallon) */
	scale?: number;
	arm?: number;
	glint?: number;
};
export type MilkCartonProps = NoticeProps & {
	view?: CartonView;
	/** 0..1 pour spout opens */
	open?: number;
	/** rotation around the body centre (0,−405), deg */
	tilt?: number;
	/** landing squash 0..1 */
	squash?: number;
	/** 0..1 the dashed cut line grows around the notice (each snip) */
	cut?: number;
	/** 0..1 the notice is gone: a hole with the same wobbly edge as Cutout */
	hole?: number;
	/** 0..1 greys out (wall of cartons) */
	dim?: number;
	hand?: CartonHand | null;
};
export const CARTON = {w: 400, h: 640, roof: -770, fin: -808, notice: [0, -300] as P2, center: [0, -405] as P2};
const cg = (view: CartonView) => (view === 'front' ? {fr: 200, nx: 0, nsx: 1} : {fr: 130, nx: -35, nsx: 0.825});
/** a point in notice units → carton units */
export const cartonPt = (p: P2, view: CartonView = 'front'): P2 => {
	const g = cg(view);
	return [g.nx + p[0] * g.nsx, CARTON.notice[1] + p[1]];
};
/** the printed eye centres (her left/right as printed) in carton units — line them up with her real eyes in frame 0 */
export const cartonEyes = (view: CartonView = 'front'): [P2, P2] => {
	const e = photoEyes(NOTICE.photo.w, NOTICE.photo.h);
	return [cartonPt([e[0][0] + NOTICE.photo.cx, e[0][1] + NOTICE.photo.cy], view), cartonPt([e[1][0] + NOTICE.photo.cx, e[1][1] + NOTICE.photo.cy], view)];
};

/** a gable-top milk carton, (0,0) = bottom centre of the front face */
export const MilkCartonG: React.FC<MilkCartonProps> = ({view = 'front', open = 0, tilt = 0, squash = 0, cut = 0, hole = 0, dim = 0, hand = null, lw = 8, ...n}) => {
	const id = useSid('mc');
	const g = cg(view);
	const t = n.t ?? 0;
	const q = view === 'three4';
	const fl = -200;
	const fr = g.fr;
	const body: P2[] = [
		[fl, 0],
		[fr, 0],
		[fr, -640],
		[fl, -640],
	];
	const side: P2[] = [
		[130, 0],
		[320, -40],
		[320, -680],
		[130, -640],
	];
	const roof: P2[] = q
		? [
				[fl, -640],
				[fr, -640],
				[225, -800],
				[-105, -800],
			]
		: [
				[fl, -640],
				[fr, -640],
				[196, -770],
				[-196, -770],
			];
	const gable: P2[] = [
		[130, -640],
		[320, -680],
		[225, -800],
	];
	const fin: P2[] = q
		? [
				[-105, -800],
				[225, -800],
				[225, -838],
				[-105, -838],
			]
		: [
				[-196, -770],
				[196, -770],
				[196, -808],
				[-196, -808],
			];
	const finSide: P2[] = [
		[225, -800],
		[236, -808],
		[236, -846],
		[225, -838],
	];
	const ow = clamp01(open);
	const spoutBase: P2 = q ? [-105, -800] : [-196, -770];
	const notice: P2 = [g.nx, -300];
	const nXf = `translate(${f1(notice[0])} ${notice[1]}) scale(${g.nsx} 1)`;
	// band wave on the front face
	const waveY = -584;
	let wave = `M${fl},-640 L${fr},-640 L${fr},${waveY}`;
	const nW = 6;
	for (let i = nW; i > 0; i--) {
		const x0 = fl + ((fr - fl) * i) / nW;
		const x1 = fl + ((fr - fl) * (i - 1)) / nW;
		wave += ` Q${f1((x0 + x1) / 2)},${waveY + (i % 2 ? 20 : -14)} ${f1(x1)},${waveY}`;
	}
	wave += ' Z';
	// hand holding the side edge
	const hk = hand ? (hand.kind ?? 'man') : 'man';
	const hs = hand?.scale ?? 1.35;
	const hside = hand?.side ?? 1;
	const ex = hside > 0 ? (q ? 320 : 200) : -200;
	const ey = q && hside > 0 ? -40 - (hand?.at ?? 0.16) * 640 : -(hand?.at ?? 0.16) * 640;
	const hxf = hand ? gripXf(hk, ex - hside * 4, ey, hand.rot ?? -hside * 10, hs, hside > 0) : '';
	const hprops = hand ? {kind: hk, gesture: hand.gesture ?? ('grab' as HandGesture), arm: hand.arm ?? 900, t, glint: hand.glint ?? 0, lw: lw / hs / KIND[hk].ks} : null;
	const holeK = clamp01(hole);
	const edge = cutEdge(3);
	const cutPts = cutLinePts(cut);
	return (
		<g transform={`rotate(${f1(tilt)} 0 -405) scale(${(1 + squash * 0.25).toFixed(3)} ${(1 - squash * 0.3).toFixed(3)})`}>
			<defs>
				<clipPath id={`${id}b`}>
					<path d={pathOf(body)} />
				</clipPath>
				<linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#2A251E" />
					<stop offset="1" stopColor={MILK.cartonIn} />
				</linearGradient>
			</defs>
			{hand && hprops ? (
				<g transform={hxf}>
					<HandG {...hprops} part="back" />
				</g>
			) : null}
			<Toned tone="dim" k={dim}>
				<g>
					{/* side face (3/4) */}
					{q ? (
						<g>
							<path d={pathOf(side)} fill={MILK.cartonS} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
							<g transform="matrix(1 -0.2105 0 1 130 0)">
								<rect x={0} y={-640} width={190} height={62} fill={MILK.band} />
								<rect x={0} y={-24} width={190} height={24} fill={MILK.band} />
								<g transform="translate(95 -440)">
									<path d="M-34,-60 L34,-60 L26,60 L-26,60 Z" fill="#fff" stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
									<path d="M-31,-20 L31,-20 L26,60 L-26,60 Z" fill={MILK.bandL} opacity={0.5} />
								</g>
								{[0, 1, 2, 3, 4].map((i) => (
									<rect key={i} x={30} y={-300 + i * 34} width={i % 2 ? 110 : 130} height={12} rx={6} fill={MILK.cartonD} />
								))}
							</g>
							<path d={pathOf(side)} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
							<path d={pathOf(gable)} fill="#86B9E6" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
							<path d={pathOf(finSide)} fill={MILK.cartonS} stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
						</g>
					) : null}
					{/* front face */}
					<path d={pathOf(body)} fill={MILK.carton} />
					<g clipPath={`url(#${id}b)`}>
						<path d={wave} fill={MILK.band} />
						{[-0.6, -0.15, 0.35, 0.75].map((f, i) => (
							<circle key={i} cx={lerp(fl, fr, (f + 1) / 2)} cy={-616 + (i % 2) * 10} r={8 + (i % 2) * 4} fill="#fff" opacity={0.85} />
						))}
						<rect x={fl} y={-26} width={fr - fl} height={26} fill={MILK.band} />
						<rect x={fr - 22} y={-640} width={22} height={640} fill="rgba(0,0,0,0.05)" />
					</g>
					<g transform={nXf}>
						<NoticeG lw={lw * 0.8} {...n} />
						{holeK > 0.01 ? (
							<g opacity={holeK}>
								<path d={pathOf(edge)} fill={`url(#${id}h)`} />
								<path d={pathOf(edge)} fill="none" stroke="#F3EEE2" strokeWidth={lw * 2.2} strokeLinejoin="round" transform="translate(5 6)" opacity={0.7} />
								<path d={pathOf(edge)} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
							</g>
						) : null}
						{cut > 0.005 && holeK < 0.99 ? (
							<polyline points={pl(cutPts)} fill="none" stroke={INK} strokeWidth={lw * 0.9} strokeDasharray="18 12" strokeLinecap="round" opacity={0.75} />
						) : null}
					</g>
					<path d={pathOf(body)} fill="none" stroke={INK} strokeWidth={lw * 1.1} strokeLinejoin="round" />
					{/* roof + fin */}
					<path d={pathOf(roof)} fill={MILK.bandL} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d={pathOf([roof[3], roof[2], lerpP(roof[2], roof[1], 0.45), lerpP(roof[3], roof[0], 0.45)])} fill={MILK.band} opacity={0.35} />
					<path d={pathOf(roof)} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d={`M${fl + 30},-650 L${(roof[3][0] + 30).toFixed(1)},${roof[3][1] + 10}`} stroke="#fff" strokeWidth={lw * 1.4} opacity={0.6} strokeLinecap="round" />
					<path d={pathOf(fin)} fill={MILK.cartonD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<line x1={fin[0][0] + 10} y1={(fin[0][1] + fin[3][1]) / 2} x2={fin[1][0] - 10} y2={(fin[0][1] + fin[3][1]) / 2} stroke={MILK.cartonS} strokeWidth={lw * 0.8} strokeDasharray="10 8" />
					{ow > 0.01 ? (
						<g transform={`translate(${spoutBase[0]} ${spoutBase[1]})`}>
							<path d={`M0,-38 L${f1(-70 * ow)},${f1(-46 - 26 * ow)} L${f1(-56 * ow)},${f1(24 * ow)} L0,30 Z`} fill={MILK.carton} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
							<path d={`M${f1(-8 * ow)},-22 L${f1(-56 * ow)},${f1(-40 - 18 * ow)} L${f1(-46 * ow)},${f1(14 * ow)} Z`} fill="#3A342C" stroke={INK} strokeWidth={lw * 0.7} strokeLinejoin="round" />
						</g>
					) : null}
				</g>
			</Toned>
			{hand && hprops ? (
				<g transform={hxf}>
					<HandG {...hprops} part="front" />
				</g>
			) : null}
		</g>
	);
};
export const MilkCarton: React.FC<MilkCartonProps & FigProps> = ({x, y, s = 0.6, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<MilkCartonG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── Scissors ─────────────────────────────

export type ScissorsProps = {
	/** 0 closed .. 1 wide open */
	open?: number;
	/** her small fist on the handles, thumb in the upper ring */
	hand?: boolean;
	/** forearm direction from the wrist, degrees in the scissors' OWN frame (atan2: 0 = +x, 90 = +y); default = the natural pose
	 *  (≈ 61°, down-right). A scene that rotates the scissors passes (wanted frame angle − rot) so the arm can point at a frame edge */
	armAng?: number;
	/** forearm + sleeve length from the wrist, units (default = the short 286-unit stub). ≈ 1900 → the arm always leaves the frame */
	arm?: number;
	lw?: number;
};
/** a round-tipped blade (kid scissors): a blunt rounded end, no point */
const BLADE = 'M0,22 C-14,12 -24,-10 -24,-60 C-24,-108 -21,-138 -19,-150 C-17,-174 7,-176 6,-152 L4,-60 L4,22 Z';
/** round-tip kid scissors, (0,0) = pivot, blades up */
export const ScissorsG: React.FC<ScissorsProps> = ({open = 0, hand = false, armAng, arm, lw = 8}) => {
	const th = clamp01(open) * 18;
	const ringR: P2 = [50, 104];
	const ringL: P2 = [-44, 94];
	const piece = (left: boolean) => (
		<g>
			<Tubes lw={lw} segs={[{pts: left ? [[0, 6], [ringL[0] + 18, ringL[1] - 30]] : [[0, 6], [ringR[0] - 18, ringR[1] - 32]], w: 26, c: MILK.scissor}]} />
			<path d={left ? ringPath(ringL[0], ringL[1], 38, 22) : ringPath(ringR[0], ringR[1], 46, 28)} fill={MILK.scissor} fillRule="evenodd" stroke={INK} strokeWidth={lw} />
			<path d={left ? `M${ringL[0] - 26},${ringL[1] - 14} A30,30 0 0 1 ${ringL[0] - 4},${ringL[1] - 32}` : `M${ringR[0] - 32},${ringR[1] - 16} A36,36 0 0 1 ${ringR[0] - 6},${ringR[1] - 38}`} stroke="#FFF0C2" strokeWidth={6} fill="none" strokeLinecap="round" />
			<g transform={left ? 'scale(-1 1)' : undefined}>
				<path d={BLADE} fill={MILK.steel} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d="M-14,-40 C-16,-100 -14,-130 -11,-150" stroke={MILK.steelL} strokeWidth={6} fill="none" strokeLinecap="round" />
				<path d="M2,-60 L3,10" stroke={MILK.steelD} strokeWidth={3} />
			</g>
		</g>
	);
	const rR = rotP(ringR, -th);
	const rL = rotP(ringL, th);
	// her small hand: back of the hand + forearm behind the scissors, three fingers hooked through the big ring, thumb in the
	// small ring (follows the rings as the scissors open / close)
	const hb: P2 = [rR[0] + 44, rR[1] + 40];
	const u0: P2 = [rR[0] - hb[0], rR[1] - hb[1]];
	const ul = Math.hypot(u0[0], u0[1]);
	const u: P2 = [u0[0] / ul, u0[1] / ul];
	const pp: P2 = [-u[1], u[0]];
	const fa: P2 = [hb[0] + 140, hb[1] + 250];
	const tb = addP(hb, pp, 44);
	const tm: P2 = [lerp(tb[0], rL[0], 0.55), Math.min(tb[1], rL[1]) - 30];
	const ha = deg(Math.atan2(u[1], u[0]));
	// the forearm: the original short stub, or (armAng / arm given) a long one in its own direction — skin to ≈ 240, then the sleeve
	const custom = armAng !== undefined || arm !== undefined;
	const ad = rad(armAng ?? deg(Math.atan2(250, 140)));
	const dv: P2 = [Math.cos(ad), Math.sin(ad)];
	const armL = Math.max(300, arm ?? 286);
	return (
		<g>
			{hand && custom ? (
				<g>
					<Tubes lw={lw} segs={[{pts: [hb, addP(hb, dv, 240)], w: 72, c: SKIN}]} />
					<Tubes lw={lw} segs={[{pts: [addP(hb, dv, 229), addP(hb, dv, armL)], w: 100, c: MILK.shirt}]} />
					<rect x={-46} y={-44} width={92} height={88} rx={34} transform={`translate(${f1(hb[0])} ${f1(hb[1])}) rotate(${f1(ha)})`} fill={SKIN} stroke={INK} strokeWidth={lw} />
				</g>
			) : null}
			{hand && !custom ? (
				<g>
					<Tubes lw={lw} segs={[{pts: [hb, fa], w: 72, c: SKIN}]} />
					<Tubes lw={lw} segs={[{pts: [lerpP(hb, fa, 0.8), addP(fa, [36, 66])], w: 100, c: MILK.shirt}]} />
					<rect x={-46} y={-44} width={92} height={88} rx={34} transform={`translate(${f1(hb[0])} ${f1(hb[1])}) rotate(${f1(ha)})`} fill={SKIN} stroke={INK} strokeWidth={lw} />
				</g>
			) : null}
			<g transform={`rotate(${f1(th)})`}>{piece(true)}</g>
			<g transform={`rotate(${f1(-th)})`}>{piece(false)}</g>
			<circle r={11} fill={MILK.steelD} stroke={INK} strokeWidth={lw * 0.8} />
			<circle r={3.5} fill={INK} />
			{hand ? (
				<g>
					{[1, 0, -1].map((i) => {
						const a = addP(addP(hb, u, 10), pp, i * 23);
						const b = addP(addP(rR, u, 6), pp, i * 23 - 4);
						return <Tubes key={i} lw={lw} segs={[{pts: [a, b], w: 24, c: mix(SKIN, SKIN_D, 0.18 * (i + 1))}]} />;
					})}
					<Tubes lw={lw} segs={[{pts: [tb, tm, [rL[0] + 4, rL[1] + 2]], w: 28, c: SKIN}]} />
					<ellipse cx={rL[0] + 9} cy={rL[1] - 3} rx={7} ry={10} fill="rgba(255,255,255,0.55)" transform={`rotate(-50 ${f1(rL[0] + 9)} ${f1(rL[1] - 3)})`} />
				</g>
			) : null}
		</g>
	);
};
export const Scissors: React.FC<ScissorsProps & FigProps> = ({x, y, s = 0.6, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<ScissorsG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── DollCase (+ dolls) ─────────────────────────────

/** a doll lying flat (seen from above), head at −x, ≈ 230 long; no face, no logo */
const DollFlatG: React.FC<{dress: string; dressD: string; hair: string; lw: number; arm?: number}> = ({dress, dressD, hair, lw, arm = 0}) => (
	<g>
		<Tubes lw={lw} segs={[{pts: [[40, -12], [118, -16]], w: 16, c: '#F6D2B4'}, {pts: [[40, 12], [118, 18]], w: 16, c: '#F6D2B4'}]} />
		<path d="M114,-26 L134,-24 L132,-8 L114,-8 Z M114,10 L134,12 L132,28 L114,26 Z" fill={dressD} stroke={INK} strokeWidth={lw * 0.7} />
		<Tubes lw={lw} segs={[{pts: [[-40, -18], [-6, -46 - arm]], w: 12, c: '#F6D2B4'}, {pts: [[-40, 18], [-6, 46 + arm]], w: 12, c: '#F6D2B4'}]} />
		<path d="M-58,-20 L-58,20 L46,44 L46,-44 Z" fill={dress} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
		<path d="M30,-40 L30,40" stroke={dressD} strokeWidth={lw * 1.4} />
		<path d={cloudPath(-92, 0, 46, 40, 8, 0.25, 4)} fill={hair} stroke={INK} strokeWidth={lw} />
		<circle cx={-82} cy={0} r={24} fill="#F6D2B4" stroke={INK} strokeWidth={lw} />
	</g>
);

export type DollCaseProps = {
	t?: number;
	view?: 'open3q' | 'carry';
	/** lid 0 closed .. 1 open (≈ 108°) */
	open?: number;
	/** 0 = clasp hooked over the lid, 1 = flipped down */
	latch?: number;
	/** seconds since the lid snapped shut (squash + click lines) */
	snap?: number;
	/** 0..1 the cut-out flutters in from above and lands on top of the dolls (−1 = none) */
	cutout?: number;
	dolls?: boolean;
	lw?: number;
};
export const CASE_HANDLE: P2 = [0, -372];
const CP = (X: number, Y: number, Z: number): P2 => [X * (1 + Z * 0.0004), -Y * 0.6 + (Z - 140) * 0.8];

/** pink doll case (no logo, no brand) */
export const DollCaseG: React.FC<DollCaseProps> = ({t = 0, view = 'open3q', open = 0, latch, snap = -1, cutout = -1, dolls = true, lw = 8}) => {
	const id = useSid('dc');
	if (view === 'carry') {
		const handle: P2[] = Array.from({length: 13}, (_, i) => {
			const a = Math.PI * (i / 12);
			return [-Math.cos(a) * 84, -300 - Math.sin(a) * 72];
		});
		return (
			<g>
				<Tubes lw={lw} segs={[{pts: handle, w: 28, c: MILK.pinkD}]} />
				<rect x={-212} y={-302} width={424} height={302} rx={46} fill={MILK.pink} stroke={INK} strokeWidth={lw} />
				<rect x={-212} y={-32} width={424} height={32} rx={14} fill={MILK.pinkD} />
				<rect x={-212} y={-302} width={424} height={302} rx={46} fill="none" stroke={INK} strokeWidth={lw} />
				<rect x={-184} y={-276} width={368} height={232} rx={30} fill="none" stroke={MILK.pinkL} strokeWidth={10} />
				<line x1={-212} y1={-150} x2={212} y2={-150} stroke={MILK.pinkDD} strokeWidth={lw * 0.8} opacity={0.6} />
				{(
					[
						[-118, -206, 26],
						[124, -98, 20],
						[52, -222, 16],
					] as const
				).map(([x, y, r], i) => (
					<path key={i} d={heartPath(r)} transform={`translate(${x} ${y})`} fill={MILK.pinkL} stroke={INK} strokeWidth={lw * 0.6} />
				))}
				{(
					[
						[-60, -86, 22],
						[132, -214, 18],
					] as const
				).map(([x, y, r], i) => (
					<path key={i} d={star4(r)} transform={`translate(${x} ${y}) rotate(${f1(t * 30 + i * 20)})`} fill="#fff" stroke={INK} strokeWidth={lw * 0.5} />
				))}
				<rect x={-26} y={-312} width={52} height={36} rx={8} fill={MILK.gold} stroke={INK} strokeWidth={lw} />
				<circle cx={0} cy={-294} r={6} fill={INK} />
			</g>
		);
	}
	const th = rad(clamp01(open) * 108);
	const sn = Math.sin(th);
	const cs = Math.cos(th);
	const lt = latch ?? (open > 0.02 ? 1 : 0);
	const LP = (X: number, u: number, v: number): P2 => CP(X, 120 + u * sn + v * cs, -140 + u * cs - v * sn);
	const W = 230;
	const top = [LP(-W, 0, 46), LP(W, 0, 46), LP(W, 280, 46), LP(-W, 280, 46)];
	const inner = [LP(-W, 0, 0), LP(W, 0, 0), LP(W, 280, 0), LP(-W, 280, 0)];
	const lip = [LP(-W, 280, 0), LP(W, 280, 0), LP(W, 280, 46), LP(-W, 280, 46)];
	const showTop = 0.8 * cs - 0.6 * sn > 0;
	const ku = -0.6 * sn + 0.8 * cs;
	const y0top = -72 - 224 - 0.6 * 46 * cs - 0.8 * 46 * sn;
	const y0in = -72 - 224;
	const sw = wobble(snap, 26, 9);
	const fall = cutout;
	const cu = clamp01(fall);
	const cx = lerp(60, 6, cu) + Math.sin(cu * 9) * 90 * (1 - cu);
	const cy = lerp(-700, -150, cu * cu);
	const cr = Math.sin(cu * 8) * 30 * (1 - cu) + lerp(-12, 6, cu);
	const csy = lerp(1, 0.66, clamp01((cu - 0.78) / 0.22));
	const floorXf = 'matrix(1 0 0 0.8 0 -121.6)';
	// while the lid is open the falling cut-out is drawn last (over the lid), clipped above the front wall; once the lid
	// closes it is drawn inside the box (under the front wall and the lid)
	const late = open > 0.6;
	const cutEl =
		fall >= 0 ? (
			<g transform={`translate(${f1(cx)} ${f1(cy)}) rotate(${f1(cr)}) scale(0.4 ${(0.4 * csy).toFixed(3)})`}>
				<CutoutG t={t} lw={lw / 0.4} shadow={0.4} />
			</g>
		) : null;
	return (
		<g transform={`scale(${(1 + 0.03 * sw).toFixed(3)} ${(1 - 0.05 * sw).toFixed(3)})`}>
			<ellipse cx={0} cy={6} rx={270} ry={22} fill="rgba(0,0,0,0.22)" />
			{/* rim + interior */}
			<path d={pathOf([CP(-W, 120, -140), CP(W, 120, -140), CP(W, 120, 140), CP(-W, 120, 140)])} fill={MILK.pink} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d={pathOf([CP(-216, 120, -126), CP(216, 120, -126), CP(216, 120, 126), CP(-216, 120, 126)])} fill={MILK.pinkD} stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
			<path d={pathOf([CP(-216, 16, -126), CP(216, 16, -126), CP(216, 16, 126), CP(-216, 16, 126)])} fill={MILK.pinkIn} />
			{dolls ? (
				<g transform={floorXf}>
					<g transform="translate(-40 -52) rotate(-4)">
						<DollFlatG dress={MILK.doll} dressD={MILK.dollD} hair={MILK.dollHair} lw={lw} arm={Math.sin(t * 2) * 2} />
					</g>
					<g transform="translate(30 40) rotate(176)">
						<DollFlatG dress="#7FD1C7" dressD="#4FA89D" hair="#5A3A24" lw={lw} />
					</g>
					<g transform="translate(150 70) rotate(-20)">
						<path d="M0,0 L34,0 Q42,-12 32,-18 L10,-16 L4,-28 L-2,-28 Z" fill={MILK.pinkDD} stroke={INK} strokeWidth={lw * 0.7} strokeLinejoin="round" />
					</g>
					<g transform="translate(178 40) rotate(-36)">
						<path d="M0,0 L34,0 Q42,-12 32,-18 L10,-16 L4,-28 L-2,-28 Z" fill={MILK.pinkDD} stroke={INK} strokeWidth={lw * 0.7} strokeLinejoin="round" />
					</g>
					<g transform="translate(-168 64) rotate(12)">
						<rect x={-44} y={-10} width={88} height={20} rx={6} fill="#7FD1C7" stroke={INK} strokeWidth={lw * 0.7} />
						{Array.from({length: 9}, (_, i) => (
							<line key={i} x1={-38 + i * 9.5} y1={10} x2={-38 + i * 9.5} y2={26} stroke={INK} strokeWidth={lw * 0.6} />
						))}
					</g>
				</g>
			) : null}
			{fall >= 0 && !late ? cutEl : null}
			{/* front face */}
			<path d={pathOf([CP(-W, 0, 140), CP(W, 0, 140), CP(W, 120, 140), CP(-W, 120, 140)])} fill={MILK.pink} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d={pathOf([CP(-W + 22, 14, 140), CP(W - 22, 14, 140), CP(W - 22, 104, 140), CP(-W + 22, 104, 140)])} fill="none" stroke={MILK.pinkL} strokeWidth={8} />
			{(
				[
					[-150, -36, 15],
					[156, -38, 13],
				] as const
			).map(([x, y, r], i) => (
				<path key={i} d={heartPath(r)} transform={`translate(${x} ${y})`} fill={MILK.pinkL} stroke={INK} strokeWidth={lw * 0.5} />
			))}
			{/* lid */}
			{showTop ? (
				<g>
					<path d={pathOf(lip)} fill={MILK.pinkD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d={pathOf(top)} fill={MILK.pink} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<g transform={`matrix(1 0 0 ${ku.toFixed(4)} 0 ${f1(y0top)})`}>
						<rect x={-196} y={26} width={392} height={228} rx={24} fill="none" stroke={MILK.pinkL} strokeWidth={10} />
						{(
							[
								[-110, 90, 30],
								[100, 190, 24],
								[30, 70, 18],
							] as const
						).map(([x, y, r], i) => (
							<path key={i} d={heartPath(r)} transform={`translate(${x} ${y})`} fill={MILK.pinkL} stroke={INK} strokeWidth={lw * 0.6} />
						))}
						<path d={star4(22)} transform={`translate(-40 190) rotate(${f1(t * 30)})`} fill="#fff" stroke={INK} strokeWidth={lw * 0.5} />
						<path d={star4(18)} transform={`translate(150 80) rotate(${f1(-t * 30)})`} fill="#fff" stroke={INK} strokeWidth={lw * 0.5} />
					</g>
				</g>
			) : (
				<g>
					<path d={pathOf(inner)} fill={MILK.pinkIn} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<g transform={`matrix(1 0 0 ${ku.toFixed(4)} 0 ${f1(y0in)})`}>
						<rect x={-180} y={40} width={360} height={190} rx={20} fill={MILK.pinkL} stroke={MILK.pinkD} strokeWidth={6} />
						<line x1={-180} y1={140} x2={180} y2={140} stroke={MILK.pinkD} strokeWidth={8} />
					</g>
					<path d={pathOf(lip)} fill={MILK.pinkD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				</g>
			)}
			{/* clasp */}
			<rect x={-26} y={-80} width={52} height={30} rx={6} fill={MILK.gold} stroke={INK} strokeWidth={lw} />
			<g transform={`translate(0 -72) scale(1 ${Math.cos(clamp01(lt) * Math.PI).toFixed(3)})`}>
				<rect x={-16} y={-40} width={32} height={40} rx={7} fill={MILK.gold} stroke={INK} strokeWidth={lw} />
				<rect x={-8} y={-32} width={16} height={8} rx={3} fill={MILK.bangleD} />
			</g>
			{fall >= 0 && late ? (
				<g>
					<defs>
						<clipPath id={`${id}a`}>
							<rect x={-1000} y={-2000} width={2000} height={2000 - 76} />
						</clipPath>
					</defs>
					<g clipPath={`url(#${id}a)`}>{cutEl}</g>
				</g>
			) : null}
			{snap >= 0 && snap < 0.35
				? [-1, 0, 1].map((s) => (
						<path key={s} d={`M${s * 46},${-112 - (s ? 0 : 10)} L${s * 76},${-150 - (s ? 0 : 22)}`} stroke={INK} strokeWidth={lw * 1.1} strokeLinecap="round" opacity={1 - snap / 0.35} />
					))
				: null}
		</g>
	);
};
export const DollCase: React.FC<DollCaseProps & FigProps> = ({x, y, s = 0.6, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<DollCaseG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── Neighbor ─────────────────────────────

export type NeighborPose = 'hold' | 'read' | 'gasp' | 'phone' | 'back';
export type NeighborProps = {
	t: number;
	pose?: NeighborPose;
	/** read: 0..1 fingertip slides along the name line; gasp / phone: 0..1 the hand comes up */
	k?: number;
	look?: P2;
	/** the thing she holds (her units, centred on 0,0 → drawn at the hold point) — e.g. a CutoutG scaled 0.5 */
	item?: React.ReactNode;
	/** half width of the item (where her hands grip), her units */
	itemW?: number;
	/** read: where the fingertip goes (her units) */
	aim?: P2;
	blink?: boolean;
	lw?: number;
};
const NB_HEAD: P2 = [0, -585];
const NB_FACE = 'M0,-132 C70,-132 112,-80 112,-6 C112,70 66,132 0,134 C-66,132 -112,70 -112,-6 C-112,-80 -70,-132 0,-132 Z';
const NB_BODY = 'M-272,0 L-264,-210 C-258,-290 -202,-330 -122,-352 L-58,-392 L58,-392 L122,-352 C202,-330 258,-290 264,-210 L272,0 Z';
const HN = 0.9;
/** the neighbour, bust: (0,0) = bottom centre; face shown (pose 'back' = over the shoulder, no face) */
export const NeighborG: React.FC<NeighborProps> = ({t, pose = 'hold', k = 1, look = [0, 0.3], item, itemW = 100, aim, blink, lw = 8}) => {
	const kk = easeInOut(clamp01(k));
	const bl = blink ?? blinkAt(t, 2);
	const breath = Math.sin(t * 2) * 2.5;
	const tiltH = pose === 'read' ? 7 : pose === 'gasp' ? -4 : pose === 'phone' ? -6 : 0;
	const head: P2 = [NB_HEAD[0] + (pose === 'back' ? -40 : 0), NB_HEAD[1] + (pose === 'read' ? 10 : 0) + Math.sin(t * 2.2) * 2];
	const itemAt: P2 = pose === 'read' ? [0, -300] : pose === 'back' ? [130, -500] : pose === 'hold' ? [0, -250] : pose === 'gasp' ? [-100, -170] : [-70, -210];
	const skin = KIND.neighbor.skin;
	const NK = KIND.neighbor.ks;
	const hlw = lw / HN / NK;
	const SH = (left: boolean): P2 => [left ? -232 : 232, -296 + breath];
	/** wrist + elbow of a hand placed by its palm contact, forearm `fa` canonical units long */
	const armOf = (contact: P2, left: boolean, rot: number, fa: number) => {
		const g = handGrip('neighbor');
		const w = rotP([(left ? -g[0] : g[0]) * HN, -g[1] * HN], rot);
		const W: P2 = [contact[0] + w[0], contact[1] + w[1]];
		const d = rotP([0, 1], rot);
		return {W, E: [W[0] + d[0] * fa * NK * HN, W[1] + d[1] * fa * NK * HN] as P2};
	};
	const upper = (E: P2, left: boolean) => <Tubes lw={lw} segs={[{pts: [SH(left), E], w: 84, c: MILK.cardigan}]} />;
	const FA = 170;
	const holdRot = (left: boolean) => (left ? 22 : -22);
	const hand = (contact: P2, left: boolean, g: HandGesture, rot: number, part: 'back' | 'front' | 'all' = 'all', fa = FA) => (
		<g transform={gripXf('neighbor', contact[0], contact[1], rot, HN, !left)}>
			<HandG kind="neighbor" gesture={g} arm={fa} lw={hlw} part={part} />
		</g>
	);
	const cL: P2 = [itemAt[0] - itemW, itemAt[1] + 20];
	const cR: P2 = [itemAt[0] + itemW, itemAt[1] + 20];
	const both = pose === 'hold' || pose === 'back';
	const holdHands = (part: 'back' | 'front') => (
		<g>
			{hand(cL, true, 'grab', holdRot(true), part)}
			{both ? hand(cR, false, 'grab', holdRot(false), part) : null}
		</g>
	);
	const eyes = () => {
		if (pose === 'gasp')
			return ([-1, 1] as const).map((s) => (
				<g key={s}>
					<ellipse cx={s * 46} cy={-6} rx={17} ry={20} fill="#fff" stroke={INK} strokeWidth={lw * 0.8} />
					<circle cx={s * 46 + look[0] * 4} cy={-4} r={6.5} fill={INK} />
				</g>
			));
		if (bl) return ([-1, 1] as const).map((s) => <path key={s} d={`M${s * 46 - 13},-4 Q${s * 46},4 ${s * 46 + 13},-4`} stroke={INK} strokeWidth={lw} fill="none" strokeLinecap="round" />);
		if (pose === 'read') return ([-1, 1] as const).map((s) => <path key={s} d={`M${s * 46 - 13},-2 Q${s * 46},-12 ${s * 46 + 13},-2`} stroke={INK} strokeWidth={lw * 1.1} fill="none" strokeLinecap="round" />);
		return ([-1, 1] as const).map((s) => <ellipse key={s} cx={s * 46 + look[0] * 6} cy={-4 + look[1] * 5} rx={9.5} ry={12.5} fill={INK} />);
	};
	const mouth = () => {
		if (pose === 'gasp') return <ellipse cx={0} cy={78} rx={18} ry={24} fill={MILK.mouth} stroke={INK} strokeWidth={lw * 0.9} />;
		if (pose === 'phone') {
			const o = 0.5 + 0.5 * Math.sin(t * 15);
			return <ellipse cx={0} cy={78} rx={22} ry={6 + 10 * o} fill={MILK.mouth} stroke={INK} strokeWidth={lw * 0.9} />;
		}
		if (pose === 'read') return <path d="M-16,80 Q0,74 16,80" stroke={INK} strokeWidth={lw * 1.1} fill="none" strokeLinecap="round" />;
		return <path d="M-26,72 Q0,92 26,72" stroke={INK} strokeWidth={lw * 1.1} fill="none" strokeLinecap="round" />;
	};
	const faceEl =
		pose === 'back' ? (
			<g>
				{([-1, 1] as const).map((s) => (
					<ellipse key={s} cx={s * 112} cy={4} rx={16} ry={26} fill={skin} stroke={INK} strokeWidth={lw} />
				))}
				<path d={cloudPath(0, -36, 150, 150, 13, 0.3, 5)} fill={MILK.nHair} stroke={INK} strokeWidth={lw} />
				<path d={cloudPath(0, -60, 96, 84, 9, 0.35, 8)} fill={MILK.nHairL} opacity={0.55} />
			</g>
		) : (
			<g>
				<path d={cloudPath(0, -52, 150, 128, 12, 0.32, 5)} fill={MILK.nHair} stroke={INK} strokeWidth={lw} />
				{([-1, 1] as const).map((s) => (
					<g key={s}>
						<ellipse cx={s * 112} cy={4} rx={16} ry={26} fill={skin} stroke={INK} strokeWidth={lw} />
						<circle cx={s * 114} cy={36} r={8} fill="#FFFDF5" stroke={INK} strokeWidth={lw * 0.6} />
					</g>
				))}
				<path d={NB_FACE} fill={skin} stroke={INK} strokeWidth={lw * 1.1} />
				{([-1, 1] as const).map((s) => (
					<ellipse key={s} cx={s * 64} cy={40} rx={20} ry={11} fill={MILK.cheek} opacity={0.4} />
				))}
				{eyes()}
				<path d="M-6,8 Q-16,44 4,52 Q14,50 18,44" stroke={MILK.skinDD} strokeWidth={lw} fill="none" strokeLinecap="round" />
				{mouth()}
				<path d={cloudPath(0, -122, 116, 46, 9, 0.42, 9)} fill={MILK.nHair} stroke={INK} strokeWidth={lw} />
				<path d="M-80,-140 Q-40,-160 10,-150" stroke={MILK.nHairL} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.8} />
				{([-1, 1] as const).map((s) => (
					<path key={s} d={`M${s * 22},${pose === 'gasp' ? -64 : -54} Q${s * 46},${pose === 'gasp' ? -78 : -66} ${s * 72},${pose === 'gasp' ? -62 : -52}`} stroke={MILK.nHairD} strokeWidth={lw * 1.2} fill="none" strokeLinecap="round" />
				))}
				{([-1, 1] as const).map((s) => (
					<circle key={s} cx={s * 46} cy={-4} r={40} fill="rgba(190,225,255,0.22)" stroke={INK} strokeWidth={lw * 0.9} />
				))}
				<path d="M-8,-8 Q0,-14 8,-8" stroke={INK} strokeWidth={lw * 0.9} fill="none" />
				<path d="M-84,-8 L-108,-14 M84,-8 L108,-14" stroke={INK} strokeWidth={lw * 0.9} />
				{([-1, 1] as const).map((s) => (
					<path key={s} d={`M${s * 46 - 22},-24 L${s * 46 - 8},-34`} stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
				))}
			</g>
		);
	// raised right hand (gasp / phone / read pointer)
	// right hand raised by its wrist: gasp = palm flat on her chest; read = index on the name line
	let raised: React.ReactNode = null;
	const byWrist = (W: P2, rot: number, g: HandGesture, fa: number) => {
		const d = rotP([0, 1], rot);
		const E: P2 = [W[0] + d[0] * fa * NK * HN, W[1] + d[1] * fa * NK * HN];
		return (
			<g>
				{upper(E, false)}
				<g transform={`translate(${f1(W[0])} ${f1(W[1])}) rotate(${f1(rot)}) scale(${-HN} ${HN})`}>
					<HandG kind="neighbor" gesture={g} spread={g === 'open' ? 0.05 : undefined} arm={fa} lw={hlw} />
				</g>
			</g>
		);
	};
	if (pose === 'gasp') raised = byWrist(lerpP([250, 60], [150, -250], kk), lerp(-6, -40, kk), 'open', 150);
	if (pose === 'read') {
		const tip = aim ?? [lerp(-60, 60, kk), itemAt[1] + 64];
		const tl = handTip('neighbor', 'point');
		const rot = -38;
		const off = rotP([-tl[0] * HN, tl[1] * HN], rot);
		raised = byWrist([tip[0] - off[0], tip[1] - off[1]], rot, 'point', 170);
	}
	const phoneAt: P2 = [96, -540];
	const phone = (
		<g transform={`translate(${phoneAt[0]} ${phoneAt[1]}) rotate(-38)`}>
			<path d="M-22,-110 Q-34,-120 -20,-132 L22,-132 Q36,-120 24,-110 L14,110 Q30,122 20,136 L-24,136 Q-36,122 -20,110 Z" fill={MILK.phone} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d="M-10,-100 L-6,96" stroke={MILK.phoneD} strokeWidth={lw} />
		</g>
	);
	const cordEnd = rotP([0, 136], -38);
	const pg = rotP([22, 54], -38);
	const phoneGrip: P2 = [phoneAt[0] + pg[0], phoneAt[1] + pg[1]];
	const cord = (() => {
		const a: P2 = [phoneAt[0] + cordEnd[0], phoneAt[1] + cordEnd[1]];
		const pts: P2[] = [];
		for (let i = 0; i <= 60; i++) {
			const u = i / 60;
			const bx = lerp(a[0], 200, u) + Math.sin(u * 3 + t * 1.5) * 30 * u;
			const by = lerp(a[1], 40, u);
			pts.push([bx + Math.cos(u * 70) * 12, by + Math.sin(u * 70) * 6]);
		}
		return pts;
	})();
	const itemEl = item ? (
		<g>
			{upper(armOf(cL, true, holdRot(true), FA).E, true)}
			{both ? upper(armOf(cR, false, holdRot(false), FA).E, false) : null}
			{holdHands('back')}
			<g transform={`translate(${itemAt[0]} ${itemAt[1]})`}>{item}</g>
			{holdHands('front')}
		</g>
	) : null;
	return (
		<g>
			<g transform={`translate(0 ${f1(breath)})`}>
				<path d={NB_BODY} fill={pose === 'back' ? MILK.cardigan : '#FFFDF5'} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				{pose !== 'back' ? (
					<g>
						<path d="M-272,0 L-264,-210 C-258,-290 -202,-330 -122,-352 L-58,-392 L-36,-300 L-30,0 Z" fill={MILK.cardigan} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
						<path d="M272,0 L264,-210 C258,-290 202,-330 122,-352 L58,-392 L36,-300 L30,0 Z" fill={MILK.cardigan} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
						<path d="M-56,-392 L-8,-336 L-74,-326 Z M56,-392 L8,-336 L74,-326 Z" fill="#FFFDF5" stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
						{[-250, -170, -90].map((y) => (
							<circle key={y} cx={-44} cy={y} r={9} fill={MILK.cardiganD} stroke={INK} strokeWidth={lw * 0.5} />
						))}
					</g>
				) : (
					<path d="M-200,-120 Q0,-150 200,-120" stroke={MILK.cardiganD} strokeWidth={lw} fill="none" />
				)}
				<path d="M-40,-470 L-42,-388 Q0,-370 42,-388 L40,-470 Z" fill={skin} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			</g>
			{pose === 'back' ? itemEl : null}
			<g transform={`translate(${f1(head[0])} ${f1(head[1])}) rotate(${tiltH})`}>{faceEl}</g>
			{pose === 'phone' ? (
				<g>
					<polyline points={pl(cord)} fill="none" stroke={INK} strokeWidth={lw * 2.6} strokeLinejoin="round" />
					<polyline points={pl(cord)} fill="none" stroke={MILK.phone} strokeWidth={lw * 1.1} strokeLinejoin="round" />
					{upper(armOf(phoneGrip, false, -24, 230).E, false)}
					{hand(phoneGrip, false, 'grab', -24, 'back', 230)}
					{phone}
					{hand(phoneGrip, false, 'grab', -24, 'front', 230)}
				</g>
			) : null}
			{pose !== 'back' ? itemEl : null}
			{raised}
		</g>
	);
};
export const Neighbor: React.FC<NeighborProps & FigProps> = ({x, y, s = 0.6, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<NeighborG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── Police ─────────────────────────────

export type CopPose = 'stand' | 'walk' | 'radio';
export type PoliceProps = {t: number; pose?: CopPose; k?: number; seed?: number; speed?: number; lw?: number};
const COP_SKIN = ['#F0BF97', '#C98E68', '#8D5A3B', '#E8B48C'];
/** a generic officer (cap, badge shape, no text / numbers), (0,0) = feet, 900 tall, front view */
export const PoliceG: React.FC<PoliceProps> = ({t, pose = 'stand', k = 1, seed = 0, speed = 1, lw = 8}) => {
	const skin = COP_SKIN[Math.abs(seed) % COP_SKIN.length];
	const hs = 1 + (h1(seed * 2.1) - 0.5) * 0.08;
	const ph = t * 6 * speed + seed;
	const w = pose === 'walk' ? 1 : 0;
	const s = Math.sin(ph);
	const bob = -Math.abs(Math.cos(ph)) * 10 * w + Math.sin(t * 2 + seed) * 2;
	const legs = ([-1, 1] as const).map((sd) => {
		const H: P2 = [sd * 46, -430];
		const a = sd * 14 * s * w;
		const A = addP(H, vdir(a), 390);
		return (
			<g key={sd}>
				<Tubes lw={lw} segs={[{pts: [H, A], w: 84, c: sd < 0 ? MILK.policeD : '#1C2A48'}]} />
				<g transform={`translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(-a * 0.4)})`}>
					<path d="M-48,-26 L36,-28 Q74,-22 78,4 L78,14 L-50,14 Z" fill="#14141A" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M20,-18 Q46,-16 60,-6" stroke="#4A4A5A" strokeWidth={6} fill="none" strokeLinecap="round" />
				</g>
			</g>
		);
	});
	const SL: P2 = [-118, -648];
	const SR: P2 = [118, -648];
	const armOf = (S: P2, sd: -1 | 1) => {
		if (pose === 'radio' && sd > 0) {
			const W = lerpP(addP(S, [10, 290]), [70, -640], easeInOut(clamp01(k)));
			const E = ik(S, W, 150, 140, 'down');
			return {S, E, W};
		}
		const a = sd * 8 - sd * 12 * s * w;
		const E = addP(S, vdir(a), 150);
		const W = addP(E, vdir(a + sd * 6), 140);
		return {S, E, W};
	};
	const arms = ([-1, 1] as const).map((sd) => ({sd, ...armOf(sd < 0 ? SL : SR, sd)}));
	return (
		<g transform={`scale(${hs.toFixed(3)})`}>
			<ellipse cx={0} cy={0} rx={150} ry={20} fill="rgba(0,0,0,0.25)" />
			<g transform={`translate(0 ${f1(bob)})`}>
				{legs}
				<path d="M-122,-668 Q0,-700 122,-668 L110,-420 L-110,-420 Z" fill={MILK.police} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d="M0,-690 L0,-430" stroke={MILK.policeD} strokeWidth={lw} />
				{[-600, -540, -480].map((y) => (
					<circle key={y} cx={10} cy={y} r={6} fill={MILK.gold} />
				))}
				<path d="M-84,-640 L-28,-640 L-28,-600 L-84,-600 Z M28,-640 L84,-640 L84,-600 L28,-600 Z" fill="none" stroke={MILK.policeD} strokeWidth={lw} />
				<path d="M-140,-670 L-90,-684 L-90,-664 L-140,-652 Z M140,-670 L90,-684 L90,-664 L140,-652 Z" fill={MILK.policeD} stroke={INK} strokeWidth={lw * 0.6} />
				<path d="M-56,-620 l7,15 l16,2 l-12,11 l3,16 l-14,-8 l-14,8 l3,-16 l-12,-11 l16,-2 Z" fill={MILK.gold} stroke={INK} strokeWidth={lw * 0.6} strokeLinejoin="round" />
				<rect x={-112} y={-452} width={224} height={36} rx={6} fill="#15151B" stroke={INK} strokeWidth={lw} />
				<rect x={-18} y={-448} width={36} height={28} rx={4} fill={MILK.steel} stroke={INK} strokeWidth={lw * 0.6} />
				<rect x={56} y={-650} width={30} height={46} rx={6} fill="#15151B" stroke={INK} strokeWidth={lw * 0.7} />
				<line x1={78} y1={-650} x2={84} y2={-690} stroke="#15151B" strokeWidth={6} strokeLinecap="round" />
				<rect x={-26} y={-728} width={52} height={50} fill={skin} stroke={INK} strokeWidth={lw} />
				<path d="M-34,-690 L0,-660 L34,-690" fill="#E9EEF5" stroke={INK} strokeWidth={lw * 0.7} />
				<g transform="translate(0 -776)">
					<ellipse cx={0} cy={0} rx={66} ry={76} fill={skin} stroke={INK} strokeWidth={lw} />
					{[-1, 1].map((sd) => (
						<ellipse key={sd} cx={sd * 66} cy={8} rx={12} ry={20} fill={skin} stroke={INK} strokeWidth={lw * 0.8} />
					))}
					{blinkAt(t, seed + 1) ? (
						[-1, 1].map((sd) => <path key={sd} d={`M${sd * 24 - 9},-2 Q${sd * 24},4 ${sd * 24 + 9},-2`} stroke={INK} strokeWidth={lw} fill="none" />)
					) : (
						[-1, 1].map((sd) => <ellipse key={sd} cx={sd * 24} cy={-2} rx={7} ry={9} fill={INK} />)
					)}
					{[-1, 1].map((sd) => (
						<path key={sd} d={`M${sd * 12},-24 L${sd * 38},-26`} stroke="#2A1E18" strokeWidth={lw * 1.3} strokeLinecap="round" />
					))}
					<path d="M-4,4 Q-12,26 6,30" stroke={MILK.skinDD} strokeWidth={lw * 0.9} fill="none" strokeLinecap="round" />
					{seed % 3 === 1 ? <path d="M-30,40 Q0,30 30,40 Q20,52 0,46 Q-20,52 -30,40 Z" fill="#3A2A20" stroke={INK} strokeWidth={lw * 0.6} /> : null}
					<path d="M-18,52 Q0,58 18,52" stroke={INK} strokeWidth={lw} fill="none" strokeLinecap="round" />
					<path d="M-86,-58 L-74,-98 Q0,-118 74,-98 L86,-58 Z" fill={MILK.police} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<rect x={-74} y={-60} width={148} height={20} fill="#15151B" stroke={INK} strokeWidth={lw * 0.8} />
					<path d="M-70,-42 Q0,-30 70,-42 Q60,-22 0,-20 Q-60,-22 -70,-42 Z" fill="#0E0E14" stroke={INK} strokeWidth={lw * 0.8} />
					<path d="M0,-96 L14,-88 L12,-70 L0,-62 L-12,-70 L-14,-88 Z" fill={MILK.gold} stroke={INK} strokeWidth={lw * 0.6} strokeLinejoin="round" />
				</g>
				{arms.map((a) => (
					<g key={a.sd}>
						<Tubes lw={lw} segs={[{pts: [a.S, a.E, a.W], w: 58, c: MILK.police}]} />
						<g transform={`translate(${f1(a.W[0])} ${f1(a.W[1])}) rotate(${f1(180 - limbA(a.E, a.W))}) scale(${a.sd < 0 ? -0.36 : 0.36} 0.36)`}>
							<HandG kind="cop" gesture={pose === 'radio' && a.sd > 0 ? 'pinch' : 'rest'} arm={60} sleeve={false} skin={skin} lw={lw / 0.36} />
						</g>
					</g>
				))}
			</g>
		</g>
	);
};
export const Police: React.FC<PoliceProps & FigProps> = ({x, y, s = 0.3, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<PoliceG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── ManSil (stepdad as a shape only) ─────────────────────────────

export type ManSilProps = {
	view?: 'hush' | 'low';
	/** hush: 0..1 the hand rises, index finger to the lips */
	hush?: number;
	t?: number;
	/** silhouette colour (opaque; use opacity for a shadow) */
	fill?: string;
	/** rim light (view 'low') */
	rim?: string;
	/** view 'low': the coloured hand + watch at the end of his right sleeve */
	hand?: boolean;
	/** soft edge blur (shadow on a fridge door) */
	soft?: number;
	lw?: number;
};
const HUSH_HEAD =
	'M110,-700 C150,-760 200,-850 190,-960 C180,-1080 110,-1150 10,-1155 C-80,-1158 -150,-1110 -168,-1030 C-175,-1000 -172,-985 -178,-968 L-212,-930 L-182,-912 L-190,-893 L-180,-882 L-188,-868 C-186,-840 -170,-820 -140,-815 C-100,-810 -70,-790 -60,-760 L-60,-700 L-140,-662 C-330,-620 -392,-520 -402,-380 L-420,0 L420,0 L402,-380 C392,-560 300,-660 110,-700 Z';
/** a man's shape: profile shadow with a finger to his lips, or a backlit coat from a child's height — never a face */
export const ManSilG: React.FC<ManSilProps> = ({view = 'hush', hush = 1, t = 0, fill = MILK.sil, rim = '#BFE6FF', hand = true, soft = 0, lw = 8}) => {
	const id = useSid('ms');
	if (view === 'hush') {
		const k = easeInOut(clamp01(hush));
		const W = lerpP([-250, -120], [-224, -812], k);
		const E = lerpP([-300, 120], [-372, -520], k);
		return (
			<g filter={soft > 0 ? `url(#${id}s)` : undefined}>
				<defs>
					<filter id={`${id}s`} x="-10%" y="-10%" width="120%" height="120%">
						<feGaussianBlur stdDeviation={soft * 6} />
					</filter>
				</defs>
				<g transform={`translate(0 ${f1(Math.sin(t * 1.8) * 4)})`}>
					<path d={HUSH_HEAD} fill={fill} />
					<polyline points={pl([[-330, 60], E, W])} fill="none" stroke={fill} strokeWidth={118} strokeLinecap="round" strokeLinejoin="round" />
					<ellipse cx={W[0] - 4} cy={W[1] - 20} rx={64} ry={70} fill={fill} />
					<rect x={W[0] - 22} y={W[1] - 34 - 132 * k} width={44} height={70 + 132 * k} rx={22} fill={fill} />
				</g>
			</g>
		);
	}
	const sway = Math.sin(t * 1.4) * 4;
	const shape = (c: string) => (
		<g fill={c}>
			<path d="M-330,-420 L-252,-1460 Q-150,-1520 -60,-1532 L60,-1532 Q150,-1520 252,-1460 L330,-420 Z" />
			<path d="M-310,-460 L-270,0 L-56,0 L-70,-460 Z M310,-460 L270,0 L56,0 L70,-460 Z" />
			<rect x={-44} y={-1600} width={88} height={90} />
			<ellipse cx={0} cy={-1660} rx={96} ry={116} />
			<polyline points="-262,-1440 -322,-1080 -330,-720" fill="none" stroke={c} strokeWidth={112} strokeLinecap="round" strokeLinejoin="round" />
			<polyline points="262,-1440 322,-1080 330,-720" fill="none" stroke={c} strokeWidth={112} strokeLinecap="round" strokeLinejoin="round" />
		</g>
	);
	return (
		<g transform={`translate(0 ${f1(sway)})`}>
			<g transform="translate(-9 -6)">{shape(rim)}</g>
			<g transform="translate(9 -6)">{shape(rim)}</g>
			{shape(fill)}
			<path d="M-60,-1520 L0,-1380 L60,-1520" fill="none" stroke={rim} strokeWidth={6} opacity={0.35} />
			{hand ? (
				<g transform="translate(330 -700) rotate(180) scale(1.1)">
					<HandG kind="man" gesture="rest" arm={160} t={t} lw={lw / 1.1} />
				</g>
			) : null}
		</g>
	);
};
export const ManSil: React.FC<ManSilProps & FigProps> = ({x, y, s = 0.6, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<ManSilG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── DadBack ─────────────────────────────

export type DadBackProps = {
	t: number;
	/** 0 standing .. 1 down on one knee (left knee on the floor, right foot planted ahead) */
	crouch?: number;
	/** 0..1 BOTH arms open toward her, palms up, symmetric: 0 = a low hold in front of him, 1 = wide open */
	reach?: number;
	/** 0..1 he leans in toward her: the back foreshortens, the head dips, the hands go further (= higher on screen) */
	lean?: number;
	/** head tilt, deg (+ = toward +x): a small sad drop when she hides */
	tilt?: number;
	lw?: number;
};
/** his palm-up fingers (hand frame of DadBackG): pinky (far side) → index (near side); base x 66, length, width, fan angle */
const DB_FING = [
	{y: -24, L: 44, w: 15, a: -10},
	{y: -8, L: 56, w: 17, a: -3},
	{y: 8, L: 60, w: 18, a: 3},
	{y: 24, L: 52, w: 18, a: 9},
];
/**
 * her dad SQUARE from behind (no face — back of the head + both ears): checked shirt, jeans, boots; he faces into the frame
 * (toward her), body symmetric about x = 0; (0,0) = the floor under his hips. Kneeling (crouch 1): hair top ≈ −760, shoulder
 * line ≈ −562, both open hands' fingertips ≈ ±410 at y ≈ −700; the kneeling boot's sole reaches y ≈ +72.
 */
export const DadBackG: React.FC<DadBackProps> = ({t, crouch = 1, reach = 0, lean = 0, tilt = 0, lw = 8}) => {
	const id = useSid('db');
	const c = easeInOut(clamp01(crouch));
	const r = easeInOut(clamp01(reach));
	const ln = easeInOut(clamp01(lean));
	const breath = Math.sin(t * 2) * 3;
	const Hy = lerp(-470, -262, c); // hip line
	const T = lerp(320, 300, c) - 30 * ln; // back height (foreshortens as he leans in)
	const top = Hy - T + breath; // shoulder line (at the neck)
	// legs (hip → knee → ankle); near = his left leg, knee on the floor, shin running back toward us (boot sole to camera);
	// far = right leg, knee up beside his hip, foot planted ahead (higher on screen)
	const legN = [lerpP([-54, Hy + 60], [-58, Hy + 60], c), lerpP([-54, -250], [-66, -44], c), lerpP([-56, -40], [-80, 28], c)];
	const legF = [lerpP([54, Hy + 60], [62, Hy + 40], c), lerpP([54, -250], [134, Hy - 14], c), lerpP([56, -40], [128, -124], c)];
	// arms (mirrored): shoulder → elbow → wrist; th = the hand's finger direction from straight up (outward +)
	const sway = Math.sin(t * 1.7) * 3 * r;
	const arm = (sd: 1 | -1) => {
		const S: P2 = [sd * 116, top + 28];
		const E: P2 = [sd * (lerp(160, 216, r) + 8 * ln), top + lerp(44, 34, r) - 8 * ln];
		const W: P2 = [sd * (lerp(186, 266, r) + 12 * ln + sway), top + lerp(24, 2, r) - 22 * ln - sway];
		const d = Math.hypot(W[0] - E[0], W[1] - E[1]) || 1;
		const Wt: P2 = [W[0] - ((W[0] - E[0]) / d) * 20, W[1] - ((W[1] - E[1]) / d) * 20]; // the sleeve tube stops short of the wrist
		const fa = Math.atan2(W[0] * sd - E[0] * sd, E[1] - W[1]) * (180 / Math.PI); // forearm angle from up, outward +
		return {S, E, W, Wt, th: fa + lerp(4, 8, r) - 6 * ln};
	};
	const AL = arm(-1);
	const AR = arm(1);
	const sleeveTubes = (A: ReturnType<typeof arm>) => (
		<g>
			<Tubes lw={lw} segs={[{pts: [A.S, A.E, A.Wt], w: 70, c: MILK.check}]} />
			<polyline points={pl([A.S, A.E, A.Wt])} fill="none" stroke={`url(#${id}c)`} strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
		</g>
	);
	// his open hand, PALM UP, seen from above-behind (own drawing, not HandG: the palm faces the camera here): wrist (0,0), fingers
	// along +x, together and slightly fanned, pinky on the far side (−y), index + thumb on the near side (+y); checked cuff.
	// The right hand is turned th − 90; the left is its mirror image.
	const sk = KIND.dad.skin;
	const palmC = mix(sk, '#FFFFFF', 0.2);
	const fl = 0.8 + 0.2 * r; // the fingers uncurl as the arms open
	const hand = (A: ReturnType<typeof arm>, sd: 1 | -1) => (
		<g transform={`translate(${f1(A.W[0])} ${f1(A.W[1])})${sd < 0 ? ' scale(-1 1)' : ''} rotate(${f1(A.th - 90)})`}>
			{DB_FING.map((f, i) => (
				<Tubes key={i} lw={lw} segs={[{pts: [[66, f.y], [66 + f.L * fl * Math.cos(rad(f.a)), f.y + f.L * fl * Math.sin(rad(f.a))]], w: f.w, c: i === 0 ? mix(sk, KIND.dad.skinD, 0.35) : sk}]} />
			))}
			<path d="M-6,-24 Q30,-36 66,-33 Q84,-20 84,0 Q84,22 66,34 Q30,40 -6,26 Z" fill={palmC} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d="M16,6 Q42,-6 68,-2" stroke={KIND.dad.skinD} strokeWidth={lw * 0.7} fill="none" strokeLinecap="round" opacity={0.75} />
			<path d="M12,20 Q30,6 32,-18" stroke={KIND.dad.skinD} strokeWidth={lw * 0.7} fill="none" strokeLinecap="round" opacity={0.75} />
			<Tubes lw={lw} segs={[{pts: [[14, 22], [40, 42], [62, 48 - 4 * (1 - r)]], w: 21, c: sk}]} />
			<rect x={-32} y={-38} width={32} height={76} rx={9} fill={`url(#${id}c)`} stroke={INK} strokeWidth={lw} />
			<rect x={-32} y={-38} width={32} height={76} rx={9} fill={MILK.checkD} opacity={0.18} />
			<circle cx={-16} cy={26} r={5} fill="#EDE6D6" stroke={INK} strokeWidth={lw * 0.5} />
		</g>
	);
	// boot from behind: heel (planted / standing); sole = 0..1 the toes tuck under and the sole turns to the camera (kneeling)
	const boot = (A: P2, h: number, dark: boolean, sole: number, key: string) => (
		<g key={key} transform={`translate(${f1(A[0])} ${f1(A[1])})`}>
			<rect x={-40} y={-18} width={80} height={h} rx={18} fill={dark ? '#4E3220' : MILK.boot} stroke={INK} strokeWidth={lw} />
			{sole > 0.02 ? (
				<g opacity={clamp01(sole)}>
					<rect x={-31} y={-10} width={62} height={h - 30} rx={14} fill="#3A2618" stroke={INK} strokeWidth={lw * 0.6} />
					{[0.25, 0.45, 0.65].map((f) => (
						<line key={f} x1={-20} y1={-10 + (h - 30) * f} x2={20} y2={-10 + (h - 30) * f} stroke="#5E4430" strokeWidth={lw * 0.8} strokeLinecap="round" />
					))}
				</g>
			) : null}
			<rect x={-40} y={h - 34} width={80} height={16} rx={6} fill="#2E1E14" stroke={INK} strokeWidth={lw * 0.8} />
		</g>
	);
	return (
		<g>
			<defs>
				<CheckPattern id={`${id}c`} size={56} />
			</defs>
			<ellipse cx={0} cy={0} rx={230} ry={34} fill="rgba(0,0,0,0.25)" />
			{/* legs (under the seat) */}
			<Tubes lw={lw} segs={[{pts: legF, w: 92, c: MILK.jeansD}]} />
			{boot(legF[2], 58, true, 0, 'bf')}
			<Tubes lw={lw} segs={[{pts: legN, w: 96, c: MILK.jeans}]} />
			{boot(legN[2], lerp(58, 92, c), false, c, 'bn')}
			{/* both arms + open hands (they reach forward, beyond his back) */}
			{sleeveTubes(AL)}
			{sleeveTubes(AR)}
			{hand(AL, -1)}
			{hand(AR, 1)}
			{/* seat + back */}
			<path d={`M-104,${f1(Hy)} L104,${f1(Hy)} L110,${f1(Hy + 48)} Q104,${f1(Hy + 92)} 54,${f1(Hy + 96)} Q14,${f1(Hy + 96)} 0,${f1(Hy + 84)} Q-14,${f1(Hy + 96)} -54,${f1(Hy + 96)} Q-104,${f1(Hy + 92)} -110,${f1(Hy + 48)} Z`} fill={MILK.jeans} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			{[-1, 1].map((sd) => (
				<path key={sd} d={`M${sd * 26},${f1(Hy + 34)} L${sd * 84},${f1(Hy + 30)} L${sd * 82},${f1(Hy + 70)} Q${sd * 54},${f1(Hy + 82)} ${sd * 28},${f1(Hy + 72)} Z`} fill={MILK.jeansD} stroke={INK} strokeWidth={lw * 0.7} strokeLinejoin="round" />
			))}
			<path
				d={`M-102,${f1(Hy + 16)} L102,${f1(Hy + 16)} L122,${f1(top + 70)} Q128,${f1(top + 22)} 98,${f1(top + 6)} Q52,${f1(top - 8)} 0,${f1(top - 8)} Q-52,${f1(top - 8)} -98,${f1(top + 6)} Q-128,${f1(top + 22)} -122,${f1(top + 70)} Z`}
				fill={`url(#${id}c)`}
				stroke={INK}
				strokeWidth={lw}
				strokeLinejoin="round"
			/>
			<path d={`M-116,${f1(top + 60)} Q0,${f1(top + 76)} 116,${f1(top + 60)}`} stroke={MILK.checkD} strokeWidth={lw} fill="none" opacity={0.6} />
			<path d={`M0,${f1(top + 70)} L0,${f1(Hy + 12)}`} stroke={MILK.checkD} strokeWidth={lw * 0.8} opacity={0.45} />
			<path d={`M-102,${f1(Hy + 16)} L102,${f1(Hy + 16)} L106,${f1(Hy - 40)} L-106,${f1(Hy - 40)} Z`} fill="rgba(0,0,0,0.16)" />
			{/* neck, collar, head (back of the head, both ears — no face) */}
			<g transform={`rotate(${f1(tilt)} 0 ${f1(top - 6)})`}>
				<path d={`M-34,${f1(top - 44)} L-34,${f1(top + 6)} Q0,${f1(top + 14)} 34,${f1(top + 6)} L34,${f1(top - 44)} Z`} fill={KIND.dad.skin} stroke={INK} strokeWidth={lw} />
				<g transform={`translate(0 ${f1(top - 92 + 8 * ln)})`}>
					{[-1, 1].map((sd) => (
						<g key={sd}>
							<ellipse cx={sd * 80} cy={8} rx={16} ry={27} fill={KIND.dad.skin} stroke={INK} strokeWidth={lw} />
							<path d={`M${sd * 82},-6 Q${sd * 90},8 ${sd * 82},22`} stroke={KIND.dad.skinD} strokeWidth={lw * 0.8} fill="none" strokeLinecap="round" />
						</g>
					))}
					<ellipse cx={0} cy={0} rx={82} ry={92} fill={KIND.dad.skin} stroke={INK} strokeWidth={lw} />
					<path d="M-84,14 C-96,-70 -56,-104 0,-104 C56,-104 96,-70 84,14 Q80,50 52,66 Q26,74 0,70 Q-26,74 -52,66 Q-80,50 -84,14 Z" fill={MILK.dadHair} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M-44,-72 Q0,-88 44,-70" stroke="#5A4232" strokeWidth={10} fill="none" strokeLinecap="round" />
					<path d="M8,-30 q14,-4 12,10 q-4,12 -16,4" stroke="#5A4232" strokeWidth={6} fill="none" strokeLinecap="round" />
				</g>
				<path d={`M-52,${f1(top - 2)} Q0,${f1(top - 24)} 52,${f1(top - 2)} L48,${f1(top + 16)} Q0,${f1(top - 2)} -48,${f1(top + 16)} Z`} fill={MILK.check} stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
			</g>
		</g>
	);
};
export const DadBack: React.FC<DadBackProps & FigProps> = ({x, y, s = 0.4, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<DadBackG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);

// ───────────────────────────── JacketChair (the dad's sign) ─────────────────────────────

export type JacketChairProps = {t?: number; sway?: number; lw?: number};
/** an empty checked jacket on a wooden chair; (0,0) = floor under the chair; nobody in it */
export const JacketChairG: React.FC<JacketChairProps> = ({t = 0, sway = 1, lw = 8}) => {
	const id = useSid('jc');
	const sw = Math.sin(t * 1.3) * 1.6 * sway;
	return (
		<g>
			<defs>
				<CheckPattern id={`${id}c`} size={60} />
			</defs>
			<ellipse cx={20} cy={0} rx={240} ry={20} fill="rgba(0,0,0,0.22)" />
			{/* back legs + posts */}
			<Tubes
				lw={lw}
				cap="butt"
				segs={[
					{pts: [[-150, 0], [-140, -960]], w: 34, c: MILK.woodD},
					{pts: [[40, 0], [30, -960]], w: 34, c: MILK.wood},
				]}
			/>
			<rect x={-160} y={-960} width={200} height={70} rx={14} fill={MILK.wood} stroke={INK} strokeWidth={lw} />
			{/* jacket */}
			<g transform={`rotate(${f1(sw)} -60 -930)`}>
				<path d="M-230,-900 Q-60,-960 110,-900 L130,-470 L-250,-470 Z" fill={`url(#${id}c)`} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d="M-170,-930 Q-60,-978 50,-930 L60,-880 Q-60,-920 -180,-880 Z" fill={MILK.checkD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<path d="M-80,-900 L-60,-470" stroke={MILK.checkD} strokeWidth={lw * 1.2} />
				<rect x={-200} y={-640} width={100} height={22} rx={6} fill={MILK.checkD} stroke={INK} strokeWidth={lw * 0.7} />
				<rect x={-10} y={-640} width={100} height={22} rx={6} fill={MILK.checkD} stroke={INK} strokeWidth={lw * 0.7} />
				{[-760, -680, -600].map((y) => (
					<circle key={y} cx={-52} cy={y} r={8} fill="#3A2A20" />
				))}
				<g transform={`rotate(${f1(sw * 1.5)} -236 -880)`}>
					<path d="M-232,-890 L-282,-500 L-226,-492 L-188,-860 Z" fill={`url(#${id}c)`} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<rect x={-286} y={-520} width={62} height={30} rx={6} fill={MILK.checkD} stroke={INK} strokeWidth={lw * 0.7} transform="rotate(6 -255 -505)" />
				</g>
				<g transform={`rotate(${f1(-sw * 1.2)} 112 -880)`}>
					<path d="M108,-890 L150,-510 L96,-502 L72,-860 Z" fill={`url(#${id}c)`} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				</g>
			</g>
			{/* seat + front legs */}
			<path d="M-200,-470 L190,-470 L250,-420 L-150,-420 Z" fill={MILK.woodL} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<rect x={-150} y={-420} width={400} height={34} fill={MILK.wood} stroke={INK} strokeWidth={lw} />
			<Tubes
				lw={lw}
				cap="butt"
				segs={[
					{pts: [[-130, -392], [-130, 0]], w: 34, c: MILK.wood},
					{pts: [[226, -392], [226, 0]], w: 34, c: MILK.wood},
				]}
			/>
		</g>
	);
};
export const JacketChair: React.FC<JacketChairProps & FigProps> = ({x, y, s = 0.5, rot, flip, tone, sil, opacity, lw, ...p}) => (
	<Fig x={x} y={y} s={s} rot={rot} flip={flip} tone={tone} sil={sil} opacity={opacity}>
		<JacketChairG lw={lw ?? lwFor(s)} {...p} />
	</Fig>
);
