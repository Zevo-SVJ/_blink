import type {ReactNode} from 'react';
import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {BlinkStage, Portal} from '@/components/blink';
import {Shockwave} from '@/components/kinetic';
import {blink, lenses} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {useProgress} from '@/motion/frame';
import {Impact, Pop} from '@/motion/kinetic';
import {useIdle} from '@/motion/kinetic/idle';

export const perceptionSchema = z.object({
	lineOne: z.string(),
	lineTwo: z.string(),
	lineThree: z.string(),
	subtitle: z.string(),
});

export type PerceptionProps = z.infer<typeof perceptionSchema>;

export const perceptionDefaults: PerceptionProps = {
	lineOne: 'TON PROFIL',
	lineTwo: 'PARLE',
	lineThree: 'AVANT TOI.',
	subtitle: 'Blink te montre ce qu’ils voient.',
};

/**
 * SCÈNE 1 — PERCEPTION  ·  8 temps (240 frames)
 *
 * L'accroche. Quatre regards convergent sur un profil pendant qu'une phrase
 * s'abat en trois temps.
 *
 * Partition (frames ; 30 frames = 1 temps) :
 *   f000  les quatre regards entrent par les quatre bords, cascade de 3 f
 *   f022  ▮ « TON PROFIL »   impact + secousse
 *   f036  ▮ « PARLE »        impact + secousse
 *   f050  ▮ « AVANT TOI. »   impact + secousse, la plus forte
 *   f080  respiration
 *   f096  les regards se resserrent vers le centre
 *   f132  la promesse monte du bas
 *   f168  tout se retire
 *   f186  le portail s'ouvre — il porte le blanc cassé du plan suivant, donc
 *         le zoom traversant plonge dans une lumière et non dans un trou
 *
 * Enrichissements par rapport à la première version : chaque impact
 * typographique émet une onde concentrique, et les regards respirent en
 * permanence au lieu de se figer après leur entrée.
 */

const HITS = [
	{at: 22, amplitude: 15, duration: 7, seed: 'p1'},
	{at: 36, amplitude: 18, duration: 7, seed: 'p2'},
	{at: 50, amplitude: 27, duration: 10, seed: 'p3', rotation: 1.6},
	{at: 96, amplitude: 9, duration: 6, seed: 'p4'},
];

/**
 * Position d'orbite de chaque regard, et le bord d'où il arrive.
 *
 * Volontairement dispersées plutôt qu'en croix : une croix parfaite place deux
 * regards en plein dans la bande de texte, et se lit comme un pictogramme. La
 * dispersion les garde au-dessus et en dessous du bloc typographique.
 */
const WATCHERS = [
	{preset: 'dropIn' as const, x: -290, y: -540},
	{preset: 'flyLeft' as const, x: 330, y: -470},
	{preset: 'riseUp' as const, x: -330, y: 430},
	{preset: 'flyRight' as const, x: 300, y: 490},
];

/**
 * Ramène un regard de son orbite vers le centre.
 *
 * Séparé du `<Pop>` : la convergence doit se **composer** avec l'entrée au
 * ressort, pas la remplacer. Deux transforms imbriqués, deux responsabilités.
 */
const Converging: React.FC<{
	index: number;
	x: number;
	y: number;
	children: ReactNode;
}> = ({index, x, y, children}) => {
	const pull = useProgress({delay: 96 + index * STAGGER.tight, spring: 'popSoft'}) * 0.72;
	// Micro-vie : même immobiles sur leur orbite, les regards ne sont jamais figés.
	const idle = useIdle({float: 12, breathe: 0.03, speed: 0.16, phase: index * 1.6});

	return (
		<div
			style={{
				transform: `translate3d(${(x * (1 - pull)).toFixed(2)}px, ${(y * (1 - pull) + idle.y).toFixed(2)}px, 0) scale(${idle.scale.toFixed(4)})`,
			}}
		>
			{children}
		</div>
	);
};

const Line: React.FC<{
	text: string;
	at: number;
	size: number;
	color?: string;
}> = ({text, at, size, color = blink.white}) => (
	<Pop
		at={at}
		spring="textPop"
		preset="slamIn"
		out={208}
		exit="liftOut"
		outDuration={16}
	>
		<div
			style={{
				fontFamily: fonts.display,
				fontSize: size,
				fontWeight: 800,
				letterSpacing: '-0.055em',
				lineHeight: 0.92,
				color,
				textAlign: 'center',
				textShadow: '0 24px 60px rgba(0,6,20,0.7)',
			}}
		>
			{text}
		</div>
	</Pop>
);

export const Perception: React.FC<PerceptionProps> = ({
	lineOne,
	lineTwo,
	lineThree,
	subtitle,
}) => (
	<Impact hits={HITS}>
		<BlinkStage glow={blink.skyBright} glowStrength={0.34}>
			{/* Les quatre regards, un par couleur de lentille. Ils se resserrent au
			    temps 3,5 : le rapprochement dit « on te regarde » sans l'écrire. */}
			{/* Chaque impact typographique émet une onde : le mot ne fait pas que
			    arriver, il propage quelque chose. */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
				<div style={{position: 'relative'}}>
					<Shockwave at={36} count={2} step={9} size={1300} color={blink.skyBright} thickness={3} />
					<Shockwave at={50} count={3} step={8} size={1700} color={blink.sky} thickness={4} />
				</div>
			</AbsoluteFill>

			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
				{WATCHERS.map((watcher, index) => (
					<Pop
						key={lenses[index]!.id}
						at={6 + index * STAGGER.base}
						spring="pop"
						preset={watcher.preset}
						squash={1.3}
						squashAxis={index % 2 === 0 ? 'y' : 'x'}
						shadow
						out={202}
						exit="crush"
						outDuration={14}
						style={{position: 'absolute'}}
					>
						<Converging index={index} x={watcher.x} y={watcher.y}>
							<div
								style={{
									width: 74,
									height: 74,
									borderRadius: '50%',
									background: `radial-gradient(circle at 36% 32%, ${lenses[index]!.color}, ${lenses[index]!.color}55)`,
									boxShadow: `0 0 40px ${lenses[index]!.color}aa`,
								}}
							/>
						</Converging>
					</Pop>
				))}
			</AbsoluteFill>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 2,
					position: 'relative',
				}}
			>
				<Line text={lineOne} at={22} size={126} />
				<Line text={lineTwo} at={36} size={164} color={blink.sky} />
				<Line text={lineThree} at={50} size={126} />

				<Pop
					at={132}
					spring="ui"
					preset="riseUp"
					out={216}
					exit="crush"
					outDuration={14}
					style={{marginTop: 52}}
				>
					<div
						style={{
							fontFamily: fonts.text,
							fontSize: 38,
							fontWeight: 500,
							letterSpacing: '-0.01em',
							color: blink.gray,
							textAlign: 'center',
						}}
					>
						{subtitle}
					</div>
				</Pop>
			</div>

			{/* Le portail. Sa couleur est celle du fond de la scène 2 : c'est ce
			    qui rend le raccord invisible quand le zoom l'agrandit. */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
				<Portal
					from={0}
					to={360}
					timing={{delay: 176, duration: 32, easing: 'expoIn'}}
					color={blink.white}
					edge={blink.cloud}
					glow={blink.sky}
				/>
			</AbsoluteFill>
		</BlinkStage>
	</Impact>
);
