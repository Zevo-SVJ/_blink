/**
 * Design tokens — inspirés du langage visuel Apple / iOS 26 :
 * fonds très sombres, matières translucides « liquid glass », accents saturés,
 * typographie serrée et hiérarchie de profondeur assumée.
 *
 * Ces tokens sont partagés par les compositions Remotion (vidéo) ET par le
 * playground Framer Motion (web) : une seule source de vérité visuelle.
 */

export const palette = {
	// Fonds
	void: '#050507',
	ink: '#0A0A0F',
	slate: '#12121A',
	graphite: '#1C1C24',

	// Texte
	textPrimary: '#F5F5F7',
	textSecondary: 'rgba(235, 235, 245, 0.62)',
	textTertiary: 'rgba(235, 235, 245, 0.34)',

	// Accents système iOS
	blue: '#0A84FF',
	indigo: '#5E5CE6',
	purple: '#BF5AF2',
	pink: '#FF375F',
	orange: '#FF9F0A',
	teal: '#64D2FF',
	green: '#30D158',
	mint: '#66D4CF',
} as const;

export type PaletteColor = keyof typeof palette;

/**
 * Dégradés « mesh » utilisés en arrière-plan. Chaque entrée est une paire de
 * couleurs projetée en radial-gradient et animée très lentement.
 */
export const auroras = {
	nebula: [palette.indigo, palette.pink],
	horizon: [palette.blue, palette.teal],
	ember: [palette.orange, palette.pink],
	forest: [palette.mint, palette.blue],
	violet: [palette.purple, palette.indigo],
} as const;

export type AuroraName = keyof typeof auroras;

/**
 * Matières translucides. `backdropFilter` fonctionne dans le Chromium headless
 * utilisé par Remotion : les compositions sont donc rendues avec le vrai flou,
 * pas une approximation.
 */
export const materials = {
	glass: {
		background: 'rgba(255, 255, 255, 0.06)',
		backdropFilter: 'blur(48px) saturate(180%)',
		border: '1px solid rgba(255, 255, 255, 0.12)',
	},
	glassStrong: {
		background: 'rgba(255, 255, 255, 0.1)',
		backdropFilter: 'blur(72px) saturate(200%)',
		border: '1px solid rgba(255, 255, 255, 0.18)',
	},
	glassDim: {
		background: 'rgba(10, 10, 15, 0.55)',
		backdropFilter: 'blur(40px) saturate(140%)',
		border: '1px solid rgba(255, 255, 255, 0.08)',
	},
} as const;

export type MaterialName = keyof typeof materials;

/** Rayons de courbure — continus façon iOS (squircle-like). */
export const radii = {
	xs: 8,
	sm: 14,
	md: 22,
	lg: 32,
	xl: 44,
	pill: 999,
	device: 68,
} as const;

/** Échelle d'espacement en 4pt, comme les guidelines Apple. */
export const spacing = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 40,
	xxl: 64,
	xxxl: 96,
} as const;

/** Ombres portées longues et douces — la profondeur vient du flou, pas du noir. */
export const shadows = {
	soft: '0 24px 60px -20px rgba(0, 0, 0, 0.55)',
	lifted: '0 48px 120px -32px rgba(0, 0, 0, 0.7)',
	glow: (color: string) => `0 32px 90px -24px ${color}66`,
} as const;

/**
 * Formats de canvas prêts à l'emploi. `fps: 60` par défaut : le motion design
 * premium se juge sur la fluidité, et Remotion rend chaque frame quoi qu'il
 * arrive (aucun risque de drop, contrairement à une capture d'écran).
 */
export const canvas = {
	landscape: {width: 1920, height: 1080, fps: 60},
	square: {width: 1080, height: 1080, fps: 60},
	vertical: {width: 1080, height: 1920, fps: 60},
	cinema: {width: 2560, height: 1080, fps: 60},
} as const;

export type CanvasName = keyof typeof canvas;
