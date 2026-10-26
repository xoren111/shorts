import React, {createContext, useContext, useMemo} from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, getStaticFiles, staticFile} from 'remotion';
import {MONT} from '../fonts';
import {FPS} from '../lib/time';
import {PAL} from '../theme';
import {GOLD, INK, clamp01, easeInOut, easeOut, lerp, stroke, useT} from './gfx';

/**
 * Text / markers on a moving object: a clip plus a track from tools/track.py (data/tracks/<name>.json, SAM 2 masks + CSRT).
 *
 *   import keaton from '../../data/tracks/keaton_wind.json';
 *   <TrackedVideo src="video/keaton_wind.mp4" track={keaton} t0={W(3)} t1={W(9)} box={{x: 0, y: 230, w: 1080, h: 1100}} follow>
 *     <TrackedSpotlight t0={W(3)} t1={W(9)} />
 *     <TrackedRing t0={W(4)} t1={W(5)} kind="brackets" />
 *     <TrackedLabel text="Buster Keaton" t0={W(5)} t1={W(9)} />
 *   </TrackedVideo>
 *
 * TrackedVideo plays the clip inside `box` (scene px; default the whole 1080×1920 frame) with fit cover / contain, a zoom
 * and an optional follow-camera (reframing 16:9 → 9:16 that keeps the subject at x ≈ 468, the middle of the safe zone; the
 * pan never shows an edge of the clip). Its children are overlays in scene px; they read the clip → scene mapping from context:
 *   TrackedLabel      name tag with a dark scrim + ink outline (T3/T9), white + gold (T5), straight (T4). Placed next to the
 *                     subject on one of `sides` — never on it — and kept inside the safe zone (x 48–887, y 300–1140: above the
 *                     subtitle band, R3). The side is planned once for the whole window (Viterbi over 60 Hz samples: overlap
 *                     with the subject, distance from the ideal spot, side preference, a switch penalty), so it never flickers;
 *                     a side change crossfades in 0.25 s instead of sliding across the subject. Optional pointer line.
 *   TrackedRing       hand-drawn ring (draws on in 0.45 s) or «brackets» (target lock) around the body or the head (top anchor).
 *   TrackedArrow      curved arrow from free space to the subject's edge (same planner, crossfades on a side change).
 *   TrackedSpotlight  dims the frame outside a soft ellipse around the subject.
 *   TrackedOutline    the SAM 2 silhouette (tools/track.py --poly N), source-frame exact, draws on.
 *   TrackedDebug      raw (grey) / smoothed (gold) box, confidence, safe zone — QA stills only.
 * Lead / lag (seconds): `lead` samples the track earlier (+) or later (−) than the picture; `lag` adds inertia (two cascaded
 * exponential filters, total delay ≈ lag, no velocity jump) — labels trail a little (0.12), rings stick (0.05), the follow camera
 * floats (0.35, with an 80 px dead zone). Every filter is precomputed for the whole window on a 60 Hz grid, so any frame renders the same in any order.
 * Confidence below `minConf` fades an overlay out instead of letting it jump (frames tools/track.py marked unsure).
 *
 * Rules (standard 4.6 «Трекинг»): track archive footage only where the label MUST stick and that changes the understanding — not
 * as decoration; one annotation at a time (ring OR arrow, then the label); a label never repeats the voice / subtitle (T6:
 * names, places, dates the VO does not say — or hide the subtitle via project.json hide_subs); numbers in labels must be in
 * FACTS.md (check.mjs scans `text=`). Clips: upscale ≤ 2× (a 960×720 film in a 1100 px tall box = 1.53×).
 */

// ---------------------------------------------------------------- data

export type TrackFrame = {f: number; t: number; cx: number; cy: number; x0: number; y0: number; x1: number; y1: number; tx: number; ty: number; a?: number; c: number; src?: string; r?: number[]; poly?: number[][]};
export type TrackData = {version: number; name: string; clip?: string; w: number; h: number; fps: number; step?: number; range?: number[]; method?: string; frames: TrackFrame[]};
/** one sample of the subject in normalised clip coords (0–1 of the clip width / height) + confidence */
export type TrackSample = {cx: number; cy: number; x0: number; y0: number; x1: number; y1: number; tx: number; ty: number; c: number};
export type Pt = {x: number; y: number};
export type Rect = {x0: number; y0: number; x1: number; y1: number};
/** the subject in scene px: box, mask centroid, top anchor (head of a standing person), confidence */
export type Subject = {box: Rect; c: Pt; top: Pt; conf: number};
export type Box = {x: number; y: number; w: number; h: number};
export type Sync = 'smooth' | 'frame';
export type Side = 'above' | 'below' | 'left' | 'right' | 'aboveLeft' | 'aboveRight';

/** overlays stay here: Google safe zone x 48–887, top 300 (Atlas windows use the same), bottom 1140 = above the subtitle band */
export const TRACK_SAFE: Rect = {x0: 48, y0: 300, x1: 887, y1: 1140};
const FULL: Box = {x: 0, y: 0, w: 1080, h: 1920};
const HZ = 60;
const KEYS = ['cx', 'cy', 'x0', 'y0', 'x1', 'y1', 'tx', 'ty', 'c'] as const;

const toArr = (s: TrackSample) => KEYS.map((k) => s[k]);
const fromArr = (a: ArrayLike<number>): TrackSample => ({cx: a[0], cy: a[1], x0: a[2], y0: a[3], x1: a[4], y1: a[5], tx: a[6], ty: a[7], c: a[8]});

/**
 * The subject at clip time tc (s in the clip file). 'smooth' interpolates between tracked frames (overlays glide at 60 fps);
 * 'frame' holds the source frame on screen (exact for 24 fps film, use with --step 1). Outside the tracked range the edge frame
 * is held and its confidence fades to 0 within 0.25 s.
 */
