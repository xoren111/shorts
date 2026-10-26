// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (gap ≤ 2.5 s, word anchors,
// SFX names) and tools/mix.py (SFX timeline). t = words[w].s + dt. sfx: library name in public/sfx (index.json), gain dB
// (library peaks at −3 dBFS), at = offset (s) relative to the event, from = start offset inside the file, dur = cut length (s).
export type Sfx = {name: string; gain: number; at?: number; from?: number; dur?: number};
export type Ev = {id: string; w: number; word: string; dt?: number; what: string; sfx?: Sfx[]; t?: number};

export const EVENTS: Ev[] = [
	// ---------------- HOOK — the ship
	{id: 'hook', w: 0, word: 'Thirteen', dt: -0.04, what: 'English quay at dusk, 13 rabbits hop up the gangplank, Atlas points', sfx: [
		{name: 'dock_ambience', gain: -16}, {name: 'hop_thumps', gain: -19, dur: 3.5}]},
	{id: 'ship', w: 5, word: 'ship,', dt: -0.1, what: 'label England, October 1859; queue reaches the deck', sfx: [{name: 'swish_short', gain: -20}]},
	{id: 'say', w: 8, word: 'say.', what: 'first rabbits drop into the crate', sfx: [{name: 'pop_in', gain: -21}]},
	{id: 'mel', w: 9, word: 'Twenty-four', dt: -0.3, what: 'warm Melbourne light: the crate lid on deck flips open', sfx: [
		{name: 'whoosh_fast', gain: -17}, {name: 'lid_creak', gain: -15, at: 0.08, dur: 0.4}, {name: 'sea_waves', gain: -24, dur: 2.2}]},
	{id: 'pour', w: 10, word: 'got', dt: -0.25, what: '24 rabbits pour out and hop down the gangplank in two lanes', sfx: [{name: 'hop_thumps', gain: -12, dur: 2.4}, {name: 'ear_pops', gain: -17}]},
	{id: 'quay', w: 11, word: 'off.', what: 'the stream reaches the quay', sfx: [{name: 'hop_thumps', gain: -16, at: 0.3, dur: 1.2}]},
	{id: 'lesson', w: 12, word: 'Turns', dt: -0.25, what: "lesson in the ship's hold: a rabbit in glasses at the blackboard, rabbit × rabbit =", sfx: [{name: 'swish_short', gain: -16}, {name: 'dock_ambience', gain: -26, dur: 2.6}]},
	{id: 'tap', w: 14, word: 'rabbits', dt: -0.1, what: 'the teacher taps the board with the pointer', sfx: [{name: 'ui_click', gain: -15}, {name: 'ui_click', gain: -17, at: 0.17}]},
	{id: 'multiply', w: 16, word: 'multiply.', dt: -0.05, what: 'the answer fills up with rabbit heads; students perk up, one raises a paw', sfx: [{name: 'ear_pops', gain: -11}, {name: 'sparkle_ding', gain: -20, at: 0.55}]},
	// ---------------- SCALE
	{id: 'spread', w: 17, word: 'Twenty-four', dt: -0.3, what: 'toon map of Australia: the rabbit tide spreads from Barwon Park', sfx: [{name: 'whoosh_big', gain: -17}]},
	{id: 'tide', w: 19, word: 'hundreds', dt: -0.1, what: 'dots flood NSW and Queensland; label ≈ 600 million by 1950', sfx: [{name: 'hop_thumps', gain: -21, dur: 2.0}, {name: 'pop_in', gain: -22}]},
	{id: 'burrows', w: 22, word: 'Australia', dt: -0.3, what: 'hillside riddled with burrows, heads pop up in a wave', sfx: [{name: 'ear_pops', gain: -13, at: 0.1}, {name: 'ear_pops', gain: -16, at: 0.6}]},
	{id: 'bell1', w: 23, word: 'fought', dt: -0.05, what: 'boxing bell on the post rings', sfx: [{name: 'boxing_bell', gain: -10}]},
	// ---------------- ROUND 1 — the prize
	{id: 'trophy', w: 25, word: 'Round', dt: -0.3, what: 'trophy + money bag rise into a spotlight; £25,000', sfx: [{name: 'riser_short', gain: -19}]},
	{id: 'prize', w: 28, word: 'prize.', dt: -0.05, what: 'spotlight full, trophy turns', sfx: [{name: 'coins_jingle', gain: -13}]},
	{id: 'pasteur', w: 29, word: 'Louis', dt: -0.25, what: 'real Nadar portrait of Pasteur; label He sent his team to Sydney', sfx: [{name: 'swish_short', gain: -16}]},
	{id: 'island', w: 32, word: 'With', dt: -0.25, what: 'inside the Rodd Island lab: bench, microscope, violet culture bubbling over a spirit lamp, a hen', sfx: [{name: 'flask_bubble', gain: -20}, {name: 'sea_waves', gain: -30, dur: 2.0}]},
	{id: 'chicken', w: 33, word: 'chicken', dt: -0.05, what: 'the hen flaps and clucks; on «cholera» she leans to the flask, puzzled', sfx: [{name: 'chicken_cluck', gain: -10}, {name: 'swish_short', gain: -22, at: 0.05}]},
	{id: 'shields', w: 35, word: 'The', dt: -0.3, what: 'paper diagram fades in', sfx: [{name: 'swish_short', gain: -17}]},
	{id: 'sheep', w: 38, word: 'sheep,', dt: -0.05, what: 'sheep pops in + shield', sfx: [{name: 'pop_in', gain: -15}, {name: 'sparkle_ding', gain: -22, at: 0.18}]},
	{id: 'horses', w: 39, word: 'horses,', dt: -0.05, what: 'horse pops in + shield', sfx: [{name: 'pop_in', gain: -15}, {name: 'sparkle_ding', gain: -22, at: 0.18}]},
	{id: 'dogs', w: 40, word: 'dogs.', dt: -0.05, what: 'dog pops in + shield; camel, goat, pig follow in the pause', sfx: [
		{name: 'pop_in', gain: -15}, {name: 'pop_in', gain: -18, at: 0.75}, {name: 'pop_in', gain: -18, at: 0.9}, {name: 'pop_in', gain: -18, at: 1.05}]},
	{id: 'birds', w: 41, word: 'They', dt: -0.35, what: 'chicken struts in without a shield; Atlas enters and facepalms', sfx: [{name: 'chicken_cluck', gain: -13}]},
	{id: 'facepalm', w: 43, word: 'birds.', dt: -0.05, what: 'dashed «?» shield over the chicken', sfx: [{name: 'pop_out', gain: -18}]},
	{id: 'fizzle', w: 44, word: 'It', dt: -0.25, what: 'two rabbit icons; germ arrow sets off', sfx: [{name: 'swish_short', gain: -17}]},
	{id: 'pfft', w: 46, word: 'catch', dt: 0.1, what: 'arrow fizzles out halfway (no rabbit-to-rabbit spread)', sfx: [{name: 'deflate_horn', gain: -14}]},
	{id: 'nobody', w: 48, word: 'Nobody', dt: -0.3, what: 'prize untouched at night, tumbleweed rolls past; nearly 1,500 entries', sfx: [{name: 'tumbleweed', gain: -12}, {name: 'wind_cold', gain: -22, dur: 1.8}]},
	// ---------------- ROUND 2 — the fence
	{id: 'fence1926', w: 50, word: 'Round', dt: -0.3, what: 'real 1926 photo of Fence No. 1 to the horizon', sfx: [{name: 'boxing_bell', gain: -12, at: 0.25}]},
	{id: 'wamap', w: 54, word: 'Ocean', dt: -0.3, what: 'WA map: Fence No. 1 draws from Burracoppin to both oceans', sfx: [{name: 'whoosh_rev', gain: -18}]},
	{id: 'oceans', w: 56, word: 'ocean.', what: 'the line touches both oceans', sfx: [{name: 'pin_drop', gain: -16}, {name: 'sea_waves', gain: -22, dur: 1.2}]},
	{id: 'pegs', w: 57, word: 'Before', dt: -0.3, what: 'netting ends, survey pegs carry on; camera tracks along the string', sfx: [{name: 'wind_cold', gain: -21, dur: 3.4}]},
	{id: 'rabbitWest', w: 61, word: 'rabbits', what: 'the camera finds a rabbit west of the pegs; label 1902', sfx: [{name: 'sniff', gain: -14, at: 0.5}]},
	{id: 'scratch', w: 67, word: 'Some', dt: -0.3, what: 'soil cut-away under the fence: a rabbit digs at a hole on the safe side', sfx: [{name: 'dig_scratch', gain: -10, at: 0.15}]},
	{id: 'dive', w: 69, word: 'to', dt: -0.1, what: 'he dives in; the tunnel opens up in the section under the buried netting', sfx: [{name: 'whoosh_fast', gain: -19}, {name: 'earth_rumble_dirt', gain: -20, at: 0.15, dur: 0.6}]},
	{id: 'popout', w: 72, word: 'out.', dt: 0.02, what: 'pops out on the other side by his gang, dirt bursts, he shakes off', sfx: [{name: 'ear_pops', gain: -11}, {name: 'dust_puff', gain: -17, at: 0.05}, {name: 'hop_thumps', gain: -20, at: 0.75, dur: 0.6}]},
	// ---------------- ROUND 3 — the virus
	{id: 'wardang', w: 73, word: 'Round', dt: -0.3, what: 'toon Wardang Island from high above, sea all round', sfx: [{name: 'boxing_bell', gain: -12, at: 0.25}, {name: 'sea_waves', gain: -24, dur: 4.2}]},
	{id: 'swoop', w: 75, word: 'a', dt: -0.25, what: 'camera swoops down to the quarantine pen with rabbits', sfx: [{name: 'whoosh_big', gain: -18}]},
	{id: 'virus', w: 77, word: 'virus,', dt: -0.12, what: 'a big violet virus pops up over the pedestal in the pen', sfx: [{name: 'pop_in', gain: -14}, {name: 'sparkle_ding', gain: -22, at: 0.1}]},
	{id: 'locked', w: 78, word: 'locked', dt: 0.02, what: 'the gate swings shut, a golden padlock drops onto it', sfx: [{name: 'whoosh_fast', gain: -22}, {name: 'ui_click', gain: -10, at: 0.32}, {name: 'stamp', gain: -20, at: 0.32}]},
	{id: 'pullback', w: 80, word: 'an', dt: -0.1, what: 'camera pulls back up: the whole island, sea all round', sfx: [{name: 'whoosh_rev', gain: -20}]},
	{id: 'escape', w: 82, word: 'It', dt: -0.3, what: 'Spencer Gulf map: flies lift the glyphs out of the pens', sfx: [{name: 'fly_buzz', gain: -11}, {name: 'fly_buzz', gain: -15, at: 0.35}]},
	{id: 'front', w: 86, word: 'on', what: 'dotted front creeps inland from the coast', sfx: [{name: 'whoosh_rev', gain: -21}]},
	{id: 'ceremony', w: 88, word: 'Next', dt: -0.3, what: 'stage with bunting on WA farmland, scissors glide in', sfx: [{name: 'whoosh_fast', gain: -17}]},
	{id: 'snip', w: 93, word: 'ceremony.', dt: -0.08, what: 'giant scissors snip the ribbon; the virus-emblem crate opens, viruses float out', sfx: [
		{name: 'scissors_snip', gain: -8}, {name: 'applause_polite', gain: -15, at: 0.2}, {name: 'pop_in', gain: -18, at: 0.35}, {name: 'pop_in', gain: -20, at: 0.55}, {name: 'pop_in', gain: -21, at: 0.75}]},
	{id: 'already', w: 94, word: 'The', dt: -0.3, what: 'WA map: violet dots already over the farm belt; ceremony pin in a gap', sfx: [{name: 'deflate_horn', gain: -15, at: 1.1}]},
	{id: 'flee', w: 95, word: 'virus', what: 'cartoon rabbits flee west, some already swimming away', sfx: [{name: 'hop_thumps', gain: -17, dur: 1.8}, {name: 'sea_waves', gain: -20, at: 0.2, dur: 1.6}]},
	{id: 'bar', w: 99, word: 'And', dt: -0.3, what: 'the bar drops to ~2/5; the rabbit on top leaps in fright and lands on the new top', sfx: [{name: 'whoosh_rev', gain: -18, at: 0.3}, {name: 'ear_pops', gain: -15, at: 0.32}, {name: 'hop_thumps', gain: -14, at: 1.2, dur: 0.35}, {name: 'dust_puff', gain: -20, at: 1.2}]},
	// ---------------- FINAL — the score
	{id: 'score', w: 102, word: 'Three', dt: -0.3, what: 'wooden scoreboard at dusk, Atlas enters big lower-left', sfx: [{name: 'whoosh_big', gain: -15}]},
	{id: 'rabbits2', w: 105, word: 'two.', dt: -0.06, what: 'tile 2 drops into RABBITS', sfx: [{name: 'scoreboard_flip', gain: -9}]},
	{id: 'fly', w: 106, word: 'Flies', dt: 0.05, what: 'a fly buzzes in', sfx: [{name: 'fly_buzz', gain: -15, dur: 1.1}]},
	{id: 'flies1', w: 107, word: 'one.', dt: -0.06, what: 'tile 1 drops into FLIES, the fly lands on it', sfx: [{name: 'scoreboard_flip', gain: -9}]},
	{id: 'australia0', w: 109, word: 'zero.', dt: -0.06, what: 'tile 0 drops into AUSTRALIA, Atlas shrugs', sfx: [{name: 'scoreboard_flip', gain: -9}]},
	{id: 'rise', w: 110, word: 'They', dt: -0.1, what: 'camera cranes up over the board', sfx: [{name: 'whoosh_big', gain: -18}]},
	{id: 'plain', w: 113, word: 'before', what: 'plain full of rabbits; label Today ≈ 200 million (est.)', sfx: [{name: 'hop_thumps', gain: -24, dur: 2.0}]},
	{id: 'sails', w: 115, word: 'ship', what: "the clipper's sails on the violet sea", sfx: [{name: 'ship_horn_low', gain: -22}]},
	{id: 'wink', w: 118, word: 'Probably.', what: 'Atlas winks; dissolve back to the opening frame (loop)', sfx: [{name: 'tynts', gain: -10, at: 0.5}]},
];
