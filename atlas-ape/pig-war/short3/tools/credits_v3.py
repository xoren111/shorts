"""v3 footage credits: every assets/footage/<id>/*.json (source page, author, licence) → the «v3 footage & archive» section of
CREDITS.md (replaced on each run) + out/credits_description.txt (the attribution block for the YouTube description: CC BY /
CC BY-SA items must be credited; Pexels / Mixkit / PD / CC0 are listed as a courtesy).  Usage: python3 tools/credits_v3.py"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
FOOT = ROOT / 'assets/footage'
used = set(re.findall(r"footage/([\w-]+)/([\w.-]+)", (ROOT / 'src/data/cuts.ts').read_text()))
rows = []
for meta in sorted(FOOT.glob('*/*.json')):
	m = json.loads(meta.read_text())
	sid = meta.parent.name
	stem = meta.stem
	media = [p.name for p in meta.parent.iterdir() if p.stem == stem and p.suffix.lower() in ('.mp4', '.jpg', '.jpeg', '.png', '.webp', '.tif')]
	if not any((sid, f) in used for f in media) and not any(u[0] == sid and u[1].startswith(stem) for u in used):
		continue
	url = m.get('source_page_url') or m.get('source_url') or m.get('page_url') or ''
	rows.append({
		'id': f'{sid}/{stem}',
		'title': m.get('title') or m.get('description') or stem,
		'author': m.get('author') or m.get('creator') or 'unknown',
		'licence': m.get('licence') or m.get('license') or '',
		'url': url,
	})

sec = ['## v3 footage & archive (real camera footage and photos, no AI)', '']
for r in rows:
	sec.append(f"- {r['id']}: «{r['title']}» — {r['author']} — {r['licence']} — {r['url']}")
sec.append('')
cred = ROOT / 'CREDITS.md'
txt = cred.read_text() if cred.exists() else '# Credits\n'
txt = re.sub(r'## v3 footage & archive.*?(?=\n## |\Z)', '', txt, flags=re.S).rstrip() + '\n\n' + '\n'.join(sec)
cred.write_text(txt)

need = [r for r in rows if re.search(r'CC[ -]?BY', r['licence'], re.I)]
lines = ['Footage & photos:']
for r in rows:
	lines.append(f"• {r['title']} — {r['author']} ({r['licence']}) {r['url']}")
(ROOT / 'out').mkdir(exist_ok=True)
(ROOT / 'out/credits_description.txt').write_text('\n'.join(lines) + '\n')
print(f'{len(rows)} items credited ({len(need)} need attribution: CC BY / CC BY-SA)')
