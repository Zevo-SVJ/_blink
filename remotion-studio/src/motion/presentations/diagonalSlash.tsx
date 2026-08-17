import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import type {EasingName} from '../dynamics';
import {easings} from '../dynamics';

export type DiagonalSlashProps = {
	/**
	 * Inclinaison du trait, en unités de pourcentage de hauteur sur 100 % de
	 * largeur. 70 donne ~35° — franchement diagonal sans devenir vertical.
	 */
	steepness?: number;
	/** `down` fait descendre le trait ; `up` le fait remonter. */
	direction?: 'down' | 'up';
	/** Épaisseur du trait lumineux, en px. */
	thickness?: number;
	/** Couleur du trait. Doit trancher sur les deux plans. */
	color?: string;
	/** Décalage du plan sortant dans l'axe du trait, en % de largeur. */
	push?: number;
	/**
	 * Courbe de forme. Laisser vide quand la transition est cadencée par une
	 * Bézier ; passer `'linear'` quand son horloge est déjà un ressort
	 * (`springTiming`) — sinon le même mouvement est lissé deux fois et la
	 * transition se fige dans son premier tiers.
	 */
	curve?: EasingName;
};

/**
 * DIAGONAL CUT / SLASH — le trait qui ouvre l'image.
 *
 * Un trait lumineux traverse le cadre en diagonale et le plan suivant apparaît
 * dans son sillage. C'est la seule des quatre transitions du régime qui
 * **révèle** au lieu de déplacer : rien ne bouge, l'image est ouverte.
 *
 * Sa raison d'être est géométrique. Les trois autres raccords travaillent sur
 * les axes horizontal et vertical, donc sur les bords du cadre. La diagonale
 * est le seul angle qui n'existe nulle part ailleurs dans une vidéo verticale —
 * c'est ce qui la rend immédiatement identifiable, et c'est pour cette raison
 * qu'elle est réservée aux ruptures de récit.
 *
 * Le plan entrant est découpé par un `clip-path` dont l'arête suit exactement le
 * trait. Trois précisions qui font la différence entre un effet et un raccord :
 *
 *   • le trait est **doublé** — une lueur large et sourde sous un filet vif —
 *     sinon il se lit comme une bordure et non comme une lame ;
 *   • le plan sortant reçoit une **poussée** de 2 % dans l'axe du trait : sans
 *     elle, la moitié de l'image est parfaitement immobile pendant le raccord,
 *     ce qui trahit un fondu déguisé ;
 *   • aucune opacité n'est modifiée. Les deux plans restent pleins ; c'est la
 *     découpe qui fait tout le travail.
 *
 * Le trait est tracé en SVG avec `preserveAspectRatio="none"` et
 * `vectorEffect="non-scaling-stroke"` : la géométrie suit le cadre (donc reste
 * alignée avec la découpe) mais l'épaisseur reste exprimée en pixels réels au
 * lieu d'être étirée par le rapport 9:16.
 */
const DiagonalSlash: React.FC<
	TransitionPresentationComponentProps<DiagonalSlashProps>
> = ({children, presentationProgress, presentationDirection, passedProps}) => {
	const steepness = passedProps.steepness ?? 70;
	const direction = passedProps.direction ?? 'down';
	const thickness = passedProps.thickness ?? 8;
	const color = passedProps.color ?? '#FFE93D';
	const push = passedProps.push ?? 2;

	const [a, b, c, d] = easings[passedProps.curve ?? 'quint'];
	const eased = interpolate(presentationProgress, [0, 1], [0, 1], {
		easing: Easing.bezier(a, b, c, d),
	});

	// Le trait est la droite qui coupe le bord gauche à `edgeLeft` et le bord
	// droit `steepness` plus haut — la pente est la même dans les deux sens, seul
	// le sens de balayage change.
	//
	// La droite est entièrement hors cadre par le haut quand `edgeLeft ≤ 0`, et
	// entièrement hors cadre par le bas quand `edgeRight ≥ 100`, c'est-à-dire
	// `edgeLeft ≥ 100 + steepness`. Balayer `edgeLeft` entre ces deux bornes
	// couvre donc exactement le cadre, sans laisser de coin non révélé à
	// l'arrivée.
	const travel = interpolate(eased, [0, 1], [0, 100 + steepness]);
	const edgeLeft = direction === 'down' ? travel : 100 + steepness - travel;
	const edgeRight = edgeLeft - steepness;

	if (presentationDirection === 'exiting') {
		// Poussée dans l'axe du trait : le plan sortant glisse de quelques pixels
		// perpendiculairement à la lame, comme s'il était chassé par elle.
		const shove = interpolate(eased, [0, 1], [0, push]);
		const sign = direction === 'down' ? 1 : -1;

		return (
			<AbsoluteFill
				style={{
					transform: `translate3d(${(-shove * sign).toFixed(3)}%, ${(shove * sign * 0.6).toFixed(3)}%, 0) scale(${(1 + shove / 100).toFixed(4)})`,
				}}
			>
				{children}
			</AbsoluteFill>
		);
	}

	// Région révélée : tout ce qui se trouve au-dessus du trait quand il
	// descend, tout ce qui se trouve en dessous quand il remonte.
	const clip =
		direction === 'down'
			? `polygon(0% 0%, 100% 0%, 100% ${edgeRight.toFixed(3)}%, 0% ${edgeLeft.toFixed(3)}%)`
			: `polygon(0% ${edgeLeft.toFixed(3)}%, 100% ${edgeRight.toFixed(3)}%, 100% 100%, 0% 100%)`;

	return (
		<>
			<AbsoluteFill style={{clipPath: clip}}>{children}</AbsoluteFill>

			{/* La lame. Elle vit au-dessus des deux plans, et disparaît avec le
			    raccord — un trait qui resterait après coup serait un objet. */}
			<AbsoluteFill
				style={{
					opacity: interpolate(eased, [0, 0.08, 0.9, 1], [0, 1, 1, 0], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					}),
				}}
			>
				<svg
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					style={{width: '100%', height: '100%'}}
				>
					<line
						x1={0}
						y1={edgeLeft}
						x2={100}
						y2={edgeRight}
						stroke={color}
						strokeWidth={thickness * 4}
						strokeOpacity={0.22}
						vectorEffect="non-scaling-stroke"
					/>
					<line
						x1={0}
						y1={edgeLeft}
						x2={100}
						y2={edgeRight}
						stroke={color}
						strokeWidth={thickness}
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
			</AbsoluteFill>
		</>
	);
};

export const diagonalSlash = (
	props: DiagonalSlashProps = {},
): TransitionPresentation<DiagonalSlashProps> => ({
	component: DiagonalSlash,
	props,
});
