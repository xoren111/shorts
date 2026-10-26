import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {ANTON, MONT} from '../fonts';
import {W} from '../lib/time';
import {GOLD, MAGENTA, TEAL, XF, Label, Layer, clamp01, easeInOut, easeOut, goldFill, h1, lerp, pop, useT} from '../ui/gfx';

// Photo / graphic inserts, STYLE v3 (owner notes 18.10, round 3): every insert cross-dissolves in over XF on top of the
// previous shot and stays fully visible for XF after its window (the next shot dissolves in on top of it). No chips,
// stamps, headlines, counters, flashes, punch-ins or rotation; gentle Ken Burns (≤ 8 %); at most ONE label besides the
// subtitle, never repeating what the voice says; credits small, at the bottom, one at a time. Our own look stays: bright
// brand colours (teal / magenta / gold on deep purple), glow, steam, real photos with punchy contrast.

// insert windows (absolute s) — the same word anchors as T in src/Short.tsx
const WIN = {
	trip: [W(7), 6.42] as const,
	patton: [W(28), W(32)] as const,
	dispute: [W(39), W(47) - 0.65] as const,
	spray: [W(104), W(109)] as const,
	months: [W(112), W(114)] as const,
	liters: [W(114), W(119)] as const,
	harbor: [W(129), W(138)] as const,
	final: W(138),
};

const YELLOW = '#FFD54A';

// ------------------------------------------------------------ shared helpers
/** DOM steam puffs rising over a photo (deterministic, slow, no twinkle) */
export const DomSteam: React.FC<{n: number; seed: number; x0: number; x1: number; y: number; size?: number; alpha?: number; rise?: number}> = ({n, seed, x0, x1, y, size = 380, alpha = 0.35, rise = 520}) => {
	const t = useT();
	const out: React.ReactNode[] = [];
	for (let i = 0; i < n; i++) {
		const life = 2.5 + h1(seed + i) * 2;
		const ph = h1(seed + i * 2.3) * life;
		const k = ((t + ph) % life) / life;
		const x = lerp(x0, x1, h1(seed + i * 4.1)) + k * 60;
		const s = size * (0.6 + k * 1.2);
		const a = Math.sin(Math.PI * k) * alpha;
		out.push(
			<div key={i} style={{position: 'absolute', left: x - s / 2, top: y - k * rise - s / 2, width: s, height: s, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,250,245,${a}) 0%, rgba(240,235,255,${a * 0.5}) 40%, rgba(240,235,255,0) 70%)`, filter: 'blur(6px)'}} />,
		);
	}
	return <AbsoluteFill>{out}</AbsoluteFill>;
};

// ------------------------------------------------------------ local building blocks
/** never-static ease: mostly ease-in-out, with a linear share so a move keeps going through the cross-dissolves */
const glide = (k: number) => lerp(clamp01(k), easeInOut(k), 0.6);

/** Ken Burns frame: the source-pixel point (cx, cy) sits at the frame centre, z = zoom over «cover» */
type Frame = {cx: number; cy: number; z: number};
type PhotoSpec = {src: string; iw: number; ih: number; from: Frame; to: Frame; t0: number; t1: number};

/** cover-fit an iw×ih image into a bw×bh box at zoom z, source point (cx, cy) at the box centre (clamped to the edges) */
type Fit = {s: number; left: number; top: number};
const fitBox = (iw: number, ih: number, bw: number, bh: number, f: Frame): Fit => {
	const s = Math.max(bw / iw, bh / ih) * f.z;
	return {s, left: Math.min(0, Math.max(bw - iw * s, bw / 2 - f.cx * s)), top: Math.min(0, Math.max(bh - ih * s, bh / 2 - f.cy * s))};
};
const lerpFrame = (a: Frame, b: Frame, k: number): Frame => ({cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k)});

/** an image placed by a Fit (transform only → sub-pixel smooth) */
const CropImg: React.FC<{src: string; iw: number; ih: number; fit: Fit; filter?: string}> = ({src, iw, ih, fit, filter}) => (
	<Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: 0, width: iw, height: ih, maxWidth: 'none', transformOrigin: '0 0', transform: `translate(${fit.left}px, ${fit.top}px) scale(${fit.s})`, filter}} />
);

const kbAt = (p: PhotoSpec, t: number) => {
	const k = glide((t - p.t0) / Math.max(0.1, p.t1 - p.t0));
	const z = lerp(p.from.z, p.to.z, k);
	const cx = lerp(p.from.cx, p.to.cx, k);
	const cy = lerp(p.from.cy, p.to.cy, k);
	const s0 = Math.max(1080 / p.iw, 1920 / p.ih);
	const s = s0 * z;
	const left = Math.min(0, Math.max(1080 - p.iw * s, 540 - cx * s));
	const top = Math.min(0, Math.max(1920 - p.ih * s, 960 - cy * s));
	/** source px → screen px */
	const map = (x: number, y: number): [number, number] => [left + x * s, top + y * s];
	return {s0, s, left, top, map};
};

/** full-frame photo with a slow Ken Burns move (transform only → sub-pixel smooth), grade or warm gradient map, vignette */
const PhotoFill: React.FC<{p: PhotoSpec; grade?: string; warm?: WarmSpec; tint?: string; vignette?: number}> = ({p, grade = 'contrast(1.1) saturate(1.1)', warm, tint, vignette = 0.7}) => {
	const t = useT();
	const r = kbAt(p, t);
	const img = (
		<Img
			src={staticFile(p.src)}
			style={{position: 'absolute', left: 0, top: 0, width: p.iw * r.s0, height: p.ih * r.s0, maxWidth: 'none', transformOrigin: '0 0', transform: `translate(${r.left}px, ${r.top}px) scale(${r.s / r.s0})`, filter: warm ? undefined : grade}}
		/>
	);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#05020f'}}>
			{warm ? <WarmScan w={warm}>{img}</WarmScan> : img}
			{!warm && tint ? <AbsoluteFill style={{background: tint, mixBlendMode: 'multiply'}} /> : null}
			<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(5,0,20,${vignette}) 100%)`}} />
		</AbsoluteFill>
	);
};


/**
 * Gradient map (SVG filter, used as CSS `filter: url(#id)`): grayscale → levels stretch [lo, hi] → colour ramp. Unlike a
 * multiply/screen duotone it gives the low-contrast archive scans real depth: the halftone USGS print of Heimaey spans only
 * ≈ 0.38 – 0.9 in luminance, so without the stretch the steam stays a pale wash and the dark slope a grey-violet.
 */
