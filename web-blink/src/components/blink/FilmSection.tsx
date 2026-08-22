/**
 * Blink — the film, on the landing page.
 *
 * ## Why the section exists at all
 *
 * The page already explains Blink twice: the hero claims it and "How it
 * works" demonstrates it. Neither shows what using it *feels* like at speed,
 * which is the thing that travels — the same twenty seconds is what a feed
 * would see. So this sits between the demonstration and the leaderboard: after
 * the reader knows what the product does, before they are asked where they
 * would rank.
 *
 * ## Costing the page nothing
 *
 * The film is around forty kilobytes of scenes, primitives and a synth, and
 * none of it is needed to read the hero. `lazy` keeps it out of the entry
 * chunk, and the chunk is only requested when the section is within a
 * viewport of the fold — so a visitor who bounces at the hero downloads none
 * of it, and one who scrolls has it before they arrive.
 *
 * ## No layout shift, ever
 *
 * The frame's height is decided by `aspect-[9/16]` on a `max-w` column, so the
 * section occupies its final height in the prerendered HTML — before the
 * chunk loads, while it loads, and after. The placeholder is the same box.
 * This is the same trap the eye hit: anything that measures first and sizes
 * second moves the page under the reader.
 *
 * ## What this deliberately does not do
 *
 * Autoplay with sound, take over the viewport, pin itself, or interrupt the
 * scroll. The page has one scroll-driven set piece already and a second would
 * be a fight.
 */

import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/blink/Reveal";
import { useT } from "@/lib/i18n";

const FilmPlayer = lazy(() => import("@/video/FilmPlayer"));

/**
 * The column the film is framed in.
 *
 * 9:16 at a size a phone can actually read the type at, and a little larger on
 * a laptop where 360px in a 1280px field reads as an afterthought. It stops
 * growing well before it becomes the tall thing that pushes the rest of the
 * page below two folds — a portrait film is height-expensive, so every pixel
 * of width costs 1.78 of scroll.
 */
const FRAME = "relative mx-auto w-full max-w-[330px] sm:max-w-[360px] lg:max-w-[392px]";

export function FilmSection() {
  const t = useT();
  const anchor = useRef<HTMLDivElement>(null);
  const [wanted, setWanted] = useState(false);

  /*
    Request the chunk a viewport early.

    Waiting until the section is visible means the reader watches a placeholder
    while a network round trip happens; `rootMargin` of a full viewport starts
    the fetch while they are still reading the section above, and the player's
    own observer still decides when to actually play.
  */
  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setWanted(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setWanted(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="film" className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            {t.film.eyebrow}
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            {t.film.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            {t.film.subtitle}
          </p>
        </Reveal>

        <div ref={anchor} className={`${FRAME} mt-10 sm:mt-12`}>
          {/* The frame sits in a lot of empty navy on a wide screen. A single
              soft plate behind it is what stops it floating — the page's own
              vocabulary, not a new one: `PageBackground` already lights the
              landing this way. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10 rounded-[4rem] bg-[radial-gradient(60%_50%_at_50%_50%,hsl(var(--blink-sky)/0.10),transparent_72%)]"
          />
          {/* Both branches reserve the identical box, so the swap is invisible
              in layout terms — the placeholder is not a spinner, it is the
              frame itself, already the right shape and colour. */}
          {wanted ? (
            <Suspense fallback={<FilmPlaceholder />}>
              <FilmPlayer />
            </Suspense>
          ) : (
            <FilmPlaceholder />
          )}
        </div>
      </div>
    </section>
  );
}

function FilmPlaceholder() {
  return (
    <div aria-hidden>
      <div className="aspect-[9/16] w-full rounded-[2rem] bg-[hsl(220_84%_7%)] ring-1 ring-white/[0.09]" />
      {/* Matches the control row's height exactly, so its arrival adds none. */}
      <div className="mt-4 h-10" />
    </div>
  );
}
