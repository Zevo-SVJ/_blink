import {noise2D} from '@remotion/noise';
import {blink} from '@/design/blink';
import {fonts} from '@/design/typography';
import {Pop} from '@/motion/kinetic/Pop';
import {STAGGER} from '@/motion/beats';

export type ProfileCardProps = {
	/** Frame d'apparition de la carte. */
	at: number;
	/** Frame de départ de la cascade des vignettes. */
	tilesAt?: number;
	handle?: string;
	width?: number;
	/** Frame de sortie, si la carte doit quitter la scène. */
	out?: number;
};

const STATS = [
	{value: '128', label: 'posts'},
	{value: '2 410', label: 'abonnés'},
	{value: '318', label: 'suivis'},
];

/**
 * Carte de profil stylisée.
 *
 * Délibérément **générique** : pas de logo, pas de marque de réseau social, pas
 * de photographie, pas de pseudonyme réel. C'est une évocation de profil, pas
 * la reproduction d'une interface existante — l'avatar et les vignettes sont
 * des dégradés, et le pseudo est un pronom.
 *
 * Les vignettes arrivent en cascade avec une micro-rotation stable propre à
 * chacune : une grille parfaitement alignée aurait l'air imprimée.
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
	at,
	tilesAt = at + 10,
	handle = '@toi',
	width = 720,
	out,
}) => (
	<div
		style={{
			width,
			borderRadius: 44,
			padding: 40,
			background: `linear-gradient(168deg, ${blink.navy3} 0%, ${blink.navy2} 100%)`,
			border: `1px solid rgba(174, 231, 250, 0.16)`,
			boxShadow: '0 60px 120px -40px rgba(0, 6, 20, 0.85)',
		}}
	>
		<div style={{display: 'flex', alignItems: 'center', gap: 28}}>
			<Pop at={at + 4} spring="pop" preset="popIn" style={{flexShrink: 0}}>
				<div
					style={{
						width: 132,
						height: 132,
						borderRadius: '50%',
						background: `conic-gradient(from 140deg, ${blink.skyBright}, ${blink.sky}, #FF6B9D, ${blink.skyBright})`,
						padding: 5,
					}}
				>
					<div
						style={{
							width: '100%',
							height: '100%',
							borderRadius: '50%',
							background: `linear-gradient(150deg, ${blink.navy3}, ${blink.navy})`,
						}}
					/>
				</div>
			</Pop>

			<div style={{flex: 1}}>
				<Pop at={at + 7} spring="popTight" preset="riseUp">
					<div
						style={{
							fontFamily: fonts.display,
							fontSize: 44,
							fontWeight: 700,
							letterSpacing: '-0.03em',
						}}
					>
						{handle}
					</div>
				</Pop>

				<div style={{display: 'flex', gap: 34, marginTop: 18}}>
					{STATS.map((stat, index) => (
						<Pop
							key={stat.label}
							at={at + 10 + index * STAGGER.tight}
							spring="popSoft"
							preset="riseUp"
						>
							<div>
								<div style={{fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em'}}>
									{stat.value}
								</div>
								<div style={{fontSize: 20, fontWeight: 500, color: blink.gray}}>
									{stat.label}
								</div>
							</div>
						</Pop>
					))}
				</div>
			</div>
		</div>

		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(3, 1fr)',
				gap: 12,
				marginTop: 36,
			}}
		>
			{Array.from({length: 6}, (_, index) => {
				// Plage resserrée sur la charte : cyan → bleu → violet, jamais de vert vif.
				const hue = 215 + noise2D('tile', index * 1.9, 0) * 45;
				return (
					<Pop
						key={index}
						at={tilesAt + index * STAGGER.tight}
						spring="popSoft"
						preset="popTilt"
						tilt
						index={index}
						out={out === undefined ? undefined : out + index}
						exit="crush"
					>
						<div
							style={{
								aspectRatio: '1 / 1',
								borderRadius: 18,
								background: `linear-gradient(${(140 + index * 24).toFixed(0)}deg, hsl(${hue.toFixed(0)}, 62%, 38%), hsl(${(hue + 34).toFixed(0)}, 55%, 22%))`,
							}}
						/>
					</Pop>
				);
			})}
		</div>
	</div>
);
