import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {BlinkStage, ScoreRing} from '@/components/blink';
import {Cadence, Shockwave, Sparks, TierLadder} from '@/components/kinetic';
import {blink, pop, tiers} from '@/design/blink';
import {fonts} from '@/design/typography';
import {Counter, Gauge, Impact, Pop} from '@/motion/kinetic';
import {useIdle} from '@/motion/kinetic/idle';
import {DEMO} from '../manifest';

export const scoreHeroSchema = z.object({
	score: z.number(),
	tier: z.string(),
	tierMeaning: z.string(),
	nextTier: z.string(),
	pointsToNext: z.number(),
});

export type ScoreHeroProps = z.infer<typeof scoreHeroSchema>;

export const scoreHeroDefaults: ScoreHeroProps = {
	score: DEMO.score,
	tier: DEMO.tier,
	tierMeaning: 'Tout tire dans le même sens.',
	nextTier: DEMO.nextTier,
	pointsToNext: DEMO.pointsToNext,
};

/**
 * 00:25.8 — SCORE HERO  ·  240 frames utiles
 *
 * Le sommet. Tout ce qui précède existe pour rendre ce moment attendu, donc ce
 * plan ne porte qu'**une** information à la fois — jamais le score, le palier,
 * la signification et la suite en même temps.
 *
 *   f000  ▮ le compteur s'emballe de 0 à 742 en 44 frames, l'anneau se trace
 *   f050  éclatement de particules à l'arrivée du chiffre
 *   f078  ▮ COUPE. Le palier s'abat — le plus fort impact du film (30 px, 11 f)
 *   f158  ▮ COUPE. L'échelle des paliers, et la marche qui reste
 *
 * Le compteur monte avec une décélération exponentielle : illisible au début,
 * stabilisé à la fin. C'est le mouvement qui porte l'information — « ça monte
 * fort » — et non la valeur, qui n'arrive que quand elle s'immobilise.
 *
 * Les chiffres sont vrais et vérifiables : 742 place bien le profil dans
 * « Sharp » (seuil 680), et il manque bien 48 points pour « Magnetic » (790).
 * La jauge est remplie à (742−680)/(790−680), pas à une valeur décorative.
 */

const HITS_A = [
	{at: 0, amplitude: 14, duration: 7, seed: 'sh1'},
	{at: 50, amplitude: 22, duration: 9, seed: 'sh2', rotation: 1.2},
];
const HITS_B = [
	{at: 0, amplitude: 30, duration: 11, seed: 'sh3', rotation: 2},
	{at: 30, amplitude: 10, duration: 6, seed: 'sh4'},
	{at: 58, amplitude: 8, duration: 5, seed: 'sh5'},
];
const HITS_C = [
	{at: 4, amplitude: 16, duration: 7, seed: 'sh6'},
	{at: 44, amplitude: 20, duration: 8, seed: 'sh7', rotation: 1.2},
];

/**
 * Le rouleau court **pendant** la montée, l'impact tombe **sur** l'arrêt.
 *
 * Les deux sons ne se recouvrent pas : le tick s'éteint au moment où le
 * compteur se verrouille, et c'est ce silence d'un dixième de seconde qui rend
 * l'impact aussi net.
 */
const SFX_A = [cue(0, 'countUpTick'), cue(50, 'impactThud')];
const SFX_B = [
	cue(0, 'countUpTick', 0.32),
	cue(0, 'clickMechanic', 0.3),
	cue(24, 'impactThud'),
	cue(30, 'beep', 0.3),
];
const SFX_C = [cue(2, 'clickMechanic', 0.3), cue(44, 'impactThud', 0.42), cue(60, 'softSwipe')];

/** Le punch tombe sur le verrouillage du chiffre, pas sur son départ. */
const PUNCH_B = [{at: 24, to: 1.22, rise: 5}];
const PUNCH_C = [
	{at: 44, to: 1.16, rise: 5},
	{at: 60, to: 0.9, rise: 10, hold: true},
];

const RingBlock: React.FC<{score: number}> = ({score}) => {
	const idle = useIdle({float: 6, breathe: 0.008, speed: 0.1});
	return (
		<div
			style={{
				transform: `translateY(${idle.y.toFixed(2)}px) scale(${idle.scale.toFixed(4)})`,
			}}
		>
			<ScoreRing score={score} at={0} size={520} />
		</div>
	);
};

