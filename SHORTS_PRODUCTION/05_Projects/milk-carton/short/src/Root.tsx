import './fonts';
import React from 'react';
import {Composition} from 'remotion';
import {FPS, TOTAL_FRAMES} from './lib/time';
import {Short} from './Short';
import {abVariants} from './ui/Atlas';
import {Gallery, GALLERY_S} from './Gallery';
import {KineticGallery, KINETIC_GALLERY_S} from './KineticGallery';
import {ChartsGallery, CHARTS_GALLERY_S} from './ChartsGallery';
import {MapsDemo, MAPS_DEMO_S} from './MapsDemo';
import {MorphRevealDemo, MorphShowcase, REVEAL_S, SHOWCASE_S} from './ui/morph_demo';
import {MotionDemo, MOTION_DEMO_S} from './MotionDemo';
import {MilkKitAGallery, MILK_KIT_A_S} from './MilkKitAGallery';
import {MilkKitBGallery, MILK_KIT_B_S} from './MilkKitBGallery';
import {MilkHandsGallery, MILK_HANDS_S} from './MilkHandsGallery';
import {CoverDemo} from './CoverDemo';

// Compositions:
//   Short          the Short (no A/B variant: every window with "variant" stays hidden — the same picture as version A)
//   Short-A, -B    only with project.json → "ab": {"enabled": true, …} (standard R2): same beats, version B adds the Atlas
//                  hook in 0–1 s; VARIANT=A|B node tools/render.mjs → out/FINAL/<stem>_A.mp4 / _B.mp4
// Tests, never published (check.mjs skips their texts / numbers: file names *Gallery.tsx, *Demo.tsx, *_demo.tsx):
//   Gallery        one scene per component group (src/Gallery.tsx)
//   KineticGallery all six kinetic presets (src/KineticGallery.tsx)       ChartsGallery  the five charts (props guides, footage)
//   MapsDemo       route · period borders · advance arrow (src/MapsDemo.tsx)
//   MorphShowcase  8 s morph run (props plain, clip)                     MorphReveal    full-frame MorphMask reveals (prop clip)
//   MotionDemo     the whole kit in one dense L2 sequence, ~22 s (src/MotionDemo.tsx)
//   MilkKitA, MilkKitB  milk-carton drawing kits (src/ui/milk_a.tsx, src/ui/milk_b.tsx)
//   MilkHands      the hands of src/ui/milk_hands.tsx (her ☝ hand, his hand + watch, his carton grip: back fingers + palm, index out)
//   Cover          the 2160×3840 cover still (src/CoverDemo.tsx, standard H12)
const TEST = {fps: FPS, width: 1080, height: 1920} as const;
export const RemotionRoot = () => (
	<>
		<Composition id="Short" component={Short} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{noSubs: false}} />
		{abVariants().map((v) => (
			<Composition key={v} id={`Short-${v}`} component={Short} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{noSubs: false, variant: v}} />
		))}
		<Composition id="Gallery" component={Gallery} durationInFrames={Math.round(GALLERY_S * FPS)} {...TEST} />
		<Composition id="KineticGallery" component={KineticGallery} durationInFrames={Math.round(KINETIC_GALLERY_S * FPS)} {...TEST} />
		<Composition id="ChartsGallery" component={ChartsGallery} durationInFrames={Math.round(CHARTS_GALLERY_S * FPS)} {...TEST} defaultProps={{guides: false}} />
		<Composition id="MapsDemo" component={MapsDemo} durationInFrames={Math.round(MAPS_DEMO_S * FPS)} {...TEST} />
		<Composition id="MorphShowcase" component={MorphShowcase} durationInFrames={Math.round(SHOWCASE_S * FPS)} {...TEST} defaultProps={{plain: false}} />
		<Composition id="MorphReveal" component={MorphRevealDemo} durationInFrames={Math.round(REVEAL_S * FPS)} {...TEST} defaultProps={{}} />
		<Composition id="MotionDemo" component={MotionDemo} durationInFrames={Math.round(MOTION_DEMO_S * FPS)} {...TEST} />
		<Composition id="MilkKitA" component={MilkKitAGallery} durationInFrames={Math.round(MILK_KIT_A_S * FPS)} {...TEST} />
		<Composition id="MilkKitB" component={MilkKitBGallery} durationInFrames={Math.round(MILK_KIT_B_S * FPS)} {...TEST} />
		<Composition id="MilkHands" component={MilkHandsGallery} durationInFrames={Math.round(MILK_HANDS_S * FPS)} {...TEST} />
		<Composition id="Cover" component={CoverDemo} durationInFrames={1} {...TEST} />
	</>
);
