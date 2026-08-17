import {linearTiming, TransitionSeries} from '@remotion/transitions';
import {AbsoluteFill} from 'remotion';
import {blink} from '@/design/blink';
import {whipPan, wipeUp, zoomThrough} from '@/motion/presentations';
import {BLINK_SCENES, BLINK_TRANSITIONS} from './manifest';
import {Capture, captureDefaults} from './scenes/Capture';
import {Lenses, lensesDefaults} from './scenes/Lenses';
import {Perception, perceptionDefaults} from './scenes/Perception';
import {Verdict, verdictDefaults} from './scenes/Verdict';

/**
 * Le montage de la Phase 1.
 *
 * Trois transitions, trois intentions différentes — c'est le point de l'exercice :
 *
 *  1. **zoom traversant** Perception → Capture : on entre *dans* le sujet. Le
 *     portail de la scène 1 porte déjà la couleur de fond de la scène 2, donc
 *     le raccord est invisible.
 *  2. **filé latéral** Capture → Lenses : on se déplace *à côté*. Le
 *     balancement gauche/droite des cartes de la scène 3 prolonge ce mouvement
 *     — c'est le report de momentum.
 *  3. **rideau montant** Lenses → Verdict : la conclusion *recouvre*. Le plan
 *     sortant recule, ce qui crée la profondeur.
 *
 * Le `timing` est **linéaire** et l'easing vit dans la présentation. Empiler un
 * ressort sur la courbe d'une présentation lisse deux fois le même mouvement :
 * la transition se termine alors dans son premier tiers puis se fige, ce qui se
 * voit immédiatement à l'image. Une horloge, une courbe.
 *
 * Et jamais de ressort au montage : le rebond appartient aux éléments. Faire
 * osciller l'image entière la rend illisible.
 *
 * Le fond de marque est peint **sous** la série. Un plan qui recule (rideau) ou
 * un joint latéral d'un pixel (filé) laisserait sinon apparaître du noir — le
 * défaut le plus visible qui soit sur un fond sombre.
 */

const timing = (durationInFrames: number) => linearTiming({durationInFrames});

export const BlinkReel: React.FC = () => (
	<AbsoluteFill style={{backgroundColor: blink.navy}}>
		<TransitionSeries>
			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Perception}>
				<Perception {...perceptionDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={zoomThrough({scale: 13, incomingScale: 0.74, blur: 22})}
				timing={timing(BLINK_TRANSITIONS.zoom)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Capture}>
				<Capture {...captureDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={whipPan({direction: 'left', overshoot: 0.045, blur: 30})}
				timing={timing(BLINK_TRANSITIONS.whip)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Lenses}>
				<Lenses {...lensesDefaults} />
			</TransitionSeries.Sequence>

			<TransitionSeries.Transition
				presentation={wipeUp({recede: 0.1, wave: 70})}
				timing={timing(BLINK_TRANSITIONS.wipe)}
			/>

			<TransitionSeries.Sequence durationInFrames={BLINK_SCENES.Verdict}>
				<Verdict {...verdictDefaults} />
			</TransitionSeries.Sequence>
		</TransitionSeries>
	</AbsoluteFill>
);
