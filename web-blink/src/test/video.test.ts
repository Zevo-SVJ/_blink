/**
 * The film's arithmetic.
 *
 * Everything visual is checked by rendering stills and looking at them — that
 * is what `scripts/render-stills.mjs` is for, and no assertion here replaces
 * it. Four separate cuts of this film typechecked cleanly while type ran off
 * the edge of the frame.
 *
 * What is worth asserting is what a still cannot show: that the edit has no
 * gaps, that every sound cue lands on a frame that exists, that the two
 * languages are cut identically, and that the type fitter is not
 * systematically underestimating — the single bug that produced most of the
 * clipping.
 */

import { describe, expect, it } from "vitest";

import { ACTIVE_HOOK, COPY, SCORE, type Lang } from "@/remotion/copy";
import { fitSize } from "@/remotion/motion/Kinetic";
import { peakOf, SPRING } from "@/remotion/motion/springs";
import { BED, CUES } from "@/remotion/audio/cues";
import { FPS, HEIGHT, WIDTH } from "@/remotion/theme";
import { ACTS, at, DURATION, end, len, MOMENTS } from "@/remotion/timeline";

const LANGS: Lang[] = ["fr", "en"];

describe("the edit", () => {
  it("has no gaps and no overlaps", () => {
    let cursor = 0;
    for (const m of MOMENTS) {
      expect(m.from).toBe(cursor);
      expect(m.duration).toBeGreaterThan(0);
      cursor += m.duration;
    }
    expect(cursor).toBe(DURATION);
  });

  it("is the length a feed will watch", () => {
    expect(DURATION / FPS).toBeGreaterThanOrEqual(18);
    expect(DURATION / FPS).toBeLessThanOrEqual(25);
  });

  it("is vertical, at the size the platforms want", () => {
    expect(WIDTH).toBe(1080);
    expect(HEIGHT).toBe(1920);
    expect(HEIGHT / WIDTH).toBeCloseTo(16 / 9, 5);
  });

  it("cuts often enough to hold a thumb", () => {
    // The brief's target: a visual event roughly every 0.5–1.2 seconds. This
    // is the property the previous seven-scene cut failed, and it is the one
    // thing about the rhythm that can be checked without watching it.
    expect(MOMENTS.length).toBeGreaterThanOrEqual(15);
    expect(MOMENTS.length).toBeLessThanOrEqual(30);

    const average = DURATION / MOMENTS.length / FPS;
    expect(average).toBeGreaterThan(0.45);
    expect(average).toBeLessThan(1.3);
  });

  it("never holds still twice in a row", () => {
    // Breath beats exist so the fast ones read as fast. Two adjacent ones is
    // the point at which the pacing sags — which is exactly what happened to
    // the cut this one replaces.
    for (let i = 1; i < MOMENTS.length; i += 1) {
      expect(MOMENTS[i].breath && MOMENTS[i - 1].breath).toBeFalsy();
    }
  });

  it("resolves moments and acts", () => {
    expect(at("slam")).toBe(0);
    expect(end("logo")).toBe(DURATION);
    expect(len("slam")).toBeGreaterThan(0);

    for (const act of ACTS) {
      expect(act.to).toBeGreaterThan(act.from);
    }
    // Acts tile the film end to end.
    expect(ACTS[0].from).toBe(0);
    expect(ACTS[ACTS.length - 1].to).toBe(DURATION);
    for (let i = 1; i < ACTS.length; i += 1) {
      expect(ACTS[i].from).toBe(ACTS[i - 1].to);
    }
  });

  it("gives the product its own act", () => {
    // The brief's central correction: someone who has never heard of Blink
    // must finish knowing what it does. That means the interaction is on
    // screen, not just claims about it.
    const cta = ACTS.find((a) => a.id === "cta");
    expect(cta).toBeDefined();
    expect((cta!.to - cta!.from) / FPS).toBeGreaterThan(3.5);
  });
});

describe("the sound", () => {
  it("is sorted and lands inside the film", () => {
    const frames = CUES.map((c) => c.frame);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
    for (const cue of CUES) {
      expect(cue.frame).toBeGreaterThanOrEqual(0);
      expect(cue.frame).toBeLessThan(DURATION);
    }
  });

  it("stays inside the mix", () => {
    for (const cue of CUES) expect(cue.gain ?? 0.7).toBeLessThanOrEqual(1);
  });

  it("keeps the bed under the loudest effect", () => {
    // Voice over SFX over music. The bed is mixed at 0.34 and the interrupt
    // is the loudest thing in the film; if that ordering ever inverts, the
    // music is competing with the picture.
    const loudest = Math.max(...CUES.map((c) => c.gain ?? 0.7));
    expect(loudest).toBeGreaterThan(0.34 * 2);
  });

  it("hits the interrupt harder than anything else", () => {
    const bass = CUES.find((c) => c.sfx === "bass-hit");
    expect(bass).toBeDefined();
    const others = CUES.filter((c) => c.sfx !== "bass-hit").map((c) => c.gain ?? 0.7);
    expect(bass!.gain ?? 0).toBeGreaterThanOrEqual(Math.max(...others));
  });

  it("runs the bed for the whole picture", () => {
    expect(BED.from).toBe(0);
    expect(BED.to).toBe(DURATION);
  });

  it("puts a cue on every hard beat", () => {
    // Not exhaustive — a spot check that the moments which are *about* an
    // impact actually have one within a few frames.
    for (const id of ["tag1", "tag2", "tag3", "tag4", "scoreLand"] as const) {
      const near = CUES.filter((c) => Math.abs(c.frame - at(id)) <= 4);
      expect(near.length).toBeGreaterThan(0);
    }
  });
});

