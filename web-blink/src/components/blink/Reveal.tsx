import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  once?: boolean;
}

/**
 * Scroll-triggered entrance.
 *
 * Two things matter here and both were wrong before:
 *
 *  - **When it fires.** `amount: 0.3` meant a section had to be 30% visible
 *    before anything moved, so on a tall block the user had already scrolled
 *    into empty space by the time it appeared. Now it needs only a sliver
 *    visible, and `margin` extends the observer 200px past the fold so the
 *    animation is already finishing as the section arrives.
 *
 *  - **How long it takes.** A spring that settles slowly reads as loading.
 *    This is a short, flat-out tween: content is in place in ~350ms.
 *
 * Content is always in the DOM — only opacity and a small offset animate — so
 * nothing here delays text becoming readable or shifts layout.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, {
    // A sliver is enough, and the observer reaches below the fold.
    amount: 0.05,
    margin: "0px 0px 200px 0px",
    once,
  });

  const offset = {
    up: { y: 16, x: 0 },
    down: { y: -16, x: 0 },
    left: { y: 0, x: 16 },
    right: { y: 0, x: -16 },
  }[direction];

  if (reduceMotion) return <div className={cn(className)}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offset }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offset }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
