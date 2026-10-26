// Render stills (one bundle, one browser) + a labelled contact sheet.
//   node tools/stills.mjs --comp Short --t 1,2.5,4 --out out/stills/hook [--scale 0.5] [--props '{}'] [--cols 4]
//   node tools/stills.mjs --comp Short --every 1 --from 0 --to 24 --out out/sheets/hawaii     (a frame every N s)
// A global semaphore (out/.slots, STILLS_SLOTS=2) limits concurrent bundle+render jobs (16 GB RAM). The bundle dir is
// deleted afterwards (Remotion copies public/ into it).
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? '1' : arr[i + 1]]] : acc), []));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const comp = args.comp ?? 'Short';
const props = args.props ? JSON.parse(args.props) : {};
const out = path.resolve(root, args.out ?? 'out/stills/misc');
const scale = Number(args.scale ?? 0.5);
const FPS = 30;
fs.mkdirSync(out, {recursive: true});
let ts = [];
if (args.every) {
	const a = Number(args.from ?? 0), b = Number(args.to ?? 76.8), st = Number(args.every);
	for (let t = a; t <= b + 1e-6; t += st) ts.push(+t.toFixed(3));
} else if (args.frames) ts = String(args.frames).split(',').filter((f) => f.trim() !== '').map((f) => Number(f) / FPS);
else ts = String(args.t ?? '0').split(',').map(Number);
const frames = ts.map((t) => Math.round(t * FPS));
const labels = ts.map((t) => `${t.toFixed(2)}s`);

const SLOTS = Number(process.env.STILLS_SLOTS ?? 2);
const slotDir = path.join(root, 'out/.slots');
fs.mkdirSync(slotDir, {recursive: true});
let slot = null;
for (let tries = 0; !slot; tries++) {
	for (let k = 0; k < SLOTS && !slot; k++) {
		const d = path.join(slotDir, 'slot' + k);
		try { fs.mkdirSync(d); slot = d; } catch { try { if (Date.now() - fs.statSync(d).mtimeMs > 15 * 60 * 1000) fs.rmSync(d, {recursive: true, force: true}); } catch {} }
	}
	if (!slot) { if (tries % 15 === 0) console.log('waiting for a render slot …'); await new Promise((r) => setTimeout(r, 2000)); }
}
let bundleDir = null;
const release = () => {
	try { fs.rmSync(slot, {recursive: true, force: true}); } catch {}
	try { if (bundleDir && !args.keep) fs.rmSync(bundleDir, {recursive: true, force: true}); } catch {}
};
process.on('exit', release);
process.on('uncaughtException', (e) => { console.error(e); process.exit(1); });
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));
const keepAlive = setInterval(() => { try { fs.utimesSync(slot, new Date(), new Date()); } catch {} }, 60000);

const serveUrl = args.serve ?? (await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public'), onProgress: () => {}}));
if (!args.serve) bundleDir = serveUrl;
const browser = await openBrowser('chrome', {chromiumOptions: {gl: 'angle'}});
const composition = await selectComposition({serveUrl, id: comp, inputProps: props, puppeteerInstance: browser});
const files = [];
const t0 = Date.now();
for (let k = 0; k < frames.length; k++) {
	// --t / --every are seconds: convert with the composition's own fps (30 or 60); --frames are frames at that fps
	const fk = args.frames ? frames[k] : Math.round(ts[k] * composition.fps);
	const frame = Math.max(0, Math.min(composition.durationInFrames - 1, fk));
	const file = path.join(out, `${String(k).padStart(3, '0')}_${labels[k].replace(/[^\w.]+/g, '_')}.${args.png ? 'png' : 'jpg'}`);
	await renderStill({composition, serveUrl, frame, output: file, inputProps: props, ...(args.png ? {imageFormat: 'png'} : {imageFormat: 'jpeg', jpegQuality: 88}), scale, puppeteerInstance: browser, overwrite: true, timeoutInMilliseconds: 180000});
	files.push([file, labels[k]]);
	process.stdout.write('.');
}
console.log(`\n${files.length} stills in ${((Date.now() - t0) / 1000).toFixed(1)} s → ${path.relative(root, out)}`);
await browser.close({silent: true});
clearInterval(keepAlive);
if (args.sheet !== '0' && files.length > 1) execFileSync('python3', [path.join(root, 'tools/sheet.py'), out + '_sheet.jpg', String(args.cols ?? 6), ...files.flat()], {stdio: 'inherit'});
release();
process.exit(0);
