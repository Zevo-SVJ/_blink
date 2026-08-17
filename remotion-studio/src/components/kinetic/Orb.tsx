import type {CSSProperties} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {easings} from '@/motion/dynamics';
import {useIdle} from '@/motion/kinetic/idle';

export type OrbProps = {
	size?: number;
	/** Couleur du côté éclairé. */
	light?: string;
	/** Couleur du côté à l'ombre. */
	dark?: string;
	/** Halo projeté autour. */
	glow?: string;
	/** Position de la source lumineuse, en fraction du diamètre. */
	lightX?: number;
	lightY?: number;
	/** Micro-vie. Un objet posé n'est jamais tout à fait immobile. */
	idle?: boolean;
	phase?: number;
	style?: CSSProperties;
};

/**
 * Sphère pseudo-3D.
 *
 * Trois couches, et c'est la superposition qui crée le volume — pas un modèle
 * 3D : un dégradé radial décentré vers la source lumineuse, une occlusion
 * inversée sur le bord opposé, et un reflet spéculaire net et petit. Sans le
 * troisième, l'objet reste un disque dégradé ; avec, il devient une bille.
 *
 * Sert de représentation abstraite d'une identité — quelque chose de rond, de
 * lisse, qu'on peut regarder sous plusieurs angles.
 */
export const Orb: React.FC<OrbProps> = ({
	size = 320,
	light = '#8ED5F6',
	dark = '#0A2244',
	glow = '#389FFA',
	lightX = 0.34,
	lightY = 0.28,
	idle = true,
	phase = 0,
	style,
}) => {
	const drift = useIdle({float: 8, breathe: 0.014, speed: 0.11, phase});
	const motion = idle
		? `translate3d(0, ${drift.y.toFixed(2)}px, 0) scale(${drift.scale.toFixed(4)})`
		: undefined;

	return (
		<div
			style={{
				position: 'relative',
				width: size,
				height: size,
				transform: motion,
				...style,
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					borderRadius: '50%',
					background: `radial-gradient(circle at ${lightX * 100}% ${lightY * 100}%, ${light} 0%, ${dark} 68%, #04122F 100%)`,
					boxShadow: `0 ${size * 0.12}px ${size * 0.3}px -${size * 0.08}px rgba(0,6,20,0.8), 0 0 ${size * 0.5}px ${glow}44`,
				}}
			/>

			{/* Occlusion du bord opposé à la lumière : c'est elle qui « ferme » la
			    sphère et l'empêche de paraître plate. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					borderRadius: '50%',
					background: `radial-gradient(circle at ${(1 - lightX) * 100}% ${(1 - lightY) * 100}%, rgba(0,4,14,0.55) 0%, transparent 52%)`,
				}}
			/>

			{/* Reflet spéculaire : petit, net, décalé. */}
			<div
				style={{
					position: 'absolute',
					left: `${lightX * 100 - 9}%`,
					top: `${lightY * 100 - 9}%`,
					width: '22%',
					height: '16%',
					borderRadius: '50%',
					background:
						'radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.85), transparent 70%)',
					filter: 'blur(2px)',
				}}
			/>
		</div>
	);
};

export type ShockwaveProps = {
	at: number;
	/** Nombre d'ondes successives. */
	count?: number;
	/** Écart entre deux ondes, en frames. */
	step?: number;
	duration?: number;
	/** Diamètre atteint par une onde. */
	size?: number;
	color?: string;
	thickness?: number;
};

/**
 * Ondes concentriques.
 *
 * L'onde perd de l'opacité en s'agrandissant, et son épaisseur diminue : sans
 * cet amincissement, l'anneau paraît grossir *lui-même* au lieu de s'éloigner.
 *
 * Métaphore du regard qui se propage : quelque chose a été vu, et ça se sait.
 *
 * À placer dans un parent en `position: relative` — les ondes partent de son
 * centre.
 */
export const Shockwave: React.FC<ShockwaveProps> = ({
	at,
	count = 3,
	step = 9,
	duration = 44,
	size = 900,
	color = '#389FFA',
	thickness = 4,
}) => {
	const frame = useCurrentFrame();
	const [a, b, c, d] = easings.expo;

	return (
		<>
			{Array.from({length: count}, (_, index) => {
				const local = frame - at - index * step;
				if (local < 0 || local > duration) return null;

				const progress = interpolate(local, [0, duration], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
					easing: Easing.bezier(a, b, c, d),
				});
				const diameter = size * progress;
				const opacity = (1 - progress) ** 1.6;

				return (
					<div
						key={index}
						style={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							width: diameter,
							height: diameter,
							marginLeft: -diameter / 2,
							marginTop: -diameter / 2,
							borderRadius: '50%',
							border: `${(thickness * (1 - progress * 0.7)).toFixed(2)}px solid ${color}`,
							opacity: opacity * 0.75,
							pointerEvents: 'none',
						}}
					/>
				);
			})}
		</>
	);
};
