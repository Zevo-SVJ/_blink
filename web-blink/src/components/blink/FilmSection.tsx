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
    const el = video.current;
    /*
      Only if it has not already started.

      `load()` on an element that is mid-playback resets it: readyState drops
      back to 0 and the film stops. Now that the viewport observer is what
      starts playback, its `play()` can easily win the race and be undone a
      moment later by this — which is exactly as intermittent as it sounds.
      There is nothing to ask for if the browser already went and got it.
    */
    if (wanted && el && el.readyState === 0) el.load();
  }, [wanted]);

  /*
    Follow the site's language.

    Changing the `src` of a `<source>` element does nothing on its own: a
    `<video>` picks its source when it is inserted into the document and never
    reconsiders. So switching the site to English left the French cut playing
    with English subtitles nowhere in sight — the markup said one thing and the
    decoder was doing another.

    `load()` is the only way to make it choose again, and it resets the element,
    so anything that was playing has to be restarted afterwards. Skipped on the
    first run: the element has just been inserted and has already chosen.
  */
  const chosen = useRef(lang);
  useEffect(() => {
    const el = video.current;
    if (!el || chosen.current === lang) return;
    chosen.current = lang;

    const wasPlaying = !el.paused;
    el.load();
    if (wasPlaying) void el.play().catch(() => {});
  }, [lang]);

  /*
    Play only while it is on screen — and only if motion is wanted.

    This is the only thing that starts the film. The `autoPlay` attribute
    starts it behind the fold, so by the time the reader arrives the hook has
    already gone past — and a hook nobody sees is the one thing this film
    cannot afford. A 40% threshold means it starts when the frame is properly
    in view rather than when one pixel of it is.
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
    /*
      Somebody who has asked their system for less motion has asked for this
      too. The poster still shows, and the controls still work: the film is
      available, it just does not start itself. That is the difference between
      honouring the preference and hiding the content.
    */
    const still =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (still) return;

    let owned = false;
    /*
      Our own pauses are not the viewer taking over.

      `pause()` fires a `pause` event exactly like the button does, so the
      first time this observer paused the film for being off screen it handed
      ownership to a viewer who had not touched anything — and then refused to
      ever start it again. Whether that bit landed depended on which way the
      very first intersection callback happened to go, which is why it only
      showed up on a page without prerendered markup.

      The event alone cannot say who caused it, so the test is intent: a pause
      that arrives while this code wanted the film playing is the viewer's.
      Volume and scrubbing have no such ambiguity — nothing here touches them.
    */
    let want = false;
    const claimPause = () => {
      if (want) owned = true;
    };
    /*
      React sets `muted` as a property after mount, and that fires
      `volumechange` — so on any page where the attribute was not already in
      the markup, the film handed ownership to a viewer who had not arrived
      yet, on the very first frame, and then never played. The element ships
      muted at volume 1 and nothing here ever changes that, so anything else
      is the viewer.
    */
    const claimVolume = () => {
      if (!el.muted || el.volume !== 1) owned = true;
    };
    const claim = () => {
      owned = true;
    };
    el.addEventListener("pause", claimPause);
    el.addEventListener("volumechange", claimVolume);
    el.addEventListener("seeking", claim);

    /*
      Visibility is remembered, and the decision is re-made when the file
      arrives.

      The section loads its video lazily, so the first time the frame scrolls
      into view there is very often nothing decoded yet: `play()` on a video at
      `readyState 0` rejects, and an IntersectionObserver does not fire again
      for an element that never stopped being visible. The film then sat on its
      poster forever. Asking again on `canplay` is what closes that gap.
    */
    let visible = false;
    const sync = () => {
      if (owned) return;
      if (!visible) {
        want = false;
        el.pause();
        return;
      }
      /*
        Being in view is the strongest possible signal that the file is
        wanted, so it also opens the preload gate above. Those two gates are
        driven by separate observers and the load one can lose: it waits for
        `window.load`, and on a dev server that can arrive well after the
        reader is already looking at the frame. When it did, `preload` stayed
        "none", nothing was ever fetched, and the one intersection callback
        this observer gets had nothing to play.
      */
      setWanted(true);
      want = true;
      void el.play().catch(() => {});
    };

    el.addEventListener("canplay", sync);
    el.addEventListener("loadeddata", sync);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      el.removeEventListener("canplay", sync);
      el.removeEventListener("loadeddata", sync);
      el.removeEventListener("pause", claimPause);
      el.removeEventListener("volumechange", claimVolume);
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
            // No `autoPlay` attribute. The observer above owns playback
            // entirely: the attribute starts the film the moment it can,
            // which is behind the fold, and — the reason it had to go — the
            // browser honours it before any of our code runs, so a viewer who
            // asked their system for less motion got the film playing anyway.
            // If there is no IntersectionObserver the film simply waits; the
            // controls are right there.
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
