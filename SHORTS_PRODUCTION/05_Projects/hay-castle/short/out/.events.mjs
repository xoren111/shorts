// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (word anchors, max gap by
// level, SFX names) and tools/mix.py (SFX timeline via out/timeline.json). t = words[w].s + dt.
// sfx: name in public/sfx/index.json, gain dB (library peaks normalised to −3 dBFS), at = offset (s) relative to the event,
// from = start offset inside the file, dur = cut length (s).
// hay-castle: the rows of ../SCRIPT.md «Покадровый план» (22 beats + the loop). L2 = 10–14 events per 10 s, no gap > 2.0 s.
// Only library SFX (03_Assets/Sound_Effects via tools/fetch_asset.py lib, CC0 — CREDITS.md); a few plan sounds have no exact
// library file and use the nearest one: straw rustle = paper crumple, padlock click = typewriter key, clang ring = typewriter
// bell, wing flutter = page turn, water plip = cartoon pop, hydraulic whine = synth riser, brake screech = record scratch.
const __w = [{"w":"He's","s":0,"e":0.128},{"w":"hiding","s":0.128,"e":0.416},{"w":"a","s":0.416,"e":0.618},{"w":"whole","s":0.618,"e":1.071},{"w":"castle","s":1.071,"e":1.434},{"w":"behind","s":1.434,"e":1.802},{"w":"hay","s":1.802,"e":2.038},{"w":"so","s":2.038,"e":2.195},{"w":"it","s":2.195,"e":2.381},{"w":"can","s":2.381,"e":2.584},{"w":"never","s":2.584,"e":2.901},{"w":"be","s":2.901,"e":3.098},{"w":"torn","s":3.098,"e":3.354},{"w":"down.","s":3.354,"e":3.67},{"w":"His","s":3.9,"e":4.014},{"w":"bet:","s":4.014,"e":4.35},{"w":"stay","s":4.49,"e":4.733},{"w":"unseen","s":4.733,"e":5.218},{"w":"for","s":5.218,"e":5.494},{"w":"four","s":5.494,"e":5.85},{"w":"years.","s":5.85,"e":6.215},{"w":"One","s":6.44,"e":6.61},{"w":"look","s":6.61,"e":6.67},{"w":"from","s":6.67,"e":6.822},{"w":"the","s":6.822,"e":7.054},{"w":"council,","s":7.054,"e":7.438},{"w":"and","s":7.438,"e":7.584},{"w":"they","s":7.584,"e":7.739},{"w":"can","s":7.739,"e":7.941},{"w":"order","s":7.941,"e":8.235},{"w":"it","s":8.235,"e":8.481},{"w":"gone.","s":8.481,"e":8.8},{"w":"Battlements.","s":8.97,"e":9.6},{"w":"Cannons.","s":9.75,"e":10.194},{"w":"His","s":10.194,"e":10.33},{"w":"family","s":10.47,"e":10.947},{"w":"living","s":10.947,"e":11.344},{"w":"inside.","s":11.344,"e":11.784},{"w":"The","s":12,"e":12.18},{"w":"council","s":12.18,"e":12.495},{"w":"never","s":12.495,"e":12.854},{"w":"sees","s":12.854,"e":13.017},{"w":"a","s":13.017,"e":13.21},{"w":"thing.","s":13.21,"e":13.514},{"w":"Four","s":13.72,"e":13.95},{"w":"years","s":13.95,"e":14.023},{"w":"later,","s":14.023,"e":14.429},{"w":"the","s":14.429,"e":14.598},{"w":"bales","s":14.598,"e":14.974},{"w":"come","s":14.974,"e":15.209},{"w":"down.","s":15.209,"e":15.504},{"w":"He","s":15.76,"e":15.89},{"w":"thinks","s":15.89,"e":15.97},{"w":"he's","s":15.97,"e":16.27},{"w":"won.","s":16.27,"e":16.65},{"w":"Then","s":17.1,"e":17.16},{"w":"the","s":17.16,"e":17.33},{"w":"court","s":17.33,"e":17.598},{"w":"rules:","s":17.598,"e":17.991},{"w":"hiding","s":18.16,"e":18.41},{"w":"it","s":18.41,"e":18.578},{"w":"was","s":18.578,"e":18.789},{"w":"part","s":18.789,"e":18.95},{"w":"of","s":18.95,"e":19.159},{"w":"building","s":19.159,"e":19.474},{"w":"it.","s":19.474,"e":19.716},{"w":"So","s":19.92,"e":20.03},{"w":"it","s":20.03,"e":20.111},{"w":"wasn't","s":20.111,"e":20.404},{"w":"finished","s":20.404,"e":20.839},{"w":"until","s":20.839,"e":21.126},{"w":"the","s":21.126,"e":21.293},{"w":"hay","s":21.293,"e":21.501},{"w":"came","s":21.501,"e":21.718},{"w":"down.","s":21.718,"e":22.006},{"w":"The","s":22.24,"e":22.42},{"w":"clock","s":22.42,"e":22.569},{"w":"hadn't","s":22.569,"e":22.767},{"w":"even","s":22.767,"e":23.234},{"w":"started.","s":23.234,"e":23.76},{"w":"His","s":24.05,"e":24.176},{"w":"last","s":24.176,"e":24.481},{"w":"stand?","s":24.481,"e":24.86},{"w":"Bats.","s":25.04,"e":25.392},{"w":"And","s":25.392,"e":25.686},{"w":"newts.","s":25.686,"e":26.26},{"w":"Apparently","s":26.43,"e":26.768},{"w":"they've","s":26.768,"e":26.955},{"w":"moved","s":26.955,"e":27.205},{"w":"in.","s":27.205,"e":27.477},{"w":"Knock","s":27.68,"e":27.9},{"w":"it","s":27.9,"e":27.96},{"w":"down,","s":27.96,"e":28.169},{"w":"he","s":28.169,"e":28.475},{"w":"says,","s":28.475,"e":28.752},{"w":"and","s":28.752,"e":28.948},{"w":"you'd","s":28.948,"e":29.225},{"w":"break","s":29.225,"e":29.557},{"w":"wildlife","s":29.557,"e":30.054},{"w":"law.","s":30.054,"e":30.41},{"w":"Rejected.","s":30.6,"e":31.23},{"w":"The","s":31.62,"e":31.746},{"w":"judge:","s":31.746,"e":32.015},{"w":"tear","s":32.24,"e":32.49},{"w":"it","s":32.49,"e":32.55},{"w":"down,","s":32.55,"e":32.853},{"w":"or","s":32.853,"e":33.192},{"w":"face","s":33.192,"e":33.532},{"w":"jail.","s":33.532,"e":33.97},{"w":"So","s":34.22,"e":34.285},{"w":"he","s":34.285,"e":34.538},{"w":"tears","s":34.538,"e":34.761},{"w":"down","s":34.761,"e":34.984},{"w":"his","s":34.984,"e":35.227},{"w":"own","s":35.227,"e":35.552},{"w":"castle.","s":35.552,"e":36.03},{"w":"Beaten","s":36.18,"e":36.499},{"w":"by","s":36.499,"e":36.676},{"w":"the","s":36.676,"e":36.894},{"w":"hay","s":36.894,"e":37.122},{"w":"he","s":37.122,"e":37.34},{"w":"hid","s":37.34,"e":37.498},{"w":"it","s":37.498,"e":37.735},{"w":"with.","s":37.735,"e":38.12}]; const W = (i) => __w[i].s; const We = (i) => __w[i].e; const VO_END = 38.27; const DURATION = 38.42; const LOOP_T = 38.07;

                                                                                         
                                                                                                           

