"""commons_find.py "query" [n] — Commons file search with licence, artist, size (read-only)"""
import json, sys, urllib.parse, urllib.request, re
API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'AtlasApeShorts/1.0 (research)'}
def get(params):
	params['format'] = 'json'
	return json.load(urllib.request.urlopen(urllib.request.Request(API + '?' + urllib.parse.urlencode(params), headers=UA)))
q, n = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 6
titles = [x['title'] for x in get({'action': 'query', 'list': 'search', 'srnamespace': 6, 'srlimit': n, 'srsearch': q})['query']['search']]
if not titles: sys.exit()
info = get({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'titles': '|'.join(titles)})['query']['pages']
for p in info.values():
	ii = p.get('imageinfo', [{}])[0]; md = ii.get('extmetadata', {})
	strip = lambda s: re.sub('<[^>]+>', '', s or '')[:80]
	print(f"{p['title'][:90]} | {ii.get('width')}x{ii.get('height')} | {strip(md.get('LicenseShortName', {}).get('value'))} | {strip(md.get('Artist', {}).get('value'))}")
