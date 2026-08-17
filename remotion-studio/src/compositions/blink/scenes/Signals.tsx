import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {BlinkStage} from '@/components/blink';
import {FloatingWindow, NodeField, Radar, ScanFrame} from '@/components/kinetic';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {Impact, Pop} from '@/motion/kinetic';

export const signalsSchema = z.object({
	kicker: z.string(),
	line: z.string(),
	axes: z.array(z.object({label: z.string(), value: z.number()})),
	readouts: z.array(z.object({label: z.string(), value: z.string()})),
});

export type SignalsProps = z.infer<typeof signalsSchema>;

export const signalsDefaults: SignalsProps = {
	kicker: 'signaux relevés',
	line: 'Tout compte.',
	axes: [
		{label: 'cadrage', value: 0.82},
		{label: 'palette', value: 0.64},
		{label: 'ton', value: 0.71},
		{label: 'cohérence', value: 0.9},
		{label: 'rythme', value: 0.58},
	],
	readouts: [
		{label: 'dominante', value: 'froide'},
		{label: 'densité', value: 'haute'},
	],
};

/**
 * SCÈNE 6 — LES SIGNAUX  ·  7 temps (210 frames)
 *
 * Le plan le plus dense de la vidéo. Trois couches de profondeur, aucune
 * n'appartenant à l'app Blink :
 *
 *   arrière-plan  un champ de nœuds qui se relient — l'analyse en cours,
 *                 représentée comme une topologie et non comme un chargement ;
 *   plan médian   un radar de perception dont chaque sommet pousse à son propre
 *                 rythme, avec un cadre de scan qui le mesure ;
 *   avant-plan    deux fenêtres flottantes inclinées, qui commentent.
 *
 * La règle de composition appliquée : les couches n'entrent pas dans le même
 * ordre que leur profondeur. Le fond démarre en premier, le radar ensuite, les
 * fenêtres en dernier — l'image se construit du lointain vers le proche, ce qui
 * donne la sensation d'un espace qui se remplit plutôt que d'une pile de
 * calques qui s'allument.
 *
 * Partition :
 *   f000  le champ de nœuds s'allume, point par point
 *   f012  ▮ le radar : grille d'abord, sommets ensuite
 *   f030  le cadre de scan se déploie depuis ses quatre coins
 *   f060  ▮ première fenêtre flottante, invasion par la gauche
 *   f078  seconde fenêtre, par la droite
 *   f108  ▮ « Tout compte. » — la chute, décentrée volontairement
 *   f170  tout recule
 */

const HITS = [
	{at: 12, amplitude: 11, duration: 6, seed: 'sg1'},
	{at: 60, amplitude: 14, duration: 7, seed: 'sg2'},
	{at: 108, amplitude: 22, duration: 9, seed: 'sg3', rotation: 1.4},
];

export const Signals: React.FC<SignalsProps> = ({
	kicker,
	line,
	axes,
	readouts,
}) => (
	<Impact hits={HITS}>
		<BlinkStage background="#020B1C" glow={blink.skyBright} glowStrength={0.26} glowY={0.44}>
			{/* Couche 1 — la topologie. Elle occupe tout le cadre, très en retrait. */}
			<AbsoluteFill style={{opacity: 0.62}}>
				<NodeField at={0} width={1080} height={1920} count={30} linkDistance={210} />
			</AbsoluteFill>

			{/* Couche 2 — l'instrument de mesure. */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
				<Pop
					at={12}
					spring="heavy"
					preset="popIn"
					out={170}
					exit="recede"
					outDuration={18}
				>
					<div style={{position: 'relative', padding: 60}}>
						<Radar
							at={14}
							axes={axes}
							size={620}
							color={blink.skyBright}
							fontFamily={fonts.text}
							step={STAGGER.base}
						/>
						<ScanFrame
							at={30}
							height={740}
							color={blink.sky}
							label="lecture des signaux"
							fontFamily={fonts.text}
						/>
					</div>
				</Pop>
			</AbsoluteFill>

			{/* Couche 3 — les commentaires. Ils envahissent par les côtés. */}
			<AbsoluteFill
				style={{
					alignItems: 'flex-start',
					justifyContent: 'flex-start',
					paddingTop: 300,
					paddingLeft: 44,
				}}
			>
				<Pop
					at={60}
					spring="popTight"
					preset="flyRight"
					shadow
					out={168}
					exit="flyOutLeft"
				>
					<FloatingWindow
						title="signal · 01"
						width={430}
						height={210}
						accent={blink.sky}
						tilt={12}
						phase={0.4}
					>
						<div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
							{readouts.map((readout) => (
								<div
									key={readout.label}
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										fontFamily: fonts.text,
										fontSize: 24,
									}}
								>
									<span style={{color: 'rgba(235,240,255,0.5)', fontWeight: 600}}>
										{readout.label}
									</span>
									<span style={{color: blink.white, fontWeight: 700}}>
										{readout.value}
									</span>
								</div>
							))}
						</div>
					</FloatingWindow>
				</Pop>
			</AbsoluteFill>

			<AbsoluteFill
				style={{
					alignItems: 'flex-end',
					justifyContent: 'flex-end',
					paddingBottom: 420,
					paddingRight: 44,
				}}
			>
				<Pop
					at={78}
					spring="popTight"
					preset="flyLeft"
					shadow
					out={166}
					exit="flyOutRight"
				>
					<FloatingWindow
						title="signal · 02"
						width={380}
						height={190}
						accent="#FF6B9D"
						tilt={-14}
						phase={2.1}
					>
						<div
							style={{
								fontFamily: fonts.display,
								fontSize: 30,
								fontWeight: 700,
								letterSpacing: '-0.02em',
								color: blink.white,
								lineHeight: 1.2,
							}}
						>
							les mots
							<br />
							pèsent autant
							<br />
							que les images
						</div>
					</FloatingWindow>
				</Pop>
			</AbsoluteFill>

			{/* La chute, volontairement décentrée : la symétrie parfaite est cassée
			    une fois par plan, jamais deux. */}
			<AbsoluteFill
				style={{
					alignItems: 'flex-start',
					justifyContent: 'flex-end',
					paddingBottom: 250,
					paddingLeft: 88,
				}}
			>
				<Pop at={104} spring="popSoft" preset="riseUp" out={172} exit="crush">
					<div
						style={{
							fontFamily: fonts.text,
							fontSize: 24,
							fontWeight: 700,
							letterSpacing: '0.2em',
							textTransform: 'uppercase',
							color: blink.sky,
							marginBottom: 10,
						}}
					>
						{kicker}
					</div>
				</Pop>
				<Pop at={108} spring="slam" preset="slamIn" out={174} exit="liftOut">
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 104,
							fontWeight: 800,
							letterSpacing: '-0.05em',
							color: blink.white,
							textShadow: '0 24px 60px rgba(0,6,20,0.85)',
						}}
					>
						{line}
					</div>
				</Pop>
			</AbsoluteFill>
		</BlinkStage>
	</Impact>
);
