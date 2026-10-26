import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import trackA from '../data/etna_a_track.json';
import {TunnelDiagram, WallDiagram} from './EtnaDiagrams';
import * as THREE from 'three';
import {GEO} from '../data/geo';
import {MONT} from '../fonts';
import {FPS, W, We} from '../lib/time';
import {Billboards, type BB} from '../three/Billboards';
import {orbit, project, type Cam} from '../three/cam';
import {embers, explosion, h1, plume, type V3} from '../three/fx';
import {LAVA_RAMP, NOISE} from '../three/glsl';
import {LOOKS} from '../three/looks';
import {XrayTube} from '../three/models';
import {Ocean} from '../three/Ocean';
import {useRegion, type Region} from '../three/region';
import {Sky} from '../three/Sky';
import {Stage3D, type PostOpts} from '../three/Stage3D';
import {TerrainMesh, type Highlight, type LavaState} from '../three/TerrainMesh';
import {ImgSeq, Label, Layer, PhotoKB, XF, clamp01, easeInOut, easeOut, lerp, useT} from '../ui/gfx';
/** pilot switch: the Blender establishing shot (public/blender/etna_a) instead of the three.js shot A */
const BLENDER_A = true;
/** the dirt-wall and tube-blast moments as cutaway diagrams instead of the three.js shots B and C */
const DIAGRAMS = true;

// STYLE v3 (owner notes 18.10): the subtitle carries the words; on the picture only ONE calm label that adds what the voice
// does not say (the town's name); walls / overflow / blast stay pictures. Three shots, all seen from up-slope / looking
// down the valley except the source (C), each one continuous move, cross-dissolved (Layer, XF), no shake, no flashes.
//   A «Italy. Etna is coming for a town.»  the globe dive lands on its opening camera (GlobeHop mirrors SHOTS.A), tilts
//     down onto the whole flow: vent low, town up top, the front running down Valle del Bove.
//   B «Dirt walls? The lava climbs right over.»  the earth bank rises across the flow at Portella Calanna, the front
//     stops at its face, a lava pond fills up behind it and spills over the crest; the front runs on toward the town.
//   C «So engineers blow up its tunnel — at the source.»  the vent at the top, the x-ray tube below it, the charge
//     point, the blast; the old channel crusts over and goes dark, a new channel glows in from the breach.

const E = GEO.etna;
const P = (cam: Cam, p: V3) => project(cam, p, 1080, 1920);
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

const SA = W(55) + 0.1; // B dissolves in: «Dirt walls?» (together with Atlas leaving and the subtitle moving down)
const SB = W(62) - 0.2; // C dissolves in: «So engineers …»
const BLAST = W(65) - 0.06; // «blow UP»

type Shot = 'A' | 'B' | 'C';
// lava look per shot: at A's distance the shader's far-LOD heat (~0.7) reads pale cream; a little crust cooling brings it to
// glowing orange-red (and keeps the advancing fronts from going white), as in C
const GAIN: Record<Shot, number> = {A: 0.55, B: 0.44, C: 0.58};
const COOL: Record<Shot, number> = {A: 0.15, B: 0.26, C: 0.2};
const POST: Record<Shot, PostOpts> = {A: {bloom: 0.5, threshold: 0.9}, B: {bloom: 0.55, threshold: 0.9}, C: {bloom: 0.65, threshold: 0.9}};

// ------------------------------------------------------------------------------------------------- the earth bank
// across the flow at its neck (Portella Calanna), laid along the lava map's arrival isoline (≈ 0.796) so the front meets
// the whole face at once. Crest level 1002 m: 20–35 m above the valley floor (the 1992 bank: 234 m × 21 m), a bit
// larger than life so it reads at this distance.
const WALL: [number, number][] = [
	[37.7153, 15.0902],
	[37.7119, 15.0892],
];
const WALL_CREST_M = 1002;
const WC = 0.015; // crest half-width (km)
const WS = 1.1; // flank slope (exaggerated scene units)
const WALL_P = 0.792; // R arrival at the bank's up-slope toe: the front holds here
const T_RISE = [SA, SA + 0.5]; // the bank pushes up out of the ground on «Dirt walls?»
const T_POOL = [We(56) + 0.1, W(59) + 0.05]; // the lava piles up behind it (≈ 30.39 → 31.42)
const T_OVER = [W(59) - 0.02, W(60) + 0.33]; // … and climbs over the crest on «climbs right over» (31.35 → 32.0)

// R channel arrival progress: the front runs down Valle del Bove (A), slows down and holds at the bank's face (B). What
// runs on beyond the bank after the overflow is drawn by the apron (progApron), not by the terrain: advancing the whole R
// field would also light distant parts of the flow outline that show over the ridge as floating shards.
const progR = (t: number) => {
	const a0 = W(48) + 0.45;
	const k1 = clamp01((t - a0) / (We(56) + 0.1 - a0));
	return 0.2 + (WALL_P - 0.2) * (1 - (1 - k1) ** 2);
};
const progApron = (t: number) => WALL_P + 0.06 * easeOut(clamp01((t - W(60) - 0.13) / 2.0));

const lavaOf =
	(shot: Shot) =>
	(t: number): LavaState => {
		// after the blast: the old channel (R) crusts over and goes dark; the new one (G) runs out of the breach while still
		// "cold" (dark: no pop, and its young, half-molten core — a smooth crimson tongue in this shader — never shows), then
		// glows in from 1.0 s after the blast as crusted lava with molten lanes, like the rest of the flow
		const coolR = lerp(COOL[shot], 1, easeInOut(clamp01((t - BLAST - 0.5) / 2.4)));
		const pG = t < BLAST ? 0 : 0.125 * clamp01((t - BLAST) / 0.12) + 0.85 * easeOut(clamp01((t - BLAST - 0.25) / 2.6));
		const coolG = 1 - 0.75 * easeInOut(clamp01((t - BLAST - 1.0) / 0.9));
		// B is a low view across the flow: the draped lava's per-vertex thickness (29 m mesh) would show as terraces there
		return {prog: [progR(t), pG, 0], cool: [coolR, coolG, 0], gain: GAIN[shot], noise: 70, thick: shot === 'B' ? 0 : 0.006};
	};

// ------------------------------------------------------------------------------------------------------- camera
// monotone cubic (Fritsch–Carlson) through orbit keys → continuous position AND speed, no overshoot, no cuts
// v = [tx, ty, tz, az, el, dist, fov]
type Key = {t: number; v: number[]};

