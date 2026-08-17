import {springTiming, TransitionSeries} from '@remotion/transitions';
import {AbsoluteFill} from 'remotion';
import {blink} from '@/design/blink';
import {springs} from '@/motion/dynamics';
import {whipPan, wipeUp, zoomThrough} from '@/motion/presentations';
import {BLINK_SCENES, BLINK_TRANSITIONS} from './manifest';
import {Capture, captureDefaults} from './scenes/Capture';
import {Climb, climbDefaults} from './scenes/Climb';
import {Close, closeDefaults} from './scenes/Close';
import {Gaze, gazeDefaults} from './scenes/Gaze';
import {Identity, identityDefaults} from './scenes/Identity';
import {Lenses, lensesDefaults} from './scenes/Lenses';
import {Mirror, mirrorDefaults} from './scenes/Mirror';
import {Perception, perceptionDefaults} from './scenes/Perception';
import {Signals, signalsDefaults} from './scenes/Signals';
import {Verdict, verdictDefaults} from './scenes/Verdict';
import {
	Punchline,
	punchlineDefaults,
	Reveal,
	revealDefaults,
	Seconds,
	secondsDefaults,
} from './scenes/Breaths';

/**
 * LE MONTAGE — 13 plans, 12 transitions, 44,0 s
 *
 * Trois grammaires de raccord, et le choix n'est jamais décoratif :
 *
 *   **zoomThrough** — on entre *dans* le sujet. Réservé aux moments où le récit
 *     change d'échelle : on plonge dans la lumière, dans le scan, dans le
 *     résultat. Le plan sortant doit présenter au centre une surface pleine
 *     (un `<Portal>`, ou l'aplat d'un plan typographique) qui fait masque.
 *
 *   **whipPan** — on se déplace *à côté*. Sa direction **alterne**
 *     systématiquement : gauche, droite, gauche, droite. Deux filés de suite
 *     dans le même sens donneraient l'impression de tourner en rond.
 *
 *   **wipeUp** — la suite *recouvre*. Employé aux trois moments où le récit
 *     franchit un palier : on entre dans l'analyse, dans le retournement, dans
 *     la conclusion.
 *
 * **Une seule mise en forme, jamais deux.** L'horloge de chaque transition est
 * un ressort (`slideBig` : 220 / 18 / 1, ζ ≈ 0,61), et les présentations
 * reçoivent donc `curve: 'linear'`. Empiler un ressort sur la Bézier d'une
 * présentation lisse deux fois le même mouvement : la transition se termine
 * dans son premier tiers puis se fige, ce qui se voit immédiatement à l'image.
 *
 * Pourquoi le ressort plutôt que la Bézier : il apporte ~9 % de dépassement à
 * l'arrivée du plan. Le raccord se pose au lieu de s'arrêter net — c'est ce
 * léger débord qui rend l'enchaînement organique. Une courbe ne sait pas le
 * produire.
 *
 * Le dépassement reste modéré à dessein : faire osciller franchement l'image
 * entière la rendrait illisible. Le rebond appartient aux éléments.
 *
 * Le fond de marque est peint **sous** la série. Un plan qui recule (rideau) ou
 * un joint latéral d'un pixel (filé) laisserait sinon apparaître du noir — le
 * défaut le plus visible qui soit sur un fond sombre.
 */

const timing = (durationInFrames: number) =>
	springTiming({config: springs.slideBig, durationInFrames});

export const BlinkReel: React.FC = () => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		<TransitionSeries>
			{/* ── ACTE I — LA PERCEPTION ─────────────────────────────────────── */}
			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Perception}>
				<Perception {...perceptionDefaults} />
			</TransitionSeries.Sequence>

			{/* On plonge dans la lumière : le portail porte déjà le blanc cassé du
			    plan typographique qui suit. */}
			<TransitionSeries.Transition
				presentation={zoomThrough({scale: 13, incomingScale: 0.78, blur: 18, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.perceptionToSeconds)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Seconds}>
				<Seconds {...secondsDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={whipPan({direction: 'left', overshoot: 0.05, blur: 32, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.secondsToGaze)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Gaze}>
				<Gaze {...gazeDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={whipPan({direction: 'right', overshoot: 0.045, blur: 28, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.gazeToIdentity)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Identity}>
				<Identity {...identityDefaults} />
			</TransitionSeries.Sequence>

			{/* ── ACTE II — L'ANALYSE ────────────────────────────────────────── */}
			<TransitionSeries.Transition
				presentation={wipeUp({recede: 0.09, wave: 64, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.identityToCapture)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Capture}>
				<Capture {...captureDefaults} />
			</TransitionSeries.Sequence>

			{/* On plonge dans le scan. */}
			<TransitionSeries.Transition
				presentation={zoomThrough({scale: 14, incomingScale: 0.72, blur: 22, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.captureToSignals)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Signals}>
				<Signals {...signalsDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={whipPan({direction: 'left', overshoot: 0.055, blur: 34, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.signalsToPunchline)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Punchline}>
				<Punchline {...punchlineDefaults} />
			</TransitionSeries.Sequence>

			{/* ── ACTE III — LES REGARDS ─────────────────────────────────────── */}
			{/* L'aplat saturé fait masque à lui seul : aucun portail nécessaire. */}
			<TransitionSeries.Transition
				presentation={zoomThrough({scale: 11, incomingScale: 0.8, blur: 16, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.punchlineToLenses)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Lenses}>
				<Lenses {...lensesDefaults} />
			</TransitionSeries.Sequence>

			{/* Le fond clair monte et recouvre le bleu nuit. */}
			<TransitionSeries.Transition
				presentation={wipeUp({recede: 0.12, wave: 78, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.lensesToMirror)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Mirror}>
				<Mirror {...mirrorDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={whipPan({direction: 'right', overshoot: 0.05, blur: 30, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.mirrorToReveal)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Reveal}>
				<Reveal {...revealDefaults} />
			</TransitionSeries.Sequence>

			{/* ── ACTE IV — LA RÉVÉLATION ────────────────────────────────────── */}
			<TransitionSeries.Transition
				presentation={zoomThrough({scale: 12, incomingScale: 0.76, blur: 20, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.revealToVerdict)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Verdict}>
				<Verdict {...verdictDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={wipeUp({recede: 0.1, wave: 70, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.verdictToClimb)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Climb}>
				<Climb {...climbDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={whipPan({direction: 'left', overshoot: 0.04, blur: 26, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.climbToClose)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Close}>
				<Close {...closeDefaults} />
			</TransitionSeries.Sequence>
		</TransitionSeries>
	</AbsoluteFill>
);