export const sampleTrack = (tr: TrackData, tc: number, sync: Sync = 'smooth'): TrackSample => {
	const fr = tr.frames;
	const n = fr.length;
	const dtF = (tr.step ?? 1) / tr.fps;
	const hold = (f: TrackFrame, dist: number): TrackSample => ({cx: f.cx, cy: f.cy, x0: f.x0, y0: f.y0, x1: f.x1, y1: f.y1, tx: f.tx, ty: f.ty, c: f.c * clamp01(1 - dist / 0.25)});
	if (tc <= fr[0].t) return hold(fr[0], fr[0].t - tc);
	if (tc >= fr[n - 1].t) return hold(fr[n - 1], Math.max(0, tc - fr[n - 1].t - dtF));
	let lo = 0;
	let hi = n - 1;
	while (hi - lo > 1) {
		const m = (lo + hi) >> 1;
		if (fr[m].t <= tc) lo = m;
		else hi = m;
	}
	const a = fr[lo];
	const b = fr[hi];
	if (sync === 'frame') return hold(a, 0);
	const u = (tc - a.t) / Math.max(1e-6, b.t - a.t);
	return {cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), x0: lerp(a.x0, b.x0, u), y0: lerp(a.y0, b.y0, u), x1: lerp(a.x1, b.x1, u), y1: lerp(a.y1, b.y1, u), tx: lerp(a.tx, b.tx, u), ty: lerp(a.ty, b.ty, u), c: lerp(a.c, b.c, u)};
};

/** index of the tracked frame on screen at clip time tc (for per-frame data such as poly) */
export const frameIndexAt = (tr: TrackData, tc: number) => {
	const fr = tr.frames;
	let lo = 0;
	let hi = fr.length - 1;
	if (tc <= fr[0].t) return 0;
	if (tc >= fr[hi].t) return hi;
	while (hi - lo > 1) {
		const m = (lo + hi) >> 1;
		if (fr[m].t <= tc + 1e-4) lo = m;
		else hi = m;
	}
	return lo;
};

/**
 * Inertia for any vector signal fn(t): two cascaded exponential filters (τ = lag / 2 each → total delay ≈ lag, smooth start),
 * precomputed on a 60 Hz grid over [ta, tb] and interpolated; before ta = fn(ta) (no swoop-in), after tb = the last value.
 */
export const makeLagged = (fn: (t: number) => number[], ta: number, tb: number, lag: number): ((t: number) => number[]) => {
	const n = Math.max(2, Math.ceil((tb - ta) * HZ) + 1);
	const first = fn(ta);
	const m = first.length;
	const out = new Float64Array(n * m);
	const s1 = first.slice();
	const s2 = first.slice();
	const k = lag > 1e-4 ? 1 - Math.exp(-1 / HZ / (lag / 2)) : 1;
	for (let i = 0; i < n; i++) {
		const v = fn(ta + i / HZ);
		for (let j = 0; j < m; j++) {
			s1[j] += k * (v[j] - s1[j]);
			s2[j] += k * (s1[j] - s2[j]);
			out[i * m + j] = s2[j];
		}
	}
	return (t: number) => {
		const x = Math.max(0, Math.min(n - 1, (t - ta) * HZ));
		const i = Math.min(n - 2, Math.floor(x));
		const u = x - i;
		const r = new Array<number>(m);
		for (let j = 0; j < m; j++) r[j] = lerp(out[i * m + j], out[(i + 1) * m + j], u);
		return r;
	};
};

// ---------------------------------------------------------------- camera + context

export type FollowCfg = {
	/** scene x where the subject's box centre should sit (default: middle of the safe zone, 468) */
	x?: number;
	/** scene y (only with axis 'y' / 'xy'; default the box centre) */
	y?: number;
	/** camera inertia in s (default 0.35) */
	lag?: number;
	/** dead zone in scene px (default 80): the camera holds while the subject moves less than this from its aim — no micro-pans */
	dead?: number;
	axis?: 'x' | 'y' | 'xy';
};
type Cam = {s: number; cu: number; cv: number; dw: number; dh: number};
type SampleOpts = {lead?: number; lag?: number; sync?: Sync};

export type TrackedCtx = {
	track: TrackData;
	t0: number;
	t1: number;
	box: Box;
	/** clip time (s in the file) shown at scene time t */
	clipT: (t: number) => number;
	cam: (t: number) => Cam;
	/** normalised clip coords → scene px at scene time t (current camera) */
	toScene: (u: number, v: number, t: number) => Pt;
	/** the subject in normalised clip coords, with lead / lag */
	sample: (t: number, o?: SampleOpts) => TrackSample;
	/** the subject in scene px, with lead / lag (lag acts on the subject's motion, the mapping uses the current camera) */
	subject: (t: number, o?: SampleOpts) => Subject;
};

const Ctx = createContext<TrackedCtx | null>(null);

/** the TrackedVideo around this overlay (throws outside one) */
export const useTracked = (): TrackedCtx => {
	const c = useContext(Ctx);
	if (!c) throw new Error('Tracked overlays must be children of <TrackedVideo>');
	return c;
};

/**
 * public/ path of the clip a track was made from (track.clip = the file name tools/track.py saw), or null when the project does
 * not have it — test compositions (Gallery, MotionDemo) draw a labelled empty frame then. fetch_asset.py keeps the library
 * name, so a fetched clip is found under any public/ folder. In a Short write the clip path as a literal (check.mjs item 5)
 * or use this; check.mjs item 14 requires the clip of every track the Short imports in public/ with a CREDITS.md line.
 */
export const trackClip = (track: TrackData): string | null => {
	const want = (track.clip ?? '').split('/').pop()?.toLowerCase();
	if (!want) return null;
	const f = getStaticFiles().find((x) => x.name.split('/').pop()?.toLowerCase() === want);
	return f ? f.name : null;
};

/** the subject now, in scene px — for custom overlays */
export const useSubject = (o?: SampleOpts): Subject => {
	const c = useTracked();
	return c.subject(useT(), o);
};

const camAt = (track: TrackData, box: Box, fit: 'cover' | 'contain', z: number, cu0: number, cv0: number): Cam => {
	const sb = fit === 'cover' ? Math.max(box.w / track.w, box.h / track.h) : Math.min(box.w / track.w, box.h / track.h);
	const s = sb * z;
	const dw = track.w * s;
	const dh = track.h * s;
	const hu = box.w / (2 * dw);
	const hv = box.h / (2 * dh);
	const cu = hu >= 0.5 ? 0.5 : Math.max(hu, Math.min(1 - hu, cu0));
	const cv = hv >= 0.5 ? 0.5 : Math.max(hv, Math.min(1 - hv, cv0));
	return {s, cu, cv, dw, dh};
};