export const ScoreHero: React.FC<ScoreHeroProps> = ({
	score,
	tier,
	tierMeaning,
	nextTier,
	pointsToNext,
}) => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		{/* ── BATTEMENT 1 · le chiffre ──────────────────────────────────── */}
		<Sequence durationInFrames={78} layout="none">
			<SfxTrack cues={SFX_A} />
			<Impact hits={HITS_A}>
				<BlinkStage glow={blink.skyBright} glowStrength={0.5} glowY={0.44}>
					<div style={{position: 'relative'}}>
						<RingBlock score={score} />
						<Shockwave at={50} count={3} step={8} size={1700} color={blink.skyBright} />
						<Sparks at={50} count={34} spread={700} life={26} color={blink.sky} color2={blink.skyBright} />
					</div>

					<AbsoluteFill
						style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 280}}
					>
						<Pop at={4} spring="kick" preset="hardUp">
							<div
								style={{
									fontFamily: fonts.text,
									fontSize: 34,
									fontWeight: 700,
									letterSpacing: '0.2em',
									color: blink.gray,
								}}
							>
								SCORE BLINK
							</div>
						</Pop>
					</AbsoluteFill>

					<Cadence every={15} color={blink.sky} strength={0.5} />
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · le palier ───────────────────────────────────── */}
		<Sequence from={78} durationInFrames={80} layout="none">
			<SfxTrack cues={SFX_B} />
			<Impact hits={HITS_B} punches={PUNCH_B}>
				<BlinkStage glow={blink.sky} glowStrength={0.42} glowY={0.4}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 30,
							width: '100%',
						}}
					>
						<Pop at={0} spring="kick" preset="hardDown">
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 150,
									fontWeight: 800,
									letterSpacing: '-0.05em',
									color: blink.white,
									fontVariantNumeric: 'tabular-nums',
								}}
							>
								{/* Ressort et non courbe : le chiffre dépasse légèrement puis revient se
											    poser sur 742. Une courbe s'arrêterait net, ce qui se lit comme
											    un affichage ; le dépassement se lit comme un verrouillage. */}
											<Counter from={0} to={score} timing={{spring: 'kick', durationInFrames: 26}} />
							</div>
						</Pop>

						<Pop at={0} spring="stamp" preset="stampIn" shadow squash={0.9}>
							<div
								style={{
									padding: '26px 62px',
									borderRadius: 999,
									background: `linear-gradient(120deg, ${blink.skyBright}, ${blink.sky})`,
									color: blink.navy,
									fontFamily: fonts.display,
									fontSize: 86,
									fontWeight: 800,
									letterSpacing: '-0.035em',
									textTransform: 'uppercase',
								}}
							>
								{tier}
							</div>
						</Pop>

						<Pop at={30} spring="kick" preset="hardUp">
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 52,
									fontWeight: 600,
									letterSpacing: '-0.03em',
									color: blink.white,
									textAlign: 'center',
								}}
							>
								{tierMeaning}
							</div>
						</Pop>
					</div>

					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<Shockwave at={0} count={3} step={9} size={1800} color={blink.sky} thickness={5} />
					</AbsoluteFill>
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · la marche suivante ──────────────────────────── */}
		<Sequence from={158} layout="none">
			<SfxTrack cues={SFX_C} />
			<Impact hits={HITS_C} punches={PUNCH_C}>
				<BlinkStage glow={pop.flare} glowStrength={0.26} glowY={0.5}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 36,
							width: '100%',
						}}
					>
						<Pop at={0} spring="kick" preset="hardDown">
							<TierLadder
								at={2}
								steps={tiers.map((t) => ({label: t.label, reached: t.min <= score}))}
								current={tiers.findIndex((t) => t.label === tier)}
								width={720}
								color={blink.sky}
								fontFamily={fonts.text}
								step={4}
							/>
						</Pop>

						<Pop at={44} spring="stamp" preset="slamIn" squash={1.2} style={{width: '100%'}}>
							<div style={{width: '100%'}}>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										fontFamily: fonts.text,
										fontSize: 28,
										fontWeight: 700,
										color: pop.flare,
										marginBottom: 14,
									}}
								>
									<span>{tier}</span>
									<span>
										{pointsToNext} points avant {nextTier}
									</span>
								</div>
								<Gauge
									to={DEMO.tierProgress}
									timing={{delay: 48, duration: 32, easing: 'expo'}}
									height={16}
									color={pop.flare}
								/>
							</div>
						</Pop>
					</div>

					<Cadence every={15} offset={7} color={pop.flare} strength={0.5} />
				</BlinkStage>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
