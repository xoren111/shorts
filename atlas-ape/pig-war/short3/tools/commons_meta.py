"""Query Wikimedia Commons imageinfo/extmetadata for file titles.
Usage: python3 -I commons_meta.py [--json] "File:A.jpg" "File:B.jpg" ...
       python3 -I commons_meta.py --cat "Category:Name"   (all files in category)
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


def meta(titles):
    out = []
    for i in range(0, len(titles), 40):
        chunk = titles[i:i + 40]
        d = get({"action": "query", "titles": "|".join(chunk), "prop": "imageinfo",
                 "iiprop": "url|size|extmetadata|mime", "iiurlwidth": 2400})
        for p in d["query"]["pages"].values():
            if "imageinfo" not in p:
                out.append({"title": p.get("title"), "missing": True})
                continue
            ii = p["imageinfo"][0]
            em = ii.get("extmetadata", {})
            g = lambda k: strip(em.get(k, {}).get("value", ""))
            out.append({
                "title": p["title"], "width": ii["width"], "height": ii["height"], "mime": ii.get("mime"),
                "url": ii["url"], "thumb": ii.get("thumburl"), "page": ii["descriptionurl"],
                "license": g("LicenseShortName"), "license_url": g("LicenseUrl"),
                "artist": g("Artist"), "credit": g("Credit"), "date": g("DateTimeOriginal"),
                "desc": g("ImageDescription"), "cats": g("Categories"),
            })
    return out


def cat_files(cat):
    titles, cont = [], {}
    while True:
        d = get(dict({"action": "query", "list": "categorymembers", "cmtitle": cat, "cmlimit": 500,
                      "cmtype": "file"}, **cont))
        titles += [m["title"] for m in d["query"]["categorymembers"]]
        if "continue" in d:
            cont = d["continue"]
        else:
            return titles


if __name__ == "__main__":
    args = sys.argv[1:]
    as_json = "--json" in args
    args = [a for a in args if a != "--json"]
    if args and args[0] == "--cat":
        titles = cat_files(args[1])
    else:
        titles = args
    res = meta(titles)
    if as_json:
        print(json.dumps(res, ensure_ascii=False, indent=1))
    else:
        for r in res:
            if r.get("missing"):
                print("MISSING", r["title"]); continue
            print(f"## {r['title']}  [{r['width']}x{r['height']}]  LIC={r['license']}")
            print(f"   artist={r['artist'][:120]} | date={r['date'][:60]}")
            print(f"   credit={r['credit'][:200]}")
            print(f"   desc={r['desc'][:400]}")
