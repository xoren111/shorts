import React, {createContext, useContext, useId, useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {evolvePath, getLength, parsePath, reduceInstructions} from '@remotion/paths';
import {HEAD, MONT} from '../fonts';
import {PAL} from '../theme';
import {GOLD, INK, clamp01, easeInOut, easeOut, lerp, useT} from './gfx';

/**
 * Animated maps (channel look «A · Экспедиция»): data from tools/make_map.py → data/maps/<name>.json, drawn as SVG.
 *
 *   import lisbonRio from '../data/maps/demo_lisbon_rio.json';
 *   const MAP = asMap(lisbonRio);
 *   const ROUTE = routePath(MAP, ['Lisboa', {lon: -27, lat: 12}, 'Rio de Janeiro'], {mode: 'smooth'});
 *   <MapCamera map={MAP} keys={[{t: W(3), at: 'Lisboa', zoom: 2.2}, {t: W(9), at: 'Rio de Janeiro', zoom: 2}]}>
 *     <MapBase look="chart" />
 *     <RegionFill id="BRA" t0={W(8)} reveal="grow" from="Rio de Janeiro" />
 *     <MapRoute d={ROUTE} t0={W(4)} dur={2.4} dashed />
 *     <MovingToken d={ROUTE} t0={W(4)} dur={2.4} kind="ship" />
 *     <PinPop at="Lisboa" t0={W(3)} text="Lisboa" />
 *   </MapCamera>
 *
 * Everything inside <MapCamera> is SVG in map units (= screen px at zoom 1). Strokes, tokens, pins and labels keep their SCREEN
 * size while the camera zooms (they divide by the zoom k from the context). Times are absolute seconds (useT), like the rest
 * of the kit. Rules (standard): text white + gold, straight, ink outline + dark scrim (T3–T5, T9); labels stay inside the safe
 * zone x 48–887 and above the subtitle band (PinPop places itself); maps are never the main shot in 0–3 s and in the hook only
 * with live action on them (R4: MovingToken / AdvanceArrow), never on frame 0 (H1); historical stories need period borders (make_map.py --geojson;
 * tools/map_check.py warns on modern borders); ONE calm caption at a time besides the subtitle (T7).
 */

// ---------------------------------------------------------------- data

export type XY = [number, number];
export type LonLat = {lon: number; lat: number};
/** a place: a point name from the map JSON (make_map.py --point), map px [x, y], or {lon, lat} */
export type Pt = string | XY | LonLat;
export type MapProj = {kind: 'merc' | 'eqc' | 'laea'; lon0: number; lat0: number; k: number; x0: number; y0: number};
export type MapRegion = {id: string; name: string; src: 'ne' | 'geojson'; d: string; c: XY; box: [number, number, number, number]; area: number; clip?: 'land'; year?: number | null; file?: string};
export type MapPoint = {x: number; y: number; lon: number; lat: number};
export type MapPeriod = {borders: 'modern' | 'historical' | 'mixed' | 'none'; political: boolean; year: number | null; note: string; warning?: string};
export type MapData = {
	version: number;
	name: string;
	frame: XY;
	proj: MapProj;
	view: {focus: XY; fitbox: number[]; clip: number[]; bbox: number[]; safe: number[]; zoom_max: number};
	period: MapPeriod;
	sources: {what: string; source: string; license: string; period: string}[];
	land: string;
	coast: string;
	lakes: string;
	graticule: string;
	rivers: {name: string; r: number; d: string}[];
	regions: MapRegion[];
	points: Record<string, MapPoint>;
};

/** typed view of an imported map JSON (checks that it comes from tools/make_map.py) */
export const asMap = (json: unknown): MapData => {
	const m = json as MapData;
	if (!m || m.version !== 1 || !m.proj || typeof m.land !== 'string') throw new Error('asMap: not a tools/make_map.py map (data/maps/<name>.json, version 1)');
	return m;
};

// ---------------------------------------------------------------- projection (same formulas as tools/make_map.py Proj)

const D2R = Math.PI / 180;
const wrap180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

const unit = (p: MapProj, rl: number, lat: number): XY => {
	const lam = rl * D2R;
	if (p.kind === 'merc') {
		const phi = Math.max(-85, Math.min(85, lat)) * D2R;
		return [lam, -Math.log(Math.tan(Math.PI / 4 + phi / 2))];
	}
	const phi = Math.max(-89.999, Math.min(89.999, lat)) * D2R;
	if (p.kind === 'eqc') return [lam * Math.cos(p.lat0 * D2R), -phi];
	const p0 = p.lat0 * D2R;
	const c = 1 + Math.sin(p0) * Math.sin(phi) + Math.cos(p0) * Math.cos(phi) * Math.cos(lam);
	const kk = Math.sqrt(2 / Math.max(c, 1e-12));
	return [kk * Math.cos(phi) * Math.sin(lam), -kk * (Math.cos(p0) * Math.sin(phi) - Math.sin(p0) * Math.cos(phi) * Math.cos(lam))];
};

/** lon/lat (degrees) → map px; `near` = a relative longitude to stay continuous with (lines across the antimeridian) */
export const project = (map: MapData, lon: number, lat: number, near?: number): XY => {
	let rl = wrap180(lon - map.proj.lon0);
	if (near !== undefined) rl += Math.round((near - rl) / 360) * 360;
	const [fx, fy] = unit(map.proj, rl, lat);
	return [map.proj.x0 + map.proj.k * fx, map.proj.y0 + map.proj.k * fy];
};

/** a lon/lat line → map px, continuous across the antimeridian */
export const projectLine = (map: MapData, ll: [number, number][]): XY[] => {
	let prev: number | undefined;
	return ll.map(([lon, lat]) => {
		let rl = wrap180(lon - map.proj.lon0);
		if (prev !== undefined) rl += Math.round((prev - rl) / 360) * 360;
		prev = rl;
		const [fx, fy] = unit(map.proj, rl, lat);
		return [map.proj.x0 + map.proj.k * fx, map.proj.y0 + map.proj.k * fy] as XY;
	});
};

const isXY = (p: Pt): p is XY => Array.isArray(p);
const isLL = (p: Pt): p is LonLat => typeof p === 'object' && !Array.isArray(p);

/** lon/lat of a place when known (named points and {lon, lat}); null for raw map px */
export const lonLatOf = (map: MapData, p: Pt): [number, number] | null => {
	if (isLL(p)) return [p.lon, p.lat];
	if (typeof p === 'string') {
		const q = map.points[p];
		if (!q) throw new Error(`map «${map.name}»: no point «${p}» — add it: python3 tools/make_map.py --spec data/maps/${map.name}.spec.json --point "${p}=LON,LAT"`);
		return [q.lon, q.lat];
	}
	return null;
};

/** a place → map px */
export const resolvePt = (map: MapData, p: Pt): XY => {
	if (isXY(p)) return p;
	if (typeof p === 'string') {
		const q = map.points[p];
		if (!q) throw new Error(`map «${map.name}»: no point «${p}» — add it: python3 tools/make_map.py --spec data/maps/${map.name}.spec.json --point "${p}=LON,LAT"`);
		return [q.x, q.y];
	}
	return project(map, p.lon, p.lat);
};

/** great-circle points between two lon/lat places (slerp), n + 1 samples */
export const greatCircle = (a: [number, number], b: [number, number], n = 64): [number, number][] => {
	const v = ([lon, lat]: [number, number]) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R)];
	const A = v(a), B = v(b);
	const dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
	const w = Math.acos(dot);
	if (w < 1e-9) return [a, b];
	const out: [number, number][] = [];
	for (let i = 0; i <= n; i++) {
		const s = i / n;
		const ka = Math.sin((1 - s) * w) / Math.sin(w), kb = Math.sin(s * w) / Math.sin(w);
		const x = ka * A[0] + kb * B[0], y = ka * A[1] + kb * B[1], z = ka * A[2] + kb * B[2];
		out.push([Math.atan2(y, x) / D2R, Math.atan2(z, Math.hypot(x, y)) / D2R]);
	}
	return out;
};

