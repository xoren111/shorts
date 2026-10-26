import React from 'react';
import {AbsoluteFill, OffthreadVideo, getInputProps, staticFile, useCurrentFrame} from 'remotion';
import {FPS, W, We} from './lib/time';
import {Etna3D, EtnaTown} from './scenes/Etna';
import {GlobeHop} from './scenes/GlobeHop';
import {Hawaii3DA, Hawaii3DB, HookScene} from './scenes/Hawaii';
import {Iceland3DA, Iceland3DB, Iceland3DC} from './scenes/Iceland';
import {DisputePhoto, FinalScore, HarborPhotos, LitersGauge, MonthsInsert, PattonReveal, SprayPhoto, Triptych} from './scenes/Inserts';
import {AtlasLayer, type AtlasWin} from './ui/Atlas';
import {EMPH} from './data/emph';
import {KeyFact, Layer, XF} from './ui/gfx';
import {GROUPS, Subtitles} from './ui/Subtitles';

// ---- section windows (absolute seconds, word-anchored) ----
export const T = {
	hookEnd: 6.6,
	globeA: [6.42, 8.6] as const,
	hawA: [8.55, W(25)] as const,
	hawA2: [W(25), W(28)] as const,
	patton: [W(28), W(32)] as const,
	hawB: [W(32), W(39)] as const,
	dispute: [W(39), W(47) - 0.65] as const,
	globeB: [W(47) - 0.7, W(48)] as const,
	etna: [W(48), W(71)] as const,
	globeC: [W(76) - 0.02, W(79)] as const,
	iceA: [W(79), W(104)] as const,
	spray: [W(104), W(109)] as const,
	iceB: [W(109), W(112)] as const,
	months: [W(112), W(114)] as const,
	liters: [W(114), W(119)] as const,
	iceC: [W(119), W(129)] as const,
	harbor: [W(129), W(138)] as const,
	final: W(138),
};

const BIG = {x: 520, y: 2190, s: 0.85};

// Atlas only where the owner wants him (19.10 notes): the hook, the Etna moment (points at the flow) and the final.
export const ATLAS: AtlasWin[] = [
	{t0: 0, t1: 6.42, ...BIG, tin: 0, tout: 0.45},
	// enters with the stick already raised and leaves before he lowers it (the rig's arm moves would read as snaps)
	{t0: W(49) + 0.06, t1: W(54) + 0.42, x: 215, y: 1990, s: 0.55, tout: 0.3},
	// stays to the last frame at the hook's spot, so the loop back to frame 0 is seamless
	{t0: W(138) - 0.15, t1: 76.81, x: 520, y: 2190, s: 0.85, tout: 0},
];

/** subtitle centre line: low in the frame; above Atlas's hat while he is on screen */
const subY = (t: number) => {
	if (t < 6.42) return 1095;
	if (t >= W(48) - 0.05 && t < W(55) - 0.05) return 1060;
	if (t >= W(138) - 0.15) return 1095;
	return 1440;
};

// Key figures (src/data/emph.ts) are shown big while their phrase is spoken; that phrase's subtitle group steps aside so the
// figure is never on screen twice (owner 18.10). Same for «Final score: Humans two. Volcano zero.» — the icon board spells it.
const FACTS = EMPH.map((e) => {
	const gs = GROUPS.filter((g) => g.words.some((i) => e.words.includes(i)));
	return {...e, from: Math.min(...gs.map((g) => g.from)), to: Math.max(...gs.map((g) => g.to))};
});
const scoreSpoken = (t: number) => (t >= W(140) - 0.05 && t < We(143) + 0.25) || FACTS.some((f) => t >= f.from - 0.05 && t < f.to);

// v6 HYBRID (owner 19.10): 0 – 29.5 s is the pre-Blender v4 render (public/v4_base.mp4 = out/patch/v4/raw.mp4 0–30 s, one glitch
// frame patched; its subtitles/Atlas/key figures are baked in); from the dirt-wall diagram (SA = W(55) + 0.1) on, everything is
// the new v5/v6 build. The new layers start at SA and dissolve in over XF on top of the old video, which runs until SA + XF.
const HYB = (getInputProps() as {hybrid?: boolean}).hybrid ?? true;
const HYB_T = W(55) + 0.1;

