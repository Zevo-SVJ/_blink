/**
 * Blink — "How it works".
 *
 * The section has one job: make it obvious, without reading a word of prose,
 * that **the same profile produces different readings depending on who is
 * looking**. That is the whole product, and the previous version never said
 * it — it showed a screenshot being scanned and resolving into a single score,
 * which describes an algorithm rather than a reason to care.
 *
 * So the composition is deliberately literal: one screenshot, pinned at the
 * top and never replaced, with the reading underneath it changing. Nothing
 * about the profile moves. Everything about the interpretation does.
 *
 * Three rules this file exists to hold:
 *
 *  - **It starts on arrival.** The observer reaches nearly half a viewport
 *    below the fold and the first beat is 900ms, so the scan is already
 *    running by the time the section is on screen. No entrance chain.
 *  - **It never stops.** After the intro the lenses cycle indefinitely. A
 *    section that plays once and freezes reads as a screenshot of a product
 *    rather than a product.
 *  - **No decoration.** No glow, no highlight plate, no floating square behind
 *    anything — every element on screen is the profile, the reading, or the
 *    control that switches between them.
 *
 * This section absorbed the standalone "Perceptions" block that used to follow
 * it. Two sections making the same point in a row was the page repeating
 * itself.
 */

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { PERCEPTIONS } from "@/lib/blink-data";
import { cn } from "@/lib/utils";

/** How long the intro scan runs before the first reading appears. */
const INTRO_MS = 900;

/** How long each reading holds. Long enough to read the quote, no longer. */
const LENS_MS = 2600;

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/** Chip labels — the full titles are far too long for a six-up row. */
const SHORT: Record<string, string> = {
  crush: "crush",
  stranger: "stranger",
  friends: "friends",
  recruiter: "recruiter",
  "green-flag": "green flag",
  "red-flag": "red flag",
};

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0, margin: "0px 0px 45% 0px", once: true });
  const reduceMotion = useReducedMotion();

  const [scanning, setScanning] = useState(true);
  const [lens, setLens] = useState(0);
  const [interacted, setInteracted] = useState(false);

  // Intro → first reading.
  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setScanning(false);
      return;
    }
    const timer = window.setTimeout(() => setScanning(false), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion]);

  // The cycle. Stops only if the reader takes over by tapping a lens.
  useEffect(() => {
    if (scanning || interacted || reduceMotion) return;
    const timer = window.setInterval(
      () => setLens((i) => (i + 1) % PERCEPTIONS.length),
      LENS_MS,
    );
    return () => window.clearInterval(timer);
  }, [scanning, interacted, reduceMotion]);

  const current = PERCEPTIONS[lens];

  return (
    <section id="how-it-works" ref={ref} className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            How it works
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            One profile. Six different readings.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            Upload one screenshot. Blink reads it the way a person would — then shows you
            what each kind of person walks away with.
          </p>
        </Reveal>

        <div className="mx-auto mt-10 w-full max-w-[26rem] sm:mt-14">
          {/* The subject. Pinned, and never replaced — that persistence is the
              entire argument the section is making. */}
          <div className="flex flex-col items-center">
            <ProfileCard scanning={scanning} reduceMotion={!!reduceMotion} />

            <motion.div
              aria-hidden
              className="mt-3 w-px bg-gradient-to-b from-blink-sky/40 to-transparent"
              initial={{ height: 0 }}
              animate={{ height: scanning ? 0 : 22 }}
              transition={{ duration: 0.3, ease }}
            />
          </div>

          {/* The reading. Everything here swaps; nothing above it does. */}
          <div className="mt-3 min-h-[12rem]">
            <AnimatePresence mode="popLayout">
              {!scanning && (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={spring}
                  className="text-center"
                >
                  <p className="flex items-center justify-center gap-2 text-[1.15rem] font-extrabold tracking-tight text-white sm:text-[1.35rem]">
                    <span aria-hidden>{current.emoji}</span>
                    {current.title}
                  </p>

                  <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                    {current.traits.map((trait, i) => (
                      <motion.span
                        key={trait}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.06 + i * 0.05 }}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-bold",
                          i === 0
                            ? "bg-blink-sky text-blink-navy"
                            : "bg-white/[0.07] text-white/70",
                        )}
                      >
                        {trait}
                      </motion.span>
                    ))}
                  </div>

                  <p className="mx-auto mt-4 max-w-sm text-[0.9rem] leading-relaxed text-white/55">
                    &ldquo;{current.quote}&rdquo;
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* The lenses, doubling as a progress indicator and a way in. */}
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {PERCEPTIONS.map((p, i) => {
              const isActive = i === lens && !scanning;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setInteracted(true);
                    setScanning(false);
                    setLens(i);
                  }}
                  aria-pressed={isActive}
                  className={cn(
                    "relative flex min-h-[36px] items-center gap-1 rounded-full px-2.5 text-[0.7rem] font-semibold transition-colors min-[380px]:px-3 min-[380px]:text-xs",
                    isActive ? "text-blink-navy" : "text-white/45 hover:text-white/80",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="hiw-lens-pill"
                      className="absolute inset-0 rounded-full bg-blink-sky"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative" aria-hidden>
                    {p.emoji}
                  </span>
                  <span className="relative">{SHORT[p.id] ?? p.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Reveal delay={0.05} className="mt-10 flex justify-center">
          <CTAButton label="See mine" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The profile being read.
 *
 * Abstracted to shapes rather than a stock screenshot: a fabricated Instagram
 * profile with an invented face would be the one dishonest thing on the page,
 * and shapes make the point just as well.
 */
function ProfileCard({
  scanning,
  reduceMotion,
}: {
  scanning: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-white/[0.05] shadow-[0_24px_54px_-28px_rgba(0,0,0,1)] ring-1 ring-white/10"
      initial={false}
      animate={{ width: scanning ? 132 : 96, height: scanning ? 176 : 128 }}
      transition={{ duration: 0.5, ease }}
    >
      <div className="flex items-center gap-1.5 p-2">
        <span className="h-5 w-5 shrink-0 rounded-full bg-[linear-gradient(140deg,hsl(var(--blink-sky)),hsl(var(--blink-sky-bright)))]" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="block h-1 w-full rounded-full bg-white/25" />
          <span className="block h-1 w-2/3 rounded-full bg-white/[0.12]" />
        </span>
      </div>
      <div className="grid grid-cols-3 gap-[2px] px-[2px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="aspect-square bg-white/[0.07]" />
        ))}
      </div>

      {/* The read itself. Runs during the intro, then retires. */}
      {scanning && !reduceMotion && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-10"
          initial={{ top: "-20%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(175,224,249,0.3), transparent)",
          }}
        />
      )}
    </motion.div>
  );
}
