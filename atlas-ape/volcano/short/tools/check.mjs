// Render-free checks of the edit (run before every render):  node tools/check.mjs
//  1. every event is anchored to an existing VO word and the word text matches (catches drift after re-alignment)
//  2. visual events: no gap > 2.5 s from 0 to the end (76.8 s)
//  3. SFX names exist in public/sfx/index.json; assets referenced by the scenes exist (photos, terrain, globe, atlas frames)
//  4. every number shown on screen (string literals / counters in src/scenes, src/ui) is backed by the SCRIPT.md fact table
//  5. Atlas on screen 35–45 % of the runtime; subtitles never in the bottom 15 % / right-hand button column
//  6. Hawaii Blender sequences: src/data track copies byte-identical to public/blender/<shot>/track.json, frame folders
//     exactly f_0001…f_n and covering their Layer
// Writes out/timeline.json (events with absolute times) for tools/mix.py.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const words = JSON.parse(fs.readFileSync(path.join(root, 'data/words.json'), 'utf8'));
// events.ts is plain data with type annotations: strip the types (node:module) and import it as an ES module
const {stripTypeScriptTypes} = await import('node:module');
const evTmp = path.join(root, 'out/.events.mjs');
fs.mkdirSync(path.join(root, 'out'), {recursive: true});
fs.writeFileSync(evTmp, stripTypeScriptTypes(fs.readFileSync(path.join(root, 'src/data/events.ts'), 'utf8')));
const {EVENTS} = await import(evTmp + '?' + Date.now());
const DURATION = 76.8;
let errors = 0;
const err = (m) => { errors++; console.log('✗', m); };
const ok = (m) => console.log('✓', m);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// 1. anchors
for (const e of EVENTS) {
	const w = words[e.w];
	if (!w) { err(`${e.id}: word ${e.w} does not exist`); continue; }
	if (norm(w.w) !== norm(e.word)) err(`${e.id}: word ${e.w} is «${w.w}», expected «${e.word}»`);
	e.t = +(w.s + (e.dt ?? 0)).toFixed(3);
}
ok(`${EVENTS.length} events anchored to VO words`);

// 2. gaps
const ts = [...EVENTS.map((e) => e.t), DURATION].sort((a, b) => a - b);
let maxGap = 0;
let prev = 0;
for (const t of ts) {
	if (t - prev > 2.5) err(`gap ${(t - prev).toFixed(2)} s between ${prev.toFixed(2)} and ${t.toFixed(2)}`);
	maxGap = Math.max(maxGap, t - prev);
	prev = t;
}
ok(`max gap between visual events ${maxGap.toFixed(2)} s (limit 2.5)`);

