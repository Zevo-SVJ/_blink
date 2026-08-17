import type {CSSProperties, ReactNode} from 'react';
import {palette, radii, shadows} from '@/design/tokens';

export type DeviceFrameProps = {
	children?: ReactNode;
	width?: number;
	/** Ratio écran. 19.5/9 correspond aux iPhone récents. */
	aspectRatio?: number;
	bezel?: number;
	glow?: string;
	style?: CSSProperties;
};

/**
 * Mockup d'appareil : châssis métallique, bordure fine, écran en creux et
 * Dynamic Island. Volontairement générique — c'est un support de démo, pas la
 * reproduction d'un produit existant.
 */
export const DeviceFrame: React.FC<DeviceFrameProps> = ({
	children,
	width = 460,
	aspectRatio = 19.5 / 9,
	bezel = 12,
	glow = palette.indigo,
	style,
}) => {
	const height = width * aspectRatio;
	const outerRadius = radii.device;

	return (
		<div
			style={{
				position: 'relative',
				width,
				height,
				borderRadius: outerRadius,
				padding: bezel,
				// Châssis : dégradé conique pour simuler l'anodisation du métal.
				background:
					'conic-gradient(from 210deg at 50% 50%, #3A3A44 0deg, #6E6E7A 70deg, #24242C 150deg, #85858F 240deg, #2C2C34 330deg, #3A3A44 360deg)',
				boxShadow: `${shadows.lifted}, ${shadows.glow(glow)}, inset 0 0 0 1px rgba(255,255,255,0.18)`,
				...style,
			}}
		>
			<div
				style={{
					position: 'relative',
					width: '100%',
					height: '100%',
					borderRadius: outerRadius - bezel,
					overflow: 'hidden',
					background: palette.void,
					boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9)',
				}}
			>
				{children}

				{/* Dynamic Island */}
				<div
					style={{
						position: 'absolute',
						top: 14,
						left: '50%',
						transform: 'translateX(-50%)',
						width: width * 0.28,
						height: width * 0.075,
						borderRadius: radii.pill,
						background: '#000',
					}}
				/>

				{/* Reflet vitre : diagonale très diffuse sur la dalle. */}
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background:
							'linear-gradient(128deg, rgba(255,255,255,0.14) 0%, transparent 34%, transparent 70%, rgba(255,255,255,0.05) 100%)',
						pointerEvents: 'none',
					}}
				/>
			</div>
		</div>
	);
};
