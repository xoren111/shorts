import React from 'react';
import {AbsoluteFill, Loop, OffthreadVideo, staticFile} from 'remotion';
import {Timeline, type SceneProps} from './engine/transitions';
import type {BeatDef} from './data/beats';
import {Label, useT} from './ui/gfx';
import {Bg} from './ui/draw';
import {Grain} from './ui/vox';
import {BarGrow, CHART_SAFE, CompareBeforeAfter, DonutFill, IconRow, LineDraw} from './ui/charts';

// Chart gallery (src/ui/charts.tsx) — a TEST composition like src/Gallery.tsx, never published. SAMPLE numbers only (no
// facts): every scene runs one chart on its own clock through the real Timeline (transitions included), over a moving drawn
// background (standard 4.6: a chart sits on a picture, not on a flat slide).
//   0.0  BarGrow up · gold bar · tFocus             3.2  BarGrow right · count (R6 roll)
//   6.4  LineDraw · land tag · ghost · mark           9.6  LineDraw · follow tag (≤ 1.1 s) · enter wipe
//  12.0  Compare split (stack, icons, count, delta)  15.2  Compare wipe (struck «before» stays)
//  18.4  Compare side · cam none                     20.8  DonutFill · count · enter slam · scrim 0.7
//  24.0  IconRow 3 of 10 · spread                    27.2  IconRow 12 of 40 · random · caption        30.4  list (fade)
// Input props (tests only): `guides` draws the chart safe box (x 48–887, y 288–1150), the subtitle band (R3 1180–1300), the
// y 1440 line and the right-hand UI strip; `footage` = a clip path under public/ (given at render time, never a literal here,
// so check.mjs does not count it) puts every scene on that looping clip instead of the drawn Bg.
// Once registered in Root.tsx (<Composition id="ChartsGallery" … durationInFrames={Math.round(CHARTS_GALLERY_S * FPS)} />):
//   node tools/stills.mjs --comp ChartsGallery --t 0.65,1.05,2.8,3.85,4.4,6 --props '{"guides":true}' --out out/stills/charts

export const CHARTS_GALLERY_S = 31.8;
const SRC = 'sample data · chart gallery test';

/** test input prop `footage` (a clip under public/, passed at render time — never a literal here, so check.mjs does not
 * count it as an asset of the template): every scene sits on that clip instead of the drawn Bg (standard 4.6 case) */
const FootageCtx = React.createContext<string | null>(null);
const Ground: React.FC<{kind: string; cy?: number}> = ({kind, cy}) => {
	const t = useT();
	const clip = React.useContext(FootageCtx);
	if (!clip) return <Bg kind={kind} t={t} cy={cy} />;
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<Loop durationInFrames={420}>
				<OffthreadVideo src={staticFile(clip)} muted style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.05)'}} />
			</Loop>
			<AbsoluteFill style={{background: 'rgba(8,14,28,0.25)'}} />
		</AbsoluteFill>
	);
};

const CBar: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="navy" />
			<BarGrow
				t0={t0 + 0.05}
				t1={t1}
				title="Cargo by port"
				accent="· tonnes"
				source={SRC}
				data={[
					{label: 'North', value: 420},
					{label: 'East', value: 610},
					{label: 'South', value: 380},
					{label: 'West', value: 1250, gold: true},
					{label: 'Centre', value: 540},
				]}
				tFocus={t0 + 2.2}
			/>
		</AbsoluteFill>
	);
};

const CBarH: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="chart" cy={700} />
			<BarGrow
				t0={t0 + 0.05}
				t1={t1}
				dir="right"
				count
				grow={0.9}
				dec={1}
				unit=" km"
				title="Route length"
				source={SRC}
				data={[
					{label: 'Route A', value: 2.4},
					{label: 'Route B', value: 3.1},
					{label: 'Route C · the long one', value: 5.8, gold: true},
					{label: 'Route D', value: 1.7},
				]}
			/>
		</AbsoluteFill>
	);
};

const CLine: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="navy" cy={1100} />
			<LineDraw
				t0={t0 + 0.05}
				t1={t1}
				title="Visitors per month"
				source={SRC}
				values={[12, 14, 13, 19, 24, 31, 46]}
				ghost={[10, 11, 12, 12, 13, 14, 15]}
				ghostLabel="last year"
				labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']}
				xLabels="all"
				display="46 k"
				mark={4}
			/>
		</AbsoluteFill>
	);
};

const CLineF: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="chart" cy={500} />
			<LineDraw t0={t0 + 0.05} t1={t1} enter="wipe" tag="follow" dur={1.0} smooth={false} box={{y: 420, h: 640}} values={[3, 5, 4, 8, 12]} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']} display="12%" source={SRC} />
		</AbsoluteFill>
	);
};

const CSplit: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="navy" />
			<CompareBeforeAfter t0={t0 + 0.05} tSwitch={t0 + 1.1} t1={t1} before={{value: 50, label: 'Before', icon: 'tree'}} after={{value: 1000, label: 'After', icon: 'factory'}} count delta="×20" source={SRC} />
		</AbsoluteFill>
	);
};

const CWipe: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="chart" cy={1200} />
			<CompareBeforeAfter t0={t0 + 0.05} tSwitch={t0 + 1.0} t1={t1} mode="wipe" title="Crossing time" before={{value: 9, display: '9 h', label: 'By ship', icon: 'ship'}} after={{value: 2, display: '2 h', label: 'By car', icon: 'car'}} source={SRC} />
		</AbsoluteFill>
	);
};

