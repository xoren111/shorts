import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {W} from '../lib/time';
import {S} from '../data/shots';
import {GEO, MAINLAND, TASMANIA, type LL, type View, fenceLonAt, km, lerpView, onLand, pathOf, proj, rnd} from '../lib/map';
import {INK, Label, XF, clamp01, easeInOut, easeOut, lerp, useT} from '../ui/gfx';
import {VirusGlyph} from './Photos';

// Toon maps in the channel palette: violet ocean, warm ochre land with a dark ink outline, cream dashed state borders.
const LAND = '#e2a55c';
const LAND2 = '#cf8a45';

const Ocean: React.FC = () => (
	<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #4a3aa6 0%, #2c1f78 45%, #140a3c 100%)'}}>
		<svg width={1080} height={1920} style={{position: 'absolute', opacity: 0.12}}>
			{Array.from({length: 26}, (_, i) => (
				<path key={i} d={`M -20 ${i * 80 + 30} q 60 -16 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0`} fill="none" stroke="#c9b8ff" strokeWidth={3} />
			))}
		</svg>
	</AbsoluteFill>
);

const LandLayer: React.FC<{v: View; rings: LL[][]; borders?: boolean; id: string}> = ({v, rings, borders = true, id}) => {
	const p = proj(v);
	const d = pathOf(rings, p);
	return (
		<>
			<defs>
				<linearGradient id={`lg_${id}`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={LAND} />
					<stop offset="1" stopColor={LAND2} />
				</linearGradient>
				<clipPath id={`clip_${id}`}><path d={d} /></clipPath>
			</defs>
			<path d={d} transform="translate(0 10)" fill="rgba(10,2,30,0.45)" />
			<path d={d} fill={`url(#lg_${id})`} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			{borders ? <path d={pathOf(GEO.borders, p, false)} fill="none" stroke="#fff3d6" strokeWidth={2.5} strokeDasharray="10 9" opacity={0.55} clipPath={`url(#clip_${id})`} /> : null}
		</>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
/** S4 «Twenty-four became hundreds of millions.» — the rabbit tide spreads from Barwon Park along dated fronts
 * (redrawn after Stodart & Parer 1988: Murray 1880, Queensland 1886, Eucla 1894, west coast 1920s), 1859 → 1950 in ~2.6 s. */
const BARWON: LL = [144.0, -38.15];
const YEAR_AT = [[0, 1859], [250, 1878], [1000, 1886], [1450, 1894], [2200, 1908], [2900, 1925], [4000, 1940]];
const yearOf = (d: number) => {
	for (let i = 1; i < YEAR_AT.length; i++) if (d <= YEAR_AT[i][0]) {
		const [d0, y0] = YEAR_AT[i - 1], [d1, y1] = YEAR_AT[i];
		return y0 + ((d - d0) / (d1 - d0)) * (y1 - y0);
	}
	return 1945;
};
export const SpreadMap: React.FC = () => {
	const t = useT();
	const [t0, t1] = S.spread;
	const pts = useMemo(() => {
		const out: {ll: LL; y: number; r: number}[] = [];
		let n = 0;
		for (let lat = -43.6; lat < -20.5; lat += 0.62) {
			for (let lon = 113.0; lon < 154; lon += 0.62) {
				n++;
				const ll: LL = [lon + (rnd(n) - 0.5) * 0.55, lat + (rnd(n + 7) - 0.5) * 0.55];
				if (!onLand(ll)) continue;
				// tropical north and the wettest far north-east stay mostly rabbit-free
				if (ll[1] > -23 && rnd(n + 3) < 0.6) continue;
				out.push({ll, y: yearOf(km(BARWON, ll)) + (rnd(n + 11) - 0.5) * 6, r: 3.6 + rnd(n + 5) * 2.2});
			}
		}
		return out;
	}, []);
	const v: View = lerpView({lon0: 133.6, lat0: -27.6, k: 23.4, cx: 540, cy: 860}, {lon0: 134.2, lat0: -28.4, k: 25.0, cx: 540, cy: 860}, easeInOut((t - t0) / (t1 + XF - t0)));
	const p = proj(v);
	const year = 1859 + 91 * easeInOut((t - t0 - 0.25) / 2.7);
	const [bx, by] = p(BARWON);
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Ocean />
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<LandLayer v={v} rings={[MAINLAND, TASMANIA]} id="aus" />
				{pts.map(({ll, y, r}, i) => {
					const k = clamp01((year - y) / 4);
					if (k <= 0) return null;
					const [x, yy] = p(ll);
					const s = k < 1 ? 1 + 0.5 * Math.sin(k * Math.PI) : 1;
					return <circle key={i} cx={x} cy={yy} r={r * k * s} fill="#fff6e2" stroke={INK} strokeWidth={1.4} />;
				})}
				<circle cx={bx} cy={by} r={11} fill="#FFC83A" stroke={INK} strokeWidth={4} />
				{t - t0 < 1.2 ? <circle cx={bx} cy={by} r={11 + 40 * easeOut((t - t0) / 1.2)} fill="none" stroke="#FFC83A" strokeWidth={4} opacity={1 - (t - t0) / 1.2} /> : null}
			</svg>
			<Label text="≈ 600 million" accent="by 1950" sub="estimate (CSIRO)" t0={t0 + 0.9} t1={t1 + 0.1} x={540} y={300} size={56} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
/** S11b «Ocean to ocean.» — Western Australia; Fence No. 1 draws itself from Burracoppin north to the Indian Ocean and south to
 * the Southern Ocean (indicative line after WA DPIRD, simplified). */
const BURRA: LL = [118.48, -31.4];
export const WAMap: React.FC = () => {
	const t = useT();
	const [t0, t1] = S.wamap;
	const f = GEO.fence1;
	const split = useMemo(() => {
		let best = 0, bd = 1e9;
		f.forEach((ll, i) => {
			const d = Math.hypot(ll[0] - BURRA[0], ll[1] - BURRA[1]);
			if (d < bd) { bd = d; best = i; }
		});
		return best;
	}, [f]);
	const v: View = lerpView({lon0: 121.2, lat0: -25.6, k: 60, cx: 560, cy: 900}, {lon0: 121.0, lat0: -25.8, k: 63, cx: 560, cy: 900}, easeInOut((t - t0) / (t1 + XF - t0)));
	const p = proj(v);
	const north = f.slice(0, split + 1).reverse();  // Burracoppin → Cape Keraudren (fence1 starts in the north)
	const south = f.slice(split);                    // Burracoppin → Starvation Boat Harbour
	const pl = (pts: LL[]) => pts.map((ll, i) => (i ? 'L' : 'M') + p(ll).map((x) => x.toFixed(1)).join(' ')).join('');
	const len = (pts: LL[]) => pts.reduce((a, ll, i) => (i ? a + Math.hypot(...(p(ll).map((x, j) => x - p(pts[i - 1])[j]) as [number, number])) : 0), 0);
	const k = easeInOut((t - t0 - 0.15) / (W(56) - t0 - 0.05));
	const ln = len(north), ls = len(south);
	const [ex, ey] = p(north[north.length - 1]);
	const [sx, sy] = p(south[south.length - 1]);
	const [bx, by] = p(BURRA);
	const reached = k >= 0.995;
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Ocean />
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<LandLayer v={v} rings={[MAINLAND]} id="wa" />
				{[north, south].map((pts, i) => {
					const L = i === 0 ? ln : ls;
					return (
						<g key={i}>
							<path d={pl(pts)} fill="none" stroke={INK} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L * k} ${L}`} />
							<path d={pl(pts)} fill="none" stroke="#FFE7A3" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L * k} ${L}`} />
						</g>
					);
				})}
				<circle cx={bx} cy={by} r={9} fill="#FFC83A" stroke={INK} strokeWidth={4} />
				{reached ? [[ex, ey], [sx, sy]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={10 + 26 * easeOut((t - W(56)) / 0.6)} fill="none" stroke="#9fd4ff" strokeWidth={4} opacity={clamp01(1 - (t - W(56)) / 0.8)} />) : null}
			</svg>
			<Label text="Western Australia" accent="≈ 1,830 km" t0={t0 + 0.3} t1={t1 + 0.1} x={540} y={300} size={56} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
/** S15 «It escaped, most likely on flies.» — Spencer Gulf: cartoon flies lift the glyphs out of the Wardang pens (only the
 * escape is credited to flies); then a neutral dotted front creeps inland from the coast. */
const WARDANG: LL = [137.36, -34.5];
const COAST: LL = [137.56, -34.42];
const Fly: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
	<g transform={`translate(${x}, ${y}) scale(${s})`}>
		<ellipse cx={-10} cy={-12} rx={14} ry={7} fill="#e6eeff" stroke={INK} strokeWidth={3} transform={`rotate(${-30 + 25 * Math.sin(t * 80)} -2 -6)`} opacity={0.95} />
		<ellipse cx={10} cy={-12} rx={14} ry={7} fill="#e6eeff" stroke={INK} strokeWidth={3} transform={`rotate(${30 - 25 * Math.sin(t * 80)} 2 -6)`} opacity={0.95} />
		<ellipse cx={0} cy={0} rx={10} ry={13} fill="#2a2a35" stroke={INK} strokeWidth={3} />
		<circle cx={-5} cy={-11} r={5} fill="#c23a3a" stroke={INK} strokeWidth={2} />
		<circle cx={5} cy={-11} r={5} fill="#c23a3a" stroke={INK} strokeWidth={2} />
	</g>
);
export const SAMap: React.FC = () => {
	const t = useT();
	const [t0, t1] = S.samap;
	const v: View = lerpView({lon0: 137.5, lat0: -34.4, k: 380, cx: 540, cy: 900}, {lon0: 137.75, lat0: -34.25, k: 230, cx: 540, cy: 900}, easeInOut((t - t0) / (t1 + XF - t0)));
	const p = proj(v);
	const rings = GEO.landFine.length ? GEO.landFine : GEO.land;
	const [wx, wy] = p(WARDANG);
	const [cx, cy] = p(COAST);
	const fk = clamp01((t - t0 - 0.2) / 1.25);            // flies: pens → coast
	const front = easeInOut((t - (t0 + 1.35)) / (t1 + XF - t0 - 1.35));
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Ocean />
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<LandLayer v={v} rings={rings} borders={false} id="sa" />
				{/* dotted front creeping inland from the landfall (clipped to land) */}
				<g clipPath="url(#clip_sa)">
					{front > 0 ? [0.55, 0.8, 1].map((q, i) => (
						<circle key={i} cx={cx} cy={cy} r={lerp(0, 560, front * q)} fill={i === 2 ? 'rgba(160,90,255,0.16)' : 'none'} stroke="#C77DFF" strokeWidth={6} strokeDasharray="4 16" strokeLinecap="round" opacity={0.9 - i * 0.2} />
					)) : null}
				</g>
				{/* pens on the island */}
				<rect x={wx - 70} y={wy - 52} width={140} height={104} rx={14} fill="rgba(20,8,40,0.55)" stroke="#fff" strokeWidth={4} strokeDasharray="12 7" />
				{[0, 1, 2].map((i) => {
					const k = clamp01(fk * 1.25 - i * 0.12);
					const x = lerp(wx - 40 + i * 40, cx + (i - 1) * 60, easeInOut(k));
					const y = lerp(wy, cy - 10 + (i - 1) * 12, easeInOut(k)) - Math.sin(k * Math.PI) * 120;
					const gone = clamp01((t - (t0 + 1.55 + i * 0.1)) / 0.3);
					return (
						<g key={i} opacity={1 - gone}>
							<VirusGlyph x={x} y={y + 44} r={20} />
							<Fly x={x} y={y} s={2.0} t={t + i} />
						</g>
					);
				})}
			</svg>
			<Label text="Planned release:" accent="1998" t0={t0 + 0.35} t1={t1 + 0.1} x={540} y={300} size={56} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------------------------------------------------------------
/** S17 «The virus was already there.» — Western Australia's south-west farm belt: violet dots already everywhere (abstract, no
 * shire boundaries invented); the ceremony pin near Cranbrook sits in a small gap with no dot under it. */
const CRANBROOK: LL = [117.55, -34.3];
/** cartoon rabbit fleeing to the left (side view): stretched hop, ears back, wide eye, a sweat drop and speed lines */
const Runner: React.FC<{x: number; y: number; s?: number; t: number; flip?: boolean}> = ({x, y, s = 1, t, flip}) => {
	const hopY = -Math.abs(Math.sin(t * 11)) * 14;
	const stretch = 1 + 0.12 * Math.sin(t * 22);
	return (
		<g transform={`translate(${x}, ${y + hopY}) scale(${flip ? -s : s}, ${s})`}>
			{[0, 1, 2].map((i) => <line key={i} x1={34 + i * 6} y1={-30 + i * 12} x2={62 + i * 10} y2={-30 + i * 12} stroke="#fff3d6" strokeWidth={4} strokeLinecap="round" opacity={0.8} />)}
			<ellipse cx={30} cy={-30} rx={9} ry={9} fill="#fff" stroke={INK} strokeWidth={3} />
			<ellipse cx={8} cy={-32} rx={30 * stretch} ry={17} fill="#a26f47" stroke={INK} strokeWidth={4} />
			<path d="M -12 -18 l -16 14 M 22 -20 l 18 12" stroke={INK} strokeWidth={6} strokeLinecap="round" />
			<path d="M -12 -18 l -16 14 M 22 -20 l 18 12" stroke="#a26f47" strokeWidth={3} strokeLinecap="round" />
			<ellipse cx={-6} cy={-62} rx={6} ry={22} fill="#a26f47" stroke={INK} strokeWidth={3.5} transform="rotate(62 -6 -62)" />
			<ellipse cx={0} cy={-58} rx={6} ry={22} fill="#a26f47" stroke={INK} strokeWidth={3.5} transform="rotate(72 0 -58)" />
			<circle cx={-20} cy={-44} r={15} fill="#a26f47" stroke={INK} strokeWidth={4} />
			<circle cx={-25} cy={-47} r={6} fill="#fff" stroke={INK} strokeWidth={2} />
			<circle cx={-27} cy={-47} r={2.5} fill={INK} />
			<path d="M -8 -64 q 6 8 0 12 q -6 -4 0 -12 z" fill="#9fd4ff" stroke={INK} strokeWidth={2} />
		</g>
	);
};
/** cartoon rabbit swimming away: head and ears above a little wave, paddling wake */
const Swimmer: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => {
	const bob = Math.sin(t * 5) * 4;
	return (
		<g transform={`translate(${x}, ${y + bob}) scale(${s})`}>
			<path d="M 30 6 q 18 -10 36 0 M 40 18 q 22 -10 44 0" fill="none" stroke="#c9b8ff" strokeWidth={4} strokeLinecap="round" opacity={0.85} />
			<ellipse cx={-6} cy={-34} rx={6} ry={20} fill="#a26f47" stroke={INK} strokeWidth={3.5} transform="rotate(-10 -6 -34)" />
			<ellipse cx={8} cy={-34} rx={6} ry={20} fill="#a26f47" stroke={INK} strokeWidth={3.5} transform="rotate(12 8 -34)" />
			<circle cx={0} cy={-8} r={16} fill="#a26f47" stroke={INK} strokeWidth={4} />
			<circle cx={-6} cy={-11} r={4.5} fill="#fff" stroke={INK} strokeWidth={1.5} /><circle cx={-7} cy={-11} r={2} fill={INK} />
			<circle cx={6} cy={-11} r={4.5} fill="#fff" stroke={INK} strokeWidth={1.5} /><circle cx={5} cy={-11} r={2} fill={INK} />
			<path d="M -26 4 q 13 -9 26 0 q 13 9 26 0" fill="none" stroke="#e6ddff" strokeWidth={5} strokeLinecap="round" />
		</g>
	);
};
// fleeing rabbits (lon/lat start → end, start delay) and swimmers off the west coast
const RUN: [LL, LL, number][] = [
	[[117.2, -31.2], [116.1, -31.6], 0.2], [[117.6, -32.4], [116.3, -32.9], 0.35], [[116.9, -33.4], [115.9, -33.9], 0.5],
	[[118.2, -30.6], [117.0, -30.9], 0.65], [[117.9, -33.0], [116.8, -33.5], 0.8], [[116.8, -30.1], [115.6, -30.3], 0.95],
];
const SWIM: [LL, number][] = [[[115.05, -31.0], 0.0], [[114.75, -32.0], 0.3], [[115.1, -32.9], 0.6], [[114.6, -30.0], 0.9]];
export const WADots: React.FC = () => {
	const t = useT();
	const [t0, t1] = S.wadots;
	const pts = useMemo(() => {
		const out: LL[] = [];
		let n = 900;
		for (let lat = -34.9; lat < -28.6; lat += 0.2) {
			for (let lon = 115.6; lon < 121; lon += 0.2) {
				n++;
				const ll: LL = [lon + (rnd(n) - 0.5) * 0.2, lat + (rnd(n + 9) - 0.5) * 0.2];
				if (ll[0] > fenceLonAt(ll[1]) - 0.15 || !onLand(ll)) continue;
				if (Math.hypot(ll[0] - CRANBROOK[0], ll[1] - CRANBROOK[1]) < 0.3) continue;
				if (rnd(n + 4) < 0.35) continue;
				out.push(ll);
			}
		}
		return out;
	}, []);
	const v: View = lerpView({lon0: 117.7, lat0: -33.6, k: 210, cx: 540, cy: 980}, {lon0: 118.2, lat0: -31.8, k: 112, cx: 540, cy: 930}, easeInOut((t - t0) / 1.6));
	const p = proj(v);
	const [px, py] = p(CRANBROOK);
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Ocean />
			<svg width={1080} height={1920} style={{position: 'absolute'}}>
				<LandLayer v={v} rings={GEO.landFine.length ? GEO.landFine : [MAINLAND]} borders={false} id="wad" />
				<path d={pathOf([GEO.fence1], p, false)} fill="none" stroke="#FFE7A3" strokeWidth={4} opacity={0.65} strokeDasharray="2 10" strokeLinecap="round" />
				{pts.map((ll, i) => {
					const k = clamp01((t - t0 - 0.05 - rnd(i + 3) * 0.7) / 0.25);
					const [x, y] = p(ll);
					return <circle key={i} cx={x} cy={y} r={7 * k} fill="#B26BFF" stroke={INK} strokeWidth={2} opacity={0.9} />;
				})}
				{RUN.map(([a, b, d], i) => {
					const k = clamp01((t - t0 - d) / 1.9);
					if (k <= 0) return null;
					const [x0, y0] = p(a);
					const [x1, y1] = p(b);
					return <Runner key={i} x={lerp(x0, x1, k)} y={lerp(y0, y1, k)} s={1.7} t={t + i} />;
				})}
				{SWIM.map(([ll, d], i) => {
					const k = clamp01((t - t0 - 0.3 - d) / 0.4);
					if (k <= 0) return null;
					const [x, y] = p(ll);
					return <g key={i} opacity={k}><Swimmer x={x - (t - t0) * 22} y={y} s={1.6} t={t + i * 0.7} /></g>;
				})}
				{/* ceremony pin: a ribbon bow on a stick */}
				<g transform={`translate(${px}, ${py}) scale(1.5)`}>
					<line x1={0} y1={0} x2={0} y2={-70} stroke={INK} strokeWidth={8} strokeLinecap="round" />
					<line x1={0} y1={0} x2={0} y2={-70} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
					<path d="M 0 -78 L -30 -96 L -30 -60 Z M 0 -78 L 30 -96 L 30 -60 Z" fill="#e2342d" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
					<circle cx={0} cy={-78} r={9} fill="#e2342d" stroke={INK} strokeWidth={4} />
					<circle cx={0} cy={0} r={7} fill="#fff" stroke={INK} strokeWidth={3} />
				</g>
			</svg>
			<Label text="In 30+ shires," accent="on its own" t0={t0 + 0.4} t1={t1 + 0.1} x={540} y={300} size={56} />
		</AbsoluteFill>
	);
};
