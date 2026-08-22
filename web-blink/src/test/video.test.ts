/**
 * The film's arithmetic.
 *
 * Everything visual is checked by rendering stills and looking at them — that
 * is what `npm run video:stills` is for, and no assertion here replaces it.
 * Several cuts of this film typechecked cleanly while type ran off the edge of
 * the frame.
 *
 * What is worth asserting is what a still cannot show: that the six scenes
 * tile the timeline exactly, that the beats land on the frames the brief
 * specifies, that every cue sits inside the film, and that the type fitter is
 * not systematically underestimating — the single bug behind most of the
 * clipping this film has had.
 */

import { describe, expect, it } from "vitest";

import { COPY, type Lang } from "@/remotion/copy";
import { fitSize, measure } from "@/remotion/motion/Kinetic";
import { peakOf, SPRING } from "@/remotion/motion/springs";
import { BED, CUES } from "@/remotion/audio/cues";
import { a, C, HEIGHT, WIDTH } from "@/remotion/theme";
import {
  at,
  DURATION,
  end,
  FLAG_WORD,
  FPS,
  GAUGE_FROM,
  GAUGE_TO,
  GLITCH,
  HOOK_BEATS,
  len,
  PRESS,
  SCENES,
  TAG_BEATS,
  TYPE_FROM,
  WHIP,
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

  it("is twelve seconds at thirty frames a second", () => {
    expect(FPS).toBe(30);
    expect(DURATION).toBe(360);
    expect(DURATION / FPS).toBe(12);
  });

  it("is vertical, at the size the platforms want", () => {
    expect(WIDTH).toBe(1080);
    expect(HEIGHT).toBe(1920);
    expect(HEIGHT / WIDTH).toBeCloseTo(16 / 9, 5);
  });

  it("puts each scene on the second the brief specifies", () => {
    expect(at("hook")).toBe(0);
    expect(at("illusion")).toBe(60);
    expect(at("scan")).toBe(105);
    expect(at("flag")).toBe(180);
    expect(at("score")).toBe(240);
    expect(at("cta")).toBe(300);
    expect(end("cta")).toBe(360);
  });

  it("lands the four hook impacts on 0, 15, 30 and 45", () => {
    expect(HOOK_BEATS).toEqual([0, 15, 30, 45]);
    for (const beat of HOOK_BEATS) {
      expect(beat).toBeGreaterThanOrEqual(at("hook"));
      expect(beat).toBeLessThan(end("hook"));
    }
  });

  it("pops the three tags on 120, 130 and 140", () => {
    expect(TAG_BEATS).toEqual([120, 130, 140]);
    for (const beat of TAG_BEATS) {
      expect(beat).toBeGreaterThanOrEqual(at("scan"));
      expect(beat).toBeLessThan(end("scan"));
    }
  });

  it("fills the gauge in fifteen frames, not slowly", () => {
    // The brief is explicit: 15 frames maximum. A meter that fills slowly is
    // a loading indicator, which is the least interesting thing a screen can
    // show.
    expect(GAUGE_TO - GAUGE_FROM).toBeLessThanOrEqual(15);
    expect(GAUGE_TO).toBeLessThan(end("score"));
  });

  it("tears across the cut rather than on it", () => {
    /*
      The glitch fired exactly on the flag's first frame, where the outgoing
      scene has ended and the incoming one has drawn nothing — so it tore an
      empty field and the frame rendered flat navy. Starting it early means
      there is a picture there to tear.
    */
    expect(GLITCH).toBeLessThan(at("flag"));
    expect(GLITCH).toBeGreaterThan(at("flag") - 8);
  });

  it("keeps every named beat inside the scene that owns it", () => {
    expect(WHIP).toBeLessThan(at("illusion"));
    expect(FLAG_WORD).toBeGreaterThan(GLITCH);
    expect(FLAG_WORD).toBeLessThan(end("flag"));
    expect(TYPE_FROM).toBeGreaterThanOrEqual(at("cta"));
    expect(PRESS).toBeLessThan(end("cta"));
  });

  it("cuts fast enough to hold a thumb", () => {
    // Six scenes across twelve seconds is an average of two — but the hook
    // alone carries four impacts, so the felt cadence is well under a second.
    const average = DURATION / SCENES.length / FPS;
    expect(average).toBeLessThanOrEqual(2.1);
    for (const scene of SCENES) {
      expect(scene.duration / FPS).toBeLessThanOrEqual(2.6);
    }
  });
});

