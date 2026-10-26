import React from 'react';
import {AbsoluteFill, getStaticFiles, staticFile} from 'remotion';
import {Timeline, type SceneProps} from './engine/transitions';
import type {BeatDef} from './data/beats';
import {W, WORDS} from './lib/time';
import {PAL} from './theme';
import {MONT} from './fonts';
import {Chip, Label, useT, GOLD, TEAL, MAGENTA} from './ui/gfx';
import {Bg} from './ui/draw';
import {Grain} from './ui/vox';
import {AtlasWindowView, atlasBlock, type AtlasWindowCfg} from './ui/Atlas';
import {Clip3D} from './ui/Clip3D';
import {LottieSticker} from './ui/LottieSticker';
import {Kinetic} from './ui/kinetic';
import {TrackedArrow, TrackedLabel, TrackedRing, TrackedVideo, trackClip, type TrackData} from './ui/Tracked';
import {MapBase, MapCamera, MapRoute, MovingToken, PinPop, RegionFill, asMap, routePath, trackKeys, type CamKey} from './ui/maps';
import {BarGrow} from './ui/charts';
import {MorphGalleryScene} from './ui/morph_demo';
import keatonJson from '../data/tracks/keaton_wind.json';
import lisbonRio from '../data/maps/demo_lisbon_rio.json';

// Component gallery of the template (composition «Gallery», Root.tsx) — a TEST, never published. It shows every newer
// component once on its own clock (seconds from 0), so a change to a component is checked without touching the demo Short:
//   0.0–2.6 s   AtlasWindowView: a cutout window (tl) then a pip window (tr) with the first pose card of project.atlas found in
//               public/atlas/ — the owner's art only; without a card a labelled empty frame of the same size (nothing drawn)
//   2.6 s       'jagged' burst from a point → Clip3D: the template's 3D test insert public/3d/coin (tools/blender/examples/coin.json)
//   5.2 s       'jagged' tear from the bottom edge → LottieSticker: Noto «eyes» (CC BY 4.0, CREDITS.md)
//   motion kit (one scene per group; the full runs: KineticGallery, ChartsGallery, MapsDemo, MorphShowcase, MotionDemo)
//   7.8 s       'up' → Kinetic «stack»: demo words 15–20 replayed on the scene clock (`shift`; in a Short the phrase follows the VO)
//   10.6 s      'whipL' → TrackedVideo + TrackedRing (brackets) → TrackedArrow → TrackedLabel on the Keaton test track
//               (data/tracks/keaton_wind.json); its clip is NOT in the template (L6, licence): without it a labelled empty frame
//   13.4 s      'zoomthru' → map route: MapCamera follows a MovingToken ship Lisboa → Rio (trackKeys), PinPop, RegionFill
//   16.2 s      'up' → BarGrow with a counter (R6: roll ≤ 1.1 s, lands on the exact value) — sample numbers
//   19.0 s      'circle' → Morph coin → pin → island (+ a line-art chain)
//   21.6 s      'fade' → list of the components
// The scenes run through the real transition engine (Timeline), so the gallery also tests jagged + JaggedRim end to end.
//   node tools/stills.mjs --comp Gallery --t 0.6,1.9,2.75,3.6,5.35,6.5,8.45,9.6,11.2,12.6,13.9,14.9,16.9,17.9,19.4,20.6,22.4 --out out/stills/gallery --cols 6
// Gallery-only assets (3d/coin, the Noto eyes) stay credited in CREDITS.md; check.mjs counts this file (like every *Gallery.tsx /
// *Demo.tsx test) neither for the on-screen numbers (FACTS.md) nor for the description line of the Short.

export const GALLERY_S = 23.4;

const LOTTIE = 'lottie/lottie_eyes_u1f440_noto_animated.json';
const KEATON = keatonJson as TrackData;
const LR = asMap(lisbonRio);
const ROUTE = routePath(LR, ['Lisboa', {lon: -14.5, lat: 31.5}, {lon: -26.5, lat: 13}, {lon: -33.2, lat: -5.5}, {lon: -38.6, lat: -21.2}, 'Rio de Janeiro'], {mode: 'smooth'});

/** the first Atlas pose card of this project that exists under public/ (cards → public/atlas/<id>.png), else null */
const firstCard = (): {id: string; png: string} | null => {
	const block = atlasBlock();
	if (!block) return null;
	const have = new Set(getStaticFiles().map((f) => f.name));
	for (const p of block.poses) {
		const png = p.png ?? `atlas/${p.id}.png`;
		if (have.has(png)) return {id: p.id, png};
	}
	return null;
};