const f1 = (v: number) => Math.round(v * 10) / 10;
const polyD = (pts: XY[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])},${f1(p[1])}`).join('');

export type RouteOpts = {
	/** great = great circle per leg (needs lon/lat: named points or {lon, lat}); line = straight per leg; smooth = one Catmull-Rom
	 *  curve through all stops (sea routes: put waypoints off the coast) */
	mode?: 'great' | 'line' | 'smooth';
	/** sideways arc per leg as a fraction of its length (+ left of travel, − right): flight look on flat maps */
	bend?: number;
};

/** SVG path (map px) through 2+ places — for MapRoute, MovingToken, AdvanceArrow */
export const routePath = (map: MapData, stops: Pt[], opts: RouteOpts = {}): string => {
	const {mode = 'great', bend = 0} = opts;
	if (stops.length < 2) throw new Error('routePath: at least 2 stops');
	const P = stops.map((s) => resolvePt(map, s));
	if (mode === 'smooth') {
		const Q = [P[0], ...P, P[P.length - 1]];
		let d = `M${f1(P[0][0])},${f1(P[0][1])}`;
		for (let i = 1; i < Q.length - 2; i++) {
			const [p0, p1, p2, p3] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
			const c1: XY = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
			const c2: XY = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
			d += `C${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(p2[0])},${f1(p2[1])}`;
		}
		return d;
	}
	const pts: XY[] = [P[0]];
	for (let i = 0; i < P.length - 1; i++) {
		const a = lonLatOf(map, stops[i]), b = lonLatOf(map, stops[i + 1]);
		let leg: XY[];
		if (mode === 'great' && a && b) {
			const ll = greatCircle(a, b, 64);
			leg = projectLine(map, ll);
		} else {
			leg = Array.from({length: 33}, (_, k) => [lerp(P[i][0], P[i + 1][0], k / 32), lerp(P[i][1], P[i + 1][1], k / 32)] as XY);
		}
		if (bend) {
			const [x0, y0] = leg[0], [x1, y1] = leg[leg.length - 1];
			const L = Math.hypot(x1 - x0, y1 - y0) || 1;
			const nx = (y1 - y0) / L, ny = -(x1 - x0) / L;
			leg = leg.map(([x, y], k) => {
				const s = Math.sin((Math.PI * k) / (leg.length - 1)) * bend * L;
				return [x + nx * s, y + ny * s] as XY;
			});
		}
		pts.push(...leg.slice(1));
	}
	return polyD(pts);
};

// ---------------------------------------------------------------- path geometry (flattened once per d, cached)

type Poly = {x: number[]; y: number[]; s: number[]; L: number};
const POLY = new Map<string, Poly>();

/** a path flattened to a polyline with cumulative length (M jumps cost 0 length) */
export const polyOf = (d: string): Poly => {
	const hit = POLY.get(d);
	if (hit) return hit;
	const ins = reduceInstructions(parsePath(d));
	const x: number[] = [], y: number[] = [], s: number[] = [];
	let acc = 0, cx = 0, cy = 0, sx = 0, sy = 0;
	const push = (px: number, py: number, jump = false) => {
		if (x.length && !jump) acc += Math.hypot(px - x[x.length - 1], py - y[y.length - 1]);
		x.push(px);
		y.push(py);
		s.push(acc);
	};
	for (const i of ins) {
		if (i.type === 'M') {
			push(i.x, i.y, true);
			cx = sx = i.x;
			cy = sy = i.y;
		} else if (i.type === 'L') {
			push(i.x, i.y);
			cx = i.x;
			cy = i.y;
		} else if (i.type === 'C') {
			const n = Math.max(4, Math.min(48, Math.ceil(Math.hypot(i.x - cx, i.y - cy) / 3)));
			for (let k = 1; k <= n; k++) {
				const u = k / n, v = 1 - u;
				push(v * v * v * cx + 3 * v * v * u * i.cp1x + 3 * v * u * u * i.cp2x + u * u * u * i.x, v * v * v * cy + 3 * v * v * u * i.cp1y + 3 * v * u * u * i.cp2y + u * u * u * i.y);
			}
			cx = i.x;
			cy = i.y;
		} else if (i.type === 'Z') {
			push(sx, sy);
			cx = sx;
			cy = sy;
		}
	}
	const poly = {x, y, s, L: acc};
	if (POLY.size > 200) POLY.clear();
	POLY.set(d, poly);
	return poly;
};

const seek = (p: Poly, len: number) => {
	let lo = 0, hi = p.s.length - 1;
	while (hi - lo > 1) {
		const m = (lo + hi) >> 1;
		if (p.s[m] <= len) lo = m;
		else hi = m;
	}
	return lo;
};

/** point at arc length `len` (clamped) */
export const pointAt = (p: Poly, len: number): XY => {
	if (p.x.length === 1) return [p.x[0], p.y[0]];
	const l = Math.max(0, Math.min(p.L, len));
	const i = seek(p, l);
	const ds = p.s[i + 1] - p.s[i];
	const u = ds > 1e-9 ? (l - p.s[i]) / ds : 1;
	return [lerp(p.x[i], p.x[i + 1], u), lerp(p.y[i], p.y[i + 1], u)];
};

/** heading (radians, screen y down) at `len`, smoothed over ±span */
export const headingAt = (p: Poly, len: number, span = 8): number => {
	const a = pointAt(p, Math.min(len - span, p.L - 2 * span));
	const b = pointAt(p, Math.max(len + span, 2 * span));
	return Math.atan2(b[1] - a[1], b[0] - a[0]);
};

/** the stretch [s0, s1] of the polyline as an SVG path */
export const slicePath = (p: Poly, s0: number, s1: number): string => {
	const a = Math.max(0, Math.min(p.L, s0)), b = Math.max(a, Math.min(p.L, s1));
	const pts: XY[] = [pointAt(p, a)];
	for (let i = seek(p, a) + 1; i < p.s.length && p.s[i] < b; i++) pts.push([p.x[i], p.y[i]]);
	pts.push(pointAt(p, b));
	return polyD(pts);
};

// ---------------------------------------------------------------- camera

type MapCtxT = {map: MapData; k: number; c: XY; focus: XY; uid: string; toScreen: (p: XY) => XY; toWorld: (p: XY) => XY};
const MapCtx = createContext<MapCtxT | null>(null);

/** the map + camera of the enclosing <MapCamera> (throws outside one) */
export const useMap = (): MapCtxT => {
	const c = useContext(MapCtx);
	if (!c) throw new Error('map components must sit inside <MapCamera map={…}>');
	return c;
};

/** camera key: at time t put `at` at the focus with `zoom`; ease / flight apply to the move FROM this key to the next one;
 *  `kick` = impact at t (zoom punch that springs back in ~0.5 s, e.g. 0.08 on an arrival / a stressed word) */
export type CamKey = {t: number; at?: Pt; zoom?: number; ease?: (x: number) => number; flight?: boolean; kick?: number};

const linear = (x: number) => x;

/**
 * Camera keys that follow a token along `d` (same t0 / dur / ease as its MovingToken), n samples joined linearly so the move
 * stays smooth; zoom = number or a function of the token's progress u (e.g. u => 2.2 - 0.9 * Math.sin(Math.PI * u) to pull
 * out mid-way). `lead` (0–0.2) aims the camera a little ahead of the token.
 */
export const trackKeys = (d: string, t0: number, dur: number, zoom: number | ((u: number) => number) = 1.6, n = 12, ease: (x: number) => number = easeInOut, lead = 0.04): CamKey[] => {
	const poly = polyOf(d);
	return Array.from({length: n + 1}, (_, i) => {
		const u = i / n;
		const s = poly.L * Math.min(1, ease(u) + lead * Math.sin(Math.PI * u));
		return {t: t0 + dur * u, at: pointAt(poly, s), zoom: typeof zoom === 'number' ? zoom : zoom(u), ease: linear, flight: false};
	});
};

/** van Wijk & Nuij smooth zoom+pan (zoom out on long pans, then in); w = visible width in map units */
const flightLerp = (c0: XY, w0: number, c1: XY, w1: number, u: number): [XY, number] => {
	const rho = Math.SQRT2, rho2 = 2, rho4 = 4;
	const dx = c1[0] - c0[0], dy = c1[1] - c0[1];
	const d2 = dx * dx + dy * dy, d1 = Math.sqrt(d2);
	if (d1 < 1e-6) {
		const S = Math.log(w1 / w0) / rho;
		return [c0, w0 * Math.exp(rho * u * S)];
	}
	const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
	const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
	const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
	const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
	const S = (r1 - r0) / rho;
	const s = u * S;
	const coshr0 = Math.cosh(r0);
	const q = (w0 / (rho2 * d1)) * (coshr0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
	return [[c0[0] + q * dx, c0[1] + q * dy], (w0 * coshr0) / Math.cosh(rho * s + r0)];
};

/**
 * Stage + camera for every map layer. keys: [{t, at, zoom}] (absolute seconds; `at` = place put at `focus`, zoom 1 = the
 * make_map.py frame). Between keys the camera eases (easeInOut); `flight` (default) uses the van Wijk zoom-out-and-in for long
 * pans. `drift` adds a slow push-in per second so the map never stands still (standard: nothing static > 2–3 s), counted from
 * `t0` (pass the scene's t0) or else from the first key.
 */
export const MapCamera: React.FC<{map: MapData; keys?: CamKey[]; t0?: number; flight?: boolean; drift?: number; focus?: XY; ease?: (x: number) => number; children?: React.ReactNode; style?: React.CSSProperties}> = ({
	map,
	keys = [],
	t0,
	flight = true,
	drift = 0.012,
	focus,
	ease = easeInOut,
	children,
	style,
}) => {
	const t = useT();
	const uid = 'm' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const F: XY = focus ?? map.view.focus;
	const ks = useMemo(() => {
		let at: XY = map.view.focus, z = 1;
		return [...keys].sort((a, b) => a.t - b.t).map((kf) => {
			if (kf.at !== undefined) at = resolvePt(map, kf.at);
			if (kf.zoom !== undefined) z = kf.zoom;
			return {t: kf.t, c: at, z, ease: kf.ease, flight: kf.flight};
		});
	}, [keys, map]);
	let c: XY = map.view.focus, z = 1;
	if (ks.length === 1 || (ks.length && t <= ks[0].t)) {
		c = ks[0].c;
		z = ks[0].z;
	} else if (ks.length) {
		const i = Math.max(0, ks.findIndex((kf, j) => j === ks.length - 1 || ks[j + 1].t > t));
		const a = ks[Math.min(i, ks.length - 1)], b = ks[Math.min(i + 1, ks.length - 1)];
		const u = b.t > a.t ? (a.ease ?? ease)(clamp01((t - a.t) / (b.t - a.t))) : 1;
		if ((a.flight ?? flight) && a !== b) {
			const [cc, w] = flightLerp(a.c, 1080 / a.z, b.c, 1080 / b.z, u);
			c = cc;
			z = 1080 / w;
		} else {
			c = [lerp(a.c[0], b.c[0], u), lerp(a.c[1], b.c[1], u)];
			z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), u));
		}
	}
	z *= 1 + drift * Math.max(0, t - (t0 ?? ks[0]?.t ?? t));
	for (const kf of keys) {
		if (!kf.kick || t < kf.t) continue;
		const e = t - kf.t;
		z *= 1 + kf.kick * Math.exp(-e * 7) * Math.cos(e * 16);
	}
	const tx = F[0] - c[0] * z, ty = F[1] - c[1] * z;
	const ctx: MapCtxT = {
		map,
		k: z,
		c,
		focus: F,
		uid,
		toScreen: ([x, y]) => [tx + x * z, ty + y * z],
		toWorld: ([x, y]) => [(x - tx) / z, (y - ty) / z],
	};
	return (
		<AbsoluteFill style={{overflow: 'hidden', ...style}}>
			<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0}}>
				<g transform={`translate(${tx} ${ty}) scale(${z})`}>
					<MapCtx.Provider value={ctx}>{children}</MapCtx.Provider>
				</g>
			</svg>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- base map

export type MapLook = 'chart' | 'night' | 'parchment';
type LookDef = {seaTop: string; seaBottom: string; glow: string; land: string; coast: string; border: string; grid: string; ring: string; lake: string; river: string; vignette: number};
export const LOOKS: Record<MapLook, LookDef> = {
	// sea-chart navy + parchment land + teal depth rings (T15: navy ground, parchment cards, teal sea/maps)
	chart: {seaTop: PAL.navy2, seaBottom: PAL.navy, glow: PAL.teal, land: PAL.parchment, coast: INK, border: '#8C7556', grid: 'rgba(239,227,200,0.12)', ring: PAL.teal, lake: PAL.navy2, river: PAL.teal, vignette: 0.45},
	// dramatic: navy land on a black-blue sea, teal coast
	night: {seaTop: '#0B1A2C', seaBottom: '#050B14', glow: '#1E5F73', land: '#1B3655', coast: '#7FD6CC', border: 'rgba(127,214,204,0.55)', grid: 'rgba(127,214,204,0.10)', ring: PAL.teal, lake: '#0B1A2C', river: '#4FB3A9', vignette: 0.55},
	// old-map look for history Shorts: tan sea, parchment land, sepia ink
	parchment: {seaTop: '#D9C7A0', seaBottom: '#BFA77A', glow: '#F3E7C9', land: PAL.parchment, coast: '#3B2A1A', border: '#8C7556', grid: 'rgba(59,42,26,0.16)', ring: '#8C7556', lake: '#CDB98F', river: '#7A9E96', vignette: 0.4},
};

/**
 * Sea, graticule, depth rings, land, lakes, rivers, country borders, coast and a vignette, in that order. Draw it first inside
 * <MapCamera>. `borders`: country / period outlines from map.regions (dashed by default; false for a physical map).
 */
export const MapBase: React.FC<{look?: MapLook; borders?: boolean | 'solid'; graticule?: boolean; rings?: boolean; rivers?: boolean | string[]; waves?: boolean; vignette?: number}> = ({
	look = 'chart',
	borders = true,
	graticule = true,
	rings = true,
	rivers = true,
	waves = true,
	vignette,
}) => {
	const t = useT();
	const {map, k, uid, toWorld} = useMap();
	const L = LOOKS[look];
	const [sx0, sy0] = toWorld([0, 0]);
	const [sx1, sy1] = toWorld([1080, 1920]);
	const [gx, gy] = useMap().focus;
	const borderD = useMemo(() => map.regions.map((r) => r.d).join(' '), [map]);
	const coastD = map.coast || map.land;
	const riv = rivers === true ? map.rivers : rivers ? map.rivers.filter((r) => (rivers as string[]).includes(r.name)) : [];
	const vig = vignette ?? L.vignette;
	return (
		<g>
			<defs>
				<linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={L.seaTop} />
					<stop offset="1" stopColor={L.seaBottom} />
				</linearGradient>
				<radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stopColor={L.glow} stopOpacity={0.35} />
					<stop offset="1" stopColor={L.glow} stopOpacity={0} />
				</radialGradient>
				<radialGradient id={`${uid}-vig`} cx="0.5" cy="0.46" r="0.75">
					<stop offset="0.55" stopColor="#000" stopOpacity={0} />
					<stop offset="1" stopColor="#000" stopOpacity={vig} />
				</radialGradient>
				<clipPath id={`${uid}-land`}>
					<path d={map.land} clipRule="evenodd" />
				</clipPath>
				{/* engraved-chart sea: rows of small wave marks drifting east (screen size, the sea never stands still) */}
				<pattern id={`${uid}-wv`} patternUnits="userSpaceOnUse" width={120 / k} height={64 / k} patternTransform={`translate(${(t * 14) / k} ${Math.sin(t * 0.9) * (4 / k)})`}>
					<path d={`M${8 / k},${20 / k} q${9 / k},${-8 / k} ${18 / k},0 t${18 / k},0 M${68 / k},${52 / k} q${9 / k},${-8 / k} ${18 / k},0 t${18 / k},0`} fill="none" stroke={L.glow} strokeOpacity={0.5} strokeWidth={2.2 / k} strokeLinecap="round" />
				</pattern>
			</defs>
			<rect x={sx0} y={sy0} width={sx1 - sx0} height={sy1 - sy0} fill={`url(#${uid}-sea)`} />
			<ellipse cx={toWorld([gx, gy])[0]} cy={toWorld([gx, gy])[1]} rx={900 / k} ry={1100 / k} fill={`url(#${uid}-glow)`} />
			{waves ? <rect x={sx0} y={sy0} width={sx1 - sx0} height={sy1 - sy0} fill={`url(#${uid}-wv)`} opacity={look === 'parchment' ? 0.5 : 0.35} /> : null}
			{graticule && map.graticule ? <path d={map.graticule} fill="none" stroke={L.grid} strokeWidth={1.6 / k} /> : null}
			{rings
				? [
						[44, 0.06],
						[24, 0.1],
						[10, 0.2],
					].map(([w, o]) => <path key={w} d={coastD} fill="none" stroke={L.ring} strokeOpacity={o} strokeWidth={w / k} strokeLinejoin="round" />)
				: null}
			<path d={map.land} fill={L.land} fillRule="evenodd" />
			{map.lakes ? <path d={map.lakes} fill={L.lake} fillRule="evenodd" stroke={L.coast} strokeWidth={1.4 / k} strokeOpacity={0.7} /> : null}
			{riv.map((r) => (
				<path key={r.name + r.d.length} d={r.d} fill="none" stroke={L.river} strokeWidth={(r.r <= 3 ? 2.6 : 1.8) / k} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
			))}
			{borders && borderD ? (
				<path d={borderD} fill="none" stroke={L.border} strokeWidth={2.2 / k} strokeDasharray={borders === 'solid' ? undefined : `${9 / k} ${6 / k}`} strokeLinejoin="round" opacity={0.85} />
			) : null}
			<path d={coastD} fill="none" stroke={L.coast} strokeWidth={2.6 / k} strokeLinejoin="round" />
			<rect x={sx0} y={sy0} width={sx1 - sx0} height={sy1 - sy0} fill={`url(#${uid}-vig)`} />
		</g>
	);
};

