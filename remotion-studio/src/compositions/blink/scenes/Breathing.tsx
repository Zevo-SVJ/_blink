import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
import {cue, SfxTrack} from '@/audio';
import {Cadence, TypeBreath} from '@/components/kinetic';
import {blink, pop} from '@/design/blink';
import {Impact} from '@/motion/kinetic';

export const breathingSchema = z.object({
	first: z.string(),
	second: z.string(),
	third: z.string(),
});

export type BreathingProps = z.infer<typeof breathingSchema>;

export const breathingDefaults: BreathingProps = {
	first: 'NEUF IMAGES.',
	second: 'UNE BIO.',
	third: 'C’EST TOUT.',
};

/**
 * 00:07.8 — BREATHING  ·  180 frames utiles
 *
 * La respiration typographique. Trois écrans monochromes d'une seconde chacun,
 * séparés par des coupes franches. C'est le seul moment du film où l'image ne
 * contient qu'un texte — et c'est aussi, paradoxalement, le passage où la
 * couleur bouge le plus.
 *
 * L'inversion chromatique est le mécanisme central :
 *
 *   f000  jaune fluo, texte noir
 *   f060  noir, texte jaune fluo   ← inversion complète
 *   f120  orange fluo, texte noir  ← troisième valeur
 *
 * Trois aplats saturés en trois secondes, après quatre secondes de bleu nuit et
 * de quasi-noir. C'est cette respiration *chromatique* qui fait tenir un film
 * vertical de trente-sept secondes : sans elle, la variété des objets ne
 * compense jamais la monotonie d'une valeur de fond unique.
 *
 * Aucun de ces trois écrans ne dépasse une seconde. Un plan typographique long
 * est le degré zéro du motion design — il n'y a rien à explorer, donc la durée
 * est du temps mort par construction. Leur force vient de leur brièveté et de
 * leur violence, pas de leur lisibilité prolongée.
 *
 * La couche `Cadence` fournit ici l'évènement obligatoire toutes les 15 frames :
 * sur un écran de texte, le mouvement ne peut pas venir du texte lui-même sans
 * le rendre illisible.
 */

const HITS = [{at: 3, amplitude: 20, duration: 8, seed: 'b1', rotation: 1.1}];

/**
 * Un impact grave par écran, et un whoosh sur les deux coupes internes.
 *
 * Sur un plan typographique, le son fait tout le travail de rythme : l'image ne
 * contient qu'un mot, donc c'est la basse qui dit que quelque chose vient
 * d'arriver.
 */
const SFX_FIRST = [cue(3, 'impactThud')];
const SFX_NEXT = [cue(0, 'whooshFast', 0.3), cue(3, 'impactThud')];
const SFX_LAST = [cue(0, 'whooshFast', 0.3), cue(3, 'impactThud'), cue(48, 'whooshFast', 0.3)];

const PUNCH = [{at: 3, to: 1.18, rise: 5}];
const PUNCH_LAST = [
	{at: 3, to: 1.18, rise: 5},
	{at: 48, to: 0.9, rise: 10, hold: true},
];

// Le fond de la racine est celui du **dernier** battement : le recul de caméra
// de fin de plan découvre cette couleur, et découvrir du jaune sous un écran
// orange se verrait comme un défaut.
export const Breathing: React.FC<BreathingProps> = ({first, second, third}) => (
	<AbsoluteFill style={{backgroundColor: pop.flareHot}}>
		<Sequence durationInFrames={60} layout="none">
			<SfxTrack cues={SFX_FIRST} />
			<Impact hits={HITS} punches={PUNCH}>
				<TypeBreath
					words={[{text: first, scale: 1.15}]}
					background={pop.flare}
					color={pop.ink}
					kicker="CE QU’ILS ONT DE TOI"
					kickerColor={pop.ink}
					size={160}
					at={0}
					grain={false}
				/>
				<Cadence every={15} color={pop.ink} strength={0.55} />
			</Impact>
		</Sequence>

		<Sequence from={60} durationInFrames={60} layout="none">
			<SfxTrack cues={SFX_NEXT} />
			<Impact hits={HITS} punches={PUNCH}>
				<TypeBreath
					words={[{text: second, scale: 1.5}]}
					background={pop.ink}
					color={pop.flare}
					size={160}
					at={0}
					grain={false}
				/>
				<Cadence every={15} color={pop.flare} strength={0.8} />
			</Impact>
		</Sequence>

		<Sequence from={120} layout="none">
			<SfxTrack cues={SFX_LAST} />
			<Impact hits={HITS} punches={PUNCH_LAST}>
				<TypeBreath
					words={[{text: third, scale: 1.2, color: pop.ink}]}
					background={pop.flareHot}
					color={pop.ink}
					size={160}
					at={0}
					grain={false}
				/>
				{/* Le rappel de marque, minuscule, sur le seul écran orange : la
				    signature ne s'impose jamais pendant une respiration. */}
				<AbsoluteFill
					style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 220}}
				>
					<div
						style={{
							width: 96,
							height: 6,
							borderRadius: 3,
							background: blink.navy,
							opacity: 0.5,
						}}
					/>
				</AbsoluteFill>
				<Cadence every={15} color={pop.ink} strength={0.5} />
			</Impact>
		</Sequence>
	</AbsoluteFill>
);
