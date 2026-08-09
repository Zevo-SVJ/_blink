/**
 * Blink — where the Instagram profile picture sits.
 *
 * This is deliberately a *layout* constant, not image analysis.
 *
 * An earlier version ran a Hough circle transform over the upload to find the
 * avatar. It was accurate on clean captures, but a real screenshot is full of
 * circles — highlight bubbles, faces in the grid, story rings, app icons — and
 * when it locked onto one of those the animation zoomed into an arbitrary part
 * of the picture. A confident wrong answer is far worse here than a fixed
 * approximate one: it makes the product look broken.
 *
 * Instagram's profile header is laid out proportionally to viewport width, so
 * the avatar's position is predictable without looking at pixels at all. We
 * take that fixed proportion and use a generous radius, so the circle always
 * frames the header region containing the avatar. Slightly loose framing reads
 * as intentional; landing on a random post thumbnail does not.
 */

export interface PdpAnchor {
  /** Centre X as a fraction (0-1) of image width. */
  cx: number;
  /** Centre Y as a fraction (0-1) of image height. */
  cy: number;
  /** Radius as a fraction of image width. */
  r: number;
}

/**
 * Mobile app layout, as fractions of screenshot *width*.
 *
 * Instagram sizes the header in width-proportional units, so a full-screen
 * capture at any device height puts the avatar at the same fraction of width
 * from the top. `r` is wider than the avatar itself to absorb the variation
 * between iOS/Android, app versions, and captures that include a status bar.
 */
const MOBILE = { cx: 0.19, cyOfWidth: 0.26, r: 0.155 };

/**
 * Web layout. The header is anchored to a centred column, so the avatar sits
 * proportionally further left and is smaller relative to the full width.
 */
const DESKTOP = { cx: 0.17, cyOfHeight: 0.3, r: 0.1 };

/** Treat anything at least this wide relative to its height as a web capture. */
const DESKTOP_ASPECT = 1.15;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * The region the analysis animation focuses on.
 *
 * Always returns a circle fully inside the image and in its upper-left region.
 * Pure and synchronous — the same screenshot always produces the same anchor,
 * so the animation can never surprise the user.
 */
export function pdpAnchor(naturalWidth: number, naturalHeight: number): PdpAnchor {
  const w = Math.max(1, naturalWidth);
  const h = Math.max(1, naturalHeight);
  const aspect = w / h;

  const isDesktop = aspect >= DESKTOP_ASPECT;

  // The radius is a fraction of width, so on a very wide, short image it can
  // exceed the image's own height. Shrink it to whatever actually fits on both
  // axes — a smaller circle still reads as intentional, whereas an oversized
  // one would clamp to an out-of-frame centre and look broken.
  const r = Math.min(isDesktop ? DESKTOP.r : MOBILE.r, 0.5, (0.5 * h) / w);

  const cx = isDesktop ? DESKTOP.cx : MOBILE.cx;
  // Mobile derives Y from width (that is how the header scales); a wide web
  // capture is short enough that a fraction of height is the better anchor.
  const cyRaw = isDesktop ? DESKTOP.cyOfHeight : (MOBILE.cyOfWidth * w) / h;

  // Keep the circle wholly inside the frame. `rY` is the radius expressed in
  // height units, since the radius is defined against width.
  const rY = (r * w) / h;

  return {
    cx: clamp(cx, r, 1 - r),
    cy: clamp(cyRaw, rY, 1 - rY),
    r,
  };
}
