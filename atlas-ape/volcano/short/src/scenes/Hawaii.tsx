import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {GEO, ML_PATH, along, type LL} from '../data/geo';
import trackHookJson from '../data/hawaii_hook_track.json';
import trackRaidJson from '../data/hawaii_raid_track.json';
import trackAJson from '../data/hawaii_a_track.json';
import trackBJson from '../data/hawaii_b_track.json';
import {MONT} from '../fonts';
import {W} from '../lib/time';
import {Billboards, type BB} from '../three/Billboards';
import {orbit, project, type Cam, type Orbit} from '../three/cam';
import {embers, explosion, plume, type V3} from '../three/fx';
import type {Region} from '../three/region';
import type {SkyLook} from '../three/Sky';
import type {Look} from '../three/TerrainMesh';
import {ImgSeq, Label, clamp01, easeInOut, easeOut, lerp, useT} from '../ui/gfx';
import {Scene3D} from './common';

/** pilot switches (owner 18.10, new look): the stylised Blender renders (tools/blender/hawaii_*.py → public/blender/<shot>,
 *  screen tracks copied to src/data/hawaii_<shot>_track.json) instead of the three.js shots; false = the old 3D fallback */
const BLENDER_HOOK = true;
const BLENDER_A = true;
const BLENDER_RAID = true;
const BLENDER_B = true;

// STYLE v3 (owner notes 18.10): our bright 3D look, lava glow, embers, explosions and real bomber cut-outs stay; texts are
// calm (subtitle + at most ONE horizontal Label that adds what the voice does not say), cameras move continuously
// (cubic Hermite paths, no jumps, no shake), shots cross-dissolve (Layer in src/Short.tsx).

const H = GEO.hawaii;
const P = (cam: Cam, p: V3) => project(cam, p, 1080, 1920);

// ---------------------------------------------------------------- Blender shots: image sequence + screen tracks
// track.json = {t0, fps, n, frames}: frames[i] belongs to f_(i+1) (rendered at t0 + i/fps) and gives each key point as
// [x, y] px on 1080×1920 (null = behind the camera). The frame index is ImgSeq's own (floor + ε), so the overlays stay on
// the very image that is shown.
type XY = {x: number; y: number};
type TrackPt = [number, number] | null;
type Track = {t0: number; fps: number; frames: Record<string, TrackPt | TrackPt[]>[]};
const TR_HOOK = trackHookJson as unknown as Track;
const TR_RAID = trackRaidJson as unknown as Track;
const TR_A = trackAJson as unknown as Track;
const TR_B = trackBJson as unknown as Track;
const OFF: XY = {x: NaN, y: NaN};
const seqIdx = (tr: Track, t: number) => Math.max(0, Math.min(tr.frames.length - 1, Math.floor((t - tr.t0) * tr.fps + 1e-6)));
const trackFrame = (tr: Track, t: number) => tr.frames[seqIdx(tr, t)];
/** one tracked point at time t (NaN when the key is missing → the overlays that use it hide themselves) */
const tp = (tr: Track, t: number, key: string): XY => {
	const v = trackFrame(tr, t)[key] as TrackPt | undefined;
	return v && typeof v[0] === 'number' ? {x: v[0], y: v[1]} : OFF;
};
/**
 * A tracked polyline smoothed over time relative to an exact anchor key (Gaussian, σ = `sig` frames): every point is taken
 * relative to the anchor of its frame, those offsets are averaged over neighbouring frames, and the anchor's own position is
 * added back. The camera's motion (carried by the anchor) stays exact, only jumps in the offsets are spread out.
 */
const smoothPath = (tr: Track, key: string, anchor: string, sig: number): XY[][] => {
	const R = Math.ceil(3 * sig);
	const n = tr.frames.length;
	const raw = tr.frames.map((f) => (f[key] as TrackPt[] | undefined) ?? []);
	const anc = tr.frames.map((f) => f[anchor] as TrackPt);
	return raw.map((pts, i) =>
		pts.flatMap((p, j) => {
			const a = anc[i];
			if (!p || !a) return [];
			let sw = 0;
			let sx = 0;
			let sy = 0;
			for (let d = -R; d <= R; d++) {
				const m = Math.max(0, Math.min(n - 1, i + d));
				const q = raw[m][j];
				const b = anc[m];
				if (!q || !b) continue;
				const w = Math.exp((-d * d) / (2 * sig * sig));
				sw += w;
				sx += w * (q[0] - b[0]);
				sy += w * (q[1] - b[1]);
			}
			return [{x: a[0] + sx / sw, y: a[1] + sy / sw}];
		}),
	);
};
const Seq: React.FC<{dir: string; tr: Track}> = ({dir, tr}) => <ImgSeq dir={dir} t0={tr.t0} n={tr.frames.length} fps={tr.fps} />;

/**
 * Anchored map label whose ring plays ONCE (as Inserts.tsx AnchorLabel): gfx `Label anchor` restarts its ring every 1.6 s,
 * which blinks on labels that stay up longer than that. Dot + leader + one expanding ring, then a plain `Label` (no anchor).
 * `ring` tints the one ring (Hilo: a single soft warm-red «danger» pulse on «city.», never repeated). With dy > 0 the text
 * hangs below its anchor and the leader ends at the text's top edge.
 */
