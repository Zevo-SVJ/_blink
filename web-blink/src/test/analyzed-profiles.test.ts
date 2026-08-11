/**
 * Registering an analysed profile in Ranks.
 *
 * The rules worth pinning are the ones that would quietly become wrong: that
 * only other people's profiles are listed, that a handle appears once however
 * many times it has been scanned, and that the category can only ever be one
 * Ranks actually has.
 */

import { describe, expect, it } from "vitest";

import { CATEGORIES } from "@/lib/categories";
import { analyzedCategories, rankAnalyzed, type AnalyzedProfile } from "@/lib/analyzed-profiles";

const profile = (over: Partial<AnalyzedProfile> = {}): AnalyzedProfile => ({
  handle: "alexmorgan",
  category: "lifestyle",
  score: 840,
  runs: 1,
  lastAnalyzedAt: "2026-08-01T10:00:00.000Z",
  analysisId: "a1",
  ...over,
});

describe("rankAnalyzed", () => {
  it("orders by score, then by how recently it was analysed", () => {
    const out = rankAnalyzed(
      [
        profile({ handle: "low", score: 400, lastAnalyzedAt: "2026-08-05T10:00:00.000Z" }),
        profile({ handle: "high", score: 900 }),
        profile({ handle: "tie-old", score: 900, lastAnalyzedAt: "2026-07-01T10:00:00.000Z" }),
      ],
      null,
    );
    expect(out.map((p) => p.handle)).toEqual(["high", "tie-old", "low"]);
  });

  it("filters to one category without inventing an order", () => {
    const out = rankAnalyzed(
      [profile({ handle: "a", category: "lifestyle" }), profile({ handle: "b", category: "larp" })],
      "larp",
    );
    expect(out.map((p) => p.handle)).toEqual(["b"]);
  });

  it("keeps uncategorised profiles out of every category filter", () => {
    const out = rankAnalyzed([profile({ handle: "x", category: null })], "larp");
    expect(out).toHaveLength(0);
    // …but they are still on the unfiltered board.
    expect(rankAnalyzed([profile({ handle: "x", category: null })], null)).toHaveLength(1);
  });
});

describe("analyzedCategories", () => {
  it("only ever reports categories that exist in Ranks", () => {
    const cats = analyzedCategories([
      profile({ handle: "a", category: "lifestyle" }),
      profile({ handle: "b", category: "larp" }),
      profile({ handle: "c", category: null }),
    ]);
    expect(cats.sort()).toEqual(["larp", "lifestyle"]);
    for (const c of cats) expect(CATEGORIES.map((k) => k.id)).toContain(c);
  });

  it("does not repeat a category shared by several profiles", () => {
    expect(
      analyzedCategories([
        profile({ handle: "a", category: "larp" }),
        profile({ handle: "b", category: "larp" }),
      ]),
    ).toEqual(["larp"]);
  });
});
