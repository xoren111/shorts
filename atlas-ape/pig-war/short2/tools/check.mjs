// Render-free checks of the edit (run before every render):  node tools/check.mjs
//  1. every event is anchored to an existing VO word and the word text matches
//  2. visual events: no gap > 2.5 s from 0 to the end
//  3. SFX names exist in public/sfx/index.json; photos referenced by the scenes exist and have a CREDITS.md entry;
//     every Blender shot folder covers its shot window (frames ≥ (t1 + XF − t0)·60)
//  4. every number shown on screen (text/accent/sub/value props) appears in ../FACTS.md
//  5. Atlas frames cover the duration (he is on screen only in the ending)
// Writes out/timeline.json (events with absolute times) for tools/mix.py.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const words = JSON.parse(fs.readFileSync(path.join(root, 'data/words.json'), 'utf8'));
const {stripTypeScriptTypes} = await import('node:module');
fs.mkdirSync(path.join(root, 'out'), {recursive: true});
const load = async (rel, name) => {
	const tmp = path.join(root, `out/.${name}.mjs`);
	let srcTxt = stripTypeScriptTypes(fs.readFileSync(path.join(root, rel), 'utf8'));
	srcTxt = srcTxt.replace("import {W} from '../lib/time';", `const __w = ${JSON.stringify(words)}; const W = (i) => __w[i].s;`);
	fs.writeFileSync(tmp, srcTxt);
	return import(tmp + '?' + Date.now());
};
const {EVENTS} = await load('src/data/events.ts', 'events');
const {S} = await load('src/data/shots.ts', 'shots');
const DURATION = 43.85, XF = 0.4;
let errors = 0;
const err = (m) => { errors++; console.log('✗', m); };
const ok = (m) => console.log('✓', m);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

for (const e of EVENTS) {
	const w = words[e.w];
	if (!w) { err(`${e.id}: word ${e.w} does not exist`); continue; }
	if (norm(w.w) !== norm(e.word)) err(`${e.id}: word ${e.w} is «${w.w}», expected «${e.word}»`);
	e.t = +(w.s + (e.dt ?? 0)).toFixed(3);
}
ok(`${EVENTS.length} events anchored to VO words`);

const ts = [...EVENTS.map((e) => e.t), DURATION].sort((a, b) => a - b);
let maxGap = 0, prev = 0;
for (const t of ts) {
	if (t - prev > 2.5) err(`gap ${(t - prev).toFixed(2)} s between ${prev.toFixed(2)} and ${t.toFixed(2)}`);
	maxGap = Math.max(maxGap, t - prev);
	prev = t;
}
ok(`max gap between visual events ${maxGap.toFixed(2)} s (limit 2.5)`);

const sfxNames = new Set(JSON.parse(fs.readFileSync(path.join(root, 'public/sfx/index.json'), 'utf8')).map((s) => s.name));
let nSfx = 0;
for (const e of EVENTS) for (const s of e.sfx ?? []) { nSfx++; if (!sfxNames.has(s.name)) err(`${e.id}: unknown SFX ${s.name}`); }
ok(`${nSfx} SFX cues, all in the library`);

const srcFiles = ['src', 'src/ui'].flatMap((d) => fs.readdirSync(path.join(root, d)).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(root, d, f)));
const code = Object.fromEntries(srcFiles.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const credits = fs.existsSync(path.join(root, 'CREDITS.md')) ? fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8') : '';
const refs = new Set();
for (const c of Object.values(code)) for (const m of c.matchAll(/['"`](photos\/[\w./-]+\.jpg)['"`]/g)) refs.add(m[1]);
for (const r of refs) {
	if (!fs.existsSync(path.join(root, 'public', r))) err(`missing asset public/${r}`);
	if (!credits.includes(path.basename(r))) err(`photo without CREDITS.md entry: ${r}`);
}
ok(`${refs.size} photos referenced`);
const shots = Object.fromEntries(Object.keys(S).map((k) => [k, k]));
for (const [k, dir] of Object.entries(shots)) {
	const d = path.join(root, 'public/blender', dir);
	const n = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /^f_\d{4}\.jpg$/.test(f)).length : 0;
	const need = Math.round((S[k][1] + (k === 'finale' ? 0 : XF) - S[k][0]) * 60);
	if (n < need) err(`blender/${dir}: ${n} frames < ${need} needed`);
}
ok('Blender shot folders checked');

const facts = fs.readFileSync(path.join(root, '../FACTS.md'), 'utf8');
const allowed = new Set([...facts.matchAll(/\d[\d,.]*/g)].flatMap((m) => { const v = m[0].replace(/[.,]$/, ''); return [v, v.replace(/,/g, '')]; }));
const shown = [];
for (const [f, c] of Object.entries(code)) for (const m of c.matchAll(/(?:text|accent|sub|value)=\{?['"`]([^'"`]*\d[^'"`]*)['"`]/g)) shown.push([path.basename(f), m[1]]);
for (const [f, s] of shown) for (const n of s.match(/\d[\d,.]*/g) ?? []) {
	const v = n.replace(/[.,]$/, '');
	if (!allowed.has(v) && !allowed.has(v.replace(/,/g, ''))) err(`${f}: «${s}» shows ${v}, not in FACTS.md`);
}
ok(`${shown.length} on-screen texts with numbers checked against FACTS.md`);

const atlasN = fs.readdirSync(path.join(root, 'public/atlas')).filter((f) => f.endsWith('.webp')).length;
if (atlasN < Math.round(DURATION * 30)) err(`atlas frames ${atlasN} < ${Math.round(DURATION * 30)}`);
ok(`${atlasN} Atlas frames (ending only since v7)`);

fs.writeFileSync(path.join(root, 'out/timeline.json'), JSON.stringify({duration: DURATION, events: EVENTS.map(({id, t, what, sfx}) => ({id, t, what, sfx: sfx ?? []}))}, null, 1));
console.log(errors ? `\n${errors} problem(s)` : '\nall checks passed');
process.exit(errors ? 1 : 0);
