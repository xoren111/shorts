import React from 'react';
import {Freeze} from 'remotion';
import type {SceneProps} from './engine/transitions';
import {BEATS} from './data/beats';
import * as S1 from './scenes_1';
import * as S2 from './scenes_2';
import * as S3 from './scenes_3';

// milk-carton scenes — SKELETON (../SCRIPT.md «Покадровый план», ../EDIT_PLAN.md). Series A look (as A1 hay-castle): flat fills, INK
// outlines, palette PAL, everything drawn in code from the two kits src/ui/milk_a.tsx + src/ui/milk_b.tsx (being written — this file
// imports no kit). The scenes live in three files by part, each with its beat table in the header:
//   src/scenes_1.tsx  part 1, words 0–39  (0 – 12.66 s):   Hook, Missing, ManCan, Famous, IsThatMe, Hush, TakeHer, Mom
//   src/scenes_2.tsx  part 2, words 40–83 (12.66 – 25.04): OnTheRun, NotRun, NotHide, Buys (twist), KeepIt (screenshot), Cuts, Tosses, NextDoor
//   src/scenes_3.tsx  part 3, words 84–125 + loop (25.04 – 37.97): RealName, Police, HandedBack, DadPut, Billions, NoneHome, Loop
// Timing: src/data/beats.ts (beats + layout contract), src/data/events.ts (word-anchored events). No Atlas, no maps, no memes, no AI.
// tools/check.mjs finds the scene names with /export const (\w+)/ in THIS file, so every scene is re-exported as `export const`
// (an `export {…} from` line would not count).

// part 1
export const Hook = S1.Hook;
export const Missing = S1.Missing;
export const ManCan = S1.ManCan;
export const Famous = S1.Famous;
export const IsThatMe = S1.IsThatMe;
export const Hush = S1.Hush;
export const TakeHer = S1.TakeHer;
export const Mom = S1.Mom;
// part 2
export const OnTheRun = S2.OnTheRun;
export const NotRun = S2.NotRun;
export const NotHide = S2.NotHide;
export const Buys = S2.Buys;
export const KeepIt = S2.KeepIt;
export const Cuts = S2.Cuts;
export const Tosses = S2.Tosses;
export const NextDoor = S2.NextDoor;
// part 3
export const RealName = S3.RealName;
export const Police = S3.Police;
export const HandedBack = S3.HandedBack;
export const DadPut = S3.DadPut;
export const Billions = S3.Billions;
export const NoneHome = S3.NoneHome;
export const Loop = S3.Loop;

/**
 * frame 0 as a still layer for the loop dissolve (Short.tsx draws it over the last loop_s seconds): the Hook scene itself, frozen at
 * frame 0 (<Freeze> pins useCurrentFrame → useT() = 0 for everything inside), so the loop always lands on exactly what frame 0 shows,
 * whatever the Hook author draws
 */
const HOOK = BEATS[0];
export const FirstFrame: React.FC = () => (
	<Freeze frame={0}>
		<Hook t0={HOOK.t0} t1={HOOK.t1} />
	</Freeze>
);

export const SCENES: Record<string, React.FC<SceneProps>> = {
	Hook, Missing, ManCan, Famous, IsThatMe, Hush, TakeHer, Mom,
	OnTheRun, NotRun, NotHide, Buys, KeepIt, Cuts, Tosses, NextDoor,
	RealName, Police, HandedBack, DadPut, Billions, NoneHome, Loop,
};
