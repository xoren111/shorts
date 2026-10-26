import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {DURATION, W, We} from './lib/time';
import type {SceneProps} from './engine/transitions';
import {TALLY} from './data/beats';
import {clamp01, easeInOut, easeOut, lerp, pop, Counter, Label, Stamp, useT, INK} from './ui/gfx';
import {Dust, MarkerRing, PaperBg, Shake, SpeedLines, Torn, shake} from './ui/vox';
import {Bg, Burst, SKIN, SKIN_D, W as SW} from './ui/draw';
import {BlockWall, Con, ConHead, Doodle, GREEN, Guard, Marker, Radio, Ripple, SteelDoor, Tally, Town} from './ui/cast';
import {HEAD, MONT} from './fonts';
import {PAL} from './theme';

// conman-russell scenes (EDIT_PLAN.md). Everything is drawn in code (owner brief: no photos of Russell, no film stills, no
// mugshots); the only real picture is the public-domain photo of the Harris County jail (Judge). One visual event per phrase,
// nothing static longer than 2 s (L2); big text only for FACTS numbers, whose subtitles are hidden (project.hide_subs).

/** slow camera move inside a beat: scale from a to b over [t0, t1] around (cx, cy) */
const Cam: React.FC<{t0: number; t1: number; a?: number; b?: number; cx?: number; cy?: number; dx?: number; children: React.ReactNode}> = ({t0, t1, a = 1, b = 1.06, cx = 540, cy = 960, dx = 0, children}) => {
	const t = useT();
	const k = clamp01((t - t0) / Math.max(0.3, t1 - t0));
	const e = easeInOut(k);
	// zoom eases, the lateral drift is linear — a steady camera move keeps calm shots alive (standard M4: no second with motion < 1.0)
	return <AbsoluteFill style={{transform: `translateX(${dx * k}px) scale(${lerp(a, b, e)})`, transformOrigin: `${cx}px ${cy}px`}}>{children}</AbsoluteFill>;
};

/** a small bump 0→1→0 around time c (width d) — taps, slams */
const bump = (t: number, c: number, d = 0.14) => {
	const x = (t - c + d / 2) / d;
	return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x);
};

const txt = (size: number, color = INK, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: MONT, fontWeight: 900, fontSize: size, color, letterSpacing: 2, whiteSpace: 'nowrap', ...extra});

/** a parchment sheet (document, letter, form) */
const Sheet: React.FC<{x: number; y: number; w: number; h: number; rot?: number; children?: React.ReactNode}> = ({x, y, w, h, rot = 0, children}) => (
	<div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, background: PAL.parchment, transform: `rotate(${rot}deg)`, boxShadow: `0 0 0 6px ${INK}, 0 26px 50px rgba(0,0,0,0.45)`, borderRadius: 6, overflow: 'hidden'}}>
		<div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.25), rgba(120,80,30,0.18))'}} />
		{children}
	</div>
);
const Lines: React.FC<{x: number; y: number; w: number; n: number; gap?: number}> = ({x, y, w, n, gap = 44}) => (
	<>
		{Array.from({length: n}, (_, i) => (
			<div key={i} style={{position: 'absolute', left: x, top: y + i * gap, width: w * (0.65 + 0.35 * Math.abs(Math.sin(i * 2.3))), height: 12, borderRadius: 6, background: 'rgba(40,30,20,0.25)'}} />
		))}
	</>
);

// ======================================================================= HOOK (0 → «The»)
/** frame 0 and the whole hook as a function of time (FirstFrame = HookArt at t = 0 for the loop dissolve) */
const HookArt: React.FC<{t: number}> = ({t}) => {
	const k = easeInOut(t / 3.6);
	// crash-zoom from frame 0 (motion 0–1 ≥ 20, standard H6), then a slow push to the end of the hook
	// t < 0 = the loop pre-roll (DoorLoop beat): the door opens from shut to frame 0's state, camera creeps in to frame 0's zoom
	const zoom = t < 0 ? lerp(1.85, 2.0, easeOut(clamp01(1 + t / 0.5))) : t < 0.75 ? lerp(2.0, 1.12, easeOut(t / 0.75)) : lerp(1.12, 1.24, easeInOut((t - 0.75) / 2.85));
	const doorOpen = t < 0 ? lerp(0, 0.25, easeOut(clamp01(1 + t / 0.45))) : lerp(0.25, 1, easeOut(t / 0.5));
	const sec = W(6);
	const bars = easeOut((t - sec) / 0.28);
	const wire = clamp01((t - sec) / 0.6);
	const lamp = t >= sec ? t - sec : -1;
	const beam = Math.sin(t * 5.4 - 0.6) * 32;
	const wink = t >= W(9) && t < W(9) + 0.7 ? 1 : 0;   // owner 25.10: no salute hand behind the head — just a wink
	return (
		<AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: '560px 950px'}}>
			<BlockWall t={t} tone="navy" light={[540, 900]} />
			{/* side windows: bars slam down on «maximum-security» */}
			{[170, 910].map((wx) => (
				<div key={wx} style={{position: 'absolute', left: wx - 90, top: 420, width: 180, height: 230, background: '#0b0f16', boxShadow: `inset 0 0 0 8px ${INK}`, overflow: 'hidden'}}>
					<div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(160,190,255,0.35), rgba(0,0,0,0) 70%)'}} />
					{t >= sec - 0.05 ? (
						<svg width={180} height={230} style={{position: 'absolute', left: 0, top: lerp(-240, 0, bars)}}>
							{[30, 70, 110, 150].map((bx) => <rect key={bx} x={bx - 7} y={0} width={14} height={230} fill="#9aa3ad" stroke={INK} strokeWidth={4} />)}
							<rect x={0} y={100} width={180} height={14} fill="#9aa3ad" stroke={INK} strokeWidth={4} />
						</svg>
					) : null}
				</div>
			))}
			{/* razor wire rolls along the top */}
			{wire > 0 ? (
				<svg width={1080} height={200} style={{position: 'absolute', left: 0, top: 260}}>
					<line x1={0} y1={100} x2={1080 * wire} y2={100} stroke="#c9ccd2" strokeWidth={5} />
					{Array.from({length: 20}, (_, i) => (i * 56 < 1080 * wire ? <ellipse key={i} cx={28 + i * 56} cy={100} rx={36} ry={44} fill="none" stroke="#c9ccd2" strokeWidth={5} /> : null))}
				</svg>
			) : null}
			<SteelDoor
				x={540}
				y={1520}
				w={500}
				h={860}
				open={doorOpen}
				light={0.6}
				inside={
					<svg width={500} height={860} style={{position: 'absolute', inset: 0}}>
						<rect x={0} y={560} width={500} height={300} fill="#141b26" />
						{[60, 130, 200, 300, 370, 440].map((bx) => <rect key={bx} x={bx} y={120} width={14} height={440} fill="#2b3644" />)}
						<rect x={0} y={110} width={500} height={16} fill="#2b3644" />
						<ellipse cx={250} cy={300} rx={120} ry={90} fill="rgba(255,236,190,0.18)" />
					</svg>
				}
			/>
			{/* alarm lamp over the door */}
			<div style={{position: 'absolute', left: 500, top: 600, width: 80, height: 46, borderRadius: '40px 40px 6px 6px', background: lamp >= 0 ? '#ff3b3b' : '#6a1d1d', boxShadow: `0 0 0 6px ${INK}${lamp >= 0 ? `, 0 0 ${40 + 20 * Math.sin(lamp * 20)}px #ff3b3b` : ''}`}} />
			<div style={{position: 'absolute', left: 540, top: 623, width: 1100, height: 220, transformOrigin: '0 50%', transform: `translateY(-50%) rotate(${t * 330}deg)`, background: `linear-gradient(90deg, rgba(255,60,60,${lamp >= 0 ? 0.5 : 0.22}), rgba(255,60,60,0))`, mixBlendMode: 'screen', clipPath: 'polygon(0 50%, 100% 0, 100% 100%)'}} />
			<Guard x={95} y={1660} s={0.92} t={t} pose="door" flip smile={0.9} />
			<div style={{opacity: t < 0 ? clamp01(1 + t / 0.3) : 1}}>
				<Con x={560} y={lerp(1600, 1820, k)} s={lerp(0.92, 1.3, k)} speed={1.35} t={t + 0.3} pose="walk" pockets grin={0.55} wink={wink} />
			</div>
			<div style={{position: 'absolute', left: 1280, top: -260, width: 2400, height: 520, transformOrigin: '0 50%', transform: `rotate(${132 - beam * 1.2}deg)`, background: 'linear-gradient(90deg, rgba(255,250,220,0.0) 0%, rgba(255,250,220,0.3) 45%, rgba(255,250,220,0) 100%)', mixBlendMode: 'screen', clipPath: 'polygon(0 50%, 100% 0, 100% 100%)'}} />
			{/* searchlight sweeping across him */}
			<div style={{position: 'absolute', left: -200, top: -200, width: 2400, height: 520, transformOrigin: '0 50%', transform: `rotate(${48 + beam}deg)`, background: 'linear-gradient(90deg, rgba(255,250,220,0.0) 0%, rgba(255,250,220,0.34) 45%, rgba(255,250,220,0) 100%)', mixBlendMode: 'screen', clipPath: 'polygon(0 50%, 100% 0, 100% 100%)'}} />
		</AbsoluteFill>
	);
};

