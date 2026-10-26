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
import {DURATION, W, We} from '../lib/time';

export type Tr = 'none' | 'zoomthru' | 'whipL' | 'whipR' | 'up' | 'circle' | 'diag' | 'punch' | 'fade' | 'jagged';
export type BeatDef = {k: string; t0: number; t1: number; tr: Tr; at?: [number, number]; subY: number; scene: string; live?: boolean; scrim?: boolean};

// milk-carton (../SCRIPT.md «Покадровый план», 23 rows; row 23 «Except…» is the loop beat): one drawn milk carton with her face
// travels from shot to shot (fridge → checkout laser → scissors → doll case → the neighbour's fridge → printing line → the wall of
// cartons → the frame-0 fridge again). Adults are hands only: wristwatch = stepdad, bangle = mom, checked sleeve = dad; no adult face.
// Energy L2: hard cuts, whips and punches on the hits, zoom-throughs as match cuts «into» the carton / the case, one diag, one
// circle; never jagged; the final beat enters only with 'fade' (R1). Captions on a scrim wherever the ground under the caption band
// (y ≈ 1180–1320) is the bright fridge / store, paper, cardboard or flashing light; beats whose words are all in hide_subs need none.
//
// Layout contract (check.mjs loads this file alone, so no imports besides lib/time; the scenes import these and MUST put the
// object there, otherwise the zoom-through / circle opens from the wrong point and the match cut breaks):
/** frame 0 (Hook, Famous, IsThatMe, Loop end, FirstFrame): her eye line — the printed eyes on the carton line up with it at 0.45 s */
export const EYE_Y = 760;
/** frame 0: centre of the MISSING header on the carton held beside her cheek (zoom-through Hook → Missing) */
export const CARTON0: [number, number] = [650, 560];
/** end of KeepIt: centre of the photo panel (MISSING over her face) on the empty carton lying on the kitchen table (zoom-through → Cuts) */
export const KEEP_PHOTO: [number, number] = [540, 720];
/** end of NextDoor (the camera has eased in on the lone doll case on the neighbours' carpet): centre of the case (zoom-through → RealName) */
export const CASE_END: [number, number] = [540, 900];
/** start of DadPut: centre of her toddler photo on the plain desk (circle reveal) */
export const DESK_PHOTO: [number, number] = [540, 760];
/** end of NoneHome = start of Loop: the one carton that keeps its colour sits here in the wall, and the same carton stands here in the
 *  frame-0 dairy fridge when Loop fades in (locked match dissolve, R1) */
export const LONE_CARTON: [number, number] = [540, 720];

const r3 = (x: number) => Math.round(x * 1000) / 1000;
/** cut in the pause before word i (0.06 s lead); where there is no pause (word 36 «With» right after «dad.») the cut sits on the boundary */
const b = (i: number) => r3(Math.max(We(i - 1), W(i) - 0.06));
const SUB = 1250;

export const BEATS: BeatDef[] = [
	// ---------------- part 1 (src/scenes_1.tsx): words 0–39, 0 – 12.66 s
	{k: 'hook', t0: 0.0, t1: b(8), tr: 'none', subY: SUB, scene: 'Hook', scrim: true},
	{k: 'missing', t0: b(8), t1: b(15), tr: 'zoomthru', at: CARTON0, subY: SUB, scene: 'Missing', scrim: true},
	{k: 'mancan', t0: b(15), t1: b(20), tr: 'none', subY: SUB, scene: 'ManCan', scrim: true},
	{k: 'famous', t0: b(20), t1: b(25), tr: 'whipL', subY: SUB, scene: 'Famous', scrim: true},
	// hard cut + the scene camera's own zoom punch (the engine's 'punch' cross-fades for 0.06 s: two near-identical framings of the
	// store set ghosted into a double image at 8.35 s)
	{k: 'isthatme', t0: b(25), t1: b(28), tr: 'none', subY: SUB, scene: 'IsThatMe', scrim: true},
	{k: 'hush', t0: b(28), t1: b(29), tr: 'none', subY: SUB, scene: 'Hush', scrim: true},
	{k: 'takeher', t0: b(29), t1: b(36), tr: 'whipR', subY: SUB, scene: 'TakeHer', scrim: true},
	{k: 'mom', t0: b(36), t1: b(40), tr: 'punch', subY: SUB, scene: 'Mom', scrim: true},
	// ---------------- part 2 (src/scenes_2.tsx): words 40–83, 12.66 – 25.04 s
	{k: 'ontherun', t0: b(40), t1: b(47), tr: 'whipL', subY: SUB, scene: 'OnTheRun', scrim: true},
	{k: 'notrun', t0: b(47), t1: b(50), tr: 'none', subY: SUB, scene: 'NotRun', scrim: true},
	{k: 'nothide', t0: b(50), t1: b(55), tr: 'whipL', subY: SUB, scene: 'NotHide', scrim: true},
	// TWIST (word 56 «BUYS», 17.56 s = 46 %): words 55–57 hidden (card «HE BUYS IT.»)
	{k: 'buys', t0: b(55), t1: b(58), tr: 'punch', subY: SUB, scene: 'Buys'},
	// SCREENSHOT MOMENT (word 65 «keep», 19.55 s): words 58–66 hidden (card «DO YOU WANT TO KEEP IT?»)
	{k: 'keepit', t0: b(58), t1: b(67), tr: 'up', subY: SUB, scene: 'KeepIt'},
	{k: 'cuts', t0: b(67), t1: b(73), tr: 'zoomthru', at: KEEP_PHOTO, subY: SUB, scene: 'Cuts', scrim: true},
	{k: 'tosses', t0: b(73), t1: b(79), tr: 'whipR', subY: SUB, scene: 'Tosses', scrim: true},
	{k: 'nextdoor', t0: b(79), t1: b(84), tr: 'diag', subY: SUB, scene: 'NextDoor'},
	// ---------------- part 3 (src/scenes_3.tsx): words 84–125 + the loop, 25.04 – 37.97 s
	{k: 'realname', t0: b(84), t1: b(90), tr: 'zoomthru', at: CASE_END, subY: SUB, scene: 'RealName', scrim: true},
	{k: 'police', t0: b(90), t1: b(97), tr: 'punch', subY: SUB, scene: 'Police', scrim: true},
	{k: 'handedback', t0: b(97), t1: b(106), tr: 'none', subY: SUB, scene: 'HandedBack'},
	{k: 'dadput', t0: b(106), t1: b(116), tr: 'circle', at: DESK_PHOTO, subY: SUB, scene: 'DadPut', scrim: true},
	// words 116–118 hidden (stamp BILLIONS)
	{k: 'billions', t0: b(116), t1: b(119), tr: 'punch', subY: SUB, scene: 'Billions'},
	// seamless 'none': the same wall and camera continue from Billions (like A1 Look → Gone), so the cut never shows
	{k: 'nonehome', t0: b(119), t1: b(125), tr: 'none', subY: SUB, scene: 'NoneHome', scrim: true},
	// R1: the loop beat enters with 'fade' only — a locked match dissolve: the lone coloured carton keeps its screen spot (LONE_CARTON)
	// while the wall becomes the frame-0 fridge; the watch hand lifts it toward her cheek and Short.tsx dissolves into frame 0 (loop_s)
	{k: 'loop', t0: b(125), t1: DURATION, tr: 'fade', subY: SUB, scene: 'Loop', scrim: true},
];
