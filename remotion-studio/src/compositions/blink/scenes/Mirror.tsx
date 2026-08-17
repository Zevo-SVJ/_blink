import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {CircleMark, CrossMark, Orb} from '@/components/kinetic';
import {Grain} from '@/components/background/Grain';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';
import {Impact, Pop} from '@/motion/kinetic';
import {useIdle} from '@/motion/kinetic/idle';

export const mirrorSchema = z.object({
	leftLabel: z.string(),
	leftValue: z.string(),
	rightLabel: z.string(),
	rightValue: z.string(),
	line: z.string(),
});

export type MirrorProps = z.infer<typeof mirrorSchema>;

export const mirrorDefaults: MirrorProps = {
	leftLabel: 'ce que tu montres',
	leftValue: 'spontané',
	rightLabel: 'ce qu’ils lisent',
	rightValue: 'distant',
	line: 'Ce n’est pas la même chose.',
};

/**
 * SCÈNE 9 — LE MIROIR  ·  8 temps (240 frames)
 *
 * **Rupture chromatique majeure : fond clair.** Après huit plans de bleu nuit,
 * l'œil reçoit un aplat presque blanc. C'est le deuxième des trois basculements
 * de la vidéo, et il tombe au moment exact où le récit se retourne — la forme
 * dit la même chose que le fond.
 *
 * Composition en miroir, avec une **fracture** au milieu : une ligne diagonale
 * qui se trace et sépare l'intention de la perception. Chaque moitié porte une
 * sphère, la même, mais éclairée du côté opposé — c'est le seul indice visuel
 * qu'il s'agit d'un même objet vu autrement.
 *
 * Une annotation manuscrite valide la gauche (cercle) et rature la droite
 * (croix) : le jugement est porté par le tracé, pas par un mot.
 *
 * Partition :
 *   f000  les deux moitiés glissent depuis les bords opposés
 *   f024  la fracture se trace du haut vers le bas
 *   f048  ▮ les deux étiquettes, en cascade
 *   f078  le cercle d'annotation à gauche
 *   f096  la croix à droite
 *   f126  ▮ la phrase se pose en bas
 *   f200  les moitiés se referment l'une sur l'autre
 */

const HITS = [
	{at: 24, amplitude: 12, duration: 6, seed: 'm1'},
	{at: 48, amplitude: 10, duration: 6, seed: 'm2'},
	{at: 96, amplitude: 16, duration: 8, seed: 'm3'},
	{at: 126, amplitude: 20, duration: 8, seed: 'm4', rotation: 1.2},
];

/**
 * La fracture.
 *
 * Un trait diagonal qui se trace de haut en bas, légèrement irrégulier. Il ne
 * sépare pas seulement deux colonnes : il porte l'idée que quelque chose s'est
 * cassé entre l'intention et la lecture.
 */
const Fracture: React.FC<{at: number}> = ({at}) => {
	const progress = useProgress({delay: at, duration: 22, easing: 'expo'});

	return (
		<svg
			width={1080}
			height={1920}
			style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}
		>
			<path
				d="M 552 0 L 528 420 L 560 760 L 522 1180 L 556 1560 L 534 1920"
				stroke={blink.navy}
				strokeWidth={5}
				fill="none"
				strokeLinecap="round"
				strokeDasharray={2600}
				strokeDashoffset={2600 * (1 - progress)}
				opacity={0.22}
			/>
		</svg>
	);
};

const Half: React.FC<{
	label: string;
	value: string;
	at: number;
	from: 'left' | 'right';
	lightX: number;
	accent: string;
	phase: number;
}> = ({label, value, at, from, lightX, accent, phase}) => {
	const idle = useIdle({float: 7, breathe: 0.01, speed: 0.12, phase});

	return (
		<Pop
			at={at}
			spring="heavy"
			preset={from === 'left' ? 'flyRight' : 'flyLeft'}
			squash={0.6}
			out={200}
			exit={from === 'left' ? 'flyOutLeft' : 'flyOutRight'}
			outDuration={18}
			style={{flex: 1}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 26,
					transform: `translateY(${idle.y.toFixed(2)}px)`,
				}}
			>
				<Orb
					size={230}
					light={accent}
					dark="#C9D4E4"
					glow={accent}
					lightX={lightX}
					lightY={0.3}
					idle={false}
				/>

				<div style={{textAlign: 'center'}}>
					<div
						style={{
							fontFamily: fonts.text,
							fontSize: 22,
							fontWeight: 700,
							letterSpacing: '0.14em',
							textTransform: 'uppercase',
							color: blink.gray,
						}}
					>
						{label}
					</div>
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 64,
							fontWeight: 800,
							letterSpacing: '-0.04em',
							color: blink.navy,
							marginTop: 8,
						}}
					>
						{value}
					</div>
				</div>
			</div>
		</Pop>
	);
};

export const Mirror: React.FC<MirrorProps> = ({
	leftLabel,
	leftValue,
	rightLabel,
	rightValue,
	line,
}) => (
	<Impact hits={HITS}>
		<AbsoluteFill style={{backgroundColor: blink.cloud}}>
			{/* Halo froid très diffus : même sur fond clair, le cadre ne doit pas
			    être un aplat mort. */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(circle at 50% 38%, ${blink.sky}66 0%, transparent 62%)`,
				}}
			/>

			<Fracture at={24} />

			<AbsoluteFill
				style={{
					paddingTop: 380,
					paddingBottom: 420,
					paddingLeft: 60,
					paddingRight: 60,
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
				}}
			>
				<Half
					label={leftLabel}
					value={leftValue}
					at={0}
					from="left"
					lightX={0.28}
					accent={blink.success}
					phase={0}
				/>
				<Half
					label={rightLabel}
					value={rightValue}
					at={6}
					from="right"
					lightX={0.74}
					accent={blink.warning}
					phase={2.4}
				/>
			</AbsoluteFill>

			{/* Le jugement, porté par deux tracés manuscrits. */}
			<AbsoluteFill style={{pointerEvents: 'none'}}>
				<CircleMark
					timing={{delay: 78, duration: 22, easing: 'expo'}}
					width={330}
					color={blink.success}
					strokeWidth={8}
					style={{left: 100, top: 988}}
				/>
				<CrossMark
					at={96}
					size={200}
					color={blink.error}
					strokeWidth={13}
					style={{left: 648, top: 1004}}
				/>
			</AbsoluteFill>

			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'flex-end',
					paddingBottom: 260,
					paddingLeft: 88,
					paddingRight: 88,
				}}
			>
				<Pop at={126} spring="slam" preset="slamIn" out={204} exit="crush">
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 78,
							fontWeight: 800,
							letterSpacing: '-0.05em',
							lineHeight: 1.02,
							color: blink.navy,
							textAlign: 'center',
						}}
					>
						{line}
					</div>
				</Pop>
			</AbsoluteFill>

			<Grain opacity={0.035} />
		</AbsoluteFill>
	</Impact>
);