/** «four times»: a long prison wall with four steel doors; they burst open one after another and he walks out of every one,
 *  on «times.» all four of him wink (owner 25.10: no «4×» number, no tally lines, no salute hand) */
const FourDoors: React.FC<{t: number}> = ({t}) => {
	const a0 = W(8) - 0.04;
	const pull = easeOut((t - a0) / 0.5);
	const XS = [165, 390, 615, 840];
	const wink = t >= W(9) && t < W(9) + 0.7 ? 1 : 0;   // owner 25.10: no salute hand behind the head — just a wink
	return (
		<AbsoluteFill style={{transform: `scale(${lerp(1.25, 1.0, pull) + 0.14 * easeInOut((t - a0 - 0.45) / 0.55)})`, transformOrigin: '540px 950px'}}>
			<BlockWall t={t} tone="navy" light={[540, 1000]} />
			<svg width={1080} height={200} style={{position: 'absolute', left: 0, top: 330}}>
				<line x1={0} y1={100} x2={1080} y2={100} stroke="#c9ccd2" strokeWidth={5} />
				{Array.from({length: 20}, (_, i) => <ellipse key={i} cx={28 + i * 56} cy={100} rx={36} ry={44} fill="none" stroke="#c9ccd2" strokeWidth={5} />)}
			</svg>
			<div style={{position: 'absolute', left: 0, top: 1240, width: 1080, height: 680, background: '#1a2534'}} />
			{XS.map((x, i) => {
				const ti = a0 + i * 0.1;
				const op = easeOut((t - ti) / 0.22);
				const out = clamp01((t - ti - 0.05) / 0.85);
				return (
					<React.Fragment key={x}>
						<div style={{position: 'absolute', left: x - 30, top: 575, width: 60, height: 34, borderRadius: '30px 30px 4px 4px', background: op > 0 ? '#ff3b3b' : '#6a1d1d', boxShadow: `0 0 0 5px ${INK}${op > 0 ? ', 0 0 30px #ff3b3b' : ''}`}} />
						<div style={{position: 'absolute', left: 0, top: 1240, width: 1080, height: 680, clipPath: `polygon(${x - 92}px 0, ${x + 92}px 0, ${x + 190}px 680px, ${x - 190}px 680px)`, background: `linear-gradient(180deg, rgba(255,236,190,${0.32 * op}), rgba(255,236,190,0))`}} />
						{op > 0 ? <div style={{position: 'absolute', left: x, top: 592, width: 700, height: 150, transformOrigin: '0 50%', transform: `translateY(-50%) rotate(${(t - ti) * 380 + i * 90}deg)`, background: 'linear-gradient(90deg, rgba(255,60,60,0.45), rgba(255,60,60,0))', mixBlendMode: 'screen', clipPath: 'polygon(0 50%, 100% 0, 100% 100%)'}} /> : null}
						<SteelDoor x={x} y={1240} w={190} h={630} open={0.02 + 0.98 * op} light={0.5 * op} inside={<div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 70%, rgba(255,236,190,0.25), #0b0f16 70%)'}} />} />
						{out > 0 ? <Con x={x + 10} y={lerp(1215, 1400, out)} s={lerp(0.32, 0.5, out)} speed={1.4} t={t + i * 0.7} pose="walk" pockets grin={0.6} wink={wink} /> : null}
					</React.Fragment>
				);
			})}
			<div style={{position: 'absolute', left: -200, top: -300, width: 2400, height: 560, transformOrigin: '0 50%', transform: `rotate(${40 + Math.sin(t * 5.4) * 28}deg)`, background: 'linear-gradient(90deg, rgba(255,250,220,0) 0%, rgba(255,250,220,0.3) 45%, rgba(255,250,220,0) 100%)', mixBlendMode: 'screen', clipPath: 'polygon(0 50%, 100% 0, 100% 100%)'}} />
		</AbsoluteFill>
	);
};

export const Hook: React.FC<SceneProps> = () => {
	const t = useT();
	if (t >= W(8) - 0.04)
		return (
			<Shake hits={[W(8) - 0.04]} amp={7} tremor={2}>
				<FourDoors t={t} />
			</Shake>
		);
	return (
		<Shake hits={[0.02, W(6)]} amp={8} tremor={2.5}>
			<HookArt t={t} />
			<Dust t0={0} x={560} y={1000} n={46} spread={1500} dur={1.1} color="235,228,210" />
			<SpeedLines t0={0} t1={1.0} cy={950} strength={0.85} />
		</Shake>
	);
};

// ======================================================================= DOORMAN («The guards held the door.»)
export const Doorman: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const bw = easeOut((t - t0 - 0.1) / 0.45) + 0.6 * bump(t, W(13), 0.5);
	const ding = t - W(14);
	return (
		<Shake hits={[t0 + 0.02]} amp={6} tremor={3}>
		<Cam t0={t0} t1={t1} a={1.0} b={1.16} cy={800}>
			<BlockWall t={t} tone="navy" light={[620, 700]} />
			{/* daylight through the door he holds open; the conman's shadow crosses it */}
			<div style={{position: 'absolute', left: 760, top: 200, width: 420, height: 1800, background: 'linear-gradient(90deg, rgba(255,244,214,0.15), rgba(255,244,214,0.75))'}} />
			<div style={{position: 'absolute', left: 0, top: 260, width: 200, height: 1500, background: '#5d6b78', boxShadow: `inset 0 0 0 8px ${INK}`}} />
			<div style={{position: 'absolute', left: 150, top: 900, width: 40, height: 140, borderRadius: 10, background: '#c9ccd2', boxShadow: `0 0 0 5px ${INK}`}} />
			<Guard x={600} y={2080} s={1.6} t={t} pose="bow" bow={0.22 * bw} smile={1} bust />
			{ding >= 0 ? <Burst x={860} y={520} a={ding} color={PAL.gold} r={260} /> : null}
			{ding >= 0 && ding < 0.6 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<g transform={`translate(860 560) scale(${pop(t, W(14), 0.25)})`}>
						<path d="M-70,30 Q-70,-50 0,-56 Q70,-50 70,30 Z" fill={PAL.gold} stroke={INK} strokeWidth={6} />
						<rect x={-90} y={30} width={180} height={22} rx={8} fill="#7a5a2a" stroke={INK} strokeWidth={6} />
						<circle cx={0} cy={-66} r={12} fill={PAL.gold} stroke={INK} strokeWidth={5} />
					</g>
				</svg>
			) : null}
			{/* his shadow slides past in the foreground */}
			{t > W(12) ? <div style={{position: 'absolute', left: lerp(1150, -650, easeInOut((t - W(12)) / 1.1)), top: 200, width: 560, height: 1800, borderRadius: 260, background: 'rgba(5,8,14,0.82)', filter: 'blur(14px)'}} /> : null}
		</Cam>
		</Shake>
	);
};

