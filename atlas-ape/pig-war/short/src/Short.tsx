import React from 'react';
import {AbsoluteFill, Img, getStaticFiles, staticFile} from 'remotion';
import {W, We} from './lib/time';
import {S, END, type ShotKey} from './data/shots';
import {AtlasLayer, type AtlasWin} from './ui/Atlas';
import {ImgSeq, Label, KeyFact, Layer, XF, clamp01, easeInOut, pop, useT, GOLD, INK} from './ui/gfx';
import {Subtitles} from './ui/Subtitles';
import {ANTON, MONT} from './fonts';
import mapTrack from './data/track_map.json';

// «The Pig War» (Atlas Ape #4). Story in lit 3D (Blender shots in public/blender/<shot>), one calm label at a time that adds
// what the voice does not say (a name, a number, a year), big $10 / $100, the 1860 → 1872 bar, the poll on the question.
// Atlas only in the ending (owner's rule: reaction, never decoration), above YouTube's bottom overlay.
const BIG = {x: 290, y: 1990, s: 0.7};
export const ATLAS: AtlasWin[] = [{t0: S.finale[0] + 0.3, t1: 43.15 + 0.6, ...BIG, tout: 0.5}];   // gone before the loop frame

/** subtitle centre line per shot: clear of the subject (pig / faces) and never in the bottom 15 % */
const subY = (t: number) => {
	if (t < W(7) - 0.05) return 640;                                 // hook: in the sky above the standoff (flags + pig stay clear)
	if (t < S.hook[1]) return 1480;                                  // «Over one pig»: the push-in fills the middle with the pig → below its hooves
	if (t >= S.finale[0]) return 1010;                               // between the angel's hooves and Atlas's hat (≈ 1115)
	if (t >= S.price[0] && t < S.price[1]) return 1500;
	if (t >= S.kaiser[0] && t < S.kaiser[1]) return 370;            // map + desk fill the lower half, the helmet spike starts ≈ 440
	return 1450;
};
// the big numbers replace their phrase in the subtitles (never the same thing twice)
const keySpoken = (t: number) => (t >= W(32) - 0.06 && t < We(33) + 0.15) || (t >= W(37) - 0.06 && t < We(38) + 0.2);

const LOOP_T = 43.15;
const LOOP_SRC = 'blender/hook/f_0001.jpg';
const files = new Set(getStaticFiles().map((f) => f.name));
const n = (dir: string) => {
	let k = 0;
	while (files.has(`${dir}/f_${String(k + 1).padStart(4, '0')}.jpg`)) k++;
	return k;
};

