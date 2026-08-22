/**
 * Spring presets, named after what they do rather than their numbers.
 *
 * Remotion's `spring` takes damping and stiffness, and the difference between
 * a professional-looking overshoot and a wobble is about four units of
 * damping. Naming them stops that being re-guessed in every component, and
 * stops one word landing with a different personality from the next.
 */

import { spring as remotionSpring } from "remotion";

export const SPRING = {
  /** Punches past its mark and snaps back. The default for a word landing. */
  punch: { damping: 12, stiffness: 220, mass: 0.7 },
  /** Bigger, slower overshoot. For the one element that has to feel heavy. */
  heavy: { damping: 14, stiffness: 120, mass: 1.1 },
  /** Barely overshoots. For UI that should feel precise rather than playful. */
  crisp: { damping: 18, stiffness: 300, mass: 0.6 },
  /** No overshoot at all. For anything that must not draw attention. */
  settle: { damping: 30, stiffness: 200, mass: 1 },
  /** Violent. Reserved for the interrupt. */
  slam: { damping: 9, stiffness: 420, mass: 0.9 },
} as const;

export type SpringName = keyof typeof SPRING;

/**
 * The largest value a preset reaches before it settles.
 *
 * Derived, not guessed. A damped harmonic oscillator's first peak is
 * `1 + exp(-πζ/√(1-ζ²))`, where ζ is the damping ratio — so `slam` overshoots
 * by 47% while `crisp` overshoots by 6%. Guessing "about twenty per cent" for
 * both is how "RED FLAG" ended up sized for a peak it sailed straight past and
 * ran off the frame at.
 *
 * Anything that sizes itself to fit must divide its available width by this,
 * because the frame does not care that the extra width only lasts three
 * frames.
 */
export function peakOf(preset: SpringName): number {
  const { damping, stiffness, mass } = SPRING[preset];
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta >= 1) return 1;
  return 1 + Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
}

/**
 * A spring that starts at a given frame and is zero before it.
 *
 * Remotion's own `spring` clamps negative frames to 0, which means an element
 * scheduled to start later is already at its resting value — a stagger written
 * that way plays as everything arriving at once. This returns a hard zero
 * until the element's own frame arrives.
 */
export function springAt({
  frame,
  fps,
  start = 0,
  preset = "punch",
  durationInFrames,
}: {
  frame: number;
  fps: number;
  start?: number;
  preset?: SpringName;
  durationInFrames?: number;
}): number {
  const local = frame - start;
  if (local < 0) return 0;
  return remotionSpring({
    frame: local,
    fps,
    config: SPRING[preset],
    durationInFrames,
  });
}
