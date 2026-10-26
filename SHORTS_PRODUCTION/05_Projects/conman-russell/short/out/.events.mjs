// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (word anchors, max gap by
// level, SFX names) and tools/mix.py (SFX timeline via out/timeline.json). t = words[w].s + dt.
// sfx: name in public/sfx/index.json, gain dB (library peaks normalised to −3 dBFS), at = offset (s) relative to the event,
// from = start offset inside the file, dur = cut length (s).
// conman-russell: the rows of ../EDIT_PLAN.md («События»). L2 = 10–14 events per 10 s, no gap > 2.0 s.
const __w = [{"w":"This","s":0,"e":0.147},{"w":"man","s":0.147,"e":0.365},{"w":"walked","s":0.365,"e":0.637},{"w":"out","s":0.637,"e":0.776},{"w":"of","s":0.776,"e":0.926},{"w":"a","s":0.926,"e":1.171},{"w":"maximum-security","s":1.171,"e":2.292},{"w":"prison","s":2.292,"e":2.694},{"w":"four","s":2.694,"e":2.991},{"w":"times.","s":2.991,"e":3.433},{"w":"The","s":3.68,"e":3.87},{"w":"guards","s":3.87,"e":3.973},{"w":"held","s":3.973,"e":4.181},{"w":"the","s":4.181,"e":4.448},{"w":"door.","s":4.448,"e":4.82},{"w":"First:","s":5.05,"e":5.54},{"w":"dressed","s":5.72,"e":5.883},{"w":"as","s":5.883,"e":5.992},{"w":"a","s":5.992,"e":6.155},{"w":"workman,","s":6.155,"e":6.583},{"w":"he","s":6.85,"e":6.967},{"w":"tapped","s":6.967,"e":7.092},{"w":"a","s":7.092,"e":7.295},{"w":"police","s":7.295,"e":7.642},{"w":"radio","s":7.642,"e":7.931},{"w":"on","s":7.931,"e":8.055},{"w":"the","s":8.055,"e":8.249},{"w":"guards'","s":8.249,"e":8.532},{"w":"window","s":8.532,"e":8.97},{"w":"and","s":9.32,"e":9.4},{"w":"walked","s":9.4,"e":9.647},{"w":"out.","s":9.647,"e":9.96},{"w":"Second:","s":10.17,"e":10.64},{"w":"posing","s":10.76,"e":11.005},{"w":"as","s":11.005,"e":11.144},{"w":"a","s":11.144,"e":11.434},{"w":"judge,","s":11.434,"e":11.724},{"w":"he","s":11.724,"e":11.899},{"w":"phoned","s":11.899,"e":12.233},{"w":"the","s":12.233,"e":12.443},{"w":"jail","s":12.443,"e":12.663},{"w":"and","s":12.663,"e":12.873},{"w":"cut","s":12.873,"e":13.042},{"w":"his","s":13.042,"e":13.262},{"w":"own","s":13.262,"e":13.512},{"w":"bail","s":13.512,"e":13.752},{"w":"from","s":13.752,"e":14.081},{"w":"nine","s":14.081,"e":14.236},{"w":"hundred","s":14.236,"e":14.516},{"w":"thousand","s":14.516,"e":14.99},{"w":"to","s":14.99,"e":15.15},{"w":"forty-five","s":15.27,"e":15.87},{"w":"thousand.","s":15.87,"e":16.43},{"w":"Third:","s":16.57,"e":16.802},{"w":"he","s":16.802,"e":16.98},{"w":"colored","s":17.1,"e":17.46},{"w":"his","s":17.46,"e":17.695},{"w":"uniform","s":17.695,"e":18.203},{"w":"green","s":18.203,"e":18.424},{"w":"with","s":18.424,"e":18.702},{"w":"markers.","s":18.702,"e":19.136},{"w":"The","s":19.36,"e":19.53},{"w":"guard","s":19.53,"e":19.622},{"w":"saw","s":19.622,"e":19.789},{"w":"a","s":19.789,"e":20.012},{"w":"doctor","s":20.012,"e":20.439},{"w":"and","s":20.439,"e":20.6},{"w":"opened","s":20.71,"e":21.014},{"w":"the","s":21.014,"e":21.188},{"w":"front","s":21.188,"e":21.391},{"w":"door.","s":21.391,"e":21.71},{"w":"Fourth:","s":21.9,"e":22.39},{"w":"fake","s":22.5,"e":22.671},{"w":"medical","s":22.671,"e":23.17},{"w":"records","s":23.17,"e":23.51},{"w":"convinced","s":23.51,"e":23.919},{"w":"the","s":23.919,"e":24.113},{"w":"prison","s":24.113,"e":24.386},{"w":"he","s":24.386,"e":24.552},{"w":"was","s":24.552,"e":24.827},{"w":"dying.","s":24.827,"e":25.133},{"w":"They","s":25.36,"e":25.58},{"w":"sent","s":25.58,"e":25.64},{"w":"him","s":25.64,"e":25.724},{"w":"to","s":25.724,"e":25.883},{"w":"a","s":25.883,"e":26.087},{"w":"hospice.","s":26.087,"e":26.65},{"w":"Then","s":26.79,"e":26.984},{"w":"Texas","s":26.984,"e":27.378},{"w":"got","s":27.378,"e":27.566},{"w":"the","s":27.566,"e":27.843},{"w":"news:","s":27.843,"e":28.2},{"w":"Steven","s":28.31,"e":28.627},{"w":"Russell","s":28.627,"e":29.086},{"w":"was","s":29.086,"e":29.341},{"w":"dead.","s":29.341,"e":29.69},{"w":"He","s":30.16,"e":30.271},{"w":"wasn't.","s":30.271,"e":30.7},{"w":"Posing","s":30.91,"e":31.122},{"w":"as","s":31.122,"e":31.246},{"w":"a","s":31.246,"e":31.488},{"w":"doctor,","s":31.488,"e":31.857},{"w":"he'd","s":31.857,"e":32.05},{"w":"checked","s":32.05,"e":32.348},{"w":"himself","s":32.348,"e":32.736},{"w":"out","s":32.736,"e":32.97},{"w":"and","s":33.28,"e":33.4},{"w":"declared","s":33.4,"e":33.728},{"w":"himself","s":33.728,"e":34.141},{"w":"dead.","s":34.141,"e":34.47},{"w":"The","s":34.91,"e":34.97},{"w":"one","s":34.97,"e":35.129},{"w":"mistake","s":35.129,"e":35.365},{"w":"that","s":35.365,"e":35.535},{"w":"caught","s":35.535,"e":35.684},{"w":"him?","s":35.684,"e":35.903},{"w":"He","s":36.08,"e":36.2},{"w":"couldn't","s":36.2,"e":36.383},{"w":"stay","s":36.383,"e":36.577},{"w":"away","s":36.577,"e":36.918},{"w":"from","s":36.918,"e":37.066},{"w":"the","s":37.066,"e":37.273},{"w":"man","s":37.273,"e":37.452},{"w":"he","s":37.452,"e":37.685},{"w":"loved.","s":37.685,"e":38.14},{"w":"Texas","s":38.5,"e":38.818},{"w":"gave","s":38.818,"e":39.047},{"w":"him","s":39.047,"e":39.617},{"w":"one","s":39.617,"e":39.706},{"w":"hundred","s":39.706,"e":39.914},{"w":"forty-four","s":39.914,"e":40.741},{"w":"years.","s":40.741,"e":41.12},{"w":"One","s":41.27,"e":41.417},{"w":"hour","s":41.417,"e":41.605},{"w":"a","s":41.605,"e":41.774},{"w":"day","s":41.774,"e":42.056},{"w":"outside","s":42.056,"e":42.44},{"w":"his","s":42.44,"e":42.699},{"w":"cell.","s":42.699,"e":43.01},{"w":"Because","s":43.17,"e":43.5}]; const W = (i) => __w[i].s; const We = (i) => __w[i].e; const VO_END = 43.65; const DURATION = 43.62; const LOOP_T = 43.27;

                                                                                         
                                                                                                           

