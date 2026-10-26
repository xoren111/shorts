// Beat table (shots) — pure data, read by src/Short.tsx (render) and tools/check.mjs (contiguity, scene names, timeline.json
// for cut_frames.py / dupes.py). Each beat starts in a pause just before the first word of its phrase.
//   k     unique key
//   t0/t1 seconds (W(i) = start of word i of data/words.json; VO_END / DURATION from lib/time)
//   tr    entrance transition of THIS beat (the outgoing beat gets the paired exit): see engine/transitions.tsx, standard 4.3
//   at    focus point for zoomthru / circle / jagged (jagged: a point on / outside a frame edge = tear in from that edge)
//   subY  subtitle centre y while this beat is on screen: 1180–1300, pixels never below y 1440 (standard R3, check.mjs)
//   scene export name in src/scenes.tsx (SCENES)
//   live  optional, R4: true = this beat's map carries live action (ships, people, an advancing front — MovingToken /
//         AdvanceArrow / footage). A map beat that starts before 3 s is an ERROR in check.mjs (tools/map_check.py) without it
const __w = [{"w":"This","s":0,"e":0.147},{"w":"man","s":0.147,"e":0.365},{"w":"walked","s":0.365,"e":0.637},{"w":"out","s":0.637,"e":0.776},{"w":"of","s":0.776,"e":0.926},{"w":"a","s":0.926,"e":1.171},{"w":"maximum-security","s":1.171,"e":2.292},{"w":"prison","s":2.292,"e":2.694},{"w":"four","s":2.694,"e":2.991},{"w":"times.","s":2.991,"e":3.433},{"w":"The","s":3.68,"e":3.87},{"w":"guards","s":3.87,"e":3.973},{"w":"held","s":3.973,"e":4.181},{"w":"the","s":4.181,"e":4.448},{"w":"door.","s":4.448,"e":4.82},{"w":"First:","s":5.05,"e":5.54},{"w":"dressed","s":5.72,"e":5.883},{"w":"as","s":5.883,"e":5.992},{"w":"a","s":5.992,"e":6.155},{"w":"workman,","s":6.155,"e":6.583},{"w":"he","s":6.85,"e":6.967},{"w":"tapped","s":6.967,"e":7.092},{"w":"a","s":7.092,"e":7.295},{"w":"police","s":7.295,"e":7.642},{"w":"radio","s":7.642,"e":7.931},{"w":"on","s":7.931,"e":8.055},{"w":"the","s":8.055,"e":8.249},{"w":"guards'","s":8.249,"e":8.532},{"w":"window","s":8.532,"e":8.97},{"w":"and","s":9.32,"e":9.4},{"w":"walked","s":9.4,"e":9.647},{"w":"out.","s":9.647,"e":9.96},{"w":"Second:","s":10.17,"e":10.64},{"w":"posing","s":10.76,"e":11.005},{"w":"as","s":11.005,"e":11.144},{"w":"a","s":11.144,"e":11.434},{"w":"judge,","s":11.434,"e":11.724},{"w":"he","s":11.724,"e":11.899},{"w":"phoned","s":11.899,"e":12.233},{"w":"the","s":12.233,"e":12.443},{"w":"jail","s":12.443,"e":12.663},{"w":"and","s":12.663,"e":12.873},{"w":"cut","s":12.873,"e":13.042},{"w":"his","s":13.042,"e":13.262},{"w":"own","s":13.262,"e":13.512},{"w":"bail","s":13.512,"e":13.752},{"w":"from","s":13.752,"e":14.081},{"w":"nine","s":14.081,"e":14.236},{"w":"hundred","s":14.236,"e":14.516},{"w":"thousand","s":14.516,"e":14.99},{"w":"to","s":14.99,"e":15.15},{"w":"forty-five","s":15.27,"e":15.87},{"w":"thousand.","s":15.87,"e":16.43},{"w":"Third:","s":16.57,"e":16.802},{"w":"he","s":16.802,"e":16.98},{"w":"colored","s":17.1,"e":17.46},{"w":"his","s":17.46,"e":17.695},{"w":"uniform","s":17.695,"e":18.203},{"w":"green","s":18.203,"e":18.424},{"w":"with","s":18.424,"e":18.702},{"w":"markers.","s":18.702,"e":19.136},{"w":"The","s":19.36,"e":19.53},{"w":"guard","s":19.53,"e":19.622},{"w":"saw","s":19.622,"e":19.789},{"w":"a","s":19.789,"e":20.012},{"w":"doctor","s":20.012,"e":20.439},{"w":"and","s":20.439,"e":20.6},{"w":"opened","s":20.71,"e":21.014},{"w":"the","s":21.014,"e":21.188},{"w":"front","s":21.188,"e":21.391},{"w":"door.","s":21.391,"e":21.71},{"w":"Fourth:","s":21.9,"e":22.39},{"w":"fake","s":22.5,"e":22.671},{"w":"medical","s":22.671,"e":23.17},{"w":"records","s":23.17,"e":23.51},{"w":"convinced","s":23.51,"e":23.919},{"w":"the","s":23.919,"e":24.113},{"w":"prison","s":24.113,"e":24.386},{"w":"he","s":24.386,"e":24.552},{"w":"was","s":24.552,"e":24.827},{"w":"dying.","s":24.827,"e":25.133},{"w":"They","s":25.36,"e":25.58},{"w":"sent","s":25.58,"e":25.64},{"w":"him","s":25.64,"e":25.724},{"w":"to","s":25.724,"e":25.883},{"w":"a","s":25.883,"e":26.087},{"w":"hospice.","s":26.087,"e":26.65},{"w":"Then","s":26.79,"e":26.984},{"w":"Texas","s":26.984,"e":27.378},{"w":"got","s":27.378,"e":27.566},{"w":"the","s":27.566,"e":27.843},{"w":"news:","s":27.843,"e":28.2},{"w":"Steven","s":28.31,"e":28.627},{"w":"Russell","s":28.627,"e":29.086},{"w":"was","s":29.086,"e":29.341},{"w":"dead.","s":29.341,"e":29.69},{"w":"He","s":30.16,"e":30.271},{"w":"wasn't.","s":30.271,"e":30.7},{"w":"Posing","s":30.91,"e":31.122},{"w":"as","s":31.122,"e":31.246},{"w":"a","s":31.246,"e":31.488},{"w":"doctor,","s":31.488,"e":31.857},{"w":"he'd","s":31.857,"e":32.05},{"w":"checked","s":32.05,"e":32.348},{"w":"himself","s":32.348,"e":32.736},{"w":"out","s":32.736,"e":32.97},{"w":"and","s":33.28,"e":33.4},{"w":"declared","s":33.4,"e":33.728},{"w":"himself","s":33.728,"e":34.141},{"w":"dead.","s":34.141,"e":34.47},{"w":"The","s":34.91,"e":34.97},{"w":"one","s":34.97,"e":35.129},{"w":"mistake","s":35.129,"e":35.365},{"w":"that","s":35.365,"e":35.535},{"w":"caught","s":35.535,"e":35.684},{"w":"him?","s":35.684,"e":35.903},{"w":"He","s":36.08,"e":36.2},{"w":"couldn't","s":36.2,"e":36.383},{"w":"stay","s":36.383,"e":36.577},{"w":"away","s":36.577,"e":36.918},{"w":"from","s":36.918,"e":37.066},{"w":"the","s":37.066,"e":37.273},{"w":"man","s":37.273,"e":37.452},{"w":"he","s":37.452,"e":37.685},{"w":"loved.","s":37.685,"e":38.14},{"w":"Texas","s":38.5,"e":38.818},{"w":"gave","s":38.818,"e":39.047},{"w":"him","s":39.047,"e":39.617},{"w":"one","s":39.617,"e":39.706},{"w":"hundred","s":39.706,"e":39.914},{"w":"forty-four","s":39.914,"e":40.741},{"w":"years.","s":40.741,"e":41.12},{"w":"One","s":41.27,"e":41.417},{"w":"hour","s":41.417,"e":41.605},{"w":"a","s":41.605,"e":41.774},{"w":"day","s":41.774,"e":42.056},{"w":"outside","s":42.056,"e":42.44},{"w":"his","s":42.44,"e":42.699},{"w":"cell.","s":42.699,"e":43.01},{"w":"Because","s":43.17,"e":43.5}]; const W = (i) => __w[i].s; const We = (i) => __w[i].e; const VO_END = 43.65; const DURATION = 43.62; const LOOP_T = 43.27;

                                                                                                                  
                                                                                                                                      

