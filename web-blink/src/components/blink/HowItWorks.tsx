/**
 * Blink — "How it works".
 *
 * A four-act sequence that has to be legible with the sound off, so to speak:
 * someone who reads none of the surrounding copy should still come away with
 * *I give it a screenshot → it reads the screenshot → it pulls signals out →
 * different people see different things.*
 *
 * ## The staging
 *
 *   1. `upload`   the screenshot arrives and settles.
 *   2. `read`     a reflection passes down it; three markers light on the
 *                 parts being read — picture, bio, grid.
 *   3. `extract`  the screenshot shrinks to a thumbnail and the markers
 *                 detach as signal chips beneath it.
 *   4. `perceive` the chips clear and the readings begin, one perception card
 *                 at a time, cycling through all six.
 *
 * Then it loops back to act one.
 *
 * ## What this replaced, and why
 *
 * A core node with six labels around it and a line to whichever was lit. It
 * looked deliberate and explained nothing: a hub-and-spoke diagram says
 * "these things are related to that thing", not "your screenshot becomes
 * these readings". There is no radial layout here at all — the composition
 * moves top-to-bottom because that is the direction the story runs.
 *
 * ## Rules
 *
 *  - **Starts on arrival.** The observer reaches nearly half a viewport below
 *    the fold and act one is 800ms, so the read is already under way by the
 *    time the section is on screen. No entrance chain.
 *  - **One subject.** The screenshot is never replaced or cross-faded — it
 *    shrinks and stays, so the perceptions are visibly *of it*.
 *  - **Nothing decorative.** No glow, no blurred plate, no floating square.
 *    Every element is the screenshot, a marker, a signal, or a reading.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { PerceptionCard } from "@/components/blink/PerceptionCard";
import { Reveal } from "@/components/blink/Reveal";
import { PERCEPTIONS } from "@/lib/blink-data";
import { useSectionMotion } from "@/lib/use-section-motion";
import { cn } from "@/lib/utils";

type Act = "upload" | "read" | "extract" | "perceive";

const ACTS: Array<{ id: Act; ms: number }> = [
  // Tuned so the first *perception* — the interesting part — is on screen at
  // ~3.2s rather than 4.2s. The rail moves from the first beat, so the reader
  // can see the sequence is running long before the payoff arrives.
  { id: "upload", ms: 600 },
  { id: "read", ms: 1500 },
  { id: "extract", ms: 1100 },
  // `perceive` runs until every perception has been shown, then wraps.
  { id: "perceive", ms: 0 },
];

/** How long each reading holds before the next. */
const LENS_MS = 2100;

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/** What the read marks, as fractions of the screenshot. */
const MARKERS = [
  { id: "photo", label: "Photo", left: 0.06, top: 0.04, w: 0.32, h: 0.24 },
  { id: "bio", label: "Bio", left: 0.42, top: 0.06, w: 0.52, h: 0.16 },
  { id: "grid", label: "Grid", left: 0.03, top: 0.32, w: 0.94, h: 0.62 },
];

/** The three signals the markers become. */
const SIGNALS = ["Visual identity", "Aesthetic", "Confidence"];

/** The named steps, shown as a rail so the story has a spine. */
const RAIL: Array<{ act: Act[]; label: string }> = [
  { act: ["upload", "read"], label: "Your screenshot" },
  { act: ["extract"], label: "Blink reads it" },
  { act: ["perceive"], label: "Six perceptions" },
];