// ======================================================================= WALL (tally I … IIII)
const DOODLES = ['radio', 'phone', 'marker', 'heart'] as const;
const WallScene: React.FC<SceneProps & {n: number}> = ({t0, t1, n}) => {
	const t = useT();
	const s0 = t0 + 0.06;
	const tipK = clamp01((t - s0) / 0.2);
	const tx = TALLY.x0 + (n - 1) * TALLY.gap;
	const top = TALLY.y - TALLY.h / 2;
	// a hand with a spoon scratches the new mark, then pulls away (who is counting = him)
	const away = easeInOut((t - s0 - 0.22) / 0.3);
	const hx = tx + 30 + away * 260;
	const hy = top + TALLY.h * tipK + away * 300;
	return (
		<Cam t0={t0} t1={t1 + 0.2} a={1} b={1.14} cx={tx} cy={TALLY.y}>
			<BlockWall t={t} tone="cell" light={[880, 420]} />
			<div style={{position: 'absolute', left: 790, top: 300, width: 190, height: 220, background: 'rgba(200,220,255,0.35)', boxShadow: `inset 0 0 0 8px ${INK}`}}>
				{[40, 95, 150].map((bx) => <div key={bx} style={{position: 'absolute', left: bx - 7, top: 0, width: 14, height: 220, background: '#2a3240'}} />)}
			</div>
			<div style={{position: 'absolute', left: 560, top: 480, width: 700, height: 900, transform: 'skewX(-20deg)', background: 'linear-gradient(180deg, rgba(220,235,255,0.16), rgba(220,235,255,0))'}} />
			{/* bunk + blanket */}
			<div style={{position: 'absolute', left: -20, top: 1380, width: 640, height: 150, borderRadius: 18, background: '#8c97a3', boxShadow: `0 0 0 7px ${INK}`}} />
			<div style={{position: 'absolute', left: 20, top: 1330, width: 520, height: 90, borderRadius: 30, background: '#e8e2d4', boxShadow: `0 0 0 6px ${INK}`}} />
			<div style={{position: 'absolute', left: 30, top: 1530, width: 30, height: 300, background: '#5d6b78', boxShadow: `0 0 0 5px ${INK}`}} />
			<div style={{position: 'absolute', left: 540, top: 1530, width: 30, height: 300, background: '#5d6b78', boxShadow: `0 0 0 5px ${INK}`}} />
			<Tally t={t} n={n} t0={s0} x={TALLY.x0} y={TALLY.y} h={TALLY.h} gap={TALLY.gap} />
			{/* what each escape was: chalk doodles over the old marks, «?» over the new one */}
			{Array.from({length: n}, (_, i) => (
				<Doodle key={i} kind={i < n - 1 ? DOODLES[i] : 'q'} x={TALLY.x0 + i * TALLY.gap + 3} y={top - 100} s={i < n - 1 ? 1.35 : 1.6} o={i < n - 1 ? 1 : clamp01((t - s0 - 0.2) / 0.2)} color={i < n - 1 ? '#efe9dc' : PAL.orange} />
			))}
			{tipK > 0 && tipK < 1 ? <Dust t0={s0} x={tx} y={top + TALLY.h * tipK} n={20} spread={320} dur={0.5} color="230,225,210" /> : null}
			{away < 1 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					<g transform={`translate(${hx} ${hy}) rotate(-35)`}>
						<rect x={-12} y={-10} width={24} height={150} rx={10} fill="#c9ccd2" stroke={INK} strokeWidth={5} />
						<ellipse cx={0} cy={-24} rx={22} ry={30} fill="#c9ccd2" stroke={INK} strokeWidth={5} />
						<rect x={-60} y={150} width={120} height={300} fill="#F4F1EA" stroke={INK} strokeWidth={6} />
						<circle cx={0} cy={120} r={50} fill={SKIN} stroke={INK} strokeWidth={6} />
					</g>
				</svg>
			) : null}
		</Cam>
	);
};
export const Wall1: React.FC<SceneProps> = (p) => <WallScene {...p} n={1} />;
export const Wall2: React.FC<SceneProps> = (p) => <WallScene {...p} n={2} />;
export const Wall3: React.FC<SceneProps> = (p) => <WallScene {...p} n={3} />;
export const Wall4: React.FC<SceneProps> = (p) => <WallScene {...p} n={4} />;

// ======================================================================= ESCAPE 1: workman + radio
export const Workman: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const swap = W(16) + 0.12;
	const drop = easeOut((t - W(19)) / 0.25);
	return (
		<Cam t0={t0} t1={t1} a={1} b={1.05} cy={1100}>
			<BlockWall t={t} tone="cell" light={[540, 700]} />
			{[0, 1, 2, 3, 4].map((i) => (
				<div key={i} style={{position: 'absolute', left: 20 + i * 210, top: 380, width: 190, height: 1000, background: i % 2 ? '#5f7f73' : '#56756a', boxShadow: `inset 0 0 0 7px ${INK}`}}>
					{[0, 1, 2].map((j) => <div key={j} style={{position: 'absolute', left: 50, top: 60 + j * 16, width: 90, height: 6, background: '#2f4a40'}} />)}
					<div style={{position: 'absolute', right: 26, top: 480, width: 18, height: 70, borderRadius: 6, background: '#c9ccd2', boxShadow: `0 0 0 4px ${INK}`}} />
				</div>
			))}
			<div style={{position: 'absolute', left: 0, top: 1380, width: 1080, height: 540, background: '#2b3340'}} />
			<Con x={540} y={1640} s={1.05} t={t} outfit={t < swap ? 'white' : 'workman'} pose="stand" grin={0.6} />
			<Dust t0={swap - 0.04} x={540} y={1150} n={30} spread={700} dur={0.7} color="240,238,230" />
			{t >= W(19) - 0.02 ? <Radio x={lerp(660, 650, drop)} y={lerp(-300, 1200, drop)} s={0.75} rot={lerp(-40, -8, drop)} /> : null}
		</Cam>
	);
};

// close-up: the radio taps on the guard-booth glass
export const Tap: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const taps = [W(21), W(23)];
	const dx = taps.reduce((a, c) => a + bump(t, c, 0.16), 0);
	const lamp = t >= W(28);
	return (
		<Shake hits={[]} tremor={1.5}>
		<Cam t0={t0} t1={t1} a={1.04} b={1.2} cx={640} cy={900} dx={-50}>
			<BlockWall t={t} tone="navy" light={[640, 800]} />
			{/* booth window */}
			<div style={{position: 'absolute', left: 300, top: 480, width: 720, height: 820, background: '#1b2533', boxShadow: `inset 0 0 0 14px #3c4650, 0 0 0 6px ${INK}`, overflow: 'hidden'}}>
				<div style={{position: 'absolute', left: -300, top: -480, width: 1080, height: 1920}}>
					<Guard x={680} y={1980 + (t < W(23) ? 18 : 0)} s={1.35} t={t} pose={t > W(27) + 0.25 ? 'nod' : 'stand'} asleep={t < W(23) + 0.05} startle={bump(t, W(23) + 0.2, 0.5)} squint={t >= W(27) && t < W(27) + 0.3 ? 1 : 0} smile={0.3} bust />
				</div>
				<div style={{position: 'absolute', inset: 0, background: `linear-gradient(120deg, rgba(190,225,255,0.28), rgba(190,225,255,0.06) 40%, rgba(190,225,255,0.2))`}} />
			</div>
			{/* buzzer lamp */}
			<div style={{position: 'absolute', left: 620, top: 380, width: 70, height: 70, borderRadius: 35, background: lamp ? '#4be37a' : '#244a33', boxShadow: `0 0 0 6px ${INK}${lamp ? ', 0 0 50px #4be37a' : ''}`}} />
			{taps.map((c) => <Ripple key={c} x={390} y={880} a={t - c} />)}
			<Radio x={250 + dx * 70} y={1010} s={1.25} rot={-18 + dx * 6} led={t >= W(23) && Math.sin(t * 18) > 0 ? 1 : 0} />
			{/* his hand on the radio */}
			<div style={{position: 'absolute', left: 150 + dx * 70, top: 1090, width: 150, height: 120, borderRadius: 60, background: SKIN, boxShadow: `0 0 0 6px ${INK}`}} />
			<div style={{position: 'absolute', left: -120 + dx * 70, top: 1120, width: 300, height: 110, background: '#3F6FB5', boxShadow: `0 0 0 6px ${INK}`, transform: 'rotate(-12deg)'}} />
		</Cam>
		</Shake>
	);
};

// the barred gate slides open, he strolls out
export const Walkout: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const open = easeInOut((t - W(29)) / 0.55);
	const k = easeInOut((t - t0) / (t1 - t0 + 0.3));
	return (
		<Cam t0={t0} t1={t1} a={1.05} b={1.16} cy={1100}>
			<Bg kind="navy" t={t} />
			<div style={{position: 'absolute', left: 0, top: 1300, width: 1080, height: 620, background: '#1a2534'}} />
			<Con x={540} y={lerp(1560, 1700, k)} s={lerp(0.78, 0.92, k)} t={t} outfit="workman" pose={t >= W(31) - 0.1 ? 'wave' : 'walk'} grin={0.8} />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<g transform={`translate(${open * 760} 0)`}>
					{Array.from({length: 9}, (_, i) => <rect key={i} x={150 + i * 90} y={420} width={22} height={1100} fill="#9aa3ad" stroke={INK} strokeWidth={5} />)}
					<rect x={130} y={420} width={820} height={24} fill="#9aa3ad" stroke={INK} strokeWidth={5} />
					<rect x={130} y={1000} width={820} height={24} fill="#9aa3ad" stroke={INK} strokeWidth={5} />
				</g>
				<rect x={110} y={400} width={20} height={1140} fill="#3c4650" />
			</svg>
		</Cam>
	);
};

