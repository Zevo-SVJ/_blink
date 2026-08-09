/**
 * Blink — the swipe deck.
 *
 * One interaction, used by the landing testimonials and by the climb actions
 * inside the app. Extracted because the second use would otherwise have
 * re-implemented the physics and drifted: the whole point of a signature
 * interaction is that it feels identical everywhere.
 *
 * Load-bearing details, all learned the hard way:
 *
 *  - **Rotation and fade derive from drag `x`**, so the tilt is a consequence
 *    of the gesture and reverses when you drag back.
 *  - **Cards are keyed by id, never by index.** Advancing then unmounts only
 *    the front card; the ones behind keep their DOM node and animate from
 *    offset 1→0 and 2→1, so promotion is a real transition, not a remount.
 *  - **Back cards stay fully opaque.** An `animate` opacity would be
 *    overridden the moment a card became draggable (inline style beats
 *    variants), so a promoted card would snap. Depth comes from scale and y.
 *  - **Exit direction travels through `AnimatePresence custom`** — the only
 *    way an exiting child sees a value set in the same event as the index.
 *  - Drag is x-only, so a swipe never fights page scroll on a phone.
 *  - **The stage measures itself.** Cards are absolutely positioned, so the
 *    stage needs an explicit height — and a hand-picked one silently clips the
 *    longest card at the narrowest width, which is exactly how a deck ends up
 *    swallowing the sentence that made the card worth reading. A hidden
 *    measurer renders every card at the real width and the stage takes the
 *    tallest, re-measuring on resize.
 *
 * Callers own the card's inside. The deck owns position, physics and the
 * pointer-free fallbacks.
 */

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/** Drag distance (plus a little velocity) past which a card commits. */
const SWIPE_THRESHOLD = 80;

/** Front card, plus two behind implying the rest of the deck. */
const VISIBLE = 3;

export interface SwipeDeckItem {
  id: string;
}

export interface SwipeDeckHandle {
  /** 0-based position of the front card. */
  index: number;
  /** Total cards. */
  total: number;
  /** Advance forward (1) or back (-1). */
  go: (step: number) => void;
}

export function SwipeDeck<T extends SwipeDeckItem>({
  items,
  height,
  className,
  cardClassName,
  renderCard,
  onIndexChange,
  /** Rendered under the deck. Receives the live index so callers can show progress. */
  footer,
}: {
  items: T[];
  /** Floor for the stage height. The measured content wins when it is taller. */
  height: number;
  className?: string;
  cardClassName?: string;
  renderCard: (item: T, isFront: boolean) => ReactNode;
  onIndexChange?: (index: number) => void;
  footer?: (handle: SwipeDeckHandle) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const measureRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);

  // Measure after layout and on every resize: the tallest card at the current
  // width decides the stage, so nothing is ever cut off.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const measure = () => {
      const tallest = Array.from(el.children).reduce(
        (max, child) => Math.max(max, (child as HTMLElement).offsetHeight),
        0,
      );
      setMeasured(tallest);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  const go = useCallback(
    (step: number) => {
      if (items.length === 0) return;
      setDirection(step >= 0 ? 1 : -1);
      setIndex((i) => (i + step + items.length) % items.length);
    },
    [items.length],
  );

  /** A swipe either way dismisses; the card leaves the way it was thrown. */
  const swipe = useCallback(
    (dir: number) => {
      setDirection(dir);
      setIndex((i) => (i + 1) % items.length);
    },
    [items.length],
  );

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  if (items.length === 0) return null;

  const count = Math.min(VISIBLE, items.length);
  const visible = Array.from({ length: count }, (_, offset) => ({
    item: items[(index + offset) % items.length],
    offset,
  }));

  return (
    <div className={className}>
      {/* Horizontal padding leaves room for the tilt so a dragged card is
          never clipped by an ancestor's overflow. */}
      <div className="relative px-2">
        {/* Hidden measurer: real cards, real width, no paint. */}
        <div
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-2 top-0"
        >
          {items.map((item) => (
            <div key={item.id} className={cn("rounded-3xl", cardClassName)}>
              {renderCard(item, false)}
            </div>
          ))}
        </div>

        <div
          className="relative select-none"
          style={{ height: Math.max(height, measured) }}
        >
          <AnimatePresence initial={false} custom={direction}>
            {visible
              .slice()
              .reverse()
              .map(({ item, offset }) => (
                <DeckCard
                  key={item.id}
                  offset={offset}
                  direction={direction}
                  onSwipe={swipe}
                  className={cardClassName}
                >
                  {renderCard(item, offset === 0)}
                </DeckCard>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {footer?.({ index, total: items.length, go })}
    </div>
  );
}

function DeckCard({
  offset,
  direction,
  onSwipe,
  className,
  children,
}: {
  offset: number;
  direction: number;
  onSwipe: (dir: number) => void;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);

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
        "absolute inset-0 overflow-hidden rounded-3xl ring-1 transition-colors duration-300",
        isFront
          ? "cursor-grab bg-blink-navy-2 shadow-[0_26px_60px_-26px_rgba(0,0,0,0.95)] ring-white/[0.11] active:cursor-grabbing"
          : "bg-blink-navy shadow-none ring-white/[0.06]",
        className,
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
      {children}
    </motion.div>
  );
}

/**
 * The "you can swipe this" hint.
 *
 * Shows once, fades itself out, and never comes back within the session — a
 * permanent affordance would just be arrows by another name. Callers that
 * already make the gesture obvious can skip it.
 */
export function SwipeHint({ shown }: { shown: boolean }) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(shown);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [shown]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none mt-3 flex items-center justify-center gap-2 text-[0.68rem] font-semibold text-white/30"
        >
          <motion.span
            aria-hidden
            animate={reduceMotion ? {} : { x: [0, 7, 0, -7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            ⇠⇢
          </motion.span>
          Swipe to see the next one
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/**
 * Track how far through a deck the user is.
 *
 * A row of segments rather than numbers: it reads as "there is more here"
 * without asking to be counted.
 */
export function DeckProgress({ index, total }: { index: number; total: number }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className="h-1 rounded-full bg-white/20"
          animate={{
            width: i === index ? 18 : 6,
            backgroundColor:
              i === index ? "hsl(var(--blink-sky))" : "rgba(255,255,255,0.16)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      ))}
    </div>
  );
}

/** Screen-reader announcement of deck position, since the visual is a gesture. */
export function DeckStatus({ index, total }: { index: number; total: number }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      Card {index + 1} of {total}
    </p>
  );
}
