/**
 * Blink — "How it works".
 *
 * ## What this is, and what it deliberately is not
 *
 * Four steps, one subject. The capture that arrives in step one is the same
 * DOM element in step four: it moves, resizes and re-corners, but it is never
 * unmounted and never replaced. That is the whole argument of the section —
 * *your screenshot is what becomes the score* — and it is made by the layout
 * animation rather than by the copy.
 *
 * It is not four cards in a row. Four cards side by side describe a process;
 * they do not perform one, and a reader can tell the difference immediately.
 *
 * ## What it replaced
 *
 * An auto-playing loop that cycled six perception cards. That was a fine idea
 * before the interactive demo existed — and redundant the moment it did. The
 * demo above already shows *what you get* (the gaze, the niche, the score out
 * of ten) with the reader's hand on it. Showing it again, on a timer, in a
 * smaller box, was the same content twice with the second telling worse.
 *
 * So this section answers the other question, the practical one: *what do I
 * actually do?* Screenshot, upload, read, score. Nothing about the output.
 *
 * ## The staging
 *
 *   1. `capture`  the shot sits alone and slightly turned, the way a picture
 *                 you have just taken sits — plus a capture bracket.
 *   2. `upload`   it squares up and a frame closes around it. It has arrived.
 *   3. `read`     it moves aside and shrinks; the three regions light on it in
 *                 turn and detach as signal chips.
 *   4. `score`    the chips give way to the verdict: a number out of ten and
 *                 the niche it was measured against.
 *
 * ## Rules
 *
 *  - **The stage never changes height.** A section that resizes mid-scroll
 *    drags the whole document under the reader's thumb; that was a real bug
 *    here once and it is not coming back. The stage is a fixed height at each
 *    breakpoint and everything inside is positioned within it.
 *  - **The reader can take over.** Tapping a step pins it. The sequence is a
 *    demonstration, not a video, so it has to answer to a finger.
 *  - **Nothing decorative.** Every element on the stage is the capture, a
 *    region, a signal, or the verdict.
 */

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { SharedScope } from "@/design/Motion";
import { SPRING, still } from "@/design/motion";
import { useT } from "@/lib/i18n";
import { useSectionMotion } from "@/lib/use-section-motion";
import { cn } from "@/lib/utils";

type Step = "capture" | "upload" | "read" | "score";

const STEPS: Step[] = ["capture", "upload", "read", "score"];

/** How long each step holds before the next, when nobody has taken over. */
const HOLD: Record<Step, number> = {
  capture: 1900,
  upload: 1700,
  read: 3200,
  score: 3600,
};

/**
 * The regions the read marks, as fractions of the capture.
 *
 * Same three the product actually reads, in the order it reads them, so the
 * demonstration and the thing being demonstrated cannot drift apart.
 */
const REGIONS = [
  { id: "photo", key: "photo", signal: "visualIdentity", left: 0.06, top: 0.05, w: 0.3, h: 0.22 },
  { id: "bio", key: "bio", signal: "aesthetic", left: 0.4, top: 0.07, w: 0.54, h: 0.15 },
  { id: "grid", key: "grid", signal: "confidence", left: 0.04, top: 0.33, w: 0.92, h: 0.61 },
] as const;

