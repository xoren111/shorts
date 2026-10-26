// Beat table (shots) — pure data, read by src/Short.tsx (render) and tools/check.mjs (contiguity, scene names, timeline.json
// for cut_frames.py / dupes.py). Each beat starts in a pause just before the first word of its phrase.
//   k     unique key
//   t0/t1 seconds (W(i) = start of word i of data/words.json; VO_END / DURATION from lib/time)
//   tr    entrance transition of THIS beat (the outgoing beat gets the paired exit): see engine/transitions.tsx, standard 4.3
//   at    focus point for zoomthru / circle / jagged (jagged: a point on / outside a frame edge = tear in from that edge)
//   subY  subtitle centre y while this beat is on screen: 1180–1300, pixels never below y 1440 (standard R3, check.mjs)
//   scene export name in src/scenes.tsx (SCENES)
//   scrim optional: true = the subtitles of this beat sit on a dark pill (light or busy ground under the caption band)
//   live  optional, R4: true = this beat's map carries live action (ships, people, an advancing front — MovingToken /
//         AdvanceArrow / footage). A map beat that starts before 3 s is an ERROR in check.mjs (tools/map_check.py) without it;
//         a map beat at frame 0 (t0 = 0) is an ERROR even with it (H1 / V4: frame 0 is a living being, never a map)
const __w = [{"w":"This","s":0,"e":0.191},{"w":"girl","s":0.191,"e":0.499},{"w":"finds","s":0.499,"e":0.747},{"w":"her","s":0.747,"e":1.025},{"w":"own","s":1.025,"e":1.354},{"w":"face","s":1.354,"e":1.632},{"w":"on","s":1.632,"e":1.96},{"w":"milk.","s":1.96,"e":2.37},{"w":"Under","s":2.59,"e":2.806},{"w":"a","s":2.806,"e":3},{"w":"word","s":3,"e":3.193},{"w":"she","s":3.193,"e":3.407},{"w":"can't","s":3.407,"e":3.711},{"w":"read:","s":3.711,"e":4.04},{"w":"MISSING.","s":4.19,"e":4.588},{"w":"The","s":4.92,"e":5.02},{"w":"man","s":5.02,"e":5.12},{"w":"holding","s":5.12,"e":5.487},{"w":"it","s":5.487,"e":5.776},{"w":"can.","s":5.776,"e":6.13},{"w":"\"Hey,","s":6.31,"e":6.545},{"w":"you're","s":6.545,"e":6.915},{"w":"famous!\"","s":6.915,"e":7.434},{"w":"he","s":7.434,"e":7.64},{"w":"says.","s":7.77,"e":8.075},{"w":"\"Is","s":8.36,"e":8.46},{"w":"that","s":8.46,"e":8.613},{"w":"me?\"","s":8.613,"e":8.971},{"w":"\"Hush.\"","s":9.14,"e":9.508},{"w":"He","s":9.94,"e":10.04},{"w":"helped","s":10.04,"e":10.237},{"w":"take","s":10.237,"e":10.409},{"w":"her","s":10.409,"e":10.602},{"w":"from","s":10.602,"e":10.764},{"w":"her","s":10.764,"e":11.017},{"w":"dad.","s":11.017,"e":11.279},{"w":"With","s":11.279,"e":11.43},{"w":"her","s":11.55,"e":11.781},{"w":"own","s":11.781,"e":12.14},{"w":"MOM.","s":12.14,"e":12.56},{"w":"Years","s":12.72,"e":12.931},{"w":"on","s":12.931,"e":13.102},{"w":"the","s":13.102,"e":13.333},{"w":"run.","s":13.333,"e":13.69},{"w":"Barely","s":13.84,"e":14.112},{"w":"let","s":14.112,"e":14.377},{"w":"outside.","s":14.377,"e":14.783},{"w":"He","s":15.08,"e":15.18},{"w":"doesn't","s":15.18,"e":15.32},{"w":"run.","s":15.32,"e":15.623},{"w":"He","s":15.96,"e":16.06},{"w":"doesn't","s":16.06,"e":16.197},{"w":"hide","s":16.197,"e":16.387},{"w":"the","s":16.387,"e":16.58},{"w":"carton.","s":16.58,"e":17.09},{"w":"He","s":17.42,"e":17.556},{"w":"BUYS","s":17.556,"e":17.748},{"w":"it.","s":17.748,"e":18.03},{"w":"Then","s":18.44,"e":18.5},{"w":"he","s":18.5,"e":18.677},{"w":"asks:","s":18.677,"e":18.934},{"w":"\"Do","s":18.934,"e":19.031},{"w":"you","s":19.29,"e":19.37},{"w":"want","s":19.37,"e":19.45},{"w":"to","s":19.45,"e":19.548},{"w":"keep","s":19.548,"e":19.706},{"w":"it?\"","s":19.706,"e":19.99},{"w":"She","s":20.29,"e":20.421},{"w":"cuts","s":20.421,"e":20.64},{"w":"out","s":20.64,"e":20.848},{"w":"her","s":20.848,"e":21.096},{"w":"own","s":21.096,"e":21.445},{"w":"face.","s":21.445,"e":21.83},{"w":"Tosses","s":22.01,"e":22.305},{"w":"it","s":22.305,"e":22.484},{"w":"in","s":22.484,"e":22.642},{"w":"her","s":22.642,"e":22.881},{"w":"Barbie","s":22.881,"e":23.179},{"w":"case.","s":23.179,"e":23.53},{"w":"Leaves","s":23.73,"e":23.9},{"w":"the","s":23.9,"e":24.119},{"w":"case","s":24.119,"e":24.317},{"w":"next","s":24.317,"e":24.556},{"w":"door.","s":24.556,"e":24.834},{"w":"A","s":25.1,"e":25.2},{"w":"neighbor","s":25.2,"e":25.517},{"w":"reads","s":25.517,"e":25.749},{"w":"her","s":25.749,"e":26.042},{"w":"REAL","s":26.042,"e":26.304},{"w":"name.","s":26.304,"e":26.68},{"w":"Police","s":26.81,"e":27.102},{"w":"show","s":27.102,"e":27.324},{"w":"up.","s":27.324,"e":27.687},{"w":"A","s":27.687,"e":27.909},{"w":"LOT","s":27.909,"e":28.142},{"w":"of","s":28.142,"e":28.406},{"w":"police.","s":28.406,"e":28.909},{"w":"She's","s":29.33,"e":29.55},{"w":"handed","s":29.55,"e":29.611},{"w":"back","s":29.611,"e":29.796},{"w":"to","s":29.796,"e":29.962},{"w":"a","s":29.962,"e":30.198},{"w":"dad","s":30.198,"e":30.415},{"w":"she","s":30.415,"e":30.63},{"w":"doesn't","s":30.63,"e":30.916},{"w":"know.","s":30.916,"e":31.182},{"w":"The","s":31.48,"e":31.58},{"w":"face","s":31.58,"e":31.656},{"w":"on","s":31.656,"e":31.827},{"w":"that","s":31.827,"e":32.058},{"w":"milk?","s":32.058,"e":32.359},{"w":"Her","s":32.62,"e":32.72},{"w":"dad","s":32.72,"e":32.854},{"w":"put","s":32.854,"e":33.033},{"w":"it","s":33.033,"e":33.272},{"w":"there.","s":33.272,"e":33.6},{"w":"Billions","s":33.76,"e":34.184},{"w":"of","s":34.184,"e":34.4},{"w":"cartons.","s":34.4,"e":35.04},{"w":"Almost","s":35.17,"e":35.481},{"w":"none","s":35.481,"e":35.738},{"w":"brought","s":35.738,"e":35.904},{"w":"a","s":35.904,"e":36.111},{"w":"kid","s":36.111,"e":36.347},{"w":"home.","s":36.347,"e":36.66},{"w":"Except","s":36.99,"e":37.67}]; const W = (i) => __w[i].s; const We = (i) => __w[i].e; const VO_END = 37.82; const DURATION = 37.97; const LOOP_T = 37.62;

                                                                                                                  
                                                                                                                                                       

