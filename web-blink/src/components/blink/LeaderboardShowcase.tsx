/**
 * Blink — the leaderboard, demonstrated.
 *
 * The board is the visual: rows float on the page with their own depth rather
 * than sitting inside a drawn frame, and the row that matters is scaled and
 * lit while the others recede. Framer's `layout` does the actual reordering,
 * so the climb the user watches is the climb the product performs.
 *
 * Two things this sequence has to get right:
 *
 *  - **It starts before you arrive.** The observer reaches most of a viewport
 *    below the fold, so by the time the section is on screen the story is
 *    already moving. Waiting for the section to be centred meant scrolling
 *    onto a still board and then watching nothing for a beat.
 *  - **It ends.** The run is ~5s and then rests on its final state. Looping
 *    forever pulls the eye back to a section the reader has finished with, and
 *    a reader who scrolls back should find the conclusion, not step one.
 *
 * The conclusion is the point of the whole section: you are not competing in
 * one enormous meaningless board. Global filters down to a category, the two
 * profiles that don't belong drop away, and the same person who was second
 * overall is first in Larp — which is Blink's own category and the reason the
 * category system exists.
 *
 * On invented data: rows are anonymous, with no handles, names or avatars,
 * because fabricating people would misrepresent a board that only ever
 * contains real verified profiles. Only "You" is labelled, which reads as a
 * diagram of your own position.
 */

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Crown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  score: number;
  isYou?: boolean;
  category: string;
}

const INITIAL_ROWS: Row[] = [
  { id: "a", score: 913, category: "Creator" },
  { id: "b", score: 871, category: "Artist" },
  { id: "c", score: 838, category: "Larp" },
  { id: "you", score: 781, isYou: true, category: "Larp" },
];

/** Enough of a jump to pass two rows, so the movement is legible. */
const IMPROVED_SCORE = 889;

/** Shown when the board narrows. Larp leads because the ending lands on it. */
const CATEGORY_PILLS = ["Larp", "Creator", "Fashion", "Fitness"];

const STEPS = [
  { id: "board", caption: "Every profile gets a score.", ms: 1050 },
  { id: "verify", caption: "Change something real, upload a new screenshot.", ms: 1300 },
  { id: "climb", caption: "Verified improvements move you up.", ms: 1450 },
  { id: "categories", caption: "And you're not only ranked against everyone.", ms: 1400 },
  // Terminal: no duration, the sequence rests here.
  { id: "larp", caption: "Larp is a category. So is yours.", ms: null },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 340, damping: 32 };

export function LeaderboardShowcase({ onCTA }: { onCTA: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Fires roughly a viewport early, so the story is underway on arrival.
  const inView = useInView(ref, { amount: 0, margin: "0px 0px 65% 0px", once: true });
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setIndex(STEPS.length - 1);
      return;
    }
    const ms = STEPS[index].ms;
    // Null duration marks the resting state — nothing schedules a restart.
    if (ms === null) return;
    const timer = window.setTimeout(() => setIndex((i) => i + 1), ms);
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, index]);

  const at = (s: StepId) => STEPS.findIndex((x) => x.id === s);
  const past = (s: StepId) => index >= at(s);

  const climbed = past("climb");
  const narrowed = past("larp");

  const rows = useMemo(() => {
    const scored = INITIAL_ROWS.map((r) =>
      r.isYou && climbed ? { ...r, score: IMPROVED_SCORE } : r,
    );
    const visible = narrowed ? scored.filter((r) => r.category === "Larp") : scored;
    return visible.sort((a, b) => b.score - a.score);
  }, [climbed, narrowed]);

  return (
    <section id="leaderboard" ref={ref} className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            Where it goes
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            There&rsquo;s a leaderboard.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            It measures how well a profile reads — so a small account can sit above a famous
            one.
          </p>
        </Reveal>

        {/* No frame: the rows themselves are the object. */}
        <div className="mx-auto mt-10 w-full max-w-[360px] sm:mt-14">
          <BoardHeader narrowed={narrowed} showWeek={past("categories")} />

          <div className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {rows.map((row, i) => (
                <BoardRow
                  key={row.id}
                  row={row}
                  rank={i + 1}
                  verifying={!!row.isYou && STEPS[index].id === "verify"}
                  climbed={climbed}
                  showMomentum={past("climb") && !!row.isYou && !narrowed}
                  showCrown={i === 0 && past("categories")}
                  showCategory={past("categories")}
                />
              ))}
            </AnimatePresence>
          </div>

          <CategoryStrip shown={past("categories")} selected={narrowed ? "Larp" : null} />
        </div>

        <div className="mt-5 h-10 text-center sm:h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={STEPS[index].id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="text-sm font-medium text-white/60"
            >
              {STEPS[index].caption}
            </motion.p>
          </AnimatePresence>
        </div>

        <Reveal delay={0.05} className="mt-8 flex justify-center">
          <CTAButton label="See where I'd rank" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}

/** "Global" becomes "Larp" — the same board, narrowed. */
function BoardHeader({ narrowed, showWeek }: { narrowed: boolean; showWeek: boolean }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2.5">
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
 */
function CategoryStrip({ shown, selected }: { shown: boolean; selected: string | null }) {
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
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
        <AnimatePresence>
          {showCategory && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "mt-1 block text-[0.62rem] font-semibold",
                row.category === "Larp" ? "text-blink-sky/80" : "text-white/35",
              )}
            >
              {row.category}
            </motion.span>
          )}
        </AnimatePresence>
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
            <TrendingUp className="h-3 w-3" />2
          </motion.span>
        )}
      </AnimatePresence>

      {/* The score counts rather than swaps, so the climb reads as earned. */}
      <span className="w-10 shrink-0 text-right text-sm font-extrabold tabular-nums text-white">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={row.score}
            initial={{ opacity: 0, y: row.isYou && climbed ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease }}
            className="inline-block"
          >
            {row.score}
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
