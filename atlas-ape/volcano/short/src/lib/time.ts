import words from '../../data/words.json';

/** composition frame rate (60 since 18.10 for smoother motion; the Atlas WebP sequence stays 30 fps, see ATLAS_FPS) */
export const FPS = 60;
export const ATLAS_FPS = 30;
export const VO_END = 75.807;
export const DURATION = 76.8;
export const TOTAL_FRAMES = Math.round(DURATION * FPS);

export type Word = {w: string; s: number; e: number};
export const WORDS = words as Word[];

/** start time (s) of word i */
export const W = (i: number) => WORDS[i].s;
/** end time (s) of word i */
export const We = (i: number) => WORDS[i].e;
/** seconds → frame (fractional) */
export const fr = (s: number) => s * FPS;
/** frame of word start, optional lead in seconds (negative = earlier) */
export const Wf = (i: number, d = 0) => Math.round((WORDS[i].s + d) * FPS);

// section boundaries (word-anchored)
export const SEC = {
	hook: 0,
	hawaii: W(17),
	italy: W(47),
	iceland: W(76),
	ocean: W(109),
	final: W(138),
	end: DURATION,
};
