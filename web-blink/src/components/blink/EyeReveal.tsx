/**
 * Blink — the eye that opens as you scroll.
 *
 * ## The idea
 *
 * The product's promise is "See yourself the way others see you." This is that
 * sentence as a gesture rather than a caption: the page holds a closed eye
 * below the hero, and the reader's own scrolling is what opens it. Nothing
 * explains the metaphor, because being told a metaphor is the opposite of
 * noticing one.
 *
 * ## One path does three jobs
 *
 * The lids, the lens and the mask that reveals the iris are all `lids(p)`.
 * Stroked it is the outline; filled it is the lens; as a clip it is what the
 * iris can be seen through. So the iris cannot fade in, drift outside the
 * lids, or be visible while the eye is shut — there is no second source of
 * truth to disagree with. At rest the two curves coincide and enclose no area,
 * so the clip is empty and the iris is genuinely absent rather than hidden.
 *
 * ## The atmosphere is part of the drawing, not an effect over it
 *
 * The filaments leave from just inside the canthus and dissolve outward; the
 * motes sit on those same paths; the haze is an ellipse matched to the
 * aperture, not a circle placed behind it. Everything is drawn in the eye's
 * own coordinate system and scales with it, which is what keeps it from
 * reading as a PNG laid over the page.
 *
 * Softness comes from gradients rather than `feGaussianBlur`. A blur over this
 * area, re-rasterised on every scroll frame, is the one thing here that could
 * genuinely cost frames; transparent gradient stops cost nothing and, at these
 * opacities, are indistinguishable.
 *
 * ## Layers, all driven by the same scroll
 *
 * The lids part, the internal light rises, the iris is uncovered and grows,
 * the filaments draw themselves outward in sequence, the motes arrive last.
 * Each has its own slice of the timeline, so the sequence has an order to it
 * rather than everything appearing at once — and running the scroll backwards
 * runs all of it backwards.
 *
 * ## Why a pinned stage
 *
 * The section reserves a fixed height in `svh` and pins a viewport-tall stage
 * inside it. Fixed, because the document's height must not change while
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
  type MotionValue,
} from "framer-motion";
import { useRef } from "react";

import {
  CX,
  CY,
  EYE,
  H,
  irisCentre,
  irisRadius,
  lids,
  PLUMES,
  PUPIL_RATIO,
  SPECKS,
  W,
  type Plume,
  type Speck,
} from "@/components/blink/eye-geometry";
import { useT } from "@/lib/i18n";

/*
  Unhurried at the start, even through the middle, settling at the end — the
  shape of a lid opening.

  Chosen by measuring rather than by eye. Sampled across the travel this moves
  9%, 30%, 32%, 22%, 7%, a distribution the reader experiences as continuous.
  Two earlier curves failed in opposite ways: a symmetric ease-in-out left the
  first quarter of the scroll motionless, and its gentler successor put half
  the movement into one fifth of the travel and then plateaued, so 60%, 80% and
  100% were indistinguishable.
*/
const EASE = cubicBezier(0.3, 0, 0.55, 1);

/**
 * Ramp from `a` to `b`, flat outside — one layer's slice of the timeline.
 *
 * Named as a hook because it is one: it wraps `useTransform`, so it must obey
 * the same call-order rules, and calling it `slice` hid that from the linter
 * and from the next reader.
 */
const useSlice = (p: MotionValue<number>, a: number, b: number) =>
  useTransform(p, [a, b], [0, 1], { clamp: true });

