import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import project from '../../project.json';
import {ATLAS_FPS, DURATION, FPS, VO_END, W, We, WORDS} from '../lib/time';
import {clamp01, lerp} from './gfx';

// Atlas = ONLY the owner's art: the rig ~/shorts/orangutan (exported frames) or the owner's Gemini pose cards. This file only
// places what tools/atlas/*.py produced; nothing of Atlas is drawn here (a missing card in the Gallery is a labelled empty frame).

/* ------------------------------------------------------------------------------------------------------------------------
 * AtlasWindows — the template's Atlas layer, driven by project.json → "atlas" (README, «Atlas»):
 *   {"source": "cards" | "rig",
 *    "poses":   [{"id": "shock", "card": <owner image>, "talk": false}],                    cards → public/atlas/<id>.png
 *    "windows": [{"from_word": 23, "to_word": 25 | "end", "pose": "shock", "corner": "tl" | "tr" | "bl", "h": 460,
 *                 "style": "cutout" | "pip", "zoom": 1.45, "flip": false, "variant": "B", "lead": 0.1, "tail": 0.3, "at": [x, y],
 *                 "from_s": s, "until": s}],
 *    "rig":     {"scene": "atlas_<slug>", "dir": "atlas/rig", "lipsync": false}}           rig → public/atlas/rig/f_NNNNN.webp
 * Window time (same formula as tools/atlas/common.py): t0 = W(from_word) − lead, t1 = We(to_word) + tail, "end" → DURATION;
 * "from_s" / "until" (seconds) override t0 / t1.
 * Placement (standard 4.4 / R3): inside x 48–887, top ≥ 300, bottom ≤ 1140 (above the subtitle band); bottom right ("br") is
 * under the Shorts buttons — tools/atlas/atlas_check.py rejects it (here it is still kept inside the safe zone). "at" = bottom
 * centre of Atlas in frame px. "pip" = rounded window (box h × 0.8h) showing head and chest: the picture is zoom × h tall
 * (1.45 for a full-body card, ≈ 1.05 for a bust card from a sheet). A window with "variant" is shown only in that A/B version
 * (R2: prop variant, compositions Short-A / Short-B in Root.tsx).
 * A/B shorthand (R2): project.json → "ab": {"enabled": true, "variants": {"A": {"atlas_hook": false}, "B": {"atlas_hook": true,
 * "atlas_hook_pose": "shock", "atlas_hook_corner": "tr", "atlas_hook_h": 300, "atlas_hook_until": 1.0}}} adds, for every variant
 * with atlas_hook, one small window from frame 0 to atlas_hook_until shown only in that variant (hookWindows below — the same
 * expansion as tools/atlas/common.py, so atlas_check.py / atlas_scene.py / cutout_cards.py see it too).
 * The legacy single card {"card": <png under public/>, "in_word": i, "out": s | null, "x", "top", "h"} still works (one window).
 * ---------------------------------------------------------------------------------------------------------------------- */
type Corner = 'tl' | 'tr' | 'bl' | 'br';
export type AtlasWindowCfg = {
	from_word: number; to_word?: number | 'end'; pose: string; corner?: Corner; at?: [number, number]; h?: number;
	style?: 'cutout' | 'pip'; zoom?: number; flip?: boolean; variant?: string; lead?: number; tail?: number;
	from_s?: number | null; until?: number | null; source?: 'cards' | 'rig'; hook?: boolean;
};
type PoseCfg = {id: string; card?: string; png?: string; talk?: boolean};
type AtlasBlock = {source?: 'cards' | 'rig'; poses?: PoseCfg[]; windows?: AtlasWindowCfg[]; rig?: {dir?: string}};
type LegacyCard = {card: string; in_word: number; out?: number | null; x?: number; top?: number; h?: number; aspect?: number};
export type AbVariantCfg = {atlas_hook?: boolean; atlas_hook_pose?: string; atlas_hook_corner?: Corner; atlas_hook_h?: number; atlas_hook_until?: number};
type AbCfg = {enabled?: boolean; variants?: Record<string, AbVariantCfg>};

const RAW = (project as unknown as {atlas?: AtlasBlock | LegacyCard | null}).atlas ?? null;
const AB = (project as unknown as {ab?: AbCfg | null}).ab ?? null;
const CARD_DIR = 'atlas';
export const SAFE = {left: 48, right: 887, top: 300, bottom: 1140};
/** A/B hook defaults (R2: Atlas in 0–1 s, small, over empty space — not over the subject of frame 0) */
export const AB_HOOK = {h: 300, until: 1.0, corner: 'tr' as Corner};
const MARGIN = 10;
const SHADOW = 'drop-shadow(0 0 10px rgba(255,170,60,0.5)) drop-shadow(0 18px 30px rgba(10,0,30,0.6))';

