import json, datetime as dt
SNAP='/Users/khorengrigoryan/shorts/atlas-ape/analytics/data/2026-10-25/'
S=json.load(open(SNAP+'summary.json')); P=json.load(open(SNAP+'per_video.json'))
NOW=dt.datetime(2026,10,25,7,45,tzinfo=dt.timezone.utc)
NAME={'yR42PjbnqEo':'Volcano','w52iSlkYlOg':'Rabbits','TD53YW6dqoY':'Yellow Fleet','Eoxim0DO2g4':'Pig War','06A_mm0ZkGw':'Farm girl','kP_YrKlOel8':'Russell'}
# earlier known points (Studio screenshots / memory files): (hours, views)
KNOWN={'yR42PjbnqEo':[(48,544)],'w52iSlkYlOg':[(10,291)],'TD53YW6dqoY':[(9,1113)],'Eoxim0DO2g4':[(14,1200)],'06A_mm0ZkGw':[(18,85)],'kP_YrKlOel8':[]}
STAYED={'yR42PjbnqEo':57.6,'w52iSlkYlOg':62.6,'TD53YW6dqoY':42.8,'Eoxim0DO2g4':54.1,'06A_mm0ZkGw':39.5,'kP_YrKlOel8':None}
PT=dt.timezone(dt.timedelta(hours=-7))
rows=[]
for v in S['videos']:
    vid=v['id']; pub=dt.datetime.fromisoformat(v['published'].replace('Z','+00:00'))
    age=(NOW-pub).total_seconds()/3600
    dur=int(v['duration'].replace('PT','').replace('S','').split('M')[-1])+ (60 if 'M' in v['duration'] else 0)
    a=v['analytics']; daily=[r for r in P[vid]['daily']['rows'] if r['views']>0]
    pub_pt=pub.astimezone(PT); end_day1=dt.datetime(pub_pt.year,pub_pt.month,pub_pt.day,tzinfo=PT)+dt.timedelta(days=1)
    h_day1=(end_day1-pub_pt).total_seconds()/3600
    ret=P[vid]['retention']['rows']
    def at(sec):
        if not ret: return None
        x=min(1.0,max(0.01,round(sec/dur,2)))
        r=min(ret,key=lambda r:abs(r['elapsedVideoTimeRatio']-x)); return round(r['audienceWatchRatio']*100,1)
    def rrp(lo,hi):
        if not ret: return None
        xs=[r['relativeRetentionPerformance'] for r in ret if lo<=r['elapsedVideoTimeRatio']<=hi]; return round(sum(xs)/len(xs),2)
    an_views=a.get('views')
    rows.append({'n':len(rows)+1,'video':NAME[vid],'id':vid,'published_utc':v['published'],'published_PT':pub_pt.strftime('%a %H:%M'),
      'dur_s':dur,'age_h':round(age,1),'views_now':v['data_api_views'],
      'views_first_PT_day':daily[0]['views'] if daily else None,'first_PT_day_hours':round(h_day1,1),
      'daily_PT':[(r['day'][5:],r['views']) for r in daily],'known_points':KNOWN[vid],
      'analytics_views_to_22_10':an_views,'views_after_analytics_window':(v['data_api_views']-an_views) if an_views else None,
      'engaged_ratio_pct':round(100*a['engagedViews']/a['views'],1) if a else None,'studio_stayed_pct':STAYED[vid],
      'AVD_s':a.get('averageViewDuration'),'AVP_pct':a.get('averageViewPercentage'),
      'likes_per_1k':round(1000*v['data_api_likes']/v['data_api_views'],1),'likes':v['data_api_likes'],'comments':v['data_api_comments'],
      'shares':a.get('shares'),'subs_gained':a.get('subscribersGained'),
      'ret_1s':at(1),'ret_3s':at(3),'ret_5s':at(5),'ret_10s':at(10),'ret_end':round(ret[-1]['audienceWatchRatio']*100,1) if ret else None,
      'RRP_10_30pct':rrp(0.10,0.30),'RRP_80_100pct':rrp(0.80,1.0),
      'feed_share_pct':round(100*sum(r['views'] for r in P[vid]['traffic']['rows'] if r['insightTrafficSourceType']=='SHORTS')/an_views,1) if an_views else None,
      'top_country':(P[vid]['country']['rows'][0]['country'],round(100*P[vid]['country']['rows'][0]['views']/an_views,1)) if P[vid]['country']['rows'] else None})
json.dump(rows,open('trajectory.json','w'),indent=1)
for r in rows: print(json.dumps(r))