// ======================================================================= ESCAPE 2: judge on the phone + the real jail
export const Judge: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const robe = W(33) + 0.12;
	const gav = W(36);
	const g = t < gav - 0.18 ? -55 : t < gav ? lerp(-55, 0, easeInOut((t - gav + 0.18) / 0.18)) : -4 * bump(t, gav + 0.05, 0.2);
	const line = clamp01((t - W(38) - 0.15) / 0.45);
	return (
		<Cam t0={t0} t1={t1} a={1} b={1.12} dx={40}>
			<Bg kind="navy" t={t} />
			{/* payphone */}
			<div style={{position: 'absolute', left: 90, top: 560, width: 260, height: 520, borderRadius: 18, background: '#8f9aa6', boxShadow: `inset 0 0 0 8px ${INK}`}}>
				<div style={{position: 'absolute', left: 50, top: 60, width: 160, height: 110, background: '#2a3240', boxShadow: `0 0 0 5px ${INK}`}} />
				{Array.from({length: 9}, (_, i) => <div key={i} style={{position: 'absolute', left: 64 + (i % 3) * 50, top: 214 + Math.floor(i / 3) * 50, width: 28, height: 28, borderRadius: 14, background: '#c9ccd2'}} />)}
			</div>
			<div style={{position: 'absolute', left: 60, top: 1080, width: 340, height: 40, background: '#5d6b78', boxShadow: `0 0 0 5px ${INK}`}} />
			{/* gavel */}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<g transform={`rotate(${g} 330 1020)`}>
					<rect x={160} y={1010} width={190} height={22} rx={10} fill="#7a4a24" stroke={INK} strokeWidth={5} />
					<rect x={120} y={970} width={70} height={100} rx={12} fill="#8a5834" stroke={INK} strokeWidth={6} />
				</g>
			</svg>
			{/* the puff swap crossfades over 0.1 s (an instant swap reads as a glitch frame — QA blinks.py) */}
			<div style={{opacity: 1 - clamp01((t - robe + 0.05) / 0.1)}}><Con x={330} y={1720} s={0.9} t={t} outfit="white" pose="phone" grin={0.7} /></div>
			<div style={{opacity: clamp01((t - robe + 0.05) / 0.1)}}><Con x={330} y={1720} s={0.9} t={t} outfit="judge" pose="phone" grin={0.7} /></div>
			<Dust t0={robe - 0.04} x={330} y={1150} n={22} spread={500} dur={0.6} color="245,242,235" />
			<Torn t0={W(38)} cx={770} cy={640} w={520} h={400} rot={3} seed={6}>
				<Img src={staticFile('img/701_jail_houston.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 35%'}} />
			</Torn>
			{line > 0 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<path d="M400,960 Q560,940 640,700" fill="none" stroke="#fff" strokeWidth={8} strokeDasharray="18 16" strokeDashoffset={-t * 120} pathLength={1000} style={{strokeDasharray: `18 16`, clipPath: `inset(0 ${100 - line * 100}% 0 0)`}} />
				</svg>
			) : null}
			<MarkerRing t0={W(40)} t1={t1} cx={700} cy={640} rx={80} ry={56} color={PAL.orange} />
			<Label text="Houston, Texas" t0={W(38) + 0.2} t1={t1} x={770} y={900} size={40} />
		</Cam>
	);
};

// the bail form: $900,000 → $45,000
export const Bail: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const pen = easeInOut((t - W(45)) / 0.35);
	const strike = clamp01((t - W(51)) / 0.22);
	const hop = clamp01((t - W(52) - 0.25) / 0.9);
	const amt = (v: string, ts: number, y: number, size: number) =>
		t >= ts ? (
			<div style={{position: 'absolute', left: 540, top: y, transform: `translate(-50%,-50%) scale(${lerp(1.8, 1, easeOut((t - ts) / 0.14))})`, fontFamily: HEAD, fontSize: size, color: PAL.orange, whiteSpace: 'nowrap', filter: `drop-shadow(0 6px 0 ${INK})`, WebkitTextStroke: `6px ${INK}`, paintOrder: 'stroke fill'}}>{v}</div>
		) : null;
	return (
		<Cam t0={t0} t1={t1} a={1} b={1.16} cy={820} dx={-40}>
			<PaperBg />
			<Sheet x={540} y={790} w={820} h={860} rot={-1.5}>
				<svg width={820} height={130} style={{position: 'absolute', left: 0, top: 18}}><circle cx={410} cy={65} r={56} fill="none" stroke={INK} strokeWidth={7} /><circle cx={410} cy={65} r={42} fill="none" stroke={INK} strokeWidth={3} /><path d="M410,30 l10,22 24,2 -18,16 6,24 -22,-12 -22,12 6,-24 -18,-16 24,-2 Z" fill={INK} /></svg>
				<div style={{position: 'absolute', left: 60, top: 150, width: 700, height: 8, background: INK}} />
				<Lines x={70} y={200} w={660} n={4} />
				<div style={{position: 'absolute', left: 60, top: 420, ...txt(30, 'rgba(18,8,24,0.7)')}}>AMOUNT</div>
				<div style={{position: 'absolute', left: 60, top: 460, width: 700, height: 200, border: `6px solid ${INK}`, borderRadius: 10, background: 'rgba(255,255,255,0.35)'}} />
				<Lines x={70} y={720} w={500} n={2} />
			</Sheet>
			{amt('$900,000', W(47), 760, 130)}
			{strike > 0 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<path d={`M240,770 L${240 + 600 * strike},${750 - 20 * strike}`} stroke={PAL.stamp} strokeWidth={22} strokeLinecap="round" />
					<path d={`M250,800 L${250 + 580 * strike},${770 - 10 * strike}`} stroke={PAL.stamp} strokeWidth={14} strokeLinecap="round" opacity={0.8} />
				</svg>
			) : null}
			{amt('$45,000', W(51) + 0.12, 1040, 120)}
			{/* the pen */}
			{t >= W(45) - 0.05 && t < W(51) + 0.1 ? (
				<div style={{position: 'absolute', left: lerp(1000, 760, pen) + (t > W(51) ? 0 : Math.sin(t * 30) * 6), top: lerp(1300, 860, pen), width: 40, height: 300, background: '#22222a', borderRadius: 14, boxShadow: `0 0 0 5px ${INK}`, transform: 'rotate(28deg)'}} />
			) : null}
			{/* ✓ stamp, then the tiny conman hops off the paper */}
			{t >= W(52) ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<g transform={`translate(800 1120) scale(${lerp(2.2, 1, easeOut((t - W(52)) / 0.12))}) rotate(-10)`}>
						<circle cx={0} cy={0} r={78} fill="none" stroke={PAL.stamp} strokeWidth={12} />
						<path d="M-36,0 L-8,28 L40,-30" fill="none" stroke={PAL.stamp} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
					</g>
				</svg>
			) : null}
			{hop > 0 ? <Con x={lerp(560, 1160, hop)} y={1170 - Math.abs(Math.sin(hop * 9)) * 30} s={0.2} t={t} outfit="white" pose="walk" grin={0.9} /> : null}
		</Cam>
	);
};