// milk-carton (../SCRIPT.md «Покадровый план», 23 rows; row 23 «Except…» is the loop beat): one drawn milk carton with her face
// travels from shot to shot (fridge → checkout laser → scissors → doll case → the neighbour's fridge → printing line → the wall of
// cartons → the frame-0 fridge again). Adults are hands only: wristwatch = stepdad, bangle = mom, checked sleeve = dad; no adult face.
// Energy L2: hard cuts, whips and punches on the hits, zoom-throughs as match cuts «into» the carton / the case, one diag, one
// circle; never jagged; the final beat enters only with 'fade' (R1). Captions on a scrim wherever the ground under the caption band
// (y ≈ 1180–1320) is the bright fridge / store, paper, cardboard or flashing light; beats whose words are all in hide_subs need none.
//
// Layout contract (check.mjs loads this file alone, so no imports besides lib/time; the scenes import these and MUST put the
// object there, otherwise the zoom-through / circle opens from the wrong point and the match cut breaks):
/** frame 0 (Hook, Famous, IsThatMe, Loop end, FirstFrame): her eye line — the printed eyes on the carton line up with it at 0.45 s */
export const EYE_Y = 760;
/** frame 0: centre of the MISSING header on the carton held beside her cheek (zoom-through Hook → Missing) */
export const CARTON0                   = [650, 560];
/** end of KeepIt: centre of the photo panel (MISSING over her face) on the empty carton lying on the kitchen table (zoom-through → Cuts) */
export const KEEP_PHOTO                   = [540, 720];
/** end of NextDoor (the camera has eased in on the lone doll case on the neighbours' carpet): centre of the case (zoom-through → RealName) */
export const CASE_END                   = [540, 900];
/** start of DadPut: centre of her toddler photo on the plain desk (circle reveal) */
export const DESK_PHOTO                   = [540, 760];
/** end of NoneHome = start of Loop: the one carton that keeps its colour sits here in the wall, and the same carton stands here in the
 *  frame-0 dairy fridge when Loop fades in (locked match dissolve, R1) */
