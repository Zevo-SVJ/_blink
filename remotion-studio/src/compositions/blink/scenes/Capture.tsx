import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {BlinkStage, Portal, ProfileCard} from '@/components/blink';
import {ScanFrame, Toast} from '@/components/kinetic';
import {LightSweep} from '@/components/LightSweep';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {useProgress} from '@/motion/frame';
import {Burst, Cursor, Gauge, Impact, Pop} from '@/motion/kinetic';

export const captureSchema = z.object({
	handle: z.string(),
	caption: z.string(),
	analysing: z.string(),
	criteria: z.array(z.string()),
});

export type CaptureProps = z.infer<typeof captureSchema>;

export const captureDefaults: CaptureProps = {
	handle: '@toi',
	caption: 'une capture. rien d’autre.',
	analysing: 'LECTURE EN COURS',
	criteria: ['cadrage', 'palette', 'bio', 'cohérence'],
};

/**
 * SCÈNE 2 — CAPTURE  ·  10 temps (300 frames)
 *
 * Le geste produit. On dépose une capture, on clique, Blink lit.
 *
 * Le clic est la chorégraphie cause → effet la plus détaillée de la Phase 1,
 * re-timée sur la grille de frames (l'analyse de référence donne des temps forts
 * espacés de 10 ms, indiscernables à 60 fps) :
 *
 *   f060  le curseur entre, trajectoire en arc, décélération forte
 *   f084  ▮ contact
 *   f084  la carte s'écrase — 2 frames, scaleY 0,82 / scaleX 1,14
 *   f088  éclats radiaux + secousse
 *   f096  le scan traverse la carte
 *   f096  le cadre de scan se déploie autour de la carte — viseur, pas bordure
 *   f120  la jauge démarre, les critères s'allument en cascade
 *   f186  une notification annonce ce qui a été lu
 *   f240  tout se retire
 *   f246  le portail s'ouvre : on plonge dans le scan vers la scène suivante
 */

const HITS = [
	{at: 6, amplitude: 12, duration: 6, seed: 'c1'},
	{at: 88, amplitude: 22, duration: 9, seed: 'c2', rotation: 1.4},
	{at: 186, amplitude: 9, duration: 6, seed: 'c3'},
	{at: 240, amplitude: 12, duration: 6, seed: 'c4'},
];

const CLICK_FRAME = 84;

/**
 * Écrasement au clic.
 *
 * Volontairement écrit à la main plutôt que dérivé de la vitesse : il s'agit
 * ici d'un impact **subi** — la carte ne bouge pas, c'est le curseur qui la
 * frappe. Le squash dérivé de la vitesse ne s'applique qu'aux objets en
 * mouvement propre.
 */
const useClickSquash = (): {scaleX: number; scaleY: number} => {
	const impact = useProgress({delay: CLICK_FRAME, duration: 2, easing: 'quint'});
	const release = useProgress({delay: CLICK_FRAME + 2, duration: 7, easing: 'expo'});
	const amount = impact * (1 - release);

	return {
		scaleY: 1 - amount * 0.18,
		scaleX: 1 + amount * 0.14,
	};
};

const ScanLine: React.FC = () => {
	const progress = useProgress({delay: 96, duration: 34, easing: 'standard'});
	if (progress <= 0 || progress >= 1) return null;

	return (
		<div
			style={{
				position: 'absolute',
				left: -20,
				right: -20,
				top: `${(progress * 100).toFixed(2)}%`,
				height: 6,
				background: `linear-gradient(90deg, transparent, ${blink.sky}, transparent)`,
				boxShadow: `0 0 40px 10px ${blink.skyBright}88`,
			}}
		/>
	);
};

