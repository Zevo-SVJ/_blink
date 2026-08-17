import {zColor} from '@remotion/zod-types';
import {AbsoluteFill, interpolate} from 'remotion';
import {z} from 'zod';
import {DeviceFrame, LightSweep, Pill, Stage, Text} from '@/components';
import {palette, radii} from '@/design/tokens';
import {FrameMotion, SplitText, useLoop, useProgress} from '@/motion';

export const deviceShowcaseSchema = z.object({
	eyebrow: z.string(),
	title: z.string(),
	body: z.string(),
	accent: zColor(),
	rows: z.array(z.string()),
	aurora: z.enum(['nebula', 'horizon', 'ember', 'forest', 'violet']),
});

export type DeviceShowcaseProps = z.infer<typeof deviceShowcaseSchema>;

export const deviceShowcaseDefaults: DeviceShowcaseProps = {
	eyebrow: 'Interface',
	title: 'Le même mouvement,\nde l’app à la vidéo',
	body: 'Les ressorts utilisés par Framer Motion dans l’interface alimentent aussi les scènes rendues par Remotion.',
	accent: palette.teal,
	rows: ['Ressorts partagés', 'Rendu déterministe', 'Prévisualisation live'],
	aurora: 'horizon',
};

/** Contenu de l'écran : un en-tête puis des lignes qui se posent en cascade. */
const ScreenContent: React.FC<{rows: string[]; accent: string}> = ({
	rows,
	accent,
}) => (
	<AbsoluteFill
		style={{
			padding: 24,
			paddingTop: 78,
			display: 'flex',
			flexDirection: 'column',
			gap: 12,
			background: `linear-gradient(180deg, ${accent}26 0%, ${palette.ink} 46%)`,
		}}
	>
		<FrameMotion preset="riseIn" timing={{delay: 38, spring: 'gentle'}}>
			<div style={{paddingBottom: 6}}>
				<Text variant="headline" style={{fontSize: 30}}>
					Aujourd’hui
				</Text>
				<Text variant="caption" tone="tertiary" style={{fontSize: 14}}>
					3 éléments synchronisés
				</Text>
			</div>
		</FrameMotion>

		{rows.map((row, index) => (
			<FrameMotion
				key={row}
				preset="slideLeft"
				timing={{delay: 46 + index * 6, spring: 'snappy'}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 14,
						padding: '16px 18px',
						borderRadius: radii.sm,
						background: 'rgba(255,255,255,0.07)',
						border: '1px solid rgba(255,255,255,0.09)',
					}}
				>
					<span
						style={{
							width: 30,
							height: 30,
							borderRadius: 10,
							background: `linear-gradient(140deg, ${accent}, ${accent}55)`,
							flexShrink: 0,
						}}
					/>
					<Text variant="caption" tone="secondary" style={{fontSize: 16}}>
						{row}
					</Text>
				</div>
			</FrameMotion>
		))}

		{/* Squelettes de contenu : suggèrent une app remplie sans détourner
		    l'attention du message. */}
		<FrameMotion preset="fade" timing={{delay: 76, duration: 24}}>
			<div style={{display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10}}>
				{[0.9, 0.72, 0.55].map((width, index) => (
					<div
						key={index}
						style={{
							height: 10,
							width: `${width * 100}%`,
							borderRadius: 999,
							background: 'rgba(255,255,255,0.06)',
						}}
					/>
				))}
			</div>
		</FrameMotion>
	</AbsoluteFill>
);

export const DeviceShowcase: React.FC<DeviceShowcaseProps> = ({
	eyebrow,
	title,
	body,
	accent,
	rows,
	aurora,
}) => {
	// L'appareil pivote très légèrement en continu : la perspective donne le
	// volume, la dérive lui donne la vie.
	const drift = useLoop(0.06);
	const entrance = useProgress({delay: 14, spring: 'gentle'});
	const rotateY = interpolate(entrance, [0, 1], [26, 12]) + Math.sin(drift) * 2.5;
	const translateY = Math.cos(drift * 0.9) * 10;

	return (
		<Stage aurora={aurora} justify="center">
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 120,
					width: '100%',
					maxWidth: 1620,
				}}
			>
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-start',
						gap: 30,
					}}
				>
					<FrameMotion preset="glassPop" timing={{spring: 'gentle'}}>
						<Pill accent={accent}>
							<Text variant="label" tone="secondary">
								{eyebrow}
							</Text>
						</Pill>
					</FrameMotion>

					<Text variant="title">
						<SplitText
							text={title}
							by="word"
							preset="revealUp"
							step={2}
							timing={{delay: 8, spring: 'glide'}}
						/>
					</Text>

					<FrameMotion preset="riseIn" timing={{delay: 30, spring: 'gentle'}}>
						<Text variant="body" tone="secondary" style={{maxWidth: 620}}>
							{body}
						</Text>
					</FrameMotion>
				</div>

				<FrameMotion
					preset="scaleIn"
					timing={{delay: 14, spring: 'gentle'}}
					style={{perspective: 2000}}
				>
					<div
						style={{
							transform: `perspective(2200px) rotateY(-${rotateY}deg) rotateX(3deg) translateY(${translateY}px)`,
							transformStyle: 'preserve-3d',
							position: 'relative',
						}}
					>
						<DeviceFrame width={382} glow={accent}>
							<ScreenContent rows={rows} accent={accent} />
						</DeviceFrame>
						<LightSweep
							timing={{delay: 70, duration: 60}}
							radius={radii.device}
							opacity={0.38}
						/>
					</div>
				</FrameMotion>
			</div>
		</Stage>
	);
};
