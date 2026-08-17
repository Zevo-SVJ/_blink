import {noise2D} from '@remotion/noise';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export type ShakeOptions = {
	/** Frame de l'impact. */
	at: number;
	/** Durée de la secousse, en frames. Courte par définition. */
	duration?: number;
	/** Amplitude maximale, en px. */
	amplitude?: number;
	/** Rotation maximale induite, en degrés. */
	rotation?: number;
	/** Vitesse d'agitation. Plus haut = plus nerveux. */
	frequency?: number;
	/** Change le motif sans changer le caractère de la secousse. */
	seed?: string;
};

/**
 * Camera shake déterministe.
 *
 * `Math.random()` est proscrit : au rendu, chaque frame est peinte dans un
 * contexte isolé, donc une valeur aléatoire produirait une secousse différente
 * à chaque exécution — et un scrub incohérent dans le studio. `noise2D` est
 * une fonction pure de la frame : la même image donne toujours la même valeur,
 * tout en restant visuellement imprévisible.
 *
 * L'enveloppe décroît en puissance 2,2 : la secousse frappe fort puis
 * s'éteint vite, au lieu de mollir linéairement.
 */
export const useShake = ({
	at,
	duration = 8,
	amplitude = 18,
	rotation = 1.2,
	frequency = 0.9,
	seed = 'impact',
}: ShakeOptions): {x: number; y: number; rotate: number} => {
	const frame = useCurrentFrame();
	const local = frame - at;

	if (local < 0 || local > duration) return {x: 0, y: 0, rotate: 0};

	const envelope = Math.pow(
		interpolate(local, [0, duration], [1, 0], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}),
		2.2,
	);

	const t = local * frequency;
	return {
		x: noise2D(`${seed}-x`, t, 0) * amplitude * envelope,
		y: noise2D(`${seed}-y`, t, 0) * amplitude * envelope,
		rotate: noise2D(`${seed}-r`, t, 0) * rotation * envelope,
	};
};

/** Cumule plusieurs secousses : une scène peut avoir plusieurs temps forts. */
export const useShakes = (
	impacts: ShakeOptions[],
): {x: number; y: number; rotate: number} => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	void fps;

	return impacts.reduce(
		(total, impact) => {
			const local = frame - impact.at;
			const duration = impact.duration ?? 8;
			if (local < 0 || local > duration) return total;

			const envelope = Math.pow(
				interpolate(local, [0, duration], [1, 0], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				}),
				2.2,
			);
			const amplitude = impact.amplitude ?? 18;
			const rotation = impact.rotation ?? 1.2;
			const seed = impact.seed ?? `impact-${impact.at}`;
			const t = local * (impact.frequency ?? 0.9);

			return {
				x: total.x + noise2D(`${seed}-x`, t, 0) * amplitude * envelope,
				y: total.y + noise2D(`${seed}-y`, t, 0) * amplitude * envelope,
				rotate: total.rotate + noise2D(`${seed}-r`, t, 0) * rotation * envelope,
			};
		},
		{x: 0, y: 0, rotate: 0},
	);
};

/**
 * Micro-rotation stable, seedée par un index.
 *
 * L'analyse de référence insiste sur des inclinaisons de −4° à +4° à
 * l'apparition des blocs d'UI : c'est ce qui empêche une grille de paraître
 * mécanique. La valeur doit rester constante pour un élément donné, d'où le
 * bruit indexé plutôt qu'un tirage.
 */
export const tiltFor = (index: number, spread = 4, seed = 'tilt'): number =>
	noise2D(seed, index * 1.7, 0) * spread;
