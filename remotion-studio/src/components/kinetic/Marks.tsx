import type {CSSProperties} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import type {FrameTiming} from '@/motion/frame';
import {TrimPath} from '@/motion/kinetic/TrimPath';
import {Pop} from '@/motion/kinetic/Pop';

/**
 * Tracés « à la main ».
 *
 * Rôle relevé dans l'analyse de référence : diriger le regard de manière
 * informelle et casser le côté trop propre d'une composition entièrement
 * géométrique. Les chemins sont volontairement irréguliers — un cercle
 * parfait annulerait l'effet.
 */

/** Cercle d'annotation, tracé en un geste qui se referme en dépassant. */
const CIRCLE =
	'M 178 22 C 92 22, 14 58, 14 100 C 14 146, 96 178, 180 178 C 262 178, 342 148, 342 100 C 342 56, 268 22, 176 22 C 140 22, 108 30, 88 42';

/** Flèche courbe, avec sa pointe en deux traits. */
const ARROW_BODY = 'M 14 118 C 60 34, 168 8, 244 44';
const ARROW_HEAD = 'M 210 20 L 250 46 L 214 72';

/** Croix de rature, en deux traits successifs. */
const CROSS_A = 'M 20 20 L 196 172';
const CROSS_B = 'M 196 20 L 20 172';

export type CircleMarkProps = {
	timing?: FrameTiming;
	width?: number;
	color?: string;
	strokeWidth?: number;
	style?: CSSProperties;
};

export const CircleMark: React.FC<CircleMarkProps> = ({
	timing = {duration: 22, easing: 'expo'},
	width = 360,
	color = '#F6A823',
	strokeWidth = 9,
	style,
}) => (
	<TrimPath
		d={CIRCLE}
		width={width}
		height={width * 0.55}
		timing={timing}
		color={color}
		strokeWidth={strokeWidth}
		style={{position: 'absolute', ...style}}
	/>
);

export type ArrowMarkProps = {
	at: number;
	width?: number;
	color?: string;
	strokeWidth?: number;
	/** Retourne la flèche horizontalement. */
	flip?: boolean;
	style?: CSSProperties;
};

/**
 * Flèche dessinée.
 *
 * Le corps se trace d'abord, la pointe seulement ensuite — dans cet ordre, et
 * avec un léger recouvrement. Tracer les deux ensemble donne une flèche qui
 * pousse devant elle au lieu d'être dessinée.
 */
export const ArrowMark: React.FC<ArrowMarkProps> = ({
	at,
	width = 280,
	color = '#F6A823',
	strokeWidth = 8,
	flip = false,
	style,
}) => (
	<div
		style={{
			position: 'absolute',
			transform: flip ? 'scaleX(-1)' : undefined,
			...style,
		}}
	>
		<TrimPath
			d={ARROW_BODY}
			width={width}
			height={width * 0.5}
			timing={{delay: at, duration: 16, easing: 'expo'}}
			color={color}
			strokeWidth={strokeWidth}
		/>
		<TrimPath
			d={ARROW_HEAD}
			width={width}
			height={width * 0.5}
			timing={{delay: at + 11, duration: 9, easing: 'expo'}}
			color={color}
			strokeWidth={strokeWidth}
			style={{position: 'absolute', left: 0, top: 0}}
		/>
	</div>
);

export type CrossMarkProps = {
	at: number;
	size?: number;
	color?: string;
	strokeWidth?: number;
	style?: CSSProperties;
};

/** Rature en deux traits — le second part avant que le premier soit fini. */
export const CrossMark: React.FC<CrossMarkProps> = ({
	at,
	size = 216,
	color = '#E14747',
	strokeWidth = 14,
	style,
}) => (
	<div style={{position: 'absolute', ...style}}>
		<TrimPath
			d={CROSS_A}
			width={size}
			height={size * 0.9}
			timing={{delay: at, duration: 9, easing: 'expo'}}
			color={color}
			strokeWidth={strokeWidth}
		/>
		<TrimPath
			d={CROSS_B}
			width={size}
			height={size * 0.9}
			timing={{delay: at + 6, duration: 9, easing: 'expo'}}
			color={color}
			strokeWidth={strokeWidth}
			style={{position: 'absolute', left: 0, top: 0}}
		/>
	</div>
);

export type TierStep = {label: string; reached: boolean};

export type TierLadderProps = {
	at: number;
	steps: TierStep[];
	/** Indice du palier courant. Le marqueur s'y arrête. */
	current: number;
	width?: number;
	color?: string;
	dimColor?: string;
	fontFamily?: string;
	/** Décalage entre deux marches, en frames. */
	step?: number;
};

/**
 * Échelle de paliers.
 *
 * Les marches se construisent de bas en haut avec une cascade, puis un
 * marqueur grimpe et **s'arrête sous la marche suivante** — l'arrêt est le
 * message : il reste quelque chose à faire.
 *
 * La hauteur croissante des marches donne la progression sans avoir besoin de
 * l'écrire.
 */
export const TierLadder: React.FC<TierLadderProps> = ({
	at,
	steps,
	current,
	width = 840,
	color = '#389FFA',
	dimColor = 'rgba(174,231,250,0.14)',
	fontFamily,
	step = 4,
}) => {
	const frame = useCurrentFrame();
	const stepWidth = width / steps.length;

	const marker = interpolate(
		frame - at - steps.length * step - 10,
		[0, 30],
		[0, 1],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);
	const markerX = stepWidth * (current + 0.5) * marker;

	return (
		<div style={{position: 'relative', width, fontFamily}}>
			<div style={{display: 'flex', alignItems: 'flex-end', height: 280}}>
				{steps.map((tier, index) => {
					const height = 60 + (index / (steps.length - 1)) * 200;
					const active = index <= current;
					return (
						<Pop
							key={tier.label}
							at={at + index * step}
							spring="popTight"
							preset="riseUp"
							style={{width: stepWidth, display: 'flex', alignItems: 'flex-end'}}
						>
							<div
								style={{
									width: '100%',
									paddingRight: 8,
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: 10,
								}}
							>
								<div
									style={{
										width: '100%',
										height,
										borderRadius: '14px 14px 6px 6px',
										background: active
											? `linear-gradient(180deg, ${color}, ${color}44)`
											: dimColor,
										boxShadow: active ? `0 0 34px -6px ${color}88` : undefined,
									}}
								/>
								<div
									style={{
										fontSize: 18,
										fontWeight: 700,
										letterSpacing: '0.06em',
										textTransform: 'uppercase',
										color: active ? '#FAFAFA' : 'rgba(235,240,255,0.35)',
										whiteSpace: 'nowrap',
									}}
								>
									{tier.label}
								</div>
							</div>
						</Pop>
					);
				})}
			</div>

			{marker > 0.01 ? (
				<div
					style={{
						position: 'absolute',
						left: markerX,
						bottom: -14,
						transform: 'translateX(-50%)',
						width: 16,
						height: 16,
						borderRadius: '50%',
						background: '#FAFAFA',
						boxShadow: `0 0 26px ${color}`,
					}}
				/>
			) : null}
		</div>
	);
};
