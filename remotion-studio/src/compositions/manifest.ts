/**
 * Durées de référence des scènes, en frames (à 60 fps).
 *
 * Centralisées ici parce que trois endroits en dépendent : le catalogue du
 * studio (`Root.tsx`), le montage (`Reel.tsx`) et le playground interactif.
 * Une seule valeur à changer pour allonger un plan partout.
 */
export const SCENE_DURATIONS = {
	HeroReveal: 170,
	FeatureShowcase: 190,
	DeviceShowcase: 200,
} as const;

export type SceneId = keyof typeof SCENE_DURATIONS;

/** Durée d'un fondu entre deux plans du montage. */
export const TRANSITION_DURATION = 26;

/**
 * Une transition consomme du temps sur les deux plans qu'elle relie :
 * la durée totale vaut `Σ scènes − Σ transitions`.
 */
export const REEL_DURATION =
	SCENE_DURATIONS.HeroReveal +
	SCENE_DURATIONS.FeatureShowcase +
	SCENE_DURATIONS.DeviceShowcase -
	TRANSITION_DURATION * 2;
