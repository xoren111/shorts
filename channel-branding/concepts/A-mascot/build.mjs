// Concept A «Mascot ?» — avatar 800×800 + banner 2560×1440 for «Was Wäre Wenn».
// The gold Montserrat-Black «?» with the Shorts' country-face eyes IS the channel character.
//   node concepts/A-mascot/build.mjs [avatar|banner|all|variants] [tag]
// (run from /Users/khorengrigoryan/shorts/channel-branding). With a tag, copies also go to work/<name>_<tag>.png.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {C, P, countries, face, goldText, pill, page, render, mapSvg, pxSvg, ROOT} from '../../kit/kit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const what = process.argv[2] ?? 'all';
const tag = process.argv[3] ?? '';
const PAPER = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'assets/paper.png')).toString('base64')}`;

// ---------------------------------------------------------------- the mascot
// Montserrat Black «?» measured at font-size 1000 (anchor middle, baseline y): glyph bbox x −315…+270, y −717…+10
// → glyph centre is (−22.5, −353.5)·S/1000 from the text anchor; glyph is 0.585·S wide, 0.727·S tall.
const GX = -0.0225, GY = -0.3535;

/**
 * The «?» character centred at (cx, cy), font-size S. rot (deg); eye = eye radius / S; eyeAt = face centre relative
 * to the glyph centre (/ S); mood/look go to kit face(); depth = ink extrusion (sticker depth); outline = stroke / S.
 */
function mascot(cx, cy, S, {rot = 0, mood = 'curious', look = null, eye = 0.078, eyeAt = [0.01, -0.188], depth = 0.03, outline = 0.065, fill = C.gold} = {}) {
	const tx = -GX * S, ty = -GY * S; // text anchor relative to glyph centre
	const q = (extra) => `<text x="${tx}" y="${ty}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${S}" stroke-linejoin="round" ${extra}>?</text>`;
	let s = `<g transform="translate(${cx} ${cy}) rotate(${rot})">`;
	if (depth) s += `<g transform="translate(${depth * S * 0.35} ${depth * S})">${q(`fill="${C.ink}" stroke="${C.ink}" stroke-width="${outline * S}"`)}</g>`;
	s += q(`fill="${fill}" stroke="${C.ink}" stroke-width="${outline * S}" paint-order="stroke"`);
	s += mood && mood.L ? slyFace(eyeAt[0] * S, eyeAt[1] * S, eye * S, {...mood, ...(look ?? {}), skin: fill}) : face(eyeAt[0] * S, eyeAt[1] * S, eye * S, mood, {skin: fill, look});
	return s + `</g>`;
}
/** «Hmm …?» — one brow raised, the other level: curious-sceptical, the channel's question face. */
const HMM = {open: 1.0, browY: 0.25, browTilt: -0.1, pupil: 0.95, lookX: 0.4, lookY: -0.2, arc: 0, asym: 0.85};
/**
 * Same drawing rules as kit face() (white eyes, dark contour, one-line brows, lid in skin colour when open < 0.75)
 * but with a separate mood per eye — for the mascot's «sly» look: one eye narrowed, the other brow raised.
 * L/R = {open, browY, browTilt}; shared {pupil, lookX, lookY}.
 */
function slyFace(x, y, r, {L, R, pupil = 0.95, lookX = 0.35, lookY = -0.15, skin = C.gold, swK = 0.13}) {
	const sw = swK * r;
	let s = `<g transform="translate(${x} ${y})">`;
	for (const [side, m] of [[-1, L], [1, R]]) {
		const ex = side * 1.15 * r, open = m.open, ry = r * 1.05 * open;
		const px = ex + lookX * 0.34 * r, py = lookY * 0.3 * r * Math.min(1, open);
		const pr = 0.4 * r * pupil;
		const base = -1.5 * r + m.browY * 0.3 * r;
		const inner = base - m.browTilt * 0.42 * r, outer = base + m.browTilt * 0.18 * r;
		s += `<ellipse cx="${ex}" cy="0" rx="${r}" ry="${ry}" fill="${C.white}" stroke="${C.ink}" stroke-width="${sw}"/>`;
		s += `<clipPath id="eye${side}${Math.round(x)}"><ellipse cx="${ex}" cy="0" rx="${r}" ry="${ry}"/></clipPath>`;
		s += `<g clip-path="url(#eye${side}${Math.round(x)})"><ellipse cx="${px}" cy="${py}" rx="${pr}" ry="${pr}" fill="${C.ink}"/>`;
		s += `<circle cx="${px - pr * 0.3}" cy="${py - pr * 0.3}" r="${pr * 0.24}" fill="${C.white}"/>`;
		if (m.lid) s += `<path d="M${ex - r * 1.1},${-ry - r * 0.1} H${ex + r * 1.1} V${-ry + 2 * ry * m.lid} H${ex - r * 1.1}Z" fill="${skin}"/>`;
		s += `</g>`;
		if (m.lid) s += `<path d="M${ex - r * 0.98},${-ry + 2 * ry * m.lid} H${ex + r * 0.98}" stroke="${C.ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
		s += `<ellipse cx="${ex}" cy="0" rx="${r}" ry="${ry}" fill="none" stroke="${C.ink}" stroke-width="${sw}"/>`;
		s += `<path d="M${side * 0.3 * r},${inner} L${side * 1.95 * r},${outer}" fill="none" stroke="${C.ink}" stroke-width="${sw * 1.25}" stroke-linecap="round"/>`;
	}
	return s + `</g>`;
}
/** the mascot's sly «what if …?» look: left eye a little narrowed under a level brow, right brow raised */
const SLY = {L: {open: 1.0, lid: 0.3, browY: 0.45, browTilt: -0.15}, R: {open: 1.05, lid: 0, browY: -0.55, browTilt: 0.2}, lookX: 0.4, lookY: -0.1};

