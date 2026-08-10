/**
 * Blink — when a section's animation is allowed to run.
 *
 * ## The bug this exists to prevent
 *
 * Both landing sequences used to start on page load. `useInView` was attached
 * to the whole `<section>` with a generous bottom margin, and a section is
 * ~1000px tall — so its top edge fell inside the observer's reach while the
 * reader was still looking at the hero. Measured: four seconds after load,
 * without scrolling at all, How It Works had already reached its final act and
 * the leaderboard had started. By the time anyone actually arrived, they
 * joined halfway through a story whose beginning they never saw.
 *
 * Two decisions fix it:
 *
 *  - **Observe the animation, not the section.** The ref goes on the stage
 *    itself, so "in view" means the thing that moves is in view — not the
 *    heading a few hundred pixels above it.
 *  - **Anticipate slightly, don't preload.** A small positive bottom margin
 *    starts the sequence just as the stage clears the bottom edge, so it is
 *    already moving when it arrives without having run in the background.
 *
 * ## Why it isn't `once`
 *
 * These sequences loop. Left running while off-screen they burn a timer and a
 * compositor layer for a section nobody is looking at, and — worse — someone
 * who scrolls back finds them mid-cycle. Gating on live visibility pauses them
 * when they leave and resumes when they return, which is both cheaper and the
 * more natural behaviour.
 *
 * The hero deliberately does not use this: it is above the fold and must paint
 * immediately.
 */

import { useInView } from "framer-motion";
import { useRef, type RefObject } from "react";

export interface SectionMotion<T extends HTMLElement = HTMLDivElement> {
  /** Attach to the element that actually animates. */
  ref: RefObject<T | null>;
  /** True while that element is on screen (or just about to be). */
  inView: boolean;
}

export function useSectionMotion<T extends HTMLElement = HTMLDivElement>({
  /** Fraction of the stage that must be in reach before starting. */
  amount = 0.2,
  /**
   * How far past the bottom edge the observer reaches, as a fraction of the
   * viewport. Small on purpose: enough that the sequence is underway as the
   * stage arrives, not so much that it plays to an empty room.
   */
  lead = 0.12,
  /** Set for one-shot sequences that should not restart on re-entry. */
  once = false,
}: { amount?: number; lead?: number; once?: boolean } = {}): SectionMotion<T> {
  const ref = useRef<T>(null);
  const inView = useInView(ref, {
    amount,
    margin: `0px 0px ${Math.round(lead * 100)}% 0px`,
    once,
  });
  return { ref, inView };
}
