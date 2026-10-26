import './fonts';
import {Composition} from 'remotion';
import {GlobeTest} from './dev/GlobeTest';
import {TerrainTest} from './dev/TerrainTest';
import {FPS, TOTAL_FRAMES} from './lib/time';
import {Short} from './Short';
import {EtnaDiagramsTest} from './scenes/EtnaDiagrams';


export const RemotionRoot = () => (
	<>
		<Composition id="Short" component={Short} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
		<Composition
			id="TerrainTest"
			component={TerrainTest}
			durationInFrames={300}
			fps={30}
			width={1080}
			height={1920}
			defaultProps={{region: 'hawaii' as const, look: 'hawaii', lat: 19.55, lon: -155.45, az: 200, el: 25, dist: 40, fov: 40, prog: 0.5}}
		/>
		<Composition id="EtnaDiagramsTest" component={EtnaDiagramsTest} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
		<Composition id="GlobeTest" component={GlobeTest} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={{lat: 25, lon: -150, d: 3.2, tilt: 10}} />
	</>
);
