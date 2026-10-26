import React from 'react';
import {MONT} from '../fonts';
import {WORDS} from '../lib/time';
import {GOLD, INK, TEAL, clamp01, pop, stroke, useT} from './gfx';

// Word-by-word captions: 1–3 words per group (break at punctuation), each word appears when it is spoken.
// Keywords (by word index) gold, water words teal. Centred on the frame (x = 540), shown ONLY while the group is being spoken
// (until the last word ends + 0.15 s) — nothing on screen in the pauses. Safe zone: never in the bottom 15 %.

// «Australia vs Rabbits»: one keyword per phrase in gold, the oceans in teal
const GOLD_W = new Set([0, 9, 16, 17, 19, 21, 28, 30, 34, 43, 48, 53, 60, 65, 72, 77, 81, 83, 87, 93, 97, 101, 112, 117]);
const TEAL_W = new Set([54, 56]);
// words followed by «…» or «—» in voiceover.txt (the aligner drops those marks): a new caption group starts after them
const BREAK_AFTER = new Set<number>([]);

export type Group = {from: number; to: number; words: number[]};

const clean = (w: string) => w.replace(/[.,;:—…]+$/g, '').replace(/^[—…]+/, '');

export const GROUPS: Group[] = (() => {
	const gs: Group[] = [];
	let cur: number[] = [];
	const flush = () => {
		if (cur.length) gs.push({from: WORDS[cur[0]].s, to: 0, words: cur});
		cur = [];
	};
	WORDS.forEach((w, i) => {
		cur.push(i);
		const chars = cur.map((k) => clean(WORDS[k].w)).join(' ').length;
		const punct = /[.,?!:—…]$/.test(w.w);
		const next = WORDS[i + 1];
		const gap = next ? next.s - w.e : 9;
		if (punct || BREAK_AFTER.has(i) || cur.length >= 3 || chars >= 14 || gap > 0.35) flush();
	});
	flush();
	for (let k = 0; k < gs.length; k++) {
		const last = WORDS[gs[k].words[gs[k].words.length - 1]];
		const nextFrom = k + 1 < gs.length ? gs[k + 1].from : 99;
		gs[k].to = Math.min(nextFrom - 0.02, last.e + 0.15);
	}
	return gs;
})();

export const Subtitles: React.FC<{y: (t: number) => number; hidden?: (t: number) => boolean}> = ({y, hidden}) => {
	const t = useT();
	if (hidden?.(t)) return null;
	const g = GROUPS.find((x) => t >= x.from - 0.03 && t < x.to);
	if (!g) return null;
	const gi = GROUPS.indexOf(g);
	const hasNext = gi + 1 < GROUPS.length && GROUPS[gi + 1].from - g.to < 0.05;
	const out = hasNext ? 1 : clamp01((g.to - t) / 0.08);
	return (
		<div
			style={{
				position: 'absolute',
				left: 90,
				width: 900,
				top: y(t),
				transform: 'translateY(-50%)',
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				alignItems: 'center',
				columnGap: 26,
				rowGap: 0,
				opacity: out * 0.92,
			}}
		>
			{g.words.map((i) => {
				const w = WORDS[i];
				if (t < w.s - 0.03) return <span key={i} style={{display: 'none'}} />;
				const k = pop(t, w.s - 0.03, 0.22);
				const active = t >= w.s && t < w.e + 0.05;
				const col = TEAL_W.has(i) ? TEAL : GOLD_W.has(i) ? GOLD : '#FFFFFF';
				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							fontFamily: MONT,
							fontWeight: 900,
							fontSize: 54,
							lineHeight: 1.1,
							textTransform: 'uppercase',
							color: col,
							...stroke(9),
							textShadow: `0 4px 0 ${INK}, 0 0 16px rgba(0,0,0,0.5)`,
							transform: `scale(${(0.6 + 0.4 * k) * (active ? 1.03 : 1)}) rotate(${(1 - k) * -6}deg)`,
							letterSpacing: 0,
						}}
					>
						{clean(w.w)}
					</span>
				);
			})}
		</div>
	);
};
