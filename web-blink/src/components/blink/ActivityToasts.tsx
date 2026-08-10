/**
 * Blink — landing activity ticker.
 *
 * A small notification drops in near the top of the landing page every so
 * often. It exists to show that Blink is a thing people use, and it is marked
 * as illustrative rather than pretending to be a live feed — see the honesty
 * note in `lib/activity.ts`.
 *
 * Deliberate constraints:
 *
 *  - **Landing only.** It is mounted by `Index` and nowhere else. Inside the
 *    app it would be noise competing with the user's own results.
 *  - **Never blocking.** `pointer-events-none` on the container, so it can
 *    never swallow a tap meant for the nav or the CTA underneath it.
 *  - **One at a time.** A stack turns into a wall; a single card reads as a
 *    passing detail.
 *  - **Quiet when unwatched.** The timer stops while the tab is hidden, so a
 *    reader who returns after ten minutes doesn't meet a backlog.
 *  - **Off entirely under reduced motion.** Something that slides in
 *    unprompted every few seconds is exactly what that setting is for.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { makeEvent, nextDelay, type ActivityEvent } from "@/lib/activity";

/** How long a notification stays before it leaves on its own. */
const VISIBLE_MS = 4200;

/** Nothing at all for this long after load, so the hero lands first. */
const INITIAL_QUIET_MS = 5200;

export function ActivityToasts() {
  const reduceMotion = useReducedMotion();
  const [event, setEvent] = useState<(ActivityEvent & { id: number }) | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduceMotion) return;

    let id = 0;
    let stopped = false;
    const clearAll = () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };

    const schedule = (delay: number) => {
      const t = window.setTimeout(() => {
        if (stopped) return;
        // Don't animate into a tab nobody is looking at — just try again later.
        if (document.hidden) {
          schedule(6000);
          return;
        }
        id += 1;
        setEvent({ ...makeEvent(), id });
        const hide = window.setTimeout(() => setEvent(null), VISIBLE_MS);
        timers.current.push(hide);
        schedule(nextDelay());
      }, delay);
      timers.current.push(t);
    };

    schedule(INITIAL_QUIET_MS);

    return () => {
      stopped = true;
      clearAll();
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div
      aria-live="off"
      className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-30 flex justify-center px-4"
    >
      <AnimatePresence>
        {event && (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-full bg-blink-navy-2/85 py-2 pl-2.5 pr-3.5 shadow-[0_12px_34px_-16px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.09] backdrop-blur-xl"
          >
            <span
              aria-hidden
              className="relative flex h-1.5 w-1.5 shrink-0 rounded-full bg-blink-sky"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-blink-sky/70" />
            </span>

            <p className="truncate text-[0.78rem] font-medium text-white/75">
              <span className="font-bold text-white">@{event.handle}</span>{" "}
              {event.action}
            </p>

            {/* Not a live feed. Small, muted, but never absent. */}
            <span className="shrink-0 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-white/35">
              sample
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
