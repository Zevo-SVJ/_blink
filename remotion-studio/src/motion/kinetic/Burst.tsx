import {noise2D} from '@remotion/noise';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {easings} from '../dynamics';

export type BurstProps = {
	/** Frame d'émission. */
	at: number;
	/** Durée de vie des éclats, en frames. */
	duration?: number;
	count?: number;
	/** Distance parcourue, en px. */
	radius?: number;
	color?: string;
	/** Longueur des traits. */
	length?: number;
	thickness?: number;
	seed?: string;
};

/**
 * Éclats radiaux.
 *
 * Ce sont les petits traits qui partent du centre quand un élément disparaît
 * ou qu'un clic aboutit. Ils ne représentent rien — leur seul rôle est de
 * donner une direction et une énergie à un évènement qui, sans eux, serait une
 * simple disparition.
 *
 * Décélération très forte (`expo`) : ils jaillissent puis s'arrêtent presque
 * aussitôt, comme des étincelles.
 *
 * À placer dans un parent en `position: relative` — les éclats partent de son
 * centre.
 */
export const Burst: React.FC<BurstProps> = ({
	at,
	duration = 20,
	count = 6,
	radius = 220,
	color = '#FAFAFA',
	length = 46,
	thickness = 5,
	seed = 'burst',
}) => {
	const frame = useCurrentFrame();
	const local = frame - at;
	if (local < 0 || local > duration) return null;

	const [a, b, c, d] = easings.expo;
	const progress = interpolate(local, [0, duration], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.bezier(a, b, c, d),
	});
	// Plateau d'opacité large : avec une décélération exponentielle, un fondu
	// trop précoce rend les éclats invisibles dès la deuxième frame.
	const opacity = interpolate(progress, [0, 0.12, 0.55, 1], [0, 1, 0.9, 0]);

	return (
		<>
			{Array.from({length: count}, (_, index) => {
				// Angles régulièrement répartis, puis dispersés par un bruit stable :
				// une étoile parfaite se lit comme un pictogramme, pas comme un éclat.
				const base = (index / count) * Math.PI * 2;
				const jitter = noise2D(seed, index * 2.3, 0) * 0.35;
				const angle = base + jitter;
				const spread = radius * (0.75 + noise2D(`${seed}-r`, index * 1.1, 0) * 0.25);

				const distance = spread * progress;
				const x = Math.cos(angle) * distance;
				const y = Math.sin(angle) * distance;
				const shrink = 1 - progress * 0.45;

				return (
					<div
						key={index}
						style={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							width: length * shrink,
							height: thickness,
							marginLeft: -length / 2,
							marginTop: -thickness / 2,
							borderRadius: thickness,
							background: color,
							opacity,
							transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${((angle * 180) / Math.PI).toFixed(2)}deg)`,
							transformOrigin: '50% 50%',
						}}
					/>
				);
			})}
		</>
	);
};
