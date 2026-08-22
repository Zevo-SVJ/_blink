import {BLINK_SPANS, sceneStarts} from '@/compositions/blink/manifest';
import type {BlinkSceneId} from '@/compositions/blink/manifest';

/**
 * LA VOIX OFF
 *
 * Ce fichier est le contrat entre la narration et l'image : le texte exact à
 * faire dire, et la frame **absolue** à laquelle chaque réplique doit démarrer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX MODES, ET POURQUOI LE SECOND EST MEILLEUR
 *
 * `single` — un seul `voiceover.mp3` posé à la frame 0. C'est le plus simple à
 *   produire (un export, un fichier) et c'est le mode par défaut. Son défaut est
 *   structurel : la synchronisation dépend entièrement des silences enregistrés
 *   dans le fichier. Le jour où un plan gagne dix frames, tout ce qui suit se
 *   décale et il faut réenregistrer.
 *
 * `lines` — un fichier par réplique, chacun posé à sa frame. Douze fichiers au
 *   lieu d'un, mais la voix reste **collée aux marques** quoi qu'il arrive au
 *   montage : allonger un plan déplace automatiquement les répliques suivantes,
 *   puisque les positions sont dérivées du manifeste et non écrites à la main.
 *   C'est le mode à utiliser dès qu'on prévoit une deuxième version du film.
 *
 * Changer de mode est un mot à modifier ci-dessous ; le reste du code s'adapte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RÈGLES DE RÉDACTION APPLIQUÉES
 *
 *   • **le texte à l'écran n'est jamais relu.** La voix complète l'image, elle
 *     ne la légende pas. Les listes déjà écrites — les quatre regards, les trois
 *     actions — ne sont pas énumérées à l'oral ;
 *   • **une idée par réplique**, dite sans reprendre son souffle ;
 *   • **~2,5 mots par seconde** en français à débit soutenu. Chaque réplique est
 *     vérifiée contre le temps disponible par `voiceBudget()`, qui refuse aussi
 *     les chevauchements entre deux répliques ;
 *   • **les répliques débordent des plans, et c'est voulu.** Le montage est
 *     découpé en battements de moins d'une seconde et demie : une voix qui
 *     s'arrêterait à chaque coupe soulignerait le découpage au lieu de le
 *     porter.
 */

/**
 * `single`   — un fichier unique posé à la frame 0.
 * `lines`    — un fichier par réplique, chacun à sa frame.
 * `segments` — **un seul fichier, lu par tranches**, chaque tranche posée à sa
 *              propre frame. C'est le mode en service : il donne la précision
 *              du mode `lines` sans exiger treize fichiers.
 */
export const VOICE_MODE: 'single' | 'lines' | 'segments' = 'segments';

/**
 * Passe à `true` **une fois les fichiers déposés** dans `public/vo/`.
 *
 * Un `<Audio>` qui pointe sur un fichier absent fait échouer le rendu : ce
 * drapeau est donc la seule chose qui sépare un projet sans voix d'un projet
 * avec voix, et il est à `false` tant que rien n'a été déposé. `npm run vo`
 * vérifie quels fichiers sont présents et rappelle lequel manque.
 */
export const VOICE_ENABLED = true;

/** Volume de la voix. Elle est la couche du dessus, elle reste à plein. */
export const VOICE_VOLUME = 1;

/**
 * Atténuation appliquée à **tous** les effets quand la voix est active.
 *
 * −4 dB. La voix occupe la bande 200 Hz – 4 kHz, exactement là où vivent les
 * clics et les bips : sans cette atténuation, chaque effet vient mordre une
 * syllabe.
 *
 * C'est une atténuation **constante** et non un ducking dynamique. Sur ce film
 * la voix parle pendant environ 80 % de la durée : un ducking qui monte et
 * descend vingt-six fois s'entendrait pomper, alors qu'un niveau fixe s'oublie.
 * Le ducking dynamique n'a de sens que sur une bande où la parole est rare.
 */
export const SFX_DUCK = 0.63;

export type VoiceLine = {
	/** Séquence porteuse — sert à situer la réplique dans le récit. */
	scene: BlinkSceneId;
	/** Décalage dans la séquence, en frames. */
	at: number;
	/** Le texte exact à faire dire. */
	line: string;
	/** Nom du fichier en mode `lines`. */
	file: string;
	/** Ce que l'image montre pendant la réplique — note de montage. */
	staging: string;
};

