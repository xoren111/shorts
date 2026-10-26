// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (gap ≤ 2.5 s, word anchors,
// SFX names) and tools/mix.py (SFX timeline). t = words[w].s + dt. sfx: library name in public/sfx (index.json), gain dB
// (library peaks at −3 dBFS), at = offset (s) relative to the event, from = start offset inside the file, dur = cut length (s).
                                                                                         
                                                                                                           

export const EVENTS       = [
	// ---------------- HOOK — the standoff over a pig
	{id: 'hook', w: 0, word: 'America', dt: -0.06, what: 'frame 0: the boar munching a potato between the US hill (flag, line, cannon) and the British frigate (Union Jack)', sfx: [
		{name: 'pig_chew', gain: -15, dur: 2.4}, {name: 'pig_grunt', gain: -19, at: 0.6, dur: 2.0}, {name: 'wind_meadow', gain: -25, dur: 4.6}, {name: 'seagulls', gain: -27}]},
	{id: 'flags', w: 2, word: 'Britain', what: 'both flags flutter, the frigate rolls at anchor', sfx: [{name: 'sails_flap', gain: -24, dur: 1.6}]},
	{id: 'ports', w: 5, word: 'to', dt: -0.05, what: 'the frigate opens her gun ports and runs out her guns', sfx: [{name: 'gunports', gain: -14}, {name: 'cannon_roll', gain: -19, at: 0.15}]},
	{id: 'war', w: 6, word: 'war.', dt: 0.05, what: 'a dull drum hit on «war»', sfx: [{name: 'hit_impact', gain: -20}]},
	{id: 'push', w: 7, word: 'Over', dt: -0.12, what: 'push in on the boar', sfx: [{name: 'whoosh_rev', gain: -23}]},
	{id: 'look', w: 8, word: 'one', dt: -0.1, what: 'the boar stops chewing and looks up at us', sfx: [{name: 'pig_oink', gain: -13}]},
	{id: 'drop', w: 9, word: 'pig.', dt: 0.08, what: 'the potato drops out of its mouth and bounces', sfx: [{name: 'crate_thud', gain: -26}]},
	// ---------------- CAUGHT / SHOT
	{id: 'caught', w: 10, word: 'A', dt: -0.3, what: 'behind the munching boar: the log cabin', sfx: [{name: 'swish_short', gain: -24}, {name: 'pig_chew', gain: -20, dur: 1.2}]},
	{id: 'door', w: 11, word: 'farmer', dt: -0.35, what: 'the cabin door bangs open, the farmer storms out (label Lyman Cutlar, June 1859)', sfx: [{name: 'door_bang', gain: -11}]},
	{id: 'eating', w: 14, word: 'eating', what: 'the boar keeps munching in the foreground', sfx: [{name: 'pig_grunt', gain: -17, dur: 1.4}, {name: 'pig_chew', gain: -17, at: 0.3, dur: 1.0}]},
	{id: 'aim', w: 17, word: 'So', dt: -0.3, what: 'side view: the farmer aims his rifle at the boar', sfx: [{name: 'swish_short', gain: -22}, {name: 'ui_click', gain: -16, at: 0.45}]},
	{id: 'bang', w: 19, word: 'shot', dt: 0.02, what: 'BANG: flash + powder smoke rolls over the boar; birds burst out of a fir', sfx: [{name: 'musket_shot', gain: -6}, {name: 'birds_flutter', gain: -10, at: 0.06}]},
	{id: 'angel', w: 20, word: 'it.', dt: 0.15, what: 'the angel boar (halo, wings) rises out of the smoke', sfx: [{name: 'harp_gliss', gain: -17}, {name: 'angel_choir', gain: -23, at: 0.1}]},
	// ---------------- BRITISH
	{id: 'problem', w: 21, word: 'Problem:', dt: -0.3, what: 'the farmer by his cabin, the flag folded at the foot of the pole', sfx: [{name: 'swish_short', gain: -22}]},
	{id: 'usflag', w: 25, word: 'American.', dt: -0.35, what: 'the Stars and Stripes runs up the pole', sfx: [{name: 'sails_flap', gain: -18, dur: 1.0}, {name: 'sparkle_ding', gain: -25, at: 0.45}]},
	{id: 'pan', w: 26, word: 'The', dt: -0.3, what: 'pan up to the angel boar over the patch', sfx: [{name: 'whoosh_rev', gain: -23}]},
	{id: 'ukflag', w: 29, word: 'British.', dt: -0.3, what: 'a Union Jack pops out of the angel\'s mouth', sfx: [{name: 'pop_in', gain: -15}, {name: 'sails_flap', gain: -22, at: 0.1, dur: 0.9}]},
	// ---------------- PRICE
	{id: 'price', w: 30, word: 'He', dt: -0.3, what: 'the farmer and the owner face each other, the angel referees above', sfx: [{name: 'swish_short', gain: -22}]},
	{id: 'ten', w: 32, word: 'ten', dt: -0.1, what: 'the farmer holds out a $10 note; KEYFACT $10', sfx: [{name: 'banknote', gain: -7}, {name: 'pop_in', gain: -21}]},
	{id: 'no', w: 35, word: 'owner', dt: -0.1, what: 'the owner shakes his head', sfx: [{name: 'swish_short', gain: -25}]},
	{id: 'hundred', w: 37, word: 'a', dt: -0.2, what: 'the owner slaps up a $100 note; KEYFACT $100', sfx: [{name: 'banknote', gain: -7}, {name: 'stamp', gain: -18, at: 0.12}]},
	// ---------------- MAP
	{id: 'map', w: 39, word: 'Worse,', dt: -0.3, what: '3D relief map of the islands between Vancouver Island and the US mainland', sfx: [{name: 'whoosh_big', gain: -19}, {name: 'riser_short', gain: -25, dur: 1.0}]},
	{id: 'flag1', w: 40, word: 'both', what: 'flag poles pop up: Union Jack on Vancouver Island', sfx: [{name: 'pop_in', gain: -16}]},
	{id: 'flag2', w: 41, word: 'countries', what: 'Stars and Stripes on the mainland; both claim lines draw around the islands', sfx: [{name: 'pop_in', gain: -17}, {name: 'swish_short', gain: -21, at: 0.2}]},
	{id: 'island', w: 43, word: 'the', what: 'San Juan Island pulses red / blue; label San Juan Island', sfx: [{name: 'alarm_pulse', gain: -25, dur: 1.2}]},
	// ---------------- ESCALATION
	{id: 'soldiers', w: 45, word: 'America', dt: -0.3, what: 'a blue column marches towards us in step, colours + drum in front', sfx: [{name: 'fife_drum', gain: -13, dur: 3.2}, {name: 'marching', gain: -15, dur: 3.2}]},
	{id: 'cannons', w: 48, word: 'four', dt: -0.1, what: 'field guns hauled alongside; label 14 cannons', sfx: [{name: 'cannon_roll', gain: -19}]},
	{id: 'warships', w: 51, word: 'Britain', dt: -0.3, what: 'five frigates glide into the bay in line ahead', sfx: [{name: 'sea_waves', gain: -21, dur: 2.6}, {name: 'ship_creak', gain: -18, dur: 2.6}, {name: 'ship_bell', gain: -19, at: 0.6}]},
	{id: 'ports2', w: 54, word: 'warships.', dt: -0.5, what: 'gun ports open down the line; label 70 guns · 2,140 men', sfx: [{name: 'gunports', gain: -15}]},
	// ---------------- GOVERNOR / ADMIRAL
	{id: 'governor', w: 55, word: 'The', dt: -0.3, what: 'quarterdeck: the governor (top hat) and the admiral; the US camp on the hill behind', sfx: [{name: 'ship_creak', gain: -23, dur: 2.2}, {name: 'seagulls', gain: -27}]},
	{id: 'jab', w: 57, word: 'wanted', dt: -0.25, what: 'the governor jabs his order paper at the US camp', sfx: [{name: 'swish_short', gain: -18}]},
	{id: 'order', w: 59, word: 'Americans', dt: -0.1, what: 'he turns and pushes the order at the admiral', sfx: [{name: 'banknote', gain: -17}]},
	{id: 'admiral', w: 61, word: 'The', dt: -0.3, what: 'over the governor\'s shoulder onto the admiral (bicorne, white whiskers)', sfx: [{name: 'swish_short', gain: -23}]},
	{id: 'tear', w: 64, word: 'no.', dt: -0.05, what: 'the admiral shakes his head and tears the order in two', sfx: [{name: 'paper_tear', gain: -11}]},
	{id: 'notpig', w: 65, word: 'Not', dt: -0.3, what: 'the angel boar drifts in over the water and nods', sfx: [{name: 'harp_gliss', gain: -17}]},
	// ---------------- TWELVE YEARS + PARTY
	{id: 'stayed', w: 69, word: 'So', dt: -0.3, what: 'a redcoat and a bluecoat sentry between both camps; time-lapse begins', sfx: [{name: 'seasons_whoosh', gain: -14}, {name: 'clock_tick_fast', gain: -21, dur: 3.6}]},
	{id: 'years', w: 74, word: 'For', dt: -0.3, what: 'seasons sweep, beards grow; year bar 1860 → 1872', sfx: [{name: 'seasons_whoosh', gain: -16}]},
	{id: 'party', w: 77, word: 'And', dt: -0.3, what: 'one table for both garrisons: tankards raised, cake with both flags, fireworks', sfx: [{name: 'party_laugh', gain: -20}, {name: 'mug_clink', gain: -14, at: 0.25}, {name: 'fireworks', gain: -19, at: 0.1}]},
	// ---------------- KAISER + MAP
	{id: 'kaiser', w: 80, word: 'Then', dt: -0.3, what: 'the Kaiser over the map in his study; label Kaiser Wilhelm I', sfx: [{name: 'whoosh_big', gain: -20}, {name: 'fanfare_hit', gain: -22, at: 0.2}]},
	{id: 'seal', w: 84, word: 'settled', dt: 0.02, what: 'he slams the seal down on the map: a red seal', sfx: [{name: 'stamp', gain: -9}, {name: 'hit_impact', gain: -17}]},
	{id: 'mapfinal', w: 86, word: 'The', dt: -0.3, what: 'the map again: the red British line retracts, the Haro line turns solid', sfx: [{name: 'whoosh_rev', gain: -21}, {name: 'swish_short', gain: -21, at: 0.4}]},
	{id: 'usisland', w: 90, word: 'America.', dt: -0.1, what: 'the islands turn blue, a US flag pops onto San Juan Island; label Haro Strait border, 1872', sfx: [{name: 'pop_in', gain: -14}, {name: 'fanfare_hit', gain: -19, at: 0.05}]},
	// ---------------- FINALE
	{id: 'finale', w: 91, word: 'Total', dt: -0.3, what: 'sunset: the angel boar on a cloud above the island; Atlas enters, looks up', sfx: [{name: 'angel_choir', gain: -22}, {name: 'harp_gliss', gain: -21, at: 0.2}]},
	{id: 'onepig', w: 94, word: 'pig.', dt: 0.05, what: 'the angel waves a hoof at us; Atlas laughs', sfx: [{name: 'pig_oink', gain: -12}, {name: 'sparkle_ding', gain: -21, at: 0.1}]},
	{id: 'poll', w: 95, word: 'Team', dt: -0.15, what: 'poll card: farmer VS pig; Atlas thinks', sfx: [{name: 'pop_in', gain: -15}, {name: 'notify_ding', gain: -19, at: 0.2}]},
	{id: 'loop', w: 99, word: 'pig?', dt: 0.15, what: 'dissolve back to the opening frame (loop)', sfx: [{name: 'pig_chew', gain: -24, at: 0.2}, {name: 'wind_meadow', gain: -27, dur: 1.0}]},
];
