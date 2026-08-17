import type {ReactNode} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {FrameTiming} from '../frame';
import {progressAtFrame} from '../frame';

export type CameraMove = {
	/** Échelle de départ. > 1 = on démarre en très gros plan. */
	scale?: number;
	/** Échelle d'arrivée. */
	toScale?: number;
	/** Décalage de départ, en px. */
	x?: number;
	y?: number;
	toX?: number;
	toY?: number;
	/** Rotation de départ, en degrés. */
	rotate?: number;
	toRotate?: number;
	/** Cadence du mouvement. */
	timing?: FrameTiming;
	/** Origine du zoom, en `transform-origin` CSS. */
	origin?: string;
};

export type CameraProps = CameraMove & {
	children?: ReactNode;
	/**
	 * Enchaîne plusieurs mouvements. Chacun s'applique par-dessus le précédent
	 * dès que sa cadence démarre — c'est ce qui permet un recadrage brutal au
	 * milieu d'un plan sans couper.
	 */
	moves?: CameraMove[];
};

const resolve = (
	move: CameraMove,
	progress: number,
): {scale: number; x: number; y: number; rotate: number} => {
	const from = {
		scale: move.scale ?? 1,
		x: move.x ?? 0,
		y: move.y ?? 0,
		rotate: move.rotate ?? 0,
	};
	const to = {
		scale: move.toScale ?? 1,
		x: move.toX ?? 0,
		y: move.toY ?? 0,
		rotate: move.toRotate ?? 0,
	};
	return {
		scale: from.scale + (to.scale - from.scale) * progress,
		x: from.x + (to.x - from.x) * progress,
		y: from.y + (to.y - from.y) * progress,
		rotate: from.rotate + (to.rotate - from.rotate) * progress,
	};
};

/**
 * LA CAMÉRA.
 *
 * Un plan de coupe ne se fabrique pas seulement en déplaçant des éléments : il
 * se fabrique en déplaçant le **point de vue**. C'est la différence entre une
 * composition qui s'animate et un plan qui est filmé.
 *
 * Trois emplois dans le film :
 *
 *   • **le recul initial** — on démarre à l'échelle 4 sur un objet, on recule.
 *     L'œil comprend l'objet avant de comprendre le cadre, et la première
 *     seconde est déjà en mouvement au lieu d'attendre une entrée ;
 *   • **le recadrage brutal** — un `move` supplémentaire au milieu du plan
 *     déplace le cadre de 15 % en six frames. Ça se lit comme une coupe, mais
 *     sans coupe : la continuité est conservée ;
 *   • **la dérive lente** — un zoom de 3 % étalé sur tout le plan. Invisible
 *     consciemment, mais c'est ce qui empêche un plan fixe d'être fixe.
 *
 * Les mouvements se **cumulent** : les échelles se multiplient, les décalages
 * s'additionnent. Un recul suivi d'un recadrage donne bien le recadrage vu
 * depuis l'échelle atteinte, pas un retour à l'origine.
 */
export const Camera: React.FC<CameraProps> = ({children, moves, origin, ...single}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const all = moves ?? [single];
	const total = all.reduce<{scale: number; x: number; y: number; rotate: number}>(
		(acc, move) => {
			const progress = progressAtFrame(frame, fps, move.timing ?? {duration: 30});
			const value = resolve(move, progress);
			return {
				scale: acc.scale * value.scale,
				x: acc.x + value.x,
				y: acc.y + value.y,
				rotate: acc.rotate + value.rotate,
			};
		},
		{scale: 1, x: 0, y: 0, rotate: 0},
	);

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				transformOrigin: origin ?? 'center center',
				transform: `translate3d(${total.x.toFixed(2)}px, ${total.y.toFixed(2)}px, 0) scale(${total.scale.toFixed(4)}) rotate(${total.rotate.toFixed(3)}deg)`,
			}}
		>
			{children}
		</div>
	);
};
