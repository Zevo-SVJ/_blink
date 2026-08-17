import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill} from 'remotion';
import {blink, safeArea} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useLoop} from '@/motion/frame';
import {Grain} from '../background/Grain';

export type BlinkStageProps = {
	children?: ReactNode;
	/** Couleur de fond. Par défaut le bleu nuit de la marque. */
	background?: string;
	/** Halo coloré derrière le contenu. */
	glow?: string;
	glowStrength?: number;
	/** Position verticale du halo, en fraction de hauteur. */
	glowY?: number;
	grain?: boolean;
	justify?: CSSProperties['justifyContent'];
	style?: CSSProperties;
};

/**
 * Le plateau vertical des vidéos Blink.
 *
 * Trois responsabilités, et c'est tout : poser le fond de marque, respecter les
 * zones de sécurité 9:16, et fournir une texture qui empêche le dégradé de
 * bander en H.264.
 *
 * Le halo dérive très lentement — assez pour que le fond ne soit jamais
 * parfaitement immobile, jamais assez pour concurrencer le contenu. C'est le
 * principe de densité relevé dans la référence : il y a toujours quelque chose
 * qui bouge, mais la hiérarchie reste intacte.
 */
export const BlinkStage: React.FC<BlinkStageProps> = ({
	children,
	background = blink.navy,
	glow = blink.skyBright,
	glowStrength = 0.4,
	glowY = 0.42,
	grain = true,
	justify = 'center',
	style,
}) => {
	const drift = useLoop(0.05);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: background,
				color: blink.white,
				fontFamily: fonts.display,
				WebkitFontSmoothing: 'antialiased',
				overflow: 'hidden',
				...style,
			}}
		>
			<AbsoluteFill
				style={{
					background: `radial-gradient(circle at ${(50 + Math.sin(drift) * 6).toFixed(2)}% ${(glowY * 100 + Math.cos(drift * 0.8) * 4).toFixed(2)}%, ${glow}${Math.round(glowStrength * 255)
						.toString(16)
						.padStart(2, '0')} 0%, transparent 62%)`,
					filter: 'blur(60px)',
				}}
			/>

			<AbsoluteFill
				style={{
					paddingTop: safeArea.top,
					paddingBottom: safeArea.bottom,
					paddingLeft: safeArea.side,
					paddingRight: safeArea.side,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: justify,
				}}
			>
				{children}
			</AbsoluteFill>

			{grain ? <Grain opacity={0.05} /> : null}
		</AbsoluteFill>
	);
};
