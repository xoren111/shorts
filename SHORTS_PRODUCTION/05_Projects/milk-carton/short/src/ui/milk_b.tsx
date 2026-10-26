import React, {useId} from 'react';
import {INK, clamp01, easeInOut, easeOut, h1, lerp} from './gfx';
import {HEAD} from '../fonts';
import {PAL} from '../theme';

// =====================================================================================================================
// milk-carton draw kit B — PLACES and BIG OBJECTS (series A look, same as hay-castle/hay_b.tsx: flat fills, INK outlines,
// palette PAL, everything drawn in code). No people here (kit A draws the girl and the adult hands); no Atlas, maps, memes,
// AI frames, photos, logos, brand names, plates, house numbers, readable words or digits. Names / dates are squiggles
// (`squiggle()`), never letters; the only word the kit can write is MISSING on a carton header (header: 'missing').
//
// API FOR SCENE AUTHORS
// · Every component takes `t` (scene seconds) for its idle motion (mist, lamps, waves, wind, wheels…). Events come in as
//   progress values 0..1 (the caller eases them) or as ages = seconds since an event (negative / undefined = not yet).
// · FULL-FRAME backdrops (1080 × 1920, absolutely placed, overflow hidden) also take Tone {dim, desat, sepia, blur}:
//   dim 0..1 darkens (beat 6 «colours dim a notch» ≈ 0.25), desat 0..1 drains colour (flashback), sepia 0..1, blur px
//   (depth of field behind a close-up). Zoom / push-ins: wrap the backdrop in a div with transform scale/translate.
// · PLACED figures take x, y = their anchor in frame px (usually the ground under them), s = scale, flip = mirror.
// · SVG groups (…G) are for drawing inside your own <svg> in local units.
// · Faces on cartons: `faces` / `face` = FaceFill: 'kids' (generic drawn children, b/w halftone, all different, NOT real
//   missing kids — default of CartonWall / FlyerPole), 'empty' (blank grey slot — default of DairyFridge) or a render prop
//   (i, w, h) => node drawn in slot-local units 0..w × 0..h (put kit A's printed girl photo there; DairyLine prints it on
//   every carton). Slot size = CARTON.slot (104 × 120 carton units).
// · Safe zone: key action x 48–887, y 288–1100; subtitles y 1180–1300. Geometry exports below say where things are.
//
//   helpers   mixC, greyC, wobble, popOver, lobePath, squiggle (smooth OCR-safe waves), VaporG / VaporStream (lobed mist,
//             one rim), KidFaceG (generic child, b/w halftone), PLAID + PlaidDefs (dad's check — the ONLY check in the kit),
//             PalmG, Tone, FaceFill + faceNode
//   carton    CartonG / Carton: gable-top «house» carton, face slot on the gable panel, header 'squiggle' | 'missing' |
//             'none', side −1 / 0 / 1, hue, grey, glow; CARTON geometry (slot, apex)
//   STORE     DairyFridge {door 0..1 open, mist, flicker, faces (default 'empty' slots), gaps [[row, col]], header}
//             + FRIDGE, fridgeSlot(row, col) → {x, y, s, side} to drop kit A's hero carton into a gap
//             StoreAisle {cam = dolly forward px, flicker 0..1 = unstable tubes blink} + AISLE
//             ShopperLegs {blurred legs streaming past: y floor, speed px/s, dir, blur}
//             ShoppingCart {roll = distance px (wheels turn), speed, rattle, contents} + cartBasket(), cartHandle()
//             CheckoutBelt {speed, sweep 0..1 laser across, beep age, till age, children = items on the belt} + BELT
//   RUN       Shack {night 0..1, rain 0..1, ocean, sway, glow, cam} + SHACK · CurtainWindow {open 0..1 (→ 0 falls shut),
//             sway} + curtainEdge(open) · OceanSky {speed} + SmallPlane {x, y, s, t, bank} · RoadWindow {speed, rain 0..1}
//   HOME      HouseInterior {view 'kitchen' | 'living', night, outside node, lamp} + KITCHEN (window, fridgeSlot, table)
//             Bedroom {night} · TableTop {variant 'kitchen' | 'desk', light}
//             Lawn {cam, houses, door, screen, slap} + LAWN · House / NeighborHouse {door, screen 0..1, slap age} + houseDoor()
//   POLICE    PoliceLights {k, rate, cx, cy, spread, beams, night} (red/blue wash overlay) + policeFlash(t) · PoliceCar
//             {speed, stop age, silhouette, lights} (no text, no plates)
//   CATHARSIS DairyLine {period, faces, header, skip [k]} + LINE, dairyLineCartons(t) · CartonWall {scroll [x, y], s, grey
//             0..1 row by row from the top, keep [col, row], keepGlow} + WALL, cartonWallCell()
//   DAD       JacketChair {sway} · TearCalendar {pages float} · FlyerPole {faces} · LetterStack {n, drop age}
//   DOOR      Doorframe {behind node (peeks from behind the jamb), children (front), x0, x1} + DOOR · PaperBackdrop {tone}
// Gallery: composition MilkKitB (src/MilkKitBGallery.tsx), one panel per component, ~1 s each.
// =====================================================================================================================

type P2 = [number, number];
const pts = (a: P2[]) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const ln = (a: P2, b: P2) => ({x1: a[0], y1: a[1], x2: b[0], y2: b[1]});
const rad = (d: number) => (d * Math.PI) / 180;
const wrap = (v: number, m: number) => ((v % m) + m) % m;
const useSid = (p: string) => p + useId().replace(/[^a-zA-Z0-9_-]/g, '');
const pick = <T,>(a: readonly T[], k: number) => a[Math.floor(clamp01(k) * a.length) % a.length];

const parseC = (c: string): [number, number, number] => {
	if (c[0] === '#') return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
	const m = c.match(/[\d.]+/g) ?? [];
	return [Number(m[0] ?? 0), Number(m[1] ?? 0), Number(m[2] ?? 0)];
};
/** mix two colours (#rrggbb or rgb()), k = 0 → a, 1 → b; returns rgb() */
export const mixC = (a: string, b: string, k: number) => {
	const A = parseC(a), B = parseC(b), q = clamp01(k);
	return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * q)).join(',')})`;
};
/** fade a colour toward a dark grey of its own luminance (g 0 → as is, 1 → grey × dark) — «dim to grey» */
export const greyC = (c: string, g: number, dark = 0.5) => {
	if (g <= 0.001) return c;
	const [r, gg, b] = parseC(c);
	const l = Math.round((0.3 * r + 0.59 * gg + 0.11 * b) * dark);
	return mixC(c, `rgb(${l},${l},${l})`, g);
};
/** decaying wobble after an event: a = age (s); 0 before the event */
export const wobble = (a: number | undefined, f = 16, damp = 5) => (a === undefined || a < 0 ? 0 : Math.sin(a * f) * Math.exp(-a * damp));
/** 0→1 with an overshoot past 1 (pop) */
export const popOver = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2));

/** lobed «cartoon volume» outline around (cx, cy): n lobes of radius ≈ r; sy squashes it vertically */
export const lobePath = (cx: number, cy: number, r: number, seed = 1, n = 7, sy = 1) => {
	const off = h1(seed * 3.7) * 1.3;
	const p: P2[] = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2 + off;
		const rr = r * (0.78 + 0.16 * h1(seed * 11.3 + i * 5.7));
		p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy]);
	}
	let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)} `;
	for (let i = 0; i < n; i++) {
		const q = p[(i + 1) % n];
		const am = ((i + 0.5) / n) * Math.PI * 2 + off;
		const bulge = r * (1.18 + 0.22 * h1(seed * 7.1 + i * 2.3));
		d += `Q${(cx + Math.cos(am) * bulge).toFixed(1)},${(cy + Math.sin(am) * bulge * sy).toFixed(1)} ${q[0].toFixed(1)},${q[1].toFixed(1)} `;
	}
	return d + 'Z';
};

/** an illegible handwriting squiggle from x0 to x1 around y (path d): a smooth wave of varying height with word gaps —
 *  peaks have flat tangents (no cusps), so OCR reads it as «~~~», never as letters or digits */
export const squiggle = (x0: number, x1: number, y: number, seed = 1, amp = 5) => {
	let x = x0;
	let a0 = amp * 0.5 * (h1(seed * 5.3) > 0.5 ? 1 : -1);
	let d = `M${x0.toFixed(1)},${(y + a0).toFixed(1)}`;
	for (let i = 0; x < x1 - 0.5 && i < 400; i++) {
		const w = amp * (2.2 + 1.2 * h1(seed * 3.1 + i * 1.7));
		const nx = Math.min(x1, x + w);
		if (i > 3 && h1(seed * 7.7 + i * 0.9) > 0.86 && nx + amp * 4 < x1) {
			x = nx + amp * 2;
			a0 = amp * 0.5;
			d += ` M${x.toFixed(1)},${(y + a0).toFixed(1)}`;
			continue;
		}
		const a1 = amp * (0.45 + 0.5 * h1(seed * 5.3 + i * 2.9)) * (a0 > 0 ? -1 : 1);
		const mx = (x + nx) / 2;
		d += ` C${mx.toFixed(1)},${(y + a0).toFixed(1)} ${mx.toFixed(1)},${(y + a1).toFixed(1)} ${nx.toFixed(1)},${(y + a1).toFixed(1)}`;
		x = nx;
		a0 = a1;
	}
	return d;
};

/** a figure drawn in its own units: viewBox vb, anchor (0, 0) placed at (x, y), scale s; flip mirrors around the anchor */
const Fig: React.FC<{x: number; y: number; s?: number; vb: [number, number, number, number]; flip?: boolean; opacity?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({x, y, s = 1, vb, flip, opacity, style, children}) => (
	<svg
		width={vb[2] * s}
		height={vb[3] * s}
		viewBox={vb.join(' ')}
		style={{position: 'absolute', left: x + vb[0] * s, top: y + vb[1] * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined, transformOrigin: `${-vb[0] * s}px ${-vb[1] * s}px`, opacity, pointerEvents: 'none', ...style}}
	>
		{children}
	</svg>
);
/** a frame-sized svg layer (1080 × 1920) */
const Svg: React.FC<{children?: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0, overflow: 'hidden', pointerEvents: 'none', ...style}}>
		{children}
	</svg>
);

/** tone of a full-frame backdrop: dim 0..1 darkens, desat 0..1 drains colour, sepia 0..1, blur px (depth of field) */
export type Tone = {dim?: number; desat?: number; sepia?: number; blur?: number};
const toneFilter = ({dim = 0, desat = 0, sepia = 0, blur = 0}: Tone) => {
	const f: string[] = [];
	if (desat > 0) f.push(`saturate(${(1 - clamp01(desat)).toFixed(3)})`);
	if (sepia > 0) f.push(`sepia(${clamp01(sepia).toFixed(3)})`);
	if (dim > 0) f.push(`brightness(${(1 - 0.5 * clamp01(dim)).toFixed(3)})`);
	if (blur > 0) f.push(`blur(${blur.toFixed(2)}px)`);
	return f.length ? f.join(' ') : undefined;
};
const Full: React.FC<Tone & {bg?: string; children?: React.ReactNode}> = ({bg, children, dim, desat, sepia, blur}) => (
	<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, overflow: 'hidden', background: bg, filter: toneFilter({dim, desat, sepia, blur})}}>{children}</div>
);

// ===================================================================================================== VAPOUR (mist)
export type VaporTone = 'mist' | 'steam' | 'smoke' | 'exhaust' | 'dust';
const VAPOR: Record<VaporTone, [string, string, string, string]> = {
	// rim, shade, base, light
	mist: ['#557489', '#b8cfde', '#e4eef6', '#ffffff'],
	steam: ['#56636f', '#c2cdd7', '#e8eef3', '#ffffff'],
	smoke: [INK, '#9a93a8', '#cbc6d4', '#f1eef5'],
	exhaust: [INK, '#8b8f99', '#c4c7ce', '#eceef2'],
	dust: [INK, '#a88d63', '#d6c29b', '#f3e8cf'],
};
/** one billowing volume (SVG group): n lobed blobs grow and drift (dx, dy over the life) for dur s; a = age. One rim, shade,
 *  base, highlight — a real volume, never plain circles (owner taste 25.10). Fades in and out, so cycling emitters never pop. */
export const VaporG: React.FC<{x: number; y: number; a: number; dur?: number; size?: number; n?: number; dx?: number; dy?: number; seed?: number; tone?: VaporTone; flat?: number; rim?: number}> = ({
	x, y, a, dur = 1.2, size = 120, n = 5, dx = 0, dy = -40, seed = 1, tone = 'mist', flat = 0.7, rim = 6,
}) => {
	if (a < 0 || a > dur) return null;
	const u = a / dur;
	const grow = easeOut(Math.min(1, u * 2));
	const fade = clamp01(u / 0.14) * clamp01((1 - u) / 0.5);
	const [rimC, shade, base, light] = VAPOR[tone];
	const blobs = Array.from({length: n}, (_, i) => {
		const ang = h1(seed * 9.1 + i * 4.3) * Math.PI * 2;
		const dist = size * (0.2 + 0.55 * h1(seed * 2.7 + i * 7.9)) * grow;
		const r = size * (0.34 + 0.3 * h1(seed * 5.3 + i * 3.1)) * (0.4 + 0.6 * grow);
		return {cx: x + Math.cos(ang) * dist * 1.25 + dx * u, cy: y + Math.sin(ang) * dist * flat + dy * u - r * 0.2, r, s: seed * 13 + i * 17};
	});
	return (
		<g opacity={fade}>
			{blobs.map((b, i) => <path key={`o${i}`} d={lobePath(b.cx, b.cy, b.r + rim, b.s)} fill={rimC} />)}
			{blobs.map((b, i) => <path key={`s${i}`} d={lobePath(b.cx, b.cy, b.r, b.s)} fill={shade} />)}
			{blobs.map((b, i) => <path key={`b${i}`} d={lobePath(b.cx - b.r * 0.1, b.cy - b.r * 0.15, b.r * 0.82, b.s)} fill={base} />)}
			{blobs.map((b, i) => <path key={`l${i}`} d={lobePath(b.cx - b.r * 0.3, b.cy - b.r * 0.36, b.r * 0.38, b.s + 5, 5)} fill={light} />)}
		</g>
	);
};
/** a continuous emitter of VaporG along x0..x1 at y (SVG group): n overlapping cycles of dur s, drifting dx ± spread/2, dy; k = opacity */
export const VaporStream: React.FC<{t: number; x0: number; x1: number; y: number; k?: number; n?: number; size?: number; dur?: number; dx?: number; dy?: number; spread?: number; seed?: number; tone?: VaporTone; flat?: number}> = ({
	t, x0, x1, y, k = 1, n = 6, size = 90, dur = 2.4, dx = 0, dy = 60, spread = 80, seed = 1, tone = 'mist', flat = 0.6,
}) => {
	if (k <= 0.01) return null;
	return (
		<g opacity={clamp01(k)}>
			{Array.from({length: n}, (_, i) => {
				const ph = t / dur + i / n + h1(seed * 1.9 + i) * 0.5;
				const cyc = Math.floor(ph);
				const a = (ph - cyc) * dur;
				const r = h1(seed * 3.1 + i * 7.7 + cyc * 1.37);
				const px = lerp(x0, x1, (i + 0.15 + 0.7 * r) / n);
				return <VaporG key={i} x={px} y={y} a={a} dur={dur} size={size * (0.75 + 0.5 * h1(seed + i * 4.4 + cyc))} n={4} dx={dx + (r - 0.5) * spread} dy={dy} seed={seed * 17 + i * 5 + cyc * 11} tone={tone} flat={flat} />;
			})}
		</g>
	);
};

// ===================================================================================================== DAD'S CHECK
/** the dad's checked fabric (sleeve, jacket) — the only check pattern anywhere in the kit, so it always reads as «dad» */
export const PLAID = {base: '#b0413e', dark: '#2a2f4f', light: '#f0c75e'} as const;
/** <defs> with a plaid pattern id (use fill={`url(#${id})`}); size = tile in local units */
export const PlaidDefs: React.FC<{id: string; size?: number; rot?: number}> = ({id, size = 56, rot = 4}) => (
	<defs>
		<pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`rotate(${rot})`}>
			<rect width={size} height={size} fill={PLAID.base} />
			<rect x={0} y={0} width={size * 0.36} height={size} fill={PLAID.dark} opacity={0.55} />
			<rect x={0} y={0} width={size} height={size * 0.36} fill={PLAID.dark} opacity={0.55} />
			<rect x={size * 0.66} y={0} width={size * 0.06} height={size} fill={PLAID.light} opacity={0.75} />
			<rect x={0} y={size * 0.66} width={size} height={size * 0.06} fill={PLAID.light} opacity={0.75} />
		</pattern>
	</defs>
);

// ===================================================================================================== GENERIC KID PHOTO
const KID_SKIN = ['#d6d6d6', '#bfbfbf', '#a4a4a4', '#878787'];
const KID_HAIR = ['#222222', '#3c3c3c', '#5c5c5c', '#8a8a8a'];
const KID_SHIRT = ['#6a6a6a', '#9a9a9a', '#474747', '#b5b5b5'];
const KID_CAP: string[] = [
	'M24,62 Q20,24 50,24 Q80,24 76,62 L72,62 Q72,44 64,42 Q57,49 50,44 Q43,49 36,42 Q28,44 28,62 Z', // bob + bangs
	'M26,52 Q26,26 50,25 Q74,26 74,52 Q70,40 50,39 Q30,40 26,52 Z', // short crop
	'M26,54 Q26,26 50,25 Q74,26 74,54 Q66,38 50,41 Q34,38 26,54 Z', // parted (pigtails)
	'M27,50 Q30,30 50,30 Q70,30 73,50 Q62,40 50,42 Q38,40 27,50 Z', // curly front
	'M26,56 Q28,26 50,25 Q74,26 74,50 Q60,34 42,44 Q34,48 26,56 Z', // side-swept
	'M26,52 Q26,26 50,25 Q74,26 74,52 Q64,36 50,37 Q36,36 26,52 Z', // bun
];
/**
 * A generic drawn child's school photo, black-and-white halftone print (SVG group) in a w × h box (designed 100 × 120).
 * seed picks hair style / tones — every seed a different child; none is modelled on a real person. grey 0..1 darkens it.
 */
export const KidFaceG: React.FC<{w: number; h: number; seed?: number; grey?: number; raster?: boolean}> = ({w, h, seed = 1, grey = 0, raster = true}) => {
	const sid = useSid('kid');
	const skin = pick(KID_SKIN, h1(seed * 2.9)), hair = pick(KID_HAIR, h1(seed * 4.3)), shirt = pick(KID_SHIRT, h1(seed * 6.1));
	const style = Math.floor(h1(seed * 1.7) * 6) % 6;
	const sw = 2.2;
	const ink = '#151515';
	return (
		<g transform={`scale(${(w / 100).toFixed(4)} ${(h / 120).toFixed(4)})`}>
			<defs>
				<radialGradient id={`${sid}b`} cx="50%" cy="38%" r="72%">
					<stop offset="0%" stopColor="#f4f4f4" />
					<stop offset="100%" stopColor="#b9b9b9" />
				</radialGradient>
				<pattern id={`${sid}d`} width={3.2} height={3.2} patternUnits="userSpaceOnUse">
					<circle cx={1.6} cy={1.6} r={0.8} fill="#000" />
				</pattern>
			</defs>
			<rect x={0} y={0} width={100} height={120} fill={`url(#${sid}b)`} />
			{style === 3 ? <path d={lobePath(50, 48, 31, seed, 9, 0.86)} fill={hair} stroke={ink} strokeWidth={sw} /> : null}
			{style === 4 ? <path d="M22,56 Q18,22 50,20 Q82,22 78,56 L84,106 Q50,114 16,106 Z" fill={hair} stroke={ink} strokeWidth={sw} strokeLinejoin="round" /> : null}
			{style === 5 ? <path d={lobePath(50, 21, 11, seed + 2, 6)} fill={hair} stroke={ink} strokeWidth={sw} /> : null}
			<path d="M6,122 Q12,92 50,90 Q88,92 94,122 Z" fill={shirt} stroke={ink} strokeWidth={sw} />
			<path d="M40,91 Q50,99 60,91" fill="none" stroke={ink} strokeWidth={sw * 0.8} />
			<rect x={42} y={72} width={16} height={20} fill={mixC(skin, '#000000', 0.18)} />
			{style === 2 ? [21, 79].map((px) => <path key={px} d={lobePath(px, 66, 10, seed + px, 6)} fill={hair} stroke={ink} strokeWidth={sw} />) : null}
			<ellipse cx={26} cy={58} rx={5} ry={7} fill={skin} stroke={ink} strokeWidth={sw} />
			<ellipse cx={74} cy={58} rx={5} ry={7} fill={skin} stroke={ink} strokeWidth={sw} />
			<ellipse cx={50} cy={56} rx={24} ry={27} fill={skin} stroke={ink} strokeWidth={sw} />
			<path d={KID_CAP[style]} fill={hair} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
			<circle cx={41} cy={59} r={3.3} fill={ink} />
			<circle cx={59} cy={59} r={3.3} fill={ink} />
			<circle cx={42} cy={58} r={1} fill="#fff" />
			<circle cx={60} cy={58} r={1} fill="#fff" />
			<path d="M36,51 Q41,48 46,51 M54,51 Q59,48 64,51" fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
			<path d="M49,62 Q52,66 48,67" fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
			<path d={h1(seed * 8.3) > 0.5 ? 'M42,71 Q50,79 58,71 Q50,74 42,71 Z' : 'M44,72 Q50,76 56,72'} fill={h1(seed * 8.3) > 0.5 ? '#3a3a3a' : 'none'} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
			{raster ? <rect x={0} y={0} width={100} height={120} fill={`url(#${sid}d)`} opacity={0.17} /> : null}
			{grey > 0.01 ? <rect x={0} y={0} width={100} height={120} fill="#000" opacity={clamp01(grey) * 0.5} /> : null}
		</g>
	);
};

// ===================================================================================================== CARTON
/** carton units: the face panel is 200 wide × 270 tall with the gable triangle above it (apex y −340, fin tip y −366);
 *  anchor (0, 0) = bottom centre of the face panel. The missing-kid photo sat on this gable-end panel. */
export const CARTON = {fw: 200, sw: 56, body: 270, apex: -340, h: 366, slot: {x: -52, y: -212, w: 104, h: 120}} as const;
export type CartonHeader = 'missing' | 'squiggle' | 'none';
/** what goes in a carton's face slot: generic kids, a blank slot, or your own node in slot units (0..w × 0..h) */
export type FaceFill = 'kids' | 'empty' | ((i: number, w: number, h: number) => React.ReactNode);
export const faceNode = (fill: FaceFill, i: number, seed: number, grey = 0): React.ReactNode =>
	fill === 'empty' ? null : typeof fill === 'function' ? fill(i, CARTON.slot.w, CARTON.slot.h) : <KidFaceG w={CARTON.slot.w} h={CARTON.slot.h} seed={seed} grey={grey} />;
const CTOP = ['#2c6fb0', '#c8102e', '#2a9d8f', '#e0742a'];

/**
 * A generic gable-top milk carton (SVG group), no brand, no logo: the «house» silhouette — face panel with the coloured
 * gable triangle and the fin on top; a header (squiggle / MISSING / none), the face slot (`face` node in slot units,
 * clipped), two squiggle lines for name and date, a milk-wave band. side 1 / −1 also shows the right / left side panel and
 * its roof slope (3/4 view), 0 = straight on. hue 0..3 = blue, red, teal, orange. grey 0..1 dims every colour to grey;
 * glow 0..1 = orange halo (the one carton that «keeps its colour»).
 */
