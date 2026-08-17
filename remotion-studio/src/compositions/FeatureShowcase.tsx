import {zColor} from '@remotion/zod-types';
import {z} from 'zod';
import {GlassPanel, LightSweep, Stage, Text} from '@/components';
import {palette, radii} from '@/design/tokens';
import {FrameMotion, SplitText, useLoop} from '@/motion';

export const featureShowcaseSchema = z.object({
	title: z.string(),
	features: z.array(
		z.object({
			label: z.string(),
			description: z.string(),
			color: zColor(),
		}),
	),
	aurora: z.enum(['nebula', 'horizon', 'ember', 'forest', 'violet']),
});

export type FeatureShowcaseProps = z.infer<typeof featureShowcaseSchema>;

export const featureShowcaseDefaults: FeatureShowcaseProps = {
	title: 'Trois couches, une seule horloge',
	features: [
		{
			label: 'Tokens',
			description:
				'Couleurs, matières, typographie et ressorts vivent au même endroit.',
			color: palette.blue,
		},
		{
			label: 'Frame',
			description:
				'Chaque progression dérive de la frame courante. Rendu reproductible.',
			color: palette.indigo,
		},
		{
			label: 'Scènes',
			description:
				'Des compositions typées, éditables en direct depuis le studio.',
			color: palette.pink,
		},
	],
	aurora: 'horizon',
};

const Card: React.FC<{
	index: number;
	label: string;
	description: string;
	color: string;
}> = ({index, label, description, color}) => {
	// Dérive lente et déphasée : les cartes ne respirent jamais à l'unisson.
	const drift = useLoop(0.08);
	const float = Math.sin(drift + index * 1.1) * 8;

	return (
		<FrameMotion
			preset="tiltIn"
			timing={{delay: 26 + index * 5, spring: 'gentle'}}
			style={{flex: 1, display: 'flex', transformOrigin: '50% 100%'}}
		>
			{/* `height: 100%` sur toute la chaîne : les cartes restent alignées
			    même si un texte est plus long que les autres. */}
			<div
				style={{
					transform: `translateY(${float}px)`,
					display: 'flex',
					width: '100%',
				}}
			>
				<GlassPanel
					radius={radii.xl}
					padding={44}
					glow={color}
					style={{flex: 1, boxSizing: 'border-box'}}
				>
					<div style={{display: 'flex', flexDirection: 'column', gap: 22}}>
						<div
							style={{
								width: 62,
								height: 62,
								borderRadius: radii.md,
								background: `linear-gradient(140deg, ${color} 0%, ${color}55 100%)`,
								boxShadow: `0 18px 44px -12px ${color}aa`,
							}}
						/>
						<Text variant="headline">{label}</Text>
						<Text variant="body" tone="secondary">
							{description}
						</Text>
					</div>
					<LightSweep
						timing={{delay: 40 + index * 6, duration: 55}}
						radius={radii.xl}
						opacity={0.32}
					/>
				</GlassPanel>
			</div>
		</FrameMotion>
	);
};

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({
	title,
	features,
	aurora,
}) => (
	<Stage aurora={aurora} justify="center">
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 72,
				width: '100%',
				maxWidth: 1560,
			}}
		>
			<Text variant="title" align="center">
				<SplitText
					text={title}
					by="word"
					preset="riseIn"
					step={1.5}
					timing={{delay: 0, spring: 'glide'}}
					align="center"
				/>
			</Text>

			<div style={{display: 'flex', gap: 36, alignItems: 'stretch'}}>
				{features.map((feature, index) => (
					<Card
						key={feature.label}
						index={index}
						label={feature.label}
						description={feature.description}
						color={feature.color}
					/>
				))}
			</div>
		</div>
	</Stage>
);
