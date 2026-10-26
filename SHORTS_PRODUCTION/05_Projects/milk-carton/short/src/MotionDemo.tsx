import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, getStaticFiles, staticFile} from 'remotion';
import {DUR, Timeline, enter, exit, subYAt, type SceneProps} from './engine/transitions';
import type {BeatDef} from './data/beats';
import {FPS, W, WORDS, We} from './lib/time';
import {PAL} from './theme';
import {clamp01, easeInOut, easeOut, lerp, useT, GOLD} from './ui/gfx';
import {Bg} from './ui/draw';
import {Grain, PaperBg, SpeedLines} from './ui/vox';
import {Subtitles} from './ui/Subtitles';
import {Kinetic} from './ui/kinetic';
import {TrackedLabel, TrackedOutline, TrackedRing, TrackedSpotlight, TrackedVideo, trackClip, type TrackData} from './ui/Tracked';
import {AdvanceArrow, MapBase, MapCamera, MapLabel, MapRoute, MovingToken, PinPop, RegionFill, asMap, routePath, trackKeys, type CamKey} from './ui/maps';
import {CompareBeforeAfter, IconRow, LineDraw} from './ui/charts';
import {Morph, MorphMask} from './ui/morph';
import {MissingAsset} from './Gallery';
import keatonJson from '../data/tracks/keaton_wind.json';
import lisbonRio from '../data/maps/demo_lisbon_rio.json';
import reich1937 from '../data/maps/demo_reich1937.json';
import gibraltar from '../data/maps/demo_gibraltar.json';

// MotionDemo — the motion kit in one dense L2 sequence (composition «MotionDemo», Root.tsx). A TEST, never published: sample
// numbers, the template demo VO (data/words.json, 32 words) played twice — pass A from 0 s, pass B from MOTION_OFF — each pass a
// Sequence with its own Timeline on the word clock (W(i) / We(i) count from the start of the pass) and its own subtitles, whose
// hidden ranges are the phrases shown big (T6). A whip joins the passes. One visual event per phrase, one text zone at a time
// (T7: a kinetic phrase OR a calm caption next to the subtitle), big text ≥ 8 s apart (T11, L2), no map in 0–3 s (R4).
// Motion (L2 gates M1 ≥ 20 / M2 ≥ 10, measure.py): graphics alone do not get there — the hook is a rapid sequence of hard cuts
// on the word beats (standard 4.3 п. 12, ≤ 2 s, every shot ≥ 5 frames) with crash zooms, the weak seconds carry a whip, a hard
// cut with a slam-in window and a map flight.
//   pass A  0.0  hook: rapid sequence on the words «This · the · demo · of · our · Short» — Keaton in the wind (frame 0: a living
//                being in action, H1), the gunman firing at the camera, the bridge collapse, the falling facade, Keaton again —
//                every cut with a crash zoom; slam «THIS IS THE DEMO» (subtitle hidden; «THIS IS» stands landed on frame 0, no
//                impact frame there), lock-on brackets, a ring on the last shot
//           2.0  whipL → tracked footage, pull-out with the follow camera: spotlight + SAM 2 outline; hard cut on «visual» to
//                the same clip as a window on paper that slams in, then the tracked name tag (outside any scaled layer)
//           4.3  zoomthru → map route Lisboa → Rio: the camera flies with the ship (trackKeys), kick on arrival, Brazil fills
//           6.3  up → IconRow: 3 of 10 icons fill gold
//           7.6  punch → Morph coin → pin → star (burst, trail, spin)
//           8.5  fade → paper, island → pin morph; maskRise «A CALM ENDING THAT LOOPS BACK» (subtitle hidden)
//   pass B  10.7 whipL → period map 1937 (parchment): the Reich fills, a plane flies Berlin → Königsberg with camera kicks
//           12.7 diag → CompareBeforeAfter split, counter 50 → 1000 (≤ 1.1 s, R6; subtitle hidden), delta pill, over the map
//           15.0 circle → LineDraw with the follow tag (counter ≤ 1.1 s) on a scrim over moving footage (subtitle hidden)
//           16.7 whipR (done before the drop) → slam poster: a big gold «3» (keyScale) lands on «Three» and stays, TRANSITIONS
//                slams in under it (subtitle hidden) over a morphing star
//           18.3 punch → MorphMask: a star grows over the whole frame into a circle and opens onto the footage
//           19.2 fade → physical map, an AdvanceArrow of Atlantic water into the Mediterranean, calm push
// The clips are NOT in the template (licence / L6, see data/tracks/keaton_wind.json): with them in public/ (fetch_asset.py lib
// 03_Assets/Cinematic_Effects/pd_film_inserts/<file> — the Keaton track clip + the three FILMS below, all PD, Wikimedia Commons)
// the footage plays, without one a labelled empty frame stands in its place.
//   node tools/stills.mjs --comp MotionDemo --every 0.5 --from 0 --to 21.5 --out out/stills/motion_demo --cols 8
//   COMP=MotionDemo OUT=motion_demo.mp4 CONC=3 node tools/render.mjs     (needs out/sound/final_mix.wav — any mix; test only)
// Needs ≥ 32 words in data/words.json (the template demo); with fewer the composition shows a note (it never breaks the bundle).

