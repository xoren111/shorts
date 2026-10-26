// v3 per-shot settings (tuned against the delivered footage — assets/footage/<id>/<id>.json, copied to public/footage).
// Clip: `from` = second inside the trimmed clip shown at the shot start, `zoom` [start, end] relative to the 1296×2304 crop,
// `pan` [x0, y0, x1, y1] px drift, `freeze` s after the shot start, `subY` subtitle line, `badge`/`halo` overlay anchors.
                                     
                                      

                                                                                                                                                                                                                                                             
                                                                                                                                                        
                                                                                                                                                                 

const f = (id        , o                       = {})          => ({src: `footage/${id}/${id}.mp4`, ...o});

export const CLIPS                                    = {
	H3: {src: 'preview/H3.mp4', from: 0.15, zoom: [1.0, 1.1], subY: 1560},
	F1: {src: 'preview/F1.mp4', from: 0.2, zoom: [1.04, 1.12]},
	F2: f('F2', {zoom: [1.04, 1.14]}),
	F3: f('F3', {zoom: [1.0, 1.08]}),
	F4: {...f('F3', {zoom: [1.08, 1.18], freeze: 0.5, mono: 0.0}), badge: [790, 560]},
	F5: {...f('F5', {zoom: [1.0, 1.1]}), badge: [790, 560]},
	S1: f('S1', {zoom: [1.0, 1.08]}),
	S2: f('S2', {zoom: [1.02, 1.1]}),
	W1: f('W1', {zoom: [1.0, 1.1]}),
	A2: f('A2', {zoom: [1.0, 1.12]}),
	Y2: f('Y2', {zoom: [1.0, 1.06]}),
	Y3: f('Y3', {zoom: [1.02, 1.1]}),
	K2: f('K2', {zoom: [1.0, 1.1]}),
	E1: {...f('E1', {zoom: [1.0, 1.06]}), halo: [540, 520]},
};

/** owner-made Google Flow stills (assets/flow), full-bleed with a slow push */
export const STILLS                                     = {
	H1: {src: 'preview/T_standoff.jpg', zoom: [1.0, 1.22], focus: [0.5, 0.62], span: [0, 3.3], subY: 300},
	H2: {src: 'preview/T_standoff.jpg', zoom: [1.0, 1.22], focus: [0.5, 0.62], span: [0, 3.3], subY: 300},
	H3: {src: 'preview/T_pig_potato.jpg', zoom: [1.02, 1.16], focus: [0.5, 0.42], subY: 1560},
	F1: {src: 'preview/T_farmer_catches.jpg', zoom: [1.0, 1.1], focus: [0.42, 0.5], subY: 300},
};

export const PHOTOS                                     = {
	G1: {src: 'footage/G1/G1.jpg', aspect: 0.75, focus: [0.5, 0.3]},
	A1: {src: 'footage/A1/A1.jpg', aspect: 0.75, focus: [0.5, 0.3]},
	Y1: {src: 'footage/Y1/Y1.jpg', aspect: 1.4, width: 960, focus: [0.5, 0.5]},
	K1: {src: 'footage/K1/K1.jpg', aspect: 0.75, focus: [0.5, 0.3]},
};

/** coin pile: P1 one coin lands, P2 nine more scatter onto it (x, y in the 1080×1920 frame) */
const pile = [
	[560, 1010, -12, 1.0], [430, 930, 20, 0.9], [690, 900, -30, 0.92], [470, 1110, 8, 0.95], [650, 1120, 35, 0.9],
	[540, 860, -5, 0.88], [380, 1030, 50, 0.86], [730, 1020, -45, 0.9], [560, 1180, 15, 0.92], [610, 980, 70, 0.95],
];
export const COINS = {
	img: 'footage/P1/coin.png',
	bg: 'footage/table/table.jpg',
	P1: [{t: 12.62, x: 540, y: 1000, r: -8, s: 1.25}],
	P2: [{t: 13.94, x: 540, y: 1000, r: -8, s: 1.25}, ...pile.slice(1).map(([x, y, r, s], i) => ({t: 15.2 + i * 0.07, x, y, r, s}))],
};
