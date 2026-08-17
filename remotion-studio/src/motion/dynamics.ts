/**
 * Le vocabulaire de mouvement du projet : ressorts et courbes.
 *
 * C'est LE point de jonction entre Remotion et Framer Motion. Les deux moteurs
 * simulent un oscillateur harmonique amorti avec exactement les mêmes
 * paramètres physiques (`stiffness`, `damping`, `mass`), donc une seule
 * définition suffit :
 *
 *   - `spring({config: springs.snappy, …})`  → piloté par la frame  (vidéo)
 *   - `transition={toSpringTransition('snappy')}` → piloté par le temps (web)
 *
 * Résultat : une interaction dans l'app et son équivalent dans la vidéo ont
 * rigoureusement la même signature de mouvement.
 */

export type SpringConfig = {
	damping: number;
	mass: number;
	stiffness: number;
	overshootClamping?: boolean;
};

export const springs = {
	/** Déplacement long et posé, aucun rebond. Le réglage par défaut. */
	glide: {stiffness: 120, damping: 22, mass: 0.9},
	/** Réaction immédiate, quasi critique. Pour les micro-interactions. */
	snappy: {stiffness: 220, damping: 26, mass: 0.8},
	/** Entrées douces de gros éléments (cartes, panneaux). */
	gentle: {stiffness: 70, damping: 18, mass: 1},
	/** Dépassement franc et assumé — à réserver aux accents. */
	bouncy: {stiffness: 180, damping: 14, mass: 1},
	/** Jamais de dépassement : idéal quand la valeur cible doit être exacte. */
	precise: {stiffness: 260, damping: 32, mass: 1, overshootClamping: true},

	// ── Famille « kinetic » ───────────────────────────────────────────────
	// Langage rapide et élastique des formats sociaux verticaux. À ne pas
	// mélanger avec la famille calme ci-dessus : ce sont deux vocabulaires
	// distincts, chacun cohérent avec lui-même.
	//
	// Les trois `pop*` partagent la même raideur (400) et ne varient que par
	// l'amortissement, ce qui gradue le dépassement sans changer la vitesse
	// d'arrivée — ζ = damping / (2·√stiffness) :
	//
	//   damping 15 → ζ 0.375 → ~28 % de dépassement, 1er pic à 0.17 s
	//   damping 18 → ζ 0.450 → ~20 %
	//   damping 24 → ζ 0.600 → ~10 %

	/** Entrée par défaut du langage kinetic. Rebond franc et joyeux. */
	pop: {stiffness: 400, damping: 15, mass: 1},
	/** Même vitesse, dépassement contenu. Pour les blocs de texte longs. */
	popTight: {stiffness: 400, damping: 18, mass: 1},
	/** Dépassement discret. Pour les éléments secondaires et nombreux. */
	popSoft: {stiffness: 400, damping: 24, mass: 1},
	/** Impact violent : arrivée quasi critique, aucune oscillation résiduelle. */
	slam: {stiffness: 500, damping: 30, mass: 1},

	/**
	 * Objets « lourds » — sphères, cartes d'identité, prismes.
	 *
	 * La masse supérieure à 1 est ce qui les distingue de l'UI : même raideur
	 * apparente, mais plus d'inertie, donc un départ plus mou et une oscillation
	 * plus longue. C'est ce qui fait qu'un objet paraît avoir un poids et une
	 * interface non.
	 */
	heavy: {stiffness: 145, damping: 17, mass: 1.7},
	/** Glissements de plans entiers. Fluide, sans nervosité. */
	slide: {stiffness: 100, damping: 20, mass: 1},
	/**
	 * Typographie d'impact.
	 *
	 * Raideur portée à 320 : même dépassement (ζ ≈ 0,39, ~27 %) qu'auparavant,
	 * mais premier pic à 0,10 s au lieu de 0,13 s. Le rebond est identique, le
	 * mot arrive plus tôt — c'est exactement ce qu'on veut pour du peps.
	 */
	textPop: {stiffness: 320, damping: 14, mass: 1},

	/**
	 * Interfaces, cartes, badges, barres.
	 *
	 * La masse à 0,8 est le levier de nervosité : ωn = √(400/0,8) = 22,4 rad/s,
	 * soit une arrivée en 0,18 s. Amortissement 22 → ζ ≈ 0,61, donc ~9 % de
	 * dépassement : franc mais net, sans oscillation résiduelle qui traînerait
	 * sur une grille de six éléments.
	 */
	ui: {stiffness: 400, damping: 22, mass: 0.8},

	/**
	 * Transitions de plans entiers.
	 *
	 * Employé comme **horloge** de transition (`springTiming`), pas comme
	 * courbe : la présentation passe alors en `linear` pour qu'un seul lissage
	 * s'applique. ζ ≈ 0,61 donne un léger dépassement à l'arrivée du plan, ce
	 * qu'une Bézier ne sait pas produire — le raccord respire au lieu de
	 * s'arrêter net.
	 */
	slideBig: {stiffness: 220, damping: 18, mass: 1},

	// ── Famille « extrême » — le régime haute rétention ────────────────────
	// Trois ressorts, trois emplois, aucun recouvrement. Ils remplacent la
	// famille kinetic sur toute la piste Blink : plus raides, moins amortis,
	// avec une masse qui dit explicitement ce que l'objet pèse.

	/**
	 * Textes, badges, pop-ups. LE ressort du régime.
	 *
	 * ωn = √(450/0,8) = 23,7 rad/s → premier pic à 0,073 s ;
	 * ζ = 16/(2·√(450·0,8)) = 0,42 → ~25 % de dépassement.
	 *
	 * Autrement dit : l'élément est arrivé avant que l'œil ait fini de le
	 * chercher, et il rebondit assez pour qu'on sente le choc. C'est la
	 * combinaison exacte qui distingue une apparition d'un affichage.
	 */
	kick: {stiffness: 450, damping: 16, mass: 0.8},

	/**
	 * Caméra et glissements de plan entier.
	 *
	 * ζ = 22/(2·√300) = 0,635 → ~4 % de dépassement seulement. Un plan entier
	 * qui oscille devient illisible : le rebond appartient aux éléments, pas au
	 * cadre. Ce ressort est rapide et **puissant**, pas élastique.
	 */
	whip: {stiffness: 300, damping: 22, mass: 1},

	/**
	 * Objets lourds qui tombent : cartes, médaillon, plaques.
	 *
	 * La masse à 1,5 est tout l'effet — ωn = √(200/1,5) = 11,5 rad/s, donc une
	 * chute qui prend son temps, et ζ = 0,346 → ~31 % de dépassement à
	 * l'atterrissage. Associé à `squash`, l'objet s'écrase puis se rétablit :
	 * c'est ce qui lui donne un poids perçu.
	 */
	heavyDrop: {stiffness: 200, damping: 12, mass: 1.5},

	/**
	 * Le tampon du premier plan, et lui seul.
	 *
	 * ζ = 15/(2·√500) = 0,335 → ~34 % de dépassement, le plus fort du film. Un
	 * badge qui s'imprime doit rebondir plus qu'il n'est raisonnable : c'est le
	 * premier évènement que voit le spectateur, et il doit paraître incontrôlé.
	 * Employé ailleurs, ce ressort donnerait l'impression que l'animation est
	 * mal réglée — c'est exactement pour ça qu'il n'apparaît qu'une fois.
	 */
	stamp: {stiffness: 500, damping: 15, mass: 1},
} as const satisfies Record<string, SpringConfig>;

