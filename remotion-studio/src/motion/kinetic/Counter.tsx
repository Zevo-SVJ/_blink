import type {CSSProperties} from 'react';
import type {FrameTiming} from '../frame';
import {useProgress} from '../frame';

export type CounterProps = {
	from?: number;
	to: number;
	timing?: FrameTiming;
	/** Décimales affichées. 0 par défaut : un score se lit en entier. */
	decimals?: number;
	prefix?: string;
	suffix?: string;
	/**
	 * Fige la largeur sur le nombre de caractères du maximum, pour que le
	 * compteur ne fasse pas danser la mise en page pendant qu'il monte.
	 */
	pad?: boolean;
	style?: CSSProperties;
};

/**
 * Compteur numérique.
 *
 * Un score qui monte tient l'attention bien mieux qu'un score qui apparaît :
 * le spectateur attend l'arrivée. Piloté par un ressort, il dépasse légèrement
 * la valeur cible avant de se poser — le même dépassement que tout le reste.
 */
export const Counter: React.FC<CounterProps> = ({
	from = 0,
	to,
	timing = {spring: 'popSoft'},
	decimals = 0,
	prefix = '',
	suffix = '',
	pad = true,
	style,
}) => {
	const progress = useProgress(timing);
	const value = from + (to - from) * progress;
	const text = value.toFixed(decimals);
	const width = pad ? `${to.toFixed(decimals).length}ch` : undefined;

	return (
		<span
			style={{
				// `tabular-nums` : sans elle, la largeur des chiffres change et le
				// nombre tressaute à chaque frame.
				fontVariantNumeric: 'tabular-nums',
				display: 'inline-block',
				minWidth: width,
				textAlign: 'center',
				...style,
			}}
		>
			{prefix}
			{text}
			{suffix}
		</span>
	);
};
