import { describe, expect, it } from "vitest";

import { isDegenerateAnalysis, validateAnalysisResult } from "@/lib/analysis";
import { validateIdentity, type IdentityDraft } from "@/lib/identity";
import { CATEGORIES, availableCategories, categoryLabel } from "@/lib/categories";
import { isMissingColumn, resolveOnboardedAt } from "@/lib/blink-profile";
import { getClimbPaths } from "@/lib/climb";
import { computeProfileStats, type ScoreEntry } from "@/lib/ranking";

describe("isDegenerateAnalysis", () => {
  const real = validateAnalysisResult({
    overallScore: 7,
    firstImpression: "Deliberate and low-key",
    traits: ["Considered"],
    why: "The grid holds one palette.",
    signals: Array(6).fill({ score: 7, description: "x" }),
  });

  it("accepts a genuine analysis", () => {
    expect(isDegenerateAnalysis(real)).toBe(false);
  });

  it("rejects the all-zero result a random image produces", () => {
    const zeroed = validateAnalysisResult({
      overallScore: 0,
      firstImpression: "",
      traits: [],
      why: "",
      signals: Array(6).fill({ score: 0, description: "" }),
    });
    expect(isDegenerateAnalysis(zeroed)).toBe(true);
  });

  it("rejects a scored but completely mute result", () => {
    const mute = validateAnalysisResult({
      overallScore: 5,
      firstImpression: "",
      traits: [],
      why: "",
      signals: Array(6).fill({ score: 5, description: "" }),
    });
    expect(isDegenerateAnalysis(mute)).toBe(true);
  });

  it("accepts a weak but real profile", () => {
    // A genuinely poor profile still scores something and still gets prose;
    // it must not be mistaken for a non-profile image.
    const weak = validateAnalysisResult({
      overallScore: 2,
      firstImpression: "Unclear",
      traits: ["Sparse"],
      why: "There isn't much to read here yet.",
      signals: Array(6).fill({ score: 1, description: "Little to go on." }),
    });
    expect(isDegenerateAnalysis(weak)).toBe(false);
  });
});

describe("validateIdentity", () => {
  const base: IdentityDraft = {
    displayName: "Sam Rivera",
    handle: "sam.dev",
    instagramUrl: "",
    country: "GB",
    avatarUrl: null,
    isPublic: true,
  };

  it("accepts a complete draft and derives the Instagram link from the handle", () => {
    const res = validateIdentity(base);
    expect(res.ok).toBe(true);
    expect(res.clean.instagramUrl).toBe("https://instagram.com/sam.dev");
  });

  it("requires a display name and a handle", () => {
    expect(validateIdentity({ ...base, displayName: "  " }).ok).toBe(false);
    expect(validateIdentity({ ...base, handle: "" }).ok).toBe(false);
  });

  it("strips a leading @ from the handle", () => {
    expect(validateIdentity({ ...base, handle: "@sam.dev" }).clean.handle).toBe("sam.dev");
  });

  it("rejects malformed handles", () => {
    expect(validateIdentity({ ...base, handle: "not a handle!" }).ok).toBe(false);
  });

  it("rejects a link that isn't an Instagram profile", () => {
    expect(validateIdentity({ ...base, instagramUrl: "https://example.com/x" }).ok).toBe(false);
    expect(validateIdentity({ ...base, instagramUrl: "https://instagram.com/sam" }).ok).toBe(true);
  });

  it("keeps an explicit link over the derived one", () => {
    const res = validateIdentity({
      ...base,
      instagramUrl: "https://www.instagram.com/other.name/",
    });
    expect(res.clean.instagramUrl).toBe("https://www.instagram.com/other.name");
  });
});

