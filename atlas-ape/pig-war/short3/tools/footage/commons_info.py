# usage: python3 -I commons_info.py "File:..." ...  -> prints size, duration, licence, author, url
import json, sys, urllib.parse, urllib.request
titles = sys.argv[1:]
for i in range(0, len(titles), 40):
    q = "|".join(titles[i:i+40])
    url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
           "&iiprop=url|size|extmetadata|mediatype&titles=" + urllib.parse.quote(q))
    req = urllib.request.Request(url, headers={"User-Agent": "pigwar-footage/1.0 (research)"})
    d = json.load(urllib.request.urlopen(req))
    for p in d["query"]["pages"].values():
        ii = p.get("imageinfo", [{}])[0]
        md = ii.get("extmetadata", {})
        g = lambda k: (md.get(k, {}).get("value", "") or "")[:80].replace("\n", " ")
        print(f'{p["title"]}\n   {ii.get("width")}x{ii.get("height")} dur={ii.get("duration")} lic={g("LicenseShortName")} artist={g("Artist")}\n   {ii.get("url")}')