/** the A/B variants (R2) Root.tsx registers as Short-<name>; [] unless project.ab.enabled */
export const abVariants = (): string[] => (AB?.enabled ? Object.keys(AB.variants ?? {}) : []);

/** one window per variant with atlas_hook: Atlas from frame 0 to atlas_hook_until, only in that variant */
export const hookWindows = (): AtlasWindowCfg[] =>
	abVariants()
		.filter((v) => AB?.variants?.[v]?.atlas_hook)
		.map((v) => {
			const c = AB!.variants![v];
			return {from_word: 0, to_word: 0, from_s: 0, until: c.atlas_hook_until ?? AB_HOOK.until, pose: c.atlas_hook_pose ?? '',
				corner: c.atlas_hook_corner ?? AB_HOOK.corner, h: c.atlas_hook_h ?? AB_HOOK.h, variant: v, hook: true};
		});

/** the "atlas" block in canonical form (legacy single card → one window) + the A/B hook windows */
export const atlasBlock = (): Required<Omit<AtlasBlock, 'rig'>> & {rig: {dir?: string}} | null => {
	const hooks = hookWindows();
	if (!RAW) return hooks.length ? {source: 'cards', poses: [], windows: hooks, rig: {}} : null;
	if ('card' in RAW && !('windows' in RAW)) {
		const id = RAW.card.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/i, '');
		return {source: 'cards', poses: [{id, png: RAW.card}], rig: {},
			windows: [{from_word: RAW.in_word, to_word: 'end', pose: id, at: [RAW.x ?? 175, RAW.top ?? 720], h: RAW.h ?? 470, lead: 0.1, until: RAW.out ?? VO_END}, ...hooks]};
	}
	const b = RAW as AtlasBlock;
	return {source: b.source ?? 'cards', poses: b.poses ?? [], windows: [...(b.windows ?? []), ...hooks], rig: b.rig ?? {}};
};

/** [t0, t1) of one window in seconds */
export const windowTimes = (w: AtlasWindowCfg): [number, number] => {
	const t0 = w.from_s != null ? Math.max(0, w.from_s) : Math.max(0, W(w.from_word) - (w.lead ?? 0.1));
	const to = w.to_word ?? 'end';
	const t1 = w.until != null ? Math.min(DURATION, w.until) : to === 'end' ? DURATION : Math.min(DURATION, We(Math.min(to, WORDS.length - 1)) + (w.tail ?? 0.3));
	return [t0, t1];
};

const pad5 = (i: number) => String(i).padStart(5, '0');

/** variant: the A/B version being rendered (R2); at: render this time instead of the current frame — Short.tsx passes at={0}
 *  inside the loop overlay so the last frames dissolve into the same frame 0 (an Atlas window from t = 0 has no entrance). */
export const AtlasWindows: React.FC<{variant?: string; at?: number}> = ({variant, at}) => {
	const f = useCurrentFrame();
	const t = at ?? f / FPS;
	const block = atlasBlock();
	if (!block) return null;
	const w = block.windows.find((x) => (!x.variant || x.variant === variant) && t >= windowTimes(x)[0] && t < windowTimes(x)[1]);
	if (!w) return null;
	const [t0, t1] = windowTimes(w);
	const source = w.source ?? block.source;
	const pose = block.poses.find((p) => p.id === w.pose);
	// frame index on the 30 fps grid of the rig export / talking card (files are named by global time); the rig exports
	// round(duration · 30) frames, so the last one is round(DURATION · 30) − 1
	const last = Math.min(Math.floor(t1 * ATLAS_FPS), Math.round(DURATION * ATLAS_FPS) - 1);
	const idx = Math.max(Math.floor(t0 * ATLAS_FPS), Math.min(last, Math.floor(t * ATLAS_FPS + 1e-6)));
	const src =
		source === 'rig'
			? staticFile(`${block.rig.dir ?? 'atlas/rig'}/f_${pad5(idx)}.webp`)
			: pose?.talk
				? staticFile(`${CARD_DIR}/${w.pose}_talk/f_${pad5(idx)}.webp`)
				: staticFile(pose?.png ?? `${CARD_DIR}/${w.pose}.png`);
	return <AtlasWindowView t={t} t0={t0} t1={t1} w={w} src={src} rig={source === 'rig'} />;
};

