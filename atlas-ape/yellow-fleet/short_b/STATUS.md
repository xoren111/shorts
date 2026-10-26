# STATUS — «The Yellow Fleet», variant B (21.10.2026, channel-audit notes)

A copy of ../short (v8) for an A/B look; v8 itself is untouched. public/ is a symlink to ../short/public (same Blender,
Atlas and SFX assets — nothing re-rendered in Blender).

## What differs from v8
- 32.1 s instead of 36.7 s: «And the canal became the front line.» and «In the end, just two could still sail.» are cut
  from the VO in the pauses (tools/make_b.py → data/vo_b.wav, data/words.json with `cut` flags, src/data/shots.ts with
  the front + twosail shots gone; sink holds until the lake, the podium until the route map).
- Cold open: big «1-DAY TRIP» over the convoy from frame 0, crossed out by a red marker stroke in the pause after «trip.»,
  then 8 YEARS at the same spot (subtitles of both phrases step aside).
- No dates in the opening: the «June 1967» locator card, the 1967/1975 numbers on the bar and the «Six-Day War» label are gone.
- Atlas (ending only) 220 px higher: his face sits above YouTube's title / channel / Subscribe overlay; hold subtitles at y 980.

## Re-run
`python3 tools/make_b.py && npx tsc --noEmit && node tools/check.mjs && python3 tools/mix.py && rm -rf out/chunks &&
CONC=2 node tools/render.mjs && python3 tools/srt.py` → out/FINAL/the_yellow_fleet_B.mp4 + .en.srt
Atlas frames stay on the v8 clock (src/ui/Atlas.tsx adds DCUT).
