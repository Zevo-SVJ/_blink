import { describe, expect, it } from "vitest";

import {
  buildBadges,
  buildStatusBadges,
  earnedCount,
  type BadgeInput,
} from "@/lib/badges";
import { CATEGORIES, pickerCategories } from "@/lib/categories";

const EMPTY: BadgeInput = {
  bestRank: null,
  peakScore: 0,
  movement: null,
  momentumDelta: 0,
  streak: 0,
  verifiedCount: 0,
};

describe("buildBadges", () => {
  it("locks every badge for a profile with no record", () => {
    const badges = buildBadges(EMPTY, true);
    expect(badges).toHaveLength(6);
    expect(badges.every((b) => b.grade === "locked")).toBe(true);
    expect(earnedCount(badges)).toBe(0);
  });

  it("marks routine achievements earned and demanding ones elite", () => {
    const badges = buildBadges(
      { ...EMPTY, bestRank: 40, peakScore: 612, streak: 1, verifiedCount: 3 },
      true,
    );
    const byId = Object.fromEntries(badges.map((b) => [b.id, b]));
    expect(byId.best.grade).toBe("earned");
    expect(byId.peak.grade).toBe("earned");
    expect(byId.streak.grade).toBe("earned");
    // Untouched inputs stay locked rather than being dragged up with the rest.
    expect(byId.momentum.grade).toBe("locked");

    const elite = buildBadges(
      {
        bestRank: 3,
        peakScore: 900,
        movement: 9,
        momentumDelta: 60,
        streak: 8,
        verifiedCount: 20,
      },
      true,
    );
    expect(elite.every((b) => b.grade === "elite")).toBe(true);
  });

  it("does not treat a losing streak of momentum as an achievement", () => {
    const badges = buildBadges(
      { ...EMPTY, momentumDelta: -30, movement: -4 },
      true,
    );
    const byId = Object.fromEntries(badges.map((b) => [b.id, b]));
    // Movement happened, so it is earned — but a drop is never elite.
    expect(byId.momentum.grade).toBe("earned");
    expect(byId.movement.grade).toBe("earned");
    expect(byId.momentum.value).toBe("-30");
    expect(byId.movement.value).toBe("-4");
  });

  it("gives every badge a distinct id and never blanks a value", () => {
    const badges = buildBadges(EMPTY, false);
    expect(new Set(badges.map((b) => b.id)).size).toBe(badges.length);
    expect(badges.every((b) => b.value.length > 0)).toBe(true);
  });

  it("addresses the reader correctly for someone else's profile", () => {
    expect(buildBadges(EMPTY, true)[0].detail).toContain("your profile");
    expect(buildBadges(EMPTY, false)[0].detail).toContain("their profile");
  });
});

describe("pickerCategories", () => {
  it("always offers every canonical category, populated or not", () => {
    const shown = pickerCategories([]);
    expect(shown.map((c) => c.id)).toEqual(CATEGORIES.map((c) => c.id));
  });

  it("leads with Larp", () => {
    expect(pickerCategories([])[0].id).toBe("larp");
  });

  it("appends values the model produced that aren't canonical", () => {
    const shown = pickerCategories(["minimalist", "creator"]);
    expect(shown).toHaveLength(CATEGORIES.length + 1);
    expect(shown[shown.length - 1]).toMatchObject({
      id: "minimalist",
      label: "Minimalist",
    });
  });

  it("does not duplicate an unknown value that appears twice", () => {
    expect(pickerCategories(["minimalist", "Minimalist"])).toHaveLength(
      CATEGORIES.length + 1,
    );
  });
});

describe("buildStatusBadges", () => {
  const NONE = { rank: null, categoryRank: null, categoryLabel: null, movement: null };

  it("shows nothing for a profile holding no status", () => {
    // An empty shelf is honest; a shelf of locked trophies is discouraging.
    expect(buildStatusBadges(NONE)).toEqual([]);
    expect(buildStatusBadges({ ...NONE, rank: 40, categoryRank: 12 })).toEqual([]);
  });

  it("awards the category champion its own named emblem", () => {
    const badges = buildStatusBadges({
      ...NONE,
      rank: 7,
      categoryRank: 1,
      categoryLabel: "Larp",
    });
    const champion = badges.find((b) => b.id === "champion")!;
    expect(champion.label).toBe("Larp Icon");
    expect(champion.grade).toBe("elite");
  });

  it("gives Elite or Top 10, never both", () => {
    const top3 = buildStatusBadges({ ...NONE, rank: 2 }).map((b) => b.id);
    expect(top3).toContain("elite");
    expect(top3).not.toContain("topten");

    const top10 = buildStatusBadges({ ...NONE, rank: 8 }).map((b) => b.id);
    expect(top10).toContain("topten");
    expect(top10).not.toContain("elite");
  });

  it("only calls a profile rising when it actually moved up", () => {
    expect(buildStatusBadges({ ...NONE, movement: 2 }).map((b) => b.id)).not.toContain("rising");
    expect(buildStatusBadges({ ...NONE, movement: -6 }).map((b) => b.id)).not.toContain("rising");
    expect(buildStatusBadges({ ...NONE, movement: 4 }).map((b) => b.id)).toContain("rising");
  });

  it("keeps every emblem distinct so the shelf never repeats a silhouette", () => {
    const badges = buildStatusBadges({
      rank: 1,
      categoryRank: 1,
      categoryLabel: "Larp",
      movement: 9,
    });
    expect(badges.length).toBeGreaterThanOrEqual(3);
    expect(new Set(badges.map((b) => b.icon)).size).toBe(badges.length);
  });
});
