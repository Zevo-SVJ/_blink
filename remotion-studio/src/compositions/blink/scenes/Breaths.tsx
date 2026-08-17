import {z} from 'zod';
import {TypeBreath} from '@/components/kinetic';
import {blink} from '@/design/blink';
import {Impact} from '@/motion/kinetic';

/**
 * LES TROIS RESPIRATIONS TYPOGRAPHIQUES
 *
 * Regroupées dans un même fichier parce qu'elles forment un système : ce sont
 * les seuls plans de la vidéo sans aucun objet, et leur valeur tient à leur
 * placement autant qu'à leur contenu.
 *
 *   Seconds   après l'accroche   fond CLAIR      pose le chiffre
 *   Punchline après l'analyse    fond SATURÉ     prend le contre-pied
 *   Reveal    avant le résultat  fond TRÈS NOIR  ouvre la porte
 *
 * Trois fonds radicalement différents, et tous les trois différents du bleu
 * nuit qui domine le reste : c'est la rupture chromatique qui fait respirer,
 * autant que le vide.
 *
 * Chacune tient entre 1,5 et 1,75 s — assez pour être lue deux fois, trop peu
 * pour qu'on s'y installe.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECONDS · 3 temps (90 f) — fond clair
// « Deux secondes. »
// ─────────────────────────────────────────────────────────────────────────────

export const secondsSchema = z.object({
	kicker: z.string(),
	number: z.string(),
	unit: z.string(),
});

export type SecondsProps = z.infer<typeof secondsSchema>;

export const secondsDefaults: SecondsProps = {
	kicker: 'le temps qu’ils prennent',
	number: 'Deux',
	unit: 'secondes.',
};

export const Seconds: React.FC<SecondsProps> = ({kicker, number, unit}) => (
	<Impact hits={[{at: 4, amplitude: 16, duration: 7, seed: 's1'}]}>
		<TypeBreath
			kicker={kicker}
			kickerColor={blink.navy3}
			words={[
				{text: number, scale: 1.5, color: blink.navy},
				{text: unit, scale: 0.86, color: blink.skyBright},
			]}
			background={blink.cloud}
			color={blink.navy}
			size={150}
			at={0}
			step={4}
			out={76}
		/>
	</Impact>
);

// ─────────────────────────────────────────────────────────────────────────────
// PUNCHLINE · 3,5 temps (105 f) — fond saturé
// « Pas ce que tu crois. »
// ─────────────────────────────────────────────────────────────────────────────

export const punchlineSchema = z.object({
	lineOne: z.string(),
	lineTwo: z.string(),
});

export type PunchlineProps = z.infer<typeof punchlineSchema>;

export const punchlineDefaults: PunchlineProps = {
	lineOne: 'Pas ce que',
	lineTwo: 'tu crois.',
};

export const Punchline: React.FC<PunchlineProps> = ({lineOne, lineTwo}) => (
	<Impact hits={[{at: 3, amplitude: 26, duration: 9, seed: 'pl', rotation: 1.4}]}>
		<TypeBreath
			words={[
				{text: lineOne, scale: 0.72},
				{text: lineTwo, scale: 1.18},
			]}
			// Noir sur bleu vif : le contraste le plus violent de la vidéo, réservé
			// à la seule phrase qui contredit tout ce qui précède.
			background={blink.skyBright}
			color={blink.navy}
			size={140}
			at={0}
			step={3}
			out={90}
		/>
	</Impact>
);

// ─────────────────────────────────────────────────────────────────────────────
// REVEAL · 3,5 temps (105 f) — noir profond
// « Voilà ce qu'ils voient. »
// ─────────────────────────────────────────────────────────────────────────────

export const revealSchema = z.object({
	lineOne: z.string(),
	lineTwo: z.string(),
});

export type RevealProps = z.infer<typeof revealSchema>;

export const revealDefaults: RevealProps = {
	lineOne: 'Voilà ce',
	lineTwo: 'qu’ils voient.',
};

export const Reveal: React.FC<RevealProps> = ({lineOne, lineTwo}) => (
	<Impact hits={[{at: 2, amplitude: 12, duration: 6, seed: 'rv'}]}>
		<TypeBreath
			words={[
				{text: lineOne, scale: 0.7, color: blink.gray},
				{text: lineTwo, scale: 1.1, color: blink.white},
			]}
			// Presque noir : après le fond clair du miroir, l'œil se dilate et le
			// score de la scène suivante paraîtra d'autant plus lumineux.
			background="#01060F"
			color={blink.white}
			size={140}
			at={0}
			step={3}
			out={90}
		/>
	</Impact>
);