// conman-russell (EDIT_PLAN.md): the cell wall counts the escapes — each new tally mark is the door we fly through (zoomthru).
// Tally layout lives here (check.mjs loads this file alone, so no imports besides lib/time); scenes.tsx draws the marks with it.
export const TALLY = {x0: 330, gap: 92, y: 860, h: 360};
export const tallyAt = (n        )                   => [TALLY.x0 + (n - 1) * TALLY.gap + 3, TALLY.y];
const b = (i        ) => W(i) - 0.06;
export const BEATS            = [
	{k: 'hook', t0: 0.0, t1: b(10), tr: 'none', subY: 1250, scene: 'Hook'},
	{k: 'doorman', t0: b(10), t1: b(15), tr: 'punch', subY: 1250, scene: 'Doorman'},
	{k: 'wall1', t0: b(15), t1: b(16), tr: 'whipL', subY: 1250, scene: 'Wall1'},
	{k: 'workman', t0: b(16), t1: b(20), tr: 'zoomthru', at: tallyAt(1), subY: 1250, scene: 'Workman'},
	{k: 'tap', t0: b(20), t1: b(29), tr: 'punch', subY: 1250, scene: 'Tap'},
	{k: 'walkout', t0: b(29), t1: b(32), tr: 'circle', at: [540, 1000], subY: 1250, scene: 'Walkout'},
	{k: 'wall2', t0: b(32), t1: b(33), tr: 'whipR', subY: 1250, scene: 'Wall2'},
	{k: 'judge', t0: b(33), t1: b(42), tr: 'zoomthru', at: tallyAt(2), subY: 1250, scene: 'Judge'},
	{k: 'bail', t0: b(42), t1: b(53), tr: 'up', subY: 1280, scene: 'Bail'},
	{k: 'wall3', t0: b(53), t1: b(55), tr: 'whipL', subY: 1250, scene: 'Wall3'},
	{k: 'marker', t0: b(55), t1: b(61), tr: 'zoomthru', at: tallyAt(3), subY: 1250, scene: 'MarkerScene'},
	{k: 'doctor', t0: b(61), t1: b(71), tr: 'punch', subY: 1250, scene: 'Doctor'},
	{k: 'wall4', t0: b(71), t1: b(72), tr: 'whipR', subY: 1250, scene: 'Wall4'},
	{k: 'records', t0: b(72), t1: b(81), tr: 'zoomthru', at: tallyAt(4), subY: 1280, scene: 'Records'},
	{k: 'hospice', t0: b(81), t1: b(87), tr: 'up', subY: 1250, scene: 'Hospice'},
	{k: 'news', t0: b(87), t1: b(96), tr: 'diag', subY: 1280, scene: 'News'},
	{k: 'twist', t0: b(96), t1: b(98), tr: 'jagged', at: [540, 1130], subY: 1250, scene: 'Twist'},
	{k: 'checkout', t0: b(98), t1: b(110), tr: 'whipL', subY: 1250, scene: 'Checkout'},
	{k: 'wanted', t0: b(110), t1: b(116), tr: 'none', subY: 1250, scene: 'Wanted'},
	{k: 'motel', t0: b(116), t1: b(125), tr: 'circle', at: [800, 720], subY: 1290, scene: 'Binoculars'},
	{k: 'sentence', t0: b(125), t1: b(132), tr: 'punch', subY: 1250, scene: 'Sentence'},
	{k: 'cell', t0: b(132), t1: b(139), tr: 'fade', subY: 1250, scene: 'Cell'},
	{k: 'door', t0: b(139), t1: DURATION, tr: 'fade', subY: 1250, scene: 'DoorLoop'},
];
