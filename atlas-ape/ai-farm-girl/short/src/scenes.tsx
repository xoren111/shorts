import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {FPS, W} from './lib/time';
import {ANTON, MONT} from './fonts';
import {Chip, GOLD, INK, KeyFact, LightLeak, PURPLE, PURPLE_D, YELLOW, clamp01, easeInOut, easeOut, h1, lerp, pop, useT} from './ui/gfx';
import {Look} from './ui/real';
import {RED, Torn, shake} from './ui/vox';
import MAP from './data/map.json';

// «He sold everything to meet her» scenes, one per beat (shot table: ../SCRIPT.md). Sources are MIXED (owner rule):
// 7 Flow key shots + 1 Veo clip (public/flow), Wikimedia Commons CC0 / CC BY-SA photos (public/archive), our own drawn
// graphics (phone UI, stamps, follower toasts, map, glitch, shop overlays), owner-approved meme clips. The twist (AI) waits
// for the radio. Owner 24.10: text stays straight (no tilted stickers); white + gold text everywhere, the yellow + purple
// look ONLY in the followers beat (owner: «тут эти цвета можешь оставить»).

export type SceneProps = {t0: number; t1: number};

const FW = 1080;
const FH = 1920;
/** set to true once public/flow/F1_veo.mp4 (Veo clip of the farm woman waving) is in */
export const HAS_VEO = true;

// ------------------------------------------------------------------------------------------------------------ camera
type Cam = {x: number; y: number; z: number};
const camRect = (c: Cam) => {
	const w = FW * c.z, h = FH * c.z;
	return {left: Math.min(0, Math.max(FW - w, FW / 2 - c.x * w)), top: Math.min(0, Math.max(FH - h, FH / 2 - c.y * h)), w, h};
};
export const camPt = (p: [number, number], c: Cam): [number, number] => {
	const r = camRect(c);
	return [r.left + p[0] * r.w, r.top + p[1] * r.h];
};
/** eased camera between keys; v = horizontal screen speed for motion blur on whips */
const camAt = (t: number, keys: (Cam & {t: number})[]) => {
	let i = 0;
	while (i < keys.length - 2 && t > keys[i + 1].t) i++;
	const a = keys[i], b = keys[i + 1];
	const u = clamp01((t - a.t) / (b.t - a.t));
	const e = easeInOut(u);
	const c = {x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: lerp(a.z, b.z, e)};
	const v = u > 0 && u < 1 ? (Math.abs(camRect(b).left - camRect(a).left) / (b.t - a.t)) * 1.5 * Math.sin(Math.PI * u) : 0;
	return {...c, v};
};
const CamImg: React.FC<{src: string; c: Cam & {v?: number}; grade?: string}> = ({src, c, grade = 'saturate(1.1) contrast(1.05)'}) => {
	const r = camRect(c);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<Img src={staticFile(src)} style={{position: 'absolute', left: r.left, top: r.top, width: r.w, height: r.h, objectFit: 'cover', filter: `${grade} blur(${Math.min(16, (c.v ?? 0) / 260)}px)`}} />
			<Look warm={0.06} vignette={0.32} />
		</AbsoluteFill>
	);
};

// --------------------------------------------------------------------------------------------------- small elements
/** red rubber «SOLD» stamp slamming at (x, y) */
const SoldStamp: React.FC<{t0: number; x: number; y: number; size?: number}> = ({t0, x, y, size = 96}) => {
	const t = useT();
	if (t < t0) return null;
	const k = clamp01((t - t0) / 0.1);
	const s = k < 1 ? lerp(2.6, 0.95, k * k) : 0.95 + 0.05 * easeOut((t - t0 - 0.1) / 0.2);
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${s})`, opacity: clamp01(k * 3),
			border: `9px solid ${RED}`, borderRadius: 14, padding: '2px 22px 0', color: RED, fontFamily: ANTON, fontSize: size, letterSpacing: 6, lineHeight: 1.1,
			background: 'rgba(255,240,235,0.82)', boxShadow: '0 8px 20px rgba(0,0,0,0.45)'}}>
			SOLD
		</div>
	);
};

/** hearts floating up from (x, y); rise = px/s, life = s */
const Hearts: React.FC<{t0: number; t1: number; x: number; y: number; n?: number; rate?: number; rise?: number; life?: number}> = ({t0, t1, x, y, n = 18, rate = 7, rise = 420, life = 2.2}) => {
	const t = useT();
	if (t < t0) return null;
	return (
		<svg width={FW} height={FH} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
			{Array.from({length: n}, (_, i) => {
				const born = t0 + i / rate;
				const a = t - born;
				if (a < 0 || a > life || born > t1) return null;
				const px = x + Math.sin(a * 3 + i) * 40 + (h1(i) - 0.5) * 120;
				const py = y - a * rise;
				const s = (0.6 + h1(i * 3.3) * 0.7) * pop(t, born, 0.3);
				const o = clamp01((life - a) / 0.6);
				const col = ['#ff3b5c', PURPLE, '#ff2e88', '#c9a0ff'][i % 4];
				return <path key={i} transform={`translate(${px},${py}) scale(${s * 2.2})`} opacity={o} fill={col} stroke="#fff" strokeWidth={1.2} d="M0,6 C-12,-4 -10,-14 -4,-14 C-1,-14 0,-11 0,-9 C0,-11 1,-14 4,-14 C10,-14 12,-4 0,6 Z" />;
			})}
		</svg>
	);
};

/** emoji sticker that pops in at (x, y) and bobs */
const Sticker: React.FC<{e: string; t0: number; t1: number; x: number; y: number; size?: number; rot?: number}> = ({e, t0, t1, x, y, size = 120, rot = 0}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.2) return null;
	const k = pop(t, t0, 0.32);
	return (
		<div style={{position: 'absolute', left: x, top: y + Math.sin((t - t0) * 4 + x) * 6, transform: `translate(-50%,-50%) rotate(${rot + Math.sin((t - t0) * 3) * 6}deg) scale(${k})`, opacity: clamp01((t1 + 0.2 - t) / 0.2),
			fontSize: size, lineHeight: 1, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))'}}>{e}</div>
	);
};

/** a straight pill button / tag: rises 40 px into place while it pops */
const Pill: React.FC<{text: string; t0: number; t1: number; x: number; y: number; bg?: string; fg?: string; size?: number}> = ({text, t0, t1, x, y, bg = GOLD, fg = INK, size = 52}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.2) return null;
	const k = pop(t, t0, 0.3);
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) translateY(${(1 - easeOut((t - t0) / 0.25)) * 40}px) scale(${k})`, opacity: clamp01((t1 + 0.2 - t) / 0.2),
			background: bg, color: fg, fontFamily: MONT, fontWeight: 900, fontSize: size, padding: '14px 34px 12px', borderRadius: 999, border: `5px solid ${INK}`,
			boxShadow: `0 8px 0 ${INK}, 0 14px 30px rgba(0,0,0,0.45)`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1}}>{text}</div>
	);
};

