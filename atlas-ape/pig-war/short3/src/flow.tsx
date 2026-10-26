import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile} from 'remotion';
import {FPS, WV as Wd} from './lib/time';
import {clamp01, easeInOut, easeOut, lerp, INK, useT} from './ui/gfx';
import {Look} from './ui/real';
import {Coin, popK} from './ui/draw';
import {Marker, type SceneProps} from './scenes';

// «Flow» variant of v3 (owner 23.10: render a version with the Google Flow frames too, to compare). The drawn edit stays the
// base; only the key moments use the owner's Flow pictures / Veo clips (public/ai). Composition «ShortFlow» (Root.tsx).

export {FlowCtx, useFlow} from './lib/flowctx';

/** a Flow still full-bleed with a slow push (span = absolute window of the move, so consecutive shots continue one push) */
export const AiStill: React.FC<{src: string; t0: number; t1: number; zoom?: [number, number]; focus?: [number, number]; span?: [number, number]; dy?: number}> = ({src, t0, t1, zoom = [1.0, 1.1], focus = [0.5, 0.5], span, dy = 0}) => {
	const t = useT();
	const [a, b] = span ?? [t0, t1 + 0.5];
	const s = lerp(zoom[0], zoom[1], easeInOut((t - a) / (b - a)));
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: dy, width: '100%', height: '100%', objectFit: 'cover', transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${s})`, filter: 'saturate(1.12) contrast(1.04)'}} />
			<Look warm={0.08} vignette={0.3} />
		</AbsoluteFill>
	);
};

/** a Veo clip (720×1280) full-bleed; `from` = second in the clip shown at t0 */
export const AiClip: React.FC<{src: string; t0: number; t1: number; from?: number; zoom?: [number, number]}> = ({src, t0, t1, from = 0, zoom = [1.0, 1.06]}) => {
	const t = useT();
	const s = lerp(zoom[0], zoom[1], easeInOut((t - t0) / (t1 + 0.5 - t0)));
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
			<div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, filter: 'saturate(1.12) contrast(1.05)'}}>
				<Sequence from={Math.round(t0 * FPS)} layout="none">
					<OffthreadVideo src={staticFile(src)} startFrom={Math.round(from * FPS)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
				</Sequence>
			</div>
			<Look warm={0.06} vignette={0.28} />
		</AbsoluteFill>
	);
};

/** «Over one pig.» — the clean Flow pig (by the Hudson's Bay farmhouse; owner 23.10: not the muddy one) */
export const FlowPig: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<AiStill src="ai/C_F5_pig_british.jpg" t0={t0} t1={t1} zoom={[1.0, 1.12]} focus={[0.6, 0.55]} />
			<Marker x={655} y={1015} rx={265} ry={215} t={t} t0={Wd(9) - 0.05} />
		</AbsoluteFill>
	);
};
/** «Not over a pig.» — the same clean pig, closer; ring on «pig» */
export const FlowPig2: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<AiStill src="ai/C_F5_pig_british.jpg" t0={t0} t1={t1} zoom={[1.25, 1.4]} focus={[0.6, 0.52]} />
			<Marker x={656} y={1020} rx={300} ry={240} t={t} t0={Wd(68) - 0.05} />
		</AbsoluteFill>
	);
};
export const FlowFarmer: React.FC<SceneProps> = (p) => <AiClip src="ai/F1_veo.mp4" from={0.3} zoom={[1.0, 1.08]} {...p} />;
/** the Veo shot fires at clip 1.15 s: from 0.35 puts it at 7.87, just after the smoke wipe starts (BANG 7.82) — the hit is never seen */
export const FlowShot: React.FC<SceneProps> = (p) => <AiClip src="ai/F3_veo.mp4" from={0.35} zoom={[1.04, 1.1]} {...p} />;

const SENTRY_SPAN: [number, number] = [29.42, 33.73];
export const FlowYoung: React.FC<SceneProps> = (p) => <AiStill src="ai/C_Y1_sentries_young.jpg" zoom={[1.0, 1.16]} focus={[0.5, 0.55]} span={SENTRY_SPAN} {...p} />;
export const FlowOld: React.FC<SceneProps> = (p) => <AiStill src="ai/C_Y2_sentries_aged.jpg" zoom={[1.0, 1.16]} focus={[0.5, 0.55]} span={SENTRY_SPAN} {...p} />;

const PILE = [
	[700, 1330, 0], [590, 1290, 20], [810, 1280, -30], [640, 1410, 8], [780, 1420, 35], [540, 1390, 50], [860, 1370, -45], [710, 1210, 70], [720, 1470, 15], [610, 1180, -60],
] as const;
/** «The owner wanted a hundred.» — the owner's Flow card slams in, then the coins rain (same pile as the drawn edit) */
export const FlowOwner: React.FC<SceneProps> = ({t0}) => {
	const t = useT();
	const k = popK(t, t0 + 0.05, 0.4);
	const rain = Wd(37) - 0.05;
	return (
		<AbsoluteFill style={{background: 'radial-gradient(circle at 540px 700px, #f0424f 0%, #5c0a16 78%)'}}>
			<div style={{position: 'absolute', left: 540 - 380, top: 760 - 380, width: 760, height: 760, transform: `rotate(-3deg) scale(${k})`, borderRadius: 34, overflow: 'hidden', border: '12px solid #fffaf0', boxShadow: `0 0 0 6px ${INK}, 0 24px 50px rgba(0,0,0,0.5)`}}>
				<Img src={staticFile('ai/C_P2_owner_furious.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '40% 32%', transform: 'scale(1.15)', transformOrigin: '40% 32%'}} />
			</div>
			{PILE.map(([x, y, r], i) => {
				const ti = i === 0 ? t0 + 0.1 : rain + i * 0.06;
				if (t < ti) return null;
				const a = clamp01((t - ti) / 0.3);
				return <Coin key={i} x={x} y={lerp(-200, y, easeOut(a))} r={110} turn={lerp(2, 0, easeOut(a))} rot={r} />;
			})}
		</AbsoluteFill>
	);
};

export const FlowAngel: React.FC<SceneProps> = ({t0, t1}) => {
	const t = useT();
	return (
		<AbsoluteFill>
			<AiStill src="ai/C_E1_angel_pig.jpg" t0={t0} t1={t1} zoom={[1.04, 1.12]} focus={[0.5, 0.4]} dy={-170} />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{Array.from({length: 14}, (_, i) => {
					const x = 120 + ((i * 263) % 840), y = 240 + ((i * 419) % 900);
					const tw = 0.5 + 0.5 * Math.sin((t * 0.8 + i * 0.37) * Math.PI * 2);
					return (
						<g key={i} transform={`translate(${x} ${y}) scale(${0.4 + tw * 0.8}) rotate(${t * 40 + i * 20})`} opacity={0.5 + 0.5 * tw}>
							<path d="M0,-26 L6,-6 L26,0 L6,6 L0,26 L-6,6 L-26,0 L-6,-6 Z" fill="#fff8d8" />
						</g>
					);
				})}
			</svg>
		</AbsoluteFill>
	);
};
