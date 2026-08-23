/**
 * The motion primitives.
 *
 * `motion.ts` holds the vocabulary — the springs, the stagger, the
 * reduced-motion contract. This holds the small number of components that make
 * the vocabulary hard to misuse, because a rule that lives only in a document
 * is a rule that gets broken on a deadline.
 *
 * Everything here honours `prefers-reduced-motion` by construction. Nothing
 * anywhere else in the product needs to think about it.
 */

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
} from "framer-motion";
import { createContext, useContext, useId, type ReactNode } from "react";

import { SPRING, STAGGER, still, type SpringName } from "./motion";

/** The spring for a name, already reduced-motion aware. */
export function useSpring(name: SpringName = "base"): Transition {
  const reduced = useReducedMotion();
  return reduced ? still : SPRING[name];
}

/* ─────────────────────────────────────────────────────────────────────
   Shared element transitions
   ───────────────────────────────────────────────────────────────────── */

const ScopeContext = createContext<string | null>(null);

/**
 * A scope inside which elements can travel between positions in the tree.
 *
 * Framer matches `layoutId`s globally, which means two unrelated parts of the
 * app that happen to use the same id will animate into each other — a card in
 * Library flying across the screen into a chip in Ranks. Scoping the ids to
 * the provider makes that impossible, and makes it safe for a component to use
 * a plain, readable id like "score" instead of a hand-namespaced one.
 */
export function SharedScope({ id, children }: { id?: string; children: ReactNode }) {
  const generated = useId();
  const scope = id ?? generated;
  return (
    <ScopeContext.Provider value={scope}>
      <LayoutGroup id={scope}>{children}</LayoutGroup>
    </ScopeContext.Provider>
  );
}

/**
 * An element that travels rather than being replaced.
 *
 * Give the same `name` to the version of a thing in two different places and
 * the browser animates the one into the other — position, size and corner
 * radius — instead of one disappearing and another appearing somewhere else.
 * This is the mechanism behind "the selected profile becomes the next page".
 *
 * Only ever one live element per name at a time, which is what makes it a
 * *move* rather than a copy.
 */
export function Shared({
  name,
  spring = "morph",
  children,
  ...rest
}: { name: string; spring?: SpringName } & HTMLMotionProps<"div">) {
  const scope = useContext(ScopeContext);
  const transition = useSpring(spring);
  return (
    <motion.div
      layoutId={scope ? `${scope}:${name}` : name}
      transition={transition}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Swapping content in place
   ───────────────────────────────────────────────────────────────────── */

/**
 * One value replacing another, in the same place.
 *
 * The default way to do this is a cross-fade, and a cross-fade says nothing:
 * two states dissolving into each other look the same whether the new value is
 * related to the old one, replaces it, or has nothing to do with it. This
 * moves instead — the outgoing value leaves in the direction of travel and the
 * incoming one arrives from the opposite side, so the movement itself says
 * "this was replaced, and here is which way the sequence is going".
 *
 * `mode="popLayout"` lets the box keep its size while they cross, so a word
 * changing length does not shove the layout around it.
 */
export function Swap({
  value,
  direction = "up",
  distance = 14,
  spring = "base",
  className,
  children,
}: {
  /** Changing this is what triggers the swap. */
  value: string | number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  spring?: SpringName;
  className?: string;
  children: ReactNode;
}) {
  const transition = useSpring(spring);
  const reduced = useReducedMotion();

  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const sign = direction === "up" || direction === "left" ? 1 : -1;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        className={className}
        initial={reduced ? false : { [axis]: sign * distance, opacity: 0 }}
        animate={{ [axis]: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { [axis]: -sign * distance, opacity: 0 }}
        transition={transition}
        style={{ display: "inline-block" }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Arrival
   ───────────────────────────────────────────────────────────────────── */

/**
 * A group whose children arrive in order.
 *
 * The stagger is the point: it says these belong together and this is the
 * order to read them in. Children should be `<Rise>`.
 */
export function Stagger({
  children,
  className,
  gap = STAGGER,
  once = true,
  amount = 0.35,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  /** Animate the first time it is seen only. */
  once?: boolean;
  /** How much of the group must be on screen before it starts. */
  amount?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? undefined : "out"}
      whileInView="in"
      viewport={{ once, amount }}
      variants={{ in: { transition: { staggerChildren: reduced ? 0 : gap } } }}
    >
      {children}
    </motion.div>
  );
}

/**
 * One item arriving.
 *
 * Rises and settles. Opacity is along for the ride rather than doing the work
 * — the movement is what the eye reads, and an element that only fades in has
 * not told anyone where it came from.
 */
export function Rise({
  children,
  className,
  distance = 12,
  spring = "base",
  ...rest
}: { distance?: number; spring?: SpringName } & HTMLMotionProps<"div">) {
  const transition = useSpring(spring);
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        out: reduced ? { opacity: 1 } : { opacity: 0, y: distance },
        in: { opacity: 1, y: 0, transition },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Press
   ───────────────────────────────────────────────────────────────────── */

/**
 * Feedback under the finger.
 *
 * Every interactive surface in the product responds to being pressed, and it
 * responds the same way. Scale rather than colour, because scale is felt on a
 * touchscreen where a hover state does not exist and a colour change is hidden
 * under the thumb.
 */
export const press = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.015 },
} as const;
