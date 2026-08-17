import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import {easings} from '../dynamics';

export type WipeUpProps = {
	/** Recul du plan sortant pendant que le rideau monte : la profondeur. */
	recede?: number;
	/** Amplitude de l'ondulation du bord, en px. 0 pour un bord droit. */
	wave?: number;
};

/**
 * Rideau montant.
 *
 * Le plan entrant monte depuis le bas et recouvre le sortant, qui recule
 * légèrement — c'est ce recul qui crée la profondeur : sans lui, deux calques
 * glissent l'un sur l'autre à plat.
 *
 * Le bord supérieur n'est pas droit. Une ondulation légère, tracée en
 * `border-radius` asymétrique, suffit à rendre le rideau souple plutôt que
 * mécanique — le même principe qu'une vague qui monte.
 */
const WipeUp: React.FC<TransitionPresentationComponentProps<WipeUpProps>> = ({
	children,
	presentationProgress,
	presentationDirection,
	passedProps,
}) => {
	const recede = passedProps.recede ?? 0.08;
	const wave = passedProps.wave ?? 60;

	const [a, b, c, d] = easings.expo;
	const eased = interpolate(presentationProgress, [0, 1], [0, 1], {
		easing: Easing.bezier(a, b, c, d),
	});

	if (presentationDirection === 'exiting') {
		return (
			<AbsoluteFill
				style={{
					transform: `scale(${1 - eased * recede})`,
					filter: `brightness(${(1 - eased * 0.45).toFixed(3)})`,
				}}
			>
				{children}
			</AbsoluteFill>
		);
	}

	// L'ondulation s'aplatit à mesure que le rideau se pose : la vague n'existe
	// que pendant le mouvement.
	const curve = wave * (1 - eased);

	return (
		<AbsoluteFill
			style={{
				transform: `translate3d(0, ${((1 - eased) * 100).toFixed(3)}%, 0)`,
				borderTopLeftRadius: `${(curve * 3).toFixed(0)}px ${curve.toFixed(0)}px`,
				borderTopRightRadius: `${(curve * 3).toFixed(0)}px ${curve.toFixed(0)}px`,
				overflow: 'hidden',
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

export const wipeUp = (
	props: WipeUpProps = {},
): TransitionPresentation<WipeUpProps> => ({
	component: WipeUp,
	props,
});