describe("the sound", () => {
  it("is sorted, so it can be walked with a cursor", () => {
    const frames = CUES.map((c) => c.frame);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
  });

  it("lands every cue inside the film", () => {
    for (const cue of CUES) {
      expect(cue.frame).toBeGreaterThanOrEqual(0);
      expect(cue.frame).toBeLessThan(DURATION);
    }
  });

  it("stays inside the mix", () => {
    for (const cue of CUES) expect(cue.gain ?? 0.7).toBeLessThanOrEqual(1);
  });

  it("hits every hook impact with a sub-bass", () => {
    for (const beat of HOOK_BEATS) {
      const here = CUES.filter((c) => c.frame === beat && c.sfx === "bass-hit");
      expect(here).toHaveLength(1);
    }
  });

  it("rises through the hook", () => {
    // Four identical hits read as a metronome. Each one is louder than the
    // last so the block builds rather than repeats.
    const hits = HOOK_BEATS.map(
      (b) => CUES.find((c) => c.frame === b && c.sfx === "bass-hit")?.gain ?? 0,
    );
    for (let i = 1; i < hits.length; i += 1) {
      expect(hits[i]).toBeGreaterThan(hits[i - 1]);
    }
  });

  it("makes the interrupt the loudest thing in the film", () => {
    const drop = CUES.find((c) => c.sfx === "drop");
    expect(drop).toBeDefined();
    const rest = CUES.filter((c) => c.sfx !== "drop" && c.sfx !== "glitch");
    expect(drop!.gain ?? 0).toBeGreaterThanOrEqual(Math.max(...rest.map((c) => c.gain ?? 0.7)));
  });

  it("puts a key on every typed character", () => {
    const keys = CUES.filter((c) => c.sfx === "key");
    expect(keys.length).toBeGreaterThanOrEqual(COPY.fr.typed.length - 1);
  });

  it("runs the bed under the whole picture", () => {
    expect(BED.from).toBe(0);
    expect(BED.to).toBe(DURATION);
  });
});

describe("the two languages", () => {
  it("say the same number of things, so the cut is identical", () => {
    expect(COPY.fr.hook).toHaveLength(COPY.en.hook.length);
    expect(COPY.fr.hook).toHaveLength(HOOK_BEATS.length);
    expect(COPY.fr.tags).toHaveLength(COPY.en.tags.length);
    expect(COPY.fr.tags).toHaveLength(TAG_BEATS.length);
    expect(COPY.fr.slogan).toHaveLength(COPY.en.slogan.length);
  });

  it("leave nothing empty", () => {
    for (const lang of LANGS) {
      const c = COPY[lang];
      const strings = [
        c.illusionLabel, c.handle, c.scanLabel, c.flagLabel, c.flagWord,
        c.scoreLabel, c.score, c.scoreOutOf, c.typed, c.button,
        c.brand, ...c.hook, ...c.tags, ...c.slogan,
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

  it("keeps display words short enough to be set large", () => {
    for (const lang of LANGS) {
      for (const word of [...COPY[lang].tags, COPY[lang].flagWord]) {
        expect(word.length).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("the palette", () => {
  /**
   * The bug this guards: every colour is an `hsl()` string, and appending hex
   * alpha to one — `` `${C.bright}44` `` — makes `hsl(208 95% 60%)44`, which
   * is not a colour. Browsers drop the declaration without a word, so nine
   * glows in this film rendered as nothing while the code claimed otherwise
   * and the frames came back flat.
   */
  it("puts the alpha inside the function, where CSS looks for it", () => {
    expect(a("hsl(208 95% 60%)", 0.4)).toBe("hsl(208 95% 60% / 0.4)");
    expect(a(C.bright, 0.27)).toMatch(/^hsl\([^)]* \/ 0\.27\)$/);
  });

  it("never produces a value with something after the closing paren", () => {
    for (const value of Object.values(C)) {
      expect(a(value, 0.5).endsWith(")")).toBe(true);
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
    // Anything that fits type to a column divides by these. Assuming "about
    // twenty per cent" for a preset that actually reaches 1.47 is how a word
    // ends up hanging over both edges for six frames.
    expect(peakOf("flat")).toBe(1);
    expect(peakOf("crash")).toBeGreaterThan(1);
    expect(peakOf("crash")).toBeLessThan(1.2);
    expect(peakOf("slam")).toBeGreaterThan(peakOf("crash"));
  });

  it("overshoots on everything except the one that must not", () => {
    expect(peakOf("flat")).toBe(1);
    for (const name of ["crash", "slam", "tight"] as const) {
      expect(peakOf(name)).toBeGreaterThan(1);
    }
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

  it("never exceeds the cap it is given", () => {
    expect(fitSize("A", 120)).toBeLessThanOrEqual(120);
    expect(fitSize("", 120)).toBe(120);
  });

  it("keeps every real string in the film inside the frame", () => {
    // The strings that actually have to fit, at the sizes they are set at.
    for (const lang of LANGS) {
      const c = COPY[lang];
      const cases: Array<[string, number, number]> = [
        ...c.hook.map((h): [string, number, number] => [h, 168, WIDTH - 96]),
        ...c.tags.map((t): [string, number, number] => [t, 124, WIDTH - 150]),
        [c.flagWord, 300, (WIDTH - 90) / 1.28],
        ...c.slogan.map((l): [string, number, number] => [l, 124, WIDTH - 104]),
      ];
      for (const [text, max, column] of cases) {
        const size = fitSize(text, max, column);
        expect(size).toBeGreaterThan(20);
        // The size it returns must actually fit the column it was given —
        // the inverse of what `fitSize` solves, so a sign error or a
        // forgotten overshoot division shows up here rather than on screen.
        expect(measure(text, size)).toBeLessThanOrEqual(column);
        // And, whatever the column said, nothing may leave the frame.
        expect(measure(text, size)).toBeLessThan(WIDTH);
      }
    }
  });
});
