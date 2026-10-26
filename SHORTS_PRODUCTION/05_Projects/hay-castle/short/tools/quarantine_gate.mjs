// Content (sha256) gate for forbidden files in public/ (standard 5 «Запрещено», QA L3 / L5 / L6):
//   node tools/quarantine_gate.mjs [--public DIR] [--sums FILE] [extra files…]      exit 1 = forbidden file found
// check.mjs п. 8 matches file NAMES; a renamed copy (or a re-export with the same bytes) slips through. This gate matches
// CONTENT: every file under public/ (and project.music when it is a local file) is hashed on every run and compared with
//   1. every file in <library_root>/03_Assets/_quarantine (README* and the cache itself excluded),
//   2. every sha256 / original_sha256 in a «quarantined» array of <library_root>/02_Research/download_logs/*.json
//      (covers the pre-processing original of a quarantined file and files that are no longer on disk),
//   3. the known FREE-key ElevenLabs SFX (non-commercial plan): *_el.wav and crowd_cheer_short.wav in
//      ~/shorts/atlas-ape/*/short*/public/sfx (read only).
// Sets 1 + 3 are cached in _quarantine/SHA256SUMS (sha256sum format: quarantine paths relative, atlas-ape paths absolute, so
// `cd _quarantine && shasum -a 256 -c SHA256SUMS` verifies it). The cache is rebuilt — only the changed files are re-hashed —
// when it is missing, when a listed file is newer than it (mtime or ctime: `mv` into the quarantine updates ctime) or when
// files were added / removed. QUARANTINE_SUMS=<file> moves the cache (read-only library, tests); an unwritable cache is
// a warning. Empty files never count (an empty file would match every other empty file).
// Limit: sha256 catches renamed and byte-identical copies only. A re-encoded copy (ffmpeg / an editor re-save: same sound or
// picture, other bytes) is NOT caught — that would need an audio / video fingerprint (not built).
// API: quarantineGate(opts) → {problems, warnings, info, nFiles, nForbidden} (string arrays, ready for check.mjs err / warn / ok);
//      quarantineProblems(opts) → problems only. opts: root (short/), publicDir, libraryRoot, sums, atlasApe, extra [paths],
//      music: false (skip project.music). Defaults: this kit, project.library_root, the cache above, ~/shorts/atlas-ape.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HERE = path.dirname(SELF);
const EL_NAME = /(_el\.wav|^crowd_cheer_short\.wav)$/i;
const SKIP_Q = /^(README|SHA256SUMS)/i;
const KIND = {
	quarantine: '03_Assets/_quarantine (see _quarantine/README.md, QA L6)',
	log: 'download log «quarantined» entry',
	el: 'FREE-key ElevenLabs SFX (non-commercial plan, standard 5 / QA A6)',
};

const BUF = Buffer.allocUnsafe(4 << 20);
export function sha256File(p) {
	const h = crypto.createHash('sha256');
	const fd = fs.openSync(p, 'r');
	try { for (let n; (n = fs.readSync(fd, BUF, 0, BUF.length, null)) > 0;) h.update(BUF.subarray(0, n)); } finally { fs.closeSync(fd); }
	return h.digest('hex');
}

// files under dir (symlinks followed, loops and dotfiles skipped) → [{abs, rel, size, t}] with t = max(mtime, ctime) in ms
function walk(dir, skip = () => false) {
	const out = [], seen = new Set();
	const go = (d) => {
		let real;
		try { real = fs.realpathSync(d); } catch { return; }
		if (seen.has(real)) return;
		seen.add(real);
		for (const name of fs.readdirSync(d).sort()) {
			if (name.startsWith('.') || skip(name)) continue;
			const abs = path.join(d, name);
			let st;
			try { st = fs.statSync(abs); } catch { continue; }   // dangling symlink
			if (st.isDirectory()) go(abs);
			else if (st.isFile()) out.push({abs, rel: path.relative(dir, abs), size: st.size, t: Math.max(st.mtimeMs, st.ctimeMs)});
		}
	};
	if (fs.existsSync(dir)) go(dir);
	return out;
}

