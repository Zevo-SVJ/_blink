/**
 * The film's arithmetic.
 *
 * Everything visual is checked by rendering stills and looking at them —
 * `npm run video:stills` — and no assertion here replaces that. Several cuts
 * of this film typechecked cleanly while type ran off the frame, every glow
 * was silently missing, and a beat rendered blank.
 *
 * What is worth asserting is what a still cannot show: that the scenes tile
 * the timeline, that the rhythm the brief asks for is actually met, that
 * every cue lands inside the film, and that the type fitter is not
 * systematically underestimating.
 */

import { describe, expect, it } from "vitest";

import { COPY, type Lang } from "@/remotion/copy";
import { fitBlock, fitSize, measure } from "@/remotion/motion/Kinetic";
import { peakOf, SPRING } from "@/remotion/motion/springs";
import { BED, CUES } from "@/remotion/audio/cues";
import { a, C, HEIGHT, WIDTH } from "@/remotion/theme";
import {
  BEATS,
  CARD_BEATS,
  CRACK,
  DETAIL_BEATS,
  DIVE,
  DURATION,
  FPS,
  INK,
  LOUPE_FROM,
  LOUPE_TO,
  PHOTO_DROP,
  SCENES,
  SCORE_FROM,
  SCORE_TO,
  STAMP_HIT,
  WHIP,
  at,
  end,
} from "@/remotion/timeline";

const LANGS: Lang[] = ["fr", "en"];

describe("the edit", () => {
  it("tiles the timeline with no gaps and no overlaps", () => {
    let cursor = 0;
    for (const scene of SCENES) {
      expect(scene.from).toBe(cursor);
      expect(scene.duration).toBeGreaterThan(0);
      cursor += scene.duration;
    }
    expect(cursor).toBe(DURATION);
  });

  it("is twenty-five seconds at thirty frames a second", () => {
    expect(FPS).toBe(30);
    expect(DURATION).toBe(750);
    expect(DURATION / FPS).toBe(25);
  });

  it("is vertical, at the size the platforms want", () => {
    expect(WIDTH).toBe(1080);
    expect(HEIGHT).toBe(1920);
    expect(HEIGHT / WIDTH).toBeCloseTo(16 / 9, 5);
  });

  it("gives every step of the story its own scene", () => {
    expect(SCENES.map((s) => s.id)).toEqual([
      "hook", "observe", "cards", "mirror", "verdict", "score", "desk", "cta",
    ]);
  });
});

describe("the rhythm", () => {
  /**
   * The brief asks for a visual event every 0.5–1.2 seconds. `BEATS` is the
   * list of them, so "dynamic" is checkable rather than a matter of opinion —
   * a gap over the ceiling is a scene that has gone slack, and this says
   * which one.
   */
  it("never leaves a gap longer than the brief allows", () => {
    const CEILING = 1.2 * FPS;
    for (let i = 1; i < BEATS.length; i += 1) {
      const gap = BEATS[i] - BEATS[i - 1];
      expect(gap, `gap after frame ${BEATS[i - 1]}`).toBeLessThanOrEqual(CEILING);
    }
  });

  it("starts on the first frame and runs to the end", () => {
    expect(BEATS[0]).toBe(0);
    expect(DURATION - BEATS[BEATS.length - 1]).toBeLessThanOrEqual(1.6 * FPS);
  });

  it("averages inside the window", () => {
    const average = (BEATS[BEATS.length - 1] - BEATS[0]) / (BEATS.length - 1) / FPS;
    expect(average).toBeGreaterThan(0.35);
    expect(average).toBeLessThan(1.2);
  });

  it("is sorted", () => {
    expect([...BEATS].sort((x, y) => x - y)).toEqual(BEATS);
  });
});