type RGB = [number, number, number];
const gradTables = (stops: [number, RGB][], lo: number, hi: number, n = 33) => {
	const ch: number[][] = [[], [], []];
	for (let i = 0; i < n; i++) {
		const L = clamp01((i / (n - 1) - lo) / (hi - lo));
		let k = 0;
		while (k < stops.length - 2 && L > stops[k + 1][0]) k++;
		const [a, ca] = stops[k];
		const [b, cb] = stops[k + 1];
		const u = clamp01((L - a) / (b - a));
		for (let c = 0; c < 3; c++) ch[c].push(+(lerp(ca[c], cb[c], u) / 255).toFixed(4));
	}
	return ch.map((x) => x.join(' '));
};
const GradMap: React.FC<{id: string; stops: [number, RGB][]; lo: number; hi: number}> = ({id, stops, lo, hi}) => {
	const [r, g, b] = gradTables(stops, lo, hi);
	return (
		<svg width={0} height={0} style={{position: 'absolute', left: 0, top: 0}} aria-hidden>
			<filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
				<feColorMatrix type="saturate" values="0" />
				<feComponentTransfer>
					<feFuncR type="table" tableValues={r} />
					<feFuncG type="table" tableValues={g} />
					<feFuncB type="table" tableValues={b} />
				</feComponentTransfer>
			</filter>
		</svg>
	);
};
/** the Heimaey seawater photo: deep navy slope → violet → blue → teal-cyan steam; the white jets read bright on the dark */
const ICE_MAP: [number, RGB][] = [
	[0, [5, 8, 42]],
	[0.25, [34, 16, 104]],
	[0.5, [44, 84, 186]],
	[0.75, [80, 200, 236]],
	[1, [232, 253, 255]],
];
const IceMap: React.FC = () => <GradMap id="iceMap" stops={ICE_MAP} lo={0.36} hi={0.88} />;

/**
 * the 1935 Hawaii scans (USAAC / USGS, B/W): the warm brand ramp deep indigo → violet → magenta → orange → cream, so the
 * dark lava slope goes deep indigo and the bomb burst / bright flow cream-orange (the old multiply/screen duotone left them a
 * pale lilac-pink wash). lo / hi = levels measured on each scan's on-screen crop (≈ p2 … p98 after the haze lift below).
 */
const WARM_MAP: [number, RGB][] = [
	[0, [14, 6, 52]],
	[0.3, [62, 22, 140]],
	[0.55, [196, 40, 140]],
	[0.8, [255, 140, 60]],
	[1, [255, 240, 205]],
];
type WarmSpec = {id: string; lo: number; hi: number; haze?: [number, number]};
const WARM = {
	/** hook panel, maunaloa_1935_bombing_2 around the burst: plain ≈ 0.67, burst ≈ 0.9 */
	hook: {id: 'warm35hook', lo: 0.36, hi: 0.92, haze: [0.2, 45]},
	/** Patton backdrop, maunaloa_1935_bomber_bombs: shadows ≈ 0.03, sunlit ground ≈ 0.8 */
	bombs: {id: 'warm35bombs', lo: 0.03, hi: 0.9},
	/** dispute photo, maunaloa_1935_bombing_1: slope ≈ 0.35, burst ≈ 0.9; the hazy top third (≈ 0.62) is lifted off first */
	dispute: {id: 'warm35disp', lo: 0.1, hi: 0.82, haze: [0.45, 45]},
} satisfies Record<string, WarmSpec>;

/**
 * children (a B/W scan) through a warm gradient map. `haze` = [darkening at the top, % where it ends]: atmospheric haze
 * makes the upper part of the aerial scans much brighter than the slope, so without it the sky maps to flat cream; a soft
 * dark gradient INSIDE the filtered group lowers it before the map (the sky then goes violet-magenta, the burst stays cream).
 */
