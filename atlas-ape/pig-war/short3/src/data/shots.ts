// v3 «real footage» shot table (SHOTS.md): absolute seconds on the edit clock (data/words.json). Each shot starts ~0.1 s
// before the word that opens its idea; the incoming shot dissolves in over XF on top of the outgoing one.
export const XF = 0.3;
export const END = 43.85;
export const S = {
	H1: [0.0, 1.39],      // America and Britain — cannon
	H2: [1.39, 2.98],     // almost went to war — volley
	H3: [2.98, 4.7],      // Over one pig
	F1: [4.7, 5.64],      // A farmer caught it
	F2: [5.64, 7.07],     // eating his potatoes
	F3: [7.07, 8.48],     // So he shot it (blast on «shot» ≈ 7.8)
	F4: [8.48, 10.61],    // Problem: the farmer was American
	F5: [10.61, 12.52],   // The pig was British
	P1: [12.52, 13.94],   // He offered ten dollars
	P2: [13.94, 15.81],   // The owner wanted a hundred
	M1: [15.81, 18.6],    // Worse, both countries claimed the island (v1 map frames start at 15.81)
	S1: [18.6, 20.35],    // America sent over
	S2: [20.35, 21.56],   // four hundred soldiers
	W1: [21.56, 23.72],   // Britain sent five warships
	G1: [23.72, 26.06],   // The governor wanted the Americans gone
	A1: [26.06, 27.89],   // The admiral said no
	A2: [27.89, 29.42],   // Not over a pig
	Y1: [29.42, 31.36],   // So both sides just stayed
	Y2: [31.36, 33.23],   // For twelve years
	Y3: [33.23, 34.5],    // And partied together
	K1: [34.5, 35.97],    // Then a German emperor
	K2: [35.97, 36.74],   // settled it (seal lands ≈ 36.15)
	M2: [36.74, 38.54],   // The island went to America (v1 mapfinal frames start at 36.74)
	E1: [38.54, 43.85],   // Total casualties: one pig. Team farmer, or team pig?
} as const;
export type ShotKey = keyof typeof S;