const KEATON = keatonJson as TrackData;
const LR = asMap(lisbonRio);
const RE = asMap(reich1937);
const GI = asMap(gibraltar);
const LAST = 31;
const READY = WORDS.length > LAST;
const fa = (s: number) => Math.round(s * FPS) / FPS;   // frame-aligned seconds
/** start of pass B (s): half a second after the last demo word */
export const MOTION_OFF = READY ? fa(We(LAST) + 0.5) : 0;
/** length of one pass on its own clock: last word + 0.9 s tail */
const PASS_S = READY ? fa(We(LAST) + 0.9) : 3;
export const MOTION_DEMO_S = READY ? fa(MOTION_OFF + PASS_S) : 3;

/** subtitle ranges hidden per pass — the phrases shown big (kinetic, counters): T6 / R6 */
const HIDE_A: [number, number][] = [[0, 3], [26, 31]];
const HIDE_B: [number, number][] = [[8, 14], [15, 20], [21, 22]];

const SAIL = routePath(LR, ['Lisboa', {lon: -14.5, lat: 31.5}, {lon: -26.5, lat: 13}, {lon: -33.2, lat: -5.5}, {lon: -38.6, lat: -21.2}, 'Rio de Janeiro'], {mode: 'smooth'});
const FLIGHT = routePath(RE, ['Berlin', 'Königsberg'], {mode: 'great', bend: 0.2});
const INFLOW = routePath(GI, [{lon: -7.2, lat: 35.98}, {lon: -6.2, lat: 35.96}, {lon: -5.45, lat: 35.99}, {lon: -4.75, lat: 36.12}, {lon: -4.1, lat: 36.3}], {mode: 'smooth'});
const SAMPLE = 'sample data · MotionDemo test';
/** PD films of the hook's rapid sequence (besides the Keaton track clip): fetch_asset.py lib 03_Assets/Cinematic_Effects/pd_film_inserts/<file> */
export const MOTION_FILMS = {
	gunman: 'pdfilm_gunman_fires_at_camera_great_train_robbery_1903_commons.mp4',
	bridge: 'pdfilm_train_bridge_collapse_the_general_1926_commons.mp4',
	facade: 'pdfilm_keaton_facade_falls_steamboat_bill_jr_1928_commons.mp4',
} as const;
/** public/ path of a library clip (fetch_asset.py keeps the library file name) or null */
const pubClip = (name: string): string | null => {
	const f = getStaticFiles().find((x) => x.name.split('/').pop()?.toLowerCase() === name.toLowerCase());
	return f ? f.name : null;
};
/** archive window (frame) and the 9:16 footage band (blurred clip above / below, upscale ≤ 2×) */
const WINDOW = {x: 66, y: 330, w: 804, h: 820};
const BAND = {x: 0, y: 260, w: 1080, h: 1180};

const NoClip: React.FC<{t0: number; t1: number; name?: string}> = ({t0, t1, name = KEATON.clip ?? '?'}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<Bg kind="night" t={t} />
			<MissingAsset t0={t0} t1={t1} what="demo clip not in public/" how={`fetch_asset.py lib 03_Assets/Cinematic_Effects/pd_film_inserts/${name}`} />
		</AbsoluteFill>
	);
};

