"""Checks: (1) is the API retention curve / AVP on the ENGAGED-view basis? (2) all-viewer funnel = stayed x awr; (3) pauses >= 0.6 s."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(H, '..', '..', 'data', '2026-10-25')
PV = json.load(open(os.path.join(D, 'per_video.json'))); A = json.load(open(os.path.join(H, 'analysis.json')))
SUM = {v['id']: v for v in json.load(open(os.path.join(D, 'summary.json')))['videos']}
res = {}
for vid, o in A.items():
    R = PV[vid]['retention']['rows']; an = SUM[vid]['analytics']; dur = o['duration_file_s']
    mean_awr = sum(r['audienceWatchRatio'] for r in R) / len(R)
    W = json.load(open(os.path.join(H, f'words_{vid}.json')))
    pauses = [(round(a[1], 2), round(b[0], 2), round(b[0] - a[1], 2), a[2] + ' | ' + b[2]) for a, b in zip(W, W[1:]) if b[0] - a[1] >= 0.6]
    st = an['engagedViews'] / an['views']
    def awr(t):
        x = t / dur; best = min(R, key=lambda r: abs(r['elapsedVideoTimeRatio'] - x)); return best['audienceWatchRatio']
    res[vid] = {'name': o['name'], 'mean_awr': round(mean_awr, 3), 'avp': an['averageViewPercentage'],
                'minutes_x60_over_engaged': round(an['estimatedMinutesWatched'] * 60 / an['engagedViews'], 1), 'avd': an['averageViewDuration'],
                'minutes_x60_over_views': round(an['estimatedMinutesWatched'] * 60 / an['views'], 1),
                'replay_proxy_awr0_minus_1': round(R[0]['audienceWatchRatio'] - 1, 3),
                'all_viewers_pct_at': {f'{t}s': round(100 * st * awr(t), 1) for t in [1, 5, 10, 20] if t < dur} | {'end': round(100 * st * R[-1]['audienceWatchRatio'], 1)},
                'pauses_ge_0.6s_first_25s': [p for p in pauses if p[0] < 25], 'n_pauses_ge_0.6s': len(pauses)}
json.dump(res, open(os.path.join(H, 'basis_check.json'), 'w'), indent=1, ensure_ascii=False)
for v in res.values(): print(json.dumps(v, ensure_ascii=False))
