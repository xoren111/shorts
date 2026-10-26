#!/usr/bin/env python3
"""Adversarial re-computation of the niche-census findings from census_channels.json / videos_resolved.json /
census_summary.json (read-only). Prints every number cited in ../VERIFY.md."""
import json, math, os, statistics, datetime as dt
from collections import Counter
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = [r for r in json.load(open(f'{D}/census_channels.json')) if r.get('n_shorts')]
new = lambda r: (r.get('created') or '0') >= '2025-01-01'
def G(labs): return [r for r in R if r['label'] in labs and new(r)]
def wilson(k, n, z=1.96):
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); a = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return round((c - a) / d, 3), round((c + a) / d, 3)
ABG, AG = G('ABG'), G('AG')
print('== headline')
for name, S in (('ABG', ABG), ('AG', AG), ('A', G('A'))):
    print(name, len(S), '100k', sum(r['n_100k'] > 0 for r in S), '1m', sum(r['n_1m'] > 0 for r in S),
          'median best', statistics.median(r['max_views'] for r in S), 'best<5k', round(sum(r['max_views'] < 5000 for r in S) / len(S), 3))
C = [r for r in ABG if '2026-08-01' <= r['created'] <= '2026-10-31']
print('cohort Aug-Oct', len(C), 'median best', statistics.median(r['max_views'] for r in C), 'median n', statistics.median(r['n_shorts'] for r in C),
      '100k', sum(r['n_100k'] > 0 for r in C), '1m', [r['channel'] for r in C if r['n_1m']], 'source', Counter(r['source'] for r in C))
S512 = [r for r in ABG if 5 <= r['n_shorts'] <= 12]
print('5-12 Shorts', len(S512), 'share best<2312', round(sum(r['max_views'] < 2312 for r in S512) / len(S512), 3),
      'of which first Short within 30 d', sum(r['first_short_date'] >= '2026-09-25' for r in S512))
print('== slow starters (first6_max<thr): (hit1M by k, eligible, hit100K by k)')
for name, S in (('AG', AG), ('ABG', ABG)):
    for thr in (3000, 5000, 20000):
        o = {}
        for k in (30, 50, 100, 150):
            el = [r for r in S if r['n_shorts'] >= k and (r['first6_max'] or 0) < thr]
            o[k] = (sum(1 for r in el if r['first_1m_index'] and r['first_1m_index'] <= k), len(el),
                    sum(1 for r in el if r['first_100k_index'] and r['first_100k_index'] <= k))
        ev = [r for r in S if r['n_shorts'] >= 30 and (r['first6_max'] or 0) < thr]
        o['ever(n>=30)'] = (sum(r['n_1m'] > 0 for r in ev), len(ev), sum(r['n_100k'] > 0 for r in ev))
        print(name, thr, o)
