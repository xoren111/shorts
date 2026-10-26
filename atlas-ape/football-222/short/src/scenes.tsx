import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {W} from './lib/time';
import {ANTON, MONT, TYPE, VARSITY} from './fonts';
import {BigText, Chip, GOLD, INK, KeyFact, Label, LightLeak, clamp01, easeInOut, easeOut, h1, lerp, pop, useT} from './ui/gfx';
import {Look} from './ui/real';
import {ArchivePhoto, Caption, CREAM, Dust, MarkerRing, PaperBg, RED, SEPIA, SpeedLines, Tag, Torn, shake} from './ui/vox';

// «222–0» scenes, one per beat (shot table: ../SCRIPT.md). Sources are MIXED (owner 23.10): Flow key shots (public/flow,
// 6 of them), real 1916 archive (public/archive, Wikimedia Commons PD, CREDITS.md) in Vox paper prints, and drawn graphics.

export type SceneProps = {t0: number; t1: number};

const FW = 1080;
const FH = 1920;
/** screen point of a normalised image point p for a full-bleed still scaled by s around focus f */
export const at = (p: [number, number], f: [number, number], s: number): [number, number] => [f[0] * FW + (p[0] - f[0]) * FW * s, f[1] * FH + (p[1] - f[1]) * FH * s];
const zoomOf = (t: number, t0: number, t1: number, z: [number, number], ease = easeInOut) => lerp(z[0], z[1], ease((t - t0) / Math.max(0.3, t1 - t0 + 0.4)));

/** a camera over a full-bleed Flow still: point (x, y) (normalised) is centred where the frame allows, zoom z ≥ 1, edges never show */
type Cam = {x: number; y: number; z: number};
const camRect = (c: Cam) => {
	const w = FW * c.z, h = FH * c.z;
	return {left: Math.min(0, Math.max(FW - w, FW / 2 - c.x * w)), top: Math.min(0, Math.max(FH - h, FH / 2 - c.y * h)), w, h};
};
const camPt = (p: [number, number], c: Cam): [number, number] => {
	const r = camRect(c);
	return [r.left + p[0] * r.w, r.top + p[1] * r.h];
};
/** eased camera between keys; v = screen speed (px/s) for motion blur on whips */
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
const CamImg: React.FC<{src: string; c: Cam & {v?: number}}> = ({src, c}) => {
	const r = camRect(c);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<Img src={staticFile(src)} style={{position: 'absolute', left: r.left, top: r.top, width: r.w, height: r.h, objectFit: 'cover', filter: `saturate(1.1) contrast(1.05) blur(${Math.min(16, (c.v ?? 0) / 260)}px)`}} />
			<Look warm={0.07} vignette={0.32} />
		</AbsoluteFill>
	);
};

/** a Flow key shot full-bleed, scaled by s around focus f (the scene computes s so overlays can track points) */
const FlowImg: React.FC<{src: string; s: number; f: [number, number]; grade?: string}> = ({src, s, f, grade = 'saturate(1.1) contrast(1.05)'}) => (
	<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
		<Img src={staticFile(src)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transformOrigin: `${f[0] * 100}% ${f[1] * 100}%`, transform: `scale(${s})`, filter: grade}} />
		<Look warm={0.07} vignette={0.32} />
	</AbsoluteFill>
);

