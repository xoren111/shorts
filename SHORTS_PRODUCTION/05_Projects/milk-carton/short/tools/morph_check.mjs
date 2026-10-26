// Geometry check of <Morph> (src/ui/morph.tsx) — every ordered pair of library shapes (src/ui/shapes.ts) or the pairs you name,
// sampled at --steps progress values, WITHOUT a browser (esbuild bundles the two files into out/.morph_check/, node runs them).
//   node tools/morph_check.mjs                               all pairs, mode auto, 160 points, 50 steps
//   node tools/morph_check.mjs --pairs coin:pin,pin:island   only these (a chain A:B:C = A→B and B→C)
//   node tools/morph_check.mjs --pairs @data/italy.d:pin     @file = a file holding one raw SVG path d (fitted into the box,
//                                                            like <Morph from={d}> with fit on) — maps, traced outlines
//   node tools/morph_check.mjs --mode linear --points 120    compare an interpolation mode / resolution
//   node tools/morph_check.mjs --json out/morph_check.json   also write the per-pair table
// Per pair and over all steps it reports the worst value of:
//   selfX   edge crossings inside one ring (a ring tying itself into a knot)                       → ERROR when > 0
//   leak    crossings of a hole ring with a solid ring (the hole slips out of its shape)              → ERROR when > 0
//   area    net area of the matched rings vs the end areas: min / smaller end < 0.35 = collapse, max / larger end > 1.6 =
//           explosion → WARNING
//   box     how far the matched rings leave the union box of both ends (units of the 200-unit box)     > 25 → WARNING
//   twist   mean angle (deg) a matched sample turns around its ring centre (start-point alignment)      > 75 → WARNING
//   modes   P = polar tracks (star-shaped rings: cannot self-intersect), L = linear (checked clean on 16 samples at
//           prepare time), F = flow (a non-star ring melts to a blob first, polar between the blobs)
// Exit 1 on any ERROR. A ring without a partner (vanish / appear) is checked as it shrinks / grows.
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? '1' : arr[i + 1]]] : acc), []));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'out/.morph_check');
fs.mkdirSync(outDir, {recursive: true});
const bundleFile = path.join(outDir, `morph_${process.pid}.mjs`);
await build({
	stdin: {contents: `export * from './morph'; export {SHAPES, shapeNames} from './shapes';`, resolveDir: path.join(root, 'src/ui'), loader: 'ts'},
	bundle: true,
	format: 'esm',
	platform: 'node',
	packages: 'external',
	outfile: bundleFile,
	logLevel: 'error',
	jsx: 'automatic',
});
const M = await import(pathToFileURL(bundleFile).href);
fs.rmSync(bundleFile, {force: true});
try { fs.rmdirSync(outDir); } catch {} // only when empty (another run may be using it)

const STEPS = Number(args.steps ?? 50);
// a token is a library name or @file (raw path d); raw inputs are passed to the engine as the path string itself
const shapeOf = (tok) => (tok.startsWith('@') ? fs.readFileSync(path.resolve(process.cwd(), tok.slice(1)), 'utf8').trim() : tok);
const nameOf = (tok) => (tok.startsWith('@') ? path.basename(tok.slice(1)).replace(/\.[^.]+$/, '') : tok);
const opts = {points: Number(args.points ?? 160), mode: args.mode ?? 'auto'};
let pairs = [];
if (args.pairs) {
	for (const chain of String(args.pairs).split(',')) {
		const s = chain.split(':');
		for (let i = 0; i + 1 < s.length; i++) pairs.push([s[i], s[i + 1]]);
	}
} else {
	const names = M.shapeNames();
	for (const a of names) for (const b of names) if (a !== b) pairs.push([a, b]);
}

// --- geometry helpers -------------------------------------------------------------------------------------------------
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const EPS = 1e-9;
const crosses = (p1, p2, q1, q2) => {
	const d1 = orient(q1, q2, p1), d2 = orient(q1, q2, p2), d3 = orient(p1, p2, q1), d4 = orient(p1, p2, q2);
	return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
};
const edges = (pts) => {
	const out = [];
	for (let i = 0; i < pts.length; i++) {
		const a = pts[i], b = pts[(i + 1) % pts.length];
		if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-6) out.push([a, b, i]);
	}
	return out;
};
const selfCrossings = (pts) => {
	const E = edges(pts), n = pts.length;
	let c = 0;
	for (let i = 0; i < E.length; i++)
		for (let j = i + 1; j < E.length; j++) {
			const di = E[i][2], dj = E[j][2];
			if (Math.abs(di - dj) <= 1 || Math.abs(di - dj) >= n - 1) continue; // neighbours share a vertex
			if (crosses(E[i][0], E[i][1], E[j][0], E[j][1])) c++;
		}
	return c;
};
const ringCrossings = (a, b) => {
	const A = edges(a), B = edges(b);
	let c = 0;
	for (const [p1, p2] of A) for (const [q1, q2] of B) if (crosses(p1, p2, q1, q2)) c++;
	return c;
};
const box = (rings) => {
	const b = [Infinity, Infinity, -Infinity, -Infinity];
	for (const r of rings) for (const [x, y] of r.pts) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
	return b;
};
const netArea = (rings) => rings.reduce((s, r) => s + (r.solid ? 1 : -1) * Math.abs(M.ringArea(r.pts)), 0);
const centre = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

