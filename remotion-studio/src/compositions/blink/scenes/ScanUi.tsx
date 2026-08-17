import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {
	Cadence,
	CameraChrome,
	FocusBox,
	LaserSweep,
	NodeField,
	PhotoGrid,
	Radar,
	Toast,
} from '@/components/kinetic';
import {blink, pop} from '@/design/blink';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {Camera, Impact, Pop} from '@/motion/kinetic';

export const scanUiSchema = z.object({
	signals: z.array(z.object({label: z.string(), value: z.string()})),
	axes: z.array(z.object({label: z.string(), value: z.number()})),
	readout: z.string(),
});

export type ScanUiProps = z.infer<typeof scanUiSchema>;

export const scanUiDefaults: ScanUiProps = {
	signals: [
		{label: 'Cadrage', value: 'serré · frontal'},
		{label: 'Palette', value: 'froide · constante'},
		{label: 'Mots', value: 'courts · sûrs'},
		{label: 'Regard', value: 'direct'},
	],
	axes: [
		{label: 'Clarté', value: 0.82},
		{label: 'Chaleur', value: 0.46},
		{label: 'Énergie', value: 0.68},
		{label: 'Cohérence', value: 0.9},
		{label: 'Audace', value: 0.54},
	],
	readout: 'LECTURE · 9 SIGNAUX',
};

/**
 * 00:10.8 — SCAN UI  ·  240 frames utiles
 *
 * Retour au viseur, mais cette fois l'instrument travaille. Quatre battements
 * de 60 frames, chacun avec une composition différente — c'est la séquence la
 * plus longue du film, donc celle qui avait le plus besoin d'être découpée.
 *
 *   f000  ▮ la grille se construit en diagonale, le laser fait sa première passe
 *   f060  ▮ COUPE. Les signaux extraits arrivent en cascade par-dessus la grille
 *   f120  ▮ COUPE. La machinerie : radar de perception, champ de nœuds
 *   f180  ▮ COUPE. Le relevé : trois axes de lecture, verrouillés un par un
 *
 * La grille est faite de dégradés indexés, jamais de photographies, et ne
 * reproduit aucune interface existante — c'est une grille de vignettes, une
 * forme qui appartient à tout le monde.
 *
 * Le laser passe **deux fois** : une première passe rapide qui découvre, une
 * seconde plus lente qui mesure. Deux passes identiques auraient été une
 * répétition ; deux passes de vitesses différentes racontent une progression.
 */

const HITS_A = [
	{at: 4, amplitude: 12, duration: 6, seed: 's1'},
	{at: 34, amplitude: 8, duration: 5, seed: 's2'},
];
const HITS_B = [
	{at: 6, amplitude: 10, duration: 5, seed: 's3'},
	{at: 22, amplitude: 10, duration: 5, seed: 's4'},
	{at: 40, amplitude: 14, duration: 6, seed: 's5'},
];
const HITS_C = [{at: 8, amplitude: 16, duration: 7, seed: 's6', rotation: 1}];
const HITS_D = [
	{at: 4, amplitude: 12, duration: 6, seed: 's7'},
	{at: 30, amplitude: 18, duration: 7, seed: 's8', rotation: 1.2},
];

/**
 * Le viseur s'ouvre à l'obturateur, les signaux cliquent, le relevé frappe.
 * Le balayage laser a son propre whoosh : un instrument qui traverse l'image
 * sans qu'on l'entende n'aurait aucune matière.
 */
const SFX_A = [cue(0, 'cameraShutter'), cue(18, 'whooshFast', 0.3)];
const SFX_B = [
	cue(0, 'whooshFast', 0.26),
	cue(4, 'clickMechanic', 0.3),
	cue(8, 'clickMechanic', 0.3),
	cue(12, 'clickMechanic', 0.3),
	cue(16, 'clickMechanic', 0.3),
];
const SFX_C = [cue(4, 'beep', 0.32)];
const SFX_D = [
	cue(2, 'clickMechanic', 0.3),
	cue(8, 'clickMechanic', 0.3),
	cue(14, 'impactThud'),
	cue(30, 'beep', 0.32),
	cue(48, 'whooshFast', 0.3),
];

const PUNCH_D = [
	{at: 14, to: 1.16, rise: 5},
	{at: 48, to: 0.9, rise: 10, hold: true},
];

const SCAN_BG = '#050B18';

