import type {CSSProperties, ReactNode} from 'react';
import type {MaterialName} from '@/design/tokens';
import {materials, radii, shadows} from '@/design/tokens';

export type GlassPanelProps = {
	children?: ReactNode;
	material?: MaterialName;
	radius?: number;
	padding?: number;
	/** Teinte diffuse projetée derrière le panneau. */
	glow?: string;
	style?: CSSProperties;
};

/**
 * Surface « liquid glass ».
 *
 * Trois couches empilées, dans cet ordre — c'est ce qui fait la différence
 * entre un vrai matériau et un simple rectangle semi-transparent :
 *   1. le fond translucide + `backdrop-filter` (flou et sursaturation) ;
 *   2. un liseré dégradé en `mask` : le bord capte la lumière en haut et
 *      s'éteint en bas ;
 *   3. un reflet spéculaire diffus dans le coin supérieur gauche.
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
	children,
	material = 'glass',
	radius = radii.lg,
	padding = 40,
	glow,
	style,
}) => {
	const surface = materials[material];

	return (
		<div
			style={{
				position: 'relative',
				borderRadius: radius,
				padding,
				background: surface.background,
				backdropFilter: surface.backdropFilter,
				WebkitBackdropFilter: surface.backdropFilter,
				boxShadow: glow
					? `${shadows.lifted}, ${shadows.glow(glow)}`
					: shadows.lifted,
				overflow: 'hidden',
				...style,
			}}
		>
			{/* Liseré lumineux : dégradé masqué pour n'éclairer que le contour. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					borderRadius: radius,
					padding: 1,
					background:
						'linear-gradient(160deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 38%, rgba(255,255,255,0) 70%)',
					WebkitMask:
						'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
					WebkitMaskComposite: 'xor',
					maskComposite: 'exclude',
					pointerEvents: 'none',
				}}
			/>

			{/* Reflet spéculaire. */}
			<div
				style={{
					position: 'absolute',
					top: '-40%',
					left: '-10%',
					width: '70%',
					height: '110%',
					background:
						'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.16) 0%, transparent 62%)',
					pointerEvents: 'none',
				}}
			/>

			<div style={{position: 'relative'}}>{children}</div>
		</div>
	);
};

export type PillProps = {
	children: ReactNode;
	accent?: string;
	style?: CSSProperties;
};

/** Badge translucide — le « eyebrow » qui annonce une section. */
export const Pill: React.FC<PillProps> = ({children, accent, style}) => (
	<div
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			gap: 10,
			padding: '10px 20px',
			borderRadius: radii.pill,
			background: 'rgba(255,255,255,0.08)',
			border: '1px solid rgba(255,255,255,0.14)',
			backdropFilter: 'blur(24px) saturate(180%)',
			WebkitBackdropFilter: 'blur(24px) saturate(180%)',
			...style,
		}}
	>
		{accent ? (
			<span
				style={{
					width: 8,
					height: 8,
					borderRadius: '50%',
					background: accent,
					boxShadow: `0 0 14px ${accent}`,
				}}
			/>
		) : null}
		{children}
	</div>
);
