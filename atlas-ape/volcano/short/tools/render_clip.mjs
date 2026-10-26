// Render a time range of the Short as a review clip with the final sound (single-threaded: no render races).
//   node tools/render_clip.mjs <t0> <t1> <out.mp4>
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [t0, t1, outArg] = process.argv.slice(2);
const out = path.resolve(root, outArg ?? 'out/clip.mp4');
fs.mkdirSync(path.dirname(out), {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public'), onProgress: () => {}});
const composition = await selectComposition({serveUrl, id: 'Short'});
const fps = composition.fps;
const a = Math.round(Number(t0) * fps), b = Math.min(composition.durationInFrames - 1, Math.round(Number(t1) * fps));
const raw = out.replace(/\.mp4$/, '.noaudio.mp4');
await renderMedia({composition, serveUrl, codec: 'h264', crf: 16, outputLocation: raw, frameRange: [a, b], concurrency: 1, imageFormat: 'jpeg', jpegQuality: 94, chromiumOptions: {gl: 'angle'}, timeoutInMilliseconds: 180000});
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-ss', String(a / fps), '-t', String((b - a + 1) / fps), '-i', path.join(root, 'out/sound/final_mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
fs.rmSync(raw, {force: true});
fs.rmSync(serveUrl, {recursive: true, force: true});
console.log('clip', a, '…', b, '→', out);