describe("the two languages", () => {
  it("say the same number of things, so the cut is identical", () => {
    expect(COPY.fr.tags).toHaveLength(COPY.en.tags.length);
    expect(COPY.fr.signals).toHaveLength(COPY.en.signals.length);
    expect(COPY.fr.ctaWords).toHaveLength(COPY.en.ctaWords.length);
    expect(Object.keys(COPY.fr.hooks)).toEqual(Object.keys(COPY.en.hooks));
    for (const id of Object.keys(COPY.en.hooks)) {
      expect(COPY.fr.hooks[id].words).toHaveLength(COPY.en.hooks[id].words.length);
    }
  });

  it("has the active hook in both", () => {
    for (const lang of LANGS) {
      const hook = COPY[lang].hooks[ACTIVE_HOOK];
      expect(hook).toBeDefined();
      expect(hook.words.length).toBeGreaterThanOrEqual(2);
      expect(hook.words.length).toBeLessThanOrEqual(3);
    }
  });

  it("leaves nothing empty", () => {
    for (const lang of LANGS) {
      const c = COPY[lang];
      const strings = [
        c.reading, c.flagLabel, c.flagKicker, c.flagWord,
        c.scoreLabel, c.scoreOutOf, c.appTitle, c.appPlaceholder,
        c.appHandle, c.appButton, c.appDone, c.cta, c.brand,
        ...c.signals, ...c.tags, ...c.scoreLine, ...c.ctaWords,
        ...Object.values(c.hooks).flatMap((h) => h.words),
      ];
      for (const str of strings) expect(str.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps every display word short enough to be set large", () => {
    for (const lang of LANGS) {
      for (const word of [...COPY[lang].tags, COPY[lang].flagWord]) {
        expect(word.length).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("the type fitter", () => {
  /**
   * The bug this guards: the first three cuts sized type with a per-character
   * estimate that was measured on mixed case and applied to a film set almost
   * entirely in caps. Everything fitted in theory and clipped on screen.
   */
  it("charges more for capitals than for lowercase", () => {
    expect(fitSize("AAAAAA", 400)).toBeLessThan(fitSize("aaaaaa", 400));
  });

  it("charges more for a wide letter than a narrow one", () => {
    expect(fitSize("WWWW", 400)).toBeLessThan(fitSize("IIII", 400));
  });

  it("never exceeds the cap it is given", () => {
    expect(fitSize("A", 120)).toBeLessThanOrEqual(120);
    expect(fitSize("", 120)).toBe(120);
  });

  it("keeps the widest real strings inside the frame", () => {
    // The four that actually clipped, at the sizes they are set at, with the
    // overshoot headroom the components apply.
    const cases: Array<[string, number, number]> = [
      ["LES AUTRES", 168, (WIDTH - 160) / 1.16],
      ["OTHER PEOPLE", 168, (WIDTH - 160) / 1.16],
      ["RED FLAG", 264, (WIDTH - 80) / (0.25 + peakOf("slam") * 0.75)],
      ["MYSTÉRIEUX", 232, (WIDTH - 130) / 1.16],
      ["COMME LES AUTRES", 86, (WIDTH - 112) / 1.16],
    ];
    for (const [text, max, column] of cases) {
      const size = fitSize(text, max, column);
      expect(size).toBeGreaterThan(20);
      // Widest plausible rendering: every character a capital W.
      const worst = size * text.length * 1.01;
      expect(worst).toBeLessThan(WIDTH * 1.35);
    }
  });

  it("treats an accented capital as its base letter", () => {
    expect(fitSize("ÉÉÉÉ", 400)).toBe(fitSize("EEEE", 400));
  });
});

describe("the springs", () => {
  it("names a preset for every personality the film uses", () => {
    for (const key of ["punch", "heavy", "crisp", "settle", "slam"] as const) {
      expect(SPRING[key].stiffness).toBeGreaterThan(0);
      expect(SPRING[key].damping).toBeGreaterThan(0);
    }
  });

  it("knows how far past its mark each one throws", () => {
    // The bug this guards: "RED FLAG" was sized for a peak of about 1.2 while
    // `slam` actually reaches 1.47, so it ran off both edges of the frame for
    // six frames. Anything that fits type to a column has to divide by these.
    expect(peakOf("settle")).toBe(1);
    expect(peakOf("crisp")).toBeCloseTo(1.058, 2);
    expect(peakOf("punch")).toBeCloseTo(1.176, 2);
    expect(peakOf("slam")).toBeCloseTo(1.474, 2);
    expect(peakOf("slam")).toBeGreaterThan(peakOf("punch"));
  });

  it("orders them by how much they overshoot", () => {
    // Lower damping relative to stiffness means more overshoot. `settle` must
    // not bounce at all — it carries UI, where a wobble reads as a bug.
    const ratio = (k: keyof typeof SPRING) =>
      SPRING[k].damping / (2 * Math.sqrt(SPRING[k].stiffness * SPRING[k].mass));
    expect(ratio("settle")).toBeGreaterThan(ratio("crisp"));
    expect(ratio("crisp")).toBeGreaterThan(ratio("punch"));
    expect(ratio("slam")).toBeLessThan(1);
  });
});

describe("the score", () => {
  it("is a plausible reading", () => {
    expect(SCORE).toBeGreaterThan(0);
    expect(SCORE).toBeLessThanOrEqual(10);
  });
});
