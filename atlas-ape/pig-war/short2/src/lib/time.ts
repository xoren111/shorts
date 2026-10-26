import words from '../../data/words.json';
import wordsVo from '../../data/words_vo.json';

/** composition frame rate (60 for smooth motion; the Atlas WebP sequence stays 30 fps, see ATLAS_FPS) */
export const FPS = 60;
export const ATLAS_FPS = 30;
export const VO_END = 43.15;
export const DURATION = 43.85;
export const TOTAL_FRAMES = Math.round(DURATION * FPS);

export type Word = {w: string; s: number; e: number};
export const WORDS = words as Word[];
/** word times on the paid-plan VO (../vo_silas_paid_fit.wav): sentences start on the edit clock, words inside follow the new take */
export const WORDS_VO = wordsVo as Word[];
export const WV = (i: number) => WORDS_VO[i].s;
export const WVe = (i: number) => WORDS_VO[i].e;

/** start time (s) of word i */
export const W = (i: number) => WORDS[i].s;
/** end time (s) of word i */
export const We = (i: number) => WORDS[i].e;
/** seconds → frame (fractional) */
export const fr = (s: number) => s * FPS;
