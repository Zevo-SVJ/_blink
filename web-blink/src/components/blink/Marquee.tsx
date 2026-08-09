/**
 * Blink — the infinite marquee.
 *
 * A continuously moving row that never stops, never jumps, and never asks to
 * be operated. Used for the reactions stream and the analysed-profile stream.
 *
 * **How the seam is hidden.** The children are rendered twice, back to back,
 * inside a track that translates from 0 to exactly −50%. At −50% the second
 * copy occupies the pixels the first copy started in, so resetting to 0 is
 * invisible. This is why the duplicate is structural rather than padding: any
 * other distance leaves a visible snap.
 *
 * **Why not CSS `animation`.** It would work, but the whole app's motion goes
 * through Framer, and a repeating tween here keeps reduced-motion handling in
 * one place: `useReducedMotion` stops the travel outright rather than the row
 * crawling for someone who asked for stillness.
 *
 * Speed is expressed in pixels per second, not duration, so a row of nine
 * items and a row of thirty-four move at the same visual pace.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Marquee<T>({
  items,
  renderItem,
  keyFor,
  /** Travel speed in pixels per second. */
  speed = 34,
  /** Right-to-left by default; `-1` reverses. */
  direction = 1,
  gap = 12,
  className,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyFor: (item: T) => string;
  speed?: number;
  direction?: 1 | -1;
  gap?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  // Measure one copy's width so the duration matches the requested pace, and
  // re-measure on resize — a font swap or a rotation changes the width, and a
  // stale duration is what makes a marquee visibly speed up or drag.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setDistance(el.scrollWidth / 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  const duration = distance > 0 ? distance / speed : 0;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div
        ref={trackRef}
        className="flex w-max"
        style={{ gap }}
        animate={
          reduceMotion || duration === 0
            ? { x: 0 }
            : { x: direction === 1 ? [0, -distance] : [-distance, 0] }
        }
        transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
      >
        {/* Two copies: the second one is what the first becomes. */}
        {[0, 1].map((copy) => (
          <div
            key={copy}
            // `items-start` keeps each item at its own height instead of being
            // stretched to the tallest in the row.
            className="flex w-max shrink-0 items-start"
            style={{ gap }}
            aria-hidden={copy === 1}
          >
            {items.map((item) => (
              <div key={`${copy}-${keyFor(item)}`}>{renderItem(item)}</div>
            ))}
          </div>
        ))}
      </motion.div>

      {/* Edge fades, so items enter and leave rather than being cut off. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-blink-navy via-blink-navy/70 to-transparent sm:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-blink-navy via-blink-navy/70 to-transparent sm:w-24"
      />
    </div>
  );
}
