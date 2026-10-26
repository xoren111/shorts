# hawaii_vent — imagery check 18.10 (meta.json "cloud_removal": false; sat.jpg unchanged)

meta.json now has `"cloud_removal": false`. sat.jpg was **not rewritten**: no cloud, shadow or haze was found.
`sat_v3.jpg` is a byte-identical safety copy of the current sat.jpg (made before work started). The file stays 8192×8116 JPEG q92 4:2:0 as the fix agent wrote it.
I did not re-encode it to 4:4:4 because that would only add a generation loss.

## Checks with the shader's cloud removal off
* Bright, low-chroma blob scan at full res: components with luma > 130 and chroma < 30 are at most 18 px. All of them are roads, the summit cabin at
  x5211/y2640 or light lava edges. Nothing cloud-shaped was found. Luma > 160 matches only 18 px in total, all at the cabin.
* Full-image visual scan at half res, four quadrants (brightened ×1.8), plus full-res crops of every bright candidate (polish/vent_cands.jpg):
  bare lava, the summit trail and roads only. No NAIP clouds or shadows over the vent and summit area.
* Anomaly against the cloud-free Landsat 8/9 C2 L2 median (2013–2022, USGS public domain, the same composite as for hawaii_flow) at ~32 m. The residual
  follows the lava-flow boundaries, i.e. albedo and age differences between flows. There is no compact positive or negative blob of cloud or shadow type.
* Nested border: the hawaii_flow image inside the vent footprint (flow px x1625–2601, y2417–3383) is unchanged apart from JPEG re-encoding
  (max |Δ| 8 DN, mean 0.4). The vent's 192 px feather into flow therefore still matches.
* Stills at 12.2, 13.8, 14.4, 17.5 and 18.2 s (vent grid close-ups) with cloud_removal false look the same as the delivered reference frames.

## Sources
No new imagery in this grid. It is still USDA NAIP 2021 (public domain) with low frequencies tied to hawaii_flow and EOX.

## Evidence (scratch: /private/tmp/claude-501/-Users-khorengrigoryan--claude-spares-spare-rPKONZ/db26a983-cbfa-460b-bd26-ed86f5cb3148/scratchpad/polish/)
`scan/vent_{0,1}_{0,1}.jpg` (quadrant scans), `vent_cands.jpg`, `vent_A.png` (Landsat anomaly), `pairs_final/p_{12.2,13.8,14.4,17.5,18.2}.jpg`;
stills `out/stills/imgpolish_final/`.
