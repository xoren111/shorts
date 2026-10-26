import sys, json, re, urllib.parse
sys.path.insert(0, '/Users/khorengrigoryan/shorts/tools')
import yt_oauth as Y
at = Y.access_token()
API = 'https://www.googleapis.com/youtube/v3/'
def g(ep, **p):
    return Y.get(API + ep + '?' + urllib.parse.urlencode(p), at)
def dur(s):
    m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', s or '')
    return (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)) if m else 0
Q = [('prison escape', {}), ('escaped prison', {}), ('walked out of prison', {}), ('prison escape true story', {}),
     ('Steven Russell', {}), ('Steven Jay Russell', {}), ('I Love You Phillip Morris true story', {}), ('con man escaped prison', {}),
     ('faked his own death', {}), ('escaped prison disguised', {}), ('prison break real life', {}), ('genius prison escape', {})]
seen = {}
for q, extra in Q:
    r = g('search', part='id', q=q, type='video', videoDuration='short', order='viewCount', maxResults=50, **extra)
    if 'error' in r: print('ERR', q, r['error'].get('message')); continue
    for it in r.get('items', []):
        seen.setdefault(it['id']['videoId'], set()).add(q)
ids = list(seen)
rows = []
for i in range(0, len(ids), 50):
    r = g('videos', part='snippet,statistics,contentDetails', id=','.join(ids[i:i + 50]))
    for v in r.get('items', []):
        d = dur(v['contentDetails']['duration'])
        if d > 180: continue
        rows.append({'id': v['id'], 'title': v['snippet']['title'], 'ch': v['snippet']['channelTitle'], 'chid': v['snippet']['channelId'],
                     'views': int(v['statistics'].get('viewCount', 0)), 'likes': int(v['statistics'].get('likeCount', 0) or 0),
                     'comments': int(v['statistics'].get('commentCount', 0) or 0), 'dur': d, 'date': v['snippet']['publishedAt'][:10],
                     'lang': v['snippet'].get('defaultAudioLanguage') or v['snippet'].get('defaultLanguage') or '', 'q': sorted(seen[v['id']]),
                     'tags': v['snippet'].get('tags', [])[:15], 'desc': v['snippet'].get('description', '')[:300]})
chs = list({r['chid'] for r in rows})
subs = {}
for i in range(0, len(chs), 50):
    r = g('channels', part='statistics', id=','.join(chs[i:i + 50]))
    for c in r.get('items', []):
        subs[c['id']] = int(c['statistics'].get('subscriberCount', 0) or 0)
for r in rows: r['subs'] = subs.get(r['chid'], 0)
rows.sort(key=lambda r: -r['views'])
json.dump(rows, open('shorts_titles.json', 'w'), ensure_ascii=False, indent=1)
print(len(rows), 'shorts')
for r in rows[:70]:
    print(f"{r['views']/1e6:7.2f}M  subs {r['subs']/1e6:6.2f}M  {r['dur']:3d}s  {r['date']}  {r['lang'][:5]:5}  {r['title'][:95]}")
