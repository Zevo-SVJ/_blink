/**
 * Blink — "How it works".
 *
 * A single continuous take with cause and effect, not a slideshow and not an
 * animation sitting inside a bordered box. The screenshot itself is the
 * surface: it floats on the page with its own depth, gets scanned, and the
 * scan *causes* markers to land on the parts being read. Those markers then
 * become the signal chips, and the avatar becomes the score ring.
 *
 * Every element persists across phases and transforms. Nothing cross-fades
 * into a replacement, which is what made the previous version read as slides.
 *
 * Phases overlap deliberately: `phase` is an index, but each element decides
 * its own state from it, so the screenshot is already receding while the
 * signals are still arriving.
 */

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";

const PHASES = [
  { id: "enter", caption: "Upload a screenshot", ms: 1250 },
  { id: "scan", caption: "Blink reads the whole profile", ms: 1700 },
  { id: "identify", caption: "It marks what people notice first", ms: 1600 },
  { id: "signals", caption: "Those become perception signals", ms: 1700 },
  { id: "result", caption: "And that's your first impression", ms: 2100 },
] as const;

type Phase = (typeof PHASES)[number]["id"];

/**
 * What the scan marks, in card-local pixels.
 *
 * These are *regions*, not points: the previous version dropped a dotted pin in
 * the middle of each area, which collided with the avatar and told you nothing
 * about how much of the profile was being read. A framed region plus a short
 * label on the nearest free side reads as annotation, and needs no dot.
 */
const MARKERS = [
  { id: "avatar", label: "Photo", left: 8, top: 6, w: 44, h: 44, side: "left" },
  { id: "bio", label: "Bio", left: 46, top: 9, w: 114, h: 26, side: "right" },
  { id: "grid", label: "Grid", left: 3, top: 44, w: 162, h: 152, side: "right" },
] as const;

const SIGNALS = ["Visual identity", "Aesthetic", "Confidence", "Mystery"];
const TRAITS = ["Confident", "Considered"];

const CARD_W = 168;
const CARD_H = 232;

const ease = [0.22, 1, 0.36, 1] as const;

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Starts well before the section is fully on screen.
  const inView = useInView(ref, { amount: 0.1, margin: "0px 0px 250px 0px" });
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setIndex(PHASES.length - 1);
      return;
    }
    const timer = window.setTimeout(
      () => setIndex((i) => (i + 1) % PHASES.length),
      PHASES[index].ms,
    );
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, index]);

  const phase: Phase = PHASES[index].id;
  const at = (p: Phase) => PHASES.findIndex((x) => x.id === p);
  const past = (p: Phase) => index >= at(p);

  // The screenshot recedes once its job is done; the result takes over.
  const collapsing = past("signals");
  const showResult = past("result");

  return (
    <section id="how-it-works" ref={ref} className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            Step one
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            One screenshot becomes a perception. Here&rsquo;s the whole thing.
          </p>
        </Reveal>

        {/* No frame. The elements float on the page and carry their own depth. */}
        <div className="relative mx-auto mt-10 h-[330px] w-full max-w-[340px] sm:mt-14 sm:h-[360px]">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Glow that tracks the action, giving the composition a centre. */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute rounded-full bg-blink-sky/[0.09] blur-3xl"
              animate={{
                width: collapsing ? 210 : 150,
                height: collapsing ? 210 : 150,
                opacity: phase === "enter" ? 0.5 : 1,
              }}
              transition={{ duration: 0.7, ease }}
            />

            {/* The screenshot. One element for the whole sequence. */}
            <motion.div
              className="absolute overflow-hidden rounded-2xl bg-white/[0.06] shadow-[0_30px_66px_-30px_rgba(0,0,0,1)] ring-1 ring-white/10"
              style={{ width: CARD_W, height: CARD_H }}
              initial={false}
              animate={
                collapsing
                  ? { opacity: 0, scale: 0.82, y: -6, filter: "blur(6px)" }
                  : {
                      opacity: 1,
                      scale: phase === "enter" ? 0.94 : 1,
                      y: 0,
                      filter: "blur(0px)",
                    }
              }
              transition={{ duration: 0.62, ease }}
            >
              <ProfileContent phase={phase} />
              <ScanBeam active={phase === "scan" || phase === "identify"} />
            </motion.div>

            {/* Markers land on the parts being read — the scan's consequence.
                Positioned in the card's own coordinate space. */}
            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{ width: CARD_W, height: CARD_H }}
            >
              {MARKERS.map((m, i) => (
                <Marker
                  key={m.id}
                  marker={m}
                  visible={past("identify") && !collapsing}
                  delay={i * 0.13}
                />
              ))}
            </div>

            {/* The avatar persists: card → centre → inside the score ring. */}
            <motion.div
              className="absolute rounded-full bg-[linear-gradient(140deg,hsl(var(--blink-sky)),hsl(var(--blink-sky-bright)))]"
              initial={false}
              animate={{
                width: collapsing ? 74 : 34,
                height: collapsing ? 74 : 34,
                x: collapsing ? 0 : -CARD_W / 2 + 30,
                y: collapsing ? 0 : -CARD_H / 2 + 28,
              }}
              transition={{ duration: 0.62, ease }}
            />

            <SignalRing active={past("signals")} settled={showResult} />
            <ScoreRingReveal active={showResult} />
          </div>
        </div>

        <div className="mt-5 h-6 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="text-sm font-medium text-white/60"
            >
              {PHASES[index].caption}
            </motion.p>
          </AnimatePresence>
        </div>

        <Reveal delay={0.05} className="mt-9 flex justify-center">
          <CTAButton label="I want to see mine" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}

