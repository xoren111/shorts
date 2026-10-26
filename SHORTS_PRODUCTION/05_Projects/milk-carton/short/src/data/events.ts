// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (word anchors, max gap by
// level, SFX names) and tools/mix.py (SFX timeline via out/timeline.json). t = words[w].s + dt.
// sfx: name in public/sfx/index.json, gain dB (library peaks normalised to −3 dBFS), at = offset (s) relative to the event,
// from = start offset inside the file, dur = cut length (s).
// milk-carton: the rows of ../SCRIPT.md «Покадровый план» (22 beats + the loop beat «Except…»). L2 = 10–14 events per 10 s, no gap
// > 2.0 s: 52 events over 37.97 s = 13.7 / 10 s, largest gap 1.41 s (Billions 33.70 → NoneHome 35.11). One event per phrase or faster;
// sub-actions that land inside an event's shot (second tap, scissor snips, row-by-row dimming) are written into its `what` with the
// word they land on — the scene author times them, the sound designer puts their cues on the same event with `at`.
// SOUND (26.10): the plan's sound for each event stays in the comment «SFX idea» above it; `sfx` realises it with library SFX only
// (03_Assets/Sound_Effects via tools/fetch_asset.py lib, CC0 — CREDITS.md, public/sfx/index.json). Every transition except 'fade'
// gets its own whoosh / swish / hit, aligned to transient_at (standard 4.3): zoomthru → Missing, Cuts, RealName; whipL → Famous,
// OnTheRun, NotHide; whipR → TakeHer, Tosses; punch → IsThatMe, Mom, Police, Billions (Buys: the belt thump IS the punch hit, no
// whoosh in the dead air); up → KeepIt; diag → NextDoor; circle → DadPut. Hard cuts ('none': ManCan, Hush, NotRun, HandedBack,
// NoneHome) carry the event's own sound only. Music: Mischief Maker out before «carton.» (word 54, then 0.42 s of dead air with the
// fridge hum alone, the twist lands on SFX alone), back low on «The» (word 106) — project.json music_out_word / music_in_word; mix.py
// keeps the A1 balance (music −21.6 dB, SFX stem ducked by the voice). Gains follow standard 4.5 and the A1 kit: transitions −15…−20,
// main hits −9…−15 (under A1: a hit on a spoken word stays under the voice in the speech band), UI blips / pops −15…−21, beds
// −21…−26 (crest-heavy beds higher: rain −12, birds −4); no cue is louder than the voice on a spoken word. Serious topic → no comedic SFX (no boing, slide whistle, record scratch, wah-wah).
// Plan sounds without an exact library file use the nearest one: fridge-door hiss / «shh» / inhale into the flashback = the soft air
// whoosh played from its onset, fridge hum = theatre room tone (120 Hz low hum), store = crowd murmur, squiggle squeak = pen
// scribble, low string drone = dark swell (140–170 Hz), flash pops and scissor snips = camera shutter, «ooh» chime / glint =
// typewriter bell, bangle jingle and wire-cart rattle = coins clinking, curtain rings = chip stack, scanner BEEP = Kenney select
// blip + a 2.3 kHz slice of the Kenney confirmation arpeggio, till = typewriter key + bell, magnet / latch = typewriter key, steps on
// grass = paper-crumple slices, car doors / press / lights-off clunks = wood thud. Siren chirps and a door creak have no library file
// (no comedic substitute on this topic): police cars arrive on air whooshes + door thuds over the street bed; the creak is dropped.
// The loop: the frame-0 beds (store murmur + fridge hum) come back under «Except…» at the frame-0 levels, the one riser of the Short
// (reverse guitar swell, −22 dB) stops dead on the last frame, frame 0 opens on the fridge-door hiss.
import {DURATION, LOOP_T, W} from '../lib/time';

export type Sfx = {name: string; gain: number; at?: number; from?: number; dur?: number};
export type Ev = {id: string; w: number; word: string; dt?: number; what: string; sfx?: Sfx[]; t?: number};

const r3 = (x: number) => Math.round(x * 1000) / 1000;
/** dt that puts an event at absolute time t (s) while it stays anchored to word i (frame-0 timings of the plan: 0.45 / 1.0 / 1.5 s) */
const abs = (t: number, i: number) => r3(t - W(i));

