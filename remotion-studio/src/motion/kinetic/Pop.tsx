import {motion} from 'framer-motion';
import type {CSSProperties, ReactNode} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {SpringName} from '../dynamics';
import {progressAtFrame} from '../frame';
import type {ExitName, MotionState, PresetName} from '../presets';
import {exits, mixStates, presets, REST, toStyle} from '../presets';
import {tiltFor} from '../physics/shake';
import {
	blurFromVelocity,
	elevationFromVelocity,
	squashFromVelocity,
	velocityAtFrame,
} from '../physics/velocity';

const resolveEnter = (preset: PresetName | MotionState): MotionState =>
	typeof preset === 'string' ? presets[preset] : preset;

const resolveExit = (exit: ExitName | MotionState): MotionState =>
	typeof exit === 'string' ? exits[exit] : exit;

export type PopProps = {
	children?: ReactNode;

	/** Frame d'entrée, relative à la scène. */
	at?: number;
	/** Ressort d'entrée. La règle : on entre TOUJOURS au ressort. */
	spring?: SpringName;
	/** État de départ. */
	preset?: PresetName | MotionState;

	/** Frame de sortie. Omise, l'élément reste en place. */
	out?: number;
	/** État d'arrivée de la sortie. */
	exit?: ExitName | MotionState;
	/** Durée de la sortie, en frames. 18 = 0,3 s. */
	outDuration?: number;

	/**
	 * Squash & stretch dérivé de la vitesse. 0 le désactive, 1,2 est un bon
	 * point de départ pour un élément qui doit avoir de la masse.
	 */
	squash?: number;
	squashAxis?: 'x' | 'y';

	/** Ombre portée dynamique, qui se détache quand l'élément bouge. */
	shadow?: boolean;
	/** Flou directionnel simulé sur les déplacements rapides. */
	blur?: boolean;

	/**
	 * Micro-rotation de repos, en degrés. `true` tire une valeur stable dans
	 * ±4° à partir de `index` — c'est ce qui casse la rigidité d'une grille.
	 */
	tilt?: number | boolean;
	/** Indice dans un groupe : seed du tilt, et rien d'autre. */
	index?: number;

	style?: CSSProperties;
	className?: string;
};

/**
 * L'élément animé du langage kinetic.
 *
 * Il encode à lui seul la règle qui définit la signature : **entrée au ressort,
 * sortie à la courbe**. L'entrée rebondit (`pop`, ζ ≈ 0,375, ~28 % de
 * dépassement) ; la sortie utilise la courbe `back`, qui recule légèrement
 * avant d'accélérer — l'anticipation. Inverser les deux détruit l'identité,
 * donc l'API ne le permet pas.
 *
 * Squash, ombre et flou sont tous dérivés de la même vitesse instantanée : ils
 * ne peuvent pas se désynchroniser.
 *
 * Comme partout dans le projet, `motion.div` est utilisé sans `animate` ni
 * `transition` : le style est entièrement résolu depuis la frame courante, donc
 * le rendu est déterministe.
 */
export const Pop: React.FC<PopProps> = ({
	children,
	at = 0,
	spring = 'pop',
	preset = 'popIn',
	out,
	exit = 'crush',
	outDuration = 18,
	squash = 0,
	squashAxis = 'y',
	shadow = false,
	blur = false,
	tilt = false,
	index = 0,
	style,
	className,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const enterTiming = {delay: at, spring};
	const enterProgress = progressAtFrame(frame, fps, enterTiming);

	const restingTilt =
		tilt === true ? tiltFor(index) : typeof tilt === 'number' ? tilt : 0;

	// Le repos n'est pas forcément neutre : une micro-rotation persistante fait
	// partie de l'état stable de l'élément.
	const restState: MotionState = restingTilt
		? {...REST, rotate: restingTilt}
		: REST;

	let state = mixStates(resolveEnter(preset), restState, enterProgress);
	let velocity = velocityAtFrame(frame, fps, enterTiming);

	if (out !== undefined) {
		const exitTiming = {delay: out, duration: outDuration, easing: 'back' as const};
		const exitProgress = progressAtFrame(frame, fps, exitTiming);
		if (exitProgress > 0) {
			state = mixStates(state, resolveExit(exit), exitProgress);
			velocity = velocityAtFrame(frame, fps, exitTiming);
		}
	}

	if (squash > 0) {
		const deform = squashFromVelocity(velocity, {amount: squash, axis: squashAxis});
		state = {
			...state,
			scaleX: state.scaleX * deform.scaleX,
			scaleY: state.scaleY * deform.scaleY,
		};
	}

	if (shadow) {
		state = {...state, elevation: elevationFromVelocity(velocity)};
	}

	if (blur) {
		state = {...state, blur: state.blur + blurFromVelocity(velocity)};
	}

	return (
		<motion.div className={className} style={{...toStyle(state), ...style}}>
			{children}
		</motion.div>
	);
};