const WarmScan: React.FC<{w: WarmSpec; children: React.ReactNode}> = ({w, children}) => (
	<>
		<GradMap id={w.id} stops={WARM_MAP} lo={w.lo} hi={w.hi} />
		<AbsoluteFill style={{overflow: 'hidden', filter: `url(#${w.id})`}}>
			{children}
			{w.haze ? <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,${w.haze[0]}) 0%, rgba(0,0,0,0) ${w.haze[1]}%)`}} /> : null}
		</AbsoluteFill>
	</>
);

/**
 * colourful backdrop behind a photo card, in the brand colours: deep blue at the top lit by a coloured halo (behind the
 * card's top edge / the label), deep purple in the middle, a magenta → orange lava glow from below. No grey photo wash
 * (a blurred grayscale copy screened over it lifted the whole frame to slate grey). The halo drifts a little (never static).
 */
const GlowBackdrop: React.FC<{t0: number; t1: number; halo?: string; glow?: string; haloY?: number}> = ({t0, t1, halo = '34,230,216', glow = '255,46,136', haloY = 22}) => {
	const t = useT();
	const k = glide((t - t0) / Math.max(0.1, t1 - t0));
	const hx = lerp(46, 54, k);
	const hy = haloY + lerp(-1.5, 1.5, k);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: 'linear-gradient(180deg, #082c74 0%, #1b1470 40%, #2e0d6a 70%, #4a0c5c 100%)'}}>
			<AbsoluteFill style={{background: `radial-gradient(ellipse 85% 30% at ${hx}% ${hy}%, rgba(${halo},0.72) 0%, rgba(${halo},0.24) 50%, rgba(${halo},0) 80%)`, mixBlendMode: 'screen'}} />
			<AbsoluteFill style={{background: `radial-gradient(ellipse 110% 34% at 50% 104%, rgba(${glow},0.8) 0%, rgba(255,120,40,0.42) 45%, rgba(${glow},0) 78%)`, mixBlendMode: 'screen'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 62%, rgba(5,0,20,0.35) 100%)'}} />
		</AbsoluteFill>
	);
};

/** photo card (white border, brand-colour glow): settles in over 0.55 s from tIn (fade, 18 px rise, 0.97 → 1), slow zoom inside.
 *  `crop` frames the photo by source pixels (Ken Burns from → to over [t0, t1]) instead of objectPosition + zoom. */
const Card: React.FC<{
	src: string;
	cx: number;
	cy: number;
	w: number;
	h: number;
	tIn: number;
	t0: number;
	t1: number;
	pos?: string;
	zoom?: [number, number];
	crop?: {iw: number; ih: number; from: Frame; to: Frame};
	grade?: string;
	glow?: string;
	children?: React.ReactNode;
}> = ({src, cx, cy, w, h, tIn, t0, t1, pos = '50% 50%', zoom = [1.0, 1.07], crop, grade, glow = 'rgba(255,150,50,0.45)', children}) => {
	const t = useT();
	if (t < tIn) return null;
	const k = easeOut((t - tIn) / 0.55);
	const kz = glide((t - t0) / Math.max(0.1, t1 - t0));
	const z = lerp(zoom[0], zoom[1], kz);
	const g = grade ?? 'contrast(1.12) saturate(1.2)';
	const B = 8;
	return (
		<div
			style={{
				position: 'absolute',
				left: cx - w / 2,
				top: cy - h / 2,
				width: w,
				height: h,
				boxSizing: 'border-box',
				opacity: k,
				transform: `translateY(${(1 - k) * 18}px) scale(${lerp(0.97, 1, k)})`,
				borderRadius: 20,
				overflow: 'hidden',
				border: `${B}px solid #fff`,
				boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 70px ${glow}`,
				background: '#000',
			}}
		>
			{crop ? (
				<CropImg src={src} iw={crop.iw} ih={crop.ih} fit={fitBox(crop.iw, crop.ih, w - 2 * B, h - 2 * B, lerpFrame(crop.from, crop.to, kz))} filter={g} />
			) : (
				<Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, filter: g, transform: `scale(${z})`}} />
			)}
			{children}
		</div>
	);
};

/** licence credit: small, bottom-left, one at a time (fades over 0.3 s inside [t0, t1]) */
const Credit: React.FC<{text: string; t0?: number; t1?: number}> = ({text, t0 = -1, t1 = 999}) => {
	const t = useT();
	const o = clamp01((t - t0) / 0.3) * clamp01((t1 - t) / 0.3);
	if (o <= 0) return null;
	return (
		<div style={{position: 'absolute', left: 32, maxWidth: 900, top: 1582, padding: '5px 12px', borderRadius: 10, background: 'rgba(8,3,20,0.55)', fontFamily: MONT, fontWeight: 700, fontSize: 22, lineHeight: 1.15, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.3, opacity: o}}>
			{text}
		</div>
	);
};

/**
 * Label with its own anchor dot + thin leader: the dot's ring expands ONCE when the label arrives (gfx Label's own ring
 * restarts every 1.6 s, which reads as blinking). The text itself is the shared calm `Label`.
 */
const AnchorLabel: React.FC<{text: string; x: number; y: number; dx?: number; dy?: number; t0: number; t1: number; size?: number}> = ({text, x, y, dx = 0, dy = -70, t0, t1, size = 54}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
	const k = easeOut((t - t0) / 0.35);
	const o = k * clamp01((t1 + 0.3 - t) / 0.3);
	const half = (text.length * size * 0.6) / 2;
	const lx = Math.max(70 + half, Math.min(1010 - half, x + dx));
	const ly = y + dy;
	const r = clamp01((t - t0) / 1.2);
	return (
		<>
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o, pointerEvents: 'none'}}>
				<line x1={x} y1={y} x2={lerp(x, lx, k)} y2={lerp(y, ly + size * 0.55, k)} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.85} style={{filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))'}} />
				<circle cx={x} cy={y} r={9} fill="#fff" style={{filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))'}} />
				{r < 1 ? <circle cx={x} cy={y} r={9 + 18 * easeOut(r)} fill="none" stroke="#fff" strokeWidth={2} opacity={0.6 * (1 - r)} /> : null}
			</svg>
			<Label text={text} t0={t0} t1={t1} x={lx} y={ly} size={size} />
		</>
	);
};

// ------------------------------------------------------------ HOOK triptych (3.52 – 6.42, dissolves under the globe)
// three real photos preview the three stories (the voice has not named them yet); on «craziest» the Iceland card takes the
// centre, framed on the seawater jets and the pump ships, and gets the one label the voice does not say: «Iceland 1973»
const ICE = {src: 'photos/heimaey_spray_1973.jpg', iw: 1478, ih: 1067};
// the narrow panel (the jets column) already shows the photo at ≈ 0.98 screen px per source px, the centred card at ≈ 1.0:
// growing into the card re-frames the photo (≈ +3 % magnification), it does not punch in
const ICE_PANEL: [Frame, Frame] = [
	{cx: 640, cy: 740, z: 1.27},
	{cx: 650, cy: 745, z: 1.31},
];
const ICE_CARD: [Frame, Frame] = [
	{cx: 660, cy: 760, z: 1.58},
	{cx: 675, cy: 770, z: 1.66},
]; // the centred card: jets + ships fill it
/** the 1935 panel: framed tight on the bomb burst (source ≈ 970, 700 of 1920 × 1458), slow 4 % push */
const HAW = {src: 'photos/maunaloa_1935_bombing_2.jpg', iw: 1920, ih: 1458};
const HAW_PANEL: [Frame, Frame] = [
	{cx: 965, cy: 730, z: 1.3},
	{cx: 975, cy: 725, z: 1.35},
];
const PANELS = [
	{src: HAW.src, glow: 'rgba(255,120,40,0.6)'},
	{src: 'photos/etna_1992_heli_block.jpg', glow: 'rgba(255,46,136,0.5)'},
	{src: ICE.src, glow: 'rgba(34,230,216,0.6)'},
];

export const Triptych: React.FC = () => {
	const t = useT();
	const [tA, tB] = WIN.trip;
	const tX = W(12) - 0.05; // «craziest»
	const ex = easeInOut((t - tX) / 0.8);
	let iceBox = {x: 0, y: 0, w: 0};
	return (
		<Layer t0={tA} t1={tB}>
			<IceMap />
			<AbsoluteFill style={{background: 'rgba(8,2,24,0.55)'}} />
			{PANELS.map((p, i) => {
				const ti = tA + i * 0.16; // one panel per swish (events.ts «triptych»: 0 / 0.16 / 0.32 s)
				if (t < ti) return null;
				const k = easeOut((t - ti) / 0.5);
				const ice = i === 2;
				let w = 313;
				let h = 820;
				let x = 50 + i * 333;
				let y = 150 + (1 - k) * 30;
				let o = k;
				if (ice) {
					w = lerp(313, 580, ex);
					h = lerp(820, 680, ex);
					x = lerp(x, 540 - w / 2, ex);
					y = lerp(y, 300, ex);
					iceBox = {x, y, w};
				} else {
					o *= 1 - ex;
					x += (i === 0 ? -50 : -25) * ex;
				}
				const kz = glide((t - ti) / (tB + XF - ti));
				const z = lerp(1.04, 1.1, kz);
				const iceFrame = lerpFrame(lerpFrame(ICE_PANEL[0], ICE_PANEL[1], kz), lerpFrame(ICE_CARD[0], ICE_CARD[1], kz), ex);
				return (
					<div
						key={p.src}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							width: w,
							height: h,
							opacity: o,
							borderRadius: 22,
							overflow: 'hidden',
							border: '6px solid #fff',
							boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 ${lerp(40, ice ? 70 : 40, ex)}px ${p.glow}`,
							background: '#000',
						}}
					>
						{ice ? (
							<CropImg src={ICE.src} iw={ICE.iw} ih={ICE.ih} fit={fitBox(ICE.iw, ICE.ih, w, h, iceFrame)} filter="url(#iceMap)" />
						) : i === 0 ? (
							<WarmScan w={WARM.hook}>
								<CropImg src={HAW.src} iw={HAW.iw} ih={HAW.ih} fit={fitBox(HAW.iw, HAW.ih, w, h, lerpFrame(HAW_PANEL[0], HAW_PANEL[1], kz))} />
							</WarmScan>
						) : (
							<Img src={staticFile(p.src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '70% 50%', filter: 'contrast(1.12) saturate(1.15)', transform: `scale(${z})`}} />
						)}
					</div>
				);
			})}
			{/* sits just above the Iceland card on the dark sky (on the bright steam it had no contrast), never over the jets */}
			<Label text="Iceland" accent="1973" t0={tX + 0.45} t1={tB} x={iceBox.x + iceBox.w / 2} y={iceBox.y - 46} size={48} />
		</Layer>
	);
};

