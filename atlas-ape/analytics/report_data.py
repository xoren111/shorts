#!/usr/bin/env python3
"""Flatten an API snapshot (pull.py output) into CSVs for the audit dashboard.

  report_data.py SNAPSHOT_DIR OUT_DIR
"""
import csv, datetime, json, os, re, sys

SNAP, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SHORT = {'yR42PjbnqEo': 'Volcano', 'w52iSlkYlOg': 'Rabbits', 'TD53YW6dqoY': 'Yellow Fleet',
         'Eoxim0DO2g4': 'Pig War', '06A_mm0ZkGw': 'Farm girl', 'kP_YrKlOel8': 'Russell'}


def load(name):
    return json.load(open(f'{SNAP}/{name}.json'))


def write(name, rows):
    with open(f'{OUT}/{name}.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


def secs(iso):
    m = re.match(r'PT(?:(\d+)M)?(?:(\d+)S)?', iso)
    return int(m[1] or 0) * 60 + int(m[2] or 0)


s = load('summary')
pulled = datetime.datetime.fromisoformat(s['pulled']).astimezone(datetime.timezone.utc)
pv = load('per_video')
videos = []
for i, v in enumerate(s['videos'], 1):
    a, dur = v['analytics'], secs(v['duration'])
    age = (pulled - datetime.datetime.fromisoformat(v['published'].replace('Z', '+00:00'))).total_seconds() / 3600
    av = a.get('views')
    videos.append({
        'n': i, 'video': SHORT[v['id']], 'id': v['id'], 'title': v['title'], 'published_utc': v['published'][:16].replace('T', ' '),
        'duration_s': dur, 'age_h': round(age, 1), 'views_now': v['data_api_views'], 'likes_now': v['data_api_likes'],
        'comments_now': v['data_api_comments'],
        'views_per_h': round(v['data_api_views'] / age, 1),
        'ana_views': av if av is not None else '', 'engaged_views': a.get('engagedViews', ''),
        'engaged_pct': round(100 * a['engagedViews'] / av, 1) if av else '',
        'avg_view_pct': round(a['averageViewPercentage'], 1) if av else '',
        'avg_view_s': a.get('averageViewDuration', ''),
        'likes_per_1k': round(1000 * v['data_api_likes'] / v['data_api_views'], 1) if v['data_api_views'] else '',
        'shares': a.get('shares', ''), 'subs_gained': a.get('subscribersGained', ''),
    })
write('videos', videos)

ret = []
for v in s['videos']:
    dur = secs(v['duration'])
    for r in pv[v['id']]['retention'].get('rows', []):
        ret.append({'video': SHORT[v['id']], 't_s': round(r['elapsedVideoTimeRatio'] * dur, 2),
                    'ratio': r['elapsedVideoTimeRatio'], 'watch_pct': round(100 * r['audienceWatchRatio'], 1),
                    'relative': round(r['relativeRetentionPerformance'], 3)})
write('retention', ret)

write('channel_daily', [{'day': r['day'], 'views': r['views'], 'engaged_views': r['engagedViews'], 'likes': r['likes']}
                        for r in load('channel_daily')['rows'] if r['day'] >= '2026-10-19'])
write('countries', [{'country': r['country'], 'views': r['views'], 'avg_view_pct': round(r['averageViewPercentage'], 1)}
                    for r in load('country_channel')['rows'][:10]])
demo = {}
for r in load('demographics')['rows']:
    d = demo.setdefault(r['ageGroup'].replace('age', ''), {'age': r['ageGroup'].replace('age', ''), 'male': 0.0, 'female': 0.0})
    d[r['gender']] = r['viewerPercentage']
write('demographics', list(demo.values()))
write('traffic', [{'source': r['insightTrafficSourceType'], 'views': r['views']} for r in load('traffic_channel')['rows'] if r['views']])
print('wrote', OUT, len(videos), 'videos', len(ret), 'retention points')
