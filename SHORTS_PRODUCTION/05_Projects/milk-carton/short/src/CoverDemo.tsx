import React from 'react';
import {AbsoluteFill, Freeze} from 'remotion';
import {FPS} from './lib/time';
import {Short} from './Short';
import {HEAD} from './fonts';
import {PAL} from './theme';

// Cover of the Short (standard H12): the hook frame (girl + carton with her own face under MISSING) frozen at 2.0 s (her finger on the printed face), no subtitles,
// plus a two-line headline in the channel style (white + orange, Alfa Slab One). No spoiler (H11): the purchase is not shown.
// Render: node tools/stills.mjs --comp Cover --t 0 --scale 2 --out ../../../07_Thumbnails_Covers/milk-carton. Never published as video.
export const COVER_T = 2.0;
const line: React.CSSProperties = {fontFamily: HEAD, textAlign: 'center', lineHeight: 1, WebkitTextStroke: '10px #120d18', paintOrder: 'stroke fill', textShadow: '0 10px 0 #120d18'};

export const CoverDemo: React.FC = () => (
	<AbsoluteFill>
		<Freeze frame={Math.round(COVER_T * FPS)}>
			<Short noSubs />
		</Freeze>
		<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(8,6,12,0.55) 0%, rgba(8,6,12,0) 26%)'}} />
		<AbsoluteFill style={{alignItems: 'center', paddingTop: 70}}>
			<div style={{...line, color: '#fff', fontSize: 76, whiteSpace: 'nowrap'}}>SHE FOUND HERSELF</div>
			<div style={{...line, color: PAL.orange, fontSize: 150, marginTop: 4}}>MISSING</div>
		</AbsoluteFill>
	</AbsoluteFill>
);