export const LONE_CARTON                   = [540, 720];

const r3 = (x        ) => Math.round(x * 1000) / 1000;
/** cut in the pause before word i (0.06 s lead); where there is no pause (word 36 «With» right after «dad.») the cut sits on the boundary */
const b = (i        ) => r3(Math.max(We(i - 1), W(i) - 0.06));
const SUB = 1250;

export const BEATS            = [
	// ---------------- part 1 (src/scenes_1.tsx): words 0–39, 0 – 12.66 s
	{k: 'hook', t0: 0.0, t1: b(8), tr: 'none', subY: SUB, scene: 'Hook', scrim: true},
	{k: 'missing', t0: b(8), t1: b(15), tr: 'zoomthru', at: CARTON0, subY: SUB, scene: 'Missing', scrim: true},
	{k: 'mancan', t0: b(15), t1: b(20), tr: 'none', subY: SUB, scene: 'ManCan', scrim: true},
	{k: 'famous', t0: b(20), t1: b(25), tr: 'whipL', subY: SUB, scene: 'Famous', scrim: true},
	// hard cut + the scene camera's own zoom punch (the engine's 'punch' cross-fades for 0.06 s: two near-identical framings of the
	// store set ghosted into a double image at 8.35 s)
	{k: 'isthatme', t0: b(25), t1: b(28), tr: 'none', subY: SUB, scene: 'IsThatMe', scrim: true},
	{k: 'hush', t0: b(28), t1: b(29), tr: 'none', subY: SUB, scene: 'Hush', scrim: true},
	{k: 'takeher', t0: b(29), t1: b(36), tr: 'whipR', subY: SUB, scene: 'TakeHer', scrim: true},
	{k: 'mom', t0: b(36), t1: b(40), tr: 'punch', subY: SUB, scene: 'Mom', scrim: true},
	// ---------------- part 2 (src/scenes_2.tsx): words 40–83, 12.66 – 25.04 s
	{k: 'ontherun', t0: b(40), t1: b(47), tr: 'whipL', subY: SUB, scene: 'OnTheRun', scrim: true},
	{k: 'notrun', t0: b(47), t1: b(50), tr: 'none', subY: SUB, scene: 'NotRun', scrim: true},
	{k: 'nothide', t0: b(50), t1: b(55), tr: 'whipL', subY: SUB, scene: 'NotHide', scrim: true},
	// TWIST (word 56 «BUYS», 17.56 s = 46 %): words 55–57 hidden (card «HE BUYS IT.»)
	{k: 'buys', t0: b(55), t1: b(58), tr: 'punch', subY: SUB, scene: 'Buys'},
	// SCREENSHOT MOMENT (word 65 «keep», 19.55 s): words 58–66 hidden (card «DO YOU WANT TO KEEP IT?»)
	{k: 'keepit', t0: b(58), t1: b(67), tr: 'up', subY: SUB, scene: 'KeepIt'},
	{k: 'cuts', t0: b(67), t1: b(73), tr: 'zoomthru', at: KEEP_PHOTO, subY: SUB, scene: 'Cuts', scrim: true},
	{k: 'tosses', t0: b(73), t1: b(79), tr: 'whipR', subY: SUB, scene: 'Tosses', scrim: true},
	{k: 'nextdoor', t0: b(79), t1: b(84), tr: 'diag', subY: SUB, scene: 'NextDoor'},
	// ---------------- part 3 (src/scenes_3.tsx): words 84–125 + the loop, 25.04 – 37.97 s
	{k: 'realname', t0: b(84), t1: b(90), tr: 'zoomthru', at: CASE_END, subY: SUB, scene: 'RealName', scrim: true},
	{k: 'police', t0: b(90), t1: b(97), tr: 'punch', subY: SUB, scene: 'Police', scrim: true},
	{k: 'handedback', t0: b(97), t1: b(106), tr: 'none', subY: SUB, scene: 'HandedBack'},
	{k: 'dadput', t0: b(106), t1: b(116), tr: 'circle', at: DESK_PHOTO, subY: SUB, scene: 'DadPut', scrim: true},
	// words 116–118 hidden (stamp BILLIONS)
	{k: 'billions', t0: b(116), t1: b(119), tr: 'punch', subY: SUB, scene: 'Billions'},
	// seamless 'none': the same wall and camera continue from Billions (like A1 Look → Gone), so the cut never shows
	{k: 'nonehome', t0: b(119), t1: b(125), tr: 'none', subY: SUB, scene: 'NoneHome', scrim: true},
	// R1: the loop beat enters with 'fade' only — a locked match dissolve: the lone coloured carton keeps its screen spot (LONE_CARTON)
	// while the wall becomes the frame-0 fridge; the watch hand lifts it toward her cheek and Short.tsx dissolves into frame 0 (loop_s)
	{k: 'loop', t0: b(125), t1: DURATION, tr: 'fade', subY: SUB, scene: 'Loop', scrim: true},
];
