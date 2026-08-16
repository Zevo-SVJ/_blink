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
import { useT } from "@/lib/i18n";
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

/** The three signals the markers become. Labels come from the dictionary. */
const SIGNAL_KEYS = ["visualIdentity", "aesthetic", "confidence"] as const;

/** Which acts each rail segment covers. The words are translated at render. */
const RAIL_ACTS: Act[][] = [["upload", "read"], ["extract"], ["perceive"]];

const SHOT_W = 148;
const SHOT_H = 196;
const THUMB_SCALE = 0.42;

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  // The ref goes on the stage below, not on the section — see `useSectionMotion`.
  const { ref, inView } = useSectionMotion();
  const reduceMotion = useReducedMotion();
  const t = useT();

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
  // Layout, tone and score stay in `blink-data`; the words come from the
  // dictionary, keyed by the same id. Adding a language cannot change how the
  // sequence is laid out.
  const copy = t.perceptions[current.id as keyof typeof t.perceptions];

  return (
    <section id="how-it-works" className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            {t.howItWorks.eyebrow}
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            {t.howItWorks.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            {t.howItWorks.subtitle}
          </p>
        </Reveal>

        <div ref={ref} className="mx-auto mt-9 w-full max-w-[24rem] sm:mt-12">
          <Rail act={act} />

          {/* The subject. Shrinks but is never replaced, so the readings are
              visibly *of it*.

              The row reserves the subject's *full* height for the whole
              sequence. The box below animates its own width and height, and it
              sits in normal flow, so when it shrank to THUMB_SCALE the section
              lost 196 × (1 − 0.42) ≈ 114px and the document with it — measured
              5390 → 5276. A reader parked below this point was clamped upward
              by the browser as the page got shorter, which is the "landing
              jumps up by itself" report.

              Fixing the height here leaves the animation untouched: the box
              still grows and shrinks exactly as before, it just no longer
              drags the page around while it does. The box is centred in the
              reserved space so the freed room reads as breathing room above
              and below rather than a hole underneath. */}
          <div
            className="mt-6 flex items-center justify-center"
            style={{ height: SHOT_H }}
          >
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
                  {SIGNAL_KEYS.map((key, i) => (
                    <motion.span
                      key={key}
                      initial={{ opacity: 0, y: -8, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ ...spring, delay: i * 0.09 }}
                      className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[0.7rem] font-semibold text-white/75 ring-1 ring-white/10"
                    >
                      {t.howItWorks.signals[key]}
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/*
            Act four: the readings.

            The box reserves the height of the *tallest* perception at the
            current width, so cycling lenses never resizes it.

            This used to be `min-h-[11.5rem]` — 184px — which is shorter than
            every real card (196px at 390px wide) and far shorter than the
            longest one when the text wraps (283px at 320px). So the container
            grew when a longer perception arrived, the section grew with it,
            the document grew, and a reader parked below was nudged. Measured
            across both languages at 320/375/390/430/768, the requirement moves
            between 196px and 283px, so no single fixed height is correct.

            Instead, all six cards occupy one grid cell: an invisible sizing
            layer establishes the height (the cell is as tall as its tallest
            child), and the animated card is laid over it in the same cell.
            The box is therefore always exactly as tall as the tallest card can
            be at this width, in this language, and never changes as the
            sequence runs. The animation itself is untouched — same component,
            same spring, same properties.
          */}
          <div className="mt-2 grid">
            <div aria-hidden className="invisible grid [grid-area:1/1]">
              {PERCEPTIONS.map((p) => {
                const sizing = t.perceptions[p.id as keyof typeof t.perceptions];
                return (
                  <PerceptionCard
                    key={p.id}
                    lensId={p.id}
                    emoji={p.emoji}
                    kicker={t.howItWorks.sample}
                    title={sizing.title}
                    traits={[...sizing.tags]}
                    summary={`“${sizing.quote}”`}
                    compact
                    // Stacked on top of each other rather than in a column, so
                    // the layer is as tall as the tallest card, not their sum.
                    className="[grid-area:1/1]"
                  />
                );
              })}
            </div>

            <div className="grid [grid-area:1/1]">
              <AnimatePresence mode="popLayout">
                {reading && (
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={spring}
                    className="[grid-area:1/1]"
                  >
                    <PerceptionCard
                      lensId={current.id}
                      emoji={current.emoji}
                      kicker={t.howItWorks.sample}
                      title={copy.title}
                      traits={[...copy.tags]}
                      summary={`“${copy.quote}”`}
                      compact
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                  aria-label={t.perceptions[p.id as keyof typeof t.perceptions].title}
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
          <CTAButton label={t.howItWorks.cta} onClick={onCTA} />
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
  const t = useT();
  const labels = [
    t.howItWorks.stepScreenshot,
    t.howItWorks.stepReads,
    t.howItWorks.stepPerceptions,
  ];
  const activeIndex = RAIL_ACTS.findIndex((acts) => acts.includes(act));

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        {RAIL_ACTS.map((_, i) => (
          <motion.span
            key={i}
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
            {labels[activeIndex]}
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