// FREE-key ElevenLabs SFX of the delivered Atlas Ape kits (atlasApe/*/short*/public/sfx)
function elFiles(atlasApe) {
	const out = [];
	if (!fs.existsSync(atlasApe)) return out;
	for (const ep of fs.readdirSync(atlasApe, {withFileTypes: true})) {
		if (!ep.isDirectory() || ep.name.startsWith('.')) continue;
		for (const kit of fs.readdirSync(path.join(atlasApe, ep.name))) {
			if (!kit.startsWith('short')) continue;
			const sfx = path.join(atlasApe, ep.name, kit, 'public/sfx');
			if (!fs.existsSync(sfx) || !fs.statSync(sfx).isDirectory()) continue;
			for (const f of fs.readdirSync(sfx)) {
				if (!EL_NAME.test(f)) continue;
				const abs = path.join(sfx, f);
				const st = fs.statSync(abs);
				if (st.isFile()) out.push({abs, rel: abs, size: st.size, t: Math.max(st.mtimeMs, st.ctimeMs)});
			}
		}
	}
	return out;
}

const readSums = (p) => {
	const m = new Map();
	if (!fs.existsSync(p)) return m;
	for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
		const x = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
		if (x) m.set(x[2], x[1]);
	}
	return m;
};

// sha256 values of every «quarantined» array (any depth) in the download logs → [{sha, file, log}]
function logHashes(logDir) {
	const out = [];
	if (!fs.existsSync(logDir)) return out;
	const take = (entry, log) => {
		const visit = (o) => {
			if (!o || typeof o !== 'object') return;
			for (const [k, v] of Object.entries(o)) {
				if (typeof v === 'string' && /sha256/i.test(k) && /^[0-9a-f]{64}$/i.test(v)) out.push({sha: v.toLowerCase(), file: entry.file ?? entry.original_file ?? '?', log});
				else if (typeof v === 'object') visit(v);
			}
		};
		visit(entry);
	};
	const find = (o, log) => {
		if (Array.isArray(o)) { for (const x of o) find(x, log); return; }
		if (!o || typeof o !== 'object') return;
		for (const [k, v] of Object.entries(o)) {
			if (k === 'quarantined' && Array.isArray(v)) { for (const e of v) if (e && typeof e === 'object') take(e, log); }
			else find(v, log);
		}
	};
	for (const f of fs.readdirSync(logDir).filter((x) => x.endsWith('.json')).sort()) {
		try { find(JSON.parse(fs.readFileSync(path.join(logDir, f), 'utf8')), f); } catch { /* not JSON: skipped */ }
	}
	return out;
}

