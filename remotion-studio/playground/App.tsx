import {Player} from '@remotion/player';
import {AnimatePresence, motion} from 'framer-motion';
import {useMemo, useState} from 'react';
import {SpringLab} from './SpringLab';
import {canvas, materials, palette, radii} from '@/design/tokens';
import {BlinkReel} from '@/compositions/blink/BlinkReel';
import {
	BLINK_REEL_DURATION,
	BLINK_SCENES,
} from '@/compositions/blink/manifest';
import {Capture, captureDefaults} from '@/compositions/blink/scenes/Capture';
import {Lenses, lensesDefaults} from '@/compositions/blink/scenes/Lenses';
import {
	Perception,
	perceptionDefaults,
} from '@/compositions/blink/scenes/Perception';
import {Verdict, verdictDefaults} from '@/compositions/blink/scenes/Verdict';
import {typeScale} from '@/design/typography';
import {DeviceShowcase, deviceShowcaseDefaults} from '@/compositions/DeviceShowcase';
import {
	FeatureShowcase,
	featureShowcaseDefaults,
} from '@/compositions/FeatureShowcase';
import {HeroReveal, heroRevealDefaults} from '@/compositions/HeroReveal';
import {REEL_DURATION, SCENE_DURATIONS} from '@/compositions/manifest';
import {Reel} from '@/compositions/Reel';
import {toSpringTransition} from '@/motion/adapters';

type SceneEntry = {
	id: string;
	label: string;
	blurb: string;
	component: React.ComponentType<Record<string, unknown>>;
	props: Record<string, unknown>;
	duration: number;
	/** Format de la composition. Les scènes Blink sont verticales. */
	width: number;
	height: number;
};

const asScene = (entry: SceneEntry): SceneEntry => entry;

const landscape = {
	width: canvas.landscape.width,
	height: canvas.landscape.height,
};
const vertical = {width: canvas.vertical.width, height: canvas.vertical.height};

const scenes: SceneEntry[] = [
	asScene({
		id: 'HeroReveal',
		label: 'Hero',
		blurb: 'Révélation de titre mot à mot, badge en verre et balayage lumineux.',
		component: HeroReveal as unknown as SceneEntry['component'],
		props: heroRevealDefaults as unknown as Record<string, unknown>,
		duration: SCENE_DURATIONS.HeroReveal,
		...landscape,
	}),
	asScene({
		id: 'FeatureShowcase',
		label: 'Features',
		blurb: 'Cascade de cartes translucides avec basculement 3D et dérive lente.',
		component: FeatureShowcase as unknown as SceneEntry['component'],
		props: featureShowcaseDefaults as unknown as Record<string, unknown>,
		duration: SCENE_DURATIONS.FeatureShowcase,
		...landscape,
	}),
	asScene({
		id: 'DeviceShowcase',
		label: 'Device',
		blurb: 'Mockup en perspective, contenu d’écran en cascade et parallaxe continue.',
		component: DeviceShowcase as unknown as SceneEntry['component'],
		props: deviceShowcaseDefaults as unknown as Record<string, unknown>,
		duration: SCENE_DURATIONS.DeviceShowcase,
		...landscape,
	}),
	asScene({
		id: 'Reel',
		label: 'Reel complet',
		blurb: 'Les trois plans enchaînés par la transition « glassCut ».',
		component: Reel as unknown as SceneEntry['component'],
		props: {},
		duration: REEL_DURATION,
		...landscape,
	}),

	// ── Piste Blink — langage kinetic, vertical 9:16 ──────────────────────
	asScene({
		id: 'Blink-Perception',
		label: 'Blink · Perception',
		blurb:
			'Quatre regards convergent pendant qu’une phrase s’abat en trois temps forts.',
		component: Perception as unknown as SceneEntry['component'],
		props: perceptionDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Perception,
		...vertical,
	}),
	asScene({
		id: 'Blink-Capture',
		label: 'Blink · Capture',
		blurb:
			'La carte tombe et s’écrase, le curseur clique, les éclats partent, la lecture démarre.',
		component: Capture as unknown as SceneEntry['component'],
		props: captureDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Capture,
		...vertical,
	}),
	asScene({
		id: 'Blink-Lenses',
		label: 'Blink · Regards',
		blurb:
			'Quatre lentilles en cascade alternée, avec tracé vectoriel et flottement déphasé.',
		component: Lenses as unknown as SceneEntry['component'],
		props: lensesDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Lenses,
		...vertical,
	}),
	asScene({
		id: 'Blink-Verdict',
		label: 'Blink · Verdict',
		blurb: 'Le score se dessine, le palier s’abat, l’appel à l’action reste.',
		component: Verdict as unknown as SceneEntry['component'],
		props: verdictDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Verdict,
		...vertical,
	}),
	asScene({
		id: 'Blink-Reel',
		label: 'Blink · Reel',
		blurb:
			'Les quatre plans enchaînés par zoom traversant, filé latéral et rideau montant.',
		component: BlinkReel as unknown as SceneEntry['component'],
		props: {},
		duration: BLINK_REEL_DURATION,
		...vertical,
	}),
];

