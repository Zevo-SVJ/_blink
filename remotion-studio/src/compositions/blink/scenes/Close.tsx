import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {BlinkStage} from '@/components/blink';
import {ArrowRight} from '@/components/Icons';
import {CursorSwarm, Shockwave} from '@/components/kinetic';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {useProgress} from '@/motion/frame';
import {Impact, Pop} from '@/motion/kinetic';

export const closeSchema = z.object({
	wordmark: z.string(),
	baseline: z.string(),
	cta: z.string(),
});

export type CloseProps = z.infer<typeof closeSchema>;

export const closeDefaults: CloseProps = {
	wordmark: 'blink',
	baseline: 'vois-toi comme les autres te voient',
	cta: 'Analyser mon profil',
};

/**
 * SCÈNE 13 — CLÔTURE  ·  9 temps (270 frames)
 *
 * La boucle se ferme. La nuée de curseurs de la scène 3 revient — mais cette
 * fois elle converge sur la marque, pas sur toi. C'est le rappel qui transforme
 * une suite de plans en récit : le même motif visuel, chargé d'un sens nouveau.
 *
 * Contrairement à toutes les autres scènes, le rythme **ralentit** ici. Les
 * délais s'espacent, l'onde est plus lente, et la dernière seconde ne contient
 * qu'une pulsation. C'est la seule respiration longue de la vidéo, et elle
 * laisse la place à la dernière phrase de la voix off.
 *
 * Partition :
 *   f000  les curseurs reviennent, cascade large, depuis très loin
 *   f024  ▮ la marque arrive au centre, ressort lourd
 *   f036  onde concentrique — la marque « émet »
 *   f060  la baseline se pose
 *   f096  ▮ l'appel à l'action, avec sa flèche
 *   f150  pulsation unique
 *   f186  seconde pulsation, plus ample — la relance qui évite les quarante
 *         dernières frames immobiles
 *   f198  dernière onde, très lente : la vidéo s'éteint sans se figer
 */

const HITS = [
	{at: 24, amplitude: 18, duration: 9, seed: 'cs1'},
	{at: 96, amplitude: 12, duration: 7, seed: 'cs2'},
	{at: 150, amplitude: 7, duration: 5, seed: 'cs3'},
	{at: 186, amplitude: 10, duration: 6, seed: 'cs4'},
];

/**
 * Deux pulsations de l'appel à l'action.
 *
 * La seconde est plus ample et plus tardive : c'est elle qui empêche la fin du
 * film d'être immobile. Le ralentissement voulu du dernier plan doit rester un
 * ralentissement, pas un arrêt.
 */
const useCtaPulse = (): number => {
	const grow = useProgress({delay: 150, duration: 7, easing: 'expo'});
	const settle = useProgress({delay: 157, spring: 'pop'});
	const growAgain = useProgress({delay: 186, duration: 8, easing: 'expo'});
	const settleAgain = useProgress({delay: 194, spring: 'pop'});
	return 1 + grow * 0.07 - settle * 0.07 + growAgain * 0.1 - settleAgain * 0.1;
};

export const Close: React.FC<CloseProps> = ({wordmark, baseline, cta}) => {
	const pulse = useCtaPulse();

	return (
		<Impact hits={HITS}>
			<BlinkStage glow={blink.skyBright} glowStrength={0.42} glowY={0.44}>
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
					<div style={{position: 'relative'}}>
						<Shockwave at={36} count={3} step={14} size={1500} duration={60} color={blink.skyBright} />
						<Shockwave at={198} count={2} step={18} size={1700} duration={70} color={blink.sky} thickness={3} />

						{/* Les curseurs reviennent, mais convergent sur la marque. */}
						<CursorSwarm
							at={0}
							count={11}
							step={STAGGER.wide}
							from={1300}
							to={500}
							seed="close-swarm"
							colors={[blink.white, blink.sky, '#FF6B9D', blink.warning]}
							size={40}
						/>
					</div>
				</AbsoluteFill>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 20,
					}}
				>
					{/* Pas de `shadow` : sur du texte nu, l'élévation se sérialise en
					    `box-shadow` et cerne les glyphes d'un rectangle. */}
					<Pop at={24} spring="heavy" preset="popIn" squash={1.1}>
						<div
							style={{
								fontFamily: fonts.display,
								fontSize: 150,
								fontWeight: 800,
								letterSpacing: '-0.07em',
								color: blink.white,
								textShadow: `0 28px 80px ${blink.skyBright}55`,
							}}
						>
							{wordmark}
						</div>
					</Pop>

					<Pop at={60} spring="ui" preset="riseUp">
						<div
							style={{
								fontFamily: fonts.text,
								fontSize: 34,
								fontWeight: 500,
								letterSpacing: '-0.01em',
								color: blink.sky,
								textAlign: 'center',
							}}
						>
							{baseline}
						</div>
					</Pop>

					<Pop
						at={96}
						spring="pop"
						preset="popTilt"
						tilt={-1.5}
						shadow
						index={4}
						style={{marginTop: 42}}
					>
						<div style={{transform: `scale(${pulse.toFixed(4)})`}}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 18,
									padding: '30px 54px',
									borderRadius: 999,
									background: blink.white,
									color: blink.navy,
									fontFamily: fonts.display,
									fontSize: 38,
									fontWeight: 700,
									letterSpacing: '-0.02em',
								}}
							>
								{cta}
								<ArrowRight color={blink.navy} size={34} />
							</div>
						</div>
					</Pop>
				</div>
			</BlinkStage>
		</Impact>
	);
};