// transient (hit / peak) of each file, from public/sfx/index.json: a cue starts 0.05 s before it, so the hit lands on the event
const TR                         = {
	whoosh_fast: 1.08, whoosh_cine: 0.6, whoosh_air_soft: 0.24, swish_quick: 0.05, whoosh_zoom: 0.43, whoosh_windy: 1.05,
	wood_thud: 0.17, impact_quick: 0.15, impact_stomp: 1.55, boom_cine: 0.27, impact_punch_heavy_kenney: 0.02, impact_sub_boom_kenney: 0.22,
	straw_rustle: 0.19, paper_slide: 1.14, page_turn: 0.24, pen_sign: 0.53, type_key: 0.04, type_bell: 0.04, ding_win: 0.2,
	clock_tick: 0.44, heart_thud: 3.37, swell_dark: 1.67, swell_rev: 2.98, tape_rewind: 0.01, slide_down: 0.77, record_scratch: 0.81,
	pop_lips: 0.2, pop_mouth: 0.01, click_tiny: 0.01, blip_select: 0.01, blip_confirm_kenney: 0, pop_drop_soft_kenney: 0,
};
/** cue whose hit lands `peak` s after the event (file cut from 0.05 s before its transient), optional length */
const sx = (name        , gain        , peak = 0, dur         )      => {
	const tr = TR[name] ?? 0;
	const lead = Math.min(tr, 0.05);
	return {name, gain, at: peak - lead, from: Math.max(0, tr - lead), ...(dur ? {dur} : {})};
};
/** a stretch of a bed-like file (ticking, riser): starts `at` after the event, from `from` inside the file, `dur` long */
const bed = (name        , gain        , at        , from        , dur        )      => ({name, gain, at, from, dur});
// transition whooshes: the hit sits in the middle of the transition (DUR in engine/transitions.tsx)
const whip = (g = -16) => [sx('swish_quick', g, 0.14)];
const punch = (g = -17) => [sx('whoosh_cine', g, 0.08, 0.7)];
const zoom = (g = -15) => [sx('whoosh_zoom', g, 0.22, 0.8)];

