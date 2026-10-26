import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Timeline, type SceneProps} from './engine/transitions';
import type {BeatDef} from './data/beats';
import {Grain} from './ui/vox';
import {AdvanceArrow, MapBase, MapCamera, MapLabel, MapRoute, MovingToken, PinPop, RegionFill, asMap, routePath, trackKeys, type CamKey} from './ui/maps';
import {PAL} from './theme';
import lisbonRio from '../data/maps/demo_lisbon_rio.json';
import reich1937 from '../data/maps/demo_reich1937.json';
import gibraltar from '../data/maps/demo_gibraltar.json';

// Map kit demo (src/ui/maps.tsx + tools/make_map.py) — a TEST composition like Gallery, never published. Three scenes on the
// real Timeline, one per map style:
//   0.0–6.4 s   «route»  modern borders (Natural Earth): Lisbon → Rio de Janeiro by ship — MapCamera follows the token
//               (trackKeys, pulls out mid-way), dashed MapRoute + MovingToken ship, PinPop at both ends, RegionFill Brazil
//   6.4–10.4 s  «period» PERIOD borders (OpenHistoricalMap, CC0: Deutsches Reich 1937, make_map.py --geojson) on the parchment
//               look: hatched RegionFill clipped to the land, MapLabel, PinPop, plane on an arched great-circle route
//   10.4–13.0 s «arrow»  physical map (--borders none): AdvanceArrow = Atlantic surface water flowing into the Mediterranean
// Maps rebuilt with: python3 tools/make_map.py --spec data/maps/demo_<name>.spec.json
// Stills (the template's stills.mjs renders compositions of src/index.ts, so register this one in Root.tsx first):
//   node tools/stills.mjs --comp MapsDemo --t 0.6,2.8,5.4,8.6,9.9,11.4,12.6 --out out/stills/maps --cols 4
// Labels carry no numbers (check.mjs п. 6 reads text props of every src file except Gallery.tsx).

export const MAPS_DEMO_S = 13.0;

const LR = asMap(lisbonRio);
const RE = asMap(reich1937);
const GI = asMap(gibraltar);

// sea route: waypoints off the coasts (Canaries, west of Cape Verde, off Cabo São Roque and Bahia)
const SHIP = routePath(LR, ['Lisboa', {lon: -14.5, lat: 31.5}, {lon: -26.5, lat: 13}, {lon: -33.2, lat: -5.5}, {lon: -36.6, lat: -14}, {lon: -38.6, lat: -21.2}, 'Rio de Janeiro'], {mode: 'smooth'});
const SAIL = {t0: 1.0, dur: 3.6};

export const MapRouteDemo: React.FC<SceneProps> = ({t0, t1}) => {
	const s0 = t0 + SAIL.t0;
	const arrive = s0 + SAIL.dur;
	// motion first (standard: seconds 1–6 are the weakest metric): punch out of a close-up, follow the ship with a wide pull-out,
	// slam into the arrival (kick) while Brazil fills
	const keys: CamKey[] = [
		{t: t0, at: 'Lisboa', zoom: 4.2},
		...trackKeys(SHIP, s0, SAIL.dur, (u) => 2.6 - 1.7 * Math.sin(Math.PI * u), 12),
		{t: arrive + 0.05, at: 'Rio de Janeiro', zoom: 2.6, kick: 0.1},
		{t: arrive + 1.0, at: 'Rio de Janeiro', zoom: 4.4},
		{t: t1, at: 'Rio de Janeiro', zoom: 4.6},
	];
	return (
		<MapCamera map={LR} keys={keys} t0={t0}>
			<MapBase look="chart" />
			<RegionFill id="BRA" t0={arrive - 0.4} dur={0.8} reveal="grow" from="Rio de Janeiro" color={PAL.teal} opacity={0.5} />
			<MapRoute d={SHIP} t0={s0} dur={SAIL.dur} dashed ghost={0.5} />
			<MovingToken d={SHIP} t0={s0} dur={SAIL.dur} kind="ship" size={120} />
			<PinPop at="Lisboa" t0={t0 + 0.15} t1={s0 + 0.8} text="Lisboa" />
			<MapLabel at={{lon: -42, lat: 24}} text="Atlantic" t0={s0 + 1.0} t1={s0 + 2.5} />
			<PinPop at="Rio de Janeiro" t0={arrive - 0.15} text="Rio de Janeiro" gold />
		</MapCamera>
	);
};

