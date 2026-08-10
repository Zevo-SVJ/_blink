/**
 * `/u/:id` is readable without a session, so what it declines to show is a
 * security boundary rather than a presentation choice.
 *
 * The database already enforces this — `score_history` and `analyses` are
 * self-read only, so an anonymous caller receives nothing from them — but the
 * mapping is the place where a future edit would most plausibly reintroduce a
 * leak, by "helpfully" filling a field from data that happens to be in scope
 * on the signed-in path. These tests pin the shape.
 */

import { describe, expect, it } from "vitest";

import { toView } from "@/pages/PublicProfile";
import { isAppRoute } from "@/components/app/AppChrome";
import type { LeaderboardEntry } from "@/lib/leaderboard";

const entry: LeaderboardEntry = {
  id: "3b72eadc-0fbe-4d30-8685-e07dcce7c1fd",
  handle: "qa.agent.kept",
  displayName: "QA Agent",
  avatarUrl: null,
  country: "FR",
  instagramUrl: "https://instagram.com/qa.agent.kept",
  score: 822,
  peakScore: 822,
  category: "minimalist",
  streak: 0,
  verifiedCount: 1,
  rank: 1,
  categoryRank: 1,
  movement: null,
};

describe("public profile view", () => {
  it("carries the fields the leaderboard view actually exposes", () => {
    const view = toView(entry);
    expect(view.handle).toBe("qa.agent.kept");
    expect(view.displayName).toBe("QA Agent");
    expect(view.score).toBe(822);
    expect(view.peakScore).toBe(822);
    expect(view.verifiedCount).toBe(1);
    expect(view.country).toBe("FR");
    expect(view.instagramUrl).toContain("instagram.com");
    // The standing is the row itself — every rank claim traces back to it.
    expect(view.standing).toBe(entry);
  });

  it("never carries anything sourced from a private table", () => {
    const view = toView(entry);
    // `analyses` — self-read only.
    expect(view.perception).toBeUndefined();
    // `score_history` — self-read only. Zero, not a guessed delta.
    expect(view.momentumDelta).toBe(0);
    expect(view.bestRank).toBeNull();
  });

  it("does not invent values when the row is sparse", () => {
    const sparse = toView({
      ...entry,
      handle: null,
      displayName: null,
      country: null,
      instagramUrl: null,
      peakScore: 0,
      streak: 0,
      verifiedCount: 0,
    });
    expect(sparse.handle).toBeNull();
    expect(sparse.displayName).toBeNull();
    // No Instagram button unless there is a real URL.
    expect(sparse.instagramUrl).toBeNull();
    expect(sparse.perception).toBeUndefined();
    expect(sparse.bestRank).toBeNull();
  });
});

describe("shared profile routing", () => {
  it("keeps /u/:id inside the app-chrome route set", () => {
    // The tab bar is additionally gated on a session, so this only decides
    // that a *signed-in* reader keeps their navigation on a shared profile.
    expect(isAppRoute("/u/3b72eadc-0fbe-4d30-8685-e07dcce7c1fd")).toBe(true);
    expect(isAppRoute("/")).toBe(false);
    expect(isAppRoute("/privacy")).toBe(false);
  });
});