// ======================================================================= ESCAPE 3: green markers → scrubs → front door
export const MarkerScene: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const fill = clamp01((t - W(57)) / (W(58) + 0.15 - W(57)));
	const drawing = t >= W(55) + 0.1 && t < W(58) + 0.2;
	// after the scribble the marker stays where it stopped and fades (no one-frame jump — QA blinks.py)
	const tm = Math.min(t, W(58) + 0.2);
	const mx = lerp(260, 820, fill) + Math.sin(tm * 31) * 50;
	const my = 1060 + Math.cos(tm * 23) * 160;
	const mo = 1 - clamp01((t - W(58) - 0.2) / 0.25);
	const pile = t - W(60);
	return (
		<Cam t0={t0} t1={t1} a={1} b={1.05} cy={1000}>
			<Bg kind="navy" t={t} />
			<Con x={540} y={2330} s={2.3} t={t} outfit="white" pose="stand" grin={0.6} look={drawing ? 1 : 0} />
			<div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - fill * 100}% 0 0)`}}>
				<Con x={540} y={2330} s={2.3} t={t} outfit="scrubs" pose="stand" grin={0.6} look={drawing ? 1 : 0} />
			</div>
			{t >= W(55) - 0.05 && mo > 0 ? <div style={{opacity: mo}}><Marker x={t < W(55) + 0.1 ? 820 : mx} y={t < W(55) + 0.1 ? 1220 : my} s={1.5} rot={35 + Math.sin(tm * 20) * 8} cap={t < W(55) + 0.08} /></div> : null}
			{t >= W(58) ? <Burst x={540} y={1100} a={t - W(58)} color={GREEN} r={300} /> : null}
			{pile >= 0
				? [0, 1, 2, 3, 4, 5].map((i) => {
						const k = easeOut((pile - i * 0.05) / 0.35);
						return k > 0 ? <Marker key={i} x={250 + i * 110} y={lerp(-200, 1540 + (i % 2) * 30, k)} s={0.9} rot={70 + i * 37} /> : null;
					})
				: null}
		</Cam>
	);
};

export const Doctor: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const walk = easeInOut((t - t0) / (t1 - t0));
	const open = clamp01((t - W(67)) / 0.5);
	const think = pop(t, W(65), 0.3);
	const out = clamp01((t - W(70)) / 0.45);
	return (
		<Cam t0={t0} t1={t1} a={1} b={1.14} cx={760} cy={1000} dx={-40}>
			<BlockWall t={t} tone="navy" light={[760, 900]} />
			<SteelDoor x={790} y={1500} w={440} h={860} open={open} light={0.35 * open} inside={<Town t={t} w={440} h={860} />} />
			{open > 0 ? <div style={{position: 'absolute', left: 570, top: 640, width: 440, height: 1280, background: `linear-gradient(180deg, rgba(255,246,216,${0.35 * open}), rgba(255,246,216,0))`, transform: 'skewX(-12deg)', mixBlendMode: 'screen'}} /> : null}
			<div style={{opacity: 1 - out * 0.85}}>
				<Con x={lerp(470, 800, walk)} y={1600} s={0.8} t={t} outfit="scrubs" pose={t >= W(70) ? 'wave' : 'walk'} grin={0.8} />
			</div>
			{/* front desk + guard */}
			<div style={{position: 'absolute', left: 0, top: 1050, width: 470, height: 870}}>
				<div style={{position: 'absolute', left: -380, top: -1050, width: 1080, height: 1920}}>
					<Guard x={620} y={1980} s={1.05} t={t} pose={t > W(67) ? 'nod' : 'stand'} smile={0.8} bust />
				</div>
				<div style={{position: 'absolute', left: 0, top: 260, width: 470, height: 610, background: '#6b4f36', boxShadow: `inset 0 0 0 8px ${INK}`}} />
			</div>
			{/* the guard's thought: a doctor */}
			{think > 0 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<g transform={`translate(250 600) scale(${think})`}>
						<circle cx={-40} cy={300} r={18} fill="#fff" stroke={INK} strokeWidth={5} />
						<circle cx={-10} cy={250} r={28} fill="#fff" stroke={INK} strokeWidth={5} />
						<ellipse cx={0} cy={40} rx={190} ry={170} fill="#fff" stroke={INK} strokeWidth={7} />
						<ConHead cx={0} cy={30} r={1.15} mask={1} />
						<path d="M-70,-70 Q0,-140 70,-70" fill="none" stroke="#555" strokeWidth={10} />
						<circle cx={0} cy={-108} r={26} fill="#dfe6ee" stroke={INK} strokeWidth={6} />
					</g>
				</svg>
			) : null}
			<Label text="Estelle Unit · Huntsville, Texas" t0={W(67) + 0.15} t1={t1} x={540} y={420} size={42} />
		</Cam>
	);
};

// ======================================================================= ESCAPE 4: fake records → hospice → «dead»
export const Records: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const dip = easeInOut((t - W(74)) / 0.35);
	const docIn = easeOut((t - W(75)) / 0.35);
	const pts = Array.from({length: 12}, (_, i) => {
		const x = 260 + i * 50;
		const base = 760 - Math.sin(i * 1.3) * 30;
		return `${x},${i < 6 ? base : base + dip * (i - 5) * 60}`;
	}).join(' ');
	const beatGap = lerp(0.45, 1.1, clamp01((t - W(80)) / 0.8));
	const beepA = ((t - W(80)) % beatGap) / beatGap;
	return (
		<Cam t0={t0} t1={t1} a={1} b={1.15} cy={900} dx={40}>
			<PaperBg />
			<div style={{position: 'absolute', left: 190, top: 330, width: 700, height: 920, background: '#8a5834', borderRadius: 24, boxShadow: `0 0 0 7px ${INK}`}} />
			<Sheet x={540} y={810} w={620} h={820}>
				<svg width={620} height={110} style={{position: 'absolute', left: 0, top: 18}}><path d="M285,10 h50 v32 h32 v50 h-32 v32 h-50 v-32 h-32 v-50 h32 Z" fill={PAL.stamp} stroke={INK} strokeWidth={5} transform="translate(0 -12) scale(1 0.9)" /></svg>
				<Lines x={50} y={130} w={520} n={3} />
				<div style={{position: 'absolute', left: 50, top: 300, width: 520, height: 300, border: `5px solid ${INK}`, background: 'rgba(255,255,255,0.4)'}} />
				<Lines x={50} y={650} w={420} n={3} />
			</Sheet>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<polyline points={pts} fill="none" stroke={t >= W(74) ? PAL.stamp : '#2c5290'} strokeWidth={10} strokeLinejoin="round" />
			</svg>
			{/* the forging hand */}
			{t < W(75) + 0.2 ? <div style={{position: 'absolute', left: 620 + Math.sin(Math.min(t, W(75)) * 25) * 40, top: 980 + Math.cos(Math.min(t, W(75)) * 19) * 20 + 300 * easeInOut((t - W(75)) / 0.2), opacity: 1 - clamp01((t - W(75)) / 0.2), width: 30, height: 260, background: '#22222a', borderRadius: 12, boxShadow: `0 0 0 5px ${INK}`, transform: 'rotate(30deg)'}} /> : null}
			{/* the prison doctor reads it and nods sadly */}
			{docIn > 0 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<g transform={`translate(${lerp(1300, 860, docIn)} 1330)`}>
						<path d="M-170,300 Q-170,120 0,110 Q170,120 170,300 Z" fill="#fafaf7" stroke={INK} strokeWidth={SW} />
						<ellipse cx={0} cy={0} rx={90} ry={100} fill={SKIN} stroke={INK} strokeWidth={SW + 1} />
						<path d="M-90,-10 Q-96,-60 -60,-70 M90,-10 Q96,-60 60,-70" stroke="#d8d4cc" strokeWidth={22} fill="none" strokeLinecap="round" />
						<circle cx={-34} cy={-4} r={26} fill="rgba(200,230,255,0.4)" stroke={INK} strokeWidth={6} />
						<circle cx={34} cy={-4} r={26} fill="rgba(200,230,255,0.4)" stroke={INK} strokeWidth={6} />
						<path d={`M-30,${54 + Math.sin(t * 9) * 3} Q0,40 30,54`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
					</g>
				</svg>
			) : null}
			{/* heart monitor slowing down on «dying» */}
			{t >= W(80) - 0.1 ? (
				<div style={{position: 'absolute', left: 90, top: 1080, width: 340, height: 230, background: '#0d1a14', borderRadius: 18, boxShadow: `0 0 0 7px ${INK}`}}>
					<svg width={340} height={230}>
						<polyline points={Array.from({length: 40}, (_, i) => `${10 + i * 8},${Math.abs(i / 40 - beepA) < 0.03 ? 40 : 130}`).join(' ')} fill="none" stroke="#4be37a" strokeWidth={6} />
					</svg>
				</div>
			) : null}
		</Cam>
	);
};

export const Hospice: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const drive = easeInOut((t - t0 - 0.1) / (W(86) - t0 - 0.1));
	const bed = pop(t, W(86) - 0.05, 0.35);
	return (
		<Cam t0={t0} t1={t1} a={1} b={1.12} dx={40}>
			<Bg kind="chart" t={t} />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<path d="M150,1100 Q540,1300 930,1000" fill="none" stroke="#e8e2d4" strokeWidth={60} strokeLinecap="round" opacity={0.85} />
				{/* prison */}
				<rect x={40} y={860} width={240} height={220} fill="#5d6b78" stroke={INK} strokeWidth={6} />
				<rect x={200} y={760} width={60} height={120} fill="#5d6b78" stroke={INK} strokeWidth={6} />
				{/* hospice house with a heart */}
				<path d="M800,1000 L800,860 L900,780 L1000,860 L1000,1000 Z" fill="#f4f1ea" stroke={INK} strokeWidth={6} />
				<path d="M900,860 c-14,-24 -48,-10 -36,14 l36,30 l36,-30 c12,-24 -22,-38 -36,-14 Z" fill={PAL.stamp} stroke={INK} strokeWidth={4} />
				{/* van */}
				{(() => {
					const u = drive;
					const x = (1 - u) * (1 - u) * 150 + 2 * (1 - u) * u * 540 + u * u * 930;
					const y = (1 - u) * (1 - u) * 1100 + 2 * (1 - u) * u * 1300 + u * u * 1000;
					return (
						<g transform={`translate(${x} ${y - 70})`}>
							<rect x={-110} y={-70} width={220} height={120} rx={20} fill="#fff" stroke={INK} strokeWidth={6} />
							<rect x={40} y={-56} width={56} height={46} rx={8} fill="#9fd8ff" stroke={INK} strokeWidth={4} />
							<circle cx={-60} cy={52} r={24} fill="#222" stroke={INK} strokeWidth={5} />
							<circle cx={60} cy={52} r={24} fill="#222" stroke={INK} strokeWidth={5} />
						</g>
					);
				})()}
			</svg>
			{bed > 0 ? (
				<div style={{position: 'absolute', left: 140, top: 300, width: 800, height: 560, borderRadius: 30, background: '#f4ead8', boxShadow: `0 0 0 8px ${INK}, 0 30px 60px rgba(0,0,0,0.4)`, transform: `scale(${bed})`, overflow: 'hidden'}}>
					<div style={{position: 'absolute', left: 60, top: 300, width: 680, height: 200, borderRadius: 30, background: '#9fc4e8', boxShadow: `0 0 0 6px ${INK}`}} />
					<div style={{position: 'absolute', left: 60, top: 170, width: 260, height: 150, borderRadius: 60, background: '#fff', boxShadow: `0 0 0 6px ${INK}`}} />
					<svg width={800} height={560} style={{position: 'absolute', inset: 0}}>
						<ConHead cx={190} cy={230} r={0.95} grin={0.7} wink={t > W(86) + 0.3 ? 1 : 0} />
					</svg>
				</div>
			) : null}
		</Cam>
	);
};

/** the State of Texas letter, used by News (typing + DECEASED) and Twist (torn) */
const Letter: React.FC<{t: number; y: number; typed: number}> = ({y, typed}) => {
	const name = 'STEVEN RUSSELL';
	return (
		<Sheet x={540} y={y} w={720} h={900}>
			<svg width={720} height={160} style={{position: 'absolute', left: 0, top: 30}}>
				<path d="M360,20 l20,44 48,4 -36,32 12,48 -44,-26 -44,26 12,-48 -36,-32 48,-4 Z" fill={PAL.gold} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
			</svg>
			<div style={{position: 'absolute', left: 60, top: 270, width: 600, height: 7, background: INK}} />
			<Lines x={70} y={310} w={580} n={3} />
			<div style={{position: 'absolute', left: 70, top: 470, ...txt(52, INK, {letterSpacing: 6})}}>{name.slice(0, Math.round(typed * name.length))}</div>
			<Lines x={70} y={580} w={560} n={4} />
		</Sheet>
	);
};

export const News: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const rise = easeOut((t - W(91)) / 0.5);
	const typed = clamp01((t - W(92)) / (We(93) - W(92)));
	const push = easeInOut((t - W(95)) / (t1 - W(95) + 0.3));
	const drift = clamp01((t - t0) / (t1 - t0));
	return (
		<AbsoluteFill style={{transform: `translateX(${-40 * drift}px) scale(${lerp(1, 1.1, drift) + 0.06 * push})`, transformOrigin: '540px 1000px'}}>
			<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #5a4130, #20150e 80%)'}} />
			<Letter t={t} y={lerp(1180, 900, rise)} typed={typed} />
			{/* typewriter */}
			<div style={{position: 'absolute', left: 130, top: lerp(1330, 1600, rise), width: 820, height: 420, borderRadius: '60px 60px 20px 20px', background: '#2b2b33', boxShadow: `0 0 0 8px ${INK}`}}>
				{Array.from({length: 3}, (_, r) =>
					Array.from({length: 10}, (_, c) => (
						<div key={`${r}${c}`} style={{position: 'absolute', left: 70 + c * 70 + r * 20, top: 150 + r * 70 + (t < W(91) && Math.sin(t * 40 + c * 3 + r) > 0.7 ? 6 : 0), width: 46, height: 46, borderRadius: 23, background: '#e8e2d4', boxShadow: `0 0 0 4px ${INK}`}} />
					)),
				)}
			</div>
			<Stamp text="DECEASED" t0={W(95)} t1={t1 + 0.5} x={540} y={1130} size={110} rot={-8} />
		</AbsoluteFill>
	);
};

// ======================================================================= TWIST «He wasn't.» — the paper tears, he pops out
export const Twist: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const up = easeOut((t - W(97) + 0.05) / 0.3);
	const flash = t >= W(97) && t < W(97) + 2 / 60;
	return (
		<Shake hits={[W(97)]} amp={8}>
			<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #5a4130, #20150e 80%)'}} />
			<Letter t={t} y={900} typed={1} />
			<Stamp text="DECEASED" t0={t0 - 1} t1={t0 + 5} x={540} y={1130} size={110} rot={-8} />
			{/* the hole with ragged edge */}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<path d={Array.from({length: 28}, (_, i) => {
					const a = (i / 28) * Math.PI * 2;
					const r = 300 + (i % 2 ? 30 : -18) + Math.sin(i * 5.3) * 12;
					return `${i ? 'L' : 'M'}${540 + Math.cos(a) * r},${900 + Math.sin(a) * r * 1.12}`;
				}).join(' ') + 'Z'} fill="#0b0f16" stroke="#f6ecd4" strokeWidth={14} />
			</svg>
			<div style={{position: 'absolute', inset: 0, clipPath: 'ellipse(300px 340px at 540px 900px)'}}>
				<Con x={540} y={lerp(2300, 1960, up)} s={1.45} t={t} outfit="white" pose="finger" grin={1} />
			</div>
			{flash ? <AbsoluteFill style={{background: '#fff'}} /> : null}
		</Shake>
	);
};

// ======================================================================= how he did it (sepia flashback)
export const Checkout: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const coat = W(98) + 0.1;
	const walk = easeInOut((t - W(103)) / 1.0);
	const stampT = W(107);
	const fly = easeInOut((t - W(109)) / 0.45);
	const phase2 = t >= W(107) - 0.1;
	return (
		<AbsoluteFill style={{filter: 'sepia(0.75) saturate(1.2) contrast(1.05)'}}>
			<Cam t0={t0} t1={t1} a={1} b={1.14} dx={-50}>
				<BlockWall t={t} tone="warm" light={[540, 700]} />
				{!phase2 ? (
					<>
						{/* hospice room: bed, wall phone, nurse desk */}
						<div style={{position: 'absolute', left: 40, top: 1150, width: 470, height: 260, borderRadius: 26, background: '#f4ead8', boxShadow: `0 0 0 7px ${INK}`}} />
						<div style={{position: 'absolute', left: 820, top: 700, width: 120, height: 190, borderRadius: 16, background: '#d9d3c6', boxShadow: `0 0 0 6px ${INK}`}} />
						<div style={{position: 'absolute', left: 680, top: 1250, width: 400, height: 420, background: '#8a5834', boxShadow: `inset 0 0 0 7px ${INK}`}} />
						<div style={{position: 'absolute', left: 760, top: 1180, width: 160, height: 120, background: '#fff', boxShadow: `0 0 0 5px ${INK}`, transform: 'rotate(-6deg)'}}>
							{t > W(103) + 0.2 ? <svg width={160} height={120}><path d={`M20,80 q20,-${30 * clamp01((t - W(103) - 0.2) / 0.4)} 40,0 t40,0 t40,0`} stroke={INK} strokeWidth={5} fill="none" /></svg> : null}
						</div>
						<Con x={lerp(320, 720, walk)} y={1640} s={0.86} t={t} outfit={t < coat ? 'white' : 'doctor'} pose={t >= W(101) && t < W(103) ? 'phone' : t >= W(103) ? 'walk' : 'stand'} grin={0.8} />
						<Dust t0={coat - 0.04} x={320} y={1120} n={22} spread={500} dur={0.6} color="250,248,240" />
					</>
				) : (
					<>
						{/* outside: he stamps his own death notice, posts it to Texas */}
						<div style={{position: 'absolute', left: 640, top: 1000, width: 260, height: 420, borderRadius: '120px 120px 20px 20px', background: '#3a5ea8', boxShadow: `0 0 0 8px ${INK}`}}>
							<div style={{position: 'absolute', left: 50, top: 120, width: 160, height: 24, borderRadius: 12, background: INK}} />
							<svg width={260} height={420} style={{position: 'absolute', inset: 0}}><path d="M130,220 l14,30 33,3 -25,22 8,33 -30,-18 -30,18 8,-33 -25,-22 33,-3 Z" fill={PAL.gold} stroke={INK} strokeWidth={4} /></svg>
						</div>
						<Con x={380} y={1660} s={0.86} t={t} outfit="doctor" pose="stand" grin={1} wink={t > stampT + 0.2 ? 1 : 0} />
						<div style={{position: 'absolute', left: lerp(470, 720, fly), top: lerp(980, 1110, fly) - Math.sin(fly * Math.PI) * 200, width: 230, height: 160, background: PAL.parchment, boxShadow: `0 0 0 5px ${INK}`, transform: `rotate(${lerp(-8, 30, fly)}deg) scale(${lerp(1, 0.4, fly)})`, opacity: fly > 0.95 ? 0 : 1}}>
							{t >= stampT ? <div style={{position: 'absolute', left: 14, top: 50, ...txt(30, PAL.stamp), border: `5px solid ${PAL.stamp}`, padding: '2px 8px', transform: `rotate(-10deg) scale(${lerp(2, 1, easeOut((t - stampT) / 0.12))})`}}>DECEASED</div> : null}
						</div>
					</>
				)}
			</Cam>
		</AbsoluteFill>
	);
};

// ======================================================================= the mistake → the library
export const Wanted: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const str = clamp01((t - W(112)) / 0.4);
	const mag = easeInOut((t - W(112) - 0.2) / 0.7);
	return (
		<Cam t0={t0} t1={t1} a={1} b={1.18} cx={800} cy={720} dx={-40}>
			<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #b8875a, #6e4a2c 85%)'}} />
			{Array.from({length: 60}, (_, i) => <div key={i} style={{position: 'absolute', left: (i * 173) % 1080, top: (i * 311) % 1920, width: 8, height: 8, borderRadius: 4, background: 'rgba(60,35,15,0.35)'}} />)}
			<Sheet x={330} y={720} w={420} h={560} rot={-3}>
				<div style={{position: 'absolute', left: 0, top: 26, width: 420, textAlign: 'center', ...txt(64)}}>WANTED</div>
				<svg width={420} height={360} style={{position: 'absolute', left: 0, top: 120}}>
					<rect x={70} y={10} width={280} height={300} fill="#d9c9a6" stroke={INK} strokeWidth={5} />
					<ConHead cx={210} cy={170} r={1.25} grin={0.6} />
				</svg>
			</Sheet>
			<Sheet x={800} y={720} w={240} h={300} rot={4}>
				<div style={{position: 'absolute', left: 0, top: 30, width: 240, textAlign: 'center', fontFamily: HEAD, fontSize: 200, color: PAL.stamp}}>?</div>
			</Sheet>
			{[330, 800].map((px) => <div key={px} style={{position: 'absolute', left: px - 16, top: px === 330 ? 430 : 560, width: 32, height: 32, borderRadius: 16, background: PAL.stamp, boxShadow: `0 0 0 4px ${INK}`}} />)}
			{str > 0 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<line x1={346} y1={446} x2={lerp(346, 800, str)} y2={lerp(446, 576, str)} stroke={PAL.stamp} strokeWidth={8} />
				</svg>
			) : null}
			{mag > 0 ? (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<g transform={`translate(${lerp(300, 800, mag)} ${lerp(1150, 760, mag)})`}>
						<circle cx={0} cy={0} r={110} fill="rgba(200,230,255,0.25)" stroke={INK} strokeWidth={14} />
						<rect x={70} y={70} width={40} height={170} rx={16} fill="#3a2a20" stroke={INK} strokeWidth={6} transform="rotate(-45 90 90)" />
					</g>
				</svg>
			) : null}
		</Cam>
	);
};

/** «He couldn't stay away from the man he loved» through police binoculars: a motel at night (FACTS № 9: in Biloxi they were
 *  caught together at a motel; № 16: the police tracked him through Morris). The view pans to the one lit window, focuses; two
 *  silhouettes lean together and the light forms a heart; on «loved» red-blue lights and a police car — caught. Owner 25.10. */
export const Binoculars: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const WX = 560, WY = 900;   // window centre; the lenses are centred on screen y 860                                       // the lit window (world coordinates)
	const pan = easeInOut(clamp01((t - t0) / (W(118) - t0 + 0.1)));
	const focus = easeOut(clamp01((t - W(118)) / 0.35));
	const zoomK = easeInOut(clamp01((t - W(122) + 0.1) / 0.4));
	const z = lerp(1, 1.8, zoomK);
	const lean = easeInOut(clamp01((t - W(122)) / 0.35));
	const heart = pop(t, W(122) + 0.3, 0.4);
	const police = clamp01((t - W(124)) / 0.4);
	const red = police > 0 && Math.floor((t - W(124)) * 4) % 2 === 0;
	const neonOn = Math.sin(t * 13) > -0.6 || t > W(122);
	const car = easeOut(clamp01((t - W(124) - 0.05) / 0.5));
	const sx = lerp(-150, 0, pan) + Math.sin(t * 7.3) * 4 * (1 - zoomK * 0.5);
	const sy = Math.cos(t * 6.1) * 3;
	// two silhouettes in the window; they lean together on «man»
	const sil = (dx: number, k: number, hair: string) => (
		<g transform={`translate(${WX + dx * (1 - 0.22 * lean)} ${WY + 92}) rotate(${k * 16 * lean} 0 -40)`}>
			<path d="M-62,0 Q-60,-60 0,-66 Q60,-60 62,0 Z" fill="#1a1020" />
			<ellipse cx={0} cy={-100} rx={34} ry={40} fill="#1a1020" />
			<path d={hair} fill="#1a1020" />
		</g>
	);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			{/* the world seen through the lenses */}
			<AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) scale(${z})`, transformOrigin: `${WX}px ${WY}px`, filter: `blur(${lerp(5, 0, focus)}px)`}}>
				<AbsoluteFill style={{background: 'linear-gradient(180deg, #102445 0%, #1d3a63 60%, #22314a 100%)'}} />
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					{Array.from({length: 26}, (_, k) => <circle key={k} cx={(k * 211) % 1400 - 160} cy={(k * 97) % 300 + 450} r={k % 3 ? 2.5 : 4} fill="#fff" opacity={0.6} />)}
					<circle cx={860} cy={560} r={46} fill="#fff6d8" style={{filter: 'drop-shadow(0 0 24px #fff6d8)'}} />
					{/* palm tree */}
					<path d="M1010,1060 Q1000,900 1030,760" stroke="#05080f" strokeWidth={18} fill="none" />
					{[-60, -20, 25, 70, 120].map((a, k) => <path key={k} d="M1030,760 q60,-30 120,20" stroke="#05080f" strokeWidth={14} fill="none" strokeLinecap="round" transform={`rotate(${a} 1030 760)`} />)}
					{/* the motel: one long low block, doors and windows; only one window is lit */}
					<rect x={-300} y={780} width={1600} height={290} fill="#7a6a86" stroke={INK} strokeWidth={6} />
					<rect x={-320} y={760} width={1640} height={34} fill="#4a3f52" stroke={INK} strokeWidth={6} />
					{[-80, 140, 360, 780, 1000].map((x) => <rect key={x} x={x - 85} y={WY - 70} width={170} height={140} fill="#1b2230" stroke={INK} strokeWidth={6} />)}
					{[30, 250, 670, 890].map((x) => <rect key={x} x={x - 35} y={WY - 80} width={70} height={190} fill="#4a3f52" stroke={INK} strokeWidth={5} />)}
					<rect x={WX - 110} y={WY - 80} width={220} height={170} fill="#ffcf7a" stroke={INK} strokeWidth={7} />
					<rect x={WX - 110} y={WY - 80} width={220} height={170} fill="url(#motelGlow)" />
					<defs>
						<radialGradient id="motelGlow" cx="50%" cy="55%" r="60%">
							<stop offset="0" stopColor="#fff2cf" stopOpacity={0.9} />
							<stop offset="1" stopColor="#ff9f3a" stopOpacity={0.2} />
						</radialGradient>
					</defs>
					<clipPath id="motelWin"><rect x={WX - 104} y={WY - 74} width={208} height={158} /></clipPath>
					<g clipPath="url(#motelWin)">
						{sil(-58, 1, 'M-34,-118 Q-30,-150 6,-146 Q34,-140 34,-112 Q10,-130 -34,-118 Z')}
						{sil(58, -1, 'M-34,-112 Q-34,-148 0,-148 Q34,-148 34,-112 Q0,-128 -34,-112 Z')}
					</g>
					<line x1={WX} y1={WY - 80} x2={WX} y2={WY + 90} stroke={INK} strokeWidth={5} opacity={0.6} />
					{heart > 0 ? (
						<g transform={`translate(${WX} ${lerp(WY, WY - 150, heart)}) scale(${0.85 * heart * (t >= W(124) ? 1 + 0.08 * Math.max(0, Math.sin((t - W(124)) * 9)) : 1)})`}>
							<path d="M0,40 C-80,-30 -60,-100 0,-60 C60,-100 80,-30 0,40 Z" fill={PAL.stamp} stroke={INK} strokeWidth={5} style={{filter: 'drop-shadow(0 0 14px rgba(255,90,110,0.95))'}} />
							<path d="M-38,-58 C-52,-60 -58,-44 -50,-34" fill="none" stroke="#ff9aa6" strokeWidth={5} strokeLinecap="round" />
						</g>
					) : null}
					{/* neon MOTEL sign on a pole */}
					<rect x={118} y={680} width={14} height={90} fill="#2d2533" />
					<rect x={-5} y={600} width={250} height={92} rx={14} fill="#1b1424" stroke={INK} strokeWidth={6} />
					<text x={120} y={668} textAnchor="middle" fontFamily="Alfa Slab One" fontSize={60} fill={neonOn ? '#ff4fa3' : '#5a2a44'} style={neonOn ? {filter: 'drop-shadow(0 0 10px #ff4fa3) drop-shadow(0 0 22px #ff4fa3)'} : undefined}>MOTEL</text>
					{/* parking lot + the police car rolling in on «loved» */}
					<rect x={-300} y={1070} width={1600} height={400} fill="#262d38" />
					{car > 0 ? (
						<g transform={`translate(${lerp(1300, 760, car)} 1098)`}>
							<rect x={-140} y={-46} width={280} height={66} rx={18} fill="#f4f1ea" stroke={INK} strokeWidth={5} />
							<rect x={-80} y={-84} width={160} height={44} rx={12} fill="#1b2230" stroke={INK} strokeWidth={5} />
							<rect x={-60} y={-104} width={120} height={20} rx={6} fill={red ? '#ff3b3b' : '#3b6bff'} style={{filter: `drop-shadow(0 0 16px ${red ? '#ff3b3b' : '#3b6bff'})`}} />
							<circle cx={-86} cy={22} r={24} fill="#111" stroke={INK} strokeWidth={4} />
							<circle cx={86} cy={22} r={24} fill="#111" stroke={INK} strokeWidth={4} />
						</g>
					) : null}
				</svg>
				{police > 0 ? <AbsoluteFill style={{background: red ? `rgba(255,50,60,${0.28 * police})` : `rgba(60,120,255,${0.28 * police})`, mixBlendMode: 'screen'}} /> : null}
			</AbsoluteFill>
			{/* binocular mask: two big lenses with a soft dark edge (one blurred mask, so the overlap is not darker) */}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<defs>
					<filter id="binoSoft"><feGaussianBlur stdDeviation="22" /></filter>
					<mask id="binoMask">
						<rect x={0} y={0} width={1080} height={1920} fill="#fff" />
						<g filter="url(#binoSoft)">
							<circle cx={330} cy={860} r={505} fill="#000" />
							<circle cx={750} cy={860} r={505} fill="#000" />
						</g>
					</mask>
				</defs>
				<rect x={0} y={0} width={1080} height={1920} fill="#05070b" mask="url(#binoMask)" />
			</svg>
			<Label text="Phillip Morris" t0={W(122) + 0.35} t1={t1} x={WX + 75} y={WY - 95} anchor dx={160} dy={-150} size={44} />
		</AbsoluteFill>
	);
};

