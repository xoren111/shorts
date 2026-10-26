// Visual events anchored to VO words + their sound effects. Pure data: read by tools/check.mjs (gap ≤ 2.5 s, word anchors,
// SFX names) and tools/mix.py (SFX timeline). t = words[w].s + dt. sfx: library name in public/sfx (index.json), gain dB
// (library peaks at −3 dBFS), at = offset (s) relative to the event, from = start offset inside the file, dur = cut length (s).
// Every transition gets its whoosh, every stamp / ring / pop its hit. clap_single, crowd_1916, brass_sting, crowd_ooh =
// ElevenLabs (tools/sfx_el.py).
                                                                                         
                                                                                                           

export const EVENTS       = [
	// ---------------- HOOK
	{id: 'hook', w: 0, word: 'This', what: 'frame 0: Flow runner bursts at the camera, dust, speed lines, tremor', sfx: [{name: 'brass_sting', gain: -11}, {name: 'crowd_1916', gain: -15, dur: 1.5}, {name: 'whoosh_big', gain: -17}, {name: 'hit_impact', gain: -16, at: 0.6}]},
	{id: 'score', w: 4, word: 'two', dt: -0.08, what: 'PUNCH → the REAL 1916 scoreboard, whip-pan across the quarters; 222–0 key fact', sfx: [{name: 'whoosh_fast', gain: -14}, {name: 'scoreboard_flip', gain: -13, at: 0.08}, {name: 'hit_impact', gain: -18, at: 0.1}]},
	{id: 'ring222', w: 6, word: 'twenty-two', dt: 0.02, what: 'the pan lands on 222, a gold marker ring draws', sfx: [{name: 'wire_scratch', gain: -19}, {name: 'hit_impact', gain: -17}]},
	{id: 'ring0', w: 8, word: 'nothing.', dt: 0.12, what: 'tilt down to the 0, red ring', sfx: [{name: 'wire_scratch', gain: -19}, {name: 'pop_in', gain: -17}]},
	// ---------------- no team
	{id: 'bench', w: 9, word: 'The', dt: -0.06, what: 'WHIP → Flow: two lonely boys on the visitors\' bench', sfx: [{name: 'whoosh_fast', gain: -15}, {name: 'tumbleweed', gain: -22, at: 0.2, dur: 1.6}]},
	{id: 'split', w: 11, word: "didn't", dt: -0.08, what: 'SPLIT: the REAL 1916 Georgia Tech squad drops in on top, the bench slides to the bottom half', sfx: [{name: 'swish_short', gain: -15}, {name: 'hit_impact', gain: -17, at: 0.45}]},
	{id: 'captions', w: 13, word: 'have', dt: -0.03, what: 'captions «Georgia Tech, 1916» / «Cumberland · football dropped in 1915»', sfx: [{name: 'pop_in', gain: -17}]},
	// ---------------- the penalty
	{id: 'contract', w: 16, word: 'But', dt: -0.09, what: 'PUSH UP → paper: the Cumberland campus print drops, the typed agreement slides up', sfx: [{name: 'swish_short', gain: -15}, {name: 'dust_puff', gain: -20, at: 0.35}]},
	{id: 'highlight', w: 17, word: 'skipping', what: 'highlighter over «Atlanta · October 7, 1916»', sfx: [{name: 'wire_scratch', gain: -21}]},
	{id: 'stamp', w: 22, word: 'three-thousand-dollar', dt: 0.02, what: 'the red $3,000 PENALTY stamp slams, camera shake', sfx: [{name: 'stamp', gain: -6}, {name: 'hit_impact', gain: -13}]},
	// ---------------- the $500
	{id: 'bribe', w: 24, word: 'The', dt: -0.08, what: 'DIAGONAL WIPE → Flow: the nameless coach slides the envelope', sfx: [{name: 'whoosh_fast', gain: -16}, {name: 'swish_short', gain: -19, at: 0.25}]},
	{id: 'bills', w: 30, word: 'five', dt: -0.04, what: 'banknotes burst out of the envelope; $500 key fact; gold light leak', sfx: [{name: 'banknote', gain: -10}, {name: 'coins_jingle', gain: -17, at: 0.1, dur: 0.8}, {name: 'sparkle_ding', gain: -19, at: 0.15}]},
	// ---------------- revenge
	{id: 'why', w: 36, word: 'Why?', dt: -0.07, what: 'ZOOM-THROUGH into the coach\'s eyes', sfx: [{name: 'crash_zoom', gain: -13}]},
	{id: 'revenge', w: 37, word: 'Revenge:', what: 'red pulse + REVENGE slams (glitch), shake', sfx: [{name: 'hit_impact', gain: -8}, {name: 'glitch_hit', gain: -15}]},
	{id: 'baseball', w: 38, word: "they'd", dt: -0.06, what: 'WHIP → the REAL 1916 Georgia Tech baseball team print', sfx: [{name: 'whoosh_fast', gain: -15}, {name: 'pop_in', gain: -18, at: 0.1}]},
	{id: 'crack', w: 39, word: 'crushed', dt: 0.03, what: 'cracks spread over the print, it greys out, shake', sfx: [{name: 'hit_impact', gain: -9}, {name: 'crate_thud', gain: -14}]},
	{id: 'board22', w: 43, word: 'twenty-two', dt: -0.06, what: 'wooden board slams: CUMBERLAND 22 · GA. TECH 0', sfx: [{name: 'scoreboard_flip', gain: -12}, {name: 'hit_impact', gain: -16}]},
	// ---------------- the recruits
	{id: 'recruits', w: 46, word: 'So', dt: -0.08, what: 'CIRCLE → Flow: recruits shoved into jerseys (wide)', sfx: [{name: 'swish_short', gain: -15}, {name: 'door_bang', gain: -17, at: 0.15}]},
	{id: 'law', w: 49, word: 'law', dt: -0.02, what: 'push onto the law student with his books + LAW STUDENTS tag with arrow', sfx: [{name: 'swish_short', gain: -18, at: -0.3}, {name: 'pop_in', gain: -14}]},
	{id: 'frat', w: 52, word: 'frat', dt: -0.02, what: 'whip onto the frat boys in pyjamas + FRAT BROTHERS tag with arrow', sfx: [{name: 'whoosh_fast', gain: -16, at: -0.3}, {name: 'pop_in', gain: -14}]},
	// ---------------- no first down
	{id: 'firstdown', w: 54, word: 'They', dt: -0.04, what: 'WHIP → the REAL photo of this game + the drawn field strip', sfx: [{name: 'whoosh_fast', gain: -15}, {name: 'crowd_1916', gain: -24, at: 0.1, from: 1.0, dur: 1.8}]},
	{id: 'try1', w: 55, word: 'never', dt: -0.05, what: 'the arrow runs at the first-down line, falls short', sfx: [{name: 'dust_puff', gain: -18, at: 0.45}]},
	{id: 'fail', w: 60, word: 'down.', dt: 0.02, what: 'red X on the first-down line', sfx: [{name: 'deflate_horn', gain: -20, dur: 0.7}]},
	// ---------------- the reporter
	{id: 'reporter', w: 61, word: 'A', dt: -0.08, what: 'PUSH UP → the REAL 1919 Tribune cartoon of Grantland Rice', sfx: [{name: 'swish_short', gain: -16}, {name: 'typewriter_tick', gain: -15, at: 0.2, dur: 1.9}]},
	{id: 'loss', w: 69, word: 'six-yard', dt: -0.12, what: 'field strip: the ball runs backwards, −6 YDS', sfx: [{name: 'whoosh_rev', gain: -18}, {name: 'trombone_wah', gain: -12, at: 0.45}]},
	// ---------------- final score
	{id: 'final', w: 71, word: 'Final', dt: -0.11, what: 'PUNCH → Flow: the whole team flat on the grass; final whistle', sfx: [{name: 'start_whistle', gain: -10}, {name: 'crowd_1916', gain: -19, at: 0.15, dur: 2.5}]},
	{id: 'roll', w: 73, word: 'two', what: 'the wooden board rolls GA. TECH 0 → 222', sfx: [{name: 'counter_tick_loop', gain: -16, dur: 1.2}, {name: 'scoreboard_flip', gain: -14}]},
	{id: 'land', w: 75, word: 'twenty-two', dt: 0.45, what: 'the counter lands on 222', sfx: [{name: 'hit_impact', gain: -12}, {name: 'fanfare_hit', gain: -17}]},
	{id: 'zero', w: 77, word: 'nothing.', what: 'the board glows; «32 touchdowns»', sfx: [{name: 'pop_in', gain: -16}]},
	// ---------------- the twist
	{id: 'reveal', w: 78, word: 'The', dt: -0.07, what: 'CIRCLE → the cartoon coach in a spotlight', sfx: [{name: 'whoosh_rev', gain: -16}, {name: 'riser_short', gain: -19, dur: 0.75}]},
	{id: 'real', w: 80, word: 'John', dt: -0.06, what: 'FLASH → the REAL photo of John Heisman; name key fact', sfx: [{name: 'hit_impact', gain: -9}, {name: 'crowd_ooh', gain: -13, at: 0.05}]},
	{id: 'trophy', w: 82, word: 'The', dt: -0.07, what: 'FADE → Flow: the golden trophy, rays, glints, gold leak', sfx: [{name: 'harp_gliss', gain: -16}, {name: 'sparkle_ding', gain: -17, at: 0.25}, {name: 'crowd_1916', gain: -20, at: 0.3, dur: 2.0}]},
	{id: 'atlas', w: 83, word: 'Heisman', dt: -0.06, what: 'Atlas pops in, shocked (Gemini pose card)', sfx: [{name: 'pop_in', gain: -14}]},
	{id: 'clap1', w: 86, word: 'named', dt: -0.08, what: 'Atlas switches to a slow clap: two claps', sfx: [{name: 'clap_single', gain: -7}, {name: 'clap_single', gain: -7, at: 0.38}]},
	{id: 'clap3', w: 87, word: 'after', dt: 0.28, what: 'third clap; loop dissolve to frame 0 follows', sfx: [{name: 'clap_single', gain: -7}]},
];
