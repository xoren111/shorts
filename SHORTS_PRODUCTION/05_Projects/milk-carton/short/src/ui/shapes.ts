import {PAL} from '../theme';

/**
 * ORIGINAL simple shapes for <Morph> (src/ui/morph.tsx) — drawn here from geometry (circles, polygons, sines), no clip-art,
 * no logos, no characters. Every shape lives in the same 200 × 200 box centred on 0,0 (x, y ∈ −100…100, y down), so any two
 * morph at the same size; <Morph size={px}> maps the box to px.
 * A shape may hold several subpaths: nesting decides the role (depth 0 = solid, inside a solid = hole, inside a hole = solid
 * again …), so the coin's rim groove and the pin's eye are real holes. Morph matches rings by that tree (solid ↔ solid,
 * hole ↔ hole, children of matched parents with each other); a ring without a partner shrinks into / grows out of its parent.
 *   SHAPES.coin.d            raw path (also fine for a plain <path d>)
 *   shapeNames()             ids in library order
 *   <Morph shapes={['coin', 'pin', 'island']} keys={[W(3), W(7), W(12)]} size={620} />
 * Colours: the channel palette (theme.ts, standard T15) — fills only, never text.
 */

export type ShapeDef = {
	id: string;
	/** SVG path in the 200-unit box centred on 0,0 (y down); subpaths = rings (holes by nesting) */
	d: string;
	/** default fill (PAL); <Morph fill> overrides */
	fill: string;
	/** one-line description for galleries / docs */
	label: string;
};

type P = [number, number];
const f = (n: number) => String(Math.round(n * 100) / 100);
const pt = ([x, y]: P) => `${f(x)} ${f(y)}`;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** cubic-Bézier pieces (≤ 90° each) of a circular arc from angle a0 to a1 (degrees, 0° = +x, 90° = down), WITHOUT the M */
const arcC = (cx: number, cy: number, r: number, a0: number, a1: number) => {
	const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90));
	const da = (a1 - a0) / n;
	const k = (4 / 3) * Math.tan(rad(da) / 4);
	let s = '';
	for (let i = 0; i < n; i++) {
		const t0 = rad(a0 + da * i), t1 = rad(a0 + da * (i + 1));
		const p0: P = [cx + r * Math.cos(t0), cy + r * Math.sin(t0)];
		const p1: P = [cx + r * Math.cos(t1), cy + r * Math.sin(t1)];
		const c0: P = [p0[0] - k * r * Math.sin(t0), p0[1] + k * r * Math.cos(t0)];
		const c1: P = [p1[0] + k * r * Math.sin(t1), p1[1] - k * r * Math.cos(t1)];
		s += ` C ${pt(c0)} ${pt(c1)} ${pt(p1)}`;
	}
	return s;
};

/** full circle, clockwise on screen, starting at the top */
export const circleD = (cx: number, cy: number, r: number) => `M ${pt([cx, cy - r])}${arcC(cx, cy, r, -90, 270)} Z`;

/** closed polygon */
export const polyD = (pts: P[]) => `M ${pts.map(pt).join(' L ')} Z`;

/** closed smooth curve through the points (Catmull-Rom → cubic Bézier) */
export const smoothD = (pts: P[], tension = 1) => {
	const n = pts.length;
	let s = `M ${pt(pts[0])}`;
	for (let i = 0; i < n; i++) {
		const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
		const c1: P = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
		const c2: P = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
		s += ` C ${pt(c1)} ${pt(c2)} ${pt(p2)}`;
	}
	return s + ' Z';
};

/** n-point star (outer radius R, inner r), first tip straight up */
export const starD = (cx: number, cy: number, R: number, r: number, n = 5) =>
	polyD(Array.from({length: n * 2}, (_, i) => {
		const a = rad(-90 + (i * 180) / n);
		const q = i % 2 ? r : R;
		return [cx + q * Math.cos(a), cy + q * Math.sin(a)] as P;
	}));

/** organic blob: radius = base + Σ amp·sin(k·θ + phase), squashed by sx / sy */
const blob = (cx: number, cy: number, base: number, waves: [number, number, number][], sx = 1, sy = 1, n = 30): P[] =>
	Array.from({length: n}, (_, i) => {
		const a = (i / n) * Math.PI * 2 - Math.PI / 2;
		const r = base + waves.reduce((s, [k, amp, ph]) => s + amp * Math.sin(k * a + ph), 0);
		return [cx + r * Math.cos(a) * sx, cy + r * Math.sin(a) * sy];
	});

// ---------------------------------------------------------------------------------------------------------------- shapes

/** coin: disc, rim groove (hole ring + inner disc) and a star cut into the face */
const coin = [circleD(0, 0, 90), circleD(0, 0, 75), circleD(0, 0, 66), starD(0, 4, 36, 15)].join(' ');

