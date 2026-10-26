// Beat table (shots) — pure data, read by src/Short.tsx (render) and tools/check.mjs (contiguity, scene names, timeline.json
// for cut_frames.py / dupes.py). Each beat starts in a pause just before the first word of its phrase.
//   k     unique key
//   t0/t1 seconds (W(i) = start of word i of data/words.json; VO_END / DURATION from lib/time)
//   tr    entrance transition of THIS beat (the outgoing beat gets the paired exit): see engine/transitions.tsx, standard 4.3
//   at    focus point for zoomthru / circle / jagged (jagged: a point on / outside a frame edge = tear in from that edge)
//   subY  subtitle centre y while this beat is on screen: 1180–1300, pixels never below y 1440 (standard R3, check.mjs)
//   scene export name in src/scenes.tsx (SCENES)
//   live  optional, R4: true = this beat's map carries live action (ships, people, an advancing front — MovingToken /
//         AdvanceArrow / footage). A map beat that starts before 3 s is an ERROR in check.mjs (tools/map_check.py) without it
import {DURATION, W} from '../lib/time';

export type Tr = 'none' | 'zoomthru' | 'whipL' | 'whipR' | 'up' | 'circle' | 'diag' | 'punch' | 'fade' | 'jagged';
export type BeatDef = {k: string; t0: number; t1: number; tr: Tr; at?: [number, number]; subY: number; scene: string; live?: boolean};

// conman-russell (EDIT_PLAN.md): the cell wall counts the escapes — each new tally mark is the door we fly through (zoomthru).
// Tally layout lives here (check.mjs loads this file alone, so no imports besides lib/time); scenes.tsx draws the marks with it.
export const TALLY = {x0: 330, gap: 92, y: 860, h: 360};
export const tallyAt = (n: number): [number, number] => [TALLY.x0 + (n - 1) * TALLY.gap + 3, TALLY.y];
const b = (i: number) => W(i) - 0.06;
export const BEATS: BeatDef[] = [
	{k: 'hook', t0: 0.0, t1: b(10), tr: 'none', subY: 1250, scene: 'Hook'},
	{k: 'doorman', t0: b(10), t1: b(15), tr: 'punch', subY: 1250, scene: 'Doorman'},
	{k: 'wall1', t0: b(15), t1: b(16), tr: 'whipL', subY: 1250, scene: 'Wall1'},
	{k: 'workman', t0: b(16), t1: b(20), tr: 'zoomthru', at: tallyAt(1), subY: 1250, scene: 'Workman'},
	{k: 'tap', t0: b(20), t1: b(29), tr: 'punch', subY: 1250, scene: 'Tap'},
	{k: 'walkout', t0: b(29), t1: b(32), tr: 'circle', at: [540, 1000], subY: 1250, scene: 'Walkout'},
	{k: 'wall2', t0: b(32), t1: b(33), tr: 'whipR', subY: 1250, scene: 'Wall2'},
	{k: 'judge', t0: b(33), t1: b(42), tr: 'zoomthru', at: tallyAt(2), subY: 1250, scene: 'Judge'},
	{k: 'bail', t0: b(42), t1: b(53), tr: 'up', subY: 1280, scene: 'Bail'},
	{k: 'wall3', t0: b(53), t1: b(55), tr: 'whipL', subY: 1250, scene: 'Wall3'},
	{k: 'marker', t0: b(55), t1: b(61), tr: 'zoomthru', at: tallyAt(3), subY: 1250, scene: 'MarkerScene'},
	{k: 'doctor', t0: b(61), t1: b(71), tr: 'punch', subY: 1250, scene: 'Doctor'},
	{k: 'wall4', t0: b(71), t1: b(72), tr: 'whipR', subY: 1250, scene: 'Wall4'},
	{k: 'records', t0: b(72), t1: b(81), tr: 'zoomthru', at: tallyAt(4), subY: 1280, scene: 'Records'},
	{k: 'hospice', t0: b(81), t1: b(87), tr: 'up', subY: 1250, scene: 'Hospice'},
	{k: 'news', t0: b(87), t1: b(96), tr: 'diag', subY: 1280, scene: 'News'},
	{k: 'twist', t0: b(96), t1: b(98), tr: 'jagged', at: [540, 1130], subY: 1250, scene: 'Twist'},
	{k: 'checkout', t0: b(98), t1: b(110), tr: 'whipL', subY: 1250, scene: 'Checkout'},
	{k: 'wanted', t0: b(110), t1: b(116), tr: 'none', subY: 1250, scene: 'Wanted'},
	{k: 'motel', t0: b(116), t1: b(125), tr: 'circle', at: [800, 720], subY: 1290, scene: 'Binoculars'},
	{k: 'sentence', t0: b(125), t1: b(132), tr: 'punch', subY: 1250, scene: 'Sentence'},
	{k: 'cell', t0: b(132), t1: b(139), tr: 'fade', subY: 1250, scene: 'Cell'},
	{k: 'door', t0: b(139), t1: DURATION, tr: 'fade', subY: 1250, scene: 'DoorLoop'},
];
