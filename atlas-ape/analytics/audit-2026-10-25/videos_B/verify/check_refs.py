import sys, json, re, urllib.parse
sys.path.insert(0, '/Users/khorengrigoryan/shorts/tools')
from yt_oauth import get as _get, access_token
TOK = access_token()
def get(url, params): return _get(url + '?' + urllib.parse.urlencode(params), TOK)
out = {}
for q in ['He Escaped From Prison 4 Times BigDanBabys', 'Bro sold everything to meet AI girlfriend Casterline']:
    r = get('https://www.googleapis.com/youtube/v3/search', dict(part='snippet', q=q, type='video', maxResults=10, regionCode='US'))
    ids = [it['id']['videoId'] for it in r.get('items', [])]
    v = get('https://www.googleapis.com/youtube/v3/videos', dict(part='snippet,statistics,contentDetails', id=','.join(ids)))
    out[q] = [dict(id=x['id'], ch=x['snippet']['channelTitle'], title=x['snippet']['title'], date=x['snippet']['publishedAt'], dur=x['contentDetails']['duration'], views=x['statistics'].get('viewCount')) for x in v.get('items', [])]
    for x in out[q]: print(q[:20], '|', x['date'][:10], x['views'], x['dur'], x['ch'][:22], '|', x['title'][:60])
json.dump(out, open('check_refs.json', 'w'), indent=1, ensure_ascii=False)
