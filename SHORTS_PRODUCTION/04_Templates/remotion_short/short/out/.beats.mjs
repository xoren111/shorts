// Beat table (shots) — pure data, read by src/Short.tsx (render) and tools/check.mjs (contiguity, scene names, timeline.json
// for cut_frames.py / dupes.py). Each beat starts in a pause just before the first word of its phrase.
//   k     unique key
//   t0/t1 seconds (W(i) = start of word i of data/words.json; VO_END / DURATION from lib/time)
//   tr    entrance transition of THIS beat (the outgoing beat gets the paired exit): see engine/transitions.tsx, standard 4.3
//   at    focus point for zoomthru / circle / jagged (jagged: a point on / outside a frame edge = tear in from that edge)
//   subY  subtitle centre y while this beat is on screen: 1180–1300, pixels never below y 1440 (standard R3, check.mjs)
//   scene export name in src/scenes.tsx (SCENES)
//   live  optional, R4: true = this beat's map carries live action (ships, people, an advancing front — MovingToken /
//         AdvanceArrow / footage). A map beat that starts before 3 s is an ERROR in check.mjs (tools/map_check.py) without it;
//         a map beat at frame 0 (t0 = 0) is an ERROR even with it (H1 / V4: frame 0 is a living being, never a map)
const __w = [{"w":"This","s":0,"e":0.069},{"w":"is","s":0.069,"e":0.232},{"w":"the","s":0.232,"e":0.441},{"w":"demo","s":0.441,"e":0.739},{"w":"of","s":0.739,"e":0.892},{"w":"our","s":0.892,"e":1.114},{"w":"Short","s":1.114,"e":1.394},{"w":"template.","s":1.394,"e":1.85},{"w":"Every","s":2.06,"e":2.431},{"w":"phrase","s":2.431,"e":2.656},{"w":"gets","s":2.656,"e":2.861},{"w":"its","s":2.861,"e":3.056},{"w":"own","s":3.056,"e":3.298},{"w":"visual","s":3.298,"e":3.728},{"w":"event.","s":3.728,"e":4.15},{"w":"Big","s":4.37,"e":4.538},{"w":"text","s":4.538,"e":4.762},{"w":"never","s":4.762,"e":5.204},{"w":"repeats","s":5.204,"e":5.535},{"w":"the","s":5.535,"e":5.826},{"w":"voice.","s":5.826,"e":6.15},{"w":"Three","s":6.39,"e":6.688},{"w":"transitions,","s":6.688,"e":7.46},{"w":"one","s":7.66,"e":7.9},{"w":"twist,","s":7.9,"e":8.23},{"w":"and","s":8.23,"e":8.38},{"w":"a","s":8.57,"e":8.721},{"w":"calm","s":8.721,"e":8.927},{"w":"ending","s":8.927,"e":9.296},{"w":"that","s":9.296,"e":9.531},{"w":"loops","s":9.531,"e":9.846},{"w":"back.","s":9.846,"e":10.18}]; const W = (i) => __w[i].s; const We = (i) => __w[i].e; const VO_END = 10.33; const DURATION = 11.08; const LOOP_T = 10.68;

                                                                                                                  
                                                                                                                                      

// DEMO (template-demo, vo_demo.wav): replace with the beats of the new Short
export const BEATS            = [
	{k: 'hook', t0: 0.0, t1: W(8) - 0.05, tr: 'none', subY: 1300, scene: 'Hook'},
	{k: 'collage', t0: W(8) - 0.05, t1: W(15) - 0.06, tr: 'whipL', subY: 1300, scene: 'Collage'},
	{k: 'seal', t0: W(15) - 0.06, t1: W(21) - 0.06, tr: 'zoomthru', at: [540, 860], subY: 1300, scene: 'SealScene'},
	{k: 'moves', t0: W(21) - 0.06, t1: W(23) - 0.06, tr: 'up', subY: 1250, scene: 'Moves'},
	{k: 'twist', t0: W(23) - 0.06, t1: W(25) - 0.06, tr: 'punch', subY: 1300, scene: 'Twist'},
	{k: 'end', t0: W(25) - 0.06, t1: DURATION, tr: 'fade', subY: 1300, scene: 'End'},
];
