import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, getInputProps, staticFile} from 'remotion';
import * as THREE from 'three';
import {GEO} from '../data/geo';
import {W} from '../lib/time';
import {type Cam, type Orbit, type V3} from '../three/cam';
import {dirLL, SPACE} from '../three/Globe';
import {LOOKS} from '../three/looks';
import {HAWAII_SEA_SKY, hawaiiACam, hawaiiALook} from './Hawaii';
import {iceACamOrbit, iceALook, iceASky} from './Iceland';
import {useRegion, type Region, type RegionName} from '../three/region';
import {Sky} from '../three/Sky';
import {Stage3D} from '../three/Stage3D';
import type {Look} from '../three/TerrainMesh';
import {clamp01, lerp, useT, XF} from '../ui/gfx';

// Globe hop (v4, owner notes 18.10 + review r0). No text on the globe — the voice names the year and the place; only our
// glowing marker and arc. One continuous spin-and-dive along a van Wijk–Nuij zoom-pan path that LANDS EXACTLY ON THE NEXT
// SHOT'S OPENING CAMERA: from the moment the next 3D layer starts dissolving in (`t3d`), the globe camera IS that shot's
// camera (same target, azimuth, elevation, distance, fov, converted from the region's km frame onto the sphere), and the
// dive arrives there with the same speed, so both layers move together through the whole cross-dissolve.
// The globe is drawn by its own ray-cast Earth shader (src/three/Globe.tsx's look for the globe itself): the sphere is
// intersected exactly per pixel (no tessellation error at 5 km frames), the next shot's satellite mosaics are part of the
// Earth surface (lit, tone-mapped and vignetted with it, under the arc), with the DEM relief ray-marched so mountains sit
// where the 3D terrain puts them, and in the last part of the dive the colours turn into the next shot's own terrain/sea
// look (same formulas and LOOKS values as TerrainMesh/Ocean), so the dissolve blends two nearly identical pictures.
// The screen orientation is carried along the path without turning (parallel transport: flying over the pole does not spin
// the picture); only a gentle turn onto the opening camera's heading is eased in. Close in, the 8k globe outside the
// mosaics is blurred (no JPEG blocks) and sinks into a dark vignette. The arc keeps a constant width on screen, rises out of
// the limb in one piece and fades out once it has arrived.
// Checked 18.10: globe vs 3D inside the dissolves ≤ 1 px apart (SIFT), mean colour difference ≤ 4/255.

type LL = [number, number];

const R_KM = 6371;
const DEG = Math.PI / 180;
const ASP = 1080 / 1920;
/** globe fov (vertical, deg) while the whole Earth is in view */
const FOV = 34;
const widthOf = (dist: number, fov: number) => 2 * dist * Math.tan((fov / 2) * DEG) * ASP;
const distOf = (w: number, fov: number) => w / (2 * Math.tan((fov / 2) * DEG) * ASP);

// ---------------------------------------------------------------------------------------------------------- vectors
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => scale(a, 1 / len(a));
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const angle = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
const slerp = (a: V3, b: V3, k: number): V3 => {
	const th = angle(a, b);
	if (th < 1e-9) return a;
	const s = Math.sin(th);
	return add(scale(a, Math.sin((1 - k) * th) / s), scale(b, Math.sin(k * th) / s));
};
const ss = (a: number, b: number, x: number) => {
	const k = clamp01((x - a) / (b - a));
	return k * k * (3 - 2 * k);
};
const sss = (a: number, b: number, x: number) => {
	const k = clamp01((x - a) / (b - a));
	return k * k * k * (k * (k * 6 - 15) + 10);
};
/** cubic Hermite from (ta, va, slope 0) to (tb, vb, slope mb); constant before ta */
const herm = (ta: number, tb: number, va: number, vb: number, mb: number, t: number) => {
	if (t <= ta) return va;
	const h = tb - ta;
	const u = Math.min(1, (t - ta) / h);
	const u2 = u * u;
	const u3 = u2 * u;
	return (2 * u3 - 3 * u2 + 1) * va + (-2 * u3 + 3 * u2) * vb + (u3 - u2) * h * mb;
};
/** Rodrigues: v rotated by ang (rad) about the unit axis k */
const rotAbout = (v: V3, k: V3, ang: number): V3 => {
	const c = Math.cos(ang);
	const sn = Math.sin(ang);
	return add(add(scale(v, c), scale(cross(k, v), sn)), scale(k, dot(k, v) * (1 - c)));
};
/** heading (deg, clockwise from north) of a tangent direction at g */
const headingAt = (U: V3, g: V3) => {
	const {e, u, s} = {e: norm([g[2], 0, -g[0]] as V3), u: g, s: [0, 0, 0] as V3};
	void s;
	const n = cross(u, e);
	return Math.atan2(dot(U, e), dot(U, n)) / DEG;
};
const wrap180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
const mercLat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
const mercLon = (x: number) => x * 360 - 180;

// ------------------------------------------------------------------------- the next shots' opening cameras (ports)
// Hawaii.tsx and Iceland.tsx export their opening camera + look (hawaiiACam / hawaiiALook, iceACamOrbit / iceALook) and are
// imported. Etna.tsx does not (yet): its first camera keys, spline and fog rule are replicated here — keep them in step with
// SHOTS.A + spline + EtnaScene, or export them there and import them here like the other two.

