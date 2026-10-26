// map placement test for the avatar
import {C, countries, face, page, render, mapSvg, pxSvg} from '../../../kit/kit.mjs';
import {forkMark} from '../build.mjs';
import {execFileSync} from 'node:child_process';
const OUT = new URL('.', import.meta.url).pathname;
const BOX = [-294, -519, 530, 489];
const F1 = {DEU: C.steel, FRA: C.navy, GBR: C.rose, ITA: C.olive, RUS: C.brick, POL: C.rose, ESP: C.sand, TUR: C.moss, NOR: C.navy, SWE: C.sand, GRC: C.petrol, DZA: C.sand, LBY: C.ochre, TUN: C.rose, EGY: C.rose, BGR: C.sand, SRB: C.rose, HRV: C.sand, BIH: C.sand, ALB: C.rose, MKD: C.moss, ROU: C.ochre, HUN: C.rose, AUT: C.sand, CHE: C.rose, CZE: C.sand, UKR: C.sand, BLR: C.olive, FIN: C.olive, DNK: C.rose, NLD: C.ochre, BEL: C.sand, IRL: C.olive, PRT: C.olive, MAR: C.rose, SYR: C.sand, CYP: C.sand};
const sets = [
	['med', [4255, 3330, 1080, 1080], [178, 470, 'ITA']],
	['wide', [4120, 2830, 1450, 1450], [178, 470, 'FRA']],
	['med2', [4300, 3260, 960, 960], [178, 470, 'FRA']],
];
const files = [];
for (const [name, view, fpos] of sets) {
	const map = mapSvg(800, 800, view, `<rect width="10000" height="10000" fill="${C.sea}"/>` + countries({view, fills: F1, strokeW: 2.4 * view[2] / 940}));
	const cx = (BOX[0] + BOX[2]) / 2, cy = (BOX[1] + BOX[3]) / 2;
	const vign = `<defs><radialGradient id="vg" cx="50%" cy="50%" r="50%"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2a2016" stop-opacity="0.38"/></radialGradient></defs><rect width="800" height="800" fill="url(#vg)"/>`;
	const over = pxSvg(800, 800, `${vign}<g transform="translate(400 400) scale(0.585) translate(${-cx} ${-cy})">${forkMark({shadow: 22})}</g>`);
	const f = `${OUT}exp2_${name}.png`;
	await render(page({w: 800, h: 800, body: map + over}), f, 800, 800);
	files.push(f);
}
execFileSync('python3', [`${OUT}minisheet.py`, `${OUT}exp2_sheet.png`, ...files], {stdio: 'inherit'});
