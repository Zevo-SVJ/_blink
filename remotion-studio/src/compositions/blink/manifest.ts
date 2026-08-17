/**
 * PARTITION DE LA VIDÉO BLINK — 11 séquences, 37,8 s
 *
 * Refonte complète du montage en régime **haute rétention**. La version
 * précédente (13 plans, 43 s) enchaînait des plans longs séparés par des
 * raccords doux : chaque plan avait le temps de s'installer, donc chaque plan se
 * lisait comme une diapositive. Le problème n'était pas la vitesse des
 * animations, il était structurel.
 *
 * Ce qui change, et pourquoi :
 *
 *   • **la séquence n'est plus l'unité de montage.** Chacune des 11 séquences
 *     ci-dessous est subdivisée en *battements* de 45 à 75 frames, séparés par
 *     des coupes internes franches (`<Sequence>` imbriquées). Le spectateur voit
 *     donc une trentaine de compositions distinctes en 37 secondes, là où il en
 *     voyait 13 en 43 ;
 *
 *   • **l'univers visuel change à chaque séquence.** Cinq registres alternent —
 *     objet gravé, viseur de capture, typographie fluo, rupture au feutre,
 *     interface de téléphone — et deux séquences voisines ne partagent jamais ni
 *     leur fond ni leur registre. C'est la variété de *valeur* qui porte
 *     l'énergie, avant celle des mouvements ;
 *
 *   • **quatre raccords, et seulement quatre.** Scale-to-mask, slide whip, match
 *     cut d'objet, diagonal slash. Aucun fondu enchaîné : deux images
 *     superposées à 50 % ne sont ni l'une ni l'autre, et cette demi-seconde
 *     d'indécision est exactement là où l'on décroche.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI LES DURÉES SONT ÉCRITES EN DEUX COLONNES
 *
 * `BLINK_SPANS` porte la durée **utile** de chaque séquence : c'est la grille de
 * temps du récit. Elle reproduisait à la frame les timecodes du brief jusqu'à
 * ce que la règle de lisibilité du hook impose 48 frames de plus ; tout est
 * donc décalé de 0,8 s à partir de 00:02, et le film dure 37,8 s.
 * `BLINK_SCENES` en dérive en ajoutant la transition qui suit chaque séquence,
 * parce qu'une `TransitionSeries` consomme le raccord sur les deux plans qu'il
 * relie. Cette addition est ce qui garantit que `sceneStarts()` retombe
 * exactement sur le début voulu de chaque séquence au lieu de dériver de
 * quelques frames à chaque raccord.
 *
 * Écrire une seule colonne à la main serait rejouer le calcul dans la tête à
 * chaque modification — et c'est précisément l'erreur qui a produit des
 * timecodes faux dans une version précédente.
 */

/** Durée utile de chaque séquence, transition exclue. */
export const BLINK_SPANS = {
	/**
	 * 00:00 — Objet gravé. Le médaillon, le tampon fluo, la phrase.
	 *
	 * 168 et non 120 : la règle de lisibilité impose 18 frames d'immobilité
	 * totale par mot d'impact, et trois mots plus un tampon ne tiennent pas dans
	 * deux secondes à ce régime. Les 48 frames ajoutées sont le prix d'un hook
	 * qui se lit — un hook illisible ne retient personne, quelle que soit son
	 * énergie.
	 */
	Hook: 168,
	/** 00:02.8 — Viseur de capture. « Deux secondes pour convaincre », frappé. */
	Rhythm: 120,
	/** 00:04.8 — Objet. La sphère et la nuée de curseurs qui cliquent. */
	Metaphor: 180,
	/** 00:07.8 — Typographie fluo. Jaune, noir, deux mots, deux battements. */
	Breathing: 180,
	/** 00:10.8 — Viseur de capture. La grille scannée au laser. */
	ScanUi: 240,
	/** 00:14.8 — Rupture. Le profil terne, la croix au feutre. */
	Contrast: 180,
	/** 00:17.8 — Objet. Quatre cartes de regard qui tombent en deck. */
	Perception: 240,
	/** 00:21.8 — Écran fendu en diagonale. Intention contre perception. */
	Gap: 240,
	/** 00:25.8 — Objet lumineux. Le score, la jauge, les particules. */
	ScoreHero: 240,
	/** 00:29.8 — Interface de téléphone. Le plan d'action qui s'exécute seul. */
	ActionPlan: 240,
	/** 00:33.8 — La marque, la nuée, l'appel à l'action. */
	Outro: 240,
} as const;

