import words from '../../data/words.json';
import project from '../../project.json';

/**
 * The edit clock = the words of the chosen VO (data/words.json, tools/align.py). Every timing derives from it.
 * The same formulas live in tools/check.mjs (which writes out/timeline.json for mix.py / srt.py / cut_frames.py / dupes.py):
 *   VO_END   = project.vo_end   ?? last word end + 0.15
 *   DURATION = project.duration ?? last word end + project.tail_s
 *   LOOP_T   = DURATION − project.loop_s   (the last loop_s seconds dissolve into frame 0)
 */
export const FPS = 60;
export const ATLAS_FPS = 30;

export type Word = {w: string; s: number; e: number};
export const WORDS = words as Word[];
export const WORDS_VO = WORDS;

const last = WORDS[WORDS.length - 1];
const r3 = (x: number) => Math.round(x * 1000) / 1000;
export const VO_END = r3(project.vo_end ?? last.e + 0.15);
export const DURATION = r3(project.duration ?? last.e + project.tail_s);
export const LOOP_T = r3(DURATION - project.loop_s);
export const TOTAL_FRAMES = Math.round(DURATION * FPS);

/** start time (s) of word i */
export const W = (i: number) => WORDS[i].s;
/** end time (s) of word i */
export const We = (i: number) => WORDS[i].e;
/** seconds → frame (fractional) */
export const fr = (s: number) => s * FPS;
