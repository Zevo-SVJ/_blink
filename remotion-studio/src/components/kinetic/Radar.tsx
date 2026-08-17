import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {easings} from '@/motion/dynamics';
import {useIdle} from '@/motion/kinetic/idle';

export type RadarAxis = {label: string; value: number};

export type RadarProps = {
	at: number;
	axes: RadarAxis[];
	size?: number;
	duration?: number;
	color?: string;
	gridColor?: string;
	labelColor?: string;
	fontFamily?: string;
	/** Décalage entre l'apparition de deux sommets, en frames. */
	step?: number;
};

/**
 * Radar de perception.
 *
 * Chaque sommet pousse vers l'extérieur avec son propre décalage : le polygone
 * se déforme en se construisant au lieu de se dilater d'un bloc. C'est le même
 * principe de cascade que partout ailleurs, appliqué à une forme unique.
 *
 * Les axes se dessinent avant les sommets — la structure d'abord, la donnée
 * ensuite. L'ordre inverse donnerait l'impression que la mesure précède
 * l'instrument.
 */
export const Radar: React.FC<RadarProps> = ({
	at,
	axes,
	size = 460,
	duration = 34,
	color = '#389FFA',
	gridColor = 'rgba(174,231,250,0.18)',
	labelColor = 'rgba(235,240,255,0.6)',
	fontFamily,
	step = 3,
}) => {
	const frame = useCurrentFrame();
	const radius = size * 0.36;
	const center = size / 2;
	const [a, b, c, d] = easings.expo;
	const idle = useIdle({float: 0, breathe: 0.008, sway: 0.6, speed: 0.1});

	const grid = interpolate(frame - at, [0, 16], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const points = axes.map((axis, index) => {
		const angle = (index / axes.length) * Math.PI * 2 - Math.PI / 2;
		const progress = interpolate(
			frame - at - 10 - index * step,
			[0, duration],
			[0, 1],
			{
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
				easing: Easing.bezier(a, b, c, d),
			},
		);
		const reach = radius * axis.value * progress;
		return {
			angle,
			x: center + Math.cos(angle) * reach,
			y: center + Math.sin(angle) * reach,
			labelX: center + Math.cos(angle) * (radius + 46),
			labelY: center + Math.sin(angle) * (radius + 46),
			label: axis.label,
			progress,
		};
	});

	const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');

	return (
		<svg
			width={size}
			height={size}
			style={{
				overflow: 'visible',
				transform: `scale(${idle.scale.toFixed(4)}) rotate(${idle.rotate.toFixed(3)}deg)`,
			}}
		>
			{/* Anneaux de graduation */}
			{[0.35, 0.7, 1].map((ring) => (
				<circle
					key={ring}
					cx={center}
					cy={center}
					r={radius * ring * grid}
					fill="none"
					stroke={gridColor}
					strokeWidth={1.4}
				/>
			))}

			{/* Rayons */}
			{points.map((point, index) => (
				<line
					key={index}
					x1={center}
					y1={center}
					x2={center + Math.cos(point.angle) * radius * grid}
					y2={center + Math.sin(point.angle) * radius * grid}
					stroke={gridColor}
					strokeWidth={1.4}
				/>
			))}

			<polygon
				points={polygon}
				fill={`${color}33`}
				stroke={color}
				strokeWidth={3}
				strokeLinejoin="round"
			/>

			{points.map((point, index) => (
				<circle
					key={`dot-${index}`}
					cx={point.x}
					cy={point.y}
					r={7 * point.progress}
					fill={color}
				/>
			))}

			{points.map((point, index) => (
				<text
					key={`label-${index}`}
					x={point.labelX}
					y={point.labelY}
					fill={labelColor}
					fontSize={22}
					fontWeight={600}
					fontFamily={fontFamily}
					textAnchor="middle"
					dominantBaseline="middle"
					opacity={point.progress}
				>
					{point.label}
				</text>
			))}
		</svg>
	);
};
