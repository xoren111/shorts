import {W} from '../lib/time';

// Shot windows (absolute seconds). Each shot starts its cross-dissolve LEAD s before its anchor word (SHOTS.md).
const LEAD = 0.3;
const at = (i: number, lead = LEAD) => W(i) - lead;

export const S = {
	dockEng: [0, at(9)] as const,
	dockMel: [at(9), at(12, 0.25)] as const,
	lesson: [at(12, 0.25), at(17)] as const,
	spread: [at(17), at(22)] as const,
	burrows: [at(22), at(25)] as const,
	trophy: [at(25), at(29)] as const,
	pasteur: [at(29), at(32, 0.25)] as const,
	island: [at(32, 0.25), at(35)] as const,
	shields: [at(35), at(44, 0.25)] as const,
	fizzle: [at(44, 0.25), at(48)] as const,
	nobody: [at(48), at(50)] as const,
	fence1926: [at(50), at(54)] as const,
	wamap: [at(54), at(57)] as const,
	pegs: [at(57), at(67)] as const,
	scratch: [at(67), at(73)] as const,
	wardang: [at(73), at(82)] as const,
	samap: [at(82), at(88)] as const,
	ceremony: [at(88), at(94)] as const,
	wadots: [at(94), at(99)] as const,
	bar: [at(99), at(102)] as const,
	score: [at(102), 62.0] as const,
};
export type ShotKey = keyof typeof S;
