import type {CSSProperties} from 'react';
import {useMemo} from 'react';
import {FrameMotion} from './FrameMotion';
import type {FrameTiming} from './frame';
import {staggerDelay} from './frame';
import type {MotionState, PresetName} from './presets';

export type SplitTextProps = {
	text: string;
	/** Granularité de la cascade. Les `\n` forcent toujours un retour à la ligne. */
	by?: 'char' | 'word' | 'line';
	preset?: PresetName | MotionState;
	timing?: FrameTiming;
	/** Écart entre deux fragments, en frames. */
	step?: number;
	/**
	 * Masque les fragments hors de leur boîte pendant l'animation : le texte
	 * semble « monter derrière une ligne », comme sur les pages produit Apple.
	 */
	mask?: boolean;
	/** Espace entre fragments d'une même ligne (unité CSS). */
	gap?: string;
	align?: CSSProperties['justifyContent'];
	style?: CSSProperties;
	className?: string;
};

/** Découpe le texte en lignes, puis chaque ligne en fragments animables. */
const splitLines = (text: string, by: NonNullable<SplitTextProps['by']>) => {
	const lines = text.split('\n');
	if (by === 'line') return lines.map((line) => [line]);
	if (by === 'word') {
		// Les espaces sont retirés : l'écartement vient de `gap`, ce qui évite
		// le double espacement et garde le rythme constant.
		return lines.map((line) => line.split(/\s+/).filter((w) => w !== ''));
	}
	return lines.map((line) => Array.from(line));
};

/**
 * Titre animé fragment par fragment, piloté par la frame Remotion.
 * Chaque fragment est un `FrameMotion` autonome : la cascade reste
 * déterministe et se scrube parfaitement dans le studio.
 */
export const SplitText: React.FC<SplitTextProps> = ({
	text,
	by = 'char',
	preset = 'revealUp',
	timing,
	step = 1.5,
	mask = true,
	gap,
	align = 'flex-start',
	style,
	className,
}) => {
	const lines = useMemo(() => splitLines(text, by), [text, by]);
	const base = timing?.delay ?? 0;
	const resolvedGap = gap ?? (by === 'word' ? '0.28em' : undefined);

	// Index du premier fragment de chaque ligne : la cascade doit se poursuivre
	// d'une ligne à l'autre, pas repartir de zéro.
	const lineOffsets = useMemo(
		() =>
			lines.map((_, index) =>
				lines
					.slice(0, index)
					.reduce((total, fragments) => total + fragments.length, 0),
			),
		[lines],
	);

	return (
		<span
			className={className}
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'stretch',
				...style,
			}}
		>
			{lines.map((fragments, lineIndex) => (
				<span
					key={`line-${lineIndex}`}
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						justifyContent: align,
						columnGap: resolvedGap,
					}}
				>
					{fragments.map((fragment, fragmentIndex) => {
						const globalIndex = (lineOffsets[lineIndex] ?? 0) + fragmentIndex;
						const delay = staggerDelay(globalIndex, step, base);

						return (
							<span
								key={`${lineIndex}-${fragmentIndex}-${fragment}`}
								style={{
									display: 'inline-block',
									overflow: mask ? 'hidden' : 'visible',
									// Sans marge interne, le masque rognerait les jambages
									// et les accents (é, ç, j…).
									padding: mask ? '0.16em 0.04em' : undefined,
									margin: mask ? '-0.16em -0.04em' : undefined,
									whiteSpace: 'pre',
								}}
							>
								<FrameMotion
									preset={preset}
									timing={{...timing, delay}}
									style={{display: 'inline-block'}}
								>
									{fragment === ' ' ? ' ' : fragment}
								</FrameMotion>
							</span>
						);
					})}
				</span>
			))}
		</span>
	);
};
