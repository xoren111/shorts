#!/usr/bin/env python3
"""Step 6 — numbers for the report from census_channels.json → census_summary.json (+ printed tables)."""
import json, os, statistics

D = os.path.dirname(os.path.abspath(__file__))
R = [r for r in json.load(open(f'{D}/census_channels.json')) if r.get('n_shorts')]


def med(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


def q(xs, p):
    xs = sorted(x for x in xs if x is not None)
    if not xs:
        return None
    k = (len(xs) - 1) * p
    lo = int(k)
    return xs[lo] + (xs[min(lo + 1, len(xs) - 1)] - xs[lo]) * (k - lo)


def is_new(r):
    return (r.get('created') or '0') >= '2025-01-01'


def is_new_fs(r):
    return (r.get('first_short_date') or '0') >= '2025-01-01'


out = {}
for lab_set, name in ((('A',), 'A_story'), (('G',), 'G_weird3D'), (('A', 'G'), 'AG_storyformat'), (('A', 'B', 'G'), 'ABG_all'), (('B',), 'B_adjacent')):
    for newf, nname in ((is_new, 'created2025+'), (is_new_fs, 'firstShort2025+')):
        S = [r for r in R if r['label'] in lab_set and newf(r)]
        big = [r for r in S if r['source'] != 'search <100K']
        sm = [r for r in S if r['source'] == 'search <100K']
        key = f'{name}|{nname}'
        o = {'n_channels': len(S), 'n_from_100k_search': len(big), 'n_from_small_search': len(sm),
             'ever_100k': sum(r['n_100k'] > 0 for r in S), 'ever_1m': sum(r['n_1m'] > 0 for r in S),
             'ever_10m': sum(r['n_10m'] > 0 for r in S),
             'small_sample_ever_100k': sum(r['n_100k'] > 0 for r in sm), 'small_sample_ever_1m': sum(r['n_1m'] > 0 for r in sm),
             'median_n_shorts': med([r['n_shorts'] for r in S])}
        W = [r for r in S if r['n_1m'] > 0]
        o['winners_first_1m_index_median'] = med([r['first_1m_index'] for r in W])
        o['winners_first_1m_index_p25_p75'] = [q([r['first_1m_index'] for r in W], .25), q([r['first_1m_index'] for r in W], .75)]
        o['winners_days_to_1m_median'] = med([r['days_to_1m'] for r in W])
        o['winners_days_to_1m_p25_p75'] = [q([r['days_to_1m'] for r in W], .25), q([r['days_to_1m'] for r in W], .75)]
        o['winners_first6_median_of_medians'] = med([r['first6_median'] for r in W])
        # cumulative P(first 1M by upload k | channel has ≥k Shorts)
        km = {}
        for k in (6, 10, 20, 30, 50, 100, 200):
            elig = [r for r in S if r['n_shorts'] >= k]
            hit = [r for r in elig if r['first_1m_index'] and r['first_1m_index'] <= k]
            hit100 = [r for r in elig if r['first_100k_index'] and r['first_100k_index'] <= k]
            km[k] = {'eligible': len(elig), 'hit_1m_by_k': len(hit), 'share_1m': round(len(hit) / len(elig), 3) if elig else None,
                     'hit_100k_by_k': len(hit100), 'share_100k': round(len(hit100) / len(elig), 3) if elig else None}
        o['by_upload_k'] = km
        # slow starters: first 6 Shorts all < 5K today, ≥30 Shorts → how many later hit 100K / 1M
        slow = [r for r in S if r['n_shorts'] >= 30 and (r['first6_max'] or 0) < 5000]
        o['slow_starters_n'] = len(slow)
        o['slow_starters_later_100k'] = sum(r['n_100k'] > 0 for r in slow)
        o['slow_starters_later_1m'] = sum(r['n_1m'] > 0 for r in slow)
        o['slow_starters_1m_names'] = [r['channel'] for r in slow if r['n_1m'] > 0]
        out[key] = o

# established (created < 2025) niche channels: fatigue
# established = created <2025 AND first Short <2025; active = a Short in the last 60 days; the 12-month window must not
# overlap the last-20 window (its centre ≥ 40 Shorts back)
E = [r for r in R if r['label'] in ('A', 'B', 'F', 'G') and not is_new(r) and not is_new_fs(r) and r['n_shorts'] >= 60
     and r.get('last20_median') and (r.get('days_since_last') or 999) <= 60]
fat = []
for r in E:
    fat.append({'channel': r['channel'], 'label': r['label'], 'n_shorts': r['n_shorts'], 'subs': r['subs'],
                'median_all': r['median_views'], 'last20_median': r['last20_median'],
                'median_6mo_ago': r.get('median_6mo_ago') if (r.get('idx_6mo') or 0) >= 40 else None,
                'median_12mo_ago': r.get('median_12mo_ago') if (r.get('idx_12mo') or 0) >= 40 else None,
                'last_short': r.get('last_short_date')})
both = [x for x in fat if x['median_12mo_ago']]
out['established'] = {
    'n': len(fat),
    'n_with_12mo_window': len(both),
    'last20_below_12mo': sum(x['last20_median'] < x['median_12mo_ago'] for x in both),
    'last20_below_half_12mo': sum(x['last20_median'] < 0.5 * x['median_12mo_ago'] for x in both),
    'median_ratio_last20_to_12mo': med([x['last20_median'] / x['median_12mo_ago'] for x in both if x['median_12mo_ago']]),
    'median_ratio_last20_to_all': med([x['last20_median'] / x['median_all'] for x in fat if x['median_all']]),
    'table': sorted(fat, key=lambda x: -(x['subs'] or 0)),
}
json.dump(out, open(f'{D}/census_summary.json', 'w'), ensure_ascii=False, indent=1)
for k, o in out.items():
    if k == 'established':
        continue
    print(k, {kk: vv for kk, vv in o.items() if kk not in ('by_upload_k', 'slow_starters_1m_names')})
    print('   by k:', {k2: (v2['eligible'], v2['share_1m'], v2['share_100k']) for k2, v2 in o['by_upload_k'].items()})
e = out['established']
print('established', {k: v for k, v in e.items() if k != 'table'})
