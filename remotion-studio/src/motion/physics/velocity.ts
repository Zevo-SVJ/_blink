import {useVideoConfig} from 'remotion';
import type {FrameTiming} from '../frame';
import {progressAtFrame} from '../frame';
import {useCurrentFrame} from 'remotion';

/**
 * Vitesse instantanée d'une progression, en unités par frame.
 *
 * Dérivée numérique de la progression : `p(n) − p(n−1)`. Purement déterministe,
 * puisque `progressAtFrame` l'est.
 *
 * C'est le signal le plus utile du système. Un seul calcul alimente trois
 * effets qui, autrement, se règlent à la main et finissent par se contredire :
 *
 *   • le squash & stretch    — l'objet se déforme quand il va vite ;
 *   • le flou directionnel   — il traîne dans l'axe de son déplacement ;
 *   • l'ombre portée         — elle se détache quand l'objet s'élève.
 *
 * Les trois restent cohérents par construction, parce qu'ils lisent la même
 * valeur.
 */
export const velocityAtFrame = (
	frame: number,
	fps: number,
	timing: FrameTiming = {},
): number =>
	progressAtFrame(frame, fps, timing) - progressAtFrame(frame - 1, fps, timing);

export const useVelocity = (timing: FrameTiming = {}): number => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return velocityAtFrame(frame, fps, timing);
};

export type SquashOptions = {
	/** Intensité de la déformation. 0 la désactive. */
	amount?: number;
	/** Axe du mouvement : la déformation s'aligne dessus. */
	axis?: 'y' | 'x';
	/** Bornes de sécurité, pour éviter les déformations grotesques. */
	limit?: number;
};

/**
 * Squash & stretch à volume conservé, dérivé de la vitesse.
 *
 * `scaleAxe = 1 + k·v` et l'axe perpendiculaire prend l'inverse exact, ce qui
 * préserve la surface : l'objet s'étire sans grossir, comme une matière réelle.
 *
 * Le comportement tombe juste tout seul sur un ressort sous-amorti : à l'aller
 * la vitesse est positive, l'objet s'étire ; au rebond elle devient négative,
 * il s'écrase. Aucun timing n'est écrit à la main.
 */
export const squashFromVelocity = (
	velocity: number,
	{amount = 1.2, axis = 'y', limit = 0.32}: SquashOptions = {},
): {scaleX: number; scaleY: number} => {
	if (amount === 0) return {scaleX: 1, scaleY: 1};

	const stretch = Math.max(-limit, Math.min(limit, velocity * amount));
	const along = 1 + stretch;
	const across = 1 / along;

	return axis === 'y'
		? {scaleY: along, scaleX: across}
		: {scaleX: along, scaleY: across};
};

/**
 * Flou directionnel simulé, dérivé de la même vitesse.
 *
 * Ce n'est pas du vrai motion blur — celui-ci exigerait de rendre plusieurs
 * sous-frames par image, au prix d'un temps de rendu multiplié. Sur des
 * mouvements aussi rapides, un flou proportionnel à la vitesse est
 * indiscernable à l'œil et coûte zéro.
 */
export const blurFromVelocity = (velocity: number, amount = 34, max = 12): number =>
	Math.min(max, Math.abs(velocity) * amount);

/** Élévation dérivée de la vitesse : l'ombre se détache quand l'objet bouge. */
export const elevationFromVelocity = (
	velocity: number,
	base = 12,
	amount = 220,
): number => base + Math.min(60, Math.abs(velocity) * amount);
