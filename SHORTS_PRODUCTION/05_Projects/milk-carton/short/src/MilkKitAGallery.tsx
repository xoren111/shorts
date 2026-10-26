import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {PAL} from './theme';
import {FPS} from './lib/time';
import {INK, clamp01, easeInOut, easeOut, lerp} from './ui/gfx';
import {
	cartonEyes,
	CutoutG,
	DadBack,
	DollCase,
	DollCaseG,
	FACE,
	Girl,
	GirlBust,
	girlFacePt,
	GirlPeek,
	Hand,
	HandG,
	handTip,
	JacketChair,
	KidPhotoG,
	ManSil,
	MilkCarton,
	MilkCartonG,
	Neighbor,
	NoticeG,
	PhotoPrintG,
	placePt,
	Police,
	ScissorsG,
	Toddler,
} from './ui/milk_a';
import type {GirlExpr, GirlHand, GirlPose, HandGesture, HandKind} from './ui/milk_a';

// milk-carton draw kit A preview (test composition, never published): one screen per group, ≈ 1 s each, everything moving.
// Contact sheet: node tools/stills.mjs --comp MilkKitA --t 0.5,1.5,…,13.5 --out out/stills/kitA
//   0 expressions   1 bust gestures   2 frame-0 recipe (carton + stepdad hand, eye match)   3 full-body poses
//   4 peek + toddler flashback   5 carton views   6 cut / hole / cutout   7 photos   8 man's hand gestures
//   9 other hands   10 scissors + doll case   11 neighbour   12 stepdad shapes + empty jacket   13 dad + police
export const MILK_KIT_A_S = 14;

