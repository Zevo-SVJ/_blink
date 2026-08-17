/**
 * PARTITION DE LA VIDÉO BLINK — 13 plans, 44,0 s
 *
 * Tout est exprimé en frames à 60 fps, calé sur la grille 120 BPM
 * (1 temps = 30 frames = 0,5 s). Chaque durée de plan est un multiple entier
 * de demi-temps : c'est ce qui fait que les raccords tombent sur la pulsation
 * même sans piste audio.
 *
 * Trois types de plans, en alternance délibérée :
 *
 *   A — riche      objets, métaphores, interfaces détournées, graphiques
 *   B — typo seule respiration : un fond uni, deux ou trois mots, rien d'autre
 *   C — hybride    texte porté par des éléments qui le mettent en scène
 *
 * Les plans B ne représentent que 300 frames sur 2640, soit 11 % du film. Leur
 * force vient de leur rareté : trois écrans dans toute la vidéo, placés
 * exactement là où le récit a besoin d'un silence.
 *
 * La colonne « fond » sert la rupture chromatique. Deux plans consécutifs ne
 * partagent jamais la même valeur, et trois plans basculent franchement en
 * clair ou en couleur saturée — c'est ce contraste qui empêche 44 secondes de
 * bleu nuit de devenir monotones.
 */

export const BLINK_SCENES = {
	/** A · 8 temps — l'accroche. Le regard des autres arrive. */
	Perception: 240,
	/** B · 3 temps — fond clair. Un chiffre, rien d'autre. */
	Seconds: 90,
	/** A · 8 temps — la nuée de curseurs, les vues, les ondes. */
	Gaze: 240,
	/** C · 8 temps — ce qu'ils ont de toi tient sur une carte. */
	Identity: 240,
	/** A · 9 temps — la capture, le clic, le scan. */
	Capture: 270,
	/** A · 7 temps — la machinerie d'analyse. */
	Signals: 210,
	/** B · 3,5 temps — fond saturé. Le contre-pied. */
	Punchline: 105,
	/** C · 11 temps — les quatre regards. */
	Lenses: 330,
	/** C · 8 temps — fond clair. Intention contre perception. */
	Mirror: 240,
	/** B · 3,5 temps — noir profond. La respiration avant le résultat. */
	Reveal: 105,
	/** A · 9 temps — score, palier, secousse maximale. */
	Verdict: 270,
	/** C · 7 temps — l'échelle des paliers, la marche suivante. */
	Climb: 210,
	/** C · 9 temps — la marque, la baseline, l'appel à l'action. */
	Close: 270,
} as const;

export type BlinkSceneId = keyof typeof BLINK_SCENES;

/**
 * Durées des transitions, dans l'ordre du montage.
 *
 * Toutes dans la bande 0,2–0,3 s : plus long casserait le rythme, plus court
 * se lirait comme une coupe sèche. Les valeurs les plus basses (12 f) servent
 * aux entrées et sorties des plans typographiques, où la brutalité est
 * l'effet recherché.
 */
export const BLINK_TRANSITIONS = {
	perceptionToSeconds: 12,
	secondsToGaze: 18,
	gazeToIdentity: 15,
	identityToCapture: 18,
	captureToSignals: 15,
	signalsToPunchline: 12,
	punchlineToLenses: 18,
	lensesToMirror: 15,
	mirrorToReveal: 12,
	revealToVerdict: 15,
	verdictToClimb: 12,
	climbToClose: 18,
} as const;

const totalScenes = Object.values(BLINK_SCENES).reduce((a, b) => a + b, 0);
const totalTransitions = Object.values(BLINK_TRANSITIONS).reduce(
	(a, b) => a + b,
	0,
);

/** Une transition consomme du temps sur les deux plans qu'elle relie. */
export const BLINK_REEL_DURATION = totalScenes - totalTransitions;

/**
 * Position absolue du début de chaque plan dans le montage.
 *
 * Indispensable pour caler la future voix off : une réplique se situe à
 * `sceneStart(id) + cue.at`. Recalculé depuis les durées, jamais écrit à la
 * main — allonger un plan décale automatiquement tous les suivants.
 */
export const sceneStarts = (): Record<BlinkSceneId, number> => {
	const ids = Object.keys(BLINK_SCENES) as BlinkSceneId[];
	const transitions = Object.values(BLINK_TRANSITIONS);
	const starts = {} as Record<BlinkSceneId, number>;

	let cursor = 0;
	ids.forEach((id, index) => {
		starts[id] = cursor;
		cursor += BLINK_SCENES[id] - (transitions[index] ?? 0);
	});

	return starts;
};

/** Le score mis en scène, et tout ce qui en découle. */
export const DEMO = {
	score: 742,
	/** Palier atteint à 680 : « Sharp ». */
	tier: 'Sharp',
	/** Palier suivant : « Magnetic » à 790. */
	nextTier: 'Magnetic',
	pointsToNext: 790 - 742,
	/** Progression à l'intérieur du palier Sharp : (742−680)/(790−680). */
	tierProgress: (742 - 680) / (790 - 680),
} as const;