print('wilson 0/42', wilson(0, 42), '2/116', wilson(2, 116), '1/38', wilson(1, 38), '5/166', wilson(5, 166))
print('== fast starters / early-signal bands')
for name, S in (('ABG', ABG), ('AG', AG)):
    f = [r for r in S if (r['first6_max'] or 0) >= 1e5]
    print(name, 'first6max>=100K', len(f), 'ever1M', sum(r['n_1m'] > 0 for r in f), '| first6max already >=1M', sum((r['first6_max'] or 0) >= 1e6 for r in f),
          '| first6max in [100K,1M)', sum(1e5 <= r['first6_max'] < 1e6 for r in f), 'of which ever1M', sum(1e5 <= r['first6_max'] < 1e6 and r['n_1m'] > 0 for r in f))
    for lo, hi in ((0, 5e3), (5e3, 2e4), (2e4, 1e5), (1e5, 1e6)):
        b = [r for r in S if r['n_shorts'] >= 30 and lo <= (r['first6_max'] or 0) < hi]
        print(f'   n>=30 first6max [{lo:.0f},{hi:.0f}): {len(b)} ever1M {sum(r["n_1m"] > 0 for r in b)} ever100K {sum(r["n_100k"] > 0 for r in b)}')
    W = [r for r in S if r['n_1m'] > 0]
    print('   winners', len(W), 'first6max>=100K', sum(r['first6_max'] >= 1e5 for r in W), '>=20K', sum(r['first6_max'] >= 2e4 for r in W), '>=5K', sum(r['first6_max'] >= 5e3 for r in W))
    print('   winners first6_median: median', statistics.median(r['first6_median'] for r in W), 'p25', sorted(r['first6_median'] for r in W)[len(W) // 4],
          '| non-winners (n>=6) median', statistics.median(r['first6_median'] for r in S if r['n_1m'] == 0 and r['n_shorts'] >= 6))
    print('   winners label mix', Counter(r['label'] for r in W), 'median first-1M idx', statistics.median(r['first_1m_index'] for r in W),
          '<=28', sum(r['first_1m_index'] <= 28 for r in W), 'median days', statistics.median(r['days_to_1m'] for r in W))
    lb = [r for r in S if r['n_shorts'] >= 60 and not (r['first_1m_index'] and r['first_1m_index'] <= 30)]
    print('   late bloomers', sum(r['n_1m'] > 0 for r in lb), '/', len(lb))
atlas6 = [663, 1154, 2312, 1407, 125, 1174]  # data/2026-10-25/summary.json data_api_views
print('ATLAS first6 median', statistics.median(atlas6), 'max', max(atlas6))
print('== cadence (Shorts/day, first->last Short), new ABG n>=10')
S = [r for r in ABG if r['n_shorts'] >= 10]
cad = lambda r: r['n_shorts'] / ((dt.date.fromisoformat(r['last_short_date']) - dt.date.fromisoformat(r['first_short_date'])).days + 1)
print('winners', round(statistics.median(cad(r) for r in S if r['n_1m']), 2), 'non-winners', round(statistics.median(cad(r) for r in S if not r['n_1m']), 2))
print('== fatigue of the NEW breakouts (excluded from the established table)')
for n in ('Hoodie Guy', 'Zeck Felms', 'Past Diary', 'The Art Of War', 'Low Poly Shorts', 'Underground Bullets'):
    r = next(x for x in R if x['channel'] == n)
    print(n, 'last20', r.get('last20_median'), '12mo', r.get('median_12mo_ago'), '6mo', r.get('median_6mo_ago'))
E = json.load(open(f'{D}/census_summary.json'))['established']
both = [x for x in E['table'] if x['median_12mo_ago']]
print('established n', len(both), 'labels', Counter(x['label'] for x in both), 'below', sum(x['last20_median'] < x['median_12mo_ago'] for x in both),
      'median ratio', round(statistics.median(x['last20_median'] / x['median_12mo_ago'] for x in both), 3))
nf = [x for x in both if x['label'] != 'F']
print('  excl F', len(nf), 'below', sum(x['last20_median'] < x['median_12mo_ago'] for x in nf), 'median', round(statistics.median(x['last20_median'] / x['median_12mo_ago'] for x in nf), 3))
b6 = [x for x in E['table'] if x['median_6mo_ago']]
print('  6-month window', len(b6), 'below', sum(x['last20_median'] < x['median_6mo_ago'] for x in b6), 'median', round(statistics.median(x['last20_median'] / x['median_6mo_ago'] for x in b6), 3))
print('  Loaded Dice in established table?', any(x['channel'] == 'Loaded Dice' for x in E['table']))
print('== 1M+ discovered Shorts since 2026-07-01')
V = json.load(open(f'{D}/videos_resolved.json')); RC = {r['channel_id']: r for r in R}
H = [v for v in V.values() if v['views'] >= 1e6 and v['published'] >= '2026-07-01' and RC.get(v['channel_id'], {}).get('label') in ('A', 'B', 'G', 'F')]
print('niche incl F', len(H), 'F', sum(RC[v['channel_id']]['label'] == 'F' for v in H), 'created2025+', sum(new(RC[v['channel_id']]) for v in H),
      'firstShort2025+', sum(RC[v['channel_id']]['first_short_date'] >= '2025-01-01' for v in H))
pe = [(v['views'], RC[v['channel_id']]['channel'], v['title'][:50]) for v in H if 'escap' in v['title'].lower()]
print('prison-escape titles among them', pe)
print('ATLAS channel in discovered Shorts:', sum(v['channel_id'] == 'UC-RPPsO5Z_GwO8D4d6-pQJw' for v in V.values()))