/** the context TrackedVideo provides, built outside React (tests, custom compositions) — same arguments as TrackedVideo */
export const buildTrackedCtx = (p: {track: TrackData; t0: number; t1: number; from: number; rate: number; box: Box; fit: 'cover' | 'contain'; zoom: [number, number]; focus: [number, number]; follow?: FollowCfg; hold: number}): TrackedCtx => {
	const {track, t0, t1, from, rate, box, fit, zoom, focus, follow} = p;
	const fromQ = Math.round(from * FPS) / FPS; // what OffthreadVideo's trimBefore (frames) really starts at
	const clipT = (t: number) => fromQ + (t - t0) * rate;
	const ta = t0 - 0.05;
	const tb = t1 + p.hold + 1;
	const cache = new Map<string, (t: number) => number[]>();
	const sampleN = (t: number, o?: SampleOpts): TrackSample => {
		const lead = o?.lead ?? 0;
		const lag = o?.lag ?? 0;
		const sync = o?.sync ?? 'smooth';
		if (lag <= 1e-4) return sampleTrack(track, clipT(t + lead), sync);
		const key = `${lead}|${lag}|${sync}`;
		let f = cache.get(key);
		if (!f) {
			f = makeLagged((x) => toArr(sampleTrack(track, clipT(x + lead), sync)), ta, tb, lag);
			cache.set(key, f);
		}
		return fromArr(f(t));
	};
	const zoomAt = (t: number) => lerp(zoom[0], zoom[1], easeInOut((t - t0) / Math.max(0.1, t1 + p.hold - t0)));
	const axis = follow?.axis ?? 'x';
	const fx = (follow?.x ?? (TRACK_SAFE.x0 + TRACK_SAFE.x1) / 2) - box.x;
	const fy = (follow?.y ?? box.y + box.h / 2) - box.y;
	// follow: dead-zone target (stateful, so precomputed in order on the 60 Hz grid), then the lag filter
	let followF: ((t: number) => number[]) | null = null;
	if (follow) {
		const dead = follow.dead ?? 80;
		const n = Math.max(2, Math.ceil((tb - ta) * HZ) + 1);
		const tgt = new Float64Array(n * 2);
		let au = NaN;
		let av = NaN;
		for (let i = 0; i < n; i++) {
			const x = ta + i / HZ;
			const sm = sampleTrack(track, clipT(x));
			const u = (sm.x0 + sm.x1) / 2;
			const v = (sm.y0 + sm.y1) / 2;
			const b = camAt(track, box, fit, zoomAt(x), 0.5, 0.5);
			const du = dead / b.dw;
			const dv = dead / b.dh;
			if (Number.isNaN(au)) {
				au = u;
				av = v;
			}
			if (u > au + du) au = u - du;
			else if (u < au - du) au = u + du;
			if (v > av + dv) av = v - dv;
			else if (v < av - dv) av = v + dv;
			tgt[i * 2] = au;
			tgt[i * 2 + 1] = av;
		}
		const at = (x: number) => {
			const i = Math.max(0, Math.min(n - 1, Math.round((x - ta) * HZ)));
			return [tgt[i * 2], tgt[i * 2 + 1]];
		};
		followF = makeLagged(at, ta, tb, follow.lag ?? 0.35);
	}
	const cam = (t: number): Cam => {
		const z = zoomAt(t);
		if (!followF) return camAt(track, box, fit, z, focus[0], focus[1]);
		const base = camAt(track, box, fit, z, 0.5, 0.5);
		const [su, sv] = followF(t);
		const cu = axis === 'y' ? focus[0] : su - (fx - box.w / 2) / base.dw;
		const cv = axis === 'x' ? focus[1] : sv - (fy - box.h / 2) / base.dh;
		return camAt(track, box, fit, z, cu, cv);
	};
	const toScene = (u: number, v: number, t: number): Pt => {
		const c = cam(t);
		return {x: box.x + box.w / 2 + (u - c.cu) * c.dw, y: box.y + box.h / 2 + (v - c.cv) * c.dh};
	};
	const subject = (t: number, o?: SampleOpts): Subject => {
		const s = sampleN(t, o);
		const a = toScene(s.x0, s.y0, t);
		const b = toScene(s.x1, s.y1, t);
		return {box: {x0: a.x, y0: a.y, x1: b.x, y1: b.y}, c: toScene(s.cx, s.cy, t), top: toScene(s.tx, s.ty, t), conf: s.c};
	};
	return {track, t0, t1, box, clipT, cam, toScene, sample: sampleN, subject};
};

/**
 * How long the subject's box sticks out of the safe zone horizontally (more than 15 % of its width) over [t0, t1], sampled at
 * 30 Hz — TrackedVideo warns above 0.3 s (the follow camera cannot centre a subject at the very edge of the source).
 */
export const subjectSafeReport = (c: TrackedCtx, safe: Rect = TRACK_SAFE): {outS: number; worstPx: number} => {
	let out = 0;
	let worst = 0;
	for (let t = c.t0; t <= c.t1; t += 1 / 30) {
		const s = c.subject(t);
		if (s.conf < 0.3) continue;
		const bw = s.box.x1 - s.box.x0;
		const px = Math.max(0, safe.x0 - s.box.x0, s.box.x1 - safe.x1);
		worst = Math.max(worst, px);
		if (px > 0.15 * bw) out += 1 / 30;
	}
	return {outS: out, worstPx: worst};
};

/**
 * The clip in a box of the scene + the context for Tracked overlays (children). `from` = second in the clip file shown at t0
 * (default: the start of the track); `rate` playback speed; `fit` cover (crop) / contain; `zoom` [start, end] eased over the
 * shot; `focus` [u, v] = clip point kept at the box centre without follow; `follow` = camera keeps the subject at follow.x
 * (lag 0.35 s, 80 px dead zone, never past the clip edge). `backdrop` behind a box smaller than the frame: 'blur' (default, the same clip blurred
 * and darkened), 'none', or a CSS colour. `frame` = parchment border + shadow around a box smaller than the frame.
 */
