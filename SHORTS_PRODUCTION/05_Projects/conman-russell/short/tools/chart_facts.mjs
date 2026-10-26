// Chart numbers vs ../FACTS.md (src/ui/charts.tsx: BarGrow, LineDraw, CompareBeforeAfter, DonutFill, IconRow).
// check.mjs item 6 only sees string props (text= / value= …); chart data are numeric props and object literals
// (data={[{label: 'West', value: 1250, gold: true}]}), so this module reads every chart element of the code and returns the
// numbers that reach the screen (values, display strings, labels, delta, n / k / total) — layout and timing props (t0, box,
// size, dec, max, mark …) are skipped.
//   import {chartShown} from './chart_facts.mjs';
//   const {shown, opaque} = chartShown(code);   // shown: ['BarGrow data: 1250', …] → digit runs go through the FACTS check
//                                               // opaque: props whose numbers are not inline (data={DATA}, `${x}`) → warn
//   import {chartCounters} from './chart_facts.mjs';   // R6: rolling counters + the time their roll starts (check.mjs item 6)
// CLI (same allowed-set rule as check.mjs item 6; test compositions *Gallery.tsx / *Demo.tsx / *_demo.tsx are skipped):
//   node tools/chart_facts.mjs                 check src/**/*.tsx against ../FACTS.md → exit 1 on a number not in FACTS.md
//   node tools/chart_facts.mjs --self-test     parser test on built-in fixtures
import fs from 'node:fs';
import path from 'node:path';

export const CHART_TAGS = ['BarGrow', 'LineDraw', 'CompareBeforeAfter', 'DonutFill', 'IconRow'];
/** props (and object keys) that never reach the screen as a number: time, layout, style, behaviour */
/** props that carry the chart's numbers: when they are not inline literals the FACTS check cannot see them → opaque */
export const DATA_PROPS = new Set(['data', 'values', 'ghost', 'labels', 'value', 'total', 'n', 'k', 'before', 'after', 'display', 'delta']);
export const SKIP = new Set(['t0', 't1', 'tSwitch', 'tFill', 'tFocus', 'tDraw', 'dur', 'grow', 'stagger', 'fillDur', 'box', 'allowLow', 'panel', 'drift', 'locale', 'dir', 'mode', 'layout', 'order', 'seed', 'cols', 'size', 'valueSize', 'thick', 'width', 'dec', 'max', 'min', 'mark', 'smooth', 'area', 'zero', 'tag', 'xLabels', 'ticks', 'count', 'icon', 'gold', 'key', 'style', 'x', 'y', 'w', 'h', 'd']);

/** index just past the balanced group / string that starts at i (src[i] is one of { [ ( ' " `) */
const skipGroup = (src, i) => {
	const open = src[i];
	if (open === "'" || open === '"') {
		for (let j = i + 1; j < src.length; j++) {
			if (src[j] === '\\') j++;
			else if (src[j] === open) return j + 1;
		}
		return src.length;
	}
	if (open === '`') {
		for (let j = i + 1; j < src.length; j++) {
			if (src[j] === '\\') j++;
			else if (src[j] === '$' && src[j + 1] === '{') j = skipGroup(src, j + 1) - 1;
			else if (src[j] === '`') return j + 1;
		}
		return src.length;
	}
	const close = {'{': '}', '[': ']', '(': ')'}[open];
	let depth = 0;
	for (let j = i; j < src.length; j++) {
		const c = src[j];
		if (c === "'" || c === '"' || c === '`') { j = skipGroup(src, j) - 1; continue; }
		if (c === '/' && src[j + 1] === '/') { const e = src.indexOf('\n', j); j = e < 0 ? src.length : e; continue; }
		if (c === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); j = e < 0 ? src.length : e + 1; continue; }
		if ('{[('.includes(c)) depth++;
		else if ('}])'.includes(c)) { depth--; if (depth === 0 && c === close) return j + 1; }
	}
	return src.length;
};

