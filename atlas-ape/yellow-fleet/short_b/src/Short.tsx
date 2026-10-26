import React from 'react';
import {AbsoluteFill, Img, getStaticFiles, staticFile} from 'remotion';
import {W, We} from './lib/time';
import {S, R, END, type ShotKey} from './data/shots';
import {SinkScene, StarsCard} from './scenes/Diagrams';
import {FlagsBar, RouteMap, TrappedMap, YearsBar} from './scenes/Graphics';
import {AtlasLayer, type AtlasWin} from './ui/Atlas';
import {INK, ImgSeq, Label, KeyFact, Layer, XF, clamp01, easeInOut, easeOut, pop, useT} from './ui/gfx';
import {Subtitles} from './ui/Subtitles';
import {MONT} from './fonts';

// owner 21.10 (v6): no Atlas during the story — the narrator is voice only; (v7) Atlas comes back for the ending only:
// he enters on «Part of the cargo?», winks on «late» and thinks over the stars question.
// variant B (channel audit 21.10): 220 px higher than v8 — his face (~y 1380) now sits ABOVE YouTube's title / channel /
// Subscribe overlay (bottom-left ~y 1560+); the cut edge of the body still stays below the frame (~y 1964)
const BIG = {x: 300, y: 1970, s: 0.74};
const LOOP_T = END - 0.7;
export const ATLAS: AtlasWin[] = [{t0: S.hold[0] + 0.4, t1: LOOP_T + 0.45, ...BIG, tout: 0.45}];
/** subtitle centre line: above Atlas's hat while he is on screen, otherwise low (never in the bottom 15 %) */
const subY = (t: number) => (t >= S.hold[0] ? 980 : t >= S.football[0] && t < S.football[1] + 0.2 ? 1170 : 1450);   // football: keep the goal mouth clear
// «They got out eight years later.» is shown as the big KEYFACT → its subtitle steps aside
// B: «for a one-day trip.» is the big 1-DAY TRIP card → its subtitle steps aside too
const keySpoken = (t: number) => (t >= W(10) - 0.05 && t < We(15) + 0.2) || (t >= W(6) - 0.05 && t < We(9) + 0.15);

// v8 (owner 21.10: «непонятно почему меняется флот» in the first frames) — the yellow flash-forward teaser is gone; the
// Short opens on the 1967 convoy and the loop dissolves back to that same first frame.
const LOOP_SRC = 'blender/then/f_0001.jpg';
const files = new Set(getStaticFiles().map((f) => f.name));
const n = (dir: string, ext = 'jpg', pad = 4) => {
	let k = 0;
	while (files.has(`${dir}/f_${String(k + (ext === 'jpg' ? 1 : 0)).padStart(pad, '0')}.${ext}`)) k++;
	return k;
};

/** a Blender shot rendered for [S[key][0], S[key][1] + XF + 0.05] → public/blender/<key>/f_NNNN.jpg; placeholder until rendered */
const Blender: React.FC<{k: ShotKey}> = ({k}) => {
	const nf = n(`blender/${k}`);
	if (!nf) return <Placeholder k={k} />;
	return <ImgSeq dir={`blender/${k}`} t0={R[k]} n={nf} />;
};

/** v8 (owner: «непонятно что за ивент олимпикс»): two more Olympic events as picture-in-picture cards over the rowing race
 *  (FACTS C6: diving, sprint …) — 720×480 Blender renders, white-bordered, slightly tilted, popping in one after another */
const InsetCard: React.FC<{k: 'dive' | 'sprint'; t0: number; t1: number; x: number; y: number; rot: number}> = ({k, t0, t1, x, y, rot}) => {
	const t = useT();
	const nf = n(`blender/${k}`);
	if (t < t0 || t > t1 + 0.3 || !nf) return null;
	const s = pop(t, t0, 0.35);
	const o = clamp01((t1 + 0.3 - t) / 0.3);
	const W_ = 600, H_ = 400;
	return (
		<div style={{position: 'absolute', left: x, top: y, width: W_, height: H_, transform: `rotate(${rot}deg) scale(${s})`, opacity: o, borderRadius: 26, overflow: 'hidden', border: '8px solid #fffaf0', boxShadow: '0 18px 40px rgba(10,0,30,0.5)'}}>
			<ImgSeq dir={`blender/${k}`} t0={R[k]} n={nf} />
		</div>
	);
};

/** B cold open: the promise on screen from frame 0 — «1-DAY TRIP» — crossed out by a red marker stroke in the pause
 *  after «trip.», gone just before 8 YEARS stamps in (the same spot, so the eye stays there) */