// 3. assets
const sfxIndex = JSON.parse(fs.readFileSync(path.join(root, 'public/sfx/index.json'), 'utf8'));
const sfxNames = new Set(sfxIndex.map((s) => s.name));
let nSfx = 0;
for (const e of EVENTS) for (const s of e.sfx ?? []) { nSfx++; if (!sfxNames.has(s.name)) err(`${e.id}: unknown SFX ${s.name}`); }
ok(`${nSfx} SFX cues, all in the library`);
const src = ['src/scenes', 'src/ui', 'src', 'src/three'].flatMap((d) => fs.readdirSync(path.join(root, d)).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(root, d, f)));
const code = Object.fromEntries(src.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const refs = new Set();
for (const c of Object.values(code)) for (const m of c.matchAll(/['"`]((?:photos|globe|terrain|sfx|blender)\/[\w./-]+\.(?:jpg|png|wav|bin|json))['"`]/g)) refs.add(m[1]);
for (const r of refs) if (!fs.existsSync(path.join(root, 'public', r))) err(`missing asset public/${r}`);
for (const reg of ['hawaii', 'hawaii_flow', 'hawaii_vent', 'etna', 'etna_wide', 'heimaey', 'heimaey_wide'])
	for (const f of ['meta.json', 'height.bin', 'sat.jpg']) if (!fs.existsSync(path.join(root, 'public/terrain', reg, f))) err(`missing terrain ${reg}/${f}`);
const atlasN = fs.readdirSync(path.join(root, 'public/atlas')).filter((f) => f.endsWith('.webp')).length;
if (atlasN < Math.round(DURATION * 30)) err(`atlas frames ${atlasN} < ${Math.round(DURATION * 30)}`);
ok(`${refs.size} referenced assets exist, ${atlasN} Atlas frames`);
const credits = fs.readFileSync(path.join(root, 'public/photos/credits.jsonl'), 'utf8');
for (const r of refs) if (r.startsWith('photos/') && !credits.includes(path.basename(r))) err(`photo without credit entry: ${r}`);

// 4. numbers on screen vs the SCRIPT.md fact table
const script = fs.readFileSync(path.join(root, '../SCRIPT.md'), 'utf8');
const table = script.slice(script.indexOf('## Проверка фактов'));
// allowed tokens = every number in the fact table (+ derived: 5 months, 7.3 billion liters, score 2 : 0, «one» building)
const allowed = new Set([...table.matchAll(/\d[\d,.]*/g)].flatMap((m) => {
	const v = m[0].replace(/[.,]$/, '');
	return [v, v.replace(/,/g, '')];
}));
['5', '7.3', '2', '0', '1', '6', '100', '1936', '1973', '1992', '1935', '23', '27', '2', '10'].forEach((x) => allowed.add(x));
const monthsOk = /6 February – 10 July 1973/.test(table) || /6 February/.test(table);
const shown = [];
for (const [f, c] of Object.entries(code)) {
	if (!/scenes|Short|ui/.test(f)) continue;
	// text props of on-screen graphics and counter targets
	for (const m of c.matchAll(/(?:text|sub|label|unit|note|small)=\{?['"`]([^'"`]*\d[^'"`]*)['"`]/g)) shown.push([path.basename(f), m[1]]);
	for (const m of c.matchAll(/<Counter[^>]*\bto=\{([\d.]+)\}/g)) shown.push([path.basename(f), m[1]]);
	for (const m of c.matchAll(/>([^<>{}\n]*\d[^<>{}\n]*)</g)) if (!/[=&|()?]/.test(m[1])) shown.push([path.basename(f), m[1].trim()]);
}
const facts = [];
for (const [f, s] of shown) {
	if (/^(Photo|REAL PHOTO|Zafferana|Heimaey harbour|The 1973|Steaming|Bombs for)/.test(s) || /CC BY|USGS|Signal Corps|public domain/i.test(s)) continue; // credit lines
	const nums = (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[.,]$/, ''));
	for (const n of nums) if (!allowed.has(n) && !allowed.has(n.replace(/,/g, ''))) err(`${f}: on-screen number «${n}» in «${s}» is not in the SCRIPT.md fact table`);
	facts.push(s);
}
if (!monthsOk) err('months range not in the fact table');
ok(`${facts.length} on-screen strings with numbers checked against the fact table`);
if (!/27 DEC 1935/i.test(facts.join('|'))) err('bombing date missing');
const ins = code[path.join(root, 'src/scenes/Inserts.tsx')];
if (/disput/i.test(ins) && !/IT WORKED|it worked|success/.test(ins.replace(/\/\/.*$/gm, ''))) ok('bombing effect shown as disputed, never as a success');
else err('the 1935 bombing must be shown as disputed (and never as a success)');
// STYLE v3 (owner notes 18.10): no shouting stickers/headlines/counters/flashes in the scenes; labels small and calm
for (const [f, c] of Object.entries(code)) {
	if (!/scenes|Short\.tsx/.test(f)) continue;
	const body = c.replace(/\/\/.*$/gm, '');
	for (const comp of ['BigText', 'DateStamp', 'Stamp', 'Chip', 'Counter', 'Flash', 'LightLeak', 'Pin'])
		if (new RegExp(`<${comp}[\\s/>]`).test(body)) err(`${path.basename(f)} still uses <${comp}> (STYLE.md: no chips, stickers, stamps, headlines, counters, flashes)`);
	for (const m of body.matchAll(/<Label\b[^>]*?\bsize=\{(\d+)\}/g)) if (+m[1] > 64) err(`${path.basename(f)}: Label size ${m[1]} > 64`);
}
ok('STYLE v3 component rules checked');
if (Object.values(code).some((c) => /23 MAY 1992/.test(c))) err('«23 MAY 1992» on screen — the decisive blast date is disputed by the research (27 May), keep it off screen');

// 5. Atlas only in the hook, the Etna moment and the final (owner's notes 19.10); subtitles centred, low, out of the bottom 15 %
const short = code[path.join(root, 'src/Short.tsx')];
const W = (i) => words[i].s;
const atlasBlock = short.slice(short.indexOf('export const ATLAS'), short.indexOf('];', short.indexOf('export const ATLAS')));
const allowedAtlas = [[0, W(17)], [W(48), W(57)], [W(138) - 0.5, DURATION + 0.1]];
let share = 0;
for (const m of atlasBlock.matchAll(/t0: ([^,]+), t1: ([^,]+),/g)) {
	const t0 = Function('W', `return ${m[1]}`)(W);
	const t1 = Function('W', `return ${m[2]}`)(W);
	share += t1 - t0;
	if (!allowedAtlas.some(([a, b]) => t0 >= a - 1e-6 && t1 <= b + 1e-6)) err(`Atlas window ${t0.toFixed(2)}–${t1.toFixed(2)} s is outside hook / Etna / final`);
}
ok(`Atlas on screen ${share.toFixed(1)} s (${((share / DURATION) * 100).toFixed(1)} %), only hook / Etna / final`);
const subYs = [...short.slice(short.indexOf('const subY'), short.indexOf('const scoreSpoken')).matchAll(/return (\d{3,4});/g)].map((m) => +m[1]);
for (const y of subYs) if (y + 70 > 1920 * 0.85) err(`subtitle centre y=${y} reaches the bottom 15 %`);
const subs = code[path.join(root, 'src/ui/Subtitles.tsx')];
const box = subs.match(/left: (\d+),\n\t\t\t\twidth: (\d+)/);
const left = +box[1];
const width = +box[2];
const font = +(subs.match(/fontSize: (\d+)/) ?? [])[1];
if (Math.abs(left + width / 2 - 540) > 1) err(`subtitle box centre x=${left + width / 2} (must be 540)`);
const maxChars = 14 + 9; // a group closes at ≥ 14 chars, the last word can add up to ~9
const estW = maxChars * font * 0.62;
if (540 + estW / 2 > 930) err(`widest subtitle line ≈ ${estW.toFixed(0)} px reaches the right-hand buttons`);
ok(`subtitles centred at x=540, font ${font}px (widest ≈ ${estW.toFixed(0)} px), centres y ${subYs.join('/')}`);
if (!/last\.e \+ 0\.15/.test(subs)) err('subtitles must disappear when the words end (last.e + 0.15)');

// 6. Blender image sequences of the Hawaii shots: every overlay (pins, reticles, route, bomb targets) reads the track copy in
//    src/data, and ImgSeq takes its frame count from it — a re-render without re-copying would shift them all silently.
//    Each copy must be byte-identical to the render's public/blender/<shot>/track.json; the folder must hold exactly
//    f_0001 … f_n (n = the track's frames), from the Layer's start to the last frame the Layer shows (t1 + XF − 1/fps).
{
	const tSrc = short.slice(short.indexOf('export const T = {') + 'export const T = '.length, short.indexOf('};', short.indexOf('export const T = {')) + 1);
	const TT = Function('W', `return (${tSrc.replace(/ as const/g, '')});`)(W);
	const XFs = 0.4;
	const SEQS = [
		{dir: 'hawaii_hook', copy: 'hawaii_hook_track.json', layer: [0, TT.globeA[0]]},
		{dir: 'hawaii_a', copy: 'hawaii_a_track.json', layer: TT.hawA},
		{dir: 'hawaii_raid', copy: 'hawaii_raid_track.json', layer: TT.hawA2},
		{dir: 'hawaii_b', copy: 'hawaii_b_track.json', layer: TT.hawB},
	];
	const notes = [];
	for (const q of SEQS) {
		const pub = path.join(root, 'public/blender', q.dir);
		const cp = path.join(root, 'src/data', q.copy);
		if (!fs.existsSync(path.join(pub, 'track.json')) || !fs.existsSync(cp)) { err(`${q.dir}: track.json or src/data/${q.copy} missing`); continue; }
		if (!fs.readFileSync(cp).equals(fs.readFileSync(path.join(pub, 'track.json')))) err(`src/data/${q.copy} differs from public/blender/${q.dir}/track.json (re-copy after a re-render)`);
		const tr = JSON.parse(fs.readFileSync(cp, 'utf8'));
		const n = tr.frames.length;
		if (tr.n !== undefined && tr.n !== n) err(`${q.copy}: n ${tr.n} ≠ ${n} frames`);
		const fr = fs.readdirSync(pub).filter((f) => /^f_\d{4}\.jpg$/.test(f)).sort();
		const want = Array.from({length: n}, (_, i) => `f_${String(i + 1).padStart(4, '0')}.jpg`);
		if (fr.length !== n || want.some((f, i) => fr[i] !== f)) err(`public/blender/${q.dir}: ${fr.length} frames, expected exactly f_0001…f_${String(n).padStart(4, '0')}`);
		const last = tr.t0 + (n - 1) / tr.fps;
		const need = q.layer[1] + XFs - 1 / tr.fps;
		if (tr.t0 > q.layer[0] + 1 / tr.fps + 1e-6) err(`${q.dir}: starts at ${tr.t0.toFixed(3)} s, after its Layer (${q.layer[0].toFixed(3)} s)`);
		if (last < need - 1e-6) err(`${q.dir}: last frame ${last.toFixed(3)} s < ${need.toFixed(3)} s (the Layer's last shown frame)`);
		notes.push(`${q.dir} ${n} f to ${last.toFixed(3)} s (Layer to ${need.toFixed(3)})`);
	}
	ok(`Hawaii Blender sequences: track copies identical, frame folders complete — ${notes.join(', ')}`);
}

fs.mkdirSync(path.join(root, 'out'), {recursive: true});
fs.writeFileSync(path.join(root, 'out/timeline.json'), JSON.stringify({duration: DURATION, events: EVENTS}, null, 1));
console.log(errors ? `\n${errors} ERROR(S)` : '\nall checks passed → out/timeline.json');
process.exit(errors ? 1 : 0);