/** the farm woman's «video» (Veo clip when available, else the Flow still with a gentle handheld sway) */
const JessicaMedia: React.FC<{t0: number; still?: boolean}> = ({t0, still}) => {
	const t = useT();
	const sway = `translate(${Math.sin((t - t0) * 1.7) * 6}px, ${Math.cos((t - t0) * 1.3) * 5}px) rotate(${Math.sin((t - t0) * 1.1) * 0.6}deg) scale(1.06)`;
	if (HAS_VEO && !still) {
		return (
			<AbsoluteFill style={{transform: sway}}>
				<Sequence from={Math.round(t0 * FPS)} layout="none">
					<OffthreadVideo src={staticFile('flow/F1_veo.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
				</Sequence>
			</AbsoluteFill>
		);
	}
	return <Img src={staticFile('flow/F1_jessica.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: sway}} />;
};

/** a generic social-video phone UI (no brand): rounded bezel, top bar, right action column, name + follow at the bottom */
const PhoneUI: React.FC<{children: React.ReactNode; scale?: number; cx?: number; cy?: number; ui?: number; rot?: number}> = ({children, scale = 1, cx = 540, cy = 960, ui = 1, rot = 0}) => {
	const w = 1000, h = 1840;
	const icon = (d: React.ReactNode, y: number) => (
		<g transform={`translate(${w - 92}, ${y})`}>
			<circle r={44} fill="rgba(0,0,0,0.28)" />
			{d}
		</g>
	);
	return (
		<div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: `scale(${scale}) rotate(${rot}deg)`, borderRadius: 96, background: '#0b0b0f',
			boxShadow: '0 40px 90px rgba(0,0,0,0.65), inset 0 0 0 4px #2b2b33'}}>
			<div style={{position: 'absolute', inset: 22, borderRadius: 76, overflow: 'hidden', background: '#000'}}>
				{children}
				<svg width={w - 44} height={h - 44} style={{position: 'absolute', inset: 0, opacity: ui}}>
					<rect x={(w - 44) / 2 - 90} y={18} width={180} height={44} rx={22} fill="#000" />
					{icon(<path d="M0,14 C-22,-4 -18,-22 -7,-22 C-2,-22 0,-17 0,-14 C0,-17 2,-22 7,-22 C18,-22 22,-4 0,14 Z" fill="#ff3b5c" />, h * 0.52)}
					{icon(<path d="M-20,-16 h40 a6,6 0 0 1 6,6 v20 a6,6 0 0 1 -6,6 h-24 l-12,10 v-10 h-4 a6,6 0 0 1 -6,-6 v-20 a6,6 0 0 1 6,-6 Z" fill="#fff" />, h * 0.62)}
					{icon(<path d="M-4,-20 L22,0 L-4,20 V8 C-18,8 -24,14 -26,20 C-26,2 -18,-8 -4,-8 Z" fill="#fff" />, h * 0.72)}
					<rect x={0} y={h - 44 - 360} width={w - 44} height={360} fill="url(#fade)" />
					<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.6" /></linearGradient></defs>
				</svg>
				<div style={{position: 'absolute', left: 44, bottom: 120, opacity: ui, display: 'flex', alignItems: 'center', gap: 22}}>
					<div style={{width: 96, height: 96, borderRadius: 48, border: '5px solid #fff', backgroundImage: `url(${staticFile('flow/F1_jessica.jpg')})`, backgroundSize: '420%', backgroundPosition: '52% 47%'}} />
					<div style={{fontFamily: MONT, fontWeight: 900, fontSize: 50, color: '#fff', textShadow: '0 3px 10px rgba(0,0,0,0.6)'}}>Jéssica 🌾</div>
					<div style={{fontFamily: MONT, fontWeight: 900, fontSize: 36, color: '#fff', background: '#ff3b5c', borderRadius: 16, padding: '8px 22px'}}>Follow</div>
				</div>
			</div>
		</div>
	);
};

// ======================================================================================================== 1. SOLD
/** «This man sold everything he owned» — Flow: his tiny brick room at night; SOLD stamps slam on his few things */
const F2_ITEMS: {p: [number, number]; w: number}[] = [
	{p: [0.8, 0.25], w: W(0) + 0.02},      // fan (in frame from frame 0)
	{p: [0.11, 0.45], w: W(2)},            // TV
	{p: [0.27, 0.61], w: W(3)},            // guitar
	{p: [0.83, 0.8], w: W(5) - 0.1},       // toolbox
];
export const Sold: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	// motion in second 0–1 decides the swipe (viral median 23.6 on our metric): the push starts at full speed and accelerates
	// frame 0 = a fast crash-zoom out from his phone-lit face to the whole room, then a slow push back in
	const a = easeOut(clamp01((t - t0) / 0.55));
	const u = clamp01((t - t0 - 0.55) / (t1 - t0 - 0.25));
	const c = t - t0 < 0.55 ? {x: lerp(0.58, 0.5, a), y: lerp(0.4, 0.5, a), z: lerp(1.75, 1.05, a)} : {x: lerp(0.5, 0.42, u), y: lerp(0.5, 0.46, u), z: lerp(1.05, 1.5, Math.pow(u, 0.8))};
	const sh = shake(t, F2_ITEMS.map((i) => i.w), 38, 12);
	// every stamp also punches the camera in (decaying zoom kick)
	const kick = F2_ITEMS.reduce((m, it) => (t >= it.w ? m + 0.09 * Math.exp(-(t - it.w) * 8) : m), 0);
	return (
		<AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(${1.03 + kick})`}}>
			<CamImg src="flow/F2_room_night.jpg" c={c} />
			{F2_ITEMS.map((it, i) => {
				const [px, py] = camPt(it.p, c);
				// keep every stamp readable inside the frame while the camera pushes in (it may slide off its item a little)
				const x = Math.max(170, Math.min(910, px)), y = Math.max(230, Math.min(1560, py));
				return <SoldStamp key={i} t0={it.w} x={x} y={y} size={i === 1 ? 104 : 90} />;
			})}
		</AbsoluteFill>
	);
};

// ======================================================================================================== 2. FEED
/** «to meet the woman of his dreams. She was a widow with a farm, and she promised the right man a home.» — her video in a
 * phone (hearts), then the phone grows to full screen and the camera drifts to the farmhouse; a little home sticker */
export const PHONE_AT: [number, number] = [0.37, 0.49];
export const Feed: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const grow = easeInOut((t - W(13) + 0.1) / 0.55);
	const scale = lerp(0.8, 1.13, grow);
	const ui = 1 - clamp01((t - W(13)) / 0.5) * 0.65;
	const drift = easeInOut((t - W(19)) / 2.4);
	return (
		<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #3a2a55, #0c0716 70%)'}}>
			<PhoneUI scale={scale} ui={ui}>
				<AbsoluteFill style={{transform: `scale(${lerp(1, 1.25, drift)})`, transformOrigin: '72% 22%'}}>
					<JessicaMedia t0={t0} />
				</AbsoluteFill>
				<Look warm={0.05} vignette={0.2} />
			</PhoneUI>
			<Hearts t0={t0 + 0.2} t1={t1} x={900} y={1100} n={22} rate={8} />
			{/* her post caption, like a social video overlay (what she promised, not our words) */}
			<PostCaption t0={W(16) - 0.05} t1={t1} y={300} text="Widow 🌾 farm life" />
			<PostCaption t0={W(22) - 0.05} t1={t1} y={400} text="My home can be yours 💛" />
		</AbsoluteFill>
	);
};
/** her caption on the video: a white bar wipes open from the centre, the text rises inside it */
const PostCaption: React.FC<{t0: number; t1: number; y: number; text: string}> = ({t0, t1, y, text}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.2) return null;
	const k = easeOut((t - t0) / 0.2), r = easeOut((t - t0 - 0.03) / 0.2);
	return (
		<div style={{position: 'absolute', left: 540, top: y, transform: 'translate(-50%,-50%)', opacity: clamp01((t1 + 0.2 - t) / 0.2)}}>
			<div style={{position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.94)', borderRadius: 22, transform: `scaleX(${k})`, boxShadow: '0 10px 30px rgba(0,0,0,0.35)'}} />
			<div style={{position: 'relative', overflow: 'hidden', padding: '14px 34px 12px'}}>
				<div style={{color: INK, fontFamily: MONT, fontWeight: 800, fontSize: 52, whiteSpace: 'nowrap', transform: `translateY(${(1 - r) * 80}px)`}}>{text}</div>
			</div>
		</div>
	);
};

// =================================================================================================== 3. FOLLOWERS
/** «Three hundred thousand people followed her.» — owner 24.10: new people keep arriving (follower toasts with faces from the
 * crowd shot, faster and faster, the counter racing to 300,000), then the crowd: lots of people already following her */
export const WALL_AT = W(31) - 0.05;
const HANDLES = ['lucas.mendes', 'ana_paula.bh', 'joao.rocha', 'bia_santos', 'carlos.mg', 'fer.lima', 'marcos_r', 'juh.oliveira', 'rafa.bh',
	'pedro.alves', 'tati_souza', 'gui.martins', 'dani.costa', 'leo_ferreira', 'vivi.ribeiro'];
/** toast arrival times: one every 0.2 s at first, then faster and faster (the feed «floods») */
const TOASTS = (() => {
	const out: number[] = [];
	let at = W(28) - 0.02, gap = 0.2;
	while (at < WALL_AT - 0.03) {
		out.push(at);
		at += gap;
		gap = Math.max(0.05, gap * 0.8);
	}
	return out;
})();
const TOAST_H = 150, TOAST_GAP = 20, LIST_Y = 640, AV = 104;
/** where the newest toast's avatar sits: the crowd shot opens out of it */
const AV_AT: [number, number] = [90 + 30 + AV / 2, LIST_Y + TOAST_H / 2];
const PlusBadge: React.FC<{size: number}> = ({size}) => (
	<div style={{width: size, height: size, borderRadius: size / 2, background: PURPLE_D, color: YELLOW, fontFamily: MONT, fontWeight: 900, fontSize: size * 0.72, lineHeight: `${size * 0.98}px`,
		textAlign: 'center', boxShadow: `0 0 0 ${Math.round(size * 0.07)}px ${INK}, 0 6px 14px rgba(0,0,0,0.45)`}}>+</div>
);
const Toast: React.FC<{i: number; born: number; y: number}> = ({i, born, y}) => {
	const t = useT();
	const k = easeOut((t - born) / 0.16);
	return (
		<div style={{position: 'absolute', left: 90, top: y, width: 900, height: TOAST_H, transform: `scale(${lerp(0.9, 1, k)})`, opacity: clamp01(k * 2), background: 'rgba(255,255,255,0.97)', borderRadius: 36,
			boxShadow: '0 14px 30px rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', gap: 26, padding: '0 30px', boxSizing: 'border-box'}}>
			<Img src={staticFile(`fx/av_${String(i % 15).padStart(2, '0')}.png`)} style={{width: AV, height: AV, borderRadius: AV / 2, boxShadow: `0 0 0 5px ${PURPLE}`}} />
			<div style={{flex: 1, minWidth: 0}}>
				<div style={{fontFamily: MONT, fontWeight: 900, fontSize: 42, color: INK, whiteSpace: 'nowrap'}}>{HANDLES[i % HANDLES.length]}</div>
				<div style={{fontFamily: MONT, fontWeight: 700, fontSize: 32, color: '#6b6b7b', whiteSpace: 'nowrap'}}>started following you</div>
			</div>
			<PlusBadge size={72} />
		</div>
	);
};
/** faces of the crowd shot (px of F7_crowd.jpg, 1536 × 2752): a «+» pops over each — they all follow her */
const CROWD_HEADS: [number, number][] = [[385, 1560], [578, 1465], [765, 1580], [1085, 1535], [185, 1375], [950, 1280], [1210, 1280], [1430, 1580],
	[365, 1085], [605, 1075], [867, 1045], [1245, 1055], [1011, 1055], [1459, 1065], [300, 880], [700, 860], [1100, 850], [480, 760], [960, 740], [1340, 900]];
export const Followers: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const k = pop(t, t0 + 0.02, 0.3);
	const LAND = W(30) + 0.3;                                    // the counter lands on 300,000 at the end of «thousand»
	const roll = clamp01((t - W(28)) / (LAND - W(28)));
	const v = Math.round(300000 * Math.pow(roll, 2.2));          // slow start, then it floods
	const bump = 1 + 0.07 * Math.sin(Math.PI * clamp01((t - LAND) / 0.22));
	const step = TOAST_H + TOAST_GAP;
	// the whole list scrolls as one (no overlaps at any rate): P = toasts arrived so far, fractional while one slides in;
	// toast i sits (P − i − 1) slots below the top slot, so a new one slides down from under the header
	const P = TOASTS.reduce((m, b, j) => m + easeOut((t - b) / Math.min(0.16, ((TOASTS[j + 1] ?? b + 0.05) - b) * 0.95)), 0);
	// the crowd opens out of the newest avatar (circle reveal), then the camera pulls back over the whole crowd
	const rv = clamp01((t - WALL_AT) / 0.36);
	const rad = lerp(AV / 2, 2300, rv * rv);
	const e = easeOut((t - WALL_AT) / 1.3);
	const c = {x: 0.5, y: lerp(0.64, 0.55, e), z: lerp(1.75, 1.08, e)};
	return (
		<AbsoluteFill style={{background: '#0c0716', overflow: 'hidden'}}>
			{rv < 1 ? (
				<>
					<Img src={staticFile('flow/F1_jessica.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.4) saturate(1.3)', transform: 'scale(1.2)'}} />
					<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(122,43,232,0.35), rgba(12,7,22,0.2) 60%)'}} />
					<div style={{position: 'absolute', left: 0, top: 590, width: FW, height: FH - 590, overflow: 'hidden'}}>
						{TOASTS.map((b, i) => {
							if (t < b) return null;
							const y = LIST_Y - 590 + (P - i - 1) * step;
							return y < FH ? <Toast key={i} i={i} born={b} y={y} /> : null;
						})}
					</div>
					{/* her profile header with the counter */}
					<div style={{position: 'absolute', left: 90, top: 150, width: 900, height: 420, transform: `scale(${lerp(0.7, 1, k)})`, opacity: clamp01(k * 3), background: '#fff', borderRadius: 48,
						boxShadow: '0 30px 70px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: 40, padding: '0 50px', boxSizing: 'border-box'}}>
						<div style={{width: 210, height: 210, flex: 'none', borderRadius: 105, boxShadow: `0 0 0 9px ${PURPLE}`, backgroundImage: `url(${staticFile('flow/F1_jessica.jpg')})`, backgroundSize: '400%', backgroundPosition: '52% 46%'}} />
						<div>
							<div style={{fontFamily: MONT, fontWeight: 900, fontSize: 56, color: INK}}>Jéssica 🌾</div>
							<div style={{fontFamily: ANTON, fontSize: 150, color: INK, lineHeight: 1.05, transform: `scale(${bump})`, transformOrigin: '0 50%'}}>{v.toLocaleString('en-US')}</div>
							<div style={{fontFamily: MONT, fontWeight: 900, fontSize: 42, color: PURPLE_D, textTransform: 'uppercase', letterSpacing: 4}}>followers</div>
						</div>
					</div>
				</>
			) : null}
			{t >= WALL_AT ? (
				<AbsoluteFill style={{clipPath: `circle(${rad}px at ${AV_AT[0]}px ${AV_AT[1]}px)`}}>
					<CamImg src="flow/F7_crowd_j.jpg" c={c} grade="saturate(1.12) contrast(1.05)" />
					{CROWD_HEADS.map((p, j) => {
						const at = WALL_AT + 0.14 + j * 0.045;
						if (t < at) return null;
						const [x, y] = camPt([p[0] / 1536, p[1] / 2752], c);
						const s = pop(t, at, 0.28);
						return (
							<div key={j} style={{position: 'absolute', left: x, top: y - easeOut((t - at) / 0.6) * 30, transform: `translate(-50%,-50%) scale(${s * (j < 8 ? 1 : 0.75)})`, opacity: clamp01((at + 1.4 - t) / 0.3)}}>
								<PlusBadge size={70} />
							</div>
						);
					})}
					<Hearts t0={WALL_AT + 0.2} t1={t1} x={540} y={1700} n={30} rate={18} />
				</AbsoluteFill>
			) : null}
			{/* the reveal ring */}
			{rv > 0 && rv < 1 ? (
				<div style={{position: 'absolute', left: AV_AT[0] - rad, top: AV_AT[1] - rad, width: rad * 2, height: rad * 2, borderRadius: '50%', boxShadow: `0 0 0 10px ${PURPLE}, 0 0 50px 14px rgba(178,102,255,0.6)`}} />
			) : null}
		</AbsoluteFill>
	);
};

// ======================================================================================================== 4. WENT
/** «He actually went.» — Flow: him on the night bus; meme-style dramatic zoom on «actually» and «went» */
export const Went: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const z1 = easeOut((t - W(35)) / 0.18), z2 = easeOut((t - W(36)) / 0.18);
	const c = {x: 0.6, y: lerp(0.45, 0.36, z1), z: 1.04 + 0.34 * z1 + 0.45 * z2};
	const sh = shake(t, [W(35), W(36)], 18, 1.5);
	return (
		<AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
			<CamImg src="flow/F3_bus_night.jpg" c={c} grade={`saturate(${1.1 + z2 * 0.2}) contrast(${1.05 + z2 * 0.1})`} />
			<AbsoluteFill style={{background: `radial-gradient(ellipse 60% 45% at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,${0.15 + 0.5 * z2}) 100%)`}} />
		</AbsoluteFill>
	);
};

// ======================================================================================================== 5. ROUTE
/** «After two days on a bus,» — drawn map of Brazil; the route Imperatriz → Belo Horizonte draws with a bus; real photos at
 * both ends (Commons: the IMPERATRIZ letters, the Belo Horizonte bus terminal) */
const CITY = MAP.cities as unknown as Record<string, [number, number]>;
export const MAP_BH = CITY['Belo Horizonte'];
export const Route: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const A = CITY['Imperatriz'], B = CITY['Belo Horizonte'];
	const z = lerp(1.25, 1.55, easeInOut((t - t0) / (t1 - t0 + 0.4)));
	const cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2;
	const tr = `translate(${540 - cx * z}px, ${880 - cy * z}px) scale(${z})`;
	const p = easeInOut((t - W(37) - 0.05) / 1.0);
	const ctrl: [number, number] = [A[0] + 120, (A[1] + B[1]) / 2];
	const q = (u: number): [number, number] => [(1 - u) ** 2 * A[0] + 2 * (1 - u) * u * ctrl[0] + u * u * B[0], (1 - u) ** 2 * A[1] + 2 * (1 - u) * u * ctrl[1] + u * u * B[1]];
	const pts = Array.from({length: 41}, (_, i) => q((i / 40) * p));
	const d = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
	const bus = q(p);
	const scr = (pt: [number, number]): [number, number] => [540 + (pt[0] - cx) * z, 880 + (pt[1] - cy) * z];
	const sa = scr(A), sb = scr(B), sbus = scr(bus);
	return (
		<AbsoluteFill style={{background: 'linear-gradient(180deg, #0e2a47, #0a1a2e)'}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: FW, height: FH, transformOrigin: '0 0', transform: tr}}>
				<svg width={FW} height={FH} style={{overflow: 'visible'}}>
					{(MAP.countries as {iso: string; d: string}[]).map((c) => (
						<path key={c.iso} d={c.d} fill={c.iso === 'BRA' ? '#2f9e5a' : '#22405c'} stroke={c.iso === 'BRA' ? '#d8f3dc' : '#3b5f80'} strokeWidth={c.iso === 'BRA' ? 2.2 / z : 1.4 / z} />
					))}
					<path d={d} fill="none" stroke={INK} strokeWidth={13 / z} strokeLinecap="round" />
					<path d={d} fill="none" stroke={GOLD} strokeWidth={7 / z} strokeLinecap="round" strokeDasharray={`${18 / z} ${12 / z}`} />
				</svg>
			</div>
			{[['Imperatriz', sa, -1], ['Belo Horizonte', sb, 1]].map(([n, s, side]) => (
				<div key={n as string} style={{position: 'absolute', left: (s as number[])[0], top: (s as number[])[1]}}>
					<div style={{position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 14, background: '#fff', border: `6px solid ${INK}`}} />
					<div style={{position: 'absolute', left: (side as number) < 0 ? -30 : 30, top: -26, transform: (side as number) < 0 ? 'translateX(-100%)' : undefined, fontFamily: MONT, fontWeight: 900, fontSize: 40, color: '#fff', whiteSpace: 'nowrap',
						textShadow: `-2px -2px 0 ${INK}, 2px 2px 0 ${INK}, 0 4px 10px rgba(0,0,0,0.6)`}}>{n as string}</div>
				</div>
			))}
			<div style={{position: 'absolute', left: sbus[0], top: sbus[1], transform: `translate(-50%,-60%) scale(${pop(t, W(37), 0.3)})`, fontSize: 84}}>🚌</div>
			<Torn t0={t0 + 0.05} cx={800} cy={540} w={420} h={300} rot={5} seed={61}>
				<Img src={staticFile('archive/imperatriz_sign.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '62% 64%', transform: 'scale(1.25)', transformOrigin: '62% 64%'}} />
			</Torn>
			<Torn t0={W(42) - 0.2} cx={300} cy={1320} w={440} h={310} rot={-4} seed={62}>
				<Img src={staticFile('archive/bh_bus_terminal_exit.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '30% 50%'}} />
			</Torn>
			<KeyFact value="2,000+ km" sub="36+ hours by bus" t0={W(38) - 0.05} t1={t1 - 0.05} x={540} y={250} size={120} />
		</AbsoluteFill>
	);
};

// ===================================================================================================== 6. STRANGERS
/** «he showed her photo to strangers.» — Flow: on a Belo Horizonte street he holds out his phone; the passer-by shrugs */
export const Strangers: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const c = camAt(t, [{t: t0, x: 0.5, y: 0.48, z: 1.06}, {t: t1 + 0.4, x: 0.55, y: 0.45, z: 1.3}]);
	return (
		<AbsoluteFill>
			<CamImg src="flow/F4_street_photo.jpg" c={c} />
			<Chip text="Belo Horizonte" t0={t0 + 0.25} t1={t1 - 0.1} x={60} y={210} color={GOLD} />
		</AbsoluteFill>
	);
};

// ======================================================================================================== 7. NOBODY
/** «Nobody had ever seen her.» — her photo taped up over the real Belo Horizonte skyline (Commons CC0); shrugs pop around */
export const Nobody: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const pan = easeInOut((t - t0) / (t1 - t0 + 0.5));
	const n = 120, fps = 30, start = 0.25;
	const fi = Math.max(0, Math.min(n - 1, Math.floor((t - t0 + start) * fps)));
	const kin = easeOut((t - t0 - 0.05) / 0.3);
	return (
		<AbsoluteFill style={{background: '#0b1220'}}>
			<Img src={staticFile('archive/bh_skyline_aerial.jpg')} style={{position: 'absolute', top: 0, height: FH, left: lerp(0, -1700, pan), width: 'auto', filter: 'brightness(0.75) saturate(1.1)'}} />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(10,15,30,0.15), rgba(10,15,30,0.55))'}} />
			<Torn t0={t0} cx={300} cy={470} w={420} h={540} rot={-5} seed={71} from="drop">
				<Img src={staticFile('flow/F1_jessica.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 38%', transform: 'scale(1.35)', transformOrigin: '50% 40%'}} />
			</Torn>
			{/* Confused Travolta (Pulp Fiction meme, keyed green screen → public/memes/travolta) */}
			<div style={{position: 'absolute', left: -300 + (1 - kin) * 300, top: 470, width: 1920, height: 1080, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.55))'}}>
				<Img src={staticFile(`memes/travolta/f_${String(fi + 1).padStart(4, '0')}.png`)} style={{width: '100%', height: '100%'}} />
			</div>
		</AbsoluteFill>
	);
};

// ========================================================================================================= 8. RADIO
/** «So he asked a radio station for help. That's where he learned the truth:» — Flow: the radio studio; ON AIR lights up,
 * radio waves ripple out of the microphone; then a slow push into his stunned face, the room darkens */
export const Radio: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const c = camAt(t, [{t: t0, x: 0.5, y: 0.45, z: 1.04}, {t: W(62), x: 0.52, y: 0.43, z: 1.1}, {t: t1 + 0.3, x: 0.79, y: 0.43, z: 1.75}]);
	const on = clamp01((t - W(58) + 0.05) / 0.12) * (0.85 + 0.15 * Math.sin(t * 22));
	const dark = clamp01((t - W(64)) / 1.0) * 0.55;
	const lamp = camPt([0.77, 0.12], c);
	const mic = camPt([0.417, 0.465], c);
	return (
		<AbsoluteFill>
			<CamImg src="flow/F5_radio.jpg" c={c} />
			<div style={{position: 'absolute', left: lamp[0], top: lamp[1] + 120, transform: 'translate(-50%,-50%)', opacity: 1 - clamp01((t - W(62)) / 0.4),
				fontFamily: ANTON, fontSize: 70, letterSpacing: 6, padding: '6px 26px 2px', borderRadius: 14, border: `6px solid ${on > 0.1 ? '#ff4040' : '#552222'}`,
				color: on > 0.1 ? '#ffecec' : '#663333', background: on > 0.1 ? '#c81e1e' : '#2a0e0e', boxShadow: on > 0.1 ? `0 0 ${60 * on}px rgba(255,40,40,${0.9 * on})` : 'none'}}>ON AIR</div>
			{/* owner round 4: no big white bars — thin gold radio waves ripple out of the microphone while he asks for help */}
			<svg width={FW} height={FH} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: clamp01((t - W(58) + 0.05) / 0.25) * (1 - clamp01((t - W(62)) / 0.4)),
				filter: 'drop-shadow(0 0 10px rgba(255,200,58,0.85))'}}>
				{Array.from({length: 12}, (_, i) => {
					const age = t - (W(58) - 0.05 + i * 0.2);
					if (age < 0 || age > 1.0) return null;
					const r = 50 + easeOut(age) * 185;   // stays clear of both faces
					const arc = (a0: number, a1: number) => `M ${mic[0] + r * Math.cos(a0)} ${mic[1] + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${mic[0] + r * Math.cos(a1)} ${mic[1] + r * Math.sin(a1)}`;
					const o = (1 - age) * 0.95;
					return (
						<g key={i} fill="none" stroke={GOLD} strokeWidth={9 - age * 6} strokeLinecap="round" opacity={o}>
							<path d={arc(-0.7, 0.7)} />
							<path d={arc(Math.PI - 0.7, Math.PI + 0.7)} />
						</g>
					);
				})}
			</svg>
			<AbsoluteFill style={{background: `radial-gradient(ellipse 55% 40% at 50% 45%, rgba(0,0,0,0) 30%, rgba(0,0,0,${dark}) 100%)`}} />
		</AbsoluteFill>
	);
};

// ======================================================================================================== 9. REVEAL
/** «she was never real. She was made by AI.» — her video again, then it glitches (RGB split, sliced bands), breaks into
 * pixels (pre-rendered public/fx/jessica_px*.jpg) and the tiles fall away; MADE BY AI stamps in (subtitle steps aside) */
const PX = [8, 16, 32, 64, 128];
const GlitchBands: React.FC<{k: number; src: string}> = ({k, src}) => {
	const f = useCurrentFrame();
	const n = 14;
	return (
		<>
			{Array.from({length: n}, (_, i) => {
				const r = h1(i * 13.7 + Math.floor(f / 3) * 0.37);
				if (r > 0.35 + k * 0.5) return null;
				const top = (i / n) * FH, hh = FH / n * (0.6 + h1(i + f) * 0.8);
				const dx = (h1(i * 5.1 + f * 0.3) - 0.5) * 260 * k;
				return (
					<div key={i} style={{position: 'absolute', left: 0, top, width: FW, height: hh, overflow: 'hidden'}}>
						<Img src={staticFile(src)} style={{position: 'absolute', left: dx, top: -top, width: FW, height: FH, objectFit: 'cover', filter: i % 3 === 0 ? 'hue-rotate(90deg) saturate(2)' : undefined}} />
					</div>
				);
			})}
		</>
	);
};
export const Reveal: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const f = useCurrentFrame();
	const g1 = clamp01((t - W(70)) / 0.4);                 // flickers on «never»
	const burst = Math.exp(-Math.max(0, t - W(71)) * 4) * (t >= W(71) ? 1 : 0);
	const px = clamp01((t - W(72) + 0.05) / 0.9);         // pixelation on «She was made by AI»
	const fall = clamp01((t - W(76) - 0.1) / 0.7);
	const k = Math.min(1, g1 * 0.35 + burst * 1.0 + px * 0.6) * (1 - fall);
	const idx = Math.min(PX.length - 1, Math.floor(px * PX.length));
	const src = px > 0 ? `fx/jessica_px${PX[idx]}.jpg` : 'fx/jessica_veo_frame.jpg';
	const rgb = k * 26 * (0.6 + 0.4 * Math.sin(f * 1.7));
	const sh = shake(t, [W(71), W(74)], 26);
	const tile = 120, cols = Math.ceil(FW / tile), rows = Math.ceil(FH / tile);
	return (
		<AbsoluteFill style={{background: '#000', transform: `translate(${sh.x}px, ${sh.y}px)`}}>
			{fall <= 0 ? (
				<>
					<AbsoluteFill>{px > 0 ? <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <JessicaMedia t0={t0} />}</AbsoluteFill>
					{k > 0.02 ? (
						<>
							<AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.7, transform: `translateX(${rgb}px)`}}><Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(1) saturate(6) hue-rotate(-50deg)'}} /></AbsoluteFill>
							<AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.7, transform: `translateX(${-rgb}px)`}}><Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(1) saturate(6) hue-rotate(140deg)'}} /></AbsoluteFill>
							<GlitchBands k={k} src={src} />
						</>
					) : null}
				</>
			) : (
				Array.from({length: cols * rows}, (_, i) => {
					const cx = i % cols, cy = Math.floor(i / cols);
					const delay = h1(i * 1.37) * 0.35 + (1 - cy / rows) * 0.15;
					const a = clamp01((t - W(76) - 0.1 - delay) / 0.6);
					return (
						<div key={i} style={{position: 'absolute', left: cx * tile, top: cy * tile + a * a * 1600, width: tile, height: tile, transform: `rotate(${(h1(i) - 0.5) * 140 * a}deg) scale(${1 - a * 0.5})`, opacity: 1 - a,
							backgroundImage: `url(${staticFile('fx/jessica_px64.jpg')})`, backgroundSize: `${FW}px ${FH}px`, backgroundPosition: `${-cx * tile}px ${-cy * tile}px`}} />
					);
				})
			)}
			<AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 2px, transparent 2px, transparent 6px)', opacity: k * 0.8}} />
			<AbsoluteFill style={{background: '#fff', opacity: burst * 0.55, mixBlendMode: 'screen'}} />
			<RevealStamp t0={W(74) - 0.06} />
		</AbsoluteFill>
	);
};
const RevealStamp: React.FC<{t0: number}> = ({t0}) => {
	const t = useT();
	if (t < t0) return null;
	const k = clamp01((t - t0) / 0.1);
	const s = k < 1 ? lerp(2.8, 0.96, k * k) : 0.96 + 0.04 * easeOut((t - t0 - 0.1) / 0.2);
	const jit = Math.sin(t * 80) * 4 * Math.exp(-(t - t0) * 3);
	return (
		<div style={{position: 'absolute', left: 540 + jit, top: 930, transform: `translate(-50%,-50%) scale(${s})`, opacity: clamp01(k * 3), textAlign: 'center',
			border: `14px solid #ff2f4f`, borderRadius: 26, padding: '10px 40px 6px', background: 'rgba(20,0,8,0.55)', boxShadow: '0 0 60px rgba(255,47,79,0.6)'}}>
			<div style={{fontFamily: ANTON, fontSize: 120, color: '#fff', lineHeight: 1, letterSpacing: 4}}>MADE BY</div>
			<div style={{fontFamily: ANTON, fontSize: 250, color: '#ff2f4f', lineHeight: 0.95, letterSpacing: 10, textShadow: '6px 0 0 #00e5ff, -6px 0 0 #ff00aa'}}>AI</div>
		</div>
	);
};

// ======================================================================================================= 10. CREATOR
/** «Her creator says she was only there to sell stuff.» — her (pixel-glitched) picture in the phone is buried under shop
 * buttons; a cursor clicks SHOP NOW → Stonks rises OVER this shop frame (owner 24.10: not a separate cut) and money rains */
const CLICK = W(85) - 0.04;
export const Creator: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const items: [string, number, number, number, string, string][] = [
		['SHOP NOW', W(79) - 0.05, 540, 1250, GOLD, INK], ['BUY', W(82) - 0.05, 300, 560, '#7CFFB2', INK], ['LINK IN BIO 👇', W(83), 700, 420, '#fff', INK],
		['SALE', W(84), 820, 860, '#ff3b5c', INK]];
	const emo: [string, number, number, number][] = [['🛒', W(80), 220, 1080], ['🛍️', W(81), 840, 1110]];
	const cur = easeInOut((t - CLICK + 0.36) / 0.36);
	const press = t >= CLICK ? 1 - 0.15 * Math.exp(-(t - CLICK) * 10) : 1;
	return (
		<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #33204f, #0c0716 70%)'}}>
			<PhoneUI scale={0.94} ui={1}>
				<Img src={staticFile('fx/jessica_px16.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.3)'}} />
			</PhoneUI>
			{items.map(([s, at, x, y, bg, fg], i) => <Pill key={i} text={s} t0={at} t1={t1} x={x} y={y} bg={bg} fg={fg} size={i === 0 ? 64 : 48} />)}
			{emo.map(([e, at, x, y], i) => <Sticker key={i} e={e} t0={at} t1={t1} x={x} y={y} size={130} />)}
			{t > CLICK - 0.4 ? (
				<div style={{position: 'absolute', left: lerp(900, 600, cur), top: lerp(1600, 1290, cur), fontSize: 110, transform: `scale(${press})`, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.5))'}}>👆</div>
			) : null}
			{t >= CLICK + 0.04 ? <StonksOverlay t0={CLICK + 0.04} /> : null}
		</AbsoluteFill>
	);
};
/** the arrow of the Stonks meme, drawn in screen px (bottom-left → top-right, behind Meme Man) */
const ARROW: [number, number][] = [[30, 1520], [250, 1250], [370, 1350], [590, 980], [700, 1070], [960, 620]];
const ARROW_LEN = ARROW.slice(1).reduce((m, p, i) => m + Math.hypot(p[0] - ARROW[i][0], p[1] - ARROW[i][1]), 0);
const StonksOverlay: React.FC<{t0: number}> = ({t0}) => {
	const t = useT();
	const a = t - t0;
	const rise = easeOut(a / 0.3);
	const draw = easeOut((a - 0.04) / 0.34);
	const word = easeOut((a - 0.1) / 0.22);
	const pts = ARROW.map((p) => p.join(',')).join(' ');
	const [ex, ey] = ARROW[ARROW.length - 1], [px, py] = ARROW[ARROW.length - 2];
	const ang = (Math.atan2(ey - py, ex - px) * 180) / Math.PI;
	return (
		<>
			<AbsoluteFill style={{background: 'rgba(14,4,34,0.5)', opacity: clamp01(a / 0.15)}} />
			<svg width={FW} height={FH} style={{position: 'absolute', inset: 0}}>
				<polyline points={pts} fill="none" stroke={INK} strokeWidth={50} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={ARROW_LEN} strokeDashoffset={ARROW_LEN * (1 - draw)} />
				<polyline points={pts} fill="none" stroke="#3BE37F" strokeWidth={32} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={ARROW_LEN} strokeDashoffset={ARROW_LEN * (1 - draw)} style={{filter: 'drop-shadow(0 0 18px rgba(59,227,127,0.8))'}} />
				{draw > 0.97 ? (
					<g transform={`translate(${ex},${ey}) rotate(${ang}) scale(${pop(t, t0 + 0.38, 0.2)})`}>
						<path d="M 52,0 L -34,-56 L -34,56 Z" fill="#3BE37F" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
					</g>
				) : null}
			</svg>
			<MoneyRain t0={t0} />
			{/* Meme Man (Stonks meme, cut out → public/memes/meme_man.png) rises from the bottom */}
			<Img src={staticFile('memes/meme_man.png')} style={{position: 'absolute', left: 420, top: 972 + (1 - rise) * 980, width: 640, height: 945, filter: 'drop-shadow(0 0 30px rgba(255,200,58,0.45))'}} />
			<div style={{position: 'absolute', left: 540, top: 330, transform: 'translate(-50%,-50%)', overflow: 'hidden', padding: '0 30px 24px'}}>
				<div style={{fontFamily: ANTON, fontSize: 230, lineHeight: 1.05, letterSpacing: 6, color: '#fff', WebkitTextStroke: `14px ${INK}`, paintOrder: 'stroke fill', whiteSpace: 'nowrap',
					filter: `drop-shadow(0 12px 0 ${INK})`, transform: `translateY(${(1 - word) * 110}%)`}}>STONKS</div>
			</div>
		</>
	);
};
/** bills and money bags falling and fluttering over the whole frame */
const MoneyRain: React.FC<{t0: number; n?: number}> = ({t0, n = 28}) => {
	const t = useT();
	return (
		<>
			{Array.from({length: n}, (_, i) => {
				const born = t0 + h1(i * 2.3) * 0.45;
				const a = t - born;
				if (a < 0) return null;
				const y = -170 - h1(i * 9.1) * 420 + a * (1300 + h1(i * 5.7) * 900);
				if (y > FH + 200) return null;
				const x = 40 + h1(i * 3.3) * 1000 + Math.sin(a * 6 + i) * 45;
				const r = Math.sin(a * (5 + h1(i) * 4) + i) * 35 + (h1(i * 7) - 0.5) * 40;
				return (
					<div key={i} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${r}deg)`, fontSize: 90 + h1(i * 4.4) * 70, lineHeight: 1,
						filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.45))'}}>{i % 6 === 5 ? '💰' : '💵'}</div>
				);
			})}
		</>
	);
};

// =========================================================================================================== 11. END
/** «And him? Back home,» — Flow: on the bus by day, a hopeful smile, slow push in */
export const End: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const c = camAt(t, [{t: t0, x: 0.5, y: 0.4, z: 1.12}, {t: t1 + 0.5, x: 0.53, y: 0.32, z: 1.3}]);
	return (
		<AbsoluteFill>
			<CamImg src="flow/F6_bus_day.jpg" c={c} grade="saturate(1.12) contrast(1.04) brightness(1.03)" />
			<LightLeak t0={t0 + 0.2} dur={1.6} color="255,200,120" from={[1200, 200]} to={[-200, 1100]} strength={0.45} />
		</AbsoluteFill>
	);
};

/** «he said: "I'll find another one. Same place. I'm going again."» — owner round 6: ONE calm shot instead of fast cuts: the
 * green map; a heart pin drops on Belo Horizonte («he'll find love there»), hearts rise; «Same place» → it pulses and the camera
 * leans in; «I'm going again» → the route redraws and the bus sets off once more */
export const Again: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const A = CITY['Imperatriz'], B = CITY['Belo Horizonte'];
	const lean = easeInOut((t - W(97)) / 1.4);
	const z = lerp(1.35, 1.5, easeInOut((t - t0) / 1.8)) + 0.12 * lean;
	const cx = lerp((A[0] + B[0]) / 2, B[0], 0.25 * lean), cy = lerp((A[1] + B[1]) / 2, B[1], 0.25 * lean), CY0 = 640;
	const tr = `translate(${540 - cx * z}px, ${CY0 - cy * z}px) scale(${z})`;
	const scr = (pt: [number, number]): [number, number] => [540 + (pt[0] - cx) * z, CY0 + (pt[1] - cy) * z];
	const p = easeInOut((t - W(99) + 0.05) / 0.85);
	const ctrl: [number, number] = [A[0] + 120, (A[1] + B[1]) / 2];
	const q = (u: number): [number, number] => [(1 - u) ** 2 * A[0] + 2 * (1 - u) * u * ctrl[0] + u * u * B[0], (1 - u) ** 2 * A[1] + 2 * (1 - u) * u * ctrl[1] + u * u * B[1]];
	const d = Array.from({length: 41}, (_, i) => q((i / 40) * p)).map((pt, i) => `${i ? 'L' : 'M'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
	const sa = scr(A), sb = scr(B), sbus = scr(q(p));
	const PIN = W(93) - 0.02;
	const drop = t < PIN ? 0 : clamp01((t - PIN) / 0.24);
	const bounce = drop < 1 ? (1 - drop * drop) * -300 : Math.sin(Math.min(1, (t - PIN - 0.24) / 0.2) * Math.PI) * -22;
	const beat = [W(95), W(97)].reduce((m, s) => (t >= s ? m + 0.18 * Math.exp(-(t - s) * 7) : m), 0);   // the heart bumps
	return (
		<AbsoluteFill style={{background: 'linear-gradient(180deg, #0e2a47, #0a1a2e)'}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: FW, height: FH, transformOrigin: '0 0', transform: tr}}>
				<svg width={FW} height={FH} style={{overflow: 'visible'}}>
					{(MAP.countries as {iso: string; d: string}[]).map((c) => (
						<path key={c.iso} d={c.d} fill={c.iso === 'BRA' ? '#2f9e5a' : '#22405c'} stroke={c.iso === 'BRA' ? '#d8f3dc' : '#3b5f80'} strokeWidth={c.iso === 'BRA' ? 2.2 / z : 1.4 / z} />
					))}
					{p > 0 ? <path d={d} fill="none" stroke={INK} strokeWidth={13 / z} strokeLinecap="round" /> : null}
					{p > 0 ? <path d={d} fill="none" stroke={GOLD} strokeWidth={7 / z} strokeLinecap="round" strokeDasharray={`${18 / z} ${12 / z}`} /> : null}
				</svg>
			</div>
			{[['Imperatriz', sa], ['Belo Horizonte', sb]].map(([n, s]) => (
				<div key={n as string} style={{position: 'absolute', left: (s as number[])[0], top: (s as number[])[1]}}>
					<div style={{position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 14, background: '#fff', border: `6px solid ${INK}`}} />
					<div style={{position: 'absolute', left: n === 'Imperatriz' ? 30 : 64, top: -26, fontFamily: MONT, fontWeight: 900, fontSize: 40, color: '#fff', whiteSpace: 'nowrap',
						textShadow: `-2px -2px 0 ${INK}, 2px 2px 0 ${INK}, 0 4px 10px rgba(0,0,0,0.6)`}}>{n as string}</div>
				</div>
			))}
			{/* pulse rings on «Same place» */}
			{t >= W(97) - 0.05 ? Array.from({length: 4}, (_, i) => {
				const a = t - (W(97) - 0.05) - i * 0.4;
				if (a < 0 || a > 1.1) return null;
				return <div key={i} style={{position: 'absolute', left: sb[0], top: sb[1], width: 40 + a * 260, height: 40 + a * 260, transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `${8 - a * 5}px solid #ff4d6d`, opacity: 1 - a / 1.1}} />;
			}) : null}
			{t >= PIN + 0.2 ? <Hearts t0={PIN + 0.2} t1={W(99)} x={sb[0]} y={sb[1] - 150} n={14} rate={6} rise={190} life={1.3} /> : null}
			{/* the heart pin: he will look for love there again */}
			{t >= PIN ? (
				<svg width={140} height={176} style={{position: 'absolute', left: sb[0] - 70, top: sb[1] - 172 + bounce, overflow: 'visible', transform: `scale(${1 + beat})`, transformOrigin: '50% 100%', filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.5))'}}>
					<path d="M70,172 C46,128 16,100 16,66 A54,54 0 1 1 124,66 C124,100 94,128 70,172 Z" fill="#fff" stroke={INK} strokeWidth={8} />
					<path transform="translate(70,70) scale(2.6)" fill="#ff3b5c" d="M0,6 C-12,-4 -10,-14 -4,-14 C-1,-14 0,-11 0,-9 C0,-11 1,-14 4,-14 C10,-14 12,-4 0,6 Z" />
				</svg>
			) : null}
			{p > 0 ? <div style={{position: 'absolute', left: sbus[0], top: sbus[1], transform: `translate(-50%,-105%) scale(${pop(t, W(99) - 0.05, 0.3)})`, fontSize: 96}}>🚌</div> : null}
		</AbsoluteFill>
	);
};

/** «Ah shit, here we go again» — the CJ meme (GTA San Andreas, keyed green screen → public/memes/cj, owner-approved) over the
 * real Belo Horizonte bus terminal (Commons CC0): he is heading back. Owner: faster (round 4), then «чуть медленнее» (round 6) —
 * the lead-in and most of the pause between the two lines are cut, it plays at 1.08× (sound: sfx/cj_cut.wav, cut the same way) */
const CJ_SPEED = 1.08;
const CJ_SEG: [number, number, number][] = [[0, 0.15, 0.85], [0.85 / CJ_SPEED, 1.32, 1.13]];   // [beat time, clip start, clip length] (s)
export const CJ_LINE2 = 0.92;
export const CJ: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const a = t - t0;
	const seg = a < CJ_SEG[1][0] ? CJ_SEG[0] : CJ_SEG[1];
	const clip = Math.min(seg[1] + seg[2], seg[1] + (a - seg[0]) * CJ_SPEED);
	const fi = Math.max(0, Math.min(90, Math.floor(clip * 30)));
	const z = lerp(1.0, 1.1, clamp01(a / (t1 - t0)));
	const line = (txt: string, at: number) => {
		if (a < at) return null;
		const k = easeOut((a - at) / 0.16);
		return <div style={{overflow: 'hidden', padding: '0 20px 14px'}}><div style={{transform: `translateY(${(1 - k) * 105}%)`}}>{txt}</div></div>;
	};
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			<Img src={staticFile('archive/bh_bus_terminal_exit.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '35% 50%', transform: `scale(${z})`, filter: 'brightness(0.9) saturate(1.1)'}} />
			{/* the clip's own small caption is masked off; ours is big and centred (same words, meme style) */}
			<div style={{position: 'absolute', left: -1065, top: 552, width: 2432, height: 1368, clipPath: 'inset(0 0 21% 0)'}}>
				<Img src={staticFile(`memes/cj/f_${String(fi + 1).padStart(4, '0')}.png`)} style={{width: '100%', height: '100%'}} />
			</div>
			<div style={{position: 'absolute', left: 540, top: 1420, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: ANTON, fontSize: 112, lineHeight: 1.02, whiteSpace: 'nowrap',
				color: '#fff', WebkitTextStroke: `10px ${INK}`, paintOrder: 'stroke fill', letterSpacing: 2, filter: `drop-shadow(0 8px 0 ${INK})`}}>
				{line('AH SH*T,', 0.02)}
				{line('HERE WE GO AGAIN', CJ_LINE2)}
			</div>
		</AbsoluteFill>
	);
};

/** frame 0 of the Sold beat (for the loop dissolve at the very end) */
export const FirstFrame: React.FC = () => <CamImg src="flow/F2_room_night.jpg" c={{x: 0.58, y: 0.4, z: 1.75}} />;
