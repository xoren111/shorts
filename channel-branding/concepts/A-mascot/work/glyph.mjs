import {C, page, render, pxSvg} from '../../../kit/kit.mjs';
const S = 1000;
let g = '';
for (let i = 0; i <= 1000; i += 50) g += `<line x1="${i}" y1="0" x2="${i}" y2="1000" stroke="${i%100?'#bbb':'#555'}" stroke-width="${i%100?1:2}"/><line x1="0" y1="${i}" x2="1000" y2="${i}" stroke="${i%100?'#bbb':'#555'}" stroke-width="${i%100?1:2}"/>` + (i%100?'':`<text x="${i+3}" y="20" font-size="18" font-family="Montserrat">${i}</text><text x="3" y="${i-4}" font-size="18" font-family="Montserrat">${i}</text>`);
// "?" with baseline at y=850, centred at x=500
g += `<text id="q" x="500" y="850" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${S}" fill="${C.gold}" fill-opacity="0.8">?</text>`;
await render(page({w: 1000, h: 1000, bg: '#fff', paper: 0, body: pxSvg(1000, 1000, g)}), 'concepts/A-mascot/work/glyph.png', 1000, 1000);
