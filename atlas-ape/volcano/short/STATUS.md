# STATUS — «Humans vs Volcano» Short

**v1 18.10 02:50; v2 05:20; v3 15:35; v4 (lava) 16:30; v5 toon 19.10 00:35; v6 HYBRID DELIVERED 19.10 ~02:45** →
out/FINAL/: humans_vs_volcano.mp4 (76.8 s, 1080×1920, **60 fps**, H.264, AAC 48 kHz, −14.0 LUFS), humans_vs_volcano.en.srt,
contact_sheet.jpg (1 frame/s from the final mp4), CREDITS.md, YOUTUBE.md. Rules of v3: STYLE.md.

## v3 (owner notes 18.10, round 3) — keep
- No text twice: a label never repeats the subtitle/voice; at most ONE label besides the subtitle; no chips, stickers, stamps,
  tilted headlines, rolling counters, flashes, light leaks, shakes (check.mjs fails on BigText/DateStamp/Stamp/Chip/Counter/Flash/
  LightLeak/Pin in scenes).
- Key figures (src/data/emph.ts → KeyFact in Short.tsx) are shown big; the subtitle group that speaks them is hidden meanwhile.
- Every shot cross-dissolves (Layer, XF = 0.4 s); inserts fade in and hold XF after their window.
- Owner: «don't copy GeoGlobeTales' look» — keep our bright 3D/effects; only calm texts + smooth transitions from it.
- QA tools: `python3 tools/dupes.py` (OCR via Apple Vision, flags duplicate/cluttered text), `python3 tools/cut_frames.py`
  (10 fps sheets around every cut), `python3 tools/blinks.py video t0 t1` (one-frame glitch finder).
- RENDER WITH `CONC=1`: concurrency 3 produced one-frame render races on Heimaey (coast/pier missing for a frame, ~1/s);
  single-thread render is clean (~25 min at 60 fps).
- Heimaey coast: steep faces ignore the 2 m mask (no hanging "icicles"), mask sampled with 2× footprint, terrain polygonOffset
  (pier z-fight with the ocean); lava cracks anti-aliased (fwidth) — no shimmer.

## v6 HYBRID (owner 19.10 00:40) — the current deliverable
- 0 – 29.5 s = the v4 render (public/v4_base.mp4 = out/patch/v4/raw.mp4 0–30 s, frame 1677 patched), played by OffthreadVideo in
  src/Short.tsx (HYB, HYB_T = W(55)+0.1); from the dirt-wall diagram on, the v5/v6 build (diagrams, Etna photos, toon Iceland,
  final). Seam: the new layers dissolve over the old video for XF. `--props '{"hybrid":false}'` renders pure v5/v6.
- Sound: tools/hybrid_audio.py splices the v4 audio (out/hybrid/v4_audio.wav) before the seam with the current mix after it
  (40 ms linear crossfade, limiter, trim to −14 LUFS); final_pass.sh runs it after mix.py.
- Iceland A is now a NIGHT toon look (moon, stars, indigo sea, billowing cauliflower cloud from the crater); the Iceland globe dive
  has no marker dot and a night decal/backdrop (tools/blender/iceland_decal.py, backdrop_decal.py — the latter reads AWS terrarium
  tiles cached in ~/shorts/barbarossa-1941-v2/data/dl/terrarium/6). Day version backups: out/blender/backup_day/.
