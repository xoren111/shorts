import React from 'react';
import {AbsoluteFill} from 'remotion';
import project from '../project.json';
import {DURATION, LOOP_T, W, We} from './lib/time';
import {BEATS} from './data/beats';
import {Timeline, subYAt} from './engine/transitions';
import {easeInOut, useT} from './ui/gfx';
import {AtlasWindows} from './ui/Atlas';
import {Subtitles} from './ui/Subtitles';
import {Grain} from './ui/vox';
import * as Sc from './scenes';

// Canonical Short composition (SHORTS_PRODUCTION/04_Templates/remotion_short). Per Short you change: src/data/beats.ts,
// src/data/events.ts, src/scenes.tsx and project.json — this file stays as it is.
// Atlas only as a reaction (owner rule), only the owner's art: windows from project.json → "atlas" (src/ui/Atlas.tsx, README
// «Atlas»). variant = the A/B version (R2, project.ab → compositions Short-A / Short-B in Root.tsx): windows with "variant" and
// the A/B hook (Atlas in 0–1 s) are drawn only in their version; everything else is the same picture in every version.

/** a phrase shown big (KeyFact, BigText) is not also in the subtitles (owner: never the same thing twice) → project.hide_subs */
const HIDE = project.hide_subs as [number, number][];
const hidden = (t: number) => HIDE.some(([a, b]) => t >= W(a) - 0.06 && t < We(b) + 0.15);
/** …and its words never come back in a caption group that straddles the range edge (e.g. «DEMO OF OUR» after a hidden 0–3) */
const skipped = (i: number) => HIDE.some(([a, b]) => i >= a && i <= b);

export const Short: React.FC<{noSubs?: boolean; variant?: string}> = ({noSubs, variant}) => {
	const t = useT();
	const loop = easeInOut((t - LOOP_T) / (DURATION - LOOP_T));
	return (
		<AbsoluteFill style={{background: '#08060c'}}>
			<Timeline beats={BEATS} scenes={Sc.SCENES} />
			<AtlasWindows variant={variant} />
			{noSubs ? null : <Subtitles y={(x) => subYAt(BEATS, x)} hidden={hidden} skip={skipped} />}
			{/* loop: the last loop_s seconds dissolve into the very first frame (with its Atlas window in version B) */}
			{t >= LOOP_T ? (
				<AbsoluteFill style={{opacity: loop}}>
					<Sc.FirstFrame />
					<AtlasWindows variant={variant} at={0} />
				</AbsoluteFill>
			) : null}
			<Grain opacity={0.07} />
		</AbsoluteFill>
	);
};
