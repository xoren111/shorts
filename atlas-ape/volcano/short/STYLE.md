# STYLE v3 — calm, clear, smooth (owner notes 18.10, round 3)

Owner's words, summarised: texts duplicate each other and the subtitles («по смыслу и заголовок»); too many unclear texts
at once; angled texts too big and too tilted, they hide the picture; the lava blinks; the video must be as smooth as
possible, cuts included; the viewer must understand the whole composition without effort and texts must not get in the way.
Reference style: GeoGlobeTales Shorts (e.g. youtube.com/shorts/xGmyqt_Ild0, «Why the Caspian Sea is not a sea»):
- one small subtitle line low in the frame (1–3 words);
- at most ONE label on the picture, horizontal, white bold sans with a soft shadow, Title Case, placed ON the thing it names,
  numbers/keywords in yellow; flat clean icons/diagrams instead of badges;
- no chips, stamps, stickers, rotated headlines, rolling counters, flashes, light leaks or shakes;
- the map/camera moves continuously and slowly; shots dissolve into each other.

**Owner clarification (18.10, 12:05): do NOT copy the reference's look.** Our own style stays — bright colourful 3D, lava
glow, energetic camera moves, real photos, effects (explosions, steam, embers, jets), Atlas. From the reference we take ONLY
(1) texts that do not jump into the eyes and (2) normal, smooth transitions. Dynamic-but-smooth, not slow or flat.

## Text rules (checked by tools/check.mjs + OCR QA)
1. The subtitle (src/ui/Subtitles.tsx) is the voice. It stays as it is.
2. Besides the subtitle, at most ONE text element is on screen at any moment (photo credit lines excepted — they are
   required by the licences; keep them small, at the bottom, one at a time).
3. A label may NOT repeat a word or number that is spoken within its window ±0.6 s (and not one that the subtitle shows at
   that time). It must ADD information the voice does not give at that moment: a place name the voice does not say
   (Mauna Loa, Hilo, Zafferana Etnea, Heimaey, Eldfell), an exact date the voice does not say (27 Dec 1935), a unit
   conversion (7.3 million m³). If an element only echoes the voice, delete it or turn it into a picture (icon, highlight,
   arrow, diagram) without text.
4. No section chips («HAWAII • 1935» etc.), no DateStamp stickers, no Stamp, no BigText headlines, no Counter rolling numbers.
   Use `Label` from src/ui/gfx.tsx (rot 0). Max label size 64 px; normal map labels 48–56 px.
5. Icons/diagrams: procedural SVG/CSS, flat, white or brand colours, soft shadow; they animate in gently (fade + small rise or
   scale 0.92→1, 0.35–0.5 s, ease-out), never slam/pop/shake.
6. Labels sit on the object (anchor dot + short leader if needed), inside x 70–1010, not in the subtitle band (y 1350–1530
   in 3D shots, ~1000–1180 while Atlas is on screen) and not over Atlas.

## Motion rules
- Shots: `Layer` (src/ui/gfx.tsx) cross-dissolves every shot in over XF = 0.4 s on top of the previous one; the previous
  one keeps running for XF under it. No hard cuts, no flashes, no light leaks, no whip pans, no camera shake.
- Camera: slow continuous moves with ease-in-out; no sudden speed changes; consecutive shots of the same place should
  continue the motion direction.
- Photos: gentle Ken Burns (≤ 8 % zoom over the shot), fade in; no punch-ins, no rotation.
- Lava: no temporal flicker. Fine detail fades out before it gets smaller than ~2 px (anti-aliased with fwidth).

## Facts (only from SCRIPT.md)
Patton: «then-lieutenant colonel George S. Patton» planned the bombing (27 Dec 1935). Lava stopped by 2 Jan 1936.
Effect of the bombing: «heavily disputed by volcanologists» — always shown as disputed, never as success.
Etna: earth barriers overrun; explosion destroyed the tube near the source (no date on screen — sources differ); town lost
one building. Heimaey: 5,300 people, almost all on the mainland within 6 hours (23 Jan 1973); pumping 6 Feb – 10 Jul 1973;
~7.3 million m³ seawater; stopped ~100 m from blocking the harbour entrance; new lava = breakwater, better shelter.
