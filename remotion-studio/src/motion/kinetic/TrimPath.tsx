import {evolvePath} from '@remotion/paths';
import type {CSSProperties} from 'react';
import type {EasingName} from '../dynamics';
import type {FrameTiming} from '../frame';
import {useProgress} from '../frame';

export type TrimPathProps = {
	/** Données `d` du tracé SVG. */
	d: string;
	width: number;
	height: number;
	timing?: FrameTiming;
	easing?: EasingName;
	color?: string;
	strokeWidth?: number;
	linecap?: 'butt' | 'round' | 'square';
	/** Dessine à l'envers, du point d'arrivée vers le départ. */
	reverse?: boolean;
	style?: CSSProperties;
};

/**
 * Tracé vectoriel progressif.
 *
 * Flèches, soulignements, cercles, croix : dans ce langage, aucune ligne
 * n'apparaît d'un coup — elle se dessine. C'est un détail à faible coût qui
 * fait basculer la lecture du côté « fait main » plutôt que « calque affiché ».
 *
 * `evolvePath` de `@remotion/paths` calcule le couple
 * `strokeDasharray`/`strokeDashoffset` correspondant à une progression : rien
 * à mesurer soi-même, et le résultat est exact quelle que soit la longueur du
 * chemin.
 */
export const TrimPath: React.FC<TrimPathProps> = ({
	d,
	width,
	height,
	timing = {duration: 18, easing: 'expo'},
	color = '#FAFAFA',
	strokeWidth = 10,
	linecap = 'round',
	reverse = false,
	style,
}) => {
	const progress = useProgress(timing);
	const evolution = evolvePath(reverse ? 1 - progress : progress, d);

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			fill="none"
			style={{overflow: 'visible', ...style}}
		>
			<path
				d={d}
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap={linecap}
				strokeLinejoin="round"
				strokeDasharray={evolution.strokeDasharray}
				strokeDashoffset={evolution.strokeDashoffset}
			/>
		</svg>
	);
};
