/**
 * Identité de marque Blink.
 *
 * Les couleurs sont transposées depuis les variables CSS réelles du produit
 * (`web-blink/src/index.css`), converties de HSL en hexadécimal pour être
 * utilisables telles quelles dans les compositions. Toute évolution de la
 * charte de l'app doit être répercutée ici — c'est la seule source de vérité
 * visuelle des vidéos Blink.
 */

export const blink = {
	// Fonds — le bleu nuit profond de l'app
	navy: '#04122F',
	navy2: '#102141',
	navy3: '#223459',

	// Accents — la famille « sky »
	sky: '#AEE7FA',
	sky2: '#8ED5F6',
	skyBright: '#389FFA',

	// Neutres
	white: '#FAFAFA',
	cloud: '#F2F4F7',
	cloud2: '#E6E9F0',
	gray: '#707A8F',

	// États
	success: '#34B273',
	warning: '#F6A823',
	error: '#E14747',
} as const;

/**
 * PALETTE DE RUPTURE.
 *
 * La charte Blink est un bleu nuit. Trente-sept secondes de bleu nuit sont
 * monotones quoi qu'on y mette : la variété d'un film vertical vient d'abord de
 * la **valeur du fond**, avant les objets qui s'y trouvent.
 *
 * Ces couleurs ne remplacent pas la charte, elles la ponctuent. Elles ne sont
 * jamais employées comme couleur de marque — uniquement comme aplat de fond
 * plein cadre, comme trait de feutre ou comme badge. La marque reste `sky` sur
 * `navy` ; ce sont ces plans-là qui la mettent en valeur par contraste.
 */
export const pop = {
	/** Jaune fluo — les respirations typographiques et les badges d'alerte. */
	flare: '#FFE93D',
	/** Orange fluo — le tampon du premier plan, la moitié « perception ». */
	flareHot: '#FF6B1A',
	/** Rouge feutre — la croix. Une seule apparition dans tout le film. */
	cross: '#FF2D2D',
	/** Le noir des écrans fluo. Jamais #000 : un noir pur bave à l'encodage. */
	ink: '#0B0B12',
	/** Vert acide — la moitié « intention ». */
	lime: '#2BE08A',
} as const;

/**
 * Les quatre regards analysés par Blink.
 *
 * Chaque lentille a sa couleur : c'est ce qui permet de les identifier d'un
 * coup d'œil quand elles apparaissent en cascade, sans avoir à lire l'étiquette.
 */
export const lenses = [
	{id: 'crush', label: 'ton crush', color: '#FF6B9D'},
	{id: 'stranger', label: 'un inconnu', color: blink.skyBright},
	{id: 'friends', label: 'tes amis', color: blink.success},
	{id: 'recruiter', label: 'un recruteur', color: blink.warning},
] as const;

export type LensId = (typeof lenses)[number]['id'];

/**
 * Paliers de score, repris de `web-blink/src/lib/ranking.ts`.
 * Le score est sur 1000.
 */
export const tiers = [
	{id: 'unread', label: 'Unread', min: 0},
	{id: 'emerging', label: 'Emerging', min: 400},
	{id: 'defined', label: 'Defined', min: 550},
	{id: 'sharp', label: 'Sharp', min: 680},
	{id: 'magnetic', label: 'Magnetic', min: 790},
	{id: 'iconic', label: 'Iconic', min: 890},
] as const;

export type Tier = (typeof tiers)[number];

export const tierForScore = (score: number): Tier => {
	let current: Tier = tiers[0];
	for (const tier of tiers) {
		if (score >= tier.min) current = tier;
	}
	return current;
};

/**
 * Zones de sécurité du format vertical 9:16.
 *
 * Les interfaces de TikTok, Reels et Shorts recouvrent le haut et le bas de
 * l'écran. Toute information lisible reste dans la bande centrale — c'est une
 * contrainte de diffusion, pas un choix esthétique.
 */
export const safeArea = {
	top: 260,
	bottom: 380,
	side: 88,
} as const;
