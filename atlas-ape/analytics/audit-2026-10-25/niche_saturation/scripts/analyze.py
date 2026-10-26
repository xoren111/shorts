"""Compute saturation/ceiling metrics from raw samples -> results.json (+ prints tables)."""
import json, os, sys, glob, statistics as S, datetime as dt, re
sys.path.insert(0, os.path.dirname(__file__)); import dapi
B = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation'
R = f'{B}/raw'
vc = json.load(open(f'{R}/videos_cache.json')); cc = json.load(open(f'{R}/channels_cache.json'))
NOW = dt.datetime.utcfromtimestamp(os.path.getmtime(f'{R}/videos_cache.json'))
P = lambda t: dt.datetime.strptime(t[:19], '%Y-%m-%dT%H:%M:%S')
LANG = {'es_historias': 'es', 'de_geschichte': 'de'}
OWN = {'UCdHJ0uWdPkqHaevYJ6u6jng', 'UC-RPPsO5Z_GwO8D4d6-pQJw'}  # owner's channels excluded from niche stats
vc = {k: v for k, v in vc.items() if v and v.get('channelId') not in OWN}


def age_d(v): return (NOW - P(v['publishedAt'])).total_seconds() / 86400
def secs(v): return dapi.iso_secs(v['duration']) or 9999
def ch_age(cid):
    c = cc.get(cid) or {}
    return (NOW - P(c['created'])).days if c.get('created') else None
def subs(cid): return (cc.get(cid) or {}).get('subs')


def is_lang(v, niche):
    want = LANG.get(niche, 'en')
    l = (v.get('lang') or '').lower()
    if l: return l.startswith(want)
    t = v['title']
    if want == 'en': return sum(ch.isascii() for ch in t) / max(len(t), 1) > 0.9
    return True


def pct(xs, q):
    xs = sorted(xs)
    if not xs: return None
    k = (len(xs) - 1) * q; f = int(k); c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)


def dist(vals):
    if not vals: return {'n': 0}
    return {'n': len(vals), 'median': round(pct(vals, .5)), 'p75': round(pct(vals, .75)), 'p90': round(pct(vals, .9)),
            'share_ge_1k': round(sum(v >= 1e3 for v in vals) / len(vals), 3),
            'share_ge_10k': round(sum(v >= 1e4 for v in vals) / len(vals), 3),
            'share_ge_100k': round(sum(v >= 1e5 for v in vals) / len(vals), 3),
            'share_ge_1m': round(sum(v >= 1e6 for v in vals) / len(vals), 3)}


