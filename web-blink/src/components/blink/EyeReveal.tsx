/**
 * Blink — the eye that opens as you scroll.
 *
 * ## The idea
 *
 * The product's promise is "See yourself the way others see you." This is that
 * sentence as a gesture rather than a caption: the page begins with an eye
 * closed, and the act of scrolling — the reader's own movement down the page —
 * is what opens it. Nothing explains the metaphor, because being told a
 * metaphor is the opposite of noticing one.
 *
 * ## Why the geometry is one path
 *
 * The lids, the aperture and the mask that reveals the iris are all the *same*
 * path, `lids(p)`. That is the whole trick, and it is what makes every
 * intermediate state coherent:
 *
 *  - stroked, it is the eye's outline;
 *  - filled, it is the lens;
 *  - as a clip, it is what the iris can be seen through.
 *
 * So the iris cannot fade in, drift out of the lids, or be visible where the
 * eye is shut — it is revealed strictly by the aperture opening, because there
 * is no second source of truth to disagree with.
 *
 * At `p = 0` the two curves are identical and traversed in opposite
 * directions: zero enclosed area, so the clip is empty and the iris is
 * genuinely absent rather than hidden behind something. What remains visible
 * is the stroke — a single, slightly relaxed arc, which is what a closed eye
 * looks like as a glyph. At `p = 1` the same path is an almond.
 *
 * The upper lid travels further than the lower one (`RISE` vs `DROP`), because
 * a symmetric aperture reads as a lens or a fish, not as an eye.
 *
 * ## Why a pinned stage
 *
 * The section reserves a fixed height in `svh` and pins a viewport-tall stage
 * inside it. Fixed because the document's height must not change while
 * scrolling — that was a real bug in How It Works and it is not being
 * reintroduced. `svh` rather than `vh` because the small-viewport unit ignores
 * the mobile URL bar, so the reserved space cannot change when the browser
 * chrome retracts mid-scroll.
 */

import {
  cubicBezier,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef } from "react";

/* The drawing box. Everything below is in these units, so the whole eye scales
   with one `width` on the <svg> and nothing needs measuring at runtime. */
const W = 400;
const H = 260;
const CX = W / 2;
const CY = H / 2;

/**
 * Horizontal extent of the lid line.
 *
 * Close to the edges of the box on purpose. The eye used to sit inside a 17%
 * internal margin *and* the container's padding, so it was being inset twice
 * and rendered about 71% of a phone's width — contained, but not the
 * deliberately oversized thing it is meant to be. The only reserve kept here
 * is enough for the lid's round cap not to touch the edge.
 */
const X0 = 14;
const X1 = W - X0;

/** Where the lids' control points sit. Governs how pointed the corners are. */
const C0 = 96;
const C1 = W - C0;

/** How far each lid's control points travel at full open. */
const RISE = 120;
const DROP = 92;

/**
 * How much of the opening passes before the lower lid begins to move.
 *
 * Eyes do not open symmetrically: the upper lid does nearly all of the early
 * work while the lower one barely stirs. Opening both at once read as a shape
 * splitting in half — two mirrored strokes drifting apart — rather than as a
 * lid lifting.
 */
const LOWER_DELAY = 0.22;

/** The iris at full open. */
const IRIS = 58;
/** The pupil, as a fraction of the iris. */
const PUPIL_RATIO = 24 / 58;
/** How much of the aperture's remaining half-height the iris may occupy. */
const IRIS_FIT = 0.84;

/**
 * Clearance the iris keeps from both lids.
 *
 * Also, usefully, what keeps it from existing at all until the eye is open
 * enough to hold one. Without it the iris was drawn at a two-unit radius
 * inside a sliver — which renders as a speck with a darker speck punched out
 * of it, and reads as dirt on the screen rather than as an eye beginning to
 * open. Sub-pixel detail is noise; the iris arrives when there is room for it.
 */
const IRIS_CLEARANCE = 10;

/**
 * The closed lid is not flat.
 *
 * A dead-straight line reads as a divider rule someone forgot to remove. A
 * shallow downward bow reads as a closed eye. It relaxes to zero as the eye
 * opens, so it costs nothing at the other end.
 */
