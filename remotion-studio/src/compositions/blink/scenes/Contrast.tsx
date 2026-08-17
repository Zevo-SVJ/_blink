import type {ReactNode} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {Cadence, DullProfile, FeltCross} from '@/components/kinetic';
import {blink, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {Impact, Pop} from '@/motion/kinetic';
import {useIdle} from '@/motion/kinetic/idle';

export const contrastSchema = z.object({
	before: z.string(),
	reject: z.string(),
	shout: z.string(),
});

export type ContrastProps = z.infer<typeof contrastSchema>;

export const contrastDefaults: ContrastProps = {
	before: 'AVANT',
	reject: 'PAS ÇA.',
	shout: 'NON',
};

/**
 * 00:14.8 — CONTRAST  ·  180 frames utiles
 *
 * La séquence de dénonciation. Un profil délibérément terne, puis une croix au
 * feutre, puis un refus en toutes lettres. C'est le seul moment du film où
 * l'image dit ce qu'il ne faut **pas** faire — et le seul où une croix apparaît.
 *
 *   f000  ▮ le profil terne tombe sur un aplat jaune fluo
 *   f054  ▮ COUPE (raccord graphique : la carte ne bouge pas, le contexte oui)
 *   f058  la croix se trace, deux traits, huit frames chacun
 *   f070  « PAS ÇA. » s'imprime en travers
 *   f120  ▮ COUPE. Fond noir, « NON » plein cadre en fluo
 *   f156  LA CARTE TOMBE — chute libre quadratique, et elle ne s'arrête pas
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA CHUTE EST LA MOITIÉ D'UN RACCORD
 *
 * À la frame 180, le raccord `matchCut` s'ouvre alors que la carte est en
 * pleine descente à environ 52 px/frame. La séquence suivante démarre au même
 * instant avec une carte de regard qui entre par le haut. La caméra du raccord
 * dérive à vitesse constante pendant les huit frames de recouvrement : les deux
 * objets ne font qu'une trajectoire.
 *
 * La chute est une **parabole** (`y = ½·g·t²`) et non un ressort : un objet qui
 * tombe accélère, il ne décélère jamais avant d'avoir touché quelque chose. Un
 * ressort en sortie aurait ralenti la carte juste avant la coupe, ce qui aurait
 * tué le raccord — c'est exactement le genre de détail qui fait qu'un match cut
 * marche ou ne marche pas.
 */

const HITS_A = [{at: 4, amplitude: 22, duration: 9, seed: 'c1', rotation: 1.4}];
const HITS_B = [
	{at: 4, amplitude: 14, duration: 6, seed: 'c2'},
	{at: 9, amplitude: 16, duration: 6, seed: 'c3'},
	{at: 16, amplitude: 26, duration: 9, seed: 'c4', rotation: 1.8},
];
const HITS_C = [
	{at: 0, amplitude: 24, duration: 9, seed: 'c5', rotation: 1.5},
	{at: 36, amplitude: 12, duration: 6, seed: 'c6'},
];

/**
 * Le grattement de feutre n'existe qu'ici.
 *
 * C'est le seul son du film à occurrence unique, comme la croix qu'il
 * accompagne. Un effet qu'on n'entend qu'une fois est celui dont on se
 * souvient.
 */
const SFX_A = [cue(0, 'impactThud', 0.42)];
const SFX_B = [cue(4, 'markerScratch'), cue(16, 'clickMechanic'), cue(16, 'impactThud', 0.4)];
const SFX_C = [cue(0, 'impactThud'), cue(36, 'whooshFast', 0.32)];

const PUNCH_C = [{at: 0, to: 1.22, rise: 5}];

/** Accélération de la chute, en px par frame². */
const GRAVITY = 2.15;

const FreeFall: React.FC<{at: number; children: ReactNode}> = ({at, children}) => {
	const frame = useCurrentFrame();
	const t = Math.max(0, frame - at);
	const y = 0.5 * GRAVITY * t * t;
	// La rotation s'accumule aussi : une carte qui tombe à plat aurait l'air
	// posée sur un ascenseur.
	const spin = t * 0.22;

	return (
		<div
			style={{
				transform: `translate3d(0, ${y.toFixed(2)}px, 0) rotate(${spin.toFixed(2)}deg)`,
			}}
		>
			{children}
		</div>
	);
};

const Card: React.FC<{idlePhase?: number}> = ({idlePhase = 0}) => {
	const idle = useIdle({float: 6, breathe: 0.004, speed: 0.11, phase: idlePhase});
	return (
		<div style={{transform: `translateY(${idle.y.toFixed(2)}px) rotate(-2deg)`}}>
			<DullProfile width={760} />
		</div>
	);
};

// Racine en noir : c'est la couleur du dernier battement, celui que le raccord
// emmène. Le recul de caméra ne découvre donc jamais une couleur étrangère.
export const Contrast: React.FC<ContrastProps> = ({before, reject, shout}) => (
	<AbsoluteFill style={{backgroundColor: pop.ink}}>
		{/* ── BATTEMENT 1 · le profil terne ─────────────────────────────── */}
		<Sequence durationInFrames={54} layout="none">
			<SfxTrack cues={SFX_A} />
			<Impact hits={HITS_A}>
				<AbsoluteFill
					style={{
						backgroundColor: pop.flare,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Pop at={0} spring="heavyDrop" preset="dropHigh" squash={1.4} shadow>
						<Card />
					</Pop>

					<AbsoluteFill style={{alignItems: 'center', paddingTop: 240}}>
						<Pop at={10} spring="kick" preset="hardDown">
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 72,
									fontWeight: 800,
									letterSpacing: '0.04em',
									color: pop.ink,
									opacity: 0.7,
								}}
							>
								{before}
							</div>
						</Pop>
					</AbsoluteFill>

					<Cadence every={15} color={pop.ink} strength={0.4} />
				</AbsoluteFill>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · la croix ────────────────────────────────────── */}
		<Sequence from={54} durationInFrames={66} layout="none">
			<SfxTrack cues={SFX_B} />
			<Impact hits={HITS_B}>
				<AbsoluteFill
					style={{
						backgroundColor: pop.flare,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					{/* Raccord graphique : la carte est exactement où elle était. Seuls
					    la croix et le mot arrivent — donc la coupe se sent sans se voir. */}
					<Card idlePhase={1.4} />

					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<FeltCross at={4} gap={5} duration={8} size={980} />
					</AbsoluteFill>

					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<Pop at={16} spring="stamp" preset="printIn" shadow squash={0.9}>
							<div
								style={{
									padding: '20px 48px',
									background: pop.ink,
									color: pop.flare,
									fontFamily: fonts.display,
									fontSize: 132,
									fontWeight: 800,
									letterSpacing: '-0.05em',
									transform: 'rotate(-6deg)',
								}}
							>
								{reject}
							</div>
						</Pop>
					</AbsoluteFill>
				</AbsoluteFill>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · le refus, puis la chute ─────────────────────── */}
		<Sequence from={120} layout="none">
			<SfxTrack cues={SFX_C} />
			<Impact hits={HITS_C} punches={PUNCH_C}>
				<AbsoluteFill
					style={{
						backgroundColor: pop.ink,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					{/* La carte barrée, réduite : elle a perdu. */}
					<FreeFall at={36}>
						<div style={{transform: 'scale(0.72)'}}>
							<div style={{position: 'relative'}}>
								<Card idlePhase={2.8} />
								<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
									<FeltCross at={-40} gap={0} duration={1} size={980} />
								</AbsoluteFill>
							</div>
						</div>
					</FreeFall>

					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<Pop at={0} spring="stamp" preset="slamIn" squash={1.3}>
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 400,
									fontWeight: 800,
									letterSpacing: '-0.08em',
									lineHeight: 0.9,
									color: pop.cross,
									textShadow: '0 30px 90px rgba(0,0,0,0.7)',
								}}
							>
								{shout}
							</div>
						</Pop>
					</AbsoluteFill>

					<AbsoluteFill
						style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 300}}
					>
						<Pop at={12} spring="kick" preset="hardUp">
							<div
								style={{
									fontFamily: fonts.text,
									fontSize: 40,
									fontWeight: 600,
									letterSpacing: '0.04em',
									color: blink.gray,
								}}
							>
								Ce n’est pas une question de filtre.
							</div>
						</Pop>
					</AbsoluteFill>

					<Cadence every={15} offset={4} color={pop.cross} strength={0.5} />
				</AbsoluteFill>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