describe("the beats", () => {
  it("keeps each one inside the scene that owns it", () => {
    const inside = (f: number, id: Parameters<typeof at>[0]) =>
      f >= at(id) && f < end(id);

    expect(inside(PHOTO_DROP, "hook")).toBe(true);
    for (const f of DETAIL_BEATS) expect(inside(f, "observe")).toBe(true);
    for (const f of CARD_BEATS) expect(inside(f, "cards")).toBe(true);
    expect(inside(CRACK, "mirror")).toBe(true);
    expect(inside(STAMP_HIT, "verdict")).toBe(true);
    expect(inside(INK, "score")).toBe(true);
  });

  it("crosses the cut with the whip rather than landing on it", () => {
    // On the cut itself the outgoing scene has ended and the incoming one has
    // drawn nothing, so a transition that fires there animates an empty
    // frame. It has to start early enough to have a picture to throw.
    expect(WHIP).toBeLessThan(at("mirror"));
    expect(WHIP).toBeGreaterThan(at("mirror") - 10);
  });

  it("dives into the ink before the ink fills the frame", () => {
    expect(DIVE).toBeLessThan(INK);
    expect(INK - DIVE).toBeGreaterThanOrEqual(10);
  });

  it("gives the loupe long enough to actually cross the print", () => {
    // Under about a second and it reads as a wipe rather than as somebody
    // looking at something.
    expect(LOUPE_TO - LOUPE_FROM).toBeGreaterThanOrEqual(1.4 * FPS);
  });

  it("counts the score mechanically, not instantly", () => {
    expect(SCORE_TO - SCORE_FROM).toBeGreaterThanOrEqual(15);
    expect(SCORE_TO - SCORE_FROM).toBeLessThanOrEqual(40);
  });
});

describe("the sound", () => {
  it("is sorted and lands inside the film", () => {
    const frames = CUES.map((c) => c.frame);
    expect([...frames].sort((x, y) => x - y)).toEqual(frames);
    for (const cue of CUES) {
      expect(cue.frame).toBeGreaterThanOrEqual(0);
      expect(cue.frame).toBeLessThan(DURATION);
    }
  });

  it("stays inside the mix", () => {
    for (const cue of CUES) expect(cue.gain ?? 0.7).toBeLessThanOrEqual(1);
  });

  it("gives the stamp the heaviest hit in the film", () => {
    const stamp = CUES.find((c) => c.sfx === "stamp");
    expect(stamp).toBeDefined();
    expect(stamp!.frame).toBe(STAMP_HIT);
    expect(stamp!.gain).toBe(1);
  });

  it("sounds the print landing on paper and on the desk at once", () => {
    const here = CUES.filter((c) => Math.abs(c.frame - (PHOTO_DROP + 7)) <= 1);
    expect(here.map((c) => c.sfx).sort()).toContain("paper");
    expect(here.map((c) => c.sfx).sort()).toContain("bass-hit");
  });

  it("puts a sound on every physical event", () => {
    const near = (f: number) => CUES.some((c) => Math.abs(c.frame - f) <= 3);
    for (const f of [PHOTO_DROP + 7, ...DETAIL_BEATS, ...CARD_BEATS, WHIP, CRACK, STAMP_HIT, INK]) {
      expect(near(f), `no cue near frame ${f}`).toBe(true);
    }
  });

  it("runs the bed under the whole picture", () => {
    expect(BED.from).toBe(0);
    expect(BED.to).toBe(DURATION);
  });
});

describe("the two languages", () => {
  it("say the same number of things, so the cut is identical", () => {
    expect(COPY.fr.hookA).toHaveLength(COPY.en.hookA.length);
    expect(COPY.fr.hookB).toHaveLength(COPY.en.hookB.length);
    expect(COPY.fr.details).toHaveLength(DETAIL_BEATS.length);
    expect(COPY.en.details).toHaveLength(DETAIL_BEATS.length);
    expect(COPY.fr.cards).toHaveLength(CARD_BEATS.length);
    expect(COPY.en.cards).toHaveLength(CARD_BEATS.length);
    expect(COPY.fr.slogan).toHaveLength(COPY.en.slogan.length);
    expect(COPY.fr.steps).toHaveLength(COPY.en.steps.length);
  });

  it("leaves nothing empty", () => {
    for (const lang of LANGS) {
      const c = COPY[lang];
      const strings = [
        c.handle, c.mirrorYou, c.mirrorThem, c.verdictLabel, c.verdict,
        c.scoreLabel, c.score, c.scoreOutOf, c.appTitle, c.typed, c.button,
        c.brand,
        ...c.hookA, ...c.hookB, ...c.details, ...c.cards, ...c.steps,
        ...c.slogan,
      ];
      for (const str of strings) expect(str.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps the score a plausible reading", () => {
    for (const lang of LANGS) {
      const n = Number(COPY[lang].score);
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(10);
    }
  });
});

describe("the palette", () => {
  /**
   * Appending hex alpha to an `hsl()` string makes `hsl(208 95% 60%)44`,
   * which is not a colour. Browsers drop the declaration without a word, so
   * nine glows once rendered as nothing while the code claimed otherwise.
   */
  it("puts the alpha inside the function, where CSS looks for it", () => {
    expect(a("hsl(208 95% 60%)", 0.4)).toBe("hsl(208 95% 60% / 0.4)");
  });

  it("never produces a value with something after the closing paren", () => {
    for (const value of Object.values(C)) {
      expect(a(value, 0.5)).toMatch(/\)$/);
      expect(a(value, 0.5)).not.toMatch(/\)[^)]/);
    }
  });

  it("leaves every palette entry a complete colour on its own", () => {
    for (const [name, value] of Object.entries(C)) {
      expect(value, name).toMatch(/^(hsl|rgb)a?\(/);
      expect(value, name).toMatch(/\)$/);
    }
  });
});

