// Concept C «Zwei Wege / Fork»: one path of history, one «was wäre wenn» branch.
//   node concepts/C-fork/build.mjs            → avatar.png + banner.png (+ check sheets)
//   node concepts/C-fork/build.mjs avatar     → only the avatar
//   node concepts/C-fork/build.mjs banner     → only the banner
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {C, ISO, P, countries, face, goldText, stamp, pill, page, render, mapSvg, pxSvg} from '../../kit/kit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, '../../kit');
const want = process.argv[2] ?? 'all';

// ───────────────────────── the mark: «?» whose stem forks into a solid arrow ─────────────────────────
// Unit box ≈ 1000 high, centred on (0,0). The solid gold line (= what happened) rises from the «?»-dot and turns
// right into an arrow; the dashed branch (= what if) carries straight on and curls into the «?» bowl.
const arrowHead = (x, y, dx, dy, L, B) => {
	const n = Math.hypot(dx, dy);
	const tx = dx / n, ty = dy / n, nx = -ty, ny = tx;
	const p = (a, b) => `${(x + tx * a + nx * b).toFixed(1)},${(y + ty * a + ny * b).toFixed(1)}`;
	return `M${p(L * 0.62, 0)} L${p(-L * 0.38, B / 2)} L${p(-L * 0.38, -B / 2)} Z`;
};

export function forkMark({W = 100, o = 24, gapK = 0.42, dashK = 1.55, gold = C.gold, ink = C.ink, dashed = true, dashStart = 1.35, shadow = 0} = {}) {
	const dot = [0, 385, 0.8 * W];
	const fork = [0, 215];
	// solid: up from the dot, then a smooth right turn into the arrow
	const solid = `M0,${dot[1] - dot[2] - 0.6 * W} L${fork[0]},${fork[1]} C0,140 40,100 130,72 L360,0`;
	const head = arrowHead(360, 0, 230, -72, 2.3 * W, 2.45 * W);
	// dashed: straight on up, then the «?» bowl
	const hook = `M${fork[0]},${fork[1]} L0,40 C0,-45 220,-55 220,-235 C220,-370 122,-445 0,-445 C-122,-445 -218,-368 -220,-245`;
	const K = W + 2 * o;
	// round caps add W to every dash: visible dash = D + W, visible gap = G − W
	const G = W * (1 + gapK), D = Math.max(1, W * (dashK - 1));
	const da = dashed ? `stroke-dasharray="${D.toFixed(1)} ${G.toFixed(1)}" stroke-dashoffset="${(-dashStart * W).toFixed(1)}"` : '';
	let s = '';
	if (shadow) s += `<g transform="translate(${shadow * 0.6} ${shadow})" opacity="0.28"><path d="${solid}" fill="none" stroke="${ink}" stroke-width="${K}" stroke-linecap="round" stroke-linejoin="round"/><path d="${hook}" fill="none" stroke="${ink}" stroke-width="${K}" stroke-linecap="round"/><path d="${head}" fill="${ink}" stroke="${ink}" stroke-width="${2 * o}" stroke-linejoin="round"/><circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2] + o}" fill="${ink}"/></g>`;
	s += `<path d="${solid}" fill="none" stroke="${ink}" stroke-width="${K}" stroke-linecap="round" stroke-linejoin="round"/>`;
	s += `<path d="${hook}" fill="none" stroke="${ink}" stroke-width="${K}" stroke-linecap="round" stroke-linejoin="round"/>`;
	s += `<path d="${head}" fill="${ink}" stroke="${ink}" stroke-width="${2 * o}" stroke-linejoin="round"/>`;
	s += `<circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2] + o}" fill="${ink}"/>`;
	s += `<path d="${solid}" fill="none" stroke="${gold}" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round"/>`;
	s += `<path d="${hook}" fill="none" stroke="${gold}" stroke-width="${W}" stroke-linecap="round" ${da}/>`;
	s += `<path d="${head}" fill="${gold}"/>`;
	s += `<circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2]}" fill="${gold}"/>`;
	return s;
}
// bbox of the mark in unit coords (for centring): x −299…≈540, y −524…≈504
const MARK_BOX = [-294, -519, 530, 489];

// ───────────────────────────────────────────── avatar ─────────────────────────────────────────────
const FILLS = {DEU: C.steel, FRA: C.navy, GBR: C.rose, ITA: C.olive, ESP: C.rose, PRT: C.olive, GRC: C.petrol, DZA: C.sand, MAR: C.sand, LBY: C.ochre, TUN: C.neutral,
	POL: C.rose, CZE: C.neutral, AUT: C.neutral, CHE: C.neutral, HUN: C.sand, ROU: C.ochre, BGR: C.moss, TUR: C.moss, SRB: C.neutral, HRV: C.neutral};

