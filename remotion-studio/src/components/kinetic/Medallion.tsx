import type {CSSProperties} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {blink} from '@/design/blink';
import {useIdle} from '@/motion/kinetic/idle';

export type MedallionProps = {
	size?: number;
	/** Basculement en Y à l'arrêt, en degrés. C'est ce qui donne l'épaisseur. */
	tilt?: number;
	/** Couleur de la lueur derrière l'objet. */
	glow?: string;
	/** Ouverture de la paupière : 1 = grand ouvert, 0 = fermé. */
	open?: number;
	/** Rotation lente du reflet spéculaire, en tours par seconde. */
	shine?: number;
	style?: CSSProperties;
};

const RIM_TICKS = 36;

/**
 * LE MÉDAILLON — l'objet du premier plan.
 *
 * Un regard gravé dans un disque de métal. C'est l'objet sur lequel la caméra
 * est collée à la frame 0 : trop gros pour être identifié d'emblée, il se
 * révèle en même temps que la caméra recule.
 *
 * Pourquoi un objet gravé et pas une illustration d'œil : la gravure donne une
 * **matière**, et une matière réagit à la lumière. Le reflet spéculaire qui
 * tourne lentement sur le disque suffit à ce que l'objet existe dans un espace,
 * sans une ligne de vraie 3D. Un aplat vectoriel, lui, resterait un pictogramme
 * quel que soit le mouvement qu'on lui applique.
 *
 * La fabrique du relief tient en trois couches, dans cet ordre :
 *
 *   1. un `conic-gradient` sur le disque — le métal brossé. Les arêtes claires
 *      et sombres alternées sont ce que l'œil lit comme « tourné » ;
 *   2. deux `inset` box-shadows opposées — le biseau. Clair en haut à gauche,
 *      sombre en bas à droite : la convention d'éclairage que tout le monde
 *      décode sans y penser ;
 *   3. la gravure elle-même — le contour de l'amande est doublé, une ligne
 *      sombre décalée d'un pixel vers le haut et une ligne claire décalée vers
 *      le bas. C'est cette inversion qui fait *creux* plutôt que *posé*.
 *
 * Aucune ressemblance avec une personne réelle : c'est un signe, pas un
 * portrait — une amande, un iris et des rayons.
 */