export const Capture: React.FC<CaptureProps> = ({
	handle,
	caption,
	analysing,
	criteria,
}) => {
	const squash = useClickSquash();
	const flash = useProgress({delay: 0, duration: 10, easing: 'expo'});

	return (
		<Impact hits={HITS}>
			<BlinkStage
				background={blink.navy2}
				glow={blink.sky}
				glowStrength={0.22}
				glowY={0.34}
			>
				{/* Rémanence du portail traversé : la scène s'ouvre encore éblouie,
				    et l'éblouissement se dissipe en un tiers de temps. */}
				<AbsoluteFill
					style={{
						background: `radial-gradient(circle at 50% 44%, ${blink.sky}, transparent 65%)`,
						opacity: Math.max(0, 1 - flash) * 0.55,
						pointerEvents: 'none',
					}}
				/>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 44,
						width: '100%',
					}}
				>
					<Pop at={0} spring="popSoft" preset="riseUp" out={238} exit="liftOut">
						<div
							style={{
								fontFamily: fonts.text,
								fontSize: 28,
								fontWeight: 600,
								letterSpacing: '0.16em',
								textTransform: 'uppercase',
								color: blink.sky,
							}}
						>
							{caption}
						</div>
					</Pop>

					{/* La carte tombe, s'écrase à l'atterrissage (squash dérivé de sa
					    propre vitesse), puis subit l'écrasement du clic. */}
					<Pop
						at={0}
						spring="pop"
						preset="dropIn"
						squash={1.5}
						shadow
						out={240}
						exit="squashOut"
						outDuration={16}
					>
						<div
							style={{
								position: 'relative',
								transform: `scale(${squash.scaleX.toFixed(4)}, ${squash.scaleY.toFixed(4)})`,
								transformOrigin: '50% 100%',
							}}
						>
							<ProfileCard at={2} tilesAt={10} handle={handle} width={760} />

							<div style={{position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 44}}>
								<ScanLine />
							</div>
							<LightSweep timing={{delay: 96, duration: 40}} radius={44} opacity={0.4} />

							{/* Viseur : quatre équerres, pas un cadre. Il dit « on mesure ». */}
							<div style={{position: 'absolute', inset: -30}}>
								<ScanFrame at={96} height={700} color={blink.sky} corner={52} />
							</div>

							{/* Les éclats partent du point de contact. */}
							<Burst at={88} count={7} radius={300} color={blink.sky} length={54} />
						</div>
					</Pop>

					<Pop at={120} spring="popTight" preset="riseUp" out={236} exit="crush">
						<div style={{width: 700}}>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'baseline',
									marginBottom: 16,
								}}
							>
								<span
									style={{
										fontFamily: fonts.text,
										fontSize: 24,
										fontWeight: 700,
										letterSpacing: '0.14em',
										color: blink.white,
									}}
								>
									{analysing}
								</span>
							</div>

							<Gauge
								to={1}
								timing={{delay: 126, duration: 108, easing: 'expo'}}
								height={16}
								color={blink.skyBright}
							/>

							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: 12,
									marginTop: 22,
								}}
							>
								{criteria.map((item, index) => (
									<Pop
										key={item}
										at={140 + index * (STAGGER.loose * 4)}
										spring="popSoft"
										preset="popTilt"
										tilt
										index={index}
									>
										<div
											style={{
												padding: '10px 20px',
												borderRadius: 999,
												border: `1px solid ${blink.sky}44`,
												background: 'rgba(174,231,250,0.08)',
												fontFamily: fonts.text,
												fontSize: 22,
												fontWeight: 600,
												color: blink.sky,
											}}
										>
											{item}
										</div>
									</Pop>
								))}
							</div>
						</div>
					</Pop>
				</div>

				{/* Une notification commente la lecture, en marge du geste principal. */}
				<AbsoluteFill
					style={{
						alignItems: 'flex-end',
						justifyContent: 'flex-start',
						paddingTop: 240,
						paddingRight: 24,
					}}
				>
					<Pop
						at={186}
						spring="popTight"
						preset="flyLeft"
						tilt
						index={9}
						shadow
						out={234}
						exit="flyOutRight"
					>
						<Toast accent={blink.success} fontFamily={fonts.text}>
							9 images lues
						</Toast>
					</Pop>
				</AbsoluteFill>

				{/* Le curseur vit hors de la mise en page : il traverse la scène. */}
				<AbsoluteFill style={{pointerEvents: 'none'}}>
					<Cursor
						from={{x: 980, y: 1560}}
						to={{x: 596, y: 880}}
						at={60}
						duration={24}
						arc={150}
						pressAt={CLICK_FRAME}
						size={58}
						color={blink.white}
					/>
				</AbsoluteFill>

				{/* Portail de sortie : sa couleur est celle du fond de la scène 6. */}
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
					<Portal
						from={0}
						to={330}
						timing={{delay: 246, duration: 24, easing: 'expoIn'}}
						color={blink.sky}
						edge={blink.skyBright}
						glow={blink.sky}
					/>
				</AbsoluteFill>
			</BlinkStage>
		</Impact>
	);
};
