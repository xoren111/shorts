// Concept B «Atlas-Stempel» — renders avatar.png (800×800) and banner.png (2560×1440) + their check sheets.
//   node concepts/B-stamp/build.mjs            → final avatar + banner + check sheets
//   node concepts/B-stamp/build.mjs avatar     → only avatar     (…/build.mjs banner → only banner)
//   node concepts/B-stamp/build.mjs explore    → avatar variants into iter/
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {C, MAP, P, countries, face, goldText, pill, page, render, pxSvg} from '../../kit/kit.mjs';
import {RED, INK, FILLS, seal, mapView, waterlines, seaMask, compass, scaleBar} from './lib.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.resolve(DIR, '../../kit/check.py');
const arg = process.argv[2] ?? 'all';

const check = (mode, png, sheet) => {
	const out = execFileSync('python3', [CHECK, mode, png, sheet], {encoding: 'utf8'});
	process.stdout.write(out);
	return out;
};

// ───────────────────────────── AVATAR ─────────────────────────────
export function avatarHtml(o = {}) {
	const W = 800;
	const {center = [12.5, 47.2], unitsW = 640, R = 338, wash = 0, vignette = 0.32, sealOpt = {}, mapFills = FILLS, paper = 0.75} = o;
	const mv = mapView(center, unitsW, W, W);
	const sw = 2.2 / mv.k;
	const map = `<svg x="0" y="0" width="${W}" height="${W}" viewBox="${mv.view.join(' ')}">
<rect x="${mv.view[0] - 100}" y="${mv.view[1] - 100}" width="${mv.view[2] + 200}" height="${mv.view[3] + 200}" fill="${C.sea}"/>
${waterlines(mv.view, mv.k, {n: 3, gapPx: 7, linePx: 1.4, opacity: 0.45})}
${countries({view: mv.view, fills: mapFills, strokeW: sw, graticule: true, deserts: false})}
</svg>`;
	let over = '';
	const rW = R * (sealOpt.bandOut ?? 0.93);
	if (wash > 0) {
		// paper wash inside the seal (keeps the red «?» legible at 32 px) + the map's linework redrawn on top,
		// so the inside still reads as an engraved atlas sheet
		over += `<defs><clipPath id="inner"><circle cx="400" cy="400" r="${rW}"/></clipPath></defs>`;
		over += `<circle cx="400" cy="400" r="${rW}" fill="${C.paper}" opacity="${wash}"/>`;
		if (o.lines) over += `<g clip-path="url(#inner)"><svg x="0" y="0" width="${W}" height="${W}" viewBox="${mv.view.join(' ')}">
<path d="${MAP.graticule}" fill="none" stroke="${C.border}" stroke-opacity="${o.lines * 0.6}" stroke-width="${1.6 / mv.k}"/>
<g fill="none" stroke="${C.border}" stroke-opacity="${o.lines}" stroke-width="${1.8 / mv.k}" stroke-linejoin="round">${MAP.countries.filter((c) => c.bbox[2] >= mv.view[0] && c.bbox[0] <= mv.view[0] + mv.view[2] && c.bbox[3] >= mv.view[1] && c.bbox[1] <= mv.view[1] + mv.view[3]).map((c) => `<path d="${c.d}"/>`).join('')}</g></svg></g>`;
	}
	if (o.rim) over += `<circle cx="400" cy="400" r="${(R + 400) / 2 + 2}" fill="none" stroke="${o.rim}" stroke-opacity="${o.rimOp ?? 0.35}" stroke-width="${400 - R + 4}"/>`;
	if (vignette > 0) over += `<defs><radialGradient id="vg" cx="0.5" cy="0.5" r="0.5"><stop offset="${o.vgStart ?? 0.78}" stop-color="${C.ink}" stop-opacity="0"/><stop offset="1" stop-color="${C.ink}" stop-opacity="${vignette}"/></radialGradient></defs><rect width="800" height="800" fill="url(#vg)"/>`;
	over += seal(400, 400, R, sealOpt);
	return page({w: W, h: W, body: pxSvg(W, W, map + over), paper});
}

const AVATAR_FINAL = {
	center: [13, 45.5], unitsW: 1050, wash: 0.66, lines: 0.5, vignette: 0.4, vgStart: 0.88,
	sealOpt: {grunge: 0.25, glyphScale: 1.66, glyphStroke: 0.022, ringWeight: 700, opacity: 1, top: 'WAS WÄRE WENN', bottom: 'GESCHICHTE AUF DER KARTE', topFont: 0.15, bottomFont: 0.11},
};

// ───────────────────────────── BANNER ─────────────────────────────
const BW = 2560, BH = 1440;
const SAFE = {x0: (BW - 1546) / 2, y0: (BH - 423) / 2, x1: (BW + 1546) / 2, y1: (BH + 423) / 2};

