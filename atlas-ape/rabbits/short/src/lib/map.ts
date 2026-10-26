import geo from '../data/geo.json';

// Natural Earth (PD) land/borders + WA fence No. 1 (DPIRD, CC BY 4.0, simplified), lon/lat → screen px (Mercator).
export type LL = [number, number];
export const GEO = geo as {box: number[]; land: LL[][]; landFine: LL[][]; borders: LL[][]; fence1: LL[]};

const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
export type View = {lon0: number; lat0: number; k: number; cx: number; cy: number};
/** k = px per degree of longitude */
export const proj = (v: View) => ([lon, lat]: LL): [number, number] => [v.cx + (lon - v.lon0) * v.k, v.cy - (merc(lat) - merc(v.lat0)) * (180 / Math.PI) * v.k];
export const lerpView = (a: View, b: View, k: number): View => ({
	lon0: a.lon0 + (b.lon0 - a.lon0) * k,
	lat0: a.lat0 + (b.lat0 - a.lat0) * k,
	k: Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * k),
	cx: a.cx + (b.cx - a.cx) * k,
	cy: a.cy + (b.cy - a.cy) * k,
});
export const pathOf = (rings: LL[][], p: (ll: LL) => [number, number], close = true) =>
	rings.map((r) => r.map((ll, i) => (i ? 'L' : 'M') + p(ll).map((v) => v.toFixed(1)).join(' ')).join('') + (close ? 'Z' : '')).join('');

const area = (r: LL[]) => {
	let a = 0;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
	return Math.abs(a / 2);
};
/** the two big Australian rings: mainland and Tasmania */
const sorted = [...GEO.land].sort((a, b) => area(b) - area(a));
export const MAINLAND = sorted[0];
export const TASMANIA = sorted.find((r) => r.every(([x, y]) => x > 143 && x < 149.5 && y < -39.5 && y > -44)) ?? sorted[1];
export const inRing = (r: LL[], [x, y]: LL) => {
	let c = false;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
		const [xi, yi] = r[i];
		const [xj, yj] = r[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
	}
	return c;
};
export const onLand = (ll: LL) => inRing(MAINLAND, ll) || inRing(TASMANIA, ll);

/** deterministic pseudo-random in [0, 1) */
export const rnd = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};
/** great-circle-ish distance in km (equirectangular, fine at this scale) */
export const km = ([a, b]: LL, [c, d]: LL) => {
	const x = ((c - a) * Math.PI) / 180 * Math.cos(((b + d) / 2) * (Math.PI / 180));
	const y = ((d - b) * Math.PI) / 180;
	return Math.hypot(x, y) * 6371;
};
/** fence No. 1 longitude at a latitude (the line runs roughly N–S) */
export const fenceLonAt = (lat: number) => {
	const f = GEO.fence1;
	for (let i = 1; i < f.length; i++) {
		const [x0, y0] = f[i - 1];
		const [x1, y1] = f[i];
		if ((lat - y0) * (lat - y1) <= 0 && y0 !== y1) return x0 + ((lat - y0) / (y1 - y0)) * (x1 - x0);
	}
	return lat > -26 ? 119.7 : 120.5;
};
