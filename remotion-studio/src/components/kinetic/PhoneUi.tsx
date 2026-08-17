import type {CSSProperties, ReactNode} from 'react';
import {interpolate} from 'remotion';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';
import {useIdle} from '@/motion/kinetic/idle';

export type PhoneFrameProps = {
	children?: ReactNode;
	width?: number;
	height?: number;
	/** Heure affichée dans la barre d'état. */
	clock?: string;
	background?: string;
	idle?: boolean;
	style?: CSSProperties;
};

/**
 * CHÂSSIS DE TÉLÉPHONE.
 *
 * Un écran mobile générique : coins très arrondis, pilule centrale, barre
 * d'état, indicateur de bas d'écran. Aucun logo, aucune icône propriétaire, une
 * horloge en clair — c'est la **grammaire** d'un téléphone, qui appartient à
 * tout le monde, et non l'interface d'un système en particulier.
 *
 * Sa fonction dans le film est de changer d'échelle de réalité. Après trente
 * secondes d'objets flottant dans un espace abstrait, montrer un écran de
 * téléphone ramène brutalement le propos dans la main du spectateur : ce qui
 * était une métaphore devient une chose qu'il peut faire.
 */
export const PhoneFrame: React.FC<PhoneFrameProps> = ({
	children,
	width = 700,
	height = 1180,
	clock = '9:41',
	background = blink.navy2,
	idle = true,
	style,
}) => {
	const drift = useIdle({float: idle ? 8 : 0, breathe: idle ? 0.005 : 0, speed: 0.1});

	return (
		<div
			style={{
				width,
				height,
				borderRadius: 74,
				padding: 12,
				background: 'linear-gradient(150deg, #2A3550, #101827)',
				boxShadow:
					'0 70px 150px -50px rgba(0,6,20,0.95), inset 0 2px 3px rgba(255,255,255,0.22)',
				transform: `translate3d(0, ${drift.y.toFixed(2)}px, 0) scale(${drift.scale.toFixed(4)})`,
				...style,
			}}
		>
			<div
				style={{
					position: 'relative',
					width: '100%',
					height: '100%',
					borderRadius: 63,
					background,
					overflow: 'hidden',
				}}
			>
				{/* Barre d'état. Trois glyphes dessinés, aucun emprunté. */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						height: 92,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 46px',
						fontFamily: fonts.text,
						fontSize: 27,
						fontWeight: 600,
						color: blink.white,
						zIndex: 2,
					}}
				>
					<span>{clock}</span>
					<div style={{display: 'flex', alignItems: 'center', gap: 9}}>
						{[9, 13, 17, 21].map((bar) => (
							<div
								key={bar}
								style={{width: 5, height: bar, borderRadius: 2, background: blink.white}}
							/>
						))}
						<div
							style={{
								width: 40,
								height: 20,
								borderRadius: 5,
								border: `2px solid ${blink.white}`,
								padding: 2,
								marginLeft: 8,
							}}
						>
							<div
								style={{width: '72%', height: '100%', borderRadius: 2, background: blink.white}}
							/>
						</div>
					</div>
				</div>

				{/* La pilule. */}
				<div
					style={{
						position: 'absolute',
						top: 26,
						left: '50%',
						transform: 'translateX(-50%)',
						width: 176,
						height: 42,
						borderRadius: 21,
						background: '#05080F',
						zIndex: 3,
					}}
				/>

				<div style={{position: 'absolute', inset: 0, paddingTop: 104}}>{children}</div>

				{/* Indicateur de bas d'écran. */}
				<div
					style={{
						position: 'absolute',
						bottom: 16,
						left: '50%',
						transform: 'translateX(-50%)',
						width: 200,
						height: 7,
						borderRadius: 4,
						background: 'rgba(250,250,250,0.5)',
					}}
				/>
			</div>
		</div>
	);
};

export type ToggleRowProps = {
	label: string;
	/** Frame à laquelle l'interrupteur bascule tout seul. */
	at: number;
	/** Frame d'arrivée de la ligne. Par défaut, 10 frames avant la bascule. */
	enterAt?: number;
	detail?: string;
	accent?: string;
	index?: number;
};

/**
 * LIGNE À INTERRUPTEUR QUI S'ACTIVE SEULE.
 *
 * Le procédé est un raccourci narratif classique et il n'a rien de décoratif :
 * une interface qui s'utilise sans doigt montre le **résultat** d'une action
 * sans avoir à filmer l'action. Trois lignes qui basculent en cascade disent
 * « voilà ce que tu as à faire, et c'est fait » en une seconde et demie.
 *
 * Le détail qui le rend crédible : le curseur bascule au ressort `kick` (donc il
 * dépasse légèrement et revient), tandis que la couleur de la piste change,
 * elle, **sans transition**. Un interrupteur physique claque ; sa couleur ne
 * s'interpole pas.
 */