/** labelled empty frame for a test asset the project does not have (nothing is drawn in its place); the text wraps inside the frame */
export const MissingAsset: React.FC<{t0: number; t1: number; what: string; how: string; box?: {x: number; y: number; w: number; h: number}}> = ({t0, t1, what, how, box = {x: 66, y: 330, w: 804, h: 820}}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.5) return null;
	return (
		<div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, border: '6px dashed rgba(255,255,255,0.55)', borderRadius: 26, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 40, textAlign: 'center', color: '#fff', fontFamily: MONT, overflowWrap: 'anywhere'}}>
			<div style={{fontWeight: 900, fontSize: 46, lineHeight: 1.1}}>{what}</div>
			<div style={{fontWeight: 700, fontSize: 28, lineHeight: 1.25, opacity: 0.85}}>{how}</div>
		</div>
	);
};

const GAtlas: React.FC<SceneProps> = ({t1}) => {
	const t = useT();
	const card = firstCard();
	const src = card ? staticFile(card.png) : null;
	const label = 'Atlas card\n(owner art,\ntools/atlas)';
	const cut: AtlasWindowCfg = {from_word: 0, pose: card?.id ?? 'none', corner: 'tl', h: 460};
	const pip: AtlasWindowCfg = {from_word: 0, pose: card?.id ?? 'none', corner: 'tr', h: 380, style: 'pip', zoom: 1.45};
	return (
		<AbsoluteFill>
			<Bg kind="navy" t={t} />
			<Chip text="AtlasWindows" t0={0.05} t1={t1} x={60} y={170} color={GOLD} fg="#fff" />
			{t < 1.4 ? <AtlasWindowView t={t} t0={0.3} t1={1.4} w={cut} src={src} label={label} /> : <AtlasWindowView t={t} t0={1.45} t1={2.5} w={pip} src={src} label={label} />}
			<Label text={t < 1.4 ? 'cutout · corner tl' : 'pip · corner tr'} sub={card ? `pose «${card.id}»` : 'no card in public/atlas → empty frame'} t0={0.3} t1={t1} x={540} y={1260} size={50} />
		</AbsoluteFill>
	);
};

const G3D: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<Bg kind="navy" t={t} cy={860} />
			<Clip3D name="coin" t0={t0 + 0.1} y={860} w={720} />
			<Chip text="jagged → Clip3D" t0={t0 + 0.2} t1={t1} x={60} y={170} color={TEAL} fg="#fff" />
			<Label text="3d/coin · loop" sub="tools/blender/shot.py → public/3d" t0={t0 + 0.3} t1={t1} x={540} y={1300} size={50} />
		</AbsoluteFill>
	);
};

const GLottie: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<Bg kind="sea" t={t} cy={860} />
			<LottieSticker src={LOTTIE} t0={t0 + 0.15} x={540} y={860} size={560} outline={8} />
			<Chip text="jagged → LottieSticker" t0={t0 + 0.2} t1={t1} x={60} y={170} color={MAGENTA} fg="#fff" />
			<Label text="Noto eyes · CC BY" sub="public/lottie · CREDITS + description line" t0={t0 + 0.3} t1={t1} x={540} y={1300} size={50} />
		</AbsoluteFill>
	);
};

/** kinetic typography: one preset (all six: composition KineticGallery) */
const GKinetic: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const ok = WORDS.length > 20;   // the phrase = words 15–20 of data/words.json (the template demo VO)
	return (
		<AbsoluteFill>
			<Bg kind="navy" t={t} cy={700} />
			{ok ? <Kinetic fromWord={15} toWord={20} preset="stack" zone="center" shift={t0 + 0.3 - W(15)} /> : null}
			<Chip text="Kinetic · stack" t0={t0 + 0.05} t1={t1} x={60} y={170} color={GOLD} fg="#fff" />
			<Label text="word range → hide_subs" sub="kinetic_check.mjs --fix · 6 presets: KineticGallery" t0={t0 + 0.3} t1={t1} x={540} y={1300} size={44} />
		</AbsoluteFill>
	);
};

/** tracking: lock-on brackets → arrow → name tag on a moving subject (tools/track.py → data/tracks/keaton_wind.json) */
const GTrack: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const clip = trackClip(KEATON);
	return (
		<AbsoluteFill>
			<Bg kind="night" t={t} />
			{clip ? (
				<TrackedVideo src={clip} track={KEATON} t0={t0} t1={t1} from={1.0} box={{x: 0, y: 290, w: 1080, h: 1150}} zoom={[1.12, 1.18]} follow>
					<TrackedRing t0={t0 + 0.1} t1={t0 + 0.8} kind="brackets" color={GOLD} />
					<TrackedArrow t0={t0 + 0.85} t1={t0 + 1.55} target="top" />
					<TrackedLabel text="Buster Keaton" sub="Steamboat Bill, Jr." t0={t0 + 1.6} t1={t1} />
				</TrackedVideo>
			) : (
				<MissingAsset t0={t0 + 0.1} t1={t1} what="test clip not in public/" how={`fetch_asset.py lib 03_Assets/Cinematic_Effects/pd_film_inserts/${KEATON.clip}`} />
			)}
			<Chip text="Tracked · ring → arrow → label" t0={t0 + 0.05} t1={t1} x={60} y={170} color={TEAL} fg="#fff" />
		</AbsoluteFill>
	);
};

