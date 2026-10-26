"""Search Wikimedia Commons files and print size + licence.
Usage: python3 -I commons_search.py "query" [limit]
"""
import json, re, sys, urllib.parse, urllib.request, html

UA = "AtlasApeShort/1.0 (educational YouTube Short; no contact)"
API = "https://commons.wikimedia.org/w/api.php"


def get(params):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def strip(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return html.unescape(s).strip()


q = sys.argv[1]
lim = int(sys.argv[2]) if len(sys.argv) > 2 else 25
d = get({"action": "query", "generator": "search", "gsrsearch": q, "gsrnamespace": 6, "gsrlimit": lim,
         "prop": "imageinfo", "iiprop": "url|size|extmetadata|mime"})
pages = sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
for p in pages:
    ii = (p.get("imageinfo") or [{}])[0]
    em = ii.get("extmetadata", {})
    g = lambda k: strip(em.get(k, {}).get("value", ""))
    print(f"{p['title']}  [{ii.get('width')}x{ii.get('height')}] {g('LicenseShortName')} | {g('Artist')[:60]} | {g('DateTimeOriginal')[:30]}")
