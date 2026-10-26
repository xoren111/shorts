"""Independent recompute of videos_A numbers from the raw snapshot (no use of the analyst's analysis.json)."""
import json, os
D = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/data/2026-10-25'
PV = json.load(open(f'{D}/per_video.json'))
SUM = {v['id']: v for v in json.load(open(f'{D}/summary.json'))['videos']}
NAMES = {'yR42PjbnqEo': 'Volcano', 'w52iSlkYlOg': 'Rabbits', 'TD53YW6dqoY': 'YellowFleet', 'Eoxim0DO2g4': 'PigWar', '06A_mm0ZkGw': 'FarmGirl', 'kP_YrKlOel8': 'Conman'}
FILEDUR = {'yR42PjbnqEo': 76.8, 'w52iSlkYlOg': 62.0, 'TD53YW6dqoY': 32.13}
out = {}
for vid, name in NAMES.items():
    s = SUM[vid]; an = s['analytics']; p = PV[vid]
    o = {'name': name, 'published': s['published'], 'data_api_views': s['data_api_views'], 'data_api_likes': s['data_api_likes'], 'data_api_comments': s['data_api_comments']}
    o['daily'] = [(r['day'], r['views'], r['engagedViews'], r['likes'], r['shares'], r['subscribersGained']) for r in p['daily'].get('rows', []) if r['views']]
    if an:
        o['an'] = an
        o['stayed_pct'] = round(100 * an['engagedViews'] / an['views'], 1)
        o['min60_over_engaged'] = round(an['estimatedMinutesWatched'] * 60 / an['engagedViews'], 2)
        o['min60_over_views'] = round(an['estimatedMinutesWatched'] * 60 / an['views'], 2)
        o['likes_per100_dataapi'] = round(100 * s['data_api_likes'] / s['data_api_views'], 2)
        o['likes_per100_analytics'] = round(100 * an['likes'] / an['views'], 2)
        o['dataapi_minus_analytics_views'] = s['data_api_views'] - an['views']
    R = p['retention'].get('rows', [])
    if R:
        dur = FILEDUR.get(vid)
        o['n_ret_rows'] = len(R)
        o['mean_awr'] = round(sum(r['audienceWatchRatio'] for r in R) / len(R), 4)
        o['awr_first'] = R[0]; o['awr_last'] = R[-1]
        rr = [r['relativeRetentionPerformance'] for r in R]
        i_min = rr.index(min(rr)); i_max = rr.index(max(rr))
        o['rel_min'] = (round(min(rr), 3), R[i_min]['elapsedVideoTimeRatio']); o['rel_max'] = (round(max(rr), 3), R[i_max]['elapsedVideoTimeRatio']); o['rel_end'] = rr[-1]
        diffs = [(round(R[i]['audienceWatchRatio'] - R[i + 1]['audienceWatchRatio'], 4), R[i]['elapsedVideoTimeRatio'], R[i + 1]['elapsedVideoTimeRatio']) for i in range(len(R) - 1)]
        o['steepest_bucket_drops'] = sorted(diffs, reverse=True)[:5]
        o['first_bucket_ratio'] = R[0]['elapsedVideoTimeRatio']
        if dur:
            o['curve_t'] = [(round(r['elapsedVideoTimeRatio'] * dur, 2), r['audienceWatchRatio'], r['relativeRetentionPerformance']) for r in R]
    tr = p['traffic'].get('rows', [])
    if tr: o['traffic'] = [(r['insightTrafficSourceType'], r['views'], r['averageViewPercentage']) for r in tr]
    co = p['country'].get('rows', [])
    if co: o['country'] = [(r['country'], r['views'], r['averageViewPercentage']) for r in co[:8]]
    ro = p.get('retention_organic', {}).get('rows', [])
    o['n_ret_organic_rows'] = len(ro)
    if ro and R:
        o['organic_vs_all_first_last'] = (ro[0]['audienceWatchRatio'], R[0]['audienceWatchRatio'], ro[-1]['audienceWatchRatio'], R[-1]['audienceWatchRatio'])
    out[vid] = o
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'recompute.json'), 'w'), indent=1)
for vid, o in out.items():
    print('=====', vid, o['name'], o['published'])
    for k, v in o.items():
        if k in ('curve_t',): continue
        print(' ', k, ':', v)