const spline = (keys: Key[], t: number): number[] => {
	const n = keys.length;
	if (t <= keys[0].t) return keys[0].v;
	if (t >= keys[n - 1].t) return keys[n - 1].v;
	let k = 0;
	while (t > keys[k + 1].t) k++;
	const T = keys.map((x) => x.t);
	return keys[0].v.map((_, d) => {
		const V = keys.map((x) => x.v[d]);
		const del = T.slice(0, -1).map((_t, i) => (V[i + 1] - V[i]) / (T[i + 1] - T[i]));
		const m = V.map((_v, i) => (i === 0 || i === n - 1 || del[i - 1] * del[i] <= 0 ? 0 : (del[i - 1] * (T[i + 1] - T[i]) + del[i] * (T[i] - T[i - 1])) / (T[i + 1] - T[i - 1])));
		for (let i = 0; i < n - 1; i++) {
			if (del[i] === 0) {
				m[i] = 0;
				m[i + 1] = 0;
				continue;
			}
			const a = m[i] / del[i];
			const b = m[i + 1] / del[i];
			const s = a * a + b * b;
			if (s > 9) {
				m[i] = (3 / Math.sqrt(s)) * a * del[i];
				m[i + 1] = (3 / Math.sqrt(s)) * b * del[i];
			}
		}
		const h = T[k + 1] - T[k];
		const x = (t - T[k]) / h;
		return (2 * x ** 3 - 3 * x ** 2 + 1) * V[k] + (x ** 3 - 2 * x ** 2 + x) * h * m[k] + (-2 * x ** 3 + 3 * x ** 2) * V[k + 1] + (x ** 3 - x ** 2) * h * m[k + 1];
	});
};

// NOTE: GlobeHop.tsx (Etna destination) mirrors SHOTS.A + this spline to land the globe dive exactly on shot A's opening
// camera during the W(48) … W(48) + XF dissolve. Keep A's keys (and the barrier-based target) in sync with that copy.
type Pts = {vent: V3; tube: V3; tEnd: V3; mid: V3; bar: V3; wall: V3; town: V3};
const pts = (r: Region): Pts => {
	const te = E.tubePath[E.tubePath.length - 1];
	return {
		vent: r.at(E.vent[0], E.vent[1]),
		tube: r.at(E.tube[0], E.tube[1]),
		tEnd: r.at(te[0], te[1]),
		mid: r.at(E.mid[0], E.mid[1]),
		wall: r.at((WALL[0][0] + WALL[1][0]) / 2, (WALL[0][1] + WALL[1][1]) / 2),
		bar: r.at((E.barrier[0][0] + E.barrier[1][0]) / 2, (E.barrier[0][1] + E.barrier[1][1]) / 2),
		town: r.at(E.town[0], E.town[1]),
	};
};
const k = (t: number, tg: V3, az: number, el: number, dist: number, fov = 40): Key => ({t, v: [...tg, az, el, dist, fov]});
/** p moved D km along the horizontal view direction of a camera at azimuth az (and R km to its right) */
const ahead = (p: V3, az: number, D: number, R: number): V3 => {
	const a = (az * Math.PI) / 180;
	return [p[0] - Math.sin(a) * D + Math.cos(a) * R, p[1], p[2] - Math.cos(a) * D - Math.sin(a) * R];
};

const SHOTS: Record<Shot, (p: Pts) => Key[]> = {
	// «Italy. Etna is coming for a town.» — out of the globe (GlobeHop lands on this opening camera), tilting down onto the
	// whole flow seen from up-slope: vent low (by Atlas's stick), the town up top; a slow push down the valley
	A: ({mid, bar}) => [
		k(W(48), mix3(mid, bar, 0.15), 262, 78, 28),
		k(W(49) + 0.3, mix3(mid, bar, 0.25), 257, 50, 16),
		k(W(53), mix3(mid, bar, 0.38), 254, 43, 13),
		k(SA + XF + 0.3, mix3(mid, bar, 0.5), 252, 39, 10.5),
	],
	// a drone view from up-slope over the lava field, continuing A's direction: wide enough at first that the 10 m imagery
	// stays crisp (bank, front, the country toward the town), then a slow push-in with a slight orbit onto the bank while
	// the pond fills and spills (the lava running on beyond it stays in view)
	B: (p) => [
		// (QA 18.10: higher and wider than before — at 1.75 km the 10 m imagery smeared and the bank read as a log)
		k(SA - 0.2, ahead(p.wall, 224, 0.29, 0.05), 224, 54, 3.5, 34),
		k(W(59) + 0.03, ahead(p.wall, 228, 0.165, 0.02), 228, 51, 3.0, 34),
		k(SB + XF + 0.3, ahead(p.wall, 232, 0.09, 0.01), 232, 48, 2.6, 34),
	],
	// up at the source, looking up the tube to the vent; after the blast a slow pull-back shows the old channel going dark
	// and the new one opening (runs on under the dissolve to the town photo)
	C: (p) => [
		k(SB - 0.3, mix3(p.tube, p.tEnd, 0.12), 63, 40, 2.9, 36),
		k(BLAST, mix3(p.tube, p.tEnd, 0.16), 60, 41, 2.75, 36),
		k(W(71) + XF + 0.3, mix3(p.tube, p.tEnd, 0.3), 55, 46, 3.9, 36),
	],
};

const keysCache = new Map<string, Key[]>();
const camOf =
	(shot: Shot) =>
	(r: Region, t: number): Cam => {
		const id = r.name + shot;
		let keys = keysCache.get(id);
		if (!keys) {
			keys = SHOTS[shot](pts(r));
			keysCache.set(id, keys);
		}
		const v = spline(keys, t);
		return orbit({target: [v[0], v[1], v[2]], az: v[3], el: v[4], dist: v[5], fov: v[6]});
	};

// ------------------------------------------------------------------------------------------- 3D scene (own wrapper)
// = Scene3D (common.tsx) for Etna, plus per-shot lava look / bloom, the camera handed to the children, and near plane and fog
// scaled with the camera distance (depth precision for the coast vs the sea plane when the camera is high)
const LOOK = LOOKS.etna;

const EtnaScene: React.FC<{
	shot: Shot;
	hl?: (r: Region, t: number) => Highlight | null;
	children?: (r: Region, t: number, cam: Cam) => React.ReactNode;
	overlay?: (r: Region, cam: Cam, t: number) => React.ReactNode;
}> = ({shot, hl, children, overlay}) => {
	const t = useCurrentFrame() / FPS;
	const r = useRegion('etna');
	const w = useRegion('etna_wide');
	if (!r || !w) return null;
	const C = camOf(shot)(r, t);
	const d = Math.hypot(C.pos[0] - C.target[0], C.pos[1] - C.target[1], C.pos[2] - C.target[2]);
	const near = Math.max(0.02, Math.min(1.0, d * 0.0015));
	const L = {...LOOK.terrain, fogDens: LOOK.terrain.fogDens * Math.min(1, 30 / d)};
	const LV = lavaOf(shot)(t);
	return (
		<AbsoluteFill>
			<Stage3D cam={C} post={POST[shot]} near={near}>
				<Sky look={LOOK.sky} />
				<Ocean region={r} look={L} time={t} prog={LV.prog} cool={LV.cool} glow={LV.gain} horizon={LOOK.sky.horizon} sky={LOOK.sky} />
				<TerrainMesh key={w.name} region={w} frame={r} inner={r} level={1} outer look={L} time={t} />
				<TerrainMesh region={r} look={L} time={t} lava={LV} hl={hl?.(r, t) ?? null} berm={null} />
				{children?.(r, t, C)}
			</Stage3D>
			{overlay ? <AbsoluteFill>{overlay(r, C, t)}</AbsoluteFill> : null}
		</AbsoluteFill>
	);
};

