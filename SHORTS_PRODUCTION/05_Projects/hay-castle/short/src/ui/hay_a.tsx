import React, {useId} from 'react';
import {INK, clamp01, easeInOut, easeOut, h1, lerp} from './gfx';
import {SKIN, SKIN_D} from './draw';
import {PAL} from '../theme';

// hay-castle draw kit A — our own generic farmer (rubber boots, flat cap; no likeness of the real man), straw bales and the
// bale wall, the mock-Tudor «castle», cannon, ladder, the «4 YEARS» timer and straw dust. Same series-A look as
// conman-russell/cast.tsx: flat fills, INK outlines, every figure drawn in its own units with (0, 0) at the feet / base.
//
// ONE WORLD SCALE: all pieces share the same units (farmer 900 tall, bale 640 × 320, wall 6 × 11 bales = 3840 × 3520,
// castle 3140 wide × 3330 to the flag tip) → the same `s` puts them in proportion. Ink lines stay ≈ LW px on screen at any s
// (lwFor). Every piece comes twice: `XxxG` = an SVG <g> to compose inside another SVG in world units (e.g. the castle as
// BaleWall `behind`, a farmer as Ladder `rider`), `Xxx` = an absolutely placed <svg> for the scene (x, y = feet / base in px).
// All animation comes in through props: progress values 0..1, ages in seconds, `t` (scene seconds) for idle wobble.

// ───────────────────────────── shared ─────────────────────────────

/** ink line on screen, px */
export const LW = 5;
/** ink width in world units for a piece drawn at scale s (≈ LW px on screen, clamped so tiny figures keep their faces) */
export const lwFor = (s: number) => Math.max(6, Math.min(16, LW / Math.max(0.01, s)));

export const BW = 640; // bale front face
export const BH = 320;
export const FARMER_H = 900;

const sid = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');
const useSid = (p: string) => p + sid(useId());

type P2 = [number, number];
const pl = (pts: P2[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
const rotP = (p: P2, o: P2, deg: number): P2 => {
	const a = (deg * Math.PI) / 180;
	const c = Math.cos(a);
	const s = Math.sin(a);
	const dx = p[0] - o[0];
	const dy = p[1] - o[1];
	return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c];
};
const easeIn = (x: number) => clamp01(x) * clamp01(x);
/** 0→1 with an overshoot (pop) */
export const popOv = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2));
const easeOutBack = (x: number) => {
	const c1 = 1.9;
	const k = clamp01(x) - 1;
	return 1 + (c1 + 1) * k * k * k + c1 * k * k;
};
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
/** colour mix of two #rrggbb */
export const mix = (a: string, b: string, k: number) => {
	const A = hex(a);
	const B = hex(b);
	const m = A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(k)));
	return `rgb(${m[0]},${m[1]},${m[2]})`;
};

/** outlined tubes (arms, legs, rails, rope): every segment's ink first, then the colours → joints without seams */
const Tubes: React.FC<{segs: {pts: P2[]; w: number; c: string}[]; lw: number; cap?: 'round' | 'butt'}> = ({segs, lw, cap = 'round'}) => (
	<g strokeLinecap={cap} strokeLinejoin="round" fill="none">
		{segs.map((s, i) => (
			<polyline key={`i${i}`} points={pl(s.pts)} stroke={INK} strokeWidth={s.w + lw * 2} />
		))}
		{segs.map((s, i) => (
			<polyline key={`c${i}`} points={pl(s.pts)} stroke={s.c} strokeWidth={s.w} />
		))}
	</g>
);

/** an irregular cauliflower blob (dust / smoke / rubble puff), never a plain circle */
const blobPath = (cx: number, cy: number, r: number, seed: number, lobes = 5) => {
	const n = 16;
	const pts: P2[] = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2;
		const rr = r * (1 + 0.14 * Math.sin(a * lobes + seed * 2.3) + 0.16 * (h1(seed * 1.7 + i * 0.913) - 0.5));
		pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.88]);
	}
	let d = '';
	for (let i = 0; i < n; i++) {
		const p = pts[i];
		const q = pts[(i + 1) % n];
		if (i === 0) {
			const z = pts[n - 1];
			d += `M${((z[0] + p[0]) / 2).toFixed(1)},${((z[1] + p[1]) / 2).toFixed(1)}`;
		}
		d += `Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`;
	}
	return d + 'Z';
};

/** a jagged closed ring (bite marks, rubble edge) */
const jagPath = (cx: number, cy: number, r: number, seed: number, n = 20, depth = 0.16) => {
	const pts: P2[] = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2;
		const rr = r * (i % 2 ? 1 - depth * (0.6 + 0.8 * h1(seed + i)) : 1 + depth * 0.3 * h1(seed * 2 + i));
		pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
	}
	return 'M' + pl(pts).replace(/ /g, ' L') + 'Z';
};

// palette of the kit (series A: flat, warm farm colours that sit on navy / parchment; accent stays PAL.orange)
export const HAY = {
	straw: '#E7C266',
	strawL: '#F7E0A0',
	strawD: '#B98E3C',
	twine: '#2F6DB5',
	tarp: '#2F80D2',
	tarpD: '#1D5EA6',
	tarpL: '#7AB8F2',
	stone: '#BDB4A3',
	stoneL: '#D9D1C2',
	stoneD: '#8E8574',
	render: '#F3EAD6',
	beam: '#3A291E',
	roof: '#A44C33',
	roofD: '#7A3424',
	brick: '#AE5E3E',
	glass: '#2C4C6E',
	glassL: '#8DBBDD',
	door: '#6B4226',
	iron: '#2C2C35',
	ironL: '#5A5A6E',
	wood: '#A8743F',
	woodD: '#7A5130',
	woodL: '#C48E55',
	dirt: '#7B5A3B',
	sil: '#14203A',
} as const;

// ───────────────────────────── StrawDust ─────────────────────────────

export type DustTone = 'straw' | 'stone' | 'smoke';
const DUST: Record<DustTone, [string, string, string]> = {
	straw: ['#C29C55', '#E6CB8A', '#FBF0CF'],
	stone: ['#7C756A', '#A9A193', '#DAD3C6'],
	smoke: ['#8A8996', '#BEBDC8', '#F0EFF4'],
};

export type StrawDustProps = {
	x: number;
	y: number;
	/** seconds since the impact (< 0 or > life → nothing) */
	age: number;
	/** 1 = puffs ≈ 90 units across */
	size?: number;
	/** horizontal drift −1..1 */
	dir?: number;
	tone?: DustTone;
	seed?: number;
	/** number of puffs (volume) */
	n?: number;
	life?: number;
	/** flying bits: straw stalks (straw) or chips (stone); 0 = none */
	bits?: number;
	/** how fast the cloud climbs */
	rise?: number;
	lw?: number;
};

/** layered irregular dust: one ink silhouette around the whole cloud, then shadow / mid / highlight lobes (volume), plus
 *  straw stalks or stone chips on ballistic arcs; grows fast, drifts up, fades in the last 45 % of `life` */
export const StrawDustG: React.FC<StrawDustProps> = ({x, y, age, size = 1, dir = 0, tone = 'straw', seed = 1, n = 6, life = 1.1, bits, rise = 1, lw = 8}) => {
	if (age < 0 || age > life) return null;
	const R = 90 * size;
	const u = age / life;
	const grow = easeOut(Math.min(1, age / (life * 0.42)));
	// dissipates instead of greying out: after 50 % of life the lobes drift apart and shrink, the ink edge fades first,
	// the whole cloud fades only in the last 30 %
	const fade = clamp01((u - 0.5) / 0.5);
	const o = clamp01((1 - u) / 0.3);
	const edge = 1 - fade;
	const puffs = Array.from({length: n}, (_, i) => {
		const hs = h1(seed * 9.1 + i * 3.7);
		const a = Math.PI * (1.04 + 0.92 * (n === 1 ? 0.5 : i / (n - 1))) + (hs - 0.5) * 0.5;
		const d = R * (0.35 + 1.1 * h1(seed + i * 5.3)) * grow;
		return {
			x: x + Math.cos(a) * d * (1.5 + 0.6 * fade) + dir * R * 0.9 * grow,
			y: y + Math.sin(a) * d * 0.55 - R * 0.3 * grow - age * R * 0.5 * rise,
			r: R * (0.52 + 0.45 * h1(seed * 2.2 + i)) * (0.35 + 0.75 * grow) * (1 + 0.18 * u) * (1 - 0.4 * fade * (0.6 + 0.8 * h1(seed + i * 2.7))),
			s: seed * 13 + i * 7,
		};
	});
	const [c0, c1, c2] = DUST[tone];
	const nb = bits ?? (tone === 'smoke' ? 0 : 8);
	return (
		<g opacity={o}>
			<g opacity={edge}>
				{puffs.map((p, i) => (
					<path key={`o${i}`} d={blobPath(p.x, p.y, p.r + lw * 1.1, p.s)} fill={INK} />
				))}
			</g>
			<g opacity={1 - 0.75 * fade}>
				{puffs.map((p, i) => (
					<path key={`a${i}`} d={blobPath(p.x, p.y, p.r, p.s)} fill={c0} />
				))}
			</g>
			{puffs.map((p, i) => (
				<path key={`b${i}`} d={blobPath(p.x - p.r * 0.1, p.y - p.r * 0.15, p.r * 0.8, p.s + 3)} fill={c1} />
			))}
			{puffs.map((p, i) => (
				<path key={`c${i}`} d={blobPath(p.x - p.r * 0.3, p.y - p.r * 0.36, p.r * 0.4, p.s + 5, 4)} fill={c2} />
			))}
			{Array.from({length: nb}, (_, i) => {
				const hs = h1(seed * 4.3 + i * 2.9);
				const a = -Math.PI / 2 + (hs - 0.5) * 2.6 + dir * 0.5;
				const sp = (650 + 650 * h1(seed + i * 1.9)) * Math.min(size, 2.2) * (tone === 'stone' ? 0.6 : 1);
				const bx = x + Math.cos(a) * sp * age;
				const by = y - 20 * size + Math.sin(a) * sp * age + 0.5 * 2300 * Math.min(size, 2.2) * age * age;
				const rot = hs * 360 + age * 800 * (i % 2 ? 1 : -1);
				const len = (44 + 34 * h1(i * 7.7 + seed)) * Math.min(size, 2.6);
				if (tone === 'straw')
					return (
						<g key={`s${i}`} transform={`translate(${bx} ${by}) rotate(${rot})`}>
							<line x1={-len / 2} y1={0} x2={len / 2} y2={0} stroke={INK} strokeWidth={9 * size + lw * 1.2} strokeLinecap="round" />
							<line x1={-len / 2} y1={0} x2={len / 2} y2={0} stroke={HAY.strawL} strokeWidth={9 * size} strokeLinecap="round" />
						</g>
					);
				const r = len * 0.45;
				return (
					<path
						key={`s${i}`}
						d={`M${-r},${-r * 0.5} L${r * 0.2},${-r} L${r},${-r * 0.1} L${r * 0.4},${r * 0.8} L${-r * 0.8},${r * 0.5} Z`}
						transform={`translate(${bx} ${by}) rotate(${rot})`}
						fill={i % 3 ? c1 : HAY.brick}
						stroke={INK}
						strokeWidth={lw * 0.8}
						strokeLinejoin="round"
					/>
				);
			})}
		</g>
	);
};

/** StrawDust placed in screen px (full-frame svg): size 1 ≈ 90 px puffs */
export const StrawDust: React.FC<StrawDustProps> = (p) => (
	<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
		<StrawDustG lw={LW} {...p} />
	</svg>
);

// ───────────────────────────── Farmer ─────────────────────────────

export type FarmerPose = 'stand' | 'push' | 'thumbs' | 'popper' | 'arms' | 'cap' | 'sit' | 'freeze' | 'walk';
export type FarmerMood = 'smile' | 'grin' | 'effort' | 'defiant' | 'sad' | 'shock' | 'cheer';
export type FarmerProps = {
	t: number;
	pose?: FarmerPose;
	/** pose progress 0..1: push = arm extension, thumbs / popper = arm raise, cap = head bow, sit = slump */
	k?: number;
	/** head turn −1 (left) .. 1 (right); default: push / walk look ahead (right) */
	look?: number;
	mood?: FarmerMood;
	/** cap (default), party hat, or none (pose cap holds it in his hands) */
	hat?: 'cap' | 'party' | 'none';
	/** party hat deflates 0..1 */
	deflate?: number;
	/** pose popper: seconds since the pop (confetti + streamers) */
	popAge?: number;
	/** faces left */
	flip?: boolean;
	speed?: number;
	lw?: number;
};

const FC = {
	shirt: '#C8323C',
	shirtD: '#97202B',
	check: '#6E1220',
	denim: '#4069AC',
	denimD: '#2D4E88',
	boot: '#2E8048',
	bootD: '#1F5E33',
	sole: '#173C24',
	cap: '#7D6B55',
	capD: '#56483A',
	hair: '#6A4426',
	cheek: '#E8846F',
};
const MOOD: Record<FarmerPose, FarmerMood> = {stand: 'smile', push: 'effort', thumbs: 'grin', popper: 'cheer', arms: 'defiant', cap: 'sad', sit: 'sad', freeze: 'shock', walk: 'smile'};

type HandKind = 'fist' | 'palm' | 'thumb' | 'spread';
type ArmDef = {S: P2; E: P2; H: P2; hand: HandKind; rot?: number};

const Boot: React.FC<{x: number; toe: number; lw: number}> = ({x, toe, lw}) => (
	<g transform={`translate(${x} 0) scale(${toe} 1)`}>
		<path d="M-46,-206 L46,-206 L48,-46 Q94,-44 102,-14 L102,0 L-50,0 L-48,-46 Z" fill={FC.boot} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
		<path d="M-50,-12 L102,-12" stroke={FC.sole} strokeWidth={16} />
		<path d="M-50,0 L102,0" stroke={INK} strokeWidth={lw} strokeLinecap="round" />
		<rect x={-54} y={-224} width={108} height={36} rx={13} fill={FC.bootD} stroke={INK} strokeWidth={lw} />
		<path d="M-26,-176 L-24,-70" stroke="rgba(255,255,255,0.38)" strokeWidth={12} strokeLinecap="round" />
	</g>
);

