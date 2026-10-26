# Niche saturation & positioning — ATLAS APE (2026-10-25)

Analyst: niche_saturation. Every number below comes from a file in `raw/` (written by `scripts/`). Data API quota used by this analyst: 4,118 units (27 × search.list = 2,700), see `raw/quota_log.txt`.

## Verdict

**Crowded, but not closed.** The core niche (absurd/weird true history, English) has heavy supply and a real 1M ceiling at the same time.
- Supply: ≥138 different channels uploaded a matching English Short in the last 48 h. The median keyword returned ≥32 verified uploads in 24 h. 83 % of fresh uploads come from channels under 10K subscribers.
- Ceiling: 24 English Shorts in this niche passed 1M views in the last 90 days, from 20 channels. 7 of them came from channels less than a year old. The 2026 top 50 for "weird history" still holds 47 Shorts at ≥1M (43 in 2024).
- Base rate: the typical active newcomer gets about 600 views per Short. About 1 upload in 190 reaches 1M, and most of those are 7–11 s clips, not narrated stories.
- Where ATLAS APE stands: an above-average newcomer (68th percentile), not a breakout. ATLAS APE has no recurring signature yet.
- The German sister channel: its format performs at the 95th–97th percentile of its own market.

## Method (and what it can't do)
1. **Fresh supply.** For each of 10 niches I ran Innertube searches (US client; es/MX and de/DE for the two non-English niches, 4–5 keywords each) in the buckets Today, This week and This month with the Shorts filter. YouTube's date filters are loose, so every id was checked against the Data API publishedAt. That gives 6,501 videos and 4,683 channels (`raw/innertube_*.json`, `raw/videos_cache.json`, `raw/channels_cache.json`).
2. **Uploader panel.** This is the least popularity-biased sample available. Per niche I randomly picked 40 channels that uploaded a matching Short in the last 48 h, so they were chosen for uploading, not for being popular. For each one I read its last 50 uploads (Data API playlistItems) (`raw/panel.json`, `raw/panel_videos.json`, `raw/hit_rates.json`).
3. **Ceiling.** Data API search.list (order=viewCount, videoDuration=short, US/en; MX/es for the Spanish niche) per niche for three windows: Jan 1–Oct 25 2024, Jan 1–Oct 25 2026, and the last 90 days. I added the Innertube Popularity buckets. Channels were checked with channels.list (`raw/dapi_search.json`, `raw/d90_1M_list.txt`, `raw/innertube_ceiling_90d.json`).
4. **Positioning.**
   - Breakout channels' Shorts tabs, metadata only via yt-dlp (`raw/breakouts_summary.json`).
   - A test of whether template copycats also win (`raw/copycats.json`).
   - Atlas screen-time in our 6 Shorts, counted from 1-fps contact sheets (`sheets/`, `raw/own_atlas_screen_census.json`).
   - The sister channel's Shorts (`raw/wwW_shorts_dapi.json`, `raw/own_vs_panel.json`).

**Caveats.**
- Search results over-represent winners by 7–131× (table C). Only the panel is an honest newcomer baseline, and it has N = 29–37 channels per niche.
- Volume counts are lower bounds, because a search returns at most about 100–150 results.
- search.list keyword matching is loose. The top-50 lists include off-topic and non-English videos.
- 2024 videos had 12+ more months to collect views.
- Since 31 Mar 2025 Shorts views count replays, which inflates 2026 numbers.
- Subscriber counts are as of today, after any hit, so "<10K subs" undercounts channels that were tiny when their video took off.
- Panel 1M hits are partly off-niche, because channels post mixed content.

## A. Supply vs newcomer odds (uploader panel = honest baseline)
| Niche | Channels with a matching Short in 48 h (≥) | Fresh uploads/keyword/24 h (≥, median) | Fresh supply from channels <10K subs | Panel: median views/Short (3–30 d) | Panel: channel median | Per upload ≥10K | ≥100K | ≥1M (last 90 d) | 90-d ≥1M found (target lang) | …from channels <1 y | …<10K subs now |
|---|---|---|---|---|---|---|---|---|---|---|---|
| core_absurd_history | 138 | 32 | 83 % | 632 | 471 | 15.4 % | 1.9 % | 0.52 % (5 from 4 ch) | 24 (20 ch) | 7 | 1 |
| whatif_history_maps | 91 | 31 | 84 % | 944 | 715 | 35.9 % | 17.1 % | 0.99 % (7 from 3 ch) | 11 (8 ch) | 2 | 1 |
| geo_maps | 93 | 35.5 | 81 % | 1,358 | 1,279 | 18.9 % | 5.1 % | 0.52 % (3 from 1 ch) | 23 (14 ch) | 10 | 1 |
| animals | 81 | 23 | 70 % | 1,298 | 1,308 | 22.1 % | 6.1 % | 1.73 % (14 from 3 ch) | 47 (33 ch) | 16 | 3 |
| science_space | 87 | 29.5 | 83 % | 1,330 | 1,197 | 24.0 % | 7.5 % | 1.03 % (7 from 3 ch) | 27 (24 ch) | 13 | 3 |
| true_crime | 63 | 9.5 | 66 % | 746 | 652 | 8.8 % | 2.8 % | 1.29 % (12 from 2 ch) | 20 (15 ch) | 3 | 2 |
| survival_disaster | 129 | 36.5 | 83 % | 1,168 | 1,042 | 28.5 % | 6.0 % | 0.28 % (2 from 2 ch) | 31 (27 ch) | 12 | 4 |
| mystery_unsolved | 128 | 35 | 86 % | 127 | 104 | 1.2 % | 0.2 % | 0.00 % | 13 (10 ch) | 3 | 2 |
| es_historias (MX) | 121 | 36 | 74 % | 1,333 | 1,114 | 27.8 % | 7.4 % | 1.28 % (11 from 5 ch) | 35 (20 ch) | 8 | 1 |
| de_geschichte (DE) | 88 | 33.5 | 79 % | 1,175 | 1,184 | 25.5 % | 8.0 % | 0.49 % (4 from 3 ch) | 1 (1 ch)* | 1 | 0 |

