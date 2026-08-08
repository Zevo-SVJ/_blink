/**
 * Blink — profile picture (PDP) detection.
 *
 * The analysis animation collapses the uploaded screenshot into a circle that
 * should land on the Instagram avatar. Hard-coding a coordinate makes it miss
 * on every screenshot that isn't the exact shape it was tuned for, so we
 * actually look for the avatar instead.
 *
 * Approach: the avatar is a strong circular edge in the upper-left of a
 * profile header. We downscale, run a Sobel pass, and let edge pixels vote for
 * circle centres along their gradient direction (a Hough circle transform
 * restricted to plausible avatar positions and radii). The best peak wins if
 * it is convincing enough; otherwise we fall back to an aspect-aware estimate
 * of where the avatar sits, which still lands in the right area.
 *
 * All coordinates are returned as fractions so the caller can map them onto
 * the *displayed* element regardless of how the image is scaled.
 */

export interface PdpDetection {
  /** Centre X as a fraction (0-1) of image width. */
  cx: number;
  /** Centre Y as a fraction (0-1) of image height. */
  cy: number;
  /** Radius as a fraction of image width. */
  r: number;
  /** 0-1. Below `MIN_CONFIDENCE` the heuristic is used instead. */
  confidence: number;
  method: "detected" | "heuristic";
}

/** Width the image is downscaled to before analysis. */
const WORK_WIDTH = 300;

/**
 * Sample every Nth pixel when voting.
 *
 * This is the difference between ~1s and ~120ms of main-thread work. An avatar
 * rim contributes hundreds of edge pixels, so using a quarter of them still
 * produces an unambiguous peak — measured accuracy is unchanged at stride 2.
 */
const SAMPLE_STRIDE = 2;

/**
 * The avatar always sits in the left part of a profile header. The vertical
 * window is generous because a tightly cropped header puts the avatar much
 * further down the frame than a full-screen capture does.
 */
const SEARCH_X = 0.55;
const SEARCH_Y = 0.8;

/** Plausible avatar radii, as a fraction of screenshot width. */
const MIN_R_FRAC = 0.05;
const MAX_R_FRAC = 0.17;
const RADIUS_STEPS = 10;

/** Sobel magnitude above which a pixel is treated as an edge. */
const EDGE_THRESHOLD = 48;

/** Peak score below this is not trustworthy enough to animate to. */
const MIN_CONFIDENCE = 0.34;

/**
 * Where the avatar sits when detection fails.
 *
 * Instagram lays the header out in units proportional to the *width* of the
 * viewport, so the avatar's distance from the top is a function of width, not
 * height. Deriving `cy` that way keeps the estimate honest across a tall
 * full-screen capture and a tightly cropped header, where a fixed fraction of
 * height would be badly wrong for one of them.
 */
export function heuristicPdp(width: number, height: number): PdpDetection {
  const r = 0.115;
  const cyPx = 0.225 * width;
  return {
    cx: 0.17,
    cy: clamp(cyPx / Math.max(height, 1), 0.06, 0.42),
    r,
    confidence: 0,
    method: "heuristic",
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Locate the profile picture in a screenshot.
 *
 * Never rejects: when detection is not confident the aspect-aware heuristic is
 * returned, so callers always get a usable target.
 */
export async function detectPdp(source: Blob | string): Promise<PdpDetection> {
  try {
    const img = await loadImage(source);
    const detected = analyze(img);
    if (detected) return detected;
    return heuristicPdp(img.naturalWidth, img.naturalHeight);
  } catch {
    // Canvas unavailable, image decode failed, tainted canvas — the animation
    // must still run, so fall back to a square-ish default.
    return heuristicPdp(1, 2);
  }
}

function loadImage(source: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    const revoke = () => {
      if (typeof source !== "string") URL.revokeObjectURL(url);
    };
    img.onload = () => {
      revoke();
      resolve(img);
    };
    img.onerror = () => {
      revoke();
      reject(new Error("PDP_IMAGE_DECODE_FAILED"));
    };
    img.src = url;
  });
}

