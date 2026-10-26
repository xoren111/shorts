import './fonts';
import {Composition} from 'remotion';
import {FPS, TOTAL_FRAMES} from './lib/time';
import {Short} from './Short';

export const RemotionRoot = () => (
	<>
		<Composition id="Short" component={Short} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{noSubs: false, flow: false}} />
		<Composition id="ShortFlow" component={Short} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{noSubs: false, flow: true}} />
	</>
);
