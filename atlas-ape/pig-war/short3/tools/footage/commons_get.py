"""commons_get.py — download chosen Commons files (≤ 3000 px thumbs) + <id>.json (source page, author, licence) into assets/footage/<id>/"""
import json, time, urllib.parse, urllib.request, re, pathlib, sys
API = 'https://commons.wikimedia.org/w/api.php'; UA = {'User-Agent': 'AtlasApeShorts/1.0 (research; contact via owner)'}
ROOT = pathlib.Path(__file__).resolve().parents[2]
PICK = {
	'coin_obv': 'File:1856-S eagle obverse.jpg', 'coin_rev': 'File:1856-S eagle reverse.jpg',
	'douglas': 'File:Sir James Douglas.jpg', 'baynes': 'File:AdmiralBaynes.png', 'kaiser': 'File:Kaiser Wilhelm I. .JPG',
	'ganges1': 'File:HMS ‘Ganges’, 84 Guns, off Valparaiso, late-1850s(?) RMG PY0816.jpg',
	'ganges2': 'File:HMS Ganges at Anchor and Drying her Sails off Rio de Janeiro.jpg',
	'camp_us': 'File:American Camp, San Juan Island, July 4, 1867.jpg',
	'evac_1872': 'File:British troops evacuate San Juan Island, Washington Terr, 1872 - Restored.jpg',
	'chart_1859': 'File:Admiralty Chart No 2689 Haro and Rosario Straits Surveyed By Captn. G.H. Richards, Published 1859.jpg',
	'paper1': 'File:Free dark vintage paper page texture for layers (2982207584).jpg', 'paper2': 'File:Paper - Flickr - billionstrang.jpg',
	'pickett': 'File:GeorgePickett.jpeg',
	'camp_uk': 'File:Royal Marines Camp on San Juan Island, ca. 1866*',
}
def get(params):
	params['format'] = 'json'
	for k in range(6):
		try: return json.load(urllib.request.urlopen(urllib.request.Request(API + '?' + urllib.parse.urlencode(params), headers=UA)))
		except urllib.error.HTTPError as e:
			if e.code == 429: time.sleep(8 * (k + 1)); continue
			raise
strip = lambda s: re.sub('<[^>]+>', '', s or '').strip()
ids = sys.argv[1:] or list(PICK)
for k, t in list(PICK.items()):
	if t.endswith('*'):
		time.sleep(4)
		PICK[k] = get({'action': 'query', 'list': 'search', 'srnamespace': 6, 'srlimit': 1, 'srsearch': t[5:-1]})['query']['search'][0]['title']
for i in ids:
	t = PICK[i]; time.sleep(12)
	r = get({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 3000, 'titles': t})
	p = next(iter(r['query']['pages'].values())); ii = p['imageinfo'][0]; md = ii['extmetadata']
	url = ii.get('thumburl') if ii['width'] > 3000 else ii['url']
	d = ROOT / 'assets/footage' / i; d.mkdir(parents=True, exist_ok=True)
	ext = pathlib.Path(urllib.parse.urlparse(url).path).suffix.lower() or '.jpg'
	for k in range(6):
		try:
			data = urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read(); break
		except urllib.error.HTTPError as e:
			if e.code == 429: time.sleep(8 * (k + 1)); continue
			raise
	(d / f'{i}{ext}').write_bytes(data)
	meta = {'id': i, 'title': t.replace('File:', ''), 'source_page_url': ii['descriptionurl'], 'direct_url': url,
	        'author': strip(md.get('Artist', {}).get('value')) or 'unknown', 'licence': strip(md.get('LicenseShortName', {}).get('value')),
	        'licence_url': md.get('LicenseUrl', {}).get('value', ''), 'date': strip(md.get('DateTimeOriginal', {}).get('value'))[:40],
	        'size': [ii['width'], ii['height']], 'description': strip(md.get('ImageDescription', {}).get('value'))[:200]}
	(d / f'{i}.json').write_text(json.dumps(meta, indent=1, ensure_ascii=False))
	print(i, ext, len(data) // 1024, 'KB', meta['licence'], '|', meta['author'][:40])