/** removes `key: <value>` pairs whose key is in SKIP from an object / array expression */
const stripSkippedKeys = (expr) => {
	let out = '';
	for (let i = 0; i < expr.length; ) {
		const c = expr[i];
		if (c === "'" || c === '"' || c === '`') { const e = skipGroup(expr, i); out += expr.slice(i, e); i = e; continue; }
		const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(expr.slice(i));
		const prev = out.trimEnd().slice(-1);
		if (m && SKIP.has(m[1]) && (prev === '{' || prev === ',' || prev === '')) {
			let j = i + m[0].length;
			while (j < expr.length && /\s/.test(expr[j])) j++;
			// value runs to the next top-level , or closing bracket
			while (j < expr.length && !',}]'.includes(expr[j])) j = '{[(\'"`'.includes(expr[j]) ? skipGroup(expr, j) : j + 1;
			if (expr[j] === ',') j++;
			i = j;
			continue;
		}
		if (m) { out += m[0]; i += m[0].length; continue; }
		out += c;
		i++;
	}
	return out;
};

/** literal numbers and digit-bearing strings of an expression + whether it holds non-literal parts */
const literals = (expr) => {
	const lits = [];
	let rest = '';
	let opaque = false;
	for (let i = 0; i < expr.length; ) {
		const c = expr[i];
		if (c === "'" || c === '"' || c === '`') {
			const e = skipGroup(expr, i);
			const body = expr.slice(i + 1, e - 1);
			if (c === '`' && body.includes('${')) opaque = true;
			if (/\d/.test(body)) lits.push(body);
			rest += ' ';
			i = e;
			continue;
		}
		rest += c;
		i++;
	}
	for (const m of rest.matchAll(/(?<![\w$.])-?\d+(?:\.\d+)?(?:e\d+)?/g)) lits.push(m[0]);
	const idents = [...rest.replace(/(?<![\w$.])-?\d+(?:\.\d+)?(?:e\d+)?/g, ' ').matchAll(/([A-Za-z_$][\w$]*)(\s*:)?/g)].filter((m) => !m[2] && !['true', 'false', 'null', 'undefined'].includes(m[1]));
	if (idents.length) opaque = true;
	return {lits, opaque};
};

/** every chart element of `code` (comments already stripped or not — // and block comments are skipped) */
export const chartShown = (code) => {
	const src = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
	const shown = [], opaque = [];
	const re = new RegExp(`<(${CHART_TAGS.join('|')})(?=[\\s/>])`, 'g');
	for (const m of src.matchAll(re)) {
		const tag = m[1];
		let i = m.index + m[0].length;
		for (;;) {
			while (i < src.length && /\s/.test(src[i])) i++;
			if (i >= src.length || src[i] === '>' || src.startsWith('/>', i)) break;
			if (src[i] === '{') { const e = skipGroup(src, i); opaque.push(`<${tag} ${src.slice(i, e)}>`); i = e; continue; }
			const nm = /^[A-Za-z_][\w-]*/.exec(src.slice(i));
			if (!nm) { i++; continue; }
			const name = nm[0];
			i += name.length;
			while (i < src.length && /\s/.test(src[i])) i++;
			if (src[i] !== '=') continue;   // boolean prop (count, allowLow …)
			i++;
			while (i < src.length && /\s/.test(src[i])) i++;
			const e = skipGroup(src, i);
			const raw = src.slice(i, e);
			i = e;
			if (SKIP.has(name)) continue;
			const isStr = raw[0] === '"' || raw[0] === "'";
			const expr = isStr ? raw : stripSkippedKeys(raw.slice(1, -1));
			const {lits, opaque: op} = isStr ? {lits: /\d/.test(raw) ? [raw.slice(1, -1)] : [], opaque: false} : literals(expr);
			for (const l of lits) shown.push(`${tag} ${name}: ${l}`);
			if (op && DATA_PROPS.has(name)) opaque.push(`<${tag} ${name}=${raw.length > 60 ? raw.slice(0, 57) + '…' : raw}>`);
		}
	}
	return {shown, opaque};
};

/** every chart element of `code`: {tag, line, attrs: {name: raw text}} — raw = '"…"' for strings, '{…}' for expressions,
 * 'true' for a bare boolean prop (count, allowLow …) */
