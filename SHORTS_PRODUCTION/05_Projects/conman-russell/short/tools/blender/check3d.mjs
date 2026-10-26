// 3D inserts check (tools/blender/shot.py → public/3d/<name>/), called from tools/check.mjs or alone:
//   node tools/blender/check3d.mjs                      (exit 1 on errors)
// For every <Clip3D name="…"> (or dir="3d/…" on Clip3D / ImgSeq) in src/:
//   - public/3d/<name>/meta.json exists, frames f_0001…f_NNNN are all there (count = meta.frames), PNG size = meta width × height;
//     an explicit n={…} is ≤ the frames on disk
//   - CREDITS.md has a line naming `3d/<name>` (own render) and every external source of the shot (meta.sources: model, HDRI,
//     texture, font) by file name; each source carries a licence in the spec
//   - no source from 03_Assets/_quarantine (path or a quarantined file name), no Mixkit, nothing from the Atlas folders
//     (~/shorts/orangutan, atlas-3d, atlas-3d-ai, atlas-blender — Atlas is the owner's 2D art only)
//   - the spec has not changed since the render (sha1) — otherwise warning «re-render»
// Folders in public/3d that no code uses, and *.part folders of interrupted renders, are warnings (they still get bundled).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const HOST_DIRS = /[\\/]shorts[\\/](orangutan|atlas-3d|atlas-3d-ai|atlas-blender)[\\/]/;

const pngSize = (f) => {
	try {
		const b = Buffer.alloc(24);
		const fd = fs.openSync(f, 'r');
		fs.readSync(fd, b, 0, 24, 0);
		fs.closeSync(fd);
		return b.toString('ascii', 12, 16) === 'IHDR' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
	} catch { return null; }
};

