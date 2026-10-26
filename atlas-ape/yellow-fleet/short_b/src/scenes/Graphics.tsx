import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import geo from '../data/geo.json';
import {W, We} from '../lib/time';
import {S} from '../data/shots';
import {MONT} from '../fonts';
import {GOLD, INK, clamp01, easeInOut, easeOut, lerp, pop, useT} from '../ui/gfx';

// Motion graphics on top of the 3D (owner 21.10: «the video looks like it has no graphics»): locator map, a 1967→1975
// timeline bar, the trapped-fleet map, the 8 flags split by the Cold War line, the Suez → Hamburg route.
// Maps: Natural Earth 10 m (public domain), equirectangular with cos(lat) — simple and honest at these scales.
type LL = [number, number];
const G = geo as unknown as {route: {box: number[]; land: LL[][]}; suez: {box: number[]; land: LL[][]; lakes: LL[][]}};
const SEA = '#0f6f8f', SEA2 = '#14809f', LAND = '#ecca8c', LAND_EDGE = '#b98a4e', CANAL = '#5fe3f0';

type View = {lon0: number; lat0: number; k: number; cx: number; cy: number};
const proj = (v: View) => ([lon, lat]: LL): [number, number] => [v.cx + (lon - v.lon0) * v.k * Math.cos((v.lat0 * Math.PI) / 180), v.cy - (lat - v.lat0) * v.k];
const pathOf = (rings: LL[][], p: (ll: LL) => [number, number]) =>
	rings.map((r) => 'M' + r.map((ll) => p(ll).map((x) => x.toFixed(1)).join(',')).join('L') + 'Z').join('');
const line = (pts: LL[], p: (ll: LL) => [number, number]) => 'M' + pts.map((ll) => p(ll).map((x) => x.toFixed(1)).join(',')).join('L');
const lerpView = (a: View, b: View, k: number): View => ({lon0: lerp(a.lon0, b.lon0, k), lat0: lerp(a.lat0, b.lat0, k), k: lerp(a.k, b.k, k), cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k)});

// the canal (approx. centre line, north → south): Port Said, El Qantara, Lake Timsah, Deversoir, Great + Little Bitter Lake, Suez
const CANAL_PTS: LL[] = [[32.31, 31.27], [32.32, 30.86], [32.29, 30.58], [32.33, 30.43], [32.39, 30.34], [32.46, 30.22], [32.52, 30.10], [32.56, 29.95]];

