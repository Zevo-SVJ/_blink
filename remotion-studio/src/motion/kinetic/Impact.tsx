import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {SpringName} from '../dynamics';
import {progressAtFrame} from '../frame';
import type {ShakeOptions} from '../physics/shake';
import {useShakes} from '../physics/shake';

export type PunchOptions = {
	/** Frame du coup de zoom. */
	at: number;
	/** Échelle atteinte. 1,22 pour un punch, 0,9 pour un recul. */
	to: number;
	/** Durée de la poussée, en frames. 5 = brutal. */
	rise?: number;
	/**
	 * Retient l'échelle atteinte au lieu de revenir à 1.
	 *
	 * C'est ce qui distingue un **punch zoom** (on frappe puis on revient) d'un
	 * **zoom de sortie** (on recule et on reste reculé pour être propulsé hors
	 * du cadre par le raccord).
	 */
	hold?: boolean;
	/** Ressort du retour. Ignoré quand `hold` est vrai. */
	spring?: SpringName;
};

export type ImpactProps = {
	children: ReactNode;
	/** Les temps forts de la scène. */
	hits: ShakeOptions[];
	/**
	 * Mouvements de caméra sur l'axe Z.
	 *
	 * Ils se **cumulent** multiplicativement : deux punchs rapprochés
	 * s'additionnent au lieu de se remplacer, ce qui est exactement ce qu'on
	 * veut sur une rafale.
	 */
	punches?: PunchOptions[];
	/**
	 * Sur-cadrage. La secousse déplace la scène de quelques pixels ; sans marge,
	 * on verrait le vide apparaître sur un bord. 1,04 suffit pour une amplitude
	 * de 20 px sur un cadre de 1080 px de large.
	 */
	overscan?: number;
	style?: CSSProperties;
};

/**
 * Secousse et caméra de la scène.
 *
 * À envelopper autour du contenu entier, jamais autour d'un élément isolé : la
 * secousse doit se lire comme un mouvement de caméra, donc tout bouge ensemble.
 * C'est ce décalage global de quelques pixels qui donne du poids à un gros mot
 * qui arrive — sans lui, l'échelle seule paraît molle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE PUNCH ZOOM
 *
 * Un mot qui grossit *lui-même* grossit dans un cadre immobile : l'œil lit un
 * changement de taille. Une **caméra** qui avance de 22 % en cinq frames sur ce
 * même mot déplace tout le cadre en même temps — le fond, la lueur, les autres
 * éléments — et l'œil lit alors un rapprochement. C'est la différence entre un
 * objet qui change et une caméra qui réagit.
 *
 * Cinq frames à l'aller (83 ms) puis retour au ressort `stamp` (500/15) : la
 * poussée est plus rapide que le retour, donc le coup se sent à l'aller et se
 * pose au retour. L'inverse donnerait une respiration, pas un impact.
 */
export const Impact: React.FC<ImpactProps> = ({
	children,
	hits,
	punches,
	overscan = 1.04,
	style,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const shake = useShakes(hits);

	let zoom = 1;
	for (const punch of punches ?? []) {
		const rise = punch.rise ?? 5;
		const push = progressAtFrame(frame, fps, {
			delay: punch.at,
			duration: rise,
			easing: 'expo',
		});
		const back = punch.hold
			? 0
			: progressAtFrame(frame, fps, {
					delay: punch.at + rise,
					spring: punch.spring ?? 'stamp',
				});
		zoom *= 1 + (punch.to - 1) * Math.max(0, push - back);
	}

	return (
		<AbsoluteFill
			style={{
				transform: `translate3d(${shake.x.toFixed(2)}px, ${shake.y.toFixed(2)}px, 0) rotate(${shake.rotate.toFixed(3)}deg) scale(${(overscan * zoom).toFixed(4)})`,
				...style,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};
