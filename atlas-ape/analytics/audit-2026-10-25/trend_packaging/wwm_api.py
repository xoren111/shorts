import sys, json, re, urllib.parse
sys.path.insert(0,'/Users/khorengrigoryan/shorts/tools')
from yt_oauth import access_token, get
AT=access_token()
API='https://www.googleapis.com/youtube/v3/'
def g(ep,**p): return get(API+ep+'?'+urllib.parse.urlencode(p),AT)
def dur(s):
    m=re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?',s or '')
    return (int(m.group(1) or 0)*3600+int(m.group(2) or 0)*60+int(m.group(3) or 0)) if m else 0
CH='UCdHJ0uWdPkqHaevYJ6u6jng'
c=g('channels',part='snippet,statistics,contentDetails,brandingSettings',id=CH)
up=c['items'][0]['contentDetails']['relatedPlaylists']['uploads']
ids=[];tok=None
while True:
    p=dict(part='contentDetails',playlistId=up,maxResults=50)
    if tok:p['pageToken']=tok
    r=g('playlistItems',**p)
    ids+= [i['contentDetails']['videoId'] for i in r.get('items',[])]
    tok=r.get('nextPageToken')
    if not tok: break
shorts=set(l.split('|')[0] for l in open('raw/wwm_shorts_flat.txt'))
rows=[]
for i in range(0,len(ids),50):
    r=g('videos',part='snippet,statistics,contentDetails',id=','.join(ids[i:i+50]))
    for v in r['items']:
        rows.append({'id':v['id'],'title':v['snippet']['title'],'published':v['snippet']['publishedAt'],'dur':dur(v['contentDetails']['duration']),
          'views':int(v['statistics'].get('viewCount',0)),'likes':int(v['statistics'].get('likeCount',0) or 0),'comments':int(v['statistics'].get('commentCount',0) or 0),
          'is_short_tab': v['id'] in shorts,'lang':v['snippet'].get('defaultAudioLanguage')})
rows.sort(key=lambda r:r['published'])
json.dump({'channel':c['items'][0],'videos':rows},open('raw/wwm_api.json','w'),indent=1,ensure_ascii=False)
st=c['items'][0]['statistics']; print('channel',c['items'][0]['snippet']['title'],c['items'][0]['snippet']['publishedAt'],st)
for r in rows: print(f"{r['published'][:16]} {'S' if r['is_short_tab'] else 'L'} {r['dur']:5d}s {r['views']:8d} {r['likes']:6d} {r['comments']:5d} {r['title'][:80]}")
