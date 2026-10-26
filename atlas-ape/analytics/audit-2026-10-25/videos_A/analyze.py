"""videos_A audit: map API retention drops to words + motion of the uploaded file.
Inputs: ../../data/2026-10-25/{per_video,summary}.json, measure_<id>.json, words_<id>.json (whisper on the downloaded upload).
Output: analysis.json + prints tables."""
import json, os, math
H = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(H, '..', '..', 'data', '2026-10-25')
PV = json.load(open(os.path.join(D, 'per_video.json')))
SUM = {v['id']: v for v in json.load(open(os.path.join(D, 'summary.json')))['videos']}
VIDS = {'yR42PjbnqEo': 'Volcano', 'w52iSlkYlOg': 'Rabbits', 'TD53YW6dqoY': 'YellowFleet'}
REF = {'viral': {'m01': 23.6, 'wps': 3.26, 'cuts10': 3.6, 'm16': (11, 16)}, 'flop': {'m01': 10.3, 'wps': 2.91, 'cuts10': 2.0}}
out = {}
for vid, name in VIDS.items():
    m = json.load(open(os.path.join(H, f'measure_{vid}.json')))
    W = json.load(open(os.path.join(H, f'words_{vid}.json')))
    dur = m['duration']
    R = [(r['elapsedVideoTimeRatio'] * dur, r['audienceWatchRatio'], r['relativeRetentionPerformance']) for r in PV[vid]['retention']['rows']]
    def awr_at(t):
        if t <= R[0][0]: return R[0][1]
        for (t0, a0, _), (t1, a1, _) in zip(R, R[1:]):
            if t0 <= t <= t1: return a0 + (a1 - a0) * (t - t0) / (t1 - t0)
        return R[-1][1]
    def words_in(a, b):
        return ' '.join(w[2] for w in W if w[1] > a and w[0] < b)
    # per-second loss (in units of the start level of the stayed audience)
    secs = []
    for s in range(int(dur)):
        a0, a1 = awr_at(s + 0.0001 if s else R[0][0]), awr_at(min(s + 1, dur))
        secs.append({'s': s, 'awr_start': round(a0, 3), 'loss': round(a0 - a1, 3), 'motion': m['motion_per_sec'][s] if s < len(m['motion_per_sec']) else None,
                     'words': words_in(s, s + 1)})
    # 2-s windows: biggest losses
    win = []
    for s in range(int(dur) - 1):
        a0, a1 = awr_at(max(s, R[0][0])), awr_at(min(s + 2, dur))
        win.append((round(a0 - a1, 3), s, s + 2))
    win.sort(reverse=True)
    picked = []
    for l, a, b in win:
        if all(abs(a - p[1]) >= 2 for p in picked): picked.append((l, a, b))
        if len(picked) == 5: break
    drops = [{'from_s': a, 'to_s': b, 'awr_loss': l, 'share_of_start': round(l / R[0][1], 3), 'words': words_in(a, b),
              'motion': m['motion_per_sec'][a:b]} for l, a, b in picked]
    # rel retention by phase
    def rel_mean(a, b):
        xs = [r for t, _, r in [(x[0], x[1], x[2]) for x in R] if a <= t < b]
        return round(sum(xs) / len(xs), 3) if xs else None
    an = SUM[vid]['analytics']
    pace = [secs[i]['words'] for i in range(len(secs))]
    wps_win = []
    for a in range(0, int(dur), 5):
        n = sum(1 for w in W if a <= w[0] < a + 5)
        wps_win.append({'from': a, 'to': min(a + 5, dur), 'words_per_s': round(n / min(5, dur - a), 2), 'motion_mean': round(sum(m['motion_per_sec'][a:a + 5]) / len(m['motion_per_sec'][a:a + 5]), 2)})
    out[vid] = {
        'name': name, 'duration_file_s': dur,
        'measure': {k: m[k] for k in ['motion_0_1', 'motion_0_3', 'motion_mean', 'cuts_per_10s', 'first_cut', 'speech_start', 'n_words', 'words_per_s', 'first_3s_text']},
        'motion_1_6_mean': round(sum(m['motion_per_sec'][1:6]) / 5, 2),
        'motion_share_secs_below_2': round(sum(1 for x in m['motion_per_sec'] if x < 2) / len(m['motion_per_sec']), 2),
        'retention_key': {f'{t}s': round(awr_at(t), 3) for t in [0.5, 3, 5, 10, 15, 20, 30] if t < dur} | {'end': R[-1][1], 'start': R[0][1]},
        'rel_perf': {'0-10%': rel_mean(0, dur * 0.1), '10-30%': rel_mean(dur * 0.1, dur * 0.3), '30-70%': rel_mean(dur * 0.3, dur * 0.7), '70-100%': rel_mean(dur * 0.7, dur + 1),
                     'min': min(r[2] for r in R), 'min_at_s': round(min(R, key=lambda r: r[2])[0], 1), 'max': max(r[2] for r in R)},
        'top_drops_2s': drops,
        'per_second': secs,
        'pace_5s': wps_win,
        'funnel': {
            'views_analytics': an['views'], 'engaged': an['engagedViews'], 'stayed_pct': round(100 * an['engagedViews'] / an['views'], 1),
            'avd_s': an['averageViewDuration'], 'avp_pct': an['averageViewPercentage'],
            'avd_check_minutes_per_engaged_s': round(an['estimatedMinutesWatched'] * 60 / an['engagedViews'], 1),
            'watch_s_per_all_views': round(an['estimatedMinutesWatched'] * 60 / an['views'], 1),
            'likes_per_100_views_analytics': round(100 * an['likes'] / an['views'], 2),
            'likes_per_100_engaged': round(100 * an['likes'] / an['engagedViews'], 2),
            'data_api_views': SUM[vid]['data_api_views'], 'data_api_likes': SUM[vid]['data_api_likes'],
            'likes_per_100_views_dataapi': round(100 * SUM[vid]['data_api_likes'] / SUM[vid]['data_api_views'], 2),
            'shares': an['shares'], 'subs': an['subscribersGained'], 'comments': an['comments'],
            'all_viewers_still_watching_at_end_pct': round(an['engagedViews'] / an['views'] * R[-1][1] * 100, 1),
        },
    }
json.dump(out, open(os.path.join(H, 'analysis.json'), 'w'), indent=1, ensure_ascii=False)
for vid, o in out.items():
    print('=====', o['name'], vid, o['duration_file_s'])
    print(' measure', o['measure'], 'm1-6', o['motion_1_6_mean'], 'secs<2', o['motion_share_secs_below_2'])
    print(' ret', o['retention_key']); print(' rel', o['rel_perf']); print(' funnel', o['funnel'])
    for d in o['top_drops_2s']: print('  DROP', d)
    print(' pace', o['pace_5s'])
