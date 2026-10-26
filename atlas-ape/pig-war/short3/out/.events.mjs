// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (gap ≤ 2.5 s, word anchors,
// SFX names) and tools/mix.py (SFX timeline). t = words[w].s + dt. sfx: library name in public/sfx (index.json), gain dB
// (library peaks at −3 dBFS), at = offset (s) relative to the event, from = start offset inside the file, dur = cut length (s).
// v3 drawn edit (src/scenes.tsx): every transition gets its whoosh, every pop / plant / stamp its hit.
                                                                                         
                                                                                                           

export const EVENTS       = [
	// ---------------- HOOK — the map, then the pig
	{id: 'map', w: 0, word: 'America', dt: -0.06, what: 'frame 0: bright 3D map; US land tints blue + USA tag (Washington Territory)', sfx: [{name: 'hit_impact', gain: -14}, {name: 'pop_in', gain: -17, at: 0.08}, {name: 'pop_in', gain: -17, at: 0.95}, {name: 'riser_short', gain: -24, dur: 1.4}, {name: 'seagulls', gain: -28}]},
	{id: 'claims', w: 3, word: 'almost', dt: -0.1, what: 'both claim lines race down the straits (BRITISH tag on Vancouver Island popped on «Britain»)', sfx: [{name: 'swish_short', gain: -20}, {name: 'pop_in', gain: -18, at: 0.3}, {name: 'pop_in', gain: -19, at: 0.6}]},
	{id: 'war', w: 6, word: 'war.', dt: 0.05, what: 'San Juan Island pulses between the lines; a war-drum hit', sfx: [{name: 'hit_impact', gain: -15}, {name: 'fife_drum', gain: -24, dur: 0.6}]},
	{id: 'pig', w: 7, word: 'Over', dt: -0.12, what: 'ZOOM-THROUGH into the island → the grinning pig with its potato', sfx: [{name: 'whoosh_fast', gain: -14}, {name: 'record_scratch', gain: -20, at: 0.12}, {name: 'pig_chew', gain: -16, at: 0.2, dur: 1.3}]},
	{id: 'ring', w: 9, word: 'pig.', dt: -0.05, what: 'a red marker ring draws around the pig; it snorts', sfx: [{name: 'wire_scratch', gain: -22}, {name: 'pig_oink', gain: -12, at: 0.1}]},
	// ---------------- the farmer
	{id: 'farmer', w: 10, word: 'A', dt: -0.16, what: 'WHIP → the farmer storms out of his cabin; the pig freezes, potato in mouth', sfx: [{name: 'whoosh_fast', gain: -16}, {name: 'door_bang', gain: -13, at: 0.15}, {name: 'pig_grunt', gain: -19, at: 0.5, dur: 1.0}]},
	{id: 'eating', w: 14, word: 'eating', dt: -0.05, what: 'the farmer shouts and points, the pig chews on', sfx: [{name: 'pig_chew', gain: -17, dur: 1.2}]},
	{id: 'aim', w: 17, word: 'So', dt: -0.15, what: 'PUNCH → the farmer kneels and aims his rifle', sfx: [{name: 'swish_short', gain: -19}, {name: 'ui_click', gain: -16, at: 0.4}]},
	{id: 'bang', w: 19, word: 'shot', dt: 0.02, what: 'BANG: muzzle flash → SMOKE WIPE fills the frame (the hit is never shown), cut hides in it', sfx: [{name: 'musket_shot', gain: -6}, {name: 'whoosh_big', gain: -16, at: 0.04}, {name: 'birds_flutter', gain: -12, at: 0.1}]},
	// ---------------- who is who
	{id: 'us', w: 21, word: 'Problem:', dt: -0.25, what: 'the smoke clears onto navy rays: the 1859 Stars and Stripes is hoisted, the farmer badge pops', sfx: [{name: 'pop_in', gain: -15}, {name: 'sails_flap', gain: -22, at: 0.05, dur: 0.6}]},
	{id: 'american', w: 25, word: 'American.', dt: -0.25, what: 'the flag snaps bigger', sfx: [{name: 'sails_flap', gain: -18, dur: 0.9}, {name: 'hit_impact', gain: -22}]},
	{id: 'vs', w: 26, word: 'The', dt: -0.1, what: 'WHIP → the screen splits: farmer top-left on navy, red half slides in, «VS»', sfx: [{name: 'whoosh_fast', gain: -16}, {name: 'hit_impact', gain: -18, at: 0.35}]},
	{id: 'pigbadge', w: 27, word: 'pig', dt: -0.15, what: 'the pig badge pops on the red half', sfx: [{name: 'pop_in', gain: -15}, {name: 'pig_oink', gain: -18, at: 0.1}]},
	{id: 'uk', w: 29, word: 'British.', dt: -0.3, what: 'a Union Jack shoots up behind the pig', sfx: [{name: 'sails_flap', gain: -18, dur: 0.9}]},
	// ---------------- the price
	{id: 'coin', w: 30, word: 'He', dt: -0.2, what: 'CIRCLE → a spinning gold $10 coin falls and bounces; KEYFACT $10', sfx: [{name: 'whoosh_rev', gain: -18}, {name: 'coins_jingle', gain: -11, at: 0.55, dur: 0.6}]},
	{id: 'owner', w: 34, word: 'The', dt: -0.1, what: 'PUSH UP → the furious owner card slams in over red rays', sfx: [{name: 'swish_short', gain: -17}, {name: 'hit_impact', gain: -20, at: 0.1}]},
	{id: 'pile', w: 37, word: 'a', dt: -0.05, what: 'nine more coins rain into a pile; KEYFACT $100', sfx: [{name: 'coins_jingle', gain: -9}, {name: 'coins_jingle', gain: -14, at: 0.25}]},
	// ---------------- the island (drawn — no maps after the hook)
	{id: 'island', w: 39, word: 'Worse,', dt: -0.3, what: 'PUNCH → San Juan Island (traced from the DEM) drops in on a sea of rays', sfx: [{name: 'whoosh_big', gain: -19}, {name: 'crate_thud', gain: -18, at: 0.25}]},
	{id: 'ukplant', w: 40, word: 'both', dt: -0.1, what: 'a Union Jack plants into the west half', sfx: [{name: 'crate_thud', gain: -14}]},
	{id: 'usplant', w: 41, word: 'countries', dt: -0.1, what: 'the Stars and Stripes plants into the east half', sfx: [{name: 'crate_thud', gain: -14}]},
	{id: 'crack', w: 42, word: 'claimed', what: 'the island tints red / blue and cracks down the middle; label San Juan Island', sfx: [{name: 'fissure_rip', gain: -18}, {name: 'alarm_pulse', gain: -26, at: 0.3, dur: 1.0}]},
	// ---------------- escalation
	{id: 'troops', w: 45, word: 'America', dt: -0.3, what: 'WHIP → a big blue column marches across', sfx: [{name: 'whoosh_fast', gain: -16}, {name: 'fife_drum', gain: -13, dur: 2.9}, {name: 'marching', gain: -14, dur: 2.9}]},
	{id: 'army', w: 48, word: 'four', dt: -0.15, what: 'the column shrinks into an army of 400 that pops in from the centre', sfx: [{name: 'crowd_hey', gain: -21}, {name: 'riser_short', gain: -24, dur: 0.8}]},
	{id: 'cannons', w: 49, word: 'hundred', what: '14 cannons roll into a row; label 14 cannons', sfx: [{name: 'cannon_roll', gain: -17}]},
	{id: 'ships', w: 51, word: 'Britain', dt: -0.3, what: 'WHIP → five warships sail in over red rays', sfx: [{name: 'whoosh_fast', gain: -16}, {name: 'sea_waves', gain: -19, dur: 2.3}, {name: 'ship_creak', gain: -20, dur: 2.3}, {name: 'ship_bell', gain: -20, at: 0.6}]},
	{id: 'ports', w: 54, word: 'warships.', dt: -0.1, what: 'all gun ports run out; label 70 guns · 2,140 men', sfx: [{name: 'gunports', gain: -14}]},
	// ---------------- governor / admiral
	{id: 'governor', w: 55, word: 'The', dt: -0.3, what: 'DIAGONAL WIPE → the governor (top hat) glares; label Governor James Douglas', sfx: [{name: 'whoosh_rev', gain: -17}]},
	{id: 'point', w: 57, word: 'wanted', dt: -0.1, what: 'he jabs his finger at the Americans', sfx: [{name: 'swish_short', gain: -16}]},
	{id: 'gone', w: 60, word: 'gone.', dt: -0.05, what: 'a red X stamps over them and they fly off', sfx: [{name: 'stamp', gain: -12}, {name: 'whoosh_fast', gain: -20, at: 0.2}]},
	{id: 'admiral', w: 61, word: 'The', dt: -0.3, what: 'WHIP → the admiral (bicorne, epaulettes), arms crossed; label Rear Admiral Robert Baynes', sfx: [{name: 'whoosh_fast', gain: -16}, {name: 'ship_bell', gain: -23, at: 0.3}]},
	{id: 'no', w: 64, word: 'no.', dt: -0.1, what: 'he shakes his head', sfx: [{name: 'hit_impact', gain: -17}, {name: 'swish_short', gain: -22, at: 0.1}]},
	{id: 'pig2', w: 65, word: 'Not', dt: -0.1, what: 'CIRCLE → the pig again, close, grinning', sfx: [{name: 'sniff', gain: -12}, {name: 'pig_oink', gain: -15, at: 0.6}]},
	// ---------------- twelve years + party
	{id: 'stayed', w: 69, word: 'So', dt: -0.3, what: 'WHIP → two bored young sentries, redcoat and bluecoat, at a fence post', sfx: [{name: 'whoosh_fast', gain: -17}, {name: 'wind_meadow', gain: -24, dur: 2.0}]},
	{id: 'years', w: 74, word: 'For', dt: -0.1, what: 'DISSOLVE → the same two, ancient, beards to the ground; year bar 1860 → 1872', sfx: [{name: 'seasons_whoosh', gain: -14}, {name: 'clock_tick_fast', gain: -20, dur: 1.8}]},
	{id: 'party', w: 77, word: 'And', dt: -0.3, what: 'PUNCH → fireworks; two tin mugs (blue / red) swing in and clink; confetti', sfx: [{name: 'fireworks', gain: -17}, {name: 'party_laugh', gain: -20, at: 0.1}, {name: 'mug_clink', gain: -10, at: 0.4}]},
	// ---------------- Kaiser + seal + result
	{id: 'kaiser', w: 80, word: 'Then', dt: -0.3, what: 'PUSH UP → the Kaiser (Pickelhaube) rises under the imperial flag; label Kaiser Wilhelm I', sfx: [{name: 'whoosh_big', gain: -18}, {name: 'fanfare_hit', gain: -21, at: 0.25}]},
	{id: 'seal', w: 84, word: 'settled', dt: 0.02, what: 'CUT → the award document; a red wax seal slams down', sfx: [{name: 'stamp', gain: -8}, {name: 'hit_impact', gain: -15}]},
	{id: 'result', w: 86, word: 'The', dt: -0.3, what: 'CIRCLE from the seal → the island again, the Union Jack sinks', sfx: [{name: 'whoosh_rev', gain: -18}, {name: 'swish_short', gain: -21, at: 0.4}]},
	{id: 'usa', w: 90, word: 'America.', dt: -0.1, what: 'the whole island turns blue, a big Stars and Stripes rises; label → USA, 1872', sfx: [{name: 'pop_in', gain: -14}, {name: 'fanfare_hit', gain: -18, at: 0.05}]},
	// ---------------- finale
	{id: 'angel', w: 91, word: 'Total', dt: -0.3, what: 'DISSOLVE → the angel pig on a pink cloud, sparkles; Atlas enters', sfx: [{name: 'harp_gliss', gain: -17}, {name: 'angel_choir', gain: -23, at: 0.1}]},
	{id: 'onepig', w: 94, word: 'pig.', dt: 0.05, what: 'the pig smiles; Atlas laughs', sfx: [{name: 'pig_oink', gain: -12}, {name: 'sparkle_ding', gain: -21, at: 0.1}]},
	{id: 'poll', w: 95, word: 'Team', dt: -0.15, what: 'poll card: farmer VS pig; Atlas thinks', sfx: [{name: 'pop_in', gain: -15}, {name: 'notify_ding', gain: -19, at: 0.2}]},
	{id: 'loop', w: 99, word: 'pig?', dt: 0.15, what: 'dissolve back to the opening map (loop)', sfx: [{name: 'seagulls', gain: -28}]},
];
