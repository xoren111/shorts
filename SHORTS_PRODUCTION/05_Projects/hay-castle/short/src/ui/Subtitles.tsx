import React from 'react';
import project from '../../project.json';
import {MONT} from '../fonts';
import {WORDS_VO as WORDS} from '../lib/time';
import {GOLD, INK, TEAL, clamp01, pop, stroke, useT} from './gfx';
import {BEATS} from '../data/beats';

// Word-by-word captions: 1–3 words per group (break at punctuation), each word appears when it is spoken.
// Keywords (by word index) in the accent colour GOLD (orange since 24.10, T5), water words teal. Centred on the frame (x = 540), shown ONLY while the group is being spoken
// (until the last word ends + 0.15 s) — nothing on screen in the pauses. Safe zone: never in the bottom 15 %.

// per Short in project.json: gold_words = one keyword per phrase (word indices of data/words.json), teal_words = «water» words,
// break_after = words followed by «…» or «—» in voiceover.txt (the aligner drops those marks): a new caption group starts after them
const GOLD_W = new Set<number>(project.gold_words as number[]);
const TEAL_W = new Set<number>(project.teal_words as number[]);
const BREAK_AFTER = new Set<number>(project.break_after as number[]);

export type Group = {from: number; to: number; words: number[]};

/** a straw bale as a caption-sized pictogram (the word «hay» is never shown as text in hay-castle) */
const BalePicto: React.FC = () => (
	<svg width={104} height={58} viewBox="-56 -32 112 64" style={{display: 'block', overflow: 'visible'}}>
		<rect x={-50} y={-25} width={100} height={50} rx={8} fill="#E7C266" stroke={INK} strokeWidth={6} />
		<rect x={-46} y={-21} width={92} height={11} rx={5} fill="#F7E0A0" />
		{[-30, -12, 6, 24].map((x) => (
			<path key={x} d={`M${x},-8 Q${x + 3},6 ${x - 2},20`} stroke="#B98E3C" strokeWidth={3} fill="none" />
		))}
		{[-17, 17].map((x) => (
			<g key={x}>
				<line x1={x} y1={-25} x2={x} y2={25} stroke={INK} strokeWidth={8} />
				<line x1={x} y1={-25} x2={x} y2={25} stroke="#2F6DB5" strokeWidth={4} />
			</g>
		))}
		{[-38, -6, 30].map((x, j) => (
			<line key={x} x1={x} y1={-25} x2={x + (j - 1) * 5} y2={-36} stroke="#F7E0A0" strokeWidth={4} strokeLinecap="round" />
		))}
	</svg>
);

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

/**
 * hidden(t) = no caption at time t; skip(i) = word i is never captioned (its phrase is shown big: project.hide_subs, T6) — a caption
 * group that straddles the edge of a hidden range shows only its other words, so a word shown big never comes back as a subtitle.
 */
export const Subtitles: React.FC<{y: (t: number) => number; hidden?: (t: number) => boolean; skip?: (i: number) => boolean}> = ({y, hidden, skip}) => {
	const t = useT();
	if (hidden?.(t)) return null;
	const g = GROUPS.find((x) => t >= x.from - 0.03 && t < x.to);
	if (!g || (skip && g.words.every(skip))) return null;
	const gi = GROUPS.indexOf(g);
	const hasNext = gi + 1 < GROUPS.length && GROUPS[gi + 1].from - g.to < 0.05;
	const out = hasNext ? 1 : clamp01((g.to - t) / 0.08);
	// hay-castle: beats flagged `scrim` (light / busy ground under the caption band) put the words on a dark pill
	const scrim = BEATS.some((b) => b.scrim && t >= b.t0 && t < b.t1);
	if (!g.words.some((i) => t >= WORDS[i].s - 0.03 && !skip?.(i))) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 90,
				width: 900,
				top: y(t),
				transform: 'translateY(-50%)',
				display: 'flex',
				justifyContent: 'center',
				opacity: out * 0.92,
			}}
		>
			<div
				style={{
					display: 'inline-flex',
					flexWrap: 'wrap',
					justifyContent: 'center',
					alignItems: 'center',
					columnGap: 26,
					rowGap: 0,
					...(scrim ? {padding: '6px 30px 10px', borderRadius: 36, background: 'rgba(10,16,30,0.66)', boxShadow: '0 6px 24px rgba(0,0,0,0.35)'} : {}),
				}}
			>
			{g.words.map((i) => {
				const w = WORDS[i];
				if (t < w.s - 0.03 || skip?.(i)) return <span key={i} style={{display: 'none'}} />;
				const k = pop(t, w.s - 0.03, 0.22);
				const active = t >= w.s && t < w.e + 0.05;
				const col = TEAL_W.has(i) ? TEAL : GOLD_W.has(i) ? GOLD : '#FFFFFF';
				// hay-castle hard rule: the word «hay» is never written — it shows as a small straw-bale pictogram
				if (clean(w.w).toLowerCase() === 'hay')
					return (
						<span key={i} style={{display: 'inline-block', transform: `scale(${(0.6 + 0.4 * k) * (active ? 1.06 : 1)}) translateY(${(1 - k) * 18}px)`, filter: 'drop-shadow(0 4px 0 #120818) drop-shadow(0 0 12px rgba(0,0,0,0.7))'}}>
							<BalePicto />
						</span>
					);
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
							textShadow: `0 4px 0 ${INK}, 0 0 16px rgba(0,0,0,0.8), 0 0 34px rgba(0,0,0,0.5)`,
							transform: `scale(${(0.6 + 0.4 * k) * (active ? 1.03 : 1)}) translateY(${(1 - k) * 18}px)`,   // straight, no tilt (owner 24.10)
							letterSpacing: 0,
						}}
					>
						{clean(w.w)}
					</span>
				);
			})}
			</div>
		</div>
	);
};
