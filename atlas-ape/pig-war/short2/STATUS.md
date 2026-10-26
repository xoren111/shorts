# STATUS — «The Pig War» v2 («living oil painting», started 22.10.2026 after the owner's note on v1)

Owner 22.10: «эти человечки не нравятся … слишком мультяшный стиль, у нас более исторический — переделать стиль, чтобы набрать
просмотры». v1 (Kenney toy figures) stays in ../short (out/FINAL/the_pig_war.mp4). v2 = this folder, same VO/timing/edit.

## Look
- Realistic people: MPFB 2.0.18 (MakeHuman for Blender, extensions.blender.org, GPL; generated humans CC0) installed in an
  ISOLATED Blender profile ~/shorts/tools/blender_user (tools/blender/run.sh sets BLENDER_USER_RESOURCES); CC0/CC-BY asset
  packs in ~/shorts/tools/mpfb_assets (system assets CC0, hats01 CC0, hats03 CC-BY [bowler], skins02 CC0).
  tools/blender/hist.py: roles (us/uk/farmer/owner/governor/admiral/kaiser), recoloured suits as 1850s tunics + brass
  buttons, procedural shako/bicorne/pickelhaube, epaulettes, facial_hair (full beard grows by root scale.y, Kaiser chops,
  admiral whiskers), poses by 2-bone arm IK (POSES: stand/point/aim/hold/offer/raise/cheer/toast/behind/shoulder/port),
  walk_pose(), cloudy HDRI sky (assets/hdri, Poly Haven CC0), paint.py compositor = anisotropic Kuwahara oil strokes.
- Pig: Poly Pizza «Pig» TNvG3QUFlp (public domain) re-skinned as a Berkshire (animals.boar_pd; model snout at −Y),
  angel = halo + feather fans; mouth_potato().
- Island in real metres: island2.py (Poly Haven CC0 firs/grass/shrubs/cannon/rocks, decimated), real-size rifle.
- Shots: hook2, farm2 (caught/shot/british/price), bay2 (soldiers instanced in step/warships), deck2 (governor/admiral),
  camp2 (stayed/party), kaiser2, finale2; maps = v1 real-DEM frames run through paint_seq.py.

## DELIVERED 22.10 21:47 → out/FINAL
the_pig_war_v2.mp4 (43.85 s, 1080×1920, 60 fps, −14.0 LUFS, peak −1.1 dBFS) + the_pig_war_v2.en.srt (23 cues) + contact_sheet.jpg
+ CREDITS.md + YOUTUBE.md (= ../UPLOAD.md). Whisper on the final mix: all 100 words (numbers as digits; the soft «So» of «So both
sides» heard as «well» under music, clean when isolated). check.mjs all green. Nothing uploaded (owner uploads).
Finale was re-staged at the end (finale2.py): camera below the angel boar, blue kloofendal sky, gold metallic halo, wings
emission .6, 3/4 warm key from the camera side; pig sits between the poll card (y 150–350) and the subtitle (1010), clear of
Atlas. Rendered every 2nd frame (`--frames 1,3,…,319`) and doubled to 60 fps (≈ 7 s/frame otherwise).
Re-render recipe: `FRESH=1 tools/blender/shot.sh <shot>2.py <shot>`, then `ONLY=<chunks> CONC=2 node tools/render.mjs`
(300-frame chunks, 12 s each; delete nothing else) and `python3 tools/srt.py`.

## Paid voice (22.10 ~19:10)
Owner gave a PAID ElevenLabs key (Starter, 40k chars) → stored in ~/shorts/atlas-ape/.env.elevenlabs_paid (chmod 600, never in code).
../vo_paid/gen.py: 4 takes via API (Silas – Weathered Villain added to the account, voice WzVKtqQpTUUQ2JNx8YxI, eleven_v4,
stability .5 / similarity .75 / speed 1.0, mp3_44100_128 = Starter max), with character timestamps. tight.py = the same pause
rules, cuts never enter a word (letter-only spans). Takes 1/3/4 word-perfect; take 1 closest to the edit's rhythm.
fit.py: every sentence starts on the edit clock (data/words.json, unchanged → no shot re-render), 3 sentences ×1.08, others natural
→ ../vo_silas_paid_fit.wav (43.85 s). Subtitles use data/words_vo.json (tools/align_vo.py + clamp to sentence windows);
mix.py / atlas_scene.py use the new VO; Rhubarb + Atlas re-exported. Title no longer needs «11.ai» (../UPLOAD.md updated).
Whisper merges the soft «So» of «So both sides» (audio is there, energy −19 dB).