const STRIKE = 'rgb(255, 51, 85)';
const OneDayTrip: React.FC = () => {
	const t = useT();
	const tS = W(9) + 0.45, tOut = W(13) - 0.42;
	if (t > tOut + 0.3) return null;
	const k = easeOut((t - tS) / 0.2);
	const o = clamp01((tOut + 0.3 - t) / 0.3);
	return (
		<>
			<KeyFact value="1-DAY TRIP" t0={-0.35} t1={tOut} x={540} y={400} size={150} />
			{t >= tS ? (
				<div style={{position: 'absolute', left: 540 - 320, top: 400 - 10, width: 640 * k, height: 30, borderRadius: 15, background: STRIKE, opacity: o,
					transform: 'rotate(-5deg)', transformOrigin: '0% 50%', boxShadow: `0 0 0 6px ${INK}, 0 6px 0 6px ${INK}`}} />
			) : null}
		</>
	);
};

const Placeholder: React.FC<{k: string}> = ({k}) => (
	<AbsoluteFill style={{background: 'linear-gradient(180deg, #3b1a6e, #120626)', alignItems: 'center', justifyContent: 'center'}}>
		<div style={{fontFamily: MONT, fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.35)'}}>{k} (in production)</div>
	</AbsoluteFill>
);

const Shot: React.FC<{k: ShotKey; children: React.ReactNode; first?: boolean}> = ({k, children, first}) => (
	<Layer t0={S[k][0]} t1={S[k][1]} fadeIn={first ? 0 : XF}>
		{children}
	</Layer>
);

/** noSubs: hide the burned-in subtitles (cover/thumbnail stills only; the final render keeps them) */
export const Short: React.FC<{noSubs?: boolean}> = ({noSubs}) => {
	const t = useT();
	return (
		<AbsoluteFill style={{background: '#0b0420'}}>
			<Shot k="then" first><Blender k="then" /></Shot>
			<Shot k="later"><Blender k="later" /></Shot>
			<Shot k="war"><Blender k="war" /></Shot>
			<Shot k="sink"><SinkScene /></Shot>
			<Shot k="lake"><Blender k="lake" /></Shot>
			<Shot k="storm"><Blender k="storm" /></Shot>
			<Shot k="friends"><Blender k="friends" /></Shot>
			<Shot k="football"><Blender k="football" /></Shot>
			<Shot k="stamps"><Blender k="stamps" /></Shot>
			<Shot k="race">
				<Blender k="race" />
				<InsetCard k="dive" t0={S.race[0] + 0.22} t1={S.race[1] - 0.05} x={30} y={360} rot={-3} />
				<InsetCard k="sprint" t0={S.race[0] + 0.5} t1={S.race[1] - 0.05} x={450} y={610} rot={3} />
			</Shot>
			<Shot k="podium"><Blender k="podium" /></Shot>
			<Shot k="hamburg"><Blender k="hamburg" /></Shot>
			<RouteMap t0={S.hamburg[0]} t1={W(79) - 0.15} />
			<Shot k="hold"><Blender k="hold" /></Shot>
			{/* loop: the last 0.7 s dissolve into the very first frame (convoy at dawn + the salute) */}
			{t >= LOOP_T ? (
				<AbsoluteFill style={{opacity: easeInOut((t - LOOP_T) / (END - LOOP_T))}}>
					{files.has(LOOP_SRC) ? <Img src={staticFile(LOOP_SRC)} style={{width: '100%', height: '100%'}} /> : null}
				</AbsoluteFill>
			) : null}
			{/* one calm label at a time, only information the voice does not say */}
			{t >= S.later[0] && t < S.war[0] + 0.4 ? <KeyFact value="8 YEARS" t0={W(13) - 0.12} t1={S.later[1] - 0.05} x={540} y={400} size={170} /> : null}
			<OneDayTrip />
			<YearsBar t0={W(13) - 0.05} t1={S.later[1] - 0.05} y={560} years={false} />
			<Label text="Great Bitter Lake" t0={S.lake[0] + 0.35} t1={W(39) - 0.35} x={540} y={300} size={56} />
			<TrappedMap t0={W(39) - 0.3} t1={S.lake[1] + 0.25} />
			<FlagsBar t0={S.friends[0] + 0.3} t1={S.friends[1] - 0.05} />
			<Label text="Bitter Lake Olympics:" accent="14 events" t0={S.race[0] + 0.3} t1={S.race[1]} x={540} y={300} size={50} />
			<Label text="Hamburg," accent="24 May 1975" t0={W(79) - 0.1} t1={S.hamburg[1] - 0.05} x={540} y={300} size={54} />
			<StarsCard t0={W(94) - 0.25} t1={LOOP_T + 0.35} />
			<AtlasLayer wins={ATLAS} />
			{noSubs ? null : <Subtitles y={subY} hidden={keySpoken} />}
		</AbsoluteFill>
	);
};
