/**
 * Blink — the leaderboard, explained by demonstrating it.
 *
 * Rather than illustrating the rules in a diagram, this plays the actual
 * mechanic: a row earns a verified improvement, its score rises, and Framer
 * Motion's `layout` genuinely reorders the board so the row climbs past the
 * others. The movement the user sees here is the movement the product performs.
 *
 * On invented data: the rows are deliberately anonymous — no handles, no
 * avatars, no names — because fabricating people would misrepresent a board
 * that is supposed to contain only real, verified profiles. Only "You" is
 * labelled, which reads as a diagram of your own position rather than a claim
 * about who is currently ranked.
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

/** Starting board. "You" sits fourth until the verified improvement lands. */
const INITIAL_ROWS: Row[] = [
  { id: "a", score: 913, category: "Artist" },
  { id: "b", score: 871, category: "Creator" },
  { id: "c", score: 838, category: "Larp" },
  { id: "you", score: 781, isYou: true, category: "Minimalist" },
];

/** The score "You" reaches after a verified re-analysis — enough to pass two rows. */
const IMPROVED_SCORE = 889;

const STEPS = [
  { id: "measure", caption: "Blink ranks how optimized a profile is." },
  { id: "verify", caption: "Change something real, then upload a new screenshot." },
  { id: "climb", caption: "Verified improvements move you up the board." },
  { id: "momentum", caption: "Momentum shows who is climbing fastest." },
  { id: "winners", caption: "Every week: category winners and one overall winner." },
  { id: "fairness", caption: "Never followers, fame or wealth. Only the profile." },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STEP_MS = 2100;
const spring = { type: "spring" as const, stiffness: 320, damping: 34 };

export function LeaderboardShowcase({ onCTA }: { onCTA: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setStep(STEPS.length - 1);
      return;
    }
    const timer = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => window.clearInterval(timer);
  }, [inView, reduceMotion]);

  useEffect(() => {
    if (!inView && !reduceMotion) setStep(0);
  }, [inView, reduceMotion]);

  const current: StepId = STEPS[step].id;
  const climbed = step >= STEPS.indexOf(STEPS.find((s) => s.id === "climb")!);
  const showMomentum = step >= 3;
  const showWinners = step >= 4;

  // Re-sorting the array is what drives the layout animation; Framer tweens
  // each row from its old position to its new one because the keys persist.
  const rows = useMemo(() => {
    const next = INITIAL_ROWS.map((r) =>
      r.isYou && climbed ? { ...r, score: IMPROVED_SCORE } : r,
    );
    return next.sort((a, b) => b.score - a.score);
  }, [climbed]);

  return (
    <section
      id="leaderboard"
      ref={sectionRef}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            There&rsquo;s a leaderboard.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            It measures how well a profile reads — so a small account can sit above a
            famous one.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 w-full max-w-[420px] sm:mt-16">
          <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
            <div className="flex items-center justify-between px-1 pb-3">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/35">
                Global
              </span>
              <AnimatePresence mode="wait">
                {showWinners && (
                  <motion.span
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-blink-sky"
                  >
                    This week
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              {rows.map((row, index) => (
                <BoardRow
                  key={row.id}
                  row={row}
                  rank={index + 1}
                  step={current}
                  showMomentum={showMomentum && !!row.isYou}
                  showCrown={showWinners && index === 0}
                  showCategory={showWinners}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="h-10 text-center sm:h-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={current}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.26 }}
                  className="text-sm font-medium text-white/60"
                >
                  {STEPS[step].caption}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <motion.span
                  key={s.id}
                  className="h-1 rounded-full bg-white"
                  initial={false}
                  animate={{ width: i === step ? 16 : 5, opacity: i === step ? 0.9 : 0.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ))}
            </div>
          </div>
        </div>

        <Reveal delay={0.1} className="mt-12 flex justify-center">
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
  showMomentum,
  showCrown,
  showCategory,
}: {
  row: Row;
  rank: number;
  step: StepId;
  showMomentum: boolean;
  showCrown: boolean;
  showCategory: boolean;
}) {
  const verifying = row.isYou && step === "verify";

  return (
    <motion.div
      layout
      transition={spring}
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5",
        row.isYou
          ? "border-blink-sky/35 bg-blink-sky/[0.08]"
          : "border-white/[0.06] bg-white/[0.03]",
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

      {/* Anonymous mark — this is a diagram, not a real person. */}
      <span
        className={cn(
          "h-7 w-7 shrink-0 rounded-full",
          row.isYou ? "bg-blink-sky/40" : "bg-white/[0.09]",
        )}
      />

      <div className="min-w-0 flex-1">
        {row.isYou ? (
          <span className="text-sm font-bold text-white">You</span>
        ) : (
          <span className="block h-2 w-16 rounded-full bg-white/[0.14]" />
        )}
        <AnimatePresence>
          {showCategory && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 block text-[0.65rem] font-semibold text-white/35"
            >
              {row.category}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCrown && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={spring}
          >
            <Crown className="h-4 w-4 text-blink-sky" />
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMomentum && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={spring}
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[0.65rem] font-bold text-emerald-300"
          >
            <TrendingUp className="h-3 w-3" />2
          </motion.span>
        )}
      </AnimatePresence>

      {/* The score counts up rather than swapping, so the climb reads as earned. */}
      <motion.span
        layout="position"
        className="w-10 shrink-0 text-right text-sm font-extrabold tabular-nums text-white"
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={row.score}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="inline-block"
          >
            {row.score}
          </motion.span>
        </AnimatePresence>
      </motion.span>

      {/* Verification sweep — the moment a new screenshot is confirmed. */}
      <AnimatePresence>
        {verifying && (
          <motion.span
            className="pointer-events-none absolute inset-y-0 w-1/3"
            initial={{ left: "-35%", opacity: 0 }}
            animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(175,224,249,0.22), transparent)",
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
