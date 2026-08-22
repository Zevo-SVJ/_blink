/**
 * Spring presets.
 *
 * `CRASH` is the film's default and the one the brief specifies: stiffness
 * 300, damping 20. Its damping ratio is 0.58, so it overshoots by about 11% —
 * enough that a word visibly arrives past its mark and settles back, which is
 * the difference between landing and appearing.
 */

import { spring } from "remotion";

export const SPRING = {
  /** The default. Text and UI both arrive on this. */
  crash: { stiffness: 300, damping: 20, mass: 1 },
  /** Heavier and looser — for the one element that should feel like weight. */
  slam: { stiffness: 260, damping: 13, mass: 1.1 },
  /** Almost no overshoot. For UI that must feel precise, not playful. */
  tight: { stiffness: 380, damping: 26, mass: 0.8 },
  /** None at all. For anything that must not draw attention to itself. */
  flat: { stiffness: 200, damping: 30, mass: 1 },
} as const;

export type SpringName = keyof typeof SPRING;

/**
 * A spring that is hard zero before its start frame.
 *
 * Remotion's `spring` clamps negative frames to zero, which means an element
 * scheduled for later is already at rest — so a stagger written that way plays
 * as everything arriving at once, which is precisely the bug this film exists
 * to avoid.
 */
export function springAt({
  frame,
  fps,
  start = 0,
  preset = "crash",
}: {
  frame: number;
  fps: number;
  start?: number;
  preset?: SpringName;
}): number {
  const local = frame - start;
  if (local < 0) return 0;
  return spring({ frame: local, fps, config: SPRING[preset] });
}

/**
 * How far past its mark a preset throws.
 *
 * The first peak of a damped oscillator, `1 + exp(-πζ/√(1-ζ²))`. Anything that
 * sizes itself to fit has to divide its available width by this: the frame
 * does not care that the extra width lasts three frames.
 */
export function peakOf(preset: SpringName): number {
  const { damping, stiffness, mass } = SPRING[preset];
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta >= 1) return 1;
  return 1 + Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
}
