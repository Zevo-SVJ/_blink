import {springTiming, TransitionSeries} from '@remotion/transitions';
import {springs} from '@/motion/dynamics';
import {glassCut} from '@/motion/presentations';
import {DeviceShowcase, deviceShowcaseDefaults} from './DeviceShowcase';
import {FeatureShowcase, featureShowcaseDefaults} from './FeatureShowcase';
import {HeroReveal, heroRevealDefaults} from './HeroReveal';
import {SCENE_DURATIONS, TRANSITION_DURATION} from './manifest';

const transitionTiming = springTiming({
	config: springs.precise,
	durationInFrames: TRANSITION_DURATION,
});

const presentation = glassCut({blur: 18, scale: 0.07});

/**
 * Le montage complet. Chaque scène reste une composition autonome, rendable
 * seule : le reel ne fait que les enchaîner.
 */
export const Reel: React.FC = () => (
	<TransitionSeries>
		<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.HeroReveal}>
			<HeroReveal {...heroRevealDefaults} />
		</TransitionSeries.Sequence>

		<TransitionSeries.Transition
			presentation={presentation}
			timing={transitionTiming}
		/>

		<TransitionSeries.Sequence
			durationInFrames={SCENE_DURATIONS.FeatureShowcase}
		>
			<FeatureShowcase {...featureShowcaseDefaults} />
		</TransitionSeries.Sequence>

		<TransitionSeries.Transition
			presentation={presentation}
			timing={transitionTiming}
		/>

		<TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.DeviceShowcase}>
			<DeviceShowcase {...deviceShowcaseDefaults} />
		</TransitionSeries.Sequence>
	</TransitionSeries>
);
