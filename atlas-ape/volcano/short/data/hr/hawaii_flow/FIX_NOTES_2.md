# hawaii_flow — imagery polish 18.10 (sat.jpg rewritten, meta.json "cloud_removal": false)

Backup of the morning version: `public/terrain/hawaii_flow/sat_v3.jpg` (= fix agent's flow_h.jpg). sat_v1 (EOX) / sat_v2 (first HR) untouched.
normal.png and height.bin were not touched. New sat.jpg: 8192×4556, JPEG q92 4:4:4, same bbox and grid.
meta.json: `"cloud_removal": false` (shader cloud hack off), `imagery_source` / `credits_hr[1]` now name Landsat as a fill source.

## Why
With the shader's cloud removal switched off, every cloud left in the image shows. ~21.6 % of the land had been taken from the EOX
fallback (NAIP alpha < 0.985). About 22 % of that fallback was EOX cloud or cloud shadow, which caused the white/brown blotches at
10.5/11.5 s and the brown-red blobs at 19.0/19.6 s. Some unmasked NAIP clouds and haze were also left.

## Stage 1: replace the EOX fallback with a cloud-free fill (polish/stage1.py)
* Checked for another NAIP year: the Planetary Computer `naip` collection has only `naip:year 2021` for this bbox (47 items). The GeoPlatform
  NAIP2021_Hawaii ImageServer and NOAA Digital Coast `HI_NAIP_2021_9668` carry the same 2021 acquisition. NOAA Hawaii_1954/1965 are B/W.
  So no second NAIP year exists for Hawaii.
* **New source: Landsat 8/9 Collection 2 Level-2 surface reflectance** (USGS, public domain, orthorectified US-government imagery),
  `landsat-c2-l2` on Planetary Computer. 597 scenes from 2013-04-02 to 2022-11-25 (before the 27 Nov 2022 eruption, to match the pre-eruption NAIP), WRS 062/046,
  062/047, 063/046, 063/047, eo:cloud_cover < 35 %. The full item-id list is in `data/hr/hawaii_flow/landsat_items_2013_2022.json`.
  Built as a per-pixel clear-sky median using QA_PIXEL (no fill, dilated cloud, cirrus, cloud or shadow) plus a second pass with MAD outlier rejection, on a 2048×1139
  grid (~32 m). It has no clouds and no frame seams.
* Colour: a robust cubic log-space regression maps Landsat SR to the look of the NAIP mosaic, fitted on NAIP land at full weight. Then a smooth
  residual field (robust normalised convolution, σ≈16 px@2048) pulls in the local tone. Its samples come from full-weight NAIP and from
  **EOX s2cloudless_3857 (2016) z14** pixels where EOX is cloud and shadow free (weight 0.7). EOX is the tone the NAIP mosaic was tied to.
* Detail: inside the fill, the 1.2–6 px band comes from EOX z14 (510 tiles, z14 x 1107–1136 / y 7272–7288, ~9.6 m). It is used only where
  EOX is cloud and shadow free (new z14 mask ∪ old z13 mask, dilated 16 px; 47 % of the fill zone), with gain k=(1.51,1.35,1.07) calibrated on NAIP.
  Everywhere else the fill is Landsat only.
* Blend: the NAIP part is rebuilt from the morning image, `(V − (1−a)·E)/a`, and blended in log space with weight smoothstep((a−0.25)/0.735).
  The sea is unchanged.

## Stage 2: local real-data operations (polish/pops.py, polish/ops_all.json, log s2_log.json)
| # | defect | what was done | result |
|---|---|---|---|
| 1 | cloud blotches 10.5/11.5 s + brown-red blobs 19.0/19.6 s | EOX-cloud fallback replaced by stage 1. Remaining NAIP clouds/shadows were cloned seamlessly (membrane-corrected log clone) from EOX z14 where EOX is clean, otherwise from the Landsat fill: Saddle cluster x3540–3970/y2380–2610, north field x3940–4140/y310–405, north edge x5480–5635/y22–209, S edge x4614–4715/y4197–4315, lava x3532–3589/y3363–3456 and x3425–3569/y3779–3902, Saddle lava cluster x3648–3918/y3736–3939. Thin wisps and glows (x3792/2137, 4110–4270/250–372, 4765/175, 4948/162, 5866/3786) and a shadow at 4722/190 had their low band replaced (Landsat-guided membrane, NAIP texture kept). | stills 10.5/11.5/19.0/19.6 show no cloud, shadow or blob |
| 2 | hazy bluish NAIP frame x5620–6805(–6990)/y1290–1840 | frame fix: seams refined by Viterbi, per-channel gain/offset from 60 px rings (g=0.85/0.93/0.91, o=16.8/17.7/19.2), then gradient-domain removal of the left/bottom/diagonal/top/right seam steps and a Dirichlet Poisson solve. A soft south side is feathered over 200 px. Residual haze strip x6420–6660/y1318–1398 removed (bright-only low band). | luma std inside/west 14.3/18.1 → 16.7/17.4; seams gone at 1:1 |
| 3 | bluish blob with curved edge x6260–6440/y2360–2460 | curved-seam frame fix + bright-only Landsat-guided low-band fix | mean 51/80/74 vs 39/69/58 → 36/64/54 vs 38/69/57 |
| 4 | soft dark EOX shadows x6940–7150/y3865–3920, x6150–6270/y2340–2390 | dark-only low-band membrane replacement, Landsat-guided (σ 8 px) | luma 50.5 vs ring 61.1 → 56.4/61.2; 51.5/62.6 → 59.3/62.7 |
| 5 | SW summit sharpness seam x0–1060 along y≈4040–4140 | gain on the fine detail band below the seam: the two bands σ<1 and 1–3 px get a per-column gain (above/below energy ratio, ≤3), fading in over 10 px at the seam and out by y≈4245 | detail energy below the seam 0.017 → 0.050 (above 0.053); no line at 1:1 |
| 6 | systematic scan | 512-px tile sheets (half res), Landsat-anomaly detector (bright and dark), small-wisp detector, seam/residual map, and full-res crops of every hit. Extra finds: the D6 items above plus a bluish haze patch x5550–5800/y2380–2490 (bright-only low band). Roofs, roads, light lava, the Hilo airport and fields were left alone. | no cloud, shadow, haze block or seam found in the last pass |

Vent footprint in the flow image (x1625–2601, y2417–3383): unchanged except JPEG re-encoding (max |Δ| 8 DN, mean 0.4). The nested vent
border still matches.

Known limits: the 21.6 % fill zone is softer than NAIP (30 m Landsat tone plus ~10 m EOX detail where EOX is clean, Landsat only elsewhere). This is mostly the
rainforest belt and the Saddle at x≈3700–5400 and the north edge. In the shots it reads as smooth forest. Small patches cloned from EOX
(e.g. x3425–3569/y3779–3902) are visibly softer at 1:1.

## Sources and licences
* USDA FSA NAIP 2021 Hawaii (public domain): unchanged base.
* **NEW: Landsat 8/9 C2 L2, USGS (public domain)**, Planetary Computer `landsat-c2-l2`, 597 items (list in landsat_items_2013_2022.json). Credit: "Landsat-8/9 image courtesy of the U.S. Geological Survey".
* EOX Sentinel-2 cloudless 2016, layer s2cloudless_3857, now z14 tiles (CC BY 4.0, "Sentinel-2 cloudless 2016 by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)"). Used only where EOX itself is cloud and shadow free.
* No AI or inpainting and no texture synthesis. Only regression colour matching, membrane/Poisson blending, band-pass detail transfer from real images, and filtering.

## Evidence (scratch: /private/tmp/claude-501/-Users-khorengrigoryan--claude-spares-spare-rPKONZ/db26a983-cbfa-460b-bd26-ed86f5cb3148/scratchpad/polish/)
* before|after crops: `ba/flow_d1_c1..c6.jpg`, `ba/flow_d6_saddle.jpg`, `ba/flow_d6_lava2.jpg`, `ba/flow_d6_north.jpg`, `ba/flow_d6_wisp.jpg`,
  `ba/flow_d2_top.jpg`, `ba/flow_d2_diag.jpg`, `ba/flow_d2_overview.jpg`, `ba/flow_d3_d4b.jpg`, `ba/flow_d4a.jpg`, `ba/flow_d5.jpg`,
  `ba/flow_haze_5600_2440.jpg`, `ba/flow_fill_mid.jpg`, `ba/flow_fill_se.jpg`, `ba/flow_fill_top.jpg`; full image `ba/flow_before_2048.jpg` / `ba/flow_after_2048.jpg`.
* stills (cloud_removal false, new files): `out/stills/imgpolish_final/` + `out/stills/imgpolish_final_sheet.jpg`. Reference|new pairs: `pairs_final/p_<t>.jpg`.
* scripts: dl_landsat.py, ls_comp2.py, lsmap.py, dl_eox.py, eox14_mask.py, stage1.py, pops.py, run_ops.py, ops_all.json; detectors cands.py, wisp.py, seamdet.py.
* Reproduce: `stage1.py` (→ s1.jpg), then `run_ops.py s1.jpg ops_all.json s2.jpg` (s2.jpg = the new sat.jpg).

# normal.png (relief polish 18.10, second pass)

Backup of the morning version: `public/terrain/hawaii_flow/normal_v3.png` (= the fix agent's normal_fixed.png). normal_v2.png (first HR build) is untouched.
height.bin is unchanged, and so are sat.jpg and meta.json. New normal.png: 4096×2278 RGB, same grid. The normals are built exactly as in build_dem.py / fix_normals.py
(the 8 m DEM `hr/hawaii_flow_dem2.npy`, EXAG 2.2, np.gradient, 2×2 box mean, renormalise, water (0,1,0)). Only the DEM fed into them was filtered.
No new imagery or elevation source was put into the map.

## Where the artefacts come from (measured, not guessed)
The 1/3″ 3DEP tile is a mosaic. Most of it is 1 m lidar, resampled. The rest is an old contour-derived DEM. I mapped the lidar footprint from the
**USGS 3DEP 1 m DEM tiles themselves**: TNM products API, 57 tiles of projects HI_Hawaii_Island_Lidar_NOAA_2017_B17 and HI_NOAAMauiOahu_2020_B20,
read at the 8 m COG overview (public domain; used only as a coverage mask; no lidar heights went into the map). Where lidar exists, the 1/3″ DEM matches it to
r = 0.994–0.996 in high-pass. Everything else on land ("NL", 29 % of the grid) is the old source:
* the big strip x≈1990–3440 (the morning's "treated strip"), the dimpled block x≈1440–1990 / y≈1750–2278 (defect 1), the SE patch x≥3850 / y≥1675,
  6 small rectangular void patches around x 1490–1670 / y 1070–1350 and x 1800–1925 / y 1770–1815, and a planar TIN void fill (triangle) in the lidar at x≈1770–1810 / y≈1660–1730;
* inside NL: egg-crate dimples (1–3 m), **contour terraces** (slope modulation locked to elevation mod 12.192 m = 40 ft west of ≈−155.25,
  6.096 m = 20 ft east of it; modulation 0.08–0.15, zero in the lidar areas), and **7.5′ quad seams** (blended 0.5–3 m steps). These seams lie ~40 h2 px (~320 m)
  south of the NAD83 lat lines 19.5/19.625/19.75, and ~44 h2 px east of lon −155.375/−155.25 (old datum). One of them is the straight line at y≈2091 across the block (defect 1);
* source-boundary steps along the NL|lidar seams (median 1.9–2.4 m, p90 6–7 m). These cause the straight grooves (defect 2).

## Method (scratch polish/relief/build_normal.py, deterministic, ~4 min)
1. **Seam steps, gradient domain:** along NL|2017, NL|2020 and 2017|2020, and along the 5 quad seams inside NL, the systematic across-seam excess gradient is
   averaged ALONG the seam (oriented Gaussian σ 16 px, minus the out-of-band local mean gradient). Real texture averages out. The quad seams get robust weights,
   so gully walls are ignored. This step signature is subtracted from the gradient field in a ±16–24 px band, and the result is integrated with a screened Poisson solve (DCT).
   Correction: |c| p99 2.4 m. It is smooth away from the seams.
2. **Contour terraces** (deterrace.py): local regression (σ 160 px) of the slope modulation on cos/sin(k·2πh/12.192 m), k=1..6. Then h −= e(h), in 2 iterations.
   The residual modulation goes from 0.08–0.15 to ≤0.007, which is lidar level. |e| p99 0.26 m.
3. **Dimples** (as requested: smooth base + soft-thresholded residual): h′ = G(h,SB) + k·b with b = h − G and k = 1−exp(−(m/T)³). m = √G(b²,4 px) is the
   *local residual energy*, so gullies, levees and cones are kept as continuous features and isolated dimples are removed. Strip + SE patch: SB 6.5 px (52 m), T 3.5 m.
   Block, void patches and TIN triangle: SB 5 px, T 5 m. The morning used SB 7 / T 8 m with a per-pixel |b| threshold.
4. **Blend:** w = 1 inside NL, then an outward-only zone with a 2-D random (σ 70 px) width, then a smoothstep ramp: strip 10–60 + 50–160 px, SE/block 4–30 + 30–100 px,
   small patches 2–6 + 10–28 px. The w=0 contour is wavy everywhere, and the ramp is narrow, so lidar relief next to the old source stays sharp.
   w fades to 0 within 70 px of the 1935 flow outline (lava.png), and the flow relief is unchanged. Water: w = 0.
   Height change used for normals only: RMS 1.04 m, p99 3.1 m inside NL. The vent footprint and the western lidar are bit-identical to normal_v3.png.

## Defects
| # | defect | status | evidence |
|---|---|---|---|
| 1 | dimpled block x≈1490–1980, y≈1760–2278, straight edges (top y≈2060, left x≈1490) | **fixed.** The block is filtered (class "block"). Its straight top edge is quad seam lat 19.5 (+40 px): removed in the gradient domain (nz line amplitude at y 2091 x1600–2000: 0.048 → 0.017). The left/top edges get a wavy narrow ramp. | final/d1_block*.png |
| 2 | straight groove along the old strip boundary (2340,1290)→(2380,1480) and y 1800–2000 | **fixed.** It was a 3–5 m source-boundary step, now removed by the seam correction. The averaged across-seam nx deviation in 150-row blocks: rows 1300–1450 0.056 → 0.025, rows 1450–1600 0.032 → 0.012, rows 1900–2050 0.049 → 0.028. The remaining peaks are real terrain at ±25–60 px, not at the seam. | final/d2_seam_*.png, final/groove_metrics.txt |
| 3 | whole-map scan (shaded relief at 315°/30°, 45°/25° and the scene sun 252°/15°, local-contrast tiles, straight-line detector, spectra, elevation-phase test) | **treated:** contour terraces in all NL areas (all quad cells), 5 quad seams, all NL|lidar and 2017|2020 seams, 6 rectangular void patches, the planar TIN triangle, and the SE patch. **Remaining, reduced:** the faint along-contour "dot rows" of the old DEM in the SE of the strip (x 2350–2900, y 1600–2000), and a faint N-S quad seam at x≈2690. Both are visible only in the shaded relief under a grazing sun, not in the shots. The 2-D spectrum there is broadband, so a notch would not help. | final/d3_*.png, final/full_*_2048.png |
| 4 | the treated strip was softer than outside | **partly restored.** The weaker base (52 m instead of 56 m) and the energy-based keep (T 3.5 m instead of 8 m) bring back the real gullies, lobe edges and small cones that the morning version had flattened. The dimples stay removed, because sharper settings bring them back. The strip is still a little softer than the lidar, because the old source never had 1–10 m detail. Recovering it needs the lidar heights. These 1 m tiles cover none of the strip (the projects have no coverage there). | final/d4_strip_*.png |

## height.bin / hawaii_vent
* hawaii_flow/height.bin (64 m cells): shaded at 2 sun angles. No terraces or tile edges are visible at the mesh scale. The old-source ripples are 1–2 m with a period of ~580 m,
  far below the 64 m relief (band rms 4.9–6.3 m), and since lighting uses the normal map they cannot show except in silhouettes. Not changed.
* hawaii_vent/normal.png (4096×4058, 3DEP 1 m lidar) and height.bin: there are no artefacts. Both lidar tile seams (E 240000 / N 2170000, UTM 5N) give the same line
  amplitude as control lines ±150 px away. The straight-line detector only finds real lava-channel edges. Not changed.

## Stills
`out/stills/relief_before/` (morning normal_v3) and `out/stills/relief_after/` (new) at the 16 Hawaii shot times, with `*_sheet.jpg`. The imagery agent's new sat.jpg
also appears in relief_after, because both use the current public/. 19.0/19.6 s (slope W of the 1935 front, right half of the frame = strip): no corrugation or straight line. The relief reads
as rolling flow lobes instead of blotches. 10.5–12.2 s: no seam or block outline. 17.5/18.2 s use hawaii_vent and are unchanged.
Reference | before | after crops: polish/relief/final/still_{11.5,19.0,19.6}_ref_before_after.jpg.

Scripts (scratch /private/tmp/claude-501/-Users-khorengrigoryan--claude-spares-spare-rPKONZ/db26a983-cbfa-460b-bd26-ed86f5cb3148/scratchpad/polish/relief/, copies in final/): coverage_n.py (lidar footprint), mask.py (NL mask), build_normal.py,
deterrace.py, lib.py. Diagnostics: seamprof.py, quadfind.py, contour2.py, groove.py, lines.py, raycast.py + reproj.py (frame → map pixels).
Reproduce: `venv_hr/bin/python -I polish/relief/build_normal.py` (writes polish/relief/normal_new.png = public normal.png, bit-identical).

# normal.png: repair round 1 (18.10, after the verifiers' review)

The new `public/terrain/hawaii_flow/normal.png` is 4096×2278 RGB, same grid (md5 6a77d5e6…). Backups: `normal_v3.png` (morning) and `normal_v2.png` are unchanged. The second-pass map that this one replaces is `polish/relief/normal_new.png` (md5 1329ffed…).
height.bin, sat.jpg, meta.json and hawaii_vent are unchanged. The normals are built exactly as in build_dem.py / fix_normals.py (EXAG 2.2, np.gradient on the 8 m DEM, 2×2 box mean, renormalise, water (0,1,0)).
Script: `polish/r2/build_r2.py` (deterministic, ~2 min, copies in `polish/r2/final/`). Re-running it gives the same file bit for bit.

## Sources
* No new imagery and no new heights except one small patch. In the **TIN-triangle** (normal x≈1770–1810, y≈1655–1735), the planar void-fill facets
  that the 1/3″ DEM inherited from the 2020 lidar are replaced by the **real 2017 lidar of the same ground**: USGS 3DEP 1 m DEM, project
  HI_Hawaii_Island_Lidar_NOAA_2017_B17, tiles `USGS_1M_5_x24y217_…_2017_B17.tif` + `USGS_1M_5_x25y217_…_2017_B17.tif` (public domain, TNM/prd-tnm S3).
  It is resampled like the 1/3″ product (area mean onto the USGS_13_n20w156 grid, then bilinear onto h2) and cloned in with a harmonic offset membrane,
  3978 h2 px (`polish/r2/tri_fill.py`). The facets were detected by comparing the 2017 and 2020 1 m tiles at x24y217 (2020: planar triangles, 2017: real lava texture).
  The verifiers' "smooth blob" is now real lava relief (`final/map_tri_315.png`, `tri_fill.png`).
* Checked for lidar over the old-source areas (TNM products API, bbox of the grid): 1 m DEM, OPR DEM (3194 tiles), LPC (3194 tiles), 1/9″, S1M and IfSAR.
  There is **no lidar product over the strip, the dimpled block or the SE patch**. The 171 OPR tiles that touch the old-source mask cover only
  0.85 % of it (its edges), and at the block centre (5QKB480590) the tile is nodata. So the missing 16–50 m detail of the old source cannot be restored from
  permitted real data. No synthesis was used to fake it.

## What changed against the second pass (per verifier item)
| # | verifier item | re-measured / what was done | result |
|---|---|---|---|
| 1 | blur smear in the dimpled block, stair-stepped outline | Confirmed: fine band 1.4e-4 vs ring 5.3e-3 (prev). Cause: hard 5 px base with a narrow ramp next to crisp lidar. Now one per-pixel filter-scale field σ(x) replaces the blend weight: block core σ 6 px (T 5 m); the edge falls to 3.5 px over a wavy 40–100 px inner ramp; outside, the lidar gets σ 4 px fading to 0 over a wavy 0–20 + 80–180 px ramp (T 6.5 m, so lava edges stay). The change of sharpness is spread over ~150–300 px instead of a jagged edge. | No outline and no blob at 20.4 / 9.5 / 8.8 s in colour or grey (`final/still_20.4_block.jpg`, `final/grey_20.4.jpg`, `final/map_block_*.png`). The block interior is still lower in detail than lidar (fine band 9.6e-5; the old source has no real detail there, see Sources). |
| 2 | void patches as smooth rectangles / blob; patch x2100–2180 y2030–2200; triangle | The 11 small old-source patches (class "small", incl. the L-shape, the top rectangle, the round blob near x1600/y1320 and the patch at x2109–2154/y2043–2183) are **no longer filtered**. They keep the raw texture plus the seam-step and terrace correction of the second pass, which already took their straight edges to control level. Raw texture matches the lidar around them better than any smoothing. The triangle is filled from real 2017 lidar (above). | patch2109 fine band 5.1e-3 vs ring 6.5e-3 (prev 6.2e-5); voidL 1.3e-3 vs 6.1e-3 (prev 3.8e-5), back to the v2/v3 level, and the rectangular steps stay removed (`final/map_voids_315.png`, `final/map_patch2109_315.png`, `final/still_20.4_patch.jpg`). |
| 3 | straight roughness line along the strip's west boundary (regression) | Confirmed (prev: −1.8 → −3.8 log10 within ~100 px). Now wavy ramps on both sides: inside 120–260 px from σ 3.5 to the core σ, outside 0–40 + 130–260 px (2-D noise σ 70 px). | log10 HF energy across the W edge (−400…+375 px, 25 px bins) in `final/edgeprof_final.txt`. It now falls from −1.84 at −225 px to −3.90 at 0 over ~225 px (v3: −2.02 at −275 → −3.94; prev: −1.74 at −125 → −3.82). No straight line at 19.0 / 19.6 / 10.5–12.2 s (`final/grey_19.*.jpg`, `final/map_westN_252.png`, `final/map_westS_315.png`). |
| 4 | SE patch: vertical line x≈3815–3830 and diagonal top edge | SE class: core σ 10, wavy inner ramp 60–150 px, outer 0–30 + 100–240 px, so the polygon edges are now gradual. | Column x=3822 amplitude 0.0043 vs control 0.0046 (v3 0.0060/0.0043); no straight edge in `final/map_se_315.png`. |
| 5 | strip softer than outside (defect 4) | Not fully fixable (no lidar, see Sources). What was done: strip core σ 5.5 px north of y≈1250 (was 6.5) with a lower keep threshold (T 3 m); the beads riding on lobe fronts are removed by smoothing the kept residual **along** its own direction (structure tensor), not across, so lobe fronts, gullies and cones keep their cross profile. South of y≈1550, σ is 10 (contour dot rows). | strip core 1.5–4 px band 1.41e-3 (v3 0.90e-3, prev 1.65e-3); 4–10 px band 1.40e-3. The 0–1.5 px band is lower (5.5e-4) because in the old source that band is the dimple and bead artefact itself. At 19.0 / 19.6 s the strip reads as rolling lobes without beads or blotches; it is still softer than lidar. **Partly fixed, limit = data.** |
| 6 | contour dot rows SE of the strip (x2350–2900, y1600–2000) | σ 10 there plus oriented keep | fine band 4.9e-4 (v3 7.8e-4, prev 7.9e-4). The rows are still faintly visible in grazing-light shaded relief (`final/map_dotsSE_315.png`), not in the shots. Seam x≈2690: 0.0048 vs control 0.0027 (prev 0.0089/0.0033). **Reduced, not gone.** |
| 7 | changes inside the 1935 flow outline | Unchanged policy (flow protected 70 px outside the old source). 401 px differ from v2 by more than 2 levels (max 13), all in the old-source/ramp overlap at x1904–2017 / y728–821. | as reported by the verifiers, not harmful |
| 11 | 20.4 s smudge, patch x2109–2154 y2043–2183 | see item 2 (left unfiltered) | full texture back in the colour still (`final/still_20.4_patch.jpg`) |
| 12 | 20.4 / 9.5 / 8.8 s soft block | see item 1 | soft-to-crisp change now gradual (`final/still_9.5_block.jpg`) |
| 13 | 19.0 / 19.6 s upper right streaky soft strip | see item 5 | streaks and beads reduced; still smooth (data limit) |
| 14 | 10.5–12.2 s dot rows (x2700–2900, y830–1110) | Confirmed stronger in prev (fine band 2.5e-4 vs v3 6.2e-5). Cause: beads riding on lobe fronts were kept by the energy keep. Now removed by the oriented keep. | dots105 1.5–4 px band 7.0e-4, fine 1.6e-4. Grey render at 10.5 s: bead rows gone, one faint short row remains (`final/grey_10.5_dots.jpg`, `final/map_dots105_252.png`) |
| 15 | quad row ~1228, meridian x~1875 | measured | row 1228: 0.0097 vs control 0.0078 (prev 0.0104/0.0070); x1875: 0.0064 vs 0.0070 (at control) |

Checks: |n| 0.994–1.006, G min 144. 190548 of the 191258 v3 water px are unchanged; the rest are coast px whose normals come from
the land side, as in v2/v3. Vent footprint: 1131 px differ from v3 by 1 level (rounding). Stills: hawaii_vent shots 0.5–3.2, 13.8, 14.4, 17.5 and 18.2 s
are bit-identical to `out/stills/verify_normals_1`. The 8 flow shots change at most in the old-source areas.
Height change for the normals in the old source: RMS 1.10 m, p99 3.46 m. The max 21 m is the crater rim of the cone at x2797/y1945, where filtering only rounds the rim (`polish/r2/cmp/cone.png`).
height.bin: unchanged. As before, no terracing or straight lines appear in silhouettes at 19.0 / 19.6 / 20.4 s.

## Evidence (scratch `polish/r2/`)
* `final/map_*.png`: shaded normal map, panels v3 | second pass | new (315°/30° or scene sun 252°/15°).
* `final/still_*.jpg`: colour stills, panels reference (FINAL mp4) | second pass (out/stills/verify_normals_1) | new (out/stills/relief_r2).
* `final/grey_*.jpg`: relief-only renders (flat grey sat, isolated copy `polish/r2/proj`, nothing under src/ or public/ touched), panels v2 | second pass | new.
* `final/metrics_final.txt` (band energies, line amplitudes, sanity) and `final/edgeprof_final.txt` (W/E edge profiles v2/v3/prev/new).
* Lidar search listings: `opr_*.json`, `lpc_*.json`, `opr_nl_hits.json`.

# normal.png: repair round 2 (18.10, after the second verifier review)

New `public/terrain/hawaii_flow/normal.png`: 4096×2278 RGB, same grid, md5 8acb4ee9…. The round-1 map it replaces is kept as `polish/r2/normal_r2.png` (md5 6a77d5e6…, identical to the file that was in public/).
`normal_v3.png` already existed, so no new backup was made. `normal_v2.png`, both `height.bin`, `sat.jpg`, `meta.json` and `hawaii_vent/` are unchanged.
Normals are built exactly as in build_dem.py / fix_normals.py (8 m DEM, EXAG 2.2, np.gradient, 2×2 box mean, renormalise, water (0,1,0)).
Script: `polish/r3/build_r3.py` + `dots.py`, `seams.py`, `lib3.py` (copies in `polish/r3/final/`). Reproduce with
`venv_hr/bin/python -I polish/r3/build_r3.py "$(cat polish/r3/final/cmdline_cfg.json)"` (~5 min). A fresh run gives the same file bit for bit.

## Sources
No new imagery or elevation source. The only non-1/3″ heights are still round 1's 2017 3DEP 1 m lidar patch in the TIN triangle
(HI_Hawaii_Island_Lidar_NOAA_2017_B17, x24y217 + x25y217, public domain).
Re-checked: TNM products at the block, strip and SE patch list no lidar DEM for those points. The 1/3″ versions 2004, 2023 and 2025 are identical there (mean |Δ| 0.006 m), so they are the same old source.
I downloaded the three OPR tiles that overlap the void patches most (HI_NOAAMauiOahu_2020_B20 5QKB550565, 5QKB510625, 5QKB460715). All three have 0 valid px inside the old-source mask.

## What changed against round 1
* **No smoothing of lidar terrain.** Round 1's outer σ ramps are gone. The strip, the triangle and all lidar >200 px from the SE patch or the block are h2 + the second pass's seam-step correction (build_c, verified OK).
* **No Gaussian base, soft threshold or structure-tensor keep in the old source.** Instead, the egg-crate dimples and contour beads are removed one by one (dots.py):
  - Detection: extrema of the scale-normalised LoG (s 1.4–2.9 h2 px), a Hessian isotropy test (linear gullies, levees and lobe fronts are not dots) and an amplitude window.
  - Fill: each dot's footprint (disk 2.3 s) is refilled by a thin-plate (biharmonic) interpolation from the source heights around it. This is classical hole filling with no new texture.
  - Everything between the dots stays as in the source. That is 3 passes; footprints cover 63 % of the old source, height change RMS 0.58 m, p99 2.2 m.
  - Protection: dots are never centred within 10 px of |h−G(h,8)| > 10 m, or within 48 px of connected features > 6 m over ≥ 60 px. These are craters, cones, pit chains and deep gullies.
* **Larger beads in the strip and the SE patch:** a second stage at s 2.9–5.6 px with |A| ≤ 2.5 m. That is below half the 6.1 m / 12.2 m contour interval, so it cannot be relief the contours resolved.
* **Contour bead rows (south of normal y≈1450–1600 and the SE patch):** two more passes with |A| ≤ 3.0 m.
* **Inner feather:** dot removal rises from 30 % (strip, SE) or 20 % (block) at the source edge to 100 % over a wavy 60–200 / 40–150 / 60–160 px.
* **Small void patches:** not changed beyond the seam/terrace correction. Their raw texture is the closest match to the lidar around them.
* **Lidar side:** only near the SE patch (not in any shot) and the block is there an amplitude-limited fine-detail fade, 80–200 and 40–100 px wavy.
  - h −= β·k·(h−G(h,2.5)) + β₂·k₂·(G2.5−G6); k = exp(−(local residual / 2–3 m)²), so gully walls, scarps and cones are untouched.
  - β > 0 on 4.2 % of lidar land, β ≥ 0.5 on 0.65 %.
* **Two new local gradient-domain seam fixes (seams.py):**
  - The old-source/lidar step at the block rectangle's top edge: h2 row 4126, x2990–3250; normal y≈2063, x1495–1625.
  - A residual of quad row 1228: h2 row 2454, robust weights.
  - Method: the across-seam excess gradient is averaged along the seam and removed. A local Poisson solve with c = 0 on the window border spreads it into a gentle ramp.

## Verifier items (round 2)
| # | item | status | numbers (normal-map fine band 0–1.5 px unless noted; v2 = first HR build = FINAL reference) |
|---|---|---|---|
| 1/12 | block soft and smeared | **fixed (smear and dimples gone); data limit on the remaining softness** | Block core: 0–1.5 px 9.6e-5 → 1.15e-3 (12×); 1.5–4 px 5.9e-4 → 1.47e-3; 4–10 px 1.02e-3 → 1.36e-3 (v2 1.53e-3, block ring 1.33e-3). Real mid-scale relief is back. The v2 fine band (5.98e-3) is the dimple field itself, so the gap to lidar (1.09e-2) is not restorable without lidar. At 20.4 s the waffle pattern of the reference is gone, and the relief is crisp, not blotchy (`final/still_20.4_block.jpg`, `final/still_20.4_2x_ref_v2_r3.jpg`, `final/maps/map_blk*.png`). |
| 2/9/10/11/12 | lidar blurred around the old source | **fixed** | Lidar land with <50 % of v3's fine detail: 107 km² → **0 km²**. Against v2: 272.6 → 22.8 km² (<25 %: 0.8 km²), only at the SE/block fades. Rings: block 7.9e-4 → 8.8e-3 (v2 1.07e-2); SE 1.5e-4 → 2.1e-3 (v3 1.4e-3); strip W ring 2.8e-3 → 1.76e-2 (= v2). Lidar px changed > 2 levels vs v2: 16.5 % → 3.2 %, mostly the second pass's 2017/2020 seam correction. Frame HF against FINAL, lidar < 40 px from old source (r2 → r3): 10.5 s 0.68 → 1.25; 11.5 s 0.62 → 1.09; 12.2 s 0.61 → 1.15; 19.0 s 0.44 → 1.18; 19.6 s 0.46 → 1.24; 20.4 s 0.47 → 0.88. Against verify_normals_1 and relief_r2, no frame px loses HF (log2 < −0.5 = 0.000 at every shot; worst 60-px block −0.05) (`final/checks_final.txt`). |
| 3 | structure-tensor keep invents and smears shapes | **fixed (removed)** | Max height change: cone x2850/y1735 4.7 m (r2 9.2 m), horseshoe crater kept; fissure crater x2797/y1945 3.6 m (r2 21.3 m), pit chain kept; north strip streaks are gone (`final/maps/map_cones.png`, `map_cone2_zoom.png`, `map_stripN.png`). |
| 4 | L-shaped void patch smoother rectangle | **not fixed: data limit** | Raw source as in r2: 1.31e-3 against ring 6.12e-3. No 1 m/OPR lidar has data inside it (0 valid px). Hiding it would need the lidar blur of item 2. The small patches cover 0.2 % of the 20.4 s frame and are in no other shot. |
| 5/13 | strip softer; SE dot rows; x2690; row 1228 | **strip: partly (data limit); rows: reduced; lines: at control** | Strip core 0–1.5 px 5.5e-4 → 1.85e-3 (v2 2.86e-3); 1.5–4 px 1.41e-3 → 2.41e-3; 4–10 px 1.40e-3 → 1.72e-3 (v2 1.84e-3). Frame HF of the strip against FINAL: 19.0 s 0.37 → 0.45, 19.6 s 0.44 → 0.54, 10.5 s 0.42 → 0.51 (v2 normals with the current sat: 0.55/0.66/0.64; the rest is the removed dimples). **dotsSE:** 77 % of its fine energy is the cones and craters now kept. Without them (25 px around \|h−G8\| > 6 m): 0–1.5 px 5.3e-4 (r2 4.4e-5, v2 8.4e-4); bead rows (4–10 px) 5.7e-4 (r2 3.9e-4, v2 7.3e-4). The rows are reduced but faint traces remain, mostly within ~150 px of the strip W edge where the inner feather keeps part of the source (`map_dotsSE.png`). They are not in any shot. **x2690:** 0.0075 (wide control p50 0.0059, p90 0.0199). **Row 1228:** 0.0098 (p50 0.0064, p90 0.0119). |
| 6 | report error (710 px) | **corrected** | v3 (128,255,128) px: 191258, of which 186403 are the DEM water mask and 4855 are flat land px, not coast px. All 186403 water px are unchanged vs v2. |
| 14 | 8.8/9.5 s strip east of the W edge smoother in grey | **data limit** | The lidar west of it is now unblurred, so the contrast equals the reference (v2) (`final/still_8.8_east.jpg`, `final/grey_000_8.80s.jpg`). |
| 15 | purple sky gap at 2.5/3.2 s | **outside this item** | Geometry/scene in src/, not normals. Stills are bit-identical to relief_r2 and also in FINAL. Main session: please look at it. |
| 16 | vent shots | **OK** | 0.5, 1.5, 2.5, 3.2, 13.8, 14.4, 17.5 and 18.2 s are bit-identical to `out/stills/relief_r2`. |

## Task defects 1–4 (state now)
1. **Block dimples: fixed.** They are removed individually, with no blur and a wavy inner feather. The old rectangle's straight edges:
   - The top-edge step got the new seam fix (line run at y 2068.5: v2 0.140 → 0.026, control p90 0.043).
   - Row 2060: 0.0099 (p90 0.033). x1490: 0.0104 (p90 0.019). Quad row 2091: 0.023 (p90 0.036).
2. **Groove along the W seam: fixed in rows 1300–1600.** Seam peak vs control p90: 0.030/0.027 and 0.014/0.017 (v2 0.130/0.033, 0.084/0.018).
   - Rows 1900–2050 still show a 0.037 S-shaped excursion about 15 px wide, the same as v2/v3 (r2 0.027 only because of its blur). It is a broad slope change, not a line (`final/maps/map_groove1950_az270.png`, `final/groove_final.txt`).
3. **Map scan:** dimples, beads and bead rows are treated in all old-source areas, plus the two new seam steps.
   - Straight-boundary runs: only one run is above its control p90: y 1133.5, x1550–1610 (top of the L patch), 0.051 vs 0.043, as in r2.
   - Remaining at map level only: the SE patch polygon edges as a texture contrast (softened, no line), the void-patch rectangles (data limit), faint dot-row traces.
4. **Strip sharpness: restored where real.** The 4–10 px band is at 94 % of v2 and the 1.5–4 px band at 75 %, without dimples. Below that the old source has no real detail.

## height.bin / hawaii_vent
Both height.bin files are unchanged. In hawaii_flow, the slope modulation locked to the 40 ft / 20 ft / 100 ft contour phase is 1.2 / 0.3 / 0.7 % in the old source (lidar 0.2 %). That is not visible at the 64 m mesh, and no silhouettes show terraces at 19.0/19.6/20.4 s.
hawaii_vent/normal.png is unchanged (md5 9370efba…); the inspection results of the second pass stand.

## Stills and evidence
* `out/stills/relief_r3/` + `out/stills/relief_r3_sheet.jpg`: all 16 Hawaii times with the new public files.
* `polish/r3/final/still_*.jpg`: reference (FINAL mp4) | relief_r2 | relief_r3.
* `final/grey_*.jpg`: relief-only renders v2 | r2 | r3 (flat grey sat; isolated copy `polish/r3/proj`, nothing under src/ or public/ touched).
* `final/maps/map_*.png`: shaded normal map v2 | r2 | r3.
* `final/metrics_final.txt` (verifier regions and lines) and `final/checks_final.txt`: lidar loss, frame HF per zone, HF block maps, edge profiles, sanity, straight-run scan.
* Sanity: |n| 0.9935–1.0065, G min 144. Vent footprint: 1123 px differ from v2 by 1 level. 1935 flow outline: 401 px > 2 levels vs v2, none from the old-source treatment; they come from the shared second-pass seam correction.