// ---------------------------------------------------------------- shared map look
// muted flat fills in the Shorts' range (modern borders only; Crimea = Ukraine via the kit)
const FILLS = {
	DEU: C.steel, FRA: C.navy, GBR: C.rose, IRL: C.moss, ITA: C.olive, ESP: C.ochre, PRT: C.moss, POL: C.rose, CZE: C.sand,
	AUT: C.plum, CHE: C.plum, HUN: C.moss, ROU: C.ochre, UKR: C.sand, BLR: C.plum, RUS: C.brick, NOR: C.petrol, SWE: C.navy,
	FIN: C.moss, DNK: C.ochre, NLD: C.ochre, BEL: C.sand, TUR: C.plum, GRC: C.navy, BGR: C.rose, SRB: C.sand, HRV: C.navy,
	BIH: C.ochre, SVK: C.navy, LTU: C.ochre, LVA: C.moss, EST: C.navy, MDA: C.moss, ALB: C.rose, MKD: C.ochre, MNE: C.moss,
	KOS: C.navy, SVN: C.ochre, LUX: C.rose, DZA: C.sand, MAR: C.rose, TUN: C.moss, LBY: C.olive, EGY: C.ochre, SYR: C.sand,
	IRQ: C.rose, IRN: C.moss, KAZ: C.ochre, GEO: C.olive, ARM: C.sand, AZE: C.rose, ISL: C.navy, CYP: C.ochre, CYN: C.ochre,
	SAU: C.sand, JOR: C.olive, ISR: C.rose, LBN: C.ochre, PSX: C.sand, TKM: C.sand, UZB: C.rose,
};

/** map view [x, y, w, h] in map units with centre lon/lat, width in degrees of longitude and aspect h/w */
const viewAt = (lon, lat, degW, aspect) => {
	const [x, y] = P([lon, lat]);
	const w = (degW / 360) * 10000;
	return [x - w / 2, y - (w * aspect) / 2, w, w * aspect];
};
const mapLayer = (W, H, view, {fills = FILLS, strokePx = 2.6, wash = 0} = {}) => {
	const k = W / view[2];
	const r = `x="${view[0]}" y="${view[1]}" width="${view[2]}" height="${view[3]}"`;
	return mapSvg(W, H, view, `<rect ${r} fill="${C.sea}"/>` + countries({view, fills, strokeW: strokePx / k, deserts: false}) + (wash ? `<rect ${r} fill="${C.paper}" opacity="${wash}"/>` : ''));
};
const paperLayer = (op) => `<div style="position:absolute;inset:0;background:url(${PAPER}) center/cover;mix-blend-mode:multiply;opacity:${op}"></div>`;

