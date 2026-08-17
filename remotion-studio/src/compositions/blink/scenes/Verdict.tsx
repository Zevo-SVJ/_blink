import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {BlinkStage, ScoreRing} from '@/components/blink';
import {Shockwave} from '@/components/kinetic';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';
import {Gauge, Impact, Pop} from '@/motion/kinetic';
import {useIdle} from '@/motion/kinetic/idle';
import {DEMO} from '../manifest';

export const verdictSchema = z.object({
	score: z.number(),
	tier: z.string(),
	tierMeaning: z.string(),
	nextTier: z.string(),
	pointsToNext: z.number(),
});

export type VerdictProps = z.infer<typeof verdictSchema>;

export const verdictDefaults: VerdictProps = {
	score: DEMO.score,
	tier: DEMO.tier,
	tierMeaning: 'Tout tire dans le même sens.',
	nextTier: DEMO.nextTier,
	pointsToNext: DEMO.pointsToNext,
};

/**
 * SCÈNE 11 — VERDICT  ·  9 temps (270 frames)
 *
 * Le sommet du film. Ce plan ne porte plus qu'**une seule chose** : le
 * résultat. La marque, la baseline et l'appel à l'action ont migré vers la
 * scène de clôture — les entasser ici diluait le seul moment que le spectateur
 * attend depuis quarante secondes.
 *
 * Le tampon du palier reçoit la secousse la plus forte de toute la vidéo (30 px
 * sur 11 frames) et une onde concentrique. C'est le pic d'intensité, et il ne
 * doit y en avoir qu'un.
 *
 * Partition :
 *   f000  l'anneau se trace et le compteur monte, sur la même progression
 *   f060  ▮▮ le palier s'abat — `stampIn`, ressort `slam`, onde + secousse max
 *   f078  ce que le palier signifie
 *   f114  la marche restante vers le palier suivant
 *   f168  une pulsation unique
 *   f206  tout recule d'un cran — le plan est encore en mouvement quand le
 *         rideau de la transition suivante commence à monter (f236). Sans ce
 *         recul, les quarante dernières frames étaient parfaitement immobiles.
 *
 * Les chiffres restent vrais : 742 place bien le profil dans « Sharp »
 * (seuil 680) et il manque bien 48 points pour « Magnetic » (790). La jauge est
 * remplie à (742−680)/(790−680), pas à une valeur décorative.
 */

const HITS = [
	{at: 60, amplitude: 30, duration: 11, seed: 'v1', rotation: 1.8},
	{at: 114, amplitude: 10, duration: 6, seed: 'v2'},
	{at: 168, amplitude: 7, duration: 5, seed: 'v3'},
	{at: 208, amplitude: 9, duration: 6, seed: 'v4'},
];

/** Pulsation unique du bloc de progression. */
const usePulse = (): number => {
	const grow = useProgress({delay: 168, duration: 7, easing: 'expo'});
	const settle = useProgress({delay: 175, spring: 'pop'});
	return 1 + grow * 0.05 - settle * 0.05;
};

export const Verdict: React.FC<VerdictProps> = ({
	score,
	tier,
	tierMeaning,
	nextTier,
	pointsToNext,
}) => {
	const pulse = usePulse();
	const ringIdle = useIdle({float: 5, breathe: 0.008, speed: 0.1});

	return (
		<Impact hits={HITS}>
			<BlinkStage glow={blink.skyBright} glowStrength={0.44} glowY={0.38}>
				{/* Onde du tampon : elle part du centre du cadran. */}
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
					<div style={{position: 'relative', top: -120}}>
						<Shockwave at={60} count={3} step={9} size={1600} color={blink.skyBright} />
					</div>
				</AbsoluteFill>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 42,
						width: '100%',
					}}
				>
					{/* Démarré à la frame 0 : le zoom traversant découvre un cadran déjà
					    en train de se remplir, pas un écran vide. */}
					<Pop at={0} spring="ui" preset="popIn" out={206} exit="recede" outDuration={20}>
						<div
							style={{
								transform: `translateY(${ringIdle.y.toFixed(2)}px) scale(${ringIdle.scale.toFixed(4)})`,
							}}
						>
							<ScoreRing score={score} at={0} size={470} />
						</div>
					</Pop>

					{/* Le palier s'abat : arrivée de très grand, rotation résiduelle,
					    ombre dérivée de la vitesse. Le pic d'intensité du film. */}
					<Pop at={60} spring="slam" preset="stampIn" shadow squash={0.9} out={210} exit="liftOut" outDuration={18}>
						<div
							style={{
								padding: '24px 56px',
								borderRadius: 999,
								background: `linear-gradient(120deg, ${blink.skyBright}, ${blink.sky})`,
								color: blink.navy,
								fontFamily: fonts.display,
								fontSize: 74,
								fontWeight: 800,
								letterSpacing: '-0.035em',
								textTransform: 'uppercase',
							}}
						>
							{tier}
						</div>
					</Pop>

					<Pop at={78} spring="ui" preset="riseUp" out={208} exit="crush" outDuration={16}>
						<div
							style={{
								fontFamily: fonts.display,
								fontSize: 50,
								fontWeight: 600,
								letterSpacing: '-0.03em',
								color: blink.white,
								textAlign: 'center',
								maxWidth: 800,
							}}
						>
							{tierMeaning}
						</div>
					</Pop>

					<Pop
						at={114}
						spring="ui"
						preset="riseUp"
						out={212}
						exit="crush"
						outDuration={16}
						style={{width: '100%', marginTop: 20}}
					>
						<div style={{width: '100%', transform: `scale(${pulse.toFixed(4)})`}}>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									fontFamily: fonts.text,
									fontSize: 24,
									fontWeight: 600,
									color: blink.gray,
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
								timing={{delay: 120, duration: 44, easing: 'expo'}}
								height={14}
								color={blink.sky}
							/>
						</div>
					</Pop>
				</div>
			</BlinkStage>
		</Impact>
	);
};
