import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {S} from '../data/shots';
import {Duotone, Label, XF, clamp01, easeInOut, lerp, useT} from '../ui/gfx';

// Real archive images (STYLE v3: gentle Ken Burns ≤ 8 %, fade in, no rotation, no punch-ins). Credits: CREDITS.md / description.

const Blurred: React.FC<{src: string; dim?: number; duo?: boolean}> = ({src, dim = 0.45, duo}) => (
	<>
		<Img src={staticFile(src)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: `blur(40px) brightness(${dim}) saturate(1.1)${duo ? ' grayscale(1)' : ''}`, transform: 'scale(1.25)'}} />
		{duo ? <Duotone /> : null}
		<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 30%, rgba(8,2,26,0.8) 100%)'}} />
	</>
);

/** S7a «Louis Pasteur entered.» — Paul Nadar's portrait, slow push-in */
export const PasteurScene: React.FC = () => {
	const t = useT();
	const [t0, t1] = S.pasteur;
	const k = clamp01((t - t0) / (t1 + XF - t0));
	return (
		<AbsoluteFill style={{background: '#0b0420', overflow: 'hidden'}}>
			<Img src={staticFile('photos/pasteur.jpg')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%', filter: 'grayscale(1) contrast(1.15)', transform: `scale(${lerp(1.02, 1.09, easeInOut(k))})`, transformOrigin: '50% 30%'}} />
			<Duotone />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0) 40%, rgba(8,2,26,0.75) 100%)'}} />
			<Label text="He sent his team to Sydney" t0={t0 + 0.35} t1={t1 + 0.1} x={540} y={1210} size={50} />
		</AbsoluteFill>
	);
};

/** S11a «Round two: a fence.» — the real 1926 photo of Fence No. 1 running to the horizon */
export const Fence1926Scene: React.FC = () => {
	const t = useT();
	const [t0, t1] = S.fence1926;
	const k = clamp01((t - t0) / (t1 + XF - t0));
	return (
		<AbsoluteFill style={{background: '#0b0420', overflow: 'hidden'}}>
			<Img src={staticFile('photos/fence1926.jpg')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '74% 50%', filter: 'grayscale(1) contrast(1.2)', transform: `scale(${lerp(1.0, 1.08, easeInOut(k))})`, transformOrigin: '78% 30%'}} />
			<Duotone />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(8,2,26,0.35) 0%, rgba(8,2,26,0) 30%, rgba(8,2,26,0) 65%, rgba(8,2,26,0.55) 100%)'}} />
			<Label text="Rabbit-Proof Fence No. 1" sub="photo, 1926" t0={t0 + 0.35} t1={t1 + 0.1} x={540} y={330} size={54} />
		</AbsoluteFill>
	);
};

/** abstract virus glyph (steady glow, no blinking) */
export const VirusGlyph: React.FC<{x: number; y: number; r: number; o?: number}> = ({x, y, r, o = 1}) => (
	<g transform={`translate(${x}, ${y})`} opacity={o}>
		<circle r={r * 1.5} fill="rgba(190,90,255,0.25)" />
		{Array.from({length: 10}, (_, i) => {
			const a = (i / 10) * Math.PI * 2;
			return (
				<g key={i}>
					<line x1={Math.cos(a) * r * 0.8} y1={Math.sin(a) * r * 0.8} x2={Math.cos(a) * r * 1.3} y2={Math.sin(a) * r * 1.3} stroke="#120818" strokeWidth={r * 0.2} strokeLinecap="round" />
					<line x1={Math.cos(a) * r * 0.8} y1={Math.sin(a) * r * 0.8} x2={Math.cos(a) * r * 1.3} y2={Math.sin(a) * r * 1.3} stroke="#C77DFF" strokeWidth={r * 0.11} strokeLinecap="round" />
					<circle cx={Math.cos(a) * r * 1.33} cy={Math.sin(a) * r * 1.33} r={r * 0.14} fill="#E9C6FF" stroke="#120818" strokeWidth={r * 0.06} />
				</g>
			);
		})}
		<circle r={r * 0.85} fill="#9B4DFF" stroke="#120818" strokeWidth={r * 0.1} />
		<circle cx={-r * 0.25} cy={-r * 0.25} r={r * 0.22} fill="#D9B3FF" />
	</g>
);
