import {interpolate} from 'remotion';
import type {FrameTiming} from '@/motion/frame';
import {useProgress} from '@/motion/frame';

export type LightSweepProps = {
	timing?: FrameTiming;
	/** Inclinaison du faisceau, en degrés. */
	angle?: number;
	width?: number;
	opacity?: number;
	color?: string;
	radius?: number;
};

/**
 * Balayage spéculaire : un faisceau de lumière traverse la surface parente.
 * Appliqué au moment où un élément se stabilise, c'est le détail qui fait
 * « produit fini » plutôt que « div animée ».
 *
 * À placer dans un parent en `position: relative` et `overflow: hidden`.
 */
export const LightSweep: React.FC<LightSweepProps> = ({
	timing = {duration: 45, easing: 'standard'},
	angle = 18,
	width = 26,
	opacity = 0.42,
	color = 'rgba(255,255,255,1)',
	radius,
}) => {
	const progress = useProgress(timing);
	const position = interpolate(progress, [0, 1], [-40, 140]);
	// Le faisceau s'éteint en entrant et en sortant du cadre.
	const fade = interpolate(progress, [0, 0.15, 0.85, 1], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				borderRadius: radius,
				overflow: 'hidden',
				pointerEvents: 'none',
				mixBlendMode: 'screen',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: '-60%',
					bottom: '-60%',
					left: `${position}%`,
					width: `${width}%`,
					transform: `rotate(${angle}deg)`,
					background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
					opacity: opacity * fade,
					filter: 'blur(28px)',
				}}
			/>
		</div>
	);
};