export const CartonG: React.FC<{x?: number; y?: number; s?: number; rot?: number; side?: -1 | 0 | 1; hue?: number; header?: CartonHeader; face?: React.ReactNode; grey?: number; glow?: number; seed?: number; lw?: number}> = ({
	x = 0, y = 0, s = 1, rot = 0, side = 1, hue = 0, header = 'squiggle', face, grey = 0, glow = 0, seed = 1, lw = 5,
}) => {
	const sid = useSid('ct');
	const G = (c: string) => greyC(c, grey);
	const top = CTOP[((Math.round(hue) % CTOP.length) + CTOP.length) % CTOP.length];
	const topD = mixC(top, '#000000', 0.28), topL = mixC(top, '#ffffff', 0.3);
	const sx = side * 56, sy = side ? -14 : 0;
	const e = side >= 0 ? 100 : -100;
	const AP = CARTON.apex;
	const sl = CARTON.slot;
	const front: P2[] = [[-100, 0], [100, 0], [100, -270], [-100, -270]];
	const tri: P2[] = [[-100, -270], [100, -270], [0, AP]];
	const sideP: P2[] = [[e, 0], [e + sx, sy], [e + sx, -270 + sy], [e, -270]];
	const roof: P2[] = [[e, -270], [e + sx, -270 + sy], [sx, AP + sy], [0, AP]];
	const fin: P2[] = side ? [[0, AP + 4], [sx, AP + sy + 4], [sx, AP + sy - 24], [0, AP - 24]] : [[-8, AP + 6], [8, AP + 6], [8, AP - 26], [-8, AP - 26]];
	const polys = side ? [front, tri, sideP, roof, fin] : [front, tri, fin];
	return (
		<g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(4)})`}>
			<defs>
				<clipPath id={`${sid}c`}>
					<rect x={sl.x} y={sl.y} width={sl.w} height={sl.h} />
				</clipPath>
			</defs>
			{glow > 0.01 ? (
				<g opacity={clamp01(glow)} strokeLinejoin="round">
					{polys.map((q, i) => <polygon key={`a${i}`} points={pts(q)} fill={PAL.orange} stroke={PAL.orange} strokeWidth={46} opacity={0.3} />)}
					{polys.map((q, i) => <polygon key={`b${i}`} points={pts(q)} fill={PAL.orange} stroke={PAL.orange} strokeWidth={22} />)}
				</g>
			) : null}
			{side ? (
				<g>
					<polygon points={pts(sideP)} fill={G('#d4cab7')} />
					<path d={`M${e},-36 Q${e + sx / 2},${-46 + sy / 2} ${e + sx},${-40 + sy} L${e + sx},${sy} L${e},0 Z`} fill={G(topD)} />
					<polygon points={pts(sideP)} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<polygon points={pts(roof)} fill={G(topD)} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				</g>
			) : null}
			<polygon points={pts(fin)} fill={G(topL)} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<polygon points={pts(front)} fill={G('#f7f2e7')} />
			<rect x={-100} y={-270} width={200} height={9} fill={G(topD)} />
			<path d="M-100,-36 Q-50,-56 0,-38 T100,-40 L100,0 L-100,0 Z" fill={G(top)} />
			<path d="M-96,-22 Q-50,-38 0,-24 T96,-28" stroke={G(topL)} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.85} />
			{header === 'missing' ? (
				<text x={0} y={-224} textAnchor="middle" fontFamily={HEAD} fontSize={29} letterSpacing={0.5} fill={G(PAL.stamp)}>
					MISSING
				</text>
			) : header === 'squiggle' ? (
				<path d={squiggle(-62, 62, -236, seed * 3 + 1, 4.5)} stroke={G(PAL.stamp)} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			) : null}
			<rect x={sl.x} y={sl.y} width={sl.w} height={sl.h} fill={G('#d9d9d9')} />
			{face ? (
				<g clipPath={`url(#${sid}c)`}>
					<g transform={`translate(${sl.x} ${sl.y})`}>{face}</g>
				</g>
			) : null}
			<rect x={sl.x} y={sl.y} width={sl.w} height={sl.h} fill="none" stroke={INK} strokeWidth={lw * 0.7} />
			<path d={squiggle(-70, 70, -74, seed + 5, 3.6)} stroke={G('#4a4a4a')} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			<path d={squiggle(-44, 44, -57, seed + 11, 3.2)} stroke={G('#6a6a6a')} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
			<rect x={-88} y={-258} width={12} height={248} rx={6} fill="#ffffff" opacity={0.3} />
			<polygon points={pts(front)} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<polygon points={pts(tri)} fill={G(top)} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d={`M-62,-276 L0,${AP + 18} L62,-276`} fill="none" stroke={G(topL)} strokeWidth={4} opacity={0.7} strokeLinejoin="round" />
			<circle cx={side ? -40 * side : 0} cy={-292} r={11} fill={G(topL)} stroke={INK} strokeWidth={lw * 0.6} />
			{grey > 0.01 ? polys.map((q, i) => <polygon key={`g${i}`} points={pts(q)} fill="#000" opacity={clamp01(grey) * 0.18} />) : null}
		</g>
	);
};
/** CartonG placed in the frame: (x, y) = bottom centre of the front, s = scale (s 1 ≈ 256 × 366 px) */
export const Carton: React.FC<React.ComponentProps<typeof CartonG> & {x: number; y: number}> = ({x, y, s = 1, ...p}) => (
	<Fig x={x} y={y} s={s} vb={[-200, -420, 400, 460]}>
		<CartonG {...p} />
	</Fig>
);

// ===================================================================================================== DAIRY FRIDGE
/** shelf layout of DairyFridge (frame px): opening x0..x1, top..bottom; carton bottoms stand on the shelf y values */
export const FRIDGE = {x0: 64, x1: 1016, top: 236, bottom: 1680, shelf: [610, 950, 1290, 1630], cols: 5, s: 0.78} as const;
const colSide = (col: number, cols: number): -1 | 0 | 1 => {
	const m = (cols - 1) / 2;
	return col < m - 0.01 ? 1 : col > m + 0.01 ? -1 : 0;
};
/** where shelf slot (row 0..3 top→bottom, col 0..4) is: carton anchor (bottom centre), scale, side — put kit A's carton there */
export const fridgeSlot = (row: number, col: number) => {
	const cw = (FRIDGE.x1 - FRIDGE.x0) / FRIDGE.cols;
	return {x: FRIDGE.x0 + cw * (col + 0.5), y: FRIDGE.shelf[Math.max(0, Math.min(3, row))] - 2, s: FRIDGE.s, side: colSide(col, FRIDGE.cols)};
};
const FRIDGE_ORDER = [0, 1, 4, 3, 2];

/**
 * Open grocery dairy fridge, full frame: canopy light box (no text), cooler interior with four shelves of generic cartons
 * (face slots = `faces`: default 'empty' frames — pass 'kids' or your render prop to fill them), price rails with blank tags, LED glow under each shelf, glass door on the left hinge
 * (door 0 = closed in front of the shelves, 1 = swung open toward the camera), cold mist spilling from every shelf and the
 * bottom (mist 0..1, animated with t), flicker 0..1 = the lights stutter. gaps = [[row, col], …] slots without a carton
 * (one was taken / kit A's hero carton goes there, see fridgeSlot). For the frame-0 ECU: wrap in a scaled div + blur.
 */
export const DairyFridge: React.FC<{t: number; door?: number; mist?: number; flicker?: number; faces?: FaceFill; header?: CartonHeader; gaps?: [number, number][]} & Tone> = ({
	t, door = 1, mist = 1, flicker = 0, faces = 'empty', header = 'squiggle', gaps = [], ...tone
}) => {
	const sid = useSid('df');
	const L = flicker > 0 ? 1 - flicker * (h1(Math.floor(t * 14) * 1.31 + 0.7) > 0.7 ? 0.6 : 0.06) : 1;
	const {x0, x1, top, bottom, shelf, cols, s} = FRIDGE;
	const isGap = (r: number, c: number) => gaps.some(([a, b]) => a === r && b === c);
	const cw = (x1 - x0) / cols;
	// glass door on a left hinge, perspective quad A (hinge top) B (free top) C (free bottom) D (hinge bottom)
	const th = rad(clamp01(door) * 96);
	const hx = 40, yT = 206, yB = 1716, Wd = 1010;
	const pp = Math.sin(th) * 0.3;
	const fx = hx + Wd * Math.cos(th);
	const A: P2 = [hx, yT], B: P2 = [fx, yT - pp * 330], C: P2 = [fx, yB + pp * 330], D: P2 = [hx, yB];
	const Q = (u: number, v: number): P2 => {
		const a: P2 = [lerp(A[0], B[0], u), lerp(A[1], B[1], u)];
		const b: P2 = [lerp(D[0], C[0], u), lerp(D[1], C[1], u)];
		return [lerp(a[0], b[0], v), lerp(a[1], b[1], v)];
	};
	const quv = (u0: number, v0: number, u1: number, v1: number) => pts([Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)]);
	return (
		<Full bg="#18212c" {...tone}>
			<Svg>
				<defs>
					<linearGradient id={`${sid}w`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor={mixC('#9db7c9', '#eef8fd', L)} />
						<stop offset="1" stopColor={mixC('#7d97aa', '#b5d3e6', L)} />
					</linearGradient>
					<linearGradient id={`${sid}g`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#ffffff" stopOpacity={0.6 * L} />
						<stop offset="1" stopColor="#ffffff" stopOpacity={0} />
					</linearGradient>
					<radialGradient id={`${sid}f`} cx="50%" cy="0%" r="70%">
						<stop offset="0" stopColor="#ffffff" stopOpacity={0.45 * L} />
						<stop offset="1" stopColor="#ffffff" stopOpacity={0} />
					</radialGradient>
				</defs>
				{/* canopy with a light box — no text */}
				<rect x={20} y={36} width={1040} height={170} rx={12} fill={PAL.navy2} stroke={INK} strokeWidth={6} />
				<rect x={20} y={160} width={1040} height={16} fill={PAL.orange} stroke={INK} strokeWidth={4} />
				<rect x={70} y={62} width={940} height={74} rx={37} fill={mixC('#8ea3b4', '#ffffff', L)} stroke={INK} strokeWidth={5} />
				<rect x={110} y={78} width={860} height={14} rx={7} fill="#ffffff" opacity={0.7 * L} />
				{/* cabinet + cold interior */}
				<rect x={20} y={200} width={1040} height={1520} rx={8} fill="#55687c" stroke={INK} strokeWidth={7} />
				<rect x={x0} y={top} width={x1 - x0} height={bottom - top} fill={`url(#${sid}w)`} stroke={INK} strokeWidth={6} />
				<polygon points={pts([[x0, top], [x0 + 40, top + 34], [x0 + 40, bottom - 30], [x0, bottom]])} fill="#93b3c8" />
				<polygon points={pts([[x1, top], [x1 - 40, top + 34], [x1 - 40, bottom - 30], [x1, bottom]])} fill="#93b3c8" />
				<rect x={x0 + 44} y={top + 8} width={x1 - x0 - 88} height={16} rx={8} fill={mixC('#b7c6d1', '#ffffff', L)} />
				<rect x={x0 + 40} y={top + 24} width={x1 - x0 - 80} height={140} fill={`url(#${sid}g)`} />
				{shelf.map((ys, r) => (
					<g key={r}>
						<polygon points={pts([[x0 + 40, ys - 20], [x1 - 40, ys - 20], [x1, ys], [x0, ys]])} fill="#e3f0f7" />
						{FRIDGE_ORDER.map((c) =>
							isGap(r, c) ? null : (
								<CartonG key={c} x={x0 + cw * (c + 0.5)} y={ys - 2} s={s} side={colSide(c, cols)} hue={Math.floor(h1(r * 7.1 + c * 3.3) * 4)} header={header} face={faceNode(faces, r * cols + c, r * 11 + c * 7 + 3)} seed={r * 13 + c * 7 + 1} lw={6} />
							),
						)}
						<rect x={x0} y={ys} width={x1 - x0} height={42} fill="#9fb0bf" stroke={INK} strokeWidth={5} />
						<rect x={x0 + 6} y={ys + 9} width={x1 - x0 - 12} height={24} fill="#f2f4f6" />
						{Array.from({length: cols}, (_, c) => (
							<rect key={c} x={x0 + cw * (c + 0.5) - 34} y={ys + 11} width={68} height={20} rx={3} fill={c % 2 ? PAL.orange : '#ffd75a'} stroke={INK} strokeWidth={2.5} />
						))}
						{r < shelf.length - 1 ? <rect x={x0 + 40} y={ys + 42} width={x1 - x0 - 80} height={110} fill={`url(#${sid}g)`} /> : null}
					</g>
				))}
				{/* store floor + kick plate */}
				<rect x={0} y={1716} width={1080} height={204} fill="#cdbfa6" />
				{Array.from({length: 9}, (_, i) => {
					const bx = -180 + i * 180;
					return <line key={i} x1={bx} y1={1716} x2={540 + (bx - 540) * 1.5} y2={1920} stroke="#b4a58b" strokeWidth={4} />;
				})}
				<line x1={0} y1={1820} x2={1080} y2={1820} stroke="#b4a58b" strokeWidth={4} />
				<rect x={0} y={1716} width={1080} height={204} fill={`url(#${sid}f)`} />
				<rect x={20} y={1676} width={1040} height={46} fill="#2f3a47" stroke={INK} strokeWidth={6} />
				{Array.from({length: 18}, (_, i) => <rect key={i} x={70 + i * 54} y={1690} width={32} height={18} rx={6} fill="#1a222c" />)}
			</Svg>
			{/* glass door */}
			<Svg>
				<polygon points={pts([A, B, C, D])} fill="#6f8296" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<polygon points={quv(0.045, 0.022, 0.955, 0.978)} fill="rgba(205,232,250,0.22)" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<polygon points={quv(0.045, 0.9, 0.955, 0.978)} fill="#ffffff" opacity={0.32} />
				<polygon points={pts([Q(0.16, 0.03), Q(0.25, 0.03), Q(0.52, 0.97), Q(0.43, 0.97)])} fill="#ffffff" opacity={0.14} />
				<polygon points={pts([Q(0.3, 0.03), Q(0.33, 0.03), Q(0.6, 0.97), Q(0.57, 0.97)])} fill="#ffffff" opacity={0.12} />
				<line {...ln(Q(0.9, 0.36), Q(0.9, 0.64))} stroke={INK} strokeWidth={24} strokeLinecap="round" />
				<line {...ln(Q(0.9, 0.36), Q(0.9, 0.64))} stroke="#dfe6ec" strokeWidth={12} strokeLinecap="round" />
			</Svg>
			{/* cold mist spilling out */}
			{mist > 0.01 ? (
				<Svg>
					{shelf.map((ys, r) => (
						<VaporStream key={r} t={t + r * 0.7} x0={x0 + 30} x1={x1 - 30} y={ys + 50} k={mist * 0.85} n={6} size={58} dur={2.6} dy={70} spread={150} seed={r + 1} />
					))}
					<VaporStream t={t} x0={x0 - 40} x1={x1 + 40} y={bottom + 14} k={mist} n={7} size={120} dur={3} dy={110} spread={300} seed={9} flat={0.5} />
				</Svg>
			) : null}
		</Full>
	);
};

// ===================================================================================================== STORE AISLE
/** one-point perspective of StoreAisle: screen = (vx + X·F/z, vy + Y·F/z); shelf faces at X = ±620, floor Y 820 */
export const AISLE = {vx: 540, vy: 820, F: 1000, X: 620, floor: 820, ceil: -1100, top: -560, zn: 640, zf: 16000} as const;
const PRODUCT = ['#e0742a', '#2c6fb0', '#c8102e', '#2a9d8f', '#ffc83a', '#f6a6c4', '#7cb655', '#efe3c8', '#8a5cc0', '#ffffff'];
/**
 * Supermarket aisle, full frame, one-point perspective (vanishing point x 540, y 820): floor tiles, ceiling with fluorescent
 * tubes, shelving with generic coloured products (no text) on both sides. cam = how far the camera has dollied forward (px
 * of world depth; animate cam = t·300 for a slow push, everything streams toward the lens). flicker 0..1 = some tubes stutter.
 */
export const StoreAisle: React.FC<{t: number; cam?: number; flicker?: number} & Tone> = ({t, cam = 0, flicker = 0, ...tone}) => {
	const {vx, vy, F, X, floor, ceil, top, zn, zf} = AISLE;
	const P = (x: number, y: number, z: number): P2 => [vx + (x * F) / z, vy + (y * F) / z];
	const sw = (z: number) => Math.max(0.5, Math.min(5, (3.6 * F) / z));
	const zs = (step: number, z0: number, z1: number, phase = 0) => {
		const out: {z: number; k: number}[] = [];
		const off = cam + phase;
		const k0 = Math.floor((z0 + off) / step);
		for (let k = k0; k < k0 + 400; k++) {
			const z = k * step - off;
			if (z > z1) break;
			if (z >= z0) out.push({z, k});
		}
		return out;
	};
	const lamps = zs(1300, 900, zf, 300)
		.reverse()
		.map(({z, k}) => {
			const unstable = h1(k * 3.31 + 0.5) < 0.45;
			const on = !(flicker > 0 && unstable && h1(Math.floor(t * 16) * 0.71 + k * 1.93) < flicker * 0.6);
			return {z, k, on};
		});
	const levels = [floor - 30, 470, 120, -230];
	const LH = 350, Lz = 230;
	const shelving = (sg: -1 | 1) => {
		const x = sg * X;
		const items: React.ReactNode[] = [];
		items.push(<polygon key="uw" points={pts([P(x, ceil, zn), P(x, ceil, zf), P(x, top, zf), P(x, top, zn)])} fill="#d0d8e0" />);
		items.push(<polygon key="band" points={pts([P(x, top - 170, zn), P(x, top - 170, zf), P(x, top - 90, zf), P(x, top - 90, zn)])} fill={sg < 0 ? PAL.orange : PAL.teal} />);
		items.push(<polygon key="bk" points={pts([P(x, top, zn), P(x, top, zf), P(x, floor, zf), P(x, floor, zn)])} fill="#6f7c8b" />);
		levels.forEach((yb, li) => {
			zs(Lz, 200, 9500, li * 57)
				.reverse()
				.forEach(({z, k}) => {
					const sd = k * 7.13 + li * 31.7 + (sg > 0 ? 500 : 0);
					const hh = LH * (0.55 + 0.38 * h1(sd));
					const z0 = Math.max(300, z), z1 = z + Lz * (0.78 + 0.12 * h1(sd + 1));
					if (z1 < 320) return;
					const col = pick(PRODUCT, h1(sd + 2));
					items.push(<polygon key={`p${li}_${k}`} points={pts([P(x, yb - hh, z0), P(x, yb - hh, z1), P(x, yb, z1), P(x, yb, z0)])} fill={col} stroke={INK} strokeWidth={sw(z0)} strokeLinejoin="round" />);
					items.push(<polygon key={`q${li}_${k}`} points={pts([P(x, yb - hh * 0.62, z0), P(x, yb - hh * 0.62, z1), P(x, yb - hh * 0.4, z1), P(x, yb - hh * 0.4, z0)])} fill="#ffffff" opacity={0.5} />);
				});
			items.push(<polygon key={`b${li}`} points={pts([P(x, yb, 300), P(x, yb, zf), P(x, yb + 34, zf), P(x, yb + 34, 300)])} fill="#b4bec9" stroke={INK} strokeWidth={2.5} />);
			zs(640, 320, 9000, li * 120).forEach(({z, k}) =>
				items.push(<polygon key={`tg${li}_${k}`} points={pts([P(x, yb + 6, z), P(x, yb + 6, z + 110), P(x, yb + 28, z + 110), P(x, yb + 28, z)])} fill={k % 3 ? '#ffffff' : '#ffd75a'} stroke={INK} strokeWidth={sw(z) * 0.5} />),
			);
		});
		return <g key={sg}>{items}</g>;
	};
	return (
		<Full bg="#cfd5da" {...tone}>
			<Svg>
				<polygon points={pts([P(-X, ceil, zf), P(X, ceil, zf), P(X, floor, zf), P(-X, floor, zf)])} fill="#dfe4e8" />
				<polygon points={pts([P(-X, ceil, zn), P(X, ceil, zn), P(X, ceil, zf), P(-X, ceil, zf)])} fill="#ebe7dd" />
				<polygon points={pts([P(-X, floor, zn), P(X, floor, zn), P(X, floor, zf), P(-X, floor, zf)])} fill="#d8ccb6" />
				{zs(380, zn, zf).map(({z, k}) => <line key={`fl${k}`} {...ln(P(-X, floor, z), P(X, floor, z))} stroke="#b7a88f" strokeWidth={sw(z)} />)}
				{[-3, -2, -1, 0, 1, 2, 3].map((j) => <line key={`fj${j}`} {...ln(P((j * X) / 4, floor, zn), P((j * X) / 4, floor, zf))} stroke="#b7a88f" strokeWidth={2.5} />)}
				{lamps.map(({z, k, on}) => {
					const [ex, ey] = P(0, floor, z + 260);
					return on ? <ellipse key={`r${k}`} cx={ex} cy={ey} rx={(140 * F) / z} ry={(60 * F) / z} fill="#ffffff" opacity={0.28} /> : null;
				})}
				{lamps.map(({z, k, on}) => (
					<g key={`l${k}`}>
						<polygon points={pts([P(-170, ceil, z - 140), P(170, ceil, z - 140), P(170, ceil, z + 660), P(-170, ceil, z + 660)])} fill="#fffbe6" opacity={on ? 0.4 : 0} />
						<polygon points={pts([P(-70, ceil, z), P(70, ceil, z), P(70, ceil, z + 520), P(-70, ceil, z + 520)])} fill={on ? '#ffffff' : '#97a0aa'} stroke={INK} strokeWidth={sw(z)} />
					</g>
				))}
				{shelving(-1)}
				{shelving(1)}
			</Svg>
		</Full>
	);
};

// ===================================================================================================== SHOPPER LEGS
const PANTS = ['#2c3e66', '#4a4a52', '#7a5a3a', '#2a6d63', '#6b2f3f', '#3b4a3a', '#8a8f99'];
const SHOES = ['#1a1a1a', '#f2f2f2', '#7a3b2a', '#c8102e', '#2c4fb0'];
/**
 * Shoppers' legs streaming past in a soft blur (overlay, full frame): n walkers from hip to shoe, y = floor line, speed px/s,
 * dir 1 → right, −1 → left, blur px. Faceless by construction (they are cropped at the hip). s = size.
 */
export const ShopperLegs: React.FC<{t: number; y?: number; n?: number; speed?: number; blur?: number; s?: number; dir?: 1 | -1; seed?: number; opacity?: number}> = ({
	t, y = 1760, n = 4, speed = 900, blur = 7, s = 1, dir = 1, seed = 1, opacity = 0.92,
}) => {
	const span = 1080 + 900 * s;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity, filter: blur > 0 ? `blur(${blur}px)` : undefined, pointerEvents: 'none'}}>
			{Array.from({length: n}, (_, i) => {
				const sc = s * (0.85 + 0.3 * h1(seed * 5 + i * 2.3));
				const v = speed * (0.8 + 0.4 * h1(seed * 3 + i));
				const Lg = 640 * sc;
				let px = wrap(h1(seed * 7 + i * 4.1) * span + t * v, span) - 450 * s;
				if (dir < 0) px = 1080 - px;
				const ph = ((t * v) / (Lg * 0.9)) * Math.PI + i * 1.7;
				const pants = pick(PANTS, h1(seed * 2.2 + i * 3.7));
				const shoe = pick(SHOES, h1(seed * 4.6 + i * 1.3));
				const skirt = h1(seed * 9 + i) > 0.72;
				const amp = 24;
				const spreadA = amp * Math.abs(Math.sin(ph));
				const hipY = y - Lg * Math.cos(rad(spreadA)) - 20 * sc;
				const legW = 96 * sc;
				const leg = (k: number) => {
					const a = amp * Math.sin(ph + k * Math.PI) * dir;
					const c = k ? pants : mixC(pants, '#000000', 0.22);
					return (
						<g key={k} transform={`translate(${px.toFixed(1)} ${hipY.toFixed(1)}) rotate(${(-a).toFixed(2)})`}>
							<path d={`M${-legW / 2},-40 L${legW / 2},-40 L${legW * 0.42},${Lg - 30 * sc} L${-legW * 0.42},${Lg - 30 * sc} Z`} fill={skirt ? '#4a3a44' : c} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
							<ellipse cx={dir * 26 * sc} cy={Lg - 10 * sc} rx={64 * sc} ry={26 * sc} fill={shoe} stroke={INK} strokeWidth={6} />
						</g>
					);
				};
				return (
					<g key={i}>
						{leg(0)}
						{leg(1)}
						{skirt ? <path d={`M${px - 70 * sc},${hipY - 80 * sc} L${px + 70 * sc},${hipY - 80 * sc} L${px + 120 * sc},${hipY + 260 * sc} L${px - 120 * sc},${hipY + 260 * sc} Z`} fill={pants} stroke={INK} strokeWidth={6} strokeLinejoin="round" /> : null}
					</g>
				);
			})}
		</svg>
	);
};

