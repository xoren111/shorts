# STATUS — «The Yellow Fleet», variant B with the friend's voice (21.10.2026)

= ../short_b (32.1 s cut, 1-DAY TRIP cold open, no dates in the opening, Atlas raised above YouTube's overlay) with the
friend's paid-plan take from ../short_f instead of Silas. v8, B and short_f are untouched.

- tools/make_b.py cuts ../short_f/data/vo_f.wav (friend's phrases already on the v8 clock) at the same B points
  (friend-specific: 9.650–11.750, 24.660–26.955 — in digital silence, ~0.23 s pause left; 0.15 s sounded rushed) and shifts ../short_f/data/words.json.
- Atlas = the friend lip-sync frames (public/atlas_f, from short_f) + DCUT; strike on 1-DAY TRIP at We(9) + 0.05.
- Re-run: `python3 tools/make_b.py && npx tsc --noEmit && node tools/check.mjs && python3 tools/mix.py && rm -rf out/chunks &&
  CONC=2 node tools/render.mjs && python3 tools/srt.py` → out/FINAL/the_yellow_fleet_B_friend.mp4 + .en.srt
- src/lib/time.ts takes DURATION = END and VO_END from the cut list (the hard-coded 32.125 of B cut the loop short).
- The 1-DAY TRIP card fades in with the loop dissolve → the last frame equals frame 0 (seamless loop).
- Delivered 21.10 ~23:55: out/FINAL/the_yellow_fleet_B_friend.mp4 (32.3 s, −14 LUFS, whisper: all words of the B script). Not uploaded.

- 22.10 correction (owner): the friend's take is NOT from a paid plan → treat it like the free ElevenLabs plan: «· 11.ai» in the title, no monetisation. Upload package: ../UPLOAD.md
