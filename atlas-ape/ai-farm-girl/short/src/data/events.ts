// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (gap ≤ 2.5 s, word anchors,
// SFX names) and tools/mix.py (SFX timeline). t = words[w].s + dt. sfx: library name in public/sfx (index.json), gain dB
// (library peaks at −3 dBFS), at = offset (s) relative to the event, from = start offset inside the file, dur = cut length (s).
// ElevenLabs SFX for this Short (tools/sfx_el.py): cow_moo, city_street, radio_static, heartbeat, meme_boom, cash_register,
// projector, phone_buzz.
export type Sfx = {name: string; gain: number; at?: number; from?: number; dur?: number};
export type Ev = {id: string; w: number; word: string; dt?: number; what: string; sfx?: Sfx[]; t?: number};

export const EVENTS: Ev[] = [
	// ---------------- SOLD — his room at night
	{id: 'sold_tv', w: 0, word: 'This', dt: 0.02, what: 'frame 0: tiny brick room at night; SOLD slams on the TV, camera shake', sfx: [{name: 'stamp', gain: -7}, {name: 'hit_impact', gain: -15}, {name: 'phone_buzz', gain: -24, at: 0.3, dur: 0.7}]},
	{id: 'sold_fan', w: 2, word: 'sold', what: 'SOLD on the fan', sfx: [{name: 'stamp', gain: -9}]},
	{id: 'sold_guitar', w: 3, word: 'everything', what: 'SOLD on the guitar', sfx: [{name: 'stamp', gain: -9}]},
	{id: 'sold_tools', w: 5, word: 'owned', dt: -0.1, what: 'SOLD on the toolbox', sfx: [{name: 'stamp', gain: -9}]},
	// ---------------- FEED — her video
	{id: 'feed', w: 6, word: 'to', dt: -0.05, what: 'ZOOM-THROUGH his phone → her video in a phone UI, hearts float up', sfx: [{name: 'whoosh_big', gain: -16}, {name: 'notify_ding', gain: -15, at: 0.3}, {name: 'wind_meadow', gain: -25, at: 0.2, dur: 5.4}]},
	{id: 'dreams', w: 12, word: 'dreams.', dt: -0.05, what: 'sparkle', sfx: [{name: 'sparkle_ding', gain: -15}]},
	{id: 'grow', w: 13, word: 'She', dt: -0.1, what: 'the phone grows to full screen', sfx: [{name: 'swish_short', gain: -17}, {name: 'cow_moo', gain: -19, at: 0.9}]},
	{id: 'farm', w: 19, word: 'farm,', what: 'the camera drifts to the farmhouse', sfx: [{name: 'whoosh_rev', gain: -24}]},
	{id: 'cap1', w: 16, word: 'widow', dt: -0.05, what: 'her post caption «Widow 🌾 farm life» pops', sfx: [{name: 'pop_in', gain: -17}]},
	{id: 'home', w: 22, word: 'promised', dt: -0.05, what: 'second caption «My home can be yours 💛»', sfx: [{name: 'pop_in', gain: -16}]},
	// ---------------- FOLLOWERS
	{id: 'followers', w: 28, word: 'Three', dt: -0.06, what: 'WHIP → her profile header; the counter races to 300,000', sfx: [{name: 'whoosh_fast', gain: -15}, {name: 'counter_tick_loop', gain: -18, at: 0.05, dur: 1.1}]},
	{id: 'toasts', w: 28, word: 'Three', dt: -0.02, what: 'new-follower toasts (faces from the crowd) slide in, faster and faster', sfx: [0, 0.2, 0.36, 0.49, 0.59, 0.67, 0.74, 0.8].map((at, i) => ({name: i % 2 ? 'pop_in' : 'notify_ding', gain: -20 - i * 0.6, at}))},
	{id: 'counted', w: 30, word: 'thousand', dt: 0.3, what: 'the counter lands on 300,000, the number bumps', sfx: [{name: 'hit_impact', gain: -16}, {name: 'sparkle_ding', gain: -18}]},
	{id: 'crowd', w: 31, word: 'people', dt: -0.05, what: 'the crowd shot opens out of the newest avatar: hundreds of people holding up her video, «+» pops over heads', sfx: [{name: 'whoosh_rev', gain: -15}, {name: 'crowd_cheer_short', gain: -17, at: 0.08, dur: 1.1}, {name: 'pop_in', gain: -21, at: 0.2}]},
	// ---------------- WENT
	{id: 'went', w: 34, word: 'He', dt: -0.06, what: 'PUNCH → him on the night bus', sfx: [{name: 'swish_short', gain: -18}, {name: 'diesel_hum', gain: -24, dur: 1.4}]},
	{id: 'actually', w: 35, word: 'actually', what: 'meme dramatic zoom on his face', sfx: [{name: 'meme_boom', gain: -9}]},
	{id: 'wentzoom', w: 36, word: 'went.', what: 'second dramatic zoom', sfx: [{name: 'hit_impact', gain: -15}]},
	// ---------------- ROUTE
	{id: 'route', w: 37, word: 'After', dt: -0.06, what: 'WHIP → map of Brazil; IMPERATRIZ photo; 2,000+ km', sfx: [{name: 'whoosh_fast', gain: -16}, {name: 'pop_in', gain: -18, at: 0.1}]},
	{id: 'bus', w: 39, word: 'days', what: 'the bus rides the dashed route south', sfx: [{name: 'diesel_hum', gain: -21, dur: 0.9}]},
	{id: 'bhphoto', w: 42, word: 'bus,', dt: -0.2, what: 'the Belo Horizonte bus-terminal photo drops in', sfx: [{name: 'pop_in', gain: -17}]},
	// ---------------- STRANGERS / NOBODY
	{id: 'strangers', w: 43, word: 'he', dt: -0.05, what: 'ZOOM-THROUGH Belo Horizonte → he shows her photo to a passer-by', sfx: [{name: 'whoosh_big', gain: -17}, {name: 'city_street', gain: -19, dur: 1.8}]},
	{id: 'nobody', w: 49, word: 'Nobody', dt: -0.06, what: 'WHIP → her photo over the real Belo Horizonte skyline; Confused Travolta meme looks around', sfx: [{name: 'swish_short', gain: -16}, {name: 'record_scratch', gain: -17, at: 0.05}]},
	{id: 'travolta', w: 52, word: 'seen', what: 'Travolta turns the other way', sfx: [{name: 'swish_short', gain: -22}]},
	// ---------------- RADIO
	{id: 'radio', w: 54, word: 'So', dt: -0.06, what: 'PUSH UP → the radio studio', sfx: [{name: 'whoosh_rev', gain: -17}, {name: 'radio_static', gain: -15, at: 0.05, dur: 1.1}]},
	{id: 'onair', w: 58, word: 'radio', dt: -0.05, what: 'ON AIR lights up, gold radio waves ripple out of the microphone', sfx: [{name: 'ui_click', gain: -14}]},
	{id: 'truth', w: 62, word: "That's", what: 'slow push into his stunned face, the room darkens', sfx: [{name: 'heartbeat', gain: -9, dur: 1.5}, {name: 'riser_short', gain: -21, dur: 1.3}]},
	// ---------------- REVEAL
	{id: 'reveal', w: 68, word: 'she', dt: -0.04, what: 'PUNCH → her video again; first glitch flickers on «never»', sfx: [{name: 'glitch_hit', gain: -17, at: 0.33}]},
	{id: 'real', w: 71, word: 'real.', what: 'glitch burst: RGB split, sliced bands, flash', sfx: [{name: 'glitch_hit', gain: -8}, {name: 'hit_impact', gain: -13}]},
	{id: 'ai', w: 74, word: 'made', dt: -0.06, what: 'she breaks into pixels; MADE BY AI stamps in', sfx: [{name: 'stamp', gain: -9}, {name: 'meme_boom', gain: -12}, {name: 'glitch_hit', gain: -15, at: 0.1}]},
	{id: 'fall', w: 76, word: 'AI.', dt: 0.1, what: 'the pixel tiles fall away', sfx: [{name: 'swish_short', gain: -18}]},
	// ---------------- CREATOR
	{id: 'creator', w: 77, word: 'Her', dt: -0.06, what: 'WHIP → her pixel picture in the phone buried under shop buttons', sfx: [{name: 'whoosh_fast', gain: -16}, {name: 'pop_in', gain: -16, at: 0.62}]},
	{id: 'shop2', w: 82, word: 'only', dt: -0.05, what: 'BUY + LINK IN BIO pop', sfx: [{name: 'pop_in', gain: -16}, {name: 'pop_in', gain: -17, at: 0.32}]},
	{id: 'sell', w: 85, word: 'sell', dt: -0.04, what: 'the cursor clicks SHOP NOW', sfx: [{name: 'ui_click', gain: -14}]},
	{id: 'stonks', w: 85, word: 'sell', what: 'OVER the shop frame: Meme Man rises, the green arrow shoots up, STONKS, money rains', sfx: [{name: 'cash_register', gain: -8}, {name: 'swish_short', gain: -17}, {name: 'coins_jingle', gain: -17, at: 0.1, dur: 0.9}, {name: 'banknote', gain: -18, at: 0.2}]},
	// ---------------- END
	{id: 'end', w: 87, word: 'And', dt: -0.06, what: 'CIRCLE → him on the bus by day, a hopeful smile', sfx: [{name: 'whoosh_rev', gain: -17}, {name: 'diesel_hum', gain: -26, dur: 1.2}]},
	{id: 'again', w: 91, word: 'he', dt: -0.06, what: 'DISSOLVE → one calm map shot of Brazil (Imperatriz, Belo Horizonte)', sfx: [{name: 'whoosh_rev', gain: -19}]},
	{id: 'lovepin', w: 93, word: '"I\'ll', dt: -0.02, what: 'a heart pin drops on Belo Horizonte, hearts rise: he will look for love there again', sfx: [{name: 'pin_drop', gain: -13}, {name: 'sparkle_ding', gain: -18, at: 0.25}]},
	{id: 'another', w: 95, word: 'another', what: 'the heart pin bumps', sfx: [{name: 'pop_in', gain: -17}]},
	{id: 'same', w: 97, word: 'Same', dt: -0.06, what: 'the pin pulses, the camera leans in to Belo Horizonte; Atlas pops in top-left with a thumbs up', sfx: [{name: 'notify_ding', gain: -19}, {name: 'pop_in', gain: -16, at: 0.05}]},
	{id: 'goagain', w: 99, word: "I'm", dt: -0.05, what: 'the route redraws and the bus sets off again', sfx: [{name: 'whoosh_fast', gain: -20}, {name: 'diesel_hum', gain: -20, at: 0.05, dur: 0.9}]},
	{id: 'cj', w: 101, word: 'again."', dt: 0.34, what: 'PUNCH → CJ meme «Ah shit, here we go again» (tightened, 1.08×) over the real BH bus terminal', sfx: [{name: 'cj_cut', gain: -3}]},
	{id: 'loop', w: 101, word: 'again."', dt: 2.24, what: 'dissolve back to frame 0 (loop)', sfx: [{name: 'whoosh_rev', gain: -22}]},
];
