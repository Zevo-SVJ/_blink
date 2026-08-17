import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {AbsoluteFill, interpolate} from 'remotion';

export type GlassCutProps = {
	/** Flou maximal atteint au cœur de la transition, en px. */
	blur?: number;
	/** Agrandissement du plan sortant / du plan entrant. */
	scale?: number;
};

/**
 * Transition maison, dans l'esprit des enchaînements iOS : le plan sortant
 * recule légèrement en se floutant, le plan entrant arrive de plus loin et se
 * pose net. Pas de volet ni de balayage — la profondeur suffit.
 */
const GlassCut: React.FC<TransitionPresentationComponentProps<GlassCutProps>> = ({
	children,
	presentationProgress,
	presentationDirection,
	passedProps,
}) => {
	const maxBlur = passedProps.blur ?? 16;
	const amplitude = passedProps.scale ?? 0.06;
	const isEntering = presentationDirection === 'entering';

	const scale = isEntering
		? interpolate(presentationProgress, [0, 1], [1 + amplitude, 1])
		: interpolate(presentationProgress, [0, 1], [1, 1 - amplitude]);

	const blur = isEntering
		? interpolate(presentationProgress, [0, 1], [maxBlur, 0])
		: interpolate(presentationProgress, [0, 1], [0, maxBlur]);

	const opacity = isEntering
		? interpolate(presentationProgress, [0, 0.65], [0, 1], {
				extrapolateRight: 'clamp',
			})
		: interpolate(presentationProgress, [0.35, 1], [1, 0], {
				extrapolateLeft: 'clamp',
			});

	return (
		<AbsoluteFill
			style={{
				opacity,
				transform: `scale(${scale})`,
				filter: `blur(${blur}px)`,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

export const glassCut = (
	props: GlassCutProps = {},
): TransitionPresentation<GlassCutProps> => ({
	component: GlassCut,
	props,
});
