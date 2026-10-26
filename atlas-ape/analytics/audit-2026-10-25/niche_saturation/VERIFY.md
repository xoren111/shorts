# VERIFY — adversarial check of the niche_saturation findings (2026-10-25)

This is a check of the niche_saturation analyst's findings.

**How it was checked**
- Every number was recomputed from the analyst's own `raw/*.json` files and from `data/2026-10-25/*.json`.
- 4 of the 6 Atlas 1-fps contact sheets were re-inspected by eye: Yellow Fleet, Pig War, Rabbits and Russell.
- Independent Data API checks were run with the verifier's own scripts, using 322 units in total, of which 3 calls were search.list:
  - `verify/v_api.py` (helper)
  - `verify/template_precedence.json`: full upload histories of Hoodie Guy, Why Guy and FGtheexplainer.
  - `verify/ceiling_story_queries_d90.json`: 3 searches over 90 days.
  - `verify/panel_recut.json`: panel hit rates split by Short length and by channel tier.
- The units are logged in `verify/quota_verify.txt`.
- No videos from other channels were downloaded.

## Verdicts

| ID | Status | Short reason |
|---|---|---|
| S-1 | corrected | The numbers reproduce. But the 7 newcomer 1M hits come from only 5 channels (3 are FGtheexplainer). 18 of the 24 hits come from channels that now have ≥100K subscribers. About 8 of the 24 are not history stories. "47 vs 43" is the same share of the top 50 (94 % vs 93 %). |
| S-2 | corrected | The percentiles are confirmed, including on an age-matched check. "3 of 4 1M hits are 7–11 s" is really 3 of 5. The other 2 are 161–172 s narrated Shorts, and all 5 are off-niche. The 11 s vs 46 s hit length is window-dependent: with the 3–30 d window it is 71 s vs 51 s. The 27 % / 41 % odds assume a lottery that the data contradicts: 0 of 805 uploads from channels with a median under 10K reached 1M. |
| S-3 | corrected | The "9×" ≥100K rate for what-if comes entirely from Shorts under 45 s (23.2 %). What-if Shorts ≥45 s hit 2.4 %, about the core rate of 1.4 %. 89 of the 121 what-if hits come from 3 channels. "Mystery is dead" is contradicted by Jim's Wormhole: 21 days old, 2.9M and 2.7M views on mystery/conspiracy Shorts. |
| S-4 | corrected | The numbers reproduce, but the bias logic is wrong. The extra 12 months for 2024 videos exaggerates the decline. The 2025 view-count change makes it look smaller. ≥1M-in-top-50 is a capped metric. |
| S-5 | corrected | The analyst's own title-stem metric does not separate the winners. FGtheexplainer started the "10 Weird Things" title template only on 2026-04-08. Before that it had 2.5 months of mixed topics with a first-10 median of 290K. Hoodie Guy's median is 13.8M with a 4 % title stem. |
| S-6 | refuted | The copycat median of 1,570 was measured at a median age of 1.05 days. Copycats aged ≥3 d (N=4) have a median of 42,200. The gimmick "win" rests on one channel: without it the median is 5,685 and 1 of 41 reached ≥100K. FGtheexplainer and Why Guy themselves copied Hoodie Guy's title style and won. |
| S-7 | confirmed | The census matches the sheets I re-counted (Yellow Fleet s26–31, Pig War s37–40, Rabbits 19 s, Russell 0). The description is empty (channel.json). The banner text is not visible to the API. |
| S-8 | corrected | The Was Wäre Wenn numbers are exact. But "the German baseline matches the English one" is wrong: German is ×1.9 the English median and ×4.2 its ≥100K rate. Was Wäre Wenn is not a newcomer (created 2025-08-26, 4,240 subs). Its 60–74 s narrated format is not what wins in English what-if. |
| S-9 | corrected | The search-found ceiling is thinner in German (1 vs 9 hits). But the panel's per-upload 1M rate is equal: German 0.49 % vs English core 0.52 %, all off-topic. German is the easier market for 100K. |
| S-10 | confirmed | The ×7–×131 factors reproduce. Caveat: the panel itself is biased toward prolific uploaders, and its hit rates are dominated by a few channels each. |

