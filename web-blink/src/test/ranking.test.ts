import { describe, expect, it } from "vitest";

import { validateAnalysisResult, type AnalysisResult } from "@/lib/analysis";
import {
  computeBlinkScore,
  computeMomentum,
  computeStreak,
  countImprovements,
  getTier,
  pointsToNextTier,
  verifyProgression,
  type ScoreEntry,
} from "@/lib/ranking";

function analysis(over: Record<string, unknown> = {}): AnalysisResult {
  return validateAnalysisResult({
    ownership: "own",
    ownershipEvidence: { editProfile: true, shareProfile: true },
    overallScore: 7,
    signals: [
      { score: 7, description: "" },
      { score: 7, description: "" },
      { score: 7, description: "" },
      { score: 7, description: "" },
      { score: 7, description: "" },
      { score: 7, description: "" },
    ],
    category: { category: "creator", categoryConfidence: 0.7 },
    ...over,
  });
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function entry(over: Partial<ScoreEntry> = {}): ScoreEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    score: 600,
    category: "creator",
    imageHash: "hash-a",
    verified: true,
    ...over,
  };
}

describe("computeBlinkScore", () => {
  it("stays within 0-1000", () => {
    const low = computeBlinkScore(
      analysis({
        overallScore: 0,
        signals: Array(6).fill({ score: 0, description: "" }),
        category: { category: null, categoryConfidence: 0 },
      }),
    );
    const high = computeBlinkScore(
      analysis({
        overallScore: 10,
        signals: Array(6).fill({ score: 10, description: "" }),
        category: { category: "creator", categoryConfidence: 1 },
      }),
    );
    expect(low.total).toBe(0);
    expect(high.total).toBe(1000);
  });

  it("penalises a profile whose signals contradict each other", () => {
    const coherent = computeBlinkScore(
      analysis({ signals: Array(6).fill({ score: 7, description: "" }) }),
    );
    const scattered = computeBlinkScore(
      analysis({
        signals: [10, 2, 10, 2, 10, 2].map((score) => ({ score, description: "" })),
      }),
    );
    // Same mean signal value, but the scattered profile sends mixed messages.
    expect(coherent.coherence).toBeGreaterThan(scattered.coherence);
    expect(coherent.total).toBeGreaterThan(scattered.total);
  });

  it("ignores fame — score depends only on perception signals", () => {
    // A "famous" profile is not a concept the scorer can even see. Two results
    // with identical signals must score identically regardless of anything else.
    const a = computeBlinkScore(analysis({ traits: ["verified", "celebrity"] }));
    const b = computeBlinkScore(analysis({ traits: [] }));
    expect(a.total).toBe(b.total);
  });

  it("lets a small, well-crafted profile outscore a sloppy famous one", () => {
    const smallButSharp = computeBlinkScore(
      analysis({
        overallScore: 9,
        signals: Array(6).fill({ score: 9, description: "" }),
        category: { category: "minimalist", categoryConfidence: 0.9 },
      }),
    );
    const famousButMuddled = computeBlinkScore(
      analysis({
        overallScore: 5,
        signals: [9, 2, 8, 3, 9, 2].map((score) => ({ score, description: "" })),
        category: { category: null, categoryConfidence: 0.1 },
      }),
    );
    expect(smallButSharp.total).toBeGreaterThan(famousButMuddled.total);
  });
});

describe("tiers", () => {
  it("maps scores onto the right tier", () => {
    expect(getTier(0).id).toBe("unread");
    expect(getTier(399).id).toBe("unread");
    expect(getTier(400).id).toBe("emerging");
    expect(getTier(680).id).toBe("sharp");
    expect(getTier(1000).id).toBe("iconic");
  });

  it("reports the gap to the next tier, and nothing at the top", () => {
    expect(pointsToNextTier(390)?.points).toBe(10);
    expect(pointsToNextTier(950)).toBeNull();
  });
});

describe("verifyProgression", () => {
  it("counts a fresh screenshot of your own profile", () => {
    expect(verifyProgression(analysis(), "new-hash", [entry()]).counts).toBe(true);
  });

  it("refuses to count someone else's profile", () => {
    const other = analysis({
      ownership: "other",
      ownershipEvidence: { follow: true, message: true },
    });
    const check = verifyProgression(other, "new-hash", []);
    expect(check.counts).toBe(false);
    expect(check.reason).toBe("NOT_OWN_PROFILE");
  });

  it("refuses to count a re-upload of the same screenshot", () => {
    const check = verifyProgression(analysis(), "hash-a", [entry({ imageHash: "hash-a" })]);
    expect(check.counts).toBe(false);
    expect(check.reason).toBe("DUPLICATE_SCREENSHOT");
  });

  it("counts the first ever analysis", () => {
    expect(verifyProgression(analysis(), "hash-a", []).counts).toBe(true);
  });
});

describe("momentum", () => {
  it("is flat until there are two verified analyses", () => {
    expect(computeMomentum([]).direction).toBe("flat");
    expect(computeMomentum([entry()]).direction).toBe("flat");
  });

  it("reports gains and losses against the previous verified analysis", () => {
    const up = computeMomentum([entry({ score: 700 }), entry({ score: 640 })]);
    expect(up.direction).toBe("up");
    expect(up.delta).toBe(60);

    const down = computeMomentum([entry({ score: 600 }), entry({ score: 640 })]);
    expect(down.direction).toBe("down");
    expect(down.delta).toBe(-40);
  });

  it("ignores unverified entries", () => {
    const m = computeMomentum([
      entry({ score: 700 }),
      entry({ score: 999, verified: false }),
      entry({ score: 640 }),
    ]);
    expect(m.delta).toBe(60);
  });
});

describe("streak", () => {
  const now = new Date("2026-08-08T12:00:00Z");
  const weeksAgo = (n: number) =>
    new Date(Math.floor(now.getTime() / WEEK_MS - n) * WEEK_MS + 1000).toISOString();

  it("is zero with no verified history", () => {
    expect(computeStreak([], now)).toBe(0);
  });

  it("counts consecutive weeks containing a verified analysis", () => {
    const history = [0, 1, 2].map((n) => entry({ createdAt: weeksAgo(n) }));
    expect(computeStreak(history, now)).toBe(3);
  });

  it("breaks when a week has no new screenshot", () => {
    const history = [0, 1, 3].map((n) => entry({ createdAt: weeksAgo(n) }));
    expect(computeStreak(history, now)).toBe(2);
  });

  it("does not count unverified activity", () => {
    const history = [
      entry({ createdAt: weeksAgo(0), verified: false }),
      entry({ createdAt: weeksAgo(1), verified: false }),
    ];
    expect(computeStreak(history, now)).toBe(0);
  });
});

describe("countImprovements", () => {
  it("counts only analyses that beat the one before", () => {
    // Stored newest-first.
    const history = [entry({ score: 700 }), entry({ score: 650 }), entry({ score: 680 })];
    expect(countImprovements(history)).toBe(1);
  });

  it("is zero for a single analysis", () => {
    expect(countImprovements([entry()])).toBe(0);
  });
});