// ------------------------------------------------------------ «Planned by… George Patton» (14.50 – 17.07)
// the real 1935 bombs under the wing, then Patton's real photo settles in as a card; the label adds his 1935 rank
export const PattonReveal: React.FC = () => {
	const t = useT();
	const [t0, t1] = WIN.patton;
	const tP = W(30) - 0.35; // the card is in place when «George» is spoken
	const bombs: PhotoSpec = {src: 'photos/maunaloa_1935_bomber_bombs.jpg', iw: 2188, ih: 1516, from: {cx: 760, cy: 930, z: 1.12}, to: {cx: 880, cy: 900, z: 1.2}, t0, t1: t1 + XF};
	const dim = easeInOut((t - tP) / 0.6);
	return (
		<Layer t0={t0} t1={t1}>
			<PhotoFill p={bombs} warm={WARM.bombs} vignette={0.5} />
			<AbsoluteFill style={{background: `rgba(6,2,16,${0.5 * dim})`}} />
			<CalmEmbers n={22} seed={11} />
			<Card src="photos/patton_1918.jpg" cx={540} cy={730} w={656} h={816} tIn={tP} t0={tP} t1={t1 + XF} pos="62% 40%" zoom={[1.02, 1.08]} grade="grayscale(1) contrast(1.25)" glow="rgba(255,200,58,0.6)" />
			{/* his rank at the time of the bombing (SCRIPT: «then-lieutenant colonel»); no year, so it never reads as the 1918 photo's date */}
			<Label text="Then a Lt. Colonel" t0={tP + 0.45} t1={t1} x={540} y={1212} size={50} />
			{/* one line for both photos: it fades in only after the raid credit of the previous shot (Hawaii.tsx, until 14.95) is gone */}
			<Credit text="Photos: K. Maehara / USGS; U.S. Army Signal Corps · public domain" t0={W(28) + 0.45} />
		</Layer>
	);
};

// ------------------------------------------------------------ «Scientists still argue…» (20.88 – 23.98)
// the effect of the bombing is HEAVILY DISPUTED (SCRIPT.md): shown as a balance that tips one way, then the other, and
// is level again when the globe takes over — never a verdict
const BalanceIcon: React.FC<{t0: number; tEnd: number; x: number; y: number; size?: number}> = ({t0, tEnd, x, y, size = 440}) => {
	const t = useT();
	if (t < t0) return null;
	const k = easeOut((t - t0) / 0.5);
	// one full swing in [t0, tEnd]: ✓ side down, then ✗ side down by the same amount, then it comes to rest LEVEL exactly at
	// tEnd and holds level through the globe dissolve (undecided — never leaning to «it worked»)
	const P = Math.max(1, tEnd - t0);
	const amp = 10 * easeOut((t - t0) / 0.5) * (1 - easeInOut((t - (tEnd - 0.45)) / 0.45));
	const th = ((-amp * Math.PI) / 180) * Math.sin((2 * Math.PI * (t - t0)) / P);
	const L = 112;
	const pan = (side: 1 | -1) => {
		const px = Math.cos(th) * side * L;
		const py = -88 + Math.sin(th) * side * L;
		const c = side < 0 ? TEAL : MAGENTA;
		return (
			<g key={side}>
				<line x1={px} y1={py} x2={px - 46} y2={py + 84} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
				<line x1={px} y1={py} x2={px + 46} y2={py + 84} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
				<path d={`M${px - 60} ${py + 84} Q${px} ${py + 134} ${px + 60} ${py + 84} Z`} fill={c} style={{filter: `drop-shadow(0 0 12px ${c})`}} />
				<circle cx={px} cy={py + 52} r={30} fill="#fff" stroke={c} strokeWidth={4} />
				{side < 0 ? (
					<path d={`M${px - 15} ${py + 52} L${px - 4} ${py + 63} L${px + 16} ${py + 40}`} fill="none" stroke="#0b9a90" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
				) : (
					<path d={`M${px - 12} ${py + 40} L${px + 12} ${py + 64} M${px + 12} ${py + 40} L${px - 12} ${py + 64}`} fill="none" stroke="#d1146a" strokeWidth={9} strokeLinecap="round" />
				)}
			</g>
		);
	};
	return (
		<svg
			width={size}
			height={size}
			viewBox="-190 -190 380 380"
			style={{position: 'absolute', left: x - size / 2, top: y - size / 2, opacity: k, transform: `translateY(${(1 - k) * 14}px) scale(${lerp(0.92, 1, k)})`, overflow: 'visible', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5))'}}
		>
			<defs>
				<radialGradient id="balanceDisc" cx="50%" cy="36%" r="66%">
					<stop offset="0" stopColor="#9a62ff" stopOpacity="0.96" />
					<stop offset="0.55" stopColor="#5f26c4" stopOpacity="0.95" />
					<stop offset="1" stopColor="#30107a" stopOpacity="0.95" />
				</radialGradient>
			</defs>
			<circle cx={0} cy={0} r={182} fill="url(#balanceDisc)" stroke={GOLD} strokeWidth={6} style={{filter: 'drop-shadow(0 0 30px rgba(255,170,50,0.65)) drop-shadow(0 0 60px rgba(255,46,136,0.35))'}} />
			<path d="M-64 136 L64 136 L44 114 L-44 114 Z" fill={GOLD} />
			<rect x={-6} y={-88} width={12} height={206} rx={5} fill={GOLD} />
			<g transform={`rotate(${(th * 180) / Math.PI} 0 -88)`}>
				<rect x={-L - 7} y={-95} width={2 * L + 14} height={14} rx={7} fill="#fff" />
			</g>
			{pan(-1)}
			{pan(1)}
			<circle cx={0} cy={-88} r={14} fill={GOLD} stroke="#fff" strokeWidth={4} />
		</svg>
	);
};

