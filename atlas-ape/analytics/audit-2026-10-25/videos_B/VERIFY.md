# VERIFY — adversarial check of videos_B (Pig War / AI farm girl / Conman)

Verifier run 2026-10-25. Working files: `videos_B/verify/`
- `ret_check.py` / `ret_check.json`: recomputes all 4 retention curves from `data/2026-10-25/per_video.json` and `summary.json`
- `remeasure_Eoxim0DO2g4.json`: measure.py re-run on the published Pig War file. It reproduces the analyst's numbers exactly (motion 0–1 1.08, mean 4.35, cuts [7.45, 7.47, 33.95])
- `pig_crowd.py` / `pig_crowd.json`: 2 × search.list + videos.list, US, en, short. Re-check of the "30+ Pig War copies" claim
- `check_refs.py` / `check_refs.json`: 2 × search.list. Checks BigDanBabys 1.06M and Casterline 2.85M
- API use: 4 search.list calls (400 units) plus a few videos.list calls

## Structural facts the analyst missed (they change how every number reads)

1. **AVD/AVP and the retention curve are per engaged view, not per view.** Watch time divided by engagedViews gives Pig 30.7 s against an AVD of 29 s. The same check gives Volcano 42.0 vs 40, Rabbits 29.4 vs 28, YF 28.6 vs 26. Watch time divided by views gives only 15.0 / 23.3 / 18.1 / 11.4 s. The mean of each awr curve also matches its AVP (Pig 0.720 vs 70.4 %). So "AVP 70 %" means "70 % among people who did not swipe". Per impression, people watch about half that.
2. **The 4–7 s fall happens on every curve.** Loss in 4→7 s: Pig 0.252, **Volcano 0.253 (identical)**, YF 0.189, Rabbits 0.139. That is 4–8× the body rate (0.004–0.013/s). The window mixes first-pass exits with exits by loopers on their replay (start ratios 1.20–1.43).
3. **"Stayed" is confounded by length and loops.** Spearman, Studio stayed vs duration = **+0.8** (N=5). API engaged% vs loop ratio (awr at 0) = **−1.0** (N=4: YF 1.43/39.8 %, Pig 1.288/48.9, Volcano 1.202/55.4, Rabbits 1.196/61.4). Shorts views count replays, so a short video that loops a lot shows a lower stayed/engaged share partly by construction. Hypothesis.
4. **Relative to the right benchmark, the body is above median.** About 96 % of views come from the feed (organic). The organic relativeRetentionPerformance means are Pig 0.676, YF 0.783, Volcano 0.629 and Rabbits 0.606. The awr curves are identical with and without the organic filter; only the benchmark set changes.
5. **Analytics covers only 3,768 of 5,239 lifetime views** (content_type.json, through PT 22.10). Farm girl and Conman have zero rows. "0 shares" therefore covers only Pig War's first 9.8 h and none of YF's second wave.
6. **The topics are crowded but not closed, and the hits are on big channels.**
   - Pig War, re-queried: 63 same-story Shorts since 2026-09-01, median 1,054 views, 59 of 63 ≤ 2.5K. Ours (1,407) sits around the 75th percentile. **One fresh breakout: PolySoldier, "They Almost Went To War Over A Pig", 66,376 views, 6 Oct, 66 s.**
   - Russell: the research file holds 9 clips of ≤15 s (median 45.7K, 7 of 9 above 10K) and 29 narrated Shorts of 16–180 s (median 1,162, max 4,943).
   - The real Russell ceiling comes from big 3D-story channels: BigDanBabys at 1,057,780 views (32 s, Dec 2025) and "Dan" in Spanish at **6,709,478** (34 s, Feb 2026).
   - Casterline's AI-girlfriend Short has **3,098,724** views. It went up 2026-10-19, 4 days before ours.
7. **Our own data do not back the pixel gates.**
   - Motion in seconds 1–6 vs stayed: Spearman −0.4. Farm girl has the highest 1–6 s motion (6.75) and the worst stayed.
   - Motion in second 0–1 vs stayed: −0.10, but that figure hangs on one point (farm girl). Without it the value is +0.8.
   - Pig War's biggest loss (4–7 s) falls exactly on its most dynamic living-being clip (Veo farmer running, s3–s4 motion 7.8/9.8).

## Verdicts

