import {AbsoluteFill, useCurrentFrame} from 'remotion';

export type GrainProps = {
	opacity?: number;
	/** Grain fixe (texture) ou regénéré à chaque frame (grain argentique). */
	animated?: boolean;
	scale?: number;
};

/**
 * Grain de film. Deux rôles : casser le banding des grands dégradés — très
 * visible en H.264 sur des fonds sombres — et donner cette texture « matière »
 * qui distingue une image travaillée d'un aplat CSS.
 */
export const Grain: React.FC<GrainProps> = ({
	opacity = 0.055,
	animated = true,
	scale = 0.85,
}) => {
	const frame = useCurrentFrame();
	// Le seed change à chaque frame : le grain scintille comme sur pellicule.
	const seed = animated ? frame % 24 : 0;

	return (
		<AbsoluteFill style={{opacity, pointerEvents: 'none', mixBlendMode: 'overlay'}}>
			<svg width="100%" height="100%">
				<filter id={`grain-${seed}`}>
					<feTurbulence
						type="fractalNoise"
						baseFrequency={scale}
						numOctaves={3}
						seed={seed}
						stitchTiles="stitch"
					/>
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
			</svg>
		</AbsoluteFill>
	);
};

export type VignetteProps = {
	strength?: number;
};

/** Vignettage doux : ramène l'œil au centre du cadre. */
export const Vignette: React.FC<VignetteProps> = ({strength = 0.55}) => (
	<AbsoluteFill
		style={{
			pointerEvents: 'none',
			background: `radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(0,0,0,${strength}) 100%)`,
		}}
	/>
);
