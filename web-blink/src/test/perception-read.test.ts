/**
 * The reveal's grounding rules.
 *
 * Every beat has to trace back to something the analysis actually returned.
 * These tests exist because the failure mode here is silent: a beat that
 * invents a plausible sentence looks fine on screen and is a lie about the
 * user's profile.
 */

import { describe, expect, it } from "vitest";

import type { Perspective, SignalScore } from "@/lib/analysis";
import { PERSPECTIVE_SIGNALS, buildRead, readHeadline, relevantSignals } from "@/lib/perception-read";

const signals: SignalScore[] = [
  { label: "Visual Identity", score: 8.6, description: "A consistent look holds the grid together." },
  { label: "Aesthetic", score: 8.1, description: "Warm, muted, and applied evenly." },
  { label: "Confidence", score: 7.2, description: "Comfortable without asking for approval." },
  { label: "Status", score: 4.1, description: "Little external signalling of standing." },
  { label: "Approachability", score: 6.0, description: "Open, though not inviting." },
  { label: "Mystery", score: 8.4, description: "Withholds enough to invite a second look." },
];

const crush: Perspective = {
  id: "crush",
  emoji: "❤️",
  title: "How your crush sees you",
  traits: ["Understated", "Magnetic"],
  summary: "Reads as someone not performing for attention.",
  why: "Restraint is doing the work effort usually does.",
  recommendation: "Keep the grid this tight.",
};

describe("relevantSignals", () => {
  it("only considers the signals a perspective actually weighs", () => {
    const forCrush = relevantSignals("crush", signals).map((s) => s.label);
    expect(forCrush).not.toContain("Status");
    for (const label of forCrush) {
      expect(PERSPECTIVE_SIGNALS.crush).toContain(label);
    }
  });

  it("orders loudest first", () => {
    const scores = relevantSignals("crush", signals).map((s) => s.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("reads the same profile differently for different audiences", () => {
    // The whole premise of the feature: a crush's loudest signal is Mystery,
    // a recruiter's is Visual Identity, because they weigh different things.
    expect(relevantSignals("crush", signals)[0].label).toBe("Mystery");
    expect(relevantSignals("recruiter", signals)[0].label).toBe("Visual Identity");
  });

  it("survives missing or unlabelled signals", () => {
    expect(relevantSignals("crush", [])).toEqual([]);
    expect(relevantSignals("crush", undefined)).toEqual([]);
  });
});

describe("buildRead", () => {
  it("produces the full sequence when the analysis is complete", () => {
    const beats = buildRead("crush", crush, signals);
    expect(beats.map((b) => b.id)).toEqual([
      "impression",
      "assume",
      "signal",
      "blindspot",
      "verdict",
    ]);
  });

  it("uses the analysis text verbatim, never generated copy", () => {
    const beats = buildRead("crush", crush, signals);
    expect(beats[0].body).toBe(crush.summary);
    expect(beats[1].body).toBe(crush.why);
    // The signal beat quotes that signal's own description.
    expect(beats[2].body).toBe(signals.find((s) => s.label === "Mystery")!.description);
    expect(beats[2].signal).toEqual({ label: "Mystery", score: 8.4 });
  });

  it("drops beats whose source is missing rather than inventing them", () => {
    const beats = buildRead("crush", { ...crush, summary: "", why: "   " }, signals);
    expect(beats.map((b) => b.id)).not.toContain("impression");
    expect(beats.map((b) => b.id)).not.toContain("assume");
    expect(beats.length).toBeGreaterThan(0);
  });

  it("has no beats at all when the analysis returned nothing usable", () => {
    const empty: Perspective = { ...crush, traits: [], summary: "", why: "" };
    expect(buildRead("crush", empty, [])).toEqual([]);
  });

  it("never shows the same signal as both loudest and quietest", () => {
    const flat: SignalScore[] = [
      { label: "Mystery", score: 7, description: "a" },
      { label: "Confidence", score: 7, description: "b" },
      { label: "Approachability", score: 7, description: "c" },
      { label: "Aesthetic", score: 7, description: "d" },
    ];
    const beats = buildRead("crush", crush, flat);
    // Every signal ties, so there is no honest blind spot to name.
    expect(beats.map((b) => b.id)).not.toContain("blindspot");
  });

  it("switches to neutral labels for a third-party read", () => {
    const own = buildRead("crush", crush, signals);
    const other = buildRead("crush", crush, signals, false);
    // Same beats, different voice — a third party is never addressed as "you".
    expect(other.map((b) => b.id)).toEqual(own.map((b) => b.id));
    for (const beat of other) expect(beat.kicker).not.toMatch(/\byou\b/i);
    expect(own.some((b) => /\byou\b/i.test(b.kicker))).toBe(true);
  });
});

describe("readHeadline", () => {
  it("returns the loudest weighed signal for the share card", () => {
    expect(readHeadline("crush", crush, signals)).toEqual({ label: "Mystery", score: 8.4 });
  });

  it("returns null rather than a placeholder when there are no signals", () => {
    expect(readHeadline("crush", crush, [])).toBeNull();
  });
});
