/**
 * Blink — the leaderboard, demonstrated.
 *
 * The board is the visual: rows float on the page with their own depth rather
 * than sitting inside a drawn frame, and the row that matters is scaled and
 * lit while the others recede. Framer's `layout` does the actual reordering,
 * so the climb the user watches is the climb the product performs.
 *
 * Three things this sequence has to get right:
 *
 *  - **It starts before you arrive.** The observer reaches most of a viewport
 *    below the fold, so by the time the section is on screen the story is
 *    already moving. Waiting for the section to be centred meant scrolling
 *    onto a still board and then watching nothing for a beat.
 *  - **Each beat is readable.** Four beats at 1.2-1.5s each meant the caption
 *    changed before you had finished it. There are now three, each holding
 *    long enough to read, with the score-and-climb story landing in about
 *    3.5s and the category act following it.
 *  - **It never freezes.** The run loops. `run` is mixed into the row keys so
 *    a restart is rows entering, not rows teleporting home — the difference
 *    between a loop and a glitch. A leaderboard that stops dead is a
 *    screenshot, and the point of the section is that this thing is live and
 *    you are in it.
 *
 * The argument runs in three claims and a payoff: rank comes from how a
 * profile reads and not from followers (890 followers finishing above 1.2M);
 * the board narrows to a category; and a high enough position stops being a
 * number and becomes status you can hold. The badge reveal is the payoff, and
 * it uses the same emblems the app awards — not a mock-up of them.
 *
 * On invented data: rows are anonymous, with no handles, names or avatars,
 * because fabricating people would misrepresent a board that only ever
 * contains real verified profiles. Only "You" is labelled, which reads as a
 * diagram of your own position.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Crown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BadgeEmblem } from "@/components/app/BadgeEmblem";
import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import type { BadgeSpec } from "@/lib/badges";
import { useT } from "@/lib/i18n";
import { deltaOutOfTen, scoreOutOfTen } from "@/lib/ranking";
import { useSectionMotion } from "@/lib/use-section-motion";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  score: number;
  isYou?: boolean;
  category: string;
  /**
   * Audience size, as a label.
   *
   * The section's first claim is that rank is not bought with followers, and
   * that claim is unprovable without showing the follower counts it is
   * ignoring. These are annotations on a diagram, not people — the rows carry
   * no names, handles or faces for exactly that reason.
   */
  followers: string;
}

const INITIAL_ROWS: Row[] = [
  { id: "a", score: 871, category: "Creator", followers: "1.2M" },
  { id: "b", score: 838, category: "Artist", followers: "340k" },
  { id: "c", score: 802, category: "Larp", followers: "8.4k" },
  { id: "d", score: 764, category: "Larp", followers: "2.1k" },
  { id: "you", score: 731, isYou: true, category: "Larp", followers: "890" },
];

/**
 * Enough to take the smallest account on the board to first place.
 *
 * That is the whole argument in one number: 890 followers finishing above
 * 1.2M. A climb to second would have been safer and would have proved nothing.
 */
const IMPROVED_SCORE = 889;

/** Shown when the board narrows. `All` first, Larp next — as in the app. */
const CATEGORY_PILLS = ["All", "Larp", "Creator", "Fashion", "Fitness"];

/**
 * The three things this section has to land, one per beat, then the payoff.
 *
 * Beats are short and the holds are where the reading happens — slowing
 * everything down uniformly would have made it feel like a loading bar rather
 * than a product. The run loops, so no frame is ever the last one.
 */
const STEPS = [
  { id: "board", caption: "captionBoard", ms: 2300 },
  { id: "climb", caption: "captionClimb", ms: 2400 },
  { id: "categories", caption: "captionCategories", ms: 1900 },
  { id: "larp", caption: "captionLarp", ms: 2000 },
  { id: "badges", caption: "captionBadges", ms: 3000 },
] as const;

