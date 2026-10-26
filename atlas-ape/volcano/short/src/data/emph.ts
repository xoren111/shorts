// Key figures shown big (KeyFact). While the subtitle group that speaks one of these words is on, the subtitle is hidden —
// the big figure IS the caption of that phrase (owner 18.10: show important numbers big, but never twice).
// w = word index in data/words.json (the figure's word); the subtitle groups containing any of these words step aside.
export type Emph = {key: string; words: number[]; value: string; unit?: string; sub?: string; color?: 'gold' | 'teal'; y?: number; x?: number; size?: number; hold?: number; delay?: number};
export const EMPH: Emph[] = [
	{key: 'y1935', words: [17], value: '1935', y: 330, size: 150},
	// in from 17.34 s: the Patton card under the Hawaii B dissolve is down to ~14 % by then (gone by 17.4); out by 18.26 s,
	// just before the «2 Jan 1936» label (18.27) — readable through all of «Six days later» (review 18.10)
	{key: 'days', words: [32, 33], value: '6', unit: 'days later', y: 420, delay: 0.32, hold: 0.15},
	{key: 'y1992', words: [47], value: '1992', y: 330, size: 150},
	{key: 'building', words: [74, 75], value: '1', unit: 'building lost', y: 420},
	{key: 'y1973', words: [81], value: '1973', unit: '23 January', y: 340, size: 150},
	{key: 'people', words: [90, 91], value: '5,300', unit: 'people on Heimaey', y: 360},
	{key: 'hours', words: [92, 93], value: '6', unit: 'hours', y: 340},
	{key: 'months', words: [112, 113], value: '5', unit: 'months', sub: '6 Feb – 10 Jul 1973', y: 320},
	{key: 'liters', words: [114, 115, 116], value: '7.3', unit: 'billion liters', sub: '≈ 7.3 million m³', color: 'teal', y: 420, delay: 0.12},
	// (shot C, Blender toon): on the dark cooled lava just below-left of the ruler's lava end (≈ (556, 1110) in iceland_c track.json),
	// clear of the inbound boats' lane and wakes right of the ruler — not on Heimaklettur's cliff (review 18.10)
	{key: 'meters', words: [122, 123, 124], value: '~100 m', x: 395, y: 1205, size: 104, delay: 0.38},
];
