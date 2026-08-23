/**
 * What Blink does, as something you scroll through rather than watch.
 *
 * This replaces the twenty-five second film. A video is the same for everyone
 * and asks to be sat through; this is the product's own interface performing
 * its own argument, at the reader's pace, with the one interaction that
 * actually matters left in their hands.
 *
 * ## The spine
 *
 *   PROFILE → ANALYSIS → WHO'S LOOKING? → PERCEPTION → NICHE → SCORE
 *
 * The profile is placed once and never moves again. Everything after it
 * happens *to* it: the reticle reads regions of it, the readings arrange
 * themselves around it, the niche and the score resolve beneath it. That is
 * the whole reason it is one pinned stage and not six sections — the claim
 * being made is "the profile did not change, the reading of it did", and a
 * sequence of separate screens cannot make that claim.
 *
 * ## Scroll drives progress; the reader drives the gaze
 *
 * Scroll advances the sequence. Once the selector has arrived the reader can
 * change who is looking, and the readings re-rank around the unchanged
 * profile. Both at once matters: scroll alone is a video with extra steps, and
 * interaction alone buries the story behind a control nobody presses.
 */

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SPRING } from "@/design/motion";
import { press } from "@/design/Motion";
import { categoryLabel } from "@/lib/categories";
import { useT } from "@/lib/i18n";
import { gazes, GAZE_READS, NICHE_ID, passes, SCORE, type Gaze } from "./demo";
import { ProfileCard, type Regions } from "./ProfileCard";

/**
 * Where each act begins and ends, as a fraction of the scroll through the
 * section. Written down rather than scattered so the sequence can be read in
 * one place and retimed without hunting.
 */
const ACT = {
  settle: [0.0, 0.08],
  analysis: [0.08, 0.34],
  gaze: [0.32, 0.46],
  perception: [0.44, 0.68],
  niche: [0.66, 0.82],
  score: [0.8, 1.0],
} as const;

/** 0 → 1 across an act, clamped either side. */
const across = (p: number, [a, b]: readonly [number, number]) =>
  Math.max(0, Math.min(1, (p - a) / (b - a)));

