# Heimaey: coastline staircase fix (18.10)

**Defect:** in close top-down shots, the coast and harbour edges looked like pixel stairs. The renderer decides land or sea per vertex of the 1024 × 1002 grid, which has 7.8 m cells.

## New `public/terrain/heimaey/land.png`

- **Format:** 8-bit greyscale (L), 4096 × 4006 px. 255 = land, 0 = sea.
- **Grid:** the same bbox and pixel-centre grid as `sat.jpg`, `normal.png` and `lava.png`. Row 0 = north.
- **Backup:** the old 1024 px mask (from the EOX colour) is kept as `land_v1.png`.

**Source.** I used the ÍslandsDEM v1.0 2 m nodata coastline, because sea is nodata in that DEM. The steps:

1. Mosaic tiles 80 and 81 (EPSG:8088) over the bbox plus a 300 m margin.
2. The mask has 12 land components and 1 sea component, so it has no holes. Drop land specks smaller than 3 px.
3. Smooth the mask with a Gaussian, σ = 1 source pixel (2 m), to round off the 2 m staircase.
4. For each output pixel, convert mercator to lon/lat with pyproj, then to ISN2016. Sample with bilinear interpolation and 2 × 2 supersampling.
5. Set alpha = clip(0.5 + 2·(f − 0.5)).

The resulting edge is soft: the median width is 1.85 px (p10–p90: 1.68–2.01 px), which is about 3.6 m.

## Checks

| Check | Result |
|---|---|
| Land fraction | 0.2206 (height.bin 0.2202, normal.png 0.2205) |
| Agreement with `normal.png` water pixels | 99.976 % (the rest are edge pixels) |
| Agreement with height.bin land/sea at vertices | 99.98 % |

**Harbour.** The inner basin (63.4452 / −20.2800), the middle of the basin (−20.2705), the water east of the pier (−20.2620) and the channel (63.4478 / −20.2548) all have value 0. They are connected to the open sea.

- In the box 63.4451–63.4475 N, 20.28–20.25 W, 54 % of pixels are sea, and all of that sea is connected to the open sea.
- The thin north–south pier and the quays and piers on the south side stay land.

**Enclosed sea.** There is one enclosed sea patch of 50 px. It sits at the east bbox edge (63.4497 / −20.1851), where an islet's bay is cut off by the frame. It is not an error.

## height.bin spikes

**Result:** height.bin has no single-cell spikes, so it is unchanged (sha1 2c20c4c290a4).

**Strict test.** I looked for a cell that is higher or lower than all 8 of its neighbours by more than 25 m. No cell qualifies, on land or at sea. The largest values are +3.9 m above all neighbours and −1.0 m below them.

**Looser test.** 213 cells differ from the median of their 8 neighbours by more than 25 m: 200 sea and 13 land. All of them lie on the sea cliffs of Heimaklettur and the north cliffs. They are 1-cell inlets and spurs where the coast meets a 30–100 m cliff.

**Why I left them.** Of these cells, 179 of 200 sea cells and 10 of 13 land cells match the new 2 m mask at the vertex. A median filter would therefore move the coastline away from the DEM.
