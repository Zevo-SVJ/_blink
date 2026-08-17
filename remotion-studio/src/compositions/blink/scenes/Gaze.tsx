import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {BlinkStage} from '@/components/blink';
import {CursorSwarm, Orb, Shockwave, Toast, ViewCounter} from '@/components/kinetic';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {Impact, Pop} from '@/motion/kinetic';

export const gazeSchema = z.object({
	line: z.string(),
	viewsTo: z.number(),
	viewsLabel: z.string(),
	toasts: z.array(z.string()),
});

export type GazeProps = z.infer<typeof gazeSchema>;

export const gazeDefaults: GazeProps = {
	line: 'C’est tout ce qu’il leur faut.',
	viewsTo: 1284,
	viewsLabel: 'regards',
	toasts: ['a vu ton profil', 'est passé, n’a pas suivi'],
};

/**
 * SCÈNE 3 — LE REGARD  ·  8 temps (240 frames)
 *
 * Aucune interface Blink dans ce plan. Le sujet, c'est **les autres** : une
 * sphère abstraite qui te représente, et une nuée de curseurs qui converge
 * dessus depuis l'extérieur du cadre.
 *
 * Le détail qui porte la métaphore : les curseurs **s'arrêtent à distance**.
 * Ils regardent, ils ne cliquent pas. Chaque vague déclenche une onde
 * concentrique — quelque chose a été vu, et ça se propage.
 *
 * Partition :
 *   f000  la sphère entre, ressort lourd (masse 1,7) — elle a du poids
 *   f012  ▮ première vague de curseurs, cascade de 3 f
 *   f024  onde concentrique + secousse
 *   f048  le compteur de regards s'emballe
 *   f072  ▮ deuxième onde
 *   f090  première notification, entrée par la droite
 *   f120  seconde notification
 *   f150  la phrase se pose sous la sphère
 *   f200  tout se retire vers le centre
 */

const HITS = [
	{at: 24, amplitude: 16, duration: 8, seed: 'g1'},
	{at: 72, amplitude: 12, duration: 7, seed: 'g2'},
	{at: 132, amplitude: 9, duration: 6, seed: 'g3'},
];

export const Gaze: React.FC<GazeProps> = ({
	line,
	viewsTo,
	viewsLabel,
	toasts,
}) => (
	<Impact hits={HITS}>
		<BlinkStage glow={blink.skyBright} glowStrength={0.3} glowY={0.4}>
			{/* Le noyau : sphère + ondes + curseurs partagent le même centre. */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
				<div style={{position: 'relative'}}>
					<Shockwave at={24} count={3} step={10} size={1500} color={blink.skyBright} />
					<Shockwave at={72} count={2} step={12} size={1300} color={blink.sky} />

					<Pop
						at={0}
						spring="heavy"
						preset="popIn"
						squash={0.8}
						out={200}
						exit="recede"
						outDuration={18}
					>
						<Orb size={360} light={blink.sky} dark="#0A2244" glow={blink.skyBright} />
					</Pop>

					<CursorSwarm at={12} count={9} step={STAGGER.base} from={1150} to={330} />
					<CursorSwarm
						at={72}
						count={5}
						step={STAGGER.wide}
						from={1250}
						to={430}
						seed="swarm-b"
						colors={[blink.sky, '#FF6B9D', blink.warning]}
						size={38}
					/>
				</div>
			</AbsoluteFill>

			{/* Le compteur vit en haut, hors du noyau : il commente, il ne participe pas. */}
			<AbsoluteFill
				style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: 300}}
			>
				<Pop at={44} spring="popTight" preset="riseUp" out={198} exit="liftOut">
					<ViewCounter
						at={48}
						to={viewsTo}
						label={viewsLabel}
						color={blink.sky}
						fontFamily={fonts.display}
					/>
				</Pop>
			</AbsoluteFill>

			{/* Notifications : elles envahissent le cadre par la droite. */}
			<AbsoluteFill
				style={{
					alignItems: 'flex-end',
					justifyContent: 'center',
					paddingRight: 70,
					paddingTop: 620,
				}}
			>
				<div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
					{toasts.map((text, index) => (
						<Pop
							key={text}
							at={90 + index * 30}
							spring="popTight"
							preset="flyLeft"
							tilt
							index={index + 3}
							shadow
							out={196 + index * STAGGER.base}
							exit="flyOutRight"
						>
							<Toast
								accent={index === 0 ? blink.sky : '#FF6B9D'}
								fontFamily={fonts.text}
								style={{maxWidth: 560}}
							>
								{text}
							</Toast>
						</Pop>
					))}
				</div>
			</AbsoluteFill>

			{/* La phrase arrive en dernier : l'image a déjà tout dit. */}
			<AbsoluteFill
				style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 300}}
			>
				<Pop at={150} spring="textPop" preset="riseUp" out={202} exit="crush">
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 62,
							fontWeight: 800,
							letterSpacing: '-0.04em',
							color: blink.white,
							textAlign: 'center',
							textShadow: '0 20px 50px rgba(0,6,20,0.8)',
						}}
					>
						{line}
					</div>
				</Pop>
			</AbsoluteFill>
		</BlinkStage>
	</Impact>
);
