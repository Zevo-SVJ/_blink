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
	/**
	 * Élévation en px, sérialisée en `box-shadow`.
	 *
	 * C'est ce qui produit l'ombre portée dynamique : quand un élément grandit
	 * ou saute, son ombre s'éloigne et se diffuse au lieu de rester collée.
	 * Piloté par la même progression que le scale, les deux restent cohérents.
	 */
	elevation?: number;
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
	elevation: 0,
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

	// ── Famille « kinetic » — entrées ─────────────────────────────────────
	// Toutes partent d'un état franchement éloigné du repos : le ressort a
	// besoin d'amplitude pour que son dépassement se voie.

	/** L'entrée universelle : surgit de rien. */
	popIn: {opacity: 0, scale: 0},
	/** Surgit en tournant légèrement — casse la rigidité. */
	popTilt: {opacity: 0, scale: 0, rotate: -8},
	/** Arrive de trop grand : l'élément « atterrit » sur la caméra. */
	slamIn: {opacity: 0, scale: 1.75, rotate: -12},
	/** Tombe du haut. À combiner avec un squash à l'atterrissage. */
	dropIn: {opacity: 0, y: -240, rotate: -5},
	/** Monte du bas, à la manière d'une feuille modale. */
	riseUp: {opacity: 0, y: 320},
	/** Entrées latérales — le report de momentum d'une scène à l'autre. */
	flyLeft: {opacity: 0, x: 520, rotate: 6},
	flyRight: {opacity: 0, x: -520, rotate: -6},
	/** Élément lourd qui arrive en s'écrasant. */
	stampIn: {opacity: 0, scale: 2.4, rotate: -14, elevation: 60},

	// ── Famille « extrême » — entrées sans fondu ───────────────────────────
	// Le fondu est banni du régime haute rétention : un élément qui apparaît en
	// gagnant de l'opacité *s'affiche*, il n'arrive pas. Ces états partent donc
	// à `opacity: 1` et ne doivent leur apparition qu'au déplacement — l'élément
	// est simplement hors cadre, puis dedans.

	/** Entre par le bas, à pleine opacité. Le swipe. */
	hardUp: {y: 760},
	/** Entre par le haut, à pleine opacité. La chute. */
	hardDown: {y: -760},
	/** Chute de très haut, en tournant. Pour les objets lourds empilés. */
	dropHigh: {opacity: 0, y: -680, rotate: -9, elevation: 70},
	/** Tampon : s'imprime en venant de trop grand, incliné dans l'autre sens. */
	printIn: {opacity: 0, scale: 2.1, rotate: 9, elevation: 52},
	/** Arrive dans l'axe de la diagonale, en glissant. */
	slashIn: {opacity: 0, x: -260, y: 260},

	/**
	 * L'entrée **lisible**. À employer avec le ressort `read`.
	 *
	 * Une échelle, une opacité, rien d'autre : aucune rotation, aucune
	 * translation, et surtout **aucun flou**. Un mot qui arrive en tournant ou
	 * en filant demande à l'œil de le suivre avant de le lire ; un mot qui
	 * grandit sur place est lisible dès la première frame où il est net.
	 *
	 * 0,7 et non 0 : partir de zéro impose de traverser toutes les tailles
	 * intermédiaires, donc une phase illisible. Partir de 70 % garde le mot
	 * déchiffrable pendant toute son entrée.
	 */
	readPop: {opacity: 0, scale: 0.7},
} as const satisfies Record<string, MotionState>;

export type PresetName = keyof typeof presets;

/**
 * États de **sortie** — la cible, pas le départ.
 *
 * Règle non négociable du langage kinetic : on entre au ressort, on sort à la
 * courbe. Toutes ces sorties s'emploient avec `easing: 'back'`, qui produit
 * l'anticipation (léger gonflement) avant l'accélération finale.
 */
export const exits = {
	/** Se rétracte jusqu'à disparaître. La sortie par défaut. */
	crush: {opacity: 0, scale: 0},
	/** S'écrase au sol — pour les pop-ups qui « retombent ». */
	squashOut: {opacity: 0, scaleY: 0.1, scaleX: 1.3, y: 60},
	/** File hors champ, dans la direction du montage. */
	flyOutLeft: {opacity: 0, x: -640, rotate: -8},
	flyOutRight: {opacity: 0, x: 640, rotate: 8},
	/** Recule et se floute — sortie douce sous un élément entrant. */
	recede: {opacity: 0, scale: 0.82, blur: 14},
	/** Disparaît vers le haut. */
	liftOut: {opacity: 0, y: -220, scale: 0.9},

	// ── Famille « extrême » — sorties sans fondu ───────────────────────────

	/**
	 * Tombe hors cadre, **sans perdre son opacité**.
	 *
	 * C'est la sortie du match cut : l'objet doit encore être plein quand il
	 * quitte le bas de l'image, sinon la trajectoire que le plan suivant
	 * prolonge n'a jamais été visible jusqu'au bout.
	 */
	dropOut: {y: 1500, rotate: 9},
	/** File vers le haut hors cadre, sans fondu. Le swipe de sortie. */
	swipeOut: {y: -1500},
	/** Part dans l'axe de la diagonale. */
	slashOut: {opacity: 0, x: 340, y: -340, rotate: 6},
} as const satisfies Record<string, MotionState>;

export type ExitName = keyof typeof exits;

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
		// Borné à zéro : une échelle négative retournerait l'élément en miroir,
		// ce que la courbe `back` produirait sinon en fin de course.
		const x = Math.max(0, s.scale * s.scaleX);
		const y = Math.max(0, s.scale * s.scaleY);
		transforms.push(`scale(${x}, ${y})`);
	}

	const filters: string[] = [];
	if (!near(s.blur, 0)) filters.push(`blur(${Math.max(0, s.blur)}px)`);
	if (!near(s.brightness, 1)) filters.push(`brightness(${Math.max(0, s.brightness)})`);

	// La courbe `back` sort volontairement de [0, 1] pour produire
	// l'anticipation : les transforms doivent dépasser, mais une opacité
	// négative ou un scale inversé seraient des artefacts, pas du mouvement.
	const style: CSSProperties = {opacity: Math.min(1, Math.max(0, s.opacity))};
	if (transforms.length > 0) style.transform = transforms.join(' ');
	if (filters.length > 0) style.filter = filters.join(' ');
	if (!near(s.letterSpacing, 0)) style.letterSpacing = `${s.letterSpacing}px`;
	if (!near(s.elevation, 0)) {
		const lift = Math.max(0, s.elevation);
		style.boxShadow = `0 ${(lift * 0.9).toFixed(1)}px ${(lift * 2.2).toFixed(1)}px -${(lift * 0.5).toFixed(1)}px rgba(0, 6, 20, ${Math.min(0.6, 0.16 + lift * 0.006).toFixed(3)})`;
	}
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
