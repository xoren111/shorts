import React, {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, Easing} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import project from '../../project.json';
import {ANTON, HEAD, MONT} from '../fonts';
import {FPS, W, WORDS, We} from '../lib/time';
import {GOLD, INK, clamp01, goldFill, h1, lerp, useT} from './gfx';

/**
 * Kinetic typography: a VO phrase (word indices fromWord…toWord of data/words.json) animated word by word in sync with the
 * voice — every word starts on its own W(i) (minus `lead`), so the text never runs ahead of or behind the speaker.
 *
 *   <Kinetic fromWord={15} toWord={20} preset="stack" />                       // «BIG TEXT / NEVER / REPEATS / THE VOICE»
 *   <Kinetic fromWord={21} toWord={22} preset="slam" display={{21: '3'}} />    // big «3» slams in on «Three», then «TRANSITIONS»
 *   <Kinetic fromWord={23} toWord={24} preset="punchKey" keyWords={[24]} zone="center" />
 *
 * Presets
 *   pop        every word springs in (scale 0 → overshoot → 1), the word being spoken sits 4 % bigger
 *   slam       every word drops in big (2.3× → 1 in 0.1 s) and lands ON its word start: squash + 2-frame impact frame (inverted
 *              word over a white burst) + burst lines + a short shake of the text block only (no camera shake, no full-frame flash);
 *              lines are poster lines (each grows to the full width, capped at `size`), so «3 / TRANSITIONS» lands a big «3»
 *   stack      words stack into lines (auto: 1–2 words a line, small words ride with the next), each line auto-fitted to the
 *              full width (justified poster stack); a new line opens at the bottom and the stack re-centres
 *   maskRise   each word rises out of its own mask (standard T4 «rise-out-of-mask»); key words get a gold bar wipe; the exit
 *              sinks the words back into the masks
 *   typewriter characters typed over each word's spoken time (Alfa Slab One = slab «typewriter» look), gold caret
 *   punchKey   the phrase builds calmly in white; only the key word punches (spring 1/keyScale → keyScale) and turns gold,
 *              the other words step back (94 %, opacity 0.82 — still white)
 *
 * Channel rules built in (SHORTS_EDITING_STANDARD v1.3+): text white + gold only (T5; keyWords gold, default = project.gold_words
 * inside the phrase, punchKey falls back to the longest word), straight — no rotate / skew anywhere (T4), INK outline
 * (0.13 × font size) + dark scrim behind the block (T9, both on by default), auto-fit with @remotion/layout-utils into the
 * safe box x 48–887 / y 288–1140 (Google safe zone, kept above the subtitle band of R3) — the block is shrunk / shifted to stay
 * inside, never overflows; default width 690 px at x = 540 (standard 4.4 «big text B»), zone upper / center / lower = centre y
 * 480 / 700 / 930.
 *
 * NEVER TWICE (T6): the phrase's subtitle must be hidden → the word range [fromWord, toWord] goes into project.json
 * `hide_subs`. `node tools/kinetic_check.mjs --fix` adds every <Kinetic> range found in src/ automatically; `node tools/
 * kinetic_check.mjs` (and check.mjs, item 12) fails while a range is not covered. Big text frequency (T11): ≤ 1 phrase per
 * 10 / 8 / 5 s at L1 / L2 / L3 (kinetic_check warns). One big text zone at a time (T7): do not stack two phrases.
 * Numbers: a `display` override such as {21: '3'} must be a FACTS.md number (kinetic_check, like check.mjs item 6).
 * Fonts: HEAD (Alfa Slab One) and Anton are Latin + ÄÖÜß only → RU text: font="mont" (Montserrat 900 has Cyrillic).
 */

export type KineticPreset = 'pop' | 'slam' | 'stack' | 'maskRise' | 'typewriter' | 'punchKey';
export const KINETIC_PRESETS: readonly KineticPreset[] = ['pop', 'slam', 'stack', 'maskRise', 'typewriter', 'punchKey'];
export type KineticZone = 'upper' | 'center' | 'lower';
export type KineticFont = 'head' | 'mont' | 'anton';

