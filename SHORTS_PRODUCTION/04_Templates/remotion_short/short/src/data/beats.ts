// Beat table (shots) — pure data, read by src/Short.tsx (render) and tools/check.mjs (contiguity, scene names, timeline.json
// for cut_frames.py / dupes.py). Each beat starts in a pause just before the first word of its phrase.
//   k     unique key
//   t0/t1 seconds (W(i) = start of word i of data/words.json; VO_END / DURATION from lib/time)
//   tr    entrance transition of THIS beat (the outgoing beat gets the paired exit): see engine/transitions.tsx, standard 4.3
//   at    focus point for zoomthru / circle / jagged (jagged: a point on / outside a frame edge = tear in from that edge)
//   subY  subtitle centre y while this beat is on screen: 1180–1300, pixels never below y 1440 (standard R3, check.mjs)
//   scene export name in src/scenes.tsx (SCENES)
//   live  optional, R4: true = this beat's map carries live action (ships, people, an advancing front — MovingToken /
//         AdvanceArrow / footage). A map beat that starts before 3 s is an ERROR in check.mjs (tools/map_check.py) without it;
//         a map beat at frame 0 (t0 = 0) is an ERROR even with it (H1 / V4: frame 0 is a living being, never a map)
import {DURATION, W} from '../lib/time';

export type Tr = 'none' | 'zoomthru' | 'whipL' | 'whipR' | 'up' | 'circle' | 'diag' | 'punch' | 'fade' | 'jagged';
export type BeatDef = {k: string; t0: number; t1: number; tr: Tr; at?: [number, number]; subY: number; scene: string; live?: boolean};

// DEMO (template-demo, vo_demo.wav): replace with the beats of the new Short
export const BEATS: BeatDef[] = [
	{k: 'hook', t0: 0.0, t1: W(8) - 0.05, tr: 'none', subY: 1300, scene: 'Hook'},
	{k: 'collage', t0: W(8) - 0.05, t1: W(15) - 0.06, tr: 'whipL', subY: 1300, scene: 'Collage'},
	{k: 'seal', t0: W(15) - 0.06, t1: W(21) - 0.06, tr: 'zoomthru', at: [540, 860], subY: 1300, scene: 'SealScene'},
	{k: 'moves', t0: W(21) - 0.06, t1: W(23) - 0.06, tr: 'up', subY: 1250, scene: 'Moves'},
	{k: 'twist', t0: W(23) - 0.06, t1: W(25) - 0.06, tr: 'punch', subY: 1300, scene: 'Twist'},
	{k: 'end', t0: W(25) - 0.06, t1: DURATION, tr: 'fade', subY: 1300, scene: 'End'},
];
