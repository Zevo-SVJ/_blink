import {motion} from 'framer-motion';
import {useState} from 'react';
import {palette, radii} from '@/design/tokens';
import {typeScale} from '@/design/typography';
import {toSpringTransition} from '@/motion/adapters';
import type {SpringName} from '@/motion/dynamics';
import {springs} from '@/motion/dynamics';

const names = Object.keys(springs) as SpringName[];

/**
 * Banc d'essai des ressorts.
 *
 * Les mêmes `stiffness` / `damping` / `mass` alimentent ici les transitions
 * Framer Motion et, dans les compositions, la fonction `spring()` de Remotion.
 * Comparer les deux à l'œil est le meilleur moyen de choisir un ressort avant
 * de l'utiliser dans une scène.
 */
export const SpringLab: React.FC = () => {
	const [extended, setExtended] = useState(false);

	return (
		<div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14}}>
			<div style={{...typeScale.label, color: palette.textTertiary}}>
				Ressorts partagés
			</div>

			<div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
				{names.map((name) => (
					<div key={name} style={{display: 'flex', alignItems: 'center', gap: 12}}>
						<div
							style={{
								width: 72,
								fontSize: 13,
								color: palette.textSecondary,
							}}
						>
							{name}
						</div>
						<div
							style={{
								position: 'relative',
								flex: 1,
								height: 26,
								borderRadius: radii.pill,
								background: 'rgba(255,255,255,0.05)',
							}}
						>
							<motion.div
								animate={{x: extended ? '100%' : '0%'}}
								transition={toSpringTransition(name)}
								style={{
									position: 'absolute',
									top: 3,
									left: 3,
									width: 20,
									height: 20,
									borderRadius: '50%',
									background: `linear-gradient(140deg, ${palette.teal}, ${palette.indigo})`,
								}}
							/>
						</div>
					</div>
				))}
			</div>

			<motion.button
				onClick={() => setExtended((value) => !value)}
				whileHover={{scale: 1.02}}
				whileTap={{scale: 0.97}}
				transition={toSpringTransition('snappy')}
				style={{
					appearance: 'none',
					border: '1px solid rgba(255,255,255,0.14)',
					background: 'rgba(255,255,255,0.06)',
					color: palette.textPrimary,
					padding: '10px 16px',
					borderRadius: radii.sm,
					cursor: 'pointer',
					font: 'inherit',
					fontSize: 14,
				}}
			>
				Rejouer
			</motion.button>
		</div>
	);
};
