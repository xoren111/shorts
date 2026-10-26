import React from 'react';
import {useCurrentFrame} from 'remotion';
import {orbit} from '../three/cam';
import {LOOKS} from '../three/looks';
import {Ocean} from '../three/Ocean';
import {useRegion, type RegionName} from '../three/region';
import {Sky} from '../three/Sky';
import {Stage3D} from '../three/Stage3D';
import {TerrainMesh} from '../three/TerrainMesh';

export const TerrainTest: React.FC<{region: RegionName; wide?: RegionName; look: string; lat: number; lon: number; az: number; el: number; dist: number; fov: number; prog: number}> = (p) => {
	const f = useCurrentFrame();
	const r = useRegion(p.region);
	const w = useRegion(p.wide ?? p.region);
	if (!r || !w) return null;
	const L = LOOKS[p.look];
	const tgt = r.at(p.lat, p.lon);
	const cam = orbit({target: tgt, az: p.az + f * 0.2, el: p.el, dist: p.dist, fov: p.fov});
	const lava = {prog: [p.prog, p.prog, p.prog] as [number, number, number], cool: [0, 0, 0] as [number, number, number], gain: 1, noise: 8, thick: 0.004};
	return (
		<Stage3D cam={cam}>
			<Sky look={L.sky} />
			<Ocean region={r} look={L.terrain} time={f / 30} prog={lava.prog} cool={lava.cool} />
			{p.wide ? <TerrainMesh region={w} frame={r} look={L.terrain} time={f / 30} /> : null}
			<TerrainMesh region={r} look={L.terrain} time={f / 30} lava={lava} />
		</Stage3D>
	);
};
