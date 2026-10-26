"""Verifier: independent Data API checks (read-only). Logs units to verify/quota_verify.txt"""
import json, sys, urllib.parse, re, datetime as dt
sys.path.insert(0, '/Users/khorengrigoryan/shorts/tools')
from yt_oauth import access_token, get
D = 'https://www.googleapis.com/youtube/v3/'
OUT = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/niche_saturation/verify/'
AT = access_token()
LOG = open(OUT + 'quota_verify.txt', 'a')
def call(path, units, **q):
    r = get(D + path + '?' + urllib.parse.urlencode(q), AT)
    LOG.write(f'{path} {units}u {q.get("q","")} {r.get("http_status","ok")}\n'); LOG.flush()
    return r
def secs(d):
    m = re.match(r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', d or '')
    D_, H, M, S = (int(x or 0) for x in m.groups()); return D_*86400+H*3600+M*60+S
def videos(ids):
    out = {}
    for k in range(0, len(ids), 50):
        r = call('videos', 1, part='snippet,statistics,contentDetails', id=','.join(ids[k:k+50]))
        for it in r.get('items', []):
            out[it['id']] = {'id': it['id'], 'title': it['snippet']['title'], 'ch': it['snippet']['channelTitle'], 'cid': it['snippet']['channelId'],
                             'pub': it['snippet']['publishedAt'], 'views': int(it['statistics'].get('viewCount', 0)), 'secs': secs(it['contentDetails']['duration']),
                             'lang': it['snippet'].get('defaultAudioLanguage')}
    return out
def channels(ids):
    out = {}
    ids = list(dict.fromkeys(ids))
    for k in range(0, len(ids), 50):
        r = call('channels', 1, part='snippet,statistics', id=','.join(ids[k:k+50]))
        for it in r.get('items', []):
            out[it['id']] = {'title': it['snippet']['title'], 'created': it['snippet']['publishedAt'][:10], 'subs': int(it['statistics'].get('subscriberCount', 0) or 0)}
    return out
def uploads(cid, pages=3):
    ids, tok = [], None
    for _ in range(pages):
        q = dict(part='contentDetails', playlistId='UU' + cid[2:], maxResults=50)
        if tok: q['pageToken'] = tok
        r = call('playlistItems', 1, **q)
        ids += [it['contentDetails']['videoId'] for it in r.get('items', [])]
        tok = r.get('nextPageToken')
        if not tok: break
    return ids
def search(q, after, before, region='US', lang='en'):
    return call('search', 100, part='snippet', q=q, type='video', videoDuration='short', order='viewCount', maxResults=50,
                publishedAfter=after, publishedBefore=before, regionCode=region, relevanceLanguage=lang)
