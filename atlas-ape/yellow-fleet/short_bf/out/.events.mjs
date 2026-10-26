// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (gap ≤ 2.5 s, word anchors,
// SFX names) and tools/mix.py (SFX timeline). t = words[w].s + dt. sfx: library name in public/sfx (index.json), gain dB
// (library peaks at −3 dBFS), at = offset (s) relative to the event, from = start offset inside the file, dur = cut length (s).
                                                                                         
                                                                                                           

export const EVENTS       = [
	// ---------------- HOOK — a one-day trip … eight years
	{id: 'hook', w: 0, word: 'Fourteen', dt: -0.04, what: 'variant B: big 1-DAY TRIP over the convoy from frame 0; the convoy glides into the narrow canal', sfx: [
		{name: 'diesel_hum', gain: -22, dur: 3.7}, {name: 'seagulls', gain: -20}, {name: 'sea_waves', gain: -28, dur: 3.6},
		{name: 'metal_groan', gain: -24, dur: 0.6}, {name: 'whoosh_rev', gain: -21, at: 0.25}]},
	{id: 'horn', w: 8, word: 'one-day', dt: -0.1, what: 'a cheerful short horn from the lead ship', sfx: [{name: 'boat_horn', gain: -19, dur: 0.8}]},
	{id: 'strike', w: 9, word: 'trip.', dt: 0.30, what: 'variant B: a red marker stroke crosses out 1-DAY TRIP', sfx: [{name: 'wire_scratch', gain: -20, dur: 0.3}]},
	{id: 'later', w: 10, word: 'They', dt: -0.3, what: 'same camera, eight years later: sand-yellow rusty ships on tow ropes', sfx: [
		{name: 'whoosh_big', gain: -18}, {name: 'diesel_hum', gain: -27, dur: 2.2}, {name: 'metal_groan', gain: -24, at: 0.5}]},
	{id: 'eight', w: 13, word: 'eight', dt: -0.1, what: 'KEYFACT 8 YEARS + the 8-tick bar fills (no year numbers in B)', sfx: [{name: 'stamp', gain: -16}, {name: 'riser_short', gain: -24, at: 0.05, dur: 0.8}]},
	// ---------------- WAR
	{id: 'war', w: 16, word: 'Halfway', dt: -0.3, what: 'convoy in the canal from the west bank', sfx: [{name: 'whoosh_fast', gain: -19}, {name: 'diesel_hum', gain: -26, dur: 2.2}]},
	{id: 'jets', w: 17, word: 'through,', what: 'two toy jets streak over the ships, cream trails; label Six-Day War', sfx: [{name: 'jet_flyby', gain: -11, at: -0.95}]},
	{id: 'smoke', w: 18, word: 'war', dt: 0.05, what: 'cream smoke columns rise far on the eastern horizon', sfx: [{name: 'explosion_far', gain: -17}, {name: 'explosion_far', gain: -20, at: 0.35}]},
	{id: 'alarm', w: 20, word: 'out.', what: 'the convoy sounds its horn', sfx: [{name: 'ship_horn_low', gain: -18, dur: 1.0}]},
	// ---------------- BLOCKED
	{id: 'sink', w: 21, word: 'Egypt', dt: -0.3, what: 'paper cutaway of the canal: our convoy in the middle', sfx: [{name: 'swish_short', gain: -17}]},
	{id: 'sank1', w: 22, word: 'sank', dt: -0.05, what: 'the north blockship tilts and sinks with bubbles', sfx: [{name: 'metal_groan', gain: -14}, {name: 'bubbles_sink', gain: -15, at: 0.2}]},
	{id: 'sank2', w: 25, word: 'block', dt: -0.15, what: 'the south blockship sinks; convoy stuck between the masts', sfx: [{name: 'metal_groan', gain: -16}, {name: 'bubbles_sink', gain: -16, at: 0.2}]},
	// ---------------- TRAPPED + YELLOW
	{id: 'lake', w: 35, word: 'Trapped', dt: -0.3, what: 'rising over the Great Bitter Lake: 14 ships, scuttled masts at both ends', sfx: [
		{name: 'whoosh_rev', gain: -18}, {name: 'sea_waves', gain: -24, dur: 2.4}, {name: 'seagulls', gain: -26}]},
	{id: 'nowhere', w: 39, word: 'nowhere', dt: -0.3, what: 'map card: the Great Bitter Lake with the 14 ships', sfx: [{name: 'pop_in', gain: -18}, {name: 'pop_in', gain: -24, at: 0.35}]},
	{id: 'blocks', w: 40, word: 'to', dt: -0.1, what: 'red no-entry marks close both ends of the lake', sfx: [{name: 'stamp', gain: -17}, {name: 'stamp', gain: -19, at: 0.12}]},
	{id: 'storm', w: 42, word: 'Sandstorms', dt: -0.3, what: 'an ochre storm wall rolls over the fleet', sfx: [{name: 'sandstorm', gain: -10, dur: 3.4}]},
	{id: 'yellow', w: 45, word: 'yellow.', dt: -0.1, what: 'the ships turn yellow', sfx: [{name: 'dust_puff', gain: -20}]},
	{id: 'fleet', w: 46, word: 'The', dt: -0.15, what: 'hero shot of the yellow fleet', sfx: [{name: 'whoosh_big', gain: -20}, {name: 'ship_horn_low', gain: -17, at: 0.35, dur: 1.4}]},
	// ---------------- FRIENDS
	{id: 'friends', w: 49, word: 'Their', dt: -0.3, what: 'British + Polish ships side by side; 8 flags pop in, split West | East', sfx: [{name: 'swish_short', gain: -18}, {name: 'sea_waves', gain: -27, dur: 3.4},
		{name: 'pop_in', gain: -24, at: 0.3}, {name: 'pop_in', gain: -24, at: 0.46}, {name: 'pop_in', gain: -24, at: 0.62}, {name: 'pop_in', gain: -24, at: 0.78}]},
	{id: 'rivals', w: 52, word: 'rivals.', dt: -0.1, what: 'sailors stare across the gap, arms crossed', sfx: [{name: 'pin_drop', gain: -21}]},
	{id: 'plank', w: 53, word: 'The', dt: 0.05, what: 'a plank swings down across the gap', sfx: [{name: 'plank_creak', gain: -12}]},
	{id: 'shake', w: 56, word: 'friends.', dt: -0.05, what: 'handshake in the middle, everyone waves', sfx: [{name: 'crowd_hey', gain: -13}, {name: 'sparkle_ding', gain: -23, at: 0.1}]},
	{id: 'football', w: 57, word: 'Football', dt: -0.3, what: 'behind the goal: the striker dribbles at us, shoots, keeper dives, net bulges, he celebrates', sfx: [{name: 'ball_kick', gain: -9, at: 0.5}, {name: 'crowd_cheer_short', gain: -16, at: 0.82}]},
	{id: 'stamps', w: 60, word: 'Their', dt: -0.3, what: '3D: a sailor stomps on the linocut block, hops off, the block flips → a fresh sheet of yellow stamps', sfx: [
		{name: 'stamp', gain: -12, at: 0.25}, {name: 'swish_short', gain: -18, at: 0.55}]},
	// ---------------- OLYMPICS
	{id: 'race', w: 63, word: 'Their', dt: -0.3, what: 'rowing race full-screen + two PiP cards (diving off a plank, sprint through the finish tape); label 14 events', sfx: [
		{name: 'start_whistle', gain: -15, at: 0.05}, {name: 'oar_splashes', gain: -14, dur: 1.7}, {name: 'crowd_roar', gain: -22, dur: 1.6}, {name: 'pop_in', gain: -20, at: 0.22}, {name: 'pop_in', gain: -21, at: 0.5}, {name: 'oar_splashes', gain: -15, at: 0.9, dur: 0.5}, {name: 'crowd_cheer_short', gain: -19, at: 1.1}]},
	{id: 'olympics', w: 65, word: 'Olympics.', what: 'the lead boat pulls ahead, oars flashing', sfx: []},
	{id: 'podium', w: 66, word: 'Poland', dt: -0.25, what: 'podium on deck: Poland 1st, West Germany 2nd, Britain 3rd', sfx: [{name: 'fanfare_hit', gain: -14}, {name: 'crowd_roar', gain: -18, at: 0.2, dur: 1.2}]},
	{id: 'won', w: 67, word: 'won.', dt: -0.05, what: 'winner raises his arms, confetti', sfx: [{name: 'sparkle_ding', gain: -18}]},
	// ---------------- TWO SAIL HOME
	{id: 'hamburg', w: 76, word: 'Home', dt: -0.3, what: 'route map Suez → Hamburg draws round Europe, then the Hamburg pier: fireboats, crowd', sfx: [{name: 'whoosh_rev', gain: -20, at: 0.1}, 
		{name: 'whoosh_big', gain: -18}, {name: 'crowd_roar', gain: -17, dur: 3.2}, {name: 'water_hose', gain: -20, dur: 3.0}, {name: 'ship_horn_low', gain: -15, at: 0.4, dur: 1.4}]},
	{id: 'thousands', w: 81, word: 'thousands', dt: -0.1, what: 'the crowd cheers louder', sfx: [{name: 'crowd_roar', gain: -15, dur: 1.8}]},
	{id: 'photo', w: 82, word: 'cheered.', dt: -0.25, what: 'fireboat arches peak, hats fly, the ship sounds her horn', sfx: [{name: 'boat_horn', gain: -20, dur: 0.9, at: 0.3}]},
	// ---------------- FINAL — the cargo
	{id: 'hold', w: 83, word: 'Part', dt: -0.3, what: 'in the hold: the hatch lifts, light pours in', sfx: [{name: 'hatch_open', gain: -12}, {name: 'whoosh_rev', gain: -24}]},
	{id: 'crate', w: 86, word: 'cargo?', what: 'camera tilts down to the dusty crate; Atlas enters lower-left', sfx: [{name: 'swish_short', gain: -22}]},
	{id: 'clocks', w: 87, word: 'Kitchen', dt: -0.02, what: 'the crate front drops: rows of pastel kitchen clocks', sfx: [
		{name: 'crate_drop', gain: -9, at: 0.05}, {name: 'dust_puff', gain: -19, at: 0.35}, {name: 'clocks_ticking', gain: -13, at: 0.4}]},
	{id: 'push', w: 89, word: 'Delivered', dt: -0.15, what: 'push in on the clocks', sfx: [{name: 'clocks_ticking', gain: -15, from: 0.3}]},
	{id: 'late', w: 93, word: 'late.', what: 'Atlas winks; ship bell', sfx: [{name: 'ship_bell', gain: -12}]},
	{id: 'stars', w: 94, word: 'How', dt: -0.25, what: 'delivery-rating card with five empty stars pops in; Atlas thinks', sfx: [{name: 'notify_ding', gain: -11}, {name: 'clocks_ticking', gain: -18, at: 0.4, from: 0.6}]},
	{id: 'loop', w: 99, word: 'delivery?', dt: 0.55, what: 'dissolve back to the opening frame (loop)', sfx: [{name: 'seagulls', gain: -24}, {name: 'boat_horn', gain: -22, at: 0.35, dur: 0.6}]},
];
