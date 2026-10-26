#!/usr/bin/env python3
"""Group B: search Wikimedia Commons for VIDEOS.
Usage: python3 -I B_commons_video.py "query" [limit]   or   "Category:Name" [limit]
Prints title | WxH | duration | size | licence | artist."""
import sys, json, re, html, urllib.request, urllib.parse
UA = "AtlasApeShortB/1.0 (https://www.youtube.com/@ATLASAPE-S; educational short) python-urllib"
def api(params):
    import time, urllib.error
    params = dict(params, format="json", maxlag=5)
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(6):
        try:
            return json.load(urllib.request.urlopen(req, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            time.sleep(10 * (i + 1))
    raise SystemExit("429 persists")
def strip(s): return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()
q = sys.argv[1]; lim = int(sys.argv[2]) if len(sys.argv) > 2 else 30
if q.startswith("Category:"):
    params = {"action": "query", "generator": "categorymembers", "gcmtitle": q, "gcmtype": "file|subcat", "gcmlimit": lim}
else:
    params = {"action": "query", "generator": "search", "gsrsearch": q + " filetype:video", "gsrnamespace": 6, "gsrlimit": lim}
params.update({"prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiextmetadatafilter": "LicenseShortName|Artist"})
d = api(params)
pages = d.get("query", {}).get("pages", {})
for p in sorted(pages.values(), key=lambda x: x.get("index", 0)):
    if p.get("ns") == 14:
        print("SUBCAT", p["title"]); continue
    ii = (p.get("imageinfo") or [{}])[0]
    mime = ii.get("mime", "")
    if "video" not in mime and "ogg" not in mime:
        continue
    em = ii.get("extmetadata", {})
    lic = em.get("LicenseShortName", {}).get("value", "?")
    art = strip(em.get("Artist", {}).get("value", "?"))[:40]
    print(f'{p["title"]} | {ii.get("width")}x{ii.get("height")} | {ii.get("duration", 0):.0f}s | {ii.get("size",0)/1e6:.0f}MB | {lic} | {art}')