// ---------------------------------------------------------------------------------------------------------------- HOOK
/** frame 0: the gold runner bursts at the camera through fallen maroon players — accelerating push, tremor, dust, speed lines */
export const Hook: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const f: [number, number] = [0.42, 0.32];
	// motion in second 0–1 is the swipe-away killer (viral median 23.6 on our metric): fast push + hits + handheld tremor
	const s = lerp(1.0, 1.5, Math.pow(clamp01((t - t0) / (t1 - t0 + 0.15)), 1.25));
	const sh = shake(t, [0.0, 0.36, 0.72], 30, 9);
	return (
		<AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(1.03)`}}>
			<FlowImg src="flow/A1_runner.jpg" s={s} f={f} grade="saturate(1.15) contrast(1.08)" />
			<SpeedLines t0={0} t1={t1 + 0.2} cx={470} cy={640} strength={0.45} />
			<Dust t0={0.0} x={520} y={1250} spread={1300} n={54} />
			<Dust t0={0.36} x={600} y={1150} spread={1100} n={34} dur={1.0} />
			<Dust t0={0.72} x={440} y={1050} spread={1000} n={30} dur={0.9} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------------------------------------------------- SCOREBOARD
// the REAL 1916 scoreboard (archive/game_1916_scoreboard.jpg, 2600 × 1112): GA.TECH 63 63 54 42 222 / CUMBERLAND 0 0 0 0 0
const SB = {w: 2600, h: 1112, k: 0.9};
type SbCam = {t: number; x: number; y: number; z: number};
const sbCam = (t: number, keys: SbCam[]) => {
	let i = 0;
	while (i < keys.length - 2 && t > keys[i + 1].t) i++;
	const a = keys[i], b = keys[i + 1];
	const e = easeInOut((t - a.t) / (b.t - a.t));
	return {x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: lerp(a.z, b.z, e), v: Math.abs(b.x - a.x) / (b.t - a.t) * (e > 0 && e < 1 ? Math.sin(Math.PI * e) : 0)};
};
const SB_CY = 820;
/** board image point → screen */
const sbPt = (p: [number, number], c: {x: number; y: number; z: number}): [number, number] => [540 + (p[0] - c.x) * SB.k * c.z, SB_CY + (p[1] - c.y) * SB.k * c.z];

export const RealScoreboard: React.FC<SceneProps & {keys?: SbCam[]; rings?: boolean}> = ({t0, keys, rings = true}) => {
	const t = useT();
	const K = keys ?? [
		{t: t0, x: 600, y: 556, z: 1.0},
		// the board's right edge stays on the frame edge (x = 2556 − 510 / (0.9 z)), so 222 sits right of centre
		{t: W(6), x: 1989, y: 520, z: 1.0},          // whip-pan across 63 · 63 · 54 · 42 onto 222 on «twenty-two»
		{t: W(8) - 0.08, x: 2084, y: 430, z: 1.2},   // push into 222
		{t: W(8) + 0.3, x: 2050, y: 560, z: 1.04},   // tilt down to the 0 on «nothing»
		{t: t0 + 3, x: 2040, y: 560, z: 1.1},
	];
	const c = sbCam(t, K);
	const blur = Math.min(14, c.v / 450);
	const [x0, y0] = sbPt([0, 0], c);
	const sh = shake(t, [t0 + 0.02], 18);
	const g222 = sbPt([2375, 305], c);
	const g0 = sbPt([2325, 755], c);
	return (
		<AbsoluteFill style={{background: '#0c0805', overflow: 'hidden'}}>
			<Img src={staticFile('archive/game_1916_scoreboard.jpg')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: `blur(30px) brightness(0.4) ${SEPIA}`, transform: 'scale(1.3)'}} />
			<div style={{position: 'absolute', left: x0 + sh.x, top: y0 + sh.y, width: (SB.w - 44) * SB.k * c.z, height: SB.h * SB.k * c.z, overflow: 'hidden', filter: `${SEPIA} blur(${blur}px)`, boxShadow: '0 30px 80px rgba(0,0,0,0.8)'}}>
				<Img src={staticFile('archive/game_1916_scoreboard.jpg')} style={{width: SB.w * SB.k * c.z, height: '100%'}} />
			</div>
			<Look warm={0.1} vignette={0.45} />
			{rings ? (
				<>
					<MarkerRing t0={W(6) + 0.02} cx={g222[0] + sh.x} cy={g222[1] + sh.y} rx={215 * c.z} ry={165 * c.z} color={GOLD} width={12} />
					<MarkerRing t0={W(8) + 0.12} cx={g0[0] + sh.x} cy={g0[1] + sh.y} rx={95 * c.z} ry={120 * c.z} color={RED} width={12} seed={9} />
				</>
			) : null}
			<Chip text="The real scoreboard" t0={t0 + 0.15} t1={t0 + 2.15} x={60} y={200} color={GOLD} />
			{rings ? <KeyFact value="222–0" sub="college football record" t0={W(4) - 0.04} t1={W(9) - 0.2} x={540} y={1470} size={200} /> : null}
		</AbsoluteFill>
	);
};

// --------------------------------------------------------------------------------------------------------------- BENCH
/**
 * «The losers didn't even have a team.» (owner 23.10: the ring around the ball said nothing) → a CONTRAST: first their two lonely
 * boys on the bench (Flow), then on «didn't» the frame splits — the REAL 1916 Georgia Tech squad drops in on top, the Cumberland
 * bench slides to the bottom half. One look = «they had a team, these guys didn't».
 */
export const BENCH_SPLIT = W(11) - 0.08;
export const Bench: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const k = easeInOut((t - BENCH_SPLIT) / 0.5);
	const top = lerp(0, 930, k);
	const s = zoomOf(t, t0, t1, [1.04, 1.12]);
	return (
		<AbsoluteFill>
			<PaperBg tone="rgba(70,40,10,0.35)" dim={0.6} />
			{t >= BENCH_SPLIT ? (
				<Torn t0={BENCH_SPLIT} cx={540} cy={lerp(-430, 462, k)} w={1010} h={690} rot={-1.5} seed={51} from="none" tape={k > 0.9}>
					<ArchivePhoto src="archive/game_1916_team.jpg" t0={BENCH_SPLIT} t1={t1} zoom={[1.0, 1.07]} focus={[0.5, 0.5]} />
				</Torn>
			) : null}
			<Caption text="Georgia Tech, 1916" t0={BENCH_SPLIT + 0.4} t1={t1} x={540} y={850} rot={-1.5} />
			<div style={{position: 'absolute', left: 0, top, width: 1080, height: 1920 - top, overflow: 'hidden', borderTop: k > 0 ? `10px solid ${INK}` : undefined, boxShadow: k > 0 ? '0 -16px 34px rgba(0,0,0,0.55)' : undefined}}>
				<Img src={staticFile('flow/N1_bench.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 33%', transformOrigin: '45% 32%', transform: `scale(${s})`, filter: 'saturate(1.1) contrast(1.05)'}} />
				<Look warm={0.07} vignette={0.32} />
			</div>
			<Caption text="Cumberland · football dropped in 1915" t0={BENCH_SPLIT + 0.5} t1={t1} x={540} y={1010} rot={1.5} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------------------ CONTRACT
/** a typed 1916 game agreement (drawn) under the Cumberland campus print; the red $3,000 stamp slams on «three-thousand» */
const BigStamp: React.FC<{t0: number; x: number; y: number; rot?: number}> = ({t0, x, y, rot = -12}) => {
	const t = useT();
	if (t < t0) return null;
	const k = clamp01((t - t0) / 0.11);
	const s = k < 1 ? lerp(2.8, 0.94, k * k) : 0.94 + 0.06 * easeOut((t - t0 - 0.11) / 0.2);
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`, opacity: clamp01(k * 3), border: `12px solid ${RED}`, borderRadius: 20, padding: '6px 34px 10px', textAlign: 'center', color: RED, mixBlendMode: 'multiply', background: 'rgba(232,56,47,0.06)'}}>
			<div style={{fontFamily: ANTON, fontSize: 190, lineHeight: 1, letterSpacing: 4}}>$3,000</div>
			<div style={{fontFamily: ANTON, fontSize: 62, letterSpacing: 18, marginTop: -4}}>PENALTY</div>
		</div>
	);
};
export const Contract: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const sh = shake(t, [W(22) + 0.1], 30);
	const docIn = easeOut((t - t0 - 0.05) / 0.5);
	const hl = easeOut((t - W(17)) / 0.5);
	return (
		<AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`}}>
			<PaperBg />
			<Torn t0={t0} cx={540} cy={470} w={900} h={600} rot={-3} seed={4} from="drop">
				<ArchivePhoto src="archive/cumberland_bulletin_1918.jpg" t0={t0} t1={t1} zoom={[1.05, 1.18]} focus={[0.5, 0.45]} />
			</Torn>
			<Caption text="Cumberland College" t0={t0 + 0.35} t1={t1} x={600} y={790} rot={2} />
			<div style={{position: 'absolute', left: 120, top: 860 + (1 - docIn) * 900, width: 840, height: 780, transform: `rotate(${2.5 + Math.sin((t - t0) * 0.8) * 0.4}deg)`, background: CREAM, boxShadow: '0 24px 50px rgba(40,20,0,0.5)', padding: '56px 64px', fontFamily: TYPE, color: '#2a2018'}}>
				<div style={{fontSize: 64, letterSpacing: 6, textAlign: 'center'}}>AGREEMENT</div>
				<div style={{fontSize: 40, textAlign: 'center', marginTop: 20}}>Georgia Tech vs. Cumberland</div>
				<div style={{position: 'relative', fontSize: 38, textAlign: 'center', marginTop: 14}}>
					<div style={{position: 'absolute', left: 40, top: 6, height: 44, width: 640 * hl, background: 'rgba(255,214,40,0.6)', transform: 'skewX(-8deg)'}} />
					<span style={{position: 'relative'}}>Atlanta · October 7, 1916</span>
				</div>
				{[0.92, 0.8, 0.88, 0.62, 0.9, 0.7].map((w, i) => (
					<div key={i} style={{height: 16, width: `${w * 100}%`, background: 'rgba(60,45,30,0.28)', borderRadius: 4, marginTop: i ? 26 : 54}} />
				))}
			</div>
			<BigStamp t0={W(22) + 0.02} x={560} y={1330} />
		</AbsoluteFill>
	);
};

// --------------------------------------------------------------------------------------------------------------- BRIBE
/** drawn banknotes bursting out of the envelope */
const Bills: React.FC<{t0: number; x: number; y: number; n?: number}> = ({t0, x, y, n = 9}) => {
	const t = useT();
	const a = t - t0;
	if (a < 0 || a > 2.2) return null;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
			{Array.from({length: n}, (_, i) => {
				const ang = -Math.PI / 2 + (i % 2 ? 1 : -1) * (0.6 + h1(i * 4.3) * 0.75);   // fan out left / right, never across his face
				const sp = 650 + h1(i * 2.9) * 600;
				const k = easeOut(a / 1.1);
				const px = x + Math.cos(ang) * sp * k;
				const py = y + Math.sin(ang) * sp * k + 420 * Math.max(0, a - 0.6) ** 2;
				const r = (h1(i * 8.1) - 0.5) * 120 + a * (h1(i) - 0.5) * 260;
				return (
					<g key={i} transform={`translate(${px},${py}) rotate(${r}) scale(${0.8 + h1(i * 3.3) * 0.5})`} opacity={clamp01((2.2 - a) / 0.4)}>
						<rect x={-95} y={-44} width={190} height={88} rx={6} fill="#7da36a" stroke={INK} strokeWidth={5} />
						<rect x={-80} y={-31} width={160} height={62} rx={4} fill="none" stroke="#3f6b35" strokeWidth={4} />
						<circle cx={0} cy={0} r={22} fill="#a9c98f" stroke="#3f6b35" strokeWidth={4} />
						<text x={0} y={12} textAnchor="middle" fontFamily={ANTON} fontSize={34} fill="#2d4f26">$</text>
					</g>
				);
			})}
		</svg>
	);
};
/** «The other coach even paid them five hundred bucks to show up.» — Flow: the nameless coach slides an envelope */
export const Bribe: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const f: [number, number] = [0.5, 0.66];
	const s = zoomOf(t, t0, t1, [1.02, 1.17]);
	const env = at([0.5, 0.74], f, s);
	return (
		<AbsoluteFill>
			<FlowImg src="flow/M1_coach_envelope.jpg" s={s} f={f} />
			<Bills t0={W(30) - 0.04} x={env[0]} y={env[1] - 40} />
			<LightLeak t0={W(30) - 0.1} dur={0.9} color="255,200,90" from={[200, 1200]} to={[900, 500]} strength={0.55} />
			<KeyFact value="$500" t0={W(30) - 0.04} t1={t1 - 0.1} x={540} y={205} size={170} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------------------- REVENGE
/** «Why? Revenge:» — punch into the coach's eyes, red pulse, REVENGE slams (the subtitle steps aside) */
export const Revenge: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const f: [number, number] = [0.5, 0.235];
	const s = zoomOf(t, t0, t1, [2.25, 2.7], easeOut);
	const red = clamp01((t - W(37) + 0.05) / 0.2) * (0.55 + 0.15 * Math.sin((t - t0) * 9));
	const sh = shake(t, [W(37) + 0.02], 34, 2);
	return (
		<AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(1.04)`}}>
			<FlowImg src="flow/M1_coach_envelope.jpg" s={s} f={f} grade="saturate(1.2) contrast(1.15)" />
			<AbsoluteFill style={{background: `radial-gradient(ellipse 70% 55% at 50% 45%, rgba(255,40,20,0) 30%, rgba(200,10,0,${red}) 100%)`, mixBlendMode: 'multiply'}} />
			<BigText text="REVENGE" t0={W(37) - 0.02} t1={t1 - 0.05} y={1330} size={210} color="#ff3b2f" rot={-5} glitch />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------------------ BASEBALL
