import {interpolate, useCurrentFrame} from 'remotion';

export type CadenceProps = {
	/** Période entre deux évènements, en frames. 15 = un toutes les 0,25 s. */
	every?: number;
	/** Frame de départ. */
	at?: number;
	/** Couleur des évènements. */
	color?: string;
	/** Intensité globale. 1 = tel quel ; 0,5 pour un fond clair. */
	strength?: number;
	/** Décale le cycle pour désynchroniser deux couches. */
	offset?: number;
};

const EVENT_FRAMES = 11;

/**
 * LA CADENCE — le métronome visuel du fond.
 *
 * Règle du régime haute rétention : **si un texte est à l'écran, quelque chose
 * bouge toutes les 15 frames.** Sur un plan typographique, l'appliquer avec le
 * texte lui-même est impossible — un mot qui bouge quatre fois par seconde
 * devient illisible. L'évènement doit donc se produire ailleurs : dans le fond.
 *
 * Cette couche émet un évènement par période, en alternant quatre natures :
 *
 *   0. une ligne horizontale qui balaie le cadre de haut en bas ;
 *   1. quatre marqueurs d'angle qui s'allument ;
 *   2. un anneau qui s'ouvre depuis le centre ;
 *   3. une bande verticale qui traverse latéralement.
 *
 * Quatre natures et non une seule, parce qu'un même évènement répété huit fois
 * devient un décor : l'œil l'apprend et cesse de le voir. En alternant, chaque
 * période apporte une information nouvelle tout en maintenant une pulsation
 * régulière — c'est exactement ce que fait une piste rythmique.
 *
 * Tout est dérivé de `frame` par division entière : la couche est déterministe,
 * n'a aucun état, et peut être posée sur n'importe quel plan sans coordination.
 */
export const Cadence: React.FC<CadenceProps> = ({
	every = 15,
	at = 0,
	color = '#AEE7FA',
	strength = 1,
	offset = 0,
}) => {
	const frame = useCurrentFrame();
	const local = frame - at + offset;

	if (local < 0) return null;

	const index = Math.floor(local / every);
	const inside = local % every;
	// L'évènement occupe le début de la période, pas toute sa durée : le silence
	// entre deux pulsations est ce qui rend la pulsation perceptible.
	const t = interpolate(inside, [0, EVENT_FRAMES], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const fade = Math.sin(Math.PI * t);
	const kind = index % 4;

	const base = {position: 'absolute' as const, inset: 0, pointerEvents: 'none' as const};

	if (kind === 0) {
		return (
			<div style={{...base, overflow: 'hidden'}}>
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: `${(t * 100).toFixed(2)}%`,
						height: 2,
						background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
						opacity: 0.5 * fade * strength,
					}}
				/>
			</div>
		);
	}

	if (kind === 1) {
		const size = 46 + t * 10;
		const inset = 72;
		return (
			<div style={base}>
				{[
					{top: inset, left: inset, borderTop: true, borderLeft: true},
					{top: inset, right: inset, borderTop: true, borderRight: true},
					{bottom: inset, left: inset, borderBottom: true, borderLeft: true},
					{bottom: inset, right: inset, borderBottom: true, borderRight: true},
				].map((corner, i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							top: corner.top,
							left: corner.left,
							right: corner.right,
							bottom: corner.bottom,
							width: size,
							height: size,
							borderTop: corner.borderTop ? `3px solid ${color}` : undefined,
							borderBottom: corner.borderBottom ? `3px solid ${color}` : undefined,
							borderLeft: corner.borderLeft ? `3px solid ${color}` : undefined,
							borderRight: corner.borderRight ? `3px solid ${color}` : undefined,
							opacity: 0.55 * fade * strength,
						}}
					/>
				))}
			</div>
		);
	}

	if (kind === 2) {
		const diameter = 240 + t * 1500;
		return (
			<div style={{...base, display: 'grid', placeItems: 'center'}}>
				<div
					style={{
						width: diameter,
						height: diameter,
						borderRadius: '50%',
						border: `2px solid ${color}`,
						opacity: 0.3 * (1 - t) * strength,
					}}
				/>
			</div>
		);
	}

	return (
		<div style={{...base, overflow: 'hidden'}}>
			<div
				style={{
					position: 'absolute',
					top: 0,
					bottom: 0,
					left: `${(t * 100).toFixed(2)}%`,
					width: 3,
					background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
					opacity: 0.4 * fade * strength,
				}}
			/>
		</div>
	);
};
