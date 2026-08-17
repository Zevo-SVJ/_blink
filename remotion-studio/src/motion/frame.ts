import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {EasingName, SpringName} from './dynamics';
import {easings, springs} from './dynamics';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LE POINT CRITIQUE DE L'ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────────
 * Remotion rend la vidéo **frame par frame**, hors du temps réel : au rendu,
 * chaque image est peinte puis capturée, et l'horloge du navigateur n'avance
 * pas toute seule. Une animation pilotée par `requestAnimationFrame` — donc
 * `animate` / `transition` de Framer Motion — ne progresse pas dans ce contexte
 * et produirait une vidéo figée ou non déterministe.
 *
 * La règle du projet est donc :
 *   • dans une composition rendue → la progression vient TOUJOURS de
 *     `useCurrentFrame()`, via les hooks ci-dessous ;
 *   • Framer Motion fournit les primitives (`motion.*`), le vocabulaire de
 *     ressorts et les variants, et prend la main entièrement côté interactif
 *     (playground, app, overlays) où l'horloge temps réel est légitime.
 *
 * Même langage de mouvement, deux horloges, zéro surprise au rendu.
 */

export type FrameTiming = {
	/** Décalage avant le début, en frames. */
	delay?: number;
	/** Ressort à utiliser (mode par défaut). */
	spring?: SpringName;
	/**
	 * Si défini, on passe en mode courbe de Bézier sur cette durée (en frames)
	 * et `spring` est ignoré.
	 */
	duration?: number;
	/** Courbe utilisée en mode durée. */
	easing?: EasingName;
	/** Étire ou compresse le ressort sans toucher à sa physique. */
	durationInFrames?: number;
};

const toEasingFn = (name: EasingName) => {
	const [a, b, c, d] = easings[name];
	return Easing.bezier(a, b, c, d);
};

/**
 * Progression 0 → 1 pour la frame courante.
 * C'est la brique de base : tout le reste (styles, presets, composants) en
 * découle.
 */
export const useProgress = (timing: FrameTiming = {}): number => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return progressAtFrame(frame, fps, timing);
};

/** Version pure, utilisable hors composant (tests, calculs dérivés, boucles). */
export const progressAtFrame = (
	frame: number,
	fps: number,
	timing: FrameTiming = {},
): number => {
	const {delay = 0, duration, easing = 'expo'} = timing;
	const local = frame - delay;

	if (duration !== undefined) {
		return interpolate(local, [0, Math.max(1, duration)], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: toEasingFn(easing),
		});
	}

	return spring({
		frame: local,
		fps,
		config: springs[timing.spring ?? 'glide'],
		durationInFrames: timing.durationInFrames,
	});
};

/**
 * Progression d'entrée ET de sortie d'une scène.
 * `value` vaut 1 au milieu, 0 aux deux extrémités : idéal pour les plans qui
 * doivent apparaître puis se retirer proprement.
 */
export const useSceneProgress = (options: {
	enter?: FrameTiming;
	exitDuration?: number;
	exitEasing?: EasingName;
}): {enter: number; exit: number; value: number} => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	const {enter = {}, exitDuration = Math.round(fps * 0.5), exitEasing = 'exit'} =
		options;

	const enterProgress = progressAtFrame(frame, fps, enter);
	const [ea, eb, ec, ed] = easings[exitEasing];
	const exitProgress = interpolate(
		frame,
		[durationInFrames - exitDuration, durationInFrames],
		[0, 1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.bezier(ea, eb, ec, ed),
		},
	);

	return {
		enter: enterProgress,
		exit: exitProgress,
		value: enterProgress * (1 - exitProgress),
	};
};

/**
 * Valeur continue dérivée de la frame, sans début ni fin : parallaxes, dérives
 * de fond, rotations lentes. `speed` est exprimée en cycles par seconde.
 */
export const useLoop = (speed = 0.1): number => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return (frame / fps) * speed * Math.PI * 2;
};

/** Retourne le décalage en frames d'un élément dans une cascade. */
export const staggerDelay = (index: number, step: number, base = 0): number =>
	base + index * step;
