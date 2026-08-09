import { motion, useReducedMotion } from "framer-motion";

import { CTAButton } from "@/components/blink/CTAButton";
import { BLINK_LOGO, BRAND } from "@/lib/brand";

/**
 * Blink — hero.
 *
 * Recomposed around one idea: the headline is the subject, and directly under
 * the CTA sits a small piece of the actual product, so the first screen ends
 * on something concrete instead of empty space. The previous version centred a
 * short stack in a full-height section, which left a visible hole between the
 * CTA and the fold.
 *
 * Timing is deliberate. Nothing here waits on scroll, and the whole entrance is
 * done in ~400ms: a page that reveals itself slowly reads as loading, not as
 * craft. Text is present in the DOM from the first paint — only opacity and a
 * small offset animate — so nothing pops in late or shifts layout.
 */

const TRUST = ["Free to try", "No Instagram login", "Screenshot never stored"];

/** Traits shown in the preview card. Illustrative, not a claim. */
const PREVIEW_TRAITS = ["Considered", "Understated"];

export function Hero({ onCTA }: { onCTA: () => void }) {
  const reduceMotion = useReducedMotion();

  // One shared entrance: a container fade with a tight stagger, rather than
  // each element carrying its own escalating delay.
  const group = reduceMotion
    ? {}
    : {
        initial: "hidden" as const,
        animate: "shown" as const,
        variants: { hidden: {}, shown: { transition: { staggerChildren: 0.04 } } },
      };

  const item = reduceMotion
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 14 },
          shown: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
          },
        },
      };

  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32"
      style={{ minHeight: "100svh" }}
    >
      <motion.div {...group} className="relative z-10 mx-auto w-full max-w-2xl text-center">
        <motion.div {...item} className="flex justify-center">
          <img
            src={BLINK_LOGO}
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 select-none rounded-2xl shadow-[0_0_40px_-12px_rgba(175,224,249,0.3)] sm:h-14 sm:w-14"
            draggable={false}
          />
        </motion.div>

        <motion.h1
          {...item}
          className="mt-6 text-[1.9rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-white min-[400px]:text-[2.1rem] sm:mt-7 sm:text-5xl lg:text-6xl"
        >
          See yourself the way
          <br />
          <span className="relative inline-block pb-2 sm:pb-3">
            <span className="bg-gradient-to-r from-blink-sky via-white to-blink-sky bg-clip-text text-transparent">
              others see you.
            </span>
            <span
              aria-hidden
              className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-blink-sky/70 sm:h-1"
            />
          </span>
        </motion.h1>

        <motion.p
          {...item}
          className="mx-auto mt-5 max-w-md text-balance text-base leading-relaxed text-white/55 sm:text-lg"
        >
          {BRAND.name} analyzes your Instagram presence and reveals the first impression you
          make.
        </motion.p>

        <motion.div {...item} className="mt-7 flex justify-center">
          <CTAButton label={BRAND.cta} onClick={onCTA} size="lg" />
        </motion.div>

        <motion.ul
          {...item}
          className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[0.68rem] font-medium text-white/35 min-[400px]:text-xs sm:text-[0.8rem]"
        >
          {TRUST.map((item, i) => (
            <li key={item} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-white/20" />}
              {item}
            </li>
          ))}
        </motion.ul>

        {/* The product, in miniature. Gives the fold something to land on and
            shows what "a first impression" actually looks like as an output. */}
        <motion.div {...item} className="mt-10 flex justify-center sm:mt-12">
          <ResultPeek />
        </motion.div>
      </motion.div>
    </section>
  );
}

function ResultPeek() {
  const reduceMotion = useReducedMotion();
  const R = 26;
  const circumference = 2 * Math.PI * R;

  return (
    <div className="flex w-full max-w-[19rem] items-center gap-4 rounded-2xl border border-white/[0.09] bg-white/[0.04] p-4 text-left backdrop-blur-sm">
      <div className="relative flex h-[62px] w-[62px] shrink-0 items-center justify-center">
        <svg width={62} height={62} className="-rotate-90" aria-hidden>
          <circle cx={31} cy={31} r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={4} />
          <motion.circle
            cx={31}
            cy={31}
            r={R}
            fill="none"
            stroke="hsl(var(--blink-sky))"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduceMotion ? circumference * 0.13 : circumference }}
            animate={{ strokeDashoffset: circumference * 0.13 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <span className="absolute text-base font-extrabold tabular-nums text-white">8.7</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/35">
          First impression
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-white">Deliberate and low-key</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PREVIEW_TRAITS.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[0.68rem] font-semibold text-white/70"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
