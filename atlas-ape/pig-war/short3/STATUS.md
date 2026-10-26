# STATUS — «The Pig War» v3 (drawn motion graphics), 22–23.10.2026

Owner after v2 («человечки не нравятся», «слишком мультяшно» for v1): many rounds the same night — real stock footage → AI (Google
Flow) frames → «slide show of AI pictures is not it» → final brief: **as dynamic as possible with striking transitions, maps only in
the first seconds, draw everything yourself instead of archive**; then «draw the 6 AI moments too, the whole Short is ours».

## Delivered 23.10 00:08 → out/FINAL
the_pig_war_v3.mp4 (43.85 s, 1080×1920, 60 fps, −14.0 LUFS, TP −1.4 dBTP) + the_pig_war_v3.en.srt + contact_sheet.jpg + CREDITS.md
+ YOUTUBE.md (= ../UPLOAD.md; title «The Dumbest War in History: ONE Pig 🐷», paid VO → monetisable, no AI pictures → no AI label needed).

## Round 4 (23.10) — Flow file only
The Veo shot clip fires at clip 1.15 s; with from 0.79 it fired at 7.43 (before «shot») and its smoke reached the pig before the
wipe. FlowShot from 0.35 → fires at 7.87, just after the smoke wipe starts (BANG 7.82). Re-rendered chunk 1 of ShortFlow only.
The drawn file needed no change.

## Round 3 (23.10 ~01:30) — both files re-rendered
VS beat = strict left/right mirror (US flag over the farmer | UK flag over the pig, centres x 270 / 810, VS centred); island claim
= flat red / blue halves + white dashed divider, flags inside their halves; «400+ soldiers and 14 cannons» KeyFact (subtitle of that
phrase hidden) over a perspective army + flag bearer + 14 cannons; hook map pills «Border, 1846», «US claim», «UK claim».
**All in-sentence cues now on the VOICE clock** (scenes/flow import WV as Wd, Short labels WV, check.mjs → words_vo.json for SFX):
the paid take drifts up to 0.57 s inside sentences (troops sentence), sentence starts still on the edit clock (shot table).

## Round 2 (23.10 ~00:40) — both files re-rendered
Owner notes → map hook without push (flags stay in frame) + USA / BRITISH territory tags with true-proportion flags + red/blue
territory tints (border polygon on the real 49th-parallel line of the v1 render); all flags in true proportions, hoisted not
squashed; clean pig (C_F5 farmhouse pig) instead of the muddy one in the Flow hook / callback / badges / poll; at the shot a
full-screen powder-smoke wipe (Short.tsx SmokeWipe, BANG 7.78) hides the hit and the cut to the US card; subtitles ≤ y 1480 and
characters clear of the Shorts button column; SPEED=1.06 (render.mjs + srt.py) → 41.37 s, −14.1 LUFS, SRT rescaled.
Render both: `COMP=ShortFlow OUT=the_pig_war_v3_flow.mp4 SPEED=1.06 node tools/render.mjs`, `SPEED=1.06 node tools/render.mjs`,
`SPEED=1.06 python3 tools/srt.py`.

## Flow variant — delivered 23.10 00:14
out/FINAL/the_pig_war_v3_flow.mp4 (43.85 s, −14.1 LUFS) + contact_sheet_flow.jpg + CREDITS_flow.md: composition «ShortFlow»
(src/flow.tsx; FlowCtx swaps Badge faces to poll/*.jpg) — the same edit with the owner's Flow frames at 7 beats (pig with potato,
farmer catches [Veo], shot [Veo], owner card, farmhouse pig for «Not over a pig», sentries young → aged, angel). Upload with
«Altered or synthetic content» ticked. Render: `COMP=ShortFlow OUT=the_pig_war_v3_flow.mp4 CONC=3 node tools/render.mjs`
(own chunk dir out/chunks_ShortFlow).

## How it is built
- Same VO (../vo_silas_paid_fit.wav), edit clock data/words.json, subtitle clock data/words_vo.json, music + SFX (tools/mix.py),
  Atlas frames (public/atlas, ending only), poll on the question.
- src/Short.tsx: BEATS table (21 beats, times from SHOTS.md) + transition engine (zoomthru / whipL / whipR / up / circle / diag / punch /
  fade; the outgoing beat gets the matching exit). One calm label at a time, KeyFacts $10 / $100, YearsBar.
- src/scenes.tsx: one component per beat. src/ui/draw.tsx: Bg (rays), waving Flag (PNG strips), Coin, Soldier, Cannon, Ship, Sea,
  Island (San Juan outline traced from the DEM → src/data/island.json), Bust (governor / admiral / kaiser), Mug, Burst, Confetti,
  Seal, Document. src/ui/chars.tsx: Pig (Berkshire, moods chew / shock / happy, halo + wings), Farmer (point / aim / proud), Owner,
  Sentry (beard grows), Badge (drawn faces for VS + poll), Cloud, Cabin, Fir, Patch, Smoke, Flash, Birds.
- Hook map = v1 bright 3D relief frames (public/maps/map); the zoom-through dives into San Juan Island onto the drawn pig.
- Potato only in «caught it eating his potatoes» (owner: not everywhere).
- events.ts = 43 events / 85 SFX cues (whoosh on every transition). `node tools/check.mjs` all green.

## Leftovers (unused, kept)
- assets/footage, assets/raw: stock + Commons archive gathered for the abandoned real-footage version (licences in the json files).

## Re-render
`npx tsc --noEmit && node tools/check.mjs && python3 tools/mix.py && rm -rf out/chunks && CONC=3 node tools/render.mjs && python3 tools/srt.py`
(≈ 8 min). Stills: `node tools/stills.mjs --comp Short --t 1,2,3 --out out/stills/x --scale 0.4`.