// --- run ----------------------------------------------------------------------------------------------------------------
const rows = [];
const t0 = Date.now();
for (const [a, b] of pairs) {
	const pair = M.prepareMorph(shapeOf(a), shapeOf(b), opts);
	const r0 = M.morphRings(pair, 0), r1 = M.morphRings(pair, 1);
	// area and box over the matched rings only (lonely rings shrink / grow on purpose)
	const matched = (rings) => rings.filter((r, i) => !['vanish', 'appear'].includes(pair.tracks[i].kind) && r.pts.length > 2);
	const A0 = netArea(matched(r0)), A1 = netArea(matched(r1));
	const b0 = box(matched(r0)), b1 = box(matched(r1));
	const ub = [Math.min(b0[0], b1[0]), Math.min(b0[1], b1[1]), Math.max(b0[2], b1[2]), Math.max(b0[3], b1[3])];
	let selfX = 0, leak = 0, amin = Infinity, amax = -Infinity, out = 0, twist = 0;
	const count = (k) => pair.tracks.filter((t) => t.kind === k).length;
	const P = count('polar'), L = count('linear'), F = count('flow');
	for (const t0 of pair.tracks) {
		const tr = t0.kind === 'flow' ? t0.mid : t0; // flow: the twist of its polar middle part
		if (tr.kind !== 'linear' && tr.kind !== 'polar') continue;
		let tw = 0;
		if (tr.kind === 'polar') tw = tr.ta.reduce((s, x, i) => s + Math.abs(tr.tb[i] - x), 0) / tr.ta.length;
		else {
			const ca = centre(tr.a), cb = centre(tr.b);
			tw = tr.a.reduce((s, p, i) => {
				let d = Math.atan2(tr.b[i][1] - cb[1], tr.b[i][0] - cb[0]) - Math.atan2(p[1] - ca[1], p[0] - ca[0]);
				while (d > Math.PI) d -= 2 * Math.PI;
				while (d < -Math.PI) d += 2 * Math.PI;
				return s + Math.abs(d);
			}, 0) / tr.a.length;
		}
		twist = Math.max(twist, (tw * 180) / Math.PI);
	}
	for (let s = 1; s < STEPS; s++) {
		const e = s / STEPS;
		const rings = M.morphRings(pair, e);
		const live = rings.filter((r) => r.pts.length > 2); // a lonely ring below 10 % of its size is dropped
		for (const r of live) selfX += selfCrossings(r.pts);
		const holes = live.filter((r) => !r.solid), solids = live.filter((r) => r.solid);
		for (const h of holes) for (const so of solids) leak += ringCrossings(h.pts, so.pts);
		const ar = netArea(matched(rings));
		amin = Math.min(amin, ar / Math.max(1e-6, Math.min(A0, A1)));
		amax = Math.max(amax, ar / Math.max(1e-6, Math.max(A0, A1)));
		const bb = box(matched(rings));
		out = Math.max(out, ub[0] - bb[0], ub[1] - bb[1], bb[2] - ub[2], bb[3] - ub[3]);
	}
	const errs = [], warns = [];
	if (selfX) errs.push(`selfX ${selfX}`);
	if (leak) errs.push(`leak ${leak}`);
	if (amin < 0.35) warns.push(`area collapse ${amin.toFixed(2)}`);
	if (amax > 1.6) warns.push(`area explosion ${amax.toFixed(2)}`);
	if (out > 25) warns.push(`box +${out.toFixed(0)}`);
	if (twist > 75) warns.push(`twist ${twist.toFixed(0)}°`);
	rows.push({pair: `${nameOf(a)}→${nameOf(b)}`, selfX, leak, area: [+amin.toFixed(2), +amax.toFixed(2)], box: +Math.max(0, out).toFixed(1), twist: +twist.toFixed(1), modes: `${P}P ${L}L${F ? ` ${F}F` : ''}`, tracks: pair.tracks.length, errs, warns});
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`morph_check: ${rows.length} pairs · mode ${opts.mode} · ${opts.points} points · ${STEPS} steps · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(pad('pair', 22) + pad('selfX', 7) + pad('leak', 6) + pad('area min/max', 14) + pad('box', 7) + pad('twist°', 8) + pad('modes', 12) + 'verdict');
for (const r of rows) {
	const v = r.errs.length ? 'ERROR ' + r.errs.join(', ') : r.warns.length ? 'WARNING ' + r.warns.join(', ') : 'ok';
	if (args.quiet && v === 'ok') continue;
	console.log(pad(r.pair, 22) + pad(r.selfX, 7) + pad(r.leak, 6) + pad(`${r.area[0]}…${r.area[1]}`, 14) + pad(r.box, 7) + pad(r.twist, 8) + pad(r.modes, 12) + v);
}
const nE = rows.filter((r) => r.errs.length).length, nW = rows.filter((r) => !r.errs.length && r.warns.length).length;
console.log(`\n${nE ? '✗' : '✓'} ${rows.length - nE - nW} ok · ${nW} warning · ${nE} error`);
if (args.json) fs.writeFileSync(path.resolve(root, args.json), JSON.stringify({opts, steps: STEPS, rows}, null, 1));
process.exit(nE ? 1 : 0);
