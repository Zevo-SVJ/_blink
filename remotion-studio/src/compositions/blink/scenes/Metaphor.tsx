import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {BlinkStage} from '@/components/blink';
import {
	Cadence,
	CursorSwarm,
	Orb,
	Shockwave,
	Sparks,
	ViewCounter,
} from '@/components/kinetic';
import {blink, lenses, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {Camera, Cursor, Impact, Pop} from '@/motion/kinetic';
import {useIdle} from '@/motion/kinetic/idle';

export const metaphorSchema = z.object({
	views: z.number(),
	line: z.string(),
	verdict: z.string(),
});

export type MetaphorProps = z.infer<typeof metaphorSchema>;

export const metaphorDefaults: MetaphorProps = {
	views: 1284,
	line: 'ILS ONT DÉJÀ',
	verdict: 'DÉCIDÉ.',
};

/**
 * 00:04.8 — METAPHOR  ·  180 frames utiles
 *
 * Le cœur métaphorique du film : une identité au centre, et des regards qui
 * arrivent de partout pour cliquer dessus.
 *
 * L'objet est une sphère et non une carte de profil, délibérément. Une carte
 * dirait « un compte » ; une sphère dit « quelqu'un ». Elle n'a ni face ni dos,
 * donc elle peut être regardée sous n'importe quel angle — ce qui est
 * exactement le sujet.
 *
 *   f000  la sphère tombe (`heavyDrop`, ~31 % de dépassement) et s'écrase
 *   f008  la nuée converge depuis les bords et s'arrête à distance
 *   f040  premier compteur de vues, qui s'emballe
 *   f060  ▮ COUPE. Cadrage serré : six clics en 40 frames
 *   f060+ chaque clic émet une onde et des particules à sa position
 *   f120  ▮ COUPE. Le verdict tombe, la sphère devient minuscule derrière
 *
 * Les clics ne sont pas synchronisés sur une grille régulière : leurs écarts
 * (7, 5, 9, 6, 8 frames) sont volontairement inégaux. Une rafale régulière se
 * lit comme une machine ; une rafale irrégulière se lit comme une foule.
 */

const HITS_A = [
	{at: 6, amplitude: 22, duration: 9, seed: 'm1', rotation: 1.2},
	{at: 40, amplitude: 10, duration: 5, seed: 'm2'},
];

/** Les clics du deuxième battement — positions en pourcentage du cadre. */
const CLICKS = [
	{at: 4, x: 26, y: 34},
	{at: 11, x: 72, y: 28},
	{at: 16, x: 18, y: 66},
	{at: 25, x: 80, y: 62},
	{at: 31, x: 44, y: 22},
	{at: 39, x: 62, y: 76},
] as const;

const SFX_B = CLICKS.map((click) => cue(click.at, 'clickMechanic', 0.32));

const HITS_B = CLICKS.map((click, index) => ({
	at: click.at,
	amplitude: 9 + (index % 3) * 4,
	duration: 5,
	seed: `mc${index}`,
}));

const HITS_C = [{at: 0, amplitude: 26, duration: 10, seed: 'm3', rotation: 1.6}];

/**
 * Un clic par curseur, à 0,32 de volume.
 *
 * Six clics à plein volume seraient une agression ; six clics discrets sur un
 * fond silencieux se lisent comme une foule qui s'active. Le volume porte ici
 * l'information « ils sont nombreux », pas « c'est important ».
 */
const SFX_A = [cue(0, 'impactThud', 0.42), cue(8, 'whooshFast', 0.3)];
const SFX_C = [cue(7, 'impactThud'), cue(52, 'whooshFast', 0.3)];

const PUNCH_C = [
	{at: 7, to: 1.2, rise: 5},
	// Recul tenu : le plan part vers le haut au raccord suivant, et une image
	// légèrement reculée se laisse propulser hors cadre bien mieux qu'une image
	// pleine.
	{at: 50, to: 0.9, rise: 10, hold: true},
];

const ClickBurst: React.FC<{at: number; x: number; y: number; color: string}> = ({
	at,
	x,
	y,
	color,
}) => (
	<div
		style={{
			position: 'absolute',
			left: `${x}%`,
			top: `${y}%`,
			width: 0,
			height: 0,
		}}
	>
		<Shockwave at={at} count={1} step={0} size={420} color={color} thickness={4} duration={18} />
		<Sparks at={at} count={9} spread={150} life={16} size={8} color={color} color2={blink.sky} gravity={40} />
		<Cursor
			from={{x: x < 50 ? -260 : 260, y: 300}}
			to={{x: 0, y: 0}}
			at={Math.max(0, at - 10)}
			duration={12}
			arc={70}
			pressAt={at}
			size={44}
			color={color}
		/>
	</div>
);

const OrbCore: React.FC<{size: number; phase?: number}> = ({size, phase = 0}) => {
	const idle = useIdle({float: 5, breathe: 0.01, speed: 0.13, phase});
	return (
		<div style={{transform: `translateY(${idle.y.toFixed(2)}px)`}}>
			<Orb size={size} idle={false} />
		</div>
	);
};

export const Metaphor: React.FC<MetaphorProps> = ({views, line, verdict}) => (
	<AbsoluteFill style={{backgroundColor: blink.navy2}}>
		{/* ── BATTEMENT 1 · l'arrivée ───────────────────────────────────── */}
		<Sequence durationInFrames={60} layout="none">
			<SfxTrack cues={SFX_A} />
			<Impact hits={HITS_A}>
				<BlinkStage background={blink.navy2} glow={blink.skyBright} glowStrength={0.46}>
					<div style={{position: 'relative'}}>
						{/* Pas de `shadow` ici : l'ombre portée de `Pop` est rectangulaire,
					    donc elle dessinerait un carré derrière une sphère. La lueur de
					    l'orbe joue déjà ce rôle. */}
						<Pop at={0} spring="heavyDrop" preset="dropHigh" squash={1.5}>
							<OrbCore size={520} />
						</Pop>

						<Shockwave at={6} count={3} step={8} size={1500} color={blink.skyBright} />
						<CursorSwarm at={8} count={11} step={3} from={1180} to={430} size={54} />
					</div>

					<AbsoluteFill
						style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 250}}
					>
						<Pop at={40} spring="kick" preset="hardUp">
							<ViewCounter at={40} to={views} duration={44} fontFamily={fonts.display} />
						</Pop>
					</AbsoluteFill>
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · la rafale ───────────────────────────────────── */}
		<Sequence from={60} durationInFrames={60} layout="none">
			<SfxTrack cues={SFX_B} />
			<Impact hits={HITS_B}>
				<BlinkStage background={blink.navy} glow={blink.sky} glowStrength={0.34} glowY={0.46}>
					{/* Recadrage serré sur la sphère : on est passé « dedans ». */}
					<Camera moves={[{scale: 1.5, toScale: 1.62, timing: {duration: 60, easing: 'linear'}}]}>
						<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
							<OrbCore size={520} phase={2} />
						</AbsoluteFill>
					</Camera>

					<AbsoluteFill>
						{CLICKS.map((click, index) => (
							<ClickBurst
								key={index}
								at={click.at}
								x={click.x}
								y={click.y}
								color={lenses[index % lenses.length]!.color}
							/>
						))}
					</AbsoluteFill>

					<Cadence every={15} color={blink.sky} strength={0.7} />
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · le verdict ──────────────────────────────────── */}
		<Sequence from={120} layout="none">
			<SfxTrack cues={SFX_C} />
			<Impact hits={HITS_C} punches={PUNCH_C}>
				<BlinkStage background={blink.navy2} glow={pop.flareHot} glowStrength={0.28} glowY={0.55}>
					<AbsoluteFill
						style={{alignItems: 'center', justifyContent: 'center', opacity: 0.5}}
					>
						<Camera moves={[{scale: 1, toScale: 0.42, timing: {duration: 22, easing: 'expo'}}]}>
							<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
								<OrbCore size={520} phase={4} />
							</AbsoluteFill>
						</Camera>
					</AbsoluteFill>

					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
						<Pop at={0} spring="kick" preset="hardDown">
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 96,
									fontWeight: 700,
									letterSpacing: '-0.04em',
									color: blink.white,
								}}
							>
								{line}
							</div>
						</Pop>

						<Pop at={7} spring="kick" preset="slamIn" squash={1.2}>
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 208,
									fontWeight: 800,
									letterSpacing: '-0.07em',
									lineHeight: 0.92,
									color: pop.flareHot,
									textShadow: '0 26px 70px rgba(0,6,20,0.8)',
								}}
							>
								{verdict}
							</div>
						</Pop>
					</div>

					<Sparks at={7} count={22} spread={560} color={pop.flareHot} color2={pop.flare} life={24} />
					<Cadence every={15} offset={7} color={pop.flareHot} strength={0.6} />
				</BlinkStage>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