const Hand: React.FC<{a: ArmDef; lw: number}> = ({a, lw}) => {
	const [x, y] = a.H;
	const tr = `translate(${x} ${y}) rotate(${a.rot ?? 0})`;
	if (a.hand === 'palm')
		return (
			<g transform={tr}>
				<rect x={-20} y={-44} width={44} height={88} rx={20} fill={SKIN} stroke={INK} strokeWidth={lw} />
				<path d="M-6,-46 Q-24,-60 -30,-40" stroke={INK} strokeWidth={lw * 0.8} fill={SKIN} />
			</g>
		);
	if (a.hand === 'thumb')
		return (
			<g transform={tr}>
				<rect x={-14} y={-82} width={30} height={64} rx={15} fill={SKIN} stroke={INK} strokeWidth={lw} />
				<rect x={-34} y={-30} width={68} height={62} rx={24} fill={SKIN} stroke={INK} strokeWidth={lw} />
				<path d="M-30,-8 L30,-8 M-30,10 L30,10" stroke={SKIN_D} strokeWidth={6} />
			</g>
		);
	if (a.hand === 'spread')
		return (
			<g transform={tr}>
				<Tubes lw={lw * 0.8} segs={[-58, -28, 0, 28, 58].map((d) => ({pts: [[0, 0], [Math.sin((d * Math.PI) / 180) * 58, Math.cos((d * Math.PI) / 180) * 58]] as P2[], w: 15, c: SKIN}))} />
				<circle r={30} fill={SKIN} stroke={INK} strokeWidth={lw} />
			</g>
		);
	return <circle cx={x} cy={y} r={30} fill={SKIN} stroke={INK} strokeWidth={lw} />;
};

const ArmTubes: React.FC<{a: ArmDef; lw: number; sleeve: string}> = ({a, lw, sleeve}) => (
	<g>
		<Tubes lw={lw} segs={[{pts: [a.S, a.E], w: 70, c: sleeve}, {pts: [a.E, a.H], w: 50, c: SKIN}]} />
		<circle cx={a.E[0]} cy={a.E[1]} r={31} fill={FC.shirtD} stroke={INK} strokeWidth={lw * 0.8} />
	</g>
);

