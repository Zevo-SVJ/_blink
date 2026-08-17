import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {BlinkStage} from '@/components/blink';
import {ArrowMark, TierLadder, Toast} from '@/components/kinetic';
import {blink, tiers} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {Counter, Impact, Pop} from '@/motion/kinetic';
import {DEMO} from '../manifest';

export const climbSchema = z.object({
	kicker: z.string(),
	points: z.number(),
	nextTier: z.string(),
	line: z.string(),
	levers: z.array(z.string()),
});

export type ClimbProps = z.infer<typeof climbSchema>;

export const climbDefaults: ClimbProps = {
	kicker: 'la marche suivante',
	points: DEMO.pointsToNext,
	nextTier: DEMO.nextTier,
	line: 'Blink te dit lesquels.',
	levers: ['recadrer 3 images', 'resserrer la bio'],
};

/**
 * SCÈNE 12 — L'ASCENSION  ·  7 temps (210 frames)
 *
 * Le seul plan de la vidéo qui parle du futur. L'échelle des six paliers se
 * construit marche par marche, de la plus basse à la plus haute ; un marqueur
 * grimpe et **s'arrête sous la marche suivante**.
 *
 * L'arrêt est tout le message : il reste quelque chose à faire, et c'est
 * mesurable. Une échelle entièrement gravie n'aurait rien à vendre.
 *
 * Les deux notifications qui suivent nomment les leviers concrets — ce sont
 * elles qui transforment un constat en action.
 *
 * Partition :
 *   f000  l'échelle se construit, cascade de 4 f par marche
 *   f040  le marqueur grimpe et s'arrête
 *   f054  ▮ le compte de points, en très gros
 *   f090  première notification de levier, par la droite
 *   f108  seconde notification
 *   f132  la flèche manuscrite pointe la marche à atteindre
 *   f150  la phrase de clôture
 *   f180  tout se retire
 */

const HITS = [
	{at: 8, amplitude: 8, duration: 5, seed: 'cl1'},
	{at: 54, amplitude: 20, duration: 8, seed: 'cl2', rotation: 1.2},
	{at: 132, amplitude: 10, duration: 6, seed: 'cl3'},
];

/** Index du palier courant dans l'échelle — dérivé, jamais écrit en dur. */
const CURRENT_INDEX = tiers.findIndex((tier) => tier.label === DEMO.tier);

export const Climb: React.FC<ClimbProps> = ({
	kicker,
	points,
	nextTier,
	line,
	levers,
}) => (
	<Impact hits={HITS}>
		<BlinkStage
			background={blink.navy2}
			glow={blink.skyBright}
			glowStrength={0.3}
			glowY={0.56}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					width: '100%',
					gap: 26,
				}}
			>
				<Pop at={0} spring="popSoft" preset="riseUp" out={180} exit="liftOut">
					<div
						style={{
							fontFamily: fonts.text,
							fontSize: 26,
							fontWeight: 700,
							letterSpacing: '0.2em',
							textTransform: 'uppercase',
							color: blink.sky,
						}}
					>
						{kicker}
					</div>
				</Pop>

				{/* Le compte de points : le chiffre monte, l'unité reste fixe. */}
				{/* Pas de `shadow` sur du texte nu : l'élévation se sérialise en
					    `box-shadow` et dessinerait un rectangle autour des glyphes. */}
					<Pop at={54} spring="slam" preset="stampIn" out={182} exit="crush">
					<div
						style={{
							display: 'flex',
							alignItems: 'baseline',
							gap: 18,
							fontFamily: fonts.display,
							color: blink.white,
						}}
					>
						<span
							style={{
								fontSize: 150,
								fontWeight: 800,
								letterSpacing: '-0.06em',
								textShadow: '0 22px 60px rgba(0,6,20,0.8)',
							}}
						>
							<Counter
								to={points}
								timing={{delay: 56, duration: 26, easing: 'expo'}}
								pad={false}
							/>
						</span>
						<span
							style={{
								fontSize: 42,
								fontWeight: 700,
								letterSpacing: '-0.02em',
								color: blink.sky,
							}}
						>
							points avant {nextTier}
						</span>
					</div>
				</Pop>

				<Pop at={2} spring="popTight" preset="riseUp" out={178} exit="squashOut">
					<div style={{paddingBottom: 56}}>
						<TierLadder
							at={6}
							steps={tiers.map((tier) => ({
								label: tier.label,
								reached: tier.min <= DEMO.score,
							}))}
							current={CURRENT_INDEX}
							width={880}
							color={blink.skyBright}
							fontFamily={fonts.text}
							step={STAGGER.wide}
						/>
					</div>
				</Pop>

				<Pop at={150} spring="textPop" preset="riseUp" out={184} exit="crush">
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 62,
							fontWeight: 800,
							letterSpacing: '-0.04em',
							color: blink.white,
							textAlign: 'center',
							marginTop: 14,
						}}
					>
						{line}
					</div>
				</Pop>
			</div>

			{/* Les leviers concrets, en marge — ils commentent l'échelle. */}
			<AbsoluteFill
				style={{
					alignItems: 'flex-end',
					justifyContent: 'flex-start',
					paddingTop: 300,
					paddingRight: 24,
				}}
			>
				<div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
					{levers.map((lever, index) => (
						<Pop
							key={lever}
							at={90 + index * 18}
							spring="popTight"
							preset="flyLeft"
							tilt
							index={index + 5}
							shadow
							out={176 + index * STAGGER.base}
							exit="flyOutRight"
						>
							<Toast accent={blink.success} fontFamily={fonts.text}>
								{lever}
							</Toast>
						</Pop>
					))}
				</div>
			</AbsoluteFill>

			<AbsoluteFill style={{pointerEvents: 'none'}}>
				<ArrowMark
					at={132}
					width={230}
					color={blink.warning}
					style={{left: 700, top: 1230}}
				/>
			</AbsoluteFill>
		</BlinkStage>
	</Impact>
);