// ---------------------------------------------------------------- regions

/**
 * Animated highlight of one or more regions (ids from map.regions — Natural Earth ADM0_A3 or the GeoJSON ids make_map.py
 * printed) or of a raw path `d`. reveal: fade | wipe (direction `angle`, deg, 0 = left → right) | grow (circle from `from`,
 * default the region's label point). `hatch` = diagonal stripes (claims, occupation); period regions (src geojson) are clipped
 * to the modern land automatically (their sources have coarse coasts).
 */
export const RegionFill: React.FC<{
	id?: string | string[];
	d?: string;
	t0: number;
	dur?: number;
	t1?: number;
	reveal?: 'fade' | 'wipe' | 'grow';
	from?: Pt;
	angle?: number;
	color?: string;
	opacity?: number;
	hatch?: boolean;
	outline?: boolean;
	pulse?: boolean;
	clipLand?: boolean;
}> = ({id, d, t0, dur = 0.6, t1 = Infinity, reveal = 'grow', from, angle = 0, color = PAL.orange, opacity = 0.5, hatch = false, outline = true, pulse = true, clipLand}) => {
	const t = useT();
	const {map, k, uid} = useMap();
	const rid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
	const regs = useMemo(() => {
		const ids = id === undefined ? [] : Array.isArray(id) ? id : [id];
		return ids.map((x) => {
			const r = map.regions.find((q) => q.id === x);
			if (!r) throw new Error(`map «${map.name}»: no region «${x}» (have: ${map.regions.map((q) => q.id).slice(0, 40).join(', ')}…)`);
			return r;
		});
	}, [id, map]);
	if (t < t0 || t > t1 + 0.3) return null;
	const path = d ?? regs.map((r) => r.d).join(' ');
	const box: number[] = regs.length
		? regs.reduce<number[]>((b, r) => [Math.min(b[0], r.box[0]), Math.min(b[1], r.box[1]), Math.max(b[2], r.box[2]), Math.max(b[3], r.box[3])], [Infinity, Infinity, -Infinity, -Infinity])
		: [0, 0, 1080, 1920];
	const o0: XY = from !== undefined ? resolvePt(map, from) : regs[0]?.c ?? ([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] as XY);
	const p = easeOut(clamp01((t - t0) / dur));
	const out = clamp01((t1 + 0.3 - t) / 0.3);
	const R = Math.max(...[[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]].map(([x, y]) => Math.hypot(x - o0[0], y - o0[1]))) * 1.02;
	const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
	const D = Math.hypot(box[2] - box[0], box[3] - box[1]) / 2 + 4;
	const land = clipLand ?? regs.some((r) => r.clip === 'land');
	const glow = pulse ? 0.5 + 0.5 * Math.sin((t - t0) * Math.PI * 2 * 1.1) : 0;
	const revealClip = reveal === 'fade' ? undefined : `url(#${rid}-rv)`;
	const body = (
		<g opacity={(reveal === 'fade' ? p : 1) * out}>
			<defs>
				{reveal === 'grow' ? (
					<clipPath id={`${rid}-rv`}>
						<circle cx={o0[0]} cy={o0[1]} r={Math.max(0.01, R * p)} />
					</clipPath>
				) : reveal === 'wipe' ? (
					<clipPath id={`${rid}-rv`}>
						<rect x={cx - D} y={cy - D} width={Math.max(0.01, 2 * D * p)} height={2 * D} transform={`rotate(${angle} ${cx} ${cy})`} />
					</clipPath>
				) : null}
				{hatch ? (
					<pattern id={`${rid}-h`} patternUnits="userSpaceOnUse" width={18 / k} height={18 / k} patternTransform={`rotate(45)`}>
						<rect width={18 / k} height={18 / k} fill={color} fillOpacity={opacity * 0.35} />
						<rect width={7 / k} height={18 / k} fill={color} fillOpacity={Math.min(1, opacity * 1.6)} />
					</pattern>
				) : null}
			</defs>
			<g clipPath={revealClip}>
				<path d={path} fill={hatch ? `url(#${rid}-h)` : color} fillOpacity={hatch ? 1 : opacity} fillRule="evenodd" />
				{outline ? (
					<>
						{pulse ? <path d={path} fill="none" stroke={color} strokeOpacity={0.18 + 0.22 * glow} strokeWidth={(12 + 6 * glow) / k} strokeLinejoin="round" /> : null}
						<path d={path} fill="none" stroke={color} strokeWidth={4 / k} strokeLinejoin="round" />
					</>
				) : null}
			</g>
		</g>
	);
	return land ? <g clipPath={`url(#${uid}-land)`}>{body}</g> : body;
};

