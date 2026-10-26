// Render-free checks of the edit (run before every render):  node tools/check.mjs
// Template version (SHORTS_PRODUCTION/04_Templates/remotion_short). Settings come from project.json, words from data/words.json.
//  1. every event is anchored to an existing VO word and the word text matches
//  2. visual events: no gap above the level limit (L1 2.5 s / L2 2.0 s / L3 1.2 s, standard M5) from 0 to the end;
//     events per 10 s are reported against the level band (M6)
//  3. beats (src/data/beats.ts): start at 0, contiguous, end at DURATION, valid transition, scene exported by src/scenes.tsx;
//     subtitle centre subY outside 1180–1300 = error (R3, owner decision; at ≤ 1300 no pixel reaches y 1440); final beat only
//     'fade' (R1); whip / zoomthru / diag / punch / jagged at level L1 = warning (R1); > 2 jagged = warning (standard 4.3)
//  4. SFX names exist in public/sfx/index.json; every index entry has a licence; no FREE-key ElevenLabs, Mixkit, quarantined or
//     original meme audio (source «meme…», a YouTube / «green-screen copy» source, a cut of such a file, or a file under memes/)
//  5. every picture / clip / font path named in the code (comments ignored) exists under public/ and has a CREDITS.md line;
//     lottie/*.json (LottieSticker): file present + CREDITS line, Noto = «CC BY 4.0» on it + the description line in ../YOUTUBE.md
//     (warning when the file is missing or lacks the line; only for Lotties the Short uses — test compositions do not count)
//  5b. 3D inserts (tools/blender/check3d.mjs): frames complete, CREDITS `3d/<name>` + every source, no quarantine / Mixkit /
//     Atlas sources, spec unchanged since the render
//  6. every number shown on screen (text/accent/sub/value props, chart data / display / labels via tools/chart_facts.mjs) appears
//     in ../FACTS.md; chart counters (R6 / T10: count, LineDraw tag="follow"): the roll is clamped to 1.1 s in charts.tsx (a
//     longer request = warning) and every word spoken while it rolls has its subtitle hidden (project.hide_subs) — error
//     otherwise; a start time that is not W(i) / We(i) / numbers = warning (not checkable)
//  7. Atlas windows (project.atlas + the A/B hook of project.ab) via tools/atlas/atlas_check.py: words exist, corner tl/tr/bl
//     (br = error), custom "at" inside x 48–887 / y 288–1150, no overlaps, asset + CREDITS line per window, no card from
//     _quarantine, Atlas in 0–3 s only with "variant" (R2/H10), mid-video window > 4 s = warning (E5), Atlas Ape without a
//     finale window = warning unless the EDIT_PLAN deviation names F5/Atlas
//  8. licence gates: nothing from 03_Assets/_quarantine (known names + every file name found in <library_root>/03_Assets/_quarantine),
//     no FREE-key ElevenLabs SFX, no Mixkit file at all (*_mixkit.*: library Mixkit files are replaced and quarantined, owner
//     decision 24.10, standard L5) + sha256 of every public/ file and of a local project.music against _quarantine (cache
//     SHA256SUMS), the download-log «quarantined» hashes and the FREE-key ElevenLabs SFX (tools/quarantine_gate.mjs: renamed
//     or byte-identical copies; a re-encoded copy has other bytes and is NOT caught); German channel → no 1920s US silent-film
//     inserts (L6); duration ≤ 59 s (R10), longer only with project.allow_over_60 + an EDIT_PLAN line «Отступления от R1–R10:
//     R10 …» + YouTube Audio Library music (L4; other assets claim-safe = manual); 30–45 s target = warning; the demo voice
//     vo_demo.wav = error outside the template demo
//  9. memes (standard R7, QA L8): public/memes/<name> = one meme (clip, still or folder of frames). Each needs a line
//     «Мем: memes/<name> · источник: … · владелец: … · риск: … · длит.: 1.2 s» in ../EDIT_PLAN.md and a CREDITS.md line with
//     source / owner / risk (exact name match, no yt-dlp / youtube.com / youtu.be / «green-screen copy»); «длит.» ≤ 1.5 s; clip
//     file ≤ 1.5 s (÷ playbackRate, no loop); frame folder ≤ 1.5 s at the fps its ImgSeq uses; no audio (no audio files, no
//     audio stream — ffprobe, no audio credited on the meme's CREDITS line); ≤ 2 memes per Short; a Short with memes ≤ 59 s even
//     with allow_over_60; «Мем: нет» is not a meme; a «Мем:» line without memes/<name> = error. The on-screen window itself
//     (Sequence length; ImgSeq holds its last frame), title, cover and frame 0 stay a manual check (QA V4 / L8).
// 10. A/B test (standard R2, project.ab): when enabled — ≥ 2 variants with plain names, exactly the variants with atlas_hook show
//     Atlas in 0–1 s and at least one shows none (R2: Atlas at 0–1 s vs none); both versions share beats, events and the mix.
//     Render: VARIANT=A / VARIANT=B node tools/render.mjs → out/FINAL/<stem>_A.mp4 / _B.mp4. Hook placement over empty
//     space: tools/ab_corner.py on a still of version A (manual pick, QA)
// 11. feed variety (standard 4.1 H14, 9C) via tools/variety_check.py --plan-only: ../EDIT_PLAN.md has the lines «Визуальная идея: …»
//     and «Кадр 0: …» (missing / template placeholder = error, except the template demo) and they are not too close to the same
//     lines of the channel's last Shorts in SHORTS_PRODUCTION/06_Exports/_variety_registry (warning); prints the previous Short's
//     lines for the manual check (QA D2). Frames 0 / 1 / 2 s are compared after the render: tools/qa.sh → variety_check.py.
// 12. kinetic typography (src/ui/kinetic.tsx, tools/kinetic_check.mjs): every <Kinetic> word range is in project.hide_subs (T6,
//     error; fix: node tools/kinetic_check.mjs --fix), words / preset valid, numbers in FACTS.md, ≤ 1 gold key word (T5), one big
//     text at a time (T7), spacing by level (T11), safe box, no slam shake at L1
// 13. maps (src/ui/maps.tsx, tools/map_check.py): imported data/maps/*.json exist and come from make_map.py; MODERN borders in a
//     historical project (project.map_period, or a year before 1992 in FACTS / SCRIPT / voiceover, or a de-… channel) = warning;
//     period year vs map_period; source licences + CREDITS; R4: a map beat that starts before 3 s = error unless the beat has
//     `live: true` (live action on the map), frame 0 on a map = warning (H1)
// 14. tracked footage (tools/track.py → data/tracks/*.json, src/ui/Tracked.tsx): imported track files exist and are track.py
//     output; the clip of a track the Short uses is in public/ and has a CREDITS.md line; > 0.3 s of unsure tracking = warning
// Test compositions (file name ending in Gallery.tsx, Demo.tsx or _demo.tsx — Gallery, KineticGallery, ChartsGallery, MapsDemo,
// MotionDemo, ui/morph_demo) are never published: their assets are checked (5, 8), their texts / numbers / phrases are not.
// Writes out/timeline.json (duration, vo_end, loop_t, level, events with absolute times, beats) for mix.py / srt.py / QA tools.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {quarantineGate} from './quarantine_gate.mjs';
import {check3d} from './blender/check3d.mjs';
import {kineticCheck} from './kinetic_check.mjs';
import {chartCounters, chartShown} from './chart_facts.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const project = JSON.parse(fs.readFileSync(path.join(root, 'project.json'), 'utf8'));
const words = JSON.parse(fs.readFileSync(path.join(root, 'data/words.json'), 'utf8'));
const last = words[words.length - 1];
const r3 = (x) => Math.round(x * 1000) / 1000;
// same formulas as src/lib/time.ts
const VO_END = r3(project.vo_end ?? last.e + 0.15);
const DURATION = r3(project.duration ?? last.e + project.tail_s);
const LOOP_T = r3(DURATION - project.loop_s);

