/**
 * Blink — "How it works", as one continuous motion sequence.
 *
 * Four beats — upload → profile → analysis → result — played as a single take.
 *
 * The avatar is ONE element that never unmounts and never changes parent. An
 * earlier version shared a `layoutId` between a card that was exiting and a
 * centred copy that was entering; both existed for a frame, Framer resolved the
 * shared layout against the wrong node, and the circle visibly flew right and
 * snapped back (measured: a 114px jump in a single frame).
 *
 * So: the avatar lives at the top of the stage, permanently centred on the X
 * axis, and only its `y` and size are animated. Everything else fades around
 * it. There is no horizontal travel to get wrong, and no second element that
 * could win a layout race.
 *
 * Geometry is in fixed pixels against a fixed-height stage, so the avatar's
 * resting position inside the card is exact rather than measured at runtime.
 */

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";

const BEATS = [
  { id: "upload", caption: "Upload a screenshot" },
  { id: "profile", caption: "Blink reads the whole profile" },
  { id: "analysis", caption: "It weighs the signals people notice" },
  { id: "result", caption: "You get the first impression you make" },
] as const;

type BeatId = (typeof BEATS)[number]["id"];

const BEAT_MS = 1900;

/** Fixed stage geometry — the avatar's positions are derived from these. */
const STAGE_H = 420;
const CARD_H = 250;
const CARD_W = 216;
/** Distance from the card's top edge to the avatar's centre. */
const CARD_AVATAR_INSET = 48;

/** Avatar resting offsets from the stage centre, per beat. */
const CARD_Y = -(CARD_H / 2) + CARD_AVATAR_INSET;
const CENTRE_Y = -12;

const AVATAR_SMALL = 54;
const AVATAR_LARGE = 92;

const spring = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.9 };

const SIGNALS = ["Visual identity", "Aesthetic", "Confidence", "Status"];
const TRAITS = ["Confident", "Mysterious", "Considered"];

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.45 });
  const reduceMotion = useReducedMotion();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setBeat(BEATS.length - 1);
      return;
    }
    const timer = window.setInterval(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS);
    return () => window.clearInterval(timer);
  }, [inView, reduceMotion]);

  useEffect(() => {
    if (!inView && !reduceMotion) setBeat(0);
  }, [inView, reduceMotion]);

  const current: BeatId = BEATS[beat].id;
  const onCard = current === "upload" || current === "profile";

  return (
    <section id="how-it-works" ref={sectionRef} className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            One screenshot becomes a perception. Here&rsquo;s the whole thing.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 w-full max-w-[380px] sm:mt-16">
          <div
            className="relative w-full overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.02]"
            style={{ height: STAGE_H }}
          >
            {/* Everything is positioned from this centre point. */}
            <div className="absolute inset-0 flex items-center justify-center">
              <ProfileCard beat={current} />
              <AnalysisSignals active={current === "analysis"} />
              <ResultRing active={current === "result"} />

              {/* The single avatar. Centred on X for every beat, so the only
                  thing that can animate is its height and size. */}
              <motion.div
                data-avatar
                className="absolute rounded-full bg-[linear-gradient(140deg,hsl(var(--blink-sky))_0%,hsl(var(--blink-sky-bright))_100%)]"
                initial={false}
                animate={{
                  y: onCard ? CARD_Y : CENTRE_Y,
                  width: onCard ? AVATAR_SMALL : AVATAR_LARGE,
                  height: onCard ? AVATAR_SMALL : AVATAR_LARGE,
                }}
                transition={spring}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="h-6 text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={current}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.26 }}
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

/** The screenshot being uploaded, then read. Leaves room for the avatar. */
function ProfileCard({ beat }: { beat: BeatId }) {
  const visible = beat === "upload" || beat === "profile";
  const reading = beat === "profile";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 26, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: beat === "upload" ? 0.97 : 1 }}
          exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.35 } }}
          transition={spring}
          className="absolute overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.04]"
          style={{ width: CARD_W, height: CARD_H }}
        >
          {/* Name lines sit under the avatar's resting slot. */}
          <div
            className="flex flex-col items-center gap-1.5"
            style={{ paddingTop: CARD_AVATAR_INSET + AVATAR_SMALL / 2 + 12 }}
          >
            <motion.div
              className="h-2 rounded-full bg-white/25"
              initial={false}
              animate={{ width: reading ? 76 : 52 }}
              transition={spring}
            />
            <motion.div
              className="h-1.5 rounded-full bg-white/12"
              initial={false}
              animate={{ width: reading ? 104 : 70 }}
              transition={{ ...spring, delay: 0.04 }}
            />
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-[3px] px-[3px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className="aspect-square bg-white/[0.07]"
                initial={false}
                animate={{ opacity: reading ? 0.32 + (i % 3) * 0.18 : 0.22 }}
                transition={{ ...spring, delay: reading ? i * 0.03 : 0 }}
              />
            ))}
          </div>

          <AnimatePresence>
            {reading && (
              <motion.div
                className="pointer-events-none absolute inset-x-0 h-16"
                initial={{ top: "-12%", opacity: 0 }}
                animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, rgba(175,224,249,0.18), transparent)",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Ripples and orbiting signal labels around the centred avatar. */
function AnalysisSignals({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="signals"
          className="absolute"
          style={{ y: CENTRE_Y }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute rounded-full border border-blink-sky/30"
              style={{
                width: AVATAR_LARGE,
                height: AVATAR_LARGE,
                left: -AVATAR_LARGE / 2,
                top: -AVATAR_LARGE / 2,
              }}
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 0.4, 0], scale: [1, 1.5, 1.95] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: i * 0.9 }}
            />
          ))}

          {SIGNALS.map((label, i) => {
            const angle = (i * 360) / SIGNALS.length - 90;
            const r = 108;
            return (
              <motion.span
                key={label}
                className="absolute whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm"
                style={{ translateX: "-50%", translateY: "-50%" }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.7 }}
                animate={{
                  opacity: 1,
                  x: Math.cos((angle * Math.PI) / 180) * r,
                  y: Math.sin((angle * Math.PI) / 180) * r,
                  scale: 1,
                }}
                transition={{ ...spring, delay: 0.1 + i * 0.06 }}
              >
                {label}
              </motion.span>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The score ring closing around the avatar, plus the read-out. */
function ResultRing({ active }: { active: boolean }) {
  const R = 60;
  const circumference = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="result"
          className="absolute flex flex-col items-center"
          style={{ y: CENTRE_Y }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <svg
            className="absolute -rotate-90"
            width={(R + 4) * 2}
            height={(R + 4) * 2}
            style={{ left: -(R + 4), top: -(R + 4) }}
            aria-hidden
          >
            <circle
              cx={R + 4}
              cy={R + 4}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={5}
            />
            <motion.circle
              cx={R + 4}
              cy={R + 4}
              r={R}
              fill="none"
              stroke="hsl(var(--blink-sky))"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - 0.87) }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          <div className="absolute flex flex-col items-center" style={{ top: R + 22 }}>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.3 }}
              className="text-3xl font-extrabold tabular-nums tracking-tight text-white"
            >
              8.7
            </motion.p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {TRAITS.map((trait, i) => (
                <motion.span
                  key={trait}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.4 + i * 0.06 }}
                  className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white/80"
                >
                  {trait}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
