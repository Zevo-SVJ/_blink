import type {CSSProperties, ReactNode} from 'react';
import {useIdle} from '@/motion/kinetic/idle';

export type IdCardProps = {
	handle?: string;
	subtitle?: string;
	fields?: {label: string; value: string}[];
	accent?: string;
	width?: number;
	/** Rotation Y, en degrés. Positive = le bord droit s'éloigne. */
	tilt?: number;
	idle?: boolean;
	phase?: number;
	fontFamily?: string;
	style?: CSSProperties;
};

/**
 * Carte d'identité flottante.
 *
 * Objet — pas écran. C'est la métaphore de « ce qu'ils ont de toi » : un
 * rectangle, quelques champs, une photo abstraite. Volontairement dépourvue de
 * toute marque de réseau social.
 *
 * Le liseré supérieur en dégradé et la tranche claire sur le bord droit font
 * l'essentiel du volume : une carte sans épaisseur perçue reste un rectangle.
 */
export const IdCard: React.FC<IdCardProps> = ({
	handle = '@toi',
	subtitle = 'identité publique',
	fields = [
		{label: 'images', value: '9'},
		{label: 'bio', value: '112 signes'},
		{label: 'lu en', value: '2 s'},
	],
	accent = '#389FFA',
	width = 620,
	tilt = -14,
	idle = true,
	phase = 0,
	fontFamily,
	style,
}) => {
	const drift = useIdle({float: 9, breathe: 0.01, sway: 1.1, speed: 0.1, phase});

	return (
		<div
			style={{
				width,
				borderRadius: 30,
				padding: 34,
				position: 'relative',
				background:
					'linear-gradient(158deg, rgba(34,52,89,0.96) 0%, rgba(12,26,52,0.96) 100%)',
				border: '1px solid rgba(174,231,250,0.18)',
				boxShadow: `0 50px 110px -34px rgba(0,6,20,0.9), inset -2px 0 0 rgba(174,231,250,0.22)`,
				transform: `perspective(1800px) rotateY(${tilt}deg) rotateX(${(idle ? drift.rotate : 0).toFixed(2)}deg) translate3d(0, ${(idle ? drift.y : 0).toFixed(2)}px, 0)`,
				fontFamily,
				...style,
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 30,
					right: 30,
					height: 3,
					borderRadius: 3,
					background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
				}}
			/>

			<div style={{display: 'flex', alignItems: 'center', gap: 22}}>
				<div
					style={{
						width: 92,
						height: 92,
						borderRadius: 22,
						flexShrink: 0,
						background: `conic-gradient(from 130deg, ${accent}, #AEE7FA, #FF6B9D, ${accent})`,
						padding: 4,
					}}
				>
					<div
						style={{
							width: '100%',
							height: '100%',
							borderRadius: 18,
							background: 'linear-gradient(150deg, #223459, #04122F)',
						}}
					/>
				</div>
				<div>
					<div
						style={{
							fontSize: 42,
							fontWeight: 800,
							letterSpacing: '-0.035em',
							color: '#FAFAFA',
						}}
					>
						{handle}
					</div>
					<div
						style={{
							fontSize: 20,
							fontWeight: 600,
							letterSpacing: '0.12em',
							textTransform: 'uppercase',
							color: accent,
							marginTop: 4,
						}}
					>
						{subtitle}
					</div>
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					gap: 26,
					marginTop: 28,
					paddingTop: 22,
					borderTop: '1px solid rgba(174,231,250,0.12)',
				}}
			>
				{fields.map((field) => (
					<div key={field.label}>
						<div
							style={{
								fontSize: 16,
								fontWeight: 600,
								letterSpacing: '0.1em',
								textTransform: 'uppercase',
								color: 'rgba(235,240,255,0.42)',
							}}
						>
							{field.label}
						</div>
						<div
							style={{
								fontSize: 28,
								fontWeight: 700,
								letterSpacing: '-0.02em',
								color: '#FAFAFA',
								marginTop: 4,
							}}
						>
							{field.value}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export type ToastProps = {
	children: ReactNode;
	accent?: string;
	icon?: ReactNode;
	width?: number;
	fontFamily?: string;
	style?: CSSProperties;
};

/**
 * Notification flottante.
 *
 * Élément d'interface détourné en objet narratif : sert à faire dire quelque
 * chose au système lui-même, en marge du récit principal. Empilées avec un
 * décalage, plusieurs notifications donnent la sensation d'une activité qui
 * déborde.
 */
export const Toast: React.FC<ToastProps> = ({
	children,
	accent = '#389FFA',
	icon,
	width,
	fontFamily,
	style,
}) => (
	<div
		style={{
			width,
			display: 'flex',
			alignItems: 'center',
			gap: 16,
			padding: '18px 26px',
			borderRadius: 22,
			background: 'rgba(255,255,255,0.08)',
			border: `1px solid ${accent}44`,
			backdropFilter: 'blur(28px) saturate(160%)',
			WebkitBackdropFilter: 'blur(28px) saturate(160%)',
			boxShadow: '0 26px 60px -22px rgba(0,6,20,0.8)',
			fontFamily,
			...style,
		}}
	>
		<span
			style={{
				width: 40,
				height: 40,
				borderRadius: '50%',
				flexShrink: 0,
				background: `radial-gradient(circle at 34% 30%, ${accent}, ${accent}55)`,
				boxShadow: `0 0 22px ${accent}88`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			{icon}
		</span>
		<span style={{fontSize: 26, fontWeight: 600, color: '#FAFAFA'}}>
			{children}
		</span>
	</div>
);
