/**
 * Blink — "How your crush sees you", as a reveal.
 *
 * One beat at a time, inside the signature perception card. The point is the
 * pacing: a reader who is handed five paragraphs skims them, and a reader who
 * is handed one line at a time reads every one. It also means the interesting
 * beat — the loudest signal, with its number — lands on its own instead of
 * being the third sentence of a block.
 *
 * ## Why it advances on its own
 *
 * This is the screen people record. An auto-advancing reveal produces a clip
 * with a beginning and an ending without the recorder having to narrate or tap
 * anything, which is exactly what gets posted. Any interaction — a tap, a dot,
 * the keyboard — takes the wheel and stops the timer for good, because someone
 * who has started driving should not be fighting an autoplay.
 *
 * The last beat is terminal. It does not loop back to the start: a reveal that
 * restarts under the reader has taken the ending away from them.
 *
 * ## Why it is gated on the viewport
 *
 * The first build ran its timer from mount. Measured on `/dev`: by the time
 * the card was scrolled to, the reveal had already finished — the counter read
 * "Replay" and the reader had missed all five beats. A sequence that plays to
 * an empty room is worse than no sequence, so the timer only runs while the
 * card is actually on screen, and rewinds when it leaves so returning to it
 * starts the story again rather than dropping the reader at the ending.
 *
 * Reduced motion gets every beat at once, unanimated. There is no version of
 * this that is worth withholding content over.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import type { Beat } from "@/lib/perception-read";
import { useSectionMotion } from "@/lib/use-section-motion";
import { cn } from "@/lib/utils";

/** Time on each beat before the next one arrives. */
const BEAT_MS = 3400;

export function PerceptionReveal({ beats, lensId }: { beats: Beat[]; lensId: string }) {
  const reduceMotion = useReducedMotion();
  // Negative lead, not positive: the result screen parks a fixed section pill
  // and the app tab bar over the bottom ~150px of the viewport. A reveal
  // sitting in that band is inside the viewport rectangle but behind the
  // furniture, and it would start — and burn its first beats — while the
  // reader cannot see a word of it. Pulling the bottom edge up excludes the
  // occluded strip, so the sequence begins once the card is genuinely legible.
  const { ref, inView } = useSectionMotion<HTMLDivElement>({ amount: 0.35, lead: -0.18 });
  const [index, setIndex] = useState(0);
  const [driving, setDriving] = useState(false);

  // A new perspective is a new reveal, from the top, auto-advancing again.
  useEffect(() => {
    setIndex(0);
    setDriving(false);
  }, [lensId]);

  // Scrolled away and back: rewind, so they get the beginning rather than
  // whatever beat the timer happened to stop on. Someone who took the wheel
  // keeps it — rewinding under them would undo a deliberate choice.
  useEffect(() => {
    if (!inView && !driving) setIndex(0);
  }, [inView, driving]);

  const last = beats.length - 1;
  const atEnd = index >= last;

  useEffect(() => {
    if (reduceMotion || driving || atEnd || beats.length === 0 || !inView) return;
    const t = window.setTimeout(() => setIndex((i) => Math.min(i + 1, last)), BEAT_MS);
    return () => window.clearTimeout(t);
  }, [index, driving, atEnd, last, beats.length, reduceMotion, inView]);

  const goTo = useCallback((i: number) => {
    setDriving(true);
    setIndex(i);
  }, []);

  const advance = useCallback(() => {
    setDriving(true);
    setIndex((i) => (i >= last ? 0 : i + 1));
  }, [last]);

  if (beats.length === 0) return null;

  // Everything at once, no timers, no controls.
  if (reduceMotion) {
    return (
      <div className="mt-5 space-y-5">
        {beats.map((beat) => (
          <BeatBody key={beat.id} beat={beat} />
        ))}
      </div>
    );
  }

  const beat = beats[Math.min(index, last)];

  return (
    <div className="mt-5" ref={ref}>
      <button
        type="button"
        onClick={advance}
        aria-label={atEnd ? "Replay the reveal" : "Show the next part"}
        className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blink-sky/70"
      >
        {/* Fixed floor, not a fixed height: the tallest beat sets the box on
            the first render and shorter ones simply don't shrink it, so the
            card never resizes under the reader between beats. */}
        <div className="grid min-h-[7.5rem] items-start">
          {/* Not `mode="wait"`. Waiting requires the exit animation to finish
              before the next beat mounts, and an exit that stalls — off-screen,
              in a background tab — strands the card on a beat the index has
              already moved past. Both beats share one grid cell, so overlapping
              for a frame is exactly what should happen. */}
          <AnimatePresence initial={false}>
            <motion.div
              key={beat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              // Same grid cell for every beat, so the outgoing and incoming
              // ones overlap instead of stacking and jolting the layout.
              className="col-start-1 row-start-1"
            >
              <BeatBody beat={beat} />
            </motion.div>
          </AnimatePresence>
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {beats.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={b.kicker}
              aria-current={i === index}
              className="relative h-6 w-6 -m-1.5 flex items-center justify-center"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-blink-sky" : "w-1.5 bg-white/25",
                )}
              />
            </button>
          ))}
        </div>

        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/35">
          {atEnd ? "Replay" : `${index + 1} / ${beats.length}`}
        </span>
      </div>
    </div>
  );
}

function BeatBody({ beat }: { beat: Beat }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.62rem] font-bold uppercase leading-tight tracking-[0.16em] text-white/45">
          {beat.kicker}
        </p>
        {beat.signal && (
          <p className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-blink-sky/80">
            {beat.signal.label}
          </p>
        )}
      </div>

      {beat.signal && <SignalBar score={beat.signal.score} />}

      {beat.body && (
        <p className="mt-2.5 text-[0.98rem] font-medium leading-relaxed text-white/90">
          {beat.body}
        </p>
      )}

      {beat.traits && beat.traits.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {beat.traits.map((trait, i) => (
            <motion.span
              key={trait}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 340, damping: 26, delay: i * 0.07 }}
              className={cn(
                "rounded-full px-3 py-1.5 text-[0.8rem] font-bold",
                i === 0 ? "bg-blink-sky text-blink-navy" : "bg-white/[0.1] text-white/85",
              )}
            >
              {trait}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The number, drawn.
 *
 * "Mystery 8.4" is the line that makes a viewer ask what their own number
 * would be, so it gets a bar rather than sitting inside a sentence.
 */
function SignalBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div className="mt-2 flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <motion.span
          className="block h-full rounded-full bg-blink-sky"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.15 }}
        />
      </div>
      <span className="shrink-0 text-sm font-extrabold tabular-nums text-white">
        {score.toFixed(1)}
      </span>
    </div>
  );
}