export const Short: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	if (HYB && t < HYB_T) {
		return (
			<AbsoluteFill style={{background: '#06020f'}}>
				<OffthreadVideo src={staticFile('v4_base.mp4')} muted />
			</AbsoluteFill>
		);
	}
	if (HYB && t < HYB_T + XF) {
		// the seam: old shot A under the new diagram (which fades itself in from HYB_T), with the new subtitles on top
		return (
			<AbsoluteFill style={{background: '#06020f'}}>
				<OffthreadVideo src={staticFile('v4_base.mp4')} muted />
				<Etna3D skipA />
				<Subtitles y={subY} hidden={scoreSpoken} />
			</AbsoluteFill>
		);
	}
	// every shot cross-dissolves in over XF on top of the previous one (Layer); inserts (photos, gauges, score) gate and fade
	// themselves the same way and stay up for XF after their window, so nothing ever hard-cuts
	return (
		<AbsoluteFill style={{background: '#06020f'}}>
			<Layer t0={0} t1={T.globeA[0]} fadeIn={0}>
				<HookScene />
			</Layer>
			{t < T.hookEnd + XF ? <Triptych /> : null}
			<Layer t0={T.globeA[0]} t1={T.globeA[1]}>
				<GlobeHop t0={T.globeA[0]} t1={T.globeA[1]} from={[18, -40]} to={[19.6, -155.45]} label="HAWAII" extraSpin={-30} />
			</Layer>
			<Layer t0={T.hawA[0]} t1={T.hawA[1]}>
				<Hawaii3DA />
			</Layer>
			<Layer t0={T.hawA2[0]} t1={T.hawA2[1]}>
				<Hawaii3DA close />
			</Layer>
			<PattonReveal />
			<Layer t0={T.hawB[0]} t1={T.hawB[1]}>
				<Hawaii3DB />
			</Layer>
			<DisputePhoto />
			<Layer t0={T.globeB[0]} t1={T.globeB[1]}>
				<GlobeHop t0={T.globeB[0]} t1={T.globeB[1]} from={[19.6, -155.45]} to={[37.75, 15.0]} arcFrom={[19.6, -155.45]} label="ITALY" dist={3.3} />
			</Layer>
			<Layer t0={T.etna[0]} t1={T.etna[1]}>
				<Etna3D />
			</Layer>
			<EtnaTown />
			<Layer t0={T.globeC[0]} t1={T.globeC[1]}>
				<GlobeHop t0={T.globeC[0]} t1={T.globeC[1]} from={[37.75, 15.0]} to={[63.43, -20.26]} arcFrom={[37.75, 15.0]} label="ICELAND" dist={2.6} />
			</Layer>
			<Layer t0={T.iceA[0]} t1={T.iceA[1]}>
				<Iceland3DA />
			</Layer>
			<SprayPhoto />
			<Layer t0={T.iceB[0]} t1={T.iceB[1]}>
				<Iceland3DB />
			</Layer>
			<MonthsInsert />
			<LitersGauge />
			<Layer t0={T.iceC[0]} t1={T.iceC[1]}>
				<Iceland3DC />
			</Layer>
			<HarborPhotos />
			{t >= T.final - 0.3 ? <FinalScore /> : null}
			{FACTS.map((f) => (
				<KeyFact key={f.key} value={f.value} unit={f.unit} sub={f.sub} color={f.color} t0={f.from - 0.05 + (f.delay ?? 0)} t1={f.to - 0.15 + (f.hold ?? 0)} x={f.x ?? 540} y={f.y ?? 420} size={f.size ?? 160} />
			))}
			<AtlasLayer wins={ATLAS} />
			<Subtitles y={subY} hidden={scoreSpoken} />
		</AbsoluteFill>
	);
};