/** portolan-chart rhumb lines radiating from a compass rose (16 winds), very faint */
const rhumbs = (x, y, len, op = 0.2) => {
	let s = `<g stroke="${C.border}" stroke-width="1.6" opacity="${op}">`;
	for (let i = 0; i < 32; i++) {
		const a = (i * Math.PI) / 16;
		s += `<line x1="${x}" y1="${y}" x2="${x + Math.sin(a) * len}" y2="${y - Math.cos(a) * len}" ${i % 2 ? 'stroke-dasharray="10 8"' : ''}/>`;
	}
	return s + `</g>`;
};
/** old-atlas compass rose (no letters — text stays in the banner's safe area) */
function compass(x, y, R, rot = 0) {
	let s = `<g transform="translate(${x} ${y}) rotate(${rot})" stroke="${C.border}" stroke-linejoin="round">`;
	s += `<circle r="${R * 0.98}" fill="none" stroke-width="${R * 0.018}" opacity="0.8"/><circle r="${R * 0.9}" fill="none" stroke-width="${R * 0.008}" opacity="0.8"/>`;
	for (let i = 0; i < 32; i++) {
		const a = (i * Math.PI) / 16, l = i % 4 === 0 ? 0.12 : 0.05;
		s += `<line x1="${Math.sin(a) * R * 0.9}" y1="${-Math.cos(a) * R * 0.9}" x2="${Math.sin(a) * R * (0.9 - l)}" y2="${-Math.cos(a) * R * (0.9 - l)}" stroke-width="${R * 0.01}"/>`;
	}
	const point = (a, len, wid, light, dark) => {
		const ux = Math.sin(a), uy = -Math.cos(a), vx = Math.cos(a), vy = Math.sin(a);
		const tip = [ux * len, uy * len], l = [vx * wid, vy * wid], r = [-vx * wid, -vy * wid];
		return `<path d="M0,0 L${l[0]},${l[1]} L${tip[0]},${tip[1]}Z" fill="${light}" stroke-width="${R * 0.012}"/><path d="M0,0 L${r[0]},${r[1]} L${tip[0]},${tip[1]}Z" fill="${dark}" stroke-width="${R * 0.012}"/>`;
	};
	for (let i = 0; i < 4; i++) s += point(Math.PI / 4 + (i * Math.PI) / 2, R * 0.55, R * 0.09, C.paper, C.sand);
	for (let i = 0; i < 4; i++) s += point((i * Math.PI) / 2, R * 0.86, R * 0.13, C.haze, i === 0 ? C.alarm : C.border);
	s += `<circle r="${R * 0.05}" fill="${C.gold}" stroke-width="${R * 0.012}"/>`;
	return s + `</g>`;
}

// ---------------------------------------------------------------- avatar
const AV = {
	map: {lon: 13, lat: 49.5, deg: 44},
	fills: {...FILLS, DEU: C.sand, CZE: C.ochre},
	wash: 0.2,
	S: 830, at: [2, -12], rot: -6,
	q: {mood: SLY, eye: 0.078, eyeAt: [0.01, -0.188]},
	rim: 0.45,
};
async function avatar(o = AV, name = 'avatar') {
	const W = 800;
	const view = viewAt(o.map.lon, o.map.lat, o.map.deg, 1);
	// old-atlas rim: darker edge so the YouTube circle holds its shape on white UI
	const vig = pxSvg(W, W, `<defs>
<radialGradient id="vg" cx="50%" cy="50%" r="50%"><stop offset="0.62" stop-color="#3A2E22" stop-opacity="0"/><stop offset="0.9" stop-color="#3A2E22" stop-opacity="${o.rim * 0.5}"/><stop offset="1" stop-color="#2A2018" stop-opacity="${o.rim}"/></radialGradient></defs>
<rect width="${W}" height="${W}" fill="url(#vg)"/>`);
	const fg = pxSvg(W, W, mascot(W / 2 + o.at[0], W / 2 + o.at[1], o.S, {rot: o.rot, ...o.q}));
	const html = page({w: W, h: W, paper: 0, body: mapLayer(W, W, view, {fills: o.fills, wash: o.wash}) + paperLayer(0.85) + vig + fg});
	await out(html, name, W, W);
}

/** wordmark: kit goldText + the same ink extrusion as the mascot so both read as one sticker set */
const wordmark = (x, y, text, F, depth = 0.05) =>
	goldText(x + depth * F * 0.35, y + depth * F, text, F, {sw: F * 0.16, ls: -0.004 * F, fill: C.ink}) + goldText(x, y, text, F, {sw: F * 0.16, ls: -0.004 * F});

