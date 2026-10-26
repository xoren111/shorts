// Natural Earth 10m land + lakes (public domain) → src/data/geo.json for the Yellow Fleet maps:
//   route: Suez → Hamburg (box −14…38 E, 26…59 N), suez: canal close-up with the Bitter Lakes and Lake Timsah (32.0…32.9 E, 29.85…31.35 N)
//   node tools/geo/build-geo.mjs
import fs from 'node:fs';
import path from 'node:path';
import * as shp from 'shapefile';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW = path.join(process.env.HOME, 'shorts/deutschland-geschichte/data/raw');
const read = async (p) => { const out = []; const s = await shp.open(p, undefined, {encoding: 'utf-8'}); for (;;) { const r = await s.read(); if (r.done) break; out.push(r.value); } return out; };
function dp(pts, eps) {
	if (pts.length < 3) return pts;
	const [a, b] = [pts[0], pts[pts.length - 1]];
	let imax = 0, dmax = 0;
	const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
	for (let i = 1; i < pts.length - 1; i++) {
		const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
		if (d > dmax) { dmax = d; imax = i; }
	}
	if (dmax <= eps) return [a, b];
	return [...dp(pts.slice(0, imax + 1), eps).slice(0, -1), ...dp(pts.slice(imax), eps)];
}
function dpRing(r, eps) {
	let k = 0, dm = -1;
	for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]); if (d > dm) { dm = d; k = i; } }
	return [...dp(r.slice(0, k + 1), eps).slice(0, -1), ...dp(r.slice(k), eps)];
}
const r4 = (p) => [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4];
const rings = (feats, box, eps) => {
	const inBox = ([x, y]) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
	const out = [];
	for (const f of feats) {
		const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
		for (const poly of polys) {
			if (!poly[0].some(inBox)) continue;
			const s = dpRing(poly[0], eps).map(r4);
			if (s.length >= 4) out.push(s);
		}
	}
	return out;
};
const land = await read(path.join(RAW, 'ne_10m_land/ne_10m_land.shp'));
const lakes = await read(path.join(RAW, 'ne_10m_lakes/ne_10m_lakes.shp'));
const ROUTE = [-14, 26, 38, 59], SUEZ = [31.6, 29.7, 33.3, 31.5];
const out = {
	route: {box: ROUTE, land: rings(land, ROUTE, 0.06)},
	suez: {box: SUEZ, land: rings(land, SUEZ, 0.004), lakes: rings(lakes, SUEZ, 0.002), lakeNames: lakes.filter((f) => rings([f], SUEZ, 0.01).length).map((f) => f.properties.name)},
};
fs.writeFileSync(path.join(ROOT, 'src/data/geo.json'), JSON.stringify(out));
console.log('route land', out.route.land.length, 'suez land', out.suez.land.length, 'suez lakes', out.suez.lakes.length, out.suez.lakeNames,
	(fs.statSync(path.join(ROOT, 'src/data/geo.json')).size / 1024).toFixed(0) + ' KB');
