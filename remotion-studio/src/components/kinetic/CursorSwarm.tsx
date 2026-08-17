import {noise2D} from '@remotion/noise';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {easings} from '@/motion/dynamics';
import {progressAtFrame} from '@/motion/frame';
import {useVideoConfig} from 'remotion';

export type CursorSwarmProps = {
	/** Frame d'entrée du premier curseur. */
	at: number;
	count?: number;
	/** Décalage entre deux curseurs, en frames. */
	step?: number;
	/** Rayon de départ, hors cadre. */
	from?: number;
	/** Rayon d'arrêt autour de la cible. */
	to?: number;
	colors?: readonly string[];
	size?: number;
	seed?: string;
};

const CURSOR_PATH =
	'M5 2.5 L5 19.2 L9.1 15.4 L11.9 21.5 L14.9 20.1 L12.1 14.2 L17.8 13.9 Z';

/**
 * Nuée de curseurs convergents.
 *
 * La métaphore centrale de Blink : ce ne sont pas des visiteurs anonymes, ce
 * sont des regards, et ils arrivent de partout. Chaque curseur part d'un point
 * hors cadre, décélère fortement à l'approche, et **s'arrête à distance** de la
 * cible plutôt que dessus — ils observent, ils ne touchent pas.
 *
 * Les angles sont répartis puis dispersés par un bruit indexé : une couronne
 * parfaitement régulière se lirait comme un diagramme, pas comme une foule.
 *
 * À placer dans un parent en `position: relative`.
 */
export const CursorSwarm: React.FC<CursorSwarmProps> = ({
	at,
	count = 9,
	step = 3,
	from = 1100,
	to = 360,
	colors = ['#FAFAFA', '#AEE7FA', '#8ED5F6'],
	size = 44,
	seed = 'swarm',
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	return (
		<>
			{Array.from({length: count}, (_, index) => {
				const delay = at + index * step;
				const progress = progressAtFrame(frame, fps, {
					delay,
					spring: 'popTight',
				});
				if (progress <= 0.001) return null;

				const angle =
					(index / count) * Math.PI * 2 + noise2D(seed, index * 1.7, 0) * 0.5;
				const startRadius = from * (0.85 + noise2D(`${seed}-d`, index * 2.1, 0) * 0.2);
				const endRadius = to * (0.82 + noise2D(`${seed}-e`, index * 1.3, 0) * 0.28);
				const radius = startRadius + (endRadius - startRadius) * progress;

				const x = Math.cos(angle) * radius;
				const y = Math.sin(angle) * radius;

				// Le curseur pointe vers le centre.
				//
				// Le tracé par défaut pointe vers le haut-gauche, soit environ −122°.
				// Pour viser le centre depuis un point situé à l'angle θ, il faut
				// s'orienter à θ+180° : la rotation vaut donc θ − 58°. Un léger
				// désalignement aléatoire évite l'alignement mécanique.
				const lean =
					(angle * 180) / Math.PI - 58 + noise2D(`${seed}-r`, index, 0) * 10;

				return (
					<div
						key={index}
						style={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${lean.toFixed(2)}deg) scale(${(0.75 + progress * 0.25).toFixed(3)})`,
							opacity: Math.min(1, progress * 2.4),
							filter: 'drop-shadow(0 8px 18px rgba(0,6,20,0.6))',
						}}
					>
						<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
							<path
								d={CURSOR_PATH}
								fill={colors[index % colors.length]}
								stroke="rgba(4,18,47,0.8)"
								strokeWidth={1.4}
								strokeLinejoin="round"
							/>
						</svg>
					</div>
				);
			})}
		</>
	);
};

export type ViewCounterProps = {
	at: number;
	to: number;
	duration?: number;
	label?: string;
	color?: string;
	fontFamily?: string;
};

/**
 * Compteur de vues qui s'emballe.
 *
 * Décélération exponentielle : le nombre défile trop vite pour être lu au
 * début, puis se stabilise. C'est le mouvement qui porte l'information — « ça
 * monte vite » — pas la valeur finale.
 */
export const ViewCounter: React.FC<ViewCounterProps> = ({
	at,
	to,
	duration = 52,
	label = 'vues',
	color = '#AEE7FA',
	fontFamily,
}) => {
	const frame = useCurrentFrame();
	const [a, b, c, d] = easings.expo;
	const progress = interpolate(frame - at, [0, duration], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.bezier(a, b, c, d),
	});
	const value = Math.round(to * progress);

	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'baseline',
				gap: 12,
				fontFamily,
				color,
			}}
		>
			<span
				style={{
					fontSize: 64,
					fontWeight: 800,
					letterSpacing: '-0.04em',
					fontVariantNumeric: 'tabular-nums',
				}}
			>
				{value.toLocaleString('fr-FR')}
			</span>
			<span style={{fontSize: 26, fontWeight: 600, opacity: 0.75}}>{label}</span>
		</div>
	);
};
