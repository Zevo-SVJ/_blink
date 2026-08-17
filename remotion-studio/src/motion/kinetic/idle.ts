import {noise2D} from '@remotion/noise';
import {useCurrentFrame, useVideoConfig} from 'remotion';

export type IdleOptions = {
	/** Amplitude verticale, en px. */
	float?: number;
	/** Amplitude de la respiration d'échelle. 0,02 = ±2 %. */
	breathe?: number;
	/** Amplitude de la dérive angulaire, en degrés. */
	sway?: number;
	/** Cycles par seconde. Volontairement très lent. */
	speed?: number;
	/** Déphase un élément par rapport à ses voisins. */
	phase?: number;
	/** Ajoute une irrégularité organique au lieu d'une sinusoïde pure. */
	organic?: boolean;
	seed?: string;
};

/**
 * Micro-vie permanente.
 *
 * Principe relevé dans l'analyse de référence : **aucun élément n'est jamais
 * totalement figé.** Même à l'arrêt, un objet respire — quelques pixels de
 * flottement, un ou deux pour cent d'échelle. C'est ce qui distingue une image
 * vivante d'une capture d'écran, et c'est ce qui manque le plus souvent aux
 * animations qui « retombent » après leur entrée.
 *
 * L'amplitude doit rester sous le seuil de conscience : on ne doit pas *voir*
 * l'élément bouger, on doit seulement sentir qu'il n'est pas mort.
 */
export const useIdle = ({
	float = 6,
	breathe = 0.012,
	sway = 0,
	speed = 0.14,
	phase = 0,
	organic = false,
	seed = 'idle',
}: IdleOptions = {}): {y: number; scale: number; rotate: number} => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = (frame / fps) * speed * Math.PI * 2 + phase;

	// Le bruit ajoute une dérive lente qui empêche l'œil de prédire la
	// sinusoïde — trois éléments côte à côte cessent de battre à l'unisson.
	const wobble = organic ? noise2D(seed, frame / fps / 3, 0) * 0.4 : 0;

	return {
		y: (Math.sin(t) + wobble) * float,
		scale: 1 + Math.sin(t * 0.7 + 1.1) * breathe,
		rotate: Math.sin(t * 0.5 + 0.4) * sway,
	};
};

/** Sérialise directement en `transform`, pour les cas simples. */
export const idleTransform = (idle: {
	y: number;
	scale: number;
	rotate: number;
}): string =>
	`translate3d(0, ${idle.y.toFixed(2)}px, 0) scale(${idle.scale.toFixed(4)})${
		idle.rotate ? ` rotate(${idle.rotate.toFixed(3)}deg)` : ''
	}`;