/**
 * a library clip in the 9:16 band (blurred copy around it, upscale ≤ 2×) for one shot of a hard-cut sequence: mounted only in
 * [t0, t1), crash zoom zoom[0] → zoom[1] over `zd` s around `focus` (u, v of the clip); without the file a labelled empty frame
 */
const ClipBand: React.FC<{name: string; t0: number; t1: number; from: number; zoom?: [number, number]; zd?: number; focus?: [number, number]}> = ({name, t0, t1, from, zoom = [1.3, 1.1], zd = 0.3, focus = [0.5, 0.5]}) => {
	const t = useT();
	const src = pubClip(name);
	if (t < t0 || t >= t1) return null;
	if (!src) return <NoClip t0={t0} t1={t1} name={name} />;
	const z = lerp(zoom[0], zoom[1], easeOut((t - t0) / zd));
	const fp = `${(focus[0] * 100).toFixed(1)}% ${(focus[1] * 100).toFixed(1)}%`;
	const vid = (style: React.CSSProperties) => (
		<Sequence from={Math.round(t0 * FPS)} layout="none">
			<OffthreadVideo src={staticFile(src)} trimBefore={Math.round(from * FPS)} muted style={style} />
		</Sequence>
	);
	return (
		<AbsoluteFill style={{background: '#05040a', overflow: 'hidden'}}>
			{vid({position: 'absolute', left: -160, top: -160, width: 1400, height: 2240, objectFit: 'cover', filter: 'blur(36px) brightness(0.4) saturate(0.8)'})}
			<div style={{position: 'absolute', left: BAND.x, top: BAND.y, width: BAND.w, height: BAND.h, overflow: 'hidden', background: '#000'}}>
				<div style={{position: 'absolute', inset: 0, transform: `scale(${z.toFixed(4)})`, transformOrigin: fp, filter: 'contrast(1.06) brightness(1.03)'}}>
					{vid({width: '100%', height: '100%', objectFit: 'cover', objectPosition: fp})}
				</div>
			</div>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------------------------ pass A

/**
 * camera punches on the picture under the text (standard 8, L2: punch-in ≤ 2 per 10 s): at each hit [t, amp, d] the layer
 * starts at scale amp and settles to 1 within d s (ease-out). The text sits outside the layer, so it never scales or blurs.
 */
const Punch: React.FC<{hits: [number, number, number][]; children: React.ReactNode}> = ({hits, children}) => {
	const t = useT();
	let k = 1;
	for (const [h, amp, d] of hits) if (t >= h && t < h + d) k *= 1 + (amp - 1) * (1 - easeOut((t - h) / d));
	return <AbsoluteFill style={{transform: `scale(${k})`, transformOrigin: '540px 860px'}}>{children}</AbsoluteFill>;
};

/** hard cuts of the hook (pass clock): on the word beats «the · demo · of · our · Short» (− 0.03 s, like the subtitles) */
const HOOK_CUTS: number[] = READY ? [0, ...[2, 3, 4, 5, 6].map((i) => fa(W(i) - 0.03))] : [0];

/** frame 0: a living being in action (H1) — a rapid sequence of hard cuts on the word beats (standard 4.3 п. 12: ≤ 2 s, every
 * shot ≥ 5 frames), each with a crash zoom; slam phrase on top («THIS IS» landed on frame 0), lock-on brackets on the first
 * shot; the last shot cuts out wide (tight → wide on the same action, not two similar shots), pushes in, punches on «template»
 * and carries a ring (he crawls: the top anchor is his back, not his head — target body) */
const AHook: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const clip = trackClip(KEATON);
	const C = [...HOOK_CUTS, t1];
	const at = (i: number) => t >= C[i] && t < C[i + 1];
	const keaton = (i: number, from: number, zoom: [number, number], ring: React.ReactNode) =>
		!clip ? (
			<NoClip t0={C[i]} t1={C[i + 1]} />
		) : (
			<TrackedVideo src={clip} track={KEATON} t0={C[i]} t1={C[i + 1]} hold={0} from={from} box={BAND} zoom={zoom} follow={{lag: 0.15, dead: 40}}>
				{ring}
			</TrackedVideo>
		);
	return (
		<AbsoluteFill>
			<Punch hits={[...HOOK_CUTS.map((c, i): [number, number, number] => [c, i === 0 ? 1.3 : 1.2, i === 0 ? 0.35 : 0.22]), [fa(W(7) - 0.03), 1.12, 0.25]]}>
				{at(0) ? keaton(0, 0.45, [1.3, 1.2], <TrackedRing t0={t0 + 0.04} t1={C[1] + 0.3} kind="brackets" color={GOLD} />) : null}
				<ClipBand name={MOTION_FILMS.gunman} t0={C[1]} t1={C[2]} from={3.05} zoom={[1.45, 1.2]} focus={[0.5, 0.42]} />
				<ClipBand name={MOTION_FILMS.bridge} t0={C[2]} t1={C[3]} from={5.0} zoom={[1.4, 1.15]} focus={[0.42, 0.5]} />
				<ClipBand name={MOTION_FILMS.facade} t0={C[3]} t1={C[4]} from={4.36} zoom={[1.35, 1.12]} focus={[0.5, 0.62]} />
				{at(4) ? keaton(4, 2.3, [1.5, 1.3], null) : null}
				{at(5) ? keaton(5, 4.2, [1.0, 1.3], <TrackedRing t0={C[5] + 0.05} t1={t1} />) : null}
			</Punch>
			<Kinetic fromWord={0} toWord={3} preset="slam" zone="upper" />
		</AbsoluteFill>
	);
};

/** tracked footage, then the same archive as a framed window on paper (Vox collage): pull-out with the follow camera, spotlight +
 * SAM 2 outline; hard cut on «visual» to the window, which slams in (drop + scale 1.5 → 1 in 0.24 s) while the paper settles —
 * the name tag (adds a date) starts
 * after the slam, so no outer transform moves it out of its safe zone (TrackedLabel plans in its TrackedVideo's px) */
const AWindow: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const clip = trackClip(KEATON);
	const cut = fa(W(13) - 0.03);
	const from0 = 3.0;
	if (!clip) return <NoClip t0={t0} t1={t1} />;
	if (t < cut) {
		return (
			<TrackedVideo src={clip} track={KEATON} t0={t0} t1={cut} hold={0} from={from0} box={BAND} zoom={[1.6, 1.15]} follow={{lag: 0.2, dead: 40}}>
				<TrackedSpotlight t0={t0} t1={cut} dim={0.4} />
				<TrackedOutline t0={t0 + 0.12} t1={cut} />
			</TrackedVideo>
		);
	}
	const ks = easeOut((t - cut) / 0.24);
	const slam = lerp(1.5, 1, ks);
	const k = easeInOut((t - cut) / Math.max(0.5, t1 - cut));
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${lerp(1.25, 1.05, easeOut((t - cut) / 0.5)) * lerp(1, 1.08, k)})`}}>
				<PaperBg />
			</AbsoluteFill>
			<AbsoluteFill style={ks < 0.9995 ? {transform: `translateY(${((1 - ks) * -160).toFixed(1)}px) scale(${slam.toFixed(4)})`, transformOrigin: '468px 740px'} : undefined}>
				<TrackedVideo src={clip} track={KEATON} t0={cut} t1={t1} from={from0 + (cut - t0)} box={WINDOW} focus={[0.62, 0.5]} zoom={[1.4, 1.0]} backdrop="none">
					<TrackedLabel text="Steamboat Bill, Jr." sub="1928" t0={cut + 0.26} t1={t1} size={50} />
				</TrackedVideo>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/** map route: the camera punches out of Lisboa, flies with the ship (pull-out mid-way), kicks on the arrival */
const ARoute: React.FC<SceneProps> = ({t0, t1}) => {
	const s0 = t0 + 0.3;
	const dur = 1.35;
	const arrive = s0 + dur;
	const keys: CamKey[] = [
		{t: t0, at: 'Lisboa', zoom: 4.2},
		...trackKeys(SAIL, s0, dur, (u) => 2.6 - 1.6 * Math.sin(Math.PI * u), 8),
		{t: arrive + 0.05, at: 'Rio de Janeiro', zoom: 2.8, kick: 0.12},
		{t: t1 + 0.4, at: 'Rio de Janeiro', zoom: 3.8},
	];
	return (
		<MapCamera map={LR} keys={keys} t0={t0}>
			<MapBase look="chart" />
			<RegionFill id="BRA" t0={arrive - 0.3} dur={0.6} reveal="grow" from="Rio de Janeiro" color={PAL.teal} hatch opacity={0.5} />
			<MapRoute d={SAIL} t0={s0} dur={dur} dashed ghost={0.5} />
			<MovingToken d={SAIL} t0={s0} dur={dur} kind="ship" size={120} />
			<PinPop at="Lisboa" t0={t0 + 0.05} t1={s0 + 0.55} text="Lisboa" />
			<PinPop at="Rio de Janeiro" t0={arrive - 0.1} text="Rio de Janeiro" gold />
		</MapCamera>
	);
};

/** «three»: 3 of 10 icons fill gold (no number on screen → the subtitle stays); a 1.3 s beat — the panel camera is back on
 * the full view 0.3 s before t1 (ChartPanel), so all ten icons are seen before the punch out */
const AIcons: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<Bg kind="chart" t={t} cy={760} />
			<IconRow t0={t0 + 0.02} tFill={t0 + 0.25} fillDur={0.5} t1={t1} n={10} k={3} icon="bolt" order="spread" enter="slam" box={{y: 420, h: 600}} />
		</AbsoluteFill>
	);
};

/** «one twist»: a fast morph chain on the word beats */
const AMorph: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<Bg kind="gold" t={t} cy={820} />
			<Morph shapes={['coin', 'pin', 'star']} keys={[t0 + 0.06, W(24) + 0.05, W(25) + 0.02]} morph={0.26} x={540} y={[860, 800, 840]} size={[560, 620, 700]} trail={3} burst idle={1} spin={180} squash={0.6} show={[t0, t1 + 0.4]} />
		</AbsoluteFill>
	);
};

/** calm, moving end of pass A: paper, a slow island → pin morph, the maskRise phrase */
const ACalm: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const k = easeInOut((t - t0) / Math.max(1, t1 - t0));
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${lerp(1, 1.08, k)})`}}>
				<PaperBg />
				<Morph shapes={['island', 'pin']} keys={[t0 + 0.2, W(30)]} morph={0.8} x={540} y={1000} size={[640, 560]} idle={1} shadow={14} show={[t0, t1 + 0.4]} />
			</AbsoluteFill>
			<Kinetic fromWord={26} toWord={31} preset="maskRise" zone="upper" />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------------------------ pass B

