/**
 * Blink — "One profile. Multiple impressions."
 *
 * The point of this section is that six readings come from *one* profile, so
 * the composition keeps a single profile surface visually anchored while the
 * perspectives change around it. The previous version cross-faded six
 * standalone cards, which read as six unrelated results.
 *
 * The avatar and the score ring never unmount; only the lens, quote, traits and
 * ring value change. That persistence is what makes it feel like one subject
 * being re-read rather than a carousel.
 */

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { PERCEPTIONS } from "@/lib/blink-data";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  crush: "crush",
  stranger: "stranger",
  friends: "friends",
  recruiter: "recruiter",
  "green-flag": "green flag",
  "red-flag": "red flag",
};

const CYCLE_MS = 3200;
const RING_R = 34;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export function PerceptionShowcase({ onCTA }: { onCTA: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.15, margin: "0px 0px 150px 0px" });
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    if (!inView || interacted || reduceMotion) return;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % PERCEPTIONS.length),
      CYCLE_MS,
    );
    return () => window.clearInterval(timer);
  }, [inView, interacted, reduceMotion]);

  const current = PERCEPTIONS[active];
  const progress = Math.max(0, Math.min(1, current.score / 10));

  return (
    <section
      id="perceptions"
      ref={sectionRef}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            One profile. Multiple impressions.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            Blink reveals how the same profile reads from six different perspectives.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 w-full max-w-[420px] sm:mt-14">
          {/* The product surface. One frame, one subject. */}
          <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.8)] sm:p-6">
            {/* Anchor: avatar + score. Never unmounts, so it reads as the same
                person being looked at differently. */}
            <div className="flex items-center gap-4">
              <div className="relative flex h-[82px] w-[82px] shrink-0 items-center justify-center">
                <svg width={82} height={82} className="-rotate-90" aria-hidden>
                  <circle
                    cx={41}
                    cy={41}
                    r={RING_R}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={5}
                  />
                  <motion.circle
                    cx={41}
                    cy={41}
                    r={RING_R}
                    fill="none"
                    stroke="hsl(var(--blink-sky))"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
                <div className="absolute h-[52px] w-[52px] rounded-full bg-[linear-gradient(140deg,hsl(var(--blink-sky))_0%,hsl(var(--blink-sky-bright))_100%)]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/35">
                  Seen as
                </p>
                {/* Only the lens title swaps. */}
                <div className="mt-1 min-h-[3rem]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={current.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-start gap-2 text-lg font-extrabold leading-tight text-white"
                    >
                      <span className="shrink-0">{current.emoji}</span>
                      <span className="min-w-0">{current.title}</span>
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <AnimatePresence mode="popLayout">
                  <motion.p
                    key={current.score}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="text-2xl font-extrabold tabular-nums leading-none text-white"
                  >
                    {current.score}
                  </motion.p>
                </AnimatePresence>
                <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-white/30">
                  / 10
                </p>
              </div>
            </div>

            {/* The reading itself. */}
            <div className="mt-5 min-h-[7.5rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-[0.95rem] leading-relaxed text-white/75">
                    &ldquo;{current.quote}&rdquo;
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {current.tags.map((tag, i) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          i === 0
                            ? "bg-blink-sky text-blink-navy"
                            : "bg-white/[0.08] text-white/70",
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Lens selector, doubling as the progress indicator. */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {PERCEPTIONS.map((p, i) => {
              const isActive = i === active;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setInteracted(true);
                    setActive(i);
                  }}
                  aria-pressed={isActive}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    isActive ? "text-blink-navy" : "text-white/50 hover:text-white/80",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="perception-pill"
                      className="absolute inset-0 rounded-full bg-blink-sky"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative">{p.emoji}</span>
                  <span className="relative">{LABELS[p.id]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Reveal delay={0.05} className="mt-10 flex justify-center">
          <CTAButton label="How would people see me?" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}
