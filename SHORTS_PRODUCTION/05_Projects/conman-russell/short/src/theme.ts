/**
 * Channel look «A · Экспедиция» (owner 24.10, standard 4.4 T15): sea-chart navy, parchment, Atlas orange.
 * Text colours T5: white + orange accent (one word per caption group, big numbers) — as on the mockup the owner picked;
 * orange also marks graphics (routes, highlights, frames). Mockups: SHORTS_PRODUCTION/08_QA_Reports/style/palettes_v1.png, fonts_v1.png.
 */
export const PAL = {
	navy: '#0F2238', // main dark ground
	navy2: '#16304D', // lighter navy: gradient top, panels
	parchment: '#EFE3C8', // light ground, documents, cards
	orange: '#FF7A1F', // accent = Atlas: caption keyword, big numbers, routes, highlights, frames (gfx GOLD)
	stamp: '#C8102E', // stamps; strongest on parchment / light cards (2.7:1 on navy)
	teal: '#2A9D8F', // sea, second map fill
	gold: '#FFC83A', // gold OBJECTS (coins, stars, medals); not a text colour since 24.10 (T5 → orange)
	ink: '#120818', // outlines (T3)
} as const;