/** one Atlas window at time t (entrance, exit, corner placement, pip frame). src = the frame / card to show; null = a labelled
 *  empty frame of the same size (Gallery without the project's cards — never a drawing of Atlas). */
export const AtlasWindowView: React.FC<{t: number; t0: number; t1: number; w: AtlasWindowCfg; src: string | null; rig?: boolean; label?: string}> = ({t, t0, t1, w, src, rig, label}) => {
	const h = w.h ?? 460;
	const corner: Corner = w.corner ?? 'tl';
	const fromRight = !w.at && (corner === 'tr' || corner === 'br');
	// entrance: pop with a small overshoot from the bottom edge of the window + slide in from its screen side (≈ 0.3 s; the
	// rig's own reaction peaks ≤ 0.6 s); exit: quick fade with a slight sink (0.18 s)
	const fromStart = t0 <= 1e-3;          // a window from frame 0 (A/B version B) is already there: frame 0 = thumbnail + loop seam
	const ki = fromStart ? 1 : clamp01((t - t0) / 0.3);
	const eIn = ki >= 1 ? 1 : 1 + 2.70158 * Math.pow(ki - 1, 3) + 1.70158 * Math.pow(ki - 1, 2);
	const ko = clamp01((t1 - t) / 0.18);
	const fade = Math.min(fromStart ? 1 : clamp01((t - t0) / 0.08), ko);
	const slide = (1 - Math.min(1, eIn)) * 38 * (fromRight ? 1 : -1);
	const scale = lerp(0.62, 1, eIn) * lerp(0.94, 1, ko);
	// cards are still drawings: breathing from the feet + a slow bob (the rig breathes by itself)
	const live = rig ? 0 : 1;
	const br = 1 + live * 0.006 * Math.sin((t - t0) * 2.1);
	const bob = live * Math.sin((t - t0) * 4.2) * 4;
	const pip = w.style === 'pip';
	const boxH = h;
	const boxW = pip ? Math.round(h * 0.8) : src === null ? Math.round(h * 0.7) : undefined;
	const pos: React.CSSProperties = w.at
		? {left: w.at[0], top: w.at[1] - boxH}
		: {
				...(fromRight ? {right: 1080 - SAFE.right + MARGIN} : {left: SAFE.left + MARGIN}),
				top: corner === 'tl' || corner === 'tr' ? SAFE.top : SAFE.bottom - boxH,
			};
	const img =
		src === null ? (
			<div style={{position: 'absolute', inset: 0, border: '6px dashed rgba(255,255,255,0.85)', borderRadius: 28, background: 'rgba(18,8,24,0.35)',
				display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 18, color: '#fff',
				fontFamily: 'Montserrat', fontWeight: 800, fontSize: Math.max(22, h * 0.065), lineHeight: 1.2, whiteSpace: 'pre-line'}}>
				{label ?? 'Atlas'}
			</div>
		) : (
			<Img
				src={src}
				style={
					pip
						? {position: 'absolute', height: h * (w.zoom ?? 1.45), left: '50%', top: h * 0.05, transform: `translateX(-50%)${w.flip ? ' scaleX(-1)' : ''}`}
						: {height: '100%', display: 'block', transform: w.flip ? 'scaleX(-1)' : undefined}
				}
			/>
		);
	return (
		<div
			style={{
				position: 'absolute',
				...pos,
				height: boxH,
				width: boxW,
				opacity: fade,
				transform: `${w.at ? 'translateX(-50%) ' : ''}translate(${slide}%, ${bob}px) scale(${scale}) scaleY(${br})`,
				transformOrigin: '50% 100%',
				filter: pip ? 'drop-shadow(0 16px 26px rgba(10,0,30,0.6))' : src === null ? undefined : SHADOW,
			}}
		>
			{pip ? (
				<div
					style={{
						position: 'absolute',
						inset: 0,
						overflow: 'hidden',
						borderRadius: 28,
						border: '5px solid #fff',
						background: 'radial-gradient(circle at 50% 38%, #f2b56b 0%, #c4567a 55%, #4a2a78 100%)',
					}}
				>
					{img}
				</div>
			) : (
				img
			)}
		</div>
	);
};

/* ------------------------------------------------------------------------------------------------------------------------
 * Lower-level layers kept from the kits (pig-war/short3, rabbits, yellow-fleet) for hand-placed Atlas shots.
 * ---------------------------------------------------------------------------------------------------------------------- */