/** period borders (OpenHistoricalMap 1937, CC0) on parchment: the Reich fills, a plane flies with camera kicks */
const BPeriod: React.FC<SceneProps> = ({t0}) => (
	<MapCamera map={RE} keys={[{t: t0, zoom: 1.05}, {t: t0 + 0.6, at: 'Berlin', zoom: 1.7, kick: 0.06}, {t: t0 + 1.75, at: 'Königsberg', zoom: 2.3, kick: 0.08}]} t0={t0}>
		<MapBase look="parchment" />
		<RegionFill id="Deutsches_Reich" t0={t0 + 0.1} dur={0.7} reveal="grow" from="Berlin" color={PAL.stamp} hatch opacity={0.5} />
		<MapRoute d={FLIGHT} t0={t0 + 0.55} dur={1.2} color="#fff" width={5} dashed={[10, 12]} />
		<MovingToken d={FLIGHT} t0={t0 + 0.55} dur={1.2} kind="plane" color={PAL.stamp} size={118} />
		<PinPop at="Berlin" t0={t0 + 0.4} t1={t0 + 1.3} text="Berlin" color={PAL.stamp} />
		<PinPop at="Königsberg" t0={t0 + 1.65} text="Königsberg" color={PAL.stamp} />
	</MapCamera>
);