export const DisputePhoto: React.FC = () => {
	const [t0, t1] = WIN.dispute;
	const tI = W(43) + 0.05; // «the bombs»: the balance replaces the label
	const tEnd = W(47) - 0.7; // the globe (Short.tsx T.globeB) starts to dissolve in
	// framed so the burst (source ≈ 1380, 916) sits at y ≈ 870–900, below the balance (y 300–740); ≈ 6.7 % push
	const p: PhotoSpec = {src: 'photos/maunaloa_1935_bombing_1.jpg', iw: 2776, ih: 2091, from: {cx: 1360, cy: 1000, z: 1.2}, to: {cx: 1400, cy: 970, z: 1.28}, t0, t1: t1 + XF};
	return (
		<Layer t0={t0} t1={t1}>
			<PhotoFill p={p} warm={WARM.dispute} vignette={0.55} />
			{/* a plain caption (no anchor dot: it names the picture, not a spot on it), on the violet sky above the balance's place */}
			<Label text="Real Photo," accent="1935" t0={t0 + 0.1} t1={tI - 0.25} x={540} y={232} size={48} />
			<BalanceIcon t0={tI} tEnd={tEnd} x={540} y={520} size={440} />
			<Credit text="Photo: U.S. Army Air Corps / USGS, public domain" />
		</Layer>
	);
};

// ------------------------------------------------------------ Iceland photo inserts
// «So they fight a volcano…»: the USGS photo framed on what matters — the seawater jets hitting the lava front and the
// pump ships — big, high-contrast, with steam rising off the jets, on a colourful glow
// a wide card (the photo is landscape) so the crop is the band of the jets, not the white steam cloud above them:
// source px ≈ x 260–960, y 540–1000 = the jets (x 420–800, y 650–900), the dark slope and the pump ship's tower (x ≈ 900)
const SPRAY_CARD = {cx: 540, cy: 800, w: 1000, h: 660};
const SPRAY_CROP = {iw: ICE.iw, ih: ICE.ih, from: {cx: 610, cy: 770, z: 2.1}, to: {cx: 630, cy: 775, z: 2.22}}; // ≈ 6 % zoom
export const SprayPhoto: React.FC = () => {
	const t = useT();
	const [t0, t1] = WIN.spray;
	const c = SPRAY_CARD;
	const f = fitBox(ICE.iw, ICE.ih, c.w - 16, c.h - 16, lerpFrame(SPRAY_CROP.from, SPRAY_CROP.to, glide((t - t0) / (t1 + XF - t0))));
	const ox = c.cx - c.w / 2 + 8 + f.left;
	const oy = c.cy - c.h / 2 + 8 + f.top;
	return (
		<Layer t0={t0} t1={t1}>
			<GlowBackdrop t0={t0} t1={t1 + XF} haloY={21} />
			{/* deep tone (gradient map): the white jets stand out against the dark navy-violet slope; steam teal-cyan, not a pale wash */}
			<IceMap />
			<Card src={ICE.src} {...c} tIn={t0} t0={t0} t1={t1 + XF} crop={SPRAY_CROP} grade="url(#iceMap)" glow="rgba(34,230,216,0.6)" />
			{/* faint steam rising from where the jets hit the lava (their upper ends), above them — never over the jets */}
			<DomSteam n={7} seed={5} x0={ox + 420 * f.s} x1={ox + 760 * f.s} y={oy + 660 * f.s} size={200} alpha={0.18} rise={200} />
			<Credit text="Photo: U.S. Geological Survey, 1973" />
		</Layer>
	);
};

/** thin progress bar that fills left → right; faint ticks at the month boundaries (6 Feb … 10 Jul 1973 = 154 days) */
const ProgressBar: React.FC<{x0: number; x1: number; y: number; k: number; tIn: number; tOut?: number}> = ({x0, x1, y, k, tIn, tOut = 999}) => {
	const t = useT();
	// gone before the next key figure (7.3 billion liters) lands in the same spot
	const o = easeOut((t - tIn) / 0.4) * clamp01((tOut - t) / 0.25);
	const w = x1 - x0;
	const ticks = [23, 54, 84, 115, 145].map((d) => d / 154);
	return (
		<div style={{position: 'absolute', left: x0, top: y - 9, width: w, height: 18, opacity: o, transform: `translateY(${(1 - o) * 12}px)`}}>
			<div style={{position: 'absolute', inset: 0, borderRadius: 9, background: 'rgba(255,255,255,0.25)', boxShadow: '0 3px 12px rgba(0,0,0,0.5)'}} />
			<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(18, w * k), borderRadius: 9, background: `linear-gradient(90deg, #7ff3ff, ${TEAL})`, boxShadow: '0 0 18px rgba(34,230,216,0.6)'}} />
			{ticks.map((f) => (
				<div key={f} style={{position: 'absolute', left: w * f - 1.5, top: 3, width: 3, height: 12, borderRadius: 2, background: 'rgba(8,3,20,0.45)'}} />
			))}
		</div>
	);
};

