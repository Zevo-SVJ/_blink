/**
 * PARTITION AUDIOVISUELLE
 *
 * Ce fichier est le contrat entre la voix off et l'image. Chaque réplique y est
 * rattachée à une scène, à une position dans sa timeline, et à ce que l'image
 * met en scène pendant qu'elle est prononcée.
 *
 * Pourquoi l'écrire avant d'avoir l'audio : quand la piste ElevenLabs arrivera,
 * il ne restera qu'à caler chaque `cue` sur le début réel de sa phrase et à
 * ajuster `durationInFrames` de la scène correspondante. La structure motion,
 * elle, ne bouge pas — les délais internes des scènes sont relatifs à leur
 * propre frame 0.
 *
 * Règles de rédaction appliquées :
 *   • une idée par scène, jamais deux ;
 *   • phrases courtes, dites à voix haute sans reprendre son souffle ;
 *   • le texte à l'écran **reprend ou complète** la réplique, il ne la double
 *     jamais mot pour mot. Les listes déjà écrites à l'écran — les quatre
 *     lentilles, les leviers de progression — ne sont pas relues par la voix :
 *     l'énumérer à l'oral n'ajoute rien et mange tout le temps du plan ;
 *   • ~2,5 mots par seconde en français — chaque réplique est vérifiée contre
 *     la durée de sa scène, avec une marge d'au moins 20 %.
 *
 * L'analyse de référence recommande de démarrer l'animation 3 à 5 frames avant
 * le premier mot : `leadInFrames` porte cette avance.
 */

export type NarrationCue = {
	/** Scène porteuse. */
	scene: string;
	/** Réplique destinée à la voix off. */
	line: string;
	/**
	 * Frame, relative à la scène, où l'image commence à mettre en scène la
	 * réplique. La voix, elle, attaque `leadInFrames` plus tard.
	 */
	at: number;
	/** Avance de l'image sur la voix. 3 à 5 frames. */
	leadInFrames?: number;
	/** Ce que l'image raconte pendant la réplique — sert de note de montage. */
	staging: string;
	/**
	 * Autorise la réplique à déborder sur le plan suivant.
	 *
	 * Une voix off n'a pas à être enfermée dans un plan : sur les punchlines et
	 * les respirations, la phrase se prononce lentement et se termine
	 * naturellement après le raccord. Le noter explicitement évite d'allonger un
	 * plan typographique — qui perdrait sa brièveté, donc son intérêt.
	 */
	spansNextScene?: boolean;
};

/** ~2,5 mots par seconde en français, débit posé. */
export const WORDS_PER_SECOND = 2.5;

export const estimateSpokenFrames = (line: string, fps = 60): number =>
	Math.ceil((line.trim().split(/\s+/).length / WORDS_PER_SECOND) * fps);

export const narration: NarrationCue[] = [
	{
		scene: 'Perception',
		line: 'Ton profil parle avant toi.',
		at: 24,
		staging:
			'Quatre regards colorés entrent par les bords ; la phrase s’abat en trois impacts successifs.',
	},
	{
		scene: 'Seconds',
		line: 'Deux secondes.',
		at: 6,
		staging:
			'Rupture chromatique : fond clair, un seul chiffre géant. Aucun autre élément à l’écran.',
	},
	{
		scene: 'Gaze',
		line: 'C’est tout ce qu’il leur faut.',
		at: 12,
		staging:
			'Une nuée de curseurs converge sur une sphère ; les compteurs de vues s’emballent, des ondes concentriques partent du centre.',
	},
	{
		scene: 'Identity',
		line: 'Neuf images, une bio. C’est tout.',
		at: 10,
		staging:
			'Une carte d’identité flottante se retourne ; les fragments d’identité s’empilent en pseudo-3D.',
	},
	{
		scene: 'Capture',
		line: 'Blink lit ton profil comme eux le lisent.',
		at: 14,
		staging:
			'La capture tombe, le curseur clique, le scan traverse la carte, la lecture démarre.',
	},
	{
		scene: 'Signals',
		line: 'Le cadrage, les couleurs, les mots.',
		at: 8,
		staging:
			'Machinerie d’analyse : champ de nœuds, radar de personnalité, fenêtres flottantes, cadre de scan.',
	},
	{
		scene: 'Punchline',
		line: 'Pas ce que tu crois.',
		at: 4,
		spansNextScene: true,
		staging:
			'Fond saturé plein cadre, trois mots noirs. Le contre-pied, sans aucun décor.',
	},
	{
		scene: 'Lenses',
		line: 'Quatre regards. Un seul profil.',
		at: 10,
		staging:
			'Les quatre verdicts arrivent en cascade alternée ; le dernier reçoit une validation.',
	},
	{
		scene: 'Mirror',
		line: 'Ce que tu montres, ils le lisent autrement.',
		at: 12,
		staging:
			'Fond clair. Un miroir se fend en deux : à gauche l’intention, à droite la perception.',
	},
	{
		scene: 'Reveal',
		line: 'Voilà ce qu’ils voient.',
		at: 4,
		spansNextScene: true,
		staging: 'Noir profond, quatre mots. La respiration avant le résultat.',
	},
	{
		scene: 'Verdict',
		line: 'Sept cent quarante-deux. Palier Sharp.',
		at: 8,
		staging:
			'L’anneau se trace, le compteur monte, le palier s’abat avec la plus forte secousse de la vidéo.',
	},
	{
		scene: 'Climb',
		line: 'Quarante-huit points avant Magnetic.',
		at: 10,
		staging:
			'L’échelle des paliers se construit marche par marche ; un marqueur grimpe et s’arrête sous le palier suivant.',
	},
	{
		scene: 'Close',
		line: 'Blink. Vois-toi comme les autres te voient.',
		at: 40,
		staging:
			'La nuée de curseurs revient une dernière fois, converge sur la marque, puis l’appel à l’action se pose.',
	},
];