/** Etna.tsx spline (monotone cubic, Fritsch–Carlson) + SHOTS.A + EtnaScene fog (18.10 13:05) */
type EK = {t: number; v: number[]};
const etnaSpline = (keys: EK[], t: number): number[] => {
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
const etnaKeysCache = new Map<string, EK[]>();
const etnaCam = (r: Region, t: number): Orbit => {
	let keys = etnaKeysCache.get(r.name);
	if (!keys) {
		const E = GEO.etna;
		const mid = r.at(E.mid[0], E.mid[1]);
		const bar = r.at((E.barrier[0][0] + E.barrier[1][0]) / 2, (E.barrier[0][1] + E.barrier[1][1]) / 2);
		const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
		const k = (tt: number, tg: V3, az: number, el: number, dist: number, fov = 40): EK => ({t: tt, v: [...tg, az, el, dist, fov]});
		const SA = W(55) + 0.1;
		keys = [k(W(48), mix3(mid, bar, 0.15), 262, 78, 28), k(W(49) + 0.3, mix3(mid, bar, 0.25), 257, 50, 16), k(W(53), mix3(mid, bar, 0.38), 254, 43, 13), k(SA + XF + 0.3, mix3(mid, bar, 0.5), 252, 39, 10.5)];
		etnaKeysCache.set(r.name, keys);
	}
	const v = etnaSpline(keys, t);
	return {target: [v[0], v[1], v[2]], az: v[3], el: v[4], dist: v[5], fov: v[6]};
};

// ------------------------------------------------------------------------------- destinations (next 3D shot)
type PatchDef = {name: RegionName; feather: number; /** shown in the globe-style phase (same imagery family as the outer one) */ globe: boolean; /** fade-in: frame widths (km) */ fade: [number, number]};
type Dest = {
	key: LL;
	/** start of the next shot's Layer = start of the cross-dissolve; from here the globe camera is that shot's camera */
	t3d: number;
	/** the next shot's camera in its region's km frame (region = patches[1]) */
	cam: (r: Region, t: number) => Orbit;
	patches: [PatchDef, PatchDef];
	/** the next shot's terrain look: LOOKS key + its overrides (time, camera distance km) and the sky horizon colour */
	look: string;
	lookAt: (t: number, dist: number) => Partial<Look>;
	horizonAt: (t: number) => string;
	/** frame widths (km) over which the colours turn into the next shot's look */
	kW: [number, number];
	/** globe-style colour match: gain on the patch (whole patch / at its feathered edge), flat globe sea inside the patch */
	gain: V3;
	gainEdge: V3;
	seaGlobe: V3;

	/** path: max spin (deg), start width (km), van Wijk–Nuij rho, speed profile (start fraction, ease-in end, ease-out start) */
	spin: number;
	w0: number;
	rho: number;
	prof: [number, number, number];
	/** start orientation: 0 = north up, 1 = already the opening camera's heading carried back along the path (no turn) */
	h0: number;
	/** close in, the globe's land outside the mosaics melts into the sea (instead of a dark vignette) */
	outSea?: boolean;
	/** frame widths (km) over which the land outside the mosaics sinks into the vignette */
	outW?: [number, number];
	/** the globe-style sea replacement reaches this far (in half-sizes) beyond the outer mosaic (isolated islands) */
	seaExt?: number;
	/** start heading (deg) instead of h0 */
	head0?: number;
	/** heading (deg) the carried screen-up has on arrival (instead of h0); the rest of the turn is eased in */
	hArrive?: number;
	/** arc height (globe radii) instead of the length-based default */
	arcH?: number;
	/** arc drawn over these fractions of the hop (time) instead of following the camera's pan */
	arcT?: [number, number];
	/** dive onto the night side: the camera-relative sun swings behind the globe, the terminator sweeps over the target */
	night?: boolean;
	/** the next shot is a toon render (Blender): its whole picture is laid onto the globe as a flat decal over the outer patch's
	 *  bbox (+ `margin` of it on every side; `fe` > 0 feathers its outer edge, superellipse metric as geomW), cross-faded in
	 *  display space over [th − t[0], th − t[1]] s; bloom and vignette (the toon frames have neither) fade out with it.
	 *  Around the decal: the toon backdrop `bg` (tools/blender/backdrop_decal.py: the neighbour land painted in the decal's own
	 *  coast/land bands, Web-Mercator over `box` = [lat S, lat N, lon W, lon E], the same numbers as its CFG), and beyond that
	 *  the constant `sea` (linear display colour = the backdrop's far sea) */
	toon?: {src: string; margin: number; fe?: number; sea: V3; t: [number, number]; bg?: {src: string; box: [number, number, number, number]}};
	/** false: no glowing destination marker (it floats 1.003 globe radii up, so close in it drifts against the land) */
	marker?: boolean;
	/** false: no arc (and no origin marker) even when the call site passes arcFrom */
	arc?: boolean;
};
const DESTS: Dest[] = [
	{
		key: [19.6, -155.45],
		t3d: 8.55,
		cam: hawaiiACam,
		patches: [
			{name: 'hawaii', feather: 0.04, globe: true, fade: [2500, 830]},
			{name: 'hawaii_flow', feather: 0.004, globe: false, fade: [800, 330]},
		],
		look: 'hawaii',
		lookAt: (t) => hawaiiALook(t),
		horizonAt: () => HAWAII_SEA_SKY.horizon ?? LOOKS.hawaii.sky.horizon,
		kW: [2200, 180],
		seaExt: 0.5,
		gain: [0.72, 0.66, 0.5],
		gainEdge: [0.72, 0.66, 0.5],
		seaGlobe: [0.0051, 0.0226, 0.0827],
		// review 18.10: the dive's Big Island was the murky photo mosaic until the dissolve into the toon island → the toon
		// decal of Hawaii A's opening frame (tools/blender/hawaii_decal.py) takes over in 7.35 – 8.0 s; Maui, Molokai, Lanai,
		// Kahoolawe, Oahu, Kauai get the same toon look from the backdrop (they used to fade out into the flat toon sea)
		toon: {src: 'blender/hawaii_decal.jpg', margin: 0.08, sea: [0.02, 0.17, 0.43], t: [1.2, 0.55], bg: {src: 'blender/hawaii_backdrop.jpg', box: [18.3, 22.7, -160.8, -154.2]}},
		spin: 42,
		w0: 18000,
		rho: 1.8,
		prof: [0.3, 0.4, 0.6],
		h0: 0,
	},
	{
		key: [37.75, 15.0],
		t3d: W(48),
		cam: etnaCam,
		patches: [
			{name: 'etna_wide', feather: 0.15, globe: true, fade: [2400, 800]},
			{name: 'etna', feather: 0.2, globe: true, fade: [360, 150]},
		],
		look: 'etna',
		// EtnaScene: fog thinned while the camera is far up
		lookAt: (_t, d) => ({fogDens: LOOKS.etna.terrain.fogDens * Math.min(1, 30 / d)}),
		horizonAt: () => LOOKS.etna.sky.horizon,
		kW: [58, 17],
		gain: [0.8, 0.8, 0.75],
		gainEdge: [0.28, 0.41, 0.25],
		seaGlobe: [0.0078, 0.0349, 0.1246],
		spin: 60,
		w0: 22000,
		rho: 2.0,
		prof: [0.8, 0.25, 0.65],
		h0: 0,
		// over the pole the carried north-up turns into south-east-up: arrive north-east-up instead (Europe readable),
		// then ease the last ~50° onto Etna3D's east-up opening
		hArrive: 45,
		// the 8k globe land outside the mosaics would be magnified into a smear in the last ~0.4 s: it melts into the sea early
		outSea: true,
		outW: [3200, 1300],
	},
	{
		key: [63.43, -20.26],
		t3d: W(79),
		cam: (_r, t) => iceACamOrbit(t),
		patches: [
			{name: 'heimaey_wide', feather: 0.2, globe: true, fade: [1400, 460]},
			{name: 'heimaey', feather: 0.2, globe: true, fade: [100, 40]},
		],
		look: 'iceNight',
		lookAt: (t) => iceALook(t),
		horizonAt: (t) => iceASky(t).horizon ?? LOOKS.iceNight.sky.horizon,
		kW: [200, 55],
		gain: [1, 1, 1],
		gainEdge: [2.0, 1.7, 1.5],
		seaGlobe: [0.0121, 0.052, 0.1761],
		// pure dive (no pan; the hop is short), north tilted 15° so Etna sits in the lower right corner and its arc climbs to
		// Heimaey; the tilt turns out during the dive
		spin: 0,
		w0: 4500,
		head0: -15,
		arcT: [0.0, 0.42],
		arcH: 0.035,
		rho: 1.4,
		prof: [1, 0.2, 0.5],
		h0: 0,
		night: true,
		// fix round 18.10 night: the dive's satellite Westman Islands + dusk mainland were a muddy blend into the toon Iceland A →
		// the toon decal of Iceland A's FIRST frame (tools/blender/iceland_decal.py: globe-blue sea, dim-band land, pre-1973
		// Heimaey) over the heimaey_wide box, feathered into the toon backdrop of all Iceland (green lowlands, violet highlands),
		// takes over in 39.48 – 39.88 s (frame 1950 → 360 km wide: the whole photo Iceland turns into the toon Iceland while it is
		// small, before the 8k globe is magnified into a blur); at 40.53 the globe shows Iceland A's own picture
		toon: {src: 'blender/iceland_decal.jpg', margin: 0, fe: 0.13, sea: [0.0044, 0.1273, 0.4177], t: [1.05, 0.65], bg: {src: 'blender/iceland_backdrop.jpg', box: [62.9, 67.0, -25.5, -12.5]}},
		// the photo mainland outside the mosaics melts into the sea only under the toon cross-fade (it used to melt at 39.4 –
		// 39.6 s, so Iceland vanished before the toon Iceland came); its blurred residue is gone by 39.85 s
		outSea: true,
		outW: [700, 350],
		// owner 19.10 («a buggy dot at 39 s when it zooms in»): the white ring on Heimaey hung ~19 km above the globe and slid
		// across the south coast during the dive → no destination marker here; the Etna arc only ever showed as a 0.1 s white
		// streak in the lower right corner (39.65–39.75 s, it fades before it reaches Heimaey) → no arc either
		marker: false,
		arc: false,
	},
];
const destOf = (to: LL): Dest | undefined => DESTS.find((d) => Math.abs(d.key[0] - to[0]) < 1.5 && Math.abs(d.key[1] - to[1]) < 1.5);

// ------------------------------------------------------------------------------------------- globe camera
/** camera orbiting a point on the globe: unit direction g, height h (km), az/el (deg, as in the 3D scenes: az 0 = camera
 *  south of the target looking north), distance (km), vertical fov */
type GOrb = {g: V3; h: number; az: number; el: number; dist: number; fov: number; /** screen-up direction on the ground (replaces az) */ up?: V3};

/** scene orbit (region km frame: x east, y up, z south) → globe orbit */
const toGlobe = (r: Region, o: Orbit): GOrb => {
	const {x0, y0, x1, y1} = r.meta.mercator;
	const mx = x0 + (o.target[0] / r.wKm + 0.5) * (x1 - x0);
	const my = y0 + (o.target[2] / r.hKm + 0.5) * (y1 - y0);
	return {g: norm(dirLL(mercLat(my), mercLon(mx))), h: o.target[1], az: o.az, el: o.el, dist: o.dist, fov: o.fov};
};

const enu = (u: V3) => {
	const e = norm([u[2], 0, -u[0]]);
	return {e, u, s: cross(e, u)};
};

/** globe orbit → Cam (pos / target / roll in three's lookAt-with-world-up-Y convention, like Stage3D and project) */
const camOfG = (o: GOrb): Cam => {
	const {e, u, s} = enu(o.g);
	const az = o.az * DEG;
	const el = o.el * DEG;
	// horizontal look direction (= screen-up for a steep view): bearing −az, or given directly
	const hdir = o.up ? norm(sub(o.up, scale(u, dot(o.up, u)))) : scale(add(scale(e, Math.sin(az)), scale(s, Math.cos(az))), -1);
	const off = sub(scale(u, Math.sin(el)), scale(hdir, Math.cos(el)));
	const T = scale(u, 1 + o.h / R_KM);
	const pos = add(T, scale(off, o.dist / R_KM));
	// the 3D scenes keep the camera's up on the local vertical: screen-right = horizontal look direction × up
	const right = norm(cross(hdir, u));
	const f = scale(off, -1);
	const xW = norm(cross(f, [0, 1, 0]));
	const yW = cross(scale(f, -1), xW);
	const roll = Math.atan2(dot(right, yW), dot(right, xW)) / DEG;
	return {pos, target: T, fov: o.fov, roll};
};

// ------------------------------------------------------------------------------------------------ zoom-pan path
/** van Wijk & Nuij «smooth and efficient zooming and panning» (as d3.interpolateZoom): pan d1 km, width w0 → w1 km */
const zoomPath = (rho: number, d1: number, w0: number, w1: number) => {
	const r2 = rho * rho;
	const r4 = r2 * r2;
	if (d1 < 1) {
		const S = Math.max(1e-6, Math.abs(Math.log(w1 / w0)) / rho);
		return {S, at: (s: number) => ({u: s / S, w: w0 * Math.exp((Math.log(w1 / w0) * s) / S)}), dlnw: () => Math.log(w1 / w0) / S};
	}
	const b0 = (w1 * w1 - w0 * w0 + r4 * d1 * d1) / (2 * w0 * r2 * d1);
	const b1 = (w1 * w1 - w0 * w0 - r4 * d1 * d1) / (2 * w1 * r2 * d1);
	const q0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
	const q1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
	const S = (q1 - q0) / rho;
	const ch = Math.cosh(q0);
	return {
		S,
		at: (s: number) => ({u: (w0 / (r2 * d1)) * (ch * Math.tanh(rho * s + q0) - Math.sinh(q0)), w: (w0 * ch) / Math.cosh(rho * s + q0)}),
		dlnw: (s: number) => -rho * Math.tanh(rho * s + q0),
	};
};

/** speed profile P(x), x 0..1: speed (a + (1-a)·ease-in) · ease-out to the end speed p1 (in units of the mean speed) */
const makeProfile = (a: number, xi: number, xo: number, p1: number) => {
	const N = 600;
	const base = (x: number) => a + (1 - a) * ss(0, xi, x);
	let IA = 0;
	let IB = 0;
	for (let i = 0; i < N; i++) {
		const x = (i + 0.5) / N;
		IA += base(x) / N;
		IB += (base(x) * ss(xo, 1, x)) / N;
	}
	const b = Math.max(0, Math.min(1, (p1 * (IA - IB)) / Math.max(1e-6, 1 - p1 * IB)));
	const v = (x: number) => base(x) * (1 - (1 - b) * ss(xo, 1, x));
	const c = [0];
	for (let i = 1; i <= N; i++) c.push(c[i - 1] + (v(i / N) + v((i - 1) / N)) / 2 / N);
	const tot = c[N];
	return (x: number) => {
		const f = clamp01(x) * N;
		const i = Math.min(N - 1, Math.floor(f));
		return (c[i] + (c[i + 1] - c[i]) * (f - i)) / tot;
	};
};

type Plan = {
	at: (t: number) => GOrb & {w: number; u: number};
	th: number;
	wArrive: number;
	/** the opening camera's frame width and distance (km) */
	wEnd: number;
	dEnd: number;
};

/** the hop: van Wijk–Nuij from (A, w0) to the next shot's camera at th, then that camera itself */
const makePlan = (dest: Dest, r: Region, t0: number, th: number, from: LL, to: LL): Plan => {
	const end = toGlobe(r, dest.cam(r, th));
	const eps = 1 / 240;
	const end2 = toGlobe(r, dest.cam(r, th + eps));
	const wEnd = widthOf(end.dist, end.fov);
	const rate = (Math.log(widthOf(end2.dist, end2.fov)) - Math.log(wEnd)) / eps;
	const B = end.g;
	const F = norm(dirLL(from[0], from[1]));
	const T0 = norm(dirLL(to[0], to[1]));
	// start: `from`, moved toward the destination so the spin is at most dest.spin degrees
	const th0 = angle(F, T0);
	const A = th0 > dest.spin * DEG ? slerp(T0, F, (dest.spin * DEG) / th0) : F;
	const d1 = angle(A, B) * R_KM;
	const zp = zoomPath(dest.rho, d1, dest.w0, wEnd);
	const D = th - t0;
	const p1 = Math.max(0, (rate * D) / (zp.dlnw(zp.S) * zp.S));
	const P = makeProfile(dest.prof[0], dest.prof[1], dest.prof[2], p1);
	const state = (t: number) => {
		const s = zp.S * P((t - t0) / D);
		const {u, w} = zp.at(s);
		return {u, w, c: slerp(A, B, clamp01(u))};
	};
	// target velocity at th: the 3D target's own vs the path's → small correction that fades in over the last 0.5 s
	const vEnd = scale(sub(end2.g, end.g), 1 / eps);
	const pa = state(th - eps).c;
	const vPath = scale(sub(B, pa), 1 / eps);
	const dv = sub(vEnd, vPath);
	// screen orientation: the screen-up direction is carried along the great circle without turning (parallel transport,
	// so passing near the pole does not spin the picture); the start heading is chosen between north-up (h0 = 0) and «no
	// turn needed» (h0 = 1), the rest of the turn onto the opening camera's heading is eased in over the hop
	const theta = angle(A, B);
	const axis: V3 | null = theta > 1e-6 ? norm(cross(A, B)) : null;
	const carry = (v: V3, u: number) => (axis ? rotAbout(v, axis, theta * u) : v);
	const eA = norm([A[2], 0, -A[0]] as V3);
	const nA = cross(A, eA);
	const hEnd = -end.az;
	const delta = headingAt(carry(nA, 1), B);
	const H0 = dest.head0 ?? (dest.hArrive !== undefined ? wrap180(dest.hArrive - delta) : dest.h0 * wrap180(hEnd - delta));
	const UA = add(scale(nA, Math.cos(H0 * DEG)), scale(eA, Math.sin(H0 * DEG)));
	const corrTot = wrap180(hEnd - headingAt(carry(UA, 1), B));
	const hLoc = (t: number) => {
		const st = state(t);
		return headingAt(carry(UA, clamp01(st.u)), st.c);
	};
	const dHloc = wrap180(hLoc(th) - hLoc(th - eps)) / eps;
	const rHead = -(end2.az - end.az) / eps;
	const rEl = (end2.el - end.el) / eps;
	const rFov = (end2.fov - end.fov) / eps;
	const rH = (end2.h - end.h) / eps;
	const tAz = t0 + 0.05 * D;
	const tTilt = th - Math.min(1.0, 0.65 * D);
	// width at which the arc has arrived (prog = u·1.12 = 1)
	let wArrive = dest.w0;
	for (let i = 0; i <= 400; i++) {
		const st = zp.at((zp.S * i) / 400);
		if (st.u >= 1 / 1.12) {
			wArrive = st.w;
			break;
		}
	}
	return {
		th,
		wArrive,
		wEnd,
		dEnd: end.dist,
		at: (t: number) => {
			if (t >= th) {
				const o = toGlobe(r, dest.cam(r, t));
				return {...o, w: widthOf(o.dist, o.fov), u: 1};
			}
			const {u, w, c} = state(t);
			const g = norm(add(c, scale(dv, (t - th) * sss(th - 0.6, th, t))));
			const fov = herm(tTilt, th, FOV, end.fov, rFov, t);
			const corr = herm(tAz, th, 0, corrTot, rHead - dHloc, t);
			const up = rotAbout(carry(UA, clamp01(u)), g, -corr * DEG);
			return {
				g,
				h: herm(tTilt, th, 0, end.h, rH, t),
				az: -headingAt(up, g),
				up,
				el: herm(tTilt, th, 90, end.el, rEl, t),
				fov,
				dist: distOf(w, fov),
				w,
				u,
			};
		},
	};
};

// ---------------------------------------------------------------------------------------------- textures
type GT = {day: THREE.Texture; night: THREE.Texture; water: THREE.Texture | null};
let texCache: Promise<GT> | null = null;
let texDone: GT | null = null;
const loadGlobeTex = () => {
	if (!texCache) {
		const ld = (u: string, srgb = true) =>
			new Promise<THREE.Texture>((res, rej) =>
				new THREE.TextureLoader().load(
					u,
					(t) => {
						t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
						t.anisotropy = 8;
						t.generateMipmaps = true;
						t.minFilter = THREE.LinearMipmapLinearFilter;
						t.magFilter = THREE.LinearFilter;
						res(t);
					},
					undefined,
					rej,
				),
			);
		const water = fetch(staticFile('globe/water.png'), {method: 'HEAD'})
			.then((r) => (r.ok ? ld(staticFile('globe/water.png'), false) : null))
			.catch(() => null);
		texCache = Promise.all([ld(staticFile('globe/day.jpg')), ld(staticFile('globe/night.jpg')), water]).then(([day, night, w]) => (texDone = {day, night, water: w}));
	}
	return texCache;
};
const useGlobeTex = () => {
	const [tex, setTex] = useState(texDone);
	const [h] = useState(() => (texDone ? null : delayRender('globe textures', {timeoutInMilliseconds: 120000})));
	useEffect(() => {
		if (!h) return;
		loadGlobeTex().then((t) => setTex(t));
	}, [h]);
	useEffect(() => {
		if (tex && h) continueRender(h);
	}, [tex, h]);
	return tex;
};

/** toon decal of the next shot (Dest.toon): one texture per file, loaded once */
const toonCache = new Map<string, Promise<THREE.Texture>>();
const toonDone = new Map<string, THREE.Texture>();
const useToonTex = (src?: string) => {
	const [tex, setTex] = useState<THREE.Texture | null>(() => (src ? (toonDone.get(src) ?? null) : null));
	const [h] = useState(() => (src && !toonDone.has(src) ? delayRender('toon decal ' + src, {timeoutInMilliseconds: 120000}) : null));
	useEffect(() => {
		if (!src || !h) return;
		let p = toonCache.get(src);
		if (!p) {
			p = new Promise<THREE.Texture>((res, rej) =>
				new THREE.TextureLoader().load(
					staticFile(src),
					(t) => {
						t.colorSpace = THREE.SRGBColorSpace;
						t.anisotropy = 8;
						t.generateMipmaps = true;
						t.minFilter = THREE.LinearMipmapLinearFilter;
						t.magFilter = THREE.LinearFilter;
						toonDone.set(src, t);
						res(t);
					},
					undefined,
					rej,
				),
			);
			toonCache.set(src, p);
		}
		p.then((t) => setTex(t));
	}, [src, h]);
	useEffect(() => {
		if (tex && h) continueRender(h);
	}, [tex, h]);
	return tex;
};

/** height (km above sea, × the 3D exaggeration, ≥ 0) in R and the raw height (m, clamped ±40; isolated specks removed)
 *  in G, as a filterable half-float texture; row 0 = north (like region.heights) */
const hlCache = new Map<string, THREE.DataTexture>();
const heightTex = (r: Region): THREE.DataTexture => {
	const hit = hlCache.get(r.name);
	if (hit) return hit;
	const {nx, ny} = r.meta;
	const H = r.heights;
	// connected land components (4-neighbour); specks of a few cells or below 8 m are DEM noise in the sea (the dark
	// «island» in the Ionian Sea)
	const lab = new Int32Array(nx * ny).fill(-1);
	const drop = new Uint8Array(nx * ny);
	const stack: number[] = [];
	for (let k0 = 0; k0 < nx * ny; k0++) {
		if (lab[k0] >= 0 || !(H[k0] > 0)) continue;
		const cells: number[] = [];
		let hmax = 0;
		stack.push(k0);
		lab[k0] = k0;
		while (stack.length) {
			const k = stack.pop()!;
			cells.push(k);
			hmax = Math.max(hmax, H[k]);
			const i = k % nx;
			const j = (k - i) / nx;
			const nb = [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1];
			for (const q of nb) {
				if (q >= 0 && lab[q] < 0 && H[q] > 0) {
					lab[q] = k0;
					stack.push(q);
				}
			}
		}
		if (cells.length < 12 || hmax < 8) for (const k of cells) drop[k] = 1;
	}
	const data = new Uint16Array(nx * ny * 2);
	for (let k = 0; k < nx * ny; k++) {
		const h = drop[k] ? -5 : H[k];
		data[k * 2] = THREE.DataUtils.toHalfFloat((Math.max(0, h) / 1000) * r.exag);
		data[k * 2 + 1] = THREE.DataUtils.toHalfFloat(Math.max(-40, Math.min(40, h)));
	}
	const tex = new THREE.DataTexture(data, nx, ny, THREE.RGFormat, THREE.HalfFloatType);
	tex.minFilter = THREE.LinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	hlCache.set(r.name, tex);
	return tex;
};

// ---------------------------------------------------------------------------------------------------- shaders
const EARTH_VERT = /* glsl */ `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const EARTH_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uWater; uniform float uHasWater;
uniform vec3 uSun; uniform float uK; uniform float uRelief; uniform float uHmax; uniform float uDS; uniform float uNL; uniform float uMoon; uniform float uOutDark; uniform float uOutAmt; uniform float uOutSea; uniform float uSeaExt;
uniform sampler2D uSat0; uniform sampler2D uHL0; uniform vec4 uM0; uniform vec4 uP0; uniform vec4 uQ0;
uniform sampler2D uSat1; uniform sampler2D uHL1; uniform sampler2D uNrm1; uniform sampler2D uLand1; uniform vec4 uM1; uniform vec4 uP1; uniform vec4 uQ1;
uniform float uN; uniform vec3 uGain; uniform vec3 uGainEdge; uniform vec3 uSeaGlobe;
uniform vec3 uLSun; uniform vec3 uLSunCol; uniform float uLSunI; uniform vec3 uLSky; uniform vec3 uLGround; uniform float uLAmb;
uniform vec3 uLFog; uniform float uLFogDens; uniform float uLFogMax; uniform float uLSatGain; uniform float uLSaturation; uniform float uLContrast;
uniform float uLNight; uniform vec3 uLWater; uniform vec3 uLDeep; uniform vec3 uLTint; uniform float uLExpo; uniform vec3 uLHorizon;
uniform sampler2D uToon; uniform float uToonK; uniform vec4 uToonBox; uniform float uToonFe; uniform vec3 uToonSea;
uniform sampler2D uToonBg; uniform vec4 uToonBgBox; uniform float uToonBgOn;
varying vec3 vW; varying vec2 vUv;
// the post chain's tone mapping (three's ACESFilmicToneMapping, exposure 1) and its exact inverse: the toon decal holds
// display colours, so it is cross-faded in display space and handed to the post chain as the HDR value that maps onto it
const mat3 ACES_IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
const mat3 ACES_OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
const mat3 ACES_IN_INV = mat3(vec3(1.764741, -0.147028, -0.036337), vec3(-0.675778, 1.160252, -0.162436), vec3(-0.088963, -0.013224, 1.198773));
const mat3 ACES_OUT_INV = mat3(vec3(0.643038, 0.059269, 0.005962), vec3(0.311187, 0.931436, 0.063929), vec3(0.045775, 0.009295, 0.930118));
vec3 acesFwd(vec3 c){ vec3 v = ACES_IN * (c / 0.6); vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return clamp(ACES_OUT * (a / b), 0.0, 1.0); }
vec3 acesInv(vec3 y){
	vec3 z = clamp(ACES_OUT_INV * clamp(y, 0.0, 1.0), 0.0, 1.0);
	vec3 a = 1.0 - 0.983729 * z; vec3 b = 0.0245786 - 0.432951 * z; vec3 c = -(0.000090537 + 0.238081 * z);
	vec3 v = (-b + sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a);
	return max(0.6 * (ACES_IN_INV * v), 0.0);
}
const float PI = 3.141592653589793;
const float RK = 6371.0;
// P*: x = fade-in alpha (globe style), y = feather, z = globe-style on, w = cloud removal
// Q*: x = has normal map, y = wKm, z = hKm, w = has land mask texture
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec2 latlon(vec3 p){ vec3 n = normalize(p); return vec2(asin(clamp(n.y, -1.0, 1.0)), atan(-n.z, n.x)); }
vec2 mercOf(vec2 l){ return vec2((l.y + PI) / (2.0 * PI), 0.5 - log(tan(PI * 0.25 + l.x * 0.5)) / (2.0 * PI)); }
vec2 pUV(vec2 m, vec4 M){ return vec2((m.x - M.x) / (M.z - M.x), (m.y - M.y) / (M.w - M.y)); }
float sqr(vec2 uv){ vec2 q = abs(uv * 2.0 - 1.0); return pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25); }
float inside(vec2 uv){ return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0); }
float geomW(vec2 uv, float fe){ return (1.0 - smoothstep(1.0 - fe, 1.0, sqr(uv))) * inside(uv); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y); }
float hAt(vec3 p){
	vec2 m = mercOf(latlon(p));
	float h = 0.0;
	if (uN > 0.5) { vec2 a = pUV(m, uM0); h = textureLod(uHL0, a, 0.0).r * inside(a); }
	if (uN > 1.5) { vec2 b = pUV(m, uM1); float wb = geomW(b, uP1.y); h = mix(h, textureLod(uHL1, b, 0.0).r, wb); }
	return h;
}
// nearest positive hit of the ray with the sphere |p| = r (numerically stable form); -1 if missed
float hitS(vec3 o, vec3 d, float r){
	float b = dot(o, d); float c = dot(o, o) - r * r; float disc = b * b - c;
	if (disc < 0.0) return -1.0;
	float s = sqrt(disc);
	if (c > 0.0) { if (b > 0.0) return -1.0; return c / (-b + s); }
	return 0.0;
}
vec3 demNormal(sampler2D t, vec2 uv, vec2 wh){
	vec2 px = 1.0 / vec2(textureSize(t, 0));
	float hx1 = textureLod(t, uv + vec2(px.x, 0.0), 0.0).r; float hx0 = textureLod(t, uv - vec2(px.x, 0.0), 0.0).r;
	float hz1 = textureLod(t, uv + vec2(0.0, px.y), 0.0).r; float hz0 = textureLod(t, uv - vec2(0.0, px.y), 0.0).r;
	return normalize(vec3(-(hx1 - hx0) / (2.0 * px.x * wh.x), 1.0, -(hz1 - hz0) / (2.0 * px.y * wh.y)));
}
vec3 globeTex(sampler2D t, vec2 uv, vec2 dx, vec2 dy, float size){
	// magnified far beyond its resolution the 8k globe shows JPEG blocks: blur it instead — a coarser mip, sampled as a
	// small disc so its texels do not show either
	float lod = log2(max(length(dx * size), length(dy * size)));
	if (lod < -1.5) {
		float b = clamp(-lod - 1.5, 0.0, 3.5);
		vec2 r = vec2(1.0 / size, 2.0 / size) * exp2(b) * 0.75;
		vec3 acc = textureLod(t, uv, b).rgb * 2.0;
		for (int i = 0; i < 8; i++) { float a = float(i) * 0.7853982 + 0.39; acc += textureLod(t, uv + vec2(cos(a), sin(a)) * r, b).rgb; }
		return acc / 10.0;
	}
	return textureGrad(t, uv, dx, dy).rgb;
}
void main(){
	vec3 o = cameraPosition;
	vec3 d = normalize(vW - cameraPosition);
	float tS = hitS(o, d, 1.0);
	if (tS < 0.0) discard;
	vec3 P = o + d * tS;
	if (uRelief > 0.5 && uHmax > 0.0) {
		float tt = max(0.0, hitS(o, d, 1.0 + uHmax / RK));
		float pt = tt;
		float pf = (length(o + d * tt) - 1.0) * RK - hAt(o + d * tt);
		for (int i = 1; i <= 28; i++) {
			float t = mix(tt, tS, float(i) / 28.0);
			vec3 p = o + d * t;
			float f = (length(p) - 1.0) * RK - hAt(p);
			if (f <= 0.0) { P = o + d * mix(pt, t, pf / max(pf - f, 1e-6)); break; }
			pt = t; pf = f;
		}
	}
	vec2 ll = latlon(P);
	vec2 m = mercOf(ll);
	// ---- patches (0 = outer, 1 = inner); uv v runs north → south, image textures are flipped
	vec2 a0 = pUV(m, uM0); vec2 a1 = pUV(m, uM1);
	vec2 f0 = vec2(a0.x, 1.0 - a0.y); vec2 f1 = vec2(a1.x, 1.0 - a1.y);
	vec2 dx0 = dFdx(f0), dy0 = dFdy(f0), dx1 = dFdx(f1), dy1 = dFdy(f1);
	float g0 = uN > 0.5 ? geomW(a0, uP0.y) : 0.0;
	float g1 = uN > 1.5 ? geomW(a1, uP1.y) : 0.0;
	float h1 = uN > 1.5 ? (1.0 - smoothstep(0.985, 1.0, sqr(a1))) * inside(a1) : 0.0;      // hard inner rect (3D style)
	vec3 s0 = textureGrad(uSat0, f0, dx0, dy0).rgb;
	vec3 s1 = textureGrad(uSat1, f1, dx1, dy1).rgb;
	vec2 hl0 = texture(uHL0, a0).rg; vec2 hl1 = texture(uHL1, a1).rg;
	float l0 = smoothstep(-1.0, 1.0, hl0.g);
	float l1 = uQ1.w > 0.5 ? textureGrad(uLand1, f1, dx1 * 2.0, dy1 * 2.0).r : smoothstep(-1.0, 1.0, hl1.g);
	// cloud removal on the EOX Hawaii mosaic (as TerrainMesh)
	if (uP0.w > 0.5) {
		float lum = luma(s0); float chroma = max(max(s0.r, s0.g), s0.b) - min(min(s0.r, s0.g), s0.b);
		s0 = mix(s0, vec3(0.09, 0.08, 0.05), smoothstep(0.12, 0.24, lum) * (1.0 - smoothstep(0.09, 0.17, chroma)));
	}
	// ---- globe style (the Earth shader of src/three/Globe.tsx), patches laid into it
	vec2 uvG = vec2(0.5 + ll.y / (2.0 * PI), 0.5 + ll.x / PI);
	vec2 gdx = dFdx(vUv), gdy = dFdy(vUv);
	vec3 dG = globeTex(uDay, uvG, gdx, gdy, 8192.0);
	float ocean = uHasWater > 0.5 ? globeTex(uWater, uvG, gdx, gdy, 8192.0).r : step(dG.r * 1.4, dG.b) * step(dG.g * 1.05, dG.b);
	vec3 nl = globeTex(uNight, uvG, gdx, gdy, 8192.0);
	float ocean0 = ocean;
	float A0 = g0 * uP0.x * uP0.z; float A1 = g1 * uP1.x * uP1.z;
	float Ag = 1.0 - (1.0 - A0) * (1.0 - A1);
	vec3 sP = (A1 * s1 + (1.0 - A1) * A0 * s0) / max(Ag, 1e-4);
	float lP = (A1 * l1 + (1.0 - A1) * A0 * l0) / max(Ag, 1e-4);
	vec3 gain = mix(uGain, uGainEdge, smoothstep(0.45, 1.0, sqr(a0)));
	// inside the mosaic the sea is the globe's mean sea colour (no blurred globe coast under the sharp one), faded out
	// over a wide margin so no rectangle shows
	// (an isolated island's mosaic also takes the sea a little beyond its edge: the globe's blurred coast reaches past it)
	float As = (1.0 - smoothstep(0.5 + uSeaExt, 1.0 + uSeaExt, sqr(a0))) * (uSeaExt > 0.0 ? 1.0 : inside(a0)) * uP0.x * (uN > 0.5 ? 1.0 : 0.0);
	As = max(As, A1);
	float wS = As * (1.0 - Ag * lP);
	// close in, the globe's land around the mosaics is only a blur (winter snow, soft coasts): it sinks into a dark
	// vignette (uOutAmt) or, where the next shot has open sea there, melts into the sea (uOutSea)
	float outL = uOutDark * (1.0 - ocean0) * (1.0 - (uN > 0.5 ? geomW(a0, 0.45) : 0.0));
	wS = max(wS, uOutDark * uOutSea * (1.0 - (uN > 0.5 ? geomW(a0, 0.45) : 0.0)));
	vec3 dd = mix(mix(dG, uSeaGlobe, wS), sP * gain, Ag * lP);
	ocean = mix(mix(ocean, 1.0, wS), 0.0, Ag * lP);
	vec3 N = normalize(P); vec3 V = normalize(cameraPosition - P); vec3 L = normalize(uSun);
	float lum = luma(dd);
	dd = mix(vec3(lum), dd, 1.35);
	dd = mix(dd, vec3(0.02, 0.13, 0.24) + dd * vec3(0.3, 0.8, 1.0), ocean * 0.55);
	float day = smoothstep(-0.15, 0.35, dot(N, L));
	// night side: moonlight (for the night landing) instead of black
	vec3 cG = dd * (0.1 + 1.25 * day + uMoon * (1.0 - day) * vec3(0.55, 0.7, 1.25));
	cG *= 1.0 - uOutAmt * outL;
	cG += nl * vec3(1.6, 0.9, 0.45) * (1.0 - day) * 1.2 * uNL;
	float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
	cG += vec3(0.25, 0.55, 1.2) * fres * (0.25 + 0.75 * day);
	// ---- the next shot's look (TerrainMesh + Ocean formulas, LOOKS values), scene axes x east / y up / z south
	vec3 c = cG;
	if (uK > 0.001) {
		vec3 E = normalize(vec3(N.z, 0.0, -N.x)); vec3 S = cross(E, N);
		vec3 Vs = vec3(dot(V, E), dot(V, N), dot(V, S));
		// fog and the far-sea horizon tint as seen from the opening camera's distance (from higher up they would wash out)
		float camD = length(cameraPosition - P) * RK * uDS;
		// the look applies to the whole picture: the mosaics (feathered outer one, hard-edged inner one as in TerrainMesh) and,
		// outside them, the globe's own land and sea
		float W0 = uN > 0.5 ? g0 : 0.0;
		float W1 = h1;
		vec3 N0 = normalize(mix(vec3(0.0, 1.0, 0.0), demNormal(uHL0, a0, uQ0.yz), W0));
		vec3 Nt = normalize(mix(N0, uQ1.x > 0.5 ? normalize(texture(uNrm1, f1).xyz * 2.0 - 1.0) : demNormal(uHL1, a1, uQ1.yz), W1));
		vec3 sat = mix(mix(dG * (1.0 - uOutAmt * uOutDark), s0, W0), s1, W1) * uLTint;   // (outside: sea anyway, see lnd)
		// beyond the outer mosaic the next shot has open sea (its terrain ends there)
		float lnd = mix(l0 * W0, l1, W1);
		float sl = luma(sat);
		sat = mix(vec3(sl), sat, uLSaturation);
		sat = pow(max(sat, 0.0), vec3(uLContrast)) * uLSatGain;
		vec3 Ls = normalize(uLSun);
		float ndl = max(dot(Nt, Ls), 0.0);
		vec3 hemi = mix(uLGround, uLSky, Nt.y * 0.5 + 0.5) * uLAmb;
		vec3 cl = sat * (uLSunCol * uLSunI * ndl + hemi) * mix(1.0, 0.22, uLNight) * uLExpo;
		float fog = (1.0 - exp(-camD * uLFogDens)) * uLFogMax;
		cl = mix(cl, uLFog * mix(1.0, 0.35, uLNight), fog);
		vec3 cs = mix(uLWater, uLDeep, smoothstep(0.0, 1.0, 1.0 - Vs.y)) * mix(1.0, 0.35, uLNight);
		float fr = pow(1.0 - max(Vs.y, 0.0), 5.0);
		vec3 Rr = reflect(-Vs, vec3(0.0, 1.0, 0.0));
		float glint = pow(max(dot(Rr, Ls), 0.0), 220.0) * 3.0 + pow(max(dot(Rr, Ls), 0.0), 18.0) * 0.12;
		cs += uLSky * fr * 0.6 * mix(1.0, 0.25, uLNight) + uLSunCol * glint * uLSunI * (1.0 - uLNight * 0.9);
		cs = mix(cs, uLFog * mix(1.0, 0.35, uLNight), fog);
		cs = mix(cs, uLHorizon, smoothstep(18.0, 160.0, camD) * 0.95);
		c = mix(cG, mix(cs, cl, lnd), uK);
	}
	// ---- toon decal of the next shot (display colours, sRGB-decoded by the sampler), faded in over the whole picture; around
	// it the toon backdrop (neighbour islands / the rest of the land in the same toon bands), beyond that the toon sea
	vec2 aD = pUV(m, uToonBox);
	vec2 fD = vec2(aD.x, 1.0 - aD.y);
	vec2 dxD = dFdx(fD), dyD = dFdy(fD);
	vec2 aB = pUV(m, uToonBgBox);
	vec2 fB = vec2(aB.x, 1.0 - aB.y);
	vec2 dxB = dFdx(fB), dyB = dFdy(fB);
	if (uToonK > 0.0005) {
		vec3 yT = uToonSea;
		if (uToonBgOn > 0.5) yT = mix(uToonSea, textureGrad(uToonBg, fB, dxB, dyB).rgb, geomW(aB, 0.04));
		// a feathered decal (its box cuts through land) fades out along a wobbly line (value noise), so no straight seam shows
		// between its textured land and the flat backdrop; the band stays inside [1 − 1.3 fe, 1 − 0.05 fe] of the box
		float wD = inside(aD);
		if (uToonFe > 0.0) {
			float nz = vnoise(aD * 6.0) * 0.67 + vnoise(aD * 13.0 + 3.7) * 0.33 - 0.5;
			wD *= 1.0 - smoothstep(1.0 - uToonFe, 1.0 - 0.35 * uToonFe, sqr(aD) + 0.6 * uToonFe * nz);
		}
		if (wD > 0.0) yT = mix(yT, textureGrad(uToon, fD, dxD, dyD).rgb, wD);
		c = acesInv(mix(acesFwd(c), yT, uToonK));
	}
	gl_FragColor = vec4(c, 1.0);
}`;

type PatchU = {r: Region; def: PatchDef};

const Earth: React.FC<{tex: GT; patches: PatchU[]; u: Record<string, unknown>; toon?: THREE.Texture | null; toonBg?: THREE.Texture | null}> = ({tex, patches, u, toon, toonBg}) => {
	const mat = useMemo(() => {
		const dummy = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
		dummy.needsUpdate = true;
		const p = (i: number) => patches[Math.min(i, patches.length - 1)];
		const mrc = (r: Region) => new THREE.Vector4(r.meta.mercator.x0, r.meta.mercator.y0, r.meta.mercator.x1, r.meta.mercator.y1);
		const P0 = p(0);
		const P1 = p(1);
		return new THREE.ShaderMaterial({
			vertexShader: EARTH_VERT,
			fragmentShader: EARTH_FRAG,
			uniforms: {
				uDay: {value: tex.day},
				uNight: {value: tex.night},
				uWater: {value: tex.water ?? dummy},
				uHasWater: {value: tex.water ? 1 : 0},
				uSun: {value: new THREE.Vector3()},
				uK: {value: 0},
				uRelief: {value: 0},
				uHmax: {value: 0},
				uDS: {value: 1},
				uMoon: {value: 0},
				uOutDark: {value: 0},
				uOutAmt: {value: 0},
				uOutSea: {value: 0},
				uSeaExt: {value: 0},
				uNL: {value: 1},
				uN: {value: patches.length},
				uSat0: {value: P0?.r.sat ?? dummy},
				uHL0: {value: P0 ? heightTex(P0.r) : dummy},
				uM0: {value: P0 ? mrc(P0.r) : new THREE.Vector4(0, 0, 1, 1)},
				uP0: {value: new THREE.Vector4()},
				uQ0: {value: new THREE.Vector4(0, P0?.r.wKm ?? 1, P0?.r.hKm ?? 1, 0)},
				uSat1: {value: P1?.r.sat ?? dummy},
				uHL1: {value: P1 ? heightTex(P1.r) : dummy},
				uNrm1: {value: P1?.r.normal ?? dummy},
				uLand1: {value: P1?.r.land ?? dummy},
				uM1: {value: P1 ? mrc(P1.r) : new THREE.Vector4(0, 0, 1, 1)},
				uP1: {value: new THREE.Vector4()},
				uQ1: {value: new THREE.Vector4(P1?.r.normal ? 1 : 0, P1?.r.wKm ?? 1, P1?.r.hKm ?? 1, P1?.r.land ? 1 : 0)},
				uGain: {value: new THREE.Vector3(1, 1, 1)},
				uGainEdge: {value: new THREE.Vector3(1, 1, 1)},
				uSeaGlobe: {value: new THREE.Vector3()},
				uLSun: {value: new THREE.Vector3(0, 1, 0)},
				uLSunCol: {value: new THREE.Color()},
				uLSunI: {value: 1},
				uLSky: {value: new THREE.Color()},
				uLGround: {value: new THREE.Color()},
				uLAmb: {value: 1},
				uLFog: {value: new THREE.Color()},
				uLFogDens: {value: 0},
				uLFogMax: {value: 0},
				uLSatGain: {value: 1},
				uLSaturation: {value: 1},
				uLContrast: {value: 1},
				uLNight: {value: 0},
				uLWater: {value: new THREE.Color()},
				uLDeep: {value: new THREE.Color()},
				uLTint: {value: new THREE.Color(1, 1, 1)},
				uLExpo: {value: 1},
				uLHorizon: {value: new THREE.Color()},
				uToon: {value: toon ?? dummy},
				uToonK: {value: 0},
				uToonBox: {value: new THREE.Vector4(0, 0, 1, 1)},
				uToonFe: {value: 0},
				uToonSea: {value: new THREE.Vector3()},
				uToonBg: {value: toonBg ?? dummy},
				uToonBgBox: {value: new THREE.Vector4(0, 0, 1, 1)},
				uToonBgOn: {value: toonBg ? 1 : 0},
			},
		});
	}, [tex, patches, toon, toonBg]);
	for (const [k, v] of Object.entries(u)) {
		const un = mat.uniforms[k];
		if (!un) continue;
		if (un.value && typeof (un.value as {set?: unknown}).set === 'function' && Array.isArray(v)) (un.value as THREE.Vector3).set(...(v as [number, number, number]));
		else if (un.value instanceof THREE.Color && typeof v === 'string') un.value.set(v);
		else un.value = v;
	}
	useEffect(() => () => mat.dispose(), [mat]);
	// bounding sphere slightly larger than the unit sphere: the fragment shader intersects the exact sphere per pixel
	return (
		<mesh material={mat} scale={1.0004}>
			<sphereGeometry args={[1, 160, 80]} />
		</mesh>
	);
};

const Atmosphere: React.FC<{sun: V3}> = ({sun}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uSun: {value: new THREE.Vector3()}},
				vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
				fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
					float k = pow(max(0.0, 1.0 + dot(N, V) * 1.0 - 0.38), 3.0);
					float lit = 0.35 + 0.65 * smoothstep(-0.4, 0.6, dot(N, normalize(uSun)));
					gl_FragColor = vec4(mix(vec3(0.2, 0.5, 1.4), vec3(0.6, 0.3, 1.2), 0.35) * k * 2.2 * lit, 1.0); }`,
				side: THREE.BackSide,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[],
	);
	mat.uniforms.uSun.value.set(...sun).normalize();
	return (
		<mesh material={mat} scale={1.09}>
			<sphereGeometry args={[1, 96, 48]} />
		</mesh>
	);
};

type MarkerP = {ll: LL; color: string; size: number; pulse: number; alpha: number};
const Marker: React.FC<{m: MarkerP}> = ({m}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uC: {value: new THREE.Color()}, uP: {value: 0}, uA: {value: 1}},
				vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: `uniform vec3 uC; uniform float uP; uniform float uA; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0;
					float dot0 = exp(-r * r * 40.0) * 2.0; float ring = exp(-pow((r - fract(uP)) / 0.06, 2.0)) * (1.0 - fract(uP));
					gl_FragColor = vec4(uC * (dot0 + ring * 1.6) * uA * 2.0, 1.0); }`,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[],
	);
	mat.uniforms.uC.value.set(m.color);
	mat.uniforms.uP.value = m.pulse;
	mat.uniforms.uA.value = m.alpha;
	const p = dirLL(m.ll[0], m.ll[1], 1.003);
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...p).normalize());
	if (m.alpha <= 0.002) return null;
	return (
		<mesh material={mat} position={p} quaternion={q} scale={m.size} renderOrder={5}>
			<planeGeometry args={[1, 1]} />
		</mesh>
	);
};

/** glowing arc a → b drawn in up to `prog`; tube built once (unit radius), its radius set per frame in the vertex shader
 *  so it keeps a constant thickness on screen while the camera dives */
const Arc: React.FC<{a: LL; b: LL; height: number; prog: number; color: string; radius: number; alpha: number}> = ({a, b, height, prog, color, radius, alpha}) => {
	const [a0, a1, b0, b1] = [a[0], a[1], b[0], b[1]];
	const geom = useMemo(() => {
		const A = new THREE.Vector3(...dirLL(a0, a1));
		const B = new THREE.Vector3(...dirLL(b0, b1));
		const pts: THREE.Vector3[] = [];
		const ang = A.angleTo(B);
		for (let i = 0; i <= 128; i++) {
			const t = i / 128;
			const v = new THREE.Vector3().copy(A).multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang)).add(new THREE.Vector3().copy(B).multiplyScalar(Math.sin(t * ang) / Math.sin(ang)));
			v.normalize().multiplyScalar(1.004 + height * Math.sin(Math.PI * t));
			pts.push(v);
		}
		return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 1, 10, false);
	}, [a0, a1, b0, b1, height]);
	useEffect(() => () => geom.dispose(), [geom]);
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uC: {value: new THREE.Color()}, uP: {value: 0}, uR: {value: 0.01}, uA: {value: 1}},
				// vVis: the arc shows only where its foot is on the visible hemisphere, so it rises out of the limb in one piece
				// (no detached dash beyond the horizon)
				vertexShader: `uniform float uR; varying vec2 vUv; varying float vF; varying float vVis; void main(){ vUv = uv; vec3 c = position - normal; vec3 p = c + normal * uR;
					vec4 w = modelMatrix * vec4(p, 1.0); vec3 V = normalize(cameraPosition - w.xyz); vF = abs(dot(normalize(mat3(modelMatrix) * normal), V));
					vVis = smoothstep(0.0, 0.12, dot(normalize(c), normalize(cameraPosition)) - 1.0 / length(cameraPosition));
					gl_Position = projectionMatrix * viewMatrix * w; }`,
				fragmentShader: `uniform vec3 uC; uniform float uP; uniform float uA; varying vec2 vUv; varying float vF; varying float vVis; void main(){ if (vUv.x > uP) discard;
					float head = exp(-pow((vUv.x - uP) / 0.025, 2.0));
					float core = pow(vF, 6.0) * 1.5 + pow(vF, 1.5) * 0.4;
					float tail = smoothstep(0.0, 0.03, vUv.x);
					gl_FragColor = vec4(uC * core * (1.0 + head * 4.0) * tail * vVis * uA, 1.0); }`,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[],
	);
	useEffect(() => () => mat.dispose(), [mat]);
	mat.uniforms.uC.value.set(color);
	mat.uniforms.uP.value = prog;
	mat.uniforms.uR.value = radius;
	mat.uniforms.uA.value = alpha;
	if (prog <= 0 || alpha <= 0.002) return null;
	return <mesh geometry={geom} material={mat} renderOrder={6} />;
};

// ---------------------------------------------------------------------------------------------------- scene
/** the toon decal's Web-Mercator box: the outer patch's grid + `margin` of it on every side (as hawaii_decal.py / iceland_decal.py) */
const toonBox = (r: Region, mg: number): [number, number, number, number] => {
	const {x0, y0, x1, y1} = r.meta.mercator;
	return [x0 - mg * (x1 - x0), y0 - mg * (y1 - y0), x1 + mg * (x1 - x0), y1 + mg * (y1 - y0)];
};
/** [lat S, lat N, lon W, lon E] → Web-Mercator box (x0, y0 = north, x1, y1 = south), as backdrop_decal.py */
const mercYOf = (lat: number) => 0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2)) / (2 * Math.PI);
const llBox = ([s, n, w, e]: [number, number, number, number]): [number, number, number, number] => [(w + 180) / 360, mercYOf(n), (e + 180) / 360, mercYOf(s)];
const col3 = (hex: string): V3 => {
	const c = new THREE.Color(hex);
	return [c.r, c.g, c.b];
};

/** globe hop: spin + dive from `from` onto the opening camera of the next 3D shot; optional arc from `arcFrom`.
 *  label / prev / date / dist / extraSpin are accepted for the old call sites but not used (no text on the globe). */
export const GlobeHop: React.FC<{
	t0: number;
	t1: number;
	from: LL;
	to: LL;
	arcFrom?: LL;
	label?: string;
	prev?: {ll: LL; label: string}[];
	dist?: number;
	extraSpin?: number;
	date?: {text: string; at: number};
}> = ({t0, t1, from, to, arcFrom}) => {
	const t = useT();
	const dest = destOf(to) ?? DESTS[0];
	const tex = useGlobeTex();
	const toonTex = useToonTex(dest.toon?.src);
	const toonBgTex = useToonTex(dest.toon?.bg?.src);
	const rOut = useRegion(dest.patches[0].name);
	const rIn = useRegion(dest.patches[1].name);
	const th = dest.t3d > t0 + 0.3 && dest.t3d <= t1 + 0.01 ? dest.t3d : t1;
	const [f0, f1, to0, to1] = [from[0], from[1], to[0], to[1]];
	const plan = useMemo(() => (rIn ? makePlan(dest, rIn, t0, th, [f0, f1], [to0, to1]) : null), [dest, rIn, t0, th, f0, f1, to0, to1]);
	const patches = useMemo<PatchU[]>(() => (rOut && rIn ? [{r: rOut, def: dest.patches[0]}, {r: rIn, def: dest.patches[1]}] : []), [rOut, rIn, dest]);
	const arcA = useMemo<LL | null>(() => (arcFrom ? [arcFrom[0], arcFrom[1]] : null), [arcFrom?.[0], arcFrom?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
	const arcB = useMemo<LL>(() => [to0, to1], [to0, to1]);
	if (t < t0 || t >= t1 + XF + 0.05 || !plan || !tex || !rOut || !rIn || (dest.toon && !toonTex) || (dest.toon?.bg && !toonBgTex)) return null;
	const solo = !!(getInputProps() as {globeSolo?: boolean}).globeSolo;

	const st = plan.at(t);
	const cam = camOfG(st);
	const w = st.w;
	const camR = len(cam.pos);
	const alt = (camR - 1) * R_KM;

	// ---- globe-style sun: camera-relative, from the screen's upper left; for the night landing it swings behind the globe
	// the camera's own screen axes (three's lookAt with world-up Y, then the roll)
	const fw = norm(sub(cam.target, cam.pos));
	const xW = norm(cross(fw, [0, 1, 0]));
	const yW = cross(scale(fw, -1), xW);
	const rl = (cam.roll ?? 0) * DEG;
	const rgt = add(scale(xW, Math.cos(rl)), scale(yW, Math.sin(rl)));
	const upS = cross(rgt, fw);
	const toward = scale(fw, -1);
	// night landing: the sun sinks toward the terminator over the whole hop (dusk, not black: the next shot's opening is a
	// moonlit blue of about the same brightness)
	const xN = clamp01((t - t0) / (th - t0));
	// how dark the dusk gets follows the next shot's opening look (its `night` value at the handover)
	const nightEnd = clamp01(({...LOOKS[dest.look].terrain, ...dest.lookAt(th, plan.dEnd)}.night ?? 0) / 0.55);
	const sunAng = (dest.night ? lerp(lerp(55, 80, nightEnd), lerp(80, 106, nightEnd), (xN + sss(0, 1, xN)) / 2) : 43) * DEG;
	const side = norm(add(scale(rgt, -0.55), scale(upS, 0.75)));
	const sun = norm(add(scale(toward, Math.cos(sunAng)), scale(side, Math.sin(sunAng))));

	// ---- patches fade in once sharper than the globe texture; the next shot's look takes over at the end
	const logW = Math.log(w);
	const pa0 = ss(Math.log(dest.patches[0].fade[0]), Math.log(dest.patches[0].fade[1]), logW);
	const pa1 = ss(Math.log(dest.patches[1].fade[0]), Math.log(dest.patches[1].fade[1]), logW);
	const kA = Math.max(dest.kW[0], 3 * plan.wEnd);
	const kB = Math.min(Math.max(dest.kW[1], 1.15 * plan.wEnd), kA / 1.5);
	const k3 = Math.max(sss(Math.log(kA), Math.log(kB), logW), sss(th - 0.35, th - 0.03, t));
	const L = {...LOOKS[dest.look].terrain, ...dest.lookAt(t, st.dist)};
	// toon decal of the next shot: display-space cross-fade; bloom goes first (its threshold would catch the decal's bright
	// HDR whites), the vignette with it
	const toonK = dest.toon ? sss(th - dest.toon.t[0], th - dest.toon.t[1], t) : 0;
	const hmax = Math.max(...patches.map((p) => (Math.max(0, p.r.meta.h_max) / 1000) * p.r.exag)) + 0.05;

	const uniforms: Record<string, unknown> = {
		uSun: sun,
		uK: k3,
		uRelief: w < 420 ? 1 : 0,
		uDS: Math.min(1, plan.dEnd / st.dist),
		uNL: ss(Math.log(900), Math.log(2600), logW),
		uMoon: dest.night ? 0.32 : 0,
		uOutDark: ss(Math.log(dest.outW?.[0] ?? 1500), Math.log(dest.outW?.[1] ?? 450), logW),
		uOutAmt: dest.outSea ? 0 : dest.night ? 0.7 : 0.45,
		uOutSea: dest.outSea ? 1 : 0,
		uSeaExt: dest.seaExt ?? 0,
		uHmax: hmax,
		uP0: [pa0, dest.patches[0].feather, dest.patches[0].globe ? 1 : 0, rOut.meta.cloud_removal ?? rOut.name.startsWith('hawaii') ? 1 : 0],
		uP1: [pa1, dest.patches[1].feather, dest.patches[1].globe ? 1 : 0, 0],
		uGain: dest.gain,
		uGainEdge: dest.gainEdge,
		uSeaGlobe: dest.seaGlobe,
		uLSun: norm(L.sunDir),
		uLSunCol: col3(L.sunCol),
		uLSunI: L.sunI,
		uLSky: col3(L.skyCol),
		uLGround: col3(L.groundCol),
		uLAmb: L.ambI,
		uLFog: col3(L.fogCol),
		uLFogDens: L.fogDens,
		uLFogMax: L.fogMax,
		uLSatGain: L.satGain,
		uLSaturation: L.saturation,
		uLContrast: L.contrast,
		uLNight: L.night,
		uLWater: col3(L.waterCol),
		uLDeep: col3(L.waterDeep),
		uLTint: col3(L.tint),
		uLExpo: L.expo ?? 1,
		uLHorizon: col3(dest.horizonAt(t)),
		uToonK: toonK,
		uToonBox: toonBox(rOut, dest.toon?.margin ?? 0),
		uToonFe: dest.toon?.fe ?? 0,
		uToonSea: dest.toon?.sea ?? [0, 0, 0],
		uToonBgBox: dest.toon?.bg ? llBox(dest.toon.bg.box) : [0, 0, 1, 1],
	};
	// uP0/uP1 are Vector4s
	const v4 = (k: string) => {
		const a = uniforms[k] as number[];
		uniforms[k] = new THREE.Vector4(a[0], a[1], a[2], a[3]);
	};
	v4('uP0');
	v4('uP1');

	// ---- marker + arc
	const c = st.g;
	const vis = (ll: LL) => clamp01((dot(dirLL(ll[0], ll[1]), c) - 1 / camR) * 8);
	const tau = t - t0;
	const markers: MarkerP[] = [];
	let arcEl: React.ReactNode = null;
	if (arcA && dest.arc !== false) {
		const prog = dest.arcT ? sss(t0 + dest.arcT[0] * (th - t0), t0 + dest.arcT[1] * (th - t0), t) : clamp01(st.u * 1.12);
		const fadeHi = dest.arcT ? 1300 : Math.min(3500, plan.wArrive * 0.95);
		const arcFade = ss(Math.log(fadeHi * 0.5), Math.log(fadeHi), logW);
		markers.push({ll: arcA, color: '#ff9a3a', size: (0.075 * w) / R_KM, pulse: 0, alpha: 0.75 * vis(arcA) * (dest.arcT ? arcFade : 1 - ss(0.75, 0.95, st.u)) * ss(0, 0.3, tau)});
		const arcTh = angle(norm(dirLL(arcA[0], arcA[1])), norm(dirLL(arcB[0], arcB[1])));
		arcEl = <Arc a={arcA} b={arcB} height={dest.arcH ?? 0.06 + (0.13 * arcTh) / Math.PI} prog={prog} color="#ffb02a" radius={(5.5 * w) / 1080 / R_KM} alpha={arcFade * ss(0.05, 0.35, tau)} />;
	}
	const appear = ss(0.1, 0.55, tau);
	const land = ss(Math.log(380), Math.log(1100), logW);
	if (dest.marker !== false) markers.push({ll: arcB, color: '#ffd04a', size: (0.13 * w) / R_KM, pulse: tau * 0.9, alpha: appear * vis(arcB) * land});

	const near = Math.max(2e-6, (alt - hmax) * 0.4 / R_KM);
	return (
		<AbsoluteFill style={{overflow: 'hidden', ...(solo ? {zIndex: 50} : {})}}>
			<Stage3D cam={cam} near={near} far={camR + 2} post={{bloom: 0.6 * (1 - clamp01(toonK * 4)), threshold: 1.0, vignette: 0.45 * (1 - toonK)}}>
				<Sky look={SPACE} />
				<Earth tex={tex} patches={patches} u={uniforms} toon={toonTex} toonBg={toonBgTex} />
				<Atmosphere sun={sun} />
				{markers.map((m, i) => (
					<Marker key={i} m={m} />
				))}
				{arcEl}
			</Stage3D>
		</AbsoluteFill>
	);
};

/** for tools (path speed checks): the plan of a hop */
export const GLOBE_HOP_DEBUG = {destOf, makePlan, camOfG, widthOf};