const SHOT_W = 148;
const SHOT_H = 196;
const THUMB_SCALE = 0.42;

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  // The ref goes on the stage below, not on the section — see `useSectionMotion`.
  const { ref, inView } = useSectionMotion();
  const reduceMotion = useReducedMotion();

  const [act, setAct] = useState<Act>("upload");
  const [lens, setLens] = useState(0);
  /** Set once the reader takes over by tapping a perception. */
  const [held, setHeld] = useState(false);

  const advance = useCallback(() => {
    setAct((current) => {
      const i = ACTS.findIndex((a) => a.id === current);
      return ACTS[(i + 1) % ACTS.length].id;
    });
  }, []);

  // Leaving the viewport rewinds to act one, so a reader who comes back sees
  // the story from the start rather than joining it mid-sentence.
  useEffect(() => {
    if (inView || held) return;
    setAct("upload");
    setLens(0);
  }, [inView, held]);

  // Acts one to three are timed. `perceive` ends when the readings run out.
  useEffect(() => {
    if (!inView || reduceMotion || held) return;
    if (act === "perceive") return;
    const timer = window.setTimeout(advance, ACTS.find((a) => a.id === act)!.ms);
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, held, act, advance]);

  // The readings. After the last one the sequence restarts from the top, so
  // a reader who arrives late still sees the whole story.
  useEffect(() => {
    if (!inView || reduceMotion || held || act !== "perceive") return;
    const timer = window.setTimeout(() => {
      setLens((i) => {
        if (i + 1 >= PERCEPTIONS.length) {
          setAct("upload");
          return 0;
        }
        return i + 1;
      });
    }, LENS_MS);
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, held, act, lens]);

  // Reduced motion gets the end state: the point, without the journey.
  useEffect(() => {
    if (reduceMotion) setAct("perceive");
  }, [reduceMotion]);

  const reading = act === "perceive";
  const shrunk = act === "extract" || reading;
  const current = PERCEPTIONS[lens];

  return (
    <section id="how-it-works" className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            How it works
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            One screenshot becomes a perception.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            Blink reads your profile the way a person would, then shows you what each kind
            of person walks away with.
          </p>
        </Reveal>

        <div ref={ref} className="mx-auto mt-9 w-full max-w-[24rem] sm:mt-12">
          <Rail act={act} />

          {/* The subject. Shrinks but is never replaced, so the readings are
              visibly *of it*. */}
          <div className="mt-6 flex justify-center">
            <motion.div
              className="relative"
              initial={false}
              animate={{
                width: shrunk ? SHOT_W * THUMB_SCALE : SHOT_W,
                height: shrunk ? SHOT_H * THUMB_SCALE : SHOT_H,
              }}
              transition={{ duration: 0.55, ease }}
            >
              <motion.div
                className="absolute left-1/2 top-0 origin-top overflow-hidden rounded-2xl bg-white/[0.05] ring-1 ring-white/10"
                style={{ width: SHOT_W, height: SHOT_H, x: "-50%" }}
                initial={false}
                animate={{
                  scale: shrunk ? THUMB_SCALE : 1,
                  opacity: act === "upload" ? 0.85 : 1,
                }}
                transition={{ duration: 0.55, ease }}
              >
                <ProfileShot />

                {/* The read: one pass, then the markers hold. */}
                {act === "read" && !reduceMotion && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 h-12"
                    initial={{ top: "-25%" }}
                    animate={{ top: "110%" }}
                    transition={{ duration: 0.9, ease: "easeInOut", repeat: 1 }}
                    style={{
                      background:
                        "linear-gradient(to bottom, transparent, rgba(175,224,249,0.3), transparent)",
                    }}
                  />
                )}

                {MARKERS.map((m, i) => (
                  <motion.span
                    key={m.id}
                    aria-hidden
                    className="absolute rounded-[7px] ring-[1.5px] ring-blink-sky/70"
                    style={{
                      left: `${m.left * 100}%`,
                      top: `${m.top * 100}%`,
                      width: `${m.w * 100}%`,
                      height: `${m.h * 100}%`,
                    }}
                    initial={false}
                    animate={{ opacity: act === "read" ? 1 : 0, scale: act === "read" ? 1 : 1.15 }}
                    transition={{ ...spring, delay: act === "read" ? 0.35 + i * 0.18 : 0 }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Act three: what the read pulled out. */}
          <div className="mt-4 h-8">
            <AnimatePresence>
              {act === "extract" && (
                <motion.div
                  className="flex flex-wrap justify-center gap-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {SIGNALS.map((signal, i) => (
                    <motion.span
                      key={signal}
                      initial={{ opacity: 0, y: -8, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ ...spring, delay: i * 0.09 }}
                      className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[0.7rem] font-semibold text-white/75 ring-1 ring-white/10"
                    >
                      {signal}
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Act four: the readings. */}
          <div className="mt-2 min-h-[11.5rem]">
            <AnimatePresence mode="popLayout">
              {reading && (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={spring}
                >
                  <PerceptionCard
                    lensId={current.id}
                    emoji={current.emoji}
                    title={current.title}
                    traits={current.traits}
                    summary={`“${current.quote}”`}
                    compact
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Jump straight to a lens. Also the progress indicator. */}
          {/* 10px gap, not 8: the pills are 36px with a 44px hit area, so the
              pitch has to clear 44 or neighbouring targets overlap. */}
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {PERCEPTIONS.map((p, i) => {
              const isActive = reading && i === lens;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={p.title}
                  onClick={() => {
                    setHeld(true);
                    setAct("perceive");
                    setLens(i);
                  }}
                  className={cn(
                    // 36px pill, 44px hit area. The dot is deliberately small —
                    // it is a progress indicator as much as a control — but a
                    // 36px target is under the thumb-size minimum, so the tap
                    // area is grown with a pseudo-element instead of the box.
                    "relative flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors",
                    "before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
                    isActive
                      ? "bg-blink-sky/20 ring-1 ring-blink-sky/50"
                      : "bg-white/[0.04] ring-1 ring-white/[0.07] hover:bg-white/[0.08]",
                  )}
                >
                  <span aria-hidden className={cn(!isActive && "opacity-55")}>
                    {p.emoji}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Reveal delay={0.05} className="mt-9 flex justify-center">
          <CTAButton label="See mine" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The sequence's spine.
 *
 * Three segments plus the name of the step you are on — not three names in a
 * row. Spelled out, "Your screenshot — Blink reads it — Six perceptions" is
 * 43 characters of letter-spaced caps, which overflowed a 320px screen and got
 * clipped at both ends. Segments carry the progress, one label carries the
 * meaning, and it fits.
 */
function Rail({ act }: { act: Act }) {
  const activeIndex = RAIL.findIndex((step) => step.act.includes(act));

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        {RAIL.map((step, i) => (
          <motion.span
            key={step.label}
            className="h-[3px] rounded-full"
            animate={{
              width: i === activeIndex ? 26 : 14,
              backgroundColor:
                i === activeIndex
                  ? "hsl(var(--blink-sky))"
                  : i < activeIndex
                    ? "hsl(var(--blink-sky) / 0.35)"
                    : "rgba(255,255,255,0.12)",
            }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        ))}
      </div>

      <div className="h-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={activeIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="whitespace-nowrap text-[0.62rem] font-bold uppercase tracking-[0.16em] text-blink-sky"
          >
            {RAIL[activeIndex]?.label}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * The profile being read.
 *
 * Abstracted to shapes rather than a stock capture: a fabricated Instagram
 * profile with an invented face would be the one dishonest thing on the page,
 * and shapes make the point just as well.
 */
function ProfileShot() {
  return (
    <>
      <div className="flex items-center gap-2 p-2.5">
        <span className="h-8 w-8 shrink-0 rounded-full bg-[linear-gradient(140deg,hsl(var(--blink-sky)),hsl(var(--blink-sky-bright)))]" />
        <span className="flex flex-1 flex-col gap-1.5">
          <span className="block h-1.5 w-full rounded-full bg-white/25" />
          <span className="block h-1.5 w-2/3 rounded-full bg-white/[0.12]" />
        </span>
      </div>
      <div className="grid grid-cols-3 gap-[3px] px-[3px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="aspect-square bg-white/[0.07]" />
        ))}
      </div>
    </>
  );
}
