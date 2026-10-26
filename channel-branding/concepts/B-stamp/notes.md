# Concept B: «Atlas-Stempel» (atlas stamp and cartouche)

## Idea
The red rubber stamp «WAS WÄRE WENN» from the Shorts becomes the channel's **round seal**, and that seal is the logo. It has a thin outer line, a solid red band with the ring text reversed out ("WAS WÄRE WENN" on the top arc, "GESCHICHTE AUF DER KARTE" on the bottom arc, stars at 3 and 9 o'clock), a thin inner line and one huge red **«?»**. The seal is stamped onto a fragment of the channel's «Alter Atlas» map: Natural Earth, Mercator, sea #9FB8B5, parchment, ink borders, engraved coastal water-lines, graticule, and the Shorts' flat country colours.

* **Avatar (800×800):** the seal fills about 85 % of the diameter (R = 338 px, inside the 86 % circle). Inside the seal the map is washed with paper (66 %) and its linework is redrawn on top. That keeps the red «?» at high contrast and still reads as an atlas sheet. The thin band outside the seal shows the map in full colour, with a slight darkening at the very edge, so the circle separates from both white and dark UI. At 32 and 24 px you see a red ring and a red «?» on a light disc. The ring text is texture only. At 98 px "WAS WÄRE WENN" is just about legible as a bonus.
* **Banner (2560×1440):** an old atlas sheet showing Western Europe to the Black Sea and North Africa.
  * **Desktop strip, left to right:** a compass rose in the Atlantic with portolan rhumb lines on the water only. Then the **logo lockup**: the same seal, slammed (−12°) over the left edge of an atlas **cartouche**. The cartouche has a light paper plate, a double ink frame, concave corners and diamond finials. It holds the gold Montserrat Black wordmark «WAS WÄRE WENN» with the Shorts' thick dark outline and the topic line «ZWEITER WELTKRIEG · IMPERIEN · GRENZEN». The dark pill «GESCHICHTE AUF DER KARTE» sits on its bottom edge. On the right is **history versus what-if**: a solid ink route with waypoints and an arrowhead runs east over Anatolia, and a dashed red branch peels off into the Black Sea to the Shorts' gold «?» disc. A curious Turkey face looks up at it.
  * **TV only:** a smug France face, a curious Egypt face and an unlabeled scale bar.
  * All text and logos sit inside the 1546×423 safe area: the seal starts at x = 509 and the pill ends at y = 874.
* **Content rules:** modern borders only (Crimea is part of Ukraine through the kit). No military symbols, soldiers or weapons. The routes are itinerary lines, and none of them points at a contested territory; the what-if «?» floats on open sea. The only text is the wordmark, the positioning line and one topic line. The compass has no "N" letter; a red north arrow stands in for it.

## Iterations (renders are in `iter/`)
**Avatar**
1. `a1_*`: a multiply stamp over the full-colour map with heavy grunge. The ink drowned in the colourful map, and the blotches destroyed the «?». A gold «?» inside a multiply group went translucent (bug).
2. `a2_*`: a solid band with reversed ring text and a paper wash, but the grunge was still far too strong and everything looked pink.
3. `a3_*`: the grunge thresholds were recalibrated. It now reads as a real rubber stamp, but at 32 px it was a pastel mush: weak ring, low contrast.
4. `a4_*`: a bigger «?» (1.62 R), a solid band with lighter ring text, opacity 1 and a darker rim. It now reads at 24 px. The knock-out version (solid disc) was strongest at 24 px but generic. The gold «?» read well but belongs to the Shorts' disc motif, not the stamp, so I kept the ink «?» for this concept.
5. `a5_*`: the map linework is redrawn over the wash, so the inside reads as an engraved atlas and not as fog. I tried zoom, sea-centred and rotation variants and kept the Alps/Adriatic view, where the margin shows France navy, Spain ochre, Turkey plum and Russia brick.
6. `a6_*`: classic seal typography: the top arc runs clockwise, the bottom arc reads left to right, with stars at 3 and 9 o'clock.
7. `a7_*`: A/B of wash strength and a slight glyph stroke for weight at small sizes. Final: wash 0.66, glyph stroke 0.022, lighter grunge (0.25) so the «?» is not speckled at 98 px.

**Banner**
1. A centred cartouche with a small multiply seal on its top-right corner. The seal was faint and the routes were cramped. A Spain face was hidden. The desert overlay showed a straight polygon edge in the TV area, so I turned it off.
2. The map centre moved south (41.5°N) so Anatolia and the Black Sea sit in the desktop strip, and the seal moved to the bottom-right. Over plum Turkey the multiply ink turned muddy, and the seal crowded the route junction.
3. The seal became the **left end of a lockup**, with normal blend over a paper wash so it always reads red. The route branch moved fully into the desktop-only zone to the right of the cartouche, and the Turkey face now looks at the «?».
4. The topic line got diamond rules and the dashed branch got longer. The palette of the TV top (Poland, Belarus, Czechia) was varied so it is no longer one yellow-beige mass. An Egypt face was added for the TV view.
5. The seal now uses exactly the avatar's seal settings (one logo). The "N" letter was replaced by a red north arrow.

## Build
`node concepts/B-stamp/build.mjs` (from `~/shorts/channel-branding`) renders `avatar.png`, `banner.png` and both check sheets in about 8 s. `… build.mjs avatar` or `… build.mjs banner` renders only one of them, and `… build.mjs explore` writes avatar A/B variants into `iter/`. Shared pieces are in `lib.mjs`: `seal()`, `compass()`, `scaleBar()`, `waterlines()`, `seaMask()`, `mapView()` and `FILLS`.
