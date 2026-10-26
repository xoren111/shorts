# Globe textures — fix notes (2026-10-18)

Defect: stair-stepped/soft coastlines in close globe shots; dark tropical land tinted as ocean by the colour rule in Globe.tsx.

| file (public/globe) | size | source |
|---|---|---|
| day.jpg | 8192×4096, q92 4:4:4, 8.3 MB | NASA Blue Marble NG world.topo.bathy.200412.3x21600x10800.jpg (eoimages.gsfc.nasa.gov/…/73909/), Lanczos + unsharp (r 0.9, 40 %, thr 2) |
| night.jpg | 8192×4096, q92 4:4:4, 3.2 MB | data/nasa/night.jpg (Black Marble 2016, 13500×6750), plain Lanczos (old 4k was also an ungraded resize) |
| water.png | 8192×4096, 8-bit gray | 255 = ocean/sea, 0 = land, anti-aliased (4×4 supersampled). Natural Earth 10 m (public domain): ne_10m_land + minor_islands + antarctic_ice_shelves (as land) minus ne_10m_lakes 'Lake'/'Reservoir' scalerank ≤ 3 except Lake Chad (Great Lakes, Victoria, Baikal… = water; Caspian = water). Equirectangular x = lon −180…180, y = lat 90…−90, same UVs as day.jpg |
| day_4k.jpg / night_4k.jpg | 4096×2048 | previous textures, unchanged (backup) |
| water_4k.png | 4096×2048 | box-downsample of water.png (fallback) |

Checks: 24 probe points (Hawaii/Maui/channel, Sicily/Etna/Tyrrhenian/Ionian, Iceland/Faxaflói, Amazon, Marajó, Congo, Borneo, Caspian, Superior, Victoria, Antarctica, Arctic) all correct; Heimaey is sub-pixel (water 0.31).
Mask/imagery alignment: shift search ±3 px on coasts → best at (0,0) (87 % agreement vs 84 % at ±1 px).
Old colour rule called 5.6 % of New Guinea land and 6.3 % of Sumatra/Borneo land "ocean" (1 % of all land); the mask fixes that by construction.

For the shader owner (src/three/Globe.tsx, not edited here): load globe/water.png (linear, not sRGB) and use
`float ocean = texture2D(uWater, vUv).r;` instead of the colour smoothstep. 8192 textures need MAX_TEXTURE_SIZE ≥ 8192 (fallback: *_4k files).
Build/check scripts: scratchpad globe8k/scripts/{build_tex,build_water,check}.py; preview sheet globe8k/out/globe_check.jpg.
Credits: NASA Earth Observatory (Blue Marble NG, R. Stöckli; Black Marble 2016), Natural Earth.
