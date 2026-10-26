import React from 'react';
import {useCurrentFrame} from 'remotion';
import {GlobeScene, globeCam} from '../three/Globe';

export const GlobeTest: React.FC<{lat: number; lon: number; d: number; tilt: number}> = (p) => {
	const f = useCurrentFrame();
	return (
		<GlobeScene
			cam={globeCam(p.lat, p.lon + f * 0.3, p.d, 35, p.tilt)}
			sun={[0.4, 0.5, 1]}
			markers={[{lat: 19.47, lon: -155.6, color: '#ff8a2a', size: 0.12, pulse: f / 30, alpha: 1}]}
			arcs={[{a: [19.47, -155.6], b: [37.75, 15.0], prog: 0.6, color: '#ffb02a'}]}
		/>
	);
};
