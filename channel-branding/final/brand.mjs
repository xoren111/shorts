// «Was Wäre Wenn» — final brand system: shared pieces for avatar, banner and watermark.
// One mascot (the gold Montserrat-Black «?» with the Shorts' country-face eyes), one gold, one ink,
// one outline/extrusion ratio, one pill style. Glyphs come straight from the embedded Montserrat via fontkit,
// so the outline, the extrusion and the eye placement are exact (no hand-measured text widths).
import {createRequire} from 'node:module';
import {C, P, MAP, ISO} from '../kit/kit.mjs';

const require = createRequire('/Users/khorengrigoryan/shorts/oel-1941/package.json');
const fontkit = require('fontkit');
const FONT = fontkit.openSync('/Users/khorengrigoryan/shorts/channel-branding/kit/fonts/Montserrat-VF.ttf');
const W900 = FONT.getVariation({wght: 900});
const W800 = FONT.getVariation({wght: 800});

// ------------------------------------------------------------------ system constants
export const GOLD = C.gold; // #F2B705 — the Shorts' title gold
export const INK = C.ink; // #1E1A17 — every outline, contour, brow and extrusion
export const OUT = 0.058; // outline stroke (total width) / font size, for mascot AND wordmark
export const DEPTH = 0.4; // extrusion depth / outline stroke (same sticker depth everywhere)
export const EXDIR = [0.34, 0.94]; // extrusion direction (down, slightly right)

// ------------------------------------------------------------------ glyph outlines
const Q = W900.layout('?').glyphs[0];
export const QPATH = Q.path.toSVG(); // font units, y up
const QB = Q.bbox; // −13…573 × −10…716
export const QC = [(QB.minX + QB.maxX) / 2, (QB.minY + QB.maxY) / 2]; // glyph centre (font units)
export const QW = (QB.maxX - QB.minX) / 1000, QH = (QB.maxY - QB.minY) / 1000;

/**
 * Text as one SVG path (font units, y DOWN, baseline at 0, starts at x 0) + its width.
 * Umlaut dots are lifted by `lift` em (Montserrat Black's Ä dots sit so close to the A that a thick outline fuses
 * them into one lump — lifting opens a clean gap of paper between them).
 */
export function textPath(str, {weight = 900, ls = 0, lift = 0} = {}) {
	const font = weight >= 900 ? W900 : W800;
	const run = font.layout(str);
	let x = 0, d = '';
	run.glyphs.forEach((g, i) => {
		const pos = run.positions[i];
		let p = g.path.toSVG();
		const tr = (pp, dy) => pp.replace(/(-?\d*\.?\d+)\s*(-?\d*\.?\d+)/g, (_, a, b) => `${(+a + x + pos.xOffset).toFixed(1)} ${(-(+b) - dy).toFixed(1)}`);
		if (lift && g.codePoints.some((c) => [196, 214, 220].includes(c))) {
			// split sub-paths: the dots are the sub-paths whose y-min lies above the cap height (700)
			const subs = p.split(/(?=M)/);
			p = subs.map((sp) => {
				const ys = [...sp.matchAll(/(-?\d*\.?\d+)\s*(-?\d*\.?\d+)/g)].map((m) => +m[2]);
				return Math.min(...ys) > 690 ? tr(sp, lift * 1000) : tr(sp, 0);
			}).join('');
		} else p = tr(p, 0);
		d += p;
		x += pos.xAdvance + ls * 1000;
	});
	const width = x - ls * 1000;
	return {d, width};
}
/** advance width (em) of a string */
export const textW = (str, weight = 900, ls = 0) => {
	const run = (weight >= 900 ? W900 : W800).layout(str);
	return run.advanceWidth / 1000 + ls * (str.length - 1);
};

// ------------------------------------------------------------------ faces (Shorts style, per-eye control)
/**
 * Two big white eyes with dark contour + one-line brows (the Shorts' country faces), centred at (x, y),
 * eye radius r. Per-eye {open, browY, browTilt, lid}; shared pupil/look. Weights in absolute units:
 * sw = eye contour, bw = brow stroke. lid = upper-lid cover (skin colour) 0…1.
 */