// transient (hit / peak) of each file, from public/sfx/index.json: a cue starts 0.05 s before it, so the hit lands on the event
const TR: Record<string, number> = {
	whoosh_fast: 1.08, whoosh_cine: 0.6, whoosh_air_soft: 0.24, swish_quick: 0.05, whoosh_zoom: 0.43, whoosh_windy: 1.05,
	wood_thud: 0.17, boom_cine: 0.27, impact_punch_heavy_kenney: 0.02, impact_sub_boom_kenney: 0.22,
	paper_slide: 1.14, page_turn: 0.24, type_key: 0.04, type_bell: 0.04, paper_crumple: 0.19, camera_shutter: 0.1,
	heart_thud: 3.37, swell_rev: 2.98, pop_lips: 0.2, pop_mouth: 0.01, blip_select: 0.01, pop_drop_soft_kenney: 0, chips_stack: 0.08,
};
/** cue whose hit lands `peak` s after the event (file cut from 0.05 s before its transient), optional length */
const sx = (name: string, gain: number, peak = 0, dur?: number): Sfx => {
	const tr = TR[name] ?? 0;
	const lead = Math.min(tr, 0.05);
	return {name, gain: r3(gain), at: r3(peak - lead), from: r3(Math.max(0, tr - lead)), ...(dur ? {dur} : {})};
};
/** a stretch of a bed-like file (ambience, ticking, swell, a slice of a longer file): starts `at` after the event, from `from`
 *  inside the file, `dur` long (mix.py: 30 ms fade-in when from > 0, ≤ 0.12 s fade-out) */
const bed = (name: string, gain: number, at: number, from: number, dur: number): Sfx => ({name, gain, at: r3(at), from, dur});
/** offset (s) of word j inside an event anchored on word i with `dt` — a sub-action cue lands on that word */
const on = (j: number, i: number, dt = 0) => r3(W(j) - W(i) - dt);
// transition sounds: the hit sits in the middle of the transition (DUR in engine/transitions.tsx)
const whip = (g = -16) => [sx('swish_quick', g, 0.14)];            // whipL / whipR 0.28 s
const punch = (g = -17) => [sx('whoosh_cine', g, 0.08, 0.7)];      // punch 0.16 s
const zoom = (g = -15) => [sx('whoosh_zoom', g, 0.22, 0.8)];       // zoomthru 0.45 s
const up = (g = -16) => [sx('whoosh_air_soft', g, 0.17, 0.7)];     // up 0.35 s
const circle = (g = -16) => [sx('whoosh_air_soft', g, 0.21, 0.8)]; // circle 0.42 s
const diag = (g = -17) => [sx('whoosh_fast', g, 0.19, 0.8)];       // diag 0.38 s
// the loop: the reverse swell's hard stop (its transient) lands on the last frame
const LOOP_PEAK = r3(DURATION - LOOP_T);