export function check3d({root, code, credits, err, warn, ok, isQuarantined = () => false}) {
	const uses = new Map();   // dir → [{file, n}]
	for (const [file, src] of Object.entries(code)) {
		const c = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');   // usage examples in comments do not count
		for (const m of c.matchAll(/<(Clip3D|ImgSeq)\b([^>]*?)\/?>/gs)) {
			const props = m[2];
			const dir = props.match(/\bdir=\{?["'`]([\w./-]+)["'`]/)?.[1] ?? (m[1] === 'Clip3D' ? props.match(/\bname=\{?["'`]([\w-]+)["'`]/)?.[1]?.replace(/^/, '3d/') : null);
			if (!dir || (m[1] === 'ImgSeq' && !dir.startsWith('3d/'))) continue;
			const n = props.match(/\bn=\{\s*(\d+)\s*\}/)?.[1];
			if (!uses.has(dir)) uses.set(dir, []);
			uses.get(dir).push({file: path.basename(file), n: n ? Number(n) : null});
		}
	}
	let bad = 0;
	const e = (msg) => { bad++; err(msg); };
	for (const [dir, us] of uses) {
		const abs = path.join(root, 'public', dir);
		const metaPath = path.join(abs, 'meta.json');
		if (!fs.existsSync(metaPath)) { e(`3D insert ${dir} (used in ${us.map((u) => u.file).join(', ')}): public/${dir}/meta.json missing — render it: tools/blender/run.sh tools/blender/shot.py -- <spec.json>`); continue; }
		let meta;
		try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (x) { e(`3D insert ${dir}: meta.json unreadable (${x.message})`); continue; }
		const ext = meta.ext ?? 'png';
		const files = fs.readdirSync(abs).filter((f) => new RegExp(`^f_\\d{4}\\.${ext}$`).test(f)).sort();
		if (files.length !== meta.frames) e(`3D insert ${dir}: ${files.length} frame files, meta.json says ${meta.frames}`);
		const missing = [];
		for (let k = 1; k <= meta.frames; k++) if (!files.includes(`f_${String(k).padStart(4, '0')}.${ext}`)) missing.push(k);
		if (missing.length) e(`3D insert ${dir}: frames missing ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`);
		if (ext === 'png' && files.length) {
			const sz = pngSize(path.join(abs, files[0]));
			if (sz && (sz[0] !== meta.width || sz[1] !== meta.height)) e(`3D insert ${dir}: frames are ${sz[0]}×${sz[1]}, meta.json says ${meta.width}×${meta.height}`);
		}
		for (const u of us) if (u.n !== null && u.n > meta.frames) e(`${u.file}: ${dir} played with n={${u.n}}, only ${meta.frames} frames rendered`);
		const name = dir.replace(/^3d\//, '');
		if (!credits.includes(`3d/${name}`)) e(`3D insert ${dir}: no CREDITS.md line naming \`3d/${name}\` (own Blender render + its spec ${meta.spec ?? ''})`);
		for (const s of meta.sources ?? []) {
			const p = `${s.path ?? ''}`;
			if (isQuarantined(s.file) || /_quarantine/i.test(p)) e(`3D insert ${dir}: source ${s.file} is in 03_Assets/_quarantine`);
			if (/mixkit/i.test(p) || /mixkit/i.test(s.file ?? '')) e(`3D insert ${dir}: source ${s.file} is a Mixkit file (L5)`);
			if (HOST_DIRS.test(p)) e(`3D insert ${dir}: source ${p} comes from an Atlas folder — Atlas is never 3D (owner rule)`);
			if (!s.license) e(`3D insert ${dir}: source ${s.file} has no licence in the spec (add "license": "…" next to its path)`);
			if (!credits.includes(s.file)) e(`3D insert ${dir}: source ${s.file} (${s.kind}, ${s.license ?? 'licence?'}) has no CREDITS.md line`);
		}
		if (meta.spec && meta.spec_sha1) {
			const sp = path.resolve(root, meta.spec);
			if (fs.existsSync(sp)) {
				const sha = crypto.createHash('sha1').update(fs.readFileSync(sp, 'utf8')).digest('hex');
				if (sha !== meta.spec_sha1) warn(`3D insert ${dir}: ${meta.spec} changed after the render (${meta.rendered}) — re-render it`);
			}
		}
	}
	const d3 = path.join(root, 'public/3d');
	let bytes = 0;
	if (fs.existsSync(d3)) {
		for (const f of fs.readdirSync(d3, {withFileTypes: true})) {
			if (!f.isDirectory()) continue;
			const p = path.join(d3, f.name);
			for (const g of fs.readdirSync(p)) bytes += fs.statSync(path.join(p, g)).size;
			if (f.name.endsWith('.part')) warn(`public/3d/${f.name}: interrupted render — delete it (it is bundled with every render)`);
			else if (!uses.has(`3d/${f.name}`)) warn(`public/3d/${f.name}: not used in src/ — delete it or use it (every render bundles public/)`);
		}
	}
	if (bytes > 300e6) warn(`public/3d holds ${(bytes / 1e6).toFixed(0)} MB — use "fps": 30, a size cropped to the object, or "format": "webp"`);
	if (!bad) ok(uses.size ? `${uses.size} 3D insert(s) complete and credited (${(bytes / 1e6).toFixed(1)} MB in public/3d)` : 'no 3D inserts (Clip3D)');
	return bad;
}

// ---- standalone: node tools/blender/check3d.mjs
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
	const code = {};
	const walk = (d) => { for (const f of fs.readdirSync(d, {withFileTypes: true})) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.tsx?$/.test(f.name)) code[p] = fs.readFileSync(p, 'utf8'); } };
	walk(path.join(root, 'src'));
	const credits = fs.existsSync(path.join(root, 'CREDITS.md')) ? fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8') : '';
	const project = JSON.parse(fs.readFileSync(path.join(root, 'project.json'), 'utf8'));
	const q = new Set();
	const qDir = project.library_root ? path.join(project.library_root, '03_Assets/_quarantine') : '';
	if (qDir && fs.existsSync(qDir)) {
		const walkQ = (d) => { for (const f of fs.readdirSync(d, {withFileTypes: true})) { if (f.name.startsWith('.')) continue; const p = path.join(d, f.name); if (f.isDirectory()) walkQ(p); else if (!/^README/i.test(f.name)) q.add(f.name.toLowerCase()); } };
		walkQ(qDir);
	}
	let errors = 0;
	const bad = check3d({
		root, code, credits,
		err: (m) => { errors++; console.log('✗', m); }, warn: (m) => console.log('!', m), ok: (m) => console.log('✓', m),
		isQuarantined: (f) => !!f && q.has(path.basename(f).toLowerCase()),
	});
	process.exit(bad || errors ? 1 : 0);
}