export function EyeReveal() {
  const t = useT();
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

    Wheels and trackpads deliver movement in coarse steps, and driving geometry
    straight off them stutters. Tuned to settle in about a tenth of a second:
    an earlier, heavily overdamped set took the better part of a second, which
    was long enough that scrolling to a position and reversing back to it
    produced two visibly different frames. These sit just past critical
    damping — no overshoot to make an eyelid look bouncy, no lag to break the
    sense that the scroll *is* the timeline.
  */
  const tracked = useSpring(scrollYProgress, {
    stiffness: 300,
    damping: 18,
    mass: 0.2,
    restDelta: 0.001,
  });

  const openness = useTransform(tracked, [0.04, 0.94], [0, 1], {
    clamp: true,
    ease: EASE,
  });

  /* Reduced motion: no scroll-linked geometry at all, just the open eye. Both
     transforms are always created — choosing which value to read is never a
     reason to call a hook conditionally. */
  const settled = useTransform(tracked, () => 1);
  const p = reduceMotion ? settled : openness;

  const d = useTransform(p, lids);
  const irisR = useTransform(p, irisRadius);
  const pupilR = useTransform(p, (v) => irisRadius(v) * PUPIL_RATIO);
  const irisY = useTransform(p, irisCentre);

  /* The ring keeps its proportion to the iris rather than its absolute weight.
     No minimum: a one-unit floor on a four-unit circle is a filled dot, which
     turned a barely-open eye into a line with a speck floating in it. */
  const ringWidth = useTransform(p, (v) => 3.4 * v);
  const ringHalo = useTransform(p, (v) => 9 * v);
  const ringHaloWide = useTransform(p, (v) => 19 * v);
  const innerRing = useTransform(p, (v) => irisRadius(v) * 0.68);
  /* The lid line thins as it stretches, the way a drawn stroke would. */
  const lidWidth = useTransform(p, [0, 1], [6, 3.4]);
  /*
    Three nested haloes under the lid line, not one.

    A single wide stroke at a flat opacity has a hard edge, so it reads as a
    second line drawn beside the first rather than as light coming off it.
    Stacking a few at falling opacity and rising width approximates the falloff
    a Gaussian blur would give, for the cost of two extra paths and none of the
    per-frame re-rasterising a real filter would demand.
  */
  const halo1 = useTransform(p, [0, 1], [9, 13]);
  const halo2 = useTransform(p, [0, 1], [16, 24]);
  const halo3 = useTransform(p, [0, 1], [26, 40]);

  /* Each layer gets its own slice of the opening, so the sequence has an
     order: light before iris, iris before material, motes last. */
  const glow = useSlice(p, 0.12, 0.7);
  const lensWash = useSlice(p, 0.05, 0.55);
  const material = useSlice(p, 0.2, 1);
  const motes = useSlice(p, 0.45, 1);

  /*
    Restrained on purpose.

    The first pass had the internal light at nearly full strength across an
    ellipse almost as wide as the eye, which flooded the lens and turned the
    whole thing into the broad blue glow this design is explicitly not. The
    light now sits close around the iris and stops well short of the canthi,
    so the eye reads as lit from within rather than as a lamp.
  */
  /*
    The two halves of the sentence, staggered against the aperture.

    The first lands while the eye is still opening — it is the part the reader
    already agrees with. The second waits until the eye is properly open,
    because it is the turn, and a turn delivered early is just a second line.
  */
  const knownOpacity = useTransform(tracked, [0.12, 0.26], [0, 1], { clamp: true });
  const knownY = useTransform(tracked, [0.12, 0.26], [14, 0], { clamp: true });
  const unknownOpacity = useTransform(tracked, [0.42, 0.58], [0, 1], { clamp: true });
  const unknownY = useTransform(tracked, [0.42, 0.58], [14, 0], { clamp: true });

  const hazeOpacity = useTransform(glow, [0, 1], [0, 0.5]);
  const hazeScale = useTransform(glow, [0, 1], [0.6, 1]);
  const lensOpacity = useTransform(lensWash, [0, 1], [0, 1]);
  const coreOpacity = useTransform(glow, [0, 1], [0, 0.5]);

  return (
    <section
      id="problem"
      aria-label={t.problem.knows}
      /* Fixed, reserved height. Nothing here may resize during scroll. */
      className="relative h-[260svh]"
    >
      <div ref={stage} className="absolute inset-0">
        <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
          {/*
            Deliberately wider than the viewport, and clipped by the stage.

            The eye is roughly a third of the drawing box; the rest is where
            the material lives. Sizing by the box rather than by the eye means
            the eye lands at about 64% of a phone's width and 35% of a large
            desktop's, with the atmosphere in proportion around it either way —
            and the material free to run off every edge, which is what stops
            the composition looking like a sticker with a border. There is
            deliberately no height cap: on a short, wide window the material is
            cropped top and bottom, which reads as a picture continuing past
            the frame rather than one that has been shrunk to fit inside it.
          */}
          <motion.svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-[min(179vw,150rem)] shrink-0"
            fill="none"
            focusable="false"
          >
            <defs>
              <clipPath id="blink-eye-aperture">
                <motion.path d={d} />
              </clipPath>

              {/* Light gathered at the middle of the aperture and falling away
                  — an ellipse matched to the opening, never a disc behind it. */}
              <radialGradient id="blink-eye-haze">
                <stop offset="0%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0.5" />
                <stop offset="42%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0.16" />
                <stop offset="100%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0" />
              </radialGradient>

              {/* The iris has a body rather than a flat fill: brighter off
                  centre, so it reads as a surface catching light. */}
              <radialGradient id="blink-eye-iris" cx="46%" cy="38%" r="76%">
                <stop offset="0%" stopColor="hsl(var(--blink-sky))" stopOpacity="0.34" />
                <stop offset="52%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0.08" />
              </radialGradient>

              {/* Along the lid: brightest over the iris, easing to nothing at
                  the corners, so the outline is drawn rather than uniform. */}
              <linearGradient id="blink-eye-lid" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="hsl(var(--blink-sky))" stopOpacity="0.62" />
                <stop offset="30%" stopColor="hsl(var(--blink-white))" stopOpacity="1" />
                <stop offset="70%" stopColor="hsl(var(--blink-white))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--blink-sky))" stopOpacity="0.62" />
              </linearGradient>

              {/* Filaments fade *away* from the eye, so one gradient per
                  direction. Object bounding box, so every path fades along its
                  own length without needing its own definition. */}
              {/* Every form in the material shares this: solid at its heart,
                  nothing at its edge. That is where the softness comes from,
                  and why none of it needs a blur. */}
              <radialGradient id="blink-eye-vapour">
                <stop offset="0%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0.62" />
                <stop offset="46%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--blink-sky))" stopOpacity="0" />
              </radialGradient>

              {/* Strands run through the mass, so they read as structure
                  inside the material rather than as lines beside it. */}
              <linearGradient id="blink-eye-strand" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="hsl(var(--blink-sky))" stopOpacity="0.75" />
                <stop offset="55%" stopColor="hsl(var(--blink-sky))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--blink-sky))" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* ---- behind the eye ------------------------------------- */}

            {/* Wide, flat, and centred on the opening: the light the eye is
                letting out, not an object sitting behind it. */}
            <motion.ellipse
              cx={CX}
              cy={CY}
              rx={EYE * 1.9}
              ry={210}
              fill="url(#blink-eye-haze)"
              style={{ opacity: hazeOpacity, scale: hazeScale, originX: "50%", originY: "50%" }}
            />

            <g data-eye="filaments">
              {PLUMES.map((plume, i) => (
                <Vapour key={i} plume={plume} progress={material} />
              ))}
            </g>

            <motion.g data-eye="motes" style={{ opacity: motes }} fill="hsl(var(--blink-sky))">
              {SPECKS.map((speck, i) => (
                <Mote key={i} speck={speck} progress={motes} />
              ))}
            </motion.g>

            {/* ---- the eye --------------------------------------------- */}

            {/* The lens: a wash, so the iris reads as sitting behind the
                opening rather than on top of a plate. */}
            <motion.path d={d} fill="hsl(var(--blink-sky) / 0.07)" style={{ opacity: lensOpacity }} />

            <g clipPath="url(#blink-eye-aperture)">
              {/* Internal light, cut by the aperture — it can only be seen
                  through the part of the eye that is actually open. */}
              <motion.ellipse
                cx={CX}
                cy={CY}
                rx={EYE * 0.62}
                ry={76}
                fill="url(#blink-eye-haze)"
                style={{ opacity: coreOpacity }}
              />

              <motion.circle cx={CX} cy={irisY} r={irisR} fill="url(#blink-eye-iris)" />
              {/* A finer ring inside the outer one. Two concentric weights
                  give the iris depth without a single line of detail that
                  could be mistaken for anatomy. */}
              <motion.circle
                cx={CX}
                cy={irisY}
                r={innerRing}
                fill="none"
                /* Sky, not a desaturated grey. At 30% over a blue iris the
                   old value read as a dirty ring rather than a second edge. */
                stroke="hsl(var(--blink-sky) / 0.55)"
                style={{ strokeWidth: useTransform(p, (v) => 1.4 * v) }}
              />
              <motion.circle
                cx={CX}
                cy={irisY}
                r={irisR}
                fill="none"
                stroke="hsl(var(--blink-sky-bright) / 0.12)"
                style={{ strokeWidth: ringHaloWide }}
              />
              <motion.circle
                cx={CX}
                cy={irisY}
                r={irisR}
                fill="none"
                stroke="hsl(var(--blink-sky-bright) / 0.26)"
                style={{ strokeWidth: ringHalo }}
              />
              <motion.circle
                cx={CX}
                cy={irisY}
                r={irisR}
                fill="none"
                stroke="hsl(var(--blink-sky) / 0.95)"
                style={{ strokeWidth: ringWidth }}
              />
              <motion.circle cx={CX} cy={irisY} r={pupilR} fill="hsl(var(--blink-navy))" />
            </g>

            {/*
              The lids, drawn last so the outline is never cut by its own
              contents — and drawn twice.

              A wide, faint stroke under a narrow, bright one. That is what
              gives a line luminosity: the halo reads as light coming off the
              edge while the core stays crisp, and it costs two paths instead
              of a Gaussian blur re-rasterised on every scroll frame. A single
              flat stroke was legible but inert, which is the difference
              between a diagram and a drawing.
            */}
            <motion.path
              d={d}
              fill="none"
              stroke="hsl(var(--blink-sky-bright) / 0.05)"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeWidth: halo3, opacity: lensOpacity }}
            />
            <motion.path
              d={d}
              fill="none"
              stroke="hsl(var(--blink-sky-bright) / 0.11)"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeWidth: halo2, opacity: lensOpacity }}
            />
            <motion.path
              d={d}
              fill="none"
              stroke="hsl(var(--blink-sky-bright) / 0.22)"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeWidth: halo1, opacity: lensOpacity }}
            />
            <motion.path
              d={d}
              data-eye="lid"
              fill="none"
              stroke="url(#blink-eye-lid)"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeWidth: lidWidth }}
            />
          </motion.svg>

          {/*
            The problem, arriving as the eye opens.

            Its own section would have said the same thing twice: the eye
            already *is* the argument — something is looking at your profile
            and you cannot see what it sees — and a paragraph explaining that
            underneath it would be a caption for a picture that does not need
            one. Tied to the same scroll instead, the sentence completes as
            the aperture does, which is the one moment it means anything.

            `aria-hidden` stays off this. The eye is decoration and is hidden
            from assistive tech; this is the section's actual content.
          */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[max(10vh,4.5rem)] flex justify-center px-6">
            {/* Wide enough that neither half wraps mid-phrase at any width the
                eye is drawn at: at `max-w-sm` the desktop cut broke "You know
                your / profile.", which reads as a layout accident rather than
                as a line. */}
            <div className="max-w-[19rem] text-balance text-center sm:max-w-xl">
              <motion.p
                /* `t-heading`, not `t-title`. The eye is the argument; this is
                   the caption that lets you know you were right about it. Set
                   at title weight it competed with the drawing above it. */
                className="t-heading text-white"
                style={{ opacity: knownOpacity, y: knownY }}
              >
                {t.problem.knows}
              </motion.p>
              <motion.p
                className="t-heading mt-1.5 text-blink-sky"
                style={{ opacity: unknownOpacity, y: unknownY }}
              >
                {t.problem.doesnt}
              </motion.p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One plume of material, growing out of the eye.
 *
 * The whole group scales from the point where it meets the eye, so the mass
 * does not appear near the eye — it *comes out of* it, which is the difference
 * between an atmosphere and a decoration. `transform-box: view-box` is set
 * explicitly so the origin is read in the drawing's own units rather than the
 * group's bounding box, which moves as the group scales.
 *
 * Opacity and extent are driven separately: the material thickens and reaches
 * further at different rates, so it billows rather than simply appearing.
 */
function Vapour({ plume, progress }: { plume: Plume; progress: MotionValue<number> }) {
  const local = useTransform(progress, [plume.delay, 1], [0, 1], { clamp: true });
  const opacity = useTransform(local, [0, 1], [0, 1]);
  const reach = useTransform(local, [0, 1], [0.32, 1]);

  return (
    <motion.g
      style={{
        opacity,
        scale: reach,
        transformBox: "view-box",
        transformOrigin: `${plume.origin[0]}px ${plume.origin[1]}px`,
      }}
    >
      {plume.vapour.map((v, i) => (
        <ellipse
          key={i}
          cx={v.cx}
          cy={v.cy}
          rx={v.rx}
          ry={v.ry}
          fill="url(#blink-eye-vapour)"
          opacity={v.opacity}
          transform={`rotate(${v.rot} ${v.cx} ${v.cy})`}
        />
      ))}
      {plume.strands.map((d, i) => (
        <path
          key={`s${i}`}
          d={d}
          fill="none"
          stroke="url(#blink-eye-strand)"
          strokeWidth={3.4}
          strokeLinecap="round"
          opacity={0.2}
        />
      ))}
    </motion.g>
  );
}

/** One mote, arriving late and drifting a little as it does. */
function Mote({ speck, progress }: { speck: Speck; progress: MotionValue<number> }) {
  const local = useTransform(progress, [speck.delay, 1], [0, 1], { clamp: true });
  const opacity = useTransform(local, [0, 1], [0, speck.opacity]);
  const r = useTransform(local, [0, 1], [0, speck.r]);
  /* Drifts outward from the eye as it appears — the same direction the
     filament under it is travelling. */
  const dx = useTransform(local, [0, 1], [(speck.x - CX) * -0.06, 0]);

  return <motion.circle cx={speck.x} cy={speck.y} r={r} style={{ opacity, x: dx }} />;
}