// ===================================================================================================== SHOPPING CART
const CART_VB: [number, number, number, number] = [-380, -720, 760, 760];
const CART_B: P2[] = [[-252, -562], [252, -562], [208, -284], [-232, -284]];
/** basket opening of a ShoppingCart at (x, y, s), frame px: drop things between x0..x1 down to floor */
export const cartBasket = (x: number, y: number, s = 1) => ({x0: x - 236 * s, x1: x + 220 * s, top: y - 560 * s, floor: y - 290 * s});
/** the red handle grip of a ShoppingCart (where a hand holds it), frame px */
export const cartHandle = (x: number, y: number, s = 1, flip = false) => ({x: x + (flip ? 318 : -318) * s, y: y - 648 * s});
/**
 * Wire shopping cart, side view, front to the right, handle (red grip, no logo) on the left; (x, y) = floor under its middle,
 * ~640 × 700 px at s 1. roll = distance travelled (px) → wheels turn (default speed·t); rattle 0..1 shakes the basket.
 * contents render BETWEEN the far and the near wire mesh (kit A's carton seen through the wires) — see cartBasket.
 * fade = a soft window in the NEAR mesh (cart units: centre x, y, radii rx, ry; k 0..1 = how much the wires fade there, max ≈ 80 %)
 * so a carton inside stays readable (rim and frame stay solid).
 */
export const ShoppingCart: React.FC<{x: number; y: number; s?: number; t?: number; roll?: number; speed?: number; rattle?: number; flip?: boolean; contents?: React.ReactNode; fade?: {x: number; y: number; rx: number; ry: number; k: number}}> = ({
	x, y, s = 1, t = 0, roll, speed = 0, rattle, flip, contents, fade,
}) => {
	const sid = useSid('cart');
	const dist = roll ?? speed * t;
	const spin = (dist / (2 * Math.PI * 34 * s)) * 360;
	const rt = rattle ?? (speed !== 0 || roll !== undefined ? 1 : 0);
	const bob = rt * (Math.sin(t * 47) * 1.6 + Math.sin(t * 23 + 1) * 1.1);
	const wheel = (cx: number, dark: boolean) => (
		<g transform={`translate(${cx} -34)`}>
			<rect x={-14} y={-34} width={28} height={28} rx={5} fill={dark ? '#5d656e' : '#9aa3ad'} stroke={INK} strokeWidth={4} />
			<circle r={34} fill={dark ? '#18181d' : '#2a2a30'} stroke={INK} strokeWidth={5} />
			<circle r={15} fill={dark ? '#5d656e' : '#c9ccd2'} stroke={INK} strokeWidth={3} />
			<g transform={`rotate(${spin.toFixed(1)})`}>
				{[0, 120, 240].map((a) => (
					<line key={a} x1={0} y1={0} x2={0} y2={-27} stroke={dark ? '#4a4a50' : '#7d838c'} strokeWidth={6} strokeLinecap="round" transform={`rotate(${a})`} />
				))}
			</g>
			<circle r={5} fill={INK} />
		</g>
	);
	const mesh = (far: boolean) => (
		<g>
			{Array.from({length: 17}, (_, i) => {
				const xx = -244 + i * 31;
				return (
					<g key={`v${i}`}>
						{far ? null : <line x1={xx} y1={-562} x2={xx} y2={-284} stroke={INK} strokeWidth={7} />}
						<line x1={xx} y1={-562} x2={xx} y2={-284} stroke={far ? '#8d97a2' : '#e2e8ed'} strokeWidth={far ? 3 : 3.5} />
					</g>
				);
			})}
			{[-516, -470, -424, -378, -332].map((yy) => (
				<g key={`h${yy}`}>
					{far ? null : <line x1={-260} y1={yy} x2={260} y2={yy} stroke={INK} strokeWidth={7} />}
					<line x1={-260} y1={yy} x2={260} y2={yy} stroke={far ? '#8d97a2' : '#e2e8ed'} strokeWidth={far ? 3 : 3.5} />
				</g>
			))}
		</g>
	);
	return (
		<>
			<Fig x={x} y={y} s={s} vb={CART_VB} flip={flip}>
				<defs>
					<clipPath id={`${sid}f`}>
						<polygon points={pts(CART_B)} />
					</clipPath>
				</defs>
				<ellipse cx={0} cy={2} rx={290} ry={18} fill="rgba(0,0,0,0.25)" />
				{wheel(-174, true)}
				{wheel(226, true)}
				<g transform={`translate(26 ${-12 + bob})`}>
					<polygon points={pts(CART_B)} fill="#9aa5b0" opacity={0.25} />
					<g clipPath={`url(#${sid}f)`}>{mesh(true)}</g>
					<line x1={-232} y1={-284} x2={-206} y2={-46} stroke="#6f7984" strokeWidth={10} strokeLinecap="round" />
					<line x1={208} y1={-284} x2={214} y2={-46} stroke="#6f7984" strokeWidth={10} strokeLinecap="round" />
				</g>
				<g transform={`translate(0 ${bob})`}>
					<polygon points={pts([[-232, -284], [208, -284], [232, -298], [-208, -298]])} fill="#aab3bc" stroke={INK} strokeWidth={3} />
				</g>
			</Fig>
			{contents}
			<Fig x={x} y={y} s={s} vb={CART_VB} flip={flip}>
				<defs>
					<clipPath id={`${sid}n`}>
						<polygon points={pts(CART_B)} />
					</clipPath>
					{fade && fade.k > 0.01 ? (
						<>
							<radialGradient id={`${sid}fg`} cx="50%" cy="50%" r="50%">
								<stop offset="0" stopColor="#000" stopOpacity={0.8 * clamp01(fade.k)} />
								<stop offset="0.6" stopColor="#000" stopOpacity={0.8 * clamp01(fade.k)} />
								<stop offset="1" stopColor="#000" stopOpacity={0} />
							</radialGradient>
							<mask id={`${sid}fm`} maskUnits="userSpaceOnUse" x={-400} y={-800} width={800} height={900}>
								<rect x={-400} y={-800} width={800} height={900} fill="#fff" />
								<ellipse cx={fade.x} cy={fade.y} rx={fade.rx} ry={fade.ry} fill={`url(#${sid}fg)`} />
							</mask>
						</>
					) : null}
				</defs>
				<g transform={`translate(0 ${bob})`}>
					<g clipPath={`url(#${sid}n)`}>
						<g mask={fade && fade.k > 0.01 ? `url(#${sid}fm)` : undefined}>{mesh(false)}</g>
					</g>
					{/* rim + sides */}
					{[
						[[-256, -562], [256, -562], 16, 9],
						[[252, -562], [208, -284], 12, 6],
						[[-252, -562], [-232, -284], 12, 6],
						[[-232, -284], [208, -284], 11, 6],
					].map(([a, b, w1, w2], i) => (
						<g key={i}>
							<line {...ln(a as P2, b as P2)} stroke={INK} strokeWidth={w1 as number} strokeLinecap="round" />
							<line {...ln(a as P2, b as P2)} stroke="#eef2f5" strokeWidth={w2 as number} strokeLinecap="round" />
						</g>
					))}
					{/* fold-up child seat flap (plain plastic) */}
					<polygon points={pts([[-248, -556], [-196, -556], [-202, -452], [-244, -452]])} fill="#e0742a" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
					{/* legs, base rail, lower tray */}
					{[
						[[-232, -284], [-206, -50]],
						[[208, -284], [214, -50]],
						[[-224, -50], [236, -50]],
						[[-196, -150], [200, -150]],
					].map(([a, b], i) => (
						<g key={`l${i}`}>
							<line {...ln(a as P2, b as P2)} stroke={INK} strokeWidth={14} strokeLinecap="round" />
							<line {...ln(a as P2, b as P2)} stroke="#c9d0d7" strokeWidth={7} strokeLinecap="round" />
						</g>
					))}
					{[-150, -90, -30, 30, 90, 150].map((xx) => <line key={xx} x1={xx} y1={-150} x2={xx + 6} y2={-54} stroke="#c9d0d7" strokeWidth={4} />)}
					{/* handle + red grip */}
					<line x1={-252} y1={-562} x2={-318} y2={-648} stroke={INK} strokeWidth={15} strokeLinecap="round" />
					<line x1={-252} y1={-562} x2={-318} y2={-648} stroke="#dfe5ea" strokeWidth={8} strokeLinecap="round" />
					<circle cx={-318} cy={-648} r={25} fill={PAL.stamp} stroke={INK} strokeWidth={5} />
					<circle cx={-326} cy={-656} r={8} fill="#ff8a8a" opacity={0.8} />
					<rect x={226} y={-318} width={26} height={44} rx={8} fill="#5d656e" stroke={INK} strokeWidth={4} />
				</g>
				{wheel(-200, false)}
				{wheel(200, false)}
			</Fig>
		</>
	);
};

// ===================================================================================================== CHECKOUT BELT
/** CheckoutBelt geometry (frame px): belt surface between back and front y, it ends at x end; stand items on itemY;
 *  the laser sweeps scan0 → scan1 */
export const BELT = {back: 702, front: 1010, end: 760, itemY: 930, scan0: 300, scan1: 780} as const;
/**
 * Supermarket checkout close-up, full frame: blurred store behind, a black conveyor belt (ribs run right with speed px/s),
 * the flat scanner glass and the scanner tower with its red window (idle laser flicker), a register screen without digits
 * and the cash drawer under the counter. children = items on the belt (drawn over the belt, under the laser).
 * sweep 0..1 = the red laser line crosses scan0 → scan1 (over the items); beep = age → window flash + green light;
 * till = age → the drawer pops open toward the camera (ka-chunk wobble); tillX = shift of the drawer along the counter (px,
 * default 0 = x 786–1074 under the scanner; a scene with right-edge UI moves it left into the safe zone).
 */
export const CheckoutBelt: React.FC<{t: number; speed?: number; sweep?: number; beep?: number; till?: number; tillX?: number; children?: React.ReactNode} & Tone> = ({
	t, speed = 120, sweep = -1, beep, till, tillX = 0, children, ...tone
}) => {
	const sid = useSid('ck');
	const off = wrap(t * speed, 72);
	const bA = beep !== undefined && beep >= 0 && beep < 0.45 ? 1 - beep / 0.45 : 0;
	const lit = beep !== undefined && beep >= 0 && beep < 1.2;
	const tk = till === undefined || till < 0 ? 0 : popOver(clamp01(till / 0.26));
	const tj = wobble(till, 42, 8) * 5;
	const idle = 0.55 + 0.3 * Math.sin(t * 31) * Math.sin(t * 7.3);
	const xL = lerp(BELT.scan0, BELT.scan1, clamp01(sweep));
	const sweeping = sweep >= 0 && sweep <= 1;
	const {back, front, end} = BELT;
	return (
		<Full bg="#d4dae0" {...tone}>
			{/* the store behind, out of focus */}
			<Svg style={{filter: 'blur(9px)'}}>
				<rect x={0} y={0} width={1080} height={720} fill="#cfd7de" />
				{Array.from({length: 7}, (_, i) => (
					<g key={i}>
						<rect x={-40 + i * 170} y={170} width={150} height={460} rx={10} fill="#7d8a99" />
						{[0, 1, 2, 3].map((r) => (
							<rect key={r} x={-30 + i * 170} y={190 + r * 110} width={130} height={80} rx={6} fill={pick(PRODUCT, h1(i * 3.3 + r * 1.7))} />
						))}
					</g>
				))}
				{[120, 540, 960].map((lx) => <ellipse key={lx} cx={lx} cy={70} rx={150} ry={34} fill="#ffffff" opacity={0.9} />)}
			</Svg>
			<Svg>
				<defs>
					<radialGradient id={`${sid}r`} cx="50%" cy="50%" r="50%">
						<stop offset="0" stopColor="#ff4040" stopOpacity={0.9} />
						<stop offset="1" stopColor="#ff4040" stopOpacity={0} />
					</radialGradient>
				</defs>
				{/* register on a pole: screen with bars, no digits */}
				<rect x={940} y={300} width={22} height={130} fill="#4a5058" stroke={INK} strokeWidth={4} />
				<rect x={842} y={170} width={220} height={150} rx={14} fill="#2f343c" stroke={INK} strokeWidth={6} />
				<rect x={858} y={186} width={188} height={110} rx={6} fill={PAL.teal} />
				<rect x={872} y={204} width={110 + 40 * Math.sin(t * 2.1)} height={14} rx={7} fill="#bff3ea" opacity={0.85} />
				<rect x={872} y={232} width={70} height={14} rx={7} fill="#bff3ea" opacity={0.6} />
				<rect x={872} y={262} width={16} height={18} fill="#ffffff" opacity={Math.floor(t * 2.4) % 2 ? 0.9 : 0.15} />
				{/* back rail, belt, ribs */}
				<rect x={-40} y={back - 24} width={end + 80} height={26} fill="#c9d0d7" stroke={INK} strokeWidth={5} />
				<polygon points={pts([[-40, back], [end, back], [end + 30, front], [-60, front]])} fill="#2b2e35" stroke={INK} strokeWidth={5} />
				{Array.from({length: 13}, (_, k) => {
					const xb = -40 + k * 72 + off - 72;
					const xf = xb + 10 + (xb - 360) * 0.06;
					if (xb > end - 4) return null;
					return (
						<g key={k}>
							<line x1={xb} y1={back + 4} x2={xf} y2={front - 4} stroke="#444852" strokeWidth={8} />
							<line x1={xb + 6} y1={back + 4} x2={xf + 6} y2={front - 4} stroke="#1c1e23" strokeWidth={4} />
						</g>
					);
				})}
				<polygon points={pts([[end - 26, back], [end, back], [end + 30, front], [end + 2, front]])} fill="#4b5059" stroke={INK} strokeWidth={4} />
				{/* counter top + scanner glass */}
				<polygon points={pts([[end, back - 24], [1100, back - 24], [1100, front + 22], [end + 32, front + 22]])} fill="#b9c2ca" stroke={INK} strokeWidth={5} />
				<polygon points={pts([[800, 770], [1010, 770], [1032, 966], [826, 966]])} fill="#16181d" stroke={INK} strokeWidth={5} />
				<g opacity={clamp01(idle + bA)}>
					{[
						[[812, 780], [1022, 958]],
						[[1000, 780], [838, 958]],
						[[905, 776], [930, 962]],
						[[808, 868], [1028, 868]],
					].map(([a, b], i) => (
						<line key={i} {...ln(a as P2, b as P2)} stroke="#ff2a2a" strokeWidth={3} />
					))}
				</g>
				{/* tower with the red window */}
				<rect x={846} y={420} width={200} height={300} rx={18} fill="#3a3f47" stroke={INK} strokeWidth={6} />
				<rect x={868} y={458} width={156} height={214} rx={10} fill={mixC('#3a0b10', '#ff5a5a', bA * 0.85)} stroke={INK} strokeWidth={4} />
				{[0, 1, 2, 3, 4].map((i) => {
					const yy = 470 + wrap(i * 44 + t * 260, 200);
					return <line key={i} x1={876} y1={yy} x2={1016} y2={yy} stroke="#ff3a3a" strokeWidth={3} opacity={0.35 + 0.4 * idle} />;
				})}
				<circle cx={1018} cy={440} r={10} fill={lit ? '#5dff7a' : '#24412b'} stroke={INK} strokeWidth={3} />
				{/* counter front + drawer */}
				<rect x={-60} y={front + 22} width={1180} height={480} fill="#e8e3d8" stroke={INK} strokeWidth={5} />
				<rect x={-60} y={1460} width={1180} height={40} fill="#9aa3ad" stroke={INK} strokeWidth={4} />
				{[200, 480].map((sx) => <line key={sx} x1={sx} y1={front + 30} x2={sx} y2={1456} stroke="#cfc8ba" strokeWidth={4} />)}
				{/* impulse rack on the counter front: plain boxes, no text */}
				{[0, 1, 2].map((r) =>
					Array.from({length: 6}, (_, j) => {
						const hh = 64 + 24 * h1(r * 7.1 + j * 2.3);
						const by = 1186 + r * 110;
						return (
							<g key={`ir${r}_${j}`}>
								<rect x={78 + j * 60} y={by - hh} width={50} height={hh} rx={5} fill={pick(PRODUCT, h1(r * 3.3 + j * 5.9))} stroke={INK} strokeWidth={3} />
								<rect x={78 + j * 60} y={by - hh * 0.62} width={50} height={hh * 0.22} fill="#ffffff" opacity={0.5} />
							</g>
						);
					}),
				)}
				<rect x={60} y={1080} width={380} height={340} rx={10} fill="none" stroke={INK} strokeWidth={12} />
				<rect x={60} y={1080} width={380} height={340} rx={10} fill="none" stroke="#c9d0d7" strokeWidth={6} />
				{[1190, 1300].map((ry) => (
					<g key={ry}>
						<line x1={60} y1={ry} x2={440} y2={ry} stroke={INK} strokeWidth={12} />
						<line x1={60} y1={ry} x2={440} y2={ry} stroke="#c9d0d7" strokeWidth={6} />
					</g>
				))}
				<rect x={0} y={1500} width={1080} height={420} fill="#cdbfa6" />
				{/* the cash drawer (tillX shifts it along the counter front, px) */}
				<g transform={`translate(${tillX} 0)`}>
				{tk > 0.01 ? (
					<g transform={`translate(0 ${tj})`}>
						<polygon points={pts([[786, 1050], [1074, 1050], [1080 + 14 * tk, 1050 + 74 * tk], [780 - 14 * tk, 1050 + 74 * tk]])} fill="#59616c" stroke={INK} strokeWidth={4} />
						{[0, 1, 2, 3, 4].map((i) => {
							const bx = lerp(800, 1040, i / 4);
							return i < 3 ? (
								<rect key={i} x={bx - 18} y={1056} width={40} height={60 * tk} rx={4} fill="#7fae7a" stroke={INK} strokeWidth={3} />
							) : (
								<g key={i}>
									<ellipse cx={bx} cy={1062 + 30 * tk} rx={18} ry={9 * tk + 1} fill={PAL.gold} stroke={INK} strokeWidth={3} />
									<ellipse cx={bx + 10} cy={1070 + 34 * tk} rx={14} ry={7 * tk + 1} fill="#d9d4c7" stroke={INK} strokeWidth={3} />
								</g>
							);
						})}
					</g>
				) : null}
				<g transform={`translate(${930 - 6 * tk} ${1100 + 74 * tk + tj}) scale(${1 + 0.05 * tk}) translate(-930 -1100)`}>
					<rect x={786} y={1050} width={288} height={100} rx={8} fill="#cfd5db" stroke={INK} strokeWidth={6} />
					<rect x={880} y={1084} width={100} height={20} rx={10} fill="#5d656e" stroke={INK} strokeWidth={4} />
				</g>
				</g>
			</Svg>
			{children}
			{/* laser + beep flash over the items */}
			<div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
				<Svg>
					<defs>
						<radialGradient id={`${sid}q`} cx="50%" cy="50%" r="50%">
							<stop offset="0" stopColor="#ff4040" stopOpacity={0.9} />
							<stop offset="1" stopColor="#ff4040" stopOpacity={0} />
						</radialGradient>
					</defs>
					{sweeping ? (
						<g>
							<polygon points={pts([[870, 520], [870, 640], [xL, 1000], [xL, 470]])} fill="#ff2a2a" opacity={0.2} />
							<line x1={xL} y1={460} x2={xL} y2={1010} stroke="#ff2a2a" strokeWidth={40} opacity={0.3} strokeLinecap="round" />
							<line x1={xL} y1={460} x2={xL} y2={1010} stroke="#ff1f1f" strokeWidth={12} strokeLinecap="round" />
							<line x1={xL} y1={460} x2={xL} y2={1010} stroke="#ffe0e0" strokeWidth={3} strokeLinecap="round" />
						</g>
					) : null}
					{bA > 0 ? <ellipse cx={946} cy={565} rx={180 + 120 * (1 - bA)} ry={200 + 120 * (1 - bA)} fill={`url(#${sid}q)`} opacity={bA} /> : null}
				</Svg>
			</div>
		</Full>
	);
};

// ===================================================================================================== SHACK (on the run)
/** a grass clump: three blades fanning out of one filled base (parallel strokes read as «!!!» to OCR — never use those) */
const TUFT = 'M-22,2 C-26,-14 -36,-30 -48,-40 C-28,-36 -16,-24 -9,-12 C-10,-30 -4,-48 4,-62 C11,-46 12,-28 10,-12 C18,-26 30,-35 46,-38 C32,-26 26,-12 24,2 Z';
const qb = (a: P2, c: P2, b: P2, u: number): P2 => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];

/** a palm tree (SVG group): trunk foot (x, y), crown h above; trunk and fronds sway with t */
export const PalmG: React.FC<{x: number; y: number; h?: number; lean?: number; t: number; trunk?: string; trunkD?: string; leaf?: string; leafD?: string; seed?: number}> = ({
	x, y, h = 860, lean = -80, t, trunk = '#9b6b42', trunkD = '#7a5233', leaf = '#3f9a3e', leafD = '#2c7a30', seed = 1,
}) => {
	const sw = Math.sin(t * 1.3 + seed) * 9;
	const A: P2 = [x, y], Cc: P2 = [x + 70, y - h * 0.5], Bc: P2 = [x + lean + sw, y - h];
	const N = 11;
	const segs = Array.from({length: N}, (_, i) => {
		const a = qb(A, Cc, Bc, i / N), b = qb(A, Cc, Bc, (i + 1) / N);
		const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
		const nx = -dy / l, ny = dx / l;
		const w0 = lerp(48, 24, i / N) / 2, w1 = lerp(48, 24, (i + 1) / N) / 2;
		return <polygon key={i} points={pts([[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0]])} fill={i % 2 ? trunk : trunkD} stroke={INK} strokeWidth={4} strokeLinejoin="round" />;
	});
	const fronds = [-176, -146, -116, -82, -48, -16, 14].map((base, i) => {
		const a = rad(base + Math.sin(t * 1.8 + i * 0.9 + seed) * 4);
		const L = 330 * (0.85 + 0.3 * h1(seed + i * 1.7));
		const tip: P2 = [Bc[0] + Math.cos(a) * L, Bc[1] + Math.sin(a) * L + L * 0.42];
		const ctl: P2 = [Bc[0] + Math.cos(a) * L * 0.55, Bc[1] + Math.sin(a) * L * 0.55 - 40];
		const px = -Math.sin(a) * 46, py = Math.cos(a) * 46;
		const notches = [1, 2, 3, 4, 5].map((j) => {
			const p = qb(Bc, ctl, tip, j / 6.2);
			return <path key={j} d={`M${p[0].toFixed(1)},${p[1].toFixed(1)} l${(px * 0.55).toFixed(1)},${(py * 0.55 + 10).toFixed(1)} M${p[0].toFixed(1)},${p[1].toFixed(1)} l${(-px * 0.55).toFixed(1)},${(-py * 0.55 + 10).toFixed(1)}`} stroke={leafD} strokeWidth={4} strokeLinecap="round" />;
		});
		return (
			<g key={i}>
				<path d={`M${Bc[0]},${Bc[1]} Q${ctl[0] + px},${ctl[1] + py} ${tip[0]},${tip[1]} Q${ctl[0] - px},${ctl[1] - py} ${Bc[0]},${Bc[1]} Z`} fill={leaf} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<path d={`M${Bc[0]},${Bc[1]} Q${ctl[0]},${ctl[1]} ${tip[0]},${tip[1]}`} stroke={leafD} strokeWidth={5} fill="none" />
				{notches}
			</g>
		);
	});
	return (
		<g>
			{segs}
			{fronds}
			{[[-14, 18], [12, 22], [0, 36]].map(([cx, cy], i) => <circle key={i} cx={Bc[0] + cx} cy={Bc[1] + cy} r={16} fill="#6b4a2c" stroke={INK} strokeWidth={4} />)}
		</g>
	);
};

/**
 * Tin-roof shack on an island, full frame: sky (sun / moon + stars), ocean with moving waves (ocean false → a wall of trees
 * instead: no coastline), sand, jungle, the plank shack on stilts with a corrugated tin roof (rust patches), a window whose
 * curtain sways (sway 0..1) and glows at night (glow, default = night), a palm whose fronds move (palm false → a plain leafy tree). night 0..1 day → night,
 * rain 0..1 = streaks over the frame + splashes on the tin + drips off the roof edge. cam = parallax pan px.
 * Layout: SHACK (horizon y 660, ground 1130, window and door boxes inside the safe zone).
 */