const REST_BOW = 16;

/*
  Squared, so the bow is gone almost as soon as the eye starts to move. Decayed
  linearly it was still a third of its full depth at a third open, where the
  aperture is only a few units tall — large enough to drag the whole opening
  below the line it started on.
*/
const bowAt = (p: number) => REST_BOW * (1 - p) ** 2;
const lowerAt = (p: number) => Math.max(0, (p - LOWER_DELAY) / (1 - LOWER_DELAY));

/*
  A cubic with both control points at the same height reaches three quarters of
  their offset at its midpoint. That single fact is what lets the aperture's
  true extents be known in closed form — and therefore what lets the iris be
  fitted to them exactly, rather than sized by trial until it stopped colliding
  with a lid.
*/
const MID = 0.75;

/** The aperture's top and bottom edges at the centre of the eye. */
function span(p: number): { top: number; bottom: number } {
  const bow = MID * bowAt(p);
  return {
    top: CY - MID * RISE * p + bow,
    bottom: CY + MID * DROP * lowerAt(p) + bow,
  };
}

/**
 * The lids at openness `p` (0 shut, 1 wide).
 *
 * One closed path: the upper lid left-to-right, the lower lid back again.
 */
function lids(p: number): string {
  const bow = bowAt(p);
  const upper = CY - RISE * p + bow;
  const lower = CY + DROP * lowerAt(p) + bow;
  return [
    `M ${X0} ${CY}`,
    `C ${C0} ${upper}, ${C1} ${upper}, ${X1} ${CY}`,
    `C ${C1} ${lower}, ${C0} ${lower}, ${X0} ${CY}`,
    "Z",
  ].join(" ");
}

/** Dead centre of the aperture — not of the box, which is not the same thing. */
function irisCentre(p: number): number {
  const { top, bottom } = span(p);
  return (top + bottom) / 2;
}

/**
 * The iris, always inside the aperture.
 *
 * Bounded by the opening's own half-height, so the lids can never slice the
 * ring into the two vertical slivers that made the half-open eye look like a
 * canoe with a box in it. It is still the aperture that reveals it: there is
 * no aperture at `p = 0`, so there is nothing to see, and the iris grows into
 * exactly the room the lids make for it.
 */
function irisRadius(p: number): number {
  const { top, bottom } = span(p);
  const room = (bottom - top) / 2 - IRIS_CLEARANCE;
  if (room <= 0) return 0;
  return Math.min(IRIS * p, IRIS_FIT * room);
}

/*
  Unhurried at the start, even through the middle, settling at the end — the
  shape of a lid opening.

  Chosen by measuring rather than by eye. Sampled at six points across the
  travel this moves 9%, 30%, 32%, 22%, 7% — a distribution the reader
  experiences as continuous. The two curves it replaced each failed in the
  same way at opposite ends: a symmetric ease-in-out left the first quarter of
  the scroll motionless, and its gentler successor put half the movement into
  one fifth of the travel and then plateaued, so 60%, 80% and 100% were
  indistinguishable and the last two viewports of scrolling did nothing.
*/
const EASE = cubicBezier(0.3, 0, 0.55, 1);

