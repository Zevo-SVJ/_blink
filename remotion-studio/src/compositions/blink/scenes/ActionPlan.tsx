import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {BlinkStage, Portal} from '@/components/blink';
import {Cadence, NotifBanner, PhoneFrame, Sparks, ToggleRow} from '@/components/kinetic';
import {blink, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {Counter, Gauge, Impact, Pop} from '@/motion/kinetic';
import {DEMO} from '../manifest';

export const actionPlanSchema = z.object({
	notifTitle: z.string(),
	notifBody: z.string(),
	actions: z.array(z.object({label: z.string(), detail: z.string()})),
	gain: z.number(),
	target: z.string(),
});

export type ActionPlanProps = z.infer<typeof actionPlanSchema>;

export const actionPlanDefaults: ActionPlanProps = {
	notifTitle: 'Blink',
	notifBody: 'Ton analyse est prête.',
	actions: [
		{label: 'Recadrer la photo 2', detail: 'Le visage est trop loin'},
		{label: 'Réécrire la bio', detail: 'Trois mots de trop'},
		{label: 'Retirer le post 7', detail: 'Il casse la cohérence'},
	],
	gain: DEMO.pointsToNext,
	target: DEMO.nextTier,
};

/**
 * 00:29 — ACTION PLAN  ·  240 frames utiles
 *
 * Changement d'échelle de réalité. Après trente secondes d'objets flottant dans
 * un espace abstrait, l'image devient un **téléphone** — ce qui était une
 * métaphore redevient une chose que le spectateur peut faire ce soir.
 *
 *   f000  ▮ le châssis monte ; en-tête à f4, notification à f10 (`heavyDrop`),
 *         score à f28, jauge à f38 — l'écran ne reste jamais vide
 *   f080  ▮ COUPE. Les trois actions s'activent seules, une toutes les 22 f
 *   f160  ▮ COUPE. Le gain projeté : +48, et le palier visé
 *
 * L'interface qui s'utilise sans doigt est un raccourci narratif assumé : elle
 * montre le **résultat** d'une action sans avoir à filmer l'action. Trois
 * lignes qui basculent en cascade disent « voilà ce que tu as à faire, et c'est
 * déjà fait » en une seconde et demie — ce qu'aucune démonstration réelle ne
 * tiendrait dans ce temps.
 *
 * Le châssis est générique : coins arrondis, pilule, barre d'état dessinée. La
 * grammaire d'un téléphone appartient à tout le monde ; l'interface d'un
 * système en particulier, non.
 */

const HITS_A = [
	{at: 2, amplitude: 16, duration: 7, seed: 'a1'},
	{at: 26, amplitude: 20, duration: 8, seed: 'a2', rotation: 1.1},
];
const HITS_B = [
	{at: 10, amplitude: 12, duration: 6, seed: 'a3'},
	{at: 32, amplitude: 12, duration: 6, seed: 'a4'},
	{at: 54, amplitude: 16, duration: 7, seed: 'a5'},
];
const HITS_C = [
	{at: 0, amplitude: 24, duration: 9, seed: 'a6', rotation: 1.4},
	{at: 40, amplitude: 12, duration: 6, seed: 'a7'},
];

export const ActionPlan: React.FC<ActionPlanProps> = ({
	notifTitle,
	notifBody,
	actions,
	gain,
	target,
}) => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		{/* ── BATTEMENT 1 · la notification ─────────────────────────────── */}
		<Sequence durationInFrames={80} layout="none">
			<Impact hits={HITS_A}>
				<BlinkStage glow={blink.skyBright} glowStrength={0.34} glowY={0.46}>
					<Pop at={0} spring="whip" preset="hardUp">
						<PhoneFrame width={780} height={1140}>
							{/* L'écran n'est jamais vide. Un châssis qui monte sur un fond noir
							    laisserait un demi-seconde sans information — soit exactement le
							    temps mort que la refonte cherche à supprimer. L'en-tête et la
							    jauge occupent donc le plan dès la frame 4. */}
							{/* 150 px de retrait en haut : un enfant absolu se cale sur la *padding
							    box* de son ancêtre, donc le `paddingTop` du châssis ne le pousse
							    pas — il faut reprendre la hauteur de la barre d'état ici. */}
							<AbsoluteFill style={{padding: '150px 42px 0'}}>
								<Pop at={4} spring="kick" preset="hardDown">
									<div
										style={{
											fontFamily: fonts.text,
											fontSize: 26,
											fontWeight: 700,
											letterSpacing: '0.2em',
											color: blink.gray,
										}}
									>
										ANALYSE TERMINÉE
									</div>
								</Pop>

								<NotifBanner
									title={notifTitle}
									body={notifBody}
									at={10}
									width={660}
									glyph="B"
									style={{marginTop: 26}}
								/>

								<div
									style={{
										marginTop: 70,
										textAlign: 'center',
										fontFamily: fonts.display,
										fontSize: 150,
										fontWeight: 800,
										letterSpacing: '-0.05em',
										color: blink.white,
									}}
								>
									<Pop at={28} spring="kick" preset="popIn">
										<div>
											<Counter from={0} to={DEMO.score} timing={{duration: 20, easing: 'expo'}} />
										</div>
									</Pop>
								</div>

								<Pop at={38} spring="kick" preset="hardUp" style={{marginTop: 36}}>
									<div>
										<Gauge
											to={DEMO.tierProgress}
											timing={{delay: 44, duration: 24, easing: 'expo'}}
											height={14}
											color={blink.sky}
										/>
										<div
											style={{
												marginTop: 16,
												textAlign: 'center',
												fontFamily: fonts.text,
												fontSize: 26,
												fontWeight: 600,
												color: blink.sky,
											}}
										>
											Palier {DEMO.tier}
										</div>
									</div>
								</Pop>
							</AbsoluteFill>
						</PhoneFrame>
					</Pop>

					<Cadence every={15} color={blink.sky} strength={0.45} />
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · le plan qui s'exécute ───────────────────────── */}
		<Sequence from={80} durationInFrames={80} layout="none">
			<Impact hits={HITS_B}>
				<BlinkStage glow={blink.sky} glowStrength={0.3} glowY={0.5}>
					<PhoneFrame width={780} height={1140} idle={false}>
						<AbsoluteFill style={{padding: '150px 34px 0'}}>
							<Pop at={0} spring="kick" preset="hardDown">
								<div
									style={{
										fontFamily: fonts.display,
										fontSize: 46,
										fontWeight: 800,
										letterSpacing: '-0.03em',
										color: blink.white,
										marginBottom: 34,
									}}
								>
									Ton plan
								</div>
							</Pop>

							<div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
								{actions.map((action, index) => (
									<ToggleRow
										key={action.label}
										label={action.label}
										detail={action.detail}
										at={10 + index * 22}
										enterAt={2 + index * 22}
										accent={blink.sky}
										index={index}
									/>
								))}
							</div>

							{/* Le récapitulatif arrive après la troisième bascule : il occupe le
							    bas de l'écran, qui serait sinon vide pendant tout le battement,
							    et il transforme trois gestes en une promesse chiffrée. */}
							<Pop at={56} spring="kick" preset="hardUp" style={{marginTop: 30}}>
								<div
									style={{
										padding: '26px 30px',
										borderRadius: 24,
										background: `linear-gradient(120deg, ${blink.skyBright}22, ${blink.sky}18)`,
										border: `1px solid ${blink.sky}44`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										fontFamily: fonts.display,
									}}
								>
									<span style={{fontSize: 30, fontWeight: 700, color: blink.white}}>
										3 actions
									</span>
									<span style={{fontSize: 34, fontWeight: 800, color: blink.sky}}>
										+{gain} points
									</span>
								</div>
							</Pop>
						</AbsoluteFill>
					</PhoneFrame>

					<Cadence every={15} offset={8} color={blink.sky} strength={0.4} />
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · le gain projeté ─────────────────────────────── */}
		<Sequence from={160} layout="none">
			<Impact hits={HITS_C}>
				<BlinkStage glow={pop.flare} glowStrength={0.3} glowY={0.44}>
					<div
						style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}
					>
						<Pop at={0} spring="stamp" preset="slamIn" squash={1.3}>
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 300,
									fontWeight: 800,
									letterSpacing: '-0.07em',
									lineHeight: 0.9,
									color: pop.flare,
									textShadow: '0 30px 90px rgba(0,6,20,0.85)',
								}}
							>
								+{gain}
							</div>
						</Pop>

						<Pop at={14} spring="kick" preset="hardUp">
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 64,
									fontWeight: 700,
									letterSpacing: '-0.03em',
									color: blink.white,
								}}
							>
								et tu passes {target}.
							</div>
						</Pop>
					</div>

					<Sparks at={0} count={28} spread={640} color={pop.flare} color2={blink.sky} life={26} />

					{/* Masque du raccord suivant : on plonge dans la marque. */}
					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<Portal
							from={0}
							to={430}
							timing={{delay: 52, duration: 26, easing: 'expoIn'}}
							color={blink.navy2}
							edge={blink.sky}
							glow={blink.skyBright}
						/>
					</AbsoluteFill>

					<Cadence every={15} offset={4} color={pop.flare} strength={0.5} />
				</BlinkStage>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