const FLIGHT = routePath(RE, ['Berlin', 'Königsberg'], {mode: 'great', bend: 0.2});

export const MapPeriodDemo: React.FC<SceneProps> = ({t0}) => (
	<MapCamera map={RE} keys={[{t: t0, zoom: 1.0}, {t: t0 + 1.4, at: 'Berlin', zoom: 1.7, kick: 0.05}, {t: t0 + 3.5, at: 'Königsberg', zoom: 2.3, kick: 0.07}]} t0={t0}>
		<MapBase look="parchment" />
		<RegionFill id="Deutsches_Reich" t0={t0 + 0.25} dur={0.9} reveal="grow" from="Berlin" color={PAL.stamp} hatch opacity={0.5} />
		<MapLabel at={[560, 900]} text="Deutsches Reich" t0={t0 + 0.5} t1={t0 + 1.4} size={44} head />
		<MapRoute d={FLIGHT} t0={t0 + 1.7} dur={1.9} color="#fff" width={5} dashed={[10, 12]} />
		<MovingToken d={FLIGHT} t0={t0 + 1.7} dur={1.9} kind="plane" color={PAL.stamp} size={118} />
		<PinPop at="Berlin" t0={t0 + 1.5} t1={t0 + 3.0} text="Berlin" color={PAL.stamp} />
		<PinPop at="Königsberg" t0={t0 + 3.4} text="Königsberg" color={PAL.stamp} />
	</MapCamera>
);

const INFLOW = routePath(GI, [{lon: -7.2, lat: 35.98}, {lon: -6.2, lat: 35.96}, {lon: -5.45, lat: 35.99}, {lon: -4.75, lat: 36.12}, {lon: -4.1, lat: 36.3}], {mode: 'smooth'});

export const MapArrowDemo: React.FC<SceneProps> = ({t0}) => (
	<MapCamera map={GI} keys={[{t: t0, zoom: 1.25, at: 'Gibraltar'}, {t: t0 + 2.6, zoom: 1.05, at: [560, 880]}]} t0={t0}>
		<MapBase look="chart" borders={false} />
		<AdvanceArrow d={INFLOW} t0={t0 + 0.25} dur={1.3} color={PAL.teal} width={[30, 70]} head={110} />
		<PinPop at="Gibraltar" t0={t0 + 0.1} color={PAL.orange} size={56} />
		<MapLabel at={{lon: -6.9, lat: 35.55}} text="Atlantic" t0={t0 + 0.2} t1={t0 + 1.2} />
		<MapLabel at={{lon: -4.6, lat: 35.75}} text="Mediterranean" t0={t0 + 1.35} />
	</MapCamera>
);

const SCENES: Record<string, React.FC<SceneProps>> = {MapRouteDemo, MapPeriodDemo, MapArrowDemo};
const BEATS: BeatDef[] = [
	{k: 'm_route', t0: 0, t1: 6.4, tr: 'none', subY: 1300, scene: 'MapRouteDemo'},
	{k: 'm_period', t0: 6.4, t1: 10.4, tr: 'zoomthru', at: [540, 860], subY: 1300, scene: 'MapPeriodDemo'},
	{k: 'm_arrow', t0: 10.4, t1: MAPS_DEMO_S, tr: 'fade', subY: 1300, scene: 'MapArrowDemo'},
];

export const MapsDemo: React.FC = () => (
	<AbsoluteFill style={{background: '#08060c'}}>
		<Timeline beats={BEATS} scenes={SCENES} />
		<Grain opacity={0.07} />
	</AbsoluteFill>
);