/** before / after with a counter that lands on the exact value (R6) — its phrase has no subtitle; the panel sits on the period
 * map that keeps flying underneath (standard 4.6: a chart on a picture that changes, not a flat slide) */
const BCompare: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<MapCamera map={RE} keys={[{t: t0, at: 'Königsberg', zoom: 2.4}, {t: t1 + 0.4, at: 'Berlin', zoom: 1.5}]} t0={t0} flight={false}>
				<MapBase look="parchment" />
				<RegionFill id="Deutsches_Reich" t0={t0 - 1} dur={0.1} color={PAL.stamp} hatch opacity={0.5} />
			</MapCamera>
			<CompareBeforeAfter t0={t0 + 0.05} tSwitch={t0 + 0.8} t1={t1} before={{value: 50, label: 'Before', icon: 'tree'}} after={{value: 1000, label: 'After', icon: 'factory'}} count delta="×20" source={SAMPLE} allowLow />
		</AbsoluteFill>
	);
};

/** line chart with the follow tag (counter ≤ 1.1 s) on a lighter scrim over moving footage (standard 4.6: not a flat slide) */
const BLine: React.FC<SceneProps> = ({t0, t1}) => {
	const clip = trackClip(KEATON);
	return (
		<AbsoluteFill>
			{clip ? <TrackedVideo src={clip} track={KEATON} t0={t0} t1={t1} from={4.8} box={BAND} zoom={[1.15, 1.25]} follow /> : <NoClip t0={t0} t1={t1} />}
			<LineDraw t0={t0 + 0.05} t1={t1} enter="wipe" tag="follow" dur={1.0} smooth={false} scrim={0.7} box={{y: 420, h: 640}} values={[3, 5, 4, 8, 12]} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']} display="12%" source={SAMPLE} />
		</AbsoluteFill>
	);
};

