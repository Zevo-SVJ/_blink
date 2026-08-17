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
	</>
);
