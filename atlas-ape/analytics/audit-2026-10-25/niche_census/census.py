#!/usr/bin/env python3
"""Step 5 — the census. Joins channel meta (Data API), niche labels, full Shorts lists (yt-dlp flat, newest first,
views as YouTube rounds them) and exact dates (video_dates.json). Writes census_channels.csv/.json + census_summary.json.
Definitions
  new entrant      = channel created ≥ 2025-01-01 (Data API snippet.publishedAt)
  new by 1st Short = oldest surviving Short published ≥ 2025-01-01 (catches old/bought accounts that started Shorts late)
  niche            = label A (story niche) or B (adjacent history Shorts); F (face-led) reported separately
  upload index     = position of a Short counted from the channel's oldest SURVIVING Short (deleted flops are invisible)
"""
import bisect, csv, datetime as dt, glob, json, os, statistics, sys

D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from labels_big import label_of  # noqa: E402

TODAY = dt.date(2026, 10, 25)
# '?' channels resolved after reading their own Shorts lists (titles) — see census.md «Label decisions»
Q_RESOLVED = json.load(open(f'{D}/labels_q.json')) if os.path.exists(f'{D}/labels_q.json') else {}
# manual re-labels of every NEW channel (created or first Short ≥2025) that ever reached 100K — read from their own top/newest
# titles; adds G = weird-facts/stories 3D mixed-topic (Zack D. Films type). Takes precedence over all other labels.
OVR = json.load(open(f'{D}/labels_override.json')) if os.path.exists(f'{D}/labels_override.json') else {}

meta = json.load(open(f'{D}/channels_all.json'))
small = json.load(open(f'{D}/labels_small.json'))
dates = json.load(open(f'{D}/video_dates.json')) if os.path.exists(f'{D}/video_dates.json') else {}
big_ids = set(x.strip() for x in open(f'{D}/ids_big.txt'))


def d(vid):
    x = dates.get(vid)
    return dt.date.fromisoformat(x['published'][:10]) if x else None


def med(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


def window_median(e, target):
    """median flat views of the 20 Shorts published closest to `target` (dates interpolated from every-20th sample)"""
    known = [(i, d(x['id'])) for i, x in enumerate(e) if d(x['id'])]
    if len(known) < 2:
        return None, None
    # e is newest-first → dates decrease with index
    idx = None
    for (i0, d0), (i1, d1) in zip(known, known[1:]):
        if d1 <= target <= d0:
            idx = i0 if (d0 - target) <= (target - d1) else i1
            break
    if idx is None:
        return None, None
    lo = max(0, idx - 10)
    return med([x['views'] for x in e[lo:lo + 20]]), idx


rows = []
for f in sorted(glob.glob(f'{D}/shorts_lists/*.json')):
    L = json.load(open(f))
    cid = L['channel_id']
    m = meta.get(cid, {})
    if cid in big_ids:
        lab = label_of(m.get('channel'))
        if lab == 'Q':
            lab = Q_RESOLVED.get(cid, 'Q')
        source = 'search ≥100K / seed'
    else:
        lab = small.get(cid, 'off')
        source = 'search <100K'
    lab = OVR.get(cid, lab)
    e = [x for x in L['entries'] if x.get('id')]
    n = len(e)
    v = [x['views'] for x in e]
    old_first = list(reversed(e))
    r = {'channel_id': cid, 'channel': m.get('channel') or L.get('channel'), 'handle': m.get('handle'), 'label': lab,
         'source': source, 'created': m.get('created'), 'subs': m.get('subs'), 'video_count': m.get('video_count'),
         'total_views': m.get('total_views'), 'n_shorts': n, 'list_capped': n >= 3000}
    if n:
        vv = [x or 0 for x in v]
        r.update({'max_views': max(vv), 'median_views': med(v), 'n_100k': sum(x >= 1e5 for x in vv),
                  'n_1m': sum(x >= 1e6 for x in vv), 'n_10m': sum(x >= 1e7 for x in vv)})
        r['first_short_date'] = str(d(e[-1]['id']) or '')
        r['last_short_date'] = str(d(e[0]['id']) or '')
        for thr, key in ((1e5, '100k'), (1e6, '1m')):
            k = next((i for i, x in enumerate(old_first) if (x['views'] or 0) >= thr), None)
            r[f'first_{key}_index'] = (k + 1) if k is not None else None
            r[f'first_{key}_id'] = old_first[k]['id'] if k is not None else None
            dd = d(old_first[k]['id']) if k is not None else None
            r[f'first_{key}_date'] = str(dd or '')
            r[f'days_to_{key}'] = (dd - d(e[-1]['id'])).days if dd and d(e[-1]['id']) else None
        r['first6_median'] = med([x['views'] for x in old_first[:6]])
        r['first6_max'] = max([x['views'] or 0 for x in old_first[:6]])
        r['first10_median'] = med([x['views'] for x in old_first[:10]])
        aged = [x for x in e[:80] if d(x['id']) and (TODAY - d(x['id'])).days >= 10][:20]
        r['last20_median'] = med([x['views'] for x in aged]) if len(aged) >= 10 else None
        r['last20_n'] = len(aged)
        r['last20_max'] = max([x['views'] or 0 for x in aged]) if aged else None
        if cid in big_ids and n >= 60:
            r['median_6mo_ago'], r['idx_6mo'] = window_median(e, TODAY - dt.timedelta(days=182))
            r['median_12mo_ago'], r['idx_12mo'] = window_median(e, TODAY - dt.timedelta(days=365))
        ls = d(e[0]['id'])
        r['days_since_last'] = (TODAY - ls).days if ls else None
    rows.append(r)

json.dump(rows, open(f'{D}/census_channels.json', 'w'), ensure_ascii=False, indent=0)
keys = sorted({k for r in rows for k in r}, key=lambda k: list(rows[0]).index(k) if k in rows[0] else 99)
with open(f'{D}/census_channels.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=keys)
    w.writeheader()
    w.writerows(rows)
print(len(rows), 'channels written', file=sys.stderr)
