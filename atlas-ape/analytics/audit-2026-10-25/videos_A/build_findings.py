import json, os
H = os.path.dirname(os.path.abspath(__file__))
PV = json.load(open(os.path.join(H, '..', '..', 'data', '2026-10-25', 'per_video.json')))
A = json.load(open(os.path.join(H, 'analysis.json'))); B = json.load(open(os.path.join(H, 'basis_check.json')))
rows = []
meta = {'yR42PjbnqEo': ('Volcano', 77, '2026-10-19 20:08', 'Atlas (half-closed eyes) fills lower ~45 %; dusk volcano + lava river; cut-out biplane enters 0.5 s, bomb 1.0 s, blast 2.0 s; caption THE US ARMY…',
                        '5.4–10 s: end of meta line «…way we fought lava.» + 0.71 s pause + «1935, Hawaii.» over 3-photo collage → «Iceland 1973» card → globe from space «1935» → satellite map «Mauna Loa / HAWAII»; awr 1.008→0.665',
                        'scoreboard «Final score: Humans 2 Volcano 0 … And Hawaii? We don’t talk about Hawaii.» 68.4–76.8 s, motion 0.29–0.91 in 70–75 s; awr 0.444→0.267', 53),
        'w52iSlkYlOg': ('Rabbits', 63, '2026-10-20 20:19', '3D toon ship, 13 small brown rabbits walking down the gangplank (living beings, mid-distance), Atlas lower-left with pointer; date label «England October 1859» from 0.5 s',
                        '5–19.5 s: «Turns out, rabbits can multiply» (classroom gag) → «Twenty-four became hundreds of millions» over flat Australia map + «≈600 million by 1950 estimate (CSIRO)» → «Round one: a prize» £25,000 / NSW 1887 card → Pasteur photo + «He sent his team to Sydney» → «Rodd Island lab Sydney»; awr 1.05→0.418',
                        'scoreboard «Three rounds: rabbits two, flies one, Australia zero … Probably.» 51.7–62 s, motion 0.11–1.17 in 52–57 s; awr 0.296→0.153', 286),
        'TD53YW6dqoY': ('Yellow Fleet (B+friend)', 33, '2026-10-21 20:20', 'still 3D toon canal, ships in a row, NO living being, big static «1-DAY TRIP» card; nothing moves for ~5 s (motion 0.56–0.87 in s 0–4); strike-out ≈3.3 s, «8 YEARS» ≈4 s',
                        '0–2 s (−0.197, partly loopers leaving on 2nd pass) and 4.6–7.6 s (1.148→0.970): «…eight years later. Halfway through, war broke out. Egypt sank» — whole premise already told at 4.97 s; flat 2D ship diagram 7.5–9.5 s',
                        'CTA «How many stars for this delivery?» 29.4–31.3 s; awr 0.673→0.465; last frame = frame 0 (seamless loop)', 1101)}
for vid, o in A.items():
    f = o['funnel']; m = o['measure']; b = B[vid]; nm, yt_len, pub, f0, drop, outro, d1 = meta[vid]
    rows.append({'id': vid, 'name': nm, 'published_utc': pub, 'len_s_file': o['duration_file_s'],
                 'views_dataapi_2026-10-25': f['data_api_views'], 'views_analytics_to_10-22PT': f['views_analytics'], 'day1_views_~11h': d1,
                 'stayed_pct_engaged_over_views': f['stayed_pct'], 'avp_pct_engaged_basis': round(f['avp_pct'], 1), 'avd_s': f['avd_s'],
                 'replay_proxy': b['replay_proxy_awr0_minus_1'], 'awr_10s': o['retention_key'].get('10s'), 'awr_20s': o['retention_key'].get('20s'), 'awr_end': o['retention_key']['end'],
                 'per100feedviews_at_10s_20s_end': [b['all_viewers_pct_at'].get('10s'), b['all_viewers_pct_at'].get('20s'), b['all_viewers_pct_at']['end']],
                 'relret_min_at_s': [round(o['rel_perf']['min'], 3), o['rel_perf']['min_at_s']], 'relret_max': round(o['rel_perf']['max'], 3), 'relret_end': PV[vid]['retention']['rows'][-1]['relativeRetentionPerformance'],
                 'likes_per100_views': f['likes_per_100_views_dataapi'], 'likes_dataapi': f['data_api_likes'], 'shares': f['shares'], 'subs': f['subs'], 'comments_analytics': f['comments'],
                 'motion_0_1': m['motion_0_1'], 'motion_1_6': o['motion_1_6_mean'], 'cuts_per_10s': m['cuts_per_10s'], 'words_per_s_whisper': m['words_per_s'],
                 'frame0': f0, 'biggest_drop': drop, 'outro': outro})
json.dump({'videos': rows, 'refs': {'viral_median': {'motion_0_1': 23.6, 'words_per_s': 3.26, 'cuts_per_10s': 3.6, 'motion_1_6': '11–16'},
                                     'flop_median': {'motion_0_1': 10.3, 'words_per_s': 2.91, 'cuts_per_10s': 2.0}, 'isaac_stayed_pct': 79.6}},
          open(os.path.join(H, 'metrics_table.json'), 'w'), indent=1, ensure_ascii=False)
print('ok')
