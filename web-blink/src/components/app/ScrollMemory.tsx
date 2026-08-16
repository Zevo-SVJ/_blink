/**
 * Blink — where a page starts when you arrive at it.
 *
 * ## The two bugs this fixes
 *
 * React Router does not touch scroll position, and the browser's own
 * restoration only applies to real document loads. In a single-page app that
 * left both directions broken, in opposite ways:
 *
 *  1. **Opening a profile landed you halfway down it.** Scroll to the sixth
 *     row of Ranks, tap it, and the analysis rendered with the window still at
 *     that offset. The header, the handle and the score were all above the
 *     viewport, so the page appeared to open mid-article and had to be
 *     scrolled *up* before it made sense.
 *
 *  2. **Back forgot where you were.** Returning to the list put you at its
 *     top, so finding the row you had just come from meant scrolling the whole
 *     way down again.
 *
 * Both are the same missing behaviour, which every native list/detail
 * navigation has: a new screen starts at its top, and going back restores the
 * screen you left exactly as you left it.
 *
 * ## Why the position is captured during render
 *
 * The obvious implementation — save `window.scrollY` in an effect when the
 * location changes — records zero, every time, and it took a screenshot to see
 * why. Effects are passive: they run *after* React has already replaced the
 * page's contents. The incoming screen mounts as a short skeleton, the document
 * collapses from 1373px to less than a viewport, and the browser clamps the
 * scroll offset to 0 as part of that layout. By the time the effect asks where
 * the reader was, the answer has already been destroyed.
 *
 * So the capture happens in the render phase instead. React renders the new
 * tree before committing any DOM mutation, so at that moment the old page is
 * still on screen and `window.scrollY` still means something. Writing to a
 * module-level map during render is a side effect, but an idempotent one: a
 * transition that renders twice writes the same number twice.
 *
 * ## Restoring
 *
 * The offset cannot simply be re-applied once, for the same reason: the page
 * mounts as a skeleton, and scrolling to 500px in a 400px document does
 * nothing. The restore is retried across a short window until the document is
 * tall enough to hold it — and abandons immediately if the reader scrolls,
 * because fighting somebody for control of their own scroll position is worse
 * than the bug being fixed.
 *
 * Neither direction animates. A new page gliding up from wherever the last one
 * happened to be is motion nobody asked for.
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Scroll offset per history entry. Lives as long as the tab, like history. */
const REMEMBERED = new Map<string, number>();

/** How long to keep retrying while async content is still arriving. */
const RESTORE_WINDOW_MS = 1200;

function jumpTo(top: number) {
  window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
}

export function ScrollMemory() {
  const location = useLocation();
  const navigationType = useNavigationType();

  /**
   * The history entry whose scroll offset `window.scrollY` currently belongs
   * to. Updated during render, so a scroll event arriving after the swap —
   * including the browser's own clamp to 0 — is attributed to the page that is
   * actually on screen rather than to the one being left.
   */
  const owner = useRef(location.key);

  if (owner.current !== location.key) {
    REMEMBERED.set(owner.current, window.scrollY);
    owner.current = location.key;
  }

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      // Otherwise the browser's guess competes with the logic below.
      window.history.scrollRestoration = "manual";
    }

    const remember = () => REMEMBERED.set(owner.current, window.scrollY);
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, []);

  useEffect(() => {
    const target = navigationType === "POP" ? (REMEMBERED.get(location.key) ?? 0) : 0;

    if (target === 0) {
      jumpTo(0);
      return;
    }

    let cancelled = false;
    const deadline = Date.now() + RESTORE_WINDOW_MS;

    // A deliberate scroll by the reader wins, immediately and for good.
    const surrender = () => {
      cancelled = true;
    };
    window.addEventListener("wheel", surrender, { passive: true, once: true });
    window.addEventListener("touchstart", surrender, { passive: true, once: true });
    window.addEventListener("keydown", surrender, { once: true });

    const attempt = () => {
      if (cancelled) return;

      if (document.documentElement.scrollHeight - window.innerHeight >= target) {
        jumpTo(target);
        // The content can still settle after this — an image lands, a list
        // finishes animating in — so hold the position until the window is up.
        if (Date.now() < deadline) requestAnimationFrame(attempt);
        return;
      }

      if (Date.now() < deadline) requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);

    return () => {
      cancelled = true;
      window.removeEventListener("wheel", surrender);
      window.removeEventListener("touchstart", surrender);
      window.removeEventListener("keydown", surrender);
    };
  }, [location.key, navigationType]);

  return null;
}
