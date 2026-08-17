import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill} from 'remotion';
import type {ShakeOptions} from '../physics/shake';
import {useShakes} from '../physics/shake';

export type ImpactProps = {
	children: ReactNode;
	/** Les temps forts de la scène. */
	hits: ShakeOptions[];
	/**
	 * Sur-cadrage. La secousse déplace la scène de quelques pixels ; sans marge,
	 * on verrait le vide apparaître sur un bord. 1,04 suffit pour une amplitude
	 * de 20 px sur un cadre de 1080 px de large.
	 */
	overscan?: number;
	style?: CSSProperties;
};

/**
 * Secoue toute la scène sur ses temps forts.
 *
 * À envelopper autour du contenu entier, jamais autour d'un élément isolé : la
 * secousse doit se lire comme un mouvement de caméra, donc tout bouge ensemble.
 * C'est ce décalage global de quelques pixels qui donne du poids à un gros mot
 * qui arrive — sans lui, l'échelle seule paraît molle.
 */
export const Impact: React.FC<ImpactProps> = ({
	children,
	hits,
	overscan = 1.04,
	style,
}) => {
	const shake = useShakes(hits);

	return (
		<AbsoluteFill
			style={{
				transform: `translate3d(${shake.x.toFixed(2)}px, ${shake.y.toFixed(2)}px, 0) rotate(${shake.rotate.toFixed(3)}deg) scale(${overscan})`,
				...style,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};