/** smooth path through points (Catmull-Rom → cubic Bézier) */
const spline = (pts, t = 0.5) => {
	let d = `M${pts[0][0]},${pts[0][1]}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
		const c1 = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3];
		const c2 = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3];
		d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
	}
	return d;
};
const arrowHead = ([x, y], ang, s, fill, stroke = INK) =>
	`<path transform="translate(${x} ${y}) rotate(${ang})" d="M${s * 0.9},0 L${-s * 0.55},${-s * 0.62} L${-s * 0.25},0 L${-s * 0.55},${s * 0.62} Z" fill="${fill}" stroke="${stroke}" stroke-width="${s * 0.1}" stroke-linejoin="round"/>`;
const waypoint = ([x, y], r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#EFE6CF" stroke="${INK}" stroke-width="${r * 0.42}"/>`;
const qDisc = ([x, y], r) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${C.gold}" stroke="${C.ink}" stroke-width="${r * 0.13}"/>
<text x="${-0.01 * r}" y="${0.355 * r * 1.35}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${r * 1.35}" fill="${C.ink}">?</text></g>`;

/** Atlas cartouche: light paper plate, double ink frame with concave corners, diamond finials. */
function cartouche(x0, y0, w, h, {ink = INK, fill = '#F1E9D4'} = {}) {
	const r = 26, i = 15;
	const notch = (X0, Y0, X1, Y1, rr) => `M${X0 + rr},${Y0} H${X1 - rr} A${rr},${rr} 0 0 0 ${X1},${Y0 + rr} V${Y1 - rr} A${rr},${rr} 0 0 0 ${X1 - rr},${Y1} H${X0 + rr} A${rr},${rr} 0 0 0 ${X0},${Y1 - rr} V${Y0 + rr} A${rr},${rr} 0 0 0 ${X0 + rr},${Y0} Z`;
	const x1 = x0 + w, y1 = y0 + h, cy = y0 + h / 2;
	let s = `<path d="${notch(x0, y0, x1, y1, r)}" fill="${fill}" stroke="${ink}" stroke-width="7"/>`;
	s += `<path d="${notch(x0 + i, y0 + i, x1 - i, y1 - i, r - 6)}" fill="none" stroke="${ink}" stroke-width="2.6"/>`;
	// diamond finials on the short sides
	for (const [sx, dir] of [[x0, -1], [x1, 1]]) {
		s += `<path d="M${sx},${cy - 34} L${sx + dir * 30},${cy} L${sx},${cy + 34}" fill="${fill}" stroke="${ink}" stroke-width="7" stroke-linejoin="miter"/>`;
	}
	// corner dots
	for (const [cx, cyy] of [[x0 + i + 2, y0 + i + 2], [x1 - i - 2, y0 + i + 2], [x0 + i + 2, y1 - i - 2], [x1 - i - 2, y1 - i - 2]]) s += `<circle cx="${cx}" cy="${cyy}" r="5" fill="${ink}"/>`;
	return s;
}

const BANNER_FINAL = {};

export function bannerHtml(o = {}) {
	const {center = [13, 41.5], unitsW = 1765, topic = 'ZWEITER WELTKRIEG · IMPERIEN · GRENZEN', wmSize = 108, wmCx = 1388} = o;
	const mv = mapView(center, unitsW, BW, BH);
	const k = mv.k;
	const [vx, vy] = mv.view;
	const toU = ([x, y]) => [vx + x / k, vy + y / k];
	// compass rose in the Atlantic (desktop strip, outside the phone-safe area)
	const rose = [235, 712], roseR = 165;
	const roseU = toU(rose);
	let rhumb = '';
	for (let i = 0; i < 32; i++) {
		const a = (i / 32) * Math.PI * 2;
		const L = 4000 / k;
		rhumb += `<line x1="${roseU[0]}" y1="${roseU[1]}" x2="${roseU[0] + Math.sin(a) * L}" y2="${roseU[1] - Math.cos(a) * L}" stroke="${INK}" stroke-opacity="${i % 4 === 0 ? 0.28 : 0.15}" stroke-width="${(i % 4 === 0 ? 2 : 1.3) / k}"/>`;
	}
	const map = `<svg x="0" y="0" width="${BW}" height="${BH}" viewBox="${mv.view.join(' ')}">
<defs>${seaMask('seaOnly', mv.view)}</defs>
<rect x="${vx - 100}" y="${vy - 100}" width="${mv.view[2] + 200}" height="${mv.view[3] + 200}" fill="${C.sea}"/>
${waterlines(mv.view, k, {n: 4, gapPx: 9, linePx: 1.7, opacity: 0.5})}
<g mask="url(#seaOnly)">${rhumb}</g>
${countries({view: mv.view, fills: FILLS, strokeW: 2.2 / k, graticule: true, deserts: false})}
</svg>`;

	// routes: history (solid ink) vs what-if (dashed red) — branching at the Bosporus, the «?» floats on the Black Sea
	const way = mv.px([32.4, 41.3]);
	const solidL = [mv.px([-9.1, 38.7]), mv.px([-6.6, 39.6]), [560, 790]];
	const solidR = [[1990, 812], [way[0] - 70, way[1] + 4], way, mv.px([38.0, 40.9]), mv.px([41.6, 40.75])];
	const branch = [way, mv.px([33.4, 42.5]), mv.px([35.6, 43.45]), mv.px([37.2, 43.55])];
	const qPos = mv.px([38.75, 43.6]);
	let routes = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`;
	routes += `<path d="${spline(solidL)}" stroke="${INK}" stroke-width="7"/>`;
	routes += `<path d="${spline(solidR)}" stroke="${INK}" stroke-width="7"/>`;
	routes += `<path d="${spline(branch)}" stroke="${RED}" stroke-width="8" stroke-dasharray="22 16"/>`;
	routes += `</g>`;
	const end = solidR[solidR.length - 1], pre = solidR[solidR.length - 2];
	routes += arrowHead(end, (Math.atan2(end[1] - pre[1], end[0] - pre[0]) * 180) / Math.PI, 34, INK);
	routes += waypoint(solidL[0], 13) + waypoint(way, 15);
	routes += qDisc(qPos, 52);

	// faces (friendly, curious countries looking at the what-if)
	let faces = '';
	faces += face(...mv.px([35.6, 39.35]), 25, 'curious', {skin: FILLS.TUR, look: {lookX: 0.45, lookY: -0.9}});
	faces += face(...mv.px([2.3, 46.6]), 27, 'smug', {skin: FILLS.FRA, look: {lookX: 0.4, lookY: 0.5}});
	faces += face(...mv.px([29.4, 28.3]), 27, 'curious', {skin: FILLS.EGY, look: {lookX: -0.2, lookY: -0.9}});

	// cartouche + wordmark + pill + seal (all inside the 1546×423 safe area)
	const cw = 1330, ch = 262, cx0 = 686, cy0 = 566;
	let ui = cartouche(cx0, cy0, cw, ch);
	ui += goldText(wmCx, cy0 + 102, 'WAS WÄRE WENN', wmSize, {sw: wmSize * 0.15, ls: wmSize * 0.02});
	if (topic) {
		ui += `<text x="${wmCx}" y="${cy0 + 186}" text-anchor="middle" dominant-baseline="middle" font-family="Montserrat" font-weight="700" font-size="32" letter-spacing="3.6" fill="${INK}">${topic}</text>`;
		ui += `<g stroke="${INK}" stroke-width="2.6"><line x1="${wmCx - 548}" y1="${cy0 + 186}" x2="${wmCx - 452}" y2="${cy0 + 186}"/><line x1="${wmCx + 452}" y1="${cy0 + 186}" x2="${wmCx + 548}" y2="${cy0 + 186}"/><path d="M${wmCx - 470},${cy0 + 186} l8,-8 l8,8 l-8,8 z M${wmCx + 454},${cy0 + 186} l8,-8 l8,8 l-8,8 z" fill="${INK}" stroke="none"/></g>`;
	}
	ui += pill(wmCx, cy0 + ch, 'GESCHICHTE AUF DER KARTE', 46, {bw: 5});
	ui += seal(651, 708, 142, {...AVATAR_FINAL.sealOpt, rot: -12, grunge: 0.3, under: {opacity: 0.72}});

	const svg = pxSvg(BW, BH, map + routes + faces + compass(rose[0], rose[1], roseR) + scaleBar(70, 1280, 420, 18) + ui);
	return page({w: BW, h: BH, body: svg, paper: 0.7});
}

// ───────────────────────────── RUN ─────────────────────────────
const t0 = Date.now();
if (arg === 'explore') {
	const IT = path.join(DIR, 'iter');
	const S = {...AVATAR_FINAL.sealOpt};
		const V = {
		a7_final: {...AVATAR_FINAL},
		a7_more_map: {...AVATAR_FINAL, wash: 0.6, lines: 0.5},
		a7_nostroke: {...AVATAR_FINAL, sealOpt: {...S, glyphStroke: 0}},
	};
	for (const [k, o] of Object.entries(V)) {
		const png = path.join(IT, k + '.png');
		await render(avatarHtml(o), png, 800, 800);
		check('avatar', png, path.join(IT, k + '_check.png'));
	}
} else {
	if (arg === 'all' || arg === 'avatar') {
		const png = path.join(DIR, 'avatar.png');
		await render(avatarHtml(AVATAR_FINAL), png, 800, 800);
		check('avatar', png, path.join(DIR, 'avatar_check.png'));
	}
	if (arg === 'all' || arg === 'banner') {
		const png = path.join(DIR, 'banner.png');
		await render(bannerHtml(BANNER_FINAL), png, 2560, 1440);
		check('banner', png, path.join(DIR, 'banner_check.png'));
	}
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
