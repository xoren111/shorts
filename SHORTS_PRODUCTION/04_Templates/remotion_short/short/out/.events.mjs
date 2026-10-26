// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (word anchors, max gap by
// level, SFX names) and tools/mix.py (SFX timeline via out/timeline.json). t = words[w].s + dt.
// sfx: name in public/sfx/index.json, gain dB (library peaks normalised to −3 dBFS), at = offset (s) relative to the event,
// from = start offset inside the file, dur = cut length (s).
// DEMO events (template-demo): one visual event per phrase or faster, L2 = 10–14 per 10 s, no gap > 2.0 s.
const __w = [{"w":"This","s":0,"e":0.069},{"w":"is","s":0.069,"e":0.232},{"w":"the","s":0.232,"e":0.441},{"w":"demo","s":0.441,"e":0.739},{"w":"of","s":0.739,"e":0.892},{"w":"our","s":0.892,"e":1.114},{"w":"Short","s":1.114,"e":1.394},{"w":"template.","s":1.394,"e":1.85},{"w":"Every","s":2.06,"e":2.431},{"w":"phrase","s":2.431,"e":2.656},{"w":"gets","s":2.656,"e":2.861},{"w":"its","s":2.861,"e":3.056},{"w":"own","s":3.056,"e":3.298},{"w":"visual","s":3.298,"e":3.728},{"w":"event.","s":3.728,"e":4.15},{"w":"Big","s":4.37,"e":4.538},{"w":"text","s":4.538,"e":4.762},{"w":"never","s":4.762,"e":5.204},{"w":"repeats","s":5.204,"e":5.535},{"w":"the","s":5.535,"e":5.826},{"w":"voice.","s":5.826,"e":6.15},{"w":"Three","s":6.39,"e":6.688},{"w":"transitions,","s":6.688,"e":7.46},{"w":"one","s":7.66,"e":7.9},{"w":"twist,","s":7.9,"e":8.23},{"w":"and","s":8.23,"e":8.38},{"w":"a","s":8.57,"e":8.721},{"w":"calm","s":8.721,"e":8.927},{"w":"ending","s":8.927,"e":9.296},{"w":"that","s":9.296,"e":9.531},{"w":"loops","s":9.531,"e":9.846},{"w":"back.","s":9.846,"e":10.18}]; const W = (i) => __w[i].s; const We = (i) => __w[i].e; const VO_END = 10.33; const DURATION = 11.08; const LOOP_T = 10.68;

                                                                                         
                                                                                                           

export const EVENTS       = [
	// ---------------- HOOK
	{id: 'hook', w: 0, word: 'This', dt: 0.02, what: 'frame 0: drawn burst on violet rays, speed lines, camera hit', sfx: [{name: 'impact_punch_heavy_kenney', gain: -9}, {name: 'whoosh_selfmade', gain: -18}]},
	{id: 'stamp', w: 3, word: 'demo', what: 'NEW stamp slams onto the frame', sfx: [{name: 'impact_punch_heavy_kenney', gain: -10}]},
	// ---------------- COLLAGE
	{id: 'collage', w: 8, word: 'Every', dt: -0.05, what: 'WHIP → paper ground', sfx: [{name: 'whoosh_selfmade', gain: -16}]},
	{id: 'print', w: 9, word: 'phrase', what: 'torn print with a drawn document pops in', sfx: [{name: 'pop_drop_soft_kenney', gain: -15}]},
	{id: 'ring', w: 13, word: 'visual', what: 'marker ring draws itself around the sketch', sfx: [{name: 'blip_confirm_kenney', gain: -18}]},
	{id: 'dust', w: 14, word: 'event.', what: 'dust burst out of the print', sfx: [{name: 'impact_sub_boom_kenney', gain: -16}]},
	// ---------------- SEAL
	{id: 'seal', w: 15, word: 'Big', dt: -0.06, what: 'ZOOM-THROUGH into a night desk', sfx: [{name: 'whoosh_selfmade', gain: -16}]},
	{id: 'doc', w: 16, word: 'text', what: 'a document drops onto the desk', sfx: [{name: 'pop_drop_soft_kenney', gain: -14}]},
	{id: 'slam', w: 18, word: 'repeats', what: 'the wax seal slams onto the document, impact ring', sfx: [{name: 'impact_punch_heavy_kenney', gain: -8}]},
	// ---------------- MOVES
	{id: 'moves', w: 21, word: 'Three', dt: -0.06, what: 'PUSH UP → the sea; big gold 3 (its subtitle is hidden)', sfx: [{name: 'whoosh_selfmade', gain: -16}, {name: 'pop_drop_soft_kenney', gain: -15, at: 0.1}]},
	{id: 'ship', w: 22, word: 'transitions,', what: 'a drawn ship sails in', sfx: [{name: 'blip_confirm_kenney', gain: -20}]},
	// ---------------- TWIST
	{id: 'twist', w: 23, word: 'one', dt: -0.06, what: 'PUNCH → gold burst, confetti rain right after', sfx: [{name: 'impact_punch_heavy_kenney', gain: -7}, {name: 'impact_sub_boom_kenney', gain: -12}, {name: 'pop_drop_soft_kenney', gain: -16, at: 0.3}]},
	// ---------------- END (calm, moving; dissolves into frame 0)
	{id: 'end', w: 25, word: 'and', dt: -0.06, what: 'FADE → calm paper shot, slow push on the print', sfx: [{name: 'whoosh_selfmade', gain: -22}]},
	{id: 'ring_end', w: 28, word: 'ending', what: 'a calm marker ring draws around the little ship', sfx: [{name: 'blip_confirm_kenney', gain: -22}]},
	{id: 'loop', w: 31, word: 'back.', dt: 0.4, what: 'the last 0.4 s dissolve into frame 0 (loop)'},
];
