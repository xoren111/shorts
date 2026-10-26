import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';

export type RegionName = 'hawaii' | 'hawaii_flow' | 'hawaii_vent' | 'etna' | 'heimaey' | 'etna_wide' | 'heimaey_wide';
export type Meta = {
	region: RegionName;
	bbox: {s: number; n: number; w: number; e: number};
	nx: number;
	ny: number;
	width_m: number;
	height_m: number;
	h_min: number;
	h_max: number;
	mercator: {x0: number; y0: number; x1: number; y1: number};
	/** shader cloud removal (bright colourless patches → ground); default on for the EOX-based Hawaii grids */
	cloud_removal?: boolean;
};

/** Scene units: kilometres. x = east, z = south, y = up (× vertical exaggeration). Grid centre = (0, 0). */
export type Region = {
	name: RegionName;
	meta: Meta;
	heights: Float32Array;
	sat: THREE.Texture;
	lava: THREE.Texture | null;
	/** distance to the flow margin (0 edge … 1 ≥ 180 m inside) */
	lavaEdge: THREE.Texture | null;
	/** anti-aliased land mask (255 land) where the DEM's own coastline is too coarse */
	land: THREE.Texture | null;
	/** normal map from the highest-resolution DEM (scene axes, exaggerated), when tools built one */
	normal: THREE.Texture | null;
	/** CC0 photographic micro-detail tiles (public/tex), shared by all regions */
	detail: Detail | null;
	wKm: number;
	hKm: number;
	exag: number;
	/** lat/lon → scene x/z (km) */
	geo: (lat: number, lon: number) => [number, number];
	/** terrain height (scene units, exaggerated) at scene x/z */
	ground: (x: number, z: number) => number;
	/** lat/lon → [x, y(ground + agl km), z] */
	at: (lat: number, lon: number, aglKm?: number) => [number, number, number];
	/** scene x/z → uv of the textures */
	uv: (x: number, z: number) => [number, number];
};

export const EXAG: Record<RegionName, number> = {hawaii: 2.2, hawaii_flow: 2.2, hawaii_vent: 2.2, etna: 1.5, heimaey: 1.35, etna_wide: 1.5, heimaey_wide: 1.35};

export type Detail = {rock: THREE.Texture; grass: THREE.Texture; soil: THREE.Texture; cliff: THREE.Texture; rockN: THREE.Texture; grassN: THREE.Texture; soilN: THREE.Texture};

const cache = new Map<RegionName, Promise<Region>>();
let detailP: Promise<Detail | null> | null = null;
const loadDetail = () => {
	if (!detailP) {
		detailP = (async () => {
			try {
				const ok = await fetch(staticFile('tex/credits.json'));
				if (!ok.ok) return null;
				const t = async (n: string, srgb: boolean) => {
					const x = await loadTex(staticFile(`tex/${n}.jpg`), srgb);
					x.wrapS = x.wrapT = THREE.RepeatWrapping;
					x.anisotropy = 16;
					return x;
				};
				const [rock, grass, soil, cliff, rockN, grassN, soilN] = await Promise.all([
					t('rock_diff', true), t('grass_diff', true), t('soil_diff', true), t('cliff_diff', true), t('rock_nor', false), t('grass_nor', false), t('soil_nor', false),
				]);
				return {rock, grass, soil, cliff, rockN, grassN, soilN};
			} catch {
				return null;
			}
		})();
	}
	return detailP;
};
const done = new Map<RegionName, Region>();