const {stripTypeScriptTypes} = await import('node:module');
fs.mkdirSync(path.join(root, 'out'), {recursive: true});
const shim = `const __w = ${JSON.stringify(words)}; const W = (i) => __w[i].s; const We = (i) => __w[i].e; const VO_END = ${VO_END}; const DURATION = ${DURATION}; const LOOP_T = ${LOOP_T};`;
const load = async (rel, name) => {
	const tmp = path.join(root, `out/.${name}.mjs`);
	let srcTxt = stripTypeScriptTypes(fs.readFileSync(path.join(root, rel), 'utf8'));
	srcTxt = srcTxt.replace(/import\s*\{[^}]*\}\s*from\s*'\.\.\/lib\/time';/, shim);
	fs.writeFileSync(tmp, srcTxt);
	return import(tmp + '?' + Date.now());
};
const {EVENTS} = await load('src/data/events.ts', 'events');
const {BEATS} = await load('src/data/beats.ts', 'beats');
let errors = 0, warns = 0;
const err = (m) => { errors++; console.log('✗', m); };
const warn = (m) => { warns++; console.log('!', m); };
const ok = (m) => console.log('✓', m);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// ../EDIT_PLAN.md and its deviation line «Отступления от R1–R10: R… — …, решение владельца <дата>» (standard 7)
const planPath = path.join(root, '../EDIT_PLAN.md');
const plan = fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf8') : '';
const devLine = plan.split('\n').find((l) => /^\s*[-*]?\s*(Отступления\s+от\s+R1|deviations?\b)/i.test(l)) ?? '';
const devText = devLine.replace(/^[^:]*:/, '');   // drop the label «Отступления от R1–R10 (…):», it names R10 itself
const deviates = (re) => !!devText.trim() && !/^\s*(<|нет(?![а-яё])|none\b|—\s*$|-\s*$)/i.test(devText) && re.test(devText);
const credits = fs.existsSync(path.join(root, 'CREDITS.md')) ? fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8') : '';
// downloads from YouTube (ToS) and «green-screen copies» (unlicensed re-uploads), standard 5 / 6 / R7
const YT = /youtube\.com|youtu\.be|yt-dlp|youtube-dl/i;
const GREEN_COPY = /green-?screen\s+cop(y|ies)|зел[её]н\S*\s+копи/i;

// ---- 1. anchors
for (const e of EVENTS) {
	const w = words[e.w];
	if (!w) { err(`${e.id}: word ${e.w} does not exist`); continue; }
	if (norm(w.w) !== norm(e.word)) err(`${e.id}: word ${e.w} is «${w.w}», expected «${e.word}»`);
	e.t = +(w.s + (e.dt ?? 0)).toFixed(3);
}
ok(`${EVENTS.length} events anchored to VO words`);

// ---- 2. density by level
const LEVEL = project.level ?? 'L2';
const GAP = {L1: 2.5, L2: 2.0, L3: 1.2}[LEVEL] ?? 2.0;
const BAND = {L1: [6, 9], L2: [10, 14], L3: [15, 99]}[LEVEL] ?? [10, 14];
const ts = [...EVENTS.map((e) => e.t), DURATION].sort((a, b) => a - b);
let maxGap = 0, prev = 0;
for (const t of ts) {
	if (t - prev > GAP) err(`gap ${(t - prev).toFixed(2)} s between ${prev.toFixed(2)} and ${t.toFixed(2)} (level ${LEVEL} limit ${GAP})`);
	maxGap = Math.max(maxGap, t - prev);
	prev = t;
}
ok(`max gap between visual events ${maxGap.toFixed(2)} s (level ${LEVEL} limit ${GAP})`);
const per10 = (EVENTS.length / DURATION) * 10;
(per10 < BAND[0] || per10 > BAND[1] ? warn : ok)(`${per10.toFixed(1)} events / 10 s (level ${LEVEL} band ${BAND[0]}–${BAND[1] === 99 ? '…' : BAND[1]})`);

