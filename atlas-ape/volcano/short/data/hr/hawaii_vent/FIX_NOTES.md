# hawaii_vent — QA fix 18.10 (sat.jpg rewritten in place)

Backup: public/terrain/hawaii_vent/sat_v2.jpg (previous HR build). normal.png / height.bin untouched.

sat.jpg (8192×8116, q92) rebuilt like hawaii_flow: gradient-domain NAIP mosaic (6 full-res quads, own gradients only), per-quad
haze floor, low frequencies tied to the NEW hawaii_flow sat (σ 400 px) and to EOX sat_v1 in a 24–1200 px band (log, robust),
192 px border feather into hawaii_flow (edge-ring |vent−flow| 0.25 DN, interior 31 m blocks 1.7 DN).
The NAIP frame seamline at y≈400–575 (x 2880–4620) had a ~30 % brightness step AND 2× local contrast north of it: the band tie
removes the brightness step, and a local-contrast gain (median 0.47, detail band σ<16 px only) equalises texture north of the line.
Second seam (y≈4420–4620) gone via the same tie. Mean RGB unchanged (40/33/34).

Evidence (scratch): /private/tmp/claude-501/-Users-khorengrigoryan--claude-spares-spare-rPKONZ/db26a983-cbfa-460b-bd26-ed86f5cb3148/scratchpad/fix/ba_vent_{0..2}.jpg (before top / after bottom, brightened ×1.7), ve_2048.jpg.
