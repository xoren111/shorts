#!/usr/bin/env python3
"""New-channel census of one Shorts niche: how often do Shorts of NEW English channels reach 10K / 100K / 1M?

  python3 newchan.py <niche_key> "<kw1>|<kw2>|…" [--per 40] [--cutoff 2025-10-25] [--relevance <regex>]

Sampling (least popularity-biased we can get, same idea as the 25.10 uploader panel):
 1. discovery: Innertube search (US, en) for each keyword, Shorts filter, sorted by upload date and «this week», plus the
    relevance «today» bucket → videos uploaded in the last 7 days (verified with Data API publishedAt), ≤ 180 s, English-looking
    title, optional --relevance regex on the title → their channels. Channels are picked because they just uploaded, not
    because they are popular.
 2. new = channel created on/after --cutoff (default: one year before today), ≤ 400 videos; owner's channels excluded.
 3. random sample of up to --per new channels (seeded by the niche key); per channel the last 50 uploads (playlistItems) →
    its Shorts (≤ 180 s) aged 7–120 days.
Metrics: per upload — share ≥ 10K / ≥ 100K / ≥ 1M (Wilson 95 % interval for ≥ 100K), median and p75 views; per channel — share with
any Short ≥ 100K / ≥ 1M in the window, median of channel medians; supply — share of fresh uploaders that are new channels.
Output: data/<niche_key>.json (+ caches in cache/<niche_key>_*.json). Data API cost ≈ 2 units per sampled channel + discovery
(videos.list / channels.list, 1 unit per 50 ids); no search.list. Every call is logged in quota_log.txt.
"""
import argparse, datetime as dt, json, math, os, random, re, statistics, sys, time, urllib.parse

sys.path.insert(0, '/Users/khorengrigoryan/shorts/markt-analyse/tools')
sys.path.insert(0, '/Users/khorengrigoryan/shorts/tools')
import yt  # noqa: E402
from yt_oauth import access_token, get  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(f'{HERE}/data', exist_ok=True)
os.makedirs(f'{HERE}/cache', exist_ok=True)
EN = {"clientName": "WEB", "clientVersion": "2.20260915.01.00", "hl": "en", "gl": "US"}
OWN = {'UC-RPPsO5Z_GwO8D4d6-pQJw', 'UCdHJ0uWdPkqHaevYJ6u6jng'}
NOW = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
D = 'https://www.googleapis.com/youtube/v3/'
_AT = None


def at():
    global _AT
    if not _AT:
        _AT = access_token()
    return _AT


def call(path, units, **q):
    for k in range(3):
        r = get(D + path + '?' + urllib.parse.urlencode(q), at())
        if r.get('http_status') not in (500, 503):
            break
        time.sleep(3 * (k + 1))
    with open(f'{HERE}/quota_log.txt', 'a') as f:
        f.write(f'{NOW:%Y-%m-%d} {path} {units}u {r.get("http_status", "ok")}\n')
    if r.get('http_status') == 403 and 'quota' in json.dumps(r).lower():
        sys.exit('Data API quota exhausted — stop and report')
    return r


