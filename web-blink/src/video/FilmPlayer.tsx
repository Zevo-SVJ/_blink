/**
 * Blink — the film, playing on the page.
 *
 * ## Why this is not an MP4
 *
 * The film is already a pure function of an integer, so playing it is a
 * `requestAnimationFrame` loop over that integer. Encoding it to a file would
 * cost a render pipeline, a few hundred kilobytes on a landing page tuned to
 * paint fast, and one fixed resolution — a 1080-wide encode is soft on a 3x
 * phone and wasteful on a laptop. Rendered live it is vector at every density,
 * and the copy in it stays editable rather than baked into pixels.
 *
 * The frame-pure design is kept for exactly the reason it was chosen: the same
 * component can be handed to an offline renderer later to produce the file for
 * TikTok and Reels, and it will be frame-for-frame the thing shipping here.
 *
 * ## Playing without costing the page anything
 *
 * - Nothing runs until the film is on screen. An `IntersectionObserver` starts
 *   the clock on entry and stops it on exit, so the loop is never burning
 *   frames behind the fold or in a background tab.
 * - The frame is state, so only the scenes that are live re-render.
 * - The frame is reserved by aspect ratio before anything measures, so the
 *   section is the same height with the film, without it, and while it loads.
 *
 * ## Muted, like every other autoplaying thing
 *
 * Sound is off until asked for. It is a real part of the edit — the cues are
 * authored against frames, not laid over the top — but a page that makes
 * noise unprompted is a page people close.
 *
 * ## Reduced motion
 *
 * Honoured properly rather than by freezing on frame 0, which would show a
 * blank screen and read as broken: the film holds on a composed frame and the
 * controls offer to play it.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { FilmFrame } from "@/video/Film";
import { FILM_COPY } from "@/video/copy";
import { FilmCopyProvider } from "@/video/copy-context";
import { FPS } from "@/video/frame";
import { Sfx } from "@/video/sfx";
import { Stage } from "@/video/Stage";
import { DURATION } from "@/video/timeline";

/** A composed frame to hold on when motion is not wanted. */
const POSTER = 315;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function FilmPlayer() {
  const { lang, t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const sfx = useRef<Sfx | null>(null);

  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [still, setStill] = useState(false);

  /* Decided once, on mount: reduced motion means hold a frame rather than run
     the loop, and the still is what the viewer sees until they ask otherwise. */
  useEffect(() => {
    if (prefersReducedMotion()) {
      setStill(true);
      setFrame(POSTER);
    }
  }, []);

  /*
    On screen or not.

    `rootMargin` of 0 with a 40% threshold means the film starts when it is
    properly in view rather than when one pixel of it is, which is what stops
    the hook playing to the bottom edge of the viewport and being missed.
  */
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!prefersReducedMotion()) setPlaying(true);
        } else {
          setPlaying(false);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* A tab in the background still fires rAF on some engines, and always
     resumes with a jump. Pausing is both cheaper and less jarring. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /*
    The clock.

    Wall-clock rather than a frame counter: a counter drifts against the sound
    the moment a frame is dropped, and every cue in this film is authored
    against a frame number.

    The anchor is a ref, not state, and looping re-anchors it in place. The
    obvious version — stop at the end, then start again on the next tick —
    races the intersection observer: if the viewer scrolls away on the last
    frame, the queued restart lands after the observer's pause and the film
    runs on forever behind them. Re-anchoring never touches `playing`, so the
    observer stays the only thing that decides whether the film is running.
  */
  const anchor = useRef({ from: 0, at: 0 });

  useEffect(() => {
    if (!playing) return;

    let raf = 0;
    anchor.current = {
      from: frame >= DURATION - 1 ? 0 : frame,
      at: performance.now(),
    };
    sfx.current?.seek(anchor.current.from);

    const tick = (now: number) => {
      const { from, at } = anchor.current;
      let next = from + Math.floor(((now - at) / 1000) * FPS);

      if (next >= DURATION) {
        // Loop. A film that stops on its last frame stops being an ad.
        anchor.current = { from: 0, at: now };
        next = 0;
        sfx.current?.seek(0);
      }

      setFrame(next);
      sfx.current?.playUpTo(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `frame` is the anchor, read once per play; depending on it would reset
    // the clock sixty times a second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => () => sfx.current?.close(), []);

  const toggleSound = useCallback(() => {
    if (!sfx.current) sfx.current = new Sfx();
    if (sound) {
      sfx.current.close();
      sfx.current = null;
      setSound(false);
      return;
    }
    void sfx.current.resume();
    sfx.current.seek(frame);
    setSound(true);
  }, [sound, frame]);

  const replay = useCallback(() => {
    anchor.current = { from: 0, at: performance.now() };
    sfx.current?.seek(0);
    setStill(false);
    setFrame(0);
    setPlaying(true);
  }, []);

  const progress = frame / (DURATION - 1);

  return (
    <div ref={host} className="relative" data-film-player data-film-frame={frame}>
      <div className="relative overflow-hidden rounded-[2rem] ring-1 ring-white/[0.09]">
        <FilmCopyProvider copy={FILM_COPY[lang]}>
          <Stage>
            <FilmFrame frame={frame} />
          </Stage>
        </FilmCopyProvider>

        {/* Progress, as a hairline inside the frame. A scrubber would invite a
            drag the film does not need and would be a control that only works
            with a pointer.

            Inside rather than on the host: on the host it spanned the control
            row too, and drew straight through the buttons. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-5 bottom-4 h-[3px] overflow-hidden rounded-full bg-white/[0.14]"
        >
          <div
            className="h-full rounded-full bg-blink-sky"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          className="min-h-[40px] rounded-full bg-white/[0.07] px-4 text-xs font-bold text-white/75 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] hover:text-white"
        >
          {sound ? t.film.soundOn : t.film.soundOff}
        </button>
        <button
          type="button"
          onClick={replay}
          className="min-h-[40px] rounded-full bg-white/[0.07] px-4 text-xs font-bold text-white/75 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] hover:text-white"
        >
          {still ? t.film.play : t.film.replay}
        </button>
      </div>
    </div>
  );
}

export default FilmPlayer;
