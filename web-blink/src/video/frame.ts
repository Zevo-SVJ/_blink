/**
 * Blink — motion as a pure function of the frame.
 *
 * Every value in the film is computed from one number. Nothing here reads a
 * clock, holds state, or animates itself, which buys three things that matter
 * more than convenience:
 *
 *  - **The film can be inspected.** Any frame can be rendered on demand, so a
 *    beat that only exists for six frames can be screenshotted and looked at
 *    rather than argued about.
 *  - **It cannot drift.** Two elements timed to the same frame land on the
 *    same frame, on any device, at any load. Sound cues line up with pictures
 *    because both are addressed by frame number, not by elapsed milliseconds.
 *  - **It can be rendered offline.** This is deliberately the same contract
 *    Remotion uses — `spring({ frame, fps, config })`, `interpolate(frame, …)`
 *    — so the scenes can be handed to a renderer for a real MP4 without being
 *    rewritten. Remotion is not a dependency of this project; the scenes are
 *    simply written so that it could be.
 *
 * Framer Motion still does the DOM work. What it does not do here is own the
 * timing: a `useSpring` or a `transition` would be time-based and therefore
 * unaddressable, which is exactly what makes an ad impossible to tune.
 */

export const FPS = 30;

/** Seconds → frames, for writing a timeline in units humans think in. */
export const sec = (s: number) => Math.round(s * FPS);

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export interface SpringConfig {
  /** Higher is snappier. */
  stiffness?: number;
  /** Higher settles sooner; below critical it overshoots. */
  damping?: number;
  mass?: number;
}

/**
 * A damped harmonic oscillator, solved rather than stepped.
 *
 * Closed form, so frame 90 costs the same as frame 3 and gives the same answer
 * however it is reached — which a numerically integrated spring does not, and
 * which is what lets the scrubber jump straight to a beat.
 *
 * Under-damped configurations overshoot and come back. That overshoot is the
 * whole reason to use a spring instead of an ease: it is what makes a word
 * land rather than arrive.
 */
export function spring({
  frame,
  fps = FPS,
  config = {},
  delay = 0,
  from = 0,
  to = 1,
}: {
  frame: number;
  fps?: number;
  config?: SpringConfig;
  delay?: number;
  from?: number;
  to?: number;
}): number {
  const { stiffness = 180, damping = 16, mass = 1 } = config;
  const t = Math.max(0, (frame - delay) / fps);
  if (t === 0) return from;

  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  let progress: number;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    progress =
      1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  } else {
    // Critically damped and beyond: no overshoot, just an arrival.
    progress = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }

  return from + (to - from) * progress;
}

type Extrapolate = "clamp" | "extend";

/**
 * Piecewise-linear mapping, with easing applied inside each segment.
 *
 * The same shape as Remotion's, because the scenes are written to that
 * contract — and because "at frame 40 this is 0, by frame 52 it is 1" is how
 * an edit is actually reasoned about.
 */
export function interpolate(
  frame: number,
  input: number[],
  output: number[],
  opts: { easing?: (t: number) => number; extrapolate?: Extrapolate } = {},
): number {
  const { easing, extrapolate = "clamp" } = opts;
  if (input.length !== output.length || input.length < 2) {
    throw new Error("interpolate: input and output must pair up, with at least two stops");
  }

  if (frame <= input[0]) {
    if (extrapolate === "clamp") return output[0];
    const slope = (output[1] - output[0]) / (input[1] - input[0] || 1);
    return output[0] + (frame - input[0]) * slope;
  }

  const last = input.length - 1;
  if (frame >= input[last]) return output[last];

  let i = 0;
  while (i < last && frame > input[i + 1]) i += 1;

  const span = input[i + 1] - input[i] || 1;
  const raw = (frame - input[i]) / span;
  const t = easing ? easing(clamp(raw)) : clamp(raw);
  return output[i] + (output[i + 1] - output[i]) * t;
}

// ---------------------------------------------------------------------------
// Easings
// ---------------------------------------------------------------------------

/** Decisive exit, soft landing. The default for anything entering frame. */
export const outExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-9 * t));
/** Gathers speed. For anything leaving frame — a whip, a wipe. */
export const inExpo = (t: number) => (t === 0 ? 0 : 2 ** (9 * (t - 1)));
export const inOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/**
 * 1 while inside the window, 0 outside, with eased shoulders.
 *
 * Most beats in the film are "be present between these two frames", and
 * writing that as two interpolations every time is how off-by-one edits creep
 * in.
 */
export function window_(
  frame: number,
  start: number,
  end: number,
  fadeIn = 6,
  fadeOut = 6,
): number {
  if (frame < start || frame > end) return 0;
  const rise = interpolate(frame, [start, start + fadeIn], [0, 1], { easing: outExpo });
  const fall = interpolate(frame, [end - fadeOut, end], [1, 0], { easing: inExpo });
  return Math.min(rise, fall);
}
