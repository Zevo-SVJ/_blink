/**
 * Blink — "How it works".
 *
 * One screenshot goes in. Six readings come out. The composition says that
 * literally: the profile scans, collapses to a node at the centre, and the six
 * perspectives fan out around it — then the ring keeps turning through them,
 * one lit at a time, with its reading underneath.
 *
 * ## Spacing
 *
 * The nodes are placed by their **inner edge**, not their centre — a single
 * radius measured to the centre gives wide labels roughly half the breathing
 * room of narrow ones, which is why one of them always ended up pressed
 * against the middle. The maths and its regression test live in
 * `@/lib/perception-fan`.
 *
 * ## Motion rules this file exists to hold
 *
 *  - **Starts on arrival.** The observer reaches nearly half a viewport below
 *    the fold and the intro is 750ms, so the scan is already running when the
 *    section comes into view. No entrance chain, no artificial delay.
 *  - **Never stops.** The cycle runs indefinitely. A section that plays once
 *    and freezes reads as a screenshot of a product rather than a product.
 *  - **No decoration.** No glow, no blurred plate, no floating square. Every
 *    element on screen is the profile, a perspective, or its reading.
 */

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { PERCEPTIONS } from "@/lib/blink-data";
import {
  FAN_CLEARANCE,
  FAN_CORE,
  FAN_SLOTS,
  estimateHalfWidth,
  nodeOffset,
} from "@/lib/perception-fan";
import { cn } from "@/lib/utils";

/** How long the scan runs before the profile collapses to the centre. */
const INTRO_MS = 750;

/** How long each perspective holds lit. Long enough to read the reading. */
const LENS_MS = 2400;

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/**
 * A tint per lens, matching the app's perception card.
 *
 * Same palette, same emoji-behind-the-words composition: a visitor who signs
 * up should recognise the result screen from the landing page.
 */
const LENS_TINT: Record<string, string> = {
  crush: "rgba(244, 114, 182, 0.16)",
  stranger: "rgba(175, 224, 249, 0.14)",
  friends: "rgba(52, 211, 153, 0.13)",
  recruiter: "rgba(251, 191, 36, 0.12)",
  "green-flag": "rgba(52, 211, 153, 0.15)",
  "red-flag": "rgba(248, 113, 113, 0.14)",
};

/** Short chip labels — the full titles are far too long for a six-up ring. */
const SHORT: Record<string, string> = {
  crush: "crush",
  stranger: "stranger",
  friends: "friends",
  recruiter: "recruiter",
  "green-flag": "green flag",
  "red-flag": "red flag",
};

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0, margin: "0px 0px 45% 0px", once: true });
  const reduceMotion = useReducedMotion();

  const [scanning, setScanning] = useState(true);
  const [lens, setLens] = useState(0);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setScanning(false);
      return;
    }
    const timer = window.setTimeout(() => setScanning(false), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion]);

  // The cycle. Runs forever; only a tap on a perspective hands over control.
  useEffect(() => {
    if (scanning || interacted || reduceMotion) return;
    const timer = window.setInterval(
      () => setLens((i) => (i + 1) % PERCEPTIONS.length),
      LENS_MS,
    );
    return () => window.clearInterval(timer);
  }, [scanning, interacted, reduceMotion]);

  const current = PERCEPTIONS[lens];

  return (
    <section id="how-it-works" ref={ref} className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            How it works
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            One screenshot becomes a perception.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            The same profile reads six different ways depending on who is looking.
          </p>
        </Reveal>

        {/* The fan. Fixed height so the reading underneath never shifts. */}
        <div className="relative mx-auto mt-8 h-[300px] w-full max-w-[22rem] sm:mt-12 sm:h-[320px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <CentreNode scanning={scanning} reduceMotion={!!reduceMotion} />

            {PERCEPTIONS.map((p, i) => {
              const label = SHORT[p.id] ?? p.id;
              const { x, y } = nodeOffset(FAN_SLOTS[i], estimateHalfWidth(label));
              const isActive = i === lens && !scanning;
              return (
                <PerspectiveNode
                  key={p.id}
                  emoji={p.emoji}
                  label={label}
                  x={x}
                  y={y}
                  active={isActive}
                  hidden={scanning}
                  delay={i * 0.05}
                  onSelect={() => {
                    setInteracted(true);
                    setScanning(false);
                    setLens(i);
                  }}
                />
              );
            })}

            {/* A line from the core to whichever node is lit, so the reading
                below is unambiguously that node's. */}
            {!scanning && <Spoke angle={FAN_SLOTS[lens]} />}
          </div>
        </div>

        {/* The reading. */}
        <div className="mx-auto mt-2 min-h-[10rem] max-w-md">
          <AnimatePresence mode="popLayout">
            {!scanning && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={spring}
                /* The same treatment the app gives a perception: a tinted
                   surface with the lens emoji sitting large and faint behind
                   the words. Reused rather than reinvented, so the landing and
                   the product visibly belong to each other. */
                className="relative overflow-hidden rounded-3xl p-5 text-left ring-1 ring-white/[0.08]"
                style={{
                  background: `linear-gradient(155deg, ${LENS_TINT[current.id] ?? "rgba(255,255,255,0.05)"} 0%, rgba(255,255,255,0.03) 60%)`,
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 -top-4 select-none text-[5.5rem] leading-none opacity-[0.13]"
                >
                  {current.emoji}
                </span>

                <p className="relative text-[1.15rem] font-extrabold tracking-tight text-white sm:text-[1.3rem]">
                  {current.title}
                </p>
                <div className="relative mt-3 flex flex-wrap gap-1.5">
                  {current.traits.map((trait, i) => (
                    <motion.span
                      key={trait}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.05 + i * 0.04 }}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-bold",
                        i === 0
                          ? "bg-blink-sky text-blink-navy"
                          : "bg-white/[0.1] text-white/85",
                      )}
                    >
                      {trait}
                    </motion.span>
                  ))}
                </div>
                <p className="relative mt-3.5 text-[0.92rem] leading-relaxed text-white/80">
                  &ldquo;{current.quote}&rdquo;
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Reveal delay={0.05} className="mt-8 flex justify-center">
          <CTAButton label="See mine" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The subject: a screenshot that scans, then collapses into the node every
 * perspective points at. It is never replaced — that persistence is the whole
 * argument the section is making.
 */