/** crack lines spreading over a print from (x, y) */
const Cracks: React.FC<{t0: number; x: number; y: number; n?: number}> = ({t0, x, y, n = 9}) => {
	const t = useT();
	if (t < t0) return null;
	const k = easeOut((t - t0) / 0.35);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
			{Array.from({length: n}, (_, i) => {
				const a0 = (i / n) * Math.PI * 2 + h1(i) * 0.5;
				let px = x, py = y;
				const pts = [[px, py]];
				for (let j = 1; j <= 5; j++) {
					const a = a0 + (h1(i * 10 + j) - 0.5) * 0.9;
					const len = 40 + h1(i * 7 + j) * 70;
					px += Math.cos(a) * len; py += Math.sin(a) * len * 0.75;
					pts.push([px, py]);
				}
				const d = pts.map((p, j) => `${j ? 'L' : 'M'}${p[0].toFixed(0)},${p[1].toFixed(0)}`).join(' ');
				return (
					<g key={i}>
						<path d={d} fill="none" stroke={INK} strokeWidth={9} strokeDasharray={600} strokeDashoffset={600 * (1 - k)} strokeLinejoin="round" />
						<path d={d} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray={600} strokeDashoffset={600 * (1 - k)} strokeLinejoin="round" />
					</g>
				);
			})}
		</svg>
	);
};
/** a drawn wooden scoreboard card: rows of [name, score] in varsity letters; slams in at t0 */
export const WoodBoard: React.FC<{t0: number; t1: number; x: number; y: number; rows: [string, string][]; w?: number; scale?: number; glow?: number}> = ({t0, t1, x, y, rows, w = 860, scale = 1, glow = 0}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.25) return null;
	const k = pop(t, t0, 0.38);
	const o = clamp01((t1 + 0.25 - t) / 0.25);
	return (
		<div style={{position: 'absolute', left: x, top: y, width: w, transform: `translate(-50%,-50%) rotate(${-2 + (1 - k) * 10}deg) scale(${lerp(0.5, 1, k) * scale})`, opacity: o * clamp01(k * 3),
			background: 'linear-gradient(180deg, #6b4423, #4a2d14)', border: `8px solid ${INK}`, borderRadius: 16, padding: '22px 26px', boxShadow: `0 22px 40px rgba(0,0,0,0.6), 0 0 ${60 * glow}px rgba(255,200,60,${0.8 * glow})`}}>
			{rows.map(([name, v], i) => (
				<div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: i ? 16 : 0}}>
					<div style={{fontFamily: VARSITY, fontSize: 64, color: '#f3e6c4', letterSpacing: 2, textShadow: `0 4px 0 ${INK}`}}>{name}</div>
					<div style={{minWidth: 230, textAlign: 'center', background: '#111', border: '5px solid #2b1a0b', borderRadius: 10, fontFamily: VARSITY, fontSize: 100, lineHeight: 1.05, color: '#fff8e8', padding: '0 14px'}}>{v}</div>
				</div>
			))}
		</div>
	);
};
/** «they'd crushed his baseball team twenty-two to nothing.» — the real 1916 Tech baseball team print cracks; 22–0 board */
export const Baseball: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const sh = shake(t, [W(39) + 0.05], 26);
	const gray = clamp01((t - W(39)) / 0.3);
	return (
		<AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)`}}>
			<PaperBg />
			<Torn t0={t0} cx={540} cy={720} w={980} h={590} rot={2} seed={11}>
				<ArchivePhoto src="archive/tech_baseball_1916.jpg" t0={t0} t1={t1} zoom={[1.02, 1.14]} focus={[0.5, 0.5]} grade={`${SEPIA} grayscale(${gray * 0.6}) brightness(${1 - gray * 0.15})`} />
			</Torn>
			<Cracks t0={W(39) + 0.03} x={560} y={700} />
			<Caption text="Georgia Tech baseball, 1916" t0={t0 + 0.3} t1={t1} x={540} y={1060} rot={-1.5} />
			<WoodBoard t0={W(43) - 0.06} t1={t1} x={540} y={1360} w={820} rows={[['CUMBERLAND', '22'], ['GA. TECH', '0']]} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------------------ RECRUITS
/**
 * «So they sent law students and frat brothers.» (owner 23.10: the ovals said nothing) → the camera points instead: wide, then a
 * push onto the law student with his books + LAW STUDENTS tag, then a whip onto the frat boys in pyjamas + FRAT BROTHERS tag.
 * The subtitle of «law students and frat brothers» steps aside for the tags (Short.tsx HIDE).
 */
export const Recruits: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const LAW = W(49) - 0.02, FRAT = W(52) - 0.02;
	const c = camAt(t, [
		{t: t0, x: 0.47, y: 0.5, z: 1.04},
		{t: LAW - 0.32, x: 0.47, y: 0.5, z: 1.1},
		{t: LAW + 0.02, x: 0.22, y: 0.45, z: 1.5},
		{t: FRAT - 0.3, x: 0.22, y: 0.45, z: 1.56},
		{t: FRAT, x: 0.7, y: 0.5, z: 1.5},
		{t: t1 + 0.5, x: 0.7, y: 0.5, z: 1.62},
	]);
	const law = camPt([0.215, 0.3], c);
	const frat = camPt([0.705, 0.37], c);
	return (
		<AbsoluteFill>
			<CamImg src="flow/S1_recruits.jpg" c={c} />
			<Tag text="Law students" t0={LAW} t1={FRAT - 0.3} x={470} y={290} tx={law[0]} ty={law[1]} />
			<Tag text="Frat brothers" t0={FRAT} t1={t1} x={720} y={260} tx={frat[0]} ty={frat[1]} color="#FF6B5B" rot={2} />
		</AbsoluteFill>
	);
};

// ----------------------------------------------------------------------------------------------------------- FIRSTDOWN
/** drawn field strip: line of scrimmage, the yellow first-down line 10 yards on; the arrow never gets there */
const FieldStrip: React.FC<{t0: number; t1: number; y: number; tries: number[]; fail: number}> = ({t0, t1, y, tries, fail}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const k = easeOut((t - t0) / 0.4);
	const x0 = 190, yd = 62;           // line of scrimmage, px per yard
	const reach = tries.reduce((m, tt) => {
		const a = t - tt;
		if (a < 0 || a > 0.9) return m;
		return Math.max(m, Math.sin(Math.PI * clamp01(a / 0.9)) * (6.5 + h1(tt) * 1.5));
	}, 0);
	const xf = x0 + 10 * yd;
	const xk = clamp01((t - fail) / 0.25);
	return (
		<div style={{position: 'absolute', left: 0, top: y, width: 1080, height: 300, opacity: k * clamp01((t1 + 0.3 - t) / 0.3), transform: `translateY(${(1 - k) * 60}px)`}}>
			<svg width={1080} height={300}>
				<rect x={50} y={20} width={980} height={260} rx={18} fill="#3f8a3a" stroke={INK} strokeWidth={8} />
				{Array.from({length: 16}, (_, i) => <line key={i} x1={x0 + i * yd - 0 * yd} y1={28} x2={x0 + i * yd} y2={272} stroke="rgba(255,255,255,0.35)" strokeWidth={i % 5 === 0 ? 6 : 3} />)}
				<line x1={x0} y1={28} x2={x0} y2={272} stroke="#7fd3ff" strokeWidth={8} />
				<line x1={xf} y1={28} x2={xf} y2={272} stroke="#FFD54A" strokeWidth={12} />
				<text x={xf} y={70} textAnchor="middle" fontFamily={MONT} fontWeight={900} fontSize={34} fill="#FFD54A" stroke={INK} strokeWidth={6} paintOrder="stroke">10 YDS</text>
				{/* the run: arrow from the line of scrimmage, always short */}
				<line x1={x0} y1={170} x2={x0 + reach * yd} y2={170} stroke="#fff" strokeWidth={16} strokeLinecap="round" />
				<polygon points={`${x0 + reach * yd + 30},170 ${x0 + reach * yd - 6},146 ${x0 + reach * yd - 6},194`} fill="#fff" stroke={INK} strokeWidth={4} />
				<ellipse cx={x0 + reach * yd - 40} cy={170} rx={30} ry={19} fill="#8a4b22" stroke={INK} strokeWidth={5} />
				{xk > 0 ? (
					<g transform={`translate(${xf},170) scale(${pop(t, fail, 0.3)})`} opacity={xk}>
						<line x1={-60} y1={-60} x2={60} y2={60} stroke={RED} strokeWidth={22} strokeLinecap="round" />
						<line x1={60} y1={-60} x2={-60} y2={60} stroke={RED} strokeWidth={22} strokeLinecap="round" />
					</g>
				) : null}
			</svg>
		</div>
	);
};
/** «They never got a single first down.» — the REAL photo of this game (7 Oct 1916) + the drawn field strip */
export const FirstDown: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<PaperBg tone="rgba(70,40,10,0.35)" dim={0.6} />
			<Torn t0={t0} cx={540} cy={640} w={1000} h={660} rot={-2} seed={21}>
				<ArchivePhoto src="archive/game_1916_action.jpg" t0={t0} t1={t1} zoom={[1.02, 1.16]} focus={[0.55, 0.55]} />
			</Torn>
			<Chip text="This game · Oct 7, 1916" t0={t0 + 0.2} t1={t1 - 0.1} x={60} y={210} color={GOLD} />
			<FieldStrip t0={t0 + 0.15} t1={t1} y={1060} tries={[W(55) - 0.05, W(58) - 0.1]} fail={W(60) + 0.02} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------------------------------------------------ REPORTER
/** «A reporter joked their best play was a six-yard loss.» — the real 1919 Tribune cartoon of Grantland Rice; −6 yards */
const LossStrip: React.FC<{t0: number; t1: number; y: number}> = ({t0, t1, y}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const k = easeOut((t - t0) / 0.35);
	const back = easeInOut((t - t0 - 0.15) / 0.55);
	const x0 = 640, yd = 62;
	const xb = x0 - 6 * yd * back;
	return (
		<div style={{position: 'absolute', left: 0, top: y, width: 1080, height: 320, opacity: k * clamp01((t1 + 0.3 - t) / 0.3), transform: `translateY(${(1 - k) * 60}px)`}}>
			<svg width={1080} height={320}>
				<rect x={50} y={30} width={980} height={260} rx={18} fill="#3f8a3a" stroke={INK} strokeWidth={8} />
				{Array.from({length: 16}, (_, i) => <line key={i} x1={88 + i * yd} y1={38} x2={88 + i * yd} y2={282} stroke="rgba(255,255,255,0.35)" strokeWidth={3} />)}
				<line x1={x0} y1={38} x2={x0} y2={282} stroke="#7fd3ff" strokeWidth={8} />
				<path d={`M${x0},180 C${x0 + 120},110 ${x0 + 60},70 ${(x0 + xb) / 2},90 S${xb + 30},150 ${xb},180`} fill="none" stroke="#fff" strokeWidth={10} strokeDasharray="22 16" opacity={back} />
				<ellipse cx={xb} cy={180} rx={32} ry={20} fill="#8a4b22" stroke={INK} strokeWidth={5} />
			</svg>
			<div style={{position: 'absolute', left: xb - 20, top: -30, transform: `translateX(-50%) scale(${pop(t, t0 + 0.55, 0.3)})`, fontFamily: ANTON, fontSize: 150, color: '#ff4a3d', WebkitTextStroke: `9px ${INK}`, paintOrder: 'stroke fill', whiteSpace: 'nowrap', filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.5))'}}>−6 YDS</div>
		</div>
	);
};
export const Reporter: React.FC<SceneProps> = ({t0, t1}) => {
	return (
		<AbsoluteFill>
			<PaperBg />
			<Torn t0={t0} cx={540} cy={720} w={840} h={1040} rot={2.5} seed={31}>
				<ArchivePhoto src="archive/rice_tribune_1919.jpg" t0={t0} t1={t1} zoom={[1.5, 1.68]} focus={[0.5, 0.17]} grade="saturate(0.9) contrast(1.08) sepia(0.2)" />
			</Torn>
			<Label text="Grantland Rice," accent="sportswriter" t0={t0 + 0.3} t1={W(69) - 0.2} x={540} y={1360} size={56} />
			<LossStrip t0={W(69) - 0.12} t1={t1} y={1180} />
		</AbsoluteFill>
	);
};

// --------------------------------------------------------------------------------------------------------------- FINAL
/** «Final score: two hundred twenty-two to nothing.» — Flow: the whole team flat on the grass; the drawn board rolls to 222 */
export const Final: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const f: [number, number] = [0.58, 0.62];
	const s = zoomOf(t, t0, t1, [1.02, 1.14]);
	const roll = easeInOut((t - W(73)) / (W(75) + 0.5 - W(73)));
	const v = Math.round(222 * clamp01(roll));
	const glow = clamp01((t - W(77)) / 0.25) * (0.7 + 0.3 * Math.sin((t - t0) * 8));
	return (
		<AbsoluteFill>
			<FlowImg src="flow/G1_team_lying.jpg" s={s} f={f} />
			<WoodBoard t0={W(72) + 0.2} t1={t1} x={540} y={470} w={860} rows={[['GA. TECH', String(v)], ['CUMBERLAND', '0']]} glow={glow} />
			<Label text="32 touchdowns" t0={W(76)} t1={t1 - 0.1} x={540} y={720} size={52} />
		</AbsoluteFill>
	);
};

// -------------------------------------------------------------------------------------------------------------- REVEAL
/** «The coach? John Heisman.» — the cartoon coach in a spotlight, then a flash to the REAL John Heisman (1917 photo) */
export const Reveal: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const real = W(80) - 0.06;
	const f: [number, number] = [0.5, 0.25];
	const s = zoomOf(t, t0, real, [1.55, 1.8]);
	const burn = clamp01((t - real) / 0.35);
	return (
		<AbsoluteFill style={{background: '#0d0805'}}>
			{t < real + 0.4 ? (
				<AbsoluteFill style={{opacity: 1 - burn}}>
					<FlowImg src="flow/M1_coach_envelope.jpg" s={s} f={f} />
					<AbsoluteFill style={{background: 'radial-gradient(ellipse 45% 32% at 50% 40%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)'}} />
				</AbsoluteFill>
			) : null}
			{t >= real ? (
				<>
					<PaperBg tone="rgba(60,30,5,0.45)" dim={0.7} />
					<Torn t0={real} cx={540} cy={790} w={800} h={880} rot={-2} seed={41}>
						<ArchivePhoto src="archive/heisman_1917.jpg" t0={real} t1={t1} zoom={[1.08, 1.2]} focus={[0.5, 0.3]} />
					</Torn>
					<KeyFact value="JOHN HEISMAN" t0={real + 0.05} t1={t1 - 0.05} x={540} y={1360} size={130} />
				</>
			) : null}
			<AbsoluteFill style={{background: '#fff3d0', opacity: t >= real ? Math.pow(1 - clamp01((t - real) / 0.3), 2) * 0.9 : 0, mixBlendMode: 'screen'}} />
		</AbsoluteFill>
	);
};

// -------------------------------------------------------------------------------------------------------------- TROPHY
/** «The Heisman Trophy is named after him.» — Flow: the golden trophy (generic, not the real statue), rays + glints */
export const Trophy: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	const f: [number, number] = [0.5, 0.42];
	const s = lerp(1.3, 1.06, easeOut((t - t0) / 1.6));
	const rays = clamp01((t - t0) / 0.5);
	return (
		<AbsoluteFill>
			<FlowImg src="flow/T1_trophy.jpg" s={s} f={f} grade="saturate(1.15) contrast(1.08) brightness(1.04)" />
			<AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.55 * rays}}>
				<svg width={1080} height={1920}>
					{Array.from({length: 14}, (_, i) => {
						const a = (i / 14) * Math.PI * 2 + (t - t0) * 0.25;
						return <polygon key={i} points={`540,760 ${540 + Math.cos(a) * 1600},${760 + Math.sin(a) * 1600} ${540 + Math.cos(a + 0.12) * 1600},${760 + Math.sin(a + 0.12) * 1600}`} fill="rgba(255,210,110,0.22)" />;
					})}
				</svg>
			</AbsoluteFill>
			{[0.15, 0.55, 0.95, 1.35].map((d, i) => {
				const a = t - t0 - d;
				if (a < 0 || a > 0.5) return null;
				const k = Math.sin(Math.PI * a / 0.5);
				const p = [[610, 560], [430, 820], [650, 1000], [500, 640]][i];
				return (
					<svg key={i} width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
						<g transform={`translate(${p[0]},${p[1]}) rotate(${a * 120}) scale(${k})`}>
							<polygon points="0,-60 12,-12 60,0 12,12 0,60 -12,12 -60,0 -12,-12" fill="#fffbe8" />
						</g>
					</svg>
				);
			})}
			<LightLeak t0={t0} dur={1.2} color="255,190,80" from={[-200, 500]} to={[1300, 1100]} strength={0.6} />
		</AbsoluteFill>
	);
};