/** a plain broadleaf tree (SVG group, no palm, no fruit): trunk foot (x, y), crown centre h above; the crown sways with t */
export const LeafyTreeG: React.FC<{x: number; y: number; h?: number; t: number; trunk?: string; trunkD?: string; leaf?: string; leafD?: string; seed?: number}> = ({
	x, y, h = 760, t, trunk = '#9b6b42', trunkD = '#7a5233', leaf = '#2f7d3c', leafD = '#1f5f2c', seed = 1,
}) => {
	const sw = Math.sin(t * 1.3 + seed) * 8 + Math.sin(t * 3.1 + seed * 2) * 2;
	const cx = x - 30 + sw, cy = y - h;
	const lobes: [number, number, number][] = [[-170, 70, 150], [160, 60, 150], [-80, -60, 170], [90, -70, 165], [0, 90, 190], [-10, -150, 140]];
	return (
		<g>
			{/* trunk + two limbs into the crown */}
			<path d={`M${x - 36},${y} C${x - 30},${y - h * 0.45} ${cx - 30},${cy + 260} ${cx - 18},${cy + 80} L${cx + 22},${cy + 80} C${cx + 30},${cy + 260} ${x + 32},${y - h * 0.45} ${x + 38},${y} Z`} fill={trunk} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
			<path d={`M${cx - 6},${cy + 200} Q${cx - 70},${cy + 140} ${cx - 120},${cy + 70}`} stroke={trunkD} strokeWidth={20} fill="none" strokeLinecap="round" />
			<path d={`M${cx + 8},${cy + 170} Q${cx + 70},${cy + 120} ${cx + 110},${cy + 60}`} stroke={trunkD} strokeWidth={18} fill="none" strokeLinecap="round" />
			<path d={`M${x - 10},${y - 40} L${x - 6},${y - h * 0.4}`} stroke={trunkD} strokeWidth={6} strokeLinecap="round" />
			{lobes.map(([dx, dy, r], i) => {
				const wob = Math.sin(t * 1.9 + i * 1.3 + seed) * 4;
				return <path key={i} d={lobePath(cx + dx * 1.0 + wob, cy + dy, r, seed * 5 + i + 11, 8, 0.82)} fill={i % 2 ? leafD : leaf} stroke={INK} strokeWidth={4} />;
			})}
		</g>
	);
};