function CentreNode({
  scanning,
  reduceMotion,
}: {
  scanning: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      className="absolute z-10 overflow-hidden bg-white/[0.06] ring-1 ring-white/10"
      initial={false}
      animate={{
        width: scanning ? 116 : FAN_CORE * 2,
        height: scanning ? 154 : FAN_CORE * 2,
        borderRadius: scanning ? 16 : FAN_CORE,
      }}
      transition={{ duration: 0.55, ease }}
    >
      <AnimatePresence>
        {scanning ? (
          <motion.div
            key="shot"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <div className="flex items-center gap-1.5 p-2">
              <span className="h-4 w-4 shrink-0 rounded-full bg-[linear-gradient(140deg,hsl(var(--blink-sky)),hsl(var(--blink-sky-bright)))]" />
              <span className="flex flex-1 flex-col gap-1">
                <span className="block h-1 w-full rounded-full bg-white/25" />
                <span className="block h-1 w-2/3 rounded-full bg-white/[0.12]" />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-[2px] px-[2px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="aspect-square bg-white/[0.07]" />
              ))}
            </div>

            {!reduceMotion && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 h-9"
                initial={{ top: "-20%" }}
                animate={{ top: "110%" }}
                transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, rgba(175,224,249,0.32), transparent)",
                }}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="core"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            className="absolute inset-0 bg-[linear-gradient(140deg,hsl(var(--blink-sky)),hsl(var(--blink-sky-bright)))]"
          >
            {/* A slow breath, so the subject reads as live rather than as a
                dot someone drew. */}
            {!reduceMotion && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-white"
                animate={{ opacity: [0, 0.14, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** One perspective, parked around the core. */
function PerspectiveNode({
  emoji,
  label,
  x,
  y,
  active,
  hidden,
  delay,
  onSelect,
}: {
  emoji: string;
  label: string;
  x: number;
  y: number;
  active: boolean;
  hidden: boolean;
  delay: number;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "absolute flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[0.68rem] font-bold transition-colors min-[380px]:text-[0.72rem]",
        active
          ? "bg-blink-sky text-blink-navy"
          : "bg-white/[0.05] text-white/50 ring-1 ring-white/[0.08] hover:text-white/80",
      )}
      initial={false}
      animate={{
        x: hidden ? 0 : x,
        y: hidden ? 0 : y,
        opacity: hidden ? 0 : 1,
        scale: hidden ? 0.5 : active ? 1.06 : 1,
      }}
      transition={{ ...spring, delay: hidden ? 0 : delay }}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </motion.button>
  );
}

/**
 * The line from the core's edge to the lit perspective.
 *
 * The rotation lives on a plain wrapper, not on the animated span: Framer
 * composes translate before rotate, so animating both on one element rotates
 * an already-translated box about the wrong point and the spoke swings out of
 * the composition. The wrapper positions, the span animates.
 */
function Spoke({ angle }: { angle: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-px"
      style={{ transform: `rotate(${angle}deg) translateX(${FAN_CORE}px)`, transformOrigin: "left center" }}
    >
      <motion.span
        key={angle}
        className="block h-px origin-left bg-gradient-to-r from-blink-sky/55 to-transparent"
        style={{ width: FAN_CLEARANCE }}
        initial={{ opacity: 0, scaleX: 0.3 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.28, ease }}
      />
    </span>
  );
}
