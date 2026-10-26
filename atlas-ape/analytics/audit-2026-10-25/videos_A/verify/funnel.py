"""All-views funnel (stayed x awr) incl. Pig War, likes per engaged view, length vs stayed, loop excess per finisher."""
import json
D = '/Users/khorengrigoryan/shorts/atlas-ape/analytics/data/2026-10-25'
PV = json.load(open(f'{D}/per_video.json')); SUM = {v['id']: v for v in json.load(open(f'{D}/summary.json'))['videos']}
V = {'yR42PjbnqEo': ('Volcano', 76.8), 'w52iSlkYlOg': ('Rabbits', 62.0), 'TD53YW6dqoY': ('YellowFleet', 32.13), 'Eoxim0DO2g4': ('PigWar', 41.37)}
res = {}
for vid, (n, dur) in V.items():
    R = PV[vid]['retention']['rows']; an = SUM[vid]['analytics']; st = an['engagedViews'] / an['views']
    def awr(t):
        pts = [(r['elapsedVideoTimeRatio'] * dur, r['audienceWatchRatio']) for r in R]
        if t <= pts[0][0]: return pts[0][1]
        for (t0, a0), (t1, a1) in zip(pts, pts[1:]):
            if t0 <= t <= t1: return a0 + (a1 - a0) * (t - t0) / (t1 - t0)
        return pts[-1][1]
    res[n] = {'len_s': dur, 'stayed_pct': round(100 * st, 1),
              'per100_views_at': {f'{t}s': round(100 * st * awr(t), 1) for t in (5, 10, 20)} | {'end': round(100 * st * R[-1]['audienceWatchRatio'], 1)},
              'watch_s_per_view': round(an['estimatedMinutesWatched'] * 60 / an['views'], 1),
              'likes_per100_engaged_analytics': round(100 * an['likes'] / an['engagedViews'], 2),
              'loop_excess_at_1pct': round(R[0]['audienceWatchRatio'] - 1, 3), 'awr_at_99pct': R[-2]['audienceWatchRatio'],
              'loop_excess_per_finisher': round((R[0]['audienceWatchRatio'] - 1) / R[-2]['audienceWatchRatio'], 2),
              'first_play_stayed_if_excess_are_restart_views_pct': round(100 * an['engagedViews'] / (an['views'] - (R[0]['audienceWatchRatio'] - 1) * an['engagedViews']), 1),
              'rel_ret_at': {f'{t}s': round(next(r['relativeRetentionPerformance'] for r in R if r['elapsedVideoTimeRatio'] * dur >= t), 3) for t in (1, 3, 5, 10, 20)}}
json.dump(res, open('funnel.json', 'w'), indent=1)
for k, v in res.items(): print(k, json.dumps(v))