// ---------------------------------------------------------------- banner
const BN = {
	map: {lon: 11, lat: 48, deg: 84},
	wash: 0.1,
	tint: 0.5, // non-character countries are mixed this much toward paper → the characters pop, the atlas stays calm
	S: 440, F: 108, pillF: 44, gap: 44, shift: 7,
	compass: {at: [-24.6, 47.6], R: 140},
	chars: [
		// iso, [lon, lat] of the face, eye radius px, mood, fill — kept fully outside (or fully inside) the desktop strip
		['GBR', [-2.0, 54.4], 34, 'curious', C.navy],
		['ESP', [-3.6, 39.6], 44, 'alert', C.ochre],
		['ITA', [15.6, 40.9], 28, 'curious', C.olive],
		['SWE', [15.4, 58.4], 34, 'curious', C.petrol],
		['RUS', [45.3, 50.2], 46, 'curious', C.brick],
		['TUR', [34.5, 39.0], 44, 'curious', C.plum],
		['DZA', [3.0, 33.0], 46, 'confused', C.sand],
		['LBY', [13.6, 31.8], 32, 'curious', C.rose],
	],
};
const mixHex = (a, b, t) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(a.slice(1 + i, 3 + i), 16) * (1 - t) + parseInt(b.slice(1 + i, 3 + i), 16) * t).toString(16).padStart(2, '0')).join('');
async function banner(o = BN, name = 'banner') {
	const W = 2560, H = 1440;
	const view = viewAt(o.map.lon, o.map.lat, o.map.deg, H / W);
	const k = W / view[2];
	const toPx = (ll) => {
		const [x, y] = P(ll);
		return [(x - view[0]) * k, (y - view[1]) * k];
	};
	const cx = W / 2, cy = H / 2;
	// lockup geometry (all inside the 1546×423 safe area: x 507…2053, y 508…932)
	const mW = 0.585 * o.S + 0.065 * o.S + 0.03 * 0.35 * o.S; // glyph + outline + extrusion
	const tW = (10.1 - 0.05) * o.F + 0.16 * o.F + 0.05 * 0.35 * o.F; // wordmark incl. outline + extrusion
	const total = mW + o.gap + tW;
	const x0 = cx - total / 2 + (o.shift ?? 0);
	const mx = x0 + mW / 2, tx = x0 + mW + o.gap + tW / 2;
	// soft parchment haze behind the lockup so the wordmark sits calmly on the map; gentle edge vignette
	const haze = pxSvg(W, H, `<defs><filter id="blur" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="70"/></filter>
<radialGradient id="vg" cx="50%" cy="50%" r="75%"><stop offset="0.65" stop-color="#3A2E22" stop-opacity="0"/><stop offset="1" stop-color="#3A2E22" stop-opacity="0.3"/></radialGradient></defs>
<rect x="${cx - total / 2 - 90}" y="${cy - 190}" width="${total + 180}" height="380" rx="180" fill="${C.haze}" opacity="${o.haze ?? 0.5}" filter="url(#blur)"/><rect width="${W}" height="${H}" fill="url(#vg)"/>`);
	// country characters around the edges, all looking at the centre
	let faces = '';
	for (const [iso, ll, r, mood, fill] of o.chars) {
		const [x, y] = toPx(ll);
		const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1;
		faces += face(x, y, r, mood, {skin: fill, look: {lookX: (dx / d) * 0.95, lookY: (dy / d) * 0.95}});
		const top = y - 2.05 * r, bot = y + 1.25 * r, l = x - 2.2 * r, rt = x + 2.2 * r;
		const inStrip = bot > 508 && top < 932, fully = top >= 508 && bot <= 932, inSafe = rt > 507 && l < 2053;
		const bad = (inStrip && !fully) || (inStrip && inSafe) || top < 20 || bot > H - 20 || l < 20 || rt > W - 20;
		console.log(`face ${iso} x ${Math.round(x)} y ${Math.round(y)} [${Math.round(top)}…${Math.round(bot)}] ${bad ? 'BAD' : 'ok'}${fully ? ' (desktop strip)' : ''}`);
	}
	const [kx, ky] = toPx(o.compass.at);
	const deco = rhumbs(kx, ky, 3000, o.rhumb ?? 0.16) + compass(kx, ky, o.compass.R, 0);
	const fills = Object.fromEntries(Object.entries(FILLS).map(([iso, f]) => [iso, mixHex(f, C.paper, o.tint)]));
	for (const [iso, , , , f] of o.chars) fills[iso] = f;
	let lock = mascot(mx, cy, o.S, {rot: -6, mood: SLY, look: {lookX: 0.25, lookY: 0.05}});
	lock += wordmark(tx, cy - 56, 'WAS WÄRE WENN', o.F);
	lock += pill(tx, cy + 80, 'GESCHICHTE AUF DER KARTE', o.pillF);
	const html = page({w: W, h: H, paper: 0, body: mapLayer(W, H, view, {fills, wash: o.wash, strokePx: 2.4}) + paperLayer(0.85) + pxSvg(W, H, deco) + haze + pxSvg(W, H, faces + lock)});
	await out(html, name, W, H);
}

// ---------------------------------------------------------------- variants (exploration)
const VARIANTS = {};

async function out(html, name, w, h) {
	const f = path.join(HERE, `${name}.png`);
	await render(html, f, w, h);
	if (tag) fs.copyFileSync(f, path.join(HERE, 'work', `${path.basename(name)}_${tag}.png`));
	console.log('wrote', f);
}

if (what === 'avatar' || what === 'all') await avatar();
if (what === 'banner' || what === 'all') await banner();
if (what === 'variants') for (const [n, [fn, v]] of Object.entries(VARIANTS)) await (fn === 'b' ? banner : avatar)(v, 'work/' + n);