export function EyeReveal() {
  const stage = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  /*
    Progress across the pinned travel: 0 when the section's top reaches the top
    of the viewport, 1 when its bottom reaches the bottom. Because the stage is
    exactly one viewport tall, that range is precisely the distance over which
    the eye is held on screen.
  */
  const { scrollYProgress } = useScroll({
    target: stage,
    offset: ["start start", "end end"],
  });

  /*
    A light spring, not a rewrite of the relationship.

    Scroll wheels and trackpads deliver movement in coarse steps; driving
    geometry straight off them stutters. This settles within a frame or two and
    tracks the finger on a touchscreen, so the animation still belongs to the
    scroll — it is smoothing, not autonomy.
  */
  const tracked = useSpring(scrollYProgress, {
    /*
      Tuned to settle in about a tenth of a second.

      The first attempt (140 / 28 / 0.35) was heavily overdamped — a damping
      ratio near 2 — and took the better part of a second to arrive. That is
      long enough to see: scrolling to a position and then reversing to the
      same position produced two visibly different frames, because the eye was
      still catching up with where the scroll had already been. These values
      sit just past critical damping, so there is no overshoot to make an
      eyelid look bouncy, and no lag to break the sense that the scroll *is*
      the timeline.
    */
    stiffness: 300,
    damping: 18,
    mass: 0.2,
    restDelta: 0.001,
  });

  /*
    The opening occupies almost all of the travel, with a short beat of
    stillness at each end so the closed eye and the open eye are each *seen*
    rather than merely passed through. A narrower range finished the movement
    around 60% of the scroll and left the last stretch inert, which reads as
    the animation having run out rather than having landed.
  */
  const openness = useTransform(tracked, [0.04, 0.94], [0, 1], {
    clamp: true,
    ease: EASE,
  });

  /* Reduced motion: no scroll-linked geometry at all, just the open eye.
     Both transforms are always created — picking between two motion values is
     a choice about which one to read, never a reason to call a hook
     conditionally. */
  const settled = useTransform(tracked, () => 1);
  const p = reduceMotion ? settled : openness;

  const d = useTransform(p, lids);

  /*
    The iris is sized, not scaled.

    Driving `r` directly rather than transforming a group keeps the circle
    exactly concentric with the aperture at every frame, with no
    transform-origin to get wrong on an SVG group, and lets its radius track
    the opening precisely enough that the lids never cut it into fragments.

    It is still the aperture that reveals it: below `p = 0` there is no
    aperture, so there is nothing to see — the iris is not faded in, it is
    uncovered and grows into the space the lids make for it.
  */
  const irisR = useTransform(p, irisRadius);
  const pupilR = useTransform(p, (v) => irisRadius(v) * PUPIL_RATIO);
  const irisY = useTransform(p, irisCentre);
  /*
    The ring keeps its proportion to the iris rather than its absolute weight.

    No minimum: a floor of one unit turned a barely-open eye into a line with a
    speck floating in the middle of it, because a 1-unit stroke on a 4-unit
    circle is a filled dot. Sub-pixel geometry should be invisible, not
    rounded up into a mark the reader has to explain to themselves.
  */
  const ringWidth = useTransform(p, (v) => 4 * v);
  /* The lid line thins as it stretches, the way a drawn stroke would. */
  const lidWidth = useTransform(p, [0, 1], [7, 4.5]);

  return (
    <section
      aria-hidden
      /* Fixed, reserved height. Nothing here may resize during scroll. */
      className="relative h-[260svh]"
    >
      <div ref={stage} className="absolute inset-0">
        <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden px-4 sm:px-6">
          {/* `w-full` with a max width, so the eye is oversized on every screen
              but can never be the cause of a horizontal scrollbar. */}
          <motion.svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full max-w-[min(86vw,62rem)]"
            fill="none"
            focusable="false"
          >
            <defs>
              <clipPath id="blink-eye-aperture">
                <motion.path d={d} />
              </clipPath>
            </defs>

            {/* The lens. A wash rather than a shape, so the iris reads as
                sitting behind the opening instead of on top of a plate. */}
            <motion.path d={d} fill="hsl(var(--blink-sky) / 0.06)" />

            {/* Everything the aperture lets through. */}
            <g clipPath="url(#blink-eye-aperture)">
              <motion.circle cx={CX} cy={irisY} r={irisR} fill="hsl(var(--blink-sky) / 0.14)" />
              {/* A stroked ring, deliberately the same vocabulary as the score
                  ring the product shows you at the end. */}
              <motion.circle
                cx={CX}
                cy={irisY}
                r={irisR}
                fill="none"
                stroke="hsl(var(--blink-sky) / 0.85)"
                style={{ strokeWidth: ringWidth }}
              />
              <motion.circle cx={CX} cy={irisY} r={pupilR} fill="hsl(var(--blink-navy))" />
            </g>

            {/* The lids, drawn last so the outline is never cut by its own
                contents. */}
            <motion.path
              d={d}
              fill="none"
              stroke="hsl(var(--blink-sky) / 0.9)"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeWidth: lidWidth }}
            />
          </motion.svg>
        </div>
      </div>
    </section>
  );
}
