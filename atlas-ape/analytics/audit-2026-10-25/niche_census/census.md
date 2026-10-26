# Niche census: can a new channel still reach 1M views on a Short? (2026-10-25)

Question: can a NEW channel that tells weird true history, crime, war or scam stories in English Shorts (faceless or
mascot-led, animated or archive) still reach a 1M Short in 2026? If so, how often does it happen and after how many uploads?

All numbers below come from files in this folder. The scripts are listed in the order they ran.

## Method
1. `discover.py`: 36 story queries × 4 variants = 144 Innertube searches as a US viewer (hl=en, gl=US) with the
   Shorts filter. The variants were relevance (all time / this year / this month, 2 pages each) and popularity. The
   popularity sort with the Shorts filter always returned 0, so in practice 106 searches returned Shorts. Result: 2,335
   unique Shorts (`raw_search.json`, `discover.log`).
2. `resolve.py`: Data API `videos.list` gives the channel, exact views and dates of all 2,335 Shorts, from 2,004
   channels. `channels.list` gives creation date, subscribers and video count. 484 channels had a discovered Short ≥100K
   or were seeds (`channels_all.json`, `channels_100k.json`). The seeds were Zack D. Films, Low Poly Shorts, Loaded Dice,
   BigDanBabys, GeoGlobeTales, Pomegranate (via jkHI4JKBd2A) and Curiosity Engine (@CuriosityEngine-b4p). MapSecrets
   could not be found: the best match had 22 subscribers.
3. Labels. A = story-led weird true history, crime, war or scam stories (the owner's niche). G = 3D «weird facts &
   stories» on mixed topics (the Zack D. Films type). B = adjacent history Shorts (facts, explainers, maps, memes,
   archive, art history). F = face-led creators. off = everything else.
   - ≥100K channels: labelled by hand from their titles (`labels_big.py`, `labels_q.json`).
   - All 138 NEW channels that ever reached 100K: relabelled by hand from their own top and newest titles
     (`labels_override.json`).
   - New channels whose discovered Shorts were all <100K: labelled by rule (`classify_small.py` → `labels_small.json`).
     A spot check of 40 rows found ~4–5 off-niche, so precision for «history Shorts» is about 88%.
4. `fetch_lists.py`: the full Shorts tab of 718 channels via yt-dlp `--flat-playlist`, 136,602 Shorts, newest first,
   capped at 3,000 per channel (`shorts_lists/`). `get_dates.py`: exact dates and durations for 24,112 key Shorts:
   oldest, newest 25–80, first ≥100K, first ≥1M, and every 20th (`video_dates.json`).
5. `census.py` → `census_channels.csv/.json` (the raw table), `summarize.py` → `census_summary.json`, and
   `breakouts.json`. Data API cost was about 600 units.

Definitions:
- **New entrant** = channel created ≥ 2025-01-01. This is the primary definition.
- **New by 1st Short** = oldest surviving Short published ≥2025. This adds old or repurposed accounts.
- **Upload index** = position counted from the oldest SURVIVING Short. Deleted flops are invisible.

## Biases (read before using any share)
- **Discovery favours visible channels.** ATLAS APE appears in none of the 2,335 Shorts. So every share below is an
  UPPER bound for a random new channel.
- **Survivorship.** «By upload k» counts only channels that kept going to k uploads. Channels that quit are dropped.
- **first6 uses today's lifetime views.** A winner's early Shorts can be boosted later. This pushes winners out of the
  «slow starter» group, so P(1M | slow start) may be slightly understated. Thresholds from 3K to 20K give the same
  picture (see below).
- **View counts are rounded.** Flat-list views are rounded as YouTube shows them (e.g. 1.2M). Exact counts were used
  for the first-1M Shorts.

## 1. The crowd (denominator)
- New (2025+) history-Shorts channels found (A+B+G): **500**.
  - Median best-ever Short: **1,700** views.
  - Never beat 5K: **66%**. Never reached 100K: **85%** (425/500).
- The ATLAS cohort (channels created Aug–Oct 2026): **248** found.
  - Median best Short: **1,200** views. Median: 10 Shorts so far.
  - 12 (4.8%) reached ≥100K. **2 (0.8%) reached ≥1M.**
- ATLAS APE's best Short (2,312) beats **82%** of new history channels at the same stage (5–12 Shorts, n=103; median
  best 1,200).
- Same-story clones at 0–2K, all from Sep–Oct 2026: ThirtySecondsSmarter (pig war), Oops Stories («Dumbest Wars Part 3»),
  Stickstory, Stickman Untold, Gloamtold, Stickumentary (emu war), uninteresting history, Rune History, Flex Wars,
  History Gone Doodle, True Cutscenes, Crazy Story (Onoda).