def secs(d):
    m = re.match(r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', d or '')
    if not m:
        return None
    a, b, c, e = (int(x or 0) for x in m.groups())
    return a * 86400 + b * 3600 + c * 60 + e


def P(t):
    return dt.datetime.strptime(t[:19], '%Y-%m-%dT%H:%M:%S')


def videos(ids, cache):
    todo = [i for i in dict.fromkeys(ids) if i and i not in cache]
    for k in range(0, len(todo), 50):
        r = call('videos', 1, part='snippet,statistics,contentDetails', id=','.join(todo[k:k + 50]), maxResults=50)
        for it in r.get('items', []):
            sn, st = it['snippet'], it.get('statistics', {})
            cache[it['id']] = {'title': sn['title'], 'ch': sn['channelId'], 'chn': sn['channelTitle'], 'pub': sn['publishedAt'],
                               'views': int(st.get('viewCount', 0) or 0), 'dur': secs(it['contentDetails'].get('duration')),
                               'lang': sn.get('defaultAudioLanguage') or sn.get('defaultLanguage')}
        for i in todo[k:k + 50]:
            cache.setdefault(i, None)


def channels(ids, cache):
    todo = [i for i in dict.fromkeys(ids) if i and i not in cache]
    for k in range(0, len(todo), 50):
        r = call('channels', 1, part='snippet,statistics', id=','.join(todo[k:k + 50]), maxResults=50)
        for it in r.get('items', []):
            sn, st = it['snippet'], it.get('statistics', {})
            cache[it['id']] = {'title': sn['title'], 'created': sn['publishedAt'], 'country': sn.get('country'),
                               'subs': int(st['subscriberCount']) if st.get('subscriberCount') else None,
                               'videos': int(st.get('videoCount', 0) or 0), 'handle': sn.get('customUrl')}
        for i in todo[k:k + 50]:
            cache.setdefault(i, None)


def english(v):
    l = (v.get('lang') or '').lower()
    if l:
        return l.startswith('en')
    t = v['title']
    return sum(c.isascii() for c in t) / max(len(t), 1) > 0.9


def wilson(k, n, z=1.96):
    if not n:
        return [0, 0]
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return [round((c - h) / d, 4), round((c + h) / d, 4)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('niche')
    ap.add_argument('keywords')
    ap.add_argument('--per', type=int, default=40)
    ap.add_argument('--cutoff', default=(NOW - dt.timedelta(days=365)).strftime('%Y-%m-%d'))
    ap.add_argument('--relevance', default='')
    a = ap.parse_args()
    kws = [k.strip() for k in a.keywords.split('|') if k.strip()]
    vc_p, cc_p, disc_p = (f'{HERE}/cache/{a.niche}_{x}.json' for x in ('videos', 'channels', 'discovery'))
    vc = json.load(open(vc_p)) if os.path.exists(vc_p) else {}
    cc = json.load(open(cc_p)) if os.path.exists(cc_p) else {}
    disc = json.load(open(disc_p)) if os.path.exists(disc_p) else {}

    # 1. discovery
    for kw in kws:
        if kw in disc:
            continue
        ids = []
        for params, pages in ((yt.sp(2, 3, 9), 6), (yt.sp(0, 2, 9), 4)):
            for it in yt.search(kw, params, pages=pages, client=EN):
                ids.append(it['id'])
            time.sleep(1.5)
        disc[kw] = list(dict.fromkeys(ids))
        json.dump(disc, open(disc_p, 'w'))
        print(f'{a.niche}: «{kw}» {len(disc[kw])} ids', flush=True)
    all_ids = list(dict.fromkeys(i for v in disc.values() for i in v))
    videos(all_ids, vc)
    rel = re.compile(a.relevance, re.I) if a.relevance else None
    fresh = [i for i in all_ids if vc.get(i) and (NOW - P(vc[i]['pub'])).days <= 7 and (vc[i]['dur'] or 999) <= 180
             and english(vc[i]) and (not rel or rel.search(vc[i]['title'])) and vc[i]['ch'] not in OWN]
    uploaders = list(dict.fromkeys(vc[i]['ch'] for i in fresh))
    channels(uploaders, cc)
    new = [c for c in uploaders if cc.get(c) and cc[c]['created'][:10] >= a.cutoff and cc[c]['videos'] <= 400]
    rnd = random.Random(a.niche)
    sample = sorted(new)
    rnd.shuffle(sample)
    sample = sample[:a.per]

    # 3. last 50 uploads of each sampled new channel
    up_p = f'{HERE}/cache/{a.niche}_uploads.json'
    up = json.load(open(up_p)) if os.path.exists(up_p) else {}
    for c in sample:
        if c not in up:
            r = call('playlistItems', 1, part='contentDetails', playlistId='UU' + c[2:], maxResults=50)
            up[c] = [it['contentDetails']['videoId'] for it in r.get('items', [])]
            json.dump(up, open(up_p, 'w'))
    videos([v for c in sample for v in up.get(c, [])], vc)
    json.dump(vc, open(vc_p, 'w'))
    json.dump(cc, open(cc_p, 'w'))
    rows = []
    for c in sample:
        for vid in up.get(c, []):
            v = vc.get(vid)
            if not v or (v['dur'] or 999) > 180:
                continue
            age = (NOW - P(v['pub'])).days
            if 7 <= age <= 120:
                rows.append({'ch': c, 'id': vid, 'views': v['views'], 'age_d': age, 'title': v['title']})

    n = len(rows)
    vs = sorted(r['views'] for r in rows)
    k10, k100, k1m = (sum(x >= t for x in vs) for t in (10_000, 100_000, 1_000_000))
    by_ch = {}
    for r in rows:
        by_ch.setdefault(r['ch'], []).append(r['views'])
    chs = [c for c in sample if by_ch.get(c)]
    res = {
        'niche': a.niche, 'keywords': kws, 'relevance': a.relevance, 'cutoff': a.cutoff, 'pulled': f'{NOW:%Y-%m-%d %H:%M} UTC',
        'fresh_uploads': len(fresh), 'fresh_uploaders': len(uploaders), 'new_uploaders': len(new),
        'new_share_of_uploaders': round(len(new) / max(len(uploaders), 1), 3),
        'sampled_channels': len(sample), 'channels_with_aged_shorts': len(chs), 'shorts': n,
        'median_views': int(statistics.median(vs)) if vs else 0,
        'p75_views': int(vs[int(0.75 * (n - 1))]) if vs else 0,
        'p90_views': int(vs[int(0.9 * (n - 1))]) if vs else 0,
        'share_10k': round(k10 / n, 4) if n else 0, 'share_100k': round(k100 / n, 4) if n else 0,
        'share_1m': round(k1m / n, 4) if n else 0, 'ci95_100k': wilson(k100, n), 'hits_100k': k100, 'hits_1m': k1m,
        'channels_any_100k': round(sum(max(by_ch[c]) >= 100_000 for c in chs) / max(len(chs), 1), 3),
        'channels_any_1m': round(sum(max(by_ch[c]) >= 1_000_000 for c in chs) / max(len(chs), 1), 3),
        'median_channel_median': int(statistics.median(statistics.median(by_ch[c]) for c in chs)) if chs else 0,
        'top': sorted(({'views': r['views'], 'title': r['title'], 'channel': cc.get(r['ch'], {}).get('title'), 'ch': r['ch'],
                        'url': f'https://youtube.com/shorts/{r["id"]}', 'age_d': r['age_d']} for r in rows),
                      key=lambda x: -x['views'])[:8],
        'sample': [{'ch': c, 'title': cc[c]['title'], 'created': cc[c]['created'][:10], 'subs': cc[c]['subs'],
                    'shorts_aged': len(by_ch.get(c, [])), 'max': max(by_ch.get(c, [0]))} for c in sample],
    }
    json.dump(res, open(f'{HERE}/data/{a.niche}.json', 'w'), ensure_ascii=False, indent=1)
    print(f'{a.niche}: fresh uploaders {len(uploaders)}, new {len(new)} ({res["new_share_of_uploaders"]:.0%}), sampled {len(sample)}, '
          f'shorts {n}, median {res["median_views"]}, ≥10K {res["share_10k"]:.1%}, ≥100K {res["share_100k"]:.1%} '
          f'{res["ci95_100k"]}, ≥1M {res["share_1m"]:.2%}, channels any 100K {res["channels_any_100k"]:.0%}', flush=True)


if __name__ == '__main__':
    main()
