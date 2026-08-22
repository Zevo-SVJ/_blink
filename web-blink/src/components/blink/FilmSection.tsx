/**
 * Blink — the film, on the landing page.
 *
 * ## Why the section exists
 *
 * The page already claims what Blink does and demonstrates it in "How it
 * works". Neither shows what using it *feels* like at speed, which is the
 * version that travels — the same twenty-one seconds is what a feed would
 * see. So this sits between the demonstration and the leaderboard: after the
 * reader knows what the product does, before they are asked where they would
 * rank.
 *
 * ## Why a file rather than a live composition
 *
 * The film is a Remotion composition, and Remotion ships a `<Player>` that
 * could run it in the page. It is not used here. Running the composition live
 * means shipping React components, springs and every frame's layout work to a
 * visitor's phone so their CPU can recompute, sixty times a second, a picture
 * that is identical for everybody. A rendered file is decoded in hardware,
 * costs the main thread nothing, and looks the same on a five-year-old
 * Android as it does in the studio.
 *
 * The composition remains the source of truth: `npm run video:render` rebuilds
 * both this file and the full-resolution masters that go to TikTok and Reels.
 *
 * ## What the web cut is
 *
 * 720×1280 and silent. The section displays it about 390px wide, so the
 * 1080×1920 master would be several megabytes of pixels no browser will
 * address; and autoplay with sound is blocked everywhere, so an audio track
 * here is bytes that can never be heard. The master keeps the mix.
 *
 * ## No layout shift, ever
 *
 * The frame's height comes from `aspect-[9/16]` on a `max-w` column, so the
 * section occupies its final height in the prerendered HTML — before the video
 * is requested, while it buffers, and after. `poster` fills that box with the
 * film's own first frame rather than black.
 */

import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/blink/Reveal";
import { useI18n } from "@/lib/i18n";

/** The column the film is framed in. */
const FRAME = "relative mx-auto w-full max-w-[330px] sm:max-w-[360px] lg:max-w-[392px]";

export function FilmSection() {
  const { lang, t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [wanted, setWanted] = useState(false);

  /*
    VP9 first, H.264 second.

    Not a fallback ordering — a preference. VP9 is about a third smaller on
    this material, and the browser takes the first source it can play, so most
    visitors get the smaller file and Safari gets the one it decodes in
    hardware.
  */
  const webm = `/video/blink-ad-${lang}-web.webm`;
  const mp4 = `/video/blink-ad-${lang}-web.mp4`;
  const poster = `/video/blink-ad-${lang}-poster.jpg`;

  /*
    Ask for the file a viewport early, and only then.

    `preload="none"` until the section is close means a visitor who bounces at
    the hero downloads none of it; a full viewport of `rootMargin` means one
    who scrolls has it buffered before they arrive.
  */
  useEffect(() => {
    const el = host.current;
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

  /*
    Start the fetch, once.

    `preload="none"` is what keeps the file off the wire until now, and simply
    changing that attribute does not make the element go and get it — a
    `<video>` chooses its source when it is inserted and does not reconsider.
    `load()` is the explicit "now, please". Without this the element sat at
    `readyState 0` with a perfectly correct `currentSrc`, which is exactly as
    confusing as it sounds.
  */
  useEffect(() => {
    if (wanted) video.current?.load();
  }, [wanted]);

  /*
    Play only while it is on screen.

    `autoPlay` alone starts the film behind the fold, so by the time the reader
    arrives the hook has already gone past — and a hook nobody sees is the one
    thing this film cannot afford. A 40% threshold means it starts when the
    frame is properly in view rather than when one pixel of it is.
  */
  useEffect(() => {
    const el = video.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wanted]);

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

        <div ref={host} className={`${FRAME} mt-10 sm:mt-12`}>
          {/* The frame sits in a lot of empty navy on a wide screen. One soft
              plate behind it is what stops it floating — the page's own
              vocabulary, not a new one. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10 rounded-[4rem] bg-[radial-gradient(60%_50%_at_50%_50%,hsl(var(--blink-sky)/0.10),transparent_72%)]"
          />

          <video
            ref={video}
            className="aspect-[9/16] w-full rounded-[2rem] bg-[hsl(220_84%_6%)] object-cover ring-1 ring-white/[0.09]"
            // Every one of these is load-bearing for autoplay: iOS refuses to
            // play inline without `playsInline`, and every browser refuses to
            // autoplay at all unless the video is muted.
            muted
            playsInline
            loop
            autoPlay
            preload={wanted ? "auto" : "none"}
            poster={poster}
            // A film with no audio track and no controls is decoration, and
            // decoration should not be announced.
            aria-hidden
            tabIndex={-1}
          >
            <source src={webm} type="video/webm" />
            <source src={mp4} type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
