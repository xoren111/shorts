# STATUS — «Australia vs Rabbits» Short (build started 19.10.2026)

Inputs: ../SCRIPT.md (beats), ../voiceover.txt, ../FACTS.md (only allowed facts), VO take = ../vo_silas_v4_gen2.mp3 (61.15 s,
owner's pick), music = ../music.mp3 (channel bed «Frame-Dragging», same file and settings as «Humans vs Volcano»).
Shot plan: SHOTS.md. Style rules: ../../volcano/short/STYLE.md (no text twice, ≤ 1 label, dissolves, Atlas only hook/key/end).

## Pipeline (re-run in this order after a change)
1. timing: `whisper-cli … -ml 1 -sow -dtw large.v3.turbo -nfa -ojf -of data/whisper_words -f data/vo16k.wav` → `python3 tools/align.py`
   (data/words.json, all 118 words match voiceover.txt); lip sync `~/shorts/tools/rhubarb/rhubarb --extendedShapes GHX -f json
   -d ../voiceover.txt -o data/rhubarb.json data/vo44k.wav`
2. Atlas: `python3 tools/atlas_scene.py` (→ ~/shorts/orangutan/scenes/rabbits_short.json; new data-only clip
   animations/magnifier_look.json) → `cd ~/shorts/orangutan && npm run export -- rabbits_short --w 1800 --h 1400`
   → `python3 tools/atlas_webp.py ~/shorts/orangutan/out/rabbits_short/frames` (public/atlas, 1860 frames)
3. geo: `node tools/geo/build-geo.mjs` (src/data/geo.json from Natural Earth + DPIRD fence; node_modules → barbarossa-1941-v2)
4. SFX: `python3 tools/sfx_rabbits.py` (16 new procedural sounds) on top of the volcano library copied into public/sfx
5. Blender toon shots: `tools/blender/render_all.sh` (one GPU render at a time; KEEP=1 post-processes finished out/ folders,
   FORCE=1 re-renders, ONLY='score.py|:score' for one) → tools/blender/post.py → public/blender/<shot>/f_NNNN.jpg.
   Shared kit: tools/blender/kit.py (toon bands, ink hull, violet sky, procedural rabbit + crowd instancing, Kenney CC0 → toon,
   sRGB colours via C('#hex')); shot windows: tools/blender/shots_t.py = src/data/shots.ts (keep in sync).
   Test a shot fast: `NOLOCK=1 tools/blender/run.sh tools/blender/<shot>.py -- [--variant …] --frames 1,60 --scale 40 --samples 8`
6. check: `npx tsc --noEmit && node tools/check.mjs` (anchors, gaps ≤ 2.5 s, SFX, photos+credits, Blender coverage, numbers vs FACTS.md)
7. sound: `python3 tools/mix.py` (music −21.6 dB + sidechain, out at «Three», → −14 LUFS)
8. stills: `node tools/stills.mjs --comp Short --every 1 --out out/sheets/vN --scale 0.3 --cols 11`
9. render: `rm -f out/chunks/part_*.mp4 && CONC=2 node tools/render.mjs` → out/FINAL/australia_vs_rabbits.mp4; `python3 tools/srt.py`

## Gotchas found
- Kenney Nature Kit colours are mint/teal in linear space → tinted via kit.KENNEY_TINT; author all colours with C('#hex').
- In shot scripts use bpy.context.scene, not `sc` (the kit's global is rebound after `from kit import *`).
- An Empty's hide_render does not hide its children → kit.set_visible().
- Blender args must follow `--` (render_all.sh had a bug that silently dropped --variant; fixed).

## v4 (19.10, ~22:10)
- VO = ../vo_silas_v4_gen2_mult.wav (line 3 «Turns out, rabbits can multiply.» spliced in). tools/mix.py had a hard-coded
  old VO path → v3 still said «cards». After any VO change: grep tools/ for the VO filename and whisper the FINAL mp4.
- Lesson shot (tools/blender/lesson.py): light hold (cream floor, pale-teal walls) so the brown rabbits read; board =
  carrot × 2 = two carrots; six extra students pop in on «multiply».

## v5 (19.10, ~22:45) — owner's 5 notes on v4
1. Shields: badges centred above each animal's head (corner badges read as «falling off»); the six step back smaller/higher, the
   chicken stands centre under a dashed «?» badge.
2. Rodd Island (tools/blender/island.py rewritten): lab interior — window onto the harbour, bench, brass microscope, violet culture
   bubbling over a spirit lamp, test tubes, petri dishes, caged worried rabbit; a big detailed procedural hen flaps on «chicken»,
   leans to the flask on «cholera».
3. Scratch (fence.py --variant scratch rewritten): soil cut-away under the fence — dig → dive → tunnel under the buried netting →
   pops out on «out.» by his gang. Tunnel = two sets of flat discs on the section face revealed behind the rabbit.
4. Wardang: real aerial photo dropped (unclear) → tools/blender/wardang.py: toon island from above → swoop to the quarantine pen,
   virus pops on «virus», gate + padlock on «locked», pull back on «on an island». Photo removed from CREDITS/description.
5. Bar: the rabbit leaps as the bar drops and lands on the new top with dust.
Gotcha: bmesh create_grid(size=1) spans −1…1; a plane rotated 90° about X needs its scale in local X/Y (not Z).

**FINAL: v5 approved by the owner 19.10.** Deliverables in out/FINAL/.
