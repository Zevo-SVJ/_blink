import {noise2D} from '@remotion/noise';
import {useMemo} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export type NodeFieldProps = {
	at: number;
	width: number;
	height: number;
	count?: number;
	/** Distance maximale pour qu'un lien se dessine, en px. */
	linkDistance?: number;
	color?: string;
	linkColor?: string;
	/** Amplitude de la dérive des nœuds. */
	drift?: number;
	seed?: string;
};

type Node = {x: number; y: number; phase: number; radius: number; delay: number};

/**
 * Champ de nœuds reliés.
 *
 * Représentation abstraite d'une analyse en cours : des points qui se
 * découvrent des relations. Un lien n'apparaît que quand deux nœuds sont assez
 * proches, et son opacité décroît avec la distance — le graphe se recompose
 * donc en permanence pendant que les nœuds dérivent, sans qu'aucune position ne
 * soit animée à la main.
 *
 * Tout est dérivé d'un bruit indexé, donc déterministe : le même champ à chaque
 * rendu, imprévisible à l'œil.
 */
export const NodeField: React.FC<NodeFieldProps> = ({
	at,
	width,
	height,
	count = 26,
	linkDistance = 190,
	color = '#8ED5F6',
	linkColor = '#389FFA',
	drift = 26,
	seed = 'nodes',
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = (frame - at) / fps;

	const base = useMemo<Node[]>(
		() =>
			Array.from({length: count}, (_, index) => ({
				x: (noise2D(`${seed}-x`, index * 1.7, 0) * 0.5 + 0.5) * width,
				y: (noise2D(`${seed}-y`, index * 2.3, 0) * 0.5 + 0.5) * height,
				phase: noise2D(`${seed}-p`, index, 0) * Math.PI * 2,
				radius: 3 + (noise2D(`${seed}-r`, index * 0.9, 0) * 0.5 + 0.5) * 4,
				delay: index * 1.6,
			})),
		[count, width, height, seed],
	);

	const nodes = base.map((node) => ({
		...node,
		x: node.x + Math.sin(t * 0.5 + node.phase) * drift,
		y: node.y + Math.cos(t * 0.42 + node.phase * 1.3) * drift,
		appear: interpolate(frame - at - node.delay, [0, 14], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}),
	}));

	const links: {x1: number; y1: number; x2: number; y2: number; o: number}[] = [];
	for (let i = 0; i < nodes.length; i += 1) {
		for (let j = i + 1; j < nodes.length; j += 1) {
			const a = nodes[i]!;
			const b = nodes[j]!;
			const distance = Math.hypot(a.x - b.x, a.y - b.y);
			if (distance > linkDistance) continue;
			links.push({
				x1: a.x,
				y1: a.y,
				x2: b.x,
				y2: b.y,
				o: (1 - distance / linkDistance) * 0.55 * Math.min(a.appear, b.appear),
			});
		}
	}

	return (
		<svg width={width} height={height} style={{overflow: 'visible'}}>
			{links.map((link, index) => (
				<line
					key={index}
					x1={link.x1}
					y1={link.y1}
					x2={link.x2}
					y2={link.y2}
					stroke={linkColor}
					strokeWidth={1.4}
					opacity={link.o}
				/>
			))}
			{nodes.map((node, index) => (
				<circle
					key={index}
					cx={node.x}
					cy={node.y}
					r={node.radius * node.appear}
					fill={color}
					opacity={0.85 * node.appear}
				/>
			))}
		</svg>
	);
};
