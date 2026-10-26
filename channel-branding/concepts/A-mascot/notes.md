# Concept A — «Mascot ?»

**Idea.** The gold Montserrat-Black «?» with the thick dark outline (the hook-title look of the Shorts) becomes the
channel's character. It gets the same eyes as the countries in the Shorts: white eyes with a dark contour and one-line
brows. The look is sly: one eye half-lidded, the other brow raised, as if asking «Was wäre, wenn …?». It sits on the
parchment «Alter Atlas» Europe map, so the avatar promises maps, history and counterfactuals instead of dinosaurs.
The banner places the same mascot next to the wordmark «WAS WÄRE WENN» and the pill «GESCHICHTE AUF DER KARTE».
Around the edges, country characters (GB, Sweden, Spain, Italy, Turkey, Algeria, Libya, Russia) all turn their eyes
toward that centre.

Build: `node concepts/A-mascot/build.mjs [avatar|banner|all] [tag]` from `~/shorts/channel-branding`. Iteration
snapshots are in `work/*_v*.png`.

## Avatar: what I iterated
1. **v1**: The «?» at 86 % height, eyes on the top band, Central Europe at 23° wide, plus a haze and a vignette.
   The «?» read well, but the map came out muddy and grey and you could not tell it was Europe. The brows landed on
   the outline and disappeared. The outline (0.085·S) was clumsy.
2. **Eye placement study (A/B/C)** (`work/cmp_ABC.png`):
   - A: eyes inside the band. They were too small.
   - B: frog eyes on top. Strong at small sizes, but the «?» had to shrink.
   - C: big eyes over the counter of the hook, so the curl becomes a forehead. C won: the full «?» stays, and the eyes
     still read at 32 px.
   - I also zoomed out to a 44° view, so Britain, Iberia, France, Scandinavia and Greece frame the «?», and dropped the
     haze.
3. **Map wash study** (`work/cmp_C2.png`): I compared no wash, a 0.38 paper wash and neutral land. I chose a light
   0.2 wash: the gold stays the only fully saturated element and the map still has the Shorts' colours. Germany is
   set to sand in the avatar, because steel showed through the counter as a dark wedge.
4. **v4 sly face**: I wrote a per-eye version of kit `face()` (same drawing rules, but a separate lid and brow per
   eye). This gives one narrowed eye under a level brow and one raised brow. That carries the sly look the brief asked
   for.
5. **v6/v7**: I made the «?» slightly bigger (S 830) and kept the dot, extrusion and outline inside the 86 % circle.
   I lowered the face (eyeAt −0.188) so both brows sit on gold and no longer merge with the outline. I kept a soft
   brown atlas-burn rim so the circle holds its edge on white UI.

## Banner: what I iterated
1. **v1**: The wordmark at 150 px was about 1530 px wide. It overflowed the safe area and covered the mascot. Faces
   were cut by the frame edges, and a France face read as part of the «?».
2. **v2**: I measured the text in headless Chrome (`work/measure.mjs`: wordmark = 10.25 em). The lockup is now
   «?»-mascot + wordmark (one line) + pill, at about 1430 px. I placed it left of the name, so it is not misread as
   «WAS WÄRE WENN?» without a comma. I added a compass rose in the Atlantic, so the empty left part of the desktop
   strip has an old-atlas motif.
3. **v3–v4**: The faces are now checked numerically. Each is either fully outside the 423-px desktop strip or fully
   inside it and outside the safe area, so no half-faces show on phone or desktop. Other v4 changes:
   - The desert overlay is off (it drew rectangular artefacts over Arabia).
   - The haze is now a blurred rounded rectangle instead of a muddy ellipse.
   - The wordmark gets the same ink extrusion as the mascot, so they read as one sticker set.
4. **v5**: Countries that have a face keep full Shorts colours (GB navy, Russia brick, Italy olive, Spain ochre,
   Turkey plum …). All other countries are mixed 50 % toward paper. Result: the characters pop, the atlas stays calm,
   and the lockup is the focus. I moved the map centre to 11°E, so the Russia face sits fully in the right desktop
   zone, beyond the tablet crop.
5. **v6/v7**: Other changes in this round:
   - Faint portolan rhumb lines radiate from the compass (an old sea-chart texture).
   - Libya and Sweden were moved inside the frame.
   - Russia now has a «curious» face instead of «alert».
   - The haze is 0.5 instead of 0.62.
   - The mascot's brows were lowered, as on the avatar.
   - I checked Crimea: it has the same fill as Ukraine and no inner border line.

## Rules check
- Modern borders only.
- No military symbols, soldiers or weapons. The compass rose is an 8-point wind rose with diamond points, not a cross.
- No real people.
- Text appears only in the safe area: «WAS WÄRE WENN» and «GESCHICHTE AUF DER KARTE». No handle, URL or schedule.
- The avatar's only glyph is «?».
- The image has no border or frame.
