/**
 * Blink — the score, as a verdict.
 *
 * ## Why this is not a ring
 *
 * Every score in this product used to arrive inside a circular gauge with a
 * stroke sweeping around it. That shape says *progress towards a target*: it
 * is a battery, a download, a fundraising thermometer. Blink's score is not a
 * target you are approaching — it is a reading of how the profile you have
 * right now comes across, and a ring frames it as a percentage of some ideal
 * profile that nobody has defined. It is also the single most over-used object
 * in dashboard design, which is the other half of the reason it is gone.
 *
 * What is here instead is a number and a measure. The number is the verdict,
 * set large enough to be the thing on the screen. The measure is a hairline
 * that fills to the same proportion — enough to see *high* or *low* without a
 * second glance, and honest about being a scale rather than a gauge.
 *
 * ## It arrives rather than appearing
 *
 * A verdict that is simply *there* has not been reached. The number counts to
 * rest in decelerating steps — 8.0, 8.4, 8.6, 8.7 — so the last tenth is the
 * slowest and the eye reads the final value as the answer rather than as one
 * more frame of an animation. Steps, not a spring: the display carries one
 * decimal and a spring that settles asymptotically renders 8.6999 for a frame.
 *
 * Under `prefers-reduced-motion` the score is simply the number, at rest.
 *
 * ## Out of ten, always
 *
 * Both scores in the product are ten-point scores: the analysis verdict is
 * stored that way, and the ladder score is a ten-point score multiplied by a
 * hundred (see `scoreOutOfTen`). Callers pass the ten-point value.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { SPRING, still } from "@/design/motion";
import { cn } from "@/lib/utils";

/**
 * The counting steps, as fractions of the target.
 *
 * Front-loaded on purpose: the first jump covers most of the distance and each
 * one after it covers less, which is what "coming to rest" is. An even ramp
 * reads as a progress bar.
 */
const STEPS = [0.86, 0.94, 0.98, 1];
const STEP_MS = [170, 150, 140, 190];

export function ScoreVerdict({
  /** The score, out of ten. */
  value,
  /** Small line above the number: what this is a score of. */
  label,
  /** Below the number: the tier, the niche, whatever names the reading. */
  caption,
  /** Restart the count whenever this changes. */
  playKey,
  size = "lg",
  className,
}: {
  value: number;
  label?: string;
  caption?: string;
  playKey?: string | number;
  size?: "sm" | "lg";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const timers: number[] = [];
    let elapsed = 0;
    STEPS.forEach((fraction, i) => {
      elapsed += STEP_MS[i];
      timers.push(window.setTimeout(() => setShown(value * fraction), elapsed));
    });
    setShown(0);
    return () => timers.forEach(window.clearTimeout);
  }, [value, playKey, reduced]);

  const fill = Math.max(0, Math.min(1, shown / 10));

  return (
    <div className={cn("min-w-0", className)}>
      {label && <p className="t-label text-white/35">{label}</p>}

      <p className={cn("flex items-baseline gap-1.5", label && "mt-1.5")}>
        <span
          className={cn(
            "t-numeric font-extrabold leading-none tracking-tight text-white",
            size === "lg" ? "text-[3.25rem] sm:text-[4rem]" : "text-[2.25rem]",
          )}
        >
          {shown.toFixed(1)}
        </span>
        <span
          className={cn(
            "t-numeric font-bold text-white/35",
            size === "lg" ? "text-base" : "text-sm",
          )}
        >
          / 10
        </span>
      </p>

      {/*
        The measure.

        A rule, not a ring: it says where this reading sits on the scale
        without implying the scale is a target you are filling up. Two layers,
        so the unfilled part is visible — a bar that only draws the filled
        portion gives no sense of what is left.
      */}
      <div
        className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.09]"
        role="img"
        aria-label={`${value.toFixed(1)} / 10`}
      >
        <motion.span
          className="block h-full rounded-full bg-blink-sky"
          initial={false}
          animate={{ width: `${fill * 100}%` }}
          transition={reduced ? still : SPRING.glide}
        />
      </div>

      {caption && <p className="t-caption mt-2.5 font-bold text-blink-sky">{caption}</p>}
    </div>
  );
}
