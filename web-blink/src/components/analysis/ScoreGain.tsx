/**
 * Blink — "+18 points".
 *
 * The moment a re-scan pays off. A ring draws, the number lands, and the whole
 * thing leaves on its own — the Apple Pay beat, where finishing is confirmed by
 * the interface getting out of the way rather than by a button to dismiss.
 *
 * ## When it does NOT appear
 *
 * Only a genuine, counted gain earns it. No animation when the score is flat,
 * when it dropped, or when the upload didn't pass the verification gate — a
 * celebration for standing still is the fastest way to make every future one
 * meaningless. The caller decides; this component only draws.
 *
 * It is deliberately short. At ~1.9s it is over before it could be in the way
 * of the result the reader actually came for.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

const HOLD_MS = 1900;

export function ScoreGain({ delta, onDone }: { delta: number; onDone: () => void }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const t = window.setTimeout(onDone, reduceMotion ? 1200 : HOLD_MS);
    return () => window.clearTimeout(t);
  }, [onDone, reduceMotion]);

  return (
    <AnimatePresence>
      <motion.div
        key="score-gain"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        // Non-interactive: it never blocks a tap, it just plays over the result.
        className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-blink-navy/70 backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { scale: 0.86, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          className="flex flex-col items-center"
        >
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="5" />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--blink-sky))"
                strokeWidth="5"
                strokeLinecap="round"
                initial={{ pathLength: reduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.34, type: "spring", stiffness: 420, damping: 28 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-[1.65rem] font-extrabold tabular-nums tracking-tight text-white">
                +{delta}
              </span>
            </motion.div>
          </div>

          <motion.p
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.46, duration: 0.28 }}
            className="mt-5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-blink-sky/80"
          >
            Blink points
          </motion.p>
          <motion.p
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.58, duration: 0.28 }}
            className="mt-1.5 text-sm font-medium text-white/55"
          >
            Your profile reads better than last time.
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
