#!/usr/bin/env python3
"""Full read-only snapshot of the ATLAS APE channel via YouTube Data + Analytics APIs.

  pull.py [out_dir]   — default atlas-ape/analytics/data/<today>/
Writes one JSON per report (channel, videos, comments, lifetime, daily, retention, traffic, geo, demo, ...)
plus summary.json. Uses the refresh token of tools/yt_oauth.py (scopes youtube.readonly + yt-analytics.readonly).
Analytics lags 1–3 days behind Data API counters; both are stored so the gap is visible.
"""
import datetime, json, os, sys, urllib.parse

sys.path.insert(0, os.path.expanduser('~/shorts/tools'))
from yt_oauth import access_token, get  # noqa: E402

TODAY = datetime.date.today()
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(f'~/shorts/atlas-ape/analytics/data/{TODAY}')
START = '2026-10-01'  # channel's first upload is 19.10.2026
END = TODAY.isoformat()
AT = access_token()
DATA = 'https://www.googleapis.com/youtube/v3/'
ANA = 'https://youtubeanalytics.googleapis.com/v2/reports?'


def save(name, obj):
    with open(f'{OUT}/{name}.json', 'w') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def data(path, **q):
    return get(DATA + path + '?' + urllib.parse.urlencode(q), AT)


def report(metrics, dimensions=None, filters=None, sort=None, max_results=None, start=START):
    q = {'ids': 'channel==MINE', 'startDate': start, 'endDate': END, 'metrics': metrics}
    if dimensions: q['dimensions'] = dimensions
    if filters: q['filters'] = filters
    if sort: q['sort'] = sort
    if max_results: q['maxResults'] = max_results
    r = get(ANA + urllib.parse.urlencode(q), AT)
    if 'rows' not in r and 'columnHeaders' not in r:
        return {'error': r, 'query': q}
    heads = [h['name'] for h in r['columnHeaders']]
    return {'query': q, 'rows': [dict(zip(heads, row)) for row in r.get('rows', [])]}


def first_ok(variants, **kw):
    """Some metrics (engagedViews, ...) are not accepted everywhere — try richer metric sets first."""
    for m in variants:
        r = report(m, **kw)
        if 'error' not in r:
            return r
    return r


os.makedirs(OUT, exist_ok=True)

# --- Data API -------------------------------------------------------------------------------
ch = data('channels', part='snippet,statistics,brandingSettings,contentDetails,status,topicDetails', mine='true')
save('channel', ch)
uploads = ch['items'][0]['contentDetails']['relatedPlaylists']['uploads']
ids, tok = [], None
while True:
    pl = data('playlistItems', part='contentDetails', playlistId=uploads, maxResults=50, **({'pageToken': tok} if tok else {}))
    ids += [i['contentDetails']['videoId'] for i in pl.get('items', [])]
    tok = pl.get('nextPageToken')
    if not tok:
        break
vids = data('videos', part='snippet,contentDetails,statistics,status,topicDetails', id=','.join(ids))
save('videos', vids)
comments = {}
for v in ids:
    c = data('commentThreads', part='snippet,replies', videoId=v, maxResults=100, order='time')
    comments[v] = [{'author': t['snippet']['topLevelComment']['snippet'].get('authorDisplayName'),
                    'text': t['snippet']['topLevelComment']['snippet'].get('textOriginal'),
                    'likes': t['snippet']['topLevelComment']['snippet'].get('likeCount'),
                    'published': t['snippet']['topLevelComment']['snippet'].get('publishedAt'),
                    'replies': [r['snippet'].get('textOriginal') for r in t.get('replies', {}).get('comments', [])]}
                   for t in c.get('items', [])] if 'items' in c else c
save('comments', comments)

# --- Analytics API --------------------------------------------------------------------------
base = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,shares,comments,subscribersGained,subscribersLost'
save('lifetime_by_video', first_ok([f'engagedViews,{base}', base], dimensions='video', sort='-views', max_results=200))
save('channel_daily', first_ok([f'engagedViews,{base}', base], dimensions='day', sort='day'))
save('content_type', report('views,estimatedMinutesWatched,averageViewPercentage', dimensions='creatorContentType'))
save('traffic_channel', report('views,estimatedMinutesWatched,averageViewPercentage', dimensions='insightTrafficSourceType', sort='-views'))
save('country_channel', report('views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage', dimensions='country', sort='-views', max_results=50))
save('demographics', report('viewerPercentage', dimensions='ageGroup,gender'))
save('subscribed_status', report('views,averageViewPercentage,averageViewDuration', dimensions='subscribedStatus'))
save('device', report('views,averageViewPercentage', dimensions='deviceType'))
save('os', report('views', dimensions='operatingSystem', sort='-views'))
save('sharing', report('shares', dimensions='sharingService', sort='-shares'))

per = {}
for v in ids:
    f = f'video=={v}'
    per[v] = {
        'daily': first_ok([f'engagedViews,{base}', base], dimensions='day', filters=f, sort='day'),
        'retention': report('audienceWatchRatio,relativeRetentionPerformance', dimensions='elapsedVideoTimeRatio', filters=f),
        'retention_organic': report('audienceWatchRatio,relativeRetentionPerformance', dimensions='elapsedVideoTimeRatio',
                                    filters=f + ';audienceType==ORGANIC'),
        'traffic': report('views,averageViewPercentage', dimensions='insightTrafficSourceType', filters=f, sort='-views'),
        'country': report('views,averageViewPercentage', dimensions='country', filters=f, sort='-views', max_results=15),
        'demographics': report('viewerPercentage', dimensions='ageGroup,gender', filters=f),
        'subscribed': report('views,averageViewPercentage', dimensions='subscribedStatus', filters=f),
    }
save('per_video', per)

# --- summary ---------------------------------------------------------------------------------
life = {r['video']: r for r in json.load(open(f'{OUT}/lifetime_by_video.json')).get('rows', [])}
rows = []
for it in vids['items']:
    v, s, st = it['id'], it['snippet'], it['statistics']
    a = life.get(v, {})
    rows.append({'id': v, 'title': s['title'], 'published': s['publishedAt'], 'duration': it['contentDetails']['duration'],
                 'data_api_views': int(st.get('viewCount', 0)), 'data_api_likes': int(st.get('likeCount', 0)),
                 'data_api_comments': int(st.get('commentCount', 0)), 'analytics': a})
rows.sort(key=lambda r: r['published'])
save('summary', {'pulled': datetime.datetime.now().isoformat(timespec='seconds'), 'range': [START, END],
                 'channel': {k: ch['items'][0]['statistics'].get(k) for k in ('subscriberCount', 'viewCount', 'videoCount')},
                 'videos': rows})
for r in rows:
    a = r['analytics']
    print(f"{r['published'][:16]} {r['id']} {r['duration']:>8} data={r['data_api_views']:>5} "
          f"ana={a.get('views', '-'):>5} eng={a.get('engagedViews', '-'):>5} avp={a.get('averageViewPercentage', '-')} "
          f"shares={a.get('shares', '-')} | {r['title'][:60]}")
print('saved to', OUT)