- Iceland B steam is still three columns of stacked puffs (owner's «organ» note was about the eruption cloud) — candidate fix.

## v5 toon look (owner 18.10 evening: «blurry, unclear what happens» → approved cartoon reference + violet sky)
- Every 3D shot is now a Blender 5.2 render (crisp toon, violet dusk sky, real relief/flows/OSM towns): tools/blender/
  etna_toon.py, hawaii_hook.py, hawaii_raid.py (lib hawaii_lib_hookraid.py), hawaii_a.py, hawaii_b.py, iceland_a.py (prep
  heimaey_prep.py), iceland_b.py, iceland_c.py; globe decals hawaii_decal.py / iceland_decal.py / backdrop_decal.py.
  Run renders via tools/blender/run.sh (GPU lock) → tools/blender/post.py (lava-only glow) → public/blender/<shot>/f_NNNN.jpg;
  `--track` writes screen positions → src/data/*_track.json → DOM overlays (labels, cut-out bombers, reticles, ruler, route).
  The scenes play them with ImgSeq (src/ui/gfx.tsx); old three.js shots stay behind const switches (BLENDER_*, DIAGRAMS).
- Etna "dirt wall" and "tube blast" are animated SVG cutaway diagrams: src/scenes/EtnaDiagrams.tsx.
- Final pass: ./tools/final_pass.sh (CONC=3 is fine now — the 3D is pre-rendered images; blinks.py report only).
- Known: the Etna globe dive (24–26 s) is still the photoreal globe (no toon decal yet → style jump at 26 s);

## v4 lava (owner 18.10: «look at the real lava photos — ours is so-so»)
- TerrainMesh `lavaLayer` rewritten: dark glassy basalt crust (noise-normal sheen), glowing seams between crust plates (wide/yellow
  when hot, thin/red when cooling), open incandescent melt with dark rafts where hottest, far LOD = dark flow + glowing core river +
  bright front; front and seams die out with `cool` (a channel laid out cold never flashes). LAVA_RAMP without pink/maroon.
- `LavaState.hot` (0–0.5) keeps narrow/old channels incandescent (hook 0.38, Hawaii A 0.32).
- Final pass: `./tools/final_pass.sh` = check → mix → CONC=1 render → blinks.py → clean stills for the flagged frames →
  patch_frames.py → deglitch.py (40.5–66.4 s, large single-frame dropouts only) → contact sheet → dupes.py.
  The flagged frames are render-media races that do not happen in renderStill; deglitch handles the few deterministic pier dropouts.

## v5 Hawaii toon — review fix round (18.10 evening)
- Hook (tools/blender/hawaii_hook.py) reframed so Mauna Loa reads as a giant volcano: skyline held at y ≈ 430–470 all shot
  (violet sky + cream cloud bank above, ≈ 23 %), tall cream plume past the skyline, crane up AND back on «volcano.» (aim rises
  with it). Frame cameras render-free first: `NOLOCK=1 tools/blender/run.sh tools/blender/hawaii_hook.py -- --probe`
  (tools/blender/hawaii_probe.py: skyline / vent / impact / summit screen y over the shot).
- Hook + raid palette (hawaii_lib_hookraid.py PAL, ZA, terrain bands): terracotta rock, violet young lava, smaller ochre
  streaks, deeper violet shadow band → mean HSV S ≈ 0.42–0.44 (approved Etna still 0.40).
- Globe dive → Hawaii A: GlobeHop `Dest.toon` lays tools/blender/hawaii_decal.py's ortho render of Hawaii A's first frame
  (public/blender/hawaii_decal.jpg, hawaii bbox + 8 %) onto the globe, display-space cross-fade 7.35–8.0 s via an exact
  inverse of the post chain's ACES; bloom + vignette fade with it. Re-render the decal after any change to hawaii_toon.py /
  hawaii_a.py's opening look.
- check.mjs §6: src/data/hawaii_*_track.json must be byte-identical to public/blender/<shot>/track.json; frame folders exactly
  f_0001…f_n covering their Layer. After a Hawaii re-render: post.py → copy track.json to public/blender/<shot>/ and src/data/.

## v5 Iceland toon — review fix round (18.10 evening)
- Iceland A (tools/blender/iceland_a.py) is a VIOLET DUSK now, not a navy night: DUSK_BAND light bands + thresholds 0.60/1.0
  (etna_toon), bright PAL greens, violet-blue sea (#3456ae), the etna violet ramp compressed to the horizon, cream ash cloud.
  Inside the GlobeHop dissolve `blue_k` (= Iceland.tsx blueA) blends the sea from the globe's ocean blue (#0e64ad) and the land
  from DIM_BAND, so the dissolve keeps its brightness. Camera: after the dive a low wide-lens (fov 55→64) flight from the south:
  sky + mainland coast at the top, fleet route mouth → round Ystiklettur → north to the coast (track `route`, `coast`).
  Fissure colour ramp LINEAR (no one-frame colour steps); Eldfell cinder disc radius starts at 0; harbour lobe = hot channel
  (CHAN field along flows.json harbor_lobe × live `chank`) + faster field advance 51.6–54.5 s (field_of Hermite);
  bright boats (BOAT_L 0.12, red/orange/yellow hulls, white cabins). Track `lava_front` interpolated along the path.
- Iceland B: the jets are a short solid stream + a spray of 30 droplets per monitor (grow from nothing, shrink before impact).
- Iceland C: steam wisps removed; inbound boat 2 passes the gap ≈ 65.6 s (INB), after the ruler fades (Iceland.tsx RULER_OUT
  64.3); KeyFact «~100 m» in the open sea right of the ruler (emph.ts x 850 y 1110 size 104).
- After an Iceland re-render: post.py → `--track` (A: default path; C: `--track public/blender/iceland_c/track.json`) →
  `python3 tools/track_slim.py …` (A: `--keys crater,harbor,mouth,lava_front --window route:50.0:51.6 --window harbor_lobe:52.5:55.2`,
  C: `--keys front,frontOpp`). SEQ_B in Iceland.tsx hard-codes B's t0/n (56.45, 110).

## v2 rules (keep them)
- Subtitles: centred (left 90, width 900), 54 px, opacity 0.92, only while words are spoken (`last.e + 0.15`); Y per section in `subY()`.
- Atlas only in three windows (src/Short.tsx `ATLAS`): hook 0–6.42 s, Etna W(49)−0.45…W(55)+0.1 (small, left), final W(138)−0.15…end.
  check.mjs fails if Atlas shows anywhere else.
- Credits: one credit pill at a time; photo credits never under subtitles.
- Bombers = real 1935 photo cut-outs (tools/cutout_planes.py → public/cutouts), not 3D models.
- Sharp terrain = high-res data in data/hr/<region> (REPORT.json, compare.jpg): Etna TINITALY 10 m, Heimaey ÍslandsDEM 2 m + land.png,
  Hawaii vent 3DEP lidar 1 m + NAIP 0.6 m, Hawaii flow 3DEP 1/3″ + NAIP; Poly Haven CC0 micro-detail + triplanar cliffs in TerrainMesh.
  Backups of the previous grids: public/terrain/<r>/height_v1.bin, sat_v1.jpg.

## Pipeline (re-run in this order after any change)
1. timing: `python3 tools/align.py` (data/whisper_words.json → data/words.json); lip sync data/rhubarb.json (~/shorts/tools/rhubarb)
2. Atlas: `python3 tools/atlas_scene.py` → `cd ~/shorts/orangutan && npm run export -- volcano_short --w 1800 --h 1400`
   → `python3 tools/atlas_webp.py` (public/atlas/*.webp)
3. data: `python3 tools/terrain.py`, `python3 tools/coast_fix.py heimaey`, `python3 tools/lava_cfg.py && python3 tools/lava_maps.py`,
   `python3 tools/geo_ts.py` (src/data/geo.ts from data/flows.json), `python3 tools/cutout_planes.py`
4. check: `npx tsc --noEmit && node tools/check.mjs` (anchors, gaps ≤ 2.5 s, assets, numbers vs SCRIPT.md, Atlas windows, subtitles)
5. stills: `node tools/stills.mjs --comp Short --every 1 --out out/sheets/vN --scale 0.3 --cols 11`
6. sound: `python3 tools/mix.py` (SFX from out/timeline.json + music −21.6 dB sidechain + VO → −14 LUFS)
7. render: `rm -f out/chunks/part_*.mp4 && CONC=1 node tools/render.mjs` (60 fps, 16 chunks of 300 frames, ≈ 25 min); `ONLY=3 CONC=1 node tools/render.mjs` redoes a chunk
8. `python3 tools/srt.py`; QA: `python3 tools/qa_frames.py` (out/qa/seg0..3; it wipes out/qa), then `python3 tools/cut_frames.py`, `python3 tools/dupes.py`

## Code map
src/Short.tsx (sections, Atlas windows, subtitle Y) · src/scenes/{Hawaii,Etna,Iceland,GlobeHop,Inserts}.tsx · src/data/events.ts (events + SFX)
src/three/{TerrainMesh,Ocean,Sky,Globe,Billboards,fx,models,Stage3D,region}.ts(x) · src/ui/{gfx,Subtitles,Atlas}.tsx

## Known limits
- Etna and Heimaey imagery is still EOX Sentinel-2 10 m (no free sub-metre open imagery found with a usable licence).
- Etna 1992 diversion date: sources differ (23 vs 27 May) → no date on screen.
- Globe dive ends over plain ocean (Blue Marble 8k is the limit).
