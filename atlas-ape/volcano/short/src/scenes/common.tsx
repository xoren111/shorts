import React from 'react';
import {AbsoluteFill} from 'remotion';
import {orbit, type Cam, type Orbit, lerpOrbit} from '../three/cam';
import {LOOKS} from '../three/looks';
import {Ocean} from '../three/Ocean';
import {useRegion, type Region, type RegionName} from '../three/region';
import {Sky, type SkyLook} from '../three/Sky';
import {Stage3D, type PostOpts} from '../three/Stage3D';
import {TerrainMesh, type Berm, type Highlight, type LavaState, type Look} from '../three/TerrainMesh';
import {useT} from '../ui/gfx';
import {FPS} from '../lib/time';
import {useCurrentFrame} from 'remotion';

export type V3 = [number, number, number];

/** camera shot: orbit eased from `a` to `b` over [t0, t1]; ease 'io' | 'out' | 'in' | 'lin'; shake = amplitude curve */
export type Shot = {t0: number; t1: number; a: Orbit; b: Orbit; ease?: 'io' | 'out' | 'in' | 'lin' | 'ramp'};

const E = {
	io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
	out: (x: number) => 1 - Math.pow(1 - x, 3),
	in: (x: number) => x * x * x,
	lin: (x: number) => x,
	// speed ramp: fast start, slow middle, fast end
	ramp: (x: number) => 0.5 + 0.5 * Math.sign(x - 0.5) * Math.pow(Math.abs(2 * x - 1), 0.45),
};

export const shotAt = (shots: Shot[], t: number): {cam: Cam; shot: Shot; k: number} => {
	let s = shots[0];
	for (const x of shots) if (t >= x.t0) s = x;
	const k = Math.max(0, Math.min(1, (t - s.t0) / Math.max(1e-3, s.t1 - s.t0)));
	const e = E[s.ease ?? 'io'](k);
	return {cam: orbit(lerpOrbit(s.a, s.b, e)), shot: s, k};
};

/** deterministic camera shake: amplitude in degrees of target jitter, applied to the cam target + roll */
export const shake = (cam: Cam, amp: number, t: number): Cam => {
	if (amp <= 0) return cam;
	const n = (f: number, p: number) => Math.sin(t * f + p) * 0.6 + Math.sin(t * f * 2.13 + p * 1.7) * 0.4;
	const d = Math.hypot(cam.pos[0] - cam.target[0], cam.pos[1] - cam.target[1], cam.pos[2] - cam.target[2]);
	const r = (amp * Math.PI) / 180 * d;
	return {...cam, target: [cam.target[0] + n(37, 1) * r, cam.target[1] + n(41, 2) * r, cam.target[2] + n(33, 3) * r], roll: (cam.roll ?? 0) + n(29, 4) * amp * 0.8};
};

/** impact envelope for shakes: sharp attack, exponential decay */
export const impact = (t: number, at: number, amp: number, decay = 5) => (t < at ? 0 : amp * Math.exp(-(t - at) * decay));

export type Scene3DProps = {
	region: RegionName;
	wide?: RegionName | RegionName[];
	look: string;
	lookOverride?: Partial<Look>;
	skyOverride?: Partial<SkyLook>;
	cam: Cam | ((r: Region, t: number) => Cam);
	lava?: LavaState | ((r: Region, t: number) => LavaState);
	hl?: Highlight | null | ((r: Region, t: number) => Highlight | null);
	berm?: (r: Region, t: number) => Berm | null;
	post?: PostOpts;
	children?: (r: Region, t: number) => React.ReactNode;
	overlay?: (r: Region, cam: Cam, t: number) => React.ReactNode;
	/** camera near plane (km, default 0.02 in Stage3D): raise it for far views so low coasts do not z-fight with the sea */
	near?: number;
};

/** one 3D region scene (detailed + optional coarse surrounding grid, ocean, sky) + DOM overlay in the same camera */
export const Scene3D: React.FC<Scene3DProps> = ({region, wide, look, lookOverride, skyOverride, cam, lava, hl, berm, post, children, overlay, near}) => {
	const f = useCurrentFrame();
	const t = f / FPS;
	const r = useRegion(region);
	const wl = wide === undefined ? [] : Array.isArray(wide) ? wide : [wide];
	const w1 = useRegion(wl[0] ?? region);
	const w2 = useRegion(wl[1] ?? wl[0] ?? region);
	if (!r || !w1 || !w2) return null;
	const wides = [w1, w2].slice(0, wl.length);
	const C = typeof cam === 'function' ? cam(r, t) : cam;
	const LV = typeof lava === 'function' ? lava(r, t) : lava;
	const HL = typeof hl === 'function' ? hl(r, t) : hl;
	const L = {...LOOKS[look].terrain, ...lookOverride};
	const S = {...LOOKS[look].sky, ...skyOverride};
	const prog = LV?.prog ?? ([0, 0, 0] as V3);
	const cool = LV?.cool ?? ([0, 0, 0] as V3);
	return (
		<AbsoluteFill>
			<Stage3D cam={C} post={post} near={near}>
				<Sky look={S} />
				<Ocean region={r} look={L} time={t} prog={prog} cool={cool} glow={LV?.gain ?? 1} horizon={S.horizon} sky={S} />
				{wides.map((w, i) => (
					<TerrainMesh key={w.name} region={w} frame={r} inner={i === 0 ? r : wides[i - 1]} level={i + 1} outer={i === wides.length - 1} look={L} time={t} />
				))}
				<TerrainMesh region={r} look={L} time={t} lava={LV} hl={HL} berm={berm?.(r, t) ?? null} />
				{children?.(r, t)}
			</Stage3D>
			{overlay ? <AbsoluteFill>{overlay(r, C, t)}</AbsoluteFill> : null}
		</AbsoluteFill>
	);
};

export const useTime = useT;