const PinLabel: React.FC<{text: string; x: number; y: number; dx?: number; dy?: number; t0: number; t1: number; size?: number; ring?: string; ringR?: number}> = ({text, x, y, dx = 0, dy = -70, t0, t1, size = 54, ring = '#fff', ringR = 18}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
	const k = easeOut((t - t0) / 0.35);
	const o = k * clamp01((t1 + 0.3 - t) / 0.3);
	const half = (text.length * size * 0.6) / 2;
	const lx = Math.max(70 + half, Math.min(1010 - half, x + dx));
	const ly = y + dy;
	const rk = clamp01((t - t0) / 1.2);
	return (
		<>
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o, pointerEvents: 'none'}}>
				<line x1={x} y1={y} x2={lerp(x, lx, k)} y2={lerp(y, ly + (dy < 0 ? 0.55 : -0.55) * size, k)} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.85} style={{filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))'}} />
				<circle cx={x} cy={y} r={9} fill="#fff" style={{filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))'}} />
				{rk < 1 ? <circle cx={x} cy={y} r={9 + ringR * easeOut(rk)} fill="none" stroke={ring} strokeWidth={2.5} opacity={0.7 * (1 - rk)} /> : null}
			</svg>
			<Label text={text} t0={t0} t1={t1} x={lx} y={ly} size={size} />
		</>
	);
};

// ---------------------------------------------------------------- smooth camera paths
/** camera key: orbit around a ground point (lat/lon + agl km; `sea` = the point at sea level instead of on the ground) at
 *  time t; `v` fixes the key's tangent (deg/s for az/el, d = d ln(dist)/dt) where it must match a neighbouring shot or the
 *  Catmull-Rom tangent would overshoot a close next key; `v.tg` scales the target's Catmull-Rom tangent (0 = target at rest) */
type CK = {t: number; ll: LL; agl?: number; sea?: boolean; az: number; el: number; dist: number; fov: number; still?: boolean; v?: {az?: number; el?: number; d?: number; tg?: number}};