/** The status a first-in-category, first-overall profile actually holds. */
const EARNED: BadgeSpec[] = [
  {
    id: "champion",
    label: "Larp Icon",
    value: "#1",
    detail: "",
    shape: "shield",
    icon: "champion",
    grade: "elite",
  },
  {
    id: "elite",
    label: "Elite",
    value: "#1",
    detail: "",
    shape: "hex",
    icon: "elite",
    grade: "elite",
  },
  {
    id: "topten",
    label: "Top 10",
    value: "#1",
    detail: "",
    shape: "hex",
    icon: "topten",
    grade: "earned",
  },
];

type StepId = (typeof STEPS)[number]["id"];

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 340, damping: 32 };

export function LeaderboardShowcase({ onCTA }: { onCTA: () => void }) {
  // The ref goes on the board, not on the section — see `useSectionMotion`.
  const { ref, inView } = useSectionMotion();
  const reduceMotion = useReducedMotion();
  const t = useT();
  const [index, setIndex] = useState(0);

  /**
   * Which pass through the sequence we're on.
   *
   * Bumped on every wrap and mixed into the row keys, so `AnimatePresence`
   * treats a restart as fresh rows entering rather than as the same rows
   * teleporting back to their opening positions — which is what a naive index
   * reset looks like, and it reads as a glitch.
   */
  const [run, setRun] = useState(0);

  // Leaving the viewport rewinds, so returning starts the loop cleanly rather
  // than dropping the reader into the badge reveal with no context.
  useEffect(() => {
    if (!inView) setIndex(0);
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setIndex(STEPS.length - 1);
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next < STEPS.length) return next;
        setRun((r) => r + 1);
        return 0;
      });
    }, STEPS[index].ms);
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, index]);

  const at = (s: StepId) => STEPS.findIndex((x) => x.id === s);
  const past = (s: StepId) => index >= at(s);

  const climbed = past("climb");
  const narrowed = past("larp");
  const showBadges = past("badges");

  const rows = useMemo(() => {
    const scored = INITIAL_ROWS.map((r) =>
      r.isYou && climbed ? { ...r, score: IMPROVED_SCORE } : r,
    );
    const visible = narrowed ? scored.filter((r) => r.category === "Larp") : scored;
    return visible.sort((a, b) => b.score - a.score);
  }, [climbed, narrowed]);

  return (
    <section id="leaderboard" className="relative px-4 py-20 sm:px-6 sm:py-28">
      {/*
        Two compositions, not one shrunk.

        Below `lg` the argument runs top to bottom: claim, board, what just
        happened. From `lg` the claim and the running commentary sit to the
        left of the board and stay put while it moves, which is how you read a
        demonstration someone is narrating — you do not look away from the
        thing to read the caption. `items-center` rather than `items-start` so
        neither column is anchored to a top edge the other does not share.
      */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <div className="min-w-0">
          <Reveal className="text-center lg:text-left">
            <p className="t-label text-blink-sky/70">{t.leaderboardSection.eyebrow}</p>
            <h2 className="t-title mt-3 text-balance text-white">
              {t.leaderboardSection.heading}
            </h2>
            <p className="t-body mx-auto mt-3 max-w-md text-balance text-white/50 sm:mt-4 lg:mx-0">
              {t.leaderboardSection.subtitle}
            </p>
          </Reveal>

          {/*
            The running commentary.

            Desktop only in this position — on a phone it belongs under the
            board, where it is next to the thing it is describing. Reserved
            height either way, because a caption that changes length must not
            move the board.
          */}
          <div className="mt-6 hidden h-12 lg:block">
            <Caption id={STEPS[index].id} text={t.leaderboardSection[STEPS[index].caption]} />
          </div>

          <p className="t-label mt-4 hidden font-medium text-white/25 lg:block">
            {t.leaderboardSection.illustrative}
          </p>

          <Reveal delay={0.05} className="mt-8 hidden lg:flex">
            <CTAButton label={t.leaderboardSection.cta} onClick={onCTA} />
          </Reveal>
        </div>

        {/* No frame: the rows themselves are the object. */}
        <div ref={ref} className="mx-auto w-full min-w-0 max-w-[360px] lg:mx-0 lg:max-w-none">
          <BoardHeader narrowed={narrowed} showWeek={past("categories")} />

          {/*
            The full board's worth of space, always.

            The board narrows from five rows to three mid-sequence. Left to
            flow, that is 27px of document disappearing under a reader who is
            below it — the rows are supposed to reorder, not to take the page
            with them. Measured at the tallest state (five rows carrying their
            category line, 287px) and reserved, so the narrowing reads as rows
            leaving a board rather than as a board collapsing.
          */}
          <div className="flex h-[18rem] flex-col justify-center gap-2">
            <AnimatePresence initial={false} mode="popLayout">
              {rows.map((row, i) => (
                <BoardRow
                  key={`${run}-${row.id}`}
                  row={row}
                  rank={i + 1}
                  verifying={!!row.isYou && STEPS[index].id === "climb"}
                  climbed={climbed}
                  showMomentum={past("climb") && !!row.isYou}
                  showCrown={i === 0 && past("categories")}
                  showCategory={past("categories")}
                />
              ))}
            </AnimatePresence>
          </div>

          {/*
            The category strip and the badges both arrive mid-sequence, so both
            get their space reserved up front. Animating `height: auto` inside
            a section makes the section grow, the document grow, and a reader
            parked below get shoved — the same bug that was fixed in How It
            Works, and it is not being reintroduced here.
          */}
          <div className="h-[3.25rem]">
            <CategoryStrip shown={past("categories")} selected={narrowed ? "Larp" : "All"} />
          </div>

          <div className="h-[6.5rem]">
            <StatusReveal shown={showBadges} />
          </div>

          {/* Phones: the commentary under the board it describes. */}
          <div className="mt-2 h-12 lg:hidden">
            <Caption id={STEPS[index].id} text={t.leaderboardSection[STEPS[index].caption]} />
          </div>

          {/* These rows are a demonstration, not standings. The scores and
              follower counts are invented to show how the board behaves, so
              the sequence carries a marker rather than letting a visitor read
              it as a live leaderboard. */}
          <p className="t-label mt-2 text-center font-medium text-white/25 lg:hidden">
            {t.leaderboardSection.illustrative}
          </p>

          <Reveal delay={0.05} className="mt-7 flex justify-center lg:hidden">
            <CTAButton label={t.leaderboardSection.cta} onClick={onCTA} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** The commentary on the beat currently playing. */
function Caption({ id, text }: { id: string; text: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.22 }}
        className="t-body text-balance font-medium text-white/60"
      >
        {text}
      </motion.p>
    </AnimatePresence>
  );
}

