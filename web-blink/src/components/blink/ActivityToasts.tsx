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
import { useT } from "@/lib/i18n";

/** How long a notification stays before it leaves on its own. */
const VISIBLE_MS = 4200;

/** Nothing at all for this long after load, so the hero lands first. */
const INITIAL_QUIET_MS = 5200;

export function ActivityToasts() {
  const reduceMotion = useReducedMotion();
  const t = useT();
  /* Read through a ref so switching language does not tear down the schedule
     and start the quiet period again. */
  const actions = useRef(t.activity.actions);
  actions.current = t.activity.actions;
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
        setEvent({ ...makeEvent(actions.current), id });
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
    /*
      Grid, not flex — and that is the whole fix for the drift.

      This was `flex justify-center`. `AnimatePresence` keeps a leaving
      notification mounted while the next one enters, so for those few hundred
      milliseconds the container held *two* children, and `justify-center`
      centred the pair: both sat off to one side, and the survivor slid
      sideways into the real centre the moment its predecessor unmounted. It
      looked like the notification flew in from the left. How far it travelled
      depended on the width of the other card, which is why it varied with the
      text and looked random.

      Placing every child in the same grid cell (`[grid-area:1/1]`) with
      `justify-items-center` centres each one *independently of its siblings*.
      A notification's horizontal position is now a function of its own width
      alone, correct on its first rendered frame, whether it is the only one on
      screen or overlapping the previous one. The vertical/fade/scale entrance
      is untouched — it is the same spring on the same properties.
    */
    <div
      aria-live="off"
      /*
        Bottom, not under the navbar.

        At the top it crossed whatever section heading happened to be on
        screen — a passing detail is allowed to be seen, not to sit on top of
        the page's own words. Down here it is in the corner a notification
        belongs in, and it clears the safe area on a phone.
      */
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid justify-items-center px-4 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:justify-items-start"
    >
      <AnimatePresence>
        {event && (
          <motion.div
            key={event.id}
            // Handle for `qa/toast-position.mjs`, which samples this element's
            // centre offset every frame to prove it never drifts sideways.
            data-activity-toast=""
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="glass-chrome flex max-w-[calc(100vw-2rem)] [grid-area:1/1] items-center gap-2.5 rounded-[var(--r-pill)] py-2 pl-2.5 pr-3.5"
          >
            <span
              aria-hidden
              className="relative flex h-1.5 w-1.5 shrink-0 rounded-full bg-blink-sky"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-blink-sky/70" />
            </span>

            <p className="t-caption truncate font-medium text-white/75">
              <span className="font-bold text-white">@{event.handle}</span>{" "}
              {event.action}
            </p>

            {/* Not a live feed. Small, muted, but never absent. */}
            <span className="t-label shrink-0 rounded-[var(--r-pill)] bg-white/[0.07] px-1.5 py-0.5 text-[0.55rem] text-white/35">
              sample
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