export const ScanUi: React.FC<ScanUiProps> = ({signals, axes, readout}) => (
	<AbsoluteFill style={{backgroundColor: SCAN_BG}}>
		{/* ── BATTEMENT 1 · la grille sous le laser ─────────────────────── */}
		<Sequence durationInFrames={60} layout="none">
			<SfxTrack cues={SFX_A} />
			<Impact hits={HITS_A}>
				<AbsoluteFill
					style={{backgroundColor: SCAN_BG, alignItems: 'center', justifyContent: 'center'}}
				>
					<Camera moves={[{scale: 1.1, toScale: 1, timing: {duration: 60, easing: 'standard'}}]}>
						<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
							<div style={{position: 'relative'}}>
								<PhotoGrid at={0} step={STAGGER.tight} tile={228} />
								<LaserSweep at={18} duration={30} color={blink.sky} residue={0.08} />
							</div>
						</AbsoluteFill>
					</Camera>

					<CameraChrome at={0} label={readout} settings={['SCAN', '9 ITEMS', 'v1.4', 'REC']} />
				</AbsoluteFill>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 2 · les signaux extraits ────────────────────────── */}
		<Sequence from={60} durationInFrames={60} layout="none">
			<SfxTrack cues={SFX_B} />
			<Impact hits={HITS_B}>
				<AbsoluteFill style={{backgroundColor: SCAN_BG}}>
					{/* La grille recule et se floute : elle devient la source, pas le
					    sujet. */}
					<AbsoluteFill
						style={{
							alignItems: 'center',
							justifyContent: 'center',
							filter: 'blur(7px)',
							opacity: 0.4,
						}}
					>
						<PhotoGrid at={-40} step={0} tile={228} />
					</AbsoluteFill>

					<LaserSweep at={0} duration={58} color={pop.flare} residue={0.05} thickness={2} />

					<AbsoluteFill
						style={{
							alignItems: 'center',
							justifyContent: 'center',
							flexDirection: 'column',
							gap: 20,
						}}
					>
						{signals.map((signal, index) => (
							<Pop
								key={signal.label}
								at={4 + index * STAGGER.wide}
								spring="kick"
								preset={index % 2 === 0 ? 'flyRight' : 'flyLeft'}
								tilt
								index={index}
							>
								<Toast width={720} fontFamily={fonts.text} accent={blink.sky}>
									<span style={{display: 'flex', gap: 14, alignItems: 'baseline'}}>
										<span style={{fontSize: 32, fontWeight: 700, color: blink.white}}>
											{signal.label}
										</span>
										<span style={{fontSize: 27, fontWeight: 500, color: blink.gray}}>
											{signal.value}
										</span>
									</span>
								</Toast>
							</Pop>
						))}
					</AbsoluteFill>

					<CameraChrome at={0} label="EXTRACTION" settings={['SIG', '4/9', 'OK', 'REC']} />
				</AbsoluteFill>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 3 · la machinerie ───────────────────────────────── */}
		<Sequence from={120} durationInFrames={60} layout="none">
			<SfxTrack cues={SFX_C} />
			<Impact hits={HITS_C}>
				<AbsoluteFill style={{backgroundColor: SCAN_BG}}>
					<NodeField
						at={0}
						width={1080}
						height={1920}
						count={30}
						color={blink.sky2}
						linkColor="rgba(142,213,246,0.2)"
					/>

					<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
						<Radar
							at={4}
							axes={axes}
							size={760}
							duration={30}
							color={blink.skyBright}
							fontFamily={fonts.text}
						/>
					</AbsoluteFill>

					<Cadence every={15} color={blink.sky} strength={0.6} />
					<CameraChrome at={0} label="MODÈLE" settings={['5 AXES', 'CONF 0.91', '—', 'REC']} />
				</AbsoluteFill>
			</Impact>
		</Sequence>

		{/* ── BATTEMENT 4 · le relevé ───────────────────────────────────── */}
		<Sequence from={180} layout="none">
			<SfxTrack cues={SFX_D} />
			<Impact hits={HITS_D} punches={PUNCH_D}>
				<AbsoluteFill style={{backgroundColor: SCAN_BG}}>
					<AbsoluteFill
						style={{
							alignItems: 'center',
							justifyContent: 'center',
							flexDirection: 'column',
							gap: 34,
						}}
					>
						{['LE CADRAGE', 'LES COULEURS', 'LES MOTS'].map((label, index) => (
							<Pop
								key={label}
								at={2 + index * STAGGER.marked}
								spring="kick"
								preset="slamIn"
								squash={1}
							>
								<div
									style={{
										fontFamily: fonts.display,
										fontSize: 104,
										fontWeight: 800,
										letterSpacing: '-0.05em',
										color: index === 1 ? pop.flare : blink.white,
									}}
								>
									{label}
								</div>
							</Pop>
						))}
					</AbsoluteFill>

					<AbsoluteFill style={{display: 'grid', placeItems: 'center'}}>
						<FocusBox at={30} width={880} height={620} label="TOUT EST LU" />
					</AbsoluteFill>

					<Cadence every={15} offset={5} color={pop.flare} strength={0.5} />
					<CameraChrome at={0} label="RELEVÉ" settings={['3 AXES', 'LOCK', '100%', 'REC']} />
				</AbsoluteFill>
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