const Tag: React.FC<{text: string; x?: number; y?: number; size?: number; center?: boolean}> = ({text, x = 40, y = 40, size = 34, center}) => (
	<div
		style={{
			position: 'absolute',
			left: x,
			top: y,
			transform: center ? 'translateX(-50%)' : undefined,
			fontFamily: 'Montserrat',
			fontWeight: 800,
			fontSize: size,
			color: '#fff',
			letterSpacing: 1,
			whiteSpace: 'nowrap',
			textShadow: `0 3px 0 ${INK}, 0 0 8px ${INK}`,
		}}
	>
		{text}
	</div>
);
const Navy: React.FC = () => <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${PAL.navy2} 0%, ${PAL.navy} 75%)`}} />;
const Panel: React.FC<{y: number; h: number; bg?: string; children: React.ReactNode}> = ({y, h, bg, children}) => (
	<div style={{position: 'absolute', left: 0, top: y, width: 1080, height: h, overflow: 'hidden', background: bg}}>
		<div style={{position: 'absolute', left: 0, top: -y, width: 1080, height: 1920}}>{children}</div>
	</div>
);
/** a full-frame svg layer for the G components */
const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
		{children}
	</svg>
);
const bump = (x: number, c: number, d: number) => {
	const u = (x - c + d / 2) / d;
	return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
};

// 0 ── expressions
const EXPRS: GirlExpr[] = ['wonder', 'shock', 'curious', 'sad', 'smile', 'blank'];
const Expressions: React.FC<{t: number}> = ({t}) => (
	<>
		<Navy />
		<Tag text="kit A · Girl bust · expressions (blink, turn, breathe)" size={28} />
		{EXPRS.map((e, i) => {
			const x = i % 2 ? 810 : 270;
			const y = 660 + Math.floor(i / 2) * 600;
			return (
				<React.Fragment key={e}>
					<GirlBust x={x} y={y} s={0.56} t={t + i * 0.7} expr={e} turn={Math.sin(t * 2.4 + i) * 0.35} look={[Math.sin(t * 3 + i) * 0.5, 0]} seed={i} />
					<Tag text={e} x={x} y={y - 60} size={30} center />
				</React.Fragment>
			);
		})}
	</>
);

// 1 ── bust gestures
const Gestures: React.FC<{t: number}> = ({t}) => {
	const lt = t - 1;
	const hk = easeOut(clamp01(lt / 0.35));
	const tap = bump(lt, 0.6, 0.18) + bump(lt, 0.82, 0.18);
	const G: {hand: GirlHand; side: -1 | 1; label: string; expr: GirlExpr; aim?: [number, number]; talk?: number; item?: React.ReactNode}[] = [
		{hand: 'cheek', side: -1, label: 'cheek (tap)', expr: 'wonder'},
		{hand: 'chest', side: -1, label: 'chest', expr: 'curious'},
		{hand: 'point', side: 1, label: 'point · aim', expr: 'wonder', aim: [380, -640]},
		{hand: 'lips', side: -1, label: 'lips + talk (reading)', expr: 'curious', talk: 1},
		{
			hand: 'hold',
			side: 1,
			label: 'hold carton at cheek',
			expr: 'smile',
			aim: [262, -470],
			item: (
				<g transform="translate(190 -383) scale(0.36)">
					<MilkCartonG t={t} lw={16} />
				</g>
			),
		},
		{hand: 'trace', side: 1, label: 'trace · aim moves', expr: 'curious', aim: [lerp(200, 400, clamp01(lt)), -700], talk: 1},
	];
	return (
		<>
			<Navy />
			<Tag text="kit A · Girl bust · hand gestures (handK, tap, aim)" size={28} />
			{G.map((g, i) => {
				const x = i % 2 ? 790 : 250;
				const y = 660 + Math.floor(i / 2) * 600;
				return (
					<React.Fragment key={g.label}>
						<GirlBust x={x} y={y} s={0.52} t={t} expr={g.expr} hand={g.hand} side={g.side} handK={hk} tap={g.hand === 'cheek' || g.hand === 'chest' ? tap : 0} aim={g.aim} talk={g.talk} item={g.item} turn={g.side * 0.2} seed={i} />
						<Tag text={g.label} x={x} y={y - 46} size={26} center />
					</React.Fragment>
				);
			})}
		</>
	);
};

// 2 ── frame-0 recipe: the man's hand swings the carton up beside her cheek, printed eyes meet hers, finger to cheek
const FrameZero: React.FC<{t: number}> = ({t}) => {
	const lt = t - 2;
	const k = easeOut(clamp01(lt / 0.45));
	const bx = 380;
	const by = 1560;
	const bs = 1.5;
	const o = {lean: k, turn: 0.45, t};
	const eyeL = girlFacePt(FACE.eyes[0], o);
	const eyeR = girlFacePt(FACE.eyes[1], o);
	const eyeY = by + ((eyeL[1] + eyeR[1]) / 2) * bs;
	const ce = cartonEyes('front');
	const cs = 0.62;
	const fx = 860;
	const fy = eyeY - ((ce[0][1] + ce[1][1]) / 2) * cs;
	const cx = lerp(1250, fx, k);
	const cy = lerp(2050, fy, k) + Math.sin(t * 5) * 4;
	const rot = lerp(38, 0, k) + Math.sin(t * 4) * 1.2;
	const tap = bump(lt, 0.78, 0.16) + bump(lt, 0.94, 0.12);
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #DCEFF5 0%, #9CC6D6 60%, #5E8EA8 100%)'}} />
			<GirlBust x={bx} y={by} s={bs} t={t} expr="wonder" wide={k} turn={0.45} lean={k} look={[0.7, 0]} hand="cheek" handK={clamp01((lt - 0.5) / 0.25)} tap={tap} blink={false} />
			<MilkCarton x={cx} y={cy} s={cs} rot={rot} t={t} hand={{kind: 'man', side: 1, glint: bump(lt, 0.3, 0.3)}} />
			<div style={{position: 'absolute', left: 0, top: eyeY - 2, width: 1080, height: 4, background: PAL.orange, opacity: k > 0.95 ? 0.8 : 0}} />
			<Tag text="kit A · frame 0: carton swings in, eyes line up, finger to cheek" size={26} />
			<Tag text={`k ${k.toFixed(2)} · orange line = her eyes = printed eyes`} x={40} y={1800} size={26} />
		</>
	);
};

// 3 ── full body
const FULL: {pose: GirlPose; label: string; carry?: 'case'; flip?: boolean}[] = [
	{pose: 'stand', label: 'stand'},
	{pose: 'walk', label: 'walk'},
	{pose: 'skip', label: 'skip + case', carry: 'case'},
	{pose: 'run', label: 'run, case hugged', carry: 'case'},
	{pose: 'toss', label: 'toss (k)'},
	{pose: 'hold', label: 'hold item'},
	{pose: 'point', label: 'point'},
	{pose: 'walk', label: 'walk · flip', flip: true},
];
const FullBody: React.FC<{t: number}> = ({t}) => {
	const lt = t - 3;
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #16304D 0%, #2F5E86 55%, #9CC3CF 100%)'}} />
			<Tag text="kit A · Girl full body (640 units, s 0.42)" size={28} />
			{FULL.map((f, i) => {
				const x = 190 + (i % 3) * 350;
				const y = 600 + Math.floor(i / 3) * 560;
				return (
					<React.Fragment key={f.label}>
						<div style={{position: 'absolute', left: x - 150, top: y - 2, width: 300, height: 8, background: '#4C6A2B', borderRadius: 4}} />
						<Girl
							x={x}
							y={y}
							s={0.42}
							t={t}
							pose={f.pose}
							k={clamp01(lt / 0.7)}
							carry={f.carry}
							flip={f.flip}
							expr={f.pose === 'run' ? 'shock' : f.pose === 'toss' ? 'blank' : 'smile'}
							item={
								f.pose === 'hold' ? (
									<g transform="translate(0 -250) scale(0.2)">
										<MilkCartonG t={t} lw={40} />
									</g>
								) : undefined
							}
						/>
						<Tag text={f.label} x={x} y={y + 16} size={26} center />
					</React.Fragment>
				);
			})}
		</>
	);
};

// 4 ── peek + toddler
const PeekToddler: React.FC<{t: number}> = ({t}) => {
	const lt = t - 4;
	return (
		<>
			<Panel y={0} h={960} bg="#2A2420">
				<GirlPeek x={520} y={470} s={0.78} t={t} peek={easeInOut(clamp01(lt / 0.6))} expr="sad" />
				<Tag text="kit A · GirlPeek (peek 0→1) · Toddler" size={28} />
			</Panel>
			<Panel y={960} h={960} bg="#E9DCC0">
				<Toddler x={300} y={1820} s={0.78} t={t} walk={1} armL={1} armR={1} adultL="mom" adultR="man" />
				<Toddler x={760} y={1820} s={0.78} t={t + 0.3} walk={1} armR={1} adultR="man" tone="sepia" />
				<Toddler x={880} y={1300} s={0.5} t={t} walk={1} tone="sil" />
				<Toddler x={180} y={1300} s={0.5} t={t} armL={clamp01(lt / 0.5)} armR={clamp01(lt / 0.5)} expr="wonder" />
				<Tag text="mom + man hold her hands" x={300} y={1840} size={24} center />
				<Tag text="sepia" x={760} y={1840} size={24} center />
				<Tag text="sil" x={880} y={1320} size={24} center />
				<Tag text="arms up (armL / armR)" x={180} y={1320} size={24} center />
			</Panel>
		</>
	);
};

// 5 ── carton views
const Cartons: React.FC<{t: number}> = ({t}) => {
	const lt = t - 5;
	const sweep = [0, 1, 2, 3, 4, 5, 6].map((i) => clamp01(lt * 9 - i));
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #CFE6EE 0%, #8DB7C9 100%)'}} />
			<Tag text="kit A · MilkCarton: wriggle · lit · hand · spout · dim" size={28} />
			<MilkCarton x={280} y={900} s={0.66} t={t} wriggle={sweep} rot={Math.sin(t * 3) * 2} />
			<Tag text="wriggle per letter" x={280} y={920} size={26} center />
			<MilkCarton x={730} y={900} s={0.6} t={t} view="three4" lit={lt * 8} hand={{kind: 'man', side: 1, at: 0.45}} />
			<Tag text="3/4 · lit 0→7 · man's hand" x={730} y={920} size={26} center />
			<MilkCarton x={280} y={1780} s={0.6} t={t} open={clamp01(lt * 2)} tilt={Math.sin(t * 4) * 6} squash={Math.max(0, Math.sin(t * 8)) * 0.15} />
			<Tag text="open spout · tilt · squash" x={280} y={1800} size={26} center />
			<MilkCarton x={760} y={1780} s={0.6} t={t} kid={3} dim={clamp01(lt * 1.4)} />
			<Tag text="generic kid · dim" x={760} y={1800} size={26} center />
		</>
	);
};

// 6 ── cut, hole, cutout
const Cutting: React.FC<{t: number}> = ({t}) => {
	const lt = t - 6;
	const lift = easeOut(clamp01(lt / 0.8));
	return (
		<>
			<AbsoluteFill style={{background: '#C9A97C'}} />
			<Tag text="kit A · cut line · hole · Cutout (curl, magnet, back, nameHi)" size={26} />
			<MilkCarton x={270} y={860} s={0.58} t={t} cut={lt} rot={-6} />
			<Svg>
				<g transform={`translate(${lerp(170, 390, clamp01(lt * 1.3))} ${lerp(370, 420, clamp01(lt))}) rotate(-60) scale(0.7)`}>
					<ScissorsG open={0.5 + 0.5 * Math.sin(t * 24)} lw={11} />
				</g>
			</Svg>
			<Tag text="cut 0→1 (snips)" x={270} y={880} size={24} center />
			<MilkCarton x={790} y={860} s={0.58} t={t} hole={1} />
			<Svg>
				<g transform={`translate(${790 + lift * 60} ${686 - lift * 220}) rotate(${lerp(0, 14, lift)}) scale(${0.58 * (1 + 0.1 * lift)})`}>
					<CutoutG t={t} lw={9} shadow={lift} />
				</g>
				<g transform={`translate(210 1420) rotate(-4) scale(0.62)`}>
					<CutoutG t={t} curl={clamp01(lt * 1.5)} lw={9} />
				</g>
				<g transform={`translate(540 1420) rotate(3) scale(0.62)`}>
					<CutoutG t={t} magnet={clamp01(lt * 2.2)} nameHi={clamp01((lt - 0.3) * 1.6)} lw={9} />
				</g>
				<g transform={`translate(870 1420) rotate(-2) scale(0.62)`}>
					<CutoutG t={t} back lw={9} />
				</g>
			</Svg>
			<Tag text="hole + cutout lifts" x={790} y={880} size={24} center />
			<Tag text="curl" x={210} y={1610} size={24} center />
			<Tag text="magnet · nameHi" x={540} y={1610} size={24} center />
			<Tag text="back" x={870} y={1610} size={24} center />
		</>
	);
};

// 7 ── photos
const Photos: React.FC<{t: number}> = ({t}) => {
	const lt = t - 7;
	return (
		<>
			<AbsoluteFill style={{background: '#2B3A4E'}} />
			<Tag text="kit A · KidPhotoG (her = mirror copy, generic kids) · PhotoPrint · Notice" size={24} />
			<Svg>
				<g transform={`translate(230 380) rotate(${Math.sin(t * 2) * 2})`}>
					<KidPhotoG w={300} h={330} t={t} spark={bump(lt, 0.5, 0.5)} />
				</g>
				<g transform={`translate(620 390) rotate(${-6 + Math.sin(t * 2.4) * 2})`}>
					<PhotoPrintG w={300} young tone="sepia" t={t} />
				</g>
				<g transform={`translate(910 390) rotate(${5 + Math.sin(t * 2.1) * 2})`}>
					<PhotoPrintG w={240} tone="color" t={t} />
				</g>
				{[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
					<g key={n} transform={`translate(${130 + (n % 4) * 270} ${760 + Math.floor(n / 4) * 260}) rotate(${Math.sin(t * 3 + n) * 2})`}>
						<KidPhotoG w={190} h={210} kid={n} t={t} />
					</g>
				))}
				<g transform={`translate(540 1530) scale(${1.15 + 0.03 * Math.sin(t * 3)})`}>
					<NoticeG t={t} lit={clamp01(lt) * 8} spark={bump(lt, 0.7, 0.4)} lw={7} />
				</g>
			</Svg>
			<Tag text="her (spark)" x={230} y={560} size={22} center />
			<Tag text="toddler print (sepia)" x={620} y={590} size={22} center />
			<Tag text="generic kids (no real faces)" x={540} y={1140} size={22} center />
		</>
	);
};

// 8 ── man's hand gestures
const MAN: {g: HandGesture; label: string; to?: HandGesture; rot?: number; flip?: boolean}[] = [
	{g: 'grab', label: 'grab'},
	{g: 'point', label: 'point (tap)'},
	{g: 'open', label: 'open'},
	{g: 'grab', to: 'drop', label: 'grab → drop (k)'},
	{g: 'rest', label: 'rest', rot: 150},
	{g: 'offer', label: 'offer (flip, rot 90)', rot: 90, flip: true},
	{g: 'fist', label: 'fist'},
	{g: 'pinch', label: 'pinch'},
	{g: 'hold', label: 'hold (rot 180)', rot: 180},
];
const ManHands: React.FC<{t: number}> = ({t}) => {
	const lt = t - 8;
	const tap = bump(lt, 0.4, 0.2) + bump(lt, 0.7, 0.2);
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #F3EAD6 0%, #D9C8A6 100%)'}} />
			<Tag text="kit A · Hand kind='man' (cuff + gold watch) · gestures" size={28} />
			{MAN.map((m, i) => {
				const x = 190 + (i % 3) * 350;
				const y = 560 + Math.floor(i / 3) * 560 + (m.rot === 180 ? -260 : m.rot === 150 ? -240 : 0) - (m.g === 'point' ? tap * 20 : 0);
				return (
					<React.Fragment key={m.label}>
						<Hand x={x + (m.rot === 90 ? -110 : 0)} y={y} s={0.62} rot={(m.rot ?? 0) + Math.sin(t * 3 + i) * 3} flip={m.flip} kind="man" gesture={m.g} to={m.to} k={clamp01(lt / 0.6)} tap={m.g === 'point' ? tap : 0} t={t} arm={320} glint={i === 0 ? bump(lt, 0.5, 0.5) : 0} />
						<Tag text={m.label} x={x} y={560 + Math.floor(i / 3) * 560 + 40} size={24} center />
					</React.Fragment>
				);
			})}
			<Svg>
				{(() => {
					const tip = placePt(handTip('man', 'point'), {x: 540, y: 560 - tap * 20, s: 0.62, rot: Math.sin(t * 3 + 1) * 3});
					return <circle cx={tip[0]} cy={tip[1]} r={10} fill="none" stroke={PAL.orange} strokeWidth={4} />;
				})()}
			</Svg>
		</>
	);
};

// 9 ── other kinds
const KINDS: {kind: HandKind; g: HandGesture; label: string; rot?: number; flip?: boolean; s?: number}[] = [
	{kind: 'mom', g: 'open', label: 'mom · bangles (glint)'},
	{kind: 'dad', g: 'offer', label: 'dad · checked sleeve', rot: 90, flip: true},
	{kind: 'kid', g: 'point', label: 'kid', s: 1},
	{kind: 'toddler', g: 'grab', label: 'toddler', s: 1.3},
	{kind: 'neighbor', g: 'pinch', label: 'neighbor · cardigan'},
	{kind: 'cop', g: 'rest', label: 'cop · navy sleeve'},
];
const OtherHands: React.FC<{t: number}> = ({t}) => {
	const lt = t - 9;
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #EFE3C8 0%, #CDB993 100%)'}} />
			<Tag text="kit A · Hand kinds" size={28} />
			{KINDS.map((m, i) => {
				const x = 270 + (i % 2) * 540;
				const y = 600 + Math.floor(i / 2) * 560;
				return (
					<React.Fragment key={m.label}>
						<Hand x={x + (m.rot === 90 ? -150 : 0)} y={y} s={0.8 * (m.s ?? 1)} rot={(m.rot ?? 0) + Math.sin(t * 3 + i) * 4} flip={m.flip} kind={m.kind} gesture={m.g} t={t} arm={380} glint={m.kind === 'mom' ? bump(lt, 0.5, 0.6) : 0} />
						<Tag text={m.label} x={x} y={y + 40} size={24} center />
					</React.Fragment>
				);
			})}
		</>
	);
};

// 10 ── scissors + doll case
const ScissorsCase: React.FC<{t: number}> = ({t}) => {
	const lt = t - 10;
	const open = lt < 0.25 ? lt / 0.25 : lt < 0.62 ? 1 : 1 - clamp01((lt - 0.62) / 0.18);
	const cut = clamp01((lt - 0.18) / 0.42);
	const snap = lt - 0.8;
	const latch = lt < 0.08 ? 1 - lt / 0.08 : lt < 0.8 ? 1 : 1 - clamp01((lt - 0.84) / 0.08);
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #F6E6EE 0%, #E2C3D3 100%)'}} />
			<Tag text="kit A · Scissors (open, hand) · DollCase (open, cutout, snap, latch, carry)" size={24} />
			<Svg>
				<g transform={`translate(300 560) rotate(-20) scale(1.05)`}>
					<ScissorsG open={0.5 + 0.5 * Math.sin(t * 18)} hand lw={8} />
				</g>
				<g transform={`translate(780 560) rotate(25) scale(1)`}>
					<ScissorsG open={clamp01(lt * 1.2)} lw={8} />
				</g>
			</Svg>
			<Tag text="hand · snip" x={300} y={820} size={24} center />
			<Tag text="open 0→1" x={780} y={820} size={24} center />
			<DollCase x={330} y={1560} s={0.9} t={t} open={open} cutout={cut > 0 ? cut : -1} snap={snap} latch={latch} />
			<Tag text={`open ${open.toFixed(2)} · cutout ${cut.toFixed(2)}`} x={330} y={1590} size={24} center />
			<DollCase x={820} y={1220} s={0.5} t={t} open={0.5} latch={1} />
			<Tag text="open 0.5" x={820} y={1240} size={22} center />
			<Svg>
				<g transform={`translate(820 1480) rotate(${Math.sin(t * 5) * 10}) scale(0.5) translate(0 372)`}>
					<DollCaseG view="carry" t={t} lw={16} />
				</g>
			</Svg>
			<Tag text="carry (swing at handle)" x={820} y={1720} size={22} center />
		</>
	);
};

// 11 ── neighbour
const Neighbours: React.FC<{t: number}> = ({t}) => {
	const lt = t - 11;
	const item = (
		<g transform="scale(0.42)">
			<CutoutG t={t} lw={19} shadow={0.3} />
		</g>
	);
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #E8DCC4 0%, #C4B08C 100%)'}} />
			<Tag text="kit A · Neighbor: hold · read · gasp · phone · back" size={28} />
			<Neighbor x={270} y={700} s={0.52} t={t} pose="hold" item={item} itemW={80} />
			<Neighbor x={810} y={700} s={0.52} t={t} pose="read" k={clamp01(lt)} item={item} itemW={80} />
			<Neighbor x={270} y={1300} s={0.52} t={t} pose="gasp" k={clamp01(lt * 2.5)} item={item} itemW={80} />
			<Neighbor x={810} y={1300} s={0.52} t={t} pose="phone" item={item} itemW={80} />
			<Neighbor x={540} y={1910} s={0.52} t={t} pose="back" item={item} itemW={80} />
			<Tag text="hold" x={270} y={720} size={24} center />
			<Tag text="read (finger slides)" x={810} y={720} size={24} center />
			<Tag text="gasp" x={270} y={1320} size={24} center />
			<Tag text="phone" x={810} y={1320} size={24} center />
			<Tag text="back (over the shoulder)" x={540} y={1460} size={24} center />
		</>
	);
};

// 12 ── stepdad shapes + the empty jacket
const Shapes: React.FC<{t: number}> = ({t}) => {
	const lt = t - 12;
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #E9F3F7 0%, #BFD9E4 100%)'}} />
			<Tag text="kit A · ManSil (hush shadow, low coat) · JacketChair" size={28} />
			<ManSil x={330} y={960} s={0.62} t={t} view="hush" hush={clamp01(lt * 1.6)} opacity={0.8} soft={1} />
			<Tag text="hush 0→1 (shadow)" x={330} y={980} size={24} center />
			<div style={{position: 'absolute', left: 560, top: 120, width: 520, height: 860, background: 'radial-gradient(ellipse at 50% 30%, #FFFFFF 0%, #DDF2FF 40%, #6E8AA6 100%)'}} />
			<ManSil x={820} y={1010} s={0.46} t={t} view="low" />
			<Tag text="low + watch hand" x={820} y={1030} size={24} center />
			<JacketChair x={540} y={1820} s={0.72} t={t} tone="sepia" />
			<Tag text="empty jacket on a chair (sepia)" x={540} y={1840} size={24} center />
		</>
	);
};

// 13 ── dad + police
const DadPolice: React.FC<{t: number}> = ({t}) => {
	const lt = t - 13;
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #2A3B55 0%, #51698A 100%)'}} />
			<Tag text="kit A · DadBack (crouch, reach) · Police" size={28} />
			<DadBack x={300} y={940} s={0.62} t={t} crouch={clamp01(lt * 2)} reach={clamp01((lt - 0.3) * 2)} />
			<Tag text="crouch → reach" x={300} y={960} size={24} center />
			<DadBack x={800} y={940} s={0.5} t={t} crouch={0} reach={0} />
			<Tag text="standing" x={800} y={960} size={24} center />
			{[0, 1, 2, 3, 4].map((i) => (
				<Police key={i} x={140 + i * 200} y={1440} s={0.2} t={t} pose="walk" seed={i} tone="sil" sil="#1B2238" />
			))}
			<Police x={200} y={1880} s={0.34} t={t} pose="stand" seed={1} />
			<Police x={540} y={1880} s={0.34} t={t} pose="walk" seed={2} />
			<Police x={880} y={1880} s={0.34} t={t} pose="radio" seed={3} k={clamp01(lt * 2)} />
			<Tag text="silhouettes (tone sil)" x={540} y={1460} size={24} center />
		</>
	);
};

export const MilkKitAGallery: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	const S = [Expressions, Gestures, FrameZero, FullBody, PeekToddler, Cartons, Cutting, Photos, ManHands, OtherHands, ScissorsCase, Neighbours, Shapes, DadPolice];
	const Screen = S[Math.min(S.length - 1, Math.floor(t))];
	return (
		<AbsoluteFill style={{background: PAL.navy, overflow: 'hidden'}}>
			<Screen t={t} />
		</AbsoluteFill>
	);
};
