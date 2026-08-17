import {Audio, Sequence, staticFile} from 'remotion';
import type {SfxCue} from './sfx';
import {SFX} from './sfx';

export type SfxTrackProps = {
	/** Repères de la séquence, exprimés dans sa propre timeline. */
	cues: SfxCue[];
};

/**
 * LA PISTE D'EFFETS.
 *
 * Un `<Audio>` par repère, chacun enveloppé dans une `<Sequence from={at}>` :
 * c'est la manière dont Remotion place un son dans le temps. L'élément n'est
 * monté qu'à partir de sa frame de déclenchement, donc il démarre exactement
 * là — il n'y a pas de notion de « lecture en cours » à gérer.
 *
 * Trois raisons d'avoir un composant plutôt que des `<Audio>` dispersés dans
 * les scènes :
 *
 *   • **la synchronisation est déclarée, pas dispersée.** Chaque scène expose
 *     sa liste de repères en tête de fichier, à côté de ses `HITS` de secousse.
 *     Quand un timing d'animation bouge, le son est dans le même écran ;
 *   • **les volumes restent hiérarchisés.** Ils viennent du catalogue et non de
 *     la scène : impossible de poser un whoosh à 0,8 par distraction et
 *     d'écraser l'impact qu'il était censé accompagner ;
 *   • **une piste par séquence.** Les repères sont relatifs à la séquence, donc
 *     déplacer une séquence dans le montage emmène son son avec elle.
 *
 * Le composant est monté **à l'intérieur** de la scène, pas au niveau du
 * montage : une scène rendue seule dans le studio a donc son propre son, ce qui
 * permet de régler une synchro sans rejouer le film entier.
 */
export const SfxTrack: React.FC<SfxTrackProps> = ({cues}) => (
	<>
		{cues.map((item, index) => {
			const sound = SFX[item.sound];
			return (
				<Sequence
					key={`${item.sound}-${item.at}-${index}`}
					from={item.at}
					layout="none"
					name={`sfx:${item.sound}`}
				>
					<Audio
						src={staticFile(sound.file)}
						volume={item.volume ?? sound.volume}
						trimBefore={item.startFrom}
					/>
				</Sequence>
			);
		})}
	</>
);