/** "Global" becomes "Larp" — the same board, narrowed. */
function BoardHeader({ narrowed, showWeek }: { narrowed: boolean; showWeek: boolean }) {
  return (
    /* Fixed: the week label arrives mid-sequence and was worth two pixels of
       document every time it did. */
    <div className="mb-2 flex h-6 items-center justify-between px-1 pb-1">
      <span className="relative block h-3 min-w-[3.5rem]">
        <AnimatePresence mode="wait">
          <motion.span
            key={narrowed ? "larp" : "global"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute inset-0 whitespace-nowrap text-[0.6rem] font-bold uppercase tracking-[0.16em]",
              narrowed ? "text-blink-sky" : "text-white/30",
            )}
          >
            {narrowed ? "Larp" : "Global"}
          </motion.span>
        </AnimatePresence>
      </span>

      <AnimatePresence>
        {showWeek && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white/30"
          >
            This week
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The category row, revealed under the board.
 *
 * It arrives as part of the same movement rather than as a caption: the pills
 * slide up, then one of them takes the accent and the board above narrows to
 * match. That ordering is what makes it read as cause and effect.
 *
 * Slides into space its parent has already reserved. It used to animate its
 * own height, which grew the section and the document with it and shoved any
 * reader parked below.
 */
function CategoryStrip({ shown, selected }: { shown: boolean; selected: string | null }) {
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-1.5 overflow-hidden pt-4">
            {CATEGORY_PILLS.map((label, i) => {
              const active = label === selected;
              return (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: active ? 1 : 0.45, y: 0 }}
                  transition={{ ...spring, delay: 0.05 + i * 0.05 }}
                  className={cn(
                    "relative whitespace-nowrap rounded-full px-3 py-1.5 text-[0.68rem] font-bold transition-colors",
                    active ? "text-blink-navy" : "text-white/60 ring-1 ring-white/10",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="showcase-category-pill"
                      className="absolute inset-0 rounded-full bg-blink-sky"
                      transition={spring}
                    />
                  )}
                  <span className="relative">{label}</span>
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The payoff: the status a first-place profile actually holds.
 *
 * These are the real emblems from the badge system, not a drawing of them, so
 * what the section promises is literally what the profile screen awards.
 */
function StatusReveal({ shown }: { shown: boolean }) {
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease }}
          className="overflow-hidden"
        >
          <div className="flex items-start justify-center gap-6 pt-5">
            {EARNED.map((badge, i) => (
              <motion.div
                key={badge.id}
                className="flex flex-col items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.4, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 20,
                  delay: 0.1 + i * 0.12,
                }}
              >
                <BadgeEmblem badge={badge} size={46} />
                <span className="text-[0.6rem] font-bold text-white/50">{badge.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BoardRow({
  row,
  rank,
  verifying,
  climbed,
  showMomentum,
  showCrown,
  showCategory,
}: {
  row: Row;
  rank: number;
  verifying: boolean;
  climbed: boolean;
  showMomentum: boolean;
  showCrown: boolean;
  showCategory: boolean;
}) {
  // The moving row leads; the rest step back so the eye knows where to look.
  const focused = !!row.isYou;

  return (
    <motion.div
      layout
      transition={spring}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{
        scale: focused ? 1 : 0.985,
        opacity: focused ? 1 : 0.62,
      }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 ring-1",
        focused
          ? "bg-blink-sky/[0.1] shadow-[0_14px_36px_-16px_rgba(175,224,249,0.5)] ring-blink-sky/35"
          : "bg-white/[0.035] ring-white/[0.07]",
      )}
    >
      <motion.span
        layout="position"
        className={cn(
          "w-5 shrink-0 text-center text-xs font-extrabold tabular-nums",
          rank === 1 ? "text-blink-sky" : "text-white/40",
        )}
      >
        {rank}
      </motion.span>

      <span
        className={cn(
          "h-7 w-7 shrink-0 rounded-full",
          row.isYou ? "bg-blink-sky/45" : "bg-white/[0.09]",
        )}
      />

      <div className="min-w-0 flex-1">
        {row.isYou ? (
          <span className="text-sm font-bold text-white">You</span>
        ) : (
          <span className="block h-2 w-14 rounded-full bg-white/[0.14]" />
        )}
        <span className="mt-1 flex items-center gap-1.5 text-[0.62rem] font-semibold">
          <span className="text-white/30">{row.followers} followers</span>
          <AnimatePresence>
            {showCategory && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className={cn(
                  "overflow-hidden whitespace-nowrap",
                  row.category === "Larp" ? "text-blink-sky/80" : "text-white/35",
                )}
              >
                · {row.category}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>

      <AnimatePresence>
        {showCrown && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={spring}
          >
            <Crown className="h-4 w-4 text-blink-sky" />
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMomentum && (
          <motion.span
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring}
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[0.62rem] font-bold text-emerald-300"
          >
            <TrendingUp className="h-3 w-3" />
            {deltaOutOfTen(IMPROVED_SCORE - INITIAL_ROWS[4].score)}
          </motion.span>
        )}
      </AnimatePresence>

      {/* The score counts rather than swaps, so the climb reads as earned.
          Out of ten, like every other score Blink shows — the stored integer
          is a ten-point score in hundredths and always was. */}
      <span className="t-numeric w-11 shrink-0 text-right text-sm font-extrabold text-white">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={row.score}
            initial={{ opacity: 0, y: row.isYou && climbed ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease }}
            className="inline-block"
          >
            {scoreOutOfTen(row.score)}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* Verification sweep — the moment a new screenshot is confirmed. */}
      <AnimatePresence>
        {verifying && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3"
            initial={{ left: "-35%", opacity: 0 }}
            animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(175,224,249,0.3), transparent)",
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
