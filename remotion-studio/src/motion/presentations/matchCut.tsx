import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {AbsoluteFill, interpolate} from 'remotion';

export type MatchCutProps = {
	/**
	 * Course de la caméra pendant le raccord, en fraction de hauteur. C'est
	 * elle qui porte toute la continuité : 0,2 = la caméra descend d'un
	 * cinquième d'écran pendant la transition.
	 */
	drift?: number;
	/** `down` suit un objet qui tombe ; `up` suit un objet qui monte. */
	direction?: 'down' | 'up';
	/** Progression à laquelle les deux plans s'échangent. */
	swapAt?: number;
	/** Flou de mouvement au moment de l'échange, en px. */
	blur?: number;
	/** Résidu lumineux sur l'échange. 0 le supprime. */
	flash?: number;
	/** Couleur du résidu. */
	flashColor?: string;
};

/**
 * MATCH CUT D'OBJET — la trajectoire qui survit au raccord.
 *
 * Un objet tombe. On coupe. Un autre objet continue exactement la même chute
 * dans le plan suivant. L'œil ne perçoit pas un changement de plan mais une
 * transformation : le premier objet **est devenu** le second.
 *
 * Le mécanisme est en deux moitiés, et les deux sont obligatoires :
 *
 *   1. **côté contenu** — le plan sortant doit avoir un objet qui quitte le bas
 *      du cadre au moment du raccord (sortie `dropOut`, sans fondu, sinon la
 *      trajectoire n'est jamais allée jusqu'au bord), et le plan entrant doit
 *      démarrer avec un objet qui entre par le haut à la même abscisse et à la
 *      même vitesse (`dropHigh`, ressort `heavyDrop`) ;
 *
 *   2. **côté caméra** — c'est ce que fait ce fichier. Les deux plans partagent
 *      une **même dérive verticale à vitesse identique** : `cam(p)` pour le
 *      sortant, `cam(p)` décalé d'une course entière pour l'entrant. Leurs
 *      dérivées sont égales, donc au moment de l'échange la vitesse apparente
 *      de l'image ne change pas d'un poil. C'est cette égalité de vitesse qui
 *      fait le match cut ; sans elle on ne voit qu'une coupe sèche.
 *
 * L'échange est **instantané** — pas de fondu, jamais. Un mélange des deux
 * plans détruirait l'illusion : il révélerait qu'il y a deux objets.
 *
 * Le facteur d'échelle n'est pas décoratif. Translater un plan de `drift` sur
 * l'axe vertical exposerait une bande vide de la même hauteur ; le `scale`
 * compense exactement ce débord (`1 + 2·drift·(1−p)` couvre un décalage de
 * `drift·(1−p)` de chaque côté) et retombe à 1 pile à l'arrivée. Effet
 * secondaire heureux : le plan entrant se pose en sortant d'un léger
 * sur-cadrage, ce qui ressemble à une caméra qui reprend son assiette après une
 * chute.
 */
const MatchCut: React.FC<TransitionPresentationComponentProps<MatchCutProps>> = ({
	children,
	presentationProgress,
	presentationDirection,
	passedProps,
}) => {
	const drift = passedProps.drift ?? 0.2;
	const direction = passedProps.direction ?? 'down';
	const swapAt = passedProps.swapAt ?? 0.5;
	const maxBlur = passedProps.blur ?? 16;
	const flash = passedProps.flash ?? 0.1;
	const flashColor = passedProps.flashColor ?? '#FFFFFF';

	// La caméra suit l'objet : s'il descend, le monde monte dans le cadre.
	const sign = direction === 'down' ? -1 : 1;

	// Volontairement **linéaire**. Une courbe d'accélération ferait varier la
	// vitesse pendant le raccord, et c'est précisément la constance de cette
	// vitesse qui rend la trajectoire continue.
	const p = presentationProgress;

	// Cloche de flou centrée sur l'échange, pas sur le milieu de la transition.
	const blur = (
		Math.exp(-Math.pow((p - swapAt) / 0.22, 2)) * maxBlur
	).toFixed(2);

	if (presentationDirection === 'exiting') {
		const offset = sign * drift * 100 * p;
		const cover = 1 + 2 * drift * p;

		return (
			<AbsoluteFill
				style={{
					transform: `translate3d(0, ${offset.toFixed(3)}%, 0) scale(${cover.toFixed(4)})`,
					filter: `blur(${blur}px)`,
				}}
			>
				{children}
			</AbsoluteFill>
		);
	}

	const offset = sign * drift * 100 * (p - 1);
	const cover = 1 + 2 * drift * (1 - p);

	return (
		<>
			<AbsoluteFill
				style={{
					transform: `translate3d(0, ${offset.toFixed(3)}%, 0) scale(${cover.toFixed(4)})`,
					filter: `blur(${blur}px)`,
					// L'échange, en une frame. `step-end` n'existe pas ici : on le
					// fabrique avec une rampe de largeur nulle.
					opacity: p < swapAt ? 0 : 1,
				}}
			>
				{children}
			</AbsoluteFill>

			{flash > 0 ? (
				<AbsoluteFill
					style={{
						backgroundColor: flashColor,
						opacity:
							interpolate(p, [swapAt, swapAt + 0.28], [flash, 0], {
								extrapolateLeft: 'clamp',
								extrapolateRight: 'clamp',
							}) * (p < swapAt ? 0 : 1),
						mixBlendMode: 'screen',
					}}
				/>
			) : null}
		</>
	);
};

export const matchCut = (
	props: MatchCutProps = {},
): TransitionPresentation<MatchCutProps> => ({
	component: MatchCut,
	props,
});
