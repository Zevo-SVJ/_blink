import type {CSSProperties} from 'react';

/**
 * Un état de mouvement décrit *un écart* par rapport au repos.
 * Toutes les valeurs sont neutres au repos (opacity 1, translation 0, scale 1…),
 * ce qui rend les presets composables et interpolables sans cas particulier.
 */
export type MotionState = {
	opacity?: number;
	x?: number;
	y?: number;
	scale?: number;
	scaleX?: number;
	scaleY?: number;
	rotate?: number;
	rotateX?: number;
	rotateY?: number;
	/** Flou en px — le « depth of field » du motion design premium. */
	blur?: number;
	/** 1 = neutre. < 1 assombrit à l'entrée, > 1 crée un flash. */
	brightness?: number;
	/** Écartement des lettres en px, pour les titres façon keynote. */
	letterSpacing?: number;
};

export const REST: Required<MotionState> = {
	opacity: 1,
	x: 0,
	y: 0,
	scale: 1,
	scaleX: 1,
	scaleY: 1,
	rotate: 0,
	rotateX: 0,
	rotateY: 0,
	blur: 0,
	brightness: 1,
	letterSpacing: 0,
};

/**
 * Bibliothèque de presets. `from` est l'état de départ ; la cible est le repos,
 * sauf si une composition fournit explicitement un `to`.
 */
export const presets = {
	fade: {opacity: 0},
	riseIn: {opacity: 0, y: 48, blur: 8},
	driftIn: {opacity: 0, y: 24, scale: 0.98},
	scaleIn: {opacity: 0, scale: 0.86, blur: 6},
	glassPop: {opacity: 0, scale: 0.92, y: 28, blur: 14},
	tiltIn: {opacity: 0, rotateX: -22, y: 60, scale: 0.94},
	slideLeft: {opacity: 0, x: 72, blur: 6},
	slideRight: {opacity: 0, x: -72, blur: 6},
	revealUp: {opacity: 0, y: 110},
	/** La caméra « se pose » : on part d'un cadrage trop large et flou. */
	settle: {opacity: 0, scale: 1.14, blur: 10, brightness: 1.3},
	/** Titre keynote : les lettres se resserrent en se stabilisant. */
	tighten: {opacity: 0, letterSpacing: 14, blur: 10, y: 10},
} as const satisfies Record<string, MotionState>;

export type PresetName = keyof typeof presets;

const lerp = (from: number, to: number, t: number): number =>
	from + (to - from) * t;

/**
 * Interpole deux états. `progress` porte déjà l'easing ou le ressort :
 * l'interpolation est donc volontairement linéaire ici.
 */
export const mixStates = (
	from: MotionState,
	to: MotionState,
	progress: number,
): Required<MotionState> => {
	const result = {...REST};
	for (const key of Object.keys(REST) as (keyof MotionState)[]) {
		const a = from[key] ?? REST[key];
		const b = to[key] ?? REST[key];
		result[key] = lerp(a, b, progress);
	}
	return result;
};

const EPSILON = 0.001;
const near = (value: number, target: number) =>
	Math.abs(value - target) < EPSILON;

/** Sérialise un état en `transform` / `filter` CSS. */
export const toStyle = (state: MotionState): CSSProperties => {
	const s = {...REST, ...state};

	const transforms: string[] = [];
	// La perspective doit précéder les rotations 3D pour que le basculement ait
	// de la profondeur au lieu d'être une simple compression verticale.
	if (!near(s.rotateX, 0) || !near(s.rotateY, 0)) {
		transforms.push('perspective(1400px)');
	}
	if (!near(s.x, 0) || !near(s.y, 0)) {
		transforms.push(`translate3d(${s.x}px, ${s.y}px, 0)`);
	}
	if (!near(s.rotateX, 0)) transforms.push(`rotateX(${s.rotateX}deg)`);
	if (!near(s.rotateY, 0)) transforms.push(`rotateY(${s.rotateY}deg)`);
	if (!near(s.rotate, 0)) transforms.push(`rotate(${s.rotate}deg)`);
	if (!near(s.scale, 1) || !near(s.scaleX, 1) || !near(s.scaleY, 1)) {
		transforms.push(`scale(${s.scale * s.scaleX}, ${s.scale * s.scaleY})`);
	}

	const filters: string[] = [];
	if (!near(s.blur, 0)) filters.push(`blur(${Math.max(0, s.blur)}px)`);
	if (!near(s.brightness, 1)) filters.push(`brightness(${s.brightness})`);

	const style: CSSProperties = {opacity: s.opacity};
	if (transforms.length > 0) style.transform = transforms.join(' ');
	if (filters.length > 0) style.filter = filters.join(' ');
	if (!near(s.letterSpacing, 0)) style.letterSpacing = `${s.letterSpacing}px`;
	return style;
};

/**
 * Traduit un preset en variants Framer Motion, pour le côté interactif.
 * Le même vocabulaire visuel sert donc à la vidéo et à l'UI.
 */
export const toVariants = (state: MotionState) => {
	const s = {...REST, ...state};
	return {
		hidden: {
			opacity: s.opacity,
			x: s.x,
			y: s.y,
			scale: s.scale,
			rotate: s.rotate,
			rotateX: s.rotateX,
			rotateY: s.rotateY,
			filter: `blur(${s.blur}px) brightness(${s.brightness})`,
			letterSpacing: `${s.letterSpacing}px`,
		},
		visible: {
			opacity: 1,
			x: 0,
			y: 0,
			scale: 1,
			rotate: 0,
			rotateX: 0,
			rotateY: 0,
			filter: 'blur(0px) brightness(1)',
			letterSpacing: '0px',
		},
	} as const;
};
