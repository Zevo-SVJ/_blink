/**
 * PARTITION DE LA VIDÉO BLINK — 13 plans, 43,0 s
 *
 * Tout est exprimé en frames à 60 fps, calé sur la grille 120 BPM
 * (1 temps = 30 frames = 0,5 s). Les durées sont des multiples de 6 frames —
 * un cinquième de temps — ce qui garde les raccords sur la pulsation tout en
 * autorisant le resserrage nécessaire au rythme.
 *
 * Cette version a été **accélérée** : transitions réduites de 16 % (180 → 152
 * frames) et durées de plan resserrées là où le diagnostic montrait des frames
 * mortes. Les sorties de chaque plan sont désormais calées pour être encore en
 * mouvement quand la fenêtre de chevauchement s'ouvre — c'est ce qui supprime
 * la sensation de diapositive.
 *
 * Trois types de plans, en alternance délibérée :
 *
 *   A — riche      objets, métaphores, interfaces détournées, graphiques
 *   B — typo seule respiration : un fond uni, deux ou trois mots, rien d'autre
 *   C — hybride    texte porté par des éléments qui le mettent en scène
 *
 * Les plans B ne représentent que 300 frames sur 2578, soit 11,6 % du film. Leur
 * force vient de leur rareté : trois écrans dans toute la vidéo, placés
 * exactement là où le récit a besoin d'un silence.
 *
 * La colonne « fond » sert la rupture chromatique. Deux plans consécutifs ne
 * partagent jamais la même valeur, et trois plans basculent franchement en
 * clair ou en couleur saturée — c'est ce contraste qui empêche 44 secondes de
 * bleu nuit de devenir monotones.
 */

export const BLINK_SCENES = {
	/** A — l'accroche. Le regard des autres arrive. */
	Perception: 228,
	/** B — fond clair. Un chiffre, rien d'autre. */
	Seconds: 90,
	/** A — la nuée de curseurs, les vues, les ondes. */
	Gaze: 234,
	/** C — ce qu'ils ont de toi tient sur une carte. */
	Identity: 234,
	/** A — la capture, le clic, le scan. */
	Capture: 270,
	/** A — la machinerie d'analyse. */
	Signals: 204,
	/** B — fond saturé. Le contre-pied. */
	Punchline: 105,
	/** C — les quatre regards. */
	Lenses: 312,
	/** C — fond clair. Intention contre perception. */
	Mirror: 240,
	/** B — noir profond. La respiration avant le résultat. */
	Reveal: 105,
	/** A — score, palier, secousse maximale. */
	Verdict: 246,
	/** C — l'échelle des paliers, la marche suivante. */
	Climb: 204,
	/** C — la marque, la baseline, l'appel à l'action. */
	Close: 258,
} as const;

export type BlinkSceneId = keyof typeof BLINK_SCENES;

/**
 * Durées des transitions, dans l'ordre du montage.
 *
 * Raccourcies de ~16 % par rapport à la première version (180 → 152 frames au
 * total) : chaque raccord tombe dans la bande 0,17–0,25 s. Plus long installait
 * une sensation de diapositive ; plus court se lirait comme une coupe sèche.
 *
 * Les valeurs les plus basses (10 f) encadrent les plans typographiques, où la
 * brutalité de l'entrée et de la sortie est l'effet recherché.
 *
 * Ces durées sont aussi **la fenêtre de chevauchement** : dans une
 * `TransitionSeries`, le plan N+1 commence sa propre frame 0 exactement
 * `T` frames avant la fin du plan N. Les sorties de chaque plan sont calées
 * pour être encore en mouvement quand cette fenêtre s'ouvre.
 */
export const BLINK_TRANSITIONS = {
	perceptionToSeconds: 10,
	secondsToGaze: 15,
	gazeToIdentity: 13,
	identityToCapture: 15,
	captureToSignals: 13,
	signalsToPunchline: 10,
	punchlineToLenses: 15,
	lensesToMirror: 13,
	mirrorToReveal: 10,
	revealToVerdict: 13,
	verdictToClimb: 10,
	climbToClose: 15,
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