/** map pin: round head tangent into a sharp tip, round eye (hole) */
const pin = (() => {
	const c: P = [0, -30], r = 64, tip: P = [0, 96];
	const d = tip[1] - c[1];
	const beta = Math.acos(r / d) * (180 / Math.PI); // angle at the centre between «to the tip» and a tangent point
	const aR = 90 - beta, aL = 90 + beta; // tangent points (screen angles)
	const tr: P = [c[0] + r * Math.cos(rad(aR)), c[1] + r * Math.sin(rad(aR))];
	// tip → right tangent point → over the top (counter-clockwise on screen) → left tangent point → tip
	const outline = `M ${pt(tip)} L ${pt(tr)}${arcC(c[0], c[1], r, aR, aL - 360)} Z`;
	return `${outline} ${circleD(c[0], c[1], 26)}`;
})();

/** house: walls, roof with eaves, chimney on the right slope; door, window and gable window are holes */
const house = (() => {
	const apex: P = [0, -90], eaveR: P = [88, -10];
	const slope = (x: number) => apex[1] + ((eaveR[1] - apex[1]) / (eaveR[0] - apex[0])) * x;
	const outline = polyD([
		[-64, 94], [-64, -10], [-88, -10], apex, [38, slope(38)], [38, -80], [60, -80], [60, slope(60)], eaveR, [64, -10], [64, 94],
	]);
	const door = polyD([[-16, 36], [16, 36], [16, 82], [-16, 82]]);
	const win = polyD([[28, 14], [52, 14], [52, 38], [28, 38]]);
	const win2 = polyD([[-52, 14], [-28, 14], [-28, 38], [-52, 38]]);
	return [outline, door, win, win2, circleD(0, -34, 12)].join(' ');
})();

/**
 * sailing ship: hull, two bellied sails on one mast. The outline is star-shaped (seen whole from the foot of the mast), so it
 * morphs polar-safe; the gap under each sail (boom) and three portholes are holes.
 */
const ship = [
	'M 3 -96 C 40 -62 72 -16 82 26 L 82 36 L 100 34 C 90 62 80 84 60 84 L -60 84 C -80 84 -92 62 -98 34 L -74 36 L -74 26',
	'C -64 -8 -36 -46 -4 -70 L -4 -92 Z',
	polyD([[12, 25], [74, 25], [74, 30], [12, 30]]), polyD([[-66, 25], [-12, 25], [-12, 30], [-66, 30]]),
	circleD(-36, 60, 8), circleD(0, 60, 8), circleD(36, 60, 8),
].join(' ');

/** heart: two lobes, notch on top, point at the bottom */
const heart = [
	'M 0 92 C -36 62 -96 22 -96 -24 C -96 -64 -62 -88 -34 -88 C -16 -88 -4 -76 0 -60',
	'C 4 -76 16 -88 34 -88 C 62 -88 96 -64 96 -24 C 96 22 36 62 0 92 Z',
].join(' ');

/** five-point star, a fat one (reads at small sizes), optically centred */
const star = starD(0, 9, 98, 42);

/** arrow to the right: long shaft, big head */
const arrow = polyD([[-94, -22], [16, -22], [16, -64], [96, 0], [16, 64], [16, 22], [-94, 22]]);

/** island: wobbly main blob (smooth closed curve) + a small islet */
const island = [
	smoothD(blob(-8, -8, 64, [[3, 10, 0.6], [5, 7, 2.0], [8, 4, 0.3]], 1.12, 0.92)),
	smoothD(blob(70, 68, 14, [[3, 3, 1.1]], 1.2, 0.9, 12)),
].join(' ');

/** flag: pole with a round knob, a cloth with a gentle wave (star-shaped from inside the pole), a round emblem cut out */
const flag = [
	'M -74 -82 C -30 -94 30 -62 92 -76 L 92 -10 C 30 4 -30 -28 -74 -14 L -74 96 L -86 96 L -86 -82 Z',
	circleD(-80, -90, 10),
	circleD(8, -44, 14),
].join(' ');

export const SHAPES = {
	coin: {id: 'coin', d: coin, fill: PAL.gold, label: 'coin: disc, rim groove, star on the face'},
	pin: {id: 'pin', d: pin, fill: PAL.orange, label: 'map pin with a round eye'},
	house: {id: 'house', d: house, fill: PAL.parchment, label: 'house: roof, chimney, door, windows'},
	ship: {id: 'ship', d: ship, fill: PAL.parchment, label: 'sailing ship: hull, two sails, portholes'},
	heart: {id: 'heart', d: heart, fill: '#E0303F', label: 'heart'},
	star: {id: 'star', d: star, fill: PAL.gold, label: 'five-point star'},
	arrow: {id: 'arrow', d: arrow, fill: PAL.orange, label: 'arrow to the right'},
	island: {id: 'island', d: island, fill: PAL.teal, label: 'island blob + islet'},
	flag: {id: 'flag', d: flag, fill: PAL.stamp, label: 'flag on a pole, round emblem'},
	circle: {id: 'circle', d: circleD(0, 0, 90), fill: PAL.orange, label: 'primitive: circle'},
	square: {id: 'square', d: polyD([[-82, -82], [82, -82], [82, 82], [-82, 82]]), fill: PAL.orange, label: 'primitive: square'},
} satisfies Record<string, ShapeDef>;

export type ShapeName = keyof typeof SHAPES;
export const shapeNames = () => Object.keys(SHAPES) as ShapeName[];
export const isShapeName = (s: string): s is ShapeName => Object.prototype.hasOwnProperty.call(SHAPES, s);