/** slam poster «3» / «TRANSITIONS» over speed lines and a morphing star: the gold «3» (keyScale 2.2 ≈ 300 px) lands on «Three»
 * after the whip has settled and stays while TRANSITIONS slams in under it; the phrase exits with the beat */
const BSlam: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<Bg kind="night" t={t} cy={480} />
			<SpeedLines t0={t0} t1={t1} cy={480} strength={0.5} />
			<Morph shapes={['star', 'arrow', 'coin']} keys={[t0 + 0.1, W(22) + 0.15, W(22) + 0.6]} morph={0.3} x={540} y={1010} size={360} burst idle={1} spin={120} show={[t0, t1 + 0.4]} />
			<Kinetic fromWord={21} toWord={22} preset="slam" display={{21: '3'}} keyWords={[21]} keyScale={2.2} zone="upper" t1={t1} />
		</AbsoluteFill>
	);
};

/** «one twist»: a star grows over the whole frame into a circle and opens onto the footage */
const BReveal: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const clip = trackClip(KEATON);
	return (
		<AbsoluteFill>
			<Bg kind="gold" t={t} cy={820} />
			<Morph shapes={['heart']} x={540} y={840} size={560} idle={1} show={[t0, t1 + 0.4]} />
			<MorphMask shapes={['star', 'circle']} keys={[t0 + 0.12, t0 + 0.55]} size={[60, 2600]} y={[900, 960]} spin={120} strokeWidth={14} show={[t0, t1 + 0.6]}>
				{clip ? <TrackedVideo src={clip} track={KEATON} t0={t0} t1={t1} from={0.4} box={BAND} zoom={[1.2, 1.12]} follow /> : <NoClip t0={t0} t1={t1} />}
			</MorphMask>
		</AbsoluteFill>
	);
};

/** calm finale: physical map (no political borders), Atlantic water flows in, slow pull-back, one calm caption */
const BEnd: React.FC<SceneProps> = ({t0, t1}) => (
	<MapCamera map={GI} keys={[{t: t0, zoom: 1.3, at: 'Gibraltar'}, {t: t1, zoom: 1.06, at: [560, 880]}]} t0={t0}>
		<MapBase look="chart" borders={false} />
		<AdvanceArrow d={INFLOW} t0={t0 + 0.25} dur={1.4} color={PAL.teal} width={[30, 70]} head={110} />
		<PinPop at="Gibraltar" t0={t0 + 0.1} color={PAL.orange} size={56} />
		<MapLabel at={{lon: -4.6, lat: 35.75}} text="Mediterranean" t0={t0 + 1.5} />
	</MapCamera>
);