// ======================================================================= the sentence: 144 years
export const Sentence: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const g = t < W(125) + 0.05 ? -50 : 0;
	const wallT = W(128) - 0.12;
	const onWall = t >= wallT;
	return (
		<Shake hits={[W(125) + 0.05]} amp={6}>
			{!onWall ? (
				<AbsoluteFill>
					<AbsoluteFill style={{background: `linear-gradient(90deg, #1f3c7a 0 34%, #f4f1ea 34% 100%)`}} />
					<AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,0) 50%, #b01c2e 50%)`, clipPath: 'inset(0 0 0 34%)'}} />
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
						<path d="M184,520 l40,90 98,8 -74,64 24,96 -88,-52 -88,52 24,-96 -74,-64 98,-8 Z" fill="#fff" stroke={INK} strokeWidth={6} />
						<rect x={260} y={1240} width={560} height={110} rx={20} fill="#6b4f36" stroke={INK} strokeWidth={7} />
						<g transform={`rotate(${g} 760 1150)`}>
							<rect x={430} y={1130} width={360} height={40} rx={16} fill="#7a4a24" stroke={INK} strokeWidth={6} />
							<rect x={340} y={1060} width={130} height={190} rx={20} fill="#8a5834" stroke={INK} strokeWidth={7} />
						</g>
					</svg>
					{t >= W(125) + 0.05 ? <Burst x={420} y={1240} a={t - W(125) - 0.05} color="#fff" r={260} /> : null}
				</AbsoluteFill>
			) : (
				<Cam t0={wallT} t1={t1} a={1.12} b={1}>
					<BlockWall t={t} tone="cell" light={[540, 900]} />
					{Array.from({length: 7}, (_, r) => (
						<Tally key={r} t={t} n={22} t0={wallT + r * 0.12} x={70 + (r % 2) * 20} y={380 + r * 190} h={140} gap={44} stagger={0.03} glow={false} />
					))}
					<AbsoluteFill style={{background: 'rgba(8,10,16,0.35)'}} />
					<Counter from={0} to={144} t0={W(128)} t1={t1} dur={1.05} x={540} y={800} size={300} unit="years" />
				</Cam>
			)}
		</Shake>
	);
};

