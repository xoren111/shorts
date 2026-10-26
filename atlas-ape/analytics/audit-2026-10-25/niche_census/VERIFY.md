# VERIFY: niche-census findings (adversarial check, 2026-10-25)

Every number below was re-computed by `verify/verify_census.py` (output in `verify/verify_output.txt`) from the
analyst's own files `census_channels.json`, `census_summary.json`, `videos_resolved.json`, `channels_all.json`,
`labels_small.json` and `shorts_lists/`. A few live Data API calls were made: 3 calls, about 3 units, no search.list.
- `verify/own_now.json`: the 6 own Shorts at 08:29 UTC. Unchanged since the snapshot, except farm girl 125 → 132.
- videos.list on the first-1M Shorts of 8 breakout channels.
- channels.list on PolySoldier, War facts, Was Wäre Wenn and ATLAS APE.

No other channel's video was downloaded.

## Bottom line
- **What holds:** the analyst's arithmetic reproduces exactly, including all six tables.
- **What is wrong:**
  - Two interpretive claims do not hold: «most breakouts are 3D» and the «≥100K in the first 6 or change» rule.
  - The «fast starters → 1M» statistic is half tautological.
- **What is missing:** the most useful number for the owner was computed but not reported. A winner's first 6 Shorts
  have a median of 20,000 views. ATLAS's first 6 have a median of 1,164.

## Verdicts

| id | verdict | short reason |
|---|---|---|
| N-1 | corrected | numbers reproduce; the clone views are 1–2-day snapshots; the comparison pool is mostly <30 days old |
| N-2 | corrected | numbers and the k-table reproduce; the A / A+G split is noise; the PolySoldier wording is wrong |
| N-3 | corrected | the fast-starter stat is tautological; the 100K kill rule contradicts the data; ATLAS was measured too young |
| N-4 | corrected | the «current» range is OK as a point estimate but the CI runs to ~8%; «3–7% by 150» is unsupported; the «rebuild» % is a guess |
| N-5 | corrected | «most breakouts are 3D» is not supported (37/51 winners are B-label); the face/mascot claims are untested |
| N-6 | corrected | 15/47 «established» are face-led; the 6-month window shows little fatigue; «3 of 27» is misleading |
| N-7 | confirmed | numbers right; the interpretation is a hypothesis |
| N-8 | confirmed | numbers right; Loaded Dice is a weak reference (inactive 109 days, 2021 account); MapSecrets not re-checked |
| N-9 | corrected | the A-vs-B rule split is far below 88% precision (~5/11 auto-A are story-led); the spot-check record is missing |

## Details

### N-1: crowded bottom (corrected)

Confirmed:
- 500 new A+B+G channels.
  - Median best Short: 1,700.
  - Best <5K: 66.4%.
  - Never reached 100K: 425/500.
- Aug–Oct 2026 cohort: 248 channels.
  - Median best: 1,200. Median Shorts per channel: 10.
  - ≥100K: 12. ≥1M: 2.
- At 5–12 Shorts: 81.6% of 103 channels have a best Short <2,312.

Problems:
- The «same-story clones at 0–2K» are Shorts published 2026-10-23/24, found through the «this month» relevance filter.
  They were 1–2 days old, which is the same age error the owner's own Yellow Fleet shows (1,168 → 2,312).
