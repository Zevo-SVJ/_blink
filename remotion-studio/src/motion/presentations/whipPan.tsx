import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import type {EasingName} from '../dynamics';
import {easings} from '../dynamics';

export type WhipPanProps = {
	direction?: 'left' | 'right';
	/** Dépassement à l'arrivée, en fraction de largeur. */
	overshoot?: number;
	/** Flou de filé maximal. */
	blur?: number;
	/** Recul d'anticipation avant le départ, en fraction de largeur. */
	anticipation?: number;
	/**
	 * Courbe de forme. Laisser vide quand la transition est cadencée par une
	 * Bézier ; passer `'linear'` quand son horloge est déjà un ressort
	 * (`springTiming`) — sinon le même mouvement est lissé deux fois et la
	 * transition se fige dans son premier tiers.
	 */
	curve?: EasingName;
};

/**
 * Filé latéral.
 *
 * Trois ingrédients, dans cet ordre, et aucun n'est facultatif :
 *
 *  1. **anticipation** — la scène recule de 3 % avant de partir. Sans ce recul,
 *     le départ paraît mécanique ;
 *  2. **accélération fulgurante** (`quint`) avec flou de filé proportionnel à
 *     la vitesse, ce qui masque le saut ;
 *  3. **dépassement** à l'arrivée — la scène entrante va 4 % trop loin puis
 *     revient. C'est le détail qui distingue un vrai whip pan d'un simple
 *     glissement.
 *
 * Le flou suit une cloche : nul aux extrémités, maximal au milieu, là où la
 * vitesse est la plus forte.
 */
const WhipPan: React.FC<TransitionPresentationComponentProps<WhipPanProps>> = ({
	children,
	presentationProgress,
	presentationDirection,
	passedProps,
}) => {
	const direction = passedProps.direction ?? 'left';
	const overshoot = passedProps.overshoot ?? 0.04;
	const maxBlur = passedProps.blur ?? 26;
	const anticipation = passedProps.anticipation ?? 0.03;
	const sign = direction === 'left' ? -1 : 1;

	const [a, b, c, d] = easings[passedProps.curve ?? 'quint'];
	const eased = interpolate(presentationProgress, [0, 1], [0, 1], {
		easing: Easing.bezier(a, b, c, d),
	});

	// Cloche de vitesse : le filé n'existe que pendant le déplacement rapide.
	const speed = Math.sin(Math.PI * presentationProgress);
	const blur = (speed * maxBlur).toFixed(2);

	if (presentationDirection === 'exiting') {
		// Le recul d'anticipation se joue sur la progression brute, avant que la
		// courbe n'ait pris le relais.
		const recoil = interpolate(presentationProgress, [0, 0.18, 1], [0, -anticipation, 0], {
			extrapolateRight: 'clamp',
		});
		const offset = (eased * sign + recoil * sign * -1) * 100;

		return (
			<AbsoluteFill
				style={{
					transform: `translate3d(${offset.toFixed(3)}%, 0, 0)`,
					filter: `blur(${blur}px)`,
				}}
			>
				{children}
			</AbsoluteFill>
		);
	}

	const arrival = interpolate(
		eased,
		[0, 0.82, 1],
		[-sign * 100, -sign * -overshoot * 100, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	return (
		<AbsoluteFill
			style={{
				transform: `translate3d(${arrival.toFixed(3)}%, 0, 0)`,
				filter: `blur(${blur}px)`,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

export const whipPan = (
	props: WhipPanProps = {},
): TransitionPresentation<WhipPanProps> => ({
	component: WhipPan,
	props,
});
