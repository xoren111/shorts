import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadGraduate} from '@remotion/google-fonts/Graduate';
import {loadFont as loadElite} from '@remotion/google-fonts/SpecialElite';

export const {fontFamily: MONT} = loadMontserrat('normal', {weights: ['700', '800', '900'], subsets: ['latin']});
export const {fontFamily: ANTON} = loadAnton('normal', {weights: ['400'], subsets: ['latin']});
/** varsity block letters (1910s college football) */
export const {fontFamily: VARSITY} = loadGraduate('normal', {weights: ['400'], subsets: ['latin']});
/** typewriter (contracts, the press box) */
export const {fontFamily: TYPE} = loadElite('normal', {weights: ['400'], subsets: ['latin']});
