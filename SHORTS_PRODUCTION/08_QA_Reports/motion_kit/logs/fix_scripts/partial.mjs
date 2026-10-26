// Scratch: render a frame range of a composition to an mp4 (same codec settings as render.mjs) for motion iteration.
//   node dev/short/tools/_partial.mjs <comp> <fromS> <toS> <out.mp4>
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [comp, a, b, out] = process.argv.slice(2);
const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public'), onProgress: () => {}, enableCaching: false});
const composition = await selectComposition({serveUrl, id: comp, chromiumOptions: {gl: 'angle'}});
const fa = Math.round(Number(a) * 60), fb = Math.min(composition.durationInFrames - 1, Math.round(Number(b) * 60) - 1);
await renderMedia({composition, serveUrl, codec: 'h264', outputLocation: out, frameRange: [fa, fb], muted: true, crf: 16, x264Preset: 'medium', imageFormat: 'jpeg', jpegQuality: 94, colorSpace: 'bt709', concurrency: Number(process.env.CONC ?? 4), chromiumOptions: {gl: 'angle'}, timeoutInMilliseconds: 180000, logLevel: 'error'});
fs.rmSync(serveUrl, {recursive: true, force: true});
console.log(`${comp} frames ${fa}-${fb} → ${out} in ${((Date.now() - t0) / 1000).toFixed(0)} s (total ${composition.durationInFrames})`);