// transient (hit / peak) of each file, from public/sfx/index.json: a cue starts 0.05 s before it, so the hit lands on the event
const TR                         = {
	whoosh_fast: 1.08, whoosh_zoom: 0.43, whoosh_air_soft: 0.24, swish_quick: 0.05, whoosh_long_windy: 1.05, whoosh_dark_tail: 1.19,
	impact_stomp: 1.55, impact_quick: 0.15, wood_thud: 0.17, boom_cine: 0.27, impact_punch_heavy_kenney: 0.02, impact_sub_boom_kenney: 0.22,
	pop_mouth: 0.01, pop_lips: 0.2, pop_drop_soft_kenney: 0, blip_select: 0.01, blip_error: 0.01, blip_confirm_kenney: 0, chips_stack: 0.08,
	paper_slide: 1.14, pen_sign: 0.53, page_turn: 0.24, paper_crumple: 0.19, typewriter: 0.49, type_bell: 0.04, gasp_male: 0.2,
	clap_solo: 0.72, clock_tick: 0.44, tape_rewind: 0.01, swell_rev: 2.98, cell_door: 3.59, chalk: 0.01, knock_glass: 0.03, desk_bell: 0.18,
	phone_ring: 0.06, monitor_beep: 0.27, flatline: 0.06, cuffs: 0.04, buzzer: 0.1,
};
/** cue whose hit lands `peak` s after the event (file cut from 0.05 s before its transient), optional length */
const sx = (name        , gain        , peak = 0, dur         )      => {
	const tr = TR[name] ?? 0;
	const lead = Math.min(tr, 0.05);
	return {name, gain, at: peak - lead, from: Math.max(0, tr - lead), ...(dur ? {dur} : {})};
};
// transition whoosh: the hit sits in the middle of the transition (DUR in engine/transitions.tsx)
const whip = (g = -16) => [sx('swish_quick', g, 0.14)];
const zoom = (g = -15) => [sx('whoosh_zoom', g, 0.22, 0.8)];
const punch = (g = -16) => [sx('whoosh_fast', g, 0.05, 0.9)];
const scratch = (g = -11, at = 0.12) => [sx('chalk', g, at)];

