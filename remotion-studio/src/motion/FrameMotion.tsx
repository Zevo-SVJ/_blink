import {motion} from 'framer-motion';
import type {CSSProperties, ReactNode} from 'react';
import {Children, isValidElement} from 'react';
import type {FrameTiming} from './frame';
import {staggerDelay, useProgress} from './frame';
import type {MotionState, PresetName} from './presets';
import {mixStates, presets, REST, toStyle} from './presets';

const resolvePreset = (preset: PresetName | MotionState): MotionState =>
	typeof preset === 'string' ? presets[preset] : preset;

export type FrameMotionProps = {
	children?: ReactNode;
	/** Nom d'un preset, ou état de départ décrit à la main. */
	preset?: PresetName | MotionState;
	/** État d'arrivée. Par défaut : le repos. */
	to?: MotionState;
	timing?: FrameTiming;
	style?: CSSProperties;
	className?: string;
};

/**
 * Élément animé par la frame Remotion.
 *
 * On utilise bien un composant Framer Motion (`motion.div`), mais **sans**
 * `animate` ni `transition` : le style est intégralement résolu à partir de
 * `useCurrentFrame()`. Le rendu est donc déterministe — la même frame produit
 * toujours exactement la même image — tout en gardant l'accès aux `layout`,
 * gestes et variants de Framer Motion dès que le composant est joué dans un
 * contexte interactif (`<Player />`, app web).
 */
export const FrameMotion: React.FC<FrameMotionProps> = ({
	children,
	preset = 'riseIn',
	to = REST,
	timing,
	style,
	className,
}) => {
	const progress = useProgress(timing);
	const state = mixStates(resolvePreset(preset), to, progress);

	return (
		<motion.div className={className} style={{...toStyle(state), ...style}}>
			{children}
		</motion.div>
	);
};

export type StaggerProps = Omit<FrameMotionProps, 'children'> & {
	children: ReactNode;
	/** Écart entre deux enfants, en frames. */
	step?: number;
	/** Style appliqué au conteneur (flex, grid…). */
	containerStyle?: CSSProperties;
	/** Style appliqué à chaque enfant animé. */
	itemStyle?: CSSProperties;
};

/**
 * Cascade : chaque enfant reçoit le même preset avec un délai croissant.
 * C'est la signature visuelle des keynotes — les éléments ne partent jamais
 * tous ensemble.
 */
export const Stagger: React.FC<StaggerProps> = ({
	children,
	step = 3,
	timing,
	containerStyle,
	itemStyle,
	...rest
}) => {
	const base = timing?.delay ?? 0;
	const items = Children.toArray(children).filter(isValidElement);

	return (
		<div style={containerStyle}>
			{items.map((child, index) => (
				<FrameMotion
					key={child.key ?? index}
					{...rest}
					style={itemStyle}
					timing={{...timing, delay: staggerDelay(index, step, base)}}
				>
					{child}
				</FrameMotion>
			))}
		</div>
	);
};
