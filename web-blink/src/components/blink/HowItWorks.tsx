/**
 * Blink — "How it works", as one continuous motion sequence.
 *
 * Four beats — upload → profile → analysis → result — played as a single
 * take rather than four separate slides. The avatar carries a shared
 * `layoutId` the whole way through, so Framer Motion tweens the *same element*
 * from the screenshot's profile picture, out into the analysis circle, and
 * finally into the score ring. That continuity is the whole point: it shows
 * the product's actual mechanic instead of illustrating it four times.
 *
 * Paced fast enough to feel effortless, slow enough to read. Honours reduced
 * motion by holding on the result rather than looping.
 */

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { cn } from "@/lib/utils";

const BEATS = [
  { id: "upload", caption: "Upload a screenshot" },
  { id: "profile", caption: "Blink reads the whole profile" },
  { id: "analysis", caption: "It weighs the signals people notice" },
  { id: "result", caption: "You get the first impression you make" },
] as const;

type BeatId = (typeof BEATS)[number]["id"];

const BEAT_MS = 1900;

/** One spring for the whole sequence, so every transition feels related. */
const spring = { type: "spring" as const, stiffness: 240, damping: 28, mass: 0.9 };

const SIGNALS = ["Visual identity", "Aesthetic", "Confidence", "Status"];
const TRAITS = ["Confident", "Mysterious", "Considered"];

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.45 });
  const reduceMotion = useReducedMotion();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!inView) return;
    // Reduced motion: show the finished state, don't cycle.
    if (reduceMotion) {
      setBeat(BEATS.length - 1);
      return;
    }
    const timer = window.setInterval(
      () => setBeat((b) => (b + 1) % BEATS.length),
      BEAT_MS,
    );
    return () => window.clearInterval(timer);
  }, [inView, reduceMotion]);

  // Restart from the top each time the section is re-entered.
  useEffect(() => {
    if (!inView && !reduceMotion) setBeat(0);
  }, [inView, reduceMotion]);

  const current: BeatId = BEATS[beat].id;

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            One screenshot becomes a perception. Here&rsquo;s the whole thing.
          </p>
        </Reveal>

        <div className="relative mx-auto mt-14 w-full max-w-[380px] sm:mt-16">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.02]">
            <Stage beat={current} />
          </div>

          {/* Caption + progress, outside the stage so it never crowds it. */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="h-6 text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={current}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28 }}
                  className="text-sm font-medium text-white/60"
                >
                  {BEATS[beat].caption}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="flex gap-1.5">
              {BEATS.map((b, i) => (
                <motion.span
                  key={b.id}
                  className="h-1 rounded-full bg-white"
                  initial={false}
                  animate={{ width: i === beat ? 18 : 5, opacity: i === beat ? 0.9 : 0.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ))}
            </div>
          </div>
        </div>

        <Reveal delay={0.1} className="mt-12 flex justify-center">
          <CTAButton label="I want to see mine" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The stage — one element tree, four arrangements
// ---------------------------------------------------------------------------

function Stage({ beat }: { beat: BeatId }) {
  const showCard = beat === "upload" || beat === "profile";

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      {/* The profile card. Present for the first two beats, then it hands the
          avatar over to the analysis circle and leaves. */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: beat === "upload" ? 0.94 : 1,
            }}
            exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.4 } }}
            transition={spring}
            className="w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.04]"
          >
            <div className="flex items-center gap-3 p-3.5">
              <AvatarMark size={44} />
              <div className="min-w-0 flex-1">
                <motion.div
                  className="h-2 rounded-full bg-white/25"
                  initial={{ width: "40%" }}
                  animate={{ width: beat === "profile" ? "62%" : "40%" }}
                  transition={spring}
                />
                <motion.div
                  className="mt-1.5 h-1.5 rounded-full bg-white/12"
                  initial={{ width: "60%" }}
                  animate={{ width: beat === "profile" ? "84%" : "60%" }}
                  transition={{ ...spring, delay: 0.05 }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-[3px] px-[3px] pb-[3px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="aspect-square bg-white/[0.07]"
                  initial={{ opacity: 0.25 }}
                  animate={{ opacity: beat === "profile" ? 0.3 + (i % 3) * 0.16 : 0.25 }}
                  transition={{ ...spring, delay: beat === "profile" ? i * 0.025 : 0 }}
                />
              ))}
            </div>

            {/* Scan pass, only while Blink is "reading" the profile. */}
            <AnimatePresence>
              {beat === "profile" && (
                <motion.div
                  className="pointer-events-none absolute inset-x-0 h-16"
                  initial={{ top: "-10%", opacity: 0 }}
                  animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, rgba(175,224,249,0.16), transparent)",
                  }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis: the avatar has travelled to the centre and signals fan out. */}
      {beat === "analysis" && (
        <div className="relative flex items-center justify-center">
          <AvatarMark size={92} />

          {/* Ripples leave the avatar's own edge, so nothing pops into being. */}
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute rounded-full border border-blink-sky/30"
              style={{ width: 92, height: 92 }}
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 0.4, 0], scale: [1, 1.5, 1.95] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: i * 0.9 }}
            />
          ))}

          {SIGNALS.map((label, i) => {
            const angle = (i * 360) / SIGNALS.length - 90;
            const r = 104;
            return (
              <motion.span
                key={label}
                className="absolute whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.7 }}
                animate={{
                  opacity: 1,
                  x: Math.cos((angle * Math.PI) / 180) * r,
                  y: Math.sin((angle * Math.PI) / 180) * r,
                  scale: 1,
                }}
                transition={{ ...spring, delay: 0.12 + i * 0.07 }}
              >
                {label}
              </motion.span>
            );
          })}
        </div>
      )}

      {/* Result: the same mark, now ringed by the score. */}
      {beat === "result" && (
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <AvatarMark size={92} />
            <svg
              className="absolute -rotate-90"
              width={124}
              height={124}
              aria-hidden
            >
              <circle
                cx={62}
                cy={62}
                r={56}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={5}
              />
              <motion.circle
                cx={62}
                cy={62}
                r={56}
                fill="none"
                stroke="hsl(var(--blink-sky))"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 56}
                initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - 0.87) }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.35 }}
            className="mt-6 text-3xl font-extrabold tabular-nums tracking-tight text-white"
          >
            8.7
          </motion.p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {TRAITS.map((trait, i) => (
              <motion.span
                key={trait}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.45 + i * 0.07 }}
                className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white/80"
              >
                {trait}
              </motion.span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The profile picture.
 *
 * One `layoutId` across every beat is what makes this a single sequence —
 * Framer Motion tweens this element between the card, the analysis centre and
 * the score ring instead of cross-fading three separate circles.
 */
function AvatarMark({ size }: { size: number }) {
  return (
    <motion.div
      layoutId="how-it-works-avatar"
      transition={spring}
      className={cn(
        "shrink-0 overflow-hidden rounded-full",
        "bg-[linear-gradient(140deg,hsl(var(--blink-sky))_0%,hsl(var(--blink-sky-bright))_100%)]",
      )}
      style={{ width: size, height: size }}
    />
  );
}
