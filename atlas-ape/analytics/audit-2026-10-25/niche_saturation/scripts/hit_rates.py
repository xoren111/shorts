"""Per-upload hit rates in the uploader panel: of all Shorts (<=180 s, published in the last 90 days, age >= 3 d) that the 40 randomly
picked active uploaders posted (from their last 50 uploads), what share reached >=10K / >=100K / >=1M?  -> raw/hit_rates.json"""
import json, os, sys, datetime as dt
sys.path.insert(0, os.path.dirname(__file__)); import dapi
R = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/raw'
pn = json.load(open(f'{R}/panel.json')); pv = json.load(open(f'{R}/panel_videos.json')); cc = json.load(open(f'{R}/channels_cache.json'))
NOW = dt.datetime.utcfromtimestamp(os.path.getmtime(f'{R}/panel_videos.json'))
P = lambda t: dt.datetime.strptime(t[:19], '%Y-%m-%dT%H:%M:%S')
out = {}
for n, d in pn['niches'].items():
    rows = []
    for cid in d['picked']:
        for x in pn['channels'][cid]:
            v = pv.get(x)
            if not v or (dapi.iso_secs(v.get('duration')) or 999) > 180: continue
            a = (NOW - P(v['publishedAt'])).total_seconds() / 86400
            if 3 <= a <= 90: rows.append((v['views'], cid, (NOW - P(cc[cid]['created'])).days if cc.get(cid) else None))
    k = len(rows)
    new = [r for r in rows if (r[2] or 9999) < 365]
    out[n] = {'uploads': k, 'channels': len({r[1] for r in rows}),
              'rate_ge_10k': round(sum(r[0] >= 1e4 for r in rows) / k, 4), 'rate_ge_100k': round(sum(r[0] >= 1e5 for r in rows) / k, 4),
              'rate_ge_1m': round(sum(r[0] >= 1e6 for r in rows) / k, 4), 'n_ge_1m': sum(r[0] >= 1e6 for r in rows),
              'new_ch_uploads': len(new), 'new_ch_rate_ge_100k': round(sum(r[0] >= 1e5 for r in new) / max(len(new), 1), 4),
              'new_ch_n_ge_1m': sum(r[0] >= 1e6 for r in new)}
    o = out[n]
    print(f"{n:22s} uploads={k:4d} ch={o['channels']:2d} >=10k={o['rate_ge_10k']*100:5.1f}% >=100k={o['rate_ge_100k']*100:5.2f}% >=1M={o['rate_ge_1m']*100:5.2f}% (n={o['n_ge_1m']}) | new-ch uploads={len(new):4d} >=100k={o['new_ch_rate_ge_100k']*100:5.2f}% 1M n={o['new_ch_n_ge_1m']}")
json.dump(out, open(f'{R}/hit_rates.json', 'w'), indent=1)