function analyze(img: HTMLImageElement): PdpDetection | null {
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  if (!naturalW || !naturalH) return null;

  const scale = Math.min(1, WORK_WIDTH / naturalW);
  const w = Math.max(1, Math.round(naturalW * scale));
  const h = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null; // Cross-origin taint.
  }

  // Grayscale.
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
  }

  // Search window — the avatar is always upper-left.
  const maxX = Math.min(w, Math.round(w * SEARCH_X));
  const maxY = Math.min(h, Math.round(h * SEARCH_Y));

  const radii: number[] = [];
  const minR = Math.max(4, MIN_R_FRAC * w);
  const maxR = MAX_R_FRAC * w;
  for (let s = 0; s < RADIUS_STEPS; s++) {
    radii.push(minR + ((maxR - minR) * s) / (RADIUS_STEPS - 1));
  }

  // One accumulator per radius, over the search window.
  const accs = radii.map(() => new Float32Array(maxX * maxY));

  // Sobel, voting along the gradient normal. An avatar edge points at the
  // avatar's centre, so votes from around the rim pile up on one cell.
  const yLimit = Math.min(h - 1, maxY + Math.round(maxR));
  const xLimit = Math.min(w - 1, maxX + Math.round(maxR));

  for (let y = 1; y < yLimit; y += SAMPLE_STRIDE) {
    for (let x = 1; x < xLimit; x += SAMPLE_STRIDE) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];

      const mag = Math.hypot(gx, gy);
      if (mag < EDGE_THRESHOLD) continue;

      const ux = gx / mag;
      const uy = gy / mag;

      for (let ri = 0; ri < radii.length; ri++) {
        const r = radii[ri];
        // Vote both ways: we do not know if the avatar is lighter or darker
        // than what surrounds it.
        for (const sign of [-1, 1]) {
          const cx = Math.round(x + sign * ux * r);
          const cy = Math.round(y + sign * uy * r);
          if (cx < 0 || cx >= maxX || cy < 0 || cy >= maxY) continue;
          accs[ri][cy * maxX + cx] += mag;
        }
      }
    }
  }

  // Best peak per radius, normalised by circumference so large radii don't win
  // by default.
  const perRadius = radii.map((r, ri) => {
    const acc = accs[ri];
    // Divided by stride² because sampling contributes proportionally fewer
    // votes — this keeps `score` on the same scale as a full-density pass, so
    // the confidence threshold below stays meaningful.
    const norm = (2 * Math.PI * r * 255) / (SAMPLE_STRIDE * SAMPLE_STRIDE);
    let peak = { score: 0, cx: 0, cy: 0, r };
    for (let cy = 0; cy < maxY; cy++) {
      for (let cx = 0; cx < maxX; cx++) {
        const score = acc[cy * maxX + cx] / norm;
        if (score > peak.score) peak = { score, cx, cy, r };
      }
    }
    return peak;
  });

  const strongest = perRadius.reduce((a, b) => (b.score > a.score ? b : a));
  if (strongest.score <= 0) return null;

  /**
   * Prefer the outermost strong circle.
   *
   * An avatar is concentric with whatever it contains — a face, a logo — and
   * those inner features often have far more contrast than the avatar's own
   * rim, which frequently sits light-grey against white. Taking the raw peak
   * therefore locks onto the face and crops roughly 2× too tight. Among all
   * radii that are nearly as convincing as the best, we take the largest, which
   * lands on the avatar boundary itself.
   */
  const OUTER_TOLERANCE = 0.78;
  const best =
    perRadius
      .filter((p) => p.score >= strongest.score * OUTER_TOLERANCE)
      .reduce((a, b) => (b.r > a.r ? b : a), strongest);

  // A perfect circle scores ~1. Real avatars land well below that because the
  // rim is partly low-contrast, so scale before thresholding. Confidence
  // reflects the strongest evidence found, not the radius we settled on.
  const confidence = clamp(strongest.score / 0.55, 0, 1);
  if (confidence < MIN_CONFIDENCE) return null;

  // The avatar cannot be flush against the edge; a peak that is means we
  // locked onto the image border rather than the avatar.
  if (best.cx < best.r * 0.5 || best.cy < best.r * 0.5) return null;

  return {
    cx: best.cx / w,
    cy: best.cy / h,
    r: best.r / w,
    confidence,
    method: "detected",
  };
}
