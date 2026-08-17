import type {CSSProperties, ReactNode} from 'react';
import type {TypeScale} from '@/design/typography';
import {typeScale} from '@/design/typography';
import {palette} from '@/design/tokens';

export type TextProps = {
	children: ReactNode;
	variant?: TypeScale;
	tone?: 'primary' | 'secondary' | 'tertiary';
	/**
	 * Dégradé appliqué au texte. Les titres Apple ne sont presque jamais d'un
	 * blanc plat : un léger dégradé leur donne du relief.
	 */
	gradient?: readonly [string, string];
	align?: CSSProperties['textAlign'];
	style?: CSSProperties;
};

const tones = {
	primary: palette.textPrimary,
	secondary: palette.textSecondary,
	tertiary: palette.textTertiary,
} as const;

export const Text: React.FC<TextProps> = ({
	children,
	variant = 'body',
	tone = 'primary',
	gradient,
	align,
	style,
}) => {
	const gradientStyle: CSSProperties = gradient
		? {
				backgroundImage: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
				WebkitBackgroundClip: 'text',
				backgroundClip: 'text',
				color: 'transparent',
			}
		: {color: tones[tone]};

	return (
		<div
			style={{
				margin: 0,
				textAlign: align,
				...typeScale[variant],
				...gradientStyle,
				...style,
			}}
		>
			{children}
		</div>
	);
};