export const chartElements = (code) => {
	const src = code.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/^\s*\/\/.*$/gm, '');
	const out = [];
	const re = new RegExp(`<(${CHART_TAGS.join('|')})(?=[\\s/>])`, 'g');
	for (const m of src.matchAll(re)) {
		const attrs = {};
		let i = m.index + m[0].length;
		for (;;) {
			while (i < src.length && /\s/.test(src[i])) i++;
			if (i >= src.length || src[i] === '>' || src.startsWith('/>', i)) break;
			if (src[i] === '{') { i = skipGroup(src, i); continue; }   // spread props
			const nm = /^[A-Za-z_][\w-]*/.exec(src.slice(i));
			if (!nm) { i++; continue; }
			i += nm[0].length;
			while (i < src.length && /\s/.test(src[i])) i++;
			if (src[i] !== '=') { attrs[nm[0]] = 'true'; continue; }
			i++;
			while (i < src.length && /\s/.test(src[i])) i++;
			const e = skipGroup(src, i);
			attrs[nm[0]] = src.slice(i, e);
			i = e;
		}
		out.push({tag: m[1], line: src.slice(0, m.index).split('\n').length, attrs});
	}
	return out;
};

/**
 * Rolling counters of the charts (standard R6 / T10): BarGrow / CompareBeforeAfter / DonutFill with `count`, LineDraw with
 * tag="follow". Returns [{tag, line, start, dur}] — `start` = the time expression (source text with W(i) / We(i) / numbers)
 * at which the roll starts, `dur` = the roll length in s as charts.tsx runs it (clamped to R6_MAX_S = 1.1), `asked` = the
 * length the props ask for (warn when > 1.1: the component clamps it). check.mjs evaluates `start` with the words and requires
 * the words spoken during [start, start + dur] to be in project.hide_subs (the big number is on screen → no subtitle, T6).
 * Mirrors charts.tsx: BarGrow t0 + 0.3 + i·stagger (+ 0.12 gold), roll = grow; Compare tSwitch + 0.15 (wipe 0.05), roll 0.9;
 * DonutFill tFill (t0 + 0.3), roll dur (0.9); LineDraw tDraw (t0 + 0.35), roll dur (1.1).
 */
export const chartCounters = (code) => {
	const R6 = 1.1;
	const val = (raw) => (raw === undefined ? undefined : raw[0] === '{' ? raw.slice(1, -1).trim() : raw.slice(1, -1));
	const lit = (raw) => { const v = val(raw); return v !== undefined && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : undefined; };
	const out = [];
	for (const el of chartElements(code)) {
		const A = el.attrs;
		const t0 = val(A.t0);
		let start, asked;
		if (el.tag === 'BarGrow' && A.count === 'true') {
			const n = (val(A.data)?.match(/\bvalue\s*:/g) ?? []).length || 1;
			const gold = /\bgold\s*:\s*true/.test(val(A.data) ?? '') ? 0.12 : 0;
			asked = lit(A.grow) ?? 0.6;
			start = t0 === undefined ? null : `(${t0}) + 0.3`;
			out.push({tag: el.tag, line: el.line, start, dur: (n - 1) * (lit(A.stagger) ?? 0.12) + gold + Math.min(asked, R6), asked});
		} else if (el.tag === 'CompareBeforeAfter' && A.count === 'true') {
			const ts = val(A.tSwitch);
			start = ts === undefined ? null : `(${ts}) + ${val(A.mode) === 'wipe' ? 0.05 : 0.15}`;
			out.push({tag: el.tag, line: el.line, start, dur: 0.9, asked: 0.9});
		} else if (el.tag === 'DonutFill' && A.count === 'true') {
			const tf = val(A.tFill);
			asked = lit(A.dur) ?? 0.9;
			start = tf !== undefined ? `(${tf})` : t0 === undefined ? null : `(${t0}) + 0.3`;
			out.push({tag: el.tag, line: el.line, start, dur: Math.min(asked, R6), asked});
		} else if (el.tag === 'LineDraw' && val(A.tag) === 'follow') {
			const td = val(A.tDraw);
			asked = lit(A.dur) ?? 1.1;
			start = td !== undefined ? `(${td})` : t0 === undefined ? null : `(${t0}) + 0.35`;
			out.push({tag: el.tag, line: el.line, start, dur: Math.min(asked, R6), asked});
		}
	}
	return out;
};

/** the allowed-number set of check.mjs item 6 */
export const allowedFrom = (facts) => new Set([...facts.matchAll(/\d[\d,.]*/g)].flatMap((m) => { const v = m[0].replace(/[.,]$/, ''); return [v, v.replace(/,/g, '')]; }));

