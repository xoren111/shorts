#!/usr/bin/env python3
"""Group B: print direct URL + metadata JSON for a Commons file title. Usage: B_commons_url.py "File:..." """
import sys, json, re, html, time, urllib.request, urllib.parse, urllib.error
UA = "AtlasApeShortB/1.0 (https://www.youtube.com/@ATLASAPE-S; educational short) python-urllib"
t = sys.argv[1]
p = {"action": "query", "titles": t, "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "format": "json"}
url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p)
for i in range(6):
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60)); break
    except urllib.error.HTTPError as e:
        if e.code != 429: raise
        time.sleep(10 * (i + 1))
pg = list(d["query"]["pages"].values())[0]; ii = pg["imageinfo"][0]; em = ii.get("extmetadata", {})
s = lambda k: html.unescape(re.sub(r"<[^>]+>", "", em.get(k, {}).get("value", ""))).strip()
print(json.dumps({"title": pg["title"], "page": ii["descriptionurl"], "url": ii["url"], "w": ii.get("width"), "h": ii.get("height"),
  "duration": ii.get("duration"), "author": s("Artist"), "licence": s("LicenseShortName"), "licence_url": s("LicenseUrl"),
  "description": s("ImageDescription")[:300], "date": s("DateTimeOriginal")}, ensure_ascii=False))
