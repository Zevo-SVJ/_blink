import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {useLoop} from '@/motion/frame';
import {tiltFor} from '@/motion/physics/shake';
import type {PresetName} from '@/motion/presets';
import {Pop} from '@/motion/kinetic/Pop';

export type LensCardProps = {
	label: string;
	verdict: string;
	color: string;
	at: number;
	/** Sens d'arrivée : alterner produit le va-et-vient du montage. */
	preset?: PresetName;
	out?: number;
	index?: number;
	/** Mise en avant : la carte grossit et s'éclaircit. */
	highlightAt?: number;
};

/**
 * Une des quatre lentilles de Blink.
 *
 * La pastille de couleur est ce qui identifie la lentille avant même que le
 * texte soit lu — c'est elle qui porte la hiérarchie quand les quatre cartes
 * arrivent en cascade.
 *
 * Le flottement sinusoïdal est déphasé par `index` : quatre cartes qui
 * respirent à l'unisson se liraient comme un seul bloc.
 */
export const LensCard: React.FC<LensCardProps> = ({
	label,
	verdict,
	color,
	at,
	preset = 'flyRight',
	out,
	index = 0,
	highlightAt,
}) => {
	const drift = useLoop(0.09);
	const float = Math.sin(drift + index * 1.4) * 7;

	return (
		<Pop
			at={at}
			spring="popTight"
			preset={preset}
			out={out}
			exit="crush"
			shadow
			tilt={tiltFor(index, 1.4)}
			index={index}
			style={{width: '100%'}}
		>
			<div style={{transform: `translateY(${float.toFixed(2)}px)`, width: '100%'}}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 26,
						padding: '30px 34px',
						borderRadius: 30,
						background: `linear-gradient(140deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)`,
						border: `1px solid ${color}44`,
						backdropFilter: 'blur(30px) saturate(160%)',
						WebkitBackdropFilter: 'blur(30px) saturate(160%)',
					}}
				>
					<div
						style={{
							width: 62,
							height: 62,
							borderRadius: '50%',
							flexShrink: 0,
							background: `radial-gradient(circle at 34% 30%, ${color}, ${color}66)`,
							boxShadow: `0 0 34px ${color}88`,
						}}
					/>
					<div style={{flex: 1, minWidth: 0}}>
						<div
							style={{
								fontFamily: fonts.text,
								fontSize: 24,
								fontWeight: 600,
								letterSpacing: '0.06em',
								textTransform: 'uppercase',
								color,
							}}
						>
							{label}
						</div>
						<div
							style={{
								fontFamily: fonts.display,
								fontSize: 38,
								fontWeight: 600,
								letterSpacing: '-0.028em',
								lineHeight: 1.15,
								marginTop: 6,
								color: blink.white,
							}}
						>
							{verdict}
						</div>
					</div>

					{highlightAt === undefined ? null : (
						<Pop at={highlightAt} spring="pop" preset="popIn" style={{flexShrink: 0}}>
							<div
								style={{
									width: 46,
									height: 46,
									borderRadius: '50%',
									background: color,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<svg width={24} height={24} viewBox="0 0 24 24" fill="none">
									<path
										d="M5 12.5l4.2 4.2L19 7"
										stroke={blink.navy}
										strokeWidth={3}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
						</Pop>
					)}
				</div>
			</div>
		</Pop>
	);
};
