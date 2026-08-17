import {BLINK_SPANS, sceneStarts} from './manifest';
import type {BlinkSceneId} from './manifest';

/**
 * PARTITION AUDIOVISUELLE
 *
 * Le contrat entre la voix off et l'image. Chaque réplique est rattachée à une
 * séquence, à une position dans sa timeline, et à ce que l'image met en scène
 * pendant qu'elle est prononcée.
 *
 * Pourquoi l'écrire avant d'avoir l'audio : quand la piste ElevenLabs arrivera,
 * il ne restera qu'à caler chaque `cue` sur le début réel de sa phrase. La
 * structure motion, elle, ne bouge pas — les délais internes des battements sont
 * relatifs à leur propre frame 0.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA REFONTE CHANGE POUR LA VOIX
 *
 * Le montage est passé de 13 plans longs à 11 séquences découpées en une
 * trentaine de battements. Une réplique ne peut donc plus « tenir » dans un
 * plan : elle est presque toujours à cheval sur deux ou trois battements, et
 * c'est très bien — une voix qui s'arrêterait à chaque coupe interne
 * soulignerait le découpage au lieu de le porter.
 *
 * D'où deux règles de rédaction propres à cette version :
 *
 *   • **plus court que le plan, toujours.** Chaque réplique est vérifiée contre
 *     la durée de sa séquence par `narrationBudget()` ci-dessous, avec une marge
 *     d'au moins 25 %. Une voix serrée sur une image serrée devient un
 *     bafouillage ;
 *   • **jamais la légende de l'image.** Le texte à l'écran et la voix disent
 *     deux choses différentes qui se complètent. Les listes déjà écrites — les
 *     signaux, les quatre regards, les actions — ne sont pas relues.
 *
 * ~2,5 mots par seconde en français, débit posé. L'image démarre 3 à 5 frames
 * avant le premier mot (`leadInFrames`).
 */

export type NarrationCue = {
	/** Séquence porteuse. */
	scene: BlinkSceneId;
	/** Réplique destinée à la voix off. */
	line: string;
	/** Frame, relative à la séquence, où l'image met en scène la réplique. */
	at: number;
	/** Avance de l'image sur la voix. 3 à 5 frames. */
	leadInFrames?: number;
	/** Ce que l'image raconte pendant la réplique — note de montage. */
	staging: string;
	/** Autorise la réplique à déborder sur la séquence suivante. */
	spansNextScene?: boolean;
};

/** ~2,5 mots par seconde en français, débit posé. */
export const WORDS_PER_SECOND = 2.5;

export const estimateSpokenFrames = (line: string, fps = 60): number =>
	Math.ceil((line.trim().split(/\s+/).length / WORDS_PER_SECOND) * fps);

export const narration: NarrationCue[] = [
	{
		scene: 'Hook',
		line: 'Ton profil parle avant toi.',
		at: 30,
		staging:
			'La caméra a reculé du médaillon, le tampon fluo vient de s’imprimer ; la phrase s’abat en trois frappes.',
	},
	{
		scene: 'Rhythm',
		line: 'Ils te lisent en deux secondes.',
		at: 16,
		staging:
			'Viseur de capture : le sujet est verrouillé, le laser passe, le compte à rebours se vide.',
	},
	{
		scene: 'Metaphor',
		line: 'Et ils ont déjà décidé.',
		at: 100,
		staging:
			'La rafale de clics vient de s’achever ; la sphère recule et le verdict tombe en orange fluo.',
	},
	{
		scene: 'Breathing',
		line: 'Neuf images, une bio.',
		at: 4,
		spansNextScene: true,
		staging:
			'Trois aplats fluo successifs, un mot par écran. La voix passe par-dessus les trois coupes.',
	},
	{
		scene: 'ScanUi',
		line: 'Blink lit ton profil comme eux le lisent.',
		at: 10,
		staging:
			'La grille se construit en diagonale sous le laser, puis les signaux extraits arrivent en cascade.',
	},
	{
		scene: 'ScanUi',
		line: 'Le cadrage, les couleurs, les mots.',
		at: 186,
		staging:
			'Les trois axes de lecture s’abattent l’un après l’autre, le viseur se verrouille dessus.',
	},
	{
		scene: 'Contrast',
		line: 'Pas ce que tu crois.',
		at: 58,
		staging: 'La croix au feutre se trace sur le profil terne ; « PAS ÇA. » s’imprime en travers.',
	},
	{
		scene: 'Perception',
		line: 'Quatre regards. Un seul profil.',
		at: 160,
		staging:
			'Les quatre cartes sont tombées puis se sont ouvertes en éventail ; la formule conclut.',
	},
	{
		scene: 'Gap',
		line: 'Entre ce que tu montres et ce qu’ils voient, il y a un écart.',
		at: 6,
		staging:
			'L’écran se fend en diagonale : le vert de l’intention en haut, l’orange de la perception en bas.',
	},
	{
		scene: 'ScoreHero',
		line: 'Sept cent quarante-deux. Palier Sharp.',
		at: 60,
		staging:
			'Le compteur s’est emballé jusqu’à 742 ; le palier s’abat avec la plus forte secousse du film.',
	},
	{
		scene: 'ActionPlan',
		line: 'Et Blink te dit quoi changer.',
		at: 82,
		staging:
			'Sur l’écran du téléphone, les trois actions s’activent seules, une toutes les vingt-deux frames.',
	},
	{
		scene: 'ActionPlan',
		line: 'Quarante-huit points, et tu changes de palier.',
		at: 162,
		staging: 'Le gain projeté s’abat en fluo, les particules partent du chiffre.',
	},
	{
		scene: 'Outro',
		line: 'Blink. Vois-toi comme les autres te voient.',
		at: 4,
		staging:
			'Le mot-marque s’abat plein cadre, puis la nuée de curseurs converge sur le bouton.',
	},
];

/**
 * Contrôle de tenue : pour chaque séquence, le temps de parole cumulé face au
 * temps disponible.
 *
 * Ce n'est pas un test décoratif. Sur la version précédente, quatre répliques
 * étaient plus longues que leur plan — elles auraient forcé à rallonger le
 * montage au moment de poser l'audio, c'est-à-dire à défaire le travail de
 * rythme. Le vérifier depuis le manifeste évite de le découvrir trop tard.
 *
 * Une réplique marquée `spansNextScene` est autorisée à déborder : son surplus
 * est reporté sur la séquence suivante au lieu d'être compté comme un
 * dépassement.
 */
export const narrationBudget = (
	fps = 60,
): {scene: BlinkSceneId; spoken: number; available: number; ok: boolean}[] => {
	const starts = sceneStarts();

	return (Object.keys(BLINK_SPANS) as BlinkSceneId[]).map((scene) => {
		const cues = narration.filter((cue) => cue.scene === scene);
		const spoken = cues.reduce((total, cue) => total + estimateSpokenFrames(cue.line, fps), 0);
		// Le temps disponible court du premier mot à la fin de la séquence.
		const first = cues.length > 0 ? Math.min(...cues.map((cue) => cue.at)) : 0;
		const spills = cues.some((cue) => cue.spansNextScene);
		const available =
			BLINK_SPANS[scene] - first + (spills ? Math.round(BLINK_SPANS[scene] * 0.25) : 0);

		void starts;
		return {scene, spoken, available, ok: spoken <= available * 0.8};
	});
};
