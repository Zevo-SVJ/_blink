import type {CSSProperties} from 'react';
import {useProgress} from '@/motion/frame';
import {pop} from '@/design/blink';
import {fonts} from '@/design/typography';

export type DullProfileProps = {
	width?: number;
	/** Étiquette du bandeau. Générique : ce n'est le profil de personne. */
	label?: string;
	style?: CSSProperties;
};

const DULL = {
	card: '#E7E8EC',
	tile: '#CFD2D8',
	tile2: '#C2C6CE',
	bar: '#BFC3CB',
	ink: '#9AA0AA',
	inkStrong: '#6E747E',
} as const;

/**
 * LE PROFIL TERNE.
 *
 * Le contre-exemple du film : la version fade de ce que Blink corrige. Tout y
 * est délibérément raté — valeurs grises et sans contraste, avatar réduit à une
 * silhouette géométrique, bio remplacée par des barres, grille de vignettes
 * toutes identiques.
 *
 * Deux contraintes, tenues à la lettre :
 *
 *   • **personne n'y est représenté.** L'avatar est un disque et un arc, pas un
 *     visage ni une photographie. Montrer un vrai profil « raté » désignerait
 *     quelqu'un, ce qui n'est ni le propos ni acceptable ;
 *   • **aucune interface n'est imitée.** Pas de logo, pas de pseudo, pas
 *     d'icône empruntée. La mise en page évoque un profil ; elle n'en reproduit
 *     aucun.
 *
 * Le choix de gris est technique autant qu'éditorial : posé sur les fluos du
 * plan, il fait chuter le contraste d'un coup, et c'est cette chute qui rend la
 * croix qui suit aussi violente.
 */
export const DullProfile: React.FC<DullProfileProps> = ({
	width = 780,
	label = 'PROFIL TYPE',
	style,
}) => (
	<div
		style={{
			width,
			borderRadius: 34,
			padding: 44,
			background: DULL.card,
			boxShadow: '0 50px 110px -40px rgba(0,6,20,0.6)',
			...style,
		}}
	>
		<div
			style={{
				fontFamily: fonts.mono,
				fontSize: 21,
				letterSpacing: '0.18em',
				color: DULL.ink,
				marginBottom: 30,
			}}
		>
			{label}
		</div>

		<div style={{display: 'flex', alignItems: 'center', gap: 30}}>
			{/* Silhouette : un disque, un arc. Rigoureusement personne. */}
			<div
				style={{
					width: 148,
					height: 148,
					borderRadius: '50%',
					background: DULL.tile,
					overflow: 'hidden',
					position: 'relative',
					flexShrink: 0,
				}}
			>
				<div
					style={{
						position: 'absolute',
						left: '50%',
						top: 30,
						width: 54,
						height: 54,
						borderRadius: '50%',
						background: DULL.ink,
						transform: 'translateX(-50%)',
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: '50%',
						top: 94,
						width: 116,
						height: 90,
						borderRadius: '50% 50% 0 0',
						background: DULL.ink,
						transform: 'translateX(-50%)',
					}}
				/>
			</div>

			<div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 15}}>
				<div style={{width: '58%', height: 26, borderRadius: 8, background: DULL.inkStrong}} />
				<div style={{width: '86%', height: 17, borderRadius: 8, background: DULL.bar}} />
				<div style={{width: '72%', height: 17, borderRadius: 8, background: DULL.bar}} />
				<div style={{width: '40%', height: 17, borderRadius: 8, background: DULL.bar}} />
			</div>
		</div>

		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(3, 1fr)',
				gap: 12,
				marginTop: 34,
			}}
		>
			{Array.from({length: 9}, (_, index) => (
				<div
					key={index}
					style={{
						aspectRatio: '1 / 1',
						borderRadius: 10,
						// Deux valeurs en damier, et rien d'autre : la monotonie est le
						// sujet du plan.
						background: index % 2 === 0 ? DULL.tile : DULL.tile2,
					}}
				/>
			))}
		</div>
	</div>
);

export type FeltCrossProps = {
	/** Frame du premier trait. */
	at?: number;
	/** Écart entre les deux traits, en frames. Court : c'est un geste, pas deux. */
	gap?: number;
	/** Durée de tracé d'un trait, en frames. */
	duration?: number;
	size?: number;
	color?: string;
	/** Épaisseur du feutre, en unités du viewBox 100×100. */
	weight?: number;
	style?: CSSProperties;
};

/**
 * LA CROIX AU FEUTRE.
 *
 * Deux traits tracés à la main, huit frames chacun. Elle n'apparaît qu'une fois
 * dans tout le film — c'est ce qui lui donne sa force.
 *
 * Ce qui la distingue d'un « × » vectoriel :
 *
 *   • les traits sont des **courbes**, pas des segments. Un feutre dévie ;
 *   • ils **dépassent** de la cible de 6 unités à chaque extrémité. Une croix
 *     qui s'arrête pile aux bords a été calculée, pas tracée ;
 *   • ils sont **doublés** — une passe large et translucide sous une passe
 *     franche — ce qui imite le dépôt d'encre irrégulier du feutre ;
 *   • le second trait part de l'autre coin et non du même côté : c'est le geste
 *     naturel du poignet qui revient.
 *
 * Le tracé progressif utilise `pathLength={1}` : les unités de tirets sont
 * alors normalisées, donc `strokeDashoffset = 1 − progression` suffit, quelle
 * que soit la longueur réelle du chemin.
 */
export const FeltCross: React.FC<FeltCrossProps> = ({
	at = 0,
	gap = 5,
	duration = 8,
	size = 900,
	color = pop.cross,
	weight = 7,
	style,
}) => {
	// `expoIn` : le trait démarre lentement puis se termine d'un coup de poignet.
	const first = useProgress({delay: at, duration, easing: 'expoIn'});
	const second = useProgress({delay: at + gap, duration, easing: 'expoIn'});

	const strokes = [
		{d: 'M 6 10 C 34 30, 62 62, 94 92', progress: first},
		{d: 'M 94 8 C 68 32, 36 60, 8 94', progress: second},
	];

	return (
		<svg
			viewBox="0 0 100 100"
			style={{width: size, height: size, overflow: 'visible', ...style}}
		>
			{strokes.map((stroke, index) => (
				<g key={index}>
					<path
						d={stroke.d}
						fill="none"
						stroke={color}
						strokeOpacity={0.35}
						strokeWidth={weight * 1.9}
						strokeLinecap="round"
						pathLength={1}
						strokeDasharray={1}
						strokeDashoffset={1 - stroke.progress}
					/>
					<path
						d={stroke.d}
						fill="none"
						stroke={color}
						strokeWidth={weight}
						strokeLinecap="round"
						pathLength={1}
						strokeDasharray={1}
						strokeDashoffset={1 - stroke.progress}
					/>
				</g>
			))}
		</svg>
	);
};
