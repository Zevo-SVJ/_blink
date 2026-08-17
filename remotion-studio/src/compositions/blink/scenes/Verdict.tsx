import {z} from 'zod';
import {BlinkStage, ScoreRing} from '@/components/blink';
import {ArrowRight} from '@/components/Icons';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';
import {Gauge, Impact, Pop} from '@/motion/kinetic';
import {DEMO} from '../manifest';

export const verdictSchema = z.object({
	score: z.number(),
	tier: z.string(),
	tierMeaning: z.string(),
	nextTier: z.string(),
	pointsToNext: z.number(),
	wordmark: z.string(),
	baseline: z.string(),
	cta: z.string(),
});

export type VerdictProps = z.infer<typeof verdictSchema>;

export const verdictDefaults: VerdictProps = {
	score: DEMO.score,
	tier: DEMO.tier,
	tierMeaning: 'Tout tire dans le même sens.',
	nextTier: DEMO.nextTier,
	pointsToNext: DEMO.pointsToNext,
	wordmark: 'blink',
	baseline: 'vois-toi comme les autres te voient',
	cta: 'Analyser mon profil',
};

/**
 * SCÈNE 4 — VERDICT  ·  10 temps (300 frames)
 *
 * La retombée. Le score se dessine, le palier s'abat, l'appel à l'action reste.
 *
 * Partition :
 *   f000  l'anneau se trace et le compteur monte, sur la même progression
 *   f060  ▮ le palier tombe — `stampIn`, ressort `slam`, la plus forte secousse
 *   f078  ce que le palier signifie
 *   f102  la marche restante vers le palier suivant
 *   f150  la marque
 *   f168  la baseline
 *   f192  l'appel à l'action
 *   f240  une pulsation unique de l'appel à l'action — la dernière micro-vie
 *
 * Le score et le palier ne sont pas décoratifs : 742 place bien le profil dans
 * « Sharp » (seuil 680) et il manque bien 48 points pour « Magnetic » (790).
 * Les chiffres montrés à l'écran doivent rester vrais.
 */

const HITS = [
	{at: 60, amplitude: 30, duration: 11, seed: 'v1', rotation: 1.8},
	{at: 150, amplitude: 10, duration: 6, seed: 'v2'},
	{at: 240, amplitude: 7, duration: 5, seed: 'v3'},
];

/** Pulsation unique de l'appel à l'action : la scène ne meurt jamais tout à fait. */
const useCtaPulse = (): number => {
	const grow = useProgress({delay: 240, duration: 7, easing: 'expo'});
	const settle = useProgress({delay: 247, spring: 'pop'});
	return 1 + grow * 0.06 - settle * 0.06;
};

export const Verdict: React.FC<VerdictProps> = ({
	score,
	tier,
	tierMeaning,
	nextTier,
	pointsToNext,
	wordmark,
	baseline,
	cta,
}) => {
	const pulse = useCtaPulse();

	return (
		<Impact hits={HITS}>
			<BlinkStage glow={blink.skyBright} glowStrength={0.4} glowY={0.36}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 34,
						width: '100%',
					}}
				>
					{/* Démarré à la frame 0 : le rideau de la transition découvre un
					    cadran déjà en train de se remplir, pas un écran vide. */}
					<Pop at={0} spring="popTight" preset="popIn">
						<ScoreRing score={score} at={0} size={440} />
					</Pop>

					{/* Le palier s'abat : arrivée de très grand, rotation résiduelle,
					    ombre dérivée de la vitesse. C'est l'impact le plus fort. */}
					<Pop at={60} spring="slam" preset="stampIn" shadow squash={0.9}>
						<div
							style={{
								padding: '20px 48px',
								borderRadius: 999,
								background: `linear-gradient(120deg, ${blink.skyBright}, ${blink.sky})`,
								color: blink.navy,
								fontFamily: fonts.display,
								fontSize: 62,
								fontWeight: 800,
								letterSpacing: '-0.03em',
								textTransform: 'uppercase',
							}}
						>
							{tier}
						</div>
					</Pop>

					<Pop at={78} spring="popTight" preset="riseUp">
						<div
							style={{
								fontFamily: fonts.display,
								fontSize: 44,
								fontWeight: 600,
								letterSpacing: '-0.03em',
								color: blink.white,
								textAlign: 'center',
							}}
						>
							{tierMeaning}
						</div>
					</Pop>

					<Pop at={102} spring="popSoft" preset="riseUp" style={{width: '100%'}}>
						<div style={{width: '100%'}}>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									fontFamily: fonts.text,
									fontSize: 22,
									fontWeight: 600,
									color: blink.gray,
									marginBottom: 12,
								}}
							>
								<span>{tier}</span>
								<span>
									{pointsToNext} points avant {nextTier}
								</span>
							</div>
							<Gauge
								to={0.56}
								timing={{delay: 108, duration: 40, easing: 'expo'}}
								height={12}
								color={blink.sky}
							/>
						</div>
					</Pop>

					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 10,
							marginTop: 18,
						}}
					>
						<Pop at={150} spring="pop" preset="popIn" squash={1} shadow>
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 96,
									fontWeight: 800,
									letterSpacing: '-0.06em',
									color: blink.white,
								}}
							>
								{wordmark}
							</div>
						</Pop>

						<Pop at={168} spring="popSoft" preset="riseUp">
							<div
								style={{
									fontFamily: fonts.text,
									fontSize: 30,
									fontWeight: 500,
									letterSpacing: '-0.01em',
									color: blink.gray,
								}}
							>
								{baseline}
							</div>
						</Pop>
					</div>

					<Pop at={192} spring="pop" preset="popTilt" tilt={-2} shadow index={7}>
						<div style={{transform: `scale(${pulse.toFixed(4)})`}}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 16,
									padding: '26px 46px',
									borderRadius: 999,
									background: blink.white,
									color: blink.navy,
									fontFamily: fonts.display,
									fontSize: 34,
									fontWeight: 700,
									letterSpacing: '-0.02em',
								}}
							>
								{cta}
								<ArrowRight color={blink.navy} size={30} />
							</div>
						</div>
					</Pop>
				</div>
			</BlinkStage>
		</Impact>
	);
};