export const EVENTS       = [
	// ---------------- HOOK (L3): frame 0 = he walks out of the open door, crash-zoom, searchlights, dust
	{id: 'hook', w: 0, word: 'This', dt: 0.02, what: 'frame 0: he strides out of the swinging steel door, crash-zoom 2.0→1.12, searchlights, dust at the camera', sfx: [sx('impact_punch_heavy_kenney', -10, 0), sx('whoosh_zoom', -12, 0.2, 0.8), sx('cell_door', -13, 0.45, 1.1)]},
	{id: 'secure', w: 6, word: 'maximum-security', what: 'bars slam down on the windows, razor wire rolls along the top, the alarm lamp spins', sfx: [sx('impact_stomp', -10, 0.12, 1.2), sx('cell_door', -18, 0.2, 0.9)]},
	{id: 'four', w: 8, word: 'four', dt: -0.04, what: 'hard cut to a long prison wall with four steel doors: they burst open one after another, he walks out of every one; on «times.» all four wink', sfx: [0, 0.1, 0.2, 0.3].map((a, i) => sx('cell_door', -15 - i, a + 0.12, 0.35)).concat([sx('pop_mouth', -16, W(9) - W(8) + 0.04)])},
	// ---------------- DOORMAN
	{id: 'doorman', w: 10, word: 'The', dt: -0.06, what: 'PUNCH: the guard bows like a hotel doorman, daylight from the door', sfx: [...punch(), sx('impact_quick', -17, 0.06, 0.8)]},
	{id: 'ding', w: 14, word: 'door.', what: 'desk-bell ding + gold burst; his shadow crosses the light', sfx: [sx('desk_bell', -13, 0, 1.5)]},
	// ---------------- ESCAPE 1
	{id: 'wall1', w: 15, word: 'First:', dt: -0.06, what: 'WHIP to the cell wall: tally I scratched, glowing orange', sfx: [...whip(), ...scratch()]},
	{id: 'workman', w: 16, word: 'dressed', dt: -0.06, what: 'ZOOM through the mark: prison whites puff → workman tee + sweatpants', sfx: [...zoom(), sx('pop_drop_soft_kenney', -14, 0.18)]},
	{id: 'radio', w: 19, word: 'workman,', what: 'a police radio drops into his hand', sfx: [sx('pop_lips', -16, 0.25)]},
	{id: 'tapcut', w: 20, word: 'he', dt: -0.06, what: 'PUNCH to the guard booth: radio at the glass', sfx: [...punch(-17)]},
	{id: 'tap1', w: 21, word: 'tapped', what: 'tap on the glass — ripples', sfx: [sx('knock_glass', -9)]},
	{id: 'tap2', w: 23, word: 'police', what: 'second tap, radio LED blinks, the guard looks up', sfx: [sx('knock_glass', -10), sx('blip_select', -20, 0.12)]},
	{id: 'squint', w: 27, word: "guards'", what: 'the guard squints at the radio and nods', sfx: [sx('blip_select', -18)]},
	{id: 'buzz', w: 28, word: 'window', what: 'green lamp, the lock buzzes', sfx: [sx('buzzer', -15, 0, 0.7)]},
	{id: 'walkout', w: 29, word: 'and', dt: -0.06, what: 'CIRCLE from the door: the barred gate slides away, he walks out waving', sfx: [sx('swish_quick', -16, 0.2), sx('cell_door', -14, 0.6, 1.0)]},
	// ---------------- ESCAPE 2
	{id: 'wall2', w: 32, word: 'Second:', dt: -0.06, what: 'WHIP to the wall: tally II', sfx: [...punch(-17), ...scratch()]},
	{id: 'judge', w: 33, word: 'posing', dt: -0.06, what: 'ZOOM through the mark: payphone, he puffs into a judge wig + robe', sfx: [...zoom(), sx('pop_drop_soft_kenney', -14, 0.18)]},
	{id: 'gavel', w: 36, word: 'judge,', what: 'the gavel bangs on the payphone shelf', sfx: [sx('wood_thud', -9)]},
	{id: 'jail', w: 38, word: 'phoned', what: 'torn print of the real Harris County jail (PD) + dotted call line + caption', sfx: [sx('phone_ring', -17, 0.1, 1.1), sx('paper_slide', -20, 0.05, 0.5)]},
	{id: 'clerk', w: 40, word: 'jail', what: 'marker ring around a window of the jail', sfx: [sx('blip_confirm_kenney', -18)]},
	{id: 'bail', w: 42, word: 'cut', dt: -0.06, what: 'PUSH UP to the bail-bond form', sfx: [sx('whoosh_air_soft', -16, 0.17, 0.9), sx('paper_slide', -16, 0.3, 0.5)]},
	{id: 'pen', w: 45, word: 'bail', what: 'the pen flies to the amount box', sfx: [sx('pen_sign', -18, 0.05, 0.5)]},
	{id: 'n900', w: 47, word: 'nine', what: '$900,000 slams into the box (subtitle hidden)', sfx: [sx('impact_quick', -10, 0.02, 1.0)]},
	{id: 'n45', w: 51, word: 'forty-five', what: 'marker strikes $900,000 through, $45,000 pops below', sfx: [sx('pen_sign', -13, 0, 0.4), sx('pop_lips', -14, 0.14)]},
	{id: 'paid', w: 52, word: 'thousand.', what: '✓ stamp; the tiny conman hops off the paper', sfx: [sx('impact_quick', -9, 0, 0.9), sx('pop_mouth', -20, 0.3)]},
	// ---------------- ESCAPE 3
	{id: 'wall3', w: 53, word: 'Third:', dt: -0.06, what: 'WHIP to the wall: tally III', sfx: [...whip(), ...scratch()]},
	{id: 'marker', w: 55, word: 'colored', dt: -0.06, what: 'ZOOM through the mark: close-up of the white uniform, the green marker uncaps', sfx: [...zoom(), sx('pop_mouth', -15, 0.16)]},
	{id: 'scribble', w: 57, word: 'uniform', what: 'the marker scribbles, green fill runs across the uniform', sfx: [sx('pen_sign', -12, 0, 1.0)]},
	{id: 'scrubs', w: 58, word: 'green', what: 'all green: V-neck + pocket = surgical scrubs, green burst', sfx: [sx('blip_confirm_kenney', -15)]},
	{id: 'pile', w: 60, word: 'markers.', what: 'a pile of empty markers clatters down', sfx: [sx('chips_stack', -12, 0.05), sx('chips_stack', -15, 0.22)]},
	{id: 'desk', w: 61, word: 'The', dt: -0.06, what: 'PUNCH: the guard at the front desk looks up', sfx: [...punch(), sx('impact_quick', -18, 0.06, 0.7)]},
	{id: 'thought', w: 65, word: 'doctor', what: "the guard's thought bubble: a doctor (mask + head mirror)", sfx: [sx('desk_bell', -16, 0, 1.0)]},
	{id: 'frontdoor', w: 67, word: 'opened', what: 'the front door swings open, daylight; caption Estelle Unit · Huntsville, Texas', sfx: [sx('cell_door', -13, 0.35, 1.1), sx('whoosh_long_windy', -21, 0.4, 1.4)]},
	{id: 'sunlight', w: 70, word: 'door.', what: 'he walks into the light, waving like a doctor', sfx: [sx('pop_drop_soft_kenney', -17)]},
	// ---------------- ESCAPE 4
	{id: 'wall4', w: 71, word: 'Fourth:', dt: -0.06, what: 'WHIP to the wall: tally IIII', sfx: [...punch(-17), ...scratch()]},
	{id: 'records', w: 72, word: 'fake', dt: -0.06, what: 'ZOOM through the mark: medical chart on a clipboard, his hand forges it', sfx: [...zoom(), sx('pen_sign', -14, 0.3, 0.6)]},
	{id: 'dip', w: 74, word: 'records', what: 'the chart line plunges red', sfx: [sx('blip_error', -15)]},
	{id: 'prisondoc', w: 75, word: 'convinced', what: 'the prison doctor slides in, reads, nods sadly', sfx: [sx('page_turn', -14, 0.05)]},
	{id: 'monitor', w: 80, word: 'dying.', what: 'heart monitor: beep… beep… slower', sfx: [sx('monitor_beep', -15, 0, 1.4)]},
	{id: 'hospice', w: 81, word: 'They', dt: -0.06, what: 'PUSH UP: the van drives from the prison gate to the hospice house', sfx: [sx('whoosh_air_soft', -15, 0.17, 1.0)]},
	{id: 'bed', w: 86, word: 'hospice.', what: 'he lies in the hospice bed, waves weakly — and winks', sfx: [sx('pop_mouth', -16)]},
	{id: 'letter', w: 87, word: 'Then', dt: -0.06, what: 'DIAG: a typewriter types a State of Texas letter', sfx: [sx('swish_quick', -15, 0.19), sx('typewriter', -17, 0.2, 1.0)]},
	{id: 'news', w: 91, word: 'news:', what: 'the letter rises out of the typewriter, star seal', sfx: [sx('paper_slide', -15, 0.15, 0.5), sx('type_bell', -16, 0.05)]},
	{id: 'name', w: 92, word: 'Steven', what: 'STEVEN RUSSELL typed letter by letter (subtitle hidden)', sfx: [sx('typewriter', -14, 0, 0.75)]},
	{id: 'deceased', w: 95, word: 'dead.', what: 'red DECEASED stamp slams; flatline; slow push in the pause, music out', sfx: [sx('impact_quick', -7, 0, 1.1), sx('flatline', -20, 0.2, 0.7)]},
	// ---------------- TWIST (L3)
	{id: 'tear', w: 96, word: 'He', dt: -0.06, what: 'JAGGED: the letter tears open from the stamp', sfx: [sx('paper_crumple', -10, 0.15, 0.8), sx('swish_quick', -17, 0.15)]},
	{id: 'twist', w: 97, word: "wasn't.", what: 'he pops out of the hole grinning, finger guns; 2-frame flash, 8 px shake', sfx: [sx('boom_cine', -10, 0, 1.8)]},
	// ---------------- HOW (sepia flashback)
	{id: 'rewind', w: 98, word: 'Posing', dt: -0.06, what: "WHIP into a sepia flashback: hospice room, he pulls on a doctor's coat; on «doctor,» he picks up the internal phone", sfx: [sx('tape_rewind', -15, 0, 0.6), sx('whoosh_fast', -19, 0.14, 0.8), sx('pop_lips', -18, W(101) - W(98) + 0.06)]},
	{id: 'checkout', w: 103, word: 'checked', what: "walks past the nurse's desk, the sign-out sheet gets a signature", sfx: [sx('pen_sign', -15, 0.2, 0.5)]},
	{id: 'selfstamp', w: 107, word: 'declared', what: 'outside, he stamps DECEASED on his own letter and winks', sfx: [sx('impact_quick', -11, 0, 0.9)]},
	{id: 'mail', w: 109, word: 'dead.', what: 'the letter flies into a mailbox with the Texas star', sfx: [sx('whoosh_air_soft', -18, 0.2, 0.8), sx('blip_confirm_kenney', -18, 0.45)]},
	// ---------------- THE MISTAKE
	{id: 'board', w: 110, word: 'The', dt: -0.06, what: 'hard cut: police evidence board, drawn WANTED poster', sfx: [sx('wood_thud', -12, 0.02)]},
	{id: 'string', w: 112, word: 'mistake', what: 'red string runs to a «?» card, a magnifier slides over', sfx: [sx('blip_select', -18), sx('whoosh_air_soft', -21, 0.35, 0.8)]},
	{id: 'motel', w: 116, word: 'He', dt: -0.06, what: 'CIRCLE from the «?» into police binoculars: a motel at night, neon MOTEL, the view pans to the one lit window', sfx: [sx('whoosh_air_soft', -16, 0.2, 0.9)]},
	{id: 'focus', w: 118, word: 'stay', what: 'the binoculars lock on the window and focus: two silhouettes inside', sfx: [sx('click_tiny', -12, 0), sx('blip_select', -17, 0.12)]},
	{id: 'love', w: 122, word: 'man', what: 'zoom in: the two silhouettes lean together, a heart rises from the window + caption «Phillip Morris»; on «loved» red-blue lights, a police car rolls in, handcuffs click', sfx: [sx('whoosh_air_soft', -18, -0.05, 0.6), sx('pop_mouth', -15, 0.3), sx('blip_confirm_kenney', -18, 0.35), sx('buzzer', -24, W(124) - W(122), 0.5), sx('cuffs', -12, W(124) - W(122) + 0.55)]},
	// ---------------- SENTENCE
	{id: 'gavel2', w: 125, word: 'Texas', dt: -0.06, what: 'PUNCH: the judge gavel slams in front of the Texas flag', sfx: [...punch(-17), sx('wood_thud', -7, 0.11), sx('impact_sub_boom_kenney', -14, 0.11)]},
	{id: 'tallies', w: 128, word: 'one', dt: -0.12, what: 'the cell wall fills with tally marks, the counter runs to 144 (≤ 1.1 s, subtitle hidden)', sfx: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84].map((a, i) => sx('chalk', -17 - i * 0.6, a))},
	{id: 'n144', w: 131, word: 'years.', dt: -0.07, what: '144 lands big in orange, YEARS under it', sfx: [sx('impact_quick', -8, 0, 1.0)]},
	// ---------------- FINALE (L1, calm, moving) → loop
	{id: 'cell', w: 132, word: 'One', dt: -0.06, what: 'FADE: the day as a clock — 23 dark hours with a bars icon; he stands behind the cell bars', sfx: [sx('whoosh_dark_tail', -22, 0.25, 1.6)]},
	{id: 'clock', w: 133, word: 'hour', what: 'one hour of the clock lights orange, a sun pops beside it; on «outside» a strip of sunlight falls through the bars onto him, he smiles', sfx: [sx('clock_tick', -21, 0, 1.6), sx('blip_confirm_kenney', -19, 0.05), sx('whoosh_air_soft', -22, W(136) - W(133) + 0.2, 0.8)]},
	{id: 'door', w: 139, word: 'Because…', dt: -0.06, what: 'FADE: the steel door of frame 0 swings open — the loop runs into «this man walked out…»', sfx: [{name: 'cell_door', gain: -19, at: 0.05, from: 1.4, dur: 0.6}, sx('swell_rev', -22, DURATION - (W(139) - 0.06))]},
];

/** absolute times (s) — used by the scenes for a few beats that read event times */
export const evT = (id        ) => {
	const e = EVENTS.find((x) => x.id === id);
	return e ? W(e.w) + (e.dt ?? 0) : 0;
};
