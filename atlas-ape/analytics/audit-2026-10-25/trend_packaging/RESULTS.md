# trend_packaging — ATLAS APE audit 25.10.2026 (trajectory + packaging)

Sources: analytics/data/2026-10-25/* (snapshot 07:45 UTC), raw/fresh_counts_*.json (Data API polls 07:49/07:58/08:02 UTC),
trajectory.json, newcomers.json + newcomers_stats.json (188 new niche channels), raw/wwm_api.json (sister channel),
raw/isaac_heisenberg.json, titles_stats.json, raw/videos_localizations.json, raw/playlists_mine.json,
../videos_A/measure_*.json + ../videos_B/measure_*.json (execution metrics, measured by sibling analysts).

## A1. Per-upload trajectory
| # | Short | len | publ. (PT) | age h | views now | views ~10 h | ~24 h | views after Analytics window | engaged % (API) | stayed % (Studio) | AVD s | AVP % | end ret % | RRP 10–30 % | likes/1k | comm. | shares | subs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Volcano | 77 | Mon 13:08 | 131.6 | 663 | 53 (10.9 h) | ~200 est (329 @ 34.9 h) | +1 | 55.4 | 57.6 | 40 | 53.1 | 26.7 | 0.29 | 19.6 | 0 | 0 | 1 |
| 2 | Rabbits | 63 | Tue 13:19 | 107.4 | 1,154 | 286 (10.7 h) | ~510 est (695 @ 34.7 h) | +4 | 61.4 | 62.6 | 28 | 45.3 | 15.3 | 0.26 | 10.4 | 0 | 0 | 0 |
| 3 | Yellow Fleet | 33 | Wed 13:20 | 83.4 | 2,312 | 1,101 (10.7 h) | ~1,140 (1,168 @ 34.7 h) | **+1,144** | 39.8 | 42.8 | 26 | 81.3 | 46.5 | 0.49 | 7.8 | 1 | 0 | 0 |
| 4 | Pig War | 42 | Thu 14:10 | 58.6 | 1,407 | 788 (9.8 h) | ~1.25K est (1.2K @ 14 h) | +619 (mostly h 10–14) | 48.9 | 54.1 | 29 | 70.4 | 37.9 | 0.42 | 25.6 | 1 | 0 | 1 |
| 5 | Farm girl | 33 | Fri 15:28 | 33.3 | 125–132 | <85 (85 @ 18 h) | ~100 est | – | – | 39.5 | (20) | – | – | – | 16.0 | 0 | – | – |
| 6 | Russell | 44 | Sat 14:39 | 10.1 | 1,174 (flat 07:45→08:02) | 1,174 (10.1 h) | pending | – | – | – | – | – | – | – | 20.4 | 1 | – | – |

Daily PT views: Volcano 53/276/324/9 · Rabbits 286/409/455 then +4 · YF 1,101/67 then +1,144 · Pig War 788 (PT day 1 only).

## A2. What changed between uploads (execution numbers from videos_A/B measure files)
| # | motion 0–1 | motion 1–6 | words/s | cuts/10 s | look | Atlas | kit title emoji kept? | 11.ai |
|---|---|---|---|---|---|---|---|---|
| 1 Volcano | 4.04 | 4.08 | 2.01 | 0 | real-DEM 3D + photos | host, lip-sync | – | yes |
| 2 Rabbits | 1.90 | 2.62 | 1.93 | 0 | toy 3D | hook/key/end | – | yes |
| 3 Yellow Fleet | 0.72 | 1.03 | 2.65 | 0 | Blender toy 3D | friend lip-sync | no (🚢 dropped, double space left) | yes |
| 4 Pig War | 1.08 | 5.48 | 2.34 | 0.73 | drawn + Flow AI frames | ending only | no (🐷🇬🇧 + 1st title dropped) | no |
| 5 Farm girl | 13.47 | 6.75 | 3.31 | 0.92 | Flow/Veo AI + photos + memes | pop-ins | no (💔 dropped) | no |
| 6 Russell | 19.61 | 10.58 | 3.08 | 0.92 | drawn in code | removed | no (kit title replaced, 😳 dropped) | no |

## A3. Newcomer benchmark (search order=date, Shorts 1.9–12.10, 8 niche queries; new = first public upload ≥ 1.7.2026; Shorts ≥ 7 d old)
| sample | channels | any of first 6 ≥10K | any of first 10 ≥10K | ≥100K | ≥1M | median Short | median channel best-of-6 | p75 / p90 best-of-6 | ATLAS APE percentile (median / best) |
|---|---|---|---|---|---|---|---|---|---|
| all languages | 188 | 10.1 % | 12.8 % | 5.3 % | 1.6 % | 266 | 1,251 | 1,607 / 10,454 | 78 / 84 |
| English | 166 | 8.4 % | 10.8 % | 4.2 % | 1.2 % | 220 | 1,223 | 1,516 / 6,794 | 80 / 87 |
- p75 views by upload index #1…#10 (144 channels with 10 aged Shorts): 1,282 / 1,195 / 1,195 / 1,255 / 1,232 / 1,187 / 1,253 / 1,438 / 1,313 / 1,194 — flat: ~1.2–1.4K is the seed-pool ceiling, uploads do not "warm up" a channel.
- First ≥10K hit (18 of 144 channels): 6 at Short #1, 13 by #3, 5 at #5–#9; 126 never in 10.
- 35 channels that looked like us after 6 Shorts (median 600–2.5K, none ≥10K): 2 (5.7 %) broke 10K in Shorts 7–10.
- Isaac @Heisenberg-101 (4 Shorts, May 2026) now 7.0K / 35.5K / 15.1K / 13.4K, 424 subs; at 24 h: 60.1 % stayed → 1,080; 79.6 % → 21.4K; 59.1 % → 1,144 then delayed wave.

## A4. Sister channel «Was Wäre Wenn» (Data API now: 4,240 subs, 4.40M views, 40 videos)
| period | Shorts | median views | min | max | mean length | likes/1k | comments/1k |
|---|---|---|---|---|---|---|---|
| first 6 (25.5–4.6.2026) | 6 | 66,897 | 20,487 | 88,299 | 52 s | 18.2 | 0.65 |
| Aug–Sep 2026 | 2 | 4,693 | 3,640 | 5,745 | 48 s | 19.0 | 0.43 |
| 8–24.10.2026 | 29 | 87,583 | 17,623 | 511,336 | 68 s | 11.7 | 1.19 |
| ATLAS APE 19–24.10 | 6 | 1,164 | 125 | 2,312 | 49 s | 15.4 | 0.44 |
WWW: German, WW2 / Hitler / tanks / map what-ifs, question titles («Warum…?», «Was wäre wenn…?»), 2 uploads/day, subs/1k views 0.96 (ours 0.76).

## B. Packaging facts
- Traffic (Analytics to 22.10, 3,768 views): Shorts feed 97.2 %, search 1.5 %, other page 0.6 %, subscriber 0.3 %, channel page 0.3 %.
- Channel: description "", no keywords (brandingSettings = title+country only), 0 user playlists, 0 channel sections; banner = "THE ATLAS APE · The whole world on my shoulders — explained · GEOGRAPHY · MAPS · FACTS" over a world map; name "ATLAS APE" vs banner "THE ATLAS APE" vs credits "The Atlas Ape" vs handle @atlasape-s.
- Videos: category 27 (Education) ×6, madeForKids false ×6, defaultLanguage/defaultAudioLanguage en ×6, captions true ×6, localizations only "en" ×6 (kits' ES/PT-BR/FR/DE titles not added), custom thumbnail 3/6 (Rabbits, Pig War, Russell), no regionRestriction. YouTube auto-topic: Volcano/Rabbits Knowledge, YF **Video_game_culture**, Pig War Entertainment/Film/Politics, farm girl Entertainment, Russell none yet.
- Upload times 20:08–22:28 UTC = 13:08–15:28 PT = 16–18 ET (= 04–06 h in Manila), one per day 19–24.10; football-222 built, not uploaded.
- Title sample (482 Shorts, 02_Research/titles, channels <1M subs): ≥1M titles median 7 words, 42 % emoji, 12 % « | »/« · » (all series/brand names, none a tool credit); <100K titles median 10 words, 18 % emoji. Ours: 6–10 words, 0/6 emoji, 3/6 « · 11.ai».
