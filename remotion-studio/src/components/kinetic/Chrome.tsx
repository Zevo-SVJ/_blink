import type {CSSProperties} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';

export type CameraChromeProps = {
	/** Frame d'apparition du chrome. */
	at?: number;
	color?: string;
	/** Étiquette de gauche. Générique par construction. */
	label?: string;
	/** Ligne de réglages, en bas. */
	settings?: string[];
	/** Période du clignotement du voyant, en frames. */
	blink?: number;
	/** Grille des tiers. */
	grid?: boolean;
	/** Marge des marqueurs d'angle, en px. */
	inset?: number;
};

const Corner: React.FC<{
	color: string;
	size: number;
	weight: number;
	progress: number;
	vertical: 'top' | 'bottom';
	horizontal: 'left' | 'right';
	inset: number;
}> = ({color, size, weight, progress, vertical, horizontal, inset}) => {
	// Les marqueurs arrivent de l'extérieur du cadre : ils se **referment** sur
	// l'image, ce qui raconte un cadrage. Posés à leur place, ils ne seraient
	// qu'une décoration d'angle.
	const travel = (1 - progress) * 90;
	return (
		<div
			style={{
				position: 'absolute',
				[vertical]: inset,
				[horizontal]: inset,
				width: size,
				height: size,
				[`border${vertical === 'top' ? 'Top' : 'Bottom'}`]: `${weight}px solid ${color}`,
				[`border${horizontal === 'left' ? 'Left' : 'Right'}`]: `${weight}px solid ${color}`,
				transform: `translate3d(${(horizontal === 'left' ? -travel : travel).toFixed(2)}px, ${(vertical === 'top' ? -travel : travel).toFixed(2)}px, 0)`,
				opacity: progress,
			}}
		/>
	);
};

/**
 * CHROME DE CAPTURE.
 *
 * Une interface d'appareil photo entièrement générique : quatre marqueurs
 * d'angle, un voyant d'enregistrement, un timecode, une grille des tiers, une
 * ligne de réglages. Aucune marque, aucune icône empruntée — le vocabulaire de
 * la capture appartient à tout le monde, les interfaces qui l'utilisent non.
 *
 * Sa fonction dans le film est double. Elle installe un **univers visuel**
 * différent du bleu nuit (l'image devient un viseur, donc un lieu), et elle
 * fournit gratuitement la cadence : le voyant clignote toutes les 30 frames et
 * le timecode change **toutes les frames**. Un plan qui porte ce chrome ne peut
 * pas être immobile, même si son contenu ne bouge pas.
 */