/** The example verdict. Labelled as an example wherever it appears. */
const EXAMPLE_SCORE = 8.7;

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  const { ref, inView } = useSectionMotion();
  const reduceMotion = useReducedMotion();
  const t = useT();

  const [step, setStep] = useState<Step>("capture");
  /** Set once the reader picks a step themselves. The timer stops for good. */
  const [held, setHeld] = useState(false);

  const index = STEPS.indexOf(step);
  const spring = reduceMotion ? still : SPRING.morph;

  const advance = useCallback(() => {
    setStep((s) => STEPS[(STEPS.indexOf(s) + 1) % STEPS.length]);
  }, []);

  /* Leaving rewinds, so a reader coming back sees the sequence from step one
     rather than joining it in the middle. */
  useEffect(() => {
    if (inView || held) return;
    setStep("capture");
  }, [inView, held]);

  useEffect(() => {
    if (!inView || held || reduceMotion) return;
    const timer = window.setTimeout(advance, HOLD[step]);
    return () => window.clearTimeout(timer);
  }, [inView, held, reduceMotion, step, advance]);

  /* Reduced motion gets the end of the story rather than a slideshow of it. */
  useEffect(() => {
    if (reduceMotion) setStep("score");
  }, [reduceMotion]);

  const copy = t.howItWorks.steps[step];

  return (
    <section id="how-it-works" className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="t-label text-blink-sky/70">{t.howItWorks.eyebrow}</p>
          <h2 className="t-title mt-3 text-balance text-white">{t.howItWorks.heading}</h2>
          <p className="t-body mx-auto mt-3 max-w-md text-balance text-white/50 sm:mt-4">
            {t.howItWorks.subtitle}
          </p>
        </Reveal>

        <div ref={ref} className="mx-auto mt-9 w-full max-w-xl sm:mt-12">
          <StepPicker
            step={step}
            onPick={(s) => {
              setHeld(true);
              setStep(s);
            }}
          />

          {/*
            The stage.

            Fixed height, deliberately. Everything inside is absolutely
            positioned or laid out against it, so no step can make the section
            taller than another and shove the page around as it plays.
          */}
          <SharedScope id="hiw">
            <div className="relative mt-6 h-[15rem] sm:h-[15.5rem]">
              <Capture step={step} spring={spring} reduceMotion={!!reduceMotion} />
              <Signals step={step} spring={spring} />
              <Verdict step={step} spring={spring} reduceMotion={!!reduceMotion} />
            </div>
          </SharedScope>

          {/*
            What the step means, in words.

            Below the stage rather than beside it: at 360px there is no beside,
            and a caption that moves to a different place on desktop is two
            layouts to keep honest instead of one. Fixed height for the same
            reason the stage is.
          */}
          <div className="relative mt-5 h-[6.5rem] sm:h-[5.5rem]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={step}
                className="absolute inset-x-0 top-0 text-center"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={reduceMotion ? still : SPRING.base}
              >
                <p className="t-heading text-balance text-white">{copy.title}</p>
                <p className="t-body mx-auto mt-2 max-w-sm text-balance text-white/50">
                  {copy.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Live progress for anyone not watching the picker move. */}
          <p className="sr-only" aria-live="polite">
            {t.howItWorks.progress} {index + 1} / {STEPS.length} — {copy.title}
          </p>
        </div>

        <Reveal delay={0.05} className="mt-9 flex justify-center">
          <CTAButton label={t.howItWorks.cta} onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   The picker
   ───────────────────────────────────────────────────────────────────── */

/**
 * The four steps, as a segmented control.
 *
 * A real control, not a progress bar with buttons drawn on it: it is a
 * `tablist`, the selection travels rather than cross-fading, and every segment
 * is reachable by keyboard. The selected pill is one shared element sliding
 * between four positions, which is what makes it read as *the same selection
 * moving* instead of four independent highlights.
 */
function StepPicker({ step, onPick }: { step: Step; onPick: (s: Step) => void }) {
  const t = useT();
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={t.howItWorks.eyebrow}
      className="glass-inset mx-auto flex w-full max-w-md gap-1 rounded-[var(--r-pill)] p-1"
    >
      {STEPS.map((s) => {
        const selected = s === step;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onPick(s)}
            className="focus-ring relative min-h-[44px] flex-1 rounded-[var(--r-pill)] px-1"
          >
            {selected && (
              <motion.span
                aria-hidden
                layoutId="hiw-step"
                transition={reduceMotion ? still : SPRING.snap}
                className="absolute inset-0 rounded-[var(--r-pill)] bg-blink-sky/[0.16] ring-1 ring-blink-sky/40"
              />
            )}
            <span
              className={cn(
                "t-label relative block truncate transition-colors",
                selected ? "text-blink-sky" : "text-white/45",
              )}
            >
              {t.howItWorks.steps[s].label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   The subject
   ───────────────────────────────────────────────────────────────────── */

/**
 * The capture, in whichever state the step puts it in.
 *
 * One element across all four steps. It changes size, position, rotation and
 * corner radius; it is never remounted, so React and the browser both animate
 * it rather than swapping one picture for another. Everything else on the
 * stage is arranged around wherever it currently is.
 */
function Capture({
  step,
  spring,
  reduceMotion,
}: {
  step: Step;
  spring: Transition;
  reduceMotion: boolean;
}) {
  const t = useT();
  const shrunk = step === "read" || step === "score";

  return (
    <motion.div
      data-hiw="capture"
      className="absolute top-0"
      initial={false}
      animate={{
        /* Centred while it is the whole subject; over to the left once the
           readings need the room. Percentages, so it lands in the same place
           on a phone and a desktop. */
        left: shrunk ? "6%" : "50%",
        x: shrunk ? "0%" : "-50%",
        y: shrunk ? 34 : 0,
        rotate: step === "capture" && !reduceMotion ? -3.2 : 0,
        scale: shrunk ? 0.62 : 1,
      }}
      style={{ originX: 0, originY: 0 }}
      transition={spring}
    >
      <motion.div
        className="relative overflow-hidden"
        initial={false}
        animate={{
          borderRadius: step === "capture" ? 12 : 20,
          boxShadow:
            step === "capture"
              ? "0 18px 40px -18px hsl(220 84% 3% / 0.9)"
              : "0 26px 60px -22px hsl(220 84% 3% / 0.95)",
        }}
        transition={spring}
        style={{
          width: 168,
          height: 224,
          background: "hsl(var(--surface-2))",
          border: "1px solid hsl(0 0% 100% / var(--line-2))",
        }}
      >
        <ProfileShot />

        {/*
          The read passing down the capture.

          One pass, not a loop: a scanner bar that never stops is a decoration,
          and this is meant to be an event that happens once and finishes.
        */}
        {step === "read" && !reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-16"
            initial={{ top: "-30%" }}
            animate={{ top: "115%" }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(to bottom, transparent, hsl(var(--blink-sky) / 0.28), transparent)",
            }}
          />
        )}

        {/* The regions, lighting in the order they are read. */}
        {REGIONS.map((r, i) => (
          <motion.span
            key={r.id}
            aria-hidden
            className="absolute rounded-[6px] ring-[1.5px] ring-blink-sky/70"
            style={{
              left: `${r.left * 100}%`,
              top: `${r.top * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
            }}
            initial={false}
            animate={{
              opacity: step === "read" ? 1 : 0,
              scale: step === "read" ? 1 : 1.12,
            }}
            transition={{ ...SPRING.snap, delay: step === "read" ? 0.3 + i * 0.24 : 0 }}
          />
        ))}
      </motion.div>

      {/*
        The capture bracket.

        Only in step one, and only as corners: a full frame would read as part
        of the picture rather than as the act of taking it.
      */}
      <AnimatePresence>
        {step === "capture" && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-3"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={reduceMotion ? still : SPRING.snap}
          >
            {[
              "left-0 top-0 border-l-2 border-t-2 rounded-tl-md",
              "right-0 top-0 border-r-2 border-t-2 rounded-tr-md",
              "left-0 bottom-0 border-b-2 border-l-2 rounded-bl-md",
              "right-0 bottom-0 border-b-2 border-r-2 rounded-br-md",
            ].map((corner) => (
              <span
                key={corner}
                className={cn("absolute h-5 w-5 border-blink-sky/70", corner)}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Step two: it has arrived somewhere. */}
      <AnimatePresence>
        {step === "upload" && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-2 rounded-[26px] ring-1 ring-blink-sky/35"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? still : SPRING.drop}
          />
        )}
      </AnimatePresence>

      <span className="sr-only">{t.howItWorks.sample}</span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   What came off it
   ───────────────────────────────────────────────────────────────────── */

/**
 * The three signals, arriving beside the shrunken capture.
 *
 * Each carries the name of the region it came from as well as the signal it
 * became, because "Visual identity" on its own is a claim and "Photo → Visual
 * identity" is a derivation.
 */
function Signals({ step, spring }: { step: Step; spring: Transition }) {
  const t = useT();
  const shown = step === "read";

  return (
    <div className="pointer-events-none absolute right-[4%] top-[3.5rem] w-[52%] max-w-[15rem] space-y-2 sm:top-16">
      {REGIONS.map((r, i) => (
        <motion.div
          key={r.id}
          /* Stacked rather than "Photo → Visual identity" on one line: at
             360px that row put the signal — the half that matters — behind
             an ellipsis, and shortening the signal to fit would have made
             the demonstration disagree with the product. */
          className="surface px-3 py-2"
          initial={false}
          animate={{
            opacity: shown ? 1 : 0,
            x: shown ? 0 : 18,
          }}
          transition={{ ...spring, delay: shown ? 0.34 + i * 0.24 : 0 }}
        >
          <span className="t-micro block text-white/35">
            {t.howItWorks.regions[r.key]}
          </span>
          <span className="t-caption block font-semibold leading-tight text-white/85">
            {t.howItWorks.signals[r.signal]}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * The verdict.
 *
 * Sits where the signals were, so the chips visibly give way to it rather than
 * the score appearing in a fifth place nobody was looking at. The number
 * counts up on arrival — a score is a conclusion, and a conclusion that is
 * simply *there* has not been reached.
 */
function Verdict({
  step,
  spring,
  reduceMotion,
}: {
  step: Step;
  spring: Transition;
  reduceMotion: boolean;
}) {
  const t = useT();
  const shown = step === "score";
  const [value, setValue] = useState(0);

  /*
    Counted in JS rather than with a motion value: the display needs one
    decimal and the last tenth has to land exactly on the target, and a spring
    that settles asymptotically renders 8.6999 for a frame. Steps, at the
    resolution the number is actually shown in.
  */
  useEffect(() => {
    if (!shown) {
      setValue(0);
      return;
    }
    if (reduceMotion) {
      setValue(EXAMPLE_SCORE);
      return;
    }
    const marks = [7.4, 8, 8.2, 8.5, 8.6, EXAMPLE_SCORE];
    let i = 0;
    setValue(marks[0]);
    const timer = window.setInterval(() => {
      i += 1;
      setValue(marks[i]);
      if (i >= marks.length - 1) window.clearInterval(timer);
    }, 190);
    return () => window.clearInterval(timer);
  }, [shown, reduceMotion]);

  return (
    <motion.div
      className="pointer-events-none absolute right-[4%] top-[3.5rem] w-[52%] max-w-[15rem] sm:top-16"
      initial={false}
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 14 }}
      transition={spring}
      aria-hidden={!shown}
    >
      <div className="surface-raised px-4 py-4">
        <p className="t-micro text-white/35">{t.howItWorks.sample}</p>
        <p className="mt-2 flex items-baseline gap-1">
          <span className="t-numeric text-[2.6rem] font-extrabold leading-none text-white">
            {value.toFixed(1)}
          </span>
          <span className="t-caption font-bold text-white/40">{t.howItWorks.outOfTen}</span>
        </p>
        <p className="t-micro mt-3 text-white/35">{t.howItWorks.measuredAgainst}</p>
        <p className="t-caption font-semibold text-blink-sky">{t.howItWorks.exampleNiche}</p>
      </div>
    </motion.div>
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
      <div className="flex items-center gap-2 p-3">
        <span className="h-9 w-9 shrink-0 rounded-full bg-[linear-gradient(140deg,hsl(var(--blink-sky)),hsl(var(--blink-sky-bright)))]" />
        <span className="flex flex-1 flex-col gap-1.5">
          <span className="block h-1.5 w-full rounded-full bg-white/25" />
          <span className="block h-1.5 w-2/3 rounded-full bg-white/[0.12]" />
        </span>
      </div>
      <div className="grid grid-cols-3 gap-[3px] px-[3px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className="aspect-square"
            /* Not all one shade: nine identical squares read as a placeholder,
               and the grid is the thing the read spends longest on.

               Lifted from 13–19% lightness, where the tiles were very nearly
               black against the card and the "grid" the copy talks about was
               not visibly there. */
            style={{ background: `hsl(212 ${18 + (i % 4) * 7}% ${21 + ((i * 5) % 7) * 1.6}%)` }}
          />
        ))}
      </div>
    </>
  );
}