export type SpringName = keyof typeof springs;

export type BezierCurve = readonly [number, number, number, number];

/**
 * Courbes de type Apple. `sheet` est la courbe des feuilles modales iOS,
 * `expo` celle des révélations produit, `emphasized` celle des transitions
 * de plein écran.
 */
export const easings = {
	standard: [0.4, 0, 0.2, 1],
	sheet: [0.32, 0.72, 0, 1],
	expo: [0.16, 1, 0.3, 1],
	entrance: [0.22, 1, 0.36, 1],
	emphasized: [0.83, 0, 0.17, 1],
	exit: [0.55, 0, 1, 0.45],
	linear: [0, 0, 1, 1],

	// ── Famille « kinetic » ───────────────────────────────────────────────
	/**
	 * `back` recule avant de partir : c'est l'anticipation. La courbe sort de
	 * l'intervalle [0, 1], ce qui fait volontairement dépasser les transforms —
	 * l'opacité, elle, est bornée à l'affichage (voir `presets.toStyle`).
	 * C'est LA courbe de sortie du langage kinetic. Jamais de ressort en sortie.
	 */
	back: [0.36, 0, 0.66, -0.56],
	/** Translation très rapide : quasi immobile, fulgurante, puis freinage sec. */
	quint: [0.87, 0, 0.13, 1],
	/** Lent puis brutal — la courbe des zooms traversants. */
	expoIn: [0.7, 0, 0.84, 0],
} as const satisfies Record<string, BezierCurve>;

export type EasingName = keyof typeof easings;

/** Durées de référence, en secondes (converties en frames à l'usage). */
export const durations = {
	instant: 0.15,
	fast: 0.3,
	base: 0.5,
	slow: 0.8,
	scene: 1.2,
} as const;

export type DurationName = keyof typeof durations;

export const toCssBezier = (name: EasingName): string => {
	const [a, b, c, d] = easings[name];
	return `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
};

/** Convertit des secondes en frames pour un fps donné. */
export const seconds = (value: number, fps: number): number =>
	Math.round(value * fps);
