/**
 * Blink — finding the profile picture in an uploaded screenshot.
 *
 * ## Why not a circle detector
 *
 * The first attempt ran a Hough circle transform. It was accurate on clean
 * captures and catastrophic on real ones: a screenshot is full of circles —
 * story rings, highlight bubbles, faces in the grid, app icons — and when it
 * locked onto the wrong one the animation confidently zoomed into a random
 * post. A confident wrong answer is far worse here than an approximate right
 * one, so it was replaced by a fixed layout fraction (`pdpAnchor`).
 *
 * ## Why not the fixed fraction either
 *
 * The fraction assumes one layout. Real uploads vary: a status bar may or may
 * not be included, iOS and Android space the header differently, browser
 * captures add chrome, and people crop. The circle then lands *near* the
 * avatar rather than on it, which is exactly the complaint.
 *
 * ## What this does instead
 *
 * It doesn't look for a circle. It looks for the **first isolated blob in the
 * upper-left region that is roughly as wide as it is tall** — which, on an
 * Instagram profile, is the avatar and essentially nothing else.
 *
 * The constraints are what make it safe:
 *
 *  - Only the top-left quadrant is searched, so a face in the grid can never
 *    win.
 *  - Full-width runs are rejected, which discards status bars, nav bars and
 *    header rules.
 *  - The blob has to be square within a tolerance and within a plausible size
 *    band relative to the image width, so text runs and buttons are discarded.
 *  - Anything that fails returns `null`, and the caller falls back to the
 *    layout fraction. A miss degrades to the old behaviour rather than to a
 *    wrong answer.
 *
 * It runs once per upload on a ~160px downscale, so the cost is a single
 * `drawImage` and one pass over ~25k pixels.
 */

import type { PdpAnchor } from "@/lib/pdp";

/** Width, in px, the image is sampled at. Small enough to be free. */
const SAMPLE_W = 160;

/** Only look here. Fractions of the sampled image. */
const SEARCH = { x0: 0.02, x1: 0.5, y0: 0.0, y1: 0.55 };

/** Plausible avatar diameter, as a fraction of image width. */
const MIN_D = 0.1;
const MAX_D = 0.38;

/** A run wider than this is furniture — a bar, a rule, a header. */
const MAX_RUN = 0.55;

/** How square the blob has to be. 1 = perfect. */
const SQUARENESS = 0.62;

/** Colour distance beyond which a pixel is "not the background". */
const THRESHOLD = 34;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function distance(a: Rgb, b: Rgb): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

/**
 * The page's background colour.
 *
 * Taken as the **modal** colour of the right-hand column across the whole
 * search band — not the mean, and not the top corner.
 *
 *  - The top corner fails whenever the capture includes a dark status bar: the
 *    sample comes back black, every genuinely-background pixel then reads as
 *    foreground, and the detector finds nothing at all.
 *  - The mean fails because averaging a black bar with a white page yields
 *    grey, which is neither and matches nothing.
 *
 * The mode over a tall strip is right for both: whatever colour dominates the
 * empty right-hand side *is* the background, however much furniture sits above
 * it. Colours are quantised to 16 levels per channel so near-identical shades
 * from JPEG noise count as the same bucket.
 */
function backgroundColour(data: Uint8ClampedArray, w: number, h: number): Rgb {
  const counts = new Map<number, { rgb: Rgb; n: number }>();
  const yEnd = Math.min(h, Math.max(8, Math.ceil(SEARCH.y1 * h)));

  for (let y = 0; y < yEnd; y++) {
    for (let x = w - 6; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
      const key = ((rgb.r >> 4) << 8) | ((rgb.g >> 4) << 4) | (rgb.b >> 4);
      const entry = counts.get(key);
      if (entry) entry.n += 1;
      else counts.set(key, { rgb, n: 1 });
    }
  }

  let best: { rgb: Rgb; n: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.n > best.n) best = entry;
  }
  return best?.rgb ?? { r: 255, g: 255, b: 255 };
}