// «Five months.»: the real colour photo of the pumping operation (a row of pumps and hoses on the quay, Eldfell erupting
// behind). The source is only 640 × 424 px, so the card stays near native size (≈ 1.3× at most).
const PUMPS = {src: 'photos/heimaey_pumping_eruption_1973.jpg', iw: 640, ih: 424};
const PUMPS_CROP = {iw: PUMPS.iw, ih: PUMPS.ih, from: {cx: 330, cy: 240, z: 1.0}, to: {cx: 350, cy: 232, z: 1.05}};
export const MonthsInsert: React.FC = () => {
	const t = useT();
	const [t0, t1] = WIN.months;
	const k = easeInOut((t - (t0 + 0.15)) / 1.05);
	return (
		<Layer t0={t0} t1={t1}>
			<GlowBackdrop t0={t0} t1={t1 + XF} halo="255,46,136" glow="255,120,40" haloY={20} />
			<Card src={PUMPS.src} cx={540} cy={880} w={860} h={570} tIn={t0} t0={t0} t1={t1 + XF} crop={PUMPS_CROP} grade="contrast(1.12) saturate(1.35) brightness(0.98)" glow="rgba(255,46,136,0.55)" />
			{/* «5 months / 6 Feb – 10 Jul 1973» is the key figure from Short.tsx (emph.ts) */}
			<ProgressBar x0={170} x1={910} y={512} k={k} tIn={t0 + 0.1} tOut={W(114) - 0.05} />
			{/* gone before the next insert's credit (same spot) fades in */}
			<Credit text="Photo: J. Lockwood, USGS" t1={W(114) - 0.05} />
		</Layer>
	);
};

