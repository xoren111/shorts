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
const __w = [{"w":"He's","s":0,"e":0.128},{"w":"hiding","s":0.128,"e":0.416},{"w":"a","s":0.416,"e":0.618},{"w":"whole","s":0.618,"e":1.071},{"w":"castle","s":1.071,"e":1.434},{"w":"behind","s":1.434,"e":1.802},{"w":"hay","s":1.802,"e":2.038},{"w":"so","s":2.038,"e":2.195},{"w":"it","s":2.195,"e":2.381},{"w":"can","s":2.381,"e":2.584},{"w":"never","s":2.584,"e":2.901},{"w":"be","s":2.901,"e":3.098},{"w":"torn","s":3.098,"e":3.354},{"w":"down.","s":3.354,"e":3.67},{"w":"His","s":3.9,"e":4.014},{"w":"bet:","s":4.014,"e":4.35},{"w":"stay","s":4.49,"e":4.733},{"w":"unseen","s":4.733,"e":5.218},{"w":"for","s":5.218,"e":5.494},{"w":"four","s":5.494,"e":5.85},{"w":"years.","s":5.85,"e":6.215},{"w":"One","s":6.44,"e":6.61},{"w":"look","s":6.61,"e":6.67},{"w":"from","s":6.67,"e":6.822},{"w":"the","s":6.822,"e":7.054},{"w":"council,","s":7.054,"e":7.438},{"w":"and","s":7.438,"e":7.584},{"w":"they","s":7.584,"e":7.739},{"w":"can","s":7.739,"e":7.941},{"w":"order","s":7.941,"e":8.235},{"w":"it","s":8.235,"e":8.481},{"w":"gone.","s":8.481,"e":8.8},{"w":"Battlements.","s":8.97,"e":9.6},{"w":"Cannons.","s":9.75,"e":10.194},{"w":"His","s":10.194,"e":10.33},{"w":"family","s":10.47,"e":10.947},{"w":"living","s":10.947,"e":11.344},{"w":"inside.","s":11.344,"e":11.784},{"w":"The","s":12,"e":12.18},{"w":"council","s":12.18,"e":12.495},{"w":"never","s":12.495,"e":12.854},{"w":"sees","s":12.854,"e":13.017},{"w":"a","s":13.017,"e":13.21},{"w":"thing.","s":13.21,"e":13.514},{"w":"Four","s":13.72,"e":13.95},{"w":"years","s":13.95,"e":14.023},{"w":"later,","s":14.023,"e":14.429},{"w":"the","s":14.429,"e":14.598},{"w":"bales","s":14.598,"e":14.974},{"w":"come","s":14.974,"e":15.209},{"w":"down.","s":15.209,"e":15.504},{"w":"He","s":15.76,"e":15.89},{"w":"thinks","s":15.89,"e":15.97},{"w":"he's","s":15.97,"e":16.27},{"w":"won.","s":16.27,"e":16.65},{"w":"Then","s":17.1,"e":17.16},{"w":"the","s":17.16,"e":17.33},{"w":"court","s":17.33,"e":17.598},{"w":"rules:","s":17.598,"e":17.991},{"w":"hiding","s":18.16,"e":18.41},{"w":"it","s":18.41,"e":18.578},{"w":"was","s":18.578,"e":18.789},{"w":"part","s":18.789,"e":18.95},{"w":"of","s":18.95,"e":19.159},{"w":"building","s":19.159,"e":19.474},{"w":"it.","s":19.474,"e":19.716},{"w":"So","s":19.92,"e":20.03},{"w":"it","s":20.03,"e":20.111},{"w":"wasn't","s":20.111,"e":20.404},{"w":"finished","s":20.404,"e":20.839},{"w":"until","s":20.839,"e":21.126},{"w":"the","s":21.126,"e":21.293},{"w":"hay","s":21.293,"e":21.501},{"w":"came","s":21.501,"e":21.718},{"w":"down.","s":21.718,"e":22.006},{"w":"The","s":22.24,"e":22.42},{"w":"clock","s":22.42,"e":22.569},{"w":"hadn't","s":22.569,"e":22.767},{"w":"even","s":22.767,"e":23.234},{"w":"started.","s":23.234,"e":23.76},{"w":"His","s":24.05,"e":24.176},{"w":"last","s":24.176,"e":24.481},{"w":"stand?","s":24.481,"e":24.86},{"w":"Bats.","s":25.04,"e":25.392},{"w":"And","s":25.392,"e":25.686},{"w":"newts.","s":25.686,"e":26.26},{"w":"Apparently","s":26.43,"e":26.768},{"w":"they've","s":26.768,"e":26.955},{"w":"moved","s":26.955,"e":27.205},{"w":"in.","s":27.205,"e":27.477},{"w":"Knock","s":27.68,"e":27.9},{"w":"it","s":27.9,"e":27.96},{"w":"down,","s":27.96,"e":28.169},{"w":"he","s":28.169,"e":28.475},{"w":"says,","s":28.475,"e":28.752},{"w":"and","s":28.752,"e":28.948},{"w":"you'd","s":28.948,"e":29.225},{"w":"break","s":29.225,"e":29.557},{"w":"wildlife","s":29.557,"e":30.054},{"w":"law.","s":30.054,"e":30.41},{"w":"Rejected.","s":30.6,"e":31.23},{"w":"The","s":31.62,"e":31.746},{"w":"judge:","s":31.746,"e":32.015},{"w":"tear","s":32.24,"e":32.49},{"w":"it","s":32.49,"e":32.55},{"w":"down,","s":32.55,"e":32.853},{"w":"or","s":32.853,"e":33.192},{"w":"face","s":33.192,"e":33.532},{"w":"jail.","s":33.532,"e":33.97},{"w":"So","s":34.22,"e":34.285},{"w":"he","s":34.285,"e":34.538},{"w":"tears","s":34.538,"e":34.761},{"w":"down","s":34.761,"e":34.984},{"w":"his","s":34.984,"e":35.227},{"w":"own","s":35.227,"e":35.552},{"w":"castle.","s":35.552,"e":36.03},{"w":"Beaten","s":36.18,"e":36.499},{"w":"by","s":36.499,"e":36.676},{"w":"the","s":36.676,"e":36.894},{"w":"hay","s":36.894,"e":37.122},{"w":"he","s":37.122,"e":37.34},{"w":"hid","s":37.34,"e":37.498},{"w":"it","s":37.498,"e":37.735},{"w":"with.","s":37.735,"e":38.12}]; const W = (i) => __w[i].s; const We = (i) => __w[i].e; const VO_END = 38.27; const DURATION = 38.42; const LOOP_T = 38.07;

                                                                                                                  
                                                                                                                                                       

