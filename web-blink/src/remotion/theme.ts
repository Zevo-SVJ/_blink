/**
 * The film's palette and type scale.
 *
 * Literal colours rather than the app's CSS custom properties: Remotion
 * renders the film in its own bundle with no stylesheet attached, so
 * `hsl(var(--blink-sky))` resolves to nothing. These are the same values
 * `index.css` declares — kept in sync by hand, which is safe because they are
 * the brand's fixed identity rather than a theme that varies.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const C = {
  /** Deeper than the app's navy: a film wants more contrast than a page. */
  bg: "hsl(220 84% 6%)",
  bgLift: "hsl(220 62% 11%)",
  navy: "hsl(220 84% 10%)",
  navy2: "hsl(220 60% 16%)",
  sky: "hsl(195 88% 83%)",
  sky2: "hsl(199 85% 76%)",
  bright: "hsl(208 95% 60%)",
  white: "hsl(0 0% 98%)",
  /** Readable secondary. Anything dimmer is decoration, not copy. */
  soft: "hsl(210 40% 96% / 0.66)",
  faint: "hsl(210 40% 96% / 0.34)",
  hair: "hsl(210 40% 96% / 0.12)",
  /** The red flag. Warm amber, not alarm red — this is an observation. */
  flag: "hsl(32 96% 62%)",
  flagDeep: "hsl(18 88% 46%)",
  good: "hsl(152 62% 52%)",
} as const;

/**
 * One typeface, four weights, and a scale that only has big steps.
 *
 * A vertical ad is watched at a glance on a phone held at arm's length. Type
 * that steps 48 → 56 → 64 reads as one size and gives the eye nothing to
 * latch onto; these steps are far enough apart that hierarchy is legible
 * before the words are.
 */
export const FONT =
  '"Inter", "Inter Tight", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

export const T = {
  mega: 232,
  huge: 168,
  big: 124,
  lead: 86,
  body: 56,
  label: 40,
  micro: 30,
} as const;

/** Tracking that keeps very large type from falling apart. */
export const TRACK = {
  mega: "-0.055em",
  huge: "-0.05em",
  big: "-0.042em",
  lead: "-0.03em",
  label: "0.18em",
} as const;
