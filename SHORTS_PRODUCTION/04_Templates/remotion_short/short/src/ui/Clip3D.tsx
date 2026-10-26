import React, {useEffect, useState} from 'react';
import {Img, cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {clamp01, pop, useT} from './gfx';

// 3D inserts = RGBA frame sequences rendered by tools/blender/shot.py into public/3d/<name>/ (f_0001.png … + meta.json;
// tools/blender/README.md). Same file naming as ImgSeq (gfx.tsx): a full-frame insert that just holds its last frame can also be
// <ImgSeq dir="3d/<name>" ext="png" fps={30} n={…} …/>. Clip3D adds what ImgSeq lacks: fps / frame count / size from meta.json,
// loop and ping-pong, placement and size in the 1080 × 1920 frame, pop-in / fade and a drop shadow for collage scenes.
//   <Clip3D name="coin" t0={W(5)} t1={W(9)} y={820} w={760} />        spins in place (loop shot → mode «loop» by default)
//   <Clip3D name="globe" t0={W(12)} fill enter="none" />              full-frame shot, holds its last frame
// Standard: one insert = one visual event; a held last frame is static (level gap limit); 3D is for objects, maps and 3D text —
// never smoke / fire built from spheres (E5); Atlas is never 3D (shot.py refuses Atlas files and names).

export type Meta3D = {name: string; fps: number; frames: number; loop?: boolean; ext?: string; size?: [number, number]; width: number; height: number};
const META = new Map<string, Meta3D>();

/** meta.json of a sequence folder, loaded once per folder (rendering waits for it via delayRender) */
const useMeta3D = (dir: string, skip: boolean): Meta3D | null => {
	const [meta, setMeta] = useState<Meta3D | null>(() => META.get(dir) ?? null);
	const [handle] = useState(() => (skip || META.has(dir) ? null : delayRender(`Clip3D: public/${dir}/meta.json`)));
	useEffect(() => {
		if (handle === null) return;
		fetch(staticFile(`${dir}/meta.json`))
			.then((r) => {
				if (!r.ok) throw new Error(`Clip3D: public/${dir}/meta.json missing — render it: tools/blender/run.sh tools/blender/shot.py -- <spec.json>`);
				return r.json();
			})
			.then((m: Meta3D) => {
				META.set(dir, m);
				setMeta(m);
				continueRender(handle);
			})
			.catch((e) => cancelRender(e));
	}, [dir, handle]);
	return meta;
};

export type Clip3DProps = {
	/** folder public/3d/<name> (shot.py «name») */
	name: string;
	/** first frame of the sequence plays at t0 (s); nothing is drawn before t0 or after t1 */
	t0: number;
	t1?: number;
	/** another folder under public/ instead of 3d/<name> */
	dir?: string;
	/** overrides of meta.json; with n given, meta.json is not fetched (then give w or fill, and fps / ext if not 30 / png) */
	n?: number;
	fps?: number;
	ext?: 'png' | 'webp';
	/** after the last frame: hold it, loop, ping-pong, or vanish (once). Default: loop for shots rendered with "loop", else hold */
	mode?: 'hold' | 'loop' | 'pingpong' | 'once';
	/** playback speed (0.5 = half speed) and the 0-based frame the playback starts on */
	rate?: number;
	start?: number;
	/** centre in the 1080 × 1920 frame, width in px (height follows the shot's aspect; or give h); fill = cover the whole frame */
	x?: number;
	y?: number;
	w?: number;
	h?: number;
	fill?: boolean;
	rot?: number;
	flip?: boolean;
	/** entrance: pop (overshoot scale), fade, none; inDur / outDur in s (fade-out only when t1 is set) */
	enter?: 'pop' | 'fade' | 'none';
	inDur?: number;
	outDur?: number;
	/** drop shadow under the object: true = channel default, string = CSS drop-shadow(…) list, false = none */
	shadow?: boolean | string;
	opacity?: number;
	style?: React.CSSProperties;
};

/** frame index (0-based) of a sequence of n frames for a raw index e, by playback mode; null = not drawn */
export const frameOf = (e: number, n: number, mode: NonNullable<Clip3DProps['mode']>): number | null => {
	if (n <= 0) return null;
	switch (mode) {
		case 'loop':
			return ((e % n) + n) % n;
		case 'pingpong': {
			const p = Math.max(1, 2 * n - 2);
			const m = ((e % p) + p) % p;
			return m < n ? m : p - m;
		}
		case 'once':
			return e >= n ? null : Math.max(0, e);
		default:
			return Math.max(0, Math.min(n - 1, e));
	}
};

export const Clip3D: React.FC<Clip3DProps> = ({
	name, t0, t1, dir: dirIn, n: nIn, fps: fpsIn, ext: extIn, mode: modeIn, rate = 1, start = 0,
	x = 540, y = 960, w, h, fill, rot = 0, flip, enter = 'pop', inDur, outDur = 0.15, shadow = true, opacity = 1, style,
}) => {
	const t = useT();
	const dir = dirIn ?? `3d/${name}`;
	const meta = useMeta3D(dir, nIn !== undefined);
	if (t < t0 || (t1 !== undefined && t > t1)) return null;
	if (!meta && nIn === undefined) return null;
	const n = nIn ?? meta!.frames;
	const fps = fpsIn ?? meta?.fps ?? 30;
	const ext = extIn ?? meta?.ext ?? 'png';
	const mode = modeIn ?? (meta?.loop ? 'loop' : 'hold');
	const k = frameOf(Math.floor((t - t0) * fps * rate + 1e-6) + start, n, mode);
	if (k === null) return null;
	const src = staticFile(`${dir}/f_${String(k + 1).padStart(4, '0')}.${ext}`);

	const dIn = inDur ?? (enter === 'pop' ? 0.35 : 0.2);
	const kIn = enter === 'pop' ? pop(t, t0, dIn) : 1;
	const aIn = enter === 'none' ? 1 : enter === 'pop' ? clamp01((t - t0) / 0.08) : clamp01((t - t0) / dIn);
	const aOut = t1 !== undefined && outDur > 0 ? clamp01((t1 - t) / outDur) : 1;
	const drop = shadow === true ? 'drop-shadow(0 22px 28px rgba(10,0,30,0.55))' : shadow || undefined;
	const img: React.CSSProperties = {width: '100%', height: '100%', display: 'block', objectFit: fill ? 'cover' : 'fill'};

	if (fill) {
		return (
			<div style={{position: 'absolute', inset: 0, opacity: opacity * aIn * aOut, transform: kIn !== 1 ? `scale(${0.9 + 0.1 * kIn})` : undefined, ...style}}>
				<Img src={src} style={img} pauseWhenLoading />
			</div>
		);
	}
	const [lw, lh] = meta?.size ?? [meta?.width ?? 1080, meta?.height ?? 1080];
	const W = w ?? (h !== undefined ? (h * lw) / lh : lw);
	const H = h ?? (W * lh) / lw;
	return (
		<div style={{position: 'absolute', left: x - W / 2, top: y - H / 2, width: W, height: H, opacity: opacity * aIn * aOut,
			transform: `rotate(${rot}deg) scale(${kIn})${flip ? ' scaleX(-1)' : ''}`, transformOrigin: '50% 50%', filter: drop, ...style}}>
			<Img src={src} style={img} pauseWhenLoading />
		</div>
	);
};
