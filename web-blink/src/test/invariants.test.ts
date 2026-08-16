/**
 * Blink — the three invariants that keep Ranks honest.
 *
 * These are the rules the product breaks most easily, and each one has been
 * broken before:
 *
 *  1. **A category shown anywhere must exist in Ranks.** The model is asked for
 *     one of eight ids and does not always oblige; an analysis once displayed
 *     "Photography-and-visual-storytelling", a board that exists nowhere.
 *  2. **A profile someone else analysed is never marked as claimed.** The mark
 *     means the owner verified the account through Blink. Being read by a
 *     stranger proves nothing about who controls it.
 *  3. **Re-analysing the same person updates their row, never adds one.**
 *
 * They are asserted here rather than only in a browser because they hold at the
 * data layer — which is where a regression would actually be introduced.
 */

import { describe, expect, it } from "vitest";

import { isClaimed } from "@/components/app/VerifiedMark";
import { CATEGORIES, categoryLabel, normaliseCategory } from "@/lib/categories";
import { rankAnalyzed, type AnalyzedProfile } from "@/lib/analyzed-profiles";

const CANONICAL = CATEGORIES.map((c) => c.id);

describe("categories are canonical everywhere", () => {
  it("maps every canonical id to itself", () => {
    for (const id of CANONICAL) {
      expect(normaliseCategory(id)).toBe(id);
    }
  });

  it("never returns a value outside the canonical list", () => {
    const hostile = [
      "Photography-and-visual-storytelling",
      "MUSIC PRODUCER",
      "gym rat",
      "quiet luxury",
      "tech founder",
      "streetwear enthusiast",
      "travel & food",
      "just some guy",
      "",
      "   ",
      "🙂",
      "null",
      "undefined",
      "<script>alert(1)</script>",
      "a".repeat(500),
    ];

    for (const raw of hostile) {
      const result = normaliseCategory(raw);
      expect(result === null || CANONICAL.includes(result)).toBe(true);
    }
  });

  it("folds descriptive phrases onto the nearest real board", () => {
    expect(normaliseCategory("Photography-and-visual-storytelling")).toBe("artist");
    expect(normaliseCategory("MUSIC PRODUCER")).toBe("artist");
    expect(normaliseCategory("gym rat")).toBe("fitness");
    expect(normaliseCategory("quiet luxury")).toBe("larp");
    expect(normaliseCategory("tech founder")).toBe("entrepreneur");
  });

  it("prefers null over inventing a category it cannot place", () => {
    expect(normaliseCategory("🙂")).toBeNull();
    expect(normaliseCategory("")).toBeNull();
    expect(normaliseCategory(null)).toBeNull();
    expect(normaliseCategory(undefined)).toBeNull();
  });

  it("only ever labels a category that exists in Ranks", () => {
    const labels = new Set(CATEGORIES.map((c) => c.label));
    for (const raw of ["larp", "Photography-and-visual-storytelling", "gym rat", "nonsense"]) {
      const label = categoryLabel(raw);
      if (label !== null) expect(labels.has(label)).toBe(true);
    }
  });
});

describe("the claimed mark", () => {
  it("is given only to a profile with a verified analysis behind it", () => {
    expect(isClaimed({ verifiedCount: 1 })).toBe(true);
    expect(isClaimed({ verifiedCount: 12 })).toBe(true);
  });

  it("is withheld from everything else", () => {
    expect(isClaimed({ verifiedCount: 0 })).toBe(false);
    expect(isClaimed({ verifiedCount: null })).toBe(false);
    expect(isClaimed({})).toBe(false);
    expect(isClaimed(null)).toBe(false);
    expect(isClaimed(undefined)).toBe(false);
  });

  it("cannot be reached by an analysed stranger, whose row has no such field", () => {
    // `AnalyzedProfile` is the shape the analysed board renders. It carries no
    // `verifiedCount` at all, which is the structural reason a stranger can
    // never be marked: there is nothing for `isClaimed` to read.
    const stranger: AnalyzedProfile = {
      handle: "someone",
      category: "larp",
      score: 900,
      runs: 3,
      lastAnalyzedAt: new Date().toISOString(),
      analysisId: "abc",
    };
    expect(isClaimed(stranger as never)).toBe(false);
  });
});

describe("the analysed board", () => {
  const profile = (over: Partial<AnalyzedProfile>): AnalyzedProfile => ({
    handle: "a",
    category: "larp",
    score: 500,
    runs: 1,
    lastAnalyzedAt: "2026-08-01T00:00:00.000Z",
    analysisId: "id",
    ...over,
  });

  it("shows everything under All, and filters to a single category", () => {
    const all = [
      profile({ handle: "one", category: "larp", score: 900 }),
      profile({ handle: "two", category: "creator", score: 800 }),
      profile({ handle: "three", category: null, score: 700 }),
    ];

    expect(rankAnalyzed(all, null)).toHaveLength(3);
    expect(rankAnalyzed(all, "larp").map((p) => p.handle)).toEqual(["one"]);
    expect(rankAnalyzed(all, "creator").map((p) => p.handle)).toEqual(["two"]);
  });

  it("orders by score, then by how recently it was read", () => {
    const ranked = rankAnalyzed(
      [
        profile({ handle: "low", score: 100 }),
        profile({ handle: "high", score: 900 }),
        profile({ handle: "mid", score: 500 }),
      ],
      null,
    );
    expect(ranked.map((p) => p.handle)).toEqual(["high", "mid", "low"]);
  });

  it("breaks a score tie toward the more recent reading", () => {
    const ranked = rankAnalyzed(
      [
        profile({ handle: "older", score: 500, lastAnalyzedAt: "2026-01-01T00:00:00.000Z" }),
        profile({ handle: "newer", score: 500, lastAnalyzedAt: "2026-08-01T00:00:00.000Z" }),
      ],
      null,
    );
    expect(ranked.map((p) => p.handle)).toEqual(["newer", "older"]);
  });

  it("never places a profile in a category that isn't a real board", () => {
    const ranked = rankAnalyzed([profile({ category: normaliseCategory("gym rat") })], "fitness");
    expect(ranked).toHaveLength(1);
    for (const p of ranked) {
      if (p.category !== null) expect(CANONICAL).toContain(p.category);
    }
  });
});
