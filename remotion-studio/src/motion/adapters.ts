import type {Transition} from 'framer-motion';
import type {EasingName, SpringName} from './dynamics';
import {durations, easings, springs} from './dynamics';

/**
 * Adaptateurs vers Framer Motion, pour tout ce qui tourne en temps réel :
 * playground, contrôles, overlays, app web.
 *
 * Les ressorts sont transmis tels quels — `stiffness`, `damping` et `mass` ont
 * la même signification chez Remotion et chez Framer Motion — ce qui garantit
 * qu'un mouvement d'interface et son équivalent vidéo ont la même identité.
 */
export const toSpringTransition = (
	name: SpringName = 'glide',
	delay = 0,
): Transition => {
	const config = springs[name];
	return {
		type: 'spring',
		stiffness: config.stiffness,
		damping: config.damping,
		mass: config.mass,
		restDelta: 0.001,
		delay,
	};
};

export const toEaseTransition = (
	name: EasingName = 'expo',
	duration: number = durations.base,
	delay = 0,
): Transition => ({
	type: 'tween',
	ease: [...easings[name]] as [number, number, number, number],
	duration,
	delay,
});

/** Transition de cascade pour un conteneur `variants` Framer Motion. */
export const staggerTransition = (
	step = 0.06,
	delayChildren = 0,
): Transition => ({
	staggerChildren: step,
	delayChildren,
});
