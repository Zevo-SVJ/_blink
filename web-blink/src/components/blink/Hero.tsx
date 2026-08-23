import { motion, useReducedMotion } from "framer-motion";

import { CTAButton } from "@/components/blink/CTAButton";
import { useT } from "@/lib/i18n";

/**
 * Blink — hero.
 *
 * The job of the first screen is to make one sentence obvious: *you give it a
 * screenshot, it tells you how people read you.* The previous version put a
 * score card here, which showed an output with no visible input — a newcomer
 * had no idea what "8.7 / Deliberate and low-key" referred to, so it read as
 * random data rather than a demonstration.
 *
 * What is here now is the headline, the sentence under it, and the button.
 * Three trust chips and a looping "reads as" preview used to follow, and both
 * were doing the same job as the section directly below: the eye opens on
 * scroll and the film shows the whole mechanism at speed. Saying it three
 * times before the reader has scrolled once is not reassurance, it is noise,
 * and it pushed the eye most of a screen below the fold.
 *
 * (The chips were "Free / No Instagram login / Screenshot not kept". Anything
 * of that kind that comes back is a claim about the implementation and has to
 * be held to it — "screenshot never stored" was once here and was not true as
 * written, because a SHA-256 of the image is kept in `score_history` so the
 * same capture cannot be re-submitted for points. The FAQ and the privacy
 * policy carry the full version.)
 *
 * Nothing waits on scroll and nothing waits on a chain: text is in the DOM
 * from first paint, so motion never gates content.
 */

export function Hero({ onCTA }: { onCTA: () => void }) {
  const reduceMotion = useReducedMotion();
  const t = useT();

  // The entrance is CSS, not JS — see `.blink-rise` in index.css. The landing
  // is prerendered, and Framer's `initial` state is what renderToString emits,
  // so a JS-driven fade shipped an invisible hero to every cold visitor until
  // hydration. CSS animates straight off the prerendered markup.

  return (
    <section
      className="relative flex flex-col items-center justify-center px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28"
      /*
        Shorter than it was.

        The hero used to carry three trust chips and a looping "reads as"
        preview under the button, and 90svh was the height those needed. With
        them gone that reserved most of a screen for nothing, and the eye — the
        next thing down — began so far below the fold that the page opened on
        emptiness. At 58svh the headline is still centred in its own space and
        the closed eyelid reaches the bottom of the first screen, which is the
        whole invitation to scroll.
      */
      style={{ minHeight: "58svh" }}
    >
      <div className="relative z-10 mx-auto w-full max-w-xl text-center">
        <h1
          className="blink-rise blink-rise-1 text-[1.75rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-white min-[360px]:text-[2rem] min-[400px]:text-[2.25rem] sm:text-5xl lg:text-[3.5rem]"
        >
          {t.hero.headlineStart}
          <br />
          <AccentPhrase />
        </h1>

        <p
          className="blink-rise blink-rise-2 mx-auto mt-4 max-w-sm text-balance text-[0.95rem] leading-relaxed text-white/55 sm:mt-5 sm:max-w-md sm:text-lg"
        >
          {t.hero.subtitle}
        </p>

        <div className="blink-rise blink-rise-3 mt-7 flex justify-center">
          <CTAButton label={t.brand.cta} onClick={onCTA} href="/analyze" size="lg" />
        </div>

      </div>

    </section>
  );
}

/**
 * "others see you." — the accent phrase.
 *
 * A slow sheen crosses the gradient text every few seconds. It is the only
 * continuous motion on the screen, kept low-contrast so it registers as a
 * material quality rather than an animation asking for attention.
 */
function AccentPhrase() {
  const reduceMotion = useReducedMotion();
  const t = useT();

  return (
    <span className="relative inline-block pb-2.5 sm:pb-3.5">
      <span className="relative">
        <span className="bg-gradient-to-r from-blink-sky via-white to-blink-sky bg-clip-text text-transparent">
          {t.hero.headlineAccent}
        </span>
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.2, times: [0, 0.15, 0.85, 1] }}
          >
            <motion.span
              className="absolute inset-y-0 w-1/3"
              initial={{ left: "-40%" }}
              animate={{ left: "120%" }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.2, ease: "easeInOut" }}
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
              }}
            />
          </motion.span>
        )}
      </span>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-blink-sky/70 sm:h-1"
      />
    </span>
  );
}

