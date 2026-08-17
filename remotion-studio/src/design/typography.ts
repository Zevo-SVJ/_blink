import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

/**
 * Inter tient lieu de substitut à SF Pro : mêmes proportions, licence libre
 * (SIL OFL 1.1 — voir `public/fonts/OFL.txt`).
 *
 * La police est **auto-hébergée** dans `public/fonts/`, pas chargée depuis
 * Google Fonts. C'est un choix délibéré :
 *   • le rendu fonctionne hors-ligne et en CI, sans dépendre d'un CDN ;
 *   • aucune requête réseau ne peut faire échouer ou ralentir un rendu ;
 *   • le résultat est bit-à-bit reproductible dans le temps.
 *
 * `loadFont` enregistre un `delayRender()` : Remotion attend que la police soit
 * réellement disponible avant de capturer la première frame — donc jamais de
 * « flash » de police de secours dans la vidéo.
 */
const FAMILY = 'Inter';

// Fichier variable : un seul fichier couvre toute la plage de graisses.
const WEIGHT_RANGE = '100 900';

const LATIN =
	'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const LATIN_EXT =
	'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

void loadFont({
	family: FAMILY,
	url: staticFile('fonts/Inter-latin.woff2'),
	format: 'woff2',
	weight: WEIGHT_RANGE,
	unicodeRange: LATIN,
	display: 'block',
});

void loadFont({
	family: FAMILY,
	url: staticFile('fonts/Inter-latin-ext.woff2'),
	format: 'woff2',
	weight: WEIGHT_RANGE,
	unicodeRange: LATIN_EXT,
	display: 'block',
});

export const fonts = {
	display: `${FAMILY}, -apple-system, "SF Pro Display", "Segoe UI", sans-serif`,
	text: `${FAMILY}, -apple-system, "SF Pro Text", "Segoe UI", sans-serif`,
	mono: `"SF Mono", ui-monospace, "JetBrains Mono", monospace`,
} as const;

/**
 * Échelle typographique. Le `tracking` négatif sur les grandes tailles est ce
 * qui donne l'aspect « titre de keynote » plutôt que « slide de bureautique ».
 */
export const typeScale = {
	hero: {
		fontFamily: fonts.display,
		fontSize: 132,
		fontWeight: 600,
		letterSpacing: '-0.045em',
		lineHeight: 1.02,
	},
	title: {
		fontFamily: fonts.display,
		fontSize: 84,
		fontWeight: 600,
		letterSpacing: '-0.035em',
		lineHeight: 1.06,
	},
	headline: {
		fontFamily: fonts.display,
		fontSize: 48,
		fontWeight: 600,
		letterSpacing: '-0.025em',
		lineHeight: 1.12,
	},
	subtitle: {
		fontFamily: fonts.text,
		fontSize: 34,
		fontWeight: 400,
		letterSpacing: '-0.012em',
		lineHeight: 1.35,
	},
	body: {
		fontFamily: fonts.text,
		fontSize: 24,
		fontWeight: 400,
		letterSpacing: '-0.006em',
		lineHeight: 1.45,
	},
	caption: {
		fontFamily: fonts.text,
		fontSize: 18,
		fontWeight: 500,
		letterSpacing: '-0.006em',
		lineHeight: 1.3,
	},
	label: {
		fontFamily: fonts.text,
		fontSize: 15,
		fontWeight: 600,
		letterSpacing: '0.08em',
		lineHeight: 1.2,
		textTransform: 'uppercase',
	},
} as const;

export type TypeScale = keyof typeof typeScale;
