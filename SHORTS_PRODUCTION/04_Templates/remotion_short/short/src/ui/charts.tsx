import React from 'react';
import {getLength, getPointAtLength} from '@remotion/paths';
import {HEAD, MONT} from '../fonts';
import {GOLD, GOLD2, INK, clamp01, easeInOut, easeOut, goldFill, h1, lerp, pop, useT} from './gfx';

// Animated charts of the channel (motion kit, 24.10): BarGrow, LineDraw, CompareBeforeAfter, DonutFill, IconRow.
// Look: white + gold on a dark navy scrim panel («A · Экспедиция», theme.ts), straight text (T4), big numbers in HEAD with an
// ink outline (T9, T11), labels in Montserrat 800 (Cyrillic-safe). Every chart keeps moving while it is on screen (grow,
// draw, shimmer, slow panel drift) — the kit exists to lift motion in seconds 1–6 (H7).
// Rules the components enforce:
//   • safe zone: the box is clamped to x 48–887, y 288–1150 (above the subtitle band, R3); `allowLow` (only when the
//     phrase's subtitles are hidden via project.hide_subs) lets it reach y 1420 — never the bottom UI from y 1440 (4.4)
//   • R6 / T10: a rolling number runs ≤ 1.1 s (R6_MAX_S, clamped whatever `dur` says), lands on the exact `display` text,
//     and reads as «in motion» while rolling (white, dimmed, smaller) → gold + bump only on landing
//   • numbers come from props only; write them inline in the JSX (or `display` strings) so tools/chart_facts.mjs can check
//     each one against ../FACTS.md (check.mjs item 6). A big number on screen → hide that phrase's subtitle (T6, hide_subs)
//   • standard 4.6 «Данные: изменения»: a chart sits on a picture that changes (scrim panel over footage / a drawn scene),
//     not a flat slide; maps / charts are never the main shot of 0–3 s (R4)
// Times are seconds on the edit clock (W(i) / We(i) from lib/time), like every other component of the template.

/** longest rolling counter (standard R6 / T10) */
export const R6_MAX_S = 1.1;
const FADE_OUT = 0.25;
const PAD = 40;

// ---------------------------------------------------------------------------------------------------------------------
// layout: boxes, safe zone, number formatting

export type ChartBox = {x: number; y: number; w: number; h: number};
/** text-safe rectangle of the frame for charts (standard 4.4 safe zone + R3 subtitle band) */
export const CHART_SAFE = {x0: 48, x1: 887, y0: 288, y1: 1150, y1Low: 1420} as const;
/** default chart box: inside the safe zone, centre x ≈ 490 */
export const CHART_BOX: ChartBox = {x: 96, y: 340, w: 788, h: 760};

/** the box clamped into CHART_SAFE (allowLow: bottom may reach y 1420 — only while the phrase's subtitles are hidden) */
export const safeBox = (b?: Partial<ChartBox>, allowLow = false): ChartBox => {
	const r = {...CHART_BOX, ...(b ?? {})};
	const x0 = Math.max(CHART_SAFE.x0, r.x);
	const y0 = Math.max(CHART_SAFE.y0, r.y);
	const x1 = Math.min(CHART_SAFE.x1, r.x + r.w);
	const y1 = Math.min(allowLow ? CHART_SAFE.y1Low : CHART_SAFE.y1, r.y + r.h);
	return {x: x0, y: y0, w: Math.max(120, x1 - x0), h: Math.max(120, y1 - y0)};
};

export type NumLocale = 'en' | 'de' | 'ru';
/** [group separator, decimal mark, percent suffix] */
const LOC: Record<NumLocale, [string, string, string]> = {en: [',', '.', '%'], de: ['.', ',', ' %'], ru: [' ', ',', ' %']};

/** 1,200.5 (en) · 1.200,5 (de) · 1 200,5 (ru); ru groups from 5 digits (typographic rule), en / de from 4 */
export const fmtNum = (v: number, dec = 0, locale: NumLocale = 'en', group = true) => {
	const [g, d] = LOC[locale];
	const s = Math.abs(v).toFixed(dec);
	const [a, b] = s.split('.');
	const minLen = locale === 'ru' ? 5 : 4;
	const ai = group && a.length >= minLen ? a.replace(/\B(?=(\d{3})+(?!\d))/g, g) : a;
	return (v < 0 && Number(s) !== 0 ? '−' : '') + ai + (b ? d + b : '');
};