res = {'now_utc': NOW.isoformat(timespec='minutes'), 'niches': {}}
for f in sorted(glob.glob(f'{R}/innertube_*.json')):
    niche = os.path.basename(f)[10:-5]
    raw = json.load(open(f))
    fresh_ids, pop_ids, vol = set(), set(), {}
    for kw, bk in raw.items():
        ids_today = {i['id'] for i in bk.get('today', []) if i.get('kind') == 'short'}
        ids_week = {i['id'] for i in bk.get('week', []) if i.get('kind') == 'short'}
        ids_month = {i['id'] for i in bk.get('month', []) if i.get('kind') == 'short'}
        fresh_ids |= ids_today | ids_week | ids_month
        for b in ('pop_month', 'pop_year', 'pop_all'):
            pop_ids |= {i['id'] for i in bk.get(b, []) if i.get('kind') == 'short'}
        allk = [vc[i] for i in ids_today | ids_week | ids_month if vc.get(i)]
        d1 = [v for v in allk if age_d(v) <= 1 and secs(v) <= 180]
        d7 = [v for v in allk if age_d(v) <= 7 and secs(v) <= 180]
        vol[kw] = {'today_returned': len(ids_today), 'verified_24h': len(d1), 'verified_24h_lang': sum(is_lang(v, niche) for v in d1),
                   'verified_7d': len(d7), 'distinct_channels_7d': len({v['channelId'] for v in d7}),
                   'pages_exhausted_today': len(ids_today) < 60}
    fresh = [vc[i] for i in fresh_ids if vc.get(i) and secs(vc[i]) <= 180 and age_d(vc[i]) <= 30]
    fl = [v for v in fresh if is_lang(v, niche)]
    vpd = [v['views'] / age_d(v) for v in fl if age_d(v) >= 1]
    coh = [v['views'] for v in fl if 3 <= age_d(v) <= 30]
    coh_young = [v['views'] for v in fl if 1 <= age_d(v) <= 6]
    small = [v for v in fl if (subs(v['channelId']) or 0) < 10000]
    newc = [v for v in fl if (ch_age(v['channelId']) or 9999) < 365]
    def vpd_of(vs): return [v['views'] / age_d(v) for v in vs if age_d(v) >= 1]
    # 90-day ceiling: union of innertube popularity + data api d90 search
    ds = json.load(open(f'{R}/dapi_search.json'))
    d90_ids = set(ds.get(f'{niche}|d90', {}).get('items', []))
    cand = [vc[i] for i in (pop_ids | d90_ids | fresh_ids) if vc.get(i)]
    hits = [v for v in cand if v['views'] >= 1e6 and age_d(v) <= 90 and secs(v) <= 180]
    hl = [v for v in hits if is_lang(v, niche)]
    def chinfo(v):
        a, s = ch_age(v['channelId']), subs(v['channelId'])
        return {'id': v['id'], 'views': v['views'], 'published': v['publishedAt'][:10], 'secs': secs(v), 'lang': v.get('lang'),
                'channel': v['channel'], 'channel_age_d': a, 'subs': s, 'title': v['title']}
    hl_info = sorted([chinfo(v) for v in hl], key=lambda x: -x['views'])
    hits_ch = {}
    for h in hl_info: hits_ch.setdefault(h['channel'], h)
    # all-time popularity: publish year mix of the top results
    pa = [vc[i] for kw, bk in raw.items() for i in [x['id'] for x in bk.get('pop_all', []) if x.get('kind') == 'short'] if vc.get(i)]
    years = {}
    for v in pa: years[v['publishedAt'][:4]] = years.get(v['publishedAt'][:4], 0) + 1
    res['niches'][niche] = {
        'keywords': list(raw), 'fresh_sample_30d': len(fresh), 'fresh_sample_30d_lang': len(fl),
        'fresh_distinct_channels': len({v['channelId'] for v in fl}),
        'views_per_day_age_ge_1d': dist(vpd), 'views_age_3_30d': dist(coh), 'views_age_1_6d': dist(coh_young),
        'small_channels_lt10k_share': round(len(small) / max(len(fl), 1), 3),
        'small_channels_vpd': dist(vpd_of(small)), 'big_channels_vpd': dist(vpd_of([v for v in fl if (subs(v['channelId']) or 0) >= 10000])),
        'new_channels_lt365d_share': round(len(newc) / max(len(fl), 1), 3), 'new_channels_vpd': dist(vpd_of(newc)),
        'volume': vol,
        'volume_median_verified_24h_per_kw': S.median([x['verified_24h_lang'] for x in vol.values()]) if vol else None,
        'ceiling_90d_ge1m_all_lang': len(hits), 'ceiling_90d_ge1m_lang': len(hl),
        'ceiling_90d_ge1m_lang_distinct_channels': len(hits_ch),
        'ceiling_from_channels_lt365d': sum(1 for h in hl_info if (h['channel_age_d'] or 9999) < 365),
        'ceiling_from_channels_lt10k_subs_now': sum(1 for h in hl_info if (h['subs'] or 0) < 10000),
        'ceiling_from_channels_lt100k_subs_now': sum(1 for h in hl_info if (h['subs'] or 0) < 100000),
        'ceiling_hits': hl_info[:60], 'pop_all_publish_years': dict(sorted(years.items())),
    }
# 2024 vs 2026 (Data API search.list, order=viewCount, same keyword, Jan 1 - Oct 25 of each year)
ds = json.load(open(f'{R}/dapi_search.json'))
yy = {}
for k, v in ds.items():
    niche, w = k.split('|')
    vs = sorted([vc[i]['views'] for i in v['items'] if vc.get(i) and secs(vc[i]) <= 180], reverse=True)
    yy.setdefault(niche, {})[w] = {'q': v['q'], 'n': len(vs), 'top1': vs[0] if vs else None, 'top10_median': round(S.median(vs[:10])) if vs else None,
                                   'top50_median': round(S.median(vs)) if vs else None, 'n_ge_1m': sum(x >= 1e6 for x in vs), 'n_ge_10m': sum(x >= 1e7 for x in vs)}
res['year_compare'] = yy
json.dump(res, open(f'{B}/results.json', 'w'), ensure_ascii=False, indent=1)