// ---------------------------------------------------------------- routes

/**
 * A route that draws itself (stroke-dashoffset via @remotion/paths evolvePath) from t0 over dur; `dashed` = ship / ferry style
 * (dash size in screen px), `tail` (screen px) = only a comet tail stays visible behind the tip. Fades out over 0.3 s at t1.
 */
export const MapRoute: React.FC<{
	d: string;
	t0: number;
	dur?: number;
	t1?: number;
	ease?: (x: number) => number;
	color?: string;
	width?: number;
	dashed?: boolean | [number, number];
	outline?: boolean;
	ghost?: number;
	head?: boolean;
	tail?: number;
}> = ({d, t0, dur = 1.2, t1 = Infinity, ease = easeInOut, color = PAL.orange, width = 8, dashed = false, outline = true, ghost = 0, head = true, tail}) => {
	const t = useT();
	const {k} = useMap();
	const L = useMemo(() => getLength(d), [d]);
	const poly = useMemo(() => polyOf(d), [d]);
	if (t > t1 + 0.3) return null;
	const out = clamp01((t1 + 0.3 - t) / 0.3);
	const p = ease(clamp01((t - t0) / dur));
	const ghostEl = ghost > 0 ? <path d={d} fill="none" stroke={color} strokeOpacity={ghost * out} strokeWidth={(width * 0.45) / k} strokeDasharray={`${4 / k} ${10 / k}`} strokeLinecap="round" /> : null;
	if (t < t0) return ghostEl;
	const w = width / k;
	const s1 = poly.L * p;
	const s0 = tail !== undefined ? Math.max(0, s1 - tail / k) : 0;
	const [hx, hy] = pointAt(poly, s1);
	let main: React.ReactNode;
	if (dashed) {
		const [a, b] = dashed === true ? [22, 14] : dashed;
		const seg = slicePath(poly, s0, s1);
		main = (
			<>
				{outline ? <path d={seg} fill="none" stroke={INK} strokeWidth={w + 6 / k} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${(a + 6) / k} ${Math.max(1, b - 6) / k}`} strokeDashoffset={s0 + 3 / k} opacity={0.85} /> : null}
				<path d={seg} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${a / k} ${b / k}`} strokeDashoffset={s0} />
			</>
		);
	} else {
		const ev = tail === undefined ? evolvePath(p, d) : {strokeDasharray: `${(s1 - s0) * (L / Math.max(poly.L, 1e-6))} ${L + 10}`, strokeDashoffset: -s0 * (L / Math.max(poly.L, 1e-6))};
		main = (
			<>
				{outline ? <path d={d} fill="none" stroke={INK} strokeWidth={w + 6 / k} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} opacity={0.85} /> : null}
				<path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
			</>
		);
	}
	const live = p > 0 && p < 1;
	return (
		<g opacity={out}>
			{ghostEl}
			{main}
			{head && p > 0 ? (
				<g transform={`translate(${hx} ${hy}) scale(${1 / k})`}>
					{live ? <circle r={width * 2.2} fill={color} opacity={0.25 + 0.1 * Math.sin(t * 18)} /> : null}
					<circle r={width * 0.95} fill={live ? '#fff' : color} stroke={INK} strokeWidth={3} />
				</g>
			) : null}
		</g>
	);
};

