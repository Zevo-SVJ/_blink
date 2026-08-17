import {noise2D} from '@remotion/noise';
import type {CSSProperties} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

export type SparksProps = {
	/** Frame de l'éclatement. */
	at?: number;
	count?: number;
	/** Rayon atteint par la particule médiane, en px. */
	spread?: number;
	/** Durée de vie d'une particule, en frames. */
	life?: number;
	/** Décalage entre les particules, en frames. Petit : c'est un éclatement. */
	step?: number;
	color?: string;
	/** Couleur secondaire, tirée une particule sur trois. */
	color2?: string;
	size?: number;
	/** Chute appliquée en fin de vie, en px. 0 = pas de gravité. */
	gravity?: number;
	seed?: string;
	style?: CSSProperties;
};

/**
 * PARTICULES.
 *
 * Un éclatement de points depuis le centre, entièrement déterministe :
 * l'angle, le rayon, la taille et le retard de chaque particule sont tirés de
 * `noise2D` indexé, donc identiques à chaque rendu. `Math.random()` produirait
 * un scintillement différent à chaque frame — chaque image étant peinte dans un
 * contexte isolé, le tirage serait refait pour chaque frame et les particules
 * n'auraient aucune trajectoire.
 *
 * Trois choix qui séparent un éclat crédible d'un feu d'artifice de clipart :
 *
 *   • **rayons inégaux** — le facteur varie de 0,45 à 1. Des particules à
 *     distance égale dessinent un cercle, et un cercle se lit comme une forme,
 *     pas comme une projection ;
 *   • **gravité en fin de course** — les particules retombent légèrement sur la
 *     dernière moitié de leur vie. C'est ce qui leur donne une masse ;
 *   • **fin en fondu ET en rétrécissement** — un point qui disparaît seulement
 *     en opacité laisse un fantôme ; il doit aussi se réduire.
 */
export const Sparks: React.FC<SparksProps> = ({
	at = 0,
	count = 26,
	spread = 420,
	life = 26,
	step = 0.6,
	color = '#AEE7FA',
	color2 = '#389FFA',
	size = 12,
	gravity = 120,
	seed = 'spark',
	style,
}) => {
	const frame = useCurrentFrame();
	const local = frame - at;

	if (local < -1 || local > life + count * step) return null;

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				display: 'grid',
				placeItems: 'center',
				pointerEvents: 'none',
				...style,
			}}
		>
			{Array.from({length: count}, (_, index) => {
				const delay = index * step;
				const t = interpolate(local - delay, [0, life], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				});
				if (t <= 0 || t >= 1) return null;

				const angle =
					(index / count) * Math.PI * 2 + noise2D(`${seed}-a`, index * 1.3, 0) * 0.5;
				const reach = spread * (0.45 + Math.abs(noise2D(`${seed}-r`, index * 2.1, 0)) * 0.55);
				// `1 − (1−t)²` : départ vif, arrivée qui s'éteint. Une particule
				// décélère, elle n'avance pas à vitesse constante.
				const travel = (1 - Math.pow(1 - t, 2)) * reach;
				const fall = gravity * Math.pow(Math.max(0, t - 0.5) * 2, 2);
				const dot = size * (0.6 + Math.abs(noise2D(`${seed}-s`, index * 0.9, 0)) * 0.8);
				const tint = index % 3 === 0 ? color2 : color;

				return (
					<div
						key={index}
						style={{
							position: 'absolute',
							width: dot,
							height: dot,
							borderRadius: '50%',
							background: tint,
							boxShadow: `0 0 ${(dot * 2).toFixed(1)}px ${tint}`,
							transform: `translate3d(${(Math.cos(angle) * travel).toFixed(2)}px, ${(Math.sin(angle) * travel + fall).toFixed(2)}px, 0) scale(${(1 - t * 0.75).toFixed(3)})`,
							opacity: interpolate(t, [0, 0.12, 0.7, 1], [0, 1, 0.9, 0]),
						}}
					/>
				);
			})}
		</div>
	);
};