const Card: React.FC<{x: number; y: number; w: number; h: number; k: number; children: React.ReactNode; title?: string; accent?: string}> = ({x, y, w, h, k, children, title, accent}) => (
	<div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `scale(${lerp(0.86, 1, k)})`, opacity: clamp01(k * 1.6), borderRadius: 30,
		overflow: 'hidden', border: '6px solid #fff8ea', boxShadow: '0 22px 60px rgba(20,0,40,0.55)', background: SEA}}>
		{children}
		{title ? (
			<div style={{position: 'absolute', left: 0, right: 0, top: 14, textAlign: 'center', fontFamily: MONT, fontWeight: 800, fontSize: 34, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>
				{title}{accent ? <span style={{color: '#FFD54A'}}> {accent}</span> : null}
			</div>
		) : null}
	</div>
);

/** hook: locator card — Egypt/Sinai, the canal glows, a convoy dot runs north («June 1967») */
export const HookMap: React.FC<{t0: number; t1: number}> = ({t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const k = Math.min(pop(t, t0, 0.4), clamp01((t1 + 0.3 - t) / 0.3));
	const W_ = 520, H_ = 520;
	const v: View = {lon0: 32.4, lat0: 30.4, k: 120, cx: W_ / 2, cy: H_ / 2 + 30};
	const p = proj(v);
	const draw = easeOut((t - t0 - 0.15) / 0.6);
	const dotK = clamp01((t - t0 - 0.5) / 2.2);
	const di = Math.min(CANAL_PTS.length - 2, Math.floor((1 - dotK) * (CANAL_PTS.length - 1)));
	const f = (1 - dotK) * (CANAL_PTS.length - 1) - di;
	const dot = p([lerp(CANAL_PTS[di][0], CANAL_PTS[di + 1][0], f), lerp(CANAL_PTS[di][1], CANAL_PTS[di + 1][1], f)]);
	return (
		<Card x={540} y={440} w={W_} h={H_} k={k} title="June" accent="1967">
			<svg width={W_} height={H_} style={{position: 'absolute', left: 0, top: 0}}>
				<path d={pathOf(G.route.land, p)} fill={LAND} stroke={LAND_EDGE} strokeWidth={2} />
				<path d={pathOf(G.suez.lakes, p)} fill={SEA2} />
				<path d={line(CANAL_PTS, p)} fill="none" stroke={CANAL} strokeWidth={7} strokeLinecap="round" strokeDasharray={900} strokeDashoffset={900 * (1 - draw)} style={{filter: 'drop-shadow(0 0 8px rgba(95,227,240,0.9))'}} />
				<text x={p([31.0, 30.0])[0]} y={p([31.0, 30.0])[1]} fontFamily={MONT} fontWeight={800} fontSize={32} fill="#7a5a2c" textAnchor="middle">EGYPT</text>
				<text x={p([33.7, 30.0])[0]} y={p([33.7, 30.0])[1]} fontFamily={MONT} fontWeight={800} fontSize={28} fill="#7a5a2c" textAnchor="middle">SINAI</text>
				<text x={p([32.4, 31.75])[0]} y={p([32.4, 31.75])[1]} fontFamily={MONT} fontWeight={700} fontSize={20} fill="#bdf2fa" textAnchor="middle" fontStyle="italic">Mediterranean</text>
				{dotK > 0 ? <g><circle cx={dot[0]} cy={dot[1]} r={13} fill="#fff" stroke={INK} strokeWidth={4} /><circle cx={dot[0]} cy={dot[1]} r={13 + 12 * ((t * 1.6) % 1)} fill="none" stroke="#fff" strokeWidth={3} opacity={1 - ((t * 1.6) % 1)} /></g> : null}
			</svg>
		</Card>
	);
};

/** «8 YEARS» — a calendar bar 1967 → 1975 filling under the key figure */
export const YearsBar: React.FC<{t0: number; t1: number; y?: number; years?: boolean}> = ({t0, t1, y = 560, years = true}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const o = clamp01((t - t0) / 0.25) * clamp01((t1 + 0.3 - t) / 0.3);
	const fill = easeInOut((t - t0 - 0.1) / 0.75);
	const Wb = 640, x0 = 540 - Wb / 2;
	return (
		<svg width={1080} height={200} style={{position: 'absolute', left: 0, top: y - 60, opacity: o, overflow: 'visible'}}>
			<rect x={x0} y={48} width={Wb} height={26} rx={13} fill="rgba(20,8,40,0.55)" stroke="#fff8ea" strokeWidth={4} />
			<rect x={x0 + 4} y={52} width={Math.max(0, (Wb - 8) * fill)} height={18} rx={9} fill={GOLD} />
			{Array.from({length: 9}, (_, i) => (
				<line key={i} x1={x0 + (Wb * i) / 8} y1={i % 8 === 0 ? 30 : 38} x2={x0 + (Wb * i) / 8} y2={44} stroke="#fff8ea" strokeWidth={4} opacity={fill * 8 >= i ? 1 : 0.35} />
			))}
			{years ? <><text x={x0} y={112} fontFamily={MONT} fontWeight={800} fontSize={34} fill="#fff" textAnchor="middle" style={{paintOrder: 'stroke', stroke: INK, strokeWidth: 6}}>1967</text>
			<text x={x0 + Wb} y={112} fontFamily={MONT} fontWeight={800} fontSize={34} fill={fill > 0.98 ? '#FFD54A' : '#fff'} textAnchor="middle" style={{paintOrder: 'stroke', stroke: INK, strokeWidth: 6}}>1975</text></> : null}
		</svg>
	);
};

/** «nowhere to go.» — the Great Bitter Lake with the 14 anchored ships; red bars close the canal north and south */
const FLEET: LL[] = [[32.33, 30.38], [32.345, 30.375], [32.36, 30.37], [32.375, 30.365], [32.40, 30.35], [32.415, 30.345], [32.43, 30.34], [32.445, 30.335],
	[32.37, 30.315], [32.385, 30.31], [32.40, 30.305], [32.43, 30.29], [32.445, 30.285], [32.46, 30.28]];
export const TrappedMap: React.FC<{t0: number; t1: number}> = ({t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const k = Math.min(pop(t, t0, 0.35), clamp01((t1 + 0.3 - t) / 0.3));
	const W_ = 560, H_ = 640;
	const a: View = {lon0: 32.45, lat0: 30.45, k: 700, cx: W_ / 2, cy: H_ / 2 + 20};
	const b: View = {lon0: 32.4, lat0: 30.33, k: 1900, cx: W_ / 2, cy: H_ / 2 + 30};
	const v = lerpView(a, b, easeInOut((t - t0) / 0.9));
	const p = proj(v);
	const blocks: LL[] = [[32.335, 30.445], [32.485, 30.215]];   // where the canal leaves the lake, north and south
	return (
		<Card x={540} y={560} w={W_} h={H_} k={k} title="Great Bitter Lake">
			<svg width={W_} height={H_} style={{position: 'absolute', left: 0, top: 0}}>
				<rect width={W_} height={H_} fill={LAND} />
				<path d={pathOf(G.suez.lakes, p)} fill={SEA} stroke="#0b5470" strokeWidth={3} />
				<path d={line(CANAL_PTS, p)} fill="none" stroke={SEA} strokeWidth={Math.max(4, v.k / 140)} strokeLinecap="round" />
				{FLEET.map((ll, i) => {
					const [x, y] = p(ll);
					const s = pop(t, t0 + 0.35 + i * 0.03, 0.25) * Math.min(1.6, v.k / 1300);
					return s > 0 ? <g key={i} transform={`translate(${x} ${y}) rotate(-35) scale(${s})`}><path d="M -11 -4 L 9 -4 L 13 0 L 9 4 L -11 4 Z" fill="#e7b545" stroke={INK} strokeWidth={2.5} /></g> : null;
				})}
				{blocks.map((ll, i) => {
					const [x, y] = p(ll);
					const s = pop(t, W(40) - 0.1 + i * 0.12, 0.3);
					return s > 0 ? (
						<g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
							<circle r={30} fill="#fff" stroke="#e0392d" strokeWidth={8} />
							<line x1={-19} y1={19} x2={19} y2={-19} stroke="#e0392d" strokeWidth={8} strokeLinecap="round" />
						</g>
					) : null;
				})}
			</svg>
		</Card>
	);
};

/** «Their countries were rivals. The sailors became friends.» — 8 flags, West | East; the line melts on «friends» */
const WEST = ['red_ensign', 'west_germany', 'france', 'sweden', 'usa'];
const EAST = ['poland', 'bulgaria', 'czechoslovakia'];
export const FlagsBar: React.FC<{t0: number; t1: number}> = ({t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const o = clamp01((t1 + 0.3 - t) / 0.3);
	const friends = easeInOut((t - (W(56) - 0.1)) / 0.45);
	const gap = lerp(70, 14, friends);
	const fw = 96, fh = 64, sp = 12;
	const wW = WEST.length * (fw + sp) - sp, eW = EAST.length * (fw + sp) - sp;
	const total = wW + gap * 2 + eW;
	const x0 = 540 - total / 2;
	const all = [...WEST.map((f, i) => ({f, x: x0 + i * (fw + sp)})), ...EAST.map((f, i) => ({f, x: x0 + wW + gap * 2 + i * (fw + sp)}))];
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: o}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', fontFamily: MONT, fontWeight: 800, fontSize: 40, color: '#fff', textShadow: '0 3px 10px rgba(0,0,0,0.75)'}}>
				<span style={{color: '#FFD54A'}}>8</span> countries
			</div>
			{all.map(({f, x}, i) => {
				const s = pop(t, t0 + 0.08 * i, 0.3);
				return (
					<div key={f} style={{position: 'absolute', left: x, top: 270, width: fw, height: fh, transform: `scale(${s}) rotate(${friends > 0 ? Math.sin(t * 6 + i) * 3 * friends : 0}deg)`, borderRadius: 8, overflow: 'hidden', border: '4px solid #fff8ea', boxShadow: '0 6px 16px rgba(0,0,0,0.45)'}}>
						<Img src={staticFile(`flags/${f}.png`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
					</div>
				);
			})}
			{/* the Cold War line between West and East */}
			<div style={{position: 'absolute', left: x0 + wW + gap - 3, top: 255, width: 6, height: 94, borderRadius: 3, background: 'repeating-linear-gradient(180deg, #ff4b4b 0 12px, transparent 12px 20px)', opacity: 1 - friends, transform: `scaleY(${1 - 0.6 * friends})`}} />
			{friends > 0.5 ? (
				<svg width={80} height={60} style={{position: 'absolute', left: x0 + wW + gap - 40, top: 272, overflow: 'visible', transform: `scale(${pop(t, W(56) + 0.1, 0.35)})`}}>
					<circle cx={28} cy={30} r={17} fill="none" stroke={GOLD} strokeWidth={8} /><circle cx={52} cy={30} r={17} fill="none" stroke={GOLD} strokeWidth={8} />
				</svg>
			) : null}
		</div>
	);
};

/** «Home to Hamburg.» — full-screen map: the route from the Bitter Lake round Europe to Hamburg draws itself, a ship rides it */
const ROUTE: LL[] = [[32.40, 30.33], [32.31, 31.27], [28.0, 33.6], [20.0, 35.4], [12.0, 37.2], [5.0, 37.6], [-5.6, 35.95], [-9.6, 37.0], [-10.0, 43.2], [-5.6, 48.6],
	[-1.5, 50.0], [1.6, 51.0], [4.5, 53.1], [8.3, 54.0], [9.95, 53.55]];
export const RouteMap: React.FC<{t0: number; t1: number}> = ({t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.35) return null;
	const o = clamp01((t - t0) / 0.3) * clamp01((t1 + 0.35 - t) / 0.35);
	const v: View = {lon0: 12.5, lat0: 43.0, k: 28.5, cx: 540, cy: 900};
	const p = proj(v);
	const prog = easeInOut((t - t0 - 0.15) / Math.max(0.6, t1 - t0 - 0.35));
	// cumulative length for the moving ship
	const pts = ROUTE.map(p);
	const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
	const L = seg.reduce((a, b) => a + b, 0);
	let d = prog * L, i = 0;
	while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
	const f = seg[i] ? d / seg[i] : 0;
	const sx = lerp(pts[i][0], pts[i + 1][0], f), sy = lerp(pts[i][1], pts[i + 1][1], f);
	const ang = (Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) * 180) / Math.PI;
	const pin = (ll: LL, label: string, k: number, dy = -36, anchor: 'middle' | 'end' = 'middle') => {
		const [x, y] = p(ll);
		return k > 0 ? (
			<g transform={`translate(${x} ${y}) scale(${k})`}>
				<circle r={14} fill={GOLD} stroke={INK} strokeWidth={4} />
				<text y={dy} x={anchor === 'end' ? 10 : 0} fontFamily={MONT} fontWeight={800} fontSize={40} fill="#fff" textAnchor={anchor} style={{paintOrder: 'stroke', stroke: INK, strokeWidth: 8}}>{label}</text>
			</g>
		) : null;
	};
	return (
		<AbsoluteFill style={{opacity: o, background: `radial-gradient(ellipse at 50% 45%, ${SEA2} 0%, ${SEA} 60%, #0a4f68 100%)`}}>
			<svg width={1080} height={1920}>
				<path d={pathOf(G.route.land, p)} fill={LAND} stroke={LAND_EDGE} strokeWidth={2.5} />
				<path d={line(ROUTE, p)} fill="none" stroke="#fff8ea" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L} ${L}`} strokeDashoffset={L * (1 - prog)} opacity={0.95} />
				<path d={line(ROUTE, p)} fill="none" stroke={GOLD} strokeWidth={3} strokeLinecap="round" strokeDasharray="14 14" strokeDashoffset={L * (1 - prog)} opacity={0.0} />
				{pin([32.4, 30.33], 'Suez Canal', pop(t, t0 + 0.1, 0.3), 52, 'end')}
				{pin([9.95, 53.55], 'Hamburg', pop(t, t0 + 0.15 + (t1 - t0 - 0.35) * 0.92, 0.35))}
				<g transform={`translate(${sx} ${sy}) rotate(${ang})`}>
					<path d="M -26 -10 L 18 -10 L 30 0 L 18 10 L -26 10 Z" fill="#e7b545" stroke={INK} strokeWidth={4} />
					<rect x={-14} y={-7} width={14} height={14} fill="#fff8ea" stroke={INK} strokeWidth={2.5} />
				</g>
			</svg>
		</AbsoluteFill>
	);
};
