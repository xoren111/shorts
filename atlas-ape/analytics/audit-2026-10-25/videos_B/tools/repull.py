import sys, os, json, urllib.parse, datetime
sys.path.insert(0,'/Users/khorengrigoryan/shorts/tools')
from yt_oauth import access_token, get
AT=access_token()
ANA='https://youtubeanalytics.googleapis.com/v2/reports?'
END=datetime.date.today().isoformat()
def report(metrics, dimensions=None, filters=None, sort=None):
    q={'ids':'channel==MINE','startDate':'2026-10-01','endDate':END,'metrics':metrics}
    if dimensions:q['dimensions']=dimensions
    if filters:q['filters']=filters
    if sort:q['sort']=sort
    r=get(ANA+urllib.parse.urlencode(q),AT)
    if 'columnHeaders' not in r: return {'error':r,'query':q}
    h=[c['name'] for c in r['columnHeaders']]
    return {'query':q,'rows':[dict(zip(h,x)) for x in r.get('rows',[])]}
base='engagedViews,views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,shares,comments,subscribersGained'
out={}
for v in ['Eoxim0DO2g4','06A_mm0ZkGw','kP_YrKlOel8']:
    f=f'video=={v}'
    out[v]={'daily':report(base,'day',f,'day'),
            'retention':report('audienceWatchRatio,relativeRetentionPerformance','elapsedVideoTimeRatio',f),
            'traffic':report('views,averageViewPercentage','insightTrafficSourceType',f,'-views'),
            'country':report('views,averageViewPercentage','country',f,'-views')}
out['channel_daily']=report(base,'day',None,'day')
out['pulled']=datetime.datetime.now().isoformat(timespec='seconds')
json.dump(out,open(sys.argv[1],'w'),indent=1)
for v in ['Eoxim0DO2g4','06A_mm0ZkGw','kP_YrKlOel8']:
    d=out[v]
    print(v,'daily',[ (r['day'],r['views'],r['engagedViews']) for r in d['daily'].get('rows',[]) if r['views']], 'ret rows',len(d['retention'].get('rows',[])), d['retention'].get('error'))
print([(r['day'],r['views']) for r in out['channel_daily'].get('rows',[]) if r['views']])