export const CameraChrome: React.FC<CameraChromeProps> = ({
	at = 0,
	color = '#FAFAFA',
	label = 'CAPTURE',
	settings = ['AF·S', 'ISO 400', 'f/1.8', '1/125'],
	blink: blinkPeriod = 30,
	grid = true,
	inset = 64,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const appear = useProgress({delay: at, spring: 'kick'});
	const local = Math.max(0, frame - at);

	// Voyant : allumé les deux tiers de la période. Un clignotement symétrique
	// se lit comme une alarme ; asymétrique, comme un enregistrement.
	const lit = local % blinkPeriod < blinkPeriod * 0.66;

	const totalFrames = local;
	const seconds = Math.floor(totalFrames / fps);
	const timecode = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}:${String(Math.floor(totalFrames % fps)).padStart(2, '0')}`;

	return (
		<div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
			{grid ? (
				<div style={{position: 'absolute', inset: inset + 40, opacity: appear * 0.13}}>
					{[33.33, 66.66].map((pct) => (
						<div
							key={`h${pct}`}
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								top: `${pct}%`,
								height: 1,
								background: color,
							}}
						/>
					))}
					{[33.33, 66.66].map((pct) => (
						<div
							key={`v${pct}`}
							style={{
								position: 'absolute',
								top: 0,
								bottom: 0,
								left: `${pct}%`,
								width: 1,
								background: color,
							}}
						/>
					))}
				</div>
			) : null}

			<Corner color={color} size={92} weight={7} progress={appear} vertical="top" horizontal="left" inset={inset} />
			<Corner color={color} size={92} weight={7} progress={appear} vertical="top" horizontal="right" inset={inset} />
			<Corner color={color} size={92} weight={7} progress={appear} vertical="bottom" horizontal="left" inset={inset} />
			<Corner color={color} size={92} weight={7} progress={appear} vertical="bottom" horizontal="right" inset={inset} />

			<div
				style={{
					position: 'absolute',
					top: inset + 116,
					left: inset + 4,
					display: 'flex',
					alignItems: 'center',
					gap: 14,
					opacity: appear,
				}}
			>
				<div
					style={{
						width: 20,
						height: 20,
						borderRadius: '50%',
						background: '#FF2D2D',
						opacity: lit ? 1 : 0.15,
						boxShadow: lit ? '0 0 22px #FF2D2Daa' : 'none',
					}}
				/>
				<span
					style={{
						fontFamily: fonts.mono,
						fontSize: 26,
						fontWeight: 600,
						letterSpacing: '0.14em',
						color,
					}}
				>
					REC
				</span>
				<span
					style={{
						fontFamily: fonts.mono,
						fontSize: 26,
						letterSpacing: '0.08em',
						color,
						opacity: 0.62,
					}}
				>
					{timecode}
				</span>
			</div>

			<div
				style={{
					position: 'absolute',
					top: inset + 116,
					right: inset + 4,
					fontFamily: fonts.mono,
					fontSize: 24,
					letterSpacing: '0.16em',
					color,
					opacity: appear * 0.72,
				}}
			>
				{label}
			</div>

			<div
				style={{
					position: 'absolute',
					bottom: inset + 116,
					left: inset + 4,
					right: inset + 4,
					display: 'flex',
					justifyContent: 'space-between',
					fontFamily: fonts.mono,
					fontSize: 23,
					letterSpacing: '0.1em',
					color,
					opacity: appear * 0.55,
				}}
			>
				{settings.map((token) => (
					<span key={token}>{token}</span>
				))}
			</div>
		</div>
	);
};

export type FocusBoxProps = {
	/** Frame où le viseur se verrouille. */
	at?: number;
	width?: number;
	height?: number;
	color?: string;
	/** Étiquette affichée sous le viseur au verrouillage. */
	label?: string;
	style?: CSSProperties;
};

/**
 * Viseur d'autofocus.
 *
 * Il arrive **trop grand** puis se resserre sur sa cible en un ressort raide :
 * c'est le geste d'un appareil qui accroche un sujet. Le liséré passe du blanc
 * au jaune au moment du verrouillage — un changement de couleur binaire, sans
 * transition, parce qu'un autofocus ne verrouille pas progressivement.
 */
export const FocusBox: React.FC<FocusBoxProps> = ({
	at = 0,
	width = 520,
	height = 520,
	color = '#FFE93D',
	label,
	style,
}) => {
	const frame = useCurrentFrame();
	const lock = useProgress({delay: at, spring: 'kick'});
	const locked = frame >= at + 9;
	const scale = interpolate(lock, [0, 1], [1.5, 1]);
	const arm = 40;
	const weight = 6;
	const tint = locked ? color : '#FAFAFA';

	return (
		<div
			style={{
				position: 'relative',
				width,
				height,
				transform: `scale(${scale.toFixed(4)})`,
				opacity: lock,
				...style,
			}}
		>
			{(
				[
					['top', 'left'],
					['top', 'right'],
					['bottom', 'left'],
					['bottom', 'right'],
				] as const
			).map(([v, h]) => (
				<div
					key={`${v}${h}`}
					style={{
						position: 'absolute',
						[v]: 0,
						[h]: 0,
						width: arm,
						height: arm,
						[`border${v === 'top' ? 'Top' : 'Bottom'}`]: `${weight}px solid ${tint}`,
						[`border${h === 'left' ? 'Left' : 'Right'}`]: `${weight}px solid ${tint}`,
					}}
				/>
			))}

			{label ? (
				<div
					style={{
						position: 'absolute',
						left: 0,
						bottom: -52,
						fontFamily: fonts.mono,
						fontSize: 24,
						letterSpacing: '0.12em',
						color: tint,
						opacity: locked ? 1 : 0.4,
					}}
				>
					{label}
				</div>
			) : null}
		</div>
	);
};