export const SHACK = {horizon: 610, ground: 1130, window: {x: 314, y: 844, w: 178, h: 140}, door: {x: 612, y: 836, w: 122, h: 222}, roof: {x0: 168, x1: 872, y0: 660, y1: 774}} as const;
export const Shack: React.FC<{t: number; night?: number; rain?: number; ocean?: boolean; palm?: boolean; sway?: number; glow?: number; cam?: number} & Tone> = ({
	t, night = 0, rain = 0, ocean = true, palm = true, sway = 1, glow, cam = 0, ...tone
}) => {
	const sid = useSid('sh');
	const n = clamp01(night), rn = clamp01(rain);
	const ov = rn * (1 - n) * 0.5;
	const C = (d: string, nn: string) => mixC(mixC(d, '#8e98a3', ov), nn, n);
	const wg = clamp01(glow ?? n);
	const HZ = 850, GY = 1370;
	const skyT = C('#4fa8e6', '#08152b'), skyB = C('#ffe3b0', '#1e3a63');
	const sea = C('#2b8fc2', '#0f2947'), seaL = C('#8fd7f7', '#3a6a9a'), sand = C('#efd59a', '#4b4a57');
	const grass = C('#62a446', '#1c3530'), grassD = C('#4f8f37', '#142824'), jungle = C('#2f7d3c', '#0f241d'), jungleD = C('#1f5f2c', '#0a1914');
	const wood = C('#9b6b42', '#3a2d31'), woodD = C('#7a5233', '#2b2126'), tin = C('#b4bec7', '#4b5667'), tinD = C('#86929d', '#323b4a'), rust = C('#b8662d', '#4a3330');
	const curtain = mixC(C('#d0563a', '#6a3434'), '#ffb070', wg * 0.55), curtainD = mixC(curtain, '#000000', 0.22);
	const dx = (Math.sin(t * 2.4) * 12 + Math.sin(t * 5.3 + 1) * 4) * sway;
	const R: P2[] = [[190, 900], [850, 900], [872, 1014], [168, 1014]];
	const NR = 28;
	const pc = cam * 0.15;
	return (
		<Full bg={skyB} {...tone}>
			<div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${skyT} 0%, ${skyB} 35%)`}} />
			<Svg>
				<defs>
					<radialGradient id={`${sid}g`} cx="50%" cy="55%" r="65%">
						<stop offset="0" stopColor="#fff4c8" />
						<stop offset="1" stopColor="#ffa743" />
					</radialGradient>
					<clipPath id={`${sid}r`}>
						<polygon points={pts(R)} />
					</clipPath>
					<clipPath id={`${sid}m`}>
						<circle cx={250 - pc} cy={280} r={66} />
					</clipPath>
				</defs>
				{/* sun / moon + stars */}
				<g opacity={(1 - n) * (1 - ov * 1.6)}>
					<circle cx={250 - pc} cy={300} r={140} fill="#ffd75a" opacity={0.25} />
					<circle cx={250 - pc} cy={300} r={88} fill="#ffd75a" stroke={INK} strokeWidth={5} />
				</g>
				<g opacity={n}>
					{Array.from({length: 48}, (_, i) => (
						<circle key={i} cx={h1(i * 3.7) * 1080} cy={h1(i * 5.9) * 620} r={2 + 2.5 * h1(i * 2.1)} fill="#fff8dc" opacity={0.35 + 0.65 * Math.abs(Math.sin(t * (1.5 + h1(i)) + i))} />
					))}
					<circle cx={250 - pc} cy={280} r={66} fill="#f3f0dc" stroke={INK} strokeWidth={5} />
					<g clipPath={`url(#${sid}m)`}>
						<circle cx={278 - pc} cy={262} r={58} fill="#16284a" opacity={0.92} />
					</g>
				</g>
				{[0, 1, 2].map((i) => {
					const cx = wrap(i * 470 + t * 14 - cam * 0.05, 1600) - 260;
					return <path key={i} d={lobePath(cx, 230 + i * 110, 70 + i * 14 + rn * 30, i + 3, 8, 0.5)} fill={mixC(C('#ffffff', '#2c4466'), '#6f7b88', rn * 0.6)} stroke={INK} strokeWidth={4} strokeOpacity={0.5} />;
				})}
				<g transform="translate(0 -240)">
				{/* ocean (or a tree wall) */}
				{ocean ? (
					<g>
						<rect x={0} y={HZ} width={1080} height={230} fill={sea} />
						<line x1={0} y1={HZ} x2={1080} y2={HZ} stroke={INK} strokeWidth={4} />
						{[0, 1, 2, 3, 4, 5, 6].map((r) => {
							const yy = HZ + 18 + r * 28;
							const sp = 110;
							const off = wrap(t * 16 * (1 + r * 0.4) + r * 37 + cam * 0.2, sp);
							return (
								<g key={r}>
									{Array.from({length: 12}, (_, k) => {
										const wx = k * sp - off;
										return <path key={k} d={`M${wx.toFixed(1)},${yy} q24,-10 48,0`} stroke={seaL} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.75} />;
									})}
								</g>
							);
						})}
						{[0, 1, 2, 3, 4].map((i) => (
							<path key={i} d={`M${260 + (h1(i) - 0.5) * 120 - pc},${HZ + 14 + i * 22} l10,-6 l10,6 l-10,6 Z`} fill="#fffbe8" opacity={(1 - ov) * (0.4 + 0.6 * Math.abs(Math.sin(t * 4 + i * 1.3)))} />
						))}
					</g>
				) : (
					Array.from({length: 10}, (_, i) => <path key={i} d={lobePath(i * 120 - 30 - pc, HZ + 60 + h1(i) * 30, 110, i + 21, 7, 0.75)} fill={jungleD} stroke={INK} strokeWidth={4} />)
				)}
				{/* far jungle + sand + ground */}
				{Array.from({length: 9}, (_, i) => <path key={`j${i}`} d={lobePath(i * 140 - 40 - pc * 1.4, 1040 + h1(i) * 30, 80 + h1(i * 3) * 30, i + 3, 7, 0.8)} fill={jungleD} stroke={INK} strokeWidth={4} />)}
				{ocean ? <path d="M0,1070 Q270,1048 540,1074 T1080,1062 L1080,1210 L0,1210 Z" fill={sand} stroke={INK} strokeWidth={4} /> : null}
				<rect x={0} y={1196} width={1080} height={1000} fill={grass} />
				<path d="M0,1196 Q270,1180 540,1200 T1080,1192" fill="none" stroke={INK} strokeWidth={4} />
				<polygon points={pts([[640, GY], [724, GY], [900, 2200], [440, 2200]])} fill={C('#c9a46a', '#3a3334')} />
				{[[60, 1170, 110], [180, 1200, 90], [1010, 1180, 120]].map(([bx, by, br], i) => <path key={`b${i}`} d={lobePath(bx - pc * 2, by, br, i + 40, 7, 0.75)} fill={jungle} stroke={INK} strokeWidth={5} />)}
				{/* night light from the window on the ground */}
				<polygon points={pts([[300, GY], [510, GY], [580, 1560], [240, 1560]])} fill="#ffcf6a" opacity={0.22 * wg} />
				{/* shack */}
				{[262, 520, 778].map((sx) => <rect key={sx} x={sx - 11} y={1318} width={22} height={GY - 1318} fill={woodD} stroke={INK} strokeWidth={4} />)}
				<rect x={222} y={1296} width={596} height={26} fill={woodD} stroke={INK} strokeWidth={5} />
				{Array.from({length: 13}, (_, i) => (
					<rect key={i} x={240 + i * 43.1} y={1010} width={43.1} height={288} fill={mixC(wood, woodD, h1(i * 2.7) * 0.7)} stroke={INK} strokeWidth={3} />
				))}
				<rect x={240} y={1010} width={560} height={288} fill="none" stroke={INK} strokeWidth={6} />
				<rect x={296} y={1066} width={214} height={176} fill={woodD} stroke={INK} strokeWidth={5} />
				<rect x={314} y={1084} width={178} height={140} fill="#2a1d1a" />
				<rect x={314} y={1084} width={178} height={140} fill={`url(#${sid}g)`} opacity={wg} />
				<line x1={306} y1={1090} x2={500} y2={1090} stroke={INK} strokeWidth={6} strokeLinecap="round" />
				<path d={`M314,1092 L392,1092 Q${392 + dx * 0.3},1160 ${396 + dx},1222 Q${372 + dx},1232 ${352 + dx * 0.8},1224 Q${332 + dx * 0.6},1232 ${314 + dx * 0.4},1226 Z`} fill={curtain} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<path d={`M492,1092 L414,1092 Q${414 + dx * 0.3},1160 ${410 + dx},1222 Q${434 + dx},1232 ${454 + dx * 0.8},1224 Q${474 + dx * 0.6},1232 ${492 + dx * 0.4},1226 Z`} fill={curtain} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				{[340, 366, 440, 466].map((fx, i) => <path key={fx} d={`M${fx},1096 Q${fx + dx * 0.2},1160 ${fx + dx * (i < 2 ? 0.7 : 0.75)},1220`} stroke={curtainD} strokeWidth={4} fill="none" />)}
				<rect x={612} y={1076} width={122} height={222} fill={woodD} stroke={INK} strokeWidth={5} />
				{[642, 672, 702].map((lx) => <line key={lx} x1={lx} y1={1080} x2={lx} y2={1294} stroke={INK} strokeWidth={3} opacity={0.6} />)}
				<circle cx={720} cy={1190} r={7} fill={PAL.gold} stroke={INK} strokeWidth={3} />
				<rect x={632} y={1322} width={84} height={22} fill={wood} stroke={INK} strokeWidth={4} />
				<rect x={622} y={1346} width={104} height={24} fill={wood} stroke={INK} strokeWidth={4} />
				{/* corrugated tin roof */}
				{Array.from({length: NR}, (_, i) => {
					const u0 = i / NR, u1 = (i + 1) / NR;
					return <polygon key={i} points={pts([[lerp(190, 850, u0), 900], [lerp(190, 850, u1), 900], [lerp(168, 872, u1), 1014], [lerp(168, 872, u0), 1014]])} fill={i % 2 ? tin : tinD} />;
				})}
				<g clipPath={`url(#${sid}r)`}>
					<path d={lobePath(320, 960, 44, 3, 7, 0.6)} fill={rust} opacity={0.85} />
					<path d={lobePath(700, 930, 32, 5, 6, 0.6)} fill={rust} opacity={0.8} />
					<path d={lobePath(560, 996, 26, 8, 6, 0.6)} fill={rust} opacity={0.75} />
				</g>
				<polygon points={pts(R)} fill="none" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<rect x={164} y={1010} width={712} height={14} rx={4} fill={tinD} stroke={INK} strokeWidth={4} />
				{/* rain splashes on the tin + drips */}
				{rn > 0.01
					? Array.from({length: 16}, (_, i) => {
							const ph = wrap(t * 2.2 + h1(i * 1.9), 1);
							const cyc = Math.floor(t * 2.2 + h1(i * 1.9));
							const u = h1(i * 3.1 + cyc * 0.77), v = h1(i * 5.3 + cyc * 1.31);
							const sx = lerp(lerp(190, 850, u), lerp(168, 872, u), v), sy = lerp(900, 1014, v);
							const k = clamp01(ph / 0.35);
							return ph < 0.35 ? <path key={`s${i}`} d={`M${sx - 14 * k},${sy - 10 * k} L${sx},${sy} L${sx + 14 * k},${sy - 10 * k}`} stroke="#e8f2fb" strokeWidth={3} fill="none" opacity={rn * (1 - k)} strokeLinecap="round" /> : null;
						})
					: null}
				{rn > 0.01
					? Array.from({length: 9}, (_, i) => {
							const dxp = lerp(180, 860, h1(i * 3.7));
							const ph = wrap(t * 1.3 + h1(i), 1);
							const yy = 1026 + ph * ph * 380;
							return <path key={`d${i}`} d={`M${dxp},${yy - 14} Q${dxp + 7},${yy + 4} ${dxp},${yy + 8} Q${dxp - 7},${yy + 4} ${dxp},${yy - 14} Z`} fill="#d8ecfb" stroke={INK} strokeWidth={2} opacity={rn} />;
						})
					: null}
				{/* palm (or, palm false, a plain leafy tree like the woods behind: no «tropical island» hint) + tufts */}
				{palm ? (
					<PalmG x={930 + pc * -2.2} y={1450} h={890} lean={-90} t={t} trunk={wood} trunkD={woodD} leaf={C('#3f9a3e', '#16362a')} leafD={C('#2c7a30', '#0f261d')} />
				) : (
					<LeafyTreeG x={950 + pc * -2.2} y={1450} h={760} t={t} trunk={wood} trunkD={woodD} leaf={jungle} leafD={jungleD} />
				)}
				</g>
				{Array.from({length: 16}, (_, i) => {
					const ty = 1260 + h1(i * 7.3) * 620;
					const tx = wrap(h1(i * 3.9) * 1180 - cam * 0.9, 1180) - 50;
					const sc = 0.8 + (ty - 1260) / 520;
					return <path key={`t${i}`} d={TUFT} transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${sc.toFixed(2)}) rotate(${(Math.sin(t * 2 + i) * 4).toFixed(1)})`} fill={grassD} />;
				})}
				{/* rain streaks */}
				{rn > 0.01
					? Array.from({length: 110}, (_, i) => {
							const rx = wrap(h1(i * 1.3) * 1300 - t * 260, 1300) - 110;
							const ry = wrap(h1(i * 7.1) * 2200 + t * 2400 * (0.8 + 0.4 * h1(i)), 2200) - 140;
							return <line key={`r${i}`} x1={rx} y1={ry} x2={rx - 14} y2={ry + 74} stroke={C('#dbe9f6', '#8aa4c4')} strokeWidth={3} strokeLinecap="round" opacity={0.55 * rn} />;
						})
					: null}
			</Svg>
		</Full>
	);
};

/**
 * Inside the shack, full frame: dim plank wall, a bright window (sky, sun, swaying fronds), a curtain on a rod. open 1 =
 * pulled aside to the left (a little hand of kit A can hold its free edge at curtainEdge(open)), 0 = fallen shut — only a
 * thin strip of light stays. The sunbeam and the light patch on the floor narrow with it; dust motes float in the beam.
 */
export const curtainEdge = (open: number) => ({x: lerp(840, 302, clamp01(open)), y: 700});
export const CurtainWindow: React.FC<{t: number; open?: number; sway?: number} & Tone> = ({t, open = 1, sway = 1, ...tone}) => {
	const sid = useSid('cw');
	const WX0 = 230, WX1 = 850, WY0 = 380, WY1 = 1000;
	const xr = curtainEdge(open).x;
	const gapW = WX1 - xr;
	const dx = (Math.sin(t * 2.2) * 10 + Math.sin(t * 4.7 + 1) * 4) * sway;
	const beam: P2[] = [[xr, WY0], [WX1, WY0], [WX1 - 60 + (WX1 - xr) * 0.25, 1840], [xr - 230, 1840]];
	const patch: P2[] = [[xr - 120, 1430], [WX1 - 20 + (WX1 - xr) * 0.1, 1430], [WX1 - 60 + (WX1 - xr) * 0.25, 1840], [xr - 230, 1840]];
	const NB = 9;
	const cx0 = WX0 - 34;
	const bandX = (i: number) => lerp(cx0, xr, i / NB);
	const yb = (x: number) => WY1 + 44 + Math.sin(x * 0.05 + t * 2) * 6;
	const cur = '#d0563a', curD = '#a7402b';
	const lightK = clamp01(gapW / 120);
	return (
		<Full bg="#3d3029" {...tone}>
			<Svg>
				<defs>
					<linearGradient id={`${sid}s`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#9fd6ff" />
						<stop offset="1" stopColor="#fff1c8" />
					</linearGradient>
					<radialGradient id={`${sid}v`} cx="50%" cy="45%" r="75%">
						<stop offset="0.55" stopColor="#000" stopOpacity={0} />
						<stop offset="1" stopColor="#000" stopOpacity={0.55} />
					</radialGradient>
					<clipPath id={`${sid}w`}>
						<rect x={WX0} y={WY0} width={WX1 - WX0} height={WY1 - WY0} />
					</clipPath>
				</defs>
				{Array.from({length: 13}, (_, i) => <rect key={i} x={i * 90 - 30} y={0} width={90} height={1380} fill={mixC('#4e3c31', '#3a2c24', h1(i * 3.3))} stroke={INK} strokeWidth={3} />)}
				<rect x={0} y={1380} width={1080} height={540} fill="#5a4535" />
				{Array.from({length: 9}, (_, i) => <line key={i} x1={i * 150 - 60} y1={1380} x2={540 + (i * 150 - 60 - 540) * 2.2} y2={1920} stroke={INK} strokeWidth={3} opacity={0.5} />)}
				<rect x={0} y={1366} width={1080} height={20} fill="#2c211b" stroke={INK} strokeWidth={4} />
				{/* the window */}
				<rect x={WX0 - 26} y={WY0 - 26} width={WX1 - WX0 + 52} height={WY1 - WY0 + 52} fill="#2a1f19" stroke={INK} strokeWidth={6} />
				<g clipPath={`url(#${sid}w)`}>
				<rect x={WX0} y={WY0} width={WX1 - WX0} height={WY1 - WY0} fill={`url(#${sid}s)`} />
				<circle cx={740} cy={500} r={120} fill="#fffbe0" opacity={0.5} />
				<circle cx={740} cy={500} r={64} fill="#fff8d0" />
				{[0, 1, 2].map((i) => {
					const a = rad(-20 + i * 28 + Math.sin(t * 1.6 + i) * 5);
					const bx = 230 + i * 30, by = 380;
					const L = 330;
					const tip: P2 = [bx + Math.cos(a) * L, by + Math.sin(a) * L + 120];
					return <path key={i} d={`M${bx},${by} Q${bx + Math.cos(a) * L * 0.5 + 30},${by + Math.sin(a) * L * 0.5 - 30} ${tip[0]},${tip[1]} Q${bx + Math.cos(a) * L * 0.5 - 20},${by + Math.sin(a) * L * 0.5 + 40} ${bx},${by} Z`} fill="#2f7d3c" stroke={INK} strokeWidth={4} />;
				})}
				{[[300, 990, 90], [470, 1000, 110], [700, 995, 100]].map(([bx, by, br], i) => <path key={i} d={lobePath(bx, by, br, i + 7, 7, 0.7)} fill="#3f9a3e" stroke={INK} strokeWidth={4} />)}
				</g>
				<rect x={WX0} y={WY0} width={WX1 - WX0} height={WY1 - WY0} fill="none" stroke={INK} strokeWidth={5} />
				<rect x={WX0 - 26} y={WY1} width={WX1 - WX0 + 52} height={30} fill="#2a1f19" stroke={INK} strokeWidth={5} />
				{/* curtain rod + curtain */}
				<line x1={WX0 - 70} y1={WY0 - 44} x2={WX1 + 70} y2={WY0 - 44} stroke={INK} strokeWidth={12} strokeLinecap="round" />
				<line x1={WX0 - 70} y1={WY0 - 44} x2={WX1 + 70} y2={WY0 - 44} stroke="#8a6a4a" strokeWidth={5} strokeLinecap="round" />
				{[WX0 - 76, WX1 + 76].map((fx) => <circle key={fx} cx={fx} cy={WY0 - 44} r={14} fill="#8a6a4a" stroke={INK} strokeWidth={4} />)}
				{Array.from({length: NB}, (_, i) => {
					const a = bandX(i), b = bandX(i + 1);
					const ba = a + dx * (i / NB), bb = b + dx * ((i + 1) / NB);
					return <polygon key={i} points={pts([[a, WY0 - 44], [b, WY0 - 44], [bb, yb(bb)], [ba, yb(ba)]])} fill={i % 2 ? cur : curD} />;
				})}
				<path
					d={`M${cx0},${WY0 - 44} L${xr},${WY0 - 44} L${xr + dx},${yb(xr + dx)} ${Array.from({length: 12}, (_, k) => {
						const xx = lerp(xr + dx, cx0, (k + 1) / 12);
						return `L${xx.toFixed(1)},${yb(xx).toFixed(1)}`;
					}).join(' ')} Z`}
					fill="none"
					stroke={INK}
					strokeWidth={5}
					strokeLinejoin="round"
				/>
				{Array.from({length: 4}, (_, i) => <circle key={i} cx={lerp(cx0 + 10, xr - 10, i / 3)} cy={WY0 - 44} r={9} fill="#8a6a4a" stroke={INK} strokeWidth={3} />)}
				<rect x={0} y={0} width={1080} height={1920} fill={`url(#${sid}v)`} />
			</Svg>
			{/* sunbeam (screen) */}
			<div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', pointerEvents: 'none', opacity: lightK}}>
				<Svg>
					<polygon points={pts(beam)} fill="#fff1c0" opacity={0.18} />
					<polygon points={pts(patch)} fill="#ffe7a0" opacity={0.42} />
					{Array.from({length: 16}, (_, i) => {
						const u = wrap(h1(i * 1.7) + t * 0.04 * (0.5 + h1(i)), 1), v = h1(i * 3.3);
						const top = lerp(beam[0][0], beam[1][0], v), bot = lerp(beam[3][0], beam[2][0], v);
						const mx = lerp(top, bot, u) + Math.sin(t * 1.3 + i) * 8, my = lerp(WY0, 1820, u);
						return <circle key={i} cx={mx} cy={my} r={2.5 + 2.5 * h1(i * 5.1)} fill="#fff8dc" opacity={0.5 + 0.5 * Math.sin(t * 3 + i)} />;
					})}
				</Svg>
			</div>
		</Full>
	);
};

// ===================================================================================================== OCEAN + PLANE
/**
 * Open ocean from the air, full frame: sky with sun and three layers of clouds, the sea with crest rows in perspective.
 * Everything drifts left at speed px/s (the camera flies right). No coastline, no islands.
 */
export const OceanSky: React.FC<{t: number; speed?: number; horizon?: number} & Tone> = ({t, speed = 160, horizon = 1150, ...tone}) => {
	const sid = useSid('os');
	return (
		<Full bg="#bfe4fb" {...tone}>
			<div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, #3f9ee0 0%, #bfe4fb ${((horizon / 1920) * 100).toFixed(1)}%)`}} />
			<Svg>
				<defs>
					<linearGradient id={`${sid}o`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#3a9bcc" />
						<stop offset="1" stopColor="#134d78" />
					</linearGradient>
				</defs>
				<circle cx={820} cy={430} r={150} fill="#fff4c0" opacity={0.35} />
				<circle cx={820} cy={430} r={80} fill="#ffe27a" stroke={INK} strokeWidth={5} />
				{[0, 1, 2].map((l) =>
					[0, 1, 2].map((i) => {
						const par = 0.3 + 0.35 * l;
						const cx = wrap(i * 560 + 200 * l - t * speed * par, 1700) - 300;
						return <path key={`${l}${i}`} d={lobePath(cx, 250 + l * 250 + h1(i + l * 3) * 60, 70 + l * 34, i + l * 5 + 1, 8, 0.48)} fill="#ffffff" stroke={INK} strokeWidth={4} strokeOpacity={0.55} />;
					}),
				)}
				<rect x={0} y={horizon} width={1080} height={1920 - horizon} fill={`url(#${sid}o)`} />
				<line x1={0} y1={horizon} x2={1080} y2={horizon} stroke={INK} strokeWidth={4} />
				{Array.from({length: 14}, (_, r) => {
					const yy = horizon + 18 + 14 * r + 4.2 * r * r;
					if (yy > 1940) return null;
					const sp = 60 + 22 * r, aw = 20 + 9 * r;
					const off = wrap(t * speed * (0.3 + 0.12 * r) + r * 53, sp);
					return (
						<g key={r}>
							{Array.from({length: Math.ceil(1180 / sp) + 1}, (_, k) => {
								const wx = k * sp - off - 40 + (r % 2) * sp * 0.5;
								return <path key={k} d={`M${wx.toFixed(1)},${yy.toFixed(1)} q${aw / 2},${-aw * 0.28} ${aw},0`} stroke="#a6def6" strokeWidth={2 + r * 0.5} fill="none" strokeLinecap="round" opacity={0.8} />;
							})}
						</g>
					);
				})}
				{Array.from({length: 8}, (_, i) => (
					<path key={i} d={`M${820 + (h1(i * 2.1) - 0.5) * 260},${horizon + 20 + h1(i * 4.3) * 200} l12,-7 l12,7 l-12,7 Z`} fill="#fffbe8" opacity={0.3 + 0.7 * Math.abs(Math.sin(t * 5 + i * 1.7))} />
				))}
			</Svg>
		</Full>
	);
};

/**
 * Small single-prop high-wing plane, side view facing right, no registration letters; (x, y) = fuselage centre, ~700 px
 * long at s 1. The propeller spins (disc + blade), the plane bobs; bank = roll/pitch deg.
 */
export const SmallPlane: React.FC<{x: number; y: number; s?: number; t: number; bank?: number; flip?: boolean; color?: string}> = ({x, y, s = 1, t, bank = 0, flip, color = PAL.orange}) => {
	const sid = useSid('pl');
	const bob = Math.sin(t * 2.1) * 6;
	const blade = Math.abs(Math.cos(t * 37));
	const body = 'M300,-46 Q336,-30 334,0 Q330,30 296,40 L-80,38 Q-220,30 -330,6 L-336,-12 Q-220,-40 -60,-56 Z';
	return (
		<Fig x={x} y={y} s={s} vb={[-400, -260, 800, 400]} flip={flip}>
			<defs>
				<clipPath id={`${sid}b`}>
					<path d={body} />
				</clipPath>
			</defs>
			<g transform={`translate(0 ${bob.toFixed(2)}) rotate(${bank})`}>
				<path d="M-250,-36 L-336,-44 L-338,-30 L-250,-24 Z" fill="#cfd5db" stroke={INK} strokeWidth={4} />
				<path d="M-250,-30 L-318,-150 L-276,-152 L-196,-44 Z" fill="#f4f4f4" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<path d="M-300,-118 L-318,-150 L-276,-152 L-258,-122 Z" fill={color} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				<path d={body} fill="#f4f4f4" />
				<g clipPath={`url(#${sid}b)`}>
					<rect x={-360} y={-2} width={720} height={18} fill={color} />
					<rect x={-360} y={22} width={720} height={30} fill="#dfe3e7" />
				</g>
				<path d={body} fill="none" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<path d="M120,-50 L210,-44 L250,-14 L120,-14 Z" fill="#2c4a6e" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<path d="M30,-52 L104,-50 L104,-14 L30,-14 Z" fill="#2c4a6e" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<path d="M140,-44 L170,-42 L150,-18 L128,-18 Z M44,-46 L64,-46 L52,-18 L36,-18 Z" fill="#ffffff" opacity={0.35} />
				<path d="M-200,2 L-340,0 L-344,16 L-200,18 Z" fill="#e2e6ea" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<rect x={-70} y={-88} width={300} height={26} rx={13} fill="#e8ecef" stroke={INK} strokeWidth={6} />
				<rect x={150} y={-88} width={80} height={26} rx={13} fill={color} stroke={INK} strokeWidth={5} />
				<line x1={20} y1={-64} x2={74} y2={30} stroke={INK} strokeWidth={9} strokeLinecap="round" />
				<line x1={20} y1={-64} x2={74} y2={30} stroke="#cfd5db" strokeWidth={4} strokeLinecap="round" />
				<line x1={84} y1={36} x2={64} y2={92} stroke={INK} strokeWidth={8} strokeLinecap="round" />
				<circle cx={62} cy={98} r={22} fill="#2a2a30" stroke={INK} strokeWidth={5} />
				<circle cx={62} cy={98} r={8} fill="#c9ccd2" />
				<line x1={262} y1={38} x2={272} y2={84} stroke={INK} strokeWidth={7} strokeLinecap="round" />
				<circle cx={272} cy={88} r={16} fill="#2a2a30" stroke={INK} strokeWidth={4} />
				<path d="M296,-46 Q336,-30 334,0 Q330,30 296,40 Z" fill="#9aa3ad" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<path d="M332,-18 Q372,0 332,18 Z" fill={color} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<ellipse cx={348} cy={0} rx={10} ry={122} fill="#dfe6ec" opacity={0.35} />
				<rect x={342} y={-120 * blade - 6} width={12} height={240 * blade + 12} rx={6} fill="#3b4149" stroke={INK} strokeWidth={3} />
			</g>
		</Fig>
	);
};

// ===================================================================================================== CAR WINDOW AT NIGHT
/**
 * A car's side window at night, full frame (from the back seat): road lights streak past right → left (speed 1 = fast),
 * dark trees and poles flick by; rain 0..1 = drops slide on the glass and the streaks smear. Car door + seal framing,
 * no dashboard, no text. The window opening is x 110–970, y 330–1090.
 */
export const RoadWindow: React.FC<{t: number; speed?: number; rain?: number} & Tone> = ({t, speed = 1, rain = 0, ...tone}) => {
	const rn = clamp01(rain);
	const WX0 = 110, WX1 = 970, WY0 = 330, WY1 = 1090;
	const LIGHT = ['#ffb347', '#ffe9a8', '#ff6a3d', '#fff4dc', '#ffd27a'];
	const hole = `M0,0 L1080,0 L1080,1920 L0,1920 Z M${WX0 + 60},${WY0} L${WX1 - 40},${WY0} Q${WX1},${WY0} ${WX1},${WY0 + 40} L${WX1},${WY1} L${WX0},${WY1} L${WX0},${WY0 + 120} Q${WX0},${WY0} ${WX0 + 60},${WY0} Z`;
	return (
		<Full bg="#0b1426" {...tone}>
			<Svg style={{filter: `blur(${(1.5 + rn * 5).toFixed(1)}px)`}}>
				<rect x={0} y={0} width={1080} height={1920} fill="#0b1426" />
				<rect x={0} y={780} width={1080} height={400} fill="#1d2b45" opacity={0.8} />
				{Array.from({length: 28}, (_, i) => {
					const yy = lerp(WY0 + 40, WY1 - 60, h1(i * 2.3));
					const L = 160 + 380 * h1(i * 5.1);
					const v = 2600 * speed * (0.6 + 0.8 * h1(i * 7.7));
					const sx = wrap(h1(i * 3.3) * 2800 - t * v, 2800) - 700;
					const hh = 8 + 10 * h1(i);
					const c = pick(LIGHT, h1(i * 9.1));
					return (
						<g key={i}>
							<rect x={sx - 30} y={yy - hh * 2} width={L + 60} height={hh * 4} rx={hh * 2} fill={c} opacity={0.3} />
							<rect x={sx} y={yy - hh / 2} width={L} height={hh} rx={hh / 2} fill={c} opacity={0.95} />
						</g>
					);
				})}
				{Array.from({length: 6}, (_, i) => {
					const px = wrap(h1(i * 4.7) * 2400 - t * 1800 * speed, 2400) - 300;
					return h1(i * 2.9) > 0.5 ? (
						<rect key={i} x={px} y={WY0 - 60} width={28} height={WY1 - WY0 + 120} fill="#05080f" />
					) : (
						<path key={i} d={lobePath(px, WY1 - 140, 170, i + 9, 8, 1.1)} fill="#060a12" />
					);
				})}
			</Svg>
			{rn > 0.01 ? (
				<Svg>
					{Array.from({length: 70}, (_, i) => {
						const span = WY1 - WY0;
						const yy = WY0 + wrap(h1(i * 3.1) * span + t * (40 + 110 * h1(i * 7.3)), span);
						const xx = WX0 + wrap(h1(i * 1.7) * (WX1 - WX0) - (yy - WY0) * 0.25, WX1 - WX0);
						const r = 5 + 7 * h1(i * 5.9);
						return (
							<g key={i} opacity={rn}>
								<line x1={xx + 10} y1={yy - 44} x2={xx} y2={yy} stroke="#cfe0ff" strokeWidth={r * 0.5} opacity={0.18} strokeLinecap="round" />
								<ellipse cx={xx} cy={yy} rx={r} ry={r * 1.25} fill="rgba(190,215,255,0.22)" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
								<circle cx={xx - r * 0.35} cy={yy - r * 0.4} r={r * 0.3} fill="#ffffff" opacity={0.7} />
							</g>
						);
					})}
				</Svg>
			) : null}
			<Svg>
				<polygon points={pts([[WX0 + 200, WY0], [WX0 + 320, WY0], [WX0 + 120, WY1], [WX0, WY1]])} fill="#ffffff" opacity={0.05} />
				<path d={hole} fill="#151a24" fillRule="evenodd" />
				<path d={hole} fill="none" stroke="#05070a" strokeWidth={30} fillRule="evenodd" />
				<path d={`M${WX0 + 60},${WY0} L${WX1 - 40},${WY0} Q${WX1},${WY0} ${WX1},${WY0 + 40} L${WX1},${WY1} L${WX0},${WY1} L${WX0},${WY0 + 120} Q${WX0},${WY0} ${WX0 + 60},${WY0} Z`} fill="none" stroke={INK} strokeWidth={6} />
				<rect x={40} y={WY1 + 40} width={1000} height={20} rx={10} fill="#2e3647" stroke={INK} strokeWidth={4} />
				<path d="M40,1560 Q540,1500 1040,1560" stroke="#262d3b" strokeWidth={10} fill="none" />
				<path d="M40,1200 L1040,1200 L1040,1880 L40,1880" stroke="#1c222e" strokeWidth={6} fill="none" />
				<rect x={120} y={1260} width={640} height={110} rx={50} fill="#2b3343" stroke={INK} strokeWidth={6} />
				<rect x={780} y={1180} width={170} height={56} rx={22} fill="#9aa3ad" stroke={INK} strokeWidth={5} />
				{Array.from({length: 24}, (_, i) => <circle key={i} cx={240 + (i % 8) * 34} cy={1520 + Math.floor(i / 8) * 34} r={9} fill="#0d1018" />)}
			</Svg>
		</Full>
	);
};

// ===================================================================================================== HOME: KITCHEN / LIVING
/** kitchen geometry (frame px): window rect (outside node is laid out in its own box), the fridge door slot where a cutout
 *  can be pinned with a magnet, the table top centre, floor line */
export const KITCHEN = {window: {x: 400, y: 380, w: 420, h: 440}, fridge: {x: 40, y: 360, w: 300, h: 940}, fridgeSlot: {x: 190, y: 760}, table: {x: 540, y: 1410}, floor: 1300} as const;
/** a wall clock without digits (SVG group): ticks only; the second hand jumps every second with a little spring */
const WallClockG: React.FC<{x: number; y: number; r?: number; t: number; face?: string}> = ({x, y, r = 72, t, face = '#fffaf0'}) => {
	const sec = Math.floor(t) * 6 + wobble(t - Math.floor(t), 40, 12) * 3;
	return (
		<g transform={`translate(${x} ${y})`}>
			<circle r={r + 12} fill={PAL.orange} stroke={INK} strokeWidth={6} />
			<circle r={r} fill={face} stroke={INK} strokeWidth={4} />
			{Array.from({length: 12}, (_, i) => {
				const a = rad(i * 30);
				return <line key={i} x1={Math.sin(a) * r * 0.78} y1={-Math.cos(a) * r * 0.78} x2={Math.sin(a) * r * 0.92} y2={-Math.cos(a) * r * 0.92} stroke={INK} strokeWidth={i % 3 ? 3 : 6} strokeLinecap="round" />;
			})}
			<line x1={0} y1={0} x2={Math.sin(rad(300)) * r * 0.45} y2={-Math.cos(rad(300)) * r * 0.45} stroke={INK} strokeWidth={8} strokeLinecap="round" />
			<line x1={0} y1={0} x2={Math.sin(rad(48)) * r * 0.68} y2={-Math.cos(rad(48)) * r * 0.68} stroke={INK} strokeWidth={6} strokeLinecap="round" />
			<line x1={0} y1={0} x2={Math.sin(rad(sec)) * r * 0.8} y2={-Math.cos(rad(sec)) * r * 0.8} stroke={PAL.stamp} strokeWidth={3} strokeLinecap="round" />
			<circle r={7} fill={INK} />
		</g>
	);
};
/** default view out of a home window: lawn, hedge, the neighbours' wall with a window (day) / dark with lit windows (night) */
const OutsideView: React.FC<{w: number; h: number; t: number; night: number}> = ({w, h, t, night}) => {
	const n = clamp01(night);
	return (
		<svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
			<rect width={w} height={h} fill={mixC('#9fd3f5', '#13213a', n)} />
			<path d={lobePath(wrap(t * 10, w + 200) - 100, h * 0.18, 46, 3, 7, 0.5)} fill={mixC('#ffffff', '#24324d', n)} opacity={0.9} />
			<rect x={w * 0.52} y={h * 0.2} width={w * 0.6} height={h * 0.6} fill={mixC('#f1d38a', '#3a3446', n)} stroke={INK} strokeWidth={4} />
			<path d={`M${w * 0.47},${h * 0.22} L${w * 0.82},${h * 0.04} L${w * 1.1},${h * 0.22} Z`} fill={mixC('#8a4b3a', '#2a1f2a', n)} stroke={INK} strokeWidth={4} />
			<rect x={w * 0.64} y={h * 0.34} width={w * 0.2} height={h * 0.2} fill={mixC('#bfe6ff', '#ffd27a', n)} stroke={INK} strokeWidth={4} />
			<rect x={0} y={h * 0.62} width={w} height={h * 0.4} fill={mixC('#6fae4d', '#16302a', n)} />
			{[0.1, 0.3, 0.5].map((f, i) => <path key={i} d={lobePath(w * f, h * 0.64, h * 0.12, i + 4, 6, 0.6)} fill={mixC('#3f8a3a', '#0f241d', n)} stroke={INK} strokeWidth={3} />)}
		</svg>
	);
};

/**
 * A home interior, full frame. view 'kitchen': home fridge on the left (magnets; pin kit A's cutout at KITCHEN.fridgeSlot),
 * counter with sink and cabinets, window over the sink (outside = your node laid out in the window box, default = lawn and
 * the neighbours' wall; police cars pull up there), a wall clock without digits (second hand ticks), pendant lamp, the
 * kitchen table in front. view 'living': sofa, floor lamp, coffee table, rug, abstract pictures. night 0..1, lamp 0..1.
 */
export const HouseInterior: React.FC<{t: number; view?: 'kitchen' | 'living'; night?: number; outside?: React.ReactNode; lamp?: number} & Tone> = ({t, view = 'kitchen', night = 0, outside, lamp, ...tone}) => {
	const sid = useSid('hi');
	const n = clamp01(night);
	const lk = clamp01(lamp ?? n);
	const C = (d: string, nn: string) => mixC(d, nn, n * 0.75);
	const wall = C('#f3e2b8', '#3e3a52'), wallD = C('#e9d4a2', '#35314a'), wood = C('#c58a52', '#4a3530'), woodD = C('#a87240', '#3a2a26');
	const floorC = C('#b98a5a', '#3a2e2c'), floorD = C('#9c7046', '#2c2322');
	const Wn = KITCHEN.window;
	const sw = Math.sin(t * 1.1) * 1.5;
	const kitchen = view === 'kitchen';
	return (
		<Full bg={wall} {...tone}>
			<Svg>
				<defs>
					<radialGradient id={`${sid}l`} cx="50%" cy="50%" r="50%">
						<stop offset="0" stopColor="#ffe9a8" stopOpacity={0.6} />
						<stop offset="1" stopColor="#ffe9a8" stopOpacity={0} />
					</radialGradient>
				</defs>
				{Array.from({length: 19}, (_, i) => <rect key={i} x={i * 60} y={0} width={24} height={1300} fill={wallD} />)}
				{/* floor */}
				<rect x={0} y={1300} width={1080} height={620} fill={floorC} />
				{Array.from({length: 11}, (_, i) => {
					const bx = i * 120 - 60;
					return <line key={i} x1={540 + (bx - 540) * 0.45} y1={1300} x2={bx + (bx - 540) * 0.6} y2={1920} stroke={floorD} strokeWidth={4} />;
				})}
				<line x1={0} y1={1300} x2={1080} y2={1300} stroke={INK} strokeWidth={6} />
				{/* window frame (the outside view sits under this layer) */}
				<rect x={Wn.x - 22} y={Wn.y - 22} width={Wn.w + 44} height={Wn.h + 44} rx={6} fill="#fbf7ee" stroke={INK} strokeWidth={6} />
				<rect x={Wn.x} y={Wn.y} width={Wn.w} height={Wn.h} fill="#000" />
			</Svg>
			<div style={{position: 'absolute', left: Wn.x, top: Wn.y, width: Wn.w, height: Wn.h, overflow: 'hidden'}}>{outside ?? <OutsideView w={Wn.w} h={Wn.h} t={t} night={n} />}</div>
			<Svg>
				<line x1={Wn.x + Wn.w / 2} y1={Wn.y} x2={Wn.x + Wn.w / 2} y2={Wn.y + Wn.h} stroke="#fbf7ee" strokeWidth={14} />
				<line x1={Wn.x} y1={Wn.y + Wn.h * 0.45} x2={Wn.x + Wn.w} y2={Wn.y + Wn.h * 0.45} stroke="#fbf7ee" strokeWidth={14} />
				<rect x={Wn.x} y={Wn.y} width={Wn.w} height={Wn.h} fill="none" stroke={INK} strokeWidth={4} />
				<polygon points={pts([[Wn.x + 40, Wn.y], [Wn.x + 120, Wn.y], [Wn.x + 30, Wn.y + Wn.h], [Wn.x, Wn.y + Wn.h]])} fill="#ffffff" opacity={0.12} />
				{/* valance with dots (not a check: the check belongs to the dad) */}
				<path d={`M${Wn.x - 40},${Wn.y - 34} L${Wn.x + Wn.w + 40},${Wn.y - 34} L${Wn.x + Wn.w + 40},${Wn.y + 40} ${Array.from({length: 8}, (_, i) => {
					const x0 = Wn.x + Wn.w + 40 - ((i + 1) * (Wn.w + 80)) / 8;
					return `Q${x0 + (Wn.w + 80) / 16},${Wn.y + 70 + Math.sin(t * 1.4 + i) * 3} ${x0},${Wn.y + 40}`;
				}).join(' ')} Z`} fill={C(PAL.teal, '#1f3b45')} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				{Array.from({length: 12}, (_, i) => <circle key={i} cx={Wn.x - 20 + i * 42} cy={Wn.y} r={6} fill="#fffaf0" opacity={0.8} />)}
				{kitchen ? (
					<g>
						{/* counter + sink + cabinets */}
						<rect x={340} y={830} width={740} height={130} fill={C('#eef1f2', '#454760')} />
						{Array.from({length: 12}, (_, i) => <line key={i} x1={340 + i * 66} y1={830} x2={340 + i * 66} y2={960} stroke={C('#cfd6da', '#3a3c52')} strokeWidth={3} />)}
						{[876, 918].map((ly) => <line key={ly} x1={340} y1={ly} x2={1080} y2={ly} stroke={C('#cfd6da', '#3a3c52')} strokeWidth={3} />)}
						<rect x={840} y={150} width={260} height={400} rx={8} fill={C('#6f9fae', '#2b3b4a')} stroke={INK} strokeWidth={6} />
						<line x1={970} y1={150} x2={970} y2={550} stroke={INK} strokeWidth={5} />
						{[950, 990].map((kx) => <circle key={kx} cx={kx} cy={500} r={9} fill={PAL.gold} stroke={INK} strokeWidth={3} />)}
						<rect x={330} y={950} width={760} height={34} rx={6} fill={C('#e8e0d0', '#4a4658')} stroke={INK} strokeWidth={5} />
						<rect x={340} y={984} width={740} height={316} fill={C('#6f9fae', '#2b3b4a')} stroke={INK} strokeWidth={6} />
						{[340, 520, 700, 880].map((dx0) => (
							<g key={dx0}>
								<rect x={dx0 + 14} y={1000} width={152} height={284} rx={6} fill={C('#83b0bf', '#33475a')} stroke={INK} strokeWidth={4} />
								<rect x={dx0 + 74} y={1030} width={32} height={10} rx={5} fill={PAL.gold} stroke={INK} strokeWidth={3} />
							</g>
						))}
						<path d="M600,950 L600,890 Q600,862 628,862 L664,862 L664,878 L634,878 Q616,878 616,896 L616,950 Z" fill="#c9d0d7" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
						{/* kettle */}
						<path d="M900,950 L908,880 Q940,852 972,880 L980,950 Z" fill={PAL.stamp} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
						<path d="M980,904 Q1012,902 1004,940" stroke={INK} strokeWidth={6} fill="none" />
						<path d="M908,892 Q880,880 872,860" stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" />
						{/* home fridge with magnets */}
						<rect x={40} y={360} width={300} height={940} rx={30} fill={C('#f4f5f2', '#5a5c70')} stroke={INK} strokeWidth={7} />
						<rect x={300} y={372} width={28} height={916} rx={14} fill="#000" opacity={0.08} />
						<line x1={40} y1={640} x2={340} y2={640} stroke={INK} strokeWidth={5} />
						{[[440, 600], [700, 900]].map(([a, b]) => (
							<g key={a}>
								<line x1={302} y1={a} x2={302} y2={b} stroke={INK} strokeWidth={18} strokeLinecap="round" />
								<line x1={302} y1={a} x2={302} y2={b} stroke="#dfe5ea" strokeWidth={9} strokeLinecap="round" />
							</g>
						))}
						<circle cx={100} cy={450} r={18} fill={PAL.stamp} stroke={INK} strokeWidth={4} />
						<circle cx={240} cy={520} r={16} fill={PAL.gold} stroke={INK} strokeWidth={4} />
						<path d="M86,1000 Q86,982 102,982 Q114,982 114,994 Q114,982 126,982 Q142,982 142,1000 Q142,1018 114,1036 Q86,1018 86,1000 Z" fill={PAL.orange} stroke={INK} strokeWidth={4} />
						<path d={lobePath(250, 1120, 18, 5, 6)} fill={PAL.teal} stroke={INK} strokeWidth={4} />
						<rect x={60} y={1262} width={260} height={22} rx={8} fill="#5d656e" />
					</g>
				) : (
					<g>
						{/* pictures (abstract, no text) */}
						{[[80, 420, 240, 200], [880, 440, 170, 200]].map(([px, py, pw, ph], i) => (
							<g key={i}>
								<rect x={px} y={py} width={pw} height={ph} fill="#8a5a3a" stroke={INK} strokeWidth={6} />
								<rect x={px + 16} y={py + 16} width={pw - 32} height={ph - 32} fill={i ? '#f6c9a8' : '#a9d8f0'} />
								<path d={`M${px + 16},${py + ph - 16} L${px + pw * 0.4},${py + ph * 0.45} L${px + pw * 0.6},${py + ph * 0.65} L${px + pw * 0.8},${py + ph * 0.4} L${px + pw - 16},${py + ph - 16} Z`} fill={i ? PAL.orange : '#5f9e45'} />
							</g>
						))}
						<rect x={0} y={1000} width={1080} height={300} fill={C('#d9b98a', '#2f2a3c')} />
						<line x1={0} y1={1000} x2={1080} y2={1000} stroke={INK} strokeWidth={5} />
						{/* floor lamp */}
						<line x1={900} y1={640} x2={900} y2={1290} stroke={INK} strokeWidth={14} />
						<ellipse cx={900} cy={1292} rx={70} ry={16} fill="#3b4149" stroke={INK} strokeWidth={5} />
						<polygon points={pts([[850, 560], [950, 560], [990, 680], [810, 680]])} fill={mixC('#f3e2b8', '#ffd27a', lk)} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
						<ellipse cx={900} cy={700} rx={340} ry={300} fill={`url(#${sid}l)`} opacity={lk} />
						{/* sofa */}
						<rect x={60} y={1040} width={560} height={240} rx={60} fill={C('#5b7fa6', '#2c3a52')} stroke={INK} strokeWidth={7} />
						{[110, 350].map((cx0) => <rect key={cx0} x={cx0} y={1070} width={220} height={150} rx={40} fill={C('#7096be', '#34466a')} stroke={INK} strokeWidth={5} />)}
						<rect x={30} y={1200} width={620} height={150} rx={40} fill={C('#4c6d93', '#263248')} stroke={INK} strokeWidth={7} />
						{[30, 560].map((ax) => <rect key={ax} x={ax} y={1130} width={90} height={230} rx={40} fill={C('#5b7fa6', '#2c3a52')} stroke={INK} strokeWidth={6} />)}
						{[80, 600].map((lx) => <rect key={lx} x={lx} y={1350} width={22} height={40} fill={INK} />)}
					</g>
				)}
				{/* wall clock + pendant lamp */}
				<WallClockG x={190} y={kitchen ? 230 : 280} t={t} face={C('#fffaf0', '#cfc8d8')} />
				<g transform={`rotate(${sw.toFixed(2)} 600 0)`}>
					<line x1={600} y1={0} x2={600} y2={150} stroke={INK} strokeWidth={5} />
					<polygon points={pts([[566, 150], [634, 150], [680, 222], [520, 222]])} fill={C(PAL.orange, '#6a3a1a')} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
					<ellipse cx={600} cy={226} rx={30} ry={12} fill={mixC('#fff8d0', '#ffd27a', lk)} stroke={INK} strokeWidth={3} />
					<ellipse cx={600} cy={300} rx={340} ry={320} fill={`url(#${sid}l)`} opacity={lk} />
				</g>
				{/* table (kitchen) / coffee table + rug (living) */}
				{kitchen ? (
					<g>
						<rect x={290} y={1490} width={24} height={210} fill={woodD} stroke={INK} strokeWidth={4} />
						<rect x={770} y={1490} width={24} height={210} fill={woodD} stroke={INK} strokeWidth={4} />
						<polygon points={pts([[250, 1380], [830, 1380], [890, 1452], [190, 1452]])} fill={wood} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
						<rect x={190} y={1452} width={700} height={40} fill={woodD} stroke={INK} strokeWidth={5} />
						<rect x={214} y={1492} width={30} height={290} fill={woodD} stroke={INK} strokeWidth={5} />
						<rect x={836} y={1492} width={30} height={290} fill={woodD} stroke={INK} strokeWidth={5} />
						{[0, 1].map((k) => <line key={k} x1={300 + k * 380} y1={1392} x2={260 + k * 460} y2={1440} stroke={woodD} strokeWidth={3} opacity={0.6} />)}
						{/* a kitchen chair beside the table */}
						<rect x={950} y={1150} width={24} height={560} fill={woodD} stroke={INK} strokeWidth={5} />
						<rect x={1046} y={1150} width={24} height={560} fill={woodD} stroke={INK} strokeWidth={5} />
						<rect x={936} y={1140} width={148} height={40} rx={14} fill={wood} stroke={INK} strokeWidth={5} />
						{[982, 1010, 1038].map((sx0) => <rect key={sx0} x={sx0 - 6} y={1180} width={12} height={300} fill={wood} stroke={INK} strokeWidth={3} />)}
						<rect x={892} y={1566} width={24} height={220} fill={woodD} stroke={INK} strokeWidth={5} />
						<rect x={1086} y={1566} width={24} height={220} fill={woodD} stroke={INK} strokeWidth={5} />
						<polygon points={pts([[920, 1490], [1090, 1490], [1112, 1540], [880, 1540]])} fill={wood} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
						<rect x={880} y={1540} width={232} height={28} fill={woodD} stroke={INK} strokeWidth={5} />
					</g>
				) : (
					<g>
						<ellipse cx={540} cy={1640} rx={430} ry={130} fill={C(PAL.orange, '#5a2f1a')} stroke={INK} strokeWidth={6} />
						<ellipse cx={540} cy={1640} rx={330} ry={96} fill={C('#fff4dc', '#5a5466')} />
						<ellipse cx={540} cy={1640} rx={220} ry={62} fill={C(PAL.teal, '#1f3b45')} />
						<polygon points={pts([[330, 1470], [750, 1470], [790, 1510], [290, 1510]])} fill={wood} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
						<rect x={290} y={1510} width={500} height={26} fill={woodD} stroke={INK} strokeWidth={4} />
						{[310, 750].map((lx) => <rect key={lx} x={lx} y={1536} width={22} height={90} fill={woodD} stroke={INK} strokeWidth={4} />)}
					</g>
				)}
			</Svg>
		</Full>
	);
};

// ===================================================================================================== BEDROOM CORNER
/**
 * A kid's bedroom corner, full frame: star wallpaper, bed with a dotted blanket and a plush bear, a round rug (the doll
 * case can pop open on it, centre ≈ (620, 1640)), a toy shelf, a small night lamp (glows), a curtained window on the right
 * wall. night 0..1 darkens it and lights the lamp.
 */
export const Bedroom: React.FC<{t: number; night?: number} & Tone> = ({t, night = 0, ...tone}) => {
	const sid = useSid('bd');
	const n = clamp01(night);
	const C = (d: string, nn: string) => mixC(d, nn, n * 0.75);
	const yTop = (x: number) => -((x - 720) * 160) / 360;
	const yBot = (x: number) => 1260 + ((x - 720) * 200) / 360;
	const rw = (x: number, f: number): P2 => [x, lerp(yTop(x), yBot(x), f)];
	const sx = Math.sin(t * 1.7) * 6;
	const star = (cx: number, cy: number, r: number) => {
		let d = '';
		for (let i = 0; i < 10; i++) {
			const a = -Math.PI / 2 + (i * Math.PI) / 5;
			const rr = i % 2 ? r * 0.45 : r;
			d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)} `;
		}
		return d + 'Z';
	};
	const glow = 0.45 + 0.55 * n + 0.06 * Math.sin(t * 3.1);
	return (
		<Full bg={C('#e6ddf3', '#2e2a44')} {...tone}>
			<Svg>
				<defs>
					<radialGradient id={`${sid}g`} cx="50%" cy="50%" r="50%">
						<stop offset="0" stopColor="#ffe9a8" stopOpacity={0.75} />
						<stop offset="1" stopColor="#ffe9a8" stopOpacity={0} />
					</radialGradient>
				</defs>
				<rect x={0} y={0} width={720} height={1260} fill={C('#e6ddf3', '#2e2a44')} />
				{Array.from({length: 40}, (_, i) => {
					const c = i % 6, r = Math.floor(i / 6);
					return <path key={i} d={star(60 + c * 120 + (r % 2) * 60, 80 + r * 150, 16)} fill={C('#ffd75a', '#6a5a3a')} opacity={0.7} />;
				})}
				<polygon points={pts([[720, 0], [1080, -160], [1080, 1460], [720, 1260]])} fill={C('#d5c9e8', '#26233a')} />
				<line x1={720} y1={0} x2={720} y2={1260} stroke={INK} strokeWidth={5} />
				<polygon points={pts([[0, 1260], [720, 1260], [1080, 1460], [1080, 1920], [0, 1920]])} fill={C('#c9a27a', '#3a2e2c')} />
				{Array.from({length: 10}, (_, i) => {
					const bx = i * 120 - 20;
					const by = bx <= 720 ? 1260 : yBot(bx);
					const vx = 420, vy = 700;
					const k = (1920 - by) / (by - vy);
					return <line key={i} x1={bx} y1={by} x2={bx + (bx - vx) * k} y2={1920} stroke={C('#a9825a', '#2c2322')} strokeWidth={4} />;
				})}
				<polygon points={pts([[0, 1236], [720, 1236], [1080, 1436], [1080, 1460], [720, 1260], [0, 1260]])} fill="#fffaf0" stroke={INK} strokeWidth={4} />
				{/* window on the right wall */}
				<polygon points={pts([rw(800, 0.3), rw(990, 0.3), rw(990, 0.62), rw(800, 0.62)])} fill={C('#bfe6ff', '#13213a')} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<line {...ln(rw(895, 0.3), rw(895, 0.62))} stroke="#fffaf0" strokeWidth={10} />
				{[[780, 840, 0], [950, 1010, 1]].map(([a, b, k]) => (
					<polygon key={a} points={pts([rw(a, 0.27), rw(b, 0.27), [b + (k ? 0 : sx), lerp(yTop(b), yBot(b), 0.68)], [a + (k ? sx : 0), lerp(yTop(a), yBot(a), 0.68)]])} fill={C('#f6a6c4', '#5a3a4a')} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
				))}
				{/* bed */}
				<path d="M40,1150 L40,880 Q40,800 120,800 L430,800 Q510,800 510,880 L510,1150 Z" fill={C('#c58a52', '#4a3530')} stroke={INK} strokeWidth={7} />
				<path d="M90,1150 L90,900 Q90,850 140,850 L410,850 Q460,850 460,900 L460,1150 Z" fill={C('#d9a06a', '#55403a')} />
				<path d={lobePath(275, 1110, 120, 4, 7, 0.38)} fill="#fffaf0" stroke={INK} strokeWidth={5} />
				<polygon points={pts([[30, 1150], [520, 1150], [620, 1520], [-80, 1520]])} fill={C('#f6a6c4', '#5a3a4a')} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<polygon points={pts([[30, 1150], [520, 1150], [534, 1204], [16, 1204]])} fill="#fffaf0" stroke={INK} strokeWidth={4} />
				{Array.from({length: 18}, (_, i) => <circle key={i} cx={40 + (i % 6) * 95 + Math.floor(i / 6) * 10} cy={1250 + Math.floor(i / 6) * 90} r={10} fill="#fffaf0" opacity={0.85} />)}
				<rect x={-80} y={1520} width={700} height={60} rx={10} fill={C('#c58a52', '#4a3530')} stroke={INK} strokeWidth={6} />
				{/* plush bear */}
				<g transform={`translate(400 1180) rotate(${(Math.sin(t * 1.2) * 2).toFixed(2)})`}>
					<ellipse cx={0} cy={30} rx={46} ry={52} fill={C('#a8713f', '#4a3328')} stroke={INK} strokeWidth={5} />
					<circle cx={-34} cy={-42} r={16} fill={C('#a8713f', '#4a3328')} stroke={INK} strokeWidth={5} />
					<circle cx={34} cy={-42} r={16} fill={C('#a8713f', '#4a3328')} stroke={INK} strokeWidth={5} />
					<circle cx={0} cy={-20} r={40} fill={C('#b98250', '#553a2c')} stroke={INK} strokeWidth={5} />
					<ellipse cx={0} cy={-8} rx={16} ry={12} fill="#f1d9b8" />
					<circle cx={-14} cy={-28} r={5} fill={INK} />
					<circle cx={14} cy={-28} r={5} fill={INK} />
					<circle cx={0} cy={-12} r={5} fill={INK} />
				</g>
				{/* night lamp */}
				<ellipse cx={610} cy={1080} rx={220} ry={200} fill={`url(#${sid}g)`} opacity={glow} />
				<rect x={560} y={1140} width={100} height={110} rx={10} fill={C('#ffffff', '#5a5466')} stroke={INK} strokeWidth={5} />
				<rect x={600} y={1090} width={20} height={50} fill={INK} />
				<path d="M560,1092 L660,1092 L640,1010 L580,1010 Z" fill={mixC('#ffe9a8', '#ffd27a', n)} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				{/* toy shelf on the right wall */}
				<polygon points={pts([rw(760, 0.76), rw(1060, 0.76), rw(1060, 0.98), rw(760, 0.98)])} fill={C('#ffffff', '#4a4658')} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<polygon points={pts([rw(760, 0.86), rw(1060, 0.86), rw(1060, 0.875), rw(760, 0.875)])} fill={INK} />
				<circle cx={820} cy={lerp(yTop(820), yBot(820), 0.81)} r={30} fill={PAL.stamp} stroke={INK} strokeWidth={4} />
				<path d={`M790,${lerp(yTop(820), yBot(820), 0.81)} L850,${lerp(yTop(820), yBot(820), 0.81)}`} stroke="#fff" strokeWidth={6} />
				{[900, 980].map((bx, i) => {
					const by = lerp(yTop(bx), yBot(bx), 0.97);
					return (
						<g key={bx}>
							<rect x={bx - 32} y={by - 64} width={64} height={60} fill={i ? PAL.teal : PAL.gold} stroke={INK} strokeWidth={4} />
							<path d={i ? star(bx, by - 34, 18) : `M${bx},${by - 18} Q${bx - 24},${by - 34} ${bx - 12},${by - 50} Q${bx},${by - 54} ${bx},${by - 42} Q${bx},${by - 54} ${bx + 12},${by - 50} Q${bx + 24},${by - 34} ${bx},${by - 18} Z`} fill="#fffaf0" stroke={INK} strokeWidth={3} />
						</g>
					);
				})}
				{/* rug */}
				<ellipse cx={620} cy={1660} rx={390} ry={130} fill={C(PAL.teal, '#1f3b45')} stroke={INK} strokeWidth={6} />
				<ellipse cx={620} cy={1660} rx={300} ry={98} fill={C('#fffaf0', '#5a5466')} />
				<ellipse cx={620} cy={1660} rx={200} ry={64} fill={C(PAL.orange, '#5a2f1a')} />
			</Svg>
		</Full>
	);
};

// ===================================================================================================== TABLE TOP (from above)
/**
 * A table seen straight from above, full frame (the carton slides across it): wooden planks with grain and knots, a soft
 * window light patch that drifts (light 0..1). variant 'desk' = darker wood + a green blotter pad (beat «Her dad put it
 * there», pair it with sepia). Nothing written anywhere.
 */
export const TableTop: React.FC<{t: number; variant?: 'kitchen' | 'desk'; light?: number} & Tone> = ({t, variant = 'kitchen', light = 1, ...tone}) => {
	const sid = useSid('tt');
	const desk = variant === 'desk';
	const woods = desk ? ['#7a5236', '#6e4a32', '#845a3c', '#6a462f', '#7d5438'] : ['#c08650', '#b57c48', '#c98f58', '#b07646', '#c48a54'];
	const grain = desk ? '#4e3220' : '#8a5a32';
	const lx = Math.sin(t * 0.35) * 24;
	return (
		<Full bg={woods[0]} {...tone}>
			<Svg>
				<defs>
					<radialGradient id={`${sid}v`} cx="50%" cy="50%" r="72%">
						<stop offset="0.6" stopColor="#000" stopOpacity={0} />
						<stop offset="1" stopColor="#000" stopOpacity={0.45} />
					</radialGradient>
				</defs>
				{woods.map((c, i) => (
					<g key={i}>
						<rect x={i * 216} y={0} width={216} height={1920} fill={c} />
						{Array.from({length: 6}, (_, k) => {
							const gx = i * 216 + 20 + k * 34 + h1(i * 7 + k) * 10;
							let d = `M${gx.toFixed(1)},0`;
							for (let yy = 120; yy <= 1980; yy += 120) d += ` Q${(gx + Math.sin(yy * 0.01 + i + k) * 14).toFixed(1)},${yy - 60} ${(gx + Math.sin(yy * 0.013 + k) * 6).toFixed(1)},${yy}`;
							return <path key={k} d={d} stroke={grain} strokeWidth={3} fill="none" opacity={0.3} />;
						})}
						<line x1={i * 216} y1={0} x2={i * 216} y2={1920} stroke={INK} strokeWidth={5} />
					</g>
				))}
				{[[300, 520, 30], [760, 1380, 24], [130, 1600, 20]].map(([kx, ky, kr], i) => (
					<g key={i}>
						<ellipse cx={kx} cy={ky} rx={kr * 0.7} ry={kr * 1.4} fill={grain} opacity={0.55} />
						<ellipse cx={kx} cy={ky} rx={kr * 1.3} ry={kr * 2.6} fill="none" stroke={grain} strokeWidth={3} opacity={0.35} />
					</g>
				))}
				{desk ? (
					<g>
						<rect x={150} y={500} width={780} height={900} rx={22} fill="#2f5a46" stroke={INK} strokeWidth={7} />
						<rect x={150} y={500} width={780} height={70} rx={20} fill="#5a3a2a" stroke={INK} strokeWidth={5} />
						<rect x={150} y={1330} width={780} height={70} rx={20} fill="#5a3a2a" stroke={INK} strokeWidth={5} />
						<g transform="translate(960 900) rotate(-12)">
							<rect x={-12} y={-180} width={24} height={300} fill={PAL.gold} stroke={INK} strokeWidth={4} />
							<path d="M-12,120 L12,120 L0,160 Z" fill="#f1d9b8" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
						</g>
					</g>
				) : (
					<g>
						<ellipse cx={880} cy={380} rx={70} ry={70} fill="none" stroke={grain} strokeWidth={6} opacity={0.3} />
						{Array.from({length: 7}, (_, i) => <circle key={i} cx={180 + h1(i * 3.1) * 200} cy={1500 + h1(i * 5.7) * 200} r={3 + 3 * h1(i)} fill="#f1d9b8" opacity={0.8} />)}
					</g>
				)}
			</Svg>
			<div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: clamp01(light), pointerEvents: 'none'}}>
				<Svg>
					<polygon points={pts([[140 + lx, -40], [760 + lx, -40], [980 + lx, 1060], [360 + lx, 1060]])} fill="#fff1c8" opacity={0.2} />
					<polygon points={pts([[440 + lx, -40], [470 + lx, -40], [690 + lx, 1060], [660 + lx, 1060]])} fill="#000" opacity={0.25} />
					<polygon points={pts([[250 + lx, 500], [870 + lx, 500], [876 + lx, 530], [256 + lx, 530]])} fill="#000" opacity={0.25} />
				</Svg>
			</div>
			<Svg>
				<rect x={0} y={0} width={1080} height={1920} fill={`url(#${sid}v)`} />
			</Svg>
		</Full>
	);
};

// ===================================================================================================== HOUSES + LAWN
type HouseLook = {wall: string; wallD: string; roof: string; door: string; trim: string};
const HOUSE: Record<'ours' | 'neighbor', HouseLook> = {
	ours: {wall: '#a9c7df', wallD: '#8fb0cb', roof: '#5d4a6e', door: '#7a4a2a', trim: '#f4f1ea'},
	neighbor: {wall: '#f1d38a', wallD: '#d9b96b', roof: '#8a4b3a', door: '#3f6b5a', trim: '#fffaf0'},
};
/** door of a House placed at (x, y, s), frame px: threshold y, the carpet spot just inside (where the case is set down), width */
export const houseDoor = (x: number, y: number, s = 1) => ({x, y: y - 40 * s, inside: y - 64 * s, top: y - 360 * s, w: 160 * s});
/**
 * A one-storey house facade, side-on (SVG in its own units, anchor (0, 0) = ground at the door centre); left / right =
 * how far the wall runs from the door (units). No numbers, no signs, no mailbox. door 0..1 = the inner door open (a patterned
 * carpet in the hall shows), screen 0..1 = the screen door swung toward the camera, slap = age since it slammed shut (wobble).
 */
export const House: React.FC<{x: number; y: number; s?: number; t?: number; look?: 'ours' | 'neighbor'; left?: number; right?: number; door?: number; screen?: number; slap?: number; light?: number}> = ({
	x, y, s = 1, t = 0, look = 'neighbor', left = 520, right = 520, door = 1, screen = 0, slap, light = 0,
}) => {
	const sid = useSid('hs');
	const L = HOUSE[look];
	const cx = (right - left) / 2;
	const op = clamp01(door);
	const th = rad(clamp01(screen) * 78 + wobble(slap, 34, 7) * 6);
	const hx = -82, fxs = hx + 164 * Math.cos(th);
	const p = Math.sin(th) * 0.22;
	const A: P2 = [hx, -362], B: P2 = [fxs, -362 - p * 150], Cq: P2 = [fxs, -38 + p * 150], D: P2 = [hx, -38];
	const Qd = (u: number, v: number): P2 => [lerp(lerp(A[0], B[0], u), lerp(D[0], Cq[0], u), v), lerp(lerp(A[1], B[1], u), lerp(D[1], Cq[1], u), v)];
	const shingles = [-620, -690, -760, -830].map((yy) => {
		const f = (-556 - yy) / 344;
		return <line key={yy} x1={-left - 50 + (cx + left + 50) * f} y1={yy} x2={right + 50 - (right + 50 - cx) * f} y2={yy} stroke={INK} strokeWidth={3} opacity={0.35} />;
	});
	const win = (wx: number) => (
		<g key={wx}>
			<rect x={wx - 92} y={-482} width={184} height={224} fill={L.trim} stroke={INK} strokeWidth={6} />
			<rect x={wx - 76} y={-466} width={152} height={192} fill={mixC('#bfe6ff', '#ffd27a', light)} />
			<polygon points={pts([[wx - 50, -466], [wx - 10, -466], [wx - 66, -274], [wx - 76, -274], [wx - 76, -380]])} fill="#ffffff" opacity={0.35} />
			<line x1={wx} y1={-466} x2={wx} y2={-274} stroke={L.trim} strokeWidth={10} />
			<path d={`M${wx - 76},-466 L${wx - 30},-466 Q${wx - 46},-380 ${wx - 70},-300 L${wx - 76},-300 Z`} fill={PAL.parchment} stroke={INK} strokeWidth={3} />
			<rect x={wx - 100} y={-258} width={200} height={34} rx={6} fill={L.door} stroke={INK} strokeWidth={5} />
			{[-60, -20, 20, 60].map((fx, i) => <path key={fx} d={lobePath(wx + fx, -268, 18, i + wx, 5)} fill={[PAL.stamp, PAL.gold, '#f6a6c4', PAL.orange][i]} stroke={INK} strokeWidth={3} />)}
		</g>
	);
	return (
		<Fig x={x} y={y} s={s} vb={[-left - 80, -920, left + right + 160, 960]}>
			<defs>
				<pattern id={`${sid}c`} width={40} height={24} patternUnits="userSpaceOnUse">
					<rect width={40} height={24} fill="#b54a3a" />
					<path d="M0,12 L20,0 L40,12 L20,24 Z" fill="#e0742a" opacity={0.8} />
				</pattern>
			</defs>
			<rect x={-left} y={-560} width={left + right} height={520} fill={L.wall} stroke={INK} strokeWidth={6} />
			{Array.from({length: 13}, (_, i) => <line key={i} x1={-left} y1={-524 + i * 36} x2={right} y2={-524 + i * 36} stroke={L.wallD} strokeWidth={4} />)}
			<polygon points={pts([[-left - 50, -556], [cx, -900], [right + 50, -556]])} fill={L.roof} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
			{shingles}
			<rect x={-left - 56} y={-566} width={left + right + 112} height={22} rx={6} fill={L.trim} stroke={INK} strokeWidth={5} />
			{left > 320 ? win(-left + 180) : null}
			{right > 320 ? win(right - 180) : null}
			{/* doorway: hall + carpet (when open) */}
			<rect x={-94} y={-374} width={188} height={340} fill={L.trim} stroke={INK} strokeWidth={6} />
			<rect x={-80} y={-360} width={160} height={322} fill="#2a2226" />
			<g opacity={op}>
				<rect x={-80} y={-360} width={160} height={220} fill={mixC('#e8d4a8', '#ffe9b0', light)} opacity={0.8} />
				<polygon points={pts([[-80, -38], [80, -38], [62, -140], [-62, -140]])} fill={`url(#${sid}c)`} stroke={INK} strokeWidth={3} />
				{Array.from({length: 9}, (_, i) => <line key={i} x1={-72 + i * 18} y1={-40} x2={-72 + i * 18} y2={-26} stroke="#fff4dc" strokeWidth={4} />)}
			</g>
			<polygon points={pts([[80 - lerp(160, 30, op), -360 + 14 * op], [80, -360], [80, -38], [80 - lerp(160, 30, op), -38 - 18 * op]])} fill={L.door} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			{op < 0.5 ? <circle cx={52} cy={-200} r={9} fill={PAL.gold} stroke={INK} strokeWidth={3} /> : null}
			{/* steps + porch light + bushes */}
			<rect x={-140} y={-40} width={280} height={22} fill="#b9b2a6" stroke={INK} strokeWidth={4} />
			<rect x={-170} y={-18} width={340} height={20} fill="#cfc8bc" stroke={INK} strokeWidth={4} />
			<rect x={-left} y={-40} width={left - 140} height={40} fill="#8f8a82" stroke={INK} strokeWidth={4} />
			<rect x={140} y={-40} width={right - 140} height={40} fill="#8f8a82" stroke={INK} strokeWidth={4} />
			<rect x={118} y={-318} width={26} height={40} rx={8} fill={mixC('#fff3b0', '#ffd27a', light)} stroke={INK} strokeWidth={4} />
			{[-left + 40, right - 40].map((bx, i) => <path key={i} d={lobePath(bx, -50, 70, i + 31, 7, 0.75)} fill="#3f8a3a" stroke={INK} strokeWidth={5} transform={`rotate(${(Math.sin(t * 1.5 + i) * 1.2).toFixed(2)} ${bx} 0)`} />)}
			{/* screen door (outer, swings toward the camera) */}
			<polygon points={pts([A, B, Cq, D])} fill={L.trim} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			<polygon points={pts([Qd(0.1, 0.04), Qd(0.9, 0.04), Qd(0.9, 0.96), Qd(0.1, 0.96)])} fill="rgba(40,50,60,0.38)" stroke={INK} strokeWidth={3} />
			{Array.from({length: 7}, (_, i) => <line key={`mv${i}`} {...ln(Qd(0.1 + (i + 1) * 0.1, 0.04), Qd(0.1 + (i + 1) * 0.1, 0.96))} stroke="#9aa3ad" strokeWidth={1.4} opacity={0.6} />)}
			{Array.from({length: 13}, (_, i) => <line key={`mh${i}`} {...ln(Qd(0.1, 0.04 + (i + 1) * 0.0657), Qd(0.9, 0.04 + (i + 1) * 0.0657))} stroke="#9aa3ad" strokeWidth={1.4} opacity={0.6} />)}
			<polygon points={pts([Qd(0.04, 0.5), Qd(0.96, 0.5), Qd(0.96, 0.55), Qd(0.04, 0.55)])} fill={L.trim} stroke={INK} strokeWidth={3} />
			<line {...ln(Qd(0.86, 0.46), Qd(0.86, 0.6))} stroke={INK} strokeWidth={9} strokeLinecap="round" />
		</Fig>
	);
};
export const NeighborHouse: React.FC<Omit<React.ComponentProps<typeof House>, 'look'>> = (p) => <House look="neighbor" {...p} />;

/** Lawn layout (frame px): ground line, the two doors (ours left, the neighbours' right), house scale */
export const LAWN = {ground: 1180, ourDoor: 160, nbDoor: 820, s: 0.62} as const;
/**
 * Side-on lawn between two houses, full frame: sky, sun, drifting clouds, a far tree line, our house on the left (pale blue),
 * the neighbours' house on the right (yellow, screen door + hall carpet), a flower bed and stepping stones between them,
 * grass tufts that sway. cam = pan px (the houses move with the lawn, trees slower). door / screen / slap → NeighborHouse.
 */
export const Lawn: React.FC<{t: number; cam?: number; houses?: boolean; door?: number; screen?: number; slap?: number} & Tone> = ({t, cam = 0, houses = true, door = 1, screen = 0, slap, ...tone}) => {
	const G = LAWN.ground;
	return (
		<Full bg="#fff1d2" {...tone}>
			<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #6cb8ea 0%, #fff1d2 45%)'}} />
			<Svg>
				<circle cx={860 - cam * 0.05} cy={300} r={130} fill="#ffd75a" opacity={0.25} />
				<circle cx={860 - cam * 0.05} cy={300} r={78} fill="#ffd75a" stroke={INK} strokeWidth={5} />
				{[0, 1, 2].map((i) => <path key={i} d={lobePath(wrap(i * 480 + t * 15 - cam * 0.1, 1600) - 260, 200 + i * 120, 70 + i * 12, i + 3, 8, 0.48)} fill="#ffffff" stroke={INK} strokeWidth={4} strokeOpacity={0.5} />)}
				{Array.from({length: 12}, (_, i) => {
					const tx = wrap(i * 110 - cam * 0.3, 1320) - 120;
					return <path key={i} d={lobePath(tx, 1030 + h1(i) * 30, 90 + h1(i * 3) * 30, i + 11, 7, 0.85)} fill="#3f8a3a" stroke={INK} strokeWidth={4} />;
				})}
				<rect x={0} y={1070} width={1080} height={850} fill="#6fae4d" />
				<line x1={0} y1={1070} x2={1080} y2={1070} stroke={INK} strokeWidth={4} />
				<rect x={0} y={1150} width={1080} height={770} fill="#62a446" />
			</Svg>
			{houses ? (
				<>
					<House x={LAWN.ourDoor - cam} y={G} s={LAWN.s} t={t} look="ours" left={520} right={300} door={0} />
					<House x={LAWN.nbDoor - cam} y={G} s={LAWN.s} t={t} look="neighbor" left={300} right={560} door={door} screen={screen} slap={slap} />
				</>
			) : null}
			<Svg>
				{[400, 470, 540, 610].map((fx, i) => <path key={fx} d={lobePath(fx - cam, G + 6, 26, i + 51, 6)} fill={[PAL.stamp, PAL.gold, '#f6a6c4', PAL.orange][i]} stroke={INK} strokeWidth={4} />)}
				{Array.from({length: 7}, (_, i) => {
					const u = i / 6;
					const sx = lerp(LAWN.ourDoor + 30, LAWN.nbDoor - 30, u) - cam;
					const sy = G + 70 + Math.sin(u * Math.PI) * 60;
					return <ellipse key={i} cx={sx} cy={sy} rx={44} ry={16} fill="#cfc8bc" stroke={INK} strokeWidth={4} />;
				})}
				{Array.from({length: 22}, (_, i) => {
					const ty = G + 120 + h1(i * 7.3) * 640;
					const tx = wrap(h1(i * 3.9) * 1180 - cam * 1.1, 1180) - 50;
					const sc = 0.8 + (ty - G) / 600;
					return <path key={i} d={TUFT} transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${sc.toFixed(2)}) rotate(${(Math.sin(t * 2 + i) * 5).toFixed(1)})`} fill="#4f8f37" />;
				})}
			</Svg>
		</Full>
	);
};

// ===================================================================================================== POLICE
/** red / blue intensities (0.25..1) of a light bar at time t: double flash per colour; rate = cycles per second */
export const policeFlash = (t: number, rate = 1.6) => {
	const ph = wrap(t * rate, 1);
	const f = (a: number) => ((ph >= a && ph < a + 0.13) || (ph >= a + 0.2 && ph < a + 0.33) ? 1 : 0.25);
	return {red: f(0), blue: f(0.5)};
};
/**
 * Red / blue police light wash over the whole frame (overlay — put it ABOVE the scene): two soft radial washes left and
 * right of (cx, cy) flash in turn, optional rotating beams (beams 0..1), night 0..1 = a navy multiply first (dusk look).
 * k 0..1 = overall strength (fade it in on «Police show up»).
 */
export const PoliceLights: React.FC<{t: number; k?: number; rate?: number; cx?: number; cy?: number; spread?: number; beams?: number; night?: number}> = ({
	t, k = 1, rate = 1.6, cx = 540, cy = 760, spread = 420, beams = 0.5, night = 0.3,
}) => {
	if (k <= 0.01) return null;
	const {red, blue} = policeFlash(t, rate);
	const rot = t * 220;
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, pointerEvents: 'none', overflow: 'hidden'}}>
			{night > 0 ? <div style={{position: 'absolute', inset: 0, background: PAL.navy, opacity: night * k, mixBlendMode: 'multiply'}} /> : null}
			<div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: k * red, background: `radial-gradient(1100px 1300px at ${cx - spread}px ${cy}px, rgba(255,40,60,0.95) 0%, rgba(255,40,60,0.4) 40%, rgba(255,40,60,0) 72%)`}} />
			<div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: k * blue, background: `radial-gradient(1100px 1300px at ${cx + spread}px ${cy}px, rgba(40,110,255,0.95) 0%, rgba(40,110,255,0.4) 40%, rgba(40,110,255,0) 72%)`}} />
			{beams > 0 ? (
				<div
					style={{
						position: 'absolute',
						inset: 0,
						mixBlendMode: 'screen',
						opacity: k * beams,
						background: `conic-gradient(from ${rot.toFixed(1)}deg at ${cx}px ${cy}px, rgba(255,40,60,0) 0deg, rgba(255,40,60,0.45) 10deg, rgba(255,40,60,0) 24deg, rgba(255,40,60,0) 180deg, rgba(40,110,255,0.45) 190deg, rgba(40,110,255,0) 204deg, rgba(40,110,255,0) 360deg)`,
					}}
				/>
			) : null}
		</div>
	);
};

/**
 * A police car, side view facing right — no text, no badge, no numbers: black-and-white body, push bar, light bar whose
 * red / blue halves flash (lights). (x, y) = ground under its middle, ~680 × 320 at s 1. speed = wheel turns/s (0 =
 * parked); stop = age since it braked (the nose dips and bounces). silhouette = a dark shape with only the lights glowing
 * (cars pulling up seen through a window at night).
 */
export const PoliceCar: React.FC<{x: number; y: number; s?: number; t: number; speed?: number; stop?: number; flip?: boolean; lights?: boolean; silhouette?: boolean; rate?: number}> = ({
	x, y, s = 1, t, speed = 0, stop, flip, lights = true, silhouette = false, rate = 1.6,
}) => {
	const sid = useSid('pc');
	const {red, blue} = lights ? policeFlash(t + h1(x * 0.01) * 0.3, rate) : {red: 0, blue: 0};
	const dip = wobble(stop, 13, 4.5) * 2.4;
	const spin = t * speed * 360;
	const dark = silhouette ? '#0e1420' : '#1c2533';
	const white = silhouette ? '#0e1420' : '#eef1f5';
	const glass = silhouette ? '#1a2232' : '#2a3a50';
	const body = 'M-330,-60 L-334,-150 Q-330,-170 -300,-172 L-190,-176 L-130,-262 Q-120,-276 -100,-276 L110,-276 Q130,-276 142,-262 L200,-180 L300,-172 Q330,-168 334,-140 L334,-70 Q334,-44 310,-44 L-306,-44 Q-330,-44 -330,-60 Z';
	const wheel = (cx: number) => (
		<g transform={`translate(${cx} -58)`}>
			<circle r={58} fill="#16161b" stroke={INK} strokeWidth={6} />
			<circle r={32} fill={silhouette ? '#1d2230' : '#b9bec6'} stroke={INK} strokeWidth={4} />
			<g transform={`rotate(${spin.toFixed(1)})`}>{[0, 72, 144, 216, 288].map((a) => <line key={a} x1={0} y1={-6} x2={0} y2={-27} stroke={silhouette ? '#2a3040' : '#6b7078'} strokeWidth={8} strokeLinecap="round" transform={`rotate(${a})`} />)}</g>
			<circle r={8} fill="#5b6068" />
		</g>
	);
	return (
		<Fig x={x} y={y} s={s} vb={[-420, -380, 840, 420]} flip={flip}>
			<defs>
				<clipPath id={`${sid}b`}>
					<path d={body} />
				</clipPath>
				<radialGradient id={`${sid}r`} cx="50%" cy="50%" r="50%">
					<stop offset="0" stopColor="#ff3048" stopOpacity={0.9} />
					<stop offset="1" stopColor="#ff3048" stopOpacity={0} />
				</radialGradient>
				<radialGradient id={`${sid}u`} cx="50%" cy="50%" r="50%">
					<stop offset="0" stopColor="#3a7bff" stopOpacity={0.9} />
					<stop offset="1" stopColor="#3a7bff" stopOpacity={0} />
				</radialGradient>
			</defs>
			<ellipse cx={0} cy={0} rx={310} ry={20} fill="rgba(0,0,0,0.3)" />
			{silhouette ? <polygon points={pts([[330, -120], [420, -170], [420, -40], [330, -90]])} fill="#fff3b0" opacity={0.25} /> : null}
			<g transform={`rotate(${dip.toFixed(2)} 0 -40)`}>
				<path d={body} fill={dark} />
				<g clipPath={`url(#${sid}b)`}>
					<rect x={-200} y={-180} width={406} height={84} fill={white} />
				</g>
				<path d={body} fill="none" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
				<path d="M-180,-182 L-124,-258 L-24,-258 L-24,-182 Z" fill={glass} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<path d="M-6,-182 L-6,-258 L104,-258 Q118,-258 126,-248 L180,-182 Z" fill={glass} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				{silhouette ? null : <path d="M-130,-250 L-104,-250 L-150,-192 L-166,-192 Z M70,-252 L94,-252 L56,-192 L34,-192 Z" fill="#ffffff" opacity={0.35} />}
				<line x1={-14} y1={-180} x2={-14} y2={-50} stroke={INK} strokeWidth={4} />
				{silhouette ? null : <rect x={10} y={-160} width={36} height={10} rx={5} fill="#9aa3ad" stroke={INK} strokeWidth={3} />}
				{/* light bar */}
				<rect x={-96} y={-302} width={192} height={30} rx={11} fill="#2b2f36" stroke={INK} strokeWidth={5} />
				<rect x={-90} y={-297} width={86} height={20} rx={8} fill={mixC('#6a1520', '#ff6a7a', red)} />
				<rect x={4} y={-297} width={86} height={20} rx={8} fill={mixC('#142a6a', '#7ab0ff', blue)} />
				{lights ? (
					<g>
						<ellipse cx={-48} cy={-288} rx={150} ry={110} fill={`url(#${sid}r)`} opacity={red} />
						<ellipse cx={48} cy={-288} rx={150} ry={110} fill={`url(#${sid}u)`} opacity={blue} />
					</g>
				) : null}
				{/* lamps + push bar */}
				<ellipse cx={322} cy={-138} rx={11} ry={18} fill="#fff3b0" stroke={INK} strokeWidth={4} />
				<rect x={-336} y={-160} width={16} height={34} rx={5} fill="#e0303f" stroke={INK} strokeWidth={4} />
				<rect x={330} y={-126} width={30} height={80} rx={8} fill="#2b2f36" stroke={INK} strokeWidth={5} />
				<line x1={334} y1={-100} x2={356} y2={-100} stroke="#5b6068" strokeWidth={5} />
				<line x1={334} y1={-74} x2={356} y2={-74} stroke="#5b6068" strokeWidth={5} />
				{[-186, 196].map((wx) => <path key={wx} d={`M${wx - 76},-44 A76,76 0 0 1 ${wx + 76},-44 Z`} fill="#101015" stroke={INK} strokeWidth={4} />)}
			</g>
			{wheel(-186)}
			{wheel(196)}
		</Fig>
	);
};

// ===================================================================================================== DAIRY LINE (printing)
/** DairyLine layout (frame px): carton bottoms on y, the press over x press, gap between cartons, carton scale, s per carton */
export const LINE = {y: 1090, press: 540, gap: 300, s: 0.86, period: 0.55} as const;
/** the cartons on the DairyLine at time t (indexed motion: ride 55 % of a period, stop under the press, stamp at 66 %):
 *  k = carton index (grows to the left), x / y / s = where to draw it, printed = its face is on. Pick one k to send it on. */
export const dairyLineCartons = (t: number, period: number = LINE.period, gap: number = LINE.gap) => {
	const m = Math.floor(t / period), fr = t / period - m;
	const nC = m + easeInOut(clamp01(fr / 0.55));
	const out: {k: number; x: number; y: number; s: number; printed: boolean}[] = [];
	const span = Math.ceil(900 / gap) + 1;
	for (let k = Math.floor(nC) - span; k <= Math.ceil(nC) + span; k++) {
		const x = LINE.press + (nC - k) * gap;
		if (x < -260 || x > 1340) continue;
		out.push({k, x, y: LINE.y, s: LINE.s, printed: t >= (k - 1 + 0.66) * period});
	}
	return out;
};
/**
 * A dairy printing line, full frame: tiled factory wall with high windows and pipes, a conveyor (rollers turn, cleats move)
 * carrying blank cartons left → right in steps; over the middle a press drops its stamp plate on each carton — thunk —
 * and the face appears in the slot (faces: your render prop = her photo on every carton; default = one generic kid).
 * period = seconds per carton. Pair with sepia for «earlier». Positions: dairyLineCartons(t).
 */
export const DairyLine: React.FC<{t: number; period?: number; faces?: FaceFill; header?: CartonHeader; skip?: number[]} & Tone> = ({t, period = LINE.period, faces, header = 'missing', skip = [], ...tone}) => {
	const sid = useSid('dl');
	const m = Math.floor(t / period), fr = t / period - m;
	const nC = m + easeInOut(clamp01(fr / 0.55));
	const pd = fr < 0.58 ? 0 : fr < 0.66 ? Math.pow((fr - 0.58) / 0.08, 2) : fr < 0.72 ? 1 : 1 - easeOut((fr - 0.72) / 0.23);
	const hitAge = fr >= 0.66 ? (fr - 0.66) * period : -1;
	const plateY = lerp(565, 895, pd);
	const disp = nC * LINE.gap;
	const fill: FaceFill = faces ?? ((i, w, h) => <KidFaceG w={w} h={h} seed={7} />);
	const cartons = dairyLineCartons(t, period);
	return (
		<Full bg="#cfe0d4" {...tone}>
			<Svg>
				<defs>
					<linearGradient id={`${sid}w`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#ffffff" stopOpacity={0.5} />
						<stop offset="1" stopColor="#ffffff" stopOpacity={0} />
					</linearGradient>
				</defs>
				{Array.from({length: 24}, (_, i) => <line key={i} x1={0} y1={i * 64} x2={1080} y2={i * 64} stroke="#b7cbbd" strokeWidth={3} />)}
				{Array.from({length: 4}, (_, i) => (
					<g key={i}>
						<rect x={40 + i * 270} y={110} width={200} height={170} rx={8} fill="#eaf6ff" stroke={INK} strokeWidth={6} />
						<line x1={140 + i * 270} y1={110} x2={140 + i * 270} y2={280} stroke={INK} strokeWidth={5} />
						<polygon points={pts([[40 + i * 270, 280], [240 + i * 270, 280], [330 + i * 270, 1100], [130 + i * 270, 1100]])} fill={`url(#${sid}w)`} opacity={0.6} />
					</g>
				))}
				<rect x={-10} y={360} width={1100} height={34} rx={17} fill="#8a9aa6" stroke={INK} strokeWidth={5} />
				{[180, 860].map((vx) => (
					<g key={vx}>
						<rect x={vx - 18} y={340} width={36} height={74} rx={6} fill="#6f7d88" stroke={INK} strokeWidth={4} />
						<circle cx={vx} cy={330} r={22} fill={PAL.stamp} stroke={INK} strokeWidth={4} />
					</g>
				))}
				{/* press housing + gauge without digits */}
				<rect x={400} y={240} width={280} height={230} rx={14} fill="#6f8292" stroke={INK} strokeWidth={6} />
				<circle cx={460} cy={300} r={34} fill="#fffaf0" stroke={INK} strokeWidth={5} />
				<line x1={460} y1={300} x2={460 + Math.cos(rad(-150 + pd * 120)) * 26} y2={300 + Math.sin(rad(-150 + pd * 120)) * 26} stroke={PAL.stamp} strokeWidth={5} strokeLinecap="round" />
				<rect x={520} y={280} width={130} height={24} rx={12} fill={mixC('#2c3e50', '#5dff7a', pd)} stroke={INK} strokeWidth={4} />
				<rect x={430} y={380} width={220} height={60} rx={8} fill="#55687c" stroke={INK} strokeWidth={4} />
				<rect x={520} y={470} width={40} height={plateY - 470} fill="#dfe5ea" stroke={INK} strokeWidth={5} />
				{/* conveyor */}
				<rect x={-20} y={LINE.y} width={1120} height={36} fill="#3a3f47" stroke={INK} strokeWidth={5} />
				{Array.from({length: 14}, (_, j) => {
					const cxl = wrap(j * 90 + disp, 1260) - 90;
					return <line key={j} x1={cxl} y1={LINE.y + 4} x2={cxl} y2={LINE.y + 32} stroke="#5b6068" strokeWidth={6} />;
				})}
				{Array.from({length: 10}, (_, i) => (
					<g key={i} transform={`translate(${60 + i * 120} ${LINE.y + 64}) rotate(${((disp / 26) * 180) / Math.PI})`}>
						<circle r={26} fill="#9aa3ad" stroke={INK} strokeWidth={5} />
						<line x1={-18} y1={0} x2={18} y2={0} stroke={INK} strokeWidth={4} />
					</g>
				))}
				<rect x={-20} y={LINE.y + 92} width={1120} height={22} fill="#55687c" stroke={INK} strokeWidth={4} />
				{[80, 520, 980].map((lx) => <rect key={lx} x={lx - 16} y={LINE.y + 114} width={32} height={1500 - LINE.y - 114} fill="#55687c" stroke={INK} strokeWidth={4} />)}
				<rect x={0} y={1500} width={1080} height={420} fill="#a9b0a8" />
				<line x1={0} y1={1500} x2={1080} y2={1500} stroke={INK} strokeWidth={5} />
				{/* crates of finished cartons */}
				{[[250, 1800], [820, 1830]].map(([cx0, cy0], i) => (
					<g key={`cr${i}`}>
						{[-110, 0, 110].map((dx, j) => <CartonG key={j} x={cx0 + dx} y={cy0 - 50} s={0.42} side={0} hue={0} header={header} seed={j + i * 3 + 200} lw={9} />)}
						<rect x={cx0 - 190} y={cy0 - 150} width={380} height={150} rx={8} fill="#8a5a32" stroke={INK} strokeWidth={6} />
						{[cy0 - 100, cy0 - 50].map((ly) => <line key={ly} x1={cx0 - 190} y1={ly} x2={cx0 + 190} y2={ly} stroke="#6a4226" strokeWidth={5} />)}
					</g>
				))}
				{/* cartons */}
				{cartons.map((c) =>
					skip.includes(c.k) ? null : <CartonG key={c.k} x={c.x} y={c.y} s={c.s} side={0} hue={0} header={header} face={c.printed ? faceNode(fill, c.k, c.k * 7 + 1) : null} seed={c.k + 100} lw={6} />,
				)}
				{/* stamp plate (drops in front of the carton) */}
				<rect x={470} y={plateY - 30} width={140} height={34} rx={8} fill="#55687c" stroke={INK} strokeWidth={5} />
				<rect x={480} y={plateY} width={120} height={130} rx={10} fill="#2b2e35" stroke={INK} strokeWidth={6} />
				<rect x={492} y={plateY + 12} width={96} height={106} rx={6} fill="#3d424b" />
				{hitAge >= 0 && hitAge < 0.22
					? Array.from({length: 8}, (_, i) => {
							const a = rad(i * 45 + 20);
							const d = 90 + hitAge * 500;
							return <circle key={i} cx={540 + Math.cos(a) * d} cy={plateY + 65 + Math.sin(a) * d * 0.8} r={9 * (1 - hitAge / 0.22)} fill={INK} />;
						})
					: null}
			</Svg>
		</Full>
	);
};

// ===================================================================================================== CARTON WALL
/** CartonWall cell size (world px at s 1) and the carton scale inside a cell */
export const WALL = {cw: 236, ch: 380, cs: 0.82} as const;
/** where cell (col, row) of a CartonWall is on screen: carton anchor (bottom centre) + carton scale. Pass the same
 *  scroll / s / cx / cy as the wall. Cell (0, 0) sits at (cx, cy) with no scroll. */
export const cartonWallCell = (col: number, row: number, o: {scroll?: [number, number]; s?: number; cx?: number; cy?: number} = {}) => {
	const {scroll = [0, 0], s = 1, cx = 540, cy = 860} = o;
	return {x: cx + (col * WALL.cw - scroll[0]) * s, y: cy + (row * WALL.ch - scroll[1]) * s, s: WALL.cs * s};
};
/**
 * An endless wall of milk cartons on shelves, full frame — every carton shows a different generic drawn child (b/w print),
 * never a real missing kid. scroll = world offset [x, y] px (default [0, 80·t]: it keeps scrolling up), s = zoom (0.4 =
 * pull back, hundreds of cartons), grey 0..1 = rows dim to grey one by one from the top, keep = [col, row] of the one carton
 * that keeps its colour (keepGlow 0..1 orange halo). Use cartonWallCell() to find that carton on screen.
 */
export const CartonWall: React.FC<{t: number; scroll?: [number, number]; s?: number; cx?: number; cy?: number; grey?: number; keep?: [number, number] | null; keepGlow?: number; faces?: FaceFill; header?: CartonHeader} & Tone> = ({
	t, scroll, s = 1, cx = 540, cy = 860, grey = 0, keep = null, keepGlow = 0, faces = 'kids', header = 'squiggle', ...tone
}) => {
	const sc: [number, number] = scroll ?? [0, t * 80];
	const cw = WALL.cw * s, ch = WALL.ch * s;
	const c0 = Math.floor(-cx / cw + sc[0] / WALL.cw) - 1, c1 = Math.ceil((1080 - cx) / cw + sc[0] / WALL.cw) + 1;
	const r0 = Math.floor(-cy / ch + sc[1] / WALL.ch), r1 = Math.ceil((1920 - cy) / ch + sc[1] / WALL.ch) + 1;
	const thr = lerp(-ch, 1920 + ch, clamp01(grey));
	const rows: React.ReactNode[] = [];
	for (let r = r0; r <= r1; r++) {
		const ry = cy + (r * WALL.ch - sc[1]) * s;
		const gRow = clamp01((thr - (ry - 150 * s)) / (ch * 0.35));
		const cells: React.ReactNode[] = [];
		for (let c = c0; c <= c1; c++) {
			const isKeep = !!keep && keep[0] === c && keep[1] === r;
			const g = isKeep ? 0 : gRow;
			const seed = c * 31 + r * 17 + 5;
			const face = faces === 'kids' ? <KidFaceG w={CARTON.slot.w} h={CARTON.slot.h} seed={seed} grey={g} raster={s >= 0.6} /> : faceNode(faces, c * 1000 + r, seed, g);
			cells.push(<CartonG key={c} x={cx + (c * WALL.cw - sc[0]) * s} y={ry} s={WALL.cs * s} side={0} hue={Math.floor(h1(c * 3.7 + r * 1.3) * 4)} header={header} face={face} grey={g} glow={isKeep ? keepGlow : 0} seed={seed} lw={6} />);
		}
		rows.push(
			<g key={r}>
				<rect x={-10} y={ry} width={1100} height={34 * s} fill={greyC('#9fb0bf', gRow)} stroke={INK} strokeWidth={Math.max(2, 5 * s)} />
				{cells}
			</g>,
		);
	}
	// keep carton drawn last so its halo is never covered
	return (
		<Full bg="#16202c" {...tone}>
			<Svg>
				{rows}
				{keep ? (() => {
					const k = cartonWallCell(keep[0], keep[1], {scroll: sc, s, cx, cy});
					const seed = keep[0] * 31 + keep[1] * 17 + 5;
					const face = faces === 'kids' ? <KidFaceG w={CARTON.slot.w} h={CARTON.slot.h} seed={seed} raster={s >= 0.6} /> : faceNode(faces, keep[0] * 1000 + keep[1], seed, 0);
					return <CartonG x={k.x} y={k.y} s={k.s} side={0} hue={Math.floor(h1(keep[0] * 3.7 + keep[1] * 1.3) * 4)} header={header} face={face} glow={keepGlow} seed={seed} lw={6} />;
				})() : null}
			</Svg>
		</Full>
	);
};

// ===================================================================================================== DAD SYMBOLS
/**
 * An empty checked jacket hung on the back of a wooden chair (seen from behind) — the dad as a sign, nobody in it.
 * (x, y) = floor under the chair, ~460 × 1000 at s 1. The sleeves sway a little (sway 0..1). Desaturate via the scene.
 */
export const JacketChair: React.FC<{x: number; y: number; s?: number; t?: number; sway?: number; flip?: boolean}> = ({x, y, s = 1, t = 0, sway = 1, flip}) => {
	const sid = useSid('jc');
	const a = Math.sin(t * 1.6) * 2.4 * sway, b = Math.sin(t * 1.6 + 0.8) * 1.8 * sway;
	const wood = '#8a5a32', woodD = '#6a4226';
	const plaid = `url(#${sid}p)`;
	return (
		<Fig x={x} y={y} s={s} vb={[-300, -1040, 600, 1080]} flip={flip}>
			<PlaidDefs id={`${sid}p`} size={60} />
			<ellipse cx={0} cy={4} rx={260} ry={22} fill="rgba(0,0,0,0.25)" />
			{/* chair */}
			<rect x={-220} y={-396} width={30} height={396} fill={woodD} stroke={INK} strokeWidth={5} />
			<rect x={190} y={-396} width={30} height={396} fill={woodD} stroke={INK} strokeWidth={5} />
			<rect x={-200} y={-180} width={400} height={18} fill={woodD} stroke={INK} strokeWidth={4} />
			<rect x={-170} y={-930} width={34} height={930} fill={wood} stroke={INK} strokeWidth={5} />
			<rect x={136} y={-930} width={34} height={930} fill={wood} stroke={INK} strokeWidth={5} />
			<polygon points={pts([[-200, -470], [200, -470], [232, -430], [-232, -430]])} fill={wood} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			<rect x={-232} y={-430} width={464} height={34} fill={woodD} stroke={INK} strokeWidth={5} />
			<rect x={-196} y={-950} width={392} height={60} rx={24} fill={wood} stroke={INK} strokeWidth={6} />
			{/* jacket body over the top rail */}
			<path d="M-205,-930 Q-215,-960 -150,-968 L150,-968 Q215,-960 205,-930 L198,-560 Q180,-520 120,-520 L-120,-520 Q-180,-520 -198,-560 Z" fill={plaid} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
			<path d="M60,-960 Q190,-940 196,-600 L198,-560 Q180,-520 120,-520 L60,-520 Z" fill="#000" opacity={0.16} />
			<path d="M-80,-968 Q0,-938 80,-968 L62,-994 Q0,-972 -62,-994 Z" fill={PLAID.dark} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			<line x1={0} y1={-936} x2={0} y2={-640} stroke={PLAID.dark} strokeWidth={5} opacity={0.7} />
			<path d="M0,-640 L-14,-522 M0,-640 L14,-522" stroke={PLAID.dark} strokeWidth={4} opacity={0.6} />
			<path d="M-180,-760 Q-150,-740 -170,-700 M170,-820 Q140,-800 160,-760" stroke={INK} strokeWidth={4} fill="none" opacity={0.35} />
			{/* sleeves */}
			<g transform={`rotate(${a.toFixed(2)} -200 -930)`}>
				<path d="M-206,-930 Q-240,-900 -240,-820 L-236,-480 Q-234,-456 -212,-456 L-178,-456 Q-168,-462 -170,-484 L-178,-840 Z" fill={plaid} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<rect x={-238} y={-500} width={68} height={44} rx={10} fill={plaid} stroke={INK} strokeWidth={5} />
				<rect x={-238} y={-500} width={68} height={44} rx={10} fill="#000" opacity={0.2} />
			</g>
			<g transform={`rotate(${b.toFixed(2)} 200 -930)`}>
				<path d="M206,-930 Q240,-900 240,-820 L236,-480 Q234,-456 212,-456 L178,-456 Q168,-462 170,-484 L178,-840 Z" fill={plaid} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
				<rect x={170} y={-500} width={68} height={44} rx={10} fill={plaid} stroke={INK} strokeWidth={5} />
				<rect x={170} y={-500} width={68} height={44} rx={10} fill="#000" opacity={0.28} />
			</g>
		</Fig>
	);
};

const PAGE_MARK = [PAL.stamp, PAL.teal, PAL.orange, '#2c6fb0'];
/**
 * A tear-off wall calendar WITHOUT digits (x, y = the nail; ~340 × 540 at s 1): orange header, each page a big ring and a
 * blank week grid. pages = how many pages have been torn (float: the fractional part = the top page curling off and
 * flying away). Animate pages 0 → 6 for «time passes».
 */
export const TearCalendar: React.FC<{x: number; y: number; s?: number; pages?: number}> = ({x, y, s = 1, pages = 0}) => {
	const torn = Math.max(0, Math.floor(pages)), fr = Math.max(0, pages - torn);
	const page = (i: number) => (
		<g>
			<rect x={-150} y={140} width={300} height={370} fill="#fffaf0" stroke={INK} strokeWidth={4} />
			<circle cx={0} cy={290} r={78} fill="none" stroke={PAGE_MARK[i % 4]} strokeWidth={18} />
			<circle cx={0} cy={290} r={20} fill={PAGE_MARK[i % 4]} />
			{Array.from({length: 14}, (_, k) => <rect key={k} x={-128 + (k % 7) * 37} y={414 + Math.floor(k / 7) * 36} width={30} height={26} rx={4} fill="#d9d4c7" />)}
		</g>
	);
	const k = clamp01(fr);
	return (
		<Fig x={x} y={y} s={s} vb={[-640, -40, 1100, 1000]}>
			<path d="M-90,60 L0,0 L90,60" stroke={INK} strokeWidth={4} fill="none" />
			<circle cx={0} cy={0} r={9} fill="#5b6068" stroke={INK} strokeWidth={3} />
			<rect x={-170} y={40} width={340} height={500} rx={14} fill="#6a4a32" stroke={INK} strokeWidth={6} />
			<line x1={-150} y1={514} x2={150} y2={514} stroke="#e8e0cc" strokeWidth={4} />
			<line x1={-150} y1={520} x2={150} y2={520} stroke="#d8cfb8" strokeWidth={4} />
			{page(fr > 0 ? torn + 1 : torn)}
			{torn > 0 ? <path d={`M-150,140 ${Array.from({length: 15}, (_, i) => `L${-150 + (i + 0.5) * 20},${i % 2 ? 140 : 154} L${-150 + (i + 1) * 20},140`).join(' ')} Z`} fill="#fffaf0" stroke={INK} strokeWidth={2} /> : null}
			<rect x={-150} y={60} width={300} height={80} rx={8} fill={PAL.orange} stroke={INK} strokeWidth={5} />
			{Array.from({length: 6}, (_, i) => <ellipse key={i} cx={-100 + i * 40} cy={62} rx={8} ry={16} fill="none" stroke={INK} strokeWidth={4} />)}
			{fr > 0 ? (
				<g opacity={1 - clamp01((k - 0.6) / 0.4)} transform={`translate(${(-k * 420).toFixed(1)} ${(-k * 160 + k * k * 560).toFixed(1)}) rotate(${(-k * 75).toFixed(1)} -150 140)`}>
					{page(torn)}
					{k < 0.3 ? <polygon points={pts([[150 - 200 * k, 510], [150, 510 - 200 * k], [150 - 200 * k, 510 - 200 * k]])} fill="#e8e0cc" stroke={INK} strokeWidth={3} /> : null}
				</g>
			) : null}
		</Fig>
	);
};

const FLYERS = [
	{y: -1340, r: -4, c: '#fffaf0'},
	{y: -900, r: 3, c: '#fff3b0'},
	{y: -460, r: -2, c: '#e3f1fb'},
];
/**
 * A wooden pole with «missing» flyers stapled on (x, y = pole foot; ~600 × 1760 at s 1): blank red header band, a b/w photo
 * of a generic child (faces), squiggle lines, tear-off tabs fluttering in the wind (t). Nothing readable on them.
 */
export const FlyerPole: React.FC<{x: number; y: number; s?: number; t?: number; faces?: FaceFill; n?: number}> = ({x, y, s = 1, t = 0, faces = 'kids', n = 3}) => (
	<Fig x={x} y={y} s={s} vb={[-300, -1780, 600, 1800]}>
		<rect x={-44} y={-1780} width={88} height={1780} fill="#7a5233" stroke={INK} strokeWidth={6} />
		{Array.from({length: 7}, (_, i) => <path key={i} d={`M${-30 + i * 10},-1770 Q${-26 + i * 10 + Math.sin(i) * 6},-900 ${-30 + i * 10},0`} stroke="#5e3e25" strokeWidth={3} fill="none" opacity={0.6} />)}
		{[-1560, -260].map((by) => <rect key={by} x={-50} y={by} width={100} height={26} fill="#8a929c" stroke={INK} strokeWidth={4} />)}
		{[[-30, -1420], [20, -1080], [-10, -700], [24, -380]].map(([px, py], i) => <polygon key={i} points={pts([[px, py], [px + 34, py - 6], [px + 26, py + 22], [px + 4, py + 30]])} fill="#efe6d2" stroke={INK} strokeWidth={2} />)}
		{FLYERS.slice(0, n).map((f, i) => {
			const fl = Math.sin(t * 3.1 + i * 1.7) * 9;
			const node = faces === 'empty' ? null : typeof faces === 'function' ? faces(i, 125, 150) : <KidFaceG w={125} h={150} seed={i * 13 + 41} />;
			return (
				<g key={i} transform={`translate(0 ${f.y}) rotate(${(f.r + Math.sin(t * 2.3 + i) * 0.8).toFixed(2)})`}>
					<path d={`M-150,-170 L150,-170 L${150 + fl},170 L${-150 + fl * 0.6},170 Z`} fill={f.c} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
					<rect x={-150} y={-170} width={300} height={48} fill={PAL.stamp} stroke={INK} strokeWidth={4} />
					<rect x={-62} y={-110} width={125} height={150} fill="#d9d9d9" stroke={INK} strokeWidth={4} />
					{node ? <g transform="translate(-62 -110)">{node}</g> : null}
					<rect x={-62} y={-110} width={125} height={150} fill="none" stroke={INK} strokeWidth={4} />
					{[[70, 110], [96, 80], [122, 96]].map(([yy, w], j) => <path key={j} d={squiggle(-w, w, yy, i * 7 + j * 3 + 1, 4)} stroke="#4a4a4a" strokeWidth={3.4} fill="none" strokeLinecap="round" />)}
					{Array.from({length: 7}, (_, j) => {
						if (h1(i * 5.3 + j * 2.1) > 0.78) return null;
						const tx = -140 + j * 40 + fl * 0.8;
						return <rect key={j} x={tx} y={170} width={34} height={60} fill={f.c} stroke={INK} strokeWidth={3} transform={`rotate(${(Math.sin(t * 6 + j + i) * 8).toFixed(2)} ${tx + 17} 170)`} />;
					})}
					<path d="M-136,-178 l24,0 M112,-178 l24,0" stroke="#5b6068" strokeWidth={5} strokeLinecap="round" />
				</g>
			);
		})}
	</Fig>
);

const ENV = ['#fffaf0', '#f3ead6', '#e3f1fb', '#fff3e0'];
/**
 * A pile of letters seen from above at a slant (x, y = the bottom of the pile; ~420 × 360 at s 1): envelopes with stamps
 * (icons, no text), postmark rings with waves, address squiggles. n = how many; drop = age since the top one landed (it
 * falls in and bounces) — animate n up with a drop per letter.
 */
export const LetterStack: React.FC<{x: number; y: number; s?: number; n?: number; drop?: number}> = ({x, y, s = 1, n = 7, drop}) => {
	const env = (i: number, dy: number, rot: number) => (
		<g key={i} transform={`translate(${((h1(i * 1.7) - 0.5) * 50).toFixed(1)} ${(-i * 14 + dy).toFixed(1)}) rotate(${rot.toFixed(2)})`}>
			<rect x={-180} y={-120} width={360} height={220} rx={8} fill={pick(ENV, h1(i * 3.3))} stroke={INK} strokeWidth={5} />
			<rect x={96} y={-106} width={60} height={70} fill="#fffaf0" stroke={INK} strokeWidth={3} strokeDasharray="6 4" />
			<rect x={104} y={-98} width={44} height={54} fill={pick(PAGE_MARK, h1(i * 5.1))} />
			<path d="M126,-58 Q106,-72 114,-86 Q122,-92 126,-82 Q130,-92 138,-86 Q146,-72 126,-58 Z" fill="#fffaf0" />
			<circle cx={62} cy={-62} r={30} fill="none" stroke="#6a6a6a" strokeWidth={3} />
			<path d={squiggle(30, 150, -50, i * 3 + 2, 3)} stroke="#6a6a6a" strokeWidth={2.5} fill="none" />
			{[[-10, 140], [20, 120], [48, 90]].map(([yy, w], j) => <path key={j} d={squiggle(-110, -110 + w, yy, i * 11 + j, 3.6)} stroke="#4a4a4a" strokeWidth={3.2} fill="none" strokeLinecap="round" />)}
		</g>
	);
	const N = Math.max(0, Math.floor(n));
	const items: React.ReactNode[] = [];
	for (let i = 0; i < N; i++) {
		const rot = (h1(i * 2.9) - 0.5) * 18;
		if (i === N - 1 && drop !== undefined) {
			if (drop < 0) continue;
			const k = clamp01(drop / 0.32);
			const dy = -(1 - k * k) * 520 - Math.abs(wobble(drop - 0.32, 18, 7)) * 18 * (drop > 0.32 ? 1 : 0);
			items.push(env(i, dy, rot - (1 - k) * 28));
		} else items.push(env(i, 0, rot));
	}
	return (
		<Fig x={x} y={y} s={s} vb={[-320, -900, 640, 960]}>
			<ellipse cx={0} cy={20} rx={240} ry={36} fill="rgba(0,0,0,0.25)" />
			{items}
		</Fig>
	);
};

// ===================================================================================================== DOORFRAME + PAPER
/** Doorframe opening (frame px): x0 = the jamb she hides behind, x1 = the other jamb, top = lintel, floor = floor line */
export const DOOR = {x0: 330, x1: 770, top: 330, floor: 1480} as const;
/**
 * A doorway in a hall wall, full frame: a lit room beyond (window light, lamp glow, dust motes), the near wall with a
 * painted door casing and the left jamb's inner face, the hall floor in front with light spilling out of the doorway.
 * behind = node drawn in the opening, UNDER the wall (kit A's girl stands here; whatever is left of x0 hides behind the
 * jamb, so she can peek out with one eye); children = front layer (the dad seen from behind). far 0..1 = how bright.
 */
export const Doorframe: React.FC<{t: number; x0?: number; x1?: number; top?: number; floor?: number; behind?: React.ReactNode; children?: React.ReactNode; far?: number} & Tone> = ({
	t, x0 = DOOR.x0, x1 = DOOR.x1, top = DOOR.top, floor = DOOR.floor, behind, children, far = 1, ...tone
}) => {
	const sid = useSid('dr');
	const ff = floor - 70;
	const br = 0.92 + 0.08 * Math.sin(t * 1.3);
	return (
		<Full bg="#c9b48f" {...tone}>
			<Svg>
				<defs>
					<radialGradient id={`${sid}l`} cx="50%" cy="50%" r="50%">
						<stop offset="0" stopColor="#fff4c8" stopOpacity={0.9} />
						<stop offset="1" stopColor="#fff4c8" stopOpacity={0} />
					</radialGradient>
				</defs>
				<rect x={0} y={0} width={1080} height={ff} fill={mixC('#b9a27c', '#f6e7c4', far * br)} />
				<rect x={0} y={ff} width={1080} height={1920 - ff} fill={mixC('#8a6a4a', '#c9a27a', far)} />
				<line x1={0} y1={ff} x2={1080} y2={ff} stroke={INK} strokeWidth={4} />
				<rect x={x0 + 150} y={top + 110} width={260} height={360} fill="#e9f6ff" stroke={INK} strokeWidth={6} />
				<line x1={x0 + 280} y1={top + 110} x2={x0 + 280} y2={top + 470} stroke="#fffaf0" strokeWidth={10} />
				<path d={`M${x0 + 130},${top + 90} L${x0 + 200},${top + 90} Q${x0 + 190 + Math.sin(t * 1.5) * 6},${top + 300} ${x0 + 206},${top + 500} L${x0 + 130},${top + 500} Z`} fill={PAL.teal} stroke={INK} strokeWidth={4} />
				<ellipse cx={x0 + 300} cy={top + 300} rx={360} ry={420} fill={`url(#${sid}l)`} opacity={0.6 * far} />
				{Array.from({length: 14}, (_, i) => {
					const u = wrap(h1(i * 2.3) + t * 0.03 * (0.5 + h1(i)), 1);
					return <circle key={i} cx={lerp(x0 + 40, x1 - 30, h1(i * 4.1)) + Math.sin(t + i) * 10} cy={lerp(floor - 40, top + 40, u)} r={2.5 + 2 * h1(i * 7.7)} fill="#fff8dc" opacity={0.6 * far} />;
				})}
			</Svg>
			{behind}
			<Svg>
				<path d={`M0,0 L1080,0 L1080,${floor} L0,${floor} Z M${x0},${top} L${x0},${floor} L${x1},${floor} L${x1},${top} Z`} fill="#c9b48f" fillRule="evenodd" />
				{Array.from({length: 18}, (_, i) => {
					const sx = i * 64;
					return sx > x0 - 50 && sx < x1 + 50 ? null : <rect key={i} x={sx} y={0} width={22} height={floor} fill="#bda57d" />;
				})}
				<rect x={x0 - 30} y={top - 30} width={x1 - x0 + 60} height={14} fill="#bda57d" />
				<polygon points={pts([[x0, top], [x0 + 30, top + 18], [x0 + 30, floor - 4], [x0, floor]])} fill="#ded2bd" stroke={INK} strokeWidth={3} />
				<polygon points={pts([[x0, top], [x1, top], [x1, top + 18], [x0 + 30, top + 18]])} fill="#d2c5ad" stroke={INK} strokeWidth={3} />
				<rect x={x0 - 46} y={top - 46} width={46} height={floor - top + 46} fill="#f4ede0" stroke={INK} strokeWidth={5} />
				<rect x={x1} y={top - 46} width={46} height={floor - top + 46} fill="#f4ede0" stroke={INK} strokeWidth={5} />
				<rect x={x0 - 46} y={top - 46} width={x1 - x0 + 92} height={46} fill="#f4ede0" stroke={INK} strokeWidth={5} />
				<rect x={0} y={floor} width={1080} height={1920 - floor} fill="#a9825a" />
				{Array.from({length: 11}, (_, i) => {
					const bx = i * 130 - 110;
					return <line key={i} x1={540 + (bx - 540) * 0.55} y1={floor} x2={bx + (bx - 540) * 0.5} y2={1920} stroke="#8a6a4a" strokeWidth={4} />;
				})}
				<rect x={0} y={floor - 26} width={x0 - 46} height={26} fill="#f4ede0" stroke={INK} strokeWidth={4} />
				<rect x={x1 + 46} y={floor - 26} width={1080 - x1 - 46} height={26} fill="#f4ede0" stroke={INK} strokeWidth={4} />
				<rect x={x0} y={floor - 6} width={x1 - x0} height={14} fill="#8a6a4a" stroke={INK} strokeWidth={3} />
				<line x1={0} y1={floor} x2={1080} y2={floor} stroke={INK} strokeWidth={5} />
			</Svg>
			<div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', pointerEvents: 'none', opacity: far}}>
				<Svg>
					<polygon points={pts([[x0, floor], [x1, floor], [x1 + 260, 1920], [x0 - 140, 1920]])} fill="#ffe9b0" opacity={0.28 * br} />
				</Svg>
			</div>
			{children}
		</Full>
	);
};

/**
 * A plain paper backdrop for flashbacks, full frame: warm grey (tone 'grey'), 'sepia' or 'cool', paper fibres, film-grain
 * specks re-seeded 12× a second (grain 0..1), a slow light drift and a vignette. No room, no place — a stage for symbols.
 */
export const PaperBackdrop: React.FC<{t: number; tone?: 'grey' | 'sepia' | 'cool'; grain?: number} & Tone> = ({t, tone: pt = 'grey', grain = 1, ...tone}) => {
	const sid = useSid('pb');
	const base = pt === 'sepia' ? '#d8bf96' : pt === 'cool' ? '#c3cbd3' : '#cfc8bb';
	const dark = mixC(base, '#000000', 0.35);
	const f = Math.floor(t * 12);
	return (
		<Full bg={base} {...tone}>
			<Svg>
				<defs>
					<radialGradient id={`${sid}v`} cx="50%" cy="45%" r="72%">
						<stop offset="0.5" stopColor="#000" stopOpacity={0} />
						<stop offset="1" stopColor="#000" stopOpacity={0.5} />
					</radialGradient>
					<radialGradient id={`${sid}l`} cx="50%" cy="50%" r="50%">
						<stop offset="0" stopColor="#ffffff" stopOpacity={0.3} />
						<stop offset="1" stopColor="#ffffff" stopOpacity={0} />
					</radialGradient>
				</defs>
				<ellipse cx={540 + Math.sin(t * 0.4) * 120} cy={800 + Math.cos(t * 0.3) * 80} rx={700} ry={820} fill={`url(#${sid}l)`} />
				{Array.from({length: 60}, (_, i) => {
					const fx = h1(i * 3.3) * 1080, fy = h1(i * 5.7) * 1920, a = h1(i * 7.1) * Math.PI;
					const l = 20 + 40 * h1(i * 1.9);
					return <path key={i} d={`M${fx},${fy} q${Math.cos(a) * l * 0.5 + 6},${Math.sin(a) * l * 0.5 - 6} ${Math.cos(a) * l},${Math.sin(a) * l}`} stroke={dark} strokeWidth={1.6} fill="none" opacity={0.16} />;
				})}
				{grain > 0
					? Array.from({length: 140}, (_, i) => (
							<circle key={i} cx={h1(i * 3.1 + f * 0.37) * 1080} cy={h1(i * 7.3 + f * 0.71) * 1920} r={1 + 2.2 * h1(i * 1.3 + f)} fill={h1(i + f * 0.13) > 0.5 ? dark : '#ffffff'} opacity={0.35 * grain} />
						))
					: null}
				<rect x={0} y={0} width={1080} height={1920} fill={`url(#${sid}v)`} />
			</Svg>
		</Full>
	);
};
