import React from 'react';
import {AbsoluteFill, Img, getStaticFiles, staticFile} from 'remotion';
import {W, We} from './lib/time';
import {S, type ShotKey} from './data/shots';
import {PasteurScene, Fence1926Scene} from './scenes/Photos';
import {SpreadMap, WAMap, SAMap, WADots} from './scenes/Maps';
import {ShieldsScene, FizzleScene, BarScene} from './scenes/Diagrams';
import {AtlasLayer, type AtlasWin} from './ui/Atlas';
import {ImgSeq, Label, KeyFact, Layer, XF, easeInOut, useT} from './ui/gfx';
import {Subtitles} from './ui/Subtitles';
import {MONT} from './fonts';

// Atlas only in the hook, at the key moment («They forgot birds.») and at the end (owner's rule since ep. 1).
// Root (feet) position + scale; big lower-left in the hook and the end (same spot → seamless loop), small lower-right otherwise.
const BIG = {x: 300, y: 2190, s: 0.74};
export const ATLAS: AtlasWin[] = [
	{t0: 0, t1: S.lesson[1] - 0.1, ...BIG, tin: 0, tout: 0.3, to: {x: 885, y: 2070, s: 0.47, at: S.lesson[0] - 0.05, dur: 0.5}},
	{t0: W(41) - 0.55, t1: W(44) - 0.1, x: 870, y: 2040, s: 0.56, tout: 0.3},
	{t0: S.score[0] + 0.05, t1: 62.0, ...BIG, tout: 0},
];

/** subtitle centre line: above Atlas's hat while he is on screen, otherwise low in the frame (never in the bottom 15 %) */
const subY = (t: number) => {
	if (t < S.lesson[0] - 0.05) return 1150;
	if (t < S.lesson[1]) return 1430;
	if (t >= W(41) - 0.6 && t < W(44)) return 1275;
	if (t >= S.score[0]) return t < 58.85 ? 1215 : 940;
	return 1450;
};
// the score words are spelled by the board's tiles (KEYFACT) → their subtitle steps aside
const scoreSpoken = (t: number) => t >= W(102) - 0.05 && t < We(109) + 0.25;

const LOOP_T = 61.2;
const files = new Set(getStaticFiles().map((f) => f.name));
const n = (dir: string) => {
	let k = 0;
	while (files.has(`${dir}/f_${String(k + 1).padStart(4, '0')}.jpg`)) k++;
	return k;
};

/** a Blender shot rendered for [S[key][0], S[key][1] + XF + 0.05] → public/blender/<dir>/f_NNNN.jpg; placeholder until rendered */
const Blender: React.FC<{k: ShotKey; dir: string}> = ({k, dir}) => {
	const nf = n(`blender/${dir}`);
	if (!nf) return <Placeholder k={k} />;
	return <ImgSeq dir={`blender/${dir}`} t0={S[k][0]} n={nf} />;
};

const Placeholder: React.FC<{k: ShotKey}> = ({k}) => (
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
			<Shot k="dockEng" first><Blender k="dockEng" dir="dock_eng" /></Shot>
			<Shot k="dockMel"><Blender k="dockMel" dir="dock_mel" /></Shot>
			<Shot k="lesson"><Blender k="lesson" dir="lesson" /></Shot>
			<Shot k="spread"><SpreadMap /></Shot>
			<Shot k="burrows"><Blender k="burrows" dir="burrows" /></Shot>
			<Shot k="trophy"><Blender k="trophy" dir="trophy" /></Shot>
			<Shot k="pasteur"><PasteurScene /></Shot>
			<Shot k="island"><Blender k="island" dir="island" /></Shot>
			<Shot k="shields"><ShieldsScene /></Shot>
			<Shot k="fizzle"><FizzleScene /></Shot>
			<Shot k="nobody"><Blender k="nobody" dir="nobody" /></Shot>
			<Shot k="fence1926"><Fence1926Scene /></Shot>
			<Shot k="wamap"><WAMap /></Shot>
			<Shot k="pegs"><Blender k="pegs" dir="pegs" /></Shot>
			<Shot k="scratch"><Blender k="scratch" dir="scratch" /></Shot>
			<Shot k="wardang"><Blender k="wardang" dir="wardang" /></Shot>
			<Shot k="samap"><SAMap /></Shot>
			<Shot k="ceremony"><Blender k="ceremony" dir="ceremony" /></Shot>
			<Shot k="wadots"><WADots /></Shot>
			<Shot k="bar"><BarScene /></Shot>
			<Shot k="score"><Blender k="score" dir="score" /></Shot>
			{/* loop: the last 0.8 s dissolves into the very first frame (same Atlas spot and pose) */}
			{t >= LOOP_T ? (
				<AbsoluteFill style={{opacity: easeInOut((t - LOOP_T) / (62.0 - LOOP_T))}}>
					{files.has('blender/dock_eng/f_0001.jpg') ? <Img src={staticFile('blender/dock_eng/f_0001.jpg')} style={{width: '100%', height: '100%'}} /> : null}
				</AbsoluteFill>
			) : null}
			{/* labels that belong to the Blender shots (one at a time, never echoing the voice) */}
			<Label text="England" accent="October 1859" t0={0.35} t1={S.dockEng[1] - 0.15} x={540} y={250} size={52} />
			<Label text="Melbourne" accent="Christmas 1859" t0={S.dockMel[0] + 0.45} t1={S.dockMel[1] - 0.1} x={540} y={250} size={52} />
			<Label text="The Lightning:" accent="80 days at sea" t0={S.lesson[0] + 0.45} t1={S.lesson[1] - 0.05} x={540} y={250} size={48} />
			{t >= S.trophy[0] && t < S.pasteur[0] + 0.4 ? <KeyFact value="£25,000" sub="prize · New South Wales, 1887" t0={S.trophy[0] + 0.45} t1={S.trophy[1] - 0.1} x={540} y={330} size={150} /> : null}
			<Label text="Rodd Island lab" sub="Sydney" t0={S.island[0] + 0.35} t1={S.island[1] - 0.05} x={540} y={250} size={54} />
			<Label text="nearly" accent="1,500 entries" t0={S.nobody[0] + 0.4} t1={S.nobody[1]} x={540} y={300} size={56} />
			<Label text="By" accent="1902" t0={W(61) - 0.1} t1={S.pegs[1]} x={540} y={300} size={58} />
			<Label text="Inspector's report" accent="1904" t0={S.scratch[0] + 0.4} t1={S.scratch[1]} x={540} y={300} size={54} />
			<Label text="Wardang Island quarantine" accent="1995" t0={S.wardang[0] + 0.4} t1={S.wardang[1] + 0.1} x={540} y={300} size={50} />
			<Label text="Western Australia" accent="18 Oct 1996" t0={S.ceremony[0] + 0.4} t1={S.ceremony[1]} x={540} y={300} size={54} />
			<Label text="Today:" accent="≈ 200 million" sub="estimate" t0={W(112) + 0.5} t1={LOOP_T - 0.1} x={540} y={300} size={58} />
			<AtlasLayer wins={ATLAS} />
			{noSubs ? null : <Subtitles y={subY} hidden={scoreSpoken} />}
		</AbsoluteFill>
	);
};
