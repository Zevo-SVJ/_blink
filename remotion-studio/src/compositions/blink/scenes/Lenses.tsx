import {z} from 'zod';
import {zColor} from '@remotion/zod-types';
import {BlinkStage, LensCard} from '@/components/blink';
import {blink, lenses as brandLenses} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {Impact, Pop, TrimPath} from '@/motion/kinetic';
import {Shockwave} from '@/components/kinetic';
import {SplitText} from '@/motion/SplitText';

export const lensesSchema = z.object({
	title: z.string(),
	closing: z.string(),
	verdicts: z.array(
		z.object({
			label: z.string(),
			verdict: z.string(),
			color: zColor(),
		}),
	),
});

export type LensesProps = z.infer<typeof lensesSchema>;

export const lensesDefaults: LensesProps = {
	title: 'Quatre regards.',
	closing: 'Un seul profil.',
	verdicts: [
		{label: brandLenses[0].label, verdict: 'intriguant, pas disponible', color: brandLenses[0].color},
		{label: brandLenses[1].label, verdict: 'soigné, un peu distant', color: brandLenses[1].color},
		{label: brandLenses[2].label, verdict: 'c’est bien toi', color: brandLenses[2].color},
		{label: brandLenses[3].label, verdict: 'sérieux, mais flou', color: brandLenses[3].color},
	],
};

/**
 * SCÈNE 3 — LES QUATRE REGARDS  ·  12 temps (360 frames)
 *
 * Le cœur du produit : la même capture, lue par quatre personnes différentes.
 *
 * Partition :
 *   f000  le titre monte mot à mot, cascade de 3 f
 *   f016  le soulignement se dessine sous le dernier mot
 *   f024  ▮ lentille 1 — arrive par la droite
 *   f048  ▮ lentille 2 — par la gauche
 *   f072  ▮ lentille 3 — par la droite
 *   f096  ▮ lentille 4 — par la gauche
 *   f140  respiration : les quatre cartes flottent, déphasées
 *   f180  une coche valide la lentille mise en avant
 *   f210  la chute de phrase
 *   f270  sortie en cascade, dans l'ordre d'arrivée
 *
 * L'alternance gauche/droite des arrivées est délibérée : elle entretient un
 * balancement latéral qui prépare le filé de la transition précédente et
 * empêche la répétition de quatre cartes identiques de devenir mécanique.
 */

const HITS = [
	{at: 24, amplitude: 9, duration: 6, seed: 'l1'},
	{at: 48, amplitude: 9, duration: 6, seed: 'l2'},
	{at: 72, amplitude: 9, duration: 6, seed: 'l3'},
	{at: 96, amplitude: 13, duration: 7, seed: 'l4'},
	{at: 210, amplitude: 18, duration: 8, seed: 'l5', rotation: 1.2},
];

const UNDERLINE = 'M4 16 C 90 4, 250 4, 336 14';

export const Lenses: React.FC<LensesProps> = ({title, closing, verdicts}) => (
	<Impact hits={HITS}>
		<BlinkStage glow={blink.skyBright} glowStrength={0.26} glowY={0.3} justify="center">
			{/* Onde sur la chute de phrase : le dernier mot propage quelque chose. */}
			<div
				style={{
					position: 'absolute',
					left: '50%',
					top: '68%',
					width: 0,
					height: 0,
				}}
			>
				<Shockwave at={210} count={2} step={11} size={1500} color={blink.sky} thickness={3} />
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					gap: 40,
				}}
			>
				<div style={{position: 'relative', alignSelf: 'flex-start'}}>
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 84,
							fontWeight: 800,
							letterSpacing: '-0.045em',
							lineHeight: 1,
						}}
					>
						<SplitText
							text={title}
							by="word"
							preset="riseUp"
							step={STAGGER.marked}
							timing={{delay: 0, spring: 'pop'}}
						/>
					</div>

					<TrimPath
						d={UNDERLINE}
						width={340}
						height={22}
						timing={{delay: 16, duration: 16, easing: 'expo'}}
						color={blink.skyBright}
						strokeWidth={9}
						style={{marginTop: 2}}
					/>
				</div>

				<div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
					{verdicts.map((lens, index) => (
						<LensCard
							key={lens.label}
							label={lens.label}
							verdict={lens.verdict}
							color={lens.color}
							at={24 + index * 24}
							preset={index % 2 === 0 ? 'flyRight' : 'flyLeft'}
							index={index}
							out={286 + index * STAGGER.base}
							highlightAt={index === 3 ? 180 : undefined}
						/>
					))}
				</div>

				<Pop
					at={210}
					spring="textPop"
					preset="slamIn"
					out={298}
					exit="liftOut"
					style={{alignSelf: 'flex-end'}}
				>
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 76,
							fontWeight: 800,
							letterSpacing: '-0.045em',
							color: blink.sky,
							textShadow: '0 20px 50px rgba(0,6,20,0.6)',
						}}
					>
						{closing}
					</div>
				</Pop>
			</div>
		</BlinkStage>
	</Impact>
);