// ======================================================================= finale (calm, moving; dissolves into frame 0)
export const Cell: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const lit = clamp01((t - W(133)) / 0.3);
	const spin = clamp01((t - W(133)) / 1.5);
	const open = easeInOut((t - W(136)) / 0.5);
	const step = easeInOut((t - W(136) - 0.2) / 0.8);
	return (
		<Cam t0={t0} t1={t1 + 0.5} a={1} b={1.1} cy={1000}>
			<BlockWall t={t} tone="navy" light={[540, 500]} />
			{/* the wall clock: one hour (12 → 1) lights orange, the minute hand runs once around */}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<g transform="translate(540 470)">
					<circle cx={0} cy={0} r={200} fill="#f4f1ea" stroke={INK} strokeWidth={14} />
					<path d={`M0,0 L0,-180 A180,180 0 0 1 ${Math.sin(Math.PI / 6) * 180},${-Math.cos(Math.PI / 6) * 180} Z`} fill={PAL.orange} opacity={0.15 + 0.85 * lit} />
					{Array.from({length: 12}, (_, k) => <line key={k} x1={0} y1={-178} x2={0} y2={k % 3 ? -158 : -146} stroke={INK} strokeWidth={k % 3 ? 6 : 10} transform={`rotate(${k * 30})`} />)}
					<text x={0} y={-104} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={50} fill={INK}>12</text>
					<line x1={0} y1={0} x2={0} y2={-95} stroke={INK} strokeWidth={14} strokeLinecap="round" transform={`rotate(${30 * spin})`} />
					<line x1={0} y1={0} x2={0} y2={-150} stroke={INK} strokeWidth={9} strokeLinecap="round" transform={`rotate(${360 * spin})`} />
					<circle cx={0} cy={0} r={14} fill={INK} />
				</g>
			</svg>
			{/* the cell: dim inside, a bunk, him; the barred door slides open on «outside» */}
			<div style={{position: 'absolute', left: 120, top: 790, width: 840, height: 860, background: '#141b26', boxShadow: `inset 0 0 0 10px ${INK}`}}>
				<div style={{position: 'absolute', left: 40, top: 560, width: 360, height: 90, borderRadius: 16, background: '#8c97a3', boxShadow: `0 0 0 6px ${INK}`}} />
				<div style={{position: 'absolute', left: 60, top: 520, width: 300, height: 60, borderRadius: 24, background: '#e8e2d4', boxShadow: `0 0 0 5px ${INK}`}} />
			</div>
			<div style={{position: 'absolute', left: 0, top: 1650, width: 1080, height: 270, background: `linear-gradient(180deg, rgba(255,214,120,${0.55 * open}), rgba(255,214,120,${0.15 * open}))`}} />
			<div style={{position: 'absolute', left: 120, top: 790, width: 840, height: 1130, clipPath: 'polygon(0 0, 100% 0, 100% 76%, 0 76%)', background: `linear-gradient(200deg, rgba(255,214,120,${0.45 * open}) 0%, rgba(255,214,120,0) 60%)`, mixBlendMode: 'screen'}} />
			<Con x={540} y={lerp(1600, 1830, step)} s={lerp(0.78, 0.98, step)} t={t} outfit="white" pose={step > 0.05 && step < 0.95 ? 'walk' : 'stand'} pockets={step < 0.05} grin={0.35 + 0.65 * open} />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<g transform={`translate(${open * 760} 0)`}>
					<rect x={120} y={790} width={840} height={26} fill="#5d6b78" stroke={INK} strokeWidth={6} />
					<rect x={120} y={1180} width={840} height={22} fill="#5d6b78" stroke={INK} strokeWidth={6} />
					{Array.from({length: 8}, (_, k) => <rect key={k} x={140 + k * 110} y={790} width={24} height={860} fill="#5d6b78" stroke={INK} strokeWidth={6} />)}
				</g>
			</svg>
		</Cam>
	);
};

