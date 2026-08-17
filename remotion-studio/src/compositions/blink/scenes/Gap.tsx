import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {Portal} from '@/components/blink';
import {Cadence, SplitDiagonal} from '@/components/kinetic';
import {blink, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {Impact, Pop} from '@/motion/kinetic';

export const gapSchema = z.object({
	intentTitle: z.string(),
	intentWords: z.array(z.string()),
	seenTitle: z.string(),
	seenWords: z.array(z.string()),
	closer: z.string(),
});

export type GapProps = z.infer<typeof gapSchema>;

export const gapDefaults: GapProps = {
	intentTitle: 'CE QUE TU PENSES MONTRER',
	intentWords: ['Spontané', 'Drôle', 'Ouvert'],
	seenTitle: 'CE QU’ILS VOIENT VRAIMENT',
	seenWords: ['Appliqué', 'Sérieux', 'Distant'],
	closer: 'L’ÉCART',
};

/**
 * 00:21.8 — GAP  ·  240 frames utiles
 *
 * L'écran se fend en diagonale. En haut, l'intention ; en bas, la perception.
 * Deux couleurs qui ne se ressemblent en rien — vert acide contre orange fluo —
 * parce que le propos de la séquence est précisément qu'il n'y a aucun
 * recouvrement entre les deux.
 *
 * Le choix de la diagonale n'est pas graphique mais dimensionnel : sur un cadre
 * 9:16, une coupe horizontale donne deux bandes larges et écrasées, illisibles
 * dès qu'on y met trois mots. La diagonale traverse la plus grande dimension et
 * rend les deux zones exploitables.
 *
 *   f000  ▮ la lame trace, les deux moitiés s'écartent perpendiculairement
 *   f012  les deux titres arrivent, décalés de 6 frames
 *   f090  ▮ COUPE. Les mots des deux camps, en cascades opposées
 *   f170  ▮ COUPE. L'écart nommé, puis le portail qui ouvre le résultat
 *
 * Le portail final n'est pas décoratif : le raccord suivant est un
 * scale-to-mask, et il lui faut au centre une surface pleine qui remplira le
 * cadre. Sans elle, le zoom traversant plongerait dans un trou noir au lieu de
 * plonger dans une lumière.
 */

const HITS_A = [
	{at: 3, amplitude: 22, duration: 8, seed: 'g1', rotation: 1.3},
	{at: 12, amplitude: 10, duration: 5, seed: 'g2'},
];
const HITS_B = [
	{at: 2, amplitude: 12, duration: 6, seed: 'g3'},
	{at: 26, amplitude: 12, duration: 6, seed: 'g4'},
];
const HITS_C = [
	{at: 0, amplitude: 26, duration: 10, seed: 'g5', rotation: 1.6},
	{at: 46, amplitude: 12, duration: 6, seed: 'g6'},
];

/**
 * La lame a son whoosh, à plein volume.
 *
 * C'est le seul endroit du film où un raccord sonore est plus fort qu'un
 * impact : ici le mouvement *est* l'évènement, il n'accompagne rien.
 */
const SFX_A = [cue(0, 'whooshFast', 0.45)];
const SFX_B = [cue(0, 'whooshFast', 0.24), cue(6, 'clickMechanic', 0.28), cue(12, 'clickMechanic', 0.28)];
const SFX_C = [cue(0, 'whooshFast'), cue(4, 'whooshFast', 0.26), cue(10, 'impactThud')];

const PUNCH_C = [{at: 10, to: 1.2, rise: 5}];

const Half: React.FC<{
	title: string;
	words?: string[];
	color: string;
	align: 'top' | 'bottom';
	at: number;
}> = ({title, words, color, align, at}) => (
	<div
		style={{
			position: 'absolute',
			inset: 0,
			display: 'flex',
			flexDirection: 'column',
			justifyContent: align === 'top' ? 'flex-start' : 'flex-end',
			alignItems: align === 'top' ? 'flex-start' : 'flex-end',
			padding: align === 'top' ? '300px 90px 0' : '0 90px 340px',
			gap: 14,
			textAlign: align === 'top' ? 'left' : 'right',
		}}
	>
		<Pop at={at} spring="kick" preset={align === 'top' ? 'hardDown' : 'hardUp'}>
			<div
				style={{
					fontFamily: fonts.text,
					fontSize: 32,
					fontWeight: 800,
					letterSpacing: '0.16em',
					color,
					opacity: 0.85,
				}}
			>
				{title}
			</div>
		</Pop>

		{(words ?? []).map((word, index) => (
			<Pop
				key={word}
				at={at + 6 + index * STAGGER.marked}
				spring="kick"
				preset={align === 'top' ? 'flyRight' : 'flyLeft'}
			>
				<div
					style={{
						fontFamily: fonts.display,
						fontSize: 94,
						fontWeight: 800,
						letterSpacing: '-0.05em',
						lineHeight: 0.98,
						color,
					}}
				>
					{word}
				</div>
			</Pop>
		))}
	</div>
);

export const Gap: React.FC<GapProps> = ({
	intentTitle,
	intentWords,
	seenTitle,
	seenWords,
	closer,
}) => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		{/* ── BATTEMENT 1 · la fente ────────────────────────────────────── */}
		<Sequence durationInFrames={90} layout="none">
			<SfxTrack cues={SFX_A} />
			<Impact hits={HITS_A}>
				<SplitDiagonal
					at={0}
					topColor={pop.lime}
					bottomColor={pop.flareHot}
					lineColor={blink.white}
					lineWidth={6}
					top={<Half title={intentTitle} color="#062B18" align="top" at={12} />}
					bottom={<Half title={seenTitle} color="#2B1004" align="bottom" at={18} />}
				/>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · les deux camps ──────────────────────────────── */}
		<Sequence from={90} durationInFrames={80} layout="none">
			<SfxTrack cues={SFX_B} />
			<Impact hits={HITS_B}>
				<SplitDiagonal
					at={-30}
					topColor={pop.lime}
					bottomColor={pop.flareHot}
					lineColor={blink.white}
					lineWidth={6}
					top={
						<Half title={intentTitle} words={intentWords} color="#062B18" align="top" at={0} />
					}
					bottom={
						<Half title={seenTitle} words={seenWords} color="#2B1004" align="bottom" at={4} />
					}
				/>
				<Cadence every={15} color={blink.white} strength={0.35} />
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · l'écart nommé ───────────────────────────────── */}
		<Sequence from={170} layout="none">
			<SfxTrack cues={SFX_C} />
			<Impact hits={HITS_C} punches={PUNCH_C}>
				<AbsoluteFill
					style={{
						backgroundColor: blink.navy,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					{/* Les deux couleurs se réduisent à deux bandes qui se croisent :
					    l'opposition est devenue un fait mesurable. */}
					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<Pop at={0} spring="whip" preset="slashIn">
							<div
								style={{
									width: 1500,
									height: 26,
									background: pop.lime,
									transform: 'rotate(-35deg)',
									opacity: 0.9,
								}}
							/>
						</Pop>
					</AbsoluteFill>
					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<Pop at={4} spring="whip" preset={{opacity: 0, x: 260, y: -260}}>
							<div
								style={{
									width: 1500,
									height: 26,
									background: pop.flareHot,
									transform: 'rotate(35deg)',
									opacity: 0.9,
								}}
							/>
						</Pop>
					</AbsoluteFill>

					<Pop at={10} spring="stamp" preset="slamIn" squash={1.3}>
						<div
							style={{
								fontFamily: fonts.display,
								fontSize: 240,
								fontWeight: 800,
								letterSpacing: '-0.07em',
								color: blink.white,
								textShadow: '0 30px 90px rgba(0,6,20,0.9)',
							}}
						>
							{closer}
						</div>
					</Pop>

					<AbsoluteFill
						style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 380}}
					>
						<Pop at={22} spring="kick" preset="hardUp">
							<div
								style={{
									fontFamily: fonts.text,
									fontSize: 42,
									fontWeight: 600,
									color: blink.sky,
								}}
							>
								Blink le mesure.
							</div>
						</Pop>
					</AbsoluteFill>

					{/* Le masque du raccord suivant. */}
					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<Portal
							from={0}
							to={420}
							timing={{delay: 46, duration: 24, easing: 'expoIn'}}
							color={blink.skyBright}
							edge={blink.sky}
							glow={blink.sky}
						/>
					</AbsoluteFill>

					<Cadence every={15} offset={3} color={blink.sky} strength={0.5} />
				</AbsoluteFill>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
