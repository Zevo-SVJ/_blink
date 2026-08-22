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
 * 720×1280, with the mix. The section displays it about 390px wide, so the
 * 1080×1920 master would be several megabytes of pixels no browser will ever
 * address.
 *
 * It carries sound even though it starts muted, because the player has real
 * controls: a volume button on a file with no audio track is a lie. It
 * autoplays muted — every browser requires that — and the viewer can unmute,
 * pause and scrub with their own browser's controls rather than with
 * something reimplemented here badly.
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
    Ask for the file late, and never before the page has finished painting.

    Two gates, and both are load-bearing now that this section sits directly
    under the hero rather than three screens down.

    **The page loads first.** A megabyte of video starting at page load
    competes with the CSS, the font and the entry bundle for the same
    connection. Measured on a throttled 1.6 Mbps link, requesting it eagerly
    pushed the hero's own reflow late enough to take cumulative layout shift
    from 0.003 to 0.095 — a near-failing Core Web Vital caused entirely by
    fetching something nobody had scrolled to yet.

    **Then half a viewport of warning.** Enough that a scrolling reader has it
    buffered on arrival, little enough that someone who reads the hero and
    leaves never pays for it.
  */
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setWanted(true);
      return;
    }

    let io: IntersectionObserver | undefined;
    const watch = () => {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setWanted(true);
            io?.disconnect();
          }
        },
        { rootMargin: "50% 0px" },
      );
      io.observe(el);
    };

    if (document.readyState === "complete") {
      watch();
      return () => io?.disconnect();
    }

    window.addEventListener("load", watch, { once: true });
    return () => {
      window.removeEventListener("load", watch);
      io?.disconnect();
    };
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

    /*
      Once the viewer takes over, the observer stops driving.

      Scrolling past a video someone deliberately paused and having it start
      itself again is infuriating, and so is having it pause under you while
      you are watching it with the sound on. The first interaction with the
      controls hands ownership over for good.
    */
    let owned = false;
    const claim = () => {
      owned = true;
    };
    el.addEventListener("pause", claim);
    el.addEventListener("volumechange", claim);
    el.addEventListener("seeking", claim);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (owned) return;
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      el.removeEventListener("pause", claim);
      el.removeEventListener("volumechange", claim);
      el.removeEventListener("seeking", claim);
    };
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
            // The viewer's own controls: play, pause, scrub, volume,
            // fullscreen, picture-in-picture. Every one of those is better
            // than a reimplementation, and they are the ones people already
            // know how to use.
            controls
            controlsList="nodownload"
            aria-label={t.film.heading}
          >
            <source src={webm} type="video/webm" />
            <source src={mp4} type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
