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
	ActionPlan,
	actionPlanDefaults,
	actionPlanSchema,
} from './compositions/blink/scenes/ActionPlan';
import {
	Breathing,
	breathingDefaults,
	breathingSchema,
} from './compositions/blink/scenes/Breathing';
import {
	Contrast,
	contrastDefaults,
	contrastSchema,
} from './compositions/blink/scenes/Contrast';
import {Gap, gapDefaults, gapSchema} from './compositions/blink/scenes/Gap';
import {Hook, hookDefaults, hookSchema} from './compositions/blink/scenes/Hook';
import {
	Metaphor,
	metaphorDefaults,
	metaphorSchema,
} from './compositions/blink/scenes/Metaphor';
import {Outro, outroDefaults, outroSchema} from './compositions/blink/scenes/Outro';
import {
	Perception,
	perceptionDefaults,
	perceptionSchema,
} from './compositions/blink/scenes/Perception';
import {Rhythm, rhythmDefaults, rhythmSchema} from './compositions/blink/scenes/Rhythm';
import {ScanUi, scanUiDefaults, scanUiSchema} from './compositions/blink/scenes/ScanUi';
import {
	ScoreHero,
	scoreHeroDefaults,
	scoreHeroSchema,
} from './compositions/blink/scenes/ScoreHero'

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
			{/*
			 * Chaque séquence est aussi une composition autonome : c'est ce qui
			 * permet de scruber un battement isolé dans le studio sans rejouer les
			 * trente-sept secondes. Sa durée inclut le raccord qu'elle partage avec
			 * la suivante, donc elle est légèrement plus longue que sa durée utile.
			 */}
			<Composition
				id="Blink-Hook"
				component={Hook}
				schema={hookSchema}
				defaultProps={hookDefaults}
				durationInFrames={BLINK_SCENES.Hook}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Rhythm"
				component={Rhythm}
				schema={rhythmSchema}
				defaultProps={rhythmDefaults}
				durationInFrames={BLINK_SCENES.Rhythm}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Metaphor"
				component={Metaphor}
				schema={metaphorSchema}
				defaultProps={metaphorDefaults}
				durationInFrames={BLINK_SCENES.Metaphor}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Breathing"
				component={Breathing}
				schema={breathingSchema}
				defaultProps={breathingDefaults}
				durationInFrames={BLINK_SCENES.Breathing}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-ScanUi"
				component={ScanUi}
				schema={scanUiSchema}
				defaultProps={scanUiDefaults}
				durationInFrames={BLINK_SCENES.ScanUi}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Contrast"
				component={Contrast}
				schema={contrastSchema}
				defaultProps={contrastDefaults}
				durationInFrames={BLINK_SCENES.Contrast}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Perception"
				component={Perception}
				schema={perceptionSchema}
				defaultProps={perceptionDefaults}
				durationInFrames={BLINK_SCENES.Perception}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Gap"
				component={Gap}
				schema={gapSchema}
				defaultProps={gapDefaults}
				durationInFrames={BLINK_SCENES.Gap}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-ScoreHero"
				component={ScoreHero}
				schema={scoreHeroSchema}
				defaultProps={scoreHeroDefaults}
				durationInFrames={BLINK_SCENES.ScoreHero}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-ActionPlan"
				component={ActionPlan}
				schema={actionPlanSchema}
				defaultProps={actionPlanDefaults}
				durationInFrames={BLINK_SCENES.ActionPlan}
				{...canvas.vertical}
			/>

			<Composition
				id="Blink-Outro"
				component={Outro}
				schema={outroSchema}
				defaultProps={outroDefaults}
				durationInFrames={BLINK_SCENES.Outro}
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
