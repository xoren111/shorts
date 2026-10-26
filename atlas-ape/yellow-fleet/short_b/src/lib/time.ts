import words from '../../data/words.json';

/** composition frame rate (60 for smooth motion; the Atlas WebP sequence stays 30 fps, see ATLAS_FPS) */
export const FPS = 60;
export const ATLAS_FPS = 30;
export const VO_END = 31.265;   // variant B (tools/make_b.py): v8 minus two lines
export const DURATION = 32.125;
/** the v8 clock the Atlas rig frames were exported on */
export const DURATION_V8 = 36.7;
export const TOTAL_FRAMES = Math.round(DURATION * FPS);

export type Word = {w: string; s: number; e: number; cut?: boolean};
export const WORDS = words as Word[];

/** start time (s) of word i */
export const W = (i: number) => WORDS[i].s;
/** end time (s) of word i */
export const We = (i: number) => WORDS[i].e;
/** seconds → frame (fractional) */
export const fr = (s: number) => s * FPS;