export type TokenKind = 'ship' | 'plane' | 'arrow' | 'dot';

/** original token drawings, pointing up (−y), ~100 px box */
const PLANE = 'M0,-50 C6,-50 7,-40 7,-30 L7,-8 L46,10 L46,20 L7,12 L6,32 L20,42 L20,50 L0,45 L-20,50 L-20,42 L-6,32 L-7,12 L-46,20 L-46,10 L-7,-8 L-7,-30 C-7,-40 -6,-50 0,-50 Z';
const TokenIcon: React.FC<{kind: TokenKind; color: string; t: number; alt: number}> = ({kind, color, t, alt}) => {
	if (kind === 'ship') {
		const w = Math.sin(t * 7) * 3;
		return (
			<g>
				{/* bow wave + V wake */}
				<path d={`M-8,-44 Q0,-58 8,-44`} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={4} strokeLinecap="round" />
				<path d={`M-14,26 L${-46 + w},96 M14,26 L${46 - w},96`} stroke="#fff" strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />
				<path d="M0,-52 C18,-30 20,6 16,40 L-16,40 C-20,6 -18,-30 0,-52 Z" fill={PAL.parchment} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
				<path d="M0,-38 C10,-24 12,0 10,28 L-10,28 C-12,0 -10,-24 0,-38 Z" fill={color} />
				<rect x={-8} y={-4} width={16} height={20} rx={3} fill="#fff" stroke={INK} strokeWidth={3} />
				<circle cx={0} cy={-18} r={4} fill={INK} />
			</g>
		);
	}
	if (kind === 'plane') {
		return (
			<g>
				<g transform={`scale(${1 + 0.16 * alt})`}>
					<path d={PLANE} fill="#fff" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
					<path d="M-7,-8 L-30,3 M7,-8 L30,3" stroke={color} strokeWidth={6} strokeLinecap="round" />
					<path d="M0,-44 L0,38" stroke={color} strokeWidth={4} strokeLinecap="round" />
				</g>
			</g>
		);
	}
	if (kind === 'arrow') {
		return <path d="M0,-50 L38,30 L0,12 L-38,30 Z" fill={color} stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
	}
	const ring = (t * 1.3) % 1;
	return (
		<g>
			<circle r={22 + 40 * ring} fill="none" stroke={color} strokeWidth={5} opacity={1 - ring} />
			<circle r={20} fill={color} stroke={INK} strokeWidth={5} />
			<circle r={7} fill="#fff" />
		</g>
	);
};