/** where a kinetic block may sit: Google safe zone x 48–887 / top 288, bottom kept above the subtitle band (R3: 1180–1300) */
export const KINETIC_SAFE = {x0: 48, x1: 887, y0: 288, y1: 1140} as const;
export const KINETIC_ZONE_Y: Record<KineticZone, number> = {upper: 480, center: 700, lower: 930};
/** a word starts animating `lead` s before it is spoken (the subtitles use the same 0.03 s) */
export const KINETIC_LEAD = 0.03;
/** the phrase stays `hold` s after its last word ends, then exits over EXIT s */
export const KINETIC_HOLD = 0.35;
const EXIT = 0.2;
/** slam: drop time; the impact lands on W(i) − lead */
const SLAM_DROP = 0.1;
const GAP_EM = 0.26;
const LH = 1.04;
const STROKE_EM = 0.13;

const PRESET_DEF: Record<KineticPreset, {size: number; maxLines: number}> = {
	pop: {size: 120, maxLines: 3},
	slam: {size: 140, maxLines: 3},
	stack: {size: 160, maxLines: 6},
	maskRise: {size: 116, maxLines: 3},
	typewriter: {size: 92, maxLines: 4},
	punchKey: {size: 100, maxLines: 3},
};
const FAMILY: Record<KineticFont, [string, number]> = {head: [HEAD, 400], mont: [MONT, 900], anton: [ANTON, 400]};

export type KineticProps = {
	/** first / last VO word of the phrase (indices of data/words.json, inclusive) */
	fromWord: number;
	toWord: number;
	preset: KineticPreset;
	/** gold words (word indices, T5: one per phrase); default = project.gold_words inside the range */
	keyWords?: number[];
	/** vertical slot (centre y 480 / 700 / 930); `y` overrides it */
	zone?: KineticZone;
	/** block centre (clamped so the whole block stays inside KINETIC_SAFE) */
	x?: number;
	y?: number;
	/** max block width (default 690 = standard «big text B» at x 540; never wider than the safe box allows at x) */
	maxWidth?: number;
	/** max block height (default 600) */
	maxHeight?: number;
	/** max font size px (auto-fit only shrinks); default per preset: pop 120, slam 140, stack 160 (per line), maskRise 116,
	 * typewriter 92, punchKey 100 (the key word × keyScale) */
	size?: number;
	maxLines?: number;
	font?: KineticFont;
	/** INK outline (T9), default true */
	outline?: boolean;
	/** dark scrim behind the block (T9): true / false or a strength 0–1.5, default 1 */
	scrim?: boolean | number;
	/** s after the last word ends before the exit (default 0.35); `t1` = absolute exit end instead (e.g. the beat's t1) */
	hold?: number;
	t1?: number;
	/** s before W(i) each word starts (default 0.03) */
	lead?: number;
	/** per-word display text, e.g. {21: '3'} (a FACTS.md number) or {19: ''} to drop a filler word from the picture */
	display?: Partial<Record<number, string>>;
	/** UPPERCASE (default true, like the subtitles) */
	upper?: boolean;
	/** pop / slam / maskRise: only the current word on screen, each replaces the last (default false = the phrase builds up) */
	oneWord?: boolean;
	/** stack: explicit lines as word indices, e.g. [[15, 16], [17], [18], [19, 20]] */
	lines?: number[][];
	/** slam: shake of the text block in px on every impact (default 6, 0 = off; L1 → 0) */
	shake?: number;
	/** slam: 2-frame impact frame + burst lines (default true) */
	impact?: boolean;
	/** punchKey: size of the key word relative to the others (default 1.4) */
	keyScale?: number;
	/** seconds added to every word time — only for galleries / replays, 0 in a Short */
	shift?: number;
	/** draws the safe box and the fitted block (QA stills only) */
	debug?: boolean;
};

type Item = {i: number; text: string; key: boolean};
type Line = {items: number[]; size: number; width: number; height: number};
type Layout = {lines: Line[]; width: number; height: number};

const clean = (w: string) => w.replace(/[.,;:—…]+$/g, '').replace(/^[—…]+/, '');
const EASE_RISE = Easing.bezier(0.16, 1, 0.3, 1);
const easeOut3 = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn2 = (x: number) => clamp01(x) * clamp01(x);

/** closed-form damped spring 0 → 1 (deterministic, any frame order): w0 rad/s, z damping ratio < 1 */
export const spr = (t: number, w0 = 21, z = 0.42) => {
	if (t <= 0) return 0;
	const w1 = w0 * Math.sqrt(1 - z * z);
	return 1 - Math.exp(-z * w0 * t) * (Math.cos(w1 * t) + ((z * w0) / w1) * Math.sin(w1 * t));
};