const mercX = (lon: number) => (lon + 180) / 360;
const mercY = (lat: number) => (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2;

const loadTex = (url: string, srgb: boolean) =>
	new Promise<THREE.Texture>((res, rej) => {
		new THREE.TextureLoader().load(
			url,
			(t) => {
				if (srgb) t.colorSpace = THREE.SRGBColorSpace;
				t.anisotropy = 16;
				t.generateMipmaps = true;
				t.minFilter = THREE.LinearMipmapLinearFilter;
				t.magFilter = THREE.LinearFilter;
				res(t);
			},
			undefined,
			rej,
		);
	});

export const loadRegion = (name: RegionName): Promise<Region> => {
	const c = cache.get(name);
	if (c) return c;
	const p = (async () => {
		const meta: Meta = await (await fetch(staticFile(`terrain/${name}/meta.json`))).json();
		const buf = await (await fetch(staticFile(`terrain/${name}/height.bin`))).arrayBuffer();
		const heights = new Float32Array(buf);
		const sat = await loadTex(staticFile(`terrain/${name}/sat.jpg`), true);
		let lava: THREE.Texture | null = null;
		try {
			lava = await loadTex(staticFile(`terrain/${name}/lava.png`), false);
		} catch {
			lava = null;
		}
		const opt = async (f: string) => {
			try {
				const ok = await fetch(staticFile(`terrain/${name}/${f}`), {method: 'HEAD'});
				return ok.ok ? await loadTex(staticFile(`terrain/${name}/${f}`), false) : null;
			} catch {
				return null;
			}
		};
		const lavaEdge = lava ? await opt('lava_edge.png') : null;
		const land = name === 'heimaey' ? await opt('land.png') : null;
		let normal: THREE.Texture | null = null;
		if ((meta as {normal_map?: string}).normal_map) {
			try {
				normal = await loadTex(staticFile(`terrain/${name}/${(meta as {normal_map?: string}).normal_map}`), false);
			} catch {
				normal = null;
			}
		}
		const detail = await loadDetail();
		const wKm = meta.width_m / 1000;
		const hKm = meta.height_m / 1000;
		const exag = EXAG[name];
		const {x0, y0, x1, y1} = meta.mercator;
		const uv = (x: number, z: number): [number, number] => [x / wKm + 0.5, z / hKm + 0.5];
		const geo = (lat: number, lon: number): [number, number] => [((mercX(lon) - x0) / (x1 - x0) - 0.5) * wKm, ((mercY(lat) - y0) / (y1 - y0) - 0.5) * hKm];
		const ground = (x: number, z: number) => {
			const [u, v] = uv(x, z);
			const fx = Math.max(0, Math.min(meta.nx - 1.001, u * (meta.nx - 1)));
			const fy = Math.max(0, Math.min(meta.ny - 1.001, v * (meta.ny - 1)));
			const i = Math.floor(fx);
			const j = Math.floor(fy);
			const a = fx - i;
			const b = fy - j;
			const h = (ii: number, jj: number) => Math.max(0, heights[jj * meta.nx + ii]);
			const hh = h(i, j) * (1 - a) * (1 - b) + h(i + 1, j) * a * (1 - b) + h(i, j + 1) * (1 - a) * b + h(i + 1, j + 1) * a * b;
			return (hh / 1000) * exag;
		};
		const at = (lat: number, lon: number, agl = 0): [number, number, number] => {
			const [x, z] = geo(lat, lon);
			return [x, ground(x, z) + agl, z];
		};
		const r: Region = {name, meta, heights, sat, lava, lavaEdge, land, normal, detail, wKm, hKm, exag, geo, ground, at, uv};
		done.set(name, r);
		return r;
	})();
	cache.set(name, p);
	return p;
};

/** Region for rendering; holds the frame (delayRender) until loaded. Returns null while loading. */
export const useRegion = (name: RegionName): Region | null => {
	const [r, setR] = useState<Region | null>(() => done.get(name) ?? null);
	const [handle] = useState(() => (done.get(name) ? null : delayRender(`region ${name}`, {timeoutInMilliseconds: 180000})));
	useEffect(() => {
		if (handle === null) return;
		let alive = true;
		loadRegion(name).then((x) => {
			if (alive) setR(x);
			else continueRender(handle);
		});
		return () => {
			alive = false;
		};
	}, [handle, name]);
	// release only after the commit that mounts the region's children (their own delayRender holds are registered first)
	useEffect(() => {
		if (r && handle !== null) continueRender(handle);
	}, [r, handle]);
	return r;
};