export const ToggleRow: React.FC<ToggleRowProps> = ({
	label,
	at,
	enterAt,
	detail,
	accent = blink.sky,
	index = 0,
}) => {
	const start = enterAt ?? at - 10;
	const enter = useProgress({delay: start, spring: 'kick'});
	const flip = useProgress({delay: at, spring: 'kick'});
	const on = flip > 0.5;

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 24,
				padding: '30px 34px',
				borderRadius: 26,
				background: 'rgba(174,231,250,0.07)',
				border: '1px solid rgba(174,231,250,0.14)',
				transform: `translate3d(${((1 - enter) * 90).toFixed(2)}px, 0, 0)`,
				opacity: enter,
			}}
		>
			<div>
				<div
					style={{
						fontFamily: fonts.display,
						fontSize: 34,
						fontWeight: 650,
						letterSpacing: '-0.02em',
						color: blink.white,
					}}
				>
					{label}
				</div>
				{detail ? (
					<div
						style={{
							fontFamily: fonts.text,
							fontSize: 24,
							fontWeight: 500,
							color: blink.gray,
							marginTop: 6,
						}}
					>
						{detail}
					</div>
				) : null}
			</div>

			<div
				style={{
					width: 108,
					height: 62,
					borderRadius: 31,
					padding: 5,
					flexShrink: 0,
					background: on ? accent : 'rgba(112,122,143,0.35)',
				}}
			>
				<div
					style={{
						width: 52,
						height: 52,
						borderRadius: '50%',
						background: blink.white,
						boxShadow: '0 4px 10px rgba(0,6,20,0.4)',
						transform: `translateX(${(interpolate(flip, [0, 1], [0, 46])).toFixed(2)}px)`,
					}}
				/>
			</div>
			<span style={{display: 'none'}}>{index}</span>
		</div>
	);
};

export type NotifBannerProps = {
	title: string;
	body: string;
	/** Frame d'arrivée. */
	at: number;
	accent?: string;
	/** Glyphe du carré d'application. Une lettre, jamais une icône empruntée. */
	glyph?: string;
	width?: number;
	style?: CSSProperties;
};

/**
 * BANNIÈRE DE NOTIFICATION.
 *
 * Elle tombe du haut avec `heavyDrop` : une notification a un poids, elle
 * n'apparaît pas en fondu. Le fond est translucide et flouté — c'est ce qui la
 * pose *au-dessus* de l'écran et non dedans.
 */
export const NotifBanner: React.FC<NotifBannerProps> = ({
	title,
	body,
	at,
	accent = blink.skyBright,
	glyph = 'B',
	width = 600,
	style,
}) => {
	const enter = useProgress({delay: at, spring: 'heavyDrop'});

	return (
		<div
			style={{
				width,
				display: 'flex',
				alignItems: 'center',
				gap: 22,
				padding: '26px 30px',
				borderRadius: 30,
				background: 'rgba(16,33,65,0.82)',
				backdropFilter: 'blur(30px)',
				border: '1px solid rgba(174,231,250,0.2)',
				boxShadow: '0 34px 70px -24px rgba(0,6,20,0.9)',
				transform: `translate3d(0, ${((1 - enter) * -320).toFixed(2)}px, 0)`,
				opacity: enter < 0.02 ? 0 : 1,
				...style,
			}}
		>
			<div
				style={{
					width: 74,
					height: 74,
					borderRadius: 20,
					flexShrink: 0,
					background: `linear-gradient(140deg, ${accent}, ${blink.sky})`,
					display: 'grid',
					placeItems: 'center',
					fontFamily: fonts.display,
					fontSize: 40,
					fontWeight: 800,
					color: blink.navy,
				}}
			>
				{glyph}
			</div>
			<div>
				<div
					style={{
						fontFamily: fonts.display,
						fontSize: 30,
						fontWeight: 700,
						letterSpacing: '-0.02em',
						color: blink.white,
					}}
				>
					{title}
				</div>
				<div
					style={{
						fontFamily: fonts.text,
						fontSize: 26,
						fontWeight: 500,
						color: 'rgba(250,250,250,0.72)',
						marginTop: 4,
					}}
				>
					{body}
				</div>
			</div>
		</div>
	);
};
