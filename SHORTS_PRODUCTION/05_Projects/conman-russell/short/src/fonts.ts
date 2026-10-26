import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * Local OFL fonts from public/fonts (copied from SHORTS_PRODUCTION/03_Assets/Fonts) → the render works offline and the
 * glyphs never change under us (standard T12). Family names match the old @remotion/google-fonts ones, so components that
 * write `'Anton', sans-serif` inline keep working. Cyrillic / latin-ext: Montserrat VF covers both; Alfa Slab One and Anton
 * are Latin + ÄÖÜß only → in RU projects set HEAD to Oswald / Russo One from 03_Assets/Fonts.
 * HEAD = the channel headline font (big numbers, hook words, stamps; owner 24.10 «A · Экспедиция», standard T11/T15).
 */
const load = (family: string, file: string, weight: string) => {
	if (typeof FontFace === 'undefined' || typeof document === 'undefined') return;
	const handle = delayRender(`font ${family}`);
	const face = new FontFace(family, `url(${staticFile(file)}) format('truetype')`, {weight});
	face
		.load()
		.then((f) => {
			(document.fonts as unknown as {add: (x: FontFace) => void}).add(f);
			continueRender(handle);
		})
		.catch((e) => {
			console.error(`font ${family} failed`, e);
			continueRender(handle);
		});
};

load('Montserrat', 'fonts/Montserrat-VariableFont_wght.ttf', '100 900');
load('Anton', 'fonts/Anton-Regular.ttf', '400');
load('Alfa Slab One', 'fonts/AlfaSlabOne-Regular.ttf', '400');

export const MONT = 'Montserrat';
export const ANTON = 'Anton';
export const HEAD = 'Alfa Slab One';
