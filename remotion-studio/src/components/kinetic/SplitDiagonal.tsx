import type {CSSProperties, ReactNode} from 'react';
import {interpolate} from 'remotion';
import {useProgress} from '@/motion/frame';

export type SplitDiagonalProps = {
	/** Contenu de la moitié haute (au-dessus du trait). */
	top?: ReactNode;
	/** Contenu de la moitié basse. */
	bottom?: ReactNode;
	topColor?: string;
	bottomColor?: string;
	/** Frame d'ouverture. */
	at?: number;
	/**
	 * Inclinaison, en points de pourcentage de hauteur sur toute la largeur.
	 * 70 ≈ 35°.
	 */
	steepness?: number;
	/** Couleur et épaisseur du trait de séparation. */
	lineColor?: string;
	lineWidth?: number;
	style?: CSSProperties;
};

/**
 * ÉCRAN COUPÉ EN DIAGONALE.
 *
 * Deux propositions contradictoires dans le même cadre, séparées par une lame.
 * Le format vertical rend la diagonale beaucoup plus efficace qu'un split
 * horizontal : elle traverse la plus grande dimension de l'image, donc les deux
 * zones obtenues sont larges et lisibles, là où deux bandes horizontales
 * auraient l'air d'un tableau à deux lignes.
 *
 * La chorégraphie d'ouverture est ce qui fait sens :
 *
 *   1. le **trait** se trace d'abord, en six frames. Il arrive dans un cadre
 *      encore vide : c'est lui qui coupe, et on le voit couper ;
 *   2. les deux moitiés entrent ensuite en glissant **perpendiculairement** au
 *      trait, en sens opposés, décalées de trois frames. Elles ne s'affichent
 *      pas de part et d'autre — elles s'écartent, comme deux morceaux d'une même
 *      image qu'on aurait fendue.
 *
 * Chaque moitié est décalée dans sa propre direction avec un `clip-path` fixe :
 * la découpe ne bouge pas, seul le contenu glisse dessous. C'est ce qui garde le
 * trait parfaitement net pendant tout le mouvement.
 */
export const SplitDiagonal: React.FC<SplitDiagonalProps> = ({
	top,
	bottom,
	topColor,
	bottomColor,
	at = 0,
	steepness = 70,
	lineColor = '#FAFAFA',
	lineWidth = 5,
	style,
}) => {
	const draw = useProgress({delay: at, duration: 6, easing: 'quint'});
	const topEnter = useProgress({delay: at + 3, spring: 'whip'});
	const bottomEnter = useProgress({delay: at + 6, spring: 'whip'});

	const edgeLeft = 50 + steepness / 2;
	const edgeRight = 50 - steepness / 2;

	const topClip = `polygon(0% 0%, 100% 0%, 100% ${edgeRight}%, 0% ${edgeLeft}%)`;
	const bottomClip = `polygon(0% ${edgeLeft}%, 100% ${edgeRight}%, 100% 100%, 0% 100%)`;

	// Normale au trait, normalisée : les deux moitiés s'écartent le long de cet
	// axe et non le long des axes du cadre.
	const norm = Math.hypot(100, steepness);
	const nx = steepness / norm;
	const ny = 100 / norm;
	const shift = 340;

	return (
		<div style={{position: 'absolute', inset: 0, ...style}}>
			<div style={{position: 'absolute', inset: 0, clipPath: topClip}}>
				<div
					style={{
						position: 'absolute',
						inset: -shift,
						background: topColor,
						transform: `translate3d(${(-nx * shift * (1 - topEnter)).toFixed(2)}px, ${(-ny * shift * (1 - topEnter)).toFixed(2)}px, 0)`,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						transform: `translate3d(${(-nx * 160 * (1 - topEnter)).toFixed(2)}px, ${(-ny * 160 * (1 - topEnter)).toFixed(2)}px, 0)`,
						opacity: topEnter,
					}}
				>
					{top}
				</div>
			</div>

			<div style={{position: 'absolute', inset: 0, clipPath: bottomClip}}>
				<div
					style={{
						position: 'absolute',
						inset: -shift,
						background: bottomColor,
						transform: `translate3d(${(nx * shift * (1 - bottomEnter)).toFixed(2)}px, ${(ny * shift * (1 - bottomEnter)).toFixed(2)}px, 0)`,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						transform: `translate3d(${(nx * 160 * (1 - bottomEnter)).toFixed(2)}px, ${(ny * 160 * (1 - bottomEnter)).toFixed(2)}px, 0)`,
						opacity: bottomEnter,
					}}
				>
					{bottom}
				</div>
			</div>

			{/* La lame. Elle se trace de gauche à droite. */}
			<svg
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
			>
				<line
					x1={0}
					y1={edgeLeft}
					x2={interpolate(draw, [0, 1], [0, 100])}
					y2={interpolate(draw, [0, 1], [edgeLeft, edgeRight])}
					stroke={lineColor}
					strokeWidth={lineWidth}
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</div>
	);
};
