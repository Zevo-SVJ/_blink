/**
 * Blink — social proof as a swipeable deck.
 *
 * A wall of testimonials reads as filler; a deck you flick through reads as
 * people reacting one after another. The interaction is the physical one
 * everyone already knows from card apps — drag, the card follows and tilts,
 * release past a threshold and it flies off while the next rises into place.
 *
 * Implementation notes, all of which are load-bearing:
 *
 *  - **Rotation and fade come from drag `x`**, not from a canned keyframe, so
 *    the tilt is a consequence of the gesture and reverses when you drag back.
 *  - **Cards are keyed by id, never by index**, so advancing unmounts only the
 *    front card. The two behind keep their DOM node and animate from offset 1→0
 *    and 2→1 — the promotion is a real transition, not a re-render.
 *  - **Back cards stay fully opaque.** An `animate` opacity would be overridden
 *    the instant a card became draggable (inline style beats variants), so a
 *    promoted card would snap. Depth comes from scale, y and background.
 *  - **Exit direction travels through `AnimatePresence custom`**, the only way
 *    an exiting child sees a value updated in the same event as the index.
 *  - Drag is x-only, so a swipe never fights page scroll on mobile.
 */

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useCallback, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { TESTIMONIALS } from "@/lib/blink-data";
import { cn } from "@/lib/utils";

/** The strongest, most varied reactions — surprise, self-roast, one sceptic. */
const DECK_IDS = ["1", "22", "17", "2", "30", "3", "21", "13", "20", "5"];

const DECK = DECK_IDS.map((id) => TESTIMONIALS.find((t) => t.id === id)).filter(
  (t): t is (typeof TESTIMONIALS)[number] => Boolean(t),
);

/** Drag distance (plus a little velocity) past which the card commits. */
const SWIPE_THRESHOLD = 80;

/** Front card, plus two behind implying the rest of the deck. */
const VISIBLE = 3;

function formatLikes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export function Testimonials({ onCTA }: { onCTA: () => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = useCallback((dir: number, step: number) => {
    setDirection(dir);
    setIndex((i) => (i + step + DECK.length) % DECK.length);
  }, []);

  /** A swipe either way dismisses; the card leaves the way it was thrown. */
  const swipe = useCallback((dir: number) => go(dir, 1), [go]);

  const visible = Array.from({ length: VISIBLE }, (_, offset) => ({
    card: DECK[(index + offset) % DECK.length],
    offset,
  }));

  return (
    <section id="reactions" className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            Reactions
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            People can&rsquo;t stop comparing scores.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            Swipe through what people said after running their own profile.
          </p>
        </Reveal>

        <Reveal delay={0.05} className="mt-10 sm:mt-12">
          {/* Padding leaves room for the tilt so a dragged card is never clipped. */}
          <div className="mx-auto w-full max-w-[336px] px-2">
            <div className="relative h-[196px] select-none">
              <AnimatePresence initial={false} custom={direction}>
                {visible
                  .slice()
                  .reverse()
                  .map(({ card, offset }) => (
                    <DeckCard
                      key={card.id}
                      card={card}
                      offset={offset}
                      direction={direction}
                      onSwipe={swipe}
                    />
                  ))}
              </AnimatePresence>
            </div>
          </div>

          {/* The same action without a pointer. */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <DeckButton label="Previous reaction" onClick={() => go(-1, -1)}>
              <ChevronLeft className="h-4 w-4" />
            </DeckButton>
            <span className="text-[0.7rem] font-semibold tabular-nums text-white/30">
              {index + 1} / {DECK.length}
            </span>
            <DeckButton label="Next reaction" onClick={() => go(1, 1)}>
              <ChevronRight className="h-4 w-4" />
            </DeckButton>
          </div>
        </Reveal>

        <Reveal delay={0.05} className="mt-12 flex flex-col items-center gap-4">
          <p className="text-center text-sm font-medium text-white/45">
            Find out what your Instagram says about you
          </p>
          <CTAButton label="See my first impression" onClick={onCTA} size="lg" />
        </Reveal>
      </div>
    </section>
  );
}

function DeckButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/60 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] hover:text-white"
    >
      {children}
    </button>
  );
}

function DeckCard({
  card,
  offset,
  direction,
  onSwipe,
}: {
  card: (typeof TESTIMONIALS)[number];
  offset: number;
  direction: number;
  onSwipe: (dir: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);

  // Tilt and fade follow the finger, in both directions.
  const rotate = useTransform(x, [-180, 0, 180], [-11, 0, 11]);
  // Stays solid through a normal drag; only fades once it is clearly leaving.
  const opacity = useTransform(x, [-320, -150, 0, 150, 320], [0, 1, 1, 1, 0]);

  const isFront = offset === 0;
  const draggable = isFront && !reduceMotion;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const power = info.offset.x + info.velocity.x * 0.15;
    if (Math.abs(power) > SWIPE_THRESHOLD) onSwipe(power > 0 ? 1 : -1);
  };

  return (
    <motion.div
      className={cn(
        "absolute inset-0 rounded-3xl p-5 ring-1 transition-colors duration-300",
        isFront
          ? "cursor-grab bg-blink-navy-2 shadow-[0_26px_60px_-26px_rgba(0,0,0,0.95)] ring-white/[0.11] active:cursor-grabbing"
          : "bg-blink-navy shadow-none ring-white/[0.06]",
      )}
      style={draggable ? { x, rotate, opacity } : undefined}
      custom={direction}
      initial={{ scale: 1 - VISIBLE * 0.05, y: VISIBLE * 13, opacity: 0 }}
      animate={{
        scale: 1 - offset * 0.05,
        y: offset * 13,
        opacity: 1,
        zIndex: VISIBLE - offset,
      }}
      variants={{
        // Dynamic variant: the exiting card leaves the way it was thrown.
        exit: (dir: number) => ({
          x: dir * 340,
          rotate: dir * 14,
          opacity: 0,
          transition: { duration: 0.26, ease: "easeIn" },
        }),
      }}
      exit="exit"
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      drag={draggable ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.75}
      onDragEnd={handleDragEnd}
      aria-hidden={!isFront}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{
            background: `linear-gradient(140deg, hsl(${card.hue} 60% 44%), hsl(${card.hue} 70% 28%))`,
          }}
          aria-hidden
        >
          {card.initial}
        </span>
        <span className="min-w-0 truncate text-[0.8rem] font-semibold text-white/55">
          @{card.handle}
        </span>
      </div>

      <p className="mt-4 text-[1.05rem] font-medium leading-snug text-white">{card.text}</p>

      {card.likes !== undefined && (
        <p className="absolute bottom-5 left-5 flex items-center gap-1.5 text-xs font-semibold text-white/35">
          <Heart className="h-3.5 w-3.5 fill-current text-rose-400/70" aria-hidden />
          {formatLikes(card.likes)}
        </p>
      )}

      {draggable && (
        <p className="absolute bottom-5 right-5 text-[0.65rem] font-semibold text-white/20">
          swipe
        </p>
      )}
    </motion.div>
  );
}