describe("categories", () => {
  it("is a short list led by Larp", () => {
    expect(CATEGORIES.length).toBeLessThanOrEqual(8);
    expect(CATEGORIES[0].id).toBe("larp");
  });

  it("only offers categories that actually have ranked profiles", () => {
    const available = availableCategories(["creator", "larp"]);
    expect(available.map((c) => c.id)).toEqual(["larp", "creator"]);
  });

  it("offers nothing when no profile is classified", () => {
    expect(availableCategories([])).toEqual([]);
  });

  it("keeps unrecognised values rather than dropping them", () => {
    const available = availableCategories(["mystery"]);
    expect(available.map((c) => c.id)).toContain("mystery");
    expect(categoryLabel("mystery")).toBe("Mystery");
  });
});

describe("climb paths", () => {
  const entry = (over: Partial<ScoreEntry> = {}): ScoreEntry => ({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    score: 700,
    category: "creator",
    imageHash: "h",
    verified: true,
    ...over,
  });

  it("always offers routes that don't require changing the profile", () => {
    const stats = computeProfileStats([entry(), entry({ score: 650 })]);
    const paths = getClimbPaths(stats);
    expect(paths.some((p) => !p.redesign)).toBe(true);
    // At least four of the routes must be non-redesign, so someone happy with
    // their profile is never cornered into changing it.
    expect(paths.filter((p) => !p.redesign).length).toBeGreaterThanOrEqual(4);
  });

  it("never marks a redesign path as the place to start", () => {
    const stats = computeProfileStats([entry()]);
    for (const path of getClimbPaths(stats)) {
      if (path.priority) expect(path.redesign).toBe(false);
    }
  });

  it("never suggests changing the profile picture", () => {
    const stats = computeProfileStats([entry()]);
    const text = getClimbPaths(stats)
      .map((p) => `${p.title} ${p.action} ${p.why}`)
      .join(" ")
      .toLowerCase();
    expect(text).not.toContain("profile picture");
    expect(text).not.toContain("pdp");
    expect(text).not.toContain("avatar");
  });

  it("prioritises re-verifying for someone who has never done it", () => {
    const stats = computeProfileStats([entry()]);
    expect(getClimbPaths(stats)[0].id).toBe("verify");
  });

  it("prioritises recovering momentum when the score is falling", () => {
    const stats = computeProfileStats([entry({ score: 600 }), entry({ score: 700 })]);
    const priorities = getClimbPaths(stats)
      .filter((p) => p.priority)
      .map((p) => p.id);
    expect(priorities).toContain("momentum");
  });
});

describe("schema tolerance", () => {
  // Regression: the client shipped ahead of migration 0004, so PostgREST
  // rejected instagram_url/onboarded_at and every profile read and write
  // surfaced as "Blink can't reach your account right now."
  it("recognises a missing column from either read or write error shapes", () => {
    expect(isMissingColumn({ code: "42703" })).toBe(true);
    expect(isMissingColumn({ code: "PGRST204" })).toBe(true);
    expect(
      isMissingColumn({
        message: "Could not find the 'onboarded_at' column of 'blink_profiles' in the schema cache",
      }),
    ).toBe(true);
  });

  it("does not mistake a real failure for a schema gap", () => {
    expect(isMissingColumn({ code: "42P01" })).toBe(false);
    expect(isMissingColumn({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingColumn(null)).toBe(false);
  });

  // Regression: without onboarded_at the gate never closed, so a user who had
  // already completed onboarding was asked again on every visit.
  it("treats a filled-in profile as onboarded when the column is absent", () => {
    expect(
      resolveOnboardedAt({
        handle: "sam.dev",
        display_name: "Sam",
        created_at: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("2026-01-01T00:00:00.000Z");
  });

  it("still shows onboarding to someone who has not completed it", () => {
    expect(resolveOnboardedAt({ handle: null, display_name: null })).toBeNull();
    expect(resolveOnboardedAt({ handle: "sam.dev", display_name: null })).toBeNull();
  });

  it("prefers the real timestamp when the column exists", () => {
    expect(
      resolveOnboardedAt({
        onboarded_at: "2026-08-01T10:00:00.000Z",
        handle: "sam.dev",
        display_name: "Sam",
        created_at: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("2026-08-01T10:00:00.000Z");
  });
});
