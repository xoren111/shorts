// Atlas ornaments for the final banner — copied from concept B (concepts/B-stamp/lib.mjs): map view helper,
// engraved coastal water-lines, sea mask, compass rose, scale bar. (Seal/grunge parts dropped.)
import {C, MAP, P, countries} from '../kit/kit.mjs';
export const INK = '#2B231C'; // engraving ink for atlas ornaments (warmer than C.ink)
const RED = C.alarm;

/** Map view helper: centre [lon, lat], width in map units, aspect w/h → {view, px([lon,lat]), k (px per unit)} */
export function mapView([lon, lat], unitsW, W, H) {
	const [cx, cy] = P([lon, lat]);
	const unitsH = (unitsW * H) / W;
	const view = [cx - unitsW / 2, cy - unitsH / 2, unitsW, unitsH];
	const k = W / unitsW;
	const px = (ll) => {
		const [x, y] = P(ll);
		return [(x - view[0]) * k, (y - view[1]) * k];
	};
	const u2px = ([x, y]) => [(x - view[0]) * k, (y - view[1]) * k];
	return {view, k, px, u2px};
}

const visible = (view, pad = 60) => {
	const [x0, y0, w, h] = view;
	return MAP.countries.filter((c) => c.bbox[2] >= x0 - pad && c.bbox[0] <= x0 + w + pad && c.bbox[3] >= y0 - pad && c.bbox[1] <= y0 + h + pad);
};

/** Engraved-atlas coastal water-lines: concentric rings around all land, drawn under the land. */
export function waterlines(view, k, {n = 4, gapPx = 9, linePx = 1.6, color = '#5E7C79', opacity = 0.5} = {}) {
	const d = visible(view, 200).map((c) => c.d).join('');
	let s = `<g fill="none" stroke-linejoin="round" opacity="${opacity}">`;
	for (let i = n; i >= 1; i--) {
		const w = (2 * i * gapPx) / k;
		s += `<path d="${d}" stroke="${color}" stroke-width="${w}" stroke-opacity="${0.9 - i * 0.14}"/>`;
		s += `<path d="${d}" stroke="${C.sea}" stroke-width="${w - (2 * linePx) / k}"/>`;
	}
	return s + `</g>`;
}

/** Land mask (white = sea) so rhumb lines etc. stay on water. */
export function seaMask(id, view) {
	const list = visible(view, 200);
	const [x0, y0, w, h] = view;
	return `<mask id="${id}" maskUnits="userSpaceOnUse" x="${x0 - 500}" y="${y0 - 500}" width="${w + 1000}" height="${h + 1000}"><rect x="${x0 - 500}" y="${y0 - 500}" width="${w + 1000}" height="${h + 1000}" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="${6}">${list.map((c) => `<path d="${c.d}"/>`).join('')}</g></mask>`;
}

export {countries};

/** Atlas compass rose (16 points, bevelled ink/paper halves, tick ring, red north tip), centred at (cx, cy). */
export function compass(cx, cy, R, {ink = INK, paper = '#EFE6CF', north = RED, gold = C.gold, n = true} = {}) {
	let s = `<g transform="translate(${cx} ${cy})">`;
	s += `<circle r="${R}" fill="${paper}" fill-opacity="0.55" stroke="${ink}" stroke-width="${R * 0.022}"/>`;
	s += `<circle r="${R * 0.9}" fill="none" stroke="${ink}" stroke-width="${R * 0.009}"/>`;
	for (let i = 0; i < 72; i++) {
		const a = (i / 72) * Math.PI * 2;
		const l = i % 9 === 0 ? 0.8 : i % 2 === 0 ? 0.86 : 0.88;
		s += `<line x1="${Math.sin(a) * R * l}" y1="${-Math.cos(a) * R * l}" x2="${Math.sin(a) * R * 0.9}" y2="${-Math.cos(a) * R * 0.9}" stroke="${ink}" stroke-width="${R * (i % 9 === 0 ? 0.014 : 0.007)}"/>`;
	}
	s += `<circle r="${R * 0.5}" fill="none" stroke="${ink}" stroke-width="${R * 0.008}" stroke-dasharray="${R * 0.02} ${R * 0.025}"/>`;
	const pt = (deg, L, w, dark, light, sw) => {
		const a = (deg * Math.PI) / 180;
		const T = [Math.sin(a) * L, -Math.cos(a) * L];
		const pL = [Math.sin(a - Math.PI / 2) * w, -Math.cos(a - Math.PI / 2) * w];
		const pR = [Math.sin(a + Math.PI / 2) * w, -Math.cos(a + Math.PI / 2) * w];
		return `<path d="M0,0 L${T} L${pL} Z" fill="${dark}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M0,0 L${T} L${pR} Z" fill="${light}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
	};
	for (let i = 0; i < 8; i++) s += pt(22.5 + i * 45, R * 0.5, R * 0.06, ink, paper, R * 0.008);
	for (let i = 0; i < 4; i++) s += pt(45 + i * 90, R * 0.7, R * 0.1, ink, paper, R * 0.01);
	for (let i = 0; i < 4; i++) s += pt(i * 90, R * 0.97, R * 0.13, i === 0 ? north : ink, paper, R * 0.012);
	s += `<circle r="${R * 0.075}" fill="${gold}" stroke="${ink}" stroke-width="${R * 0.018}"/>`;
	// north finial: small ink crown-arrow instead of a letter (the banner carries no extra text)
	if (n) s += `<path d="M0,${-R * 1.22} L${R * 0.09},${-R * 1.04} L0,${-R * 1.09} L${-R * 0.09},${-R * 1.04} Z" fill="${north}" stroke="${ink}" stroke-width="${R * 0.014}" stroke-linejoin="round"/><circle cx="0" cy="${-R * 1.27}" r="${R * 0.03}" fill="${ink}"/>`;
	return s + `</g>`;
}

/** Scale bar of alternating ink/paper blocks (no numbers — the banner allows no extra text). */
export function scaleBar(x, y, w, h, {n = 5, ink = INK, paper = '#EFE6CF'} = {}) {
	let s = `<g transform="translate(${x} ${y})">`;
	const seg = w / n;
	for (let i = 0; i < n; i++) s += `<rect x="${i * seg}" y="0" width="${seg}" height="${h}" fill="${i % 2 ? paper : ink}" stroke="${ink}" stroke-width="${h * 0.12}"/>`;
	for (let i = 0; i <= n; i++) s += `<line x1="${i * seg}" y1="${-h * 0.6}" x2="${i * seg}" y2="0" stroke="${ink}" stroke-width="${h * 0.14}"/>`;
	s += `<line x1="0" y1="${h * 1.6}" x2="${w}" y2="${h * 1.6}" stroke="${ink}" stroke-width="${h * 0.1}"/>`;
	return s + `</g>`;
}
