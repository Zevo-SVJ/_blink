import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useProgress} from '@/motion/frame';
import {Counter} from '@/motion/kinetic/Counter';

export type ScoreRingProps = {
	score: number;
	max?: number;
	at: number;
	size?: number;
	thickness?: number;
	color?: string;
};

/**
 * Cadran de score.
 *
 * L'anneau se **dessine** au lieu d'apparaître : c'est le principe de tracé
 * vectoriel appliqué à une donnée. Anneau et compteur partagent exactement la
 * même progression, donc le chiffre ne peut jamais mentir sur le remplissage.
 *
 * L'anneau utilise une courbe et non un ressort — une jauge qui rebondirait
 * afficherait brièvement un score supérieur au réel.
 */
export const ScoreRing: React.FC<ScoreRingProps> = ({
	score,
	max = 1000,
	at,
	size = 460,
	thickness = 26,
	color = blink.skyBright,
}) => {
	const progress = useProgress({delay: at, duration: 48, easing: 'expo'});
	const radius = (size - thickness) / 2;
	const circumference = 2 * Math.PI * radius;
	const filled = (score / max) * progress;

	return (
		<div style={{position: 'relative', width: size, height: size}}>
			<svg width={size} height={size} style={{transform: 'rotate(-90deg)'}}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="rgba(255,255,255,0.08)"
					strokeWidth={thickness}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke={color}
					strokeWidth={thickness}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={circumference * (1 - filled)}
					style={{filter: `drop-shadow(0 0 26px ${color}aa)`}}
				/>
			</svg>

			<div
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div
					style={{
						fontFamily: fonts.display,
						fontSize: 152,
						fontWeight: 800,
						letterSpacing: '-0.05em',
						lineHeight: 1,
					}}
				>
					<Counter
						to={score}
						timing={{delay: at, duration: 48, easing: 'expo'}}
						pad={false}
					/>
				</div>
				<div
					style={{
						fontFamily: fonts.text,
						fontSize: 26,
						fontWeight: 600,
						letterSpacing: '0.05em',
						color: blink.gray,
						marginTop: 6,
					}}
				>
					/ {max}
				</div>
			</div>
		</div>
	);
};
