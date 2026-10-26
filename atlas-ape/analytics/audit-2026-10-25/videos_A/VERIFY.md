# VERIFY — adversarial check of videos_A (2026-10-25)

Working files (all in `videos_A/verify/`):
- `recompute.py` → `recompute.json`: recomputed from the raw snapshot `data/2026-10-25/{summary,per_video}.json`, without using the analyst's analysis.json.
- `funnel.py` → `funnel.json`: all-views funnel, likes per engaged view, loop excess per finisher, relative retention at 1/3/5/10/20 s. Pig War is included.
- `remeasure_<id>.json`: measure.py re-run on all 6 uploads in scratchpad/own. Videos 1–3 reproduce exactly.
- `sheet_<id>_0-3s.jpg`: frame sheets for 0–3 s of Pig War, farm girl and Conman.
- `dataapi_now.json`: Data API re-pull at 2026-10-25 08:07 UTC (2 quota units, no search.list).

## Verdicts

| id | verdict | note |
|---|---|---|
| V-all-0 | corrected | The basis is roughly engaged views, but the match is approximate. Mean awr is 2–5 % above AVP (0.540/0.468/0.851 vs 0.531/0.453/0.813). min×60/engaged is 3–10 % above AVD (42.0/29.4/28.7 vs 40/28/26). The curve numerator also counts loop restarts: awr stays above 1 until about 5 s. "Per 100 feed views" really means per 100 views from all sources. Pig War also ends at 18.5 per 100. |
| V-volcano-1 | corrected | The numbers and the steepest bucket are right: 5.38→6.14 s, −0.131, the steepest of all four videos. That bucket falls on the end of "craziest way we fought lava" plus the Iceland card, before "1935". Relative retention, however, is cumulative. It was already sliding inside the hook (0.47 @1 s → 0.34 @3 s → 0.26 @5 s), so the 0.255 at 6.9 s localizes nothing. |
| V-volcano-2 | corrected | The −40 % is arithmetically right, but relative retention is flat through the outro (0.49 @68.4 s → 0.47 at the end). The fall from 0.64 to 0.49 happened at 49–68 s, before the outro. The scoreboard part (68.9–72.7 s) costs 0.441→0.39 (−12 %). The rest comes on the closing joke "And Hawaii? We don't talk about Hawaii" and in the last bucket, which is the normal end exodus. YF loses 27 % in its last 2 s with no scoreboard. |
| V-volcano-3 | confirmed | 3 stories. 2.01 w/s. PT days 53/276/324/9. Data API 663 vs Analytics 662. |
| V-volcano-4 | corrected | 1.96 likes per 100 views is the best of the three, but Pig War is higher: 2.56 per 100 views on the Data API, 5.97 per 100 engaged vs 3.54. The middle of the curve is stable (0.550 @20 s → 0.452 @57.6 s). The claim that "line 1 + bomb worked" is contradicted: relative retention fell during the hook, and first-day views were the lowest on the channel (53). |
| V-rabbits-1 | confirmed | awr 1.047/0.813/0.615/0.418 and the 10–12 s and 17–19 s windows check out. The base includes about 0.05 loop restarts. The causal reading is N=1. Pig War opens on a map with "Border, 1846" and still holds relative 0.41–0.44 at 5–20 s. |
| V-rabbits-2 | corrected | Stayed 61.4 % and 49.9 per 100 at 10 s are the best. Relative retention, though, fell to 0.30 by 5 s, the same as Volcano. At 20 s Rabbits is the worst at 25.2 per 100. In frame 0 the rabbits are small, mid-frame, and Atlas is the largest element. Our own data contradict the "living subject at frame 0" explanation: farm girl had a man in close-up and motion 13.47 but stayed only 39.5 % (Studio). Pig War opened on a map and stayed 48.9 %. The 286 vs 53 first-day comparison doesn't measure the hook: YF got 1,101 views on day 1 with the worst opening. |
| V-rabbits-3 | corrected | AVP 45.33 % is the worst of the four videos with Analytics. The outro is not static: seconds 58–59 have motion 4.52/4.70 (the callback with the ship arriving and "Today ≈200 million"), and the video loops back to the frame-0 ship. The scoreboard part costs about 12 %. Most of the −48 % is in the last 1.2 s (0.221→0.153). Relative retention ends at 0.54. |
| V-rabbits-4 | confirmed | PH 347 / US 193 / AU 37 at 37.2 %. 1.04 likes per 100 views. 0/0/0. PT days 286/409/455, then +4. |
| V-yf-1 | corrected | The motion figures and frame 0 are right. Stayed 39.8 % covers the first wave only (1,168 of 2,312 views). "60 % swiped" overstates it: since 2025, views include loop restarts. If the 0.43 excess counts as views, about 52 % swiped on the first play; the ranking stays the same. The reference medians cannot be verified. Farm girl has the same stayed rate (39.5 %) at motion 13.47. |
| V-yf-2 | corrected | AVP 81.3 % and relative 0.482→0.826 check out, but they are measured on the 40 % who stayed, a self-selected group. On an all-views basis, YF ties Volcano at 20 s (30.5) and Pig War at the end (18.5). Pig War is better at 20 s (33.6). YF has the lowest watch-seconds per view (11.4 vs 15.0/18.1/23.3). Loop restarts per finisher: Rabbits 1.00, YF 0.93, Pig War 0.76, Volcano 0.70, so YF's loop is not the best. The "only second push" holds for videos 1–3 only; it cannot be checked for Pig War (+619) or Conman. |
| V-yf-3 | corrected | The premise is complete by 4.97 s. awr stays above 1 until 6.4 s, so at least 0.148 of the 0.178 drop between 4.6 and 7.6 s could be second-pass loopers. The drop cannot be attributed to the war context. The lowest like rate holds only per view: per engaged view, YF is 1.94 and Rabbits 1.70. |
| V-all-1 | corrected | Our numbers reproduce exactly. The flop/viral medians exist only in memory ("not kept"), so that side is unverifiable. Own counterexamples: farm girl (13.47 / 3.31 w/s / 0.92 cuts) has 132 views; Conman (19.61 / 3.08 / 0.92) has 1,174 at 10 h. Across the five videos older than a day, motion in s 0–1 is inversely ranked with views. Hard cuts every 1.5–3 s have never been tested on this channel (max 0.92 per 10 s). |
| V-all-2 | corrected | The numbers are right. Rabbits has two demographic buckets, not one. "The fix is execution, not topic" is not supported: N=3, the topic was never varied, and farm girl met the execution targets and still flopped. |
| V-all-3 | unverifiable | Stayed and views are inversely ranked across the 4 videos with Analytics, but views include loop restarts, so this coupling is partly mechanical. Video ages differ, and YF's second-wave metrics are unknown. |
| V-all-4 | confirmed (weak hypothesis) | The 3 openings without Atlas (YF 39.8, Pig War 48.9, farm girl 39.5 Studio) all stayed lower than the 2 with Atlas. This is confounded: the Atlas videos are the two longest and the first two uploads. |