/** «Because…»: the steel door of frame 0 opens and the loop runs straight into «this man walked out…» (owner 25.10: endless video).
 *  HookArt at t < 0 = frame 0 a moment before it happens; the same camera shake as Hook / FirstFrame, so the seam is invisible. */
export const DoorLoop: React.FC<SceneProps> = () => {
	const t = useT();
	const tr = t - DURATION;
	const s0 = shake(tr, [0.02, W(6)], 8, 2.5);
	return (
		<AbsoluteFill style={{transform: `translate(${s0.x}px, ${s0.y}px) rotate(${s0.r}deg) scale(1.04)`}}>
			<HookArt t={tr} />
		</AbsoluteFill>
	);
};

/** frame 0 as a still layer for the loop dissolve (Short.tsx draws it over the last LOOP seconds) */
export const FirstFrame: React.FC = () => {
	// same camera as Hook at t = 0 (its Shake: tremor offset + scale 1.04), so the loop dissolve lands exactly on frame 0
	const s0 = shake(0, [0.02, W(6)], 8, 2.5);
	return (
		<AbsoluteFill style={{transform: `translate(${s0.x}px, ${s0.y}px) rotate(${s0.r}deg) scale(1.04)`}}>
			<HookArt t={0} />
		</AbsoluteFill>
	);
};

/** a light handheld tremor (1.5 px) on the calm story beats: flat drawn shots barely change pixels (QA M3 motion_mean) */
const hand = (C: React.FC<SceneProps>): React.FC<SceneProps> => {
	const Wrapped: React.FC<SceneProps> = (p) => (
		<Shake hits={[]} tremor={1.5}>
			<C {...p} />
		</Shake>
	);
	return Wrapped;
};

export const SCENES: Record<string, React.FC<SceneProps>> = {
	Hook, Doorman, Wall1: hand(Wall1), Wall2: hand(Wall2), Wall3: hand(Wall3), Wall4: hand(Wall4), Workman: hand(Workman), Tap, Walkout: hand(Walkout),
	Judge: hand(Judge), Bail: hand(Bail), MarkerScene: hand(MarkerScene), Doctor: hand(Doctor), Records: hand(Records), Hospice: hand(Hospice), News: hand(News),
	Twist, Checkout: hand(Checkout), Wanted: hand(Wanted), Binoculars, Sentence, Cell, DoorLoop,
};