// the town's footprint glows softly while its name is up (no pulsing)
const townGlow = (r: Region, t: number): Highlight | null => {
	const o = easeInOut(clamp01((t - W(53)) / 0.5)) * (1 - easeInOut(clamp01((t - SA + 0.2) / 0.5)));
	if (o <= 0.001) return null;
	const [x, z] = r.geo(E.town[0], E.town[1]);
	return {x, z, r: 1.0, strength: 0.65 * o, color: '#ff3a5a'};
};

// --------------------------------------------------------------------------------------- the bank + the lava pond
type WallGeo = {L: number; yc: number; level0: number; at: (s: number, u: number) => [number, number]; flip: boolean};
const wallCache = new Map<string, WallGeo>();
const wallOf = (r: Region): WallGeo => {
	const c = wallCache.get(r.name);
	if (c) return c;
	const [ax, az] = r.geo(WALL[0][0], WALL[0][1]);
	const [bx, bz] = r.geo(WALL[1][0], WALL[1][1]);
	const L = Math.hypot(bx - ax, bz - az);
	const sx = (bx - ax) / L;
	const sz = (bz - az) / L;
	// u = across the bank, + = downstream (east)
	const flip = sz < 0;
	const ux = flip ? -sz : sz;
	const uz = flip ? sx : -sx;
	const at = (s: number, u: number): [number, number] => [ax + sx * s + ux * u, az + sz * s + uz * u];
	const yc = (WALL_CREST_M / 1000) * r.exag;
	let lo = Infinity;
	for (let i = 0; i <= 40; i++) {
		const [x, z] = at(lerp(0.12, 0.92, i / 40) * L, -0.03);
		lo = Math.min(lo, r.ground(x, z));
	}
	const g: WallGeo = {L, yc, level0: lo + 0.004, at, flip: ux * sz - uz * sx < 0};
	wallCache.set(r.name, g);
	return g;
};

const softplus = (x: number, k: number) => k * Math.log(1 + Math.exp(x / k));

