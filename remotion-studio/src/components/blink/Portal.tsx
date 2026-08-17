import {blink} from '@/design/blink';
import type {FrameTiming} from '@/motion/frame';
import {useProgress} from '@/motion/frame';

export type PortalProps = {
	/** Diamètre initial, en px. */
	from?: number;
	/** Diamètre atteint juste avant le raccord. */
	to?: number;
	timing?: FrameTiming;
	/** Cœur du disque. Doit être plus clair que le fond. */
	color?: string;
	/** Bord du disque, vers lequel le cœur se dégrade. */
	edge?: string;
	glow?: string;
};

/**
 * Cible du zoom traversant.
 *
 * Convention d'écriture des scènes Blink : toute scène qui s'enchaîne par un
 * `zoomThrough` place un `<Portal>` en son centre. Le disque grandit en fin de
 * plan, puis la transition met toute la scène à l'échelle — le disque recouvre
 * alors l'écran et sert de masque.
 *
 * **Le disque doit être lumineux.** Un disque plus sombre que son entourage se
 * lit comme un trou : l'œil comprend « il manque quelque chose » au lieu de
 * « quelque chose avance vers moi ». C'est d'autant plus vrai ici, où le halo
 * du plateau éclaircit précisément le centre du cadre. On plonge dans une
 * lumière — ce qui, pour une marque qui s'appelle Blink, tombe bien.
 */
export const Portal: React.FC<PortalProps> = ({
	from = 0,
	to = 340,
	timing = {delay: 0, duration: 30, easing: 'expoIn'},
	color = blink.sky,
	edge = blink.skyBright,
	glow = blink.skyBright,
}) => {
	const progress = useProgress(timing);
	const size = from + (to - from) * progress;

	if (size <= 0) return null;

	return (
		<div
			style={{
				position: 'absolute',
				left: '50%',
				top: '50%',
				width: size,
				height: size,
				marginLeft: -size / 2,
				marginTop: -size / 2,
				borderRadius: '50%',
				background: `radial-gradient(circle at 50% 46%, ${color} 0%, ${edge} 62%, ${edge} 100%)`,
				// Halo externe uniquement : une ombre interne creuserait le disque, qui se
				// lirait alors comme un trou au lieu d'une surface qui avance vers nous.
				boxShadow: `0 0 ${(size * 0.5).toFixed(0)}px ${glow}aa`,
			}}
		/>
	);
};
