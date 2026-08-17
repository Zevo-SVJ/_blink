import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {ProfileCard} from '@/components/blink';
import {CameraChrome, FocusBox, LaserSweep} from '@/components/kinetic';
import {blink, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {Camera, Impact, Pop, Typewriter} from '@/motion/kinetic';

export const rhythmSchema = z.object({
	typed: z.string(),
	headline: z.string(),
	tail: z.string(),
});

export type RhythmProps = z.infer<typeof rhythmSchema>;

export const rhythmDefaults: RhythmProps = {
	typed: 'ANALYSE DU SUJET…',
	headline: '2 SECONDES',
	tail: 'POUR CONVAINCRE',
};

/**
 * 00:02.8 — RHYTHM  ·  120 frames utiles
 *
 * Rupture d'univers immédiate : on quitte l'objet gravé pour un **viseur**. Le
 * fond passe du bleu nuit à un quasi-noir, le vocabulaire devient celui de la
 * capture — marqueurs d'angle, voyant d'enregistrement, timecode, réglages.
 *
 * Ce plan est celui où la règle de cadence se tient toute seule : le timecode
 * change à chaque frame et le voyant clignote toutes les 30. Il n'y a
 * littéralement aucune frame immobile, sans qu'un seul élément de contenu ait
 * besoin de bouger.
 *
 *   f000  le chrome se referme sur l'image, les marqueurs venant de l'extérieur
 *   f010  le viseur accroche le sujet et vire au jaune — verrouillage
 *   f018  la ligne se tape, 1,2 frame par caractère
 *   f036  balayage laser sur le sujet
 *   f054  ▮ COUPE. Recadrage serré : le compte à rebours
 *   f054  « 2 » plein cadre, avec un arc qui se vide en deux secondes réelles
 *   f090  la chute — « POUR CONVAINCRE » — s'abat sous le chiffre
 */

const HITS_A = [
	{at: 10, amplitude: 14, duration: 6, seed: 'r1'},
	{at: 36, amplitude: 9, duration: 5, seed: 'r2'},
];

const HITS_B = [
	{at: 0, amplitude: 24, duration: 9, seed: 'r3', rotation: 1.3},
	{at: 36, amplitude: 18, duration: 7, seed: 'r4'},
];

/**
 * Repères sonores.
 *
 * L'obturateur ouvre le viseur, le bip verrouille le sujet, l'impact grave
 * tombe sur le chiffre. Trois sons, trois fonctions — jamais deux sons pour
 * dire la même chose.
 */
const SFX_A = [cue(0, 'cameraShutter'), cue(10, 'beep'), cue(36, 'whooshFast', 0.3)];
const SFX_B = [cue(0, 'impactThud'), cue(8, 'clickMechanic', 0.35), cue(36, 'beep', 0.3)];

/** Le punch tombe sur le chiffre, pas sur la phrase qui le suit. */
const PUNCH_B = [{at: 0, to: 1.22, rise: 5}];

const VIEWFINDER = '#07090F';

/**
 * Arc de compte à rebours.
 *
 * Il se vide en 120 frames — exactement les deux secondes annoncées. Le compte
 * à rebours n'illustre pas le propos : il **est** le propos, et le spectateur
 * peut le vérifier au chronomètre.
 */
const CountdownArc: React.FC<{duration: number; size: number}> = ({duration, size}) => {
	const frame = useCurrentFrame();
	const left = interpolate(frame, [0, duration], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const radius = size / 2 - 12;
	const circumference = 2 * Math.PI * radius;

	return (
		<svg width={size} height={size} style={{position: 'absolute', inset: 0}}>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke="rgba(250,250,250,0.12)"
				strokeWidth={10}
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke={pop.flare}
				strokeWidth={10}
				strokeLinecap="round"
				strokeDasharray={circumference}
				strokeDashoffset={circumference * (1 - left)}
				transform={`rotate(-90 ${size / 2} ${size / 2})`}
			/>
		</svg>
	);
};

export const Rhythm: React.FC<RhythmProps> = ({typed, headline, tail}) => (
	<AbsoluteFill style={{backgroundColor: VIEWFINDER}}>
		{/* ── BATTEMENT 1 · le viseur ───────────────────────────────────── */}
		<Sequence durationInFrames={54} layout="none">
			<SfxTrack cues={SFX_A} />
			<Impact hits={HITS_A}>
				<AbsoluteFill
					style={{
						backgroundColor: VIEWFINDER,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Camera moves={[{scale: 1.16, toScale: 1, timing: {duration: 54, easing: 'standard'}}]}>
						<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
							<div style={{position: 'relative'}}>
								<Pop at={0} spring="whip" preset="hardUp">
									<ProfileCard at={2} tilesAt={8} width={660} />
								</Pop>

								<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
									<FocusBox at={10} width={740} height={880} label="SUJET · VERROUILLÉ" />
								</AbsoluteFill>

								<LaserSweep at={36} duration={26} color={pop.flare} residue={0.06} />
							</div>
						</AbsoluteFill>
					</Camera>

					<CameraChrome at={0} label="LECTURE" />

					{/* La ligne tapée vit au-dessus du sujet, pas en dessous : l'étiquette
					    de verrouillage occupe déjà le bas du viseur, et deux textes
					    monospace superposés y deviendraient illisibles. */}
					<AbsoluteFill
						style={{
							alignItems: 'center',
							justifyContent: 'flex-start',
							paddingTop: 330,
						}}
					>
						<div
							style={{
								fontFamily: fonts.mono,
								fontSize: 34,
								letterSpacing: '0.12em',
								color: pop.flare,
							}}
						>
							<Typewriter text={typed} at={18} rate={1.2} />
						</div>
					</AbsoluteFill>
				</AbsoluteFill>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · le compte à rebours ─────────────────────────── */}
		<Sequence from={54} layout="none">
			<SfxTrack cues={SFX_B} />
			<Impact hits={HITS_B} punches={PUNCH_B}>
				<AbsoluteFill
					style={{
						backgroundColor: VIEWFINDER,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Camera moves={[{scale: 1.35, toScale: 1.02, timing: {duration: 30, easing: 'expo'}}]}>
						<AbsoluteFill
							style={{
								alignItems: 'center',
								justifyContent: 'center',
								flexDirection: 'column',
								gap: 30,
							}}
						>
							<div style={{position: 'relative', width: 560, height: 560}}>
								<CountdownArc duration={120} size={560} />
								<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
									<Pop at={0} spring="kick" preset="slamIn" squash={1.2}>
										<div
											style={{
												fontFamily: fonts.display,
												fontSize: 300,
												fontWeight: 800,
												letterSpacing: '-0.07em',
												color: blink.white,
												lineHeight: 1,
											}}
										>
											{headline.split(' ')[0]}
										</div>
									</Pop>
								</AbsoluteFill>
							</div>

							<Pop at={8} spring="kick" preset="hardUp">
								<div
									style={{
										fontFamily: fonts.display,
										fontSize: 84,
										fontWeight: 800,
										letterSpacing: '-0.04em',
										color: pop.flare,
									}}
								>
									{headline.split(' ').slice(1).join(' ')}
								</div>
							</Pop>

							<Pop at={36} spring="kick" preset="hardUp" squash={0.9}>
								<div
									style={{
										fontFamily: fonts.display,
										fontSize: 56,
										fontWeight: 700,
										letterSpacing: '0.02em',
										color: blink.gray,
									}}
								>
									{tail}
								</div>
							</Pop>
						</AbsoluteFill>
					</Camera>

					<CameraChrome at={0} label="COMPTE À REBOURS" settings={['2.0s', 'AF·C', 'ISO 800', 'REC']} />
				</AbsoluteFill>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
