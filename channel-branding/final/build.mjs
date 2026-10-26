// «Was Wäre Wenn» — FINAL channel artwork: avatar 800×800, banner 2560×1440, video watermark 300×300 (transparent).
// One system: the gold «?» mascot with the Shorts' country-face eyes (brand.mjs), the Alter-Atlas map, gold
// Montserrat-Black wordmark with the same outline + extrusion, dark pill with gold keyline.
//   node final/build.mjs [all|avatar|banner|watermark|variants] [tag]      (run from ~/shorts/channel-branding)
// With a tag, copies go to final/work/<name>_<tag>.png. Every PNG is followed by kit/check.py (sheet next to it).
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {C, P, countries, page, render, mapSvg, pxSvg, ROOT} from '../kit/kit.mjs';
import {mascot, eyes, wordmark, pill, mixHex, viewAt, inCountry, GOLD, INK} from './brand.mjs';
import {waterlines, seaMask, compass, scaleBar, INK as ENGRAVE} from './atlas.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const what = process.argv[2] ?? 'all';
const tag = process.argv[3] ?? '';
const PAPER = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'assets/paper.png')).toString('base64')}`;
const paperLayer = (op) => `<div style="position:absolute;inset:0;background:url(${PAPER}) center/cover;mix-blend-mode:multiply;opacity:${op}"></div>`;

// ------------------------------------------------------------------ shared map look (modern borders; Crimea = Ukraine via kit)
const FILLS = {
	DEU: C.steel, FRA: C.navy, GBR: C.rose, IRL: C.moss, ITA: C.olive, ESP: C.ochre, PRT: C.moss, POL: C.rose, CZE: C.sand,
	AUT: C.plum, CHE: C.plum, HUN: C.moss, ROU: C.ochre, UKR: C.sand, BLR: C.plum, RUS: C.brick, NOR: C.petrol, SWE: C.navy,
	FIN: C.moss, DNK: C.ochre, NLD: C.ochre, BEL: C.sand, TUR: C.plum, GRC: C.navy, BGR: C.rose, SRB: C.sand, HRV: C.navy,
	BIH: C.ochre, SVK: C.navy, LTU: C.ochre, LVA: C.moss, EST: C.navy, MDA: C.moss, ALB: C.rose, MKD: C.ochre, MNE: C.moss,
	KOS: C.navy, SVN: C.ochre, LUX: C.rose, DZA: C.sand, MAR: C.rose, TUN: C.moss, LBY: C.olive, EGY: C.ochre, SYR: C.sand,
	IRQ: C.rose, IRN: C.moss, KAZ: C.ochre, GEO: C.olive, ARM: C.sand, AZE: C.rose, ISL: C.navy, CYP: C.ochre, CYN: C.ochre,
	SAU: C.sand, JOR: C.olive, ISR: C.rose, LBN: C.ochre, PSX: C.sand, TKM: C.sand, UZB: C.rose,
};
const tinted = (t, keep = {}) => {
	const o = Object.fromEntries(Object.entries(FILLS).map(([iso, f]) => [iso, mixHex(f, C.paper, t)]));
	return {...o, ...keep};
};

// ------------------------------------------------------------------ the mascot, identical in all three files
// face position in font units (y up): eyes sit on the top band of the hook, the left eye clears the counter,
// both eyes pop a little over the top edge (their own contour replaces the outline there), brows float above.
const FACE = {at: [372, 646], r: 90, gap: 1.1, browBase: -1.36, browLen: 1.45};
// visual centre of the mascot relative to its glyph centre (measured from a render, / S) — used to centre it optically
const MC = [-0.0135, -0.038];

// ------------------------------------------------------------------ avatar
const AV = {
	// the «?» floats over the Bay of Biscay: a calm sea field behind and inside the counter, framed by a few
	// large flat countries (Britain/Ireland top, France right, Iberia bottom) — reads as «map» even at 32 px
	map: {lon: -5, lat: 46.8, deg: 30},
	tint: 0.2,
	keep: {DEU: mixHex(C.sand, C.paper, 0.2), BEL: mixHex(C.ochre, C.paper, 0.35)}, // no dark steel wedge at the rim
	seaWash: 0,
	S: 688, at: [0, 0], rot: -6, halo: 16,
	rim: 0.16,
};
function avatarHtml(o = AV) {
	const W = 800;
	const view = viewAt(o.map.lon, o.map.lat, o.map.deg, 1);
	const k = W / view[2];
	const r = `x="${view[0]}" y="${view[1]}" width="${view[2]}" height="${view[3]}"`;
	const fills = tinted(o.tint, o.keep);
	const map = mapSvg(W, W, view, `<rect ${r} fill="${mixHex(C.sea, C.paper, o.seaWash)}"/>` + countries({view, fills, neutral: mixHex(C.neutral, C.paper, 0.3), strokeW: (o.stroke ?? 2.2) / k, deserts: false, graticule: false}));
	// thin atlas-burn at the very rim (outside r 330) so the circle keeps its edge on white UI — no centre haze
	const rim = pxSvg(W, W, `<defs><radialGradient id="vg" cx="50%" cy="50%" r="50%"><stop offset="0.86" stop-color="#3A2E22" stop-opacity="0"/><stop offset="1" stop-color="#2A2018" stop-opacity="${o.rim}"/></radialGradient></defs><rect width="${W}" height="${W}" fill="url(#vg)"/>`);
	const fg = pxSvg(W, W, mascot(W / 2 + o.at[0] - MC[0] * o.S, W / 2 + o.at[1] - MC[1] * o.S, o.S, {rot: o.rot, face: FACE, id: 'av', halo: o.halo}));
	return page({w: W, h: W, paper: 0, body: map + paperLayer(0.7) + rim + fg + paperLayer(0.25)});
}
/** mascot alone (transparent) — used to measure its extent inside the avatar circle */
const avatarMascotOnly = (o = AV) => page({w: 800, h: 800, paper: 0, bg: 'transparent', body: pxSvg(800, 800, mascot(400 + o.at[0] - MC[0] * o.S, 400 + o.at[1] - MC[1] * o.S, o.S, {rot: o.rot, face: FACE, id: 'av', halo: o.halo}))});

// ------------------------------------------------------------------ banner
const BW = 2560, BH = 1440;
const SAFE = {x0: (BW - 1546) / 2, y0: (BH - 423) / 2, x1: (BW + 1546) / 2, y1: (BH + 423) / 2};
const STRIP = {y0: (BH - 423) / 2, y1: (BH + 423) / 2};
const TABLET = {x0: (BW - 1855) / 2, x1: (BW + 1855) / 2};
const BN = {
	map: {lon: 11, lat: 47, deg: 84},
	tint: 0.5, russia: 0.45,
	F: 118, pillF: 63, S: 362, gap: 12, padR: 40, ls: -0.006, plateAt: 0.8, halo: 22,
	compass: {at: [186, 724], R: 152}, // fully left of the tablet crop (x 352) and inside the desktop strip
	scale: [86, 1300, 420, 18],
	chars: [
		// iso, [lon, lat], eye radius, expression — 4 characters, varied friendly moods, all in TV-only zones
		['GBR', [-1.5, 52.5], 30, {L: {browY: -0.3, browTilt: 0.2}, R: {browY: -0.7, browTilt: 0.25}}, C.navy],
		['SWE', [15.0, 58.6], 28, {L: {open: 1.0, browY: -0.35, browTilt: -0.15}, R: {open: 1.0, browY: -0.35, browTilt: -0.15}}, C.petrol],
		['ESP', [-3.7, 39.5], 44, {L: {open: 1.08, browY: -0.6, browTilt: 0.35}, R: {open: 1.08, browY: -0.6, browTilt: 0.35}}, C.ochre],
		['TUR', [34.0, 39.1], 42, {L: {browY: 0.25, browTilt: -0.3}, R: {browY: -0.6, browTilt: 0.3}}, C.plum],
	],
};
const LOG = [];
function bannerHtml(o = BN) {
	const view = viewAt(o.map.lon, o.map.lat, o.map.deg, BH / BW);
	const k = BW / view[2];
	const toPx = (ll) => {
		const [x, y] = P(ll);
		return [(x - view[0]) * k, (y - view[1]) * k];
	};
	const toU = ([x, y]) => [view[0] + x / k, view[1] + y / k];
	const cx = BW / 2, cy = BH / 2;

	// --- map: sea, engraved water-lines, rhumb lines on the sea only, tinted countries, characters at full colour
	const fills = tinted(o.tint, {RUS: mixHex(FILLS.RUS, C.paper, o.russia)});
	for (const [iso, , , , fill] of o.chars) fills[iso] = fill;
	const [kx, ky] = toU(o.compass.at);
	let rhumb = '';
	for (let i = 0; i < 32; i++) {
		const a = (i / 32) * Math.PI * 2, L = 4200 / k;
		rhumb += `<line x1="${kx}" y1="${ky}" x2="${kx + Math.sin(a) * L}" y2="${ky - Math.cos(a) * L}" stroke="${ENGRAVE}" stroke-opacity="${i % 4 === 0 ? 0.24 : 0.12}" stroke-width="${(i % 4 === 0 ? 2 : 1.3) / k}"/>`;
	}
	const r = `x="${view[0] - 50}" y="${view[1] - 50}" width="${view[2] + 100}" height="${view[3] + 100}"`;
	const map = mapSvg(BW, BH, view, `<defs>${seaMask('seaOnly', view)}</defs><rect ${r} fill="${C.sea}"/>` + waterlines(view, k, {n: 4, gapPx: 9, linePx: 1.7, opacity: 0.45}) + `<g mask="url(#seaOnly)">${rhumb}</g>` + countries({view, fills, strokeW: 2.3 / k, deserts: false}));

	// --- country characters (all looking toward the lockup), each checked: fully inside its country and fully
	// outside the desktop strip / safe area / tablet edge
	let faces = '';
	LOG.length = 0;
	const faceTest = (iso, ll, rr) => {
		const [x, y] = toPx(ll);
		const top = y - 1.9 * rr, bot = y + 1.15 * rr, l = x - 2.15 * rr, rt = x + 2.15 * rr;
		const pts = [[l, y], [rt, y], [x, top], [x, bot], [l + 0.3 * rr, top + 0.4 * rr], [rt - 0.3 * rr, top + 0.4 * rr], [l + 0.3 * rr, bot - 0.2 * rr], [rt - 0.3 * rr, bot - 0.2 * rr], [l + 0.2 * rr, y - 1.2 * rr], [rt - 0.2 * rr, y - 1.2 * rr]];
		const outside = pts.filter((p) => !inCountry(iso, toU(p))).length;
		const inStrip = bot > STRIP.y0 - 6 && top < STRIP.y1 + 6;
		const cutTablet = (l < TABLET.x0 && rt > TABLET.x0) || (l < TABLET.x1 && rt > TABLET.x1);
		const bad = inStrip || outside > 0 || cutTablet || top < 24 || bot > BH - 24 || l < 24 || rt > BW - 24;
		return {x, y, top, bot, l, rt, outside, inStrip, cutTablet, bad};
	};
	for (const [iso, want, rr, expr] of o.chars) {
		// nearest valid spot to the wanted lon/lat (0.1° grid, ±4°): fully inside the country, outside strip/edges
		let ll = want, t = faceTest(iso, want, rr);
		if (t.bad) {
			let best = null;
			for (let dx = -4; dx <= 4; dx += 0.1)
				for (let dy = -4; dy <= 4; dy += 0.1) {
					const c = [want[0] + dx, want[1] + dy], d = dx * dx + dy * dy;
					if (best && d >= best.d) continue;
					if (!faceTest(iso, c, rr).bad) best = {c, d};
				}
			if (best) (ll = best.c), (t = faceTest(iso, ll, rr));
		}
		const {x, y} = t;
		const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1;
		faces += eyes(x, y, rr, {...expr, lookX: (dx / d) * 0.85, lookY: (dy / d) * 0.85, skin: fills[iso], sw: 0.15 * rr, bw: 0.24 * rr, id: 'f' + iso});
		LOG.push(`face ${iso} r ${rr} at ${ll.map((v) => v.toFixed(1))} → ${Math.round(x)},${Math.round(y)} box x ${Math.round(t.l)}…${Math.round(t.rt)} y ${Math.round(t.top)}…${Math.round(t.bot)}: ${t.bad ? 'BAD' : 'ok'}${t.outside ? ` (${t.outside} pts outside)` : ''}${t.inStrip ? ' (strip)' : ''}${t.cutTablet ? ' (tablet cut)' : ''}`);
	}

	// --- atlas ornaments: compass rose (desktop strip, left), scale bar (TV only, bottom-left)
	const deco = compass(o.compass.at[0], o.compass.at[1], o.compass.R) + scaleBar(...o.scale);

	// --- lockup: mascot standing on the left end of a paper cartouche that holds wordmark + full-width pill.
	// The mascot spans both text lines; the pill is exactly as wide as the wordmark (one justified text block).
	const wm = wordmark(0, 0, 'WAS WÄRE WENN', o.F, {ls: o.ls});
	const mW = 0.655 * o.S;
	const total = mW + o.gap + wm.w + o.padR;
	const x0 = cx - total / 2;
	const mx = x0 + mW / 2 - MC[0] * o.S;
	const tx = x0 + mW + o.gap + wm.w / 2;
	const ph = 0.7 * o.pillF + 0.8 * o.pillF, gapWP = 0.19 * o.F;
	const blockH = wm.bot - wm.top + gapWP + ph;
	const yTop = cy - blockH / 2;
	const wy = yTop - wm.top, py = wy + wm.bot + gapWP + ph / 2;
	const pl = pill(tx, py, 'GESCHICHTE AUF DER KARTE', o.pillF, {w: wm.w - 0.165 * o.F * 0.5});
	const plY0 = yTop - 24, plY1 = yTop + blockH + 24;
	const px0 = x0 + mW * o.plateAt, px1 = x0 + total;
	const plate = cartouche(px0, plY0, px1 - px0, plY1 - plY0);
	let lock = plate + wordmark(tx, wy, 'WAS WÄRE WENN', o.F, {ls: o.ls}).svg + pl.svg;
	lock += mascot(mx, cy - MC[1] * o.S, o.S, {rot: -6, face: FACE, id: 'bn', halo: o.halo});
	const mTop = cy - 0.448 * o.S, mBot = cy + 0.448 * o.S;
	LOG.push(`lockup x ${Math.round(x0)}…${Math.round(x0 + total)} (safe ${SAFE.x0}…${SAFE.x1}), plate y ${Math.round(plY0)}…${Math.round(plY1)}, mascot y ${Math.round(mTop)}…${Math.round(mBot)} (safe ${SAFE.y0}…${SAFE.y1}); wordmark F ${o.F} (cap ${Math.round(0.7 * o.F)} px → ${(0.7 * o.F * 390 / 1546).toFixed(1)} px on phone), pill cap ${Math.round(0.7 * o.pillF)} px → ${(0.7 * o.pillF * 390 / 1546).toFixed(1)} px`);

	const html = page({w: BW, h: BH, paper: 0, body: map + paperLayer(0.8) + pxSvg(BW, BH, deco + faces + lock) + paperLayer(0.32)});
	return html;
}
/** paper cartouche: light plate, ink double rule, concave corners (concept B), no finials poking out */
function cartouche(x0, y0, w, h, {ink = INK, fill = '#F2EAD5'} = {}) {
	const rr = 24, i = 12;
	const notch = (X0, Y0, X1, Y1, q) => `M${X0 + q},${Y0} H${X1 - q} A${q},${q} 0 0 0 ${X1},${Y0 + q} V${Y1 - q} A${q},${q} 0 0 0 ${X1 - q},${Y1} H${X0 + q} A${q},${q} 0 0 0 ${X0},${Y1 - q} V${Y0 + q} A${q},${q} 0 0 0 ${X0 + q},${Y0} Z`;
	const x1 = x0 + w, y1 = y0 + h;
	let s = `<path transform="translate(3 8)" d="${notch(x0, y0, x1, y1, rr)}" fill="${INK}" opacity="0.9"/>`; // same sticker depth as wordmark
	s += `<path d="${notch(x0, y0, x1, y1, rr)}" fill="${fill}" stroke="${ink}" stroke-width="7"/>`;
	s += `<path d="${notch(x0 + i, y0 + i, x1 - i, y1 - i, rr - 6)}" fill="none" stroke="${ink}" stroke-width="2.4"/>`;
	return s;
}

// ------------------------------------------------------------------ watermark (YouTube «Branding» watermark, ~60 px on video)
const WM = {S: 272, rot: -6, at: [0, 0], halo: 22};
function watermarkHtml(o = WM) {
	const W = 300;
	// simplified mascot: same glyph, gold, ink outline and eyes; no extrusion (cleaner at ~60 px), slightly bigger
	// eyes and heavier brows; a thin paper keyline around everything so outline and brows also hold on dark footage
	const m = mascot(W / 2 + o.at[0] - MC[0] * o.S, W / 2 + o.at[1] - MC[1] * o.S, o.S, {rot: o.rot, face: {...FACE, r: 96}, simple: true, out: 0.075, id: 'wm', eyeK: {sw: 18, bw: 34}, halo: o.halo});
	return page({w: W, h: W, paper: 0, bg: 'transparent', css: 'html,body,#stage{background:transparent!important}', body: pxSvg(W, W, m)});
}

// ------------------------------------------------------------------ run
const CHECK = path.join(ROOT, 'kit/check.py');
const check = (mode, png, sheet) => {
	const out = execFileSync('python3', [CHECK, mode, png, sheet], {encoding: 'utf8'});
	process.stdout.write(out);
};
async function out(html, name, w, h, opts) {
	const f = path.join(HERE, `${name}.png`);
	await render(html, f, w, h, opts);
	if (tag) fs.copyFileSync(f, path.join(HERE, 'work', `${path.basename(name)}_${tag}.png`));
	console.log('wrote', f);
	return f;
}
const radius = (png) => execFileSync('python3', ['-c', `
from PIL import Image
import math
im = Image.open('${png}').convert('RGBA'); a = im.split()[3]; W, H = im.size
m = 0
px = a.load()
for y in range(0, H, 2):
    for x in range(0, W, 2):
        if px[x, y] > 40:
            m = max(m, math.hypot(x - W / 2 + 0.5, y - H / 2 + 0.5))