print(f"NOW {NOW}")
print(f"{'niche':22s} {'n30':>4s} {'ch':>4s} {'vpd_med':>7s} {'vpd75':>7s} {'vpd90':>7s} | {'v3-30 med':>9s} {'p90':>8s} {'>=10k':>6s} {'>=100k':>6s} {'>=1M':>5s} | {'24h/kw':>6s} | small% new% | 90d>=1M(lang) ch <1y <10k")
for n, r in res['niches'].items():
    a, c = r['views_per_day_age_ge_1d'], r['views_age_3_30d']
    print(f"{n:22s} {r['fresh_sample_30d_lang']:4d} {r['fresh_distinct_channels']:4d} {a.get('median',0):7d} {a.get('p75',0):7d} {a.get('p90',0):7d} | {c.get('median',0):9d} {c.get('p90',0):8d} {c.get('share_ge_10k',0):6.2f} {c.get('share_ge_100k',0):6.2f} {c.get('share_ge_1m',0):5.2f} | {r['volume_median_verified_24h_per_kw']!s:>6s} | {r['small_channels_lt10k_share']:.2f} {r['new_channels_lt365d_share']:.2f} | {r['ceiling_90d_ge1m_lang']:3d} {r['ceiling_90d_ge1m_lang_distinct_channels']:3d} {r['ceiling_from_channels_lt365d']:3d} {r['ceiling_from_channels_lt10k_subs_now']:3d}")

# ---- uploader panel (least popularity-biased sample) ----
pn = json.load(open(f'{R}/panel.json')); pvv = json.load(open(f'{R}/panel_videos.json'))
print('\nUPLOADER PANEL: channels that uploaded a matching Short in the last 48 h; their own Shorts aged 3-30 d / last 50 uploads')
print(f"{'niche':22s} {'cand':>4s} {'ch':>3s} {'vids':>4s} {'med':>6s} {'p75':>6s} {'p90':>7s} {'>=10k':>5s} {'>=100k':>6s} | chMedOfMed ch>=10kMed | any>=100k any>=1M (last50) | new<1y: n any>=1M")
res['panel'] = {}
for n, d in pn['niches'].items():
    v = [r['views'] for r in d['rows']]
    bych = {}
    for r in d['rows']: bych.setdefault(r['channel'], []).append(r['views'])
    chmed = [S.median(x) for x in bych.values()]
    ever = {}
    for cid, vids in pn['channels'].items():
        pass
    chans = [cid for cid in pn['channels'] if cid in {r['channel'] for r in d['rows']} or True]
    # channels picked for this niche = those whose rows appear OR were picked (rows may be empty) -> recompute from candidates is not stored; use rows' channels + zero-row ones unknown
    picked = d.get('picked') or list(bych)
    any100 = sum(1 for cid in picked if any((pvv.get(x) or {}).get('views', 0) >= 1e5 and (dapi.iso_secs((pvv.get(x) or {}).get('duration')) or 999) <= 180 for x in pn['channels'][cid]))
    any1m = sum(1 for cid in picked if any((pvv.get(x) or {}).get('views', 0) >= 1e6 and (dapi.iso_secs((pvv.get(x) or {}).get('duration')) or 999) <= 180 for x in pn['channels'][cid]))
    newch = [cid for cid in picked if (ch_age(cid) or 9999) < 365]
    new1m = sum(1 for cid in newch if any((pvv.get(x) or {}).get('views', 0) >= 1e6 for x in pn['channels'][cid]))
    r = {'candidates_48h': d['channels_candidates'], 'channels_picked': len(picked), 'channels_with_rows': len(bych), 'videos': len(v), **dist(v),
         'channel_median_of_medians': round(S.median(chmed)) if chmed else None, 'channels_median_ge_10k': sum(x >= 1e4 for x in chmed),
         'channels_any_short_ge_100k_last50': any100, 'channels_any_short_ge_1m_last50': any1m,
         'new_channels_lt365d': len(newch), 'new_channels_any_ge_1m': new1m}
    res['panel'][n] = r
    print(f"{n:22s} {r['candidates_48h']:4d} {r['channels_with_rows']:3d} {r['videos']:4d} {r.get('median',0):6d} {r.get('p75',0):6d} {r.get('p90',0):7d} {r.get('share_ge_10k',0):5.2f} {r.get('share_ge_100k',0):6.2f} | {r['channel_median_of_medians']!s:>10s} {r['channels_median_ge_10k']:3d} | {any100:3d} {any1m:3d} | {len(newch):3d} {new1m:3d}")
json.dump(res, open(f'{B}/results.json', 'w'), ensure_ascii=False, indent=1)
