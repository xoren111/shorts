// Shared toolkit for the channel branding (avatar 800×800, banner 2560×1440) in the channel's «Alter Atlas» style
// (same palette, Natural Earth map, country faces, Montserrat and paper texture as the Shorts made in ~/shorts/oel-1941).
// Everything is plain SVG/HTML rendered by headless Chrome — no Remotion bundle needed.
//
//   import {C, MAP, P, countries, face, goldText, stamp, pill, page, render} from '../kit/kit.mjs';
//   await render(page({w: 800, h: 800, body: `<svg …>…</svg>`}), 'out/avatar.png', 800, 800);  // async!
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const KIT = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(KIT, '..');
const {geoMercator} = await import(pathToFileURL('/Users/khorengrigoryan/shorts/oel-1941/node_modules/d3-geo/src/index.js').href);

/** Palette of the channel (oel-1941/src/lib/theme.ts) + a few modern-country fills in the same muted range. */
export const C = {
	paper: '#E6DCC3',
	sea: '#9FB8B5',
	seaDeep: '#86A3A0',
	desert: '#D9C49A',
	border: '#5A4A3A',
	neutral: '#D6CBB0',
	steel: '#4E5A63', // Stahlgrau (Germany in the Shorts)
	brick: '#A8432F', // Ziegelrot (USSR/Russia)
	ochre: '#D8A23C', // Ocker (Romania)
	olive: '#8C9A5B', // Oliv (Italy)
	navy: '#3D5F8A', // Marineblau (GB)
	petrol: '#2F7F86', // Petrol (USA)
	plum: '#7A5C8C', // Pflaume (Japan)
	rose: '#C98E7E',
	sand: '#CDB27A',
	moss: '#6F8550',
	ink: '#1E1A17',
	white: '#FFFFFF',
	gold: '#F2B705',
	alarm: '#D63A2F',
	haze: '#E9E2D2',
};

/** Map data: 252 modern countries as projected SVG paths (Mercator centred on 20°E, world = 10000 units). */
export const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/map.json'), 'utf8'));
const proj = geoMercator().rotate(MAP.proj.rotate).scale(MAP.proj.scale).translate(MAP.proj.translate);
/** [lon, lat] → map units */
export const P = (ll) => proj(ll);
export const ISO = Object.fromEntries(MAP.countries.map((c) => [c.iso, c]));

/** number of Crimea sub-polygons moved RUS → UKR (should be ≥ 1) */
export let CRIMEA_MOVED = 0;
// Natural Earth's default admin-0 puts Crimea into RUS (de-facto view). Germany/EU/UN: Crimea is Ukraine —
// move every RUS sub-polygon that lies inside the Crimea box into UKR.
{
	const [ax, ay] = P([32.3, 46.4]);
	const [bx, by] = P([36.8, 44.2]);
	const inCrimea = (sub) => {
		const nums = sub.match(/-?\d+(\.\d+)?/g).map(Number);
		for (let i = 0; i < nums.length; i += 2) if (nums[i] < ax || nums[i] > bx || nums[i + 1] < ay || nums[i + 1] > by) return false;
		return true;
	};
	const rus = ISO.RUS, ukr = ISO.UKR;
	const subs = rus.d.split(/(?=M)/);
	const crimea = subs.filter(inCrimea);
	if (crimea.length) {
		rus.d = subs.filter((x) => !inCrimea(x)).join('');
		ukr.d += crimea.join('');
		ukr.bbox = [Math.min(ukr.bbox[0], ax), Math.min(ukr.bbox[1], ay), Math.max(ukr.bbox[2], bx), Math.max(ukr.bbox[3], by)];
	}
	CRIMEA_MOVED = crimea.length;
}

/**
 * SVG group with the base map inside viewBox [x, y, w, h] (map units). `fills` = {ISO: colour}; others get `neutral`.
 * strokeW is in map units (scale it with your zoom). Includes graticule and deserts.
 */
