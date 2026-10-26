// Concept B «Atlas-Stempel»: shared pieces for avatar + banner (round rubber seal, map helpers, atlas ornaments).
import {C, MAP, P, countries} from '../../kit/kit.mjs';
export {MAP};

export const RED = C.alarm; // stamp ink, same red as the Shorts' «WAS WÄRE WENN» stamp
export const INK = '#2B231C'; // engraving ink for atlas ornaments (warmer than C.ink)

/** Modern-border country colours, same muted flat range as the Shorts (Germany steel, France navy, Italy olive …). */
export const FILLS = {
	DEU: C.steel, FRA: C.navy, ITA: C.olive, GBR: C.rose, IRL: C.moss, ESP: C.ochre, PRT: C.moss,
	POL: C.rose, ROU: C.ochre, RUS: C.brick, TUR: C.plum, GRC: '#7C9CC0', CHE: C.plum, AUT: '#B9A57C',
	NOR: '#6E7F8C', SWE: '#8EA0AC', FIN: '#B9A57C', EGY: '#D9C49A', MAR: '#C98E7E', DZA: C.neutral,
	BLR: C.olive, UKR: '#D2B776', HUN: C.moss, CZE: C.ochre, SRB: C.rose, BGR: C.olive, SYR: '#B9A57C',
	IRN: C.olive, IRQ: C.rose, SAU: C.sand, LBY: '#CDB27A', TUN: C.olive, NLD: C.ochre, BEL: C.sand, DNK: C.rose,
	KAZ: '#CDB27A', GEO: C.olive, ARM: C.ochre, AZE: C.rose, ISR: C.sand, JOR: C.olive, LBN: C.rose,
	SVK: C.rose, SVN: C.olive, HRV: C.ochre, BIH: C.sand, MNE: C.rose, ALB: C.plum, MKD: C.ochre, KOS: C.olive,
	MDA: C.rose, LTU: C.sand, LVA: C.rose, EST: C.navy, LUX: C.rose, CYP: C.ochre,
};

let uid = 0;

