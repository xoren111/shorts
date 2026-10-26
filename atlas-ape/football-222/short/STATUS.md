# STATUS — «222–0» (Atlas Ape #5), 23.10.2026

## Delivered 23.10 ~23:12 → out/FINAL
the_222_game.mp4 (30.5 s, 1080×1920, 60 fps, −14.0 LUFS, TP ≤ −1.3 dBTP) + the_222_game.en.srt (20 cues) + contact_sheet.jpg +
cover_222.jpg + CREDITS.md + YOUTUBE.md (title, description, pinned comment, «Altered or synthetic content» = yes).
Motion in second 0–1 = 21.8 on the moments metric (viral median 23.6, flops 10.3, our old Shorts 3.0); hard cut at 1.2 s;
VO 30.0 s at ~2.97 words/s (Constantino, paid key).

## Owner brief (23.10)
Semi-real / semi-cartoon look, as many viewers as possible, smooth transitions and effects; Flow for pictures, Gemini for Atlas
poses; Blender / Vox allowed. Mid-build correction: «not a collection of Flow photos — mixed content» → 14 Flow frames cut to 6
(unused ones in ../flow/unused), base = real 1916 archive + drawn graphics.

## How it is built
- Clock: data/words.json (= ../vo_constantino_v4_final_words.json). Shot table: ../SCRIPT.md. Facts: ../FACTS.md.
- src/Short.tsx: BEATS (13) + transition engine from Pig War v3 (punch / whip / up / diag / zoomthru / circle / fade), Atlas
  ending (Gemini cards public/atlas, shock → three-clap slow clap), subtitles with big-number phrases hidden, loop dissolve, grain.
- src/scenes.tsx: one component per beat. src/ui/vox.tsx: paper ground, torn prints with tape, marker rings, grain, shake, dust,
  speed lines, captions. src/ui/gfx.tsx, Subtitles.tsx, real.tsx: channel kit (Pig War v3).
- Archive: public/archive (Commons PD; originals + unused in ../archive, links in ../archive/_sources.txt).
- Atlas cards: tools/cutout_cards.py (../gemini/*.jpg → public/atlas/*.png, same cut as orangutan pose_card.py).
- SFX: src/data/events.ts (35 events, 64 cues); 4 ElevenLabs SFX via tools/sfx_el.py (paid key, cached in data/sfx_el).

## Re-render
`npx tsc --noEmit && node tools/check.mjs && python3 tools/mix.py && rm -rf out/chunks && CONC=3 node tools/render.mjs && python3 tools/srt.py`
(≈ 1 min). One chunk only: delete out/chunks/part_NN_* and `ONLY=NN node tools/render.mjs`.
Stills: `node tools/stills.mjs --comp Short --t 1,2.5,4 --out out/stills/x --scale 0.4`.
