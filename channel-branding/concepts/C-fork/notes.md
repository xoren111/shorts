# Concept C — «Zwei Wege» (fork)

**Idea:** every video starts at a turning point. One path is what really happened; the other is the «was wäre wenn» branch.
The brand mark is a gold route in the Shorts' title style (gold `#F2B705` with a thick ink outline). It rises from a dot and
splits: the **solid** branch turns into an arrow (history goes on), the **dashed** branch keeps going and curls into the bowl of a
**«?»**. Dot + stem + dashed bowl read as a question mark even at 24 px. The arrow and the dashes add the second layer of meaning:
"one path, plus a what-if path".

Build: `node concepts/C-fork/build.mjs [avatar|banner]` (run from `channel-branding/`) → avatar.png, banner.png and both check sheets.

## Avatar (800×800)
- Alter-Atlas map disc (Natural Earth, Mercator, modern borders) at a Mediterranean/Western-Europe zoom, with paper texture and a soft
  edge vignette so the circle holds on white and on dark UI.
- France (navy) fills the counter of the «?» bowl, giving the gold dashes a dark backing. The arrowhead lands over the
  Adriatic sea, not on a country, so it doesn't read as an invasion arrow. The stem and dot sit over the western Mediterranean.
- One country face (Spain, «curious») peeks up at the question mark. It ties the avatar to the Shorts' characters at 98 px and
  dissolves harmlessly at 32 px.
- No text at all. Everything important sits inside about 82 % of the diameter.

## Banner (2560×1440)
- **Two sheets of the same map.** Left: the normal Alter-Atlas colours («Geschichte»). Right: the same map as a "what if" copy:
  sepia, rotated 1.6°, with a torn paper edge and a soft shadow, dashed country borders, an old-atlas compass rose with rhumb lines,
  and the red «WAS WÄRE WENN» stamp (TV area only).
- On the desktop strip both outer windows show the *same* region (France/Germany/Alps), once in colour and once in sepia, each with
  a face, so the strip reads as "same place, two versions".
- Gold route: the trunk rises up the seam to a big gold node (the turning point) under the wordmark, then forks. The solid branch
  goes into the colour sheet and ends in an upward arrowhead. The dashed branch goes into the sepia sheet and curls into a «?» over
  dark alt-Germany, while a curious alt-Italy face looks up at it.
- Safe area 1546×423 holds only the wordmark «WAS WÄRE WENN» (Montserrat Black 127 px, gold + ink outline), the pill
  «GESCHICHTE AUF DER KARTE» and the fork node. The «?» and the arrowhead sit ~330 px outside the text so the «?» doesn't read as
  punctuation (which would need «Was wäre, wenn …?»).

## Iterations
1. **Mark geometry** (work/exp1_sheet.png): 5 variants, including a Y-fork with a ? arm, a ? with a left arrow, and dash styles.
   The Y-forks read as "Y + blob" at 32 px. «? with an arrow from its neck» was the only one that read as a «?» at every size.
   Continuous ink under the gold dashes keeps the silhouette whole; separated dashes fell apart at small sizes.
2. **Avatar v1** was too big for the circle (the dot touched the crop), the junction was cramped and the map too colourful
   (ochre Romania competed with the gold arrowhead). → Scaled down to 0.585, cleaned the junction, cut the palette back, added a shadow.
3. **Avatar v2** had a calm map, but the arrow pointed east from Central Europe into Ukraine, a campaign-arrow reading this
   channel has to avoid. Tested three placements (work/exp2_sheet.png). → **v3** Mediterranean placement: arrowhead over the
   Adriatic, France in the bowl, Spain face. v4 moved the face in from the circle edge.
4. **Banner v1** was a split of one map. Problems: wrong scale (the right half was empty Atlantic), sepia flattened sea and land into
   one beige, and above all a colour-West/sepia-East split of Europe reads as an Iron-Curtain or "backward East" statement.
   → Redesigned as **two copies of the same map** at a closer zoom.
5. **Banner v2–v3:** a two-tone sepia that keeps a darker sea, dashed borders, and a compass rose to fill the empty Atlantic.
   Faces were placed by real lon/lat instead of guessed pixels (one had landed on Norway, one on Turkey). The layout was raised so
   the fork node shows in the phone crop.
6. **Banner v4–v6:** fixed the alt face hidden behind the «?», lowered the «?» bowl into the desktop strip, and pushed the left
   Italy face out of the strip (its brows were poking in as stray lines). Enlarged the fork node to echo the avatar's «?» dot.
   Text got bigger, and the pill and stamp got extra padding because the kit's width estimates are narrower than real Montserrat
   Black (the stamp text was hitting its frame).

## Known weaknesses
- At 24 px the black between the bowl's dashes adds texture, and the map becomes colour noise. The «?» still reads, but a flat
  backdrop would be crisper.
- The avatar arrow still points "east-ish". It ends over the sea, but a viewer may still read it as movement.
- On phones only the middle of the fork is visible (node, solid vs dashed), not the arrowhead or the «?».
- The stamp repeats the wordmark text. It's kept as the Shorts' signature and is visible only on TV.
- Behind the text the two sheets show different regions (Eastern Europe in colour on the left, the Atlantic on the right). The
  "same map twice" idea lands in the outer windows and on TV, less at the seam.
- The big rose Russia block at the top centre of the left sheet is a heavy colour field (TV area).