const Placeholder: React.FC<{k: string}> = ({k}) => (
	<AbsoluteFill style={{background: 'linear-gradient(180deg, #3b1a6e, #120626)', alignItems: 'center', justifyContent: 'center'}}>
		<div style={{fontFamily: MONT, fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.35)'}}>{k} (in production)</div>
	</AbsoluteFill>
);
const Blender: React.FC<{k: ShotKey}> = ({k}) => {
	const nf = n(`blender/${k}`);
	if (!nf) return <Placeholder k={k} />;
	return <ImgSeq dir={`blender/${k}`} t0={S[k][0]} n={nf} />;
};
const Shot: React.FC<{k: ShotKey; first?: boolean}> = ({k, first}) => (
	<Layer t0={S[k][0]} t1={S[k][1]} fadeIn={first ? 0 : XF}>
		<Blender k={k} />
	</Layer>
);

/** «For twelve years.» — a calm bar that fills 1860 → 1872 while the sentries' beards grow */
const YearsBar: React.FC<{t0: number; t1: number; y?: number}> = ({t0, t1, y = 330}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const o = clamp01((t - t0) / 0.25) * clamp01((t1 + 0.3 - t) / 0.3);
	const fill = easeInOut((t - t0 - 0.1) / (t1 - t0 - 0.5));
	const Wb = 640, x0 = 540 - Wb / 2;
	const year = Math.round(1860 + 12 * fill);
	return (
		<svg width={1080} height={220} style={{position: 'absolute', left: 0, top: y - 60, opacity: o, overflow: 'visible'}}>
			<rect x={x0} y={48} width={Wb} height={26} rx={13} fill="rgba(20,8,40,0.55)" stroke="#fff8ea" strokeWidth={4} />
			<rect x={x0 + 4} y={52} width={Math.max(0, (Wb - 8) * fill)} height={18} rx={9} fill={GOLD} />
			{Array.from({length: 13}, (_, i) => (
				<line key={i} x1={x0 + (Wb * i) / 12} y1={i % 12 === 0 ? 30 : 38} x2={x0 + (Wb * i) / 12} y2={44} stroke="#fff8ea" strokeWidth={4} opacity={fill * 12 >= i - 0.01 ? 1 : 0.35} />
			))}
			<text x={x0} y={112} fontFamily={MONT} fontWeight={800} fontSize={34} fill="#fff" textAnchor="middle" style={{paintOrder: 'stroke', stroke: INK, strokeWidth: 6}}>1860</text>
			<text x={x0 + Wb} y={112} fontFamily={MONT} fontWeight={800} fontSize={34} fill={year >= 1872 ? '#FFD54A' : '#fff'} textAnchor="middle" style={{paintOrder: 'stroke', stroke: INK, strokeWidth: 6}}>1872</text>
		</svg>
	);
};

/** «Team farmer, or team pig?» — two round portraits (our own renders) with a VS between; no words (the voice asks) */
const PollCard: React.FC<{t0: number; t1: number}> = ({t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1) return null;
	const k = pop(t, t0, 0.4);
	const o = clamp01((t1 - t) / 0.3);
	const side = (src: string, x: number, d: number) => {
		const ki = pop(t, t0 + d, 0.35);
		const bob = Math.sin((t - t0) * 3 + x) * 4;
		return (
			<div style={{position: 'absolute', left: x - 120, top: 30 + bob, width: 240, height: 240, borderRadius: 120, overflow: 'hidden', border: `9px solid #fffaf0`, boxShadow: `0 0 0 6px ${INK}, 0 16px 34px rgba(10,0,30,0.55)`, transform: `scale(${ki})`, background: '#cfe6ff'}}>
				{files.has(src) ? <Img src={staticFile(src)} style={{width: '100%', height: '100%'}} /> : null}
			</div>
		);
	};
	return (
		<div style={{position: 'absolute', left: 540, top: 250, width: 760, height: 300, transform: `translate(-50%, -50%) scale(${k * 0.82})`, opacity: o}}>
			{side('poll/farmer.png', 170, 0.08)}
			{side('poll/pig.png', 590, 0.2)}
			<div style={{position: 'absolute', left: 380, top: 150, transform: 'translate(-50%, -50%)', fontFamily: ANTON, fontSize: 110, color: '#fffaf0', WebkitTextStroke: `10px ${INK}`, paintOrder: 'stroke fill', letterSpacing: 2}}>VS</div>
		</div>
	);
};

/** label anchored to San Juan Island on the map (screen track from Blender, track_map.json) */
const mapPt = (t: number): [number, number] => {
	const tr = mapTrack as unknown as {t0: number; fps: number; frames: {san_juan: number[]}[]};
	if (!tr.frames.length) return [560, 900];
	const i = Math.max(0, Math.min(tr.frames.length - 1, Math.floor((t - tr.t0) * tr.fps)));
	return [tr.frames[i].san_juan[0], tr.frames[i].san_juan[1]];
};
const MapLabel: React.FC<{t0: number; t1: number}> = ({t0, t1}) => {
	const t = useT();
	if (t < t0 || t > t1 + 0.3) return null;
	const [x, y] = mapPt(t);
	return <Label text="San Juan Island" t0={t0} t1={t1} x={x} y={y} anchor dx={0} dy={-150} size={50} />;
};

export const Short: React.FC<{noSubs?: boolean}> = ({noSubs}) => {
	const t = useT();
	return (
		<AbsoluteFill style={{background: '#0b0420'}}>
			<Shot k="hook" first />
			<Shot k="caught" />
			<Shot k="shot" />
			<Shot k="british" />
			<Shot k="price" />
			<Shot k="map" />
			<Shot k="soldiers" />
			<Shot k="warships" />
			<Shot k="governor" />
			<Shot k="admiral" />
			<Shot k="stayed" />
			<Shot k="party" />
			<Shot k="kaiser" />
			<Shot k="mapfinal" />
			<Shot k="finale" />
			{/* loop: the last 0.7 s dissolve into the very first frame (the standoff over the pig) */}
			{t >= LOOP_T ? (
				<AbsoluteFill style={{opacity: easeInOut((t - LOOP_T) / (END - LOOP_T))}}>
					{files.has(LOOP_SRC) ? <Img src={staticFile(LOOP_SRC)} style={{width: '100%', height: '100%'}} /> : null}
				</AbsoluteFill>
			) : null}
			{/* one calm label at a time — only what the voice does not say */}
			<Label text="Lyman Cutlar," accent="June 1859" t0={W(11) + 0.2} t1={S.caught[1] - 0.05} x={540} y={300} size={50} />
			<KeyFact value="$10" t0={W(32) - 0.06} t1={S.price[1] - 0.2} x={810} y={700} size={160} />
			<KeyFact value="$100" t0={W(37) - 0.06} t1={S.price[1] + 0.25} x={250} y={700} size={160} />
			<MapLabel t0={W(43) - 0.1} t1={S.map[1] - 0.05} />
			<Label text="14" accent="cannons" t0={W(48) - 0.1} t1={S.soldiers[1] - 0.05} x={540} y={300} size={54} />
			<Label text="70 guns ·" accent="2,140 men" t0={W(53) - 0.1} t1={S.warships[1] + 0.2} x={540} y={300} size={54} />
			<Label text="Governor" accent="James Douglas" t0={S.governor[0] + 0.35} t1={S.governor[1] - 0.05} x={540} y={300} size={52} />
			<Label text="Rear Admiral" accent="Robert Baynes" t0={S.admiral[0] + 0.35} t1={W(65) - 0.2} x={540} y={300} size={52} />
			<YearsBar t0={W(74) - 0.3} t1={S.stayed[1] - 0.05} />
			<Label text="Kaiser" accent="Wilhelm I" t0={S.kaiser[0] + 0.35} t1={S.kaiser[1] - 0.05} x={540} y={215} size={56} />
			<Label text="Haro Strait border," accent="1872" t0={W(88) - 0.1} t1={S.mapfinal[1] - 0.05} x={540} y={300} size={50} />
			<PollCard t0={W(95) - 0.12} t1={LOOP_T + 0.45} />
			<AtlasLayer wins={ATLAS} />
			{noSubs ? null : <Subtitles y={subY} hidden={keySpoken} />}
		</AbsoluteFill>
	);
};
