# STATUS — «The Yellow Fleet» Short (build started 21.10.2026)

Inputs: ../SCRIPT.md (beats), ../voiceover.txt (40 s version: line «The ships stayed. The crews changed every few months.»
cut on the owner's OK after the volcano retention data; the 44 s text is ../voiceover_44s.txt), ../FACTS.md, VO =
../vo_silas_v4_gen2_tight40.wav (40.30 s = vo_silas_v4_gen2_tight.wav with 27.535–31.193 s removed in the pause),
music = ../music.mp3 (channel bed «Frame-Dragging», −21.6 dB + sidechain, out at «Part of the cargo?»).
Pipeline = «Rabbits» v5 (Remotion 60 fps + Blender toon shots) with a new episode kit tools/blender/yf.py.

## Pipeline (re-run in this order after a change)
1. timing: whisper-cli … -ml 1 -sow -dtw large.v3.turbo -nfa -ojf -of data/whisper_words -f data/vo16k.wav → `python3 tools/align.py`
   (homophone cruise→crews; sentence-initial short words use whisper's segment start; OVERRIDE {68: 27.64} = «In» after the splice)
   lip sync: `~/shorts/tools/rhubarb/rhubarb --extendedShapes GHX -f json -d ../voiceover.txt -o data/rhubarb.json data/vo44k.wav`
2. shot windows: edit tools/blender/shots_t.py → `python3 tools/shots_ts.py` (writes src/data/shots.ts)
3. Atlas rig: `python3 tools/atlas_scene.py` → `cd ~/shorts/orangutan && npm run export -- yf_short --w 1800 --h 1400`
   → `python3 tools/atlas_webp.py ~/shorts/orangutan/out/yf_short/frames` (public/atlas, 1230 frames)
   Hook pose card (owner's Gemini drawing «salute», ~/shorts/orangutan/pose_pack/in/pose_salute.png):
   `cd ~/shorts/orangutan && python3 experiments/pose_cards/pose_card.py pose_pack/in/pose_salute.png out/pose_cards/salute --rgba
   ~/shorts/atlas-ape/yellow-fleet/short/public/card_salute --rhubarb …/short/data/rhubarb.json --t0 0 --t1 4.2 --height 1150 --blinks 1.55`
4. flags: `python3 tools/flags.py` (assets/flags) · SFX: `python3 tools/sfx_yf.py` (20 new procedural sounds)
5. Blender: `FORCE=1 tools/blender/render_all.sh` (13 shots, ~2 min each; ONLY='suez.py|--variant war:war' for one)
   scripts: suez.py (then/later/war/front/lake/storm/twosail), decks.py (friends/football/race/podium), hamburg.py, hold.py
   fast test: `NOLOCK=1 tools/blender/run.sh tools/blender/suez.py -- --variant then --frames 1,120 --scale 40 --samples 8`
6. check: `npx tsc --noEmit && node tools/check.mjs` · sound: `python3 tools/mix.py`
7. stills: `node tools/stills.mjs --comp Short --every 1 --from 0 --to 41 --out out/sheets/v1 --scale 0.3 --cols 11`
8. render: `rm -f out/chunks/part_*.mp4 && CONC=2 node tools/render.mjs` → out/FINAL/the_yellow_fleet.mp4; `python3 tools/srt.py`

## Gotchas
- yf.water must use world Position for the wave texture (object coords on a scaled plane = giant stripes).
- puff() ink is in LOCAL units of a radius-1 sphere: 0.03–0.06, never 0.5 (ring artefacts when scaled down).
- hull stem rake must end at the deck edge (zd), else small boats grow a «sail» fin.
- a flag parented to a raised arm flips upside down → winner's flag on its own pole.
- storm wall must die out before reaching the camera (big puffs filling the lens = flat cream screen).

## v1 delivered 21.10.2026 ~11:50
out/FINAL/the_yellow_fleet.mp4 (41.0 s, 1080×1920, 60 fps, H.264 + AAC 48 kHz, −14.0 LUFS, peak −1.3 dBFS), the_yellow_fleet.en.srt,
contact_sheet.jpg, CREDITS.md, YOUTUBE.md. Final audio re-transcribed by whisper: all 100 words, splice clean. Not uploaded.
Late fixes: Hamburg photo label moved to the top (overlapped the subtitle), Atlas finale enters at hold+0.4 s (covered the photo credit).

## v2 delivered 21.10.2026 ~13:06 (owner: real photos «sudden / out of context», «textures and people look cheap»)
- All archive photos removed (lake, mine-sweeping, Hamburg) → 3D only; Hamburg date is a label on the toon pier.
- New look = tools/blender/yf2.py, switched on in every shot script by `yf2.enable_v2(globals())`: EEVEE ray tracing +
  soft sun + CC0 sunset HDRI for light (camera still sees the channel's violet gradient), Khronos PBR Neutral view,
  Poly Haven CC0 textures (assets/cc0/polyhaven), detailed ship2 (round bilge, portholes, window rows, railings, davits,
  vents), reflective animated water2, textured sand, soft clouds, Kenney Mini Characters (CC0, assets/cc0/kenney-mini-characters)
  driven by their own clips (pose_at evaluates each character's clip on its own clock; set_clip(D, 'jump'|'walk'|…)).
  Grade: tools/blender/post2.py (saturation 1.18, contrast 1.05, soft glow). ~1.1 s/frame, ~50 min for all 13 shots.
- First-second teaser: blender/later/f_0060.jpg (same camera, 8 years later) for 0–0.6 s, dissolve to 1967; the loop
  ends on the same image.
- Gotcha: zsh `set -- $v` does not split words → use ${=v}; yf2.desert2 must call the ORIGINAL yf.desert (_v1_desert).

## v3 (21.10 ~13:25): Atlas out of the first 3.7 s (owner agreed: «Atlas = reaction, not decoration»)
Teaser + 1967 convoy play clean; Atlas pops in lower-right (x 820, s 0.6) on «They got out eight years later», laughs at
«Poland won», owns the ending. The salute pose card is no longer used in this Short (kept in public/card_salute, pipeline
in orangutan/experiments/pose_cards). out/FINAL re-rendered (41.0 s, −14.0 LUFS).

## v4 (21.10 ~15:56): faster + graphics (owner: «more dynamic, better textures, the video looks like it has no graphics»)
- VO = ../vo_silas_v4_gen2_tight40_x112.wav (atempo 1.12 → 35.99 s), Short 36.7 s; align OVERRIDE {68: 24.678}; END 36.7,
  LOOP_T 36.0; Atlas re-exported (1101 frames). Grep tools for the VO name after any change (atlas_scene.py, mix.py).
- Motion graphics: src/scenes/Graphics.tsx (HookMap locator «June 1967», YearsBar 1967→1975, TrappedMap Great Bitter Lake
  with 14 ships + closed exits, FlagsBar 8 flags split by the Cold War line, RouteMap Suez → Hamburg full-screen) from
  Natural Earth 10 m (tools/geo/build-geo.mjs → src/data/geo.json); flags copied to public/flags.
- 3D: hull plate seams (pbr plates=True), wakes on moving convoy ships, CC0 rocks/dry bushes on the banks
  (desert_dressing), DOF on close shots (yf2.dof). World fog dropped: EEVEE world volume blacks out the sky.

## v5 delivered 21.10 18:30: VFX + people + ships quality pass (owner: «ящик тумана», football, ball-chain water/smoke, 8 YEARS unreadable)
- Volumetrics (yf2.py): volume_box (billowing 4D-noise volume, grounded/top_var/mottle, DENS value in VOLD[name]), plume (cone
  smoke trail from a source along local −X, world-space noise so smoke stays in the air), haze_box (thin air for light
  shafts), cloud2 = volumetric cumulus (flat base). Sandstorm = one big volume_box that rolls in, swallows the fleet and
  settles (DENS → 0) before «Yellow Fleet»; war smoke columns = vertical plumes; funnel smoke = plume parented to the ship.
- Thin trails (jet smoke) and water jets are MESH tubes with a fake-volume shader (facing falloff × flowing noise), not
  volumes: froxel volumes band («zipper») on anything thinner than a few tiles. water_jet = core + droplet sheath + mist.
- fireboat2 (red hull, wheelhouse, monitor platform), jet2 (delta-wing fighter, natural metal), ship_extras (bulwarks,
  wheelhouse window band + visor, radar mast, yards, stays/shrouds, topping lifts + cargo hooks, funnel guys, anchors),
  ship_name (MÜNSTERLAND / NORDWIND bow lettering), wood_mat + board (procedural planks on real-size meshes; the crate).
- People: pose_cheer/cheer (procedural raised-arm wave / V-cheer / flag swing over any clip), hand_flag (bone-parented),
  sprint root bounce damped ×0.35 (Kenney sprint hops 30 % of body height). Football rebuilt: broadcast angle from the
  bridge wing, striker dribbles → kick (contact 0.175 s into attack-kick-right) → keeper dives → net bulges → celebration.
- Hamburg recomposed (ship centred under crossing water arches, 170-strong crowd with flags, darker Elbe water, no DOF).
- Hold: plank crate, ship's frames on the walls, thin haze for the hatch light, crate-dust volume on «Kitchen».
- Remotion: KeyFact gets an ink outline layer + dark radial scrim; Label shadow = 8-direction ink outline.
- Gotchas: a volume's bounding cube casts a hard sun shadow across itself → visible_shadow = False; volumetric shadows +
  128 samples give the billow structure (64 looks flat); use_volume_custom_range must be True or volumetric_start/end are
  ignored; volume shadows only see the froxel grid, so a box edge can print a straight shadow line — sun from the side.
- Delivered: out/FINAL/the_yellow_fleet.mp4 (36.7 s, 1080×1920, 60 fps, −14.0 LUFS, peak −1.3 dBFS), srt + contact sheet
  refreshed; whisper on the final audio = 101/101 words of ../voiceover.txt; check.mjs all green. Not uploaded.
  13 Blender shots ≈ 75 min at 28 samples (storm ≈ 2.9 s/frame with 128 volume samples).

## v6 delivered 21.10 ~18:50: no Atlas (owner: «с этого эпизода убери макаку»)
AtlasLayer + ATLAS windows removed from src/Short.tsx, subtitles fixed at y 1450, Atlas-only SFX dropped (pop-in on
«They», sparkle on «Olympics»), check.mjs no longer requires public/atlas frames (the export stays on disk). CREDITS and
YOUTUBE.md no longer list Atlas. out/FINAL re-rendered: 36.7 s, −14.0 LUFS, peak −1.3 dBFS; whisper 101/101 words
(«Fourteen» comes back as the digit 14). Not uploaded.

## v7 delivered 21.10 ~19:00: Atlas back for the ending only (owner: «в конце хоть бибизянку оставь»)
ATLAS = one window (hold[0] + 0.4 → 36.45, big lower-left), subtitles at 1150 in the hold (above his hat), 1450 elsewhere;
check.mjs Atlas-frames check restored; credits list Atlas again. out/FINAL: 36.7 s, −14.0 LUFS, whisper 101/101.

## v8 (21.10 evening): owner's 7 screenshots — «кадры чтоб были engaged», unclear shots replaced
- Opening: the yellow flash-forward teaser is gone (owner: «непонятно почему меняется флот»); the loop dissolves back to
  then/f_0001. 'later' = the SAME convoy ageing on screen (dust 0 → 1 + sky dawn → haze) in sync with the 1967→1975 bar; no tugs.
- Stamps: the 2D diagram is replaced by a 3D shot (decks.py --variant stamps): a sailor stomps on the linocut block (FACTS D1),
  hops off, the block flips (inked relief up), push-in on the yellow stamp sheet (tools/make_stamp_tex.py → assets/stamps).
- Olympics: race full-screen + two picture-in-picture cards (decks.py --variant dive | sprint, 720×480; InsetCard in
  Short.tsx): a head-first dive off a plank with a water-arch splash, a sprint where the winner breaks the finish tape.
- Podium: wide low ceremony shot — 2·1·3 blocks with numbers, three flagpoles (Poland highest), cup held overhead, medals,
  confetti, crew cheering.
- Two sail: now over the lake — the two German ships fire up (plumes), sidestep out of their raft and steam off; the rest stay.
- Hamburg: only the two crossing arches, no mist blobs, lighter droplet veil.
- Football: from behind the goal, above the net — striker runs at us, shot, keeper dives the wrong way, net bulges at us.
- Kenney arms FIXED: at identity the arm sticks out sideways (T-pose); D0 = measured hand direction in bone space,
  pose_cheer rotates D0 onto a target direction (modes up / both / wave / flag). All v5–v7 crowd «cheers» crossed the
  arms in front of the belly — every crowd shot re-rendered.
- v8 delivered 21.10 ~22:00: out/FINAL re-rendered (36.7 s, 1080×1920, 60 fps, −14.0 LUFS, peak −1.2 dBFS), whisper
  101/101, check.mjs green; football subtitles at y 1170 (goal mouth clear), inset cards 600×400. Not uploaded.
