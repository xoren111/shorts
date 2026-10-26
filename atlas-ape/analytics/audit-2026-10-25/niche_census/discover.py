#!/usr/bin/env python3
"""Step 1 — discovery. Innertube search as a US viewer (hl=en, gl=US), Shorts filter only.
For every query: relevance all-time, relevance this-year, relevance this-month (2 pages each) + popularity all-time (1 page).
Writes raw_search.json: {video_id: {title, views_innertube, hits:[[query, variant]]}}.
"""
import json, os, sys, time
sys.path.insert(0, '/Users/khorengrigoryan/shorts/markt-analyse/tools')
import yt  # noqa: E402

EN = {"clientName": "WEB", "clientVersion": "2.20260915.01.00", "hl": "en", "gl": "US"}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw_search.json')

QUERIES = [
    "true story", "history facts", "he escaped prison", "craziest war in history", "weirdest history",
    "this man", "nobody believed him", "real story", "weird history facts", "strangest true stories",
    "history stories animated", "dumbest war in history", "craziest prison escape", "greatest con man",
    "biggest scam in history", "history animation", "this guy actually", "craziest thing in history",
    "untold history", "true war story", "bizarre history", "crazy history", "unbelievable true story",
    "history they don't teach you", "ww2 crazy story", "dumbest criminal in history", "luckiest man in history",
    "most insane soldier", "history explained", "funny history", "historical mystery", "how one man",
    "weird history 3d animation", "the man who", "craziest heist", "history story shorts",
]
VARIANTS = {
    "rel_all": (yt.sp(0, None, 9), 2),
    "rel_year": (yt.sp(0, 5, 9), 2),
    "rel_month": (yt.sp(0, 4, 9), 2),
    "pop_all": (yt.sp(3, None, 9), 1),
}

res = json.load(open(OUT)) if os.path.exists(OUT) else {}
done = {tuple(h) for v in res.values() for h in v['hits']}
log = []
for q in QUERIES:
    for vname, (params, pages) in VARIANTS.items():
        if any(h[0] == q and h[1] == vname for h in done):
            continue
        try:
            items = yt.search(q, params, pages=pages, client=EN)
        except Exception as e:  # noqa: BLE001
            print('!', q, vname, e, file=sys.stderr); items = []
        n = 0
        for it in items:
            if it.get('kind') != 'short' or not it.get('id'):
                continue
            n += 1
            r = res.setdefault(it['id'], {'title': it.get('title'), 'views_innertube': it.get('views'), 'hits': []})
            r['hits'].append([q, vname])
        if n == 0:  # keep a marker so a resume does not repeat empty searches
            res.setdefault('_empty', {'title': None, 'views_innertube': None, 'hits': []})['hits'].append([q, vname])
        log.append((q, vname, n))
        print(f'{q[:34]:34s} {vname:9s} shorts={n}', file=sys.stderr, flush=True)
        time.sleep(1.0)
    json.dump(res, open(OUT, 'w'), ensure_ascii=False, indent=0)
print('unique shorts', len([k for k in res if k != '_empty']), file=sys.stderr)