export function eyes(x, y, r, {L = {}, R = {}, pupil = 0.92, lookX = 0, lookY = 0, sw = 0.15 * r, bw = 0.3 * r, skin = GOLD, gap = 1.12, browLen = 1.6, browBase = -1.52, id = 'e', halo = 0, haloColor = C.paper} = {}) {
	let s = `<g transform="translate(${f(x)} ${f(y)})">`;
	if (halo) for (const side of [-1, 1]) {
		const m = {open: 1, browY: 0, browTilt: 0, ...(side < 0 ? L : R)};
		const ex = side * gap * r, ry = r * 1.06 * m.open, base = browBase * r + m.browY * 0.3 * r;
		s += `<ellipse cx="${f(ex)}" cy="0" rx="${f(r)}" ry="${f(ry)}" fill="${haloColor}" stroke="${haloColor}" stroke-width="${f(sw + 2 * halo)}"/>`;
		s += `<path d="M${f(side * 0.25 * r)},${f(base - m.browTilt * 0.4 * r)} L${f(side * (0.25 + browLen) * r)},${f(base + m.browTilt * 0.2 * r)}" stroke="${haloColor}" stroke-width="${f(bw + 2 * halo)}" stroke-linecap="round"/>`;
	}
	for (const [side, m0] of [[-1, L], [1, R]]) {
		const m = {open: 1, browY: 0, browTilt: 0, lid: 0, ...m0};
		const ex = side * gap * r, ry = r * 1.06 * m.open;
		const px = ex + lookX * 0.36 * r, py = lookY * 0.36 * r * Math.min(1, m.open);
		const pr = 0.42 * r * pupil;
		const base = browBase * r + m.browY * 0.3 * r;
		const inner = base - m.browTilt * 0.4 * r, outer = base + m.browTilt * 0.2 * r;
		const cid = `${id}${side < 0 ? 'l' : 'r'}`;
		s += `<clipPath id="${cid}"><ellipse cx="${f(ex)}" cy="0" rx="${f(r)}" ry="${f(ry)}"/></clipPath>`;
		s += `<ellipse cx="${f(ex)}" cy="0" rx="${f(r)}" ry="${f(ry)}" fill="${C.white}"/>`;
		s += `<g clip-path="url(#${cid})"><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="${INK}"/><circle cx="${f(px - pr * 0.32)}" cy="${f(py - pr * 0.34)}" r="${f(pr * 0.27)}" fill="${C.white}"/>`;
		if (m.lid) s += `<rect x="${f(ex - r * 1.2)}" y="${f(-ry - r)}" width="${f(r * 2.4)}" height="${f(r + 2 * ry * m.lid)}" fill="${skin}"/><path d="M${f(ex - r * 1.2)},${f(-ry + 2 * ry * m.lid)} H${f(ex + r * 1.2)}" stroke="${INK}" stroke-width="${f(sw)}"/>`;
		s += `</g><ellipse cx="${f(ex)}" cy="0" rx="${f(r)}" ry="${f(ry)}" fill="none" stroke="${INK}" stroke-width="${f(sw)}"/>`;
		const bx0 = side * 0.25 * r, bx1 = side * (0.25 + browLen) * r;
		s += `<path d="M${f(bx0)},${f(inner)} L${f(bx1)},${f(outer)}" fill="none" stroke="${INK}" stroke-width="${f(bw)}" stroke-linecap="round"/>`;
	}
	return s + `</g>`;
}
const f = (v) => +v.toFixed(2);

/** the mascot's expression: curious — both eyes wide open, right brow raised, looking up-right («Was wäre, wenn …?») */
export const CURIOUS = {L: {open: 1.0, browY: 0.05, browTilt: 0.05}, R: {open: 1.04, browY: -0.75, browTilt: 0.18}, lookX: 0.32, lookY: -0.38};

/**
 * The mascot: gold «?» centred at (cx, cy) with font size S, rotated rot°. face = {at: [x, y] font units (y up),
 * r: eye radius (font units), ...expression}. Outline OUT·S, extrusion DEPTH·outline.
 * simple = true → no extrusion, for the watermark.
 */
