import React from 'react';
import {AbsoluteFill} from 'remotion';
import {W, WORDS, We} from './lib/time';
import {Chip, Label, useT, GOLD, TEAL} from './ui/gfx';
import {Bg} from './ui/draw';
import {Grain} from './ui/vox';
import {Kinetic, KINETIC_HOLD, type KineticProps} from './ui/kinetic';

// Kinetic-typography test (composition «KineticGallery», never published): every preset of src/ui/kinetic.tsx once, on a demo
// VO phrase replayed on the gallery's own clock (`shift`), plus a oneWord slam and an auto-fit stress test (13 words on a bright
// ground with the debug boxes: dashed = safe box, solid = fitted block). Slot k starts at the sum of the earlier slots; inside a
// slot the phrase starts PRE s in. Test stills (3 moments per preset):
//   node tools/stills.mjs --comp KineticGallery --t <times> --out out/stills/kinetic --cols 3
// Not checked as Short code by tools/kinetic_check.mjs (files ending in «Gallery.tsx» are tests: no subtitles, demo words).

type Slot = {name: string; bg: string; note: string; k: Omit<KineticProps, 'shift'>};

export const KG_SLOTS: Slot[] = [
	{name: 'pop', bg: 'navy', note: 'spring per word', k: {fromWord: 8, toWord: 14, preset: 'pop'}},
	{name: 'slam', bg: 'navy', note: 'drop · squash · impact frame', k: {fromWord: 15, toWord: 18, preset: 'slam'}},
	{name: 'slam · oneWord', bg: 'night', note: 'each word replaces the last', k: {fromWord: 21, toWord: 24, preset: 'slam', oneWord: true, zone: 'center', display: {21: '3'}}},
	{name: 'stack', bg: 'parchment', note: 'lines fill the width', k: {fromWord: 15, toWord: 20, preset: 'stack', zone: 'center'}},
	{name: 'maskRise', bg: 'navy', note: 'rise out of a mask', k: {fromWord: 0, toWord: 7, preset: 'maskRise'}},
	{name: 'typewriter', bg: 'chart', note: 'chars over the spoken word', k: {fromWord: 8, toWord: 14, preset: 'typewriter'}},
	{name: 'punchKey', bg: 'navy', note: 'only the key word punches', k: {fromWord: 21, toWord: 24, preset: 'punchKey', zone: 'center'}},
	{name: 'auto-fit', bg: 'parchment', note: 'thirteen words · x 468 · width 840', k: {fromWord: 8, toWord: 20, preset: 'pop', maxLines: 4, x: 468, maxWidth: 840, zone: 'center', debug: true}},
];

const PRE = 0.3;
const POST = 0.4;

/** the slots need demo words 0–24 (template demo VO); a project with a shorter data/words.json gets 1 s empty slots instead of a
 * crash at import time (Root.tsx bundles every composition, the Short included) */
const HAVE = WORDS.length > 24;

/** start (s), phrase shift and end of every slot on the gallery clock */
export const KG_TIMES = (() => {
	let at = 0;
	return KG_SLOTS.map((s) => {
		const start = at;
		const shift = HAVE ? start + PRE - W(s.k.fromWord) : 0;
		at = HAVE ? start + PRE + (We(s.k.toWord) - W(s.k.fromWord)) + (s.k.hold ?? KINETIC_HOLD) + POST : start + 1;
		return {start, shift, end: at};
	});
})();

export const KINETIC_GALLERY_S = KG_TIMES[KG_TIMES.length - 1].end;

export const KineticGallery: React.FC = () => {
	const t = useT();
	const idx = Math.max(0, KG_TIMES.findIndex((x) => t >= x.start && t < x.end));
	const s = KG_SLOTS[idx];
	const g = KG_TIMES[idx];
	return (
		<AbsoluteFill style={{background: '#08060c'}}>
			<Bg kind={s.bg} t={t} />
			<Chip text={`kinetic · ${s.name}`} t0={g.start} t1={g.end} x={60} y={170} color={idx % 2 ? TEAL : GOLD} fg="#fff" />
			{HAVE ? <Kinetic key={idx} {...s.k} shift={g.shift} /> : null}
			<Label text={s.note} t0={g.start + 0.1} t1={g.end} x={540} y={1300} size={44} />
			<Grain opacity={0.07} />
		</AbsoluteFill>
	);
};
