import {linearTiming, springTiming, TransitionSeries} from '@remotion/transitions';
import {AbsoluteFill} from 'remotion';
import {blink, pop} from '@/design/blink';
import {springs} from '@/motion/dynamics';
import {diagonalSlash, matchCut, slideWhip, zoomThrough} from '@/motion/presentations';
import {BLINK_SCENES, BLINK_TRANSITIONS} from './manifest';
import {ActionPlan, actionPlanDefaults} from './scenes/ActionPlan';
import {Breathing, breathingDefaults} from './scenes/Breathing';
import {Contrast, contrastDefaults} from './scenes/Contrast';
import {Gap, gapDefaults} from './scenes/Gap';
import {Hook, hookDefaults} from './scenes/Hook';
import {Metaphor, metaphorDefaults} from './scenes/Metaphor';
import {Outro, outroDefaults} from './scenes/Outro';
import {Perception, perceptionDefaults} from './scenes/Perception';
import {Rhythm, rhythmDefaults} from './scenes/Rhythm';
import {ScanUi, scanUiDefaults} from './scenes/ScanUi';
import {ScoreHero, scoreHeroDefaults} from './scenes/ScoreHero';

/**
 * LE MONTAGE — 11 séquences, 10 raccords, 37,0 s
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUATRE RACCORDS, ET SEULEMENT QUATRE
 *
 * Le fondu enchaîné est banni. Deux images superposées à 50 % ne sont ni l'une
 * ni l'autre, et cette demi-seconde d'indécision est précisément l'endroit où
 * un spectateur décroche. Chacun des quatre raccords conservés déplace quelque
 * chose — l'échelle, le cadre, la trajectoire ou la découpe — donc chacun
 * maintient le mouvement pendant la coupe au lieu de le suspendre.
 *
 *   **zoomThrough** (scale-to-mask) — on entre *dans* le sujet. Trois emplois,
 *     tous à un changement d'échelle du récit : on plonge dans l'objectif, dans
 *     le résultat, dans la marque. Le plan sortant doit présenter au centre une
 *     surface pleine — un `<Portal>` — qui fait masque ;
 *
 *   **slideWhip** — le balayage vertical, geste du pouce. Trois emplois, aux
 *     endroits où le récit *change de sujet* sans changer d'échelle ;
 *
 *   **matchCut** — la trajectoire survit au raccord. **Un seul emploi**, entre
 *     la carte barrée qui tombe et la carte de regard qui reprend sa chute.
 *     Employé deux fois, le procédé deviendrait un effet ;
 *
 *   **diagonalSlash** — un trait ouvre l'image. Trois emplois, tous à une
 *     rupture de registre visuel : objet → viseur, typo fluo → viseur, objet →
 *     écran fendu. La diagonale est le seul angle absent du reste du film, donc
 *     le seul qui signale « on change de monde ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE SEULE MISE EN FORME, JAMAIS DEUX
 *
 * L'horloge de chaque raccord est un ressort (`whip` : 300 / 22 / 1, ζ ≈ 0,635)
 * et les présentations reçoivent donc `curve: 'linear'`. Empiler un ressort sur
 * la Bézier d'une présentation lisse deux fois le même mouvement : la
 * transition se termine dans son premier tiers puis se fige, ce qui se voit
 * immédiatement à l'image.
 *
 * `whip` plutôt que le `slideBig` de la version précédente : ~4 % de
 * dépassement au lieu de 9 %. Sur des raccords de 8 à 12 frames, un dépassement
 * de 9 % se lit comme un flottement. Le rebond appartient aux éléments, la
 * puissance appartient au cadre.
 *
 * Le `matchCut` fait exception et reçoit une horloge **linéaire** : la
 * continuité de trajectoire repose sur une vitesse de caméra constante, et un
 * ressort la ferait varier pendant le raccord — ce qui détruirait exactement ce
 * que le raccord cherche à produire.
 *
 * Le fond de marque est peint sous la série : un plan qui recule ou un joint
 * d'un pixel laisserait sinon apparaître du noir.
 */

/** Horloge commune : ressort `whip`, cadre rapide et peu élastique. */
const timing = (durationInFrames: number) =>
	springTiming({config: springs.whip, durationInFrames});