/** animated map: camera follows a ship along a sea route */
const GMap: React.FC<SceneProps> = ({t0, t1}) => {
	const s0 = t0 + 0.45;
	const dur = 1.5;
	const arrive = s0 + dur;
	const keys: CamKey[] = [
		{t: t0, at: 'Lisboa', zoom: 3.8},
		...trackKeys(ROUTE, s0, dur, (u) => 2.5 - 1.5 * Math.sin(Math.PI * u), 8),
		{t: arrive + 0.05, at: 'Rio de Janeiro', zoom: 2.6, kick: 0.1},
		{t: t1 + 0.4, at: 'Rio de Janeiro', zoom: 3.6},
	];
	return (
		<AbsoluteFill>
			<MapCamera map={LR} keys={keys} t0={t0}>
				<MapBase look="chart" />
				<RegionFill id="BRA" t0={arrive - 0.3} dur={0.6} reveal="grow" from="Rio de Janeiro" color={PAL.teal} opacity={0.5} />
				<MapRoute d={ROUTE} t0={s0} dur={dur} dashed ghost={0.5} />
				<MovingToken d={ROUTE} t0={s0} dur={dur} kind="ship" size={110} />
				<PinPop at="Lisboa" t0={t0 + 0.1} t1={s0 + 0.6} text="Lisboa" />
				<PinPop at="Rio de Janeiro" t0={arrive - 0.1} text="Rio de Janeiro" gold />
			</MapCamera>
			<Chip text="Map · route + token" t0={t0 + 0.05} t1={t1} x={60} y={170} color={GOLD} fg="#fff" />
		</AbsoluteFill>
	);
};

/** chart with a counter (R6) — sample numbers, test only */
const GChart: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<Bg kind="chart" t={t} cy={700} />
			<BarGrow t0={t0 + 0.05} t1={t1} count title="Sample bars" source="sample data · gallery test" tFocus={t0 + 1.9}
				data={[{label: 'A', value: 420}, {label: 'B', value: 610}, {label: 'C', value: 1250, gold: true}, {label: 'D', value: 380}]} />
			<Chip text="Charts · BarGrow count" t0={t0 + 0.05} t1={t1} x={60} y={170} color={TEAL} fg="#fff" />
		</AbsoluteFill>
	);
};

const GEnd: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const rows = ['AtlasWindows', 'Clip3D', 'LottieSticker', 'jagged · JaggedRim', 'Kinetic', 'Tracked', 'Maps', 'Charts', 'Morph'];
	return (
		<AbsoluteFill>
			<Bg kind="navy" t={t} />
			{rows.map((r, i) => (
				<Label key={r} text={r} t0={t0 + 0.1 + i * 0.06} t1={t1} x={540} y={420 + i * 82} size={50} />
			))}
			<Label text="Gallery — test, not published" t0={t0 + 0.7} t1={t1} x={540} y={1260} size={40} color="#ffd7f0" />
		</AbsoluteFill>
	);
};

const SCENES: Record<string, React.FC<SceneProps>> = {GAtlas, G3D, GLottie, GKinetic, GTrack, GMap, GChart, GMorph: MorphGalleryScene, GEnd};
const BEATS: BeatDef[] = [
	{k: 'g_atlas', t0: 0, t1: 2.6, tr: 'none', subY: 1300, scene: 'GAtlas'},
	{k: 'g_3d', t0: 2.6, t1: 5.2, tr: 'jagged', at: [540, 860], subY: 1300, scene: 'G3D'},
	{k: 'g_lottie', t0: 5.2, t1: 7.8, tr: 'jagged', at: [540, 1920], subY: 1300, scene: 'GLottie'},
	{k: 'g_kinetic', t0: 7.8, t1: 10.6, tr: 'up', subY: 1300, scene: 'GKinetic'},
	{k: 'g_track', t0: 10.6, t1: 13.4, tr: 'whipL', subY: 1300, scene: 'GTrack'},
	{k: 'g_map', t0: 13.4, t1: 16.2, tr: 'zoomthru', at: [540, 860], subY: 1300, scene: 'GMap'},
	{k: 'g_chart', t0: 16.2, t1: 19.0, tr: 'up', subY: 1300, scene: 'GChart'},
	{k: 'g_morph', t0: 19.0, t1: 21.6, tr: 'circle', at: [540, 800], subY: 1300, scene: 'GMorph'},
	{k: 'g_end', t0: 21.6, t1: GALLERY_S, tr: 'fade', subY: 1300, scene: 'GEnd'},
];

export const Gallery: React.FC = () => (
	<AbsoluteFill style={{background: '#08060c'}}>
		<Timeline beats={BEATS} scenes={SCENES} />
		<Grain opacity={0.07} />
	</AbsoluteFill>
);