/** The profile inside the card. Detail sharpens as Blink reads it. */
function ProfileContent({ phase }: { phase: Phase }) {
  const read = phase !== "enter";

  return (
    <>
      <div className="flex items-center gap-2 p-3 pl-[46px]">
        <span className="flex flex-1 flex-col gap-1.5">
          <motion.span
            className="block h-1.5 rounded-full bg-white/25"
            initial={false}
            animate={{ width: read ? "70%" : "45%" }}
            transition={{ duration: 0.5, ease }}
          />
          <motion.span
            className="block h-1 rounded-full bg-white/12"
            initial={false}
            animate={{ width: read ? "90%" : "60%" }}
            transition={{ duration: 0.5, ease, delay: 0.05 }}
          />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-[3px] px-[3px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.span
            key={i}
            className="aspect-square bg-white/[0.08]"
            initial={false}
            animate={{ opacity: read ? 0.35 + (i % 3) * 0.2 : 0.2 }}
            transition={{ duration: 0.4, ease, delay: read ? i * 0.025 : 0 }}
          />
        ))}
      </div>
    </>
  );
}

/** The scan itself — a single pass that repeats while reading. */
function ScanBeam({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-16"
          initial={{ top: "-20%", opacity: 0 }}
          animate={{ top: "105%", opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(175,224,249,0.3), transparent)",
          }}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * A framed region of the profile, with its name on the nearest free side.
 *
 * The frame animates in from slightly oversized, so it reads as something
 * closing onto the region rather than a label appearing next to it.
 */
function Marker({
  marker,
  visible,
  delay,
}: {
  marker: (typeof MARKERS)[number];
  visible: boolean;
  delay: number;
}) {
  const onLeft = marker.side === "left";
  const spring = { type: "spring" as const, stiffness: 380, damping: 28, delay };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.span
            className="absolute rounded-[9px] ring-[1.5px] ring-blink-sky/70"
            style={{
              left: marker.left,
              top: marker.top,
              width: marker.w,
              height: marker.h,
              boxShadow: "0 0 16px -6px hsl(var(--blink-sky) / 0.5) inset",
            }}
            initial={{ opacity: 0, scale: 1.35 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2, transition: { duration: 0.2 } }}
            transition={spring}
          />

          {/* A hairline leader instead of a dot. */}
          <motion.span
            className="absolute h-px bg-blink-sky/45"
            style={{
              top: marker.top + marker.h / 2,
              [onLeft ? "right" : "left"]: onLeft
                ? CARD_W - marker.left
                : marker.left + marker.w,
              width: 9,
            }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ ...spring, delay: delay + 0.08 }}
          />

          <motion.span
            className="absolute -translate-y-1/2 whitespace-nowrap rounded-full bg-blink-navy px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.06em] text-blink-sky ring-1 ring-blink-sky/30"
            style={{
              top: marker.top + marker.h / 2,
              [onLeft ? "right" : "left"]: onLeft
                ? CARD_W - marker.left + 11
                : marker.left + marker.w + 11,
            }}
            initial={{ opacity: 0, x: onLeft ? 8 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ ...spring, delay: delay + 0.1 }}
          >
            {marker.label}
          </motion.span>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Signals fan out from the centre, then collapse back into it as the score
 * resolves — which is the actual claim: these readings *become* your result.
 *
 * **Why this is not polar coordinates.** The previous version placed all four
 * chips on one radius, measured to each chip's *centre*. A chip is far wider
 * than it is tall, so the two side chips ended up with roughly half the
 * breathing room of the top and bottom ones — "Aesthetic" in particular sat
 * almost against the ring. Each chip is now anchored by its *inner edge* at a
 * constant clearance, so the gap around the centre is even in all four
 * directions no matter how long a label is.
 *
 * The widest labels take the top and bottom slots, where horizontal space is
 * free; the sides get the short ones, which is what keeps the whole thing
 * inside 320px.
 *
 * They must not linger once the score is up. Held around the ring they
 * overlapped the trait chips below it at every mobile width.
 */

/** Gap between the centre object's edge and the nearest edge of any chip. */
const SIGNAL_CLEARANCE = 68;

type Place = "top" | "right" | "bottom" | "left";

const SIGNAL_PLACES: Array<{ label: string; place: Place }> = [
  { label: SIGNALS[0], place: "top" },
  { label: SIGNALS[1], place: "right" },
  { label: SIGNALS[2], place: "bottom" },
  { label: SIGNALS[3], place: "left" },
];

/** Anchor a chip by the edge that faces the centre. */
function placeStyle(place: Place): React.CSSProperties {
  const c = SIGNAL_CLEARANCE;
  switch (place) {
    case "top":
      return { bottom: c, left: 0, transform: "translateX(-50%)" };
    case "bottom":
      return { top: c, left: 0, transform: "translateX(-50%)" };
    case "right":
      return { left: c, top: 0, transform: "translateY(-50%)" };
    case "left":
      return { right: c, top: 0, transform: "translateY(-50%)" };
  }
}

/** Entry offset, so each chip still reads as fanning out of the centre. */
function fanFrom(place: Place): { x: number; y: number } {
  switch (place) {
    case "top":
      return { x: 0, y: 34 };
    case "bottom":
      return { x: 0, y: -34 };
    case "right":
      return { x: -34, y: 0 };
    case "left":
      return { x: 34, y: 0 };
  }
}

function SignalRing({ active, settled }: { active: boolean; settled: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        /* A zero-size box parked at the exact centre by the flex parent, so
           every offset below is measured from the middle of the composition. */
        <div className="pointer-events-none absolute h-0 w-0" aria-hidden={false}>
          {SIGNAL_PLACES.map(({ label, place }, i) => {
            const from = fanFrom(place);
            return (
              <span key={label} className="absolute" style={placeStyle(place)}>
                <motion.span
                  className="block whitespace-nowrap rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-white/75 ring-1 ring-white/10 backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.6, ...from }}
                  animate={
                    settled
                      ? { opacity: 0, scale: 0.4, ...from }
                      : { opacity: 1, scale: 1, x: 0, y: 0 }
                  }
                  exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2 } }}
                  transition={
                    settled
                      ? { duration: 0.45, ease, delay: i * 0.05 }
                      : { type: "spring", stiffness: 260, damping: 26, delay: i * 0.07 }
                  }
                >
                  {label}
                </motion.span>
              </span>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

/** The score ring closing around the avatar, plus the read-out. */
function ScoreRingReveal({ active }: { active: boolean }) {
  const R = 52;
  const c = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <svg
            className="absolute -rotate-90"
            width={(R + 5) * 2}
            height={(R + 5) * 2}
            style={{ left: -(R + 5), top: -(R + 5) }}
            aria-hidden
          >
            <circle cx={R + 5} cy={R + 5} r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={4} />
            <motion.circle
              cx={R + 5}
              cy={R + 5}
              r={R}
              fill="none"
              stroke="hsl(var(--blink-sky))"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: c * 0.13 }}
              transition={{ duration: 0.8, ease }}
            />
          </svg>

          <div className="absolute flex w-max flex-col items-center" style={{ top: R + 16 }}>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease, delay: 0.25 }}
              className="text-2xl font-extrabold tabular-nums text-white"
            >
              8.7
            </motion.p>
            <div className="mt-2 flex gap-1.5">
              {TRAITS.map((t, i) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease, delay: 0.35 + i * 0.07 }}
                  className="rounded-full bg-blink-sky px-2.5 py-1 text-[10px] font-bold text-blink-navy"
                >
                  {t}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
