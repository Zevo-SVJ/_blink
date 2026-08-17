/**
 * DESIGN SONORE — le catalogue et ses volumes de référence.
 *
 * Huit sons, et aucun de plus. La contrainte est délibérée : un film de
 * trente-huit secondes qui emploierait quinze sons différents n'aurait pas de
 * design sonore, il aurait une bande-son. Ce sont les **répétitions** qui font
 * qu'un son devient signifiant — le spectateur apprend en deux occurrences que
 * le clic mécanique veut dire « quelque chose vient d'être validé ».
 *
 * Les volumes ci-dessous sont les niveaux de référence de chaque famille. Ils
 * sont hiérarchisés, pas égaux :
 *
 *   0,50  ce qui frappe    — impact grave, clic mécanique
 *   0,40  ce qui apparaît  — obturateur, bip, pop de carte
 *   0,45  l'exception      — le trait de feutre, qui n'arrive qu'une fois
 *   0,14  ce qui relie     — souffle de raccord, onze fois dans le film
 *   0,30  ce qui court     — rouleau du compteur, présent sous une autre couche
 *
 * Un raccord doit se sentir sans couvrir ce qu'il relie : c'est pour ça que le
 * souffle est 11 dB sous l'impact, et non l'inverse. La première version le
 * plaçait à 0,35 et il devenait, à la onzième occurrence, la seule chose qu'on
 * entendait.
 *
 * Les fichiers sont synthétisés par `npm run sfx` (voir
 * `scripts/sfx/build-sfx.mjs`) : déterministes, libres de droits, moins de
 * 100 ko au total. Déposer un fichier du même nom dans `public/sfx/` les
 * remplace un pour un, sans toucher au code.
 */

export const SFX = {
	/** Ouverture d'un cadre de capture. */
	cameraShutter: {file: 'sfx/camera_shutter.mp3', volume: 0.4},
	/** Confirmation d'interface, verrouillage de viseur. */
	beep: {file: 'sfx/beep.mp3', volume: 0.4},
	/** Tampon, bascule d'interrupteur, clic de souris. */
	clickMechanic: {file: 'sfx/click_mechanic.mp3', volume: 0.5},
	/**
	 * Raccord, balayage, passage d'un instrument.
	 *
	 * Volume 0,14 — de loin le plus bas du catalogue, et c'est volontaire. Ce son
	 * revient onze fois en trente-huit secondes : c'est le seul du film à être
	 * assez fréquent pour devenir un tic. Un raccord doit se **sentir**, pas
	 * s'entendre ; à ce niveau il donne du mouvement à l'image sans jamais
	 * réclamer l'attention, et il passe sous la voix off au lieu de se battre
	 * avec elle.
	 */
	softSwipe: {file: 'sfx/soft_air_swipe.mp3', volume: 0.14},
	/** Punchline, chiffre qui se verrouille, mot plein cadre. */
	impactThud: {file: 'sfx/impact_thud.mp3', volume: 0.5},
	/** La croix au feutre. Une seule occurrence dans tout le film. */
	markerScratch: {file: 'sfx/marker_scratch.mp3', volume: 0.45},
	/** Empilement des cartes de regard. */
	cardPop: {file: 'sfx/card_pop.mp3', volume: 0.4},
	/** Rouleau du compteur de score. */
	countUpTick: {file: 'sfx/count_up_tick.mp3', volume: 0.3},
} as const;

export type SfxName = keyof typeof SFX;

export type SfxCue = {
	/** Frame de déclenchement, relative à la séquence porteuse. */
	at: number;
	sound: SfxName;
	/** Écrase le volume de référence. À n'employer que pour un rappel discret. */
	volume?: number;
	/** Décale la lecture dans le fichier, en frames. Utile pour couper une attaque. */
	startFrom?: number;
};

/**
 * L'anticipation sonore.
 *
 * Un son placé exactement sur la frame de l'évènement visuel arrive en retard à
 * l'oreille : le transitoire d'attaque met quelques millisecondes à atteindre
 * son pic, alors que l'image, elle, est instantanée. Deux frames d'avance
 * (33 ms) suffisent à recaler la perception.
 *
 * C'est le pendant sonore de `leadInFrames` dans la partition de voix off, et
 * il joue dans le même sens : l'oreille précède l'œil.
 */
export const SFX_LEAD = 2;

/** Applique l'anticipation à un ensemble de repères. */
export const cue = (at: number, sound: SfxName, volume?: number): SfxCue => ({
	at: Math.max(0, at - SFX_LEAD),
	sound,
	...(volume === undefined ? {} : {volume}),
});