type NumSpec = {pre: string; num: number; dec: number; post: string; grouped: boolean};
const NUM_RE: Record<NumLocale, RegExp> = {
	en: /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/,
	de: /-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/,
	ru: /-?\d{1,3}(?:[   ]\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/,
};
/** splits a shown text («≈ 1,200 t», «70 %», «1.2 M») into prefix + number + suffix, or null without a number */
export const parseShown = (s: string, locale: NumLocale = 'en'): NumSpec | null => {
	const m = s.match(NUM_RE[locale]);
	if (!m || m.index === undefined) return null;
	const [g, d] = LOC[locale];
	const raw = m[0];
	const grouped = locale === 'ru' ? /[   ]/.test(raw) : raw.includes(g);
	const plain = raw.replace(locale === 'ru' ? /[   ]/g : new RegExp(`\\${g}`, 'g'), '').replace(d, '.');
	const dec = plain.includes('.') ? plain.split('.')[1].length : 0;
	return {pre: s.slice(0, m.index), num: Number(plain), dec, post: s.slice(m.index + raw.length), grouped};
};

/**
 * text of a counter that is still rolling at value v toward `final`: same prefix / suffix / decimals / grouping as `final`,
 * and never the exact final digits — those appear only on the landing frame (with the gold + bump, R6)
 */
export const rollingText = (v: number, final: string, locale: NumLocale = 'en', from = 0) => {
	const spec = parseShown(final, locale);
	if (!spec) return final;
	const big = Math.abs(spec.num) >= (locale === 'ru' ? 10000 : 1000);
	const f = (x: number) => fmtNum(x, spec.dec, locale, spec.grouped || !big);
	let s = f(v);
	if (s === f(spec.num)) s = f(spec.num - Math.pow(10, -spec.dec) * (Math.sign(spec.num - from) || 1));
	return spec.pre + s + spec.post;
};

/** R6 rolling text: `from` → the number inside `final` over ≤ 1.1 s from tStart; exactly `final` from the landing on */
export const rollR6 = (t: number, tStart: number, dur: number, from: number, final: string, locale: NumLocale = 'en') => {
	const d = Math.min(Math.max(0.2, dur), R6_MAX_S);
	const x = (t - tStart) / d;
	const spec = parseShown(final, locale);
	if (x >= 1 || !spec) return {text: final, landed: x >= 1, k: clamp01(x), tLand: tStart + d};
	// ease-out quad (not cubic): the count does not linger on near-final numbers that could read as the result
	const k = x <= 0 ? 0 : 1 - Math.pow(1 - x, 2);
	return {text: rollingText(lerp(from, spec.num, k), final, locale, from), landed: false, k, tLand: tStart + d};
};

/** estimated text width (px): Alfa Slab One digits ≈ 0.7 em, Montserrat 800 ≈ 0.62 em uppercase / 0.56 lowercase */
const estW = (s: string, size: number, em = 0.62) => s.length * size * em;
/** largest size ≤ max that fits `s` into maxW */
const fit = (s: string, max: number, maxW: number, em = 0.62) => Math.max(18, Math.min(max, maxW / Math.max(1, s.length * em)));

const INK_SHADOW = `-2px -2px 0 ${INK}, 2px -2px 0 ${INK}, -2px 2px 0 ${INK}, 2px 2px 0 ${INK}, 0 4px 0 ${INK}, 0 4px 14px rgba(0,0,0,0.6)`;
const labelCss = (size: number, color = '#fff'): React.CSSProperties => ({fontFamily: MONT, fontWeight: 800, fontSize: size, lineHeight: 1.05, color, textShadow: INK_SHADOW, whiteSpace: 'nowrap', letterSpacing: 0.3});
const GOLD_GRAD = `linear-gradient(180deg, #FFE27A 0%, ${GOLD} 45%, ${GOLD2} 100%)`;
const sid = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');
/** cubic ease-in-out of gfx.ts inverted (bisection): progress → time fraction */
const invEaseInOut = (y: number) => {
	let a = 0, b = 1;
	for (let i = 0; i < 24; i++) {
		const m = (a + b) / 2;
		if (easeInOut(m) < y) a = m;
		else b = m;
	}
	return (a + b) / 2;
};

// ---------------------------------------------------------------------------------------------------------------------
// shared pieces: panel, big number, icons

type Pt = [number, number];

export type ChartCommon = {
	t0: number;
	t1: number;
	/** chart rectangle in frame px (defaults CHART_BOX), clamped into the safe zone */
	box?: Partial<ChartBox>;
	/** subtitles of this phrase are hidden (project.hide_subs) → the box may go down to y 1420 */
	allowLow?: boolean;
	/** 'scrim' = dark navy panel (default, readable over footage), 'none' = the chart straight on the picture */
	panel?: 'scrim' | 'none';
	/** scrim strength 0–1 (default 1 = 88–92 % navy); lower lets the footage move through (text keeps its ink outline) */
	scrim?: number;
	/** small heading inside the panel (must add information, never repeat the VO — T6 / T7) */
	title?: string;
	accent?: string;
	/** source line at the bottom of the panel (small) */
	source?: string;
	/** slow push-in of the whole chart over its life (0.98 → 1 by default; 0 = still) */
	drift?: number;
	locale?: NumLocale;
	/**
	 * camera inside the panel: 'auto' (default) zooms / pans with the data while it builds (BarGrow and IconRow follow the
	 * growing bar / filling icon, LineDraw rides the head, DonutFill follows the arc head, Compare pushes in on «after») and
	 * always ends on the full view before the result is read — on a short beat ChartPanel forces the pull-out so the full view
	 * stands from t1 − CAM_FULL_S (0.3 s) on, whatever the chart's own timing; 'none' = still. The content is clipped to the
	 * panel, so the safe zone holds while zoomed.
	 */
	cam?: 'auto' | 'none';
	/** zoom of the camera at its closest (per chart default 1.15–1.5) */
	camZoom?: number;
	/** entrance: 'rise' (default, 110 px up), 'slam' (scale 1.25 → 1 with a short blur), 'wipe' (revealed left → right) */
	enter?: 'rise' | 'slam' | 'wipe';
};

/** camera state for ChartPanel: focus point f (panel-local px), amount k (0 = full view, 1 = closest), zoom at k = 1 */
export type ChartCam = {f: [number, number]; k: number; zoom: number};
/** the camera is back on the full view this long before t1 (the whole chart readable before the beat leaves) … */
export const CAM_FULL_S = 0.3;
/** … pulling out over this long at the latest */
const CAM_BACK_S = 0.35;

/**
 * Dark scrim panel that enters at t0, drifts slowly, fades out after t1; children use the box's local px. With `cam` the
 * children sit on a zoom layer: point p → c + s·(p − f), s = lerp(1, zoom, k), c = lerp(f, panel centre, k) — the focus is
 * pulled toward the centre while zoomed (pan + zoom), identity at k = 0. Title and source stay outside the zoom.
 */
export const ChartPanel: React.FC<{box: ChartBox; t0: number; t1: number; panel?: 'scrim' | 'none'; drift?: number; title?: string; accent?: string; source?: string; scrim?: number; enter?: 'rise' | 'slam' | 'wipe'; cam?: ChartCam | null; children: React.ReactNode}> = ({box, t0, t1, panel = 'scrim', scrim = 1, drift = 0.02, title, accent, source, enter = 'rise', cam, children}) => {
	const t = useT();
	if (t < t0 - 0.01 || t > t1 + FADE_OUT) return null;
	const k = easeOut((t - t0) / (enter === 'slam' ? 0.28 : 0.38));
	const o = clamp01(k * (enter === 'wipe' ? 4 : 1.6)) * clamp01((t1 + FADE_OUT - t) / FADE_OUT);
	const life = easeInOut((t - t0) / Math.max(0.5, t1 - t0));
	const rest = 1 - drift + drift * life;
	const tf = enter === 'slam' ? `scale(${lerp(1.25, 1, k) * rest})` : enter === 'wipe' ? `scale(${rest})` : `translateY(${(1 - k) * 110}px) scale(${lerp(0.93, 1, k) * rest})`;
	const blur = enter === 'slam' && k < 1 ? `blur(${(1 - k) * 14}px)` : undefined;
	const clip = enter === 'wipe' && k < 1 ? `inset(0 ${(1 - k) * 100}% 0 0 round 30px)` : undefined;
	let camTf: string | undefined;
	// short beats: whatever the chart's own camera does, it is on the full view from t1 − CAM_FULL_S (eased pull-out before)
	const camK = cam ? cam.k * (1 - easeInOut((t - (t1 - CAM_FULL_S - CAM_BACK_S)) / CAM_BACK_S)) : 0;
	if (cam && camK > 0.0005) {
		const sc = lerp(1, cam.zoom, camK);
		const cx = lerp(cam.f[0], box.w / 2, camK), cy = lerp(cam.f[1], box.h / 2, camK);
		camTf = `translate(${(cx - sc * cam.f[0]).toFixed(2)}px, ${(cy - sc * cam.f[1]).toFixed(2)}px) scale(${sc.toFixed(4)})`;
	}
	return (
		<div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, opacity: o, transform: tf, transformOrigin: '50% 50%', filter: blur, clipPath: clip, pointerEvents: 'none'}}>
			{panel === 'scrim' ? (
				<div style={{position: 'absolute', inset: 0, borderRadius: 30, background: `linear-gradient(180deg, rgba(22,48,77,${(0.88 * clamp01(scrim)).toFixed(3)}) 0%, rgba(15,34,56,${(0.92 * clamp01(scrim)).toFixed(3)}) 100%)`, border: '2px solid rgba(255,255,255,0.10)', boxShadow: '0 26px 70px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.06)'}} />
			) : null}
			{/* content layer clipped between the title band and the source line (nothing is drawn there at rest, so the clip
			    never pops) and to the rounded panel while the camera is in */}
			<div style={{position: 'absolute', inset: 0, clipPath: camTf || title || source ? `inset(${title ? 92 : 0}px 0 ${source ? 48 : 0}px 0 round ${title ? 0 : 30}px ${title ? 0 : 30}px ${source ? 0 : 30}px ${source ? 0 : 30}px)` : undefined}}>
				<div style={{position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, transform: camTf, transformOrigin: '0 0'}}>{children}</div>
			</div>
			{title ? (
				<div style={{position: 'absolute', left: PAD, top: 30, ...labelCss(fit(title + (accent ? ' ' + accent : ''), 42, box.w - 2 * PAD, 0.6))}}>
					{title}
					{accent ? <span style={{color: GOLD}}> {accent}</span> : null}
				</div>
			) : null}
			{source ? <div style={{position: 'absolute', left: PAD, bottom: 18, fontFamily: MONT, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap', letterSpacing: 0.3}}>{source}</div> : null}
		</div>
	);
};
/** ChartPanel props from a chart's common props */
const panelOf = (p: ChartCommon, box: ChartBox, cam: ChartCam | null) => ({box, t0: p.t0, t1: p.t1, panel: p.panel, scrim: p.scrim, drift: p.drift, title: p.title, accent: p.accent, source: p.source, enter: p.enter, cam: p.cam === 'none' ? null : cam});
/** 0 → 1 → 0 window: rises over [a, a + up], falls over [b − down, b] */
const bell = (t: number, a: number, b: number, up = 0.35, down = 0.45) => Math.min(easeInOut((t - a) / up), 1 - easeInOut((t - (b - down)) / down));
/** point between pts[floor(u)] and pts[ceil(u)] (u = fractional index) */
const along = (pts: Pt[], u: number): Pt => {
	const i = Math.max(0, Math.min(pts.length - 1, Math.floor(u)));
	const j = Math.min(pts.length - 1, i + 1);
	const f = easeInOut(clamp01(u - i));
	return [lerp(pts[i][0], pts[j][0], f), lerp(pts[i][1], pts[j][1], f)];
};
const contentTop = (title?: string) => (title ? 104 : 40);
const contentBottom = (source?: string) => (source ? 58 : 30);

/**
 * Big number (HEAD) with a solid ink outline. `rolling` = a counter in motion (white, dimmed, 94 %: it never reads as the
 * result, R6); after `tLand` it turns gold (when `gold`) and bumps once.
 */
export const BigNum: React.FC<{text: string; size: number; gold?: boolean; rolling?: boolean; tLand?: number; style?: React.CSSProperties}> = ({text, size, gold, rolling, tLand, style}) => {
	const t = useT();
	const bump = !rolling && tLand !== undefined && t >= tLand ? Math.sin(Math.PI * clamp01((t - tLand) / 0.32)) : 0;
	const g = gold && !rolling;
	const sw = Math.max(4, Math.round(size * 0.075));
	// both layers positioned with an explicit z-order: the ink layer's filter makes it a stacking context, which would
	// otherwise paint it over a filter-less fill layer
	const base: React.CSSProperties = {gridArea: '1 / 1', position: 'relative', fontFamily: HEAD, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap', letterSpacing: 1, textAlign: 'center'};
	return (
		<div style={{display: 'grid', transform: `scale(${(rolling ? 0.94 : 1) * (1 + 0.1 * bump)})`, opacity: rolling ? 0.8 : 1, ...style}}>
			<div style={{...base, zIndex: 0, color: INK, WebkitTextStroke: `${sw}px ${INK}`, filter: `drop-shadow(0 ${Math.round(size * 0.045)}px 0 ${INK})`}}>{text}</div>
			<div style={{...base, zIndex: 1, ...(g ? goldFill : {color: '#fff'}), filter: g ? 'drop-shadow(0 0 22px rgba(255,140,30,0.45))' : undefined}}>{text}</div>
		</div>
	);
};

/** small gold pill with ink text (value tag, delta badge) */
const GoldPill: React.FC<{text: string; size: number; k: number; white?: boolean}> = ({text, size, k, white}) => (
	<div
		style={{
			transform: `scale(${lerp(0.3, 1, k)})`,
			opacity: clamp01(k * 3),
			background: white ? 'linear-gradient(180deg, #FFFFFF, #D9E1EA)' : GOLD_GRAD,
			color: INK,
			fontFamily: HEAD,
			fontSize: size,
			lineHeight: 1,
			padding: `${size * 0.16}px ${size * 0.3}px ${size * 0.1}px`,
			borderRadius: size * 0.3,
			border: `${Math.max(3, size * 0.07)}px solid ${INK}`,
			boxShadow: `0 ${size * 0.1}px 0 ${INK}${white ? '' : ', 0 0 34px rgba(255,150,40,0.55)'}`,
			whiteSpace: 'nowrap',
			letterSpacing: 1,
		}}
	>
		{text}
	</div>
);

/** original flat icons (100 × 100 units, drawn for this template — no third-party glyphs) */
export const ICONS = {
	person: 'M50 8a15 15 0 1 1 0 30a15 15 0 1 1 0-30z M24 94V64c0-14 11-22 26-22s26 8 26 22v30z',
	house: 'M50 10 L90 46 H82 V90 H18 V46 H10 Z M42 90 V66 H58 V90 Z',
	coin: 'M50 8a42 42 0 1 1 0 84a42 42 0 1 1 0-84z M50 20a30 30 0 1 0 0 60a30 30 0 1 0 0-60z M44 32h12v36h-12z',
	tree: 'M50 6 L78 44 H64 L84 72 H58 V94 H42 V72 H16 L36 44 H22 Z',
	drop: 'M50 6C50 6 20 44 20 62a30 30 0 0 0 60 0C80 44 50 6 50 6z',
	car: 'M8 70V54l13-5 11-17h36l12 17 12 5v16z M30 60a12 12 0 1 1 0 24a12 12 0 1 1 0-24z M70 60a12 12 0 1 1 0 24a12 12 0 1 1 0-24z',
	ship: 'M8 62h84l-12 24H20z M48 10h4v50h-4z M55 14 82 56H55z M45 24 22 56h23z',
	factory: 'M8 92V50l20 12V50l20 12V50l20 12V14h16v78z',
	bolt: 'M58 4 18 56h26l-8 40 46-56H56z',
	heart: 'M50 90 14 54C2 42 6 20 24 16c11-2 20 4 26 14 6-10 15-16 26-14 18 4 22 26 10 38z',
	crate: 'M14 30 50 14 86 30v42L50 88 14 72z',
} as const;
export type IconName = keyof typeof ICONS;
/** a built-in icon or an own path in the same 100-unit box (evenodd fill: inner shapes become holes) */
export type IconSpec = IconName | {d: string};
const iconD = (i: IconSpec) => (typeof i === 'string' ? ICONS[i] : i.d);

/** one icon as its own svg (for CompareBeforeAfter and free use) */
export const ChartIcon: React.FC<{icon: IconSpec; size: number; gold?: boolean; dim?: boolean; style?: React.CSSProperties}> = ({icon, size, gold, dim, style}) => {
	const id = sid(`ci${React.useId()}`);
	return (
		<svg width={size} height={size} viewBox="-6 -6 112 112" style={{overflow: 'visible', ...style}}>
			<defs>
				<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#FFE27A" />
					<stop offset="0.45" stopColor={GOLD} />
					<stop offset="1" stopColor={GOLD2} />
				</linearGradient>
			</defs>
			<path d={iconD(icon)} fillRule="evenodd" fill={gold ? `url(#${id})` : dim ? 'rgba(255,255,255,0.22)' : '#fff'} stroke={INK} strokeWidth={5} strokeLinejoin="round" paintOrder="stroke" style={{filter: gold ? 'drop-shadow(0 0 10px rgba(255,150,40,0.6))' : undefined}} />
		</svg>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
// BarGrow

export type BarDatum = {label: string; value: number; display?: string; gold?: boolean};

/**
 * Bars grow one after another (stagger) with a small overshoot; the value lands on each bar, the `gold` bar is the key one
 * (gold, grows last-ish, shimmers). `dir` 'up' = columns (≤ 7), 'right' = horizontal bars with the label above (≤ 8, long
 * labels). `count` rolls each value with its bar (≤ 1.1 s, R6). `tFocus` (a word time) dims the other bars → the key bar
 * gets a second visual event on a later word.
 *   <BarGrow t0={W(4)} t1={We(9)} data={[{label: 'Rome', value: 1200}, {label: 'Paris', value: 2100, gold: true}]} unit=" t" />
 */
export const BarGrow: React.FC<ChartCommon & {data: BarDatum[]; dir?: 'up' | 'right'; stagger?: number; grow?: number; max?: number; unit?: string; prefix?: string; dec?: number; count?: boolean; tFocus?: number; valueSize?: number}> = (p) => {
	const t = useT();
	const {data, dir = 'up', stagger = 0.12, grow = 0.6, unit = '', prefix = '', dec = 0, count, tFocus, locale = 'en'} = p;
	const box = safeBox(p.box, p.allowLow);
	if (t < p.t0 - 0.01 || t > p.t1 + FADE_OUT || !data.length) return null;
	const W = box.w, H = box.h;
	const top = contentTop(p.title), bottom = contentBottom(p.source);
	const max = p.max ?? (Math.max(...data.map((d) => d.value)) || 1);
	const vText = (d: BarDatum) => d.display ?? prefix + fmtNum(d.value, dec, locale) + unit;
	const start = (i: number) => p.t0 + 0.3 + i * stagger + (data[i].gold ? 0.12 : 0);
	const focus = tFocus !== undefined ? easeOut((t - tFocus) / 0.3) : 0;
	const grid = easeOut((t - p.t0 - 0.1) / 0.45);
	const value = (d: BarDatum, i: number) => {
		if (count) return rollR6(t, start(i), grow, 0, vText(d), locale);
		const tl = start(i) + grow * 0.8;
		return {text: vText(d), landed: t >= tl, k: clamp01((t - start(i)) / grow), tLand: tl};
	};
	const bars: React.ReactNode[] = [];
	const buildPts: Pt[] = [];   // camera: one focus point per bar (mid height / row centre)
	let keyPt: Pt | null = null;   // camera accent: the gold bar
	if (dir === 'up') {
		const labelH = 62, valueH = 86;
		const yBase = H - bottom - labelH, yTop = top + valueH;
		const n = data.length, gapR = 0.42;
		const bw = Math.min(168, (W - 2 * PAD) / (n + (n - 1) * gapR));
		const x0 = (W - (n * bw + (n - 1) * gapR * bw)) / 2;
		const r = Math.min(18, bw * 0.16);
		// grid + baseline (drawn in)
		for (let g = 1; g <= 3; g++) {
			const y = yBase - ((yBase - yTop) * g) / 3;
			bars.push(<div key={`g${g}`} style={{position: 'absolute', left: PAD, top: y, width: (W - 2 * PAD) * easeOut((t - p.t0 - 0.1 - g * 0.06) / 0.45), height: 2, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 14px, transparent 14px 26px)'}} />);
		}
		bars.push(<div key="base" style={{position: 'absolute', left: PAD, top: yBase, width: (W - 2 * PAD) * grid, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.55)'}} />);
		data.forEach((d, i) => {
			const g = pop(t, start(i), grow);
			const h = Math.max(0, (yBase - yTop) * (d.value / max) * g);
			const x = x0 + i * bw * (1 + gapR);
			buildPts.push([x + bw / 2, yBase - (yBase - yTop) * 0.45]);
			if (d.gold) keyPt = [x + bw / 2, yBase - (yBase - yTop) * (d.value / max) * 0.75];
			const dimK = d.gold ? 1 : lerp(1, 0.36, focus);
			const v = value(d, i);
			const vs = Math.min(p.valueSize ?? 62, fit(v.text, 62, bw * 1.36, 0.7));
			const ls = fit(d.label, 36, bw * 1.36, 0.6);
			const landed = t - start(i) > grow;
			const shim = d.gold && landed ? ((t - start(i) - grow) * 0.75) % 1 : -1;
			const ring = d.gold && landed ? clamp01((t - start(i) - grow) / 0.55) : 1;
			bars.push(
				<React.Fragment key={`b${i}`}>
					{h > 2 ? (
						<div style={{position: 'absolute', left: x, top: yBase - h, width: bw, height: h + 2, opacity: dimK, borderRadius: `${r}px ${r}px 6px 6px`, border: `4px solid ${INK}`, boxSizing: 'border-box', overflow: 'hidden', background: d.gold ? GOLD_GRAD : 'linear-gradient(180deg, #FFFFFF 0%, #C6D1DE 100%)', boxShadow: d.gold ? `0 0 ${36 + 18 * focus}px rgba(255,160,40,${0.5 + 0.2 * focus})` : '0 10px 24px rgba(0,0,0,0.35)'}}>
							{shim >= 0 ? <div style={{position: 'absolute', left: 0, right: 0, height: '45%', top: `${lerp(110, -55, shim)}%`, background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))'}} /> : null}
						</div>
					) : null}
					{d.gold && landed && ring < 1 ? <div style={{position: 'absolute', left: x + bw / 2, top: yBase - h, width: bw * (1 + ring * 1.6), height: bw * (1 + ring * 1.6), transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `${6 * (1 - ring)}px solid ${GOLD}`, opacity: 1 - ring}} /> : null}
					{t >= start(i) ? (
						<div style={{position: 'absolute', left: x + bw / 2, top: yBase - h - 10, transform: `translate(-50%, -100%) scale(${count ? 1 : pop(t, v.tLand, 0.3)})`, transformOrigin: '50% 100%', opacity: dimK * (count ? 1 : clamp01(pop(t, v.tLand, 0.3) * 3))}}>
							<BigNum text={v.text} size={vs} gold={d.gold} rolling={count && !v.landed} tLand={v.tLand} />
						</div>
					) : null}
					<div style={{position: 'absolute', left: x + bw / 2, top: yBase + 16, transform: `translate(-50%, ${(1 - easeOut((t - start(i)) / 0.3)) * 16}px)`, opacity: clamp01((t - start(i)) / 0.3) * dimK, ...labelCss(ls, d.gold ? GOLD : '#fff')}}>{d.label}</div>
				</React.Fragment>,
			);
		});
	} else {
		const n = data.length;
		const rowH = (H - top - bottom) / n;
		const ls = Math.min(36, rowH * 0.3);
		const bh = Math.min(86, rowH * 0.5);
		const vs = Math.min(p.valueSize ?? 56, bh * 0.95);
		const room = Math.max(...data.map((d) => estW(vText(d), vs, 0.7))) + 28;
		const plotW = W - 2 * PAD - room;
		bars.push(<div key="axis" style={{position: 'absolute', left: PAD - 2, top: top, width: 4, height: (H - top - bottom) * grid, borderRadius: 2, background: 'rgba(255,255,255,0.55)'}} />);
		data.forEach((d, i) => {
			const g = pop(t, start(i), grow);
			const len = Math.max(0, plotW * (d.value / max) * g);
			const y = top + i * rowH + rowH * 0.06;
			const by = y + ls * 1.2 + 6;
			buildPts.push([W / 2, by + bh / 2]);
			if (d.gold) keyPt = [PAD + plotW * (d.value / max) * 0.8, by + bh / 2];
			const dimK = d.gold ? 1 : lerp(1, 0.36, focus);
			const v = value(d, i);
			const landed = t - start(i) > grow;
			const shim = d.gold && landed ? ((t - start(i) - grow) * 0.75) % 1 : -1;
			const lab = fit(d.label, ls, W - 2 * PAD, 0.6);
			bars.push(
				<React.Fragment key={`b${i}`}>
					<div style={{position: 'absolute', left: PAD + 4, top: y, opacity: clamp01((t - start(i) + 0.1) / 0.3) * dimK, transform: `translateX(${(1 - easeOut((t - start(i) + 0.1) / 0.3)) * -20}px)`, ...labelCss(lab, d.gold ? GOLD : '#fff')}}>{d.label}</div>
					{len > 2 ? (
						<div style={{position: 'absolute', left: PAD, top: by, width: len + 2, height: bh, opacity: dimK, borderRadius: `6px ${bh * 0.28}px ${bh * 0.28}px 6px`, border: `4px solid ${INK}`, boxSizing: 'border-box', overflow: 'hidden', background: d.gold ? 'linear-gradient(90deg, #FF9A1F 0%, #FFC83A 55%, #FFE27A 100%)' : 'linear-gradient(90deg, #C6D1DE 0%, #FFFFFF 100%)', boxShadow: d.gold ? '0 0 40px rgba(255,160,40,0.55)' : '0 8px 20px rgba(0,0,0,0.35)'}}>
							{shim >= 0 ? <div style={{position: 'absolute', top: 0, bottom: 0, width: '30%', left: `${lerp(-40, 110, shim)}%`, background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))'}} /> : null}
						</div>
					) : null}
					{t >= start(i) ? (
						<div style={{position: 'absolute', left: PAD + len + 16, top: by + bh / 2, transform: `translateY(-50%) scale(${count ? 1 : pop(t, v.tLand, 0.3)})`, transformOrigin: '0% 50%', opacity: dimK * (count ? 1 : clamp01(pop(t, v.tLand, 0.3) * 3))}}>
							<BigNum text={v.text} size={vs} gold={d.gold} rolling={count && !v.landed} tLand={v.tLand} />
						</div>
					) : null}
				</React.Fragment>,
			);
		});
	}
	// camera: start close on the first bar, pan along the growing bars while pulling out (full view ≈ 0.25 s after the
	// last bar lands); tFocus pushes in on the gold bar
	const s0 = start(0);
	const lastLand = Math.max(...data.map((_, i) => start(i))) + grow;
	const kb = 1 - easeInOut((t - s0) / Math.max(0.3, lastLand - s0 + 0.25));
	const fb = along(buildPts, clamp01((t - s0) / Math.max(0.2, lastLand - s0 - grow * 0.5)) * (buildPts.length - 1));
	const ka = tFocus !== undefined && keyPt ? 0.5 * easeInOut((t - tFocus) / 0.6) : 0;
	const wa = ka / (ka + kb + 1e-6);
	const cam: ChartCam = {f: keyPt ? [lerp(fb[0], keyPt[0], wa), lerp(fb[1], keyPt[1], wa)] : fb, k: Math.max(kb, ka), zoom: p.camZoom ?? 1.3};
	return (
		<ChartPanel {...panelOf(p, box, cam)}>
			{bars}
		</ChartPanel>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
// LineDraw

const f1 = (n: number) => n.toFixed(1);
/** path segments (after the first M): straight or Catmull-Rom → cubic Bézier (x stays monotone for even spacing) */
const lineSegs = (pts: Pt[], smooth: boolean) =>
	pts.slice(1).map((p2, j) => {
		const i = j;
		if (!smooth || pts.length < 3) return `L${f1(p2[0])} ${f1(p2[1])}`;
		const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p3 = pts[i + 2] ?? p2;
		const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
		const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
		return `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
	});

/**
 * A gold line draws itself through the values (dur, eased); a glowing dot with a short comet trail rides its end, the area
 * under it fills, the points pop as the dot passes, `mark` (index) gets a white ring. Tag: 'land' (default) = gold value tag
 * pops on the last point when the line lands; 'follow' = the tag rides with the dot showing the value under it (a counter →
 * the draw is clamped to ≤ 1.1 s, R6) and lands on `display`. `ghost` = a second, faint dashed series for comparison.
 *   <LineDraw t0={W(6)} t1={We(12)} values={[2.1, 2.4, 3.9, 7.8]} labels={['1990', '2000', '2010', '2020']} display="7.8 bn" />
 */
export const LineDraw: React.FC<
	ChartCommon & {values: number[]; labels?: string[]; display?: string; unit?: string; prefix?: string; dec?: number; tDraw?: number; dur?: number; smooth?: boolean; area?: boolean; zero?: boolean; min?: number; max?: number; ghost?: number[]; ghostLabel?: string; mark?: number; tag?: 'land' | 'follow'; xLabels?: 'ends' | 'all' | 'none'; width?: number}
> = (p) => {
	const t = useT();
	const {values, labels, unit = '', prefix = '', dec = 0, smooth = true, area = true, zero = true, tag = 'land', xLabels = 'ends', locale = 'en', width = 11} = p;
	const box = safeBox(p.box, p.allowLow);
	const id = sid(`ld${React.useId()}`);
	const W = box.w, H = box.h;
	const top = contentTop(p.title) + 112, bottom = contentBottom(p.source) + (xLabels === 'none' ? 10 : 60);
	const plotL = PAD + 20, plotR = W - PAD - 24, plotT = top, plotB = H - bottom;
	const all = [...values, ...(p.ghost ?? [])];
	const lo = p.min ?? (zero ? Math.min(0, ...all) : Math.min(...all) - (Math.max(...all) - Math.min(...all)) * 0.08);
	const hi = p.max ?? Math.max(...all) * 1.04;
	const geo = React.useMemo(() => {
		const toPts = (vs: number[]): Pt[] => vs.map((v, i) => [plotL + (i * (plotR - plotL)) / Math.max(1, vs.length - 1), plotB - ((v - lo) / Math.max(1e-9, hi - lo)) * (plotB - plotT)]);
		const pts = toPts(values.length >= 2 ? values : [0, 0]);
		const segs = lineSegs(pts, smooth);
		const m = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
		const d = [m, ...segs].join(' ');
		const L = Math.max(1, getLength(d));
		const fr = pts.map((_, i) => (i === 0 ? 0 : getLength([m, ...segs.slice(0, i)].join(' ')) / L));
		const gp = p.ghost?.length ? toPts(p.ghost) : null;
		const gd = gp ? [`M${f1(gp[0][0])} ${f1(gp[0][1])}`, ...lineSegs(gp, smooth)].join(' ') : null;
		return {pts, d, L, fr, gd, gL: gd ? getLength(gd) : 0};
	}, [values, p.ghost, smooth, plotL, plotR, plotT, plotB, lo, hi]);
	if (t < p.t0 - 0.01 || t > p.t1 + FADE_OUT || values.length < 2) return null;
	const tDraw = p.tDraw ?? p.t0 + 0.35;
	const dur = tag === 'follow' ? Math.min(p.dur ?? 1.1, R6_MAX_S) : p.dur ?? 1.4;
	const k = easeInOut((t - tDraw) / dur);
	const head = getPointAtLength(geo.d, k * geo.L) ?? {x: geo.pts[0][0], y: geo.pts[0][1]};
	const tPass = (i: number) => tDraw + dur * invEaseInOut(geo.fr[i]);
	const tLand = tDraw + dur;
	const final = p.display ?? prefix + fmtNum(values[values.length - 1], dec, locale) + unit;
	// tag text
	let tagText = final;
	let rolling = false;
	if (tag === 'follow' && t < tLand) {
		const i = Math.max(0, Math.min(values.length - 2, geo.pts.findIndex((q) => q[0] > head.x) - 1));
		const a = geo.pts[i], b = geo.pts[i + 1];
		const v = lerp(values[i], values[i + 1], clamp01((head.x - a[0]) / Math.max(1, b[0] - a[0])));
		tagText = rollingText(v, final, locale, values[0]);
		rolling = true;
	}
	const tagK = tag === 'follow' ? clamp01((t - tDraw) / 0.2) : pop(t, tLand, 0.32);
	const tagSize = fit(tagText, 58, 360, 0.7);
	const tagW = estW(tagText, tagSize, 0.7) + tagSize * 0.8;
	const tagX = Math.max(tagW / 2 + 8, Math.min(W - tagW / 2 - 8, head.x));
	const trail = Array.from({length: 6}, (_, j) => getPointAtLength(geo.d, Math.max(0, k * geo.L - (j + 1) * 16)));
	const showX = (i: number) => xLabels === 'all' || (xLabels === 'ends' && (i === 0 || i === values.length - 1));
	const ring = p.mark !== undefined && t >= tPass(p.mark) ? clamp01((t - tPass(p.mark)) / 0.6) : -1;
	const landRing = t >= tLand ? clamp01((t - tLand) / 0.5) : -1;
	const breathe = t >= tLand ? 1 + 0.08 * Math.sin((t - tLand) * 6) : 1;
	// camera rides the head (closest while drawing), back to the full view exactly on the landing
	const cam: ChartCam = {f: [head.x, head.y], k: bell(t, tDraw - 0.05, tLand, 0.35, 0.45), zoom: p.camZoom ?? 1.45};
	return (
		<ChartPanel {...panelOf(p, box, cam)}>
			<svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<defs>
					<linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor={GOLD} stopOpacity={0.42} />
						<stop offset="1" stopColor={GOLD} stopOpacity={0} />
					</linearGradient>
					<clipPath id={`${id}c`}>
						<rect x={0} y={0} width={Math.max(0, head.x)} height={H} />
					</clipPath>
				</defs>
				{[1, 2, 3].map((g) => {
					const y = plotB - ((plotB - plotT) * g) / 3;
					return <line key={g} x1={plotL} x2={lerp(plotL, plotR, easeOut((t - p.t0 - 0.1 - g * 0.06) / 0.45))} y1={y} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeDasharray="14 12" />;
				})}
				<line x1={plotL - 8} x2={lerp(plotL - 8, plotR + 8, easeOut((t - p.t0 - 0.1) / 0.45))} y1={plotB} y2={plotB} stroke="rgba(255,255,255,0.55)" strokeWidth={4} strokeLinecap="round" />
				{geo.gd ? <path d={geo.gd} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={6} strokeDasharray="4 14" strokeLinecap="round" opacity={clamp01((t - tDraw) / 0.3)} clipPath={`url(#${id}c)`} /> : null}
				{area && k > 0 ? <path d={`${geo.d} L${f1(geo.pts[geo.pts.length - 1][0])} ${f1(plotB)} L${f1(geo.pts[0][0])} ${f1(plotB)} Z`} fill={`url(#${id}a)`} clipPath={`url(#${id}c)`} /> : null}
				{k > 0 ? (
					<>
						<path d={geo.d} fill="none" stroke={INK} strokeWidth={width + 9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={geo.L} strokeDashoffset={geo.L * (1 - k)} />
						<path d={geo.d} fill="none" stroke={GOLD} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={geo.L} strokeDashoffset={geo.L * (1 - k)} style={{filter: 'drop-shadow(0 0 10px rgba(255,160,40,0.65))'}} />
					</>
				) : null}
				{geo.pts.map((q, i) => {
					if (i === geo.pts.length - 1 || t < tPass(i)) return null;
					const s = pop(t, tPass(i), 0.3);
					const isMark = i === p.mark;
					return <circle key={i} cx={q[0]} cy={q[1]} r={(isMark ? 14 : 9) * s} fill={isMark ? '#fff' : GOLD} stroke={INK} strokeWidth={4} />;
				})}
				{ring >= 0 && ring < 1 && p.mark !== undefined ? <circle cx={geo.pts[p.mark][0]} cy={geo.pts[p.mark][1]} r={14 + 46 * ring} fill="none" stroke="#fff" strokeWidth={5 * (1 - ring)} opacity={1 - ring} /> : null}
				{k > 0 && k < 1 ? trail.map((q, j) => (q ? <circle key={j} cx={q.x} cy={q.y} r={12 - j * 1.5} fill={GOLD} opacity={0.5 * (1 - j / 6)} /> : null)) : null}
				{landRing >= 0 && landRing < 1 ? <circle cx={head.x} cy={head.y} r={18 + 60 * landRing} fill="none" stroke={GOLD} strokeWidth={7 * (1 - landRing)} opacity={1 - landRing} /> : null}
				{t >= tDraw ? (
					<g transform={`translate(${f1(head.x)} ${f1(head.y)}) scale(${breathe})`}>
						<circle r={19} fill={GOLD} stroke={INK} strokeWidth={5} style={{filter: 'drop-shadow(0 0 14px rgba(255,170,40,0.9))'}} />
						<circle r={7} fill="#fff" />
					</g>
				) : null}
			</svg>
			{geo.pts.map((q, i) =>
				showX(i) && labels?.[i] ? (
					<div key={`x${i}`} style={{position: 'absolute', left: q[0], top: plotB + 16, transform: `translateX(${i === 0 ? '-20%' : i === values.length - 1 ? '-80%' : '-50%'})`, opacity: clamp01((t - (i === 0 ? tDraw - 0.2 : tPass(i) - 0.1)) / 0.3), ...labelCss(fit(labels[i], 34, 260, 0.6), i === values.length - 1 ? GOLD : '#fff')}}>
						{labels[i]}
					</div>
				) : null,
			)}
			{p.ghost?.length && p.ghostLabel ? <div style={{position: 'absolute', left: plotL, top: contentTop(p.title), opacity: clamp01((t - tDraw) / 0.4), ...labelCss(30, 'rgba(255,255,255,0.75)')}}>┄ {p.ghostLabel}</div> : null}
			{tagK > 0 ? (
				<div style={{position: 'absolute', left: tagX, top: head.y - 34, transform: 'translate(-50%, -100%)'}}>
					<GoldPill text={tagText} size={tagSize} k={tagK} white={rolling} />
					<div style={{position: 'absolute', left: `calc(50% + ${head.x - tagX}px)`, bottom: -16, width: 0, height: 0, transform: 'translateX(-50%)', borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: `16px solid ${INK}`, opacity: clamp01(tagK * 3)}} />
				</div>
			) : null}
		</ChartPanel>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
// CompareBeforeAfter

export type CompareSide = {value: number; display?: string; label?: string; icon?: IconSpec};

/**
 * «Before → after» in two big numbers (+ optional icons). Until `tSwitch` only «before» is on screen; then
 *   'split' (default): «before» shrinks to one half, a gold divider draws, «after» rises into the other half (stack = top /
 *          bottom, side = left / right; side only for short numbers);
 *   'wipe': a gold bar sweeps across and leaves «after» in the same place; «before» stays small and struck through on top.
 * «after» is gold. `count`: «after» rolls up from the «before» number (≤ 1.1 s, lands on its `display`, R6). `delta` = a gold
 * pill («×10», «+380 %») after the landing — a number too, so it must be in FACTS.md.
 *   <CompareBeforeAfter t0={W(3)} tSwitch={W(7)} t1={We(10)} before={{value: 120, label: '1900'}} after={{value: 2400, label: '2020'}} count />
 */
export const CompareBeforeAfter: React.FC<ChartCommon & {before: CompareSide; after: CompareSide; tSwitch: number; mode?: 'split' | 'wipe'; layout?: 'stack' | 'side'; count?: boolean; delta?: string; size?: number; unit?: string; prefix?: string; dec?: number}> = (p) => {
	const t = useT();
	const {before, after, tSwitch, mode = 'split', layout = 'stack', unit = '', prefix = '', dec = 0, locale = 'en'} = p;
	const box = safeBox(p.box, p.allowLow);
	if (t < p.t0 - 0.01 || t > p.t1 + FADE_OUT) return null;
	const W = box.w, H = box.h;
	const top = contentTop(p.title), bottom = contentBottom(p.source);
	const txt = (s: CompareSide) => s.display ?? prefix + fmtNum(s.value, dec, locale) + unit;
	const bText = txt(before), aFinal = txt(after);
	const bNum = parseShown(bText, locale)?.num ?? before.value;
	const tCount = mode === 'wipe' ? tSwitch + 0.05 : tSwitch + 0.15;
	const r = p.count ? rollR6(t, tCount, 0.9, bNum, aFinal, locale) : {text: aFinal, landed: t >= tSwitch + 0.3, k: 1, tLand: tSwitch + 0.3};
	const midY = (top + H - bottom) / 2;
	const halfH = (H - top - bottom) / 2;
	const side = layout === 'side' && mode === 'split';
	const maxW = side ? W / 2 - PAD : W - 2 * PAD;
	const longest = Math.max(bText.length, aFinal.length);
	// icon sits left of the number (stack) or above it (side): its width counts only in the row layout
	const iconEm = !side && (before.icon || after.icon) ? 1.2 : 0;
	const numSize = Math.min(p.size ?? 170, (maxW * (side ? 0.95 : 0.85)) / (0.7 * longest + iconEm), side ? 999 : halfH * 0.5);

	/** one side: optional icon + big number + label (a plain function, not a component: no remount per frame) */
	const sideView = (s: CompareSide, text: string, gold: boolean, rolling?: boolean, tLand?: number) => (
		<div style={{display: 'flex', flexDirection: side ? 'column' : 'row', alignItems: 'center', gap: numSize * 0.18}}>
			{s.icon ? <ChartIcon icon={s.icon} size={numSize * (side ? 0.8 : 1.0)} gold={gold} /> : null}
			<div style={{display: 'flex', flexDirection: 'column', alignItems: s.icon && !side ? 'flex-start' : 'center'}}>
				<BigNum text={text} size={numSize} gold={gold} rolling={rolling} tLand={tLand} />
				{s.label ? <div style={{...labelCss(fit(s.label, 40, maxW * 0.7, 0.6), gold ? GOLD : 'rgba(255,255,255,0.92)'), marginTop: 10}}>{s.label}</div> : null}
			</div>
		</div>
	);
	const center = (x: number, y: number, extra = ''): React.CSSProperties => ({position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) ${extra}`});
	const kIn = pop(t, p.t0 + 0.15, 0.4);
	// camera: slow push on «before» until the switch, released while it moves; split: push on «after» once it has landed
	const camOf = (bf: Pt, af: Pt): ChartCam => {
		const kB = 0.4 * Math.min(easeInOut((t - p.t0) / Math.max(0.4, tSwitch - p.t0)), 1 - easeInOut((t - tSwitch) / 0.4));
		// wipe: no push after the landing (it would shove the struck «before» line into the title band)
		const kA = mode === 'wipe' ? 0 : 0.45 * easeInOut((t - r.tLand) / 0.6);
		const w = kA / (kA + kB + 1e-6);
		return {f: [lerp(bf[0], af[0], w), lerp(bf[1], af[1], w)], k: Math.max(kA, kB), zoom: p.camZoom ?? 1.15};
	};

	if (mode === 'wipe') {
		const wk = easeInOut((t - tSwitch) / 0.5);
		const bx = lerp(-30, W + 30, wk);
		const cy = midY + (p.title ? 10 : 30);
		const struck = easeOut((t - tSwitch - 0.55) / 0.3);
		const showSmall = t >= tSwitch + 0.5;
		return (
			<ChartPanel {...panelOf(p, box, camOf([W / 2, midY + (p.title ? 10 : 30)], [W / 2, midY + (p.title ? 10 : 30)]))}>
				<div style={{position: 'absolute', inset: 0, borderRadius: 30, overflow: 'hidden'}}>
					{t < tSwitch + 0.5 ? (
						<div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${Math.max(0, bx)}px)`}}>
							<div style={center(W / 2, cy, `scale(${lerp(0.6, 1, kIn)})`)}>
								{sideView(before, bText, false)}
							</div>
						</div>
					) : null}
					{t >= tSwitch ? (
						<div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${Math.max(0, W - bx)}px 0 0)`}}>
							<div style={center(W / 2, cy)}>
								{sideView(after, r.text, true, p.count && !r.landed, r.tLand)}
							</div>
						</div>
					) : null}
					{wk > 0 && t < tSwitch + 0.75 ? <div style={{position: 'absolute', left: bx - 13, top: 0, bottom: 0, width: 26, background: GOLD_GRAD, borderLeft: `4px solid ${INK}`, borderRight: `4px solid ${INK}`, boxShadow: '0 0 50px rgba(255,160,40,0.8)', opacity: clamp01((tSwitch + 0.75 - t) / 0.25)}} /> : null}
				</div>
				{showSmall ? (
					<div style={{position: 'absolute', left: W / 2, top: top + 6, transform: `translateX(-50%) translateY(${(1 - easeOut((t - tSwitch - 0.5) / 0.3)) * 20}px)`, opacity: 0.85 * clamp01((t - tSwitch - 0.5) / 0.3), display: 'flex', alignItems: 'center', gap: 14}}>
						<div style={{position: 'relative'}}>
							<div style={labelCss(38, 'rgba(255,255,255,0.9)')}>{before.label ? `${before.label} · ${bText}` : bText}</div>
							<div style={{position: 'absolute', left: -6, top: '52%', height: 5, width: `calc(${struck * 100}% + 12px)`, background: GOLD, borderRadius: 3, boxShadow: `0 2px 0 ${INK}`}} />
						</div>
					</div>
				) : null}
				{p.delta && r.landed ? <div style={center(W / 2, H - bottom - 56)}><GoldPill text={p.delta} size={62} k={pop(t, r.tLand + 0.1, 0.32)} /></div> : null}
			</ChartPanel>
		);
	}

	// split
	const sw = easeInOut((t - tSwitch) / 0.45);
	const div = easeOut((t - tSwitch - 0.05) / 0.35);
	const ka = easeOut((t - tSwitch - 0.1) / 0.4);
	const bPos: Pt = side ? [lerp(W / 2, W * 0.27, sw), midY] : [W / 2, lerp(midY, top + halfH * 0.52, sw)];
	const aPos: Pt = side ? [W * 0.73 + (1 - ka) * 140, midY] : [W / 2, top + halfH * 1.5 + (1 - ka) * 150];
	const badgeK = p.delta ? (r.landed ? pop(t, r.tLand + 0.08, 0.32) : 0) : pop(t, tSwitch + 0.25, 0.32);
	return (
		<ChartPanel {...panelOf(p, box, camOf([W / 2, midY], aPos))}>
			<div style={center(bPos[0], bPos[1], `scale(${lerp(0.6, 1, kIn) * lerp(1, side ? 0.86 : 0.74, sw)})`)}>
				<div style={{opacity: lerp(1, 0.78, sw)}}>
					{sideView(before, bText, false)}
				</div>
			</div>
			{t >= tSwitch ? (
				<div style={{...center(aPos[0], aPos[1], `scale(${lerp(0.7, 1, pop(t, tSwitch + 0.1, 0.4))})`), opacity: clamp01(ka * 2.5)}}>
					{sideView(after, r.text, true, p.count && !r.landed, r.tLand)}
				</div>
			) : null}
			{div > 0 ? (
				side ? (
					<div style={{position: 'absolute', left: W / 2 - 3, top: midY - (halfH - 10) * div, width: 6, height: (halfH - 10) * 2 * div, background: GOLD, borderRadius: 3, boxShadow: `0 0 24px rgba(255,160,40,0.7), 0 0 0 3px ${INK}`}} />
				) : (
					<div style={{position: 'absolute', top: midY - 3, left: W / 2 - (W / 2 - PAD) * div, width: (W - 2 * PAD) * div, height: 6, background: GOLD, borderRadius: 3, boxShadow: `0 0 24px rgba(255,160,40,0.7), 0 0 0 3px ${INK}`}} />
				)
			) : null}
			{badgeK > 0 ? (
				<div style={center(W / 2, midY)}>
					{p.delta ? (
						<GoldPill text={p.delta} size={62} k={badgeK} />
					) : (
						<div style={{width: 88, height: 88, borderRadius: 44, background: GOLD_GRAD, border: `5px solid ${INK}`, boxShadow: `0 6px 0 ${INK}, 0 0 30px rgba(255,150,40,0.6)`, transform: `scale(${badgeK})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<svg width={44} height={44} viewBox="0 0 44 44" style={{transform: side ? 'rotate(-90deg)' : undefined}}>
								<path d="M8 14 22 30 36 14" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</div>
					)}
				</div>
			) : null}
		</ChartPanel>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
// DonutFill

/**
 * A gold ring fills to value / total (default %), a bright head runs round, ticks light up behind it, the number lands in
 * the centre (gold, ring pulse). `count` rolls the centre number with the fill (both ≤ 1.1 s, R6); otherwise the number
 * pops on the landing. `label` = small line under the number (inside the ring).
 *   <DonutFill t0={W(8)} t1={We(11)} value={71} label="water" />
 */
export const DonutFill: React.FC<ChartCommon & {value: number; total?: number; display?: string; label?: string; tFill?: number; dur?: number; count?: boolean; thick?: number; unit?: string; dec?: number; ticks?: boolean}> = (p) => {
	const t = useT();
	const {value, total = 100, dec = 0, locale = 'en', ticks = true} = p;
	const box = safeBox(p.box, p.allowLow);
	const id = sid(`dn${React.useId()}`);
	if (t < p.t0 - 0.01 || t > p.t1 + FADE_OUT) return null;
	const W = box.w, H = box.h;
	const top = contentTop(p.title), bottom = contentBottom(p.source);
	const R = Math.min((W - 2 * PAD) / 2, (H - top - bottom) / 2) - (ticks ? 40 : 12);   // ticks reach R + 34
	const thick = p.thick ?? R * 0.2;
	const r = R - thick / 2;
	const cx = W / 2, cy = (top + H - bottom) / 2;
	const frac = clamp01(value / Math.max(1e-9, total));
	const unit = p.unit ?? (total === 100 ? LOC[locale][2] : '');
	const final = p.display ?? fmtNum(value, dec, locale) + unit;
	const tFill = p.tFill ?? p.t0 + 0.3;
	const dur = p.count ? Math.min(p.dur ?? 0.9, R6_MAX_S) : p.dur ?? 0.9;
	const k = easeOut((t - tFill) / dur);
	const roll = p.count ? rollR6(t, tFill, dur, 0, final, locale) : {text: final, landed: t >= tFill + dur, k, tLand: tFill + dur};
	const C = 2 * Math.PI * r;
	const a = -Math.PI / 2 + 2 * Math.PI * frac * k;
	const land = t >= tFill + dur ? clamp01((t - tFill - dur) / 0.6) : -1;
	const bump = land >= 0 ? 1 + 0.035 * Math.sin(Math.PI * clamp01(land / 0.55)) : 1;
	const inner = 2 * (r - thick / 2);
	const ns = fit(final, 160, inner * 0.8, 0.7);
	const numK = p.count ? clamp01((t - tFill) / 0.15) : pop(t, tFill + dur - 0.05, 0.32);
	const nTicks = 48;
	// camera: close on the arc head at 12 o'clock, follows it round while pulling out — full view on the landing
	const cam: ChartCam = {f: [cx + Math.cos(a) * r, cy + Math.sin(a) * r], k: 1 - easeInOut((t - tFill + 0.1) / (dur + 0.35)), zoom: p.camZoom ?? 1.5};
	return (
		<ChartPanel {...panelOf(p, box, cam)}>
			<svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `scale(${bump})`, transformOrigin: `${cx}px ${cy}px`}}>
				<defs>
					<linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stopColor="#FFE27A" />
						<stop offset="0.5" stopColor={GOLD} />
						<stop offset="1" stopColor={GOLD2} />
					</linearGradient>
				</defs>
				{ticks
					? Array.from({length: nTicks}, (_, i) => {
							const f = i / nTicks;
							const ang = -Math.PI / 2 + 2 * Math.PI * f;
							const lit = f <= frac * k;
							const appear = clamp01((t - p.t0 - 0.1 - f * 0.4) / 0.2);
							const r0 = R + 14, r1 = R + (i % 4 === 0 ? 34 : 24);
							return <line key={i} x1={cx + Math.cos(ang) * r0} y1={cy + Math.sin(ang) * r0} x2={cx + Math.cos(ang) * r1} y2={cy + Math.sin(ang) * r1} stroke={lit ? GOLD : 'rgba(255,255,255,0.22)'} strokeWidth={lit ? 5 : 3} strokeLinecap="round" opacity={appear} />;
						})
					: null}
				<circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={thick + 10} opacity={0.9} />
				<circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={thick} />
				{k > 0 ? <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${id}g)`} strokeWidth={thick} strokeLinecap="round" strokeDasharray={`${C * frac * k} ${C}`} transform={`rotate(-90 ${cx} ${cy})`} style={{filter: 'drop-shadow(0 0 14px rgba(255,160,40,0.6))'}} /> : null}
				{k > 0 && frac > 0 ? <circle cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={thick * 0.3} fill="#fff" style={{filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.9))'}} /> : null}
				{land >= 0 && land < 1 ? <circle cx={cx} cy={cy} r={R + 10 + 70 * land} fill="none" stroke={GOLD} strokeWidth={8 * (1 - land)} opacity={1 - land} /> : null}
			</svg>
			{numK > 0 ? (
				<div style={{position: 'absolute', left: cx, top: cy - (p.label ? 24 : 0), transform: `translate(-50%, -50%) scale(${lerp(0.5, 1, numK) * bump})`, opacity: clamp01(numK * 3)}}>
					<BigNum text={roll.text} size={ns} gold rolling={p.count && !roll.landed} tLand={roll.tLand} />
				</div>
			) : null}
			{p.label ? <div style={{position: 'absolute', left: cx, top: cy + ns * 0.42, transform: 'translateX(-50%)', opacity: clamp01((t - tFill - dur + 0.1) / 0.3), ...labelCss(fit(p.label, 38, inner * 0.82, 0.6))}}>{p.label}</div> : null}
		</ChartPanel>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
// IconRow

/**
 * N icons appear dim in a quick wave, then K of them fill gold one by one (pop + ring), the rest dims further: «3 of 10».
 * order 'start' | 'end' | 'spread' (evenly scattered) | 'random' (seeded). The fill takes ≤ fillDur (default 1.0, max
 * 1.1 s — it is a count, R6). `caption` (optional, appears once the camera has pulled out after the fill, ≈ 0.75 s after
 * the last icon) must not repeat the VO (T6).
 *   <IconRow t0={W(5)} tFill={W(7)} t1={We(9)} n={10} k={3} icon="person" />
 */
export const IconRow: React.FC<ChartCommon & {n: number; k: number; icon?: IconSpec; tFill?: number; fillDur?: number; cols?: number; order?: 'start' | 'end' | 'spread' | 'random'; seed?: number; caption?: string}> = (p) => {
	const t = useT();
	const {icon = 'person', order = 'start', seed = 7} = p;
	const n = Math.max(1, Math.round(p.n));
	const kk = Math.max(0, Math.min(n, Math.round(p.k)));
	const box = safeBox(p.box, p.allowLow);
	const id = sid(`ir${React.useId()}`);
	const filled = React.useMemo(() => {
		const idx = Array.from({length: n}, (_, i) => i);
		if (order === 'end') return idx.slice(n - kk);
		if (order === 'spread') return Array.from({length: kk}, (_, j) => Math.min(n - 1, Math.round(((j + 0.5) * n) / Math.max(1, kk) - 0.5)));
		if (order === 'random') return [...idx].sort((a, b) => h1(seed + a * 3.1) - h1(seed + b * 3.1)).slice(0, kk).sort((a, b) => a - b);
		return idx.slice(0, kk);
	}, [n, kk, order, seed]);
	if (t < p.t0 - 0.01 || t > p.t1 + FADE_OUT) return null;
	const W = box.w, H = box.h;
	const top = contentTop(p.title), bottom = contentBottom(p.source) + (p.caption ? 86 : 0);
	const cols = p.cols ?? (n <= 5 ? n : n <= 10 ? 5 : n <= 40 ? Math.ceil(Math.sqrt(n * 0.8)) : 10);
	const rows = Math.ceil(n / cols);
	const cell = Math.min((W - 2 * PAD) / cols, (H - top - bottom) / rows);
	const size = cell * 0.8;
	const gx = (W - cols * cell) / 2, gy = top + (H - top - bottom - rows * cell) / 2;
	const tFill = p.tFill ?? p.t0 + 0.9;
	const fillDur = Math.min(p.fillDur ?? 1.0, R6_MAX_S);
	const step = kk > 1 ? Math.min(0.16, fillDur / kk) : 0;
	const tDone = tFill + step * Math.max(0, kk - 1) + 0.3;
	const wave = Math.min(0.05, 0.6 / n);
	const restDim = easeOut((t - tDone) / 0.4);
	const fillAt = new Map(filled.map((i, j) => [i, tFill + j * step]));
	// camera: close on the icon being filled (≤ 5 fills) or on the centroid of the filled ones (more), pulled out after the fill
	const centre = (i: number): Pt => [gx + (i % cols) * cell + cell / 2, gy + Math.floor(i / cols) * cell + cell / 2];
	const fPts = filled.map(centre);
	const uF = step > 0 ? clamp01((t - tFill) / (step * Math.max(1, kk - 1))) * Math.max(0, kk - 1) : 0;
	let fc: Pt = fPts.length ? along(fPts, uF) : [W / 2, H / 2];
	if (kk > 5) {
		const m = Math.max(1, Math.min(kk, Math.floor(uF) + 1));
		const sel = fPts.slice(0, m);
		fc = [sel.reduce((a, q) => a + q[0], 0) / m, sel.reduce((a, q) => a + q[1], 0) / m];
	}
	const cam: ChartCam | null = kk ? {f: fc, k: bell(t, tFill - 0.35, tDone + 0.5, 0.35, 0.5), zoom: p.camZoom ?? (kk > 5 ? 1.2 : 1.35)} : null;
	return (
		<ChartPanel {...panelOf(p, box, cam)}>
			<svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<defs>
					<linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#FFE27A" />
						<stop offset="0.45" stopColor={GOLD} />
						<stop offset="1" stopColor={GOLD2} />
					</linearGradient>
					<filter id={`${id}f`} x="-40%" y="-40%" width="180%" height="180%">
						<feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#FFA028" floodOpacity="0.75" />
					</filter>
				</defs>
				{Array.from({length: n}, (_, i) => {
					const c = i % cols, rr = Math.floor(i / cols);
					const x = gx + c * cell + cell / 2, y = gy + rr * cell + cell / 2;
					const ta = p.t0 + 0.2 + i * wave;
					if (t < ta) return null;
					const a = pop(t, ta, 0.3);
					const tf = fillAt.get(i);
					const on = tf !== undefined && t >= tf;
					const f = on ? pop(t, tf, 0.3) : 0;
					const breathe = on && t > tDone ? 1 + 0.035 * Math.sin((t - tDone) * 5 + i) : 1;
					const s = (size / 100) * a * (on ? lerp(1.35, 1, f) * breathe : 1);
					const ring = on ? clamp01((t - tf) / 0.45) : 1;
					return (
						<g key={i}>
							{on && ring < 1 ? <circle cx={x} cy={y} r={size * (0.45 + 0.4 * ring)} fill="none" stroke={GOLD} strokeWidth={6 * (1 - ring)} opacity={1 - ring} /> : null}
							<g transform={`translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(4)}) translate(-50 -50)`}>
								<path d={iconD(icon)} fillRule="evenodd" fill={on ? `url(#${id}g)` : `rgba(255,255,255,${lerp(0.24, 0.12, restDim)})`} stroke={on ? INK : `rgba(255,255,255,${lerp(0.45, 0.25, restDim)})`} strokeWidth={on ? 6 : 3} strokeLinejoin="round" paintOrder="stroke" filter={on ? `url(#${id}f)` : undefined} />
							</g>
						</g>
					);
				})}
			</svg>
			{p.caption ? (
				<div style={{position: 'absolute', left: W / 2, top: H - bottom + 18, transform: `translateX(-50%) translateY(${(1 - easeOut((t - tDone - 0.45) / 0.35)) * 20}px)`, opacity: clamp01((t - tDone - 0.45) / 0.35), ...labelCss(fit(p.caption, 50, W - 2 * PAD, 0.62))}}>{p.caption}</div>
			) : null}
		</ChartPanel>
	);
};
