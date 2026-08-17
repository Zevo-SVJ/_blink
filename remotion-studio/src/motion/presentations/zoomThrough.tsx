import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import {easings} from '../dynamics';

export type ZoomThroughProps = {
	/** Échelle atteinte par le plan sortant. Au-delà de ~14, il fait masque. */
	scale?: number;
	/** Échelle de départ du plan entrant : il vient de plus loin. */
	incomingScale?: number;
	/** Flou maximal pendant la traversée. */
	blur?: number;
};

/**
 * Zoom traversant.
 *
 * Le plan sortant grossit jusqu'à ce qu'un de ses éléments remplisse le cadre
 * et serve de masque ; le plan entrant émerge de l'intérieur. C'est la
 * transition la plus caractéristique du langage de référence : on ne coupe pas
 * d'une scène à l'autre, on **traverse** la première.
 *
 * La courbe est déterminante. `expoIn` — quasi immobile au début, fulgurante à
 * la fin — donne la sensation d'accélération d'une caméra qui plonge. Une
 * courbe linéaire ou symétrique produirait un simple agrandissement.
 *
 * Pour que l'effet de masque fonctionne, la scène sortante doit présenter au
 * centre une zone pleine et unie (voir la convention `<Portal>` des scènes
 * Blink) : c'est elle qui recouvre l'écran au moment du raccord.
 */
const ZoomThrough: React.FC<TransitionPresentationComponentProps<ZoomThroughProps>> = ({
	children,
	presentationProgress,
	presentationDirection,
	passedProps,
}) => {
	const maxScale = passedProps.scale ?? 16;
	const incomingScale = passedProps.incomingScale ?? 0.74;
	const maxBlur = passedProps.blur ?? 22;

	const [a, b, c, d] = easings.expoIn;
	const eased = interpolate(presentationProgress, [0, 1], [0, 1], {
		easing: Easing.bezier(a, b, c, d),
	});

	if (presentationDirection === 'exiting') {
		return (
			<AbsoluteFill
				style={{
					transform: `scale(${1 + eased * (maxScale - 1)})`,
					filter: `blur(${(eased * maxBlur).toFixed(2)}px)`,
					// Opacité tenue jusqu'aux trois quarts : le plan sortant doit
					// masquer, pas s'évaporer.
					opacity: interpolate(eased, [0.72, 1], [1, 0], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					}),
				}}
			>
				{children}
			</AbsoluteFill>
		);
	}

	return (
		<AbsoluteFill
			style={{
				transform: `scale(${interpolate(eased, [0, 1], [incomingScale, 1])})`,
				filter: `blur(${(Math.max(0, 1 - eased * 1.6) * maxBlur * 0.5).toFixed(2)}px)`,
				// Fenêtre d'apparition avancée : avec une courbe `expoIn`, la
				// progression reste très basse pendant la première moitié de la
				// transition. Attendre 0,35 laisserait un ventre mou où l'on ne voit
				// plus que le masque.
				opacity: interpolate(eased, [0.12, 0.5], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				}),
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

export const zoomThrough = (
	props: ZoomThroughProps = {},
): TransitionPresentation<ZoomThroughProps> => ({
	component: ZoomThrough,
	props,
});