| id | status | corrected claim / note |
|---|---|---|
| X-1 | corrected | The 4–7 s drop is generic (Volcano 0.253 = Pig 0.252). Measured as loss relative to the audience present at 4 s: the two Shorts whose line 2 is setup or meta (Pig 22.0 %, Volcano 23.8 %) lose more than the two whose line 2 escalates (Rabbits 12.8 %, YF 16.2 %). That fits the hypothesis, but N=4 and the window is confounded with loops, so confidence is medium, not high. Farm girl and Conman have no curve. |
| X-2 | corrected | The frame observations hold (Pig: map until 2.8 s; farm: still man plus SOLD stamps plus a camera zoom-out in 0–0.5 s). The harm is not shown: the stayed ranking also equals the length ranking (rho +0.8), and −0.10 depends on a single point. Conman, the test case, has no retention data. Hypothesis. |
| X-3 | corrected | The cut counts double-count (7.45/7.47; 20.67/20.70/21.03; 30.28/30.32). Yet shot changes are frequent: Pig about 20 shots in 41.4 s (≈4.8 per 10 s), farm about 17 in 32.7 s (≈5.2 per 10 s), both above the viral 3.6. ffmpeg scene>0.30 cannot see animated transitions, so 0.73 vs 3.6 compares edit styles, not pace. The real gap is low motion inside each shot (Pig: 13 of 41 s under 2). Relative retention in 7.5–19.5 s is a flat 0.405–0.416 (organic benchmark 0.62–0.63), with no local dips at the cards. The ≥10 gate for 1–6 s does not hold on our data (rho −0.4). |
| V-pig-1 | corrected | Numbers confirmed (s4 −0.102, s5 −0.092, s6 −0.058). Attributing them to the backstory is N=1. The same window is the steepest on every curve, and the visual there is the Short's most dynamic living-being clip. |
| V-pig-2 | confirmed | Map at 0–2.8 s and the loop back to the map are confirmed (difference between first and last frame 4.8). The "~46 % swiped" figure fits the engaged-view normalization. For the same 9.8 h window the API gives 51.1 % not engaged. That the map hurts is a hypothesis. |
| V-pig-3 | refuted | The end exit is generic. Share lost in the last 3 s: Pig 23.9 %, Volcano 23.5 % (no question), Rabbits 36.0 % (no question), YF 29.7 %. awr never rises at the end; the loop signal is the start value (Pig 1.288, 2nd of 4). Comparing the end value 0.379 with YF's is a 41 s vs 32 s comparison. Over 3 s the rate ratio is 3.8×, not 2.9×. |
| V-pig-4 | corrected | All-traffic mean 0.497, but organic 0.676. With 96 % feed traffic, the body is above median, not "exactly median". AVP 70.4 % is per engaged view. The "stayed ≥ 70 %" threshold has no source (Isaac's 79.6 % produced 21K). |
| V-pig-5 | confirmed | 788 views = first 9.83 h (published 14:10 PDT). 1,408 at 58.7 h. The 4.7/h rate depends on the rounded "1.2K" (range 3.6–5.8/h). The 0 shares cover only the first 9.8 h. 35.9 % of country views are unlisted, and Rabbits had a similar non-Anglo mix. The crowd is now 63 copies with median 1.05K, plus a fresh 66K breakout. |
| V-farm-1 | confirmed | Data API 130 at 07:49 UTC (the snapshot had 125 at 07:45), 2 likes. It is worst on views by 5×, whatever the confounds in "stayed". |
| V-farm-2 | corrected | Numbers confirmed. The motion comes from stamps plus a camera zoom. The analyst then credits Conman's 19.61, which is also mostly crash-zoom and speed lines. The standard is applied inconsistently. |
| V-farm-3 | confirmed | Timings confirmed (Nobody at 14.90 s, never real at 20.26 s = 61.9 %). AVD 20 s is per engaged view, so "most never saw the twist" is plausible, but it remains a hypothesis. |
| V-farm-4 | confirmed | Casterline 3.10M views, published 19.10, 38 s. The effect on our Short cannot be checked (N=1). |
| V-con-1 | corrected | Confirmed: frame 0, "four times" at 2.74–3.02 s, cut at 2.67 s, words/s 3.08, a seamless loop (first-vs-last frame difference 0.8), 1,174 views at 10.18 h. YF's early pace in Analytics is 1,101 views in 10.7 h (103/h); 124/h is a Studio "~9 h" figure. Conman has the best first 10 h on the channel. Its pixel motion is camera and overlay. That the opening "works" is untested. |
| V-con-2 | corrected | The analyst's "max 97K" (and part of the 1,242 median) comes from 10 s Spanish/Portuguese clips. English narrated Russell Shorts since 09-01 sit at 0.1–1.4K. The ceiling missing from the research file is BigDanBabys 1.06M (English) and Dan 6.7M (Spanish). |
| X-4 | confirmed | Titles match UPLOAD.md and YOUTUBE.md. "0 shares on the whole channel" holds only through PT 22.10 (72 % of views). |
| S-1 | corrected | "Spearman −0.10, motion does not predict" depends on one point (+0.8 without farm girl); with N=5 it supports no conclusion either way. Length predicts stayed better (+0.8). |
| S-2 | corrected | "Each topic has one big hit": Pig War's best is 597K (not 1M), plus a recent 66K. Russell has 1.06M (EN) and 6.7M (ES). The AI girl story has 3.1M. All of these are on established channels, so channel authority is a confound alongside execution. |
