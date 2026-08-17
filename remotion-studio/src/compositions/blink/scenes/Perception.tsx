import {AbsoluteFill, interpolate, Sequence} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {BlinkStage} from '@/components/blink';
import {Cadence, Shockwave, Sparks} from '@/components/kinetic';
import {blink, lenses, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';
import {Impact, Pop} from '@/motion/kinetic';
import {useIdle} from '@/motion/kinetic/idle';

export const perceptionSchema = z.object({
	verdicts: z.array(z.string()),
	line: z.string(),
	emphasis: z.string(),
});

export type PerceptionProps = z.infer<typeof perceptionSchema>;

export const perceptionDefaults: PerceptionProps = {
	verdicts: [
		'Intriguant. Un peu distant.',
		'Soigné, difficile à situer.',
		'C’est bien toi.',
		'Sérieux. Peu de relief.',
	],
	line: 'QUATRE REGARDS',
	emphasis: 'UN SEUL PROFIL',
};

/**
 * 00:17.8 — PERCEPTION  ·  240 frames utiles
 *
 * Quatre lectures du même profil, distribuées comme un jeu de cartes.
 *
 * La séquence **commence en pleine chute** : à la frame 0, une carte entre par
 * le haut à environ 45 px/frame et prolonge la trajectoire de la carte barrée
 * du plan précédent, que le raccord `matchCut` maintient en mouvement pendant
 * les huit frames de recouvrement. C'est la seule séquence du film qui ne
 * démarre pas sur une composition posée, et c'est délibéré : le spectateur n'a
 * pas le temps de voir qu'on a changé de plan.
 *
 *   f000  ▮ les quatre cartes tombent, une toutes les 13 frames, et s'empilent
 *   f000+ chaque atterrissage écrase la carte puis la rétablit (`squash` 1,6)
 *   f078  ▮ COUPE. Le paquet s'ouvre en éventail — les quatre verdicts lisibles
 *   f158  ▮ COUPE. La formule finale, en contraste d'échelle
 *
 * L'empilement est décalé de 72 px et de 3,5° par carte. La valeur n'est pas
 * arbitraire : c'est la hauteur exacte de la ligne d'en-tête d'une carte, donc
 * les quatre pastilles de couleur et les quatre étiquettes restent lisibles
 * pendant que le reste se recouvre. Un décalage plus faible donnerait une pile
 * indistincte, un décalage plus large une liste — et une liste n'est pas un
 * paquet de cartes.
 */

const DROP_STEP = 13;

const HITS_A = lenses.map((_lens, index) => ({
	at: index * DROP_STEP + 16,
	amplitude: 16 + index * 4,
	duration: 7,
	seed: `pk${index}`,
	rotation: index === lenses.length - 1 ? 1.5 : 0.8,
}));

/**
 * Un pop par carte, calé sur l'**atterrissage** et non sur le départ.
 *
 * `heavyDrop` met environ 16 frames à poser la carte : déclencher le son à
 * l'instant où la carte quitte le haut du cadre l'aurait désynchronisé d'un
 * quart de seconde, ce qui s'entend immédiatement.
 */
const SFX_A = lenses.map((_lens, index) => cue(index * DROP_STEP + 16, 'cardPop'));
const SFX_B = lenses.map((_lens, index) => cue(index * 5 + 8, 'cardPop', 0.3));
const SFX_C = [cue(10, 'impactThud'), cue(60, 'softSwipe')];

const PUNCH_C = [
	{at: 10, to: 1.2, rise: 5},
	{at: 60, to: 0.9, rise: 10, hold: true},
];

const HITS_B = [
	{at: 2, amplitude: 18, duration: 7, seed: 'pf1', rotation: 1.1},
	{at: 40, amplitude: 10, duration: 5, seed: 'pf2'},
];

const HITS_C = [
	{at: 0, amplitude: 20, duration: 8, seed: 'pl1'},
	{at: 10, amplitude: 28, duration: 10, seed: 'pl2', rotation: 1.7},
];

const GazeCard: React.FC<{
	index: number;
	verdict: string;
	width?: number;
	compact?: boolean;
}> = ({index, verdict, width = 700, compact = false}) => {
	const lens = lenses[index]!;
	const idle = useIdle({float: 5, breathe: 0.005, speed: 0.12, phase: index * 1.3});

	return (
		<div
			style={{
				width,
				padding: compact ? '28px 32px' : '38px 42px',
				borderRadius: 30,
				background: `linear-gradient(150deg, ${blink.navy3}, ${blink.navy2})`,
				border: `2px solid ${lens.color}66`,
				boxShadow: `0 40px 90px -34px rgba(0,6,20,0.9), inset 0 1px 0 ${lens.color}33`,
				transform: `translateY(${idle.y.toFixed(2)}px)`,
			}}
		>
			<div style={{display: 'flex', alignItems: 'center', gap: 16}}>
				<div
					style={{
						width: 22,
						height: 22,
						borderRadius: '50%',
						background: lens.color,
						boxShadow: `0 0 22px ${lens.color}`,
						flexShrink: 0,
					}}
				/>
				<div
					style={{
						fontFamily: fonts.display,
						fontSize: compact ? 34 : 42,
						fontWeight: 750,
						letterSpacing: '-0.025em',
						color: lens.color,
						textTransform: 'uppercase',
					}}
				>
					{lens.label}
				</div>
			</div>
			<div
				style={{
					fontFamily: fonts.display,
					fontSize: compact ? 38 : 50,
					fontWeight: 650,
					letterSpacing: '-0.03em',
					color: blink.white,
					marginTop: compact ? 10 : 16,
					lineHeight: 1.1,
				}}
			>
				{verdict}
			</div>
		</div>
	);
};

/** Une carte du paquet : elle tombe, atterrit, et reste décalée. */
const Dealt: React.FC<{index: number; verdict: string}> = ({index, verdict}) => {
	const at = index * DROP_STEP;
	return (
		<Pop
			at={at}
			spring="heavyDrop"
			preset="dropHigh"
			squash={1.6}
			shadow
			// Ancrage explicite : le parent du paquet a une taille fixe, sinon un
			// enfant absolu se placerait à sa position statique — c'est-à-dire au
			// point d'origine d'un conteneur de largeur nulle, donc décalé vers la
			// droite au lieu d'être centré.
			style={{position: 'absolute', left: 0, top: 190, width: 700}}
		>
			<div
				style={{
					transform: `translate3d(${(index * 14 - 21).toFixed(1)}px, ${(index * 72 - 108).toFixed(1)}px, 0) rotate(${(index * 3.5 - 5.2).toFixed(2)}deg)`,
				}}
			>
				<GazeCard index={index} verdict={verdict} />
			</div>
		</Pop>
	);
};

export const Perception: React.FC<PerceptionProps> = ({verdicts, line, emphasis}) => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		{/* ── BATTEMENT 1 · la distribution ─────────────────────────────── */}
		<Sequence durationInFrames={78} layout="none">
			<SfxTrack cues={SFX_A} />
			<Impact hits={HITS_A}>
				<BlinkStage glow={blink.skyBright} glowStrength={0.36} glowY={0.46}>
					<div style={{position: 'relative', width: 700, height: 580}}>
						{lenses.map((lens, index) => (
							<Dealt key={lens.id} index={index} verdict={verdicts[index] ?? ''} />
						))}
						<Shockwave at={16} count={1} size={900} color={lenses[0]!.color} thickness={3} />
						<Shockwave at={55} count={2} step={7} size={1400} color={blink.sky} thickness={4} />
					</div>
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · l'éventail ──────────────────────────────────── */}
		<Sequence from={78} durationInFrames={80} layout="none">
			<SfxTrack cues={SFX_B} />
			<Impact hits={HITS_B}>
				<BlinkStage glow={blink.sky} glowStrength={0.3} glowY={0.5}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 18,
							width: '100%',
							alignItems: 'center',
						}}
					>
						{lenses.map((lens, index) => (
							<Pop
								key={lens.id}
								at={index * 5}
								spring="kick"
								preset={index % 2 === 0 ? 'flyRight' : 'flyLeft'}
								tilt
								index={index}
							>
								<GazeCard index={index} verdict={verdicts[index] ?? ''} width={780} compact />
							</Pop>
						))}
					</div>

					<Cadence every={15} color={blink.sky} strength={0.55} />
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · la formule ──────────────────────────────────── */}
		<Sequence from={158} layout="none">
			<SfxTrack cues={SFX_C} />
			<Impact hits={HITS_C} punches={PUNCH_C}>
				<BlinkStage glow={pop.flare} glowStrength={0.24} glowY={0.5}>
					{/* Les quatre pastilles de couleur restent, réduites à leur signal :
					    la couleur suffit désormais à identifier chaque regard. */}
					<AbsoluteFill style={{alignItems: 'center', paddingTop: 420}}>
						<div style={{display: 'flex', gap: 26}}>
							{lenses.map((lens, index) => (
								<Pop key={lens.id} at={index * 3} spring="kick" preset="popIn">
									<Dot color={lens.color} at={index * 3} />
								</Pop>
							))}
						</div>
					</AbsoluteFill>

					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
						<Pop at={0} spring="kick" preset="hardDown">
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 88,
									fontWeight: 700,
									letterSpacing: '-0.035em',
									color: blink.gray,
								}}
							>
								{line}
							</div>
						</Pop>

						<Pop at={10} spring="kick" preset="slamIn" squash={1.2}>
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 172,
									fontWeight: 800,
									letterSpacing: '-0.065em',
									lineHeight: 0.92,
									color: pop.flare,
									textAlign: 'center',
									textShadow: '0 28px 80px rgba(0,6,20,0.85)',
								}}
							>
								{emphasis}
							</div>
						</Pop>
					</div>

					<Sparks at={10} count={20} spread={520} color={pop.flare} color2={blink.sky} life={22} />
					<Cadence every={15} offset={6} color={pop.flare} strength={0.5} />
				</BlinkStage>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);

/** Pastille pulsée : elle respire au lieu de rester allumée. */
const Dot: React.FC<{color: string; at: number}> = ({color, at}) => {
	const pulse = useProgress({delay: at + 14, duration: 26, easing: 'expo'});
	const size = interpolate(pulse, [0, 1], [46, 34]);
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				background: color,
				boxShadow: `0 0 ${(size * 0.9).toFixed(0)}px ${color}`,
			}}
		/>
	);
};
