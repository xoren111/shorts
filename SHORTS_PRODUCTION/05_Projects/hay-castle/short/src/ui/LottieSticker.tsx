import React, {useEffect, useLayoutEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender, Freeze, staticFile} from 'remotion';
import {Lottie, type LottieAnimationData} from '@remotion/lottie';
import {clamp01, pop, useT} from './gfx';

// Lottie sticker over a scene (reaction emoji, pointer, alert) played by @remotion/lottie from public/lottie/<file>.json.
//   <LottieSticker src="lottie/<library file name>.json" t0={W(12)} t1={W(14)} x={760} y={520} size={240} />
// Timing is in seconds of the edit clock (W(i) = start of word i), like every other gfx component. The animation frame is
// computed here (offset, speed, loop / hold) and handed to <Lottie> through <Freeze>, so every frame is deterministic in any
// render order and the Lottie's own fps (fr) is respected even when it differs from the composition's 60 fps.
//
// Licence. The library Lotties (03_Assets/Animations/lottie, 20 Noto animated emoji, Google) are CC BY 4.0 — attribution is
// required (download log 02_Research/download_logs/graphics.json: attribution_required true; ASSET_LIBRARY 9.4 / 14.3):
//   • copy the file to public/lottie/ under its library name and add a CREDITS.md line per file, e.g.
//     - lottie/<library file name>.json — Noto Emoji Animation (Google), https://googlefonts.github.io/noto-emoji-animation/ — CC BY 4.0 — атрибуция обязательна
//   • ONE line in the video description, however many Noto emoji the Short uses:
//     Animated emoji: Noto Emoji Animation by Google, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
//     add «(modified)» when a file was recoloured, cropped, mirrored (flip) or retimed (speed ≠ 1, offset).
// Any other Lottie: only with a licence entry in the download log (LottieFiles = Lottie Simple License, Lordicon — not
// verified, not recommended) and never from the library quarantine folder (check.mjs checks names and sha256 of public/).
// Placement: stickers react, they never repeat the voice or the subtitle (T6); keep them inside the safe zone (x 48–887,
// y 288–1247) and off the subtitle band (centre y 1180–1300, R3).

/** one fetch per file and render tab */
const CACHE = new Map<string, Promise<LottieAnimationData>>();
const loadJson = (src: string) => {
	let p = CACHE.get(src);
	if (!p) {
		p = fetch(staticFile(src)).then((r) => {
			if (!r.ok) throw new Error(`LottieSticker: public/${src} → HTTP ${r.status} (copy it from 03_Assets/Animations/lottie and credit it)`);
			return r.json() as Promise<LottieAnimationData>;
		});
		p.catch(() => CACHE.delete(src));
		CACHE.set(src, p);
	}
	return p;
};

/** public/<src> as Lottie data; the frame waits (delayRender) until it is parsed AND <Lottie> has mounted with it */
export const useLottieData = (src: string): LottieAnimationData | null => {
	const [data, setData] = useState<LottieAnimationData | null>(null);
	const [handle] = useState(() => delayRender(`Lottie ${src}`, {timeoutInMilliseconds: 60000}));
	useEffect(() => {
		let live = true;
		loadJson(src)
			.then((d) => { if (live) setData(d); })
			.catch((e) => cancelRender(e));
		return () => { live = false; };
	}, [src]);
	// released after the commit that mounts <Lottie>: its own delayRender (DOMLoaded) runs first, in the child's layout effect,
	// so the page is never «ready» between the fetch and the first drawn Lottie frame
	useLayoutEffect(() => { if (data) continueRender(handle); }, [data, handle]);
	useEffect(() => () => continueRender(handle), [handle]);
	return data;
};

/** Lottie frame (relative to ip) at t seconds after the start, or null once a non-looping, non-holding sticker has ended */
export const lottieFrameAt = (data: LottieAnimationData, dt: number, speed = 1, loop = true, hold = true) => {
	const total = Math.max(1, Math.floor(data.op - (typeof data.ip === 'number' ? data.ip : 0)));
	const f = dt * speed * data.fr;
	if (loop) return ((f % total) + total) % total;
	if (f > total - 1 && !hold) return null;
	return Math.max(0, Math.min(total - 1, f));
};

export const LottieSticker: React.FC<{
	/** path under public/: lottie/<library file name>.json (keep the library name, CREDITS.md and check.mjs match it) */
	src: string;
	/** start / end (s, edit clock); without t1 a looping or holding sticker stays until its scene ends */
	t0: number;
	t1?: number;
	/** centre (px) and width (px); the height follows the Lottie's aspect (Noto: square) */
	x?: number;
	y?: number;
	size?: number;
	/** playback speed (1 = the Lottie's own fps) and start offset inside the animation (s) */
	speed?: number;
	offset?: number;
	/** loop (default true — Noto files loop seamlessly); loop false: plays once, then holds the last frame until t1 (hold) or ends */
	loop?: boolean;
	hold?: boolean;
	/** entrance pop (s, 0 = none), exit fade before t1 (s), tilt (deg), mirror, white sticker outline (px), drop shadow */
	popIn?: number;
	fadeOut?: number;
	rot?: number;
	flip?: boolean;
	outline?: number;
	shadow?: boolean;
	renderer?: 'svg' | 'canvas';
	style?: React.CSSProperties;
}> = ({src, t0, t1, x = 540, y = 760, size = 260, speed = 1, offset = 0, loop = true, hold = true, popIn = 0.3, fadeOut = 0.15, rot = 0, flip, outline = 0, shadow = true, renderer = 'svg', style}) => {
	const t = useT();
	const data = useLottieData(src);
	const PRE = 0.4; // mounted (invisible) this long before t0, so the studio preview never flashes an empty first frame
	if (!data || t < t0 - PRE || (t1 !== undefined && t >= t1)) return null;
	const lf = lottieFrameAt(data, Math.max(0, t - t0) + offset, speed, loop, hold);
	if (lf === null) return null;
	const live = t >= t0;
	const k = !live ? 0 : popIn > 0 ? pop(t, t0, popIn) : 1;
	const out = t1 !== undefined && fadeOut > 0 ? clamp01((t1 - t) / fadeOut) : 1;
	const w = size;
	const h = (size * data.h) / data.w;
	const o = outline;
	const filters = [
		o ? `drop-shadow(${o}px 0 0 #fff) drop-shadow(-${o}px 0 0 #fff) drop-shadow(0 ${o}px 0 #fff) drop-shadow(0 -${o}px 0 #fff)` : '',
		shadow ? 'drop-shadow(0 14px 22px rgba(10,0,30,0.55))' : '',
	].filter(Boolean).join(' ');
	return (
		<div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: live ? out : 0,
			transform: `scale(${k * (0.85 + 0.15 * out)}) rotate(${rot}deg)${flip ? ' scaleX(-1)' : ''}`, transformOrigin: '50% 60%',
			filter: filters || undefined, pointerEvents: 'none', ...style}}>
			<Freeze frame={lf}>
				<Lottie animationData={data} renderer={renderer} style={{width: '100%', height: '100%'}} />
			</Freeze>
		</div>
	);
};