export const TrackedVideo: React.FC<{
	src: string;
	track: TrackData;
	t0: number;
	t1: number;
	from?: number;
	rate?: number;
	box?: Box;
	fit?: 'cover' | 'contain';
	zoom?: [number, number];
	focus?: [number, number];
	follow?: boolean | FollowCfg;
	backdrop?: 'blur' | 'none' | string;
	frame?: boolean;
	radius?: number;
	filter?: string;
	/** seconds the shot stays mounted after t1 (outgoing transition) */
	hold?: number;
	children?: React.ReactNode;
}> = ({src, track, t0, t1, from, rate = 1, box = FULL, fit = 'cover', zoom = [1, 1.06], focus = [0.5, 0.5], follow, backdrop, frame, radius, filter = 'contrast(1.06) brightness(1.03)', hold = 0.5, children}) => {
	const t = useT();
	const fromS = from ?? track.frames[0].t;
	const fcfg: FollowCfg | undefined = follow === true ? {} : follow || undefined;
	const key = JSON.stringify([t0, t1, fromS, rate, box, fit, zoom, focus, fcfg ?? null, hold]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const ctx = useMemo(() => {
		const c = buildTrackedCtx({track, t0, t1, from: fromS, rate, box, fit, zoom, focus, follow: fcfg, hold});
		const r = subjectSafeReport(c);
		if (r.outS > 0.3) warnOnce(`video|${track.name}|${key}`, `TrackedVideo «${track.name}»: the subject is outside the safe zone x ${TRACK_SAFE.x0}–${TRACK_SAFE.x1} for ${r.outS.toFixed(2)} s of ${(t1 - t0).toFixed(2)} s (worst ${r.worstPx.toFixed(0)} px) — use follow, zoom or focus (standard 4.2 reframing)`);
		return c;
	}, [track, key]);
	if (t < t0 - 0.05 || t > t1 + hold) return null;
	const isFull = box.x <= 0 && box.y <= 0 && box.w >= 1080 && box.h >= 1920;
	const fullW = box.x <= 0 && box.w >= 1080;
	const bd = backdrop ?? (isFull ? 'none' : 'blur');
	const withFrame = frame ?? !fullW;
	const rad = radius ?? (fullW ? 0 : 26);
	const c = ctx.cam(t);
	const f0 = Math.round(t0 * FPS);
	const trim = Math.round(fromS * FPS);
	const vid = (style: React.CSSProperties) => (
		<Sequence from={f0} layout="none">
			<OffthreadVideo src={staticFile(src)} trimBefore={trim} playbackRate={rate} muted style={style} />
		</Sequence>
	);
	return (
		<AbsoluteFill>
			{bd === 'blur' ? (
				<AbsoluteFill style={{overflow: 'hidden', background: '#05040a'}}>
					{vid({position: 'absolute', left: -160, top: -160, width: 1400, height: 2240, objectFit: 'cover', filter: 'blur(36px) brightness(0.4) saturate(0.8)'})}
				</AbsoluteFill>
			) : bd !== 'none' ? (
				<AbsoluteFill style={{background: bd}} />
			) : null}
			<div
				style={{
					position: 'absolute',
					left: box.x,
					top: box.y,
					width: box.w,
					height: box.h,
					overflow: 'hidden',
					borderRadius: rad,
					background: '#000',
					boxShadow: withFrame ? `0 0 0 8px #F3EAD6, 0 0 0 12px ${INK}, 0 30px 60px rgba(0,0,0,0.6)` : undefined,
				}}
			>
				<div style={{position: 'absolute', left: box.w / 2 - c.cu * c.dw, top: box.h / 2 - c.cv * c.dh, width: c.dw, height: c.dh, filter}}>{vid({width: '100%', height: '100%'})}</div>
			</div>
			<Ctx.Provider value={ctx}>{children}</Ctx.Provider>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- placement planner

const SIDE_PREF: Record<Side, number> = {above: 0, aboveRight: 0.25, aboveLeft: 0.25, right: 0.45, left: 0.45, below: 0.8};

const inflate = (r: Rect, d: number): Rect => ({x0: r.x0 - d, y0: r.y0 - d, x1: r.x1 + d, y1: r.y1 + d});
const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const rectAt = (p: Pt, w: number, h: number): Rect => ({x0: p.x - w / 2, y0: p.y - h / 2, x1: p.x + w / 2, y1: p.y + h / 2});

/** centre of a w×h element on `side` of the subject, `gap` px away from its box */
export const sideCenter = (side: Side, s: Subject, w: number, h: number, gap: number): Pt => {
	const b = s.box;
	const bw = b.x1 - b.x0;
	const yMid = lerp(b.y0, b.y1, 0.3);
	switch (side) {
		case 'above':
			return {x: s.top.x, y: b.y0 - gap - h / 2};
		case 'below':
			return {x: s.c.x, y: b.y1 + gap + h / 2};
		case 'left':
			return {x: b.x0 - gap - w / 2, y: yMid};
		case 'right':
			return {x: b.x1 + gap + w / 2, y: yMid};
		case 'aboveLeft':
			return {x: b.x0 - w / 2 + Math.min(w, bw) * 0.3, y: b.y0 - gap - h / 2};
		case 'aboveRight':
			return {x: b.x1 + w / 2 - Math.min(w, bw) * 0.3, y: b.y0 - gap - h / 2};
	}
};

/** keep a w×h element (centre p) inside the safe zone */
export const clampSafe = (p: Pt, w: number, h: number, safe: Rect = TRACK_SAFE): Pt => ({
	x: safe.x1 - safe.x0 <= w ? (safe.x0 + safe.x1) / 2 : Math.max(safe.x0 + w / 2, Math.min(safe.x1 - w / 2, p.x)),
	y: safe.y1 - safe.y0 <= h ? (safe.y0 + safe.y1) / 2 : Math.max(safe.y0 + h / 2, Math.min(safe.y1 - h / 2, p.y)),
});

/** move a w×h element (centre q) out of the subject box b on its side, keeping ≥ minGap px — lagged followers never cut in */
export const pushOut = (side: Side, q: Pt, b: Rect, w: number, h: number, minGap: number): Pt => {
	switch (side) {
		case 'above':
		case 'aboveLeft':
		case 'aboveRight':
			return {x: q.x, y: Math.min(q.y, b.y0 - minGap - h / 2)};
		case 'below':
			return {x: q.x, y: Math.max(q.y, b.y1 + minGap + h / 2)};
		case 'left':
			return {x: Math.min(q.x, b.x0 - minGap - w / 2), y: q.y};
		case 'right':
			return {x: Math.max(q.x, b.x1 + minGap + w / 2), y: q.y};
	}
};

export type Plan = {ta: number; n: number; sides: Side[]; side: Uint8Array; pos: Float32Array; overlapMax: number; overlapS: number};

/**
 * Where a w×h element sits next to the subject over [ta, tb]: per 60 Hz sample one of `sides`, chosen by Viterbi over
 *   cost = 100 × (share of the element over the real subject box + minGap/2) + 2 × (px moved from the ideal spot) / 100 + 3 × side pref.
 * plus `switchCost` per side change (no flicker). The ideal spot follows the lagged `subject`; it is then pushed out of the
 * real, unlagged `hard` subject (≥ minGap px, so a trailing label never cuts into a fast subject) and clamped to `safe` (the
 * safe zone wins over the push). overlapMax / overlapS report what was left.
 */
export const planPlacement = (p: {subject: (t: number) => Subject; hard?: (t: number) => Subject; ta: number; tb: number; w: number; h: number; gap: number; sides: Side[]; safe?: Rect; switchCost?: number; minGap?: number}): Plan => {
	const {subject, ta, tb, w, h, gap, sides} = p;
	const safe = p.safe ?? TRACK_SAFE;
	const minGap = p.minGap ?? 10;
	const S = sides.length;
	const n = Math.max(2, Math.ceil((tb - ta) * HZ) + 1);
	const pos = new Float32Array(n * S * 2);
	const cost = new Float64Array(n * S);
	const ovl = new Float64Array(n * S);
	for (let i = 0; i < n; i++) {
		const s = subject(ta + i / HZ);
		const real = p.hard ? p.hard(ta + i / HZ) : s;
		const body = inflate(real.box, minGap * 0.5);
		for (let k = 0; k < S; k++) {
			const ideal = sideCenter(sides[k], s, w, h, gap);
			const q = clampSafe(pushOut(sides[k], ideal, real.box, w, h, minGap), w, h, safe);
			pos[(i * S + k) * 2] = q.x;
			pos[(i * S + k) * 2 + 1] = q.y;
			const o = overlap(rectAt(q, w, h), body) / (w * h);
			ovl[i * S + k] = o;
			cost[i * S + k] = 100 * o + (2 * Math.hypot(q.x - ideal.x, q.y - ideal.y)) / 100 + 3 * SIDE_PREF[sides[k]];
		}
	}
	const sw = p.switchCost ?? 150;
	const acc = new Float64Array(n * S);
	const back = new Uint8Array(n * S);
	for (let k = 0; k < S; k++) acc[k] = cost[k];
	for (let i = 1; i < n; i++) {
		for (let k = 0; k < S; k++) {
			let best = Infinity;
			let bj = 0;
			for (let j = 0; j < S; j++) {
				const v = acc[(i - 1) * S + j] + (j === k ? 0 : sw);
				if (v < best) {
					best = v;
					bj = j;
				}
			}
			acc[i * S + k] = best + cost[i * S + k];
			back[i * S + k] = bj;
		}
	}
	const side = new Uint8Array(n);
	let bk = 0;
	for (let k = 1; k < S; k++) if (acc[(n - 1) * S + k] < acc[(n - 1) * S + bk]) bk = k;
	side[n - 1] = bk;
	for (let i = n - 1; i > 0; i--) side[i - 1] = back[i * S + side[i]];
	let overlapMax = 0;
	let over = 0;
	for (let i = 0; i < n; i++) {
		const o = ovl[i * S + side[i]];
		overlapMax = Math.max(overlapMax, o);
		if (o > 0.15) over++;
	}
	return {ta, n, sides, side, pos, overlapMax, overlapS: over / HZ};
};

/** position of side k at time t (interpolated between samples) */
const posAt = (pl: Plan, k: number, t: number): Pt => {
	const x = Math.max(0, Math.min(pl.n - 1, (t - pl.ta) * HZ));
	const i = Math.min(pl.n - 2, Math.floor(x));
	const u = x - i;
	const S = pl.sides.length;
	return {x: lerp(pl.pos[(i * S + k) * 2], pl.pos[((i + 1) * S + k) * 2], u), y: lerp(pl.pos[(i * S + k) * 2 + 1], pl.pos[((i + 1) * S + k) * 2 + 1], u)};
};

const XFADE = 0.25;
/** what to draw at time t: the current side and, during XFADE (0.25 s) after a change, the previous one fading out (first half) */
export const planLayers = (pl: Plan, t: number): {side: Side; p: Pt; o: number}[] => {
	const i = Math.max(0, Math.min(pl.n - 1, Math.round((t - pl.ta) * HZ)));
	const cur = pl.side[i];
	const span = Math.round(XFADE * HZ);
	for (let j = i - 1; j >= Math.max(0, i - span); j--) {
		if (pl.side[j] !== cur) {
			// the old side was left because it became blocked: it fades out in the first half, the new one fades in over all of it
			const k = (i - j) / span;
			return [
				{side: pl.sides[pl.side[j]], p: posAt(pl, pl.side[j], t), o: 1 - easeOut(clamp01(k * 2))},
				{side: pl.sides[cur], p: posAt(pl, cur, t), o: easeInOut(k)},
			];
		}
	}
	return [{side: pl.sides[cur], p: posAt(pl, cur, t), o: 1}];
};

const warned = new Set<string>();
const warnOnce = (key: string, msg: string) => {
	if (warned.has(key)) return;
	warned.add(key);
	console.warn(msg);
};

/** fade in over d s from t0, out over d s before t1 + d */
const life = (t: number, t0: number, t1: number, din = 0.22, dout = 0.2) => clamp01((t - t0) / din) * clamp01((t1 + dout - t) / dout);
const confK = (c: number, minConf: number) => clamp01((c - minConf) / 0.2);

// ---------------------------------------------------------------- overlays

/** planning size of a TrackedLabel tag (Montserrat 900 uppercase ≈ 0.72 em per character + padding, border, 8 px ink shadow) */
export const labelSize = (text: string, size = 54, accent?: string, sub?: string) => {
	const chars = text.length + (accent ? accent.length + 1 : 0);
	return {w: Math.max(chars * size * 0.72, sub ? sub.length * size * 0.36 : 0) + 56, h: size * 1.08 + 34 + (sub ? size * 0.55 : 0)}; // + 8 px drop shadow
};

/**
 * Name tag that follows the subject without covering it. Montserrat 900 uppercase, white (+ gold `accent`), ink outline on a
 * dark scrim pill, pop-in 0.22 s (T3), straight. `sides` in order of preference is only a hint — the planner weighs them;
 * `pointer` draws a thin leader line to the head (above) or the body (other sides).
 */
export const TrackedLabel: React.FC<{
	text: string;
	t0: number;
	t1: number;
	accent?: string;
	sub?: string;
	size?: number;
	sides?: Side[];
	gap?: number;
	lead?: number;
	lag?: number;
	safe?: Rect;
	pointer?: boolean;
	minConf?: number;
}> = ({text, t0, t1, accent, sub, size = 54, sides = ['above', 'aboveRight', 'aboveLeft', 'right', 'left', 'below'], gap = 30, lead = 0, lag = 0.12, safe = TRACK_SAFE, pointer = true, minConf = 0.3}) => {
	const ctx = useTracked();
	const t = useT();
	const {w, h} = labelSize(text, size, accent, sub);
	const key = JSON.stringify([t0, t1, w, h, sides, gap, lead, lag, safe]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const plan = useMemo(() => {
		const pl = planPlacement({subject: (x) => ctx.subject(x, {lead, lag}), hard: (x) => ctx.subject(x), ta: t0 - 0.1, tb: t1 + 0.3, w, h, gap, sides, safe});
		if (pl.overlapS > 0.1) warnOnce(`label|${text}|${key}`, `TrackedLabel «${text}»: covers the subject for ${pl.overlapS.toFixed(2)} s (max ${(pl.overlapMax * 100).toFixed(0)} % of the tag) — the safe zone leaves no free side; shrink size / text or move the clip box`);
		return pl;
	}, [ctx, key]);
	if (t < t0 || t > t1 + 0.2) return null;
	const s = ctx.subject(t, {lead, lag});
	const life0 = life(t, t0, t1) * confK(s.conf, minConf);
	if (life0 <= 0.001) return null;
	const k = clamp01((t - t0) / 0.22);
	const popS = lerp(0.6, 1, 1 - Math.pow(1 - k, 3)) * (k < 1 ? 1 + 0.06 * Math.sin(k * Math.PI) : 1);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{planLayers(plan, t).map(({side, p, o}) => {
				const op = life0 * o;
				if (op <= 0.001) return null;
				const anchor = side.startsWith('above') ? {x: s.top.x, y: s.top.y - 14} : side === 'below' ? {x: s.c.x, y: s.box.y1 + 8} : {x: lerp(s.c.x, side === 'left' ? s.box.x0 : s.box.x1, 0.45), y: s.c.y};
				// leader line: from the tag edge nearest the anchor to the anchor
				const r = rectAt(p, w * popS, h * popS);
				const ex = Math.max(r.x0 + 18, Math.min(r.x1 - 18, anchor.x));
				const ey = Math.max(r.y0, Math.min(r.y1, anchor.y));
				const dl = clamp01((t - t0 - 0.1) / 0.25);
				const lx = lerp(ex, anchor.x, easeOut(dl));
				const ly = lerp(ey, anchor.y, easeOut(dl));
				const showLine = pointer && Math.hypot(anchor.x - ex, anchor.y - ey) > 24;
				return (
					<React.Fragment key={side}>
						{showLine ? (
							<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: op, overflow: 'visible'}}>
								<line x1={ex} y1={ey} x2={lx} y2={ly} stroke={INK} strokeWidth={8} strokeLinecap="round" opacity={0.55} />
								<line x1={ex} y1={ey} x2={lx} y2={ly} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
								{dl >= 1 ? <circle cx={anchor.x} cy={anchor.y} r={7} fill="#fff" stroke={INK} strokeWidth={3} /> : null}
							</svg>
						) : null}
						<div
							style={{
								position: 'absolute',
								left: p.x,
								top: p.y,
								transform: `translate(-50%, -50%) scale(${popS})`,
								opacity: op,
								padding: '10px 26px 8px',
								borderRadius: 16,
								background: 'rgba(12,8,24,0.74)',
								border: `4px solid ${INK}`,
								boxShadow: `0 8px 0 ${INK}, 0 12px 30px rgba(0,0,0,0.45)`,
								fontFamily: MONT,
								fontWeight: 900,
								fontSize: size,
								lineHeight: 1.05,
								letterSpacing: 1,
								textTransform: 'uppercase',
								whiteSpace: 'nowrap',
								textAlign: 'center',
								color: '#fff',
								...stroke(Math.max(4, size * 0.12)),
							}}
						>
							{text}
							{accent ? <span style={{color: GOLD}}> {accent}</span> : null}
							{sub ? <div style={{fontSize: size * 0.48, fontWeight: 800, letterSpacing: 2, marginTop: 2, opacity: 0.92, ...stroke(Math.max(3, size * 0.07))}}>{sub}</div> : null}
						</div>
					</React.Fragment>
				);
			})}
		</AbsoluteFill>
	);
};

/** deterministic 0–1 noise for the hand-drawn wobble */
const h1 = (x: number) => {
	const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/**
 * Marker around the subject: kind 'ring' = hand-drawn double stroke that draws itself on in 0.45 s (like MarkerRing), 'brackets'
 * = four corners that snap in from 1.5× (target lock, 0.3 s). target 'body' = the box, 'top' = the head (top anchor), radius
 * `r` or 17 % of the box. Position follows with `lag`, the size with the slower `sizeLag` (no «breathing» with the mask).
 */
export const TrackedRing: React.FC<{t0: number; t1: number; target?: 'body' | 'top'; kind?: 'ring' | 'brackets'; pad?: number; r?: number; color?: string; width?: number; lead?: number; lag?: number; sizeLag?: number; minConf?: number; seed?: number}> = ({
	t0,
	t1,
	target = 'body',
	kind = 'ring',
	pad = 1.14,
	r,
	color = PAL.orange,
	width = 10,
	lead = 0,
	lag = 0.05,
	sizeLag = 0.35,
	minConf = 0.3,
	seed = 3,
}) => {
	const ctx = useTracked();
	const t = useT();
	if (t < t0 || t > t1 + 0.25) return null;
	const s = ctx.subject(t, {lead, lag});
	const sz = ctx.subject(t, {lead, lag: sizeLag});
	const op = clamp01((t1 + 0.25 - t) / 0.25) * confK(s.conf, minConf);
	if (op <= 0.001) return null;
	const bw = sz.box.x1 - sz.box.x0;
	const bh = sz.box.y1 - sz.box.y0;
	const rTop = r ?? Math.max(42, 0.17 * Math.max(bw, bh));
	const cx = target === 'top' ? s.top.x : (s.box.x0 + s.box.x1) / 2;
	const cy = target === 'top' ? s.top.y + rTop * 0.55 : (s.box.y0 + s.box.y1) / 2;
	const rx = target === 'top' ? rTop * pad : Math.max(40, (bw / 2) * pad);
	const ry = target === 'top' ? rTop * pad : Math.max(40, (bh / 2) * pad);
	if (kind === 'brackets') {
		const k = easeOut((t - t0) / 0.3);
		const sc = lerp(1.5, 1, k);
		const hx = rx * sc;
		const hy = ry * sc;
		const arm = Math.min(hx, hy) * 0.42;
		const corners = [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1],
		];
		const d = corners.map(([sx, sy]) => `M${cx + sx * hx},${cy + sy * hy - sy * arm} L${cx + sx * hx},${cy + sy * hy} L${cx + sx * hx - sx * arm},${cy + sy * hy}`).join(' ');
		return (
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: op * clamp01(k * 2.5), pointerEvents: 'none', overflow: 'visible'}}>
				<path d={d} fill="none" stroke={INK} strokeWidth={width + 7} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
				<path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		);
	}
	const k = easeOut((t - t0) / 0.45);
	const n = 48;
	const pts = Array.from({length: n + 6}, (_, i) => {
		const a = (i / n) * Math.PI * 2 * 1.08 - 0.6;
		const wob = 1 + (h1(seed + i * 0.7) - 0.5) * 0.06 + (i / n) * 0.05;
		return [cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob];
	});
	const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
	const len = 2 * Math.PI * Math.max(rx, ry) * 1.25;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: op, pointerEvents: 'none', overflow: 'visible'}}>
			<path d={d} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={width + 6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} transform="translate(3,5)" />
			<path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - k)} />
		</svg>
	);
};