const selfTest = () => {
	const fx = `
	// <BarGrow data={[{label: 'X', value: 999}]} />   (comment: ignored)
	<BarGrow t0={W(4)} t1={We(9)} box={{y: 420, h: 600}} unit=" t" count title="Cargo"
		data={[{label: 'North', value: 420}, {label: 'Q1 west', value: 1250, gold: true}]} tFocus={W(8) + 0.2} />
	<LineDraw t0={1} t1={2} values={[2.1, 2.4, 3.9]} labels={['1990', '2000', '2010']} display="7.8 bn" mark={2} dur={1.4} />
	<CompareBeforeAfter t0={0} tSwitch={W(3)} t1={4} before={{value: 50, label: 'Before', icon: {d: 'M10 20 L30 40'}}} after={{value: 1000, display: '1,000'}} delta="×20" />
	<DonutFill t0={0} t1={2} value={71} total={100} label="covered" />
	<IconRow t0={0} t1={2} n={10} k={3} icon="person" cols={5} />
	<BarGrow t0={0} t1={1} data={DATA} />
	<LineDraw t0={0} t1={1} values={[1, 2]} display={\`\${v} k\`} />`;
	const {shown, opaque} = chartShown(fx);
	const want = ['BarGrow data: North'.replace('North', '420'), 'BarGrow data: Q1 west', 'BarGrow data: 1250', 'LineDraw values: 2.1', 'LineDraw values: 2.4', 'LineDraw values: 3.9', 'LineDraw labels: 1990', 'LineDraw labels: 2000', 'LineDraw labels: 2010', 'LineDraw display: 7.8 bn', 'CompareBeforeAfter before: 50', 'CompareBeforeAfter after: 1,000', 'CompareBeforeAfter after: 1000', 'CompareBeforeAfter delta: ×20', 'DonutFill value: 71', 'DonutFill total: 100', 'IconRow n: 10', 'IconRow k: 3', 'LineDraw values: 1', 'LineDraw values: 2'];
	const miss = want.filter((w) => !shown.includes(w));
	const extra = shown.filter((s) => !want.includes(s));
	const opOk = opaque.length === 2 && opaque[0].includes('data={DATA}') && opaque[1].includes('display=');
	const bad = shown.some((s) => /999|M10|20 L30|W\(|0\.2|600|420, h/.test(s) && !/data: 420$/.test(s));
	console.log(`shown ${shown.length}, opaque ${opaque.length}`);
	if (miss.length) console.log('MISSING', miss);
	if (extra.length) console.log('EXTRA', extra);
	if (!opOk) console.log('OPAQUE', opaque);
	const pass = !miss.length && !extra.length && opOk && !bad;
	console.log(pass ? 'self-test OK' : 'self-test FAILED');
	process.exit(pass ? 0 : 1);
};

if (import.meta.url === `file://${process.argv[1]}`) {
	if (process.argv.includes('--self-test')) selfTest();
	const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
	const factsPath = path.join(root, '../FACTS.md');
	const facts = fs.existsSync(factsPath) ? fs.readFileSync(factsPath, 'utf8') : '';
	const allowed = allowedFrom(facts);
	const files = [];
	const walk = (d) => { for (const f of fs.readdirSync(d, {withFileTypes: true})) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.tsx?$/.test(f.name) && !/(Gallery|Demo|_demo)\.tsx$/.test(f.name)) files.push(p); } };
	const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
	if (args.length) files.push(...args.map((a) => path.resolve(a)));
	else walk(path.join(root, 'src'));
	let bad = 0, n = 0;
	for (const f of files) {
		const {shown, opaque} = chartShown(fs.readFileSync(f, 'utf8'));
		for (const s of shown) for (const num of s.slice(s.indexOf(': ') + 2).match(/\d[\d,.]*/g) ?? []) {
			n++;
			const v = num.replace(/[.,]$/, '');
			if (!allowed.has(v) && !allowed.has(v.replace(/,/g, ''))) { bad++; console.log(`ERROR ${path.basename(f)}: «${s}» shows ${v}, not in FACTS.md`); }
		}
		for (const o of opaque) console.log(`WARN  ${path.basename(f)}: ${o} — numbers not inline, cannot check against FACTS.md`);
	}
	console.log(`${bad ? '✗' : '✓'} ${n} chart number(s) in ${files.length} file(s) checked against FACTS.md${bad ? `, ${bad} not found` : ''}`);
	process.exit(bad ? 1 : 0);
}