const LOOP_PEAK = DURATION - W(123) - 0.04;

export const EVENTS       = [
	// ---------------- 1 HOOK (L3): frame 0 = he rams the last bale into the gap, the cannon muzzle pokes out at the road
	{id: 'hook', w: 0, word: "He's", dt: 0.02, what: 'frame 0: farmer on the swaying ladder shoves the last bale toward a slot in the bale wall: stone merlon – crenel with a cannon barrel aimed at the road – slit merlon; an orange pennant pokes up through the tarp', sfx: [sx('straw_rustle', -15, 0.02, 0.45)]},
	{id: 'thump', w: 1, word: 'hiding', dt: 0.17, what: 'the bale thumps into the gap (the crenel, barrel and slit merlon stay visible): straw dust volumes, 8 px shake, crash-zoom out to the house-high wall, ladder sways hard', sfx: [sx('wood_thud', -5), sx('impact_punch_heavy_kenney', -12), sx('straw_rustle', -14, 0.04, 0.8), sx('whoosh_zoom', -16, 0.3, 0.8)]},
	{id: 'poke', w: 4, word: 'castle', dt: -0.05, what: 'snap onto the crenel: the cannon barrel pokes further out at the road; slow push-in; on «hay» the farmer pats the wall (small straw puff)', sfx: [sx('type_key', -15, 0.1), sx('pop_drop_soft_kenney', -18, 0.12), sx('wood_thud', -17, W(6) + 0.08 - W(4) + 0.05), sx('straw_rustle', -21, W(6) + 0.1 - W(4) + 0.05, 0.4)]},
	// ---------------- 2 NEVER
	{id: 'never', w: 7, word: 'so', dt: -0.06, what: 'PUNCH to the whole wall; a padlock pops in with its shackle open, a wrecking ball starts its swing from the right', sfx: [...punch(), sx('whoosh_windy', -20, 0.7, 1.4)]},
	{id: 'padlock', w: 10, word: 'never', what: 'the giant padlock snaps shut, chains run out across the bales', sfx: [sx('type_key', -7), sx('blip_select', -16, 0.02), sx('paper_slide', -20, 0.15, 0.4)]},
	{id: 'clang', w: 12, word: 'torn', dt: 0.02, what: 'the wrecking ball hits the padlock (impact star at the contact point, shake), hops off twice and droops back against it; the farmer crosses his arms', sfx: [sx('impact_quick', -7, 0, 1.0), sx('type_bell', -13, 0.02)]},
	// ---------------- 3 BET
	{id: 'bet', w: 14, word: 'His', dt: -0.06, what: 'WHIP to the ladder: the farmer gives a thumbs-up', sfx: [...whip()]},
	{id: 'eye', w: 17, word: 'unseen', dt: -0.04, what: 'a crossed-out eye pops in the sky above the tarp (wide open, blinks only later)', sfx: [sx('pop_lips', -13)]},
	{id: 'timer', w: 19, word: 'four', dt: -0.03, what: 'the «4 YEARS» flip timer slams onto the bales (its subtitle hidden), the eye flies into its badge, the flap starts rolling', sfx: [sx('impact_punch_heavy_kenney', -8), sx('straw_rustle', -18, 0.05, 0.5), bed('clock_tick', -20, 0.3, 0.4, 0.75)]},
	// ---------------- 4–5 LOOK / GONE
	{id: 'look', w: 21, word: 'One', dt: -0.06, what: 'WHIP to the road: a plain car crawls in under the wall', sfx: [...whip(), sx('whoosh_air_soft', -20, 0.4, 1.0)]},
	{id: 'driver', w: 22, word: 'look', dt: 0.05, what: "CUT to a 0.37 s close-up of the driver in his teal car: his eyes slide, his head turns up and to the left, toward the bale wall towering behind him (mouth drops open)", sfx: [sx('swish_quick', -19, 0.12), sx('blip_select', -22, 0.18)]},
	{id: 'council', w: 25, word: 'council,', what: "CUT to a 0.45 s face close-up: the farmer freezes on the ladder with a sweat drop, the ticking stops; back wide, the driver's head stays turned to the wall (back of his head) and a dotted eyeline runs from his window to the cannon slot", sfx: [sx('heart_thud', -9, 0.02, 0.7)]},
	{id: 'stamp', w: 29, word: 'order', dt: -0.12, what: 'a giant blank rubber stamp drops over the wall and hovers, wobbling', sfx: [sx('swell_dark', -16, 0.3, 1.0), sx('wood_thud', -16, 0.3)]},
	{id: 'gone', w: 31, word: 'gone.', dt: 0.08, what: 'the stamp lifts away, the driver looks ahead and drives on, the ticking resumes', sfx: [sx('whoosh_air_soft', -15, 0.1, 0.8), sx('blip_confirm_kenney', -19, 0.2), bed('clock_tick', -22, 0.12, 0.4, 0.5)]},
	// ---------------- 6–8 X-RAY
	{id: 'xray', w: 32, word: 'Battlements.', dt: -0.06, what: 'ZOOM-THROUGH into an x-ray scan of the bales: two silo towers, battlements pop up', sfx: [...zoom(), sx('type_key', -12, 0.32), sx('wood_thud', -15, 0.4)]},
	{id: 'cannon', w: 33, word: 'Cannons.', dt: -0.06, what: 'PUNCH on the tower: a cannon rolls forward (9.72–9.90 s) and puffs smoke at 9.87 s, all inside the 0.44 s shot (no shot fired)', sfx: [...punch(-19), sx('paper_slide', -15, 0.05, 0.3), sx('pop_mouth', -15, 0.18)]},
	{id: 'rooms', w: 35, word: 'family', dt: -0.06, what: 'cut to the whole house, its front walls fade to a dollhouse; rooms click on one by one: table with three silhouettes (no faces), TV glow, laundry upstairs', sfx: [sx('whoosh_air_soft', -21, W(34) - W(35) + 0.16, 0.6), sx('type_key', -14), sx('type_key', -15, W(36) - W(35) + 0.06), sx('type_key', -15, W(37) - W(35) + 0.04)]},
	// ---------------- 9–10 NEVER SEES / BALES COME DOWN
	{id: 'seasons', w: 38, word: 'The', dt: -0.06, what: 'WHIP outside: the timer needle races; the same plain car flashes past three times as the field flips snow → blossom → autumn, the driver never turns', sfx: [...whip(), sx('whoosh_fast', -17, 0.24, 0.9), sx('whoosh_fast', -16, W(41) - W(38) - 0.02, 0.9), sx('whoosh_fast', -16, W(43) - W(38) + 0.12, 0.9), bed('clock_tick', -17, 0.1, 0.4, 1.6)]},
	{id: 'ding', w: 44, word: 'Four', dt: -0.02, what: 'summer again: the timer hits «4 YEARS ✓» — DING, check badge, orange glow', sfx: [sx('ding_win', -9)]},
	{id: 'tarp', w: 47, word: 'the', dt: -0.12, what: 'the tarp whips off and takes the timer with it', sfx: [sx('swish_quick', -11), sx('whoosh_fast', -19, 0.1, 0.7)]},
	{id: 'topple', w: 48, word: 'bales', dt: -0.18, what: 'the bales topple like dominoes and reveal the house: timber framing, two battlemented towers, a cannon, a flag (all down by 15.4 s, held before the punch)', sfx: [sx('wood_thud', -11, 0.36), sx('wood_thud', -13, 0.56), sx('wood_thud', -12, 0.78), sx('impact_stomp', -15, 0.6, 1.4), sx('straw_rustle', -15, 0.36, 1.0)]},
	// ---------------- 11–12 WON / COURT
	{id: 'won', w: 51, word: 'He', dt: -0.06, what: 'PUNCH to the tower top: the farmer in a party hat raises a party popper', sfx: [...punch(-18)]},
	{id: 'popper', w: 54, word: 'won.', dt: 0.02, what: 'the popper bursts — streamers and confetti; the music bed cuts here', sfx: [sx('pop_lips', -6), sx('swish_quick', -19, 0.04)]},
	{id: 'freeze', w: 55, word: 'Then', what: 'silence: the confetti freezes in mid-air, a giant gavel descends from the top, its shadow swallows the farmer', sfx: [sx('impact_sub_boom_kenney', -13, 0.2)]},
	// ---------------- 13 TWIST
	{id: 'twist', w: 59, word: 'hiding', dt: -0.06, what: 'PUNCH: card «HIDING IT =» (subtitles hidden); a bale hovers over a bale-shaped gap in the castle wall, the gavel above', sfx: [...punch(-15)]},
	{id: 'slam', w: 62, word: 'part', dt: -0.02, what: 'the gavel slams the bale into the wall like a brick: click, impact star, flash, dust; «BUILDING IT» lands in orange, the bale glows', sfx: [sx('boom_cine', -9, 0, 1.6), sx('wood_thud', -6), sx('impact_punch_heavy_kenney', -10), sx('type_key', -10, 0.12), sx('pop_drop_soft_kenney', -13, W(64) - W(62) - 0.01)]},
	// ---------------- 14 UNFINISHED
	{id: 'page', w: 66, word: 'So', dt: -0.06, what: 'WHIP: the ruling page alone, centred, slow push-in; a highlighter swipes «part of the totality of the operations»', sfx: [...whip(), sx('pen_sign', -14, W(67) - W(66) + 0.08, 0.6)]},
	{id: 'rewind', w: 69, word: 'finished', dt: 0.14, what: 'WHIP to the field: the fallen bales rewind back up onto the wall and hide the castle again', sfx: [...whip(-17), bed('tape_rewind', -13, 0.02, 0, 0.5)]},
	{id: 'bar', w: 70, word: 'until', dt: -0.12, what: 'a «COMPLETED» bar pops in over the wall and stalls just short of full', sfx: [sx('blip_select', -15, 0.1), sx('blip_select', -17, 0.3)]},
	{id: 'fall', w: 71, word: 'the', dt: -0.08, what: 'CUT close to the right tower: the bales come down in a flurry; one last bale is left teetering on the merlons', sfx: [sx('wood_thud', -13, 0.2), sx('wood_thud', -14, 0.38), sx('straw_rustle', -16, 0.1, 0.6)]},
	{id: 'tip', w: 73, word: 'came', dt: 0.05, what: 'the last bale tips over the edge in slow motion, then drops fast — the camera follows it down', sfx: [sx('whoosh_air_soft', -16, 0.25, 0.5)]},
	{id: 'full', w: 74, word: 'down.', dt: 0.31, what: 'the last bale lands on the heap — only now the bar fills and glows', sfx: [sx('wood_thud', -10), sx('blip_confirm_kenney', -12, 0.04)]},
	// ---------------- 15 CLOCK
	{id: 'clock', w: 75, word: 'The', dt: -0.06, what: 'PUNCH: the «4 YEARS ✓» timer over a big dial whose needle sits at the far end, trembling; the farmer in his party hat', sfx: [...punch(-18), bed('clock_tick', -19, 0.1, 0.4, 0.9)]},
	{id: 'deflate', w: 77, word: "hadn't", what: 'his party hat deflates', sfx: [sx('slide_down', -12, 0.3)]},
	{id: 'start', w: 79, word: 'started.', dt: -0.02, what: 'the big needle snaps back past START and settles on it (overshoot, shake, white ring at START), the check badge drops away — never a reset counter', sfx: [sx('wood_thud', -10, 0.1), sx('impact_quick', -19, 0.1, 0.6)]},
	// ---------------- 16–19 BATS / NEWTS / WILDLIFE LAW / REJECTED
	{id: 'stand', w: 80, word: 'His', dt: -0.06, what: 'WHIP to a tight shot of the farmer, arms crossed on the battlements; the camera widens as an excavator rolls up and parks right of the house (inside x ≤ 860)', sfx: [...whip(), sx('whoosh_air_soft', -19, 0.3, 0.9)]},
	{id: 'bat', w: 83, word: 'Bats.', dt: -0.02, what: 'SCREENSHOT MOMENT: the camera dives to the eave, a bat in a barrister wig drops upside down (held ~3 s, blinks, wig wobble)', sfx: [sx('page_turn', -9, 0.02), sx('whoosh_zoom', -19, 0.0, 0.6)]},
	{id: 'newt', w: 85, word: 'newts.', dt: 0.04, what: 'a newt with a tiny suitcase pops out of the rain-butt with a splash', sfx: [sx('pop_mouth', -9), sx('pop_lips', -15, 0.05)]},
	{id: 'movedin', w: 86, word: 'Apparently', what: 'a «HOME» doormat slides in under them; the tiny suitcase is set down by the door; a little picture frame is hung above the door and swings', sfx: [sx('paper_slide', -12, 0.3, 0.45), sx('wood_thud', -16, W(88) - W(86) + 0.15), sx('pop_mouth', -16, W(89) - W(86) - 0.05), sx('type_key', -19, W(89) - W(86) - 0.01)]},
	{id: 'knock', w: 90, word: 'Knock', dt: -0.06, what: 'pull back: the excavator arm unfolds from its travel pose (bucket curled above the ground) and the claw creeps toward the bat (the bat stays in front of the arm)', sfx: [bed('riser_build', -19, 0.1, 5.6, 2.3)]},
	{id: 'sign', w: 97, word: 'break', dt: 0.04, what: 'the bat flips up a «WILDLIFE LAW» sign (its subtitle hidden)', sfx: [sx('swish_quick', -13), sx('page_turn', -15, 0.1)]},
	{id: 'screech', w: 99, word: 'law.', dt: -0.02, what: 'the claw screeches to a stop inches short of the sign (≥ 80 px clear of the bat): sparks, the cab pitches, shake', sfx: [sx('record_scratch', -11, 0, 0.6), sx('impact_quick', -19, 0.02, 0.6)]},
	{id: 'rejected', w: 100, word: 'Rejected.', dt: 0.02, what: 'PUNCH-IN on the sign (≈ 655 px wide): a huge red stamp slams the REJECTED print onto it (its subtitle hidden), lifts fast; the camera pulls back as the newt belly-slides out and the bat flaps off up-left, the sign drops onto the doormat', sfx: [sx('impact_punch_heavy_kenney', -5), sx('wood_thud', -10), sx('whoosh_air_soft', -18, 0.42, 0.5), sx('swish_quick', -17, 0.38), sx('page_turn', -14, 0.46)]},
	// ---------------- 20 JUDGE
	{id: 'judge', w: 101, word: 'The', dt: -0.06, what: 'WHIP: two doors; a deadline clock without digits ticks, a gavel swings like a pendulum between them; the farmer stands just right of its arc', sfx: [...whip(), bed('clock_tick', -18, 0.1, 0.4, 2.5)]},
	{id: 'leftdoor', w: 103, word: 'tear', dt: -0.04, what: 'the left door swings open on a working excavator', sfx: [sx('whoosh_air_soft', -15, 0.1, 0.7)]},
	{id: 'rightdoor', w: 107, word: 'face', dt: -0.04, what: 'the right door swings open on cell bars; the clock bells shake', sfx: [sx('whoosh_air_soft', -15, 0.1, 0.7), sx('impact_quick', -18, 0.25, 0.6)]},
	// ---------------- 21 TEARS
	{id: 'tears', w: 109, word: 'So', dt: -0.06, what: 'ZOOM-THROUGH the left door: the excavator in front of the flag tower bites its top, the flag topples (music back, low); the farmer stands aside right of the house at its scale, cap in hand', sfx: [...zoom(), sx('straw_rustle', -9, 0.4, 0.6), sx('impact_quick', -14, 0.4, 0.8), sx('swish_quick', -16, W(111) - W(109) + 0.16)]},
	{id: 'collapse', w: 114, word: 'own', dt: -0.06, what: 'the house sinks into a rubble heap behind a stone-dust volume', sfx: [sx('impact_stomp', -8, 0, 1.6), sx('boom_cine', -18, 0.05, 1.2)]},
	// ---------------- 22 BEATEN → loop
	{id: 'plot', w: 116, word: 'Beaten', dt: -0.06, what: 'CUT: the dust has cleared to an empty plot; one lone bale rolls in and stops at his boots', sfx: [sx('whoosh_air_soft', -19, 0.1, 0.7), sx('wood_thud', -15, 0.66)]},
	{id: 'sit', w: 118, word: 'the', dt: 0.05, what: 'he plops down on the bale (slow push-in); two small straw puffs beside it, the bale stays fully visible', sfx: [sx('wood_thud', -14), sx('straw_rustle', -20, 0.02, 0.4)]},
	{id: 'lift', w: 121, word: 'hid', dt: 0.04, what: 'he lifts the bale up to his chest, the camera pushes to the frame-0 framing', sfx: [sx('straw_rustle', -17, 0.05, 0.5)]},
	{id: 'loop', w: 123, word: 'with.', dt: 0.04, what: 'HARD MATCH CUT into frame 0: on the ladder with the same bale; the last 0.35 s dissolve into frame 0 (loop)', sfx: [bed('swell_rev', -14, LOOP_PEAK - 0.6, TR.swell_rev - 0.6, 0.62)]},
];
