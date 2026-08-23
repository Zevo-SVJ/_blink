/**
 * The Blink motion system.
 *
 * ## The rule
 *
 * An element that changes state **transforms**. It does not fade out while a
 * different element fades in. Opacity is for something genuinely arriving or
 * genuinely leaving — never for swapping one thing for another, because a
 * cross-fade tells the reader nothing about the relationship between the two
 * states, and the relationship is the whole message.
 *
 * When the gaze changes from a crush to a stranger, the profile does not
 * reload: the same insights move, re-rank and are replaced individually. That
 * is only expressible with shared layout and transforms.
 *
 * ## Why springs rather than durations
 *
 * A duration says how long; a spring says how heavy. Two elements of different
 * sizes moving on the same 240ms tween look wrong together, and the same two on
 * the same spring look right, because the spring is a physical description and
 * the physics scale. Durations still exist for CSS, in `system.css`, where
 * springs are not available.
 *
 * ## The presets
 *
 * Five, deliberately. A system with fifteen springs is a system nobody uses
 * consistently — the point is that two engineers reaching for "this should feel
 * snappy" land on the same curve.
 */

import type { Transition } from "framer-motion";

/**
 * Every spring in the product.
 *
 * `visualDuration` is Framer's perceptual control: the time to *substantially*
 * arrive, with `bounce` deciding how much it overshoots on the way. Expressed
 * this way rather than as stiffness/damping because the two numbers that
 * actually matter to a designer are "how fast does it feel" and "how springy",
 * and mass/stiffness/damping obscure both.
 */
export const SPRING = {
  /**
   * The default. Anything arriving, moving between positions, or changing
   * size. Fast enough to feel instant, with just enough overshoot to read as
   * physical rather than as a computed tween.
   */
  base: { type: "spring", visualDuration: 0.34, bounce: 0.2 },

  /**
   * Immediate feedback: a press, a toggle, a selection landing. Almost no
   * overshoot — a control that wobbles under your finger feels loose, not
   * playful.
   */
  snap: { type: "spring", visualDuration: 0.2, bounce: 0.05 },

  /**
   * Something with weight arriving: a sheet, a card promoted to the front, a
   * score settling. The bounce is the mass.
   */
  drop: { type: "spring", visualDuration: 0.5, bounce: 0.3 },

  /**
   * Shared-layout moves — an element travelling from one place in the tree to
   * another. Slower and calmer than `base`, because the reader is following it
   * with their eyes and needs to be able to.
   */
  morph: { type: "spring", visualDuration: 0.46, bounce: 0.14 },

  /**
   * Ambient, continuous motion: an aura breathing, a parallax layer. No
   * bounce at all — anything the reader is not looking at directly must never
   * draw attention by overshooting.
   */
  glide: { type: "spring", visualDuration: 0.7, bounce: 0 },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof SPRING;

/**
 * The stagger between siblings, in seconds.
 *
 * Small on purpose. A stagger exists to say "these arrived together, in this
 * order" — at 100ms it starts saying "these are separate events", and a list of
 * eight becomes most of a second of waiting.
 */
export const STAGGER = 0.045;

/**
 * A reduced-motion-safe transition.
 *
 * The honest reading of the preference is *no motion*, not *less* motion — so
 * this returns an instant transition rather than a slower one. Position and
 * opacity still land where they should; they simply get there in a frame.
 *
 * Layout animations, parallax and anything scroll-driven have to check the
 * preference themselves, because there is no transition to swap out.
 */
export const still: Transition = { duration: 0 };

export function springFor(name: SpringName, reduced: boolean): Transition {
  return reduced ? still : SPRING[name];
}
