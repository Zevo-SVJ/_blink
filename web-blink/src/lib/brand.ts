/**
 * Official Blink brand assets — light-blue identity.
 * The logo is the new blue square provided by the team. The mark is extracted
 * directly from that logo. Do not redesign or replace these.
 */
export const BLINK_LOGO = "/brand/logo-v3.png"; // official blue square logo
export const BLINK_MARK = "/brand/mark-v3.png"; // white mark, transparent background
export const HERO_VISUAL = "/brand/hero-visual.jpg"; // retained asset

export const BRAND = {
  name: "Blink",
  tagline: "See yourself the way others see you.",
  cta: "See my first impression",
} as const;

/**
 * Official social profiles.
 *
 * `null` means "not published yet", and the footer omits those entries rather
 * than rendering a link to `#` — a link that scrolls the reader to the top of
 * the page is worse than no link at all. Fill a URL in here and it appears.
 */
export const SOCIAL: Record<"instagram" | "tiktok" | "x", string | null> = {
  instagram: null,
  tiktok: null,
  x: null,
};
