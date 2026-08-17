import {Audio, Sequence, staticFile} from 'remotion';
import {VOICE_ENABLED, VOICE_MODE, VOICE_VOLUME, voice, voiceAt} from './voice';

/**
 * LA PISTE DE NARRATION.
 *
 * Elle vit au niveau du **montage** et non des scènes, pour une raison de
 * nature : une scène ne sait pas où elle se trouve dans le film, alors qu'une
 * réplique doit tomber à une frame absolue. `voiceAt()` la calcule depuis le
 * manifeste, donc allonger un plan déplace automatiquement tout ce qui suit.
 *
 * Le composant ne rend **rien** tant que `VOICE_ENABLED` est faux. Ce n'est pas
 * une précaution de confort : un `<Audio>` qui pointe sur un `staticFile`
 * absent fait échouer le rendu entier. Le drapeau est donc la seule chose qui
 * sépare un projet livrable sans voix d'un projet avec voix, et il reste à faux
 * tant que les fichiers ne sont pas déposés.
 *
 * En mode `single`, la piste est posée à la frame 0 et c'est l'enregistrement
 * qui porte la synchronisation. En mode `lines`, chaque réplique est placée à
 * sa frame : la voix reste collée aux marques même si le montage bouge.
 */
export const VoiceTrack: React.FC = () => {
	if (!VOICE_ENABLED) return null;

	if (VOICE_MODE === 'single') {
		return <Audio src={staticFile('vo/voiceover.mp3')} volume={VOICE_VOLUME} />;
	}

	return (
		<>
			{voice.map((item) => (
				<Sequence
					key={item.file}
					from={voiceAt(item)}
					layout="none"
					name={`vo:${item.file}`}
				>
					<Audio src={staticFile(item.file)} volume={VOICE_VOLUME} />
				</Sequence>
			))}
		</>
	);
};