async function avatar() {
	const S = 800;
	const view = [4130, 3180, 1000, 1000];
	const map = mapSvg(S, S, view, `<rect x="0" y="0" width="10000" height="10000" fill="${C.sea}"/>` + countries({view, fills: FILLS, strokeW: 2.6}));
	const sc = 0.585;
	const cx = (MARK_BOX[0] + MARK_BOX[2]) / 2, cy = (MARK_BOX[1] + MARK_BOX[3]) / 2;
	const vign = `<defs><radialGradient id="vg" cx="50%" cy="50%" r="50%"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2a2016" stop-opacity="0.38"/></radialGradient></defs>
<rect width="${S}" height="${S}" fill="url(#vg)"/>`;
	const fc = face(172, 528, 34, 'curious', {skin: C.rose, look: {lookX: 0.75, lookY: -0.8}});
	const over = pxSvg(S, S, `${vign}${fc}<g transform="translate(${S / 2} ${S / 2}) scale(${sc}) translate(${-cx} ${-cy})">${forkMark({shadow: 22})}</g>`);
	const out = path.join(HERE, 'avatar.png');
	await render(page({w: S, h: S, body: map + over, paper: 0.8}), out, S, S);
	console.log(execFileSync('python3', [path.join(KIT, 'check.py'), 'avatar', out, path.join(HERE, 'avatar_check.png')]).toString());
}

// ───────────────────────────────────────────── banner ─────────────────────────────────────────────
// Two sheets of the SAME map: left = «Geschichte» in the normal Alter-Atlas colours, right = the «was wäre wenn» copy,
// sepia-toned and slightly rotated, with a torn left edge. A gold route rises from the bottom along the seam and forks
// under the wordmark: solid branch (with arrowhead) into the left sheet, dashed branch curling into a «?» on the right.
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/** jagged torn edge: list of [x, y] from top to bottom around x = x0 */
function tornEdge(x0, y0, y1, seed, {amp = 16, jag = 6, step = 7} = {}) {
	const r = rng(seed);
	const pts = [];
	const ph1 = r() * 6, ph2 = r() * 6;
	for (let y = y0; y <= y1; y += step * (0.6 + r() * 0.8)) {
		const wob = Math.sin(y / 170 + ph1) * amp + Math.sin(y / 61 + ph2) * amp * 0.35;
		pts.push([x0 + wob + (r() - 0.5) * 2 * jag, y]);
	}
	pts.push([x0, y1]);
	return pts;
}
const poly = (pts) => pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',');

/** gold route with dark outline (same look as the mark); returns [inkLayer, goldLayer] */
function route(d, W, o, {dash = null, cap = 'round'} = {}) {
	const da = dash ? `stroke-dasharray="${dash[0]} ${dash[1]}" stroke-dashoffset="${dash[2] ?? 0}"` : '';
	return [`<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${W + 2 * o}" stroke-linecap="${cap}" stroke-linejoin="round"/>`,
		`<path d="${d}" fill="none" stroke="${C.gold}" stroke-width="${W}" stroke-linecap="${cap}" stroke-linejoin="round" ${da}/>`];
}

/** old-atlas compass rose with rhumb lines (local px, centred on 0,0) */
function compassRose(r, {ink = C.ink, light = '#F3EAD3', lines = 2600} = {}) {
	let g = '';
	for (let i = 0; i < 32; i++) {
		const a = (i / 32) * Math.PI * 2;
		g += `<line x1="0" y1="0" x2="${(Math.cos(a) * lines).toFixed(0)}" y2="${(Math.sin(a) * lines).toFixed(0)}" stroke="${ink}" stroke-opacity="${i % 4 === 0 ? 0.32 : 0.16}" stroke-width="${i % 4 === 0 ? 1.6 : 1}"/>`;
	}
	g += `<circle r="${r * 1.02}" fill="${light}" fill-opacity="0.55" stroke="${ink}" stroke-width="2.2"/><circle r="${r * 0.9}" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
	for (let i = 0; i < 64; i++) {
		const a = (i / 64) * Math.PI * 2, r1 = r * 0.9, r2 = r * (i % 4 === 0 ? 1.02 : 0.96);
		g += `<line x1="${(Math.cos(a) * r1).toFixed(1)}" y1="${(Math.sin(a) * r1).toFixed(1)}" x2="${(Math.cos(a) * r2).toFixed(1)}" y2="${(Math.sin(a) * r2).toFixed(1)}" stroke="${ink}" stroke-width="1.2"/>`;
	}
	const star = (n, R, w, rot0) => {
		let p = '';
		for (let i = 0; i < n; i++) {
			const a = rot0 + (i / n) * Math.PI * 2, b1 = a - Math.PI / n, b2 = a + Math.PI / n;
			const tip = [Math.cos(a) * R, Math.sin(a) * R];
			const l = [Math.cos(b1) * w, Math.sin(b1) * w], rr = [Math.cos(b2) * w, Math.sin(b2) * w];
			p += `<path d="M0,0 L${tip} L${l} Z" fill="${ink}"/><path d="M0,0 L${tip} L${rr} Z" fill="${light}" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
		}
		return p;
	};
	g += star(8, r * 0.62, r * 0.13, Math.PI / 8) + star(4, r * 0.98, r * 0.18, -Math.PI / 2);
	g += `<circle r="${r * 0.07}" fill="${light}" stroke="${ink}" stroke-width="1.6"/>`;
	return g;
}

