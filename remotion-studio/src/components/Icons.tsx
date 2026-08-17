import type {CSSProperties} from 'react';

export type IconProps = {
	size?: number;
	color?: string;
	style?: CSSProperties;
};

/**
 * Icônes dessinées en SVG plutôt qu'écrites en caractères Unicode : au rendu,
 * un glyphe absent de la police auto-hébergée produirait un « tofu ». Le SVG,
 * lui, est identique sur toutes les machines.
 */
export const ArrowRight: React.FC<IconProps> = ({
	size = 22,
	color = 'currentColor',
	style,
}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		style={style}
		aria-hidden
	>
		<path
			d="M4 12h15M13 6l6 6-6 6"
			stroke={color}
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const Sparkle: React.FC<IconProps> = ({
	size = 20,
	color = 'currentColor',
	style,
}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		style={style}
		aria-hidden
	>
		<path
			d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4L12 3z"
			fill={color}
		/>
	</svg>
);
