import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {
	VOICE_ENABLED,
	VOICE_MODE,
	VOICE_VOLUME,
	voice,
	voiceAt,
	voiceSegments,
} from './voice';

/**
 * LA PISTE DE NARRATION.
 *
 * Elle vit au niveau du **montage** et non des scènes, pour une raison de
 * nature : une scène ne sait pas où elle se trouve dans le film, alors qu'une
 * réplique doit tomber à une frame absolue.
 *
 * Le composant ne rend **rien** tant que `VOICE_ENABLED` est faux. Ce n'est pas
 * une précaution de confort : un `<Audio>` qui pointe sur un `staticFile`
 * absent fait échouer le rendu entier.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TROIS MODES
 *
 * `single`   — le fichier entier à la frame 0. La synchronisation dépend alors
 *   entièrement des silences enregistrés, et la moindre différence de débit
 *   dérive — la dérive **s'accumule**, donc la dernière phrase est toujours la
 *   plus fausse.
 *
 * `segments` — **le mode en service.** Le même fichier unique, mais lu par
 *   tranches : `trimBefore` et `trimAfter` délimitent l'intervalle à jouer,
 *   `<Sequence from>` décide où il tombe dans le film. Chaque tranche repart de
 *   sa propre marque, donc la dérive ne peut plus s'accumuler — et il n'y a
 *   aucun fichier intermédiaire à produire ni à ré-encoder.
 *
 * `lines`    — un fichier par réplique. Le plus robuste si l'enregistrement est
 *   commandé phrase par phrase, mais il suppose treize fichiers.
 *
 * Détail d'implémentation : `trimBefore` et `trimAfter` s'expriment en frames de
 * la composition, pas en secondes — d'où la conversion par `fps`, faite ici et
 * nulle part ailleurs pour que la table de calage reste lisible en secondes.
 */
export const VoiceTrack: React.FC = () => {
	const {fps} = useVideoConfig();

	if (!VOICE_ENABLED) return null;

	if (VOICE_MODE === 'single') {
		return <Audio src={staticFile('vo/voiceover.mp3')} volume={VOICE_VOLUME} />;
	}

	if (VOICE_MODE === 'segments') {
		return (
			<>
				{voiceSegments.map((segment) => (
					<Sequence
						key={`${segment.from}-${segment.at}`}
						from={Math.round(segment.at * fps)}
						durationInFrames={Math.ceil((segment.to - segment.from) * fps)}
						layout="none"
						name={`vo:${segment.at.toFixed(1)}s`}
					>
						<Audio
							src={staticFile('vo/voiceover.mp3')}
							volume={VOICE_VOLUME}
							trimBefore={Math.round(segment.from * fps)}
							trimAfter={Math.round(segment.to * fps)}
						/>
					</Sequence>
				))}
			</>
		);
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
