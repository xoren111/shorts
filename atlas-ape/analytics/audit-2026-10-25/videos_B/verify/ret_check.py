import json
D='/Users/khorengrigoryan/shorts/atlas-ape/analytics/data/2026-10-25/'
pv=json.load(open(D+'per_video.json'))
summ={v['id']:v for v in json.load(open(D+'summary.json'))['videos']}
dur={'yR42PjbnqEo':76.8,'w52iSlkYlOg':62.0,'TD53YW6dqoY':32.13,'Eoxim0DO2g4':41.37}
out={}
for vid,d in dur.items():
    rows=pv[vid]['retention']['rows']; org=pv[vid]['retention_organic']['rows']
    aw=[r['audienceWatchRatio'] for r in rows]; rel=[r['relativeRetentionPerformance'] for r in rows]
    relo=[r['relativeRetentionPerformance'] for r in org]; awo=[r['audienceWatchRatio'] for r in org]
    a=summ[vid]['analytics']
    def at(t):
        # awr at absolute time t (nearest ratio point)
        i=min(range(len(rows)),key=lambda j:abs(rows[j]['elapsedVideoTimeRatio']*d-t)); return aw[i]
    tot=aw[0]-aw[-1]
    o={'dur':d,'awr_first':round(aw[0],3),'awr_end':round(aw[-1],3),'mean_awr':round(sum(aw)/len(aw),4),'AVP_api':a['averageViewPercentage'],
       'engaged_pct':round(100*a['engagedViews']/a['views'],1),'rel_mean':round(sum(rel)/len(rel),3),'rel_org_mean':round(sum(relo)/len(relo),3),
       'rel_min':round(min(rel),3),'rel_first':round(rel[0],3),'rel_end':round(rel[-1],3),
       'awr_org_first':round(awo[0],3),'awr_org_end':round(awo[-1],3),
       'awr_0':round(at(0),3),'awr_3':round(at(3),3),'awr_4':round(at(4),3),'awr_7':round(at(7),3),'awr_10':round(at(10),3),
       'loss_4_7':round(at(4)-at(7),3),'loss_4_7_share':round(100*(at(4)-at(7))/tot,1),'loss_0_3':round(at(0)-at(3),3),
       'loss_0_10_share':round(100*(aw[0]-at(10))/tot,1),
       'loss_last3s':round(at(d-3)-aw[-1],3),'loss_last3s_share':round(100*(at(d-3)-aw[-1])/tot,1)}
    # body rate 10..d-4
    o['body_rate_per_s']=round((at(10)-at(d-4))/(d-14),4)
    o['rate_4_7_per_s']=round((at(4)-at(7))/3,4)
    out[vid]=o
    print(vid,json.dumps(o))
json.dump(out,open('/Users/khorengrigoryan/shorts/atlas-ape/analytics/audit-2026-10-25/videos_B/verify/ret_check.json','w'),indent=1)
