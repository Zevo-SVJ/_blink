import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { BRAND } from "@/lib/brand";

/**
 * Blink — hero.
 *
 * The job of the first screen is to make one sentence obvious: *you give it a
 * screenshot, it tells you how people read you.* The previous version put a
 * score card here, which showed an output with no visible input — a newcomer
 * had no idea what "8.7 / Deliberate and low-key" referred to, so it read as
 * random data rather than a demonstration.
 *
 * The preview below the CTA is now the mechanism, not a result: a profile
 * screenshot, an arrow, and a perception that keeps changing. Input, transform,
 * output. It reads in about a second and needs no caption, and it contains no
 * numbers a stranger can't place.
 *
 * Nothing waits on scroll and nothing waits on a chain: one container, a 40ms
 * stagger, 300ms tweens. Text is in the DOM from first paint, so motion never
 * gates content.
 */

const TRUST = ["Free to try", "No Instagram login", "Screenshot never stored"];

/**
 * Lenses cycled in the preview — the same profile, read differently.
 *
 * Each entry carries its whole phrase rather than just a subject, because the
 * verb has to agree: "your friends see you", not "your friends sees you".
 */
const LENSES = [
  { emoji: "❤️", phrase: "your crush sees you" },
  { emoji: "👀", phrase: "a stranger sees you" },
  { emoji: "🤝", phrase: "your friends see you" },
  { emoji: "💼", phrase: "a recruiter sees you" },
];

export function Hero({ onCTA }: { onCTA: () => void }) {
  const reduceMotion = useReducedMotion();

  // The entrance is CSS, not JS — see `.blink-rise` in index.css. The landing
  // is prerendered, and Framer's `initial` state is what renderToString emits,
  // so a JS-driven fade shipped an invisible hero to every cold visitor until
  // hydration. CSS animates straight off the prerendered markup.

  return (
    <section
      className="relative flex flex-col items-center justify-center px-4 pb-14 pt-24 sm:px-6 sm:pb-20 sm:pt-28"
      style={{ minHeight: "90svh" }}
    >
      <div className="relative z-10 mx-auto w-full max-w-xl text-center">
        <h1
          className="blink-rise blink-rise-1 text-[2rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-white min-[400px]:text-[2.25rem] sm:text-5xl lg:text-[3.5rem]"
        >
          See yourself the way
          <br />
          <AccentPhrase />
        </h1>

        <p
          className="blink-rise blink-rise-2 mx-auto mt-4 max-w-sm text-balance text-[0.95rem] leading-relaxed text-white/55 sm:mt-5 sm:max-w-md sm:text-lg"
        >
          {BRAND.name} analyzes your Instagram presence and reveals the first impression you
          make.
        </p>

        <div className="blink-rise blink-rise-3 mt-7 flex justify-center">
          <CTAButton label={BRAND.cta} onClick={onCTA} href="/analyze" size="lg" />
        </div>

        <ul
          className="blink-rise blink-rise-4 mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-1.5 text-[0.68rem] font-medium text-white/35 min-[400px]:text-xs"
        >
          {TRUST.map((label) => (
            <li
              key={label}
              className="rounded-full bg-white/[0.045] px-2.5 py-1 ring-1 ring-white/[0.06]"
            >
              {label}
            </li>
          ))}
        </ul>

        <div className="blink-rise blink-rise-5 mt-9 flex justify-center sm:mt-11">
          <MechanismPreview />
        </div>
      </div>

    </section>
  );
}

/**
 * "others see you." — the accent phrase.
 *
 * A slow sheen crosses the gradient text every few seconds. It is the only
 * continuous motion on the screen, kept low-contrast so it registers as a
 * material quality rather than an animation asking for attention.
 */
function AccentPhrase() {
  const reduceMotion = useReducedMotion();

  return (
    <span className="relative inline-block pb-1.5 sm:pb-2.5">
      <span className="relative">
        <span className="bg-gradient-to-r from-blink-sky via-white to-blink-sky bg-clip-text text-transparent">
          others see you.
        </span>
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.2, times: [0, 0.15, 0.85, 1] }}
          >
            <motion.span
              className="absolute inset-y-0 w-1/3"
              initial={{ left: "-40%" }}
              animate={{ left: "120%" }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.2, ease: "easeInOut" }}
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
              }}
            />
          </motion.span>
        )}
      </span>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-blink-sky/70 sm:h-1"
      />
    </span>
  );
}

/**
 * Input → transform → output, at a glance.
 *
 * A miniature profile screenshot, an arrow, and a perception that keeps
 * changing. Deliberately no score: the point here is what Blink *does*, and a
 * number without context was the thing that confused people.
 */
function MechanismPreview() {
  const reduceMotion = useReducedMotion();
  const [lens, setLens] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setLens((i) => (i + 1) % LENSES.length), 2400);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const current = LENSES[lens];

  return (
    <div className="flex w-full max-w-[21rem] items-center gap-3 sm:max-w-[23rem] sm:gap-4">
      <ScreenshotMock />

      <ArrowRight className="h-4 w-4 shrink-0 text-white/25" aria-hidden />

      <div className="min-w-0 flex-1 text-left">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white/30">
          Reads as
        </p>
        <div className="mt-1 h-[2.75rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={current.phrase}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="text-[0.92rem] font-bold leading-snug text-white sm:text-base"
            >
              <span className="mr-1.5">{current.emoji}</span>
              How {current.phrase}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/** A recognisably-Instagram profile, abstracted to shapes. */
function ScreenshotMock() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-[92px] w-[70px] shrink-0 overflow-hidden rounded-xl bg-white/[0.06] shadow-[0_12px_34px_-14px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.09]">
      <div className="flex items-center gap-1.5 p-2">
        <span className="h-4 w-4 shrink-0 rounded-full bg-[linear-gradient(140deg,hsl(var(--blink-sky)),hsl(var(--blink-sky-bright)))]" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="block h-1 w-full rounded-full bg-white/25" />
          <span className="block h-1 w-2/3 rounded-full bg-white/12" />
        </span>
      </div>
      <div className="grid grid-cols-3 gap-[2px] px-[2px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="aspect-square bg-white/[0.09]" />
        ))}
      </div>

      {/* A scan pass, so the still reads as "being looked at". */}
      {!reduceMotion && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-6"
          initial={{ top: "-25%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.1, ease: "easeInOut" }}
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(175,224,249,0.28), transparent)",
          }}
        />
      )}
    </div>
  );
}
