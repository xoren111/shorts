"""Data API helpers (read-only token from ~/shorts/tools/yt_oauth.py). videos/channels.list = 1 unit per 50 ids, search.list = 100."""
import json, os, sys, urllib.parse
sys.path.insert(0, '/Users/khorengrigoryan/shorts/tools')
from yt_oauth import access_token, get
D = 'https://www.googleapis.com/youtube/v3/'
_AT = None
LOG = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/raw/quota_log.txt'


def at():
    global _AT
    if not _AT: _AT = access_token()
    return _AT


def call(path, units, **q):
    r = get(D + path + '?' + urllib.parse.urlencode(q), at())
    with open(LOG, 'a') as f: f.write(f'{path} {units}u {q.get("q","")} {q.get("publishedAfter","")} {r.get("http_status","ok")}\n')
    return r


def videos(ids, cache=None):
    cache = cache if cache is not None else {}
    todo = [i for i in dict.fromkeys(ids) if i and i not in cache]
    for k in range(0, len(todo), 50):
        r = call('videos', 1, part='snippet,statistics,contentDetails', id=','.join(todo[k:k+50]), maxResults=50)
        for it in r.get('items', []):
            sn, st, cd = it['snippet'], it.get('statistics', {}), it['contentDetails']
            cache[it['id']] = {'id': it['id'], 'title': sn['title'], 'channelId': sn['channelId'], 'channel': sn['channelTitle'],
                               'publishedAt': sn['publishedAt'], 'views': int(st.get('viewCount', 0) or 0),
                               'likes': int(st['likeCount']) if 'likeCount' in st else None,
                               'comments': int(st['commentCount']) if 'commentCount' in st else None,
                               'duration': cd.get('duration'), 'lang': sn.get('defaultAudioLanguage') or sn.get('defaultLanguage'),
                               'cat': sn.get('categoryId')}
        for i in todo[k:k+50]: cache.setdefault(i, None)
    return cache


def channels(ids, cache=None):
    cache = cache if cache is not None else {}
    todo = [i for i in dict.fromkeys(ids) if i and i not in cache]
    for k in range(0, len(todo), 50):
        r = call('channels', 1, part='snippet,statistics', id=','.join(todo[k:k+50]), maxResults=50)
        for it in r.get('items', []):
            sn, st = it['snippet'], it.get('statistics', {})
            cache[it['id']] = {'id': it['id'], 'title': sn['title'], 'created': sn['publishedAt'], 'country': sn.get('country'),
                               'subs': int(st['subscriberCount']) if st.get('subscriberCount') else None,
                               'views': int(st.get('viewCount', 0) or 0), 'videos': int(st.get('videoCount', 0) or 0),
                               'handle': sn.get('customUrl')}
        for i in todo[k:k+50]: cache.setdefault(i, None)
    return cache


def search(q, after, before, region='US', lang='en', order='viewCount'):
    r = call('search', 100, part='snippet', q=q, type='video', videoDuration='short', order=order, maxResults=50,
             publishedAfter=after, publishedBefore=before, regionCode=region, relevanceLanguage=lang)
    return r


def iso_secs(d):
    import re
    m = re.match(r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', d or '')
    if not m: return None
    dd, h, mi, s = (int(x or 0) for x in m.groups())
    return dd * 86400 + h * 3600 + mi * 60 + s