export const voice: VoiceLine[] = [
	{
		scene: 'Hook',
		at: 44,
		file: 'vo/01-hook.mp3',
		line: 'Ton profil parle avant toi.',
		staging:
			'La phrase s’installe mot par mot, puis sa chute occupe seule le cadre en fluo.',
	},
	{
		scene: 'Rhythm',
		at: 16,
		file: 'vo/02-rhythm.mp3',
		line: 'Ils te lisent en deux secondes.',
		staging: 'Viseur de capture : verrouillage du sujet, laser, compte à rebours.',
	},
	{
		scene: 'Metaphor',
		at: 92,
		file: 'vo/03-metaphor.mp3',
		line: 'Déjà plié.',
		staging:
			'La rafale de clics s’achève, la sphère recule. L’écran dit « ILS ONT DÉJÀ DÉCIDÉ. » — la voix ne le relit pas, elle conclut.',
	},
	{
		scene: 'Breathing',
		at: 4,
		file: 'vo/04-breathing.mp3',
		line: 'Voilà tout ce qu’ils ont de toi.',
		staging:
			'Trois aplats fluo qui écrivent « NEUF IMAGES. » « UNE BIO. » « C’EST TOUT. » La voix passe par-dessus les deux coupes sans relire un seul de ces mots.',
	},
	{
		scene: 'ScanUi',
		at: 10,
		file: 'vo/05-scan.mp3',
		line: 'Blink le lit exactement comme eux.',
		staging: 'La grille se construit sous le laser, les signaux sortent en cascade.',
	},
	{
		scene: 'ScanUi',
		at: 184,
		file: 'vo/06-signals.mp3',
		line: 'Tout est un signal.',
		staging:
			'« LE CADRAGE », « LES COULEURS », « LES MOTS » s’abattent l’un après l’autre. La voix nomme ce qu’ils ont en commun, elle ne les énumère pas.',
	},
	{
		scene: 'Contrast',
		at: 48,
		file: 'vo/07-contrast.mp3',
		line: 'Et non, ce n’est pas une question de filtre.',
		staging:
			'La croix au feutre barre le profil terne, « PAS ÇA. » s’imprime, puis « NON » occupe le cadre. La plus longue réplique du film, sur son plan le plus long.',
	},
	{
		scene: 'Perception',
		at: 90,
		file: 'vo/08-perception.mp3',
		line: 'Chacun y voit autre chose.',
		staging:
			'Le paquet s’ouvre en éventail : les quatre verdicts sont lisibles pendant la réplique, et l’écran conclura seul par « QUATRE REGARDS / UN SEUL PROFIL ».',
	},
	{
		scene: 'Gap',
		at: 8,
		file: 'vo/09-gap.mp3',
		line: 'Entre les deux, il y a un écart.',
		staging: 'L’écran se fend : le vert de l’intention, l’orange de la perception.',
	},
	{
		scene: 'ScoreHero',
		at: 62,
		file: 'vo/10-score.mp3',
		line: 'Sept cent quarante-deux. Palier Sharp.',
		staging: 'Le compteur se verrouille, le palier s’abat avec la plus forte secousse.',
	},
	{
		scene: 'ActionPlan',
		at: 66,
		file: 'vo/11-plan.mp3',
		line: 'Blink te dit quoi changer.',
		staging: 'Sur le téléphone, les trois actions s’activent seules.',
	},
	{
		scene: 'ActionPlan',
		at: 190,
		file: 'vo/12-gain.mp3',
		line: 'Quarante-huit points à gagner.',
		staging: 'Le gain projeté s’abat en fluo, les particules partent du chiffre.',
	},
	{
		scene: 'Outro',
		at: 92,
		file: 'vo/13-outro.mp3',
		line: 'Blink. Vois-toi comme ils te voient.',
		staging: 'La marque, puis la nuée de curseurs qui converge sur le bouton.',
	},
];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LE CALAGE PAR TRANCHES
 *
 * La prise livrée est un bloc continu de 15,46 s : 14,84 s de parole pour
 * 0,62 s de silence. Posée à la frame 0, elle se termine à 15,5 s alors qu'il
 * reste 22 s d'image, et chaque groupe arrive de plus en plus tôt — la dérive
 * atteignait 21,6 s sur la dernière phrase.
 *
 * La correction ne consiste pas à découper le fichier en morceaux sur le
 * disque, mais à en **lire des tranches**. `<Audio trimBefore trimAfter>` dans
 * une `<Sequence from>` joue l'intervalle voulu du fichier à la position
 * voulue : un seul fichier, six placements, aucune génération intermédiaire et
 * aucune perte de qualité par ré-encodage.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OÙ SONT LES COUPES, ET POURQUOI LÀ
 *
 * Les bornes `from`/`to` ne sont pas des estimations : elles tombent dans les
 * cinq silences réels de la prise, relevés sur son enveloppe d'énergie à 10 ms
 * de résolution. Couper dans un silence est la seule façon de garantir qu'aucun
 * mot n'est amputé ni au début ni à la fin d'une tranche.
 *
 *   silence    2,74 → 2,88 s   coupe à 2,81
 *   silence    6,95 → 7,12 s   coupe à 7,03
 *   silence    8,89 → 9,02 s   coupe à 8,95
 *   silence   11,37 → 11,63 s  coupe à 11,50
 *   silence   13,40 → 13,57 s  coupe à 13,48
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE ÇA DONNE
 *
 * La narration couvre désormais 0 → 37,0 s au lieu de 0 → 15,5 s, et chaque
 * groupe tombe sur le plan qu'il commente. Aucune tranche n'en recouvre une
 * autre : la vérification est faite par `voiceSegmentPlan()`, qui refuse un
 * chevauchement.
 */
