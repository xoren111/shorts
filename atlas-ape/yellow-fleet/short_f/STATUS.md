# STATUS — «The Yellow Fleet», v8 with the friend's voice (21.10.2026)

A copy of ../short (v8, untouched) with the voice-over the owner's friend generated on a paid plan (no «11.ai» needed):
data/friend/friend_take.mp3 (40.2 s, the full v8 text, ~0.5 s pauses). Picture = v8: same shots.ts, same Blender frames.
public/ is a symlink to ../short/public; the new Atlas lip-sync frames live in ../short/public/atlas_f (v8 uses atlas/).

## Pipeline
1. `python3 tools/fit_friend.py` — each of the 21 phrases starts where it starts in the v8 Silas take (waveform onsets);
   phrases longer than their slot sped up ≤ ×1.08 (only 8 needed it, max ×1.079 «Kitchen clocks») → data/vo_f.wav (+ vo16k/vo44k)
2. whisper (STATUS of ../short) → `python3 tools/align.py` (Silas splice OVERRIDE removed) → data/words.json
3. src/data/shots.ts = the v8 file (regenerating it moved windows ≤ 0.15 s and would run past the rendered frames)
4. Rhubarb on data/vo44k.wav → `python3 tools/atlas_scene.py` (scene yf_short_f, audio yf_vo_f.wav) →
   `cd ~/shorts/orangutan && npm run export -- yf_short_f --w 1800 --h 1400` → `python3 tools/atlas_webp.py ~/shorts/orangutan/out/yf_short_f/frames`
5. `node tools/check.mjs && python3 tools/mix.py && rm -rf out/chunks && CONC=2 node tools/render.mjs && python3 tools/srt.py`
   → out/FINAL/the_yellow_fleet_friend.mp4 + .en.srt

- 22.10 correction (owner): the friend's take is NOT from a paid plan → treat it like the free ElevenLabs plan: «· 11.ai» in the title, no monetisation. Upload package: ../UPLOAD.md
