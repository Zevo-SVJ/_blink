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
import {ActionPlan, actionPlanDefaults} from '@/compositions/blink/scenes/ActionPlan';
import {Breathing, breathingDefaults} from '@/compositions/blink/scenes/Breathing';
import {Contrast, contrastDefaults} from '@/compositions/blink/scenes/Contrast';
import {Gap, gapDefaults} from '@/compositions/blink/scenes/Gap';
import {Hook, hookDefaults} from '@/compositions/blink/scenes/Hook';
import {Metaphor, metaphorDefaults} from '@/compositions/blink/scenes/Metaphor';
import {Outro, outroDefaults} from '@/compositions/blink/scenes/Outro';
import {
	Perception,
	perceptionDefaults,
} from '@/compositions/blink/scenes/Perception';
import {Rhythm, rhythmDefaults} from '@/compositions/blink/scenes/Rhythm';
import {ScanUi, scanUiDefaults} from '@/compositions/blink/scenes/ScanUi';
import {ScoreHero, scoreHeroDefaults} from '@/compositions/blink/scenes/ScoreHero';
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

	// ── Piste Blink — régime haute rétention, vertical 9:16 ───────────────
	asScene({
		id: 'Blink-Hook',
		label: 'Blink · Hook',
		blurb: 'Médaillon gravé en très gros plan, tampon fluo, phrase en trois frappes.',
		component: Hook as unknown as SceneEntry['component'],
		props: hookDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Hook,
		...vertical,
	}),
	asScene({
		id: 'Blink-Rhythm',
		label: 'Blink · Rhythm',
		blurb: 'Viseur de capture : verrouillage, laser, compte à rebours de deux secondes.',
		component: Rhythm as unknown as SceneEntry['component'],
		props: rhythmDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Rhythm,
		...vertical,
	}),
	asScene({
		id: 'Blink-Metaphor',
		label: 'Blink · Metaphor',
		blurb: 'Sphère centrale et rafale de clics — six regards en quarante frames.',
		component: Metaphor as unknown as SceneEntry['component'],
		props: metaphorDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Metaphor,
		...vertical,
	}),
	asScene({
		id: 'Blink-Breathing',
		label: 'Blink · Breathing',
		blurb: 'Trois aplats fluo d’une seconde, avec inversion chromatique complète.',
		component: Breathing as unknown as SceneEntry['component'],
		props: breathingDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Breathing,
		...vertical,
	}),
	asScene({
		id: 'Blink-ScanUi',
		label: 'Blink · ScanUi',
		blurb: 'Grille scannée au laser, signaux extraits, radar, relevé final.',
		component: ScanUi as unknown as SceneEntry['component'],
		props: scanUiDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.ScanUi,
		...vertical,
	}),
	asScene({
		id: 'Blink-Contrast',
		label: 'Blink · Contrast',
		blurb: 'Profil terne, croix au feutre, refus plein cadre — puis la chute.',
		component: Contrast as unknown as SceneEntry['component'],
		props: contrastDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Contrast,
		...vertical,
	}),
	asScene({
		id: 'Blink-Perception',
		label: 'Blink · Perception',
		blurb: 'Quatre cartes distribuées comme un paquet, puis ouvertes en éventail.',
		component: Perception as unknown as SceneEntry['component'],
		props: perceptionDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Perception,
		...vertical,
	}),
	asScene({
		id: 'Blink-Gap',
		label: 'Blink · Gap',
		blurb: 'Écran fendu en diagonale : intention en vert, perception en orange.',
		component: Gap as unknown as SceneEntry['component'],
		props: gapDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Gap,
		...vertical,
	}),
	asScene({
		id: 'Blink-ScoreHero',
		label: 'Blink · ScoreHero',
		blurb: 'Compteur emballé, palier frappé, échelle des paliers.',
		component: ScoreHero as unknown as SceneEntry['component'],
		props: scoreHeroDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.ScoreHero,
		...vertical,
	}),
	asScene({
		id: 'Blink-ActionPlan',
		label: 'Blink · ActionPlan',
		blurb: 'Écran de téléphone : trois actions qui s’activent seules, puis le gain.',
		component: ActionPlan as unknown as SceneEntry['component'],
		props: actionPlanDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.ActionPlan,
		...vertical,
	}),
	asScene({
		id: 'Blink-Outro',
		label: 'Blink · Outro',
		blurb: 'Marque plein cadre, nuée convergente, bouton qui insiste trois fois.',
		component: Outro as unknown as SceneEntry['component'],
		props: outroDefaults as unknown as Record<string, unknown>,
		duration: BLINK_SCENES.Outro,
		...vertical,
	}),
	asScene({
		id: 'Blink-Reel',
		label: 'Blink · Reel 37 s',
		blurb:
			'Les onze séquences enchaînées — scale-to-mask, slide whip, match cut et diagonal slash.',
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