// ---------------------------------------------------------------------------------------------------------------- fonts
const faceLoaded = (family: string) => {
	if (typeof document === 'undefined' || !document.fonts) return true;
	let hit = false;
	document.fonts.forEach((f) => {
		if (f.family.replace(/^["']|["']$/g, '') === family && f.status === 'loaded') hit = true;
	});
	return hit;
};

/**
 * true once src/fonts.ts has added the family to document.fonts (it adds a face only after it loaded). Until then the frame
 * is held with delayRender, so measureText never measures — and never caches — the fallback font.
 */
export const useFontReady = (family: string): boolean => {
	const [ready, setReady] = useState(() => faceLoaded(family));
	const [handle] = useState(() => (ready ? null : delayRender(`kinetic: font ${family}`)));
	useEffect(() => {
		if (handle === null) return;
		let done = false;
		let n = 0;
		const finish = () => {
			if (done) return;
			done = true;
			clearInterval(iv);
			setReady(true);
			continueRender(handle);
		};
		const iv = setInterval(() => {
			n++;
			if (faceLoaded(family)) finish();
			else if (n > 400) {
				console.warn(`kinetic: font ${family} not in document.fonts after 10 s — measuring with the fallback font`);
				finish();
			}
		}, 25);
		return () => {
			if (done) return;
			done = true;
			clearInterval(iv);
			continueRender(handle);
		};
	}, [family, handle]);
	return ready;
};

// --------------------------------------------------------------------------------------------------------------- layout
/** width of each word at 100 px (layout-utils measureText; widths scale linearly with the font size) */
const widths100 = (items: Item[], fam: string, weight: number, ready: boolean) =>
	items.map((it) => (ready ? measureText({text: it.text, fontFamily: fam, fontWeight: weight, fontSize: 100}).width : it.text.length * 68));

const lineWidth = (ln: number[], w100: number[], sc: number[], s: number) => ln.reduce((a, k) => a + (w100[k] * sc[k] * s) / 100, 0) + GAP_EM * s * (ln.length - 1);
const lineHeight = (ln: number[], sc: number[], s: number) => s * LH * Math.max(...ln.map((k) => sc[k]));

/** greedy lines at one font size for every word, the largest size (≤ maxSize) whose lines fit maxW / maxH / maxLines */
export const fitFlow = (w100: number[], sc: number[], maxW: number, maxH: number, maxLines: number, maxSize: number): Layout => {
	const breakAt = (s: number) => {
		const out: number[][] = [];
		let cur: number[] = [];
		let cw = 0;
		w100.forEach((w0, k) => {
			const w = (w0 * sc[k] * s) / 100;
			const add = cur.length ? cw + GAP_EM * s + w : w;
			if (cur.length && add > maxW) {
				out.push(cur);
				cur = [k];
				cw = w;
			} else {
				cur.push(k);
				cw = add;
			}
		});
		if (cur.length) out.push(cur);
		return out;
	};
	const fits = (s: number) => {
		const ls = breakAt(s);
		return ls.length <= maxLines && ls.every((l) => lineWidth(l, w100, sc, s) <= maxW + 0.5) && ls.reduce((a, l) => a + lineHeight(l, sc, s), 0) <= maxH + 0.5;
	};
	let s = maxSize;
	if (!fits(s)) {
		let lo = 8;
		let hi = maxSize;
		for (let it = 0; it < 22; it++) {
			const mid = (lo + hi) / 2;
			if (fits(mid)) lo = mid;
			else hi = mid;
		}
		s = lo;
	}
	const lines = breakAt(s).map((l) => ({items: l, size: s, width: lineWidth(l, w100, sc, s), height: lineHeight(l, sc, s)}));
	return {lines, width: Math.max(...lines.map((l) => l.width)), height: lines.reduce((a, l) => a + l.height, 0)};
};

/** stack: every line fitted to the full width on its own (capped at maxSize), the whole stack shrunk to maxH */
export const fitStack = (groups: number[][], w100: number[], sc: number[], maxW: number, maxH: number, maxSize: number): Layout => {
	let sizes = groups.map((g) => Math.min(maxSize, (maxW * 100) / (g.reduce((a, k) => a + w100[k] * sc[k], 0) + GAP_EM * 100 * (g.length - 1))));
	const total = groups.reduce((a, g, j) => a + lineHeight(g, sc, sizes[j]), 0);
	if (total > maxH) sizes = sizes.map((s) => (s * maxH) / total);
	const lines = groups.map((g, j) => ({items: g, size: sizes[j], width: lineWidth(g, w100, sc, sizes[j]), height: lineHeight(g, sc, sizes[j])}));
	return {lines, width: Math.max(...lines.map((l) => l.width)), height: lines.reduce((a, l) => a + l.height, 0)};
};

/** stack lines: a line closes at ≥ 5 letters or at punctuation; words of ≤ 3 letters ride with the next word */
const autoStack = (items: Item[]) => {
	const out: number[][] = [];
	let cur: number[] = [];
	items.forEach((it, k) => {
		cur.push(k);
		const chars = cur.reduce((a, j) => a + items[j].text.length, 0);
		const punct = /[,.;:!?—…]$/.test(WORDS[it.i].w);
		const rides = it.text.length <= 3 && k < items.length - 1 && !punct;
		if (!rides && (chars >= 5 || punct)) {
			out.push(cur);
			cur = [];
		}
	});
	if (cur.length) out.push(cur);
	return out;
};

// ---------------------------------------------------------------------------------------------------------------- glyph
type GlyphProps = {
	text: string;
	size: number;
	fam: string;
	weight: number;
	sw: number;
	outline: boolean;
	/** 0 white … 1 gold (gradient fill, like KeyFact / BigText) */
	gold?: number;
	/** solid gold instead of the gradient (typewriter: per-character visibility) */
	solidGold?: boolean;
	/** impact frame: ink letters on a white outline */
	invert?: boolean;
	/** typewriter: number of visible characters (layout stays reserved for the whole word) */
	shown?: number;
	caret?: boolean;
	/** warm glow 0–1 (punchKey) */
	glow?: number;
};

const Glyph: React.FC<GlyphProps> = ({text, size, fam, weight, sw, outline, gold = 0, solidGold, invert, shown, caret, glow = 0}) => {
	const base: React.CSSProperties = {fontFamily: fam, fontWeight: weight, fontSize: size, lineHeight: 1, whiteSpace: 'pre', letterSpacing: 0, display: 'block'};
	const top: React.CSSProperties = {...base, position: 'absolute', left: 0, top: 0};
	const chars = Array.from(text);
	const body = shown === undefined ? text : chars.map((ch, c) => <span key={c} style={{visibility: c < shown ? 'visible' : 'hidden'}}>{ch}</span>);
	const ink = invert ? '#fff' : INK;
	const glowF = glow > 0.01 ? ` drop-shadow(0 0 ${Math.round(size * 0.28)}px rgba(255,170,40,${(0.75 * glow).toFixed(3)}))` : '';
	return (
		<span style={{position: 'relative', display: 'inline-block'}}>
			<span
				style={{
					...base,
					color: outline ? ink : 'transparent',
					WebkitTextStroke: outline ? `${sw}px ${ink}` : undefined,
					filter: outline ? `drop-shadow(0 ${Math.max(2, Math.round(sw * 0.45))}px 0 ${INK})${glowF}` : glowF || undefined,
				}}
			>
				{body}
			</span>
			{invert ? (
				<span style={{...top, color: INK}}>{body}</span>
			) : (
				<>
					{gold < 0.999 ? <span style={{...top, color: '#fff'}}>{body}</span> : null}
					{gold > 0.001 ? <span style={{...top, ...(solidGold ? {color: GOLD} : goldFill), opacity: gold}}>{body}</span> : null}
				</>
			)}
			{caret ? (
				<span style={{...top, color: 'transparent'}}>
					{chars.slice(0, shown ?? chars.length).join('')}
					<span style={{display: 'inline-block', position: 'relative', width: 0, height: size, verticalAlign: 'top'}}>
						<span style={{position: 'absolute', left: size * 0.05, top: size * 0.12, width: Math.max(6, size * 0.09), height: size * 0.76, background: GOLD, boxShadow: `0 0 0 ${Math.max(2, sw * 0.35)}px ${INK}`}} />
					</span>
				</span>
			) : null}
		</span>
	);
};

/** slam impact: 2 frames of a white burst behind the (inverted) word, then burst lines flying out and fading (0.24 s) */
const ImpactBurst: React.FC<{w: number; h: number; a: number; size: number; seed: number}> = ({w, h, a, size, seed}) => {
	const D = 0.24;
	if (a < 0 || a > D) return null;
	const k = a / D;
	const e = easeOut3(k);
	const pad = size * 1.3;
	const cx = w / 2 + pad;
	const cy = h / 2 + pad;
	const rx = w / 2 + size * 0.22;
	const ry = h / 2 + size * 0.18;
	const n = 16;
	const star = a < 2 / FPS + 1e-6;
	const pts = Array.from({length: n * 2}, (_, j) => {
		const ang = (j / (n * 2)) * Math.PI * 2;
		const r = j % 2 ? 0.98 : 1.32 + 0.12 * h1(seed * 17 + j);
		return `${(cx + Math.cos(ang) * rx * r).toFixed(1)},${(cy + Math.sin(ang) * ry * r).toFixed(1)}`;
	}).join(' ');
	return (
		<svg width={w + 2 * pad} height={h + 2 * pad} style={{position: 'absolute', left: -pad, top: -pad, overflow: 'visible', pointerEvents: 'none', zIndex: 0}}>
			{star ? <polygon points={pts} fill="#fff" stroke={INK} strokeWidth={Math.max(3, size * 0.035)} strokeLinejoin="round" /> : null}
			{Array.from({length: n}, (_, j) => {
				const ang = ((j + 0.35 * h1(seed * 7 + j)) / n) * Math.PI * 2;
				const r0 = lerp(1.08, 1.5, e);
				const r1 = lerp(1.25, 2.05, e) * (0.85 + 0.3 * h1(seed * 31 + j));
				const c = Math.cos(ang);
				const s = Math.sin(ang);
				return (
					<line
						key={j}
						x1={cx + c * rx * r0}
						y1={cy + s * ry * r0}
						x2={cx + c * rx * r1}
						y2={cy + s * ry * r1}
						stroke="#fff"
						strokeWidth={Math.max(1, size * 0.075 * (1 - k))}
						strokeLinecap="round"
						opacity={1 - k * 0.6}
						style={{filter: `drop-shadow(0 0 2px ${INK})`}}
					/>
				);
			})}
		</svg>
	);
};

// ------------------------------------------------------------------------------------------------------------- component
/** on-screen window [t0, t1] of a phrase (seconds) — e.g. to time a beat or an SFX; the same formulas as <Kinetic> */
export const kineticWindow = (fromWord: number, toWord: number, preset: KineticPreset, o: {lead?: number; hold?: number; t1?: number; shift?: number} = {}) => {
	const sh = o.shift ?? 0;
	const t0 = W(fromWord) + sh - (o.lead ?? KINETIC_LEAD) - (preset === 'slam' ? SLAM_DROP : 0);
	const t1 = o.t1 ?? We(toWord) + sh + (o.hold ?? KINETIC_HOLD);
	return {t0, t1};
};

export const Kinetic: React.FC<KineticProps> = (p) => {
	const t = useT();
	const {fromWord, toWord, preset} = p;
	const [fam, weight] = FAMILY[p.font ?? 'head'];
	const ready = useFontReady(fam);
	const def = PRESET_DEF[preset];
	const shift = p.shift ?? 0;
	const lead = p.lead ?? KINETIC_LEAD;
	const outline = p.outline ?? true;
	const scrim = p.scrim === undefined || p.scrim === true ? 1 : p.scrim === false ? 0 : p.scrim;
	const keyScale = preset === 'punchKey' ? (p.keyScale ?? 1.4) : 1;
	const oneWord = !!p.oneWord && (preset === 'pop' || preset === 'slam' || preset === 'maskRise');
	const keyDep = JSON.stringify(p.keyWords ?? null);
	const dispDep = JSON.stringify(p.display ?? null);
	const linesDep = JSON.stringify(p.lines ?? null);

	const items = useMemo<Item[]>(() => {
		if (!(fromWord >= 0 && toWord < WORDS.length && fromWord <= toWord)) throw new Error(`Kinetic: word range ${fromWord}–${toWord} outside data/words.json (0–${WORDS.length - 1})`);
		const gold = (project.gold_words as number[]).filter((i) => i >= fromWord && i <= toWord);
		const keys = new Set(p.keyWords ?? gold);
		const out: Item[] = [];
		for (let i = fromWord; i <= toWord; i++) {
			const raw = p.display?.[i] ?? clean(WORDS[i].w);
			if (!raw) continue;
			out.push({i, text: p.upper === false ? raw : raw.toUpperCase(), key: keys.has(i)});
		}
		if (preset === 'punchKey' && !out.some((x) => x.key) && out.length) {
			const longest = out.reduce((a, b) => (b.text.length > a.text.length ? b : a));
			longest.key = true;
		}
		return out;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fromWord, toWord, preset, keyDep, dispDep, p.upper]);

	// requested centre → the widest block the safe box allows there
	const S = KINETIC_SAFE;
	const cxReq = Math.max(S.x0 + 60, Math.min(S.x1 - 60, p.x ?? 540));
	const cyReq = p.y ?? KINETIC_ZONE_Y[p.zone ?? 'upper'];
	const half = Math.min(cxReq - S.x0, S.x1 - cxReq);
	const maxW = Math.min(p.maxWidth ?? 690, 2 * half) * 0.96 - 8;   // room for the outline (0.13 em, half of it outside)
	const maxH = Math.min(p.maxHeight ?? 600, S.y1 - S.y0);
	const maxSize = p.size ?? def.size;
	const maxLines = p.maxLines ?? def.maxLines;

	const w100 = useMemo(() => widths100(items, fam, weight, ready), [items, fam, weight, ready]);
	const layouts = useMemo<Layout[]>(() => {
		const sc = items.map((it) => (it.key ? keyScale : 1));
		if (!items.length) return [];
		if (oneWord) return items.map((_, k) => fitFlow([w100[k]], [sc[k]], maxW, maxH, 1, maxSize));
		if (preset === 'stack') {
			const groups = p.lines ? p.lines.map((ln) => ln.map((i) => items.findIndex((x) => x.i === i)).filter((k) => k >= 0)).filter((g) => g.length) : autoStack(items);
			return [fitStack(groups, w100, sc, maxW, maxH, maxSize)];
		}
		const flow = fitFlow(w100, sc, maxW, maxH, maxLines, maxSize);
		// slam: poster lines — each line of the flow grows to the full width (capped at size), so a lone «3» lands big
		if (preset === 'slam') return [fitStack(flow.lines.map((l) => l.items), w100, sc, maxW, maxH, maxSize)];
		return [flow];
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [items, w100, keyScale, oneWord, preset, linesDep, maxW, maxH, maxLines, maxSize]);

	if (!items.length || !layouts.length) return null;
	const ts = (k: number) => W(items[k].i) + shift - lead - (preset === 'slam' ? SLAM_DROP : 0);
	const te = (k: number) => We(items[k].i) + shift;
	const T0 = ts(0);
	const T1 = p.t1 ?? We(toWord) + shift + (p.hold ?? KINETIC_HOLD);
	if (t < T0 || t > T1) return null;

	// oneWord: the current word only (each replaces the last); otherwise the whole phrase layout
	let cur = 0;
	for (let k = 0; k < items.length; k++) if (t >= ts(k)) cur = k;
	const L = oneWord ? layouts[cur] : layouts[0];
	const lines = oneWord ? [{...L.lines[0], items: [cur]}] : L.lines;
	const sizeMax = Math.max(...lines.map((l) => l.size));
	const swOf = (s: number) => (outline ? Math.max(4, Math.round(s * STROKE_EM)) : 0);
	const bw = L.width + swOf(sizeMax);
	const bh = L.height;
	const cx = bw >= S.x1 - S.x0 ? (S.x0 + S.x1) / 2 : Math.max(S.x0 + bw / 2, Math.min(S.x1 - bw / 2, cxReq));
	const cy = bh >= S.y1 - S.y0 ? (S.y0 + S.y1) / 2 : Math.max(S.y0 + bh / 2, Math.min(S.y1 - bh / 2, cyReq));

	const u = clamp01((t - (T1 - EXIT)) / EXIT);   // exit progress
	const appear = clamp01((t - T0) / 0.15);
	const n = items.length;

	// slam: the text block (not the camera) shakes on each impact
	let shx = 0;
	let shy = 0;
	if (preset === 'slam' && (p.shake ?? 6) > 0) {
		for (let k = 0; k < n; k++) {
			const a = t - (ts(k) + SLAM_DROP);
			if (a < 0 || a > 0.25) continue;
			const d = (p.shake ?? 6) * Math.exp(-a * 16);
			shx += Math.sin(a * 85 + k) * d;
			shy += Math.cos(a * 72 + k) * d * 0.7;
		}
	}
	// punchKey: the others step back once a key word has punched
	let dim = 0;
	if (preset === 'punchKey') for (let k = 0; k < n; k++) if (items[k].key) dim = Math.max(dim, clamp01((t - ts(k)) / 0.18));

	// stack: lines open one by one at the bottom, the stack re-centres around cy
	const open = lines.map((ln) => (preset === 'stack' ? easeOut3((t - ts(ln.items[0])) / 0.2) : 1));
	const shownH = preset === 'stack' ? lines.reduce((a, ln, j) => a + ln.height * open[j], 0) : bh;

	const blockStyle: React.CSSProperties = {
		position: 'absolute',
		left: cx,
		top: cy,
		width: bw,
		height: shownH,
		transform: `translate(-50%, -50%) translate(${shx.toFixed(2)}px, ${shy.toFixed(2)}px)${preset === 'maskRise' ? '' : ` translateY(${(preset === 'slam' ? 24 : 0) * u}px) scale(${1 - 0.08 * easeIn2(u)})`}`,
		opacity: preset === 'maskRise' ? 1 : 1 - easeIn2(u),
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
	};

	const renderWord = (k: number, line: Line, j: number) => {
		const it = items[k];
		const size = line.size * (it.key ? keyScale : 1);
		const sw = swOf(size);
		const w = (size * w100[k]) / 100;
		const a = t - ts(k);
		const visible = a >= 0;
		const glyph: GlyphProps = {text: it.text, size, fam, weight, sw, outline, gold: it.key ? 1 : 0};
		let tr = '';
		let origin = '50% 50%';
		let op = 1;
		let burst: React.ReactNode = null;
		let bar: React.ReactNode = null;
		// overshoot / speaking emphasis never grows a word into its neighbours (≤ 45 % of the word gap on each side)
		const room = line.items.length < 2 ? 9 : w > 0 ? (GAP_EM * line.size * 0.45) / (w / 2) : 0;
		if (preset === 'pop') {
			const s0 = spr(a, 21, 0.42);
			const speaking = t >= ts(k) && t < te(k) + 0.05;
			const s = Math.min(s0 * (speaking ? 1.04 : 1), 1 + room);
			tr = `translateY(${((1 - Math.min(1, s0)) * size * 0.3).toFixed(2)}px) scale(${s.toFixed(4)})`;
			op = visible ? clamp01(s0 * 4) : 0;
		} else if (preset === 'slam') {
			if (!visible) op = 0;
			else if (a < SLAM_DROP) {
				const e = easeIn2(a / SLAM_DROP);
				tr = `translateY(${lerp(-0.55 * size, 0, e).toFixed(2)}px) scale(${lerp(2.3, 1, e).toFixed(4)})`;
				op = clamp01((a / SLAM_DROP) * 3);
			} else {
				const b = a - SLAM_DROP;
				const q = Math.exp(-b * 22) * Math.cos(b * 34);
				tr = `scale(${(1 + 0.16 * q).toFixed(4)}, ${(1 - 0.2 * q).toFixed(4)})`;
				origin = '50% 100%';
				if (p.impact ?? true) {
					glyph.invert = b < 2 / FPS + 1e-6;
					burst = <ImpactBurst w={w} h={size} a={b} size={size} seed={it.i} />;
				}
			}
		} else if (preset === 'stack') {
			const s = spr(a, 26, 0.6);
			tr = `scale(${lerp(1.35, 1, Math.min(1.08, s)).toFixed(4)})`;   // lands from slightly bigger (a light slam per word)
			op = visible ? clamp01(s * 3) : 0;
		} else if (preset === 'maskRise') {
			// the mask: generous above / at the sides (outline, glow), tight below (outline + drop shadow only), so a word
			// sinking out on the exit never shows over the line under it
			const pad = sw + size * 0.12;
			const padB = sw + size * 0.03;
			const k1 = visible ? EASE_RISE(clamp01(a / 0.34)) : 0;
			const order = lines.slice(0, j).reduce((acc, l) => acc + l.items.length, 0) + line.items.indexOf(k);
			const sink = clamp01(((t - (T1 - EXIT)) / EXIT) * 1.6 - (0.6 * order) / Math.max(1, n));
			const dy = (1 - k1 + easeIn2(sink)) * (size + pad + padB);
			if (it.key) {
				const bk = easeOut3((a - 0.1) / 0.25) * (1 - easeIn2(sink));
				bar = <span style={{position: 'absolute', left: 0, top: size * 0.93, width: w, height: Math.max(6, size * 0.075), background: GOLD, borderRadius: size * 0.04, transform: `scaleX(${bk.toFixed(4)})`, transformOrigin: '0% 50%', boxShadow: `0 0 0 ${Math.max(2, sw * 0.3)}px ${INK}`}} />;
			}
			return (
				<span key={k} style={{position: 'relative', display: 'inline-block'}}>
					{bar}
					<span style={{display: 'inline-block', overflow: 'hidden', padding: `${pad}px ${pad}px ${padB}px`, margin: `${-pad}px ${-pad}px ${-padB}px`, verticalAlign: 'top'}}>
						<span style={{display: 'inline-block', transform: `translateY(${dy.toFixed(2)}px)`}}>
							<Glyph {...glyph} />
						</span>
					</span>
				</span>
			);
		} else if (preset === 'typewriter') {
			const len = Array.from(it.text).length;
			const dur = Math.max(0.035 * len, Math.min(te(k) - ts(k), 0.07 * len));
			glyph.shown = visible ? Math.min(len, Math.floor((a / dur) * len + 1e-6) + 1) : 0;
			glyph.solidGold = true;
			if (k === cur && u < 0.5) {
				const typing = a < dur;
				glyph.caret = typing || Math.floor((t - ts(k) - dur) / 0.25) % 2 === 0;   // solid while typing, then blinks
			}
		} else if (preset === 'punchKey') {
			if (it.key) {
				const s = spr(a, 24, 0.38);
				tr = `scale(${lerp(1 / keyScale, 1, s).toFixed(4)})`;
				origin = '50% 70%';
				op = visible ? clamp01(a / 0.05) : 0;
				glyph.gold = clamp01((a - 0.03) / 0.12);
				glyph.glow = visible ? 1 - clamp01((a - 0.08) / 0.5) : 0;
			} else {
				const e = easeOut3(a / 0.22);
				tr = `translateY(${((1 - e) * size * 0.16).toFixed(2)}px) scale(${(1 - 0.06 * dim).toFixed(4)})`;
				op = visible ? e * (1 - 0.18 * dim) : 0;   // steps back, stays white (T5: no grey third colour)
			}
		}
		return (
			<span key={k} style={{position: 'relative', display: 'inline-block'}}>
				{burst}
				{/* zIndex 1 over every burst (zIndex 0): a word's impact never covers the words next to it */}
				<span style={{position: 'relative', zIndex: 1, display: 'inline-block', transform: tr || undefined, transformOrigin: origin, opacity: op}}>
					<Glyph {...glyph} />
				</span>
			</span>
		);
	};

	const sAlpha = scrim * appear * (1 - easeIn2(u));
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, pointerEvents: 'none'}}>
			{sAlpha > 0.01 ? (
				<div
					style={{
						position: 'absolute',
						left: cx,
						top: cy,
						width: bw + sizeMax * 1.3,
						height: shownH + sizeMax * 1.1,
						transform: 'translate(-50%, -50%)',
						background: `radial-gradient(closest-side, rgba(18,8,24,${Math.min(0.9, 0.62 * sAlpha).toFixed(3)}), rgba(18,8,24,${Math.min(0.6, 0.34 * sAlpha).toFixed(3)}) 62%, rgba(18,8,24,0) 100%)`,
						filter: 'blur(10px)',
					}}
				/>
			) : null}
			{p.debug ? (
				<>
					<div style={{position: 'absolute', left: S.x0, top: S.y0, width: S.x1 - S.x0, height: S.y1 - S.y0, border: '3px dashed #22E6D8'}} />
					<div style={{position: 'absolute', left: cx - bw / 2, top: cy - bh / 2, width: bw, height: bh, border: '2px solid #FF2E88'}} />
				</>
			) : null}
			<div style={blockStyle}>
				{lines.map((line, j) => (
					<div
						key={j}
						style={{
							display: 'flex',
							justifyContent: 'center',
							alignItems: preset === 'punchKey' ? 'baseline' : 'center',
							columnGap: GAP_EM * line.size,
							height: line.height * open[j],
							whiteSpace: 'nowrap',
							flexShrink: 0,
						}}
					>
						{line.items.map((k) => renderWord(k, line, j))}
					</div>
				))}
			</div>
		</div>
	);
};