// hay-castle (../SCRIPT.md «Покадровый план», 22 rows + the loop beat): the bale wall is a curtain — x-rayed, toppled, rewound;
// the «4 YEARS» timer rides the wall until the twist shows the clock had never started.
// Layout constants live here (check.mjs loads this file alone, so no imports besides lib/time); scenes.tsx reads them.
/** the field world: wall units → screen at the reference camera (wall base centre at (REF.X, REF.Y), REF.S px per unit) */
export const REF = {S: 0.165, X: 440, Y: 930};
/** the timer «4 YEARS» sticker on the wall face (wall units) and its scale per camera scale */
export const TIMER = {u: 360, v: -1150, k: 2.0};
/** the gap the farmer rams the last bale into (frame 0); the castle slot (merlon – crenel with the cannon barrel – slit merlon)
 *  spans this cell and half of the next one, so the castle stays visible after the thump */
export const GAP_CELL                   = [2, 8];
/** the left door of TwoDoors (scaled into x 79–861 in the Judge scene): zoom-through into the demolition */
export const LEFT_DOOR                   = [229, 857];

const b = (i        ) => W(i) - 0.06;
export const BEATS            = [
	{k: 'hook', t0: 0.0, t1: b(7), tr: 'none', subY: 1250, scene: 'Hook', scrim: true},
	{k: 'never', t0: b(7), t1: b(14), tr: 'punch', subY: 1250, scene: 'Never'},
	{k: 'bet', t0: b(14), t1: b(21), tr: 'whipL', subY: 1250, scene: 'Bet'},
	{k: 'look', t0: b(21), t1: b(26), tr: 'whipR', subY: 1250, scene: 'Look'},
	{k: 'gone', t0: b(26), t1: b(32), tr: 'none', subY: 1250, scene: 'Gone'},
	{k: 'battlements', t0: b(32), t1: b(33), tr: 'zoomthru', at: [440, 620], subY: 1250, scene: 'Battlements'},
	{k: 'cannons', t0: b(33), t1: b(34), tr: 'punch', subY: 1250, scene: 'Cannons', scrim: true},
	{k: 'family', t0: b(34), t1: b(38), tr: 'none', subY: 1250, scene: 'Family'},
	{k: 'neversees', t0: b(38), t1: b(44), tr: 'whipL', subY: 1250, scene: 'NeverSees'},
	{k: 'down', t0: b(44), t1: b(51), tr: 'none', subY: 1250, scene: 'Down'},
	{k: 'won', t0: b(51), t1: b(55), tr: 'punch', subY: 1250, scene: 'Won', scrim: true},
	{k: 'court', t0: b(55), t1: b(59), tr: 'none', subY: 1250, scene: 'Court', scrim: true},
	{k: 'twist', t0: b(59), t1: b(66), tr: 'punch', subY: 1250, scene: 'Twist'},
	{k: 'unfinished', t0: b(66), t1: b(75), tr: 'whipL', subY: 1250, scene: 'Unfinished', scrim: true},
	{k: 'clock', t0: b(75), t1: b(80), tr: 'punch', subY: 1250, scene: 'Clock'},
	{k: 'bats', t0: b(80), t1: b(86), tr: 'whipR', subY: 1250, scene: 'Bats'},
	{k: 'movedin', t0: b(86), t1: b(90), tr: 'none', subY: 1250, scene: 'MovedIn'},
	{k: 'knock', t0: b(90), t1: b(100), tr: 'none', subY: 1250, scene: 'Knock'},
	{k: 'rejected', t0: b(100), t1: b(101), tr: 'punch', subY: 1250, scene: 'Rejected'},
	{k: 'judge', t0: b(101), t1: b(109), tr: 'whipL', subY: 1250, scene: 'Judge'},
	{k: 'tears', t0: b(109), t1: b(116), tr: 'zoomthru', at: LEFT_DOOR, subY: 1250, scene: 'Tears'},
	{k: 'beaten', t0: b(116), t1: W(123) + 0.04, tr: 'none', subY: 1250, scene: 'Beaten', scrim: true},
	// R1: the loop beat enters with 'fade' only — a locked match dissolve: the farmer and the bale hold the frame-0 pose and
	// framing on both sides (scenes.tsx Beaten → Loop), only the world around them changes from the empty plot to the wall
	{k: 'loop', t0: W(123) + 0.04, t1: DURATION, tr: 'fade', subY: 1250, scene: 'Loop', scrim: true},
];