// ---- 3. beats
const TR = new Set(['none', 'zoomthru', 'whipL', 'whipR', 'up', 'circle', 'diag', 'punch', 'fade', 'jagged']);
const scenesSrc = fs.readFileSync(path.join(root, 'src/scenes.tsx'), 'utf8');
const exported = new Set([...scenesSrc.matchAll(/export const (\w+)/g)].map((m) => m[1]));
if (Math.abs(BEATS[0].t0) > 1e-6) err(`first beat starts at ${BEATS[0].t0}, not 0`);
BEATS.forEach((b, i) => {
	if (!TR.has(b.tr)) err(`beat ${b.k}: unknown transition ${b.tr}`);
	if (!exported.has(b.scene)) err(`beat ${b.k}: scene ${b.scene} is not exported by src/scenes.tsx`);
	if (b.t1 <= b.t0) err(`beat ${b.k}: t1 ${b.t1} ≤ t0 ${b.t0}`);
	if (i && Math.abs(BEATS[i - 1].t1 - b.t0) > 1e-6) err(`beat ${b.k}: starts at ${b.t0}, previous ends at ${BEATS[i - 1].t1}`);
	// subY = subtitle line centre (R3: 1180–1300). The 54 px line: solid pixels (stroke + 0 4px 0 shadow) end ~29 px below the
	// centre, the soft 0 0 34px glow ~60 px → at a centre ≤ 1300 nothing reaches y 1440
	if (typeof b.subY !== 'number' || b.subY < 1180 || b.subY > 1300) err(`beat ${b.k}: subY ${b.subY} outside the 1180–1300 centre band (R3, owner decision 24.10; text never below y 1440)`);
});
const fin = BEATS[BEATS.length - 1];
if (Math.abs(fin.t1 - DURATION) > 1e-6) err(`last beat ends at ${fin.t1}, DURATION is ${DURATION}`);
if (BEATS.length > 1 && fin.tr !== 'fade') err(`final beat ${fin.k}: transition «${fin.tr}» — finale and loop use only 'fade' (R1)`);
if (LEVEL === 'L1') {
	const hot = BEATS.filter((b) => ['whipL', 'whipR', 'zoomthru', 'diag', 'punch', 'jagged'].includes(b.tr));
	if (hot.length) warn(`level L1 with ${hot.map((b) => `${b.k}:${b.tr}`).join(', ')} — L1 uses fade / up / circle / hard cut (R1); OK only inside an L3 segment ≤ 3 s`);
}
const nJag = BEATS.filter((b) => b.tr === 'jagged').length;
if (nJag > 2) warn(`${nJag} 'jagged' transitions — a signature reveal: at most 2 per Short (standard 4.3)`);
if (!/SCENES/.test(scenesSrc) || !exported.has('FirstFrame')) err('src/scenes.tsx must export SCENES and FirstFrame');
ok(`${BEATS.length} beats contiguous 0 → ${DURATION} s, scenes exported`);

// ---- 4. SFX
// FREE-key ElevenLabs SFX (non-commercial) + known files that sit in 03_Assets/_quarantine (README there)
const FORBIDDEN = /(_el\.wav$|crowd_cheer_short|_quarantine|rolling_eyes|baker_1946|safety_last)/i;
// every file name in <library_root>/03_Assets/_quarantine (catches quarantined files copied into public/ under their own name)
const quarantined = new Set();
const qDir = project.library_root ? path.join(project.library_root, '03_Assets/_quarantine') : '';
if (qDir && fs.existsSync(qDir)) {
	const walkQ = (d) => { for (const f of fs.readdirSync(d, {withFileTypes: true})) { if (f.name.startsWith('.')) continue; const p = path.join(d, f.name); if (f.isDirectory()) walkQ(p); else if (!/^README/i.test(f.name)) quarantined.add(f.name.toLowerCase()); } };
	walkQ(qDir);
} else warn(`library quarantine not found (${qDir || 'project.library_root unset'}) — only the known quarantine names are checked`);
const isQuarantined = (p) => !!p && (FORBIDDEN.test(p) || quarantined.has(path.basename(p).toLowerCase()));
// Mixkit: the library's script-downloaded Mixkit files are replaced and moved to _quarantine (owner decision 24.10, standard 5 / L5)
const MIXKIT = /mixkit/i;
const sfxIndex = JSON.parse(fs.readFileSync(path.join(root, 'public/sfx/index.json'), 'utf8'));
const sfxNames = new Set(sfxIndex.map((s) => s.name));
// original meme audio (memes run silent, R7 п. 2): source «meme…», a YouTube / «green-screen copy» source (a YouTube Audio
// Library source is fine), a file under memes/, a file credited on a CREDITS.md line together with memes/<name>, or a cut /
// edit whose source names such a file (e.g. «x_cut» with source «x.wav: 0.15–1.0 s»)
const memeCredited = new Set(credits.split('\n').filter((l) => /(^|[^\w.-])memes\/[\w-]/i.test(l))
	.flatMap((l) => l.match(/[\w./-]+\.(?:wav|mp3|ogg|oga|m4a|aac|flac|opus|aiff?)(?![\w])/gi) ?? []).map((a) => path.basename(a).toLowerCase()));
const memeAudioNames = new Set(sfxIndex.filter((s) => {
	const src = s.source ?? '';
	return /^\s*(meme|мем)/i.test(src) || GREEN_COPY.test(src) || (YT.test(src) && !/audio\s*library|audiolibrary/i.test(src))
		|| /(^|\/)memes\//i.test(s.file ?? '') || memeCredited.has(path.basename(s.file ?? `${s.name}.wav`).toLowerCase());
}).map((s) => s.name));
for (let grew = true; grew;) {
	grew = false;
	for (const s of sfxIndex) {
		if (memeAudioNames.has(s.name)) continue;
		if ([...memeAudioNames].some((n) => new RegExp(`(^|[^\\w-])${esc(n)}(\\.\\w+)?(?![\\w-])`, 'i').test(s.source ?? ''))) { memeAudioNames.add(s.name); grew = true; }
	}
}
for (const s of sfxIndex) {
	if (!s.license) err(`public/sfx/index.json: ${s.name} has no licence`);
	if (/^CC[ -]?BY(?![ -]?(NC|ND))/i.test(s.license ?? '') && !s.attribution) err(`public/sfx/index.json: ${s.name} is ${s.license} but has no attribution text (description line, ASSET_LIBRARY 14)`);
	const ids = [s.file ?? '', s.name + '.wav', s.library_file ?? ''];
	if (ids.some((x) => isQuarantined(x))) err(`forbidden SFX in index (FREE-key ElevenLabs / quarantine): ${s.name}`);
	if (ids.some((x) => MIXKIT.test(x)) || MIXKIT.test(s.source ?? '')) err(`Mixkit SFX in index: ${s.name} — Mixkit files are replaced and quarantined (standard L5)`);
	if (memeAudioNames.has(s.name)) err(`original meme audio in index: ${s.name} («${(s.source ?? s.file ?? '').slice(0, 60)}») — memes run without their own sound, put our SFX on top (R7 п. 2)`);
	if (!fs.existsSync(path.join(root, 'public', s.file ?? `sfx/${s.name}.wav`))) err(`SFX file missing: ${s.file ?? s.name}`);
}
let nSfx = 0;
for (const e of EVENTS) for (const s of e.sfx ?? []) { nSfx++; if (!sfxNames.has(s.name)) err(`${e.id}: unknown SFX ${s.name}`); }
ok(`${nSfx} SFX cues, all in the library (${sfxIndex.length} entries with licence)`);