- Flex Wars («Dumbest Wars #1: Pastry War») has a channel maximum of 28K, not 0–2K.
- Of the 103 comparison channels, 83 started less than 30 days ago, and 244/248 of the cohort came from <100K searches.
  Beating 82% of them means beating the bottom of a very young pool. It is not a positive signal.
- «Only execution separates winners» is an inference. The census measures no execution variable.

### N-2: not closed (corrected, minor)

Confirmed:
- 51/500 ever ≥1M, 14/177 and 9/172. The by-upload-k table matches to the decimal.
- Live checks of the two cohort winners:
  - PolySoldier's first ≥1M: Ax6OHhrfcBo, published 2026-10-10, 1,308,922 views, day 9 after its first Short on
    10-01, upload #23.
  - War facts' first ≥1M: 0NuGQ5F4Qcc, published 2026-09-23, 3,445,910 views.

Corrections:
- The summary's «PolySoldier … 4.1M after 9 days» is wrong. The first 1M came on day 9. The 4.1M maximum is as of day
  24.
- PolySoldier's first-6 best was already 852K. It was a fast starter and is no analog for ATLAS.
- The A (5.2%) vs A+G (7.9%) vs A+B+G (10.2%) gradient should not be read as «story format is harder». The A label for
  small channels is unreliable (see N-9).

### N-3: fast or never (corrected)

The slow and fast tables reproduce exactly.

**Fast starters (27/32 later hit 1M) is half tautological.** 16 of the 32 already had a ≥1M Short inside their first 6.
Among channels whose first-6 best was 100K–1M, 11/16 (69%) later reached 1M. For A+G the figure is 4/6.

**The action contradicts the data.** The action says: if none of a new format's first 6–10 uploads beats ~100K, change
again. But 24 of the 51 winners (47%) had no ≥100K Short among their first 6. War facts, the cohort's second 1M
channel, had a first-6 best of 27K.

Among new A+B+G channels with ≥30 Shorts, by first-6 best:

| first-6 best | channels | later ≥1M |
|---|---|---|
| <5K | 166 | 5 (3.0%, 95% CI 1.3–6.9%) |
| 5–20K | 18 | 6 |
| 20–100K | 20 | 12 |
| 100K–1M | 14 | 11 |

The cliff is at about 5K, not at 100K. Caveat: these are lifetime views, so a channel's later success lifts its early
Shorts (reverse causality), and the bands require ≥30 uploads (survivorship).

**Age error.** ATLAS's first 6 were 0.4–5.5 days old when classified. The census compares them with lifetime views.
The «slow» label is provisional. It survives unless one Short passes ~20K: with a <20K threshold, A+G is 0/45 by upload
50.

**«Almost never» needs a qualifier.** Slow starters ever reaching 1M: 5/166 (3.0%). Reaching 100K: 17/166 (10%).

### N-4: probability (corrected)

**Scenario A (current execution).**
- Observed by upload 50: 0/42 for A+G (Wilson 95% CI 0–8.4%) and 2/116 for A+B+G (0.5–6.1%).
- «1–3%» is a fair point estimate. The honest range is 0–8%.
- «3–7% within ~150» is not supported by the data:
  - By upload 150: 1/38 for A+B+G (2.6%, CI 0.5–13.5%) and 0/13 for A+G.
  - Ever reached: 5/166 (3.0%).

**Scenario B (rebuild, 5–10% / 8–12%).**
- Unverifiable. It is an arbitrary ×0.5 haircut on unconditional base rates.
- Those rates include the 16 channels whose first-6 already held a 1M Short, most likely experienced operators.
- The estimate also ignores operator-level evidence: this owner's other channel already produces hits (see Missed).

### N-5: breakout formats (corrected)

- «Most new breakouts use 3D animation» is not supported.
  - The 51 new 1M channels have the label mix B 37 / A 9 / G 5. Format was coded only for 11 hand-picked examples (6
    of them 3D), and the selection favours the G channels, all ≥10M.
  - The «blocky 3D» ones are Roblox or Minecraft animations. studby's description says «We make Roblox Animations».
    Grey's says «Through Minecraft».
- «No new breakout is face-led» is untested. Face-led channels were labelled F and kept out of A+B+G, and none of the 19
  F channels is new.
- «No recurring animal-mascot host» is unverifiable, since no videos were watched.
  - Hoodie Guy (105/105 ≥1M) describes itself as «I tell you random facts and stories» and has titles like «How I Voice
    Act…». That suggests a recurring first-person cartoon persona (hypothesis).
  - A recurring character is therefore not shown to be a handicap.
- Confirmed: median durations of recent Shorts run 20–131 s.

### N-6: incumbents (corrected)

Confirmed:
- 36/47 below their 12-month level, 15/47 below half, median ratio 0.657.
- Zack D. Films last-20 median 13.5M.
- 13,551,063 views (kitchen supplies) and 3,072,326 (museum birds).

Corrections:
- 15 of the 47 «established niche players» are face-led (F).
  - Without F: 24/32 below, median 0.67.
  - With the 6-month window: only 18/35 below, median 0.84.
  - Most of the «fatigue» is the age artifact.
- Loaded Dice is not among the 47 (first Short 2025-10-09, last 2026-07-08).
- «Only 3 of 27 recent 1M+ niche Shorts come from channels created 2025+» is misleading:
  - 4 of the 27 are F.
  - 12 of the 27 (12 of the 23 non-F) come from channels whose FIRST SHORT is ≥2025: onca, MORGAR, History Dude,
    Unspoken Stories, PolySoldier, Cosmopolite, History by Lina.
- Zack has told prison-escape stories since at least 2025-11 («Soup», 20.1M), so this is not new.
- onca's retelling of the same soup story got 13.0M in 2026-07. A story Zack has done can win again.

### N-7: old accounts (confirmed)

The numbers are right; the «experienced operators» reading remains a hypothesis. Add: The Art Of War's last-20 median
fell to 181.5K, against 1.2M 12 months ago.

### N-8: reference channels (confirmed)

The numbers are right, except MapSecrets, which was not re-searched.

Loaded Dice is a 2021 account with 17 Shorts and nothing since 2026-07-08. It is a poor template for a daily channel.

### N-9: method limits (corrected)

Confirmed:
- 138 overrides.
- ATLAS appears in 0/2,335 discovered Shorts.

My spot check of 30 random auto-labelled A/B channels:
- History vs off-niche:
  - About 4 clearly off-niche: Storys («What If Everything Became Free»), Lost & Forbidden (motivation), Sketchy Why
    (body what-ifs) and Quick History (partly Czech).
  - About 3 borderline.
  - That gives 77–87% «history» precision, roughly consistent with the analyst.
- A vs B: of the 11 auto-A channels, only about 5 are story-led. The A rule fires on any pronoun (he/she/they/his/her).

The A and A+G rows are therefore not distinguishable from A+B+G. The spot check the analyst cites is not recorded:
census.md says 40 rows, classify_small.py says «60 random rows is in census.md», and census.md lists neither the rows nor
the tally.

## What the analyst MISSED (matters for «are we on the right path / can we ever get 1M»)

1. **A concrete target was available but not reported.** The median of the first-6 medians is:
   - Winners: 20,000 (p25 3,900).
   - Non-winners: 537.
   - ATLAS: 1,164.

   For the next 6 uploads the bar is: first-6 median above ~4K and at least one Short above ~20K. A 100K bar would be
   wrong.
2. **Volume is not the lever.** Median Shorts/day is 0.62 for winners and 0.95 for non-winners. ATLAS posts about
   1/day. Grinding at the current execution has a 3% historical base rate.
3. **Re-evaluate at about day 14, not today.** The own Shorts are 0.4–5.5 days old, and Yellow Fleet's second wave
   doubled its views after the Analytics cutoff.
4. **The owner has operator-level proof the census ignores.**
   - «Was Wäre Wenn» (channels.list today): 4,401,965 lifetime views, 4,250 subs, 40 videos, on animated what-if maps.
   - English animated-map channels are among the new 1M winners:
     - Cosmopolite: 28/60 ≥1M; its first Short got 4.7M (pKRCV9StCzw, live).
     - History on Maps: «Barbarossa to Berlin», 1.07M on 2026-10-12.
   - The census never evaluates «port the format that already works for this owner».
5. **The recommended 3D references are decaying too.** The «established» table leaves them out by definition. Last-20
   median vs 12 months ago:

   | channel | last-20 median | 12 months ago |
   |---|---|---|
   | Hoodie Guy | 10M | 17.5M |
   | Zeck Felms | 1.3M | 2.95M |
   | Past Diary | 167.5K | 469K |
   | The Art Of War | 181.5K | 1.2M |
   | Low Poly Shorts | 5.95M | 6.25M (stable) |

   A late copy of Zack-style 3D is not a safe bet.
6. **Demand at the top is not saturated for our story type.** 4 of the 23 non-face-led 1M+ niche Shorts found since
   2026-07-01 are prison escapes:
   - 13.6M and 3.1M from Zack D. Films.
   - 13.0M from onca.
   - 2.0M from Rom.

   That is the same genre as ATLAS #6. This is evidence of demand, not a topic list. The gap is execution.
7. **The census cannot answer «is the audience interested».** It never links to the own funnel (summary.json):

   | Short | engagedViews / views |
   |---|---|
   | Volcano | 367/662 = 55% |
   | Rabbits | 706/1,150 = 61% |
   | Yellow Fleet | 465/1,168 = 40% |
   | Pig War | 385/788 = 49% |

   Shares are 0 on all four.
8. **100K is a realistic intermediate milestone the summary omits.** Even among slow starters, 17/166 (10%) eventually
   reached 100K.
9. **Untested: does a same-channel pivot work?** The 5 slow starters that later hit 1M were not examined for what
   changed: Echoes of Empire #128, Untold History Files #40, The Secret Timeline #22, PastLens #170, POP Lore #79.
   Checking that is the only in-sample evidence on whether to pivot ATLAS in place or launch fresh. Assumption (a) in
   N-4 rests on it.