/** grid over (s along the bank, u across it) with per-vertex attributes; triangles wound to face up */
const gridGeom = (wl: WallGeo, s0: number, s1: number, u0: number, u1: number, NS: number, NU: number, fill: (s: number, u: number, x: number, z: number, i: number) => void) => {
	const n = (NS + 1) * (NU + 1);
	const pos = new Float32Array(n * 3);
	for (let j = 0; j <= NS; j++)
		for (let i = 0; i <= NU; i++) {
			const q = j * (NU + 1) + i;
			const s = lerp(s0, s1, j / NS);
			const u = lerp(u0, u1, i / NU);
			const [x, z] = wl.at(s, u);
			pos[q * 3] = x;
			pos[q * 3 + 2] = z;
			fill(s, u, x, z, q);
		}
	const idx: number[] = [];
	for (let j = 0; j < NS; j++)
		for (let i = 0; i < NU; i++) {
			const a = j * (NU + 1) + i;
			const b = a + 1;
			const c = a + NU + 1;
			const d = c + 1;
			if (!wl.flip) idx.push(a, c, b, b, c, d);
			else idx.push(a, b, c, b, d, c);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setIndex(idx);
	return g;
};

const LIGHT_U = /* glsl */ `
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunI; uniform vec3 uSkyCol; uniform vec3 uGroundCol; uniform float uAmbI;
uniform vec3 uFogCol; uniform float uFogDens; uniform float uFogMax; uniform float uSatGain; uniform float uSaturation; uniform float uContrast;
uniform sampler2D uSat; uniform sampler2D uLava; uniform sampler2D uEdge; uniform vec2 uWK;
uniform float uProg; uniform float uGain; uniform float uNoise; uniform float uTime; uniform float uAA; uniform float uCool;
`;

// the same crust as TerrainMesh's lavaLayer (channel R, hot): world-space plates, AA cracks, molten lanes → identical
// pattern where the pond meets the draped lava of the terrain
const CRUST = /* glsl */ `
${NOISE}
${LAVA_RAMP}
vec2 crustHeat(vec2 xz, float age, float e, float k, float cool){
	vec2 p = xz * uNoise;
	float fw = length(fwidth(p));
	float lod = smoothstep(0.12, 0.5, fw);
	vec2 drift = vec2(0.0, -uTime * 0.04) * (1.0 - cool);
	vec2 q = p + vec2(fbm(p * 0.35 + 1.7 + k), fbm(p * 0.35 + 8.3 - k)) * 2.6;
	float n = fbm(q * 0.3 + drift + k * 13.0);
	float n2 = mix(fbm(p * 1.9 + 3.1 + k), 0.5, smoothstep(0.15, 0.45, fw * 1.9));
	float c1 = cracks(q * 0.7 + k * 7.0);
	float c2 = cracks(q * 2.1 + 11.0 + k);
	float px1 = length(fwidth(q * 0.7)); float px2 = length(fwidth(q * 2.1));
	float l1 = 1.0 - smoothstep(0.015, 0.075 + px1 * uAA, c1);
	float l2 = 1.0 - smoothstep(0.01, 0.06 + px2 * uAA, c2);
	l1 = mix(l1, mix(0.09, l1, 1.0 - smoothstep(0.04, 0.12, px1)), uAA);
	l2 = mix(l2, mix(0.07, l2, 1.0 - smoothstep(0.03, 0.09, px2)), uAA);
	float crackLine = max(l1, 0.75 * l2);
	float front = 1.0 - smoothstep(0.0, 0.022, age);
	float chan = smoothstep(0.58, 0.78, n);
	float core = smoothstep(0.12, 0.85, e);
	float crust = smoothstep(0.0, 0.09, age) * (1.0 - chan) * mix(1.0, 0.55, core * (1.0 - smoothstep(0.1, 0.4, age)));
	crust = max(crust, (1.0 - smoothstep(0.0, 0.28, e)) * 0.9 * smoothstep(0.0, 0.04, age));
	float hd = mix(0.86 + 0.1 * n2, 0.03 + 0.05 * n2, crust);
	hd = max(hd, crackLine * mix(0.8, 0.66, crust) * (0.85 + 0.15 * n2));
	vec2 pl = xz * 7.0;
	float nL = fbm(pl + vec2(fbm(pl * 0.5 + k), fbm(pl * 0.5 + 4.1)) * 1.6 + k * 5.0);
	float ha = mix(0.34, 0.8, core) - smoothstep(0.0, 0.09, age) * 0.12 + (nL - 0.5) * 0.3;
	float heat = mix(hd, ha, lod);
	heat = max(heat, front * 0.93);
	float cooled = crackLine * 0.3 * (1.0 - 0.6 * cool) * smoothstep(0.35, 0.65, n2) * (1.0 - lod * 0.8);
	heat = mix(heat, cooled, smoothstep(0.0, 0.7, cool));
	heat *= 1.0 - 0.06 * (1.0 - cool) * (0.5 + 0.5 * sin(uTime * 1.6 + n * 9.0));
	return vec2(clamp(heat, 0.0, 1.0), lod);
}
vec2 regionUv(vec3 w){ return vec2(w.x / uWK.x + 0.5, 0.5 - w.z / uWK.y); }
vec3 fogged(vec3 col, vec3 w, float lava){
	float f = (1.0 - exp(-length(cameraPosition - w) * uFogDens)) * uFogMax;
	return mix(col, uFogCol, f * (1.0 - lava * 0.6));
}
`;

// where the overflowing lava has got to: from the pond's waterline up the face, over the crest, down the far face; lobed
// along the bank (two slow sine trains), the same in the vertex shader (bulge) and the fragment shader (colour)
const OVER = /* glsl */ `
uniform float uYc; uniform float uWc; uniform float uS; uniform float uOver; uniform float uLevel;
float overOn(float u, float s){
	float uL = -(uWc + max(0.0, uYc - uLevel) / uS);
	float reach = uOver * (uWc + 0.075 - uL);
	float lob = sin(s * 47.0 + uTime * 0.9) * 0.009 + sin(s * 19.0 - uTime * 0.5 + 1.3) * 0.007;
	return smoothstep(reach + 0.004, reach - 0.004, u - uL + lob) * step(uL - 0.002, u) * step(0.0005, uOver);
}
float overAge(float u){
	float uL = -(uWc + max(0.0, uYc - uLevel) / uS);
	return max(0.0, uOver * (uWc + 0.075 - uL) - (u - uL));
}`;

const WALL_VS = /* glsl */ `
attribute float aU; attribute float aS; attribute float aG;
uniform sampler2D uLava; uniform vec2 uWK; uniform float uTime;
varying vec3 vW; varying vec3 vN; varying float vU; varying float vS; varying float vG;
${OVER}
void main(){
	vU = aU; vS = aS; vG = aG;
	vec4 w = modelMatrix * vec4(position, 1.0);
	// the spilling lava is a thick tongue on the bank, not paint
	float inFlow = 1.0 - smoothstep(0.95, 0.99, textureLod(uLava, vec2(w.x / uWK.x + 0.5, 0.5 - w.z / uWK.y), 0.0).r);
	w.y += 0.006 * overOn(aU, aS) * inFlow;
	vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const WALL_FS = /* glsl */ `
${LIGHT_U}
uniform float uPool;
varying vec3 vW; varying vec3 vN; varying float vU; varying float vS; varying float vG;
${CRUST}
${OVER}
void main(){
	vec3 N = normalize(vN);
	vec2 uv = regionUv(vW);
	vec3 sat = texture(uSat, uv).rgb;
	float lum = dot(sat, vec3(0.2126, 0.7152, 0.0722));
	sat = mix(vec3(lum), sat, uSaturation);
	sat = pow(max(sat, 0.0), vec3(uContrast)) * uSatGain;
	// bulldozed volcanic earth with track lines along the bank (faded before they get thinner than a pixel)
	float hgt = vW.y - vG;
	float bank = smoothstep(0.0015, 0.008, hgt);
	float n = fbm(vW.xz * 160.0);
	float fwT = fwidth(vU) / 0.005;
	float tracks = 1.0 + 0.05 * sin(vU / 0.005 * 6.2832 + fbm(vec2(vS * 30.0, 0.5)) * 4.0) * (1.0 - smoothstep(0.25, 0.7, fwT));
	float clod = fbm(vW.xz * 520.0 + vec2(vS * 3.0, 0.0));
	vec3 earth = mix(vec3(0.14, 0.11, 0.085), vec3(0.27, 0.21, 0.155), n) * tracks * mix(0.8, 1.15, mix(clod, 0.5, smoothstep(0.3, 0.8, length(fwidth(vW.xz * 520.0)))));
	earth *= 1.0 + 0.2 * (1.0 - smoothstep(uWc * 0.8, uWc * 1.4, abs(vU)));
	vec3 alb = mix(sat, earth, bank);
	vec3 L = normalize(uSunDir);
	float ndl = max(dot(N, L), 0.0);
	vec3 hemi = mix(uGroundCol, uSkyCol, N.y * 0.5 + 0.5) * uAmbI;
	vec3 col = alb * (uSunCol * uSunI * ndl + hemi) * mix(0.75, 1.0, smoothstep(0.0, 0.012, hgt));
	// the lava field in front lights the up-slope face from below (warm bounce, strongest near the foot)
	col += alb * vec3(1.0, 0.32, 0.1) * 1.6 * uGain * (1.0 - smoothstep(-0.03, 0.0, vU)) * exp(-max(hgt, 0.0) / 0.03) * bank;
	// lava climbing out of the pond, over the crest and down the far face (lobed front, fresh and hot at the front)
	float a = texture(uLava, uv).r;
	float inFlow = 1.0 - smoothstep(0.95, 0.99, a);
	float on = overOn(vU, vS) * inFlow;
	float e = texture(uEdge, uv).r;
	vec2 hl = crustHeat(vW.xz, overAge(vU) * 0.35, max(e, 0.5), 0.0, uCool * 0.6);
	vec3 emis = lavaRamp(hl.x) * uGain * on * mix(1.0, 0.62, hl.y);
	vec3 basalt = vec3(0.018, 0.014, 0.016) * (0.6 + ndl);
	col = mix(col, basalt, on) + emis;
	// the pond lights the face just above it
	float above = vW.y - uLevel;
	float glow = (1.0 - on) * step(0.0, above) * exp(-above / 0.006) * uPool * (1.0 - step(0.0, vU)) * inFlow;
	col += vec3(1.0, 0.28, 0.07) * glow * 0.7 * uGain;
	gl_FragColor = vec4(fogged(col, vW, on), 1.0);
}`;

const POOL_VS = /* glsl */ `
attribute float aU; attribute float aG;
varying vec3 vW; varying float vU; varying float vG;
void main(){ vU = aU; vG = aG; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const POOL_FS = /* glsl */ `
${LIGHT_U}
uniform float uFaceU; uniform float uPool; uniform float uLevel;
varying vec3 vW; varying float vU; varying float vG;
${CRUST}
void main(){
	vec2 uv = regionUv(vW);
	float a = texture(uLava, uv).r;
	if (a > 0.985) discard;
	float wob = fbm(vW.xz * uNoise * 0.09) - 0.5;
	float e = texture(uEdge, uv).r;
	vec2 hl = crustHeat(vW.xz, max(uProg - (a + wob * 0.012), 0.0), e, 0.0, uCool);
	// lava pressed against the bank churns: a hotter band along the face
	float face = exp(-max(0.0, uFaceU - vU) / 0.014) * uPool;
	float heat = max(hl.x, face * 0.6);
	vec3 L = normalize(uSunDir);
	vec3 col = vec3(0.018, 0.014, 0.016) * (0.6 + max(L.y, 0.0)) + lavaRamp(heat) * uGain * mix(1.0, 0.62, hl.y);
	// soft shoreline: where the pond is shallow the draped lava of the terrain shows through (no hard, mesh-stepped edge)
	float a0 = smoothstep(0.004, 0.016, uLevel - vG);
	gl_FragColor = vec4(fogged(col, vW, 1.0), a0);
}`;

const APRON_VS = /* glsl */ `
attribute float aU;
varying vec3 vW; varying float vU;
void main(){ vU = aU; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const APRON_FS = /* glsl */ `
${LIGHT_U}
uniform float uWc;
varying vec3 vW; varying float vU;
${CRUST}
void main(){
	vec2 uv = regionUv(vW);
	float a = texture(uLava, uv).r;
	float wob = fbm(vW.xz * uNoise * 0.09) - 0.5;
	a += wob * 0.012;
	float on = smoothstep(uProg + 0.002, uProg - 0.01, a) * step(a, 0.98) * smoothstep(uWc * 0.5, uWc * 1.5, vU);
	if (on < 0.003) discard;
	// a young, narrow tongue: shaded as channel core with a little less crust than the field, so it reads as the same
	// glowing lava (not the pink of a half-molten core)
	vec2 hl = crustHeat(vW.xz, max(uProg - a, 0.0), max(texture(uEdge, uv).r, 0.9), 0.0, uCool);
	vec3 L = normalize(uSunDir);
	vec3 col = vec3(0.018, 0.014, 0.016) * (0.6 + max(L.y, 0.0)) + lavaRamp(hl.x) * uGain * mix(1.0, 0.62, hl.y);
	gl_FragColor = vec4(fogged(col, vW, 1.0), on);
}`;

/** the region's own DEM vertices and triangle split (as TerrainMesh's PlaneGeometry) over an x/z box, lifted `lift` km:
 *  lies exactly parallel to the terrain's facets, so nothing pokes through or gets cut at a grazing view. `aU(x, z)` fills
 *  a per-vertex attribute. */
const demPatch = (r: Region, box: [number, number, number, number], lift: number, aUOf?: (x: number, z: number) => number) => {
	const {nx, ny} = r.meta;
	const col = (x: number) => (x / r.wKm + 0.5) * (nx - 1);
	const row = (z: number) => (z / r.hKm + 0.5) * (ny - 1);
	const i0 = Math.max(0, Math.floor(col(box[0])));
	const i1 = Math.min(nx - 1, Math.ceil(col(box[1])));
	const j0 = Math.max(0, Math.floor(row(box[2])));
	const j1 = Math.min(ny - 1, Math.ceil(row(box[3])));
	const W1 = i1 - i0 + 1;
	const H1 = j1 - j0 + 1;
	const pos = new Float32Array(W1 * H1 * 3);
	const aU = new Float32Array(W1 * H1);
	for (let j = 0; j < H1; j++)
		for (let i = 0; i < W1; i++) {
			const q = j * W1 + i;
			const x = -r.wKm / 2 + ((i0 + i) * r.wKm) / (nx - 1);
			const z = -r.hKm / 2 + ((j0 + j) * r.hKm) / (ny - 1);
			pos[q * 3] = x;
			pos[q * 3 + 1] = (Math.max(r.heights[(j0 + j) * nx + i0 + i], 0) / 1000) * r.exag + lift;
			pos[q * 3 + 2] = z;
			aU[q] = aUOf ? aUOf(x, z) : 0;
		}
	const idx: number[] = [];
	for (let j = 0; j < H1 - 1; j++)
		for (let i = 0; i < W1 - 1; i++) {
			const a = i + W1 * j;
			const b = i + W1 * (j + 1);
			const c = i + 1 + W1 * (j + 1);
			const d = i + 1 + W1 * j;
			idx.push(a, b, d, b, c, d);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
	g.setIndex(idx);
	return g;
};

/** the apron beyond the bank: a box around it in x/z, aU = distance across the bank (+ downstream) */
const apronGeom = (r: Region, wl: WallGeo, s0: number, s1: number, u0: number, u1: number) => {
	const corners = [wl.at(s0, u0), wl.at(s1, u0), wl.at(s0, u1), wl.at(s1, u1)];
	const [ax, az] = wl.at(0, 0);
	const [bx, bz] = wl.at(0, 1);
	const box: [number, number, number, number] = [Math.min(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1])), Math.max(...corners.map((c) => c[1]))];
	return demPatch(r, box, 0.0015, (x, z) => (x - ax) * (bx - ax) + (z - az) * (bz - az));
};

/** blast shock ring running over the ground (a flat ring quad was cut off by the valley slope) */
const RING_FS = /* glsl */ `
uniform vec2 uC; uniform float uR; uniform float uA; uniform sampler2D uLava; uniform vec2 uWK;
varying vec3 vW; varying vec3 vN;
void main(){
	float d = distance(vW.xz, uC);
	float ring = exp(-pow((d - uR) / (0.012 + uR * 0.03), 2.0)) + 0.05 * exp(-pow((d - uR * 0.8) / (uR * 0.2 + 0.01), 2.0));
	// only over the (flat) lava floor: on the valley walls a ring in plan view smears into bright vertical bands
	float level = smoothstep(0.55, 0.8, normalize(vN).y);
	float inFlow = 1.0 - smoothstep(0.9, 0.99, texture(uLava, vec2(vW.x / uWK.x + 0.5, 0.5 - vW.z / uWK.y)).r);
	gl_FragColor = vec4(vec3(1.0, 0.82, 0.54) * ring * uA * 0.9 * level * inFlow, 1.0);
}`;
const RING_VS = /* glsl */ `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }`;

const GroundRing: React.FC<{r: Region; c: V3; t: number; radius: number}> = ({r, c, t, radius}) => {
	const built = useMemo(() => {
		const pad = radius * 1.15;
		// lifted above the draped lava (thick 6 m) of this shot
		const geom = demPatch(r, [c[0] - pad, c[0] + pad, c[2] - pad, c[2] + pad], 0.009);
		geom.computeVertexNormals();
		const mat = new THREE.ShaderMaterial({
			vertexShader: RING_VS,
			fragmentShader: RING_FS,
			uniforms: {uC: {value: new THREE.Vector2(c[0], c[2])}, uR: {value: 0}, uA: {value: 0}, uLava: {value: r.lava}, uWK: {value: new THREE.Vector2(r.wKm, r.hKm)}},
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		return {geom, mat};
	}, [r, c[0], c[2], radius]); // eslint-disable-line react-hooks/exhaustive-deps
	if (t < 0 || t > 0.85) return null;
	built.mat.uniforms.uR.value = radius * (1 - Math.exp(-t * 4.5));
	built.mat.uniforms.uA.value = Math.max(0, 1 - t / 0.85) ** 2;
	return <mesh geometry={built.geom} material={built.mat} frustumCulled={false} renderOrder={6} />;
};

const lightUniforms = (r: Region) => ({
	uSunDir: {value: new THREE.Vector3(...LOOK.terrain.sunDir).normalize()},
	uSunCol: {value: new THREE.Color(LOOK.terrain.sunCol)},
	uSunI: {value: LOOK.terrain.sunI},
	uSkyCol: {value: new THREE.Color(LOOK.terrain.skyCol)},
	uGroundCol: {value: new THREE.Color(LOOK.terrain.groundCol)},
	uAmbI: {value: LOOK.terrain.ambI},
	uFogCol: {value: new THREE.Color(LOOK.terrain.fogCol)},
	uFogDens: {value: LOOK.terrain.fogDens},
	uFogMax: {value: LOOK.terrain.fogMax},
	uSatGain: {value: LOOK.terrain.satGain},
	uSaturation: {value: LOOK.terrain.saturation},
	uContrast: {value: LOOK.terrain.contrast},
	uSat: {value: r.sat},
	uLava: {value: r.lava},
	uEdge: {value: r.lavaEdge},
	uWK: {value: new THREE.Vector2(r.wKm, r.hKm)},
	uProg: {value: 0},
	uGain: {value: 0.5},
	uNoise: {value: 70},
	uTime: {value: 0},
	uAA: {value: 1},
	uCool: {value: 0},
});

const BankAndPond: React.FC<{r: Region; t: number; rise: number; over: number; level: number; pool: number; prog: number; apron: number; gain: number}> = ({r, t, rise, over, level, pool, prog, apron, gain}) => {
	const wl = wallOf(r);
	const built = useMemo(() => {
		const NS = 170;
		const NU = 64;
		const n = (NS + 1) * (NU + 1);
		const aU = new Float32Array(n);
		const aS = new Float32Array(n);
		const aG = new Float32Array(n);
		const full = new Float32Array(n);
		const wall = gridGeom(wl, -0.035, wl.L + 0.035, -0.11, 0.11, NS, NU, (s, u, x, z, q) => {
			const g = r.ground(x, z) - 0.003;
			const ds = Math.max(0, -s, s - wl.L);
			const d = Math.hypot(ds, u);
			// trapezoid with rounded shoulders; below the ground the flank keeps diving (capped 25 m under it), so the toe is
			// where the flank meets the terrain's own facets (a bank hugging the bilinear ground poked through them).
			// Pushed-up dirt is not machined: the crest wanders ±2 m, the shoulders and toe a few metres.
			const ns = Math.sin(s * 61 + 0.7) * 0.5 + Math.sin(s * 23.0 + 2.1) * 0.35 + Math.sin(s * 137 + u * 90) * 0.15;
			const nf = Math.sin(s * 41 + u * 160 + 1.1) * 0.5 + Math.sin(s * 97 - u * 70) * 0.5;
			const flank = wl.yc + 0.0018 * ns - WS * softplus(d - WC * (1 + 0.3 * ns) + 0.003 * nf * clamp01(d / 0.02), 0.0035);
			aU[q] = u;
			aS[q] = s;
			aG[q] = g + 0.003;
			full[q] = Math.max(flank, g - 0.025);
		});
		wall.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
		wall.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
		wall.setAttribute('aG', new THREE.BufferAttribute(aG, 1));
		const PS = 120;
		const PU = 60;
		const pU = new Float32Array((PS + 1) * (PU + 1));
		const pG = new Float32Array((PS + 1) * (PU + 1));
		// wider than the bank: the pond's own edges are the flow outline (masked) and the terrain rising out of it
		const pond = gridGeom(wl, -0.3, wl.L + 0.3, -0.3, -0.004, PS, PU, (_s, u, x, z, q) => {
			pU[q] = u;
			pG[q] = r.ground(x, z);
		});
		pond.setAttribute('aU', new THREE.BufferAttribute(pU, 1));
		pond.setAttribute('aG', new THREE.BufferAttribute(pG, 1));
		const wallMat = new THREE.ShaderMaterial({
			vertexShader: WALL_VS,
			fragmentShader: WALL_FS,
			uniforms: {...lightUniforms(r), uYc: {value: wl.yc}, uWc: {value: WC}, uS: {value: WS}, uOver: {value: 0}, uLevel: {value: 0}, uPool: {value: 0}},
		});
		const pondMat = new THREE.ShaderMaterial({
			vertexShader: POOL_VS,
			fragmentShader: POOL_FS,
			uniforms: {...lightUniforms(r), uFaceU: {value: 0}, uPool: {value: 0}, uLevel: {value: 0}},
			transparent: true,
		});
		const apron = apronGeom(r, wl, -0.1, wl.L + 0.1, 0, 0.45);
		const apronMat = new THREE.ShaderMaterial({
			vertexShader: APRON_VS,
			fragmentShader: APRON_FS,
			uniforms: {...lightUniforms(r), uWc: {value: WC}, uPool: {value: 0}},
			transparent: true,
			depthWrite: false,
		});
		return {wall, full, aG, wallMat, pond, pondMat, apron, apronMat, rise: -1};
	}, [r, wl]);
	if (built.rise !== rise) {
		const p = built.wall.getAttribute('position') as THREE.BufferAttribute;
		for (let q = 0; q < built.full.length; q++) {
			// the bank pushes up out of the ground (whole profile raised from below), toe line widening as it grows
			p.setY(q, Math.max(built.full[q] - (1 - rise) * 0.07, built.aG[q] - 0.025));
		}
		p.needsUpdate = true;
		built.wall.computeVertexNormals();
		built.rise = rise;
	}
	const faceU = -(WC + Math.max(0, wl.yc - level) / WS);
	for (const m of [built.wallMat, built.pondMat, built.apronMat]) {
		const u = m.uniforms;
		u.uProg.value = prog;
		u.uGain.value = gain;
		u.uTime.value = t;
		u.uPool.value = pool;
		u.uCool.value = COOL.B;
	}
	built.wallMat.uniforms.uOver.value = over;
	built.wallMat.uniforms.uLevel.value = level;
	built.pondMat.uniforms.uFaceU.value = faceU;
	built.pondMat.uniforms.uLevel.value = level;
	built.apronMat.uniforms.uProg.value = apron;
	return (
		<>
			{rise > 0.001 ? <mesh geometry={built.wall} material={built.wallMat} frustumCulled={false} renderOrder={1} /> : null}
			{pool > 0.001 ? <mesh geometry={built.pond} material={built.pondMat} position-y={level} frustumCulled={false} renderOrder={1} /> : null}
			{apron > WALL_P + 0.0005 ? <mesh geometry={built.apron} material={built.apronMat} frustumCulled={false} renderOrder={2} /> : null}
		</>
	);
};

/** dust kicked up along the crest while the bank rises (soft, brownish, lifted clear of the ground so no sprite edge cuts it) */
const bankDust = (t: number, wl: WallGeo, rise: number): BB[] => {
	const out: BB[] = [];
	const life = 1.5;
	for (let i = 0; i < 18; i++) {
		const s = wl.L * (0.06 + (0.88 * (i + 0.5)) / 18);
		const born = T_RISE[0] + 0.1 + h1(i * 3.1 + 0.4) * 0.55;
		const age = t - born;
		if (age < 0 || age > life) continue;
		const kk = age / life;
		const [x, z] = wl.at(s, (h1(i * 7.7) - 0.5) * 0.03);
		const size = 0.036 * (0.8 + 0.5 * h1(i + 9.1)) * (1 + 1.8 * kk);
		const yTop = lerp(wl.yc - 0.03, wl.yc, rise);
		const [dx, dz] = wl.at(0.02 * kk, 0.025 * kk);
		const [ox, oz] = wl.at(0, 0);
		out.push({x: x + dx - ox, y: yTop + size * 0.45 + 0.02 * Math.sqrt(kk), z: z + dz - oz, size, r: 0.3, g: 0.25, b: 0.2, a: 0.3 * clamp01(kk * 5) * (1 - kk) ** 1.5, rot: h1(i + 0.2) * 6.28 + age * 0.3, kind: 1, seed: h1(i + 0.3)});
	}
	return out;
};

// ------------------------------------------------------------------------------------------------------ the blast
const tubePts = (r: Region): V3[] =>
	E.tubePath.map(([la, lo]) => {
		const p = r.at(la, lo);
		return [p[0], p[1] - 0.004, p[2]] as V3;
	});

/** explosion with the flash and fireball drawn without depth test (a sprite cut by the slope showed a hard edge); the smoke
 *  rises and drifts with the wind and is kept dark (a static, glowing ball read as a lens smudge) */
const blastFx = (t: number, c: V3) => {
	const tau = t - BLAST;
	const e = explosion(tau, c, 0.13, 7);
	const add = e.add.map((b, i) => (i === 0 ? {...b, r: b.r * 0.45, g: b.g * 0.45, b: b.b * 0.45} : b));
	const norm = e.norm.map((b) =>
		b.kind === 1
			? {...b, x: b.x + 0.035 * tau, y: b.y + 0.045 * tau * tau, z: b.z - 0.02 * tau, r: b.r * 0.8, g: b.g * 0.8, b: b.b * 0.85, gr: (b.gr ?? 0) * Math.exp(-tau * 0.9), gg: (b.gg ?? 0) * Math.exp(-tau * 0.9), gb: 0}
			: b,
	);
	const smoke =
		tau > 0.3
			? plume(t, [c[0], c[1] + 0.03, c[2]], {n: 20, rise: 0.75, spread: 0.06, size: 0.16, grow: 2.0, seed: 33, life: 3.2, color: [0.09, 0.075, 0.075], alpha: 0.55, startAt: BLAST + 0.3, glow: [0.6, 0.12, 0.03], wind: [0.07, -0.035]})
			: [];
	return {add, norm: [...norm, ...smoke]};
};

/** «at the source»: the vent reads as the place the lava comes from — a soft, steady glow and a thin gas plume */
const ventGlow = (t: number, v: V3): BB[] => {
	const b = 1 + 0.05 * Math.sin(t * 2.4);
	return [
		{x: v[0], y: v[1] + 0.02, z: v[2], size: 0.16 * b, r: 1.6, g: 0.5, b: 0.12, a: 0.55, kind: 0},
		{x: v[0], y: v[1] + 0.012, z: v[2], size: 0.06, r: 3.2, g: 1.5, b: 0.4, a: 0.6, kind: 0},
	];
};
const ventGas = (t: number, v: V3): BB[] =>
	plume(t, [v[0], v[1] + 0.03, v[2]], {n: 14, rise: 0.45, spread: 0.035, size: 0.07, grow: 2.6, seed: 41, life: 4.2, color: [0.42, 0.36, 0.4], alpha: 0.22, glow: [0.5, 0.14, 0.03], wind: [0.05, -0.025]});

/** text-free marker: white dot with a soft shadow and one slow ring, fades in / out (marks where the charges go) */
const Dot: React.FC<{x: number; y: number; t0: number; t1: number}> = ({x, y, t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.25 || !Number.isFinite(x)) return null;
	const o = easeOut((t - t0) / 0.4) * clamp01((t1 + 0.25 - t) / 0.25);
	const ph = ((t - t0) % 1.8) / 1.8;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o, pointerEvents: 'none'}}>
			<circle cx={x} cy={y} r={10 + 22 * ph} fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.65 * (1 - ph)} />
			<circle cx={x} cy={y} r={10} fill="#fff" style={{filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))'}} />
		</svg>
	);
};

// ------------------------------------------------------------------------------------------------------ the shots
// v5 pilot (owner 18.10): shot A is a stylized Blender render (tools/blender/etna_pilot.py → public/blender/etna_a): the whole
// cone with the flank eruption, the ash plume and the 1992 flow heading for Zafferana (real OSM houses). The town label follows
// the town's projected screen position (track.json from the same camera).
const TRACK_A = trackA as unknown as {t0: number; fps: number; frames: {town: [number, number]}[]};
const ShotABlender: React.FC = () => {
	const t = useT();
	const k = Math.max(0, Math.min(TRACK_A.frames.length - 1, Math.floor((t - TRACK_A.t0) * TRACK_A.fps)));
	const [tx, ty] = TRACK_A.frames[k].town;
	return (
		<AbsoluteFill>
			<ImgSeq dir="blender/etna_toon" t0={TRACK_A.t0} n={TRACK_A.frames.length} fps={TRACK_A.fps} />
			<Label text="Zafferana Etnea" x={tx} y={ty} anchor dy={-90} size={50} t0={W(53)} t1={SA - 0.15} />
		</AbsoluteFill>
	);
};
const ShotA3D: React.FC = () => (
	<EtnaScene
		shot="A"
		hl={townGlow}
		overlay={(r, cam) => {
			const town = P(cam, r.at(E.town[0], E.town[1]));
			// «… coming for a town.» → the town's name (the voice does not say it)
			return <Label text="Zafferana Etnea" x={town.x} y={town.y} anchor dy={-74} size={50} t0={W(53)} t1={SA - 0.15} />;
		}}
	/>
);

const ShotB: React.FC = () => (
	<EtnaScene
		shot="B"
		hl={townGlow}
		children={(r, t) => {
			const rise = easeInOut(clamp01((t - T_RISE[0]) / (T_RISE[1] - T_RISE[0])));
			const wl = wallOf(r);
			const kp = easeInOut(clamp01((t - T_POOL[0]) / (T_POOL[1] - T_POOL[0])));
			const level = lerp(wl.level0, wl.yc - 0.0025, kp);
			const over = easeInOut(clamp01((t - T_OVER[0]) / (T_OVER[1] - T_OVER[0])));
			const dust = bankDust(t, wl, rise);
			return (
				<>
					<BankAndPond r={r} t={t} rise={rise} over={over} level={level} pool={kp > 0 ? 1 : 0} prog={progR(t)} apron={progApron(t)} gain={GAIN.B} />
					{dust.length ? <Billboards max={40} blending="normal" items={dust} renderOrder={4} /> : null}
				</>
			);
		}}
	/>
);

const ShotC: React.FC = () => (
	<EtnaScene
		shot="C"
		children={(r, t) => {
			const tube = r.at(E.tube[0], E.tube[1]);
			const fx = blastFx(t, [tube[0], tube[1] + 0.02, tube[2]]);
			return (
				<>
					{/* the lava tube under the crust, shown x-ray style while «engineers blow up its tunnel» */}
					<XrayTube pts={tubePts(r)} radius={0.016} alpha={easeInOut(clamp01((t - W(62) - 0.2) / 0.5)) * (1 - clamp01((t - BLAST) / 0.2))} t={t} />
					<Billboards max={120} items={[...embers(t, r.at(E.vent[0], E.vent[1]), {n: 90, spread: 0.25, rise: 0.25, size: 0.008, seed: 6}), ...ventGlow(t, r.at(E.vent[0], E.vent[1]))]} />
					<Billboards max={24} blending="normal" items={ventGas(t, r.at(E.vent[0], E.vent[1]))} renderOrder={3} />
					{fx.add.length ? <Billboards max={160} items={fx.add} depthTest={false} renderOrder={7} /> : null}
					<Billboards max={120} blending="normal" items={fx.norm} renderOrder={4} />
					<GroundRing r={r} c={tube} t={t - BLAST} radius={0.45} />
				</>
			);
		}}
		overlay={(r, cam) => {
			const tube = P(cam, r.at(E.tube[0], E.tube[1]));
			// where the charges go: a plain dot, no text (the voice says it); gone before the flash
			return <Dot x={tube.x} y={tube.y} t0={SB + XF} t1={BLAST - 0.3} />;
		}}
	/>
);

export const Etna3D: React.FC<{skipA?: boolean}> = ({skipA}) => (
	<>
		{/* the Blender shot's camera differs from the globe's landing view → cross-dissolve (the three.js shot A matched it, fadeIn 0) */}
		{skipA ? null : (
			<Layer t0={W(48)} t1={SA} fadeIn={BLENDER_A ? XF : 0}>
				{BLENDER_A ? <ShotABlender /> : <ShotA3D />}
			</Layer>
		)}
		{/* v5 (owner 18.10): the two mechanisms as clear animated cutaway diagrams (src/scenes/EtnaDiagrams.tsx); they fade in
		    over XF on top of the previous shot and hold XF after their window like a Layer */}
		{DIAGRAMS ? <WallDiagram t0={SA} t1={SB} /> : (
			<Layer t0={SA} t1={SB}>
				<ShotB />
			</Layer>
		)}
		{DIAGRAMS ? <TunnelDiagram t0={SB} t1={W(71)} /> : (
			<Layer t0={SB} t1={W(71)}>
				<ShotC />
			</Layer>
		)}
	</>
);

// ---- «The town loses… one building.» — real photos: Zafferana Etnea today, then the end of the 1992 flow (both CC BY-SA 4.0)

const Credit: React.FC<{text: string; o: number}> = ({text, o}) =>
	o > 0.001 ? (
		<div style={{position: 'absolute', left: 32, maxWidth: 900, top: 1582, padding: '5px 12px', borderRadius: 10, background: 'rgba(8,3,20,0.55)', fontFamily: MONT, fontWeight: 700, fontSize: 22, lineHeight: 1.15, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.3, opacity: o}}>{text}</div>
	) : null;

/** flat house icon, its lower part swallowed by a lava tongue — no text («one building» is spoken) */
const LostHouse: React.FC<{t0: number; x: number; y: number}> = ({t0, x, y}) => {
	const t = useT();
	if (t < t0) return null;
	const kk = easeOut((t - t0) / 0.45);
	const flow = easeInOut(clamp01((t - t0 - 0.15) / 0.6));
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) translateY(${(1 - kk) * 16}px) scale(${lerp(0.92, 1, kk)})`, opacity: kk}}>
			<svg width={150} height={140} viewBox="0 0 150 140" style={{overflow: 'visible', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))'}}>
				<defs>
					<clipPath id="etna-house">
						<path d="M75 10 L140 66 L124 66 L124 128 L26 128 L26 66 L10 66 Z" />
					</clipPath>
				</defs>
				<path d="M75 10 L140 66 L124 66 L124 128 L26 128 L26 66 L10 66 Z" fill="#fff" />
				<rect x={63} y={88} width={24} height={40} rx={3} fill="#2a2030" />
				<g clipPath="url(#etna-house)">
					<path d={`M0 ${lerp(140, 104, flow)} Q 40 ${lerp(140, 92, flow)} 75 ${lerp(140, 100, flow)} T 150 ${lerp(140, 90, flow)} L150 140 L0 140 Z`} fill="#ff6a2a" />
				</g>
				<path d={`M0 ${lerp(140, 104, flow)} Q 40 ${lerp(140, 92, flow)} 75 ${lerp(140, 100, flow)} T 150 ${lerp(140, 90, flow)}`} fill="none" stroke="#ffb15a" strokeWidth={4} opacity={flow} clipPath="url(#etna-house)" />
			</svg>
		</div>
	);
};

