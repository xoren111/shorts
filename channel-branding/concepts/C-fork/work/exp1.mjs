// geometry exploration for the fork mark: renders several variants on the same map disc
import {C, countries, page, render, mapSvg, pxSvg} from '../../../kit/kit.mjs';
import {execFileSync} from 'node:child_process';

const OUT = new URL('.', import.meta.url).pathname;

const fills = {DEU: C.steel, FRA: C.navy, GBR: C.rose, ITA: C.olive, RUS: C.brick, POL: C.rose, ROU: C.ochre, ESP: C.sand, UKR: C.sand, TUR: C.moss, SWE: C.sand, NOR: C.navy, BLR: C.neutral, AUT: C.neutral, CZE: C.neutral};

// stroke helpers (units of the mark box, ~1000 wide, centred on 0,0)
const arrowHead = (x, y, dx, dy, L, B) => {
	const n = Math.hypot(dx, dy);
	const tx = dx / n, ty = dy / n, nx = -ty, ny = tx;
	const tip = [x + tx * L * 0.62, y + ty * L * 0.62];
	const b1 = [x - tx * L * 0.38 + nx * B / 2, y - ty * L * 0.38 + ny * B / 2];
	const b2 = [x - tx * L * 0.38 - nx * B / 2, y - ty * L * 0.38 - ny * B / 2];
	return `M${tip} L${b1} L${b2} Z`;
};

function mark(v, {W = 100, o = 24, dash = 'inkSolid'} = {}) {
	const g = C.gold, k = C.ink;
	let solid, hook, head, dot;
	if (v === 'A') {
		// Y: solid arm up-left, upright ? on the right (stem = trunk)
		solid = 'M0,430 L0,150 C0,40 -80,-30 -230,-120';
		head = arrowHead(-230, -120, -150, -90, 2.2 * W, 2.3 * W);
		hook = 'M0,150 C0,40 230,40 230,-150 C230,-290 130,-380 0,-380 C-130,-380 -220,-300 -225,-170';
		dot = null;
	} else if (v === 'C') {
		// ? with stem; solid arrow shoots right from the neck
		dot = [0, 420, 0.78 * W];
		solid = 'M0,290 L0,170 C0,90 50,50 150,20 L360,-40';
		head = arrowHead(360, -40, 210, -60, 2.2 * W, 2.3 * W);
		hook = 'M0,170 L0,90 C0,0 220,-10 220,-200 C220,-330 120,-420 0,-420 C-120,-420 -215,-340 -220,-215';
	} else if (v === 'G') {
		// Y: node = ?-dot; dashed arm rises up-right and curls into the ? bowl; solid arm up-left
		dot = [0, 210, 0.9 * W];
		solid = 'M0,470 L0,210 C-60,140 -160,40 -300,-60';
		head = arrowHead(-300, -60, -140, -100, 2.2 * W, 2.3 * W);
		hook = 'M0,210 C40,130 110,40 150,-40 C200,-150 240,-200 200,-300 C160,-400 40,-430 -40,-400 C-120,-370 -160,-300 -150,-210';
	} else if (v === 'H') {
		// like G, ? more upright, solid arm lower
		dot = [-20, 230, 0.9 * W];
		solid = 'M-20,480 L-20,230 C-90,200 -220,130 -340,30';
		head = arrowHead(-340, 30, -120, -100, 2.2 * W, 2.3 * W);
		hook = 'M-20,230 C10,150 60,60 90,-10 C140,-110 230,-170 230,-280 C230,-390 140,-450 40,-450 C-60,-450 -150,-390 -160,-290';
	}
	const ink = W + 2 * o;
	const D = W * 1.05, G = W * 1.65; // dash/gap (round caps add W)
	let s = '';
	// ink under-layer
	s += `<path d="${solid}" fill="none" stroke="${k}" stroke-width="${ink}" stroke-linecap="round" stroke-linejoin="round"/>`;
	if (dash === 'inkSolid') s += `<path d="${hook}" fill="none" stroke="${k}" stroke-width="${ink}" stroke-linecap="round" stroke-linejoin="round"/>`;
	else s += `<path d="${hook}" fill="none" stroke="${k}" stroke-width="${ink}" stroke-linecap="round" stroke-dasharray="${D} ${G}" stroke-dashoffset="${-W * 1.2}"/>`;
	s += `<path d="${head}" fill="${k}" stroke="${k}" stroke-width="${2 * o}" stroke-linejoin="round"/>`;
	if (dot) s += `<circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2] + o}" fill="${k}"/>`;
	// gold
	s += `<path d="${solid}" fill="none" stroke="${g}" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round"/>`;
	s += `<path d="${hook}" fill="none" stroke="${g}" stroke-width="${W}" stroke-linecap="round" stroke-dasharray="${D} ${G}" stroke-dashoffset="${-W * 1.2}"/>`;
	s += `<path d="${head}" fill="${g}"/>`;
	if (dot) s += `<circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2]}" fill="${g}"/>`;
	return s;
}

const view = [4380, 3020, 900, 900];
const bg = mapSvg(800, 800, view, `<rect x="0" y="0" width="10000" height="10000" fill="${C.sea}"/>` + countries({view, fills, strokeW: 2.2}));

const variants = [['A', 'inkSolid'], ['C', 'inkSolid'], ['G', 'inkSolid'], ['G', 'sep'], ['H', 'inkSolid']];
const files = [];
for (const [v, dash] of variants) {
	const svg = pxSvg(800, 800, `<g transform="translate(400 400) scale(0.72)">${mark(v, {dash})}</g>`);
	const f = `${OUT}exp1_${v}_${dash}.png`;
	await render(page({w: 800, h: 800, body: bg + svg}), f, 800, 800);
	files.push(f);
	console.log(f);
}
execFileSync('python3', [`${OUT}minisheet.py`, `${OUT}exp1_sheet.png`, ...files], {stdio: 'inherit'});