export const Medallion: React.FC<MedallionProps> = ({
	size = 760,
	tilt = 9,
	glow = blink.skyBright,
	open = 1,
	shine = 0.06,
	style,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const idle = useIdle({float: 7, breathe: 0.006, speed: 0.09});

	// Le reflet tourne : c'est le seul indice de matière, et il ne s'arrête
	// jamais — un métal immobile redevient un aplat.
	const shineAngle = (frame / fps) * shine * 360;

	// La paupière se referme sur une amande plus plate, elle ne se recouvre pas.
	const lid = interpolate(open, [0, 1], [0.06, 1]);
	const eye = `M 14 60 Q 100 ${(60 - 68 * lid).toFixed(2)} 186 60 Q 100 ${(60 + 68 * lid).toFixed(2)} 14 60 Z`;

	return (
		<div
			style={{
				position: 'relative',
				width: size,
				height: size,
				transform: `perspective(1800px) translate3d(0, ${idle.y.toFixed(2)}px, 0) rotateY(${(tilt + idle.rotate).toFixed(3)}deg) scale(${idle.scale.toFixed(4)})`,
				...style,
			}}
		>
			{/* Halo. Il déborde volontairement du disque : sans lui l'objet est posé
			    sur le fond au lieu d'être éclairé par lui. */}
			<div
				style={{
					position: 'absolute',
					inset: -size * 0.3,
					borderRadius: '50%',
					background: `radial-gradient(circle, ${glow}55 0%, ${glow}18 40%, transparent 68%)`,
				}}
			/>

			{/* Le disque de métal. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					borderRadius: '50%',
					background: `conic-gradient(from ${shineAngle.toFixed(2)}deg, ${blink.navy2} 0deg, ${blink.navy3} 42deg, ${blink.sky2}cc 78deg, ${blink.navy3} 118deg, ${blink.navy2} 190deg, ${blink.navy3} 262deg, ${blink.sky}88 300deg, ${blink.navy3} 330deg, ${blink.navy2} 360deg)`,
					boxShadow: `inset 0 ${size * 0.02}px ${size * 0.05}px rgba(255,255,255,0.22), inset 0 -${size * 0.02}px ${size * 0.06}px rgba(0,6,20,0.75), 0 ${size * 0.05}px ${size * 0.12}px -${size * 0.03}px rgba(0,6,20,0.9)`,
				}}
			/>

			{/* Crantage du bord : 36 dents, comme sur une pièce frappée. Détail
			    minuscule, mais c'est ce qui interdit de lire le disque comme un
			    simple cercle vectoriel. */}
			<svg
				viewBox="0 0 200 200"
				style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
			>
				{Array.from({length: RIM_TICKS}, (_, i) => {
					const angle = (i / RIM_TICKS) * Math.PI * 2;
					const inner = 91;
					const outer = 98;
					return (
						<line
							key={i}
							x1={100 + Math.cos(angle) * inner}
							y1={100 + Math.sin(angle) * inner}
							x2={100 + Math.cos(angle) * outer}
							y2={100 + Math.sin(angle) * outer}
							stroke="rgba(4,18,47,0.55)"
							strokeWidth={1.4}
						/>
					);
				})}
				<circle
					cx={100}
					cy={100}
					r={86}
					fill="none"
					stroke="rgba(255,255,255,0.16)"
					strokeWidth={1.2}
				/>
				<circle
					cx={100}
					cy={100}
					r={80}
					fill="none"
					stroke="rgba(4,18,47,0.4)"
					strokeWidth={2}
				/>
			</svg>

			{/* Le regard gravé. */}
			<svg
				viewBox="0 0 200 120"
				style={{
					position: 'absolute',
					left: '50%',
					top: '50%',
					width: size * 0.66,
					transform: 'translate(-50%, -50%)',
					overflow: 'visible',
				}}
			>
				<defs>
					<clipPath id="medallion-eye">
						<path d={eye} />
					</clipPath>
					<radialGradient id="medallion-iris" cx="42%" cy="34%" r="72%">
						<stop offset="0%" stopColor={blink.sky} />
						<stop offset="46%" stopColor={blink.skyBright} />
						<stop offset="100%" stopColor="#0A2A55" />
					</radialGradient>
				</defs>

				{/* Rayons gravés autour de l'amande — le regard qui porte. */}
				{Array.from({length: 14}, (_, i) => {
					const angle = (i / 14) * Math.PI * 2;
					return (
						<line
							key={i}
							x1={100 + Math.cos(angle) * 104}
							y1={60 + Math.sin(angle) * 62}
							x2={100 + Math.cos(angle) * 124}
							y2={60 + Math.sin(angle) * 74}
							stroke="rgba(4,18,47,0.45)"
							strokeWidth={2.4}
							strokeLinecap="round"
						/>
					);
				})}

				{/* Le creux : un fond sombre, puis l'iris clippé par l'amande. */}
				<path d={eye} fill="#04122F" />
				<g clipPath="url(#medallion-eye)">
					<circle cx={100} cy={60} r={40} fill="url(#medallion-iris)" />
					<circle cx={100} cy={60} r={17} fill="#03101F" />
					<circle cx={88} cy={47} r={7} fill="rgba(255,255,255,0.82)" />
					<circle cx={112} cy={72} r={3.4} fill="rgba(255,255,255,0.4)" />
				</g>

				{/* La gravure : sombre décalée vers le haut, claire vers le bas.
				    L'inversion des deux liserés est ce qui fait creux. */}
				<path
					d={eye}
					fill="none"
					stroke="rgba(0,6,20,0.9)"
					strokeWidth={5}
					transform="translate(0,-1.6)"
				/>
				<path
					d={eye}
					fill="none"
					stroke="rgba(255,255,255,0.3)"
					strokeWidth={3}
					transform="translate(0,2)"
				/>
			</svg>
		</div>
	);
};