/**
 * A ship / plane / arrow / dot travelling along `d` from t0 over dur (same timing as its MapRoute → it rides the drawing tip),
 * turned to the heading, with a fading trail (screen px). Plane: climbs (shadow + scale) mid-flight. Pops in `tin` s before
 * t0, holds at the end, fades at t1.
 */
export const MovingToken: React.FC<{
	d: string;
	t0: number;
	dur?: number;
	t1?: number;
	ease?: (x: number) => number;
	from?: number;
	to?: number;
	kind?: TokenKind;
	size?: number;
	color?: string;
	trail?: number;
	tin?: number;
}> = ({d, t0, dur = 1.2, t1 = Infinity, ease = easeInOut, from = 0, to = 1, kind = 'ship', size = 76, color = PAL.orange, trail, tin = 0.25}) => {
	const t = useT();
	const {k} = useMap();
	const poly = useMemo(() => polyOf(d), [d]);
	if (t < t0 - tin || t > t1 + 0.3) return null;
	const u = clamp01((t - t0) / dur);
	const s = poly.L * lerp(from, to, ease(u));
	const [x, y] = pointAt(poly, s);
	const head = headingAt(poly, s, 10 / k);
	const appear = easeOut(clamp01((t - (t0 - tin)) / Math.max(0.01, tin + 0.05)));
	const out = clamp01((t1 + 0.3 - t) / 0.3);
	const alt = kind === 'plane' ? Math.sin(Math.PI * u) : 0;
	const tr = trail ?? (kind === 'plane' ? 260 : kind === 'ship' ? 200 : 140);
	const pieces = 10;
	const trailEls = tr > 0 && u > 0
		? Array.from({length: pieces}, (_, i) => {
				const a = s - (tr / k) * ((i + 1) / pieces), b = s - (tr / k) * (i / pieces);
				if (b <= 0) return null;
				return <path key={i} d={slicePath(poly, Math.max(0, a), b)} fill="none" stroke={kind === 'plane' ? '#fff' : kind === 'ship' ? '#fff' : color} strokeOpacity={0.55 * (1 - i / pieces)} strokeWidth={((kind === 'plane' ? 5 : 9) * (1 - i / (pieces + 2))) / k} strokeLinecap="round" />;
			})
		: null;
	const bob = kind === 'ship' ? 1 + 0.03 * Math.sin(t * 6) : 1;
	const sc = (appear * bob * size) / 100 / k;
	const rot = (head * 180) / Math.PI + 90;
	return (
		<g opacity={out}>
			{trailEls}
			{/* plane: the ground shadow drifts down-right in SCREEN space as it climbs */}
			{kind === 'plane' ? (
				<g transform={`translate(${x + (12 + 26 * alt) / k} ${y + (16 + 34 * alt) / k}) scale(${sc * 0.92}) rotate(${rot})`}>
					<path d={PLANE} fill="#000" opacity={0.26} />
				</g>
			) : null}
			<g transform={`translate(${x} ${y}) scale(${sc}) rotate(${rot})`}>
				<TokenIcon kind={kind} color={color} t={t} alt={alt} />
			</g>
		</g>
	);
};

