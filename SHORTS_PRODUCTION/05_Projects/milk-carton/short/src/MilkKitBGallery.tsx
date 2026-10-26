import React from 'react';
import {AbsoluteFill} from 'remotion';
import {PAL} from './theme';
import {INK, clamp01, easeInOut, easeOut, lerp, useT} from './ui/gfx';
import {MONT} from './fonts';
import {
	BELT, Bedroom, Carton, CartonWall, CheckoutBelt, CurtainWindow, DairyFridge, DairyLine, Doorframe, DOOR, FlyerPole, HouseInterior,
	House, JacketChair, KITCHEN, LAWN, Lawn, LetterStack, OceanSky, PaperBackdrop, PoliceCar, PoliceLights, RoadWindow, Shack,
	ShopperLegs, ShoppingCart, SmallPlane, StoreAisle, TableTop, TearCalendar, cartBasket, cartonWallCell, fridgeSlot, houseDoor,
} from './ui/milk_b';

// milk-carton draw kit B preview (test composition, never published): one panel per component, ~1 s each, every piece
// animated. Contact sheet: node tools/stills.mjs --comp MilkKitB --every 1 --from 0.5 --to 21.5 --out out/stills/kitB
// The grey «kit A» blocks are STAND-INS for the girl / hands / doll case (kit A draws the real ones).
export const MILK_KIT_B_S = 22;

const Lbl: React.FC<{text: string; sub?: string}> = ({text, sub}) => (
	<div style={{position: 'absolute', left: 40, top: 60, padding: '10px 20px', borderRadius: 14, background: 'rgba(10,16,28,0.72)', boxShadow: `0 0 0 4px ${INK}`, fontFamily: MONT, fontWeight: 800, fontSize: 32, color: '#fff', zIndex: 50, maxWidth: 980}}>
		{text}
		{sub ? <div style={{fontSize: 22, fontWeight: 600, opacity: 0.75}}>{sub}</div> : null}
	</div>
);
/** grey stand-in block for a kit A piece */
const StandIn: React.FC<{x: number; y: number; w: number; h: number; label?: string; r?: number}> = ({x, y, w, h, label = 'kit A', r = 30}) => (
	<div style={{position: 'absolute', left: x - w / 2, top: y - h, width: w, height: h, borderRadius: r, background: 'rgba(120,120,130,0.75)', boxShadow: `0 0 0 5px ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONT, fontWeight: 800, fontSize: 26, color: '#fff'}}>
		{label}
	</div>
);
const Zoom: React.FC<{s: number; ox?: number; oy?: number; children: React.ReactNode}> = ({s, ox = 540, oy = 960, children}) => (
	<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${s})`, transformOrigin: `${ox}px ${oy}px`}}>{children}</div>
);

