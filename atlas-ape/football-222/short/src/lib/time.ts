import words from '../../data/words.json';

/** composition frame rate (60 for smooth motion) */
export const FPS = 60;
export const ATLAS_FPS = 30;
/** «him.» ends 29.84 s on vo_constantino_v4_final.wav; the last 0.55 s dissolve back into frame 0 (loop) */
export const VO_END = 29.95;
export const DURATION = 30.5;
export const TOTAL_FRAMES = Math.round(DURATION * FPS);

export type Word = {w: string; s: number; e: number};
/** word clock of the chosen VO (Constantino, Eleven v4, pauses 0.15 s) — the edit and the subtitles share it */
export const WORDS = words as Word[];
export const WORDS_VO = WORDS;
/** start time (s) of word i */
export const W = (i: number) => WORDS[i].s;
/** end time (s) of word i */
export const We = (i: number) => WORDS[i].e;
/** seconds → frame (fractional) */
export const fr = (s: number) => s * FPS;