export function BlinkExperience() {
  const t = useT();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });

  /* React state only for the things that change what is *rendered*. The
     continuous values stay as motion values, so scrolling does not re-render
     the tree sixty times a second. */
  const [act, setAct] = useState(0);
  const [pass, setPass] = useState(-1);
  /**
   * How many readings have arrived.
   *
   * The perception act used to fade all four in at once and then hold for the
   * rest of its travel — a quarter of the section during which the picture did
   * not change at all. A filmstrip of the landing caught two consecutive
   * frames here that were pixel-identical, which is what a reader experiences
   * as the page having stopped responding to them.
   *
   * Arriving one at a time also happens to be the honest depiction: the
   * readings are ranked, and watching them land in order is watching the rank
   * being decided.
   */
  const [revealed, setRevealed] = useState(0);
  /* Rebuilt when the language changes, so switching it re-labels the selector
     and the readings rather than leaving the previous language on screen. */
  const GAZES = useMemo(() => gazes(t), [t]);
  const PASSES = useMemo(() => passes(t), [t]);
  const [gazeId, setGazeId] = useState<Gaze["id"]>("crush");
  const gaze = GAZES.find((g) => g.id === gazeId) ?? GAZES[0];
  const setGaze = (next: Gaze) => setGazeId(next.id);
  const [regions, setRegions] = useState<Regions>({});

  useEffect(() => {
    const stop = scrollYProgress.on("change", (p) => {
      setAct(
        p >= ACT.score[0] ? 5
        : p >= ACT.niche[0] ? 4
        : p >= ACT.perception[0] ? 3
        : p >= ACT.gaze[0] ? 2
        : p >= ACT.analysis[0] ? 1
        : 0,
      );
      // Which region the reticle is reading, or -1 before/after the pass.
      const a = across(p, ACT.analysis);
      setPass(a <= 0 || a >= 1 ? -1 : Math.min(PASSES.length - 1, Math.floor(a * PASSES.length)));

      /* The readings land across the perception act rather than together.
         `+ 0.35` so the first one is already on its way as the act opens —
         otherwise the act starts with an empty column. */
      const r = across(p, ACT.perception);
      setRevealed(Math.round(Math.min(1, r * 1.15 + 0.35) * GAZE_READS));
    });
    return stop;
  }, [scrollYProgress]);

  /* The profile itself only ever settles — one small move, at the start, so
     it arrives rather than being there. After that it is fixed, on purpose. */
  const cardY = useTransform(scrollYProgress, [0, ACT.settle[1]], [26, 0]);
  const cardScale = useTransform(scrollYProgress, [0, ACT.settle[1]], [0.965, 1]);

  /*
    The score counts with the scroll rather than on a timer.

    On a timer it finished in nine hundred milliseconds and then held for the
    remaining fifth of the section — four hundred pixels of scrolling during
    which the only thing on screen was a number that had already stopped. It is
    also the wrong relationship: this is the conclusion of a sequence the
    reader is driving, so the reader should be the one arriving at it.

    A motion value rather than state, so counting does not re-render the tree
    sixty times a second.
  */
  const scoreProgress = useTransform(scrollYProgress, [ACT.score[0], 1], [0, 1], {
    clamp: true,
  });

  const analysing = act === 1;
  const target = pass >= 0 ? regions[PASSES[pass].at] : undefined;

  return (
    <section
      ref={section}
      id="experience"
      aria-label={t.film.heading}
      /*
        Retimed after measuring what a reader actually sees.

        A filmstrip down the landing — one frame every 2% of the document,
        measuring how many pixels changed since the frame before — found three
        consecutive frames inside this section at *zero* change. That is around
        two thousand pixels of scrolling during which nothing whatsoever
        happens, followed by everything happening at once. A reader cannot tell
        that apart from the page having jumped, and reported it as exactly
        that.

        The cause was arithmetic, not a bug: 420svh is 3.2 viewports of travel
        for six acts, so the quiet ones — the readings arriving, the niche
        resolving — were each given the better part of a screen of scroll to
        move a few words. At 260svh every act gets roughly a third of a phone
        screen, which is enough to read and short enough that the picture is
        always moving. The last act also now runs to 1.0: it used to stop at
        0.96, leaving a dead strip at the very end.
      */
      className="relative h-[260svh]"
    >
      <div
        ref={stage}
        className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden px-4"
      >
        {/*
          Narrow on purpose.

          At `max-w-5xl` the two columns were a metre apart on a laptop: a
          300px card marooned on the left, four short words lost in a
          thousand-pixel column on the right, and the pair sitting in the top
          two thirds of the screen. Wide is not the same as spacious. Held to
          the width the content actually needs, the profile and its reading sit
          close enough to be read as one thing — which is the point, because
          the reading is *of* the profile.
        */}
        {/*
          Fitted to the height it has, not to the height it wants.

          The composition is one pinned stage, so anything past the top or
          bottom edge is content nobody can scroll to. It is 772px tall, which
          a 740px phone cannot hold and a 667px one is nowhere near. Shaving
          gaps to suit the shortest screen would cost every screen; scaling
          the whole thing keeps the proportions the section was designed at
          and simply renders them smaller where there is less room. The
          ranges do not overlap, so the two steps cannot fight over which
          applies.
        */}
        <div className="mx-auto w-full max-w-[54rem] [@media(max-height:600px)]:scale-[0.70] [@media(max-height:700px)_and_(min-height:601px)]:scale-[0.85] [@media(max-height:800px)_and_(min-height:701px)]:scale-[0.93]">
          <Caption act={act} />

          <div /*
              `grid-cols-1` is load-bearing, not tidiness.

              With only the `lg:` template set, a grid below that breakpoint
              has no explicit columns and sizes its single implicit column to
              its widest item. The gaze selector is four pills wide, so the
              column resolved to 560px inside a 358px phone — and the profile,
              centred in that column, sat a hundred pixels to the right and
              ran off the screen. `min-w-0` on the children is the other half:
              a grid item's default `min-width: auto` refuses to shrink below
              its content, which is what lets a scrollable strip push a column
              wider than the page.
            */
            className="mt-4 grid grid-cols-1 items-center gap-5 sm:mt-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-9">
            {/* ── the profile, placed once ─────────────────────────── */}
            <motion.div
              style={reduced ? undefined : { y: cardY, scale: cardScale }}
              className="relative mx-auto w-full min-w-0 max-w-[250px] lg:max-w-[272px]"
            >
              <ProfileCard onRegions={setRegions} />
              <Reticle on={analysing} box={target} />
            </motion.div>

            {/* ── everything Blink says about it ───────────────────── */}
            {/*
              Everything Blink says, in a box that never changes size.

              The profile being placed once and never moving again is the
              claim this whole section makes, and on a stacked layout it was
              not true: as the verdict arrived the column grew, the
              vertically-centred stack rebalanced, and the profile crept about
              fifty pixels up the screen. Invisible frame to frame, obvious as
              a drift, and it quietly contradicted the argument.

              So nothing here mounts late. Every part is present from the
              start and arrives by becoming visible in place, which means the
              column is its full height on the first frame and the profile has
              nowhere to drift to. The findings sit on top of the rest rather
              than above them, for the same reason.
            */}
            <div className="relative flex min-w-0 flex-col justify-center">
              <AnimatePresence>
                {act === 1 && (
                  <motion.div
                    key="findings"
                    className="absolute inset-x-0 top-0"
                    exit={{ opacity: 0 }}
                    transition={SPRING.base}
                  >
                    <Findings pass={pass} />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                animate={{ opacity: act >= 2 ? 1 : 0, y: act >= 2 ? 0 : 12 }}
                transition={SPRING.base}
                style={{ pointerEvents: act >= 2 ? "auto" : "none" }}
                aria-hidden={act < 2}
              >
                <GazePicker value={gaze} onChange={setGaze} />
                <motion.div
                  animate={{ opacity: act >= 3 ? 1 : 0 }}
                  transition={SPRING.base}
                >
                  <Readings gaze={gaze} revealed={revealed} />
                </motion.div>
                <motion.div
                  animate={{ opacity: act >= 4 ? 1 : 0 }}
                  transition={SPRING.base}
                >
                  <Verdict revealScore={act >= 5} progress={scoreProgress} />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   The caption — one line, saying what is happening
   ───────────────────────────────────────────────────────────────────── */

function Caption({ act }: { act: number }) {
  const t = useT();
  const lines = [
    t.experience.actProfile,
    t.experience.actAnalysis,
    t.experience.actGaze,
    t.experience.actGaze,
    t.experience.actNiche,
    t.experience.actScore,
  ];
  return (
    <div className="text-center lg:text-left">
      <p className="t-label text-blink-sky/60">{t.experience.eyebrow}</p>
      <div className="mt-2 h-[2.2em] overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.h2
            key={lines[act]}
            className="t-heading text-white"
            initial={{ y: "0.9em", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-0.9em", opacity: 0 }}
            transition={SPRING.base}
          >
            {lines[act]}
          </motion.h2>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   The analysis pass
   ───────────────────────────────────────────────────────────────────── */

/**
 * A reticle that reads one region at a time.
 *
 * Deliberately not a bar sweeping the whole card. A sweep says "processing";
 * landing on the portrait, then the bio, then the grid says "reading this,
 * now this" — which is the difference between a spinner and something that
 * appears to understand what it is looking at.
 *
 * It travels between regions rather than reappearing at each: same object,
 * moving, so the reader follows it.
 */
function Reticle({ on, box }: { on: boolean; box?: DOMRect }) {
  const reduced = useReducedMotion();
  if (!on || !box) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute rounded-[10px]"
      initial={false}
      animate={{ x: box.x - 5, y: box.y - 5, width: box.width + 10, height: box.height + 10 }}
      transition={reduced ? { duration: 0 } : SPRING.morph}
      style={{ left: 0, top: 0, boxShadow: "0 0 0 1.5px hsl(var(--blink-sky) / 0.9), 0 0 26px hsl(var(--blink-sky) / 0.28)" }}
    >
      {/* Corner ticks — the part that reads as an instrument rather than a
          selection rectangle. */}
      {[
        "left-0 top-0 border-l-2 border-t-2 rounded-tl-[10px]",
        "right-0 top-0 border-r-2 border-t-2 rounded-tr-[10px]",
        "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-[10px]",
        "right-0 bottom-0 border-r-2 border-b-2 rounded-br-[10px]",
      ].map((c) => (
        <span key={c} className={`absolute h-3.5 w-3.5 border-blink-sky ${c}`} />
      ))}
    </motion.div>
  );
}

/** What the pass has found so far. Each finding stays once it lands. */
function Findings({ pass }: { pass: number }) {
  const t = useT();
  const PASSES = passes(t);

  return (
    <ul className="space-y-2">
      {PASSES.map((p, i) => (
        <AnimatePresence key={p.at}>
          {i <= pass && (
            <motion.li
              layout
              initial={{ opacity: 0, x: -14, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={SPRING.base}
              className="elev-1 flex items-baseline gap-3 rounded-[var(--r-md)] px-3.5 py-2.5"
            >
              <span className="t-label shrink-0 text-blink-sky/70">{p.label}</span>
              <span className="t-caption text-white/[var(--ink-2)]">{p.found}</span>
            </motion.li>
          )}
        </AnimatePresence>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Who's looking
   ───────────────────────────────────────────────────────────────────── */

function GazePicker({ value, onChange }: { value: Gaze; onChange: (g: Gaze) => void }) {
  const t = useT();
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const readEdges = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  }, []);

  /* Measured after layout and again on resize: whether there is anything past
     the edge depends on the width of four translated labels, which is not
     knowable from here. */
  useEffect(() => {
    readEdges();
    window.addEventListener("resize", readEdges);
    return () => window.removeEventListener("resize", readEdges);
  }, [readEdges, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.base}
    >
      <p className="t-label mb-1.5 text-white/[var(--ink-3)] lg:mb-2">{t.experience.whosLooking}</p>
      {/*
        The scroller says when it has more to say.

        Four gazes need ~470px and a phone gives the pill 358, so the fourth
        sat entirely past the edge — and because the third happened to end
        flush with the rounded border, the row read as complete. Nobody
        scrolls a control that looks finished. These two masks appear only
        while there is something in that direction, so the affordance is the
        truth rather than permanent decoration.
      */}
      <div className="relative inline-block max-w-full align-top">
      <div
        ref={rail}
        role="tablist"
        aria-label={t.experience.whosLooking}
        onScroll={readEdges}
        className="glass-inset inline-flex max-w-full gap-1 overflow-x-auto rounded-[var(--r-pill)] p-1 scrollbar-none"
      >
        {gazes(t).map((g) => {
          const on = g.id === value.id;
          return (
            <motion.button
              key={g.id}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => onChange(g)}
              /* `px-2.5`, not `px-3`: four English tabs came to 558px inside
                 a 556px column on a laptop, so "Someone professional" was
                 clipped by two pixels of nothing. 44px of height is the
                 touch minimum this control was missing. */
              className="focus-ring relative inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--r-pill)] px-2.5 text-[0.78rem] font-semibold"
              style={{ color: on ? "hsl(var(--surface-0))" : "hsl(0 0% 100% / var(--ink-2))" }}
              {...press}
            >
              {/* One object sliding between segments — not a background
                  switching on in one place and off in another. */}
              {on && (
                <motion.span
                  layoutId="gaze-indicator"
                  className="absolute inset-0 rounded-[var(--r-pill)] bg-blink-sky"
                  transition={SPRING.snap}
                />
              )}
              <span className="relative whitespace-nowrap">
                <span aria-hidden>{g.emoji}</span> {g.short}
              </span>
            </motion.button>
          );
        })}
      </div>

        {(["left", "right"] as const).map((side) => (
          <motion.span
            key={side}
            aria-hidden
            initial={false}
            animate={{ opacity: edges[side] ? 1 : 0 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-none absolute inset-y-0 w-9 rounded-[var(--r-pill)] ${
              side === "left"
                ? "left-0 bg-gradient-to-r"
                : "right-0 bg-gradient-to-l"
            } from-[hsl(var(--surface-0))] to-transparent`}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * What that gaze walks away with.
 *
 * `layoutId` on the word itself is the mechanism: a reading shared by two
 * gazes travels to its new rank rather than being destroyed and rebuilt
 * somewhere else. Watching "Confident" slide from first to third is the
 * feature — the profile has not changed, so the words have not changed; their
 * *order of importance* has.
 */
function Readings({ gaze, revealed }: { gaze: Gaze; revealed: number }) {
  return (
    <div className="mt-4 lg:mt-5">
      {/* Fixed height: the readings arrive one at a time, and a column that
          grows as they land would push the verdict below it down the screen
          four times. */}
      <ul className="space-y-1 lg:space-y-1.5">
        {gaze.reads.map((word, i) => {
          /* Once a reading is out, changing the gaze re-ranks it rather than
             re-revealing it — so a reader who has scrolled past this act and
             then switches gaze sees a re-ranking, not a replay. */
          const here = i < revealed;
          return (
          <motion.li
            key={word}
            layout
            layoutId={`read-${word}`}
            transition={SPRING.morph}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: here ? 1 : 0, scale: here ? 1 : 0.94, x: here ? 0 : -10 }}
            className="flex items-center gap-3"
          >
            <span className="t-numeric w-4 text-[0.68rem] text-white/[var(--ink-4)]">
              {i + 1}
            </span>
            <motion.span
              layout
              className="rounded-[var(--r-pill)] px-3 py-1 font-bold sm:px-3.5 sm:py-1.5"
              animate={{
                fontSize: i === 0 ? "1.02rem" : "0.86rem",
                backgroundColor:
                  i === 0 ? "hsl(var(--blink-sky) / 0.16)" : "hsl(0 0% 100% / 0.05)",
                color:
                  i === 0 ? "hsl(var(--blink-sky))" : "hsl(0 0% 100% / var(--ink-2))",
              }}
              transition={SPRING.morph}
            >
              {word}
            </motion.span>
          </motion.li>
          );
        })}
      </ul>

      <AnimatePresence mode="wait">
        <motion.p
          key={gaze.id}
          className="t-caption mt-2 text-white/[var(--ink-3)] lg:mt-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={SPRING.base}
        >
          {gaze.summary}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Niche, then score
   ───────────────────────────────────────────────────────────────────── */

/**
 * The niche first, the score second, in that order and never together.
 *
 * A number on its own invites "8.7 out of what?". Naming the niche before it
 * appears answers the question before it is asked, which is the only reason
 * the two are in the same box.
 */
function Verdict({
  revealScore,
  progress,
}: {
  revealScore: boolean;
  progress: MotionValue<number>;
}) {
  const t = useT();
  return (
    <motion.div
      className="surface-raised mt-4 inline-flex items-center gap-4 self-start p-3.5 pr-4 sm:gap-5 sm:p-4 sm:pr-5 lg:mt-6"
    >
      <div className="min-w-0">
        <p className="t-label text-white/[var(--ink-3)]">{t.experience.measuredAs}</p>
        <p className="t-heading mt-0.5 whitespace-nowrap text-white">
          {categoryLabel(NICHE_ID, t) ?? NICHE_ID}
        </p>
      </div>
      {/* The score arrives inside a box that already has room for it — its
          own scale and opacity, not the layout's. */}
      <motion.div
        animate={{ opacity: revealScore ? 1 : 0, scale: revealScore ? 1 : 0.92 }}
        transition={SPRING.drop}
        className="text-right"
        aria-hidden={!revealScore}
      >
        {revealScore ? <Counting to={SCORE} progress={progress} /> : <span className="t-numeric block text-[2rem] font-extrabold leading-none sm:text-[2.4rem]">&nbsp;</span>}
        <p className="t-label text-white/[var(--ink-4)]">{t.experience.outOfTen}</p>
      </motion.div>
    </motion.div>
  );
}

/**
 * A score arriving at a value.
 *
 * It counts because a number that simply appears is an assertion, and a number
 * that resolves is a measurement — the same reason a scale settles rather than
 * jumping. It stops on the value and stays there; it does not tick, spin or
 * celebrate.
 *
 * Tabular figures, so the width does not jitter on the way.
 */
function Counting({ to, progress }: { to: number; progress: MotionValue<number> }) {
  const reduced = useReducedMotion();

  /*
    Decelerating, and quantised by the display itself.

    The eased curve puts most of the distance into the first part of the
    travel, so the last tenth is the slowest — the number visibly *arrives* at
    a value rather than sliding past it. Rendering one decimal does the rest:
    what the reader sees is 7.8, 8.2, 8.5, 8.6, 8.7, which is a score being
    reached rather than a slider being dragged.
  */
  const shown = useTransform(progress, (k) => {
    if (reduced) return to.toFixed(1);
    const from = Math.max(0, to - 0.9);
    const eased = 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
    return (from + (to - from) * eased).toFixed(1);
  });

  return (
    <motion.span className="t-numeric block text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white sm:text-[2.4rem]">
      {shown}
    </motion.span>
  );
}