// Atlas = one rig scene for the whole VO, exported as RGBA frames 1800×1400 with the rig root at (820, 1350), scale 1.5
// (tools/atlas/atlas_scene.py stage) → tools/atlas/atlas_webp.py --all --no-crop → public/<dir>/f_NNNNN.webp. Here we only place it.
const ROOT_X = 820;
const ROOT_Y = 1350;
const IMG_W = 1800;
const IMG_H = 1400;

/** an appearance: root screen position (x, y) and scale s (1 = export scale); enters/leaves by sliding from `from` */
export type AtlasWin = {t0: number; t1: number; x: number; y: number; s: number; from?: 'bottom' | 'left'; tin?: number; tout?: number; to?: {x: number; y: number; s: number; at: number; dur: number}};

export const AtlasLayer: React.FC<{wins: AtlasWin[]; dir?: string}> = ({wins, dir = 'atlas/rig'}) => {
	const f = useCurrentFrame();
	const t = f / FPS;
	const w = wins.find((x) => t >= x.t0 && t < x.t1);
	if (!w) return null;
	const tin = w.tin ?? 0.28;
	const tout = w.tout ?? 0.22;
	const ki = tin <= 0 ? 1 : clamp01((t - w.t0) / tin);
	const ko = tout <= 0 ? 1 : clamp01((w.t1 - t) / tout);
	// overshoot on entry, ease-in on exit
	const eIn = ki >= 1 ? 1 : 1 + 2.4 * Math.pow(ki - 1, 3) + 1.4 * Math.pow(ki - 1, 2);
	const eOut = ko * ko;
	const k = Math.min(eIn, eOut);
	let x = w.x;
	let y = w.y;
	let s = w.s;
	if (w.to) {
		const m = clamp01((t - w.to.at) / w.to.dur);
		const e = m < 0.5 ? 4 * m * m * m : 1 - Math.pow(-2 * m + 2, 3) / 2;
		x = lerp(x, w.to.x, e);
		y = lerp(y, w.to.y, e);
		s = lerp(s, w.to.s, e);
	}
	const hide = 1 - k;
	if (w.from === 'left') x -= hide * 700 * s;
	else y += hide * 1250 * s;
	// the rig export is a 30 fps sequence: at 60 fps each Atlas frame is held for two video frames
	const idx = Math.max(0, Math.min(Math.round(DURATION * ATLAS_FPS) - 1, Math.floor(t * ATLAS_FPS + 1e-6)));
	const src = staticFile(`${dir}/f_${pad5(idx)}.webp`);
	return (
		<div
			style={{
				position: 'absolute',
				left: x - ROOT_X * s,
				top: y - ROOT_Y * s,
				width: IMG_W * s,
				height: IMG_H * s,
				filter: 'drop-shadow(0 0 10px rgba(255,130,50,0.45)) drop-shadow(0 18px 30px rgba(10,0,30,0.55))',
			}}
		>
			<Img src={src} style={{width: '100%', height: '100%'}} />
		</div>
	);
};

/** a drawn pose card of Atlas (owner-made full-body drawing + the rig's own eyes/mouths, lip-synced by
 * tools/atlas/cutout_cards.py with "talk": true → public/atlas/<pose>_talk/) shown in [t0, t1); feet below the frame */
export const CardLayer: React.FC<{dir: string; t0: number; t1: number; x: number; top: number; h: number; n: number; tout?: number; tin?: number; flip?: boolean}> = ({dir, t0, t1, x, top, h, n, tout = 0.18, tin = 0, flip = false}) => {
	const f = useCurrentFrame();
	const t = f / FPS;
	if (t < t0 || t >= t1) return null;
	const idx = Math.max(0, Math.min(n - 1, Math.floor(t * ATLAS_FPS + 1e-6)));
	const o = clamp01((t1 - t) / tout) * (tin > 0 ? clamp01((t - t0) / tin) : 1);
	const rise = tin > 0 ? (1 - clamp01((t - t0) / tin)) ** 2 * 260 : 0;
	const br = 1 + 0.006 * Math.sin(t * 2.1);
	return (
		<div style={{position: 'absolute', left: x, top: top + rise, height: h, transform: `translateX(-50%) scaleY(${br})${flip ? ' scaleX(-1)' : ''}`, transformOrigin: '50% 100%', opacity: o,
			filter: 'drop-shadow(0 0 10px rgba(255,130,50,0.45)) drop-shadow(0 18px 30px rgba(10,0,30,0.55))'}}>
			<Img src={staticFile(`${dir}/f_${pad5(idx)}.webp`)} style={{height: '100%'}} />
		</div>
	);
};