/** rubber-stamp texture filter: soft pressure blotches + fine speckles punched out of the ink (g = strength 0…1) */
const grungeFilter = (id, R, g, seed) => `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${(0.02 * 340) / R}" numOctaves="3" seed="${seed}" result="n1"/>
<feColorMatrix in="n1" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 ${7 * (0.62 + 0.3 * (1 - g))}" result="m1"/>
<feTurbulence type="fractalNoise" baseFrequency="${(0.5 * 340) / R}" numOctaves="2" seed="${seed + 11}" result="n2"/>
<feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -16 0 0 0 ${16 * (0.64 + 0.3 * (1 - g))}" result="m2"/>
<feComposite in="m1" in2="m2" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="m"/>
<feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;

/**
 * Round rubber seal centred at (cx, cy), outer radius R.
 * style 'band': thin outer line + solid red band with the ring text reversed out + thin inner line (reads as a bold
 * ring at 32 px); style 'lines': classic double ring with red text between.
 * mode: 'ink' (red glyph), 'gold' (gold glyph with ink outline, the Shorts' «?»), 'knock' (solid disc, glyph reversed).
 * Ring text is decorative texture only (never readable at 98 px).
 */
export function seal(cx, cy, R, o = {}) {
	const {
		rot = -10, color = RED, glyph = '?', ring = 'WAS WÄRE WENN • GESCHICHTE AUF DER KARTE • ', mode = 'ink', style = 'band',
		grunge = 0.5, opacity = 0.96, blend = 'normal', glyphScale = 1.45, ringFont = 0.13, ringWeight = 800,
		bandOut = 0.93, bandIn = 0.72, lineW = 0.028, innerLine = 0.67, glyphDy = 0, glyphDx = 0, goldSw = 0.075, under = null,
		top = null, bottom = null, topFont = 0.14, bottomFont = 0.105, topSpan = 128, bottomSpan = 132, starR = 0.05,
	} = o;
	const id = 'seal' + uid++;
	const F = glyphScale * R;
	const gy = 0.355 * F + glyphDy * R;
	const gx = -0.01 * F + glyphDx * R;
	const rB = (R * bandOut + R * bandIn) / 2;
	const wB = R * (bandOut - bandIn);
	const rTxt = rB;
	const circ = 2 * Math.PI * rTxt;
	const fz = ringFont * R;
	const lw = lineW * R;
	const star = (x, y, r, fill) => {
		let d = '';
		for (let i = 0; i < 10; i++) {
			const a = -Math.PI / 2 + (i * Math.PI) / 5;
			const rr = i % 2 ? r * 0.42 : r;
			d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`;
		}
		return `<path d="${d}Z" fill="${fill}"/>`;
	};
	const txt = (fill) =>
		top
			? `<text font-family="Montserrat" font-weight="${ringWeight}" font-size="${topFont * R}" fill="${fill}" dominant-baseline="central" text-anchor="middle"><textPath href="#${id}t" startOffset="50%" textLength="${(Math.PI * rTxt * topSpan) / 180}" lengthAdjust="spacing">${top}</textPath></text>` +
				`<text font-family="Montserrat" font-weight="${ringWeight}" font-size="${bottomFont * R}" fill="${fill}" dominant-baseline="central" text-anchor="middle"><textPath href="#${id}b" startOffset="50%" textLength="${(Math.PI * rTxt * bottomSpan) / 180}" lengthAdjust="spacing">${bottom}</textPath></text>` +
				star(-rTxt, 0, starR * R * 1.6, fill) + star(rTxt, 0, starR * R * 1.6, fill)
			: `<text font-family="Montserrat" font-weight="${ringWeight}" font-size="${fz}" fill="${fill}" dominant-baseline="central"><textPath href="#${id}p" textLength="${circ * 0.997}" lengthAdjust="spacing">${ring}</textPath></text>`;
	let s = `<defs>${grunge > 0 ? grungeFilter(id + 'g', R, grunge, 5 + uid * 3) : ''}<path id="${id}p" d="M ${-rTxt},0 A ${rTxt},${rTxt} 0 1 1 ${rTxt},0 A ${rTxt},${rTxt} 0 1 1 ${-rTxt},0" fill="none"/>`;
	s += `<path id="${id}t" d="M ${-rTxt},0 A ${rTxt},${rTxt} 0 0 1 ${rTxt},0" fill="none"/><path id="${id}b" d="M ${-rTxt},0 A ${rTxt},${rTxt} 0 0 0 ${rTxt},0" fill="none"/>`;
	if (style === 'band') s += `<mask id="${id}m" maskUnits="userSpaceOnUse" x="${-R * 1.2}" y="${-R * 1.2}" width="${R * 2.4}" height="${R * 2.4}"><circle r="${rB}" fill="none" stroke="#fff" stroke-width="${wB}"/>${ring || top ? txt('#000') : ''}</mask>`;
	s += `</defs><g transform="translate(${cx} ${cy}) rotate(${rot})">`;
	if (under) s += `<circle r="${R * bandOut}" fill="${under.fill ?? C.paper}" opacity="${under.opacity ?? 0.75}"/>`;
	s += `<g opacity="${opacity}" style="mix-blend-mode:${blend}" ${grunge > 0 ? `filter="url(#${id}g)"` : ''}>`;
	if (style === 'band') {
		s += `<circle r="${R - lw / 2}" fill="none" stroke="${color}" stroke-width="${lw}"/>`;
		s += `<circle r="${rB}" fill="none" stroke="${color}" stroke-width="${wB}" mask="url(#${id}m)"/>`;
		if (mode === 'knock') s += `<circle r="${R * innerLine}" fill="${color}"/>`;
		else s += `<circle r="${R * innerLine}" fill="none" stroke="${color}" stroke-width="${lw}"/>`;
	} else {
		s += `<circle r="${R * 0.955}" fill="none" stroke="${color}" stroke-width="${R * 0.09}"/>`;
		s += `<circle r="${R * 0.735}" fill="none" stroke="${color}" stroke-width="${R * 0.035}"/>`;
		if (ring) s += txt(color);
	}
	if (mode === 'ink') s += `<text x="${gx}" y="${gy}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${F}" fill="${color}" stroke="${color}" stroke-width="${F * (o.glyphStroke ?? 0)}" stroke-linejoin="round">${glyph}</text>`;
	s += `</g>`;
	if (mode === 'knock') s += `<text x="${gx}" y="${gy}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${F}" fill="${o.paper ?? C.paper}">${glyph}</text>`;
	if (mode === 'gold') s += `<text x="${gx}" y="${gy}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${F}" fill="${C.gold}" stroke="${C.ink}" stroke-width="${F * goldSw}" stroke-linejoin="round" paint-order="stroke">${glyph}</text>`;
	return s + `</g>`;
}

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
