"""Data API search.list (order=viewCount, videoDuration=short) per niche for 3 windows -> raw/dapi_search.json.
27 calls x 100 units. Same tool for both years so 2024 vs 2026 is comparable."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__)); import dapi
OUT = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/raw/dapi_search.json'
Q = {"core_absurd_history": ("weird history", 'US', 'en'), "geo_maps": ("geography facts", 'US', 'en'),
     "animals": ("animal facts", 'US', 'en'), "science_space": ("space facts", 'US', 'en'),
     "true_crime": ("true crime story", 'US', 'en'), "whatif_history_maps": ("what if history", 'US', 'en'),
     "survival_disaster": ("survival story", 'US', 'en'), "mystery_unsolved": ("unsolved mystery", 'US', 'en'),
     "es_historias": ("historias reales", 'MX', 'es')}
W = {"y2024": ("2024-01-01T00:00:00Z", "2024-10-25T00:00:00Z"), "y2026": ("2026-01-01T00:00:00Z", "2026-10-25T00:00:00Z"),
     "d90": ("2026-07-27T00:00:00Z", "2026-10-25T08:00:00Z")}
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
for niche, (q, reg, lang) in Q.items():
    for w, (a, b) in W.items():
        key = f'{niche}|{w}'
        if key in res and 'items' in res[key]: continue
        r = dapi.search(q, a, b, reg, lang)
        res[key] = {'q': q, 'window': [a, b], 'region': reg, 'lang': lang,
                    'items': [it['id']['videoId'] for it in r.get('items', []) if it.get('id', {}).get('videoId')],
                    'error': r.get('error'), 'totalResults': r.get('pageInfo', {}).get('totalResults')}
        print(key, len(res[key]['items']), res[key]['error'] and res[key]['error'].get('message'), flush=True)
        json.dump(res, open(OUT, 'w'), indent=1)
        if res[key]['error']: sys.exit('stop on error')
