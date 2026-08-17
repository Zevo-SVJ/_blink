/**
 * Partition de la vidéo Blink — Phase 1.
 *
 * Tout est exprimé en frames à 60 fps, calées sur la grille 120 BPM
 * (1 temps = 30 frames = 0,5 s). Chaque durée de scène est un multiple entier
 * de temps : c'est ce qui fait que les raccords tombent sur la pulsation même
 * sans piste audio.
 */

export const BLINK_SCENES = {
	/** 8 temps — l'accroche. */
	Perception: 240,
	/** 10 temps — le profil et le clic. */
	Capture: 300,
	/** 12 temps — les quatre regards. */
	Lenses: 360,
	/** 10 temps — score, palier, appel à l'action. */
	Verdict: 300,
} as const;

export type BlinkSceneId = keyof typeof BLINK_SCENES;

/**
 * Durées des transitions. Toutes dans la bande 0,25–0,4 s de la référence :
 * une transition plus longue casserait le rythme, une plus courte se lirait
 * comme une coupe sèche.
 */
export const BLINK_TRANSITIONS = {
	/** Zoom traversant Perception → Capture. */
	zoom: 18,
	/** Filé latéral Capture → Lenses. */
	whip: 15,
	/** Rideau montant Lenses → Verdict. */
	wipe: 18,
} as const;

const totalScenes =
	BLINK_SCENES.Perception +
	BLINK_SCENES.Capture +
	BLINK_SCENES.Lenses +
	BLINK_SCENES.Verdict;

const totalTransitions =
	BLINK_TRANSITIONS.zoom + BLINK_TRANSITIONS.whip + BLINK_TRANSITIONS.wipe;

/** Une transition consomme du temps sur les deux plans qu'elle relie. */
export const BLINK_REEL_DURATION = totalScenes - totalTransitions;

/** Le score mis en scène, et ce qui en découle. */
export const DEMO = {
	score: 742,
	/** Palier atteint à 680 : « Sharp ». */
	tier: 'Sharp',
	/** Palier suivant : « Magnetic » à 790. */
	nextTier: 'Magnetic',
	pointsToNext: 790 - 742,
} as const;
