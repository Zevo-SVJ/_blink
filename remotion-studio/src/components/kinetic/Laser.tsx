import {noise2D} from '@remotion/noise';
import type {CSSProperties} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {blink} from '@/design/blink';
import {STAGGER} from '@/motion/beats';
import {Pop} from '@/motion/kinetic/Pop';

export type PhotoGridProps = {
	/** Frame de départ de la cascade. */
	at?: number;
	columns?: number;
	rows?: number;
	/** Côté d'une vignette, en px. */
	tile?: number;
	gap?: number;
	/** Écart entre deux vignettes de la cascade, en frames. */
	step?: number;
	/** Passe la grille en valeurs éteintes — la grille « avant ». */
	dull?: boolean;
	out?: number;
	style?: CSSProperties;
};

/**
 * Grille de vignettes.
 *
 * Neuf carrés, aucune photographie. Ce sont des dégradés dont la teinte est
 * tirée d'un bruit indexé : la grille a donc la **variété** d'un vrai mur
 * d'images sans en emprunter une seule, et le résultat est identique à chaque
 * rendu puisque le bruit est une fonction pure de l'indice.
 *
 * La cascade suit l'ordre de lecture et non l'ordre du DOM ligne par ligne :
 * le délai est calculé sur `x + y`, donc l'apparition se propage en diagonale
 * depuis le coin haut-gauche. C'est le même geste que le regard qui balaie une
 * grille, et il est beaucoup plus lisible qu'une cascade linéaire sur neuf
 * éléments.
 */
export const PhotoGrid: React.FC<PhotoGridProps> = ({
	at = 0,
	columns = 3,
	rows = 3,
	tile = 232,
	gap = 14,
	step = STAGGER.tight,
	dull = false,
	out,
	style,
}) => (
	<div
		style={{
			display: 'grid',
			gridTemplateColumns: `repeat(${columns}, ${tile}px)`,
			gap,
			...style,
		}}
	>
		{Array.from({length: columns * rows}, (_, index) => {
			const x = index % columns;
			const y = Math.floor(index / columns);
			const hue = 208 + noise2D('grid-hue', index * 2.3, 0) * 52;
			const light = 34 + noise2D('grid-light', index * 1.7, 0) * 12;

			return (
				<Pop
					key={index}
					at={at + (x + y) * step}
					spring="kick"
					preset="popIn"
					tilt
					index={index}
					out={out === undefined ? undefined : out + (x + y)}
					exit="crush"
					outDuration={12}
				>
					<div
						style={{
							width: tile,
							height: tile,
							borderRadius: 12,
							background: dull
								? `linear-gradient(${(150 + index * 17).toFixed(0)}deg, hsl(220, 6%, ${(72 + (index % 3) * 4).toFixed(0)}%), hsl(220, 5%, ${(60 + (index % 4) * 3).toFixed(0)}%))`
								: `linear-gradient(${(146 + index * 21).toFixed(0)}deg, hsl(${hue.toFixed(0)}, 64%, ${light.toFixed(0)}%), hsl(${(hue + 38).toFixed(0)}, 56%, ${(light - 14).toFixed(0)}%))`,
						}}
					/>
				</Pop>
			);
		})}
	</div>
);

export type LaserSweepProps = {
	/** Frame de départ du balayage. */
	at?: number;
	/** Durée d'un aller, en frames. */
	duration?: number;
	/** Nombre de passes. Chacune repart du haut. */
	passes?: number;
	color?: string;
	/** Épaisseur du filet vif, en px. */
	thickness?: number;
	/** Hauteur de la traîne lumineuse, en px. */
	trail?: number;
	/** Teinte laissée sur la zone déjà balayée. 0 la supprime. */
	residue?: number;
	style?: CSSProperties;
};

/**
 * BALAYAGE LASER.
 *
 * Une ligne lumineuse traverse la zone de haut en bas. Trois éléments, et le
 * troisième est celui qu'on oublie généralement :
 *
 *   1. le **filet vif** — deux pixels, saturés, avec une lueur ;
 *   2. la **traîne** — un dégradé au-dessus du filet, qui donne la direction.
 *      Sans elle, la ligne pourrait aussi bien monter que descendre ;
 *   3. le **résidu** — la zone déjà balayée reste très légèrement teintée. C'est
 *      ce qui transforme un effet lumineux en *lecture* : l'image garde la
 *      trace de ce qui a été analysé.
 *
 * Le laser dépasse latéralement de la zone (`inset: -24px`) : une ligne qui
 * s'arrête pile au bord se lit comme un élément de la carte, une ligne qui la
 * dépasse se lit comme un instrument extérieur qui la traverse.
 */
export const LaserSweep: React.FC<LaserSweepProps> = ({
	at = 0,
	duration = 34,
	passes = 1,
	color = blink.sky,
	thickness = 3,
	trail = 190,
	residue = 0.1,
	style,
}) => {
	const frame = useCurrentFrame();
	const local = frame - at;

	if (local < 0 || local > duration * passes) return null;

	const pass = Math.min(passes - 1, Math.floor(local / duration));
	const inside = local - pass * duration;
	const t = interpolate(inside, [0, duration], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const y = `${(t * 100).toFixed(3)}%`;

	return (
		<div
			style={{
				position: 'absolute',
				inset: -24,
				overflow: 'hidden',
				pointerEvents: 'none',
				...style,
			}}
		>
			{residue > 0 ? (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: 0,
						height: y,
						background: color,
						opacity: residue,
						mixBlendMode: 'screen',
					}}
				/>
			) : null}

			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: y,
					height: trail,
					marginTop: -trail,
					background: `linear-gradient(180deg, transparent, ${color}44)`,
				}}
			/>

			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: y,
					height: thickness,
					background: color,
					boxShadow: `0 0 26px ${color}, 0 0 60px ${color}88`,
				}}
			/>
		</div>
	);
};