describe("the springs", () => {
  it("uses the brief's numbers for the default", () => {
    expect(SPRING.crash.stiffness).toBe(300);
    expect(SPRING.crash.damping).toBe(20);
  });

  it("knows how far past its mark each preset throws", () => {
    expect(peakOf("flat")).toBe(1);
    expect(peakOf("crash")).toBeGreaterThan(1);
    expect(peakOf("slam")).toBeGreaterThan(peakOf("crash"));
    // The drop is the bounciest thing in the film — it is a physical object
    // hitting a desk, and it has to rebound.
    expect(peakOf("drop")).toBeGreaterThan(peakOf("crash"));
  });
});

describe("the type fitter", () => {
  it("charges more for capitals than for lowercase", () => {
    expect(fitSize("AAAAAA", 400)).toBeLessThan(fitSize("aaaaaa", 400));
  });

  it("charges more for a wide letter than a narrow one", () => {
    expect(fitSize("WWWW", 400)).toBeLessThan(fitSize("IIII", 400));
  });

  it("treats an accented capital as its base letter", () => {
    expect(fitSize("ÉÉÉÉ", 400)).toBe(fitSize("EEEE", 400));
  });

  it("sets a multi-line statement at one size", () => {
    for (const lang of LANGS) {
      const c = COPY[lang];
      for (const [lines, max, column] of [
        [c.hookA, 124, WIDTH - 160],
        [c.hookB, 168, WIDTH - 140],
        [c.slogan, 124, WIDTH - 104],
      ] as Array<[string[], number, number]>) {
        const size = fitBlock(lines, max, column);
        // One size, and every line in the block still inside the column at it.
        for (const line of lines) {
          expect(measure(line, size), `${lang} "${line}"`).toBeLessThanOrEqual(column);
        }
        // Not needlessly small: one of the lines is the one that set it.
        expect(size).toBe(Math.min(...lines.map((l) => fitSize(l, max, column))));
      }
    }
  });

  it("keeps every real string in the film inside the frame", () => {
    for (const lang of LANGS) {
      const c = COPY[lang];
      const cases: Array<[string, number, number]> = [
        ...c.hookA.map((l): [string, number, number] => [l, 124, WIDTH - 160]),
        ...c.hookB.map((l): [string, number, number] => [l, 168, WIDTH - 140]),
        ...c.cards.map((l): [string, number, number] => [l, 68, 470 - 80]),
        ...c.slogan.map((l): [string, number, number] => [l, 124, WIDTH - 104]),
        [c.cta, 52, WIDTH - 240],
        [c.verdict, 190, 860 - 70],
        [c.mirrorThem, 86, WIDTH - 120],
      ];
      for (const [text, max, column] of cases) {
        const size = fitSize(text, max, column);
        expect(size).toBeGreaterThan(18);
        // The inverse of what `fitSize` solves: the size it returns must
        // actually fit the column it was given.
        expect(measure(text, size), `${lang} "${text}"`).toBeLessThanOrEqual(column);
        expect(measure(text, size)).toBeLessThan(WIDTH);
      }
    }
  });
});
