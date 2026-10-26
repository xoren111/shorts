import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';

export const {fontFamily: MONT} = loadMontserrat('normal', {weights: ['700', '800', '900'], subsets: ['latin']});
export const {fontFamily: ANTON} = loadAnton('normal', {weights: ['400'], subsets: ['latin']});
