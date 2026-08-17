import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {BlinkStage} from '@/components/blink';
import {Cadence, Medallion, Shockwave, Sparks} from '@/components/kinetic';
import {blink, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {Camera, Impact, Pop} from '@/motion/kinetic';

export const hookSchema = z.object({
	badge: z.string(),
	lineOne: z.string(),
	lineTwo: z.string(),
	lineThree: z.string(),
});

export type HookProps = z.infer<typeof hookSchema>;

export const hookDefaults: HookProps = {
	badge: 'PREMIÈRE IMPRESSION',
	lineOne: 'TON PROFIL',
	lineTwo: 'PARLE',
	lineThree: 'AVANT TOI.',
};

/**
 * 00:00 — HOOK  ·  168 frames utiles
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA RÈGLE DE LISIBILITÉ
 *
 * Un mot d'impact doit être **totalement immobile pendant au moins 18 frames**
 * avant de quitter le cadre. C'est la contrainte qui gouverne tout ce plan, et
 * elle a coûté 48 frames de plus que la version précédente — délibérément.
 *
 * Le hook précédent était plus court et plus violent, et illisible pour une
 * raison précise : les mots arrivaient au ressort `kick` depuis `slamIn`
 * (échelle 1,75, rotation −12°, flou de vitesse), donc pendant les vingt
 * premières frames de leur entrée ils étaient géométriquement déformés. On
 * voyait qu'il y avait du texte ; on ne pouvait pas le lire.
 *
 * Trois corrections, dans cet ordre d'importance :
 *
 *   1. **`readPop` + ressort `read`** — l'entrée est une simple échelle
 *      0,7 → 1,05 → 1, sans rotation, sans translation, **sans flou**. Le mot
 *      est déchiffrable dès sa première frame ;
 *   2. **stabilisation en 12 frames** — ζ = 0,527 pose le mot deux fois plus
 *      vite que `kick`, ce qui libère du temps de lecture sans allonger le plan ;
 *   3. **une seule caméra en mouvement à la fois** — le recul, le filé et le
 *      punch ne se recouvrent jamais. Pendant qu'un mot est lu, le cadre ne
 *      bouge pas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PARTITION
 *
 *   f000  ▮ BATTEMENT 1 — la caméra est collée au médaillon (échelle 4,3) et
 *           recule en 24 frames
 *   f014  le tampon fluo s'imprime (ressort 500/15, ~34 % de dépassement)
 *           ↳ posé à f024, immobile jusqu'à f042 = 18 frames de lecture
 *   f042  ▮ BATTEMENT 2 — filé latéral, 12 frames, puis plus rien ne bouge
 *   f042  « TON PROFIL »   posé f054
 *   f052  « PARLE »        posé f064   ↳ PUNCH ZOOM caméra 1 → 1,22 en 5 f
 *   f062  « AVANT TOI. »   posé f074
 *           ↳ les trois mots immobiles de f074 à f106 = 32 frames
 *   f106  ▮ BATTEMENT 3 — la chute, en fluo, plein cadre
 *           ↳ posée f118, immobile jusqu'à f153 = 35 frames
 *   f153  recul de caméra à 0,90 : le plan est prêt à être tranché
 */

const HITS_A = [
	{at: 14, amplitude: 24, duration: 10, seed: 'h1', rotation: 1.5},
	{at: 24, amplitude: 7, duration: 5, seed: 'h2'},
];

const HITS_B = [
	{at: 0, amplitude: 16, duration: 6, seed: 'h3', rotation: 1},
	{at: 10, amplitude: 20, duration: 7, seed: 'h4', rotation: 1.2},
	{at: 20, amplitude: 12, duration: 6, seed: 'h5'},
];

const HITS_C = [{at: 0, amplitude: 26, duration: 10, seed: 'h6', rotation: 1.6}];

/**
 * Le punch du battement 2 tombe sur « PARLE », le seul mot porteur de la
 * phrase. Le recul du battement 3 est tenu (`hold`) : la scène reste à 0,90
 * jusqu'à ce que la lame diagonale la tranche.
 */
const PUNCH_B = [{at: 10, to: 1.22, rise: 5}];
const PUNCH_C = [
	{at: 0, to: 1.18, rise: 5},
	{at: 47, to: 0.9, rise: 10, hold: true},
];

const SFX_A = [cue(0, 'softSwipe'), cue(14, 'clickMechanic'), cue(14, 'impactThud', 0.42)];
const SFX_B = [cue(0, 'softSwipe'), cue(10, 'impactThud'), cue(20, 'clickMechanic', 0.34)];
const SFX_C = [cue(0, 'impactThud'), cue(47, 'softSwipe')];

/** Le tampon. Il ne réapparaît jamais après le premier plan. */
const Badge: React.FC<{label: string; at: number}> = ({label, at}) => (
	<Pop at={at} spring="stamp" preset="printIn" shadow squash={0.8}>
		<div
			style={{
				padding: '18px 38px',
				borderRadius: 18,
				background: `linear-gradient(100deg, ${pop.flare}, ${pop.flareHot})`,
				color: pop.ink,
				fontFamily: fonts.display,
				fontSize: 44,
				fontWeight: 800,
				letterSpacing: '-0.02em',
				textTransform: 'uppercase',
				transform: 'rotate(-3.5deg)',
			}}
		>
			{label}
		</div>
	</Pop>
);

/**
 * Un mot de la phrase.
 *
 * Rien d'autre que l'échelle ne bouge. C'est volontairement le composant le
 * plus pauvre du film.
 */
const Word: React.FC<{
	text: string;
	at: number;
	size: number;
	color: string;
	weight?: number;
	tracking?: string;
}> = ({text, at, size, color, weight = 800, tracking = '-0.06em'}) => (
	<Pop at={at} spring="read" preset="readPop">
		<div
			style={{
				fontFamily: fonts.display,
				fontSize: size,
				fontWeight: weight,
				letterSpacing: tracking,
				lineHeight: 0.94,
				color,
				textAlign: 'center',
				textShadow: '0 26px 70px rgba(0,6,20,0.8)',
			}}
		>
			{text}
		</div>
	</Pop>
);

export const Hook: React.FC<HookProps> = ({badge, lineOne, lineTwo, lineThree}) => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		{/* ── BATTEMENT 1 · l'objet ─────────────────────────────────────── */}
		<Sequence durationInFrames={42} layout="none">
			<SfxTrack cues={SFX_A} />
			<Impact hits={HITS_A}>
				<BlinkStage glow={blink.skyBright} glowStrength={0.5} glowY={0.42}>
					{/* Le recul s'achève à la frame 24 : les 18 dernières frames du
					    battement sont une image parfaitement stable, sur laquelle le
					    tampon peut être lu. */}
					<Camera
						moves={[{scale: 4.3, toScale: 1.06, timing: {duration: 24, easing: 'expo'}}]}
					>
						<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
							<Medallion size={820} tilt={11} />
						</AbsoluteFill>
					</Camera>

					<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
						<Shockwave at={14} count={3} step={7} size={1800} color={pop.flare} thickness={5} />
						<Sparks at={14} count={30} spread={620} color={pop.flare} color2={pop.flareHot} life={22} />
					</AbsoluteFill>

					<AbsoluteFill
						style={{alignItems: 'center', justifyContent: 'center', paddingTop: 620}}
					>
						<Badge label={badge} at={14} />
					</AbsoluteFill>
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · la phrase ───────────────────────────────────── */}
		<Sequence from={42} durationInFrames={64} layout="none">
			<SfxTrack cues={SFX_B} />
			<Impact hits={HITS_B} punches={PUNCH_B}>
				{/* Filé d'arrivée : le cadre entre par la droite en douze frames, puis
				    s'immobilise pour toute la durée de la lecture. */}
				<Camera moves={[{x: 1180, toX: 0, timing: {spring: 'whip', durationInFrames: 12}}]}>
					<BlinkStage glow={blink.sky} glowStrength={0.3} glowY={0.5}>
						{/* La cadence de fond est volontairement basse ici : elle doit tenir
						    le rythme sans concurrencer la lecture. */}
						<Cadence every={15} color={blink.sky} strength={0.5} />

						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 6,
							}}
						>
							{/* Contraste d'échelle : 64 px pour le mot qui ne porte rien,
							    216 px pour celui qui porte tout. Rapport 1 : 3,4. */}
							<Word text={lineOne} at={0} size={64} color={blink.gray} weight={700} tracking="0.06em" />
							<Word text={lineTwo} at={10} size={216} color={blink.sky} />
							<Word text={lineThree} at={20} size={118} color={blink.white} tracking="-0.05em" />
						</div>

						{/* Le tampon redevient une étiquette : il ne se rejoue pas, il se
						    range. */}
						<AbsoluteFill style={{alignItems: 'center', paddingTop: 300}}>
							<Pop at={30} spring="read" preset="readPop">
								<div
									style={{
										padding: '10px 24px',
										borderRadius: 10,
										background: pop.flare,
										color: pop.ink,
										fontFamily: fonts.mono,
										fontSize: 24,
										fontWeight: 700,
										letterSpacing: '0.18em',
									}}
								>
									{badge}
								</div>
							</Pop>
						</AbsoluteFill>
					</BlinkStage>
				</Camera>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · la chute ────────────────────────────────────── */}
		<Sequence from={106} layout="none">
			<SfxTrack cues={SFX_C} />
			<Impact hits={HITS_C} punches={PUNCH_C}>
				<BlinkStage glow={pop.flareHot} glowStrength={0.34} glowY={0.5}>
					<Cadence every={15} color={pop.flare} strength={0.7} />

					{/* Le médaillon revient, petit et flouté : le plan boucle sur son
					    propre objet au lieu de partir ailleurs. */}
					<AbsoluteFill
						style={{
							alignItems: 'center',
							justifyContent: 'center',
							opacity: 0.2,
							filter: 'blur(6px)',
						}}
					>
						<Medallion size={1180} tilt={-8} shine={0.1} />
					</AbsoluteFill>

					{/* 152 px et non 176 : au-delà, « AVANT TOI. » passe sur deux lignes,
					    et une chute de phrase coupée en deux se lit deux fois plus
					    lentement qu'elle ne devrait. */}
					<Word text={lineThree} at={0} size={152} color={pop.flare} />
				</BlinkStage>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
