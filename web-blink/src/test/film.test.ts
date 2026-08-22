/**
 * The film's arithmetic.
 *
 * Everything visual about the film is checked by photographing frames — that
 * is what `qa/film.mjs` is for, and no assertion here replaces looking at it.
 * What is worth asserting is the part a screenshot cannot show: that the two
 * languages are cut to the same frames, that every sound cue lands inside the
 * film, and that the springs and easings are actually the shapes they claim.
 *
 * These are also the properties most likely to break silently. A French line
 * one frame longer than its English counterpart would not look wrong in any
 * single still; it would just put every cue after it on the wrong picture.
 */

import { describe, expect, it } from "vitest";

import { ACTIVE_HOOK_ID, FILM_COPY } from "@/video/copy";
import { clamp, FPS, interpolate, sec, spring } from "@/video/frame";
import { at, CUES, DURATION, READ_COUNT, SHOTS, SIGNAL_COUNT } from "@/video/timeline";

describe("the edit", () => {
  it("has no gaps and no overlaps", () => {
    let cursor = 0;
    for (const shot of SHOTS) {
      expect(shot.from).toBe(cursor);
      expect(shot.duration).toBeGreaterThan(0);
      cursor += shot.duration;
    }
    expect(cursor).toBe(DURATION);
  });

  it("is the length a feed will actually watch", () => {
    // Longer than this and the outro is never reached; shorter and the turn
    // has nothing to interrupt.
    expect(DURATION / FPS).toBeGreaterThan(15);
    expect(DURATION / FPS).toBeLessThan(30);
  });

  it("names every scene once", () => {
    const ids = SHOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves scene heads", () => {
    expect(at("hook")).toBe(0);
    expect(at("outro")).toBe(DURATION - SHOTS[SHOTS.length - 1].duration);
  });
});

describe("the cues", () => {
  it("are sorted, so the player can walk them with a cursor", () => {
    const frames = CUES.map((c) => c.frame);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
  });

  it("all land inside the film", () => {
    for (const cue of CUES) {
      expect(cue.frame).toBeGreaterThanOrEqual(0);
      expect(cue.frame).toBeLessThan(DURATION);
    }
  });

  it("stay inside the mix", () => {
    for (const cue of CUES) expect(cue.gain ?? 0.6).toBeLessThanOrEqual(1);
  });

  it("fire one impact per read and one per turn payoff", () => {
    const impacts = CUES.filter(
      (c) => c.kind === "impact" && c.frame >= at("perceptions") && c.frame < at("turn"),
    );
    expect(impacts).toHaveLength(READ_COUNT);
  });

  it("tick once per signal the scan calls out", () => {
    const ticks = CUES.filter(
      (c) => c.kind === "tick" && c.frame >= at("analysis") && c.frame < at("perceptions"),
    );
    expect(ticks).toHaveLength(SIGNAL_COUNT);
  });
});

describe("the two languages", () => {
  const langs = ["en", "fr"] as const;

  it("are cut to identical frames", () => {
    for (const id of Object.keys(FILM_COPY.en.hooks)) {
      expect(FILM_COPY.fr.hooks[id]).toBeDefined();
      expect(FILM_COPY.fr.hooks[id].beats).toEqual(FILM_COPY.en.hooks[id].beats);
      expect(FILM_COPY.fr.hooks[id].blink).toBe(FILM_COPY.en.hooks[id].blink);
    }
  });

  it("say the same number of things", () => {
    expect(FILM_COPY.fr.perceptions).toHaveLength(FILM_COPY.en.perceptions.length);
    expect(FILM_COPY.fr.signals).toHaveLength(FILM_COPY.en.signals.length);
  });

  it("have an active hook in both", () => {
    for (const lang of langs) {
      const hook = FILM_COPY[lang].hooks[ACTIVE_HOOK_ID];
      expect(hook).toBeDefined();
      expect(hook.lines).toHaveLength(hook.beats.length);
    }
  });

  it("leave nothing empty", () => {
    for (const lang of langs) {
      const c = FILM_COPY[lang];
      const strings = [
        c.yours,
        c.reads,
        c.turnSetup,
        c.turn.lens,
        c.turn.word,
        c.scoreLabel,
        c.scoreKicker,
        c.tagline,
        c.cta,
        ...c.signals,
        ...c.perceptions.flatMap((p) => [p.lens, p.word]),
        ...Object.values(c.hooks).flatMap((h) => h.lines),
      ];
      for (const s of strings) expect(s.trim().length).toBeGreaterThan(0);
    }
  });

  it("keep every headline word short enough to be set large", () => {
    // The scenes size a word to fit — but a word long enough to force the
    // size below the lens label above it would invert the hierarchy, and
    // that is a copy decision, not a layout one.
    for (const lang of langs) {
      const words = [
        ...FILM_COPY[lang].perceptions.map((p) => p.word),
        FILM_COPY[lang].turn.word,
      ];
      for (const w of words) expect(w.length).toBeLessThanOrEqual(12);
    }
  });
});

describe("the primitives", () => {
  it("converts seconds to whole frames", () => {
    expect(sec(1)).toBe(FPS);
    expect(Number.isInteger(sec(2.6))).toBe(true);
  });

  it("clamps", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("interpolates and holds at both ends", () => {
    expect(interpolate(0, [0, 10], [0, 100])).toBe(0);
    expect(interpolate(10, [0, 10], [0, 100])).toBe(100);
    expect(interpolate(-4, [0, 10], [0, 100])).toBe(0);
    expect(interpolate(40, [0, 10], [0, 100])).toBe(100);
    expect(interpolate(5, [0, 10], [0, 100])).toBeCloseTo(50);
  });

  it("springs from zero and settles at one", () => {
    expect(spring({ frame: 0 })).toBe(0);
    expect(spring({ frame: -3 })).toBe(0);
    expect(spring({ frame: 200 })).toBeCloseTo(1, 3);
  });

  it("overshoots when it is underdamped, and not otherwise", () => {
    const bouncy = Array.from({ length: 60 }, (_, f) =>
      spring({ frame: f, config: { stiffness: 200, damping: 10 } }),
    );
    expect(Math.max(...bouncy)).toBeGreaterThan(1);

    const critical = Array.from({ length: 60 }, (_, f) =>
      spring({ frame: f, config: { stiffness: 200, damping: 100 } }),
    );
    expect(Math.max(...critical)).toBeLessThanOrEqual(1.0001);
  });

  it("is a pure function of the frame", () => {
    // The whole architecture rests on this: the same frame must render the
    // same picture whether it is reached by playing, by scrubbing, or by an
    // offline renderer asking for it out of order.
    for (const f of [0, 17, 143, 400, 677]) {
      expect(spring({ frame: f })).toBe(spring({ frame: f }));
      expect(interpolate(f, [0, 677], [0, 1])).toBe(interpolate(f, [0, 677], [0, 1]));
    }
  });
});
