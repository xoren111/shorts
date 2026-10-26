# STATUS — «The Pig War» Short (Atlas Ape #4, built 22.10.2026)

Inputs: ../SCRIPT.md (storyboard), ../voiceover.txt (100 words), ../FACTS.md, VO = ../vo_silas_v4_gen1_tight.wav (ElevenLabs Silas,
Eleven v4, generation 1, stability 50 / similarity 75; pauses cut to 0.22 s by ../../yellow-fleet/tools/tighten.py, 0.3–0.4 s
kept before punchlines; NO speed-up — owner 22.10: «без ускорения, с первой генерации»). 43.15 s; Short = 43.85 s (loop).
Other takes: ../vo_silas_v4_gen2*.mp3 (v4 gen 2), ../vo_silas_m2_sp115_gen1.mp3 (Multilingual v2, speed 1.15 — v4 has no Speed slider).
Music: ../music.mp3 (channel bed «Frame-Dragging»), out at «Total casualties».

## Look
Lit stylised 3D like Yellow Fleet v8 (yf2.py: EEVEE ray tracing, sunset HDRI, violet sky), Kenney Mini Characters in 1859
uniforms. New kit (tools/blender):
- pw.py — uniforms by UV remap into assets/pw_colormap.png (tools/make_palette.py; schemes us/uk/farmer/owner/governor/
  admiral/kaiser), hats (kepi, shako, bicorne, tophat, pickelhaube, straw, bowler), beards (full/chops/whiskers, grow by
  root scale z), rifle + carry() (follows the hands every frame: aim/port/shoulder), notes, the Berkshire boar pig()
  (+ angel: halo, wings) with pig_pose modes chew/idle/walk/float, proto()/inst() collection instancing for crowds.
- env.py — glb() Kenney import with PBR re-tint (image-texture models keep their atlas), meadow with hills + shore,
  hilled potato bed, firs, rocks, tufts, sea, mountains (Mt Baker), log cabin with hinged door, rail fence, flag poles, tents, cannons.
- frigate.py — 1850s screw frigate: white gun-deck band, ports with lids + guns (ports(F, k)), masts/yards/furled sails,
  rigging, funnel smoke plume, ensign + pennant.
- island.py — the shared world layout (farm, US hill camp, shore, bay, far mountains) → build(...).
- shots: hook.py, farm.py (caught/shot/british/price), bay.py (soldiers/warships), deck.py (governor/admiral),
  camp.py (stayed/party), kaiser.py, finale.py; map.py (map/mapfinal, real DEM, made by a helper agent: tools/geo_pnw.py).
- Textures: Poly Haven CC0 (farm_soil, leafy_grass, sparse_grass, wood_trunk_wall, pine_bark, roof_planks, weathered_planks,
  seaside_rock, dark_wooden_planks, forest_ground_04) in assets/cc0/polyhaven.

## Pipeline (re-run in this order after a change)
1. timing: whisper-cli … -ml 1 -sow -dtw large.v3.turbo -nfa -ojf -of data/whisper_words -f data/vo16k.wav → `python3 tools/align.py`
   (EXPAND maps whisper digits back to words: $10 → ten dollars, 100 → a hundred, 400 → four hundred, 12 → twelve)
2. shot windows: tools/blender/shots_t.py → `python3 tools/shots_ts.py`
3. Atlas: rhubarb → `python3 tools/atlas_scene.py` → `cd ~/shorts/orangutan && npm run export -- pw_short --w 1800 --h 1400`
   → `python3 tools/atlas_webp.py ~/shorts/orangutan/out/pw_short/frames`
4. Blender: `tools/blender/shot.sh <script.py> <shot> [--variant v]` (GPU lock via run.sh, then post2 grade → public/blender/<shot>)
   quick test: `NOLOCK=1 tools/blender/run.sh tools/blender/farm.py -- --variant price --frames 30,110 --scale 30 --samples 8`
5. check: `npx tsc --noEmit && node tools/check.mjs` · sound: `python3 tools/mix.py`
6. stills: `node tools/stills.mjs --comp Short --every 1 --from 0 --to 43.8 --out out/sheets/v1 --scale 0.3 --cols 11`
7. render: `rm -f out/chunks/part_*.mp4 && CONC=2 node tools/render.mjs` → out/FINAL/the_pig_war.mp4; `python3 tools/srt.py`

## Gotchas
- Kenney figures face −Y at yaw 0; to face d: yaw = atan2(d.x, −d.y). Pig faces +X.
- prim() puts the size into the OBJECT scale: never overwrite .scale with (k, k, k) for a pop — multiply the base scale.
- Kenney male kinds: a = glasses (governor), b = bald + ginger beard (the owner), c = police cap, d = ginger spiky (farmer),
  e = glasses + gloves, f = dark hair, angry brows (soldiers, admiral, Kaiser).
- Grass material: no Sheen (it washed the meadow mint-white at grazing angles).
- Order in render2: shot update → tick_v2 (clips) → view_layer.update → UPDATERS (pig, rifles, notes, flags).

## v1 delivered 22.10.2026 ~12:05
out/FINAL/the_pig_war.mp4 (43.85 s, 1080×1920, 60 fps, H.264 + AAC 48 kHz, −14.0 LUFS, peak −1.1 dBFS), the_pig_war.en.srt
(23 cues), contact_sheet.jpg, CREDITS.md, YOUTUBE.md (= ../UPLOAD.md). whisper on the final audio: all 100 words; last frame =
frame 0 (mean abs diff 1.25/255 → seamless loop). check.mjs all green. Not uploaded.
SFX: 22 new sounds by a helper agent (tools/sfx_pig.py, freesound CC0 previews + Commons PD/CC BY; sources in CREDITS.md).
Map shots by a helper agent (tools/geo_pnw.py + tools/blender/map.py; DEM z12, bathymetry z8, lines relaxed onto channel centrelines).
