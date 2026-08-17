import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {BlinkStage} from '@/components/blink';
import {Cadence, CursorSwarm, Shockwave, Sparks} from '@/components/kinetic';
import {blink, lenses, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';
import {Impact, Pop} from '@/motion/kinetic';
import {useIdle} from '@/motion/kinetic/idle';

export const outroSchema = z.object({
	brand: z.string(),
	baseline: z.string(),
	cta: z.string(),
});

export type OutroProps = z.infer<typeof outroSchema>;

export const outroDefaults: OutroProps = {
	brand: 'BLINK',
	baseline: 'Vois-toi comme les autres te voient.',
	cta: 'Analyser mon profil',
};

/**
 * 00:33 — OUTRO  ·  240 frames utiles
 *
 * La marque, puis l'action. Dans cet ordre et jamais l'inverse : un appel à
 * l'action posé avant que la marque ait été nommée n'a rien à quoi se
 * rattacher.
 *
 *   f000  ▮ le mot-marque s'abat plein cadre, onde + particules
 *   f080  ▮ COUPE. La nuée revient et converge sur le bouton
 *   f108  le bouton reçoit sa première pulsation
 *   f160  ▮ COUPE. Le verrouillage final : marque, baseline, bouton
 *   f186  seconde pulsation, plus large
 *   f216  troisième pulsation — le plan est encore en mouvement à la
 *         dernière frame du film
 *
 * Les trois pulsations ne sont pas une boucle : leurs amplitudes croissent
 * (4 %, 5,5 %, 7 %) et leurs écarts se resserrent. Un bouton qui pulse à
 * l'identique devient un décor au bout de deux battements ; un bouton qui
 * insiste de plus en plus reste une demande.
 *
 * La toute dernière frame bouge encore, volontairement. Une vidéo verticale qui
 * s'immobilise avant de boucler donne à l'œil le signal qu'elle est finie —
 * exactement au moment où l'on voudrait qu'il la relance.
 */

const HITS_A = [
	{at: 0, amplitude: 30, duration: 11, seed: 'o1', rotation: 1.8},
	{at: 40, amplitude: 10, duration: 6, seed: 'o2'},
];
const HITS_B = [
	{at: 28, amplitude: 18, duration: 8, seed: 'o3', rotation: 1},
	{at: 56, amplitude: 10, duration: 5, seed: 'o4'},
];
const HITS_C = [
	{at: 0, amplitude: 20, duration: 8, seed: 'o5'},
	{at: 26, amplitude: 14, duration: 6, seed: 'o6'},
	{at: 56, amplitude: 16, duration: 7, seed: 'o7'},
];

/** Le bouton, avec ses pulsations d'amplitude croissante. */
const CtaButton: React.FC<{label: string; pulses: number[]; amplitudes: number[]}> = ({
	label,
	pulses,
	amplitudes,
}) => {
	const idle = useIdle({float: 4, breathe: 0.004, speed: 0.16});

	// Chaque pulsation est une paire montée/retour : la première progression
	// gonfle, la seconde ramène. Les additionner produit une impulsion nette
	// sans aucune boucle temps réel.
	const grow0 = useProgress({delay: pulses[0] ?? 0, duration: 6, easing: 'expo'});
	const back0 = useProgress({delay: (pulses[0] ?? 0) + 6, spring: 'kick'});
	const grow1 = useProgress({delay: pulses[1] ?? 0, duration: 6, easing: 'expo'});
	const back1 = useProgress({delay: (pulses[1] ?? 0) + 6, spring: 'kick'});
	const grow2 = useProgress({delay: pulses[2] ?? 0, duration: 6, easing: 'expo'});
	const back2 = useProgress({delay: (pulses[2] ?? 0) + 6, spring: 'kick'});

	const scale =
		1 +
		(grow0 - back0) * (amplitudes[0] ?? 0) +
		(grow1 - back1) * (amplitudes[1] ?? 0) +
		(grow2 - back2) * (amplitudes[2] ?? 0);

	return (
		<div
			style={{
				padding: '34px 74px',
				borderRadius: 999,
				background: `linear-gradient(120deg, ${blink.skyBright}, ${blink.sky})`,
				color: blink.navy,
				fontFamily: fonts.display,
				fontSize: 56,
				fontWeight: 800,
				letterSpacing: '-0.03em',
				boxShadow: `0 28px 70px -22px ${blink.skyBright}cc`,
				transform: `translateY(${idle.y.toFixed(2)}px) scale(${(scale * idle.scale).toFixed(4)})`,
			}}
		>
			{label}
		</div>
	);
};

export const Outro: React.FC<OutroProps> = ({brand, baseline, cta}) => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		{/* ── BATTEMENT 1 · la marque ───────────────────────────────────── */}
		<Sequence durationInFrames={80} layout="none">
			<Impact hits={HITS_A}>
				<BlinkStage glow={blink.skyBright} glowStrength={0.52} glowY={0.46}>
					<div style={{position: 'relative'}}>
						<Pop at={0} spring="stamp" preset="slamIn" squash={1.3}>
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 250,
									fontWeight: 800,
									letterSpacing: '-0.08em',
									color: blink.white,
									textShadow: '0 30px 90px rgba(0,6,20,0.9)',
								}}
							>
								{brand}
							</div>
						</Pop>
						<Shockwave at={0} count={3} step={8} size={1900} color={blink.sky} thickness={5} />
					</div>

					<AbsoluteFill
						style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 300}}
					>
						<Pop at={20} spring="kick" preset="hardUp">
							<div
								style={{
									fontFamily: fonts.text,
									fontSize: 42,
									fontWeight: 600,
									letterSpacing: '-0.01em',
									color: blink.sky,
									textAlign: 'center',
								}}
							>
								{baseline}
							</div>
						</Pop>
					</AbsoluteFill>

					<Sparks at={0} count={30} spread={760} color={blink.sky} color2={blink.skyBright} life={28} />
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · la convergence ──────────────────────────────── */}
		<Sequence from={80} durationInFrames={80} layout="none">
			<Impact hits={HITS_B}>
				<BlinkStage glow={blink.sky} glowStrength={0.36} glowY={0.5}>
					<div style={{position: 'relative', display: 'grid', placeItems: 'center'}}>
						<CursorSwarm
							at={0}
							count={12}
							step={2}
							from={1200}
							to={330}
							size={56}
							colors={lenses.map((lens) => lens.color)}
						/>
						<CtaButton label={cta} pulses={[28, 48, 66]} amplitudes={[0.04, 0.055, 0.07]} />
					</div>

					<Cadence every={15} color={blink.sky} strength={0.45} />
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · le verrouillage ─────────────────────────────── */}
		<Sequence from={160} layout="none">
			<Impact hits={HITS_C}>
				<BlinkStage glow={blink.skyBright} glowStrength={0.44} glowY={0.42}>
					<div
						style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40}}
					>
						<Pop at={0} spring="kick" preset="hardDown">
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 176,
									fontWeight: 800,
									letterSpacing: '-0.07em',
									color: blink.white,
								}}
							>
								{brand}
							</div>
						</Pop>

						<Pop at={8} spring="kick" preset="hardUp">
							<div
								style={{
									fontFamily: fonts.text,
									fontSize: 40,
									fontWeight: 600,
									color: blink.sky,
									textAlign: 'center',
								}}
							>
								{baseline}
							</div>
						</Pop>

						<Pop at={16} spring="kick" preset="hardUp" squash={0.9}>
							<CtaButton label={cta} pulses={[26, 56, 74]} amplitudes={[0.04, 0.055, 0.07]} />
						</Pop>
					</div>

					<AbsoluteFill style={{alignItems: 'center', paddingTop: 300}}>
						<div style={{display: 'flex', gap: 22}}>
							{lenses.map((lens, index) => (
								<Pop key={lens.id} at={20 + index * 3} spring="kick" preset="popIn">
									<div
										style={{
											width: 30,
											height: 30,
											borderRadius: '50%',
											background: lens.color,
											boxShadow: `0 0 26px ${lens.color}`,
										}}
									/>
								</Pop>
							))}
						</div>
					</AbsoluteFill>

					<Cadence every={15} offset={5} color={pop.flare} strength={0.4} />
				</BlinkStage>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
