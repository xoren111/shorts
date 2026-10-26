"""Do copycats of a sharp series template also win? Innertube (US) month bucket for each template phrase,
verified with Data API; template match by regex on the title; originator channel excluded. -> raw/copycats.json"""
import json, os, re, sys, time, statistics as S, datetime as dt
sys.path.insert(0, '/Users/khorengrigoryan/shorts/markt-analyse/tools'); import yt
sys.path.insert(0, os.path.dirname(__file__)); import dapi
R = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/raw'
EN = {"clientName": "WEB", "clientVersion": "2.20260915.01.00", "hl": "en", "gl": "US"}
T = {"10 weird things about [person]": ("10 weird things you didn't know about", r"\b(10|ten)\s+(weird|weirdest|strange)\b", "FGtheexplainer"),
     "if history had sound": ("if history had sound", r"had (a )?sound", "Vector_Fox"),
     "X in 1000 years map": ("took over the world in 1000 years", r"1000 years", "Meridian Anatomy"),
     "countries that look the same": ("countries that look the same", r"countr", "World Ji Ke")}
vc = json.load(open(f'{R}/videos_cache.json'))
NOW = dt.datetime.utcnow(); P = lambda t: dt.datetime.strptime(t[:19], '%Y-%m-%dT%H:%M:%S')
out = {}
for name, (q, rx, orig) in T.items():
    ids = []
    for p in (yt.sp(0, 3, 9), yt.sp(0, 4, 9)):
        ids += [i['id'] for i in yt.search(q, p, pages=4, client=EN) if i.get('kind') == 'short']
        time.sleep(1)
    dapi.videos(ids, vc)
    rows = []
    for i in dict.fromkeys(ids):
        v = vc.get(i)
        if not v: continue
        a = (NOW - P(v['publishedAt'])).total_seconds() / 86400
        if a <= 30 and re.search(rx, v['title'], re.I) and (dapi.iso_secs(v['duration']) or 999) <= 180:
            rows.append({'id': i, 'channel': v['channel'], 'views': v['views'], 'age_d': round(a, 1), 'title': v['title'], 'orig': v['channel'].strip() == orig})
    cop = [r for r in rows if not r['orig']]
    cv = [r['views'] / max(r['age_d'], 1) for r in cop if r['age_d'] >= 1]
    out[name] = {'q': q, 'n_template_30d': len(rows), 'n_copycats': len(cop), 'copycat_channels': len({r['channel'] for r in cop}),
                 'copycat_vpd_median': round(S.median(cv)) if cv else None,
                 'copycat_views_median': round(S.median([r['views'] for r in cop])) if cop else None,
                 'copycat_share_ge_100k': round(sum(r['views'] >= 1e5 for r in cop) / len(cop), 2) if cop else None,
                 'rows': sorted(rows, key=lambda r: -r['views'])}
    print(name, {k: v for k, v in out[name].items() if k != 'rows'}, flush=True)
json.dump(vc, open(f'{R}/videos_cache.json', 'w'), ensure_ascii=False)
json.dump(out, open(f'{R}/copycats.json', 'w'), ensure_ascii=False, indent=1)
