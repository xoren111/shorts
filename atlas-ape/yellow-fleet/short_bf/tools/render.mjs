// Final render: ONE bundle, resumable 300-frame chunks, hang guard, retries → out/chunks/*.mp4 → concat + final mix
//   node tools/render.mjs                  render missing chunks, then out/FINAL/the_yellow_fleet.mp4
//   ONLY=3,7 node tools/render.mjs         re-render chunks 3 and 7 (delete them first)
//   CONC=3 CHUNK=300 node tools/render.mjs
import {bundle} from '@remotion/bundler';
import {makeCancelSignal, renderMedia, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CONC = Number(process.env.CONC ?? 3);
const CHUNK = Number(process.env.CHUNK ?? 300);
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null;
const dir = path.join(root, 'out/chunks');
fs.mkdirSync(dir, {recursive: true});
fs.mkdirSync(path.join(root, 'out/FINAL'), {recursive: true});
const log = (m) => console.log(`${new Date().toTimeString().slice(0, 8)} ${m}`);

log('bundling …');
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public'), onProgress: () => {}});
const cleanup = () => { try { fs.rmSync(serveUrl, {recursive: true, force: true}); } catch {} };
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));
const composition = await selectComposition({serveUrl, id: 'Short', chromiumOptions: {gl: 'angle'}});
const total = composition.durationInFrames;
const chunks = [];
for (let a = 0, k = 0; a < total; a += CHUNK, k++) chunks.push({k, a, b: Math.min(total - 1, a + CHUNK - 1)});
log(`${total} frames, ${chunks.length} chunks of ${CHUNK}, concurrency ${CONC}`);

for (const c of chunks) {
	const f = path.join(dir, `part_${String(c.k).padStart(2, '0')}_${c.a}-${c.b}.mp4`);
	if (ONLY ? !ONLY.has(c.k) : fs.existsSync(f) && fs.statSync(f).size > 0) continue;
	let ok = false;
	for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
		const conc = attempt === 1 ? CONC : 2;
		const {cancelSignal, cancel} = makeCancelSignal();
		let last = Date.now();
		const guard = setInterval(() => { if (Date.now() - last > 240000) { log(`chunk ${c.k}: no progress for 4 min → cancel`); cancel(); } }, 10000);
		const t0 = Date.now();
		try {
			log(`chunk ${c.k} frames ${c.a}-${c.b} (try ${attempt}, concurrency ${conc})`);
			await renderMedia({
				composition, serveUrl, codec: 'h264', outputLocation: f + '.tmp.mp4', frameRange: [c.a, c.b], muted: true, crf: 16, x264Preset: 'medium',
				imageFormat: 'jpeg', jpegQuality: 94, concurrency: conc, chromiumOptions: {gl: 'angle'}, timeoutInMilliseconds: 180000, cancelSignal,
				onProgress: () => { last = Date.now(); }, logLevel: 'error',
			});
			fs.renameSync(f + '.tmp.mp4', f);
			ok = true;
			log(`chunk ${c.k} done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
		} catch (e) {
			log(`chunk ${c.k} failed: ${String(e).slice(0, 300)}`);
			try { fs.rmSync(f + '.tmp.mp4', {force: true}); } catch {}
		} finally {
			clearInterval(guard);
		}
	}
	if (!ok) { log(`CHUNK ${c.k} FAILED 3x`); process.exit(3); }
}

const list = path.join(dir, 'list.txt');
fs.writeFileSync(list, chunks.map((c) => `file 'part_${String(c.k).padStart(2, '0')}_${c.a}-${c.b}.mp4'`).join('\n') + '\n');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(root, 'out/video_noaudio.mp4')]);
const audio = path.join(root, 'out/sound/final_mix.wav');
const out = path.join(root, 'out/FINAL/the_yellow_fleet_B_friend.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(root, 'out/video_noaudio.mp4'), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out]);
log('→ ' + out);
console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,sample_rate', '-of', 'compact', out]).toString());
