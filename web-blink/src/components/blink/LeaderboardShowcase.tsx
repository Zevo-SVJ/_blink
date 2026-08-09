/**
 * Blink — the leaderboard, demonstrated.
 *
 * The board is the visual: rows float on the page with their own depth rather
 * than sitting inside a drawn frame, and the row that matters is scaled and
 * lit while the others recede. Framer's `layout` does the actual reordering,
 * so the climb the user watches is the climb the product performs.
 *
 * Four rows, not ten — attention goes to the one moving.
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
  { id: "a", score: 913, category: "Artist" },
  { id: "b", score: 871, category: "Creator" },
  { id: "c", score: 838, category: "Larp" },
  { id: "you", score: 781, isYou: true, category: "Minimalist" },
];

/** Enough of a jump to pass two rows, so the movement is legible. */
const IMPROVED_SCORE = 889;

const STEPS = [
  { id: "board", caption: "Every profile gets a score.", ms: 1250 },
  { id: "verify", caption: "Change something real, upload a new screenshot.", ms: 1600 },
  { id: "climb", caption: "Verified improvements move you up.", ms: 1800 },
  { id: "momentum", caption: "Momentum shows who is climbing fastest.", ms: 1600 },
  { id: "winners", caption: "Weekly winners, overall and by category.", ms: 1700 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 340, damping: 32 };

export function LeaderboardShowcase({ onCTA }: { onCTA: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.1, margin: "0px 0px 250px 0px" });
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setIndex(STEPS.length - 1);
      return;
    }
    const timer = window.setTimeout(
      () => setIndex((i) => (i + 1) % STEPS.length),
      STEPS[index].ms,
    );
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, index]);

  const step: StepId = STEPS[index].id;
  const at = (s: StepId) => STEPS.findIndex((x) => x.id === s);
  const past = (s: StepId) => index >= at(s);

  const climbed = past("climb");
  const rows = useMemo(() => {
    const next = INITIAL_ROWS.map((r) =>
      r.isYou && climbed ? { ...r, score: IMPROVED_SCORE } : r,
    );
    return next.sort((a, b) => b.score - a.score);
  }, [climbed]);

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
          <div className="flex items-center justify-between px-1 pb-2.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white/30">
              Global
            </span>
            <AnimatePresence>
              {past("winners") && (
                <motion.span
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-blink-sky"
                >
                  This week
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <BoardRow
                key={row.id}
                row={row}
                rank={i + 1}
                step={step}
                climbed={climbed}
                showMomentum={past("momentum") && !!row.isYou}
                showCrown={past("winners") && i === 0}
                showCategory={past("winners")}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 h-10 text-center sm:h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
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

function BoardRow({
  row,
  rank,
  step,
  climbed,
  showMomentum,
  showCrown,
  showCategory,
}: {
  row: Row;
  rank: number;
  step: StepId;
  climbed: boolean;
  showMomentum: boolean;
  showCrown: boolean;
  showCategory: boolean;
}) {
  const verifying = row.isYou && step === "verify";
  // The moving row leads; the rest step back so the eye knows where to look.
  const focused = !!row.isYou;

  return (
    <motion.div
      layout
      transition={spring}
      animate={{
        scale: focused ? 1 : 0.985,
        opacity: focused ? 1 : 0.62,
      }}
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
              className="mt-1 block text-[0.62rem] font-semibold text-white/35"
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
            transition={{ duration: 1, ease: "easeInOut" }}
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
