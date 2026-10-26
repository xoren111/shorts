// one-off: measure Montserrat text extents (em units at weight 900/800) in headless Chrome
import fs from 'node:fs';
import pp from 'puppeteer-core';
const CHROME = '/Users/khorengrigoryan/shorts/oel-1941/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const F = fs.readFileSync('kit/fonts/Montserrat-VF.ttf').toString('base64');
const b = await pp.launch({executablePath: CHROME, headless: 'shell', args: ['--headless=old', '--use-gl=angle', '--no-sandbox', '--no-zygote', '--hide-scrollbars', '--force-device-scale-factor=1']});
const pg = await b.newPage();
const items = [['WAS WÄRE WENN', 900, 0.012], ['GESCHICHTE AUF DER KARTE', 800, 0.05], ['?', 900, 0], ['ZWEITER WELTKRIEG · IMPERIEN · GRENZEN', 800, 0.05], ['WAS WÄRE', 900, 0.012], ['WENN', 900, 0.012]];
await pg.setContent(`<html><head><style>@font-face{font-family:M;src:url(data:font/ttf;base64,${F})}</style></head><body><svg width="4000" height="400">${items.map(([t, w, ls], i) => `<text id="t${i}" x="0" y="200" font-family="M" font-weight="${w}" font-size="100" letter-spacing="${ls * 100}">${t}</text>`).join('')}</svg></body></html>`);
await pg.evaluate(() => document.fonts.ready);
const r = await pg.evaluate((n) => [...Array(n).keys()].map((i) => { const e = document.getElementById('t' + i); const bb = e.getBBox(); return [e.textContent, +(bb.width / 100).toFixed(4), +(e.getComputedTextLength() / 100).toFixed(4), +(bb.y - 200).toFixed(1), +bb.height.toFixed(1)]; }), items.length);
console.log(JSON.stringify(r, null, 0));
await b.close();
