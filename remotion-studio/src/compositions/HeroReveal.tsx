import {zColor} from '@remotion/zod-types';
import {AbsoluteFill} from 'remotion';
import {z} from 'zod';
import {ArrowRight, GlassPanel, LightSweep, Pill, Stage, Text} from '@/components';
import {palette} from '@/design/tokens';
import {FrameMotion, SplitText} from '@/motion';

export const heroRevealSchema = z.object({
	eyebrow: z.string(),
	title: z.string(),
	subtitle: z.string(),
	accent: zColor(),
	aurora: z.enum(['nebula', 'horizon', 'ember', 'forest', 'violet']),
	showSweep: z.boolean(),
});

export type HeroRevealProps = z.infer<typeof heroRevealSchema>;

export const heroRevealDefaults: HeroRevealProps = {
	eyebrow: 'Nouveau',
	title: 'Le mouvement,\ncomme un matériau',
	subtitle:
		'Un système d’animation déterministe : ce que vous voyez dans le studio est exactement ce qui sera rendu.',
	accent: palette.indigo,
	aurora: 'nebula',
	showSweep: true,
};

/**
 * Plan d'ouverture. La partition temporelle est explicite et lisible en une
 * fois — c'est ce qui rend une scène ajustable sans la casser.
 */
export const HeroReveal: React.FC<HeroRevealProps> = ({
	eyebrow,
	title,
	subtitle,
	accent,
	aurora,
	showSweep,
}) => (
	<Stage aurora={aurora}>
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 36,
				maxWidth: 1400,
			}}
		>
			<FrameMotion preset="glassPop" timing={{delay: 0, spring: 'gentle'}}>
				<Pill accent={accent}>
					<Text variant="label" tone="secondary">
						{eyebrow}
					</Text>
				</Pill>
			</FrameMotion>

			{/* Le titre monte mot par mot derrière un masque : la cascade doit
			    rester très serrée (2 frames) pour lire comme un seul geste. */}
			<Text variant="hero" align="center" style={{maxWidth: 1300}}>
				<SplitText
					text={title}
					by="word"
					preset="revealUp"
					step={2}
					timing={{delay: 8, spring: 'glide'}}
					align="center"
				/>
			</Text>

			<FrameMotion preset="riseIn" timing={{delay: 32, spring: 'gentle'}}>
				<Text
					variant="subtitle"
					tone="secondary"
					align="center"
					style={{maxWidth: 880}}
				>
					{subtitle}
				</Text>
			</FrameMotion>

			<FrameMotion preset="scaleIn" timing={{delay: 46, spring: 'snappy'}}>
				<GlassPanel radius={24} padding={0} glow={accent}>
					<div
						style={{
							position: 'relative',
							padding: '22px 44px',
							display: 'flex',
							alignItems: 'center',
							gap: 14,
							overflow: 'hidden',
						}}
					>
						<Text variant="caption">Découvrir le système</Text>
						<ArrowRight color={accent} size={20} />
						{showSweep ? (
							<LightSweep timing={{delay: 60, duration: 50}} opacity={0.5} />
						) : null}
					</div>
				</GlassPanel>
			</FrameMotion>
		</div>

		{/* Reflet de sol : ancre la scène au lieu de la laisser flotter. */}
		<AbsoluteFill
			style={{
				top: '72%',
				background: `radial-gradient(ellipse at 50% 0%, ${accent}22 0%, transparent 62%)`,
				pointerEvents: 'none',
			}}
		/>
	</Stage>
);
