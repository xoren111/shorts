import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {ATLAS_FPS, DURATION, FPS} from '../lib/time';
import {clamp01, lerp} from './gfx';

// Atlas = one rig scene for the whole VO (~/shorts/orangutan/scenes/volcano_short.json), exported as RGBA frames
// 1800×1400 with the rig root at (820, 1350), scale 1.5 → public/atlas/f_NNNNN.webp. Here we only place it.
const ROOT_X = 820;
const ROOT_Y = 1350;
const IMG_W = 1800;
const IMG_H = 1400;

/** an appearance: root screen position (x, y) and scale s (1 = export scale); enters/leaves by sliding from `from` */
export type AtlasWin = {t0: number; t1: number; x: number; y: number; s: number; from?: 'bottom' | 'left'; tin?: number; tout?: number; to?: {x: number; y: number; s: number; at: number; dur: number}};

export const AtlasLayer: React.FC<{wins: AtlasWin[]}> = ({wins}) => {
	const f = useCurrentFrame();
	const t = f / FPS;
	const w = wins.find((x) => t >= x.t0 && t < x.t1);
	if (!w) return null;
	const tin = w.tin ?? 0.28;
	const tout = w.tout ?? 0.22;
	const ki = tin <= 0 ? 1 : clamp01((t - w.t0) / tin);
	const ko = tout <= 0 ? 1 : clamp01((w.t1 - t) / tout);
	// overshoot on entry, ease-in on exit
	const eIn = ki >= 1 ? 1 : 1 + 2.4 * Math.pow(ki - 1, 3) + 1.4 * Math.pow(ki - 1, 2);
	const eOut = ko * ko;
	const k = Math.min(eIn, eOut);
	let x = w.x;
	let y = w.y;
	let s = w.s;
	if (w.to) {
		const m = clamp01((t - w.to.at) / w.to.dur);
		const e = m < 0.5 ? 4 * m * m * m : 1 - Math.pow(-2 * m + 2, 3) / 2;
		x = lerp(x, w.to.x, e);
		y = lerp(y, w.to.y, e);
		s = lerp(s, w.to.s, e);
	}
	const hide = 1 - k;
	if (w.from === 'left') x -= hide * 700 * s;
	else y += hide * 1250 * s;
	// the rig export is a 30 fps sequence: at 60 fps each Atlas frame is held for two video frames
	const idx = Math.max(0, Math.min(Math.round(DURATION * ATLAS_FPS) - 1, Math.floor(t * ATLAS_FPS + 1e-6)));
	const src = staticFile(`atlas/f_${String(idx).padStart(5, '0')}.webp`);
	return (
		<div
			style={{
				position: 'absolute',
				left: x - ROOT_X * s,
				top: y - ROOT_Y * s,
				width: IMG_W * s,
				height: IMG_H * s,
				filter: 'drop-shadow(0 0 10px rgba(255,130,50,0.45)) drop-shadow(0 18px 30px rgba(10,0,30,0.55))',
			}}
		>
			<Img src={src} style={{width: '100%', height: '100%'}} />
		</div>
	);
};
