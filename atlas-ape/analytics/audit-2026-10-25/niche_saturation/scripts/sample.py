"""Innertube sampling of Shorts per niche/keyword (US client; es/de clients for the non-English niches).
Buckets per keyword: today/week/month (relevance + upload-date filter, Shorts type) = FRESH supply sample,
pop_month/pop_year (Prioritize=Popularity + date filter) = ceiling sample, pop_all = all-time popularity.
Innertube date filters are loose -> every id is later verified with Data API publishedAt (enrich.py).
Output: raw/innertube_<niche>.json  {keyword: {bucket: [items]}}
"""
import json, os, sys, time
sys.path.insert(0, '/Users/khorengrigoryan/shorts/markt-analyse/tools')
import yt

OUT = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/raw'
V = '2.20260915.01.00'
EN = {"clientName": "WEB", "clientVersion": V, "hl": "en", "gl": "US"}
ES = {"clientName": "WEB", "clientVersion": V, "hl": "es", "gl": "MX"}
DE = {"clientName": "WEB", "clientVersion": V, "hl": "de", "gl": "DE"}
NICHES = {
    "core_absurd_history": (EN, ["weird history", "crazy history", "history facts", "true story history", "absurd history"]),
    "geo_maps": (EN, ["geography facts", "map facts", "country facts", "maps explained"]),
    "animals": (EN, ["animal facts", "animal story", "wild animals", "nature facts"]),
    "science_space": (EN, ["space facts", "science facts", "universe facts", "physics facts"]),
    "true_crime": (EN, ["true crime", "true crime story", "crime story", "prison escape"]),
    "whatif_history_maps": (EN, ["what if history", "alternate history", "what if map", "what if ww2"]),
    "survival_disaster": (EN, ["survival story", "disaster story", "plane crash story", "survived"]),
    "mystery_unsolved": (EN, ["unsolved mystery", "mystery story", "creepy facts", "unexplained"]),
    "es_historias": (ES, ["historias reales", "historia increible", "datos curiosos historia", "historia real"]),
    "de_geschichte": (DE, ["geschichte fakten", "wahre geschichte", "was wäre wenn", "kuriose geschichte"]),
}
BUCKETS = {"today": (yt.sp(0, 2, 9), 8), "week": (yt.sp(0, 3, 9), 6), "month": (yt.sp(0, 4, 9), 4),
           "pop_month": (yt.sp(3, 4, 9), 3), "pop_year": (yt.sp(3, 5, 9), 3), "pop_all": (yt.sp(3, None, 9), 3)}

only = sys.argv[1:] or list(NICHES)
for niche in only:
    client, kws = NICHES[niche]
    path = f'{OUT}/innertube_{niche}.json'
    res = json.load(open(path)) if os.path.exists(path) else {}
    for kw in kws:
        res.setdefault(kw, {})
        for b, (p, pages) in BUCKETS.items():
            if res[kw].get(b): continue
            items = yt.search(kw, p, pages=pages, client=client)
            res[kw][b] = items
            print(f'{niche:22s} {kw:28s} {b:9s} {len(items):4d} shorts={sum(i["kind"]=="short" for i in items)}', flush=True)
            json.dump(res, open(path, 'w'), ensure_ascii=False)
            time.sleep(1.0)
print('DONE', flush=True)
