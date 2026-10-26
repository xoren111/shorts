// Kinetic typography gate (src/ui/kinetic.tsx) — render-free, run before every render:
//   node tools/kinetic_check.mjs            report every <Kinetic …> phrase in src/; exit 1 on an error
//   node tools/kinetic_check.mjs --fix      add every missing [fromWord, toWord] to project.json → hide_subs (T6), then check
//   node tools/kinetic_check.mjs --json     machine-readable {errors, warnings, ok, phrases}
// check.mjs calls kineticCheck() as item 12 (same messages). Per phrase:
//   E  word range inside data/words.json, fromWord ≤ toWord, preset known (pop / slam / stack / maskRise / typewriter / punchKey)
//   E  [fromWord, toWord] covered by project.hide_subs — the subtitle of a phrase shown big is hidden (T6 «never twice»);
//      `--fix` writes the missing ranges (existing ranges stay as they are, the list is sorted by start word)
//   E  every number the phrase shows (its words in words.json and `display` overrides) is in ../FACTS.md (like check.mjs item 6)
//   E  fromWord / toWord / a literal prop cannot be read statically (variable, spread) → write literal numbers, or hide the
//      range by hand and mark the element with a «// kinetic-check: manual [a, b]» comment on the line above it
//   W  > 1 key word (T5: ≤ 1 gold word per phrase), a key word outside the range
//   W  two phrases on screen at the same time (T7: one big text zone) or starting closer than the level's big-text spacing
//      (T11 / section 8: L1 10 s, L2 8 s, L3 5 s)
//   W  literal x / y outside the kinetic safe box x 48–887 / y 288–1140 (the component clamps the block, the request is odd)
//   W  slam with shake at level L1 (no shake on L1, standard 8) — pass shake={0}
//   W  slam in 0–0.1 s: its first word's drop would start before frame 0, so kinetic.tsx shows it already landed (no drop, no
//      impact frame — frame 0 stays clean); words starting < 0.12 s apart (SLAM_MERGE) drop together as one hit
// Test compositions (file name ending in Gallery.tsx, Demo.tsx or _demo.tsx: no subtitles of the Short, demo words, replays with
// `shift`) are listed, not checked — same rule as check.mjs (isTest).
import fs from 'node:fs';
import path from 'node:path';

const PRESETS = new Set(['pop', 'slam', 'stack', 'maskRise', 'typewriter', 'punchKey']);
const SAFE = {x0: 48, x1: 887, y0: 288, y1: 1140};
const LEAD = 0.03;
const HOLD = 0.35;
const SLAM_DROP = 0.1;
const SLAM_MERGE = 0.12;   // same as src/ui/kinetic.tsx
const SPACING = {L1: 10, L2: 8, L3: 5};

const stripComments = (c) => c.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/^(\s*)\/\/.*$/gm, (m) => m.replace(/[^\n]/g, ' '));

/** the opening tag text of a JSX element starting at i («<Kinetic …» up to its «>» / «/>», braces and strings respected) */
const tagAt = (src, i) => {
	let depth = 0;
	let q = null;
	for (let j = i + 1; j < src.length; j++) {
		const ch = src[j];
		if (q) {
			if (ch === '\\') j++;
			else if (ch === q) q = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === '`') q = ch;
		else if (ch === '{') depth++;
		else if (ch === '}') depth--;
		else if (depth === 0 && ch === '>') return src.slice(i, j + 1);
	}
	return src.slice(i);
};