export function quarantineGate(opts = {}) {
	const root = opts.root ?? path.resolve(HERE, '..');
	let project = {};
	try { project = JSON.parse(fs.readFileSync(path.join(root, 'project.json'), 'utf8')); } catch { /* defaults below */ }
	const lib = opts.libraryRoot ?? project.library_root ?? path.resolve(root, '../../..');
	const publicDir = opts.publicDir ?? path.join(root, 'public');
	const qDir = path.join(lib, '03_Assets/_quarantine');
	const sumsPath = opts.sums ?? process.env.QUARANTINE_SUMS ?? path.join(qDir, 'SHA256SUMS');
	const atlasApe = opts.atlasApe ?? path.join(os.homedir(), 'shorts/atlas-ape');
	const warnings = [], info = [], problems = [];

	// ---- forbidden set 1 + 3 from the cache, re-hashing only what is new or changed
	const qFound = fs.existsSync(qDir) && fs.statSync(qDir).isDirectory();
	const qFiles = walk(qDir, (n) => SKIP_Q.test(n));
	const current = [...qFiles, ...elFiles(atlasApe)];
	const cached = readSums(sumsPath);
	const cacheT = fs.existsSync(sumsPath) ? fs.statSync(sumsPath).mtimeMs : -1;
	const sums = new Map();
	let rehashed = 0;
	for (const f of current) {
		const old = cached.get(f.rel);
		if (old && f.t <= cacheT) sums.set(f.rel, old);
		else { sums.set(f.rel, sha256File(f.abs)); rehashed++; }
	}
	// no quarantine folder (library moved / not mounted): keep the cached quarantine hashes, never shrink the shared cache
	const qOld = qFound ? 0 : [...cached].filter(([rel]) => !path.isAbsolute(rel)).length;
	if (!qFound) {
		for (const [rel, sha] of cached) if (!path.isAbsolute(rel)) sums.set(rel, sha);
		warnings.push(`quarantine folder not found (${qDir}) — ${qOld ? `${qOld} cached quarantine hash(es) from ${sumsPath} used, not refreshed` : 'only download-log and ElevenLabs hashes are checked'}`);
	}
	const stale = rehashed > 0 || cached.size !== sums.size || [...cached.keys()].some((k) => !sums.has(k));
	if (stale && qFound) {
		const txt = [...sums].map(([rel, sha]) => `${sha}  ${rel}`).join('\n') + '\n';
		try {
			fs.mkdirSync(path.dirname(sumsPath), {recursive: true});
			fs.writeFileSync(sumsPath + '.tmp', txt);
			fs.renameSync(sumsPath + '.tmp', sumsPath);
			info.push(`cache ${sumsPath} rebuilt (${rehashed} file(s) hashed, ${sums.size} listed)`);
		} catch (e) { warnings.push(`cache ${sumsPath} not written (${e.code ?? e.message}); hashes kept in memory for this run`); }
	}

	// ---- forbidden map sha → why (empty files excluded)
	const EMPTY = crypto.createHash('sha256').digest('hex');
	const bad = new Map();
	const add = (sha, why) => { if (sha !== EMPTY && !bad.has(sha)) bad.set(sha, why); };
	for (const [rel, sha] of sums) add(sha, path.isAbsolute(rel) ? `${KIND.el}: ${rel.replace(os.homedir(), '~')}` : `${KIND.quarantine}: ${rel}`);
	for (const h of logHashes(path.join(lib, '02_Research/download_logs'))) add(h.sha, `${KIND.log} (${h.log}): ${h.file}`);

	// ---- every file in public/ (+ local project.music / extra files), hashed now
	const targets = walk(publicDir).map((f) => ({...f, show: `public/${f.rel}`}));
	const extra = [...(opts.extra ?? [])];
	if (opts.music !== false && project.music && !/^https?:/i.test(project.music)) {
		const m = /^03_Assets\//.test(project.music) ? path.join(lib, project.music) : path.resolve(root, '..', project.music);
		extra.push(m);
	}
	for (const p of extra) {
		if (!fs.existsSync(p) || !fs.statSync(p).isFile()) continue;
		targets.push({abs: p, size: fs.statSync(p).size, show: p.startsWith(lib) ? path.relative(lib, p) : p});
	}
	for (const f of targets) {
		if (!f.size) continue;
		const sha = sha256File(f.abs);
		const why = bad.get(sha);
		if (why) problems.push(`forbidden file by content (sha256 ${sha.slice(0, 12)}…): ${f.show} is a copy of ${why}`);
	}
	return {problems, warnings, info, nFiles: targets.length, nForbidden: bad.size};
}

export const quarantineProblems = (opts) => quarantineGate(opts).problems;

// ---- CLI (also when started through a symlinked path such as /tmp → /private/tmp)
const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(SELF)) {
	const a = process.argv.slice(2), opts = {extra: []};
	for (let i = 0; i < a.length; i++) {
		if (a[i] === '--public') opts.publicDir = path.resolve(a[++i]);
		else if (a[i] === '--sums') opts.sums = path.resolve(a[++i]);
		else opts.extra.push(path.resolve(a[i]));
	}
	const t0 = Date.now();
	const r = quarantineGate(opts);
	for (const n of r.info) console.log('·', n);
	for (const n of r.warnings) console.log('!', n);
	for (const p of r.problems) console.log('✗', p);
	const msg = `${r.nFiles} file(s) hashed against ${r.nForbidden} forbidden sha256 (quarantine, download logs, FREE-key ElevenLabs) in ${((Date.now() - t0) / 1000).toFixed(2)} s`;
	console.log(r.problems.length ? `\n${r.problems.length} forbidden file(s); ${msg}` : `✓ quarantine hash gate: ${msg}`);
	process.exit(r.problems.length ? 1 : 0);
}