## Key re-computations (with sources)

**1. Hits are a channel property, not a niche lottery** (`verify/panel_recut.json`; window 3–90 d, Shorts ≤180 s)

| Niche | Top-3 channels' share of all ≥100K hits | ≥100K rate for channels with median <10K | 1M hits from those channels |
|---|---|---|---|
| Core | 13 of 18 | 3 of 805 (0.37 %) | 0 |
| What-if | 89 of 121 | 1.36 % | 1 (an off-topic edit) |
| Animals | 43 of 49 | 0.64 % | 0 |
| German | 45 of 65 | 0.16 % | 0 |
| True crime | 26 of 26 | 0.23 % | 1 |

- In the core panel, the 4 channels with a median ≥10K have medians of 16.6K to 41K. ATLAS APE is at 1,154, which is ×14 below the top decile.

**2. Short length vs ≥100K rate (3–90 d)**

| Niche | ≥45 s | <45 s |
|---|---|---|
| Core | 1.4 % | 2.4 % |
| What-if | 2.4 % | 23.2 % |
| German | 6.7 % | 9.9 % |
| Animals | 9.9 % | 3.2 % |

- Narrated ≥45 s Shorts are not penalised in core. The what-if advantage is the 13–20 s map-morph clips (GeoHistories, Histoflex, Loco Brain Maps), not a format like Was Wäre Wenn's.

**3. Median length of ≥100K hits in core, by window**

| Window | ≥100K hits | All Shorts |
|---|---|---|
| All last-50 uploads | 11 s (N=20) | 46 s |
| 3–90 d | 16.5 s (N=18) | 47 s |
| 3–30 d | 71 s (N=14) | 51 s |

- The core 1M hits:

  | Channel | Views | Length |
  |---|---|---|
  | History Snap92 | 3.19M | 7 s |
  | Jim's Wormhole | 2.93M | 161 s |
  | Jim's Wormhole | 2.73M | 172 s |
  | ARCHIV | 2.26M | 11 s |
  | VortexX | 1.11M | 8 s |

- None of them is an absurd true-history story.

**4. Age-matched percentiles for ATLAS** (panel Shorts aged 3–6 d, N=137): our three Shorts sit at the 58th, 61st and 75th percentiles. The analyst's 51 / 65 / 76 is confirmed in substance.

**5. The breakouts started strong with mixed topics** (`verify/template_precedence.json`). These are lifetime views of each channel's first 10 Shorts, which later fame inflates. Treat them as indicative only.

| Channel | First-10 median | First-10 minimum | Median length | Template |
|---|---|---|---|---|
| Hoodie Guy (created 2025-05-18) | 14.3M | 8.07M | 55.5 s | none (4 % stem) |
| Why Guy (first upload 2026-01-27) | 133K | 104K | 43.5 s | copies Hoodie Guy's "X Was Terrible..." titles |
| FGtheexplainer (first upload 2026-01-20) | 290K | 92K | 55 s | "10 Weird Things" from 2026-04-08 |

- Their topics overlap ours: the Bear That Fought in WW2, the Ghost Army, a soldier with bagpipes, a Japanese soldier who held out 29 years, Blackbeard.
- These are 40–70 s narrated Shorts, which is our length band.
- Hypothesis (not visually verified, because downloading is not allowed): what they share is a consistent presenter, look and voice from upload 1, not a title series.

**6. Copycats** (`raw/copycats.json`)
- "10 weird things": 12 of the 16 copycat uploads were under 2 days old. The 4 aged ≥3 d have a median of 42,200; one of them, Zoomby Show, reached 1.99M in 7.6 days.
- "If history had sound": 20 of the 61 copycat uploads come from Inside The Surface. Excluding that channel, the median is 5,685 and only 1 of 41 reached ≥100K.

