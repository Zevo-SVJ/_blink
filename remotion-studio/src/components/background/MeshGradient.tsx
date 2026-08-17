import {AbsoluteFill, useVideoConfig} from 'remotion';
import type {AuroraName} from '@/design/tokens';
import {auroras, palette} from '@/design/tokens';
import {useLoop} from '@/motion/frame';

type Blob = {
	color: string;
	size: number;
	x: number;
	y: number;
	driftX: number;
	driftY: number;
	phase: number;
	opacity: number;
};

export type MeshGradientProps = {
	aurora?: AuroraName;
	/** Vitesse de dérive, en cycles par seconde. Volontairement très basse. */
	speed?: number;
	intensity?: number;
};

/**
 * Fond « mesh gradient » : de larges taches de couleur floutées qui dérivent
 * lentement. C'est ce qui empêche un fond sombre de paraître mort, sans jamais
 * capter l'attention au détriment du contenu.
 */
export const MeshGradient: React.FC<MeshGradientProps> = ({
	aurora = 'nebula',
	speed = 0.04,
	intensity = 1,
}) => {
	const {width, height} = useVideoConfig();
	const t = useLoop(speed);
	const [primary, secondary] = auroras[aurora];

	const blobs: Blob[] = [
		{color: primary, size: 1.15, x: 0.22, y: 0.28, driftX: 0.06, driftY: 0.04, phase: 0, opacity: 0.5},
		{color: secondary, size: 0.95, x: 0.78, y: 0.34, driftX: -0.05, driftY: 0.06, phase: 1.8, opacity: 0.42},
		{color: palette.blue, size: 1.3, x: 0.5, y: 0.86, driftX: 0.04, driftY: -0.05, phase: 3.4, opacity: 0.3},
	];

	return (
		<AbsoluteFill style={{backgroundColor: palette.void, overflow: 'hidden'}}>
			{blobs.map((blob, index) => {
				const cx = (blob.x + Math.sin(t + blob.phase) * blob.driftX) * width;
				const cy = (blob.y + Math.cos(t * 0.8 + blob.phase) * blob.driftY) * height;
				const radius = blob.size * Math.max(width, height) * 0.5;

				return (
					<div
						key={index}
						style={{
							position: 'absolute',
							left: cx - radius,
							top: cy - radius,
							width: radius * 2,
							height: radius * 2,
							borderRadius: '50%',
							background: `radial-gradient(circle at 50% 50%, ${blob.color} 0%, transparent 68%)`,
							opacity: blob.opacity * intensity,
							filter: 'blur(120px)',
						}}
					/>
				);
			})}
			{/* Assombrissement du bas : le texte y reste lisible quoi qu'il arrive. */}
			<AbsoluteFill
				style={{
					background: `linear-gradient(180deg, transparent 30%, ${palette.void}cc 100%)`,
				}}
			/>
		</AbsoluteFill>
	);
};
