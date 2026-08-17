import {AbsoluteFill, Sequence} from 'remotion';
import {z} from 'zod';
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
 * 00:07 — BREATHING  ·  180 frames utiles
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

export const Breathing: React.FC<BreathingProps> = ({first, second, third}) => (
	<AbsoluteFill style={{backgroundColor: pop.flare}}>
		<Sequence durationInFrames={60} layout="none">
			<Impact hits={HITS}>
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
			<Impact hits={HITS}>
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
			<Impact hits={HITS}>
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