const BANNER_FILLS = {DEU: C.steel, FRA: C.navy, GBR: C.rose, IRL: C.olive, ITA: C.olive, ESP: C.sand, PRT: C.olive, POL: C.sand, RUS: C.rose, NOR: C.navy, SWE: C.sand,
	FIN: C.olive, DNK: C.rose, NLD: C.ochre, BEL: C.sand, CHE: C.rose, AUT: C.sand, CZE: C.neutral, HUN: C.rose, ROU: C.ochre, UKR: C.neutral, BLR: C.neutral, LTU: C.olive, LVA: C.sand, EST: C.olive,
	GRC: C.petrol, TUR: C.moss, BGR: C.sand, SRB: C.neutral, DZA: C.sand, MAR: C.rose, LBY: C.ochre, TUN: C.neutral, EGY: C.rose};

async function banner() {
	const W = 2560, H = 1440;
	const s = 0.95; // px per map unit
	const [ax, ay] = P([5, 48]); // anchor: 5°E 48°N sits in the middle of each outer desktop window
	const y0 = ay - 720 / s;
	const xL = ax - 253 / s; // left sheet: anchor at x = 253 px
	const xR = ax - 2262 / s; // right sheet: the same spot at x = 2306 px (before the sheet's slight rotation)
	const vw = W / s, vh = H / s;
	const pad = 220, rot = -1.6;
	const mapInner = (x0, faces, alt) => {
		let m = countries({view: [x0 - pad / s, y0 - pad / s, (W + 2 * pad) / s, (H + 2 * pad) / s], fills: BANNER_FILLS, strokeW: 2.3 / s * 0.95});
		if (alt) m = m.replace('stroke-linejoin="round">', `stroke-linejoin="round" stroke-dasharray="${9 / s} ${5 / s}">`);
		return `<rect x="${x0 - 3000}" y="${y0 - 3000}" width="${vw + 6000}" height="${vh + 6000}" fill="${alt ? '#7C9894' : C.sea}"/>` + m + faces;
	};
	const R = 30 / s; // eye radius in map units
	const at = (x, y, x0) => [x0 + x / s, y0 + y / s]; // page px → map units of a sheet (unrotated)
	const toPage = (ll, x0, rotd = 0) => { // lon/lat → page px of a sheet (incl. the right sheet's rotation)
		const [mx, my] = P(ll);
		let x = (mx - x0) * s, y = (my - y0) * s;
		if (rotd) { const a = rotd * Math.PI / 180, dx = x - 1920, dy = y - 720; x = 1920 + dx * Math.cos(a) - dy * Math.sin(a); y = 720 + dx * Math.sin(a) + dy * Math.cos(a); }
		return [Math.round(x), Math.round(y)];
	};
	const FL = {FRA: [2.0, 46.5], ITA: [15.6, 40.6], NOR: [9.6, 61.6]};
	const FR = {ITA: [11.2, 44.9], ESP: [-3.9, 40.1]};
	const leftFaces = face(...P(FL.FRA), R, 'confident', {skin: C.navy, look: {lookX: 0.6, lookY: -0.2}}) +
		face(...P(FL.ITA), R, 'smug', {skin: C.olive, look: {lookX: 0.4, lookY: -0.4}}) +
		face(...P(FL.NOR), R * 0.85, 'neutral', {skin: C.navy, look: {lookX: -0.4, lookY: 0.8}});
	const rightFaces = face(...P(FR.ITA), R * 0.9, 'curious', {skin: C.olive, look: {lookX: -0.85, lookY: -0.9}}) +
		face(...P(FR.ESP), R, 'curious', {skin: C.sand, look: {lookX: 0.3, lookY: -0.8}});
	const rose = `<g transform="translate(${xR + 1690 / s} ${y0 + 1140 / s}) scale(${1 / s})">${compassRose(150)}</g>`;
	const leftSvg = mapSvg(W, H, [xL, y0, vw, vh], `<rect x="${xL - 3000}" y="${y0 - 3000}" width="${vw + 6000}" height="${vh + 6000}" fill="${C.sea}"/>` +
		countries({view: [xL - 300, y0 - 300, vw + 600, vh + 600], fills: BANNER_FILLS, strokeW: 2.3}) + leftFaces);
	const rightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * pad}" height="${H + 2 * pad}" viewBox="${xR - pad / s} ${y0 - pad / s} ${(W + 2 * pad) / s} ${(H + 2 * pad) / s}">${mapInner(xR, rose + rightFaces, true)}</svg>`;
	const seam = 1280 + pad;
	const edge = tornEdge(seam, 0, H + 2 * pad, 7);
	const clipSheet = `polygon(${poly(edge)},${W + 2 * pad}px ${H + 2 * pad}px,${W + 2 * pad}px 0px)`;
	const fibre = tornEdge(seam - 9, 0, H + 2 * pad, 11, {amp: 16, jag: 5, step: 5});
	const clipFibre = `polygon(${poly(fibre)},${W + 2 * pad}px ${H + 2 * pad}px,${W + 2 * pad}px 0px)`;
	const sheetBox = `position:absolute;left:${-pad}px;top:${-pad}px;width:${W + 2 * pad}px;height:${H + 2 * pad}px;transform-origin:${1920 + pad}px ${720 + pad}px;transform:rotate(${rot}deg)`;
	const css = `.sheetR{${sheetBox};filter:drop-shadow(-10px 4px 12px rgba(30,20,10,.45))}
.fibre{position:absolute;inset:0;background:#EFE6CF;clip-path:${clipFibre}}
.mapR{position:absolute;inset:0;clip-path:${clipSheet}}
.mapR svg{position:absolute;inset:0;filter:grayscale(1) sepia(0.85) contrast(1.12) brightness(1.02)}`;
	const right = `<div class="sheetR"><div class="fibre"></div><div class="mapR">${rightSvg}</div></div>`;

	// ── fork route (page px) ──
	const RW = 38, RO = 9;
	const F = [1280, 862];
	const trunk = `M1280,${H + 60} L${F[0]},${F[1]}`;
	const solidArm = `M${F[0]},${F[1]} C1120,${F[1]} 900,856 700,846 C470,834 292,805 290,645`;
	const head = arrowHead(290, 645, -1, -100, 2.3 * RW, 2.45 * RW);
	const q = [2290, 768]; // «?» stem top
	const dashArm = `M${F[0]},${F[1]} C1440,${F[1]} 1660,856 1860,846 C2080,834 ${q[0]},846 ${q[0]},808 L${q[0]},${q[1]} ` +
		`C${q[0]},${q[1] - 40} ${q[0] + 98},${q[1] - 46} ${q[0] + 98},${q[1] - 122} C${q[0] + 98},${q[1] - 182} ${q[0] + 54},${q[1] - 212} ${q[0]},${q[1] - 212} C${q[0] - 54},${q[1] - 212} ${q[0] - 97},${q[1] - 180} ${q[0] - 98},${q[1] - 126}`;
	const [ti, tg] = route(trunk, RW, RO);
	const [si, sg] = route(solidArm, RW, RO);
	const [di, dg] = route(dashArm, RW, RO, {dash: [RW * 0.7, RW * 1.45, -RW * 1.2]});
	const routes = ti + si + di + `<path d="${head}" fill="${C.ink}" stroke="${C.ink}" stroke-width="${2 * RO}" stroke-linejoin="round"/>` + tg + sg + dg + `<path d="${head}" fill="${C.gold}"/>` +
		`<circle cx="${F[0]}" cy="${F[1]}" r="${RW * 1.2 + RO}" fill="${C.ink}"/><circle cx="${F[0]}" cy="${F[1]}" r="${RW * 1.2}" fill="${C.gold}"/>`;

	// ── text ──
	const word = goldText(1280, 640, 'WAS WÄRE WENN', 127, {sw: 28, ls: 2});
	const tag = pill(1280, 767, 'GESCHICHTE AUF DER KARTE', 37, {bw: 3.5, padX: 38});
	const st = stamp(2080, 330, 'WAS WÄRE WENN', 34, {rot: -10, pad: 1.2}); // kit width estimate is narrow for Montserrat Black
	const over = pxSvg(W, H, routes + word + tag + st);
	const body = leftSvg + right + over;
	const out = path.join(HERE, 'banner.png');
	await render(page({w: W, h: H, body, paper: 0.8, css}), out, W, H);
	console.log(execFileSync('python3', [path.join(KIT, 'check.py'), 'banner', out, path.join(HERE, 'banner_check.png')]).toString());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	if (want === 'all' || want === 'avatar') await avatar();
	if (want === 'all' || want === 'banner') await banner();
}
