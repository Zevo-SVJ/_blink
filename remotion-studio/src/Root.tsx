import {Composition, Folder} from 'remotion';
import {canvas} from '@/design/tokens';
import {
	DeviceShowcase,
	deviceShowcaseDefaults,
	deviceShowcaseSchema,
} from './compositions/DeviceShowcase';
import {
	FeatureShowcase,
	featureShowcaseDefaults,
	featureShowcaseSchema,
} from './compositions/FeatureShowcase';
import {
	HeroReveal,
	heroRevealDefaults,
	heroRevealSchema,
} from './compositions/HeroReveal';
import {REEL_DURATION, SCENE_DURATIONS} from './compositions/manifest';
import {Reel} from './compositions/Reel';
import {BlinkReel} from './compositions/blink/BlinkReel';
import {BLINK_REEL_DURATION, BLINK_SCENES} from './compositions/blink/manifest';
import {
	Punchline,
	punchlineDefaults,
	punchlineSchema,
	Reveal,
	revealDefaults,
	revealSchema,
	Seconds,
	secondsDefaults,
	secondsSchema,
} from './compositions/blink/scenes/Breaths';
import {
	Capture,
	captureDefaults,
	captureSchema,
} from './compositions/blink/scenes/Capture';
import {Climb, climbDefaults, climbSchema} from './compositions/blink/scenes/Climb';
import {Close, closeDefaults, closeSchema} from './compositions/blink/scenes/Close';
import {Gaze, gazeDefaults, gazeSchema} from './compositions/blink/scenes/Gaze';
import {
	Identity,
	identityDefaults,
	identitySchema,
} from './compositions/blink/scenes/Identity';
import {
	Lenses,
	lensesDefaults,
	lensesSchema,
} from './compositions/blink/scenes/Lenses';
import {
	Mirror,
	mirrorDefaults,
	mirrorSchema,
} from './compositions/blink/scenes/Mirror';
import {
	Perception,
	perceptionDefaults,
	perceptionSchema,
} from './compositions/blink/scenes/Perception';
import {
	Signals,
	signalsDefaults,
	signalsSchema,
} from './compositions/blink/scenes/Signals';
import {
	Verdict,
	verdictDefaults,
	verdictSchema,
} from './compositions/blink/scenes/Verdict';

/**
 * Catalogue des compositions.
 *
 * Chaque scène expose un schéma Zod : le studio génère automatiquement un
 * éditeur de props typé dans la barre latérale, et les mêmes props peuvent
 * être passées au rendu via `--props`. C'est ce qui rend le projet réutilisable
 * (décliner une vidéo par client, par langue, par produit) sans toucher au code.
 */
export const RemotionRoot: React.FC = () => (
	<>
		<Folder name="Scenes">
			<Composition
				id="HeroReveal"
				component={HeroReveal}
				schema={heroRevealSchema}
				defaultProps={heroRevealDefaults}
				durationInFrames={SCENE_DURATIONS.HeroReveal}
				{...canvas.landscape}
			/>

			<Composition
				id="FeatureShowcase"
				component={FeatureShowcase}
				schema={featureShowcaseSchema}
				defaultProps={featureShowcaseDefaults}
				durationInFrames={SCENE_DURATIONS.FeatureShowcase}
				{...canvas.landscape}
			/>

			<Composition
				id="DeviceShowcase"
				component={DeviceShowcase}
				schema={deviceShowcaseSchema}
				defaultProps={deviceShowcaseDefaults}
				durationInFrames={SCENE_DURATIONS.DeviceShowcase}
				{...canvas.landscape}
			/>
		</Folder>

		<Folder name="Edits">
			<Composition
				id="Reel"
				component={Reel}
				durationInFrames={REEL_DURATION}
				{...canvas.landscape}
			/>
		</Folder>

		<Folder name="Social">
			{/* Même scène, cadrage vertical : la mise en page est fluide, donc
			    aucune duplication de composant n'est nécessaire. */}
			<Composition
				id="HeroReveal-Vertical"
				component={HeroReveal}
				schema={heroRevealSchema}
				defaultProps={heroRevealDefaults}
				durationInFrames={SCENE_DURATIONS.HeroReveal}
				{...canvas.vertical}
			/>
		</Folder>

		{/*
		 * Piste Blink — langage « kinetic », vertical 9:16.
		 *
		 * Vocabulaire de mouvement volontairement distinct de celui des scènes
		 * paysage ci-dessus : ressorts sous-amortis, sorties en courbe `back`,
		 * squash, secousses. Les deux langages cohabitent sans se mélanger.
		 */}
		<Folder name="Blink">
			<Composition
				id="Blink-Perception"
				component={Perception}
				schema={perceptionSchema}
				defaultProps={perceptionDefaults}
				durationInFrames={BLINK_SCENES.Perception}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Seconds"
				component={Seconds}
				schema={secondsSchema}
				defaultProps={secondsDefaults}
				durationInFrames={BLINK_SCENES.Seconds}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Gaze"
				component={Gaze}
				schema={gazeSchema}
				defaultProps={gazeDefaults}
				durationInFrames={BLINK_SCENES.Gaze}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Identity"
				component={Identity}
				schema={identitySchema}
				defaultProps={identityDefaults}
				durationInFrames={BLINK_SCENES.Identity}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Capture"
				component={Capture}
				schema={captureSchema}
				defaultProps={captureDefaults}
				durationInFrames={BLINK_SCENES.Capture}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Signals"
				component={Signals}
				schema={signalsSchema}
				defaultProps={signalsDefaults}
				durationInFrames={BLINK_SCENES.Signals}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Punchline"
				component={Punchline}
				schema={punchlineSchema}
				defaultProps={punchlineDefaults}
				durationInFrames={BLINK_SCENES.Punchline}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Lenses"
				component={Lenses}
				schema={lensesSchema}
				defaultProps={lensesDefaults}
				durationInFrames={BLINK_SCENES.Lenses}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Mirror"
				component={Mirror}
				schema={mirrorSchema}
				defaultProps={mirrorDefaults}
				durationInFrames={BLINK_SCENES.Mirror}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Reveal"
				component={Reveal}
				schema={revealSchema}
				defaultProps={revealDefaults}
				durationInFrames={BLINK_SCENES.Reveal}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Verdict"
				component={Verdict}
				schema={verdictSchema}
				defaultProps={verdictDefaults}
				durationInFrames={BLINK_SCENES.Verdict}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Climb"
				component={Climb}
				schema={climbSchema}
				defaultProps={climbDefaults}
				durationInFrames={BLINK_SCENES.Climb}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Close"
				component={Close}
				schema={closeSchema}
				defaultProps={closeDefaults}
				durationInFrames={BLINK_SCENES.Close}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Reel"
				component={BlinkReel}
				durationInFrames={BLINK_REEL_DURATION}
				{...canvas.vertical}
			/>
		</Folder>
	</>
);
