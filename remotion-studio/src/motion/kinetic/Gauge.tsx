import type {CSSProperties} from 'react';
import type {FrameTiming} from '../frame';
import {useProgress} from '../frame';

export type GaugeProps = {
	/** Remplissage visé, entre 0 et 1. */
	to: number;
	timing?: FrameTiming;
	width?: number | string;
	height?: number;
	color?: string;
	trackColor?: string;
	/** Reflet lumineux en tête de barre, comme un chargement en cours. */
	glow?: boolean;
	style?: CSSProperties;
};

/**
 * Jauge de progression.
 *
 * Remplie par une courbe et non par un ressort : une barre de progression qui
 * rebondirait donnerait l'impression de revenir en arrière, ce qu'aucun
 * chargement ne fait. C'est l'exception assumée à la règle du ressort en
 * entrée — elle porte une valeur, pas une apparition.
 */
export const Gauge: React.FC<GaugeProps> = ({
	to,
	timing = {duration: 42, easing: 'expo'},
	width = '100%',
	height = 14,
	color = '#389FFA',
	trackColor = 'rgba(255,255,255,0.10)',
	glow = true,
	style,
}) => {
	const progress = useProgress(timing);
	const fill = Math.max(0, Math.min(1, to * progress));

	return (
		<div
			style={{
				position: 'relative',
				width,
				height,
				borderRadius: height,
				background: trackColor,
				overflow: 'hidden',
				...style,
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					width: `${fill * 100}%`,
					borderRadius: height,
					background: `linear-gradient(90deg, ${color}99 0%, ${color} 100%)`,
				}}
			/>
			{glow && fill > 0.02 && fill < 0.999 ? (
				<div
					style={{
						position: 'absolute',
						top: 0,
						bottom: 0,
						left: `calc(${fill * 100}% - ${height}px)`,
						width: height * 2,
						background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
						filter: 'blur(4px)',
					}}
				/>
			) : null}
		</div>
	);
};