export const EtnaTown: React.FC = () => {
	const t = useT();
	const t0 = W(71); // «The town loses…»
	const tSwap = W(74) - 0.32; // the flow-end photo is fully in on «one»
	const t1 = W(76); // «But Iceland» — the globe dissolves in on top
	if (t < t0 || t >= t1 + XF) return null;
	const inA = easeInOut((t - t0) / XF);
	const kB = clamp01((t - tSwap) / XF);
	const inB = easeInOut(kB);
	return (
		<AbsoluteFill style={{opacity: inA}}>
			{t < tSwap + XF ? <PhotoKB src="photos/zafferana_town_2017.jpg" t0={t0} t1={tSwap + XF} from={[1.3, 50, 0]} to={[1.36, 0, -16]} grade="contrast(1.1) saturate(1.2)" tint="rgba(60,20,110,0.10)" pos="22% 50%" /> : null}
			{t >= tSwap ? (
				<AbsoluteFill style={{opacity: inB}}>
					<PhotoKB src="photos/etna_1992_flow_end_2016.jpg" t0={tSwap} t1={t1 + XF} from={[1.02, 0, 16]} to={[1.08, 0, -10]} grade="contrast(1.12) saturate(1.15) brightness(0.92)" tint="rgba(60,20,110,0.12)" />
				</AbsoluteFill>
			) : null}
			{/* one caption that names the photo (the voice only says «the town») */}
			<Label text="Zafferana Etnea" x={650} y={560} size={54} t0={t0 + 0.2} t1={tSwap - 0.15} />
			{/* the flow-end photo: one simple icon, no text (the voice says «one building») */}
			<LostHouse t0={W(74) - 0.02} x={540} y={1110} />
			{/* credits: one at a time — the old one is gone before the new one fades in */}
			<Credit text="Photo 2017 · Rabe!, CC BY-SA 4.0" o={1 - clamp01(kB * 2)} />
			<Credit text="Photo 2016 · Wittylama, CC BY-SA 4.0" o={clamp01(kB * 2 - 1)} />
		</AbsoluteFill>
	);
};