## Missed (matters for the owner's question)
1. Videos 4–6 break the "motion/words-per-second/living-being-at-frame-0" thesis.
   - Farm girl was built with the new hook rules (13.47 / 3.31 w/s) and is dead at 132 views after 33 h.
   - Pig War opened on a map (motion 1.08) and has the best like rate (5.97 per 100 engaged).
   - Conman (high motion) reached about the same 10-hour pace as YF.
2. Stayed % follows video length across 5 videos (77/63 s → 55/61 %, 41 s → 49 %, 32–33 s → 40/39.5 %). It is partly a loop-restart artifact of the 2025 view counting. It is not a clean hook metric.
3. Relative retention is cumulative and cannot localize a drop. The slide starts at 1–3 s, inside the hooks themselves.
4. Pig War, not YF, is the best overall signal (likes, 20 s funnel, 1 sub). Any "template" should be benchmarked against it.
5. Zero shares channel-wide (sharing.json has no rows). Nothing in the audit addresses a share trigger, and shares are what take a Short past about 1K.
6. Channel viewCount is 5,239, but the per-video counts sum to 6,842 (dataapi_now.json). The channel statistic lags.
7. Analytics "stayed" (engaged/views) runs 1–5 points below Studio "stayed to watch".
8. Saturation question: these data cannot answer it. "The topics are not what failed" is an overreach. The test that would separate topic from execution is an own-channel A/B with the same story and two different hooks.