export type BlinkSceneId = keyof typeof BLINK_SPANS;

/**
 * Le raccord qui **suit** chaque séquence, et sa durée en frames.
 *
 * Quatre grammaires, choisies sur ce que le récit fait à cet endroit précis —
 * jamais pour varier :
 *
 *   `mask`  scale-to-mask — on **entre dans** le sujet. Réservé aux changements
 *           d'échelle du récit : on plonge dans l'objectif, dans le résultat,
 *           dans l'application ;
 *   `whip`  slide whip — on **balaie**. Le geste du pouce sur un fil vertical ;
 *   `match` match cut d'objet — la **trajectoire survit** au raccord. Un seul
 *           emploi dans le film, là où la carte barrée tombe et où une carte de
 *           regard reprend exactement sa chute ;
 *   `slash` diagonal cut — un trait **ouvre** l'image. Réservé aux ruptures de
 *           registre, parce que la diagonale est le seul angle qui n'existe
 *           nulle part ailleurs dans un cadre vertical.
 *
 * Les durées tiennent dans la bande 8–12 frames, soit 0,13 à 0,20 s. Au-delà de
 * 15, un raccord commence à se regarder lui-même.
 */
export const BLINK_TRANSITIONS = {
	hookToRhythm: {kind: 'slash', frames: 12},
	rhythmToMetaphor: {kind: 'mask', frames: 12},
	metaphorToBreathing: {kind: 'whip', frames: 10},
	breathingToScanUi: {kind: 'slash', frames: 12},
	scanUiToContrast: {kind: 'whip', frames: 10},
	contrastToPerception: {kind: 'match', frames: 8},
	perceptionToGap: {kind: 'slash', frames: 12},
	gapToScoreHero: {kind: 'mask', frames: 12},
	scoreHeroToActionPlan: {kind: 'whip', frames: 10},
	actionPlanToOutro: {kind: 'mask', frames: 12},
} as const;

export type BlinkTransitionId = keyof typeof BLINK_TRANSITIONS;

const SPAN_IDS = Object.keys(BLINK_SPANS) as BlinkSceneId[];
const TRANSITION_FRAMES = Object.values(BLINK_TRANSITIONS).map((t) => t.frames);

/**
 * Durée réelle de chaque séquence dans la `TransitionSeries` : sa durée utile
 * plus le raccord qu'elle doit partager avec la suivante.
 */
export const BLINK_SCENES = Object.fromEntries(
	SPAN_IDS.map((id, index) => [id, BLINK_SPANS[id] + (TRANSITION_FRAMES[index] ?? 0)]),
) as Record<BlinkSceneId, number>;

/** 2 268 frames = 37,80 s. La somme des durées utiles, ni plus ni moins. */
export const BLINK_REEL_DURATION = SPAN_IDS.reduce(
	(total, id) => total + BLINK_SPANS[id],
	0,
);

/**
 * Position absolue du début de chaque séquence.
 *
 * Par construction — `cursor += span` — ces valeurs valent 0, 168, 288, 468,
 * 648, 888, 1068, 1308, 1548, 1788, 2028. Indispensable pour caler la voix off
 * et les repères sonores du montage : une réplique se prononce à
 * `sceneStarts()[id] + cue.at`.
 */
export const sceneStarts = (): Record<BlinkSceneId, number> => {
	const starts = {} as Record<BlinkSceneId, number>;
	let cursor = 0;
	for (const id of SPAN_IDS) {
		starts[id] = cursor;
		cursor += BLINK_SPANS[id];
	}
	return starts;
};

/** Le score mis en scène, et tout ce qui en découle. */
export const DEMO = {
	score: 742,
	/** Palier atteint à 680 : « Sharp ». */
	tier: 'Sharp',
	/** Palier suivant : « Magnetic » à 790. */
	nextTier: 'Magnetic',
	pointsToNext: 790 - 742,
	/** Progression à l'intérieur du palier Sharp : (742−680)/(790−680). */
	tierProgress: (742 - 680) / (790 - 680),
} as const;
