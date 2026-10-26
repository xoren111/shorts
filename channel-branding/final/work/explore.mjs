import {page, render, pxSvg, C} from '../../kit/kit.mjs';
import {mascot, CURIOUS} from '../brand.mjs';
const V = [
  {at: [352, 600], r: 86},
  {at: [370, 640], r: 90},
  {at: [395, 615], r: 84, gap: 1.08},
  {at: [330, 580], r: 92},
  {at: [380, 660], r: 96},
  {at: [400, 560], r: 80, gap: 1.05},
];
let g = '';
V.forEach((v, i) => {
  const x = 220 + (i % 3) * 440, y = 230 + Math.floor(i / 3) * 460;
  g += `<rect x="${x-210}" y="${y-220}" width="420" height="440" fill="${i%2?C.sea:C.paper}"/>`;
  g += mascot(x, y, 520, {face: v, id: 'v' + i});
  g += `<text x="${x-200}" y="${y+205}" font-size="20" font-family="Montserrat">${i}: ${JSON.stringify(v)}</text>`;
});
await render(page({w: 1320, h: 920, paper: 0, bg: '#fff', body: pxSvg(1320, 920, g)}), 'final/work/explore_mascot.png', 1320, 920);