/** where a ray from `from` towards `to` enters rectangle r (slab method); `to` itself when `from` is inside */
const rayEnter = (from: Pt, to: Pt, r: Rect): Pt => {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	let tmin = 0;
	let tmax = 1;
	for (const [p, d, lo, hi] of [
		[from.x, dx, r.x0, r.x1],
		[from.y, dy, r.y0, r.y1],
	] as const) {
		if (Math.abs(d) < 1e-9) {
			if (p < lo || p > hi) return to;
			continue;
		}
		let a = (lo - p) / d;
		let b = (hi - p) / d;
		if (a > b) [a, b] = [b, a];
		tmin = Math.max(tmin, a);
		tmax = Math.min(tmax, b);
	}
	return tmin <= tmax ? {x: from.x + dx * tmin, y: from.y + dy * tmin} : to;
};

/**
 * Curved arrow from free space to the subject: the tail sits in a len × 0.6·len area next to the subject (planned like the
 * label: never on it, inside the safe zone), the head stops `gap` px before the subject box (target 'body') or the head circle
 * (target 'top'). Draws on in 0.35 s, the arrowhead lands at 85 %.
 */
export const TrackedArrow: React.FC<{t0: number; t1: number; sides?: Side[]; target?: 'body' | 'top'; len?: number; bend?: number; color?: string; width?: number; gap?: number; lead?: number; lag?: number; safe?: Rect; minConf?: number}> = ({
	t0,
	t1,
	sides = ['left', 'right', 'aboveLeft', 'aboveRight'],
	target = 'top',
	len = 210,
	bend = 0.28,
	color = '#fff',
	width = 12,
	gap = 22,
	lead = 0,
	lag = 0.1,
	safe = TRACK_SAFE,
	minConf = 0.3,
}) => {
	const ctx = useTracked();
	const t = useT();
	const w = len;
	const h = len * 0.6;
	const key = JSON.stringify([t0, t1, sides, len, gap, lead, lag, safe]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const plan = useMemo(() => planPlacement({subject: (x) => ctx.subject(x, {lead, lag}), hard: (x) => ctx.subject(x), ta: t0 - 0.1, tb: t1 + 0.3, w, h, gap, sides, safe}), [ctx, key]);
	if (t < t0 || t > t1 + 0.2) return null;
	const s = ctx.subject(t, {lead, lag});
	const life0 = life(t, t0, t1, 0.05) * confK(s.conf, minConf);
	if (life0 <= 0.001) return null;
	const bw = s.box.x1 - s.box.x0;
	const bh = s.box.y1 - s.box.y0;
	const rTop = Math.max(42, 0.17 * Math.max(bw, bh));
	const aim: Pt = target === 'top' ? {x: s.top.x, y: s.top.y + rTop * 0.55} : {x: (s.box.x0 + s.box.x1) / 2, y: (s.box.y0 + s.box.y1) / 2};
	const k = easeOut((t - t0) / 0.35);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible'}}>
			{planLayers(plan, t).map(({side, p, o}) => {
				const r = rectAt(p, w, h);
				// tail = the far end of the area from the subject
				const tail: Pt = side === 'left' || side === 'aboveLeft' ? {x: r.x0 + 12, y: side === 'left' ? r.y0 + h * 0.25 : r.y0 + 10} : side === 'right' || side === 'aboveRight' ? {x: r.x1 - 12, y: side === 'right' ? r.y0 + h * 0.25 : r.y0 + 10} : side === 'above' ? {x: p.x, y: r.y0} : {x: p.x, y: r.y1};
				const stopR: Rect = target === 'top' ? inflate({x0: aim.x - rTop, y0: aim.y - rTop, x1: aim.x + rTop, y1: aim.y + rTop}, gap) : inflate(s.box, gap);
				const head = rayEnter(tail, aim, stopR);
				const mx = (tail.x + head.x) / 2;
				const my = (tail.y + head.y) / 2;
				const dx = head.x - tail.x;
				const dy = head.y - tail.y;
				const L = Math.max(1, Math.hypot(dx, dy));
				const sgn = side === 'right' || side === 'aboveRight' ? 1 : -1;
				const ctrl = {x: mx + (-dy / L) * bend * L * sgn, y: my + (dx / L) * bend * L * sgn};
				const d = `M${tail.x.toFixed(1)},${tail.y.toFixed(1)} Q${ctrl.x.toFixed(1)},${ctrl.y.toFixed(1)} ${head.x.toFixed(1)},${head.y.toFixed(1)}`;
				const plen = L * (1 + bend * bend * 1.3);
				const tx = head.x - ctrl.x;
				const ty = head.y - ctrl.y;
				const tl = Math.max(1, Math.hypot(tx, ty));
				const ux = tx / tl;
				const uy = ty / tl;
				const ah = width * 2.6;
				const tri = `M${head.x + ux * 4},${head.y + uy * 4} L${head.x - ux * ah - uy * ah * 0.62},${head.y - uy * ah + ux * ah * 0.62} L${head.x - ux * ah + uy * ah * 0.62},${head.y - uy * ah - ux * ah * 0.62} Z`;
				const hk = clamp01((k - 0.85) / 0.15);
				return (
					<g key={side} opacity={life0 * o}>
						<path d={d} fill="none" stroke={INK} strokeWidth={width + 8} strokeLinecap="round" strokeDasharray={plen} strokeDashoffset={plen * (1 - k)} opacity={0.6} />
						<path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={plen} strokeDashoffset={plen * (1 - k)} />
						{hk > 0 ? <path d={tri} fill={color} stroke={INK} strokeWidth={4} strokeLinejoin="round" opacity={hk} transform={`translate(${head.x * (1 - lerp(0.6, 1, hk))}, ${head.y * (1 - lerp(0.6, 1, hk))}) scale(${lerp(0.6, 1, hk)})`} /> : null}
					</g>
				);
			})}
		</svg>
	);
};