/**
 * Thick tapering arrow that grows along `d` (fronts, migrations, currents): width [start, end] and head length in screen px.
 */
export const AdvanceArrow: React.FC<{d: string; t0: number; dur?: number; t1?: number; ease?: (x: number) => number; width?: [number, number]; head?: number; color?: string; opacity?: number; outline?: boolean}> = ({
	d,
	t0,
	dur = 1.0,
	t1 = Infinity,
	ease = easeInOut,
	width = [26, 58],
	head = 96,
	color = PAL.stamp,
	opacity = 0.92,
	outline = true,
}) => {
	const t = useT();
	const {k} = useMap();
	const poly = useMemo(() => polyOf(d), [d]);
	if (t < t0 || t > t1 + 0.3) return null;
	const p = ease(clamp01((t - t0) / dur));
	const out = clamp01((t1 + 0.3 - t) / 0.3);
	const tip = poly.L * p;
	if (tip < 2 / k) return null;
	const hl = Math.min(head / k, tip * 0.6);
	const bodyEnd = tip - hl;
	const [w0, w1] = [width[0] / k, width[1] / k];
	const n = Math.max(2, Math.ceil(bodyEnd / (6 / k)));
	const left: XY[] = [], right: XY[] = [];
	for (let i = 0; i <= n; i++) {
		const s = (bodyEnd * i) / n;
		const [x, y] = pointAt(poly, s);
		const a = headingAt(poly, s, 8 / k);
		const w = lerp(w0, w1, bodyEnd > 0 ? s / tip : 1) / 2;
		left.push([x + Math.sin(a) * w, y - Math.cos(a) * w]);
		right.push([x - Math.sin(a) * w, y + Math.cos(a) * w]);
	}
	const [bx, by] = pointAt(poly, bodyEnd);
	const ah = headingAt(poly, bodyEnd, 8 / k);
	const hw = (w1 * 1.05 * hl) / (head / k);
	const tipPt: XY = [bx + Math.cos(ah) * hl, by + Math.sin(ah) * hl];
	const hL: XY = [bx + Math.sin(ah) * hw, by - Math.cos(ah) * hw];
	const hR: XY = [bx - Math.sin(ah) * hw, by + Math.cos(ah) * hw];
	const ring = [...left, hL, tipPt, hR, ...right.reverse()];
	const dd = polyD(ring) + 'Z';
	return (
		<g opacity={out}>
			<path d={dd} transform={`translate(${7 / k} ${11 / k})`} fill="#000" opacity={0.25} />
			<path d={dd} fill={color} fillOpacity={opacity} stroke={outline ? INK : 'none'} strokeWidth={4 / k} strokeLinejoin="round" />
		</g>
	);
};

// ---------------------------------------------------------------- pins and labels