*German: Innertube only, no Data API search. Using the same Innertube-only method, English core has 9 (`raw/innertube_ceiling_90d.json`).

## B. Is the ceiling still there? (Data API search.list, same query, Jan 1–Oct 25 of each year)
| Niche (query) | 2024 top-10 median | 2026 top-10 median | ≥1M in top 50: 2024 → 2026 | ≥10M: 2024 → 2026 | last 90 d: top-10 median / ≥1M |
|---|---|---|---|---|---|
| core («weird history») | 24.3M | 16.7M | 43 → 47 | 18 → 10 | 6.2M / 20 |
| what-if («what if history») | 5.8M | 4.6M | 17 → 23 | 2 → 1 | 1.8M / 10 |
| geo («geography facts») | 31.1M | 6.9M | 50 → 38 | 25 → 3 | 3.4M / 28 |
| animals («animal facts») | 108.3M | 51.4M | 48 → 48 | 46 → 35 | 20.3M / 47 |
| science («space facts») | 43.8M | 10.9M | 50 → 30 | 24 → 5 | 3.9M / 22 |
| true crime («true crime story») | 6.2M | 3.9M | 40 → 28 | 2 → 0 | 2.0M / 16 |
| survival («survival story») | 50.5M | 16.6M | 44 → 47 | 23 → 11 | 5.3M / 35 |
| mystery («unsolved mystery») | 4.8M | 2.3M | 8 → 16 | 2 → 0 | 1.7M / 11 |
| es («historias reales», MX) | 12.7M | 9.7M | 42 → 48 | 6 → 4 | 7.4M / 27 |

## C. Search-sample bias (why "fresh uploads get X" from search is misleading)
| Niche | Search-sample median (3–30 d) | Panel median (3–30 d) | Factor |
|---|---|---|---|
| core | 10,576 | 632 | ×17 |
| what-if | 45,286 | 944 | ×48 |
| geo | 27,146 | 1,358 | ×20 |
| animals | 27,814 | 1,298 | ×21 |
| science | 26,236 | 1,330 | ×20 |
| true crime | 34,828 | 746 | ×47 |
| survival | 44,502 | 1,168 | ×38 |
| mystery | 16,578 | 127 | ×131 |
| es | 8,769 | 1,333 | ×7 |
| de | 10,789 | 1,175 | ×9 |

## D. Our channels vs the panel
- **ATLAS APE vs the English core panel.** We use our three Shorts aged 3–5 days: 663, 1,154 and 2,312 views.
  - They sit at the 51st, 65th and 76th percentiles of panel uploads.
  - Our channel median (1,154) sits at the 68th percentile of channel medians.
  - Source: `raw/own_vs_panel.json`.
- **Was Wäre Wenn (DE) in October 2026:** 29 Shorts, median 87,587 views (minimum 17,653, maximum 511,363), 13 at ≥100K, none at ≥1M.
  - Its median Short sits at the 95th percentile of German panel uploads.
  - Its channel median sits at the 97th percentile.
  - Its worst October Short (17.6K) beats the best ATLAS Short (2.3K) by 7.6×.

## E. Breakout signatures (metadata only; survivorship bias: these channels were picked because they had a 1M hit)
- **Channels with one repeatable promise:**

  | Channel | Age | Series | Median views per Short | Share ≥1M |
  |---|---|---|---|---|
  | FGtheexplainer | 285 d | 48/109 titles «10 Weird Things You Didn't Know About [famous person]» | 1.0M | 50 % |
  | Why Guy | 299 d | the same template | 1.1M | 57 % |
  | World Ji Ke | 168 d | country-shape lists | 1.6M | 71 % |
  | Meridian Anatomy | 58 d | «X in 1000 years» maps | 272K | — |

- **Channels with one 1M hit and mixed topics:**

  | Channel | Age | Median views |
  |---|---|---|
  | History Explorer | 210 d | 1,850 (newest 20 Shorts) |
  | GeoGlobeFiles | 142 d | 5,300 |
  | Helivox | 65 d | 2,800 |
  | AiEngineer | 91 d | 8,450 (has a "how does a" template; a template is not sufficient) |

- **Copycats of a template, last 30 days:**

  | Template | Uploads (channels) | Median views | Share ≥100K |
  |---|---|---|---|
  | «10 weird things you didn't know about» | 16 (12 channels) | 1,570 | 6 % |
  | «if history had sound» (a visual/sound gimmick) | 61 (15 channels) | 25,224 | 31 % |

## F. Atlas on screen (1-fps census of our 6 uploads)
| Short | Seconds | Atlas seconds | Share | Frame 0 |
|---|---|---|---|---|
| Volcano | 77 | 16 | 21 % | yes |
| Rabbits | 63 | 19 | 31 % | yes |
| Yellow Fleet | 33 | 6 | 19 % | no |
| Pig War | 42 | 4 | 10 % | no |
| AI farm girl | 33 | 2 (tiny icon) | 6 % | no |
| Russell | 44 | 0 | 0 % | no |

- Atlas works as an intro/outro scoreboard host. He is never the one the story happens to.
- The 6 Shorts use 5 or more different visual languages.
- The banner says "GEOGRAPHY · MAPS · FACTS" and the channel description is empty.
- With N = 6 there is no visible link between Atlas screen-time and views.

Findings S-1…S-10: see `findings.json`.