/** C1-continuous Hermite through per-key channel values (Catmull-Rom tangents unless fixed); keeps drifting outside */
const hermite = (keys: CK[], vals: number[][], t: number, endVel: [number, number], fixed: (k: CK, c: number) => number | undefined, scale: (k: CK, c: number) => number = () => 1): number[] => {
	const n = keys.length;
	const T = keys.map((k) => k.t);
	const tan = vals.map((v, i) =>
		v.map((_, c) => {
			const f = fixed(keys[i], c);
			if (f !== undefined) return f;
			if (keys[i].still) return 0;
			if (i === 0) return (endVel[0] * (vals[1][c] - v[c])) / (T[1] - T[0]);
			if (i === n - 1) return (endVel[1] * (v[c] - vals[n - 2][c])) / (T[n - 1] - T[n - 2]);
			return (scale(keys[i], c) * (vals[i + 1][c] - vals[i - 1][c])) / (T[i + 1] - T[i - 1]);
		}),
	);
	if (t <= T[0]) return vals[0].map((v, c) => v + tan[0][c] * (t - T[0]));
	if (t >= T[n - 1]) return vals[n - 1].map((v, c) => v + tan[n - 1][c] * (t - T[n - 1]));
	let i = 0;
	while (t > T[i + 1]) i++;
	const h = T[i + 1] - T[i];
	const u = (t - T[i]) / h;
	const u2 = u * u;
	const u3 = u2 * u;
	return vals[i].map((p0, c) => (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * tan[i][c] + (-2 * u3 + 3 * u2) * vals[i + 1][c] + (u3 - u2) * h * tan[i + 1][c]);
};
// channels: 0-2 target xyz, 3 az, 4 el, 5 ln(dist), 6 fov
const fixedTan = (k: CK, c: number) => (c === 3 ? k.v?.az : c === 4 ? k.v?.el : c === 5 ? k.v?.d : undefined);
const tanScale = (k: CK, c: number) => (c <= 2 ? (k.v?.tg ?? 1) : 1);

/** camera path through keys (distance interpolated in log space so a push-in has a constant feel); endVel scales the end
 *  tangents (0 = ease to rest) */
const camPath = (r: Region, keys: CK[], t: number, endVel: [number, number] = [0.6, 0.6]): Orbit => {
	const vals = keys.map((k) => {
		const p = r.at(k.ll[0], k.ll[1], k.agl ?? 0);
		return [p[0], k.sea ? (k.agl ?? 0) : p[1], p[2], k.az, k.el, Math.log(k.dist), k.fov];
	});
	const o = hermite(keys, vals, t, endVel, fixedTan, tanScale);
	return {target: [o[0], o[1], o[2]], az: o[3], el: o[4], dist: Math.exp(o[5]), fov: o[6]};
};

/** camera distance only (needs no region): drives the far-view haze and the near plane per frame */
const pathDist = (keys: CK[], t: number, endVel: [number, number] = [0.6, 0.6]) =>
	Math.exp(hermite(keys, keys.map((k) => [Math.log(k.dist)]), t, endVel, (k) => k.v?.d)[0]);

/** soft camera push from a blast: the distance grows by `amt` with an ease-in-out over `dur` s (no shake, no jolt) */
const push = (t: number, at: number, amt: number, dur = 1.1) => 1 + amt * easeInOut((t - at) / dur);

// ---------------------------------------------------------------- explosions (no white flash sprite)
type Drop = {tr: number; ti: number; at: LL};
/**
 * Bomb blasts without a white flash. The fx explosion is re-graded here so it reads as an orange fireball, not a blown-out
 * white box: the white-hot flash billboard (add[0]) is dropped (owner: no flashes), the fireball puffs are warmer and dimmer
 * (less green/blue in the core → no white after bloom + ACES), and every puff is lifted by a part of its own size (plus the
 * origin a few tens of metres above the ground) so the big camera-facing quads are not cut flat by the terrain (depth test:
 * that hard straight bottom edge read as a flash).
 */
const blasts = (r: Region, drops: Drop[], t: number, scale: number, lift = 0.03) => {
	const add: BB[] = [];
	const norm: BB[] = [];
	drops.forEach((d, i) => {
		const te = t - d.ti;
		const e = explosion(te, r.at(d.at[0], d.at[1], lift), scale, i + 1);
		// ~20 fireball puffs overlap in the core: per puff the green channel must stay tiny, or the sum saturates r AND g
		// through ACES (= cream/white); red carries the glow, so the core stays orange and the rim deep red
		const sparkIn = clamp01(te / 0.12); // the 70 sparks start in one point: fade them in, or they make a white dot
		for (const b of e.add.slice(1)) {
			if (b.kind === 1) add.push({...b, y: b.y + b.size * 0.32, r: b.r * 0.14, g: b.g * 0.035, b: b.b * 0.03, gr: (b.gr ?? 0) * 0.045, gg: (b.gg ?? 0) * 0.005, gb: (b.gb ?? 0) * 0.002});
			else add.push({...b, g: b.g * 0.5, b: b.b * 0.3, a: b.a * sparkIn}); // sparks: orange, not white
		}
		for (const b of e.norm) norm.push(b.kind === 1 ? {...b, y: b.y + b.size * 0.3} : b);
	});
	return {add, norm};
};

// ---------------------------------------------------------------- real bombers as collage cut-outs
// Cut out of a real USAF photo of 1930s US Army Air Corps bombers dropping bombs (public/photos/keystone_b6a_bombing.jpg,
// public domain; tools/cutout_planes.py) — white «sticker» outline over the 3D terrain.
const SPR = {
	big: {src: 'cutouts/plane_big.png', w: 1080, h: 610},
	right: {src: 'cutouts/plane_right.png', w: 830, h: 406},
	small: {src: 'cutouts/plane_small.png', w: 592, h: 288},
};
const BOMBS = ['cutouts/bomb_a.png', 'cutouts/bomb_b.png', 'cutouts/bomb_c.png'];
const STICKER = 'drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 16px 20px rgba(20,0,30,0.55))';
const CREDIT = 'Bombers: 1930s US Army Air Corps photo · USAF, public domain';
type Pass = {spr: keyof typeof SPR; t0: number; t1: number; a: [number, number]; b: [number, number]; s: number; rot?: number};
const planeAt = (p: Pass, t: number) => {
	const k = (t - p.t0) / (p.t1 - p.t0);
	return {x: lerp(p.a[0], p.b[0], k), y: lerp(p.a[1], p.b[1], k) + Math.sin(t * 2.2 + p.s * 9) * 5, k};
};
const Cutouts: React.FC<{passes: Pass[]; drops: {pass: number; tr: number; ti: number; to: {x: number; y: number}}[]; credit?: [number, number]; creditTop?: boolean}> = ({passes, drops, credit, creditTop}) => {
	const t = useT();
	const co = credit ? clamp01((t - credit[0]) / 0.3) * clamp01((credit[1] - t) / 0.3) : 0;
	return (
		<>
			{passes.map((p, i) => {
				if (t < p.t0 || t > p.t1) return null;
				const {x, y} = planeAt(p, t);
				const sp = SPR[p.spr];
				return (
					<Img
						key={i}
						src={staticFile(sp.src)}
						style={{position: 'absolute', left: x - (sp.w * p.s) / 2, top: y - (sp.h * p.s) / 2, width: sp.w * p.s, height: sp.h * p.s, transform: `rotate(${(p.rot ?? 2) + Math.sin(t * 1.6 + i) * 1.2}deg)`, filter: `${STICKER} sepia(0.25) contrast(1.1)`}}
					/>
				);
			})}
			{drops.map((d, i) => {
				if (t < d.tr || t > d.ti) return null;
				const p = passes[d.pass];
				const sp = SPR[p.spr];
				const st = planeAt(p, d.tr);
				const fx = st.x + sp.w * p.s * 0.08;
				const fy = st.y + sp.h * p.s * 0.28;
				const u = (t - d.tr) / (d.ti - d.tr);
				const x = lerp(fx, d.to.x, u * (2 - u) * 0.7 + u * 0.3);
				const y = lerp(fy, d.to.y, u * u);
				const sc = lerp(0.62, 0.3, u) * (p.s / 0.6);
				const ang = lerp(10, 70, u);
				return (
					<Img key={'b' + i} src={staticFile(BOMBS[i % 3])} style={{position: 'absolute', left: x - 75 * sc, top: y - 40 * sc, width: 150 * sc, height: 80 * sc, transform: `rotate(${ang}deg)`, filter: 'drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)'}} />
				);
			})}
			{co > 0 ? (
				<div style={{position: 'absolute', left: 32, maxWidth: 900, top: creditTop ? 64 : 1582, padding: '5px 12px', borderRadius: 10, background: 'rgba(8,3,20,0.5)', fontFamily: MONT, fontWeight: 700, fontSize: 22, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.88)', opacity: co}}>
					{CREDIT}
				</div>
			) : null}
		</>
	);
};

// ---------------------------------------------------------------- HOOK (0 – 6.6 s): bombing a lava channel at sunset
// «The US Army once bombed a volcano.» One continuous camera: a slow push towards the lava channel while the bomber
// crosses, the blast gently pushes the camera back, then a smooth, steady rise/pull-back over the glowing flow.
const HOOK_DROP: Drop = {tr: 0.42, ti: W(4) - 0.04, at: H.bombs[0]};
const HOOK_KEYS: CK[] = [
	{t: 0, ll: H.bombs[0], az: 68, el: 9, dist: 1.62, fov: 42},
	{t: 1.55, ll: H.bombs[0], az: 64, el: 9.6, dist: 1.36, fov: 41, still: true},
	{t: 4.2, ll: H.bombs[0], az: 57, el: 14, dist: 2.5, fov: 39},
	{t: 6.9, ll: H.bombs[0], az: 50, el: 18, dist: 3.6, fov: 38},
];

// Blender hook (tools/blender/hawaii_hook.py, 0 – 6.87 s; reframed 18.10 so the volcano reads as a mountain): the Mauna Loa
// skyline holds at y ≈ 430–470 with the violet sky and a bank of cream clouds above it; slow push towards the glowing river
// with the erupting vent (a glowing lava-fountain body in a lava pool, the tall cream plume rising from its crown, its base lit
// orange) on the left, the blast on the river at 1.37 s (fireball from f_0084; its smoke thins out as it rises, fed by a dark
// stem rooted at the impact, drifting right), then on «volcano.» a crane up and back that keeps the
// skyline: summit dome, flank, plume and impact (y ≈ 850–910). Fireball, spatter, plume and camera are in the render; only
// the real bomber cut-out and its bomb are DOM. The plane crosses the sky band (y 230 → 190), and its bomb lands on the
// tracked impact point exactly when the render's fireball starts.
const HookBlender: React.FC = () => {
	const t = useT();
	const I = tp(TR_HOOK, t, 'impact');
	return (
		<AbsoluteFill>
			<Seq dir="blender/hawaii_hook" tr={TR_HOOK} />
			{/* PD photo, credited in the raid shot and CREDITS.md — no text strip over the plane in the first second */}
			<Cutouts passes={[{spr: 'big', t0: -0.2, t1: 2.3, a: [-420, 230], b: [1420, 190], s: 0.6, rot: 3}]} drops={[{pass: 0, tr: HOOK_DROP.tr, ti: HOOK_DROP.ti, to: I}]} />
		</AbsoluteFill>
	);
};

export const HookScene: React.FC = () => (BLENDER_HOOK ? <HookBlender /> : <Hook3D />);

const Hook3D: React.FC = () => (
	<Scene3D
		region="hawaii_vent"
		wide={['hawaii_flow', 'hawaii']}
		look="hawaii"
		cam={(r, t) => {
			const o = camPath(r, HOOK_KEYS, t, [0.8, 0.8]);
			return orbit({...o, dist: o.dist * push(t, HOOK_DROP.ti, 0.03, 0.9)});
		}}
		lava={(_r, t) => ({prog: [0.55 + t * 0.006, 0, 0], cool: [0, 0, 0], gain: 1.2, noise: 70, thick: 0.008, hot: 0.38})}
		post={{bloom: 1.3, threshold: 0.8}}
		overlay={(r, cam) => {
			const I = P(cam, r.at(HOOK_DROP.at[0], HOOK_DROP.at[1]));
			return <Cutouts passes={[{spr: 'big', t0: -0.2, t1: 2.3, a: [-420, 300], b: [1420, 250], s: 0.6, rot: 3}]} drops={[{pass: 0, tr: HOOK_DROP.tr, ti: HOOK_DROP.ti, to: I}]} />; /* PD photo, credited in the raid shot and CREDITS.md — no text strip over the plane in the first second */
		}}
		children={(r, t) => {
			const bl = blasts(r, [HOOK_DROP], t, 0.075, 0.035);
			const I = r.at(HOOK_DROP.at[0], HOOK_DROP.at[1]);
			return (
				<>
					<Billboards max={500} items={[...bl.add, ...embers(t, I, {n: 200, spread: 0.7, rise: 0.4, size: 0.014, seed: 3})]} />
					<Billboards max={160} blending="normal" items={[...bl.norm, ...plume(t, r.at(H.vent[0], H.vent[1]), {n: 22, rise: 1.4, spread: 0.12, size: 0.35, grow: 2.2, seed: 9, color: [0.16, 0.1, 0.14], alpha: 0.5, glow: [1.4, 0.35, 0.06]})]} renderOrder={4} />
				</>
			);
		}}
	/>
);

// ---------------------------------------------------------------- shared look for the island / flow shots
// The far views see no sky (el ≥ 35°), so the sky colours only tint the far sea: keep the horizon ocean blue and switch
// off the sunset glow the Ocean adds towards the sun (it made a cream «hole» in the sea), and thin the violet haze while the
// camera is far up, so the island reads as an island in the ocean.
const SEA_SKY: Partial<SkyLook> = {horizon: '#0f5f8c', glowI: 0};
const lookFar = (dist: number): Partial<Look> => ({fogMax: lerp(0.5, 0.16, clamp01((dist - 60) / 120))});
/** near plane for far views: ~1 % of the camera distance, so the coast keeps its depth precision against the sea plane */
const nearFor = (dist: number) => Math.max(0.02, 0.01 * dist);

// ---------------------------------------------------------------- HAWAII A (8.55 – 12.7): island → flow → toward Hilo
// One continuous move: the whole Big Island in its ocean («Hawaii.», label Mauna Loa on the summit) → push-in and tilt onto
// the 1935 flow, which crawls on («Lava is crawling») → oblique view along the flow towards Hilo («toward a city», label Hilo).
// GlobeHop v4 (18.10) lands its dive exactly on this camera from 8.55 s (same target/az/el/dist/fov and speed), so the
// globe island and the 3D island lie on top of each other through the dissolve. GlobeHop.tsx imports `hawaiiACam` /
// `hawaiiALook` and samples them at 8.55 s, so it follows any change of these keys (re-check 8.45–8.95 s after one).
// The first key frames the whole Big Island (Kohala to Ka Lae) centred in the 9:16 frame.
// Key 11.25 has a fixed (small) tangent: with Catmull-Rom it inherited the 9.8 → 12.7 average (≈ −11 °/s az, −10 °/s el,
// and the target's 10 km move) and overshot the near-identical last key, so the camera stopped dead at ~11.9 s and drifted
// back under the Hilo label.
// Now the swing eases into a slow, steady push that keeps going through the 12.3–12.7 dissolve to the raid.
const A_KEYS: CK[] = [
	{t: 8.55, ll: [19.575, -155.53], az: -25, el: 80, dist: 270, fov: 55},
	{t: 9.8, ll: [19.6, -155.45], az: -42, el: 70, dist: 128, fov: 50},
	{t: 11.25, ll: [19.69, -155.36], az: -72, el: 42, dist: 60, fov: 40, v: {az: -3.2, el: -1.6, d: -0.07, tg: 0.15}},
	{t: 12.7, ll: [19.693, -155.348], az: -76.5, el: 39.6, dist: 53.5, fov: 40},
];
const A_END: [number, number] = [0.7, 0.7];
/** Hawaii3DA's (wide) camera, its look override and sky override — for the globe hop that lands on it */
export const HAWAII_A_KEYS = A_KEYS;
export const hawaiiACam = (r: Region, t: number): Orbit => camPath(r, A_KEYS, t, A_END);
export const hawaiiALook = (t: number): Partial<Look> => lookFar(pathDist(A_KEYS, t, A_END));
export const HAWAII_SEA_SKY = SEA_SKY;
const lavaProgA = (t: number) => (t < 12.3 ? 0.18 + 0.64 * easeInOut((t - 9.2) / 3.1) : 0.82 + (t - 12.3) * 0.02);
const lavaA = (t: number) => ({prog: [lavaProgA(t), 0, 0] as V3, cool: [0, 0, 0] as V3, gain: 1.15, noise: 70, thick: 0.01, hot: 0.32});

/** dashed path a → b drawn in with k (0..1); stops short of b so the anchor dot stays clean */
const PathLine: React.FC<{a: {x: number; y: number}; b: {x: number; y: number}; k: number; o: number; color: string}> = ({a, b, k, o, color}) => {
	if (k <= 0 || o <= 0) return null;
	const L = Math.hypot(b.x - a.x, b.y - a.y);
	if (!(L > 60)) return null;
	const ux = (b.x - a.x) / L;
	const uy = (b.y - a.y) / L;
	const end = (L - 34) * k;
	const ex = a.x + ux * end;
	const ey = a.y + uy * end;
	const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
	const ah = clamp01((k - 0.75) / 0.25);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
			<line x1={a.x} y1={a.y} x2={ex} y2={ey} stroke={color} strokeWidth={6} strokeDasharray="20 14" strokeLinecap="round" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'}} />
			{ah > 0 ? <polygon points={`${ex + 6},${ey} ${ex - 18},${ey - 14} ${ex - 18},${ey + 14}`} fill={color} opacity={ah} transform={`rotate(${ang} ${ex} ${ey})`} style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'}} /> : null}
		</svg>
	);
};

/** dashed route along a tracked ground polyline (front → Hilo), drawn in with k (0..1) of its length; like PathLine it
 *  stops 34 px short of the end so the anchor dot stays clean, and the arrowhead grows in over the last quarter */
const PathPoly: React.FC<{pts: XY[]; k: number; o: number; color: string}> = ({pts, k, o, color}) => {
	if (k <= 0 || o <= 0 || pts.length < 2) return null;
	const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
	const L = seg.reduce((a, b) => a + b, 0);
	if (!(L > 60)) return null;
	const end = (L - 34) * k;
	const out = [pts[0]];
	let acc = 0;
	let dir = {x: 1, y: 0};
	for (let i = 0; i < seg.length; i++) {
		if (seg[i] <= 0) continue;
		const a = pts[i];
		const b = pts[i + 1];
		dir = {x: (b.x - a.x) / seg[i], y: (b.y - a.y) / seg[i]};
		if (acc + seg[i] >= end) {
			const u = end - acc;
			out.push({x: a.x + dir.x * u, y: a.y + dir.y * u});
			break;
		}
		out.push(b);
		acc += seg[i];
	}
	const e = out[out.length - 1];
	const ang = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
	const ah = clamp01((k - 0.75) / 0.25);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
			<polyline points={out.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={6} strokeDasharray="20 14" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'}} />
			{ah > 0 ? <polygon points={`${e.x + 6},${e.y} ${e.x - 18},${e.y - 14} ${e.x - 18},${e.y + 14}`} fill={color} opacity={ah} transform={`rotate(${ang} ${e.x} ${e.y})`} style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'}} /> : null}
		</svg>
	);
};

// Blender Hawaii A (tools/blender/hawaii_a.py, 8.55 – 12.73 s): its camera IS hawaiiACam up to 9.8 s (GlobeHop lands on it
// unchanged), then a push-in and tilt to an oblique view ENE along the flow towards Hilo. The flow leaves the erupting flank
// vent at ~9.6 s and crawls towards Hilo (toy houses at the bay); the eruption plume rises from the vent's fountain and bends
// SSE (down-screen in the top view, right in the end view), away from the flow and the route. The labels and the route sit on
// the render's own tracks: `front` is the visible lava tip (the old along(ML_PATH, …) point ran up to 6 km ahead of it), `path`
// the route draped on the ground from the tip to Hilo (≥ 140 px left of the plume). Mauna Loa hangs BELOW its summit.
// The route's start is the tracked visible lava tip, which jumps up to 28 px in one frame when the flow fills a new lobe
// (10.78 s, while the route draws in): the route is smoothed relative to Hilo (σ = 0.1 s), so it glides over those jumps
// and still ends exactly on the Hilo pin (camera motion error ≤ 2 px).
let A_ROUTE: XY[][] | null = null;
const aRoute = (t: number) => (A_ROUTE ??= smoothPath(TR_A, 'path', 'hilo', 6))[seqIdx(TR_A, t)];

const ABlender: React.FC = () => {
	const t = useT();
	const summit = tp(TR_A, t, 'summit');
	const hilo = tp(TR_A, t, 'hilo');
	const tP = W(22) - 0.1; // «toward»
	return (
		<AbsoluteFill>
			<Seq dir="blender/hawaii_a" tr={TR_A} />
			{/* gone (fade 9.3–9.6) before «Lava» (9.67 s) shows in the subtitle band right under it */}
			<PinLabel text="Mauna Loa" x={summit.x} y={summit.y} dy={72} t0={8.75} t1={9.3} size={52} />
			{/* the route leaves together with the Hilo label (gone by 12.5), so it never crosses the raid's reticles */}
			<PathPoly pts={aRoute(t)} k={easeInOut((t - tP) / 0.7)} o={clamp01((12.5 - t) / 0.3)} color="#FF7A4D" />
			<PinLabel text="Hilo" x={hilo.x} y={hilo.y} t0={W(24) - 0.05} t1={12.2} size={54} ring="#FF6A4D" ringR={34} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- HAWAII A close (12.3 – 14.9): the plan → the raid
// Same flow, close on its source (hawaii_vent detail): three target reticles fade in («The plan?»), the real bomber
// cut-outs cross and drop on exactly those targets («Bombers.»); label 27 Dec 1935 (the voice gives no date).
// The planes fly left → right, so the leftmost target is hit first: the lead (small) plane bombs the left target, the
// second the middle one, the big one the right one. The bombs land on «Bombers.» (13.85 / 14.0 / 14.15 s), so fire and a
// smoke column read before the dissolve to Patton at 14.5 (events.ts «raidHits» should follow: dt −0.65, +0.15, +0.30).
const RAID_DROPS: (Drop & {pass: number})[] = [
	// on screen bombs[1] is the left target, bombs[2] the middle, bombs[0] the right one (Blender raid: track hit0/1/2 at
	// x ≈ 150 / 356 / 489, y ≈ 970–1010; the three.js raid had them at x ≈ 300 / 500 / 640)
	{tr: W(27) + 0.04, ti: W(28) - 0.65, at: H.bombs[1], pass: 2},
	{tr: W(27) + 0.19, ti: W(28) - 0.5, at: H.bombs[2], pass: 1},
	{tr: W(27) + 0.34, ti: W(28) - 0.35, at: H.bombs[0], pass: 0},
];
const RAID_KEYS: CK[] = [
	{t: 12.3, ll: [19.5885, -155.492], az: -73, el: 41, dist: 6.2, fov: 40},
	{t: 14.9, ll: [19.5885, -155.492], az: -68, el: 37, dist: 5.0, fov: 40},
];

/** flat target reticles (no text): fade + scale 0.92 → 1 in, each fades out when its bomb lands */
const Reticles: React.FC<{pts: {x: number; y: number}[]; t0: number; outs: number[]}> = ({pts, t0, outs}) => {
	const t = useT();
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
			{pts.map((p, i) => {
				const ti = t0 + i * 0.14;
				const k = easeOut((t - ti) / 0.45);
				const o = k * clamp01((outs[i] + 0.05 - t) / 0.25);
				if (o <= 0 || !Number.isFinite(p.x)) return null;
				const R = 40 * lerp(0.92, 1, k);
				const tick = (a: number) => {
					const c = Math.cos(a);
					const s = Math.sin(a);
					return <line key={a} x1={p.x + c * (R - 9)} y1={p.y + s * (R - 9)} x2={p.x + c * (R + 13)} y2={p.y + s * (R + 13)} stroke="#fff" strokeWidth={4} strokeLinecap="round" />;
				};
				return (
					<g key={i} opacity={o} style={{filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))'}}>
						<circle cx={p.x} cy={p.y} r={R} fill="rgba(255,46,136,0.12)" stroke="#fff" strokeWidth={4} />
						{[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map(tick)}
						<circle cx={p.x} cy={p.y} r={6} fill="#FF2E88" stroke="#fff" strokeWidth={2} />
					</g>
				);
			})}
		</svg>
	);
};

/** the raid close-up was the darkest, dullest stretch (muddy violet-brown with expo 1.95 + violet ambient): a warmer, higher
 *  key light (less grazing → less crinkly micro-shadow) and a warm-neutral ambient instead of more exposure */
const RAID_LOOK: Partial<Look> = {sunDir: [-0.6, 0.5, 0.3], sunI: 3.4, sunCol: '#ffb37a', groundCol: '#33212c', skyCol: '#5f86b8', ambI: 1.3, expo: 1.35, saturation: 1.2, contrast: 1.0, fogCol: '#a06a78'};
/** Hilo town (the anchor dot sits on the town south of the bayfront, not on the water of Hilo Bay) */
const HILO_TOWN: LL = [19.712, -155.078];

/**
 * The raid's DOM layer (shared by the Blender and the three.js raid): target reticles on «The plan?», the three real bomber
 * cut-outs on «Bombers.» dropping on exactly those targets, the bomber credit and the date the voice does not say.
 * `tg` = screen points of the three targets in RAID_DROPS order (left, middle, right); `smallX` = the lead plane's start x.
 */
const RaidOverlay: React.FC<{tg: XY[]; smallX: number}> = ({tg, smallX}) => {
	const T0 = W(27) - 0.36;
	const T1 = 14.95;
	// an echelon (big high, right middle, small low and leading) that never overlaps; all three start fully outside the frame
	// (half sprite width + rotation margin) and cross at the same 750 px/s
	const passes: Pass[] = [
		// (review 18.10) all three 50 px higher: the lead plane (belly ≈ y 930 before) covered the top ticks of the middle and
		// right reticles at 13.66–13.95 s and its bomb fell only ~90 px; now every bomb falls ≥ 140 px onto a clear reticle
		{spr: 'big', t0: T0, t1: T1, a: [-260, 490], b: [1240, 450], s: 0.42, rot: 2},
		{spr: 'right', t0: T0, t1: T1, a: [-360, 690], b: [1140, 660], s: 0.38, rot: 2},
		{spr: 'small', t0: T0, t1: T1, a: [smallX, 830], b: [smallX + 1500, 800], s: 0.42, rot: 1},
	];
	return (
		<>
			{/* the reticles start once the wide shot has mostly dissolved away (12.3–12.7) */}
			<Reticles pts={tg} t0={W(25) + 0.3} outs={RAID_DROPS.map((d) => d.ti)} />
			{/* the bomber credit is gone (fade 14.40–14.70) before PattonReveal's photo credit fades in at the same spot */}
			<Cutouts passes={passes} drops={RAID_DROPS.map((d, i) => ({pass: d.pass, tr: d.tr, ti: d.ti, to: tg[i]}))} credit={[T0 + 0.1, W(28) + 0.2]} />
			{/* clear of the big plane: its top is ≥ y 317 (sway + rotation included) while the label shows (13.41 – 14.6 s) */}
			<Label text="27 Dec 1935" x={540} y={284} t0={W(27) + 0.1} t1={W(28) - 0.2} size={52} />
		</>
	);
};

// Blender raid (tools/blender/hawaii_raid.py, 12.3 – 14.95 s): seen from WSW of the channel (az −76 → −71, close to Hawaii
// A's end view) with a slow push-in: the vent with its fountain and sideways-drifting plume on the right, the river running
// left through the three targets. The three blasts (fireball → dark smoke) go off in the render at 13.85 / 14.0 / 14.15 s
// (f_0094 / f_0103 / f_0112 = RAID_DROPS[i].ti), then the camera eases back a little. The targets sit further left than in
// the three.js raid, so the lead (small) plane comes in 60 px further back: its bomb still falls forward onto the left
// target instead of straight down (or back).
const RaidBlender: React.FC = () => {
	const t = useT();
	const tg = ['hit0', 'hit1', 'hit2'].map((k) => tp(TR_RAID, t, k));
	return (
		<AbsoluteFill>
			<Seq dir="blender/hawaii_raid" tr={TR_RAID} />
			<RaidOverlay tg={tg} smallX={-220} />
		</AbsoluteFill>
	);
};

/** Hawaii A: the island → flow → Hilo shot, or (`close`) the raid on the channel near its source */
export const Hawaii3DA: React.FC<{close?: boolean}> = ({close}) => {
	if (close) return BLENDER_RAID ? <RaidBlender /> : <HawaiiA3D close />;
	return BLENDER_A ? <ABlender /> : <HawaiiA3D />;
};

const HawaiiA3D: React.FC<{close?: boolean}> = ({close}) => {
	const t = useT();
	// the far view's haze and near plane follow the real camera distance of this frame
	const dist = close ? 0 : pathDist(A_KEYS, t, A_END);
	return (
		<Scene3D
			region={close ? 'hawaii_vent' : 'hawaii_flow'}
			wide={close ? ['hawaii_flow', 'hawaii'] : ['hawaii']}
			look="hawaii"
			skyOverride={SEA_SKY}
			lookOverride={close ? RAID_LOOK : lookFar(dist)}
			near={close ? undefined : nearFor(dist)}
			cam={(r, tt) => {
				if (!close) return orbit(hawaiiACam(r, tt));
				const o = camPath(r, RAID_KEYS, tt, [0.8, 0.8]);
				return orbit({...o, dist: o.dist * push(tt, RAID_DROPS[0].ti, 0.025)});
			}}
			lava={(_r, tt) => lavaA(tt)}
			post={{bloom: 1.25, threshold: 0.8}}
			children={(r, tt) => {
				if (!close) return null;
				// no ground shockwave rings here: on the slope the terrain hid half of each ring (white «C» arcs)
				const bl = blasts(r, RAID_DROPS, tt, 0.1, 0.04);
				const V = r.at(H.bombs[2][0], H.bombs[2][1]);
				return (
					<>
						<Billboards max={700} items={[...bl.add, ...embers(tt, V, {n: 160, spread: 0.8, rise: 0.4, size: 0.016, seed: 4})]} />
						<Billboards max={200} blending="normal" items={bl.norm} renderOrder={4} />
					</>
				);
			}}
			overlay={(r, cam, tt) => {
				if (!close) {
					const summit = P(cam, r.at(H.summit[0], H.summit[1]));
					const hilo = P(cam, r.at(HILO_TOWN[0], HILO_TOWN[1]));
					const fl = along(ML_PATH, lavaProgA(tt) / 0.97);
					const front = P(cam, r.at(fl[0], fl[1]));
					const tP = W(22) - 0.1; // «toward»
					return (
						<>
							<PinLabel text="Mauna Loa" x={summit.x} y={summit.y} t0={8.75} t1={9.5} size={52} />
							{/* the arrow leaves together with the Hilo label (gone by 12.5), so it never crosses the raid's reticles */}
							<PathLine a={front} b={hilo} k={easeInOut((tt - tP) / 0.7)} o={clamp01((12.5 - tt) / 0.3)} color="#FF7A4D" />
							<PinLabel text="Hilo" x={hilo.x} y={hilo.y} t0={W(24) - 0.05} t1={12.2} size={54} ring="#FF6A4D" ringR={34} />
						</>
					);
				}
				return <RaidOverlay tg={RAID_DROPS.map((d) => P(cam, r.at(d.at[0], d.at[1])))} smallX={-160} />;
			}}
		/>
	);
};

// ---------------------------------------------------------------- HAWAII B (17.07 – 21.3): six days later → the lava stops
// Continuing the same direction: glide down the flow to its front, which cools and stalls («the lava stops»: label with the
// exact date the voice does not say), then a slow rise over the stopped flow («Victory?» — no headline, no confetti).
const B_KEYS: CK[] = [
	{t: 17.07, ll: [19.68, -155.39], az: -56, el: 47, dist: 27, fov: 40},
	{t: 18.9, ll: [H.front[0], H.front[1]], az: -62, el: 40, dist: 16.5, fov: 40},
	{t: 21.3, ll: [19.699, -155.336], az: -67, el: 42, dist: 21, fov: 40},
];

/** the stopped flow kept its colour: a little more saturation and light so the shot is not the dull one of the section */
const B_LOOK: Partial<Look> = {saturation: 1.4, expo: 1.15};

// Blender Hawaii B (tools/blender/hawaii_b.py, 17.07 – 21.32 s): a glide down the orange, rippled flow to its front at the
// forest edge, Hilo top right. The front halts at ~18.8 s («stops», ripples freeze), crust grows from the edges inward
// (18.2–21.2: dark plates, red seams), white steam rises from the hot lobe just behind the stopped tip from 18.0 s and drifts
// right — all in the render (the three.js steam and embers are gone). The date label's dot sits on the tracked stopped tip,
// its leader and text up-left over the trees; the steam keeps ≥ 39 px clear of dot and leader. The KeyFact «6 days later»
// (Short.tsx) sits at the top, below-left of Hilo (x ≈ 900, y 260–290).
const BBlender: React.FC = () => {
	const t = useT();
	const front = tp(TR_B, t, 'front');
	return (
		<AbsoluteFill>
			<Seq dir="blender/hawaii_b" tr={TR_B} />
			<PinLabel text="2 Jan 1936" x={front.x} y={front.y} dx={-170} dy={-100} t0={W(36) - 0.05} t1={W(39) - 0.4} size={52} />
		</AbsoluteFill>
	);
};

export const Hawaii3DB: React.FC = () => (BLENDER_B ? <BBlender /> : <HawaiiB3D />);

const HawaiiB3D: React.FC = () => {
	const t = useT();
	const dist = pathDist(B_KEYS, t, [0.7, 0.7]);
	return (
		<Scene3D
			region="hawaii_flow"
			wide={['hawaii']}
			look="hawaii"
			skyOverride={SEA_SKY}
			lookOverride={B_LOOK}
			near={nearFor(dist)}
			cam={(r, tt) => orbit(camPath(r, B_KEYS, tt, [0.7, 0.7]))}
			lava={(_r, tt) => {
				// «the lava stops»: the flow dims over ~2.4 s to a dull ember glow. It dims through its own orange (gain), not through
				// the ramp's crimson (a high `cool` drives the far-LOD heat through 0.15–0.35 = flat maroon «blood river», then black)
				const k = easeInOut((tt - W(36) + 0.1) / 2.4);
				return {prog: [lerp(0.87, 1.0, easeInOut((tt - W(32)) / 1.3)), 0, 0], cool: [0.15 * k, 0, 0], gain: lerp(1.15, 0.22, k), noise: 70, thick: 0.01};
			}}
			post={{bloom: 1.2, threshold: 0.8}}
			children={(r, tt) => {
				const F = r.at(H.front[0], H.front[1]);
				// a soft wisp of steam where the front stalls: fewer, larger, fainter puffs that overlap into one veil (small dense
				// puffs read as separate grey cotton balls); it drifts to screen-right, away from the date label up-left of the front
				const steam = tt > W(36) - 0.2 ? plume(tt, F, {n: 30, rise: 0.8, spread: 0.22, size: 0.3, grow: 2.2, seed: 40, color: [0.82, 0.8, 0.86], alpha: 0.07 * clamp01((tt - W(36) + 0.2) / 0.9), wind: [0.16, 0], startAt: W(36) - 0.2}) : [];
				return (
					<>
						<Billboards max={48} blending="normal" items={steam} renderOrder={4} />
						<Billboards max={60} items={embers(tt, F, {n: 40, spread: 0.5, rise: 0.25, size: 0.02, seed: 8, hot: 1 - clamp01((tt - W(36)) / 1.2)})} />
					</>
				);
			}}
			overlay={(r, cam) => {
				const front = P(cam, r.at(H.front[0], H.front[1]));
				// one-shot ring (no repeat on «Victory?»); the text sits up-left of the front over the green slope, the steam drifts
				// up-right, so the two never meet
				return <PinLabel text="2 Jan 1936" x={front.x} y={front.y} dx={-170} dy={-100} t0={W(36) - 0.05} t1={W(39) - 0.4} size={52} />;
			}}
		/>
	);
};