/** dims everything outside a soft ellipse around the subject (pad × the box), fades in / out in 0.35 s */
export const TrackedSpotlight: React.FC<{t0: number; t1: number; dim?: number; pad?: number; feather?: number; lag?: number; minConf?: number}> = ({t0, t1, dim = 0.55, pad = 1.25, feather = 0.45, lag = 0.08, minConf = 0.3}) => {
	const ctx = useTracked();
	const t = useT();
	if (t < t0 || t > t1 + 0.35) return null;
	const s = ctx.subject(t, {lag});
	const a = dim * life(t, t0, t1, 0.35, 0.35) * Math.max(0.0, confK(s.conf, minConf));
	if (a <= 0.001) return null;
	const cx = (s.box.x0 + s.box.x1) / 2;
	const cy = (s.box.y0 + s.box.y1) / 2;
	const rx = Math.max(120, ((s.box.x1 - s.box.x0) / 2) * pad * 1.42);
	const ry = Math.max(120, ((s.box.y1 - s.box.y0) / 2) * pad * 1.42);
	return <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(${rx.toFixed(0)}px ${ry.toFixed(0)}px at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, rgba(6,4,14,0) 0%, rgba(6,4,14,0) ${((1 - feather) * 100).toFixed(0)}%, rgba(6,4,14,${a.toFixed(3)}) 100%)`}} />;
};

/** smooth closed path through points (Catmull-Rom → cubic Bézier) */
const smoothClosed = (p: Pt[]) => {
	const n = p.length;
	if (n < 3) return '';
	let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
	for (let i = 0; i < n; i++) {
		const p0 = p[(i - 1 + n) % n];
		const p1 = p[i];
		const p2 = p[(i + 1) % n];
		const p3 = p[(i + 2) % n];
		d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)},${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)},${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
	}
	return d + ' Z';
};

/**
 * The SAM 2 silhouette of the frame on screen (needs tools/track.py --poly N; frames without a polygon borrow the nearest one
 * within 2 frames, else nothing). Exact to the source frame (24 fps film steps with the picture). Draws on in 0.5 s.
 */
export const TrackedOutline: React.FC<{t0: number; t1: number; color?: string; width?: number; glow?: string; fill?: string; minConf?: number}> = ({t0, t1, color = GOLD, width = 6, glow = 'rgba(255,200,58,0.7)', fill = 'none', minConf = 0.3}) => {
	const ctx = useTracked();
	const t = useT();
	if (t < t0 || t > t1 + 0.2) return null;
	const tr = ctx.track;
	const i = frameIndexAt(tr, ctx.clipT(t));
	let f: TrackFrame | null = null;
	for (const j of [i, i - 1, i + 1, i - 2, i + 2]) {
		if (tr.frames[j]?.poly?.length) {
			f = tr.frames[j];
			break;
		}
	}
	if (!f || !f.poly) return null;
	const op = life(t, t0, t1, 0.1) * confK(f.c, minConf);
	if (op <= 0.001) return null;
	const pts = f.poly.map(([u, v]) => ctx.toScene(u, v, t));
	const d = smoothClosed(pts);
	let per = 0;
	for (let k = 0; k < pts.length; k++) per += Math.hypot(pts[(k + 1) % pts.length].x - pts[k].x, pts[(k + 1) % pts.length].y - pts[k].y);
	const k = easeOut((t - t0) / 0.5);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: op, pointerEvents: 'none', overflow: 'visible'}}>
			<path d={d} fill={fill} stroke={color} strokeWidth={width} strokeLinejoin="round" strokeDasharray={per * 1.15} strokeDashoffset={per * 1.15 * (1 - k)} style={{filter: `drop-shadow(0 0 10px ${glow}) drop-shadow(0 0 2px ${INK})`}} />
		</svg>
	);
};

/** QA overlay: raw box (grey), smoothed box (gold), centroid / top anchor, confidence + source, safe zone (dashed) */
export const TrackedDebug: React.FC<{safe?: Rect}> = ({safe = TRACK_SAFE}) => {
	const ctx = useTracked();
	const t = useT();
	const tc = ctx.clipT(t);
	const f = ctx.track.frames[frameIndexAt(ctx.track, tc)];
	const s = ctx.subject(t);
	const raw = f.r ? [ctx.toScene(f.r[0], f.r[1], t), ctx.toScene(f.r[2], f.r[3], t)] : null;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
			<rect x={safe.x0} y={safe.y0} width={safe.x1 - safe.x0} height={safe.y1 - safe.y0} fill="none" stroke="#22E6D8" strokeWidth={3} strokeDasharray="14 10" opacity={0.8} />
			{raw ? <rect x={raw[0].x} y={raw[0].y} width={raw[1].x - raw[0].x} height={raw[1].y - raw[0].y} fill="none" stroke="#bbb" strokeWidth={2} /> : null}
			<rect x={s.box.x0} y={s.box.y0} width={s.box.x1 - s.box.x0} height={s.box.y1 - s.box.y0} fill="none" stroke={GOLD} strokeWidth={4} />
			<circle cx={s.c.x} cy={s.c.y} r={8} fill="#fff" stroke={INK} strokeWidth={3} />
			<circle cx={s.top.x} cy={s.top.y} r={8} fill="#22E6D8" stroke={INK} strokeWidth={3} />
			<text x={s.box.x0} y={s.box.y1 + 34} fill="#fff" stroke={INK} strokeWidth={5} paintOrder="stroke" fontFamily={MONT} fontWeight={800} fontSize={28}>
				{`f${f.f} c${f.c.toFixed(2)} ${f.src ?? ''} t${tc.toFixed(2)}`}
			</text>
		</svg>
	);
};
