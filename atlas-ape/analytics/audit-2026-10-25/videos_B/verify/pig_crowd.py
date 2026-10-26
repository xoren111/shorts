import sys, json, re, statistics
sys.path.insert(0, '/Users/khorengrigoryan/shorts/tools')
from yt_oauth import get as _get, access_token
import urllib.parse
TOK = access_token()
def get(url, params):
    return _get(url + '?' + urllib.parse.urlencode(params), TOK)
OUT = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/videos_B/verify/pig_crowd.json'
qs = ['pig war', 'america britain almost went to war over a pig']
ids = {}
for q in qs:
    r = get('https://www.googleapis.com/youtube/v3/search', params=dict(part='snippet', q=q, type='video', videoDuration='short', maxResults=50, order='relevance', regionCode='US', relevanceLanguage='en'))
    for it in r.get('items', []):
        ids.setdefault(it['id']['videoId'], set()).add(q)
idl = list(ids)
vids = []
for i in range(0, len(idl), 50):
    r = get('https://www.googleapis.com/youtube/v3/videos', params=dict(part='snippet,statistics,contentDetails', id=','.join(idl[i:i+50])))
    vids += r.get('items', [])
def secs(d):
    m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', d); h, mi, s = (int(x or 0) for x in m.groups()); return h*3600+mi*60+s
rows = []
for v in vids:
    t = v['snippet']['title']; desc = v['snippet'].get('description', '')
    rows.append(dict(id=v['id'], title=t, ch=v['snippet']['channelTitle'], date=v['snippet']['publishedAt'][:10], dur=secs(v['contentDetails']['duration']),
                     views=int(v['statistics'].get('viewCount', 0)), q=sorted(ids[v['id']]),
                     on_topic=bool(re.search(r'pig', (t + ' ' + desc).lower()) and re.search(r'war|britain|british|america|usa|san juan', (t + ' ' + desc).lower()))))
json.dump(rows, open(OUT, 'w'), indent=1, ensure_ascii=False)
on = [r for r in rows if r['on_topic'] and r['dur'] <= 180]
print('total', len(rows), 'on-topic shorts', len(on))
vs = sorted(r['views'] for r in on)
print('median', statistics.median(vs) if vs else None, 'n<=2.5K', sum(v <= 2500 for v in vs), 'n>=50K', sum(v >= 50000 for v in vs))
for r in sorted(on, key=lambda r: -r['views']):
    print(r['date'], r['views'], r['dur'], r['ch'][:22], '|', r['title'][:70])