export function countries({view, fills = {}, neutral = C.neutral, strokeW = 1.2, stroke = C.border, graticule = true, deserts = true, only = null}) {
	const [x0, y0, w, h] = view;
	const vis = (b) => b[2] >= x0 - 50 && b[0] <= x0 + w + 50 && b[3] >= y0 - 50 && b[1] <= y0 + h + 50;
	const list = MAP.countries.filter((c) => vis(c.bbox) && (!only || only.includes(c.iso)));
	const id = 'land' + Math.round(x0) + '_' + Math.round(y0);
	let s = `<defs><clipPath id="${id}">${list.map((c) => `<path d="${c.d}"/>`).join('')}</clipPath></defs>`;
	if (graticule) s += `<path d="${MAP.graticule}" fill="none" stroke="${C.border}" stroke-opacity="0.16" stroke-width="${strokeW * 0.8}"/>`;
	s += `<g stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round">`;
	for (const c of list) s += `<path d="${c.d}" fill="${fills[c.iso] ?? neutral}"/>`;
	s += `</g>`;
	if (deserts) s += `<path d="${MAP.deserts}" fill="${C.desert}" clip-path="url(#${id})" opacity="0.55"/>`;
	return s;
}

/** Centroid-ish label point of a country (bbox centre of its largest-looking area) in map units. */
export const bboxCenter = (iso) => {
	const b = ISO[iso].bbox;
	return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
/** Moods of the country faces (same numbers as oel-1941/src/map/Faces.tsx). */
export const MOODS = {
	neutral: {open: 1, browY: 0, browTilt: 0, pupil: 1, lookX: 0, lookY: 0, arc: 0, asym: 0},
	confident: {open: 0.72, browY: 0.45, browTilt: -0.45, pupil: 0.95, lookX: 0.1, lookY: 0, arc: 0, asym: 0},
	alert: {open: 1.15, browY: -0.5, browTilt: -0.1, pupil: 0.7, lookX: 0, lookY: -0.2, arc: 0, asym: 0},
	scared: {open: 1.25, browY: -0.9, browTilt: 0.7, pupil: 0.5, lookX: 0, lookY: 0, arc: 0, asym: 0},
	shocked: {open: 1.4, browY: -1, browTilt: 0.1, pupil: 0.4, lookX: 0, lookY: 0, arc: 0, asym: 0},
	sly: {open: 0.42, browY: 0.15, browTilt: -0.55, pupil: 0.9, lookX: 0.45, lookY: 0.1, arc: 0, asym: 0},
	angry: {open: 0.78, browY: 0.6, browTilt: -0.95, pupil: 0.8, lookX: 0, lookY: 0, arc: 0, asym: 0},
	happy: {open: 0.06, browY: -0.4, browTilt: 0.1, pupil: 1, lookX: 0, lookY: 0, arc: 1, asym: 0},
	tired: {open: 0.38, browY: -0.1, browTilt: 0.55, pupil: 0.9, lookX: 0, lookY: 0.35, arc: 0, asym: 0},
	sad: {open: 0.7, browY: -0.3, browTilt: 0.85, pupil: 0.9, lookX: 0, lookY: 0.35, arc: 0, asym: 0},
	confused: {open: 1, browY: -0.4, browTilt: 0.25, pupil: 0.9, lookX: -0.3, lookY: -0.3, arc: 0, asym: 1},
	smug: {open: 0.5, browY: 0.2, browTilt: -0.3, pupil: 0.9, lookX: 0.2, lookY: 0, arc: 0, asym: 0},
	curious: {open: 1.1, browY: -0.55, browTilt: 0.15, pupil: 0.85, lookX: 0, lookY: -0.6, arc: 0, asym: 0.6},
};

/**
 * Country face (two big white eyes with dark contour + one-line brows) as an SVG string, centred at (x, y),
 * eye radius r (px in the current coordinate system). mood = name or object; overrides via {lookX, lookY, …}.
 * mouth: 'none' | 'line' | 'frown' | 'smile' | 'o'; question: true draws the gold «?» above-right.
 */
export function face(x, y, r, mood = 'neutral', {skin = C.neutral, mouth = 'none', question = false, look = null, sw: swK = 0.13} = {}) {
	const m = {...(typeof mood === 'string' ? MOODS[mood] : mood), ...(look ?? {})};
	const open = clamp(m.open, 0.05, 1.45);
	const closed = open < 0.15;
	const sw = swK * r;
	let s = `<g transform="translate(${x} ${y})">`;
	for (const side of [-1, 1]) {
		const ex = side * 1.15 * r;
		const ry = r * 1.05 * open;
		const px = ex + clamp(m.lookX, -1, 1) * 0.34 * r;
		const py = clamp(m.lookY, -1, 1) * 0.3 * r * Math.min(1, open);
		const pr = 0.4 * r * m.pupil;
		const base = -1.5 * r + m.browY * 0.3 * r + (side === 1 ? -m.asym * 0.35 * r : 0);
		const inner = base - m.browTilt * 0.42 * r;
		const outer = base + m.browTilt * 0.18 * r;
		if (closed) {
			const d = m.arc >= 0 ? `M${ex - r},${0.15 * r} Q${ex},${-0.9 * r} ${ex + r},${0.15 * r}` : `M${ex - r},${-0.2 * r} Q${ex},${0.75 * r} ${ex + r},${-0.2 * r}`;
			s += `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${sw * 1.15}" stroke-linecap="round"/>`;
		} else {
			s += `<ellipse cx="${ex}" cy="0" rx="${r}" ry="${ry}" fill="${C.white}" stroke="${C.ink}" stroke-width="${sw}"/>`;
			s += `<ellipse cx="${px}" cy="${py}" rx="${pr}" ry="${pr * Math.min(1, open * 1.1)}" fill="${C.ink}"/>`;
			s += `<circle cx="${px - pr * 0.3}" cy="${py - pr * 0.3 * Math.min(1, open)}" r="${pr * 0.22}" fill="${C.white}"/>`;
			if (open < 0.75) s += `<path d="M${ex - r},${-ry} h${2 * r} v${ry * (1 - open / 0.75) * 0.9} h${-2 * r} z" fill="${skin}" stroke="${C.ink}" stroke-width="${sw * 0.9}"/>`;
		}
		s += `<path d="M${side * 0.3 * r},${inner} L${side * 1.95 * r},${outer}" fill="none" stroke="${C.ink}" stroke-width="${sw * 1.25}" stroke-linecap="round"/>`;
	}
	const my = 1.95 * r;
	if (mouth === 'line') s += `<path d="M${-0.7 * r},${my} L${0.7 * r},${my}" stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
	if (mouth === 'frown') s += `<path d="M${-0.7 * r},${my + 0.2 * r} Q0,${my - 0.5 * r} ${0.7 * r},${my + 0.2 * r}" fill="none" stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
	if (mouth === 'smile') s += `<path d="M${-0.7 * r},${my - 0.2 * r} Q0,${my + 0.5 * r} ${0.7 * r},${my - 0.2 * r}" fill="none" stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
	if (mouth === 'o') s += `<circle cx="0" cy="${my}" r="${0.3 * r}" fill="${C.ink}"/>`;
	if (question) s += `<text x="${2.4 * r}" y="${-3.0 * r}" font-family="Montserrat" font-weight="900" font-size="${4.6 * r}" fill="${C.gold}" stroke="${C.ink}" stroke-width="${sw * 1.3}" paint-order="stroke" text-anchor="middle" transform="rotate(12 ${2.4 * r} ${-3.0 * r})">?</text>`;
	return s + `</g>`;
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Gold Montserrat Black text with thick dark outline (the Shorts hook-title look). */
export const goldText = (x, y, text, size, {fill = C.gold, stroke = C.ink, sw = size * 0.16, anchor = 'middle', weight = 900, ls = size * 0.012, extra = ''} = {}) =>
	`<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-family="Montserrat" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke" ${extra}>${esc(text)}</text>`;

/** Red double-frame rubber stamp (the «WAS WÄRE WENN» stamp of the Shorts), centred at (x, y). */
export const stamp = (x, y, text, size, {rot = -9, color = C.alarm, pad = 0.55, opacity = 0.92} = {}) => {
	const w = text.length * size * 0.74 + size * pad * 2;
	const h = size * 2.4;
	return `<g transform="translate(${x} ${y}) rotate(${rot})" opacity="${opacity}" style="mix-blend-mode:multiply">
<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${size * 0.2}" fill="none" stroke="${color}" stroke-width="${size * 0.19}"/>
<rect x="${-w / 2 + size * 0.3}" y="${-h / 2 + size * 0.3}" width="${w - size * 0.6}" height="${h - size * 0.6}" rx="${size * 0.12}" fill="none" stroke="${color}" stroke-width="${size * 0.065}"/>
<text x="0" y="${size * 0.08}" text-anchor="middle" dominant-baseline="middle" font-family="Montserrat" font-weight="900" font-size="${size}" letter-spacing="${size * 0.06}" fill="${color}">${esc(text)}</text></g>`;
};

/** Dark label pill with white Montserrat ExtraBold text (scene labels in the Shorts). */
export const pill = (x, y, text, size, {bg = C.ink, fg = C.white, border = C.gold, bw = size * 0.08, padX = size * 0.6, padY = size * 0.42} = {}) => {
	const w = text.length * size * 0.68 + padX * 2;
	const h = size + padY * 2;
	return `<g transform="translate(${x} ${y})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${size * 0.22}" fill="${bg}" stroke="${border}" stroke-width="${bw}"/>
<text x="0" y="${size * 0.04}" text-anchor="middle" dominant-baseline="middle" font-family="Montserrat" font-weight="800" font-size="${size}" letter-spacing="${size * 0.05}" fill="${fg}">${esc(text)}</text></g>`;
};

const b64 = (f) => fs.readFileSync(f).toString('base64');
const FONT_B64 = b64(path.join(KIT, 'fonts/Montserrat-VF.ttf'));
const PAPER_B64 = b64(path.join(ROOT, 'assets/paper.png'));

/**
 * Full HTML page w×h: background colour, your SVG/HTML body, and the parchment texture multiplied on top
 * (paper = opacity 0…1, like the Shorts' 0.85; set 0 to disable). Montserrat (variable 100–900) is embedded.
 */
export const page = ({w, h, body, bg = C.paper, paper = 0.8, css = ''}) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Montserrat;src:url(data:font/ttf;base64,${FONT_B64}) format('truetype');font-weight:100 900;font-style:normal}
html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden;background:${bg}}
#stage{position:relative;width:${w}px;height:${h}px;overflow:hidden}
#stage>svg{position:absolute;inset:0}
#paper{position:absolute;inset:0;background:url(data:image/png;base64,${PAPER_B64}) center/cover;mix-blend-mode:multiply;opacity:${paper};pointer-events:none}
${css}</style></head><body><div id="stage">${body}${paper > 0 ? '<div id="paper"></div>' : ''}</div></body></html>`;

// Remotion's chrome-headless-shell driven over CDP by puppeteer-core (the CLI --screenshot mode hangs on this Mac).
// One browser per process, reused by every render() call; it is closed automatically when the script ends.
const CHROME = '/Users/khorengrigoryan/shorts/oel-1941/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell';
let browserP = null;
const browser = () =>
	(browserP ??= import('puppeteer-core').then(({default: pp}) =>
		pp.launch({
			executablePath: CHROME,
			headless: 'shell',
			// the flags Remotion uses on this Mac (--disable-gpu stalls frame production → screenshots never return)
			args: ['--headless=old', '--use-gl=angle', '--no-sandbox', '--disable-setuid-sandbox', '--no-zygote', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--force-device-scale-factor=1',
				'--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-extensions', '--mute-audio', '--no-first-run'],
			protocolTimeout: 240000,
		}),
	));
/** Close the shared browser now (it also closes itself 1.5 s after the last render). */
export const closeBrowser = async () => {
	if (browserP) await (await browserP).close().catch(() => {});
	browserP = null;
};
// auto-close 1.5 s after the last render finishes, so scripts exit on their own (an open CDP socket keeps Node alive)
let pending = 0;
let idleTimer = null;

/**
 * Render an HTML string to PNG (w×h, device scale 1). async — `await render(...)`. Returns the output path.
 * Optional opts.transparent = true → PNG with alpha (page.screenshot omitBackground; give html/body a transparent bg).
 */
export async function render(html, out, w, h, {transparent = false} = {}) {
	pending++;
	clearTimeout(idleTimer);
	const b = await browser();
	const pg = await b.newPage();
	try {
		await pg.setViewport({width: w, height: h, deviceScaleFactor: 1});
		await pg.setContent(html, {waitUntil: 'load', timeout: 240000});
		await pg.evaluate(() => document.fonts.ready);
		fs.mkdirSync(path.dirname(path.resolve(out)), {recursive: true});
		await pg.screenshot({path: path.resolve(out), type: out.endsWith('.jpg') ? 'jpeg' : 'png', clip: {x: 0, y: 0, width: w, height: h}, ...(transparent ? {omitBackground: true} : {}), ...(out.endsWith('.jpg') ? {quality: 92} : {})});
	} finally {
		await pg.close().catch(() => {});
		if (--pending === 0) idleTimer = setTimeout(() => closeBrowser(), 1500);
	}
	return out;
}

/** Helper: SVG root of size w×h with a viewBox in map units, so `countries()` can be drawn at any zoom. */
export const mapSvg = (w, h, view, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${view.join(' ')}" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;
/** Helper: plain pixel-space SVG overlay. */
export const pxSvg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
