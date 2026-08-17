import type {CSSProperties, ReactNode} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useIdle} from '@/motion/kinetic/idle';

export type FloatingWindowProps = {
	children?: ReactNode;
	title?: string;
	width?: number;
	height?: number;
	accent?: string;
	/** Inclinaison en Y : donne l'épaisseur sans passer par de la vraie 3D. */
	tilt?: number;
	idle?: boolean;
	phase?: number;
	style?: CSSProperties;
};

/**
 * Fenêtre flottante abstraite.
 *
 * Un chrome d'interface volontairement générique — trois pastilles, une barre
 * de titre — utilisé comme **objet** et non comme écran. Sa fonction est de
 * créer de la familiarité numérique et de structurer géométriquement la
 * composition, pas de montrer un logiciel.
 *
 * L'inclinaison en Y avec perspective lui donne une épaisseur perçue : c'est ce
 * qui la fait exister dans un espace plutôt que reposer à plat sur le fond.
 */
export const FloatingWindow: React.FC<FloatingWindowProps> = ({
	children,
	title,
	width = 460,
	height = 300,
	accent = '#389FFA',
	tilt = 0,
	idle = true,
	phase = 0,
	style,
}) => {
	const drift = useIdle({float: 7, breathe: 0.008, speed: 0.13, phase, organic: true});

	return (
		<div
			style={{
				width,
				height,
				borderRadius: 24,
				overflow: 'hidden',
				background: 'linear-gradient(160deg, rgba(24,44,80,0.95), rgba(10,22,46,0.95))',
				border: '1px solid rgba(174,231,250,0.16)',
				boxShadow: '0 40px 90px -28px rgba(0,6,20,0.85)',
				backdropFilter: 'blur(24px)',
				WebkitBackdropFilter: 'blur(24px)',
				transform: tilt
					? `perspective(1600px) rotateY(${tilt}deg) translate3d(0, ${idle ? drift.y.toFixed(2) : 0}px, 0)`
					: idle
						? `translate3d(0, ${drift.y.toFixed(2)}px, 0)`
						: undefined,
				...style,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					padding: '14px 18px',
					borderBottom: '1px solid rgba(174,231,250,0.1)',
				}}
			>
				{[accent, 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0.16)'].map(
					(dot, index) => (
						<span
							key={index}
							style={{
								width: 11,
								height: 11,
								borderRadius: '50%',
								background: dot,
							}}
						/>
					),
				)}
				{title ? (
					<span
						style={{
							marginLeft: 8,
							fontSize: 17,
							fontWeight: 600,
							letterSpacing: '0.05em',
							color: 'rgba(235,240,255,0.55)',
						}}
					>
						{title}
					</span>
				) : null}
			</div>
			<div style={{padding: 20, height: `calc(100% - 50px)`}}>{children}</div>
		</div>
	);
};

export type ScanFrameProps = {
	at: number;
	/**
	 * Hauteur de la zone balayée. La largeur suit celle du parent — le cadre
	 * s'ancre en `inset: 0`, il ne se dimensionne pas lui-même.
	 */
	height: number;
	/** Durée d'un aller de la ligne de balayage. */
	sweep?: number;
	color?: string;
	corner?: number;
	label?: string;
	fontFamily?: string;
};

/**
 * Cadre de scan biométrique.
 *
 * Quatre équerres plutôt qu'un cadre fermé : c'est ce qui distingue un
 * *viseur* d'une simple bordure. Les équerres se déploient depuis les coins,
 * puis la ligne de balayage fait des allers-retours.
 *
 * Élément d'interface détourné : il n'appartient à aucun logiciel réel, il sert
 * à dire « quelque chose est en train d'être mesuré ».
 */
export const ScanFrame: React.FC<ScanFrameProps> = ({
	at,
	height,
	sweep = 56,
	color = '#389FFA',
	corner = 44,
	label,
	fontFamily,
}) => {
	const frame = useCurrentFrame();
	const local = frame - at;
	if (local < 0) return null;

	const deploy = interpolate(local, [0, 14], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	// Aller-retour : le balayage repart dans l'autre sens au lieu de sauter.
	const cycle = (local % (sweep * 2)) / sweep;
	const sweepY = (cycle <= 1 ? cycle : 2 - cycle) * height;

	const arm = corner * deploy;
	const thickness = 5;

	const corners = [
		{top: 0, left: 0, h: [true, false], v: [true, false]},
		{top: 0, right: 0, h: [false, true], v: [true, false]},
		{bottom: 0, left: 0, h: [true, false], v: [false, true]},
		{bottom: 0, right: 0, h: [false, true], v: [false, true]},
	];

	return (
		<div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
			{corners.map((c, index) => (
				<div key={index} style={{position: 'absolute', ...c}}>
					<div
						style={{
							position: 'absolute',
							width: arm,
							height: thickness,
							background: color,
							borderRadius: thickness,
							[c.h[0] ? 'left' : 'right']: 0,
							[c.v[0] ? 'top' : 'bottom']: 0,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							width: thickness,
							height: arm,
							background: color,
							borderRadius: thickness,
							[c.h[0] ? 'left' : 'right']: 0,
							[c.v[0] ? 'top' : 'bottom']: 0,
						}}
					/>
				</div>
			))}

			{deploy > 0.9 ? (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: sweepY,
						height: 3,
						background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
						boxShadow: `0 0 28px 6px ${color}66`,
					}}
				/>
			) : null}

			{label ? (
				<div
					style={{
						position: 'absolute',
						left: 0,
						bottom: -38,
						fontFamily,
						fontSize: 19,
						fontWeight: 700,
						letterSpacing: '0.16em',
						color,
						opacity: deploy,
					}}
				>
					{label}
				</div>
			) : null}
		</div>
	);
};