## 2. Who broke through (numerator)
| group (created 2025+) | channels | ever ≥100K | ever ≥1M | ever ≥10M |
|---|---|---|---|---|
| A story niche | 172 | 19 | 9 (5.2%) | 0 |
| G weird-facts 3D | 5 | 5 | 5 | 5 |
| A+G story format | 177 | 24 | 14 (7.9%) | 5 |
| A+B+G all history Shorts | 500 | 75 | **51 (10.2%)** | 19 |
| A+B+G, by 1st Short ≥2025 (incl. old accounts) | 521 | 96 | 71 (13.6%) | 31 |

The G row is 5/5 only because G channels were found exclusively through ≥100K results. It is not a base rate.

Cumulative P(first 1M by upload k | channel has ≥k Shorts), created 2025+:

| k | A+B+G: 1M / 100K (eligible) | A+G: 1M / 100K (eligible) |
|---|---|---|
| 6 | 3.7% / 7.7% (401) | 3.5% / 7.7% (143) |
| 10 | 6.3% / 11.1% (351) | 6.5% / 10.6% (123) |
| 20 | 11.4% / 17.9% (280) | 11.2% / 17.3% (98) |
| 30 | 15.9% / 20.2% (233) | 14.0% / 18.6% (86) |
| 50 | 21.2% / 29.4% (170) | 15.5% / 24.1% (58) |
| 100 | 30.1% / 36.6% (93) | 22.2% / 33.3% (27) |

## 3. Breakouts happen fast or not at all
- **Winners hit early.**
  - A+B+G winners: first 1M at median upload **#12** (IQR 5–27.5), median **15 days** after the first Short.
  - A+G winners: #10 (IQR 2.75–19), 14.5 days.
  - 3 of the 14 A+G winners had a first Short that was already ≥1M; 4 got there by upload #2. Across A+B+G: 7 of 51
    at #1, 38 of 51 by upload #28.
- **Fast starters almost always make it.** Of the channels with a ≥100K Short among their first 6, **27/32** later reached
  1M (A+G: 9/11).
- **Slow starters almost never make it.** These are channels whose first 6 Shorts are all <5K today; ATLAS APE is one of
  them (best 2,312).

| group | reached 1M (100K) by upload 30 | by 50 | by 100 |
|---|---|---|---|
| A+G | 0/63 (0) | 0/42 (2) | 1/19 (3) |
| A+B+G | 1/166 (4) | 2/116 (10) | 2/59 (5) |

  The result holds at any threshold. At <3K: A+G 0/38 by 50. At <20K: A+B+G 4/129 by 50.
- **Late bloomers exist but are rare.** Among channels with ≥60 Shorts and no 1M by upload 30, 12/123 (A+B+G) later hit
  it: History Theory #127, Echoes of Empire #128, POP Lore #79, Past #79, Timeline History #72. For A+G only 2/41.