export function mascot(cx, cy, S, {rot = -6, face = {}, out = OUT, depth = DEPTH, fill = GOLD, simple = false, id = 'm', eyeK = {}, halo = 0} = {}) {
	const k = S / 1000;
	const sw = out * 1000; // in font units
	const g = `translate(${-QC[0]} ${QC[1]}) scale(1 -1)`;
	const dd = simple ? 0 : depth * sw;
	let s = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${rot}) scale(${k})">`;
	if (halo) {
		const hp = (t) => `<path transform="${t}${g}" d="${QPATH}" fill="${C.paper}" stroke="${C.paper}" stroke-width="${sw + 2 * halo}" stroke-linejoin="round"/>`;
		s += hp('');
		if (dd) s += hp(`translate(${f(EXDIR[0] * dd)} ${f(EXDIR[1] * dd)}) `);
	}
	if (dd) s += `<path transform="translate(${f(EXDIR[0] * dd)} ${f(EXDIR[1] * dd)}) ${g}" d="${QPATH}" fill="${INK}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
	s += `<path transform="${g}" d="${QPATH}" fill="${INK}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
	s += `<path transform="${g}" d="${QPATH}" fill="${fill}"/>`;
	const F = {at: [352, 600], r: 86, ...CURIOUS, ...face};
	const ex = F.at[0] - QC[0], ey = QC[1] - F.at[1];
	s += eyes(ex, ey, F.r, {...F, halo, skin: fill, sw: eyeK.sw ?? 0.16 * F.r, bw: eyeK.bw ?? 0.8 * sw * 0.5 * 1.15, id});
	return s + `</g>`;
}

/**
 * Wordmark as outlined gold path with the same outline ratio + extrusion as the mascot.
 * (x, y) = centre of the cap height band; F = font size. Returns {svg, w}.
 */
export function wordmark(x, y, text, F, {lift = 0.16, ls = 0.004, out = 0.165, fill = GOLD} = {}) {
	const {d, width} = textPath(text, {lift, ls});
	const k = F / 1000, sw = out * 1000, dd = DEPTH * sw;
	const tx = x - (width * k) / 2, ty = y + 0.35 * F; // cap height 700 → centre at 350
	const g = `translate(${f(tx)} ${f(ty)}) scale(${k})`;
	let s = `<g transform="${g}">`;
	s += `<path transform="translate(${f(EXDIR[0] * dd)} ${f(EXDIR[1] * dd)})" d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
	s += `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/><path d="${d}" fill="${fill}"/>`;
	const ys = [...d.matchAll(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g)].map((m) => +m[2]);
	// visible top / bottom (px, relative to y) incl. outline and extrusion
	const top = 0.35 * F + (Math.min(...ys) - sw / 2) * k, bot = 0.35 * F + (Math.max(...ys) + sw / 2 + EXDIR[1] * dd) * k;
	return {svg: s + `</g>`, w: (width + sw) * k, top, bot};
}

/** dark pill with white Montserrat ExtraBold caps + thin gold keyline (the Shorts' scene labels), exact width */
export function pill(x, y, text, F, {w = null, ls = 0.06, bw = 0.085 * F, padX = 0.62 * F, padY = 0.4 * F} = {}) {
	const {d, width} = textPath(text, {weight: 800, ls});
	const k = F / 1000, tw = width * k;
	const W = w ?? tw + 2 * padX, H = 0.7 * F + 2 * padY;
	let s = `<g transform="translate(${f(x)} ${f(y)})"><rect x="${f(-W / 2)}" y="${f(-H / 2)}" width="${f(W)}" height="${f(H)}" rx="${f(0.2 * F)}" fill="${INK}" stroke="${GOLD}" stroke-width="${f(bw)}"/>`;
	s += `<path transform="translate(${f(-tw / 2)} ${f(0.35 * F)}) scale(${k})" d="${d}" fill="${C.white}"/></g>`;
	return {svg: s, w: W, h: H, tw};
}

// ------------------------------------------------------------------ map helpers
export const mixHex = (a, b, t) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(a.slice(1 + i, 3 + i), 16) * (1 - t) + parseInt(b.slice(1 + i, 3 + i), 16) * t).toString(16).padStart(2, '0')).join('');
/** map view [x, y, w, h] (map units) with centre lon/lat, width in degrees of longitude and aspect h/w */
export const viewAt = (lon, lat, degW, aspect) => {
	const [x, y] = P([lon, lat]);
	const w = (degW / 360) * 10000;
	return [x - w / 2, y - (w * aspect) / 2, w, w * aspect];
};

// point-in-country test on the projected polygons (even-odd over all rings) — used to keep faces inside countries
const RINGS = {};
const rings = (iso) =>
	(RINGS[iso] ??= ISO[iso].d.split(/(?=M)/).map((sp) => {
		const n = sp.match(/-?\d+(\.\d+)?/g).map(Number);
		const pts = [];
		for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
		return pts;
	}));
export function inCountry(iso, [x, y]) {
	let inside = false;
	for (const r of rings(iso))
		for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
			const [xi, yi] = r[i], [xj, yj] = r[j];
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
		}
	return inside;
}
export {C, P, MAP, ISO};