/** attributes of an opening tag: {name: raw value text} (+ spread flag) */
const attrsOf = (tag) => {
	const out = {};
	let spread = false;
	const body = tag.replace(/^<\w+/, '').replace(/\/?>$/, '');
	let i = 0;
	while (i < body.length) {
		const m = /^\s*(\{\s*\.\.\.)?([A-Za-z_][\w]*)?/.exec(body.slice(i));
		if (m[1]) {
			spread = true;
			let depth = 1;
			let j = i + body.slice(i).indexOf('{') + 1;
			for (; j < body.length && depth; j++) depth += body[j] === '{' ? 1 : body[j] === '}' ? -1 : 0;
			i = j;
			continue;
		}
		if (!m[2]) {
			i += Math.max(1, m[0].length);
			continue;
		}
		const name = m[2];
		i += m[0].length;
		const rest = body.slice(i);
		const eq = /^\s*=\s*/.exec(rest);
		if (!eq) {
			out[name] = 'true';
			continue;
		}
		i += eq[0].length;
		const c = body[i];
		if (c === '"' || c === "'") {
			const e = body.indexOf(c, i + 1);
			out[name] = JSON.stringify(body.slice(i + 1, e));
			i = e + 1;
		} else if (c === '{') {
			let depth = 0;
			let j = i;
			let q = null;
			for (; j < body.length; j++) {
				const ch = body[j];
				if (q) {
					if (ch === '\\') j++;
					else if (ch === q) q = null;
					continue;
				}
				if (ch === '"' || ch === "'" || ch === '`') q = ch;
				else if (ch === '{') depth++;
				else if (ch === '}' && --depth === 0) break;
			}
			out[name] = body.slice(i + 1, j).trim();
			i = j + 1;
		} else i++;
	}
	return {attrs: out, spread};
};

const num = (v) => (v !== undefined && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : undefined);
const str = (v) => {
	if (v === undefined) return undefined;
	const m = /^(['"`])([^'"`$]*)\1$/.exec(v.trim());
	return m ? m[2] : undefined;
};
const numArr = (v) => {
	if (v === undefined) return undefined;
	try {
		const a = JSON.parse(v);
		return Array.isArray(a) && a.every((x) => Number.isInteger(x)) ? a : undefined;
	} catch {
		return undefined;
	}
};
/** display={{21: '3', 19: ''}} → {21: '3', 19: ''} (string values only) */
const displayOf = (v) => {
	if (v === undefined) return {};
	const out = {};
	for (const m of v.matchAll(/(\d+)\s*:\s*(['"`])([^'"`]*)\2/g)) out[Number(m[1])] = m[3];
	return out;
};

/** every <Kinetic> element of the src/ files: {file, line, attrs, manual, error} */
export const findPhrases = (files) => {
	const out = [];
	for (const [file, raw] of Object.entries(files)) {
		if (/kinetic\.tsx$/.test(file)) continue;
		const src = stripComments(raw);
		for (const m of src.matchAll(/<Kinetic(?![\w.])/g)) {
			const line = src.slice(0, m.index).split('\n').length;
			const prev = raw.split('\n').slice(Math.max(0, line - 3), line - 1).join('\n');
			const man = /kinetic-check:\s*manual\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/.exec(prev);
			const {attrs, spread} = attrsOf(tagAt(src, m.index));
			out.push({file, line, attrs, spread, manual: man ? [Number(man[1]), Number(man[2])] : null, test: /(Gallery|Demo|_demo)\.tsx$/.test(file)});
		}
	}
	return out;
};

/** union cover test: is every word a…b inside some hide_subs range */
const covered = (ranges, a, b) => {
	for (let w = a; w <= b; w++) if (!ranges.some(([x, y]) => w >= x && w <= y)) return false;
	return true;
};

/** project.json with hide_subs replaced — only that value's text changes (the rest of the file stays byte for byte) */
export const writeHideSubs = (projectPath, ranges) => {
	const txt = fs.readFileSync(projectPath, 'utf8');
	const j = JSON.parse(txt);
	let out = null;
	const m = /\n([ \t]*)"hide_subs"\s*:\s*/.exec(txt);
	if (m && txt[m.index + m[0].length] === '[') {
		const start = m.index + m[0].length;
		let depth = 0;
		let e = start;
		for (; e < txt.length; e++) {
			if (txt[e] === '[') depth++;
			else if (txt[e] === ']' && --depth === 0) break;
		}
		const ind = m[1];
		const val = JSON.stringify(ranges, null, ind.length || 1).split('\n').map((l, k) => (k ? ind + l : l)).join('\n');
		out = txt.slice(0, start) + val + txt.slice(e + 1);
	}
	if (out === null || JSON.stringify(JSON.parse(out).hide_subs) !== JSON.stringify(ranges)) {
		j.hide_subs = ranges;
		out = JSON.stringify(j, null, 1) + '\n';
	}
	fs.writeFileSync(projectPath, out);
};

/**
 * The gate. ctx = {root, project, words, code: {absPath: source}, facts (FACTS.md text), err, warn, ok, fix?}
 * Returns {phrases, missing} (missing = ranges not in hide_subs). With fix = true the missing ranges are written first.
 */
export const kineticCheck = (ctx) => {
	const {root, project, words, code, err, warn, ok} = ctx;
	const all = findPhrases(code);
	const tests = all.filter((p) => p.test);
	const phrases = all.filter((p) => !p.test);
	const level = project.level ?? 'L2';
	let hide = (project.hide_subs ?? []).map((r) => [r[0], r[1]]);
	const allowed = new Set([...(ctx.facts ?? '').matchAll(/\d[\d,.]*/g)].flatMap((m) => {
		const v = m[0].replace(/[.,]$/, '');
		return [v, v.replace(/,/g, '')];
	}));
	const clean = (w) => w.replace(/[.,;:—…]+$/g, '').replace(/^[—…]+/, '');
	const rows = [];
	const missing = [];
	const where = (p) => `${path.relative(root, p.file)}:${p.line}`;
	let nBad = 0;
	const bad = (m) => {
		nBad++;
		err(m);
	};
	for (const p of phrases) {
		const A = p.attrs;
		let from = num(A.fromWord);
		let to = num(A.toWord);
		const preset = str(A.preset);
		if (from === undefined || to === undefined) {
			if (p.manual) [from, to] = p.manual;
			else {
				bad(`${where(p)}: <Kinetic> fromWord / toWord not literal numbers (${A.fromWord ?? (p.spread ? 'spread props' : 'missing')} / ${A.toWord ?? '—'}) — write literals or add «// kinetic-check: manual [a, b]» above it and hide the range by hand`);
				continue;
			}
		}
		if (!(from >= 0 && to < words.length && from <= to)) {
			bad(`${where(p)}: word range ${from}–${to} outside data/words.json (0–${words.length - 1}) or reversed`);
			continue;
		}
		if (preset === undefined) bad(`${where(p)}: preset ${A.preset ?? 'missing'} — a literal string is needed («pop», «slam», «stack», «maskRise», «typewriter», «punchKey»)`);
		else if (!PRESETS.has(preset)) bad(`${where(p)}: unknown preset «${preset}» (${[...PRESETS].join(' / ')})`);
		const text = words.slice(from, to + 1).map((w) => clean(w.w)).join(' ');
		const disp = displayOf(A.display);
		// T6: the phrase's subtitle must be hidden
		if (!covered(hide, from, to)) {
			missing.push([from, to]);
			if (!ctx.fix) bad(`${where(p)}: words ${from}–${to} «${text}» are shown big but not in project.hide_subs — the subtitle would show them again (T6); run node tools/kinetic_check.mjs --fix or add [${from}, ${to}]`);
		}
		// numbers on screen vs FACTS.md
		const shown = [];
		for (let i = from; i <= to; i++) shown.push(disp[i] ?? clean(words[i].w));
		for (const s of shown) for (const n of s.match(/\d[\d,.]*/g) ?? []) {
			const v = n.replace(/[.,]$/, '');
			if (!allowed.has(v) && !allowed.has(v.replace(/,/g, ''))) bad(`${where(p)}: shows «${s}» (${v}), not in FACTS.md`);
		}
		for (const i of Object.keys(disp).map(Number)) if (i < from || i > to) warn(`${where(p)}: display override for word ${i} outside the phrase ${from}–${to} (ignored)`);
		// T5 key words
		const keys = numArr(A.keyWords) ?? (A.keyWords === undefined ? (project.gold_words ?? []).filter((i) => i >= from && i <= to) : undefined);
		if (keys === undefined) warn(`${where(p)}: keyWords not a literal array — T5 (≤ 1 gold word) not checked`);
		else {
			if (keys.length > 1) warn(`${where(p)}: ${keys.length} gold key words (${keys.join(', ')}) — T5: one gold word per phrase`);
			for (const k of keys) if (k < from || k > to) warn(`${where(p)}: key word ${k} outside the phrase ${from}–${to}`);
		}
		const x = num(A.x);
		const y = num(A.y);
		if (x !== undefined && (x < SAFE.x0 || x > SAFE.x1)) warn(`${where(p)}: x ${x} outside the kinetic safe box ${SAFE.x0}–${SAFE.x1} (clamped)`);
		if (y !== undefined && (y < SAFE.y0 || y > SAFE.y1)) warn(`${where(p)}: y ${y} outside the kinetic safe box ${SAFE.y0}–${SAFE.y1} (clamped; subtitles sit at 1180–1300)`);
		if (preset === 'slam' && level === 'L1' && num(A.shake) !== 0) warn(`${where(p)}: slam shakes the text block — level L1 has no shake (standard 8): pass shake={0}`);
		const shift = num(A.shift) ?? 0;
		if (shift) warn(`${where(p)}: shift={${shift}} in Short code — the phrase no longer follows the voice`);
		const lead = num(A.lead) ?? LEAD;
		if (preset === 'slam') {
			// frame 0 (H1 / loop seam): a drop that would start before 0 cannot play — the word is shown landed instead
			const shownIdx = [];
			for (let i = from; i <= to; i++) if ((disp[i] ?? clean(words[i].w)) !== '') shownIdx.push(i);
			const pre = shownIdx.filter((i) => words[i].s + shift - lead - SLAM_DROP < 0);
			if (pre.length) warn(`${where(p)}: slam at ${(words[shownIdx[0]].s + shift).toFixed(2)} s — the drop of «${pre.map((i) => clean(words[i].w)).join(' ')}» would start before frame 0, so kinetic.tsx shows it already landed (no drop, no impact frame on frame 0); for a visible hit start the phrase ≥ ${(lead + SLAM_DROP).toFixed(2)} s in, or use pop / punchKey`);
			const merged = [];
			for (let k = 1, g = 0; k < shownIdx.length; k++) {
				if (words[shownIdx[k]].s - words[shownIdx[g]].s < SLAM_MERGE) merged.push(`${clean(words[shownIdx[g]].w)}+${clean(words[shownIdx[k]].w)}`);
				else g = k;
			}
			if (merged.length) warn(`${where(p)}: slam words < ${SLAM_MERGE} s apart drop together as one hit (${merged.join(', ')})${A.oneWord !== undefined && A.oneWord !== 'false' ? ' — oneWord: the later word is pushed to +0.12 s' : ''}`);
		}
		const t0 = words[from].s + shift - lead - (preset === 'slam' ? SLAM_DROP : 0);
		// a non-literal t1 (e.g. the beat's t1) / hold = end unknown → no overlap test for this phrase (spacing still checked)
		const known = (A.t1 === undefined || num(A.t1) !== undefined) && (A.hold === undefined || num(A.hold) !== undefined);
		const t1 = num(A.t1) ?? words[to].e + shift + (num(A.hold) ?? HOLD);
		rows.push({file: path.relative(root, p.file), line: p.line, from, to, preset, text, t0: +t0.toFixed(3), t1: known ? +t1.toFixed(3) : null});
	}
	// T7 / T11: one big text at a time, spacing by level
	const sorted = [...rows].sort((a, b) => a.t0 - b.t0);
	const gap = SPACING[level] ?? 8;
	for (let k = 1; k < sorted.length; k++) {
		const a = sorted[k - 1];
		const b = sorted[k];
		if (a.t1 !== null && b.t0 < a.t1) warn(`kinetic phrases ${a.from}–${a.to} and ${b.from}–${b.to} overlap on screen (${b.t0.toFixed(2)} < ${a.t1.toFixed(2)} s) — one big text zone at a time (T7)`);
		else if (b.t0 - a.t0 < gap) warn(`kinetic phrases ${a.from}–${a.to} (${a.t0.toFixed(2)} s) and ${b.from}–${b.to} (${b.t0.toFixed(2)} s) start ${(b.t0 - a.t0).toFixed(1)} s apart — big text ≤ 1 per ${gap} s at ${level} (T11, standard 8)`);
	}
	if (ctx.fix && missing.length) {
		const merged = [...hide];
		for (const r of missing) if (!merged.some(([x, y]) => x === r[0] && y === r[1])) merged.push(r);
		merged.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
		writeHideSubs(path.join(root, 'project.json'), merged);
		hide = merged;
		project.hide_subs = merged;
		ok(`project.json hide_subs += ${missing.map((r) => `[${r[0]}, ${r[1]}]`).join(', ')} (T6) → ${JSON.stringify(merged)}`);
	}
	if (tests.length) ok(`${tests.length} <Kinetic> in test galleries (${[...new Set(tests.map((p) => path.basename(p.file)))].join(', ')}) — not checked`);
	if (!nBad) ok(`${rows.length} kinetic phrase(s): ranges valid, subtitles hidden (hide_subs), numbers in FACTS.md${rows.length ? ' — ' + rows.map((r) => `${r.preset} ${r.from}–${r.to} «${r.text}» ${r.t0.toFixed(2)}–${r.t1 === null ? 'beat end' : r.t1.toFixed(2)} s`).join(' · ') : ''}`);
	return {phrases: rows, missing};
};

// ------------------------------------------------------------------------------------------------------------------- CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
	const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
	const args = new Set(process.argv.slice(2));
	const project = JSON.parse(fs.readFileSync(path.join(root, 'project.json'), 'utf8'));
	const words = JSON.parse(fs.readFileSync(path.join(root, 'data/words.json'), 'utf8'));
	const factsPath = path.join(root, '../FACTS.md');
	const facts = fs.existsSync(factsPath) ? fs.readFileSync(factsPath, 'utf8') : '';
	const code = {};
	const walk = (d) => {
		for (const f of fs.readdirSync(d, {withFileTypes: true})) {
			const p = path.join(d, f.name);
			if (f.isDirectory()) walk(p);
			else if (/\.tsx?$/.test(f.name)) code[p] = fs.readFileSync(p, 'utf8');
		}
	};
	walk(path.join(root, 'src'));
	const res = {errors: [], warnings: [], ok: []};
	const json = args.has('--json');
	const say = (k, mark) => (m) => {
		res[k].push(m);
		if (!json) console.log(mark, m);
	};
	const r = kineticCheck({root, project, words, code, facts, fix: args.has('--fix'), err: say('errors', '✗'), warn: say('warnings', '!'), ok: say('ok', '✓')});
	if (json) console.log(JSON.stringify({...res, phrases: r.phrases, missing: r.missing}, null, 1));
	else console.log(res.errors.length ? `\n${res.errors.length} problem(s), ${res.warnings.length} warning(s)` : `\nkinetic: all checks passed (${res.warnings.length} warning(s))`);
	process.exit(res.errors.length ? 1 : 0);
}