/** soft steam puffs riding on the rising water surface (the seawater hits hot rock) */
const SurfaceSteam: React.FC<{top: number; wave: (x: number) => number; a: number}> = ({top, wave, a}) => {
	const t = useT();
	if (a <= 0) return null;
	return (
		<AbsoluteFill>
			{Array.from({length: 8}).map((_, i) => {
				const life = 2.2 + h1(31 + i) * 1.4;
				const k = ((((t + h1(37 + i * 1.7) * life) % life) + life) % life) / life;
				const x = 60 + h1(41 + i * 3.1) * 960 + k * 40;
				const s = 150 + h1(43 + i) * 120 + k * 130;
				const y = top + wave(x) - k * 150;
				const al = Math.sin(Math.PI * k) * 0.32 * a;
				return <div key={i} style={{position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,252,248,${al}) 0%, rgba(235,245,255,${al * 0.45}) 42%, rgba(235,245,255,0) 70%)`, filter: 'blur(5px)'}} />;
			})}
		</AbsoluteFill>
	);
};

/**
 * «Seven billion liters of seawater»: water rises like a gauge over the real lava field. Framed on the lava rocks and the
 * steam (not the town), and the level stops at the foot of the lava ridge (y ≈ 1000), below the distant buildings: the
 * seawater was sprayed on the lava — no house ever goes «under water».
 */
export const LitersGauge: React.FC = () => {
	const t = useT();
	const [t0, t1] = WIN.liters;
	const fill = easeOut((t - (t0 + 0.05)) / 1.6);
	const TOP = 1000;
	const top = lerp(1960, TOP, fill);
	const wave = (x: number) => Math.sin(x * 0.011 + t * 2.0) * 9 + Math.sin(x * 0.025 - t * 1.3) * 4;
	let surface = `M0 ${(top + wave(0)).toFixed(1)}`;
	for (let x = 20; x <= 1080; x += 20) surface += ` L${x} ${(top + wave(x)).toFixed(1)}`;
	const d = `M0 1920 L${surface.slice(1)} L1080 1920 Z`;
	const bg: PhotoSpec = {src: 'photos/heimaey_lava_town_1974.jpg', iw: 3840, ih: 3032, from: {cx: 2050, cy: 1600, z: 1.0}, to: {cx: 1960, cy: 1560, z: 1.06}, t0, t1: t1 + XF};
	const ticks = Array.from({length: 11}, (_, i) => 1800 - (i * (1800 - TOP - 20)) / 10);
	return (
		<Layer t0={t0} t1={t1}>
			<PhotoFill p={bg} grade="contrast(1.12) brightness(0.86) saturate(1.3) sepia(0.22)" vignette={0.45} />
			{/* the pale sky and steam above the lava take a soft brand-violet dusk tint (no flat grey-white half frame) */}
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(120,80,220,0.5) 0%, rgba(150,110,230,0.3) 28%, rgba(150,110,230,0) 48%)', mixBlendMode: 'multiply'}} />
			{/* warm lava glow from below, so the teal water reads against dark-orange rock */}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 95% 42% at 50% 102%, rgba(255,110,40,0.5) 0%, rgba(255,46,136,0.16) 52%, rgba(255,46,136,0) 80%)', mixBlendMode: 'screen'}} />
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
				<defs>
					<linearGradient id="litersWater" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#5ff6ff" stopOpacity="0.8" />
						<stop offset="0.25" stopColor="#14b8d4" stopOpacity="0.72" />
						<stop offset="1" stopColor="#062a6a" stopOpacity="0.85" />
					</linearGradient>
				</defs>
				<path d={d} fill="url(#litersWater)" />
				<path d={surface} fill="none" stroke="#e8ffff" strokeWidth={4} opacity={0.85} />
				{ticks.map((y, i) => (
					<line key={y} x1={i % 5 === 0 ? 990 : 1012} x2={1040} y1={y} y2={y} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={lerp(0.3, 0.75, clamp01((y - top) / 40))} />
				))}
			</svg>
			<SurfaceSteam top={top} wave={wave} a={clamp01((fill - 0.12) / 0.3)} />
			{/* «7.3 billion liters / ≈ 7.3 million m³» is the key figure from Short.tsx (emph.ts) */}
			<Credit text="Photo: C. Bickel, CC BY-SA 2.0 DE" t0={W(114) + 0.1} />
		</Layer>
	);
};

// ------------------------------------------------------------ «the new rock made the harbor even better» (65.91 – 68.88)
// one real photo of the harbour today: a slow drift towards the harbour mouth; the label sits on the 1973 lava field
export const HarborPhotos: React.FC = () => {
	const t = useT();
	const [t0, t1] = WIN.harbor;
	const p: PhotoSpec = {src: 'photos/heimaey_harbor_2012.jpg', iw: 7256, ih: 2545, from: {cx: 3060, cy: 1272, z: 1.0}, to: {cx: 2880, cy: 1180, z: 1.08}, t0, t1: t1 + XF};
	const r = kbAt(p, t);
	const [ax, ay] = r.map(3020, 880); // the 1973 lava beside the harbour mouth
	return (
		<Layer t0={t0} t1={t1}>
			<PhotoFill p={p} grade="contrast(1.08) saturate(1.15)" tint="rgba(60,20,120,0.12)" vignette={0.55} />
			<AnchorLabel text="Natural Breakwater" t0={W(131) + 0.15} t1={W(138) - 0.3} x={ax} y={ay} dx={40} dy={-130} size={52} />
			{/* gone before Atlas (Short.tsx ATLAS, from W(138) − 0.15) steps in at the bottom, so he never covers it */}
			<Credit text="Photo: Andreas Blome, CC BY-SA 3.0" t1={W(138) - 0.15} />
		</Layer>
	);
};

// ------------------------------------------------------------ FINAL scoreboard (68.88 – 76.8)
// «Final score: Humans two. Volcano zero.» — the subtitle steps aside, the icon board is the text: person · 2 : 0 · volcano.
// «And Hawaii?» → a small dossier card with the island (no text); «We don't talk about Hawaii» → a black redaction bar.

/** Hawaiʻi (Big Island) coastline, Natural Earth 1:10m, simplified (viewBox 0 0 87 100) */
const BIG_ISLAND =
	'M80.5 51.3 L84.2 52.9 L85.7 54.2 L86.5 55.8 L86.3 57.7 L82.3 62.7 L79.2 63.8 L74.8 68.1 L71.8 68.9 L71.7 69.8 L69.2 70.4 L67.1 72.0 L59.5 74.3 L56.6 73.5 L53.4 74.0 L49.6 76.5 L48.3 78.1 L45.8 78.8 L38.7 82.9 L35.7 85.8 L35.1 87.0 L35.3 89.7 L31.8 93.3 L30.7 96.4 L26.7 100.0 L26.1 99.6 L26.2 98.0 L24.7 96.8 L16.9 92.1 L12.6 90.9 L11.7 88.2 L10.8 88.0 L9.7 82.9 L12.1 68.5 L12.0 66.6 L8.6 57.6 L7.2 55.2 L7.4 53.6 L6.2 50.4 L4.2 46.5 L1.7 43.9 L0.0 39.2 L1.5 35.4 L4.4 33.1 L5.4 31.0 L6.4 30.1 L9.3 29.1 L13.0 23.0 L14.5 21.2 L15.6 21.2 L16.4 17.9 L15.9 16.5 L12.3 11.7 L11.3 8.4 L11.2 3.4 L12.5 0.8 L13.4 0.0 L15.9 0.0 L22.4 1.4 L24.2 5.0 L28.6 7.0 L29.8 8.5 L32.9 10.4 L34.5 9.9 L37.0 10.1 L44.4 12.8 L50.5 16.0 L61.9 23.3 L67.5 29.7 L67.7 39.5 L69.6 39.4 L72.3 38.1 L74.3 39.5 L75.2 41.1 L75.0 44.3 L75.9 46.2 L77.1 48.0Z';

const PersonIcon: React.FC<{size: number}> = ({size}) => (
	<svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible', filter: 'drop-shadow(0 0 14px rgba(34,230,216,0.6))'}}>
		<defs>
			<linearGradient id="personFill" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#B8FFF8" />
				<stop offset="1" stopColor={TEAL} />
			</linearGradient>
		</defs>
		<circle cx={50} cy={29} r={19} fill="url(#personFill)" />
		<path d="M14 92 C14 67 30 55 50 55 C70 55 86 67 86 92 Z" fill="url(#personFill)" />
	</svg>
);

/** bright brand volcano: gold → orange → magenta cone, glowing crater and lava streak, white smoke drifting up */
const VolcanoIcon: React.FC<{size: number; puff?: number}> = ({size, puff = 0}) => {
	const t = useT();
	const smoke = (i: number) => {
		const k = (((t * 0.35 + i / 3) % 1) + 1) % 1;
		return <circle key={i} cx={50 + (i - 1) * 7 + k * 6} cy={26 - k * 20} r={(6 + k * 7) * (1 + 0.35 * puff)} fill="#ffffff" opacity={0.92 * Math.sin(Math.PI * k)} />;
	};
	return (
		<svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible', filter: 'drop-shadow(0 0 14px rgba(255,120,40,0.75)) drop-shadow(0 0 4px rgba(255,46,136,0.5))'}}>
			<defs>
				<linearGradient id="coneFill" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#FFC24A" />
					<stop offset="0.45" stopColor="#FF7A35" />
					<stop offset="1" stopColor={MAGENTA} />
				</linearGradient>
				<radialGradient id="craterGlow" cx="50%" cy="45%" r="60%">
					<stop offset="0" stopColor="#FFFBE0" />
					<stop offset="0.55" stopColor="#FFD54A" />
					<stop offset="1" stopColor="#FF8A2A" />
				</radialGradient>
			</defs>
			{[0, 1, 2].map(smoke)}
			<path d="M6 92 L36 38 Q50 32 64 38 L94 92 Z" fill="url(#coneFill)" />
			<path d="M54 36 Q60 36 64 38 L94 92 L62 92 Z" fill="rgba(120,10,70,0.22)" />
			<path d="M36 38 Q50 32 64 38 Q57 44 50 43 Q43 44 36 38 Z" fill="url(#craterGlow)" style={{filter: 'drop-shadow(0 0 5px rgba(255,220,120,0.9))'}} />
			<path d="M46 41 C45 52 38 60 39 72 C44 66 47 58 50 50 C52 60 56 64 62 68 C58 58 55 50 55 41 Z" fill="#FFE27A" style={{filter: 'drop-shadow(0 0 3px rgba(255,200,80,0.9))'}} />
		</svg>
	);
};

/** vertical centre (px) of the Anton digits and the colon inside the 250 px line box (measured on a 72.5 s still: digits, colon and bar all at y ≈ 496) */
const DIGIT_CY = 125;
/** one score digit: a dim rounded bar (placeholder) until `at`, then the number drops in with a gentle bounce. The bar is
 *  drawn (not Anton's en dash, which sits ≈ 25 px below the digit line and looks dropped next to the colon). */
const Digit: React.FC<{v: string; at: number}> = ({v, at}) => {
	const t = useT();
	const k = clamp01((t - at) / 0.45);
	const b = pop(t, at, 0.45); // ≈ 5 % overshoot: lively, not a slam
	const base: React.CSSProperties = {position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', fontFamily: ANTON, fontSize: 210, lineHeight: '250px'};
	return (
		<div style={{position: 'relative', width: 150, height: 250}}>
			<div style={{position: 'absolute', left: 45, top: DIGIT_CY - 7, width: 60, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.3)', opacity: 1 - easeOut(k * 1.6)}} />
			{t >= at ? (
				<div style={{...base, ...goldFill, opacity: easeOut(k * 1.6), transform: `translateY(${(1 - b) * -40}px) scale(${lerp(0.7, 1, b)})`, filter: 'drop-shadow(0 6px 0 #120818) drop-shadow(0 0 26px rgba(255,150,40,0.6))'}}>{v}</div>
			) : null}
		</div>
	);
};

/** calm embers: slow rise, no twinkle */
const CalmEmbers: React.FC<{n: number; seed: number}> = ({n, seed}) => {
	const t = useT();
	return (
		<AbsoluteFill style={{mixBlendMode: 'screen'}}>
			{Array.from({length: n}).map((_, i) => {
				const life = 6 + h1(seed + i) * 4;
				const k = (((t + h1(seed + i * 1.7) * life) % life) + life) % life / life;
				const x = h1(seed + i * 3.1) * 1080 + Math.sin(t * 0.5 + i) * 24;
				const y = lerp(1980, 900, k);
				const a = Math.sin(Math.PI * k) * 0.55;
				const s = 5 + h1(seed + i * 5.3) * 7;
				return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: `rgba(255,170,70,${a})`, boxShadow: `0 0 ${s * 2}px rgba(255,140,50,${a})`}} />;
			})}
		</AbsoluteFill>
	);
};

export const FinalScore: React.FC = () => {
	const t = useT();
	const t0 = WIN.final;
	if (t < t0) return null;
	const tHum = W(140); // «Humans»
	const t2 = W(141) - 0.04; // «two»
	const tVol = W(142); // «Volcano»
	const t0d = W(143) - 0.04; // «zero»
	const tQ = W(145) - 0.12; // «Hawaii?»
	const tBar = W(148) - 0.1; // «talk»
	const kB = easeOut((t - t0) / 0.6);
	const hop = (a: number) => Math.sin(Math.PI * clamp01((t - a) / 0.55)); // one gentle hop
	const sink = easeInOut((t - t0d - 0.1) / 0.5); // the volcano sinks a little when it gets its zero
	const kQ = easeOut((t - tQ) / 0.45);
	const bar = easeOut((t - tBar) / 0.35);
	const push = lerp(1, 1.03, glide((t - t0) / 8));
	const glow = 0.5 + 0.12 * Math.sin((t - t0) * 1.6); // the board's warm glow breathes slowly
	return (
		<Layer t0={t0} t1={99}>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 30%, #4a1a96 0%, #1c0a3e 45%, #080214 100%)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 38% at 50% 108%, rgba(255,120,40,0.85) 0%, rgba(255,46,136,0.45) 38%, rgba(60,10,90,0) 75%)'}} />
			<CalmEmbers n={30} seed={77} />
			<AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '540px 640px'}}>
				{/* the board: person · 2 : 0 · volcano */}
				<div
					style={{
						position: 'absolute',
						left: 70,
						top: 330,
						width: 940,
						height: 340,
						opacity: kB,
						transform: `translateY(${(1 - kB) * 24}px) scale(${lerp(0.94, 1, kB)})`,
						borderRadius: 40,
						background: 'linear-gradient(180deg, rgba(66,28,128,0.95), rgba(22,8,52,0.95))',
						border: `6px solid ${GOLD}`,
						boxShadow: `0 14px 0 #120818, 0 0 80px rgba(255,160,40,${glow}), inset 0 0 40px rgba(255,180,60,0.18)`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 44px',
						boxSizing: 'border-box',
					}}
				>
					<div style={{transform: `translateY(${-22 * hop(tHum) - 14 * hop(t2 + 0.1)}px) scale(${1 + 0.08 * hop(tHum)})`}}>
						<PersonIcon size={180} />
					</div>
					<div style={{display: 'flex', alignItems: 'center'}}>
						<Digit v="2" at={t2} />
						<div style={{fontFamily: ANTON, fontSize: 150, lineHeight: '250px', color: 'rgba(255,255,255,0.85)', width: 60, textAlign: 'center', marginTop: -16}}>:</div>
						<Digit v="0" at={t0d} />
					</div>
					{/* the volcano hops when named, then sinks a little when it gets its zero (it stays bright) */}
					<div style={{transform: `translateY(${-22 * hop(tVol) + 10 * sink}px) scale(${(1 + 0.08 * hop(tVol)) * lerp(1, 0.94, sink)})`}}>
						<VolcanoIcon size={180} puff={hop(tVol)} />
					</div>
				</div>
				{/* «And Hawaii?» — a small dossier card with the island (no text: the voice asks the question); «We don't talk about
				    Hawaii» — a black redaction bar swipes across the island */}
				{t >= tQ ? (
					<div style={{position: 'absolute', left: 540 - 135, top: 748, width: 270, height: 226, opacity: kQ, transform: `translateY(${(1 - kQ) * 18}px) scale(${lerp(0.92, 1, pop(t, tQ, 0.45))})`}}>
						{/* folder tab */}
						<div style={{position: 'absolute', left: 18, top: -20, width: 96, height: 34, borderRadius: '12px 12px 0 0', background: MAGENTA, boxShadow: '0 0 24px rgba(255,46,136,0.5)'}} />
						<div style={{position: 'absolute', inset: 0, borderRadius: 18, background: 'linear-gradient(180deg, #FFF6E6, #F2E2C8)', border: `4px solid ${MAGENTA}`, boxShadow: '0 16px 40px rgba(0,0,0,0.55), 0 0 40px rgba(255,46,136,0.45)'}} />
						<svg width={150} height={172} viewBox="-2 -2 91 104" style={{position: 'absolute', left: 60, top: 27}}>
							<path d={BIG_ISLAND} fill="#2a1650" />
						</svg>
						{bar > 0.001 ? <div style={{position: 'absolute', left: 20, top: 66, width: 230 * bar, height: 96, borderRadius: 8, background: '#07040c', boxShadow: '0 4px 10px rgba(0,0,0,0.4)'}} /> : null}
					</div>
				) : null}
			</AbsoluteFill>
		</Layer>
	);
};
