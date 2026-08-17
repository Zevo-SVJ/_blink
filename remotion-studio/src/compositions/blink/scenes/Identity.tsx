import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {BlinkStage} from '@/components/blink';
import {ArrowMark, IdCard} from '@/components/kinetic';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';
import {Impact, Pop} from '@/motion/kinetic';

export const identitySchema = z.object({
	kicker: z.string(),
	line: z.string(),
	handle: z.string(),
	fragments: z.array(z.object({label: z.string(), value: z.string()})),
	note: z.string(),
});

export type IdentityProps = z.infer<typeof identitySchema>;

export const identityDefaults: IdentityProps = {
	kicker: 'ce qu’ils ont de toi',
	line: 'Neuf images, une bio.',
	handle: '@toi',
	fragments: [
		{label: 'images', value: '9'},
		{label: 'bio', value: '112 signes'},
		{label: 'lu en', value: '2 s'},
	],
	note: 'C’est tout.',
};

/**
 * SCÈNE 4 — IDENTITÉ  ·  8 temps (240 frames)
 *
 * Une carte d'identité flottante, inclinée dans l'espace. Objet, pas écran :
 * la métaphore de « ce qu'ils ont de toi » tient littéralement sur un
 * rectangle qu'on peut prendre en main.
 *
 * La carte pivote lentement pendant tout le plan — c'est ce qui lui donne son
 * épaisseur. Une flèche dessinée à la main entre ensuite pour pointer la
 * mention « lu en 2 s » : l'annotation informelle casse le côté trop propre de
 * la composition et dirige le regard là où le récit en a besoin.
 *
 * Partition :
 *   f000  la carte arrive de la gauche, ressort lourd, ombre dérivée
 *   f010  la phrase se pose au-dessus
 *   f070  ▮ la carte se redresse d'un cran, secousse
 *   f096  la flèche se dessine, corps puis pointe
 *   f120  « C'est tout. » — la chute, en plus gros
 *   f200  la carte s'échappe par la droite
 */

const HITS = [
	{at: 8, amplitude: 13, duration: 7, seed: 'i1'},
	{at: 70, amplitude: 10, duration: 6, seed: 'i2'},
	{at: 120, amplitude: 18, duration: 8, seed: 'i3'},
];

export const Identity: React.FC<IdentityProps> = ({
	kicker,
	line,
	handle,
	fragments,
	note,
}) => (
	<Impact hits={HITS}>
		<BlinkStage
			background={blink.navy2}
			glow={blink.sky}
			glowStrength={0.24}
			glowY={0.46}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					width: '100%',
					gap: 30,
				}}
			>
				<Pop at={4} spring="popSoft" preset="riseUp" out={196} exit="liftOut">
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

				<Pop at={10} spring="textPop" preset="riseUp" out={198} exit="liftOut">
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 78,
							fontWeight: 800,
							letterSpacing: '-0.045em',
							lineHeight: 1.02,
							color: blink.white,
						}}
					>
						{line}
					</div>
				</Pop>

				{/* La carte : objet lourd, entrée latérale, redressement au temps 2,3. */}
				<Pop
					at={0}
					spring="heavy"
					preset="flyRight"
					squash={0.7}
					shadow
					out={200}
					exit="flyOutRight"
					outDuration={18}
					style={{alignSelf: 'center', marginTop: 10}}
				>
					<Straighten at={70}>
						<IdCard
							handle={handle}
							fields={fragments}
							accent={blink.skyBright}
							width={680}
							tilt={-16}
							fontFamily={fonts.display}
						/>
					</Straighten>
				</Pop>

				<Pop at={120} spring="slam" preset="slamIn" out={202} exit="crush">
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 96,
							fontWeight: 800,
							letterSpacing: '-0.05em',
							color: blink.sky,
							textShadow: '0 22px 56px rgba(0,6,20,0.75)',
							alignSelf: 'flex-start',
						}}
					>
						{note}
					</div>
				</Pop>
			</div>

			{/* Annotation manuscrite : elle pointe la donnée qui compte. */}
			<AbsoluteFill style={{pointerEvents: 'none'}}>
				{/* La pointe visée : la mention « lu en 2 s », en bas de la carte. */}
				<ArrowMark
					at={96}
					width={250}
					color={blink.warning}
					style={{left: 190, top: 1046}}
				/>
			</AbsoluteFill>
		</BlinkStage>
	</Impact>
);

/**
 * Redresse la carte d'un cran.
 *
 * Séparé du `<Pop>` d'entrée pour la même raison que la convergence des
 * regards en scène 1 : deux intentions distinctes ne doivent pas partager un
 * seul transform, sinon l'une écrase l'autre.
 */
const Straighten: React.FC<{at: number; children: React.ReactNode}> = ({
	at,
	children,
}) => {
	const progress = useProgress({delay: at, spring: 'gentle'});
	return (
		<div
			style={{
				transform: `perspective(2000px) rotateY(${(progress * 11).toFixed(2)}deg) scale(${(1 + progress * 0.04).toFixed(4)})`,
			}}
		>
			{children}
		</div>
	);
};