export const EVENTS: Ev[] = [
	// ======================================================================= PART 1 (src/scenes_1.tsx)
	// ---------------- 1 HOOK (L3 hook, 4 events in 0–2 s): frame 0 = she already turns and leans in, his hand swings the carton up
	// SFX idea: fridge-door hiss + cardboard swish; Mischief Maker bed from 0.0 s
	{id: 'hook', w: 0, word: 'This', dt: 0.02, what: 'frame 0: ECU at an open grocery dairy fridge, cold mist rolling out; a girl of about 7 (messy bangs, red hair clip, generic) ALREADY MOVING — turns her head toward the carton swinging in and leans forward, eyes widening; a big man\'s hand (cuff + wristwatch only, no face) swings the milk carton up beside her cheek: her black-and-white mirror copy under a huge MISSING, small CHILD, name/date lines = illegible squiggles, no digits', sfx: [bed('whoosh_air_soft', -16, -0.02, 0.11, 0.9), sx('swish_quick', -17, 0.23), bed('amb_store', -22, -0.02, 39.0, 9.06), bed('amb_room', -25, -0.02, 2.0, 9.92)]},
	// SFX idea: bass hit at 0.45 s — NO frame hold
	{id: 'match', w: 1, word: 'girl', dt: abs(0.45, 1), what: 'the printed eyes line up with hers (EYE_Y) — bass hit WITHOUT a freeze: her lean, the carton swing and the mist keep moving', sfx: [sx('impact_sub_boom_kenney', -11), sx('impact_punch_heavy_kenney', -15)]},
	// SFX idea: soft finger tap 1
	{id: 'jab', w: 4, word: 'own', dt: abs(1.0, 4), what: 'her finger jabs her own cheek', sfx: [sx('pop_drop_soft_kenney', -16)]},
	// SFX idea: soft finger tap 2
	{id: 'printed', w: 5, word: 'face', dt: abs(1.5, 5), what: 'her finger jabs the printed face on the carton', sfx: [sx('wood_thud', -17)]},
	// ---------------- 2 MISSING
	// SFX idea: zoom whoosh (transition) → fingertip lands on cardboard
	{id: 'missing', w: 8, word: 'Under', dt: -0.06, what: 'ZOOM-THROUGH into the carton header (CARTON0): macro, her POV — her fingertip lands at the left end of the header', sfx: [...zoom(), sx('pop_drop_soft_kenney', -17, 0.45)]},
	// SFX idea: rubbery squiggle squeak
	{id: 'squiggle', w: 10, word: 'word', what: 'her fingertip drags along the header; the letters wriggle into squiggles she can\'t read (they squirm harder under «can\'t read»)', sfx: [bed('pen_sign', -19, 0, 1.2, 1.0)]},
	// SFX idea: stamp snap on «MISSING»
	{id: 'snap', w: 14, word: 'MISSING.', what: 'the squiggles snap into a sharp red MISSING (the only word on screen); at the frame edge her lips try to sound it out', sfx: [sx('impact_punch_heavy_kenney', -15), sx('type_key', -15, 0.01)]},
	// ---------------- 3 MAN CAN
	// SFX idea: low string drone enters
	{id: 'mancan', w: 15, word: 'The', dt: -0.06, what: 'HARD CUT to a low angle from her height on the wristwatch; the camera starts tilting up his arm', sfx: [bed('swell_dark', -20, 0, 0.5, 1.42)]},
	// SFX idea: 7 soft letter blips (one per letter of MISSING, 5.12 → 5.78)
	{id: 'letters', w: 17, word: 'holding', what: 'the tilt reaches his coat silhouette against the fridge light (no face); the MISSING letters light up one by one, left to right, as if he reads them; on «can.» his shadow slides over her (CAN orange in the subtitle)', sfx: [...Array.from({length: 7}, (_, i) => sx('blip_select', -20 - 0.5 * i, 0.11 * i)), sx('whoosh_air_soft', -20, on(19, 17), 0.6)]},
	// ---------------- 4 FAMOUS
	// SFX idea: whip swish (transition)
	{id: 'famous', w: 20, word: '"Hey,', dt: -0.06, what: 'WHIP back to the split-match (frame-0 angle): her face beside the printed face', sfx: [...whip()]},
	// SFX idea: two cardboard taps + two camera-flash pops (2nd tap on «famous!», W(22))
	{id: 'taps', w: 21, word: "you're", what: 'his index finger taps her printed face — once on «you\'re», once on «famous!», like a proud joke; each tap pops a small comic flash-bulb burst around the carton', sfx: [sx('wood_thud', -17), sx('camera_shutter', -14, 0.02), sx('wood_thud', -17, on(22, 21)), sx('camera_shutter', -13, on(22, 21) + 0.02)]},
	// SFX idea: — (the flash pops ring out)
	{id: 'wide', w: 23, word: 'he', what: 'her eyes go wide, the flash bursts hang in the air around the carton', sfx: []},
	// ---------------- 5 IS THAT ME
	// SFX idea: thin «ooh» chime, two tiny boops (on «that», «me?»)
	{id: 'isme', w: 25, word: '"Is', dt: -0.06, what: 'PUNCH-in on her: mouth open, she jabs a finger at her own chest, at the printed face on «that», back at herself on «me?» — a tiny sparkle flicks on the red clip in the photo and on her own clip at once', sfx: [...punch(-19), sx('pop_mouth', -16, on(26, 25, -0.06)), sx('pop_mouth', -17, on(27, 25, -0.06)), sx('type_bell', -21, on(27, 25, -0.06) + 0.04)]},
	// ---------------- 6 HUSH (+0.43 s pause after the word: the shadow stays, the confetti keeps falling)
	// SFX idea: breathy «shh»; store ambience ducks out, fridge hum stays
	{id: 'hush', w: 28, word: '"Hush."', dt: -0.06, what: 'HARD CUT: on the fridge door his huge silhouette shadow raises one finger to its lips (no facial detail, no contact with her); the flash bursts freeze and fall like flat confetti; the store colours dim a notch', sfx: [bed('whoosh_air_soft', -19, 0.06, 0.11, 0.5), sx('page_turn', -19, 0.52)]},
	// ---------------- 7 TAKE HER (flashback = a symbol, FACTS «Постановка в кадре»: no room, no house, no dad in the scene)
	// SFX idea: reverse whoosh (transition)
	{id: 'takeher', w: 29, word: 'He', dt: -0.06, what: 'WHIP into a desaturated flashback with paper grain on a plain backdrop: an empty checked jacket hangs on the back of a chair (the dad only as a sign)', sfx: [...whip(-18), bed('whoosh_air_soft', -17, 0.01, 0.11, 0.55)]},
	// SFX idea: one soft heartbeat
	{id: 'walkout', w: 31, word: 'take', what: 'a man\'s hand with the SAME wristwatch holds a toddler\'s small hand and gently walks her out of frame; the jacket stays alone and still (no grabbing, no struggle, no faces)', sfx: [bed('heart_thud', -14, -0.04, 0, 0.55)]},
	// ---------------- 8 MOM
	// SFX idea: punch whoosh (transition)
	{id: 'mom', w: 36, word: 'With', what: 'PUNCH out, wider on the hands: a woman\'s hand with a bangle takes the toddler\'s other hand (tender, no hurry)', sfx: [...punch(-18)]},
	// SFX idea: bangle jingle, one low piano note
	{id: 'glint', w: 39, word: 'MOM.', what: 'the bangle glints on «MOM»; the child walks off calmly between the two adult hands (MOM orange in the subtitle)', sfx: [bed('coins_clink', -20, -0.05, 0.2, 0.45), sx('type_bell', -23, 0.04)]},

	// ======================================================================= PART 2 (src/scenes_2.tsx)
	// ---------------- 9 ON THE RUN (one compound move, no map, no coastline, no names, no adult hand)
	// SFX idea: road hum
	{id: 'run', w: 40, word: 'Years', dt: -0.06, what: 'WHIP: night road lights streak past a car window', sfx: [...whip(-17), bed('amb_street', -22, 0, 2.0, 0.73), sx('whoosh_fast', -20, 0.32, 0.6)]},
	// SFX idea: rain on a tin roof
	{id: 'rain', w: 43, word: 'run.', what: 'the light streaks turn into rain on the tin roof of a shack among trees', sfx: [bed('amb_rain', -12, 0, 1.0, 0.8)]},
	// SFX idea: curtain-ring swish
	{id: 'curtain', w: 44, word: 'Barely', what: 'a little hand pulls a curtain aside to the sun; a sunbeam lands on the floor', sfx: [sx('swish_quick', -18, 0.02), sx('chips_stack', -20, 0.04)]},
	// SFX idea: soft cloth fall
	{id: 'falls', w: 46, word: 'outside.', what: 'the curtain slips back by itself and falls shut — the sunbeam on the floor narrows to a thin strip (no adult hand: mom is never a jailer)', sfx: [sx('whoosh_air_soft', -18, 0.08, 0.6)]},
	// ---------------- 10 NOT RUN
	// SFX idea: store ambience back, shoppers' footsteps whoosh past (on «run.»)
	{id: 'notrun', w: 47, word: 'He', dt: -0.06, what: 'HARD CUT, colour snaps back: the store in the frame-0 angle, wider; his shoes stay planted beside her small sneakers by the cart; on «run.» shoppers\' feet stream past in a soft blur (RUN orange)', sfx: [bed('amb_store', -22, 0, 24.0, 2.07), bed('amb_room', -25, 0, 12.0, 3.36), sx('whoosh_air_soft', -17, on(49, 47, -0.06), 0.6)]},
	// ---------------- 11 NOT HIDE (no bravado, the carton is never shown off to the aisle)
	// SFX idea: whip (transition); carton thunk in the wire cart on «hide»
	{id: 'nothide', w: 50, word: 'He', dt: -0.06, what: 'WHIP to a mid shot from her height: on «hide» his hand drops the carton into the shopping cart like any ordinary milk — her MISSING face happens to land toward the viewer', sfx: [...whip(), sx('wood_thud', -12, on(52, 50, -0.06)), bed('coins_clink', -23, on(52, 50, -0.06) - 0.02, 0.25, 0.3)]},
	// SFX idea: cart-wheel rattle; HARD MUSIC CUT → fridge hum only (0.42 s dead air)
	{id: 'roll', w: 54, word: 'carton.', what: 'the cart rolls on toward the checkout with her small hand on its side; the music is gone, in the dead air the cart and the mist slow to a crawl (no full freeze)', sfx: [bed('coins_clink', -28, 0.55, 0.1, 0.3)]}, // QA 26.10: the rattle masked «-ton» of «carton.» — now after the word, quieter
	// ---------------- 12 TWIST «He BUYS it.» (readable without sound; subtitles 55–57 hidden)
	// SFX idea: belt thump, in silence
	{id: 'belt', w: 55, word: 'He', dt: -0.06, what: 'PUNCH: the carton thumps onto the checkout belt, her printed face up; card word «HE» lands', sfx: [sx('wood_thud', -15, 0.02), bed('heart_thud', -19, -0.02, 0, 0.2)]},
	// SFX idea: dry scanner BEEP exactly on «BUYS» → till ka-chunk on «it.» (all in silence)
	{id: 'buys', w: 56, word: 'BUYS', what: 'TWIST — MAIN HIT: a red scanner laser sweeps across HER printed face, BEEP; «BUYS» slams into the giant card «HE BUYS IT.» in orange (camera kick); on «it.» the till drawer pops open', sfx: [sx('blip_select', -23), bed('blip_confirm_kenney', -24, 0.02, 0.12, 0.13), sx('impact_sub_boom_kenney', -17), sx('impact_punch_heavy_kenney', -21, 0.02),   // QA 26.10: was up to 9 dB over the voice on «BUYS»
		 sx('type_key', -14, on(57, 56)), sx('type_bell', -17, on(57, 56) + 0.05)]},
	// ---------------- 13 KEEP IT (SCREENSHOT MOMENT; subtitles 58–66 hidden)
	// SFX idea: whoosh up (transition); cardboard slide across wood on «asks:»
	{id: 'kitchen', w: 58, word: 'Then', dt: -0.06, what: 'PUSH UP to the kitchen table from above: the empty carton (milk finished) lies with her MISSING face up; on «asks:» the hand with the watch slides it across the wood to her small hands', sfx: [...up(), bed('paper_slide', -20, on(61, 58, -0.06) - 0.54, 0.6, 0.75), bed('amb_room', -26, 0, 40.0, 3.57)]},
	// SFX idea: kitchen-clock tick starts
	{id: 'card', w: 61, word: '"Do', what: 'the big card «DO YOU WANT TO KEEP IT?» lands with the voice (his line: it hangs from the watch-hand side)', sfx: [sx('pop_drop_soft_kenney', -17), bed('clock_tick', -19, -0.05, 0.4, 1.3)]},
	// SFX idea: kitchen-clock tick, one soft card wobble
	{id: 'keep', w: 65, word: 'keep', what: 'SCREENSHOT MOMENT: KEEP lands in orange (camera kick); the carton wobbles to a stop at her fingers, her fingers hover over it, she blinks — micro-motion until the cut', sfx: [bed('heart_thud', -14, -0.04, 0, 0.5), sx('pop_mouth', -18), sx('page_turn', -21, 0.3)]},
	// ---------------- 14 CUTS
	// SFX idea: zoom whoosh (transition); scissor snips ×4 on «cuts», «out», «her», «own»
	{id: 'cuts', w: 67, word: 'She', dt: -0.06, what: 'ZOOM-THROUGH into the photo panel (KEEP_PHOTO): macro on her small hands only with round-tip kid scissors, snipping around the photo panel (OWN orange)', sfx: [...zoom(-16), ...[68, 69, 70, 71].map((j, i) => sx('camera_shutter', -16 - 0.5 * i, on(j, 67, -0.06)))]},
	// SFX idea: card peel
	{id: 'free', w: 72, word: 'face.', what: 'the cardboard curls and the square cutout (MISSING over her face) lifts free, leaving a hole in the carton', sfx: [sx('paper_crumple', -20, 0.02, 0.35), sx('page_turn', -19, 0.12)]},
	// ---------------- 15 TOSSES (pink doll case, no logo, no brand word)
	// SFX idea: whip (transition), plastic latch pop, paper flutter on «it»
	{id: 'tosses', w: 73, word: 'Tosses', dt: -0.06, what: 'WHIP: a pink doll case pops open on tiny doll shoes and a comb; on «it» the cutout flutters in on top', sfx: [...whip(), sx('pop_lips', -15, 0.16), sx('page_turn', -16, on(74, 73, -0.06))]},
	// SFX idea: lid snap, latch click
	{id: 'shut', w: 78, word: 'case.', what: 'the lid snaps shut and the latch clicks', sfx: [sx('wood_thud', -13), sx('type_key', -14, 0.14)]},
	// ---------------- 16 NEXT DOOR (no signs, house numbers or street names)
	// SFX idea: diag swoosh (transition), footsteps on grass
	{id: 'nextdoor', w: 79, word: 'Leaves', dt: -0.06, what: 'DIAG to a wide side-on shot: she skips across a lawn to the house next door swinging the case; on «case» she sets it on the neighbours\' carpet', sfx: [...diag(), bed('amb_birds', -4, 0, 20.0, 1.37), sx('paper_crumple', -22, 0.32, 0.14), sx('paper_crumple', -23, 0.58, 0.14), sx('pop_drop_soft_kenney', -17, on(81, 79, -0.06))]},
	// SFX idea: screen door creak and slap
	{id: 'door', w: 83, word: 'door.', what: 'she skips home empty-handed, the screen door swings shut; the camera eases in on the lone case (ends with the case at CASE_END)', sfx: [sx('wood_thud', -13, 0.12), sx('type_key', -16, 0.15)]},

	// ======================================================================= PART 3 (src/scenes_3.tsx)
	// ---------------- 17 REAL NAME
	// SFX idea: zoom whoosh (transition), paper rustle
	{id: 'neighbor', w: 84, word: 'A', dt: -0.06, what: 'ZOOM-THROUGH into the case (CASE_END): over the neighbour\'s shoulder, no face — adult fingers lift the cutout from the case', sfx: [...zoom(), bed('amb_room', -26, 0, 20.0, 1.71), sx('page_turn', -16, 0.4)]},
	// SFX idea: fingertip squeak
	{id: 'reads', w: 86, word: 'reads', what: 'a fingertip slides along the name line under the photo (illegible squiggles, never readable) and stops on «REAL» (REAL orange)', sfx: [bed('paper_slide', -20, 0, 0.45, 0.5), sx('pop_drop_soft_kenney', -18, on(88, 86))]},
	// SFX idea: magnet clack
	{id: 'magnet', w: 89, word: 'name.', what: 'the hand pins the cutout to her own fridge with a magnet', sfx: [sx('type_key', -13), sx('wood_thud', -17, 0.01)]},
	// ---------------- 18 POLICE (no badges, text or plates)
	// SFX idea: punch hit (transition); short siren chirps, brakes (on «show», «up.»)
	{id: 'police', w: 90, word: 'Police', dt: -0.06, what: 'PUNCH: red and blue light washes over that fridge and the cutout; through the window police-car silhouettes pull up one by one, each on a beat («show», «up.»)', sfx: [...punch(-17), bed('amb_street', -21, 0, 3.0, 2.52), ...[91, 92].flatMap((j) => [sx('whoosh_fast', -21, on(j, 90, -0.06) - 0.05, 0.5), sx('wood_thud', -17, on(j, 90, -0.06))])]},
	// SFX idea: siren chirps stacking ×5, car doors
	{id: 'lot', w: 94, word: 'LOT', what: 'on «A LOT» the cars keep stacking past the frame edge (LOT orange)', sfx: [...[0, 0.2, 0.42].map((p, i) => sx('wood_thud', -14 - 2 * i, p)), sx('whoosh_air_soft', -19, 0.1, 0.7)]},
	// ---------------- 19 HANDED BACK (no hug, no tears, nothing in his hand)
	// SFX idea: quiet room tone (sirens gone)
	{id: 'doorway', w: 97, word: "She's", dt: -0.06, what: 'HARD CUT to quiet: a doorway; a tall man in the checked sleeve (her dad, seen from behind, no face) crouches with one empty hand held out', sfx: [bed('amb_room', -24, 0, 10.0, 2.15)]},
	// SFX idea: one soft floor creak
	{id: 'hide', w: 102, word: 'dad', what: 'she steps behind the doorframe', sfx: [sx('wood_thud', -20, 0.04)]},
	// SFX idea: — (room tone)
	{id: 'peek', w: 105, word: 'know.', what: 'she peeks out with one eye (KNOW orange)', sfx: []},
	// ---------------- 20 DAD PUT (music back low on «The»)
	// SFX idea: circle reveal swish (transition), photo slide; music fade-in 0.5 s at −24 dB
	{id: 'dadput', w: 106, word: 'The', dt: -0.06, what: 'CIRCLE reveal from the photo (DESK_PHOTO): sepia, earlier — the checked-sleeve hand slides her toddler photo across a plain desk (no logos) and lets go', sfx: [...circle(), bed('paper_slide', -17, 0.25, 0.5, 0.75)]},
	// SFX idea: press thunk-thunk
	{id: 'line', w: 111, word: 'Her', dt: -0.04, what: 'CUT to a dairy line printing that face onto carton after carton (DAD orange)', sfx: [...[111, 113, 114].map((j, i) => sx('wood_thud', -13 - i, on(j, 111, -0.04)))]},
	// SFX idea: conveyor rattle
	{id: 'ride', w: 115, word: 'there.', what: 'one carton rides off the line straight into the frame-0 store fridge', sfx: [...[0, 0.09, 0.18].map((p, i) => sx('type_key', -19 - i, p)), sx('whoosh_air_soft', -20, 0.2, 0.6)]},
	// ---------------- 21 BILLIONS (subtitles 116–118 hidden)
	// SFX idea: punch / rising whoosh (transition), rattling cardboard swell, stamp thud at +0.2 s
	{id: 'billions', w: 116, word: 'Billions', dt: -0.06, what: 'PUNCH out: the fridge becomes an endless scrolling wall of cartons, each with a different generic drawn child (no real missing kids); 0.2 s later a big BILLIONS (orange, no digits) stamps over it', sfx: [...punch(-17), sx('whoosh_windy', -19, 0.12, 1.2), sx('paper_crumple', -19, 0.08, 0.9), sx('impact_punch_heavy_kenney', -9, 0.2), sx('boom_cine', -14, 0.2, 1.4)]},
	// ---------------- 22 NONE HOME (seamless continuation of the wall, F4: calm but moving, no big text)
	// SFX idea: three descending lights-off clunks (on «Almost», «none», «brought»)
	{id: 'dim', w: 119, word: 'Almost', dt: -0.06, what: 'the stamp lifts away; row by row the faces on the wall dim to grey — a row on «Almost», «none», «brought» (NONE orange)', sfx: [...[119, 120, 121].map((j, i) => sx('wood_thud', -13 - 2 * i, on(j, 119, -0.06)))]},
	// SFX idea: — (music bed only)
	{id: 'one', w: 123, word: 'kid', what: 'one carton keeps its colour; slow push toward it (it ends at LONE_CARTON)', sfx: []},
	// ---------------- 23 LOOP «Except…» (voice cut right on the word, no breath)
	// SFX idea: reverse whoosh −22 dB into the frame-0 fridge-door hiss; the music bed runs across the cut
	{id: 'except', w: 125, word: 'Except', dt: -0.06, what: 'FADE (locked match dissolve at LONE_CARTON): the one coloured carton slides out of the wall into the store dairy fridge; the hand with the watch reaches in', sfx: [bed('amb_store', -22, 0, 27.0, 1.04), bed('amb_room', -25, 0, 30.0, 1.04), sx('whoosh_air_soft', -21, 0.25, 0.6)]},
	// SFX idea: — (the hiss of the frame-0 fridge door carries over)
	{id: 'loop', w: 125, word: 'Except', dt: r3(LOOP_T - W(125)), what: 'the hand lifts the carton up toward her cheek — the last 0.35 s dissolve into frame 0 (same hand, same carton, same mist = loop)', sfx: [sx('swish_quick', -19, 0.1), bed('swell_rev', -22, LOOP_PEAK - 0.6, r3(TR.swell_rev - 0.6), 0.62)]},
];
