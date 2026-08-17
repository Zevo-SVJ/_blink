import type {CSSProperties} from 'react';
import {useCurrentFrame} from 'remotion';

export type TypewriterProps = {
	text: string;
	/** Frame de départ, relative à la scène. */
	at?: number;
	/** Frames par caractère. 1 = 60 caractères/s — un martèlement. */
	rate?: number;
	/** Curseur clignotant en fin de ligne. */
	caret?: boolean;
	/** Période du clignotement, en frames. */
	caretPeriod?: number;
	caretColor?: string;
	style?: CSSProperties;
};

/**
 * Frappe au clavier, cadencée à la frame.
 *
 * Deux raisons de l'employer plutôt qu'une entrée au ressort :
 *
 *   • **la cadence** — un caractère toutes les 1 ou 2 frames produit un
 *     évènement visuel toutes les 16 à 33 ms. C'est le seul procédé
 *     typographique qui ne laisse jamais l'écran immobile pendant qu'un texte
 *     s'installe, donc celui qui satisfait par construction la règle « quelque
 *     chose bouge toutes les 15 frames » ;
 *   • **le registre** — la frappe dit « en train de se faire ». Un texte qui
 *     surgit est un constat, un texte qui se tape est une action.
 *
 * Le texte complet reste dans le DOM, rendu transparent : la ligne occupe donc
 * sa largeur finale dès la première frame, et rien ne se recompose pendant la
 * frappe. Sans cette précaution, un texte centré tremblerait latéralement à
 * chaque caractère.
 */
export const Typewriter: React.FC<TypewriterProps> = ({
	text,
	at = 0,
	rate = 1.5,
	caret = true,
	caretPeriod = 16,
	caretColor,
	style,
}) => {
	const frame = useCurrentFrame();
	const local = frame - at;
	const shown = Math.max(0, Math.min(text.length, Math.floor(local / rate)));
	const done = shown >= text.length;

	// Le curseur clignote pendant la frappe puis se stabilise deux périodes après
	// le dernier caractère : un curseur qui clignote indéfiniment attire l'œil
	// sur lui au lieu du texte.
	const blinkOff =
		local > (text.length + 2) * rate + caretPeriod * 2 ||
		(done && Math.floor(local / caretPeriod) % 2 === 1);

	return (
		<span style={{position: 'relative', whiteSpace: 'pre', ...style}}>
			{/* Fantôme : réserve la largeur finale, invisible. */}
			<span style={{opacity: 0}}>{text}</span>

			<span style={{position: 'absolute', left: 0, top: 0}}>
				{text.slice(0, shown)}
				{caret && local >= 0 ? (
					<span
						style={{
							opacity: blinkOff ? 0 : 1,
							color: caretColor ?? 'currentColor',
						}}
					>
						▌
					</span>
				) : null}
			</span>
		</span>
	);
};