/**
 * Playground interactif.
 *
 * Tout ce qui entoure le lecteur est animé par Framer Motion en temps réel
 * (`animate`, `AnimatePresence`, `layoutId`, gestes) — c'est exactement le
 * terrain où l'horloge navigateur est légitime. Le lecteur, lui, rejoue les
 * mêmes compositions que celles rendues en vidéo, à la frame près.
 */
export const App: React.FC = () => {
	const [activeId, setActiveId] = useState(scenes[0]!.id);
	const active = useMemo(
		() => scenes.find((scene) => scene.id === activeId) ?? scenes[0]!,
		[activeId],
	);

	return (
		<div
			style={{
				minHeight: '100%',
				display: 'grid',
				gridTemplateColumns: 'minmax(260px, 320px) 1fr',
				background: `radial-gradient(1200px 700px at 20% -10%, ${palette.indigo}22, transparent 60%), ${palette.void}`,
			}}
		>
			<aside
				style={{
					padding: 32,
					borderRight: '1px solid rgba(255,255,255,0.07)',
					display: 'flex',
					flexDirection: 'column',
					gap: 28,
				}}
			>
				<div>
					<div style={{...typeScale.label, color: palette.textTertiary}}>
						Motion Playground
					</div>
					<div
						style={{
							...typeScale.headline,
							fontSize: 28,
							marginTop: 10,
							color: palette.textPrimary,
						}}
					>
						Remotion × Framer Motion
					</div>
				</div>

				<nav style={{display: 'flex', flexDirection: 'column', gap: 6}}>
					{scenes.map((scene) => {
						const isActive = scene.id === active.id;
						return (
							<motion.button
								key={scene.id}
								onClick={() => setActiveId(scene.id)}
								whileHover={{x: 4}}
								whileTap={{scale: 0.98}}
								transition={toSpringTransition('snappy')}
								style={{
									position: 'relative',
									appearance: 'none',
									border: 'none',
									background: 'transparent',
									color: isActive
										? palette.textPrimary
										: palette.textSecondary,
									textAlign: 'left',
									padding: '14px 18px',
									borderRadius: radii.sm,
									cursor: 'pointer',
									font: 'inherit',
									fontSize: 16,
									fontWeight: 500,
								}}
							>
								{/* `layoutId` : l'indicateur glisse d'un onglet à l'autre au
								    lieu d'apparaître — impossible à obtenir proprement à la
								    main, trivial avec Framer Motion. */}
								{isActive ? (
									<motion.span
										layoutId="active-scene"
										transition={toSpringTransition('glide')}
										style={{
											position: 'absolute',
											inset: 0,
											borderRadius: radii.sm,
											background: 'rgba(255,255,255,0.08)',
											border: '1px solid rgba(255,255,255,0.12)',
										}}
									/>
								) : null}
								<span style={{position: 'relative'}}>{scene.label}</span>
							</motion.button>
						);
					})}
				</nav>

				<AnimatePresence mode="wait">
					<motion.p
						key={active.id}
						initial={{opacity: 0, y: 8}}
						animate={{opacity: 1, y: 0}}
						exit={{opacity: 0, y: -8}}
						transition={toSpringTransition('gentle')}
						style={{
							...typeScale.body,
							fontSize: 15,
							lineHeight: 1.55,
							color: palette.textSecondary,
							margin: 0,
						}}
					>
						{active.blurb}
					</motion.p>
				</AnimatePresence>

				<SpringLab />
			</aside>

			<main
				style={{
					padding: 40,
					display: 'flex',
					flexDirection: 'column',
					gap: 24,
					justifyContent: 'center',
				}}
			>
				<motion.div
					layout
					transition={toSpringTransition('gentle')}
					style={{
						borderRadius: radii.lg,
						overflow: 'hidden',
						// Largeur explicite plutôt que `maxWidth` : l'animation de
						// `layout` de Framer Motion a besoin d'une dimension définie,
						// sinon le conteneur s'effondre à zéro au changement de format.
						// Le 9:16 est bridé, sinon il déborde d'un écran d'ordinateur.
						width: active.height > active.width ? 420 : '100%',
						alignSelf: 'center',
						background: materials.glassDim.background,
						border: materials.glassDim.border,
						boxShadow: '0 48px 120px -32px rgba(0,0,0,0.8)',
					}}
				>
					<Player
						key={active.id}
						component={active.component}
						inputProps={active.props}
						durationInFrames={active.duration}
						compositionWidth={active.width}
						compositionHeight={active.height}
						fps={canvas.landscape.fps}
						controls
						loop
						autoPlay
						acknowledgeRemotionLicense
						style={{width: '100%', display: 'block'}}
					/>
				</motion.div>

				<div
					style={{
						...typeScale.caption,
						color: palette.textTertiary,
						textTransform: 'none',
						letterSpacing: 0,
					}}
				>
					Le lecteur exécute la composition frame par frame, exactement comme le
					rendu final. L’interface autour est animée en temps réel par Framer
					Motion.
				</div>
			</main>
		</div>
	);
};