## 4. Breakout formats (thumbnails of top Shorts in `breakout_thumbs_sheet.jpg`; no videos downloaded)
| channel | created / 1st Short | Shorts | ≥1M | first 1M at | median dur (recent) | format |
|---|---|---|---|---|---|---|
| [Hoodie Guy](https://www.youtube.com/@hoodieguystories) | 2025-05-18 / 05-24 | 105 | 105 | #1, day 0 (54M max) | 63.5 s | 2D cartoon, weird history and animals |
| [Low Poly Shorts](https://www.youtube.com/@lowpolyshorts) | 2025-06-19 / 08-06 | 91 | 88 | #1, day 0 (53M max) | 41.5 s | low-poly 3D, weird facts and history oddities |
| [Zeck Felms](https://www.youtube.com/@zeckfelms) | 2025-02-07 / 02-11 | 307 | 296 | #1 (97M max) | 19.5 s | Zack D. Films–style 3D |
| [studby](https://www.youtube.com/@studby) | 2026-02-06 / 04-04 | 232 | 147 | #2, day 1 (20M max) | 130 s | blocky 3D characters, weird stories |
| [Nolas Studio](https://www.youtube.com/@nolasstudio) | 2025-01-25 / 01-30 | 45 | 14 | #10, day 86 (21M max) | 21 s | 3D «could X stop bullets» |
| [PolySoldier](https://www.youtube.com/@polysoldiershorts) | 2026-08-31 / **10-01** | 69 | 13 | #23, **day 9** (4.1M max, median 330K) | 57 s | flat low-poly 3D, nuclear and war oddities. **Same cohort as ATLAS** |
| [War facts](https://www.youtube.com/@differentwars) | 2026-08-30 | 41 | 1 | #19, day 24 (3.4M) | 67 s | 3D renders, «3 war stories that really happened» |
| [History Simplified](https://www.youtube.com/@historysimplified25) | 2025-09-06 / 09-29 | 66 | 17 | #7, day 6 (7.7M) | 42 s | archive photos and captions, WW2 oddities |
| [Past Diary](https://www.youtube.com/@thepastdiary) | 2025-04-08 | 438 | 150 | #5, day 4 (38M) | 26 s | paintings and archive, people's true stories |
| [Holoo](https://www.youtube.com/@holoo-holoooooo) | 2026-04-24 | 46 | 4 | #5, day 16 (3.4M) | 56 s | film stills (Oppenheimer); same title re-uploaded many times |
| [Cosmopolite](https://www.youtube.com/@cosmopolitanmapper) | 2025-08-05 / 12-10 | 60 | 28 | #1 (9.9M) | 50 s | animated maps |

Old or repurposed accounts with first Short ≥2025 and instant hits (likely experienced operators, hypothesis):
- [The Art Of War](https://www.youtube.com/@theartofwarrr): 2007 account. 639 Shorts, 418 ≥1M, max 136M. 3D war oddities.
- [onca](https://www.youtube.com/@onca_yt): 2021 account, 842K subs. 179/200 ≥1M. TV clips plus «escaped prison using soup».
- [History Dude](https://www.youtube.com/@realhistorydude): 14/24 ≥1M. Recurring 3D presenter.
- [Plip](https://www.youtube.com/@plipstories): 53/106 ≥1M. 3D true crime.
- [MORGAR](https://www.youtube.com/@morgarreacts): 68/169 ≥1M.

What they share:
- No new breakout is face-led.
- None uses a recurring animal-mascot host. History Dude has a recurring 3D human presenter.
- 3D animation (Zack-type, low-poly, blocky) is the most common winning look. Archive, maps, paintings and memes also win.
- Length is not the blocker: recent medians run from 19.5 to 130 s.

## 5. Established players (created and first Short <2025, active in the last 60 days, ≥60 Shorts)
- Over 47 channels with a non-overlapping 12-month window:
  - **36** have last-20 median (Shorts ≥10 days old) < the median 12 months ago.
  - 15 are below half.
  - Median ratio **0.66**.
  - This is mild fatigue, partly an artifact: older Shorts have had longer to collect views.
- The top still prints. Last-20 medians:
  - Zack D. Films **13.5M**
  - Loaded Dice 10M (17 Shorts total, 15 ≥1M)
  - GeoGlobeTales 3.4M (12 months ago: 11M)
  - How Much? 2.4M
  - Thomas Mulligan 1.65M
  - Extra History 1.15M
  - History by Mae 1.1M
- Zack D. Films now tells the same stories: «He Used Kitchen Supplies To Escape Prison», 13.6M (2026-09-27);
  «The Man Who Stole Rare Museum Birds», 3.07M (2026-10-23).
- Discovered 1M+ niche Shorts published since 2026-07-01: 27. Only 3 are from channels created 2025+.

## 6. Reference channels, checked
- Pomegranate: 2 Shorts in total, one at 4.5M (rabbits). Not a sustained model.
- Curiosity Engine: 295 Shorts, best 21K, median 1.2K, silent since 2025-11-09. A failure case.
- MapSecrets: not found.
- BigDanBabys: off-niche (3D skits and life hacks; 534 ≥1M).
- GeoGlobeTales: geography stories, median 6M.

## 7. Estimate for ATLAS APE (assumptions spelled out)
State today: 6 Shorts, best 2,312, all first 6 <5K → «slow starter».

- **A. Same execution, keep posting ~daily.**
  - Evidence: A+G slow starters reached 1M 0/42 by upload 50 (rule-of-three 95% upper bound ≈7%) and 1/19 by upload 100.
    A+B+G: 2/116 by 50 and 2/59 by 100.
  - **Estimate: ~1–3% for a first 1M within the next ~50 uploads, ~3–7% within ~150.**
  - Most of that chance comes from the rare late-bloomer route.
- **B. Rebuild into a breakout format and treat it as a fresh launch.** (Hypothesis: the algorithm judges each Short on
  its own. That the channel's history does not count is NOT measured here.)
  - Upper-bound base rates for new history channels: 6% by upload 10, 11% by 20, 16% by 30, 21% by 50.
  - Discounted ~×0.5 for discovery bias and survivorship: **≈5–10% by upload 30, ≈8–12% by upload 50.**
  - The early signal decides: if none of the first ~6–10 Shorts of the new format beats ~100K, the odds fall back to the
    slow-starter numbers.
- **Typical uploads before the first 1M (winners only):**
  - Median #10–12; IQR 3–28.
  - Median 2 weeks after the first Short.
  - 75% of winners got there by upload ~28. After ~50 uploads without 100K it is rare.
