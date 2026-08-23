/**
 * Spring presets.
 *
 * Nervy on purpose. `crash` is the film's default. At 300/20 it settled in
 * about twelve frames — four tenths of a second, which is long enough that
 * the next beat had to wait for it, and waiting for things to finish is what
 * made an earlier cut of this film feel like a slideshow. At 480/23 it is
 * inside nine, so the following beat starts while this one is still moving.
 *
 * The overshoot is kept: a damping ratio near 0.55 throws a word about 12%
 * past its mark before it settles back, which is the difference between
 * landing and appearing.
 */

import { spring } from "remotion";

export const SPRING = {
  /** The default. Text and UI both arrive on this. */
  crash: { stiffness: 480, damping: 23, mass: 0.85 },
  /** Heavier and looser — for the one element that should feel like weight. */
  slam: { stiffness: 420, damping: 16, mass: 1 },
  /** Almost no overshoot. For UI that must feel precise, not playful. */
  tight: { stiffness: 560, damping: 28, mass: 0.65 },
  /** None at all. For anything that must not draw attention to itself. */
  flat: { stiffness: 200, damping: 30, mass: 1 },
  /**
   * A thing falling and landing.
   *
   * Heavier mass and low damping: it overshoots hard, rebounds once and
   * settles. That single bounce is what separates an object hitting a desk
   * from an image sliding into position.
   */
  drop: { stiffness: 300, damping: 13, mass: 1.15 },
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
