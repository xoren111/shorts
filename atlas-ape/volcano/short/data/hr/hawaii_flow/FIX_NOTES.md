# hawaii_flow — QA fix 18.10 (sat.jpg, normal.png rewritten in place)

Backups: public/terrain/hawaii_flow/sat_v2.jpg, normal_v2.png (previous HR build). sat_v1.jpg = original EOX. height.bin untouched.

## sat.jpg (8192×4556, q92)
Rebuilt from the cached NAIP quads in the **gradient domain**: each quad contributes only its own gradients (feather-weighted,
log space), so quad edges carry no tone step; a screened Poisson solve (DCT) integrates them. Then:
- per-quad haze floor subtracted (vog on the Dec-2022 Hilo quads) instead of the old affine gain/offset → no blue cast;
- low frequencies tied to EOX sat_v1 (robust normalised convolution, σ 120 px ≈ 1 km, plus a 10–400 px band away from EOX clouds);
  high frequencies = NAIP;
- in-quad seamlines (NAIP frame/processing lines) removed along refined polylines: y≈2380 ribbon, y≈3895/3930 seam (x 5360→8192),
  x≈6178 (y 3300–3893), block edges x 4645/4835/4993 + y 2403/2560, x 4546, SW summit y 4040–4140 / 3760.
- stricter NAIP cloud mask (smooth ≥2 ha cores) — Hilo roofs are no longer cut out.
Mean RGB at 1024 px: old 55/65/54 → new 56/66/55 (EOX 62/71/60).

## normal.png (4096×2278)
Same 8 m DEM + EXAG 2.2 normals as build_dem.py (reproduces the old file bit-exactly), but inside the dimpled 3DEP source strip
(between the straight boundaries x≈2142→2516 and x≈3385, normal px, plus the smooth SE patch) the DEM is replaced by
G(h,56 m) + soft-thresholded residual (|b|≳10 m kept → gullies, levees, cones survive, 1–3 m dimples go). Blend weight ramps over
~220 px (3.5 km) with a wavy, outward-only edge, so no straight roughness line remains. Height change inside: RMS 1.2 m, p99 4.1 m
(normals only). Water pixels unchanged.

Evidence (scratch): /private/tmp/claude-501/-Users-khorengrigoryan--claude-spares-spare-rPKONZ/db26a983-cbfa-460b-bd26-ed86f5cb3148/scratchpad/fix/ba_flow_{0..4}.jpg (before|after crops), nf_0..2.png (shaded before|after), nf_after_2048.png, f*_2048.jpg.
Scripts: /private/tmp/claude-501/-Users-khorengrigoryan--claude-spares-spare-rPKONZ/db26a983-cbfa-460b-bd26-ed86f5cb3148/scratchpad/fix/{load_quads,fuse,seamtool,cloud2,fix_normals}.py, seams_flow.json.