// ---- 5. pictures / clips named in the code
const srcFiles = [];
const walk = (d) => { for (const f of fs.readdirSync(d, {withFileTypes: true})) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.tsx?$/.test(f.name)) srcFiles.push(p); } };
walk(path.join(root, 'src'));
const code = Object.fromEntries(srcFiles.map((f) => [f, fs.readFileSync(f, 'utf8')]));
// usage examples in comments are not references (block comments, JSX {/* … */}, whole-line // comments)
const stripComments = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const codeNC = Object.fromEntries(Object.entries(code).map(([f, c]) => [f, stripComments(c)]));
// test compositions (Gallery.tsx, *Gallery.tsx, *Demo.tsx, *_demo.tsx — never published): their assets are checked, their texts /
// Lotties / numbers are not the Short's (same rule in kinetic_check.mjs, chart_facts.mjs and map_check.py)
const isTest = (f) => /(Gallery|Demo|_demo)\.tsx$/.test(path.basename(f));
const refs = new Set();
for (const c of Object.values(codeNC)) for (const m of c.matchAll(/['"`]([\w-]+\/[\w./-]+\.(?:jpg|jpeg|png|webp|gif|svg|mp4|webm|mov|ttf|otf))['"`](?!\s*:)/g)) refs.add(m[1]);
const errorsBeforePics = errors;
for (const r of refs) {
	if (!fs.existsSync(path.join(root, 'public', r))) err(`missing asset public/${r}`);
	if (!credits.includes(path.basename(r))) err(`asset without CREDITS.md entry: ${r}`);
}
if (errors === errorsBeforePics) ok(`${refs.size} pictures / clips / fonts referenced in the code, all present and credited`);
// Lottie stickers (src/ui/LottieSticker.tsx): every public/lottie/*.json and every lottie/<file>.json named in the code exists
// and has a CREDITS.md line; Noto animated emoji are CC BY 4.0 → «CC BY 4.0» on that line + the one description line (14.3)
const lottieDir = path.join(root, 'public/lottie');
const lottieFiles = new Set(fs.existsSync(lottieDir) ? fs.readdirSync(lottieDir).filter((f) => f.endsWith('.json')).map((f) => `lottie/${f}`) : []);
const lottieRe = /['"`](lottie\/[\w.-]+\.json)['"`]/g;
const lottieRefs = new Set(Object.values(codeNC).flatMap((c) => [...c.matchAll(lottieRe)].map((m) => m[1])));
const lottieUsed = new Set(Object.entries(codeNC).filter(([f]) => !isTest(f)).flatMap(([, c]) => [...c.matchAll(lottieRe)].map((m) => m[1])));
const errorsBeforeLottie = errors;
for (const r of lottieRefs) {
	if (!fs.existsSync(path.join(root, 'public', r))) err(`missing Lottie public/${r} (copy it from 03_Assets/Animations/lottie: tools/fetch_asset.py lib …)`);
	lottieFiles.add(r);
}
for (const r of lottieFiles) {
	const line = credits.split('\n').find((l) => l.includes(path.basename(r)));
	if (!line) err(`Lottie without CREDITS.md entry: ${r}`);
	else if (/noto/i.test(r) && !/CC[\s-]*BY[\s-]*4\.0/i.test(line)) err(`${r}: Noto Emoji Animation is CC BY 4.0 — its CREDITS.md line needs «CC BY 4.0» and the description line (ASSET_LIBRARY 14.3)`);
}
// the description line is due as soon as the Short uses a Noto sticker: a missing ../YOUTUBE.md warns as well (new_project.sh
// does not create one, the description is written at upload time)
const ytPath = path.join(root, '../YOUTUBE.md');
const NOTO_LINE = '«Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)»';
const notoUsed = [...lottieUsed].filter((r) => /noto/i.test(r));
if (notoUsed.length) {
	if (!fs.existsSync(ytPath)) warn(`the Short uses the Noto Lottie ${notoUsed.join(', ')}, but ../YOUTUBE.md does not exist — create it with the description line ${NOTO_LINE} (CC BY 4.0, ASSET_LIBRARY 14.3)`);
	else if (!/Noto Emoji Animation/i.test(fs.readFileSync(ytPath, 'utf8'))) warn(`../YOUTUBE.md has no description line ${NOTO_LINE} — the Short uses ${notoUsed.join(', ')} (CC BY 4.0, ASSET_LIBRARY 14.3)`);
}
if (errors === errorsBeforeLottie) ok(`${lottieFiles.size} Lottie file(s), all present and credited (${lottieUsed.size} used by the Short)`);

// ---- 5b. 3D inserts (tools/blender/shot.py → public/3d/<name>/): frames complete, credited, no quarantine / Atlas sources
check3d({root, code, credits, err, warn, ok, isQuarantined});

// ---- 6. numbers on screen vs FACTS.md
const factsPath = path.join(root, '../FACTS.md');
const facts = fs.existsSync(factsPath) ? fs.readFileSync(factsPath, 'utf8') : '';
if (!facts) err('../FACTS.md missing');
const allowed = new Set([...facts.matchAll(/\d[\d,.]*/g)].flatMap((m) => { const v = m[0].replace(/[.,]$/, ''); return [v, v.replace(/,/g, '')]; }));
const shown = [];
for (const [f, c] of Object.entries(codeNC)) if (!isTest(f)) for (const m of c.matchAll(/(?:text|accent|sub|value|unit)=\{?['"`]([^'"`]*\d[^'"`]*)['"`]/g)) shown.push([path.basename(f), m[1]]);
// chart elements of src/ui/charts.tsx: numeric data, display strings, year labels, delta, n / k (tools/chart_facts.mjs); data that
// is not inline (data={DATA}, `${x}`) cannot be compared → warning
let nChart = 0;
for (const [f, c] of Object.entries(codeNC)) if (!isTest(f)) {
	const r = chartShown(c);
	for (const x of r.shown) { shown.push([path.basename(f), x]); nChart++; }
	for (const o of r.opaque) warn(`${path.basename(f)}: ${o} — chart numbers not inline, FACTS.md check impossible (write them in the JSX)`);
}
for (const [f, s] of shown) for (const n of s.match(/\d[\d,.]*/g) ?? []) {
	const v = n.replace(/[.,]$/, '');
	if (!allowed.has(v) && !allowed.has(v.replace(/,/g, ''))) err(`${f}: «${s}» shows ${v}, not in FACTS.md`);
}
ok(`${shown.length} on-screen texts with numbers checked against FACTS.md (${nChart} from charts)`);
// R6 / T10 chart counters: the words spoken while a number rolls keep no subtitle (the number is the text on screen, T6 / T7)
const evalT = (expr) => {
	if (expr == null) return null;
	const e = expr.replace(/\bWe\((\d+)\)/g, (_, i) => String(words[+i]?.e ?? NaN)).replace(/\bW\((\d+)\)/g, (_, i) => String(words[+i]?.s ?? NaN))
		.replace(/\bVO_END\b/g, String(VO_END)).replace(/\bDURATION\b/g, String(DURATION)).replace(/\bLOOP_T\b/g, String(LOOP_T));
	if (!/^[\d.\s+\-*/()e]+$/.test(e)) return null;
	try { const v = Function(`return (${e});`)(); return Number.isFinite(v) ? v : null; } catch { return null; }
};
const hideRanges = project.hide_subs ?? [];
const subHidden = (i) => hideRanges.some(([a, b]) => i >= a && i <= b);
let nCounters = 0;
const errorsBeforeR6 = errors;
for (const [f, c] of Object.entries(code)) if (!isTest(f)) for (const k of chartCounters(c)) {
	nCounters++;
	const where = `${path.relative(root, f)}:${k.line}`;
	if (k.asked > 1.1 + 1e-9) warn(`${where}: <${k.tag}> counter asks for ${k.asked} s — charts.tsx clamps every roll to 1.1 s (R6)`);
	const s0 = evalT(k.start);
	if (s0 === null) { warn(`${where}: <${k.tag}> counter starts at «${k.start}» — not W(i) / We(i) / numbers, so R6 «subtitle hidden while it rolls» is not checked`); continue; }
	const s1 = s0 + k.dur;
	const said = words.map((w, i) => ({w, i})).filter(({w}) => w.s < s1 - 0.05 && w.e > s0 + 0.05).map(({i}) => i);
	const open = said.filter((i) => !subHidden(i));
	if (open.length) err(`${where}: <${k.tag}> counter rolls ${s0.toFixed(2)}–${s1.toFixed(2)} s over words ${open[0]}–${open[open.length - 1]} «${open.map((i) => words[i].w).join(' ')}» whose subtitle is shown — R6 / T10: add [${open[0]}, ${open[open.length - 1]}] (or the whole phrase) to project.json hide_subs`);
}
if (nCounters && errors === errorsBeforeR6) ok(`${nCounters} chart counter(s): roll ≤ 1.1 s (charts.tsx), subtitles hidden while rolling (R6)`);

// ---- 7. Atlas: tools/atlas/atlas_check.py (windows, corners, R2/H10, E5, F5, assets, CREDITS, quarantine; A/B hook windows)
let atlasRes = null;
{
	const r = spawnSync('/usr/bin/python3', [path.join(root, 'tools/atlas/atlas_check.py'), '--json'], {encoding: 'utf8'});
	try { atlasRes = JSON.parse(r.stdout); } catch { err(`tools/atlas/atlas_check.py failed: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`); }
	if (atlasRes) { for (const m of atlasRes.errors) err(m); for (const m of atlasRes.warnings) warn(m); for (const m of atlasRes.ok) ok(m); }
}

// ---- 8. licence gates on everything in public/
const pub = [];
const walkP = (d) => { for (const f of fs.readdirSync(d, {withFileTypes: true})) { const p = path.join(d, f.name); if (f.isDirectory()) walkP(p); else pub.push(path.relative(path.join(root, 'public'), p)); } };
walkP(path.join(root, 'public'));
const forbidden = pub.filter((p) => isQuarantined(p));
for (const p of forbidden) err(`forbidden file in public/ (FREE-key ElevenLabs / 03_Assets/_quarantine, see _quarantine/README.md): ${p}`);
const mixkit = pub.filter((p) => MIXKIT.test(p));
for (const p of mixkit) err(`Mixkit file in public/: ${p} — library Mixkit files are replaced and moved to _quarantine (owner decision 24.10, L5); use the replacement`);
if (project.music && MIXKIT.test(project.music)) err(`music is a Mixkit file: ${project.music} (L5)`);
if (!forbidden.length && !mixkit.length) ok(`${pub.length} files in public/: no quarantine / FREE-key ElevenLabs / Mixkit files`);
// content gate: renamed / byte-identical copies of quarantined, log-quarantined or FREE-key ElevenLabs files (sha256; a re-encoded
// copy — same sound or picture, other bytes — passes: that would need an audio / video fingerprint)
const qg = quarantineGate({root});
for (const m of qg.warnings) warn(m);
for (const m of qg.problems) err(m);
if (!qg.problems.length) ok(`${qg.nFiles} files hashed: no copy of a quarantined / FREE-key ElevenLabs file (${qg.nForbidden} sha256)${qg.info.length ? ' — ' + qg.info.join('; ') : ''}`);
if (/^de/i.test(project.channel ?? '')) {
	const us20s = pub.filter((p) => /pdfilm_(lloyd|crowd_gasps|keaton|train_bridge)/.test(p));
	if (us20s.length) err(`German channel: 1920s US silent-film inserts need a separate owner decision (L6): ${us20s.join(', ')}`);
}
if (DURATION > 59) {
	if (!project.allow_over_60) err(`duration ${DURATION} s > 59 s without project.allow_over_60 (R10: hard cap 59 s, longer only by the owner's decision for this Short)`);
	else {
		if (!deviates(/\bR10\b/)) err(`duration ${DURATION} s > 59 s: allow_over_60 is set, but ../EDIT_PLAN.md has no line «Отступления от R1–R10: R10 — …, решение владельца <дата>» (R10, standard 7)`);
		if (project.music && !/youtube audio library/i.test(project.music_license ?? '')) err(`> 59 s: music must be YouTube Audio Library (L4), is «${project.music_license}»`);
		warn(`> 59 s: every other asset must be claim-safe (any claim blocks a Short > 60 s worldwide) — manual check, QA L4`);
	}
}
if (DURATION < 30 || DURATION > 45) warn(`duration ${DURATION} s is outside the 30–45 s target (R10)`);
ok(`duration ${DURATION} s (VO end ${VO_END} s, loop from ${LOOP_T} s)`);
if (/vo_demo\.wav$/.test(project.vo ?? '')) {
	if (process.env.DEMO_OK === '1' || project.slug === 'template-demo') warn('VO is the DEMO voice (macOS say, personal non-commercial use only) — never publish it');
	else err('VO is still vo_demo.wav (macOS say demo) — record the real VO with ElevenLabs PAID and set project.vo');
}
if (project.music && /^03_Assets\//.test(project.music) && !fs.existsSync(path.join(project.library_root ?? '', project.music))) err(`music not found: ${project.library_root}/${project.music}`);
if (project.music && isQuarantined(project.music)) err('music comes from 03_Assets/_quarantine');

// ---- 9. memes (standard R7, QA L8)
const MAX_MEME_S = 1.5;
const errorsBeforeMemes = errors;
const memeDir = path.join(root, 'public/memes');
const memes = fs.existsSync(memeDir) ? fs.readdirSync(memeDir, {withFileTypes: true}).filter((d) => !d.name.startsWith('.')) : [];
// exact meme name: «memes/cj» must not match «memes/cj_alt.png»
const memeTok = (rel) => new RegExp(`(^|[^\\w.-])${esc(rel)}(?![\\w.-])`, 'i');
// one line per meme: «Мем: memes/<name> · источник: … · владелец: … · риск: … · длит.: 1.2 s · слово: <w>» (format line with <имя> ignored)
const memeLinesAll = plan.split('\n').filter((l) => /^\s*[-*]?\s*(мем|meme)\s*:/i.test(l) && !/<имя>|<name>/i.test(l));
// «Мем: нет» / «Meme: none» is not a meme
const memeLines = memeLinesAll.filter((l) => !/^\s*[-*]?\s*(мем|meme)\s*:\s*(нет(?![а-яё])|none\b|no\b|—|-)?\s*\.?\s*$/i.test(l));
for (const l of memeLines) if (!/memes\//i.test(l)) err(`EDIT_PLAN «Мем:» line without a memes/<name> path — meme files sit in public/memes/ so R7 can be checked: «${l.trim().slice(0, 90)}»`);
const KEYS = [['источник|source', 'source'], ['владелец|owner', 'owner'], ['риск|risk', 'risk']];
const filled = (line, re) => new RegExp(`(?:${re})\\s*:\\s*[^\\s·|<]`, 'i').test(line);
const lineDur = (line) => { const m = line.match(/(?:длит(?:ельность)?\.?|dur(?:ation)?)\s*:\s*≤?\s*(\d+(?:[.,]\d+)?)/i); return m ? Number(m[1].replace(',', '.')) : null; };
const AUDIO = /\.(wav|mp3|ogg|oga|m4a|aac|flac|opus|aiff?)$/i;
const AUDIO_REF = /[\w./-]+\.(?:wav|mp3|ogg|oga|m4a|aac|flac|opus|aiff?)(?![\w])/gi;
const VIDEO = /\.(mp4|m4v|mov|webm|mkv|gif)$/i;
const IMG = /\.(png|jpe?g|webp)$/i;
let ffprobeMissing = false;
const probe = (f) => {
	const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', f], {encoding: 'utf8'});
	if (r.error) { ffprobeMissing = true; return null; }
	try {
		const j = JSON.parse(r.stdout);
		return {dur: Number(j.format?.duration) || 0, audio: (j.streams ?? []).some((s) => s.codec_type === 'audio')};
	} catch { err(`ffprobe could not read ${path.relative(root, f)}`); return null; }
};
// JSX elements in src/ that name the meme (best effort: a path held in a variable is not seen)
const memeUses = (tok) => {
	const out = [];
	for (const c of Object.values(code)) for (const m of c.matchAll(new RegExp(tok.source, 'gi'))) {
		const a = c.lastIndexOf('<', m.index), b = c.indexOf('/>', m.index);
		out.push(c.slice(a < 0 ? m.index : a, b < 0 ? m.index + 300 : b + 2));
	}
	return out;
};
const num = (s, re) => { const m = s.match(re); return m ? Number(m[1]) : null; };
for (const d of memes) {
	const rel = `memes/${d.name}`;
	const abs = path.join(memeDir, d.name);
	const tok = memeTok(rel);
	const pl = memeLines.find((l) => tok.test(l));
	if (!pl) err(`${rel}: no line «Мем: ${rel} · источник: … · владелец: … · риск: … · длит.: … s» in ../EDIT_PLAN.md (R7 п. 5)`);
	else {
		for (const [re, name] of KEYS) if (!filled(pl, re)) err(`${rel}: EDIT_PLAN line has no ${name} (R7 п. 5)`);
		if (lineDur(pl) === null) err(`${rel}: EDIT_PLAN line has no on-screen duration («длит.: 1.2 s»)`);
	}
	const cl = credits.split('\n').find((l) => tok.test(l));
	if (!cl) err(`${rel}: no CREDITS.md line naming ${rel} with source / owner / risk (R7 п. 5)`);
	else {
		for (const [re, name] of KEYS) if (!filled(cl, re)) err(`${rel}: CREDITS.md line has no «${name}:» (R7 п. 5)`);
		for (const a of cl.match(AUDIO_REF) ?? []) err(`${rel}: CREDITS.md credits the audio ${a} with the meme — memes run without their original sound (R7 п. 2)`);
	}
	if ([pl, cl].some((l) => l && (YT.test(l) || GREEN_COPY.test(l)))) err(`${rel}: downloaded from YouTube / a «green-screen copy» (yt-dlp, youtube.com, youtu.be) — not allowed (R7, standard 5–6, YouTube Terms of Service)`);
	if ([pl, cl].some((l) => l && /giphy/i.test(l))) warn(`${rel}: source mentions GIPHY — GIPHY is search only, the file must not come from the GIPHY API (R7)`);
	const uses = memeUses(tok);
	if (!uses.length) warn(`${rel}: not named in src/ — on-screen length not checked in code`);
	if (uses.some((u) => /\bloop\b/.test(u))) err(`${rel}: played with loop — a meme is one pass ≤ ${MAX_MEME_S} s (R7 п. 1)`);
	const rates = uses.map((u) => num(u, /playbackRate\s*[=:]\s*\{?\s*(\d*\.?\d+)/)).filter((x) => x !== null);
	const rate = rates.length ? Math.min(...rates) : 1;
	const fpsList = uses.map((u) => num(u, /\bfps\s*[=:]\s*\{?\s*(\d+(?:\.\d+)?)/)).filter((x) => x !== null);
	const seqFps = fpsList.length ? Math.min(...fpsList) : 60;   // ImgSeq default fps = 60
	const files = d.isDirectory() ? fs.readdirSync(abs).filter((f) => !f.startsWith('.')).map((f) => path.join(abs, f)) : [abs];
	for (const f of files) {
		const fr = path.relative(path.join(root, 'public'), f);
		if (AUDIO.test(f)) { err(`${fr}: audio file — memes run without their original sound (R7 п. 2)`); continue; }
		if (!VIDEO.test(f)) continue;
		const p = probe(f);
		if (p?.audio) err(`${fr}: has an audio stream — strip it (ffmpeg -an), memes run silent (R7 п. 2)`);
		if (p && p.dur / rate > MAX_MEME_S + 0.02) err(`${fr}: plays ${(p.dur / rate).toFixed(2)} s (file ${p.dur.toFixed(2)} s, playbackRate ${rate}) — trim to ≤ ${MAX_MEME_S} s (R7 п. 1)`);
	}
	if (d.isDirectory()) {
		const frames = files.filter((f) => IMG.test(f)).length;
		if (frames / seqFps > MAX_MEME_S + 1e-6) err(`${rel}: ${frames} frames at ${seqFps} fps = ${(frames / seqFps).toFixed(2)} s > ${MAX_MEME_S} s (R7 п. 1)`);
	}
}
if (ffprobeMissing) warn('ffprobe not found — meme clips not checked for an audio stream / length');
for (const l of memeLines.filter((x) => /memes\//i.test(x))) {
	const hit = memes.find((d) => memeTok(`memes/${d.name}`).test(l));
	if (!hit) warn(`EDIT_PLAN meme line without a file in public/memes/: «${l.trim().slice(0, 90)}»`);
	const dur = lineDur(l);
	if (dur !== null && dur > MAX_MEME_S) err(`${hit ? `memes/${hit.name}` : 'EDIT_PLAN meme line'}: on screen ${dur} s > ${MAX_MEME_S} s (R7 п. 1)`);
}
// a meme picture kept outside public/memes/ bypasses these checks: flag CREDITS lines that call a visual file elsewhere a meme
for (const l of credits.split('\n')) {
	if (!/(^|[^a-zа-яё])(meme|мем)/i.test(l)) continue;
	const outside = (l.match(/[\w./-]+\.(?:png|jpe?g|webp|gif|mp4|m4v|webm|mov)(?![\w])/gi) ?? []).filter((p) => !/(^|\/)memes\//i.test(p));
	if (outside.length) warn(`CREDITS.md calls ${outside.join(', ')} a meme outside public/memes/ — memes go to public/memes/ so R7 is checked (QA L8): «${l.trim().slice(0, 80)}»`);
}
const nMemes = Math.max(memes.length, memeLines.length);
if (nMemes > 2) err(`${nMemes} memes (public/memes: ${memes.length}, EDIT_PLAN lines: ${memeLines.length}) — at most 2 per Short (R7 п. 1)`);
if (nMemes && DURATION > 59) err(`Short with memes is ${DURATION} s — memes only in Shorts ≤ 59 s, allow_over_60 does not lift this (R7 п. 3)`);
if (!nMemes) ok('no memes (public/memes empty or absent, no «Мем:» lines)');
else if (errors === errorsBeforeMemes) ok(`${nMemes} meme(s) pass R7 (logged, ≤ ${MAX_MEME_S} s by file / frames / «длит.», silent, ≤ 2, Short ≤ 59 s); on-screen window, title / cover / frame 0 — manual check`);

// ---- 10. A/B test (standard R2): project.ab → compositions Short-<v> (Root.tsx), VARIANT=<v> node tools/render.mjs → <stem>_<v>.mp4
const AB = project.ab ?? null;
const abNames = AB?.enabled ? Object.keys(AB.variants ?? {}) : [];
if (AB !== null && (typeof AB !== 'object' || Array.isArray(AB))) err('project.ab must be {"enabled": true | false, "variants": {"A": {…}, "B": {…}}}');
else if (AB?.enabled) {
	const KNOWN = new Set(['atlas_hook', 'atlas_hook_pose', 'atlas_hook_corner', 'atlas_hook_h', 'atlas_hook_until']);
	if (abNames.length < 2) err(`project.ab.enabled with ${abNames.length} variant(s) — an A/B test needs two (R2: "A" without Atlas, "B" with the Atlas hook)`);
	else if (abNames.length > 2) warn(`project.ab: ${abNames.length} variants — R2 is a two-way test (A without Atlas, B with it)`);
	for (const v of abNames) {
		if (!/^[A-Za-z0-9]{1,8}$/.test(v)) err(`project.ab.variants: name «${v}» — 1–8 letters / digits (composition Short-${v}, file <stem>_${v}.mp4)`);
		for (const k of Object.keys(AB.variants[v] ?? {})) if (!KNOWN.has(k)) warn(`project.ab.variants.${v}.${k}: unknown key (known: ${[...KNOWN].join(', ')})`);
	}
	const per = atlasRes?.ab ?? null;
	if (!per) err('A/B (R2): Atlas windows of the variants unknown (tools/atlas/atlas_check.py did not run)');
	else {
		const desc = (v) => (per[v] ?? []).map((w) => `«${w.pose}» ${w.corner} ${w.t0.toFixed(2)}–${w.t1.toFixed(2)} s h ${w.h}`).join(', ') || 'no Atlas in 0–1 s';
		const withA = abNames.filter((v) => (per[v] ?? []).length), without = abNames.filter((v) => !(per[v] ?? []).length);
		if (!withA.length || !without.length)
			err(`A/B (R2) compares Atlas in 0–1 s with none — ${abNames.map((v) => `Short-${v}: ${desc(v)}`).join(' · ')}; set "atlas_hook": true on one variant (B) and false on the other (A)`);
		else {
			const stem = (project.out_name ?? `${project.slug}.mp4`).replace(/\.mp4$/, '');
			ok(`A/B (R2): ${abNames.map((v) => `Short-${v} — ${desc(v)}`).join(' · ')}; same beats, events and mix → VARIANT=${abNames.join(' / VARIANT=')} node tools/render.mjs → ${abNames.map((v) => `${stem}_${v}.mp4`).join(' / ')}`);
			ok(`A/B hook over empty space, not over the subject of frame 0 = manual check: python3 tools/ab_corner.py <still of Short-${without[0]} at 0.5 s> ranks tl / tr / bl, then stills of Short-${withA[0]} at 0 and 0.5 s`);
		}
	}
} else if (AB) ok('A/B test off (project.ab.enabled = false): one version, composition Short');

// ---- 11. feed variety (standard 4.1 H14, 9C): tools/variety_check.py --plan-only (registry 06_Exports/_variety_registry)
{
	const r = spawnSync('/usr/bin/python3', [path.join(root, 'tools/variety_check.py'), '--plan-only', '--json'], {encoding: 'utf8'});
	let vr = null;
	try { vr = JSON.parse(r.stdout); } catch { warn(`tools/variety_check.py --plan-only failed: ${(r.stderr || r.stdout || '').trim().split('\n').pop()} (the frames are still checked by qa.sh)`); }
	if (vr) {
		for (const m of vr.errors) err(m);
		for (const m of vr.warnings) warn(m);
		for (const m of vr.ok) ok(m);
		for (const m of vr.info) console.log(' ', m);
	}
}

// ---- 12. kinetic typography: <Kinetic> ranges in hide_subs (T6), words / preset, FACTS numbers, T5 / T7 / T11 (tools/kinetic_check.mjs;
// fix the subtitles with node tools/kinetic_check.mjs --fix)
kineticCheck({root, project, words, code, facts, err, warn, ok});

// ---- 13. maps: tools/map_check.py (files, period borders vs project period, licences, R4 maps in 0–3 s / live flag)
{
	const r = spawnSync('/usr/bin/python3', [path.join(root, 'tools/map_check.py'), '--json'], {encoding: 'utf8'});
	let mr = null;
	try { mr = JSON.parse(r.stdout); } catch { err(`tools/map_check.py failed: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`); }
	if (mr) {
		for (const m of mr.errors) err(m);
		for (const m of mr.warnings) warn(m);
		for (const m of mr.ok) ok(m);
		for (const m of mr.info) console.log(' ', m);
	}
}

// ---- 14. tracked footage: data/tracks/*.json imported in src/ exist (a missing one breaks every render: Root.tsx bundles all
// compositions) and are tools/track.py output; a track the Short uses needs its clip in public/ with a CREDITS.md line
{
	const TRACK_IMPORT = /from\s+['"]([^'"]*data\/tracks\/[\w.-]+\.json)['"]/g;
	const tracks = new Map();
	for (const [f, c] of Object.entries(codeNC)) for (const m of c.matchAll(TRACK_IMPORT)) {
		const p = path.resolve(path.dirname(f), m[1]);
		if (!tracks.has(p)) tracks.set(p, []);
		tracks.get(p).push(f);
	}
	const pubByName = new Map(pub.map((p) => [path.basename(p).toLowerCase(), p]));
	const errorsBeforeTracks = errors;
	let nShort = 0;
	for (const [p, users] of tracks) {
		const rel = path.relative(root, p);
		const who = [...new Set(users.map((f) => path.basename(f)))].join(', ');
		if (!fs.existsSync(p)) { err(`${rel}: imported by ${who} but missing — tools/track.py <clip> --name ${path.basename(p, '.json')} …`); continue; }
		let tr = null;
		try { tr = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { err(`${rel}: not JSON (${e.message})`); continue; }
		if (tr.version !== 1 || !Array.isArray(tr.frames) || !tr.frames.length || !tr.w || !tr.h || !tr.fps) { err(`${rel}: not a tools/track.py track (version 1 with w / h / fps / frames)`); continue; }
		const clip = tr.clip ? path.basename(tr.clip) : null;
		const inPub = clip ? pubByName.get(clip.toLowerCase()) : null;
		if (users.every(isTest)) {
			ok(`${rel}: test track of ${who} (clip ${clip ?? '?'} ${inPub ? `in public/${inPub}` : 'not in public/ — the tests draw a labelled empty frame'})`);
			continue;
		}
		nShort++;
		if (!clip) warn(`${rel}: the track names no clip — the footage it belongs to cannot be checked`);
		else if (!inPub) err(`${rel}: its clip ${clip} is not in public/ — fetch it with its licence: python3 tools/fetch_asset.py lib 03_Assets/…/${clip}`);
		else if (!credits.includes(clip)) err(`${rel}: its clip public/${inPub} has no CREDITS.md line`);
		const low = tr.stats?.low_conf_s ?? 0;
		if (low > 0.3) warn(`${rel}: ${low.toFixed(2)} s of unsure tracking (c < ${tr.min_conf ?? 0.35}) — overlays fade there; check the sheet (out/tracks/${tr.name}_sheet.jpg) or re-seed tools/track.py`);
		const kb = fs.statSync(p).size / 1024;
		if (kb > 1536) warn(`${rel}: ${kb.toFixed(0)} KB in the bundle — track.py --step 2 or a lower --poly`);
	}
	if (!tracks.size) ok('no tracked footage (src/ imports no data/tracks/*.json)');
	else if (nShort && errors === errorsBeforeTracks) ok(`${nShort} track(s) used by the Short: files valid, clips in public/ and credited`);
}

fs.writeFileSync(path.join(root, 'out/timeline.json'), JSON.stringify({
	duration: DURATION, vo_end: VO_END, loop_t: LOOP_T, level: LEVEL, ab: abNames,
	events: EVENTS.map(({id, t, what, sfx}) => ({id, t, what, sfx: sfx ?? []})),
	beats: BEATS.map(({k, t0, t1, tr, subY, scene}) => ({k, t0: r3(t0), t1: r3(t1), tr, subY, scene})),
}, null, 1));
console.log(errors ? `\n${errors} problem(s), ${warns} warning(s)` : `\nall checks passed (${warns} warning(s)) → out/timeline.json`);
process.exit(errors ? 1 : 0);
