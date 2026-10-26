// Beat table (shots) — pure data, read by src/Short.tsx (render) and tools/check.mjs (contiguity, scene names, timeline.json
// for cut_frames.py / dupes.py). Each beat starts in a pause just before the first word of its phrase.
//   k     unique key
//   t0/t1 seconds (W(i) = start of word i of data/words.json; VO_END / DURATION from lib/time)
//   tr    entrance transition of THIS beat (the outgoing beat gets the paired exit): see engine/transitions.tsx, standard 4.3
//   at    focus point for zoomthru / circle / jagged (jagged: a point on / outside a frame edge = tear in from that edge)
//   subY  subtitle centre y while this beat is on screen: 1180–1300, pixels never below y 1440 (standard R3, check.mjs)
//   scene export name in src/scenes.tsx (SCENES)
//   scrim optional: true = the subtitles of this beat sit on a dark pill (light or busy ground under the caption band)
//   live  optional, R4: true = this beat's map carries live action (ships, people, an advancing front — MovingToken /
//         AdvanceArrow / footage). A map beat that starts before 3 s is an ERROR in check.mjs (tools/map_check.py) without it;
//         a map beat at frame 0 (t0 = 0) is an ERROR even with it (H1 / V4: frame 0 is a living being, never a map)
import {DURATION, W} from '../lib/time';

export type Tr = 'none' | 'zoomthru' | 'whipL' | 'whipR' | 'up' | 'circle' | 'diag' | 'punch' | 'fade' | 'jagged';
export type BeatDef = {k: string; t0: number; t1: number; tr: Tr; at?: [number, number]; subY: number; scene: string; live?: boolean; scrim?: boolean};

// hay-castle (../SCRIPT.md «Покадровый план», 22 rows + the loop beat): the bale wall is a curtain — x-rayed, toppled, rewound;
// the «4 YEARS» timer rides the wall until the twist shows the clock had never started.
// Layout constants live here (check.mjs loads this file alone, so no imports besides lib/time); scenes.tsx reads them.
/** the field world: wall units → screen at the reference camera (wall base centre at (REF.X, REF.Y), REF.S px per unit) */
export const REF = {S: 0.165, X: 440, Y: 930};
/** the timer «4 YEARS» sticker on the wall face (wall units) and its scale per camera scale */
export const TIMER = {u: 360, v: -1150, k: 2.0};
/** the gap the farmer rams the last bale into (frame 0); the castle slot (merlon – crenel with the cannon barrel – slit merlon)
 *  spans this cell and half of the next one, so the castle stays visible after the thump */
export const GAP_CELL: [number, number] = [2, 8];
/** the left door of TwoDoors (scaled into x 79–861 in the Judge scene): zoom-through into the demolition */
export const LEFT_DOOR: [number, number] = [229, 857];

const b = (i: number) => W(i) - 0.06;
export const BEATS: BeatDef[] = [
	{k: 'hook', t0: 0.0, t1: b(7), tr: 'none', subY: 1250, scene: 'Hook', scrim: true},
	{k: 'never', t0: b(7), t1: b(14), tr: 'punch', subY: 1250, scene: 'Never'},
	{k: 'bet', t0: b(14), t1: b(21), tr: 'whipL', subY: 1250, scene: 'Bet'},
	{k: 'look', t0: b(21), t1: b(26), tr: 'whipR', subY: 1250, scene: 'Look'},
	{k: 'gone', t0: b(26), t1: b(32), tr: 'none', subY: 1250, scene: 'Gone'},
	{k: 'battlements', t0: b(32), t1: b(33), tr: 'zoomthru', at: [440, 620], subY: 1250, scene: 'Battlements'},
	{k: 'cannons', t0: b(33), t1: b(34), tr: 'punch', subY: 1250, scene: 'Cannons', scrim: true},
	{k: 'family', t0: b(34), t1: b(38), tr: 'none', subY: 1250, scene: 'Family'},
	{k: 'neversees', t0: b(38), t1: b(44), tr: 'whipL', subY: 1250, scene: 'NeverSees'},
	{k: 'down', t0: b(44), t1: b(51), tr: 'none', subY: 1250, scene: 'Down'},
	{k: 'won', t0: b(51), t1: b(55), tr: 'punch', subY: 1250, scene: 'Won', scrim: true},
	{k: 'court', t0: b(55), t1: b(59), tr: 'none', subY: 1250, scene: 'Court', scrim: true},
	{k: 'twist', t0: b(59), t1: b(66), tr: 'punch', subY: 1250, scene: 'Twist'},
	{k: 'unfinished', t0: b(66), t1: b(75), tr: 'whipL', subY: 1250, scene: 'Unfinished', scrim: true},
	{k: 'clock', t0: b(75), t1: b(80), tr: 'punch', subY: 1250, scene: 'Clock'},
	{k: 'bats', t0: b(80), t1: b(86), tr: 'whipR', subY: 1250, scene: 'Bats'},
	{k: 'movedin', t0: b(86), t1: b(90), tr: 'none', subY: 1250, scene: 'MovedIn'},
	{k: 'knock', t0: b(90), t1: b(100), tr: 'none', subY: 1250, scene: 'Knock'},
	{k: 'rejected', t0: b(100), t1: b(101), tr: 'punch', subY: 1250, scene: 'Rejected'},
	{k: 'judge', t0: b(101), t1: b(109), tr: 'whipL', subY: 1250, scene: 'Judge'},
	{k: 'tears', t0: b(109), t1: b(116), tr: 'zoomthru', at: LEFT_DOOR, subY: 1250, scene: 'Tears'},
	{k: 'beaten', t0: b(116), t1: W(123) + 0.04, tr: 'none', subY: 1250, scene: 'Beaten', scrim: true},
	// R1: the loop beat enters with 'fade' only — a locked match dissolve: the farmer and the bale hold the frame-0 pose and
	// framing on both sides (scenes.tsx Beaten → Loop), only the world around them changes from the empty plot to the wall
	{k: 'loop', t0: W(123) + 0.04, t1: DURATION, tr: 'fade', subY: 1250, scene: 'Loop', scrim: true},
];
