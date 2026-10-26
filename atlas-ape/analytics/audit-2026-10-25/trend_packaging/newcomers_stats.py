import json, statistics as st, re
d=json.load(open('raw/newcomers.json'))
CUT='2026-10-18'  # Short must be >=7 days old at 2026-10-25
EMO=re.compile('[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200d]')
def is_en(v):
    if v.get('lang'): return v['lang'].lower().startswith('en')
    t=EMO.sub('',v['title']); return sum(ch.isascii() or ch in '…’“”—–' for ch in t)/max(1,len(t))>0.97
rows=[]
for c in d['channels']:
    s=[v for v in c['first_shorts'] if v['pub'][:10]<=CUT]
    if len(s)<3: continue
    en=sum(is_en(v) for v in s)/len(s)>=0.7
    first6=s[:6]
    rows.append({'ch':c['channel'],'subs':c['subs'],'n':len(s),'en':en,'first_upload':c['first_upload'],
      'max6':max(v['views'] for v in first6),'med6':st.median(v['views'] for v in first6),
      'max10':max(v['views'] for v in s),'med10':st.median(v['views'] for v in s),
      'n10k':sum(v['views']>=10000 for v in s),'views':[v['views'] for v in s],'durs':[v['dur'] for v in s]})
def summary(rs,label):
    n=len(rs)
    if not n: return {}
    allv=[x for r in rs for x in r['views']]
    out={'label':label,'channels':n,'shorts':len(allv),
      'pct_channels_any_first10_ge_10k':round(100*sum(r['max10']>=1e4 for r in rs)/n,1),
      'pct_channels_any_first10_ge_100k':round(100*sum(r['max10']>=1e5 for r in rs)/n,1),
      'pct_channels_any_first10_ge_1m':round(100*sum(r['max10']>=1e6 for r in rs)/n,1),
      'pct_channels_any_first6_ge_10k':round(100*sum(r['max6']>=1e4 for r in rs)/n,1),
      'pct_shorts_ge_10k':round(100*sum(v>=1e4 for v in allv)/len(allv),1),
      'pct_shorts_ge_100k':round(100*sum(v>=1e5 for v in allv)/len(allv),1),
      'pct_shorts_ge_1m':round(100*sum(v>=1e6 for v in allv)/len(allv),2),
      'median_short_views':st.median(allv),
      'median_of_channel_median6':st.median(r['med6'] for r in rs),
      'median_of_channel_max6':st.median(r['max6'] for r in rs),
      'p75_channel_max6':sorted(r['max6'] for r in rs)[int(0.75*n)],
      'p90_channel_max6':sorted(r['max6'] for r in rs)[int(0.9*n)],
      'ours_med6':st.median([663,1154,2312,1407,125,1174]),'ours_max6':2312}
    out['ours_max6_percentile']=round(100*sum(r['max6']<2312 for r in rs)/n,1)
    out['ours_med6_percentile']=round(100*sum(r['med6']<out['ours_med6'] for r in rs)/n,1)
    return out
S=[summary(rows,'all new channels (first upload >= 2026-07-01), Shorts >= 7 d old'),
   summary([r for r in rows if r['en']],'English-title subset'),
   summary([r for r in rows if r['en'] and r['n']>=6],'English, >=6 Shorts aged >=7 d')]
for s in S: print(json.dumps(s,indent=1))
top=sorted(rows,key=lambda r:-r['max10'])[:15]
for r in top: print(r['ch'][:30],r['subs'],r['first_upload'],r['n'],r['max10'],r['med10'],r['views'][:10])
json.dump({'summaries':S,'rows':rows},open('newcomers_stats.json','w'),indent=1,ensure_ascii=False)