export type VoiceSegment = {
	/** Début de la tranche **dans le fichier source**, en secondes. */
	from: number;
	/** Fin de la tranche dans le fichier source, en secondes. */
	to: number;
	/** Position de la tranche **dans le film**, en secondes. */
	at: number;
	/** Ce qui est dit — relevé de la prise, pas du script d'origine. */
	said: string;
	/** Le plan que la tranche accompagne. */
	over: string;
};

export const voiceSegments: VoiceSegment[] = [
	{
		from: 0,
		to: 2.81,
		at: 0,
		said: 'Ton profil parle avant toi… Ils te jugent en deux secondes.',
		over: 'Hook — le médaillon, le tampon fluo, la phrase qui s’installe.',
	},
	{
		from: 2.81,
		to: 7.03,
		at: 8,
		said: 'Voilà tout ce qu’ils ont de toi… Blink analyse ton profil exactement comme eux.',
		over:
			'Breathing puis ScanUi — les trois aplats fluo, puis la grille passée au laser. La tranche traverse le raccord, ce qui le rend inaudible.',
	},
	{
		from: 7.03,
		to: 8.95,
		at: 16,
		said: 'Et non… ce n’est pas une question de filtre.',
		over: 'Contrast — la croix au feutre vient de barrer le profil terne.',
	},
	{
		from: 8.95,
		to: 11.5,
		at: 19,
		said: 'Tes amis, un recruteur, ton crush… chacun y voit autre chose.',
		over:
			'Perception — le paquet s’ouvre en éventail. Les quatre verdicts sont lisibles pendant que la voix les nomme : c’est le seul endroit du film où voix et image disent la même chose, et ici c’est voulu.',
	},
	{
		from: 11.5,
		to: 13.48,
		at: 30,
		said: 'Blink te dit exactement quoi modifier…',
		over: 'ActionPlan — les trois interrupteurs s’activent seuls sur le téléphone.',
	},
	{
		from: 13.48,
		to: 15.46,
		at: 35,
		said: 'Blink. Vois-toi comme les autres te voient.',
		over: 'Outro — la marque, la nuée de curseurs, le bouton.',
	},
];

export type SegmentPlan = {
	index: number;
	at: number;
	end: number;
	length: number;
	said: string;
	/** Faux si la tranche empiète sur la suivante ou déborde du film. */
	ok: boolean;
};

/**
 * Vérifie le calage : aucune tranche ne doit recouvrir la suivante ni dépasser
 * la fin du film. Une tranche qui déborde ne se voit pas au montage — elle
 * s'entend, et seulement une fois le rendu terminé.
 */
export const voiceSegmentPlan = (fps = 60): SegmentPlan[] => {
	const total =
		(Object.keys(BLINK_SPANS) as BlinkSceneId[]).reduce(
			(sum, id) => sum + BLINK_SPANS[id],
			0,
		) / fps;

	return voiceSegments.map((segment, index) => {
		const length = segment.to - segment.from;
		const end = segment.at + length;
		const next = voiceSegments[index + 1];
		const limit = next ? next.at : total;
		return {
			index,
			at: segment.at,
			end,
			length,
			said: segment.said,
			ok: end <= limit + 0.001,
		};
	});
};

/** ~2,5 mots par seconde en français, débit soutenu mais articulé. */
export const WORDS_PER_SECOND = 2.5;

export const spokenFrames = (line: string, fps = 60): number =>
	Math.ceil((line.trim().split(/\s+/).length / WORDS_PER_SECOND) * fps);

/** Frame absolue de chaque réplique, dérivée du manifeste. */
export const voiceAt = (item: VoiceLine): number => sceneStarts()[item.scene] + item.at;

export type VoiceCheck = {
	index: number;
	file: string;
	start: number;
	end: number;
	line: string;
	/** Frames disponibles avant la réplique suivante. */
	room: number;
	ok: boolean;
};

/**
 * Contrôle de tenue : chaque réplique tient-elle avant la suivante, et le tout
 * tient-il dans le film ?
 *
 * Ce n'est pas décoratif. Sur une version précédente, quatre répliques
 * dépassaient leur plan — ce qui aurait forcé à rallonger le montage au moment
 * de poser l'audio, c'est-à-dire à défaire tout le travail de rythme. Le
 * vérifier depuis le manifeste évite de le découvrir en studio.
 */
export const voiceBudget = (fps = 60): VoiceCheck[] => {
	const total = (Object.keys(BLINK_SPANS) as BlinkSceneId[]).reduce(
		(sum, id) => sum + BLINK_SPANS[id],
		0,
	);

	const placed = voice
		.map((item, index) => ({index, item, start: voiceAt(item)}))
		.sort((a, b) => a.start - b.start);

	return placed.map((entry, position) => {
		const spoken = spokenFrames(entry.item.line, fps);
		const next = placed[position + 1];
		const room = (next ? next.start : total) - entry.start;
		return {
			index: entry.index,
			file: entry.item.file,
			start: entry.start,
			end: entry.start + spoken,
			line: entry.item.line,
			room,
			// 4 frames de marge : deux répliques qui se touchent à la frame près
			// s'enchaînent sans respiration.
			ok: spoken + 4 <= room,
		};
	});
};
