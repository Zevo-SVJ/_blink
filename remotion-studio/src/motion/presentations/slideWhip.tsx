import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import type {EasingName} from '../dynamics';
import {easings} from '../dynamics';

export type SlideWhipProps = {
	/**
	 * `up` fait filer le plan sortant vers le haut — le geste du pouce qui
	 * balaie. `down` inverse, et ne sert qu'à revenir en arrière dans le récit.
	 */
	direction?: 'up' | 'down';
	/** Dépassement à l'arrivée, en fraction de hauteur. */
	overshoot?: number;
	/** Flou de filé maximal, en px. */
	blur?: number;
	/** Recul d'anticipation avant le départ, en fraction de hauteur. */
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
 * SLIDE WHIP — le balayage vertical.
 *
 * Le plan entier part vers le haut à toute vitesse et le suivant le remplace
 * par le bas : c'est le geste du doigt sur un fil vertical, transposé au
 * montage. Sur un format 9:16 c'est la transition la plus « native » qui
 * existe — le spectateur la reconnaît sans y penser parce qu'il la produit
 * lui-même cent fois par jour.
 *
 * Trois ingrédients, aucun facultatif :
 *
 *  1. **anticipation** — le plan descend de 2,5 % avant de filer. C'est ce
 *     contre-mouvement qui fait qu'un départ n'est pas un déclenchement ;
 *  2. **flou de filé** en cloche, maximal à mi-course, là où la vitesse est
 *     réelle. Il masque le saut et donne la sensation de vitesse ;
 *  3. **dépassement** à l'arrivée — le plan entrant va 3,5 % trop loin puis
 *     revient se poser.
 *
 * Aucune opacité n'est touchée. Un fondu ici détruirait tout : la vitesse se
 * lit parce que les deux plans restent parfaitement opaques et que le raccord
 * est une occlusion, pas un mélange.
 */
const SlideWhip: React.FC<TransitionPresentationComponentProps<SlideWhipProps>> = ({
	children,
	presentationProgress,
	presentationDirection,
	passedProps,
}) => {
	const direction = passedProps.direction ?? 'up';
	const overshoot = passedProps.overshoot ?? 0.035;
	const maxBlur = passedProps.blur ?? 34;
	const anticipation = passedProps.anticipation ?? 0.025;
	// `up` : le plan sortant monte, donc son offset devient négatif.
	const sign = direction === 'up' ? -1 : 1;

	const [a, b, c, d] = easings[passedProps.curve ?? 'quint'];
	const eased = interpolate(presentationProgress, [0, 1], [0, 1], {
		easing: Easing.bezier(a, b, c, d),
	});

	// Cloche de vitesse : le filé n'existe que pendant le déplacement.
	const blur = (Math.sin(Math.PI * presentationProgress) * maxBlur).toFixed(2);

	if (presentationDirection === 'exiting') {
		// Le recul se calcule sur la progression brute, avant la courbe : il doit
		// se produire alors que la courbe n'a encore quasiment rien avancé.
		const recoil = interpolate(
			presentationProgress,
			[0, 0.16, 1],
			[0, anticipation, 0],
			{extrapolateRight: 'clamp'},
		);
		const offset = (eased * sign - recoil * sign) * 100;

		return (
			<AbsoluteFill
				style={{
					transform: `translate3d(0, ${offset.toFixed(3)}%, 0)`,
					filter: `blur(${blur}px)`,
				}}
			>
				{children}
			</AbsoluteFill>
		);
	}

	const arrival = interpolate(
		eased,
		[0, 0.84, 1],
		[-sign * 100, sign * overshoot * 100, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	return (
		<AbsoluteFill
			style={{
				transform: `translate3d(0, ${arrival.toFixed(3)}%, 0)`,
				filter: `blur(${blur}px)`,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

export const slideWhip = (
	props: SlideWhipProps = {},
): TransitionPresentation<SlideWhipProps> => ({
	component: SlideWhip,
	props,
});