/**
 * Locate the profile picture, or return `null` if nothing convincing is there.
 *
 * Coordinates come back in the same normalised form as `pdpAnchor`, so the two
 * are interchangeable at the call site.
 */
export function detectPdp(
  source: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
): PdpAnchor | null {
  if (!naturalWidth || !naturalHeight) return null;

  const w = SAMPLE_W;
  const h = Math.max(1, Math.round((naturalHeight / naturalWidth) * SAMPLE_W));

  let data: Uint8ClampedArray;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, w, h);
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // A tainted canvas (cross-origin source) throws on read. Not fatal.
    return null;
  }

  const bg = backgroundColour(data, w, h);

  const x0 = Math.floor(SEARCH.x0 * w);
  const x1 = Math.ceil(SEARCH.x1 * w);
  const y0 = Math.floor(SEARCH.y0 * h);
  const y1 = Math.min(h - 1, Math.ceil(SEARCH.y1 * h));
  const maxRun = MAX_RUN * w;

  // Walk down the search band looking for the first row containing a run of
  // non-background pixels in the plausible size band.
  for (let y = y0; y <= y1; y++) {
    let runStart = -1;
    let best: { start: number; end: number } | null = null;

    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4;
      const isFg = distance({ r: data[i], g: data[i + 1], b: data[i + 2] }, bg) > THRESHOLD;

      if (isFg && runStart === -1) runStart = x;
      if ((!isFg || x === x1) && runStart !== -1) {
        const end = isFg ? x : x - 1;
        const width = end - runStart + 1;
        if (width >= MIN_D * w && width <= MAX_D * w && width <= maxRun) {
          if (!best || width > best.end - best.start) best = { start: runStart, end };
        }
        runStart = -1;
      }
    }

    if (!best) continue;

    /*
      Found the blob's first row. That row is near the *top* of the circle,
      where the chord is far shorter than the diameter — measuring there
      underestimated the avatar by ~30% (truth r=0.115 measured as 0.081 on a
      standard iOS capture). Since the zoom is `CIRCLE_SIZE / (2 * r)`, a 30%
      under-read inflates the scale by over 40%: the animation drove past the
      profile picture and framed a crop of the middle of it.

      So walk the blob down and take its widest row as the true diameter, and
      its vertical extent as the height, rather than trusting the first row.
    */
    const firstCx = Math.round((best.start + best.end) / 2);

    let bottom = y;
    for (let yy = y; yy < h; yy++) {
      const i = (yy * w + firstCx) * 4;
      if (distance({ r: data[i], g: data[i + 1], b: data[i + 2] }, bg) <= THRESHOLD) break;
      bottom = yy;
    }
    const height = bottom - y + 1;

    let diameter = best.end - best.start + 1;
    let cx = firstCx;
    for (let yy = y; yy <= bottom; yy++) {
      let runStart2 = -1;
      for (let x = x0; x <= x1; x++) {
        const i = (yy * w + x) * 4;
        const isFg =
          distance({ r: data[i], g: data[i + 1], b: data[i + 2] }, bg) > THRESHOLD;
        if (isFg && runStart2 === -1) runStart2 = x;
        if ((!isFg || x === x1) && runStart2 !== -1) {
          const end = isFg ? x : x - 1;
          const width = end - runStart2 + 1;
          // Still bounded by the plausible band, so a wide row of furniture
          // crossing the blob cannot inflate it.
          if (width > diameter && width <= MAX_D * w && width <= maxRun) {
            diameter = width;
            cx = Math.round((runStart2 + end) / 2);
          }
          runStart2 = -1;
        }
      }
    }

    // Square within tolerance, both ways — a tall run is a sidebar, a short
    // one is a rule.
    const ratio = Math.min(height / diameter, diameter / height);
    if (ratio < SQUARENESS) continue;

    const cy = (y + bottom) / 2;
    // The widest row is the real diameter, so only a little padding is needed
    // for the framing to read as deliberate rather than as a tight crop.
    const r = (Math.max(diameter, height) / 2) * 1.06;

    return {
      cx: cx / w,
      cy: cy / h,
      r: r / w,
    };
  }

  return null;
}