/** the farmer's head, centre (0, 0) */
const FarmerHead: React.FC<{mood: FarmerMood; look: number; hat: 'cap' | 'party' | 'none'; deflate: number; lw: number; t: number; blink: boolean; sweat: boolean}> = ({mood, look, hat, deflate, lw, t, blink, sweat}) => {
	const lx = look;
	const fl = Math.max(9, lw * 0.95);
	const ex = (s: number) => s * 27 + lx * 13;
	const eyes = () => {
		if (mood === 'shock')
			return [-1, 1].map((s) => (
				<g key={s}>
					<circle cx={ex(s)} cy={-6} r={21} fill="#fff" stroke={INK} strokeWidth={lw * 0.8} />
					<circle cx={ex(s) + lx * 6} cy={-4} r={8} fill={INK} />
				</g>
			));
		if (blink) return [-1, 1].map((s) => <path key={s} d={`M${ex(s) - 13},-4 Q${ex(s)},4 ${ex(s) + 13},-4`} stroke={INK} strokeWidth={fl * 0.8} fill="none" strokeLinecap="round" />);
		if (mood === 'grin' || mood === 'cheer') return [-1, 1].map((s) => <path key={s} d={`M${ex(s) - 14},0 Q${ex(s)},-18 ${ex(s) + 14},0`} stroke={INK} strokeWidth={fl * 0.85} fill="none" strokeLinecap="round" />);
		if (mood === 'effort') return [-1, 1].map((s) => <path key={s} d={`M${ex(s) - 15},${-6 + s * 0} L${ex(s) + 15},-2`} stroke={INK} strokeWidth={fl} strokeLinecap="round" />);
		return [-1, 1].map((s) => <ellipse key={s} cx={ex(s)} cy={-6} rx={9.5} ry={mood === 'sad' ? 10 : 12.5} fill={INK} />);
	};
	const brows = () => {
		const B: Record<FarmerMood, string> = {
			smile: 'M-48,-36 Q-32,-44 -14,-38',
			grin: 'M-48,-44 Q-32,-54 -14,-46',
			cheer: 'M-48,-46 Q-32,-58 -14,-48',
			effort: 'M-50,-42 L-12,-26',
			defiant: 'M-50,-44 L-12,-28',
			sad: 'M-50,-28 L-14,-42',
			shock: 'M-50,-52 Q-32,-66 -14,-54',
		};
		return [-1, 1].map((s) => <path key={s} d={B[mood]} transform={`translate(${lx * 12} 0) scale(${s} 1)`} stroke={INK} strokeWidth={fl * 1.1} fill="none" strokeLinecap="round" />);
	};
	const mx = lx * 10;
	const mouth = () => {
		switch (mood) {
			case 'grin':
				return <path d={`M${mx - 36},40 Q${mx},88 ${mx + 36},40 Z`} fill="#fff" stroke={INK} strokeWidth={lw * 0.9} strokeLinejoin="round" />;
			case 'cheer':
				return (
					<g>
						<path d={`M${mx - 36},38 Q${mx},104 ${mx + 36},38 Z`} fill="#5A1A24" stroke={INK} strokeWidth={lw * 0.9} strokeLinejoin="round" />
						<ellipse cx={mx} cy={70} rx={16} ry={9} fill="#E46A78" />
					</g>
				);
			case 'effort':
				return (
					<g>
						<rect x={mx - 30} y={40} width={60} height={26} rx={9} fill="#fff" stroke={INK} strokeWidth={lw * 0.9} />
						<path d={`M${mx - 28},53 L${mx + 28},53`} stroke={INK} strokeWidth={lw * 0.5} />
					</g>
				);
			case 'defiant':
				return <path d={`M${mx - 24},58 L${mx + 22},52`} stroke={INK} strokeWidth={fl} strokeLinecap="round" />;
			case 'sad':
				return <path d={`M${mx - 24},64 Q${mx},44 ${mx + 24},64`} stroke={INK} strokeWidth={fl} fill="none" strokeLinecap="round" />;
			case 'shock':
				return <ellipse cx={mx} cy={58} rx={15} ry={20} fill="#5A1A24" stroke={INK} strokeWidth={lw * 0.9} />;
			default:
				return <path d={`M${mx - 26},48 Q${mx},68 ${mx + 26},48`} stroke={INK} strokeWidth={fl} fill="none" strokeLinecap="round" />;
		}
	};
	const sp = (t * 0.9) % 1;
	const d = clamp01(deflate);
	const tipX = 16 + d * 120;
	const tipY = -262 + d * 176;
	return (
		<g>
			{[-1, 1].map((s) => (
				<ellipse key={s} cx={s * 73} cy={8} rx={14} ry={22} fill={SKIN_D} stroke={INK} strokeWidth={lw * 0.8} />
			))}
			<ellipse cx={0} cy={0} rx={74} ry={84} fill={SKIN} stroke={INK} strokeWidth={lw * 1.1} />
			{[-1, 1].map((s) => (
				<path key={`sb${s}`} d="M-74,-28 L-58,-34 L-60,16 L-72,10 Z" transform={`scale(${s} 1)`} fill={FC.hair} />
			))}
			{[-1, 1].map((s) => (
				<circle key={`ck${s}`} cx={s * 45 + lx * 8} cy={30} r={15} fill={FC.cheek} opacity={0.55} />
			))}
			{eyes()}
			<ellipse cx={lx * 18} cy={18} rx={14} ry={12} fill={SKIN_D} stroke={INK} strokeWidth={lw * 0.6} />
			{mouth()}
			{hat === 'cap' ? (
				<g transform={`translate(${lx * 8} 0)`}>
					<path d="M-90,-52 Q-98,-98 -40,-114 Q22,-126 72,-110 Q104,-96 94,-56 Z" fill={FC.cap} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M-80,-66 Q0,-90 86,-68" stroke={FC.capD} strokeWidth={lw * 0.9} fill="none" />
					{[-56, -26, 4, 34, 64].map((x0) => (
						<path key={x0} d={`M${x0},-104 l10,9 l10,-9`} stroke={FC.capD} strokeWidth={5} fill="none" opacity={0.8} />
					))}
					<path d="M-80,-60 Q0,-84 88,-60 Q100,-46 68,-44 Q0,-58 -62,-44 Q-92,-46 -80,-60 Z" fill={FC.capD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				</g>
			) : hat === 'party' ? (
				<g>
					<path
						d={`M-58,-64 Q${-36 + d * 26},${-170 + d * 70} ${tipX},${tipY} Q${44 + d * 66},${-160 + d * 76} 58,-64 Z`}
						fill={mix(PAL.orange, '#9a6a4a', d * 0.6)}
						stroke={INK}
						strokeWidth={lw}
						strokeLinejoin="round"
					/>
					{[0.3, 0.55, 0.78].map((f, i) => (
						<circle key={i} cx={lerp(0, tipX, f) + (i - 1) * 10} cy={lerp(-70, tipY, f)} r={13 * (1 - d * 0.3)} fill={i % 2 ? PAL.teal : PAL.gold} stroke={INK} strokeWidth={lw * 0.5} />
					))}
					<circle cx={tipX} cy={tipY} r={22 * (1 - d * 0.35)} fill="#fff" stroke={INK} strokeWidth={lw * 0.8} />
					<path d="M-74,-30 Q-86,-90 0,-96 Q86,-90 74,-30 Q60,-60 0,-64 Q-60,-60 -74,-30 Z" fill={FC.hair} stroke={INK} strokeWidth={lw * 0.7} />
				</g>
			) : (
				<path d="M-76,-24 Q-84,-100 0,-104 Q84,-100 76,-24 Q66,-58 30,-62 Q0,-50 -30,-62 Q-66,-58 -76,-24 Z" fill={FC.hair} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			)}
			{brows()}
			{sweat ? (
				<g transform={`translate(${-90} ${-36 + sp * 80}) scale(1.4)`} opacity={1 - sp * 0.6}>
					<path d="M0,-22 Q17,2 0,13 Q-17,2 0,-22 Z" fill="#A8DDFF" stroke={INK} strokeWidth={lw * 0.5} />
				</g>
			) : null}
			{mood === 'shock'
				? [-1, 0, 1].map((s) => (
						<path key={`sh${s}`} d={`M${s * 64},${-126 - (s ? 0 : 10)} L${s * 92},${-170 - (s ? 0 : 20)}`} stroke={INK} strokeWidth={fl * 1.1} strokeLinecap="round" opacity={0.6 + 0.4 * Math.abs(Math.sin(t * 14 + s))} />
					))
				: null}
		</g>
	);
};

/** confetti + streamers from a party popper's mouth at (x, y); age in seconds */
const PopBurst: React.FC<{x: number; y: number; age: number; lw: number}> = ({x, y, age, lw}) => {
	if (age < 0 || age > 1.8) return null;
	const o = clamp01((1.8 - age) / 0.5);
	const cols = [PAL.orange, PAL.teal, PAL.gold, '#fff', PAL.stamp];
	return (
		<g opacity={o}>
			{[0, 1, 2, 3, 4].map((i) => {
				const a = -Math.PI / 2 + (i - 2) * 0.32 + 0.25;
				const L = 420 * easeOut(age / 0.5);
				const pts: string[] = [];
				for (let j = 0; j <= 12; j++) {
					const f = j / 12;
					const px = x + Math.cos(a) * L * f + Math.sin(f * 9 + i + age * 6) * 22 * f;
					const py = y + Math.sin(a) * L * f + 300 * age * age * f;
					pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
				}
				return (
					<g key={`st${i}`}>
						<polyline points={pts.join(' ')} fill="none" stroke={INK} strokeWidth={12 + lw * 1.4} strokeLinecap="round" strokeLinejoin="round" />
						<polyline points={pts.join(' ')} fill="none" stroke={cols[i % cols.length]} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
					</g>
				);
			})}
			{Array.from({length: 24}, (_, i) => {
				const a = -Math.PI / 2 + (h1(i * 3.3) - 0.5) * 1.9 + 0.2;
				const sp = 900 + 700 * h1(i * 7.1);
				const tt = Math.min(age, 1.8);
				const px = x + Math.cos(a) * sp * tt * (1 - 0.35 * tt) + Math.sin(tt * 8 + i) * 18;
				const py = y + Math.sin(a) * sp * tt * (1 - 0.35 * tt) + 0.5 * 1500 * tt * tt;
				return <rect key={i} x={px - 11} y={py - 17} width={22} height={34} fill={cols[i % cols.length]} stroke={INK} strokeWidth={lw * 0.5} transform={`rotate(${tt * 540 + i * 37} ${px} ${py})`} />;
			})}
		</g>
	);
};

/** the farmer as an SVG group: feet at (0, 0), ≈ 900 units to the cap */
export const FarmerG: React.FC<FarmerProps> = ({t, pose = 'stand', k = 1, look, mood, hat, deflate = 0, popAge = -1, flip, speed = 1, lw = 8}) => {
	const id = useSid('fm');
	const md = mood ?? MOOD[pose];
	const ht = hat ?? (pose === 'cap' ? 'none' : 'cap');
	const lk = look ?? (pose === 'push' ? 0.7 : pose === 'walk' ? 0.5 : 0);
	const walking = pose === 'walk';
	const ph = t * 5.4 * speed;
	const sw = walking ? Math.sin(ph) * 22 : 0;
	const bob = walking ? -Math.abs(Math.cos(ph)) * 12 : Math.sin(t * 2.3) * 3;
	const sit = pose === 'sit';
	const drop = sit ? 100 + 16 * k : 0;
	const lean = pose === 'push' ? 9 + Math.sin(t * 9) * 1.4 : pose === 'freeze' ? -3 : pose === 'cap' ? 3 + 3 * k : pose === 'arms' ? -2 : pose === 'sit' ? 4 * k : 0;
	const shiver = pose === 'freeze' ? Math.sin(t * 46) * 3 : 0;
	const blink = (t + 0.7) % 3.2 < 0.11;
	const S_L: P2 = [-100, -630];
	const S_R: P2 = [100, -630];
	const kk = clamp01(k);
	const wig = Math.sin(t * 7) * 8;
	const pump = Math.sin(t * 10) * 14;
	const down = (side: -1 | 1): ArmDef => ({S: side < 0 ? S_L : S_R, E: [side * 126, -508], H: [side * 114, -396], hand: 'fist'});
	const lerpArm = (a: ArmDef, b: ArmDef, f: number): ArmDef => ({...b, S: b.S, E: [lerp(a.E[0], b.E[0], f), lerp(a.E[1], b.E[1], f)], H: [lerp(a.H[0], b.H[0], f), lerp(a.H[1], b.H[1], f)]});
	let far: ArmDef | null = null;
	let near: ArmDef[] = [down(-1), down(1)];
	if (walking) near = ([-1, 1] as const).map((s) => {
		const a = down(s);
		const r = -sw * s * 0.8;
		return {...a, E: rotP(a.E, a.S, r), H: rotP(a.H, a.S, r)};
	});
	if (pose === 'push') {
		far = {S: [-40, -628], E: [lerp(80, 150, kk), lerp(-580, -614, kk)], H: [lerp(200, 290, kk), -622], hand: 'palm'};
		near = [{S: S_R, E: [lerp(170, 214, kk), lerp(-566, -604, kk)], H: [lerp(236, 324, kk), -600], hand: 'palm'}];
	}
	if (pose === 'thumbs') near = [{S: S_L, E: [-196, -520], H: [-98, -442], hand: 'fist'}, lerpArm(down(1), {S: S_R, E: [206, -560], H: [204, -770 + wig], hand: 'thumb'}, kk)];
	if (pose === 'popper')
		near = [
			lerpArm(down(-1), {S: S_L, E: [-194, -748], H: [-206, -888 + pump], hand: 'fist'}, kk),
			lerpArm(down(1), {S: S_R, E: [182, -770], H: [204, -920], hand: 'fist'}, kk),
		];
	if (pose === 'arms') near = [{S: S_L, E: [-144, -500], H: [74, -530], hand: 'fist'}, {S: S_R, E: [144, -488], H: [-66, -512], hand: 'fist'}];
	if (pose === 'cap') near = [{S: S_L, E: [-140, -516], H: [-60, -538], hand: 'fist'}, {S: S_R, E: [140, -516], H: [60, -538], hand: 'fist'}];
	if (pose === 'sit') {
		far = {S: [-40, -628], E: [40, -520], H: [146, -436], hand: 'fist'};
		near = [{S: S_R, E: [156, -534], H: [204, -430], hand: 'fist'}];
	}
	if (pose === 'freeze') near = [{S: S_L, E: [-176, -552], H: [-226, -466], hand: 'spread', rot: 18}, {S: S_R, E: [176, -552], H: [226, -466], hand: 'spread', rot: -18}];
	const legRot = (s: -1 | 1) => (walking ? sw * s : pose === 'push' ? (s < 0 ? 24 : -8) : pose === 'arms' || pose === 'freeze' ? -s * 5 : 0);
	const toe = (s: -1 | 1) => (pose === 'push' || walking ? 1 : s);
	const headTilt = pose === 'cap' ? 8 * kk : pose === 'arms' ? -6 : pose === 'sit' ? 6 * kk : pose === 'freeze' ? -4 : 0;
	const torso = 'M-102,-648 Q0,-678 102,-648 L92,-372 L-92,-372 Z';
	const upper = `translate(0 ${drop}) rotate(${lean} 0 -392)`;
	const popTip = rotP([near[1]?.H[0] ?? 0, near[1]?.H[1] ?? 0], [0, 0], 0);
	const capHeld = pose === 'cap';
	return (
		<g transform={flip ? 'scale(-1 1)' : undefined}>
			<ellipse cx={0} cy={0} rx={sit ? 170 : 150} ry={22} fill="rgba(0,0,0,0.28)" />
			<g transform={`translate(${shiver} ${bob})`}>
				{/* legs */}
				{sit
					? (
							<g>
								<Tubes lw={lw} segs={[{pts: [[-20, -334], [150, -326], [156, -190]], w: 86, c: FC.denimD}]} />
								<Boot x={156} toe={1} lw={lw} />
							</g>
						)
					: ([-1, 1] as const).map((s) => (
							<g key={s} transform={`rotate(${legRot(s)} ${s * 44} -392)`}>
								<Tubes lw={lw} segs={[{pts: [[s * 44, -400], [s * 46, -190]], w: 86, c: s < 0 ? FC.denimD : FC.denim}]} />
								<Boot x={s * 46} toe={toe(s)} lw={lw} />
							</g>
						))}
				{/* torso + far arm */}
				<g transform={upper}>
					{far ? (
						<g>
							<ArmTubes a={far} lw={lw} sleeve={FC.shirtD} />
							<Hand a={far} lw={lw} />
						</g>
					) : null}
					<rect x={-26} y={-706} width={52} height={60} fill={SKIN_D} stroke={INK} strokeWidth={lw} />
					<clipPath id={`${id}t`}>
						<path d={torso} />
					</clipPath>
					<path d={torso} fill={FC.shirt} />
					<g clipPath={`url(#${id}t)`} opacity={0.5}>
						{[-72, -32, 8, 48, 88].map((x0) => (
							<line key={`v${x0}`} x1={x0} y1={-690} x2={x0} y2={-360} stroke={FC.check} strokeWidth={10} />
						))}
						{[-624, -574, -524, -474, -424].map((y0) => (
							<line key={`h${y0}`} x1={-110} y1={y0} x2={110} y2={y0} stroke={FC.check} strokeWidth={10} />
						))}
					</g>
					<path d={torso} fill="none" stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<path d="M-44,-668 L-4,-628 L-20,-610 Z M44,-668 L4,-628 L20,-610 Z" fill={FC.shirtD} stroke={INK} strokeWidth={lw * 0.6} strokeLinejoin="round" />
					<path d="M-96,-432 L96,-432 L100,-360 L-100,-360 Z" fill={FC.denim} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
					<rect x={-66} y={-570} width={132} height={146} rx={8} fill={FC.denim} stroke={INK} strokeWidth={lw} />
					<rect x={-34} y={-540} width={68} height={54} rx={6} fill={FC.denimD} stroke={INK} strokeWidth={lw * 0.6} />
					<Tubes lw={lw * 0.8} segs={[{pts: [[-54, -560], [-80, -652]], w: 26, c: FC.denim}, {pts: [[54, -560], [80, -652]], w: 26, c: FC.denim}]} />
					{[-1, 1].map((s) => (
						<circle key={s} cx={s * 52} cy={-556} r={10} fill={PAL.gold} stroke={INK} strokeWidth={lw * 0.5} />
					))}
				</g>
				{/* sitting: the near leg over the lap */}
				{sit ? (
					<g>
						<Tubes lw={lw} segs={[{pts: [[20, -330], [204, -318], [210, -190]], w: 88, c: FC.denim}]} />
						<Boot x={210} toe={1} lw={lw} />
					</g>
				) : null}
				{/* head, near arms, props */}
				<g transform={upper}>
					<g transform={`translate(0 -774) rotate(${headTilt} 0 60)`}>
						<FarmerHead mood={md} look={lk} hat={ht} deflate={deflate} lw={lw} t={t} blink={blink && md !== 'shock'} sweat={pose === 'freeze'} />
					</g>
					{near.map((a, i) => (
						<ArmTubes key={i} a={a} lw={lw} sleeve={i === 0 && near.length > 1 ? FC.shirtD : FC.shirt} />
					))}
					{capHeld ? (
						<g transform="translate(0 -520) rotate(-9)">
							<path d="M-74,26 Q0,84 74,26 Q66,6 0,8 Q-66,6 -74,26 Z" fill={FC.capD} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
							<ellipse cx={0} cy={-6} rx={114} ry={48} fill={FC.cap} stroke={INK} strokeWidth={lw} />
							<path d="M-84,-2 Q0,-34 84,-2" stroke={FC.capD} strokeWidth={lw * 0.9} fill="none" />
							{[-60, -26, 8, 42].map((x0) => (
								<path key={x0} d={`M${x0},-30 l10,9 l10,-9`} stroke={FC.capD} strokeWidth={5} fill="none" opacity={0.8} />
							))}
						</g>
					) : null}
					{pose === 'popper' ? (
						<g>
							<path
								d={`M${popTip[0] - 10},${popTip[1] + 20} L${popTip[0] + 28},${popTip[1] - 4} L${popTip[0] + 120},${popTip[1] - 150} L${popTip[0] + 30},${popTip[1] - 184} Z`}
								fill={PAL.gold}
								stroke={INK}
								strokeWidth={lw}
								strokeLinejoin="round"
							/>
							<path d={`M${popTip[0] + 14},${popTip[1] - 60} L${popTip[0] + 62},${popTip[1] - 78} M${popTip[0] + 24},${popTip[1] - 112} L${popTip[0] + 90},${popTip[1] - 136}`} stroke={PAL.orange} strokeWidth={18} />
							<ellipse cx={popTip[0] + 75} cy={popTip[1] - 167} rx={48} ry={18} transform={`rotate(-20 ${popTip[0] + 75} ${popTip[1] - 167})`} fill="#5A3A20" stroke={INK} strokeWidth={lw * 0.8} />
							<PopBurst x={popTip[0] + 75} y={popTip[1] - 170} age={popAge} lw={lw} />
						</g>
					) : null}
					{near.map((a, i) => (
						<Hand key={`h${i}`} a={a} lw={lw} />
					))}
				</g>
			</g>
		</g>
	);
};

/** the farmer placed in px: feet at (x, y); s = 0.4 → 360 px tall */
export const Farmer: React.FC<FarmerProps & {x: number; y: number; s?: number}> = ({x, y, s = 0.4, lw, ...p}) => (
	<svg width={1000 * s} height={1400 * s} viewBox="-500 -1300 1000 1400" style={{position: 'absolute', left: x - 500 * s, top: y - 1300 * s, overflow: 'visible'}}>
		<FarmerG {...p} lw={lw ?? lwFor(s)} />
	</svg>
);

// ───────────────────────────── Bale ─────────────────────────────

export type BaleGProps = {cx?: number; cy?: number; w?: number; h?: number; rot?: number; sc?: number; sq?: number; seed?: number; t?: number; lw?: number; ghost?: boolean; o?: number; stalks?: boolean};

/** one straw bale (front = the long side): flakes, top light, twine bands, stray stalks. Centre (cx, cy); sq = landing squash */
export const BaleG: React.FC<BaleGProps> = ({cx = 0, cy = 0, w = BW, h = BH, rot = 0, sc = 1, sq = 0, seed = 1, t = 0, lw = 10, ghost, o = 1, stalks = true}) => {
	const r = h * 0.14;
	const tr = `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${(sc * (1 + sq * 0.5)).toFixed(3)} ${(sc * (1 - sq)).toFixed(3)})`;
	const tw = [-0.27, 0.27];
	if (ghost)
		return (
			<g transform={tr} opacity={o}>
				<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill="rgba(150,235,255,0.10)" stroke="#BFF6FF" strokeWidth={lw * 0.7} />
				{tw.map((f) => (
					<line key={f} x1={f * w} y1={-h / 2} x2={f * w} y2={h / 2} stroke="#BFF6FF" strokeWidth={lw * 0.5} strokeDasharray={`${lw * 2} ${lw * 1.6}`} opacity={0.8} />
				))}
			</g>
		);
	return (
		<g transform={tr} opacity={o}>
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill={HAY.straw} />
			<rect x={-w / 2 + lw * 0.5} y={-h / 2 + lw * 0.5} width={w - lw} height={h * 0.22} rx={r * 0.8} fill={HAY.strawL} />
			<rect x={-w / 2 + lw * 0.5} y={h / 2 - h * 0.2} width={w - lw} height={h * 0.2 - lw * 0.5} rx={r * 0.8} fill={HAY.strawD} opacity={0.45} />
			{Array.from({length: 8}, (_, i) => {
				const x0 = -w / 2 + ((i + 1) * w) / 9 + (h1(seed + i) - 0.5) * w * 0.03;
				return <path key={i} d={`M${x0.toFixed(1)},${(-h / 2 + h * 0.24).toFixed(1)} Q${(x0 + 10).toFixed(1)},0 ${(x0 - 5).toFixed(1)},${(h / 2 - lw).toFixed(1)}`} stroke={HAY.strawD} strokeWidth={lw * 0.45} fill="none" opacity={0.8} />;
			})}
			{Array.from({length: 7}, (_, i) => {
				const x0 = (h1(seed * 3 + i * 1.3) - 0.5) * w * 0.86;
				const y0 = (h1(seed * 5 + i * 2.1) - 0.3) * h * 0.6;
				const a = (h1(seed * 7 + i) - 0.5) * 40;
				return <line key={`d${i}`} x1={x0} y1={y0} x2={x0 + Math.cos((a * Math.PI) / 180) * w * 0.07} y2={y0 + Math.sin((a * Math.PI) / 180) * w * 0.07} stroke={i % 2 ? HAY.strawL : HAY.strawD} strokeWidth={lw * 0.4} strokeLinecap="round" />;
			})}
			{tw.map((f) => (
				<g key={f}>
					<line x1={f * w} y1={-h / 2} x2={f * w} y2={h / 2} stroke={INK} strokeWidth={lw * 1.5} />
					<line x1={f * w} y1={-h / 2} x2={f * w} y2={h / 2} stroke={HAY.twine} strokeWidth={lw * 0.7} />
				</g>
			))}
			{(stalks ? [-0.38, -0.08, 0.16, 0.42] : []).map((f, i) => {
				const a = -90 + (h1(seed + i * 9) - 0.5) * 70 + Math.sin(t * 3 + i + seed) * 7;
				const L = h * (0.1 + 0.06 * h1(seed * 2 + i));
				const x0 = f * w;
				const y0 = -h / 2 + lw * 0.3;
				const x1 = x0 + Math.cos((a * Math.PI) / 180) * L;
				const y1 = y0 + Math.sin((a * Math.PI) / 180) * L;
				return (
					<g key={`s${i}`}>
						<line x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={lw * 1.1} strokeLinecap="round" />
						<line x1={x0} y1={y0} x2={x1} y2={y1} stroke={HAY.strawL} strokeWidth={lw * 0.45} strokeLinecap="round" />
					</g>
				);
			})}
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill="none" stroke={INK} strokeWidth={lw} />
		</g>
	);
};

/** one bale placed in px: (x, y) = bottom centre (on the ground) */
export const Bale: React.FC<Omit<BaleGProps, 'cx' | 'cy'> & {x: number; y: number; s?: number}> = ({x, y, s = 0.5, lw, ...p}) => (
	<svg width={1000 * s} height={800 * s} viewBox="-500 -600 1000 800" style={{position: 'absolute', left: x - 500 * s, top: y - 600 * s, overflow: 'visible'}}>
		<ellipse cx={0} cy={4} rx={BW * 0.55} ry={28} fill="rgba(0,0,0,0.25)" />
		<BaleG cx={0} cy={-BH / 2} {...p} lw={lw ?? lwFor(s)} />
	</svg>
);

// ───────────────────────────── Cannon ─────────────────────────────

export type CannonProps = {
	/** 0..1 rolls forward rollDist units (wheel turns) */
	roll?: number;
	rollDist?: number;
	/** seconds since a smoke puff at the muzzle (no shot, no flash) */
	puffAge?: number;
	/** barrel elevation, degrees */
	elev?: number;
	lw?: number;
};
/** muzzle position of CannonG (before roll) */
export const cannonTip = (elev = 7): P2 => [40 + Math.cos((-elev * Math.PI) / 180) * 380, -250 + Math.sin((-elev * Math.PI) / 180) * 380];

/** a black iron cannon on a wooden carriage, side view, facing right; (0, 0) = under the wheel */
export const CannonG: React.FC<CannonProps> = ({roll = 0, rollDist = 160, puffAge = -1, elev = 7, lw = 8}) => {
	const dx = easeInOut(roll) * rollDist;
	const wr = 112;
	const spin = ((dx / wr) * 180) / Math.PI;
	const [tx, ty] = cannonTip(elev);
	return (
		<g transform={`translate(${dx} 0)`}>
			<ellipse cx={-40} cy={0} rx={300} ry={26} fill="rgba(0,0,0,0.25)" />
			<path d="M-340,-16 L-310,-62 L60,-236 L132,-214 L124,-150 L-306,8 Z" fill={HAY.wood} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d="M-300,-40 L80,-210" stroke={HAY.woodL} strokeWidth={10} strokeLinecap="round" opacity={0.7} />
			{[-220, -90, 30].map((x0, i) => (
				<circle key={i} cx={x0} cy={-60 - (x0 + 300) * 0.43} r={11} fill={HAY.iron} />
			))}
			<g transform={`translate(40 -250) rotate(${-elev})`}>
				<circle cx={-292} cy={0} r={28} fill={HAY.iron} stroke={INK} strokeWidth={lw} />
				<rect x={-292} y={-14} width={50} height={28} fill={HAY.iron} />
				<path d="M-236,-64 L330,-46 L330,46 L-236,64 Q-268,64 -268,0 Q-268,-64 -236,-64 Z" fill={HAY.iron} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
				<rect x={-180} y={-74} width={36} height={148} rx={8} fill={HAY.iron} stroke={INK} strokeWidth={lw} />
				<rect x={80} y={-58} width={30} height={116} rx={8} fill={HAY.iron} stroke={INK} strokeWidth={lw} />
				<rect x={318} y={-60} width={58} height={120} rx={14} fill={HAY.iron} stroke={INK} strokeWidth={lw} />
				<path d="M-226,-40 L322,-28" stroke={HAY.ironL} strokeWidth={14} strokeLinecap="round" />
				<circle cx={0} cy={0} r={22} fill="#15151b" />
			</g>
			<g transform={`translate(0 ${-wr}) rotate(${spin})`}>
				<circle r={wr} fill={HAY.wood} stroke={INK} strokeWidth={lw} />
				{Array.from({length: 8}, (_, i) => {
					const a = (i / 8) * Math.PI * 2;
					return <line key={i} x1={Math.cos(a) * 26} y1={Math.sin(a) * 26} x2={Math.cos(a) * (wr - 16)} y2={Math.sin(a) * (wr - 16)} stroke={HAY.woodD} strokeWidth={16} />;
				})}
				<circle r={wr - 9} fill="none" stroke={HAY.iron} strokeWidth={18} />
				<circle r={wr} fill="none" stroke={INK} strokeWidth={lw} />
				<circle r={30} fill={HAY.iron} stroke={INK} strokeWidth={lw * 0.8} />
			</g>
			<StrawDustG x={tx + 30} y={ty} age={puffAge} tone="smoke" dir={0.9} size={1.3} n={6} life={1.5} lw={lw} seed={5} />
		</g>
	);
};

export const Cannon: React.FC<CannonProps & {x: number; y: number; s?: number; flip?: boolean}> = ({x, y, s = 0.5, flip, lw, ...p}) => (
	<svg width={1200 * s} height={900 * s} viewBox="-600 -700 1200 900" style={{position: 'absolute', left: x - 600 * s, top: y - 700 * s, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
		<CannonG {...p} lw={lw ?? lwFor(s)} />
	</svg>
);

export type MuzzleProps = {
	/** offset of the muzzle ring from the barrel's back end (units): where it points; default down-right = at the road / viewer */
	aim?: P2;
	/** ring radius */
	r?: number;
	/** 0..1 how far it pokes out */
	poke?: number;
	lw?: number;
};
/** only the cannon's muzzle, aimed at the viewer (front 3/4): poking out of the gap in the bales. (0, 0) = back end of the barrel */
export const CannonMuzzleG: React.FC<MuzzleProps> = ({aim = [70, 40], r = 104, poke = 1, lw = 8}) => {
	const fx = aim[0] * poke;
	const fy = aim[1] * poke;
	return (
		<g>
			<Tubes lw={lw} segs={[{pts: [[0, 0], [fx, fy]], w: r * 1.62, c: HAY.iron}]} />
			<ellipse cx={fx * 0.45} cy={fy * 0.45} rx={r * 0.93} ry={r * 0.9} fill={HAY.iron} stroke={INK} strokeWidth={lw} />
			<circle cx={fx} cy={fy} r={r} fill={HAY.iron} stroke={INK} strokeWidth={lw * 1.1} />
			<path d={`M${fx - r * 0.78},${fy - r * 0.2} A${r * 0.8},${r * 0.8} 0 0 1 ${fx + r * 0.2},${fy - r * 0.78}`} stroke={HAY.ironL} strokeWidth={r * 0.14} fill="none" strokeLinecap="round" />
			<circle cx={fx + r * 0.04} cy={fy + r * 0.04} r={r * 0.6} fill="#06060A" stroke={INK} strokeWidth={lw * 0.8} />
			<ellipse cx={fx + r * 0.15} cy={fy + r * 0.2} rx={r * 0.3} ry={r * 0.24} fill="#000" />
		</g>
	);
};

export const CannonMuzzle: React.FC<MuzzleProps & {x: number; y: number; s?: number}> = ({x, y, s = 0.5, lw, ...p}) => (
	<svg width={600 * s} height={600 * s} viewBox="-300 -300 600 600" style={{position: 'absolute', left: x - 300 * s, top: y - 300 * s, overflow: 'visible'}}>
		<CannonMuzzleG {...p} lw={lw ?? lwFor(s)} />
	</svg>
);

// ───────────────────────────── Ladder ─────────────────────────────

/** the ladder's sway (degrees) at time t */
export const ladderSway = (t: number, sway = 1) => (Math.sin(t * 2.6) * 2.4 + Math.sin(t * 6.1 + 1) * 0.8) * sway;

export type LadderProps = {
	t: number;
	/** length along the rails */
	h?: number;
	/** lean of the top to the right, degrees (negative = to the left) */
	lean?: number;
	/** sway amplitude (1 ≈ ±3°) */
	sway?: number;
	rungGap?: number;
	/** drawn upright at `riderAt` units up the ladder, swaying with it (a FarmerG in world units, feet at 0, 0) */
	rider?: React.ReactNode;
	riderAt?: number;
	/** sideways offset of the rider (leaning out to reach) */
	riderDx?: number;
	lw?: number;
};
/** where the rider stands (ladder foot = 0, 0) */
export const ladderPoint = (t: number, at: number, lean = 9, sway = 1): P2 => {
	const a = ((lean + ladderSway(t, sway)) * Math.PI) / 180;
	return [Math.sin(a) * at, -Math.cos(a) * at];
};

/** a wooden ladder leaning against the wall, swaying; (0, 0) = its feet */
export const LadderG: React.FC<LadderProps> = ({t, h = 3000, lean = 9, sway = 1, rungGap = 300, rider, riderAt, riderDx = 0, lw = 8}) => {
	const sa = ladderSway(t, sway);
	const ang = lean + sa;
	const n = Math.floor((h - 60) / rungGap);
	const wB = 150;
	const wT = 116;
	const at = riderAt ?? Math.max(rungGap, (n - 3) * rungGap);
	const [px, py] = ladderPoint(t, at, lean, sway);
	return (
		<g>
			<ellipse cx={0} cy={6} rx={240} ry={24} fill="rgba(0,0,0,0.25)" />
			<g transform={`rotate(${ang.toFixed(2)})`}>
				<Tubes lw={lw} cap="butt" segs={Array.from({length: n}, (_, i) => {
					const y = -(i + 1) * rungGap;
					const hw = lerp(wB, wT, -y / h);
					return {pts: [[-hw, y], [hw, y]] as P2[], w: 26, c: HAY.woodL};
				})} />
				<Tubes lw={lw} cap="butt" segs={[{pts: [[-wB, 0], [-wT, -h]], w: 42, c: HAY.wood}, {pts: [[wB, 0], [wT, -h]], w: 42, c: HAY.wood}]} />
				{[-1, 1].map((s) => (
					<rect key={s} x={s * wB - 26} y={-18} width={52} height={28} rx={8} fill="#2a2a2a" stroke={INK} strokeWidth={lw * 0.7} />
				))}
			</g>
			{rider ? <g transform={`translate(${(px + riderDx).toFixed(1)} ${py.toFixed(1)}) rotate(${(sa * 0.9).toFixed(2)})`}>{rider}</g> : null}
		</g>
	);
};

export const Ladder: React.FC<LadderProps & {x: number; y: number; s?: number}> = ({x, y, s = 0.25, lw, ...p}) => (
	<svg width={2000 * s} height={4400 * s} viewBox="-1000 -4200 2000 4400" style={{position: 'absolute', left: x - 1000 * s, top: y - 4200 * s, overflow: 'visible'}}>
		<LadderG {...p} lw={lw ?? lwFor(s)} />
	</svg>
);

// ───────────────────────────── BaleWall ─────────────────────────────

type Cell = {c: number; r: number; i: number; cx: number; cy: number; rot: number; w: number; seed: number};

/** centre of bale (c, r) in wall units (r = 0 bottom row; odd rows have cols − 1 bales, shifted half a bale) */
export const wallCell = (c: number, r: number, cols = 6): P2 => [-(cols * BW) / 2 + BW / 2 + c * BW + (r % 2 ? BW / 2 : 0), -(r + 0.5) * BH];
/** wall size in units */
export const wallSize = (cols = 6, rows = 11) => ({w: cols * BW, h: rows * BH});

const makeCells = (cols: number, rows: number, gap?: [number, number] | null): Cell[] => {
	const out: Cell[] = [];
	let i = 0;
	for (let r = 0; r < rows; r++) {
		const n = r % 2 ? cols - 1 : cols;
		for (let c = 0; c < n; c++) {
			if (gap && gap[0] === c && gap[1] === r) continue;
			const seed = r * 31 + c * 7 + 1;
			const [cx, cy] = wallCell(c, r, cols);
			out.push({c, r, i: i++, cx: cx + (h1(seed) - 0.5) * 22, cy: cy + (h1(seed * 1.3) - 0.5) * 8, rot: (h1(seed * 2.1) - 0.5) * 2.4, w: BW * (0.965 + 0.035 * h1(seed * 3.3)), seed});
		}
	}
	return out;
};

export type BaleWallProps = {
	t: number;
	cols?: number;
	rows?: number;
	/** 0..1 bales drop in one by one (bottom row first) with a thump squash and a straw puff on landing; let it run past 1
	 *  (≈ 1.3) so the last puffs finish — exactly 1 (default) = the finished wall, no puffs */
	build?: number;
	/** seconds the scene spends on build 0→1 (for the puffs' age) */
	buildDur?: number;
	/** [col, row] of the missing bale; the castle shows through it */
	gap?: [number, number] | null;
	/** what shows in the gap: stone battlement + cannon muzzle (default), battlement only, or nothing (use `behind`) */
	gapShow?: 'muzzle' | 'battlement' | 'none';
	muzzleAim?: P2;
	/** 0..1 the last bale shoved into the gap (from ramFrom, slightly bigger = in front, thumps in at 1) */
	ram?: number;
	ramFrom?: P2;
	/** 0..1 blue tarp unrolled over the top (1 = on) */
	tarp?: number;
	/** 0..1 the tarp whips off to the right */
	tarpOff?: number;
	/** 0..1 x-ray wipe (left → right): bales turn into see-through ghosts, `behind` shows */
	xray?: number;
	/** drawn behind the bales in wall units (origin = wall base centre), e.g. <CastleG …/> */
	behind?: React.ReactNode;
	/** drawn on top in wall units, e.g. <LadderG rider={<FarmerG …/>} /> */
	front?: React.ReactNode;
	/** 0..1 domino fall: bales tip and tumble forward, left → right, top first, a straw puff where each lands; let it run past
	 *  1 (≈ 1.5) so the last puffs finish — exactly 1 = the fallen heap at rest, no puffs */
	topple?: number;
	toppleDur?: number;
	/** 0..1 the fallen bales fly back up into the wall (after topple = 1) with motion ghosts */
	rewind?: number;
	/** extra straw puffs at cells (e.g. the ram thump): age in s */
	puffs?: {c: number; r: number; age: number; size?: number}[];
	lw?: number;
};

type Pose = {x: number; y: number; rot: number; sc: number};

/** a house-high wall of stacked straw bales in wall units: (0, 0) = base centre, 3840 × 3520 by default */
export const BaleWallG: React.FC<BaleWallProps> = ({t, cols = 6, rows = 11, build = 1, buildDur = 2.4, gap = null, gapShow = 'muzzle', muzzleAim, ram, ramFrom, tarp = 0, tarpOff = 0, xray = 0, behind, front, topple = 0, toppleDur = 1.8, rewind = 0, puffs, lw = 12}) => {
	const id = useSid('bw');
	const cells = makeCells(cols, rows, gap);
	const N = cells.length;
	const W2 = (cols * BW) / 2;
	const top = -rows * BH;
	const L = 2.6;
	const D = 0.33;
	const dust: React.ReactNode[] = [];
	const standing: React.ReactNode[] = [];
	const ghosts: React.ReactNode[] = [];
	const moving: {r: number; node: React.ReactNode}[] = [];

	const toppled = (cell: Cell, q: number): Pose => {
		const nr = cell.r / Math.max(1, rows - 1);
		const xf = cell.cx + BW * (0.2 + 0.55 * h1(cell.seed * 5.1)) + nr * 140;
		const yf = BH * (0.15 + 2.1 * nr + 0.4 * h1(cell.seed * 7.3)) - BH * 0.5;
		const rf = (h1(cell.seed * 9.7) - 0.5) * 60 + 12;
		const sf = 1 + 0.22 * nr;
		const qa = clamp01(q / 0.3);
		const qb = clamp01((q - 0.3) / 0.7);
		const tip = 16 * easeIn(qa);
		const [ax, ay] = rotP([cell.cx, cell.cy], [cell.cx + cell.w / 2, cell.cy + BH / 2], tip);
		return {x: lerp(ax, xf, qb), y: ay + (yf - ay) * qb * qb, rot: lerp(cell.rot + tip, rf, qb), sc: lerp(1, sf, qb)};
	};

	for (const cell of cells) {
		const nx = (cell.cx + W2) / (2 * W2);
		const nr = cell.r / Math.max(1, rows - 1);
		if (rewind > 0) {
			const d = (1 - nx) * 0.55 + nr * 0.12;
			const qr = clamp01((rewind - d) / D);
			const q = 1 - easeInOut(qr);
			const p = toppled(cell, q);
			if (qr > 0 && qr < 1) {
				[0.16, 0.08].forEach((dq, j) => {
					const g = toppled(cell, Math.min(1, q + dq));
					moving.push({r: cell.r - 0.5, node: <BaleG key={`tr${cell.i}${j}`} cx={g.x} cy={g.y} rot={g.rot} sc={g.sc} seed={cell.seed} w={cell.w} lw={lw} t={t} o={0.22 + j * 0.16} stalks={false} />});
				});
			}
			const node = <BaleG key={`b${cell.i}`} cx={p.x} cy={p.y} rot={p.rot} sc={p.sc} seed={cell.seed} w={cell.w} lw={lw} t={t} stalks={cell.r === rows - 1 || q > 0} />;
			if (q <= 0) standing.push(node);
			else moving.push({r: cell.r, node});
			continue;
		}
		if (topple > 0) {
			const d = nx * 0.55 + (1 - nr) * 0.12;
			const q = clamp01((topple - d) / D);
			const p = toppled(cell, q);
			const la = (topple - d - D) * toppleDur;
			const sq = la > 0 && la < 0.16 ? 0.12 * Math.sin((la / 0.16) * Math.PI) : 0;
			const node = <BaleG key={`b${cell.i}`} cx={p.x} cy={p.y} rot={p.rot} sc={p.sc} sq={sq} seed={cell.seed} w={cell.w} lw={lw} t={t} stalks={cell.r === rows - 1 || q > 0} />;
			if (q <= 0) standing.push(node);
			else moving.push({r: cell.r, node});
			if (topple !== 1 && la > 0 && cell.i % 6 === 1) dust.push(<StrawDustG key={`d${cell.i}`} x={p.x} y={p.y + BH * 0.45 * p.sc} age={la} size={1.7} n={4} seed={cell.seed} life={0.8} lw={lw} bits={4} />);
			continue;
		}
		const u = build * (N + L) - cell.i;
		const q = clamp01(u / L);
		if (q <= 0) continue;
		const la = ((u - L) / (N + L)) * buildDur;
		const sq = la > 0 && la < 0.16 ? 0.14 * Math.sin((la / 0.16) * Math.PI) : 0;
		const yOff = -(1 - q * q) * BH * 4.2;
		const node = <BaleG key={`b${cell.i}`} cx={cell.cx} cy={cell.cy + yOff} rot={cell.rot + (1 - q) * 8 * (h1(cell.seed) - 0.5)} sq={sq} seed={cell.seed} w={cell.w} lw={lw} t={t} o={clamp01(q * 5)} stalks={cell.r === rows - 1} />;
		standing.push(node);
		if (xray > 0) ghosts.push(<BaleG key={`g${cell.i}`} cx={cell.cx} cy={cell.cy + yOff} rot={cell.rot} seed={cell.seed} w={cell.w} lw={lw} ghost />);
		if (build !== 1 && la > 0 && la < 0.6 && cell.i % 3 === 0) dust.push(<StrawDustG key={`d${cell.i}`} x={cell.cx} y={cell.cy + BH * 0.5} age={la} size={1.2} n={4} seed={cell.seed} life={0.6} lw={lw} bits={4} />);
	}
	moving.sort((a, b) => a.r - b.r);

	// gap: what is behind it, the muzzle, the bale shoved in
	const [gx, gy] = gap ? wallCell(gap[0], gap[1], cols) : [0, 0];
	const gapBack = gap && gapShow !== 'none' ? (
		<g>
			<rect x={gx - BW / 2 - 10} y={gy - BH / 2 - 10} width={BW + 20} height={BH + 20} fill="#17110C" />
			<path
				d={`M${gx - BW / 2 - 10},${gy + BH / 2 + 10} L${gx - BW / 2 - 10},${gy - BH * 0.12} L${gx - BW * 0.18},${gy - BH * 0.12} L${gx - BW * 0.18},${gy + BH * 0.16} L${gx + BW * 0.18},${gy + BH * 0.16} L${gx + BW * 0.18},${gy - BH * 0.12} L${gx + BW / 2 + 10},${gy - BH * 0.12} L${gx + BW / 2 + 10},${gy + BH / 2 + 10} Z`}
				fill={HAY.stone}
				stroke={INK}
				strokeWidth={lw}
				strokeLinejoin="round"
			/>
			{[-0.42, -0.3, 0.3, 0.42].map((f) => (
				<line key={f} x1={gx + f * BW} y1={gy - BH * 0.12} x2={gx + f * BW} y2={gy + BH * 0.2} stroke={HAY.stoneD} strokeWidth={lw * 0.6} />
			))}
			<line x1={gx - BW / 2} y1={gy + BH * 0.2} x2={gx + BW / 2} y2={gy + BH * 0.2} stroke={HAY.stoneD} strokeWidth={lw * 0.6} />
			<rect x={gx - BW / 2 - 10} y={gy - BH / 2 - 10} width={BW + 20} height={BH * 0.22} fill="rgba(0,0,0,0.45)" />
		</g>
	) : null;
	const muzzle = gap && gapShow === 'muzzle' ? (
		<g transform={`translate(${gx + BW * 0.02} ${gy + BH * 0.02})`}>
			<CannonMuzzleG aim={muzzleAim ?? [96, 74]} r={BH * 0.42} lw={lw} />
		</g>
	) : null;
	let ramNode: React.ReactNode = null;
	if (gap && ram !== undefined) {
		const e = Math.pow(clamp01(ram), 1.7);
		const [fx, fy] = ramFrom ?? [-BW * 0.85, -BH * 0.1];
		ramNode = <BaleG cx={gx + fx * (1 - e)} cy={gy + fy * (1 - e)} rot={-5 * (1 - e)} sc={lerp(1.12, 1, e)} seed={777} lw={lw} t={t} />;
	}

	// tarp
	const topRow = rows - 1;
	const nbTop = topRow % 2 ? cols - 1 : cols;
	const half = (nbTop * BW) / 2;
	const hem = top + BH * 1.22;
	const off = clamp01(tarpOff);
	const amp = 1 + off * 4;
	const wv = (x: number) => (Math.sin(x * 0.011 + t * 4.2) * 16 + Math.sin(x * 0.027 - t * 6.3) * 9) * amp + (x > half - 420 ? ((x - (half - 420)) / 420) * (-36 + Math.sin(t * 5.2) * 28) : 0);
	let tarpD = `M${-half - 36},${hem + wv(-half)} L${-half - 30},${top + 34}`;
	for (let j = 0; j < nbTop; j++) {
		const x0 = -half + j * BW;
		const last = j === nbTop - 1;
		tarpD += ` Q${x0 + BW / 2},${top - 50} ${x0 + BW + (last ? 30 : 0)},${top + (last ? 34 : 6)}`;
	}
	tarpD += ` L${half + 36},${hem + wv(half)}`;
	const scal = (x: number) => -46 * Math.sin(Math.PI * ((((x + half) / BW) % 1) + 1) % 1);
	for (let x = half - 40; x > -half; x -= 40) tarpD += ` L${x.toFixed(1)},${(hem + wv(x) + scal(x)).toFixed(1)}`;
	tarpD += ' Z';
	const tarpTr = off > 0 ? `translate(${off * off * 3400} ${-off * 1700}) rotate(${off * 30} ${half} ${top})` : undefined;
	const tarpSolid = tarp > 0 ? (
		<g transform={tarpTr} clipPath={tarp < 1 ? `url(#${id}tc)` : undefined}>
			<path d={tarpD} fill={HAY.tarp} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			{Array.from({length: nbTop + 1}, (_, j) => {
				const x = -half + j * BW + (j === 0 ? 40 : j === nbTop ? -40 : 0);
				const y = hem + wv(x) - 20;
				return (
					<g key={`f${j}`} opacity={0.75} fill="none" stroke={HAY.tarpD} strokeWidth={lw * 1.3} strokeLinecap="round">
						{j < nbTop ? <path d={`M${x + 20},${y} Q${x + BW * 0.2},${top + BH * 0.5} ${x + BW * 0.36},${top + 10}`} /> : null}
						{j > 0 ? <path d={`M${x - 20},${y} Q${x - BW * 0.2},${top + BH * 0.5} ${x - BW * 0.36},${top + 10}`} /> : null}
					</g>
				);
			})}
			{Array.from({length: nbTop}, (_, j) => {
				const x0 = -half + j * BW;
				return <path key={`hl${j}`} d={`M${x0 + 90},${top + 4} Q${x0 + BW / 2},${top - 30} ${x0 + BW - 140},${top - 4}`} stroke={HAY.tarpL} strokeWidth={lw * 1.6} fill="none" strokeLinecap="round" opacity={0.8} />;
			})}
			{Array.from({length: nbTop + 1}, (_, j) => {
				const x = -half + j * BW + (j === 0 ? 40 : j === nbTop ? -40 : 0);
				const y = hem + wv(x) - 26;
				const sw = Math.sin(t * 3.1 + j) * 22 * amp;
				return (
					<g key={`r${j}`}>
						<Tubes lw={lw * 0.6} segs={[{pts: [[x, y], [x + sw * 0.5, y + 80], [x + sw, y + 170]], w: lw * 0.8, c: '#EADCAA'}]} />
						<circle cx={x} cy={y} r={15} fill="#E8E8EE" stroke={INK} strokeWidth={lw * 0.6} />
					</g>
				);
			})}
		</g>
	) : null;
	const tarpGhost = tarp > 0 && xray > 0 ? <path d={tarpD} transform={tarpTr} fill="rgba(150,235,255,0.08)" stroke="#BFF6FF" strokeWidth={lw * 0.7} /> : null;

	const xs = lerp(-W2 - 300, W2 + 300, easeInOut(xray));
	const cut = xray > 0;
	return (
		<g>
			<defs>
				<clipPath id={`${id}r`}>
					<rect x={xs} y={top - 3000} width={W2 * 2 + 6000} height={-top + 6000} />
				</clipPath>
				<clipPath id={`${id}l`}>
					<rect x={xs - W2 * 2 - 6000} y={top - 3000} width={W2 * 2 + 6000} height={-top + 6000} />
				</clipPath>
				<clipPath id={`${id}tc`}>
					<rect x={-half - 200} y={top - 600} width={(half + 100) * 2 * clamp01(tarp) + 100} height={BH * 3} />
				</clipPath>
				<linearGradient id={`${id}sc`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#7FF3FF" stopOpacity="0" />
					<stop offset="0.5" stopColor="#7FF3FF" stopOpacity="0.55" />
					<stop offset="1" stopColor="#7FF3FF" stopOpacity="0" />
				</linearGradient>
			</defs>
			{behind}
			{gapBack}
			<g clipPath={cut ? `url(#${id}r)` : undefined}>{standing}</g>
			{cut ? <g clipPath={`url(#${id}l)`}>{ghosts}</g> : null}
			{muzzle}
			{ramNode}
			{cut ? (
				<>
					<g clipPath={`url(#${id}r)`}>{tarpSolid}</g>
					<g clipPath={`url(#${id}l)`}>{tarpGhost}</g>
				</>
			) : (
				tarpSolid
			)}
			{moving.map((m) => m.node)}
			{dust}
			{(puffs ?? []).map((p, i) => {
				const [px, py] = wallCell(p.c, p.r, cols);
				return <StrawDustG key={`p${i}`} x={px} y={py + BH * 0.3} age={p.age} size={p.size ?? 2.4} n={7} seed={i * 5 + 3} life={1.1} lw={lw} bits={10} />;
			})}
			{cut && xray < 1 ? (
				<g>
					<rect x={xs - 110} y={top - 400} width={220} height={-top + 520} fill={`url(#${id}sc)`} />
					<line x1={xs} y1={top - 400} x2={xs} y2={120} stroke="#E8FFFF" strokeWidth={lw * 1.2} />
				</g>
			) : null}
			{front}
		</g>
	);
};

export const BaleWall: React.FC<BaleWallProps & {x: number; y: number; s?: number}> = ({x, y, s = 0.2, lw, ...p}) => {
	const cols = p.cols ?? 6;
	const rows = p.rows ?? 11;
	const W2 = (cols * BW) / 2 + 2400;
	const H = rows * BH + 1800;
	return (
		<svg width={W2 * 2 * s} height={(H + 1400) * s} viewBox={`${-W2} ${-H} ${W2 * 2} ${H + 1400}`} style={{position: 'absolute', left: x - W2 * s, top: y - H * s, overflow: 'visible'}}>
			<BaleWallG {...p} lw={lw ?? lwFor(s)} />
		</svg>
	);
};

// ───────────────────────────── Castle ─────────────────────────────

/** castle layout (units, y up = negative): tower centres ±TX, radius TR; house half width HW */
export const CASTLE = {TX: 1270, TR: 260, towerTop: 2500, bandTop: 2600, merlonTop: 2850, HW: 1010, gf: 1150, uf: 2050, ridge: 2550, flagTop: 3330, width: 3140} as const;
const {TX, TR, HW} = CASTLE;

export type CastleProps = {
	t: number;
	/** 0..1 battlements pop up on the two silo towers (0 = flat silo tops) */
	crenel?: number;
	/** 0..1 flag hoisted */
	flag?: number;
	/** show the cannon on the right tower */
	cannon?: boolean;
	cannonRoll?: number;
	cannonPuff?: number;
	/** 0..1 the front walls fade away → dollhouse rooms */
	cutaway?: number;
	/** 0..3 rooms light up one by one: 1 table + family silhouettes, 2 TV glow, 3 laundry line upstairs */
	rooms?: number;
	/** 0..1: tower bitten (0–0.3), flag topples (0.12–0.34), collapse into rubble + dust (0.35–0.7), cleared to an empty plot (0.75–1) */
	demolish?: number;
	/** seconds the scene spends on demolish 0→1 (dust ages) */
	demolishDur?: number;
	/** -1 bite the left (flag) tower, 1 the right */
	biteSide?: -1 | 1;
	/** dirt plot under the house */
	ground?: boolean;
	lw?: number;
};

const Win: React.FC<{x: number; y: number; w: number; h: number; lw: number; lit?: number; litC?: string; pat: string}> = ({x, y, w, h, lw, lit = 0, litC = '#FFD27A', pat}) => (
	<g>
		<rect x={x - w / 2 - 22} y={y - h / 2 - 22} width={w + 44} height={h + 44} fill={HAY.beam} stroke={INK} strokeWidth={lw} />
		<rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={lit > 0 ? mix(HAY.glass, litC, lit) : HAY.glass} />
		<rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={`url(#${pat})`} opacity={0.7} />
		<path d={`M${x - w * 0.3},${y + h / 2 - 20} L${x + w * 0.1},${y - h / 2 + 20}`} stroke="#fff" strokeWidth={lw * 1.4} opacity={0.25} strokeLinecap="round" />
		<line x1={x} y1={y - h / 2} x2={x} y2={y + h / 2} stroke={HAY.beam} strokeWidth={24} />
		<rect x={x - w / 2 - 40} y={y + h / 2 + 14} width={w + 80} height={30} fill={HAY.beam} stroke={INK} strokeWidth={lw * 0.8} />
	</g>
);

/** a dark family silhouette, seated or standing (no face, no age cues); (x, y) = the line where the body is cut (table / sofa) */
const Sil: React.FC<{x: number; y: number; h: number; tilt?: number}> = ({x, y, h, tilt = 0}) => (
	<g transform={`translate(${x} ${y}) rotate(${tilt} 0 0)`} fill={HAY.sil}>
		<circle cx={0} cy={-h * 0.86} r={h * 0.13} />
		<rect x={-h * 0.045} y={-h * 0.76} width={h * 0.09} height={h * 0.08} />
		<path d={`M${-h * 0.22},40 L${-h * 0.24},${-h * 0.5} Q${-h * 0.22},${-h * 0.7} 0,${-h * 0.71} Q${h * 0.22},${-h * 0.7} ${h * 0.24},${-h * 0.5} L${h * 0.22},40 Z`} />
	</g>
);

const Tower: React.FC<{cx: number; crenel: number; lw: number; seed: number}> = ({cx, crenel, lw, seed}) => {
	const L = cx - TR;
	const R = cx + TR;
	const bandL = L - 40;
	const bw = TR * 2 + 80;
	const mw = 112;
	const gapW = (bw - 4 * mw) / 3;
	return (
		<g>
			<rect x={L - 24} y={-150} width={TR * 2 + 48} height={150} fill={HAY.stoneD} stroke={INK} strokeWidth={lw} />
			<rect x={L} y={-2500} width={TR * 2} height={2350} fill={HAY.stone} />
			<rect x={L} y={-2500} width={TR * 0.4} height={2350} fill={HAY.stoneL} opacity={0.8} />
			<rect x={R - TR * 0.55} y={-2500} width={TR * 0.55} height={2350} fill={HAY.stoneD} opacity={0.55} />
			{Array.from({length: 18}, (_, j) => {
				const y = -150 - (j + 1) * 128;
				return (
					<g key={j}>
						<line x1={L} y1={y} x2={R} y2={y} stroke={HAY.stoneD} strokeWidth={lw * 0.55} />
						{[0.18, 0.5, 0.82].map((f, m) => {
							const x = L + (f + (j % 2 ? 0.16 : 0) - (m === 2 && j % 2 ? 0.3 : 0)) * TR * 2;
							return <line key={m} x1={x} y1={y} x2={x} y2={y + 128} stroke={HAY.stoneD} strokeWidth={lw * 0.55} />;
						})}
					</g>
				);
			})}
			{[-900, -1720].map((y) => (
				<g key={y}>
					<rect x={cx - 24} y={y - 110} width={48} height={220} rx={22} fill="#1A1410" stroke={INK} strokeWidth={lw} />
					<rect x={cx - 60} y={y - 14} width={120} height={28} rx={12} fill="#1A1410" />
				</g>
			))}
			<rect x={L} y={-2500} width={TR * 2} height={2350} fill="none" stroke={INK} strokeWidth={lw} />
			{Array.from({length: 9}, (_, m) => {
				const x0 = L + (m * TR * 2) / 9;
				const ww = (TR * 2) / 9;
				return <path key={m} d={`M${x0},-2500 Q${x0 + ww / 2},-2440 ${x0 + ww},-2500`} fill={HAY.stoneD} stroke={INK} strokeWidth={lw * 0.6} />;
			})}
			<rect x={bandL} y={-2670} width={bw} height={80} fill={HAY.stoneD} stroke={INK} strokeWidth={lw} />
			{Array.from({length: 4}, (_, j) => {
				const k = popOv(clamp01(crenel * 1.7 - j * 0.23 - (seed % 2) * 0.05));
				if (k <= 0) return null;
				const x0 = bandL + j * (mw + gapW);
				const hh = 250 * k;
				return (
					<g key={j}>
						<rect x={x0} y={-2600 - hh} width={mw} height={hh} fill={HAY.stone} stroke={INK} strokeWidth={lw} />
						<rect x={x0 + lw * 0.5} y={-2600 - hh + lw * 0.5} width={mw * 0.3} height={Math.max(0, hh - lw)} fill={HAY.stoneL} opacity={0.8} />
					</g>
				);
			})}
			<rect x={bandL} y={-2600} width={bw} height={100} fill={HAY.stone} stroke={INK} strokeWidth={lw} />
			<rect x={bandL + lw * 0.5} y={-2600 + lw * 0.5} width={bw - lw} height={22} fill={HAY.stoneL} />
		</g>
	);
};

/** the mock-Tudor «castle»: timber-framed house between two round battlemented (silo) towers, flag, cannon; (0, 0) = base centre */
export const CastleG: React.FC<CastleProps> = ({t, crenel = 1, flag = 1, cannon = true, cannonRoll = 0, cannonPuff = -1, cutaway = 0, rooms = 0, demolish = 0, demolishDur = 4, biteSide = -1, ground = true, lw = 12}) => {
	const id = useSid('cs');
	const pat = `${id}lat`;
	const cw = clamp01(cutaway);
	const li = [0, 1, 2].map((i) => clamp01((rooms - i) / 0.18));
	const flash = [0, 1, 2].map((i) => {
		const a = rooms - i;
		return a > 0 && a < 0.5 ? Math.sin((a / 0.5) * Math.PI) * 0.45 : 0;
	});
	const dm = clamp01(demolish);
	const bite = clamp01(dm / 0.3);
	const fTop = clamp01((dm - 0.12) / 0.22);
	const col = clamp01((dm - 0.35) / 0.35);
	const clear = clamp01((dm - 0.75) / 0.25);
	const sink = col * col * 3400;
	const jit = col > 0 && col < 1 ? Math.sin(dm * 260) * 16 * Math.sin(col * Math.PI) : 0;
	const bs = biteSide;
	const bx = bs * (TX + TR);
	const by = -2850;
	const Rb = 280 * easeOut(clamp01(bite * 2)) + 170 * easeOut(clamp01(bite * 2 - 1));
	const fx = -TX + 168; // flag on the left tower, inner side (stays standing on what the bite leaves)
	const flagAng = (bs < 0 ? -1 : 1) * 104 * easeIn(fTop);
	const flagY = lerp(-2700, -3290, clamp01(flag));
	const flick = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3);
	const ages = dm * demolishDur;
	const facadeO = 1 - cw;
	const roomBg = (i: number, lit: string) => mix('#1E2B42', lit, li[i]);
	const flagPts = () => {
		const top: string[] = [];
		const bot: string[] = [];
		for (let j = 0; j <= 10; j++) {
			const f = j / 10;
			const x = fx + 20 + f * 340;
			const w = Math.sin(t * 6 - f * 5) * 26 * f;
			top.push(`${x.toFixed(1)},${(flagY + w).toFixed(1)}`);
			bot.unshift(`${x.toFixed(1)},${(flagY + 190 - (j === 10 ? 95 : 0) + w).toFixed(1)}`);
		}
		return [...top, `${(fx + 300).toFixed(1)},${(flagY + 95 + Math.sin(t * 6 - 5) * 26).toFixed(1)}`, ...bot].join(' ');
	};
	const building = (
		<g>
			{/* chimney + roof */}
			<rect x={-660} y={-2800} width={160} height={460} fill={HAY.brick} stroke={INK} strokeWidth={lw} />
			<rect x={-684} y={-2830} width={208} height={50} fill={HAY.stoneD} stroke={INK} strokeWidth={lw} />
			<path d={`M${-HW - 60},-2040 L${HW + 60},-2040 L820,-2550 L-820,-2550 Z`} fill={HAY.roof} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			{Array.from({length: 5}, (_, j) => {
				const y = -2040 - (j + 1) * 86;
				const hw = lerp(HW + 60, 820, (j + 1) / 5.93);
				return <line key={j} x1={-hw} y1={y} x2={hw} y2={y} stroke={HAY.roofD} strokeWidth={lw * 0.7} />;
			})}
			<line x1={-820} y1={-2550} x2={820} y2={-2550} stroke={HAY.roofD} strokeWidth={34} />
			{/* rooms (cutaway) */}
			{cw > 0 ? (
				<g>
					<rect x={-HW + 10} y={-1130} width={HW - 50} height={1080} fill={roomBg(0, '#F2C46C')} />
					<rect x={40} y={-1130} width={HW - 50} height={1080} fill={roomBg(1, '#355E92')} />
					<rect x={-HW - 20} y={-2030} width={2 * HW + 40} height={830} fill={roomBg(2, '#EFD08A')} />
					{li[0] > 0 ? (
						<g opacity={li[0]}>
							<path d="M-640,-1130 L-640,-1040" stroke={INK} strokeWidth={lw * 0.7} />
							<path d="M-450,-470 L-830,-470 L-690,-975 L-590,-975 Z" fill="rgba(255,240,190,0.4)" />
							<path d="M-720,-970 L-560,-970 L-600,-1045 L-680,-1045 Z" fill={PAL.gold} stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
							<Sil x={-640} y={-470} h={440} />
							<Sil x={-880} y={-470} h={460} tilt={8} />
							<Sil x={-400} y={-470} h={460} tilt={-8} />
							<rect x={-930} y={-480} width={600} height={38} rx={8} fill={HAY.beam} stroke={INK} strokeWidth={lw * 0.8} />
							<rect x={-900} y={-442} width={30} height={380} fill={HAY.beam} />
							<rect x={-390} y={-442} width={30} height={380} fill={HAY.beam} />
							{[-840, -640, -440].map((x) => (
								<ellipse key={x} cx={x} cy={-486} rx={46} ry={12} fill="#fff" stroke={INK} strokeWidth={lw * 0.5} />
							))}
						</g>
					) : null}
					{li[1] > 0 ? (
						<g opacity={li[1]}>
							<path d={`M690,-470 L130,-700 L130,-120 L690,-330 Z`} fill="#BFE6FF" opacity={0.22 * flick} />
							<Sil x={300} y={-420} h={520} />
							<Sil x={520} y={-420} h={520} />
							<rect x={160} y={-470} width={480} height={300} rx={50} fill="#2E5E64" stroke={INK} strokeWidth={lw * 0.8} />
							<rect x={130} y={-300} width={540} height={150} rx={40} fill="#26504F" stroke={INK} strokeWidth={lw * 0.8} />
							<rect x={700} y={-300} width={260} height={240} fill={HAY.beam} stroke={INK} strokeWidth={lw * 0.8} />
							<rect x={680} y={-580} width={300} height={260} rx={18} fill="#22222A" stroke={INK} strokeWidth={lw * 0.8} />
							<rect x={705} y={-555} width={250} height={200} rx={10} fill={mix('#7FC4F2', '#F2FAFF', flick)} />
							<rect x={705} y={-555} width={250} height={200} rx={10} fill="#BFE6FF" opacity={0.4 * flick} style={{filter: 'blur(14px)'}} />
						</g>
					) : null}
					{li[2] > 0 ? (
						<g opacity={li[2]}>
							<path d="M0,-2030 L0,-1960" stroke={INK} strokeWidth={lw * 0.7} />
							<circle cx={0} cy={-1940} r={26} fill="#FFF3C4" stroke={INK} strokeWidth={lw * 0.6} />
							<path d="M-920,-1860 Q0,-1720 920,-1860" stroke={INK} strokeWidth={lw * 1.6} fill="none" />
							<path d="M-920,-1860 Q0,-1720 920,-1860" stroke="#EFE3C8" strokeWidth={lw * 0.6} fill="none" />
							{[
								[0.1, 'shirt', PAL.orange],
								[0.24, 'socks', PAL.teal],
								[0.4, 'sheet', '#F6F2EA'],
								[0.58, 'trousers', FC.denim],
								[0.74, 'shirt', FC.shirt],
								[0.88, 'towel', PAL.gold],
							].map(([u, kind, c], i) => {
								const uu = u as number;
								const x = (1 - uu) * (1 - uu) * -920 + 2 * uu * (1 - uu) * 0 + uu * uu * 920;
								const y = (1 - uu) * (1 - uu) * -1860 + 2 * uu * (1 - uu) * -1720 + uu * uu * -1860;
								const sw = Math.sin(t * 2.2 + i * 1.3) * 5;
								const fill = c as string;
								const shape =
									kind === 'shirt'
										? 'M-90,0 L90,0 L150,60 L110,110 L80,80 L80,280 L-80,280 L-80,80 L-110,110 L-150,60 Z'
										: kind === 'socks'
											? 'M-70,0 L-30,0 L-30,170 L10,200 L0,240 L-70,220 Z M30,0 L70,0 L70,160 L110,190 L100,230 L30,210 Z'
											: kind === 'sheet'
												? 'M-120,0 L120,0 L130,340 L60,320 L0,345 L-60,322 L-130,340 Z'
												: kind === 'trousers'
													? 'M-90,0 L90,0 L100,320 L20,320 L0,120 L-20,320 L-100,320 Z'
													: 'M-80,0 L80,0 L86,240 L-86,240 Z';
								return (
									<g key={i} transform={`translate(${x} ${y + 6}) rotate(${sw})`}>
										<path d={shape} fill={fill} stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
										{kind === 'towel' ? <path d="M-86,200 L86,200" stroke="#fff" strokeWidth={18} /> : null}
										<rect x={-60} y={-24} width={18} height={44} fill={HAY.woodL} stroke={INK} strokeWidth={lw * 0.4} />
										<rect x={42} y={-24} width={18} height={44} fill={HAY.woodL} stroke={INK} strokeWidth={lw * 0.4} />
									</g>
								);
							})}
						</g>
					) : null}
					{[0, 1, 2].map((i) =>
						flash[i] > 0 ? (
							<rect key={`fl${i}`} x={i === 1 ? 40 : i === 0 ? -HW + 10 : -HW - 20} y={i === 2 ? -2030 : -1130} width={i === 2 ? 2 * HW + 40 : HW - 50} height={i === 2 ? 830 : 1080} fill="#fff" opacity={flash[i]} />
						) : null,
					)}
				</g>
			) : null}
			{/* facade */}
			<g opacity={facadeO}>
				<rect x={-HW - 30} y={-2050} width={2 * HW + 60} height={900} fill={HAY.render} stroke={INK} strokeWidth={lw} />
				{Array.from({length: 11}, (_, j) => {
					const x = -HW - 30 + j * 208;
					return (
						<g key={j}>
							<rect x={x - 16} y={-2040} width={32} height={860} fill={HAY.beam} />
							{j < 10 ? <line x1={j % 2 ? x : x + 208} y1={-1190} x2={j % 2 ? x + 208 : x} y2={-1580} stroke={HAY.beam} strokeWidth={28} /> : null}
						</g>
					);
				})}
				<rect x={-HW - 30} y={-1600} width={2 * HW + 60} height={30} fill={HAY.beam} />
				<rect x={-HW - 30} y={-2050} width={2 * HW + 60} height={36} fill={HAY.beam} />
				{[-640, 0, 640].map((x, i) => (
					<Win key={x} x={x} y={-1830} w={300} h={260} lw={lw} pat={pat} lit={li[2]} litC="#FFE19A" />
				))}
				<rect x={-HW - 50} y={-1192} width={2 * HW + 100} height={48} fill={HAY.beam} stroke={INK} strokeWidth={lw} />
				<rect x={-HW} y={-1150} width={2 * HW} height={1150} fill={HAY.render} stroke={INK} strokeWidth={lw} />
				<rect x={-HW} y={-170} width={2 * HW} height={170} fill={HAY.brick} stroke={INK} strokeWidth={lw} />
				{[-110, -55].map((y) => (
					<line key={y} x1={-HW} y1={y} x2={HW} y2={y} stroke="#8A4630" strokeWidth={lw * 0.5} />
				))}
				{[-HW + 20, -420, 420, HW - 20].map((x) => (
					<rect key={x} x={x - 20} y={-1150} width={40} height={980} fill={HAY.beam} />
				))}
				<Win x={-720} y={-700} w={330} h={380} lw={lw} pat={pat} lit={li[0]} />
				<Win x={720} y={-700} w={330} h={380} lw={lw} pat={pat} lit={li[1]} litC="#9FD6FF" />
				<path d="M-170,-170 L-170,-640 Q-170,-800 0,-800 Q170,-800 170,-640 L170,-170 Z" fill={HAY.beam} stroke={INK} strokeWidth={lw} />
				<path d="M-136,-170 L-136,-630 Q-136,-766 0,-766 Q136,-766 136,-630 L136,-170 Z" fill={HAY.door} stroke={INK} strokeWidth={lw * 0.8} />
				{[-68, 0, 68].map((x) => (
					<line key={x} x1={x} y1={-750} x2={x} y2={-175} stroke="#4E2F1A" strokeWidth={lw * 0.6} />
				))}
				{[-620, -420].map((y) => (
					<rect key={y} x={-130} y={y} width={260} height={22} fill="#3A3A40" />
				))}
				<circle cx={80} cy={-470} r={22} fill="none" stroke={PAL.gold} strokeWidth={10} />
			</g>
			{cw > 0 ? (
				<g opacity={cw}>
					<rect x={-HW - 30} y={-1200} width={2 * HW + 60} height={70} fill={HAY.beam} stroke={INK} strokeWidth={lw} />
					<rect x={-HW} y={-50} width={2 * HW} height={50} fill="#5A3E2A" stroke={INK} strokeWidth={lw} />
					<rect x={-30} y={-1130} width={70} height={1080} fill={HAY.render} stroke={INK} strokeWidth={lw} />
					<rect x={-HW - 30} y={-2050} width={2 * HW + 60} height={36} fill={HAY.beam} stroke={INK} strokeWidth={lw} />
				</g>
			) : null}
			{/* front gable */}
			<path d="M-480,-2036 L480,-2036 L0,-2660 Z" fill={HAY.render} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
			<path d="M0,-2040 L0,-2640 M-300,-2040 L0,-2400 M300,-2040 L0,-2400 M-250,-2300 L250,-2300" stroke={HAY.beam} strokeWidth={30} />
			<path d="M-540,-2000 L0,-2700 L540,-2000" stroke={INK} strokeWidth={56 + lw * 2} fill="none" strokeLinejoin="round" />
			<path d="M-540,-2000 L0,-2700 L540,-2000" stroke={HAY.beam} strokeWidth={56} fill="none" strokeLinejoin="round" />
			{/* towers, flag, cannon */}
			<Tower cx={-TX} crenel={crenel} lw={lw} seed={1} />
			<Tower cx={TX} crenel={crenel} lw={lw} seed={2} />
			{cannon ? (
				<g transform={`translate(${TX - 170} -2600) scale(0.82)`}>
					<CannonG roll={cannonRoll} rollDist={170} puffAge={cannonPuff} lw={lw / 0.82} />
				</g>
			) : null}
		</g>
	);
	const flagNode =
		flag > 0 || dm > 0 ? (
				<g transform={`rotate(${flagAng} ${fx} -2600)`} opacity={fTop >= 1 ? 1 - clamp01((dm - 0.34) / 0.1) : 1}>
					<line x1={fx} y1={-2600} x2={fx} y2={-3330} stroke={INK} strokeWidth={22 + lw * 2} strokeLinecap="round" />
					<line x1={fx} y1={-2600} x2={fx} y2={-3330} stroke="#6B5236" strokeWidth={22} strokeLinecap="round" />
					<circle cx={fx} cy={-3345} r={28} fill={PAL.gold} stroke={INK} strokeWidth={lw * 0.8} />
					{flag > 0 ? <polygon points={flagPts()} fill={PAL.orange} stroke={INK} strokeWidth={lw} strokeLinejoin="round" /> : null}
				</g>
			) : null;
	const heapH = 760 * easeOut(clamp01(col * 1.6)) * (1 - easeInOut(clear));
	const stones = Array.from({length: 24}, (_, i) => {
		const x = (h1(i * 3.7) - 0.5) * 3000;
		const env = Math.pow(Math.max(0, 1 - (x / 1700) ** 2), 0.7);
		return {x, y: -heapH * env * (0.25 + 0.7 * h1(i * 5.9)), r: 60 + 70 * h1(i * 2.3), rot: h1(i) * 180, c: [HAY.stone, HAY.stoneL, HAY.brick, HAY.roof, HAY.render, HAY.stoneD][i % 6]};
	});
	return (
		<g>
			<defs>
				<pattern id={pat} width={54} height={74} patternUnits="userSpaceOnUse">
					<path d="M0,0 L54,74 M54,0 L0,74" stroke={HAY.glassL} strokeWidth={5} />
				</pattern>
				<clipPath id={`${id}gc`}>
					<rect x={-6000} y={-8000} width={12000} height={8000} />
				</clipPath>
				<mask id={`${id}bm`} maskUnits="userSpaceOnUse" x={-6000} y={-8000} width={12000} height={10000}>
					<rect x={-6000} y={-8000} width={12000} height={10000} fill="#fff" />
					{Rb > 0 ? <path d={jagPath(bx, by, Rb, 3)} fill="#000" /> : null}
				</mask>
				<clipPath id={`${id}tw`}>
					<rect x={bs * TX - TR} y={-2500} width={TR * 2} height={2500} />
					<rect x={bs * TX - TR - 40} y={-2670} width={TR * 2 + 80} height={175} />
				</clipPath>
			</defs>
			{ground ? (
				<g>
					<ellipse cx={0} cy={40} rx={1950} ry={120} fill={HAY.dirt} stroke={INK} strokeWidth={lw} />
					{clear > 0 ? (
						<g opacity={clear} fill="none" stroke="#5E4329" strokeWidth={22} strokeDasharray="44 30" strokeLinecap="round">
							<path d="M-1500,60 Q0,-30 1500,70" />
							<path d="M-1500,110 Q0,20 1500,120" />
						</g>
					) : null}
				</g>
			) : null}
			{col < 1 ? (
				<g clipPath={`url(#${id}gc)`}>
					<g transform={`translate(${jit} ${sink})`}>
						<g mask={Rb > 0 ? `url(#${id}bm)` : undefined}>{building}</g>
						{flagNode}
						{Rb > 0 ? (
							<g clipPath={`url(#${id}tw)`}>
								<path d={jagPath(bx, by, Rb, 3)} fill="none" stroke={HAY.stoneD} strokeWidth={lw * 3} />
								<path d={jagPath(bx, by, Rb, 3)} fill="none" stroke={INK} strokeWidth={lw * 1.2} />
							</g>
						) : null}
					</g>
				</g>
			) : null}
			{bite > 0 && dm < 0.6
				? Array.from({length: 7}, (_, i) => {
						const a = ages - 0.12 * i - 0.08;
						if (a <= 0) return null;
						const x = bx + bs * (40 + 70 * i) * a * 2 - bs * 120;
						const y = by + 100 + 0.5 * 3600 * a * a;
						if (y > -40) return null;
						const r = 50 + 40 * h1(i * 4.1);
						return <path key={i} d={jagPath(0, 0, r, i * 7, 6, 0.25)} transform={`translate(${x} ${y}) rotate(${a * 400})`} fill={i % 3 ? HAY.stone : HAY.stoneL} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />;
					})
				: null}
			{heapH > 4 ? (
				<g>
					<path
						d={`M-1800,10 ${Array.from({length: 21}, (_, i) => {
							const x = -1800 + i * 180;
							const env = Math.pow(Math.max(0, 1 - (x / 1800) ** 2), 0.7);
							return `L${x},${-heapH * env * (0.82 + 0.3 * h1(i * 1.9))}`;
						}).join(' ')} L1800,10 Z`}
						fill="#8E8574"
						stroke={INK}
						strokeWidth={lw}
						strokeLinejoin="round"
					/>
					{[-700, 300, 900].map((x, i) => (
						<rect key={`bm${i}`} x={x - 260} y={-heapH * 0.6 - 20} width={520} height={44} fill={HAY.beam} stroke={INK} strokeWidth={lw * 0.8} transform={`rotate(${[-24, 18, -12][i]} ${x} ${-heapH * 0.6})`} />
					))}
					{stones.map((s, i) => (
						<path key={`st${i}`} d={jagPath(0, 0, s.r, i * 3, 6, 0.22)} transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`} fill={s.c} stroke={INK} strokeWidth={lw * 0.9} strokeLinejoin="round" />
					))}
				</g>
			) : null}
			<StrawDustG x={bx} y={by + 80} age={ages - 0.05} tone="stone" size={2.6} n={6} life={Math.min(1.5, 0.55 * demolishDur)} seed={11} lw={lw} bits={6} dir={bs * 0.4} />
			<StrawDustG x={0} y={-60} age={(dm - 0.35) * demolishDur} tone="stone" size={6.5} n={10} life={0.6 * demolishDur} seed={21} lw={lw} bits={12} rise={1.3} />
			<StrawDustG x={bs * -900} y={-40} age={(dm - 0.42) * demolishDur} tone="stone" size={4.2} n={7} life={0.48 * demolishDur} seed={31} lw={lw} bits={0} rise={1.1} />
		</g>
	);
};

export const Castle: React.FC<CastleProps & {x: number; y: number; s?: number}> = ({x, y, s = 0.2, lw, ...p}) => (
	<svg width={5000 * s} height={4400 * s} viewBox="-2500 -4000 5000 4400" style={{position: 'absolute', left: x - 2500 * s, top: y - 4000 * s, overflow: 'visible'}}>
		<CastleG {...p} lw={lw ?? lwFor(s)} />
	</svg>
);

// ───────────────────────────── Timer4Y ─────────────────────────────

export type Timer4YProps = {
	t: number;
	/** 0..1 slams in (crash scale + settle) */
	slam?: number;
	/** 0..1 the «4» flap keeps flipping (blur + flip, it only ever shows 4) */
	roll?: number;
	/** 0..1 the dial needle from START to the end */
	fill?: number;
	/** 0..1 check badge pops + flash ring + orange glow */
	done?: number;
	/** 0..1 the needle snaps back to the START label (overshoot wobble), the check drops away — «the clock hadn't started» */
	start?: number;
	lw?: number;
};

/** split-flap «4 YEARS» with a crossed-out eye above and a dial below (needle, START label); centre of the flaps = (0, 0).
 *  No numeral other than 4 anywhere (the dial has ticks only). */
export const Timer4YG: React.FC<Timer4YProps> = ({t, slam = 1, roll = 0, fill = 0, done = 0, start = 0, lw = 8}) => {
	const id = useSid('tm');
	const sk = popOv(slam);
	const sc = lerp(1.8, 1, sk);
	const op = clamp01(slam * 5);
	const st = clamp01(start);
	const back = st > 0 ? Math.max(-0.07, 1 - easeOutBack(st)) : 1;
	const f = clamp01(fill) * back;
	const th = Math.PI * (1 + Math.max(-0.07, f));
	const piv: P2 = [0, 372];
	const RN = 152;
	const blink = (t + 0.4) % 2.6 < 0.14 ? 1 : 0;
	const look = Math.sin(t * 1.7) * 13;
	const rl = clamp01(roll);
	const ph = (t * (5 + 9 * rl)) % 1;
	const fc = Math.cos(ph * Math.PI);
	const shake = st > 0 && st < 0.6 ? Math.sin(st * 60) * 10 * (1 - st / 0.6) : 0;
	const dk = clamp01(done);
	const glow = dk * (1 - st);
	const fl = dk > 0 && dk < 1 ? dk : 0;
	const tile = (x: number, w: number, h: number, ch: string, big: boolean, flap: boolean) => (
		<g key={ch + x}>
			<rect x={x - w / 2} y={-h / 2} width={w} height={h} rx={16} fill="#1C2836" stroke={INK} strokeWidth={lw} />
			<rect x={x - w / 2 + lw * 0.5} y={-h / 2 + lw * 0.5} width={w - lw} height={h / 2 - lw * 0.5} rx={12} fill="#243447" />
			<text
				x={x}
				y={big ? 8 : 6}
				textAnchor="middle"
				dominantBaseline="central"
				fontFamily="Alfa Slab One"
				fontSize={big ? 250 : 150}
				fill={big ? PAL.orange : '#fff'}
				stroke={INK}
				strokeWidth={lw * 1.2}
				paintOrder="stroke"
				filter={big && rl > 0 ? `url(#${id}mb)` : undefined}
			>
				{ch}
			</text>
			{flap && rl > 0 ? (
				<g transform={`translate(${x} 0) scale(1 ${fc.toFixed(3)})`}>
					<rect x={-w / 2} y={-h / 2} width={w} height={h / 2} rx={14} fill={fc > 0 ? '#2B3C50' : '#1A2532'} stroke={INK} strokeWidth={lw} />
					{fc > 0 ? (
						<g clipPath={`url(#${id}fh)`}>
							<text x={0} y={8} textAnchor="middle" dominantBaseline="central" fontFamily="Alfa Slab One" fontSize={250} fill={PAL.orange} stroke={INK} strokeWidth={lw * 1.2} paintOrder="stroke" filter={`url(#${id}mb)`}>
								4
							</text>
						</g>
					) : (
						[0.3, 0.55, 0.8].map((k) => <line key={k} x1={-w * 0.34} y1={-h * 0.5 * k} x2={w * 0.34} y2={-h * 0.5 * k} stroke="#3A4D63" strokeWidth={lw} strokeLinecap="round" />)
					)}
				</g>
			) : null}
			<line x1={x - w / 2} y1={0} x2={x + w / 2} y2={0} stroke={INK} strokeWidth={lw * 0.9} />
			{[-1, 1].map((s) => (
				<rect key={s} x={x + (s * w) / 2 - 8} y={-14} width={16} height={28} rx={4} fill="#5C6B7C" stroke={INK} strokeWidth={lw * 0.4} />
			))}
		</g>
	);
	const letters = 'YEARS'.split('');
	const ticks = Array.from({length: 13}, (_, i) => {
		const a = Math.PI * (1 + i / 12);
		return <line key={i} x1={piv[0] + Math.cos(a) * 118} y1={piv[1] + Math.sin(a) * 118} x2={piv[0] + Math.cos(a) * 146} y2={piv[1] + Math.sin(a) * 146} stroke={i / 12 <= f + 1e-3 ? PAL.orange : '#9FB0C4'} strokeWidth={i % 3 ? lw * 0.8 : lw * 1.3} strokeLinecap="round" />;
	});
	const arc = (r: number, a0: number, a1: number) => `M${piv[0] + Math.cos(a0) * r},${piv[1] + Math.sin(a0) * r} A${r},${r} 0 0 1 ${piv[0] + Math.cos(a1) * r},${piv[1] + Math.sin(a1) * r}`;
	const ndl: P2 = [piv[0] + Math.cos(th) * RN, piv[1] + Math.sin(th) * RN];
	const nb: P2 = [Math.cos(th + Math.PI / 2) * 16, Math.sin(th + Math.PI / 2) * 16];
	const checkY = st > 0 ? easeIn(st) * 700 : 0;
	return (
		<g opacity={op} transform={`translate(${shake} 0) scale(${sc})`}>
			<defs>
				<filter id={`${id}mb`} x="-30%" y="-60%" width="160%" height="220%">
					<feGaussianBlur stdDeviation={`0 ${(rl * 12).toFixed(1)}`} />
				</filter>
				<clipPath id={`${id}fh`}>
					<rect x={-120} y={-150} width={240} height={150} />
				</clipPath>
			</defs>
			{/* dial pod */}
			<path d={`M-215,${piv[1] + 20} A215,215 0 0 1 215,${piv[1] + 20} Z`} transform={`translate(0 -20)`} fill="#0B1B2E" stroke={INK} strokeWidth={lw * 1.2} strokeLinejoin="round" />
			<path d={arc(132, Math.PI, Math.PI * 2)} stroke="#22344B" strokeWidth={30} fill="none" />
			{f > 0.005 ? <path d={arc(132, Math.PI, th)} stroke={PAL.orange} strokeWidth={30} fill="none" opacity={0.85} /> : null}
			{ticks}
			<polygon points={pl([[piv[0] + nb[0], piv[1] + nb[1]], ndl, [piv[0] - nb[0], piv[1] - nb[1]]])} fill="#fff" stroke={INK} strokeWidth={lw * 0.8} strokeLinejoin="round" />
			<circle cx={piv[0]} cy={piv[1]} r={30} fill={PAL.orange} stroke={INK} strokeWidth={lw} />
			{/* START label */}
			<g transform={`translate(-178 ${piv[1] + 62})`}>
				{st > 0 ? <rect x={-112} y={-40} width={224} height={80} rx={40} fill={PAL.orange} stroke={INK} strokeWidth={lw} opacity={clamp01(st * 3)} style={{filter: `drop-shadow(0 0 ${18 * (0.6 + 0.4 * Math.sin(t * 12))}px rgba(255,122,31,0.9))`}} /> : null}
				<text x={0} y={4} textAnchor="middle" dominantBaseline="central" fontFamily="Montserrat" fontWeight={900} fontSize={50} letterSpacing={3} fill={st > 0.3 ? INK : '#fff'} stroke={st > 0.3 ? 'none' : INK} strokeWidth={lw * 0.9} paintOrder="stroke">
					START
				</text>
			</g>
			{/* panel with the flaps */}
			<rect x={-470} y={-170} width={940} height={360} rx={46} fill={INK} opacity={0.5} transform="translate(0 18)" />
			<rect x={-470} y={-170} width={940} height={340} rx={46} fill="#0B1B2E" stroke={glow > 0 ? PAL.orange : INK} strokeWidth={lw * (1.3 + glow)} style={glow > 0 ? {filter: `drop-shadow(0 0 ${30 * glow}px rgba(255,122,31,0.9))`} : undefined} />
			<rect x={-452} y={-152} width={904} height={304} rx={34} fill="none" stroke="#1F3550" strokeWidth={lw} />
			{tile(-332, 200, 280, '4', true, true)}
			{letters.map((ch, i) => tile(-150 + i * 128, 116, 210, ch, false, false))}
			{/* crossed-out eye */}
			<g transform="translate(0 -306)">
				<circle r={112} fill={PAL.parchment} stroke={INK} strokeWidth={lw * 1.2} />
				<g transform={`scale(1 ${1 - blink * 0.88})`}>
					<path d="M-86,0 Q0,-70 86,0 Q0,70 -86,0 Z" fill="#fff" stroke={INK} strokeWidth={lw * 1.1} strokeLinejoin="round" />
					<circle cx={look} cy={0} r={32} fill={PAL.teal} stroke={INK} strokeWidth={lw * 0.6} />
					<circle cx={look} cy={0} r={15} fill={INK} />
					<circle cx={look - 10} cy={-10} r={6} fill="#fff" />
				</g>
				<line x1={-70} y1={-70} x2={70} y2={70} stroke={INK} strokeWidth={20 + lw * 1.4} strokeLinecap="round" />
				<line x1={-70} y1={-70} x2={70} y2={70} stroke={PAL.stamp} strokeWidth={20} strokeLinecap="round" />
			</g>
			{/* done: check badge + flash ring */}
			{dk > 0 ? (
				<g transform={`translate(${440} ${-160 + checkY}) rotate(${st * 50}) scale(${popOv(dk)})`} opacity={1 - clamp01((st - 0.5) / 0.5)}>
					<circle r={88} fill={PAL.teal} stroke={INK} strokeWidth={lw * 1.2} />
					<path d="M-42,2 L-12,34 L46,-34" stroke={INK} strokeWidth={34 + lw} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={200} strokeDashoffset={200 * (1 - clamp01(dk * 1.6))} />
					<path d="M-42,2 L-12,34 L46,-34" stroke="#fff" strokeWidth={30} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={200} strokeDashoffset={200 * (1 - clamp01(dk * 1.6))} />
				</g>
			) : null}
			{fl > 0 ? (
				<g opacity={1 - fl}>
					<rect x={-470 - fl * 120} y={-170 - fl * 120} width={940 + fl * 240} height={340 + fl * 240} rx={46 + fl * 60} fill="none" stroke="#fff" strokeWidth={lw * 3 * (1 - fl) + 2} />
					<rect x={-470} y={-170} width={940} height={340} rx={46} fill="#fff" opacity={0.5 * (1 - fl)} />
				</g>
			) : null}
		</g>
	);
};

/** the timer in px: (x, y) = centre of the flaps; s = 0.5 → 470 px wide */
export const Timer4Y: React.FC<Timer4YProps & {x: number; y: number; s?: number}> = ({x, y, s = 0.5, lw, ...p}) => (
	<svg width={1200 * s} height={1100 * s} viewBox="-600 -450 1200 1100" style={{position: 'absolute', left: x - 600 * s, top: y - 450 * s, overflow: 'visible'}}>
		<Timer4YG {...p} lw={lw ?? LW / s} />
	</svg>
);
