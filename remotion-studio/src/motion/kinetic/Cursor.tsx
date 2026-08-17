import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {easings} from '../dynamics';

export type Point = {x: number; y: number};

export type CursorProps = {
	from: Point;
	to: Point;
	/** Frame de départ du déplacement. */
	at: number;
	/** Durée du trajet, en frames. */
	duration?: number;
	/**
	 * Bombement de la trajectoire, en px, perpendiculaire à la droite
	 * départ→arrivée. Un curseur qui va droit au but a l'air téléguidé ;
	 * une main décrit toujours un arc.
	 */
	arc?: number;
	/** Frame du clic. Déclenche l'écrasement du curseur. */
	pressAt?: number;
	size?: number;
	color?: string;
};

/**
 * Curseur animé.
 *
 * Deux détails font toute la crédibilité : la **trajectoire en arc** (une main
 * ne suit jamais une droite) et la **décélération forte** à l'approche de la
 * cible, comme un geste qui vise. Le clic écrase le curseur pendant trois
 * frames — c'est ce qui rend la cause visible avant l'effet.
 */
export const Cursor: React.FC<CursorProps> = ({
	from,
	to,
	at,
	duration = 24,
	arc = 120,
	pressAt,
	size = 46,
	color = '#FAFAFA',
}) => {
	const frame = useCurrentFrame();
	const local = frame - at;
	if (local < 0) return null;

	const [a, b, c, d] = easings.expo;
	const t = interpolate(local, [0, duration], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.bezier(a, b, c, d),
	});

	// Bézier quadratique : le point de contrôle est décalé perpendiculairement
	// au milieu du segment.
	const midX = (from.x + to.x) / 2;
	const midY = (from.y + to.y) / 2;
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const norm = Math.hypot(dx, dy) || 1;
	const controlX = midX + (-dy / norm) * arc;
	const controlY = midY + (dx / norm) * arc;

	const inv = 1 - t;
	const x = inv * inv * from.x + 2 * inv * t * controlX + t * t * to.x;
	const y = inv * inv * from.y + 2 * inv * t * controlY + t * t * to.y;

	// Le curseur s'oriente légèrement dans le sens de sa tangente.
	const tangentX = 2 * inv * (controlX - from.x) + 2 * t * (to.x - controlX);
	const tangentY = 2 * inv * (controlY - from.y) + 2 * t * (to.y - controlY);
	const lean = Math.atan2(tangentY, tangentX) * (180 / Math.PI);

	const pressLocal = pressAt === undefined ? -1 : frame - pressAt;
	const press =
		pressLocal >= 0 && pressLocal <= 4
			? interpolate(pressLocal, [0, 2, 4], [1, 0.78, 1])
			: 1;

	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: size,
				height: size,
				marginLeft: -size * 0.18,
				marginTop: -size * 0.1,
				transform: `rotate(${(lean * 0.06).toFixed(2)}deg) scale(${press.toFixed(3)})`,
				transformOrigin: '18% 10%',
				filter: 'drop-shadow(0 10px 22px rgba(0,6,20,0.55))',
			}}
		>
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
				<path
					d="M5 2.5 L5 19.2 L9.1 15.4 L11.9 21.5 L14.9 20.1 L12.1 14.2 L17.8 13.9 Z"
					fill={color}
					stroke="rgba(4,18,47,0.85)"
					strokeWidth={1.3}
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
};