**7. Year comparison** (`results.json` year_compare)
- Core "weird history": 43 of 46 Shorts ≥1M in 2024 vs 47 of 50 in 2026. That is the same share.
- The 2026 top 50 includes LEGO, skit, Smosh, Indonesian and Hindi results.
- 17 of those 50 come from 3 channels with the same "weird [person]" format (Hoodie Guy, FGtheexplainer, Why Guy).

**8. Was Wäre Wenn** (`raw/wwW_shorts_dapi.json`)
- October: N=29, median 87,587, minimum 17,653 (at about 21 h old), maximum 511,363, 13 Shorts ≥100K, total 4,221,374, lengths 60–74 s. Confirmed.
- Percentiles in the German panel: the median Short is at 94.5 % and the channel median at 96.7 %.
- Before October, its Aug–Sep Shorts had 5,745 and 3,640 views. That is a roughly 15–24× jump within the same channel after the format and topic change (N=1, confounded with the WW2 topic and posting twice a day).

**9. The ATLAS audience is half South/Southeast Asian** (`data/2026-10-25/country_channel.json`, top countries, total 2,580)

| Country | Share of views | Average view % |
|---|---|---|
| US | 35.5 % | – |
| PH | 22.4 % | 48 % (lowest) |
| IN | 7.7 % | – |
| ID | 6.7 % | – |
| MY | 5.0 % | – |

- Anglo countries (US, GB, CA, AU) total about 46 %.
- The newcomer what-if hits the analyst cites are national-pride titles for India, Southeast Asia and Latin America: What If Bro's "What If the British Never Left India?" (561K) and Loco Brain Maps' "What If EGYPT, PAKISTAN…" (425K).

**10. Our own interest signals** (`summary.json`)
- Shares = 0 on all 4 videos that have Analytics data.
- 4 subscribers from 5,239 views.
- These are the clearest "is the audience interested" signal, and the analyst does not use them.

**11. Quota and arithmetic**
- The analyst used 4,118 units with 27 search.list calls, confirmed from `raw/quota_log.txt`.
- 1 − (1 − 0.0052)^60 = 0.27. The arithmetic is right, but the independence model is not.

## What matters for the owner and was missed

1. **Niche choice is a second-order lever.** In every niche, 1–3 channels make most of the ≥100K hits. Channels at our level (median under 10K) almost never reach 100K in any niche. The job is to raise the channel median ×10, through execution, not to find a softer niche.
2. **The closest successful format to ours already exists and is huge.** It is the narrated 40–70 s "weird history / animals" Short (Hoodie Guy, Why Guy, FGtheexplainer), with mixed topics from day 1. The 100–1000× gap to us is an execution gap.
   - The next step should measure their frame 0, motion, presenter and VO pace with measure.py.
   - That needs the owner's explicit OK to download, which this task does not allow.
3. **Long narrated Shorts can hit 1M in 2026 on new channels**:
   - Jim's Wormhole (21 days old): 161–172 s, 2.9M and 2.7M.
   - Map Warden (132 days old): "The Falklands: A 300-Year Fight", 94 s, 5.9M (`verify/ceiling_story_queries_d90.json`). That is a Pig-War-type story.
4. **Audience geography is a lever and a confound.** Half of our views come from PH, IN, ID and MY, and the what-if newcomer hits are country-pride titles for those markets.
5. **The recommendation to port Was Wäre Wenn to English is not supported by English data.** English what-if ≥45 s hits 2.4 % ≥100K, the same as core. The only evidence is the German channel itself (N=1, not a newcomer).
6. **"Above-average newcomer (68th percentile)" is a low bar.** The panel over-samples mass uploaders, many with medians under 100. The relevant bar is the top-decile channel median of about 16.6K.
