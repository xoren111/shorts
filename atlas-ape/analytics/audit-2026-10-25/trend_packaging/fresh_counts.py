import sys, json, datetime, urllib.parse
sys.path.insert(0,'/Users/khorengrigoryan/shorts/tools')
from yt_oauth import access_token, get
AT=access_token()
API='https://www.googleapis.com/youtube/v3/'
def g(ep,**p): return get(API+ep+'?'+urllib.parse.urlencode(p),AT)
ids='yR42PjbnqEo,w52iSlkYlOg,TD53YW6dqoY,Eoxim0DO2g4,06A_mm0ZkGw,kP_YrKlOel8'
now=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
v=g('videos',part='statistics,snippet',id=ids)
c=g('channels',part='statistics,brandingSettings,snippet',id='UC-RPPsO5Z_GwO8D4d6-pQJw')
pl=g('playlists',part='snippet,contentDetails',channelId='UC-RPPsO5Z_GwO8D4d6-pQJw',maxResults=50)
out={'pulled_utc':now,'videos':[{'id':i['id'],'title':i['snippet']['title'],'publishedAt':i['snippet']['publishedAt'],**i['statistics']} for i in v.get('items',[])],
     'channel':c.get('items',[{}])[0].get('statistics'),'branding':c.get('items',[{}])[0].get('brandingSettings'),'playlists':pl}
json.dump(out,open(f'raw/fresh_counts_{now[:16].replace(":","")}.json','w'),indent=1,ensure_ascii=False)
print(json.dumps(out,indent=1,ensure_ascii=False))
