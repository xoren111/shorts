"""Sample brand-new channels in the 'weird history / true story' Shorts niche and measure their first 10 Shorts.
Search: order=date (not by views -> no success bias), Shorts published 2026-09-01..2026-10-12 (>=13 d old).
New channel = first public upload on/after 2026-07-01."""
import sys, json, re, time, urllib.parse, collections
sys.path.insert(0,'/Users/khorengrigoryan/shorts/tools')
from yt_oauth import access_token, get
AT=access_token()
API='https://www.googleapis.com/youtube/v3/'
units=0
def g(ep,cost=1,**p):
    global units; units+=cost
    r=get(API+ep+'?'+urllib.parse.urlencode(p),AT)
    if 'error' in r: print('ERR',ep,r['error'].get('message')); 
    return r
def dur(s):
    m=re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?',s or '')
    return (int(m.group(1) or 0)*3600+int(m.group(2) or 0)*60+int(m.group(3) or 0)) if m else 0
Q=['weird history','history shorts','crazy true story','dark history facts','strange history','history you didnt learn in school','absurd history','true story animated']
hits=collections.defaultdict(set)
for q in Q:
    r=g('search',100,part='snippet',q=q,type='video',videoDuration='short',order='date',relevanceLanguage='en',
        publishedAfter='2026-09-01T00:00:00Z',publishedBefore='2026-10-12T00:00:00Z',maxResults=50)
    for it in r.get('items',[]): hits[it['snippet']['channelId']].add(q)
    time.sleep(0.3)
chs=list(hits); print('channels found',len(chs))
info={}
for i in range(0,len(chs),50):
    r=g('channels',part='snippet,statistics,contentDetails',id=','.join(chs[i:i+50]))
    for c in r.get('items',[]): info[c['id']]=c
res=[]
for cid,c in info.items():
    vc=int(c['statistics'].get('videoCount',0))
    if vc==0 or vc>250: continue
    up=c['contentDetails']['relatedPlaylists']['uploads']
    ids=[];tok=None;pages=0
    while pages<5:
        p=dict(part='contentDetails',playlistId=up,maxResults=50)
        if tok:p['pageToken']=tok
        r=g('playlistItems',**p); pages+=1
        ids+=[(x['contentDetails']['videoId'],x['contentDetails'].get('videoPublishedAt','')) for x in r.get('items',[])]
        tok=r.get('nextPageToken')
        if not tok: break
    if tok: continue  # could not reach first uploads
    ids=[x for x in ids if x[1]]
    ids.sort(key=lambda x:x[1])
    if not ids or ids[0][1]<'2026-07-01': continue
    first=ids[:25]
    r=g('videos',part='contentDetails,statistics,snippet',id=','.join(i for i,_ in first))
    vids=[]
    for v in r.get('items',[]):
        d=dur(v['contentDetails']['duration'])
        vids.append({'id':v['id'],'pub':v['snippet']['publishedAt'],'dur':d,'views':int(v['statistics'].get('viewCount',0)),'title':v['snippet']['title'][:90],
                     'lang':v['snippet'].get('defaultAudioLanguage') or v['snippet'].get('defaultLanguage')})
    vids.sort(key=lambda v:v['pub'])
    shorts=[v for v in vids if v['dur']<=180][:10]
    if not shorts: continue
    res.append({'channel':c['snippet']['title'],'id':cid,'created':c['snippet']['publishedAt'][:10],'first_upload':ids[0][1][:10],'subs':int(c['statistics'].get('subscriberCount',0)),
                'total_views':int(c['statistics'].get('viewCount',0)),'videoCount':vc,'queries':sorted(hits[cid]),'first_shorts':shorts})
json.dump({'units_used':units,'queries':Q,'window':'2026-09-01..2026-10-12','channels':res},open('raw/newcomers.json','w'),indent=1,ensure_ascii=False)
print('units',units,'new channels',len(res))