/**
 * Le match cut, lui, exige une vitesse strictement constante — d'où
 * `linearTiming`. Un ressort ferait varier la vitesse de la caméra pendant le
 * raccord, et c'est l'égalité des vitesses de part et d'autre de l'échange qui
 * fait tenir la continuité de trajectoire.
 */
const constant = (durationInFrames: number) => linearTiming({durationInFrames});

export const BlinkReel: React.FC = () => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		<TransitionSeries>
			{/* ── ACTE I — ON TE REGARDE ─────────────────────────────────────── */}
			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Hook}>
				<Hook {...hookDefaults} />
			</TransitionSeries.Sequence>

			{/* Rupture de registre : l'objet gravé cède au viseur. */}
			<TransitionSeries.Transition
				presentation={diagonalSlash({
					steepness: 72,
					direction: 'down',
					color: pop.flare,
					thickness: 9,
					curve: 'linear',
				})}
				timing={timing(BLINK_TRANSITIONS.hookToRhythm.frames)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Rhythm}>
				<Rhythm {...rhythmDefaults} />
			</TransitionSeries.Sequence>

			{/* On plonge dans l'objectif. */}
			<TransitionSeries.Transition
				presentation={zoomThrough({scale: 13, incomingScale: 0.74, blur: 20, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.rhythmToMetaphor.frames)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Metaphor}>
				<Metaphor {...metaphorDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={slideWhip({direction: 'up', overshoot: 0.035, blur: 36, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.metaphorToBreathing.frames)}
			/>

			{/* ── ACTE II — CE QU'ILS LISENT ─────────────────────────────────── */}
			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Breathing}>
				<Breathing {...breathingDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={diagonalSlash({
					steepness: 68,
					direction: 'up',
					color: pop.ink,
					thickness: 9,
					curve: 'linear',
				})}
				timing={timing(BLINK_TRANSITIONS.breathingToScanUi.frames)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.ScanUi}>
				<ScanUi {...scanUiDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={slideWhip({direction: 'up', overshoot: 0.04, blur: 38, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.scanUiToContrast.frames)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Contrast}>
				<Contrast {...contrastDefaults} />
			</TransitionSeries.Sequence>

			{/* LE match cut. La carte barrée tombe ; une carte de regard reprend
			    exactement sa trajectoire. */}
			<TransitionSeries.Transition
				presentation={matchCut({drift: 0.22, direction: 'down', swapAt: 0.5, blur: 18, flash: 0.12})}
				timing={constant(BLINK_TRANSITIONS.contrastToPerception.frames)}
			/>

			{/* ── ACTE III — CE QUE ÇA VAUT ──────────────────────────────────── */}
			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Perception}>
				<Perception {...perceptionDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={diagonalSlash({
					steepness: 70,
					direction: 'down',
					color: blink.white,
					thickness: 8,
					curve: 'linear',
				})}
				timing={timing(BLINK_TRANSITIONS.perceptionToGap.frames)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Gap}>
				<Gap {...gapDefaults} />
			</TransitionSeries.Sequence>

			{/* On plonge dans le résultat. */}
			<TransitionSeries.Transition
				presentation={zoomThrough({scale: 14, incomingScale: 0.72, blur: 22, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.gapToScoreHero.frames)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.ScoreHero}>
				<ScoreHero {...scoreHeroDefaults} />
			</TransitionSeries.Sequence>

			{/* ── ACTE IV — CE QUE TU EN FAIS ────────────────────────────────── */}
			<TransitionSeries.Transition
				presentation={slideWhip({direction: 'up', overshoot: 0.03, blur: 32, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.scoreHeroToActionPlan.frames)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.ActionPlan}>
				<ActionPlan {...actionPlanDefaults} />
			</TransitionSeries.Sequence>

			{/* On plonge dans la marque. */}
			<TransitionSeries.Transition
				presentation={zoomThrough({scale: 12, incomingScale: 0.78, blur: 18, curve: 'linear'})}
				timing={timing(BLINK_TRANSITIONS.actionPlanToOutro.frames)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Outro}>
				<Outro {...outroDefaults} />
			</TransitionSeries.Sequence>
		</TransitionSeries>
	</AbsoluteFill>
);