const SCENES_A: Record<string, React.FC<SceneProps>> = {AHook, AWindow, ARoute, AIcons, AMorph, ACalm};
/** pass B: the slam beat starts so early that its whipR (0.28 s) is over before the «3» starts to drop (W(21) − 0.13 s) */
const B_SLAM_T0 = READY ? fa(W(21) - 0.13 - DUR.whipR - 0.02) : 0;
const SCENES_B: Record<string, React.FC<SceneProps>> = {BPeriod, BCompare, BLine, BSlam, BReveal, BEnd};
// beat edges sit in the pauses just before a phrase (like src/data/beats.ts); pass A's last beat runs on under the whip into B
const BEATS_A: BeatDef[] = READY
	? [
			{k: 'a_hook', t0: 0, t1: W(8) - 0.05, tr: 'none', subY: 1300, scene: 'AHook'},
			{k: 'a_window', t0: W(8) - 0.05, t1: W(15) - 0.06, tr: 'whipL', subY: 1300, scene: 'AWindow'},
			{k: 'a_route', t0: W(15) - 0.06, t1: W(21) - 0.06, tr: 'zoomthru', at: [540, 860], subY: 1300, scene: 'ARoute'},
			{k: 'a_icons', t0: W(21) - 0.06, t1: W(23) - 0.06, tr: 'up', subY: 1300, scene: 'AIcons'},
			{k: 'a_morph', t0: W(23) - 0.06, t1: W(26) - 0.06, tr: 'punch', subY: 1300, scene: 'AMorph'},
			{k: 'a_calm', t0: W(26) - 0.06, t1: MOTION_OFF + DUR.whipL + 0.05, tr: 'fade', subY: 1300, scene: 'ACalm'},
		]
	: [];
const BEATS_B: BeatDef[] = READY
	? [
			{k: 'b_period', t0: 0, t1: W(8) - 0.05, tr: 'none', subY: 1300, scene: 'BPeriod'},
			{k: 'b_compare', t0: W(8) - 0.05, t1: W(15) - 0.06, tr: 'diag', subY: 1300, scene: 'BCompare'},
			{k: 'b_line', t0: W(15) - 0.06, t1: B_SLAM_T0, tr: 'circle', at: [540, 760], subY: 1300, scene: 'BLine'},
			{k: 'b_slam', t0: B_SLAM_T0, t1: W(23) - 0.06, tr: 'whipR', subY: 1300, scene: 'BSlam'},
			{k: 'b_reveal', t0: W(23) - 0.06, t1: W(26) - 0.06, tr: 'punch', subY: 1300, scene: 'BReveal'},
			{k: 'b_end', t0: W(26) - 0.06, t1: PASS_S, tr: 'fade', subY: 1300, scene: 'BEnd'},
		]
	: [];

/** one pass of the demo words: beats + subtitles on the pass clock (the Sequence makes useT() count from the pass start) */
const Pass: React.FC<{beats: BeatDef[]; scenes: Record<string, React.FC<SceneProps>>; hide: [number, number][]}> = ({beats, scenes, hide}) => (
	<AbsoluteFill>
		<Timeline beats={beats} scenes={scenes} />
		<Subtitles y={(x) => subYAt(beats, x)} hidden={(x) => x > We(LAST) + 0.15 || hide.some(([a, b]) => x >= W(a) - 0.06 && x < We(b) + 0.15)} skip={(i) => hide.some(([a, b]) => i >= a && i <= b)} />
	</AbsoluteFill>
);

export const MotionDemo: React.FC = () => {
	const t = useT();
	if (!READY) {
		return (
			<AbsoluteFill style={{background: PAL.navy, alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 40, textAlign: 'center', padding: 80}}>
				MotionDemo runs on the template demo words (data/words.json ≥ 32 words) — this project has {WORDS.length}.
			</AbsoluteFill>
		);
	}
	const wd = DUR.whipL;
	const p = clamp01((t - MOTION_OFF) / wd);
	return (
		<AbsoluteFill style={{background: '#08060c'}}>
			{t < MOTION_OFF + wd ? (
				<AbsoluteFill style={{...(p > 0 ? exit('whipL', p) : {}), overflow: 'hidden'}}>
					<Sequence durationInFrames={Math.round((MOTION_OFF + wd + 0.05) * FPS)} layout="none">
						<Pass beats={BEATS_A} scenes={SCENES_A} hide={HIDE_A} />
					</Sequence>
				</AbsoluteFill>
			) : null}
			{t >= MOTION_OFF ? (
				<AbsoluteFill style={{...(p < 1 ? enter('whipL', p) : {}), overflow: 'hidden'}}>
					<Sequence from={Math.round(MOTION_OFF * FPS)} layout="none">
						<Pass beats={BEATS_B} scenes={SCENES_B} hide={HIDE_B} />
					</Sequence>
				</AbsoluteFill>
			) : null}
			<Grain opacity={0.07} />
		</AbsoluteFill>
	);
};
