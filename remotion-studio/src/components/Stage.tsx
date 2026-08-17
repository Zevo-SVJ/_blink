import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill} from 'remotion';
import {Grain, Vignette} from './background/Grain';
import {MeshGradient} from './background/MeshGradient';
import type {AuroraName} from '@/design/tokens';
import {palette, spacing} from '@/design/tokens';
import {fonts} from '@/design/typography';

export type StageProps = {
	children?: ReactNode;
	aurora?: AuroraName;
	/** Marge de sécurité, façon safe area — jamais de texte au ras du cadre. */
	padding?: number;
	grain?: boolean;
	vignette?: boolean;
	align?: CSSProperties['alignItems'];
	justify?: CSSProperties['justifyContent'];
	backgroundSpeed?: number;
	style?: CSSProperties;
};

/**
 * Le plateau : fond animé, matière, vignettage et zone de contenu sécurisée.
 * Toutes les compositions démarrent par un `<Stage>` — c'est ce qui garantit
 * une cohérence visuelle immédiate d'une scène à l'autre.
 */
export const Stage: React.FC<StageProps> = ({
	children,
	aurora = 'nebula',
	padding = spacing.xxxl,
	grain = true,
	vignette = true,
	align = 'center',
	justify = 'center',
	backgroundSpeed,
	style,
}) => (
	<AbsoluteFill
		style={{
			backgroundColor: palette.void,
			color: palette.textPrimary,
			fontFamily: fonts.text,
			// Rend les sous-pixels plus nets sur fond sombre, comme sur macOS.
			WebkitFontSmoothing: 'antialiased',
			...style,
		}}
	>
		<MeshGradient aurora={aurora} speed={backgroundSpeed} />

		<AbsoluteFill
			style={{
				padding,
				display: 'flex',
				flexDirection: 'column',
				alignItems: align,
				justifyContent: justify,
			}}
		>
			{children}
		</AbsoluteFill>

		{vignette ? <Vignette /> : null}
		{grain ? <Grain /> : null}
	</AbsoluteFill>
);