type PP = {t: number};
const P0: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<DairyFridge t={t} door={easeInOut(clamp01(t / 0.6))} mist={clamp01((t - 0.2) / 0.4)} faces="kids" gaps={[[1, 2]]} />
		<Lbl text="DairyFridge (faces='kids')" sub="door 0 → 1, mist spills, gap [1, 2] for kit A's carton" />
	</AbsoluteFill>
);
const P1: React.FC<PP> = ({t}) => {
	const sl = fridgeSlot(1, 2);
	return (
		<AbsoluteFill>
			<Zoom s={2.1} ox={540} oy={820}>
				<DairyFridge t={t + 3} flicker={0.8} blur={3} dim={0.15} gaps={[[1, 2]]} />
			</Zoom>
			<Carton x={lerp(700, 560, easeOut(t / 0.6))} y={1230} s={1.55} rot={lerp(-14, -4, easeOut(t / 0.6))} side={0} header="missing" seed={3} />
			<StandIn x={250} y={1240} w={300} h={560} label="kit A girl" r={140} />
			<Lbl text="DairyFridge ECU (Zoom 2.1, blur 3, flicker, faces='empty')" sub={`+ Carton header='missing'; fridgeSlot(1,2) = ${Math.round(sl.x)}, ${Math.round(sl.y)}`} />
		</AbsoluteFill>
	);
};
const P2: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<StoreAisle t={t} cam={t * 700} flicker={0.9} />
		<ShoppingCart x={lerp(260, 640, t)} y={1560} s={0.62} t={t} roll={lerp(260, 640, t)} />
		<ShopperLegs t={t} y={1900} n={3} speed={1100} />
		<Lbl text="StoreAisle (cam dolly, flicker) · ShoppingCart · ShopperLegs" sub="tubes stutter, products stream past, legs blur by" />
	</AbsoluteFill>
);
const P3: React.FC<PP> = ({t}) => {
	const x = 560, y = 1500, s = 1.05;
	const b = cartBasket(x, y, s);
	const k = easeOut(clamp01(t / 0.45));
	return (
		<AbsoluteFill style={{background: '#cfd5da'}}>
			<StoreAisle t={t} blur={6} />
			<ShoppingCart x={x} y={y} s={s} t={t} rattle={0.6} contents={<Carton x={lerp(b.x0 + 300, b.x0 + 260, k)} y={lerp(b.top - 260, b.floor, k)} s={0.62} rot={lerp(-25, -6, k)} side={1} header="missing" seed={4} />} />
			<Lbl text="ShoppingCart contents" sub="carton drops between the far and the near mesh (cartBasket)" />
		</AbsoluteFill>
	);
};
const P4: React.FC<PP> = ({t}) => {
	const cx = lerp(260, 560, easeOut(clamp01(t / 0.4)));
	return (
		<AbsoluteFill>
			<CheckoutBelt t={t} sweep={clamp01((t - 0.35) / 0.3)} beep={t - 0.55} till={t - 0.7}>
				<Carton x={cx} y={BELT.itemY} s={0.95} side={1} header="missing" seed={5} />
			</CheckoutBelt>
			<Lbl text="CheckoutBelt" sub="belt runs, laser sweeps the face, BEEP flash, till pops" />
		</AbsoluteFill>
	);
};
const P5: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<Shack t={t} cam={t * 60} />
		<Lbl text="Shack (day, ocean)" sub="curtain sways, palm moves, waves roll" />
	</AbsoluteFill>
);
const P6: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<Shack t={t} night={1} rain={clamp01(t / 0.3)} ocean={false} />
		<Lbl text="Shack (night, rain, ocean=false)" sub="tin splashes, drips, window glow, tree wall instead of sea" />
	</AbsoluteFill>
);
const P7: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<CurtainWindow t={t} open={1 - easeInOut(clamp01((t - 0.15) / 0.7))} />
		<Lbl text="CurtainWindow open 1 → 0" sub="curtain falls shut, the sunbeam narrows to a strip" />
	</AbsoluteFill>
);
const P8: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<OceanSky t={t} speed={220} />
		<SmallPlane x={lerp(260, 760, t)} y={760} s={0.95} t={t} bank={-3} />
		<Lbl text="OceanSky · SmallPlane" sub="prop spins, clouds and crests drift" />
	</AbsoluteFill>
);
const P9: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<RoadWindow t={t} rain={clamp01((t - 0.3) / 0.5)} />
		<Lbl text="RoadWindow (night car window)" sub="light streaks → rain on the glass" />
	</AbsoluteFill>
);
const P10: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<HouseInterior t={t + 0.2} />
		<StandIn x={KITCHEN.fridgeSlot.x} y={KITCHEN.fridgeSlot.y + 70} w={110} h={140} label="cut" r={6} />
		<Lbl text="HouseInterior kitchen" sub="clock ticks (no digits), lamp sways, fridgeSlot for the cutout" />
	</AbsoluteFill>
);
const P11: React.FC<PP> = ({t}) => {
	const W = KITCHEN.window;
	return (
		<AbsoluteFill>
			<HouseInterior
				t={t}
				view="living"
				night={0.85}
				outside={
					<>
						<div style={{position: 'absolute', inset: 0, background: '#13213a'}} />
						<PoliceCar x={lerp(W.w + 120, W.w * 0.55, easeOut(clamp01(t / 0.45)))} y={W.h * 0.82} s={0.32} t={t} silhouette flip stop={t - 0.45} />
						<PoliceCar x={lerp(W.w + 200, W.w * 0.15, easeOut(clamp01((t - 0.3) / 0.45)))} y={W.h * 0.86} s={0.34} t={t + 0.2} silhouette flip stop={t - 0.75} />
					</>
				}
			/>
			<PoliceLights t={t} k={clamp01(t / 0.3)} cx={610} cy={600} />
			<Lbl text="HouseInterior living (night) + PoliceLights" sub="outside node: PoliceCar silhouettes pull up" />
		</AbsoluteFill>
	);
};
const P12: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<Bedroom t={t} night={0.35} />
		<StandIn x={620} y={1660} w={260} h={150} label="kit A case" r={24} />
		<Lbl text="Bedroom" sub="star wallpaper, plush bear, night lamp, rug (case spot)" />
	</AbsoluteFill>
);
const P13: React.FC<PP> = ({t}) => {
	const k = easeInOut(clamp01(t / 0.7));
	return (
		<AbsoluteFill>
			<TableTop t={t * 6} />
			<Carton x={lerp(1150, 560, k)} y={1180} s={1.25} rot={lerp(-30, -8, k) + Math.sin(t * 20) * (1 - k) * 3} side={0} header="missing" seed={6} />
			<Lbl text="TableTop (from above)" sub="planks, grain, drifting window light; carton slides in" />
		</AbsoluteFill>
	);
};
const P14: React.FC<PP> = ({t}) => {
	const shut = 0.35;
	const screen = t < shut ? 1 - easeInOut(t / shut) : 0;
	return (
		<AbsoluteFill>
			<Lawn t={t} cam={t * 40} screen={screen} slap={t - shut} />
			<StandIn x={lerp(320, 560, t) - t * 40} y={1300} w={110} h={240} label="girl" r={50} />
			<Lbl text="Lawn + House (ours) + NeighborHouse" sub="screen door swings shut and slaps (wobble)" />
		</AbsoluteFill>
	);
};
const P15: React.FC<PP> = ({t}) => {
	const x = 540, y = 1560, s = 1.35;
	const d = houseDoor(x, y, s);
	return (
		<AbsoluteFill style={{background: '#9fd3f5'}}>
			<Lawn t={t} houses={false} />
			<House x={x} y={y} s={s} t={t} look="neighbor" left={420} right={420} door={1} screen={0.55 + 0.25 * Math.sin(t * 4)} />
			<StandIn x={d.x} y={d.inside} w={120} h={70} label="case" r={12} />
			<Lbl text="NeighborHouse close" sub="inner door open → hall carpet; houseDoor().inside = case spot" />
		</AbsoluteFill>
	);
};
const P16: React.FC<PP> = ({t}) => {
	const st = 0.5;
	const k = easeOut(clamp01(t / st));
	return (
		<AbsoluteFill>
			<Lawn t={t} dim={0.55} />
			<PoliceCar x={lerp(1400, 560, k)} y={1500} s={0.95} t={t} speed={t < st ? 2.5 : 0} flip stop={t - st} />
			<PoliceLights t={t} k={0.9} cx={560} cy={1240} beams={0.6} />
			<Lbl text="PoliceCar (stop bounce) + PoliceLights" sub="no text, no plates; red / blue double flash" />
		</AbsoluteFill>
	);
};
const P17: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<DairyLine t={t + 0.2} period={0.5} sepia={0.75} />
		<Lbl text="DairyLine (sepia)" sub="indexed belt, press thunks, face printed on each carton" />
	</AbsoluteFill>
);
const P18: React.FC<PP> = ({t}) => {
	const s = lerp(1, 0.45, easeInOut(clamp01(t / 0.45)));
	const grey = clamp01((t - 0.5) / 0.45);
	const keep: [number, number] = [0, 3];
	const sc: [number, number] = [0, t * 120];
	const k = cartonWallCell(keep[0], keep[1], {scroll: sc, s});
	return (
		<AbsoluteFill>
			<CartonWall t={t} s={s} scroll={sc} grey={grey} keep={keep} keepGlow={grey} />
			<Lbl text="CartonWall" sub={`pull back s 1 → 0.45, rows dim to grey, keep [0, 3] at ${Math.round(k.x)}, ${Math.round(k.y)}`} />
		</AbsoluteFill>
	);
};
const P19: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<PaperBackdrop t={t} desat={0.4} />
		<div style={{position: 'absolute', inset: 0, filter: 'saturate(0.55)'}}>
			<JacketChair x={540} y={1300} s={0.95} t={t * 2} />
		</div>
		<Lbl text="PaperBackdrop + JacketChair" sub="empty checked jacket (PLAID) — the dad as a sign" />
	</AbsoluteFill>
);
const P20: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<PaperBackdrop t={t} tone="cool" />
		<TearCalendar x={300} y={330} s={0.95} pages={t * 3.2} />
		<FlyerPole x={820} y={1880} s={0.92} t={t} />
		<LetterStack x={320} y={1500} s={0.95} n={5 + Math.floor(t * 3)} drop={(t * 3) % 1 / 3} />
		<Lbl text="TearCalendar · FlyerPole · LetterStack" sub="pages tear (no digits), tabs flutter, letters drop" />
	</AbsoluteFill>
);
const P21: React.FC<PP> = ({t}) => (
	<AbsoluteFill>
		<Doorframe t={t} behind={<StandIn x={DOOR.x0 - 20 + Math.sin(t * 6) * 30} y={DOOR.floor - 10} w={200} h={620} label="girl" r={90} />}>
			<StandIn x={720} y={1900} w={420} h={420} label="dad (back)" r={160} />
		</Doorframe>
		<Lbl text="Doorframe" sub="behind = under the wall: she peeks past the left jamb" />
	</AbsoluteFill>
);

const PANELS = [P0, P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14, P15, P16, P17, P18, P19, P20, P21];
export const MilkKitBGallery: React.FC = () => {
	const t = useT();
	const i = Math.max(0, Math.min(PANELS.length - 1, Math.floor(t)));
	const P = PANELS[i];
	return (
		<AbsoluteFill style={{background: PAL.navy, overflow: 'hidden'}}>
			<P t={t - i} />
		</AbsoluteFill>
	);
};