print(f'mascot max radius {m:.0f} px (86% circle = 344, crop = 400)')`], {encoding: 'utf8'});

if (what === 'avatar' || what === 'all') {
	const f = await out(avatarHtml(), 'avatar', 800, 800);
	const m = await out(avatarMascotOnly(), 'work/avatar_mascot_only', 800, 800, {transparent: true});
	process.stdout.write(radius(m));
	check('avatar', f, path.join(HERE, 'avatar_check.png'));
}
if (what === 'banner' || what === 'all') {
	const f = await out(bannerHtml(), 'banner', BW, BH);
	console.log(LOG.join('\n'));
	check('banner', f, path.join(HERE, 'banner_check.png'));
}
if (what === 'watermark' || what === 'all') {
	const f = await out(watermarkHtml(), 'watermark', 300, 300, {transparent: true});
	process.stdout.write(radius(f));
	console.log(`watermark ${(fs.statSync(f).size / 1024).toFixed(0)} KB`);
}

// ------------------------------------------------------------------ exploration: avatar backdrops side by side
if (what === 'variants') {
	const V = {
		biscay: {...AV, map: {lon: -5, lat: 46.8, deg: 30}, tint: 0.2, seaWash: 0},
		france: {...AV, map: {lon: 3, lat: 46.5, deg: 32}, tint: 0.4},
		med: {...AV, map: {lon: 14, lat: 41, deg: 32}, tint: 0.3, seaWash: 0},
		eu60: {...AV, tint: 0.6},
		north: {...AV, map: {lon: 6, lat: 56, deg: 34}, tint: 0.25, seaWash: 0},
	};
	const files = [];
	for (const [n, v] of Object.entries(V)) files.push(await out(avatarHtml(v), 'work/av_' + n, 800, 800));
	execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
fs = sys.argv[1:]
def circ(im, d):
    big = im.convert('RGBA').resize((d*4, d*4), Image.LANCZOS)
    m = Image.new('L', (d*4, d*4), 0); ImageDraw.Draw(m).ellipse((0, 0, d*4-1, d*4-1), fill=255); big.putalpha(m)
    return big.resize((d, d), Image.LANCZOS)
sheet = Image.new('RGB', (len(fs)*300, 520), (255,255,255))
dr = ImageDraw.Draw(sheet); dr.rectangle((0, 260, sheet.width, 520), fill=(15,15,15))
for i, f in enumerate(fs):
    im = Image.open(f)
    for j, y0 in enumerate((0, 260)):
        sheet.paste(circ(im, 196), (i*300+10, y0+10), circ(im, 196))
        x = i*300+215
        for d in (48, 32, 24):
            c = circ(im, d); sheet.paste(c, (x, y0+10), c); y0 += d + 10
    dr.text((i*300+10, 240), f.split('/')[-1], fill=(0,0,0))
sheet.save('${path.join(HERE, 'work/av_variants.png')}')
`, ...files]);
	console.log('sheet work/av_variants.png');
}