/** label width estimate for Montserrat 800 caps (deterministic: no font-timing dependence in the render) */
const textW = (s: string, size: number, spacing = 0.04) => {
	let w = 0;
	for (const ch of s.toUpperCase()) w += /[IJ1.,:;!' ]/.test(ch) ? 0.36 : /[MWÆŒ]/.test(ch) ? 0.98 : /[A-Z0-9ÄÖÜÉÈÀÇ]/.test(ch) ? 0.72 : 0.7;
	return size * (w + spacing * s.length);
};

const SAFE_X: XY = [48, 887];
const LABEL_TOP = 300;
const LABEL_BOTTOM = 1130;      // above the subtitle band (R3: centre 1180–1300)

/** the label rises out of a mask (T4), white or gold text with an ink outline on a dark pill (T3, T5, T9) */
const LabelPill: React.FC<{text: string; sub?: string; cx: number; top: number; size: number; gold?: boolean; p: number; edge?: string}> = ({text, sub, cx, top, size, gold, p, edge = PAL.orange}) => {
	const padX = size * 0.55, padY = size * 0.32;
	const w = Math.max(textW(text, size), sub ? textW(sub, size * 0.62) : 0) + padX * 2;
	const h = size * 1.1 + padY * 2 + (sub ? size * 0.78 : 0);
	const rise = (1 - easeOut(p)) * (h + 12);
	const id = 'lp' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
	if (p <= 0) return null;
	return (
		<g opacity={clamp01(p * 2.5)}>
			<defs>
				{/* mask = the pill box itself (+ its stroke): the pill rises into it from below, nothing peeks out before */}
				<clipPath id={id}>
					<rect x={cx - w / 2 - 8} y={top - 8} width={w + 16} height={h + 10} />
				</clipPath>
			</defs>
			<g clipPath={`url(#${id})`}>
				<g transform={`translate(0 ${rise})`}>
					<rect x={cx - w / 2} y={top} width={w} height={h} rx={size * 0.42} fill="rgba(18,8,24,0.78)" stroke={edge} strokeWidth={3} />
					<text x={cx} y={top + padY + size * 0.9} textAnchor="middle" fontFamily={MONT} fontWeight={800} fontSize={size} letterSpacing={size * 0.04} fill={gold ? GOLD : '#fff'} stroke={INK} strokeWidth={size * 0.12} paintOrder="stroke" style={{textTransform: 'uppercase'}}>
						{text.toUpperCase()}
					</text>
					{sub ? (
						<text x={cx} y={top + padY + size * 1.1 + size * 0.62} textAnchor="middle" fontFamily={MONT} fontWeight={700} fontSize={size * 0.62} fill="#fff" stroke={INK} strokeWidth={size * 0.08} paintOrder="stroke">
							{sub}
						</text>
					) : null}
				</g>
			</g>
		</g>
	);
};

/**
 * A pin drops onto a place with a bounce + ripple; optional label pill (rises out of a mask) placed above the pin, or below
 * when it would leave the top of the safe zone — always inside x 48–887 and above the subtitle band.
 */
export const PinPop: React.FC<{at: Pt; t0: number; t1?: number; text?: string; sub?: string; color?: string; size?: number; textSize?: number; side?: 'auto' | 'up' | 'down'; gold?: boolean}> = ({
	at,
	t0,
	t1 = Infinity,
	text,
	sub,
	color = PAL.orange,
	size = 64,
	textSize = 42,
	side = 'auto',
	gold,
}) => {
	const t = useT();
	const {map, k, toScreen} = useMap();
	if (t < t0 || t > t1 + 0.3) return null;
	const P = resolvePt(map, at);
	const S = toScreen(P);
	const out = clamp01((t1 + 0.3 - t) / 0.3);
	const u = clamp01((t - t0) / 0.42);
	// drop with two bounces (deterministic)
	const bounce = u < 0.55 ? 1 - Math.pow(u / 0.55, 2) : u < 0.8 ? 0.16 * Math.sin(((u - 0.55) / 0.25) * Math.PI) : 0.05 * Math.sin(((u - 0.8) / 0.2) * Math.PI);
	const dy = -bounce * 150;
	const land = clamp01((t - t0 - 0.23) / 0.7);
	const pinH = size;
	let label: React.ReactNode = null;
	if (text) {
		const lp = clamp01((t - t0 - 0.3) / 0.28);      // after the pin has landed
		const w = Math.max(textW(text, textSize), sub ? textW(sub, textSize * 0.62) : 0) + textSize * 1.1;
		const h = textSize * 1.1 + textSize * 0.64 + (sub ? textSize * 0.78 : 0);
		const upTop = S[1] - pinH - 18 - h;
		const downTop = S[1] + 26;
		const up = side === 'up' || (side === 'auto' && (upTop >= LABEL_TOP || downTop + h > LABEL_BOTTOM));
		const top = Math.min(up ? upTop : downTop, LABEL_BOTTOM - h);
		const cx = w > SAFE_X[1] - SAFE_X[0] ? (SAFE_X[0] + SAFE_X[1]) / 2 : Math.max(SAFE_X[0] + w / 2, Math.min(SAFE_X[1] - w / 2, S[0]));
		label = <LabelPill text={text} sub={sub} cx={cx - S[0]} top={top - S[1]} size={textSize} gold={gold} p={lp} edge={color} />;
	}
	return (
		<g transform={`translate(${P[0]} ${P[1]}) scale(${1 / k})`} opacity={out}>
			<ellipse cx={0} cy={2} rx={size * 0.28 * (1 - bounce * 0.5)} ry={size * 0.09 * (1 - bounce * 0.5)} fill="#000" opacity={0.35} />
			{land > 0 && land < 1
				? [0, 0.3].map((o) => {
						const r = clamp01(land - o) / (1 - o);
						return r > 0 && r < 1 ? <ellipse key={o} cx={0} cy={0} rx={size * (0.3 + 1.1 * r)} ry={size * (0.12 + 0.44 * r)} fill="none" stroke={color} strokeWidth={4} opacity={1 - r} /> : null;
					})
				: null}
			<g transform={`translate(0 ${dy})`}>
				<path
					d={`M0,0 C${-size * 0.12},${-size * 0.3} ${-size * 0.36},${-size * 0.46} ${-size * 0.36},${-size * 0.7} A${size * 0.36},${size * 0.36} 0 1 1 ${size * 0.36},${-size * 0.7} C${size * 0.36},${-size * 0.46} ${size * 0.12},${-size * 0.3} 0,0 Z`}
					fill={color}
					stroke={INK}
					strokeWidth={4.5}
					strokeLinejoin="round"
				/>
				<circle cx={0} cy={-size * 0.7} r={size * 0.14} fill="#fff" stroke={INK} strokeWidth={3} />
			</g>
			{label}
		</g>
	);
};

/** calm map caption at a place (country, sea, front): white / gold caps, ink outline, optional scrim; rises out of a mask.
 *  Shifted on screen when needed so it stays inside x 48–887 and between y 300 and the subtitle band. */
export const MapLabel: React.FC<{at: Pt; text: string; t0: number; t1?: number; size?: number; gold?: boolean; scrim?: boolean; head?: boolean}> = ({at, text, t0, t1 = Infinity, size = 40, gold, scrim = true, head}) => {
	const t = useT();
	const {map, k, toScreen} = useMap();
	const id = 'ml' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
	if (t < t0 || t > t1 + 0.3) return null;
	const P = resolvePt(map, at);
	const p = easeOut(clamp01((t - t0) / 0.32));
	const out = clamp01((t1 + 0.3 - t) / 0.3);
	const sp = head ? 0.03 : 0.16;
	const w = textW(text, size, sp) * (head ? 1.05 : 1);
	const h = size * 1.2;
	const S = toScreen(P);
	const hw = w / 2 + 22, hh = h / 2 + 6;
	const sx = (hw * 2 > SAFE_X[1] - SAFE_X[0] ? (SAFE_X[0] + SAFE_X[1]) / 2 : Math.max(SAFE_X[0] + hw, Math.min(SAFE_X[1] - hw, S[0]))) - S[0];
	const sy = Math.max(LABEL_TOP + hh, Math.min(LABEL_BOTTOM - hh, S[1])) - S[1];
	return (
		<g transform={`translate(${P[0]} ${P[1]}) scale(${1 / k}) translate(${sx} ${sy})`} opacity={out}>
			<defs>
				<clipPath id={id}>
					<rect x={-w / 2 - 30} y={-h / 2 - 12} width={w + 60} height={h + 14} />
				</clipPath>
			</defs>
			{scrim ? <rect x={-w / 2 - 22} y={-h / 2 - 6} width={w + 44} height={h + 12} rx={h * 0.5} fill="rgba(18,8,24,0.45)" opacity={p} /> : null}
			<g clipPath={`url(#${id})`}>
				<text
					x={0}
					y={size * 0.36 + (1 - p) * (h + size * 0.5)}
					textAnchor="middle"
					fontFamily={head ? HEAD : MONT}
					fontWeight={head ? 400 : 800}
					fontSize={size}
					letterSpacing={size * sp}
					fill={gold ? GOLD : '#fff'}
					stroke={INK}
					strokeWidth={size * 0.14}
					paintOrder="stroke"
				>
					{text.toUpperCase()}
				</text>
			</g>
		</g>
	);
};
