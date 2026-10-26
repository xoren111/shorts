# STATUS — «He sold everything to meet her» (Atlas Ape #6), 24.10.2026

## Delivered 24.10 ~01:10 → out/FINAL
sold_everything_ai.mp4 (33.15 s after round 2, 1080×1920, 60 fps, −14.0 LUFS, TP −1.2 dBTP) + sold_everything_ai.en.srt + contact_sheet.jpg +
cover.jpg + CREDITS.md + YOUTUBE.md (no-spoiler title, «Altered or synthetic content» = yes).
Motion in second 0–1 = 15.9 on the moments metric (viral median 23.6, flops 10.3; dark night image limits it); VO 30.5 s,
3.3 words/s (Constantino C2, paid key).

## Round 2 (owner 24.10 ~01:30) — re-rendered
Owner notes → house/heart stickers out (her post captions «Widow 🌾 farm life», «My home can be yours 💛» at the top instead);
the Keaton film insert out (owner wanted recognizable meme scenes, not random film frames) → real memes, owner accepted the
Content ID risk: Confused Travolta on «Nobody had ever seen her», Stonks on «sell stuff», CJ «Ah sh*t, here we go again» after
«I'm going again» (with its voice line, music out); followers beat faster (counter 0.8 s → zoom-out to a wall of phones);
the quote as big kinetic text (3 cards), Atlas moved top-left; the ending no longer idles: VO → CJ meme → 0.3 s loop.
Short is now 33.15 s.

## Round 3 (owner 24.10 ~01:45) — re-rendered 01:42
- Stonks is no longer a separate cut: Meme Man (cut out → public/memes/meme_man.png) rises OVER the shop frame after the cursor
  clicks SHOP NOW, our green arrow shoots up, STONKS text, money rain (💵/💰) — ≈0.9 s instead of 0.47 s.
- 300K beat: her profile header (counter 0 → 300,000, accelerating) + a feed of «started following you» toasts with faces cut from
  the new Flow crowd shot (fx/av_00–14.png), faster and faster → the crowd shot (flow/F7_crowd_j.jpg: F7 with her picture warped
  onto the phone screens, tools/crowd_screens.py) opens out of the newest avatar, «+» badges pop over heads, hearts.
  Subtitles now show «people followed her» over the crowd (HIDE 28–30 only).
- Palette: our text YELLOW (#FFD84A), accents PURPLE (#B266FF / #7A2BE8) — subtitles, captions, chips, route, KeyFact, MADE BY AI,
  shop pills, quote, CJ caption. No tilted text anywhere: stamps/pills/quote straight; animations = rise-out-of-mask, bar wipes, pops.
- Motion 0–1 s 15.8; −14.0 LUFS (mix), TP −1.2.

## Round 4 (owner 24.10) — re-rendered
Owner: «верни цвет текстов» → subtitles and every text back to white + gold (MADE BY AI white + red, pills gold/green/white/red,
quote white + gold with a gold underline wipe, CJ white); the yellow + purple look stays ONLY in the followers beat (owner liked
it there: header, toasts, «+» badges). Feed subtitles moved up (subY 1330) — they ran into her name + Follow in the phone UI;
creator subY 1440. Text stays straight (no tilts).

## Round 5 (owner 24.10) — re-rendered, now 32.45 s
1. Meme Man had half a face (GrabCut lost it in the pink glow) → hand-traced head/shirt mask + inpainted dome (tools/fix_meme_man.py).
2. Radio: the big white bars → thin gold radio waves rippling out of the microphone.
3. CJ meme faster: lead-in and the pause cut, 1.25× (clip + sfx/cj_fast.wav), two caption lines; ending −0.7 s.
4. The quote is no longer text over a still: «he said» → the camera drops to his phone → zoom-through → profile cards of new
   women, swiped right (fx/card_N.jpg from the crowd shot) on «I'll find another one»; «Same place» → the map again, Belo
   Horizonte pin drops + pulses (Atlas pops in); «I'm going again» → the route redraws, the bus sets off, a bus ticket
   Imperatriz → Belo Horizonte slides up. Quote words are in the subtitles now (HIDE 28–30, 72–76 only).

## Round 6 (owner 24.10) — re-rendered, now 32.75 s
Owner: after «he said» the frames changed too fast and CJ talked too fast → the phone/swipe/ticket ending is gone (fx/card_*,
make_cards.py deleted): «Back home» stays on the bus, then from «he said» ONE calm map shot (dissolve): a heart pin drops on
Belo Horizonte («he'll look for love there»), hearts rise, «Same place» → pulse + lean in (Atlas pops in), «I'm going again» →
the route redraws and the bus sets off. CJ tightened only at the start/pause and played at 1.08× (sfx/cj_cut.wav, ≈1.8 s).

## Owner brief (24.10)
Mixed design / edit elements; Flow + Gemini where needed; free photos; own graphics; smooth transitions; memes / film frames if
legal. Text: no mother, the AI twist only at the radio (hook-no-spoiler memory).

## How it is built
- Clock: data/words.json (= ../vo_constantino_C2_final_words.json). Facts: ../FACTS.md. Shot table: ../SCRIPT.md.
- src/Short.tsx: 11 beats + transition engine (zoom-through his phone, whips, push-up, punch, circle), Atlas thumbs-up card at
  the end, subtitles (counter + MADE BY AI phrases hidden), loop dissolve to frame 0, grain.
- src/scenes.tsx: Sold (crash-zoom out + 4 SOLD stamps with camera kicks), Feed (phone UI + Veo clip, hearts, stickers),
  Followers (profile card 0 → 300,000), Went (meme zoom + Keaton film insert), Route (Natural Earth map, IMPERATRIZ + BH terminal
  Commons photos, 2,000+ km), Strangers, Nobody (her photo over the real BH skyline, shrug emoji), Radio (ON AIR, waveform,
  push-in), Reveal (glitch → pixels → tiles fall, MADE BY AI), Creator (shop buttons), End (quote marks, light leak).
- Assets: public/flow (6 Flow + F1_veo.mp4), public/fx (pixel frames from the Veo frame, grain), public/archive (Commons),
  public/film/keaton_run.mp4 (The General 1926, PD), public/atlas/atlas_thumbs_phone.png (Gemini), src/data/map.json.
- SFX: src/data/events.ts (37 events, 62 cues) + 8 ElevenLabs SFX (tools/sfx_el.py); music out on «That's where…», back on «Her creator».

## Re-render
`npx tsc --noEmit && node tools/check.mjs && python3 tools/mix.py && rm -rf out/chunks && CONC=3 node tools/render.mjs && python3 tools/srt.py`
(≈ 1 min). One chunk: delete out/chunks/part_NN_* and `ONLY=NN node tools/render.mjs`.
