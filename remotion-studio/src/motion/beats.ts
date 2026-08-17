import {useVideoConfig} from 'remotion';

/**
 * Grille rythmique.
 *
 * La référence tire sa sensation d'« audio-réactivité » du fait que chaque
 * impact visuel tombe sur un temps fort. Sans piste audio, ce rythme doit être
 * **écrit** : tous les évènements se calent sur une grille métrique, et l'œil
 * perçoit la régularité même en l'absence de son.
 *
 * 120 BPM à 60 fps donne un temps de 30 frames — exactement 0,5 s, ce qui
 * correspond à la « respiration » décrite dans l'analyse de référence. Toutes
 * les subdivisions utiles tombent sur des entiers, donc aucune valeur de timing
 * n'a besoin d'être arrondie.
 */
export const BPM = 120;

export type BeatGrid = {
	/** 1 temps. */
	beat: number;
	/** 1/2 temps — durée d'une transition rapide. */
	half: number;
	/** 1/3 de temps — durée d'arrivée typique d'un ressort `pop`. */
	third: number;
	/** 1/6 de temps — stagger large (83 ms). */
	sixth: number;
	/** 1/10 de temps — stagger serré (50 ms). */
	tenth: number;
	/** Nombre de frames pour `n` temps. */
	at: (beatCount: number) => number;
	/** Une mesure de 4 temps. */
	bar: number;
};

export const createGrid = (fps: number): BeatGrid => {
	const beat = Math.round((fps * 60) / BPM);
	return {
		beat,
		half: Math.round(beat / 2),
		third: Math.round(beat / 3),
		sixth: Math.round(beat / 6),
		tenth: Math.round(beat / 10),
		bar: beat * 4,
		at: (beatCount: number) => Math.round(beatCount * beat),
	};
};

/** Grille du contexte vidéo courant. */
export const useGrid = (): BeatGrid => {
	const {fps} = useVideoConfig();
	return createGrid(fps);
};

/**
 * Valeurs de stagger, en frames à 60 fps.
 * La bande 0,04–0,08 s de la référence se traduit exactement en 2 à 5 frames.
 */
export const STAGGER = {
	/** 33 ms — cascade de lettres, très serrée. */
	tight: 2,
	/** 50 ms — la valeur par défaut. */
	base: 3,
	/** 67 ms — listes et cartes. */
	wide: 4,
	/** 83 ms — éléments lourds, peu nombreux. */
	loose: 5,
	/**
	 * 100 ms — cascade franchement marquée.
	 *
	 * Réservé aux **cascades de mots** : sur trois ou quatre fragments, l'écart
	 * se lit comme une arrivée successive et non comme un bloc. À ne pas
	 * employer sur une grille dense : six éléments à 6 frames étalent
	 * l'apparition sur 36 frames, ce qui réintroduirait précisément la lenteur
	 * qu'on cherche à supprimer.
	 */
	marked: 6,
} as const;