const CSide: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="navy" cy={600} />
			<CompareBeforeAfter t0={t0 + 0.05} tSwitch={t0 + 0.8} t1={t1} layout="side" cam="none" box={{y: 420, h: 600}} before={{value: 8, label: 'Then', icon: 'house'}} after={{value: 64, label: 'Now', icon: 'house'}} count />
		</AbsoluteFill>
	);
};

const CDonut: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="chart" cy={760} />
			<DonutFill t0={t0 + 0.05} tFill={t0 + 0.5} t1={t1} enter="slam" scrim={0.7} value={71} label="covered" count title="Share of the coast" source={SRC} />
		</AbsoluteFill>
	);
};

const CIcons: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="navy" cy={800} />
			<IconRow t0={t0 + 0.05} tFill={t0 + 1.0} t1={t1} n={10} k={3} icon="person" order="spread" box={{y: 460, h: 560}} source={SRC} />
		</AbsoluteFill>
	);
};

const CIcons2: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<Ground kind="sea" cy={800} />
			<IconRow t0={t0 + 0.05} tFill={t0 + 0.9} t1={t1} n={40} k={12} icon="drop" order="random" title="Wells with water" panel="scrim" caption="the rest ran dry" source={SRC} />
		</AbsoluteFill>
	);
};

const CEnd: React.FC<SceneProps> = ({t0, t1}) => {
	const rows = ['BarGrow', 'LineDraw', 'CompareBeforeAfter', 'DonutFill', 'IconRow'];
	return (
		<AbsoluteFill>
			<Ground kind="navy" />
			{rows.map((r, i) => (
				<Label key={r} text={r} t0={t0 + 0.15 + i * 0.12} t1={t1} x={490} y={560 + i * 120} size={60} />
			))}
			<Label text="Chart gallery — test, not published" t0={t0 + 0.7} t1={t1} x={490} y={1140} size={38} color="#ffd7f0" />
		</AbsoluteFill>
	);
};

const SCENES: Record<string, React.FC<SceneProps>> = {CBar, CBarH, CLine, CLineF, CSplit, CWipe, CSide, CDonut, CIcons, CIcons2, CEnd};
export const CHART_BEATS: BeatDef[] = [
	{k: 'c_bar', t0: 0, t1: 3.2, tr: 'none', subY: 1300, scene: 'CBar'},
	{k: 'c_barh', t0: 3.2, t1: 6.4, tr: 'whipL', subY: 1300, scene: 'CBarH'},
	{k: 'c_line', t0: 6.4, t1: 9.6, tr: 'up', subY: 1300, scene: 'CLine'},
	{k: 'c_linef', t0: 9.6, t1: 12.0, tr: 'diag', subY: 1300, scene: 'CLineF'},
	{k: 'c_split', t0: 12.0, t1: 15.2, tr: 'whipR', subY: 1300, scene: 'CSplit'},
	{k: 'c_wipe', t0: 15.2, t1: 18.4, tr: 'circle', at: [490, 720], subY: 1300, scene: 'CWipe'},
	{k: 'c_side', t0: 18.4, t1: 20.8, tr: 'punch', subY: 1300, scene: 'CSide'},
	{k: 'c_donut', t0: 20.8, t1: 24.0, tr: 'up', subY: 1300, scene: 'CDonut'},
	{k: 'c_icons', t0: 24.0, t1: 27.2, tr: 'whipL', subY: 1300, scene: 'CIcons'},
	{k: 'c_icons2', t0: 27.2, t1: 30.4, tr: 'zoomthru', at: [490, 720], subY: 1300, scene: 'CIcons2'},
	{k: 'c_end', t0: 30.4, t1: CHARTS_GALLERY_S, tr: 'fade', subY: 1300, scene: 'CEnd'},
];

/** safe-zone overlay for checking stills (standard 4.4 + R3) */
const Guides: React.FC = () => (
	<AbsoluteFill style={{pointerEvents: 'none'}}>
		<div style={{position: 'absolute', left: CHART_SAFE.x0, top: CHART_SAFE.y0, width: CHART_SAFE.x1 - CHART_SAFE.x0, height: CHART_SAFE.y1 - CHART_SAFE.y0, border: '3px dashed rgba(34,230,216,0.9)', boxSizing: 'border-box'}} />
		<div style={{position: 'absolute', left: 0, right: 0, top: 1180, height: 120, background: 'rgba(255,46,136,0.22)', borderTop: '2px solid #FF2E88', borderBottom: '2px solid #FF2E88'}} />
		<div style={{position: 'absolute', left: 0, right: 0, top: 1440, height: 4, background: '#ff3030'}} />
		<div style={{position: 'absolute', left: CHART_SAFE.x1, right: 0, top: 960, bottom: 0, background: 'rgba(255,48,48,0.18)'}} />
		<div style={{position: 'absolute', left: 120, right: 120, top: 1222, textAlign: 'center', fontFamily: 'Montserrat', fontWeight: 900, fontSize: 40, color: '#fff', opacity: 0.8}}>SUBTITLE BAND</div>
	</AbsoluteFill>
);

export const ChartsGallery: React.FC<{guides?: boolean; footage?: string}> = ({guides, footage}) => (
	<AbsoluteFill style={{background: '#08060c'}}>
		<FootageCtx.Provider value={footage ?? null}>
			<Timeline beats={CHART_BEATS} scenes={SCENES} />
		</FootageCtx.Provider>
		<Grain opacity={0.07} />
		{guides ? <Guides /> : null}
	</AbsoluteFill>
);
