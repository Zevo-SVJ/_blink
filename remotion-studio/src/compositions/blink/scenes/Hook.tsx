import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {BlinkStage} from '@/components/blink';
import {Cadence, Medallion, Shockwave, Sparks} from '@/components/kinetic';
import {blink, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {Camera, Impact, Pop} from '@/motion/kinetic';

export const hookSchema = z.object({
	badge: z.string(),
	lineOne: z.string(),
	lineTwo: z.string(),
	lineThree: z.string(),
});

export type HookProps = z.infer<typeof hookSchema>;

export const hookDefaults: HookProps = {
	badge: 'PREMIÈRE IMPRESSION',
	lineOne: 'TON PROFIL',
	lineTwo: 'PARLE',
	lineThree: 'AVANT TOI.',
};

/**
 * 00:00 — HOOK  ·  120 frames utiles
 *
 * Les deux premières secondes décident du reste. La règle appliquée ici est
 * simple et sans exception : **à la frame 0, l'image est déjà en mouvement et
 * déjà illisible.** Pas de fond qui s'installe, pas de titre qui monte — un
 * objet trop gros pour être identifié, et une caméra qui recule.
 *
 * Trois battements, trois compositions entièrement différentes en deux
 * secondes :
 *
 *   f000  ▮ la caméra est collée au médaillon (échelle 4,3) et recule en 26
 *           frames. L'objet se révèle en même temps que le cadre ;
 *   f015  ▮ le tampon fluo s'imprime — ressort 500/15, ~34 % de dépassement,
 *           le plus violent du film — avec onde, particules et secousse ;
 *   f030  ▮ COUPE. Filé latéral vers l'écran typographique. Les mots arrivent
 *           en trois frappes, avec un contraste d'échelle de 1 à 3,4 entre le
 *           mot connecteur et le mot porteur ;
 *   f078  ▮ COUPE. Recadrage serré : la chute de la phrase occupe seule le
 *           cadre, en fluo, sur un zoom qui se resserre encore.
 *
 * Les deux coupes internes sont de vraies coupes (`<Sequence>` imbriquées) :
 * chaque battement redémarre sa propre frame 0. C'est ce qui autorise trois
 * compositions successives dans un plan de deux secondes sans jamais empiler
 * des délais.
 */

const HITS_A = [
	{at: 15, amplitude: 26, duration: 10, seed: 'h1', rotation: 1.6},
	{at: 24, amplitude: 8, duration: 5, seed: 'h2'},
];

const HITS_B = [
	{at: 0, amplitude: 20, duration: 7, seed: 'h3', rotation: 1.2},
	{at: 8, amplitude: 12, duration: 6, seed: 'h4'},
	{at: 18, amplitude: 22, duration: 8, seed: 'h5', rotation: 1.4},
];

const HITS_C = [{at: 0, amplitude: 30, duration: 11, seed: 'h6', rotation: 2}];

/** Le tampon. Il ne réapparaît jamais après le premier plan. */
const Badge: React.FC<{label: string; at: number; scale?: number}> = ({
	label,
	at,
	scale = 1,
}) => (
	<Pop at={at} spring="stamp" preset="printIn" shadow squash={0.8}>
		<div
			style={{
				padding: `${18 * scale}px ${38 * scale}px`,
				borderRadius: 18,
				background: `linear-gradient(100deg, ${pop.flare}, ${pop.flareHot})`,
				color: pop.ink,
				fontFamily: fonts.display,
				fontSize: 44 * scale,
				fontWeight: 800,
				letterSpacing: '-0.02em',
				textTransform: 'uppercase',
				transform: 'rotate(-3.5deg)',
			}}
		>
			{label}
		</div>
	</Pop>
);

export const Hook: React.FC<HookProps> = ({badge, lineOne, lineTwo, lineThree}) => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		{/* ── BATTEMENT 1 · l'objet ─────────────────────────────────────── */}
		<Sequence durationInFrames={30} layout="none">
			<Impact hits={HITS_A}>
				<BlinkStage glow={blink.skyBright} glowStrength={0.5} glowY={0.42}>
					{/* Le recul. `expo` : la caméra part vite et se pose — l'inverse
					    donnerait une plongée, pas une révélation. */}
					<Camera
						moves={[
							{scale: 4.3, toScale: 1.06, timing: {duration: 26, easing: 'expo'}},
							{y: 0, toY: -30, timing: {duration: 30, easing: 'standard'}},
						]}
					>
						<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
							<Medallion size={820} tilt={11} />
						</AbsoluteFill>
					</Camera>

					<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
						<Shockwave at={15} count={3} step={7} size={1800} color={pop.flare} thickness={5} />
						<Sparks at={15} count={30} spread={620} color={pop.flare} color2={pop.flareHot} life={22} />
					</AbsoluteFill>

					<AbsoluteFill
						style={{alignItems: 'center', justifyContent: 'center', paddingTop: 620}}
					>
						<Badge label={badge} at={15} />
					</AbsoluteFill>
				</BlinkStage>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · la phrase ───────────────────────────────────── */}
		<Sequence from={30} durationInFrames={48} layout="none">
			<Impact hits={HITS_B}>
				{/* Filé d'arrivée : le cadre entre par la droite en six frames. La
				    coupe est franche, mais le mouvement la relie au plan précédent. */}
				<Camera moves={[{x: 1180, toX: 0, timing: {spring: 'whip', durationInFrames: 14}}]}>
					<BlinkStage glow={blink.sky} glowStrength={0.3} glowY={0.5}>
						<Cadence every={15} color={blink.sky} strength={0.9} />

						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 4,
							}}
						>
							{/* Contraste d'échelle : 62 px pour le mot qui ne porte rien,
							    210 px pour celui qui porte tout. Rapport 1 : 3,4. */}
							<Pop at={0} spring="kick" preset="hardDown">
								<div
									style={{
										fontFamily: fonts.display,
										fontSize: 62,
										fontWeight: 700,
										letterSpacing: '0.06em',
										color: blink.gray,
										textTransform: 'uppercase',
									}}
								>
									{lineOne}
								</div>
							</Pop>

							<Pop at={6} spring="kick" preset="slamIn" squash={1.1}>
								<div
									style={{
										fontFamily: fonts.display,
										fontSize: 210,
										fontWeight: 800,
										letterSpacing: '-0.06em',
										lineHeight: 0.9,
										color: blink.sky,
										textShadow: '0 28px 70px rgba(0,6,20,0.8)',
									}}
								>
									{lineTwo}
								</div>
							</Pop>

							<Pop at={14} spring="kick" preset="hardUp" squash={0.9}>
								<div
									style={{
										fontFamily: fonts.display,
										fontSize: 118,
										fontWeight: 800,
										letterSpacing: '-0.05em',
										color: blink.white,
									}}
								>
									{lineThree}
								</div>
							</Pop>
						</div>

						{/* Le tampon redevient une étiquette : il ne se rejoue pas, il se
						    range. */}
						<AbsoluteFill style={{alignItems: 'center', paddingTop: 300}}>
							<Pop at={20} spring="kick" preset="hardDown">
								<div
									style={{
										padding: '10px 24px',
										borderRadius: 10,
										background: pop.flare,
										color: pop.ink,
										fontFamily: fonts.mono,
										fontSize: 24,
										fontWeight: 700,
										letterSpacing: '0.18em',
									}}
								>
									{badge}
								</div>
							</Pop>
						</AbsoluteFill>
					</BlinkStage>
				</Camera>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · la chute ────────────────────────────────────── */}
		<Sequence from={78} layout="none">
			<Impact hits={HITS_C}>
				<Camera moves={[{scale: 1.3, toScale: 1, timing: {duration: 34, easing: 'expo'}}]}>
					<BlinkStage glow={pop.flareHot} glowStrength={0.34} glowY={0.5}>
						<Cadence every={15} color={pop.flare} strength={0.8} />

						{/* Le médaillon revient, petit et flouté : le plan boucle sur son
						    propre objet au lieu de partir ailleurs. */}
						<AbsoluteFill
							style={{
								alignItems: 'center',
								justifyContent: 'center',
								opacity: 0.28,
								filter: 'blur(6px)',
							}}
						>
							<Medallion size={1180} tilt={-8} shine={0.1} />
						</AbsoluteFill>

						<Pop at={0} spring="kick" preset="slamIn" squash={1.2}>
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: 176,
									fontWeight: 800,
									letterSpacing: '-0.06em',
									color: pop.flare,
									textAlign: 'center',
									textShadow: '0 30px 80px rgba(0,6,20,0.85)',
								}}
							>
								{lineThree}
							</div>
						</Pop>
					</BlinkStage>
				</Camera>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
