// Natural Earth 10m land + admin-1 (PD) and WA DPIRD fence No. 1 (CC BY 4.0, used as a guide, simplified) → src/data/geo.json
// Output: lon/lat rings simplified (Douglas–Peucker in degrees) for the Australian maps; projection happens in the scenes.
//   node tools/geo/build-geo.mjs
import fs from 'node:fs';
import path from 'node:path';
import * as shp from 'shapefile';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const LAND = path.join(process.env.HOME, 'shorts/deutschland-geschichte/data/raw/ne_10m_land/ne_10m_land.shp');
const ADM = path.join(process.env.HOME, 'shorts/barbarossa-1941-v2/data/geo/ne_10m_admin_1_states_provinces/ne_10m_admin_1_states_provinces.shp');
const BOX = [110, -46, 157, -8];
const inBox = ([x, y]) => x >= BOX[0] && x <= BOX[2] && y >= BOX[1] && y <= BOX[3];
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
	// closed ring: split at the vertex farthest from the start, simplify both halves
	let k = 0, dm = -1;
	for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]); if (d > dm) { dm = d; k = i; } }
	return [...dp(r.slice(0, k + 1), eps).slice(0, -1), ...dp(r.slice(k), eps)];
}
const r4 = (p) => [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4];
const land = await read(LAND);
const rings = [], ringsFine = [];
for (const f of land) {
	const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
	for (const poly of polys) {
		const ring = poly[0];
		if (!ring.some(inBox)) continue;
		const s = dpRing(ring, 0.03).map(r4);
		if (s.length >= 4) rings.push(s);
		// fine version only around Spencer Gulf / Yorke Peninsula (S15 map) and the WA south-west (S17)
		if (ring.some(([x, y]) => (x > 133 && x < 140 && y > -36.5 && y < -31) || (x > 113 && x < 124 && y > -36 && y < -27))) {
			const fz = dpRing(ring, 0.004).map(r4);
			if (fz.length >= 4) ringsFine.push(fz);
		}
	}
}
const adm = (await read(ADM)).filter((f) => String(f.properties.iso_a2).trim() === 'AU');
const topo = topology({s: {type: 'FeatureCollection', features: adm}});
const borders = mesh(topo, topo.objects.s, (a, b) => a !== b).coordinates.map((l) => dp(l, 0.02).map(r4));
const fence = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/geo/fence_no1.geojson'))).features[0].geometry.coordinates;
const fenceS = dp(fence, 0.01).map(r4);
const out = {box: BOX, land: rings, landFine: ringsFine, borders, fence1: fenceS};
fs.writeFileSync(path.join(ROOT, 'src/data/geo.json'), JSON.stringify(out));
console.log('land rings', rings.length, 'fine', ringsFine.length, 'borders', borders.length, 'fence pts', fence.length, '→', fenceS.length,
	(fs.statSync(path.join(ROOT, 'src/data/geo.json')).size / 1024).toFixed(0) + ' KB');
console.log('fence ends', fenceS[0], fenceS[fenceS.length - 1]);
